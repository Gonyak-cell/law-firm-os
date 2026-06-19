#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  MASTER_DATA_CP156_HIDDEN_SOURCE_FIELDS,
  MASTER_DATA_CP156_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP156_PACK_BINDING,
  MASTER_DATA_CP157_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP157_PACK_BINDING,
  MASTER_DATA_CP158_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP158_PACK_BINDING,
  MASTER_DATA_CP159_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP159_PACK_BINDING,
  MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS,
  MASTER_DATA_CP160_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP160_PACK_BINDING,
  MASTER_DATA_CP161_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP161_PACK_BINDING,
  MASTER_DATA_CP162_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP162_PACK_BINDING,
  MASTER_DATA_CP163_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP163_PACK_BINDING,
  MASTER_DATA_CP164_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP164_PACK_BINDING,
  MASTER_DATA_CP165_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP165_PACK_BINDING,
  MASTER_DATA_CP166_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP166_PACK_BINDING,
  MASTER_DATA_CP167_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP167_PACK_BINDING,
  MASTER_DATA_CP168_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP168_PACK_BINDING,
  MASTER_DATA_CP169_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP169_PACK_BINDING,
  MASTER_DATA_CP170_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP170_PACK_BINDING,
  MASTER_DATA_CP171_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP171_PACK_BINDING,
  MASTER_DATA_CP172_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP172_PACK_BINDING,
  MASTER_DATA_CP173_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP173_PACK_BINDING,
  MASTER_DATA_CP174_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP174_PACK_BINDING,
  MASTER_DATA_CP175_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP175_PACK_BINDING,
  MASTER_DATA_CP176_NO_WRITE_ATTESTATION,
  MASTER_DATA_CP176_PACK_BINDING,
  MASTER_DATA_API_REFERENCE_SURFACE,
  MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE,
  MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE,
  MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION,
  MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY,
  MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY,
  MASTER_DATA_MODEL_DEFINITIONS,
  MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS,
  MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING,
  MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS,
  MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY,
  MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY,
  MASTER_DATA_PERMISSION_MATRIX_WORKFLOW,
  MASTER_DATA_PERMISSION_AUDIT_BINDING,
  MASTER_DATA_PROGRAM_CONTRACT,
  MASTER_DATA_SERVICE_BOUNDARY,
  MASTER_DATA_SERVICE_TAIL_BOUNDARY,
  MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY,
  MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG,
  MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS,
  MASTER_DATA_UI_INTERACTION_WORKFLOW,
  MASTER_DATA_UI_SURFACE_STATES,
  createMasterDataCp156ClaudeReviewPacket,
  createMasterDataCp156CloseoutHandoff,
  createMasterDataCp156HermesEvidencePacket,
  createMasterDataCp157ClaudeReviewPacket,
  createMasterDataCp157CloseoutHandoff,
  createMasterDataCp157HermesEvidencePacket,
  createMasterDataCp158ClaudeReviewPacket,
  createMasterDataCp158CloseoutHandoff,
  createMasterDataCp158HermesEvidencePacket,
  createMasterDataCp159ClaudeReviewPacket,
  createMasterDataCp159CloseoutHandoff,
  createMasterDataCp159HermesEvidencePacket,
  createMasterDataCp160ClaudeReviewPacket,
  createMasterDataCp160CloseoutHandoff,
  createMasterDataCp160HermesEvidencePacket,
  createMasterDataCp161ClaudeReviewPacket,
  createMasterDataCp161CloseoutHandoff,
  createMasterDataCp161HermesEvidencePacket,
  createMasterDataCp162ClaudeReviewPacket,
  createMasterDataCp162CloseoutHandoff,
  createMasterDataCp162HermesEvidencePacket,
  createMasterDataCp163ClaudeReviewPacket,
  createMasterDataCp163CloseoutHandoff,
  createMasterDataCp163HermesEvidencePacket,
  createMasterDataCp164ClaudeReviewPacket,
  createMasterDataCp164CloseoutHandoff,
  createMasterDataCp164HermesEvidencePacket,
  createMasterDataCp165ClaudeReviewPacket,
  createMasterDataCp165CloseoutHandoff,
  createMasterDataCp165HermesEvidencePacket,
  createMasterDataCp166ClaudeReviewPacket,
  createMasterDataCp166CloseoutHandoff,
  createMasterDataCp166HermesEvidencePacket,
  createMasterDataCp167ClaudeReviewPacket,
  createMasterDataCp167CloseoutHandoff,
  createMasterDataCp167HermesEvidencePacket,
  createMasterDataCp168ClaudeReviewPacket,
  createMasterDataCp168CloseoutHandoff,
  createMasterDataCp168HermesEvidencePacket,
  createMasterDataCp169ClaudeReviewPacket,
  createMasterDataCp169CloseoutHandoff,
  createMasterDataCp169HermesEvidencePacket,
  createMasterDataCp170ClaudeReviewPacket,
  createMasterDataCp170CloseoutHandoff,
  createMasterDataCp170HermesEvidencePacket,
  createMasterDataCp171ClaudeReviewPacket,
  createMasterDataCp171CloseoutHandoff,
  createMasterDataCp171HermesEvidencePacket,
  createMasterDataCp172ClaudeReviewPacket,
  createMasterDataCp172CloseoutHandoff,
  createMasterDataCp172HermesEvidencePacket,
  createMasterDataCp173ClaudeReviewPacket,
  createMasterDataCp173CloseoutHandoff,
  createMasterDataCp173HermesEvidencePacket,
  createMasterDataCp174ClaudeReviewPacket,
  createMasterDataCp174CloseoutHandoff,
  createMasterDataCp174HermesEvidencePacket,
  createMasterDataCp175ClaudeReviewPacket,
  createMasterDataCp175CloseoutHandoff,
  createMasterDataCp175HermesEvidencePacket,
  createMasterDataCp176ClaudeReviewPacket,
  createMasterDataCp176CloseoutHandoff,
  createMasterDataCp176HermesEvidencePacket,
  createMasterDataApiReferenceCatalog,
  createMasterDataApiReferenceFixture,
  createMasterDataPermissionAuditBindingCatalog,
  createMasterDataPermissionAuditBindingDescriptor,
  createMasterDataPermissionAuditDecisionBindingCatalog,
  createMasterDataPermissionAuditDecisionBindingDescriptor,
  createMasterDataPermissionAuditControlInteractionsCatalog,
  createMasterDataPermissionAuditControlInteractionDescriptor,
  createMasterDataPermissionAuditFixtureDecisionTestsCatalog,
  createMasterDataPermissionAuditFixtureDecisionTestDescriptor,
  createMasterDataPermissionAuditWorkflowFailureTaxonomyCatalog,
  createMasterDataPermissionAuditWorkflowFailureTaxonomyDescriptor,
  createMasterDataFailureTaxonomyEdgeCaseEscalationCatalog,
  createMasterDataFailureTaxonomyEdgeCaseEscalationDescriptor,
  createMasterDataFailureTaxonomySensitiveEntryBoundaryCatalog,
  createMasterDataFailureTaxonomySensitiveEntryBoundaryDescriptor,
  createMasterDataFailureTaxonomyOperationalEdgeBoundaryCatalog,
  createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor,
  createMasterDataFailureEvidenceReviewHandoffBridgeCatalog,
  createMasterDataFailureEvidenceReviewHandoffBridgeDescriptor,
  createMasterDataPermissionAuditSensitiveTailBoundaryCatalog,
  createMasterDataPermissionAuditSensitiveTailBoundaryDescriptor,
  createMasterDataEvidenceReviewUiReadinessBridgeCatalog,
  createMasterDataEvidenceReviewUiReadinessBridgeDescriptor,
  createMasterDataTerminalReviewCloseoutReadinessCatalog,
  createMasterDataTerminalReviewCloseoutReadinessDescriptor,
  createMasterDataSyntheticFixtureEntryCatalog,
  createMasterDataSyntheticFixtureEntryDescriptor,
  createMasterDataSyntheticFixtureSetCase,
  createMasterDataSyntheticFixtureSetCatalog,
  createMasterDataPermissionMatrixDecisionDescriptor,
  createMasterDataPermissionMatrixWorkflowCatalog,
  createMasterDataUiSurfaceStateCatalog,
  createMasterDataUiInteractionFixture,
  createMasterDataUiInteractionWorkflowCatalog,
  createMasterDataServiceIntegrationSmokeCase,
  createMasterDataServiceReviewPathCase,
  createMasterDataServiceTailDescriptor,
  createMasterDataSyntheticFixture,
  executeMasterDataDuplicateReviewWorkflow,
  executeMasterDataEntityCreationWorkflow,
  executeMasterDataRelationshipMappingWorkflow,
  validateMasterDataCp157Coverage,
  validateMasterDataCp157ServiceBoundary,
  validateMasterDataCp158Coverage,
  validateMasterDataCp158TailBoundary,
  validateMasterDataCp159Coverage,
  validateMasterDataCp159ServiceEvidence,
  validateMasterDataCp160ApiUiReference,
  validateMasterDataCp160Coverage,
  validateMasterDataCp161Coverage,
  validateMasterDataCp161UiInteractionWorkflow,
  validateMasterDataCp162Coverage,
  validateMasterDataCp162PermissionAuditBinding,
  validateMasterDataCp163Coverage,
  validateMasterDataCp163SyntheticFixtureEntry,
  validateMasterDataCp164Coverage,
  validateMasterDataCp164SyntheticFixtureSet,
  validateMasterDataCp165Coverage,
  validateMasterDataCp165PermissionMatrixWorkflow,
  validateMasterDataCp166Coverage,
  validateMasterDataCp166PermissionAuditDecisionBinding,
  validateMasterDataCp167Coverage,
  validateMasterDataCp167PermissionAuditControlInteractions,
  validateMasterDataCp168Coverage,
  validateMasterDataCp168PermissionAuditFixtureDecisionTests,
  validateMasterDataCp169Coverage,
  validateMasterDataCp169PermissionAuditWorkflowFailureTaxonomy,
  validateMasterDataCp170Coverage,
  validateMasterDataCp170FailureTaxonomyEdgeCaseEscalation,
  validateMasterDataCp171Coverage,
  validateMasterDataCp171FailureTaxonomySensitiveEntryBoundary,
  validateMasterDataCp172Coverage,
  validateMasterDataCp172FailureTaxonomyOperationalEdgeBoundary,
  validateMasterDataCp173Coverage,
  validateMasterDataCp173FailureEvidenceReviewHandoffBridge,
  validateMasterDataCp174Coverage,
  validateMasterDataCp174PermissionAuditSensitiveTailBoundary,
  validateMasterDataCp175Coverage,
  validateMasterDataCp175EvidenceReviewUiReadinessBridge,
  validateMasterDataCp176Coverage,
  validateMasterDataCp176TerminalReviewCloseoutReadiness,
  validateMasterDataCp156Coverage,
  validateMasterDataRecord,
  validateMasterDataRegistry,
} from "../packages/master-data/src/index.js";

const packageExports = await import("../packages/master-data/src/index.js");

const errors = [];

function requireEqual(actual, expected, label) {
  if (actual !== expected) errors.push(`${label} must be ${expected}, got ${actual}`);
}

function requireIncludes(values, expected, label) {
  if (!values?.includes?.(expected)) errors.push(`${label} must include ${expected}`);
}

function requireTrue(value, label) {
  if (value !== true) errors.push(`${label} must be true`);
}

async function readJsonIfExists(filePath) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

const contract = JSON.parse(await readFile("contracts/master-data-contract.json", "utf8"));
const plan = JSON.parse(await readFile("docs/closeout-pack-plan/closeout-pack-plan.json", "utf8"));
const cp156Manifest = JSON.parse(await readFile("docs/closeout-packs/cp00-156/manifest.json", "utf8"));
const cp157Manifest = await readJsonIfExists("docs/closeout-packs/cp00-157/manifest.json");
const cp158Manifest = await readJsonIfExists("docs/closeout-packs/cp00-158/manifest.json");
const cp159Manifest = await readJsonIfExists("docs/closeout-packs/cp00-159/manifest.json");
const cp160Manifest = await readJsonIfExists("docs/closeout-packs/cp00-160/manifest.json");
const cp161Manifest = await readJsonIfExists("docs/closeout-packs/cp00-161/manifest.json");
const cp162Manifest = await readJsonIfExists("docs/closeout-packs/cp00-162/manifest.json");
const cp163Manifest = await readJsonIfExists("docs/closeout-packs/cp00-163/manifest.json");
const cp164Manifest = await readJsonIfExists("docs/closeout-packs/cp00-164/manifest.json");
const cp165Manifest = await readJsonIfExists("docs/closeout-packs/cp00-165/manifest.json");
const cp166Manifest = await readJsonIfExists("docs/closeout-packs/cp00-166/manifest.json");
const cp167Manifest = await readJsonIfExists("docs/closeout-packs/cp00-167/manifest.json");
const cp168Manifest = await readJsonIfExists("docs/closeout-packs/cp00-168/manifest.json");
const cp169Manifest = await readJsonIfExists("docs/closeout-packs/cp00-169/manifest.json");
const cp170Manifest = await readJsonIfExists("docs/closeout-packs/cp00-170/manifest.json");
const cp171Manifest = await readJsonIfExists("docs/closeout-packs/cp00-171/manifest.json");
const cp172Manifest = await readJsonIfExists("docs/closeout-packs/cp00-172/manifest.json");
const cp173Manifest = await readJsonIfExists("docs/closeout-packs/cp00-173/manifest.json");
const cp174Manifest = await readJsonIfExists("docs/closeout-packs/cp00-174/manifest.json");
const cp175Manifest = await readJsonIfExists("docs/closeout-packs/cp00-175/manifest.json");
const cp176Manifest = await readJsonIfExists("docs/closeout-packs/cp00-176/manifest.json");
const cp156PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP156_PACK_BINDING.pack_id) ??
  cp156Manifest.plan_binding_snapshot;
const cp157PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP157_PACK_BINDING.pack_id) ??
  cp157Manifest?.plan_binding_snapshot;
const cp158PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP158_PACK_BINDING.pack_id) ??
  cp158Manifest?.plan_binding_snapshot;
const cp159PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP159_PACK_BINDING.pack_id) ??
  cp159Manifest?.plan_binding_snapshot;
const cp160PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP160_PACK_BINDING.pack_id) ??
  cp160Manifest?.plan_binding_snapshot;
const cp161PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP161_PACK_BINDING.pack_id) ??
  cp161Manifest?.plan_binding_snapshot;
const cp162PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP162_PACK_BINDING.pack_id) ??
  cp162Manifest?.plan_binding_snapshot;
const cp163PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP163_PACK_BINDING.pack_id) ??
  cp163Manifest?.plan_binding_snapshot;
const cp164PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP164_PACK_BINDING.pack_id) ??
  cp164Manifest?.plan_binding_snapshot;
const cp165PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP165_PACK_BINDING.pack_id) ??
  cp165Manifest?.plan_binding_snapshot;
const cp166PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP166_PACK_BINDING.pack_id) ??
  cp166Manifest?.plan_binding_snapshot;
const cp167PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP167_PACK_BINDING.pack_id) ??
  cp167Manifest?.plan_binding_snapshot;
const cp168PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP168_PACK_BINDING.pack_id) ??
  cp168Manifest?.plan_binding_snapshot;
const cp169PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP169_PACK_BINDING.pack_id) ??
  cp169Manifest?.plan_binding_snapshot;
const cp170PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP170_PACK_BINDING.pack_id) ??
  cp170Manifest?.plan_binding_snapshot;
const cp171PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP171_PACK_BINDING.pack_id) ??
  cp171Manifest?.plan_binding_snapshot;
const cp172PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP172_PACK_BINDING.pack_id) ??
  cp172Manifest?.plan_binding_snapshot;
const cp173PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP173_PACK_BINDING.pack_id) ??
  cp173Manifest?.plan_binding_snapshot;
const cp174PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP174_PACK_BINDING.pack_id) ??
  cp174Manifest?.plan_binding_snapshot;
const cp175PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP175_PACK_BINDING.pack_id) ??
  cp175Manifest?.plan_binding_snapshot;
const cp176PlanPack =
  plan.packs.find((pack) => pack.pack_id === MASTER_DATA_CP176_PACK_BINDING.pack_id) ??
  cp176Manifest?.plan_binding_snapshot;

requireEqual(contract.schema_version, "law-firm-os.master-data-contract.v0.21", "schema_version");
requireEqual(contract.program_id, "RP04", "program_id");
requireEqual(contract.foundation_pack?.pack_id, MASTER_DATA_CP156_PACK_BINDING.pack_id, "foundation_pack.pack_id");
requireEqual(contract.current_pack?.pack_id, MASTER_DATA_CP176_PACK_BINDING.pack_id, "current_pack.pack_id");
requireEqual(contract.current_pack?.risk_class, MASTER_DATA_CP176_PACK_BINDING.risk_class, "current_pack.risk_class");
requireEqual(contract.current_pack?.unit_count, MASTER_DATA_CP176_PACK_BINDING.unit_count, "current_pack.unit_count");
requireEqual(contract.current_pack?.range, MASTER_DATA_CP176_PACK_BINDING.range, "current_pack.range");
requireEqual(contract.current_pack?.production_ready_flag, MASTER_DATA_CP176_PACK_BINDING.production_ready_flag, "current_pack.production_ready_flag");
requireEqual(contract.upstream_pack?.pack_id, MASTER_DATA_CP176_PACK_BINDING.upstream_pack_id, "upstream_pack.pack_id");
requireEqual(contract.next_pack?.pack_id, MASTER_DATA_CP176_PACK_BINDING.next_pack_id, "next_pack.pack_id");
requireEqual(contract.next_pack?.next_subphase_id, MASTER_DATA_CP176_PACK_BINDING.next_subphase_id, "next_pack.next_subphase_id");
requireEqual(contract.gates?.hermes, MASTER_DATA_CP176_PACK_BINDING.hermes_gate, "gates.hermes");
requireEqual(contract.gates?.claude, MASTER_DATA_CP176_PACK_BINDING.claude_gate, "gates.claude");
requireEqual(contract.gates?.claude_model, "claude-opus-4-8", "gates.claude_model");
requireEqual(contract.gates?.claude_effort, "max", "gates.claude_effort");
requireEqual(contract.gates?.claude_mode, "read_only", "gates.claude_mode");

for (const modelType of MASTER_DATA_PROGRAM_CONTRACT.scope) requireIncludes(contract.scope, modelType, "scope");
for (const risk of MASTER_DATA_PROGRAM_CONTRACT.acceptance_risks) {
  requireIncludes(contract.acceptance_risks, risk, "acceptance_risks");
}

const registry = validateMasterDataRegistry();
requireTrue(registry.valid, "registry.valid");
requireEqual(contract.model_registry?.model_count, registry.model_count, "model_registry.model_count");
requireEqual(contract.model_registry?.owner_module, "MasterData", "model_registry.owner_module");
requireEqual(contract.model_registry?.tenant_field, "tenant_id", "model_registry.tenant_field");
requireEqual(
  contract.model_registry?.matter_trace_policy,
  "required_when_workflow_touches_matter_or_document",
  "model_registry.matter_trace_policy",
);
for (const [modelType, definition] of Object.entries(MASTER_DATA_MODEL_DEFINITIONS)) {
  requireEqual(definition.owner_module, "MasterData", `${modelType}.owner_module`);
  requireEqual(definition.tenant_field, "tenant_id", `${modelType}.tenant_field`);
  requireIncludes(definition.lifecycle_statuses, "review_required", `${modelType}.lifecycle_statuses`);
}

