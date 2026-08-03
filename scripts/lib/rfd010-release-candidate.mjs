import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  readlinkSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { TextDecoder } from "node:util";
import {
  assertDesktopReleaseArtifactPath,
  desktopReleaseArtifactRelativeRoot,
} from "./matter-desktop-release-paths.mjs";

export const RFD010_SCHEMA_VERSION = "law-firm-os.rfd010-release-candidate-preflight.v1";
export const RFD010_TUW_ID = "RFD-TUW-010";
export const RFD010_DEFAULT_OUTPUT = ".omo/evidence/rfd010-release-candidate/current-receipt.json";
export const RFD010_SNAPSHOT_SCHEMA = "law-firm-os.rfd010-git-object-snapshot.v1";
export const RFD010_SNAPSHOT_MANIFEST_SUFFIX = ".snapshot.json";
export const RFD010_STATUSES = Object.freeze([
  "PASS",
  "BLOCKED",
  "DEFERRED_EXTERNAL_AUTHORITY",
  "NOT_EXECUTED",
]);

const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/;
// Keep the release boundary on the actual SemVer grammar. In particular,
// reject leading-zero numeric components and empty prerelease/build labels
// that the old permissive expression accepted (for example `1.2.3-.`).
const VERSION_PATTERN = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|[0-9A-Za-z-]*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const SAFE_RELEASE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const RELEASE_BRANCH_PATTERNS = [
  /^main$/,
  /^integration\/forest-v\d+\.\d+\.\d+$/,
  /^release\/forest-v\d+\.\d+\.\d+$/,
];
const MANIFEST_NAMES = new Set(["release-manifest.json", "artifact-index.json"]);
const SKIPPED_DIRECTORY_NAMES = new Set([".git", "node_modules"]);
const MAX_DISCOVERED_FILES = 25_000;
const SNAPSHOT_ROOT_REDACTION = "[snapshot-redacted]";
const SNAPSHOT_CLEANUP_CAPABILITY = Symbol("rfd010SnapshotCleanupCapability");
const SOURCE_STATUS_SCOPES = new Set(["precondition_before_snapshot_seal", "post_snapshot_checkpoint"]);
const LOCAL_CHECK_KEYS = Object.freeze([
  "diff_check",
  "status_empty",
  "head_matches_expected_sha",
  "tree_matches_expected_tree",
  "release_authorized_branch",
  "source_identity",
  "package_versions_consistent",
  "lockfile_versions_bound",
  "candidate_snapshot",
  "formal_artifact_root",
  "artifact_root_collision",
  "local_tag_collision",
  "local_release_manifest_collision",
  "artifact_records_unique",
  "artifact_file_collision",
  "authoritative_receipt",
]);
const RECEIPT_INPUT_KEYS = Object.freeze([
  "expected_source_sha",
  "expected_source_tree",
  "version",
  "release_id",
  "tag",
  "channel",
  "requested_channel",
]);
const RECEIPT_OBSERVED_KEYS = Object.freeze([
  "source_sha",
  "source_tree",
  "source_branch",
  "source_dirty",
  "dirty_entry_count",
  "package_version",
  "desktop_package_version",
  "lockfile_version",
  "lockfile_root_version",
  "lockfile_desktop_version",
  "artifact_root",
  "artifact_root_absolute",
  "source_status_scope",
  "source_status_observed_at",
  "candidate_snapshot_relative_root",
  "candidate_snapshot_manifest_sha256",
  "candidate_snapshot_file_count",
  "candidate_snapshot_read_only",
  "candidate_snapshot_root",
  "authoritative_receipt_supplied",
]);
const RECEIPT_KEYS = Object.freeze([
  "schema_version",
  "tuw_id",
  "generated_at",
  "mode",
  "verdict",
  "local_verdict",
  "release_authority_status",
  "input",
  "observed",
  "checks",
  "external_authority",
  "execution",
  "mutation_guard",
  "evidence_write",
  "errors",
  "summary",
]);

function status(statusValue, reasonCode, extra = {}) {
  const result = { status: statusValue };
  if (reasonCode) result.reason_code = reasonCode;
  return Object.assign(result, extra);
}

function blocked(reasonCode, extra = {}) {
  return status("BLOCKED", reasonCode, extra);
}

function pass(extra = {}) {
  return status("PASS", undefined, extra);
}

function deferred(reasonCode = "no_authoritative_receipt", extra = {}) {
  return status("DEFERRED_EXTERNAL_AUTHORITY", reasonCode, extra);
}

function sanitizedError(code) {
  const messages = {
    invalid_expected_source_sha: "expected source SHA must be a full Git object ID",
    invalid_expected_source_tree: "expected source tree must be a full Git object ID",
    invalid_version: "release version must be semantic",
    invalid_channel: "release channel is not supported",
    invalid_release_id: "release ID is not a safe release identifier",
    invalid_tag: "release tag is not a safe release identifier",
    release_id_tag_mismatch: "release ID and tag must identify the same candidate",
    repository_unavailable: "repository could not be inspected locally",
    package_unavailable: "package metadata could not be inspected locally",
    manifest_unavailable: "local release manifest could not be inspected",
    malformed_authority_receipt: "authoritative receipt requires a separate trusted validator",
    separate_authority_validator_required: "remote authority is deferred to the separate trusted validator",
    worktree_dirty: "working tree is not clean",
    source_state_changed: "source state changed during the read-only preflight",
    snapshot_unavailable: "immutable Git-object candidate snapshot could not be materialized",
    snapshot_manifest_mismatch: "immutable candidate snapshot bytes or members changed",
    diff_check_failed: "whitespace error was found by diff check",
    source_sha_mismatch: "HEAD does not match the expected source SHA",
    source_tree_mismatch: "HEAD tree does not match the expected source tree",
    unauthorized_branch: "current ref is not release-authorized",
    package_version_mismatch: "root and desktop package versions do not match the candidate",
    lockfile_unavailable: "package lockfile is missing",
    lockfile_version_mismatch: "package lockfile versions do not match the candidate",
    manifest_scan_incomplete: "local manifest scan did not complete safely",
    invalid_release_input: "release candidate input is invalid",
    local_tag_exists: "an exact local tag already exists",
    artifact_root_exists: "the exact release artifact root already exists",
    release_manifest_artifact_root_collision: "a local release manifest or artifact entry reserves the exact release artifact root",
    artifact_root_file_collision: "a file occupies the release artifact path",
    artifact_root_symlink: "a symlink occupies the release artifact path",
    artifact_path_symlink: "a release artifact path is a symlink",
    artifact_path_outside_repo: "a release artifact path resolves outside the repository",
    artifact_path_unreadable: "a release artifact path could not be inspected",
    artifact_root_outside_repo: "the release artifact root resolves outside the repository",
    artifact_root_unreadable: "the release artifact root could not be inspected",
    release_manifest_id_collision: "a local release manifest already uses this release ID or tag",
    release_manifest_artifact_root_mismatch: "a local release manifest has a conflicting artifact root",
    artifact_records_conflict: "release artifact IDs or paths are not unique",
    artifact_file_exists: "a release artifact file already exists",
  };
  return { code, message: messages[code] ?? "local release preflight check failed" };
}

function normalizeChannel(channel) {
  if (channel === "formal-candidate") return "formal";
  return channel;
}

// Mirrors `git check-ref-format refs/tags/<name>` without invoking a remote or
// mutating command. Tags may contain slash-separated components, but empty,
// dot-prefixed, dot-suffixed, `.lock`, control, and ref-special components are
// rejected exactly at the local trust boundary.
function isGitTagRefName(value) {
  if (typeof value !== "string" || value.length === 0) return false;
  if (value === "@" || value.startsWith("/") || value.endsWith("/") || value.includes("//")) return false;
  if (value.includes("..") || value.includes("@{")) return false;
  if ([...value].some((character) => (
    character.codePointAt(0) <= 0x20 || "~^:?*[]\\".includes(character)
  ))) return false;
  const components = value.split("/");
  if (components.some((component) => (
    component.length === 0
    || component.startsWith(".")
    || component.endsWith(".")
    || component.endsWith(".lock")
  ))) return false;
  return true;
}

function inputValue(input, ...names) {
  for (const name of names) {
    if (input?.[name] !== undefined && input?.[name] !== null && input?.[name] !== "") {
      return input[name];
    }
  }
  return undefined;
}

export function normalizeRfd010Input(input = {}) {
  const version = inputValue(input, "version", "releaseVersion");
  const releaseId = inputValue(input, "releaseId", "release_id")
    ?? (typeof version === "string" ? `matter-desktop-v${version}` : undefined);
  const tag = inputValue(input, "tag", "githubReleaseTag", "github_release_tag") ?? releaseId;
  return {
    repoRoot: path.resolve(input.repoRoot ?? process.cwd()),
    expectedSourceSha: inputValue(
      input,
      "expectedSourceSha",
      "expected_source_sha",
      "expectedSha",
      "sourceSha",
      "source_sha",
    ),
    expectedSourceTree: inputValue(
      input,
      "expectedSourceTree",
      "expected_source_tree",
      "expectedTree",
      "sourceTree",
      "source_tree",
    ),
    version,
    releaseId,
    tag,
    requestedChannel: inputValue(input, "channel", "releaseChannel", "release_channel") ?? "formal",
    channel: normalizeChannel(inputValue(input, "channel", "releaseChannel", "release_channel") ?? "formal"),
    authoritativeReceipt: inputValue(input, "authoritativeReceipt", "authoritative_receipt", "externalAuthorityReceipt"),
    artifacts: Array.isArray(input.artifacts) ? input.artifacts : undefined,
  };
}

export function assertRfd010ReleaseCandidateInput(input) {
  const normalized = normalizeRfd010Input(input);
  if (!FULL_SHA_PATTERN.test(normalized.expectedSourceSha ?? "")) {
    throw new Error(sanitizedError("invalid_expected_source_sha").message);
  }
  if (!FULL_SHA_PATTERN.test(normalized.expectedSourceTree ?? "")) {
    throw new Error(sanitizedError("invalid_expected_source_tree").message);
  }
  if (!VERSION_PATTERN.test(normalized.version ?? "")) {
    throw new Error(sanitizedError("invalid_version").message);
  }
  if (!["dev", "internal", "candidate", "formal"].includes(normalized.channel)) {
    throw new Error(sanitizedError("invalid_channel").message);
  }
  if (!SAFE_RELEASE_ID_PATTERN.test(normalized.releaseId ?? "") || normalized.releaseId.includes("..")) {
    throw new Error(sanitizedError("invalid_release_id").message);
  }
  if (!SAFE_RELEASE_ID_PATTERN.test(normalized.tag ?? "") || !isGitTagRefName(normalized.tag)) {
    throw new Error(sanitizedError("invalid_tag").message);
  }
  if (normalized.releaseId !== normalized.tag) {
    throw new Error(sanitizedError("release_id_tag_mismatch").message);
  }
  return normalized;
}

function runGit(repoRoot, args) {
  try {
    return {
      ok: true,
      value: execFileSync("git", args, {
        cwd: repoRoot,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 16 * 1024 * 1024,
      }).trim(),
    };
  } catch {
    return { ok: false, value: "" };
  }
}

function runGitObjectDiffCheck(repoRoot, sourceSha) {
  try {
    // `diff-tree` otherwise emits no patch for a merge commit whose tree is
    // equal to its first-parent result. `-m` asks Git to check every parent
    // diff, including whitespace introduced while resolving a merge.
    execFileSync("git", ["diff-tree", "--check", "--root", "-r", "--no-commit-id", "-m", sourceSha, "--"], {
      cwd: repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

function sha256Bytes(value) {
  return createHash("sha256").update(value).digest("hex");
}

function canonicalJson(value) {
  return JSON.stringify(value);
}

function snapshotMemberMode(info) {
  return info.mode & 0o777;
}

function snapshotMemberPath(root, absolute) {
  return portable(path.relative(root, absolute));
}

const UTF8_DECODER = new TextDecoder("utf-8", { fatal: true });

function decodeSnapshotBytes(bytes) {
  try {
    return UTF8_DECODER.decode(bytes);
  } catch {
    throw new Error("snapshot_manifest_mismatch");
  }
}

function canonicalSnapshotPath(value, { allowTrailingSlash = false } = {}) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || value.includes("//")) {
    throw new Error("snapshot_manifest_mismatch");
  }
  if (value.includes("\\") || path.posix.isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
    throw new Error("snapshot_manifest_mismatch");
  }
  const withoutTrailingSlash = allowTrailingSlash ? value.replace(/\/+$/, "") : value;
  if (!withoutTrailingSlash || withoutTrailingSlash.startsWith("/")) {
    throw new Error("snapshot_manifest_mismatch");
  }
  const segments = withoutTrailingSlash.split("/");
  if (segments.some((segment) => segment.length === 0 || segment === "." || segment === "..")) {
    throw new Error("snapshot_manifest_mismatch");
  }
  const normalized = segments.join("/");
  if (path.posix.normalize(normalized) !== normalized) {
    throw new Error("snapshot_manifest_mismatch");
  }
  return normalized;
}

function safeSnapshotSymlinkTarget(root, absolute, target) {
  if (typeof target !== "string" || target.length === 0 || target.includes("\0")
    || target.includes("\\") || path.posix.isAbsolute(target) || path.win32.isAbsolute(target)
    || /^[A-Za-z]:/.test(target)) {
    throw new Error("snapshot_manifest_mismatch");
  }
  const resolved = path.resolve(path.dirname(absolute), target);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("snapshot_manifest_mismatch");
  }
  return target;
}

function collectSnapshotMembers(root) {
  const members = [];
  const canonicalPaths = new Map();
  const visit = (directory) => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true })
        .sort((left, right) => left.name < right.name ? -1 : left.name > right.name ? 1 : 0);
    } catch {
      throw new Error("snapshot_unavailable");
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      let info;
      try {
        info = lstatSync(absolute);
      } catch {
        throw new Error("snapshot_unavailable");
      }
      const relativePath = snapshotMemberPath(root, absolute);
      canonicalSnapshotPath(relativePath);
      const unicodeKey = relativePath.normalize("NFC");
      if (canonicalPaths.has(unicodeKey)) throw new Error("snapshot_manifest_mismatch");
      canonicalPaths.set(unicodeKey, relativePath);
      if (info.isSymbolicLink()) {
        let target;
        try {
          target = readlinkSync(absolute, "utf8");
        } catch {
          throw new Error("snapshot_unavailable");
        }
        safeSnapshotSymlinkTarget(root, absolute, target);
        members.push({ path: relativePath, kind: "symlink", mode: 0, target });
        continue;
      }
      if (info.isDirectory()) {
        members.push({ path: relativePath, kind: "directory", mode: snapshotMemberMode(info) });
        visit(absolute);
        continue;
      }
      if (!info.isFile() || info.nlink > 1) throw new Error("snapshot_manifest_mismatch");
      let bytes;
      try {
        bytes = readFileSync(absolute);
      } catch {
        throw new Error("snapshot_unavailable");
      }
      members.push({
        path: relativePath,
        kind: "file",
        mode: snapshotMemberMode(info),
        bytes: bytes.length,
        sha256: sha256Bytes(bytes),
      });
    }
  };
  visit(root);
  return members;
}

