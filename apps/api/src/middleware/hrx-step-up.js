import { listHrxRoutePolicies } from "../routes/hrx/route-policy-map.js";

export const HRX_STEP_UP_REQUIRED_ACTION_PREFIXES = Object.freeze([
  "hrx.compensation.",
  "hrx.evaluation.",
  "hrx.payroll.",
  "hrx.audit.",
  "hrx.ai.final_decision",
  "hrx.leave.policy.write",
  "hrx.leave.accrual.execute",
  "hrx.leave.accrual.rule.",
  "hrx.leave.expiration.execute",
  "hrx.leave.ledger.adjust",
  "hrx.leave.termination.settle",
]);

export const HRX_STEP_UP_PURPOSES = Object.freeze({
  compensation: "compensation_access",
  evaluation: "evaluation_review",
  payrollExportReview: "payroll_export_review",
  payrollPaymentProcessing: "payroll_payment_processing",
  payrollFilingProcessing: "payroll_filing_processing",
  payrollStatementSelfService: "payroll_statement_self_service",
  payrollYearEndProcessing: "payroll_year_end_processing",
  payrollYearEndReview: "payroll_year_end_review",
  audit: "security_audit",
  aiFinalDecision: "people_ai_final_decision",
  leavePolicy: "leave_policy_administration",
  leaveAccrual: "leave_accrual_execute",
  leaveLedger: "leave_ledger_adjustment",
  leaveTermination: "leave_termination_settlement",
});

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

const HRX_PAYROLL_STEP_UP_POLICY_KEYS = new Set(
  listHrxRoutePolicies()
    .filter(({ action }) => clean(action).startsWith("hrx.payroll."))
    .map(({ action, purpose }) => `${clean(action)}\u0000${clean(purpose)}`),
);

const HRX_PAYROLL_STEP_UP_PURPOSES = new Set([
  HRX_STEP_UP_PURPOSES.payrollExportReview,
  HRX_STEP_UP_PURPOSES.payrollPaymentProcessing,
  HRX_STEP_UP_PURPOSES.payrollFilingProcessing,
  HRX_STEP_UP_PURPOSES.payrollStatementSelfService,
  HRX_STEP_UP_PURPOSES.payrollYearEndProcessing,
  HRX_STEP_UP_PURPOSES.payrollYearEndReview,
]);

function requiresStepUp(action) {
  const value = clean(action);
  return HRX_STEP_UP_REQUIRED_ACTION_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function requiredPurposeForAction(action, policyPurpose) {
  const value = clean(action);
  if (value.startsWith("hrx.compensation.")) return HRX_STEP_UP_PURPOSES.compensation;
  if (value.startsWith("hrx.evaluation.")) return HRX_STEP_UP_PURPOSES.evaluation;
  if (value.startsWith("hrx.payroll.")) {
    const purpose = clean(policyPurpose);
    return HRX_PAYROLL_STEP_UP_PURPOSES.has(purpose)
      && HRX_PAYROLL_STEP_UP_POLICY_KEYS.has(`${value}\u0000${purpose}`)
      ? purpose
      : null;
  }
  if (value.startsWith("hrx.audit.")) return HRX_STEP_UP_PURPOSES.audit;
  if (value.startsWith("hrx.ai.final_decision")) return HRX_STEP_UP_PURPOSES.aiFinalDecision;
  if (value.startsWith("hrx.leave.policy.write")) return HRX_STEP_UP_PURPOSES.leavePolicy;
  if (value.startsWith("hrx.leave.accrual.execute")) return HRX_STEP_UP_PURPOSES.leaveAccrual;
  if (value.startsWith("hrx.leave.accrual.rule.")) return HRX_STEP_UP_PURPOSES.leaveAccrual;
  if (value.startsWith("hrx.leave.expiration.execute")) return HRX_STEP_UP_PURPOSES.leaveLedger;
  if (value.startsWith("hrx.leave.ledger.adjust")) return HRX_STEP_UP_PURPOSES.leaveLedger;
  if (value.startsWith("hrx.leave.termination.settle")) return HRX_STEP_UP_PURPOSES.leaveTermination;
  return null;
}

function tokenMatchesContext(token = {}, context = {}) {
  const primarySessionJti = clean(context.session_jti ?? context.primary_session_jti);
  return token.tenant_id === context.tenant_id
    && token.actor_id === context.actor_id
    && (!primarySessionJti || token.primary_session_jti === primarySessionJti);
}

function tokenFresh(token = {}, now = new Date().toISOString()) {
  if (!token.expires_at) return false;
  return Date.parse(token.expires_at) > Date.parse(now);
}

function tokenPurposeMatches(token = {}, requiredPurpose) {
  const purpose = clean(token.purpose);
  return Boolean(purpose && purpose === requiredPurpose);
}

export function evaluateHrxStepUp({ action, policyPurpose, context = {}, token = null, now } = {}) {
  if (!requiresStepUp(action)) {
    return Object.freeze({ effect: "allow", reason: "hrx_step_up_not_required", step_up_required: false });
  }
  const requiredPurpose = requiredPurposeForAction(action, policyPurpose);
  if (clean(action).startsWith("hrx.payroll.") && !requiredPurpose) {
    return Object.freeze({
      effect: "challenge",
      status: 403,
      safe_error_code: "HRX_STEP_UP_REQUIRED",
      reason: "hrx_step_up_policy_purpose_invalid",
      step_up_required: true,
      fail_closed: true,
      required_purpose: null,
    });
  }
  if (!token || token.mfa !== true || Number(token.assurance_level ?? 0) < 2 || !tokenMatchesContext(token, context) || !tokenFresh(token, now)) {
    return Object.freeze({
      effect: "challenge",
      status: 403,
      safe_error_code: "HRX_STEP_UP_REQUIRED",
      reason: "hrx_sensitive_action_requires_fresh_mfa",
      step_up_required: true,
      fail_closed: true,
      required_purpose: requiredPurpose,
    });
  }
  if (!tokenPurposeMatches(token, requiredPurpose)) {
    return Object.freeze({
      effect: "challenge",
      status: 403,
      safe_error_code: "HRX_STEP_UP_REQUIRED",
      reason: "hrx_step_up_purpose_mismatch",
      step_up_required: true,
      fail_closed: true,
      required_purpose: requiredPurpose,
    });
  }
  return Object.freeze({
    effect: "allow",
    reason: "hrx_step_up_satisfied",
    step_up_required: true,
    assurance_level: Number(token.assurance_level),
    expires_at: token.expires_at,
    purpose: token.purpose,
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
