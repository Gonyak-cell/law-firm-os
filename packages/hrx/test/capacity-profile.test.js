import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCapacityUtilization,
  createCapacityProfile,
  createInMemoryCapacityProfileStore,
} from "../src/capacity-profile.js";

test("capacity profile uses weekly available hours as utilization denominator", () => {
  const profile = createCapacityProfile({
    tenant_id: "tenant-a",
    capacity_profile_id: "cap-001",
    employee_id: "emp-001",
    effective_from: "2026-06-20",
    weekly_available_hours: 40,
    target_utilization_pct: 75,
    reserved_pct: 10,
  });
  const utilization = calculateCapacityUtilization({
    profile,
    billable_hours: 30,
    non_billable_hours: 5,
  });
  assert.equal(utilization.denominator_hours, 40);
  assert.equal(utilization.utilization_pct, 75);
  assert.equal(utilization.total_load_pct, 87.5);
  assert.equal(utilization.status, "on_target");
});

test("capacity profile blocks invalid denominator and impossible allocation", () => {
  assert.throws(
    () =>
      createCapacityProfile({
        tenant_id: "tenant-a",
        capacity_profile_id: "cap-001",
        employee_id: "emp-001",
        effective_from: "2026-06-20",
        weekly_available_hours: 0,
      }),
    /weekly_available_hours/,
  );
  assert.throws(
    () =>
      createCapacityProfile({
        tenant_id: "tenant-a",
        capacity_profile_id: "cap-002",
        employee_id: "emp-001",
        effective_from: "2026-06-20",
        weekly_available_hours: 40,
        target_utilization_pct: 90,
        reserved_pct: 20,
      }),
    /must not exceed 100/,
  );
});

test("capacity profile store remains tenant-scoped", () => {
  const store = createInMemoryCapacityProfileStore([
    {
      tenant_id: "tenant-a",
      capacity_profile_id: "cap-a",
      employee_id: "emp-001",
      effective_from: "2026-06-20",
      weekly_available_hours: 40,
    },
    {
      tenant_id: "tenant-b",
      capacity_profile_id: "cap-b",
      employee_id: "emp-001",
      effective_from: "2026-06-20",
      weekly_available_hours: 32,
    },
  ]);
  assert.equal(store.list({ tenant_id: "tenant-a" }).length, 1);
  assert.equal(store.get({ tenant_id: "tenant-b", capacity_profile_id: "cap-b" }).weekly_available_hours, 32);
});