for (const [key, value] of Object.entries(MASTER_DATA_CP176_NO_WRITE_ATTESTATION)) {
  if (!Object.hasOwn(contract.no_write_attestation ?? {}, key)) errors.push(`no_write_attestation.${key} is required`);
  requireEqual(contract.no_write_attestation?.[key], value, `no_write_attestation.${key}`);
}
for (const field of MASTER_DATA_CP156_HIDDEN_SOURCE_FIELDS) requireIncludes(contract.hidden_source_fields, field, "hidden_source_fields");
requireEqual(contract.service_logic?.service_entrypoint, MASTER_DATA_SERVICE_BOUNDARY.service_entrypoint, "service_logic.service_entrypoint");
for (const operation of MASTER_DATA_SERVICE_BOUNDARY.supported_operations) {
  requireIncludes(contract.service_logic?.supported_operations, operation, "service_logic.supported_operations");
}
for (const precheck of MASTER_DATA_SERVICE_BOUNDARY.prechecks) {
  requireIncludes(contract.service_logic?.prechecks, precheck, "service_logic.prechecks");
}
requireEqual(
  contract.service_logic?.precheck_reporting?.checked,
  "prechecks actually executed for the normalized descriptor",
  "service_logic.precheck_reporting.checked",
);
requireEqual(
  contract.service_logic?.precheck_reporting?.declared_prechecks,
  "full CP00-157 service-boundary capability list",
  "service_logic.precheck_reporting.declared_prechecks",
);
for (const outcome of MASTER_DATA_SERVICE_BOUNDARY.outcomes) {
  requireIncludes(contract.service_logic?.outcomes, outcome, "service_logic.outcomes");
}
requireEqual(
  contract.service_logic?.state_transition_scope,
  "CP00-157 validates lifecycle status values only; from-to transition matrix enforcement is deferred to CP00-158+ runtime-tail packs",
  "service_logic.state_transition_scope",
);
requireEqual(contract.service_tail?.tail_entrypoint, MASTER_DATA_SERVICE_TAIL_BOUNDARY.tail_entrypoint, "service_tail.tail_entrypoint");
requireEqual(contract.service_tail?.lock_acquisition_rule, MASTER_DATA_SERVICE_TAIL_BOUNDARY.lock_acquisition_rule, "service_tail.lock_acquisition_rule");
requireEqual(contract.service_tail?.lock_status, MASTER_DATA_SERVICE_TAIL_BOUNDARY.lock_status, "service_tail.lock_status");
requireEqual(contract.service_tail?.persistence_boundary, MASTER_DATA_SERVICE_TAIL_BOUNDARY.persistence_boundary, "service_tail.persistence_boundary");
for (const [claim, safeCode] of Object.entries(MASTER_DATA_SERVICE_TAIL_BOUNDARY.validation_error_mapping)) {
  requireEqual(contract.service_tail?.validation_error_mapping?.[claim], safeCode, `service_tail.validation_error_mapping.${claim}`);
}
for (const [claim, route] of Object.entries(MASTER_DATA_SERVICE_TAIL_BOUNDARY.review_required_routing)) {
  requireEqual(contract.service_tail?.review_required_routing?.[claim], route, `service_tail.review_required_routing.${claim}`);
}
for (const [claim, route] of Object.entries(MASTER_DATA_SERVICE_TAIL_BOUNDARY.approval_required_routing)) {
  requireEqual(contract.service_tail?.approval_required_routing?.[claim], route, `service_tail.approval_required_routing.${claim}`);
}
requireEqual(contract.service_tail?.blocked_claim_output, MASTER_DATA_SERVICE_TAIL_BOUNDARY.blocked_claim_output, "service_tail.blocked_claim_output");
requireEqual(contract.service_evidence?.review_path_case_id, MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.review_path_case_id, "service_evidence.review_path_case_id");
requireEqual(
  contract.service_evidence?.integration_smoke_case_id,
  MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.integration_smoke_case_id,
  "service_evidence.integration_smoke_case_id",
);
requireEqual(contract.service_evidence?.hermes_packet_id, MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.hermes_packet_id, "service_evidence.hermes_packet_id");
requireEqual(contract.service_evidence?.claude_packet_id, MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.claude_packet_id, "service_evidence.claude_packet_id");
requireEqual(contract.service_evidence?.review_packet_mode, MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.review_packet_mode, "service_evidence.review_packet_mode");
requireEqual(contract.service_evidence?.no_write_boundary, MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.no_write_boundary, "service_evidence.no_write_boundary");
for (const outcome of MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_tail_outcomes) {
  requireIncludes(contract.service_evidence?.required_tail_outcomes, outcome, "service_evidence.required_tail_outcomes");
}
for (const field of MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_service_evidence_fields) {
  requireIncludes(contract.service_evidence?.required_service_evidence_fields, field, "service_evidence.required_service_evidence_fields");
}
requireEqual(contract.api_reference?.api_surface_id, MASTER_DATA_API_REFERENCE_SURFACE.api_surface_id, "api_reference.api_surface_id");
for (const [endpointId, endpoint] of Object.entries(MASTER_DATA_API_REFERENCE_SURFACE.endpoints)) {
  requireEqual(contract.api_reference?.endpoints?.[endpointId]?.method, endpoint.method, `api_reference.endpoints.${endpointId}.method`);
  requireEqual(contract.api_reference?.endpoints?.[endpointId]?.path, endpoint.path, `api_reference.endpoints.${endpointId}.path`);
  requireEqual(
    contract.api_reference?.endpoints?.[endpointId]?.request_contract,
    endpoint.request_contract,
    `api_reference.endpoints.${endpointId}.request_contract`,
  );
  requireEqual(
    contract.api_reference?.endpoints?.[endpointId]?.response_contract,
    endpoint.response_contract,
    `api_reference.endpoints.${endpointId}.response_contract`,
  );
}
for (const field of MASTER_DATA_API_REFERENCE_SURFACE.request_fields) requireIncludes(contract.api_reference?.request_fields, field, "api_reference.request_fields");
for (const field of MASTER_DATA_API_REFERENCE_SURFACE.response_fields) requireIncludes(contract.api_reference?.response_fields, field, "api_reference.response_fields");
for (const [code, safeCode] of Object.entries(MASTER_DATA_API_REFERENCE_SURFACE.error_code_taxonomy)) {
  requireEqual(contract.api_reference?.error_code_taxonomy?.[code], safeCode, `api_reference.error_code_taxonomy.${code}`);
}
for (const fixtureId of MASTER_DATA_API_REFERENCE_SURFACE.api_fixture_ids) {
  requireIncludes(contract.api_reference?.api_fixture_ids, fixtureId, "api_reference.api_fixture_ids");
}
requireEqual(contract.api_reference?.serialization_guard, MASTER_DATA_API_REFERENCE_SURFACE.serialization_guard, "api_reference.serialization_guard");
requireEqual(
  contract.api_reference?.unauthorized_data_omission,
  MASTER_DATA_API_REFERENCE_SURFACE.unauthorized_data_omission,
  "api_reference.unauthorized_data_omission",
);
requireEqual(contract.ui_surface?.surface_id, MASTER_DATA_UI_SURFACE_STATES.surface_id, "ui_surface.surface_id");
for (const surface of MASTER_DATA_UI_SURFACE_STATES.surfaces) requireIncludes(contract.ui_surface?.surfaces, surface, "ui_surface.surfaces");
for (const [state, label] of Object.entries(MASTER_DATA_UI_SURFACE_STATES.states)) {
  requireEqual(contract.ui_surface?.states?.[state], label, `ui_surface.states.${state}`);
}
for (const dependency of MASTER_DATA_UI_SURFACE_STATES.data_dependencies) {
  requireIncludes(contract.ui_surface?.data_dependencies, dependency, "ui_surface.data_dependencies");
}
requireEqual(contract.ui_interaction_workflow?.workflow_id, MASTER_DATA_UI_INTERACTION_WORKFLOW.workflow_id, "ui_interaction_workflow.workflow_id");
requireEqual(
  JSON.stringify(contract.ui_interaction_workflow?.covered_slices ?? []),
  JSON.stringify(MASTER_DATA_UI_INTERACTION_WORKFLOW.covered_slices),
  "ui_interaction_workflow.covered_slices equality",
);
for (const slice of MASTER_DATA_UI_INTERACTION_WORKFLOW.covered_slices) {
  requireIncludes(contract.ui_interaction_workflow?.covered_slices, slice, "ui_interaction_workflow.covered_slices");
}
for (const [state, label] of Object.entries(MASTER_DATA_UI_INTERACTION_WORKFLOW.interaction_states)) {
  requireEqual(contract.ui_interaction_workflow?.interaction_states?.[state], label, `ui_interaction_workflow.interaction_states.${state}`);
}
for (const dependency of MASTER_DATA_UI_INTERACTION_WORKFLOW.data_dependencies) {
  requireIncludes(contract.ui_interaction_workflow?.data_dependencies, dependency, "ui_interaction_workflow.data_dependencies");
}
requireEqual(
  JSON.stringify(contract.ui_interaction_workflow?.data_dependencies ?? []),
  JSON.stringify(MASTER_DATA_UI_INTERACTION_WORKFLOW.data_dependencies),
  "ui_interaction_workflow.data_dependencies equality",
);
for (const fixtureId of MASTER_DATA_UI_INTERACTION_WORKFLOW.fixture_ids) {
  requireIncludes(contract.ui_interaction_workflow?.fixture_ids, fixtureId, "ui_interaction_workflow.fixture_ids");
}
requireEqual(
  JSON.stringify(contract.ui_interaction_workflow?.fixture_ids ?? []),
  JSON.stringify(MASTER_DATA_UI_INTERACTION_WORKFLOW.fixture_ids),
  "ui_interaction_workflow.fixture_ids equality",
);
for (const [descriptor, value] of Object.entries(MASTER_DATA_UI_INTERACTION_WORKFLOW.evidence_descriptors)) {
  requireEqual(contract.ui_interaction_workflow?.evidence_descriptors?.[descriptor], value, `ui_interaction_workflow.evidence_descriptors.${descriptor}`);
}
requireEqual(
  contract.ui_interaction_workflow?.security_display_rules?.permission_badge_source,
  MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.permission_badge_source,
  "ui_interaction_workflow.security_display_rules.permission_badge_source",
);
requireEqual(
  contract.ui_interaction_workflow?.security_display_rules?.audit_hint_source,
  MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.audit_hint_source,
  "ui_interaction_workflow.security_display_rules.audit_hint_source",
);
requireEqual(
  contract.ui_interaction_workflow?.security_display_rules?.denied_copy_source,
  MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.denied_copy_source,
  "ui_interaction_workflow.security_display_rules.denied_copy_source",
);
requireEqual(
  JSON.stringify(contract.ui_interaction_workflow?.security_display_rules?.prohibited_outputs ?? []),
  JSON.stringify(MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.prohibited_outputs),
  "ui_interaction_workflow.security_display_rules.prohibited_outputs",
);
requireEqual(contract.permission_audit_binding?.pack_id, MASTER_DATA_PERMISSION_AUDIT_BINDING.pack_id, "permission_audit_binding.pack_id");
requireEqual(contract.permission_audit_binding?.binding_id, MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id, "permission_audit_binding.binding_id");
requireEqual(
  contract.permission_audit_binding?.source_workflow_id,
  MASTER_DATA_PERMISSION_AUDIT_BINDING.source_workflow_id,
  "permission_audit_binding.source_workflow_id",
);
requireEqual(
  contract.permission_audit_binding?.renderable_surface,
  MASTER_DATA_PERMISSION_AUDIT_BINDING.renderable_surface,
  "permission_audit_binding.renderable_surface",
);
requireEqual(
  JSON.stringify(contract.permission_audit_binding?.covered_unit_titles ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_BINDING.covered_unit_titles),
  "permission_audit_binding.covered_unit_titles",
);
requireEqual(
  JSON.stringify(contract.permission_audit_binding?.required_descriptor_refs ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_BINDING.required_descriptor_refs),
  "permission_audit_binding.required_descriptor_refs",
);
for (const [state, label] of Object.entries(MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_states)) {
  requireEqual(contract.permission_audit_binding?.binding_states?.[state], label, `permission_audit_binding.binding_states.${state}`);
}
for (const [key, value] of Object.entries(MASTER_DATA_PERMISSION_AUDIT_BINDING.permission_badge_contract)) {
  requireEqual(contract.permission_audit_binding?.permission_badge_contract?.[key], value, `permission_audit_binding.permission_badge_contract.${key}`);
}
for (const [key, value] of Object.entries(MASTER_DATA_PERMISSION_AUDIT_BINDING.audit_hint_contract)) {
  requireEqual(contract.permission_audit_binding?.audit_hint_contract?.[key], value, `permission_audit_binding.audit_hint_contract.${key}`);
}
for (const [key, value] of Object.entries(MASTER_DATA_PERMISSION_AUDIT_BINDING.interaction_contract)) {
  requireEqual(contract.permission_audit_binding?.interaction_contract?.[key], value, `permission_audit_binding.interaction_contract.${key}`);
}
for (const [key, value] of Object.entries(MASTER_DATA_PERMISSION_AUDIT_BINDING.layout_contract)) {
  requireEqual(contract.permission_audit_binding?.layout_contract?.[key], value, `permission_audit_binding.layout_contract.${key}`);
}
requireEqual(
  contract.permission_audit_binding?.safe_error_contract?.source,
  MASTER_DATA_PERMISSION_AUDIT_BINDING.safe_error_contract.source,
  "permission_audit_binding.safe_error_contract.source",
);
requireEqual(
  JSON.stringify(contract.permission_audit_binding?.safe_error_contract?.allowed_safe_error_codes ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_BINDING.safe_error_contract.allowed_safe_error_codes),
  "permission_audit_binding.safe_error_contract.allowed_safe_error_codes",
);
requireEqual(
  JSON.stringify(contract.permission_audit_binding?.safe_error_contract?.prohibited_outputs ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_BINDING.safe_error_contract.prohibited_outputs),
  "permission_audit_binding.safe_error_contract.prohibited_outputs",
);
for (const fixtureId of MASTER_DATA_PERMISSION_AUDIT_BINDING.fixture_ids) {
  requireIncludes(contract.permission_audit_binding?.fixture_ids, fixtureId, "permission_audit_binding.fixture_ids");
}
requireEqual(
  JSON.stringify(contract.permission_audit_binding?.fixture_ids ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_BINDING.fixture_ids),
  "permission_audit_binding.fixture_ids equality",
);
for (const [descriptor, value] of Object.entries(MASTER_DATA_PERMISSION_AUDIT_BINDING.evidence_descriptors)) {
  requireEqual(contract.permission_audit_binding?.evidence_descriptors?.[descriptor], value, `permission_audit_binding.evidence_descriptors.${descriptor}`);
}
requireEqual(contract.synthetic_fixture_entry?.pack_id, MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.pack_id, "synthetic_fixture_entry.pack_id");
requireEqual(
  contract.synthetic_fixture_entry?.fixture_entry_id,
  MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_entry_id,
  "synthetic_fixture_entry.fixture_entry_id",
);
requireEqual(
  contract.synthetic_fixture_entry?.source_binding_id,
  MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.source_binding_id,
  "synthetic_fixture_entry.source_binding_id",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_entry?.covered_unit_titles ?? []),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.covered_unit_titles),
  "synthetic_fixture_entry.covered_unit_titles",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_entry?.fixture_ids ?? []),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_ids),
  "synthetic_fixture_entry.fixture_ids",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_entry?.ui_surface_inventory ?? []),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.ui_surface_inventory),
  "synthetic_fixture_entry.ui_surface_inventory",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_entry?.data_dependencies ?? []),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.data_dependencies),
  "synthetic_fixture_entry.data_dependencies",
);
for (const [state, label] of Object.entries(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_entry_states)) {
  requireEqual(contract.synthetic_fixture_entry?.fixture_entry_states?.[state], label, `synthetic_fixture_entry.fixture_entry_states.${state}`);
}
for (const [state, label] of Object.entries(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.ui_states)) {
  requireEqual(contract.synthetic_fixture_entry?.ui_states?.[state], label, `synthetic_fixture_entry.ui_states.${state}`);
}
requireEqual(
  contract.synthetic_fixture_entry?.leak_guard?.renderable_surface,
  MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.leak_guard.renderable_surface,
  "synthetic_fixture_entry.leak_guard.renderable_surface",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_entry?.leak_guard?.prohibited_outputs ?? []),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.leak_guard.prohibited_outputs),
  "synthetic_fixture_entry.leak_guard.prohibited_outputs",
);
for (const [descriptor, value] of Object.entries(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.evidence_descriptors)) {
  requireEqual(contract.synthetic_fixture_entry?.evidence_descriptors?.[descriptor], value, `synthetic_fixture_entry.evidence_descriptors.${descriptor}`);
}
requireEqual(contract.synthetic_fixture_set_catalog?.pack_id, MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.pack_id, "synthetic_fixture_set_catalog.pack_id");
requireEqual(
  contract.synthetic_fixture_set_catalog?.catalog_id,
  MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.catalog_id,
  "synthetic_fixture_set_catalog.catalog_id",
);
requireEqual(
  contract.synthetic_fixture_set_catalog?.source_fixture_entry_id,
  MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.source_fixture_entry_id,
  "synthetic_fixture_set_catalog.source_fixture_entry_id",
);
requireEqual(
  contract.synthetic_fixture_set_catalog?.source_binding_id,
  MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.source_binding_id,
  "synthetic_fixture_set_catalog.source_binding_id",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_set_catalog?.phase_scope ?? []),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.phase_scope),
  "synthetic_fixture_set_catalog.phase_scope",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_set_catalog?.micro_phase_scope ?? []),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.micro_phase_scope),
  "synthetic_fixture_set_catalog.micro_phase_scope",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_set_catalog?.ui_workflow_states ?? {}),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.ui_workflow_states),
  "synthetic_fixture_set_catalog.ui_workflow_states",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_set_catalog?.base_fixture_refs ?? {}),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.base_fixture_refs),
  "synthetic_fixture_set_catalog.base_fixture_refs",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_set_catalog?.fixture_case_types ?? []),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.fixture_case_types),
  "synthetic_fixture_set_catalog.fixture_case_types",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_set_catalog?.golden_case_ids ?? []),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.golden_case_ids),
  "synthetic_fixture_set_catalog.golden_case_ids",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_set_catalog?.failure_case_ids ?? []),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.failure_case_ids),
  "synthetic_fixture_set_catalog.failure_case_ids",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_set_catalog?.safe_error_codes ?? {}),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.safe_error_codes),
  "synthetic_fixture_set_catalog.safe_error_codes",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_set_catalog?.fixture_manifest ?? {}),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.fixture_manifest),
  "synthetic_fixture_set_catalog.fixture_manifest",
);
requireEqual(
  contract.synthetic_fixture_set_catalog?.leak_guard?.renderable_surface,
  MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.leak_guard.renderable_surface,
  "synthetic_fixture_set_catalog.leak_guard.renderable_surface",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_set_catalog?.leak_guard?.prohibited_outputs ?? []),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.leak_guard.prohibited_outputs),
  "synthetic_fixture_set_catalog.leak_guard.prohibited_outputs",
);
requireEqual(
  JSON.stringify(contract.synthetic_fixture_set_catalog?.evidence_descriptors ?? {}),
  JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.evidence_descriptors),
  "synthetic_fixture_set_catalog.evidence_descriptors",
);
requireEqual(contract.permission_matrix_workflow?.pack_id, MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.pack_id, "permission_matrix_workflow.pack_id");
requireEqual(contract.permission_matrix_workflow?.matrix_id, MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.matrix_id, "permission_matrix_workflow.matrix_id");
requireEqual(
  contract.permission_matrix_workflow?.source_fixture_set_catalog_id,
  MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.source_fixture_set_catalog_id,
  "permission_matrix_workflow.source_fixture_set_catalog_id",
);
requireEqual(
  contract.permission_matrix_workflow?.source_binding_id,
  MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.source_binding_id,
  "permission_matrix_workflow.source_binding_id",
);
requireEqual(
  JSON.stringify(contract.permission_matrix_workflow?.phase_scope ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.phase_scope),
  "permission_matrix_workflow.phase_scope",
);
requireEqual(
  JSON.stringify(contract.permission_matrix_workflow?.micro_phase_scope ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.micro_phase_scope),
  "permission_matrix_workflow.micro_phase_scope",
);
requireEqual(
  JSON.stringify(contract.permission_matrix_workflow?.fixture_tail_scope ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.fixture_tail_scope),
  "permission_matrix_workflow.fixture_tail_scope",
);
requireEqual(
  JSON.stringify(contract.permission_matrix_workflow?.permission_actions ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.permission_actions),
  "permission_matrix_workflow.permission_actions",
);
requireEqual(
  JSON.stringify(contract.permission_matrix_workflow?.decision_bindings ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.decision_bindings),
  "permission_matrix_workflow.decision_bindings",
);
requireEqual(
  JSON.stringify(contract.permission_matrix_workflow?.security_controls ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.security_controls),
  "permission_matrix_workflow.security_controls",
);
requireEqual(
  JSON.stringify(contract.permission_matrix_workflow?.safe_error_codes ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.safe_error_codes),
  "permission_matrix_workflow.safe_error_codes",
);
requireEqual(
  JSON.stringify(contract.permission_matrix_workflow?.permission_fixture_ids ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.permission_fixture_ids),
  "permission_matrix_workflow.permission_fixture_ids",
);
requireEqual(
  JSON.stringify(contract.permission_matrix_workflow?.evidence_descriptors ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.evidence_descriptors),
  "permission_matrix_workflow.evidence_descriptors",
);
requireEqual(
  contract.permission_matrix_workflow?.leak_guard?.renderable_surface,
  MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.leak_guard.renderable_surface,
  "permission_matrix_workflow.leak_guard.renderable_surface",
);
requireEqual(
  JSON.stringify(contract.permission_matrix_workflow?.leak_guard?.prohibited_outputs ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.leak_guard.prohibited_outputs),
  "permission_matrix_workflow.leak_guard.prohibited_outputs",
);
requireEqual(
  contract.permission_audit_decision_binding?.pack_id,
  MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.pack_id,
  "permission_audit_decision_binding.pack_id",
);
requireEqual(
  contract.permission_audit_decision_binding?.binding_id,
  MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.binding_id,
  "permission_audit_decision_binding.binding_id",
);
requireEqual(
  contract.permission_audit_decision_binding?.source_matrix_workflow_id,
  MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.source_matrix_workflow_id,
  "permission_audit_decision_binding.source_matrix_workflow_id",
);
requireEqual(
  contract.permission_audit_decision_binding?.source_permission_audit_binding_id,
  MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.source_permission_audit_binding_id,
  "permission_audit_decision_binding.source_permission_audit_binding_id",
);
requireEqual(
  JSON.stringify(contract.permission_audit_decision_binding?.phase_scope ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.phase_scope),
  "permission_audit_decision_binding.phase_scope",
);
requireEqual(
  JSON.stringify(contract.permission_audit_decision_binding?.micro_phase_scope ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.micro_phase_scope),
  "permission_audit_decision_binding.micro_phase_scope",
);
requireEqual(
  JSON.stringify(contract.permission_audit_decision_binding?.unit_scope ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.unit_scope),
  "permission_audit_decision_binding.unit_scope",
);
requireEqual(
  JSON.stringify(contract.permission_audit_decision_binding?.permission_matrix_row ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.permission_matrix_row),
  "permission_audit_decision_binding.permission_matrix_row",
);
requireEqual(
  JSON.stringify(contract.permission_audit_decision_binding?.action_decision_bindings ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.action_decision_bindings),
  "permission_audit_decision_binding.action_decision_bindings",
);
requireEqual(
  JSON.stringify(contract.permission_audit_decision_binding?.test_descriptors ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.test_descriptors),
  "permission_audit_decision_binding.test_descriptors",
);
requireEqual(
  JSON.stringify(contract.permission_audit_decision_binding?.evidence_descriptors ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.evidence_descriptors),
  "permission_audit_decision_binding.evidence_descriptors",
);
requireEqual(
  contract.permission_audit_decision_binding?.leak_guard?.renderable_surface,
  MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.leak_guard.renderable_surface,
  "permission_audit_decision_binding.leak_guard.renderable_surface",
);
requireEqual(
  JSON.stringify(contract.permission_audit_decision_binding?.leak_guard?.internal_reference_fields ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.leak_guard.internal_reference_fields),
  "permission_audit_decision_binding.leak_guard.internal_reference_fields",
);
requireEqual(
  JSON.stringify(contract.permission_audit_decision_binding?.leak_guard?.prohibited_outputs ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.leak_guard.prohibited_outputs),
  "permission_audit_decision_binding.leak_guard.prohibited_outputs",
);
requireEqual(
  contract.permission_audit_control_interactions?.pack_id,
  MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.pack_id,
  "permission_audit_control_interactions.pack_id",
);
requireEqual(
  contract.permission_audit_control_interactions?.control_id,
  MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_id,
  "permission_audit_control_interactions.control_id",
);
requireEqual(
  contract.permission_audit_control_interactions?.source_decision_binding_id,
  MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.source_decision_binding_id,
  "permission_audit_control_interactions.source_decision_binding_id",
);
requireEqual(
  contract.permission_audit_control_interactions?.source_matrix_workflow_id,
  MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.source_matrix_workflow_id,
  "permission_audit_control_interactions.source_matrix_workflow_id",
);
requireEqual(
  JSON.stringify(contract.permission_audit_control_interactions?.phase_scope ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.phase_scope),
  "permission_audit_control_interactions.phase_scope",
);
requireEqual(
  JSON.stringify(contract.permission_audit_control_interactions?.micro_phase_scope ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.micro_phase_scope),
  "permission_audit_control_interactions.micro_phase_scope",
);
requireEqual(
  JSON.stringify(contract.permission_audit_control_interactions?.unit_scope ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.unit_scope),
  "permission_audit_control_interactions.unit_scope",
);
requireEqual(
  JSON.stringify(contract.permission_audit_control_interactions?.control_descriptors ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_descriptors),
  "permission_audit_control_interactions.control_descriptors",
);
requireEqual(
  JSON.stringify(contract.permission_audit_control_interactions?.evidence_descriptors ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.evidence_descriptors),
  "permission_audit_control_interactions.evidence_descriptors",
);
requireEqual(
  contract.permission_audit_control_interactions?.leak_guard?.renderable_surface,
  MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.leak_guard.renderable_surface,
  "permission_audit_control_interactions.leak_guard.renderable_surface",
);
requireEqual(
  JSON.stringify(contract.permission_audit_control_interactions?.leak_guard?.internal_reference_fields ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.leak_guard.internal_reference_fields),
  "permission_audit_control_interactions.leak_guard.internal_reference_fields",
);
requireEqual(
  JSON.stringify(contract.permission_audit_control_interactions?.leak_guard?.prohibited_outputs ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.leak_guard.prohibited_outputs),
  "permission_audit_control_interactions.leak_guard.prohibited_outputs",
);
requireEqual(
  contract.permission_audit_fixture_decision_tests?.pack_id,
  MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.pack_id,
  "permission_audit_fixture_decision_tests.pack_id",
);
requireEqual(
  contract.permission_audit_fixture_decision_tests?.test_matrix_id,
  MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.test_matrix_id,
  "permission_audit_fixture_decision_tests.test_matrix_id",
);
requireEqual(
  contract.permission_audit_fixture_decision_tests?.source_control_interactions_id,
  MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.source_control_interactions_id,
  "permission_audit_fixture_decision_tests.source_control_interactions_id",
);
requireEqual(
  contract.permission_audit_fixture_decision_tests?.source_decision_binding_id,
  MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.source_decision_binding_id,
  "permission_audit_fixture_decision_tests.source_decision_binding_id",
);
requireEqual(
  contract.permission_audit_fixture_decision_tests?.source_matrix_workflow_id,
  MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.source_matrix_workflow_id,
  "permission_audit_fixture_decision_tests.source_matrix_workflow_id",
);
requireEqual(
  JSON.stringify(contract.permission_audit_fixture_decision_tests?.phase_scope ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.phase_scope),
  "permission_audit_fixture_decision_tests.phase_scope",
);
requireEqual(
  JSON.stringify(contract.permission_audit_fixture_decision_tests?.micro_phase_scope ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.micro_phase_scope),
  "permission_audit_fixture_decision_tests.micro_phase_scope",
);
requireEqual(
  JSON.stringify(contract.permission_audit_fixture_decision_tests?.unit_scope ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.unit_scope),
  "permission_audit_fixture_decision_tests.unit_scope",
);
requireEqual(
  JSON.stringify(contract.permission_audit_fixture_decision_tests?.fixture_test_descriptors ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.fixture_test_descriptors),
  "permission_audit_fixture_decision_tests.fixture_test_descriptors",
);
requireEqual(
  JSON.stringify(contract.permission_audit_fixture_decision_tests?.decision_binding_descriptors ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.decision_binding_descriptors),
  "permission_audit_fixture_decision_tests.decision_binding_descriptors",
);
requireEqual(
  JSON.stringify(contract.permission_audit_fixture_decision_tests?.evidence_descriptors ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.evidence_descriptors),
  "permission_audit_fixture_decision_tests.evidence_descriptors",
);
requireEqual(
  contract.permission_audit_fixture_decision_tests?.leak_guard?.renderable_surface,
  MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.leak_guard.renderable_surface,
  "permission_audit_fixture_decision_tests.leak_guard.renderable_surface",
);
requireEqual(
  JSON.stringify(contract.permission_audit_fixture_decision_tests?.leak_guard?.internal_reference_fields ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.leak_guard.internal_reference_fields),
  "permission_audit_fixture_decision_tests.leak_guard.internal_reference_fields",
);
requireEqual(
  JSON.stringify(contract.permission_audit_fixture_decision_tests?.leak_guard?.prohibited_outputs ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.leak_guard.prohibited_outputs),
  "permission_audit_fixture_decision_tests.leak_guard.prohibited_outputs",
);
requireEqual(
  contract.permission_audit_workflow_failure_taxonomy?.pack_id,
  MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.pack_id,
  "permission_audit_workflow_failure_taxonomy.pack_id",
);
requireEqual(
  contract.permission_audit_workflow_failure_taxonomy?.catalog_id,
  MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.catalog_id,
  "permission_audit_workflow_failure_taxonomy.catalog_id",
);
requireEqual(
  contract.permission_audit_workflow_failure_taxonomy?.source_fixture_decision_tests_id,
  MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_fixture_decision_tests_id,
  "permission_audit_workflow_failure_taxonomy.source_fixture_decision_tests_id",
);
requireEqual(
  contract.permission_audit_workflow_failure_taxonomy?.source_control_interactions_id,
  MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_control_interactions_id,
  "permission_audit_workflow_failure_taxonomy.source_control_interactions_id",
);
requireEqual(
  contract.permission_audit_workflow_failure_taxonomy?.source_decision_binding_id,
  MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_decision_binding_id,
  "permission_audit_workflow_failure_taxonomy.source_decision_binding_id",
);
requireEqual(
  contract.permission_audit_workflow_failure_taxonomy?.source_matrix_workflow_id,
  MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.source_matrix_workflow_id,
  "permission_audit_workflow_failure_taxonomy.source_matrix_workflow_id",
);
requireEqual(
  JSON.stringify(contract.permission_audit_workflow_failure_taxonomy?.phase_scope ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.phase_scope),
  "permission_audit_workflow_failure_taxonomy.phase_scope",
);
requireEqual(
  JSON.stringify(contract.permission_audit_workflow_failure_taxonomy?.micro_phase_scope ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.micro_phase_scope),
  "permission_audit_workflow_failure_taxonomy.micro_phase_scope",
);
requireEqual(
  JSON.stringify(contract.permission_audit_workflow_failure_taxonomy?.unit_scope_summary ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.unit_scope_summary),
  "permission_audit_workflow_failure_taxonomy.unit_scope_summary",
);
requireEqual(
  JSON.stringify(contract.permission_audit_workflow_failure_taxonomy?.continuation_descriptors ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.continuation_descriptors),
  "permission_audit_workflow_failure_taxonomy.continuation_descriptors",
);
requireEqual(
  JSON.stringify(contract.permission_audit_workflow_failure_taxonomy?.failure_taxonomy_descriptors ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.failure_taxonomy_descriptors),
  "permission_audit_workflow_failure_taxonomy.failure_taxonomy_descriptors",
);
requireEqual(
  JSON.stringify(contract.permission_audit_workflow_failure_taxonomy?.evidence_descriptors ?? {}),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.evidence_descriptors),
  "permission_audit_workflow_failure_taxonomy.evidence_descriptors",
);
requireEqual(
  contract.permission_audit_workflow_failure_taxonomy?.leak_guard?.renderable_surface,
  MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.leak_guard.renderable_surface,
  "permission_audit_workflow_failure_taxonomy.leak_guard.renderable_surface",
);
requireEqual(
  JSON.stringify(contract.permission_audit_workflow_failure_taxonomy?.leak_guard?.internal_reference_fields ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.leak_guard.internal_reference_fields),
  "permission_audit_workflow_failure_taxonomy.leak_guard.internal_reference_fields",
);
requireEqual(
  JSON.stringify(contract.permission_audit_workflow_failure_taxonomy?.leak_guard?.prohibited_outputs ?? []),
  JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.leak_guard.prohibited_outputs),
  "permission_audit_workflow_failure_taxonomy.leak_guard.prohibited_outputs",
);

