import assert from "node:assert/strict";
import test from "node:test";
import { createHrxMatterWorkloadProjection } from "../src/hrx-workload-projection.js";

test("HRX matter workload projection aggregates by employee", () => {
  const projection = createHrxMatterWorkloadProjection({
    tenant_id: "tenant-a",
    assignments: [
      {
        tenant_id: "tenant-a",
        employee_id: "emp-001",
        matter_id: "matter-001",
        client_id: "client-secret",
        client_name: "Sensitive Client",
        hours: 5.25,
        capacity_pct: 10,
      },
      {
        tenant_id: "tenant-a",
        employee_id: "emp-001",
        matter_id: "matter-002",
        client_name: "Another Sensitive Client",
        hours: 2,
        capacity_pct: 5,
        billable: false,
      },
      {
        tenant_id: "tenant-b",
        employee_id: "emp-001",
        matter_id: "matter-other-tenant",
        hours: 99,
      },
    ],
  });
  assert.deepEqual(projection, [
    {
      tenant_id: "tenant-a",
      employee_id: "emp-001",
      workload_source: "assignment_fallback",
      time_entry_count: 0,
      matter_count: 2,
      total_hours: 7.25,
      billable_hours: 5.25,
      non_billable_hours: 2,
      capacity_pct: 15,
      leave_deadline_conflict_count: 0,
      leave_deadline_conflicts: [],
    },
  ]);
});

test("HRX matter workload projection aggregates real time entries before assignment fallback", () => {
  const projection = createHrxMatterWorkloadProjection({
    tenant_id: "tenant-a",
    assignments: [
      {
        tenant_id: "tenant-a",
        employee_id: "emp-001",
        matter_id: "assignment-only",
        hours: 99,
        capacity_pct: 99,
      },
    ],
    time_entries: [
      {
        tenant_id: "tenant-a",
        employee_id: "emp-001",
        matter_id: "matter-001",
        duration_minutes: 90,
        billable: true,
      },
      {
        tenant_id: "tenant-a",
        employee_id: "emp-001",
        matter_id: "matter-002",
        duration_minutes: 30,
        billable: false,
      },
    ],
  });

  assert.equal(projection.length, 1);
  assert.equal(projection[0].workload_source, "time_entry_aggregation");
  assert.equal(projection[0].time_entry_count, 2);
  assert.equal(projection[0].matter_count, 2);
  assert.equal(projection[0].total_hours, 2);
  assert.equal(projection[0].billable_hours, 1.5);
  assert.equal(projection[0].non_billable_hours, 0.5);
  assert.equal(projection[0].capacity_pct, 5);
});

test("HRX matter workload projection flags leave-deadline conflicts", () => {
  const [row] = createHrxMatterWorkloadProjection({
    tenant_id: "tenant-a",
    time_entries: [
      {
        tenant_id: "tenant-a",
        employee_id: "emp-001",
        matter_id: "matter-001",
        duration_minutes: 60,
        billable: true,
      },
    ],
    leave_requests: [
      {
        tenant_id: "tenant-a",
        request_id: "leave-001",
        employee_id: "emp-001",
        start_date: "2026-07-15",
        end_date: "2026-07-16",
        state: "approved",
      },
    ],
    deadlines: [
      {
        tenant_id: "tenant-a",
        deadline_id: "deadline-001",
        employee_id: "emp-001",
        matter_id: "matter-001",
        due_date: "2026-07-15",
      },
    ],
  });

  assert.equal(row.leave_deadline_conflict_count, 1);
  assert.deepEqual(row.leave_deadline_conflicts, [
    {
      conflict_id: "deadline-001:leave-001",
      deadline_id: "deadline-001",
      leave_request_id: "leave-001",
      conflict_date: "2026-07-15",
      conflict_type: "leave_deadline_overlap",
      warning_only: true,
    },
  ]);
});

test("HRX matter workload projection omits client detail", () => {
  const [row] = createHrxMatterWorkloadProjection({
    tenant_id: "tenant-a",
    assignments: [
      {
        tenant_id: "tenant-a",
        employee_id: "emp-001",
        matter_id: "matter-001",
        client_id: "client-secret",
        client_name: "Sensitive Client",
        hours: 1,
      },
    ],
  });
  assert.equal(Object.hasOwn(row, "client_id"), false);
  assert.equal(Object.hasOwn(row, "client_name"), false);
  assert.equal(Object.hasOwn(row, "matter_id"), false);
});
