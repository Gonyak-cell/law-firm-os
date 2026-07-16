import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAssignment, createHrxMatterAssignment } from "../src/assignment.js";
import { createOnboardingPlan, updateOnboardingTask } from "../src/onboarding.js";

const assignmentInput = Object.freeze({
  tenant_id: "tenant-a",
  assignment_id: "assign-001",
  employee_id: "emp-001",
  role_id: "role-counsel",
  position_id: "pos-001",
  practice_group_id: "pg-disputes",
  capacity_pct: 75,
  effective_from: "2026-06-19",
});

test("HRX assignment is effective-dated and includes role position practice group capacity", () => {
  const assignment = createHrxAssignment(assignmentInput);
  assert.equal(assignment.role_id, "role-counsel");
  assert.equal(assignment.position_id, "pos-001");
  assert.equal(assignment.practice_group_id, "pg-disputes");
  assert.equal(assignment.capacity_pct, 75);
});

test("HRX assignment rejects invalid capacity", () => {
  assert.throws(
    () =>
      createHrxAssignment({
        tenant_id: "tenant-a",
        assignment_id: "assign-001",
        employee_id: "emp-001",
        role_id: "role-counsel",
        position_id: "pos-001",
        practice_group_id: "pg-disputes",
        capacity_pct: 150,
        effective_from: "2026-06-19",
      }),
    /capacity_pct must be between 0 and 100/,
  );
});

test("HRX matter assignment is blocked until onboarding gate tasks are complete", () => {
  const onboarding = createOnboardingPlan({
    tenant_id: "tenant-a",
    onboarding_id: "onb-001",
    employee_id: "emp-001",
    start_date: "2026-07-01",
    tasks: [],
  });
  assert.throws(
    () =>
      createHrxMatterAssignment(
        { ...assignmentInput, matter_id: "matter-001" },
        { onboarding_plans: [onboarding] },
      ),
    (error) => error.safe_error_code === "HRX_ONBOARDING_GATE_INCOMPLETE",
  );
});

test("HRX matter assignment is allowed after onboarding gate completion or waiver", () => {
  const onboarding = createOnboardingPlan({
    tenant_id: "tenant-a",
    onboarding_id: "onb-001",
    employee_id: "emp-001",
    start_date: "2026-07-01",
    tasks: [],
  });
  const withTraining = updateOnboardingTask(onboarding, "default-security-training", { status: "completed" });
  const completed = updateOnboardingTask(withTraining, "default-confidentiality-pledge", { status: "completed" });
  const assignment = createHrxMatterAssignment(
    { ...assignmentInput, matter_id: "matter-001" },
    { onboarding_plans: [completed] },
  );
  assert.equal(assignment.matter_id, "matter-001");
  assert.equal(assignment.onboarding_gate_decision.reason, "onboarding_gate_complete");

  const waived = createHrxMatterAssignment(
    { ...assignmentInput, assignment_id: "assign-002", matter_id: "matter-002" },
    { onboarding_plans: [onboarding], waiver_ref: "Waiver:D13-owner-approval" },
  );
  assert.equal(waived.onboarding_gate_decision.reason, "onboarding_gate_waived");
  assert.equal(waived.onboarding_gate_decision.waiver_ref, "Waiver:D13-owner-approval");
});
