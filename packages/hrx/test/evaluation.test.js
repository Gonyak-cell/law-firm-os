import assert from "node:assert/strict";
import test from "node:test";
import {
  createEvaluationRecord,
  evaluateEvaluationRead,
  readEvaluationWithAudit,
} from "../src/evaluation.js";

function evaluationFixture() {
  return createEvaluationRecord({
    tenant_id: "tenant-a",
    evaluation_id: "eval-001",
    employee_id: "emp-subject",
    reviewer_employee_id: "emp-reviewer",
    period_start: "2026-01-01",
    period_end: "2026-06-30",
    status: "submitted",
    source_ref: "hris://evaluation/eval-001",
    rating_ref: "vault://rating/eval-001",
    private_notes_ref: "vault://notes/eval-001",
  });
}

test("evaluation read allows scoped reviewer and writes audit event", () => {
  const events = [];
  const response = readEvaluationWithAudit({
    evaluation: evaluationFixture(),
    principal: {
      tenant_id: "tenant-a",
      actor_id: "user-reviewer",
      employee_id: "emp-reviewer",
      scopes: ["hrx:evaluation:read"],
    },
    audit: { append: (event) => events.push(event) },
  });
  assert.equal(response.outcome, "ok");
  assert.equal(response.evaluation.private_notes_included, false);
  assert.equal(Object.hasOwn(response.evaluation, "private_notes_ref"), false);
  assert.equal(events.length, 1);
  assert.equal(events[0].action, "hrx.evaluation.read");
  assert.equal(events[0].decision, "allow");
});

test("evaluation read denies cross-tenant principal and still emits audit evidence", () => {
  const events = [];
  const response = readEvaluationWithAudit({
    evaluation: evaluationFixture(),
    principal: {
      tenant_id: "tenant-b",
      actor_id: "user-other",
      employee_id: "emp-reviewer",
      scopes: ["hrx:evaluation:read"],
    },
    audit: { append: (event) => events.push(event) },
  });
  assert.equal(response.outcome, "blocked");
  assert.equal(response.safe_error_code, "HRX_EVALUATION_READ_DENIED");
  assert.equal(events.length, 1);
  assert.equal(events[0].decision, "deny");
});

test("evaluation read decision keeps user and employee namespaces separate", () => {
  const decision = evaluateEvaluationRead({
    evaluation: evaluationFixture(),
    principal: {
      tenant_id: "tenant-a",
      actor_id: "emp-reviewer",
      employee_id: "emp-other",
      scopes: [],
    },
  });
  assert.equal(decision.outcome, "deny");
});
