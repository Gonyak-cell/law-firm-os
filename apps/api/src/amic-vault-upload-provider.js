import { isDeepStrictEqual } from "node:util";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const SHA256 = /^[a-f0-9]{64}$/u;
const MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
const RFC3339_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

const PREFLIGHT_KEYS = Object.freeze([
  "authority_kind",
  "authority_ref",
  "provider_revision",
  "preflight_ref",
  "expires_at",
  "resolved",
  "decisions",
  "audit",
]);
const RESOLVED_KEYS = Object.freeze([
  "vault_tenant_id",
  "vault_actor_id",
  "vault_matter_id",
  "vault_workspace_id",
  "vault_folder_id",
]);
const DECISION_KEYS = Object.freeze([
  "permission",
  "ethical_wall",
  "records",
  "dlp",
]);
const DECISION_KEYS_INNER = Object.freeze(["effect", "decision_ref"]);
const AUDIT_KEYS = Object.freeze(["event_id", "correlation_id"]);
const COMMIT_KEYS = Object.freeze([
  "authority_kind",
  "authority_ref",
  "provider_revision",
  "state",
  "provider_operation_ref",
  "accepted",
  "exact_version",
  "retry_after_ms",
  "audit",
]);
const TRANSFER_KEYS = Object.freeze([
  "authority_kind",
  "authority_ref",
  "provider_revision",
  "state",
  "transfer_ref",
  "expires_at",
  "method",
  "upload_url",
  "required_headers",
  "file",
  "max_upload_bytes",
]);
const TRANSFER_FILE_KEYS = Object.freeze(["filename", "byte_size", "mime_type"]);
const READBACK_KEYS = Object.freeze([
  "authority_kind",
  "authority_ref",
  "provider_revision",
  "state",
  "provider_operation_ref",
  "exact_version",
  "retry_after_ms",
  "decisions",
  "audit",
]);
const UPLOAD_FINGERPRINT_KEYS = Object.freeze([
  "sha256",
  "byte_size",
  "mime_type",
]);
const EXACT_VERSION_KEYS = Object.freeze([
  "document_id",
  "version_id",
  "file_object_id",
  "sha256",
  "byte_size",
  "mime_type",
]);
const UPLOAD_PRE_PROMOTION_STATES = new Set(["quarantined", "scanning"]);
const UPLOAD_EXACT_STATES = new Set(["promoted", "readback_verified"]);
const UPLOAD_NEGATIVE_STATES = new Map([
  ["infected", "VAULT_UPLOAD_INFECTED"],
  ["security_hold", "VAULT_UPLOAD_SECURITY_HOLD"],
  ["scan_error", "VAULT_UPLOAD_SCAN_ERROR"],
  ["expired", "VAULT_UPLOAD_EXPIRED"],
  ["denied", "VAULT_UPLOAD_DENIED"],
]);

export class AmicVaultUploadProviderError extends Error {
  constructor(safeErrorCode, message, status = 503) {
    super(message);
    this.name = "AmicVaultUploadProviderError";
    this.code = `LAWOS_${safeErrorCode}`;
    this.safe_error_code = safeErrorCode;
    this.status = status;
  }
}

function fail(code, message, status = 503) {
  throw new AmicVaultUploadProviderError(code, message, status);
}

function isPlainObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(value, expected, label) {
  if (!isPlainObject(value)) fail("VAULT_PROVIDER_RESPONSE_INVALID", `${label} must be an object`, 502);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (!isDeepStrictEqual(actual, wanted)) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", `${label} fields are invalid`, 502);
  }
}

function requiredId(value, field) {
  if (typeof value !== "string" || !SAFE_ID.test(value)) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", `${field} is invalid`, 502);
  }
  return value;
}

function optionalId(value, field) {
  return value == null ? null : requiredId(value, field);
}

function canonicalInstant(value, field) {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  if (typeof value !== "string"
      || !RFC3339_MILLISECONDS.test(value)
      || !Number.isFinite(parsed)
      || new Date(parsed).toISOString() !== value) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", `${field} is invalid`, 502);
  }
  return value;
}

export function normalizeAmicVaultProviderIdentity(
  value,
  expectedAuthorityRef = null,
  expectedProviderRevision = null,
) {
  if (value.authority_kind !== "amic-vault-api") {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "Vault provider authority kind is invalid", 502);
  }
  const authorityRef = requiredId(value.authority_ref, "authority_ref");
  if (expectedAuthorityRef != null && authorityRef !== expectedAuthorityRef) {
    fail("VAULT_PROVIDER_AUTHORITY_CHANGED", "Vault provider authority changed during the operation", 409);
  }
  const providerRevision = requiredId(value.provider_revision, "provider_revision");
  if (expectedProviderRevision != null && providerRevision !== expectedProviderRevision) {
    fail("VAULT_PROVIDER_REVISION_CHANGED", "Vault provider revision changed during the operation", 409);
  }
  return Object.freeze({
    authority_kind: "amic-vault-api",
    authority_ref: authorityRef,
    provider_revision: providerRevision,
  });
}

