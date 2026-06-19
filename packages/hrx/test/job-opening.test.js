import assert from "node:assert/strict";
import test from "node:test";
import { createJobOpening, transitionJobOpening } from "../src/recruiting/job-opening.js";

const opening = Object.freeze({
  tenant_id: "tenant-a",
  job_opening_id: "job-001",
  title: "Senior Litigation Associate",
  department_ref: "PracticeGroup:litigation",
  hiring_manager_employee_id: "emp-manager-001",
  position_count: 2,
});

test("job opening workflow approves, opens, and closes in order", () => {
  const draft = createJobOpening(opening);
  assert.equal(draft.state, "draft");
  const approved = transitionJobOpening(draft, { state: "approved", approval_ref: "Approval:job-001" });
  const open = transitionJobOpening(approved, { state: "open" });
  const closed = transitionJobOpening(open, { state: "closed" });
  assert.equal(closed.state, "closed");
  assert.ok(closed.closed_at);
});

test("job opening workflow blocks open without approval", () => {
  const draft = createJobOpening(opening);
  assert.throws(() => transitionJobOpening(draft, { state: "open" }), /cannot transition/);
  assert.throws(() => createJobOpening({ ...opening, state: "open" }), /approval_ref is required/);
});
