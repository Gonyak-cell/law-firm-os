import assert from "node:assert/strict";
import test from "node:test";
import { createHrxAuditEventStore } from "../../../../packages/audit/src/hrx-event-store.js";
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
  const route = createHrxRecruitingRoute({ audit });

  await route.handle({
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

  const conversion = await route.handle({
    method: "POST",
    context,
    params: { resource: "convert_to_employee" },
    body: {
      candidate: {
        candidate_id: "cand-001",
        legal_name: "Candidate One",
        source_ref: "ATS:cand-001",
        resume_ref: "DocRef:resume-001",
        retention_policy_id: "candidate-retention-2y",
      },
      application: {
        application_id: "app-001",
        candidate_id: "cand-001",
        job_opening_id: "job-001",
        stage: "hired",
      },
      offer: {
        offer_id: "offer-001",
        application_id: "app-001",
        candidate_id: "cand-001",
        compensation_ref: "CompRef:offer-001",
        document_ref: "DocRef:offer-letter-001",
        state: "accepted",
        approval_ref: "Approval:offer-001",
      },
      approval_ref: "Approval:convert-cand-001",
      employee_id: "emp-001",
      profile_id: "profile-001",
      title: "Associate",
      effective_from: "2026-08-01",
    },
  });
  assert.equal(conversion.status, 201);
  assert.equal(conversion.body.conversion.crm_party_linked, false);
  assert.equal(audit.list({ tenant_id: "tenant-a" }).at(-1).action, "hrx.candidate.convert_to_employee");
});
