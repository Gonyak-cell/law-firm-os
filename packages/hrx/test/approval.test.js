import assert from "node:assert/strict";
import test from "node:test";
import { createApprovalPolicy, createApprovalRequest, resolveApprovalRequest, routeHrxApproval } from "../src/approval.js";

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
