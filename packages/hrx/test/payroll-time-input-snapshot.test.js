import assert from "node:assert/strict";
import test from "node:test";
import { createSqlAttendanceStore } from "../src/attendance.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import {
  createSqlPayrollTimeInputService,
  projectApprovedPayrollTimeInput,
} from "../src/payroll-time-input-snapshot.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const AS_OF = "2026-07-31T23:59:59+09:00";

function attendance(overrides = {}) {
  return {
    tenant_id: "tenant-a",
    attendance_id: "att-001",
    employee_id: "emp-001",
    work_date: "2026-07-14",
    status: "present",
    clock_in_at: "2026-07-14T23:30:00+09:00",
    clock_out_at: "2026-07-15T01:30:00+09:00",
    source_ref: "Attendance:att-001:v1",
    ...overrides,
  };
}

test("approved receipt gates exact cross-midnight, night, and holiday projection", () => {
  const row = attendance();
  const input = {
    tenant_id: "tenant-a",
    period_start: "2026-07-01",
    period_end: "2026-07-31",
    as_of: AS_OF,
    source_version: "attendance-v1",
    timezone: "Asia/Seoul",
    holiday_dates: ["2026-07-15"],
    attendance_records: [row],
    approval_receipts: [{
      tenant_id: "tenant-a",
      approval_receipt_id: "receipt-001",
      attendance_id: row.attendance_id,
      approved_at: "2026-07-15T02:00:00+09:00",
      attendance_source_ref: row.source_ref,
    }],
    overtime_requests: [],
  };
  const projected = projectApprovedPayrollTimeInput(input);
  assert.deepEqual(
    [
      projected.employee_inputs[0].regular_minutes,
      projected.employee_inputs[0].night_minutes,
      projected.employee_inputs[0].holiday_minutes,
    ],
    [120, 120, 90],
  );
  assert.equal(projectApprovedPayrollTimeInput({ ...input, approval_receipts: [] }).employee_inputs.length, 0);
  assert.equal(projectApprovedPayrollTimeInput({
    ...input,
    approval_receipts: [{ ...input.approval_receipts[0], approved_at: "2026-08-01T00:00:00+09:00" }],
  }).employee_inputs.length, 0);
});

test("correction replaces the approved original and requires its own approval", () => {
  const original = attendance({ attendance_id: "att-original", source_ref: "Attendance:att-original:v1" });
  const correction = attendance({
    attendance_id: "att-correction",
    source_ref: "Attendance:att-correction:v2",
    correction_of_attendance_id: "att-original",
    clock_out_at: "2026-07-15T00:30:00+09:00",
  });
  const base = {
    tenant_id: "tenant-a",
    period_start: "2026-07-01",
    period_end: "2026-07-31",
    as_of: AS_OF,
    source_version: "attendance-v2",
    attendance_records: [original, correction],
    overtime_requests: [],
  };
  const originalReceipt = {
    tenant_id: "tenant-a",
    approval_receipt_id: "receipt-original",
    attendance_id: original.attendance_id,
    approved_at: "2026-07-15T01:00:00+09:00",
    attendance_source_ref: original.source_ref,
  };
  assert.equal(projectApprovedPayrollTimeInput({ ...base, approval_receipts: [originalReceipt] }).employee_inputs.length, 0);
  const correctionReceipt = {
    ...originalReceipt,
    approval_receipt_id: "receipt-correction",
    attendance_id: correction.attendance_id,
    attendance_source_ref: correction.source_ref,
  };
  assert.equal(projectApprovedPayrollTimeInput({ ...base, approval_receipts: [originalReceipt, correctionReceipt] }).employee_inputs[0].regular_minutes, 60);
});

test("as-of projection keeps an approved original until its later correction exists", () => {
  const original = attendance({
    attendance_id: "att-original-as-of",
    source_ref: "Attendance:att-original-as-of:v1",
    created_at: "2026-07-14T09:00:00+09:00",
  });
  const correction = attendance({
    attendance_id: "att-correction-as-of",
    source_ref: "Attendance:att-correction-as-of:v2",
    correction_of_attendance_id: original.attendance_id,
    clock_out_at: "2026-07-15T00:30:00+09:00",
    created_at: "2026-08-01T09:00:00+09:00",
  });
  const originalReceipt = {
    tenant_id: "tenant-a",
    approval_receipt_id: "receipt-original-as-of",
    attendance_id: original.attendance_id,
    approved_at: "2026-07-15T01:00:00+09:00",
    attendance_source_ref: original.source_ref,
  };
  const correctionReceipt = {
    ...originalReceipt,
    approval_receipt_id: "receipt-correction-as-of",
    attendance_id: correction.attendance_id,
    approved_at: "2026-08-01T10:00:00+09:00",
    attendance_source_ref: correction.source_ref,
  };
  const base = {
    tenant_id: "tenant-a",
    period_start: "2026-07-01",
    period_end: "2026-07-31",
    source_version: "attendance-v2",
    attendance_records: [original, correction],
    overtime_requests: [],
  };
  assert.equal(projectApprovedPayrollTimeInput({
    ...base,
    as_of: AS_OF,
    approval_receipts: [originalReceipt, correctionReceipt],
  }).employee_inputs[0].regular_minutes, 120);
  assert.equal(projectApprovedPayrollTimeInput({
    ...base,
    as_of: "2026-08-02T00:00:00+09:00",
    approval_receipts: [originalReceipt, correctionReceipt],
  }).employee_inputs[0].regular_minutes, 60);
});

test("SQL approval receipt is tenant-scoped, idempotent, append-only, and source-bound", () => {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  createSqlHrxRepository({ store }).createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-001",
    display_name: "Synthetic employee",
    status: "active",
  });
  createSqlAttendanceStore({ store, clock: () => AS_OF }).write(attendance({
    clock_in_at: "2026-07-14T09:00:00+09:00",
    clock_out_at: "2026-07-14T18:00:00+09:00",
  }));
  const service = createSqlPayrollTimeInputService({ store, clock: () => AS_OF });
  const actor = { tenant_id: "tenant-a", actor_id: "manager-001" };
  const first = service.recordAttendanceApproval(actor, {
    approval_receipt_id: "receipt-001",
    attendance_id: "att-001",
    idempotency_key: "approve:att-001:v1",
  });
  const replay = service.recordAttendanceApproval(actor, {
    attendance_id: "att-001",
    idempotency_key: "approve:att-001:v1",
  });
  assert.equal(replay.approval_receipt_id, first.approval_receipt_id);
  assert.equal(service.projectApprovedInput(actor, {
    period_start: "2026-07-01",
    period_end: "2026-07-31",
    as_of: AS_OF,
    source_version: "attendance-v1",
  }).employee_inputs[0].regular_minutes, 540);
  assert.throws(
    () => store.query("deleteOne", {
      table: "hrx_attendance_approval_receipts",
      where: { tenant_id: "tenant-a", approval_receipt_id: "receipt-001" },
    }),
    /append-only/,
  );
  assert.equal(service.projectApprovedInput(
    { tenant_id: "tenant-b", actor_id: "manager-b" },
    { period_start: "2026-07-01", period_end: "2026-07-31", as_of: AS_OF, source_version: "attendance-v1" },
  ).employee_inputs.length, 0);
  store.close();
});
