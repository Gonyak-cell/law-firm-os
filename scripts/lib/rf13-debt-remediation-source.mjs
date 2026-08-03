import { existsSync, lstatSync, readFileSync, readlinkSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import {
  DIFF_DOMAIN,
  DIFF_EMAIL,
  DIFF_REDACTION,
  DIFF_REDACTION_POLICY,
  DIFF_USER_ID,
  HASH_256,
  PROTECTED_VALUE,
  RAW_KINDS,
  RAW_TEST_PRIVATE_MARKER,
  SHA_1,
  SENSITIVE_KEY,
  fail,
  gitBuffer,
  gitText,
  record,
  sha256,
  splitNul,
  utf8,
} from "./rf13-debt-remediation-common.mjs";

function dirtyFileFingerprint(cwd, relativePathValue) {
  const absolutePath = resolve(cwd, relativePathValue);
  if (!existsSync(absolutePath)) return { mode: "deleted", size: 0, sha256: null };
  const stat = lstatSync(absolutePath);
  if (stat.isSymbolicLink()) {
    const target = readlinkSync(absolutePath);
    const bytes = utf8(target);
    return { mode: (stat.mode & 0o777).toString(8).padStart(3, "0"), size: bytes.length, sha256: sha256(bytes) };
  }
  if (!stat.isFile()) return { mode: (stat.mode & 0o777).toString(8).padStart(3, "0"), size: stat.size, sha256: null };
  const bytes = readFileSync(absolutePath);
  return { mode: (stat.mode & 0o777).toString(8).padStart(3, "0"), size: bytes.length, sha256: sha256(bytes) };
}

/**
 * Build the same conceptual dirty manifest as git status, but calculate the
 * row fingerprints in this module rather than importing the performance
 * helper.  The payload is retained byte-for-byte in the capture artifact.
 */
export function readSourceManifestBytes(cwd) {
  const tracked = splitNul(gitBuffer(cwd, ["diff", "--name-only", "-z", "HEAD", "--"]));
  const untracked = splitNul(gitBuffer(cwd, ["ls-files", "--others", "--exclude-standard", "-z"]));
  const rows = [
    ...tracked.map((path) => ({ category: "tracked", path })),
    ...untracked.map((path) => ({ category: "untracked", path })),
  ]
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
    .map((row) => ({ ...row, ...dirtyFileFingerprint(cwd, row.path) }));
  const payload = rows.map((row) => [
    row.category,
    row.mode,
    row.size,
    row.sha256 ?? "deleted",
    row.path,
  ].join("\t")).join("\n");
  return Object.freeze({
    bytes: utf8(payload),
    rows,
    tracked_count: rows.filter((row) => row.category === "tracked").length,
    untracked_count: rows.filter((row) => row.category === "untracked").length,
  });
}

export function statusCounts(statusBytes) {
  const counts = { tracked_changed_or_added: 0, untracked: 0, total: 0 };
  for (const entry of splitNul(statusBytes)) {
    if (entry.startsWith("? ")) counts.untracked += 1;
    else if (/^[123u] /u.test(entry)) counts.tracked_changed_or_added += 1;
  }
  counts.total = counts.tracked_changed_or_added + counts.untracked;
  return counts;
}

export function sourceStateFromBytes({ sourceSha, sourceTree, statusBytes, diffBytes, manifestBytes }) {
  const diffSha = sha256(diffBytes);
  const statusSha = sha256(statusBytes);
  const manifestSha = sha256(manifestBytes);
  return Object.freeze({
    source_sha: sourceSha,
    source_tree: sourceTree,
    source_dirty: statusBytes.length > 0,
    diff_sha256: diffSha,
    status_sha256: statusSha,
    manifest_sha256: manifestSha,
    working_tree_sha256: sha256(utf8([sourceSha, diffSha, statusSha, manifestSha].join("\n"))),
  });
}

function replaceBufferToken(bytes, token, replacement = DIFF_REDACTION) {
  if (!token || token.length === 0) return bytes;
  const replacementBytes = utf8(replacement);
  const chunks = [];
  let offset = 0;
  let index = bytes.indexOf(token, offset);
  while (index !== -1) {
    chunks.push(bytes.subarray(offset, index), replacementBytes);
    offset = index + token.length;
    index = bytes.indexOf(token, offset);
  }
  if (chunks.length === 0) return bytes;
  chunks.push(bytes.subarray(offset));
  return Buffer.concat(chunks);
}

/**
 * Keep the diff useful as a byte-bound source artifact while removing known
 * roster/contact/photo values. Status, manifest, HEAD, and tree are checked
 * as metadata below; only the diff needs this deterministic content filter.
 */
function redactDiffBytes(bytes, cwd) {
  let result = bytes;
  const sourceTokens = protectedSourceTokens(cwd)
    .filter((token) => token.length >= 4)
    .sort((left, right) => right.length - left.length);
  for (const token of sourceTokens) result = replaceBufferToken(result, token);
  const text = result.toString("utf8");
  const regexTokens = [
    ...text.matchAll(DIFF_EMAIL),
    ...text.matchAll(DIFF_USER_ID),
    ...text.matchAll(new RegExp(RAW_TEST_PRIVATE_MARKER.source, "gu")),
    ...text.matchAll(DIFF_DOMAIN),
  ].map((match) => match[0]).filter(Boolean).sort((left, right) => right.length - left.length);
  for (const token of regexTokens) result = replaceBufferToken(result, utf8(token));
  return result;
}

/** Capture raw git bytes without writing anything to the repository. */
export function readRf13SourceSnapshot({ cwd = process.cwd(), captureId = "snapshot", now = () => new Date().toISOString() } = {}) {
  const repositoryRoot = resolve(cwd);
  const statusBytes = gitBuffer(repositoryRoot, ["status", "--porcelain=v2", "--untracked-files=all", "-z"]);
  const diffBytes = redactDiffBytes(gitBuffer(repositoryRoot, ["diff", "--binary", "--full-index", "--no-ext-diff", "HEAD", "--"]), repositoryRoot);
  const sourceManifest = readSourceManifestBytes(repositoryRoot);
  const sourceSha = gitText(repositoryRoot, ["rev-parse", "HEAD"]);
  const sourceTree = gitText(repositoryRoot, ["rev-parse", "HEAD^{tree}"]);
  const branch = gitText(repositoryRoot, ["branch", "--show-current"]);
  if (!SHA_1.test(sourceSha) || !SHA_1.test(sourceTree)) fail("GIT_ID_INVALID", "git source identity is invalid", { category: "git_identity" });
  const sourceState = sourceStateFromBytes({
    sourceSha,
    sourceTree,
    statusBytes,
    diffBytes,
    manifestBytes: sourceManifest.bytes,
  });
  return Object.freeze({
    capture_id: String(captureId),
    captured_at: String(now()),
    repository: Object.freeze({ branch: branch || null }),
    raw_privacy: privacyMetadata(repositoryRoot),
    source_state: sourceState,
    status_counts: Object.freeze(statusCounts(statusBytes)),
    raw: Object.freeze({
      status: statusBytes,
      diff: diffBytes,
      manifest: sourceManifest.bytes,
      head: utf8(`${sourceSha}\n`),
      tree: utf8(`${sourceTree}\n`),
    }),
  });
}

export function bytesEqual(left, right) {
  return Buffer.isBuffer(left) && Buffer.isBuffer(right) && left.equals(right);
}

function rawEqual(left, right) {
  return RAW_KINDS.every((kind) => bytesEqual(left.raw[kind], right.raw[kind]))
    && JSON.stringify(left.goal_bindings ?? []) === JSON.stringify(right.goal_bindings ?? []);
}

/**
 * Read two captures back-to-back. A changing status/diff/manifest causes a
 * bounded retry; no write is attempted during the read loop.
 */
export function captureStableRf13Source({ cwd = process.cwd(), maxAttempts = 3, readSnapshot = readRf13SourceSnapshot, now = () => new Date().toISOString() } = {}) {
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) fail("INVALID_ATTEMPTS", "capture retry bound is invalid", { category: "capture_retry" });
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const first = readSnapshot({ cwd, captureId: "capture-1", now });
    const second = readSnapshot({ cwd, captureId: "capture-2", now });
    if (rawEqual(first, second)) {
      return Object.freeze({
        first,
        second,
        attempts: attempt,
        byte_equivalent: true,
        files_changed_between_captures: 0,
      });
    }
  }
  fail("SOURCE_CHANGED_BETWEEN_CAPTURES", "source status, diff, or manifest changed between bounded captures", {
    category: "concurrent_source_change",
    attempts: maxAttempts,
  });
}

