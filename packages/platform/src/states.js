export const API_KEY_STATUSES = Object.freeze(["draft", "review_required", "approved_descriptor", "blocked", "revoked_descriptor"]);
export const WEBHOOK_STATUSES = Object.freeze(["draft", "review_required", "approved_descriptor", "blocked", "disabled_descriptor"]);
export const WORKFLOW_DEFINITION_STATUSES = Object.freeze(["draft", "review_required", "approved_descriptor", "blocked", "archived_descriptor"]);
export const WORKFLOW_RUN_STATUSES = Object.freeze(["queued_descriptor", "review_required", "blocked", "completed_descriptor", "failed_descriptor"]);
export const EXTENSION_PERMISSION_STATUSES = Object.freeze(["requested", "review_required", "approved_descriptor", "denied_descriptor", "blocked"]);
export const RATE_LIMIT_STATUSES = Object.freeze(["draft", "active_descriptor", "review_required", "blocked"]);

export const EXTENSION_DECISIONS = Object.freeze(["allowed_descriptor", "denied_descriptor", "review_required", "blocked"]);
export const EXTENSION_RISK_CLAIMS = Object.freeze([
  "api_over_permission",
  "webhook_replay",
  "workflow_unsafe_mutation",
  "rate_limit_bypass",
  "extension_leak",
  "cross_tenant_extension_access",
]);
