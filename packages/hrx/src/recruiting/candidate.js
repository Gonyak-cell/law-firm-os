const CRM_PARTY_FIELDS = Object.freeze(["party_id", "crm_party_id", "client_party_id", "contact_id"]);
const BODY_FIELDS = Object.freeze(["resume_body", "cover_letter_body", "interview_feedback"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function assertNoBlockedFields(input, fields, reason) {
  for (const field of fields) {
    if (Object.hasOwn(input, field)) throw new TypeError(`${reason}: ${field}`);
  }
}

export function assertCandidateNotCrmParty(input = {}) {
  assertNoBlockedFields(input, CRM_PARTY_FIELDS, "Candidate profile must not include CRM Party identifier");
}

export function createCandidateProfile(input = {}) {
  assertCandidateNotCrmParty(input);
  assertNoBlockedFields(input, BODY_FIELDS, "Candidate profile must store source refs instead of body fields");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    candidate_id: requiredString(input, "candidate_id"),
    legal_name: requiredString(input, "legal_name"),
    email: input.email ?? null,
    phone: input.phone ?? null,
    source_ref: requiredString(input, "source_ref"),
    resume_ref: input.resume_ref ?? null,
    retention_policy_id: requiredString(input, "retention_policy_id"),
    retention_basis: input.retention_basis ?? "candidate_recruiting_record",
    data_subject_type: "candidate",
    crm_party_linked: false,
  });
}

export function createCandidateRetentionScope(candidate = {}) {
  const profile = createCandidateProfile(candidate);
  return Object.freeze({
    tenant_id: profile.tenant_id,
    subject_type: "candidate",
    subject_id: profile.candidate_id,
    retention_policy_id: profile.retention_policy_id,
    retention_basis: profile.retention_basis,
  });
}
