import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateDesktopBuildManifest } from "./matter-desktop-provenance.mjs";

export const MACOS_RELEASE_BOUNDARY_SCHEMA = "law-firm-os.matter-desktop-macos-release-boundary.v2";
export const MACOS_RELEASE_APPROVAL_SCHEMA = "law-firm-os.matter-desktop-macos-release-approval.v1";
export const MACOS_RELEASE_PLAN_SCHEMA = "law-firm-os.matter-desktop-macos-release-boundary-plan.v1";
export const MACOS_RELEASE_MANIFEST_SCHEMA = "law-firm-os.matter-desktop-formal-release-candidate.v1";
export const RF13_DIST_MACOS_RELEASE_SIDECAR_SCHEMA = "law-firm-os.rf13-dist.macos-release-receipt.v1";
export const MACOS_RELEASE_CHECKPOINT = "RFD-TUW-012";
export const MACOS_RELEASE_RECEIPT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const APP_BUNDLE_DIGEST_ALGORITHM = "sha256(sorted type, mode, bytes, sha256, relative-path manifest)";

const SHA1 = /^[0-9A-F]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const GIT_OBJECT = /^[0-9a-f]{40}$/u;
const TEAM_ID = /^[A-Z0-9]{10}$/u;
const REQUEST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/u;
const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const SECRET_KEY = /(?:^|[_-])(?:secret|token|password|credential|private[_-]?key|api[_-]?key|apple[_-]?id|keychain|profile)(?:$|[_-])/iu;
const SECRET_VALUE = /(?:-----BEGIN [^-\n]*PRIVATE KEY-----|\b(?:AKIA|ASIA)[0-9A-Z]{16}\b|\b(?:secret|token|password|credential)\s*[:=]\s*\S+)/iu;

const APPROVAL_KEYS = [
  "schema_version", "checkpoint_id", "approval_id", "decision", "approved_at", "expires_at",
  "source_sha", "source_tree", "channel", "app_id", "signing_identity", "operations",
  "public_release_approved", "owner_approval_claim",
];
const CHECK_KEYS = [
  "app_codesign_verify",
  "app_gatekeeper_assess",
  "app_stapler_validate",
  "app_identity_verify",
  "app_identity_fingerprint",
  "app_notary_status",
  "dmg_codesign_verify",
  "dmg_gatekeeper_assess",
  "dmg_stapler_validate",
  "dmg_image_verify",
  "dmg_identity_verify",
  "dmg_identity_fingerprint",
  "dmg_notary_status",
];
const STRICT_RELEASE_VALIDATIONS = new WeakMap();

export const MACOS_RELEASE_COMMAND_PLAN = Object.freeze([
  Object.freeze({ id: "app_codesign_verify", binary: "/usr/bin/codesign", args: Object.freeze(["--verify", "--deep", "--strict", "--verbose=2", "{APP_BUNDLE}"]), network: false }),
  Object.freeze({ id: "app_gatekeeper_assess", binary: "/usr/sbin/spctl", args: Object.freeze(["--assess", "--type", "execute", "--verbose=4", "{APP_BUNDLE}"]), network: false }),
  Object.freeze({ id: "app_stapler_validate", binary: "/usr/bin/xcrun", args: Object.freeze(["stapler", "validate", "{APP_BUNDLE}"]), network: false }),
  Object.freeze({ id: "app_identity_verify", binary: "/usr/bin/codesign", args: Object.freeze(["--display", "--verbose=4", "--extract-certificates", "{TEMP_CERT_PREFIX}", "{APP_BUNDLE}"]), network: false }),
  Object.freeze({ id: "app_identity_fingerprint", binary: "/usr/bin/openssl", args: Object.freeze(["x509", "-inform", "DER", "-in", "{TEMP_CERT_FILE}", "-noout", "-fingerprint", "{APPROVED_FINGERPRINT_ALGORITHM}"]), network: false }),
  Object.freeze({ id: "app_notary_status", binary: "/usr/bin/xcrun", args: Object.freeze(["notarytool", "info", "{APP_NOTARY_REQUEST_ID}", "--keychain-profile", "{AUTHORIZED_NOTARY_PROFILE}", "--output-format", "json"]), network: true }),
  Object.freeze({ id: "dmg_codesign_verify", binary: "/usr/bin/codesign", args: Object.freeze(["--verify", "--strict", "--verbose=2", "{DMG}"]), network: false }),
  Object.freeze({ id: "dmg_gatekeeper_assess", binary: "/usr/sbin/spctl", args: Object.freeze(["--assess", "--type", "install", "--verbose=4", "{DMG}"]), network: false }),
  Object.freeze({ id: "dmg_stapler_validate", binary: "/usr/bin/xcrun", args: Object.freeze(["stapler", "validate", "{DMG}"]), network: false }),
  Object.freeze({ id: "dmg_image_verify", binary: "/usr/bin/hdiutil", args: Object.freeze(["verify", "{DMG}"]), network: false }),
  Object.freeze({ id: "dmg_identity_verify", binary: "/usr/bin/codesign", args: Object.freeze(["--display", "--verbose=4", "--extract-certificates", "{TEMP_CERT_PREFIX}", "{DMG}"]), network: false }),
  Object.freeze({ id: "dmg_identity_fingerprint", binary: "/usr/bin/openssl", args: Object.freeze(["x509", "-inform", "DER", "-in", "{TEMP_CERT_FILE}", "-noout", "-fingerprint", "{APPROVED_FINGERPRINT_ALGORITHM}"]), network: false }),
  Object.freeze({ id: "dmg_notary_status", binary: "/usr/bin/xcrun", args: Object.freeze(["notarytool", "info", "{DMG_NOTARY_REQUEST_ID}", "--keychain-profile", "{AUTHORIZED_NOTARY_PROFILE}", "--output-format", "json"]), network: true }),
]);

export class MacosReleaseBoundaryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "MacosReleaseBoundaryError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new MacosReleaseBoundaryError(code, message, details);
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map((entry) => canonical(entry)).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
}

export function sha256(value) {
  return createHash("sha256").update(Buffer.isBuffer(value) ? value : String(value)).digest("hex");
}

export function canonicalSha256(value) {
  return sha256(canonical(value));
}

function exactKeys(value, keys, field) {
  if (!isRecord(value)) fail("INVALID_SHAPE", `${field} must be an object`, { field });
  const expected = new Set(keys);
  const missing = keys.filter((key) => !Object.hasOwn(value, key));
  const unknown = Object.keys(value).filter((key) => !expected.has(key));
  if (missing.length) fail("MISSING_FIELD", `${field} is missing required fields`, { field, missing_count: missing.length });
  if (unknown.length) fail("UNKNOWN_FIELD", `${field} contains unsupported fields`, { field, unknown_count: unknown.length });
}

function iso(value, field) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    fail("INVALID_TIMESTAMP", `${field} must be a canonical UTC timestamp`, { field });
  }
  return Date.parse(value);
}

