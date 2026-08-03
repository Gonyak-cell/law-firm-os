import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  readFileSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import {
  readDesktopReleaseArtifactStage,
  requireDesktopReleaseArtifact,
} from "./matter-desktop-release-paths.mjs";
import { validateRf13DistMacosReleaseSidecar } from "./matter-desktop-macos-release-boundary.mjs";
import {
  RF13_DIST_MEMBER_MANIFEST_SCHEMA,
  RF13_DIST_PRIVACY_MEMBER_SCHEMA,
  RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
  RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA,
  assertDesktopArtifactPrivacyValidation,
  validateDesktopArtifactMemberManifest,
  validateRf13DistPrivacyMemberReceipt,
  validateRf13DistPrivacyMemberReceiptStructure,
  validateWindowsInstallerNativePrivacyReceipt,
  validateWindowsInstallerPrivacyBuilderReceiptStructure,
  validateWindowsInstallerPrivacyNativeReceiptStructure,
} from "./matter-desktop-artifact-privacy.mjs";
import {
  FORMAL_DEPLOYED_API_QA_CAPABILITY_SCHEMA,
  validateFormalDeployedApiAuthorityCapability,
} from "./formal-deployed-api-package-qa.mjs";
import {
  HUMAN_AUTHORITY_RECEIPT_SCHEMA,
  assertRf13HumanAuthorityCapability,
  readRf13HumanAuthorityReceipt,
} from "./rf13-dist-authority-contract.mjs";
import {
  FORMAL_DEPLOYED_API_RESTART_CAPABILITY_SCHEMA,
  assertFormalDeployedApiRestartCapability,
} from "./formal-deployed-api-restart-contract.mjs";
import { validateMatterRollbackRf13DistSidecar } from "./matter-rollback-execution-evidence.mjs";
import {
  WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
  WINDOWS_SIGNING_AUTHORITY_SCHEMA,
  validateWindowsSigningAuthorityReceipt,
} from "./matter-desktop-windows-release-gate.mjs";
import {
  RF13_DIST_AUTHORITY_CONSUMPTION_SCHEMA,
  Rf13DistAuthorityLedgerError,
  sealRf13DistAuthorityActions,
} from "./rf13-dist-authority-ledger.mjs";

export const RF13_DIST_MANIFEST_SCHEMA = "law-firm-os.rf13-dist.manifest.v1";
export const RF13_DIST_CANARY_FIXTURE_SCHEMA = "law-firm-os.rf13-dist.canary-observation-fixture.v1";
export const RF13_DIST_CANARY_RECEIPT_SCHEMA = "law-firm-os.rf13-dist.canary-receipt.v1";
export const RF13_DIST_CANARY_CAPABILITY_SCHEMA = "law-firm-os.rf13-dist.canary-live-capability.v1";
export const RF13_DIST_PRIVACY_INDEX_SCHEMA = "law-firm-os.rfd-tuw-007.staged-privacy-evidence.v1";
export const RF13_DIST_FINAL_SEALER_CAPABILITY_SCHEMA = "law-firm-os.rf13-dist.final-sealer-capability.v1";
export { RF13_DIST_AUTHORITY_CONSUMPTION_SCHEMA };
export { HUMAN_AUTHORITY_RECEIPT_SCHEMA };
export {
  RF13_DIST_MEMBER_MANIFEST_SCHEMA,
  RF13_DIST_PRIVACY_MEMBER_SCHEMA,
  RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
  RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA,
  validateDesktopArtifactMemberManifest,
  validateRf13DistPrivacyMemberReceipt,
  validateWindowsInstallerPrivacyBuilderReceiptStructure as validateWindowsInstallerPrivacyBuilderReceipt,
  validateWindowsInstallerPrivacyNativeReceiptStructure as validateWindowsInstallerPrivacyNativeReceipt,
};

export const RF13_DIST_GATE_RECEIPT_SCHEMAS = Object.freeze({
  macos_release: "law-firm-os.rf13-dist.macos-release-receipt.v1",
  windows_native_qa: "law-firm-os.rf13-dist.windows-native-qa-receipt.v1",
  windows_release: "law-firm-os.rf13-dist.windows-release-decision-receipt.v1",
  exact_source_api: "law-firm-os.rf13-dist.exact-source-api-receipt.v1",
  login: "law-firm-os.rf13-dist.login-receipt.v1",
  restart: "law-firm-os.rf13-dist.restart-receipt.v1",
  rollback: "law-firm-os.rf13-dist.rollback-receipt.v1",
});

export const RF13_DIST_GATE_KEYS = Object.freeze([
  "privacy",
  "clean_sha",
  "macos_release",
  "windows_native_qa",
  "windows_release",
  "exact_source_api",
  "login",
  "restart",
  "rollback",
  "canary",
]);

export const RF13_DIST_ROLLBACK_TRIGGER_CODES = Object.freeze([
  "LOGIN_OR_SESSION_FAILURE",
  "TENANT_DATA_EXPOSURE",
  "WRITE_DUPLICATION_OR_AR_MISMATCH",
  "UNCERTAIN_WRITE_RESULT",
  "CORE_READ_CONSECUTIVE_FAILURE",
  "LATENCY_REGRESSION",
  "SIGNATURE_OR_HASH_MISMATCH",
]);

export function rf13DistReleaseId(version, sourceSha) {
  if (!VERSION.test(version ?? "")) fail("INVALID_VERSION", "RF13-DIST release ID requires a valid version");
  sha1(sourceSha, "RF13-DIST release ID source SHA");
  return `RF13-DIST-${version}-${sourceSha}`;
}

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/u;
const SENSITIVE_VALUE_PATTERNS = [
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/u,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{12,}\b/iu,
];
const HISTORICAL_RF13_SCHEMAS = new Set([
  "law-firm-os.rf13-final-gate.v1",
]);
const HISTORICAL_PATH_PATTERN = /(?:^|\/)(?:rf13-final-gate|rf13-package-preflight)(?:-|\/)|(?:^|\/)internal(?:\/|$)|matter-internal|apps\/desktop\/dist\/(?:mac|win)(?:\/|$)/iu;
const HISTORICAL_ID_PATTERN = /(?:^|[._:-])(?:internal|rf13-final-gate|rf13-package-preflight)(?:[._:-]|$)|matter-internal/iu;
const RF13_DIST_ARTIFACT_SPECS = Object.freeze({
  macos_build_manifest: Object.freeze({ platform: "darwin", kind: "build_manifest" }),
  macos_dmg_image: Object.freeze({ platform: "darwin", kind: "dmg_image" }),
  macos_zip_archive: Object.freeze({ platform: "darwin", kind: "zip_archive" }),
  macos_build_receipt: Object.freeze({ platform: "darwin", kind: "receipt" }),
  macos_release_boundary_receipt: Object.freeze({ platform: "darwin", kind: "receipt" }),
  windows_build_manifest: Object.freeze({ platform: "win32", kind: "build_manifest" }),
  windows_installer: Object.freeze({ platform: "win32", kind: "nsis_installer" }),
  windows_installer_blockmap: Object.freeze({ platform: "win32", kind: "installer_blockmap" }),
  windows_installer_manifest: Object.freeze({ platform: "win32", kind: "installer_manifest" }),
  windows_manifest_signature: Object.freeze({ platform: "win32", kind: "detached_receipt_signature" }),
  windows_package_zip: Object.freeze({ platform: "win32", kind: "unsigned_package_zip" }),
  windows_build_receipt: Object.freeze({ platform: "win32", kind: "receipt" }),
});
const REQUIRED_ARTIFACT_IDS = Object.freeze(Object.keys(RF13_DIST_ARTIFACT_SPECS));
const PRIVACY_SUPPLEMENTAL_ARTIFACT_IDS = Object.freeze(["windows_package_directory"]);
const CLEAN_SHA_ENTRYPOINTS = Object.freeze([
  "scripts/build-matter-desktop-mac.mjs",
  "scripts/build-matter-desktop-win.mjs",
  "scripts/build-matter-desktop-win-installer.mjs",
  "scripts/release-matter-desktop-formal.mjs",
]);
const CLEAN_SHA_ALLOWED_REFS = Object.freeze([
  "main",
  "integration/forest-v<semver>",
  "release/forest-v<semver>",
  "DETACHED exact SHA",
]);
const CLEAN_SHA_BRANCH = /^(?:main|integration\/forest-v\d+\.\d+\.\d+|release\/forest-v\d+\.\d+\.\d+|DETACHED)$/u;
const CANARY_CHECK_KEYS = Object.freeze([
  "isolated_profile_install",
  "health",
  "login",
  "home",
  "matter",
  "people",
  "time_billing",
  "restart",
]);
const CANARY_ACTIONS = new Set([
  "home_read",
  "matter_read",
  "people_read",
  "time_entry_read",
  "billing_read",
]);
const DEPLOYED_API_AUTHORITY_KEYS = Object.freeze([
  "capability_schema_version",
  "receipt_sha256",
  "api_endpoint_sha256",
  "api_artifact_sha256",
  "manifest_sha256",
  "executed_package_sha256",
  "transcript_sha256",
  "package_qa_receipt_sha256",
  "package_qa_transcript_sha256",
  "package_qa_privacy_corpus_sha256",
  "authority_sha256",
]);
const RESTART_AUTHORITY_KEYS = Object.freeze([
  "capability_schema_version",
  "restart_receipt_sha256",
  "api_endpoint_sha256",
  "rfd015_receipt_sha256",
  "rfd015_capability_schema_version",
  "rfd015_authority_sha256",
  "rfd015_api_artifact_sha256",
  "rfd015_manifest_sha256",
  "rfd015_executed_package_sha256",
  "rfd015_transcript_sha256",
  "rfd015_package_qa_receipt_sha256",
  "rfd015_package_qa_transcript_sha256",
  "rfd015_package_qa_privacy_corpus_sha256",
]);
const HUMAN_AUTHORITY_AVAILABILITY_CODES = new Set([
  "HUMAN_AUTHORITY_KEY_NOT_APPROVED",
  "HUMAN_AUTHORITY_EXPIRED",
  "HUMAN_AUTHORITY_NOT_YET_VALID",
  "HUMAN_AUTHORITY_READ_FAILED",
  "HUMAN_AUTHORITY_SIGNATURE_READ_FAILED",
  "HUMAN_AUTHORITY_PATH_INVALID",
]);
const LIVE_CANARY_CAPABILITIES = new WeakSet();
const FINAL_SEALER_CAPABILITIES = new WeakSet();
const FINAL_SEAL_REQUEST = Object.freeze({});
// RFD-TUW-018 has no reviewed installed-package canary adapter in this
// worktree. Keep the authority source module-private so a caller cannot
// substitute observations or an adapter and turn a structural receipt into
// operational evidence.
const TRACKED_RFD018_ACTUAL_CANARY_ADAPTER = null;

export class Rf13DistValidationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "Rf13DistValidationError";
    this.code = code;
  }
}

function fail(code, message) {
  throw new Rf13DistValidationError(code, message);
}

function object(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_OBJECT", `${label} must be an object`);
  }
  return value;
}

function exactKeys(value, keys, label) {
  object(value, label);
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("SCHEMA_KEYS_MISMATCH", `${label} keys do not match the closed schema`);
  }
}

function canonicalRecord(value) {
  return JSON.stringify(Object.fromEntries(Object.entries(value).sort(([left], [right]) => (
    left < right ? -1 : left > right ? 1 : 0
  ))));
}

function sha1(value, label, { allowZero = false } = {}) {
  if (!SHA1.test(value ?? "") || (!allowZero && /^0+$/u.test(value))) {
    fail("INVALID_SOURCE_SHA", `${label} must be a full non-zero Git SHA`);
  }
}

function sha256(value, label, { allowZero = false } = {}) {
  if (!SHA256.test(value ?? "") || (!allowZero && /^0+$/u.test(value))) {
    fail("INVALID_SHA256", `${label} must be a full non-zero SHA-256`);
  }
}

function canonicalIso(value, label) {
  if (typeof value !== "string") fail("INVALID_TIMESTAMP", `${label} must be a canonical ISO timestamp`);
  try {
    if (new Date(value).toISOString() !== value) fail("INVALID_TIMESTAMP", `${label} must be a canonical ISO timestamp`);
  } catch {
    fail("INVALID_TIMESTAMP", `${label} must be a canonical ISO timestamp`);
  }
}

function safeId(value, label) {
  if (!SAFE_ID.test(value ?? "")) fail("INVALID_ID", `${label} must be a safe opaque identifier`);
  if (HISTORICAL_ID_PATTERN.test(value)) fail("HISTORICAL_RF13_REJECTED", `${label} cannot identify historical or internal RF13 evidence`);
}

function assertNoSensitiveValues(value) {
  if (typeof value === "string") {
    if (SENSITIVE_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
      fail("SENSITIVE_MATERIAL_REJECTED", "identity or secret material is not allowed in RF13-DIST evidence");
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) assertNoSensitiveValues(item);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) assertNoSensitiveValues(item);
  }
}

function sortedUnique(values, label) {
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => typeof value !== "string")) {
    fail("INVALID_LIST", `${label} must be a non-empty string array`);
  }
  const sorted = [...values].sort();
  if (new Set(sorted).size !== sorted.length || JSON.stringify(values) !== JSON.stringify(sorted)) {
    fail("NON_CANONICAL_LIST", `${label} must be sorted and unique`);
  }
  return sorted;
}

function equalList(actual, expected, code, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) fail(code, message);
}