export function normalizeAmicVaultProviderAudit(value, expectedCorrelationId) {
  exactKeys(value, AUDIT_KEYS, "Vault provider audit");
  const eventId = requiredId(value.event_id, "audit.event_id");
  const correlationId = requiredId(value.correlation_id, "audit.correlation_id");
  if (correlationId !== expectedCorrelationId) {
    fail("VAULT_PROVIDER_AUDIT_MISMATCH", "Vault provider audit correlation is mismatched", 409);
  }
  return Object.freeze({ event_id: eventId, correlation_id: correlationId });
}

function allowDecision(value, field, allowedEffects = ["allow"]) {
  exactKeys(value, DECISION_KEYS_INNER, `Vault provider ${field} decision`);
  if (!allowedEffects.includes(value.effect)) {
    fail(`VAULT_PROVIDER_${field.toUpperCase()}_DENIED`, `Vault provider ${field} decision denied the operation`, 403);
  }
  return Object.freeze({
    effect: value.effect,
    decision_ref: requiredId(value.decision_ref, `decisions.${field}.decision_ref`),
  });
}

export function normalizeAmicVaultProviderDecisions(value, { allowDeferredDlp = false } = {}) {
  exactKeys(value, DECISION_KEYS, "Vault provider decisions");
  return Object.freeze({
    permission: allowDecision(value.permission, "permission"),
    ethical_wall: allowDecision(value.ethical_wall, "ethical_wall"),
    records: allowDecision(value.records, "records"),
    dlp: allowDecision(
      value.dlp,
      "dlp",
      allowDeferredDlp ? ["allow", "pending", "deferred"] : ["allow"],
    ),
  });
}

function normalizeAmicVaultUploadFingerprint(value) {
  exactKeys(value, UPLOAD_FINGERPRINT_KEYS, "Vault accepted upload fingerprint");
  const sha256 = typeof value.sha256 === "string" ? value.sha256 : "";
  const mimeType = typeof value.mime_type === "string" ? value.mime_type.toLowerCase() : "";
  if (!SHA256.test(sha256)
      || !Number.isSafeInteger(value.byte_size)
      || value.byte_size < 1
      || !MIME_TYPE.test(mimeType)) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "Vault accepted upload fingerprint is invalid", 502);
  }
  return Object.freeze({ sha256, byte_size: value.byte_size, mime_type: mimeType });
}

function normalizeRetryAfter(value, { required }) {
  if (!required) {
    if (value !== null) fail("VAULT_PROVIDER_RESPONSE_INVALID", "retry_after_ms must be null", 502);
    return null;
  }
  if (!Number.isSafeInteger(value) || value < 250 || value > 60_000) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "retry_after_ms is invalid", 502);
  }
  return value;
}

export function normalizeAmicVaultExactVersion(value) {
  exactKeys(value, EXACT_VERSION_KEYS, "Vault exact version");
  const sha256 = typeof value.sha256 === "string" ? value.sha256 : "";
  const mimeType = typeof value.mime_type === "string" ? value.mime_type.toLowerCase() : "";
  if (!SHA256.test(sha256)
      || !Number.isSafeInteger(value.byte_size)
      || value.byte_size < 1
      || !MIME_TYPE.test(mimeType)) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "Vault exact version integrity fields are invalid", 502);
  }
  return Object.freeze({
    document_id: requiredId(value.document_id, "exact_version.document_id"),
    version_id: requiredId(value.version_id, "exact_version.version_id"),
    file_object_id: requiredId(value.file_object_id, "exact_version.file_object_id"),
    sha256,
    byte_size: value.byte_size,
    mime_type: mimeType,
  });
}

export function requireAmicVaultUploadProvider(provider) {
  if (!provider
      || provider.authority_kind !== "amic-vault-api"
      || typeof provider.preflightUpload !== "function"
      || typeof provider.commitUpload !== "function"
      || typeof provider.readbackUpload !== "function") {
    fail("VAULT_PROVIDER_UNAVAILABLE", "AMIC Vault upload provider is unavailable");
  }
  return provider;
}

