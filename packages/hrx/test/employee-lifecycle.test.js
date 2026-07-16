import assert from "node:assert/strict";
import test from "node:test";
import {
  HRX_EMPLOYEE_OPERATIONAL_STATUSES,
  transitionEmployee,
} from "../src/employee-lifecycle.js";

const employee = Object.freeze({
  tenant_id: "tenant-a",
  employee_id: "emp-001",
  display_name: "Ari Kim",
  status: "onboarding",
});

test("employee lifecycle exposes the internal six-state model", () => {
  assert.deepEqual(HRX_EMPLOYEE_OPERATIONAL_STATUSES, [
    "onboarding",
    "probation",
    "active",
    "on_leave",
    "notice",
    "terminated",
  ]);
});

test("employee lifecycle accepts valid transitions and rejects arbitrary status patches", () => {
  const probation = transitionEmployee(employee, { status: "probation" });
  assert.equal(probation.status, "probation");
  const active = transitionEmployee(probation, { status: "active" });
  assert.equal(active.status, "active");
  const onLeave = transitionEmployee(active, { status: "on_leave" });
  assert.equal(onLeave.status, "on_leave");
  const notice = transitionEmployee(onLeave, { status: "notice" });
  assert.equal(notice.status, "notice");
  const terminated = transitionEmployee(notice, { status: "terminated" });
  assert.equal(terminated.status, "terminated");

  assert.throws(() => transitionEmployee(active, { status: "onboarding" }), /cannot transition from active/);
  assert.throws(() => transitionEmployee(active, { status: "paused" }), /Employee status must be one of/);
  assert.throws(() => transitionEmployee(terminated, { status: "active" }), /cannot transition from terminated/);
});
