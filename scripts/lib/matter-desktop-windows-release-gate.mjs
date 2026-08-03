import { validateMatterDesktopAuthenticodeSignatures } from "./matter-desktop-authenticode.mjs";

export const WINDOWS_SIGNING_AUTHORITY_SCHEMA = "law-firm-os.rfd-tuw-013.windows-signing-authority.v1";
export const WINDOWS_NATIVE_QA_RECEIPT_SCHEMA = "law-firm-os.rfd-tuw-013.windows-native-qa.v1";
export const WINDOWS_NATIVE_QA_VALIDATION_SCHEMA = "law-firm-os.rfd-tuw-013.windows-native-qa.validation.v1";

const SHA1 = /^[0-9a-f]{40}$/u;
const SHA256 = /^[0-9a-f]{64}$/u;
const THUMBPRINT = /^[0-9A-F]{40}$/u;
const VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{2,159}$/u;
const APPROVAL_REFERENCE = /^(?:approval|ticket|meeting|email|signature):[A-Za-z0-9][A-Za-z0-9 _./:@#-]{7,}$/u;
const BLOCK_REASON_CODES = new Set([
  "NO_APPROVED_SIGNING_AUTHORITY_RECEIPT",
  "PROVIDER_NOT_SELECTED",
  "CERTIFICATE_NOT_PROCURED",
  "SIGNING_EXECUTION_NOT_ALLOWED",
]);

export class WindowsReleaseGateValidationError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "WindowsReleaseGateValidationError";
    this.code = code;
    this.details = details;
  }
}

function fail(code, message, details = {}) {
  throw new WindowsReleaseGateValidationError(code, message, details);
}

function record(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail("INVALID_OBJECT", `${label} must be an object`);
  }
  return value;
}

function exactKeys(value, keys, label) {
  record(value, label);
  const expected = new Set(keys);
  const actual = Object.keys(value);
  const missing = keys.filter((key) => !Object.hasOwn(value, key));
  const unknown = actual.filter((key) => !expected.has(key));
  if (missing.length > 0) fail("MISSING_KEY", `${label} is missing required keys`, { missing_count: missing.length });
  if (unknown.length > 0) fail("UNKNOWN_KEY", `${label} has unknown keys`, { unknown_count: unknown.length });
}

function sha1(value, label) {
  if (!SHA1.test(value ?? "")) fail("INVALID_SHA", `${label} must be a lowercase 40-character SHA-1`);
}

function sha256(value, label) {
  if (!SHA256.test(value ?? "")) fail("INVALID_SHA256", `${label} must be a lowercase SHA-256`);
}

function safeText(value, label) {
  if (typeof value !== "string" || value.trim() !== value || value.length < 1 || value.length > 512) {
    fail("INVALID_SIGNER_IDENTITY", `${label} must be a non-empty bounded string`);
  }
  if (/-----BEGIN|private[_ -]?key|password|credential|bearer\s+/iu.test(value)) {
    fail("SECRET_MATERIAL", `${label} contains prohibited secret material`);
  }
  return value;
}

function validateReleaseBinding(release, expected) {
  exactKeys(release, ["id", "version", "channel"], "authority release binding");
  if (!SAFE_ID.test(release.id ?? "") || !VERSION.test(release.version ?? "") || release.channel !== "formal") {
    fail("INVALID_RELEASE_BINDING", "authority release binding is invalid");
  }
  if (release.id !== expected.releaseId || release.version !== expected.version) {
    fail("RELEASE_BINDING_MISMATCH", "authority receipt is stale or belongs to a different release");
  }
}

function validateSigner(signer) {
  exactKeys(signer, ["thumbprint_sha1", "subject", "issuer", "team_equivalent"], "approved Windows signer");
  const normalized = {
    thumbprint_sha1: String(signer.thumbprint_sha1 ?? "").replaceAll(/\s/gu, "").toUpperCase(),
    subject: safeText(signer.subject, "approved signer subject"),
    issuer: safeText(signer.issuer, "approved signer issuer"),
    team_equivalent: safeText(signer.team_equivalent, "approved signer team equivalent"),
  };
  if (!THUMBPRINT.test(normalized.thumbprint_sha1)) {
    fail("INVALID_SIGNER_FINGERPRINT", "approved signer fingerprint must be a 40-character SHA-1 thumbprint");
  }
  return Object.freeze(normalized);
}

