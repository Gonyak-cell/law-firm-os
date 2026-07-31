import assert from "node:assert/strict";
import test from "node:test";
import { createCandidateProfile } from "../src/recruiting/candidate.js";
import { createCandidateConsent } from "../src/recruiting/consent.js";
import {
  createCandidatePrivacyProjection,
  projectInterviewForRecruitingViewer,
} from "../src/recruiting/privacy.js";

const candidate = createCandidateProfile({
  tenant_id: "tenant-a",
  candidate_id: "cand-privacy",
  legal_name: "지원자",
  email: "candidate@example.test",
  source_ref: "ATS:cand-privacy",
  resume_ref: "Vault:resume:cand-privacy",
  retention_policy_id: "candidate-2y",
  retention_expires_at: "2028-01-01T00:00:00.000Z",
  access_role_ids: ["people_ops", "recruiter"],
});

const consent = createCandidateConsent({
  tenant_id: "tenant-a",
  consent_id: "consent-privacy",
  candidate_id: "cand-privacy",
  purpose: "recruiting_processing",
  granted_at: "2026-01-01T00:00:00.000Z",
  expires_at: "2027-01-01T00:00:00.000Z",
  evidence_ref: "Vault:consent:cand-privacy",
});

test("candidate privacy projection exposes minimum fields only to an allowed role with active consent", () => {
  const view = createCandidatePrivacyProjection({
    candidate,
    consents: [consent],
    as_of: "2026-07-30T00:00:00.000Z",
    viewer_role_ids: ["people_ops"],
  });
  assert.equal(view.privacy_state, "active");
  assert.equal(view.legal_name, "지원자");
  assert.equal(view.consent_ref, "Vault:consent:cand-privacy");
  assert.equal(view.raw_content_included, false);
  assert.equal(Object.hasOwn(view, "resume_body"), false);
});

test("candidate privacy projection masks missing, expired, revoked, denied, and retention-due records", () => {
  const missing = createCandidatePrivacyProjection({
    candidate,
    consents: [],
    as_of: "2026-07-30T00:00:00.000Z",
    viewer_role_ids: ["people_ops"],
  });
  assert.equal(missing.privacy_state, "consent_missing");
  assert.equal(missing.legal_name, null);

  const expiredConsent = createCandidatePrivacyProjection({
    candidate,
    consents: [{ ...consent, expires_at: "2026-01-02T00:00:00.000Z" }],
    as_of: "2026-07-30T00:00:00.000Z",
    viewer_role_ids: ["people_ops"],
  });
  assert.equal(expiredConsent.privacy_state, "consent_expired");

  const revoked = createCandidatePrivacyProjection({
    candidate,
    consents: [{ ...consent, revoked_at: "2026-07-01T00:00:00.000Z" }],
    as_of: "2026-07-30T00:00:00.000Z",
    viewer_role_ids: ["people_ops"],
  });
  assert.equal(revoked.privacy_state, "consent_revoked");

  const denied = createCandidatePrivacyProjection({
    candidate,
    consents: [consent],
    as_of: "2026-07-30T00:00:00.000Z",
    viewer_role_ids: ["lawos_staff"],
  });
  assert.equal(denied.privacy_state, "access_denied");
  assert.equal(denied.resume_ref, null);

  const retentionExpired = createCandidatePrivacyProjection({
    candidate: { ...candidate, retention_expires_at: "2026-07-01T00:00:00.000Z" },
    consents: [consent],
    as_of: "2026-07-30T00:00:00.000Z",
    viewer_role_ids: ["people_ops"],
  });
  assert.equal(retentionExpired.privacy_state, "retention_expired");
  assert.equal(retentionExpired.disposition_required, "delete_or_place_legal_hold");
  assert.equal(retentionExpired.email, null);
});

test("candidate domain rejects raw documents, notes, and feedback bodies", () => {
  for (const field of ["resume_body", "resume_text", "document_body", "documents", "attachments", "notes", "interview_feedback"]) {
    assert.throws(
      () => createCandidateProfile({ ...candidate, [field]: field === "documents" || field === "attachments" ? [] : "raw" }),
      /source refs instead of body fields/,
    );
  }
});

test("interview projection keeps raw feedback out and restricts the feedback reference by role", () => {
  const interview = {
    tenant_id: "tenant-a",
    interview_id: "interview-privacy",
    application_id: "app-privacy",
    candidate_id: "cand-privacy",
    scheduled_for: "2026-07-30T01:00:00.000Z",
    schedule_source_ref: "Outlook:event:privacy",
    interviewer_employee_ids: ["emp-1"],
    state: "completed",
    feedback_source_ref: "Vault:scorecard:privacy",
  };
  const allowed = projectInterviewForRecruitingViewer(interview, ["recruiter"]);
  const denied = projectInterviewForRecruitingViewer(interview, ["lawos_staff"]);
  assert.equal(allowed.feedback_source_ref, "Vault:scorecard:privacy");
  assert.equal(allowed.raw_feedback_included, false);
  assert.equal(denied.feedback_source_ref, null);
  assert.equal(denied.feedback_access, "restricted");
});
