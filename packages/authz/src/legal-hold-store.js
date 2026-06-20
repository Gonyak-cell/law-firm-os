import { createTrustRuntimeStore, writeTrustRecord } from "./trust-runtime-store.js";

export function createLegalHoldStore(options = {}) {
  const store = createTrustRuntimeStore({ ...options, store_kind: "legal-hold-store" });
  return Object.freeze({
    ...store,
    saveLegalHold({ hold, actor_id, idempotency_key } = {}) {
      if (!hold?.tenant_id || !hold?.legal_hold_id || !hold?.matter_id) throw new Error("legal hold tenant, id, and matter are required");
      return writeTrustRecord({ store, actor_id, idempotency_key, action: "legal_hold.save", record: { ...hold, record_type: "LegalHold", record_id: hold.legal_hold_id } });
    },
  });
}
