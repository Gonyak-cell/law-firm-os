import assert from "node:assert/strict";
import test from "node:test";
import { createSqlLeaveBalanceLedger } from "../src/leave/balance.js";
import { createDurableLeaveManagementService } from "../src/leave/management-service.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-people-leave-request";
const EMPLOYEE = "employee-leave-request";
const APPLICANT = "actor-leave-applicant";
const MANAGER = "actor-leave-manager";
const NOW = "2026-07-30T01:00:00.000Z";

function stableId(prefix, key = "id") {
  return `${prefix}_${String(key).replace(/[^a-zA-Z0-9]+/g, "_")}`;
}

function createHarness() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  createSqlHrxRepository({ store, clock: () => NOW }).createEmployee({
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    display_name: "김아민",
    status: "active",
  });
  store.query("insert", {
    table: "hrx_leave_groups",
    row: {
      tenant_id: TENANT,
      group_id: "group-annual",
      code: "PAID_TIME",
      display_name: "연차",
      status: "active",
      state_version: 1,
    },
  });
  store.query("insert", {
    table: "hrx_leave_types",
    row: {
      tenant_id: TENANT,
      leave_type_id: "type-annual",
      group_id: "group-annual",
      code: "ANNUAL",
      display_name: "연차",
      request_unit: "minutes",
      evidence_rule_json: "{}",
      status: "active",
    },
  });
  store.query("insert", {
    table: "hrx_leave_policy_versions",
    row: {
      tenant_id: TENANT,
      policy_version_id: "policy-annual-2026-v1",
      group_id: "group-annual",
      policy_code: "ANNUAL-2026",
      version: 1,
      effective_from: "2026-01-01",
      effective_to: null,
      status: "active",
      rules_json: JSON.stringify({
        type_rules: {
          "type-annual": {
            usage_modes: ["full_day", "half_day", "quarter_day", "hours"],
          },
        },
      }),
    },
  });
  store.query("insert", {
    table: "hrx_work_schedule_profiles",
    row: {
      tenant_id: TENANT,
      schedule_profile_id: "schedule-seoul",
      display_name: "서울 표준 근무",
      timezone: "Asia/Seoul",
      weekly_schedule_json: JSON.stringify({
        1: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }],
        2: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }],
        3: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }],
        4: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }],
        5: [{ start: "09:00", end: "12:00" }, { start: "13:00", end: "18:00" }],
      }),
      holiday_calendar_ref: "KR_PUBLIC_HOLIDAYS",
      effective_from: "2026-01-01",
      effective_to: null,
      state_version: 1,
    },
  });
  store.query("insert", {
    table: "hrx_work_schedule_assignments",
    row: {
      tenant_id: TENANT,
      schedule_assignment_id: "schedule-assignment",
      schedule_profile_id: "schedule-seoul",
      employee_id: EMPLOYEE,
      organization_id: null,
      priority: 100,
      effective_from: "2026-01-01",
      effective_to: null,
    },
  });
  const service = createDurableLeaveManagementService({
    store,
    clock: () => NOW,
    idFactory: stableId,
    approverResolver: () => ({
      actor_id: MANAGER,
      source_assignment_version: "reporting-line-v1",
      valid_from: "2026-01-01T00:00:00.000Z",
      valid_to: null,
    }),
  });
  return { store, service };
}

function request(overrides = {}) {
  return {
    idempotency_key: "leave-request-submit",
    request_id: "leave-request-001",
    employee_id: EMPLOYEE,
    leave_type_id: "type-annual",
    policy_version_id: "policy-annual-2026-v1",
    duration_mode: "hours",
    requested_minutes: 120,
    start_date: "2026-08-03",
    end_date: "2026-08-03",
    ...overrides,
  };
}

test("minute request persists through approval ledger readback and rejects insufficient or overlapping use", async () => {
  const { store, service } = createHarness();
  await service.grantEntitlement(
    { tenant_id: TENANT, actor_id: "actor-people-ops" },
    {
      idempotency_key: "grant-annual-2026",
      entitlement_id: "entitlement-annual-2026",
      employee_id: EMPLOYEE,
      group_id: "group-annual",
      policy_version_id: "policy-annual-2026-v1",
      granted_minutes: 480,
      valid_from: "2026-01-01",
      expires_on: "2026-12-31",
      source_ref: "LeaveAccrualRun:2026",
    },
  );

  const preview = await service.preview(
    { tenant_id: TENANT, actor_id: APPLICANT },
    request(),
  );
  assert.equal(preview.schedule.requested_minutes, 120);
  assert.deepEqual(preview.schedule.segments[0].leave_periods, [
    { start: "09:00", end: "11:00", minutes: 120 },
  ]);
  assert.equal(preview.available_after_minutes, 360);

  const submitted = await service.submit(
    { tenant_id: TENANT, actor_id: APPLICANT },
    request(),
  );
  assert.equal(submitted.leave_request.state, "submitted");
  let balance = createSqlLeaveBalanceLedger({ store }).balance({
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    group_id: "group-annual",
  });
  assert.equal(balance.available_minutes, 360);
  assert.equal(balance.reserved_minutes, 120);

  await assert.rejects(
    service.preview(
      { tenant_id: TENANT, actor_id: APPLICANT },
      request({
        request_id: "leave-request-overlap",
        idempotency_key: "leave-request-overlap",
        requested_minutes: 60,
      }),
    ),
    (error) => error.safe_error_code === "HRX_LEAVE_REQUEST_OVERLAP",
  );
  await assert.rejects(
    service.preview(
      { tenant_id: TENANT, actor_id: APPLICANT },
      request({
        request_id: "leave-request-insufficient",
        idempotency_key: "leave-request-insufficient",
        requested_minutes: 480,
        start_date: "2026-08-04",
        end_date: "2026-08-04",
      }),
    ),
    (error) => error.safe_error_code === "HRX_LEAVE_BALANCE_INSUFFICIENT",
  );

  const approved = await service.approve(
    { tenant_id: TENANT, actor_id: MANAGER },
    {
      idempotency_key: "leave-request-approve",
      request_id: "leave-request-001",
      applicant_actor_ids: [APPLICANT, EMPLOYEE],
      decision_reason: "인수인계 확인",
    },
  );
  assert.equal(approved.leave_request.state, "approved");
  balance = createSqlLeaveBalanceLedger({ store }).balance({
    tenant_id: TENANT,
    employee_id: EMPLOYEE,
    group_id: "group-annual",
  });
  assert.equal(balance.available_minutes, 360);
  assert.equal(balance.reserved_minutes, 0);
  assert.equal(balance.used_minutes, 120);
  assert.equal(
    store.query("selectOne", {
      table: "hrx_leave_requests",
      where: { tenant_id: TENANT, request_id: "leave-request-001" },
    }).state,
    "approved",
  );
  store.close();
});