function fileSha256(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function jsonSha256(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function safeRepoFile(repoRoot, relativePath) {
  if (typeof relativePath !== "string"
    || relativePath.length === 0
    || relativePath.includes("\\")
    || path.posix.isAbsolute(relativePath)
    || path.posix.normalize(relativePath) !== relativePath
    || relativePath.split("/").includes("..")) {
    fail("UNSAFE_EVIDENCE_PATH", "evidence path must be a normalized repository-relative path");
  }
  if (HISTORICAL_PATH_PATTERN.test(relativePath)) {
    fail("HISTORICAL_RF13_REJECTED", "historical or internal RF13 evidence cannot satisfy RF13-DIST");
  }
  const root = realpathSync(repoRoot);
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(`${root}${path.sep}`)) fail("UNSAFE_EVIDENCE_PATH", "evidence path escapes the repository root");
  if (!existsSync(absolute)) fail("EVIDENCE_FILE_MISSING", "referenced evidence file is missing");
  const fileStat = lstatSync(absolute);
  if (!fileStat.isFile() || fileStat.isSymbolicLink()) fail("UNSAFE_EVIDENCE_FILE", "referenced evidence must be a regular non-symlink file");
  const realAbsolute = realpathSync(absolute);
  if (!realAbsolute.startsWith(`${root}${path.sep}`) || realAbsolute !== absolute) {
    fail("UNSAFE_EVIDENCE_FILE", "referenced evidence cannot traverse a symlink");
  }
  return realAbsolute;
}

function readJsonReference(reference, { repoRoot, expectedSchema }) {
  exactKeys(reference, ["path", "sha256"], "evidence reference");
  sha256(reference.sha256, "evidence reference sha256");
  const absolute = safeRepoFile(repoRoot, reference.path);
  const body = readFileSync(absolute);
  if (createHash("sha256").update(body).digest("hex") !== reference.sha256) fail("EVIDENCE_HASH_MISMATCH", "referenced evidence hash does not match");
  let receipt;
  try {
    receipt = JSON.parse(body.toString("utf8"));
  } catch {
    fail("EVIDENCE_JSON_INVALID", "referenced evidence must be valid JSON");
  }
  if (HISTORICAL_RF13_SCHEMAS.has(receipt?.schema_version)) {
    fail("HISTORICAL_RF13_REJECTED", "historical RF13 receipt schema cannot satisfy RF13-DIST");
  }
  if (expectedSchema && receipt?.schema_version !== expectedSchema) {
    fail("EVIDENCE_SCHEMA_MISMATCH", "referenced evidence schema is not authoritative for this gate");
  }
  assertNoSensitiveValues(receipt);
  return receipt;
}

export function validateRf13HumanAuthorityReference(reference, {
  repoRoot,
  expectedReleaseId,
  expectedEnvironment,
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactHashes,
  expectedAction,
  expectedReleaseScope,
  expectedCanaryUserCount,
} = {}) {
  readJsonReference(reference, {
    repoRoot,
    expectedSchema: HUMAN_AUTHORITY_RECEIPT_SCHEMA,
  });
  try {
    const verified = readRf13HumanAuthorityReceipt({
      receiptPath: reference.path,
      repoRoot,
      expectedReleaseId,
      expectedEnvironment,
      expectedSourceSha,
      expectedSourceTree,
      expectedArtifactSha256: expectedArtifactHashes,
      expectedAction,
      expectedReleaseScope,
      expectedCanaryUserCount,
    });
    if (verified.status !== "PASS" || !verified.capability) {
      fail("HUMAN_AUTHORITY_REQUIRED", "a current Ed25519-signed human authority receipt is required");
    }
    return assertRf13HumanAuthorityCapability(verified.capability, {
      releaseId: expectedReleaseId,
      environment: expectedEnvironment,
      action: expectedAction,
      sourceSha: expectedSourceSha,
      sourceTree: expectedSourceTree,
      artifactSha256: expectedArtifactHashes,
      releaseScope: expectedReleaseScope,
      canaryUserCount: expectedCanaryUserCount,
    });
  } catch (error) {
    if (error instanceof Rf13DistValidationError) throw error;
    if (HUMAN_AUTHORITY_AVAILABILITY_CODES.has(error?.code)) {
      fail("HUMAN_AUTHORITY_REQUIRED", "a current Ed25519-signed receipt from a tracked release-owner key is required");
    }
    fail(error?.code ?? "HUMAN_AUTHORITY_INVALID", "the signed human authority receipt failed verification");
  }
}

function readCanonicalReceiptReference(reference, { repoRoot, expectedSchema, label }) {
  exactKeys(reference, ["path", "sha256", "bytes", "schema_version", "receipt_id"], `${label} reference`);
  sha256(reference.sha256, `${label} reference sha256`);
  if (!Number.isSafeInteger(reference.bytes) || reference.bytes < 1) {
    fail("EVIDENCE_REFERENCE_INVALID", `${label} reference bytes must be a positive integer`);
  }
  if (reference.schema_version !== expectedSchema) {
    fail("EVIDENCE_SCHEMA_MISMATCH", `${label} reference schema is not authoritative`);
  }
  safeId(reference.receipt_id, `${label} reference receipt id`);
  const absolute = safeRepoFile(repoRoot, reference.path);
  const body = readFileSync(absolute);
  if (body.length !== reference.bytes || createHash("sha256").update(body).digest("hex") !== reference.sha256) {
    fail("EVIDENCE_HASH_MISMATCH", `${label} reference bytes or hash do not match`);
  }
  let receipt;
  try {
    receipt = JSON.parse(body.toString("utf8"));
  } catch {
    fail("EVIDENCE_JSON_INVALID", `${label} must be valid JSON`);
  }
  if (receipt?.schema_version !== reference.schema_version || receipt?.receipt_id !== reference.receipt_id) {
    fail("EVIDENCE_REFERENCE_MISMATCH", `${label} schema or receipt id does not match its canonical reference`);
  }
  assertNoSensitiveValues(receipt);
  return receipt;
}

function requireReleaseEvidenceReference(reference, artifactRoot, label) {
  const evidencePrefix = `${artifactRoot}/evidence/`;
  if (typeof reference?.path !== "string" || !reference.path.startsWith(evidencePrefix)) {
    fail("EVIDENCE_PATH_NOT_SHA_SCOPED", `${label} must be sealed under the exact-SHA formal release evidence root`);
  }
}

function receiptReference(pathValue, sha256Value) {
  return Object.freeze({ path: pathValue, sha256: sha256Value });
}

function validateGateReceipt(receipt, {
  gate,
  expectedSchema,
  expectedStatus,
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactHashes,
}) {
  exactKeys(receipt, [
    "schema_version",
    "receipt_id",
    "gate",
    "status",
    "source_sha",
    "source_tree",
    "artifact_sha256",
    "executed",
    "authoritative",
    "template",
  ], `${gate} receipt`);
  if (receipt.schema_version !== expectedSchema || receipt.gate !== gate || receipt.status !== expectedStatus) {
    fail("GATE_RECEIPT_MISMATCH", "gate receipt type or status does not match the manifest gate");
  }
  safeId(receipt.receipt_id, `${gate} receipt id`);
  sha1(receipt.source_sha, `${gate} receipt source_sha`);
  sha1(receipt.source_tree, `${gate} receipt source_tree`);
  if (receipt.source_sha !== expectedSourceSha || receipt.source_tree !== expectedSourceTree) {
    fail("SOURCE_BINDING_MISMATCH", "gate receipt source binding does not match RF13-DIST");
  }
  const receiptHashes = sortedUnique(receipt.artifact_sha256, `${gate} receipt artifact_sha256`);
  for (const digest of receiptHashes) sha256(digest, `${gate} receipt artifact sha256`);
  equalList(receiptHashes, expectedArtifactHashes, "ARTIFACT_BINDING_MISMATCH", "gate receipt artifact hashes do not match RF13-DIST");
  if (receipt.authoritative !== true || receipt.template !== false) {
    fail("NON_AUTHORITATIVE_RECEIPT", "gate receipt must be executed authoritative evidence, not a template");
  }
  const expectedExecuted = expectedStatus === "PASS";
  if (receipt.executed !== expectedExecuted) {
    fail("GATE_EXECUTION_STATE_MISMATCH", "gate receipt execution state does not match its status");
  }
  return receipt;
}

function validateDeployedApiGateReceipt(receipt, {
  gate,
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactHashes,
}) {
  exactKeys(receipt, [
    "schema_version",
    "receipt_id",
    "gate",
    "status",
    "source_sha",
    "source_tree",
    "artifact_sha256",
    "authority",
    "executed",
    "authoritative",
    "template",
  ], `${gate} receipt`);
  if (!new Set(["exact_source_api", "login"]).has(gate)
    || receipt.schema_version !== RF13_DIST_GATE_RECEIPT_SCHEMAS[gate]
    || receipt.gate !== gate
    || receipt.status !== "PASS"
    || receipt.source_sha !== expectedSourceSha
    || receipt.source_tree !== expectedSourceTree
    || receipt.executed !== true
    || receipt.authoritative !== true
    || receipt.template !== false) {
    fail("DEPLOYED_API_GATE_RECEIPT_INVALID", "deployed-API gate receipt is incomplete or source-mismatched");
  }
  safeId(receipt.receipt_id, `${gate} receipt id`);
  const artifactHashes = sortedUnique(receipt.artifact_sha256, `${gate} receipt artifact hashes`);
  for (const digest of artifactHashes) sha256(digest, `${gate} receipt artifact sha256`);
  equalList(artifactHashes, expectedArtifactHashes, "ARTIFACT_BINDING_MISMATCH", "deployed-API gate artifact hashes do not match RF13-DIST");
  exactKeys(receipt.authority, DEPLOYED_API_AUTHORITY_KEYS, `${gate} authority`);
  if (receipt.authority.capability_schema_version !== FORMAL_DEPLOYED_API_QA_CAPABILITY_SCHEMA) {
    fail("DEPLOYED_API_CAPABILITY_SCHEMA_INVALID", "deployed-API sidecar does not name the current opaque capability schema");
  }
  for (const field of DEPLOYED_API_AUTHORITY_KEYS.slice(1)) sha256(receipt.authority[field], `${gate} authority ${field}`);
  return receipt;
}

export function validateRf13DistDeployedApiSidecars({
  exactSourceApiReceipt,
  loginReceipt,
  capability,
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactSha256,
  expectedArtifactHashes,
} = {}) {
  const receipts = [
    validateDeployedApiGateReceipt(exactSourceApiReceipt, {
      gate: "exact_source_api",
      expectedSourceSha,
      expectedSourceTree,
      expectedArtifactHashes,
    }),
    validateDeployedApiGateReceipt(loginReceipt, {
      gate: "login",
      expectedSourceSha,
      expectedSourceTree,
      expectedArtifactHashes,
    }),
  ];
  if (canonicalRecord(receipts[0].authority) !== canonicalRecord(receipts[1].authority)) {
    fail("DEPLOYED_API_GATE_AUTHORITY_MISMATCH", "exact-source API and login sidecars must bind the same RFD-TUW-015 authority");
  }
  const authority = receipts[0].authority;
  let checked;
  try {
    checked = validateFormalDeployedApiAuthorityCapability(capability, {
      sourceSha: expectedSourceSha,
      sourceTree: expectedSourceTree,
      apiEndpointSha256: authority.api_endpoint_sha256,
      artifactSha256: expectedArtifactSha256,
      manifestSha256: authority.manifest_sha256,
      executedPackageSha256: authority.executed_package_sha256,
      packageQaTranscriptSha256: authority.package_qa_transcript_sha256,
      packageQaPrivacyCorpusSha256: authority.package_qa_privacy_corpus_sha256,
    });
  } catch {
    fail("DEPLOYED_API_LIVE_AUTHORITY_REQUIRED", "deployed-API and login gates require the canonical same-process RFD-TUW-015 capability");
  }
  const expectedAuthority = {
    capability_schema_version: checked.schema_version,
    receipt_sha256: checked.receipt_sha256,
    api_endpoint_sha256: checked.api_endpoint_sha256,
    api_artifact_sha256: checked.api_artifact_sha256,
    manifest_sha256: checked.manifest_sha256,
    executed_package_sha256: checked.executed_package_sha256,
    transcript_sha256: checked.transcript_sha256,
    package_qa_receipt_sha256: checked.package_qa_receipt_sha256,
    package_qa_transcript_sha256: checked.package_qa_transcript_sha256,
    package_qa_privacy_corpus_sha256: checked.package_qa_privacy_corpus_sha256,
    authority_sha256: checked.authority_sha256,
  };
  if (canonicalRecord(authority) !== canonicalRecord(expectedAuthority)
    || checked.source_sha !== expectedSourceSha
    || checked.source_tree !== expectedSourceTree
    || checked.api_source_revision !== expectedSourceSha
    || checked.artifact_sha256 !== expectedArtifactSha256) {
    fail("DEPLOYED_API_LIVE_AUTHORITY_MISMATCH", "deployed-API sidecars differ from the exact canonical RFD-TUW-015 capability");
  }
  return Object.freeze({
    verdict: "PASS",
    authoritative: true,
    source_sha: checked.source_sha,
    source_tree: checked.source_tree,
    artifact_sha256: checked.artifact_sha256,
    api_endpoint_sha256: checked.api_endpoint_sha256,
  });
}

function validateRestartGateReceipt(receipt, {
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactHashes,
}) {
  exactKeys(receipt, [
    "schema_version",
    "receipt_id",
    "gate",
    "status",
    "source_sha",
    "source_tree",
    "artifact_sha256",
    "authority",
    "executed",
    "authoritative",
    "template",
  ], "restart receipt");
  if (receipt.schema_version !== RF13_DIST_GATE_RECEIPT_SCHEMAS.restart
    || receipt.gate !== "restart"
    || receipt.status !== "PASS"
    || receipt.source_sha !== expectedSourceSha
    || receipt.source_tree !== expectedSourceTree
    || receipt.executed !== true
    || receipt.authoritative !== true
    || receipt.template !== false) {
    fail("RESTART_GATE_RECEIPT_INVALID", "restart gate receipt is incomplete or source-mismatched");
  }
  safeId(receipt.receipt_id, "restart receipt id");
  const artifactHashes = sortedUnique(receipt.artifact_sha256, "restart receipt artifact hashes");
  for (const digest of artifactHashes) sha256(digest, "restart receipt artifact sha256");
  equalList(artifactHashes, expectedArtifactHashes, "ARTIFACT_BINDING_MISMATCH", "restart receipt artifact hashes do not match RF13-DIST");
  exactKeys(receipt.authority, RESTART_AUTHORITY_KEYS, "restart authority");
  if (receipt.authority.capability_schema_version !== FORMAL_DEPLOYED_API_RESTART_CAPABILITY_SCHEMA
    || receipt.authority.rfd015_capability_schema_version !== FORMAL_DEPLOYED_API_QA_CAPABILITY_SCHEMA) {
    fail("RESTART_CAPABILITY_SCHEMA_INVALID", "restart sidecar does not name the current opaque capability schemas");
  }
  for (const field of RESTART_AUTHORITY_KEYS.filter((field) => !field.endsWith("schema_version"))) {
    sha256(receipt.authority[field], `restart authority ${field}`);
  }
  return receipt;
}

export function validateRf13DistRestartSidecar({
  receipt,
  capability,
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactSha256,
  expectedArtifactHashes,
  expectedDeployedApiAuthority,
} = {}) {
  validateRestartGateReceipt(receipt, {
    expectedSourceSha,
    expectedSourceTree,
    expectedArtifactHashes,
  });
  const authority = receipt.authority;
  if (expectedDeployedApiAuthority) {
    const expectedUpstream = {
      api_endpoint_sha256: expectedDeployedApiAuthority.api_endpoint_sha256,
      rfd015_receipt_sha256: expectedDeployedApiAuthority.receipt_sha256,
      rfd015_capability_schema_version: expectedDeployedApiAuthority.capability_schema_version,
      rfd015_authority_sha256: expectedDeployedApiAuthority.authority_sha256,
      rfd015_api_artifact_sha256: expectedDeployedApiAuthority.api_artifact_sha256,
      rfd015_manifest_sha256: expectedDeployedApiAuthority.manifest_sha256,
      rfd015_executed_package_sha256: expectedDeployedApiAuthority.executed_package_sha256,
      rfd015_transcript_sha256: expectedDeployedApiAuthority.transcript_sha256,
      rfd015_package_qa_receipt_sha256: expectedDeployedApiAuthority.package_qa_receipt_sha256,
      rfd015_package_qa_transcript_sha256: expectedDeployedApiAuthority.package_qa_transcript_sha256,
      rfd015_package_qa_privacy_corpus_sha256: expectedDeployedApiAuthority.package_qa_privacy_corpus_sha256,
    };
    for (const [field, expected] of Object.entries(expectedUpstream)) {
      if (authority[field] !== expected) {
        fail("RESTART_UPSTREAM_AUTHORITY_MISMATCH", "restart sidecar differs from the exact RFD-TUW-015 authority used by RF13-DIST");
      }
    }
  }
  let checked;
  try {
    checked = assertFormalDeployedApiRestartCapability(capability, {
      sourceSha: expectedSourceSha,
      sourceTree: expectedSourceTree,
      apiEndpointSha256: authority.api_endpoint_sha256,
      artifactSha256: expectedArtifactSha256,
      restartReceiptSha256: authority.restart_receipt_sha256,
      rfd015ReceiptSha256: authority.rfd015_receipt_sha256,
      rfd015AuthoritySha256: authority.rfd015_authority_sha256,
      rfd015ApiArtifactSha256: authority.rfd015_api_artifact_sha256,
      rfd015ManifestSha256: authority.rfd015_manifest_sha256,
      rfd015ExecutedPackageSha256: authority.rfd015_executed_package_sha256,
      rfd015TranscriptSha256: authority.rfd015_transcript_sha256,
      rfd015PackageQaReceiptSha256: authority.rfd015_package_qa_receipt_sha256,
      rfd015PackageQaTranscriptSha256: authority.rfd015_package_qa_transcript_sha256,
      rfd015PackageQaPrivacyCorpusSha256: authority.rfd015_package_qa_privacy_corpus_sha256,
    });
  } catch {
    fail("RESTART_LIVE_AUTHORITY_REQUIRED", "restart gate requires the canonical same-process RFD-TUW-016 capability");
  }
  const expectedAuthority = {
    capability_schema_version: checked.schema_version,
    restart_receipt_sha256: checked.restart_receipt_sha256,
    api_endpoint_sha256: checked.api_endpoint_sha256,
    rfd015_receipt_sha256: checked.rfd015_receipt_sha256,
    rfd015_capability_schema_version: checked.rfd015_capability_schema_version,
    rfd015_authority_sha256: checked.rfd015_authority_sha256,
    rfd015_api_artifact_sha256: checked.rfd015_api_artifact_sha256,
    rfd015_manifest_sha256: checked.rfd015_manifest_sha256,
    rfd015_executed_package_sha256: checked.rfd015_executed_package_sha256,
    rfd015_transcript_sha256: checked.rfd015_transcript_sha256,
    rfd015_package_qa_receipt_sha256: checked.rfd015_package_qa_receipt_sha256,
    rfd015_package_qa_transcript_sha256: checked.rfd015_package_qa_transcript_sha256,
    rfd015_package_qa_privacy_corpus_sha256: checked.rfd015_package_qa_privacy_corpus_sha256,
  };
  if (canonicalRecord(authority) !== canonicalRecord(expectedAuthority)) {
    fail("RESTART_LIVE_AUTHORITY_MISMATCH", "restart sidecar differs from the exact canonical RFD-TUW-016 capability");
  }
  return Object.freeze({
    verdict: "PASS",
    authoritative: true,
    source_sha: checked.source_sha,
    source_tree: checked.source_tree,
    artifact_sha256: checked.artifact_sha256,
    api_endpoint_sha256: checked.api_endpoint_sha256,
  });
}

export function validateRf13DistRollbackSidecar({
  receipt,
  validation,
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactHashes,
} = {}) {
  try {
    return validateMatterRollbackRf13DistSidecar(receipt, {
      validation,
      expectedSourceSha,
      expectedSourceTree,
      expectedArtifactSha256: expectedArtifactHashes,
    });
  } catch (error) {
    const code = typeof error?.code === "string"
      ? error.code
      : "MATTER_ROLLBACK_LIVE_AUTHORITY_REQUIRED";
    fail(code, "RF13-DIST requires same-process committed RFD-TUW-017 rollback authority");
  }
}

function validateCleanShaReceipt(receipt, {
  expectedSourceSha,
  expectedSourceTree,
}) {
  exactKeys(receipt, [
    "verdict",
    "mode",
    "protected_entrypoints",
    "protected_entrypoint_count",
    "formal_bypass_count",
    "structural_contracts",
    "allowed_refs",
    "gate",
    "source_identity",
  ], "clean-SHA receipt");
  if (receipt.verdict !== "PASS"
    || receipt.mode !== "current"
    || receipt.protected_entrypoint_count !== CLEAN_SHA_ENTRYPOINTS.length
    || receipt.formal_bypass_count !== 0) {
    fail("CLEAN_SHA_RECEIPT_INVALID", "clean-SHA receipt must be an enforced current-source PASS");
  }
  equalList(receipt.protected_entrypoints, CLEAN_SHA_ENTRYPOINTS, "CLEAN_SHA_RECEIPT_INVALID", "clean-SHA protected entrypoints are incomplete");
  equalList(receipt.allowed_refs, CLEAN_SHA_ALLOWED_REFS, "CLEAN_SHA_RECEIPT_INVALID", "clean-SHA release refs do not match policy");
  if (!Array.isArray(receipt.structural_contracts)
    || receipt.structural_contracts.length !== CLEAN_SHA_ENTRYPOINTS.length) {
    fail("CLEAN_SHA_RECEIPT_INVALID", "clean-SHA receipt must include every entrypoint contract");
  }
  receipt.structural_contracts.forEach((contract, index) => {
    exactKeys(contract, [
      "relative_path",
      "gate_invocation",
      "formal_channel_binding",
      "no_mutation_before_gate",
      "preflight_max_lines",
    ], "clean-SHA entrypoint contract");
    if (contract.relative_path !== CLEAN_SHA_ENTRYPOINTS[index]
      || contract.gate_invocation !== "top_level"
      || !["literal_formal", "canonical_channel_policy"].includes(contract.formal_channel_binding)
      || contract.no_mutation_before_gate !== true
      || !Number.isSafeInteger(contract.preflight_max_lines)
      || contract.preflight_max_lines < 1) {
      fail("CLEAN_SHA_RECEIPT_INVALID", "clean-SHA entrypoint contract is incomplete or out of order");
    }
  });
  exactKeys(receipt.gate, [
    "enforced",
    "verdict",
    "source_sha",
    "source_branch",
    "ignored_evidence_dirty_paths",
  ], "clean-SHA enforced gate");
  exactKeys(receipt.source_identity, [
    "sha",
    "tree",
    "branch",
    "dirty",
    "dirty_paths",
    "ignored_generated_evidence_paths",
  ], "clean-SHA source identity");
  const ignoredGatePaths = receipt.gate.ignored_evidence_dirty_paths;
  const ignoredIdentityPaths = receipt.source_identity.ignored_generated_evidence_paths;
  if (!Array.isArray(ignoredGatePaths)
    || !Array.isArray(ignoredIdentityPaths)
    || ignoredGatePaths.some((value) => typeof value !== "string")
    || ignoredIdentityPaths.some((value) => typeof value !== "string")
    || JSON.stringify(ignoredGatePaths) !== JSON.stringify(ignoredIdentityPaths)
    || receipt.gate.enforced !== true
    || receipt.gate.verdict !== "PASS"
    || receipt.gate.source_sha !== expectedSourceSha
    || receipt.source_identity.sha !== expectedSourceSha
    || receipt.source_identity.tree !== expectedSourceTree
    || receipt.source_identity.dirty !== false
    || !Array.isArray(receipt.source_identity.dirty_paths)
    || receipt.source_identity.dirty_paths.length !== 0
    || receipt.gate.source_branch !== receipt.source_identity.branch
    || !CLEAN_SHA_BRANCH.test(receipt.source_identity.branch ?? "")) {
    fail("SOURCE_BINDING_MISMATCH", "clean-SHA receipt source identity does not match RF13-DIST");
  }
}

function validateWindowsReleaseDecisionReceipt(receipt, {
  expectedStatus,
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactHashes,
  expectedInstallerSha256,
  expectedVersion,
  repoRoot,
  sealedAt,
}) {
  exactKeys(receipt, [
    "schema_version",
    "receipt_id",
    "gate",
    "status",
    "source_sha",
    "source_tree",
    "artifact_sha256",
    "decision_evaluated",
    "native_qa_executed",
    "signing_execution",
    "approved_certificate_fingerprint_sha256",
    "rfd013_receipt",
    "authority_receipt",
    "authoritative",
    "template",
  ], "windows release-decision receipt");
  if (receipt.schema_version !== RF13_DIST_GATE_RECEIPT_SCHEMAS.windows_release
    || receipt.gate !== "windows_release"
    || receipt.status !== expectedStatus
    || receipt.decision_evaluated !== true
    || receipt.native_qa_executed !== true
    || receipt.authoritative !== true
    || receipt.template !== false) {
    fail("GATE_RECEIPT_MISMATCH", "Windows release-decision receipt is not authoritative or does not match RF13-DIST");
  }
  safeId(receipt.receipt_id, "windows release-decision receipt id");
  sha1(receipt.source_sha, "windows release-decision source_sha");
  sha1(receipt.source_tree, "windows release-decision source_tree");
  if (receipt.source_sha !== expectedSourceSha || receipt.source_tree !== expectedSourceTree) {
    fail("SOURCE_BINDING_MISMATCH", "Windows release-decision source binding does not match RF13-DIST");
  }
  const receiptHashes = sortedUnique(receipt.artifact_sha256, "windows release-decision artifact_sha256");
  for (const digest of receiptHashes) sha256(digest, "windows release-decision artifact sha256");
  equalList(receiptHashes, expectedArtifactHashes, "ARTIFACT_BINDING_MISMATCH", "Windows release-decision artifact hashes do not match RF13-DIST");
  const rfd013Receipt = readCanonicalReceiptReference(receipt.rfd013_receipt, {
    repoRoot,
    expectedSchema: WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
    label: "strict RFD-TUW-013 receipt",
  });
  const authorityReceipt = readCanonicalReceiptReference(receipt.authority_receipt, {
    repoRoot,
    expectedSchema: WINDOWS_SIGNING_AUTHORITY_SCHEMA,
    label: "Windows signing authority receipt",
  });
  const rfd013AuthorityReference = rfd013Receipt.authenticode?.authority_receipt;
  if (rfd013AuthorityReference?.path !== receipt.authority_receipt.path
    || rfd013AuthorityReference?.sha256 !== receipt.authority_receipt.sha256
    || rfd013AuthorityReference?.receipt_id !== receipt.authority_receipt.receipt_id) {
    fail("WINDOWS_AUTHORITY_REFERENCE_MISMATCH", "strict RFD-TUW-013 evidence does not bind the referenced authority receipt");
  }
  if (rfd013Receipt.native_qa !== "PASS"
    || rfd013Receipt.windows_release !== expectedStatus
    || rfd013Receipt.source?.revision !== expectedSourceSha
    || rfd013Receipt.source?.source_tree !== expectedSourceTree
    || rfd013Receipt.source?.source_dirty !== false
    || rfd013Receipt.release?.version !== expectedVersion
    || rfd013Receipt.release?.channel !== "formal"
    || !SAFE_ID.test(rfd013Receipt.release?.id ?? "")
    || rfd013Receipt.package?.installer?.sha256 !== expectedInstallerSha256
    || rfd013Receipt.boundaries?.native_windows_executed !== true
    || rfd013Receipt.boundaries?.historical_receipt_accepted !== false
    || rfd013Receipt.boundaries?.certificate_secret_recorded !== false) {
    fail("WINDOWS_STRICT_RECEIPT_MISMATCH", "Windows release decision is not bound to a clean strict native-QA receipt");
  }
  const strictArtifactHashes = sortedUnique(rfd013Receipt.package?.release_artifact_sha256, "strict RFD-TUW-013 artifact hashes");
  equalList(strictArtifactHashes, expectedArtifactHashes, "ARTIFACT_BINDING_MISMATCH", "strict RFD-TUW-013 artifact hashes do not match RF13-DIST");
  let authority;
  try {
    authority = validateWindowsSigningAuthorityReceipt(authorityReceipt, {
      expectedSourceSha,
      expectedSourceTree,
      expectedReleaseId: rfd013Receipt.release.id,
      expectedVersion,
      expectedInstallerSha256,
      now: Date.parse(sealedAt),
    });
  } catch {
    fail("WINDOWS_SIGNING_AUTHORITY_INVALID", "Windows signing authority receipt failed its strict source, artifact, or approval validation");
  }
  if (expectedStatus === "PASS") {
    const normalizedThumbprint = authority.signer?.thumbprint_sha1;
    const expectedFingerprint = typeof normalizedThumbprint === "string"
      ? createHash("sha256").update(normalizedThumbprint, "utf8").digest("hex")
      : null;
    if (receipt.signing_execution !== true
      || authority.status !== "APPROVED"
      || rfd013Receipt.reason_code !== null
      || rfd013Receipt.authenticode?.signature_state !== "SIGNED_APPROVED"
      || rfd013Receipt.authenticode?.signer_binding?.thumbprint_sha1 !== normalizedThumbprint
      || rfd013Receipt.authenticode?.signer_binding?.authority_receipt_id !== authorityReceipt.receipt_id
      || rfd013Receipt.boundaries?.authenticode_claim !== true
      || receipt.approved_certificate_fingerprint_sha256 !== expectedFingerprint) {
      fail("WINDOWS_SIGNING_AUTHORITY_INVALID", "Windows PASS is not bound to the approved signer and strict RFD-TUW-013 decision");
    }
  } else if (receipt.signing_execution !== false
    || receipt.approved_certificate_fingerprint_sha256 !== null
    || authority.status !== "BLOCKED_BY_AUTHORITY"
    || rfd013Receipt.reason_code !== "AUTHENTICODE_SIGNATURE_ABSENT"
    || rfd013Receipt.authenticode?.signature_state !== "UNSIGNED"
    || rfd013Receipt.authenticode?.signer_binding !== null
    || rfd013Receipt.boundaries?.authenticode_claim !== false) {
    fail("WINDOWS_AUTHORITY_BLOCK_INVALID", "authority-blocked Windows release must record no signing execution or approved fingerprint");
  }
}

function median(values) {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function validateLatencyAction(action) {
  exactKeys(action, [
    "action",
    "baseline_median_ms",
    "samples_ms",
    "recheck_after_minutes",
    "recheck_samples_ms",
  ], "canary latency action");
  if (!CANARY_ACTIONS.has(action.action)) fail("INVALID_CANARY_ACTION", "canary latency action is not in the closed action set");
  if (!Number.isSafeInteger(action.baseline_median_ms) || action.baseline_median_ms < 1) {
    fail("INVALID_CANARY_LATENCY", "canary baseline latency must be a positive integer");
  }
  for (const key of ["samples_ms", "recheck_samples_ms"]) {
    if (!Array.isArray(action[key])
      || action[key].length !== 5
      || action[key].some((sample) => !Number.isSafeInteger(sample) || sample < 0)) {
      fail("INVALID_CANARY_LATENCY", "canary latency observations require exactly five non-negative integer samples");
    }
  }
  if (action.recheck_after_minutes < 5 || !Number.isSafeInteger(action.recheck_after_minutes)) {
    fail("INVALID_CANARY_LATENCY", "canary latency recheck must occur after at least five minutes");
  }
  return median(action.samples_ms) > action.baseline_median_ms * 2
    && median(action.recheck_samples_ms) > action.baseline_median_ms * 2;
}

function validateCanaryMonitoring(monitoring, { template = false } = {}) {
  exactKeys(monitoring, [
    "duration_minutes",
    "five_xx_count",
    "timeout_count",
    "consecutive_core_read_failures",
    "login_failure_count",
    "tenant_exposure_count",
    "write_integrity_failure_count",
    "uncertain_write_result_count",
    "signature_or_hash_mismatch_count",
    "latency_actions",
  ], "canary monitoring");
  for (const key of [
    "duration_minutes",
    "five_xx_count",
    "timeout_count",
    "consecutive_core_read_failures",
    "login_failure_count",
    "tenant_exposure_count",
    "write_integrity_failure_count",
    "uncertain_write_result_count",
    "signature_or_hash_mismatch_count",
  ]) {
    if (!Number.isSafeInteger(monitoring[key]) || monitoring[key] < 0) {
      fail("INVALID_CANARY_COUNT", "canary monitoring counters must be non-negative integers");
    }
  }
  if (monitoring.consecutive_core_read_failures > monitoring.five_xx_count + monitoring.timeout_count) {
    fail("INVALID_CANARY_COUNT", "consecutive core-read failures must be accounted for by 5xx or timeout observations");
  }
  if (template) {
    if (monitoring.duration_minutes !== 0 || monitoring.latency_actions.length !== 0) {
      fail("INVALID_BLOCKED_TEMPLATE", "canary template must not claim executed monitoring");
    }
    return [];
  }
  if (monitoring.duration_minutes < 15) fail("CANARY_WINDOW_TOO_SHORT", "canary monitoring window must be at least 15 minutes");
  if (!Array.isArray(monitoring.latency_actions) || monitoring.latency_actions.length !== CANARY_ACTIONS.size) {
    fail("CANARY_LATENCY_COVERAGE_MISSING", "canary monitoring must cover all five core latency actions");
  }
  const actionNames = [...monitoring.latency_actions.map(({ action }) => action)].sort();
  equalList(actionNames, [...CANARY_ACTIONS].sort(), "CANARY_LATENCY_COVERAGE_MISSING", "canary latency action coverage is incomplete");
  return monitoring.latency_actions.filter(validateLatencyAction).map(({ action }) => action);
}

function rollbackTriggerCodes(monitoring, observations) {
  const codes = [];
  if (monitoring.login_failure_count > 0
    || observations.some(({ login, restart }) => login !== "PASS" || restart !== "PASS")) {
    codes.push("LOGIN_OR_SESSION_FAILURE");
  }
  if (monitoring.tenant_exposure_count > 0) codes.push("TENANT_DATA_EXPOSURE");
  if (monitoring.write_integrity_failure_count > 0) codes.push("WRITE_DUPLICATION_OR_AR_MISMATCH");
  if (monitoring.uncertain_write_result_count > 0) codes.push("UNCERTAIN_WRITE_RESULT");
  if (monitoring.consecutive_core_read_failures >= 2) codes.push("CORE_READ_CONSECUTIVE_FAILURE");
  if (monitoring.latency_actions.some(validateLatencyAction)) codes.push("LATENCY_REGRESSION");
  if (monitoring.signature_or_hash_mismatch_count > 0) codes.push("SIGNATURE_OR_HASH_MISMATCH");
  return codes.sort();
}

export function validateCanaryObservationFixture(fixture) {
  assertNoSensitiveValues(fixture);
  exactKeys(fixture, [
    "schema_version",
    "source_sha",
    "source_tree",
    "macos_artifact_sha256",
    "synthetic",
    "user_count",
    "observations",
    "monitoring",
    "boundary",
  ], "canary observation fixture");
  if (fixture.schema_version !== RF13_DIST_CANARY_FIXTURE_SCHEMA || fixture.synthetic !== true) {
    fail("CANARY_FIXTURE_NOT_SYNTHETIC", "local canary runner accepts sanitized synthetic fixtures only");
  }
  sha1(fixture.source_sha, "canary fixture source_sha");
  sha1(fixture.source_tree, "canary fixture source_tree");
  sha256(fixture.macos_artifact_sha256, "canary fixture macos artifact sha256");
  if (![1, 2].includes(fixture.user_count)
    || !Array.isArray(fixture.observations)
    || fixture.observations.length !== fixture.user_count) {
    fail("CANARY_USER_COUNT_INVALID", "canary fixture must contain one or two anonymous observations");
  }
  for (const observation of fixture.observations) {
    exactKeys(observation, CANARY_CHECK_KEYS, "anonymous canary observation");
    for (const key of CANARY_CHECK_KEYS) {
      if (!["PASS", "FAIL"].includes(observation[key])) fail("INVALID_CANARY_CHECK", "canary check status must be PASS or FAIL");
    }
  }
  validateCanaryMonitoring(fixture.monitoring);
  exactKeys(fixture.boundary, [
    "sanitized",
    "identities_present",
    "private_hashes_present",
    "real_client_data_used",
    "network_contacted_by_fixture",
    "mutation_executed_by_fixture",
  ], "canary fixture boundary");
  if (fixture.boundary.sanitized !== true
    || fixture.boundary.identities_present !== false
    || fixture.boundary.private_hashes_present !== false
    || fixture.boundary.real_client_data_used !== false
    || fixture.boundary.network_contacted_by_fixture !== false
    || fixture.boundary.mutation_executed_by_fixture !== false) {
    fail("CANARY_FIXTURE_BOUNDARY_INVALID", "canary fixture must remain sanitized, synthetic, and non-mutating");
  }
  return fixture;
}

function injectRollbackTrigger(fixture, code) {
  if (!RF13_DIST_ROLLBACK_TRIGGER_CODES.includes(code)) fail("UNKNOWN_ROLLBACK_TRIGGER", "rollback trigger injection code is not supported");
  const injected = structuredClone(fixture);
  if (code === "LOGIN_OR_SESSION_FAILURE") injected.monitoring.login_failure_count = 1;
  if (code === "TENANT_DATA_EXPOSURE") injected.monitoring.tenant_exposure_count = 1;
  if (code === "WRITE_DUPLICATION_OR_AR_MISMATCH") injected.monitoring.write_integrity_failure_count = 1;
  if (code === "UNCERTAIN_WRITE_RESULT") injected.monitoring.uncertain_write_result_count = 1;
  if (code === "CORE_READ_CONSECUTIVE_FAILURE") {
    injected.monitoring.five_xx_count = 2;
    injected.monitoring.consecutive_core_read_failures = 2;
  }
  if (code === "SIGNATURE_OR_HASH_MISMATCH") injected.monitoring.signature_or_hash_mismatch_count = 1;
  if (code === "LATENCY_REGRESSION") {
    const action = injected.monitoring.latency_actions[0];
    action.samples_ms = Array(5).fill(action.baseline_median_ms * 3);
    action.recheck_samples_ms = Array(5).fill(action.baseline_median_ms * 3);
  }
  return injected;
}

function aggregateCanaryChecks(observations) {
  return Object.fromEntries(CANARY_CHECK_KEYS.map((key) => [
    key,
    observations.every((observation) => observation[key] === "PASS") ? "PASS" : "FAIL",
  ]));
}

export function assertRf13DistCanaryCapability(capability, {
  receiptSha256,
  sourceSha,
  sourceTree,
  artifactSha256,
  userCount,
} = {}) {
  if (!capability || !LIVE_CANARY_CAPABILITIES.has(capability)
    || capability.schema_version !== RF13_DIST_CANARY_CAPABILITY_SCHEMA) {
    fail("CANARY_LIVE_AUTHORITY_REQUIRED", "authoritative canary PASS requires the same-process actual RFD-TUW-018 runner capability");
  }
  const expected = {
    receipt_sha256: receiptSha256,
    source_sha: sourceSha,
    source_tree: sourceTree,
    artifact_sha256: artifactSha256,
    user_count: userCount,
    verdict: "PASS",
    rollback_trigger_injected: true,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (value !== undefined && capability[field] !== value) {
      fail("CANARY_LIVE_AUTHORITY_MISMATCH", `actual canary capability does not match ${field}`);
    }
  }
  if (!RF13_DIST_ROLLBACK_TRIGGER_CODES.includes(capability.rollback_injection_code)) {
    fail("CANARY_LIVE_AUTHORITY_MISMATCH", "actual canary capability lacks the required rollback-trigger injection proof");
  }
  return capability;
}

export function buildBlockedCanaryTemplate({
  sourceSha = "0".repeat(40),
  sourceTree = "0".repeat(40),
  macosArtifactSha256 = "0".repeat(64),
} = {}) {
  sha1(sourceSha, "canary template source_sha", { allowZero: true });
  sha1(sourceTree, "canary template source_tree", { allowZero: true });
  sha256(macosArtifactSha256, "canary template macos artifact sha256", { allowZero: true });
  return Object.freeze({
    schema_version: RF13_DIST_CANARY_RECEIPT_SCHEMA,
    receipt_id: "RFD-TUW-018-CANARY-TEMPLATE",
    status: "BLOCKED",
    template: true,
    source_sha: sourceSha,
    source_tree: sourceTree,
    macos_artifact_sha256: macosArtifactSha256,
    observation_mode: "template",
    user_count: 0,
    checks: Object.fromEntries(CANARY_CHECK_KEYS.map((key) => [key, "BLOCKED"])),
    monitoring: {
      duration_minutes: 0,
      five_xx_count: 0,
      timeout_count: 0,
      consecutive_core_read_failures: 0,
      login_failure_count: 0,
      tenant_exposure_count: 0,
      write_integrity_failure_count: 0,
      uncertain_write_result_count: 0,
      signature_or_hash_mismatch_count: 0,
      latency_actions: [],
    },
    rollback_trigger: { triggered: false, codes: [], source: "none" },
    evidence: { authority_receipt: null },
    boundary: {
      monitor_read_only: true,
      network_contacted_by_monitor: false,
      mutation_executed_by_monitor: false,
      identities_recorded: false,
      private_hashes_recorded: false,
      real_canary_executed_by_monitor: false,
    },
    reason_codes: ["PREREQUISITES_ABSENT"],
  });
}

/**
 * Final same-process boundary for an actual RFD-TUW-018 canary.
 *
 * The current repository deliberately has no tracked installed-package
 * adapter. This function therefore blocks before launch and cannot mint a
 * live canary capability. Adding an adapter later is a reviewed source change;
 * serialized observations and caller-provided adapters are never inputs.
 */
export async function runRfd018ActualCanary(options = {}) {
  exactKeys(options, [
    "restartCapability",
    "sourceSha",
    "sourceTree",
    "artifactSha256",
  ], "RFD-TUW-018 actual canary options");
  const {
    restartCapability,
    sourceSha,
    sourceTree,
    artifactSha256,
  } = options;
  sha1(sourceSha, "RFD-TUW-018 actual canary source SHA");
  sha1(sourceTree, "RFD-TUW-018 actual canary source tree");
  sha256(artifactSha256, "RFD-TUW-018 actual canary artifact SHA-256");
  if (TRACKED_RFD018_ACTUAL_CANARY_ADAPTER === null) {
    return Object.freeze({
      checkpoint_id: "RFD-TUW-018",
      verdict: "BLOCKED_BY_ARTIFACT/AUTHORITY",
      blocker: "TRACKED_ACTUAL_CANARY_ADAPTER_REQUIRED",
      actual_canary_executed: false,
      rollback_trigger_injected: false,
      receipt: buildBlockedCanaryTemplate({
        sourceSha,
        sourceTree,
        macosArtifactSha256: artifactSha256,
      }),
      capability: null,
    });
  }
  assertFormalDeployedApiRestartCapability(restartCapability, {
    sourceSha,
    sourceTree,
    artifactSha256,
  });
  fail("CANARY_ADAPTER_IMPLEMENTATION_REQUIRED", "tracked actual canary adapter execution is not implemented");
}

export function runSyntheticCanaryMonitor(fixture, { injectTrigger } = {}) {
  validateCanaryObservationFixture(fixture);
  const observed = injectTrigger ? injectRollbackTrigger(fixture, injectTrigger) : structuredClone(fixture);
  const triggers = rollbackTriggerCodes(observed.monitoring, observed.observations);
  const reasonCodes = ["SYNTHETIC_FIXTURE_ONLY"];
  if (injectTrigger) reasonCodes.push("ROLLBACK_TRIGGER_INJECTED");
  if (triggers.length) reasonCodes.push("ROLLBACK_REQUIRED");
  return Object.freeze({
    schema_version: RF13_DIST_CANARY_RECEIPT_SCHEMA,
    receipt_id: "RFD-TUW-018-CANARY-SYNTHETIC",
    status: "BLOCKED",
    template: false,
    source_sha: observed.source_sha,
    source_tree: observed.source_tree,
    macos_artifact_sha256: observed.macos_artifact_sha256,
    observation_mode: "synthetic_fixture",
    user_count: observed.user_count,
    checks: aggregateCanaryChecks(observed.observations),
    monitoring: structuredClone(observed.monitoring),
    rollback_trigger: {
      triggered: triggers.length > 0,
      codes: triggers,
      source: injectTrigger ? "synthetic_injection" : "synthetic_fixture",
    },
    evidence: { authority_receipt: null },
    boundary: {
      monitor_read_only: true,
      network_contacted_by_monitor: false,
      mutation_executed_by_monitor: false,
      identities_recorded: false,
      private_hashes_recorded: false,
      real_canary_executed_by_monitor: false,
    },
    reason_codes: reasonCodes.sort(),
  });
}

export function validateCanaryReceipt(receipt, {
  expectedReleaseId,
  expectedSourceSha,
  expectedSourceTree,
  expectedArtifactSha256,
  expectedReceiptSha256,
  repoRoot,
  liveValidation,
  requireLiveAuthority = true,
} = {}) {
  assertNoSensitiveValues(receipt);
  exactKeys(receipt, [
    "schema_version",
    "receipt_id",
    "status",
    "template",
    "source_sha",
    "source_tree",
    "macos_artifact_sha256",
    "observation_mode",
    "user_count",
    "checks",
    "monitoring",
    "rollback_trigger",
    "evidence",
    "boundary",
    "reason_codes",
  ], "canary receipt");
  if (receipt.schema_version !== RF13_DIST_CANARY_RECEIPT_SCHEMA) fail("CANARY_SCHEMA_MISMATCH", "canary receipt schema is invalid");
  safeId(receipt.receipt_id, "canary receipt id");
  sha1(receipt.source_sha, "canary receipt source_sha", { allowZero: receipt.template === true });
  sha1(receipt.source_tree, "canary receipt source_tree", { allowZero: receipt.template === true });
  sha256(receipt.macos_artifact_sha256, "canary receipt macos artifact sha256", { allowZero: receipt.template === true });
  if (expectedSourceSha && receipt.source_sha !== expectedSourceSha) fail("SOURCE_SHA_MISMATCH", "canary receipt source SHA is stale or mismatched");
  if (expectedSourceTree && receipt.source_tree !== expectedSourceTree) fail("SOURCE_TREE_MISMATCH", "canary receipt source tree is mismatched");
  if (expectedArtifactSha256 && receipt.macos_artifact_sha256 !== expectedArtifactSha256) {
    fail("ARTIFACT_HASH_MISMATCH", "canary receipt artifact hash is mismatched");
  }
  exactKeys(receipt.checks, CANARY_CHECK_KEYS, "canary receipt checks");
  exactKeys(receipt.rollback_trigger, ["triggered", "codes", "source"], "canary rollback trigger");
  exactKeys(receipt.evidence, ["authority_receipt"], "canary receipt evidence");
  exactKeys(receipt.boundary, [
    "monitor_read_only",
    "network_contacted_by_monitor",
    "mutation_executed_by_monitor",
    "identities_recorded",
    "private_hashes_recorded",
    "real_canary_executed_by_monitor",
  ], "canary receipt boundary");
  if (receipt.boundary.monitor_read_only !== true
    || receipt.boundary.mutation_executed_by_monitor !== false
    || receipt.boundary.identities_recorded !== false
    || receipt.boundary.private_hashes_recorded !== false
    || typeof receipt.boundary.network_contacted_by_monitor !== "boolean"
    || typeof receipt.boundary.real_canary_executed_by_monitor !== "boolean") {
    fail("CANARY_MONITOR_BOUNDARY_INVALID", "canary monitor must remain read-only and identity-free");
  }
  if (!Array.isArray(receipt.reason_codes)
    || new Set(receipt.reason_codes).size !== receipt.reason_codes.length
    || receipt.reason_codes.some((code) => !SAFE_ID.test(code))) {
    fail("INVALID_REASON_CODES", "canary reason codes must be unique safe identifiers");
  }
  const triggerCodes = receipt.rollback_trigger.codes;
  if (!Array.isArray(triggerCodes)
    || new Set(triggerCodes).size !== triggerCodes.length
    || triggerCodes.some((code) => !RF13_DIST_ROLLBACK_TRIGGER_CODES.includes(code))
    || receipt.rollback_trigger.triggered !== (triggerCodes.length > 0)) {
    fail("ROLLBACK_TRIGGER_INVALID", "canary rollback trigger state is invalid");
  }

  if (receipt.template === true) {
    validateCanaryMonitoring(receipt.monitoring, { template: true });
    if (receipt.status !== "BLOCKED"
      || receipt.observation_mode !== "template"
      || receipt.user_count !== 0
      || Object.values(receipt.checks).some((status) => status !== "BLOCKED")
      || receipt.rollback_trigger.triggered !== false
      || receipt.rollback_trigger.source !== "none"
      || receipt.evidence.authority_receipt !== null
      || receipt.boundary.network_contacted_by_monitor !== false
      || receipt.boundary.real_canary_executed_by_monitor !== false
      || !receipt.reason_codes.includes("PREREQUISITES_ABSENT")) {
      fail("INVALID_BLOCKED_TEMPLATE", "canary template must remain explicitly BLOCKED");
    }
    return Object.freeze({ status: "BLOCKED", authoritative: false, user_count: 0 });
  }

  const latencyRegressions = validateCanaryMonitoring(receipt.monitoring);
  if (![1, 2].includes(receipt.user_count)) fail("CANARY_USER_COUNT_INVALID", "canary receipt must record one or two anonymous users");
  if (Object.values(receipt.checks).some((status) => !["PASS", "FAIL"].includes(status))) {
    fail("INVALID_CANARY_CHECK", "canary receipt checks must be PASS or FAIL");
  }
  const expectedTriggerCodes = rollbackTriggerCodes(receipt.monitoring, [receipt.checks]);
  equalList(triggerCodes, expectedTriggerCodes, "ROLLBACK_TRIGGER_MISMATCH", "canary rollback trigger does not match its observations");
  const allChecksPass = Object.values(receipt.checks).every((status) => status === "PASS");
  const countsPass = receipt.monitoring.five_xx_count === 0
    && receipt.monitoring.timeout_count === 0
    && receipt.monitoring.consecutive_core_read_failures < 2
    && receipt.monitoring.login_failure_count === 0
    && receipt.monitoring.tenant_exposure_count === 0
    && receipt.monitoring.write_integrity_failure_count === 0
    && receipt.monitoring.uncertain_write_result_count === 0
    && receipt.monitoring.signature_or_hash_mismatch_count === 0
    && latencyRegressions.length === 0;

  if (receipt.observation_mode === "synthetic_fixture") {
    if (receipt.status !== "BLOCKED"
      || receipt.evidence.authority_receipt !== null
      || !["synthetic_fixture", "synthetic_injection"].includes(receipt.rollback_trigger.source)
      || receipt.boundary.network_contacted_by_monitor !== false
      || receipt.boundary.real_canary_executed_by_monitor !== false
      || !receipt.reason_codes.includes("SYNTHETIC_FIXTURE_ONLY")
      || (receipt.rollback_trigger.triggered && !receipt.reason_codes.includes("ROLLBACK_REQUIRED"))) {
      fail("SYNTHETIC_CANARY_CANNOT_PASS", "synthetic canary evidence must remain BLOCKED");
    }
    return Object.freeze({ status: "BLOCKED", authoritative: false, user_count: receipt.user_count });
  }

  if (receipt.observation_mode !== "authoritative_canary" || !repoRoot || !receipt.evidence.authority_receipt) {
    fail("CANARY_AUTHORITY_MISSING", "authoritative canary evidence and repository root are required");
  }
  if (receipt.boundary.network_contacted_by_monitor !== true
    || receipt.boundary.real_canary_executed_by_monitor !== true) {
    fail("CANARY_MONITOR_BOUNDARY_INVALID", "authoritative canary evidence must record actual monitored execution");
  }
  if (receipt.rollback_trigger.source !== "authoritative_observation") {
    fail("ROLLBACK_TRIGGER_INVALID", "authoritative canary trigger source is invalid");
  }
  const humanAuthority = validateRf13HumanAuthorityReference(receipt.evidence.authority_receipt, {
    repoRoot,
    expectedReleaseId,
    expectedEnvironment: "canary",
    expectedSourceSha: receipt.source_sha,
    expectedSourceTree: receipt.source_tree,
    expectedArtifactHashes: [receipt.macos_artifact_sha256],
    expectedAction: "canary_acceptance",
    expectedReleaseScope: "macos_canary",
    expectedCanaryUserCount: receipt.user_count,
  });
  const shouldPass = allChecksPass && countsPass && receipt.rollback_trigger.triggered === false;
  if (receipt.status !== (shouldPass ? "PASS" : "BLOCKED")) {
    fail("CANARY_STATUS_MISMATCH", "canary status does not match its checks and rollback triggers");
  }
  if ((shouldPass && receipt.reason_codes.length !== 0)
    || (receipt.rollback_trigger.triggered && !receipt.reason_codes.includes("ROLLBACK_REQUIRED"))) {
    fail("CANARY_REASON_CODE_MISMATCH", "canary reason codes do not match its final status");
  }
  if (!shouldPass) return Object.freeze({ status: receipt.status, authoritative: false, user_count: receipt.user_count });
  if (!requireLiveAuthority) {
    return Object.freeze({ status: receipt.status, authoritative: false, user_count: receipt.user_count });
  }
  assertRf13DistCanaryCapability(liveValidation, {
    receiptSha256: expectedReceiptSha256,
    sourceSha: receipt.source_sha,
    sourceTree: receipt.source_tree,
    artifactSha256: receipt.macos_artifact_sha256,
    userCount: receipt.user_count,
  });
  return Object.freeze({
    status: receipt.status,
    authoritative: true,
    user_count: receipt.user_count,
    authority_capability: humanAuthority,
  });
}

function validateGateArtifactIds(gate, artifactIds, artifacts) {
  if (gate === "clean_sha") {
    equalList(artifactIds, artifacts.map(({ id }) => id).sort(), "GATE_ARTIFACT_COVERAGE_MISMATCH", "clean-SHA gate must bind the complete RF13-DIST artifact set");
    return;
  }
  const windowsGate = gate === "windows_native_qa" || gate === "windows_release";
  const platform = windowsGate ? "win32" : "darwin";
  const permitted = new Set(artifacts.filter((artifact) => artifact.platform === platform).map(({ id }) => id));
  const required = windowsGate ? ["windows_installer"] : ["macos_dmg_image"];
  if (artifactIds.some((id) => !permitted.has(id)) || required.some((id) => !artifactIds.includes(id))) {
    fail("GATE_ARTIFACT_COVERAGE_MISMATCH", "gate artifact coverage does not match its release platform");
  }
}

function validateManifestGate(gate, entry, context) {
  exactKeys(entry, ["status", "artifact_ids", "receipt", "reason_code"], `${gate} gate`);
  const allowedStatuses = gate === "windows_release" ? ["PASS", "BLOCKED_BY_AUTHORITY"] : ["PASS"];
  if (!allowedStatuses.includes(entry.status) || entry.reason_code !== null) {
    fail("REQUIRED_GATE_NOT_PASSING", "RF13-DIST prerequisite gate is not in an allowed final state");
  }
  const artifactIds = sortedUnique(entry.artifact_ids, `${gate} artifact ids`);
  validateGateArtifactIds(gate, artifactIds, context.artifacts);
  const artifactById = new Map(context.artifacts.map((artifact) => [artifact.id, artifact]));
  const expectedHashes = [...new Set(artifactIds.map((id) => artifactById.get(id).sha256))].sort();
  if (gate === "clean_sha") {
    const expectedReceiptPath = `${context.artifactRoot}/evidence/clean-sha-gate.json`;
    if (entry.receipt?.path !== expectedReceiptPath) {
      fail("CLEAN_SHA_RECEIPT_PATH_INVALID", "clean-SHA receipt must be sealed inside the exact-SHA formal release root");
    }
    const receipt = readJsonReference(entry.receipt, {
      repoRoot: context.repoRoot,
    });
    validateCleanShaReceipt(receipt, {
      expectedSourceSha: context.sourceSha,
      expectedSourceTree: context.sourceTree,
    });
    return;
  }
  requireReleaseEvidenceReference(entry.receipt, context.artifactRoot, `${gate} receipt`);
  const receipt = readJsonReference(entry.receipt, {
    repoRoot: context.repoRoot,
    expectedSchema: RF13_DIST_GATE_RECEIPT_SCHEMAS[gate],
  });
  context.gateReceipts[gate] = receipt;
  if (gate === "windows_release") {
    validateWindowsReleaseDecisionReceipt(receipt, {
      expectedStatus: entry.status,
      expectedSourceSha: context.sourceSha,
      expectedSourceTree: context.sourceTree,
      expectedArtifactHashes: expectedHashes,
      expectedInstallerSha256: context.artifacts.find(({ id }) => id === "windows_installer")?.sha256,
      expectedVersion: context.version,
      repoRoot: context.repoRoot,
      sealedAt: context.sealedAt,
    });
    return;
  }
  if (gate === "exact_source_api" || gate === "login") {
    validateDeployedApiGateReceipt(receipt, {
      gate,
      expectedSourceSha: context.sourceSha,
      expectedSourceTree: context.sourceTree,
      expectedArtifactHashes: expectedHashes,
    });
    return;
  }
  if (gate === "restart") {
    validateRestartGateReceipt(receipt, {
      expectedSourceSha: context.sourceSha,
      expectedSourceTree: context.sourceTree,
      expectedArtifactHashes: expectedHashes,
    });
    return;
  }
  validateGateReceipt(receipt, {
    gate,
    expectedSchema: RF13_DIST_GATE_RECEIPT_SCHEMAS[gate],
    expectedStatus: entry.status,
    expectedSourceSha: context.sourceSha,
    expectedSourceTree: context.sourceTree,
    expectedArtifactHashes: expectedHashes,
  });
}

function validateMacosReleaseAuthority(context, liveValidation) {
  const diskImage = context.artifacts.find(({ id }) => id === "macos_dmg_image");
  const structuredReceipt = requireDesktopReleaseArtifact(
    context.releaseIndex,
    "macos_release_boundary_receipt",
  );
  try {
    return validateRf13DistMacosReleaseSidecar(context.gateReceipts.macos_release, {
      liveValidation,
      expectedSourceSha: context.sourceSha,
      expectedSourceTree: context.sourceTree,
      expectedArtifactSha256: diskImage.sha256,
      expectedReceiptSha256: structuredReceipt.sha256,
    });
  } catch (error) {
    const code = typeof error?.code === "string"
      ? error.code
      : "MACOS_LIVE_AUTHORITY_REQUIRED";
    fail(code, "RF13-DIST requires same-process live RFD-TUW-012 authority for the indexed macOS receipt and DMG");
  }
}

function validatePrivacyIndexReference(reference, expectedReference, context, label) {
  exactKeys(reference, ["path", "sha256", "bytes"], `${label} index reference`);
  sha256(reference.sha256, `${label} index reference sha256`);
  if (!Number.isSafeInteger(reference.bytes) || reference.bytes < 1) {
    fail("PRIVACY_INDEX_REFERENCE_INVALID", `${label} index reference bytes must be positive`);
  }
  if (reference.path !== expectedReference.path || reference.sha256 !== expectedReference.sha256) {
    fail("PRIVACY_INDEX_REFERENCE_MISMATCH", `${label} differs from the RF13-DIST privacy member reference`);
  }
  const body = readFileSync(safeRepoFile(context.repoRoot, reference.path));
  if (body.length !== reference.bytes || fileSha256(safeRepoFile(context.repoRoot, reference.path)) !== reference.sha256) {
    fail("PRIVACY_INDEX_REFERENCE_MISMATCH", `${label} index reference bytes or hash do not match`);
  }
}

function validatePrivacyIndex(reference, entry, context, expectedMemberIds) {
  if (reference?.path !== `${context.artifactRoot}/evidence/privacy-index.json`) {
    fail("PRIVACY_INDEX_PATH_INVALID", "privacy index must be sealed under the exact-SHA release evidence root");
  }
  requireReleaseEvidenceReference(reference, context.artifactRoot, "privacy index");
  const index = readJsonReference(reference, {
    repoRoot: context.repoRoot,
    expectedSchema: RF13_DIST_PRIVACY_INDEX_SCHEMA,
  });
  exactKeys(index, [
    "schema_version",
    "source_sha",
    "source_tree",
    "channel",
    "corpus_sha256",
    "status",
    "members",
  ], "privacy index");
  if (index.source_sha !== context.sourceSha
    || index.source_tree !== context.sourceTree
    || index.channel !== "formal"
    || !["PASS", "PENDING_WINDOWS_NATIVE"].includes(index.status)) {
    fail("PRIVACY_INDEX_BINDING_MISMATCH", "privacy index does not bind the formal RF13-DIST source");
  }
  sha256(index.corpus_sha256, "privacy index corpus sha256");
  if (!Array.isArray(index.members)) fail("PRIVACY_INDEX_INVALID", "privacy index members must be an array");
  const indexedIds = index.members.map(({ artifact_id: artifactId }) => artifactId).sort();
  equalList(indexedIds, expectedMemberIds, "PRIVACY_INDEX_COVERAGE_MISMATCH", "privacy index must cover every RF13-DIST privacy member exactly once");
  if (new Set(indexedIds).size !== indexedIds.length) {
    fail("PRIVACY_INDEX_COVERAGE_MISMATCH", "privacy index contains duplicate artifact members");
  }
  const membersById = new Map(entry.members.map((member) => [member.artifact_id, member]));
  for (const indexed of index.members) {
    const manifestMember = membersById.get(indexed.artifact_id);
    if (indexed.artifact_id === "windows_installer") {
      exactKeys(indexed, ["artifact_id", "status", "builder_receipt"], "Windows installer privacy index member");
      exactKeys(manifestMember, ["artifact_id", "builder_receipt", "native_receipt"], "Windows installer privacy gate member");
      if (!new Set(["PENDING_NATIVE", "PASS"]).has(indexed.status)) {
        fail("PRIVACY_INDEX_STATUS_INVALID", "Windows installer privacy index status is invalid");
      }
      validatePrivacyIndexReference(indexed.builder_receipt, manifestMember.builder_receipt, context, "Windows installer builder receipt");
      continue;
    }
    exactKeys(indexed, ["artifact_id", "status", "receipt"], "privacy index member");
    if (indexed.status !== "PASS") fail("PRIVACY_INDEX_STATUS_INVALID", "privacy index member must be PASS");
    validatePrivacyIndexReference(indexed.receipt, manifestMember.receipt, context, `${indexed.artifact_id} privacy receipt`);
  }
  context.privacyIndex = index;
  return index;
}

function validatePrivacyGate(entry, context) {
  exactKeys(entry, ["status", "index", "members", "reason_code"], "privacy gate");
  if (entry.status !== "PASS" || entry.reason_code !== null || !Array.isArray(entry.members)) {
    fail("PRIVACY_GATE_NOT_PASSING", "privacy gate must be PASS with per-artifact member evidence");
  }
  const artifactsById = new Map(context.artifacts.map((artifact) => [artifact.id, artifact]));
  for (const member of entry.members) object(member, "privacy gate member");
  const memberIds = entry.members.map(({ artifact_id: artifactId }) => artifactId).sort();
  const expectedMemberIds = [...artifactsById.keys(), ...PRIVACY_SUPPLEMENTAL_ARTIFACT_IDS].sort();
  equalList(memberIds, expectedMemberIds, "PRIVACY_MEMBER_EVIDENCE_MISSING", "privacy evidence must cover every RF13-DIST artifact and package directory exactly once");
  if (new Set(memberIds).size !== memberIds.length) fail("PRIVACY_MEMBER_EVIDENCE_DUPLICATE", "privacy evidence contains duplicate artifact members");
  validatePrivacyIndex(entry.index, entry, context, expectedMemberIds);
  for (const member of entry.members) {
    let artifact = artifactsById.get(member.artifact_id);
    if (member.artifact_id === "windows_installer") {
      exactKeys(member, ["artifact_id", "builder_receipt", "native_receipt"], "Windows installer privacy gate member");
      requireReleaseEvidenceReference(member.builder_receipt, context.artifactRoot, "Windows installer builder privacy receipt");
      requireReleaseEvidenceReference(member.native_receipt, context.artifactRoot, "Windows installer native privacy receipt");
      const builderReceipt = readJsonReference(member.builder_receipt, {
        repoRoot: context.repoRoot,
        expectedSchema: RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
      });
      validateWindowsInstallerPrivacyBuilderReceiptStructure(builderReceipt, {
        artifact,
        expectedSourceSha: context.sourceSha,
        expectedSourceTree: context.sourceTree,
      });
      const nativeReceipt = readJsonReference(member.native_receipt, {
        repoRoot: context.repoRoot,
        expectedSchema: RF13_DIST_WINDOWS_INSTALLER_PRIVACY_NATIVE_SCHEMA,
      });
      validateWindowsInstallerPrivacyNativeReceiptStructure(nativeReceipt, {
        artifact,
        builderReceipt,
        expectedSourceSha: context.sourceSha,
        expectedSourceTree: context.sourceTree,
      });
      requireReleaseEvidenceReference(nativeReceipt.builder_receipt, context.artifactRoot, "Windows installer canonical builder receipt");
      requireReleaseEvidenceReference(nativeReceipt.native_qa_receipt, context.artifactRoot, "strict RFD-TUW-013 native-QA receipt");
      const canonicalBuilder = readCanonicalReceiptReference(nativeReceipt.builder_receipt, {
        repoRoot: context.repoRoot,
        expectedSchema: RF13_DIST_WINDOWS_INSTALLER_PRIVACY_BUILDER_SCHEMA,
        label: "Windows installer canonical builder receipt",
      });
      readCanonicalReceiptReference(nativeReceipt.native_qa_receipt, {
        repoRoot: context.repoRoot,
        expectedSchema: WINDOWS_NATIVE_QA_RECEIPT_SCHEMA,
        label: "strict RFD-TUW-013 native-QA receipt",
      });
      if (member.builder_receipt.path !== nativeReceipt.builder_receipt.path
        || member.builder_receipt.sha256 !== nativeReceipt.builder_receipt.sha256
        || canonicalRecord(canonicalBuilder) !== canonicalRecord(builderReceipt)) {
        fail("PRIVACY_INSTALLER_NATIVE_EVIDENCE_INVALID", "Windows installer native privacy evidence references a different builder receipt");
      }
      if (canonicalRecord(nativeReceipt.native_qa_receipt)
        !== canonicalRecord(context.gateReceipts.windows_release?.rfd013_receipt)) {
        fail("PRIVACY_STRICT_NATIVE_QA_MISMATCH", "Windows installer privacy must bind the exact strict RFD-TUW-013 receipt used by the release decision");
      }
      context.privacyEvidence.set(artifact.id, Object.freeze({
        artifact,
        builderReceipt,
        nativeReceipt,
      }));
      continue;
    }
    exactKeys(member, ["artifact_id", "receipt"], "privacy gate member");
    if (member.receipt?.path !== `${context.artifactRoot}/evidence/privacy-${member.artifact_id}.json`) {
      fail("PRIVACY_MEMBER_EVIDENCE_INVALID", "privacy sidecar path does not match its canonical artifact ID");
    }
    requireReleaseEvidenceReference(member.receipt, context.artifactRoot, "privacy member receipt");
    const receipt = readJsonReference(member.receipt, {
      repoRoot: context.repoRoot,
      expectedSchema: RF13_DIST_PRIVACY_MEMBER_SCHEMA,
    });
    if (member.artifact_id === "windows_package_directory") {
      artifact = Object.freeze({
        id: member.artifact_id,
        path: null,
        platform: "win32",
        kind: "expanded_directory",
        bytes: receipt.artifact_bytes,
        sha256: receipt.artifact_sha256,
      });
    }
    if (!artifact) fail("PRIVACY_MEMBER_EVIDENCE_INVALID", "privacy evidence references an unknown artifact");
    validateRf13DistPrivacyMemberReceiptStructure(receipt, {
      artifact,
      artifactRoot: context.artifactRoot,
      expectedBuildManifestSha256: artifactsById.get(
        artifact.platform === "darwin" ? "macos_build_manifest" : "windows_build_manifest",
      ).sha256,
      expectedSourceSha: context.sourceSha,
      expectedSourceTree: context.sourceTree,
      repoRoot: context.repoRoot,
    });
    context.privacyEvidence.set(artifact.id, Object.freeze({ artifact, receipt }));
  }
}

function privacyValidationFor(validations, artifactId) {
  if (validations instanceof Map) return validations.get(artifactId);
  if (validations && typeof validations === "object" && !Array.isArray(validations)) {
    return validations[artifactId];
  }
  return undefined;
}

function validatePrivacyAuthorities(context, privacyValidations) {
  for (const [artifactId, evidence] of context.privacyEvidence) {
    const buildManifestSha256 = context.artifacts.find(({ id }) => id === (
      evidence.artifact.platform === "darwin" ? "macos_build_manifest" : "windows_build_manifest"
    )).sha256;
    const validation = privacyValidationFor(privacyValidations, artifactId);
    try {
      if (artifactId === "windows_installer") {
        assertDesktopArtifactPrivacyValidation(validation?.builder, {
          artifact_id: artifactId,
          artifact_kind: evidence.artifact.kind,
          artifact_sha256: evidence.artifact.sha256,
          artifact_bytes: evidence.artifact.bytes,
          source_sha: context.sourceSha,
          source_tree: context.sourceTree,
          build_manifest_sha256: buildManifestSha256,
          member_manifest_sha256: evidence.builderReceipt.source_payload_manifest_sha256,
          strict_native_qa_receipt_sha256: null,
          verdict: "PENDING_NATIVE",
        });
        validateWindowsInstallerNativePrivacyReceipt(evidence.nativeReceipt, {
          artifact: evidence.artifact,
          builderReceipt: evidence.builderReceipt,
          expectedSourceSha: context.sourceSha,
          expectedSourceTree: context.sourceTree,
          validation: validation?.native,
        });
        assertDesktopArtifactPrivacyValidation(validation?.native, {
          build_manifest_sha256: buildManifestSha256,
          builder_receipt_sha256: evidence.nativeReceipt.builder_receipt.sha256,
          strict_native_qa_receipt_sha256: evidence.nativeReceipt.native_qa_receipt.sha256,
          verdict: "PASS",
        });
        continue;
      }
      validateRf13DistPrivacyMemberReceipt(evidence.receipt, {
        artifact: evidence.artifact,
        artifactRoot: context.artifactRoot,
        expectedBuildManifestSha256: buildManifestSha256,
        expectedSourceSha: context.sourceSha,
        expectedSourceTree: context.sourceTree,
        repoRoot: context.repoRoot,
        validation,
      });
    } catch (error) {
      if (error instanceof Rf13DistValidationError) throw error;
      const code = typeof error?.code === "string" ? error.code : "LIVE_PRIVACY_VALIDATION_REQUIRED";
      fail(code, "RF13-DIST requires same-process live RFD-TUW-007 privacy validation for every indexed artifact");
    }
  }
}

function validateReleaseIndexShape(index) {
  exactKeys(index, [
    "schema_version",
    "version",
    "source_sha",
    "source_tree",
    "source_dirty",
    "channel",
    "app_id",
    "artifact_root",
    "renderer",
    "generated_at",
    "generic_build_paths_are_release_truth",
    "public_release_claim",
    "production_go_live_claim",
    "artifacts",
  ], "formal release index");
  exactKeys(index.renderer, ["sha256", "file_count", "algorithm"], "formal release renderer");
  if (!Array.isArray(index.artifacts)) fail("RELEASE_INDEX_INVALID", "formal release artifacts must be an array");
  for (const artifact of index.artifacts) {
    exactKeys(artifact, ["id", "path", "platform", "kind", "bytes", "sha256"], "formal release index artifact");
  }
}

function expectedArtifactPaths(artifactRoot, version) {
  return Object.freeze({
    macos_build_manifest: `${artifactRoot}/mac/matter-${version}-macos-build-manifest.json`,
    macos_dmg_image: `${artifactRoot}/mac/matter-${version}-macos.dmg`,
    macos_zip_archive: `${artifactRoot}/mac/matter-${version}-macos.zip`,
    macos_build_receipt: `${artifactRoot}/receipts/macos-build.md`,
    macos_release_boundary_receipt: `${artifactRoot}/mac/matter-${version}-macos-release-boundary.json`,
    windows_build_manifest: `${artifactRoot}/win/matter-${version}-win-build-manifest.json`,
    windows_installer: `${artifactRoot}/win/matter-${version}-win-x64.exe`,
    windows_installer_blockmap: `${artifactRoot}/win/matter-${version}-win-x64.exe.blockmap`,
    windows_installer_manifest: `${artifactRoot}/win/matter-${version}-win-installer-manifest.json`,
    windows_manifest_signature: `${artifactRoot}/win/matter-${version}-win-installer-manifest.json.sig`,
    windows_package_zip: `${artifactRoot}/win/matter-${version}-win32-x64-unsigned.zip`,
    windows_build_receipt: `${artifactRoot}/receipts/windows-build.md`,
  });
}

function validateManifestArtifacts(manifestArtifacts, releaseIndex, { artifactRoot, version }) {
  if (!Array.isArray(manifestArtifacts) || manifestArtifacts.length === 0) fail("ARTIFACT_SET_EMPTY", "RF13-DIST artifact set is empty");
  const artifactPaths = expectedArtifactPaths(artifactRoot, version);
  const artifacts = manifestArtifacts.map((artifact) => {
    exactKeys(artifact, ["id", "path", "platform", "kind", "bytes", "sha256"], "RF13-DIST artifact");
    if (HISTORICAL_PATH_PATTERN.test(artifact.id) || HISTORICAL_PATH_PATTERN.test(artifact.path ?? "")) {
      fail("HISTORICAL_ARTIFACT_REJECTED", "historical or internal artifact IDs and paths cannot satisfy RF13-DIST");
    }
    safeId(artifact.id, "RF13-DIST artifact id");
    const artifactSpec = RF13_DIST_ARTIFACT_SPECS[artifact.id];
    if (!artifactSpec || artifact.platform !== artifactSpec.platform || artifact.kind !== artifactSpec.kind) {
      fail("ARTIFACT_CLASSIFICATION_INVALID", "RF13-DIST artifact ID, platform, or kind is not in the closed formal release set");
    }
    if (artifact.path !== artifactPaths[artifact.id]) {
      fail("ARTIFACT_PATH_INVALID", "RF13-DIST artifact path does not match its formal release ID");
    }
    if (!Number.isSafeInteger(artifact.bytes) || artifact.bytes < 1) fail("ARTIFACT_SIZE_INVALID", "RF13-DIST artifact size must be positive");
    sha256(artifact.sha256, "RF13-DIST artifact sha256");
    return artifact;
  });
  const ids = artifacts.map(({ id }) => id);
  if (new Set(ids).size !== ids.length) fail("ARTIFACT_ID_DUPLICATE", "RF13-DIST artifact IDs must be unique");
  for (const requiredId of REQUIRED_ARTIFACT_IDS) {
    if (!ids.includes(requiredId)) fail("REQUIRED_ARTIFACT_MISSING", "RF13-DIST required release artifact is missing");
  }
  const indexArtifacts = releaseIndex.artifacts.map(({ id, path: artifactPath, platform, kind, bytes, sha256: digest }) => ({
    id,
    path: artifactPath,
    platform,
    kind,
    bytes,
    sha256: digest,
  }));
  const byId = (items) => [...items].sort((left, right) => left.id.localeCompare(right.id));
  if (JSON.stringify(byId(artifacts)) !== JSON.stringify(byId(indexArtifacts))) {
    fail("RELEASE_INDEX_BINDING_MISMATCH", "RF13-DIST artifacts do not exactly match the release artifact index");
  }
  return artifacts;
}

function validateBlockedGateTemplate(gate, entry) {
  if (gate === "privacy") {
    exactKeys(entry, ["status", "index", "members", "reason_code"], "privacy gate template");
    if (entry.status !== "BLOCKED"
      || entry.index !== null
      || entry.reason_code !== "PREREQUISITES_ABSENT"
      || entry.members.length !== 0) {
      fail("INVALID_BLOCKED_TEMPLATE", "privacy template must remain BLOCKED with no evidence");
    }
    return;
  }
  exactKeys(entry, ["status", "artifact_ids", "receipt", "reason_code"], `${gate} gate template`);
  if (entry.status !== "BLOCKED"
    || entry.reason_code !== "PREREQUISITES_ABSENT"
    || entry.artifact_ids.length !== 0
    || entry.receipt !== null) {
    fail("INVALID_BLOCKED_TEMPLATE", "gate template must remain BLOCKED with no evidence");
  }
}

export function buildBlockedRf13DistManifest({
  sourceSha = "0".repeat(40),
  sourceTree = "0".repeat(40),
  version = "0.0.0-template",
} = {}) {
  sha1(sourceSha, "RF13-DIST template source_sha", { allowZero: true });
  sha1(sourceTree, "RF13-DIST template source_tree", { allowZero: true });
  if (!VERSION.test(version)) fail("INVALID_VERSION", "RF13-DIST template version is invalid");
  const blockedGate = () => ({ status: "BLOCKED", artifact_ids: [], receipt: null, reason_code: "PREREQUISITES_ABSENT" });
  return Object.freeze({
    schema_version: RF13_DIST_MANIFEST_SCHEMA,
    manifest_id: "RF13-DIST",
    status: "BLOCKED",
    template: true,
    source: { sha: sourceSha, tree: sourceTree, dirty: false },
    release: {
      version,
      channel: "formal",
      app_id: "com.amic.matter.desktop",
      artifact_root: null,
      release_index: null,
    },
    artifacts: [],
    gates: {
      privacy: { status: "BLOCKED", index: null, members: [], reason_code: "PREREQUISITES_ABSENT" },
      clean_sha: blockedGate(),
      macos_release: blockedGate(),
      windows_native_qa: blockedGate(),
      windows_release: blockedGate(),
      exact_source_api: blockedGate(),
      login: blockedGate(),
      restart: blockedGate(),
      rollback: blockedGate(),
      canary: blockedGate(),
    },
    claims: {
      rf13_dist_complete: false,
      macos_external_distribution_ready: false,
      windows_external_distribution_ready: false,
      production_go_live: false,
    },
    production_authority_receipt: null,
    boundary: {
      validator_read_only: true,
      network_contacted_by_validator: false,
      mutation_executed_by_validator: false,
      historical_internal_rf13_accepted: false,
      identities_recorded: false,
      private_hashes_recorded: false,
    },
    sealed_at: null,
    reason_codes: ["PREREQUISITES_ABSENT"],
  });
}

function authorityConsumptionBinding(capability) {
  return Object.freeze({
    release_id: capability.release_id,
    environment: capability.environment,
    action: capability.action,
    nonce: capability.nonce,
    source_sha: capability.source_sha,
    source_tree: capability.source_tree,
    artifact_sha256: Object.freeze([...capability.artifact_sha256]),
    authority_receipt_id: capability.receipt_id,
    authority_receipt_sha256: capability.receipt_sha256,
    authority_key_id: capability.key_id,
    authority_key_fingerprint_sha256: capability.key_fingerprint_sha256,
    authority_signature_sha256: capability.signature_sha256,
    authority_signed_payload_sha256: capability.signed_payload_sha256,
  });
}

function mintFinalSealerCapability(manifest, releaseId, authorityCapabilities) {
  const actions = Object.freeze(authorityCapabilities.map(authorityConsumptionBinding));
  const capability = Object.freeze({
    schema_version: RF13_DIST_FINAL_SEALER_CAPABILITY_SCHEMA,
    release_id: releaseId,
    source_sha: manifest.source.sha,
    source_tree: manifest.source.tree,
    manifest_sha256: jsonSha256(manifest),
    gate_projection_sha256: jsonSha256({
      source: manifest.source,
      release: manifest.release,
      artifacts: manifest.artifacts,
      gates: manifest.gates,
      claims: manifest.claims,
      production_authority_receipt: manifest.production_authority_receipt,
      sealed_at: manifest.sealed_at,
    }),
    actions_sha256: jsonSha256(actions),
    actions,
  });
  FINAL_SEALER_CAPABILITIES.add(capability);
  return capability;
}

export function assertRf13DistFinalSealerCapability(capability) {
  if (!capability || typeof capability !== "object" || Array.isArray(capability)
    || !FINAL_SEALER_CAPABILITIES.has(capability)) {
    fail("FINAL_SEALER_CAPABILITY_INVALID", "the final-sealer capability was not minted by this validation process");
  }
  exactKeys(capability, [
    "schema_version",
    "release_id",
    "source_sha",
    "source_tree",
    "manifest_sha256",
    "gate_projection_sha256",
    "actions_sha256",
    "actions",
  ], "final-sealer capability");
  if (capability.schema_version !== RF13_DIST_FINAL_SEALER_CAPABILITY_SCHEMA
    || !Object.isFrozen(capability)
    || !Object.isFrozen(capability.actions)
    || capability.actions.length === 0
    || capability.actions.some((action) => !Object.isFrozen(action))
    || jsonSha256(capability.actions) !== capability.actions_sha256) {
    fail("FINAL_SEALER_CAPABILITY_INVALID", "the final-sealer capability is malformed");
  }
  safeId(capability.release_id, "final-sealer release id");
  sha1(capability.source_sha, "final-sealer source SHA");
  sha1(capability.source_tree, "final-sealer source tree");
  sha256(capability.manifest_sha256, "final-sealer manifest SHA-256");
  sha256(capability.gate_projection_sha256, "final-sealer gate projection SHA-256");
  sha256(capability.actions_sha256, "final-sealer actions SHA-256");
  return capability;
}

function validateRf13DistManifestInternal(manifest, {
  expectedSourceSha,
  repoRoot,
  macosLiveValidation,
  privacyValidations,
  deployedApiCapability,
  restartCapability,
  rollbackValidation,
  canaryLiveValidation,
} = {}, finalSealRequest = null) {
  assertNoSensitiveValues(manifest);
  if (HISTORICAL_RF13_SCHEMAS.has(manifest?.schema_version)) {
    fail("HISTORICAL_RF13_REJECTED", "historical internal RF13 receipt cannot satisfy RF13-DIST");
  }
  exactKeys(manifest, [
    "schema_version",
    "manifest_id",
    "status",
    "template",
    "source",
    "release",
    "artifacts",
    "gates",
    "claims",
    "production_authority_receipt",
    "boundary",
    "sealed_at",
    "reason_codes",
  ], "RF13-DIST manifest");
  if (manifest.schema_version !== RF13_DIST_MANIFEST_SCHEMA || manifest.manifest_id !== "RF13-DIST") {
    fail("RF13_DIST_SCHEMA_MISMATCH", "manifest is not the RF13-DIST schema");
  }
  exactKeys(manifest.source, ["sha", "tree", "dirty"], "RF13-DIST source");
  sha1(manifest.source.sha, "RF13-DIST source sha", { allowZero: manifest.template === true });
  sha1(manifest.source.tree, "RF13-DIST source tree", { allowZero: manifest.template === true });
  if (manifest.source.dirty !== false) fail("DIRTY_SOURCE_REJECTED", "RF13-DIST requires a clean source");
  if (expectedSourceSha && manifest.source.sha !== expectedSourceSha) fail("SOURCE_SHA_MISMATCH", "RF13-DIST source SHA is stale or mismatched");
  exactKeys(manifest.release, ["version", "channel", "app_id", "artifact_root", "release_index"], "RF13-DIST release");
  if (!VERSION.test(manifest.release.version ?? "")
    || manifest.release.channel !== "formal"
    || manifest.release.app_id !== "com.amic.matter.desktop") {
    fail("FORMAL_RELEASE_REQUIRED", "RF13-DIST requires the formal external-distribution channel");
  }
  exactKeys(manifest.gates, RF13_DIST_GATE_KEYS, "RF13-DIST gates");
  exactKeys(manifest.claims, [
    "rf13_dist_complete",
    "macos_external_distribution_ready",
    "windows_external_distribution_ready",
    "production_go_live",
  ], "RF13-DIST claims");
  exactKeys(manifest.boundary, [
    "validator_read_only",
    "network_contacted_by_validator",
    "mutation_executed_by_validator",
    "historical_internal_rf13_accepted",
    "identities_recorded",
    "private_hashes_recorded",
  ], "RF13-DIST boundary");
  if (manifest.boundary.validator_read_only !== true
    || manifest.boundary.network_contacted_by_validator !== false
    || manifest.boundary.mutation_executed_by_validator !== false
    || manifest.boundary.historical_internal_rf13_accepted !== false
    || manifest.boundary.identities_recorded !== false
    || manifest.boundary.private_hashes_recorded !== false) {
    fail("VALIDATOR_BOUNDARY_INVALID", "RF13-DIST validator boundary must remain read-only and sanitized");
  }
  if (!Array.isArray(manifest.reason_codes)
    || new Set(manifest.reason_codes).size !== manifest.reason_codes.length
    || manifest.reason_codes.some((code) => !SAFE_ID.test(code))) {
    fail("INVALID_REASON_CODES", "RF13-DIST reason codes must be unique safe identifiers");
  }

  if (manifest.template === true) {
    if (manifest.status !== "BLOCKED"
      || manifest.release.artifact_root !== null
      || manifest.release.release_index !== null
      || manifest.artifacts.length !== 0
      || Object.values(manifest.claims).some(Boolean)
      || manifest.production_authority_receipt !== null
      || manifest.sealed_at !== null
      || !manifest.reason_codes.includes("PREREQUISITES_ABSENT")) {
      fail("INVALID_BLOCKED_TEMPLATE", "RF13-DIST template must remain explicitly BLOCKED");
    }
    for (const gate of RF13_DIST_GATE_KEYS) validateBlockedGateTemplate(gate, manifest.gates[gate]);
    return Object.freeze({ status: "BLOCKED", authoritative: false, source_sha: manifest.source.sha });
  }

  if (!expectedSourceSha) fail("EXPECTED_SOURCE_SHA_REQUIRED", "final RF13-DIST validation requires an explicit expected source SHA");
  if (manifest.status !== "PASS" || !repoRoot || manifest.reason_codes.length !== 0) {
    fail("FINAL_MANIFEST_NOT_PASSING", "final RF13-DIST manifest requires repository evidence and PASS state");
  }
  canonicalIso(manifest.sealed_at, "RF13-DIST sealed_at");
  if (typeof manifest.release.artifact_root !== "string" || HISTORICAL_PATH_PATTERN.test(manifest.release.artifact_root)) {
    fail("HISTORICAL_ARTIFACT_REJECTED", "RF13-DIST artifact root must be the formal exact-SHA release root");
  }
  const expectedReleaseRoot = path.posix.join(
    "apps/desktop/dist/releases",
    manifest.release.version,
    manifest.source.sha,
    "formal",
  );
  const expectedIndexPath = `${expectedReleaseRoot}/artifact-index.json`;
  if (manifest.release.artifact_root !== expectedReleaseRoot
    || manifest.release.release_index?.path !== expectedIndexPath) {
    fail("RELEASE_INDEX_BINDING_MISMATCH", "release index path does not match the exact-SHA formal release root");
  }
  const referencedIndex = readJsonReference(manifest.release.release_index, {
    repoRoot,
    expectedSchema: "law-firm-os.matter-desktop-release-artifacts.v1",
  });
  validateReleaseIndexShape(referencedIndex);
  safeRepoFile(repoRoot, `${expectedReleaseRoot}/checksums.sha256`);
  for (const artifact of referencedIndex.artifacts) safeRepoFile(repoRoot, artifact.path);
  let stage;
  try {
    stage = readDesktopReleaseArtifactStage({
      repoRoot,
      version: manifest.release.version,
      sourceSha: manifest.source.sha,
      channel: "formal",
    });
  } catch {
    fail("RELEASE_INDEX_INVALID", "formal release index, checksums, or artifact hashes are invalid");
  }
  if (JSON.stringify(stage.index) !== JSON.stringify(referencedIndex)
    || manifest.release.release_index.path !== path.relative(path.resolve(repoRoot), stage.indexPath).split(path.sep).join("/")
    || manifest.release.artifact_root !== stage.relativeRoot
    || stage.index.source_sha !== manifest.source.sha
    || stage.index.source_tree !== manifest.source.tree
    || stage.index.source_dirty !== false
    || stage.index.channel !== "formal"
    || stage.index.app_id !== "com.amic.matter.desktop") {
    fail("RELEASE_INDEX_BINDING_MISMATCH", "release index does not match RF13-DIST source and formal channel");
  }
  const artifacts = validateManifestArtifacts(manifest.artifacts, stage.index, {
    artifactRoot: stage.relativeRoot,
    version: manifest.release.version,
  });
  const expectedChecksumLines = artifacts.map((artifact) => `${artifact.sha256}  ${artifact.path}`).sort();
  const actualChecksumLines = stage.checksums.split(/\r?\n/u).filter(Boolean).sort();
  equalList(actualChecksumLines, expectedChecksumLines, "RELEASE_CHECKSUM_SET_MISMATCH", "formal release checksums must exactly cover the RF13-DIST artifact set");
  const checksumsRelativePath = path.relative(path.resolve(repoRoot), stage.checksumsPath).split(path.sep).join("/");
  safeRepoFile(repoRoot, checksumsRelativePath);
  for (const artifact of artifacts) safeRepoFile(repoRoot, artifact.path);
  const context = {
    artifacts,
    artifactRoot: stage.relativeRoot,
    releaseIndex: stage.index,
    repoRoot,
    sourceSha: manifest.source.sha,
    sourceTree: manifest.source.tree,
    version: manifest.release.version,
    releaseId: rf13DistReleaseId(manifest.release.version, manifest.source.sha),
    sealedAt: manifest.sealed_at,
    gateReceipts: {},
    privacyEvidence: new Map(),
  };
  for (const gate of RF13_DIST_GATE_KEYS.filter((gate) => gate !== "privacy" && gate !== "canary")) {
    validateManifestGate(gate, manifest.gates[gate], context);
  }
  validatePrivacyGate(manifest.gates.privacy, context);

  const canaryEntry = manifest.gates.canary;
  exactKeys(canaryEntry, ["status", "artifact_ids", "receipt", "reason_code"], "canary gate");
  if (canaryEntry.status !== "PASS" || canaryEntry.reason_code !== null) fail("CANARY_GATE_NOT_PASSING", "final RF13-DIST requires authoritative canary PASS");
  const canaryIds = sortedUnique(canaryEntry.artifact_ids, "canary artifact ids");
  equalList(canaryIds, ["macos_dmg_image"], "GATE_ARTIFACT_COVERAGE_MISMATCH", "canary must bind the installed macOS DMG artifact");
  const macosDmg = artifacts.find(({ id }) => id === "macos_dmg_image");
  requireReleaseEvidenceReference(canaryEntry.receipt, stage.relativeRoot, "canary receipt");
  const canaryReceipt = readJsonReference(canaryEntry.receipt, {
    repoRoot,
    expectedSchema: RF13_DIST_CANARY_RECEIPT_SCHEMA,
  });
  if (canaryReceipt.evidence?.authority_receipt) {
    requireReleaseEvidenceReference(canaryReceipt.evidence.authority_receipt, stage.relativeRoot, "canary authority receipt");
  }
  if (canaryReceipt.status !== "PASS"
    || canaryReceipt.observation_mode !== "authoritative_canary"
    || ![1, 2].includes(canaryReceipt.user_count)) {
    fail("CANARY_GATE_NOT_PASSING", "synthetic, blocked, or non-authoritative canary evidence cannot satisfy RF13-DIST");
  }

  const windowsReleasePass = manifest.gates.windows_release.status === "PASS";
  if (manifest.claims.rf13_dist_complete !== true
    || manifest.claims.macos_external_distribution_ready !== true
    || manifest.claims.windows_external_distribution_ready !== windowsReleasePass
    || typeof manifest.claims.production_go_live !== "boolean") {
    fail("CLAIM_STATE_MISMATCH", "RF13-DIST claims do not match gate states");
  }
  const productionReleaseScope = windowsReleasePass ? "all_platforms" : "macos_primary";
  const productionArtifactHashes = [...new Set(artifacts
    .filter((artifact) => windowsReleasePass || artifact.platform === "darwin")
    .map((artifact) => artifact.sha256))]
    .sort();
  let productionAuthorityCapability = null;
  if (manifest.claims.production_go_live === true) {
    if (!manifest.production_authority_receipt) fail("PRODUCTION_AUTHORITY_MISSING", "production claim requires an authoritative receipt");
    requireReleaseEvidenceReference(manifest.production_authority_receipt, stage.relativeRoot, "production authority receipt");
    productionAuthorityCapability = validateRf13HumanAuthorityReference(manifest.production_authority_receipt, {
      repoRoot,
      expectedReleaseId: context.releaseId,
      expectedEnvironment: "production",
      expectedSourceSha: manifest.source.sha,
      expectedSourceTree: manifest.source.tree,
      expectedArtifactHashes: productionArtifactHashes,
      expectedAction: "production_go_live",
      expectedReleaseScope: productionReleaseScope,
      expectedCanaryUserCount: null,
    });
  } else if (manifest.production_authority_receipt !== null) {
    fail("UNBOUND_PRODUCTION_AUTHORITY", "production authority receipt must be absent when no production claim is made");
  }
  validateMacosReleaseAuthority(context, macosLiveValidation);
  validatePrivacyAuthorities(context, privacyValidations);
  const deployedArtifactIds = manifest.gates.exact_source_api.artifact_ids;
  const deployedArtifactHashes = [...new Set(deployedArtifactIds.map((id) => (
    artifacts.find((artifact) => artifact.id === id).sha256
  )))].sort();
  validateRf13DistDeployedApiSidecars({
    exactSourceApiReceipt: context.gateReceipts.exact_source_api,
    loginReceipt: context.gateReceipts.login,
    capability: deployedApiCapability,
    expectedSourceSha: context.sourceSha,
    expectedSourceTree: context.sourceTree,
    expectedArtifactSha256: macosDmg.sha256,
    expectedArtifactHashes: deployedArtifactHashes,
  });
  const restartArtifactHashes = manifest.gates.restart.artifact_ids.map((id) => (
    artifacts.find((artifact) => artifact.id === id).sha256
  )).sort();
  validateRf13DistRestartSidecar({
    receipt: context.gateReceipts.restart,
    capability: restartCapability,
    expectedSourceSha: context.sourceSha,
    expectedSourceTree: context.sourceTree,
    expectedArtifactSha256: macosDmg.sha256,
    expectedArtifactHashes: restartArtifactHashes,
    expectedDeployedApiAuthority: context.gateReceipts.exact_source_api.authority,
  });
  const rollbackArtifactHashes = manifest.gates.rollback.artifact_ids.map((id) => (
    artifacts.find((artifact) => artifact.id === id).sha256
  )).sort();
  validateRf13DistRollbackSidecar({
    receipt: context.gateReceipts.rollback,
    validation: rollbackValidation,
    expectedSourceSha: context.sourceSha,
    expectedSourceTree: context.sourceTree,
    expectedArtifactHashes: rollbackArtifactHashes,
  });
  const canary = validateCanaryReceipt(canaryReceipt, {
    expectedReleaseId: context.releaseId,
    expectedSourceSha: context.sourceSha,
    expectedSourceTree: context.sourceTree,
    expectedArtifactSha256: macosDmg.sha256,
    expectedReceiptSha256: canaryEntry.receipt.sha256,
    repoRoot,
    liveValidation: canaryLiveValidation,
  });
  if (finalSealRequest !== FINAL_SEAL_REQUEST) {
    fail("AUTHORITY_ACTION_COMMIT_REQUIRED", "RF13-DIST PASS requires durable one-time authority action consumption by the sealer");
  }
  const finalSealerCapability = mintFinalSealerCapability(
    manifest,
    context.releaseId,
    [canary.authority_capability, productionAuthorityCapability].filter(Boolean),
  );
  let authorityConsumptions;
  try {
    authorityConsumptions = sealRf13DistAuthorityActions(finalSealerCapability);
  } catch (error) {
    if (error instanceof Rf13DistAuthorityLedgerError) fail(error.code, error.message);
    throw error;
  }
  return Object.freeze({
    status: "PASS",
    authoritative: true,
    source_sha: manifest.source.sha,
    artifact_count: artifacts.length,
    windows_release: manifest.gates.windows_release.status,
    canary_user_count: canary.user_count,
    production_go_live: manifest.claims.production_go_live,
    authority_consumptions: Object.freeze(authorityConsumptions.map((consumption) => Object.freeze({
      ledger_namespace: consumption.ledger_namespace,
      slot_sha256: consumption.slot_sha256,
      receipt_sha256: consumption.receipt_sha256,
      bytes: consumption.bytes,
      idempotent_replay: consumption.idempotent_replay,
      recovered_from_dead_owner: consumption.recovered_from_dead_owner,
      recovery_record_sha256: consumption.recovery_record_sha256,
    }))),
  });
}

export function validateRf13DistManifest(manifest, options = {}) {
  return validateRf13DistManifestInternal(manifest, options);
}

export function sealRf13DistManifest(manifest, options = {}) {
  return validateRf13DistManifestInternal(manifest, options, FINAL_SEAL_REQUEST);
}

export function parseJsonFile(filePath, label = "JSON input") {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    fail("JSON_INPUT_INVALID", `${label} is missing or invalid JSON`);
  }
}

export function evidenceReferenceForFile(repoRoot, relativePath) {
  const absolute = safeRepoFile(repoRoot, relativePath);
  return receiptReference(relativePath, fileSha256(absolute));
}
