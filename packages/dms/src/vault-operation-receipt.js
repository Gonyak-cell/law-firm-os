import { isDeepStrictEqual } from "node:util";

import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { assertNoDmsPersistedSecrets } from "./persistence-guard.js";
import { createDmsAuditEvent } from "./audit.js";

export const VAULT_OPERATION_SCHEMA_VERSION =
  "law-firm-os.amic-os-vault-operation.v1";
export const VAULT_OPERATION_RECEIPT_SCHEMA_VERSION =
  "law-firm-os.amic-os-vault-operation-receipt.v1";

export const VAULT_OPERATION_KINDS = Object.freeze([
  "save_local_file",
  "save_email",
  "save_email_attachment",
  "export_exact_version",
  "attach_outlook",
  "cleanup_temp",
]);

export const VAULT_OPERATION_STAGES = Object.freeze([
  "requested",
  "authorized",
  "transferring",
  "quarantined",
  "scanning",
  "promoted",
  "readback_verified",
  "downloaded",
  "delivered",
  "attached",
  "blocked",
  "failed",
  "cancelled",
  "cleaned",
]);

const FLOW = Object.freeze({
  save_local_file: Object.freeze([
    "requested", "authorized", "transferring", "quarantined", "scanning", "promoted", "readback_verified", "cleaned",
  ]),
  save_email: Object.freeze([
    "requested", "authorized", "transferring", "quarantined", "scanning", "promoted", "readback_verified", "cleaned",
  ]),
  save_email_attachment: Object.freeze([
    "requested", "authorized", "transferring", "quarantined", "scanning", "promoted", "readback_verified", "cleaned",
  ]),
  export_exact_version: Object.freeze([
    "requested", "authorized", "downloaded", "delivered", "cleaned",
  ]),
  attach_outlook: Object.freeze([
    "requested", "authorized", "downloaded", "attached", "cleaned",
  ]),
  cleanup_temp: Object.freeze([
    "requested", "authorized", "cleaned",
  ]),
});

export const VAULT_OPERATION_FLOWS = FLOW;

const FAILURE_STAGES = new Set(["blocked", "failed", "cancelled"]);
const SUCCESS_IDENTITY_STAGES = new Set([
  "promoted", "readback_verified", "downloaded", "delivered", "attached",
]);
const VAULT_AUTHORITY_STAGES = new Set([
  "authorized", "quarantined", "scanning", "promoted", "readback_verified", "downloaded", "delivered", "attached",
]);
const TERMINAL_STAGES = new Set([
  "readback_verified", "delivered", "attached", "blocked", "failed", "cancelled", "cleaned",
]);
const EXACT_VERSION_REQUIRED_KINDS = new Set(["export_exact_version", "attach_outlook"]);
const SAVE_KINDS = new Set(["save_local_file", "save_email", "save_email_attachment"]);
const SAVE_EXACT_VERSION_STAGES = new Set(["promoted", "readback_verified", "cleaned"]);
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const MIME_TYPE = /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+$/u;
const RFC3339_MILLISECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

const FORBIDDEN_PUBLIC_KEYS = new Set([
  "accesstoken", "refreshtoken", "idtoken", "sessiontoken", "authorization",
  "cookie", "setcookie", "apikey", "clientsecret", "privatekey", "password",
  "credential", "credentials", "token", "granttoken", "bearertoken", "providertoken",
  "vaulttoken", "rawpath", "path", "filepath", "localpath", "temppath",
  "storageuri", "storageurl", "signedurl", "url", "storagepointerref", "objectkey", "bucket",
  "rawbytes", "filebytes", "documentbytes", "bytes", "base64", "binarypayload",
  "emailbody", "rawmime", "mimepayload", "mailbox", "recipient", "recipients",
  "graphitemid", "outlookitemid", "composeitemid", "draftitemid",
]);

const FORBIDDEN_RECEIPT_KEYS = new Set([
  ...FORBIDDEN_PUBLIC_KEYS,
  "filename", "name", "subject", "from", "to", "cc", "bcc", "email",
  "emailaddress", "displayname", "sourceurl", "downloadurl", "granttoken",
  "idempotencykey", "tenantid", "actorid", "userid",
]);

