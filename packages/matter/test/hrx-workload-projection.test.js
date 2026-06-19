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
      matter_count: 2,
      total_hours: 7.25,
      billable_hours: 5.25,
      non_billable_hours: 2,
      capacity_pct: 15,
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
