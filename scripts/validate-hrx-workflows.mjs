#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHrxAuditEventStore } from "../packages/audit/src/hrx-event-store.js";
import { createHrxLifecycleRoute } from "../apps/api/src/routes/hrx/lifecycle.js";
import { createHrxPayrollRoute } from "../apps/api/src/routes/hrx/payroll.js";
import { createHrxRecruitingRoute } from "../apps/api/src/routes/hrx/recruiting.js";
import { createApprovalRoutePlan } from "../packages/hrx/src/approval.js";
import { createAttendanceCorrection, createInMemoryAttendanceStore } from "../packages/hrx/src/attendance.js";
import { createLeaveRequestService, createInMemoryLeaveRequestStore } from "../packages/hrx/src/leave/request-service.js";
import { createInMemoryLeaveBalanceLedger } from "../packages/hrx/src/leave/balance.js";
import { markHrxLegalRiskPrivileged } from "../packages/hrx/src/legal-risk.js";
import { createOvertimeExportRecord, createOvertimeRequest, transitionOvertimeRequest } from "../packages/hrx/src/overtime.js";
import { createPayrollExportService } from "../packages/hrx/src/payroll-export-service.js";
import { createPayrollReconciliationSummary } from "../packages/hrx/src/payroll-reconciliation.js";
import { assertCandidateConsentAllowsProcessing, createCandidateConsent } from "../packages/hrx/src/recruiting/consent.js";
import { convertCandidateToEmployee } from "../packages/hrx/src/recruiting/convert-to-employee.js";
import { createInterview } from "../packages/hrx/src/recruiting/interview.js";
import { completeInterviewWithFeedbackSource, createInterviewFeedbackSource } from "../packages/hrx/src/recruiting/interview-feedback.js";
import { createOffer, maskOfferCompensation } from "../packages/hrx/src/recruiting/offer.js";
import { assertRecruitingStageTransition, createRecruitingPipelineSnapshot } from "../packages/hrx/src/recruiting/state-machine.js";
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
  "packages/hrx/src/recruiting/state-machine.js",
  "packages/hrx/src/recruiting/consent.js",
  "packages/hrx/src/recruiting/interview-feedback.js",
  "packages/hrx/src/recruiting/convert-to-employee.js",
  "packages/hrx/src/onboarding.js",
  "packages/hrx/src/offboarding.js",
  "packages/hrx/src/legal-risk.js",
  "apps/api/src/routes/hrx/recruiting.js",
  "apps/api/src/routes/hrx/lifecycle.js",
  "apps/api/src/routes/hrx/payroll.js",
  "apps/api/test/hrx/workflow-audit.test.js",
  "apps/api/test/hrx/recruiting.test.js",
  "apps/api/test/hrx/lifecycle.test.js",
  "packages/hrx/test/recruiting-state-machine.test.js",
  "packages/hrx/test/consent.test.js",
  "packages/hrx/test/interview-feedback.test.js",
  "packages/hrx/test/convert-to-employee.test.js",
  "packages/hrx/test/onboarding.test.js",
  "packages/hrx/test/offboarding.test.js",
  "packages/hrx/test/legal-risk.test.js",
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

const consent = createCandidateConsent({
  tenant_id: "tenant-a",
  consent_id: "consent-validator",
  candidate_id: "candidate-validator",
  purpose: "recruiting_processing",
  granted_at: "2026-07-01T00:00:00.000Z",
  expires_at: "2026-12-31T00:00:00.000Z",
  evidence_ref: "ConsentEvidence:validator",
});
assert(
  assertCandidateConsentAllowsProcessing([consent], {
    tenant_id: "tenant-a",
    candidate_id: "candidate-validator",
    as_of: "2026-07-02T00:00:00.000Z",
  }).consent_id === "consent-validator",
  "candidate processing must require active consent",
);

const pipeline = createRecruitingPipelineSnapshot({
  tenant_id: "tenant-a",
  job_openings: [
    {
      tenant_id: "tenant-a",
      job_opening_id: "job-validator",
      title: "People Ops Partner",
      department_ref: "OrgUnit:people",
      hiring_manager_employee_id: "emp-001",
    },
  ],
  applications: [
    {
      tenant_id: "tenant-a",
      application_id: "application-validator",
      candidate_id: "candidate-validator",
      job_opening_id: "job-validator",
    },
  ],
  offers: [
    {
      tenant_id: "tenant-a",
      offer_id: "offer-validator",
      application_id: "application-validator",
      candidate_id: "candidate-validator",
      compensation_ref: "CompPackage:restricted",
      document_ref: "Doc:offer-validator",
    },
  ],
});
assert(pipeline.invalid_stage_transition_blocked === true, "recruiting pipeline must declare invalid transition guard");
let invalidRecruitingTransitionBlocked = false;
try {
  assertRecruitingStageTransition(pipeline.applications[0], { stage: "hired" });
} catch (error) {
  invalidRecruitingTransitionBlocked = /cannot transition/i.test(error.message);
}
assert(invalidRecruitingTransitionBlocked, "recruiting state machine must block invalid stage transitions");

