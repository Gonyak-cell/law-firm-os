import { createOpaqueStorageKey } from "./storage-adapter.js";

export const DMS_OBJECT_QUARANTINE_SCHEMA = "law-firm-os.dms-object-quarantine.v1";

function required(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optional(value, field) {
  if (value == null) return null;
  return required(value, field);
}

function safeReason(value) {
  const reason = required(value, "reason");
  if (!/^[A-Z0-9_]+$/u.test(reason)) throw new TypeError("reason is invalid");
  return reason;
}

export function quarantineRecordRef({ adapter_id, tenant_id, object_id } = {}) {
  return `quarantine://${required(adapter_id, "adapter_id")}/${createOpaqueStorageKey({ tenant_id, object_id })}`;
}

export function createQuarantineRecord({ adapter_id, tenant_id, object_id, expected_sha256, reason, audit_trace_id, permission_envelope_id, state = "quarantined" } = {}) {
  const digest = required(expected_sha256, "expected_sha256").toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new TypeError("expected_sha256 is invalid");
  const tenantId = required(tenant_id, "tenant_id");
  const objectId = required(object_id, "object_id");
  if (!new Set(["armed", "quarantined"]).has(state)) throw new TypeError("quarantine state is invalid");
  return Object.freeze({
    schema_version: DMS_OBJECT_QUARANTINE_SCHEMA,
    state,
    record_ref: quarantineRecordRef({ adapter_id, tenant_id: tenantId, object_id: objectId }),
    adapter_id: required(adapter_id, "adapter_id"),
    tenant_id: tenantId,
    object_id: objectId,
    expected_sha256: digest,
    reason: safeReason(reason ?? "DMS_COMMITTED_CLEANUP_FAILED"),
    audit_trace_id: optional(audit_trace_id, "audit_trace_id"),
    permission_envelope_id: optional(permission_envelope_id, "permission_envelope_id"),
    created_at: new Date().toISOString(),
  });
}

export function assertQuarantineRecord(record, { adapter_id, tenant_id, object_id, expected_sha256 } = {}) {
  if (!record || record.schema_version !== DMS_OBJECT_QUARANTINE_SCHEMA || !new Set(["armed", "quarantined"]).has(record.state)) {
    throw Object.assign(new Error("committed object quarantine record is invalid"), { code: "DMS_COMMITTED_QUARANTINE_INVALID" });
  }
  const expectedRef = quarantineRecordRef({ adapter_id, tenant_id, object_id });
  if (record.record_ref !== expectedRef || record.adapter_id !== adapter_id || record.tenant_id !== tenant_id || record.object_id !== object_id) {
    throw Object.assign(new Error("committed object quarantine binding is invalid"), { code: "DMS_COMMITTED_QUARANTINE_INVALID" });
  }
  const expectedDigest = required(expected_sha256, "expected_sha256").toLowerCase();
  if (record.expected_sha256 !== expectedDigest || !/^[a-f0-9]{64}$/u.test(record.expected_sha256)) {
    throw Object.assign(new Error("committed object quarantine digest is invalid"), { code: "DMS_COMMITTED_QUARANTINE_INVALID" });
  }
  return Object.freeze({ ...record });
}