const expectedPublicExports = Object.keys(packageExports).sort();
const contractPublicExports = [...(contract.public_exports ?? [])].sort();
requireEqual(contractPublicExports.join(","), expectedPublicExports.join(","), "public_exports");

const cp156Coverage = validateMasterDataCp156Coverage(cp156PlanPack);
requireTrue(cp156Coverage.valid, "cp156 coverage.valid");
requireEqual(cp156Coverage.summary.unit_count, 150, "cp156 coverage unit_count");

const cp157Coverage = validateMasterDataCp157Coverage(cp157PlanPack);
requireTrue(cp157Coverage.valid, "cp157 coverage.valid");
requireEqual(cp157Coverage.summary.unit_count, 150, "cp157 coverage unit_count");
requireEqual(cp157Coverage.summary.by_deliverable.implementation, 73, "cp157 implementation distribution");
requireEqual(cp157Coverage.summary.by_deliverable.ui, 24, "cp157 ui distribution");
requireEqual(cp157Coverage.summary.by_deliverable.contract, 8, "cp157 contract distribution");
requireEqual(cp157Coverage.summary.by_deliverable.security_audit, 16, "cp157 security_audit distribution");
requireEqual(cp157Coverage.summary.by_deliverable.claude_review, 5, "cp157 claude_review distribution");
requireEqual(cp157Coverage.summary.by_deliverable.failure_recovery, 10, "cp157 failure_recovery distribution");
requireEqual(cp157Coverage.summary.by_deliverable.test, 14, "cp157 test distribution");

const serviceBoundary = validateMasterDataCp157ServiceBoundary();
requireTrue(serviceBoundary.valid, "cp157 service_boundary.valid");
requireEqual(serviceBoundary.operation_count, 5, "cp157 service operation count");

const cp158Coverage = validateMasterDataCp158Coverage(cp158PlanPack);
requireTrue(cp158Coverage.valid, "cp158 coverage.valid");
requireEqual(cp158Coverage.summary.unit_count, 10, "cp158 coverage unit_count");
requireEqual(cp158Coverage.summary.by_deliverable.ui, 2, "cp158 ui distribution");
requireEqual(cp158Coverage.summary.by_deliverable.implementation, 3, "cp158 implementation distribution");
requireEqual(cp158Coverage.summary.by_deliverable.claude_review, 1, "cp158 claude_review distribution");
requireEqual(cp158Coverage.summary.by_deliverable.failure_recovery, 2, "cp158 failure_recovery distribution");
requireEqual(cp158Coverage.summary.by_deliverable.test, 2, "cp158 test distribution");

const tailBoundary = validateMasterDataCp158TailBoundary();
requireTrue(tailBoundary.valid, "cp158 tail_boundary.valid");

const fixture = createMasterDataSyntheticFixture();
requireEqual(fixture.synthetic_only, true, "fixture.synthetic_only");
requireEqual(fixture.uses_real_client_data, false, "fixture.uses_real_client_data");
requireEqual(fixture.records.length, 8, "fixture.records.length");

const duplicate = validateMasterDataRecord(
  "Entity",
  {
    entity_id: "entity_rp04_duplicate",
    tenant_id: "tenant_rp04",
    entity_kind: "organization",
    display_name: "Duplicate",
    status: "active",
    owner_user_id: "user_owner",
    identity_key: "tenant_rp04:organization:duplicate",
  },
  { known_identity_keys: ["tenant_rp04:organization:duplicate"] },
);
requireIncludes(duplicate.review_required_claims, "duplicate_identity_review_required", "duplicate.review_required_claims");

const leakage = validateMasterDataRecord(
  "ClientGroup",
  {
    client_group_id: "group_rp04_leakage",
    tenant_id: "tenant_rp04",
    display_name: "Leakage",
    status: "active",
    owner_user_id: "user_owner",
  },
  { member_tenant_ids: ["tenant_rp04", "tenant_other"] },
);
requireEqual(leakage.valid, false, "leakage.valid");
requireIncludes(leakage.blocked_claims, "client_group_leakage", "leakage.blocked_claims");

const ownerDrift = validateMasterDataRecord(
  "Organization",
  {
    organization_id: "org_rp04_owner_drift",
    tenant_id: "tenant_rp04",
    entity_id: "entity_org_rp04_owner_drift",
    display_name: "Owner Drift",
    status: "active",
    owner_user_id: "user_owner",
  },
  { owner_module: "DMS" },
);
requireEqual(ownerDrift.valid, false, "owner_drift.valid");
requireIncludes(ownerDrift.blocked_claims, "ownership_drift", "owner_drift.blocked_claims");

