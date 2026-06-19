export const MARKETPLACE_APP_STATUSES = Object.freeze(["draft", "submitted_descriptor", "review_required", "approved_descriptor", "blocked", "retired_descriptor"]);
export const CONNECTOR_SDK_STATUSES = Object.freeze(["draft", "certified_descriptor", "review_required", "blocked", "deprecated_descriptor"]);
export const CUSTOM_AI_APP_STATUSES = Object.freeze(["draft", "policy_review_required", "approved_descriptor", "blocked", "retired_descriptor"]);
export const REVIEW_GATE_STATUSES = Object.freeze(["entry", "review_required", "approval_required", "approved_descriptor", "blocked", "closeout_descriptor"]);
export const APP_PERMISSION_STATUSES = Object.freeze(["requested", "review_required", "approved_descriptor", "denied_descriptor", "blocked"]);
export const INSTALL_RECEIPT_STATUSES = Object.freeze(["pending_descriptor", "emitted_descriptor", "review_required", "blocked", "void_descriptor"]);

export const MARKETPLACE_DECISIONS = Object.freeze(["allowed_descriptor", "denied_descriptor", "review_required", "approval_required", "blocked"]);
export const MARKETPLACE_LIFECYCLE_GATES = Object.freeze(["entry", "review", "approval", "blocked", "closeout"]);
export const MARKETPLACE_RISK_CLAIMS = Object.freeze([
  "unsafe_app_permission",
  "custom_ai_data_leak",
  "unreviewed_connector",
  "malicious_update",
  "tenant_install_confusion",
  "cross_tenant_install_access",
]);
