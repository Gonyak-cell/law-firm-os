import assert from "node:assert/strict";
import test from "node:test";
import { createHrxRuntimeContext, handleHrxApiRequest } from "../../src/hrx-runtime-context.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";

const TENANT_ID = "tenant-a";
const CLOCK = "2026-07-20T09:00:00.000Z";

function request(context, actor, pathname, method = "GET", body = {}, query = {}) {
  return handleHrxApiRequest({
    pathname,
    method,
    body,
    query,
    context,
    requestContext: {
      tenant_id: TENANT_ID,
      actor_id: actor.actor_id,
      actor_role: actor.actor_role,
      hrx_scopes: ["hrx.attendance.read", "hrx.attendance.write"],
      session_bound: true,
    },
  });
}

function createRuntime({ workflowEnabled = true } = {}) {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  const context = createHrxRuntimeContext({
    store,
    seedRuntimeFixtures: false,
    clock: () => CLOCK,
    peopleFeatureFlags: {
      attendance_correction_workflow: workflowEnabled,
    },
  });
  context.repository.createEmployee({
    tenant_id: TENANT_ID,
    employee_id: "emp-worker",
    display_name: "정정 요청 구성원",
    status: "active",
  });
  context.repository.createEmployee({
    tenant_id: TENANT_ID,
    employee_id: "emp-manager",
    display_name: "정정 승인 관리자",
    status: "active",
  });
  context.repository.createEmployeeUserLink({
    tenant_id: TENANT_ID,
    link_id: "link-worker",
    employee_id: "emp-worker",
    user_id: "user-worker",
    purpose: "login_mapping",
  });
  context.repository.createEmployeeUserLink({
    tenant_id: TENANT_ID,
    link_id: "link-manager",
    employee_id: "emp-manager",
    user_id: "user-manager",
    purpose: "login_mapping",
  });
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
  return { store, context };
}

function writeAttendance(context, attendanceId, workDate) {
  return context.attendance.write({
    tenant_id: TENANT_ID,
    attendance_id: attendanceId,
    employee_id: "emp-worker",
    work_date: workDate,
    status: "present",
    source_ref: `TimeClock:${attendanceId}`,
    source_kind: "manual",
    recorded_hours: 8,
    clock_in_at: `${workDate}T09:00:00+09:00`,
    clock_out_at: `${workDate}T18:00:00+09:00`,
  });
}

test("attendance correction request is inert until another reviewer approves it", () => {
  const runtime = createRuntime();
  const { context } = runtime;
  writeAttendance(context, "att-api-original", "2026-07-14");
  const worker = { actor_id: "user-worker", actor_role: "employee" };
  const manager = { actor_id: "user-manager", actor_role: "manager" };

  const listed = request(
    context,
    worker,
    "/api/hrx/attendance",
    "GET",
    {},
    { employee_id: "emp-worker", month: "2026-07" },
  );
  assert.equal(listed.status, 200);
  const source = listed.body.attendance.find(
    (record) => record.attendance_id === "att-api-original",
  );
  assert.match(source.source_version, /^sha256:[a-f0-9]{64}$/);

  const requested = request(
    context,
    worker,
    "/api/hrx/attendance/att-api-original/correction-requests",
    "POST",
    {
      correction_request_id: "correction-api-001",
      expected_source_version: source.source_version,
      reason: "퇴근시간 입력 오류",
      evidence_ref: "Document:attendance:correction-api-001",
      requested_changes: {
        recorded_hours: 7.5,
        clock_out_at: "2026-07-14T17:30:00+09:00",
      },
    },
  );
  assert.equal(requested.status, 201);
  assert.equal(requested.body.correction_request.state, "pending");
  assert.equal(requested.body.correction_request.state_version, 1);
  assert.equal(context.attendance.list({ tenant_id: TENANT_ID }).length, 1);

  const beforeApproval = request(
    context,
    worker,
    "/api/hrx/attendance",
    "GET",
    {},
    { employee_id: "emp-worker", month: "2026-07" },
  );
  assert.equal(beforeApproval.body.monthly_summary.record_count, 1);
  assert.equal(beforeApproval.body.monthly_summary.total_recorded_hours, 8);

  const selfApproval = request(
    context,
    worker,
    "/api/hrx/attendance/correction-requests/correction-api-001/approve",
    "POST",
    {
      expected_state_version: 1,
      review_reason: "본인 승인 시도",
    },
  );
  assert.equal(selfApproval.status, 409);
  assert.equal(
    selfApproval.body.safe_error_code,
    "HRX_ATTENDANCE_CORRECTION_SELF_APPROVAL_BLOCKED",
  );

  const staleDecision = request(
    context,
    manager,
    "/api/hrx/attendance/correction-requests/correction-api-001/approve",
    "POST",
    {
      expected_state_version: 2,
      review_reason: "오래된 화면에서 승인",
    },
  );
  assert.equal(staleDecision.status, 409);
  assert.equal(
    staleDecision.body.safe_error_code,
    "HRX_ATTENDANCE_CORRECTION_VERSION_CONFLICT",
  );

  const approved = request(
    context,
    manager,
    "/api/hrx/attendance/correction-requests/correction-api-001/approve",
    "POST",
    {
      expected_state_version: 1,
      review_reason: "원본 자료 대조 완료",
    },
  );
  assert.equal(approved.status, 200);
  assert.equal(approved.body.correction_request.state, "approved");
  assert.equal(approved.body.attendance.correction_of_attendance_id, "att-api-original");

  const afterApproval = request(
    context,
    worker,
    "/api/hrx/attendance",
    "GET",
    {},
    { employee_id: "emp-worker", month: "2026-07" },
  );
  assert.equal(afterApproval.body.monthly_summary.record_count, 2);
  assert.equal(afterApproval.body.monthly_summary.effective_record_count, 1);
  assert.equal(afterApproval.body.monthly_summary.total_recorded_hours, 7.5);
  assert.equal(
    context.audit.list({ tenant_id: TENANT_ID })
      .some((event) => event.action === "hrx.attendance.correction.approve"),
    true,
  );
  runtime.store.close();
});

