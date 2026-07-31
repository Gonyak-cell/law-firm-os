import { createCandidateProfile } from "./candidate.js";
import { createCandidateConsent } from "./consent.js";
import { createInterview } from "./interview.js";

export const HRX_RECRUITING_FEEDBACK_ROLES = Object.freeze([
  "people_ops",
  "hr_admin",
  "hr_reviewer",
  "recruiter",
]);

function roleSet(values = []) {
  return new Set(
    (Array.isArray(values) ? values : String(values ?? "").split(","))
      .map((value) => String(value).trim())
      .filter(Boolean),
  );
}

function activeConsent(consents, candidate, asOf) {
  return (Array.isArray(consents) ? consents : [])
    .map(createCandidateConsent)
    .find(
      (consent) =>
        consent.tenant_id === candidate.tenant_id &&
        consent.candidate_id === candidate.candidate_id &&
        consent.purpose === "recruiting_processing" &&
        !consent.revoked_at &&
        (!consent.expires_at || consent.expires_at > asOf),
    ) ?? null;
}

function consentState(consents, candidate, asOf) {
  const rows = (Array.isArray(consents) ? consents : [])
    .map(createCandidateConsent)
    .filter(
      (consent) =>
        consent.tenant_id === candidate.tenant_id &&
        consent.candidate_id === candidate.candidate_id &&
        consent.purpose === "recruiting_processing",
    );
  if (rows.some((consent) => consent.revoked_at)) return "revoked";
  if (rows.some((consent) => consent.expires_at && consent.expires_at <= asOf)) return "expired";
  return "missing";
}

export function createCandidatePrivacyProjection({
  candidate: candidateInput,
  consents = [],
  as_of: asOf = new Date().toISOString(),
  viewer_role_ids: viewerRoleIds = [],
  legal_hold_active: legalHoldActive = false,
} = {}) {
  const candidate = createCandidateProfile(candidateInput);
  const viewers = roleSet(viewerRoleIds);
  const canView = candidate.access_role_ids.some((role) => viewers.has(role));
  const consent = activeConsent(consents, candidate, asOf);
  const retentionExpired = Boolean(
    candidate.retention_expires_at &&
    candidate.retention_expires_at <= asOf &&
    !legalHoldActive,
  );
  const privacyState = !canView
    ? "access_denied"
    : candidate.deletion_requested_at
      ? "deletion_requested"
      : retentionExpired
        ? "retention_expired"
        : !consent
          ? `consent_${consentState(consents, candidate, asOf)}`
          : legalHoldActive
            ? "retention_hold"
            : "active";
  const visible = ["active", "retention_hold"].includes(privacyState);
  return Object.freeze({
    candidate_id: candidate.candidate_id,
    data_subject_type: candidate.data_subject_type,
    privacy_state: privacyState,
    legal_name: visible ? candidate.legal_name : null,
    email: visible ? candidate.email : null,
    phone: visible ? candidate.phone : null,
    source_ref: visible ? candidate.source_ref : null,
    resume_ref: visible ? candidate.resume_ref : null,
    consent_ref: visible ? consent?.evidence_ref ?? null : null,
    consent_purpose: consent?.purpose ?? "recruiting_processing",
    consent_expires_at: consent?.expires_at ?? null,
    retention_policy_id: candidate.retention_policy_id,
    retention_expires_at: candidate.retention_expires_at,
    access_role_ids: candidate.access_role_ids,
    deletion_requested_at: candidate.deletion_requested_at,
    disposition_required: ["retention_expired", "deletion_requested"].includes(privacyState)
      ? "delete_or_place_legal_hold"
      : null,
    raw_content_included: false,
  });
}

export function projectInterviewForRecruitingViewer(interviewInput, viewerRoleIds = []) {
  const interview = createInterview(interviewInput);
  const canViewFeedback = HRX_RECRUITING_FEEDBACK_ROLES.some((role) => roleSet(viewerRoleIds).has(role));
  return Object.freeze({
    tenant_id: interview.tenant_id,
    interview_id: interview.interview_id,
    application_id: interview.application_id,
    candidate_id: interview.candidate_id,
    scheduled_for: interview.scheduled_for,
    schedule_source_ref: interview.schedule_source_ref,
    interviewer_employee_ids: interview.interviewer_employee_ids,
    state: interview.state,
    feedback_source_ref: canViewFeedback ? interview.feedback_source_ref : null,
    feedback_access: canViewFeedback ? "reference_visible" : "restricted",
    raw_feedback_included: false,
    restricted_access: true,
    sensitivity: "candidate",
  });
}
