import assert from "node:assert/strict";
import test from "node:test";
import { createOvertimeExportRecord, createOvertimeRequest, transitionOvertimeRequest } from "../src/overtime.js";

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
