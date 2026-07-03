import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFileHrxStore } from "../src/store/file-store.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import {
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