export function buildBlockedWindowsSigningAuthorityReceipt({
  receiptId,
  sourceSha,
  sourceTree,
  releaseId,
  version,
  reasonCodes = ["NO_APPROVED_SIGNING_AUTHORITY_RECEIPT"],
} = {}) {
  return Object.freeze({
    schema_version: WINDOWS_SIGNING_AUTHORITY_SCHEMA,
    receipt_id: receiptId,
    status: "BLOCKED_BY_AUTHORITY",
    source_sha: sourceSha,
    source_tree: sourceTree,
    release: { id: releaseId, version, channel: "formal" },
    artifact_sha256: { installer: null },
    signer: null,
    authorization: {
      recorded_by_human: false,
      approval_reference: null,
      authorized_at: null,
      expires_at: null,
    },
    boundary: {
      signing_execution_allowed: false,
      windows_release_signing_approved: false,
      secrets_recorded: false,
    },
    reason_codes: [...reasonCodes],
  });
}

export function validateWindowsSigningAuthorityReceipt(receipt, {
  expectedSourceSha,
  expectedSourceTree,
  expectedReleaseId,
  expectedVersion,
  expectedInstallerSha256,
  now = Date.now(),
} = {}) {
  exactKeys(receipt, [
    "schema_version",
    "receipt_id",
    "status",
    "source_sha",
    "source_tree",
    "release",
    "artifact_sha256",
    "signer",
    "authorization",
    "boundary",
    "reason_codes",
  ], "Windows signing authority receipt");
  if (receipt.schema_version !== WINDOWS_SIGNING_AUTHORITY_SCHEMA) {
    fail("AUTHORITY_SCHEMA_MISMATCH", "historical or unknown Windows authority receipt schema is not accepted");
  }
  if (!SAFE_ID.test(receipt.receipt_id ?? "")) fail("INVALID_RECEIPT_ID", "authority receipt_id is invalid");
  sha1(receipt.source_sha, "authority source_sha");
  sha1(receipt.source_tree, "authority source_tree");
  if (receipt.source_sha !== expectedSourceSha || receipt.source_tree !== expectedSourceTree) {
    fail("AUTHORITY_SOURCE_MISMATCH", "authority receipt is stale or source-mismatched");
  }
  validateReleaseBinding(receipt.release, { releaseId: expectedReleaseId, version: expectedVersion });
  exactKeys(receipt.artifact_sha256, ["installer"], "authority artifact binding");
  exactKeys(receipt.authorization, [
    "recorded_by_human",
    "approval_reference",
    "authorized_at",
    "expires_at",
  ], "authority authorization");
  exactKeys(receipt.boundary, [
    "signing_execution_allowed",
    "windows_release_signing_approved",
    "secrets_recorded",
  ], "authority boundary");
  if (receipt.boundary.secrets_recorded !== false) {
    fail("AUTHORITY_SECRET_BOUNDARY", "authority receipt must not contain certificate secrets");
  }
  if (!Array.isArray(receipt.reason_codes) || new Set(receipt.reason_codes).size !== receipt.reason_codes.length) {
    fail("INVALID_REASON_CODES", "authority reason codes must be a unique array");
  }

  if (receipt.status === "BLOCKED_BY_AUTHORITY") {
    if (receipt.artifact_sha256.installer !== null
      || receipt.signer !== null
      || Object.values(receipt.authorization).some((value) => value !== false && value !== null)
      || receipt.boundary.signing_execution_allowed !== false
      || receipt.boundary.windows_release_signing_approved !== false
      || receipt.reason_codes.length === 0
      || receipt.reason_codes.some((code) => !BLOCK_REASON_CODES.has(code))) {
      fail("INVALID_BLOCKED_AUTHORITY", "blocked authority receipt must remain non-authorizing and signer-free");
    }
    return Object.freeze({
      receipt_id: receipt.receipt_id,
      status: receipt.status,
      signer: null,
      installer_sha256: null,
    });
  }

  if (receipt.status !== "APPROVED") fail("INVALID_AUTHORITY_STATUS", "authority status must be APPROVED or BLOCKED_BY_AUTHORITY");
  sha256(receipt.artifact_sha256.installer, "authority installer sha256");
  if (receipt.artifact_sha256.installer !== expectedInstallerSha256) {
    fail("AUTHORITY_ARTIFACT_MISMATCH", "approved authority receipt is not bound to the exact installer");
  }
  const signer = validateSigner(receipt.signer);
  const authorizedAt = Date.parse(receipt.authorization.authorized_at ?? "");
  const expiresAt = Date.parse(receipt.authorization.expires_at ?? "");
  if (receipt.authorization.recorded_by_human !== true
    || !APPROVAL_REFERENCE.test(receipt.authorization.approval_reference ?? "")
    || !Number.isFinite(authorizedAt)
    || !Number.isFinite(expiresAt)
    || authorizedAt > now
    || expiresAt <= now
    || authorizedAt >= expiresAt
    || receipt.boundary.signing_execution_allowed !== true
    || receipt.boundary.windows_release_signing_approved !== true
    || receipt.reason_codes.length !== 0) {
    fail("AUTHORITY_NOT_CURRENT", "approved authority receipt is incomplete, expired, or not currently actionable");
  }
  return Object.freeze({
    receipt_id: receipt.receipt_id,
    status: receipt.status,
    signer,
    installer_sha256: receipt.artifact_sha256.installer,
  });
}

