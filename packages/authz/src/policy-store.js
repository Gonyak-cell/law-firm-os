import { createTrustRuntimeStore, writeTrustRecord } from "./trust-runtime-store.js";

export function createPolicyStore(options = {}) {
  const store = createTrustRuntimeStore({ ...options, store_kind: "policy-store" });
  return Object.freeze({
    ...store,
    savePolicy({ policy, actor_id, idempotency_key } = {}) {
      if (!policy?.tenant_id || !policy?.policy_id) throw new Error("policy tenant and id are required");
      return writeTrustRecord({ store, actor_id, idempotency_key, action: "policy.save", record: { ...policy, record_type: "Policy", record_id: policy.policy_id } });
    },
  });
}
