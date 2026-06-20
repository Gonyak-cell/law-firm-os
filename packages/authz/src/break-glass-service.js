import { createTrustRuntimeStore, writeTrustRecord } from "./trust-runtime-store.js";

export function createBreakGlassService(options = {}) {
  const store = createTrustRuntimeStore({ ...options, store_kind: "break-glass-service" });
  return Object.freeze({
    ...store,
    requestBreakGlass({ request, actor_id, idempotency_key } = {}) {
      if (!request?.tenant_id || !request?.break_glass_id || !request?.reason || request.approval_required !== true) throw new Error("break-glass requires tenant, id, reason, and approval");
      return writeTrustRecord({ store, actor_id, idempotency_key, action: "break_glass.request", record: { ...request, record_type: "BreakGlassRequest", record_id: request.break_glass_id, status: request.status ?? "approval_required" } });
    },
  });
}
