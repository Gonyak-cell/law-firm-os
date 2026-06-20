import assert from "node:assert/strict";
import test from "node:test";
import { createOnboardingPlan, updateOnboardingTask } from "../src/onboarding.js";

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

  const updated = updateOnboardingTask(created, "task-001", { status: "completed" });
  assert.equal(updated.tasks[0].status, "completed");
});

test("onboarding plan rejects document body storage", () => {
  assert.throws(() => createOnboardingPlan({ ...plan, document_body: "raw body" }), /document_ref/);
});
