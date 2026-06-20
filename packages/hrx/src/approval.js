export const HRX_APPROVAL_ROUTES = Object.freeze(["manager", "hr", "legal"]);
export const HRX_APPROVAL_STATES = Object.freeze(["pending", "approved", "rejected"]);
export const HRX_APPROVAL_ESCALATION_TRIGGERS = Object.freeze(["sla_expired", "approver_unavailable", "manual_escalation"]);

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

export function createApprovalStep(input = {}) {
  const route = requiredString(input, "route");
  if (!HRX_APPROVAL_ROUTES.includes(route)) throw new TypeError(`route must be one of ${HRX_APPROVAL_ROUTES.join(", ")}`);
  const stepOrder = Number(input.step_order);
  if (!Number.isInteger(stepOrder) || stepOrder <= 0) throw new TypeError("step_order must be a positive integer");
  return Object.freeze({
    step_id: requiredString(input, "step_id"),
    step_order: stepOrder,
    route,
    approver_role: requiredString(input, "approver_role"),
    optional: input.optional === true,
  });
}

export function createApprovalDelegation(input = {}) {
  return Object.freeze({
    delegation_id: requiredString(input, "delegation_id"),
    from_approver_id: requiredString(input, "from_approver_id"),
    to_approver_id: requiredString(input, "to_approver_id"),
    reason: requiredString(input, "reason"),
    expires_at: requiredString(input, "expires_at"),
  });
}

export function createApprovalEscalation(input = {}) {
  const trigger = requiredString(input, "trigger");
  if (!HRX_APPROVAL_ESCALATION_TRIGGERS.includes(trigger)) {
    throw new TypeError(`trigger must be one of ${HRX_APPROVAL_ESCALATION_TRIGGERS.join(", ")}`);
  }
  return Object.freeze({
    escalation_id: requiredString(input, "escalation_id"),
    trigger,
    to_route: requiredString(input, "to_route"),
    reason: requiredString(input, "reason"),
  });
}

export function createApprovalRoutePlan(input = {}) {
  const policy = createApprovalPolicy(input.policy);
  const steps = (input.steps ?? []).map((step) => {
    const routed = routeHrxApproval({ route: step.route }, policy);
    return createApprovalStep({ ...step, approver_role: step.approver_role ?? routed.approver_role });
  });
  if (steps.length === 0) throw new TypeError("approval route plan requires at least one step");
  const stepOrders = new Set(steps.map((step) => step.step_order));
  if (stepOrders.size !== steps.length) throw new TypeError("approval route plan step_order values must be unique");
  return Object.freeze({
    tenant_id: policy.tenant_id,
    policy_id: policy.policy_id,
    steps: Object.freeze([...steps].sort((left, right) => left.step_order - right.step_order)),
    delegations: Object.freeze((input.delegations ?? []).map(createApprovalDelegation)),
    escalations: Object.freeze((input.escalations ?? []).map(createApprovalEscalation)),
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