export function requireAmicVaultStagedUploadProvider(provider) {
  const resolved = requireAmicVaultUploadProvider(provider);
  if (typeof resolved.prepareStagedUpload !== "function"
      || typeof resolved.completeStagedUpload !== "function") {
    fail("VAULT_PROVIDER_UNAVAILABLE", "AMIC Vault staged upload provider is unavailable");
  }
  return resolved;
}

export function normalizeAmicVaultUploadPreflight(value, {
  correlationId,
  expected = {},
  now = Date.now,
} = {}) {
  exactKeys(value, PREFLIGHT_KEYS, "Vault provider preflight");
  const identity = normalizeAmicVaultProviderIdentity(value);
  canonicalInstant(value.expires_at, "expires_at");
  if (Date.parse(value.expires_at) <= now()) {
    fail("VAULT_PROVIDER_PREFLIGHT_EXPIRED", "Vault provider preflight is already expired", 409);
  }
  exactKeys(value.resolved, RESOLVED_KEYS, "Vault provider resolved binding");
  const resolved = Object.freeze({
    vault_tenant_id: requiredId(value.resolved.vault_tenant_id, "resolved.vault_tenant_id"),
    vault_actor_id: requiredId(value.resolved.vault_actor_id, "resolved.vault_actor_id"),
    vault_matter_id: requiredId(value.resolved.vault_matter_id, "resolved.vault_matter_id"),
    vault_workspace_id: requiredId(value.resolved.vault_workspace_id, "resolved.vault_workspace_id"),
    vault_folder_id: optionalId(value.resolved.vault_folder_id, "resolved.vault_folder_id"),
  });
  if ((expected.workspaceId != null && resolved.vault_workspace_id !== expected.workspaceId)
      || (expected.folderId != null && resolved.vault_folder_id !== expected.folderId)) {
    fail("VAULT_PROVIDER_SCOPE_MISMATCH", "Vault provider resolved a different workspace or folder", 409);
  }
  return Object.freeze({
    ...identity,
    preflight_ref: requiredId(value.preflight_ref, "preflight_ref"),
    expires_at: value.expires_at,
    resolved,
    decisions: normalizeAmicVaultProviderDecisions(value.decisions, { allowDeferredDlp: true }),
    audit: normalizeAmicVaultProviderAudit(value.audit, correlationId),
  });
}

export function normalizeAmicVaultUploadCommit(value, {
  correlationId,
  expected,
  authorityRef,
  providerRevision,
} = {}) {
  exactKeys(value, COMMIT_KEYS, "Vault provider commit");
  const identity = normalizeAmicVaultProviderIdentity(value, authorityRef, providerRevision);
  if (value.state !== "quarantined") {
    fail("VAULT_PROVIDER_COMMIT_INCOMPLETE", "Vault provider did not accept the upload into quarantine", 409);
  }
  if (value.exact_version !== null) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "quarantine acceptance cannot expose an exact version", 502);
  }
  const accepted = normalizeAmicVaultUploadFingerprint(value.accepted);
  assertExactVersionMatches(accepted, expected, "VAULT_PROVIDER_COMMIT_MISMATCH");
  return Object.freeze({
    ...identity,
    state: "quarantined",
    provider_operation_ref: requiredId(value.provider_operation_ref, "provider_operation_ref"),
    accepted,
    exact_version: null,
    retry_after_ms: normalizeRetryAfter(value.retry_after_ms, { required: true }),
    audit: normalizeAmicVaultProviderAudit(value.audit, correlationId),
  });
}

