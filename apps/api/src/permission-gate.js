// Fail-closed permission gate for apps/api routes.
//
// Decision engine: `evaluatePermission` from packages/authz (read-only workspace
// dependency), which implements the permission-kernel-contract v0.28 decision order:
//   cross_tenant_deny -> deny_rule -> object_acl_deny -> review_required ->
//   approval_required -> object_acl_allow -> allow rule (abac/rbac) -> fail_closed_no_match
//
// The caller supplies the evaluation context via the `x-lawos-permission-context`
// request header (JSON). Anything missing, malformed, or unmatched resolves to deny.
import { evaluatePermission } from "../../../packages/authz/src/index.js";

export const PERMISSION_CONTEXT_HEADER = "x-lawos-permission-context";

export const PERMISSION_DECISION_ORDER = Object.freeze([
  "cross_tenant_deny",
  "deny_rule",
  "object_acl_deny",
  "review_required",
  "approval_required",
  "object_acl_allow",
  "abac",
  "rbac",
  "fail_closed_no_match",
]);

function denyDecision(reason, action) {
  return Object.freeze({
    effect: "deny",
    reason,
    action,
    matched_rule_id: null,
    fail_closed: true,
  });
}

export function parsePermissionContext(headerValue) {
  if (typeof headerValue !== "string" || headerValue.trim() === "") return null;
  try {
    const parsed = JSON.parse(headerValue);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return {
      principal: parsed.principal && typeof parsed.principal === "object" ? parsed.principal : null,
      rules: Array.isArray(parsed.rules) ? parsed.rules : [],
      object_acl: Array.isArray(parsed.object_acl) ? parsed.object_acl : [],
    };
  } catch {
    return null;
  }
}

export function evaluateRouteDecision({ context, resource, action }) {
  if (!context) return denyDecision("fail_closed_missing_permission_context", action);
  if (!context.principal) return denyDecision("fail_closed_missing_principal", action);
  return evaluatePermission({
    principal: context.principal,
    resource,
    action,
    rules: context.rules,
    objectAcl: context.object_acl,
  });
}

// Per-item security trimming: unauthorized items are silently omitted and reported
// as a safe count only (master-data contract: unauthorized_items_omitted_with_safe_counts_only).
// Object ACL entries may carry an optional `resource_id` to scope them to one item.
export function trimItemsByPermission({ context, items, action, resourceType }) {
  if (!context?.principal) return { allowed: [], omittedCount: items.length };
  const allowed = [];
  let omittedCount = 0;
  for (const item of items) {
    const resource = {
      tenant_id: item.tenant_id,
      resource_type: resourceType,
      resource_id: item.resource_id,
      matter_id: item.matter_id ?? null,
    };
    const acl = context.object_acl.filter(
      (entry) => entry.resource_id === undefined || entry.resource_id === item.resource_id,
    );
    const decision = evaluatePermission({
      principal: context.principal,
      resource,
      action,
      rules: context.rules,
      objectAcl: acl,
    });
    if (decision.effect === "allow") allowed.push(item);
    else omittedCount += 1;
  }
  return { allowed, omittedCount };
}
