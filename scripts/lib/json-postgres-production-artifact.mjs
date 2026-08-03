import { execFileSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  fchmodSync,
  fstatSync,
  fsyncSync,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  rmdirSync,
  statSync,
  writeSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  parsePrivateStagingGitTree,
  privateStagingArtifactSourcePathAllowed,
} from "./private-staging-artifact.mjs";
import { validatePngBytes } from "./profile-photo-png.mjs";
import {
  PROFILE_PHOTO_EXPECTED_COUNT,
  PROFILE_PHOTO_MANIFEST_SCHEMA_VERSION,
  validateProfilePhotoManifest,
} from "../validate-profile-photo-replacement-manifest.mjs";

const FORBIDDEN_ARCHIVE_ENTRY =
  /(^|\/)(\.env(?:\.|$)|\.git|artifacts|workbook)(\/|$)|\.(?:pem|key|p12|pfx|sqlite|sqlite3|db)$/iu;
const FIRST_PARTY_TEST_ENTRY = /(^|\/)(?:test|tests|__tests__)(\/|$)/iu;
const REAL_IDENTITY_MARKER =
  /@amic\.(?:kr|law)|\b(?:user|emp)_amic_[a-z0-9_]+\b/iu;
const PRIVATE_STAGING_SOURCE = /(^|\/)(?:private-staging[^/]*|[^/]*private-staging[^/]*)(?:\/|$)/iu;
const SHA256 = /^[a-f0-9]{64}$/u;
const PROFILE_PHOTO_GENERATION_REF = /^profile_generation_[a-f0-9]{32}$/u;
const PROFILE_PHOTO_ARCHIVE_ENTRY = /^apps\/api\/src\/hrx-member-photos\/[a-f0-9]{64}\.png$/u;
const PROFILE_PHOTO_BUNDLE_BYTES = new WeakMap();
const PROFILE_PHOTO_MANIFEST_MAX_BYTES = 1024 * 1024;
const PROFILE_PHOTO_FILE_MAX_BYTES = 25 * 1024 * 1024;
const PROFILE_PHOTO_EXTERNAL_AGGREGATE_MAX_BYTES = 25 * 1024 * 1024;
const PRODUCTION_OUTPUT_ARCHIVE_MAX_BYTES = 50 * 1024 * 1024;
const PRODUCTION_OUTPUT_MANIFEST_MAX_BYTES = 1024 * 1024;
const PRODUCTION_OUTPUT_CONTROL_MAX_BYTES = 16 * 1024;
const PRODUCTION_OUTPUT_TRANSACTION_PREFIX = ".lawos-production-output-";
const PRODUCTION_OUTPUT_TRANSACTION_PATTERN =
  /^\.lawos-production-output-[a-f0-9]{32}(?:\.recovering-[a-f0-9]{64})?$/u;
const PRODUCTION_OUTPUT_LOCK_NAME = ".lawos-production-output.lock";
const PRODUCTION_OUTPUT_LOCK_RECOVERY_PATTERN =
  /^\.lawos-production-output\.lock\.recovering-[a-f0-9]{64}$/u;
const PRODUCTION_OUTPUT_LOCK_PENDING_PATTERN =
  /^\.lawos-production-output\.lock\.pending-[a-f0-9]{64}$/u;
const PRODUCTION_OUTPUT_OWNER_NAME = ".transaction-owner.json";
const PRODUCTION_OUTPUT_JOURNAL_NAME = ".recovery-journal.json";
const PRODUCTION_OUTPUT_COMMIT_NAME = ".publication-committed.json";
const PRODUCTION_OUTPUT_CLEANUP_NAME = ".cleanup-ready.json";
const PRODUCTION_OUTPUT_PUBLICATION_DIRECTORY = "publication";
const PRODUCTION_OUTPUT_BUILD_DIRECTORY = "private-build-staging";
const PRODUCTION_OUTPUT_LOCK_SCHEMA = "law-firm-os.production-output-lock.v1";
const PRODUCTION_OUTPUT_OWNER_SCHEMA = "law-firm-os.production-output-owner.v1";
const PRODUCTION_OUTPUT_JOURNAL_SCHEMA = "law-firm-os.production-output-recovery.v1";
const PRODUCTION_OUTPUT_COMMIT_SCHEMA = "law-firm-os.production-output-commit.v1";
const PRODUCTION_OUTPUT_CLEANUP_SCHEMA = "law-firm-os.production-output-cleanup.v1";

export const JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA =
  "law-firm-os.json-postgres-production-artifact.v2";
export const JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_SCHEMA =
  "law-firm-os.profile-photo-artifact-metadata.v1";
export const JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY =
  "apps/api/src/hrx-member-photo-artifact-metadata.json";
export const JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY =
  "apps/api/src/hrx-member-photos";

export const JSON_POSTGRES_PRODUCTION_SOURCE_OVERRIDES = Object.freeze([
  Object.freeze({
    source_path: "packages/master-data/src/production-client-candidates.js",
    target_path: "packages/master-data/src/amic-client-candidates.js",
    purpose: "real-clients-loaded-from-approved-postgres-migration-only",
  }),
  Object.freeze({
    source_path: "apps/api/src/production-lawos-role-registry.js",
    target_path: "apps/api/src/lawos-role-registry.js",
    purpose: "roles-loaded-from-postgres-identity-membership-only",
  }),
]);

export const JSON_POSTGRES_PRODUCTION_REDACTION_TARGETS = Object.freeze([
  "apps/api/src/lambda.js",
  "apps/api/src/outlook-addin-runtime-context.js",
  "packages/matter/src/worktree-template-model.js",
]);

export const JSON_POSTGRES_PRODUCTION_PUBLIC_PROFILE_CATALOG_ENTRY =
  "apps/api/src/hrx-public-professional-profile-catalog.json";

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new TypeError(`${label} fields are invalid`);
  }
}

function allowedKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).some((key) => !keys.includes(key))) {
    throw new TypeError(`${label} fields are invalid`);
  }
}

function canonicalDirectory(path, label) {
  const target = requiredText(path, label);
  try {
    if (!isAbsolute(target) || resolve(target) !== target
      || lstatSync(target).isSymbolicLink() || !statSync(target).isDirectory()
      || realpathSync(target) !== target) throw new Error();
  } catch {
    throw new TypeError(`${label} must be a canonical non-symlink directory`);
  }
  return target;
}

function pinnedFileError(label) {
  const error = new TypeError(
    `${label} must be a descriptor-pinned canonical non-symlink regular file`,
  );
  error.code = "PROFILE_PHOTO_PINNED_FILE_INVALID";
  return error;
}

function samePinnedFileSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mode === right.mode
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function pinnedDirectoryIdentity(path, label) {
  const target = canonicalDirectory(path, label);
  try {
    const snapshot = lstatSync(target, { bigint: true });
    if (snapshot.isSymbolicLink() || !snapshot.isDirectory()
      || realpathSync(target) !== target) throw new Error();
    return Object.freeze({
      path: target,
      dev: snapshot.dev,
      ino: snapshot.ino,
      size: snapshot.size,
      mode: snapshot.mode,
      mtimeNs: snapshot.mtimeNs,
      ctimeNs: snapshot.ctimeNs,
    });
  } catch {
    throw new TypeError(`${label} identity is invalid`);
  }
}

function assertPinnedDirectoryIdentity(identity, label) {
  try {
    const current = lstatSync(identity.path, { bigint: true });
    if (current.isSymbolicLink() || !current.isDirectory()
      || current.dev !== identity.dev || current.ino !== identity.ino
      || current.size !== identity.size || current.mode !== identity.mode
      || current.mtimeNs !== identity.mtimeNs || current.ctimeNs !== identity.ctimeNs
      || realpathSync(identity.path) !== identity.path) {
      throw new Error();
    }
  } catch {
    throw new TypeError(`${label} identity drifted`);
  }
}

