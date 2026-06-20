import { createTrustRuntimeStore, writeTrustRecord } from "./trust-runtime-store.js";

export function createObjectAclStore(options = {}) {
  const store = createTrustRuntimeStore({ ...options, store_kind: "object-acl-store" });
  return Object.freeze({
    ...store,
    saveObjectAcl({ acl, actor_id, idempotency_key } = {}) {
      if (!acl?.tenant_id || !acl?.acl_id || !acl?.resource_id) throw new Error("object ACL tenant, id, and resource are required");
      return writeTrustRecord({ store, actor_id, idempotency_key, action: "object_acl.save", record: { ...acl, record_type: "ObjectAcl", record_id: acl.acl_id } });
    },
  });
}
