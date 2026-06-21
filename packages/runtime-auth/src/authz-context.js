import { createPermissionContext, evaluatePermission } from "../../authz/src/index.js";
import { evaluateSensitivePolicyHooks } from "./policy-hooks.js";

function deny(reason, principal = {}, resource = {}, action = "unknown") {
  return Object.freeze({
    effect: "deny",
    reason,
    action,
    server_derived_principal: principal.source === "server-derived",
    audit_hint: {
      actor_id: principal.user_id ?? "unknown",
      tenant_id: principal.tenant_id ?? "unknown",
      object_id: reason === "cross_tenant_deny" ? "redacted_cross_tenant_object" : "redacted_denied_object",
      reason,
      effect: "deny"
    }
  });
}

export function buildRuntimeAuthzContext({ principal = {}, resource = {}, action, request = {} } = {}) {
  if (principal.source !== "server-derived" || principal.header_only_trust_allowed !== false) {
    return Object.freeze({ ok: false, effect: "deny", reason: "server_derived_principal_required" });
  }
  const permissionContext = createPermissionContext({
    principal,
    resource,
    action,
    request: {
      request_id: principal.request_id ?? request.request_id,
      trace_id: request.trace_id,
      source_service: request.source_service ?? "runtime-auth"
    },
    expectedTenantId: principal.tenant_id
  });
  if (!permissionContext.ok) return Object.freeze(permissionContext);
  return Object.freeze({
    ...permissionContext,
    server_derived_principal: true,
    auth_session_id: principal.session_id
  });
}

export function evaluateRuntimePermission({ principal = {}, resource = {}, action, request = {}, rules = [], objectAcl = [] } = {}) {
  const context = buildRuntimeAuthzContext({ principal, resource, action, request });
  if (!context.ok) return deny(context.reason, principal, resource, action);
  const sensitive = evaluateSensitivePolicyHooks({ principal, resource });
  if (!sensitive.ok) return deny(sensitive.reason, principal, resource, action);
  const decision = evaluatePermission({ principal, resource, action, rules, objectAcl });
  return Object.freeze({
    ...decision,
    runtime_authz_context_id: context.permission_context_id,
    server_derived_principal: true
  });
}
