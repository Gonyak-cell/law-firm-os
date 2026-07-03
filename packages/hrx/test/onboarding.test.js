import assert from "node:assert/strict";
import test from "node:test";
import {
  HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS,
  createOnboardingPlan,
  evaluateOnboardingMatterAssignmentGate,
  updateOnboardingTask,
} from "../src/onboarding.js";

const plan = Object.freeze({
  tenant_id: "tenant-a",
  onboarding_id: "onb-001",
  employee_id: "emp-001",
  start_date: "2026-07-01",
  tasks: [{ task_id: "task-001", title: "Complete I-9", owner_role: "people_ops" }],
  document_refs: ["DocRef:offer-letter-001", "DocRef:policy-ack-001"],
  access_requests: [{ request_id: "access-001", system_ref: "DMS", access_level: "associate" }],
});

test("onboarding plan tracks tasks, document refs, and access requests", () => {
  const created = createOnboardingPlan(plan);
  assert.equal(created.tasks[0].status, "pending");
  assert.equal(created.document_refs.length, 2);
  assert.equal(created.access_requests[0].state, "requested");
  assert.deepEqual(
    created.matter_assignment_gate.required_task_ids,
    HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS,
  );
  assert.equal(created.tasks.some((task) => task.task_id === "default-security-training"), true);
  assert.equal(created.tasks.some((task) => task.task_id === "default-confidentiality-pledge"), true);

  const updated = updateOnboardingTask(created, "task-001", { status: "completed" });
  assert.equal(updated.tasks[0].status, "completed");
});

test("onboarding plan rejects document body storage", () => {
  assert.throws(() => createOnboardingPlan({ ...plan, document_body: "raw body" }), /document_ref/);
});

test("onboarding gate denies matter assignment before default tasks are complete", () => {
  const created = createOnboardingPlan({ ...plan, tasks: [] });
  const blocked = evaluateOnboardingMatterAssignmentGate({
    employee_id: "emp-001",
    onboarding_plans: [created],
  });
  assert.equal(blocked.effect, "deny");
  assert.equal(blocked.safe_error_code, "HRX_ONBOARDING_GATE_INCOMPLETE");
  assert.deepEqual(blocked.missing_task_ids, HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS);
});

test("onboarding gate allows matter assignment after default tasks are complete", () => {
  const created = createOnboardingPlan({ ...plan, tasks: [] });
  const withTraining = updateOnboardingTask(created, "default-security-training", { status: "completed" });
  const stillBlocked = evaluateOnboardingMatterAssignmentGate({
    employee_id: "emp-001",
    onboarding_plans: [withTraining],
  });
  assert.equal(stillBlocked.effect, "deny");
  assert.deepEqual(stillBlocked.missing_task_ids, ["default-confidentiality-pledge"]);

  const completed = updateOnboardingTask(withTraining, "default-confidentiality-pledge", { status: "completed" });
  const allowed = evaluateOnboardingMatterAssignmentGate({
    employee_id: "emp-001",
    onboarding_plans: [completed],
  });
  assert.equal(allowed.effect, "allow");
  assert.equal(allowed.reason, "onboarding_gate_complete");
  assert.deepEqual(allowed.missing_task_ids, []);
});

test("onboarding gate requires a plan unless a waiver is supplied on the plan", () => {
  const missingPlan = evaluateOnboardingMatterAssignmentGate({
    employee_id: "emp-404",
    onboarding_plans: [],
  });
  assert.equal(missingPlan.effect, "deny");
  assert.equal(missingPlan.safe_error_code, "HRX_ONBOARDING_GATE_PLAN_REQUIRED");

  const waived = createOnboardingPlan({
    ...plan,
    tasks: [],
    matter_assignment_gate_waiver_ref: "Waiver:D13-owner-approval",
  });
  const allowed = evaluateOnboardingMatterAssignmentGate({
    employee_id: "emp-001",
    onboarding_plans: [waived],
  });
  assert.equal(allowed.effect, "allow");
  assert.equal(allowed.reason, "onboarding_gate_waived");
  assert.equal(allowed.waiver_ref, "Waiver:D13-owner-approval");
});
