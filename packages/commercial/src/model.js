import {
  COMPLIANCE_REPORT_STATUSES,
  CUSTOMER_PLAN_STATUSES,
  DEPLOYMENT_RUN_STATUSES,
  INCIDENT_RUNBOOK_STATUSES,
  OBSERVABILITY_SIGNAL_STATUSES,
  RELEASE_CANDIDATE_STATUSES,
} from "./states.js";

const commonRequiredFields = Object.freeze([
  "id",
  "tenant_id",
  "matter_trace_ref",
  "status",
  "owner_program_id",
  "audit_evidence_ref",
]);

function model(name, requiredFields, optionalFields, statuses, references) {
  return Object.freeze({
    name,
    owner_program_id: "RP29",
    tenant_scoped: true,
    matter_trace_required_when_touching_client_or_document_data: true,
    required_fields: Object.freeze([...commonRequiredFields, ...requiredFields]),
    optional_fields: Object.freeze(optionalFields),
    statuses,
    references: Object.freeze(references),
  });
}

export const COMMERCIAL_IMPLEMENTED_MODEL_NAMES = Object.freeze([
  "ReleaseCandidate",
  "DeploymentRun",
  "ObservabilitySignal",
  "ComplianceReport",
  "IncidentRunbook",
]);

export const COMMERCIAL_MODEL_DECLARATIONS = Object.freeze({
  ReleaseCandidate: model(
    "ReleaseCandidate",
    ["release_candidate_id", "release_version", "deployment_run_id", "observability_signal_id", "compliance_report_id"],
    ["rollback_plan_ref", "customer_plan_id"],
    RELEASE_CANDIDATE_STATUSES,
    ["Tenant", "Matter", "User", "DeploymentRun", "ObservabilitySignal", "ComplianceReport", "IncidentRunbook", "CustomerPlan", "AuditEvent"],
  ),
  DeploymentRun: model(
    "DeploymentRun",
    ["deployment_run_id", "release_candidate_id", "environment_ref", "ci_cd_evidence_ref", "approval_state"],
    ["rollback_evidence_ref", "blocked_reason"],
    DEPLOYMENT_RUN_STATUSES,
    ["Tenant", "Matter", "ReleaseCandidate", "ObservabilitySignal", "IncidentRunbook", "AuditEvent"],
  ),
  ObservabilitySignal: model(
    "ObservabilitySignal",
    ["observability_signal_id", "release_candidate_id", "signal_type", "signal_source_ref", "threshold_state"],
    ["dashboard_ref", "missing_signal_reason"],
    OBSERVABILITY_SIGNAL_STATUSES,
    ["Tenant", "Matter", "ReleaseCandidate", "DeploymentRun", "ComplianceReport", "AuditEvent"],
  ),
  ComplianceReport: model(
    "ComplianceReport",
    ["compliance_report_id", "release_candidate_id", "framework", "evidence_packet_ref", "gap_state"],
    ["soc2_report_ref", "isms_p_report_ref", "exception_note_ref"],
    COMPLIANCE_REPORT_STATUSES,
    ["Tenant", "Matter", "ReleaseCandidate", "DeploymentRun", "ObservabilitySignal", "AuditEvent"],
  ),
  IncidentRunbook: model(
    "IncidentRunbook",
    ["incident_runbook_id", "release_candidate_id", "trigger_condition", "owner_role_ref", "escalation_state"],
    ["rollback_plan_ref", "customer_notice_ref"],
    INCIDENT_RUNBOOK_STATUSES,
    ["Tenant", "Matter", "ReleaseCandidate", "DeploymentRun", "ObservabilitySignal", "ComplianceReport", "AuditEvent"],
  ),
  CustomerPlan: model(
    "CustomerPlan",
    ["customer_plan_id", "release_candidate_id", "plan_tier", "entitlement_ref", "service_level_ref"],
    ["renewal_note_ref", "exception_approval_ref"],
    CUSTOMER_PLAN_STATUSES,
    ["Tenant", "Matter", "ReleaseCandidate", "ComplianceReport", "AuditEvent"],
  ),
});

export const COMMERCIAL_RELATIONSHIP_MAP = Object.freeze({
  ReleaseCandidate: Object.freeze(["DeploymentRun", "ObservabilitySignal", "ComplianceReport", "IncidentRunbook", "CustomerPlan", "AuditEvent"]),
  DeploymentRun: Object.freeze(["ReleaseCandidate", "ObservabilitySignal", "IncidentRunbook", "AuditEvent"]),
  ObservabilitySignal: Object.freeze(["ReleaseCandidate", "DeploymentRun", "ComplianceReport", "AuditEvent"]),
  ComplianceReport: Object.freeze(["ReleaseCandidate", "DeploymentRun", "ObservabilitySignal", "AuditEvent"]),
  IncidentRunbook: Object.freeze(["ReleaseCandidate", "DeploymentRun", "ObservabilitySignal", "ComplianceReport", "AuditEvent"]),
  CustomerPlan: Object.freeze(["ReleaseCandidate", "ComplianceReport", "AuditEvent"]),
});

export function validateCommercialModelRegistry(models = COMMERCIAL_MODEL_DECLARATIONS) {
  const errors = [];
  for (const [name, descriptor] of Object.entries(models)) {
    if (descriptor.name !== name) errors.push(`${name} model name drift`);
    if (descriptor.owner_program_id !== "RP29") errors.push(`${name} owner program drift`);
    if (descriptor.tenant_scoped !== true) errors.push(`${name} must be tenant scoped`);
    if (descriptor.matter_trace_required_when_touching_client_or_document_data !== true) errors.push(`${name} must keep Matter trace rule`);
    for (const field of commonRequiredFields) {
      if (!descriptor.required_fields?.includes(field)) errors.push(`${name} missing required field ${field}`);
    }
    if (!descriptor.references?.includes("AuditEvent")) errors.push(`${name} missing AuditEvent reference`);
  }
  for (const name of COMMERCIAL_IMPLEMENTED_MODEL_NAMES) {
    if (!models[name]) errors.push(`implemented model missing ${name}`);
  }
  return Object.freeze({ valid: errors.length === 0, errors: Object.freeze(errors), models });
}