function scanSecrets(value, seen = new WeakSet()) {
  if (typeof value === "string") {
    if (SECRET_VALUE.test(value)) fail("SECRET_MATERIAL", "secret-like material is not permitted in macOS release evidence");
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (seen.has(value)) fail("INVALID_SHAPE", "cyclic evidence is not permitted");
  seen.add(value);
  if (Array.isArray(value)) {
    for (const entry of value) scanSecrets(entry, seen);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (SECRET_KEY.test(key)) fail("SECRET_FIELD", "secret-bearing fields are not permitted in macOS release evidence", { field: "redacted" });
    scanSecrets(child, seen);
  }
}

function assertGitObject(value, field) {
  if (typeof value !== "string" || !GIT_OBJECT.test(value)) fail("INVALID_SOURCE", `${field} must be a full lowercase Git object id`, { field });
}

function assertSha256(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) fail("INVALID_SHA256", `${field} must be a lowercase SHA-256`, { field });
}

function assertPositiveBytes(value, field) {
  if (!Number.isInteger(value) || value <= 0) fail("INVALID_ARTIFACT_SIZE", `${field} must be a positive byte count`, { field });
}

function normalizedFingerprint(identity) {
  if (!isRecord(identity)) fail("INVALID_IDENTITY", "signing_identity must be an object", { field: "signing_identity" });
  exactKeys(identity, ["fingerprint_algorithm", "certificate_fingerprint", "team_id"], "signing_identity");
  if (!["sha1", "sha256"].includes(identity.fingerprint_algorithm)) fail("INVALID_IDENTITY", "fingerprint_algorithm must be sha1 or sha256", { field: "fingerprint_algorithm" });
  const certificateFingerprint = String(identity.certificate_fingerprint ?? "").replaceAll(":", "").toUpperCase();
  if (identity.fingerprint_algorithm === "sha1" ? !SHA1.test(certificateFingerprint) : !/^[0-9A-F]{64}$/u.test(certificateFingerprint)) {
    fail("INVALID_IDENTITY", "certificate_fingerprint does not match its declared algorithm", { field: "certificate_fingerprint" });
  }
  if (typeof identity.team_id !== "string" || !TEAM_ID.test(identity.team_id)) fail("INVALID_IDENTITY", "team_id must be a ten-character Apple Team ID", { field: "team_id" });
  return Object.freeze({
    fingerprint_algorithm: identity.fingerprint_algorithm,
    certificate_fingerprint: certificateFingerprint,
    team_id: identity.team_id,
  });
}

export function validateMacosReleaseApproval(approval, { expectedSourceSha, expectedSourceTree, now = new Date().toISOString() } = {}) {
  scanSecrets(approval);
  exactKeys(approval, APPROVAL_KEYS, "approval intake");
  if (approval.schema_version !== MACOS_RELEASE_APPROVAL_SCHEMA || approval.checkpoint_id !== MACOS_RELEASE_CHECKPOINT) fail("APPROVAL_SCHEMA_MISMATCH", "approved intake is not an RFD-TUW-012 approval");
  if (typeof approval.approval_id !== "string" || !SAFE_ID.test(approval.approval_id)) fail("INVALID_APPROVAL_ID", "approval_id must be a safe opaque identifier");
  if (approval.decision !== "APPROVED") fail("APPROVAL_REQUIRED", "Apple signing and notary authority is not approved");
  const approvedAt = iso(approval.approved_at, "approved_at");
  const expiresAt = iso(approval.expires_at, "expires_at");
  const nowMs = iso(now, "validation time");
  if (approvedAt > nowMs || expiresAt <= nowMs || expiresAt <= approvedAt) fail("APPROVAL_STALE", "approved intake is not active at validation time");
  assertGitObject(approval.source_sha, "source_sha");
  assertGitObject(approval.source_tree, "source_tree");
  if (expectedSourceSha && approval.source_sha !== expectedSourceSha) fail("APPROVAL_SOURCE_MISMATCH", "approved intake source SHA differs from the expected source");
  if (expectedSourceTree && approval.source_tree !== expectedSourceTree) fail("APPROVAL_SOURCE_MISMATCH", "approved intake source tree differs from the expected source");
  if (approval.channel !== "formal" || approval.app_id !== "com.amic.matter.desktop") fail("APPROVAL_SCOPE_MISMATCH", "approved intake must target the formal Matter desktop app");
  exactKeys(approval.operations, ["developer_id_signing", "notarization_submission", "notary_status_query"], "approval operations");
  if (Object.values(approval.operations).some((value) => value !== true)) fail("APPROVAL_SCOPE_MISMATCH", "approved intake must cover signing, submission, and status verification");
  if (approval.public_release_approved !== false || approval.owner_approval_claim !== false) fail("APPROVAL_SCOPE_MISMATCH", "technical approval must not claim owner or public release approval");
  return Object.freeze({ ...approval, signing_identity: normalizedFingerprint(approval.signing_identity) });
}

function relativeArtifactPath(repoRoot, artifactPath, field) {
  if (typeof repoRoot !== "string" || !path.isAbsolute(repoRoot)) fail("INVALID_REPO_ROOT", "repo root must be absolute");
  if (typeof artifactPath !== "string" || !path.isAbsolute(artifactPath)) fail("ARTIFACT_PATH_INVALID", `${field} must be supplied as an absolute local path`, { field });
  const absolute = path.resolve(artifactPath);
  const relative = path.relative(repoRoot, absolute).split(path.sep).join("/");
  if (!relative || relative.startsWith("../") || path.posix.isAbsolute(relative)) fail("ARTIFACT_PATH_OUTSIDE_REPO", `${field} must remain inside the repository`, { field });
  if (path.posix.normalize(relative) !== relative) fail("ARTIFACT_PATH_INVALID", `${field} is not canonical`, { field });
  return relative;
}

function assertReceiptPath(repoRoot, relativePath, expectedAbsolutePath, field) {
  if (typeof relativePath !== "string" || path.posix.isAbsolute(relativePath) || path.posix.normalize(relativePath) !== relativePath || relativePath.startsWith("../")) {
    fail("ARTIFACT_PATH_INVALID", `${field} must be a canonical repository-relative path`, { field });
  }
  const expected = relativeArtifactPath(repoRoot, expectedAbsolutePath, field);
  if (relativePath !== expected) fail("ARTIFACT_PATH_MISMATCH", `${field} differs from the exact validated artifact path`, { field });
}

export function describeFileArtifact({ repoRoot, artifactPath, field = "artifact" }) {
  if (!existsSync(artifactPath)) fail("ARTIFACT_MISSING", `${field} is missing`, { field });
  const stat = lstatSync(artifactPath);
  if (!stat.isFile() || stat.isSymbolicLink()) fail("ARTIFACT_TYPE_INVALID", `${field} must be a regular file`, { field });
  const body = readFileSync(artifactPath);
  if (!body.length) fail("ARTIFACT_EMPTY", `${field} must not be empty`, { field });
  return Object.freeze({
    path: relativeArtifactPath(repoRoot, artifactPath, field),
    sha256: sha256(body),
    bytes: body.length,
    digest_algorithm: "sha256(file bytes)",
  });
}

