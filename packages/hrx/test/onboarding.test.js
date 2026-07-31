import assert from "node:assert/strict";
import test from "node:test";
import {
  HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS,
  createOnboardingPlan,
  evaluateOnboardingMatterAssignmentGate,
  updateOnboardingTask,
} from "../src/onboarding.js";
import { HRX_LIFECYCLE_TASK_DEPENDENCY_INCOMPLETE } from "../src/lifecycle-template.js";

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

test("template versions are snapshotted and task dependencies survive later template changes", () => {
  const templateV1 = {
    template_id: "lawyer-onboarding",
    version: "1",
    lifecycle_kind: "onboarding",
    role_key: "lawyer",
    effective_from: "2026-01-01",
    tasks: [
      {
        task_id: "documents",
        title: "입사 서류 확인",
        owner_role: "people_ops",
        due_offset_days: -2,
      },
      {
        task_id: "account",
        title: "업무 계정 설정",
        owner_role: "it_ops",
        due_offset_days: 0,
        depends_on_task_ids: ["documents"],
      },
      ...HRX_ONBOARDING_MATTER_ASSIGNMENT_TASK_IDS.map((task_id) => ({
        task_id,
        title: task_id === "default-security-training" ? "보안 교육" : "비밀유지 서약",
        owner_role: "people_ops",
        due_offset_days: 1,
      })),
    ],
  };
  const instanceV1 = createOnboardingPlan({
    ...plan,
    template: templateV1,
    tasks: undefined,
  });
  const instanceV2 = createOnboardingPlan({
    ...plan,
    onboarding_id: "onb-002",
    template: {
      ...templateV1,
      version: "2",
      effective_from: "2026-07-01",
      tasks: templateV1.tasks.map((task) =>
        task.task_id === "documents"
          ? { ...task, title: "입사 서류와 자격 확인" }
          : task),
    },
    tasks: undefined,
  });

  assert.equal(instanceV1.template_ref.version, "1");
  assert.equal(instanceV1.tasks.find((task) => task.task_id === "documents").title, "입사 서류 확인");
  assert.equal(instanceV1.tasks.find((task) => task.task_id === "documents").due_on, "2026-06-29");
  assert.equal(instanceV2.template_ref.version, "2");
  assert.equal(instanceV2.tasks.find((task) => task.task_id === "documents").title, "입사 서류와 자격 확인");
  assert.throws(
    () => updateOnboardingTask(instanceV1, "account", { status: "completed" }),
    (error) => error.safe_error_code === HRX_LIFECYCLE_TASK_DEPENDENCY_INCOMPLETE,
  );

  const documentsDone = updateOnboardingTask(
    instanceV1,
    "documents",
    { status: "completed" },
    { clock: () => "2026-07-30T01:00:00.000Z" },
  );
  const failed = updateOnboardingTask(documentsDone, "account", {
    status: "failed",
    failure_reason: "계정 제공자 응답 지연",
  });
  const retried = updateOnboardingTask(failed, "account", { retry: true });
  assert.equal(retried.tasks.find((task) => task.task_id === "account").status, "pending");
  assert.equal(retried.tasks.find((task) => task.task_id === "account").attempt_count, 2);
  assert.equal(retried.template_ref.version, "1");
});
