import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
import { createInMemoryHrxRepository } from "../../../../packages/hrx/src/repository.js";
import { createHrxRecruitingRoute } from "../../src/routes/hrx/recruiting.js";

const context = Object.freeze({ tenant_id: "tenant-a", actor_id: "recruiter-001" });

test("recruiting route creates consented candidate and updates application/offer workflow", async () => {
  const audit = createHrxAuditEventStore();
  const route = createHrxRecruitingRoute({ audit });

  const candidate = await route.handle({
    method: "POST",
    context,
    params: { resource: "candidates" },
    body: {
      candidate_id: "cand-001",
      legal_name: "Candidate One",
      email: "candidate@example.com",
      source_ref: "ATS:cand-001",
      resume_ref: "DocRef:resume-001",
      retention_policy_id: "candidate-retention-2y",
      consent: {
        consent_id: "consent-001",
        candidate_id: "cand-001",
        purpose: "recruiting_processing",
        granted_at: "2026-06-20T00:00:00.000Z",
        evidence_ref: "ConsentForm:cand-001",
      },
    },
  });
  assert.equal(candidate.status, 201);
  assert.equal(candidate.body.candidate.crm_party_linked, false);

  const application = await route.handle({
    method: "POST",
    context,
    params: { resource: "applications" },
    body: {
      application_id: "app-001",
      candidate_id: "cand-001",
      job_opening_id: "job-001",
    },
  });
  assert.equal(application.status, 201);

  const screening = await route.handle({
    method: "POST",
    context,
    params: { resource: "application_stage", application_id: "app-001" },
    body: { stage: "screening", stage_reason: "resume reviewed" },
  });
  assert.equal(screening.status, 200);
  assert.equal(screening.body.application.stage, "screening");

  const offer = await route.handle({
    method: "POST",
    context,
    params: { resource: "offers" },
    body: {
      offer_id: "offer-001",
      application_id: "app-001",
      candidate_id: "cand-001",
      compensation_ref: "CompRef:offer-001",
      document_ref: "DocRef:offer-letter-001",
    },
  });
  assert.equal(offer.status, 201);

  const actions = audit.list({ tenant_id: "tenant-a" }).map((event) => event.action);
  assert.ok(actions.includes("hrx.candidate.create"));
  assert.ok(actions.includes("hrx.application.stage.update"));
  assert.ok(actions.includes("hrx.offer.create"));
});

test("recruiting route records interview feedback source and converts candidate with approval", async () => {
  const audit = createHrxAuditEventStore();
  const repository = createInMemoryHrxRepository({
    employees: [{
      tenant_id: "tenant-a",
      employee_id: "emp-100",
      display_name: "Hiring Manager",
      status: "active",
    }],
  });
  const route = createHrxRecruitingRoute({
    audit,
    repository,
    seed: {
      candidates: [{
        tenant_id: "tenant-a",
        candidate_id: "cand-001",
        legal_name: "Candidate One",
        email: "candidate@example.com",
        source_ref: "RecruitingSource:cand-001",
        resume_ref: "DocumentRef:resume-001",
        retention_policy_id: "candidate-retention-2y",
      }],
      job_openings: [{
        tenant_id: "tenant-a",
        job_opening_id: "job-001",
        title: "Associate",
        department_ref: "org-legal",
        hiring_manager_employee_id: "emp-100",
        position_count: 1,
        state: "open",
        approval_ref: "ApprovalRef:job-001",
      }],
      applications: [{
        tenant_id: "tenant-a",
        application_id: "app-001",
        candidate_id: "cand-001",
        job_opening_id: "job-001",
        stage: "hired",
      }],
      offers: [{
        tenant_id: "tenant-a",
        offer_id: "offer-001",
        application_id: "app-001",
        candidate_id: "cand-001",
        compensation_ref: "CompensationRef:offer-001",
        document_ref: "DocumentRef:offer-letter-001",
        state: "accepted",
        approval_ref: "ApprovalRef:offer-001",
      }],
    },
  });

  const arbitraryInterviewer = await route.handle({
    method: "POST",
    context,
    params: { resource: "interviews" },
    body: {
      interview_id: "int-untrusted",
      application_id: "app-001",
      candidate_id: "cand-001",
      scheduled_for: "2026-07-10T15:00:00.000Z",
      schedule_source_ref: "CalendarEvent:int-untrusted",
      interviewer_employee_ids: ["emp-attacker"],
    },
  });
  assert.equal(arbitraryInterviewer.status, 409);
  assert.equal(arbitraryInterviewer.body.safe_error_code, "HRX_RECRUITING_EMPLOYEE_AUTHORITY_INVALID");

  const interview = await route.handle({
    method: "POST",
    context,
    params: { resource: "interviews" },
    body: {
      interview_id: "int-001",
      application_id: "app-001",
      candidate_id: "cand-001",
      scheduled_for: "2026-07-10T15:00:00.000Z",
      schedule_source_ref: "CalendarEvent:int-001",
      interviewer_employee_ids: ["emp-100"],
    },
  });
  assert.equal(interview.status, 201);
  const feedback = await route.handle({
    method: "POST",
    context,
    params: { resource: "interview_feedback", interview_id: "int-001" },
    body: {
      feedback_source_ref: "Scorecard:int-001",
      reviewer_employee_id: "emp-100",
    },
  });
  assert.equal(feedback.status, 200);
  assert.equal(feedback.body.interview.feedback_source_ref, "Scorecard:int-001");

  const arbitraryAuthority = await route.handle({
    method: "POST",
    context,
    params: { resource: "convert_to_employee", application_id: "app-001" },
    body: {
      idempotency_key: "candidate-conversion:app-001",
      effective_from: "2026-08-01",
      manager_employee_id: "emp-attacker",
    },
  });
  assert.equal(arbitraryAuthority.status, 400);
  assert.equal(
    arbitraryAuthority.body.safe_error_code,
    "HRX_CANDIDATE_CONVERSION_AUTHORITY_FIELDS_FORBIDDEN",
  );

  const conversionRequest = {
    idempotency_key: "candidate-conversion:app-001",
    effective_from: "2026-08-01",
  };
  const conversion = await route.handle({
    method: "POST",
    context,
    params: { resource: "convert_to_employee", application_id: "app-001" },
    body: conversionRequest,
  });
  assert.equal(conversion.status, 201);
  assert.equal(conversion.body.conversion.crm_party_linked, false);
  assert.match(conversion.body.conversion.employee.employee_id, /^emp_candidate_[a-f0-9]{24}$/);
  assert.match(conversion.body.conversion.employment_profile.profile_id, /^profile_candidate_[a-f0-9]{24}$/);
  assert.equal(conversion.body.conversion.employment_profile.manager_employee_id, "emp-100");
  assert.equal(conversion.body.conversion.employment_profile.title, "Associate");
  assert.equal(conversion.body.conversion.employment_profile.org_unit_id, "org-legal");
  assert.equal(conversion.body.receipt.results.employee.outcome, "created");
  assert.equal(conversion.body.receipt.results.employee_user_link.outcome, "not_requested");
  const replay = await route.handle({
    method: "POST",
    context,
    params: { resource: "convert_to_employee", application_id: "app-001" },
    body: conversionRequest,
  });
  assert.equal(replay.status, 200);
  assert.equal(replay.body.replayed, true);
  assert.deepEqual(replay.body.receipt, conversion.body.receipt);
  assert.equal(audit.list({ tenant_id: "tenant-a" }).at(-1).action, "hrx.candidate.convert_to_employee.completed");
});

