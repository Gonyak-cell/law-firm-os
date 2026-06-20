import { evaluateHrxPolicy } from "./hrx-policy-engine.js";
import { principalHasHrxScope } from "./hrx-sensitive-scopes.js";

export function evaluateHrxEvaluationAccess(input = {}) {
  const principal = input.principal ?? {};
  const resource = input.resource ?? {};
  const isReviewer =
    (resource.reviewer_user_id && resource.reviewer_user_id === principal.user_id) ||
    (resource.reviewer_employee_id && resource.reviewer_employee_id === principal.employee_id);

  if (isReviewer && principalHasHrxScope(principal, "hrx.evaluation.review")) {
    return Object.freeze({
      effect: "allow",
      reason: "hrx_evaluation_reviewer_allow",
      action: input.action ?? "read",
      required_scope: "hrx.evaluation.review",
      audit_required: true,
      fail_closed: false,
    });
  }

  return evaluateHrxPolicy({
    ...input,
    sensitivity: "evaluation",
    required_scope: input.required_scope ?? "hrx.evaluation.read",
  });
}
