export const ACTOR_CONTEXT_HEADER = "x-lawos-actor-id";
export const ACTOR_ROLE_HEADER = "x-lawos-actor-role";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseActorContext(headers = {}) {
  const actorId = clean(headers[ACTOR_CONTEXT_HEADER] ?? headers[ACTOR_CONTEXT_HEADER.toLowerCase()]);
  if (!actorId) {
    return Object.freeze({
      ok: false,
      status: 401,
      safe_error_code: "HRX_ACTOR_CONTEXT_REQUIRED",
      fail_closed: true,
    });
  }
  const role = clean(headers[ACTOR_ROLE_HEADER] ?? headers[ACTOR_ROLE_HEADER.toLowerCase()]) || "unknown";
  return Object.freeze({
    ok: true,
    actor_id: actorId,
    actor_role: role,
    source: "header",
    fail_closed: false,
  });
}

export function requireActorContext(headers = {}) {
  const context = parseActorContext(headers);
  if (!context.ok) {
    const error = new Error(context.safe_error_code);
    error.status = context.status;
    error.safe_error_code = context.safe_error_code;
    error.fail_closed = true;
    throw error;
  }
  return context;
}

export function buildHrxRequestContext({ tenant, actor } = {}) {
  if (!tenant?.ok) throw new Error("HRX_TENANT_CONTEXT_REQUIRED");
  if (!actor?.ok) throw new Error("HRX_ACTOR_CONTEXT_REQUIRED");
  return Object.freeze({
    tenant_id: tenant.tenant_id,
    actor_id: actor.actor_id,
    actor_role: actor.actor_role,
  });
}
