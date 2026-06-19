import { validateTenantBoundary } from "./trust-context.js";

export function evaluatePermission({ principal, resource, action, rules = [], objectAcl = [] }) {
  const tenantBoundary = validateTenantBoundary({ principal, resource });
  if (!tenantBoundary.ok) {
    return decision("deny", tenantBoundary.reason, principal, resource, action);
  }

  const denyRule = rules.find((rule) => rule.effect === "deny" && matches(rule, principal, resource, action));
  if (denyRule) return decision("deny", denyRule.reason ?? "deny_rule", principal, resource, action, denyRule.id);

  const aclDeny = objectAcl.find((entry) => entry.effect === "deny" && entry.principal_id === principal.user_id && actionMatches(entry, action));
  if (aclDeny) return decision("deny", "object_acl_deny", principal, resource, action, aclDeny.id);

  const reviewRule = rules.find((rule) => ["review_required", "approval_required"].includes(rule.effect) && matches(rule, principal, resource, action));
  if (reviewRule) return decision(reviewRule.effect, reviewRule.reason ?? reviewRule.effect, principal, resource, action, reviewRule.id);

  const aclAllow = objectAcl.find((entry) => entry.effect === "allow" && entry.principal_id === principal.user_id && actionMatches(entry, action));
  if (aclAllow) return decision("allow", "object_acl_allow", principal, resource, action, aclAllow.id);

  const allowRule = rules.find((rule) => rule.effect === "allow" && matches(rule, principal, resource, action));
  if (allowRule) return decision("allow", allowRule.reason ?? "allow_rule", principal, resource, action, allowRule.id);

  return decision("deny", "fail_closed_no_match", principal, resource, action);
}

export function trimSearchResults(principal, results, rules = [], objectAcl = [], action = "search.view") {
  return results.filter((resource) => {
    const acl = typeof objectAcl === "function" ? objectAcl(resource) : objectAcl;
    return evaluatePermission({ principal, resource, action, rules, objectAcl: acl }).effect === "allow";
  });
}

function matches(rule, principal, resource, action) {
  const actionOk = actionMatches(rule, action);
  const roleOk = !rule.role_id || principal.role_ids?.includes(rule.role_id);
  const resourceOk = !rule.resource_type || rule.resource_type === resource.resource_type;
  const ethicalWallOk = !rule.ethical_wall_matter_id || rule.ethical_wall_matter_id === resource.matter_id;
  return actionOk && roleOk && resourceOk && ethicalWallOk;
}

function actionMatches(rule, action) {
  return rule.action === action || rule.actions?.includes(action) || rule.action === "*";
}

function decision(effect, reason, principal, resource, action, matched_rule_id = null) {
  const crossTenantDeny = reason === "cross_tenant_deny";
  return {
    effect,
    reason,
    action,
    matched_rule_id,
    audit_hint: {
      actor_id: principal?.user_id ?? "unknown",
      action,
      object_id: crossTenantDeny ? "redacted_cross_tenant_object" : (resource?.resource_id ?? resource?.document_id ?? "unknown"),
      tenant_id: principal?.tenant_id ?? "unknown",
      reason,
      effect,
    },
  };
}
