#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHrxAuditEventStore } from "../packages/audit/src/hrx-event-store.js";
import { createHrxPayrollRoute } from "../apps/api/src/routes/hrx/payroll.js";
import { createApprovalRoutePlan } from "../packages/hrx/src/approval.js";
import { createAttendanceCorrection, createAttendanceRecord, createInMemoryAttendanceStore } from "../packages/hrx/src/attendance.js";
import { createLeaveRequestService, createInMemoryLeaveRequestStore } from "../packages/hrx/src/leave/request-service.js";
import { createInMemoryLeaveBalanceLedger } from "../packages/hrx/src/leave/balance.js";
import { createOvertimeExportRecord, createOvertimeRequest, transitionOvertimeRequest } from "../packages/hrx/src/overtime.js";
import { createPayrollExportService } from "../packages/hrx/src/payroll-export-service.js";
import { createPayrollReconciliationSummary } from "../packages/hrx/src/payroll-reconciliation.js";
import { runHrxRetentionJob } from "../packages/hrx/src/retention-job.js";
import { createHrxLegalHold } from "../packages/hrx/src/legal-hold.js";
import { applyLeaveCarryover, calculateLeaveAccrual, createLeavePolicy } from "../packages/hrx/src/rules/leave-policy.js";

const root = process.cwd();
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function read(path) {
  return readFileSync(resolve(root, path), "utf8");
}

for (const file of [
  "packages/hrx/src/rules/leave-policy.js",
  "packages/hrx/src/leave/request-service.js",
  "packages/hrx/src/attendance.js",
  "packages/hrx/src/overtime.js",
  "packages/hrx/src/approval.js",
  "packages/hrx/src/payroll-export-service.js",
  "packages/hrx/src/payroll-reconciliation.js",
  "packages/hrx/src/retention-job.js",
  "apps/api/src/routes/hrx/payroll.js",
  "apps/api/test/hrx/workflow-audit.test.js",
  "packages/hrx/test/payroll-export-service.test.js",
  "packages/hrx/test/payroll-reconciliation.test.js",
  "packages/hrx/test/retention-job.test.js",
]) {
  assert(existsSync(resolve(root, file)), `${file}: missing`);
}

const packageJson = JSON.parse(read("package.json"));
assert(packageJson.scripts?.["hrx:workflows:validate"] === "node scripts/validate-hrx-workflows.mjs", "package script hrx:workflows:validate missing");

const policy = createLeavePolicy({
  tenant_id: "tenant-a",
  policy_id: "pto-validator",
  policy_version: "2026.1",
  leave_type: "pto",
  accrual_rate_per_month: 8,
  annual_entitlement: 96,
  carryover_limit: 40,
  effective_from: "2026-01-01",
});
assert(calculateLeaveAccrual(policy, 15) === 96, "leave policy must cap accrual at annual entitlement");
assert(applyLeaveCarryover(policy, 72) === 40, "leave policy must cap carryover");

const audit = createHrxAuditEventStore();
const balanceLedger = createInMemoryLeaveBalanceLedger();
const leaveService = createLeaveRequestService({
  store: createInMemoryLeaveRequestStore(),
  balanceLedger,
  audit,
});
const context = { tenant_id: "tenant-a", actor_id: "validator-user" };
await leaveService.submit(context, {
  request_id: "leave-validator",
  employee_id: "emp-001",
  policy_id: "pto-validator",
  leave_type: "pto",
  amount: 8,
  start_date: "2026-07-01",
  end_date: "2026-07-01",
});
await leaveService.approve(context, { request_id: "leave-validator", approver_id: "validator-manager" });
assert(balanceLedger.balance({ tenant_id: "tenant-a", employee_id: "emp-001", policy_id: "pto-validator" }).used_balance === 8, "leave approval must write balance ledger entry");

const attendanceStore = createInMemoryAttendanceStore();
const attendance = attendanceStore.write({
  tenant_id: "tenant-a",
  attendance_id: "att-validator",
  employee_id: "emp-001",
  work_date: "2026-07-01",
  status: "present",
  recorded_hours: 8,
  source_ref: "TimeClock:validator",
});
const correction = createAttendanceCorrection(attendance, {
  attendance_id: "att-validator-correction",
  status: "remote",
  recorded_hours: 7.5,
  source_ref: "TimeClock:validator-correction",
  correction_reason: "manager correction",
});
assert(correction.correction_of_attendance_id === "att-validator", "attendance correction must link to original source");
attendanceStore.correct(
  { tenant_id: "tenant-a", attendance_id: "att-validator" },
  {
    attendance_id: "att-validator-correction-store",
    source_ref: "TimeClock:validator-correction-store",
    correction_reason: "store correction",
  },
);
assert(attendanceStore.list({ tenant_id: "tenant-a", employee_id: "emp-001" }).length === 2, "attendance store must retain correction row");

