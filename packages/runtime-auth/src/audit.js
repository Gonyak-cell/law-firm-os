import { appendOutboxEvent, createStableRuntimeId } from "../../persistence/src/index.js";

export function createAuthAuditEvent({ principal = {}, action = "authz.evaluate", decision = {}, request_id = "request_unset" } = {}) {
  const tenant_id = principal.tenant_id;
  const event_id = createStableRuntimeId({
    type: "outbox",
    tenantId: tenant_id,
    seed: `${principal.user_id ?? "unknown"}:${action}:${decision.effect ?? "unknown"}:${request_id}`
  });
  return Object.freeze({
    tenant_id,
    event_id,
    topic: "runtime-auth.audit",
    payload: {
      actor_id: principal.user_id ?? "unknown",
      action,
      effect: decision.effect ?? "unknown",
      reason: decision.reason ?? "unknown",
      server_derived_principal: principal.source === "server-derived",
      request_id
    }
  });
}

export function emitAuthAuditEvent(connection, input = {}) {
  return appendOutboxEvent(connection, createAuthAuditEvent(input));
}