test("recruiting route requires active consent and rejects raw candidate or interview content", async () => {
  const route = createHrxRecruitingRoute({ audit: createHrxAuditEventStore() });
  const baseCandidate = {
    candidate_id: "cand-private",
    legal_name: "Privacy Candidate",
    email: "privacy@example.test",
    source_ref: "ATS:cand-private",
    resume_ref: "DocumentRef:resume:cand-private",
    retention_policy_id: "candidate-retention-2y",
    retention_expires_at: "2028-07-30T00:00:00.000Z",
    access_role_ids: ["people_ops", "recruiter"],
  };

  const missingConsent = await route.handle({
    method: "POST",
    context,
    params: { resource: "candidates" },
    body: baseCandidate,
  });
  assert.equal(missingConsent.status, 400);
  assert.match(missingConsent.body.reason, /consent is required/);

  const expiredConsent = await route.handle({
    method: "POST",
    context,
    params: { resource: "candidates" },
    body: {
      ...baseCandidate,
      consent: {
        consent_id: "consent-expired",
        candidate_id: "cand-private",
        purpose: "recruiting_processing",
        granted_at: "2020-01-01T00:00:00.000Z",
        expires_at: "2020-02-01T00:00:00.000Z",
        evidence_ref: "ConsentEvidence:expired",
      },
    },
  });
  assert.equal(expiredConsent.status, 400);
  assert.match(expiredConsent.body.reason, /consent is required/);

  const rawCandidate = await route.handle({
    method: "POST",
    context,
    params: { resource: "candidates" },
    body: {
      ...baseCandidate,
      resume_body: "raw resume",
      consent: {
        consent_id: "consent-raw",
        candidate_id: "cand-private",
        purpose: "recruiting_processing",
        granted_at: "2026-07-01T00:00:00.000Z",
        expires_at: "2027-07-01T00:00:00.000Z",
        evidence_ref: "ConsentEvidence:raw",
      },
    },
  });
  assert.equal(rawCandidate.status, 400);
  assert.match(rawCandidate.body.reason, /source refs instead of body fields/);

  const rawInterview = await route.handle({
    method: "POST",
    context,
    params: { resource: "interviews" },
    body: {
      interview_id: "int-private",
      application_id: "app-private",
      candidate_id: "cand-private",
      scheduled_for: "2026-08-01T01:00:00.000Z",
      schedule_source_ref: "Outlook:int-private",
      interviewer_employee_ids: ["emp-1"],
      notes: "raw interview notes",
    },
  });
  assert.equal(rawInterview.status, 400);
  assert.match(rawInterview.body.reason, /must use source_ref/);
});
