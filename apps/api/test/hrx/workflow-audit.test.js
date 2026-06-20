import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createInMemoryLeaveRequestStore, createLeaveRequestService } from "../../../../packages/hrx/src/leave/request-service.js";
import { createPayrollExportService } from "../../../../packages/hrx/src/payroll-export-service.js";

const context = Object.freeze({ tenant_id: "tenant-a", actor_id: "workflow-auditor" });

test("PR-08 leave and payroll workflow transitions write audit events", async () => {
  const audit = createHrxAuditEventStore();
  const leaveService = createLeaveRequestService({
    store: createInMemoryLeaveRequestStore(),
    audit,
  });
  await leaveService.submit(context, {
    request_id: "leave-audit-001",
    employee_id: "emp-001",
    policy_id: "pto-us",
    leave_type: "pto",
    amount: 8,
    start_date: "2026-07-01",
    end_date: "2026-07-01",
  });
  await leaveService.approve(context, { request_id: "leave-audit-001" });

  const payrollService = createPayrollExportService({ audit });
  await payrollService.preview(context, {
    preview_id: "payroll-audit-001",
    payroll_period: "2026-07",
    employee_ids: ["emp-001"],
  });
  await payrollService.approve(context, {
    preview_id: "payroll-audit-001",
    approval_ref: "Approval:payroll-audit-001",
  });
  await payrollService.exportArtifact(context, {
    preview_id: "payroll-audit-001",
    export_artifact_ref: "DMS:payroll-audit-001",
  });

  assert.deepEqual(
    audit.list({ tenant_id: "tenant-a" }).map((event) => event.action),
    [
      "hrx.leave.submit",
      "hrx.leave.approve",
      "hrx.payroll.preview",
      "hrx.payroll.approve",
      "hrx.payroll.export",
    ],
  );
});
