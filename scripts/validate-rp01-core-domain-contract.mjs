#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import {
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING,
  CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT,
  CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING,
  CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT,
  CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING,
  CORE_DOMAIN_PACK_BINDING,
  CORE_DOMAIN_SERVICE_ENTRYPOINT_CONTRACT,
  CORE_DOMAIN_API_PACK_BINDING,
  CORE_DOMAIN_API_CONTRACT,
  CORE_DOMAIN_GOLDEN_CASE_PACK_BINDING,
  CORE_DOMAIN_UI_PACK_BINDING,
  CORE_DOMAIN_UI_STATE_CONTRACT,
  CORE_DOMAIN_UI_SURFACES,
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING,
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT,
  CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING,
  CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT,
  CORE_DOMAIN_WORKFLOW_PACK_BINDING,
  CORE_DOMAIN_WORKFLOW_CONTRACT,
  MATTER_TRACEABLE_ENTITY_TYPES,
  PRE_MATTER_ENTITY_TYPES,
  assembleCoreDomainServiceIntake,
  executeCoreDomainApiContract,
  executeCoreDomainSyntheticFixtureWorkflow,
  validateCoreDomainCp097Coverage,
  validateCoreDomainCp098Coverage,
  validateCoreDomainCp099Coverage,
  validateCoreDomainCp100Coverage,
  validateCoreDomainCp101Coverage,
  validateCoreDomainCp102Coverage,
  validateCoreDomainCp103Coverage,
  validateCoreDomainCp104Coverage,
  validateCoreDomainCp105Coverage,
  validateCoreDomainCp106Coverage,
  validateCoreDomainCp107Coverage,
  getOwnerModule,
  listCoreDomainEntityTypes,
  validateCoreDomainRegistry,
} from "../packages/domain/src/index.js";

const errors = [];

function requireEqual(actual, expected, label) {
  if (actual !== expected) errors.push(`${label} must be ${expected}, got ${actual}`);
}

function requireIncludes(values, expected, label) {
  if (!values.includes(expected)) errors.push(`${label} must include ${expected}`);
}

const contract = JSON.parse(await readFile("contracts/core-domain-contract.json", "utf8"));

