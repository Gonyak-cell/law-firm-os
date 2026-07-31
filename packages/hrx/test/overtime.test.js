import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFileHrxStore } from "../src/store/file-store.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import {
  calculateOvertimeReviewMinutes,
  createInMemoryOvertimeStore,
  createOvertimeExportRecord,
  createOvertimeRequest,
  createSqlOvertimeStore,
  createWeeklyOvertimeRiskReport,
  transitionOvertimeRequest,
} from "../src/overtime.js";

const overtime = Object.freeze({
  tenant_id: "tenant-a",
  overtime_id: "ot-001",
  employee_id: "emp-001",
  work_date: "2026-06-19",
  hours: 2.5,
  reason: "urgent filing support",
});

test("overtime request requires approval before export", () => {
  const submitted = createOvertimeRequest(overtime);
  assert.equal(submitted.state, "submitted");
  assert.throws(() => createOvertimeExportRecord(submitted, { export_ref: "payroll-preview-001" }), /must be approved/);

  const approved = transitionOvertimeRequest(submitted, { state: "approved", approver_id: "manager-001" });
  const exportRecord = createOvertimeExportRecord(approved, { export_ref: "payroll-preview-001" });
  assert.equal(exportRecord.human_review_required, true);
  assert.equal(exportRecord.calculation_runtime, false);
  assert.equal(exportRecord.source_ref, "OvertimeRequest:ot-001");
});

test("overtime workflow blocks invalid state transitions", () => {
  const submitted = createOvertimeRequest(overtime);
  const rejected = transitionOvertimeRequest(submitted, { state: "rejected" });
  assert.throws(() => transitionOvertimeRequest(rejected, { state: "approved", approver_id: "manager-001" }), /cannot transition/);
});

test("overtime store persists requests and state transitions", () => {
  const store = createInMemoryOvertimeStore();
  const submitted = store.create(overtime);
  assert.equal(submitted.state, "submitted");
  const approved = store.update(
    { tenant_id: "tenant-a", overtime_id: "ot-001" },
    { state: "approved", approver_id: "manager-001" },
  );
  assert.equal(approved.state, "approved");
  assert.equal(store.list({ tenant_id: "tenant-a", employee_id: "emp-001" }).length, 1);
});

test("SQL overtime store survives file-backed reopen", () => {
  const storeFile = join(mkdtempSync(join(tmpdir(), "hrx-overtime-sql-")), "store.json");
  const store = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(store);
  const repository = createSqlHrxRepository({ store });
  repository.createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-001",
    display_name: "Overtime Employee",
    status: "active",
  });
  const overtimeStore = createSqlOvertimeStore({ store });
  overtimeStore.create(overtime);
  overtimeStore.update(
    { tenant_id: "tenant-a", overtime_id: "ot-001" },
    { state: "approved", approver_id: "manager-001" },
  );
  store.close();

  const reopenedStore = createFileHrxStore({ filePath: storeFile });
  const reopenedOvertime = createSqlOvertimeStore({ store: reopenedStore });
  const [request] = reopenedOvertime.list({ tenant_id: "tenant-a", employee_id: "emp-001", month: "2026-06" });
  assert.equal(request.overtime_id, "ot-001");
  assert.equal(request.state, "approved");
  reopenedStore.close();
});

test("weekly overtime risk report detects unapproved excess and weekly 52-hour breach", () => {
  const attendance_records = [
    { tenant_id: "tenant-a", attendance_id: "att-1", employee_id: "emp-001", work_date: "2026-07-06", recorded_hours: 12 },
    { tenant_id: "tenant-a", attendance_id: "att-2", employee_id: "emp-001", work_date: "2026-07-07", recorded_hours: 12 },
    { tenant_id: "tenant-a", attendance_id: "att-3", employee_id: "emp-001", work_date: "2026-07-08", recorded_hours: 12 },
    { tenant_id: "tenant-a", attendance_id: "att-4", employee_id: "emp-001", work_date: "2026-07-09", recorded_hours: 12 },
    { tenant_id: "tenant-a", attendance_id: "att-5", employee_id: "emp-001", work_date: "2026-07-10", recorded_hours: 8 },
  ];
  const report = createWeeklyOvertimeRiskReport({
    tenant_id: "tenant-a",
    employee_id: "emp-001",
    attendance_records,
    overtime_requests: [
      createOvertimeRequest({
        ...overtime,
        overtime_id: "ot-approved",
        work_date: "2026-07-06",
        hours: 4,
        state: "approved",
        approver_id: "manager-001",
      }),
    ],
  });
  assert.equal(report.events.some((event) => event.risk_type === "weekly_limit_exceeded" && event.excess_hours === 4), true);
  assert.equal(
    report.events.filter((event) => event.risk_type === "unapproved_overtime_detected").map((event) => event.work_date).sort().join(","),
    "2026-07-07,2026-07-08,2026-07-09",
  );
});

