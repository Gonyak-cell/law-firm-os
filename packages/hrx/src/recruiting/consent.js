export const HRX_CANDIDATE_CONSENT_PURPOSES = Object.freeze([
  "recruiting_processing",
  "background_check",
  "talent_pool",
]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createCandidateConsent(input = {}) {
  const purpose = requiredString(input, "purpose");
  if (!HRX_CANDIDATE_CONSENT_PURPOSES.includes(purpose)) {
    throw new TypeError(`purpose must be one of ${HRX_CANDIDATE_CONSENT_PURPOSES.join(", ")}`);
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    consent_id: requiredString(input, "consent_id"),
    candidate_id: requiredString(input, "candidate_id"),
    purpose,
    granted_at: requiredString(input, "granted_at"),
    expires_at: input.expires_at ?? null,
    revoked_at: input.revoked_at ?? null,
    evidence_ref: requiredString(input, "evidence_ref"),
  });
}

export function assertCandidateConsentAllowsProcessing(consents = [], input = {}) {
  const tenantId = requiredString(input, "tenant_id");
  const candidateId = requiredString(input, "candidate_id");
  const purpose = input.purpose ?? "recruiting_processing";
  const asOf = input.as_of ?? new Date().toISOString();
  const consent = consents.map(createCandidateConsent).find((item) => {
    return (
      item.tenant_id === tenantId &&
      item.candidate_id === candidateId &&
      item.purpose === purpose &&
      !item.revoked_at &&
      (!item.expires_at || item.expires_at > asOf)
    );
  });
  if (!consent) throw new TypeError("candidate consent is required before processing");
  return consent;
}
