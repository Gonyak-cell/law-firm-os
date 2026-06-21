import { createHash } from "node:crypto";

function hashRequest(input) {
  return createHash("sha256").update(JSON.stringify(input ?? {})).digest("hex");
}

export function createIdempotencyService(connection) {
  if (!connection || typeof connection.select !== "function" || typeof connection.insert !== "function") {
    throw new TypeError("Runtime Spine persistence connection is required");
  }
  return Object.freeze({
    record({ tenant_id, key, request, result_ref } = {}) {
      const request_hash = hashRequest(request);
      const existing = connection.select("runtime_idempotency_keys", { tenant_id, key })[0];
      if (existing) {
        if (existing.request_hash !== request_hash) {
          throw new Error("idempotency key replayed with different request hash");
        }
        return Object.freeze({ replayed: true, record: existing });
      }
      const record = connection.insert("runtime_idempotency_keys", { tenant_id, key, request_hash, result_ref });
      return Object.freeze({ replayed: false, record });
    }
  });
}
