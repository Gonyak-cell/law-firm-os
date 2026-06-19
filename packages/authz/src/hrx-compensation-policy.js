import { evaluateHrxPolicy } from "./hrx-policy-engine.js";

export const HRX_COMPENSATION_MASKED_FIELDS = Object.freeze(["amount", "currency", "bonus_amount", "equity_value", "payroll_ref"]);

export function evaluateHrxCompensationAccess(input = {}) {
  const decision = evaluateHrxPolicy({
    ...input,
    sensitivity: "compensation",
    required_scope: input.required_scope ?? "hrx.compensation.read",
  });
  if (decision.effect !== "allow") {
    return Object.freeze({
      ...decision,
      mask_fields: HRX_COMPENSATION_MASKED_FIELDS,
    });
  }
  return decision;
}

export function maskHrxCompensationRecord(record = {}, decision = {}) {
  if (decision.effect === "allow") return Object.freeze({ ...record });
  const masked = { ...record };
  for (const field of HRX_COMPENSATION_MASKED_FIELDS) {
    if (Object.hasOwn(masked, field)) masked[field] = null;
  }
  masked.masked = true;
  masked.mask_reason = decision.reason ?? "hrx_compensation_restricted";
  return Object.freeze(masked);
}