const happy = executeMasterDataEntityCreationWorkflow({
  request_id: "req_rp04_validator_happy",
  tenant_id: "tenant_rp04",
  actor_user_id: "user_owner",
  permission_ref: "permission_ref_rp04_validator",
  audit_hint_ref: "audit_hint_rp04_validator",
  payload: {
    entity_id: "entity_rp04_validator",
    tenant_id: "tenant_rp04",
    entity_kind: "organization",
    display_name: "Validator Entity",
    status: "active",
    owner_user_id: "user_owner",
  },
});
requireEqual(happy.outcome, "passed", "service happy outcome");
requireEqual(happy.action_preview?.writes_product_state, false, "service happy no write");

const review = executeMasterDataDuplicateReviewWorkflow({
  request_id: "req_rp04_validator_duplicate",
  tenant_id: "tenant_rp04",
  actor_user_id: "user_owner",
  permission_ref: "permission_ref_rp04_validator",
  audit_hint_ref: "audit_hint_rp04_validator",
  known_identity_keys: ["tenant_rp04:organization:duplicate"],
  payload: {
    entity_id: "entity_rp04_validator_duplicate",
    tenant_id: "tenant_rp04",
    entity_kind: "organization",
    display_name: "Duplicate",
    status: "active",
    owner_user_id: "user_owner",
    identity_key: "tenant_rp04:organization:duplicate",
  },
});
requireEqual(review.outcome, "review_required", "service duplicate outcome");
requireIncludes(review.review_required_claims, "duplicate_identity_review_required", "service duplicate review claims");

const blocked = executeMasterDataRelationshipMappingWorkflow({
  request_id: "req_rp04_validator_relationship",
  tenant_id: "tenant_rp04",
  actor_user_id: "user_owner",
  permission_ref: "permission_ref_rp04_validator",
  audit_hint_ref: "audit_hint_rp04_validator",
  payload: {
    relationship_id: "relationship_rp04_validator",
    tenant_id: "tenant_rp04",
    from_entity_id: "entity_same",
    to_entity_id: "entity_same",
    relationship_type: "self",
    direction: "person_to_person",
    status: "active",
    owner_user_id: "user_owner",
  },
});
requireEqual(blocked.outcome, "blocked", "service blocked outcome");
requireIncludes(blocked.blocked_claims, "relationship_direction_error", "service blocked claims");

const tailHappy = createMasterDataServiceTailDescriptor(happy);
requireEqual(tailHappy.outcome, "passed", "tail happy outcome");
requireEqual(tailHappy.lock.acquired, false, "tail lock acquired");
requireEqual(tailHappy.persistence.writes_product_state, false, "tail persistence writes_product_state");

const tailBlocked = createMasterDataServiceTailDescriptor(blocked);
requireEqual(tailBlocked.outcome, "blocked", "tail blocked outcome");
requireIncludes(tailBlocked.blocked_output.safe_error_codes, "MASTER_DATA_RELATIONSHIP_DIRECTION_INVALID", "tail blocked safe codes");
requireEqual(tailBlocked.blocked_output.exposes_sensitive_values, false, "tail blocked sensitive output");
requireEqual(Object.hasOwn(tailBlocked.blocked_output, "blocked_claims"), false, "tail blocked customer output excludes blocked_claims");
requireIncludes(tailBlocked.internal_blocked_claim_refs, "relationship_direction_error", "tail blocked internal refs");

const tailReview = createMasterDataServiceTailDescriptor(review);
requireEqual(tailReview.outcome, "review_required", "tail review outcome");
requireIncludes(tailReview.route.route_refs, "route_to_master_data_duplicate_review_queue", "tail review route refs");

const cp159ReviewPath = createMasterDataServiceReviewPathCase();
requireEqual(cp159ReviewPath.pack_id, MASTER_DATA_CP159_PACK_BINDING.pack_id, "cp159 review path pack_id");
requireEqual(cp159ReviewPath.outcome, "review_required", "cp159 review path outcome");
requireEqual(cp159ReviewPath.dispatches_route, false, "cp159 review path route dispatch");
requireIncludes(cp159ReviewPath.route_refs, "route_to_master_data_duplicate_review_queue", "cp159 review path route refs");

const cp159Smoke = createMasterDataServiceIntegrationSmokeCase();
requireEqual(cp159Smoke.pack_id, MASTER_DATA_CP159_PACK_BINDING.pack_id, "cp159 smoke pack_id");
requireEqual(cp159Smoke.outcome_count, 4, "cp159 smoke outcome_count");
requireTrue(cp159Smoke.all_no_write, "cp159 smoke all_no_write");
requireTrue(cp159Smoke.all_routes_descriptor_only, "cp159 smoke descriptor-only routes");
requireTrue(cp159Smoke.all_hidden_fields_sanitized, "cp159 smoke hidden fields sanitized");
for (const outcome of MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_tail_outcomes) {
  requireIncludes(Object.values(cp159Smoke.outcomes), outcome, "cp159 smoke outcomes");
}

const cp156Hermes = createMasterDataCp156HermesEvidencePacket(cp156PlanPack);
const cp156Claude = createMasterDataCp156ClaudeReviewPacket(cp156PlanPack);
const cp156Handoff = createMasterDataCp156CloseoutHandoff();
requireEqual(cp156Hermes.evidence_packet, "H04.CP00-156.master_data_foundation_model_registry", "cp156 hermes.evidence_packet");
requireEqual(cp156Claude.review_packet, "C04.CP00-156.master_data_foundation_model_registry", "cp156 claude.review_packet");
requireEqual(cp156Handoff.to_pack_id, "CP00-157", "cp156 handoff.to_pack_id");

const cp157Hermes = createMasterDataCp157HermesEvidencePacket(cp157PlanPack);
const cp157Claude = createMasterDataCp157ClaudeReviewPacket(cp157PlanPack);
const cp157Handoff = createMasterDataCp157CloseoutHandoff();
requireEqual(cp157Hermes.evidence_packet, "H04.CP00-157.master_data_service_logic_boundary", "cp157 hermes.evidence_packet");
requireEqual(cp157Claude.review_packet, "C04.CP00-157.master_data_service_logic_boundary", "cp157 claude.review_packet");
requireEqual(cp157Handoff.to_pack_id, "CP00-158", "cp157 handoff.to_pack_id");
requireEqual(cp157Handoff.next_subphase_id, "RP04.P02.M07.S11", "cp157 handoff.next_subphase_id");

const cp158Hermes = createMasterDataCp158HermesEvidencePacket(cp158PlanPack);
const cp158Claude = createMasterDataCp158ClaudeReviewPacket(cp158PlanPack);
const cp158Handoff = createMasterDataCp158CloseoutHandoff();
requireEqual(cp158Hermes.evidence_packet, "H04.CP00-158.master_data_service_tail_boundary", "cp158 hermes.evidence_packet");
requireEqual(cp158Claude.review_packet, "C04.CP00-158.master_data_service_tail_boundary", "cp158 claude.review_packet");
requireEqual(cp158Handoff.to_pack_id, "CP00-159", "cp158 handoff.to_pack_id");
requireEqual(cp158Handoff.next_subphase_id, "RP04.P02.M07.S21", "cp158 handoff.next_subphase_id");

const cp159Coverage = validateMasterDataCp159Coverage(cp159PlanPack);
requireTrue(cp159Coverage.valid, "cp159 coverage.valid");
requireEqual(cp159Coverage.summary.unit_count, 40, "cp159 coverage unit_count");
requireEqual(cp159Coverage.summary.by_deliverable.test, 4, "cp159 test distribution");
requireEqual(cp159Coverage.summary.by_deliverable.contract, 2, "cp159 contract distribution");
requireEqual(cp159Coverage.summary.by_deliverable.implementation, 18, "cp159 implementation distribution");
requireEqual(cp159Coverage.summary.by_deliverable.security_audit, 4, "cp159 security_audit distribution");
requireEqual(cp159Coverage.summary.by_deliverable.ui, 6, "cp159 ui distribution");
requireEqual(cp159Coverage.summary.by_deliverable.claude_review, 2, "cp159 claude_review distribution");
requireEqual(cp159Coverage.summary.by_deliverable.failure_recovery, 4, "cp159 failure_recovery distribution");

const cp159ServiceEvidence = validateMasterDataCp159ServiceEvidence(cp159PlanPack, contract.service_evidence);
requireTrue(cp159ServiceEvidence.valid, "cp159 service_evidence.valid");

const cp159Hermes = createMasterDataCp159HermesEvidencePacket(cp159PlanPack);
const cp159Claude = createMasterDataCp159ClaudeReviewPacket(cp159PlanPack);
const cp159Handoff = createMasterDataCp159CloseoutHandoff();
requireEqual(cp159Hermes.evidence_packet, "H04.CP00-159.master_data_service_evidence_review_packet", "cp159 hermes.evidence_packet");
requireEqual(cp159Claude.review_packet, "C04.CP00-159.master_data_service_evidence_review_packet", "cp159 claude.review_packet");
requireEqual(cp159Claude.read_only, true, "cp159 claude.read_only");
requireEqual(cp159Handoff.to_pack_id, "CP00-160", "cp159 handoff.to_pack_id");
requireEqual(cp159Handoff.next_subphase_id, "RP04.P02.M09.S19", "cp159 handoff.next_subphase_id");

const cp160Coverage = validateMasterDataCp160Coverage(cp160PlanPack);
requireTrue(cp160Coverage.valid, "cp160 coverage.valid");
requireEqual(cp160Coverage.summary.unit_count, 150, "cp160 coverage unit_count");
requireEqual(cp160Coverage.summary.by_deliverable.test, 12, "cp160 test distribution");
requireEqual(cp160Coverage.summary.by_deliverable.contract, 35, "cp160 contract distribution");
requireEqual(cp160Coverage.summary.by_deliverable.implementation, 56, "cp160 implementation distribution");
requireEqual(cp160Coverage.summary.by_deliverable.security_audit, 18, "cp160 security_audit distribution");
requireEqual(cp160Coverage.summary.by_deliverable.ui, 21, "cp160 ui distribution");
requireEqual(cp160Coverage.summary.by_deliverable.hermes_evidence, 3, "cp160 hermes_evidence distribution");
requireEqual(cp160Coverage.summary.by_deliverable.claude_review, 5, "cp160 claude_review distribution");

const cp160ApiUiReference = validateMasterDataCp160ApiUiReference(contract);
requireTrue(cp160ApiUiReference.valid, "cp160 api_ui_reference.valid");
const cp160HappyApiFixture = createMasterDataApiReferenceFixture({
  scenario: "happy_search",
  tenant_id: "tenant_rp04",
  permission_ref: "permission_ref_cp160_validator",
  audit_hint_ref: "audit_hint_cp160_validator",
});
requireEqual(cp160HappyApiFixture.response.outcome, "passed", "cp160 happy api fixture outcome");
requireEqual(cp160HappyApiFixture.executes_api_handler, false, "cp160 happy api fixture no handler");
requireEqual(JSON.stringify(cp160HappyApiFixture).includes("cp160_hidden_value_secret"), false, "cp160 happy api fixture hidden values");
const cp160ApiCatalog = createMasterDataApiReferenceCatalog();
requireEqual(cp160ApiCatalog.fixture_ids.length, 3, "cp160 api fixture count");
requireTrue(cp160ApiCatalog.all_no_write, "cp160 api catalog all_no_write");
requireTrue(cp160ApiCatalog.all_serialized_without_hidden_values, "cp160 api catalog hidden values");
requireTrue(cp160ApiCatalog.denied_omits_items, "cp160 api catalog denied_omits_items");
const cp160UiCatalog = createMasterDataUiSurfaceStateCatalog();
requireEqual(cp160UiCatalog.catalog_id, MASTER_DATA_UI_SURFACE_STATES.surface_id, "cp160 ui catalog id");
requireEqual(cp160UiCatalog.renders_ui, false, "cp160 ui catalog renders_ui");
requireEqual(cp160UiCatalog.mutates_dom, false, "cp160 ui catalog mutates_dom");

const cp160Hermes = createMasterDataCp160HermesEvidencePacket(cp160PlanPack);
const cp160Claude = createMasterDataCp160ClaudeReviewPacket(cp160PlanPack);
const cp160Handoff = createMasterDataCp160CloseoutHandoff();
requireEqual(cp160Hermes.evidence_packet, "H04.CP00-160.master_data_api_ui_reference_catalog", "cp160 hermes.evidence_packet");
requireEqual(cp160Claude.review_packet, "C04.CP00-160.master_data_api_ui_reference_catalog", "cp160 claude.review_packet");
requireEqual(cp160Claude.read_only, true, "cp160 claude.read_only");
requireEqual(cp160Handoff.to_pack_id, "CP00-161", "cp160 handoff.to_pack_id");
requireEqual(cp160Handoff.next_subphase_id, "RP04.P04.M03.S06", "cp160 handoff.next_subphase_id");

const cp161Coverage = validateMasterDataCp161Coverage(cp161PlanPack);
requireTrue(cp161Coverage.valid, "cp161 coverage.valid");
requireEqual(cp161Coverage.summary.unit_count, 40, "cp161 coverage unit_count");
requireEqual(cp161Coverage.summary.by_deliverable.claude_review, 4, "cp161 claude_review distribution");
requireEqual(cp161Coverage.summary.by_deliverable.ui, 16, "cp161 ui distribution");
requireEqual(cp161Coverage.summary.by_deliverable.security_audit, 4, "cp161 security_audit distribution");
requireEqual(cp161Coverage.summary.by_deliverable.implementation, 10, "cp161 implementation distribution");
requireEqual(cp161Coverage.summary.by_deliverable.fixture, 2, "cp161 fixture distribution");
requireEqual(cp161Coverage.summary.by_deliverable.test, 2, "cp161 test distribution");
requireEqual(cp161Coverage.summary.by_deliverable.hermes_evidence, 2, "cp161 hermes_evidence distribution");

const cp161Workflow = validateMasterDataCp161UiInteractionWorkflow(contract);
requireTrue(cp161Workflow.valid, "cp161 ui_interaction_workflow.valid");
const cp161ReviewFixture = createMasterDataUiInteractionFixture({
  fixture_id: "cp161_validator_review_fixture",
  slice: "primary_implementation_slice",
  scenario: "review_required",
});
requireEqual(cp161ReviewFixture.renders_ui, false, "cp161 review fixture renders_ui");
requireEqual(cp161ReviewFixture.permission_badge.evaluates_runtime_permission, false, "cp161 review fixture permission runtime");
requireEqual(cp161ReviewFixture.audit_hint_display.appends_audit_event, false, "cp161 review fixture audit append");
const cp161Catalog = createMasterDataUiInteractionWorkflowCatalog();
requireEqual(cp161Catalog.fixture_ids.length, 3, "cp161 fixture count");
requireTrue(cp161Catalog.all_no_write, "cp161 catalog all_no_write");
requireTrue(cp161Catalog.all_security_displays_descriptor_only, "cp161 catalog security displays descriptor-only");
requireTrue(cp161Catalog.all_required_interactions_present, "cp161 catalog interactions present");
requireTrue(cp161Catalog.prohibited_output_absent, "cp161 catalog prohibited output absent");

const cp161Hermes = createMasterDataCp161HermesEvidencePacket(cp161PlanPack);
const cp161Claude = createMasterDataCp161ClaudeReviewPacket(cp161PlanPack);
const cp161Handoff = createMasterDataCp161CloseoutHandoff();
requireEqual(cp161Hermes.evidence_packet, "H04.CP00-161.master_data_ui_interaction_workflow", "cp161 hermes.evidence_packet");
requireEqual(cp161Claude.review_packet, "C04.CP00-161.master_data_ui_interaction_workflow", "cp161 claude.review_packet");
requireEqual(cp161Claude.read_only, true, "cp161 claude.read_only");
requireEqual(cp161Handoff.to_pack_id, "CP00-162", "cp161 handoff.to_pack_id");
requireEqual(cp161Handoff.next_subphase_id, "RP04.P04.M05.S06", "cp161 handoff.next_subphase_id");

const cp162Coverage = validateMasterDataCp162Coverage(cp162PlanPack);
requireTrue(cp162Coverage.valid, "cp162 coverage.valid");
requireEqual(cp162Coverage.summary.unit_count, 10, "cp162 coverage unit_count");
requireEqual(cp162Coverage.summary.by_deliverable.claude_review, 1, "cp162 claude_review distribution");
requireEqual(cp162Coverage.summary.by_deliverable.ui, 4, "cp162 ui distribution");
requireEqual(cp162Coverage.summary.by_deliverable.security_audit, 2, "cp162 security_audit distribution");
requireEqual(cp162Coverage.summary.by_deliverable.implementation, 3, "cp162 implementation distribution");

const cp162Binding = validateMasterDataCp162PermissionAuditBinding(contract);
requireTrue(cp162Binding.valid, "cp162 permission_audit_binding.valid");
const cp162PermissionMissing = createMasterDataPermissionAuditBindingDescriptor({
  fixture_id: "cp162_validator_permission_missing",
  scenario: "permission_missing",
});
requireEqual(cp162PermissionMissing.permission_badge.evaluates_runtime_permission, false, "cp162 permission fixture runtime permission");
requireEqual(cp162PermissionMissing.audit_hint_display.appends_audit_event, false, "cp162 permission fixture audit append");
requireEqual(cp162PermissionMissing.error_message_copy.safe_error_code, "MASTER_DATA_PERMISSION_DESCRIPTOR_REQUIRED", "cp162 permission fixture safe code");
const cp162Catalog = createMasterDataPermissionAuditBindingCatalog();
requireEqual(cp162Catalog.fixture_ids.length, 4, "cp162 fixture count");
requireTrue(cp162Catalog.all_descriptor_refs_checked, "cp162 descriptor refs checked");
requireTrue(cp162Catalog.no_runtime_permission_decisions, "cp162 runtime permission decisions absent");
requireTrue(cp162Catalog.no_audit_events_appended, "cp162 audit events absent");
requireTrue(cp162Catalog.safe_error_copy_only, "cp162 safe error copy only");
requireTrue(cp162Catalog.layout_boundaries_stable, "cp162 layout boundaries stable");
requireTrue(cp162Catalog.prohibited_output_absent, "cp162 prohibited output absent");

const cp162Hermes = createMasterDataCp162HermesEvidencePacket(cp162PlanPack);
const cp162Claude = createMasterDataCp162ClaudeReviewPacket(cp162PlanPack);
const cp162Handoff = createMasterDataCp162CloseoutHandoff();
requireEqual(cp162Hermes.evidence_packet, "H04.CP00-162.master_data_permission_audit_binding", "cp162 hermes.evidence_packet");
requireEqual(cp162Claude.review_packet, "C04.CP00-162.master_data_permission_audit_binding", "cp162 claude.review_packet");
requireEqual(cp162Claude.read_only, true, "cp162 claude.read_only");
requireEqual(cp162Handoff.to_pack_id, "CP00-163", "cp162 handoff.to_pack_id");
requireEqual(cp162Handoff.next_subphase_id, "RP04.P04.M05.S16", "cp162 handoff.next_subphase_id");

