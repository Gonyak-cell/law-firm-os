import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSqlHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store-sql.js";
import { verifyHrxAuditHashChain } from "../../../../packages/audit/src/hrx-hash-chain.js";
import { createSqlAttendanceStore } from "../../../../packages/hrx/src/attendance.js";
import { createSqlHrxDocumentStore } from "../../../../packages/hrx/src/documents.js";
import { createSqlLeaveBalanceLedger } from "../../../../packages/hrx/src/leave/balance.js";
import { createSqlLeaveRequestStore } from "../../../../packages/hrx/src/leave/request-service.js";
import { createSqlOvertimeStore } from "../../../../packages/hrx/src/overtime.js";
import { createHrxRuntimeContext, handleHrxApiRequest } from "../../src/hrx-runtime-context.js";
import { createSqlHrxRepository } from "../../../../packages/hrx/src/repository-sql.js";
import { createFileHrxStore } from "../../../../packages/hrx/src/store/file-store.js";
import { runHrxMigrations } from "../../../../packages/hrx/src/migrations/index.js";

test("HRX runtime repository write survives store reopen", () => {
  const storeFile = join(mkdtempSync(join(tmpdir(), "hrx-runtime-durability-")), "hrx-store.json");
  const store = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(store);
  const context = createHrxRuntimeContext({ store });
  context.repository.createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-durable",
    display_name: "Durable Employee",
    status: "active",
  });
  context.repository.createEmploymentProfile({
    tenant_id: "tenant-a",
    profile_id: "profile-durable",
    employee_id: "emp-durable",
    employment_type: "full_time",
    status: "active",
    effective_from: "2026-06-20",
  });
  context.documents.create({
    tenant_id: "tenant-a",
    document_id: "doc-durable",
    employee_id: "emp-durable",
    document_type: "policy_ack",
    source_ref: "DMS:doc-durable",
  });
  context.leaveLedger.append({
    tenant_id: "tenant-a",
    entry_id: "pto-earned-durable",
    employee_id: "emp-durable",
    policy_id: "pto-us",
    entry_type: "earned",
    amount: 8,
    occurred_on: "2026-06-20",
    source_ref: "PolicyAccrual:2026-06",
  });
  context.leaveStore.create({
    tenant_id: "tenant-a",
    request_id: "leave-durable",
    employee_id: "emp-durable",
    policy_id: "pto-us",
    leave_type: "pto",
    amount: 8,
    start_date: "2026-06-24",
    end_date: "2026-06-24",
  });
  context.attendance.write({
    tenant_id: "tenant-a",
    attendance_id: "att-durable",
    employee_id: "emp-durable",
    work_date: "2026-06-24",
    status: "present",
    recorded_hours: 8,
    source_ref: "TimeClock:durability",
  });
  context.overtime.create({
    tenant_id: "tenant-a",
    overtime_id: "ot-durable",
    employee_id: "emp-durable",
    work_date: "2026-06-24",
    hours: 2,
    reason: "durability test",
  });
  context.audit.append({
    tenant_id: "tenant-a",
    event_id: "evt-durable",
    actor_id: "user-a",
    action: "hrx.employee.read",
    object_type: "Employee",
    object_id: "emp-durable",
    decision: "allow",
    reason: "durability_test",
    occurred_at: "2026-06-20T00:00:00.000Z",
  });
  store.close();

  const reopenedStore = createFileHrxStore({ filePath: storeFile });
  const reopenedRepository = createSqlHrxRepository({ store: reopenedStore });
  const reopenedDocuments = createSqlHrxDocumentStore({ store: reopenedStore });
  const reopenedLeaveLedger = createSqlLeaveBalanceLedger({ store: reopenedStore });
  const reopenedLeaveStore = createSqlLeaveRequestStore({ store: reopenedStore });
  const reopenedAttendance = createSqlAttendanceStore({ store: reopenedStore });
  const reopenedOvertime = createSqlOvertimeStore({ store: reopenedStore });
  const reopenedAudit = createSqlHrxAuditEventStore({ store: reopenedStore });
  assert.equal(
    reopenedRepository.getEmployee({ tenant_id: "tenant-a", employee_id: "emp-durable" }).display_name,
    "Durable Employee",
  );
  assert.equal(reopenedRepository.listEmploymentProfiles({ tenant_id: "tenant-a", employee_id: "emp-durable" }).length, 1);
  assert.equal(reopenedDocuments.list({ tenant_id: "tenant-a", employee_id: "emp-durable" }).length, 1);
  assert.equal(reopenedLeaveLedger.list({ tenant_id: "tenant-a", employee_id: "emp-durable" }).length, 1);
  assert.equal(reopenedLeaveStore.list({ tenant_id: "tenant-a", employee_id: "emp-durable" }).length, 1);
  assert.equal(reopenedAttendance.list({ tenant_id: "tenant-a", employee_id: "emp-durable" }).length, 1);
  assert.equal(reopenedOvertime.list({ tenant_id: "tenant-a", employee_id: "emp-durable" }).length, 1);
  assert.equal(verifyHrxAuditHashChain(reopenedAudit.list({ tenant_id: "tenant-a" })), true);
  reopenedStore.close();
});

