import { execFile as nodeExecFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  constants as fsConstants,
  createReadStream,
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  open,
  readFile,
  readdir,
  readlink,
  realpath,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import extractZip from "@electron-internal/extract-zip";
import {
  DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES,
  buildDesktopPrivateDataCorpus,
  scanDesktopPrivateDataBoundary,
} from "./matter-desktop-private-data-boundary.mjs";
import {
  compareCodePointText,
  desktopPrivateDataCorpusNeedles,
  desktopPrivateDataCorpusPhotoHashes,
} from "./matter-desktop-private-data-corpus.mjs";
import {
  serializeDesktopBuildManifest,
  validateDesktopBuildManifest,
} from "./matter-desktop-provenance.mjs";
import {
  WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
} from "./matter-desktop-windows-release-gate.mjs";
import { readValidatedWindowsNativeQaPassReceipt } from "../validate-matter-desktop-windows-native-qa-receipt.mjs";

export const RF13_DIST_MEMBER_MANIFEST_SCHEMA = "law-firm-os.matter-desktop-member-manifest.v1";
export const DESKTOP_ARTIFACT_MEMBER_MANIFEST_SCHEMA = RF13_DIST_MEMBER_MANIFEST_SCHEMA;
export const RF13_DIST_PRIVACY_MEMBER_SCHEMA = "law-firm-os.rf13-dist.privacy-member-receipt.v1";
export const RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA = "law-firm-os.rf13-dist.windows-installer-privacy-builder-receipt.v1";
export const RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA = "law-firm-os.rf13-dist.windows-installer-native-privacy-receipt.v1";

export const DESKTOP_ARTIFACT_ARCHIVE_KINDS = Object.freeze([
  "dmg_image",
  "unsigned_package_zip",
  "zip_archive",
]);
export const DESKTOP_ARTIFACT_EXPANDED_DIRECTORY_KIND = "expanded_directory";

const execFileAsync = promisify(nodeExecFile);
const SHA256 = /^[0-9a-f]{64}$/u;
const SHA1 = /^[0-9a-f]{40}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/u;
const EMPTY_SHA256 = createHash("sha256").digest("hex");
const ARCHIVE_KINDS = new Set(DESKTOP_ARTIFACT_ARCHIVE_KINDS);
const TRUSTED_INSPECTIONS = new WeakSet();
const LIVE_VALIDATIONS = new WeakSet();
const SENSITIVE_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/u,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/iu,
];

