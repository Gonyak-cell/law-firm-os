import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createHrxLifecycleRoute } from "../../src/routes/hrx/lifecycle.js";
import { createHrxRecruitingRoute } from "../../src/routes/hrx/recruiting.js";
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

test("PR-09 recruiting and lifecycle workflow transitions write audit events", async () => {
  const audit = createHrxAuditEventStore();
  const recruiting = createHrxRecruitingRoute({ audit });
  await recruiting.handle({
    method: "POST",
    context,
    params: { resource: "candidates" },
    body: {
      candidate_id: "cand-audit",
      legal_name: "Audit Candidate",
      source_ref: "ATS:cand-audit",
      retention_policy_id: "candidate-retention-2y",
      consent: {
        consent_id: "consent-audit",
        candidate_id: "cand-audit",
        purpose: "recruiting_processing",
        granted_at: "2026-06-20T00:00:00.000Z",
        evidence_ref: "ConsentForm:cand-audit",
      },
    },
  });
  await recruiting.handle({
    method: "POST",
    context,
    params: { resource: "applications" },
    body: {
      application_id: "app-audit",
      candidate_id: "cand-audit",
      job_opening_id: "job-audit",
    },
  });
  await recruiting.handle({
    method: "POST",
    context,
    params: { resource: "application_stage", application_id: "app-audit" },
    body: { stage: "screening" },
  });

  const lifecycle = createHrxLifecycleRoute({ audit });
  await lifecycle.handle({
    method: "POST",
    context,
    params: { resource: "onboarding" },
    body: {
      onboarding_id: "onb-audit",
      employee_id: "emp-audit",
      start_date: "2026-08-01",
      tasks: [{ task_id: "task-audit", title: "Policy ack", owner_role: "people_ops" }],
      document_refs: ["DocRef:policy"],
      access_requests: [{ request_id: "access-audit", system_ref: "DMS", access_level: "associate" }],
    },
  });
  await lifecycle.handle({
    method: "POST",
    context,
    params: { resource: "onboarding_task", onboarding_id: "onb-audit", task_id: "task-audit" },
    body: { status: "completed" },
  });

  const actions = audit.list({ tenant_id: "tenant-a" }).map((event) => event.action);
  for (const action of [
    "hrx.candidate.create",
    "hrx.application.create",
    "hrx.application.stage.update",
    "hrx.onboarding.create",
    "hrx.onboarding.task.update",
  ]) {
    assert.ok(actions.includes(action), `${action} audit missing`);
  }
});