export function describeAppBundle({ repoRoot, appPath }) {
  if (!existsSync(appPath)) fail("APP_ARTIFACT_MISSING", "formal app bundle is missing", { field: "application" });
  const rootStat = lstatSync(appPath);
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) fail("APP_ARTIFACT_TYPE_INVALID", "formal app bundle must be a real directory", { field: "application" });
  const records = [];
  let bytes = 0;
  let fileCount = 0;
  const visit = (directory) => {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolute = path.join(directory, entry.name);
      const relative = path.relative(appPath, absolute).split(path.sep).join("/");
      const stat = lstatSync(absolute);
      const mode = (stat.mode & 0o777).toString(8).padStart(3, "0");
      if (stat.isDirectory()) {
        records.push(`D\t${mode}\t0\t-\t${relative}\n`);
        visit(absolute);
      } else if (stat.isFile()) {
        const body = readFileSync(absolute);
        bytes += body.length;
        fileCount += 1;
        records.push(`F\t${mode}\t${body.length}\t${sha256(body)}\t${relative}\n`);
      } else if (stat.isSymbolicLink()) {
        const target = readlinkSync(absolute);
        const resolved = path.resolve(path.dirname(absolute), target);
        const inside = path.relative(appPath, resolved);
        if (path.isAbsolute(target) || inside === ".." || inside.startsWith(`..${path.sep}`) || path.isAbsolute(inside)) fail("APP_SYMLINK_ESCAPE", "formal app bundle contains an external symbolic link", { field: "application" });
        const body = Buffer.from(target, "utf8");
        bytes += body.length;
        fileCount += 1;
        records.push(`L\t${mode}\t${body.length}\t${sha256(body)}\t${relative}\n`);
      } else {
        fail("APP_ENTRY_TYPE_INVALID", "formal app bundle contains an unsupported entry type", { field: "application" });
      }
    }
  };
  visit(appPath);
  if (!fileCount || !bytes) fail("APP_ARTIFACT_EMPTY", "formal app bundle must contain files", { field: "application" });
  return Object.freeze({
    path: relativeArtifactPath(repoRoot, appPath, "application"),
    sha256: sha256(records.join("")),
    bytes,
    file_count: fileCount,
    digest_algorithm: APP_BUNDLE_DIGEST_ALGORITHM,
  });
}

export function validateFormalMacBuildManifest(manifest, { expectedSourceSha, expectedSourceTree } = {}) {
  let validated;
  try {
    validated = validateDesktopBuildManifest(manifest);
  } catch {
    fail("BUILD_MANIFEST_INVALID", "macOS build manifest failed canonical v2 validation");
  }
  if (validated.source_dirty !== false || validated.channel !== "formal" || validated.platform !== "darwin" || validated.app_id !== "com.amic.matter.desktop") {
    fail("FORMAL_ARTIFACT_REQUIRED", "RFD-TUW-012 accepts only a clean formal macOS build manifest");
  }
  if (expectedSourceSha && validated.source_sha !== expectedSourceSha) fail("SOURCE_SHA_MISMATCH", "macOS build manifest source SHA differs from the expected source");
  if (expectedSourceTree && validated.source_tree !== expectedSourceTree) fail("SOURCE_TREE_MISMATCH", "macOS build manifest source tree differs from the expected source");
  iso(validated.built_at, "build manifest built_at");
  return validated;
}

function checked(runner, id, binary, args) {
  let result;
  try {
    result = runner({ id, binary, args });
  } catch {
    fail(`${id.toUpperCase()}_FAILED`, "macOS release probe command failed (details redacted)", { command_id: id, exit_code: 1 });
  }
  const status = Number.isInteger(result?.status) ? result.status : 1;
  if (status !== 0) fail(`${id.toUpperCase()}_FAILED`, "macOS release probe command failed (details redacted)", { command_id: id, exit_code: status });
  const stdoutBytes = Buffer.isBuffer(result?.stdout) ? result.stdout : Buffer.from(String(result?.stdout ?? ""));
  const stderrBytes = Buffer.isBuffer(result?.stderr) ? result.stderr : Buffer.from(String(result?.stderr ?? ""));
  return {
    stdout: stdoutBytes.toString("utf8"),
    stderr: stderrBytes.toString("utf8"),
    stdoutBytes,
    stderrBytes,
    status,
  };
}

export function spawnMacosReleaseProbeCommand({ id, binary, args }) {
  const result = spawnSync(binary, args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1024 * 1024 });
  return { id, status: result.status ?? 1, stdout: result.stdout ?? Buffer.alloc(0), stderr: result.stderr ?? Buffer.alloc(0) };
}

function rawTranscriptSha256({ id, binary, args, status, stdoutBytes, stderrBytes }) {
  const hash = createHash("sha256");
  for (const value of [id, binary, JSON.stringify(args), String(status)]) hash.update(value).update("\0");
  return hash.update(stdoutBytes).update("\0").update(stderrBytes).digest("hex");
}

function createProbeRecorder({ runner, now }) {
  const wallStart = iso(now, "probe start time");
  const monotonicStart = process.hrtime.bigint();
  let lastTimestamp = wallStart - 1;
  const ids = [];
  const checks = {};
  const timestamp = () => {
    const elapsedMs = Number((process.hrtime.bigint() - monotonicStart) / 1_000_000n);
    lastTimestamp = Math.max(lastTimestamp + 1, wallStart + elapsedMs);
    return new Date(lastTimestamp).toISOString();
  };
  return {
    run(id, binary, args) {
      if (ids.includes(id)) fail("PROBE_COMMAND_DUPLICATE", "macOS probe command executed more than once", { command_id: id });
      const startedAt = timestamp();
      const result = checked(runner, id, binary, args);
      const completedAt = timestamp();
      ids.push(id);
      checks[id] = Object.freeze({
        command_id: id,
        sequence: ids.length,
        status: "PASS",
        exit_code: 0,
        started_at: startedAt,
        completed_at: completedAt,
        raw_transcript_sha256: rawTranscriptSha256({ id, binary, args, ...result }),
      });
      return result;
    },
    complete(nativeExecution) {
      if (canonical(ids) !== canonical(CHECK_KEYS)) fail("PROBE_COMMAND_SET_INCOMPLETE", "macOS probe did not execute the exact required command set");
      const orderedChecks = Object.fromEntries(CHECK_KEYS.map((id) => [id, checks[id]]));
      return Object.freeze({
        checks: Object.freeze(orderedChecks),
        execution: Object.freeze({
          mode: nativeExecution ? "native_live" : "test_only_injected_runner",
          command_count_executed: ids.length,
          first_started_at: checks[CHECK_KEYS[0]].started_at,
          last_completed_at: checks[CHECK_KEYS.at(-1)].completed_at,
          sequence_sha256: canonicalSha256(CHECK_KEYS.map((id) => checks[id])),
        }),
      });
    },
  };
}

