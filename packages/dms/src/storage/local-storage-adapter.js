import { createStorageReceipt } from "./storage-adapter.js";

export function createLocalStorageAdapter({ adapter_id = "local-vault" } = {}) {
  const objects = new Map();
  return Object.freeze({
    adapter_id,
    putObject({ object_id, bytes, content_type } = {}) {
      if (!object_id) throw new TypeError("object_id is required");
      const buffer = Buffer.isBuffer(bytes) ? Buffer.from(bytes) : Buffer.from(String(bytes ?? ""));
      const receipt = createStorageReceipt({ adapter_id, object_id, bytes: buffer, content_type });
      objects.set(object_id, { buffer, receipt });
      return receipt;
    },
    getObject({ object_id } = {}) {
      const entry = objects.get(object_id);
      if (!entry) throw new Error(`object not found: ${object_id}`);
      return Object.freeze({
        object_id,
        bytes: Buffer.from(entry.buffer),
        sha256: entry.receipt.sha256,
      });
    },
    statObject({ object_id } = {}) {
      const entry = objects.get(object_id);
      if (!entry) return null;
      return Object.freeze({ ...entry.receipt });
    },
  });
}
