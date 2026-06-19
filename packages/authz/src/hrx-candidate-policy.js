import { evaluateHrxPolicy } from "./hrx-policy-engine.js";

export const HRX_CANDIDATE_MASKED_FIELDS = Object.freeze(["email", "phone", "resume_ref", "interview_feedback", "offer_compensation_ref"]);

export function evaluateHrxCandidateAccess(input = {}) {
  const principal = input.principal ?? {};
  if (Array.isArray(principal.scopes) && principal.scopes.includes("crm.party.read") && !principal.hrx_scopes?.includes("hrx.candidate.read")) {
    return Object.freeze({
      effect: "deny",
      reason: "hrx_candidate_not_crm_party_scope",
      action: input.action ?? null,
      required_scope: "hrx.candidate.read",
      audit_required: true,
      mask_fields: HRX_CANDIDATE_MASKED_FIELDS,
      fail_closed: true,
    });
  }
  const decision = evaluateHrxPolicy({
    ...input,
    sensitivity: "candidate",
    required_scope: input.required_scope ?? "hrx.candidate.read",
  });
  if (decision.effect !== "allow") {
    return Object.freeze({
      ...decision,
      mask_fields: HRX_CANDIDATE_MASKED_FIELDS,
    });
  }
  return decision;
}

export function maskHrxCandidateRecord(record = {}, decision = {}) {
  if (decision.effect === "allow") return Object.freeze({ ...record });
  const masked = { ...record };
  for (const field of HRX_CANDIDATE_MASKED_FIELDS) {
    if (Object.hasOwn(masked, field)) masked[field] = null;
  }
  masked.masked = true;
  masked.mask_reason = decision.reason ?? "hrx_candidate_restricted";
  return Object.freeze(masked);
}