function inspectIdentity({ probe, artifactKind, artifactPath, approvedIdentity, tempRoot }) {
  const prefix = path.join(tempRoot, `${artifactKind}-cert-`);
  const display = probe.run(`${artifactKind}_identity_verify`, "/usr/bin/codesign", ["--display", "--verbose=4", "--extract-certificates", prefix, artifactPath]);
  const output = `${display.stdout}\n${display.stderr}`;
  if (/(?:^|\n)Signature=adhoc(?:\n|$)/u.test(output) || !/(?:^|\n)Authority=Developer ID Application:/u.test(output)) {
    fail(`${artifactKind.toUpperCase()}_DEVELOPER_ID_REQUIRED`, "artifact is not signed with an approved Developer ID Application identity", { command_id: `${artifactKind}_identity_verify` });
  }
  const teamId = output.match(/(?:^|\n)TeamIdentifier=([A-Z0-9]{10})(?:\n|$)/u)?.[1];
  if (!teamId) fail(`${artifactKind.toUpperCase()}_TEAM_ID_MISSING`, "artifact Team ID could not be verified", { command_id: `${artifactKind}_identity_verify` });
  const algorithmFlag = approvedIdentity.fingerprint_algorithm === "sha1" ? "-sha1" : "-sha256";
  const fingerprintResult = probe.run(`${artifactKind}_identity_fingerprint`, "/usr/bin/openssl", ["x509", "-inform", "DER", "-in", `${prefix}0`, "-noout", "-fingerprint", algorithmFlag]);
  const fingerprint = `${fingerprintResult.stdout}\n${fingerprintResult.stderr}`.match(/Fingerprint=([0-9A-F:]+)/iu)?.[1]?.replaceAll(":", "").toUpperCase();
  if (!fingerprint) fail(`${artifactKind.toUpperCase()}_FINGERPRINT_MISSING`, "artifact certificate fingerprint could not be verified", { command_id: `${artifactKind}_identity_fingerprint` });
  const observed = normalizedFingerprint({ fingerprint_algorithm: approvedIdentity.fingerprint_algorithm, certificate_fingerprint: fingerprint, team_id: teamId });
  if (canonical(observed) !== canonical(approvedIdentity)) fail("SIGNING_IDENTITY_MISMATCH", "artifact signing identity differs from the approved fingerprint and Team ID");
  return observed;
}

function verifyNotaryStatus({ probe, artifactKind, requestId, notaryProfile }) {
  if (typeof requestId !== "string" || !REQUEST_ID.test(requestId)) fail("NOTARY_REQUEST_ID_INVALID", "notary request id must be a sanitized UUID", { field: `${artifactKind}_notary_request_id` });
  if (typeof notaryProfile !== "string" || !notaryProfile.trim()) fail("NOTARY_AUTHORITY_REQUIRED", "approved notary status-query authority is required");
  const result = probe.run(`${artifactKind}_notary_status`, "/usr/bin/xcrun", ["notarytool", "info", requestId, "--keychain-profile", notaryProfile, "--output-format", "json"]);
  let observation;
  try {
    observation = JSON.parse(result.stdout);
  } catch {
    fail("NOTARY_RESPONSE_INVALID", "notary status response was not valid JSON", { command_id: `${artifactKind}_notary_status` });
  }
  if (String(observation?.id ?? "").toLowerCase() !== requestId.toLowerCase() || String(observation?.status ?? "").toLowerCase() !== "accepted") {
    fail("NOTARIZATION_NOT_ACCEPTED", "notary status is not accepted for the exact request id", { command_id: `${artifactKind}_notary_status` });
  }
}

export function collectMacosReleaseBoundaryReceipt({
  repoRoot,
  manifestPath,
  appPath,
  dmgPath,
  approval,
  appNotaryRequestId,
  dmgNotaryRequestId,
  notaryProfile,
  expectedSourceSha,
  expectedSourceTree,
  sourceDirty,
  runner = spawnMacosReleaseProbeCommand,
  now = new Date().toISOString(),
} = {}) {
  if (sourceDirty !== false) fail("CLEAN_EXACT_SOURCE_REQUIRED", "RFD-TUW-012 probe requires an explicit clean exact formal source observation");
  const validatedApproval = validateMacosReleaseApproval(approval, { expectedSourceSha, expectedSourceTree, now });
  if (typeof notaryProfile !== "string" || !notaryProfile.trim()) fail("NOTARY_AUTHORITY_REQUIRED", "approved notary status-query authority is required");
  if (!REQUEST_ID.test(appNotaryRequestId ?? "") || !REQUEST_ID.test(dmgNotaryRequestId ?? "")) fail("NOTARY_REQUEST_ID_INVALID", "app and DMG notary request ids must be sanitized UUIDs");
  if (appNotaryRequestId.toLowerCase() === dmgNotaryRequestId.toLowerCase()) fail("NOTARY_REQUEST_ID_REUSED", "app and DMG require separate notary request IDs");
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  } catch {
    fail("FORMAL_BUILD_MANIFEST_MISSING", "formal macOS build manifest could not be read");
  }
  validateFormalMacBuildManifest(manifest, { expectedSourceSha: validatedApproval.source_sha, expectedSourceTree: validatedApproval.source_tree });
  const manifestArtifact = describeFileArtifact({ repoRoot, artifactPath: manifestPath, field: "build_manifest" });
  const application = describeAppBundle({ repoRoot, appPath });
  const diskImage = describeFileArtifact({ repoRoot, artifactPath: dmgPath, field: "disk_image" });
  const nativeExecution = runner === spawnMacosReleaseProbeCommand;
  const probe = createProbeRecorder({ runner, now });
  const tempRoot = mkdtempSync(path.join(tmpdir(), "matter-macos-release-probe-"));
  let appIdentity;
  let dmgIdentity;
  try {
    probe.run("app_codesign_verify", "/usr/bin/codesign", ["--verify", "--deep", "--strict", "--verbose=2", appPath]);
    probe.run("app_gatekeeper_assess", "/usr/sbin/spctl", ["--assess", "--type", "execute", "--verbose=4", appPath]);
    probe.run("app_stapler_validate", "/usr/bin/xcrun", ["stapler", "validate", appPath]);
    appIdentity = inspectIdentity({ probe, artifactKind: "app", artifactPath: appPath, approvedIdentity: validatedApproval.signing_identity, tempRoot });
    verifyNotaryStatus({ probe, artifactKind: "app", requestId: appNotaryRequestId, notaryProfile });
    probe.run("dmg_codesign_verify", "/usr/bin/codesign", ["--verify", "--strict", "--verbose=2", dmgPath]);
    probe.run("dmg_gatekeeper_assess", "/usr/sbin/spctl", ["--assess", "--type", "install", "--verbose=4", dmgPath]);
    probe.run("dmg_stapler_validate", "/usr/bin/xcrun", ["stapler", "validate", dmgPath]);
    probe.run("dmg_image_verify", "/usr/bin/hdiutil", ["verify", dmgPath]);
    dmgIdentity = inspectIdentity({ probe, artifactKind: "dmg", artifactPath: dmgPath, approvedIdentity: validatedApproval.signing_identity, tempRoot });
    verifyNotaryStatus({ probe, artifactKind: "dmg", requestId: dmgNotaryRequestId, notaryProfile });
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
  if (canonical(appIdentity) !== canonical(dmgIdentity)) fail("APP_DMG_IDENTITY_MISMATCH", "app and DMG signing identities differ");
  const probeEvidence = probe.complete(nativeExecution);
  const observedAt = probeEvidence.execution.last_completed_at;
  const receipt = {
    schema_version: MACOS_RELEASE_BOUNDARY_SCHEMA,
    checkpoint_id: MACOS_RELEASE_CHECKPOINT,
    verdict: nativeExecution ? "PASS" : "TEST_ONLY",
    generated_at: observedAt,
    source: {
      source_sha: manifest.source_sha,
      source_tree: manifest.source_tree,
      source_dirty: false,
      version: manifest.version,
      channel: "formal",
      app_id: "com.amic.matter.desktop",
    },
    build_manifest: { ...manifestArtifact, built_at: manifest.built_at },
    artifacts: { application, disk_image: diskImage },
    approval: {
      intake_id: validatedApproval.approval_id,
      intake_sha256: canonicalSha256(validatedApproval),
      approved_at: validatedApproval.approved_at,
      expires_at: validatedApproval.expires_at,
    },
    signing_identity: appIdentity,
    notarization: {
      application: { request_id: appNotaryRequestId.toLowerCase(), status: "accepted", observed_at: observedAt },
      disk_image: { request_id: dmgNotaryRequestId.toLowerCase(), status: "accepted", observed_at: observedAt },
    },
    checks: probeEvidence.checks,
    execution: probeEvidence.execution,
    boundaries: {
      probe_mode: "read_only_os_validation",
      artifact_mutation: false,
      signing_executed: false,
      notarization_submission_executed: false,
      notary_status_query_executed: true,
      network_contacted: true,
      legacy_markdown_authority: false,
    },
    claims: {
      public_release_claim: false,
      production_go_live_claim: false,
      owner_approval_claim: false,
      app_store_distribution_claim: false,
    },
  };
  validateMacosReleaseBoundaryReceipt(receipt, {
    repoRoot,
    manifest,
    manifestPath,
    appPath,
    dmgPath,
    approval: validatedApproval,
    expectedSourceSha,
    expectedSourceTree,
    now: observedAt,
    requireReleaseManifest: false,
    allowTestOnly: !nativeExecution,
  });
  return Object.freeze(receipt);
}

