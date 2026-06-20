const HRX_DOCUMENT_READ_SCOPES = Object.freeze(["hrx:documents:read", "hrx:people:admin"]);
const BLOCKED_STORAGE_FIELDS = Object.freeze(["raw_path", "storage_path", "local_path", "bucket", "key"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value.trim();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function hasHrxDocumentReadScope(principal = {}) {
  const scopes = Array.isArray(principal.scopes) ? principal.scopes : [];
  return HRX_DOCUMENT_READ_SCOPES.some((scope) => scopes.includes(scope));
}

export function createVaultObjectEnvelope(input = {}) {
  for (const field of BLOCKED_STORAGE_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`Vault envelope must not include ${field}`);
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    vault_object_id: requiredString(input, "vault_object_id"),
    document_id: requiredString(input, "document_id"),
    owning_context: requiredString(input, "owning_context"),
    content_hash: requiredString(input, "content_hash"),
    size_bytes: Number.isInteger(input.size_bytes) && input.size_bytes >= 0 ? input.size_bytes : 0,
    content_type: optionalString(input, "content_type"),
    storage_ref: requiredString(input, "storage_ref"),
    raw_storage_path_exposed: false,
  });
}

export function readHrxVaultEnvelope({ envelope, principal = {}, audit } = {}) {
  const record = createVaultObjectEnvelope(envelope);
  const allowed =
    record.owning_context === "HRX" &&
    principal.tenant_id === record.tenant_id &&
    hasHrxDocumentReadScope(principal);
  const auditEvent = {
    tenant_id: record.tenant_id,
    actor_id: principal.actor_id ?? null,
    action: "dms.vault.hrx_envelope.read",
    object_type: "VaultObject",
    object_id: record.vault_object_id,
    decision: allowed ? "allow" : "deny",
    reason: allowed ? "hrx_vault_envelope_read_allowed" : "hrx_vault_envelope_read_denied",
  };
  audit?.append?.(auditEvent);
  if (!allowed) {
    return Object.freeze({
      outcome: "blocked",
      safe_error_code: "DMS_HRX_VAULT_ENVELOPE_DENIED",
      audit_event: Object.freeze(auditEvent),
    });
  }
  const { storage_ref: _storageRef, ...safeEnvelope } = clone(record);
  return Object.freeze({
    outcome: "ok",
    envelope: Object.freeze({
      ...safeEnvelope,
      storage_ref_included: false,
      document_bytes_included: false,
    }),
    audit_event: Object.freeze(auditEvent),
  });
}