const FORBIDDEN_CLIENT_AUTHORITY_KEYS = new Set([
  "tenantid", "actorid", "userid", "role", "roles", "roleids", "scope", "scopes",
  "capability", "capabilities", "permission", "permissions", "permissiondecision",
  "authorityref", "vaulttenantid", "vaultuserid", "providercredential",
]);

const EXACT_VERSION_FIELDS = Object.freeze([
  "document_id",
  "version_id",
  "file_object_id",
  "sha256",
  "byte_size",
  "mime_type",
]);

const BINDING_RESOURCE_FIELDS = new Set([
  "matter_id",
  "exact_version",
  "installation_ref_sha256",
  "compose_target_sha256",
]);

const RECEIPT_FIELDS = Object.freeze([
  "schema_version",
  "receipt_id",
  "operation_id",
  "correlation_id",
  "operation_kind",
  "stage",
  "decision",
  "safe_reason_code",
  "occurred_at",
  "request_fingerprint",
  "idempotency_key_sha256",
  "tenant_ref_sha256",
  "actor_ref_sha256",
  "matter_id",
  "installation_ref_sha256",
  "compose_target_sha256",
  "exact_version",
  "lawos_event_id",
  "vault_event_id",
  "authority_ref_sha256",
  "raw_path_included",
  "token_material_included",
  "storage_locator_included",
  "mail_pii_included",
  "raw_bytes_included",
  "production_ready_claim",
]);

const BINDING_FIELDS = Object.freeze([
  "schema_version",
  "operation_id",
  "correlation_id",
  "operation_kind",
  "tenant_id",
  "actor_id",
  "tenant_ref_sha256",
  "actor_ref_sha256",
  "server_nonce_sha256",
  "source_ref_sha256",
  "target_ref_sha256",
  "resolved_resource",
  "request_fingerprint",
  "idempotency_key",
  "idempotency_key_sha256",
]);

export class VaultOperationContractError extends Error {
  constructor(safeErrorCode, message, status = 400) {
    super(message);
    this.name = "VaultOperationContractError";
    this.code = `LAWOS_${safeErrorCode}`;
    this.safe_error_code = safeErrorCode;
    this.status = status;
  }
}

function fail(code, message, status) {
  throw new VaultOperationContractError(code, message, status);
}

function isRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function normalizedKey(value) {
  return String(value).normalize("NFKC").toLowerCase().replace(/[^a-z0-9]/gu, "");
}

function requiredText(value, field, max = 256) {
  if (
    typeof value !== "string"
    || value.length === 0
    || value !== value.trim()
    || value.length > max
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) {
    fail("VAULT_OPERATION_INPUT_INVALID", `${field} is invalid`);
  }
  return value;
}

function requiredId(value, field) {
  const text = requiredText(value, field);
  if (!SAFE_ID.test(text)) fail("VAULT_OPERATION_INPUT_INVALID", `${field} is invalid`);
  return text;
}

function optionalId(value, field) {
  return value == null ? null : requiredId(value, field);
}

function requiredSha256(value, field) {
  if (typeof value !== "string" || !SHA256.test(value)) {
    fail("VAULT_OPERATION_INPUT_INVALID", `${field} must be a lowercase SHA-256 digest`);
  }
  return value;
}

function optionalSha256(value, field) {
  return value == null ? null : requiredSha256(value, field);
}

function exactKeys(value, expected, code, label) {
  if (!isRecord(value)) fail(code, `${label} must be a plain object`);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (!isDeepStrictEqual(actual, wanted)) fail(code, `${label} fields do not match the closed schema`);
}

function strictInstant(value, field) {
  const text = requiredText(value, field, 32);
  const time = Date.parse(text);
  if (!RFC3339_MILLISECONDS.test(text) || !Number.isFinite(time) || new Date(time).toISOString() !== text) {
    fail("VAULT_OPERATION_INPUT_INVALID", `${field} must be a canonical UTC timestamp`);
  }
  return text;
}