test("HRX recruiting and lifecycle writes survive runtime reopen", () => {
  const storeFile = join(mkdtempSync(join(tmpdir(), "hrx-recruiting-lifecycle-durability-")), "hrx-store.json");
  const requestContext = Object.freeze({
    tenant_id: "tenant-a",
    actor_id: "user-hrx-durable",
    actor_role: "hr_admin",
    hrx_scopes: ["hrx.candidate.write", "hrx.lifecycle.write"],
    session_bound: true,
  });
  const post = (context, pathname, body = {}) => handleHrxApiRequest({ pathname, method: "POST", body, context, requestContext });
  const get = (context, pathname, query = {}) => handleHrxApiRequest({ pathname, method: "GET", query, context, requestContext });

  const store = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(store);
  const context = createHrxRuntimeContext({ store });
  assert.equal(post(context, "/api/hrx/recruiting/job-openings", {
    job_opening_id: "job-durable",
    title: "Durable Recruiting Counsel",
    department_ref: "PracticeGroup:litigation",
    hiring_manager_employee_id: "emp-001",
    position_count: 1,
    state: "open",
    approval_ref: "Approval:job-durable",
  }).status, 201);
  assert.equal(post(context, "/api/hrx/recruiting/candidates", {
    candidate_id: "cand-durable",
    legal_name: "Durable Candidate",
    email: "durable.candidate@example.com",
    source_ref: "ATS:durable:cand-durable",
    resume_ref: "DMS:durable-resume",
    retention_policy_id: "candidate-retention-2y",
    consent: {
      consent_id: "consent-durable",
      purpose: "recruiting_processing",
      granted_at: "2026-07-03T00:00:00.000Z",
      evidence_ref: "Consent:durable",
    },
  }).status, 201);
  assert.equal(post(context, "/api/hrx/recruiting/applications", {
    application_id: "app-durable",
    candidate_id: "cand-durable",
    job_opening_id: "job-durable",
    stage: "interview",
    submitted_at: "2026-07-03T00:01:00.000Z",
  }).status, 201);
  assert.equal(post(context, "/api/hrx/recruiting/interviews", {
    interview_id: "int-durable",
    application_id: "app-durable",
    candidate_id: "cand-durable",
    scheduled_for: "2026-07-08T02:00:00.000Z",
    schedule_source_ref: "CalendarEvent:int-durable",
    interviewer_employee_ids: ["emp-001"],
  }).status, 201);
  assert.equal(post(context, "/api/hrx/recruiting/offers", {
    offer_id: "offer-durable",
    application_id: "app-durable",
    candidate_id: "cand-durable",
    compensation_ref: "CompPackage:durable",
    document_ref: "DMS:offer-durable",
    state: "sent",
    approval_ref: "Approval:offer-durable",
  }).status, 201);
  assert.equal(post(context, "/api/hrx/recruiting/applications/app-durable/stage", { stage: "offer" }).status, 200);
  assert.equal(post(context, "/api/hrx/recruiting/offers/offer-durable/stage", { state: "accepted" }).status, 200);
  assert.equal(post(context, "/api/hrx/lifecycle/onboarding/onb-001/tasks/policy-ack", { status: "completed" }).status, 200);
  assert.equal(post(context, "/api/hrx/lifecycle/offboarding/off-001/close").status, 200);
  store.close();

  const reopenedStore = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(reopenedStore);
  const reopened = createHrxRuntimeContext({ store: reopenedStore });
  const pipeline = get(reopened, "/api/hrx/recruiting/pipeline").body;
  assert.equal(pipeline.job_openings.some((item) => item.job_opening_id === "job-durable"), true);
  assert.equal(pipeline.candidates.some((item) => item.candidate_id === "cand-durable"), true);
  assert.equal(pipeline.applications.find((item) => item.application_id === "app-durable")?.stage, "offer");
  assert.equal(pipeline.interviews.some((item) => item.interview_id === "int-durable"), true);
  assert.equal(pipeline.offers.find((item) => item.offer_id === "offer-durable")?.state, "accepted");
  const onboarding = get(reopened, "/api/hrx/lifecycle/onboarding").body.onboarding.find((item) => item.onboarding_id === "onb-001");
  assert.equal(onboarding.tasks.find((task) => task.task_id === "policy-ack")?.status, "completed");
  const offboarding = get(reopened, "/api/hrx/lifecycle/offboarding").body.offboarding.find((item) => item.offboarding_id === "off-001");
  assert.equal(offboarding.state, "closed");
  reopenedStore.close();
});

