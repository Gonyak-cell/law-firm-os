import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest } from "../../src/hrx-runtime-context.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT_ID = "tenant-a";
const CLOCK = "2026-07-30T10:00:00.000Z";

function request(context, actorId, pathname, method = "GET", body = {}, query = {}) {
  const manager = ["user-manager", "user-outsider"].includes(actorId);
  return handleHrxApiRequest({
    pathname,
    method,
    body,
    query,
    context,
    requestContext: {
      tenant_id: TENANT_ID,
      actor_id: actorId,
      actor_role: manager ? "lawos_partner" : "lawos_staff",
      hrx_scopes: [
        "hrx.attendance.self.read",
        "hrx.attendance.self.write",
        "hrx.overtime.self.read",
        "hrx.overtime.self.write",
        ...(manager ? ["hrx.overtime.team.read", "hrx.overtime.approve"] : []),
        "hrx.payroll.time-inputs.write",
      ],
      session_bound: true,
    },
  });
}

function runtime() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const context = createHrxRuntimeContext({
    store,
    seedRuntimeFixtures: false,
    clock: () => CLOCK,
    peopleFeatureFlags: { payroll_handoff: true },
  });
  for (const [employeeId, userId, displayName] of [
    ["emp-worker", "user-worker", "초과근로 신청자"],
    ["emp-manager", "user-manager", "초과근로 승인자"],
    ["emp-outsider", "user-outsider", "다른 팀 관리자"],
  ]) {
    context.repository.createEmployee({
      tenant_id: TENANT_ID,
      employee_id: employeeId,
      display_name: displayName,
      status: "active",
    });
    context.repository.createEmployeeUserLink({
      tenant_id: TENANT_ID,
      link_id: `link-${employeeId}`,
      employee_id: employeeId,
      user_id: userId,
      purpose: "login_mapping",
    });
  }
  context.repository.createEmploymentProfile({
    tenant_id: TENANT_ID,
    profile_id: "profile-worker",
    employee_id: "emp-worker",
    employment_type: "full_time",
    status: "active",
    title: "변호사",
    org_unit_id: "legal",
    manager_employee_id: "emp-manager",
    effective_from: "2026-01-01",
  });
  context.attendance.write({
    tenant_id: TENANT_ID,
    attendance_id: "attendance-overtime-api",
    employee_id: "emp-worker",
    work_date: "2026-07-29",
    status: "present",
    recorded_hours: 10,
    source_kind: "manual",
    source_ref: "TimeClock:attendance-overtime-api:v1",
  });
  return { store, context };
}

test("PEO-TUW-050 API derives calculated minutes, blocks self approval, and persists approved minutes", async () => {
  const value = runtime();
  try {
    const otherEmployeeSubmit = await request(
      value.context,
      "user-worker",
      "/api/hrx/overtime",
      "POST",
      {
        overtime_id: "overtime-other-employee-denied",
        employee_id: "emp-manager",
        work_date: "2026-07-29",
        requested_minutes: 60,
        reason: "다른 구성원 대신 신청",
      },
    );
    assert.equal(otherEmployeeSubmit.status, 403);
    assert.equal(otherEmployeeSubmit.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");

    const submitted = await request(
      value.context,
      "user-worker",
      "/api/hrx/overtime",
      "POST",
      {
        overtime_id: "overtime-api-handoff",
        employee_id: "emp-worker",
        work_date: "2026-07-29",
        requested_minutes: 180,
        reason: "긴급 서면 제출",
      },
    );
    assert.equal(submitted.status, 201);
    assert.deepEqual(
      [
        submitted.body.overtime.calculated_minutes,
        submitted.body.overtime.requested_minutes,
        submitted.body.overtime.approved_minutes,
      ],
      [120, 180, 0],
    );
    assert.deepEqual(
      JSON.parse(submitted.body.overtime.warning_codes_json),
      ["OVERTIME_REQUEST_EXCEEDS_CALCULATED"],
    );

    const ownList = await request(
      value.context,
      "user-worker",
      "/api/hrx/overtime",
      "GET",
      {},
      { employee_id: "emp-worker", month: "2026-07" },
    );
    assert.equal(ownList.status, 200);
    assert.equal(ownList.body.overtime.length, 1);

    const outsiderList = await request(
      value.context,
      "user-outsider",
      "/api/hrx/overtime",
      "GET",
      {},
      { employee_id: "emp-worker", month: "2026-07" },
    );
    assert.equal(outsiderList.status, 403);
    assert.equal(outsiderList.body.safe_error_code, "HRX_OVERTIME_SCOPE_DENIED");

    const selfApproval = await request(
      value.context,
      "user-worker",
      "/api/hrx/overtime/overtime-api-handoff/approve",
      "POST",
      {
        approved_minutes: 90,
        decision_reason: "본인 승인 시도",
      },
    );
    assert.equal(selfApproval.status, 409);
    assert.equal(selfApproval.body.safe_error_code, "HRX_OVERTIME_SELF_APPROVAL");

    const outOfScopeApproval = await request(
      value.context,
      "user-outsider",
      "/api/hrx/overtime/overtime-api-handoff/approve",
      "POST",
      {
        approved_minutes: 90,
        decision_reason: "담당 범위 밖 승인 시도",
      },
    );
    assert.equal(outOfScopeApproval.status, 403);
    assert.equal(outOfScopeApproval.body.safe_error_code, "HRX_OVERTIME_REVIEW_DENIED");

    const managerList = await request(
      value.context,
      "user-manager",
      "/api/hrx/overtime",
      "GET",
      {},
      { employee_id: "emp-worker", month: "2026-07" },
    );
    assert.equal(managerList.status, 200);
    assert.equal(managerList.body.overtime.length, 1);

    const approved = await request(
      value.context,
      "user-manager",
      "/api/hrx/overtime/overtime-api-handoff/approve",
      "POST",
      {
        approved_minutes: 90,
        decision_reason: "출퇴근기록과 업무 사유 확인",
      },
    );
    assert.equal(approved.status, 200);
    assert.deepEqual(
      [
        approved.body.overtime.calculated_minutes,
        approved.body.overtime.requested_minutes,
        approved.body.overtime.approved_minutes,
      ],
      [120, 180, 90],
    );
    assert.equal(approved.body.overtime.approver_id, "user-manager");

    const attendanceApproval = await request(
      value.context,
      "user-manager",
      "/api/hrx/payroll/attendance-approvals",
      "POST",
      {
        attendance_id: "attendance-overtime-api",
        idempotency_key: "attendance-overtime-api:v1",
      },
    );
    assert.equal(attendanceApproval.status, 201);
    assert.equal(
      attendanceApproval.body.approval_receipt.attendance_source_ref,
      "TimeClock:attendance-overtime-api:v1",
    );
  } finally {
    value.store.close();
  }
});
