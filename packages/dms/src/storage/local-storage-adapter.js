import {
  DMS_STORAGE_ADAPTER_CONTRACT_VERSION,
  assertTenantId,
  createOpaqueStorageKey,
  createStagingReceipt,
  createStorageReceipt,
  sha256Hex,
} from "./storage-adapter.js";

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

export function createLocalStorageAdapter({ adapter_id = "local-vault" } = {}) {
  const objects = new Map();
  const stagedObjects = new Map();
  const capabilities = Object.freeze({
    staged_uploads: true,
    digest_verification: true,
    orphan_cleanup: true,
    provider_retention: false,
    conditional_delete: true,
  });
  function stageObject({ tenant_id, session_id, object_id, bytes, content_type, expected_sha256 } = {}) {
    const tenantId = assertTenantId(tenant_id);
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
    const entry = stagedObjects.get(stagedKey(assertTenantId(tenant_id), session_id, object_id));
    return entry ? Object.freeze({ ...entry.receipt }) : null;
  }
  function finalizeObject({ tenant_id, session_id, object_id } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = required(object_id, "object_id");
    const key = stagedKey(tenantId, session_id, safeObjectId);
    const committedKey = objectKey(tenantId, safeObjectId);
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
  function quarantineCommittedObject({ tenant_id, object_id, expected_sha256 } = {}) {
    const tenantId = assertTenantId(tenant_id);
    const safeObjectId = required(object_id, "object_id");
    const key = objectKey(tenantId, safeObjectId);
    const current = objects.get(key);
    if (!current) return Object.freeze({ quarantined: false, already_absent: true, provider_delete_replayed: true });
    if (required(expected_sha256, "expected_sha256") !== current.receipt.sha256) {
      throw hashMismatch("committed object digest changed before quarantine", "DMS_COMMITTED_DELETE_CONDITION_FAILED");
    }
    objects.delete(key);
    return Object.freeze({ quarantined: true, already_absent: false, provider_delete_replayed: false, sha256: current.receipt.sha256 });
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
    stageObject,
    statStagedObject,
    finalizeObject,
    deleteOrphan,
    quarantineCommittedObject,
    deleteCommittedObject,
    digestObject({ tenant_id, session_id, object_id } = {}) {
      const tenantId = assertTenantId(tenant_id);
      const entry = session_id
        ? stagedObjects.get(stagedKey(tenantId, session_id, object_id))
        : objects.get(objectKey(tenantId, required(object_id, "object_id")));
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
      const entry = objects.get(objectKey(tenantId, safeObjectId));
      if (!entry) throw new Error(`object not found: ${safeObjectId}`);
      return Object.freeze({
        object_id: safeObjectId,
        bytes: Buffer.from(entry.buffer),
        sha256: entry.receipt.sha256,
      });
    },
    statObject({ tenant_id, object_id } = {}) {
      const entry = objects.get(objectKey(assertTenantId(tenant_id), required(object_id, "object_id")));
      if (!entry) return null;
      return Object.freeze({ ...entry.receipt });
    },
  });
}
