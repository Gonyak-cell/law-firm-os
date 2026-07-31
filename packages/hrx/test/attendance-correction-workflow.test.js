import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createInMemoryAttendanceStore, createSqlAttendanceStore } from "../src/attendance.js";
import {
  createAttendanceCorrectionWorkflow,
  createAttendanceSourceVersion,
} from "../src/attendance-correction-workflow.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

function attendanceRecord(attendanceId, workDate) {
  return {
    tenant_id: "tenant-a",
    attendance_id: attendanceId,
    employee_id: "emp-001",
    work_date: workDate,
    status: "present",
    source_ref: `TimeClock:${attendanceId}`,
    source_kind: "manual",
    recorded_hours: 8,
    clock_in_at: `${workDate}T09:00:00+09:00`,
    clock_out_at: `${workDate}T18:00:00+09:00`,
  };
}

function requestInput(attendance, attendanceId, requestId) {
  const source = attendance.get({ tenant_id: "tenant-a", attendance_id: attendanceId });
  return {
    correction_request_id: requestId,
    attendance_id: attendanceId,
    expected_source_version: createAttendanceSourceVersion(source),
    reason: "퇴근시간 입력 오류",
    evidence_ref: `Document:attendance:${requestId}`,
    requested_changes: {
      recorded_hours: 7.5,
      clock_out_at: `${source.work_date}T17:30:00+09:00`,
    },
  };
}

test("attendance correction stays pending until another actor approves it", () => {
  const attendance = createInMemoryAttendanceStore([
    attendanceRecord("att-original", "2026-07-14"),
  ]);
  const workflow = createAttendanceCorrectionWorkflow({
    attendance,
    clock: () => "2026-07-20T09:00:00.000Z",
  });
  const originalSnapshot = attendance.get({
    tenant_id: "tenant-a",
    attendance_id: "att-original",
  });

  const pending = workflow.create(
    { tenant_id: "tenant-a", actor_id: "user-employee" },
    requestInput(attendance, "att-original", "correction-001"),
  );
  assert.equal(pending.state, "pending");
  assert.equal(pending.state_version, 1);
  assert.equal(attendance.list({ tenant_id: "tenant-a" }).length, 1);

  assert.throws(
    () => workflow.decide(
      {
        tenant_id: "tenant-a",
        actor_id: "user-employee",
        subject_actor_ids: ["user-employee"],
      },
      { correction_request_id: "correction-001" },
      {
        action: "approve",
        expected_state_version: 1,
        review_reason: "본인 승인 시도",
      },
    ),
    (error) => error.safe_error_code === "HRX_ATTENDANCE_CORRECTION_SELF_APPROVAL_BLOCKED",
  );
  assert.throws(
    () => workflow.decide(
      { tenant_id: "tenant-a", actor_id: "manager-001" },
      { correction_request_id: "correction-001" },
      {
        action: "approve",
        expected_state_version: 2,
        review_reason: "오래된 화면",
      },
    ),
    (error) => error.safe_error_code === "HRX_ATTENDANCE_CORRECTION_VERSION_CONFLICT",
  );

  const approved = workflow.decide(
    {
      tenant_id: "tenant-a",
      actor_id: "manager-001",
      subject_actor_ids: ["user-employee"],
    },
    { correction_request_id: "correction-001" },
    {
      action: "approve",
      expected_state_version: 1,
      review_reason: "근거 자료 확인",
    },
  );
  assert.equal(approved.request.state, "approved");
  assert.equal(approved.request.reviewed_by_actor_id, "manager-001");
  assert.equal(approved.correction.correction_of_attendance_id, "att-original");
  assert.equal(approved.correction.recorded_hours, 7.5);
  assert.equal(attendance.list({ tenant_id: "tenant-a" }).length, 2);
  assert.deepEqual(
    attendance.get({ tenant_id: "tenant-a", attendance_id: "att-original" }),
    originalSnapshot,
  );
  assert.throws(
    () => workflow.decide(
      { tenant_id: "tenant-a", actor_id: "manager-002" },
      { correction_request_id: "correction-001" },
      {
        action: "approve",
        expected_state_version: 2,
        review_reason: "중복 승인",
      },
    ),
    (error) => error.safe_error_code === "HRX_ATTENDANCE_CORRECTION_ALREADY_DECIDED",
  );
});

