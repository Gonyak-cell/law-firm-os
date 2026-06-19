export const RELEASE_CANDIDATE_STATUSES = Object.freeze([
  "draft_descriptor",
  "ci_validation_required",
  "observability_review_required",
  "compliance_review_required",
  "approval_required",
  "blocked",
  "closeout_descriptor",
]);

export const DEPLOYMENT_RUN_STATUSES = Object.freeze([
  "planned_descriptor",
  "evidence_required",
  "review_required",
  "approval_required",
  "blocked",
  "closed_descriptor",
]);

export const OBSERVABILITY_SIGNAL_STATUSES = Object.freeze([
  "expected_descriptor",
  "captured_descriptor",
  "missing_observability",
  "review_required",
  "blocked",
]);

export const COMPLIANCE_REPORT_STATUSES = Object.freeze([
  "draft_descriptor",
  "evidence_required",
  "soc2_review_required",
  "isms_p_review_required",
  "gap_blocked",
  "closed_descriptor",
]);

export const INCIDENT_RUNBOOK_STATUSES = Object.freeze([
  "draft_descriptor",
  "ready_descriptor",
  "review_required",
  "approval_required",
  "blocked",
  "retired_descriptor",
]);

export const CUSTOMER_PLAN_STATUSES = Object.freeze([
  "planned_descriptor",
  "matched_descriptor",
  "mismatch_review_required",
  "approval_required",
  "blocked",
]);

export const COMMERCIAL_DECISIONS = Object.freeze([
  "allowed_descriptor",
  "denied_descriptor",
  "review_required",
  "approval_required",
  "blocked",
]);

export const COMMERCIAL_LIFECYCLE_GATES = Object.freeze([
  "entry",
  "ci_cd_validation",
  "observability_review",
  "compliance_review",
  "approval",
  "blocked",
  "closeout",
]);

export const COMMERCIAL_RISK_CLAIMS = Object.freeze([
  "unverified_release",
  "missing_observability",
  "compliance_evidence_gap",
  "unsafe_deploy",
  "customer_plan_mismatch",
  "cross_tenant_release_access",
]);