requireEqual(contract.program_id, "RP01", "program_id");
requireEqual(contract.current_pack?.pack_id, CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.pack_id, "current_pack.pack_id");
requireEqual(contract.current_pack?.unit_count, CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.unit_count, "current_pack.unit_count");
requireEqual(contract.current_pack?.risk_class, CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.risk_class, "current_pack.risk_class");
requireEqual(contract.current_pack?.range, CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.range, "current_pack.range");
requireEqual(contract.current_pack?.production_ready_flag, "core_domain_review_closeout_readiness_verified", "current_pack.production_ready_flag");
requireEqual(
  contract.review_outcome_routing_pack?.pack_id,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.pack_id,
  "review_outcome_routing_pack.pack_id",
);
requireEqual(
  contract.review_outcome_routing_pack?.unit_count,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.unit_count,
  "review_outcome_routing_pack.unit_count",
);
requireEqual(
  contract.review_outcome_routing_pack?.risk_class,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.risk_class,
  "review_outcome_routing_pack.risk_class",
);
requireEqual(
  contract.review_outcome_routing_pack?.range,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.range,
  "review_outcome_routing_pack.range",
);
requireEqual(
  contract.review_outcome_routing_pack?.production_ready_flag,
  "core_domain_review_outcome_routing_verified",
  "review_outcome_routing_pack.production_ready_flag",
);
requireEqual(
  contract.evidence_review_catalog_pack?.pack_id,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.pack_id,
  "evidence_review_catalog_pack.pack_id",
);
requireEqual(
  contract.evidence_review_catalog_pack?.unit_count,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.unit_count,
  "evidence_review_catalog_pack.unit_count",
);
requireEqual(
  contract.evidence_review_catalog_pack?.risk_class,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.risk_class,
  "evidence_review_catalog_pack.risk_class",
);
requireEqual(
  contract.evidence_review_catalog_pack?.range,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.range,
  "evidence_review_catalog_pack.range",
);
requireEqual(
  contract.evidence_review_catalog_pack?.production_ready_flag,
  "core_domain_evidence_review_catalog_verified",
  "evidence_review_catalog_pack.production_ready_flag",
);
requireEqual(
  contract.failure_taxonomy_pack?.pack_id,
  CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.pack_id,
  "failure_taxonomy_pack.pack_id",
);
requireEqual(
  contract.failure_taxonomy_pack?.unit_count,
  CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.unit_count,
  "failure_taxonomy_pack.unit_count",
);
requireEqual(
  contract.failure_taxonomy_pack?.risk_class,
  CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.risk_class,
  "failure_taxonomy_pack.risk_class",
);
requireEqual(
  contract.failure_taxonomy_pack?.range,
  CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.range,
  "failure_taxonomy_pack.range",
);
requireEqual(
  contract.failure_taxonomy_pack?.production_ready_flag,
  "core_domain_failure_taxonomy_evidence_catalog_verified",
  "failure_taxonomy_pack.production_ready_flag",
);
requireEqual(
  contract.permission_review_packet_pack?.pack_id,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.pack_id,
  "permission_review_packet_pack.pack_id",
);
requireEqual(
  contract.permission_review_packet_pack?.unit_count,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.unit_count,
  "permission_review_packet_pack.unit_count",
);
requireEqual(
  contract.permission_review_packet_pack?.risk_class,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.risk_class,
  "permission_review_packet_pack.risk_class",
);
requireEqual(
  contract.permission_review_packet_pack?.range,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.range,
  "permission_review_packet_pack.range",
);
requireEqual(
  contract.permission_review_packet_pack?.production_ready_flag,
  "core_domain_permission_review_packet_binding_verified",
  "permission_review_packet_pack.production_ready_flag",
);
requireEqual(
  contract.permission_matrix_pack?.pack_id,
  CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.pack_id,
  "permission_matrix_pack.pack_id",
);
requireEqual(
  contract.permission_matrix_pack?.unit_count,
  CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.unit_count,
  "permission_matrix_pack.unit_count",
);
requireEqual(
  contract.permission_matrix_pack?.risk_class,
  CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.risk_class,
  "permission_matrix_pack.risk_class",
);
requireEqual(
  contract.permission_matrix_pack?.range,
  CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.range,
  "permission_matrix_pack.range",
);
requireEqual(
  contract.permission_matrix_pack?.production_ready_flag,
  "core_domain_permission_matrix_reference_catalog_verified",
  "permission_matrix_pack.production_ready_flag",
);
requireEqual(
  contract.synthetic_fixture_catalog_pack?.pack_id,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.pack_id,
  "synthetic_fixture_catalog_pack.pack_id",
);
requireEqual(
  contract.synthetic_fixture_catalog_pack?.unit_count,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.unit_count,
  "synthetic_fixture_catalog_pack.unit_count",
);
requireEqual(
  contract.synthetic_fixture_catalog_pack?.risk_class,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.risk_class,
  "synthetic_fixture_catalog_pack.risk_class",
);
requireEqual(
  contract.synthetic_fixture_catalog_pack?.range,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_PACK_BINDING.range,
  "synthetic_fixture_catalog_pack.range",
);
requireEqual(
  contract.synthetic_fixture_catalog_pack?.production_ready_flag,
  "core_domain_synthetic_fixture_catalog_verified",
  "synthetic_fixture_catalog_pack.production_ready_flag",
);
requireEqual(
  contract.permission_audit_fixture_pack?.pack_id,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.pack_id,
  "permission_audit_fixture_pack.pack_id",
);
requireEqual(
  contract.permission_audit_fixture_pack?.unit_count,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.unit_count,
  "permission_audit_fixture_pack.unit_count",
);
requireEqual(
  contract.permission_audit_fixture_pack?.risk_class,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.risk_class,
  "permission_audit_fixture_pack.risk_class",
);
requireEqual(
  contract.permission_audit_fixture_pack?.range,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.range,
  "permission_audit_fixture_pack.range",
);
requireEqual(
  contract.permission_audit_fixture_pack?.production_ready_flag,
  "core_domain_permission_audit_fixture_evidence_verified",
  "permission_audit_fixture_pack.production_ready_flag",
);
requireEqual(contract.foundation_pack?.pack_id, CORE_DOMAIN_PACK_BINDING.pack_id, "foundation_pack.pack_id");
requireEqual(contract.foundation_pack?.unit_count, CORE_DOMAIN_PACK_BINDING.unit_count, "foundation_pack.unit_count");
requireEqual(contract.workflow_pack?.pack_id, CORE_DOMAIN_WORKFLOW_PACK_BINDING.pack_id, "workflow_pack.pack_id");
requireEqual(contract.workflow_pack?.unit_count, CORE_DOMAIN_WORKFLOW_PACK_BINDING.unit_count, "workflow_pack.unit_count");
requireEqual(contract.api_pack?.pack_id, CORE_DOMAIN_API_PACK_BINDING.pack_id, "api_pack.pack_id");
requireEqual(contract.api_pack?.unit_count, CORE_DOMAIN_API_PACK_BINDING.unit_count, "api_pack.unit_count");
requireEqual(contract.api_pack?.range, CORE_DOMAIN_API_PACK_BINDING.range, "api_pack.range");
requireEqual(contract.ui_state_pack?.pack_id, CORE_DOMAIN_UI_PACK_BINDING.pack_id, "ui_state_pack.pack_id");
requireEqual(contract.ui_state_pack?.unit_count, CORE_DOMAIN_UI_PACK_BINDING.unit_count, "ui_state_pack.unit_count");
requireEqual(contract.ui_state_pack?.range, CORE_DOMAIN_UI_PACK_BINDING.range, "ui_state_pack.range");
requireEqual(
  contract.permission_audit_binding_pack?.pack_id,
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.pack_id,
  "permission_audit_binding_pack.pack_id",
);
requireEqual(
  contract.permission_audit_binding_pack?.unit_count,
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.unit_count,
  "permission_audit_binding_pack.unit_count",
);
requireEqual(
  contract.permission_audit_binding_pack?.risk_class,
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.risk_class,
  "permission_audit_binding_pack.risk_class",
);
requireEqual(
  contract.permission_audit_binding_pack?.range,
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.range,
  "permission_audit_binding_pack.range",
);
requireEqual(
  contract.permission_audit_binding_pack?.production_ready_flag,
  "core_domain_permission_audit_binding_verified",
  "permission_audit_binding_pack.production_ready_flag",
);
requireEqual(contract.service_entrypoint_contract?.entrypoint_id, CORE_DOMAIN_SERVICE_ENTRYPOINT_CONTRACT.entrypoint_id, "service entrypoint");
requireEqual(contract.service_entrypoint_contract?.writes_product_state, false, "service writes_product_state");
requireEqual(contract.service_entrypoint_contract?.evaluates_runtime_permission, false, "service evaluates_runtime_permission");
requireEqual(contract.service_entrypoint_contract?.writes_audit_event, false, "service writes_audit_event");
requireEqual(contract.synthetic_workflow_contract?.workflow_id, CORE_DOMAIN_WORKFLOW_CONTRACT.workflow_id, "workflow id");
requireEqual(contract.synthetic_workflow_contract?.writes_product_state, false, "workflow writes_product_state");
requireEqual(contract.synthetic_workflow_contract?.evaluates_runtime_permission, false, "workflow evaluates_runtime_permission");
requireEqual(contract.synthetic_workflow_contract?.writes_audit_event, false, "workflow writes_audit_event");
requireEqual(contract.synthetic_workflow_contract?.persistence_boundary, "synthetic_fixture_only", "workflow persistence boundary");
requireEqual(
  contract.synthetic_workflow_contract?.blocked_path_policy,
  CORE_DOMAIN_WORKFLOW_CONTRACT.blocked_path_policy,
  "workflow blocked path policy",
);
requireEqual(contract.synthetic_api_contract?.contract_id, CORE_DOMAIN_API_CONTRACT.contract_id, "api contract id");
requireEqual(contract.synthetic_api_contract?.writes_product_state, false, "api writes_product_state");
requireEqual(contract.synthetic_api_contract?.evaluates_runtime_permission, false, "api evaluates_runtime_permission");
requireEqual(contract.synthetic_api_contract?.writes_audit_event, false, "api writes_audit_event");
requireIncludes(contract.synthetic_api_contract?.endpoints ?? [], "core_domain.documents.list", "api endpoints");
requireEqual(contract.golden_case_contract?.pack_id, CORE_DOMAIN_GOLDEN_CASE_PACK_BINDING.pack_id, "golden case pack id");
requireEqual(contract.golden_case_contract?.writes_product_state, false, "golden cases writes_product_state");
requireEqual(contract.ui_state_contract?.contract_id, CORE_DOMAIN_UI_STATE_CONTRACT.contract_id, "ui state contract id");
requireEqual(contract.ui_state_contract?.source_unit_range, CORE_DOMAIN_UI_STATE_CONTRACT.source_unit_range, "ui state source range");
requireEqual(contract.ui_state_contract?.accepts_real_client_data, false, "ui state accepts_real_client_data");
requireEqual(contract.ui_state_contract?.writes_product_state, false, "ui state writes_product_state");
requireEqual(contract.ui_state_contract?.evaluates_runtime_permission, false, "ui state evaluates_runtime_permission");
requireEqual(contract.ui_state_contract?.writes_audit_event, false, "ui state writes_audit_event");
for (const required of CORE_DOMAIN_UI_STATE_CONTRACT.states) {
  requireIncludes(contract.ui_state_contract?.states ?? [], required, "ui state contract states");
}
for (const required of CORE_DOMAIN_UI_STATE_CONTRACT.responsive_modes) {
  requireIncludes(contract.ui_state_contract?.responsive_modes ?? [], required, "ui state contract responsive modes");
}
for (const surfaceId of Object.keys(CORE_DOMAIN_UI_SURFACES)) {
  requireIncludes(contract.ui_state_contract?.surfaces ?? [], surfaceId, "ui state contract surfaces");
}
requireEqual(
  contract.ui_state_contract?.permission_badge_policy,
  "reference_only_never_evaluated",
  "ui state permission badge policy",
);
requireEqual(contract.ui_state_contract?.audit_hint_policy, "display_only_never_written", "ui state audit hint policy");
requireEqual(contract.ui_state_contract?.fixture_policy, "synthetic_only", "ui state fixture policy");
requireEqual(
  contract.permission_audit_binding_contract?.contract_id,
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.contract_id,
  "permission/audit binding contract id",
);
requireEqual(
  contract.permission_audit_binding_contract?.source_unit_range,
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.source_unit_range,
  "permission/audit binding source range",
);
requireEqual(
  contract.permission_audit_binding_contract?.surface_id,
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.surface_id,
  "permission/audit binding surface",
);
requireEqual(contract.permission_audit_binding_contract?.accepts_real_client_data, false, "permission/audit accepts_real_client_data");
requireEqual(contract.permission_audit_binding_contract?.writes_product_state, false, "permission/audit writes_product_state");
requireEqual(
  contract.permission_audit_binding_contract?.evaluates_runtime_permission,
  false,
  "permission/audit evaluates_runtime_permission",
);
requireEqual(contract.permission_audit_binding_contract?.writes_audit_event, false, "permission/audit writes_audit_event");
for (const required of CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.states) {
  requireIncludes(contract.permission_audit_binding_contract?.states ?? [], required, "permission/audit states");
}
for (const required of CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.responsive_modes) {
  requireIncludes(contract.permission_audit_binding_contract?.responsive_modes ?? [], required, "permission/audit responsive modes");
}
for (const required of CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.required_actions) {
  requireIncludes(contract.permission_audit_binding_contract?.required_actions ?? [], required, "permission/audit required actions");
}
for (const required of CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.forbidden_claims) {
  requireIncludes(contract.permission_audit_binding_contract?.forbidden_claims ?? [], required, "permission/audit forbidden claims");
}
requireEqual(
  contract.permission_audit_binding_contract?.permission_badge_policy,
  "reference_only_never_evaluated",
  "permission/audit permission badge policy",
);
requireEqual(contract.permission_audit_binding_contract?.audit_hint_policy, "display_only_never_written", "permission/audit audit hint policy");
requireEqual(
  contract.permission_audit_binding_contract?.keyboard_policy,
  CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.keyboard_policy,
  "permission/audit keyboard policy",
);
requireEqual(
  contract.permission_audit_fixture_contract?.contract_id,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.contract_id,
  "permission/audit fixture contract id",
);
requireEqual(
  contract.permission_audit_fixture_contract?.source_unit_range,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.source_unit_range,
  "permission/audit fixture source range",
);
requireEqual(
  contract.permission_audit_fixture_contract?.surface_id,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.surface_id,
  "permission/audit fixture surface",
);
requireEqual(
  contract.permission_audit_fixture_contract?.source_micro_phase_id,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.source_micro_phase_id,
  "permission/audit fixture micro phase",
);
requireEqual(contract.permission_audit_fixture_contract?.accepts_real_client_data, false, "permission/audit fixture accepts_real_client_data");
requireEqual(contract.permission_audit_fixture_contract?.writes_product_state, false, "permission/audit fixture writes_product_state");
requireEqual(
  contract.permission_audit_fixture_contract?.evaluates_runtime_permission,
  false,
  "permission/audit fixture evaluates_runtime_permission",
);
requireEqual(contract.permission_audit_fixture_contract?.writes_audit_event, false, "permission/audit fixture writes_audit_event");
for (const required of CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.states) {
  requireIncludes(contract.permission_audit_fixture_contract?.states ?? [], required, "permission/audit fixture states");
}
for (const required of CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.responsive_modes) {
  requireIncludes(contract.permission_audit_fixture_contract?.responsive_modes ?? [], required, "permission/audit fixture responsive modes");
}
for (const required of CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.data_dependencies) {
  requireIncludes(contract.permission_audit_fixture_contract?.data_dependencies ?? [], required, "permission/audit fixture dependencies");
}
for (const required of CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.forbidden_claims) {
  requireIncludes(contract.permission_audit_fixture_contract?.forbidden_claims ?? [], required, "permission/audit fixture forbidden claims");
}
requireEqual(contract.permission_audit_fixture_contract?.fixture_policy, "synthetic_fixture_only", "permission/audit fixture policy");
requireEqual(
  contract.permission_audit_fixture_contract?.visual_density_policy,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.visual_density_policy,
  "permission/audit fixture density policy",
);
requireEqual(
  contract.permission_audit_fixture_contract?.hermes_evidence_policy,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.hermes_evidence_policy,
  "permission/audit fixture Hermes evidence policy",
);
requireEqual(
  contract.synthetic_fixture_catalog_contract?.contract_id,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.contract_id,
  "synthetic fixture catalog contract id",
);
requireEqual(
  contract.synthetic_fixture_catalog_contract?.source_unit_range,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.source_unit_range,
  "synthetic fixture catalog source range",
);
requireEqual(
  contract.synthetic_fixture_catalog_contract?.upstream_permission_audit_fixture_contract_id,
  CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.contract_id,
  "synthetic fixture catalog upstream fixture contract",
);
requireEqual(contract.synthetic_fixture_catalog_contract?.accepts_real_client_data, false, "synthetic fixture catalog accepts_real_client_data");
requireEqual(contract.synthetic_fixture_catalog_contract?.writes_product_state, false, "synthetic fixture catalog writes_product_state");
requireEqual(
  contract.synthetic_fixture_catalog_contract?.evaluates_runtime_permission,
  false,
  "synthetic fixture catalog evaluates_runtime_permission",
);
requireEqual(contract.synthetic_fixture_catalog_contract?.writes_audit_event, false, "synthetic fixture catalog writes_audit_event");
requireEqual(contract.synthetic_fixture_catalog_contract?.creates_database_rows, false, "synthetic fixture catalog creates_database_rows");
requireEqual(contract.synthetic_fixture_catalog_contract?.ldip_implemented, false, "synthetic fixture catalog ldip_implemented");
for (const required of CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.ui_fixture_states) {
  requireIncludes(contract.synthetic_fixture_catalog_contract?.ui_fixture_states ?? [], required, "synthetic fixture catalog UI states");
}
for (const required of CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.responsive_modes) {
  requireIncludes(contract.synthetic_fixture_catalog_contract?.responsive_modes ?? [], required, "synthetic fixture catalog responsive modes");
}
for (const required of CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.base_fixture_types) {
  requireIncludes(contract.synthetic_fixture_catalog_contract?.base_fixture_types ?? [], required, "synthetic fixture catalog base fixture types");
}
for (const required of CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.fixture_case_ids) {
  requireIncludes(contract.synthetic_fixture_catalog_contract?.fixture_case_ids ?? [], required, "synthetic fixture catalog case ids");
}
for (const required of CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.covered_micro_phase_ids) {
  requireIncludes(contract.synthetic_fixture_catalog_contract?.covered_micro_phase_ids ?? [], required, "synthetic fixture catalog micro phases");
}
for (const required of CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.forbidden_claims) {
  requireIncludes(contract.synthetic_fixture_catalog_contract?.forbidden_claims ?? [], required, "synthetic fixture catalog forbidden claims");
}
requireEqual(
  contract.synthetic_fixture_catalog_contract?.coverage_policy,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.coverage_policy,
  "synthetic fixture catalog coverage policy",
);
requireEqual(
  contract.synthetic_fixture_catalog_contract?.evidence_policy,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.evidence_policy,
  "synthetic fixture catalog evidence policy",
);
requireEqual(
  contract.permission_matrix_contract?.pack_id,
  CORE_DOMAIN_PERMISSION_MATRIX_PACK_BINDING.pack_id,
  "permission matrix contract pack id",
);
requireEqual(
  contract.permission_matrix_contract?.contract_id,
  CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.contract_id,
  "permission matrix contract id",
);
requireEqual(
  contract.permission_matrix_contract?.source_unit_range,
  CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.source_unit_range,
  "permission matrix source range",
);
requireEqual(
  contract.permission_matrix_contract?.upstream_fixture_catalog_contract_id,
  CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.contract_id,
  "permission matrix upstream fixture catalog contract",
);
requireEqual(contract.permission_matrix_contract?.accepts_real_client_data, false, "permission matrix accepts_real_client_data");
requireEqual(contract.permission_matrix_contract?.writes_product_state, false, "permission matrix writes_product_state");
requireEqual(contract.permission_matrix_contract?.evaluates_runtime_permission, false, "permission matrix evaluates_runtime_permission");
requireEqual(contract.permission_matrix_contract?.writes_audit_event, false, "permission matrix writes_audit_event");
requireEqual(contract.permission_matrix_contract?.creates_database_rows, false, "permission matrix creates_database_rows");
requireEqual(contract.permission_matrix_contract?.ldip_implemented, false, "permission matrix ldip_implemented");
for (const required of CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.action_bindings) {
  requireIncludes(contract.permission_matrix_contract?.action_bindings ?? [], required, "permission matrix action bindings");
}
for (const required of CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.interaction_bindings) {
  requireIncludes(contract.permission_matrix_contract?.interaction_bindings ?? [], required, "permission matrix interaction bindings");
}
for (const required of CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.covered_micro_phase_ids) {
  requireIncludes(contract.permission_matrix_contract?.covered_micro_phase_ids ?? [], required, "permission matrix micro phases");
}
for (const required of CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.forbidden_claims) {
  requireIncludes(contract.permission_matrix_contract?.forbidden_claims ?? [], required, "permission matrix forbidden claims");
}
requireEqual(
  contract.permission_matrix_contract?.permission_policy,
  CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.permission_policy,
  "permission matrix permission policy",
);
requireEqual(contract.permission_matrix_contract?.audit_policy, CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.audit_policy, "permission matrix audit policy");
requireEqual(
  contract.permission_matrix_contract?.security_trimming_policy,
  CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.security_trimming_policy,
  "permission matrix security trimming policy",
);
requireEqual(
  contract.permission_matrix_contract?.deny_over_allow_policy,
  CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.deny_over_allow_policy,
  "permission matrix deny-over-allow policy",
);
requireEqual(
  contract.permission_review_packet_contract?.pack_id,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_PACK_BINDING.pack_id,
  "permission review packet contract pack id",
);
requireEqual(
  contract.permission_review_packet_contract?.contract_id,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.contract_id,
  "permission review packet contract id",
);
requireEqual(
  contract.permission_review_packet_contract?.source_unit_range,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.source_unit_range,
  "permission review packet source range",
);
requireEqual(
  contract.permission_review_packet_contract?.upstream_permission_matrix_contract_id,
  CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.contract_id,
  "permission review packet upstream permission matrix contract",
);
requireEqual(contract.permission_review_packet_contract?.accepts_real_client_data, false, "permission review packet accepts_real_client_data");
requireEqual(contract.permission_review_packet_contract?.writes_product_state, false, "permission review packet writes_product_state");
requireEqual(contract.permission_review_packet_contract?.evaluates_runtime_permission, false, "permission review packet evaluates_runtime_permission");
requireEqual(contract.permission_review_packet_contract?.writes_audit_event, false, "permission review packet writes_audit_event");
requireEqual(contract.permission_review_packet_contract?.creates_database_rows, false, "permission review packet creates_database_rows");
requireEqual(contract.permission_review_packet_contract?.executes_export_download, false, "permission review packet executes_export_download");
requireEqual(contract.permission_review_packet_contract?.executes_external_share, false, "permission review packet executes_external_share");
requireEqual(contract.permission_review_packet_contract?.ldip_implemented, false, "permission review packet ldip_implemented");
for (const required of CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.covered_unit_ids) {
  requireIncludes(contract.permission_review_packet_contract?.covered_unit_ids ?? [], required, "permission review packet covered units");
}
for (const required of CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.evidence_bindings) {
  requireIncludes(contract.permission_review_packet_contract?.evidence_bindings ?? [], required, "permission review packet evidence bindings");
}
for (const required of CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.decision_bindings) {
  requireIncludes(contract.permission_review_packet_contract?.decision_bindings ?? [], required, "permission review packet decision bindings");
}
for (const required of CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.forbidden_claims) {
  requireIncludes(contract.permission_review_packet_contract?.forbidden_claims ?? [], required, "permission review packet forbidden claims");
}
requireEqual(
  contract.permission_review_packet_contract?.audit_event_expectation_policy,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.audit_event_expectation_policy,
  "permission review packet audit expectation policy",
);
requireEqual(
  contract.permission_review_packet_contract?.permission_fixture_policy,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.permission_fixture_policy,
  "permission review packet fixture policy",
);
requireEqual(
  contract.permission_review_packet_contract?.allowed_denied_test_policy,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.allowed_denied_test_policy,
  "permission review packet test policy",
);
requireEqual(contract.permission_review_packet_contract?.export_policy, CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.export_policy, "permission review packet export policy");
requireEqual(contract.permission_review_packet_contract?.share_policy, CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.share_policy, "permission review packet share policy");
requireEqual(
  contract.failure_taxonomy_contract?.pack_id,
  CORE_DOMAIN_FAILURE_TAXONOMY_PACK_BINDING.pack_id,
  "failure taxonomy contract pack id",
);
requireEqual(
  contract.failure_taxonomy_contract?.contract_id,
  CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.contract_id,
  "failure taxonomy contract id",
);
requireEqual(
  contract.failure_taxonomy_contract?.source_unit_range,
  CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.source_unit_range,
  "failure taxonomy source range",
);
requireEqual(
  contract.failure_taxonomy_contract?.upstream_permission_review_packet_contract_id,
  CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.contract_id,
  "failure taxonomy upstream permission review packet contract",
);
requireEqual(contract.failure_taxonomy_contract?.accepts_real_client_data, false, "failure taxonomy accepts_real_client_data");
requireEqual(contract.failure_taxonomy_contract?.writes_product_state, false, "failure taxonomy writes_product_state");
requireEqual(contract.failure_taxonomy_contract?.evaluates_runtime_permission, false, "failure taxonomy evaluates_runtime_permission");
requireEqual(contract.failure_taxonomy_contract?.writes_audit_event, false, "failure taxonomy writes_audit_event");
requireEqual(contract.failure_taxonomy_contract?.creates_database_rows, false, "failure taxonomy creates_database_rows");
requireEqual(contract.failure_taxonomy_contract?.executes_ai_retrieval, false, "failure taxonomy executes_ai_retrieval");
requireEqual(contract.failure_taxonomy_contract?.executes_export_download, false, "failure taxonomy executes_export_download");
requireEqual(contract.failure_taxonomy_contract?.executes_external_share, false, "failure taxonomy executes_external_share");
requireEqual(contract.failure_taxonomy_contract?.mutates_locks, false, "failure taxonomy mutates_locks");
requireEqual(contract.failure_taxonomy_contract?.retries_operations, false, "failure taxonomy retries_operations");
requireEqual(contract.failure_taxonomy_contract?.performs_rollback, false, "failure taxonomy performs_rollback");
requireEqual(contract.failure_taxonomy_contract?.performs_compensation, false, "failure taxonomy performs_compensation");
requireEqual(contract.failure_taxonomy_contract?.ldip_implemented, false, "failure taxonomy ldip_implemented");
requireEqual(contract.failure_taxonomy_contract?.covered_unit_count, CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.covered_unit_count, "failure taxonomy covered unit count");
for (const required of CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.covered_micro_phase_ids) {
  requireIncludes(contract.failure_taxonomy_contract?.covered_micro_phase_ids ?? [], required, "failure taxonomy covered micro phases");
}
for (const required of CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.review_extension_bindings) {
  requireIncludes(contract.failure_taxonomy_contract?.review_extension_bindings ?? [], required, "failure taxonomy review extensions");
}
for (const required of CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.failure_category_ids) {
  requireIncludes(contract.failure_taxonomy_contract?.failure_category_ids ?? [], required, "failure taxonomy categories");
}
for (const required of CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.forbidden_claims) {
  requireIncludes(contract.failure_taxonomy_contract?.forbidden_claims ?? [], required, "failure taxonomy forbidden claims");
}
requireEqual(contract.failure_taxonomy_contract?.failure_policy, CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.failure_policy, "failure taxonomy failure policy");
requireEqual(contract.failure_taxonomy_contract?.audit_failure_policy, CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.audit_failure_policy, "failure taxonomy audit failure policy");
requireEqual(contract.failure_taxonomy_contract?.permission_failure_policy, CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.permission_failure_policy, "failure taxonomy permission failure policy");
requireEqual(contract.failure_taxonomy_contract?.recovery_policy, CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.recovery_policy, "failure taxonomy recovery policy");
requireEqual(
  contract.evidence_review_catalog_contract?.pack_id,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_PACK_BINDING.pack_id,
  "evidence review catalog contract pack id",
);
requireEqual(
  contract.evidence_review_catalog_contract?.contract_id,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.contract_id,
  "evidence review catalog contract id",
);
requireEqual(
  contract.evidence_review_catalog_contract?.source_unit_range,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.source_unit_range,
  "evidence review catalog source range",
);
requireEqual(
  contract.evidence_review_catalog_contract?.upstream_failure_taxonomy_contract_id,
  CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.contract_id,
  "evidence review catalog upstream failure taxonomy contract",
);
requireEqual(contract.evidence_review_catalog_contract?.accepts_real_client_data, false, "evidence review catalog accepts_real_client_data");
requireEqual(contract.evidence_review_catalog_contract?.writes_product_state, false, "evidence review catalog writes_product_state");
requireEqual(contract.evidence_review_catalog_contract?.evaluates_runtime_permission, false, "evidence review catalog evaluates_runtime_permission");
requireEqual(contract.evidence_review_catalog_contract?.writes_audit_event, false, "evidence review catalog writes_audit_event");
requireEqual(contract.evidence_review_catalog_contract?.creates_database_rows, false, "evidence review catalog creates_database_rows");
requireEqual(contract.evidence_review_catalog_contract?.executes_ai_retrieval, false, "evidence review catalog executes_ai_retrieval");
requireEqual(contract.evidence_review_catalog_contract?.executes_export_download, false, "evidence review catalog executes_export_download");
requireEqual(contract.evidence_review_catalog_contract?.executes_external_share, false, "evidence review catalog executes_external_share");
requireEqual(contract.evidence_review_catalog_contract?.mutates_locks, false, "evidence review catalog mutates_locks");
requireEqual(contract.evidence_review_catalog_contract?.retries_operations, false, "evidence review catalog retries_operations");
requireEqual(contract.evidence_review_catalog_contract?.performs_rollback, false, "evidence review catalog performs_rollback");
requireEqual(contract.evidence_review_catalog_contract?.performs_compensation, false, "evidence review catalog performs_compensation");
requireEqual(contract.evidence_review_catalog_contract?.ldip_implemented, false, "evidence review catalog ldip_implemented");
requireEqual(
  contract.evidence_review_catalog_contract?.covered_unit_count,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.covered_unit_count,
  "evidence review catalog covered unit count",
);
for (const required of CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.covered_micro_phase_ids) {
  requireIncludes(contract.evidence_review_catalog_contract?.covered_micro_phase_ids ?? [], required, "evidence review catalog covered micro phases");
}
for (const required of CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.failure_closeout_category_ids) {
  requireIncludes(contract.evidence_review_catalog_contract?.failure_closeout_category_ids ?? [], required, "evidence review catalog failure closeout categories");
}
for (const required of CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.hermes_receipt_ids) {
  requireIncludes(contract.evidence_review_catalog_contract?.hermes_receipt_ids ?? [], required, "evidence review catalog Hermes receipts");
}
for (const required of CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.review_question_ids) {
  requireIncludes(contract.evidence_review_catalog_contract?.review_question_ids ?? [], required, "evidence review catalog review questions");
}
for (const required of CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.forbidden_claims) {
  requireIncludes(contract.evidence_review_catalog_contract?.forbidden_claims ?? [], required, "evidence review catalog forbidden claims");
}
requireEqual(
  contract.evidence_review_catalog_contract?.evidence_policy,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.evidence_policy,
  "evidence review catalog evidence policy",
);
requireEqual(
  contract.evidence_review_catalog_contract?.review_policy,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.review_policy,
  "evidence review catalog review policy",
);
requireEqual(
  contract.evidence_review_catalog_contract?.gate_semantics_policy,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.gate_semantics_policy,
  "evidence review catalog gate semantics policy",
);
requireEqual(
  contract.evidence_review_catalog_contract?.failure_closeout_policy,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.failure_closeout_policy,
  "evidence review catalog failure closeout policy",
);
requireEqual(
  contract.review_outcome_routing_contract?.pack_id,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_PACK_BINDING.pack_id,
  "review outcome routing contract pack id",
);
requireEqual(
  contract.review_outcome_routing_contract?.contract_id,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.contract_id,
  "review outcome routing contract id",
);
requireEqual(
  contract.review_outcome_routing_contract?.source_unit_range,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.source_unit_range,
  "review outcome routing source range",
);
requireEqual(
  contract.review_outcome_routing_contract?.upstream_evidence_review_catalog_contract_id,
  CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.contract_id,
  "review outcome routing upstream evidence review catalog contract",
);
requireEqual(contract.review_outcome_routing_contract?.accepts_real_client_data, false, "review outcome routing accepts_real_client_data");
requireEqual(contract.review_outcome_routing_contract?.writes_product_state, false, "review outcome routing writes_product_state");
requireEqual(contract.review_outcome_routing_contract?.evaluates_runtime_permission, false, "review outcome routing evaluates_runtime_permission");
requireEqual(contract.review_outcome_routing_contract?.writes_audit_event, false, "review outcome routing writes_audit_event");
requireEqual(contract.review_outcome_routing_contract?.creates_database_rows, false, "review outcome routing creates_database_rows");
requireEqual(contract.review_outcome_routing_contract?.executes_ai_retrieval, false, "review outcome routing executes_ai_retrieval");
requireEqual(contract.review_outcome_routing_contract?.executes_export_download, false, "review outcome routing executes_export_download");
requireEqual(contract.review_outcome_routing_contract?.executes_external_share, false, "review outcome routing executes_external_share");
requireEqual(contract.review_outcome_routing_contract?.mutates_locks, false, "review outcome routing mutates_locks");
requireEqual(contract.review_outcome_routing_contract?.retries_operations, false, "review outcome routing retries_operations");
requireEqual(contract.review_outcome_routing_contract?.performs_rollback, false, "review outcome routing performs_rollback");
requireEqual(contract.review_outcome_routing_contract?.performs_compensation, false, "review outcome routing performs_compensation");
requireEqual(contract.review_outcome_routing_contract?.executes_claude_review, false, "review outcome routing executes_claude_review");
requireEqual(contract.review_outcome_routing_contract?.grants_human_approval, false, "review outcome routing grants_human_approval");
requireEqual(contract.review_outcome_routing_contract?.ldip_implemented, false, "review outcome routing ldip_implemented");
requireEqual(
  contract.review_outcome_routing_contract?.covered_unit_count,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.covered_unit_count,
  "review outcome routing covered unit count",
);
for (const required of CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.covered_micro_phase_ids) {
  requireIncludes(contract.review_outcome_routing_contract?.covered_micro_phase_ids ?? [], required, "review outcome routing covered micro phases");
}
for (const required of CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.outcome_item_ids) {
  requireIncludes(contract.review_outcome_routing_contract?.outcome_item_ids ?? [], required, "review outcome routing outcome items");
}
for (const required of CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.allowed_verdicts) {
  requireIncludes(contract.review_outcome_routing_contract?.allowed_verdicts ?? [], required, "review outcome routing allowed verdicts");
}
for (const required of CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.severity_levels) {
  requireIncludes(contract.review_outcome_routing_contract?.severity_levels ?? [], required, "review outcome routing severity levels");
}
for (const required of CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.routing_targets) {
  requireIncludes(contract.review_outcome_routing_contract?.routing_targets ?? [], required, "review outcome routing targets");
}
for (const required of CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.forbidden_claims) {
  requireIncludes(contract.review_outcome_routing_contract?.forbidden_claims ?? [], required, "review outcome routing forbidden claims");
}
requireEqual(
  contract.review_outcome_routing_contract?.review_question_policy,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.review_question_policy,
  "review outcome routing review question policy",
);
requireEqual(
  contract.review_outcome_routing_contract?.verdict_policy,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.verdict_policy,
  "review outcome routing verdict policy",
);
requireEqual(
  contract.review_outcome_routing_contract?.finding_routing_policy,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.finding_routing_policy,
  "review outcome routing finding routing policy",
);
requireEqual(
  contract.review_outcome_routing_contract?.severity_policy,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.severity_policy,
  "review outcome routing severity policy",
);
requireEqual(
  contract.review_closeout_readiness_contract?.pack_id,
  CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.pack_id,
  "review closeout readiness contract pack id",
);
requireEqual(
  contract.review_closeout_readiness_contract?.contract_id,
  CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.contract_id,
  "review closeout readiness contract id",
);
requireEqual(
  contract.review_closeout_readiness_contract?.source_unit_range,
  CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.source_unit_range,
  "review closeout readiness source range",
);
requireEqual(
  contract.review_closeout_readiness_contract?.upstream_review_outcome_routing_contract_id,
  CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.contract_id,
  "review closeout readiness upstream review outcome routing contract",
);
requireEqual(contract.review_closeout_readiness_contract?.accepts_real_client_data, false, "review closeout readiness accepts_real_client_data");
requireEqual(contract.review_closeout_readiness_contract?.writes_product_state, false, "review closeout readiness writes_product_state");
requireEqual(contract.review_closeout_readiness_contract?.evaluates_runtime_permission, false, "review closeout readiness evaluates_runtime_permission");
requireEqual(contract.review_closeout_readiness_contract?.writes_audit_event, false, "review closeout readiness writes_audit_event");
requireEqual(contract.review_closeout_readiness_contract?.creates_database_rows, false, "review closeout readiness creates_database_rows");
requireEqual(contract.review_closeout_readiness_contract?.executes_ai_retrieval, false, "review closeout readiness executes_ai_retrieval");
requireEqual(contract.review_closeout_readiness_contract?.executes_export_download, false, "review closeout readiness executes_export_download");
requireEqual(contract.review_closeout_readiness_contract?.executes_external_share, false, "review closeout readiness executes_external_share");
requireEqual(contract.review_closeout_readiness_contract?.mutates_locks, false, "review closeout readiness mutates_locks");
requireEqual(contract.review_closeout_readiness_contract?.retries_operations, false, "review closeout readiness retries_operations");
requireEqual(contract.review_closeout_readiness_contract?.performs_rollback, false, "review closeout readiness performs_rollback");
requireEqual(contract.review_closeout_readiness_contract?.performs_compensation, false, "review closeout readiness performs_compensation");
requireEqual(contract.review_closeout_readiness_contract?.executes_claude_review, false, "review closeout readiness executes_claude_review");
requireEqual(contract.review_closeout_readiness_contract?.grants_human_approval, false, "review closeout readiness grants_human_approval");
requireEqual(contract.review_closeout_readiness_contract?.mutates_issue_routing, false, "review closeout readiness mutates_issue_routing");
requireEqual(contract.review_closeout_readiness_contract?.ldip_implemented, false, "review closeout readiness ldip_implemented");
requireEqual(
  contract.review_closeout_readiness_contract?.covered_unit_count,
  CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.covered_unit_count,
  "review closeout readiness covered unit count",
);
for (const required of CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.covered_micro_phase_ids) {
  requireIncludes(contract.review_closeout_readiness_contract?.covered_micro_phase_ids ?? [], required, "review closeout readiness covered micro phases");
}
for (const required of CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.readiness_item_ids) {
  requireIncludes(contract.review_closeout_readiness_contract?.readiness_item_ids ?? [], required, "review closeout readiness items");
}
for (const required of CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.allowed_verdicts) {
  requireIncludes(contract.review_closeout_readiness_contract?.allowed_verdicts ?? [], required, "review closeout readiness allowed verdicts");
}
for (const required of CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.severity_levels) {
  requireIncludes(contract.review_closeout_readiness_contract?.severity_levels ?? [], required, "review closeout readiness severity levels");
}
for (const required of CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.routing_targets) {
  requireIncludes(contract.review_closeout_readiness_contract?.routing_targets ?? [], required, "review closeout readiness targets");
}
for (const required of CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.forbidden_claims) {
  requireIncludes(contract.review_closeout_readiness_contract?.forbidden_claims ?? [], required, "review closeout readiness forbidden claims");
}
requireEqual(
  contract.review_closeout_readiness_contract?.hermes_evidence_policy,
  CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.hermes_evidence_policy,
  "review closeout readiness Hermes evidence policy",
);
requireEqual(
  contract.review_closeout_readiness_contract?.claude_review_policy,
  CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.claude_review_policy,
  "review closeout readiness Claude review policy",
);
requireEqual(
  contract.review_closeout_readiness_contract?.closeout_policy,
  CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.closeout_policy,
  "review closeout readiness closeout policy",
);
requireEqual(
  contract.review_closeout_readiness_contract?.terminal_routing_policy,
  CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.terminal_routing_policy,
  "review closeout readiness terminal routing policy",
);