function normalizedExactVersion(value, { required = false } = {}) {
  if (value == null) {
    if (required) fail("VAULT_OPERATION_EXACT_VERSION_REQUIRED", "an exact Vault version is required");
    return null;
  }
  exactKeys(value, EXACT_VERSION_FIELDS, "VAULT_OPERATION_INPUT_INVALID", "exact_version");
  if (!Number.isSafeInteger(value.byte_size) || value.byte_size < 0) {
    fail("VAULT_OPERATION_INPUT_INVALID", "exact_version.byte_size is invalid");
  }
  const mimeType = requiredText(value.mime_type, "exact_version.mime_type", 255);
  if (!MIME_TYPE.test(mimeType)) fail("VAULT_OPERATION_INPUT_INVALID", "exact_version.mime_type is invalid");
  return deepFreeze({
    document_id: requiredId(value.document_id, "exact_version.document_id"),
    version_id: requiredId(value.version_id, "exact_version.version_id"),
    file_object_id: requiredId(value.file_object_id, "exact_version.file_object_id"),
    sha256: requiredSha256(value.sha256, "exact_version.sha256"),
    byte_size: value.byte_size,
    mime_type: mimeType,
  });
}

function boundaryStringIsForbidden(value, receiptProfile) {
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) return true;
  if (/^(?:[A-Za-z]:[\\/]|\\\\|\/|~[\\/]|\.\.?[\\/])/u.test(value)) return true;
  if (/(?:https?|file|s3|vault):\/\//iu.test(value)) return true;
  if (/^Bearer\s+/iu.test(value)) return true;
  if (/^data:[^,;]+;base64,/iu.test(value)) return true;
  if (/^[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}$/u.test(value)) return true;
  if (receiptProfile && /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u.test(value)) return true;
  return value.length > 2_048;
}

/**
 * Guards JSON-like data that crosses into UI, IPC, audit, or logs. File bytes and
 * local paths may exist only inside their owning process and never in this payload.
 */
export function assertNoVaultBoundarySecrets(value, { profile = "public" } = {}) {
  if (!new Set(["public", "receipt"]).has(profile)) {
    fail("VAULT_BOUNDARY_PROFILE_INVALID", "Vault boundary profile is invalid");
  }
  const blockedKeys = profile === "receipt" ? FORBIDDEN_RECEIPT_KEYS : FORBIDDEN_PUBLIC_KEYS;
  const pending = [{ path: "$", value, depth: 0 }];
  let visited = 0;
  while (pending.length) {
    const current = pending.pop();
    if (++visited > 2_000 || current.depth > 32) {
      fail("VAULT_BOUNDARY_SHAPE_INVALID", "Vault boundary payload exceeds the bounded shape");
    }
    if (
      Buffer.isBuffer(current.value)
      || ArrayBuffer.isView(current.value)
      || current.value instanceof ArrayBuffer
    ) {
      fail("VAULT_BOUNDARY_SECRET_FORBIDDEN", `binary material is forbidden at ${current.path}`);
    }
    if (typeof current.value === "string") {
      if (boundaryStringIsForbidden(current.value, profile === "receipt")) {
        fail("VAULT_BOUNDARY_SECRET_FORBIDDEN", `sensitive material is forbidden at ${current.path}`);
      }
      continue;
    }
    if (current.value === null || current.value === undefined || typeof current.value !== "object") continue;
    if (!Array.isArray(current.value) && !isRecord(current.value)) {
      fail("VAULT_BOUNDARY_SHAPE_INVALID", `non-JSON value is forbidden at ${current.path}`);
    }
    const entries = Array.isArray(current.value)
      ? current.value.map((child, index) => [String(index), child])
      : Object.entries(current.value);
    for (const [key, child] of entries) {
      if (!Array.isArray(current.value) && blockedKeys.has(normalizedKey(key)) && child != null) {
        fail("VAULT_BOUNDARY_SECRET_FORBIDDEN", `forbidden field ${key} is present`);
      }
      pending.push({ path: `${current.path}.${key}`, value: child, depth: current.depth + 1 });
    }
  }
  return true;
}