export function createMacosReleaseManifestBinding(receipt, receiptFileSha256) {
  assertSha256(receiptFileSha256, "receipt file sha256");
  return Object.freeze({
    receipt_schema_version: receipt.schema_version,
    receipt_verdict: receipt.verdict,
    receipt_sha256: receiptFileSha256,
    source_sha: receipt.source.source_sha,
    source_tree: receipt.source.source_tree,
    application_path: receipt.artifacts.application.path,
    application_sha256: receipt.artifacts.application.sha256,
    application_bytes: receipt.artifacts.application.bytes,
    disk_image_path: receipt.artifacts.disk_image.path,
    disk_image_sha256: receipt.artifacts.disk_image.sha256,
    disk_image_bytes: receipt.artifacts.disk_image.bytes,
    fingerprint_algorithm: receipt.signing_identity.fingerprint_algorithm,
    certificate_fingerprint: receipt.signing_identity.certificate_fingerprint,
    team_id: receipt.signing_identity.team_id,
    application_notary_request_id: receipt.notarization.application.request_id,
    disk_image_notary_request_id: receipt.notarization.disk_image.request_id,
    app_codesign_verify: receipt.checks.app_codesign_verify.status,
    app_gatekeeper_assess: receipt.checks.app_gatekeeper_assess.status,
    app_stapler_validate: receipt.checks.app_stapler_validate.status,
    app_notarization_status: receipt.notarization.application.status,
    dmg_codesign_verify: receipt.checks.dmg_codesign_verify.status,
    dmg_gatekeeper_assess: receipt.checks.dmg_gatekeeper_assess.status,
    dmg_stapler_validate: receipt.checks.dmg_stapler_validate.status,
    dmg_image_verify: receipt.checks.dmg_image_verify.status,
    dmg_notarization_status: receipt.notarization.disk_image.status,
    probe_execution_mode: receipt.execution.mode,
    probe_command_count: receipt.execution.command_count_executed,
    probe_sequence_sha256: receipt.execution.sequence_sha256,
    observed_at: receipt.generated_at,
  });
}

function requireStrictLiveValidation(validation, missingCode, missingMessage) {
  const binding = isRecord(validation) ? STRICT_RELEASE_VALIDATIONS.get(validation) : null;
  if (!binding || validation.verdict !== "PASS") fail(missingCode, missingMessage);
  const currentApplication = describeAppBundle({ repoRoot: binding.repoRoot, appPath: binding.appPath });
  const currentDiskImage = describeFileArtifact({ repoRoot: binding.repoRoot, artifactPath: binding.dmgPath, field: "disk_image" });
  if (canonical(currentApplication) !== canonical(binding.application)
    || canonical(currentDiskImage) !== canonical(binding.disk_image)) {
    fail("MACOS_LIVE_ARTIFACT_DRIFT", "app or DMG bytes changed after live RFD-TUW-012 validation");
  }
  return binding;
}

function rf13DistMacosReleaseSidecar(validation, receiptId) {
  if (typeof receiptId !== "string" || !SAFE_ID.test(receiptId)) fail("INVALID_RECEIPT_ID", "RF13-DIST sidecar receipt_id must be a safe opaque identifier");
  assertSha256(validation.disk_image_sha256, "disk image sha256");
  return Object.freeze({
    schema_version: RF13_DIST_MACOS_RELEASE_SIDECAR_SCHEMA,
    receipt_id: receiptId,
    gate: "macos_release",
    status: "PASS",
    source_sha: validation.source_sha,
    source_tree: validation.source_tree,
    artifact_sha256: Object.freeze([validation.disk_image_sha256].sort()),
    executed: true,
    authoritative: true,
    template: false,
  });
}

export function createRf13DistMacosReleaseSidecar(validation, { receiptId } = {}) {
  requireStrictLiveValidation(validation, "STRICT_PASS_REQUIRED", "RF13-DIST macOS sidecar requires the result of strict RFD-TUW-012 release validation");
  return rf13DistMacosReleaseSidecar(validation, receiptId);
}

