import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest } from "../../src/hrx-runtime-context.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT_ID = "tenant-a";
const ELEVATED_ROLES = Object.freeze(["people_ops", "hr_admin", "hr_manager", "lawos_hr"]);

function request(context, { actorId, actorRole, pathname, body }) {
  return handleHrxApiRequest({
    pathname,
    method: "POST",
    body,
    context,
    requestContext: {
      tenant_id: TENANT_ID,
      actor_id: actorId,
      actor_role: actorRole,
      hrx_scopes: [
        "hrx.attendance.self.write",
        "hrx.overtime.self.write",
        "hrx.attendance.read",
        "hrx.overtime.team.read",
      ],
      session_bound: true,
    },
  });
}

function runtime() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const context = createHrxRuntimeContext({ store, seedRuntimeFixtures: false });
  context.repository.createEmployee({
    tenant_id: TENANT_ID,
    employee_id: "emp-target",
    display_name: "대리 신청 대상",
    status: "active",
  });
  for (const role of ELEVATED_ROLES) {
    const actorId = `user-${role}`;
    const employeeId = `emp-${role}`;
    context.repository.createEmployee({
      tenant_id: TENANT_ID,
      employee_id: employeeId,
      display_name: `${role} 본인`,
      status: "active",
    });
    context.repository.createEmployeeUserLink({
      tenant_id: TENANT_ID,
      link_id: `link-${role}`,
      employee_id: employeeId,
      user_id: actorId,
      purpose: "login_mapping",
    });
  }
  return { store, context };
}

test("PEO-FIX-049 elevated People roles cannot proxy attendance or overtime through self-service writes", () => {
  const value = runtime();
  try {
    for (const role of ELEVATED_ROLES) {
      const actorId = `user-${role}`;
      const attendance = request(value.context, {
        actorId,
        actorRole: role,
        pathname: "/api/hrx/attendance",
        body: {
          attendance_id: `attendance-proxy-${role}`,
          employee_id: "emp-target",
          work_date: "2026-07-31",
          status: "present",
          source_ref: `TimeClock:proxy:${role}`,
        },
      });
      assert.equal(attendance.status, 403, `${role} attendance proxy write`);
      assert.equal(attendance.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");
      assert.equal(attendance.body.attendance, null);

      const overtime = request(value.context, {
        actorId,
        actorRole: role,
        pathname: "/api/hrx/overtime",
        body: {
          overtime_id: `overtime-proxy-${role}`,
          employee_id: "emp-target",
          work_date: "2026-07-31",
          requested_minutes: 60,
          reason: "대리 신청 시도",
        },
      });
      assert.equal(overtime.status, 403, `${role} overtime proxy write`);
      assert.equal(overtime.body.safe_error_code, "HRX_SELF_SERVICE_SCOPE_DENIED");
      assert.equal(overtime.body.overtime, null);

      const ownEmployeeId = `emp-${role}`;
      const ownAttendance = request(value.context, {
        actorId,
        actorRole: role,
        pathname: "/api/hrx/attendance",
        body: {
          attendance_id: `attendance-own-${role}`,
          employee_id: ownEmployeeId,
          work_date: "2026-07-30",
          status: "present",
          recorded_hours: 9,
          source_ref: `TimeClock:own:${role}`,
        },
      });
      assert.equal(ownAttendance.status, 201, `${role} own attendance write`);
      assert.equal(ownAttendance.body.attendance.employee_id, ownEmployeeId);

      const ownOvertime = request(value.context, {
        actorId,
        actorRole: role,
        pathname: "/api/hrx/overtime",
        body: {
          overtime_id: `overtime-own-${role}`,
          employee_id: ownEmployeeId,
          work_date: "2026-07-30",
          requested_minutes: 60,
          reason: "본인 초과근로 신청",
        },
      });
      assert.equal(ownOvertime.status, 201, `${role} own overtime write`);
      assert.equal(ownOvertime.body.overtime.employee_id, ownEmployeeId);
    }
  } finally {
    value.store.close();
  }
});

test("PEO-FIX-050 overtime without an attendance basis returns a stable domain error", () => {
  const value = runtime();
  try {
    const result = request(value.context, {
      actorId: "user-people_ops",
      actorRole: "people_ops",
      pathname: "/api/hrx/overtime",
      body: {
        overtime_id: "overtime-no-attendance",
        employee_id: "emp-people_ops",
        work_date: "2026-07-31",
        requested_minutes: 60,
        reason: "출퇴근 기록 없는 날 신청",
      },
    });
    assert.equal(result.status, 409);
    assert.equal(result.body.safe_error_code, "HRX_OVERTIME_ATTENDANCE_REQUIRED");
    assert.equal(
      result.body.reason,
      "출퇴근 기록이 있는 근무일에만 초과근로를 신청할 수 있습니다",
    );
    assert.equal(value.context.overtime.list({ tenant_id: TENANT_ID }).length, 0);
  } finally {
    value.store.close();
  }
});
