import assert from "node:assert/strict";
import test from "node:test";
import { createPeopleWorkloadStage1 } from "../src/people-workload-stage1.js";

const TENANT = "tenant-workload";

test("stage-one workload separates confirmed, estimated-unscheduled, and no-estimate work", () => {
  const result = createPeopleWorkloadStage1({
    tenant_id: TENANT,
    as_of: "2026-07-30T00:00:00.000Z",
    employees: [
      { tenant_id: TENANT, employee_id: "emp-1", display_name: "김변호사" },
      { tenant_id: TENANT, employee_id: "emp-2", display_name: "이변호사" },
    ],
    user_id_by_employee_id: { "emp-1": "user-1", "emp-2": "user-2" },
    identity_state_by_employee_id: { "emp-1": "resolved", "emp-2": "resolved" },
    visible_matter_ids: ["matter-1"],
    tasks: [
      { tenant_id: TENANT, matter_id: "matter-1", task_id: "task-1", status: "todo", assigned_to_user_id: "user-1", starts_at: "2026-07-28T01:00:00.000Z", ends_at: "2026-07-28T02:00:00.000Z" },
      { tenant_id: TENANT, matter_id: "matter-1", task_id: "task-2", status: "todo", assigned_to_user_id: "user-1", starts_at: "2026-07-28T01:30:00.000Z", ends_at: "2026-07-28T02:30:00.000Z" },
      { tenant_id: TENANT, matter_id: "matter-1", task_id: "task-3", status: "todo", assigned_to_user_id: "user-1", estimated_minutes: 45 },
      { tenant_id: TENANT, matter_id: "matter-1", task_id: "task-4", status: "todo", assigned_to_user_id: "user-1" },
      { tenant_id: TENANT, matter_id: "matter-1", task_id: "task-done", status: "done", assigned_to_user_id: "user-1", estimated_minutes: 900 },
      { tenant_id: TENANT, matter_id: "matter-secret", task_id: "task-secret", status: "todo", assigned_to_user_id: "user-1", estimated_minutes: 600 },
    ],
  });
  assert.equal(result.week_start, "2026-07-27");
  assert.equal(result.week_end_exclusive, "2026-08-03");
  assert.deepEqual(result.rows[0], {
    employee_id: "emp-1",
    display_name: "김변호사",
    workload_source_state: "ok",
    confirmed_minutes: 90,
    time_unspecified_estimated_minutes: 45,
    no_estimate_task_count: 1,
    no_estimate_is_zero_minutes: false,
  });
  assert.equal(result.rows[1].confirmed_minutes, 0);
  assert.equal(result.rows[1].no_estimate_task_count, 0);
  assert.equal(result.rows[1].workload_source_state, "ok");
  assert.equal(result.capacity_percent_included, false);
  assert.equal(result.automatic_assignment_included, false);
});

test("unresolved Employee/User links keep every workload value unknown", () => {
  const result = createPeopleWorkloadStage1({
    tenant_id: TENANT,
    as_of: "2026-07-30T00:00:00.000Z",
    employees: [
      { tenant_id: TENANT, employee_id: "emp-missing", display_name: "미연결" },
      { tenant_id: TENANT, employee_id: "emp-ambiguous", display_name: "중복연결" },
      { tenant_id: TENANT, employee_id: "emp-inactive", display_name: "철회연결" },
    ],
    user_id_by_employee_id: { "emp-inactive": "user-inactive" },
    identity_state_by_employee_id: {
      "emp-missing": "missing",
      "emp-ambiguous": "ambiguous",
      "emp-inactive": "inactive",
    },
    visible_matter_ids: ["matter-1"],
    tasks: [{
      tenant_id: TENANT,
      matter_id: "matter-1",
      task_id: "task-inactive",
      status: "todo",
      assigned_to_user_id: "user-inactive",
      estimated_minutes: 60,
    }],
  });

  for (const row of result.rows) {
    assert.equal(row.workload_source_state, "identity_link_required");
    assert.equal(row.confirmed_minutes, null);
    assert.equal(row.time_unspecified_estimated_minutes, null);
    assert.equal(row.no_estimate_task_count, null);
    assert.equal(JSON.stringify(row).includes("task-inactive"), false);
  }
});

test("start-only work is counted in its week as time-unspecified exactly once", () => {
  const result = createPeopleWorkloadStage1({
    tenant_id: TENANT,
    as_of: "2026-07-30T00:00:00.000Z",
    employees: [{ tenant_id: TENANT, employee_id: "emp-1", display_name: "김변호사" }],
    user_id_by_employee_id: { "emp-1": "user-1" },
    identity_state_by_employee_id: { "emp-1": "resolved" },
    visible_matter_ids: ["matter-1"],
    tasks: [{
      tenant_id: TENANT,
      matter_id: "matter-1",
      task_id: "task-needs-end",
      status: "todo",
      assigned_to_user_id: "user-1",
      starts_at: "2026-07-30T02:00:00.000Z",
      estimated_minutes: 35,
    }],
  });
  assert.equal(result.rows[0].confirmed_minutes, 0);
  assert.equal(result.rows[0].time_unspecified_estimated_minutes, 35);
  assert.equal(result.rows[0].no_estimate_task_count, 0);
});
