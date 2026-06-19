export const HRX_FIELD_MASKS = Object.freeze({
  compensation: Object.freeze({
    required_scope: "hrx.compensation.read",
    fields: Object.freeze(["amount", "currency", "bonus_amount", "equity_value", "payroll_ref"]),
  }),
  evaluation: Object.freeze({
    required_scope: "hrx.evaluation.read",
    fields: Object.freeze(["rating", "manager_notes", "calibration_notes", "improvement_plan"]),
  }),
  candidate: Object.freeze({
    required_scope: "hrx.candidate.read",
    fields: Object.freeze(["email", "phone", "resume_ref", "interview_feedback", "offer_compensation_ref"]),
  }),
  payroll: Object.freeze({
    required_scope: "hrx.payroll.preview",
    fields: Object.freeze(["bank_account_ref", "tax_profile_ref", "gross_pay", "net_pay"]),
  }),
});

export function maskHrxFields(record = {}, { sensitivity, granted_scopes = [] } = {}) {
  const mask = HRX_FIELD_MASKS[sensitivity];
  if (!mask) return Object.freeze({ ...record });
  if (granted_scopes.includes(mask.required_scope)) return Object.freeze({ ...record });
  const masked = { ...record };
  for (const field of mask.fields) {
    if (Object.hasOwn(masked, field)) masked[field] = null;
  }
  masked.masked = true;
  masked.mask_reason = `missing_scope:${mask.required_scope}`;
  return Object.freeze(masked);
}