const entityTypes = listCoreDomainEntityTypes();
for (const required of ["Tenant", "User", "Group", "Role", "PermissionReference", "PolicyReference", "Entity", "Client", "Matter", "DocumentReference", "DocumentVersionReference", "AuditEventReference", "AuditEvent"]) {
  requireIncludes(entityTypes, required, "core domain entity registry");
  requireIncludes(contract.owns, required, "contract owns");
}

requireEqual(getOwnerModule("DocumentReference"), "DMS", "DocumentReference owner");
requireEqual(getOwnerModule("PermissionReference"), "PermissionKernel", "PermissionReference owner");
requireEqual(getOwnerModule("AuditEvent"), "AuditKernel", "AuditEvent owner");
requireIncludes(MATTER_TRACEABLE_ENTITY_TYPES, "DocumentReference", "matter traceable entity types");
requireIncludes(PRE_MATTER_ENTITY_TYPES, "Client", "pre-Matter entity types");

const registry = validateCoreDomainRegistry();
requireEqual(registry.valid, true, "registry valid");
requireEqual(registry.entity_count, entityTypes.length, "registry entity count");

const intake = assembleCoreDomainServiceIntake(
  {
    tenant_id: "t_rp01_validator",
    actor_user_id: "u_validator",
    matter_id: "m_validator",
    entity_type: "DocumentReference",
    operation: "reference",
    requested_at: "2026-06-08T06:20:00.000Z",
  },
  {
    record: { document_id: "d_validator", tenant_id: "t_rp01_validator", matter_id: "m_validator", dms_owned: true },
    records: [{ tenant_id: "t_rp01_validator" }],
    permission_ref: { permission_id: "perm_validator", tenant_id: "t_rp01_validator", action: "read", effect: "allow" },
  },
);
requireEqual(intake.entrypoint_id, "core_domain_service_intake", "intake entrypoint");
requireEqual(intake.writes_product_state, false, "intake writes_product_state");
requireEqual(intake.permission_precheck.evaluated, false, "intake permission evaluated");
requireEqual(intake.audit_hint.writes_audit_event, false, "intake audit write");