const feedbackSource = createInterviewFeedbackSource({
  tenant_id: "tenant-a",
  interview_id: "interview-validator",
  feedback_source_ref: "InterviewFeedback:restricted",
  reviewer_employee_id: "emp-reviewer",
});
assert(feedbackSource.source_only === true && feedbackSource.restricted_access === true, "interview feedback must store source-only restricted reference");
const completedInterview = completeInterviewWithFeedbackSource(
  createInterview({
    tenant_id: "tenant-a",
    interview_id: "interview-validator",
    application_id: "application-validator",
    candidate_id: "candidate-validator",
    scheduled_for: "2026-07-03T10:00:00.000Z",
    schedule_source_ref: "Calendar:interview-validator",
    interviewer_employee_ids: ["emp-reviewer"],
  }),
  feedbackSource,
);
assert(completedInterview.state === "completed" && completedInterview.feedback_source_ref === "InterviewFeedback:restricted", "interview feedback completion must retain restricted source ref");

const offer = createOffer({
  tenant_id: "tenant-a",
  offer_id: "offer-validator-accepted",
  application_id: "application-validator",
  candidate_id: "candidate-validator",
  compensation_ref: "CompPackage:restricted",
  document_ref: "Doc:offer-validator-accepted",
  state: "accepted",
  approval_ref: "Approval:offer-validator",
});
assert(maskOfferCompensation(offer, { effect: "deny" }).compensation_ref === null, "offer compensation must be maskable by policy decision");
const conversion = convertCandidateToEmployee({
  candidate: {
    tenant_id: "tenant-a",
    candidate_id: "candidate-validator",
    legal_name: "Candidate Validator",
    source_ref: "ATS:candidate-validator",
    retention_policy_id: "candidate-retention-2y",
  },
  application: {
    tenant_id: "tenant-a",
    application_id: "application-validator",
    candidate_id: "candidate-validator",
    job_opening_id: "job-validator",
    stage: "hired",
  },
  offer,
  approval_ref: "Approval:conversion-validator",
  employee_id: "emp-validator",
  profile_id: "profile-validator",
  title: "People Ops Partner",
  effective_from: "2026-08-01",
});
assert(conversion.crm_party_linked === false && conversion.explicit_approval_required === true, "candidate conversion must not contaminate CRM Party boundary");

const legalRisk = markHrxLegalRiskPrivileged(
  {
    tenant_id: "tenant-a",
    legal_risk_id: "legal-risk-validator",
    risk_event_id: "risk-event-validator",
    legal_owner_id: "legal-owner-validator",
  },
  {
    privilege_basis_ref: "PrivilegeBasis:validator",
    audit_ref: "Audit:legal-risk-validator",
  },
);
assert(legalRisk.privilege_flag === true && legalRisk.audit_ref === "Audit:legal-risk-validator", "legal risk privileged workflow must require audit reference");

const workflowRouteAudit = createHrxAuditEventStore();
const recruitingRoute = createHrxRecruitingRoute({ audit: workflowRouteAudit });
const lifecycleRoute = createHrxLifecycleRoute({ audit: workflowRouteAudit });
const routeContext = { tenant_id: "tenant-a", actor_id: "validator-user" };

const candidateRouteResult = await recruitingRoute.handle({
  method: "POST",
  context: routeContext,
  body: {
    resource: "candidates",
    candidate_id: "candidate-route-validator",
    legal_name: "Route Candidate Validator",
    source_ref: "ATS:route-validator",
    retention_policy_id: "candidate-retention-2y",
    consent: {
      consent_id: "consent-route-validator",
      candidate_id: "candidate-route-validator",
      purpose: "recruiting_processing",
      granted_at: "2026-07-01T00:00:00.000Z",
      evidence_ref: "ConsentEvidence:route-validator",
    },
  },
});
assert(candidateRouteResult.status === 201, "recruiting route must create candidate only with consent");

const applicationRouteResult = await recruitingRoute.handle({
  method: "POST",
  context: routeContext,
  body: {
    resource: "applications",
    application_id: "application-route-validator",
    candidate_id: "candidate-route-validator",
    job_opening_id: "job-route-validator",
  },
});
assert(applicationRouteResult.status === 201, "recruiting route must create application");

const applicationStageRouteResult = await recruitingRoute.handle({
  method: "POST",
  context: routeContext,
  params: { resource: "application_stage", application_id: "application-route-validator" },
  body: { stage: "screening", stage_reason: "minimum_qualifications_met" },
});
assert(applicationStageRouteResult.status === 200, "recruiting route must update application stage");