function scanStrings(value, { protectedHashes = new Set() } = {}, seen = new WeakSet()) {
  if (typeof value === "string") {
    if (PROTECTED_VALUE.test(value) || RAW_TEST_PRIVATE_MARKER.test(value) || protectedHashes.has(value)) fail("PRIVATE_MATERIAL", "private roster or photo material is not permitted in baseline evidence", { category: "private_material" });
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) fail("INVALID_JSON_SHAPE", "baseline evidence contains a cyclic value", { category: "json_shape" });
  seen.add(value);
  if (Array.isArray(value)) {
    value.forEach((item) => scanStrings(item, { protectedHashes }, seen));
    seen.delete(value);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(key)) fail("PRIVATE_MATERIAL", "private roster or photo fields are not permitted in baseline evidence", { category: "private_field", field: key });
    scanStrings(child, { protectedHashes }, seen);
  }
  seen.delete(value);
}

function privacyAuthorities(cwd) {
  const rosterPath = resolve(cwd, "docs/reorganization/client-matter-os/matter-vault-r4/launch/hrx-member-roster-source-of-truth.json");
  const photoRoot = resolve(cwd, "apps/api/src/hrx-member-photos");
  const tokens = [];
  const hashes = new Set();
  let rosterStatus = "BOUND";
  let photoStatus = "BOUND";
  if (!existsSync(rosterPath)) {
    rosterStatus = "NOT_APPLICABLE_MISSING_ROSTER";
  } else {
    let parsed;
    try {
      parsed = JSON.parse(readFileSync(rosterPath, "utf8"));
    } catch {
      fail("PRIVATE_AUTHORITY_UNREADABLE", "protected roster authority could not be parsed", { category: "privacy_authority" });
    }
    const visit = (value, key = "") => {
      if (typeof value === "string" && /(?:email|phone|display|photo|name)/iu.test(key) && value.length >= 4) tokens.push(Buffer.from(value, "utf8"));
      else if (Array.isArray(value)) value.forEach((item) => visit(item, key));
      else if (record(value)) Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
    };
    visit(parsed);
  }
  if (!existsSync(photoRoot)) {
    photoStatus = "NOT_APPLICABLE_MISSING_PHOTOS";
  } else {
    let entries;
    try {
      entries = readdirSync(photoRoot, { withFileTypes: true });
    } catch {
      fail("PRIVATE_AUTHORITY_UNREADABLE", "protected photo authority could not be read", { category: "privacy_authority" });
    }
    for (const entry of entries) {
      if (entry.isFile() && /\.(?:png|jpe?g)$/iu.test(entry.name)) {
        const hash = entry.name.replace(/\.[^.]+$/u, "");
        tokens.push(Buffer.from(hash, "utf8"));
        if (HASH_256.test(hash)) hashes.add(hash);
      }
    }
  }
  const status = rosterStatus === "BOUND" && photoStatus === "BOUND" ? "BOUND" : "NOT_APPLICABLE_MISSING_AUTHORITY";
  return Object.freeze({ tokens, hashes, status, roster: rosterStatus, photos: photoStatus });
}