const fixtureWorkflow = executeCoreDomainSyntheticFixtureWorkflow();
requireEqual(fixtureWorkflow.result.status, "completed", "fixture workflow status");
requireEqual(fixtureWorkflow.result.route.route, "ready", "fixture workflow route");
requireEqual(fixtureWorkflow.result.persistence.writes_product_state, false, "fixture workflow persistence writes_product_state");
requireEqual(fixtureWorkflow.result.evaluates_runtime_permission, false, "fixture workflow evaluates_runtime_permission");
requireEqual(fixtureWorkflow.result.writes_audit_event, false, "fixture workflow writes_audit_event");

const apiResult = executeCoreDomainApiContract(
  {
    endpoint_id: "core_domain.documents.list",
    tenant_id: "t_rp01_validator",
    actor_user_id: "u_validator",
    matter_id: "m_validator",
    requested_at: "2026-06-08T07:10:00.000Z",
    visibility: {
      entity_type: "DocumentReference",
      visible_fields: ["document_id", "matter_id"],
      allowed_record_ids: ["d_validator"],
    },
  },
  {
    records: [{ document_id: "d_validator", tenant_id: "t_rp01_validator", matter_id: "m_validator", dms_owned: true }],
    entity_type: "DocumentReference",
  },
);
requireEqual(apiResult.status, "completed", "api result status");
requireEqual(apiResult.permission_evaluated, false, "api permission evaluated");
requireEqual(apiResult.audit_written, false, "api audit written");
requireEqual(apiResult.writes_product_state, false, "api writes_product_state");

