import assert from "node:assert/strict";
import test from "node:test";
import { selectMemberMatterTasks } from "../../../../packages/hrx/src/people-task-selector.js";

test("People tasks depend on explicit task assignment, not Matter attorney membership", () => {
  const result = selectMemberMatterTasks({
    tenant_id: "tenant-people",
    user_id: "user-1",
    tasks: [
      {
        tenant_id: "tenant-people",
        matter_id: "matter-assigned",
        task_id: "task-explicit",
        status: "todo",
        assigned_to_user_id: "user-1",
      },
      {
        tenant_id: "tenant-people",
        matter_id: "matter-attorney-only",
        task_id: "task-unassigned",
        status: "todo",
        assigned_to_user_id: null,
      },
    ],
    attorney_assignments: [{
      tenant_id: "tenant-people",
      matter_id: "matter-attorney-only",
      employee_id: "emp-1",
      role: "responsible_attorney",
      status: "active",
    }],
  });
  assert.deepEqual(result.unscheduled.map(({ task_id }) => task_id), ["task-explicit"]);
});
