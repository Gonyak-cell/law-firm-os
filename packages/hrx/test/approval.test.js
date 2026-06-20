import assert from "node:assert/strict";
import test from "node:test";
import {
  createApprovalPolicy,
  createApprovalRequest,
  createApprovalRoutePlan,
  resolveApprovalRequest,
  routeHrxApproval,
} from "../src/approval.js";

const policy = Object.freeze({
  tenant_id: "tenant-a",
  policy_id: "approval-policy-001",
  routes: {
    manager: "manager",
    hr: "people_ops",
    legal: "legal_ops",
  },
});

test("approval engine routes requests by manager, HR, and legal policy", () => {
  const created = createApprovalPolicy(policy);
  assert.equal(routeHrxApproval({ route: "manager" }, created).approver_role, "manager");
  assert.equal(routeHrxApproval({ route: "hr" }, created).approver_role, "people_ops");
  assert.equal(routeHrxApproval({ route: "legal" }, created).approver_role, "legal_ops");
});

test("approval engine resolves pending requests only", () => {
  const routed = routeHrxApproval({ route: "legal" }, policy);
  const request = createApprovalRequest({
    tenant_id: "tenant-a",
    approval_id: "approval-001",
    object_type: "LegalRisk",
    object_id: "legal-risk-001",
    ...routed,
  });
  const approved = resolveApprovalRequest(request, { state: "approved", decided_by: "legal-001" });
  assert.equal(approved.state, "approved");
  assert.throws(() => resolveApprovalRequest(approved, { state: "rejected", decided_by: "legal-002" }), /must be pending/);
  assert.throws(() => resolveApprovalRequest(request, { state: "pending", decided_by: "legal-002" }), /approved or rejected/);
});

test("approval route plan supports ordered steps delegation and escalation", () => {
  const plan = createApprovalRoutePlan({
    policy,
    steps: [
      { step_id: "step-hr", step_order: 2, route: "hr" },
      { step_id: "step-manager", step_order: 1, route: "manager" },
    ],
    delegations: [
      {
        delegation_id: "delegation-001",
        from_approver_id: "manager-001",
        to_approver_id: "manager-002",
        reason: "scheduled absence",
        expires_at: "2026-07-01T00:00:00.000Z",
      },
    ],
    escalations: [
      {
        escalation_id: "escalation-001",
        trigger: "sla_expired",
        to_route: "hr",
        reason: "manager step exceeded SLA",
      },
    ],
  });
  assert.deepEqual(plan.steps.map((step) => step.step_id), ["step-manager", "step-hr"]);
  assert.equal(plan.delegations[0].to_approver_id, "manager-002");
  assert.equal(plan.escalations[0].trigger, "sla_expired");
});