const cp097Coverage = validateCoreDomainCp097Coverage();
requireEqual(cp097Coverage.valid, true, "CP00-097 coverage valid");
requireEqual(cp097Coverage.golden_case_count, 8, "CP00-097 golden case count");
requireEqual(cp097Coverage.next_subphase_id, "RP01.P04.M02.S04", "CP00-097 next subphase");

const cp098Coverage = validateCoreDomainCp098Coverage();
requireEqual(cp098Coverage.valid, true, "CP00-098 coverage valid");
requireEqual(cp098Coverage.state_count, 15, "CP00-098 state count");
requireEqual(cp098Coverage.next_subphase_id, "RP01.P04.M05.S05", "CP00-098 next subphase");

const cp099Coverage = validateCoreDomainCp099Coverage();
requireEqual(cp099Coverage.valid, true, "CP00-099 coverage valid");
requireEqual(cp099Coverage.matrix_count, 4, "CP00-099 matrix count");
requireEqual(cp099Coverage.next_subphase_id, "RP01.P04.M05.S15", "CP00-099 next subphase");

const cp100Coverage = validateCoreDomainCp100Coverage();
requireEqual(cp100Coverage.valid, true, "CP00-100 coverage valid");
requireEqual(cp100Coverage.matrix_count, 4, "CP00-100 matrix count");
requireEqual(cp100Coverage.next_subphase_id, "RP01.P04.M06.S05", "CP00-100 next subphase");