function snapshotManifest({ sourceSha, sourceTree, version, channel, members }) {
  const manifest = {
    schema_version: RFD010_SNAPSHOT_SCHEMA,
    source_sha: sourceSha,
    source_tree: sourceTree,
    version,
    channel,
    members,
  };
  return {
    ...manifest,
    file_count: members.filter((member) => member.kind === "file").length,
    sha256: sha256Bytes(canonicalJson(manifest)),
  };
}

function makeSnapshotReadOnly(root) {
  const visit = (directory) => {
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      throw new Error("snapshot_unavailable");
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const info = lstatSync(absolute);
      if (info.isSymbolicLink()) {
        let target;
        try {
          target = readlinkSync(absolute, "utf8");
        } catch {
          throw new Error("snapshot_unavailable");
        }
        safeSnapshotSymlinkTarget(root, absolute, target);
      } else if (info.isDirectory()) visit(absolute);
      else if (!info.isFile()) throw new Error("snapshot_manifest_mismatch");
      else {
        if (info.nlink > 1) throw new Error("snapshot_manifest_mismatch");
        chmodSync(absolute, info.mode & 0o555);
      }
    }
    const directoryMode = lstatSync(directory).mode & 0o555;
    chmodSync(directory, directoryMode || 0o555);
  };
  visit(root);
}