/** Rejects identity, policy, and capability authority smuggled in a client request. */
export function assertNoClientSuppliedVaultAuthority(value) {
  assertNoVaultBoundarySecrets(value, { profile: "public" });
  const pending = [value];
  let visited = 0;
  while (pending.length) {
    const current = pending.pop();
    if (++visited > 2_000) fail("VAULT_BOUNDARY_SHAPE_INVALID", "client request exceeds the bounded shape");
    if (!current || typeof current !== "object") continue;
    const entries = Array.isArray(current) ? current.map((child) => [null, child]) : Object.entries(current);
    for (const [key, child] of entries) {
      if (key != null && FORBIDDEN_CLIENT_AUTHORITY_KEYS.has(normalizedKey(key)) && child != null) {
        fail("VAULT_CLIENT_AUTHORITY_FIELD_FORBIDDEN", `client authority field ${key} is forbidden`, 403);
      }
      if (child && typeof child === "object") pending.push(child);
    }
  }
  return true;
}

function normalizeResolvedResource(value, operationKind) {
  exactKeys(value, BINDING_RESOURCE_FIELDS, "VAULT_OPERATION_INPUT_INVALID", "resolved_resource");
  const exactVersion = normalizedExactVersion(value.exact_version, {
    required: EXACT_VERSION_REQUIRED_KINDS.has(operationKind),
  });
  const installationRef = optionalSha256(value.installation_ref_sha256, "installation_ref_sha256");
  const composeTarget = optionalSha256(value.compose_target_sha256, "compose_target_sha256");
  if (operationKind === "attach_outlook" && (!installationRef || !composeTarget)) {
    fail(
      "VAULT_OPERATION_EXACT_VERSION_REQUIRED",
      "Outlook attachment requires installation and compose-target bindings",
    );
  }
  return deepFreeze({
    matter_id: requiredId(value.matter_id, "resolved_resource.matter_id"),
    exact_version: exactVersion,
    installation_ref_sha256: installationRef,
    compose_target_sha256: composeTarget,
  });
}

/**
 * Builds the server-only immutable operation binding. Never serialize this
 * object to a renderer, Office.js, native adapter, audit body, or log because it
 * contains native tenant/actor IDs and the raw derived idempotency key.
 */
export function createVaultOperationBinding({
  principal,
  operation_kind: operationKind,
  server_nonce_sha256: serverNonceSha256,
  source_ref_sha256: sourceRefSha256,
  target_ref_sha256: targetRefSha256,
  resolved_resource: resolvedResource,
} = {}) {
  if (!VAULT_OPERATION_KINDS.includes(operationKind)) {
    fail("VAULT_OPERATION_INPUT_INVALID", "operation_kind is unsupported");
  }
  const tenantId = requiredId(principal?.tenant_id, "principal.tenant_id");
  const actorId = requiredId(principal?.user_id, "principal.user_id");
  const resource = normalizeResolvedResource(resolvedResource, operationKind);
  const nonceHash = requiredSha256(serverNonceSha256, "server_nonce_sha256");
  const sourceHash = requiredSha256(sourceRefSha256, "source_ref_sha256");
  const targetHash = requiredSha256(targetRefSha256, "target_ref_sha256");
  const idempotencyScope = hashDomainValue({
    tenant_id: tenantId,
    actor_id: actorId,
    operation_kind: operationKind,
    server_nonce_sha256: nonceHash,
  });
  const operationId = `vaultop_${idempotencyScope.slice(0, 32)}`;
  const idempotencyKey = `amic-os-vault:v1:${operationKind}:${idempotencyScope}`;
  const requestFingerprint = hashDomainValue({
    tenant_id: tenantId,
    actor_id: actorId,
    operation_kind: operationKind,
    server_nonce_sha256: nonceHash,
    source_ref_sha256: sourceHash,
    target_ref_sha256: targetHash,
    resolved_resource: resource,
  });
  return deepFreeze({
    schema_version: VAULT_OPERATION_SCHEMA_VERSION,
    operation_id: operationId,
    correlation_id: `vaultcorr_${idempotencyScope.slice(0, 32)}`,
    operation_kind: operationKind,
    tenant_id: tenantId,
    actor_id: actorId,
    tenant_ref_sha256: hashDomainValue({ tenant_id: tenantId }),
    actor_ref_sha256: hashDomainValue({ actor_id: actorId }),
    server_nonce_sha256: nonceHash,
    source_ref_sha256: sourceHash,
    target_ref_sha256: targetHash,
    resolved_resource: resource,
    request_fingerprint: requestFingerprint,
    idempotency_key: idempotencyKey,
    idempotency_key_sha256: hashDomainValue({ idempotency_key: idempotencyKey }),
  });
}