const cp101Coverage = validateCoreDomainCp101Coverage();
requireEqual(cp101Coverage.valid, true, "CP00-101 coverage valid");
requireEqual(cp101Coverage.fixture_case_count, 20, "CP00-101 fixture case count");
requireEqual(cp101Coverage.ui_state_count, 4, "CP00-101 UI state count");
requireEqual(cp101Coverage.covered_unit_count, 150, "CP00-101 covered unit count");
requireEqual(cp101Coverage.next_subphase_id, "RP01.P05.M09.S04", "CP00-101 next subphase");

const cp102Coverage = validateCoreDomainCp102Coverage();
requireEqual(cp102Coverage.valid, true, "CP00-102 coverage valid");
requireEqual(cp102Coverage.matrix_row_count, 7, "CP00-102 matrix row count");
requireEqual(cp102Coverage.interaction_count, 10, "CP00-102 interaction count");
requireEqual(cp102Coverage.covered_unit_count, 150, "CP00-102 covered unit count");
requireEqual(cp102Coverage.next_subphase_id, "RP01.P06.M08.S17", "CP00-102 next subphase");

const cp103Coverage = validateCoreDomainCp103Coverage();
requireEqual(cp103Coverage.valid, true, "CP00-103 coverage valid");
requireEqual(cp103Coverage.review_item_count, 4, "CP00-103 review item count");
requireEqual(cp103Coverage.decision_binding_count, 2, "CP00-103 decision binding count");
requireEqual(cp103Coverage.covered_unit_count, 10, "CP00-103 covered unit count");
requireEqual(cp103Coverage.next_subphase_id, "RP01.P06.M09.S07", "CP00-103 next subphase");

