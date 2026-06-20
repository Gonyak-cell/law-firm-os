import { createHash } from "node:crypto";

export function sha256Hex(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

export function assertStorageAdapter(adapter) {
  for (const method of ["putObject", "getObject", "statObject"]) {
    if (typeof adapter?.[method] !== "function") throw new TypeError(`storage adapter missing ${method}`);
  }
  return adapter;
}

export function createStoragePointerRef({ adapter_id, object_id } = {}) {
  if (!adapter_id) throw new TypeError("adapter_id is required");
  if (!object_id) throw new TypeError("object_id is required");
  return `vault://${adapter_id}/${object_id}`;
}

export function createStorageReceipt({ adapter_id, object_id, bytes, content_type } = {}) {
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(String(bytes ?? ""));
  return Object.freeze({
    adapter_id,
    object_id,
    storage_pointer_ref: createStoragePointerRef({ adapter_id, object_id }),
    sha256: sha256Hex(buffer),
    byte_size: buffer.byteLength,
    mime_type: content_type ?? "application/octet-stream",
    raw_path_exposed: false,
    bytes_exposed: false,
  });
}
