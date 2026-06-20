import { evaluateHrxPolicy } from "../../../../packages/authz/src/hrx-policy-engine.js";
import { buildHrxRequestContext, parseActorContext } from "./actor-context.js";
import { parseTenantContext } from "./tenant-context.js";
import { resolveHrxRoutePolicy } from "../routes/hrx/route-policy-map.js";

export const HRX_SCOPE_HEADER = "x-lawos-hrx-scopes";
export const HRX_PURPOSE_HEADER = "x-lawos-hrx-purpose";

function headerValue(headers = {}, name) {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value.join(",");
  return typeof value === "string" ? value : "";
}

function parseList(value) {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function blocked(status, safeErrorCode, reason, extra = {}) {
  return Object.freeze({
    ok: false,
    status,
    body: Object.freeze({
      outcome: "blocked",
      safe_error_code: safeErrorCode,
      reason,
      ...extra,
    }),
  });
}

function buildPrincipal({ headers, requestContext, policy }) {
  const roleIds = parseList(requestContext.actor_role);
  return Object.freeze({
    tenant_id: requestContext.tenant_id,
    user_id: requestContext.actor_id,
    actor_id: requestContext.actor_id,
    role_ids: roleIds.length > 0 ? roleIds : ["unknown"],
    hrx_scopes: Object.freeze(parseList(headerValue(headers, HRX_SCOPE_HEADER))),
    allowed_purposes: Object.freeze([policy.purpose]),
  });
}

export function authorizeHrxApiRequest({ method, pathname, query = {}, headers = {} } = {}) {
  const policy = resolveHrxRoutePolicy({ method, pathname });
  if (!policy) {
    return blocked(403, "HRX_ROUTE_POLICY_REQUIRED", "hrx_route_policy_required", { fail_closed: true });
  }

  const tenant = parseTenantContext(headers);
  if (!tenant.ok) return blocked(tenant.status, tenant.safe_error_code, "hrx_tenant_context_required", { fail_closed: true });
  const actor = parseActorContext(headers);
  if (!actor.ok) return blocked(actor.status, actor.safe_error_code, "hrx_actor_context_required", { fail_closed: true });

  if (query.tenant_id && query.tenant_id !== tenant.tenant_id) {
    return blocked(400, "HRX_TENANT_CONTEXT_MISMATCH", "hrx_query_tenant_must_match_trusted_context", { fail_closed: true });
  }

  const requestContext = buildHrxRequestContext({ tenant, actor });
  const principal = buildPrincipal({ headers, requestContext, policy });
  const purpose = headerValue(headers, HRX_PURPOSE_HEADER).trim() || policy.purpose;
  const decision = evaluateHrxPolicy({
    action: policy.action,
    sensitivity: policy.sensitivity,
    required_scope: policy.required_scope,
    purpose,
    principal,
    resource: {
      tenant_id: requestContext.tenant_id,
      resource_type: policy.resource_type,
      resource_id: policy.resource_id,
      sensitivity: policy.sensitivity,
    },
  });

  if (decision.effect !== "allow") {
    return blocked(403, "HRX_AUTHZ_DENIED", decision.reason, {
      action: policy.action,
      required_scope: policy.required_scope,
      route_policy_id: policy.id,
      fail_closed: true,
    });
  }

  return Object.freeze({
    ok: true,
    status: 200,
    context: requestContext,
    policy,
    decision,
    principal,
  });
}
