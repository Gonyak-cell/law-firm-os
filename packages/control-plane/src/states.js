export const CONTROL_PLANE_ENTITY_NAMES = Object.freeze([
  "ProductContract",
  "AIControlRule",
  "HermesGate",
  "ClaudeReviewGate",
  "HumanApproval",
  "BlockedClaim",
]);

export const CONTROL_PLANE_LIFECYCLE_STATES = Object.freeze([
  "draft",
  "implemented",
  "hermes_validated",
  "claude_reviewed",
  "construction_inspected",
  "production_ready",
  "blocked",
]);

export const CONTROL_PLANE_REVIEW_OUTCOMES = Object.freeze([
  "PASS",
  "PASS_WITH_FINDINGS",
  "BLOCKED",
]);

export const PRODUCT_CONTRACT_STATUS_VALUES = Object.freeze([
  "draft",
  "review_ready",
  "hermes_evidenced",
  "claude_reviewed",
  "human_accepted",
  "production_ready",
  "blocked",
]);

export const AI_CONTROL_RULE_STATUS_VALUES = Object.freeze([
  "draft",
  "active",
  "suspended",
  "blocked",
  "retired",
]);

export const AI_ALLOWED_ACTION_VALUES = Object.freeze([
  "read_context",
  "draft_plan",
  "draft_code",
  "recommend_fix",
  "summarize_evidence",
]);

export const AI_FORBIDDEN_ACTION_VALUES = Object.freeze([
  "write_production_data",
  "approve_human_gate",
  "bypass_hermes",
  "bypass_claude_review",
  "claim_completion_without_evidence",
]);

export const CONTROL_PLANE_BOUNDARY_FLAGS = Object.freeze({
  syntheticOnly: true,
  noRealData: true,
  writesProductState: false,
  packageStructureOnly: true,
  requiresHermesEvidence: true,
  requiresClaudeReview: true,
  requiresConstructionInspection: true,
});