const overtime = createOvertimeRequest({
  tenant_id: "tenant-a",
  overtime_id: "ot-validator",
  employee_id: "emp-001",
  work_date: "2026-07-01",
  hours: 2,
  reason: "closing support",
});
const approvedOvertime = transitionOvertimeRequest(overtime, { state: "approved", approver_id: "manager-001" });
const overtimeExport = createOvertimeExportRecord(approvedOvertime, { export_ref: "payroll-preview-validator" });
assert(overtimeExport.calculation_runtime === false && overtimeExport.human_review_required === true, "overtime export must remain payroll-preview boundary only");

const approvalPlan = createApprovalRoutePlan({
  policy: {
    tenant_id: "tenant-a",
    policy_id: "approval-validator",
    routes: { manager: "manager", hr: "people_ops", legal: "legal_ops" },
  },
  steps: [
    { step_id: "manager-step", step_order: 1, route: "manager" },
    { step_id: "hr-step", step_order: 2, route: "hr" },
  ],
  delegations: [
    {
      delegation_id: "delegation-validator",
      from_approver_id: "manager-001",
      to_approver_id: "manager-002",
      reason: "absence",
      expires_at: "2026-07-05T00:00:00.000Z",
    },
  ],
  escalations: [
    {
      escalation_id: "escalation-validator",
      trigger: "sla_expired",
      to_route: "hr",
      reason: "manager step expired",
    },
  ],
});
assert(approvalPlan.steps.length === 2 && approvalPlan.delegations.length === 1 && approvalPlan.escalations.length === 1, "approval plan must include steps delegation escalation");

const payrollService = createPayrollExportService({ audit });
await payrollService.preview(context, {
  preview_id: "pay-validator",
  payroll_period: "2026-07",
  employee_ids: ["emp-001"],
});
await payrollService.approve(context, {
  preview_id: "pay-validator",
  approval_ref: "Approval:pay-validator",
});
const artifact = await payrollService.exportArtifact(context, {
  preview_id: "pay-validator",
  export_artifact_ref: "DMS:pay-validator",
  provider_payload_ref: "ProviderDraft:pay-validator",
});
assert(artifact.disbursement_instruction_included === false, "payroll export artifact must not include disbursement instructions");

const routeAudit = createHrxAuditEventStore();
const payrollRoute = createHrxPayrollRoute({ audit: routeAudit });
const routePreview = await payrollRoute.handle({
  method: "POST",
  context,
  body: { preview_id: "pay-route-validator", payroll_period: "2026-07", employee_ids: ["emp-001"] },
});
assert(routePreview.status === 201, "payroll route must create preview through service");

const reconciliation = createPayrollReconciliationSummary({
  tenant_id: "tenant-a",
  reconciliation_id: "recon-validator",
  preview_id: "pay-validator",
  provider_result_ref: "ProviderResult:validator",
  provider_result_metadata: { status: "accepted" },
});
assert(reconciliation.raw_provider_payload_included === false, "payroll reconciliation must be metadata-only");

const retentionRun = runHrxRetentionJob({
  tenant_id: "tenant-a",
  as_of: "2026-07-01",
  policies: [{ tenant_id: "tenant-a", policy_id: "ret-docs", object_type: "HRDocument", retain_until: "2026-06-01" }],
  legal_holds: [
    createHrxLegalHold({
      tenant_id: "tenant-a",
      hold_id: "hold-validator",
      object_type: "HRDocument",
      object_id: "doc-held",
      reason: "litigation hold",
    }),
  ],
  records: [
    { tenant_id: "tenant-a", object_type: "HRDocument", object_id: "doc-held" },
    { tenant_id: "tenant-a", object_type: "HRDocument", object_id: "doc-clear" },
  ],
});
assert(retentionRun.decisions.find((decision) => decision.object_id === "doc-held")?.allowed === false, "retention job must block held record purge");
assert(retentionRun.decisions.find((decision) => decision.object_id === "doc-clear")?.allowed === true, "retention job must allow due unheld purge");

const workflowActions = audit.list({ tenant_id: "tenant-a" }).map((event) => event.action);
for (const action of ["hrx.leave.submit", "hrx.leave.approve", "hrx.payroll.preview", "hrx.payroll.approve", "hrx.payroll.export"]) {
  assert(workflowActions.includes(action), `workflow audit missing ${action}`);
}

if (errors.length > 0) {
  console.error("HRX workflow validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX workflow validation passed.");
console.log("scope: leave_attendance_overtime_payroll");