const cp104Coverage = validateCoreDomainCp104Coverage();
requireEqual(cp104Coverage.valid, true, "CP00-104 coverage valid");
requireEqual(cp104Coverage.review_extension_count, 8, "CP00-104 review extension count");
requireEqual(cp104Coverage.taxonomy_count, 20, "CP00-104 taxonomy count");
requireEqual(cp104Coverage.failure_scenario_count, 142, "CP00-104 failure scenario count");
requireEqual(cp104Coverage.covered_unit_count, 150, "CP00-104 covered unit count");
requireEqual(cp104Coverage.next_subphase_id, "RP01.P07.M08.S18", "CP00-104 next subphase");

const cp105Coverage = validateCoreDomainCp105Coverage();
requireEqual(cp105Coverage.valid, true, "CP00-105 coverage valid");
requireEqual(cp105Coverage.failure_closeout_count, 17, "CP00-105 failure closeout count");
requireEqual(cp105Coverage.hermes_evidence_receipt_count, 115, "CP00-105 Hermes evidence receipt count");
requireEqual(cp105Coverage.review_question_count, 18, "CP00-105 review question count");
requireEqual(cp105Coverage.command_matrix_count, 11, "CP00-105 command matrix count");
requireEqual(cp105Coverage.covered_unit_count, 150, "CP00-105 covered unit count");
requireEqual(cp105Coverage.next_subphase_id, "RP01.P09.M03.S10", "CP00-105 next subphase");