export function validateRf13DistMacosReleaseSidecar(sidecar, {
  liveValidation,
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactSha256,
  expectedReceiptSha256,
} = {}) {
  scanSecrets(sidecar);
  requireStrictLiveValidation(liveValidation, "MACOS_LIVE_AUTHORITY_REQUIRED", "macOS release consumers require same-process live RFD-TUW-012 authority");
  assertGitObject(expectedSourceSha, "expected source_sha");
  assertGitObject(expectedSourceTree, "expected source_tree");
  assertSha256(expectedArtifactSha256, "expected disk image sha256");
  assertSha256(expectedReceiptSha256, "expected receipt sha256");
  const expectedSidecar = rf13DistMacosReleaseSidecar(liveValidation, sidecar?.receipt_id);
  if (canonical(sidecar) !== canonical(expectedSidecar)
    || sidecar.source_sha !== expectedSourceSha
    || sidecar.source_tree !== expectedSourceTree
    || sidecar.artifact_sha256[0] !== expectedArtifactSha256) {
    fail("MACOS_RELEASE_SIDECAR_BINDING_MISMATCH", "RF13-DIST macOS release sidecar differs from the exact source or disk image");
  }
  if (liveValidation.execution_mode !== "native_live_revalidation"
    || liveValidation.command_count_executed !== CHECK_KEYS.length
    || liveValidation.source_sha !== expectedSourceSha
    || liveValidation.source_tree !== expectedSourceTree
    || liveValidation.disk_image_sha256 !== expectedArtifactSha256
    || liveValidation.receipt_sha256 !== expectedReceiptSha256) {
    fail("MACOS_LIVE_AUTHORITY_MISMATCH", "live RFD-TUW-012 authority differs from the exact receipt, source, or disk image");
  }
  return Object.freeze({
    verdict: "PASS",
    authoritative: true,
    source_sha: liveValidation.source_sha,
    source_tree: liveValidation.source_tree,
    application_sha256: liveValidation.application_sha256,
    disk_image_sha256: liveValidation.disk_image_sha256,
    receipt_sha256: liveValidation.receipt_sha256,
  });
}

function validateDescriptor(actual, expected, field, isBundle = false) {
  const keys = isBundle
    ? ["path", "sha256", "bytes", "file_count", "digest_algorithm"]
    : ["path", "sha256", "bytes", "digest_algorithm"];
  exactKeys(actual, keys, field);
  assertSha256(actual.sha256, `${field}.sha256`);
  assertPositiveBytes(actual.bytes, `${field}.bytes`);
  if (isBundle && (!Number.isInteger(actual.file_count) || actual.file_count <= 0 || actual.digest_algorithm !== APP_BUNDLE_DIGEST_ALGORITHM)) fail("APP_DESCRIPTOR_INVALID", "application artifact descriptor is invalid");
  if (!isBundle && actual.digest_algorithm !== "sha256(file bytes)") fail("FILE_DESCRIPTOR_INVALID", `${field} digest algorithm is invalid`, { field });
  if (canonical(actual) !== canonical(expected)) fail("ARTIFACT_BINDING_MISMATCH", `${field} hash, size, or path differs from the exact artifact`, { field });
}

function validateProbeEvidence(receipt, allowTestOnly) {
  exactKeys(receipt.execution, ["mode", "command_count_executed", "first_started_at", "last_completed_at", "sequence_sha256"], "receipt execution");
  const testOnly = receipt.execution.mode === "test_only_injected_runner";
  if (receipt.execution.mode !== "native_live" && !testOnly) fail("PROBE_EXECUTION_MODE_INVALID", "receipt execution mode is unsupported");
  if (testOnly !== (receipt.verdict === "TEST_ONLY") || (!testOnly && receipt.verdict !== "PASS")) fail("PROBE_EXECUTION_VERDICT_MISMATCH", "receipt verdict does not match its probe execution mode");
  if (testOnly && !allowTestOnly) fail("TEST_ONLY_RECEIPT", "injected-runner receipts can never authorize macOS release PASS");
  if (receipt.execution.command_count_executed !== CHECK_KEYS.length || receipt.execution.command_count_executed <= 0) fail("PROBE_COMMAND_COUNT_INVALID", "receipt must record the complete nonzero probe command count");
  assertSha256(receipt.execution.sequence_sha256, "receipt execution sequence_sha256");
  const firstStartedAt = iso(receipt.execution.first_started_at, "receipt execution first_started_at");
  const lastCompletedAt = iso(receipt.execution.last_completed_at, "receipt execution last_completed_at");
  if (firstStartedAt >= lastCompletedAt || receipt.execution.last_completed_at !== receipt.generated_at) fail("PROBE_EXECUTION_TIME_INVALID", "receipt execution timestamps are not a complete monotonic interval");
  exactKeys(receipt.checks, CHECK_KEYS, "receipt checks");
  let previousCompletedAt = -Infinity;
  for (const [index, key] of CHECK_KEYS.entries()) {
    const check = receipt.checks[key];
    exactKeys(check, ["command_id", "sequence", "status", "exit_code", "started_at", "completed_at", "raw_transcript_sha256"], `checks.${key}`);
    const startedAt = iso(check.started_at, `checks.${key}.started_at`);
    const completedAt = iso(check.completed_at, `checks.${key}.completed_at`);
    assertSha256(check.raw_transcript_sha256, `checks.${key}.raw_transcript_sha256`);
    if (check.command_id !== key || check.sequence !== index + 1 || check.status !== "PASS" || check.exit_code !== 0) fail("OS_CHECK_NOT_PASS", `${key} was not independently recorded as PASS`, { command_id: key });
    if (startedAt <= previousCompletedAt || completedAt <= startedAt) fail("PROBE_EXECUTION_TIME_INVALID", `${key} timestamps are not strictly monotonic`, { command_id: key });
    previousCompletedAt = completedAt;
  }
  if (receipt.checks[CHECK_KEYS[0]].started_at !== receipt.execution.first_started_at || receipt.checks[CHECK_KEYS.at(-1)].completed_at !== receipt.execution.last_completed_at) fail("PROBE_EXECUTION_TIME_INVALID", "execution interval does not bind the first and last checks");
  if (canonicalSha256(CHECK_KEYS.map((id) => receipt.checks[id])) !== receipt.execution.sequence_sha256) fail("PROBE_SEQUENCE_HASH_MISMATCH", "probe sequence hash does not match the exact command records");
}