const cp163Coverage = validateMasterDataCp163Coverage(cp163PlanPack);
requireTrue(cp163Coverage.valid, "cp163 coverage.valid");
requireEqual(cp163Coverage.summary.unit_count, 10, "cp163 coverage unit_count");
requireEqual(cp163Coverage.summary.by_deliverable.fixture, 1, "cp163 fixture distribution");
requireEqual(cp163Coverage.summary.by_deliverable.test, 1, "cp163 test distribution");
requireEqual(cp163Coverage.summary.by_deliverable.hermes_evidence, 1, "cp163 hermes_evidence distribution");
requireEqual(cp163Coverage.summary.by_deliverable.claude_review, 1, "cp163 claude_review distribution");
requireEqual(cp163Coverage.summary.by_deliverable.implementation, 2, "cp163 implementation distribution");
requireEqual(cp163Coverage.summary.by_deliverable.ui, 4, "cp163 ui distribution");

const cp163FixtureEntry = validateMasterDataCp163SyntheticFixtureEntry(contract);
requireTrue(cp163FixtureEntry.valid, "cp163 synthetic_fixture_entry.valid");
const cp163Denied = createMasterDataSyntheticFixtureEntryDescriptor({
  fixture_id: "cp163_validator_denied",
  scenario: "denied",
  safe_error_code: "MASTER_DATA_API_UNAUTHORIZED_OMISSION",
});
requireEqual(cp163Denied.renders_ui, false, "cp163 denied fixture renders_ui");
requireEqual(cp163Denied.executes_api_handler, false, "cp163 denied fixture api handler");
requireEqual(cp163Denied.prohibited_output_absent, true, "cp163 denied fixture prohibited output absent");
const cp163Catalog = createMasterDataSyntheticFixtureEntryCatalog();
requireEqual(cp163Catalog.fixture_ids.length, 3, "cp163 fixture count");
requireTrue(cp163Catalog.all_descriptor_refs_checked, "cp163 descriptor refs checked");
requireTrue(cp163Catalog.ui_surface_inventory_complete, "cp163 UI inventory complete");
requireTrue(cp163Catalog.loading_empty_denied_states_present, "cp163 states present");
requireTrue(cp163Catalog.no_runtime_or_rendering_side_effects, "cp163 no runtime or rendering side effects");
requireTrue(cp163Catalog.prohibited_output_absent, "cp163 prohibited output absent");

const cp163Hermes = createMasterDataCp163HermesEvidencePacket(cp163PlanPack);
const cp163Claude = createMasterDataCp163ClaudeReviewPacket(cp163PlanPack);
const cp163Handoff = createMasterDataCp163CloseoutHandoff();
requireEqual(cp163Hermes.evidence_packet, "H04.CP00-163.master_data_synthetic_fixture_entry", "cp163 hermes.evidence_packet");
requireEqual(cp163Claude.review_packet, "C04.CP00-163.master_data_synthetic_fixture_entry", "cp163 claude.review_packet");
requireEqual(cp163Claude.read_only, true, "cp163 claude.read_only");
requireEqual(cp163Handoff.to_pack_id, "CP00-164", "cp163 handoff.to_pack_id");
requireEqual(cp163Handoff.next_subphase_id, "RP04.P04.M06.S06", "cp163 handoff.next_subphase_id");

const cp164Coverage = validateMasterDataCp164Coverage(cp164PlanPack);
requireTrue(cp164Coverage.valid, "cp164 coverage.valid");
requireEqual(cp164Coverage.summary.unit_count, 150, "cp164 coverage unit_count");
requireEqual(cp164Coverage.summary.by_deliverable.claude_review, 12, "cp164 claude_review distribution");
requireEqual(cp164Coverage.summary.by_deliverable.ui, 29, "cp164 ui distribution");
requireEqual(cp164Coverage.summary.by_deliverable.security_audit, 12, "cp164 security_audit distribution");
requireEqual(cp164Coverage.summary.by_deliverable.implementation, 36, "cp164 implementation distribution");
requireEqual(cp164Coverage.summary.by_deliverable.fixture, 43, "cp164 fixture distribution");
requireEqual(cp164Coverage.summary.by_deliverable.test, 12, "cp164 test distribution");
requireEqual(cp164Coverage.summary.by_deliverable.hermes_evidence, 6, "cp164 hermes_evidence distribution");

const cp164FixtureSet = validateMasterDataCp164SyntheticFixtureSet(contract);
requireTrue(cp164FixtureSet.valid, "cp164 synthetic_fixture_set.valid");
const cp164Denied = createMasterDataSyntheticFixtureSetCase({
  fixture_case_id: "cp164_validator_denied_case",
  case_type: "denied_case",
});
requireEqual(cp164Denied.outcome, "blocked", "cp164 denied outcome");
requireEqual(cp164Denied.safe_error_code, "MASTER_DATA_API_UNAUTHORIZED_OMISSION", "cp164 denied safe code");
requireEqual(cp164Denied.renders_ui, false, "cp164 denied renders_ui");
requireEqual(cp164Denied.executes_api_handler, false, "cp164 denied api handler");
requireEqual(cp164Denied.prohibited_output_absent, true, "cp164 denied prohibited output absent");
const cp164Catalog = createMasterDataSyntheticFixtureSetCatalog();
requireEqual(cp164Catalog.case_count, 9, "cp164 fixture case count");
requireTrue(cp164Catalog.all_no_write, "cp164 catalog all_no_write");
requireTrue(cp164Catalog.all_base_fixture_refs_present, "cp164 catalog base fixture refs present");
requireTrue(cp164Catalog.all_customer_facing_descriptors_trimmed, "cp164 catalog customer-facing descriptors trimmed");
requireEqual(cp164Catalog.review_required_case_outcome, "review_required", "cp164 review required outcome");
requireEqual(cp164Catalog.cross_tenant_case_safe_error_code, "MASTER_DATA_CROSS_TENANT_REFERENCE", "cp164 cross tenant safe code");
requireTrue(cp164Catalog.security_trimming_case_trims_unauthorized_data, "cp164 security trimming");
requireTrue(cp164Catalog.ai_retrieval_or_analytics_descriptor_only, "cp164 AI analytics descriptor-only");
requireTrue(cp164Catalog.prohibited_output_absent, "cp164 prohibited output absent");

const cp164Hermes = createMasterDataCp164HermesEvidencePacket(cp164PlanPack);
const cp164Claude = createMasterDataCp164ClaudeReviewPacket(cp164PlanPack);
const cp164Handoff = createMasterDataCp164CloseoutHandoff();
requireEqual(cp164Hermes.evidence_packet, "H04.CP00-164.master_data_synthetic_fixture_set", "cp164 hermes.evidence_packet");
requireEqual(cp164Claude.review_packet, "C04.CP00-164.master_data_synthetic_fixture_set", "cp164 claude.review_packet");
requireEqual(cp164Claude.read_only, true, "cp164 claude.read_only");
requireEqual(cp164Handoff.to_pack_id, "CP00-165", "cp164 handoff.to_pack_id");
requireEqual(cp164Handoff.next_subphase_id, "RP04.P05.M06.S04", "cp164 handoff.next_subphase_id");

const cp165Coverage = validateMasterDataCp165Coverage(cp165PlanPack);
requireTrue(cp165Coverage.valid, "cp165 coverage.valid");
requireEqual(cp165Coverage.summary.unit_count, 150, "cp165 coverage unit_count");
requireEqual(cp165Coverage.summary.by_deliverable.fixture, 28, "cp165 fixture distribution");
requireEqual(cp165Coverage.summary.by_deliverable.claude_review, 7, "cp165 claude_review distribution");
requireEqual(cp165Coverage.summary.by_deliverable.implementation, 59, "cp165 implementation distribution");
requireEqual(cp165Coverage.summary.by_deliverable.security_audit, 24, "cp165 security_audit distribution");
requireEqual(cp165Coverage.summary.by_deliverable.test, 15, "cp165 test distribution");
requireEqual(cp165Coverage.summary.by_deliverable.hermes_evidence, 3, "cp165 hermes_evidence distribution");
requireEqual(cp165Coverage.summary.by_deliverable.ui, 14, "cp165 ui distribution");

const cp165Workflow = validateMasterDataCp165PermissionMatrixWorkflow(contract);
requireTrue(cp165Workflow.valid, "cp165 permission_matrix_workflow.valid");
const cp165Denied = createMasterDataPermissionMatrixDecisionDescriptor({
  fixture_id: "cp165_validator_denied_export",
  scenario: "denied",
  action: "export_download",
});
requireEqual(cp165Denied.decision_outcome, "denied", "cp165 denied outcome");
requireEqual(cp165Denied.safe_error_code, "MASTER_DATA_PERMISSION_DENIED", "cp165 denied safe code");
requireEqual(cp165Denied.evaluates_runtime_permission, false, "cp165 denied runtime permission");
requireEqual(cp165Denied.audit_event_expectation.appends_audit_event, false, "cp165 denied audit append");
requireEqual(cp165Denied.prohibited_output_absent, true, "cp165 denied prohibited output absent");
const cp165Catalog = createMasterDataPermissionMatrixWorkflowCatalog();
requireEqual(cp165Catalog.fixture_ids.length, 8, "cp165 permission fixture count");
requireTrue(cp165Catalog.all_fixture_ids_declared, "cp165 fixture IDs declared");
requireTrue(cp165Catalog.all_no_write, "cp165 catalog all_no_write");
requireTrue(cp165Catalog.all_routes_descriptor_only, "cp165 routes descriptor-only");
requireTrue(cp165Catalog.all_audit_expectations_descriptor_only, "cp165 audit expectations descriptor-only");
requireTrue(cp165Catalog.all_matched_rules_reference_only, "cp165 matched rules reference-only");
requireTrue(cp165Catalog.deny_over_allow_covered, "cp165 deny-over-allow covered");
requireTrue(cp165Catalog.legal_hold_covered, "cp165 legal hold covered");
requireTrue(cp165Catalog.ethical_wall_covered, "cp165 ethical wall covered");
requireTrue(cp165Catalog.object_acl_covered, "cp165 object ACL covered");
requireTrue(cp165Catalog.security_trimming_covered, "cp165 security trimming covered");
requireTrue(cp165Catalog.review_and_approval_routes_present, "cp165 review and approval routes present");
requireTrue(cp165Catalog.prohibited_output_absent, "cp165 prohibited output absent");

const cp165Hermes = createMasterDataCp165HermesEvidencePacket(cp165PlanPack);
const cp165Claude = createMasterDataCp165ClaudeReviewPacket(cp165PlanPack);
const cp165Handoff = createMasterDataCp165CloseoutHandoff();
requireEqual(cp165Hermes.evidence_packet, "H04.CP00-165.master_data_permission_matrix_workflow", "cp165 hermes.evidence_packet");
requireEqual(cp165Claude.review_packet, "C04.CP00-165.master_data_permission_matrix_workflow", "cp165 claude.review_packet");
requireEqual(cp165Claude.read_only, true, "cp165 claude.read_only");
requireEqual(cp165Handoff.to_pack_id, "CP00-166", "cp165 handoff.to_pack_id");
requireEqual(cp165Handoff.next_subphase_id, "RP04.P06.M04.S18", "cp165 handoff.next_subphase_id");

const cp166Coverage = validateMasterDataCp166Coverage(cp166PlanPack);
requireTrue(cp166Coverage.valid, "cp166 coverage.valid");
requireEqual(cp166Coverage.summary.unit_count, 10, "cp166 coverage unit_count");
requireEqual(cp166Coverage.summary.by_deliverable.security_audit, 2, "cp166 security_audit distribution");
requireEqual(cp166Coverage.summary.by_deliverable.test, 2, "cp166 test distribution");
requireEqual(cp166Coverage.summary.by_deliverable.implementation, 6, "cp166 implementation distribution");
requireEqual(cp166Coverage.summary.by_micro_phase["RP04.P06.M04"], 3, "cp166 RP04.P06.M04 distribution");
requireEqual(cp166Coverage.summary.by_micro_phase["RP04.P06.M05"], 7, "cp166 RP04.P06.M05 distribution");

const cp166Binding = validateMasterDataCp166PermissionAuditDecisionBinding(contract);
requireTrue(cp166Binding.valid, "cp166 permission_audit_decision_binding.valid");
const cp166Denied = createMasterDataPermissionAuditDecisionBindingDescriptor({
  action: "export_download",
  scenario: "denied",
});
requireEqual(cp166Denied.pack_id, "CP00-166", "cp166 denied pack");
requireEqual(cp166Denied.matrix_decision.pack_id, "CP00-165", "cp166 source matrix decision pack");
requireEqual(cp166Denied.customer_facing_decision.decision_outcome, "denied", "cp166 denied outcome");
requireEqual(cp166Denied.customer_surface_excludes_internal_refs, true, "cp166 customer surface excludes internal refs");
requireEqual(cp166Denied.internal_evidence_binding.exposes_customer_surface, false, "cp166 internal refs evidence only");
requireEqual(cp166Denied.audit_event_expectation.appends_audit_event, false, "cp166 audit append");
requireEqual(cp166Denied.route.dispatches_review_route, false, "cp166 review route dispatch");
requireEqual(cp166Denied.prohibited_output_absent, true, "cp166 prohibited output absent");
const cp166Catalog = createMasterDataPermissionAuditDecisionBindingCatalog();
requireEqual(cp166Catalog.action_rows.length, 6, "cp166 action rows");
requireTrue(cp166Catalog.all_actions_bound, "cp166 all actions bound");
requireTrue(cp166Catalog.fixture_tests.allowed_covered, "cp166 allowed test covered");
requireTrue(cp166Catalog.fixture_tests.denied_covered, "cp166 denied test covered");
requireTrue(cp166Catalog.all_no_write, "cp166 all_no_write");
requireTrue(cp166Catalog.all_customer_surfaces_trimmed, "cp166 customer surfaces trimmed");
requireTrue(cp166Catalog.all_internal_refs_evidence_only, "cp166 internal refs evidence only");
requireTrue(cp166Catalog.all_audit_expectations_descriptor_only, "cp166 audit expectations descriptor-only");
requireTrue(cp166Catalog.review_and_approval_routes_descriptor_only, "cp166 routes descriptor-only");
requireTrue(cp166Catalog.prohibited_output_absent, "cp166 prohibited output absent");

const cp166Hermes = createMasterDataCp166HermesEvidencePacket(cp166PlanPack);
const cp166Claude = createMasterDataCp166ClaudeReviewPacket(cp166PlanPack);
const cp166Handoff = createMasterDataCp166CloseoutHandoff();
requireEqual(cp166Hermes.evidence_packet, "H04.CP00-166.master_data_permission_audit_decision_binding", "cp166 hermes.evidence_packet");
requireEqual(cp166Claude.review_packet, "C04.CP00-166.master_data_permission_audit_decision_binding", "cp166 claude.review_packet");
requireEqual(cp166Claude.read_only, true, "cp166 claude.read_only");
requireEqual(cp166Handoff.to_pack_id, "CP00-167", "cp166 handoff.to_pack_id");
requireEqual(cp166Handoff.next_subphase_id, "RP04.P06.M05.S08", "cp166 handoff.next_subphase_id");

const cp167Coverage = validateMasterDataCp167Coverage(cp167PlanPack);
requireTrue(cp167Coverage.valid, "cp167 coverage.valid");
requireEqual(cp167Coverage.summary.unit_count, 10, "cp167 coverage unit_count");
requireEqual(cp167Coverage.summary.by_deliverable.security_audit, 3, "cp167 security_audit distribution");
requireEqual(cp167Coverage.summary.by_deliverable.implementation, 2, "cp167 implementation distribution");
requireEqual(cp167Coverage.summary.by_deliverable.ui, 4, "cp167 ui distribution");
requireEqual(cp167Coverage.summary.by_deliverable.claude_review, 1, "cp167 claude_review distribution");
requireEqual(cp167Coverage.summary.by_micro_phase["RP04.P06.M05"], 10, "cp167 RP04.P06.M05 distribution");

const cp167Interactions = validateMasterDataCp167PermissionAuditControlInteractions(contract);
requireTrue(cp167Interactions.valid, "cp167 permission_audit_control_interactions.valid");
const cp167LegalHold = createMasterDataPermissionAuditControlInteractionDescriptor({
  control_key: "legal_hold_interaction",
});
requireEqual(cp167LegalHold.pack_id, "CP00-167", "cp167 legal hold pack");
requireEqual(cp167LegalHold.decision_binding.pack_id, "CP00-166", "cp167 source decision binding pack");
requireEqual(cp167LegalHold.customer_surface_excludes_internal_refs, true, "cp167 customer surface excludes internal refs");
requireEqual(cp167LegalHold.internal_control_evidence.exposes_customer_surface, false, "cp167 internal refs evidence only");
requireEqual(cp167LegalHold.internal_control_evidence.exposes_raw_rule, false, "cp167 raw rule exposure");
requireEqual(cp167LegalHold.internal_control_evidence.exposes_denied_items, false, "cp167 denied item exposure");
requireEqual(cp167LegalHold.evaluates_runtime_permission, false, "cp167 runtime permission");
requireEqual(cp167LegalHold.audit_event_expectation.appends_audit_event, false, "cp167 audit append");
requireEqual(cp167LegalHold.route.dispatches_review_route, false, "cp167 review route dispatch");
requireEqual(cp167LegalHold.legal_hold_interaction_descriptor.mutates_hold_state, false, "cp167 legal hold mutation");
requireEqual(cp167LegalHold.prohibited_output_absent, true, "cp167 prohibited output absent");
const cp167Catalog = createMasterDataPermissionAuditControlInteractionsCatalog();
requireEqual(cp167Catalog.control_rows.length, 10, "cp167 control rows");
requireTrue(cp167Catalog.all_controls_declared, "cp167 all controls declared");
requireTrue(cp167Catalog.all_no_write, "cp167 all_no_write");
requireTrue(cp167Catalog.all_customer_surfaces_trimmed, "cp167 customer surfaces trimmed");
requireTrue(cp167Catalog.all_internal_refs_evidence_only, "cp167 internal refs evidence only");
requireTrue(cp167Catalog.audit_hint_fields_covered, "cp167 audit hint fields covered");
requireTrue(cp167Catalog.matched_rule_capture_reference_only, "cp167 matched rule reference only");
requireTrue(cp167Catalog.deny_over_allow_covered, "cp167 deny-over-allow covered");
requireTrue(cp167Catalog.legal_hold_covered, "cp167 legal hold covered");
requireTrue(cp167Catalog.ethical_wall_covered, "cp167 ethical wall covered");
requireTrue(cp167Catalog.object_acl_covered, "cp167 object ACL covered");
requireTrue(cp167Catalog.review_route_descriptor_only, "cp167 review route descriptor-only");
requireTrue(cp167Catalog.approval_route_descriptor_only, "cp167 approval route descriptor-only");
requireTrue(cp167Catalog.security_trimming_safe_counts_only, "cp167 security trimming safe-counts-only");
requireTrue(cp167Catalog.audit_event_expectation_descriptor_only, "cp167 audit expectation descriptor-only");
requireTrue(cp167Catalog.prohibited_output_absent, "cp167 prohibited output absent");

