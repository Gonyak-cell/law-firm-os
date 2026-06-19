import {
  API_KEY_STATUSES,
  EXTENSION_PERMISSION_STATUSES,
  RATE_LIMIT_STATUSES,
  WEBHOOK_STATUSES,
  WORKFLOW_DEFINITION_STATUSES,
  WORKFLOW_RUN_STATUSES,
} from "./states.js";

const commonRequiredFields = Object.freeze(["id", "tenant_id", "matter_trace_ref", "status", "owner_program_id", "audit_evidence_ref"]);

function model(name, requiredFields, optionalFields, statuses, references) {
  return Object.freeze({
    name,
    owner_program_id: "RP27",
    tenant_scoped: true,
    matter_trace_required_when_touching_client_or_document_data: true,
    required_fields: Object.freeze([...commonRequiredFields, ...requiredFields]),
    optional_fields: Object.freeze(optionalFields),
    statuses,
    references: Object.freeze(references),
  });
}

export const PLATFORM_EXTENSIBILITY_MODELS = Object.freeze({
  PublicAPIKey: model(
    "PublicAPIKey",
    ["api_key_ref", "issuer_user_id", "extension_permission_id", "rate_limit_id"],
    ["last_used_at", "revoked_reason", "allowed_scopes"],
    API_KEY_STATUSES,
    ["Tenant", "User", "Matter", "ExtensionPermission", "APIRateLimit", "AuditEvent"],
  ),
  WebhookSubscription: model(
    "WebhookSubscription",
    ["webhook_subscription_id", "endpoint_ref", "event_scope", "extension_permission_id", "replay_policy_ref"],
    ["last_delivery_ref", "disabled_reason"],
    WEBHOOK_STATUSES,
    ["Tenant", "Matter", "ExtensionPermission", "WorkflowRun", "AuditEvent"],
  ),
  WorkflowDefinition: model(
    "WorkflowDefinition",
    ["workflow_definition_id", "trigger_type", "step_manifest_ref", "extension_permission_id"],
    ["review_queue_ref", "version_label"],
    WORKFLOW_DEFINITION_STATUSES,
    ["Tenant", "Matter", "DMSDocument", "ExtensionPermission", "WorkflowRun", "AuditEvent"],
  ),
  WorkflowRun: model(
    "WorkflowRun",
    ["workflow_run_id", "workflow_definition_id", "idempotency_key_ref", "decision"],
    ["blocked_claims", "review_queue_ref", "completed_at"],
    WORKFLOW_RUN_STATUSES,
    ["Tenant", "Matter", "WorkflowDefinition", "ExtensionPermission", "AuditEvent"],
  ),
  ExtensionPermission: model(
    "ExtensionPermission",
    ["extension_permission_id", "requested_scope", "decision", "approved_by_ref"],
    ["denied_reason", "review_queue_ref"],
    EXTENSION_PERMISSION_STATUSES,
    ["Tenant", "User", "Role", "Matter", "PublicAPIKey", "WebhookSubscription", "WorkflowDefinition", "AuditEvent"],
  ),
  APIRateLimit: model(
    "APIRateLimit",
    ["rate_limit_id", "window_seconds", "limit_count", "decision"],
    ["burst_limit_count", "blocked_reason"],
    RATE_LIMIT_STATUSES,
    ["Tenant", "PublicAPIKey", "WebhookSubscription", "WorkflowRun", "AuditEvent"],
  ),
});

export const PLATFORM_EXTENSIBILITY_RELATIONSHIP_MAP = Object.freeze({
  PublicAPIKey: Object.freeze(["ExtensionPermission", "APIRateLimit", "AuditEvent"]),
  WebhookSubscription: Object.freeze(["ExtensionPermission", "WorkflowRun", "AuditEvent"]),
  WorkflowDefinition: Object.freeze(["ExtensionPermission", "WorkflowRun", "DMSDocument", "AuditEvent"]),
  WorkflowRun: Object.freeze(["WorkflowDefinition", "ExtensionPermission", "AuditEvent"]),
  ExtensionPermission: Object.freeze(["PublicAPIKey", "WebhookSubscription", "WorkflowDefinition", "WorkflowRun", "AuditEvent"]),
  APIRateLimit: Object.freeze(["PublicAPIKey", "WebhookSubscription", "WorkflowRun", "AuditEvent"]),
});

export function validatePlatformExtensibilityModelRegistry(models = PLATFORM_EXTENSIBILITY_MODELS) {
  const errors = [];
  for (const [name, descriptor] of Object.entries(models)) {
    if (descriptor.name !== name) errors.push(`${name} model name drift`);
    if (descriptor.owner_program_id !== "RP27") errors.push(`${name} owner program drift`);
    if (descriptor.tenant_scoped !== true) errors.push(`${name} must be tenant scoped`);
    for (const field of commonRequiredFields) {
      if (!descriptor.required_fields?.includes(field)) errors.push(`${name} missing required field ${field}`);
    }
    if (!descriptor.references?.includes("AuditEvent")) errors.push(`${name} missing AuditEvent reference`);
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), models });
}