function inspectPinnedRegularFile(path, label, {
  ownerOnly = false,
  maxBytes,
  beforeOpen,
  parentIdentity = null,
  durable = false,
} = {}) {
  const target = requiredText(path, label);
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new TypeError(`${label} size boundary is invalid`);
  }
  let descriptor = null;
  try {
    if (!isAbsolute(target) || resolve(target) !== target
      || !Number.isInteger(constants.O_NOFOLLOW)) throw new Error();
    if (parentIdentity) assertPinnedDirectoryIdentity(parentIdentity, `${label} parent`);
    const parentBefore = lstatSync(dirname(target), { bigint: true });
    const before = lstatSync(target, { bigint: true });
    if (parentBefore.isSymbolicLink() || !parentBefore.isDirectory()
      || before.isSymbolicLink() || !before.isFile()
      || before.size < 1n || before.size > BigInt(maxBytes)
      || (ownerOnly && (before.mode & 0o77n) !== 0n)
      || realpathSync(target) !== target) throw new Error();
    beforeOpen?.({ path: target, label });
    descriptor = openSync(target, constants.O_RDONLY | constants.O_NOFOLLOW);
    const opened = fstatSync(descriptor, { bigint: true });
    const parentOpened = lstatSync(dirname(target), { bigint: true });
    if (!opened.isFile() || !samePinnedFileSnapshot(before, opened)
      || parentOpened.isSymbolicLink() || !parentOpened.isDirectory()
      || !samePinnedFileSnapshot(parentBefore, parentOpened)) throw new Error();
    if (parentIdentity) assertPinnedDirectoryIdentity(parentIdentity, `${label} parent`);

    const bytes = Buffer.allocUnsafe(Number(opened.size));
    let offset = 0;
    while (offset < bytes.byteLength) {
      const count = readSync(descriptor, bytes, offset, bytes.byteLength - offset, null);
      if (count === 0) throw new Error();
      offset += count;
    }
    if (readSync(descriptor, Buffer.allocUnsafe(1), 0, 1, null) !== 0) throw new Error();
    if (durable) fsyncSync(descriptor);

    const after = fstatSync(descriptor, { bigint: true });
    const current = lstatSync(target, { bigint: true });
    const parentAfter = lstatSync(dirname(target), { bigint: true });
    if (!after.isFile() || current.isSymbolicLink() || !current.isFile()
      || !samePinnedFileSnapshot(opened, after)
      || !samePinnedFileSnapshot(after, current)
      || after.size !== BigInt(bytes.byteLength)
      || parentAfter.isSymbolicLink() || !parentAfter.isDirectory()
      || !samePinnedFileSnapshot(parentBefore, parentAfter)
      || realpathSync(target) !== target) throw new Error();
    if (parentIdentity) assertPinnedDirectoryIdentity(parentIdentity, `${label} parent`);
    return Object.freeze({ bytes, snapshot: after });
  } catch {
    throw pinnedFileError(label);
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function readPinnedRegularFile(path, label, options) {
  return inspectPinnedRegularFile(path, label, options).bytes;
}

function snapshotStagingEntries(root) {
  const entries = new Set();
  function visit(relativePath = "") {
    const directory = relativePath ? join(root, relativePath) : root;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const child = relativePath ? join(relativePath, entry.name) : entry.name;
      entries.add(child);
      if (entry.isDirectory() && !entry.isSymbolicLink()) visit(child);
    }
  }
  visit();
  return entries;
}

function removeNewStagingEntries(root, baseline) {
  const current = [...snapshotStagingEntries(root)]
    .sort((left, right) => right.split(sep).length - left.split(sep).length);
  for (const path of current) {
    if (!baseline.has(path)) rmSync(join(root, path), { recursive: true, force: true });
  }
}

