import assert from "node:assert/strict";
import test from "node:test";
import { createMatterTask } from "../src/model.js";

const BASE = {
  tenant_id: "tenant-people",
  matter_id: "matter-1",
  task_id: "task-1",
  title: "서면 검토",
  status: "todo",
  created_by: "user-creator",
  assigned_to_user_id: "user-assignee",
  starts_at: "2026-07-30T23:30:00.000Z",
  ends_at: "2026-07-31T01:00:00.000Z",
  estimated_minutes: 90,
  due_at: "2026-08-01T09:00:00.000Z",
};

test("Matter task keeps due date separate from a cross-day minute interval", () => {
  const task = createMatterTask(BASE);
  assert.equal(task.assigned_to_user_id, "user-assignee");
  assert.equal(task.starts_at, "2026-07-30T23:30:00.000Z");
  assert.equal(task.ends_at, "2026-07-31T01:00:00.000Z");
  assert.equal(task.estimated_minutes, 90);
  assert.equal(task.due_at, "2026-08-01T09:00:00.000Z");
});

test("Matter task permits a start without an end so People can request the missing time", () => {
  const task = createMatterTask({
    ...BASE,
    task_id: "task-needs-end",
    ends_at: null,
  });
  assert.equal(task.starts_at, BASE.starts_at);
  assert.equal(task.ends_at, null);
});

test("Matter task rejects reversed intervals and non-positive estimates", () => {
  assert.throws(() => createMatterTask({
    ...BASE,
    ends_at: "2026-07-30T22:00:00.000Z",
  }), /ends_at/);
  for (const estimatedMinutes of [0, -1, 1.5]) {
    assert.throws(() => createMatterTask({
      ...BASE,
      estimated_minutes: estimatedMinutes,
    }), /estimated_minutes/);
  }
});

test("Matter task never mixes User and Employee identifiers", () => {
  assert.throws(() => createMatterTask({
    ...BASE,
    assigned_to_employee_id: "emp-1",
  }), /Employee/i);
  assert.throws(() => createMatterTask({
    ...BASE,
    assigned_to: "legacy-user",
    assigned_to_user_id: "new-user",
  }), /assigned_to/);
});