const interviewRouteResult = await recruitingRoute.handle({
  method: "POST",
  context: routeContext,
  body: {
    resource: "interviews",
    interview_id: "interview-route-validator",
    application_id: "application-route-validator",
    candidate_id: "candidate-route-validator",
    scheduled_for: "2026-07-04T10:00:00.000Z",
    schedule_source_ref: "Calendar:interview-route-validator",
    interviewer_employee_ids: ["emp-reviewer"],
  },
});
assert(interviewRouteResult.status === 201, "recruiting route must create interview");
const interviewFeedbackRouteResult = await recruitingRoute.handle({
  method: "POST",
  context: routeContext,
  params: { resource: "interview_feedback", interview_id: "interview-route-validator" },
  body: {
    feedback_source_ref: "InterviewFeedback:route-validator",
    reviewer_employee_id: "emp-reviewer",
  },
});
assert(interviewFeedbackRouteResult.status === 200, "recruiting route must record interview feedback source");

const conversionRouteResult = await recruitingRoute.handle({
  method: "POST",
  context: routeContext,
  body: {
    resource: "convert_to_employee",
    candidate: {
      candidate_id: "candidate-route-validator",
      legal_name: "Route Candidate Validator",
      source_ref: "ATS:route-validator",
      retention_policy_id: "candidate-retention-2y",
    },
    application: {
      application_id: "application-route-conversion",
      candidate_id: "candidate-route-validator",
      job_opening_id: "job-route-validator",
      stage: "hired",
    },
    offer: {
      offer_id: "offer-route-validator",
      application_id: "application-route-conversion",
      candidate_id: "candidate-route-validator",
      compensation_ref: "CompPackage:route-validator",
      document_ref: "Doc:offer-route-validator",
      state: "accepted",
      approval_ref: "Approval:offer-route-validator",
    },
    approval_ref: "Approval:conversion-route-validator",
    employee_id: "emp-route-validator",
    profile_id: "profile-route-validator",
    title: "People Ops Partner",
    effective_from: "2026-08-01",
  },
});
assert(conversionRouteResult.status === 201, "recruiting route must convert candidate to employee with explicit approval");

const onboardingRouteResult = await lifecycleRoute.handle({
  method: "POST",
  context: routeContext,
  body: {
    resource: "onboarding",
    onboarding_id: "onboarding-route-validator",
    employee_id: "emp-route-validator",
    start_date: "2026-08-01",
    tasks: [{ task_id: "policy-ack", title: "Policy acknowledgement", owner_role: "people_ops" }],
    document_refs: ["Doc:policy"],
    access_requests: [{ request_id: "access-validator", system_ref: "IdP:core", access_level: "employee" }],
  },
});
assert(onboardingRouteResult.status === 201, "lifecycle route must create onboarding plan");
const onboardingTaskRouteResult = await lifecycleRoute.handle({
  method: "POST",
  context: routeContext,
  params: { resource: "onboarding_task", onboarding_id: "onboarding-route-validator", task_id: "policy-ack" },
  body: { status: "completed" },
});
assert(onboardingTaskRouteResult.status === 200, "lifecycle route must update onboarding task");

const offboardingRouteResult = await lifecycleRoute.handle({
  method: "POST",
  context: routeContext,
  body: {
    resource: "offboarding",
    offboarding_id: "offboarding-route-validator",
    employee_id: "emp-route-validator",
    separation_date: "2026-12-31",
    access_revocations: [{ system_ref: "IdP:core", revoked: true }],
    document_returns: [{ document_ref: "Doc:laptop", returned: true }],
    legal_hold_checks: [{ hold_ref: "LegalHold:none", clear: true }],
  },
});
assert(offboardingRouteResult.status === 201, "lifecycle route must create offboarding case");
const offboardingCloseRouteResult = await lifecycleRoute.handle({
  method: "POST",
  context: routeContext,
  params: { resource: "offboarding_close", offboarding_id: "offboarding-route-validator" },
  body: {},
});
assert(offboardingCloseRouteResult.status === 200, "lifecycle route must close only ready offboarding case");

const workflowActions = audit.list({ tenant_id: "tenant-a" }).map((event) => event.action);
for (const action of ["hrx.leave.submit", "hrx.leave.approve", "hrx.payroll.preview", "hrx.payroll.approve", "hrx.payroll.export"]) {
  assert(workflowActions.includes(action), `workflow audit missing ${action}`);
}

const routeWorkflowActions = workflowRouteAudit.list({ tenant_id: "tenant-a" }).map((event) => event.action);
for (const action of [
  "hrx.candidate.create",
  "hrx.application.create",
  "hrx.application.stage.update",
  "hrx.interview.create",
  "hrx.interview.feedback.record",
  "hrx.candidate.convert_to_employee",
  "hrx.onboarding.create",
  "hrx.onboarding.task.update",
  "hrx.offboarding.create",
  "hrx.offboarding.close",
]) {
  assert(routeWorkflowActions.includes(action), `route workflow audit missing ${action}`);
}

if (errors.length > 0) {
  console.error("HRX workflow validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("HRX workflow validation passed.");
console.log("scope: people_ops_workflows");