const cp167Hermes = createMasterDataCp167HermesEvidencePacket(cp167PlanPack);
const cp167Claude = createMasterDataCp167ClaudeReviewPacket(cp167PlanPack);
const cp167Handoff = createMasterDataCp167CloseoutHandoff();
requireEqual(cp167Hermes.evidence_packet, "H04.CP00-167.master_data_permission_audit_control_interactions", "cp167 hermes.evidence_packet");
requireEqual(cp167Claude.review_packet, "C04.CP00-167.master_data_permission_audit_control_interactions", "cp167 claude.review_packet");
requireEqual(cp167Claude.read_only, true, "cp167 claude.read_only");
requireEqual(cp167Handoff.to_pack_id, "CP00-168", "cp167 handoff.to_pack_id");
requireEqual(cp167Handoff.next_subphase_id, "RP04.P06.M05.S18", "cp167 handoff.next_subphase_id");

const cp168Coverage = validateMasterDataCp168Coverage(cp168PlanPack);
requireTrue(cp168Coverage.valid, "cp168 coverage.valid");
requireEqual(cp168Coverage.summary.unit_count, 10, "cp168 coverage unit_count");
requireEqual(cp168Coverage.summary.by_deliverable.security_audit, 2, "cp168 security_audit distribution");
requireEqual(cp168Coverage.summary.by_deliverable.test, 4, "cp168 test distribution");
requireEqual(cp168Coverage.summary.by_deliverable.implementation, 4, "cp168 implementation distribution");
requireEqual(cp168Coverage.summary.by_micro_phase["RP04.P06.M05"], 5, "cp168 RP04.P06.M05 distribution");
requireEqual(cp168Coverage.summary.by_micro_phase["RP04.P06.M06"], 5, "cp168 RP04.P06.M06 distribution");

const cp168FixtureTests = validateMasterDataCp168PermissionAuditFixtureDecisionTests(contract);
requireTrue(cp168FixtureTests.valid, "cp168 permission_audit_fixture_decision_tests.valid");
const cp168CrossTenant = createMasterDataPermissionAuditFixtureDecisionTestDescriptor({
  test_key: "cross_tenant_test",
});
requireEqual(cp168CrossTenant.pack_id, "CP00-168", "cp168 cross tenant pack");
requireEqual(cp168CrossTenant.control_interaction.pack_id, "CP00-167", "cp168 source control interaction pack");
requireEqual(cp168CrossTenant.customer_facing_test_outcome.expected_outcome, "denied", "cp168 cross tenant outcome");
requireEqual(cp168CrossTenant.customer_surface_excludes_internal_refs, true, "cp168 customer surface excludes internal refs");
requireEqual(cp168CrossTenant.internal_fixture_evidence.exposes_customer_surface, false, "cp168 internal refs evidence only");
requireEqual(cp168CrossTenant.internal_fixture_evidence.exposes_raw_rule, false, "cp168 raw rule exposure");
requireEqual(cp168CrossTenant.internal_fixture_evidence.exposes_foreign_tenant_id, false, "cp168 foreign tenant exposure");
requireEqual(cp168CrossTenant.internal_fixture_evidence.exposes_hidden_source_values, false, "cp168 hidden source exposure");
requireEqual(cp168CrossTenant.evaluates_runtime_permission, false, "cp168 runtime permission");
requireEqual(cp168CrossTenant.appends_audit_event, false, "cp168 audit append");
requireEqual(cp168CrossTenant.prohibited_output_absent, true, "cp168 prohibited output absent");
const cp168Catalog = createMasterDataPermissionAuditFixtureDecisionTestsCatalog();
requireEqual(cp168Catalog.test_rows.length, 10, "cp168 test rows");
requireTrue(cp168Catalog.all_fixture_tests_declared, "cp168 all fixture tests declared");
requireTrue(cp168Catalog.all_decision_bindings_declared, "cp168 all decision bindings declared");
requireTrue(cp168Catalog.all_no_write, "cp168 all_no_write");
requireTrue(cp168Catalog.all_customer_surfaces_trimmed, "cp168 customer surfaces trimmed");
requireTrue(cp168Catalog.all_internal_refs_evidence_only, "cp168 internal refs evidence only");
requireTrue(cp168Catalog.permission_fixture_covered, "cp168 permission fixture covered");
requireTrue(cp168Catalog.allowed_test_covered, "cp168 allowed test covered");
requireTrue(cp168Catalog.denied_test_covered, "cp168 denied test covered");
requireTrue(cp168Catalog.cross_tenant_test_covered, "cp168 cross tenant test covered");
requireTrue(cp168Catalog.leak_prevention_test_covered, "cp168 leak prevention test covered");
requireTrue(cp168Catalog.permission_matrix_row_covered, "cp168 permission matrix row covered");
requireTrue(cp168Catalog.view_decision_binding_covered, "cp168 view decision binding covered");
requireTrue(cp168Catalog.search_decision_binding_covered, "cp168 search decision binding covered");
requireTrue(cp168Catalog.mutation_decision_binding_covered, "cp168 mutation decision binding covered");
requireTrue(cp168Catalog.export_download_decision_binding_covered, "cp168 export download decision binding covered");
requireTrue(cp168Catalog.prohibited_output_absent, "cp168 prohibited output absent");

const cp168Hermes = createMasterDataCp168HermesEvidencePacket(cp168PlanPack);
const cp168Claude = createMasterDataCp168ClaudeReviewPacket(cp168PlanPack);
const cp168Handoff = createMasterDataCp168CloseoutHandoff();
requireEqual(cp168Hermes.evidence_packet, "H04.CP00-168.master_data_permission_audit_fixture_decision_tests", "cp168 hermes.evidence_packet");
requireEqual(cp168Claude.review_packet, "C04.CP00-168.master_data_permission_audit_fixture_decision_tests", "cp168 claude.review_packet");
requireEqual(cp168Claude.read_only, true, "cp168 claude.read_only");
requireEqual(cp168Handoff.to_pack_id, "CP00-169", "cp168 handoff.to_pack_id");
requireEqual(cp168Handoff.next_subphase_id, "RP04.P06.M06.S06", "cp168 handoff.next_subphase_id");

const cp169Coverage = validateMasterDataCp169Coverage(cp169PlanPack);
requireTrue(cp169Coverage.valid, "cp169 coverage.valid");
requireEqual(cp169Coverage.summary.unit_count, 150, "cp169 coverage unit_count");
requireEqual(cp169Coverage.summary.by_deliverable.implementation, 38, "cp169 implementation distribution");
requireEqual(cp169Coverage.summary.by_deliverable.security_audit, 27, "cp169 security_audit distribution");
requireEqual(cp169Coverage.summary.by_deliverable.ui, 17, "cp169 ui distribution");
requireEqual(cp169Coverage.summary.by_deliverable.claude_review, 4, "cp169 claude_review distribution");
requireEqual(cp169Coverage.summary.by_deliverable.test, 14, "cp169 test distribution");
requireEqual(cp169Coverage.summary.by_deliverable.failure_recovery, 44, "cp169 failure_recovery distribution");
requireEqual(cp169Coverage.summary.by_deliverable.hermes_evidence, 4, "cp169 hermes_evidence distribution");
requireEqual(cp169Coverage.summary.by_deliverable.fixture, 2, "cp169 fixture distribution");

const cp169Taxonomy = validateMasterDataCp169PermissionAuditWorkflowFailureTaxonomy(contract);
requireTrue(cp169Taxonomy.valid, "cp169 permission_audit_workflow_failure_taxonomy.valid");
const cp169Share = createMasterDataPermissionAuditWorkflowFailureTaxonomyDescriptor({
  descriptor_key: "share_decision_binding",
});
requireEqual(cp169Share.pack_id, "CP00-169", "cp169 share pack");
requireEqual(cp169Share.source_fixture_test.pack_id, "CP00-168", "cp169 source fixture test pack");
requireEqual(cp169Share.customer_facing_failure_summary.outcome_descriptor, "approval_required", "cp169 share outcome");
requireEqual(cp169Share.continuation_descriptor.dispatches_approval_route, false, "cp169 share approval dispatch");
requireEqual(cp169Share.customer_surface_excludes_internal_refs, true, "cp169 share customer surface excludes internal refs");
requireEqual(cp169Share.prohibited_output_absent, true, "cp169 share prohibited output absent");
const cp169CrossTenant = createMasterDataPermissionAuditWorkflowFailureTaxonomyDescriptor({
  descriptor_key: "cross_tenant_failure",
});
requireEqual(cp169CrossTenant.customer_facing_failure_summary.safe_error_code, "MASTER_DATA_TENANT_MISMATCH", "cp169 cross tenant safe code");
requireEqual(cp169CrossTenant.failure_descriptor.exposes_foreign_tenant_id, false, "cp169 foreign tenant exposure");
requireEqual(cp169CrossTenant.internal_failure_evidence.exposes_customer_surface, false, "cp169 internal refs evidence only");
requireEqual(cp169CrossTenant.internal_failure_evidence.exposes_foreign_tenant_id, false, "cp169 internal foreign tenant exposure");
const cp169Catalog = createMasterDataPermissionAuditWorkflowFailureTaxonomyCatalog();
requireTrue(cp169Catalog.all_continuation_descriptors_declared, "cp169 continuation descriptors declared");
requireTrue(cp169Catalog.all_failure_taxonomy_descriptors_declared, "cp169 failure descriptors declared");
requireTrue(cp169Catalog.all_no_write, "cp169 all_no_write");
requireTrue(cp169Catalog.all_customer_surfaces_trimmed, "cp169 customer surfaces trimmed");
requireTrue(cp169Catalog.all_internal_refs_evidence_only, "cp169 internal refs evidence only");
requireTrue(cp169Catalog.share_decision_binding_covered, "cp169 share binding covered");
requireTrue(cp169Catalog.ai_retrieval_decision_binding_covered, "cp169 AI retrieval binding covered");
requireTrue(cp169Catalog.missing_tenant_failure_covered, "cp169 missing tenant covered");
requireTrue(cp169Catalog.missing_actor_failure_covered, "cp169 missing actor covered");
requireTrue(cp169Catalog.missing_matter_failure_covered, "cp169 missing matter covered");
requireTrue(cp169Catalog.cross_tenant_failure_covered, "cp169 cross tenant covered");
requireTrue(cp169Catalog.permission_denied_failure_covered, "cp169 permission denied covered");
requireTrue(cp169Catalog.ambiguous_rule_failure_covered, "cp169 ambiguous rule covered");
requireTrue(cp169Catalog.stale_reference_failure_covered, "cp169 stale reference covered");
requireTrue(cp169Catalog.lock_conflict_failure_covered, "cp169 lock conflict covered");
requireTrue(cp169Catalog.retry_and_rollback_descriptor_only, "cp169 retry rollback descriptor-only");
requireTrue(cp169Catalog.blocked_claim_receipt_covered, "cp169 blocked claim receipt covered");
requireTrue(cp169Catalog.failure_fixture_covered, "cp169 failure fixture covered");
requireTrue(cp169Catalog.failure_tests_covered, "cp169 failure tests covered");
requireTrue(cp169Catalog.hermes_and_claude_packets_descriptor_only, "cp169 Hermes Claude descriptor-only");
requireTrue(cp169Catalog.prohibited_output_absent, "cp169 prohibited output absent");

const cp169Hermes = createMasterDataCp169HermesEvidencePacket(cp169PlanPack);
const cp169Claude = createMasterDataCp169ClaudeReviewPacket(cp169PlanPack);
const cp169Handoff = createMasterDataCp169CloseoutHandoff();
requireEqual(cp169Hermes.evidence_packet, "H04.CP00-169.master_data_permission_audit_workflow_failure_taxonomy", "cp169 hermes.evidence_packet");
requireEqual(cp169Hermes.coverage_valid, true, "cp169 hermes coverage_valid");
requireEqual(cp169Hermes.permission_audit_workflow_failure_taxonomy_valid, true, "cp169 hermes taxonomy valid");
requireEqual(cp169Claude.review_packet, "C04.CP00-169.master_data_permission_audit_workflow_failure_taxonomy", "cp169 claude.review_packet");
requireEqual(cp169Claude.read_only, true, "cp169 claude.read_only");
requireEqual(cp169Handoff.to_pack_id, "CP00-170", "cp169 handoff.to_pack_id");
requireEqual(cp169Handoff.next_subphase_id, "RP04.P07.M03.S21", "cp169 handoff.next_subphase_id");

const cp170Coverage = validateMasterDataCp170Coverage(cp170PlanPack);
requireTrue(cp170Coverage.valid, "cp170 coverage.valid");
requireEqual(cp170Coverage.summary.unit_count, 40, "cp170 coverage unit_count");
requireEqual(cp170Coverage.summary.by_deliverable.claude_review, 1, "cp170 claude_review distribution");
requireEqual(cp170Coverage.summary.by_deliverable.implementation, 3, "cp170 implementation distribution");
requireEqual(cp170Coverage.summary.by_deliverable.failure_recovery, 24, "cp170 failure_recovery distribution");
requireEqual(cp170Coverage.summary.by_deliverable.security_audit, 3, "cp170 security_audit distribution");
requireEqual(cp170Coverage.summary.by_deliverable.hermes_evidence, 3, "cp170 hermes_evidence distribution");
requireEqual(cp170Coverage.summary.by_deliverable.fixture, 2, "cp170 fixture distribution");
requireEqual(cp170Coverage.summary.by_deliverable.test, 4, "cp170 test distribution");

const cp170EdgeCase = validateMasterDataCp170FailureTaxonomyEdgeCaseEscalation(contract);
requireTrue(cp170EdgeCase.valid, "cp170 failure_taxonomy_edge_case_escalation.valid");
const cp170ClaudePrompt = createMasterDataFailureTaxonomyEdgeCaseEscalationDescriptor({
  descriptor_key: "claude_edge_case_prompt",
});
requireEqual(cp170ClaudePrompt.pack_id, "CP00-170", "cp170 Claude edge-case prompt pack");
requireEqual(cp170ClaudePrompt.edge_case_descriptor.read_only, true, "cp170 Claude edge-case prompt read-only");
requireEqual(cp170ClaudePrompt.edge_case_descriptor.sends_claude_prompt, false, "cp170 Claude prompt send guard");
requireEqual(cp170ClaudePrompt.customer_surface_excludes_internal_refs, true, "cp170 Claude prompt customer surface excludes internal refs");
const cp170HumanNote = createMasterDataFailureTaxonomyEdgeCaseEscalationDescriptor({
  descriptor_key: "human_escalation_note",
});
requireEqual(cp170HumanNote.edge_case_descriptor.dispatches_review_route, false, "cp170 human note review dispatch");
requireEqual(cp170HumanNote.edge_case_descriptor.writes_case_note, false, "cp170 human note write guard");
requireEqual(cp170HumanNote.internal_edge_case_evidence.exposes_internal_note, false, "cp170 human note internal exposure guard");
const cp170CrossTenant = createMasterDataFailureTaxonomyEdgeCaseEscalationDescriptor({
  descriptor_key: "cross_tenant_failure",
});
requireEqual(cp170CrossTenant.source_failure_taxonomy_descriptor.pack_id, "CP00-169", "cp170 cross tenant source taxonomy pack");
requireEqual(cp170CrossTenant.customer_facing_edge_case_summary.safe_error_code, "MASTER_DATA_TENANT_MISMATCH", "cp170 cross tenant safe code");
requireEqual(cp170CrossTenant.failure_recovery_binding.exposes_foreign_tenant_id, false, "cp170 cross tenant foreign tenant exposure");
requireEqual(cp170CrossTenant.internal_edge_case_evidence.exposes_foreign_tenant_id, false, "cp170 internal foreign tenant exposure");
const cp170Catalog = createMasterDataFailureTaxonomyEdgeCaseEscalationCatalog();
requireTrue(cp170Catalog.all_edge_case_descriptors_declared, "cp170 edge-case descriptors declared");
requireTrue(cp170Catalog.all_failure_recovery_bindings_declared, "cp170 failure recovery bindings declared");
requireTrue(cp170Catalog.all_no_write, "cp170 all_no_write");
requireTrue(cp170Catalog.all_customer_surfaces_trimmed, "cp170 customer surfaces trimmed");
requireTrue(cp170Catalog.all_internal_refs_evidence_only, "cp170 internal refs evidence only");
requireTrue(cp170Catalog.claude_edge_case_prompt_descriptor_only, "cp170 Claude prompt descriptor-only");
requireTrue(cp170Catalog.human_escalation_note_descriptor_only, "cp170 human escalation descriptor-only");
requireTrue(cp170Catalog.cross_tenant_failure_trimmed, "cp170 cross tenant trimmed");
requireTrue(cp170Catalog.permission_denied_failure_trimmed, "cp170 permission denied trimmed");
requireTrue(cp170Catalog.ambiguous_rule_failure_trimmed, "cp170 ambiguous rule trimmed");
requireTrue(cp170Catalog.stale_reference_failure_trimmed, "cp170 stale reference trimmed");
requireTrue(cp170Catalog.lock_retry_rollback_descriptor_only, "cp170 lock retry rollback descriptor-only");
requireTrue(cp170Catalog.blocked_claim_receipt_descriptor_only, "cp170 blocked claim receipt descriptor-only");
requireTrue(cp170Catalog.audit_and_hermes_descriptors_only, "cp170 audit Hermes descriptor-only");
requireTrue(cp170Catalog.prohibited_output_absent, "cp170 prohibited output absent");

const cp170Hermes = createMasterDataCp170HermesEvidencePacket(cp170PlanPack);
const cp170Claude = createMasterDataCp170ClaudeReviewPacket(cp170PlanPack);
const cp170Handoff = createMasterDataCp170CloseoutHandoff();
requireEqual(cp170Hermes.evidence_packet, "H04.CP00-170.master_data_failure_taxonomy_edge_case_escalation", "cp170 hermes.evidence_packet");
requireEqual(cp170Hermes.coverage_valid, true, "cp170 hermes coverage_valid");
requireEqual(cp170Hermes.failure_taxonomy_edge_case_escalation_valid, true, "cp170 hermes edge-case valid");
requireEqual(cp170Claude.review_packet, "C04.CP00-170.master_data_failure_taxonomy_edge_case_escalation", "cp170 claude.review_packet");
requireEqual(cp170Claude.read_only, true, "cp170 claude.read_only");
requireEqual(cp170Handoff.to_pack_id, "CP00-171", "cp170 handoff.to_pack_id");
requireEqual(cp170Handoff.next_subphase_id, "RP04.P07.M05.S19", "cp170 handoff.next_subphase_id");