export function assertVaultOperationBinding(binding) {
  exactKeys(binding, BINDING_FIELDS, "VAULT_OPERATION_BINDING_INVALID", "server operation binding");
  if (binding.schema_version !== VAULT_OPERATION_SCHEMA_VERSION) {
    fail("VAULT_OPERATION_BINDING_INVALID", "server operation binding schema is invalid");
  }
  const expected = createVaultOperationBinding({
    principal: { tenant_id: binding.tenant_id, user_id: binding.actor_id },
    operation_kind: binding.operation_kind,
    server_nonce_sha256: binding.server_nonce_sha256,
    source_ref_sha256: binding.source_ref_sha256,
    target_ref_sha256: binding.target_ref_sha256,
    resolved_resource: binding.resolved_resource,
  });
  if (!isDeepStrictEqual(binding, expected)) {
    fail("VAULT_OPERATION_BINDING_INVALID", "server operation binding material is inconsistent", 409);
  }
  return true;
}

function decisionForStage(stage) {
  if (stage === "blocked") return "deny";
  if (stage === "failed") return "error";
  if (stage === "cancelled") return "cancelled";
  return "allow";
}

function exactVersionForReceipt(binding, supplied, stage) {
  const requested = binding.resolved_resource.exact_version;
  if (SAVE_KINDS.has(binding.operation_kind)
      && supplied != null
      && !SAVE_EXACT_VERSION_STAGES.has(stage)) {
    fail(
      "VAULT_OPERATION_EXACT_VERSION_PREMATURE",
      "a save operation cannot expose an exact Vault version before promotion",
      409,
    );
  }
  const exactVersion = normalizedExactVersion(supplied ?? requested, {
    required: SUCCESS_IDENTITY_STAGES.has(stage)
      || (stage === "authorized" && EXACT_VERSION_REQUIRED_KINDS.has(binding.operation_kind)),
  });
  if (requested && !isDeepStrictEqual(requested, exactVersion)) {
    fail("VAULT_OPERATION_EXACT_VERSION_MISMATCH", "exact Vault version differs from the operation binding", 409);
  }
  return exactVersion;
}

export function createVaultOperationReceipt({
  binding,
  stage,
  occurred_at: occurredAt,
  lawos_event_id: lawosEventId,
  vault_event_id: vaultEventId = null,
  authority_ref: authorityRef = null,
  safe_reason_code: safeReasonCode = null,
  exact_version: suppliedExactVersion = null,
} = {}) {
  assertVaultOperationBinding(binding);
  if (!VAULT_OPERATION_STAGES.includes(stage)) {
    fail("VAULT_OPERATION_INPUT_INVALID", "operation receipt stage is invalid");
  }
  const decision = decisionForStage(stage);
  if (FAILURE_STAGES.has(stage)) {
    requiredId(safeReasonCode, "safe_reason_code");
  } else if (safeReasonCode != null) {
    fail("VAULT_OPERATION_INPUT_INVALID", "successful stages cannot carry an error code");
  }
  const exactVersion = exactVersionForReceipt(binding, suppliedExactVersion, stage);
  const timestamp = strictInstant(occurredAt, "occurred_at");
  const eventId = requiredId(lawosEventId, "lawos_event_id");
  const vaultEvent = optionalId(vaultEventId, "vault_event_id");
  if (VAULT_AUTHORITY_STAGES.has(stage) && (authorityRef == null || vaultEvent == null)) {
    fail(
      "VAULT_OPERATION_AUTHORITY_REF_REQUIRED",
      "successful Vault authority stages require authority and Vault audit references",
    );
  }
  if (authorityRef != null) {
    const safeAuthorityRef = requiredId(authorityRef, "authority_ref");
    assertNoVaultBoundarySecrets({ authority_reference: safeAuthorityRef });
  }
  const authorityRefSha256 = authorityRef == null
    ? null
    : hashDomainValue({ authority_ref: authorityRef });
  const receiptMaterial = {
    operation_id: binding.operation_id,
    stage,
    occurred_at: timestamp,
    lawos_event_id: eventId,
    vault_event_id: vaultEvent,
    authority_ref_sha256: authorityRefSha256,
    safe_reason_code: safeReasonCode,
    exact_version: exactVersion,
  };
  const receipt = deepFreeze({
    schema_version: VAULT_OPERATION_RECEIPT_SCHEMA_VERSION,
    receipt_id: `vaultreceipt_${hashDomainValue(receiptMaterial).slice(0, 32)}`,
    operation_id: binding.operation_id,
    correlation_id: binding.correlation_id,
    operation_kind: binding.operation_kind,
    stage,
    decision,
    safe_reason_code: safeReasonCode,
    occurred_at: timestamp,
    request_fingerprint: binding.request_fingerprint,
    idempotency_key_sha256: binding.idempotency_key_sha256,
    tenant_ref_sha256: binding.tenant_ref_sha256,
    actor_ref_sha256: binding.actor_ref_sha256,
    matter_id: binding.resolved_resource.matter_id,
    installation_ref_sha256: binding.resolved_resource.installation_ref_sha256,
    compose_target_sha256: binding.resolved_resource.compose_target_sha256,
    exact_version: exactVersion,
    lawos_event_id: eventId,
    vault_event_id: vaultEvent,
    authority_ref_sha256: authorityRefSha256,
    raw_path_included: false,
    token_material_included: false,
    storage_locator_included: false,
    mail_pii_included: false,
    raw_bytes_included: false,
    production_ready_claim: false,
  });
  assertVaultOperationReceipt(receipt, { binding });
  return receipt;
}