function readGitTreeEntries(repoRoot, sourceSha) {
  let output;
  try {
    output = execFileSync("git", ["ls-tree", "-r", "-z", "--full-tree", sourceSha], {
      cwd: repoRoot,
      encoding: "buffer",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    throw new Error("snapshot_unavailable");
  }
  const expected = new Map();
  const directories = new Set();
  const canonicalPaths = new Map();
  const addDirectoryPrefixes = (relativePath) => {
    const segments = relativePath.split("/");
    for (let index = 1; index < segments.length; index += 1) {
      directories.add(segments.slice(0, index).join("/"));
    }
  };
  for (const record of output.toString("binary").split("\0")) {
    if (!record) continue;
    const tabIndex = record.indexOf("\t");
    const header = tabIndex >= 0 ? record.slice(0, tabIndex) : "";
    const rawPath = tabIndex >= 0 ? Buffer.from(record.slice(tabIndex + 1), "binary") : null;
    const parts = header.split(" ");
    if (!rawPath || parts.length !== 3) throw new Error("snapshot_manifest_mismatch");
    const [mode, type, object] = parts;
    const relativePath = canonicalSnapshotPath(decodeSnapshotBytes(rawPath));
    const unicodeKey = relativePath.normalize("NFC");
    if (canonicalPaths.has(unicodeKey)) throw new Error("snapshot_manifest_mismatch");
    canonicalPaths.set(unicodeKey, relativePath);
    if (!FULL_SHA_PATTERN.test(object)) throw new Error("snapshot_manifest_mismatch");
    if (mode === "160000" || type === "commit") throw new Error("snapshot_manifest_mismatch");
    if (mode !== "100644" && mode !== "100755" && mode !== "120000") {
      throw new Error("snapshot_manifest_mismatch");
    }
    const kind = mode === "120000" ? "symlink" : "file";
    expected.set(relativePath, { kind, mode, object });
    addDirectoryPrefixes(relativePath);
  }
  return { expected, directories };
}

function readTarString(bytes, offset, length) {
  const field = bytes.subarray(offset, offset + length);
  const end = field.findIndex((value) => value === 0);
  return decodeSnapshotBytes(end === -1 ? field : field.subarray(0, end));
}

function readTarNumber(bytes, offset, length) {
  const field = bytes.subarray(offset, offset + length);
  if (field.length > 0 && (field[0] & 0x80) !== 0) throw new Error("snapshot_manifest_mismatch");
  const text = decodeSnapshotBytes(field).replace(/\0.*$/s, "").trim();
  if (!text) return 0;
  if (!/^[0-7]+$/.test(text)) throw new Error("snapshot_manifest_mismatch");
  const value = Number.parseInt(text, 8);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("snapshot_manifest_mismatch");
  return value;
}

function assertTarHeaderChecksum(header) {
  const expected = readTarNumber(header, 148, 8);
  let actual = 0;
  for (let index = 0; index < header.length; index += 1) {
    actual += index >= 148 && index < 156 ? 0x20 : header[index];
  }
  if (actual !== expected) throw new Error("snapshot_manifest_mismatch");
}

function parsePaxHeaders(payload) {
  const headers = {};
  let offset = 0;
  while (offset < payload.length) {
    const space = payload.indexOf(0x20, offset);
    if (space < 0) throw new Error("snapshot_manifest_mismatch");
    const recordLength = Number.parseInt(payload.subarray(offset, space).toString("ascii"), 10);
    if (!Number.isSafeInteger(recordLength) || recordLength < 5 || offset + recordLength > payload.length) {
      throw new Error("snapshot_manifest_mismatch");
    }
    const record = decodeSnapshotBytes(payload.subarray(space + 1, offset + recordLength));
    if (!record.endsWith("\n")) throw new Error("snapshot_manifest_mismatch");
    const equals = record.indexOf("=");
    if (equals <= 0) throw new Error("snapshot_manifest_mismatch");
    headers[record.slice(0, equals)] = record.slice(equals + 1, -1);
    offset += recordLength;
  }
  return headers;
}

function verifySnapshotBlob(object, bytes) {
  const digest = createHash("sha1")
    .update(`blob ${bytes.length}\0`, "utf8")
    .update(bytes)
    .digest("hex");
  if (digest !== object) throw new Error("snapshot_manifest_mismatch");
}

function parseSnapshotTar(archiveBytes, tree, repoRoot) {
  const entries = [];
  const seen = new Map();
  const globalPax = {};
  let pendingPax = null;
  let offset = 0;
  let zeroBlocks = 0;
  while (offset + 512 <= archiveBytes.length) {
    const header = archiveBytes.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((value) => value === 0)) {
      zeroBlocks += 1;
      if (zeroBlocks === 2) {
        if (archiveBytes.subarray(offset).some((value) => value !== 0)) {
          throw new Error("snapshot_manifest_mismatch");
        }
        break;
      }
      continue;
    }
    zeroBlocks = 0;
    assertTarHeaderChecksum(header);
    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const headerPath = prefix ? `${prefix}/${name}` : name;
    const type = String.fromCharCode(header[156] || 0);
    const mode = readTarNumber(header, 100, 8);
    const headerSize = readTarNumber(header, 124, 12);
    const linkname = readTarString(header, 157, 100);
    const paddedSize = Math.ceil(headerSize / 512) * 512;
    if (offset + paddedSize > archiveBytes.length) throw new Error("snapshot_manifest_mismatch");
    const payload = archiveBytes.subarray(offset, offset + headerSize);
    offset += paddedSize;
    if (type === "g") {
      Object.assign(globalPax, parsePaxHeaders(payload));
      continue;
    }
    if (type === "x") {
      pendingPax = parsePaxHeaders(payload);
      continue;
    }
    if (type === "L" || type === "K" || type === "1" || (type >= "3" && type <= "7" && type !== "5")) {
      throw new Error("snapshot_manifest_mismatch");
    }
    const pax = { ...globalPax, ...(pendingPax ?? {}) };
    pendingPax = null;
    const effectivePath = pax.path ?? headerPath;
    const relativePath = canonicalSnapshotPath(effectivePath, { allowTrailingSlash: type === "5" });
    const unicodeKey = relativePath.normalize("NFC");
    if (seen.has(unicodeKey)) throw new Error("snapshot_manifest_mismatch");
    seen.set(unicodeKey, relativePath);
    const expected = tree.expected.get(relativePath);
    const isDirectory = type === "5";
    if (isDirectory) {
      if (headerSize !== 0) throw new Error("snapshot_manifest_mismatch");
      if (!tree.directories.has(relativePath)) throw new Error("snapshot_manifest_mismatch");
      entries.push({ path: relativePath, kind: "directory", mode });
      continue;
    }
    if (!expected) throw new Error("snapshot_manifest_mismatch");
    if (expected.kind === "file" && (type === "\0" || type === "0")) {
      if (expected.mode === "100755" && (mode & 0o111) === 0) throw new Error("snapshot_manifest_mismatch");
      if (expected.mode === "100644" && (mode & 0o111) !== 0) throw new Error("snapshot_manifest_mismatch");
      verifySnapshotBlob(expected.object, payload);
      entries.push({ path: relativePath, kind: "file", mode: expected.mode === "100755" ? 0o755 : 0o644, bytes: payload });
      continue;
    }
    if (expected.kind === "symlink" && type === "2") {
      const target = pax.linkpath ?? linkname;
      const targetBytes = Buffer.from(target, "utf8");
      let blob;
      try {
        blob = execFileSync("git", ["cat-file", "blob", expected.object], {
          cwd: repoRoot,
          encoding: "buffer",
          stdio: ["ignore", "pipe", "pipe"],
          maxBuffer: 1024 * 1024,
        });
      } catch {
        throw new Error("snapshot_unavailable");
      }
      if (!blob.equals(targetBytes)) throw new Error("snapshot_manifest_mismatch");
      entries.push({ path: relativePath, kind: "symlink", target });
      continue;
    }
    throw new Error("snapshot_manifest_mismatch");
  }
  if (zeroBlocks < 2 || pendingPax !== null) throw new Error("snapshot_manifest_mismatch");
  const expectedPaths = new Set([...tree.expected.keys(), ...tree.directories]);
  if (entries.length !== expectedPaths.size || entries.some((entry) => !expectedPaths.has(entry.path))) {
    throw new Error("snapshot_manifest_mismatch");
  }
  return entries.sort((left, right) => {
    const depth = (value) => value.path.split("/").length;
    return depth(left) - depth(right) || left.path.localeCompare(right.path);
  });
}

function fsyncSnapshotPath(absolute, { directory = false } = {}) {
  let descriptor;
  try {
    descriptor = openSync(absolute, directory ? "r" : "r");
    fsyncSync(descriptor);
  } catch {
    throw new Error("snapshot_unavailable");
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

function fsyncSnapshotTree(root) {
  const visit = (directory) => {
    const entries = readdirSync(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const info = lstatSync(absolute);
      if (info.isDirectory() && !info.isSymbolicLink()) visit(absolute);
      else if (info.isFile()) fsyncSnapshotPath(absolute);
    }
    fsyncSnapshotPath(directory, { directory: true });
  };
  visit(root);
}

function writeSnapshotBytes(descriptor, bytes) {
  let offset = 0;
  while (offset < bytes.length) offset += writeSync(descriptor, bytes, offset, bytes.length - offset);
}

function extractSnapshotEntries(entries, sourceRoot) {
  for (const entry of entries) {
    const absolute = path.join(sourceRoot, ...entry.path.split("/"));
    const parent = path.dirname(absolute);
    const parentInfo = lstatSync(parent);
    if (!parentInfo.isDirectory() || parentInfo.isSymbolicLink()) throw new Error("snapshot_manifest_mismatch");
    if (entry.kind === "directory") {
      mkdirSync(absolute, entry.mode ? (entry.mode & 0o777) : 0o755);
      continue;
    }
    if (entry.kind === "file") {
      const descriptor = openSync(absolute, "wx", entry.mode);
      try {
        writeSnapshotBytes(descriptor, entry.bytes);
        fsyncSync(descriptor);
      } finally {
        closeSync(descriptor);
      }
      continue;
    }
    const target = safeSnapshotSymlinkTarget(sourceRoot, absolute, entry.target);
    symlinkSync(target, absolute);
  }
}

function chmodSnapshotForCleanup(root) {
  const visit = (directory) => {
    let entries = [];
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      try {
        const info = lstatSync(absolute);
        if (info.isDirectory() && !info.isSymbolicLink()) {
          visit(absolute);
          chmodSync(absolute, 0o700);
        } else if (info.isFile()) chmodSync(absolute, 0o600);
      } catch {
        // Cleanup is best effort and never participates in a release verdict.
      }
    }
    try { chmodSync(directory, 0o700); } catch { /* best effort */ }
  };
  visit(root);
}

export function captureRfd010SourcePrecondition(repoRoot) {
  const status = runGit(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const statusConfirm = runGit(repoRoot, ["status", "--porcelain=v1", "--untracked-files=all"]);
  const head = runGit(repoRoot, ["rev-parse", "--verify", "HEAD"]);
  const tree = runGit(repoRoot, ["rev-parse", "--verify", "HEAD^{tree}"]);
  const refs = runGit(repoRoot, ["for-each-ref", "--format=%(refname)=%(objectname)", "refs/heads", "refs/tags"]);
  const branch = runGit(repoRoot, ["branch", "--show-current"]);
  const complete = [status, statusConfirm, head, tree, refs, branch].every((result) => result.ok);
  return {
    complete,
    observed_at: new Date().toISOString(),
    status: statusConfirm.ok ? statusConfirm.value : null,
    status_stable: status.ok && statusConfirm.ok && status.value === statusConfirm.value,
    dirty_entry_count: statusConfirm.ok ? countStatusLines(statusConfirm.value) : null,
    head: head.ok ? head.value : null,
    tree: tree.ok ? tree.value : null,
    refs: refs.ok ? refs.value : null,
    branch: branch.ok ? branch.value : null,
  };
}

export function sameRfd010SourcePrecondition(before, after) {
  return before?.complete === true
    && after?.complete === true
    && before.status === after.status
    && before.status_stable === after.status_stable
    && before.head === after.head
    && before.tree === after.tree
    && before.refs === after.refs
    && before.branch === after.branch;
}

function ensureSnapshotDirectoryChain(parent, segments) {
  const parentInfo = lstatSync(parent);
  if (!parentInfo.isDirectory() || parentInfo.isSymbolicLink()) {
    throw new Error("snapshot_manifest_mismatch");
  }
  let current = parent;
  for (const segment of segments) {
    current = path.join(current, segment);
    try {
      const info = lstatSync(current);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("snapshot_manifest_mismatch");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      mkdirSync(current);
    }
  }
  return current;
}

// Materialize the expected Git commit as an independent, content-addressed
// candidate. The current worktree is never copied: git archive reads the
// immutable object database, so later origin edits cannot alter these bytes.
export function materializeRfd010GitObjectSnapshot({
  repoRoot,
  expectedSourceSha,
  expectedSourceTree,
  version,
  channel,
  snapshotParent,
} = {}) {
  if (!path.isAbsolute(repoRoot ?? "") || !FULL_SHA_PATTERN.test(expectedSourceSha ?? "")
    || !FULL_SHA_PATTERN.test(expectedSourceTree ?? "") || !VERSION_PATTERN.test(version ?? "")
    || !["dev", "internal", "candidate", "formal"].includes(channel)) {
    throw new Error("snapshot_unavailable");
  }
  const commit = runGit(repoRoot, ["rev-parse", "--verify", `${expectedSourceSha}^{commit}`]);
  const tree = runGit(repoRoot, ["rev-parse", "--verify", `${expectedSourceSha}^{tree}`]);
  if (!commit.ok || commit.value !== expectedSourceSha || !tree.ok || tree.value !== expectedSourceTree) {
    throw new Error("snapshot_unavailable");
  }
  const treeEntries = readGitTreeEntries(repoRoot, expectedSourceSha);
  const relativeRoot = desktopReleaseArtifactRelativeRoot({
    version,
    sourceSha: expectedSourceSha,
    channel,
  });
  const ownedParent = snapshotParent === undefined;
  const parent = path.resolve(snapshotParent ?? mkdtempSync(path.join(tmpdir(), "rfd010-snapshot-")));
  if (!ownedParent) mkdirSync(parent, { recursive: true });
  let stagingContainer;
  let promoted = false;
  try {
    const candidateParent = ensureSnapshotDirectoryChain(parent, [version, expectedSourceSha]);
    const candidateContainer = path.join(candidateParent, channel);
    try {
      lstatSync(candidateContainer);
      throw new Error("snapshot_manifest_mismatch");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    stagingContainer = mkdtempSync(path.join(candidateParent, `.rfd010-${channel}-${randomUUID()}-`));
    const sourceRoot = path.join(stagingContainer, "source");
    const artifactRoot = path.join(stagingContainer, "artifacts");
    mkdirSync(sourceRoot);
    mkdirSync(artifactRoot);
    const archivePath = path.join(stagingContainer, ".source.tar");
    execFileSync("git", ["archive", "--format=tar", "--output", archivePath, expectedSourceSha], {
      cwd: repoRoot,
      stdio: ["ignore", "ignore", "ignore"],
    });
    fsyncSnapshotPath(archivePath);
    const archiveBytes = readFileSync(archivePath);
    const entries = parseSnapshotTar(archiveBytes, treeEntries, repoRoot);
    unlinkSync(archivePath);
    extractSnapshotEntries(entries, sourceRoot);
    makeSnapshotReadOnly(sourceRoot);
    chmodSync(artifactRoot, 0o555);
    chmodSync(stagingContainer, 0o555);
    fsyncSnapshotTree(sourceRoot);
    fsyncSnapshotPath(artifactRoot, { directory: true });
    fsyncSnapshotPath(stagingContainer, { directory: true });
    const members = collectSnapshotMembers(sourceRoot);
    const manifest = snapshotManifest({
      sourceSha: expectedSourceSha,
      sourceTree: expectedSourceTree,
      version,
      channel,
      members,
    });
    // The candidate is promoted only after every archive member and manifest
    // byte has been checked in the private staging directory. A prior
    // candidate is never replaced.
    try {
      lstatSync(candidateContainer);
      throw new Error("snapshot_manifest_mismatch");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    renameSync(stagingContainer, candidateContainer);
    promoted = true;
    fsyncSnapshotPath(candidateParent, { directory: true });
    fsyncSnapshotPath(path.dirname(candidateParent), { directory: true });
    fsyncSnapshotPath(path.dirname(path.dirname(candidateParent)), { directory: true });
    const promotedSourceRoot = path.join(candidateContainer, "source");
    const promotedArtifactRoot = path.join(candidateContainer, "artifacts");
    const snapshot = {
      schema_version: RFD010_SNAPSHOT_SCHEMA,
      source_sha: expectedSourceSha,
      source_tree: expectedSourceTree,
      version,
      channel,
      relative_root: relativeRoot,
      root: promotedSourceRoot,
      artifact_root: promotedArtifactRoot,
      manifest,
      manifest_sha256: manifest.sha256,
      file_count: manifest.file_count,
      read_only: true,
      cleanup_root: ownedParent ? parent : null,
    };
    Object.defineProperty(snapshot, SNAPSHOT_CLEANUP_CAPABILITY, {
      value: Object.freeze({
        cleanup_root: ownedParent ? parent : null,
        candidate_root: candidateContainer,
      }),
      enumerable: false,
      configurable: false,
    });
    return snapshot;
  } catch (error) {
    if (!promoted && stagingContainer) {
      chmodSnapshotForCleanup(stagingContainer);
      rmSync(stagingContainer, { recursive: true, force: true });
    }
    if (!promoted && ownedParent) {
      chmodSnapshotForCleanup(parent);
      rmSync(parent, { recursive: true, force: true });
    }
    throw error?.message === "snapshot_manifest_mismatch"
      ? error
      : new Error("snapshot_unavailable");
  }
}

export function validateRfd010GitObjectSnapshot(snapshot, { expectedManifestSha256 } = {}) {
  if (!snapshot || snapshot.schema_version !== RFD010_SNAPSHOT_SCHEMA
    || !path.isAbsolute(snapshot.root ?? "") || !FULL_SHA_PATTERN.test(snapshot.source_sha ?? "")
    || !FULL_SHA_PATTERN.test(snapshot.source_tree ?? "") || !VERSION_PATTERN.test(snapshot.version ?? "")
    || !["dev", "internal", "candidate", "formal"].includes(snapshot.channel)
    || typeof snapshot.relative_root !== "string" || typeof snapshot.manifest_sha256 !== "string") {
    throw new Error("snapshot_unavailable");
  }
  let expectedRelativeRoot;
  try {
    expectedRelativeRoot = desktopReleaseArtifactRelativeRoot({
      version: snapshot.version,
      sourceSha: snapshot.source_sha,
      channel: snapshot.channel,
    });
  } catch {
    throw new Error("snapshot_unavailable");
  }
  if (snapshot.relative_root !== expectedRelativeRoot) throw new Error("snapshot_manifest_mismatch");
  try {
    const rootInfo = lstatSync(snapshot.root);
    const artifactInfo = lstatSync(snapshot.artifact_root);
    const containerPath = path.dirname(snapshot.root);
    const containerInfo = lstatSync(containerPath);
    if (path.basename(snapshot.root) !== "source"
      || path.basename(snapshot.artifact_root) !== "artifacts"
      || path.dirname(snapshot.artifact_root) !== containerPath
      || !containerInfo.isDirectory() || containerInfo.isSymbolicLink() || (containerInfo.mode & 0o222) !== 0
      || !rootInfo.isDirectory() || rootInfo.isSymbolicLink() || (rootInfo.mode & 0o222) !== 0
      || !artifactInfo.isDirectory() || artifactInfo.isSymbolicLink() || (artifactInfo.mode & 0o222) !== 0) {
      throw new Error("snapshot_manifest_mismatch");
    }
    if (readdirSync(snapshot.artifact_root).length !== 0) throw new Error("snapshot_manifest_mismatch");
  } catch (error) {
    throw error?.message === "snapshot_manifest_mismatch" ? error : new Error("snapshot_unavailable");
  }
  const members = collectSnapshotMembers(snapshot.root);
  const manifest = snapshotManifest({
    sourceSha: snapshot.source_sha,
    sourceTree: snapshot.source_tree,
    version: snapshot.version,
    channel: snapshot.channel,
    members,
  });
  const expectedDigest = expectedManifestSha256 ?? snapshot.manifest_sha256;
  if (!/^[0-9a-f]{64}$/.test(expectedDigest)
    || manifest.sha256 !== expectedDigest
    || snapshot.manifest_sha256 !== expectedDigest
    || manifest.file_count !== snapshot.file_count
    || canonicalJson(snapshot.manifest) !== canonicalJson(manifest)
    || snapshot.read_only !== true
    || members.some((member) => (member.mode & 0o222) !== 0)) {
    throw new Error("snapshot_manifest_mismatch");
  }
  const validated = {
    ...snapshot,
    manifest,
    manifest_sha256: manifest.sha256,
    file_count: manifest.file_count,
    read_only: true,
  };
  const capability = snapshot[SNAPSHOT_CLEANUP_CAPABILITY];
  if (capability) Object.defineProperty(validated, SNAPSHOT_CLEANUP_CAPABILITY, {
    value: capability,
    enumerable: false,
    configurable: false,
  });
  return validated;
}

export function rfd010SnapshotManifestPath(receiptPath) {
  if (typeof receiptPath !== "string" || !path.isAbsolute(receiptPath)) {
    throw new Error("RFD010 persisted receipt path is invalid");
  }
  return `${receiptPath}${RFD010_SNAPSHOT_MANIFEST_SUFFIX}`;
}

function persistedSnapshotManifestRecord(snapshot) {
  return {
    schema_version: RFD010_SNAPSHOT_SCHEMA,
    source_sha: snapshot.source_sha,
    source_tree: snapshot.source_tree,
    version: snapshot.version,
    channel: snapshot.channel,
    relative_root: snapshot.relative_root,
    manifest: snapshot.manifest,
    manifest_sha256: snapshot.manifest_sha256,
    file_count: snapshot.file_count,
    read_only: snapshot.read_only,
  };
}

export function validateRfd010PersistedReceiptFile(receiptPath, { repoRoot } = {}) {
  if (typeof receiptPath !== "string" || !path.isAbsolute(receiptPath)
    || typeof repoRoot !== "string" || !path.isAbsolute(repoRoot)) {
    throw new Error("RFD010 persisted receipt path is invalid");
  }
  const assertPersistedFile = (filePath) => {
    let canonicalRepo;
    let canonicalFile;
    let info;
    try {
      canonicalRepo = realpathSync(repoRoot);
      const resolvedFile = path.resolve(filePath);
      info = lstatSync(resolvedFile);
      canonicalFile = realpathSync(resolvedFile);
    } catch {
      throw new Error("RFD010 persisted receipt path is invalid");
    }
    if (!info.isFile() || info.isSymbolicLink() || info.nlink > 1 || !pathInside(canonicalRepo, canonicalFile)) {
      throw new Error("RFD010 persisted receipt path is invalid");
    }
  };
  assertPersistedFile(receiptPath);
  let receipt;
  try {
    receipt = JSON.parse(readFileSync(receiptPath, "utf8"));
  } catch {
    throw new Error("RFD010 persisted receipt is unreadable");
  }
  if (receipt?.checks?.candidate_snapshot?.status !== "PASS") {
    return validateRfd010Receipt(receipt);
  }
  const manifestPath = rfd010SnapshotManifestPath(receiptPath);
  if (!existsSync(manifestPath)) throw new Error("RFD010 sealed snapshot manifest is missing");
  assertPersistedFile(manifestPath);
  let persistedManifest;
  try {
    persistedManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    throw new Error("RFD010 sealed snapshot manifest is missing");
  }
  if (!exactKeys(persistedManifest, [
    "schema_version",
    "source_sha",
    "source_tree",
    "version",
    "channel",
    "relative_root",
    "manifest",
    "manifest_sha256",
    "file_count",
    "read_only",
  ]) || persistedManifest.schema_version !== RFD010_SNAPSHOT_SCHEMA) {
    throw new Error("RFD010 sealed snapshot manifest shape is invalid");
  }
  let snapshot;
  try {
    snapshot = materializeRfd010GitObjectSnapshot({
      repoRoot,
      expectedSourceSha: receipt.input?.expected_source_sha,
      expectedSourceTree: receipt.input?.expected_source_tree,
      version: receipt.input?.version,
      channel: receipt.input?.channel,
    });
    const expected = persistedSnapshotManifestRecord(snapshot);
    if (canonicalJson(persistedManifest) !== canonicalJson(expected)) {
      throw new Error("RFD010 sealed snapshot manifest binding drifted");
    }
    const receiptWithCapability = { ...receipt };
    Object.defineProperty(receiptWithCapability, "candidateSnapshot", {
      value: snapshot,
      enumerable: false,
      configurable: false,
    });
    return validateRfd010Receipt(receiptWithCapability);
  } catch (error) {
    if (error?.message?.startsWith("RFD010 sealed snapshot manifest")) throw error;
    throw new Error("RFD010 sealed snapshot manifest is not recomputable");
  } finally {
    if (snapshot) cleanupRfd010GitObjectSnapshot(snapshot);
  }
}

export function cleanupRfd010GitObjectSnapshot(snapshot) {
  const capability = snapshot?.[SNAPSHOT_CLEANUP_CAPABILITY];
  if (!capability?.cleanup_root || !capability.candidate_root
    || !path.isAbsolute(capability.cleanup_root) || !path.isAbsolute(capability.candidate_root)
    || snapshot.cleanup_root !== capability.cleanup_root
    || path.resolve(snapshot.root ?? "") !== path.join(capability.candidate_root, "source")
    || path.resolve(snapshot.artifact_root ?? "") !== path.join(capability.candidate_root, "artifacts")) return false;
  chmodSnapshotForCleanup(capability.cleanup_root);
  rmSync(capability.cleanup_root, { recursive: true, force: true });
  return true;
}

function countStatusLines(value) {
  return value ? value.split(/\r?\n/).filter(Boolean).length : 0;
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function portable(value) {
  return String(value ?? "").replaceAll("\\", "/");
}

function pathInside(repoRoot, candidatePath) {
  const relative = path.relative(repoRoot, candidatePath);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function collectManifestFiles(repoRoot) {
  const files = [];
  let traversalError = false;
  let capped = false;
  const visit = (directory) => {
    if (files.length >= MAX_DISCOVERED_FILES) {
      capped = true;
      return;
    }
    let entries;
    try {
      entries = readdirSync(directory, { withFileTypes: true });
    } catch {
      traversalError = true;
      return;
    }
    for (const entry of entries) {
      if (files.length >= MAX_DISCOVERED_FILES) {
        capped = true;
        return;
      }
      if (SKIPPED_DIRECTORY_NAMES.has(entry.name)) continue;
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        const relative = portable(path.relative(repoRoot, absolute));
        // Framework/package-manager links are unrelated to release history and
        // must not make every preflight incomplete. Keep fail-closed handling
        // for manifest names and the desktop release namespace itself; the
        // artifact-root/path inspectors independently reject those links.
        if (MANIFEST_NAMES.has(entry.name)
          || relative === "apps/desktop/dist"
          || relative.startsWith("apps/desktop/dist/releases/")) {
          traversalError = true;
        }
      } else if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && MANIFEST_NAMES.has(entry.name)) files.push(absolute);
    }
  };
  visit(repoRoot);
  return { files, traversalError, capped };
}

function localManifestIdentity(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return [];
  return [
    manifest.release_id,
    manifest.github_release_tag,
    manifest.tag,
    manifest.release?.id,
    manifest.release?.release_id,
    manifest.release?.tag,
  ].filter((value) => typeof value === "string");
}

function validateLocalManifestShape(manifest, manifestPath, repoRoot) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return false;
  if (!VERSION_PATTERN.test(manifest.version ?? "")) return false;
  if (!FULL_SHA_PATTERN.test(manifest.source_sha ?? "") || !FULL_SHA_PATTERN.test(manifest.source_tree ?? "")) return false;
  if (manifest.source_dirty !== false || typeof manifest.artifact_root !== "string" || !Array.isArray(manifest.artifacts)) return false;
  const channel = normalizeChannel(manifest.channel);
  if (!["dev", "internal", "candidate", "formal"].includes(channel)) return false;
  try {
    const expectedRoot = desktopReleaseArtifactRelativeRoot({
      version: manifest.version,
      sourceSha: manifest.source_sha,
      channel,
    });
    if (manifest.artifact_root !== expectedRoot) return false;
  } catch {
    return false;
  }
  for (const artifact of manifest.artifacts) {
    if (!artifact || typeof artifact !== "object" || typeof artifact.id !== "string" || artifact.id.length === 0 || typeof artifact.path !== "string") return false;
    const normalizedPath = portable(path.posix.normalize(artifact.path));
    try {
      assertDesktopReleaseArtifactPath({
        relativePath: normalizedPath,
        version: manifest.version,
        sourceSha: manifest.source_sha,
        channel,
      });
    } catch {
      return false;
    }
    const inspected = inspectLocalPath(repoRoot, normalizedPath);
    if (!inspected.safe) return false;
  }
  if (path.basename(manifestPath) === "release-manifest.json") {
    if (localManifestIdentity(manifest).length === 0) return false;
  }
  return true;
}

function artifactRecords(manifest) {
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return [];
  return Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
}

function checkArtifactUniqueness(manifest, relativeRoot, repoRoot) {
  const records = artifactRecords(manifest);
  if (!records.length) return pass({ artifact_count: 0 });
  const ids = new Set();
  const paths = new Set();
  const duplicateIds = new Set();
  const duplicatePaths = new Set();
  let invalidPathCount = 0;
  let existingFileCount = 0;
  let unsafePathCount = 0;
  for (const record of records) {
    if (!record || typeof record !== "object") {
      invalidPathCount += 1;
      continue;
    }
    if (typeof record.id === "string") {
      if (ids.has(record.id)) duplicateIds.add(record.id);
      ids.add(record.id);
    }
    if (typeof record.path !== "string") {
      invalidPathCount += 1;
      continue;
    }
    const normalizedPath = portable(path.posix.normalize(record.path));
    if (paths.has(normalizedPath)) duplicatePaths.add(normalizedPath);
    paths.add(normalizedPath);
    try {
      const manifestChannel = manifest.channel === "formal-candidate" ? "formal" : manifest.channel;
      assertDesktopReleaseArtifactPath({
        relativePath: normalizedPath,
        version: manifest.version,
        sourceSha: manifest.source_sha,
        channel: manifestChannel,
      });
    } catch {
      // A release manifest for an older candidate can legitimately point at its
      // own SHA root. The caller only invokes this check for the candidate root
      // or a colliding release identifier, where this is an actual drift.
      if (manifest.artifact_root === relativeRoot || normalizedPath.startsWith(relativeRoot + "/")) {
        invalidPathCount += 1;
      }
    }
    const candidatePath = manifest.artifact_root === relativeRoot || normalizedPath.startsWith(relativeRoot + "/");
    if (candidatePath) {
      const inspected = inspectLocalPath(repoRoot, normalizedPath);
      if (!inspected.safe) unsafePathCount += 1;
      else if (inspected.exists && inspected.isFile) existingFileCount += 1;
    }
  }
  if (duplicateIds.size || duplicatePaths.size || invalidPathCount || existingFileCount || unsafePathCount) {
    return blocked("artifact_records_conflict", {
      artifact_count: records.length,
      duplicate_id_count: duplicateIds.size,
      duplicate_path_count: duplicatePaths.size,
      invalid_path_count: invalidPathCount,
      existing_file_count: existingFileCount,
      unsafe_path_count: unsafePathCount,
    });
  }
  return pass({ artifact_count: records.length });
}

function inspectLocalPath(repoRoot, relativePath) {
  const normalized = portable(path.posix.normalize(relativePath));
  const absolute = path.resolve(repoRoot, normalized);
  if (!pathInside(repoRoot, absolute)) return { safe: false, reasonCode: "artifact_path_outside_repo", exists: false };
  const segments = normalized.split("/");
  let current = repoRoot;
  for (const segment of segments) {
    current = path.join(current, segment);
    let info;
    try {
      info = lstatSync(current);
    } catch {
      continue;
    }
    if (info.isSymbolicLink()) return { safe: false, reasonCode: "artifact_path_symlink", exists: true };
    if (info.isFile() && current !== absolute) return { safe: false, reasonCode: "artifact_root_file_collision", exists: true };
  }
  if (!existsSync(absolute)) return { safe: true, exists: false };
  try {
    const finalInfo = lstatSync(absolute);
    if (finalInfo.isSymbolicLink()) return { safe: false, reasonCode: "artifact_path_symlink", exists: true };
    const resolved = realpathSync(absolute);
    const canonicalRepoRoot = realpathSync(repoRoot);
    if (!pathInside(canonicalRepoRoot, resolved)) return { safe: false, reasonCode: "artifact_path_outside_repo", exists: true };
    return { safe: true, exists: true, isFile: finalInfo.isFile(), isDirectory: finalInfo.isDirectory() };
  } catch {
    return { safe: false, reasonCode: "artifact_path_unreadable", exists: true };
  }
}

function ancestorFileCollision(repoRoot, relativeRoot) {
  const inspected = inspectLocalPath(repoRoot, relativeRoot);
  if (!inspected.safe) {
    if (inspected.reasonCode === "artifact_path_symlink") return "artifact_root_symlink";
    if (inspected.reasonCode === "artifact_path_outside_repo") return "artifact_root_outside_repo";
    if (inspected.reasonCode === "artifact_path_unreadable") return "artifact_root_unreadable";
    return inspected.reasonCode;
  }
  if (inspected.exists) return inspected.isDirectory ? "artifact_root_exists" : "artifact_root_file_collision";
  return null;
}

function localTagCollision(repoRoot, tag) {
  if (!SAFE_RELEASE_ID_PATTERN.test(tag ?? "") || !isGitTagRefName(tag)) {
    return blocked("invalid_tag");
  }
  try {
    const result = execFileSync("git", ["show-ref", "--verify", "--quiet", `refs/tags/${tag}`], {
      cwd: repoRoot,
      stdio: ["ignore", "ignore", "ignore"],
    });
    void result;
    return blocked("local_tag_exists");
  } catch {
    // `show-ref --verify --quiet` exits 1 for an absent ref. Since this is a
    // read-only probe, an unavailable repository is handled by the main git
    // checks and an absent tag is the normal PASS result.
    const repository = runGit(repoRoot, ["rev-parse", "--git-dir"]);
    if (!repository.ok) return blocked("repository_unavailable");
    return pass();
  }
}

function emptyExecutionStates() {
  return Object.fromEntries(["commit", "push", "pull_request", "merge"].map((operation) => [
    operation,
    {
      status: "NOT_EXECUTED",
      receipt_bound: true,
      reason_code: "read_only_preflight",
    },
  ]));
}

function makeErrorList(checks, inputErrors) {
  const errors = [...inputErrors];
  for (const [name, result] of Object.entries(checks)) {
    if (result.status === "BLOCKED" && result.reason_code) {
      errors.push(sanitizedError(result.reason_code));
      errors[errors.length - 1].check = name;
    }
  }
  const seen = new Set();
  return errors.filter((error) => {
    const key = `${error.check ?? ""}:${error.code}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function checkValidInput(normalized) {
  const errors = [];
  if (!FULL_SHA_PATTERN.test(normalized.expectedSourceSha ?? "")) errors.push(sanitizedError("invalid_expected_source_sha"));
  if (!FULL_SHA_PATTERN.test(normalized.expectedSourceTree ?? "")) errors.push(sanitizedError("invalid_expected_source_tree"));
  if (!VERSION_PATTERN.test(normalized.version ?? "")) errors.push(sanitizedError("invalid_version"));
  if (!["dev", "internal", "candidate", "formal"].includes(normalized.channel)) errors.push(sanitizedError("invalid_channel"));
  if (!SAFE_RELEASE_ID_PATTERN.test(normalized.releaseId ?? "") || normalized.releaseId.includes("..")) errors.push(sanitizedError("invalid_release_id"));
  if (!SAFE_RELEASE_ID_PATTERN.test(normalized.tag ?? "") || !isGitTagRefName(normalized.tag)) errors.push(sanitizedError("invalid_tag"));
  if (normalized.releaseId !== normalized.tag) errors.push(sanitizedError("release_id_tag_mismatch"));
  return errors;
}

export function preflightRfd010ReleaseCandidate(input = {}) {
  const normalized = normalizeRfd010Input(input);
  const inputErrors = checkValidInput(normalized);
  const sourcePrecondition = captureRfd010SourcePrecondition(normalized.repoRoot);
  const snapshotInputValid = FULL_SHA_PATTERN.test(normalized.expectedSourceSha ?? "")
    && FULL_SHA_PATTERN.test(normalized.expectedSourceTree ?? "")
    && VERSION_PATTERN.test(normalized.version ?? "")
    && ["dev", "internal", "candidate", "formal"].includes(normalized.channel);
  let candidateSnapshot = null;
  let candidateSnapshotError = null;
  if (snapshotInputValid) {
    try {
      candidateSnapshot = materializeRfd010GitObjectSnapshot({
        repoRoot: normalized.repoRoot,
        expectedSourceSha: normalized.expectedSourceSha,
        expectedSourceTree: normalized.expectedSourceTree,
        version: normalized.version,
        channel: normalized.channel,
      });
      validateRfd010GitObjectSnapshot(candidateSnapshot, {
        expectedManifestSha256: candidateSnapshot.manifest_sha256,
      });
    } catch (error) {
      candidateSnapshotError = error?.message === "snapshot_manifest_mismatch"
        ? "snapshot_manifest_mismatch"
        : "snapshot_unavailable";
    }
  } else {
    candidateSnapshotError = "snapshot_unavailable";
  }
  const checks = {};
  const observed = {
    source_sha: sourcePrecondition.head,
    source_tree: sourcePrecondition.tree,
    source_branch: sourcePrecondition.complete
      ? (sourcePrecondition.branch === "" ? "DETACHED" : sourcePrecondition.branch)
      : null,
    source_dirty: sourcePrecondition.complete ? sourcePrecondition.dirty_entry_count > 0 : null,
    dirty_entry_count: sourcePrecondition.dirty_entry_count,
    package_version: null,
    desktop_package_version: null,
    lockfile_version: null,
    lockfile_root_version: null,
    lockfile_desktop_version: null,
    source_status_scope: sourcePrecondition.complete ? "precondition_before_snapshot_seal" : null,
    source_status_observed_at: sourcePrecondition.complete ? sourcePrecondition.observed_at : null,
    candidate_snapshot_relative_root: candidateSnapshot?.relative_root ?? null,
    candidate_snapshot_manifest_sha256: candidateSnapshot?.manifest_sha256 ?? null,
    candidate_snapshot_file_count: candidateSnapshot?.file_count ?? null,
    candidate_snapshot_read_only: candidateSnapshot?.read_only ?? null,
    candidate_snapshot_root: candidateSnapshot ? SNAPSHOT_ROOT_REDACTION : null,
  };
  let relativeRoot = null;
  let artifactRoot = null;

  const workingDiffCheck = runGit(normalized.repoRoot, ["diff", "--check", "--"]);
  const objectDiffCheck = snapshotInputValid
    ? runGitObjectDiffCheck(normalized.repoRoot, normalized.expectedSourceSha)
    : { ok: false };
  checks.diff_check = workingDiffCheck.ok && objectDiffCheck.ok ? pass() : blocked("diff_check_failed");

  if (!sourcePrecondition.complete) {
    checks.status_empty = blocked("repository_unavailable");
  } else {
    checks.status_empty = sourcePrecondition.dirty_entry_count === 0
      ? pass()
      : blocked("worktree_dirty", { dirty_entry_count: sourcePrecondition.dirty_entry_count });
  }

  checks.head_matches_expected_sha = sourcePrecondition.complete && FULL_SHA_PATTERN.test(normalized.expectedSourceSha ?? "")
    ? (sourcePrecondition.head === normalized.expectedSourceSha ? pass() : blocked("source_sha_mismatch"))
    : blocked("repository_unavailable");
  checks.tree_matches_expected_tree = sourcePrecondition.complete && FULL_SHA_PATTERN.test(normalized.expectedSourceTree ?? "")
    ? (sourcePrecondition.tree === normalized.expectedSourceTree ? pass() : blocked("source_tree_mismatch"))
    : blocked("repository_unavailable");

  const branchAllowed = sourcePrecondition.complete
    && (sourcePrecondition.branch === "" || RELEASE_BRANCH_PATTERNS.some((pattern) => pattern.test(sourcePrecondition.branch)));
  // Keep unauthorized branch names out of the repo-safe receipt. The branch is
  // still adjudicated below, but a sanitized reason code is sufficient for
  // evidence and avoids echoing operator/worktree names.
  observed.source_branch = sourcePrecondition.complete
    ? (branchAllowed ? (sourcePrecondition.branch || "DETACHED") : "[redacted]")
    : null;
  checks.release_authorized_branch = normalized.channel === "formal"
    ? (branchAllowed ? pass({ detached: sourcePrecondition.branch === "" }) : blocked("unauthorized_branch"))
    : pass({ not_required: true });

  checks.source_identity = sourcePrecondition.complete
    ? pass({ source_dirty: sourcePrecondition.dirty_entry_count > 0 })
    : blocked("repository_unavailable");

  checks.candidate_snapshot = candidateSnapshot
    ? pass({
      manifest_sha256: candidateSnapshot.manifest_sha256,
      file_count: candidateSnapshot.file_count,
      read_only: true,
    })
    : blocked(candidateSnapshotError ?? "snapshot_unavailable");

  // If the expected object cannot be materialized, retain diagnostic package
  // observations from the origin, but the blocked candidate_snapshot check
  // still prevents those observations from becoming release truth.
  const inspectionRoot = candidateSnapshot?.root ?? normalized.repoRoot;
  const rootPackage = inspectionRoot ? readJson(path.join(inspectionRoot, "package.json")) : null;
  const desktopPackage = inspectionRoot ? readJson(path.join(inspectionRoot, "apps/desktop/package.json")) : null;
  const lockfile = inspectionRoot ? readJson(path.join(inspectionRoot, "package-lock.json")) : null;
  observed.package_version = rootPackage?.version ?? null;
  observed.desktop_package_version = desktopPackage?.version ?? null;
  observed.lockfile_version = lockfile?.version ?? null;
  observed.lockfile_root_version = lockfile?.packages?.[""]?.version ?? null;
  observed.lockfile_desktop_version = lockfile?.packages?.["apps/desktop"]?.version ?? null;
  if (!rootPackage || !desktopPackage) {
    checks.package_versions_consistent = blocked("package_unavailable");
  } else if (
    rootPackage.version !== desktopPackage.version
    || rootPackage.version !== normalized.version
    || desktopPackage.version !== normalized.version
  ) {
    checks.package_versions_consistent = blocked("package_version_mismatch");
  } else {
    checks.package_versions_consistent = pass();
  }
  checks.lockfile_versions_bound = !lockfile
    ? blocked("lockfile_unavailable")
    : observed.lockfile_version !== normalized.version
      || observed.lockfile_root_version !== normalized.version
      || observed.lockfile_desktop_version !== normalized.version
      ? blocked("lockfile_version_mismatch")
      : pass();

  if (FULL_SHA_PATTERN.test(normalized.expectedSourceSha ?? "") && VERSION_PATTERN.test(normalized.version ?? "") && ["dev", "internal", "candidate", "formal"].includes(normalized.channel)) {
    relativeRoot = desktopReleaseArtifactRelativeRoot({
      version: normalized.version,
      sourceSha: normalized.expectedSourceSha,
      channel: normalized.channel,
    });
    artifactRoot = path.join(normalized.repoRoot, relativeRoot);
    checks.formal_artifact_root = normalized.channel === "formal"
      ? pass({ relative_path: relativeRoot })
      : pass({ relative_path: relativeRoot, channel: normalized.channel });
    const rootCollisionReason = ancestorFileCollision(normalized.repoRoot, relativeRoot);
    checks.artifact_root_collision = rootCollisionReason
      ? blocked(rootCollisionReason)
      : pass();
  } else {
    checks.formal_artifact_root = blocked("invalid_release_input");
    checks.artifact_root_collision = blocked("invalid_release_input");
  }

  checks.local_tag_collision = FULL_SHA_PATTERN.test(normalized.expectedSourceSha ?? "")
    ? localTagCollision(normalized.repoRoot, normalized.tag)
    : blocked("invalid_tag");

  const manifestDiscovery = collectManifestFiles(normalized.repoRoot);
  const manifestFiles = manifestDiscovery.files;
  const candidateManifestEntries = [];
  let manifestCollision = false;
  let manifestDrift = false;
  let artifactReservationCollision = false;
  let malformedManifestCount = 0;
  let incompleteManifestCount = 0;
  for (const manifestPath of manifestFiles) {
    const manifest = readJson(manifestPath);
    if (!manifest) {
      malformedManifestCount += 1;
      continue;
    }
    if (!validateLocalManifestShape(manifest, manifestPath, normalized.repoRoot)) {
      incompleteManifestCount += 1;
      continue;
    }
    const identities = localManifestIdentity(manifest);
    const identityCollision = identities.includes(normalized.releaseId) || identities.includes(normalized.tag);
    const inCandidateRoot = artifactRoot ? path.resolve(manifestPath).startsWith(path.resolve(artifactRoot) + path.sep) : false;
    const artifactRootReservation = Boolean(relativeRoot && manifest.artifact_root === relativeRoot);
    const artifactPathReservation = Boolean(relativeRoot && artifactRecords(manifest).some((record) => {
      if (!record || typeof record.path !== "string") return false;
      const normalizedPath = portable(path.posix.normalize(record.path));
      return normalizedPath === relativeRoot || normalizedPath.startsWith(`${relativeRoot}/`);
    }));
    const exactArtifactReservation = artifactRootReservation || artifactPathReservation;
    if (identityCollision || inCandidateRoot || exactArtifactReservation) {
      candidateManifestEntries.push({
        manifestPath,
        manifest,
        identityCollision,
        inCandidateRoot,
        exactArtifactReservation,
      });
      if (identityCollision) manifestCollision = true;
      if (exactArtifactReservation) artifactReservationCollision = true;
      if (inCandidateRoot && manifest.artifact_root && manifest.artifact_root !== relativeRoot) manifestDrift = true;
    }
  }
  checks.local_release_manifest_collision = manifestDiscovery.traversalError || manifestDiscovery.capped
    ? blocked("manifest_scan_incomplete", {
      traversal_error: manifestDiscovery.traversalError,
      capped: manifestDiscovery.capped,
    })
    : malformedManifestCount || incompleteManifestCount
    ? blocked("manifest_unavailable", {
      malformed_manifest_count: malformedManifestCount,
      incomplete_manifest_count: incompleteManifestCount,
    })
    : artifactReservationCollision
    ? blocked("release_manifest_artifact_root_collision", { manifest_count: candidateManifestEntries.length })
    : manifestCollision
    ? blocked("release_manifest_id_collision", { manifest_count: candidateManifestEntries.length })
    : pass();
  if (manifestDrift) checks.local_release_manifest_collision = blocked("release_manifest_artifact_root_mismatch");

  const candidateManifests = candidateManifestEntries.map((entry) => entry.manifest);
  if (normalized.artifacts) candidateManifests.push({
    version: normalized.version,
    source_sha: normalized.expectedSourceSha,
    channel: normalized.channel,
    artifact_root: relativeRoot,
    artifacts: normalized.artifacts,
  });
  const uniquenessResults = candidateManifests.map((manifest) => checkArtifactUniqueness(
    manifest,
    relativeRoot,
    normalized.repoRoot,
  ));
  const conflictResult = uniquenessResults.find((result) => result.status === "BLOCKED");
  checks.artifact_records_unique = conflictResult ?? pass({ artifact_manifest_count: uniquenessResults.length });
  let artifactFileCollisionReason = null;
  for (const manifest of candidateManifests) {
    for (const record of artifactRecords(manifest)) {
      if (!record || typeof record.path !== "string") continue;
      const inspected = inspectLocalPath(normalized.repoRoot, record.path);
      if (!inspected.safe) {
        artifactFileCollisionReason = inspected.reasonCode;
        break;
      }
      if (inspected.exists) {
        artifactFileCollisionReason = "artifact_file_exists";
        break;
      }
    }
    if (artifactFileCollisionReason) break;
  }
  checks.artifact_file_collision = artifactFileCollisionReason
    ? blocked(artifactFileCollisionReason)
    : pass();

  // The source worktree is a precondition observation only. Seal that
  // observation once, after the immutable candidate has been materialized;
  // no later receipt/write step claims that the origin remained unchanged.
  const sourceAtSeal = captureRfd010SourcePrecondition(normalized.repoRoot);
  if (sourcePrecondition.status_stable !== true || !sameRfd010SourcePrecondition(sourcePrecondition, sourceAtSeal)) {
    const complete = sourceAtSeal.complete === true;
    const dirtyEntryCount = complete ? sourceAtSeal.dirty_entry_count : null;
    observed.source_sha = complete ? sourceAtSeal.head : null;
    observed.source_tree = complete ? sourceAtSeal.tree : null;
    observed.source_branch = complete
      ? (sourceAtSeal.branch === "" ? "DETACHED" : sourceAtSeal.branch)
      : null;
    observed.source_dirty = complete ? dirtyEntryCount > 0 : null;
    observed.dirty_entry_count = dirtyEntryCount;
    observed.source_status_scope = complete ? "post_snapshot_checkpoint" : null;
    observed.source_status_observed_at = complete ? sourceAtSeal.observed_at : null;
    checks.status_empty = complete
      ? blocked("source_state_changed", { dirty_entry_count: dirtyEntryCount })
      : blocked("repository_unavailable");
    checks.source_identity = complete
      ? pass({ source_dirty: dirtyEntryCount > 0 })
      : blocked("repository_unavailable");
    checks.head_matches_expected_sha = complete && sourceAtSeal.head === normalized.expectedSourceSha
      ? pass()
      : blocked(complete ? "source_sha_mismatch" : "repository_unavailable");
    checks.tree_matches_expected_tree = complete && sourceAtSeal.tree === normalized.expectedSourceTree
      ? pass()
      : blocked(complete ? "source_tree_mismatch" : "repository_unavailable");
  }
  if (candidateSnapshot) {
    try {
      candidateSnapshot = validateRfd010GitObjectSnapshot(candidateSnapshot, {
        expectedManifestSha256: candidateSnapshot.manifest_sha256,
      });
    } catch (error) {
      checks.candidate_snapshot = blocked(error?.message === "snapshot_manifest_mismatch"
        ? "snapshot_manifest_mismatch"
        : "snapshot_unavailable");
      observed.candidate_snapshot_read_only = false;
    }
  }

  // RFD-TUW-010 deliberately does not adjudicate remote authority. A supplied
  // object/path is recorded only as an input hint; RFD003's trusted validator
  // must independently verify it before any remote status can change.
  const authorityReason = normalized.authoritativeReceipt
    ? "separate_authority_validator_required"
    : "no_authoritative_receipt";
  checks.authoritative_receipt = deferred(authorityReason);
  const externalAuthority = {
    remote_fetch: deferred(authorityReason),
    remote_tag_collision: deferred(authorityReason),
    github_asset_collision: deferred(authorityReason),
  };

  const localChecks = Object.values(checks).filter((result) => result.status === "BLOCKED");
  const localVerdict = localChecks.length || inputErrors.length ? "BLOCKED" : "PASS";
  const externalDeferred = Object.values(externalAuthority).some((result) => result.status === "DEFERRED_EXTERNAL_AUTHORITY");
  const externalBlocked = Object.values(externalAuthority).some((result) => result.status === "BLOCKED");
  const receipt = {
    schema_version: RFD010_SCHEMA_VERSION,
    tuw_id: RFD010_TUW_ID,
    generated_at: new Date().toISOString(),
    mode: "read_only_local_preflight",
    verdict: localVerdict,
    local_verdict: localVerdict,
    release_authority_status: externalBlocked ? "BLOCKED" : "DEFERRED_EXTERNAL_AUTHORITY",
    input: {
      expected_source_sha: normalized.expectedSourceSha ?? null,
      expected_source_tree: normalized.expectedSourceTree ?? null,
      version: normalized.version ?? null,
      release_id: normalized.releaseId ?? null,
      tag: normalized.tag ?? null,
      channel: normalized.channel ?? null,
      requested_channel: normalized.requestedChannel ?? null,
    },
    observed: {
      ...observed,
      artifact_root: relativeRoot,
      artifact_root_absolute: artifactRoot ? "[repo-relative-redacted]" : null,
      authoritative_receipt_supplied: Boolean(normalized.authoritativeReceipt),
    },
    checks,
    external_authority: externalAuthority,
    execution: emptyExecutionStates(),
    mutation_guard: {
      network: false,
      fetch: false,
      commit: false,
      stage: false,
      tag: false,
      push: false,
      pull_request: false,
      merge: false,
      refs_changed: false,
      source_files_changed: false,
      snapshot_files_changed: false,
      evidence_write_by_preflight: false,
      evidence_write_by_cli: false,
    },
    evidence_write: {
      requested: false,
      performed: false,
      source_status_unchanged: null,
      output_path: null,
    },
    errors: makeErrorList(checks, inputErrors),
    summary: {
      local_blocking_check_count: localChecks.length + inputErrors.length,
      external_deferred_check_count: Object.values(externalAuthority).filter((result) => result.status === "DEFERRED_EXTERNAL_AUTHORITY").length,
      execution_not_executed_count: 4,
      release_ready: localVerdict === "PASS" && !externalDeferred && !externalBlocked,
    },
  };
  Object.defineProperty(receipt, "candidateSnapshot", {
    value: candidateSnapshot,
    enumerable: false,
    configurable: false,
  });
  Object.defineProperty(receipt, "sourcePrecondition", {
    value: sourcePrecondition,
    enumerable: false,
    configurable: false,
  });
  return receipt;
}

// Convert a receipt whose source was observed to drift after adjudication into
// an explicit RED diagnostic. It is intentionally still a complete receipt so
// callers can validate and preserve the evidence without ever claiming that
// the original clean/local PASS remained bound to the changed checkout.
export function markRfd010ReceiptSourceDrift(receipt, sourceSnapshot) {
  const complete = sourceSnapshot?.complete === true;
  const dirtyEntryCount = complete && typeof sourceSnapshot.status === "string"
    ? countStatusLines(sourceSnapshot.status)
    : null;
  const expectedSha = receipt.input?.expected_source_sha;
  const expectedTree = receipt.input?.expected_source_tree;
  const headMatches = complete && FULL_SHA_PATTERN.test(expectedSha ?? "") && sourceSnapshot.head === expectedSha;
  const treeMatches = complete && FULL_SHA_PATTERN.test(expectedTree ?? "") && sourceSnapshot.tree === expectedTree;
  const checks = {
    ...receipt.checks,
    status_empty: complete
      ? blocked("source_state_changed", { dirty_entry_count: dirtyEntryCount })
      : blocked("repository_unavailable"),
    source_identity: complete
      ? pass({ source_dirty: true })
      : blocked("repository_unavailable"),
    head_matches_expected_sha: headMatches ? pass() : blocked(complete ? "source_sha_mismatch" : "repository_unavailable"),
    tree_matches_expected_tree: treeMatches ? pass() : blocked(complete ? "source_tree_mismatch" : "repository_unavailable"),
  };
  const inputErrors = (receipt.errors ?? []).filter((error) => error && error.check === undefined);
  const localBlockingCheckCount = Object.values(checks).filter((result) => result.status === "BLOCKED").length + inputErrors.length;
  return {
    ...receipt,
    generated_at: new Date().toISOString(),
    verdict: "BLOCKED",
    local_verdict: "BLOCKED",
    observed: {
      ...receipt.observed,
      source_sha: complete ? sourceSnapshot.head : null,
      source_tree: complete ? sourceSnapshot.tree : null,
      source_dirty: complete ? dirtyEntryCount > 0 : null,
      dirty_entry_count: dirtyEntryCount,
      source_status_scope: complete ? "post_snapshot_checkpoint" : null,
      source_status_observed_at: complete ? sourceSnapshot.observed_at : null,
    },
    checks,
    mutation_guard: {
      ...receipt.mutation_guard,
      source_files_changed: true,
      snapshot_files_changed: false,
      evidence_write_by_preflight: false,
      evidence_write_by_cli: false,
    },
    evidence_write: {
      requested: false,
      performed: false,
      source_status_unchanged: null,
      output_path: null,
    },
    errors: makeErrorList(checks, inputErrors),
    summary: {
      ...receipt.summary,
      local_blocking_check_count: localBlockingCheckCount,
      release_ready: false,
    },
  };
}

export function markRfd010ReceiptSnapshotDrift(receipt, reasonCode = "snapshot_manifest_mismatch") {
  const reason = ["snapshot_manifest_mismatch", "snapshot_unavailable"].includes(reasonCode)
    ? reasonCode
    : "snapshot_manifest_mismatch";
  const checks = {
    ...receipt.checks,
    candidate_snapshot: blocked(reason),
  };
  const inputErrors = (receipt.errors ?? []).filter((error) => error && error.check === undefined);
  const localBlockingCheckCount = Object.values(checks).filter((result) => result.status === "BLOCKED").length + inputErrors.length;
  const diagnostic = {
    ...receipt,
    generated_at: new Date().toISOString(),
    verdict: "BLOCKED",
    local_verdict: "BLOCKED",
    observed: {
      ...receipt.observed,
      candidate_snapshot_relative_root: null,
      candidate_snapshot_manifest_sha256: null,
      candidate_snapshot_file_count: null,
      candidate_snapshot_read_only: null,
      candidate_snapshot_root: null,
    },
    checks,
    mutation_guard: {
      ...receipt.mutation_guard,
      source_files_changed: false,
      snapshot_files_changed: true,
      evidence_write_by_preflight: false,
    },
    evidence_write: {
      requested: false,
      performed: false,
      source_status_unchanged: null,
      output_path: null,
    },
    errors: makeErrorList(checks, inputErrors),
    summary: {
      ...receipt.summary,
      local_blocking_check_count: localBlockingCheckCount,
      release_ready: false,
    },
  };
  Object.defineProperty(diagnostic, "candidateSnapshot", {
    value: receipt.candidateSnapshot ?? null,
    enumerable: false,
    configurable: false,
  });
  return diagnostic;
}

function exactKeys(value, expected) {
  return value
    && typeof value === "object"
    && !Array.isArray(value)
    && JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...expected].sort());
}

function receiptInputErrorCodes(input) {
  const errors = [];
  if (!FULL_SHA_PATTERN.test(input?.expected_source_sha ?? "")) errors.push("invalid_expected_source_sha");
  if (!FULL_SHA_PATTERN.test(input?.expected_source_tree ?? "")) errors.push("invalid_expected_source_tree");
  if (!VERSION_PATTERN.test(input?.version ?? "")) errors.push("invalid_version");
  if (!["dev", "internal", "candidate", "formal"].includes(input?.channel)) errors.push("invalid_channel");
  if (!SAFE_RELEASE_ID_PATTERN.test(input?.release_id ?? "") || input.release_id.includes("..")) errors.push("invalid_release_id");
  if (!SAFE_RELEASE_ID_PATTERN.test(input?.tag ?? "") || !isGitTagRefName(input.tag)) errors.push("invalid_tag");
  if (input.release_id !== input.tag) errors.push("release_id_tag_mismatch");
  return errors;
}

const LOCAL_REASON_CODES = Object.freeze({
  diff_check: ["diff_check_failed"],
  status_empty: ["repository_unavailable", "worktree_dirty", "source_state_changed"],
  head_matches_expected_sha: ["repository_unavailable", "source_sha_mismatch"],
  tree_matches_expected_tree: ["repository_unavailable", "source_tree_mismatch"],
  release_authorized_branch: ["unauthorized_branch"],
  source_identity: ["repository_unavailable"],
  package_versions_consistent: ["package_unavailable", "package_version_mismatch"],
  lockfile_versions_bound: ["lockfile_unavailable", "lockfile_version_mismatch"],
  candidate_snapshot: ["snapshot_unavailable", "snapshot_manifest_mismatch"],
  formal_artifact_root: ["invalid_release_input"],
  artifact_root_collision: [
    "invalid_release_input",
    "artifact_root_exists",
    "artifact_root_file_collision",
    "artifact_root_symlink",
    "artifact_root_outside_repo",
    "artifact_root_unreadable",
  ],
  local_tag_collision: ["invalid_tag", "local_tag_exists", "repository_unavailable"],
  local_release_manifest_collision: [
    "manifest_scan_incomplete",
    "manifest_unavailable",
    "release_manifest_id_collision",
    "release_manifest_artifact_root_collision",
    "release_manifest_artifact_root_mismatch",
  ],
  artifact_records_unique: ["artifact_records_conflict"],
  artifact_file_collision: [
    "artifact_path_symlink",
    "artifact_path_outside_repo",
    "artifact_path_unreadable",
    "artifact_file_exists",
    "artifact_root_file_collision",
  ],
});

function exactCheckKeys(result, expected, label) {
  const alternatives = Array.isArray(expected[0]) ? expected : [expected];
  if (!alternatives.some((shape) => exactKeys(result, shape))) throw new Error(`RFD010 receipt ${label} fields drifted`);
}

function validateLocalCheckShape(name, result, input) {
  const allowedReasons = LOCAL_REASON_CODES[name];
  if (!allowedReasons) {
    if (name !== "authoritative_receipt") throw new Error("RFD010 receipt local check schema is invalid");
    exactCheckKeys(result, ["status", "reason_code"], name);
    if (result.status !== "DEFERRED_EXTERNAL_AUTHORITY") throw new Error("RFD010 receipt authoritative status is invalid");
    return;
  }
  assertBlockedOrPass(result, name);
  if (result.status === "PASS") {
    const passShapes = {
      release_authorized_branch: [
        ["status", "detached"],
        ["status", "not_required"],
      ],
      source_identity: [["status", "source_dirty"]],
      formal_artifact_root: [
        ["status", "relative_path"],
        ["status", "relative_path", "channel"],
      ],
      artifact_records_unique: [
        ["status", "artifact_count"],
        ["status", "artifact_manifest_count"],
      ],
      candidate_snapshot: [["status", "manifest_sha256", "file_count", "read_only"]],
    };
    exactCheckKeys(result, passShapes[name] ?? ["status"], name);
    if (name === "release_authorized_branch" && (result.detached !== undefined && typeof result.detached !== "boolean")
      || name === "release_authorized_branch" && (result.not_required !== undefined && typeof result.not_required !== "boolean")) {
      throw new Error("RFD010 receipt branch check fields are invalid");
    }
    if (name === "source_identity" && typeof result.source_dirty !== "boolean") throw new Error("RFD010 receipt source identity fields are invalid");
    if (name === "formal_artifact_root" && (typeof result.relative_path !== "string"
      || (result.channel !== undefined && !["dev", "internal", "candidate", "formal"].includes(result.channel)))) {
      throw new Error("RFD010 receipt artifact root fields are invalid");
    }
    if (name === "artifact_records_unique"
      && Object.entries(result).some(([key, value]) => key !== "status" && (!Number.isInteger(value) || value < 0))) {
      throw new Error("RFD010 receipt artifact record fields are invalid");
    }
    if (name === "candidate_snapshot"
      && (!/^[0-9a-f]{64}$/.test(result.manifest_sha256)
        || !Number.isInteger(result.file_count)
        || result.file_count < 0
        || result.read_only !== true)) {
      throw new Error("RFD010 receipt candidate snapshot fields are invalid");
    }
    return;
  }
  if (!allowedReasons.includes(result.reason_code)) throw new Error(`RFD010 receipt ${name} reason is invalid`);
  const extraKeys = [];
  if (name === "status_empty" && ["worktree_dirty", "source_state_changed"].includes(result.reason_code)) extraKeys.push("dirty_entry_count");
  if (name === "local_release_manifest_collision") {
    if (result.reason_code === "manifest_scan_incomplete") extraKeys.push("traversal_error", "capped");
    if (result.reason_code === "manifest_unavailable") extraKeys.push("malformed_manifest_count", "incomplete_manifest_count");
    if (["release_manifest_id_collision", "release_manifest_artifact_root_collision"].includes(result.reason_code)) extraKeys.push("manifest_count");
  }
  if (name === "artifact_records_unique" && result.reason_code === "artifact_records_conflict") {
    extraKeys.push("artifact_count", "duplicate_id_count", "duplicate_path_count", "invalid_path_count", "existing_file_count", "unsafe_path_count");
  }
  exactCheckKeys(result, ["status", "reason_code", ...extraKeys], name);
  if (name === "status_empty" && extraKeys.length && (!Number.isInteger(result.dirty_entry_count) || result.dirty_entry_count < 0)) {
    throw new Error("RFD010 receipt dirty check fields are invalid");
  }
  if (name === "local_release_manifest_collision" && result.reason_code === "manifest_scan_incomplete"
    && (typeof result.traversal_error !== "boolean" || typeof result.capped !== "boolean")) {
    throw new Error("RFD010 receipt manifest scan fields are invalid");
  }
  if (name === "local_release_manifest_collision" && result.reason_code === "manifest_unavailable"
    && (![result.malformed_manifest_count, result.incomplete_manifest_count].every((value) => Number.isInteger(value) && value >= 0))) {
    throw new Error("RFD010 receipt manifest fields are invalid");
  }
  if (["local_release_manifest_collision", "artifact_records_unique"].includes(name)
    && extraKeys.some((key) => key.endsWith("count"))
    && extraKeys.map((key) => result[key]).some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error(`RFD010 receipt ${name} count fields are invalid`);
  }
}

function checkResultShape(result, allowedStatuses, label) {
  const scope = ["remote_fetch", "remote_tag_collision", "github_asset_collision"].includes(label)
    ? "receipt external authority"
    : "receipt";
  if (!result || typeof result !== "object" || Array.isArray(result) || !allowedStatuses.includes(result.status)) {
    throw new Error(`RFD010 ${scope} ${label} status is invalid`);
  }
  if (result.status === "PASS" && result.reason_code !== undefined) {
    throw new Error(`RFD010 ${scope} ${label} PASS reason drifted`);
  }
  if (result.status !== "PASS" && (typeof result.reason_code !== "string" || result.reason_code.length === 0)) {
    throw new Error(`RFD010 ${scope} ${label} reason is missing`);
  }
}

function assertBlockedOrPass(result, label) {
  checkResultShape(result, ["PASS", "BLOCKED"], label);
}

function isCanonicalUtcTimestamp(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) return false;
  const [datePart, timePart] = value.slice(0, -1).split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute, second, millisecond] = timePart.split(/[:.]/).map(Number);
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() + 1 === month
    && parsed.getUTCDate() === day
    && parsed.getUTCHours() === hour
    && parsed.getUTCMinutes() === minute
    && parsed.getUTCSeconds() === second
    && parsed.getUTCMilliseconds() === millisecond;
}

export function validateRfd010Receipt(receipt) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) throw new Error("RFD010 receipt must be an object");
  if (!exactKeys(receipt, RECEIPT_KEYS)) throw new Error("RFD010 receipt root shape drifted");
  if (receipt.schema_version !== RFD010_SCHEMA_VERSION) throw new Error("RFD010 receipt schema is invalid");
  if (receipt.tuw_id !== RFD010_TUW_ID) throw new Error("RFD010 receipt TUW binding is invalid");
  if (!isCanonicalUtcTimestamp(receipt.generated_at)) throw new Error("RFD010 receipt generated_at is invalid");
  if (receipt.mode !== "read_only_local_preflight") throw new Error("RFD010 receipt mode is invalid");
  if (!["PASS", "BLOCKED"].includes(receipt.verdict)) throw new Error("RFD010 receipt verdict is invalid");
  if (receipt.local_verdict !== receipt.verdict) throw new Error("RFD010 receipt local verdict drifted");

  if (!exactKeys(receipt.input, RECEIPT_INPUT_KEYS)) throw new Error("RFD010 receipt input shape drifted");
  if (!exactKeys(receipt.observed, RECEIPT_OBSERVED_KEYS)) throw new Error("RFD010 receipt observed shape drifted");
  const input = receipt.input;
  const observed = receipt.observed;
  if (input.expected_source_sha !== null && !FULL_SHA_PATTERN.test(input.expected_source_sha ?? "")) {
    throw new Error("RFD010 receipt input SHA is invalid");
  }
  if (input.expected_source_tree !== null && !FULL_SHA_PATTERN.test(input.expected_source_tree ?? "")) {
    throw new Error("RFD010 receipt input tree is invalid");
  }
  if (input.version !== null && !VERSION_PATTERN.test(input.version ?? "")) throw new Error("RFD010 receipt input version is invalid");
  if (input.channel !== null && !["dev", "internal", "candidate", "formal"].includes(input.channel)) throw new Error("RFD010 receipt input channel is invalid");
  if (input.requested_channel !== null
    && !["dev", "internal", "candidate", "formal", "formal-candidate"].includes(input.requested_channel)) throw new Error("RFD010 receipt requested channel is invalid");
  if (input.channel !== null && input.requested_channel !== input.channel
    && !(input.requested_channel === "formal-candidate" && input.channel === "formal")) throw new Error("RFD010 receipt requested channel binding is invalid");
  for (const key of ["release_id", "tag"]) {
    if (input[key] !== null && typeof input[key] !== "string") throw new Error(`RFD010 receipt input ${key} is invalid`);
  }
  for (const key of ["source_sha", "source_tree"]) {
    if (observed[key] !== null && !FULL_SHA_PATTERN.test(observed[key] ?? "")) throw new Error(`RFD010 receipt observed ${key} is invalid`);
  }
  if (observed.source_branch !== null && typeof observed.source_branch !== "string") throw new Error("RFD010 receipt observed branch is invalid");
  if (observed.source_branch !== null
    && observed.source_branch !== "DETACHED"
    && observed.source_branch !== "[redacted]"
    && !RELEASE_BRANCH_PATTERNS.some((pattern) => pattern.test(observed.source_branch))) {
    throw new Error("RFD010 receipt observed branch is invalid");
  }
  if (observed.source_dirty !== null && typeof observed.source_dirty !== "boolean") throw new Error("RFD010 receipt observed dirty state is invalid");
  if (observed.dirty_entry_count !== null && (!Number.isInteger(observed.dirty_entry_count) || observed.dirty_entry_count < 0)) {
    throw new Error("RFD010 receipt dirty count is invalid");
  }
  for (const key of ["package_version", "desktop_package_version", "lockfile_version", "lockfile_root_version", "lockfile_desktop_version"]) {
    if (observed[key] !== null && typeof observed[key] !== "string") throw new Error(`RFD010 receipt observed ${key} is invalid`);
  }
  if (observed.artifact_root !== null && typeof observed.artifact_root !== "string") throw new Error("RFD010 receipt artifact root is invalid");
  if (![null, "[repo-relative-redacted]"].includes(observed.artifact_root_absolute)) throw new Error("RFD010 receipt absolute path disclosure");
  const sourceObservationAvailable = observed.source_sha !== null
    || observed.source_tree !== null
    || observed.source_dirty !== null
    || observed.dirty_entry_count !== null;
  if (sourceObservationAvailable) {
    if (!SOURCE_STATUS_SCOPES.has(observed.source_status_scope)
      || !isCanonicalUtcTimestamp(observed.source_status_observed_at)) throw new Error("RFD010 receipt source observation scope is invalid");
  } else if (observed.source_status_scope !== null || observed.source_status_observed_at !== null) {
    throw new Error("RFD010 receipt source observation availability is invalid");
  }
  if (observed.candidate_snapshot_relative_root !== null && typeof observed.candidate_snapshot_relative_root !== "string") throw new Error("RFD010 receipt snapshot root is invalid");
  if (observed.candidate_snapshot_manifest_sha256 !== null && !/^[0-9a-f]{64}$/.test(observed.candidate_snapshot_manifest_sha256)) throw new Error("RFD010 receipt snapshot manifest is invalid");
  if (observed.candidate_snapshot_file_count !== null
    && (!Number.isInteger(observed.candidate_snapshot_file_count) || observed.candidate_snapshot_file_count < 0)) throw new Error("RFD010 receipt snapshot file count is invalid");
  if (observed.candidate_snapshot_read_only !== null && typeof observed.candidate_snapshot_read_only !== "boolean") throw new Error("RFD010 receipt snapshot mode is invalid");
  if (![null, SNAPSHOT_ROOT_REDACTION].includes(observed.candidate_snapshot_root)) throw new Error("RFD010 receipt snapshot path disclosure");
  if (typeof observed.authoritative_receipt_supplied !== "boolean") throw new Error("RFD010 receipt authority input is invalid");

  const checks = receipt.checks;
  if (!exactKeys(checks, LOCAL_CHECK_KEYS)) throw new Error("RFD010 receipt required check set drifted");
  for (const name of LOCAL_CHECK_KEYS) {
    validateLocalCheckShape(name, checks[name], receipt.observed);
  }
  const expectedAuthorityReason = receipt.observed.authoritative_receipt_supplied
    ? "separate_authority_validator_required"
    : "no_authoritative_receipt";
  if (checks.authoritative_receipt.reason_code !== expectedAuthorityReason) throw new Error("RFD010 receipt authoritative receipt reason drifted");
  if (!["BLOCKED", "DEFERRED_EXTERNAL_AUTHORITY"].includes(receipt.release_authority_status)) throw new Error("RFD010 receipt authority status is invalid");

  const inputErrorCodes = receiptInputErrorCodes(input);
  if (!Array.isArray(receipt.errors)) throw new Error("RFD010 receipt errors are missing");
  const boundErrors = new Map();
  const unboundErrors = [];
  for (const error of receipt.errors) {
    if (!error || typeof error !== "object" || typeof error.code !== "string" || typeof error.message !== "string") {
      throw new Error("RFD010 receipt error shape is invalid");
    }
    if (!exactKeys(error, error.check === undefined ? ["code", "message"] : ["code", "message", "check"])) {
      throw new Error("RFD010 receipt error fields drifted");
    }
    if (error.message !== sanitizedError(error.code).message) throw new Error("RFD010 receipt error message drifted");
    if (error.check === undefined) {
      unboundErrors.push(error.code);
      continue;
    }
    if (typeof error.check !== "string" || !LOCAL_CHECK_KEYS.includes(error.check) || checks[error.check].status !== "BLOCKED") {
      throw new Error("RFD010 receipt error check binding is invalid");
    }
    if (boundErrors.has(error.check) || error.code !== checks[error.check].reason_code) throw new Error("RFD010 receipt error reason binding is invalid");
    boundErrors.set(error.check, error.code);
  }
  for (const name of LOCAL_CHECK_KEYS) {
    if (checks[name].status === "BLOCKED" && boundErrors.get(name) !== checks[name].reason_code) {
      throw new Error("RFD010 receipt missing required check error");
    }
  }
  if (JSON.stringify([...unboundErrors].sort()) !== JSON.stringify([...inputErrorCodes].sort())) {
    throw new Error("RFD010 receipt input errors drifted");
  }

  // Recompute the candidate identity bindings instead of trusting check labels
  // alone. A tampered expected SHA/tree, package version, dirty count, or root
  // must make the receipt unverifiable even when the attacker leaves PASS in
  // place.
  const validCandidateInput = FULL_SHA_PATTERN.test(input.expected_source_sha ?? "")
    && FULL_SHA_PATTERN.test(input.expected_source_tree ?? "")
    && VERSION_PATTERN.test(input.version ?? "")
    && ["dev", "internal", "candidate", "formal"].includes(input.channel);
  if (validCandidateInput) {
    if (checks.head_matches_expected_sha.status === "PASS" && observed.source_sha !== input.expected_source_sha) throw new Error("RFD010 receipt source SHA binding drifted");
    if (checks.head_matches_expected_sha.status === "BLOCKED" && checks.head_matches_expected_sha.reason_code === "source_sha_mismatch" && observed.source_sha === input.expected_source_sha) throw new Error("RFD010 receipt source SHA contradiction");
    if (checks.head_matches_expected_sha.status === "BLOCKED" && checks.head_matches_expected_sha.reason_code === "repository_unavailable" && observed.source_sha !== null) throw new Error("RFD010 receipt source SHA availability contradiction");
    if (checks.tree_matches_expected_tree.status === "PASS" && observed.source_tree !== input.expected_source_tree) throw new Error("RFD010 receipt source tree binding drifted");
    if (checks.tree_matches_expected_tree.status === "BLOCKED" && checks.tree_matches_expected_tree.reason_code === "source_tree_mismatch" && observed.source_tree === input.expected_source_tree) throw new Error("RFD010 receipt source tree contradiction");
    if (checks.tree_matches_expected_tree.status === "BLOCKED" && checks.tree_matches_expected_tree.reason_code === "repository_unavailable" && observed.source_tree !== null) throw new Error("RFD010 receipt source tree availability contradiction");
    const packageVersionsMatch = [observed.package_version, observed.desktop_package_version].every((value) => value === input.version);
    if (checks.package_versions_consistent.status === "PASS" && !packageVersionsMatch) throw new Error("RFD010 receipt package version binding drifted");
    if (checks.package_versions_consistent.status === "BLOCKED" && checks.package_versions_consistent.reason_code === "package_version_mismatch" && packageVersionsMatch) throw new Error("RFD010 receipt package version contradiction");
    const lockfileVersionsMatch = [observed.lockfile_version, observed.lockfile_root_version, observed.lockfile_desktop_version].every((value) => value === input.version);
    if (checks.lockfile_versions_bound.status === "PASS" && !lockfileVersionsMatch) throw new Error("RFD010 receipt lockfile version binding drifted");
    if (checks.lockfile_versions_bound.status === "BLOCKED" && checks.lockfile_versions_bound.reason_code === "lockfile_version_mismatch" && lockfileVersionsMatch) throw new Error("RFD010 receipt lockfile version contradiction");
    const expectedRoot = desktopReleaseArtifactRelativeRoot({ version: input.version, sourceSha: input.expected_source_sha, channel: input.channel });
    if (observed.artifact_root !== expectedRoot
      || observed.artifact_root_absolute !== "[repo-relative-redacted]") {
      throw new Error("RFD010 receipt artifact root observation drifted");
    }
    if (checks.formal_artifact_root.status === "PASS"
      && (observed.artifact_root !== expectedRoot || checks.formal_artifact_root.relative_path !== expectedRoot
        || (input.channel === "formal" && Object.hasOwn(checks.formal_artifact_root, "channel"))
        || (input.channel !== "formal" && checks.formal_artifact_root.channel !== input.channel))) {
      throw new Error("RFD010 receipt artifact root binding drifted");
    }
    if (checks.formal_artifact_root.status === "BLOCKED" && checks.formal_artifact_root.reason_code === "invalid_release_input" && observed.artifact_root === expectedRoot) throw new Error("RFD010 receipt artifact root contradiction");
    if (checks.candidate_snapshot.status === "PASS"
      && (observed.candidate_snapshot_relative_root !== expectedRoot
        || checks.candidate_snapshot.manifest_sha256 !== observed.candidate_snapshot_manifest_sha256
        || checks.candidate_snapshot.file_count !== observed.candidate_snapshot_file_count
        || checks.candidate_snapshot.read_only !== true
        || observed.candidate_snapshot_read_only !== true
        || observed.candidate_snapshot_root !== SNAPSHOT_ROOT_REDACTION)) {
      throw new Error("RFD010 receipt candidate snapshot binding drifted");
    }
    if (checks.candidate_snapshot.status === "PASS") {
      if (!receipt.candidateSnapshot) throw new Error("RFD010 receipt sealed snapshot capability is missing");
      let sealedSnapshot;
      try {
        sealedSnapshot = validateRfd010GitObjectSnapshot(receipt.candidateSnapshot, {
          expectedManifestSha256: observed.candidate_snapshot_manifest_sha256,
        });
      } catch {
        throw new Error("RFD010 receipt sealed snapshot manifest is not recomputable");
      }
      if (sealedSnapshot.source_sha !== input.expected_source_sha
        || sealedSnapshot.source_tree !== input.expected_source_tree
        || sealedSnapshot.version !== input.version
        || sealedSnapshot.channel !== input.channel
        || sealedSnapshot.relative_root !== observed.candidate_snapshot_relative_root
        || sealedSnapshot.manifest_sha256 !== checks.candidate_snapshot.manifest_sha256
        || sealedSnapshot.file_count !== checks.candidate_snapshot.file_count
        || sealedSnapshot.read_only !== true) {
        throw new Error("RFD010 receipt sealed snapshot binding drifted");
      }
    } else if (checks.candidate_snapshot.status === "BLOCKED"
      && [
        observed.candidate_snapshot_relative_root,
        observed.candidate_snapshot_manifest_sha256,
        observed.candidate_snapshot_file_count,
        observed.candidate_snapshot_read_only,
        observed.candidate_snapshot_root,
      ].some((value) => value !== null)) {
      throw new Error("RFD010 receipt blocked snapshot metadata contradiction");
    }
  } else {
    if (observed.artifact_root !== null || observed.artifact_root_absolute !== null) {
      throw new Error("RFD010 receipt invalid-input artifact root contradiction");
    }
    if (checks.candidate_snapshot.status === "PASS"
      || [
        observed.candidate_snapshot_relative_root,
        observed.candidate_snapshot_manifest_sha256,
        observed.candidate_snapshot_file_count,
        observed.candidate_snapshot_read_only,
        observed.candidate_snapshot_root,
      ].some((value) => value !== null)) {
      throw new Error("RFD010 receipt invalid-input candidate snapshot contradiction");
    }
  }
  if (checks.status_empty.status === "PASS" && observed.dirty_entry_count !== 0) throw new Error("RFD010 receipt clean-status contradiction");
  if (checks.status_empty.status === "BLOCKED" && checks.status_empty.reason_code === "worktree_dirty"
    && (!Number.isInteger(observed.dirty_entry_count) || observed.dirty_entry_count <= 0)) {
    throw new Error("RFD010 receipt dirty-status contradiction");
  }
  if (checks.status_empty.status === "BLOCKED"
    && ["worktree_dirty", "source_state_changed"].includes(checks.status_empty.reason_code)
    && checks.status_empty.dirty_entry_count !== observed.dirty_entry_count) {
    throw new Error("RFD010 receipt dirty count binding drifted");
  }
  if (checks.status_empty.status === "PASS" && observed.source_dirty !== false) throw new Error("RFD010 receipt clean/source parity contradiction");
  if (checks.status_empty.status === "BLOCKED" && checks.status_empty.reason_code === "worktree_dirty"
    && observed.source_dirty !== true) throw new Error("RFD010 receipt dirty/source parity contradiction");
  if (checks.status_empty.status === "BLOCKED" && checks.status_empty.reason_code === "source_state_changed"
    && observed.source_dirty !== (observed.dirty_entry_count > 0)) throw new Error("RFD010 receipt source-state/source parity contradiction");
  if (checks.source_identity.status === "PASS"
    && (typeof observed.source_dirty !== "boolean" || checks.source_identity.source_dirty !== observed.source_dirty)) throw new Error("RFD010 receipt source identity binding drifted");
  if (checks.source_identity.status === "BLOCKED" && checks.source_identity.reason_code === "repository_unavailable" && observed.source_dirty !== null) throw new Error("RFD010 receipt source identity contradiction");
  if (checks.source_identity.status === "PASS" && observed.source_dirty === false
    && checks.status_empty.status !== "PASS" && checks.status_empty.reason_code !== "source_state_changed") throw new Error("RFD010 receipt source identity/status contradiction");
  if (checks.source_identity.status === "PASS" && observed.source_dirty === true && checks.status_empty.status !== "BLOCKED") throw new Error("RFD010 receipt source identity/status contradiction");
  if (checks.package_versions_consistent.status === "BLOCKED"
    && checks.package_versions_consistent.reason_code === "package_unavailable"
    && observed.package_version !== null
    && observed.desktop_package_version !== null) {
    throw new Error("RFD010 receipt package-unavailable contradiction");
  }
  if (checks.lockfile_versions_bound.status === "BLOCKED"
    && checks.lockfile_versions_bound.reason_code === "lockfile_unavailable"
    && [observed.lockfile_version, observed.lockfile_root_version, observed.lockfile_desktop_version].every((value) => value !== null)) {
    throw new Error("RFD010 receipt lockfile-unavailable contradiction");
  }
  const branchCheck = checks.release_authorized_branch;
  if (input.channel === "formal") {
    if (branchCheck.status === "PASS" && Object.hasOwn(branchCheck, "not_required")) throw new Error("RFD010 formal branch cannot be not_required");
    if (branchCheck.status === "PASS" && (typeof branchCheck.detached !== "boolean" || observed.source_branch === null
      || observed.source_branch === "[redacted]"
      || (observed.source_branch !== "DETACHED" && !RELEASE_BRANCH_PATTERNS.some((pattern) => pattern.test(observed.source_branch))))) {
      throw new Error("RFD010 formal branch observation is incomplete");
    }
    if (branchCheck.status === "PASS" && branchCheck.detached === (observed.source_branch !== "DETACHED")) {
      throw new Error("RFD010 formal branch detached binding drifted");
    }
  } else if (branchCheck.status === "PASS"
    && (!Object.hasOwn(branchCheck, "not_required") || branchCheck.not_required !== true)) {
    throw new Error("RFD010 non-formal branch requirement drifted");
  }
  if (checks.release_authorized_branch.status === "BLOCKED" && checks.release_authorized_branch.reason_code === "unauthorized_branch"
    && observed.source_branch !== "[redacted]" && observed.source_branch !== null) throw new Error("RFD010 receipt branch disclosure or contradiction");
  if (checks.release_authorized_branch.status === "PASS" && observed.source_branch !== null
    && observed.source_branch !== "DETACHED"
    && observed.source_branch !== "[redacted]"
    && !RELEASE_BRANCH_PATTERNS.some((pattern) => pattern.test(observed.source_branch))) {
    throw new Error("RFD010 receipt authorized branch binding drifted");
  }

  const externalKeys = ["remote_fetch", "remote_tag_collision", "github_asset_collision"];
  const external = receipt.external_authority;
  if (!exactKeys(external, externalKeys)) throw new Error("RFD010 external authority check set drifted");
  for (const key of externalKeys) {
    checkResultShape(external[key], ["DEFERRED_EXTERNAL_AUTHORITY"], key);
    exactCheckKeys(external[key], ["status", "reason_code"], key);
    if (external[key].reason_code !== expectedAuthorityReason) throw new Error("RFD010 receipt external authority reason drifted");
  }
  const localBlockedCount = LOCAL_CHECK_KEYS.filter((name) => checks[name].status === "BLOCKED").length;
  const expectedLocalVerdict = localBlockedCount || inputErrorCodes.length ? "BLOCKED" : "PASS";
  if (receipt.verdict !== expectedLocalVerdict || receipt.local_verdict !== expectedLocalVerdict) throw new Error("RFD010 receipt local verdict drifted");

  const summaryKeys = ["local_blocking_check_count", "external_deferred_check_count", "execution_not_executed_count", "release_ready"];
  if (!exactKeys(receipt.summary, summaryKeys)) throw new Error("RFD010 receipt summary shape drifted");
  if (![receipt.summary.local_blocking_check_count, receipt.summary.external_deferred_check_count, receipt.summary.execution_not_executed_count].every((value) => Number.isInteger(value) && value >= 0)
    || typeof receipt.summary.release_ready !== "boolean") throw new Error("RFD010 receipt summary fields are invalid");
  if (receipt.summary.local_blocking_check_count !== localBlockedCount + inputErrorCodes.length) throw new Error("RFD010 receipt local blocking count drifted");
  const externalDeferredCount = externalKeys.filter((key) => external[key].status === "DEFERRED_EXTERNAL_AUTHORITY").length;
  const externalBlocked = externalKeys.some((key) => external[key].status === "BLOCKED");
  if (externalBlocked && receipt.verdict !== "BLOCKED") throw new Error("RFD010 receipt external block must block verdict");
  if (receipt.summary.external_deferred_check_count !== externalDeferredCount) throw new Error("RFD010 receipt external authority count drifted");
  if (receipt.summary.execution_not_executed_count !== 4 || receipt.summary.release_ready !== false) throw new Error("RFD010 receipt summary claims drifted");
  const expectedAuthorityStatus = externalKeys.some((key) => external[key].status === "DEFERRED_EXTERNAL_AUTHORITY") ? "DEFERRED_EXTERNAL_AUTHORITY" : "BLOCKED";
  if (receipt.release_authority_status !== expectedAuthorityStatus) throw new Error("RFD010 receipt authority status drifted");

  const execution = receipt.execution;
  const executionKeys = ["commit", "merge", "pull_request", "push"];
  if (!exactKeys(execution, executionKeys)) throw new Error("RFD010 receipt execution boundary drifted");
  for (const result of Object.values(execution)) {
    if (!exactKeys(result, ["status", "receipt_bound", "reason_code"])
      || result.status !== "NOT_EXECUTED" || result.receipt_bound !== true || result.reason_code !== "read_only_preflight") {
      throw new Error("RFD010 receipt execution claims drifted");
    }
  }

  const evidenceWrite = receipt.evidence_write;
  const evidenceKeys = ["requested", "performed", "source_status_unchanged", "output_path"];
  if (!exactKeys(evidenceWrite, evidenceKeys)) throw new Error("RFD010 receipt evidence-write shape drifted");
  if (typeof evidenceWrite.requested !== "boolean" || typeof evidenceWrite.performed !== "boolean") throw new Error("RFD010 receipt evidence-write state drifted");
  if (!evidenceWrite.requested && evidenceWrite.performed) throw new Error("RFD010 receipt evidence-write state drifted");
  if (evidenceWrite.performed) {
    if (evidenceWrite.source_status_unchanged !== null || evidenceWrite.output_path !== "[repo-relative-redacted]") throw new Error("RFD010 receipt evidence-write proof is invalid");
  } else if (evidenceWrite.source_status_unchanged !== null || evidenceWrite.output_path !== null) {
    throw new Error("RFD010 receipt evidence-write non-claim drifted");
  }
  const mutationGuard = receipt.mutation_guard;
  const mutationKeys = ["network", "fetch", "commit", "stage", "tag", "push", "pull_request", "merge", "refs_changed", "source_files_changed", "snapshot_files_changed", "evidence_write_by_preflight", "evidence_write_by_cli"];
  const sourceDriftEvidence = receipt.verdict === "BLOCKED"
    && checks.status_empty.status === "BLOCKED"
    && ["source_state_changed", "worktree_dirty", "source_sha_mismatch", "source_tree_mismatch"].includes(checks.status_empty.reason_code);
  if (!exactKeys(mutationGuard, mutationKeys)
    || Object.values(mutationGuard).some((value) => typeof value !== "boolean")
    || Object.entries(mutationGuard).some(([key, value]) => (
      key !== "evidence_write_by_cli" && key !== "source_files_changed" && key !== "snapshot_files_changed" && value !== false
    ))
    || mutationGuard.evidence_write_by_cli !== evidenceWrite.performed
    || (evidenceWrite.performed && mutationGuard.source_files_changed !== false && !sourceDriftEvidence)
    || (!evidenceWrite.performed && mutationGuard.source_files_changed !== false && receipt.verdict !== "BLOCKED")) {
    throw new Error("RFD010 receipt mutation guard drifted");
  }
  if (mutationGuard.source_files_changed === true) {
    if (receipt.verdict !== "BLOCKED"
      || checks.status_empty.status !== "BLOCKED"
      || !["source_state_changed", "worktree_dirty", "source_sha_mismatch", "source_tree_mismatch"].includes(checks.status_empty.reason_code)) {
      throw new Error("RFD010 receipt source-drift state is not RED");
    }
  }
  if (mutationGuard.snapshot_files_changed === true) {
    if (receipt.verdict !== "BLOCKED"
      || checks.candidate_snapshot.status !== "BLOCKED"
      || !["snapshot_manifest_mismatch", "snapshot_unavailable"].includes(checks.candidate_snapshot.reason_code)) {
      throw new Error("RFD010 receipt candidate-snapshot state is not RED");
    }
  }
  return receipt;
}

export function renderRfd010ReceiptMarkdown(receipt) {
  validateRfd010Receipt(receipt);
  const lines = [
    "# RFD-TUW-010 Release Candidate Preflight Receipt",
    "",
    `Status: ${receipt.verdict}`,
    "",
    "This is a read-only local preflight. It does not commit, stage, tag, fetch, push, open a PR, merge, or query GitHub.",
    "",
    "## Candidate",
    "",
    `- Expected source SHA: \`${receipt.input.expected_source_sha ?? "missing"}\``,
    `- Expected source tree: \`${receipt.input.expected_source_tree ?? "missing"}\``,
    `- Version: \`${receipt.input.version ?? "missing"}\``,
    `- Release ID/tag: \`${receipt.input.release_id ?? "missing"}\``,
    `- Channel: \`${receipt.input.channel ?? "missing"}\``,
    `- Artifact root: \`${receipt.observed.artifact_root ?? "not derived"}\``,
    `- Source status scope: \`${receipt.observed.source_status_scope}\``,
    `- Source status observed at: \`${receipt.observed.source_status_observed_at ?? "not captured"}\``,
    `- Immutable candidate manifest SHA-256: \`${receipt.observed.candidate_snapshot_manifest_sha256 ?? "not materialized"}\``,
    "",
    "## Local checks",
    "",
    "| Check | Status | Reason |",
    "| --- | --- | --- |",
  ];
  for (const [name, result] of Object.entries(receipt.checks ?? {})) {
    lines.push(`| ${name} | ${result.status} | ${result.reason_code ?? ""} |`);
  }
  lines.push("", "## External authority", "", "| Check | Status |", "| --- | --- |");
  for (const [name, result] of Object.entries(receipt.external_authority ?? {})) {
    lines.push(`| ${name} | ${result.status} |`);
  }
  lines.push(
    "",
    "## Execution boundary",
    "",
    "| Operation | Status | Receipt-bound |",
    "| --- | --- | --- |",
  );
  for (const [name, result] of Object.entries(receipt.execution ?? {})) {
    lines.push(`| ${name} | ${result.status} | ${result.receipt_bound === true} |`);
  }
  lines.push(
    "",
    "## Evidence write",
    "",
    `- Receipt file write performed: ${receipt.evidence_write.performed}`,
    `- Source status unchanged after write: ${receipt.evidence_write.source_status_unchanged ?? "not checked"}`,
    "",
    "## Non-claims",
    "",
    "- Commit/push/PR/merge: NOT_EXECUTED",
    `- Remote/GitHub collision checks: DEFERRED_EXTERNAL_AUTHORITY ${receipt.observed.authoritative_receipt_supplied ? "pending trusted validation of the supplied receipt" : "without a supplied authoritative receipt"}`,
    "- Public release: false",
    "- Production go-live: false",
    "",
  );
  return `${lines.join("\n")}\n`;
}

export function createRfd010ReceiptTemplate() {
  const input = {
    expected_source_sha: null,
    expected_source_tree: null,
    version: null,
    release_id: null,
    tag: null,
    channel: "formal",
    requested_channel: "formal",
  };
  const templateReasons = {
    diff_check: "diff_check_failed",
    status_empty: "repository_unavailable",
    head_matches_expected_sha: "repository_unavailable",
    tree_matches_expected_tree: "repository_unavailable",
    release_authorized_branch: "unauthorized_branch",
    source_identity: "repository_unavailable",
    package_versions_consistent: "package_unavailable",
    lockfile_versions_bound: "lockfile_unavailable",
    candidate_snapshot: "snapshot_unavailable",
    formal_artifact_root: "invalid_release_input",
    artifact_root_collision: "artifact_root_exists",
    local_tag_collision: "invalid_tag",
    local_release_manifest_collision: "manifest_unavailable",
    artifact_records_unique: "artifact_records_conflict",
    artifact_file_collision: "artifact_file_exists",
  };
  const checks = Object.fromEntries(LOCAL_CHECK_KEYS.map((name) => [
    name,
    name === "authoritative_receipt"
      ? deferred()
      : blocked(templateReasons[name] ?? "invalid_release_input"),
  ]));
  checks.local_release_manifest_collision = blocked("manifest_unavailable", {
    malformed_manifest_count: 0,
    incomplete_manifest_count: 0,
  });
  checks.artifact_records_unique = blocked("artifact_records_conflict", {
    artifact_count: 0,
    duplicate_id_count: 0,
    duplicate_path_count: 0,
    invalid_path_count: 0,
    existing_file_count: 0,
    unsafe_path_count: 0,
  });
  const inputErrors = receiptInputErrorCodes(input).map(sanitizedError);
  const localBlockingCheckCount = LOCAL_CHECK_KEYS.filter((name) => checks[name].status === "BLOCKED").length + inputErrors.length;
  return {
    schema_version: RFD010_SCHEMA_VERSION,
    tuw_id: RFD010_TUW_ID,
    generated_at: "1970-01-01T00:00:00.000Z",
    mode: "read_only_local_preflight",
    verdict: "BLOCKED",
    local_verdict: "BLOCKED",
    release_authority_status: "DEFERRED_EXTERNAL_AUTHORITY",
    input,
    observed: {
      source_sha: null,
      source_tree: null,
      source_branch: null,
      source_dirty: null,
      dirty_entry_count: null,
      package_version: null,
      desktop_package_version: null,
      lockfile_version: null,
      lockfile_root_version: null,
      lockfile_desktop_version: null,
      artifact_root: null,
      artifact_root_absolute: null,
      source_status_scope: null,
      source_status_observed_at: null,
      candidate_snapshot_relative_root: null,
      candidate_snapshot_manifest_sha256: null,
      candidate_snapshot_file_count: null,
      candidate_snapshot_read_only: null,
      candidate_snapshot_root: null,
      authoritative_receipt_supplied: false,
    },
    checks,
    external_authority: {
      remote_fetch: deferred(),
      remote_tag_collision: deferred(),
      github_asset_collision: deferred(),
    },
    execution: emptyExecutionStates(),
    mutation_guard: {
      network: false,
      fetch: false,
      commit: false,
      stage: false,
      tag: false,
      push: false,
      pull_request: false,
      merge: false,
      refs_changed: false,
      source_files_changed: false,
      snapshot_files_changed: false,
      evidence_write_by_preflight: false,
      evidence_write_by_cli: false,
    },
    evidence_write: {
      requested: false,
      performed: false,
      source_status_unchanged: null,
      output_path: null,
    },
    errors: makeErrorList(checks, inputErrors),
    summary: {
      local_blocking_check_count: localBlockingCheckCount,
      external_deferred_check_count: 3,
      execution_not_executed_count: 4,
      release_ready: false,
    },
  };
}

// Stable aliases keep the helper usable from focused validators without
// coupling callers to the CLI file name.
export const runRfd010ReleaseCandidatePreflight = preflightRfd010ReleaseCandidate;
export const createRfd010ReleaseCandidateReceipt = preflightRfd010ReleaseCandidate;
export const validateRfd010ReleaseCandidateReceipt = validateRfd010Receipt;
