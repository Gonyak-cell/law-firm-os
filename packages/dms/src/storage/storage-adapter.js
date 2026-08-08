import { createHash } from "node:crypto";

export {
  DMS_STORAGE_OBJECT_TOO_LARGE,
  abortStorageBody,
  cleanupStorageBody,
  readStorageBodyBounded,
  safelyRunStorageCleanup,
  storageObjectTooLargeError,
  storageReadLimit,
} from "./bounded-storage-read.js";

export const DMS_STORAGE_ADAPTER_CONTRACT_VERSION = "law-firm-os.dms-storage.v3";
export const DMS_STAGED_STORAGE_METHODS = Object.freeze([
  "stageObject",
  "statStagedObject",
  "finalizeObject",
  "deleteOrphan",
  "digestObject",
  "deleteCommittedObject",
]);
export const DMS_STORAGE_CAPABILITY_FIELDS = Object.freeze([
  "staged_uploads",
  "digest_verification",
  "orphan_cleanup",
  "provider_retention",
  "conditional_delete",
]);

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function requiredIdentifier(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  const normalized = value.trim();
  const namespaceIdentifier = field === "tenant_id" || field === "adapter_id";
  const traversalSegment = normalized.split(/[\\/]/u).includes("..");
  if (normalized.length > 512 || /[\u0000-\u001f\u007f]/u.test(normalized)
      || (namespaceIdentifier && (/[\\/]/u.test(normalized) || normalized.includes("..")))
      || (!namespaceIdentifier && traversalSegment)) {
    throw new TypeError(`${field} is invalid`);
  }
  return normalized;
}

export function assertTenantId(value) {
  return requiredIdentifier(value, "tenant_id");
}

export function createOpaqueStorageKey({ tenant_id, object_id, session_id } = {}) {
  const tenantId = assertTenantId(tenant_id);
  const objectId = requiredIdentifier(object_id, "object_id");
  const parts = session_id === undefined
    ? ["committed", tenantId, objectId]
    : ["staged", tenantId, requiredIdentifier(session_id, "session_id"), objectId];
  return createHash("sha256").update(parts.join("\u0000")).digest("hex");
}

export function assertStorageAdapter(adapter) {
  for (const method of ["putObject", "getObject", "statObject"]) {
    if (typeof adapter?.[method] !== "function") throw new TypeError(`storage adapter missing ${method}`);
  }
  return adapter;
}

export function assertBoundedStorageReader(adapter) {
  assertStorageAdapter(adapter);
  if (typeof adapter?.readObjectBounded !== "function") {
    throw new TypeError("storage adapter missing readObjectBounded");
  }
  return adapter;
}

export function assertStagedStorageAdapter(adapter) {
  assertStorageAdapter(adapter);
  for (const method of DMS_STAGED_STORAGE_METHODS) {
    if (typeof adapter?.[method] !== "function") throw new TypeError(`storage adapter missing ${method}`);
  }
  if (adapter.contract_version !== DMS_STORAGE_ADAPTER_CONTRACT_VERSION) {
    throw new TypeError("storage adapter contract_version is not supported");
  }
  for (const capability of DMS_STORAGE_CAPABILITY_FIELDS) {
    if (typeof adapter.capabilities?.[capability] !== "boolean") {
      throw new TypeError(`storage adapter must declare ${capability} capability`);
    }
  }
  return adapter;
}

export function createStoragePointerRef({ adapter_id, tenant_id, object_id } = {}) {
  const adapterId = requiredIdentifier(adapter_id, "adapter_id");
  return `vault://${adapterId}/${createOpaqueStorageKey({ tenant_id, object_id })}`;
}

export function createStagingPointerRef({ adapter_id, tenant_id, session_id, object_id } = {}) {
  const adapterId = requiredIdentifier(adapter_id, "adapter_id");
  return `vault-stage://${adapterId}/${createOpaqueStorageKey({ tenant_id, session_id, object_id })}`;
}

export function createStorageReceipt({ adapter_id, tenant_id, object_id, bytes, content_type } = {}) {
  const tenantId = assertTenantId(tenant_id);
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes ?? ""));
  return Object.freeze({
    adapter_id,
    tenant_id: tenantId,
    object_id,
    storage_pointer_ref: createStoragePointerRef({ adapter_id, tenant_id: tenantId, object_id }),
    sha256: sha256Hex(buffer),
    byte_size: buffer.byteLength,
    mime_type: content_type ?? "application/octet-stream",
    raw_path_exposed: false,
    bytes_exposed: false,
  });
}

export function createStagingReceipt({ adapter_id, tenant_id, session_id, object_id, bytes, content_type } = {}) {
  const receipt = createStorageReceipt({ adapter_id, tenant_id, object_id, bytes, content_type });
  return Object.freeze({
    ...receipt,
    stage_pointer_ref: createStagingPointerRef({ adapter_id, tenant_id, session_id, object_id }),
    storage_pointer_ref: null,
    state: "staged",
  });
}