test("rejection, duplicate decision, stale source and workflow flag boundaries fail closed", () => {
  const runtime = createRuntime();
  const { context } = runtime;
  writeAttendance(context, "att-api-reject", "2026-07-15");
  const worker = { actor_id: "user-worker", actor_role: "employee" };
  const manager = { actor_id: "user-manager", actor_role: "manager" };
  const listed = request(
    context,
    worker,
    "/api/hrx/attendance",
    "GET",
    {},
    { employee_id: "emp-worker", month: "2026-07" },
  );
  const source = listed.body.attendance[0];

  assert.equal(request(
    context,
    worker,
    "/api/hrx/attendance/att-api-reject/correction-requests",
    "POST",
    {
      correction_request_id: "correction-api-reject",
      expected_source_version: source.source_version,
      reason: "정정 요청",
      requested_changes: { recorded_hours: 7 },
    },
  ).status, 201);

  const rejected = request(
    context,
    manager,
    "/api/hrx/attendance/correction-requests/correction-api-reject/reject",
    "POST",
    {
      expected_state_version: 1,
      review_reason: "근거 자료 불충분",
    },
  );
  assert.equal(rejected.status, 200);
  assert.equal(rejected.body.correction_request.state, "rejected");
  assert.equal(rejected.body.attendance, null);
  assert.equal(context.attendance.list({ tenant_id: TENANT_ID }).length, 1);
  assert.equal(request(
    context,
    manager,
    "/api/hrx/attendance/correction-requests/correction-api-reject/reject",
    "POST",
    {
      expected_state_version: 2,
      review_reason: "중복 반려",
    },
  ).body.safe_error_code, "HRX_ATTENDANCE_CORRECTION_ALREADY_DECIDED");

  const staleSource = request(
    context,
    worker,
    "/api/hrx/attendance/att-api-reject/correction-requests",
    "POST",
    {
      correction_request_id: "correction-api-stale-source",
      expected_source_version: "sha256:".concat("0".repeat(64)),
      reason: "오래된 원본",
      requested_changes: { recorded_hours: 6 },
    },
  );
  assert.equal(staleSource.status, 409);
  assert.equal(
    staleSource.body.safe_error_code,
    "HRX_ATTENDANCE_CORRECTION_SOURCE_STALE",
  );

  const directCorrection = request(
    context,
    manager,
    "/api/hrx/attendance/att-api-reject/correct",
    "POST",
    {
      attendance_id: "att-direct-blocked",
      source_ref: "AttendanceCorrection:direct",
      correction_reason: "직접 정정",
    },
  );
  assert.equal(directCorrection.status, 409);
  assert.equal(
    directCorrection.body.safe_error_code,
    "HRX_ATTENDANCE_CORRECTION_WORKFLOW_REQUIRED",
  );
  runtime.store.close();

  const fallback = createRuntime({ workflowEnabled: false });
  writeAttendance(fallback.context, "att-direct", "2026-07-16");
  assert.equal(request(
    fallback.context,
    { actor_id: "people-admin", actor_role: "hr_admin" },
    "/api/hrx/attendance/att-direct/correct",
    "POST",
    {
      attendance_id: "att-direct-correction",
      source_ref: "AttendanceCorrection:legacy-admin",
      correction_reason: "기능 플래그 비활성 관리자 정정",
      recorded_hours: 7,
    },
  ).status, 200);
  assert.equal(request(
    fallback.context,
    worker,
    "/api/hrx/attendance/att-direct/correction-requests",
    "POST",
    {},
  ).body.safe_error_code, "HRX_ATTENDANCE_CORRECTION_WORKFLOW_DISABLED");
  fallback.store.close();
});
