import { createTrustRuntimeStore, writeTrustRecord } from "./trust-runtime-store.js";

export function createEthicalWallStore(options = {}) {
  const store = createTrustRuntimeStore({ ...options, store_kind: "ethical-wall-store" });
  return Object.freeze({
    ...store,
    saveEthicalWall({ wall, actor_id, idempotency_key } = {}) {
      if (!wall?.tenant_id || !wall?.ethical_wall_id || !Array.isArray(wall.restricted_principal_ids)) throw new Error("ethical wall tenant, id, and restricted principals are required");
      return writeTrustRecord({ store, actor_id, idempotency_key, action: "ethical_wall.save", record: { ...wall, record_type: "EthicalWall", record_id: wall.ethical_wall_id } });
    },
  });
}
