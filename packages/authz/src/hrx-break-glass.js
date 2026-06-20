import { isHrxStepUpSessionFresh } from "./hrx-step-up-session.js";

function hasFreshStepUp(input = {}) {
  const principal = input.principal ?? {};
  const context = {
    tenant_id: principal.tenant_id,
    actor_id: principal.actor_id ?? principal.user_id,
  };
  return isHrxStepUpSessionFresh(input.step_up_session ?? input.step_up, {
    context,
    now: input.now ?? new Date().toISOString(),
  });
}

export function evaluateHrxBreakGlass(input = {}) {
  const principal = input.principal ?? {};
  const now = input.now ? new Date(input.now) : new Date();
  const expiresAt = input.expires_at ? new Date(input.expires_at) : null;
  const errors = [];

  if (typeof input.reason !== "string" || input.reason.trim() === "") errors.push("reason_required");
  if (typeof input.approver_id !== "string" || input.approver_id.trim() === "") errors.push("approver_required");
  if (!expiresAt || Number.isNaN(expiresAt.getTime()) || expiresAt <= now) errors.push("future_expiry_required");
  if (input.audit_required !== true) errors.push("audit_required");
  if (!hasFreshStepUp(input)) errors.push("step_up_required");
  if (!Array.isArray(principal.role_ids) || !principal.role_ids.some((role) => ["hr_admin", "security_admin"].includes(role))) {
    errors.push("break_glass_role_required");
  }

  if (errors.length > 0) {
    return Object.freeze({
      effect: "deny",
      reason: "hrx_break_glass_denied",
      errors: Object.freeze(errors),
      audit_required: true,
      fail_closed: true,
    });
  }

  return Object.freeze({
    effect: "allow",
    reason: "hrx_break_glass_allow",
    approver_id: input.approver_id.trim(),
    expires_at: expiresAt.toISOString(),
    audit_required: true,
    fail_closed: false,
  });
}
