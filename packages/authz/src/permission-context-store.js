import { createTrustRuntimeStore, writeTrustRecord } from "./trust-runtime-store.js";

export function createPermissionContextStore(options = {}) {
  const store = createTrustRuntimeStore({ ...options, store_kind: "permission-context-store" });
  return Object.freeze({
    ...store,
    savePermissionContext({ context, actor_id, idempotency_key } = {}) {
      if (!context?.principal?.tenant_id) throw new Error("permission context tenant is required");
      return writeTrustRecord({
        store,
        actor_id,
        idempotency_key,
        action: "permission_context.save",
        record: {
          tenant_id: context.principal.tenant_id,
          record_type: "PermissionContext",
          record_id: context.context_id,
          principal: context.principal,
          rules: context.rules ?? [],
          object_acl: context.object_acl ?? [],
        },
      });
    },
  });
}