function assertOutsideRepository(repositoryRoot, target, label) {
  const root = canonicalDirectory(repositoryRoot, "repository root");
  const rel = relative(root, target);
  if (rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel))) {
    throw new TypeError(`${label} must remain outside the repository worktree`);
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function generationRefForManifestSha(manifestSha256) {
  if (!SHA256.test(manifestSha256)) throw new TypeError("private profile-photo manifest digest is invalid");
  return `profile_generation_${manifestSha256.slice(0, 32)}`;
}

export function validateJsonPostgresProductionProfilePhotoMetadata(metadata) {
  exactKeys(metadata, [
    "schema_version",
    "generation_ref",
    "private_manifest_schema_version",
    "private_manifest_sha256",
    "private_manifest_entry_count",
    "injected_photo_entry_count",
    "git_source_photo_entry_count",
  ], "production profile-photo metadata");
  if (metadata.schema_version !== JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_SCHEMA
    || metadata.private_manifest_schema_version !== PROFILE_PHOTO_MANIFEST_SCHEMA_VERSION
    || !SHA256.test(metadata.private_manifest_sha256)
    || !PROFILE_PHOTO_GENERATION_REF.test(metadata.generation_ref)
    || metadata.generation_ref !== generationRefForManifestSha(metadata.private_manifest_sha256)
    || metadata.private_manifest_entry_count !== PROFILE_PHOTO_EXPECTED_COUNT
    || metadata.injected_photo_entry_count !== PROFILE_PHOTO_EXPECTED_COUNT
    || metadata.git_source_photo_entry_count !== 0) {
    throw new Error("production profile-photo metadata binding is invalid");
  }
  return Object.freeze({ ...metadata });
}

export function validateJsonPostgresProductionProfilePhotoArtifactBinding(binding) {
  exactKeys(binding, [
    "metadata_path",
    "metadata_schema_version",
    "metadata_sha256",
    "generation_ref",
    "private_manifest_schema_version",
    "private_manifest_sha256",
    "private_manifest_entry_count",
    "injected_photo_entry_count",
    "git_source_photo_entry_count",
  ], "production profile-photo artifact binding");
  const metadata = validateJsonPostgresProductionProfilePhotoMetadata({
    schema_version: binding.metadata_schema_version,
    generation_ref: binding.generation_ref,
    private_manifest_schema_version: binding.private_manifest_schema_version,
    private_manifest_sha256: binding.private_manifest_sha256,
    private_manifest_entry_count: binding.private_manifest_entry_count,
    injected_photo_entry_count: binding.injected_photo_entry_count,
    git_source_photo_entry_count: binding.git_source_photo_entry_count,
  });
  if (binding.metadata_path !== JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY
    || !SHA256.test(binding.metadata_sha256)) {
    throw new Error("production profile-photo artifact binding is invalid");
  }
  return Object.freeze({
    metadata_path: binding.metadata_path,
    metadata_schema_version: metadata.schema_version,
    metadata_sha256: binding.metadata_sha256,
    generation_ref: metadata.generation_ref,
    private_manifest_schema_version: metadata.private_manifest_schema_version,
    private_manifest_sha256: metadata.private_manifest_sha256,
    private_manifest_entry_count: metadata.private_manifest_entry_count,
    injected_photo_entry_count: metadata.injected_photo_entry_count,
    git_source_photo_entry_count: metadata.git_source_photo_entry_count,
  });
}

export function loadJsonPostgresProductionProfilePhotoBundle({
  directory,
  manifestPath,
  repositoryRoot,
  io,
} = {}) {
  const canonicalPhotoDirectory = canonicalDirectory(directory, "private profile-photo directory");
  const photoDirectoryIdentity = pinnedDirectoryIdentity(
    canonicalPhotoDirectory,
    "private profile-photo directory",
  );
  if (io !== undefined) allowedKeys(io, ["beforeOpen"], "private profile-photo loader I/O");
  if (io?.beforeOpen !== undefined && typeof io.beforeOpen !== "function") {
    throw new TypeError("private profile-photo loader I/O is invalid");
  }
  const canonicalManifestPath = requiredText(manifestPath, "private profile-photo manifest");
  assertOutsideRepository(repositoryRoot, canonicalPhotoDirectory, "private profile-photo directory");
  assertOutsideRepository(repositoryRoot, canonicalManifestPath, "private profile-photo manifest");

  const manifestBytes = readPinnedRegularFile(
    canonicalManifestPath,
    "private profile-photo manifest",
    {
      ownerOnly: true,
      maxBytes: PROFILE_PHOTO_MANIFEST_MAX_BYTES,
      beforeOpen: io?.beforeOpen,
    },
  );
  let manifest;
  try {
    manifest = validateProfilePhotoManifest(JSON.parse(manifestBytes.toString("utf8")));
  } catch (error) {
    if (error?.name === "ProfilePhotoManifestValidationError") throw error;
    throw new Error("private profile-photo manifest is not valid JSON");
  }
  let directoryEntries;
  try {
    directoryEntries = readdirSync(canonicalPhotoDirectory, { withFileTypes: true });
    assertPinnedDirectoryIdentity(photoDirectoryIdentity, "private profile-photo directory");
  } catch {
    throw new Error("private profile-photo directory could not be read without identity drift");
  }
  if (directoryEntries.length !== PROFILE_PHOTO_EXPECTED_COUNT) {
    throw new Error("private profile-photo directory must contain exactly ten entries");
  }
  if (directoryEntries.some((entry) => entry.isSymbolicLink() || !entry.isFile())) {
    throw new Error("private profile-photo input must contain regular non-symlink files");
  }
  const filenames = directoryEntries.map((entry) => entry.name).sort();
  const expectedNames = manifest.entries.map((entry) => entry.filename).sort();
  if (JSON.stringify(filenames) !== JSON.stringify(expectedNames)) {
    throw new Error("private profile-photo directory does not match the manifest filename set");
  }
  const expectedByName = new Map(manifest.entries.map((entry) => [entry.filename, entry]));
  let externalAggregateBytes = 0;
  const observedEntries = filenames.map((filename) => {
    const expected = expectedByName.get(filename);
    const remainingAggregateBytes =
      PROFILE_PHOTO_EXTERNAL_AGGREGATE_MAX_BYTES - externalAggregateBytes;
    if (!expected || remainingAggregateBytes < 1) {
      throw new Error("private profile-photo bundle exceeds the aggregate byte limit");
    }
    const sourcePath = join(canonicalPhotoDirectory, filename);
    let bytes;
    try {
      bytes = readPinnedRegularFile(sourcePath, "private profile-photo file", {
        maxBytes: Math.min(
          PROFILE_PHOTO_FILE_MAX_BYTES,
          remainingAggregateBytes,
        ),
        beforeOpen: io?.beforeOpen,
        parentIdentity: photoDirectoryIdentity,
      });
      validatePngBytes(bytes);
    } catch (error) {
      if (error?.name === "ProfilePhotoPngError") throw error;
      if (error?.code === "PROFILE_PHOTO_PINNED_FILE_INVALID") throw error;
      throw new Error("private profile-photo input must contain regular non-symlink PNG files");
    }
    externalAggregateBytes += bytes.byteLength;
    return {
      filename,
      expected_content_sha256: expected.content_sha256,
      observed_content_sha256: sha256(bytes),
      bytes,
    };
  });
  if (new Set(observedEntries.map((entry) => entry.observed_content_sha256)).size
    !== PROFILE_PHOTO_EXPECTED_COUNT) {
    throw new Error("private profile-photo bundle must contain distinct PNG content");
  }
  const privateEntries = observedEntries.map((entry) => {
    if (entry.observed_content_sha256 !== entry.expected_content_sha256) {
      throw new Error("private profile-photo bundle content hash mismatch");
    }
    return Object.freeze({
      filename: entry.filename,
      content_sha256: entry.expected_content_sha256,
      bytes: entry.bytes,
    });
  });
  const finalNames = readdirSync(canonicalPhotoDirectory).sort();
  assertPinnedDirectoryIdentity(photoDirectoryIdentity, "private profile-photo directory");
  if (JSON.stringify(finalNames) !== JSON.stringify(expectedNames)) {
    throw new Error("private profile-photo directory entry set drifted during validation");
  }
  const privateManifestSha256 = sha256(manifestBytes);
  const metadata = validateJsonPostgresProductionProfilePhotoMetadata({
    schema_version: JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_SCHEMA,
    generation_ref: generationRefForManifestSha(privateManifestSha256),
    private_manifest_schema_version: PROFILE_PHOTO_MANIFEST_SCHEMA_VERSION,
    private_manifest_sha256: privateManifestSha256,
    private_manifest_entry_count: manifest.entries.length,
    injected_photo_entry_count: privateEntries.length,
    git_source_photo_entry_count: 0,
  });
  const bundle = Object.freeze({ metadata });
  PROFILE_PHOTO_BUNDLE_BYTES.set(bundle, privateEntries);
  return bundle;
}

export function materializeJsonPostgresProductionProfilePhotoBundle({ bundle, stagingRoot, io } = {}) {
  const privateEntries = PROFILE_PHOTO_BUNDLE_BYTES.get(bundle);
  if (!privateEntries) throw new TypeError("validated private profile-photo bundle is required");
  if (io !== undefined) {
    allowedKeys(io, ["writeFileSync", "beforeOpen"], "production profile-photo materializer I/O");
  }
  const write = io?.writeFileSync ?? writeFileSync;
  if (typeof write !== "function"
    || (io?.beforeOpen !== undefined && typeof io.beforeOpen !== "function")) {
    throw new TypeError("production profile-photo materializer I/O is invalid");
  }
  const root = canonicalDirectory(stagingRoot, "production artifact staging root");
  const photoDirectory = join(root, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY);
  const metadataPath = join(root, JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY);
  if (existsSync(photoDirectory) || existsSync(metadataPath)) {
    throw new Error("production profile-photo artifact targets already exist");
  }
  const stagingBaseline = snapshotStagingEntries(root);
  try {
    mkdirSync(photoDirectory, { recursive: true, mode: 0o755 });
    for (const entry of privateEntries) {
      validatePngBytes(entry.bytes);
      if (sha256(entry.bytes) !== entry.content_sha256) {
        throw new Error("validated private profile-photo bytes drifted");
      }
      write(join(photoDirectory, entry.filename), entry.bytes, {
        flag: "wx",
        mode: 0o444,
      });
      const materializedBytes = readPinnedRegularFile(
        join(photoDirectory, entry.filename),
        "materialized profile-photo file",
        {
          maxBytes: PROFILE_PHOTO_FILE_MAX_BYTES,
          beforeOpen: io?.beforeOpen,
        },
      );
      validatePngBytes(materializedBytes);
      if (sha256(materializedBytes) !== entry.content_sha256) {
        throw new Error("materialized private profile-photo bytes do not match the private manifest");
      }
    }
    const expectedNames = privateEntries.map((entry) => entry.filename).sort();
    const materializedNames = readdirSync(photoDirectory).sort();
    if (JSON.stringify(materializedNames) !== JSON.stringify(expectedNames)) {
      throw new Error("materialized private profile-photo entry set drifted");
    }
    const metadata = validateJsonPostgresProductionProfilePhotoMetadata(bundle.metadata);
    const metadataBytes = Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`);
    write(metadataPath, metadataBytes, { flag: "wx", mode: 0o444 });
    const materializedMetadataBytes = readPinnedRegularFile(
      metadataPath,
      "materialized profile-photo metadata",
      { maxBytes: 1024 * 1024, beforeOpen: io?.beforeOpen },
    );
    validateJsonPostgresProductionProfilePhotoMetadata(
      JSON.parse(materializedMetadataBytes.toString("utf8")),
    );
    const binding = validateJsonPostgresProductionProfilePhotoArtifactBinding({
      metadata_path: JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY,
      metadata_schema_version: metadata.schema_version,
      metadata_sha256: sha256(materializedMetadataBytes),
      generation_ref: metadata.generation_ref,
      private_manifest_schema_version: metadata.private_manifest_schema_version,
      private_manifest_sha256: metadata.private_manifest_sha256,
      private_manifest_entry_count: metadata.private_manifest_entry_count,
      injected_photo_entry_count: metadata.injected_photo_entry_count,
      git_source_photo_entry_count: metadata.git_source_photo_entry_count,
    });
    return Object.freeze({ metadata, binding });
  } catch (error) {
    try {
      removeNewStagingEntries(root, stagingBaseline);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "production profile-photo materialization and cleanup both failed",
      );
    }
    throw error;
  }
}

function productionOutputFilename(value, label) {
  const filename = requiredText(value, label);
  if (basename(filename) !== filename || filename === "." || filename === ".."
    || filename.startsWith(".lawos-production-output")
    || filename === PRODUCTION_OUTPUT_LOCK_NAME) {
    throw new TypeError(`${label} must be a filename`);
  }
  return filename;
}

function productionOutputError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function effectiveUid() {
  return typeof process.getuid === "function" ? process.getuid() : null;
}

function assertOwnerOnlySnapshot(snapshot, label, type) {
  const matchesType = type === "directory" ? snapshot.isDirectory() : snapshot.isFile();
  const uid = effectiveUid();
  if (!matchesType || snapshot.isSymbolicLink() || (snapshot.mode & 0o77n) !== 0n
    || (uid !== null && snapshot.uid !== BigInt(uid))) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_UNTRUSTED",
      `${label} is not an owner-private ${type}`,
    );
  }
}

function ownerPrivateDirectoryIdentity(path, label) {
  try {
    const target = canonicalDirectory(path, label);
    const entry = lstatSync(target, { bigint: true });
    assertOwnerOnlySnapshot(entry, label, "directory");
    return Object.freeze({
      path: target,
      dev: entry.dev,
      ino: entry.ino,
      size: entry.size,
      mode: entry.mode,
      mtimeNs: entry.mtimeNs,
      ctimeNs: entry.ctimeNs,
    });
  } catch (error) {
    if (error?.code === "PRODUCTION_OUTPUT_RECOVERY_UNTRUSTED") throw error;
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_UNTRUSTED",
      `${label} is not an owner-private canonical directory`,
    );
  }
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino && left.size === right.size;
}

function fsyncDirectory(path, label) {
  let descriptor = null;
  try {
    if (!Number.isInteger(constants.O_DIRECTORY)
      || !Number.isInteger(constants.O_NOFOLLOW)) throw new Error();
    descriptor = openSync(
      path,
      constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    );
    const opened = fstatSync(descriptor, { bigint: true });
    if (!opened.isDirectory()) throw new Error();
    fsyncSync(descriptor);
  } catch {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_DURABILITY_FAILED",
      `${label} could not be durably synchronized`,
    );
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
}

function writeAll(descriptor, bytes) {
  let offset = 0;
  while (offset < bytes.byteLength) {
    const count = writeSync(descriptor, bytes, offset, bytes.byteLength - offset, null);
    if (count < 1) throw new Error("durable control write stopped before completion");
    offset += count;
  }
}

function writeDurableOwnerControlFile(path, value, label) {
  const bytes = Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
  if (bytes.byteLength > PRODUCTION_OUTPUT_CONTROL_MAX_BYTES) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_CONTROL_INVALID",
      `${label} exceeds its closed size boundary`,
    );
  }
  let descriptor = null;
  try {
    if (!Number.isInteger(constants.O_NOFOLLOW)) throw new Error();
    descriptor = openSync(
      path,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW,
      0o600,
    );
    writeAll(descriptor, bytes);
    fchmodSync(descriptor, 0o400);
    fsyncSync(descriptor);
    const opened = fstatSync(descriptor, { bigint: true });
    assertOwnerOnlySnapshot(opened, label, "file");
    if (opened.size !== BigInt(bytes.byteLength)) throw new Error();
  } catch (error) {
    if (error?.code === "EEXIST") throw error;
    if (error?.code === "PRODUCTION_OUTPUT_RECOVERY_UNTRUSTED") throw error;
    throw productionOutputError(
      "PRODUCTION_OUTPUT_DURABILITY_FAILED",
      `${label} could not be written durably`,
    );
  } finally {
    if (descriptor !== null) closeSync(descriptor);
  }
  fsyncDirectory(dirname(path), `${label} parent`);
  return inspectPinnedRegularFile(path, label, {
    ownerOnly: true,
    maxBytes: PRODUCTION_OUTPUT_CONTROL_MAX_BYTES,
  });
}

function processStartIdentity(pid) {
  const psPath = ["/bin/ps", "/usr/bin/ps"].find((candidate) => existsSync(candidate));
  if (!psPath) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_PROCESS_IDENTITY_UNAVAILABLE",
      "production output owner process start identity is unavailable",
    );
  }
  let text;
  try {
    text = execFileSync(psPath, ["-o", "lstart=", "-p", String(pid)], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    text = "";
  }
  if (!text) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_PROCESS_IDENTITY_UNAVAILABLE",
      "production output owner process start identity is unavailable",
    );
  }
  return sha256(Buffer.from(`${process.platform}\0${text}`, "utf8"));
}

function newTransactionBinding() {
  const nonce = randomBytes(32).toString("hex");
  return Object.freeze({
    transaction_name: `${PRODUCTION_OUTPUT_TRANSACTION_PREFIX}${nonce.slice(0, 32)}`,
    transaction_nonce: nonce,
    owner_pid: process.pid,
    owner_process_start_identity: processStartIdentity(process.pid),
    owner_uid: effectiveUid(),
  });
}

function validateTransactionBinding(value, schemaVersion, label) {
  exactKeys(value, [
    "schema_version",
    "transaction_name",
    "transaction_nonce",
    "owner_pid",
    "owner_process_start_identity",
    "owner_uid",
  ], label);
  if (value.schema_version !== schemaVersion
    || !/^\.lawos-production-output-[a-f0-9]{32}$/u.test(value.transaction_name)
    || !SHA256.test(value.transaction_nonce)
    || value.transaction_name
      !== `${PRODUCTION_OUTPUT_TRANSACTION_PREFIX}${value.transaction_nonce.slice(0, 32)}`
    || !Number.isSafeInteger(value.owner_pid) || value.owner_pid < 1
    || !SHA256.test(value.owner_process_start_identity)
    || (value.owner_uid !== null
      && (!Number.isSafeInteger(value.owner_uid) || value.owner_uid < 0))) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_CONTROL_INVALID",
      `${label} binding is invalid`,
    );
  }
  const uid = effectiveUid();
  if (uid !== null && value.owner_uid !== uid) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_UNTRUSTED",
      `${label} is not owned by the current user`,
    );
  }
  return Object.freeze({ ...value });
}

function sameTransactionBinding(left, right) {
  return left.transaction_name === right.transaction_name
    && left.transaction_nonce === right.transaction_nonce
    && left.owner_pid === right.owner_pid
    && left.owner_process_start_identity === right.owner_process_start_identity
    && left.owner_uid === right.owner_uid;
}

function readOwnerControl(path, schemaVersion, label, parentIdentity) {
  let inspected;
  try {
    inspected = inspectPinnedRegularFile(path, label, {
      ownerOnly: true,
      maxBytes: PRODUCTION_OUTPUT_CONTROL_MAX_BYTES,
      parentIdentity,
    });
    assertOwnerOnlySnapshot(inspected.snapshot, label, "file");
    return Object.freeze({
      binding: validateTransactionBinding(
        JSON.parse(inspected.bytes.toString("utf8")),
        schemaVersion,
        label,
      ),
      snapshot: inspected.snapshot,
    });
  } catch (error) {
    if (error?.code?.startsWith?.("PRODUCTION_OUTPUT_")) throw error;
    throw productionOutputError(
      "PRODUCTION_OUTPUT_CONTROL_INVALID",
      `${label} is missing, partial, or malformed`,
    );
  }
}

function assertOwnerProcessIsDead(binding) {
  try {
    process.kill(binding.owner_pid, 0);
  } catch (error) {
    if (error?.code === "ESRCH") return;
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_AMBIGUOUS",
      "production output owner process liveness is ambiguous",
    );
  }
  let actualIdentity;
  try {
    actualIdentity = processStartIdentity(binding.owner_pid);
  } catch {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_AMBIGUOUS",
      "production output owner process identity is ambiguous",
    );
  }
  if (actualIdentity === binding.owner_process_start_identity) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_BUILD_IN_PROGRESS",
      "production artifact build is already in progress",
    );
  }
  throw productionOutputError(
    "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_AMBIGUOUS",
    "production output owner PID was reused; manual recovery is required",
  );
}

function stagedOutputRecord(path, role, filename, maxBytes, durable = false) {
  let inspected;
  try {
    inspected = inspectPinnedRegularFile(path, `staged production ${role}`, {
      ownerOnly: true,
      maxBytes,
      parentIdentity: ownerPrivateDirectoryIdentity(
        dirname(path),
        "production output publication directory",
      ),
      durable,
    });
  } catch {
    throw new Error(
      `production ${role} was not created as a regular non-symlink file`,
    );
  }
  assertOwnerOnlySnapshot(inspected.snapshot, `staged production ${role}`, "file");
  return Object.freeze({
    role,
    filename,
    staged_relative_path: `${PRODUCTION_OUTPUT_PUBLICATION_DIRECTORY}/${filename}`,
    device: String(inspected.snapshot.dev),
    inode: String(inspected.snapshot.ino),
    byte_size: Number(inspected.snapshot.size),
    sha256: sha256(inspected.bytes),
    path,
    snapshot: inspected.snapshot,
  });
}

function journalOutput(record) {
  const { path: _path, snapshot: _snapshot, ...output } = record;
  return output;
}

function validateJournalOutput(value, expectedRole) {
  exactKeys(value, [
    "role",
    "filename",
    "staged_relative_path",
    "device",
    "inode",
    "byte_size",
    "sha256",
  ], `production output recovery ${expectedRole}`);
  const filename = productionOutputFilename(
    value.filename,
    `production output recovery ${expectedRole} filename`,
  );
  const maxBytes = expectedRole === "archive"
    ? PRODUCTION_OUTPUT_ARCHIVE_MAX_BYTES
    : PRODUCTION_OUTPUT_MANIFEST_MAX_BYTES;
  if (value.role !== expectedRole
    || value.staged_relative_path
      !== `${PRODUCTION_OUTPUT_PUBLICATION_DIRECTORY}/${filename}`
    || !/^\d+$/u.test(value.device) || !/^\d+$/u.test(value.inode)
    || !Number.isSafeInteger(value.byte_size)
    || value.byte_size < 1 || value.byte_size > maxBytes
    || !SHA256.test(value.sha256)) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_CONTROL_INVALID",
      `production output recovery ${expectedRole} is invalid`,
    );
  }
  return Object.freeze({ ...value });
}

function validateRecoveryJournal(value, binding) {
  exactKeys(value, [
    "schema_version",
    "transaction_name",
    "transaction_nonce",
    "outputs",
  ], "production output recovery journal");
  if (value.schema_version !== PRODUCTION_OUTPUT_JOURNAL_SCHEMA
    || value.transaction_name !== binding.transaction_name
    || value.transaction_nonce !== binding.transaction_nonce
    || !Array.isArray(value.outputs) || value.outputs.length !== 2) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_CONTROL_INVALID",
      "production output recovery journal binding is invalid",
    );
  }
  const outputs = [
    validateJournalOutput(value.outputs[0], "archive"),
    validateJournalOutput(value.outputs[1], "manifest"),
  ];
  if (outputs[0].filename === outputs[1].filename) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_CONTROL_INVALID",
      "production output recovery filenames must be distinct",
    );
  }
  return Object.freeze({ ...value, outputs: Object.freeze(outputs) });
}

function readRecoveryJournal(transactionRoot, binding) {
  const parentIdentity = ownerPrivateDirectoryIdentity(
    transactionRoot,
    "production output transaction directory",
  );
  const path = join(transactionRoot, PRODUCTION_OUTPUT_JOURNAL_NAME);
  let inspected;
  try {
    inspected = inspectPinnedRegularFile(path, "production output recovery journal", {
      ownerOnly: true,
      maxBytes: PRODUCTION_OUTPUT_CONTROL_MAX_BYTES,
      parentIdentity,
    });
    assertOwnerOnlySnapshot(
      inspected.snapshot,
      "production output recovery journal",
      "file",
    );
    return Object.freeze({
      journal: validateRecoveryJournal(
        JSON.parse(inspected.bytes.toString("utf8")),
        binding,
      ),
      sha256: sha256(inspected.bytes),
    });
  } catch (error) {
    if (error?.code?.startsWith?.("PRODUCTION_OUTPUT_")) throw error;
    throw productionOutputError(
      "PRODUCTION_OUTPUT_CONTROL_INVALID",
      "production output recovery journal is partial or malformed",
    );
  }
}

function readCommitMarker(transactionRoot, binding, journalSha256) {
  const path = join(transactionRoot, PRODUCTION_OUTPUT_COMMIT_NAME);
  if (!optionalPathSnapshot(path)) return false;
  let inspected;
  try {
    inspected = inspectPinnedRegularFile(path, "production output commit marker", {
      ownerOnly: true,
      maxBytes: PRODUCTION_OUTPUT_CONTROL_MAX_BYTES,
      parentIdentity: ownerPrivateDirectoryIdentity(
        transactionRoot,
        "production output transaction directory",
      ),
    });
    assertOwnerOnlySnapshot(inspected.snapshot, "production output commit marker", "file");
    const value = JSON.parse(inspected.bytes.toString("utf8"));
    exactKeys(value, ["schema_version", "transaction_nonce", "journal_sha256"],
      "production output commit marker");
    if (value.schema_version !== PRODUCTION_OUTPUT_COMMIT_SCHEMA
      || value.transaction_nonce !== binding.transaction_nonce
      || value.journal_sha256 !== journalSha256) throw new Error();
    return true;
  } catch (error) {
    if (error?.code?.startsWith?.("PRODUCTION_OUTPUT_")) throw error;
    throw productionOutputError(
      "PRODUCTION_OUTPUT_CONTROL_INVALID",
      "production output commit marker is partial or malformed",
    );
  }
}

function recoveredFinalClaimPath(transactionRoot, role) {
  return join(transactionRoot, `.recovered-final-${role}`);
}

function inspectJournalStagedOutput(transactionRoot, output) {
  const path = join(transactionRoot, ...output.staged_relative_path.split("/"));
  const record = stagedOutputRecord(
    path,
    output.role,
    output.filename,
    output.role === "archive"
      ? PRODUCTION_OUTPUT_ARCHIVE_MAX_BYTES
      : PRODUCTION_OUTPUT_MANIFEST_MAX_BYTES,
  );
  if (record.device !== output.device || record.inode !== output.inode
    || record.byte_size !== output.byte_size || record.sha256 !== output.sha256) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
      `staged production ${output.role} no longer matches its recovery journal`,
    );
  }
  return record;
}

function inspectFinalOutput(path, stagedRecord, label) {
  let snapshot;
  try {
    snapshot = lstatSync(path, { bigint: true });
    if (snapshot.isSymbolicLink() || !snapshot.isFile()
      || realpathSync(path) !== path
      || !sameFileIdentity(snapshot, stagedRecord.snapshot)) throw new Error();
  } catch {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
      `${label} is not owned by the stale production transaction`,
    );
  }
  return snapshot;
}

function optionalPathSnapshot(path) {
  try {
    return lstatSync(path, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

function validateRecoveryOutputs(root, transactionRoot, journal, committed) {
  return journal.outputs.map((output) => {
    const staged = inspectJournalStagedOutput(transactionRoot, output);
    const finalPath = join(root, output.filename);
    const claimPath = recoveredFinalClaimPath(transactionRoot, output.role);
    const finalEntry = optionalPathSnapshot(finalPath);
    const claimEntry = optionalPathSnapshot(claimPath);
    if (finalEntry && claimEntry) {
      throw productionOutputError(
        "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
        `production ${output.role} has ambiguous final and recovery links`,
      );
    }
    if (finalEntry) inspectFinalOutput(finalPath, staged, `production ${output.role}`);
    if (claimEntry) inspectFinalOutput(claimPath, staged, `recovered production ${output.role}`);
    if (committed && (!finalEntry || claimEntry)) {
      throw productionOutputError(
        "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
        `committed production ${output.role} is incomplete`,
      );
    }
    return Object.freeze({ output, staged, finalPath, claimPath, finalEntry, claimEntry });
  });
}

function recoveryTransactionPath(root, binding) {
  return join(
    root,
    `${binding.transaction_name}.recovering-${binding.transaction_nonce}`,
  );
}

function claimTransactionRoot(root, transactionRoot, binding) {
  const expectedOriginal = join(root, binding.transaction_name);
  const expectedRecovery = recoveryTransactionPath(root, binding);
  if (transactionRoot !== expectedOriginal && transactionRoot !== expectedRecovery) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_UNTRUSTED",
      "production output transaction name is not bound to its owner marker",
    );
  }
  const before = ownerPrivateDirectoryIdentity(
    transactionRoot,
    "production output transaction directory",
  );
  if (transactionRoot === expectedRecovery) return transactionRoot;
  if (optionalPathSnapshot(expectedRecovery)) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
      "production output recovery claim already exists",
    );
  }
  renameSync(transactionRoot, expectedRecovery);
  const after = ownerPrivateDirectoryIdentity(
    expectedRecovery,
    "claimed production output transaction directory",
  );
  if (before.dev !== after.dev || before.ino !== after.ino) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
      "production output transaction changed while it was claimed",
    );
  }
  fsyncDirectory(root, "production artifact output directory");
  return expectedRecovery;
}

function readTransactionOwner(transactionRoot, expectedBinding = null) {
  const identity = ownerPrivateDirectoryIdentity(
    transactionRoot,
    "production output transaction directory",
  );
  const owner = readOwnerControl(
    join(transactionRoot, PRODUCTION_OUTPUT_OWNER_NAME),
    PRODUCTION_OUTPUT_OWNER_SCHEMA,
    "production output transaction owner",
    identity,
  ).binding;
  const name = basename(transactionRoot);
  const expectedRecoveryName =
    `${owner.transaction_name}.recovering-${owner.transaction_nonce}`;
  if (name !== owner.transaction_name && name !== expectedRecoveryName) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_UNTRUSTED",
      "production output transaction directory is not bound to its owner marker",
    );
  }
  if (expectedBinding && !sameTransactionBinding(owner, expectedBinding)) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
      "production output lock and transaction owner do not match",
    );
  }
  return owner;
}

function recoverTransactionRoot(root, transactionRoot, expectedBinding = null, {
  requireDead = true,
} = {}) {
  const owner = readTransactionOwner(transactionRoot, expectedBinding);
  if (requireDead) assertOwnerProcessIsDead(owner);
  const journalPath = join(transactionRoot, PRODUCTION_OUTPUT_JOURNAL_NAME);
  if (!optionalPathSnapshot(journalPath)) {
    const claimed = claimTransactionRoot(root, transactionRoot, owner);
    readTransactionOwner(claimed, owner);
    rmSync(claimed, { recursive: true, force: true });
    fsyncDirectory(root, "production artifact output directory");
    return Object.freeze({ binding: owner, committed: false, recovered: true });
  }

  let journalState = readRecoveryJournal(transactionRoot, owner);
  let committed = readCommitMarker(
    transactionRoot,
    owner,
    journalState.sha256,
  );
  validateRecoveryOutputs(root, transactionRoot, journalState.journal, committed);
  const claimed = claimTransactionRoot(root, transactionRoot, owner);
  readTransactionOwner(claimed, owner);
  journalState = readRecoveryJournal(claimed, owner);
  committed = readCommitMarker(claimed, owner, journalState.sha256);
  const outputs = validateRecoveryOutputs(root, claimed, journalState.journal, committed);
  if (!committed) {
    for (const candidate of outputs) {
      if (candidate.claimEntry) continue;
      if (!candidate.finalEntry) continue;
      renameSync(candidate.finalPath, candidate.claimPath);
      inspectFinalOutput(
        candidate.claimPath,
        inspectJournalStagedOutput(claimed, candidate.output),
        `claimed production ${candidate.output.role}`,
      );
      fsyncDirectory(root, "production artifact output directory");
    }
    validateRecoveryOutputs(root, claimed, journalState.journal, false);
  }
  rmSync(claimed, { recursive: true, force: true });
  fsyncDirectory(root, "production artifact output directory");
  return Object.freeze({ binding: owner, committed, recovered: true });
}

function lockRecoveryName(binding) {
  return `${PRODUCTION_OUTPUT_LOCK_NAME}.recovering-${binding.transaction_nonce}`;
}

function sameOwnedControlIdentity(left, right) {
  return sameFileIdentity(left, right)
    && left.mode === right.mode
    && left.uid === right.uid;
}

function removeOwnedLock(root, lockPath, binding, { afterClaim } = {}) {
  const parentIdentity = pinnedDirectoryIdentity(root, "production artifact output directory");
  const lock = readOwnerControl(
    lockPath,
    PRODUCTION_OUTPUT_LOCK_SCHEMA,
    "production output lock",
    parentIdentity,
  );
  if (!sameTransactionBinding(lock.binding, binding)) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
      "production output lock binding changed",
    );
  }
  const claimPath = join(root, lockRecoveryName(binding));
  if (lockPath !== claimPath) {
    let claimed;
    if (optionalPathSnapshot(claimPath)) {
      claimed = readOwnerControl(
        claimPath,
        PRODUCTION_OUTPUT_LOCK_SCHEMA,
        "claimed production output lock",
        pinnedDirectoryIdentity(root, "production artifact output directory"),
      );
      if (!sameOwnedControlIdentity(lock.snapshot, claimed.snapshot)
        || !sameTransactionBinding(claimed.binding, binding)) {
        throw productionOutputError(
          "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
          "production output lock recovery claim is not the same owned inode",
        );
      }
      rmSync(lockPath, { force: true });
      fsyncDirectory(root, "production artifact output directory");
    } else {
      renameSync(lockPath, claimPath);
      afterClaim?.({ lockPath, claimPath });
      claimed = readOwnerControl(
        claimPath,
        PRODUCTION_OUTPUT_LOCK_SCHEMA,
        "claimed production output lock",
        pinnedDirectoryIdentity(root, "production artifact output directory"),
      );
    }
    if (!sameOwnedControlIdentity(lock.snapshot, claimed.snapshot)
      || !sameTransactionBinding(claimed.binding, binding)) {
      throw productionOutputError(
        "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
        "production output lock changed while it was claimed",
      );
    }
  }
  rmSync(claimPath, { force: true });
  fsyncDirectory(root, "production artifact output directory");
}

function transactionPathsForBinding(root, binding) {
  return [
    join(root, binding.transaction_name),
    recoveryTransactionPath(root, binding),
  ].filter((path) => optionalPathSnapshot(path));
}

function recoverLock(root, lockPath) {
  const lock = readOwnerControl(
    lockPath,
    PRODUCTION_OUTPUT_LOCK_SCHEMA,
    "production output lock",
    pinnedDirectoryIdentity(root, "production artifact output directory"),
  ).binding;
  assertOwnerProcessIsDead(lock);
  const transactionPaths = transactionPathsForBinding(root, lock);
  if (transactionPaths.length > 1) {
    throw productionOutputError(
      "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
      "production output lock resolves to multiple transaction directories",
    );
  }
  if (transactionPaths.length === 1) {
    recoverTransactionRoot(root, transactionPaths[0], lock, { requireDead: false });
  }
  removeOwnedLock(root, lockPath, lock);
  return lock.transaction_nonce;
}

function recoverStaleOutputTransactions(root) {
  const entries = readdirSync(root, { withFileTypes: true })
    .map((entry) => entry.name)
    .sort();
  const lockNames = entries.filter((name) => name === PRODUCTION_OUTPUT_LOCK_NAME
    || PRODUCTION_OUTPUT_LOCK_RECOVERY_PATTERN.test(name)
    || PRODUCTION_OUTPUT_LOCK_PENDING_PATTERN.test(name));
  const recoveredNonces = new Set();
  for (const name of lockNames) {
    const path = join(root, name);
    if (!optionalPathSnapshot(path)) continue;
    recoveredNonces.add(recoverLock(root, path));
  }

  const transactionNames = readdirSync(root, { withFileTypes: true })
    .map((entry) => entry.name)
    .filter((name) => PRODUCTION_OUTPUT_TRANSACTION_PATTERN.test(name))
    .sort();
  for (const name of transactionNames) {
    const path = join(root, name);
    const owner = readTransactionOwner(path);
    if (recoveredNonces.has(owner.transaction_nonce)) continue;
    recoverTransactionRoot(root, path, owner);
  }
}

function acquireOutputTransaction(root, io) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    recoverStaleOutputTransactions(root);
    const binding = newTransactionBinding();
    const lockPath = join(root, PRODUCTION_OUTPUT_LOCK_NAME);
    const pendingLockPath = join(
      root,
      `${PRODUCTION_OUTPUT_LOCK_NAME}.pending-${binding.transaction_nonce}`,
    );
    try {
      const pendingLock = writeDurableOwnerControlFile(
        pendingLockPath,
        { schema_version: PRODUCTION_OUTPUT_LOCK_SCHEMA, ...binding },
        "pending production output lock",
      );
      linkSync(pendingLockPath, lockPath);
      const acquiredLock = readOwnerControl(
        lockPath,
        PRODUCTION_OUTPUT_LOCK_SCHEMA,
        "production output lock",
        pinnedDirectoryIdentity(root, "production artifact output directory"),
      );
      if (!sameFileIdentity(pendingLock.snapshot, acquiredLock.snapshot)
        || !sameTransactionBinding(acquiredLock.binding, binding)) {
        throw productionOutputError(
          "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
          "production output lock changed while it was acquired",
        );
      }
      fsyncDirectory(root, "production artifact output directory");
      removeOwnedLock(root, pendingLockPath, binding, {
        afterClaim: io?.afterPendingLockClaim,
      });
    } catch (error) {
      if (optionalPathSnapshot(pendingLockPath)) {
        try {
          removeOwnedLock(root, pendingLockPath, binding);
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            "production output lock acquisition and cleanup both failed",
          );
        }
      }
      if (error?.code === "EEXIST" && attempt === 0) continue;
      throw error;
    }
    const transactionRoot = join(root, binding.transaction_name);
    try {
      mkdirSync(transactionRoot, { mode: 0o700 });
      chmodSync(transactionRoot, 0o700);
      writeDurableOwnerControlFile(
        join(transactionRoot, PRODUCTION_OUTPUT_OWNER_NAME),
        { schema_version: PRODUCTION_OUTPUT_OWNER_SCHEMA, ...binding },
        "production output transaction owner",
      );
      const buildStagingRoot = join(transactionRoot, PRODUCTION_OUTPUT_BUILD_DIRECTORY);
      const publicationRoot = join(transactionRoot, PRODUCTION_OUTPUT_PUBLICATION_DIRECTORY);
      mkdirSync(buildStagingRoot, { mode: 0o700 });
      mkdirSync(publicationRoot, { mode: 0o700 });
      chmodSync(buildStagingRoot, 0o700);
      chmodSync(publicationRoot, 0o700);
      fsyncDirectory(transactionRoot, "production output transaction directory");
      fsyncDirectory(root, "production artifact output directory");
      return Object.freeze({
        binding,
        lockPath,
        transactionRoot,
        buildStagingRoot,
        publicationRoot,
      });
    } catch (error) {
      try {
        if (optionalPathSnapshot(transactionRoot)) {
          recoverTransactionRoot(root, transactionRoot, binding, { requireDead: false });
        }
        removeOwnedLock(root, lockPath, binding);
      } catch (cleanupError) {
        throw new AggregateError(
          [error, cleanupError],
          "production output transaction acquisition and cleanup both failed",
        );
      }
      throw error;
    }
  }
  throw productionOutputError(
    "PRODUCTION_OUTPUT_BUILD_IN_PROGRESS",
    "production artifact build is already in progress",
  );
}

function directRollbackOutputs(root, transactionRoot, records) {
  for (const record of records) {
    const finalPath = join(root, record.filename);
    if (!optionalPathSnapshot(finalPath)) continue;
    inspectFinalOutput(finalPath, record, `production ${record.role}`);
    const claimPath = recoveredFinalClaimPath(transactionRoot, record.role);
    if (optionalPathSnapshot(claimPath)) {
      throw productionOutputError(
        "PRODUCTION_OUTPUT_RECOVERY_IDENTITY_MISMATCH",
        `production ${record.role} rollback claim already exists`,
      );
    }
    renameSync(finalPath, claimPath);
    inspectFinalOutput(claimPath, record, `claimed production ${record.role}`);
  }
  fsyncDirectory(root, "production artifact output directory");
}

export function withJsonPostgresProductionArtifactOutputTransaction({
  outputDir,
  archiveFilename,
  manifestFilename,
  build,
  io,
} = {}) {
  const root = canonicalDirectory(outputDir, "production artifact output directory");
  const archiveName = productionOutputFilename(archiveFilename, "production archive filename");
  const manifestName = productionOutputFilename(manifestFilename, "production manifest filename");
  if (archiveName === manifestName) {
    throw new TypeError("production archive and manifest filenames must be distinct");
  }
  if (typeof build !== "function") throw new TypeError("production output builder is required");
  if (io !== undefined) {
    allowedKeys(
      io,
      ["linkSync", "afterCommit", "afterPendingLockClaim"],
      "production output transaction I/O",
    );
  }
  const link = io?.linkSync ?? linkSync;
  if (typeof link !== "function"
    || (io?.afterCommit !== undefined && typeof io.afterCommit !== "function")
    || (io?.afterPendingLockClaim !== undefined
      && typeof io.afterPendingLockClaim !== "function")) {
    throw new TypeError("production output transaction I/O is invalid");
  }

  const finalArchivePath = join(root, archiveName);
  const finalManifestPath = join(root, manifestName);
  recoverStaleOutputTransactions(root);
  if (optionalPathSnapshot(finalArchivePath) || optionalPathSnapshot(finalManifestPath)) {
    throw new Error("production artifact output already exists");
  }
  const transaction = acquireOutputTransaction(root, io);
  const stagedArchivePath = join(transaction.publicationRoot, archiveName);
  const stagedManifestPath = join(transaction.publicationRoot, manifestName);
  let records = [];
  let committed = false;
  try {
    const result = build({
      archivePath: stagedArchivePath,
      manifestPath: stagedManifestPath,
      stagingRoot: transaction.buildStagingRoot,
    });
    records = [
      stagedOutputRecord(
        stagedArchivePath,
        "archive",
        archiveName,
        PRODUCTION_OUTPUT_ARCHIVE_MAX_BYTES,
        true,
      ),
      stagedOutputRecord(
        stagedManifestPath,
        "manifest",
        manifestName,
        PRODUCTION_OUTPUT_MANIFEST_MAX_BYTES,
        true,
      ),
    ];
    const journalState = writeDurableOwnerControlFile(
      join(transaction.transactionRoot, PRODUCTION_OUTPUT_JOURNAL_NAME),
      {
        schema_version: PRODUCTION_OUTPUT_JOURNAL_SCHEMA,
        transaction_name: transaction.binding.transaction_name,
        transaction_nonce: transaction.binding.transaction_nonce,
        outputs: records.map(journalOutput),
      },
      "production output recovery journal",
    );
    link(stagedArchivePath, finalArchivePath);
    inspectFinalOutput(finalArchivePath, records[0], "production archive");
    link(stagedManifestPath, finalManifestPath);
    inspectFinalOutput(finalManifestPath, records[1], "production manifest");
    fsyncDirectory(root, "production artifact output directory");
    writeDurableOwnerControlFile(
      join(transaction.transactionRoot, PRODUCTION_OUTPUT_COMMIT_NAME),
      {
        schema_version: PRODUCTION_OUTPUT_COMMIT_SCHEMA,
        transaction_nonce: transaction.binding.transaction_nonce,
        journal_sha256: sha256(journalState.bytes),
      },
      "production output commit marker",
    );
    committed = true;
    io?.afterCommit?.();
    const output = Object.freeze({
      result,
      archivePath: finalArchivePath,
      manifestPath: finalManifestPath,
    });
    recoverTransactionRoot(
      root,
      transaction.transactionRoot,
      transaction.binding,
      { requireDead: false },
    );
    removeOwnedLock(root, transaction.lockPath, transaction.binding);
    return output;
  } catch (error) {
    if (committed) throw error;
    try {
      if (records.length === 2) {
        directRollbackOutputs(root, transaction.transactionRoot, [...records].reverse());
      }
      if (optionalPathSnapshot(transaction.transactionRoot)) {
        const claimed = claimTransactionRoot(
          root,
          transaction.transactionRoot,
          transaction.binding,
        );
        readTransactionOwner(claimed, transaction.binding);
        rmSync(claimed, { recursive: true, force: true });
        fsyncDirectory(root, "production artifact output directory");
      }
      if (optionalPathSnapshot(transaction.lockPath)) {
        removeOwnedLock(root, transaction.lockPath, transaction.binding);
      }
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        "production output transaction and cleanup both failed",
      );
    }
    throw error;
  }
}

export function emptyJsonPostgresProductionSources() {
  return Object.freeze({
    account_seed: Object.freeze({
      schema_version: "law-firm-os.matter-vault-user-registration-seed.v0.1",
      created_at: "1970-01-01T00:00:00.000Z",
      status: "production-postgres-directory-only",
      tenant_id: "",
      source: Object.freeze({ kind: "postgres-v2-account-directory", account_count: 0 }),
      registration_boundary: Object.freeze({
        external_identity_account_creation: false,
        passwords_or_real_tokens_included: false,
        operator_approval_required_for_production_invites: true,
      }),
      highest_privilege_account: null,
      users: Object.freeze([]),
    }),
    roster: Object.freeze({
      schema_version: "law-firm-os.hrx-member-roster-source-of-truth.v0.1",
      created_at: "1970-01-01T00:00:00.000Z",
      status: "production-postgres-directory-only",
      tenant_id: "",
      source_ref: "postgres-v2-hrx-records",
      change_control: Object.freeze({
        default_persistence: "postgres-v2",
        implicit_regeneration_allowed: false,
        passwords_or_real_tokens_included: false,
      }),
      members: Object.freeze([]),
    }),
  });
}

export function productionArtifactSourcePathAllowed(path) {
  const normalized = String(path ?? "").replaceAll("\\", "/").replace(/^\.\//u, "");
  return normalized !== JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_METADATA_ENTRY
    && !normalized.startsWith(`${JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY}/`)
    && privateStagingArtifactSourcePathAllowed(normalized)
    && !PRIVATE_STAGING_SOURCE.test(normalized);
}

export function parseJsonPostgresProductionGitTree(value) {
  return Object.freeze(
    parsePrivateStagingGitTree(value, {
      sourcePathAllowed: productionArtifactSourcePathAllowed,
    }),
  );
}

export function redactJsonPostgresProductionRuntimeSource({ targetPath, text } = {}) {
  const path = requiredText(targetPath, "production redaction target");
  if (!JSON_POSTGRES_PRODUCTION_REDACTION_TARGETS.includes(path)) {
    throw new TypeError(`unsupported production redaction target: ${path}`);
  }
  let output = String(text ?? "");
  if (path === "apps/api/src/lambda.js") {
    let employeeIndex = 0;
    const employeeIds = new Map();
    output = output
      .replace(/\b[A-Z0-9._%+-]+@amic\.kr\b/giu, "redacted-production-user@production.invalid")
      .replace(/\buser_amic_[a-z0-9_]+\b/giu, "user_production_redacted")
      .replace(/\bemp_amic_[a-z0-9_]+\b/giu, (source) => {
        if (!employeeIds.has(source)) {
          employeeIndex += 1;
          employeeIds.set(source, `employee_production_redacted_${employeeIndex}`);
        }
        return employeeIds.get(source);
      })
      .replaceAll("assumed-role/lawos-private-staging-api-role/", "assumed-role/lawos-production-api-role/");
  } else if (path === "apps/api/src/outlook-addin-runtime-context.js") {
    output = output.replaceAll("@amic.law", "@production.invalid");
  } else if (path === "packages/matter/src/worktree-template-model.js") {
    output = output.replace(/\b[A-Z0-9._%+-]+@amic\.kr\b/giu, "redacted-production-user@production.invalid");
  }
  if (output === text) throw new Error(`production source redaction made no change: ${path}`);
  if (REAL_IDENTITY_MARKER.test(output)) {
    throw new Error(`production source redaction left a real identity marker: ${path}`);
  }
  return Object.freeze({
    target_path: path,
    purpose: "remove-real-identity-source-markers-from-deployment-code",
    text: output,
    byte_size: Buffer.byteLength(output),
  });
}

export function validateJsonPostgresProductionSourceBoundary(entries = []) {
  const violations = entries
    .filter((entry) => REAL_IDENTITY_MARKER.test(String(entry?.text ?? "")))
    .map((entry) => requiredText(entry.path, "production source path"));
  if (violations.length) {
    throw new Error(`production artifact source contains real identity markers: ${violations.slice(0, 5).join(", ")}`);
  }
  return Object.freeze({
    scanned_source_count: entries.length,
    real_identity_marker_count: 0,
  });
}

export function validateJsonPostgresProductionSourceOverrides(overrides) {
  if (!Array.isArray(overrides)
    || overrides.length !== JSON_POSTGRES_PRODUCTION_SOURCE_OVERRIDES.length) {
    throw new Error("production source override set is incomplete");
  }
  const expected = new Map(
    JSON_POSTGRES_PRODUCTION_SOURCE_OVERRIDES.map((entry) => [entry.target_path, entry]),
  );
  for (const override of overrides) {
    const contract = expected.get(override?.target_path);
    if (!contract
      || override.source_path !== contract.source_path
      || override.purpose !== contract.purpose
      || !SHA256.test(String(override.sha256 ?? ""))
      || !Number.isSafeInteger(override.byte_size)
      || override.byte_size < 1) {
      throw new Error("production source override binding is invalid");
    }
    const text = String(override.text ?? "");
    if (Buffer.byteLength(text) !== override.byte_size || REAL_IDENTITY_MARKER.test(text)) {
      throw new Error("production source override contains real identity material");
    }
    if (override.target_path.endsWith("amic-client-candidates.js")
      && !/AMIC_CURRENT_CLIENT_CANDIDATES\s*=\s*Object\.freeze\(\[\]\)/u.test(text)) {
      throw new Error("production client candidate source must be empty");
    }
    if (override.target_path.endsWith("lawos-role-registry.js")
      && (!text.includes('LAWOS_ROLE_REGISTRY_SOURCE = "postgres-v2-account-membership"')
        || !text.includes("LAWOS_INTERNAL_ROLE_ASSIGNMENTS = Object.freeze([])"))) {
      throw new Error("production role source must use PostgreSQL membership only");
    }
    expected.delete(override.target_path);
  }
  if (expected.size) throw new Error("production source override target is missing");
  return Object.freeze({
    override_count: overrides.length,
    packaged_real_client_count: 0,
    packaged_static_role_assignment_count: 0,
  });
}

export function validateJsonPostgresProductionArtifactEntries(entries, { profilePhotoArtifact } = {}) {
  const profilePhotoBinding =
    validateJsonPostgresProductionProfilePhotoArtifactBinding(profilePhotoArtifact);
  const raw = entries.map((entry) => String(entry).replace(/^\.\//u, ""));
  if (raw.some((entry) =>
    !entry
    || entry.includes("\\")
    || entry.startsWith("/")
    || entry.split("/").includes(".."))) {
    throw new Error("production artifact contains an unsafe archive path");
  }
  if (new Set(raw).size !== raw.length) throw new Error("production artifact contains a duplicate entry");
  const normalized = [...raw].sort();
  const required = [
    "apps/api/src/lambda.js",
    "apps/api/src/json-postgres-program-admin-lambda.js",
    "apps/api/src/immutable-program-input.js",
    "apps/api/src/matter-vault-user-registration-seed.json",
    "apps/api/src/hrx-member-roster-source-of-truth.json",
    JSON_POSTGRES_PRODUCTION_PUBLIC_PROFILE_CATALOG_ENTRY,
    "certs/global-bundle.pem",
    "deployment-manifest.json",
    "package.json",
    "packages/dms/src/json-postgres-dms-migration.js",
    "packages/persistence/src/postgres/execution-contract.js",
    "packages/persistence/src/postgres/migration-runner.js",
    "packages/persistence/src/postgres/program-receipt.js",
    profilePhotoBinding.metadata_path,
  ];
  for (const path of required) {
    if (!normalized.includes(path)) throw new Error(`production artifact is missing ${path}`);
  }
  const forbidden = normalized.filter((entry) =>
    (entry !== "certs/global-bundle.pem" && FORBIDDEN_ARCHIVE_ENTRY.test(entry))
    || (!entry.startsWith("node_modules/") && FIRST_PARTY_TEST_ENTRY.test(entry))
    || entry.startsWith("infra/")
    || entry.startsWith("scripts/")
    || PRIVATE_STAGING_SOURCE.test(entry));
  if (forbidden.length) {
    throw new Error(`production artifact contains forbidden entries: ${forbidden.slice(0, 5).join(", ")}`);
  }
  const runtimeStores = normalized.filter((entry) =>
    /(^|\/)(?:runtime-stores?|runtime_store|store-data)(\/|$)/iu.test(entry)
    || /(?:^|\/)(?:hrx|master-data|matter|dms|crm|intake|finance|analytics|portal|auth)-(?:store|runtime)\.json$/iu.test(entry));
  if (runtimeStores.length) throw new Error("production artifact contains a legacy runtime store");
  const profilePhotoEntries = normalized.filter((entry) =>
    entry.startsWith(`${JSON_POSTGRES_PRODUCTION_PROFILE_PHOTO_DIRECTORY}/`));
  if (profilePhotoEntries.length !== profilePhotoBinding.injected_photo_entry_count
    || profilePhotoEntries.some((entry) => !PROFILE_PHOTO_ARCHIVE_ENTRY.test(entry))) {
    throw new Error("production artifact must contain exactly ten externally injected profile-photo entries");
  }
  return Object.freeze({
    entry_count: normalized.length,
    forbidden_entry_count: 0,
    runtime_store_entry_count: 0,
    real_json_store_count: 0,
    private_staging_entry_count: 0,
    profile_photo_entry_count: profilePhotoEntries.length,
  });
}

export function validateJsonPostgresProductionDeploymentManifest(manifest) {
  const profilePhotoArtifact =
    validateJsonPostgresProductionProfilePhotoArtifactBinding(manifest?.profile_photo_artifact);
  if (manifest?.schema_version !== JSON_POSTGRES_PRODUCTION_ARTIFACT_SCHEMA
    || manifest?.data_scope !== "approved-immutable-inputs-only"
    || manifest?.operational_authority !== "postgres-v2"
    || manifest?.json_fallback !== false
    || manifest?.json_writer !== false
    || manifest?.dual_write !== false
    || manifest?.file_current_authority !== false
    || manifest?.offline_mutation !== false
    || manifest?.memory_fallback !== false
    || manifest?.packaged_real_identity_count !== 0
    || manifest?.packaged_real_client_count !== 0
    || manifest?.packaged_static_role_assignment_count !== 0
    || manifest?.packaged_private_profile_photo_count !== profilePhotoArtifact.injected_photo_entry_count
    || manifest?.secrets_in_environment !== false
    || manifest?.production_ready_claim !== false) {
    throw new Error("production deployment manifest authority boundary drifted");
  }
  return Object.freeze({
    verdict: "PASS",
    data_scope: manifest.data_scope,
    operational_authority: manifest.operational_authority,
    legacy_authority_counter_total: 0,
    profile_photo_generation_ref: profilePhotoArtifact.generation_ref,
  });
}
