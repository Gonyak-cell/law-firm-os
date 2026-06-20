import assert from "node:assert/strict";
import test from "node:test";
import { createHrxPeopleAnalyticsReadModel } from "../src/analytics.js";

test("people analytics read model is tenant scoped across headcount leave recruiting and workload", () => {
  const analytics = createHrxPeopleAnalyticsReadModel({
    tenant_id: "tenant-a",
    employees: [
      { tenant_id: "tenant-a", employee_id: "emp-001", status: "active", display_name: "Ari" },
      { tenant_id: "tenant-a", employee_id: "emp-002", status: "on_leave", display_name: "Mina" },
      { tenant_id: "tenant-a", employee_id: "emp-003", status: "terminated", display_name: "Terminated" },
      { tenant_id: "tenant-b", employee_id: "emp-other", status: "active", display_name: "Other" },
    ],
    leave_requests: [
      { tenant_id: "tenant-a", request_id: "leave-001", state: "approved", amount: 8 },
      { tenant_id: "tenant-a", request_id: "leave-002", state: "submitted", amount: 4 },
      { tenant_id: "tenant-b", request_id: "leave-other", state: "approved", amount: 99 },
    ],
    applications: [
      { tenant_id: "tenant-a", application_id: "app-001", stage: "interview" },
      { tenant_id: "tenant-a", application_id: "app-002", stage: "offer" },
      { tenant_id: "tenant-b", application_id: "app-other", stage: "hired" },
    ],
    workload_projection: [
      { tenant_id: "tenant-a", employee_id: "emp-001", total_hours: 10, capacity_pct: 20 },
      { tenant_id: "tenant-a", employee_id: "emp-002", total_hours: 5, capacity_pct: 10 },
      { tenant_id: "tenant-b", employee_id: "emp-other", total_hours: 99, capacity_pct: 99 },
    ],
  });

  assert.equal(analytics.headcount.total, 3);
  assert.equal(analytics.metric_grain, "tenant_aggregate");
  assert.equal(analytics.privacy.employee_identifiers_included, false);
  assert.equal(analytics.headcount.active, 1);
  assert.equal(analytics.leave.approved_hours, 8);
  assert.equal(analytics.recruiting_funnel.offer_count, 1);
  assert.equal(analytics.workload.total_hours, 15);
  assert.equal(analytics.workload.average_capacity_pct, 15);
});

test("people analytics read model omits row-level sensitive details", () => {
  const analytics = createHrxPeopleAnalyticsReadModel({
    tenant_id: "tenant-a",
    employees: [{ tenant_id: "tenant-a", employee_id: "emp-001", status: "active", salary: 123456 }],
    leave_requests: [],
    applications: [],
    workload_projection: [],
  });

  const serialized = JSON.stringify(analytics);
  assert.equal(analytics.row_level_details_included, false);
  assert.equal(serialized.includes("emp-001"), false);
  assert.equal(serialized.includes("salary"), false);
  assert.equal(serialized.includes("123456"), false);
});