function protectedSourceTokens(cwd) {
  return privacyAuthorities(cwd).tokens;
}

function protectedPhotoHashes(cwd) {
  return privacyAuthorities(cwd).hashes;
}

function privacyMetadata(cwd) {
  const authority = privacyAuthorities(cwd);
  return Object.freeze({
    diff_redacted: true,
    policy: DIFF_REDACTION_POLICY,
    authority_status: authority.status,
    source_authority: authority.roster,
    media_authority: authority.photos,
  });
}

export function assertRawPrivacy(snapshot, cwd) {
  const protectedTokens = protectedSourceTokens(cwd);
  for (const [kind, bytes] of Object.entries(snapshot.raw)) {
    const text = bytes.toString("utf8");
    if (RAW_TEST_PRIVATE_MARKER.test(text)) fail("PRIVATE_MATERIAL", "private roster or photo material is not permitted in raw capture", { category: "private_material" });
    if (PROTECTED_VALUE.test(text)) fail("PRIVATE_MATERIAL", "private roster or photo material is not permitted in raw capture", { category: "private_material" });
    if (protectedTokens.some((token) => token.length >= 4 && bytes.includes(token))) fail("PRIVATE_MATERIAL", "protected roster or photo value detected in raw capture", { category: "private_material" });
  }
}

export function validateNoPrivateMaterial(value, { cwd = process.cwd() } = {}) {
  scanStrings(value, { protectedHashes: protectedPhotoHashes(cwd) });
  return true;
}