test("rejected and stale correction requests never create effective attendance rows", () => {
  const attendance = createInMemoryAttendanceStore([
    attendanceRecord("att-reject", "2026-07-15"),
    attendanceRecord("att-stale", "2026-07-16"),
  ]);
  const workflow = createAttendanceCorrectionWorkflow({
    attendance,
    clock: () => "2026-07-20T09:00:00.000Z",
  });

  workflow.create(
    { tenant_id: "tenant-a", actor_id: "user-employee" },
    requestInput(attendance, "att-reject", "correction-reject"),
  );
  const rejected = workflow.decide(
    { tenant_id: "tenant-a", actor_id: "manager-001" },
    { correction_request_id: "correction-reject" },
    {
      action: "reject",
      expected_state_version: 1,
      review_reason: "첨부 자료 불충분",
    },
  );
  assert.equal(rejected.request.state, "rejected");
  assert.equal(rejected.correction, null);
  assert.equal(attendance.list({ tenant_id: "tenant-a" }).length, 2);

  workflow.create(
    { tenant_id: "tenant-a", actor_id: "user-employee" },
    requestInput(attendance, "att-stale", "correction-stale"),
  );
  attendance.correct(
    { tenant_id: "tenant-a", attendance_id: "att-stale" },
    {
      attendance_id: "att-stale-direct-correction",
      recorded_hours: 7,
      source_ref: "AttendanceCorrection:direct",
      correction_reason: "관리자 직접 정정",
    },
  );
  assert.throws(
    () => workflow.decide(
      { tenant_id: "tenant-a", actor_id: "manager-001" },
      { correction_request_id: "correction-stale" },
      {
        action: "approve",
        expected_state_version: 1,
        review_reason: "오래된 요청 승인",
      },
    ),
    (error) => error.safe_error_code === "HRX_ATTENDANCE_CORRECTION_SOURCE_STALE",
  );
  assert.equal(
    workflow.get({ tenant_id: "tenant-a", correction_request_id: "correction-stale" }).state,
    "pending",
  );
  assert.equal(
    workflow.get({ tenant_id: "tenant-b", correction_request_id: "correction-stale" }),
    undefined,
  );
});

test("approved correction request and attendance row commit together and survive reopen", () => {
  const filePath = join(
    mkdtempSync(join(tmpdir(), "hrx-attendance-correction-workflow-")),
    "store.json",
  );
  const store = createFileHrxStore({ filePath });
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store });
  repository.createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-001",
    display_name: "근태 정정 검수",
    status: "active",
  });
  const attendance = createSqlAttendanceStore({ store });
  attendance.write(attendanceRecord("att-durable", "2026-07-17"));
  const workflow = createAttendanceCorrectionWorkflow({
    attendance,
    store,
    clock: () => "2026-07-20T09:00:00.000Z",
  });
  workflow.create(
    { tenant_id: "tenant-a", actor_id: "user-employee" },
    requestInput(attendance, "att-durable", "correction-durable"),
  );
  const approved = workflow.decide(
    { tenant_id: "tenant-a", actor_id: "manager-001" },
    { correction_request_id: "correction-durable" },
    {
      action: "approve",
      expected_state_version: 1,
      review_reason: "원본 자료 대조 완료",
    },
  );
  assert.equal(approved.request.state, "approved");
  store.close();

  const reopenedStore = createFileHrxStore({ filePath });
  const reopenedAttendance = createSqlAttendanceStore({ store: reopenedStore });
  const reopenedWorkflow = createAttendanceCorrectionWorkflow({
    attendance: reopenedAttendance,
    store: reopenedStore,
  });
  assert.equal(
    reopenedWorkflow.get({
      tenant_id: "tenant-a",
      correction_request_id: "correction-durable",
    }).state,
    "approved",
  );
  assert.equal(
    reopenedAttendance.get({
      tenant_id: "tenant-a",
      attendance_id: "att-correction:correction-durable",
    }).correction_of_attendance_id,
    "att-durable",
  );
  reopenedStore.close();
});