const cp171Coverage = validateMasterDataCp171Coverage(cp171PlanPack);
requireTrue(cp171Coverage.valid, "cp171 coverage.valid");
requireEqual(cp171Coverage.summary.unit_count, 10, "cp171 coverage unit_count");
requireEqual(cp171Coverage.summary.by_deliverable.security_audit, 1, "cp171 security_audit distribution");
requireEqual(cp171Coverage.summary.by_deliverable.hermes_evidence, 1, "cp171 hermes_evidence distribution");
requireEqual(cp171Coverage.summary.by_deliverable.claude_review, 1, "cp171 claude_review distribution");
requireEqual(cp171Coverage.summary.by_deliverable.implementation, 1, "cp171 implementation distribution");
requireEqual(cp171Coverage.summary.by_deliverable.failure_recovery, 6, "cp171 failure_recovery distribution");
requireEqual(cp171Coverage.summary.by_micro_phase["RP04.P07.M05"], 4, "cp171 M05 unit distribution");
requireEqual(cp171Coverage.summary.by_micro_phase["RP04.P07.M06"], 6, "cp171 M06 unit distribution");

const cp171SensitiveEntry = validateMasterDataCp171FailureTaxonomySensitiveEntryBoundary(contract);
requireTrue(cp171SensitiveEntry.valid, "cp171 failure_taxonomy_sensitive_entry_boundary.valid");
requireEqual(
  cp171SensitiveEntry.failure_taxonomy_sensitive_entry_boundary.catalog_id,
  MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.catalog_id,
  "cp171 sensitive entry catalog id",
);
requireEqual(
  cp171SensitiveEntry.failure_taxonomy_sensitive_entry_boundary.source_edge_case_escalation_catalog_id,
  MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.catalog_id,
  "cp171 source edge-case catalog id",
);
requireEqual(
  cp171SensitiveEntry.failure_taxonomy_sensitive_entry_boundary.source_failure_taxonomy_catalog_id,
  MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.catalog_id,
  "cp171 source failure taxonomy catalog id",
);
const cp171ClaudePrompt = createMasterDataFailureTaxonomySensitiveEntryBoundaryDescriptor({
  descriptor_key: "claude_edge_case_prompt",
});
requireEqual(cp171ClaudePrompt.pack_id, "CP00-171", "cp171 Claude sensitive prompt pack");
requireEqual(cp171ClaudePrompt.boundary_descriptor.read_only, true, "cp171 Claude sensitive prompt read-only");
requireEqual(cp171ClaudePrompt.boundary_descriptor.sends_claude_prompt, false, "cp171 Claude prompt send guard");
requireEqual(cp171ClaudePrompt.executes_claude_review, false, "cp171 Claude review execution guard");
requireEqual(
  cp171ClaudePrompt.customer_surface_excludes_internal_refs,
  true,
  "cp171 Claude prompt customer surface excludes internal refs",
);
const cp171HumanNote = createMasterDataFailureTaxonomySensitiveEntryBoundaryDescriptor({
  descriptor_key: "human_escalation_note",
});
requireEqual(cp171HumanNote.boundary_descriptor.dispatches_review_route, false, "cp171 human note review dispatch");
requireEqual(cp171HumanNote.boundary_descriptor.dispatches_approval_route, false, "cp171 human note approval dispatch");
requireEqual(cp171HumanNote.boundary_descriptor.writes_case_note, false, "cp171 human note write guard");
requireEqual(cp171HumanNote.internal_sensitive_evidence.exposes_internal_note, false, "cp171 human note internal exposure guard");
const cp171MatterFailure = createMasterDataFailureTaxonomySensitiveEntryBoundaryDescriptor({
  descriptor_key: "missing_matter_failure",
});
requireEqual(
  cp171MatterFailure.customer_facing_sensitive_summary.safe_error_code,
  "MASTER_DATA_MATTER_TRACE_REQUIRED",
  "cp171 missing matter safe code",
);
requireEqual(cp171MatterFailure.entry_failure_binding.exposes_matter_payload, false, "cp171 missing matter payload exposure");
requireEqual(cp171MatterFailure.internal_sensitive_evidence.exposes_matter_payload, false, "cp171 internal matter exposure");
const cp171ResourceFailure = createMasterDataFailureTaxonomySensitiveEntryBoundaryDescriptor({
  descriptor_key: "missing_resource_failure",
});
requireEqual(
  cp171ResourceFailure.customer_facing_sensitive_summary.safe_error_code,
  "MASTER_DATA_RESOURCE_REQUIRED",
  "cp171 missing resource safe code",
);
requireEqual(cp171ResourceFailure.entry_failure_binding.exposes_resource_payload, false, "cp171 missing resource payload exposure");
requireEqual(cp171ResourceFailure.internal_sensitive_evidence.exposes_resource_payload, false, "cp171 internal resource exposure");
const cp171Catalog = createMasterDataFailureTaxonomySensitiveEntryBoundaryCatalog();
requireTrue(cp171Catalog.all_boundary_descriptors_declared, "cp171 boundary descriptors declared");
requireTrue(cp171Catalog.all_entry_failure_bindings_declared, "cp171 entry failure bindings declared");
requireTrue(cp171Catalog.all_no_write, "cp171 all_no_write");
requireTrue(cp171Catalog.all_customer_surfaces_trimmed, "cp171 customer surfaces trimmed");
requireTrue(cp171Catalog.all_internal_refs_evidence_only, "cp171 internal refs evidence only");
requireTrue(cp171Catalog.audit_failure_hint_descriptor_only, "cp171 audit hint descriptor-only");
requireTrue(cp171Catalog.hermes_failure_evidence_descriptor_only, "cp171 Hermes evidence descriptor-only");
requireTrue(cp171Catalog.claude_edge_case_prompt_descriptor_only, "cp171 Claude prompt descriptor-only");
requireTrue(cp171Catalog.human_escalation_note_descriptor_only, "cp171 human escalation descriptor-only");
requireTrue(cp171Catalog.missing_scope_failures_covered, "cp171 missing scope failures covered");
requireTrue(cp171Catalog.missing_matter_resource_payloads_trimmed, "cp171 matter resource payloads trimmed");
requireTrue(cp171Catalog.prohibited_output_absent, "cp171 prohibited output absent");

const cp171Hermes = createMasterDataCp171HermesEvidencePacket(cp171PlanPack);
const cp171Claude = createMasterDataCp171ClaudeReviewPacket(cp171PlanPack);
const cp171Handoff = createMasterDataCp171CloseoutHandoff();
requireEqual(
  cp171Hermes.evidence_packet,
  "H04.CP00-171.master_data_failure_taxonomy_sensitive_entry_boundary",
  "cp171 hermes.evidence_packet",
);
requireEqual(cp171Hermes.coverage_valid, true, "cp171 hermes coverage_valid");
requireEqual(cp171Hermes.failure_taxonomy_sensitive_entry_boundary_valid, true, "cp171 hermes sensitive entry valid");
requireEqual(
  cp171Claude.review_packet,
  "C04.CP00-171.master_data_failure_taxonomy_sensitive_entry_boundary",
  "cp171 claude.review_packet",
);
requireEqual(cp171Claude.read_only, true, "cp171 claude.read_only");
requireEqual(cp171Handoff.to_pack_id, "CP00-172", "cp171 handoff.to_pack_id");
requireEqual(cp171Handoff.next_subphase_id, "RP04.P07.M06.S07", "cp171 handoff.next_subphase_id");

const cp172Coverage = validateMasterDataCp172Coverage(cp172PlanPack);
requireTrue(cp172Coverage.valid, "cp172 coverage.valid");
requireEqual(cp172Coverage.summary.unit_count, 10, "cp172 coverage unit_count");
requireEqual(cp172Coverage.summary.by_deliverable.failure_recovery, 6, "cp172 failure_recovery distribution");
requireEqual(cp172Coverage.summary.by_deliverable.security_audit, 1, "cp172 security_audit distribution");
requireEqual(cp172Coverage.summary.by_deliverable.implementation, 1, "cp172 implementation distribution");
requireEqual(cp172Coverage.summary.by_deliverable.hermes_evidence, 1, "cp172 hermes_evidence distribution");
requireEqual(cp172Coverage.summary.by_deliverable.fixture, 1, "cp172 fixture distribution");
requireEqual(cp172Coverage.summary.by_micro_phase["RP04.P07.M06"], 10, "cp172 M06 unit distribution");

const cp172OperationalEdge = validateMasterDataCp172FailureTaxonomyOperationalEdgeBoundary(contract);
requireTrue(cp172OperationalEdge.valid, "cp172 failure_taxonomy_operational_edge_boundary.valid");
requireEqual(
  cp172OperationalEdge.failure_taxonomy_operational_edge_boundary.catalog_id,
  MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.catalog_id,
  "cp172 operational edge catalog id",
);
requireEqual(
  cp172OperationalEdge.failure_taxonomy_operational_edge_boundary.source_sensitive_entry_boundary_catalog_id,
  MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.catalog_id,
  "cp172 source sensitive entry catalog id",
);
const cp172CrossTenant = createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({
  descriptor_key: "cross_tenant_failure",
});
requireEqual(cp172CrossTenant.pack_id, "CP00-172", "cp172 cross tenant pack");
requireEqual(
  cp172CrossTenant.customer_facing_operational_summary.safe_error_code,
  "MASTER_DATA_TENANT_MISMATCH",
  "cp172 cross tenant safe code",
);
requireEqual(cp172CrossTenant.operational_binding.exposes_foreign_tenant_id, false, "cp172 cross tenant foreign tenant exposure");
requireEqual(cp172CrossTenant.internal_operational_evidence.exposes_foreign_tenant_id, false, "cp172 internal foreign tenant exposure");
requireEqual(cp172CrossTenant.customer_surface_excludes_internal_refs, true, "cp172 customer surface excludes internal refs");
const cp172PermissionDenied = createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({
  descriptor_key: "permission_denied_failure",
});
requireEqual(
  cp172PermissionDenied.operational_binding.exposes_permission_rule,
  false,
  "cp172 permission denied rule exposure",
);
requireEqual(
  cp172PermissionDenied.operational_binding.exposes_denied_item_payload,
  false,
  "cp172 denied item payload exposure",
);
const cp172Retry = createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({
  descriptor_key: "retry_exhaustion_failure",
});
requireEqual(cp172Retry.operational_binding.executes_retry, false, "cp172 retry execution guard");
requireEqual(cp172Retry.internal_operational_evidence.exposes_retry_backoff, false, "cp172 retry backoff exposure");
const cp172Rollback = createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({
  descriptor_key: "rollback_expectation",
});
requireEqual(cp172Rollback.operational_binding.executes_rollback, false, "cp172 rollback execution guard");
requireEqual(cp172Rollback.internal_operational_evidence.writes_product_state, false, "cp172 rollback product write guard");
const cp172BlockedClaim = createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({
  descriptor_key: "blocked_claim_receipt",
});
requireEqual(cp172BlockedClaim.operational_binding.emits_hermes_evidence, false, "cp172 blocked claim Hermes emit guard");
requireEqual(cp172BlockedClaim.operational_binding.executes_hermes_command, false, "cp172 blocked claim Hermes command guard");
requireEqual(cp172BlockedClaim.internal_operational_evidence.exposes_blocked_claim, false, "cp172 blocked claim exposure guard");
const cp172Fixture = createMasterDataFailureTaxonomyOperationalEdgeBoundaryDescriptor({
  descriptor_key: "failure_fixture",
});
requireEqual(cp172Fixture.operational_binding.synthetic_fixture_only, true, "cp172 failure fixture synthetic only");
requireEqual(cp172Fixture.operational_binding.loads_real_client_data, false, "cp172 failure fixture no real data");
requireEqual(cp172Fixture.internal_operational_evidence.exposes_fixture_payload, false, "cp172 failure fixture payload exposure");
const cp172Catalog = createMasterDataFailureTaxonomyOperationalEdgeBoundaryCatalog();
requireTrue(cp172Catalog.all_operational_bindings_declared, "cp172 operational bindings declared");
requireTrue(cp172Catalog.all_no_write, "cp172 all_no_write");
requireTrue(cp172Catalog.all_customer_surfaces_trimmed, "cp172 customer surfaces trimmed");
requireTrue(cp172Catalog.all_internal_refs_evidence_only, "cp172 internal refs evidence only");
requireTrue(cp172Catalog.cross_tenant_failure_trimmed, "cp172 cross tenant trimmed");
requireTrue(cp172Catalog.permission_denied_failure_trimmed, "cp172 permission denied trimmed");
requireTrue(cp172Catalog.ambiguous_rule_failure_trimmed, "cp172 ambiguous rule trimmed");
requireTrue(cp172Catalog.stale_reference_failure_trimmed, "cp172 stale reference trimmed");
requireTrue(cp172Catalog.lock_retry_rollback_descriptor_only, "cp172 lock retry rollback descriptor-only");
requireTrue(cp172Catalog.compensation_descriptor_only, "cp172 compensation descriptor-only");
requireTrue(cp172Catalog.blocked_claim_receipt_descriptor_only, "cp172 blocked claim receipt descriptor-only");
requireTrue(cp172Catalog.failure_fixture_synthetic_only, "cp172 failure fixture synthetic only");
requireTrue(cp172Catalog.prohibited_output_absent, "cp172 prohibited output absent");

const cp172Hermes = createMasterDataCp172HermesEvidencePacket(cp172PlanPack);
const cp172Claude = createMasterDataCp172ClaudeReviewPacket(cp172PlanPack);
const cp172Handoff = createMasterDataCp172CloseoutHandoff();
requireEqual(
  cp172Hermes.evidence_packet,
  "H04.CP00-172.master_data_failure_taxonomy_operational_edge_boundary",
  "cp172 hermes.evidence_packet",
);
requireEqual(cp172Hermes.coverage_valid, true, "cp172 hermes coverage_valid");
requireEqual(cp172Hermes.failure_taxonomy_operational_edge_boundary_valid, true, "cp172 hermes operational edge valid");
requireEqual(
  cp172Claude.review_packet,
  "C04.CP00-172.master_data_failure_taxonomy_operational_edge_boundary",
  "cp172 claude.review_packet",
);
requireEqual(cp172Claude.read_only, true, "cp172 claude.read_only");
requireEqual(cp172Handoff.to_pack_id, "CP00-173", "cp172 handoff.to_pack_id");
requireEqual(cp172Handoff.next_subphase_id, "RP04.P07.M06.S17", "cp172 handoff.next_subphase_id");

const cp173Coverage = validateMasterDataCp173Coverage(cp173PlanPack);
requireTrue(cp173Coverage.valid, "cp173 coverage.valid");
requireEqual(cp173Coverage.summary.unit_count, 150, "cp173 coverage unit_count");
requireEqual(cp173Coverage.summary.by_deliverable.test, 10, "cp173 test distribution");
requireEqual(cp173Coverage.summary.by_deliverable.security_audit, 8, "cp173 security_audit distribution");
requireEqual(cp173Coverage.summary.by_deliverable.hermes_evidence, 56, "cp173 hermes_evidence distribution");
requireEqual(cp173Coverage.summary.by_deliverable.failure_recovery, 46, "cp173 failure_recovery distribution");
requireEqual(cp173Coverage.summary.by_deliverable.implementation, 23, "cp173 implementation distribution");
requireEqual(cp173Coverage.summary.by_deliverable.fixture, 3, "cp173 fixture distribution");
requireEqual(cp173Coverage.summary.by_deliverable.claude_review, 4, "cp173 claude_review distribution");
requireEqual(cp173Coverage.summary.by_phase["RP04.P07"], 77, "cp173 RP04.P07 unit distribution");
requireEqual(cp173Coverage.summary.by_phase["RP04.P08"], 73, "cp173 RP04.P08 unit distribution");
requireEqual(cp173Coverage.summary.by_micro_phase["RP04.P08.M05"], 13, "cp173 RP04.P08.M05 unit distribution");

const cp173Bridge = validateMasterDataCp173FailureEvidenceReviewHandoffBridge(contract);
requireTrue(cp173Bridge.valid, "cp173 failure_evidence_review_handoff_bridge.valid");
requireEqual(
  cp173Bridge.failure_evidence_review_handoff_bridge.catalog_id,
  MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.catalog_id,
  "cp173 bridge catalog id",
);
requireEqual(
  cp173Bridge.failure_evidence_review_handoff_bridge.source_operational_edge_boundary_catalog_id,
  MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.catalog_id,
  "cp173 source operational edge boundary catalog id",
);
const cp173HermesSection = createMasterDataFailureEvidenceReviewHandoffBridgeDescriptor({
  section_key: "hermes_evidence_packet",
});
requireEqual(cp173HermesSection.pack_id, "CP00-173", "cp173 Hermes section pack");
requireEqual(cp173HermesSection.bridge_section.emits_hermes_evidence, false, "cp173 Hermes section emit guard");
requireEqual(cp173HermesSection.bridge_section.executes_hermes_command, false, "cp173 Hermes section command guard");
requireEqual(cp173HermesSection.customer_surface_excludes_internal_refs, true, "cp173 Hermes customer surface excludes internal refs");
const cp173ClaudeSection = createMasterDataFailureEvidenceReviewHandoffBridgeDescriptor({
  section_key: "claude_review_packet",
});
requireEqual(cp173ClaudeSection.bridge_section.read_only, true, "cp173 Claude section read-only");
requireEqual(cp173ClaudeSection.bridge_section.sends_claude_prompt, false, "cp173 Claude section send guard");
requireEqual(cp173ClaudeSection.bridge_section.executes_claude_review, false, "cp173 Claude section execution guard");
const cp173PermissionAuditEntry = createMasterDataFailureEvidenceReviewHandoffBridgeDescriptor({
  section_key: "rp08_permission_audit_entry_boundary",
});
requireEqual(cp173PermissionAuditEntry.bridge_section.next_sensitive_pack_id, "CP00-174", "cp173 permission audit next sensitive pack");
requireEqual(cp173PermissionAuditEntry.bridge_section.evaluates_runtime_permission, false, "cp173 permission audit runtime permission guard");
requireEqual(cp173PermissionAuditEntry.bridge_section.appends_audit_event, false, "cp173 permission audit append guard");
const cp173Catalog = createMasterDataFailureEvidenceReviewHandoffBridgeCatalog();
requireTrue(cp173Catalog.all_bridge_sections_declared, "cp173 bridge sections declared");
requireTrue(cp173Catalog.all_no_write, "cp173 all_no_write");
requireTrue(cp173Catalog.all_customer_surfaces_trimmed, "cp173 customer surfaces trimmed");
requireTrue(cp173Catalog.all_internal_refs_evidence_only, "cp173 internal refs evidence only");
requireTrue(cp173Catalog.hermes_packet_descriptor_only, "cp173 Hermes packet descriptor-only");
requireTrue(cp173Catalog.claude_packet_descriptor_only, "cp173 Claude packet descriptor-only");
requireTrue(cp173Catalog.permission_audit_entry_deferred_to_cp174, "cp173 permission audit entry deferred");
requireTrue(cp173Catalog.rp08_workflow_receipts_descriptor_only, "cp173 RP08 workflow receipts descriptor-only");
requireTrue(cp173Catalog.prohibited_output_absent, "cp173 prohibited output absent");

