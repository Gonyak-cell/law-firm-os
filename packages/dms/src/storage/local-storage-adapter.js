import {
  DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
  assertTenantId,
  createOpaqueStorageKey,
  createStagingReceipt,
  createStorageReceipt,
  sha256Hex,
} from "./storage-adapter.js";
import {
  assertQuarantineRecord,
  createQuarantineRecord,
} from "./quarantine-record.js";

function required(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function stagedKey(tenant_id, session_id, object_id) {
  return createOpaqueStorageKey({ tenant_id, session_id, object_id });
}

function objectKey(tenant_id, object_id) {
  return createOpaqueStorageKey({ tenant_id, object_id });
}

function bufferFrom(bytes) {
  return Buffer.isBuffer(bytes) ? Buffer.from(bytes) : Buffer.from(String(bytes ?? ""));
}

function hashMismatch(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

export function createLocalStorageAdapter({ adapter_id = "local-vault", quarantineStore } = {}) {
  const objects = new Map();
  const stagedObjects = new Map();
  const quarantineRecords = quarantineStore ?? new Map();
  if (!(quarantineRecords instanceof Map)) throw new TypeError("quarantineStore must be a Map");
  const capabilities = Object.freeze({
    staged_uploads: true,
    digest_verification: true,
    orphan_cleanup: true,
    provider_retention: false,
    conditional_delete: true,
  });
  function stageObject({ tenant_id, session_id, object_id, bytes, content_type, expected_sha256 } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = required(object_id, "object_id");
    if (quarantineRecords.has(objectKey(tenantId, safeObjectId))) throw hashMismatch("committed object is quarantined", "DMS_COMMITTED_OBJECT_QUARANTINED");
    const key = stagedKey(tenantId, session_id, object_id);
    const buffer = bufferFrom(bytes);
    const actualSha256 = sha256Hex(buffer);
    if (expected_sha256 && expected_sha256 !== actualSha256) {
      throw hashMismatch("staged object digest does not match expected digest", "DMS_STAGED_DIGEST_MISMATCH");
    }
    const prior = stagedObjects.get(key);
    if (prior && prior.receipt.sha256 !== actualSha256) {
      throw hashMismatch("upload session already staged different bytes", "DMS_STAGE_IDEMPOTENCY_CONFLICT");
    }
    if (prior) return prior.receipt;
    const receipt = createStagingReceipt({ adapter_id, tenant_id: tenantId, session_id, object_id, bytes: buffer, content_type });
    stagedObjects.set(key, { buffer, receipt });
    return receipt;
  }
  function statStagedObject({ tenant_id, session_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = required(object_id, "object_id");
    if (quarantineRecords.has(objectKey(tenantId, safeObjectId))) throw hashMismatch("committed object is quarantined", "DMS_COMMITTED_OBJECT_QUARANTINED");
    const entry = stagedObjects.get(stagedKey(tenantId, session_id, safeObjectId));
    return entry ? Object.freeze({ ...entry.receipt }) : null;
  }
  function finalizeObject({ tenant_id, session_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = required(object_id, "object_id");
    const key = stagedKey(tenantId, session_id, safeObjectId);
    const committedKey = objectKey(tenantId, safeObjectId);
    if (quarantineRecords.has(committedKey)) throw hashMismatch("committed object is quarantined", "DMS_COMMITTED_OBJECT_QUARANTINED");
    const staged = stagedObjects.get(key);
    const current = objects.get(committedKey);
    if (!staged) {
      if (current) return Object.freeze({ ...current.receipt });
      throw new Error(`staged object not found: ${safeObjectId}`);
    }
    if (current && current.receipt.sha256 !== staged.receipt.sha256) {
      throw hashMismatch("committed object has a different digest", "DMS_FINALIZE_CONFLICT");
    }
    const receipt = current?.receipt ?? createStorageReceipt({
      adapter_id,
      tenant_id: tenantId,
      object_id: safeObjectId,
      bytes: staged.buffer,
      content_type: staged.receipt.mime_type,
    });
    objects.set(committedKey, { buffer: Buffer.from(staged.buffer), receipt });
    stagedObjects.delete(key);
    return receipt;
  }
  function deleteOrphan({ tenant_id, session_id, object_id } = {}) {
    const key = stagedKey(assertTenantId(tenant_id), session_id, object_id);
    return Object.freeze({ deleted: stagedObjects.delete(key), committed_object_deleted: false });
  }
  function recordCommittedObjectQuarantine({ tenant_id, object_id, expected_sha256, reason, audit_trace_id, permission_envelope_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = required(object_id, "object_id");
    const key = objectKey(tenantId, safeObjectId);
    const existing = quarantineRecords.get(key);
    if (existing) {
      assertQuarantineRecord(existing, { adapter_id, tenant_id: tenantId, object_id: safeObjectId, expected_sha256 });
      if (existing.state === "quarantined") return Object.freeze({ ...existing, recorded: false, already_recorded: true, durable_quarantine: true });
      const record = createQuarantineRecord({ adapter_id, tenant_id: tenantId, object_id: safeObjectId, expected_sha256, reason, audit_trace_id: audit_trace_id ?? existing.audit_trace_id, permission_envelope_id: permission_envelope_id ?? existing.permission_envelope_id, state: "quarantined" });
      quarantineRecords.set(key, record);
      return Object.freeze({ ...record, recorded: true, already_recorded: false, durable_quarantine: true });
    }
    const current = objects.get(key);
    if (current && required(expected_sha256, "expected_sha256") !== current.receipt.sha256) {
      throw hashMismatch("committed object digest changed before quarantine record", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
    }
    const record = createQuarantineRecord({ adapter_id, tenant_id: tenantId, object_id: safeObjectId, expected_sha256, reason, audit_trace_id, permission_envelope_id });
    quarantineRecords.set(key, record);
    return Object.freeze({ ...record, recorded: true, already_recorded: false, durable_quarantine: true });
  }
  function armCommittedObjectQuarantine({ tenant_id, object_id, expected_sha256, audit_trace_id, permission_envelope_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = required(object_id, "object_id");
    const key = objectKey(tenantId, safeObjectId);
    const existing = quarantineRecords.get(key);
    if (existing) {
      assertQuarantineRecord(existing, { adapter_id, tenant_id: tenantId, object_id: safeObjectId, expected_sha256 });
      if (existing.state === "quarantined") return Object.freeze({ ...existing, already_armed: true, durable_quarantine: true });
      return Object.freeze({ ...existing, armed: true, already_armed: true, durable_quarantine: true });
    }
    const record = createQuarantineRecord({ adapter_id, tenant_id: tenantId, object_id: safeObjectId, expected_sha256, reason: "DMS_UPLOAD_DENY_INTENT", audit_trace_id, permission_envelope_id, state: "armed" });
    quarantineRecords.set(key, record);
    return Object.freeze({ ...record, armed: true, already_armed: false, durable_quarantine: true });
  }
  function clearCommittedObjectQuarantine({ tenant_id, object_id, expected_sha256 } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = required(object_id, "object_id");
    const key = objectKey(tenantId, safeObjectId);
    const record = quarantineRecords.get(key);
    if (!record) throw hashMismatch("committed object deny intent is missing", "DMS_COMMITTED_QUARANTINE_CLEAR_UNCONFIRMED");
    assertQuarantineRecord(record, { adapter_id, tenant_id: tenantId, object_id: safeObjectId, expected_sha256 });
    if (record.state !== "armed") throw hashMismatch("committed object quarantine cannot be cleared", "DMS_COMMITTED_QUARANTINE_CLEAR_BLOCKED");
    const current = objects.get(key);
    if (!current || current.receipt.sha256 !== record.expected_sha256) throw hashMismatch("committed object digest changed before deny clear", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
    quarantineRecords.delete(key);
    return Object.freeze({ cleared: true, record_ref: record.record_ref, durable_quarantine: false });
  }
  function quarantineCommittedObject({ tenant_id, object_id, expected_sha256, reason, audit_trace_id, permission_envelope_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = required(object_id, "object_id");
    const key = objectKey(tenantId, safeObjectId);
    const current = objects.get(key);
    if (current && required(expected_sha256, "expected_sha256") !== current.receipt.sha256) {
      throw hashMismatch("committed object digest changed before quarantine", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
    }
    const record = recordCommittedObjectQuarantine({ tenant_id: tenantId, object_id: safeObjectId, expected_sha256, reason, audit_trace_id, permission_envelope_id });
    const removed = objects.delete(key);
    return Object.freeze({ ...record, quarantined: removed, already_absent: !removed, provider_delete_replayed: !removed, sha256: record.expected_sha256 });
  }
  function deleteCommittedObject({ tenant_id, object_id, expected_sha256 } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = required(object_id, "object_id");
    const key = objectKey(tenantId, safeObjectId);
    const current = objects.get(key);
    if (!current) return Object.freeze({ deleted: false, already_absent: true, provider_delete_replayed: true });
    if (required(expected_sha256, "expected_sha256") !== current.receipt.sha256) {
      throw hashMismatch("committed object digest changed before delete", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
    }
    objects.delete(key);
    return Object.freeze({ deleted: true, already_absent: false, provider_delete_replayed: false, sha256: current.receipt.sha256 });
  }
  return Object.freeze({
    adapter_id,
    contract_version: DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
    capabilities,
    validateQuarantineAuthority() {
      return Object.freeze({ available: true, independent: true, durable: false });
    },
    stageObject,
    statStagedObject,
    finalizeObject,
    deleteOrphan,
    recordCommittedObjectQuarantine,
    armCommittedObjectQuarantine,
    clearCommittedObjectQuarantine,
    getCommittedObjectQuarantine({ tenant_id, object_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = required(object_id, "object_id");
      return quarantineRecords.get(objectKey(tenantId, safeObjectId)) ?? null;
    },
    quarantineCommittedObject,
    deleteCommittedObject,
    digestObject({ tenant_id, session_id, object_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = required(object_id, "object_id");
      if (quarantineRecords.has(objectKey(tenantId, safeObjectId))) throw hashMismatch("committed object is quarantined", "DMS_COMMITTED_OBJECT_QUARANTINED");
      const entry = session_id
        ? stagedObjects.get(stagedKey(tenantId, session_id, safeObjectId))
        : objects.get(objectKey(tenantId, safeObjectId));
      return entry ? Object.freeze({ sha256: sha256Hex(entry.buffer), byte_size: entry.buffer.byteLength }) : null;
    },
    putObject({ tenant_id, object_id, bytes, content_type } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = required(object_id, "object_id");
      const sessionId = `legacy:${safeObjectId}`;
      stageObject({ tenant_id: tenantId, session_id: sessionId, object_id: safeObjectId, bytes, content_type });
      return finalizeObject({ tenant_id: tenantId, session_id: sessionId, object_id: safeObjectId });
    },
    getObject({ tenant_id, object_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const safeObjectId = required(object_id, "object_id");
      const key = objectKey(tenantId, safeObjectId);
      if (quarantineRecords.has(key)) throw hashMismatch("committed object is quarantined", "DMS_COMMITTED_OBJECT_QUARANTINED");
      const entry = objects.get(key);
      if (!entry) throw new Error(`object not found: ${safeObjectId}`);
      return Object.freeze({
        object_id: safeObjectId,
        bytes: Buffer.from(entry.buffer),
        sha256: entry.receipt.sha256,
      });
    },
    statObject({ tenant_id, object_id } = {}) {
      const key = objectKey(assertTenantId(tenant_id), required(object_id, "object_id"));
      if (quarantineRecords.has(key)) return null;
      const entry = objects.get(key);
      if (!entry) return null;
      return Object.freeze({ ...entry.receipt });
    },
  });
}