export function assertVaultOperationReceipt(receipt, { binding } = {}) {
  exactKeys(receipt, RECEIPT_FIELDS, "VAULT_OPERATION_RECEIPT_INVALID", "operation receipt");
  if (receipt.schema_version !== VAULT_OPERATION_RECEIPT_SCHEMA_VERSION) {
    fail("VAULT_OPERATION_RECEIPT_INVALID", "operation receipt schema is invalid");
  }
  requiredId(receipt.receipt_id, "receipt_id");
  requiredId(receipt.operation_id, "operation_id");
  requiredId(receipt.correlation_id, "correlation_id");
  if (!VAULT_OPERATION_KINDS.includes(receipt.operation_kind)) {
    fail("VAULT_OPERATION_RECEIPT_INVALID", "operation receipt kind is invalid");
  }
  if (!VAULT_OPERATION_STAGES.includes(receipt.stage)) {
    fail("VAULT_OPERATION_RECEIPT_INVALID", "operation receipt stage is invalid");
  }
  if (receipt.decision !== decisionForStage(receipt.stage)) {
    fail("VAULT_OPERATION_RECEIPT_INVALID", "operation receipt decision is invalid");
  }
  if (FAILURE_STAGES.has(receipt.stage)) requiredId(receipt.safe_reason_code, "safe_reason_code");
  else if (receipt.safe_reason_code != null) fail("VAULT_OPERATION_RECEIPT_INVALID", "receipt error code is invalid");
  strictInstant(receipt.occurred_at, "occurred_at");
  for (const field of [
    "request_fingerprint", "idempotency_key_sha256", "tenant_ref_sha256", "actor_ref_sha256",
  ]) requiredSha256(receipt[field], field);
  optionalSha256(receipt.installation_ref_sha256, "installation_ref_sha256");
  optionalSha256(receipt.compose_target_sha256, "compose_target_sha256");
  optionalSha256(receipt.authority_ref_sha256, "authority_ref_sha256");
  requiredId(receipt.matter_id, "matter_id");
  requiredId(receipt.lawos_event_id, "lawos_event_id");
  optionalId(receipt.vault_event_id, "vault_event_id");
  if (VAULT_AUTHORITY_STAGES.has(receipt.stage)
      && (receipt.authority_ref_sha256 == null || receipt.vault_event_id == null)) {
    fail("VAULT_OPERATION_RECEIPT_INVALID", "receipt is missing Vault authority trace references");
  }
  normalizedExactVersion(receipt.exact_version, {
    required: SUCCESS_IDENTITY_STAGES.has(receipt.stage)
      || (receipt.stage === "authorized" && EXACT_VERSION_REQUIRED_KINDS.has(receipt.operation_kind)),
  });
  if (SAVE_KINDS.has(receipt.operation_kind)
      && receipt.exact_version != null
      && !SAVE_EXACT_VERSION_STAGES.has(receipt.stage)) {
    fail(
      "VAULT_OPERATION_RECEIPT_INVALID",
      "save receipt exact version is premature",
    );
  }
  for (const field of [
    "raw_path_included", "token_material_included", "storage_locator_included",
    "mail_pii_included", "raw_bytes_included", "production_ready_claim",
  ]) {
    if (receipt[field] !== false) fail("VAULT_OPERATION_RECEIPT_INVALID", `${field} must remain false`);
  }
  assertNoVaultBoundarySecrets(receipt, { profile: "receipt" });
  assertNoDmsPersistedSecrets(receipt, "vault_operation_receipt");
  const expectedReceiptId = `vaultreceipt_${hashDomainValue({
    operation_id: receipt.operation_id,
    stage: receipt.stage,
    occurred_at: receipt.occurred_at,
    lawos_event_id: receipt.lawos_event_id,
    vault_event_id: receipt.vault_event_id,
    authority_ref_sha256: receipt.authority_ref_sha256,
    safe_reason_code: receipt.safe_reason_code,
    exact_version: receipt.exact_version,
  }).slice(0, 32)}`;
  if (receipt.receipt_id !== expectedReceiptId) {
    fail("VAULT_OPERATION_RECEIPT_INVALID", "receipt identity does not match its immutable material");
  }
  if (binding) {
    assertVaultOperationBinding(binding);
    const expected = {
      operation_id: binding.operation_id,
      correlation_id: binding.correlation_id,
      operation_kind: binding.operation_kind,
      request_fingerprint: binding.request_fingerprint,
      idempotency_key_sha256: binding.idempotency_key_sha256,
      tenant_ref_sha256: binding.tenant_ref_sha256,
      actor_ref_sha256: binding.actor_ref_sha256,
      matter_id: binding.resolved_resource.matter_id,
      installation_ref_sha256: binding.resolved_resource.installation_ref_sha256,
      compose_target_sha256: binding.resolved_resource.compose_target_sha256,
    };
    for (const [field, value] of Object.entries(expected)) {
      if (receipt[field] !== value) {
        fail("VAULT_OPERATION_RECEIPT_MISMATCH", `operation receipt ${field} is mismatched`, 409);
      }
    }
    if (binding.resolved_resource.exact_version
        && !isDeepStrictEqual(binding.resolved_resource.exact_version, receipt.exact_version)) {
      fail("VAULT_OPERATION_EXACT_VERSION_MISMATCH", "receipt exact version is mismatched", 409);
    }
  }
  return true;
}