export function normalizeAmicVaultUploadTransfer(value, {
  authorityRef,
  providerRevision,
  expected,
  now = Date.now,
} = {}) {
  exactKeys(value, TRANSFER_KEYS, "Vault provider transfer");
  const identity = normalizeAmicVaultProviderIdentity(value, authorityRef, providerRevision);
  if (value.state !== "transfer_ready" || value.method !== "PUT") {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "Vault provider transfer state is invalid", 502);
  }
  canonicalInstant(value.expires_at, "expires_at");
  if (Date.parse(value.expires_at) <= now()
      || Date.parse(value.expires_at) > now() + 2 * 60 * 60 * 1000 + 60_000) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "Vault provider transfer expiry is invalid", 502);
  }
  exactKeys(value.file, TRANSFER_FILE_KEYS, "Vault provider transfer file");
  const mimeType = typeof value.file.mime_type === "string"
    ? value.file.mime_type.toLowerCase()
    : "";
  if (!expected
      || value.file.filename !== expected.filename
      || value.file.byte_size !== expected.byte_size
      || mimeType !== expected.mime_type
      || value.max_upload_bytes !== 1024 * 1024 * 1024) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "Vault provider transfer file is mismatched", 502);
  }
  let uploadUrl;
  try {
    uploadUrl = new URL(value.upload_url);
  } catch {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "Vault provider transfer URL is invalid", 502);
  }
  if (uploadUrl.protocol !== "https:"
      || uploadUrl.username
      || uploadUrl.password
      || uploadUrl.hash
      || !/^[a-z0-9.-]+$/u.test(uploadUrl.hostname)
      || !/^[a-f0-9]{64}$/u.test(uploadUrl.searchParams.get("X-Amz-Signature") ?? "")) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "Vault provider transfer URL is invalid", 502);
  }
  const headers = value.required_headers;
  if (!isPlainObject(headers)) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "Vault provider transfer headers are invalid", 502);
  }
  const allowedHeaders = new Set([
    "content-length",
    "content-type",
    "if-none-match",
    "x-amz-server-side-encryption",
  ]);
  const headerNames = Object.keys(headers);
  if (headerNames.some((name) => !allowedHeaders.has(name))
      || headers["content-length"] !== String(expected.byte_size)
      || headers["content-type"] !== expected.mime_type
      || headers["if-none-match"] !== "*"
      || (headers["x-amz-server-side-encryption"] !== undefined
        && !["AES256", "aws:kms"].includes(headers["x-amz-server-side-encryption"]))) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "Vault provider transfer headers are invalid", 502);
  }
  return Object.freeze({
    ...identity,
    state: "transfer_ready",
    transfer_ref: requiredId(value.transfer_ref, "transfer_ref"),
    expires_at: value.expires_at,
    method: "PUT",
    upload_url: uploadUrl.toString(),
    required_headers: Object.freeze({ ...headers }),
    file: Object.freeze({
      filename: value.file.filename,
      byte_size: value.file.byte_size,
      mime_type: mimeType,
    }),
    max_upload_bytes: value.max_upload_bytes,
  });
}

export function normalizeAmicVaultUploadReadback(value, {
  correlationId,
  expected,
  authorityRef,
  providerRevision,
  providerOperationRef,
} = {}) {
  exactKeys(value, READBACK_KEYS, "Vault provider readback");
  const identity = normalizeAmicVaultProviderIdentity(value, authorityRef, providerRevision);
  const operationRef = requiredId(value.provider_operation_ref, "provider_operation_ref");
  if (operationRef !== providerOperationRef) {
    fail("VAULT_PROVIDER_READBACK_MISMATCH", "Vault provider operation readback is mismatched", 409);
  }
  const prePromotion = UPLOAD_PRE_PROMOTION_STATES.has(value.state);
  const exactState = UPLOAD_EXACT_STATES.has(value.state);
  const pending = prePromotion || value.state === "promoted";
  const final = value.state === "readback_verified";
  const negativeCode = UPLOAD_NEGATIVE_STATES.get(value.state) ?? null;
  if (!pending && !final && !negativeCode) {
    fail("VAULT_PROVIDER_READBACK_INCOMPLETE", "Vault provider readback state is invalid", 409);
  }
  if ((prePromotion || negativeCode) && value.exact_version !== null) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "pre-promotion status cannot expose an exact version", 502);
  }
  if (negativeCode && value.decisions !== null) {
    fail("VAULT_PROVIDER_RESPONSE_INVALID", "negative upload status decisions must be null", 502);
  }
  const exactVersion = exactState ? normalizeAmicVaultExactVersion(value.exact_version) : null;
  if (exactVersion) {
    assertExactVersionMatches(exactVersion, expected, "VAULT_PROVIDER_READBACK_MISMATCH");
  }
  return Object.freeze({
    ...identity,
    state: value.state,
    provider_operation_ref: operationRef,
    exact_version: exactVersion,
    retry_after_ms: normalizeRetryAfter(value.retry_after_ms, { required: pending }),
    decisions: negativeCode
      ? null
      : normalizeAmicVaultProviderDecisions(value.decisions, { allowDeferredDlp: true }),
    audit: normalizeAmicVaultProviderAudit(value.audit, correlationId),
    safe_reason_code: negativeCode,
  });
}

export function assertExactVersionMatches(actual, expected, code = "VAULT_PROVIDER_READBACK_MISMATCH") {
  if (!expected
      || actual.sha256 !== expected.sha256
      || actual.byte_size !== expected.byte_size
      || actual.mime_type !== expected.mime_type
      || (expected.document_id != null && actual.document_id !== expected.document_id)
      || (expected.version_id != null && actual.version_id !== expected.version_id)
      || (expected.file_object_id != null && actual.file_object_id !== expected.file_object_id)) {
    fail(code, "Vault exact version does not match the bound upload", 409);
  }
  return true;
}