const cp106Coverage = validateCoreDomainCp106Coverage();
requireEqual(cp106Coverage.valid, true, "CP00-106 coverage valid");
requireEqual(cp106Coverage.review_outcome_count, 40, "CP00-106 review outcome count");
requireEqual(cp106Coverage.review_question_count, 28, "CP00-106 review question count");
requireEqual(cp106Coverage.verdict_format_count, 3, "CP00-106 verdict format count");
requireEqual(cp106Coverage.finding_routing_map_count, 3, "CP00-106 finding routing map count");
requireEqual(cp106Coverage.risk_register_count, 4, "CP00-106 risk register count");
requireEqual(cp106Coverage.severity_taxonomy_count, 2, "CP00-106 severity taxonomy count");
requireEqual(cp106Coverage.covered_unit_count, 40, "CP00-106 covered unit count");
requireEqual(cp106Coverage.next_subphase_id, "RP01.P09.M07.S09", "CP00-106 next subphase");

const cp107Coverage = validateCoreDomainCp107Coverage();
requireEqual(cp107Coverage.valid, true, "CP00-107 coverage valid");
requireEqual(cp107Coverage.review_closeout_count, 16, "CP00-107 review closeout count");
requireEqual(cp107Coverage.review_question_count, 12, "CP00-107 review question count");
requireEqual(cp107Coverage.verdict_format_count, 1, "CP00-107 verdict format count");
requireEqual(cp107Coverage.finding_routing_map_count, 1, "CP00-107 finding routing map count");
requireEqual(cp107Coverage.risk_register_count, 1, "CP00-107 risk register count");
requireEqual(cp107Coverage.severity_taxonomy_count, 1, "CP00-107 severity taxonomy count");
requireEqual(cp107Coverage.hermes_evidence_reference_count, 8, "CP00-107 Hermes evidence reference count");
requireEqual(cp107Coverage.claude_review_reference_count, 4, "CP00-107 Claude review reference count");
requireEqual(cp107Coverage.closeout_handoff_reference_count, 1, "CP00-107 closeout handoff reference count");
requireEqual(cp107Coverage.covered_unit_count, 16, "CP00-107 covered unit count");
requireEqual(cp107Coverage.next_pack_id, "CP00-108", "CP00-107 next pack");
requireEqual(cp107Coverage.next_subphase_id, "RP02.P00.M00.S01", "CP00-107 next subphase");

if (errors.length > 0) {
  console.error("RP01 core-domain contract validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("RP01 core-domain contract validation passed.");
console.log(`pack: ${CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_PACK_BINDING.pack_id}`);
console.log(`entities: ${entityTypes.length}`);
console.log(`entrypoint: ${CORE_DOMAIN_SERVICE_ENTRYPOINT_CONTRACT.entrypoint_id}`);
console.log(`workflow: ${CORE_DOMAIN_WORKFLOW_CONTRACT.workflow_id}`);
console.log(`api: ${CORE_DOMAIN_API_CONTRACT.contract_id}`);
console.log(`ui_state: ${CORE_DOMAIN_UI_STATE_CONTRACT.contract_id}`);
console.log(`permission_audit_binding: ${CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.contract_id}`);
console.log(`permission_audit_fixture: ${CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.contract_id}`);
console.log(`synthetic_fixture_catalog: ${CORE_DOMAIN_SYNTHETIC_FIXTURE_CATALOG_CONTRACT.contract_id}`);
console.log(`permission_matrix: ${CORE_DOMAIN_PERMISSION_MATRIX_CONTRACT.contract_id}`);
console.log(`permission_review_packet: ${CORE_DOMAIN_PERMISSION_REVIEW_PACKET_CONTRACT.contract_id}`);
console.log(`failure_taxonomy: ${CORE_DOMAIN_FAILURE_TAXONOMY_CONTRACT.contract_id}`);
console.log(`evidence_review_catalog: ${CORE_DOMAIN_EVIDENCE_REVIEW_CATALOG_CONTRACT.contract_id}`);
console.log(`review_outcome_routing: ${CORE_DOMAIN_REVIEW_OUTCOME_ROUTING_CONTRACT.contract_id}`);
console.log(`review_closeout_readiness: ${CORE_DOMAIN_REVIEW_CLOSEOUT_READINESS_CONTRACT.contract_id}`);
