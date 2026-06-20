import assert from "node:assert/strict";
import test from "node:test";
import { assertHrxNoFinalDecision, enforceHrxNoFinalDecisionGuard } from "../src/ai/decision-guard.js";

test("AI decision guard blocks final hire, fire, pay, evaluation, discipline, and termination decisions", () => {
  const cases = [
    { decision_domain: "hire", final_decision: true },
    { question: "Should we terminate this employee now?", decision_mode: "final" },
    { action: "decide_salary_raise", request: "Set pay for employee", decision_domain: "pay" },
    { question: "Set final performance rating", decision_mode: "final" },
    { decision_domain: "discipline", final_decision: true },
    { decision_domain: "termination", decision_mode: "final" },
  ];

  for (const input of cases) {
    const guard = enforceHrxNoFinalDecisionGuard(input);
    assert.equal(guard.status, "blocked");
    assert.equal(guard.safe_error_code, "HRX_AI_FINAL_DECISION_BLOCKED");
    assert.equal(guard.human_review_required, true);
  }
});

test("AI decision guard allows advisory summaries and throws on blocked assertions", () => {
  const advisory = enforceHrxNoFinalDecisionGuard({
    question: "Summarize candidate interview notes for human review",
    decision_mode: "advisory",
  });
  assert.equal(advisory.status, "allow");

  assert.throws(
    () => assertHrxNoFinalDecision({ decision_domain: "fire", final_decision: true }),
    /hrx_ai_must_not_make_final_people_decisions/,
  );
});
