import { principalHasHrxScope, requiredScopeForHrxSensitivity } from "./hrx-sensitive-scopes.js";

export const HRX_ALLOWED_POLICY_ROLES = Object.freeze(["hr_admin", "people_ops", "hr_manager", "hr_reviewer", "security_admin"]);

function decision(effect, reason, input, extra = {}) {
  return Object.freeze({
    effect,
    reason,
    action: input.action ?? null,
    required_scope: extra.required_scope ?? null,
    audit_required: true,
    mask_fields: Object.freeze(extra.mask_fields ?? []),
    fail_closed: effect !== "allow",
  });
}

function hasAllowedRole(principal = {}) {
  return Array.isArray(principal.role_ids) && principal.role_ids.some((role) => HRX_ALLOWED_POLICY_ROLES.includes(role));
}

function purposeAllowed(principal = {}, purpose) {
  if (!purpose) return false;
  if (!Array.isArray(principal.allowed_purposes) || principal.allowed_purposes.length === 0) return true;
  return principal.allowed_purposes.includes(purpose);
}

export function evaluateHrxPolicy(input = {}) {
  const principal = input.principal ?? {};
  const resource = input.resource ?? {};
  const sensitivity = input.sensitivity ?? resource.sensitivity ?? "employee";
  const requiredScope = input.required_scope ?? requiredScopeForHrxSensitivity(sensitivity);

  if (!principal.tenant_id || !resource.tenant_id || principal.tenant_id !== resource.tenant_id) {
    return decision("deny", "hrx_cross_tenant_deny", input, { required_scope: requiredScope });
  }
  if (!hasAllowedRole(principal)) {
    return decision("deny", "hrx_role_required", input, { required_scope: requiredScope });
  }
  if (!purposeAllowed(principal, input.purpose)) {
    return decision("deny", "hrx_purpose_required", input, { required_scope: requiredScope });
  }
  if (!requiredScope || !principalHasHrxScope(principal, requiredScope)) {
    return decision("deny", "hrx_scope_required", input, { required_scope: requiredScope });
  }
  return decision("allow", "hrx_policy_allow", input, { required_scope: requiredScope });
}
