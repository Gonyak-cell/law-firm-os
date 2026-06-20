import { evaluateHrxPolicy } from "./hrx-policy-engine.js";
import { isHrxStepUpSessionFresh } from "./hrx-step-up-session.js";

export const HRX_COMPENSATION_MASKED_FIELDS = Object.freeze(["amount", "currency", "bonus_amount", "equity_value", "payroll_ref"]);

function hasFreshStepUp(input = {}) {
  const principal = input.principal ?? {};
  return isHrxStepUpSessionFresh(input.step_up_session ?? input.step_up, {
    context: {
      tenant_id: principal.tenant_id,
      actor_id: principal.actor_id ?? principal.user_id,
    },
    now: input.now ?? new Date().toISOString(),
  });
}

export function evaluateHrxCompensationAccess(input = {}) {
  if (!hasFreshStepUp(input)) {
    return Object.freeze({
      effect: "deny",
      reason: "hrx_compensation_step_up_required",
      action: input.action ?? null,
      required_scope: input.required_scope ?? "hrx.compensation.read",
      audit_required: true,
      mask_fields: HRX_COMPENSATION_MASKED_FIELDS,
      fail_closed: true,
    });
  }
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
