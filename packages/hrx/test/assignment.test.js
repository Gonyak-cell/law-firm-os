import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAssignment } from "../src/assignment.js";

test("HRX assignment is effective-dated and includes role position practice group capacity", () => {
  const assignment = createHrxAssignment({
    tenant_id: "tenant-a",
    assignment_id: "assign-001",
    employee_id: "emp-001",
    role_id: "role-counsel",
    position_id: "pos-001",
    practice_group_id: "pg-disputes",
    capacity_pct: 75,
    effective_from: "2026-06-19",
  });
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