export function classifyVaultOperationReplay({ binding, existing = null } = {}) {
  assertVaultOperationBinding(binding);
  if (existing == null) {
    return Object.freeze({ outcome: "new_operation", should_execute: true, receipt: null });
  }
  if (!isRecord(existing)) fail("VAULT_OPERATION_RECEIPT_INVALID", "idempotency receipt is invalid", 500);
  if (
    existing.idempotency_key_sha256 !== binding.idempotency_key_sha256
    || existing.request_fingerprint !== binding.request_fingerprint
  ) {
    fail("VAULT_OPERATION_IDEMPOTENCY_CONFLICT", "idempotency key was reused for different material", 409);
  }
  assertVaultOperationReceipt(existing.receipt, { binding });
  return Object.freeze({
    outcome: "idempotent_replay",
    should_execute: false,
    receipt: existing.receipt,
  });
}

function sameReceiptBinding(previous, next) {
  return [
    "operation_id", "correlation_id", "operation_kind", "request_fingerprint",
    "idempotency_key_sha256", "tenant_ref_sha256", "actor_ref_sha256", "matter_id",
    "installation_ref_sha256", "compose_target_sha256",
  ].every((field) => previous[field] === next[field]);
}

export function classifyVaultOperationReceiptTransition({ previous = null, next } = {}) {
  assertVaultOperationReceipt(next);
  if (previous == null) {
    if (next.stage !== "requested") {
      fail("VAULT_OPERATION_TRANSITION_INVALID", "the first receipt stage must be requested", 409);
    }
    return Object.freeze({ outcome: "append", should_append: true });
  }
  assertVaultOperationReceipt(previous);
  if (isDeepStrictEqual(previous, next)) {
    return Object.freeze({ outcome: "exact_replay", should_append: false });
  }
  if (previous.receipt_id === next.receipt_id) {
    fail("VAULT_OPERATION_RECEIPT_CONFLICT", "receipt identity was reused for different material", 409);
  }
  if (!sameReceiptBinding(previous, next)) {
    fail("VAULT_OPERATION_RECEIPT_MISMATCH", "receipt binding changed during an operation", 409);
  }
  if (previous.exact_version && !isDeepStrictEqual(previous.exact_version, next.exact_version)) {
    fail("VAULT_OPERATION_EXACT_VERSION_MISMATCH", "exact version changed during an operation", 409);
  }
  if (previous.exact_version && !next.exact_version) {
    fail("VAULT_OPERATION_EXACT_VERSION_MISMATCH", "exact version was removed during an operation", 409);
  }
  if (previous.stage === "cleaned") {
    fail("VAULT_OPERATION_TRANSITION_INVALID", "a cleaned operation is immutable", 409);
  }
  if (FAILURE_STAGES.has(previous.stage)) {
    if (next.stage !== "cleaned") {
      fail("VAULT_OPERATION_TRANSITION_INVALID", "a failed operation may only append cleanup", 409);
    }
    return Object.freeze({ outcome: "append", should_append: true });
  }
  if (next.stage === "cleaned") {
    if (!TERMINAL_STAGES.has(previous.stage)) {
      fail("VAULT_OPERATION_TRANSITION_INVALID", "cleanup requires a terminal operation stage", 409);
    }
    return Object.freeze({ outcome: "append", should_append: true });
  }
  if (FAILURE_STAGES.has(next.stage)) {
    return Object.freeze({ outcome: "append", should_append: true });
  }
  const flow = FLOW[previous.operation_kind];
  const previousIndex = flow.indexOf(previous.stage);
  if (previousIndex === -1 || flow[previousIndex + 1] !== next.stage) {
    fail("VAULT_OPERATION_TRANSITION_INVALID", "operation receipt stage skipped or regressed", 409);
  }
  return Object.freeze({ outcome: "append", should_append: true });
}