test("operational HRX construction is read-only and risk, approval, policy, and AI authority survives reopen", () => {
  const operationalStore = createFileHrxStore();
  runHrxMigrations(operationalStore);
  const beforeConstruction = operationalStore.snapshot();
  createHrxRuntimeContext({ store: operationalStore, seedRuntimeFixtures: false });
  assert.deepEqual(operationalStore.snapshot(), beforeConstruction);
  operationalStore.close();

  const storeFile = join(mkdtempSync(join(tmpdir(), "hrx-operational-authority-durability-")), "hrx-store.json");
  const requestContext = Object.freeze({
    tenant_id: "tenant-a",
    actor_id: "user-hrx-authority",
    actor_role: "hr_admin",
    hrx_scopes: ["hrx.risk.read", "hrx.risk.write", "hrx.approval.write", "hrx.policy.write"],
    session_bound: true,
  });
  const request = (context, pathname, method, body = {}, query = {}) => handleHrxApiRequest({
    pathname,
    method,
    body,
    query,
    context,
    requestContext,
  });

  const store = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(store);
  const context = createHrxRuntimeContext({ store });
  const consentCountBeforeInvalidCandidate = store.snapshot().tables.hrx_candidate_consents.length;
  assert.equal(request(context, "/api/hrx/recruiting/candidates", "POST", {
    candidate_id: "candidate-invalid-atomicity",
    consent: {
      consent_id: "consent-invalid-atomicity",
      purpose: "recruiting_processing",
      granted_at: "2026-07-18T00:00:00.000Z",
      evidence_ref: "Consent:invalid-atomicity",
    },
  }).status, 400);
  assert.equal(store.snapshot().tables.hrx_candidate_consents.length, consentCountBeforeInvalidCandidate);
  const scan = request(context, "/api/hrx/risks/scan", "POST", { as_of: "2026-07-18" });
  assert.equal(scan.status, 200);
  const riskId = scan.body.risk_events[0]?.risk_event_id;
  assert.equal(typeof riskId, "string");
  assert.equal(request(
    context,
    `/api/hrx/risks/${encodeURIComponent(riskId)}/transition`,
    "POST",
    { status: "acknowledged", reason: "durability_probe" },
  ).status, 200);
  assert.equal(request(context, "/api/hrx/approvals/approval-legal-risk-001/approve", "POST", {
    decision_reason: "durability_probe",
  }).status, 200);
  assert.equal(request(context, "/api/hrx/policies", "POST", {
    policy_id: "retention-durable",
    policy_type: "retention",
    policy_version: "2026.2",
    effective_from: "2026-07-18",
  }).status, 201);
  assert.equal(context.aiSourceRegistry.get({ tenant_id: "tenant-a", source_ref: "Policy:leave:2026" })?.source_type, "policy_document");
  assert.equal(context.aiSourceChunks.get({
    tenant_id: "tenant-a",
    source_ref: "Policy:leave:2026",
    chunk_id: "leave-policy-annual-promotion",
  })?.raw_payload_present, false);
  store.close();

  const reopenedStore = createFileHrxStore({ filePath: storeFile });
  runHrxMigrations(reopenedStore);
  const reopened = createHrxRuntimeContext({ store: reopenedStore });
  assert.equal(reopened.riskEvents.get({ tenant_id: "tenant-a", risk_event_id: riskId })?.status, "acknowledged");
  assert.equal(reopened.approvals.find((item) =>
    item.tenant_id === "tenant-a" && item.approval_id === "approval-legal-risk-001")?.state, "approved");
  assert.equal(reopened.policies.some((item) => item.tenant_id === "tenant-a" && item.policy_id === "retention-durable"), true);
  assert.equal(reopened.aiSourceRegistry.get({ tenant_id: "tenant-a", source_ref: "Policy:leave:2026" })?.raw_payload_present, false);
  assert.equal(reopened.aiSourceChunks.get({
    tenant_id: "tenant-a",
    source_ref: "Policy:leave:2026",
    chunk_id: "leave-policy-annual-promotion",
  })?.chunk_hash.length, 64);
  reopenedStore.close();
});
