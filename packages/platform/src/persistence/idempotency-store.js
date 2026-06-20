import { createTrustRuntimeStore } from "../../../authz/src/trust-runtime-store.js";

export function createIdempotencyStore(options = {}) {
  const store = createTrustRuntimeStore({ ...options, store_kind: "idempotency-store" });
  return Object.freeze({
    durable: store.durable,
    save(entry = {}) {
      if (!entry.tenant_id || !entry.idempotency_key) throw new Error("idempotency tenant and key are required");
      return store.recordIdempotency(entry);
    },
    get(ref = {}) {
      return store.getIdempotency(ref);
    },
  });
}
