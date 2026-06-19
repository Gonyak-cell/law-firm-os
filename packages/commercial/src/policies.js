import { COMMERCIAL_DECISIONS, COMMERCIAL_RISK_CLAIMS } from "./states.js";

export const COMMERCIAL_ACTIONS = Object.freeze([
  "create_release_candidate",
  "validate_ci_cd",
  "review_observability",
  "generate_compliance_report",
  "approve_production_release",
  "rollback_release",
  "retry_release_readiness",
]);

export const COMMERCIAL_POLICY_OUTCOMES = Object.freeze({
  ALLOWED: "allowed_descriptor",
  DENIED: "denied_descriptor",
  REVIEW_REQUIRED: "review_required",
  APPROVAL_REQUIRED: "approval_required",
  BLOCKED: "blocked",
});

export function createCommercialPolicyContext(overrides = {}) {
  return Object.freeze({
    tenant_id: "tenant-synthetic-alpha",
    actor_tenant_id: "tenant-synthetic-alpha",
    actor_role: "release_manager",
    matter_trace_ref: "matter-synthetic-release-readiness",
    action: "create_release_candidate",
    release_verified: true,
    observability_present: true,
    compliance_evidence_present: true,
    deploy_safe: true,
    customer_plan_matches: true,
    ...overrides,
  });
}

export function evaluateCommercialReadinessPolicy(context = createCommercialPolicyContext()) {
  const blocked_claims = [];
  const missing = [];
  for (const field of ["tenant_id", "actor_tenant_id", "actor_role", "matter_trace_ref", "action"]) {
    if (!context[field]) missing.push(field);
  }
  if (missing.length > 0) blocked_claims.push("missing_context");
  if (context.tenant_id && context.actor_tenant_id && context.tenant_id !== context.actor_tenant_id) {
    blocked_claims.push("cross_tenant_release_access");
  }
  if (context.release_verified === false) blocked_claims.push("unverified_release");
  if (context.observability_present === false) blocked_claims.push("missing_observability");
  if (context.compliance_evidence_present === false) blocked_claims.push("compliance_evidence_gap");
  if (context.deploy_safe === false) blocked_claims.push("unsafe_deploy");
  if (context.customer_plan_matches === false) blocked_claims.push("customer_plan_mismatch");

  const allowedAction = COMMERCIAL_ACTIONS.includes(context.action);
  if (!allowedAction) blocked_claims.push("unknown_action");
  const decision = blocked_claims.includes("cross_tenant_release_access") || blocked_claims.includes("missing_context")
    ? COMMERCIAL_POLICY_OUTCOMES.DENIED
    : blocked_claims.length > 0
      ? COMMERCIAL_POLICY_OUTCOMES.REVIEW_REQUIRED
      : context.action === "approve_production_release"
        ? COMMERCIAL_POLICY_OUTCOMES.APPROVAL_REQUIRED
        : COMMERCIAL_POLICY_OUTCOMES.ALLOWED;

  return Object.freeze({
    decision,
    decision_allowed: COMMERCIAL_DECISIONS.includes(decision),
    blocked_claims: Object.freeze(blocked_claims),
    known_risk_claims: COMMERCIAL_RISK_CLAIMS,
    writes_product_state: false,
    permission_decision_written: false,
    audit_event_written: false,
    runtime_execution: false,
  });
}
