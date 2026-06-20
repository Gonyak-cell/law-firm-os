import assert from "node:assert/strict";
import test from "node:test";
import { evaluateHrxEvaluationAccess } from "../src/hrx-evaluation-policy.js";

const resource = {
  tenant_id: "tenant-a",
  resource_type: "hrx.evaluation",
  resource_id: "eval-001",
  sensitivity: "evaluation",
  reviewer_user_id: "reviewer-1",
};

test("HRX evaluation policy allows assigned reviewer with review scope", () => {
  const decision = evaluateHrxEvaluationAccess({
    principal: {
      tenant_id: "tenant-a",
      user_id: "reviewer-1",
      role_ids: ["hr_reviewer"],
      hrx_scopes: ["hrx.evaluation.review"],
      allowed_purposes: ["performance_review"],
    },
    resource,
    action: "read",
    purpose: "performance_review",
  });
  assert.equal(decision.effect, "allow");
  assert.equal(decision.audit_required, true);
  assert.equal(decision.required_scope, "hrx.evaluation.review");
});

test("HRX evaluation policy denies non-reviewer without HR evaluation scope", () => {
  const decision = evaluateHrxEvaluationAccess({
    principal: {
      tenant_id: "tenant-a",
      user_id: "other-user",
      role_ids: ["hr_reviewer"],
      hrx_scopes: ["hrx.employee.read"],
      allowed_purposes: ["performance_review"],
    },
    resource,
    action: "read",
    purpose: "performance_review",
  });
  assert.equal(decision.effect, "deny");
  assert.equal(decision.reason, "hrx_scope_required");
});
