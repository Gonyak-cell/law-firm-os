import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest } from "../../src/hrx-runtime-context.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

function call(context, {
  tenantId = "tenant-a",
  pathname,
  method = "GET",
  body = {},
  query = {},
} = {}) {
  return handleHrxApiRequest({
    pathname,
    method,
    body,
    query,
    context,
    requestContext: {
      tenant_id: tenantId,
      actor_id: `attendance-admin:${tenantId}`,
      actor_role: "hr_admin",
      hrx_scopes: ["hrx.attendance.read", "hrx.attendance.write"],
      session_bound: true,
    },
  });
}

test("attendance API preserves the original and summarizes only the effective KST correction", () => {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const context = createHrxRuntimeContext({ store, seedRuntimeFixtures: false });
  context.repository.createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-attendance",
    display_name: "근태 계약 검수",
    status: "active",
  });
  context.repository.createEmployeeUserLink({
    tenant_id: "tenant-a",
    link_id: "link-attendance-contract",
    employee_id: "emp-attendance",
    user_id: "attendance-admin:tenant-a",
    purpose: "login_mapping",
  });

  const originalInput = {
    attendance_id: "att-original",
    employee_id: "emp-attendance",
    work_date: "2026-07-14",
    status: "present",
    source_ref: "TimeClock:att-original",
    source_kind: "manual",
    recorded_hours: 8,
    clock_in_at: "2026-07-14T09:00:00+09:00",
    clock_out_at: "2026-07-14T18:00:00+09:00",
  };
  assert.equal(call(context, {
    pathname: "/api/hrx/attendance",
    method: "POST",
    body: originalInput,
  }).status, 201);
  const originalSnapshot = context.attendance.get({
    tenant_id: "tenant-a",
    attendance_id: "att-original",
  });

  const corrected = call(context, {
    pathname: "/api/hrx/attendance/att-original/correct",
    method: "POST",
    body: {
      attendance_id: "att-correction",
      source_ref: "AttendanceCorrection:approved:001",
      correction_reason: "승인된 퇴근시간 정정",
      recorded_hours: 7.5,
      clock_in_at: "2026-07-14T09:00:00+09:00",
      clock_out_at: "2026-07-14T17:30:00+09:00",
    },
  });
  assert.equal(corrected.status, 200);
  assert.equal(corrected.body.attendance.correction_of_attendance_id, "att-original");
  assert.deepEqual(
    context.attendance.get({ tenant_id: "tenant-a", attendance_id: "att-original" }),
    originalSnapshot,
  );

  const listed = call(context, {
    pathname: "/api/hrx/attendance",
    query: { employee_id: "emp-attendance", month: "2026-07" },
  });
  assert.equal(listed.status, 200);
  assert.equal(listed.body.monthly_summary.record_count, 2);
  assert.equal(listed.body.monthly_summary.effective_record_count, 1);
  assert.equal(listed.body.monthly_summary.correction_count, 1);
  assert.equal(listed.body.monthly_summary.total_recorded_hours, 7.5);

  const duplicate = call(context, {
    pathname: "/api/hrx/attendance/att-original/correct",
    method: "POST",
    body: {
      attendance_id: "att-correction-duplicate",
      source_ref: "AttendanceCorrection:duplicate",
      correction_reason: "중복 정정",
    },
  });
  assert.equal(duplicate.status, 400);
  assert.match(duplicate.body.reason, /already corrected/);

  const otherTenant = call(context, {
    tenantId: "tenant-b",
    pathname: "/api/hrx/attendance",
    query: { attendance_id: "att-original" },
  });
  assert.equal(otherTenant.status, 200);
  assert.deepEqual(otherTenant.body.attendance, []);
  assert.equal(otherTenant.body.monthly_summary.effective_record_count, 0);
  store.close();
});

test("attendance API rejects ambiguous or timezone-free timestamps", () => {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const context = createHrxRuntimeContext({ store, seedRuntimeFixtures: false });
  context.repository.createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-attendance",
    display_name: "근태 시간 검수",
    status: "active",
  });
  context.repository.createEmployeeUserLink({
    tenant_id: "tenant-a",
    link_id: "link-attendance-time-validation",
    employee_id: "emp-attendance",
    user_id: "attendance-admin:tenant-a",
    purpose: "login_mapping",
  });

  const invalid = call(context, {
    pathname: "/api/hrx/attendance",
    method: "POST",
    body: {
      attendance_id: "att-no-timezone",
      employee_id: "emp-attendance",
      work_date: "2026-07-14",
      status: "present",
      source_ref: "TimeClock:invalid",
      clock_in_at: "2026-07-14T09:00:00",
      clock_out_at: "2026-07-14T18:00:00",
    },
  });
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.reason, /explicit timezone/);
  assert.equal(
    context.attendance.list({ tenant_id: "tenant-a", attendance_id: "att-no-timezone" }).length,
    0,
  );
  store.close();
});