test("PEO-TUW-050 separates calculated, requested, and approved minutes with review warnings", () => {
  const review = calculateOvertimeReviewMinutes({
    employee_id: "emp-001",
    work_date: "2026-07-20",
    requested_minutes: 180,
    attendance_records: [{
      tenant_id: "tenant-a",
      attendance_id: "att-overtime-review",
      employee_id: "emp-001",
      work_date: "2026-07-20",
      recorded_hours: 10,
      source_ref: "TimeClock:att-overtime-review:v1",
    }],
  });
  assert.deepEqual(review, {
    calculated_minutes: 120,
    requested_minutes: 180,
    calculation_basis_ref: "TimeClock:att-overtime-review:v1",
    warning_codes: ["OVERTIME_REQUEST_EXCEEDS_CALCULATED"],
  });

  const submitted = createOvertimeRequest({
    ...overtime,
    work_date: "2026-07-20",
    ...review,
  });
  assert.deepEqual(
    [submitted.calculated_minutes, submitted.requested_minutes, submitted.approved_minutes],
    [120, 180, 0],
  );
  assert.deepEqual(JSON.parse(submitted.warning_codes_json), ["OVERTIME_REQUEST_EXCEEDS_CALCULATED"]);

  const approved = transitionOvertimeRequest(submitted, {
    state: "approved",
    approver_id: "manager-001",
    approved_minutes: 90,
    decision_reason: "출퇴근기록과 업무 사유 확인",
  });
  assert.deepEqual(
    [approved.calculated_minutes, approved.requested_minutes, approved.approved_minutes],
    [120, 180, 90],
  );
  assert.equal(approved.decision_reason, "출퇴근기록과 업무 사유 확인");

  const rejected = transitionOvertimeRequest(createOvertimeRequest({
    ...overtime,
    overtime_id: "ot-rejected",
    ...review,
  }), { state: "rejected", approver_id: "manager-001" });
  assert.equal(rejected.approved_minutes, 0);
});

test("PEO-FIX-050 calculates a null attendance basis without exposing an implementation exception", () => {
  assert.deepEqual(
    calculateOvertimeReviewMinutes({
      employee_id: "emp-001",
      work_date: "2026-07-31",
      requested_minutes: 60,
      attendance_records: [],
    }),
    {
      calculated_minutes: 0,
      requested_minutes: 60,
      calculation_basis_ref: null,
      warning_codes: ["OVERTIME_REQUEST_EXCEEDS_CALCULATED"],
    },
  );
});

test("PEO-TUW-050 blocks self approval and warns instead of silently accepting excess minutes", () => {
  const submitted = createOvertimeRequest({
    ...overtime,
    calculated_minutes: 60,
    requested_minutes: 120,
  });
  assert.throws(
    () => transitionOvertimeRequest(submitted, {
      state: "approved",
      approver_id: "emp-001",
      approved_minutes: 120,
    }),
    (error) => error.safe_error_code === "HRX_OVERTIME_SELF_APPROVAL",
  );
  const approved = transitionOvertimeRequest(submitted, {
    state: "approved",
    approver_id: "manager-001",
    approved_minutes: 120,
  });
  assert.deepEqual(JSON.parse(approved.warning_codes_json), [
    "OVERTIME_REQUEST_EXCEEDS_CALCULATED",
    "OVERTIME_APPROVAL_EXCEEDS_CALCULATED",
  ]);
});