function validateReleaseManifest(releaseManifest, receipt, receiptFileSha256, expectedReleaseRoot) {
  if (!isRecord(releaseManifest)) fail("RELEASE_MANIFEST_REQUIRED", "a structured formal release manifest is required to authorize PASS");
  if (releaseManifest.schema_version !== MACOS_RELEASE_MANIFEST_SCHEMA) fail("RELEASE_MANIFEST_SCHEMA_MISMATCH", "release manifest schema is not the structured RFD-TUW-012 schema");
  if (typeof releaseManifest.release_id !== "string" || !SAFE_ID.test(releaseManifest.release_id)) fail("RELEASE_MANIFEST_ID_INVALID", "release manifest release_id is invalid");
  if (typeof releaseManifest.artifact_root !== "string" || path.posix.isAbsolute(releaseManifest.artifact_root) || path.posix.normalize(releaseManifest.artifact_root) !== releaseManifest.artifact_root || releaseManifest.artifact_root.startsWith("../")) fail("RELEASE_MANIFEST_ROOT_INVALID", "release manifest artifact_root is not a canonical repository-relative path");
  if (expectedReleaseRoot && releaseManifest.artifact_root !== expectedReleaseRoot) fail("RELEASE_MANIFEST_ROOT_MISMATCH", "release manifest artifact_root differs from the exact SHA-scoped stage");
  if (Object.hasOwn(releaseManifest, "macos_signing")) fail("LEGACY_SIGNING_MANIFEST_REJECTED", "legacy prose-derived macos_signing fields can never authorize PASS");
  if (releaseManifest.source_sha !== receipt.source.source_sha || releaseManifest.source_tree !== receipt.source.source_tree || releaseManifest.source_dirty !== false) fail("RELEASE_MANIFEST_SOURCE_MISMATCH", "release manifest source differs from the macOS receipt");
  if (!new Set(["formal", "formal-candidate"]).has(releaseManifest.channel) || releaseManifest.app_id !== receipt.source.app_id) fail("RELEASE_MANIFEST_SCOPE_MISMATCH", "release manifest is not the formal Matter desktop scope");
  if (releaseManifest.public_release_claim !== false || releaseManifest.production_go_live_claim !== false || releaseManifest.owner_approval_claim !== false) fail("RELEASE_MANIFEST_CLAIM_MISMATCH", "technical macOS validation must not claim release or go-live approval");
  const expected = createMacosReleaseManifestBinding(receipt, receiptFileSha256);
  if (canonical(releaseManifest.macos_release_boundary) !== canonical(expected)) fail("RELEASE_MANIFEST_SIGNING_MISMATCH", "release manifest macOS signing/notary binding differs from the structured receipt");
}

export function validateMacosReleaseBoundaryReceipt(receipt, {
  repoRoot,
  manifest,
  manifestPath,
  appPath,
  dmgPath,
  approval,
  releaseManifest,
  receiptFileSha256,
  expectedSourceSha,
  expectedSourceTree,
  expectedReleaseRoot,
  now = new Date().toISOString(),
  maxAgeMs = MACOS_RELEASE_RECEIPT_MAX_AGE_MS,
  requireReleaseManifest = true,
  allowTestOnly = false,
} = {}) {
  scanSecrets(receipt);
  exactKeys(receipt, [
    "schema_version", "checkpoint_id", "verdict", "generated_at", "source", "build_manifest", "artifacts",
    "approval", "signing_identity", "notarization", "checks", "execution", "boundaries", "claims",
  ], "macOS release receipt");
  if (receipt.schema_version !== MACOS_RELEASE_BOUNDARY_SCHEMA || receipt.checkpoint_id !== MACOS_RELEASE_CHECKPOINT || !["PASS", "TEST_ONLY"].includes(receipt.verdict)) fail("RECEIPT_NOT_PASS", "only a structured RFD-TUW-012 receipt can enter boundary validation");
  const generatedAt = iso(receipt.generated_at, "generated_at");
  const nowMs = iso(now, "validation time");
  if (generatedAt > nowMs + 60_000 || nowMs - generatedAt > maxAgeMs) fail("RECEIPT_STALE", "macOS release receipt is outside the allowed freshness window");
  validateProbeEvidence(receipt, allowTestOnly);
  const validatedApproval = validateMacosReleaseApproval(approval, { expectedSourceSha, expectedSourceTree, now: receipt.generated_at });
  exactKeys(receipt.source, ["source_sha", "source_tree", "source_dirty", "version", "channel", "app_id"], "receipt source");
  assertGitObject(receipt.source.source_sha, "receipt source_sha");
  assertGitObject(receipt.source.source_tree, "receipt source_tree");
  if (receipt.source.source_dirty !== false || receipt.source.channel !== "formal" || receipt.source.app_id !== "com.amic.matter.desktop") fail("FORMAL_ARTIFACT_REQUIRED", "receipt is not bound to a clean formal artifact");
  if (expectedSourceSha && receipt.source.source_sha !== expectedSourceSha) fail("SOURCE_SHA_MISMATCH", "receipt source SHA differs from the expected source");
  if (expectedSourceTree && receipt.source.source_tree !== expectedSourceTree) fail("SOURCE_TREE_MISMATCH", "receipt source tree differs from the expected source");
  if (receipt.source.source_sha !== validatedApproval.source_sha || receipt.source.source_tree !== validatedApproval.source_tree) fail("APPROVAL_SOURCE_MISMATCH", "receipt source differs from approved intake");
  validateFormalMacBuildManifest(manifest, { expectedSourceSha: receipt.source.source_sha, expectedSourceTree: receipt.source.source_tree });
  if (manifest.version !== receipt.source.version) fail("BUILD_MANIFEST_VERSION_MISMATCH", "build manifest version differs from the receipt");
  const manifestDescriptor = describeFileArtifact({ repoRoot, artifactPath: manifestPath, field: "build_manifest" });
  exactKeys(receipt.build_manifest, ["path", "sha256", "bytes", "digest_algorithm", "built_at"], "build_manifest");
  const { built_at: receiptBuiltAt, ...receiptManifestDescriptor } = receipt.build_manifest;
  validateDescriptor(receiptManifestDescriptor, manifestDescriptor, "build_manifest");
  if (receiptBuiltAt !== manifest.built_at || generatedAt < iso(manifest.built_at, "build manifest built_at")) fail("BUILD_MANIFEST_TIME_MISMATCH", "receipt predates or disagrees with the formal build manifest");
  exactKeys(receipt.artifacts, ["application", "disk_image"], "receipt artifacts");
  assertReceiptPath(repoRoot, receipt.artifacts.application.path, appPath, "application.path");
  assertReceiptPath(repoRoot, receipt.artifacts.disk_image.path, dmgPath, "disk_image.path");
  validateDescriptor(receipt.artifacts.application, describeAppBundle({ repoRoot, appPath }), "application", true);
  validateDescriptor(receipt.artifacts.disk_image, describeFileArtifact({ repoRoot, artifactPath: dmgPath, field: "disk_image" }), "disk_image");
  exactKeys(receipt.approval, ["intake_id", "intake_sha256", "approved_at", "expires_at"], "receipt approval");
  if (receipt.approval.intake_id !== validatedApproval.approval_id || receipt.approval.intake_sha256 !== canonicalSha256(validatedApproval) || receipt.approval.approved_at !== validatedApproval.approved_at || receipt.approval.expires_at !== validatedApproval.expires_at) fail("APPROVAL_BINDING_MISMATCH", "receipt is not bound to the supplied approved intake");
  const receiptIdentity = normalizedFingerprint(receipt.signing_identity);
  if (canonical(receiptIdentity) !== canonical(validatedApproval.signing_identity)) fail("SIGNING_IDENTITY_MISMATCH", "receipt identity differs from the approved fingerprint and Team ID");
  exactKeys(receipt.notarization, ["application", "disk_image"], "notarization");
  for (const [field, entry] of Object.entries(receipt.notarization)) {
    exactKeys(entry, ["request_id", "status", "observed_at"], `notarization.${field}`);
    if (!REQUEST_ID.test(entry.request_id ?? "") || entry.status !== "accepted" || entry.observed_at !== receipt.generated_at) fail("NOTARIZATION_NOT_ACCEPTED", `${field} notarization evidence is incomplete or mismatched`, { field });
  }
  if (receipt.notarization.application.request_id === receipt.notarization.disk_image.request_id) fail("NOTARY_REQUEST_ID_REUSED", "app and DMG must have independently recorded notary request IDs");
  exactKeys(receipt.boundaries, ["probe_mode", "artifact_mutation", "signing_executed", "notarization_submission_executed", "notary_status_query_executed", "network_contacted", "legacy_markdown_authority"], "receipt boundaries");
  if (receipt.boundaries.probe_mode !== "read_only_os_validation" || receipt.boundaries.artifact_mutation !== false || receipt.boundaries.signing_executed !== false || receipt.boundaries.notarization_submission_executed !== false || receipt.boundaries.notary_status_query_executed !== true || receipt.boundaries.network_contacted !== true || receipt.boundaries.legacy_markdown_authority !== false) fail("BOUNDARY_CLAIM_INVALID", "receipt does not preserve the read-only validation boundary");
  exactKeys(receipt.claims, ["public_release_claim", "production_go_live_claim", "owner_approval_claim", "app_store_distribution_claim"], "receipt claims");
  if (Object.values(receipt.claims).some((value) => value !== false)) fail("RELEASE_CLAIM_INVALID", "technical receipt must not claim public release, go-live, owner, or App Store approval");
  if (requireReleaseManifest) {
    if (!receiptFileSha256) fail("RECEIPT_FILE_HASH_REQUIRED", "release validation requires the exact structured receipt file hash");
    validateReleaseManifest(releaseManifest, receipt, receiptFileSha256, expectedReleaseRoot);
  }
  const validation = Object.freeze({
    verdict: "STRUCTURAL_ONLY",
    receipt_verdict: receipt.verdict,
    authoritative: false,
    checkpoint_id: receipt.checkpoint_id,
    source_sha: receipt.source.source_sha,
    source_tree: receipt.source.source_tree,
    application_sha256: receipt.artifacts.application.sha256,
    disk_image_sha256: receipt.artifacts.disk_image.sha256,
    certificate_fingerprint: receipt.signing_identity.certificate_fingerprint,
    team_id: receipt.signing_identity.team_id,
    receipt_sha256: receiptFileSha256 ?? null,
  });
  return validation;
}

