import { randomUUID } from "node:crypto";

export async function appendHrxRouteAudit({ store, context, route, action, object, decision }) {
  if (!store || typeof store.append !== "function") throw new TypeError("HRX audit store append port is required");
  if (!context?.tenant_id) throw new TypeError("HRX audit context tenant_id is required");
  if (!context?.actor_id) throw new TypeError("HRX audit context actor_id is required");
  const effect = decision?.effect ?? "deny";
  return store.append({
    event_id: `hrx_evt_${randomUUID()}`,
    tenant_id: context.tenant_id,
    actor_id: context.actor_id,
    action,
    object_type: object?.object_type ?? "HRXObject",
    object_id: object?.object_id ?? "unknown",
    decision: effect,
    reason: decision?.reason ?? "hrx_route_decision",
    source: route ?? "hrx-api-route",
    metadata: {
      route,
      actor_role: context.actor_role ?? null,
    },
  });
}
