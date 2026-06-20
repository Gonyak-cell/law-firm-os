export const CRM_INTAKE_ROUTE_POLICIES = Object.freeze([
  Object.freeze({ method: "GET", pattern: /^\/api\/crm\/leads$/, action: "crm:lead:read", resource_type: "crm_lead" }),
  Object.freeze({ method: "POST", pattern: /^\/api\/crm\/leads$/, action: "crm:lead:write", resource_type: "crm_lead" }),
  Object.freeze({ method: "GET", pattern: /^\/api\/crm\/opportunities$/, action: "crm:opportunity:read", resource_type: "crm_opportunity" }),
  Object.freeze({ method: "POST", pattern: /^\/api\/crm\/opportunities$/, action: "crm:opportunity:write", resource_type: "crm_opportunity" }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/crm\/opportunities\/([^/]+)\/handoff$/,
    action: "crm:opportunity:intake_handoff",
    resource_type: "crm_opportunity",
  }),
  Object.freeze({ method: "GET", pattern: /^\/api\/intake\/requests$/, action: "intake:request:read", resource_type: "intake_request" }),
  Object.freeze({ method: "POST", pattern: /^\/api\/intake\/requests$/, action: "intake:request:write", resource_type: "intake_request" }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/intake\/conflict-checks$/,
    action: "intake:conflict:write",
    resource_type: "conflict_check",
  }),
  Object.freeze({
    method: "POST",
    pattern: /^\/api\/intake\/clearance-tokens$/,
    action: "intake:clearance:write",
    resource_type: "clearance_token",
  }),
  Object.freeze({ method: "GET", pattern: /^\/api\/intake\/audit$/, action: "intake:audit:read", resource_type: "intake_audit" }),
]);

export function matchCrmIntakeRoute({ pathname, method } = {}) {
  for (const policy of CRM_INTAKE_ROUTE_POLICIES) {
    const match = pathname.match(policy.pattern);
    if (match && policy.method === method) return Object.freeze({ ...policy, params: Object.freeze(match.slice(1)) });
  }
  return null;
}