function signatureArtifact(recordValue, role, expectedSha256) {
  record(recordValue, `${role} Authenticode record`);
  if (recordValue.role !== role) fail("SIGNATURE_ROLE_MISMATCH", "Authenticode record role is mismatched");
  sha256(recordValue.artifact_sha256, `${role} Authenticode artifact sha256`);
  if (recordValue.artifact_sha256 !== expectedSha256) {
    fail("SIGNATURE_ARTIFACT_MISMATCH", "Authenticode result is not bound to the tested artifact bytes");
  }
}

function isAbsent(value) {
  return value === null || value === undefined || value === "";
}

function isCleanUnsigned(recordValue) {
  return recordValue.status === "NotSigned"
    && ["None", "Unknown", ""].includes(recordValue.signature_type ?? "")
    && recordValue.signer_certificate_present === false
    && recordValue.time_stamper_certificate_present === false
    && isAbsent(recordValue.signer_thumbprint)
    && isAbsent(recordValue.signer_subject)
    && isAbsent(recordValue.signer_issuer)
    && isAbsent(recordValue.signer_team_equivalent);
}

function failedDecision(nativeQa, reasonCode, signatureState = "INVALID") {
  return Object.freeze({
    native_qa: nativeQa,
    windows_release: "FAIL",
    reason_code: reasonCode,
    signature_state: signatureState,
    signer_binding: null,
  });
}

export function evaluateWindowsReleaseGate({
  nativeQa,
  signatures,
  authorityReceipt,
  sourceSha,
  sourceTree,
  releaseId,
  version,
  installerSha256,
  installedExecutableSha256,
  now = Date.now(),
} = {}) {
  if (!Array.isArray(signatures) || signatures.length !== 2) {
    return failedDecision(nativeQa, "AUTHENTICODE_RECORDS_MISSING", "UNKNOWN");
  }
  try {
    signatureArtifact(signatures[0], "installer", installerSha256);
    signatureArtifact(signatures[1], "installed_executable", installedExecutableSha256);
  } catch {
    return failedDecision(nativeQa, "AUTHENTICODE_ARTIFACT_BINDING_FAILED");
  }
  if (nativeQa !== "PASS") return failedDecision(nativeQa, "NATIVE_QA_NOT_PASSING");

  let authority;
  try {
    authority = validateWindowsSigningAuthorityReceipt(authorityReceipt, {
      expectedSourceSha: sourceSha,
      expectedSourceTree: sourceTree,
      expectedReleaseId: releaseId,
      expectedVersion: version,
      expectedInstallerSha256: installerSha256,
      now,
    });
  } catch {
    return failedDecision(nativeQa, "AUTHORITY_RECEIPT_INVALID", "UNKNOWN");
  }

  const statuses = signatures.map(({ status }) => status);
  if (signatures.every(isCleanUnsigned)) {
    if (authority.status !== "BLOCKED_BY_AUTHORITY") {
      return failedDecision(nativeQa, "APPROVED_ARTIFACT_IS_UNSIGNED", "UNSIGNED");
    }
    return Object.freeze({
      native_qa: "PASS",
      windows_release: "BLOCKED_BY_AUTHORITY",
      reason_code: "AUTHENTICODE_SIGNATURE_ABSENT",
      signature_state: "UNSIGNED",
      signer_binding: null,
    });
  }
  if (statuses.some((status) => status === "NotSigned")) {
    return failedDecision(nativeQa, "AUTHENTICODE_MIXED_SIGNATURE_STATE", "MIXED");
  }
  if (statuses.some((status) => status !== "Valid")) {
    return failedDecision(nativeQa, "AUTHENTICODE_INTEGRITY_OR_TRUST_FAILURE");
  }
  if (authority.status !== "APPROVED") {
    return failedDecision(nativeQa, "AUTHENTICODE_SIGNER_NOT_AUTHORIZED", "SIGNED");
  }
  try {
    const signerBinding = validateMatterDesktopAuthenticodeSignatures(signatures, {
      expectedSigner: authority.signer,
    });
    return Object.freeze({
      native_qa: "PASS",
      windows_release: "PASS",
      reason_code: null,
      signature_state: "SIGNED_APPROVED",
      signer_binding: Object.freeze({
        thumbprint_sha1: signerBinding.signer_thumbprint_sha256_source,
        subject: signerBinding.signer_subject,
        issuer: signerBinding.signer_issuer,
        team_equivalent: signerBinding.signer_team_equivalent,
        timestamp_verified: signerBinding.timestamp_verified,
        authority_receipt_id: authority.receipt_id,
      }),
    });
  } catch {
    return failedDecision(nativeQa, "AUTHENTICODE_SIGNER_BINDING_FAILED", "SIGNED");
  }
}
