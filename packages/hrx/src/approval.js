export const HRX_APPROVAL_ROUTES = Object.freeze(["manager", "hr", "legal"]);
export const HRX_APPROVAL_STATES = Object.freeze(["pending", "approved", "rejected"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createApprovalPolicy(input = {}) {
  const routes = input.routes ?? {};
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    policy_id: requiredString(input, "policy_id"),
    routes: Object.freeze({
      manager: requiredString(routes, "manager"),
      hr: requiredString(routes, "hr"),
      legal: requiredString(routes, "legal"),
    }),
  });
}

export function routeHrxApproval(input = {}, policy = {}) {
  const approvalPolicy = createApprovalPolicy(policy);
  const route = requiredString(input, "route");
  if (!HRX_APPROVAL_ROUTES.includes(route)) throw new TypeError(`route must be one of ${HRX_APPROVAL_ROUTES.join(", ")}`);
  return Object.freeze({
    route,
    approver_role: approvalPolicy.routes[route],
    policy_id: approvalPolicy.policy_id,
  });
}

export function createApprovalRequest(input = {}) {
  const route = requiredString(input, "route");
  if (!HRX_APPROVAL_ROUTES.includes(route)) throw new TypeError(`route must be one of ${HRX_APPROVAL_ROUTES.join(", ")}`);
  const state = input.state ?? "pending";
  if (!HRX_APPROVAL_STATES.includes(state)) throw new TypeError(`state must be one of ${HRX_APPROVAL_STATES.join(", ")}`);
  if (["approved", "rejected"].includes(state) && !input.decided_by) throw new TypeError("decided_by is required for resolved approvals");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    approval_id: requiredString(input, "approval_id"),
    object_type: requiredString(input, "object_type"),
    object_id: requiredString(input, "object_id"),
    route,
    approver_role: requiredString(input, "approver_role"),
    state,
    decided_by: input.decided_by ?? null,
    decision_reason: input.decision_reason ?? null,
  });
}

export function resolveApprovalRequest(request = {}, input = {}) {
  const current = createApprovalRequest(request);
  if (current.state !== "pending") throw new TypeError("ApprovalRequest must be pending before resolution");
  const nextState = requiredString(input, "state");
  if (!["approved", "rejected"].includes(nextState)) throw new TypeError("ApprovalRequest resolution must be approved or rejected");
  return createApprovalRequest({
    ...current,
    state: nextState,
    decided_by: requiredString(input, "decided_by"),
    decision_reason: input.decision_reason ?? null,
  });
}