const cp173Hermes = createMasterDataCp173HermesEvidencePacket(cp173PlanPack);
const cp173Claude = createMasterDataCp173ClaudeReviewPacket(cp173PlanPack);
const cp173Handoff = createMasterDataCp173CloseoutHandoff();
requireEqual(
  cp173Hermes.evidence_packet,
  "H04.CP00-173.master_data_failure_evidence_review_handoff_bridge",
  "cp173 hermes.evidence_packet",
);
requireEqual(cp173Hermes.coverage_valid, true, "cp173 hermes coverage_valid");
requireEqual(cp173Hermes.failure_evidence_review_handoff_bridge_valid, true, "cp173 hermes bridge valid");
requireEqual(
  cp173Claude.review_packet,
  "C04.CP00-173.master_data_failure_evidence_review_handoff_bridge",
  "cp173 claude.review_packet",
);
requireEqual(cp173Claude.read_only, true, "cp173 claude.read_only");
requireEqual(cp173Handoff.to_pack_id, "CP00-174", "cp173 handoff.to_pack_id");
requireEqual(cp173Handoff.next_subphase_id, "RP04.P08.M05.S14", "cp173 handoff.next_subphase_id");

const cp174Coverage = validateMasterDataCp174Coverage(cp174PlanPack);
requireTrue(cp174Coverage.valid, "cp174 coverage.valid");
requireEqual(cp174Coverage.summary.unit_count, 10, "cp174 coverage unit_count");
requireEqual(cp174Coverage.summary.by_deliverable.implementation, 5, "cp174 implementation distribution");
requireEqual(cp174Coverage.summary.by_deliverable.hermes_evidence, 4, "cp174 hermes_evidence distribution");
requireEqual(cp174Coverage.summary.by_deliverable.test, 1, "cp174 test distribution");
requireEqual(cp174Coverage.summary.by_phase["RP04.P08"], 10, "cp174 RP04.P08 unit distribution");
requireEqual(cp174Coverage.summary.by_micro_phase["RP04.P08.M05"], 7, "cp174 RP04.P08.M05 unit distribution");
requireEqual(cp174Coverage.summary.by_micro_phase["RP04.P08.M06"], 3, "cp174 RP04.P08.M06 unit distribution");

const cp174Boundary = validateMasterDataCp174PermissionAuditSensitiveTailBoundary(contract);
requireTrue(cp174Boundary.valid, "cp174 permission_audit_sensitive_tail_boundary.valid");
requireEqual(
  cp174Boundary.permission_audit_sensitive_tail_boundary.catalog_id,
  MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.catalog_id,
  "cp174 boundary catalog id",
);
requireEqual(
  cp174Boundary.permission_audit_sensitive_tail_boundary.source_failure_evidence_review_handoff_bridge_catalog_id,
  MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.catalog_id,
  "cp174 source failure evidence bridge catalog id",
);
const cp174BlockSemantics = createMasterDataPermissionAuditSensitiveTailBoundaryDescriptor({
  section_key: "block_semantics",
});
requireEqual(cp174BlockSemantics.pack_id, "CP00-174", "cp174 block semantics section pack");
requireEqual(cp174BlockSemantics.boundary_section.verdict, "BLOCK", "cp174 block semantics verdict");
requireEqual(cp174BlockSemantics.boundary_section.evaluates_runtime_permission, false, "cp174 block semantics runtime permission guard");
requireEqual(cp174BlockSemantics.boundary_section.appends_audit_event, false, "cp174 block semantics audit append guard");
requireEqual(cp174BlockSemantics.customer_surface_excludes_internal_refs, true, "cp174 block semantics customer surface excludes refs");
const cp174EvidenceFieldList = createMasterDataPermissionAuditSensitiveTailBoundaryDescriptor({
  section_key: "evidence_field_list",
});
requireEqual(cp174EvidenceFieldList.boundary_section.exposes_internal_only_fields, false, "cp174 evidence field list internal guard");
requireEqual(cp174EvidenceFieldList.internal_boundary_evidence.exposes_runtime_permission_result, false, "cp174 runtime permission result guard");
const cp174Catalog = createMasterDataPermissionAuditSensitiveTailBoundaryCatalog();
requireTrue(cp174Catalog.all_boundary_sections_declared, "cp174 boundary sections declared");
requireTrue(cp174Catalog.all_no_write, "cp174 all_no_write");
requireTrue(cp174Catalog.all_customer_surfaces_trimmed, "cp174 customer surfaces trimmed");
requireTrue(cp174Catalog.all_internal_refs_evidence_only, "cp174 internal refs evidence only");
requireTrue(cp174Catalog.block_semantics_descriptor_only, "cp174 block semantics descriptor-only");
requireTrue(cp174Catalog.hermes_command_matrix_descriptor_only, "cp174 Hermes command matrix descriptor-only");
requireTrue(cp174Catalog.evidence_field_list_customer_safe, "cp174 evidence field list customer safe");
requireTrue(cp174Catalog.changed_file_receipt_summary_only, "cp174 changed file receipt summary only");
requireTrue(cp174Catalog.prohibited_output_absent, "cp174 prohibited output absent");

const cp174Hermes = createMasterDataCp174HermesEvidencePacket(cp174PlanPack);
const cp174Claude = createMasterDataCp174ClaudeReviewPacket(cp174PlanPack);
const cp174Handoff = createMasterDataCp174CloseoutHandoff();
requireEqual(
  cp174Hermes.evidence_packet,
  "H04.CP00-174.master_data_permission_audit_sensitive_tail_boundary",
  "cp174 hermes.evidence_packet",
);
requireEqual(cp174Hermes.coverage_valid, true, "cp174 hermes coverage_valid");
requireEqual(cp174Hermes.permission_audit_sensitive_tail_boundary_valid, true, "cp174 hermes boundary valid");
requireEqual(
  cp174Claude.review_packet,
  "C04.CP00-174.master_data_permission_audit_sensitive_tail_boundary",
  "cp174 claude.review_packet",
);
requireEqual(cp174Claude.read_only, true, "cp174 claude.read_only");
requireEqual(cp174Handoff.to_pack_id, "CP00-175", "cp174 handoff.to_pack_id");
requireEqual(cp174Handoff.next_subphase_id, "RP04.P08.M06.S04", "cp174 handoff.next_subphase_id");

const cp175Coverage = validateMasterDataCp175Coverage(cp175PlanPack);
requireTrue(cp175Coverage.valid, "cp175 coverage.valid");
requireEqual(cp175Coverage.summary.unit_count, 150, "cp175 coverage unit_count");
requireEqual(cp175Coverage.summary.by_deliverable.hermes_evidence, 39, "cp175 hermes_evidence distribution");
requireEqual(cp175Coverage.summary.by_deliverable.claude_review, 21, "cp175 claude_review distribution");
requireEqual(cp175Coverage.summary.by_deliverable.implementation, 59, "cp175 implementation distribution");
requireEqual(cp175Coverage.summary.by_deliverable.test, 9, "cp175 test distribution");
requireEqual(cp175Coverage.summary.by_deliverable.security_audit, 16, "cp175 security_audit distribution");
requireEqual(cp175Coverage.summary.by_deliverable.ui, 6, "cp175 ui distribution");
requireEqual(cp175Coverage.summary.by_phase["RP04.P08"], 69, "cp175 RP04.P08 unit distribution");
requireEqual(cp175Coverage.summary.by_phase["RP04.P09"], 81, "cp175 RP04.P09 unit distribution");
requireEqual(cp175Coverage.summary.section_unit_total, 150, "cp175 section unit total");

const cp175Bridge = validateMasterDataCp175EvidenceReviewUiReadinessBridge(contract);
requireTrue(cp175Bridge.valid, "cp175 evidence_review_ui_readiness_bridge.valid");
requireEqual(
  cp175Bridge.evidence_review_ui_readiness_bridge.catalog_id,
  MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.catalog_id,
  "cp175 bridge catalog id",
);
requireEqual(
  cp175Bridge.evidence_review_ui_readiness_bridge.source_permission_audit_sensitive_tail_boundary_catalog_id,
  MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.catalog_id,
  "cp175 source sensitive tail catalog id",
);
requireEqual(
  cp175Bridge.evidence_review_ui_readiness_bridge.source_failure_evidence_review_handoff_bridge_catalog_id,
  MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.catalog_id,
  "cp175 source failure evidence bridge catalog id",
);
const cp175HermesPacket = createMasterDataEvidenceReviewUiReadinessBridgeDescriptor({
  section_key: "rp08_hermes_evidence_packet",
});
requireEqual(cp175HermesPacket.pack_id, "CP00-175", "cp175 Hermes packet section pack");
requireEqual(cp175HermesPacket.bridge_section.executes_hermes_command, false, "cp175 Hermes command execution guard");
requireEqual(cp175HermesPacket.bridge_section.emits_hermes_evidence, false, "cp175 Hermes evidence emission guard");
requireEqual(cp175HermesPacket.customer_surface_excludes_internal_refs, true, "cp175 Hermes packet customer surface excludes refs");
const cp175ClaudePacket = createMasterDataEvidenceReviewUiReadinessBridgeDescriptor({
  section_key: "rp08_review_closeout_tail",
});
requireEqual(cp175ClaudePacket.bridge_section.sends_claude_prompt, false, "cp175 Claude prompt send guard");
requireEqual(cp175ClaudePacket.bridge_section.executes_claude_review, false, "cp175 Claude review execution guard");
const cp175UiLeakQuestions = createMasterDataEvidenceReviewUiReadinessBridgeDescriptor({
  section_key: "rp09_fixture_review_questions",
});
requireEqual(cp175UiLeakQuestions.bridge_section.includes_ui_leak_questions, true, "cp175 UI leak questions included");
requireEqual(cp175UiLeakQuestions.bridge_section.renders_ui, false, "cp175 UI render guard");
requireEqual(cp175UiLeakQuestions.bridge_section.exposes_ui_leak_payload, false, "cp175 UI leak payload guard");
const cp175Catalog = createMasterDataEvidenceReviewUiReadinessBridgeCatalog();
requireEqual(cp175Catalog.section_unit_total, 150, "cp175 catalog section unit total");
requireTrue(cp175Catalog.all_bridge_sections_declared, "cp175 bridge sections declared");
requireTrue(cp175Catalog.all_no_write, "cp175 all_no_write");
requireTrue(cp175Catalog.all_customer_surfaces_trimmed, "cp175 customer surfaces trimmed");
requireTrue(cp175Catalog.all_internal_refs_evidence_only, "cp175 internal refs evidence only");
requireTrue(cp175Catalog.hermes_packet_descriptor_only, "cp175 Hermes packet descriptor-only");
requireTrue(cp175Catalog.claude_packet_descriptor_only, "cp175 Claude packet descriptor-only");
requireTrue(cp175Catalog.permission_audit_binding_descriptor_only, "cp175 permission/audit binding descriptor-only");
requireTrue(cp175Catalog.ui_leak_questions_descriptor_only, "cp175 UI leak questions descriptor-only");
requireTrue(cp175Catalog.prohibited_output_absent, "cp175 prohibited output absent");

const cp175Hermes = createMasterDataCp175HermesEvidencePacket(cp175PlanPack);
const cp175Claude = createMasterDataCp175ClaudeReviewPacket(cp175PlanPack);
const cp175Handoff = createMasterDataCp175CloseoutHandoff();
requireEqual(
  cp175Hermes.evidence_packet,
  "H04.CP00-175.master_data_evidence_review_ui_readiness_bridge",
  "cp175 hermes.evidence_packet",
);
requireEqual(cp175Hermes.coverage_valid, true, "cp175 hermes coverage_valid");
requireEqual(cp175Hermes.evidence_review_ui_readiness_bridge_valid, true, "cp175 hermes bridge valid");
requireEqual(
  cp175Claude.review_packet,
  "C04.CP00-175.master_data_evidence_review_ui_readiness_bridge",
  "cp175 claude.review_packet",
);
requireEqual(cp175Claude.read_only, true, "cp175 claude.read_only");
requireEqual(cp175Handoff.to_pack_id, "CP00-176", "cp175 handoff.to_pack_id");
requireEqual(cp175Handoff.next_subphase_id, "RP04.P09.M07.S07", "cp175 handoff.next_subphase_id");

const cp176Coverage = validateMasterDataCp176Coverage(cp176PlanPack);
requireTrue(cp176Coverage.valid, "cp176 coverage.valid");
requireEqual(cp176Coverage.summary.unit_count, 34, "cp176 coverage unit_count");
requireEqual(cp176Coverage.summary.by_deliverable.implementation, 17, "cp176 implementation distribution");
requireEqual(cp176Coverage.summary.by_deliverable.claude_review, 7, "cp176 claude_review distribution");
requireEqual(cp176Coverage.summary.by_deliverable.security_audit, 6, "cp176 security_audit distribution");
requireEqual(cp176Coverage.summary.by_deliverable.test, 2, "cp176 test distribution");
requireEqual(cp176Coverage.summary.by_deliverable.ui, 2, "cp176 ui distribution");
requireEqual(cp176Coverage.summary.by_phase["RP04.P09"], 34, "cp176 RP04.P09 unit distribution");
requireEqual(cp176Coverage.summary.by_micro_phase["RP04.P09.M07"], 14, "cp176 RP04.P09.M07 unit distribution");
requireEqual(cp176Coverage.summary.by_micro_phase["RP04.P09.M08"], 8, "cp176 RP04.P09.M08 unit distribution");
requireEqual(cp176Coverage.summary.by_micro_phase["RP04.P09.M09"], 8, "cp176 RP04.P09.M09 unit distribution");
requireEqual(cp176Coverage.summary.by_micro_phase["RP04.P09.M10"], 4, "cp176 RP04.P09.M10 unit distribution");
requireEqual(cp176Coverage.summary.section_unit_total, 34, "cp176 section unit total");
requireEqual(cp176Coverage.summary.section_unit_ids.length, 34, "cp176 section unit ID count");
requireEqual(cp176Coverage.summary.section_unit_ids_match_plan, true, "cp176 section unit IDs match plan");
requireEqual(cp176Coverage.summary.section_unit_ids_missing_from_plan.length, 0, "cp176 section units missing from plan");
requireEqual(cp176Coverage.summary.plan_unit_ids_missing_from_sections.length, 0, "cp176 plan units missing from sections");

const cp176Readiness = validateMasterDataCp176TerminalReviewCloseoutReadiness(contract);
requireTrue(cp176Readiness.valid, "cp176 terminal_review_closeout_readiness.valid");
requireEqual(
  cp176Readiness.terminal_review_closeout_readiness.catalog_id,
  MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.catalog_id,
  "cp176 terminal readiness catalog id",
);
requireEqual(
  cp176Readiness.terminal_review_closeout_readiness.source_evidence_review_ui_readiness_bridge_catalog_id,
  MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.catalog_id,
  "cp176 source evidence review UI bridge catalog id",
);
const cp176TerminalTail = createMasterDataTerminalReviewCloseoutReadinessDescriptor({
  section_key: "rp09_test_golden_closeout_tail",
});
requireEqual(cp176TerminalTail.pack_id, "CP00-176", "cp176 terminal tail section pack");
requireEqual(cp176TerminalTail.terminal_section.sends_claude_prompt, false, "cp176 terminal tail Claude prompt guard");
requireEqual(cp176TerminalTail.terminal_section.writes_case_note, false, "cp176 terminal tail case note guard");
requireEqual(cp176TerminalTail.customer_surface_excludes_internal_refs, true, "cp176 terminal tail customer surface excludes refs");
const cp176HermesQuestions = createMasterDataTerminalReviewCloseoutReadinessDescriptor({
  section_key: "rp09_hermes_review_questions",
});
requireEqual(cp176HermesQuestions.terminal_section.executes_hermes_command, false, "cp176 Hermes command execution guard");
requireEqual(cp176HermesQuestions.terminal_section.emits_hermes_evidence, false, "cp176 Hermes evidence emission guard");
const cp176ClaudeQuestions = createMasterDataTerminalReviewCloseoutReadinessDescriptor({
  section_key: "rp09_claude_review_questions",
});
requireEqual(cp176ClaudeQuestions.terminal_section.sends_claude_prompt, false, "cp176 Claude prompt send guard");
requireEqual(cp176ClaudeQuestions.terminal_section.executes_claude_review, false, "cp176 Claude review execution guard");
const cp176HandoffQuestions = createMasterDataTerminalReviewCloseoutReadinessDescriptor({
  section_key: "rp09_closeout_handoff_questions",
});
requireEqual(cp176HandoffQuestions.terminal_section.to_pack_id, "CP00-177", "cp176 handoff next pack");
requireEqual(cp176HandoffQuestions.terminal_section.next_subphase_id, "RP05.P00.M00.S01", "cp176 handoff next subphase");
requireEqual(cp176HandoffQuestions.terminal_section.next_program_id, "RP05", "cp176 handoff next program");
const cp176Catalog = createMasterDataTerminalReviewCloseoutReadinessCatalog();
requireEqual(cp176Catalog.section_unit_total, 34, "cp176 catalog section unit total");
requireTrue(cp176Catalog.all_terminal_sections_declared, "cp176 terminal sections declared");
requireTrue(cp176Catalog.all_no_write, "cp176 all_no_write");
requireTrue(cp176Catalog.all_customer_surfaces_trimmed, "cp176 customer surfaces trimmed");
requireTrue(cp176Catalog.all_internal_refs_evidence_only, "cp176 internal refs evidence only");
requireTrue(cp176Catalog.terminal_closeout_descriptor_only, "cp176 terminal closeout descriptor-only");
requireTrue(cp176Catalog.hermes_terminal_questions_descriptor_only, "cp176 Hermes terminal questions descriptor-only");
requireTrue(cp176Catalog.claude_terminal_questions_descriptor_only, "cp176 Claude terminal questions descriptor-only");
requireTrue(cp176Catalog.rp05_handoff_descriptor_only, "cp176 RP05 handoff descriptor-only");
requireTrue(cp176Catalog.prohibited_output_absent, "cp176 prohibited output absent");

const cp176Hermes = createMasterDataCp176HermesEvidencePacket(cp176PlanPack);
const cp176Claude = createMasterDataCp176ClaudeReviewPacket(cp176PlanPack);
const cp176Handoff = createMasterDataCp176CloseoutHandoff();
requireEqual(
  cp176Hermes.evidence_packet,
  "H04.CP00-176.master_data_terminal_review_closeout_readiness",
  "cp176 hermes.evidence_packet",
);
requireEqual(cp176Hermes.coverage_valid, true, "cp176 hermes coverage_valid");
requireEqual(cp176Hermes.terminal_review_closeout_readiness_valid, true, "cp176 hermes readiness valid");
requireEqual(
  cp176Claude.review_packet,
  "C04.CP00-176.master_data_terminal_review_closeout_readiness",
  "cp176 claude.review_packet",
);
requireEqual(cp176Claude.read_only, true, "cp176 claude.read_only");
requireEqual(cp176Handoff.to_pack_id, "CP00-177", "cp176 handoff.to_pack_id");
requireEqual(cp176Handoff.next_subphase_id, "RP05.P00.M00.S01", "cp176 handoff.next_subphase_id");

if (errors.length > 0) {
  console.error("RP04 master data contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("RP04 master data contract validation passed.");
console.log(`current_pack: ${MASTER_DATA_CP176_PACK_BINDING.pack_id}`);
console.log(`covered_units: ${cp176Coverage.summary.unit_count}`);
console.log(`model_count: ${registry.model_count}`);
console.log(`next_pack: ${MASTER_DATA_CP176_PACK_BINDING.next_pack_id}`);