export class DesktopArtifactPrivacyError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "DesktopArtifactPrivacyError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new DesktopArtifactPrivacyError(code, message, details);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJsonSha256(value) {
  return sha256(Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8"));
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("SCHEMA_KEYS_MISMATCH", `${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("SCHEMA_KEYS_MISMATCH", `${label} keys do not match the closed schema`);
  }
}

function assertSha1(value, label) {
  if (!SHA1.test(value ?? "") || /^0+$/u.test(value)) {
    fail("INVALID_SOURCE_SHA", `${label} must be a full non-zero Git SHA`);
  }
}

function assertSha256(value, label) {
  if (!SHA256.test(value ?? "") || /^0+$/u.test(value)) {
    fail("INVALID_SHA256", `${label} must be a full non-zero SHA-256`);
  }
}

function assertSafeId(value, label) {
  if (!SAFE_ID.test(value ?? "")) fail("INVALID_ID", `${label} must be a safe opaque identifier`);
}

function assertNoSensitiveValues(value) {
  if (typeof value === "string") {
    if (SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
      fail("SENSITIVE_MATERIAL_REJECTED", "identity or secret material is not allowed in privacy evidence");
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertNoSensitiveValues(item);
  } else if (value && typeof value === "object") {
    for (const item of Object.values(value)) assertNoSensitiveValues(item);
  }
}

function safeRepoFile(repoRoot, relativePath) {
  if (!path.isAbsolute(repoRoot ?? "")
    || typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || path.posix.isAbsolute(relativePath)
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath.split("/").includes("..")) {
    fail("UNSAFE_EVIDENCE_PATH", "evidence path must be normalized and repository relative");
  }
  const root = realpathSync(repoRoot);
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(`${root}${path.sep}`) || !existsSync(absolute)) {
    fail("EVIDENCE_FILE_MISSING", "referenced evidence file is missing or outside the repository");
  }
  const metadata = lstatSync(absolute);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.nlink !== 1) {
    fail("UNSAFE_EVIDENCE_FILE", "referenced evidence must be a regular non-symlink file");
  }
  const resolved = realpathSync(absolute);
  if (resolved !== absolute || !resolved.startsWith(`${root}${path.sep}`)) {
    fail("UNSAFE_EVIDENCE_FILE", "referenced evidence cannot traverse a symlink");
  }
  return resolved;
}

function physicalEvidenceFile({ repoRoot, artifactRoot, artifactPhysicalRoot, relativePath }) {
  if (!artifactPhysicalRoot) return safeRepoFile(repoRoot, relativePath);
  if (!path.isAbsolute(artifactPhysicalRoot)
    || typeof artifactRoot !== "string"
    || !relativePath.startsWith(`${artifactRoot}/`)) {
    fail("UNSAFE_EVIDENCE_PATH", "physical evidence mapping must bind one canonical artifact root");
  }
  const repo = realpathSync(repoRoot);
  const physicalRoot = realpathSync(artifactPhysicalRoot);
  if (!physicalRoot.startsWith(`${repo}${path.sep}`)) {
    fail("UNSAFE_EVIDENCE_PATH", "physical evidence root must remain inside the repository");
  }
  const suffix = relativePath.slice(artifactRoot.length + 1);
  if (!suffix
    || suffix.includes("\\")
    || path.posix.normalize(suffix) !== suffix
    || suffix.split("/").includes("..")) {
    fail("UNSAFE_EVIDENCE_PATH", "physical evidence suffix must be normalized and contained");
  }
  const absolute = path.resolve(physicalRoot, suffix);
  if (!absolute.startsWith(`${physicalRoot}${path.sep}`) || !existsSync(absolute)) {
    fail("EVIDENCE_FILE_MISSING", "mapped physical evidence file is missing");
  }
  const metadata = lstatSync(absolute);
  if (!metadata.isFile()
    || metadata.isSymbolicLink()
    || metadata.nlink !== 1
    || realpathSync(absolute) !== absolute) {
    fail("UNSAFE_EVIDENCE_FILE", "mapped physical evidence must be a regular non-linked file");
  }
  return absolute;
}

function canonicalReference(repoRoot, filePath, receipt) {
  const root = realpathSync(repoRoot);
  const absolute = path.resolve(filePath);
  const relative = path.relative(root, absolute);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    fail("UNSAFE_EVIDENCE_PATH", "receipt reference must remain inside the repository");
  }
  const portable = relative.split(path.sep).join("/");
  const body = readFileSync(safeRepoFile(root, portable));
  return Object.freeze({
    path: portable,
    sha256: sha256(body),
    bytes: body.length,
    schema_version: receipt.schema_version,
    receipt_id: receipt.receipt_id,
  });
}

function readCanonicalReference(reference, { repoRoot, expectedSchema, expectedBasename, label }) {
  exactKeys(reference, ["path", "sha256", "bytes", "schema_version", "receipt_id"], `${label} reference`);
  assertSha256(reference.sha256, `${label} reference sha256`);
  assertSafeId(reference.receipt_id, `${label} reference receipt id`);
  if (!Number.isSafeInteger(reference.bytes) || reference.bytes < 1
    || reference.schema_version !== expectedSchema
    || (expectedBasename && path.posix.basename(reference.path) !== expectedBasename)) {
    fail("EVIDENCE_REFERENCE_INVALID", `${label} reference is incomplete or has the wrong schema/path`);
  }
  const absolute = safeRepoFile(repoRoot, reference.path);
  const body = readFileSync(absolute);
  if (body.length !== reference.bytes || sha256(body) !== reference.sha256) {
    fail("EVIDENCE_HASH_MISMATCH", `${label} reference bytes or hash do not match`);
  }
  let receipt;
  try {
    receipt = JSON.parse(body.toString("utf8"));
  } catch {
    fail("EVIDENCE_JSON_INVALID", `${label} must be valid JSON`);
  }
  const canonicalBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  if (!body.equals(canonicalBytes)
    || receipt?.schema_version !== reference.schema_version
    || receipt?.receipt_id !== reference.receipt_id) {
    fail("EVIDENCE_REFERENCE_MISMATCH", `${label} schema or receipt id does not match its reference`);
  }
  assertNoSensitiveValues(receipt);
  return Object.freeze({ absolute, body, receipt });
}

function trustedInspection(value, label) {
  if (!value || !TRUSTED_INSPECTIONS.has(value)) {
    fail("UNTRUSTED_INSPECTION", `${label} must come from a live privacy inspection`);
  }
  return value;
}

function mintInspection(value) {
  const inspection = Object.freeze(value);
  TRUSTED_INSPECTIONS.add(inspection);
  return inspection;
}

function mintLiveValidation(value) {
  const validation = Object.freeze(value);
  LIVE_VALIDATIONS.add(validation);
  return validation;
}

async function fileRecord(filePath) {
  let fileStat;
  try {
    fileStat = await lstat(filePath, { bigint: true });
  } catch {
    fail("ARTIFACT_MISSING", "artifact file is missing");
  }
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
    fail("ARTIFACT_NOT_REGULAR_FILE", "artifact must be a regular non-symlink file");
  }
  if (fileStat.nlink !== 1n) fail("ARTIFACT_HARDLINK_FORBIDDEN", "artifact must not be a hard link");
  let handle;
  try {
    handle = await open(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  } catch {
    fail("ARTIFACT_UNREADABLE", "artifact file could not be opened safely");
  }
  const hash = createHash("sha256");
  let bytes = 0;
  try {
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      hash.update(chunk);
      bytes += chunk.length;
    }
    const opened = identity(await handle.stat({ bigint: true }));
    const after = identity(await lstat(filePath, { bigint: true }));
    if (!sameIdentity(identity(fileStat), opened)
      || !sameIdentity(identity(fileStat), after)
      || bytes !== Number(fileStat.size)) {
      fail("ARTIFACT_CHANGED_DURING_SCAN", "artifact bytes changed while they were read");
    }
  } catch (error) {
    if (error instanceof DesktopArtifactPrivacyError) throw error;
    fail("ARTIFACT_UNREADABLE", "artifact file could not be read");
  } finally {
    await handle.close().catch(() => {});
  }
  return Object.freeze({
    sha256: hash.digest("hex"),
    bytes,
    identity_sha256: sha256(Buffer.from(JSON.stringify(identity(fileStat)), "utf8")),
  });
}

function resolvedSourcePath(repoRoot, configured, fallback = null) {
  const value = String(configured ?? fallback ?? "").trim();
  return value ? path.resolve(repoRoot, value) : null;
}

export async function buildDesktopArtifactPrivacyCorpus({
  repoRoot,
  env = process.env,
  rosterSourcePath,
  contactSourcePath,
  registrationSeedSourcePath,
  photoSourcePath,
} = {}) {
  if (!path.isAbsolute(repoRoot ?? "")) fail("REPO_ROOT_REQUIRED", "repoRoot must be absolute");
  const contactPath = resolvedSourcePath(
    repoRoot,
    contactSourcePath ?? env.LAWOS_HRX_MEMBER_CONTACT_SOURCE_PATH,
  );
  if (!contactPath) {
    fail("CONTACT_AUTHORITY_REQUIRED", "release artifact privacy scanning requires an explicit contact authority");
  }
  return buildDesktopPrivateDataCorpus({
    rosterSourcePath: resolvedSourcePath(
      repoRoot,
      rosterSourcePath ?? env.LAWOS_HRX_MEMBER_ROSTER_SOURCE_PATH,
      DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.roster,
    ),
    contactSourcePath: contactPath,
    registrationSeedSourcePath: resolvedSourcePath(
      repoRoot,
      registrationSeedSourcePath ?? env.LAWOS_MATTER_VAULT_USER_REGISTRATION_SEED_PATH,
      DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.registrationSeed,
    ),
    photoSourcePath: resolvedSourcePath(
      repoRoot,
      photoSourcePath ?? env.LAWOS_HRX_MEMBER_PHOTO_SOURCE_PATH,
      DEFAULT_DESKTOP_PRIVATE_DATA_SOURCES.photos,
    ),
  });
}

export function desktopArtifactPrivacyCorpusSha256(corpus) {
  const needles = desktopPrivateDataCorpusNeedles(corpus);
  const photoHashes = desktopPrivateDataCorpusPhotoHashes(corpus);
  if (!needles || !photoHashes || corpus?.contact_corpus_status !== "loaded") {
    fail("CORPUS_AUTHORITY_INVALID", "privacy corpus digest requires the complete shared contact authority");
  }
  const rows = [
    ...needles.map(({ kind, bytes }) => ({ kind, value: bytes.toString("hex") })),
    ...[...photoHashes].map((value) => ({ kind: "private_photo_hash", value })),
  ].sort((left, right) => compareCodePointText(left.kind, right.kind)
    || compareCodePointText(left.value, right.value));
  const hash = createHash("sha256");
  hash.update("law-firm-os.matter-desktop-private-data-corpus.v1\0", "utf8");
  for (const { kind, value } of rows) {
    hash.update(kind, "utf8");
    hash.update("\0", "utf8");
    hash.update(value, "ascii");
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}

export function validateDesktopArtifactPrivacyCorpusSha256(corpus, expectedSha256) {
  if (!SHA256.test(expectedSha256 ?? "")
    || desktopArtifactPrivacyCorpusSha256(corpus) !== expectedSha256) {
    fail("CORPUS_DIGEST_MISMATCH", "privacy corpus digest is missing or mismatched");
  }
  return expectedSha256;
}

export function desktopBuildManifestSha256(buildManifest) {
  validateDesktopBuildManifest(buildManifest);
  return sha256(Buffer.from(serializeDesktopBuildManifest(buildManifest), "utf8"));
}

function withinRoot(rootRealPath, targetRealPath) {
  if (rootRealPath === targetRealPath) return true;
  const relativePath = path.relative(rootRealPath, targetRealPath);
  return relativePath !== ".."
    && !relativePath.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relativePath);
}

function portablePath(rootPath, entryPath) {
  return path.relative(rootPath, entryPath).split(path.sep).join("/");
}

async function hashFile(filePath) {
  let handle;
  try {
    handle = await open(filePath, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
  } catch {
    fail("MEMBER_UNREADABLE", "expanded artifact member could not be read");
  }
  const hash = createHash("sha256");
  let bytes = 0;
  try {
    for await (const chunk of handle.createReadStream({ autoClose: false })) {
      hash.update(chunk);
      bytes += chunk.length;
    }
    return Object.freeze({
      sha256: hash.digest("hex"),
      bytes,
      opened: identity(await handle.stat({ bigint: true })),
    });
  } catch {
    fail("MEMBER_UNREADABLE", "expanded artifact member could not be read");
  } finally {
    await handle.close().catch(() => {});
  }
}

function identity(metadata, linkText = null) {
  return Object.freeze({
    dev: String(metadata.dev),
    ino: String(metadata.ino),
    nlink: String(metadata.nlink),
    size: String(metadata.size),
    mtime_ns: String(metadata.mtimeNs),
    ctime_ns: String(metadata.ctimeNs),
    link_text: linkText,
  });
}

function sameIdentity(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function stableLstat(filePath) {
  try {
    return await lstat(filePath, { bigint: true });
  } catch {
    fail("MEMBER_UNREADABLE", "expanded artifact member could not be inspected");
  }
}

async function collectMembers(rootPath) {
  let rootStat;
  try {
    rootStat = await lstat(rootPath, { bigint: true });
  } catch {
    fail("EXPANDED_ROOT_MISSING", "expanded artifact root is missing");
  }
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) {
    fail("EXPANDED_ROOT_UNSAFE", "expanded artifact root must be a regular directory");
  }
  const rootRealPath = await realpath(rootPath).catch(() => {
    fail("EXPANDED_ROOT_UNREADABLE", "expanded artifact root could not be resolved");
  });
  const members = [];
  const identities = [];

  async function visit(directoryPath) {
    const directoryBefore = await stableLstat(directoryPath);
    let names;
    try {
      names = await readdir(directoryPath);
    } catch {
      fail("MEMBER_DIRECTORY_UNREADABLE", "expanded artifact directory could not be read");
    }
    names.sort(compareCodePointText);
    for (const name of names) {
      const entryPath = path.join(directoryPath, name);
      const relativePath = portablePath(rootPath, entryPath);
      const entryStat = await stableLstat(entryPath);
      const entryBefore = identity(entryStat);
      if (entryStat.isSymbolicLink()) {
        let targetRealPath;
        let linkText;
        try {
          [targetRealPath, linkText] = await Promise.all([realpath(entryPath), readlink(entryPath)]);
        } catch {
          fail("UNSAFE_SYMLINK", "expanded artifact contains a broken or looping symlink");
        }
        if (path.isAbsolute(linkText) || !withinRoot(rootRealPath, targetRealPath)) {
          fail("UNSAFE_SYMLINK", "expanded artifact contains an out-of-root symlink");
        }
        const targetStat = await stat(targetRealPath).catch(() => null);
        if (!targetStat || (!targetStat.isFile() && !targetStat.isDirectory())) {
          fail("UNSAFE_SYMLINK", "expanded artifact symlink target type is unsupported");
        }
        const [linkTextAfter, entryAfterStat] = await Promise.all([
          readlink(entryPath).catch(() => null),
          stableLstat(entryPath),
        ]);
        const symlinkBefore = identity(entryStat, linkText);
        const symlinkAfter = identity(entryAfterStat, linkTextAfter);
        if (linkTextAfter !== linkText || !sameIdentity(symlinkBefore, symlinkAfter)) {
          fail("EXPANDED_TREE_CHANGED", "expanded artifact symlink changed during inspection");
        }
        const linkBytes = Buffer.from(linkText, "utf8");
        members.push({ path: relativePath, type: "symlink", sha256: sha256(linkBytes), bytes: linkBytes.length });
        identities.push({ path: relativePath, type: "symlink", ...symlinkBefore });
      } else if (entryStat.isDirectory()) {
        members.push({ path: relativePath, type: "directory", sha256: EMPTY_SHA256, bytes: 0 });
        await visit(entryPath);
        const entryAfter = identity(await stableLstat(entryPath));
        if (!sameIdentity(entryBefore, entryAfter)) {
          fail("EXPANDED_TREE_CHANGED", "expanded artifact directory changed during inspection");
        }
        identities.push({ path: relativePath, type: "directory", ...entryAfter });
      } else if (entryStat.isFile()) {
        if (entryStat.nlink !== 1n) {
          fail("UNSAFE_HARDLINK", "expanded artifact contains a hard-linked file");
        }
        const hashed = await hashFile(entryPath);
        const entryAfter = identity(await stableLstat(entryPath));
        if (!sameIdentity(entryBefore, hashed.opened)
          || !sameIdentity(entryBefore, entryAfter)
          || hashed.bytes !== Number(entryStat.size)) {
          fail("EXPANDED_TREE_CHANGED", "expanded artifact file changed during inspection");
        }
        members.push({
          path: relativePath,
          type: "file",
          sha256: hashed.sha256,
          bytes: hashed.bytes,
        });
        identities.push({ path: relativePath, type: "file", ...entryAfter });
      } else {
        fail("UNINSPECTED_MEMBER", "expanded artifact contains an unsupported filesystem member");
      }
    }
    const namesAfter = await readdir(directoryPath).catch(() => null);
    const directoryAfter = await stableLstat(directoryPath);
    if (!namesAfter
      || JSON.stringify(names) !== JSON.stringify(namesAfter.sort(compareCodePointText))
      || !sameIdentity(identity(directoryBefore), identity(directoryAfter))) {
      fail("EXPANDED_TREE_CHANGED", "expanded artifact directory membership changed during inspection");
    }
  }

  await visit(rootPath);
  members.sort((left, right) => compareCodePointText(left.path, right.path));
  identities.sort((left, right) => compareCodePointText(left.path, right.path));
  if (members.length === 0) fail("EXPANDED_ROOT_EMPTY", "expanded artifact root is empty");
  return Object.freeze({
    members: Object.freeze(members.map(Object.freeze)),
    identity_sha256: sha256(Buffer.from(JSON.stringify(identities), "utf8")),
  });
}

function embeddedBuildManifestRelativePath(buildManifest) {
  return buildManifest.platform === "darwin"
    ? "Contents/Resources/matter-build-manifest.json"
    : "resources/matter-build-manifest.json";
}

async function assertEmbeddedBuildManifest(rootPath, buildManifest, relativePath) {
  const normalized = path.posix.normalize(String(relativePath).replaceAll("\\", "/"));
  if (!normalized || normalized === "." || normalized.startsWith("../") || path.posix.isAbsolute(normalized)) {
    fail("BUILD_MANIFEST_PATH_UNSAFE", "embedded build manifest path must stay inside the expanded root");
  }
  const manifestPath = path.join(rootPath, ...normalized.split("/"));
  let rawBytes;
  try {
    rawBytes = await readFile(manifestPath);
  } catch {
    fail("EMBEDDED_BUILD_MANIFEST_MISSING", "expanded artifact is missing its build manifest");
  }
  const canonicalBytes = Buffer.from(serializeDesktopBuildManifest(buildManifest), "utf8");
  if (!rawBytes.equals(canonicalBytes)) {
    fail("EMBEDDED_BUILD_MANIFEST_MISMATCH", "expanded artifact build manifest does not match the canonical build input");
  }
  return sha256(rawBytes);
}

function memberManifest(buildManifest, buildManifestSha256, members) {
  return Object.freeze({
    schema_version: RF13_DIST_MEMBER_MANIFEST_SCHEMA,
    source_sha: buildManifest.source_sha,
    source_tree: buildManifest.source_tree,
    build_manifest_sha256: buildManifestSha256,
    channel: buildManifest.channel,
    requested_runtime_mode: buildManifest.requested_runtime_mode,
    effective_runtime_mode: buildManifest.effective_runtime_mode,
    runtime_included: buildManifest.runtime_included,
    runtime_data_class: buildManifest.runtime_data_class,
    non_distributable: buildManifest.non_distributable,
    distributable: buildManifest.distributable,
    members,
  });
}

export function serializeDesktopArtifactMemberManifest(manifest) {
  return `${JSON.stringify(manifest, null, 2)}\n`;
}

export function validateDesktopArtifactMemberManifest(manifest, {
  expectedBuildManifestSha256,
  expectedDigest,
  expectedMemberCount,
  expectedSourceSha,
  expectedSourceTree,
  rawBytes,
} = {}) {
  exactKeys(manifest, [
    "schema_version",
    "source_sha",
    "source_tree",
    "build_manifest_sha256",
    "channel",
    "requested_runtime_mode",
    "effective_runtime_mode",
    "runtime_included",
    "runtime_data_class",
    "non_distributable",
    "distributable",
    "members",
  ], "privacy member manifest");
  const canonicalBytes = Buffer.from(serializeDesktopArtifactMemberManifest(manifest), "utf8");
  if (manifest.schema_version !== RF13_DIST_MEMBER_MANIFEST_SCHEMA
    || !Buffer.isBuffer(rawBytes)
    || !rawBytes.equals(canonicalBytes)
    || sha256(rawBytes) !== expectedDigest
    || manifest.source_sha !== expectedSourceSha
    || manifest.source_tree !== expectedSourceTree
    || manifest.build_manifest_sha256 !== expectedBuildManifestSha256
    || manifest.channel !== "formal"
    || manifest.requested_runtime_mode !== "none"
    || manifest.effective_runtime_mode !== "none"
    || manifest.runtime_included !== false
    || manifest.runtime_data_class !== "none"
    || manifest.non_distributable !== false
    || manifest.distributable !== true
    || !Array.isArray(manifest.members)
    || manifest.members.length !== expectedMemberCount) {
    fail("PRIVACY_MEMBER_MANIFEST_INVALID", "privacy member manifest is not canonical or formal-source bound");
  }
  const paths = [];
  for (const member of manifest.members) {
    exactKeys(member, ["path", "type", "sha256", "bytes"], "privacy member manifest entry");
    if (typeof member.path !== "string"
      || member.path.length === 0
      || member.path.includes("\\")
      || path.posix.isAbsolute(member.path)
      || path.posix.normalize(member.path) !== member.path
      || member.path.split("/").includes("..")
      || !new Set(["directory", "file", "symlink"]).has(member.type)
      || !Number.isSafeInteger(member.bytes)
      || member.bytes < 0
      || (member.type === "directory" && (member.bytes !== 0 || member.sha256 !== EMPTY_SHA256))
      || (member.type === "symlink" && member.bytes < 1)) {
      fail("PRIVACY_MEMBER_MANIFEST_INVALID", "privacy member manifest entry path, type, or size is invalid");
    }
    assertSha256(member.sha256, "privacy member entry sha256");
    paths.push(member.path);
  }
  const sortedPaths = [...paths].sort(compareCodePointText);
  if (new Set(paths).size !== paths.length || JSON.stringify(paths) !== JSON.stringify(sortedPaths)) {
    fail("PRIVACY_MEMBER_MANIFEST_INVALID", "privacy member manifest paths must be unique and code-point sorted");
  }
  return manifest;
}

function readMemberManifest(receipt, options) {
  const memberManifestPath = physicalEvidenceFile({
    repoRoot: options.repoRoot,
    artifactRoot: options.artifactRoot,
    artifactPhysicalRoot: options.artifactPhysicalRoot,
    relativePath: receipt.member_manifest_path,
  });
  const rawBytes = readFileSync(memberManifestPath);
  let memberManifest;
  try {
    memberManifest = JSON.parse(rawBytes.toString("utf8"));
  } catch {
    fail("PRIVACY_MEMBER_MANIFEST_INVALID", "privacy member manifest must be valid JSON");
  }
  assertNoSensitiveValues(memberManifest);
  validateDesktopArtifactMemberManifest(memberManifest, {
    expectedBuildManifestSha256: options.expectedBuildManifestSha256,
    expectedDigest: receipt.member_manifest_sha256,
    expectedMemberCount: receipt.scanned_member_count,
    expectedSourceSha: options.expectedSourceSha,
    expectedSourceTree: options.expectedSourceTree,
    rawBytes,
  });
  return Object.freeze({ memberManifest, rawBytes, memberManifestPath });
}

export function validateRf13DistPrivacyMemberReceiptStructure(receipt, {
  artifact,
  artifactRoot,
  artifactPhysicalRoot,
  expectedBuildManifestSha256,
  expectedSourceSha,
  expectedSourceTree,
  repoRoot,
} = {}) {
  exactKeys(receipt, [
    "schema_version", "receipt_id", "gate", "status", "source_sha", "source_tree",
    "artifact_id", "artifact_kind", "artifact_sha256", "artifact_bytes",
    "build_manifest_sha256", "runtime_mode", "scan_method", "expanded_scan_verdict",
    "finding_count", "scanned_member_count", "member_manifest_path", "member_manifest_sha256",
    "container_byte_verdict", "container_byte_finding_count", "container_raw_uninspected_count",
    "inspection_method", "omitted_member_count", "uninspected_archive_count",
    "executed", "authoritative", "template",
  ], "privacy member receipt");
  assertSafeId(artifact?.id, "privacy artifact id");
  assertSafeId(artifact?.kind, "privacy artifact kind");
  const archive = ARCHIVE_KINDS.has(artifact?.kind);
  const expandedDirectory = artifact?.kind === DESKTOP_ARTIFACT_EXPANDED_DIRECTORY_KIND;
  const memberBearing = archive || expandedDirectory;
  if (receipt.schema_version !== RF13_DIST_PRIVACY_MEMBER_SCHEMA
    || receipt.gate !== "privacy"
    || receipt.status !== "PASS"
    || receipt.artifact_id !== artifact?.id
    || receipt.artifact_kind !== artifact?.kind
    || receipt.artifact_sha256 !== artifact?.sha256
    || receipt.artifact_bytes !== artifact?.bytes
    || receipt.build_manifest_sha256 !== expectedBuildManifestSha256
    || receipt.runtime_mode !== "none"
    || receipt.source_sha !== expectedSourceSha
    || receipt.source_tree !== expectedSourceTree
    || receipt.finding_count !== 0
    || !Number.isSafeInteger(receipt.scanned_member_count)
    || receipt.scanned_member_count < 1
    || (!memberBearing && receipt.scanned_member_count !== 1)
    || receipt.omitted_member_count !== 0
    || receipt.uninspected_archive_count !== 0
    || receipt.container_byte_verdict !== (expandedDirectory ? "NOT_APPLICABLE" : "PASS")
    || receipt.container_byte_finding_count !== 0
    || receipt.scan_method !== (archive
      ? "container_bytes_and_expanded_members"
      : expandedDirectory ? "expanded_members" : "artifact_bytes")
    || receipt.expanded_scan_verdict !== (memberBearing ? "PASS" : "NOT_APPLICABLE")
    || receipt.container_raw_uninspected_count !== (archive ? 1 : 0)
    || receipt.inspection_method !== (artifact?.kind === "dmg_image"
      ? "dmg_readonly_mount"
      : archive ? "zip_extract"
        : expandedDirectory ? "expanded_tree_snapshot" : "artifact_bytes")
    || (memberBearing && receipt.member_manifest_path !== `${artifactRoot}/evidence/members-${artifact.id}.json`)
    || (memberBearing && !SHA256.test(receipt.member_manifest_sha256 ?? ""))
    || (!memberBearing && (receipt.member_manifest_path !== null || receipt.member_manifest_sha256 !== null))
    || (expandedDirectory && receipt.artifact_sha256 !== receipt.member_manifest_sha256)
    || receipt.executed !== true
    || receipt.authoritative !== true
    || receipt.template !== false) {
    fail("PRIVACY_MEMBER_EVIDENCE_INVALID", "privacy member receipt is incomplete or does not match its artifact");
  }
  assertSafeId(receipt.receipt_id, "privacy member receipt id");
  assertSha1(receipt.source_sha, "privacy member source SHA");
  assertSha1(receipt.source_tree, "privacy member source tree");
  assertSha256(receipt.artifact_sha256, "privacy member artifact sha256");
  if (memberBearing) {
    const memberEvidence = readMemberManifest(receipt, {
      repoRoot,
      artifactRoot,
      artifactPhysicalRoot,
      expectedBuildManifestSha256,
      expectedSourceSha,
      expectedSourceTree,
    });
    if (expandedDirectory && receipt.artifact_bytes !== memberEvidence.rawBytes.length) {
      fail("PRIVACY_MEMBER_EVIDENCE_INVALID", "expanded-directory artifact bytes must equal its canonical member manifest bytes");
    }
  }
  return receipt;
}

export function assertDesktopArtifactPrivacyValidation(validation, expected = {}) {
  if (!validation || !LIVE_VALIDATIONS.has(validation)) {
    fail("LIVE_PRIVACY_VALIDATION_REQUIRED", "privacy evidence requires an opaque live artifact validation");
  }
  for (const [key, value] of Object.entries(expected)) {
    if (value !== undefined && validation[key] !== value) {
      fail("LIVE_PRIVACY_VALIDATION_MISMATCH", `live privacy validation does not match ${key}`);
    }
  }
  return validation;
}

export function validateRf13DistPrivacyMemberReceipt(receipt, options = {}) {
  validateRf13DistPrivacyMemberReceiptStructure(receipt, options);
  assertDesktopArtifactPrivacyValidation(options.validation, {
    artifact_id: options.artifact?.id,
    artifact_kind: options.artifact?.kind,
    artifact_sha256: options.artifact?.sha256,
    artifact_bytes: options.artifact?.bytes,
    source_sha: options.expectedSourceSha,
    source_tree: options.expectedSourceTree,
    build_manifest_sha256: options.expectedBuildManifestSha256,
    member_manifest_sha256: receipt.member_manifest_sha256,
    receipt_id: receipt.receipt_id,
    receipt_sha256: canonicalJsonSha256(receipt),
    verdict: "PASS",
  });
  return receipt;
}

function sameMembers(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function withExpandedTreeSnapshot(rootPath, inspectSnapshot) {
  const sourceBefore = await collectMembers(rootPath);
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "matter-expanded-privacy-"));
  const snapshotRoot = path.join(temporaryRoot, "root");
  try {
    await cp(rootPath, snapshotRoot, {
      recursive: true,
      dereference: false,
      errorOnExist: true,
      force: false,
      preserveTimestamps: true,
      verbatimSymlinks: true,
    });
    const sourceAfterCopy = await collectMembers(rootPath);
    const snapshotBefore = await collectMembers(snapshotRoot);
    if (sourceBefore.identity_sha256 !== sourceAfterCopy.identity_sha256
      || !sameMembers(sourceBefore.members, sourceAfterCopy.members)
      || !sameMembers(sourceBefore.members, snapshotBefore.members)) {
      fail("EXPANDED_TREE_CHANGED", "expanded artifact changed while its immutable privacy snapshot was created");
    }
    const result = await inspectSnapshot(snapshotRoot);
    const [snapshotAfter, sourceAfterInspection] = await Promise.all([
      collectMembers(snapshotRoot),
      collectMembers(rootPath),
    ]);
    if (snapshotBefore.identity_sha256 !== snapshotAfter.identity_sha256
      || sourceBefore.identity_sha256 !== sourceAfterInspection.identity_sha256
      || !sameMembers(snapshotBefore.members, snapshotAfter.members)
      || !sameMembers(sourceBefore.members, sourceAfterInspection.members)) {
      fail("EXPANDED_TREE_CHANGED", "expanded artifact changed across the privacy inspection boundary");
    }
    return result;
  } catch (error) {
    if (error instanceof DesktopArtifactPrivacyError) throw error;
    fail("EXPANDED_SNAPSHOT_FAILED", "expanded artifact could not be copied into an isolated privacy snapshot");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function inspectExpandedSnapshot({
  snapshotRoot,
  buildManifest,
  corpus,
  displayBase,
  embeddedBuildManifestPath = null,
}) {
  const membersBefore = await collectMembers(snapshotRoot);
  let scan;
  try {
    scan = await scanDesktopPrivateDataBoundary({ roots: [snapshotRoot], corpus, displayBase });
  } catch (error) {
    fail("EXPANDED_SCAN_ERROR", "expanded artifact privacy scan could not complete", { scanner_kind: error?.kind ?? "unknown" });
  }
  if (scan.verdict !== "PASS" || scan.finding_count !== 0 || scan.scanned_file_count < 1) {
    fail("EXPANDED_PRIVACY_SCAN_FAILED", "expanded artifact privacy scan found protected or uninspected content", { scan });
  }
  if (buildManifest.effective_runtime_mode !== "none" || buildManifest.runtime_included !== false) {
    fail("RUNTIME_MODE_NOT_RELEASE_SAFE", "artifact privacy PASS requires runtime mode none");
  }
  const manifestSha256 = await assertEmbeddedBuildManifest(
    snapshotRoot,
    buildManifest,
    embeddedBuildManifestPath ?? embeddedBuildManifestRelativePath(buildManifest),
  );
  const membersAfter = await collectMembers(snapshotRoot);
  if (membersBefore.identity_sha256 !== membersAfter.identity_sha256
    || !sameMembers(membersBefore.members, membersAfter.members)) {
    fail("EXPANDED_TREE_CHANGED", "privacy scan and member manifest did not observe one stable snapshot");
  }
  const manifest = memberManifest(buildManifest, manifestSha256, membersAfter.members);
  const manifestBody = serializeDesktopArtifactMemberManifest(manifest);
  return mintInspection({
    verdict: "PASS",
    source_sha: buildManifest.source_sha,
    source_tree: buildManifest.source_tree,
    build_manifest_sha256: manifestSha256,
    runtime_mode: buildManifest.effective_runtime_mode,
    finding_count: 0,
    scanned_file_count: scan.scanned_file_count,
    member_count: membersAfter.members.length,
    omitted_member_count: 0,
    uninspected_archive_count: 0,
    member_manifest: manifest,
    member_manifest_body: manifestBody,
    member_manifest_sha256: sha256(Buffer.from(manifestBody, "utf8")),
  });
}

export async function inspectExpandedDesktopArtifact({
  rootPath,
  buildManifest,
  corpus,
  displayBase = process.cwd(),
  embeddedBuildManifestPath = null,
} = {}) {
  validateDesktopBuildManifest(buildManifest);
  if (corpus?.contact_corpus_status !== "loaded") {
    fail("CONTACT_AUTHORITY_REQUIRED", "expanded artifact privacy scanning requires a loaded contact authority");
  }
  return withExpandedTreeSnapshot(rootPath, (snapshotRoot) => inspectExpandedSnapshot({
    snapshotRoot,
    buildManifest,
    corpus,
    displayBase,
    embeddedBuildManifestPath,
  }));
}

export function expandedDesktopArtifactDescriptor({ id, inspection } = {}) {
  trustedInspection(inspection, "expanded-directory privacy inspection");
  assertSafeId(id, "expanded-directory artifact id");
  assertSha256(inspection.member_manifest_sha256, "expanded-directory artifact sha256");
  const bytes = Buffer.byteLength(inspection.member_manifest_body ?? "", "utf8");
  if (bytes < 1 || inspection.verdict !== "PASS" || inspection.member_count < 1) {
    fail("EXPANDED_DIRECTORY_INSPECTION_INVALID", "expanded-directory artifact requires a complete live member inspection");
  }
  return Object.freeze({
    id,
    kind: DESKTOP_ARTIFACT_EXPANDED_DIRECTORY_KIND,
    sha256: inspection.member_manifest_sha256,
    bytes,
  });
}

async function withRegularFileSnapshot(artifactPath, inspectSnapshot) {
  const sourceBefore = await fileRecord(artifactPath);
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "matter-container-privacy-"));
  const snapshotPath = path.join(temporaryRoot, path.basename(artifactPath));
  try {
    await cp(artifactPath, snapshotPath, { errorOnExist: true, force: false, preserveTimestamps: true });
    const [sourceAfterCopy, snapshotBefore] = await Promise.all([
      fileRecord(artifactPath),
      fileRecord(snapshotPath),
    ]);
    if (sourceBefore.identity_sha256 !== sourceAfterCopy.identity_sha256
      || sourceBefore.sha256 !== snapshotBefore.sha256
      || sourceBefore.bytes !== snapshotBefore.bytes) {
      fail("ARTIFACT_CHANGED_DURING_SCAN", "artifact changed while its immutable privacy snapshot was created");
    }
    const result = await inspectSnapshot(snapshotPath, snapshotBefore);
    const [sourceAfter, snapshotAfter] = await Promise.all([
      fileRecord(artifactPath),
      fileRecord(snapshotPath),
    ]);
    if (sourceBefore.identity_sha256 !== sourceAfter.identity_sha256
      || sourceBefore.sha256 !== sourceAfter.sha256
      || sourceBefore.bytes !== sourceAfter.bytes
      || snapshotBefore.sha256 !== snapshotAfter.sha256
      || snapshotBefore.bytes !== snapshotAfter.bytes) {
      fail("ARTIFACT_CHANGED_DURING_SCAN", "artifact changed across the privacy inspection boundary");
    }
    return result;
  } catch (error) {
    if (error instanceof DesktopArtifactPrivacyError) throw error;
    fail("ARTIFACT_SNAPSHOT_FAILED", "artifact could not be copied into an isolated privacy snapshot");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function inspectArtifactSnapshotBytes({
  snapshotPath,
  snapshotRecord,
  artifactKind,
  corpus,
  displayBase,
}) {
  let scan;
  try {
    scan = await scanDesktopPrivateDataBoundary({ roots: [snapshotPath], corpus, displayBase });
  } catch (error) {
    fail("ARTIFACT_BYTE_SCAN_ERROR", "artifact byte scan could not complete", { scanner_kind: error?.kind ?? "unknown" });
  }
  const container = ARCHIVE_KINDS.has(artifactKind) || artifactKind === "nsis_installer";
  const rawContainerFindings = scan.findings.filter(({ kind }) => kind === "uninspected_archive_container");
  const byteFindings = scan.findings.filter(({ kind }) => kind !== "uninspected_archive_container");
  const rawContainerCount = rawContainerFindings.reduce((count, finding) => count + finding.count, 0);
  const byteFindingCount = byteFindings.reduce((count, finding) => count + finding.count, 0);
  if (byteFindingCount !== 0 || rawContainerCount !== (container ? 1 : 0)) {
    fail("ARTIFACT_BYTE_SCAN_FAILED", "artifact byte scan found protected data or a container classification mismatch", {
      finding_count: byteFindingCount,
      raw_uninspected_container_count: rawContainerCount,
    });
  }
  const afterScanRecord = await fileRecord(snapshotPath);
  if (afterScanRecord.sha256 !== snapshotRecord.sha256
    || afterScanRecord.bytes !== snapshotRecord.bytes
    ) {
    fail("ARTIFACT_CHANGED_DURING_SCAN", "artifact bytes changed during privacy inspection");
  }
  return mintInspection({
    verdict: "PASS",
    artifact_sha256: snapshotRecord.sha256,
    artifact_bytes: snapshotRecord.bytes,
    finding_count: 0,
    raw_uninspected_container_count: rawContainerCount,
  });
}

export async function inspectDesktopArtifactBytes({
  artifactPath,
  artifactKind,
  corpus,
  displayBase = process.cwd(),
} = {}) {
  if (corpus?.contact_corpus_status !== "loaded") {
    fail("CONTACT_AUTHORITY_REQUIRED", "artifact byte scanning requires a loaded contact authority");
  }
  return withRegularFileSnapshot(artifactPath, (snapshotPath, snapshotRecord) => inspectArtifactSnapshotBytes({
    snapshotPath,
    snapshotRecord,
    artifactKind,
    corpus,
    displayBase,
  }));
}

export function createDesktopZipExtractor(options = {}) {
  if (Object.keys(options).length !== 0) {
    fail("EXTRACTOR_INJECTION_FORBIDDEN", "ZIP extraction does not accept injectable commands or adapters");
  }
  return async ({ archivePath, destinationPath }) => {
    await mkdir(destinationPath, { recursive: true });
    await extractZip(path.resolve(archivePath), { dir: path.resolve(destinationPath) });
  };
}

export function createReadOnlyDmgExtractor(options = {}) {
  if (Object.keys(options).length !== 0) {
    fail("EXTRACTOR_INJECTION_FORBIDDEN", "DMG inspection does not accept injectable commands or adapters");
  }
  return async ({ artifactPath, inspectMountedRoot }) => {
    if (process.platform !== "darwin" || !existsSync("/usr/bin/hdiutil")) {
      fail("DMG_INSPECTION_UNAVAILABLE", "read-only DMG inspection requires macOS hdiutil");
    }
    const temporaryRoot = await mkdtemp(path.join(tmpdir(), "matter-dmg-privacy-"));
    const mountPath = path.join(temporaryRoot, "mount");
    await mkdir(mountPath);
    let attached = false;
    try {
      await execFileAsync("/usr/bin/hdiutil", [
        "attach",
        "-readonly",
        "-nobrowse",
        "-noautoopen",
        "-mountpoint",
        mountPath,
        artifactPath,
      ]);
      attached = true;
      return await inspectMountedRoot(mountPath);
    } finally {
      if (attached) await execFileAsync("/usr/bin/hdiutil", ["detach", mountPath]);
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  };
}

async function inspectExtractedTree({
  extractionRoot,
  expectedRootName,
  expectedExpandedInspection,
  buildManifest,
  corpus,
  displayBase,
  embeddedBuildManifestPath,
}) {
  const names = await readdir(extractionRoot).catch(() => {
    fail("ARCHIVE_EXTRACTION_UNREADABLE", "extracted archive root could not be read");
  });
  names.sort(compareCodePointText);
  if (names.length !== 1 || names[0] !== expectedRootName) {
    fail("ARCHIVE_ROOT_MISMATCH", "archive extraction must contain exactly the expected expanded root");
  }
  const extracted = await inspectExpandedDesktopArtifact({
    rootPath: path.join(extractionRoot, expectedRootName),
    buildManifest,
    corpus,
    displayBase,
    embeddedBuildManifestPath,
  });
  if (extracted.member_manifest_sha256 !== expectedExpandedInspection.member_manifest_sha256
    || extracted.member_count !== expectedExpandedInspection.member_count
    || extracted.member_manifest_body !== expectedExpandedInspection.member_manifest_body) {
    fail("ARCHIVE_MEMBER_MANIFEST_MISMATCH", "archive members do not match the finalized expanded package");
  }
  return extracted;
}

async function inspectZipSnapshot({
  snapshotPath,
  snapshotRecord,
  artifactKind,
  expectedRootName,
  expectedExpandedInspection,
  buildManifest,
  corpus,
  displayBase,
  embeddedBuildManifestPath,
}) {
  const byteInspection = await inspectArtifactSnapshotBytes({
    snapshotPath,
    snapshotRecord,
    artifactKind,
    corpus,
    displayBase,
  });
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "matter-zip-privacy-"));
  const extractionRoot = path.join(temporaryRoot, "expanded");
  let extracted;
  try {
    await createDesktopZipExtractor()({ archivePath: snapshotPath, destinationPath: extractionRoot });
    const temporaryMembers = (await readdir(temporaryRoot)).sort(compareCodePointText);
    if (temporaryMembers.length !== 1 || temporaryMembers[0] !== "expanded") {
      fail("ZIP_EXTRACTION_ESCAPED", "ZIP extraction wrote outside its isolated destination");
    }
    extracted = await inspectExtractedTree({
      extractionRoot,
      expectedRootName,
      expectedExpandedInspection,
      buildManifest,
      corpus,
      displayBase,
      embeddedBuildManifestPath,
    });
  } catch (error) {
    if (error instanceof DesktopArtifactPrivacyError) throw error;
    fail("ZIP_EXTRACTION_FAILED", "ZIP extraction or member inspection failed");
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
  return mintInspection({
    verdict: "PASS",
    artifact_kind: artifactKind,
    artifact_sha256: byteInspection.artifact_sha256,
    artifact_bytes: byteInspection.artifact_bytes,
    build_manifest_sha256: extracted.build_manifest_sha256,
    runtime_mode: extracted.runtime_mode,
    expanded_scan_verdict: "PASS",
    finding_count: 0,
    scanned_member_count: extracted.member_count,
    member_manifest_sha256: extracted.member_manifest_sha256,
    container_byte_verdict: "PASS",
    container_byte_finding_count: 0,
    container_raw_uninspected_count: 1,
    inspection_method: "zip_extract",
    omitted_member_count: 0,
    uninspected_archive_count: 0,
    expanded: extracted,
  });
}

export async function inspectZipDesktopArtifact(options = {}) {
  const allowed = new Set([
    "artifactPath", "artifactKind", "expectedRootName", "expectedExpandedInspection",
    "buildManifest", "corpus", "displayBase", "embeddedBuildManifestPath",
  ]);
  if (Object.keys(options).some((key) => !allowed.has(key))) {
    fail("INSPECTION_OPTION_INVALID", "ZIP inspection does not accept extractor injection or unknown options");
  }
  const {
    artifactPath,
    artifactKind = "zip_archive",
    expectedRootName,
    expectedExpandedInspection,
    buildManifest,
    corpus,
    displayBase = process.cwd(),
    embeddedBuildManifestPath = null,
  } = options;
  if (!new Set(["zip_archive", "unsigned_package_zip"]).has(artifactKind)) {
    fail("ZIP_ARTIFACT_KIND_INVALID", "ZIP inspection requires a ZIP artifact kind");
  }
  trustedInspection(expectedExpandedInspection, "expected expanded ZIP package inspection");
  return withRegularFileSnapshot(artifactPath, (snapshotPath, snapshotRecord) => inspectZipSnapshot({
    snapshotPath,
    snapshotRecord,
    artifactKind,
    expectedRootName,
    expectedExpandedInspection,
    buildManifest,
    corpus,
    displayBase,
    embeddedBuildManifestPath,
  }));
}

async function inspectDmgSnapshot({
  snapshotPath,
  snapshotRecord,
  expectedRootName,
  expectedExpandedInspection,
  buildManifest,
  corpus,
  displayBase,
  embeddedBuildManifestPath,
}) {
  const byteInspection = await inspectArtifactSnapshotBytes({
    snapshotPath,
    snapshotRecord,
    artifactKind: "dmg_image",
    corpus,
    displayBase,
  });
  let extracted;
  try {
    extracted = await createReadOnlyDmgExtractor()({
      artifactPath: snapshotPath,
      inspectMountedRoot: (extractionRoot) => inspectExtractedTree({
        extractionRoot,
        expectedRootName,
        expectedExpandedInspection,
        buildManifest,
        corpus,
        displayBase,
        embeddedBuildManifestPath,
      }),
    });
  } catch (error) {
    if (error instanceof DesktopArtifactPrivacyError) throw error;
    fail("DMG_EXTRACTION_FAILED", "DMG read-only mount or member inspection failed");
  }
  return mintInspection({
    verdict: "PASS",
    artifact_kind: "dmg_image",
    artifact_sha256: byteInspection.artifact_sha256,
    artifact_bytes: byteInspection.artifact_bytes,
    build_manifest_sha256: extracted.build_manifest_sha256,
    runtime_mode: extracted.runtime_mode,
    expanded_scan_verdict: "PASS",
    finding_count: 0,
    scanned_member_count: extracted.member_count,
    member_manifest_sha256: extracted.member_manifest_sha256,
    container_byte_verdict: "PASS",
    container_byte_finding_count: 0,
    container_raw_uninspected_count: 1,
    inspection_method: "dmg_readonly_mount",
    omitted_member_count: 0,
    uninspected_archive_count: 0,
    expanded: extracted,
  });
}

export async function inspectDmgDesktopArtifact(options = {}) {
  const allowed = new Set([
    "artifactPath", "expectedRootName", "expectedExpandedInspection", "buildManifest",
    "corpus", "displayBase", "embeddedBuildManifestPath",
  ]);
  if (Object.keys(options).some((key) => !allowed.has(key))) {
    fail("INSPECTION_OPTION_INVALID", "DMG inspection does not accept extractor injection or unknown options");
  }
  const {
    artifactPath,
    expectedRootName,
    expectedExpandedInspection,
    buildManifest,
    corpus,
    displayBase = process.cwd(),
    embeddedBuildManifestPath = null,
  } = options;
  trustedInspection(expectedExpandedInspection, "expected expanded DMG package inspection");
  return withRegularFileSnapshot(artifactPath, (snapshotPath, snapshotRecord) => inspectDmgSnapshot({
    snapshotPath,
    snapshotRecord,
    expectedRootName,
    expectedExpandedInspection,
    buildManifest,
    corpus,
    displayBase,
    embeddedBuildManifestPath,
  }));
}

export async function inspectPlainDesktopArtifact({
  artifactPath,
  artifactKind,
  buildManifest,
  corpus,
  displayBase = process.cwd(),
} = {}) {
  validateDesktopBuildManifest(buildManifest);
  if (ARCHIVE_KINDS.has(artifactKind) || artifactKind === "nsis_installer") {
    fail("RAW_ONLY_CONTAINER_FORBIDDEN", "archive and installer artifacts require member inspection");
  }
  if (buildManifest.effective_runtime_mode !== "none" || buildManifest.runtime_included !== false) {
    fail("RUNTIME_MODE_NOT_RELEASE_SAFE", "artifact privacy PASS requires runtime mode none");
  }
  const bytes = await inspectDesktopArtifactBytes({ artifactPath, artifactKind, corpus, displayBase });
  return mintInspection({
    verdict: "PASS",
    artifact_kind: artifactKind,
    artifact_sha256: bytes.artifact_sha256,
    artifact_bytes: bytes.artifact_bytes,
    build_manifest_sha256: desktopBuildManifestSha256(buildManifest),
    runtime_mode: buildManifest.effective_runtime_mode,
    expanded_scan_verdict: "NOT_APPLICABLE",
    finding_count: 0,
    scanned_member_count: 1,
    member_manifest_sha256: null,
    container_byte_verdict: "PASS",
    container_byte_finding_count: 0,
    container_raw_uninspected_count: 0,
    inspection_method: "artifact_bytes",
    omitted_member_count: 0,
    uninspected_archive_count: 0,
  });
}

export function createRf13DistPrivacyMemberReceipt({
  receiptId,
  artifact,
  buildManifest,
  inspection,
  memberManifestPath = null,
} = {}) {
  validateDesktopBuildManifest(buildManifest);
  trustedInspection(inspection, "artifact privacy inspection");
  assertSafeId(artifact?.id, "privacy artifact id");
  assertSafeId(artifact?.kind, "privacy artifact kind");
  const expandedDirectory = artifact?.kind === DESKTOP_ARTIFACT_EXPANDED_DIRECTORY_KIND;
  const expandedDescriptor = expandedDirectory
    ? expandedDesktopArtifactDescriptor({ id: artifact.id, inspection })
    : null;
  const normalizedInspection = expandedDirectory ? {
    ...inspection,
    artifact_kind: DESKTOP_ARTIFACT_EXPANDED_DIRECTORY_KIND,
    artifact_sha256: expandedDescriptor.sha256,
    artifact_bytes: expandedDescriptor.bytes,
    expanded_scan_verdict: "PASS",
    scanned_member_count: inspection.member_count,
    container_byte_verdict: "NOT_APPLICABLE",
    container_byte_finding_count: 0,
    container_raw_uninspected_count: 0,
    inspection_method: "expanded_tree_snapshot",
  } : inspection;
  if (!artifact || normalizedInspection?.verdict !== "PASS"
    || artifact.kind !== normalizedInspection.artifact_kind
    || artifact.sha256 !== normalizedInspection.artifact_sha256
    || artifact.bytes !== normalizedInspection.artifact_bytes
    || artifact.kind === "nsis_installer") {
    fail("PRIVACY_RECEIPT_INPUT_MISMATCH", "privacy receipt inputs are incomplete or artifact-mismatched");
  }
  const archive = ARCHIVE_KINDS.has(artifact.kind);
  const memberBearing = archive || expandedDirectory;
  if (archive) trustedInspection(inspection.expanded, "archive expanded-member inspection");
  const expectedBuildManifestSha256 = desktopBuildManifestSha256(buildManifest);
  if (memberBearing !== Boolean(memberManifestPath)) {
    fail("PRIVACY_MEMBER_MANIFEST_PATH_MISMATCH", "expanded-member privacy receipts require one canonical member manifest path");
  }
  if (normalizedInspection.build_manifest_sha256 !== expectedBuildManifestSha256
    || normalizedInspection.runtime_mode !== buildManifest.effective_runtime_mode
    || normalizedInspection.runtime_mode !== "none") {
    fail("PRIVACY_BUILD_BINDING_MISMATCH", "privacy inspection is not bound to the canonical release-safe build manifest");
  }
  return Object.freeze({
    schema_version: RF13_DIST_PRIVACY_MEMBER_SCHEMA,
    receipt_id: receiptId,
    gate: "privacy",
    status: "PASS",
    source_sha: buildManifest.source_sha,
    source_tree: buildManifest.source_tree,
    artifact_id: artifact.id,
    artifact_kind: artifact.kind,
    artifact_sha256: artifact.sha256,
    artifact_bytes: artifact.bytes,
    build_manifest_sha256: normalizedInspection.build_manifest_sha256,
    runtime_mode: normalizedInspection.runtime_mode,
    scan_method: archive
      ? "container_bytes_and_expanded_members"
      : expandedDirectory ? "expanded_members" : "artifact_bytes",
    expanded_scan_verdict: normalizedInspection.expanded_scan_verdict,
    finding_count: normalizedInspection.finding_count,
    scanned_member_count: normalizedInspection.scanned_member_count,
    member_manifest_path: memberManifestPath,
    member_manifest_sha256: normalizedInspection.member_manifest_sha256,
    container_byte_verdict: normalizedInspection.container_byte_verdict,
    container_byte_finding_count: normalizedInspection.container_byte_finding_count,
    container_raw_uninspected_count: normalizedInspection.container_raw_uninspected_count,
    inspection_method: normalizedInspection.inspection_method,
    omitted_member_count: normalizedInspection.omitted_member_count,
    uninspected_archive_count: normalizedInspection.uninspected_archive_count,
    executed: true,
    authoritative: true,
    template: false,
  });
}

function expandedInspectionFromMemberManifest(manifest, rawBytes) {
  return Object.freeze({
    verdict: "PASS",
    source_sha: manifest.source_sha,
    source_tree: manifest.source_tree,
    build_manifest_sha256: manifest.build_manifest_sha256,
    runtime_mode: manifest.effective_runtime_mode,
    finding_count: 0,
    scanned_file_count: manifest.members.filter(({ type }) => type === "file").length,
    member_count: manifest.members.length,
    omitted_member_count: 0,
    uninspected_archive_count: 0,
    member_manifest: manifest,
    member_manifest_body: rawBytes.toString("utf8"),
    member_manifest_sha256: sha256(rawBytes),
  });
}

export async function validateDesktopArtifactPrivacyEvidence({
  receipt,
  artifact,
  artifactPath,
  artifactRoot,
  artifactPhysicalRoot,
  expectedRootName = null,
  buildManifest,
  corpus,
  repoRoot,
  displayBase = repoRoot,
  embeddedBuildManifestPath = null,
} = {}) {
  validateDesktopBuildManifest(buildManifest);
  const expectedBuildManifestSha256 = desktopBuildManifestSha256(buildManifest);
  const structuralOptions = {
    artifact,
    artifactRoot,
    artifactPhysicalRoot,
    expectedBuildManifestSha256,
    expectedSourceSha: buildManifest.source_sha,
    expectedSourceTree: buildManifest.source_tree,
    repoRoot,
  };
  validateRf13DistPrivacyMemberReceiptStructure(receipt, structuralOptions);
  let inspection;
  if (ARCHIVE_KINDS.has(artifact.kind)) {
    const { memberManifest, rawBytes } = readMemberManifest(receipt, structuralOptions);
    const expectedExpandedInspection = expandedInspectionFromMemberManifest(memberManifest, rawBytes);
    if (artifact.kind === "dmg_image") {
      inspection = await withRegularFileSnapshot(artifactPath, (snapshotPath, snapshotRecord) => inspectDmgSnapshot({
        snapshotPath,
        snapshotRecord,
        expectedRootName,
        expectedExpandedInspection,
        buildManifest,
        corpus,
        displayBase,
        embeddedBuildManifestPath,
      }));
    } else {
      inspection = await withRegularFileSnapshot(artifactPath, (snapshotPath, snapshotRecord) => inspectZipSnapshot({
        snapshotPath,
        snapshotRecord,
        artifactKind: artifact.kind,
        expectedRootName,
        expectedExpandedInspection,
        buildManifest,
        corpus,
        displayBase,
        embeddedBuildManifestPath,
      }));
    }
  } else if (artifact.kind === DESKTOP_ARTIFACT_EXPANDED_DIRECTORY_KIND) {
    const { memberManifest, rawBytes } = readMemberManifest(receipt, structuralOptions);
    const expectedExpandedInspection = expandedInspectionFromMemberManifest(memberManifest, rawBytes);
    inspection = await inspectExpandedDesktopArtifact({
      rootPath: artifactPath,
      buildManifest,
      corpus,
      displayBase,
      embeddedBuildManifestPath,
    });
    const descriptor = expandedDesktopArtifactDescriptor({ id: artifact.id, inspection });
    if (descriptor.sha256 !== artifact.sha256
      || descriptor.bytes !== artifact.bytes
      || inspection.member_manifest_body !== expectedExpandedInspection.member_manifest_body) {
      fail("PRIVACY_LIVE_EVIDENCE_MISMATCH", "expanded-directory privacy receipt does not match live member inspection");
    }
  } else {
    inspection = await inspectPlainDesktopArtifact({
      artifactPath,
      artifactKind: artifact.kind,
      buildManifest,
      corpus,
      displayBase,
    });
  }
  const recomputed = createRf13DistPrivacyMemberReceipt({
    receiptId: receipt.receipt_id,
    artifact,
    buildManifest,
    inspection,
    memberManifestPath: receipt.member_manifest_path,
  });
  if (JSON.stringify(recomputed) !== JSON.stringify(receipt)) {
    fail("PRIVACY_LIVE_EVIDENCE_MISMATCH", "privacy receipt does not match live artifact inspection");
  }
  return mintLiveValidation({
    artifact_id: artifact.id,
    artifact_kind: artifact.kind,
    artifact_sha256: artifact.sha256,
    artifact_bytes: artifact.bytes,
    source_sha: buildManifest.source_sha,
    source_tree: buildManifest.source_tree,
    build_manifest_sha256: expectedBuildManifestSha256,
    member_manifest_sha256: receipt.member_manifest_sha256,
    receipt_id: receipt.receipt_id,
    receipt_sha256: canonicalJsonSha256(receipt),
    strict_native_qa_receipt_sha256: null,
    inspection_method: receipt.inspection_method,
    verdict: "PASS",
  });
}

export function createWindowsInstallerPrivacyBuilderReceipt({
  receiptId,
  artifact,
  buildManifest,
  byteInspection,
  sourcePayloadInspection,
} = {}) {
  validateDesktopBuildManifest(buildManifest);
  trustedInspection(byteInspection, "installer container-byte inspection");
  trustedInspection(sourcePayloadInspection, "installer source-payload inspection");
  if (artifact?.id !== "windows_installer" || artifact.kind !== "nsis_installer"
    || byteInspection?.verdict !== "PASS"
    || byteInspection.artifact_sha256 !== artifact.sha256
    || byteInspection.artifact_bytes !== artifact.bytes
    || byteInspection.raw_uninspected_container_count !== 1
    || sourcePayloadInspection?.verdict !== "PASS"
    || sourcePayloadInspection.source_sha !== buildManifest.source_sha
    || sourcePayloadInspection.source_tree !== buildManifest.source_tree
    || sourcePayloadInspection.build_manifest_sha256 !== desktopBuildManifestSha256(buildManifest)
    || sourcePayloadInspection.runtime_mode !== "none") {
    fail("INSTALLER_BUILDER_INPUT_MISMATCH", "installer builder privacy evidence is not bound to clean source payload and container bytes");
  }
  return Object.freeze({
    schema_version: RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
    receipt_id: receiptId,
    gate: "privacy",
    status: "PENDING_NATIVE",
    source_sha: buildManifest.source_sha,
    source_tree: buildManifest.source_tree,
    artifact_id: "windows_installer",
    artifact_sha256: artifact.sha256,
    artifact_bytes: artifact.bytes,
    scan_method: "container_bytes_and_source_payload",
    finding_count: 0,
    source_payload_member_count: sourcePayloadInspection.member_count,
    omitted_member_count: 0,
    uninspected_archive_count: 1,
    source_payload_manifest_sha256: sourcePayloadInspection.member_manifest_sha256,
    native_completion_required: true,
    executed: true,
    authoritative: true,
    template: false,
  });
}

export function validateWindowsInstallerPrivacyBuilderReceiptStructure(receipt, {
  artifact,
  expectedSourceSha,
  expectedSourceTree,
} = {}) {
  exactKeys(receipt, [
    "schema_version", "receipt_id", "gate", "status", "source_sha", "source_tree",
    "artifact_id", "artifact_sha256", "artifact_bytes", "scan_method", "finding_count",
    "source_payload_member_count", "omitted_member_count", "uninspected_archive_count",
    "source_payload_manifest_sha256", "native_completion_required", "executed",
    "authoritative", "template",
  ], "Windows installer builder privacy receipt");
  if (receipt.schema_version !== RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA
    || receipt.gate !== "privacy"
    || receipt.status !== "PENDING_NATIVE"
    || receipt.source_sha !== expectedSourceSha
    || receipt.source_tree !== expectedSourceTree
    || receipt.artifact_id !== "windows_installer"
    || artifact?.id !== "windows_installer"
    || artifact?.kind !== "nsis_installer"
    || receipt.artifact_sha256 !== artifact.sha256
    || receipt.artifact_bytes !== artifact.bytes
    || receipt.scan_method !== "container_bytes_and_source_payload"
    || receipt.finding_count !== 0
    || !Number.isSafeInteger(receipt.source_payload_member_count)
    || receipt.source_payload_member_count < 1
    || receipt.omitted_member_count !== 0
    || receipt.uninspected_archive_count !== 1
    || receipt.native_completion_required !== true
    || receipt.executed !== true
    || receipt.authoritative !== true
    || receipt.template !== false) {
    fail("PRIVACY_INSTALLER_BUILDER_EVIDENCE_INVALID", "Windows installer privacy evidence must remain pending until native completion");
  }
  assertSafeId(receipt.receipt_id, "Windows installer builder privacy receipt id");
  assertSha1(receipt.source_sha, "Windows installer builder source SHA");
  assertSha1(receipt.source_tree, "Windows installer builder source tree");
  assertSha256(receipt.artifact_sha256, "Windows installer artifact sha256");
  assertSha256(receipt.source_payload_manifest_sha256, "Windows installer source payload manifest sha256");
  return receipt;
}

export function validateWindowsInstallerPrivacyBuilderReceipt(receipt, {
  artifact,
  buildManifest,
  byteInspection,
  sourcePayloadInspection,
} = {}) {
  validateDesktopBuildManifest(buildManifest);
  trustedInspection(byteInspection, "installer container-byte inspection");
  trustedInspection(sourcePayloadInspection, "installer source-payload inspection");
  validateWindowsInstallerPrivacyBuilderReceiptStructure(receipt, {
    artifact,
    expectedSourceSha: buildManifest.source_sha,
    expectedSourceTree: buildManifest.source_tree,
  });
  if (sourcePayloadInspection?.verdict !== "PASS"
    || sourcePayloadInspection.source_sha !== buildManifest.source_sha
    || sourcePayloadInspection.source_tree !== buildManifest.source_tree
    || sourcePayloadInspection.runtime_mode !== "none"
    || sourcePayloadInspection.member_manifest_sha256 !== receipt.source_payload_manifest_sha256
    || sourcePayloadInspection.member_count !== receipt.source_payload_member_count
    || byteInspection.artifact_sha256 !== receipt.artifact_sha256
    || byteInspection.artifact_bytes !== receipt.artifact_bytes
    || byteInspection.raw_uninspected_container_count !== 1) {
    fail("INSTALLER_SOURCE_PAYLOAD_MISMATCH", "installer builder receipt does not match the inspected win-unpacked payload");
  }
  return receipt;
}

export async function validateWindowsInstallerPrivacyBuilderEvidence({
  receipt,
  artifact,
  artifactPath,
  buildManifest,
  sourcePayloadPath,
  corpus,
  displayBase = process.cwd(),
  embeddedBuildManifestPath = null,
} = {}) {
  const [byteInspection, sourcePayloadInspection] = await Promise.all([
    inspectDesktopArtifactBytes({ artifactPath, artifactKind: "nsis_installer", corpus, displayBase }),
    inspectExpandedDesktopArtifact({
      rootPath: sourcePayloadPath,
      buildManifest,
      corpus,
      displayBase,
      embeddedBuildManifestPath,
    }),
  ]);
  validateWindowsInstallerPrivacyBuilderReceipt(receipt, {
    artifact,
    buildManifest,
    byteInspection,
    sourcePayloadInspection,
  });
  return mintLiveValidation({
    artifact_id: artifact.id,
    artifact_kind: artifact.kind,
    artifact_sha256: artifact.sha256,
    artifact_bytes: artifact.bytes,
    source_sha: buildManifest.source_sha,
    source_tree: buildManifest.source_tree,
    build_manifest_sha256: desktopBuildManifestSha256(buildManifest),
    member_manifest_sha256: receipt.source_payload_manifest_sha256,
    receipt_id: receipt.receipt_id,
    receipt_sha256: canonicalJsonSha256(receipt),
    strict_native_qa_receipt_sha256: null,
    inspection_method: "container_bytes_and_source_payload",
    verdict: "PENDING_NATIVE",
  });
}

function referenceFromReceiptPath(repoRoot, filePath, expectedSchema, expectedBasename, label) {
  if (!path.isAbsolute(repoRoot ?? "") || !path.isAbsolute(filePath ?? "")) {
    fail("UNSAFE_EVIDENCE_PATH", `${label} path and repository root must be absolute`);
  }
  let metadata;
  try {
    metadata = lstatSync(filePath);
  } catch {
    fail("EVIDENCE_FILE_MISSING", `${label} is missing`);
  }
  if (!metadata.isFile() || metadata.isSymbolicLink()) {
    fail("UNSAFE_EVIDENCE_FILE", `${label} must be a regular non-symlink file`);
  }
  const relative = path.relative(realpathSync(repoRoot), realpathSync(filePath));
  const absolute = safeRepoFile(repoRoot, relative.split(path.sep).join("/"));
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(absolute, "utf8"));
  } catch {
    fail("EVIDENCE_JSON_INVALID", `${label} must be readable JSON`);
  }
  if (receipt?.schema_version !== expectedSchema || path.basename(absolute) !== expectedBasename) {
    fail("EVIDENCE_SCHEMA_MISMATCH", `${label} schema or canonical basename is invalid`);
  }
  assertSafeId(receipt.receipt_id, `${label} receipt id`);
  const reference = canonicalReference(repoRoot, absolute, receipt);
  return Object.freeze({
    reference,
    ...readCanonicalReference(reference, { repoRoot, expectedSchema, expectedBasename, label }),
  });
}

function validateStrictNativeQa(reference, {
  repoRoot,
  artifact,
  expectedSourceSha,
  expectedSourceTree,
  now,
}) {
  const strict = readCanonicalReference(reference, {
    repoRoot,
    expectedSchema: WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
    expectedBasename: "rfd-tuw-013-windows-native-qa.json",
    label: "strict RFD-TUW-013 native QA receipt",
  });
  let validated;
  try {
    validated = readValidatedWindowsNativeQaPassReceipt({
      receiptPath: strict.absolute,
      repoRoot,
      ...(now === undefined ? {} : { now }),
    });
  } catch (error) {
    fail("STRICT_NATIVE_QA_INVALID", "strict RFD-TUW-013 native QA receipt did not validate", {
      validator_code: error?.code ?? "unknown",
    });
  }
  const { result, validationOptions } = validated;
  if (JSON.stringify(validated.reference) !== JSON.stringify(reference)
    || JSON.stringify(validated.receipt) !== JSON.stringify(strict.receipt)) {
    fail("STRICT_NATIVE_QA_REFERENCE_MISMATCH", "strict RFD-TUW-013 native QA reference does not match its canonical current-repository receipt");
  }
  if (result?.native_qa !== "PASS"
    || result.authoritative_execution !== true
    || result.source_sha !== expectedSourceSha
    || result.installer_sha256 !== artifact.sha256
    || validationOptions.expectedSourceSha !== expectedSourceSha
    || validationOptions.expectedSourceTree !== expectedSourceTree
    || validationOptions.expectedInstallerSha256 !== artifact.sha256) {
    fail("STRICT_NATIVE_QA_INVALID", "strict RFD-TUW-013 native QA result is not authoritative or artifact bound");
  }
  return Object.freeze({ ...strict, result, validationOptions });
}

function validateCanonicalReferenceShape(reference, { expectedSchema, expectedBasename, label }) {
  exactKeys(reference, ["path", "sha256", "bytes", "schema_version", "receipt_id"], `${label} reference`);
  assertSha256(reference.sha256, `${label} reference sha256`);
  assertSafeId(reference.receipt_id, `${label} reference receipt id`);
  if (!Number.isSafeInteger(reference.bytes) || reference.bytes < 1
    || reference.schema_version !== expectedSchema
    || path.posix.basename(reference.path) !== expectedBasename) {
    fail("EVIDENCE_REFERENCE_INVALID", `${label} reference is invalid`);
  }
}

export function validateWindowsInstallerPrivacyNativeReceiptStructure(receipt, {
  artifact,
  builderReceipt,
  expectedSourceSha,
  expectedSourceTree,
} = {}) {
  exactKeys(receipt, [
    "schema_version", "receipt_id", "gate", "status", "source_sha", "source_tree",
    "artifact_id", "installer_sha256", "builder_receipt", "native_qa_receipt",
    "source_payload_manifest_sha256", "source_payload_member_count",
    "installed_root_member_manifest_sha256", "installed_root_member_count", "scan_method",
    "finding_count", "omitted_member_count", "uninspected_archive_count",
    "uninstall_residue_count", "executed", "authoritative", "template",
  ], "Windows installer native privacy receipt");
  validateCanonicalReferenceShape(receipt.builder_receipt, {
    expectedSchema: RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
    expectedBasename: `${path.posix.basename(receipt.builder_receipt?.path ?? "", ".privacy-builder.json")}.privacy-builder.json`,
    label: "Windows installer builder privacy receipt",
  });
  if (!receipt.builder_receipt.path.endsWith(".exe.privacy-builder.json")) {
    fail("EVIDENCE_REFERENCE_INVALID", "Windows installer builder privacy receipt path must be the installer sidecar");
  }
  validateCanonicalReferenceShape(receipt.native_qa_receipt, {
    expectedSchema: WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
    expectedBasename: "rfd-tuw-013-windows-native-qa.json",
    label: "strict RFD-TUW-013 native QA receipt",
  });
  if (receipt.schema_version !== RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA
    || receipt.gate !== "windows_installer_privacy_completion"
    || receipt.status !== "PASS"
    || receipt.source_sha !== expectedSourceSha
    || receipt.source_tree !== expectedSourceTree
    || receipt.artifact_id !== "windows_installer"
    || artifact?.id !== "windows_installer"
    || artifact?.kind !== "nsis_installer"
    || receipt.installer_sha256 !== artifact.sha256
    || builderReceipt?.status !== "PENDING_NATIVE"
    || builderReceipt.artifact_sha256 !== artifact.sha256
    || builderReceipt.artifact_bytes !== artifact.bytes
    || receipt.builder_receipt.schema_version !== builderReceipt.schema_version
    || receipt.builder_receipt.receipt_id !== builderReceipt.receipt_id
    || receipt.source_payload_manifest_sha256 !== builderReceipt.source_payload_manifest_sha256
    || receipt.source_payload_member_count !== builderReceipt.source_payload_member_count
    || !Number.isSafeInteger(receipt.installed_root_member_count)
    || receipt.installed_root_member_count < 1
    || receipt.scan_method !== "native_installed_tree_shared_corpus"
    || receipt.finding_count !== 0
    || receipt.omitted_member_count !== 0
    || receipt.uninspected_archive_count !== 0
    || receipt.uninstall_residue_count !== 0
    || receipt.executed !== true
    || receipt.authoritative !== true
    || receipt.template !== false) {
    fail("PRIVACY_INSTALLER_NATIVE_EVIDENCE_INVALID", "Windows installer native privacy evidence is incomplete or not strictly bound");
  }
  assertSafeId(receipt.receipt_id, "Windows installer native privacy receipt id");
  assertSha1(receipt.source_sha, "Windows installer native source SHA");
  assertSha1(receipt.source_tree, "Windows installer native source tree");
  assertSha256(receipt.installer_sha256, "Windows installer native artifact sha256");
  assertSha256(receipt.source_payload_manifest_sha256, "Windows installer source payload manifest sha256");
  assertSha256(receipt.installed_root_member_manifest_sha256, "Windows installer installed-root manifest sha256");
  return receipt;
}

export function createWindowsInstallerNativePrivacyReceipt({
  receiptId,
  artifact,
  builderReceiptPath,
  installedRootInspection,
  nativeQaReceiptPath,
  now,
  repoRoot,
  uninstallResidueCount = 0,
} = {}) {
  trustedInspection(installedRootInspection, "native installed-root privacy inspection");
  const builder = referenceFromReceiptPath(
    repoRoot,
    builderReceiptPath,
    RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
    path.basename(builderReceiptPath ?? ""),
    "Windows installer builder privacy receipt",
  );
  if (!builder.reference.path.endsWith(".exe.privacy-builder.json")) {
    fail("EVIDENCE_REFERENCE_INVALID", "Windows installer builder privacy receipt must be the canonical installer sidecar");
  }
  validateWindowsInstallerPrivacyBuilderReceiptStructure(builder.receipt, {
    artifact,
    expectedSourceSha: installedRootInspection.source_sha,
    expectedSourceTree: installedRootInspection.source_tree,
  });
  const nativeQa = referenceFromReceiptPath(
    repoRoot,
    nativeQaReceiptPath,
    WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
    "rfd-tuw-013-windows-native-qa.json",
    "strict RFD-TUW-013 native QA receipt",
  );
  validateStrictNativeQa(nativeQa.reference, {
    repoRoot,
    artifact,
    expectedSourceSha: builder.receipt.source_sha,
    expectedSourceTree: builder.receipt.source_tree,
    now,
  });
  if (installedRootInspection.verdict !== "PASS"
    || installedRootInspection.source_sha !== builder.receipt.source_sha
    || installedRootInspection.source_tree !== builder.receipt.source_tree
    || installedRootInspection.runtime_mode !== "none"
    || uninstallResidueCount !== 0) {
    fail("INSTALLER_NATIVE_INPUT_MISMATCH", "native installer privacy completion inputs are incomplete or mismatched");
  }
  const receipt = Object.freeze({
    schema_version: RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA,
    receipt_id: receiptId,
    gate: "windows_installer_privacy_completion",
    status: "PASS",
    source_sha: builder.receipt.source_sha,
    source_tree: builder.receipt.source_tree,
    artifact_id: "windows_installer",
    installer_sha256: artifact.sha256,
    builder_receipt: builder.reference,
    native_qa_receipt: nativeQa.reference,
    source_payload_manifest_sha256: builder.receipt.source_payload_manifest_sha256,
    source_payload_member_count: builder.receipt.source_payload_member_count,
    installed_root_member_manifest_sha256: installedRootInspection.member_manifest_sha256,
    installed_root_member_count: installedRootInspection.member_count,
    scan_method: "native_installed_tree_shared_corpus",
    finding_count: 0,
    omitted_member_count: 0,
    uninspected_archive_count: 0,
    uninstall_residue_count: 0,
    executed: true,
    authoritative: true,
    template: false,
  });
  validateWindowsInstallerPrivacyNativeReceiptStructure(receipt, {
    artifact,
    builderReceipt: builder.receipt,
    expectedSourceSha: builder.receipt.source_sha,
    expectedSourceTree: builder.receipt.source_tree,
  });
  return receipt;
}

export function validateWindowsInstallerNativePrivacyReceipt(receipt, {
  artifact,
  builderReceipt,
  expectedSourceSha,
  expectedSourceTree,
  validation,
} = {}) {
  validateWindowsInstallerPrivacyNativeReceiptStructure(receipt, {
    artifact,
    builderReceipt,
    expectedSourceSha,
    expectedSourceTree,
  });
  assertDesktopArtifactPrivacyValidation(validation, {
    artifact_id: artifact?.id,
    artifact_kind: artifact?.kind,
    artifact_sha256: artifact?.sha256,
    artifact_bytes: artifact?.bytes,
    source_sha: expectedSourceSha,
    source_tree: expectedSourceTree,
    member_manifest_sha256: receipt.installed_root_member_manifest_sha256,
    receipt_id: receipt.receipt_id,
    receipt_sha256: canonicalJsonSha256(receipt),
    strict_native_qa_receipt_sha256: receipt.native_qa_receipt.sha256,
    verdict: "PASS",
  });
  return receipt;
}

export function validateWindowsInstallerNativePrivacyEvidence({
  receipt,
  artifact,
  repoRoot,
  installedRootInspection,
  builderValidation,
  now,
} = {}) {
  trustedInspection(installedRootInspection, "native installed-root privacy inspection");
  const builder = readCanonicalReference(receipt.builder_receipt, {
    repoRoot,
    expectedSchema: RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
    expectedBasename: path.posix.basename(receipt.builder_receipt?.path ?? ""),
    label: "Windows installer builder privacy receipt",
  });
  validateWindowsInstallerPrivacyBuilderReceiptStructure(builder.receipt, {
    artifact,
    expectedSourceSha: receipt.source_sha,
    expectedSourceTree: receipt.source_tree,
  });
  assertDesktopArtifactPrivacyValidation(builderValidation, {
    artifact_id: artifact.id,
    artifact_kind: artifact.kind,
    artifact_sha256: artifact.sha256,
    artifact_bytes: artifact.bytes,
    source_sha: receipt.source_sha,
    source_tree: receipt.source_tree,
    member_manifest_sha256: builder.receipt.source_payload_manifest_sha256,
    receipt_id: builder.receipt.receipt_id,
    receipt_sha256: canonicalJsonSha256(builder.receipt),
    verdict: "PENDING_NATIVE",
  });
  validateStrictNativeQa(receipt.native_qa_receipt, {
    repoRoot,
    artifact,
    expectedSourceSha: receipt.source_sha,
    expectedSourceTree: receipt.source_tree,
    now,
  });
  validateWindowsInstallerPrivacyNativeReceiptStructure(receipt, {
    artifact,
    builderReceipt: builder.receipt,
    expectedSourceSha: receipt.source_sha,
    expectedSourceTree: receipt.source_tree,
  });
  if (installedRootInspection.verdict !== "PASS"
    || installedRootInspection.source_sha !== receipt.source_sha
    || installedRootInspection.source_tree !== receipt.source_tree
    || installedRootInspection.runtime_mode !== "none"
    || installedRootInspection.member_manifest_sha256 !== receipt.installed_root_member_manifest_sha256
    || installedRootInspection.member_count !== receipt.installed_root_member_count) {
    fail("INSTALLER_INSTALLED_ROOT_MISMATCH", "native privacy receipt does not match the inspected installed tree");
  }
  return mintLiveValidation({
    artifact_id: artifact.id,
    artifact_kind: artifact.kind,
    artifact_sha256: artifact.sha256,
    artifact_bytes: artifact.bytes,
    source_sha: receipt.source_sha,
    source_tree: receipt.source_tree,
    build_manifest_sha256: builderValidation.build_manifest_sha256,
    member_manifest_sha256: receipt.installed_root_member_manifest_sha256,
    receipt_id: receipt.receipt_id,
    receipt_sha256: canonicalJsonSha256(receipt),
    strict_native_qa_receipt_sha256: receipt.native_qa_receipt.sha256,
    builder_receipt_sha256: receipt.builder_receipt.sha256,
    inspection_method: receipt.scan_method,
    verdict: "PASS",
  });
}

export async function writeDesktopArtifactPrivacyJson(filePath, value) {
  const body = `${JSON.stringify(value, null, 2)}\n`;
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, body, "utf8");
  return Object.freeze({ path: filePath, sha256: sha256(Buffer.from(body, "utf8")), bytes: Buffer.byteLength(body) });
}