export function createVaultOperationAuditEvent({ binding, receipt } = {}) {
  assertVaultOperationReceipt(receipt, { binding });
  const decision = receipt.decision === "allow" ? "allow"
    : receipt.decision === "deny" ? "deny"
      : "blocked";
  return createDmsAuditEvent({
    event_id: receipt.lawos_event_id,
    tenant_id: binding.tenant_id,
    actor_id: binding.actor_id,
    action: `amic_os_vault.${binding.operation_kind}.${receipt.stage}`,
    object_type: "VaultOperation",
    object_id: binding.operation_id,
    decision,
    reason: receipt.safe_reason_code ?? "VAULT_OPERATION_STAGE_RECORDED",
    occurred_at: receipt.occurred_at,
    before: {},
    after: {
      stage: receipt.stage,
      exact_version: receipt.exact_version,
    },
    metadata: {
      receipt_id: receipt.receipt_id,
      correlation_id: receipt.correlation_id,
      request_fingerprint: receipt.request_fingerprint,
      idempotency_key_sha256: receipt.idempotency_key_sha256,
      tenant_ref_sha256: receipt.tenant_ref_sha256,
      actor_ref_sha256: receipt.actor_ref_sha256,
      matter_id: receipt.matter_id,
      installation_ref_sha256: receipt.installation_ref_sha256,
      compose_target_sha256: receipt.compose_target_sha256,
      vault_event_id: receipt.vault_event_id,
      authority_ref_sha256: receipt.authority_ref_sha256,
      raw_path_included: false,
      token_material_included: false,
      storage_locator_included: false,
      mail_pii_included: false,
      raw_bytes_included: false,
    },
  });
}
