export const HRX_STEP_UP_REQUIRED_ACTION_PREFIXES = Object.freeze([
  "hrx.compensation.",
  "hrx.evaluation.",
  "hrx.payroll.",
  "hrx.audit.",
  "hrx.ai.final_decision",
]);

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requiresStepUp(action) {
  const value = clean(action);
  return HRX_STEP_UP_REQUIRED_ACTION_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function tokenMatchesContext(token = {}, context = {}) {
  return token.tenant_id === context.tenant_id && token.actor_id === context.actor_id;
}

function tokenFresh(token = {}, now = new Date().toISOString()) {
  if (!token.expires_at) return false;
  return Date.parse(token.expires_at) > Date.parse(now);
}

export function evaluateHrxStepUp({ action, context = {}, token = null, now } = {}) {
  if (!requiresStepUp(action)) {
    return Object.freeze({ effect: "allow", reason: "hrx_step_up_not_required", step_up_required: false });
  }
  if (!token || token.mfa !== true || Number(token.assurance_level ?? 0) < 2 || !tokenMatchesContext(token, context) || !tokenFresh(token, now)) {
    return Object.freeze({
      effect: "challenge",
      status: 403,
      safe_error_code: "HRX_STEP_UP_REQUIRED",
      reason: "hrx_sensitive_action_requires_fresh_mfa",
      step_up_required: true,
      fail_closed: true,
    });
  }
  return Object.freeze({
    effect: "allow",
    reason: "hrx_step_up_satisfied",
    step_up_required: true,
    assurance_level: Number(token.assurance_level),
    expires_at: token.expires_at,
  });
}

export function requireHrxStepUp(input = {}) {
  const decision = evaluateHrxStepUp(input);
  if (decision.effect !== "allow") {
    const error = new Error(decision.safe_error_code);
    error.status = decision.status;
    error.safe_error_code = decision.safe_error_code;
    error.decision = decision;
    throw error;
  }
  return decision;
}
