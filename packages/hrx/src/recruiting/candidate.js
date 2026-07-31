const CRM_PARTY_FIELDS = Object.freeze(["party_id", "crm_party_id", "client_party_id", "contact_id"]);
const BODY_FIELDS = Object.freeze([
  "resume_body",
  "resume_text",
  "cover_letter",
  "cover_letter_body",
  "document_body",
  "documents",
  "attachments",
  "interview_feedback",
  "interview_notes",
  "notes",
]);
const CANDIDATE_ACCESS_ROLES = Object.freeze([
  "people_ops",
  "hr_admin",
  "hr_reviewer",
  "recruiter",
]);

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

function optionalIsoTimestamp(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new TypeError(`${field} must be an ISO timestamp`);
  }
  return value;
}

function accessRoles(input) {
  const roles = input?.access_role_ids ?? ["people_ops", "hr_admin", "recruiter"];
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new TypeError("access_role_ids must be a non-empty array");
  }
  const normalized = [...new Set(roles.map((role) => String(role).trim()).filter(Boolean))];
  if (normalized.some((role) => !CANDIDATE_ACCESS_ROLES.includes(role))) {
    throw new TypeError(`access_role_ids must contain only: ${CANDIDATE_ACCESS_ROLES.join(", ")}`);
  }
  return Object.freeze(normalized);
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
    retention_expires_at: optionalIsoTimestamp(input, "retention_expires_at"),
    deletion_requested_at: optionalIsoTimestamp(input, "deletion_requested_at"),
    access_role_ids: accessRoles(input),
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
