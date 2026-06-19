import {
  APP_PERMISSION_STATUSES,
  CONNECTOR_SDK_STATUSES,
  CUSTOM_AI_APP_STATUSES,
  INSTALL_RECEIPT_STATUSES,
  MARKETPLACE_APP_STATUSES,
  REVIEW_GATE_STATUSES,
} from "./states.js";

const commonRequiredFields = Object.freeze(["id", "tenant_id", "matter_trace_ref", "status", "owner_program_id", "audit_evidence_ref"]);

function model(name, requiredFields, optionalFields, statuses, references) {
  return Object.freeze({
    name,
    owner_program_id: "RP28",
    tenant_scoped: true,
    matter_trace_required_when_touching_client_or_document_data: true,
    required_fields: Object.freeze([...commonRequiredFields, ...requiredFields]),
    optional_fields: Object.freeze(optionalFields),
    statuses,
    references: Object.freeze(references),
  });
}

export const MARKETPLACE_IMPLEMENTED_MODEL_NAMES = Object.freeze(["MarketplaceApp", "ConnectorSDK"]);

export const MARKETPLACE_MODEL_DECLARATIONS = Object.freeze({
  MarketplaceApp: model(
    "MarketplaceApp",
    ["marketplace_app_id", "app_slug", "publisher_ref", "connector_sdk_id", "permission_profile_ref"],
    ["catalog_summary_ref", "retired_reason"],
    MARKETPLACE_APP_STATUSES,
    ["Tenant", "Matter", "User", "ConnectorSDK", "AppPermission", "ReviewGate", "InstallReceipt", "AuditEvent"],
  ),
  ConnectorSDK: model(
    "ConnectorSDK",
    ["connector_sdk_id", "sdk_manifest_ref", "supported_runtime_ref", "review_gate_id"],
    ["deprecation_reason", "compatible_app_refs"],
    CONNECTOR_SDK_STATUSES,
    ["Tenant", "MarketplaceApp", "CustomAIApp", "ReviewGate", "AppPermission", "AuditEvent"],
  ),
  CustomAIApp: model(
    "CustomAIApp",
    ["custom_ai_app_id", "marketplace_app_id", "model_policy_ref", "data_boundary_ref"],
    ["prompt_policy_summary_ref", "blocked_reason"],
    CUSTOM_AI_APP_STATUSES,
    ["Tenant", "Matter", "MarketplaceApp", "ConnectorSDK", "ReviewGate", "AppPermission", "AuditEvent"],
  ),
  ReviewGate: model(
    "ReviewGate",
    ["review_gate_id", "gate_type", "decision", "reviewer_role_ref"],
    ["blocked_claims", "approval_note_ref"],
    REVIEW_GATE_STATUSES,
    ["Tenant", "User", "Role", "MarketplaceApp", "ConnectorSDK", "CustomAIApp", "AppPermission", "AuditEvent"],
  ),
  AppPermission: model(
    "AppPermission",
    ["app_permission_id", "requested_scope", "decision", "review_gate_id"],
    ["denied_reason", "approval_condition_ref"],
    APP_PERMISSION_STATUSES,
    ["Tenant", "Role", "MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "AuditEvent"],
  ),
  InstallReceipt: model(
    "InstallReceipt",
    ["install_receipt_id", "marketplace_app_id", "installed_by_ref", "decision"],
    ["void_reason", "review_gate_id"],
    INSTALL_RECEIPT_STATUSES,
    ["Tenant", "Matter", "User", "MarketplaceApp", "AppPermission", "ReviewGate", "AuditEvent"],
  ),
});

export const MARKETPLACE_RELATIONSHIP_MAP = Object.freeze({
  MarketplaceApp: Object.freeze(["ConnectorSDK", "CustomAIApp", "AppPermission", "ReviewGate", "InstallReceipt", "AuditEvent"]),
  ConnectorSDK: Object.freeze(["MarketplaceApp", "CustomAIApp", "ReviewGate", "AppPermission", "AuditEvent"]),
  CustomAIApp: Object.freeze(["MarketplaceApp", "ConnectorSDK", "ReviewGate", "AppPermission", "AuditEvent"]),
  ReviewGate: Object.freeze(["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "AppPermission", "InstallReceipt", "AuditEvent"]),
  AppPermission: Object.freeze(["MarketplaceApp", "ConnectorSDK", "CustomAIApp", "ReviewGate", "InstallReceipt", "AuditEvent"]),
  InstallReceipt: Object.freeze(["MarketplaceApp", "AppPermission", "ReviewGate", "AuditEvent"]),
});

export function validateMarketplaceModelRegistry(models = MARKETPLACE_MODEL_DECLARATIONS) {
  const errors = [];
  for (const [name, descriptor] of Object.entries(models)) {
    if (descriptor.name !== name) errors.push(`${name} model name drift`);
    if (descriptor.owner_program_id !== "RP28") errors.push(`${name} owner program drift`);
    if (descriptor.tenant_scoped !== true) errors.push(`${name} must be tenant scoped`);
    for (const field of commonRequiredFields) {
      if (!descriptor.required_fields?.includes(field)) errors.push(`${name} missing required field ${field}`);
    }
    if (!descriptor.references?.includes("AuditEvent")) errors.push(`${name} missing AuditEvent reference`);
  }
  for (const name of MARKETPLACE_IMPLEMENTED_MODEL_NAMES) {
    if (!models[name]) errors.push(`implemented model missing ${name}`);
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), models });
}