export function validateMacosReleaseBoundaryLive(receipt, {
  repoRoot,
  manifest,
  manifestPath,
  appPath,
  dmgPath,
  approval,
  releaseManifest,
  receiptFileSha256,
  expectedSourceSha,
  expectedSourceTree,
  expectedReleaseRoot,
  notaryProfile,
  sourceDirty,
  now = new Date().toISOString(),
} = {}) {
  const structural = validateMacosReleaseBoundaryReceipt(receipt, {
    repoRoot,
    manifest,
    manifestPath,
    appPath,
    dmgPath,
    approval,
    releaseManifest,
    receiptFileSha256,
    expectedSourceSha,
    expectedSourceTree,
    expectedReleaseRoot,
    now,
  });
  const liveReceipt = collectMacosReleaseBoundaryReceipt({
    repoRoot,
    manifestPath,
    appPath,
    dmgPath,
    approval,
    appNotaryRequestId: receipt.notarization.application.request_id,
    dmgNotaryRequestId: receipt.notarization.disk_image.request_id,
    notaryProfile,
    expectedSourceSha,
    expectedSourceTree,
    sourceDirty,
    now,
  });
  validateMacosReleaseBoundaryReceipt(liveReceipt, {
    repoRoot,
    manifest,
    manifestPath,
    appPath,
    dmgPath,
    approval,
    expectedSourceSha,
    expectedSourceTree,
    now: liveReceipt.generated_at,
    requireReleaseManifest: false,
  });
  const stableEvidence = (value) => ({
    source: value.source,
    build_manifest: value.build_manifest,
    artifacts: value.artifacts,
    approval: value.approval,
    signing_identity: value.signing_identity,
    notary_request_ids: {
      application: value.notarization.application.request_id,
      disk_image: value.notarization.disk_image.request_id,
    },
  });
  if (canonical(stableEvidence(receipt)) !== canonical(stableEvidence(liveReceipt))) fail("LIVE_PROBE_RECEIPT_MISMATCH", "live native probe evidence differs from the staged receipt");
  const validation = Object.freeze({
    ...structural,
    verdict: "PASS",
    receipt_verdict: "PASS",
    authoritative: true,
    execution_mode: "native_live_revalidation",
    command_count_executed: liveReceipt.execution.command_count_executed,
    live_probe_sequence_sha256: liveReceipt.execution.sequence_sha256,
  });
  STRICT_RELEASE_VALIDATIONS.set(validation, Object.freeze({
    repoRoot: path.resolve(repoRoot),
    appPath: path.resolve(appPath),
    dmgPath: path.resolve(dmgPath),
    application: liveReceipt.artifacts.application,
    disk_image: liveReceipt.artifacts.disk_image,
  }));
  return validation;
}

export function createMacosReleaseBoundaryPlan({ sourceSha, sourceTree, sourceDirty, blockers = [] } = {}) {
  assertGitObject(sourceSha, "source_sha");
  assertGitObject(sourceTree, "source_tree");
  const safeBlockers = blockers.map((entry) => ({ code: entry.code, category: entry.category }));
  const artifactBlocked = safeBlockers.some((entry) => entry.category === "artifact");
  const authorityBlocked = safeBlockers.some((entry) => entry.category === "authority");
  return Object.freeze({
    schema_version: MACOS_RELEASE_PLAN_SCHEMA,
    checkpoint_id: MACOS_RELEASE_CHECKPOINT,
    verdict: artifactBlocked ? "BLOCKED_BY_ARTIFACT" : authorityBlocked ? "BLOCKED_BY_AUTHORITY" : "READY_FOR_READ_ONLY_PROBE",
    generated_at: new Date().toISOString(),
    source: { source_sha: sourceSha, source_tree: sourceTree, source_dirty: Boolean(sourceDirty) },
    blockers: safeBlockers,
    command_plan: MACOS_RELEASE_COMMAND_PLAN,
    boundaries: {
      command_count_executed: 0,
      artifact_mutation: false,
      signing_executed: false,
      notarization_submission_executed: false,
      notary_status_query_executed: false,
      network_contacted: false,
      legacy_markdown_authority: false,
    },
    claims: { macos_release: false, public_release: false, production_go_live: false, owner_approval: false },
  });
}

export function assertNoSigningOrSubmissionCommands(plan = MACOS_RELEASE_COMMAND_PLAN) {
  const serialized = JSON.stringify(plan);
  if (/"--sign"|"--force"|"submit"|"staple"/u.test(serialized)) fail("MUTATING_COMMAND_FORBIDDEN", "macOS validation plan contains a signing, submission, or stapling command");
  return true;
}

assertNoSigningOrSubmissionCommands();
