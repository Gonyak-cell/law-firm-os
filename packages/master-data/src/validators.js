import {
  MASTER_DATA_CONTACT_POINT_TYPES,
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
  MASTER_DATA_OWNER_BOUNDARIES,
  MASTER_DATA_PARTY_ALIAS_TYPES,
  MASTER_DATA_PARTY_IDENTIFIER_TYPES,
  MASTER_DATA_PARTY_TYPES,
  MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS,
  MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING,
  MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS,
  MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY,
  MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY,
  MASTER_DATA_PERMISSION_MATRIX_WORKFLOW,
  MASTER_DATA_PERMISSION_AUDIT_BINDING,
  MASTER_DATA_RELATIONSHIP_DIRECTIONS,
  MASTER_DATA_SERVICE_BOUNDARY,
  MASTER_DATA_SERVICE_OPERATIONS,
  MASTER_DATA_SERVICE_TAIL_BOUNDARY,
  MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY,
  MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG,
  MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS,
  MASTER_DATA_UI_INTERACTION_WORKFLOW,
  MASTER_DATA_UI_SURFACE_STATES,
  getMasterDataModelDefinition,
  listMasterDataModelTypes,
} from "./registry.js";
import { createMasterDataSyntheticFixture, missingRequiredFields } from "./model.js";

function freezeResult(result, binding = MASTER_DATA_CP156_PACK_BINDING) {
  return Object.freeze({
    ...result,
    pack_id: binding.pack_id,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    implements_ldip: false,
    splits_hrx_product: false,
  });
}

function pushUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

export function validateMasterDataRecord(modelType, record, options = {}) {
  const errors = [];
  const blocked_claims = [];
  const review_required_claims = [];
  let definition;

  try {
    definition = getMasterDataModelDefinition(modelType);
  } catch (error) {
    errors.push(error.message);
    pushUnique(blocked_claims, "unknown_model_type");
  }

  if (definition) {
    const missing = missingRequiredFields(modelType, record);
    if (missing.length > 0) {
      errors.push(`${modelType} missing required fields: ${missing.join(", ")}`);
      pushUnique(blocked_claims, "missing_required_fields");
    }
    if (!record?.tenant_id) pushUnique(blocked_claims, "tenant_scope_missing");
    if (record?.status && !definition.lifecycle_statuses.includes(record.status)) {
      errors.push(`${modelType} status must be one of ${definition.lifecycle_statuses.join(", ")}`);
      pushUnique(blocked_claims, "invalid_lifecycle_status");
    }
    if (options.owner_module && options.owner_module !== definition.owner_module) {
      errors.push(`${modelType} must remain owned by ${definition.owner_module}`);
      pushUnique(blocked_claims, "ownership_drift");
    }
    if (options.touches_matter_or_document === true && !record?.matter_id) {
      errors.push(`${modelType} requires matter_id when workflow touches Matter or document context`);
      pushUnique(blocked_claims, "missing_matter_trace");
    }
    if (record?.tenant_id && options.expected_tenant_id && record.tenant_id !== options.expected_tenant_id) {
      errors.push(`${modelType} tenant_id must match expected tenant ${options.expected_tenant_id}`);
      pushUnique(blocked_claims, "cross_tenant_reference");
    }
    if (record?.identity_key && options.known_identity_keys?.includes(record.identity_key)) {
      pushUnique(review_required_claims, "duplicate_identity_review_required");
    }
    if (modelType === "Party" && record?.party_type && !MASTER_DATA_PARTY_TYPES.includes(record.party_type)) {
      errors.push(`Party type must be one of ${MASTER_DATA_PARTY_TYPES.join(", ")}`);
      pushUnique(blocked_claims, "party_type_error");
    }
    if (modelType === "PartyAlias") {
      if (record?.alias_type && !MASTER_DATA_PARTY_ALIAS_TYPES.includes(record.alias_type)) {
        errors.push(`PartyAlias type must be one of ${MASTER_DATA_PARTY_ALIAS_TYPES.join(", ")}`);
        pushUnique(blocked_claims, "party_alias_type_error");
      }
      if (record?.normalized_alias_key && options.known_alias_keys?.includes(record.normalized_alias_key)) {
        pushUnique(review_required_claims, "duplicate_alias_review_required");
      }
    }
    if (modelType === "PartyIdentifier") {
      if (record?.identifier_type && !MASTER_DATA_PARTY_IDENTIFIER_TYPES.includes(record.identifier_type)) {
        errors.push(`PartyIdentifier type must be one of ${MASTER_DATA_PARTY_IDENTIFIER_TYPES.join(", ")}`);
        pushUnique(blocked_claims, "party_identifier_type_error");
      }
      if (record?.normalized_identifier_key && options.known_identifier_keys?.includes(record.normalized_identifier_key)) {
        pushUnique(review_required_claims, "duplicate_identifier_review_required");
      }
    }
    if (modelType === "Relationship") {
      if (record?.direction && !MASTER_DATA_RELATIONSHIP_DIRECTIONS.includes(record.direction)) {
        errors.push(`Relationship direction must be one of ${MASTER_DATA_RELATIONSHIP_DIRECTIONS.join(", ")}`);
        pushUnique(blocked_claims, "relationship_direction_error");
      }
      if (record?.from_entity_id && record?.to_entity_id && record.from_entity_id === record.to_entity_id) {
        errors.push("Relationship cannot point from and to the same entity");
        pushUnique(blocked_claims, "relationship_direction_error");
      }
      if (record?.from_party_id && record?.to_party_id && record.from_party_id === record.to_party_id) {
        errors.push("Relationship cannot point from and to the same party");
        pushUnique(blocked_claims, "relationship_party_endpoint_error");
      }
      if (options.party_types_by_id && record?.from_party_id && record?.to_party_id) {
        const fromType = options.party_types_by_id[record.from_party_id];
        const toType = options.party_types_by_id[record.to_party_id];
        const expectedPair = record.direction?.split("_to_") ?? [];
        if (expectedPair.length === 2 && fromType && toType && (fromType !== expectedPair[0] || toType !== expectedPair[1])) {
          errors.push("Relationship party endpoint types must match direction");
          pushUnique(blocked_claims, "relationship_direction_error");
        }
      }
    }
    if (modelType === "ClientGroup") {
      if (Array.isArray(options.member_tenant_ids)) {
        const leaked = options.member_tenant_ids.some((tenantId) => tenantId !== record?.tenant_id);
        if (leaked) {
          errors.push("ClientGroup member tenant IDs must not cross tenant scope");
          pushUnique(blocked_claims, "client_group_leakage");
        }
      }
      if (record?.primary_party_id && Array.isArray(record.member_party_ids) && !record.member_party_ids.includes(record.primary_party_id)) {
        errors.push("ClientGroup primary_party_id must be included in member_party_ids");
        pushUnique(blocked_claims, "client_group_primary_party_missing");
      }
    }
    if (modelType === "ContactPoint" && record?.contact_type && !MASTER_DATA_CONTACT_POINT_TYPES.includes(record.contact_type)) {
      errors.push(`ContactPoint type must be one of ${MASTER_DATA_CONTACT_POINT_TYPES.join(", ")}`);
      pushUnique(blocked_claims, "contact_point_type_error");
    }
    if (modelType === "BillingProfile") {
      if (options.require_legal_and_billing_client_refs === true && (!record?.legal_client_party_id || !record?.billing_client_party_id)) {
        errors.push("BillingProfile requires legal_client_party_id and billing_client_party_id for G2-B evidence");
        pushUnique(blocked_claims, "billing_profile_client_reference_error");
      }
      if (
        options.require_distinct_billing_client === true &&
        record?.legal_client_party_id &&
        record?.billing_client_party_id &&
        record.legal_client_party_id === record.billing_client_party_id
      ) {
        errors.push("BillingProfile billing_client_party_id must be distinct from legal_client_party_id for this workflow");
        pushUnique(blocked_claims, "billing_profile_client_reference_error");
      }
    }
  }

  return freezeResult({
    model_type: modelType,
    valid: errors.length === 0,
    checked: Object.freeze([
      "required_fields",
      "tenant_scope",
      "lifecycle_status",
      "ownership_boundary",
      "matter_trace_when_context_touched",
      "duplicate_identity_review",
      "party_type",
      "party_alias_type",
      "party_identifier_type",
      "duplicate_alias_review",
      "duplicate_identifier_review",
      "relationship_direction",
      "relationship_party_endpoints",
      "client_group_leakage",
      "client_group_primary_party",
      "contact_point_type",
      "billing_profile_client_references",
    ]),
    errors: Object.freeze(errors),
    blocked_claims: Object.freeze(blocked_claims),
    review_required_claims: Object.freeze(review_required_claims),
    no_write_attestation: MASTER_DATA_CP156_NO_WRITE_ATTESTATION,
  });
}

export function validateMasterDataRegistry(registry = MASTER_DATA_MODEL_DEFINITIONS) {
  const errors = [];
  const modelTypes = Object.keys(registry);
  for (const modelType of modelTypes) {
    const definition = registry[modelType];
    if (!definition.primary_id) errors.push(`${modelType} missing primary_id`);
    if (definition.tenant_field !== "tenant_id") errors.push(`${modelType} tenant field must be tenant_id`);
    if (definition.owner_module !== "MasterData") errors.push(`${modelType} owner_module must be MasterData`);
    if (!Array.isArray(definition.required_fields) || definition.required_fields.length === 0) {
      errors.push(`${modelType} missing required_fields`);
    }
    if (!definition.lifecycle_statuses?.includes("review_required")) {
      errors.push(`${modelType} lifecycle_statuses must include review_required`);
    }
    if (definition.matter_trace_policy !== "required_when_workflow_touches_matter_or_document") {
      errors.push(`${modelType} must declare conditional Matter trace policy`);
    }
  }
  return freezeResult({
    valid: errors.length === 0,
    model_count: modelTypes.length,
    model_types: Object.freeze(modelTypes),
    owner_boundaries: MASTER_DATA_OWNER_BOUNDARIES,
    errors: Object.freeze(errors),
  });
}

export function createMasterDataCp156CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult({
    pack_id: MASTER_DATA_CP156_PACK_BINDING.pack_id,
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: Object.freeze(byDeliverable),
    by_micro_phase: Object.freeze(byMicroPhase),
    model_types: listMasterDataModelTypes(),
    fixture_id: createMasterDataSyntheticFixture().fixture_id,
  });
}

export function validateMasterDataCp156Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-156 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP156_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-156");
  if (planPack?.risk_class !== MASTER_DATA_CP156_PACK_BINDING.risk_class) errors.push("CP00-156 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP156_PACK_BINDING.unit_count) errors.push("CP00-156 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP156_PACK_BINDING.first_unit_id) errors.push("CP00-156 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP156_PACK_BINDING.last_unit_id) errors.push("CP00-156 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-156 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-156 must only include RP04 units");
  const summary = createMasterDataCp156CoverageSummary(planPack);
  if (summary.by_deliverable.implementation !== 104) errors.push("CP00-156 implementation distribution drift");
  if (summary.by_deliverable.contract !== 3) errors.push("CP00-156 contract distribution drift");
  if (summary.by_deliverable.security_audit !== 6) errors.push("CP00-156 security_audit distribution drift");
  if (summary.by_deliverable.ui !== 19) errors.push("CP00-156 ui distribution drift");
  if (summary.by_deliverable.fixture !== 3) errors.push("CP00-156 fixture distribution drift");
  if (summary.by_deliverable.test !== 9) errors.push("CP00-156 test distribution drift");
  if (summary.by_deliverable.hermes_evidence !== 3) errors.push("CP00-156 hermes_evidence distribution drift");
  if (summary.by_deliverable.claude_review !== 3) errors.push("CP00-156 claude_review distribution drift");
  return freezeResult({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    summary,
  });
}

export function createMasterDataCp156HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp156Coverage(planPack);
  const registry = validateMasterDataRegistry();
  const fixture = createMasterDataSyntheticFixture();
  return freezeResult({
    evidence_packet: "H04.CP00-156.master_data_foundation_model_registry",
    gate: MASTER_DATA_CP156_PACK_BINDING.hermes_gate,
    pack_id: MASTER_DATA_CP156_PACK_BINDING.pack_id,
    coverage_valid: coverage.valid,
    registry_valid: registry.valid,
    model_count: registry.model_count,
    fixture_count: fixture.records.length,
    no_real_data: true,
    no_write_attestation: MASTER_DATA_CP156_NO_WRITE_ATTESTATION,
    blocked_claim_examples: Object.freeze([
      "duplicate_identity_review_required",
      "relationship_direction_error",
      "client_group_leakage",
      "missing_matter_trace",
      "ownership_drift",
    ]),
    next_pack_id: MASTER_DATA_CP156_PACK_BINDING.next_pack_id,
  });
}

export function createMasterDataCp156ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp156Coverage(planPack);
  return freezeResult({
    review_packet: "C04.CP00-156.master_data_foundation_model_registry",
    gate: MASTER_DATA_CP156_PACK_BINDING.claude_gate,
    required_model: "claude-opus-4-8",
    required_effort: "max",
    read_only: true,
    pack_id: MASTER_DATA_CP156_PACK_BINDING.pack_id,
    coverage_valid: coverage.valid,
    questions: Object.freeze([
      "Do RP04 model boundaries avoid duplicate identity and ownership drift?",
      "Are relationship direction error and client group leakage blocked or review-routed?",
      "Are Matter-first trace rules explicit when Matter or document context is touched?",
      "Are no-write and no-real-data boundaries preserved?",
      "Are H04/C04 evidence packets sufficient for CP00-156 closeout?",
    ]),
    next_pack_id: MASTER_DATA_CP156_PACK_BINDING.next_pack_id,
  });
}

export function createMasterDataCp156CloseoutHandoff() {
  return freezeResult({
    handoff_id: "master_data_cp156_to_cp157_handoff",
    from_pack_id: MASTER_DATA_CP156_PACK_BINDING.pack_id,
    to_pack_id: MASTER_DATA_CP156_PACK_BINDING.next_pack_id,
    next_subphase_id: MASTER_DATA_CP156_PACK_BINDING.next_subphase_id,
    closed_scope: MASTER_DATA_CP156_PACK_BINDING.range,
    open_scope: "Continue RP04.P01.M08 validation registry and subsequent RP04 model/service packs.",
    production_ready_flag: MASTER_DATA_CP156_PACK_BINDING.production_ready_flag,
  });
}

export function createMasterDataCp157CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP157_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      service_entrypoint: MASTER_DATA_SERVICE_BOUNDARY.service_entrypoint,
      supported_operations: MASTER_DATA_SERVICE_BOUNDARY.supported_operations,
      service_prechecks: MASTER_DATA_SERVICE_BOUNDARY.prechecks,
    },
    MASTER_DATA_CP157_PACK_BINDING,
  );
}

export function validateMasterDataCp157Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-157 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP157_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-157");
  if (planPack?.risk_class !== MASTER_DATA_CP157_PACK_BINDING.risk_class) errors.push("CP00-157 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP157_PACK_BINDING.unit_count) errors.push("CP00-157 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP157_PACK_BINDING.first_unit_id) errors.push("CP00-157 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP157_PACK_BINDING.last_unit_id) errors.push("CP00-157 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-157 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-157 must only include RP04 units");
  const summary = createMasterDataCp157CoverageSummary(planPack);
  if (summary.by_deliverable.implementation !== 73) errors.push("CP00-157 implementation distribution drift");
  if (summary.by_deliverable.ui !== 24) errors.push("CP00-157 ui distribution drift");
  if (summary.by_deliverable.contract !== 8) errors.push("CP00-157 contract distribution drift");
  if (summary.by_deliverable.security_audit !== 16) errors.push("CP00-157 security_audit distribution drift");
  if (summary.by_deliverable.claude_review !== 5) errors.push("CP00-157 claude_review distribution drift");
  if (summary.by_deliverable.failure_recovery !== 10) errors.push("CP00-157 failure_recovery distribution drift");
  if (summary.by_deliverable.test !== 14) errors.push("CP00-157 test distribution drift");
  if (summary.by_micro_phase["RP04.P01.M08"] !== 3) errors.push("CP00-157 RP04.P01.M08 distribution drift");
  if (summary.by_micro_phase["RP04.P01.M09"] !== 8) errors.push("CP00-157 RP04.P01.M09 distribution drift");
  if (summary.by_micro_phase["RP04.P01.M10"] !== 3) errors.push("CP00-157 RP04.P01.M10 distribution drift");
  if (summary.by_micro_phase["RP04.P02.M00"] !== 11) errors.push("CP00-157 RP04.P02.M00 distribution drift");
  if (summary.by_micro_phase["RP04.P02.M01"] !== 11) errors.push("CP00-157 RP04.P02.M01 distribution drift");
  if (summary.by_micro_phase["RP04.P02.M02"] !== 20) errors.push("CP00-157 RP04.P02.M02 distribution drift");
  if (summary.by_micro_phase["RP04.P02.M03"] !== 22) errors.push("CP00-157 RP04.P02.M03 distribution drift");
  if (summary.by_micro_phase["RP04.P02.M04"] !== 20) errors.push("CP00-157 RP04.P02.M04 distribution drift");
  if (summary.by_micro_phase["RP04.P02.M05"] !== 22) errors.push("CP00-157 RP04.P02.M05 distribution drift");
  if (summary.by_micro_phase["RP04.P02.M06"] !== 20) errors.push("CP00-157 RP04.P02.M06 distribution drift");
  if (summary.by_micro_phase["RP04.P02.M07"] !== 10) errors.push("CP00-157 RP04.P02.M07 distribution drift");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP157_PACK_BINDING,
  );
}

export function validateMasterDataCp157ServiceBoundary() {
  const errors = [];
  const operations = Object.keys(MASTER_DATA_SERVICE_OPERATIONS);
  if (MASTER_DATA_SERVICE_BOUNDARY.service_entrypoint !== "executeMasterDataServiceWorkflow") {
    errors.push("CP00-157 service entrypoint drift");
  }
  if (operations.length !== 5) errors.push("CP00-157 must expose five service operations");
  for (const operation of ["entity_creation", "client_grouping", "relationship_mapping", "contact_normalization", "duplicate_review"]) {
    if (!operations.includes(operation)) errors.push(`CP00-157 missing ${operation} operation`);
    if (!MASTER_DATA_SERVICE_BOUNDARY.supported_operations.includes(operation)) {
      errors.push(`CP00-157 boundary missing supported operation ${operation}`);
    }
  }
  for (const precheck of [
    "tenant_boundary_precheck",
    "matter_trace_precheck",
    "permission_precheck",
    "audit_hint_precheck",
    "state_transition_enforcement",
    "idempotency_key_handling",
  ]) {
    if (!MASTER_DATA_SERVICE_BOUNDARY.prechecks.includes(precheck)) errors.push(`CP00-157 missing ${precheck}`);
  }
  if (MASTER_DATA_CP157_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-157 must not write product state");
  if (MASTER_DATA_CP157_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-157 must not evaluate runtime permission");
  }
  if (MASTER_DATA_CP157_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-157 must not write audit events");
  if (MASTER_DATA_CP157_NO_WRITE_ATTESTATION.creates_database_rows !== false) errors.push("CP00-157 must not create database rows");
  if (MASTER_DATA_CP157_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-157 must not execute API handlers");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      operation_count: operations.length,
      supported_operations: MASTER_DATA_SERVICE_BOUNDARY.supported_operations,
      prechecks: MASTER_DATA_SERVICE_BOUNDARY.prechecks,
      no_write_attestation: MASTER_DATA_CP157_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP157_PACK_BINDING,
  );
}

export function createMasterDataCp157HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp157Coverage(planPack);
  const serviceBoundary = validateMasterDataCp157ServiceBoundary();
  return freezeResult(
    {
      evidence_packet: "H04.CP00-157.master_data_service_logic_boundary",
      gate: MASTER_DATA_CP157_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP157_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      service_boundary_valid: serviceBoundary.valid,
      operation_count: serviceBoundary.operation_count,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP157_NO_WRITE_ATTESTATION,
      blocked_claim_examples: MASTER_DATA_SERVICE_BOUNDARY.blocked_claims,
      review_required_routes: MASTER_DATA_SERVICE_BOUNDARY.review_required_routes,
      next_pack_id: MASTER_DATA_CP157_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP157_PACK_BINDING,
  );
}

export function createMasterDataCp157ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp157Coverage(planPack);
  const serviceBoundary = validateMasterDataCp157ServiceBoundary();
  return freezeResult(
    {
      review_packet: "C04.CP00-157.master_data_service_logic_boundary",
      gate: MASTER_DATA_CP157_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP157_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      service_boundary_valid: serviceBoundary.valid,
      questions: Object.freeze([
        "Does CP00-157 preserve descriptor-only service behavior with no persistence, API, permission, or audit execution?",
        "Are tenant, Matter, permission, audit hint, state transition, and idempotency prechecks explicit?",
        "Are duplicate identity, relationship direction, client group leakage, and missing Matter trace routed correctly?",
        "Does the CP00-157 coverage bind the planned 150 units without creating a one-unit closeout?",
        "Is CP00-158 handoff limited to RP04.P02.M07.S11 lock and tail service units?",
      ]),
      next_pack_id: MASTER_DATA_CP157_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP157_PACK_BINDING,
  );
}

export function createMasterDataCp157CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "master_data_cp157_to_cp158_handoff",
      from_pack_id: MASTER_DATA_CP157_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP157_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP157_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP157_PACK_BINDING.range,
      open_scope: "Continue RP04.P02.M07.S11-S20 lock, persistence, review, rollback, retry, and denied/review test tail.",
      production_ready_flag: MASTER_DATA_CP157_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP157_PACK_BINDING,
  );
}

export function createMasterDataCp158CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP158_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      tail_entrypoint: MASTER_DATA_SERVICE_TAIL_BOUNDARY.tail_entrypoint,
      validation_error_mapping: MASTER_DATA_SERVICE_TAIL_BOUNDARY.validation_error_mapping,
    },
    MASTER_DATA_CP158_PACK_BINDING,
  );
}

export function validateMasterDataCp158Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-158 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP158_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-158");
  if (planPack?.risk_class !== MASTER_DATA_CP158_PACK_BINDING.risk_class) errors.push("CP00-158 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP158_PACK_BINDING.unit_count) errors.push("CP00-158 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP158_PACK_BINDING.first_unit_id) errors.push("CP00-158 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP158_PACK_BINDING.last_unit_id) errors.push("CP00-158 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-158 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-158 must only include RP04 units");
  const summary = createMasterDataCp158CoverageSummary(planPack);
  if (summary.by_deliverable.ui !== 2) errors.push("CP00-158 ui distribution drift");
  if (summary.by_deliverable.implementation !== 3) errors.push("CP00-158 implementation distribution drift");
  if (summary.by_deliverable.claude_review !== 1) errors.push("CP00-158 claude_review distribution drift");
  if (summary.by_deliverable.failure_recovery !== 2) errors.push("CP00-158 failure_recovery distribution drift");
  if (summary.by_deliverable.test !== 2) errors.push("CP00-158 test distribution drift");
  if (summary.by_micro_phase["RP04.P02.M07"] !== 10) errors.push("CP00-158 RP04.P02.M07 distribution drift");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP158_PACK_BINDING,
  );
}

export function validateMasterDataCp158TailBoundary() {
  const errors = [];
  if (MASTER_DATA_SERVICE_TAIL_BOUNDARY.pack_id !== MASTER_DATA_CP158_PACK_BINDING.pack_id) {
    errors.push("CP00-158 tail boundary pack ID drift");
  }
  if (MASTER_DATA_SERVICE_TAIL_BOUNDARY.tail_entrypoint !== "createMasterDataServiceTailDescriptor") {
    errors.push("CP00-158 tail entrypoint drift");
  }
  if (MASTER_DATA_SERVICE_TAIL_BOUNDARY.lock_status !== "not_acquired_descriptor_only") {
    errors.push("CP00-158 lock status must remain descriptor-only");
  }
  if (!MASTER_DATA_SERVICE_TAIL_BOUNDARY.persistence_boundary.includes("never_write")) {
    errors.push("CP00-158 persistence boundary must prohibit writes");
  }
  const expectedValidationMappingClaims = [
    "tenant_scope_missing",
    "tenant_boundary_mismatch",
    "cross_tenant_reference",
    "permission_precheck_required",
    "audit_hint_precheck_required",
    "idempotency_key_required",
    "missing_matter_trace",
    "relationship_direction_error",
    "client_group_leakage",
    "unsupported_service_operation",
    "service_factory_descriptor_error",
  ];
  for (const claim of expectedValidationMappingClaims) {
    if (!MASTER_DATA_SERVICE_TAIL_BOUNDARY.validation_error_mapping[claim]) {
      errors.push(`CP00-158 missing validation error mapping for ${claim}`);
    }
  }
  for (const [claim, safeCode] of Object.entries(MASTER_DATA_SERVICE_TAIL_BOUNDARY.validation_error_mapping)) {
    if (!claim || typeof safeCode !== "string" || !safeCode.startsWith("MASTER_DATA_")) {
      errors.push(`CP00-158 invalid validation error mapping for ${claim}`);
    }
  }
  if (MASTER_DATA_CP158_NO_WRITE_ATTESTATION.acquires_runtime_lock !== false) errors.push("CP00-158 must not acquire runtime locks");
  if (MASTER_DATA_CP158_NO_WRITE_ATTESTATION.writes_persistence_boundary !== false) errors.push("CP00-158 must not write persistence");
  if (MASTER_DATA_CP158_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-158 must not dispatch review routes");
  if (MASTER_DATA_CP158_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-158 must not dispatch approval routes");
  if (MASTER_DATA_CP158_NO_WRITE_ATTESTATION.executes_rollback !== false) errors.push("CP00-158 must not execute rollback");
  if (MASTER_DATA_CP158_NO_WRITE_ATTESTATION.executes_retry !== false) errors.push("CP00-158 must not execute retry");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      tail_entrypoint: MASTER_DATA_SERVICE_TAIL_BOUNDARY.tail_entrypoint,
      validation_error_mapping: MASTER_DATA_SERVICE_TAIL_BOUNDARY.validation_error_mapping,
      no_write_attestation: MASTER_DATA_CP158_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP158_PACK_BINDING,
  );
}

export function createMasterDataCp158HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp158Coverage(planPack);
  const tailBoundary = validateMasterDataCp158TailBoundary();
  return freezeResult(
    {
      evidence_packet: "H04.CP00-158.master_data_service_tail_boundary",
      gate: MASTER_DATA_CP158_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP158_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      tail_boundary_valid: tailBoundary.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP158_NO_WRITE_ATTESTATION,
      validation_error_mapping: MASTER_DATA_SERVICE_TAIL_BOUNDARY.validation_error_mapping,
      next_pack_id: MASTER_DATA_CP158_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP158_PACK_BINDING,
  );
}

export function createMasterDataCp158ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp158Coverage(planPack);
  const tailBoundary = validateMasterDataCp158TailBoundary();
  return freezeResult(
    {
      review_packet: "C04.CP00-158.master_data_service_tail_boundary",
      gate: MASTER_DATA_CP158_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP158_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      tail_boundary_valid: tailBoundary.valid,
      questions: Object.freeze([
        "Does CP00-158 keep lock acquisition and persistence as descriptor-only no-op boundaries?",
        "Are validation errors mapped to customer-safe codes without sensitive internal values?",
        "Are review-required, approval-required, and blocked outputs routed without dispatching runtime actions?",
        "Are rollback and retry behaviors deterministic descriptors with no state mutation?",
        "Does CP00-158 hand off to CP00-159 / RP04.P02.M07.S21?",
      ]),
      next_pack_id: MASTER_DATA_CP158_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP158_PACK_BINDING,
  );
}

export function createMasterDataCp158CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "master_data_cp158_to_cp159_handoff",
      from_pack_id: MASTER_DATA_CP158_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP158_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP158_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP158_PACK_BINDING.range,
      open_scope: "Continue RP04.P02.M07.S21-RP04.P02.M09.S18 service test tail and RP04.P02.M08/M09 generated workflow evidence.",
      production_ready_flag: MASTER_DATA_CP158_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP158_PACK_BINDING,
  );
}

export function createMasterDataCp159CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP159_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      service_evidence_fields: MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_service_evidence_fields,
      required_tail_outcomes: MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_tail_outcomes,
    },
    MASTER_DATA_CP159_PACK_BINDING,
  );
}

export function validateMasterDataCp159Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-159 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP159_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-159");
  if (planPack?.risk_class !== MASTER_DATA_CP159_PACK_BINDING.risk_class) errors.push("CP00-159 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP159_PACK_BINDING.unit_count) errors.push("CP00-159 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP159_PACK_BINDING.first_unit_id) errors.push("CP00-159 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP159_PACK_BINDING.last_unit_id) errors.push("CP00-159 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-159 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-159 must only include RP04 units");
  const summary = createMasterDataCp159CoverageSummary(planPack);
  if (summary.by_deliverable.test !== 4) errors.push("CP00-159 test distribution drift");
  if (summary.by_deliverable.contract !== 2) errors.push("CP00-159 contract distribution drift");
  if (summary.by_deliverable.implementation !== 18) errors.push("CP00-159 implementation distribution drift");
  if (summary.by_deliverable.security_audit !== 4) errors.push("CP00-159 security_audit distribution drift");
  if (summary.by_deliverable.ui !== 6) errors.push("CP00-159 ui distribution drift");
  if (summary.by_deliverable.claude_review !== 2) errors.push("CP00-159 claude_review distribution drift");
  if (summary.by_deliverable.failure_recovery !== 4) errors.push("CP00-159 failure_recovery distribution drift");
  if (summary.by_micro_phase["RP04.P02.M07"] !== 2) errors.push("CP00-159 RP04.P02.M07 distribution drift");
  if (summary.by_micro_phase["RP04.P02.M08"] !== 20) errors.push("CP00-159 RP04.P02.M08 distribution drift");
  if (summary.by_micro_phase["RP04.P02.M09"] !== 18) errors.push("CP00-159 RP04.P02.M09 distribution drift");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP159_PACK_BINDING,
  );
}

export function validateMasterDataCp159ServiceEvidence(planPack, contractProjection = null) {
  const errors = [];
  const coverage = validateMasterDataCp159Coverage(planPack);
  if (!coverage.valid) errors.push(...coverage.errors);
  if (MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_tail_outcomes.length !== 4) {
    errors.push("CP00-159 must require four tail outcomes");
  }
  for (const outcome of ["passed", "review_required", "approval_required", "blocked"]) {
    if (!MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_tail_outcomes.includes(outcome)) {
      errors.push(`CP00-159 missing required tail outcome ${outcome}`);
    }
  }
  for (const field of [
    "service_entrypoint",
    "request_normalization",
    "tenant_boundary_precheck",
    "matter_trace_precheck",
    "permission_precheck",
    "audit_hint_precheck",
    "primary_happy_path",
    "secondary_workflow_path",
    "state_transition_enforcement",
    "idempotency_key_handling",
    "lock_acquisition_rule",
    "persistence_boundary",
    "validation_error_mapping",
    "review_required_routing",
    "approval_required_routing",
    "blocked_claim_output",
    "rollback_behavior",
    "retry_behavior",
  ]) {
    if (!MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_service_evidence_fields.includes(field)) {
      errors.push(`CP00-159 missing service evidence field ${field}`);
    }
  }
  if (contractProjection) {
    for (const outcome of MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_tail_outcomes) {
      if (!contractProjection.required_tail_outcomes?.includes?.(outcome)) {
        errors.push(`CP00-159 contract service evidence missing tail outcome ${outcome}`);
      }
    }
    for (const field of MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_service_evidence_fields) {
      if (!contractProjection.required_service_evidence_fields?.includes?.(field)) {
        errors.push(`CP00-159 contract service evidence missing field ${field}`);
      }
    }
    if (contractProjection.no_write_boundary !== MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.no_write_boundary) {
      errors.push("CP00-159 contract service evidence no-write boundary drift");
    }
    if (contractProjection.review_packet_mode !== MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.review_packet_mode) {
      errors.push("CP00-159 contract service evidence review packet mode drift");
    }
  }
  if (MASTER_DATA_CP159_NO_WRITE_ATTESTATION.builds_service_evidence_packet !== true) {
    errors.push("CP00-159 must build service evidence packets");
  }
  if (MASTER_DATA_CP159_NO_WRITE_ATTESTATION.builds_claude_review_packet !== true) {
    errors.push("CP00-159 must build Claude review packets");
  }
  if (MASTER_DATA_CP159_NO_WRITE_ATTESTATION.executes_hermes_command !== false) errors.push("CP00-159 must not execute Hermes commands");
  if (MASTER_DATA_CP159_NO_WRITE_ATTESTATION.executes_claude_review !== false) errors.push("CP00-159 must not execute Claude runtime review");
  if (MASTER_DATA_CP159_NO_WRITE_ATTESTATION.sends_claude_prompt !== false) errors.push("CP00-159 must not send Claude prompts from package code");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      requirements: MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS,
      no_write_attestation: MASTER_DATA_CP159_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP159_PACK_BINDING,
  );
}

export function createMasterDataCp159HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp159Coverage(planPack);
  const serviceEvidence = validateMasterDataCp159ServiceEvidence(planPack);
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.hermes_packet_id,
      gate: MASTER_DATA_CP159_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP159_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      service_evidence_valid: serviceEvidence.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP159_NO_WRITE_ATTESTATION,
      required_tail_outcomes: MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_tail_outcomes,
      required_service_evidence_fields: MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.required_service_evidence_fields,
      review_path_case_id: MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.review_path_case_id,
      integration_smoke_case_id: MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.integration_smoke_case_id,
      next_pack_id: MASTER_DATA_CP159_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP159_PACK_BINDING,
  );
}

export function createMasterDataCp159ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp159Coverage(planPack);
  const serviceEvidence = validateMasterDataCp159ServiceEvidence(planPack);
  return freezeResult(
    {
      review_packet: MASTER_DATA_CP159_SERVICE_EVIDENCE_REQUIREMENTS.claude_packet_id,
      gate: MASTER_DATA_CP159_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP159_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      service_evidence_valid: serviceEvidence.valid,
      questions: Object.freeze([
        "Does CP00-159 preserve CP00-157/158 descriptor-only service boundaries while adding review path and integration smoke evidence?",
        "Do the H04 evidence packet fields cover service entrypoint, normalization, security prechecks, state/idempotency, lock, persistence, mapping, routing, blocked output, rollback, and retry?",
        "Does the C04 review packet stay read-only and avoid package-level Claude execution or prompt sending?",
        "Are all required tail outcomes covered without dispatching routes, writing persistence, evaluating runtime permissions, or appending audit events?",
        "Does CP00-159 hand off to CP00-160 / RP04.P02.M09.S19?",
      ]),
      next_pack_id: MASTER_DATA_CP159_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP159_PACK_BINDING,
  );
}

export function createMasterDataCp159CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "master_data_cp159_to_cp160_handoff",
      from_pack_id: MASTER_DATA_CP159_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP159_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP159_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP159_PACK_BINDING.range,
      open_scope: "Continue RP04.P02.M09.S19 through generated CP00-160 Risk C service/fixture/evidence continuation.",
      production_ready_flag: MASTER_DATA_CP159_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP159_PACK_BINDING,
  );
}

export function createMasterDataCp160CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP160_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      api_surface_id: MASTER_DATA_API_REFERENCE_SURFACE.api_surface_id,
      ui_surface_id: MASTER_DATA_UI_SURFACE_STATES.surface_id,
      api_fixture_ids: MASTER_DATA_API_REFERENCE_SURFACE.api_fixture_ids,
      ui_state_keys: Object.freeze(Object.keys(MASTER_DATA_UI_SURFACE_STATES.states)),
    },
    MASTER_DATA_CP160_PACK_BINDING,
  );
}

export function validateMasterDataCp160Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-160 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP160_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-160");
  if (planPack?.risk_class !== MASTER_DATA_CP160_PACK_BINDING.risk_class) errors.push("CP00-160 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP160_PACK_BINDING.unit_count) errors.push("CP00-160 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP160_PACK_BINDING.first_unit_id) errors.push("CP00-160 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP160_PACK_BINDING.last_unit_id) errors.push("CP00-160 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-160 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-160 must only include RP04 units");
  const summary = createMasterDataCp160CoverageSummary(planPack);
  if (summary.by_deliverable.test !== 12) errors.push("CP00-160 test distribution drift");
  if (summary.by_deliverable.contract !== 35) errors.push("CP00-160 contract distribution drift");
  if (summary.by_deliverable.implementation !== 56) errors.push("CP00-160 implementation distribution drift");
  if (summary.by_deliverable.security_audit !== 18) errors.push("CP00-160 security_audit distribution drift");
  if (summary.by_deliverable.ui !== 21) errors.push("CP00-160 ui distribution drift");
  if (summary.by_deliverable.hermes_evidence !== 3) errors.push("CP00-160 hermes_evidence distribution drift");
  if (summary.by_deliverable.claude_review !== 5) errors.push("CP00-160 claude_review distribution drift");
  const expectedMicroCounts = {
    "RP04.P02.M09": 2,
    "RP04.P02.M10": 11,
    "RP04.P03.M00": 3,
    "RP04.P03.M01": 3,
    "RP04.P03.M02": 8,
    "RP04.P03.M03": 20,
    "RP04.P03.M04": 11,
    "RP04.P03.M05": 20,
    "RP04.P03.M06": 8,
    "RP04.P03.M07": 20,
    "RP04.P03.M08": 8,
    "RP04.P03.M09": 8,
    "RP04.P03.M10": 3,
    "RP04.P04.M00": 4,
    "RP04.P04.M01": 8,
    "RP04.P04.M02": 8,
    "RP04.P04.M03": 5,
  };
  for (const [microPhaseId, expectedCount] of Object.entries(expectedMicroCounts)) {
    if (summary.by_micro_phase[microPhaseId] !== expectedCount) {
      errors.push(`CP00-160 ${microPhaseId} distribution drift`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP160_PACK_BINDING,
  );
}

export function validateMasterDataCp160ApiUiReference(contractProjection = null) {
  const errors = [];
  const endpointIds = Object.keys(MASTER_DATA_API_REFERENCE_SURFACE.endpoints);
  if (MASTER_DATA_API_REFERENCE_SURFACE.pack_id !== MASTER_DATA_CP160_PACK_BINDING.pack_id) errors.push("CP00-160 API surface pack ID drift");
  if (MASTER_DATA_API_REFERENCE_SURFACE.api_surface_id !== "master_data_api_reference_descriptor_catalog") {
    errors.push("CP00-160 API surface ID drift");
  }
  for (const endpointId of ["records_search", "relationship_lookup", "client_group_resolution"]) {
    if (!endpointIds.includes(endpointId)) errors.push(`CP00-160 missing API endpoint ${endpointId}`);
  }
  for (const field of ["tenant_id", "actor_user_id", "permission_ref", "audit_hint_ref", "request_id", "model_type", "cursor", "limit", "filters"]) {
    if (!MASTER_DATA_API_REFERENCE_SURFACE.request_fields.includes(field)) errors.push(`CP00-160 missing API request field ${field}`);
  }
  for (const field of ["request_id", "outcome", "items", "page_info", "safe_error_codes", "omitted_fields", "audit_hint_ref"]) {
    if (!MASTER_DATA_API_REFERENCE_SURFACE.response_fields.includes(field)) errors.push(`CP00-160 missing API response field ${field}`);
  }
  for (const code of [
    "validation_error",
    "permission_required",
    "audit_hint_required",
    "tenant_required",
    "unauthorized_omission",
    "unsupported_filter",
  ]) {
    if (!MASTER_DATA_API_REFERENCE_SURFACE.error_code_taxonomy[code]) errors.push(`CP00-160 missing API error code ${code}`);
  }
  if (MASTER_DATA_API_REFERENCE_SURFACE.api_fixture_ids.length !== 3) errors.push("CP00-160 must expose three API fixture IDs");
  const stateKeys = Object.keys(MASTER_DATA_UI_SURFACE_STATES.states);
  for (const state of ["loading", "empty", "denied", "review_required", "primary_interaction", "secondary_interaction"]) {
    if (!stateKeys.includes(state)) errors.push(`CP00-160 missing UI state ${state}`);
  }
  for (const dependency of ["tenant_id", "permission_ref", "audit_hint_ref", "api_reference_fixture_id"]) {
    if (!MASTER_DATA_UI_SURFACE_STATES.data_dependencies.includes(dependency)) errors.push(`CP00-160 missing UI data dependency ${dependency}`);
  }
  if (MASTER_DATA_CP160_NO_WRITE_ATTESTATION.builds_api_reference_catalog !== true) {
    errors.push("CP00-160 must build API reference catalog descriptors");
  }
  if (MASTER_DATA_CP160_NO_WRITE_ATTESTATION.builds_ui_surface_state_catalog !== true) {
    errors.push("CP00-160 must build UI surface state descriptors");
  }
  if (MASTER_DATA_CP160_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-160 must not execute API handlers");
  if (MASTER_DATA_CP160_NO_WRITE_ATTESTATION.renders_ui !== false) errors.push("CP00-160 must not render UI");
  if (MASTER_DATA_CP160_NO_WRITE_ATTESTATION.mutates_dom !== false) errors.push("CP00-160 must not mutate DOM");
  if (contractProjection) {
    if (contractProjection.api_reference?.api_surface_id !== MASTER_DATA_API_REFERENCE_SURFACE.api_surface_id) {
      errors.push("CP00-160 contract API surface ID drift");
    }
    for (const endpointId of endpointIds) {
      const contractEndpoint = contractProjection.api_reference?.endpoints?.[endpointId];
      const expectedEndpoint = MASTER_DATA_API_REFERENCE_SURFACE.endpoints[endpointId];
      if (contractEndpoint?.method !== expectedEndpoint.method) errors.push(`CP00-160 contract endpoint ${endpointId} method drift`);
      if (contractEndpoint?.path !== expectedEndpoint.path) errors.push(`CP00-160 contract endpoint ${endpointId} path drift`);
    }
    if (contractProjection.ui_surface?.surface_id !== MASTER_DATA_UI_SURFACE_STATES.surface_id) {
      errors.push("CP00-160 contract UI surface ID drift");
    }
    for (const surface of MASTER_DATA_UI_SURFACE_STATES.surfaces) {
      if (!contractProjection.ui_surface?.surfaces?.includes?.(surface)) errors.push(`CP00-160 contract UI surface missing ${surface}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      api_surface: MASTER_DATA_API_REFERENCE_SURFACE,
      ui_surface_states: MASTER_DATA_UI_SURFACE_STATES,
      no_write_attestation: MASTER_DATA_CP160_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP160_PACK_BINDING,
  );
}

export function createMasterDataCp160HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp160Coverage(planPack);
  const apiUiReference = validateMasterDataCp160ApiUiReference();
  return freezeResult(
    {
      evidence_packet: "H04.CP00-160.master_data_api_ui_reference_catalog",
      gate: MASTER_DATA_CP160_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP160_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      api_ui_reference_valid: apiUiReference.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP160_NO_WRITE_ATTESTATION,
      endpoint_ids: Object.freeze(Object.keys(MASTER_DATA_API_REFERENCE_SURFACE.endpoints)),
      fixture_ids: MASTER_DATA_API_REFERENCE_SURFACE.api_fixture_ids,
      ui_states: MASTER_DATA_UI_SURFACE_STATES.states,
      next_pack_id: MASTER_DATA_CP160_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP160_PACK_BINDING,
  );
}

export function createMasterDataCp160ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp160Coverage(planPack);
  const apiUiReference = validateMasterDataCp160ApiUiReference();
  return freezeResult(
    {
      review_packet: "C04.CP00-160.master_data_api_ui_reference_catalog",
      gate: MASTER_DATA_CP160_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP160_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      api_ui_reference_valid: apiUiReference.valid,
      questions: Object.freeze([
        "Does CP00-160 keep API references as descriptors without executing API handlers or issuing network requests?",
        "Do API fixtures cover happy, invalid, and denied outcomes with safe error codes and hidden-field serialization guards?",
        "Do unauthorized responses omit protected items and internal claim references?",
        "Do UI surface states describe loading, empty, denied, review, primary, and secondary interactions without rendering or mutating DOM?",
        "Does CP00-160 hand off cleanly to CP00-161 / RP04.P04.M03.S06?",
      ]),
      next_pack_id: MASTER_DATA_CP160_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP160_PACK_BINDING,
  );
}

export function createMasterDataCp160CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "master_data_cp160_to_cp161_handoff",
      from_pack_id: MASTER_DATA_CP160_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP160_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP160_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP160_PACK_BINDING.range,
      open_scope: "Continue RP04.P04.M03.S06 generated Master Data API/UI runtime planning into CP00-161.",
      production_ready_flag: MASTER_DATA_CP160_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP160_PACK_BINDING,
  );
}

export function createMasterDataCp161CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP161_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      workflow_id: MASTER_DATA_UI_INTERACTION_WORKFLOW.workflow_id,
      fixture_ids: MASTER_DATA_UI_INTERACTION_WORKFLOW.fixture_ids,
      covered_slices: MASTER_DATA_UI_INTERACTION_WORKFLOW.covered_slices,
    },
    MASTER_DATA_CP161_PACK_BINDING,
  );
}

export function validateMasterDataCp161Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-161 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP161_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-161");
  if (planPack?.risk_class !== MASTER_DATA_CP161_PACK_BINDING.risk_class) errors.push("CP00-161 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP161_PACK_BINDING.unit_count) errors.push("CP00-161 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP161_PACK_BINDING.first_unit_id) errors.push("CP00-161 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP161_PACK_BINDING.last_unit_id) errors.push("CP00-161 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-161 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-161 must only include RP04 units");
  const summary = createMasterDataCp161CoverageSummary(planPack);
  if (summary.by_deliverable.claude_review !== 4) errors.push("CP00-161 claude_review distribution drift");
  if (summary.by_deliverable.ui !== 16) errors.push("CP00-161 ui distribution drift");
  if (summary.by_deliverable.security_audit !== 4) errors.push("CP00-161 security_audit distribution drift");
  if (summary.by_deliverable.implementation !== 10) errors.push("CP00-161 implementation distribution drift");
  if (summary.by_deliverable.fixture !== 2) errors.push("CP00-161 fixture distribution drift");
  if (summary.by_deliverable.test !== 2) errors.push("CP00-161 test distribution drift");
  if (summary.by_deliverable.hermes_evidence !== 2) errors.push("CP00-161 hermes_evidence distribution drift");
  if (summary.by_micro_phase["RP04.P04.M03"] !== 15) errors.push("CP00-161 RP04.P04.M03 distribution drift");
  if (summary.by_micro_phase["RP04.P04.M04"] !== 20) errors.push("CP00-161 RP04.P04.M04 distribution drift");
  if (summary.by_micro_phase["RP04.P04.M05"] !== 5) errors.push("CP00-161 RP04.P04.M05 distribution drift");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP161_PACK_BINDING,
  );
}

export function validateMasterDataCp161UiInteractionWorkflow(contractProjection = null) {
  const errors = [];
  if (MASTER_DATA_UI_INTERACTION_WORKFLOW.pack_id !== MASTER_DATA_CP161_PACK_BINDING.pack_id) {
    errors.push("CP00-161 UI interaction workflow pack ID drift");
  }
  if (MASTER_DATA_UI_INTERACTION_WORKFLOW.workflow_id !== "master_data_ui_interaction_workflow_catalog") {
    errors.push("CP00-161 workflow ID drift");
  }
  for (const slice of ["primary_implementation_slice", "secondary_workflow_slice", "permission_audit_binding_entry"]) {
    if (!MASTER_DATA_UI_INTERACTION_WORKFLOW.covered_slices.includes(slice)) errors.push(`CP00-161 missing covered slice ${slice}`);
  }
  for (const state of [
    "review_required",
    "primary_interaction",
    "secondary_interaction",
    "permission_badge",
    "audit_hint_display",
    "error_message_copy",
    "responsive_desktop_layout",
    "responsive_mobile_layout",
    "keyboard_focus_behavior",
    "visual_density_check",
  ]) {
    if (!MASTER_DATA_UI_INTERACTION_WORKFLOW.interaction_states[state]) errors.push(`CP00-161 missing interaction state ${state}`);
  }
  for (const dependency of ["tenant_id", "permission_ref", "audit_hint_ref", "api_reference_fixture_id", "ui_surface_state_id", "safe_error_code"]) {
    if (!MASTER_DATA_UI_INTERACTION_WORKFLOW.data_dependencies.includes(dependency)) errors.push(`CP00-161 missing data dependency ${dependency}`);
  }
  for (const descriptor of ["build_smoke", "hermes_ui_evidence", "claude_ui_leak_prompt", "closeout_handoff"]) {
    if (!MASTER_DATA_UI_INTERACTION_WORKFLOW.evidence_descriptors[descriptor]) errors.push(`CP00-161 missing evidence descriptor ${descriptor}`);
  }
  if (MASTER_DATA_UI_INTERACTION_WORKFLOW.fixture_ids.length !== 3) errors.push("CP00-161 must expose three UI interaction fixture IDs");
  if (MASTER_DATA_CP161_NO_WRITE_ATTESTATION.builds_ui_interaction_workflow !== true) {
    errors.push("CP00-161 must build UI interaction workflow descriptors");
  }
  if (MASTER_DATA_CP161_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-161 must not evaluate runtime permissions");
  if (MASTER_DATA_CP161_NO_WRITE_ATTESTATION.appends_audit_event !== false) errors.push("CP00-161 must not append audit events");
  if (MASTER_DATA_CP161_NO_WRITE_ATTESTATION.renders_ui !== false) errors.push("CP00-161 must not render UI");
  if (MASTER_DATA_CP161_NO_WRITE_ATTESTATION.mutates_dom !== false) errors.push("CP00-161 must not mutate DOM");
  if (MASTER_DATA_CP161_NO_WRITE_ATTESTATION.sends_claude_prompt !== false) errors.push("CP00-161 must not send Claude prompts from package code");
  if (contractProjection) {
    if (contractProjection.ui_interaction_workflow?.workflow_id !== MASTER_DATA_UI_INTERACTION_WORKFLOW.workflow_id) {
      errors.push("CP00-161 contract UI interaction workflow ID drift");
    }
    if (
      JSON.stringify(contractProjection.ui_interaction_workflow?.covered_slices ?? []) !==
      JSON.stringify(MASTER_DATA_UI_INTERACTION_WORKFLOW.covered_slices)
    ) {
      errors.push("CP00-161 contract covered slices drift");
    }
    if (
      JSON.stringify(contractProjection.ui_interaction_workflow?.data_dependencies ?? []) !==
      JSON.stringify(MASTER_DATA_UI_INTERACTION_WORKFLOW.data_dependencies)
    ) {
      errors.push("CP00-161 contract data dependencies drift");
    }
    if (
      JSON.stringify(contractProjection.ui_interaction_workflow?.fixture_ids ?? []) !==
      JSON.stringify(MASTER_DATA_UI_INTERACTION_WORKFLOW.fixture_ids)
    ) {
      errors.push("CP00-161 contract fixture IDs drift");
    }
    for (const fixtureId of MASTER_DATA_UI_INTERACTION_WORKFLOW.fixture_ids) {
      if (!contractProjection.ui_interaction_workflow?.fixture_ids?.includes?.(fixtureId)) {
        errors.push(`CP00-161 contract UI interaction fixture missing ${fixtureId}`);
      }
    }
    const contractRules = contractProjection.ui_interaction_workflow?.security_display_rules;
    if (contractRules?.permission_badge_source !== MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.permission_badge_source) {
      errors.push("CP00-161 contract permission badge source drift");
    }
    if (contractRules?.audit_hint_source !== MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.audit_hint_source) {
      errors.push("CP00-161 contract audit hint source drift");
    }
    if (contractRules?.denied_copy_source !== MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.denied_copy_source) {
      errors.push("CP00-161 contract denied copy source drift");
    }
    if (
      JSON.stringify(contractRules?.prohibited_outputs ?? []) !==
      JSON.stringify(MASTER_DATA_UI_INTERACTION_WORKFLOW.security_display_rules.prohibited_outputs)
    ) {
      errors.push("CP00-161 contract prohibited outputs drift");
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      workflow: MASTER_DATA_UI_INTERACTION_WORKFLOW,
      no_write_attestation: MASTER_DATA_CP161_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP161_PACK_BINDING,
  );
}

export function createMasterDataCp161HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp161Coverage(planPack);
  const workflow = validateMasterDataCp161UiInteractionWorkflow();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_UI_INTERACTION_WORKFLOW.evidence_descriptors.hermes_ui_evidence,
      gate: MASTER_DATA_CP161_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP161_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      ui_interaction_workflow_valid: workflow.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP161_NO_WRITE_ATTESTATION,
      fixture_ids: MASTER_DATA_UI_INTERACTION_WORKFLOW.fixture_ids,
      covered_slices: MASTER_DATA_UI_INTERACTION_WORKFLOW.covered_slices,
      next_pack_id: MASTER_DATA_CP161_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP161_PACK_BINDING,
  );
}

export function createMasterDataCp161ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp161Coverage(planPack);
  const workflow = validateMasterDataCp161UiInteractionWorkflow();
  return freezeResult(
    {
      review_packet: MASTER_DATA_UI_INTERACTION_WORKFLOW.evidence_descriptors.claude_ui_leak_prompt,
      gate: MASTER_DATA_CP161_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP161_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      ui_interaction_workflow_valid: workflow.valid,
      questions: Object.freeze([
        "Does CP00-161 describe UI interaction workflow states without rendering UI, mutating DOM, or executing API handlers?",
        "Are permission badges and audit hint displays descriptor-only and free of raw permission rules or audit internals?",
        "Do primary, secondary, denied, empty, and review-required fixtures avoid leaking hidden source values or internal blocked claim refs?",
        "Do responsive layout, keyboard focus, visual density, build smoke, Hermes evidence, and Claude leak prompt descriptors remain no-write?",
        "Does CP00-161 hand off cleanly to CP00-162 / RP04.P04.M05.S06?",
      ]),
      next_pack_id: MASTER_DATA_CP161_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP161_PACK_BINDING,
  );
}

export function createMasterDataCp161CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_UI_INTERACTION_WORKFLOW.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP161_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP161_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP161_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP161_PACK_BINDING.range,
      open_scope: "Continue RP04.P04.M05.S06 generated Master Data permission and audit binding sensitive boundary in CP00-162.",
      production_ready_flag: MASTER_DATA_CP161_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP161_PACK_BINDING,
  );
}

export function createMasterDataCp162CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP162_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      binding_id: MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id,
      fixture_ids: MASTER_DATA_PERMISSION_AUDIT_BINDING.fixture_ids,
      covered_unit_titles: MASTER_DATA_PERMISSION_AUDIT_BINDING.covered_unit_titles,
    },
    MASTER_DATA_CP162_PACK_BINDING,
  );
}

export function validateMasterDataCp162Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-162 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP162_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-162");
  if (planPack?.risk_class !== MASTER_DATA_CP162_PACK_BINDING.risk_class) errors.push("CP00-162 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP162_PACK_BINDING.unit_count) errors.push("CP00-162 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP162_PACK_BINDING.first_unit_id) errors.push("CP00-162 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP162_PACK_BINDING.last_unit_id) errors.push("CP00-162 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-162 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-162 must only include RP04 units");
  const summary = createMasterDataCp162CoverageSummary(planPack);
  if (summary.by_deliverable.claude_review !== 1) errors.push("CP00-162 claude_review distribution drift");
  if (summary.by_deliverable.ui !== 4) errors.push("CP00-162 ui distribution drift");
  if (summary.by_deliverable.security_audit !== 2) errors.push("CP00-162 security_audit distribution drift");
  if (summary.by_deliverable.implementation !== 3) errors.push("CP00-162 implementation distribution drift");
  if (summary.by_micro_phase["RP04.P04.M05"] !== 10) errors.push("CP00-162 RP04.P04.M05 distribution drift");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP162_PACK_BINDING,
  );
}

export function validateMasterDataCp162PermissionAuditBinding(contractProjection = null) {
  const errors = [];
  if (MASTER_DATA_PERMISSION_AUDIT_BINDING.pack_id !== MASTER_DATA_CP162_PACK_BINDING.pack_id) {
    errors.push("CP00-162 permission/audit binding pack ID drift");
  }
  if (MASTER_DATA_PERMISSION_AUDIT_BINDING.source_workflow_id !== MASTER_DATA_UI_INTERACTION_WORKFLOW.workflow_id) {
    errors.push("CP00-162 source workflow ID drift");
  }
  if (MASTER_DATA_PERMISSION_AUDIT_BINDING.renderable_surface !== "customer_facing_descriptor_only") {
    errors.push("CP00-162 renderable surface must be customer-facing descriptor only");
  }
  for (const state of [
    "review_required",
    "primary_interaction",
    "secondary_interaction",
    "permission_badge",
    "audit_hint_display",
    "error_message_copy",
    "responsive_desktop_layout",
    "responsive_mobile_layout",
    "keyboard_focus_behavior",
    "visual_density_check",
  ]) {
    if (!MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_states[state]) errors.push(`CP00-162 missing binding state ${state}`);
  }
  for (const ref of ["tenant_id", "actor_user_id", "permission_ref", "audit_hint_ref", "ui_surface_state_id", "safe_error_code"]) {
    if (!MASTER_DATA_PERMISSION_AUDIT_BINDING.required_descriptor_refs.includes(ref)) errors.push(`CP00-162 missing descriptor ref ${ref}`);
  }
  if (MASTER_DATA_PERMISSION_AUDIT_BINDING.permission_badge_contract.evaluates_runtime_permission !== false) {
    errors.push("CP00-162 must not evaluate runtime permission from permission badge");
  }
  if (MASTER_DATA_PERMISSION_AUDIT_BINDING.audit_hint_contract.appends_audit_event !== false) {
    errors.push("CP00-162 must not append audit event from audit hint display");
  }
  if (MASTER_DATA_PERMISSION_AUDIT_BINDING.interaction_contract.executes_api_handler !== false) {
    errors.push("CP00-162 must not execute API handlers from interactions");
  }
  if (MASTER_DATA_PERMISSION_AUDIT_BINDING.layout_contract.text_overlap_allowed !== false) {
    errors.push("CP00-162 layout must forbid text overlap");
  }
  for (const code of [
    "MASTER_DATA_PERMISSION_DESCRIPTOR_REQUIRED",
    "MASTER_DATA_AUDIT_HINT_REQUIRED",
    "MASTER_DATA_API_UNAUTHORIZED_OMISSION",
    "MASTER_DATA_REVIEW_REQUIRED",
  ]) {
    if (!MASTER_DATA_PERMISSION_AUDIT_BINDING.safe_error_contract.allowed_safe_error_codes.includes(code)) {
      errors.push(`CP00-162 missing safe error code ${code}`);
    }
  }
  if (MASTER_DATA_PERMISSION_AUDIT_BINDING.fixture_ids.length !== 4) errors.push("CP00-162 must expose four binding fixture IDs");
  if (MASTER_DATA_CP162_NO_WRITE_ATTESTATION.builds_permission_audit_binding_descriptor !== true) {
    errors.push("CP00-162 must build permission/audit binding descriptors");
  }
  if (MASTER_DATA_CP162_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-162 must not evaluate runtime permissions");
  if (MASTER_DATA_CP162_NO_WRITE_ATTESTATION.appends_audit_event !== false) errors.push("CP00-162 must not append audit events");
  if (MASTER_DATA_CP162_NO_WRITE_ATTESTATION.renders_ui !== false) errors.push("CP00-162 must not render UI");
  if (MASTER_DATA_CP162_NO_WRITE_ATTESTATION.mutates_dom !== false) errors.push("CP00-162 must not mutate DOM");
  if (contractProjection) {
    const contractBinding = contractProjection.permission_audit_binding;
    if (contractBinding?.pack_id !== MASTER_DATA_PERMISSION_AUDIT_BINDING.pack_id) {
      errors.push("CP00-162 contract permission/audit pack ID drift");
    }
    if (contractBinding?.binding_id !== MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id) {
      errors.push("CP00-162 contract permission/audit binding ID drift");
    }
    if (contractBinding?.source_workflow_id !== MASTER_DATA_PERMISSION_AUDIT_BINDING.source_workflow_id) {
      errors.push("CP00-162 contract source workflow ID drift");
    }
    if (contractBinding?.renderable_surface !== MASTER_DATA_PERMISSION_AUDIT_BINDING.renderable_surface) {
      errors.push("CP00-162 contract renderable surface drift");
    }
    if (
      JSON.stringify(contractBinding?.required_descriptor_refs ?? []) !==
      JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_BINDING.required_descriptor_refs)
    ) {
      errors.push("CP00-162 contract required descriptor refs drift");
    }
    if (JSON.stringify(contractBinding?.fixture_ids ?? []) !== JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_BINDING.fixture_ids)) {
      errors.push("CP00-162 contract fixture IDs drift");
    }
    for (const [state, value] of Object.entries(MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_states)) {
      if (contractBinding?.binding_states?.[state] !== value) errors.push(`CP00-162 contract binding state ${state} drift`);
    }
    if (
      contractBinding?.safe_error_contract?.source !== MASTER_DATA_PERMISSION_AUDIT_BINDING.safe_error_contract.source
    ) {
      errors.push("CP00-162 contract safe error source drift");
    }
    if (
      JSON.stringify(contractBinding?.safe_error_contract?.allowed_safe_error_codes ?? []) !==
      JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_BINDING.safe_error_contract.allowed_safe_error_codes)
    ) {
      errors.push("CP00-162 contract allowed safe error codes drift");
    }
    if (
      JSON.stringify(contractBinding?.safe_error_contract?.prohibited_outputs ?? []) !==
      JSON.stringify(MASTER_DATA_PERMISSION_AUDIT_BINDING.safe_error_contract.prohibited_outputs)
    ) {
      errors.push("CP00-162 contract prohibited outputs drift");
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      binding: MASTER_DATA_PERMISSION_AUDIT_BINDING,
      no_write_attestation: MASTER_DATA_CP162_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP162_PACK_BINDING,
  );
}

export function createMasterDataCp162HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp162Coverage(planPack);
  const binding = validateMasterDataCp162PermissionAuditBinding();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_PERMISSION_AUDIT_BINDING.evidence_descriptors.hermes_permission_audit_evidence,
      gate: MASTER_DATA_CP162_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP162_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_binding_valid: binding.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP162_NO_WRITE_ATTESTATION,
      fixture_ids: MASTER_DATA_PERMISSION_AUDIT_BINDING.fixture_ids,
      next_pack_id: MASTER_DATA_CP162_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP162_PACK_BINDING,
  );
}

export function createMasterDataCp162ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp162Coverage(planPack);
  const binding = validateMasterDataCp162PermissionAuditBinding();
  return freezeResult(
    {
      review_packet: MASTER_DATA_PERMISSION_AUDIT_BINDING.evidence_descriptors.claude_permission_audit_review,
      gate: MASTER_DATA_CP162_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP162_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_binding_valid: binding.valid,
      questions: Object.freeze([
        "Does CP00-162 keep permission badges descriptor-only without evaluating runtime permission?",
        "Does CP00-162 display audit hints without appending audit events or exposing audit internals?",
        "Do review-required, denied, permission-missing, and audit-missing descriptors expose only safe error copy?",
        "Do desktop/mobile layout, keyboard focus, and visual density descriptors avoid text overlap or hidden required controls?",
        "Does CP00-162 hand off cleanly to CP00-163 / RP04.P04.M05.S16?",
      ]),
      next_pack_id: MASTER_DATA_CP162_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP162_PACK_BINDING,
  );
}

export function createMasterDataCp162CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_PERMISSION_AUDIT_BINDING.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP162_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP162_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP162_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP162_PACK_BINDING.range,
      open_scope: "Continue RP04.P04.M05.S16 generated Master Data permission/audit tail into CP00-163.",
      production_ready_flag: MASTER_DATA_CP162_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP162_PACK_BINDING,
  );
}

export function createMasterDataCp163CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP163_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      fixture_entry_id: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_entry_id,
      fixture_ids: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_ids,
      covered_unit_titles: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.covered_unit_titles,
    },
    MASTER_DATA_CP163_PACK_BINDING,
  );
}

export function validateMasterDataCp163Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-163 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP163_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-163");
  if (planPack?.risk_class !== MASTER_DATA_CP163_PACK_BINDING.risk_class) errors.push("CP00-163 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP163_PACK_BINDING.unit_count) errors.push("CP00-163 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP163_PACK_BINDING.first_unit_id) errors.push("CP00-163 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP163_PACK_BINDING.last_unit_id) errors.push("CP00-163 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-163 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-163 must only include RP04 units");
  const summary = createMasterDataCp163CoverageSummary(planPack);
  if (summary.by_deliverable.fixture !== 1) errors.push("CP00-163 fixture distribution drift");
  if (summary.by_deliverable.test !== 1) errors.push("CP00-163 test distribution drift");
  if (summary.by_deliverable.hermes_evidence !== 1) errors.push("CP00-163 hermes_evidence distribution drift");
  if (summary.by_deliverable.claude_review !== 1) errors.push("CP00-163 claude_review distribution drift");
  if (summary.by_deliverable.implementation !== 2) errors.push("CP00-163 implementation distribution drift");
  if (summary.by_deliverable.ui !== 4) errors.push("CP00-163 ui distribution drift");
  if (summary.by_micro_phase["RP04.P04.M05"] !== 5) errors.push("CP00-163 RP04.P04.M05 distribution drift");
  if (summary.by_micro_phase["RP04.P04.M06"] !== 5) errors.push("CP00-163 RP04.P04.M06 distribution drift");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP163_PACK_BINDING,
  );
}

export function validateMasterDataCp163SyntheticFixtureEntry(contractProjection = null) {
  const errors = [];
  if (MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.pack_id !== MASTER_DATA_CP163_PACK_BINDING.pack_id) {
    errors.push("CP00-163 synthetic fixture entry pack ID drift");
  }
  if (MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.source_binding_id !== MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id) {
    errors.push("CP00-163 source binding ID drift");
  }
  for (const state of [
    "synthetic_fixture_binding",
    "build_smoke",
    "hermes_ui_evidence",
    "claude_ui_leak_prompt",
    "closeout_handoff",
    "ui_surface_inventory",
    "data_dependency_map",
    "loading_state",
    "empty_state",
    "denied_state",
  ]) {
    if (!MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_entry_states[state]) errors.push(`CP00-163 missing fixture state ${state}`);
  }
  for (const dependency of ["tenant_id", "permission_ref", "audit_hint_ref", "permission_audit_binding_fixture_id", "ui_surface_state_id", "safe_error_code"]) {
    if (!MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.data_dependencies.includes(dependency)) errors.push(`CP00-163 missing data dependency ${dependency}`);
  }
  for (const state of ["loading", "empty", "denied"]) {
    if (!MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.ui_states[state]) errors.push(`CP00-163 missing UI state ${state}`);
  }
  if (MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_ids.length !== 3) errors.push("CP00-163 must expose three fixture entry IDs");
  if (MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.leak_guard.renderable_surface !== "customer_facing_fixture_descriptor_only") {
    errors.push("CP00-163 renderable surface must be customer-facing fixture descriptor only");
  }
  if (MASTER_DATA_CP163_NO_WRITE_ATTESTATION.builds_synthetic_fixture_entry_descriptor !== true) {
    errors.push("CP00-163 must build synthetic fixture entry descriptors");
  }
  if (MASTER_DATA_CP163_NO_WRITE_ATTESTATION.loads_real_client_data !== false) errors.push("CP00-163 must not load real client data");
  if (MASTER_DATA_CP163_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-163 must not evaluate runtime permissions");
  if (MASTER_DATA_CP163_NO_WRITE_ATTESTATION.appends_audit_event !== false) errors.push("CP00-163 must not append audit events");
  if (MASTER_DATA_CP163_NO_WRITE_ATTESTATION.renders_ui !== false) errors.push("CP00-163 must not render UI");
  if (contractProjection) {
    const contractEntry = contractProjection.synthetic_fixture_entry;
    if (contractEntry?.pack_id !== MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.pack_id) errors.push("CP00-163 contract pack ID drift");
    if (contractEntry?.fixture_entry_id !== MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_entry_id) {
      errors.push("CP00-163 contract fixture entry ID drift");
    }
    if (contractEntry?.source_binding_id !== MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.source_binding_id) {
      errors.push("CP00-163 contract source binding ID drift");
    }
    if (
      JSON.stringify(contractEntry?.covered_unit_titles ?? []) !==
      JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.covered_unit_titles)
    ) {
      errors.push("CP00-163 contract covered unit titles drift");
    }
    if (JSON.stringify(contractEntry?.fixture_ids ?? []) !== JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_ids)) {
      errors.push("CP00-163 contract fixture IDs drift");
    }
    if (JSON.stringify(contractEntry?.data_dependencies ?? []) !== JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.data_dependencies)) {
      errors.push("CP00-163 contract data dependencies drift");
    }
    for (const [state, value] of Object.entries(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_entry_states)) {
      if (contractEntry?.fixture_entry_states?.[state] !== value) errors.push(`CP00-163 contract fixture state ${state} drift`);
    }
    for (const [state, value] of Object.entries(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.ui_states)) {
      if (contractEntry?.ui_states?.[state] !== value) errors.push(`CP00-163 contract UI state ${state} drift`);
    }
    if (contractEntry?.leak_guard?.renderable_surface !== MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.leak_guard.renderable_surface) {
      errors.push("CP00-163 contract renderable surface drift");
    }
    if (
      JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !==
      JSON.stringify(MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.leak_guard.prohibited_outputs)
    ) {
      errors.push("CP00-163 contract prohibited outputs drift");
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      fixture_entry: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY,
      no_write_attestation: MASTER_DATA_CP163_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP163_PACK_BINDING,
  );
}

export function createMasterDataCp163HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp163Coverage(planPack);
  const fixtureEntry = validateMasterDataCp163SyntheticFixtureEntry();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.evidence_descriptors.hermes_ui_evidence,
      gate: MASTER_DATA_CP163_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP163_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      synthetic_fixture_entry_valid: fixtureEntry.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP163_NO_WRITE_ATTESTATION,
      fixture_ids: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_ids,
      next_pack_id: MASTER_DATA_CP163_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP163_PACK_BINDING,
  );
}

export function createMasterDataCp163ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp163Coverage(planPack);
  const fixtureEntry = validateMasterDataCp163SyntheticFixtureEntry();
  return freezeResult(
    {
      review_packet: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.evidence_descriptors.claude_ui_leak_prompt,
      gate: MASTER_DATA_CP163_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP163_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      synthetic_fixture_entry_valid: fixtureEntry.valid,
      questions: Object.freeze([
        "Does CP00-163 bind synthetic fixture entries without loading real client data?",
        "Do loading, empty, and denied fixture states stay descriptor-only without UI rendering or network fetches?",
        "Are build smoke, Hermes evidence, Claude leak prompt, and closeout handoff descriptors no-write?",
        "Does the fixture entry expose only customer-facing descriptor fields without raw permission or audit internals?",
        "Does CP00-163 hand off cleanly to CP00-164 / RP04.P04.M06.S06?",
      ]),
      next_pack_id: MASTER_DATA_CP163_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP163_PACK_BINDING,
  );
}

export function createMasterDataCp163CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP163_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP163_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP163_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP163_PACK_BINDING.range,
      open_scope: "Continue RP04.P04.M06.S06 generated Master Data synthetic fixture set acceleration into CP00-164.",
      production_ready_flag: MASTER_DATA_CP163_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP163_PACK_BINDING,
  );
}

export function createMasterDataCp164CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  const byPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP164_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_phase: Object.freeze(byPhase),
      catalog_id: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.catalog_id,
      fixture_case_types: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.fixture_case_types,
      phase_scope: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.phase_scope,
      micro_phase_scope: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.micro_phase_scope,
    },
    MASTER_DATA_CP164_PACK_BINDING,
  );
}

export function validateMasterDataCp164Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-164 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP164_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-164");
  if (planPack?.risk_class !== MASTER_DATA_CP164_PACK_BINDING.risk_class) errors.push("CP00-164 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP164_PACK_BINDING.unit_count) errors.push("CP00-164 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP164_PACK_BINDING.first_unit_id) errors.push("CP00-164 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP164_PACK_BINDING.last_unit_id) errors.push("CP00-164 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-164 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-164 must only include RP04 units");
  const summary = createMasterDataCp164CoverageSummary(planPack);
  if (summary.by_deliverable.claude_review !== 12) errors.push("CP00-164 claude_review distribution drift");
  if (summary.by_deliverable.ui !== 29) errors.push("CP00-164 ui distribution drift");
  if (summary.by_deliverable.security_audit !== 12) errors.push("CP00-164 security_audit distribution drift");
  if (summary.by_deliverable.implementation !== 36) errors.push("CP00-164 implementation distribution drift");
  if (summary.by_deliverable.fixture !== 43) errors.push("CP00-164 fixture distribution drift");
  if (summary.by_deliverable.test !== 12) errors.push("CP00-164 test distribution drift");
  if (summary.by_deliverable.hermes_evidence !== 6) errors.push("CP00-164 hermes_evidence distribution drift");
  if (summary.by_phase["RP04.P04"] !== 67) errors.push("CP00-164 RP04.P04 distribution drift");
  if (summary.by_phase["RP04.P05"] !== 83) errors.push("CP00-164 RP04.P05 distribution drift");
  const expectedMicroCounts = {
    "RP04.P04.M06": 15,
    "RP04.P04.M07": 20,
    "RP04.P04.M08": 20,
    "RP04.P04.M09": 8,
    "RP04.P04.M10": 4,
    "RP04.P05.M00": 4,
    "RP04.P05.M01": 8,
    "RP04.P05.M02": 8,
    "RP04.P05.M03": 20,
    "RP04.P05.M04": 20,
    "RP04.P05.M05": 20,
    "RP04.P05.M06": 3,
  };
  for (const [microPhase, expectedCount] of Object.entries(expectedMicroCounts)) {
    if (summary.by_micro_phase[microPhase] !== expectedCount) errors.push(`CP00-164 ${microPhase} distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP164_PACK_BINDING,
  );
}

export function validateMasterDataCp164SyntheticFixtureSet(contractProjection = null) {
  const errors = [];
  const catalog = MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG;
  if (catalog.pack_id !== MASTER_DATA_CP164_PACK_BINDING.pack_id) errors.push("CP00-164 synthetic fixture set pack ID drift");
  if (catalog.source_fixture_entry_id !== MASTER_DATA_SYNTHETIC_FIXTURE_ENTRY.fixture_entry_id) {
    errors.push("CP00-164 source fixture entry ID drift");
  }
  if (catalog.source_binding_id !== MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id) errors.push("CP00-164 source binding ID drift");
  for (const phaseId of ["RP04.P04", "RP04.P05"]) {
    if (!catalog.phase_scope.includes(phaseId)) errors.push(`CP00-164 missing phase scope ${phaseId}`);
  }
  for (const microPhase of [
    "RP04.P04.M06",
    "RP04.P04.M07",
    "RP04.P04.M08",
    "RP04.P04.M09",
    "RP04.P04.M10",
    "RP04.P05.M00",
    "RP04.P05.M01",
    "RP04.P05.M02",
    "RP04.P05.M03",
    "RP04.P05.M04",
    "RP04.P05.M05",
    "RP04.P05.M06",
  ]) {
    if (!catalog.micro_phase_scope.includes(microPhase)) errors.push(`CP00-164 missing micro phase ${microPhase}`);
  }
  for (const state of [
    "loading",
    "empty",
    "denied",
    "review_required",
    "primary_interaction",
    "secondary_interaction",
    "permission_badge",
    "audit_hint_display",
    "error_message_copy",
    "responsive_desktop_layout",
    "responsive_mobile_layout",
    "keyboard_focus_behavior",
    "visual_density_check",
  ]) {
    if (!catalog.ui_workflow_states[state]) errors.push(`CP00-164 missing UI workflow state ${state}`);
  }
  for (const ref of ["tenant", "user", "matter", "document"]) {
    if (!catalog.base_fixture_refs[ref]) errors.push(`CP00-164 missing base fixture ref ${ref}`);
  }
  for (const caseType of [
    "primary_golden_case",
    "secondary_golden_case",
    "review_required_case",
    "denied_case",
    "cross_tenant_case",
    "missing_context_case",
    "audit_hint_case",
    "security_trimming_case",
    "ai_retrieval_or_analytics_case",
  ]) {
    if (!catalog.fixture_case_types.includes(caseType)) errors.push(`CP00-164 missing fixture case type ${caseType}`);
  }
  if (catalog.golden_case_ids.length !== 2) errors.push("CP00-164 must expose two golden case IDs");
  if (catalog.failure_case_ids.length !== 4) errors.push("CP00-164 must expose four failure case IDs");
  for (const code of [
    "MASTER_DATA_API_UNAUTHORIZED_OMISSION",
    "MASTER_DATA_CROSS_TENANT_REFERENCE",
    "MASTER_DATA_CONTEXT_REQUIRED",
    "MASTER_DATA_SECURITY_TRIMMED",
    "MASTER_DATA_REVIEW_REQUIRED",
  ]) {
    if (!Object.values(catalog.safe_error_codes).includes(code)) errors.push(`CP00-164 missing safe error code ${code}`);
  }
  if (catalog.fixture_manifest.generated_from_real_client_data !== false) {
    errors.push("CP00-164 fixture manifest must not be generated from real client data");
  }
  if (catalog.leak_guard.renderable_surface !== "customer_facing_fixture_set_descriptors_only") {
    errors.push("CP00-164 renderable surface must be customer-facing fixture set descriptors only");
  }
  for (const descriptor of [
    "build_smoke",
    "golden_test",
    "failure_test",
    "hermes_fixture_evidence",
    "claude_missing_test_prompt",
    "closeout_handoff",
  ]) {
    if (!catalog.evidence_descriptors[descriptor]) errors.push(`CP00-164 missing evidence descriptor ${descriptor}`);
  }
  if (MASTER_DATA_CP164_NO_WRITE_ATTESTATION.builds_synthetic_fixture_set_catalog !== true) {
    errors.push("CP00-164 must build synthetic fixture set catalog descriptors");
  }
  if (MASTER_DATA_CP164_NO_WRITE_ATTESTATION.loads_real_client_data !== false) errors.push("CP00-164 must not load real client data");
  if (MASTER_DATA_CP164_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-164 must not evaluate runtime permissions");
  if (MASTER_DATA_CP164_NO_WRITE_ATTESTATION.appends_audit_event !== false) errors.push("CP00-164 must not append audit events");
  if (MASTER_DATA_CP164_NO_WRITE_ATTESTATION.renders_ui !== false) errors.push("CP00-164 must not render UI");
  if (MASTER_DATA_CP164_NO_WRITE_ATTESTATION.executes_ai_retrieval !== false) errors.push("CP00-164 must not execute AI retrieval");
  if (MASTER_DATA_CP164_NO_WRITE_ATTESTATION.executes_analytics_query !== false) errors.push("CP00-164 must not execute analytics queries");

  if (contractProjection) {
    const contractEntry = contractProjection.synthetic_fixture_set_catalog;
    if (contractEntry?.pack_id !== catalog.pack_id) errors.push("CP00-164 contract pack ID drift");
    if (contractEntry?.catalog_id !== catalog.catalog_id) errors.push("CP00-164 contract catalog ID drift");
    if (contractEntry?.source_fixture_entry_id !== catalog.source_fixture_entry_id) {
      errors.push("CP00-164 contract source fixture entry ID drift");
    }
    if (contractEntry?.source_binding_id !== catalog.source_binding_id) errors.push("CP00-164 contract source binding ID drift");
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(catalog.phase_scope)) errors.push("CP00-164 contract phase scope drift");
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(catalog.micro_phase_scope)) {
      errors.push("CP00-164 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.base_fixture_refs ?? {}) !== JSON.stringify(catalog.base_fixture_refs)) {
      errors.push("CP00-164 contract base fixture refs drift");
    }
    if (JSON.stringify(contractEntry?.fixture_case_types ?? []) !== JSON.stringify(catalog.fixture_case_types)) {
      errors.push("CP00-164 contract fixture case types drift");
    }
    if (JSON.stringify(contractEntry?.golden_case_ids ?? []) !== JSON.stringify(catalog.golden_case_ids)) {
      errors.push("CP00-164 contract golden case IDs drift");
    }
    if (JSON.stringify(contractEntry?.failure_case_ids ?? []) !== JSON.stringify(catalog.failure_case_ids)) {
      errors.push("CP00-164 contract failure case IDs drift");
    }
    if (JSON.stringify(contractEntry?.safe_error_codes ?? {}) !== JSON.stringify(catalog.safe_error_codes)) {
      errors.push("CP00-164 contract safe error codes drift");
    }
    if (JSON.stringify(contractEntry?.fixture_manifest ?? {}) !== JSON.stringify(catalog.fixture_manifest)) {
      errors.push("CP00-164 contract fixture manifest drift");
    }
    if (JSON.stringify(contractEntry?.ui_workflow_states ?? {}) !== JSON.stringify(catalog.ui_workflow_states)) {
      errors.push("CP00-164 contract UI workflow states drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== catalog.leak_guard.renderable_surface) {
      errors.push("CP00-164 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(catalog.leak_guard.prohibited_outputs)) {
      errors.push("CP00-164 contract prohibited outputs drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(catalog.evidence_descriptors)) {
      errors.push("CP00-164 contract evidence descriptor drift");
    }
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      fixture_set: catalog,
      no_write_attestation: MASTER_DATA_CP164_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP164_PACK_BINDING,
  );
}

export function createMasterDataCp164HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp164Coverage(planPack);
  const fixtureSet = validateMasterDataCp164SyntheticFixtureSet();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.evidence_descriptors.hermes_fixture_evidence,
      gate: MASTER_DATA_CP164_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP164_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      synthetic_fixture_set_valid: fixtureSet.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP164_NO_WRITE_ATTESTATION,
      fixture_case_types: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.fixture_case_types,
      golden_case_ids: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.golden_case_ids,
      failure_case_ids: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.failure_case_ids,
      next_pack_id: MASTER_DATA_CP164_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP164_PACK_BINDING,
  );
}

export function createMasterDataCp164ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp164Coverage(planPack);
  const fixtureSet = validateMasterDataCp164SyntheticFixtureSet();
  return freezeResult(
    {
      review_packet: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.evidence_descriptors.claude_missing_test_prompt,
      gate: MASTER_DATA_CP164_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP164_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      synthetic_fixture_set_valid: fixtureSet.valid,
      questions: Object.freeze([
        "Does CP00-164 cover all 150 planned fixture/UI/test/evidence units without splitting into smaller arbitrary packs?",
        "Do golden and failure fixture cases stay descriptor-only and avoid real client data, raw document bodies, and hidden source values?",
        "Are denied, cross-tenant, missing-context, audit-hint, security-trimming, and AI analytics cases represented with customer-safe outputs only?",
        "Do Hermes fixture evidence, Claude missing-test prompt, build smoke, golden test, and failure test descriptors remain no-write?",
        "Does CP00-164 hand off cleanly to CP00-165 / RP04.P05.M06.S04?",
      ]),
      next_pack_id: MASTER_DATA_CP164_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP164_PACK_BINDING,
  );
}

export function createMasterDataCp164CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP164_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP164_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP164_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP164_PACK_BINDING.range,
      open_scope: "Continue RP04.P05.M06.S04 generated Master Data fixture-set tail and downstream RP04.P06 workflow packs in CP00-165.",
      production_ready_flag: MASTER_DATA_CP164_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP164_PACK_BINDING,
  );
}

export function createMasterDataCp165CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  const byPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP165_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_phase: Object.freeze(byPhase),
      matrix_id: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.matrix_id,
      permission_actions: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.permission_actions,
      fixture_ids: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.permission_fixture_ids,
    },
    MASTER_DATA_CP165_PACK_BINDING,
  );
}

export function validateMasterDataCp165Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-165 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP165_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-165");
  if (planPack?.risk_class !== MASTER_DATA_CP165_PACK_BINDING.risk_class) errors.push("CP00-165 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP165_PACK_BINDING.unit_count) errors.push("CP00-165 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP165_PACK_BINDING.first_unit_id) errors.push("CP00-165 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP165_PACK_BINDING.last_unit_id) errors.push("CP00-165 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-165 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-165 must only include RP04 units");
  const summary = createMasterDataCp165CoverageSummary(planPack);
  if (summary.by_deliverable.fixture !== 28) errors.push("CP00-165 fixture distribution drift");
  if (summary.by_deliverable.claude_review !== 7) errors.push("CP00-165 claude_review distribution drift");
  if (summary.by_deliverable.implementation !== 59) errors.push("CP00-165 implementation distribution drift");
  if (summary.by_deliverable.security_audit !== 24) errors.push("CP00-165 security_audit distribution drift");
  if (summary.by_deliverable.test !== 15) errors.push("CP00-165 test distribution drift");
  if (summary.by_deliverable.hermes_evidence !== 3) errors.push("CP00-165 hermes_evidence distribution drift");
  if (summary.by_deliverable.ui !== 14) errors.push("CP00-165 ui distribution drift");
  if (summary.by_phase["RP04.P05"] !== 69) errors.push("CP00-165 RP04.P05 distribution drift");
  if (summary.by_phase["RP04.P06"] !== 81) errors.push("CP00-165 RP04.P06 distribution drift");
  const expectedMicroCounts = {
    "RP04.P05.M06": 17,
    "RP04.P05.M07": 20,
    "RP04.P05.M08": 20,
    "RP04.P05.M09": 8,
    "RP04.P05.M10": 4,
    "RP04.P06.M00": 11,
    "RP04.P06.M01": 11,
    "RP04.P06.M02": 20,
    "RP04.P06.M03": 22,
    "RP04.P06.M04": 17,
  };
  for (const [microPhase, expectedCount] of Object.entries(expectedMicroCounts)) {
    if (summary.by_micro_phase[microPhase] !== expectedCount) errors.push(`CP00-165 ${microPhase} distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP165_PACK_BINDING,
  );
}

export function validateMasterDataCp165PermissionMatrixWorkflow(contractProjection = null) {
  const errors = [];
  const workflow = MASTER_DATA_PERMISSION_MATRIX_WORKFLOW;
  if (workflow.pack_id !== MASTER_DATA_CP165_PACK_BINDING.pack_id) errors.push("CP00-165 permission matrix workflow pack ID drift");
  if (workflow.source_fixture_set_catalog_id !== MASTER_DATA_SYNTHETIC_FIXTURE_SET_CATALOG.catalog_id) {
    errors.push("CP00-165 source fixture set catalog ID drift");
  }
  if (workflow.source_binding_id !== MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id) errors.push("CP00-165 source binding ID drift");
  for (const phaseId of ["RP04.P05", "RP04.P06"]) {
    if (!workflow.phase_scope.includes(phaseId)) errors.push(`CP00-165 missing phase scope ${phaseId}`);
  }
  for (const microPhase of [
    "RP04.P05.M06",
    "RP04.P05.M07",
    "RP04.P05.M08",
    "RP04.P05.M09",
    "RP04.P05.M10",
    "RP04.P06.M00",
    "RP04.P06.M01",
    "RP04.P06.M02",
    "RP04.P06.M03",
    "RP04.P06.M04",
  ]) {
    if (!workflow.micro_phase_scope.includes(microPhase)) errors.push(`CP00-165 missing micro phase ${microPhase}`);
  }
  for (const action of ["view", "search", "mutation", "export_download", "share", "ai_retrieval"]) {
    if (!workflow.permission_actions.includes(action)) errors.push(`CP00-165 missing action ${action}`);
    if (!workflow.decision_bindings[action]) errors.push(`CP00-165 missing decision binding ${action}`);
  }
  for (const control of [
    "matched_rule_capture",
    "deny_over_allow",
    "legal_hold_interaction",
    "ethical_wall_interaction",
    "object_acl_interaction",
    "review_required_route",
    "approval_required_route",
    "security_trimming_proof",
    "audit_event_expectation",
  ]) {
    if (!workflow.security_controls[control]) errors.push(`CP00-165 missing security control ${control}`);
  }
  if (workflow.security_controls.audit_hint_fields.length !== 3) errors.push("CP00-165 must expose three audit hint fields");
  if (workflow.permission_fixture_ids.length !== 8) errors.push("CP00-165 must expose eight permission fixtures");
  for (const code of [
    "MASTER_DATA_PERMISSION_DENIED",
    "MASTER_DATA_CROSS_TENANT_REFERENCE",
    "MASTER_DATA_LEGAL_HOLD_BLOCKED",
    "MASTER_DATA_ETHICAL_WALL_BLOCKED",
    "MASTER_DATA_OBJECT_ACL_TRIMMED",
    "MASTER_DATA_REVIEW_REQUIRED",
    "MASTER_DATA_APPROVAL_REQUIRED",
    "MASTER_DATA_LEAK_PREVENTED",
  ]) {
    if (!Object.values(workflow.safe_error_codes).includes(code)) errors.push(`CP00-165 missing safe error code ${code}`);
  }
  for (const descriptor of [
    "allowed_test",
    "denied_test",
    "cross_tenant_test",
    "leak_prevention_test",
    "hermes_permission_evidence",
    "claude_permission_review",
    "closeout_handoff",
  ]) {
    if (!workflow.evidence_descriptors[descriptor]) errors.push(`CP00-165 missing evidence descriptor ${descriptor}`);
  }
  if (workflow.leak_guard.renderable_surface !== "customer_facing_permission_matrix_descriptors_only") {
    errors.push("CP00-165 renderable surface must be customer-facing permission matrix descriptors only");
  }
  if (MASTER_DATA_CP165_NO_WRITE_ATTESTATION.builds_permission_matrix_workflow !== true) {
    errors.push("CP00-165 must build permission matrix workflow descriptors");
  }
  if (MASTER_DATA_CP165_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-165 must not evaluate runtime permissions");
  if (MASTER_DATA_CP165_NO_WRITE_ATTESTATION.appends_audit_event !== false) errors.push("CP00-165 must not append audit events");
  if (MASTER_DATA_CP165_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-165 must not dispatch review routes");
  if (MASTER_DATA_CP165_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-165 must not dispatch approval routes");
  if (MASTER_DATA_CP165_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-165 must not execute API handlers");
  if (MASTER_DATA_CP165_NO_WRITE_ATTESTATION.renders_ui !== false) errors.push("CP00-165 must not render UI");
  if (MASTER_DATA_CP165_NO_WRITE_ATTESTATION.executes_ai_retrieval !== false) errors.push("CP00-165 must not execute AI retrieval");

  if (contractProjection) {
    const contractEntry = contractProjection.permission_matrix_workflow;
    if (contractEntry?.pack_id !== workflow.pack_id) errors.push("CP00-165 contract pack ID drift");
    if (contractEntry?.matrix_id !== workflow.matrix_id) errors.push("CP00-165 contract matrix ID drift");
    if (contractEntry?.source_fixture_set_catalog_id !== workflow.source_fixture_set_catalog_id) {
      errors.push("CP00-165 contract source fixture set catalog ID drift");
    }
    if (contractEntry?.source_binding_id !== workflow.source_binding_id) errors.push("CP00-165 contract source binding ID drift");
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(workflow.phase_scope)) {
      errors.push("CP00-165 contract phase scope drift");
    }
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(workflow.micro_phase_scope)) {
      errors.push("CP00-165 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.fixture_tail_scope ?? {}) !== JSON.stringify(workflow.fixture_tail_scope)) {
      errors.push("CP00-165 contract fixture tail scope drift");
    }
    if (JSON.stringify(contractEntry?.permission_actions ?? []) !== JSON.stringify(workflow.permission_actions)) {
      errors.push("CP00-165 contract permission actions drift");
    }
    if (JSON.stringify(contractEntry?.decision_bindings ?? {}) !== JSON.stringify(workflow.decision_bindings)) {
      errors.push("CP00-165 contract decision bindings drift");
    }
    if (JSON.stringify(contractEntry?.security_controls ?? {}) !== JSON.stringify(workflow.security_controls)) {
      errors.push("CP00-165 contract security controls drift");
    }
    if (JSON.stringify(contractEntry?.safe_error_codes ?? {}) !== JSON.stringify(workflow.safe_error_codes)) {
      errors.push("CP00-165 contract safe error codes drift");
    }
    if (JSON.stringify(contractEntry?.permission_fixture_ids ?? []) !== JSON.stringify(workflow.permission_fixture_ids)) {
      errors.push("CP00-165 contract permission fixture IDs drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(workflow.evidence_descriptors)) {
      errors.push("CP00-165 contract evidence descriptors drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== workflow.leak_guard.renderable_surface) {
      errors.push("CP00-165 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(workflow.leak_guard.prohibited_outputs)) {
      errors.push("CP00-165 contract prohibited outputs drift");
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      permission_matrix_workflow: workflow,
      no_write_attestation: MASTER_DATA_CP165_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP165_PACK_BINDING,
  );
}

export function createMasterDataCp165HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp165Coverage(planPack);
  const workflow = validateMasterDataCp165PermissionMatrixWorkflow();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.evidence_descriptors.hermes_permission_evidence,
      gate: MASTER_DATA_CP165_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP165_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_matrix_workflow_valid: workflow.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP165_NO_WRITE_ATTESTATION,
      permission_fixture_ids: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.permission_fixture_ids,
      next_pack_id: MASTER_DATA_CP165_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP165_PACK_BINDING,
  );
}

export function createMasterDataCp165ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp165Coverage(planPack);
  const workflow = validateMasterDataCp165PermissionMatrixWorkflow();
  return freezeResult(
    {
      review_packet: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.evidence_descriptors.claude_permission_review,
      gate: MASTER_DATA_CP165_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP165_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_matrix_workflow_valid: workflow.valid,
      questions: Object.freeze([
        "Does CP00-165 cover all 150 planned fixture-tail and permission-matrix workflow units without splitting into arbitrary smaller packs?",
        "Do permission decisions remain descriptor-only without runtime permission evaluation, audit appends, API execution, UI rendering, AI retrieval, or analytics execution?",
        "Are view, search, mutation, export/download, share, and AI retrieval bindings represented with safe deny-over-allow, legal hold, ethical wall, and object ACL interactions?",
        "Do allowed, denied, cross-tenant, and leak-prevention tests plus H04/C04 descriptors remain no-write?",
        "Does CP00-165 hand off cleanly to CP00-166 / RP04.P06.M04.S18?",
      ]),
      next_pack_id: MASTER_DATA_CP165_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP165_PACK_BINDING,
  );
}

export function createMasterDataCp165CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP165_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP165_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP165_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP165_PACK_BINDING.range,
      open_scope: "Continue RP04.P06.M04.S18 generated Master Data permission matrix sensitive boundary in CP00-166.",
      production_ready_flag: MASTER_DATA_CP165_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP165_PACK_BINDING,
  );
}

export function createMasterDataCp166CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP166_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      binding_id: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.binding_id,
      action_bindings: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.action_decision_bindings,
    },
    MASTER_DATA_CP166_PACK_BINDING,
  );
}

export function validateMasterDataCp166Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-166 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP166_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-166");
  if (planPack?.risk_class !== MASTER_DATA_CP166_PACK_BINDING.risk_class) errors.push("CP00-166 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP166_PACK_BINDING.unit_count) errors.push("CP00-166 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP166_PACK_BINDING.first_unit_id) errors.push("CP00-166 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP166_PACK_BINDING.last_unit_id) errors.push("CP00-166 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-166 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-166 must only include RP04 units");
  const summary = createMasterDataCp166CoverageSummary(planPack);
  if (summary.by_deliverable.security_audit !== 2) errors.push("CP00-166 security_audit distribution drift");
  if (summary.by_deliverable.test !== 2) errors.push("CP00-166 test distribution drift");
  if (summary.by_deliverable.implementation !== 6) errors.push("CP00-166 implementation distribution drift");
  if (summary.by_micro_phase["RP04.P06.M04"] !== 3) errors.push("CP00-166 RP04.P06.M04 distribution drift");
  if (summary.by_micro_phase["RP04.P06.M05"] !== 7) errors.push("CP00-166 RP04.P06.M05 distribution drift");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP166_PACK_BINDING,
  );
}

export function validateMasterDataCp166PermissionAuditDecisionBinding(contractProjection = null) {
  const errors = [];
  const binding = MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING;
  if (binding.pack_id !== MASTER_DATA_CP166_PACK_BINDING.pack_id) errors.push("CP00-166 binding pack ID drift");
  if (binding.source_matrix_workflow_id !== MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.matrix_id) {
    errors.push("CP00-166 source matrix workflow drift");
  }
  if (binding.source_permission_audit_binding_id !== MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id) {
    errors.push("CP00-166 source permission audit binding drift");
  }
  if (!binding.phase_scope.includes("RP04.P06")) errors.push("CP00-166 phase scope drift");
  for (const microPhase of ["RP04.P06.M04", "RP04.P06.M05"]) {
    if (!binding.micro_phase_scope.includes(microPhase)) errors.push(`CP00-166 missing micro phase ${microPhase}`);
  }
  for (const action of MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.permission_actions) {
    const row = binding.action_decision_bindings[action];
    if (!row) errors.push(`CP00-166 missing action binding ${action}`);
    if (row?.decision_binding !== MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.decision_bindings[action]) {
      errors.push(`CP00-166 action ${action} decision binding drift`);
    }
  }
  if (Object.keys(binding.action_decision_bindings).length !== 6) errors.push("CP00-166 must expose six action decision bindings");
  if (!binding.test_descriptors.permission_fixture) errors.push("CP00-166 missing permission fixture descriptor");
  if (!binding.test_descriptors.allowed_test) errors.push("CP00-166 missing allowed test descriptor");
  if (!binding.test_descriptors.denied_test) errors.push("CP00-166 missing denied test descriptor");
  if (!binding.evidence_descriptors.hermes_permission_audit_binding) errors.push("CP00-166 missing Hermes evidence descriptor");
  if (!binding.evidence_descriptors.claude_permission_audit_binding_review) errors.push("CP00-166 missing Claude review descriptor");
  if (binding.leak_guard.renderable_surface !== "customer_facing_permission_audit_outcome_only") {
    errors.push("CP00-166 renderable surface must be outcome-only");
  }
  for (const internalField of ["permission_ref", "audit_hint_ref", "matched_rule_ref", "matched_rule_id"]) {
    if (!binding.leak_guard.internal_reference_fields.includes(internalField)) {
      errors.push(`CP00-166 leak guard missing internal field ${internalField}`);
    }
  }
  if (MASTER_DATA_CP166_NO_WRITE_ATTESTATION.builds_permission_audit_decision_binding !== true) {
    errors.push("CP00-166 must build permission audit decision binding descriptors");
  }
  if (MASTER_DATA_CP166_NO_WRITE_ATTESTATION.separates_customer_facing_outcome_from_internal_refs !== true) {
    errors.push("CP00-166 must separate customer-facing outcomes from internal refs");
  }
  if (MASTER_DATA_CP166_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-166 must not evaluate runtime permission");
  if (MASTER_DATA_CP166_NO_WRITE_ATTESTATION.appends_audit_event !== false) errors.push("CP00-166 must not append audit events");
  if (MASTER_DATA_CP166_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-166 must not dispatch review routes");
  if (MASTER_DATA_CP166_NO_WRITE_ATTESTATION.executes_ai_retrieval !== false) errors.push("CP00-166 must not execute AI retrieval");

  if (contractProjection) {
    const contractEntry = contractProjection.permission_audit_decision_binding;
    if (contractEntry?.pack_id !== binding.pack_id) errors.push("CP00-166 contract pack ID drift");
    if (contractEntry?.binding_id !== binding.binding_id) errors.push("CP00-166 contract binding ID drift");
    if (contractEntry?.source_matrix_workflow_id !== binding.source_matrix_workflow_id) {
      errors.push("CP00-166 contract source matrix workflow drift");
    }
    if (contractEntry?.source_permission_audit_binding_id !== binding.source_permission_audit_binding_id) {
      errors.push("CP00-166 contract source permission audit binding drift");
    }
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(binding.phase_scope)) {
      errors.push("CP00-166 contract phase scope drift");
    }
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(binding.micro_phase_scope)) {
      errors.push("CP00-166 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.unit_scope ?? {}) !== JSON.stringify(binding.unit_scope)) {
      errors.push("CP00-166 contract unit scope drift");
    }
    if (JSON.stringify(contractEntry?.permission_matrix_row ?? {}) !== JSON.stringify(binding.permission_matrix_row)) {
      errors.push("CP00-166 contract permission matrix row drift");
    }
    if (JSON.stringify(contractEntry?.action_decision_bindings ?? {}) !== JSON.stringify(binding.action_decision_bindings)) {
      errors.push("CP00-166 contract action decision bindings drift");
    }
    if (JSON.stringify(contractEntry?.test_descriptors ?? {}) !== JSON.stringify(binding.test_descriptors)) {
      errors.push("CP00-166 contract test descriptors drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(binding.evidence_descriptors)) {
      errors.push("CP00-166 contract evidence descriptors drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== binding.leak_guard.renderable_surface) {
      errors.push("CP00-166 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.internal_reference_fields ?? []) !== JSON.stringify(binding.leak_guard.internal_reference_fields)) {
      errors.push("CP00-166 contract internal reference fields drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(binding.leak_guard.prohibited_outputs)) {
      errors.push("CP00-166 contract prohibited outputs drift");
    }
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      permission_audit_decision_binding: binding,
      no_write_attestation: MASTER_DATA_CP166_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP166_PACK_BINDING,
  );
}

export function createMasterDataCp166HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp166Coverage(planPack);
  const binding = validateMasterDataCp166PermissionAuditDecisionBinding();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.evidence_descriptors.hermes_permission_audit_binding,
      gate: MASTER_DATA_CP166_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP166_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_decision_binding_valid: binding.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP166_NO_WRITE_ATTESTATION,
      action_binding_count: Object.keys(MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.action_decision_bindings).length,
      next_pack_id: MASTER_DATA_CP166_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP166_PACK_BINDING,
  );
}

export function createMasterDataCp166ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp166Coverage(planPack);
  const binding = validateMasterDataCp166PermissionAuditDecisionBinding();
  return freezeResult(
    {
      review_packet: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.evidence_descriptors.claude_permission_audit_binding_review,
      gate: MASTER_DATA_CP166_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP166_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_decision_binding_valid: binding.valid,
      questions: Object.freeze([
        "Does CP00-166 keep this Risk A permission/audit boundary to 10 units without widening sensitive scope?",
        "Are view, search, mutation, export/download, share, and AI retrieval decision bindings mapped without runtime permission evaluation?",
        "Are allowed and denied test descriptors synthetic, no-write, and no-audit-append?",
        "Are customer-facing outcomes separated from permission_ref, audit_hint_ref, and matched_rule_ref evidence-only fields?",
        "Does CP00-166 hand off cleanly to CP00-167 / RP04.P06.M05.S08?",
      ]),
      next_pack_id: MASTER_DATA_CP166_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP166_PACK_BINDING,
  );
}

export function createMasterDataCp166CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP166_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP166_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP166_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP166_PACK_BINDING.range,
      open_scope: "Continue RP04.P06.M05.S08 generated Master Data permission/audit binding sensitive boundary in CP00-167.",
      production_ready_flag: MASTER_DATA_CP166_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP166_PACK_BINDING,
  );
}

export function createMasterDataCp167CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP167_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      control_id: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_id,
      control_keys: Object.freeze(Object.keys(MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_descriptors)),
    },
    MASTER_DATA_CP167_PACK_BINDING,
  );
}

export function validateMasterDataCp167Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-167 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP167_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-167");
  if (planPack?.risk_class !== MASTER_DATA_CP167_PACK_BINDING.risk_class) errors.push("CP00-167 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP167_PACK_BINDING.unit_count) errors.push("CP00-167 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP167_PACK_BINDING.first_unit_id) errors.push("CP00-167 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP167_PACK_BINDING.last_unit_id) errors.push("CP00-167 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-167 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-167 must only include RP04 units");
  const summary = createMasterDataCp167CoverageSummary(planPack);
  if (summary.by_deliverable.security_audit !== 3) errors.push("CP00-167 security_audit distribution drift");
  if (summary.by_deliverable.implementation !== 2) errors.push("CP00-167 implementation distribution drift");
  if (summary.by_deliverable.ui !== 4) errors.push("CP00-167 ui distribution drift");
  if (summary.by_deliverable.claude_review !== 1) errors.push("CP00-167 claude_review distribution drift");
  if (summary.by_micro_phase["RP04.P06.M05"] !== 10) errors.push("CP00-167 RP04.P06.M05 distribution drift");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP167_PACK_BINDING,
  );
}

export function validateMasterDataCp167PermissionAuditControlInteractions(contractProjection = null) {
  const errors = [];
  const interactions = MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS;
  if (interactions.pack_id !== MASTER_DATA_CP167_PACK_BINDING.pack_id) errors.push("CP00-167 interactions pack ID drift");
  if (interactions.source_decision_binding_id !== MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.binding_id) {
    errors.push("CP00-167 source decision binding drift");
  }
  if (interactions.source_matrix_workflow_id !== MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.matrix_id) {
    errors.push("CP00-167 source matrix workflow drift");
  }
  if (!interactions.phase_scope.includes("RP04.P06")) errors.push("CP00-167 phase scope drift");
  if (!interactions.micro_phase_scope.includes("RP04.P06.M05")) errors.push("CP00-167 micro phase scope drift");

  const requiredControls = [
    "audit_hint_fields",
    "matched_rule_capture",
    "deny_over_allow",
    "legal_hold_interaction",
    "ethical_wall_interaction",
    "object_acl_interaction",
    "review_required_route",
    "approval_required_route",
    "security_trimming_proof",
    "audit_event_expectation",
  ];
  for (const controlKey of requiredControls) {
    if (!interactions.unit_scope[controlKey]) errors.push(`CP00-167 missing unit scope ${controlKey}`);
    if (!interactions.control_descriptors[controlKey]) errors.push(`CP00-167 missing control descriptor ${controlKey}`);
  }
  if (Object.keys(interactions.control_descriptors).length !== requiredControls.length) {
    errors.push("CP00-167 must expose ten control descriptors");
  }
  if ((interactions.control_descriptors.audit_hint_fields?.fields ?? []).length !== 3) {
    errors.push("CP00-167 audit hint fields must track three safe fields");
  }
  if (interactions.control_descriptors.matched_rule_capture?.exposes_raw_rule !== false) {
    errors.push("CP00-167 matched rule capture must not expose raw rule");
  }
  if (interactions.control_descriptors.matched_rule_capture?.stores_rule_reference_only !== true) {
    errors.push("CP00-167 matched rule capture must store reference only");
  }
  if (interactions.control_descriptors.deny_over_allow?.runtime_evaluation !== false) {
    errors.push("CP00-167 deny-over-allow must not run runtime evaluation");
  }
  if (interactions.control_descriptors.legal_hold_interaction?.mutates_hold_state !== false) {
    errors.push("CP00-167 legal hold descriptor must not mutate hold state");
  }
  if (interactions.control_descriptors.ethical_wall_interaction?.exposes_wall_membership !== false) {
    errors.push("CP00-167 ethical wall descriptor must not expose wall membership");
  }
  if (interactions.control_descriptors.object_acl_interaction?.exposes_denied_items !== false) {
    errors.push("CP00-167 object ACL descriptor must not expose denied items");
  }
  if (interactions.control_descriptors.review_required_route?.dispatches_review_route !== false) {
    errors.push("CP00-167 review route descriptor must not dispatch");
  }
  if (interactions.control_descriptors.approval_required_route?.dispatches_approval_route !== false) {
    errors.push("CP00-167 approval route descriptor must not dispatch");
  }
  if (interactions.control_descriptors.security_trimming_proof?.safe_counts_only !== true) {
    errors.push("CP00-167 security trimming proof must be safe-counts-only");
  }
  if (
    interactions.control_descriptors.audit_event_expectation?.writes_audit_event !== false ||
    interactions.control_descriptors.audit_event_expectation?.appends_audit_event !== false
  ) {
    errors.push("CP00-167 audit event expectation must be descriptor-only");
  }
  if (interactions.evidence_descriptors.hermes_control_interactions !== "H04.CP00-167.master_data_permission_audit_control_interactions") {
    errors.push("CP00-167 Hermes evidence descriptor drift");
  }
  if (interactions.evidence_descriptors.claude_control_interactions_review !== "C04.CP00-167.master_data_permission_audit_control_interactions") {
    errors.push("CP00-167 Claude review descriptor drift");
  }
  if (interactions.leak_guard.renderable_surface !== "customer_facing_permission_audit_control_outcome_only") {
    errors.push("CP00-167 renderable surface must be control-outcome-only");
  }
  for (const internalField of ["permission_ref", "audit_hint_ref", "matched_rule_ref", "matched_rule_id", "wall_membership"]) {
    if (!interactions.leak_guard.internal_reference_fields.includes(internalField)) {
      errors.push(`CP00-167 leak guard missing internal field ${internalField}`);
    }
  }
  if (MASTER_DATA_CP167_NO_WRITE_ATTESTATION.builds_permission_audit_control_interactions !== true) {
    errors.push("CP00-167 must build permission audit control interaction descriptors");
  }
  if (MASTER_DATA_CP167_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-167 must not evaluate runtime permission");
  if (MASTER_DATA_CP167_NO_WRITE_ATTESTATION.appends_audit_event !== false) errors.push("CP00-167 must not append audit events");
  if (MASTER_DATA_CP167_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-167 must not dispatch review routes");
  if (MASTER_DATA_CP167_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-167 must not dispatch approval routes");
  if (MASTER_DATA_CP167_NO_WRITE_ATTESTATION.executes_ai_retrieval !== false) errors.push("CP00-167 must not execute AI retrieval");

  if (contractProjection) {
    const contractEntry = contractProjection.permission_audit_control_interactions;
    if (contractEntry?.pack_id !== interactions.pack_id) errors.push("CP00-167 contract pack ID drift");
    if (contractEntry?.control_id !== interactions.control_id) errors.push("CP00-167 contract control ID drift");
    if (contractEntry?.source_decision_binding_id !== interactions.source_decision_binding_id) {
      errors.push("CP00-167 contract source decision binding drift");
    }
    if (contractEntry?.source_matrix_workflow_id !== interactions.source_matrix_workflow_id) {
      errors.push("CP00-167 contract source matrix workflow drift");
    }
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(interactions.phase_scope)) {
      errors.push("CP00-167 contract phase scope drift");
    }
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(interactions.micro_phase_scope)) {
      errors.push("CP00-167 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.unit_scope ?? {}) !== JSON.stringify(interactions.unit_scope)) {
      errors.push("CP00-167 contract unit scope drift");
    }
    if (JSON.stringify(contractEntry?.control_descriptors ?? {}) !== JSON.stringify(interactions.control_descriptors)) {
      errors.push("CP00-167 contract control descriptors drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(interactions.evidence_descriptors)) {
      errors.push("CP00-167 contract evidence descriptors drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== interactions.leak_guard.renderable_surface) {
      errors.push("CP00-167 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.internal_reference_fields ?? []) !== JSON.stringify(interactions.leak_guard.internal_reference_fields)) {
      errors.push("CP00-167 contract internal reference fields drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(interactions.leak_guard.prohibited_outputs)) {
      errors.push("CP00-167 contract prohibited outputs drift");
    }
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      permission_audit_control_interactions: interactions,
      no_write_attestation: MASTER_DATA_CP167_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP167_PACK_BINDING,
  );
}

export function createMasterDataCp167HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp167Coverage(planPack);
  const interactions = validateMasterDataCp167PermissionAuditControlInteractions();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.evidence_descriptors.hermes_control_interactions,
      gate: MASTER_DATA_CP167_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP167_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_control_interactions_valid: interactions.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP167_NO_WRITE_ATTESTATION,
      control_count: Object.keys(MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_descriptors).length,
      next_pack_id: MASTER_DATA_CP167_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP167_PACK_BINDING,
  );
}

export function createMasterDataCp167ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp167Coverage(planPack);
  const interactions = validateMasterDataCp167PermissionAuditControlInteractions();
  return freezeResult(
    {
      review_packet: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.evidence_descriptors.claude_control_interactions_review,
      gate: MASTER_DATA_CP167_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP167_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_control_interactions_valid: interactions.valid,
      questions: Object.freeze([
        "Does CP00-167 keep this Risk A permission/audit control boundary to 10 units without widening sensitive scope?",
        "Are audit hint fields, matched rule capture, deny-over-allow, legal hold, ethical wall, object ACL, review route, approval route, security trimming, and audit expectation descriptors all covered?",
        "Do customer-facing control outcomes exclude permission refs, audit internals, matched rule refs, wall membership, denied item payloads, and raw rules?",
        "Are review and approval routes descriptor-only without dispatch, and are audit expectations descriptor-only without writes or appends?",
        "Does CP00-167 hand off cleanly to CP00-168 / RP04.P06.M05.S18?",
      ]),
      next_pack_id: MASTER_DATA_CP167_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP167_PACK_BINDING,
  );
}

export function createMasterDataCp167CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP167_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP167_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP167_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP167_PACK_BINDING.range,
      open_scope: "Continue RP04.P06.M05.S18 generated Master Data permission/audit control sensitive boundary in CP00-168.",
      production_ready_flag: MASTER_DATA_CP167_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP167_PACK_BINDING,
  );
}

export function createMasterDataCp168CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP168_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      test_matrix_id: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.test_matrix_id,
      fixture_tests: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.fixture_test_descriptors,
      decision_bindings: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.decision_binding_descriptors,
    },
    MASTER_DATA_CP168_PACK_BINDING,
  );
}

export function validateMasterDataCp168Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-168 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP168_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-168");
  if (planPack?.risk_class !== MASTER_DATA_CP168_PACK_BINDING.risk_class) errors.push("CP00-168 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP168_PACK_BINDING.unit_count) errors.push("CP00-168 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP168_PACK_BINDING.first_unit_id) errors.push("CP00-168 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP168_PACK_BINDING.last_unit_id) errors.push("CP00-168 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-168 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-168 must only include RP04 units");
  const summary = createMasterDataCp168CoverageSummary(planPack);
  if (summary.by_deliverable.security_audit !== 2) errors.push("CP00-168 security_audit distribution drift");
  if (summary.by_deliverable.test !== 4) errors.push("CP00-168 test distribution drift");
  if (summary.by_deliverable.implementation !== 4) errors.push("CP00-168 implementation distribution drift");
  if (summary.by_micro_phase["RP04.P06.M05"] !== 5) errors.push("CP00-168 RP04.P06.M05 distribution drift");
  if (summary.by_micro_phase["RP04.P06.M06"] !== 5) errors.push("CP00-168 RP04.P06.M06 distribution drift");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP168_PACK_BINDING,
  );
}

export function validateMasterDataCp168PermissionAuditFixtureDecisionTests(contractProjection = null) {
  const errors = [];
  const tests = MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS;
  if (tests.pack_id !== MASTER_DATA_CP168_PACK_BINDING.pack_id) errors.push("CP00-168 fixture decision tests pack ID drift");
  if (tests.source_control_interactions_id !== MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_id) {
    errors.push("CP00-168 source control interactions drift");
  }
  if (tests.source_decision_binding_id !== MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.binding_id) {
    errors.push("CP00-168 source decision binding drift");
  }
  if (tests.source_matrix_workflow_id !== MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.matrix_id) {
    errors.push("CP00-168 source matrix workflow drift");
  }
  if (!tests.phase_scope.includes("RP04.P06")) errors.push("CP00-168 phase scope drift");
  for (const microPhase of ["RP04.P06.M05", "RP04.P06.M06"]) {
    if (!tests.micro_phase_scope.includes(microPhase)) errors.push(`CP00-168 missing micro phase ${microPhase}`);
  }

  const requiredFixtureTests = ["permission_fixture", "allowed_test", "denied_test", "cross_tenant_test", "leak_prevention_test"];
  const requiredDecisionBindings = [
    "permission_matrix_row",
    "view_decision_binding",
    "search_decision_binding",
    "mutation_decision_binding",
    "export_download_decision_binding",
  ];
  for (const key of [...requiredFixtureTests, ...requiredDecisionBindings]) {
    if (!tests.unit_scope[key]) errors.push(`CP00-168 missing unit scope ${key}`);
  }
  for (const key of requiredFixtureTests) {
    if (!tests.fixture_test_descriptors[key]) errors.push(`CP00-168 missing fixture test descriptor ${key}`);
  }
  for (const key of requiredDecisionBindings) {
    if (!tests.decision_binding_descriptors[key]) errors.push(`CP00-168 missing decision binding descriptor ${key}`);
  }
  if (Object.keys(tests.fixture_test_descriptors).length !== 5) errors.push("CP00-168 must expose five fixture test descriptors");
  if (Object.keys(tests.decision_binding_descriptors).length !== 5) errors.push("CP00-168 must expose five decision binding descriptors");
  if (tests.fixture_test_descriptors.permission_fixture?.synthetic_only !== true) errors.push("CP00-168 permission fixture must be synthetic-only");
  if (tests.fixture_test_descriptors.permission_fixture?.loads_real_client_data !== false) {
    errors.push("CP00-168 permission fixture must not load real client data");
  }
  if (tests.fixture_test_descriptors.allowed_test?.expected_outcome !== "allowed") errors.push("CP00-168 allowed test drift");
  if (tests.fixture_test_descriptors.denied_test?.expected_outcome !== "denied") errors.push("CP00-168 denied test drift");
  if (tests.fixture_test_descriptors.cross_tenant_test?.exposes_foreign_tenant_id !== false) {
    errors.push("CP00-168 cross-tenant test must not expose foreign tenant ID");
  }
  if (tests.fixture_test_descriptors.leak_prevention_test?.exposes_hidden_source_values !== false) {
    errors.push("CP00-168 leak prevention test must not expose hidden source values");
  }
  if (tests.fixture_test_descriptors.leak_prevention_test?.exposes_unauthorized_payload !== false) {
    errors.push("CP00-168 leak prevention test must not expose unauthorized payload");
  }
  if (tests.decision_binding_descriptors.permission_matrix_row?.exposes_raw_matrix_rule !== false) {
    errors.push("CP00-168 permission matrix row must not expose raw matrix rule");
  }
  for (const [key, action] of [
    ["view_decision_binding", "view"],
    ["search_decision_binding", "search"],
    ["mutation_decision_binding", "mutation"],
    ["export_download_decision_binding", "export_download"],
  ]) {
    const descriptor = tests.decision_binding_descriptors[key];
    if (descriptor?.action !== action) errors.push(`CP00-168 ${key} action drift`);
    if (descriptor?.customer_surface_outcome_only !== true) errors.push(`CP00-168 ${key} must be outcome-only`);
    if (descriptor?.decision_binding !== MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.action_decision_bindings[action]) {
      errors.push(`CP00-168 ${key} source binding drift`);
    }
  }
  if (tests.evidence_descriptors.hermes_fixture_decision_tests !== "H04.CP00-168.master_data_permission_audit_fixture_decision_tests") {
    errors.push("CP00-168 Hermes evidence descriptor drift");
  }
  if (tests.evidence_descriptors.claude_fixture_decision_tests_review !== "C04.CP00-168.master_data_permission_audit_fixture_decision_tests") {
    errors.push("CP00-168 Claude review descriptor drift");
  }
  if (tests.leak_guard.renderable_surface !== "customer_facing_permission_audit_fixture_test_outcome_only") {
    errors.push("CP00-168 renderable surface must be fixture-test-outcome-only");
  }
  for (const internalField of [
    "permission_ref",
    "audit_hint_ref",
    "matched_rule_ref",
    "matched_rule_id",
    "fixture_internal_ref",
    "foreign_tenant_id",
    "hidden_source_values",
  ]) {
    if (!tests.leak_guard.internal_reference_fields.includes(internalField)) {
      errors.push(`CP00-168 leak guard missing internal field ${internalField}`);
    }
  }
  if (MASTER_DATA_CP168_NO_WRITE_ATTESTATION.builds_permission_audit_fixture_decision_tests !== true) {
    errors.push("CP00-168 must build fixture decision test descriptors");
  }
  if (MASTER_DATA_CP168_NO_WRITE_ATTESTATION.loads_real_client_data !== false) errors.push("CP00-168 must not load real data");
  if (MASTER_DATA_CP168_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-168 must not evaluate runtime permission");
  if (MASTER_DATA_CP168_NO_WRITE_ATTESTATION.appends_audit_event !== false) errors.push("CP00-168 must not append audit events");
  if (MASTER_DATA_CP168_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-168 must not dispatch review routes");
  if (MASTER_DATA_CP168_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-168 must not dispatch approval routes");
  if (MASTER_DATA_CP168_NO_WRITE_ATTESTATION.executes_ai_retrieval !== false) errors.push("CP00-168 must not execute AI retrieval");

  if (contractProjection) {
    const contractEntry = contractProjection.permission_audit_fixture_decision_tests;
    if (contractEntry?.pack_id !== tests.pack_id) errors.push("CP00-168 contract pack ID drift");
    if (contractEntry?.test_matrix_id !== tests.test_matrix_id) errors.push("CP00-168 contract test matrix ID drift");
    if (contractEntry?.source_control_interactions_id !== tests.source_control_interactions_id) {
      errors.push("CP00-168 contract source control interactions drift");
    }
    if (contractEntry?.source_decision_binding_id !== tests.source_decision_binding_id) {
      errors.push("CP00-168 contract source decision binding drift");
    }
    if (contractEntry?.source_matrix_workflow_id !== tests.source_matrix_workflow_id) {
      errors.push("CP00-168 contract source matrix workflow drift");
    }
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(tests.phase_scope)) {
      errors.push("CP00-168 contract phase scope drift");
    }
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(tests.micro_phase_scope)) {
      errors.push("CP00-168 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.unit_scope ?? {}) !== JSON.stringify(tests.unit_scope)) {
      errors.push("CP00-168 contract unit scope drift");
    }
    if (JSON.stringify(contractEntry?.fixture_test_descriptors ?? {}) !== JSON.stringify(tests.fixture_test_descriptors)) {
      errors.push("CP00-168 contract fixture test descriptors drift");
    }
    if (JSON.stringify(contractEntry?.decision_binding_descriptors ?? {}) !== JSON.stringify(tests.decision_binding_descriptors)) {
      errors.push("CP00-168 contract decision binding descriptors drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(tests.evidence_descriptors)) {
      errors.push("CP00-168 contract evidence descriptors drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== tests.leak_guard.renderable_surface) {
      errors.push("CP00-168 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.internal_reference_fields ?? []) !== JSON.stringify(tests.leak_guard.internal_reference_fields)) {
      errors.push("CP00-168 contract internal reference fields drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(tests.leak_guard.prohibited_outputs)) {
      errors.push("CP00-168 contract prohibited outputs drift");
    }
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      permission_audit_fixture_decision_tests: tests,
      no_write_attestation: MASTER_DATA_CP168_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP168_PACK_BINDING,
  );
}

export function createMasterDataCp168HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp168Coverage(planPack);
  const fixtureTests = validateMasterDataCp168PermissionAuditFixtureDecisionTests();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.evidence_descriptors.hermes_fixture_decision_tests,
      gate: MASTER_DATA_CP168_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP168_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_fixture_decision_tests_valid: fixtureTests.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP168_NO_WRITE_ATTESTATION,
      fixture_test_count: Object.keys(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.fixture_test_descriptors).length,
      decision_binding_count: Object.keys(MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.decision_binding_descriptors).length,
      next_pack_id: MASTER_DATA_CP168_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP168_PACK_BINDING,
  );
}

export function createMasterDataCp168ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp168Coverage(planPack);
  const fixtureTests = validateMasterDataCp168PermissionAuditFixtureDecisionTests();
  return freezeResult(
    {
      review_packet: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.evidence_descriptors.claude_fixture_decision_tests_review,
      gate: MASTER_DATA_CP168_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP168_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_fixture_decision_tests_valid: fixtureTests.valid,
      questions: Object.freeze([
        "Does CP00-168 keep this Risk A permission/audit fixture-test boundary to 10 units without widening sensitive scope?",
        "Are permission fixture, allowed, denied, cross-tenant, leak-prevention, matrix-row, view, search, mutation, and export/download descriptors all covered?",
        "Do customer-facing fixture test outcomes exclude permission refs, audit internals, matched-rule refs, foreign tenant IDs, hidden source values, denied item payloads, and raw rules?",
        "Are fixture tests and decision bindings descriptor-only without runtime permission evaluation, audit append, route dispatch, real data loading, or API/UI/AI/analytics execution?",
        "Does CP00-168 hand off cleanly to CP00-169 / RP04.P06.M06.S06?",
      ]),
      next_pack_id: MASTER_DATA_CP168_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP168_PACK_BINDING,
  );
}

export function createMasterDataCp168CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP168_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP168_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP168_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP168_PACK_BINDING.range,
      open_scope: "Continue RP04.P06.M06.S06 generated Master Data permission/audit workflow continuation in CP00-169.",
      production_ready_flag: MASTER_DATA_CP168_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP168_PACK_BINDING,
  );
}

export function createMasterDataCp169CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  const byTitle = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byTitle[unit.title] = (byTitle[unit.title] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP169_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_title: Object.freeze(byTitle),
      catalog_id: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.catalog_id,
      continuation_descriptors: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.continuation_descriptors,
      failure_taxonomy_descriptors: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.failure_taxonomy_descriptors,
    },
    MASTER_DATA_CP169_PACK_BINDING,
  );
}

export function validateMasterDataCp169Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-169 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP169_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-169");
  if (planPack?.risk_class !== MASTER_DATA_CP169_PACK_BINDING.risk_class) errors.push("CP00-169 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP169_PACK_BINDING.unit_count) errors.push("CP00-169 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP169_PACK_BINDING.first_unit_id) errors.push("CP00-169 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP169_PACK_BINDING.last_unit_id) errors.push("CP00-169 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-169 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-169 must only include RP04 units");
  const summary = createMasterDataCp169CoverageSummary(planPack);
  for (const [deliverable, expectedCount] of Object.entries(
    MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.unit_scope_summary.deliverable_distribution,
  )) {
    if (summary.by_deliverable[deliverable] !== expectedCount) errors.push(`CP00-169 ${deliverable} distribution drift`);
  }
  for (const [microPhase, expectedCount] of [
    ["RP04.P06.M06", 15],
    ["RP04.P06.M07", 22],
    ["RP04.P06.M08", 20],
    ["RP04.P06.M09", 20],
    ["RP04.P06.M10", 11],
    ["RP04.P07.M00", 11],
    ["RP04.P07.M01", 11],
    ["RP04.P07.M02", 20],
    ["RP04.P07.M03", 20],
  ]) {
    if (summary.by_micro_phase[microPhase] !== expectedCount) errors.push(`CP00-169 ${microPhase} distribution drift`);
  }
  if (summary.by_title["Share decision binding"] !== 5) errors.push("CP00-169 share decision binding coverage drift");
  if (summary.by_title["AI retrieval decision binding"] !== 5) errors.push("CP00-169 AI retrieval decision binding coverage drift");
  if (summary.by_title["Failure taxonomy"] !== 4) errors.push("CP00-169 failure taxonomy coverage drift");
  if (summary.by_title["Hermes failure evidence"] !== 2) errors.push("CP00-169 Hermes failure evidence coverage drift");
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP169_PACK_BINDING,
  );
}

export function validateMasterDataCp169PermissionAuditWorkflowFailureTaxonomy(contractProjection = null) {
  const errors = [];
  const taxonomy = MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY;
  if (taxonomy.pack_id !== MASTER_DATA_CP169_PACK_BINDING.pack_id) errors.push("CP00-169 workflow failure taxonomy pack ID drift");
  if (taxonomy.source_fixture_decision_tests_id !== MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.test_matrix_id) {
    errors.push("CP00-169 source fixture decision tests drift");
  }
  if (taxonomy.source_control_interactions_id !== MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_id) {
    errors.push("CP00-169 source control interactions drift");
  }
  if (taxonomy.source_decision_binding_id !== MASTER_DATA_PERMISSION_AUDIT_DECISION_BINDING.binding_id) {
    errors.push("CP00-169 source decision binding drift");
  }
  if (taxonomy.source_matrix_workflow_id !== MASTER_DATA_PERMISSION_MATRIX_WORKFLOW.matrix_id) {
    errors.push("CP00-169 source matrix workflow drift");
  }
  for (const phase of ["RP04.P06", "RP04.P07"]) {
    if (!taxonomy.phase_scope.includes(phase)) errors.push(`CP00-169 missing phase ${phase}`);
  }
  for (const microPhase of [
    "RP04.P06.M06",
    "RP04.P06.M07",
    "RP04.P06.M08",
    "RP04.P06.M09",
    "RP04.P06.M10",
    "RP04.P07.M00",
    "RP04.P07.M01",
    "RP04.P07.M02",
    "RP04.P07.M03",
  ]) {
    if (!taxonomy.micro_phase_scope.includes(microPhase)) errors.push(`CP00-169 missing micro phase ${microPhase}`);
  }
  for (const key of ["share_decision_binding", "ai_retrieval_decision_binding", "hermes_evidence_packet", "claude_review_packet", "closeout_handoff"]) {
    if (!taxonomy.continuation_descriptors[key]) errors.push(`CP00-169 missing continuation descriptor ${key}`);
  }
  for (const key of [
    "missing_tenant_failure",
    "missing_actor_failure",
    "missing_matter_failure",
    "missing_resource_failure",
    "unknown_action_failure",
    "cross_tenant_failure",
    "permission_denied_failure",
    "ambiguous_rule_failure",
    "stale_reference_failure",
    "lock_conflict_failure",
    "retry_exhaustion_failure",
    "rollback_expectation",
    "compensation_expectation",
    "blocked_claim_receipt",
    "failure_fixture",
    "failure_unit_test",
    "failure_integration_smoke",
    "audit_failure_hint",
    "hermes_failure_evidence",
  ]) {
    if (!taxonomy.failure_taxonomy_descriptors[key]) errors.push(`CP00-169 missing failure descriptor ${key}`);
  }
  if (taxonomy.continuation_descriptors.share_decision_binding?.dispatches_approval_route !== false) {
    errors.push("CP00-169 share binding must not dispatch approval route");
  }
  if (taxonomy.continuation_descriptors.ai_retrieval_decision_binding?.executes_ai_retrieval !== false) {
    errors.push("CP00-169 AI retrieval binding must not execute retrieval");
  }
  if (taxonomy.failure_taxonomy_descriptors.cross_tenant_failure?.exposes_foreign_tenant_id !== false) {
    errors.push("CP00-169 cross-tenant failure must not expose foreign tenant ID");
  }
  if (taxonomy.failure_taxonomy_descriptors.permission_denied_failure?.exposes_permission_rule !== false) {
    errors.push("CP00-169 permission denied failure must not expose permission rule");
  }
  if (taxonomy.failure_taxonomy_descriptors.ambiguous_rule_failure?.exposes_rule_candidates !== false) {
    errors.push("CP00-169 ambiguous rule failure must not expose rule candidates");
  }
  if (taxonomy.failure_taxonomy_descriptors.stale_reference_failure?.exposes_stale_payload !== false) {
    errors.push("CP00-169 stale reference failure must not expose stale payload");
  }
  if (taxonomy.failure_taxonomy_descriptors.lock_conflict_failure?.acquires_runtime_lock !== false) {
    errors.push("CP00-169 lock conflict failure must not acquire runtime lock");
  }
  if (taxonomy.failure_taxonomy_descriptors.retry_exhaustion_failure?.executes_retry !== false) {
    errors.push("CP00-169 retry exhaustion must not execute retry");
  }
  if (taxonomy.failure_taxonomy_descriptors.rollback_expectation?.executes_rollback !== false) {
    errors.push("CP00-169 rollback expectation must not execute rollback");
  }
  if (taxonomy.failure_taxonomy_descriptors.blocked_claim_receipt?.emits_hermes_evidence !== false) {
    errors.push("CP00-169 blocked claim receipt must not emit Hermes evidence");
  }
  if (taxonomy.failure_taxonomy_descriptors.failure_fixture?.synthetic_only !== true) {
    errors.push("CP00-169 failure fixture must be synthetic-only");
  }
  if (taxonomy.continuation_descriptors.claude_review_packet?.read_only !== true) errors.push("CP00-169 Claude review packet must be read-only");
  if (taxonomy.evidence_descriptors.hermes_workflow_failure_taxonomy !== "H04.CP00-169.master_data_permission_audit_workflow_failure_taxonomy") {
    errors.push("CP00-169 Hermes evidence descriptor drift");
  }
  if (taxonomy.evidence_descriptors.claude_workflow_failure_taxonomy_review !== "C04.CP00-169.master_data_permission_audit_workflow_failure_taxonomy") {
    errors.push("CP00-169 Claude review descriptor drift");
  }
  if (taxonomy.leak_guard.renderable_surface !== "customer_facing_permission_audit_failure_taxonomy_summary_only") {
    errors.push("CP00-169 renderable surface must be failure taxonomy summary only");
  }
  for (const internalField of [
    "permission_ref",
    "audit_hint_ref",
    "matched_rule_ref",
    "blocked_claim",
    "foreign_tenant_id",
    "hidden_source_values",
    "rule_candidates",
    "stale_payload",
  ]) {
    if (!taxonomy.leak_guard.internal_reference_fields.includes(internalField)) {
      errors.push(`CP00-169 leak guard missing internal field ${internalField}`);
    }
  }
  if (MASTER_DATA_CP169_NO_WRITE_ATTESTATION.builds_permission_audit_workflow_failure_taxonomy !== true) {
    errors.push("CP00-169 must build workflow failure taxonomy descriptors");
  }
  if (MASTER_DATA_CP169_NO_WRITE_ATTESTATION.loads_real_client_data !== false) errors.push("CP00-169 must not load real data");
  if (MASTER_DATA_CP169_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-169 must not evaluate runtime permission");
  if (MASTER_DATA_CP169_NO_WRITE_ATTESTATION.appends_audit_event !== false) errors.push("CP00-169 must not append audit events");
  if (MASTER_DATA_CP169_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-169 must not dispatch review routes");
  if (MASTER_DATA_CP169_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-169 must not dispatch approval routes");
  if (MASTER_DATA_CP169_NO_WRITE_ATTESTATION.executes_ai_retrieval !== false) errors.push("CP00-169 must not execute AI retrieval");
  if (MASTER_DATA_CP169_NO_WRITE_ATTESTATION.emits_hermes_evidence !== false) errors.push("CP00-169 must not emit Hermes evidence");
  if (MASTER_DATA_CP169_NO_WRITE_ATTESTATION.sends_claude_prompt !== false) errors.push("CP00-169 must not send Claude prompts");

  if (contractProjection) {
    const contractEntry = contractProjection.permission_audit_workflow_failure_taxonomy;
    if (contractEntry?.pack_id !== taxonomy.pack_id) errors.push("CP00-169 contract pack ID drift");
    if (contractEntry?.catalog_id !== taxonomy.catalog_id) errors.push("CP00-169 contract catalog ID drift");
    if (contractEntry?.source_fixture_decision_tests_id !== taxonomy.source_fixture_decision_tests_id) {
      errors.push("CP00-169 contract source fixture decision tests drift");
    }
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(taxonomy.phase_scope)) {
      errors.push("CP00-169 contract phase scope drift");
    }
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(taxonomy.micro_phase_scope)) {
      errors.push("CP00-169 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.unit_scope_summary ?? {}) !== JSON.stringify(taxonomy.unit_scope_summary)) {
      errors.push("CP00-169 contract unit scope summary drift");
    }
    if (JSON.stringify(contractEntry?.continuation_descriptors ?? {}) !== JSON.stringify(taxonomy.continuation_descriptors)) {
      errors.push("CP00-169 contract continuation descriptors drift");
    }
    if (JSON.stringify(contractEntry?.failure_taxonomy_descriptors ?? {}) !== JSON.stringify(taxonomy.failure_taxonomy_descriptors)) {
      errors.push("CP00-169 contract failure taxonomy descriptors drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(taxonomy.evidence_descriptors)) {
      errors.push("CP00-169 contract evidence descriptors drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== taxonomy.leak_guard.renderable_surface) {
      errors.push("CP00-169 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.internal_reference_fields ?? []) !== JSON.stringify(taxonomy.leak_guard.internal_reference_fields)) {
      errors.push("CP00-169 contract internal reference fields drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(taxonomy.leak_guard.prohibited_outputs)) {
      errors.push("CP00-169 contract prohibited outputs drift");
    }
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      permission_audit_workflow_failure_taxonomy: taxonomy,
      no_write_attestation: MASTER_DATA_CP169_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP169_PACK_BINDING,
  );
}

export function createMasterDataCp169HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp169Coverage(planPack);
  const taxonomy = validateMasterDataCp169PermissionAuditWorkflowFailureTaxonomy();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.evidence_descriptors.hermes_workflow_failure_taxonomy,
      gate: MASTER_DATA_CP169_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP169_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_workflow_failure_taxonomy_valid: taxonomy.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP169_NO_WRITE_ATTESTATION,
      descriptor_count:
        Object.keys(MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.continuation_descriptors).length +
        Object.keys(MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.failure_taxonomy_descriptors).length,
      next_pack_id: MASTER_DATA_CP169_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP169_PACK_BINDING,
  );
}

export function createMasterDataCp169ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp169Coverage(planPack);
  const taxonomy = validateMasterDataCp169PermissionAuditWorkflowFailureTaxonomy();
  return freezeResult(
    {
      review_packet: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.evidence_descriptors.claude_workflow_failure_taxonomy_review,
      gate: MASTER_DATA_CP169_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP169_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_workflow_failure_taxonomy_valid: taxonomy.valid,
      questions: Object.freeze([
        "Does CP00-169 keep this Risk C workflow/failure-taxonomy continuation descriptor-only while covering all 150 planned units?",
        "Are share and AI retrieval decision bindings represented without approval dispatch, runtime permission evaluation, audit append, or AI retrieval execution?",
        "Are missing tenant, missing actor, missing matter, missing resource, unknown action, cross-tenant, permission denied, ambiguous rule, stale reference, lock conflict, retry, rollback, and compensation failures covered?",
        "Do customer-facing summaries exclude permission refs, audit internals, blocked-claim refs, foreign tenant IDs, hidden source values, rule candidates, stale payloads, and denied payloads?",
        "Does CP00-169 hand off cleanly to CP00-170 / RP04.P07.M03.S21?",
      ]),
      next_pack_id: MASTER_DATA_CP169_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP169_PACK_BINDING,
  );
}

export function createMasterDataCp169CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP169_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP169_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP169_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP169_PACK_BINDING.range,
      open_scope: "Continue RP04.P07.M03.S21 generated Master Data failure taxonomy workflow binding in CP00-170.",
      production_ready_flag: MASTER_DATA_CP169_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP169_PACK_BINDING,
  );
}

export function createMasterDataCp170CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  const byTitle = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byTitle[unit.title] = (byTitle[unit.title] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP170_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_title: Object.freeze(byTitle),
      catalog_id: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.catalog_id,
      edge_case_descriptors: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.edge_case_descriptors,
      failure_recovery_bindings: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.failure_recovery_bindings,
    },
    MASTER_DATA_CP170_PACK_BINDING,
  );
}

export function validateMasterDataCp170Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-170 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP170_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-170");
  if (planPack?.risk_class !== MASTER_DATA_CP170_PACK_BINDING.risk_class) errors.push("CP00-170 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP170_PACK_BINDING.unit_count) errors.push("CP00-170 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP170_PACK_BINDING.first_unit_id) errors.push("CP00-170 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP170_PACK_BINDING.last_unit_id) errors.push("CP00-170 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-170 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-170 must only include RP04 units");
  const summary = createMasterDataCp170CoverageSummary(planPack);
  for (const [deliverable, expectedCount] of Object.entries(
    MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.unit_scope_summary.deliverable_distribution,
  )) {
    if (summary.by_deliverable[deliverable] !== expectedCount) errors.push(`CP00-170 ${deliverable} distribution drift`);
  }
  for (const [microPhase, expectedCount] of Object.entries(
    MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.unit_scope_summary.micro_phase_distribution,
  )) {
    if (summary.by_micro_phase[microPhase] !== expectedCount) errors.push(`CP00-170 ${microPhase} distribution drift`);
  }
  for (const [title, expectedCount] of Object.entries(
    MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.unit_scope_summary.title_distribution,
  )) {
    if (summary.by_title[title] !== expectedCount) errors.push(`CP00-170 ${title} title distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP170_PACK_BINDING,
  );
}

export function validateMasterDataCp170FailureTaxonomyEdgeCaseEscalation(contractProjection = null) {
  const errors = [];
  const catalog = MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION;
  if (catalog.pack_id !== MASTER_DATA_CP170_PACK_BINDING.pack_id) errors.push("CP00-170 edge-case escalation pack ID drift");
  if (catalog.source_failure_taxonomy_catalog_id !== MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.catalog_id) {
    errors.push("CP00-170 source failure taxonomy catalog drift");
  }
  if (catalog.source_fixture_decision_tests_id !== MASTER_DATA_PERMISSION_AUDIT_FIXTURE_DECISION_TESTS.test_matrix_id) {
    errors.push("CP00-170 source fixture decision tests drift");
  }
  if (catalog.source_control_interactions_id !== MASTER_DATA_PERMISSION_AUDIT_CONTROL_INTERACTIONS.control_id) {
    errors.push("CP00-170 source control interactions drift");
  }
  if (!catalog.phase_scope.includes("RP04.P07")) errors.push("CP00-170 missing RP04.P07 phase scope");
  for (const microPhase of ["RP04.P07.M03", "RP04.P07.M04", "RP04.P07.M05"]) {
    if (!catalog.micro_phase_scope.includes(microPhase)) errors.push(`CP00-170 missing micro phase ${microPhase}`);
  }
  for (const key of ["claude_edge_case_prompt", "human_escalation_note"]) {
    if (!catalog.edge_case_descriptors[key]) errors.push(`CP00-170 missing edge-case descriptor ${key}`);
  }
  for (const key of [
    "failure_taxonomy",
    "missing_tenant_failure",
    "missing_actor_failure",
    "missing_matter_failure",
    "missing_resource_failure",
    "unknown_action_failure",
    "cross_tenant_failure",
    "permission_denied_failure",
    "ambiguous_rule_failure",
    "stale_reference_failure",
    "lock_conflict_failure",
    "retry_exhaustion_failure",
    "rollback_expectation",
    "compensation_expectation",
    "blocked_claim_receipt",
    "failure_fixture",
    "failure_unit_test",
    "failure_integration_smoke",
    "audit_failure_hint",
    "hermes_failure_evidence",
  ]) {
    if (!catalog.failure_recovery_bindings[key]) errors.push(`CP00-170 missing failure recovery binding ${key}`);
  }
  if (catalog.edge_case_descriptors.claude_edge_case_prompt?.sends_claude_prompt !== false) {
    errors.push("CP00-170 Claude edge-case prompt must not send prompt");
  }
  if (catalog.edge_case_descriptors.claude_edge_case_prompt?.read_only !== true) {
    errors.push("CP00-170 Claude edge-case prompt must be read-only");
  }
  if (catalog.edge_case_descriptors.human_escalation_note?.dispatches_review_route !== false) {
    errors.push("CP00-170 human escalation note must not dispatch review route");
  }
  if (catalog.edge_case_descriptors.human_escalation_note?.writes_case_note !== false) {
    errors.push("CP00-170 human escalation note must not write case notes");
  }
  if (catalog.failure_recovery_bindings.cross_tenant_failure?.exposes_foreign_tenant_id !== false) {
    errors.push("CP00-170 cross-tenant failure must not expose foreign tenant ID");
  }
  if (catalog.failure_recovery_bindings.permission_denied_failure?.exposes_permission_rule !== false) {
    errors.push("CP00-170 permission denied failure must not expose permission rule");
  }
  if (catalog.failure_recovery_bindings.ambiguous_rule_failure?.exposes_rule_candidates !== false) {
    errors.push("CP00-170 ambiguous rule failure must not expose rule candidates");
  }
  if (catalog.failure_recovery_bindings.stale_reference_failure?.exposes_stale_payload !== false) {
    errors.push("CP00-170 stale reference failure must not expose stale payload");
  }
  if (catalog.failure_recovery_bindings.lock_conflict_failure?.acquires_runtime_lock !== false) {
    errors.push("CP00-170 lock conflict must not acquire runtime locks");
  }
  if (catalog.failure_recovery_bindings.retry_exhaustion_failure?.executes_retry !== false) {
    errors.push("CP00-170 retry exhaustion must not execute retry");
  }
  if (catalog.failure_recovery_bindings.rollback_expectation?.executes_rollback !== false) {
    errors.push("CP00-170 rollback expectation must not execute rollback");
  }
  if (catalog.failure_recovery_bindings.blocked_claim_receipt?.emits_hermes_evidence !== false) {
    errors.push("CP00-170 blocked claim receipt must not emit Hermes evidence");
  }
  if (catalog.failure_recovery_bindings.failure_fixture?.synthetic_only !== true) {
    errors.push("CP00-170 failure fixture must be synthetic-only");
  }
  if (catalog.failure_recovery_bindings.audit_failure_hint?.appends_audit_event !== false) {
    errors.push("CP00-170 audit failure hint must not append audit events");
  }
  if (catalog.failure_recovery_bindings.hermes_failure_evidence?.emits_hermes_evidence !== false) {
    errors.push("CP00-170 Hermes failure evidence must not emit Hermes evidence from package code");
  }
  if (catalog.evidence_descriptors.hermes_edge_case_escalation !== "H04.CP00-170.master_data_failure_taxonomy_edge_case_escalation") {
    errors.push("CP00-170 Hermes evidence descriptor drift");
  }
  if (catalog.evidence_descriptors.claude_edge_case_escalation_review !== "C04.CP00-170.master_data_failure_taxonomy_edge_case_escalation") {
    errors.push("CP00-170 Claude review descriptor drift");
  }
  if (catalog.leak_guard.renderable_surface !== "customer_facing_failure_edge_case_summary_only") {
    errors.push("CP00-170 renderable surface must be customer-facing edge-case summary only");
  }
  for (const internalField of [
    "permission_ref",
    "audit_hint_ref",
    "matched_rule_ref",
    "blocked_claim",
    "foreign_tenant_id",
    "hidden_source_values",
    "rule_candidates",
    "stale_payload",
    "internal_prompt",
    "internal_note",
    "escalation_queue_ref",
    "reviewer_identity",
  ]) {
    if (!catalog.leak_guard.internal_reference_fields.includes(internalField)) {
      errors.push(`CP00-170 leak guard missing internal field ${internalField}`);
    }
  }
  if (MASTER_DATA_CP170_NO_WRITE_ATTESTATION.builds_failure_taxonomy_edge_case_escalation !== true) {
    errors.push("CP00-170 must build failure taxonomy edge-case escalation descriptors");
  }
  if (MASTER_DATA_CP170_NO_WRITE_ATTESTATION.loads_real_client_data !== false) errors.push("CP00-170 must not load real data");
  if (MASTER_DATA_CP170_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-170 must not evaluate runtime permission");
  if (MASTER_DATA_CP170_NO_WRITE_ATTESTATION.appends_audit_event !== false) errors.push("CP00-170 must not append audit events");
  if (MASTER_DATA_CP170_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-170 must not dispatch review routes");
  if (MASTER_DATA_CP170_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-170 must not dispatch approval routes");
  if (MASTER_DATA_CP170_NO_WRITE_ATTESTATION.executes_ai_retrieval !== false) errors.push("CP00-170 must not execute AI retrieval");
  if (MASTER_DATA_CP170_NO_WRITE_ATTESTATION.emits_hermes_evidence !== false) errors.push("CP00-170 must not emit Hermes evidence");
  if (MASTER_DATA_CP170_NO_WRITE_ATTESTATION.sends_claude_prompt !== false) errors.push("CP00-170 must not send Claude prompts");
  if (MASTER_DATA_CP170_NO_WRITE_ATTESTATION.writes_case_note !== false) errors.push("CP00-170 must not write case notes");
  for (const flag of [
    "executes_hermes_command",
    "executes_claude_review",
    "executes_retry",
    "executes_rollback",
    "acquires_runtime_lock",
    "renders_ui",
    "mutates_dom",
    "issues_network_request",
    "executes_api_handler",
    "writes_product_state",
  ]) {
    if (MASTER_DATA_CP170_NO_WRITE_ATTESTATION[flag] !== false) errors.push(`CP00-170 must keep ${flag} false`);
  }

  if (contractProjection) {
    const contractEntry = contractProjection.failure_taxonomy_edge_case_escalation;
    if (contractEntry?.pack_id !== catalog.pack_id) errors.push("CP00-170 contract pack ID drift");
    if (contractEntry?.catalog_id !== catalog.catalog_id) errors.push("CP00-170 contract catalog ID drift");
    if (contractEntry?.source_failure_taxonomy_catalog_id !== catalog.source_failure_taxonomy_catalog_id) {
      errors.push("CP00-170 contract source failure taxonomy catalog drift");
    }
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(catalog.phase_scope)) {
      errors.push("CP00-170 contract phase scope drift");
    }
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(catalog.micro_phase_scope)) {
      errors.push("CP00-170 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.unit_scope_summary ?? {}) !== JSON.stringify(catalog.unit_scope_summary)) {
      errors.push("CP00-170 contract unit scope summary drift");
    }
    if (JSON.stringify(contractEntry?.edge_case_descriptors ?? {}) !== JSON.stringify(catalog.edge_case_descriptors)) {
      errors.push("CP00-170 contract edge-case descriptors drift");
    }
    if (JSON.stringify(contractEntry?.failure_recovery_bindings ?? {}) !== JSON.stringify(catalog.failure_recovery_bindings)) {
      errors.push("CP00-170 contract failure recovery bindings drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(catalog.evidence_descriptors)) {
      errors.push("CP00-170 contract evidence descriptors drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== catalog.leak_guard.renderable_surface) {
      errors.push("CP00-170 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.internal_reference_fields ?? []) !== JSON.stringify(catalog.leak_guard.internal_reference_fields)) {
      errors.push("CP00-170 contract internal reference fields drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(catalog.leak_guard.prohibited_outputs)) {
      errors.push("CP00-170 contract prohibited outputs drift");
    }
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      failure_taxonomy_edge_case_escalation: catalog,
      no_write_attestation: MASTER_DATA_CP170_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP170_PACK_BINDING,
  );
}

export function createMasterDataCp170HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp170Coverage(planPack);
  const edgeCaseEscalation = validateMasterDataCp170FailureTaxonomyEdgeCaseEscalation();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.evidence_descriptors.hermes_edge_case_escalation,
      gate: MASTER_DATA_CP170_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP170_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      failure_taxonomy_edge_case_escalation_valid: edgeCaseEscalation.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP170_NO_WRITE_ATTESTATION,
      descriptor_count:
        Object.keys(MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.edge_case_descriptors).length +
        Object.keys(MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.failure_recovery_bindings).length,
      next_pack_id: MASTER_DATA_CP170_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP170_PACK_BINDING,
  );
}

export function createMasterDataCp170ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp170Coverage(planPack);
  const edgeCaseEscalation = validateMasterDataCp170FailureTaxonomyEdgeCaseEscalation();
  return freezeResult(
    {
      review_packet: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.evidence_descriptors.claude_edge_case_escalation_review,
      gate: MASTER_DATA_CP170_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP170_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      failure_taxonomy_edge_case_escalation_valid: edgeCaseEscalation.valid,
      questions: Object.freeze([
        "Does CP00-170 preserve the CP169 failure taxonomy while adding only descriptor-only edge-case prompt and human escalation note coverage?",
        "Are missing tenant, actor, Matter, resource, unknown action, cross-tenant, permission denied, ambiguous rule, stale reference, lock, retry, rollback, and compensation cases replayed without leaking internals?",
        "Does the human escalation descriptor avoid route dispatch, approval dispatch, and case-note writes?",
        "Does the Claude edge-case descriptor remain read-only and avoid sending prompts from package code?",
        "Does CP00-170 hand off cleanly to CP00-171 / RP04.P07.M05.S19?",
      ]),
      next_pack_id: MASTER_DATA_CP170_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP170_PACK_BINDING,
  );
}

export function createMasterDataCp170CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP170_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP170_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP170_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP170_PACK_BINDING.range,
      open_scope: "Continue RP04.P07.M05.S19 generated Master Data failure taxonomy boundary in CP00-171.",
      production_ready_flag: MASTER_DATA_CP170_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP170_PACK_BINDING,
  );
}

export function createMasterDataCp171CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  const byTitle = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byTitle[unit.title] = (byTitle[unit.title] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP171_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_title: Object.freeze(byTitle),
      catalog_id: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.catalog_id,
      boundary_descriptors: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.boundary_descriptors,
      entry_failure_bindings: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.entry_failure_bindings,
    },
    MASTER_DATA_CP171_PACK_BINDING,
  );
}

export function validateMasterDataCp171Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-171 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP171_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-171");
  if (planPack?.risk_class !== MASTER_DATA_CP171_PACK_BINDING.risk_class) errors.push("CP00-171 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP171_PACK_BINDING.unit_count) errors.push("CP00-171 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP171_PACK_BINDING.first_unit_id) errors.push("CP00-171 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP171_PACK_BINDING.last_unit_id) errors.push("CP00-171 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-171 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-171 must only include RP04 units");
  const summary = createMasterDataCp171CoverageSummary(planPack);
  for (const [deliverable, expectedCount] of Object.entries(
    MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.unit_scope_summary.deliverable_distribution,
  )) {
    if (summary.by_deliverable[deliverable] !== expectedCount) errors.push(`CP00-171 ${deliverable} distribution drift`);
  }
  for (const [microPhase, expectedCount] of Object.entries(
    MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.unit_scope_summary.micro_phase_distribution,
  )) {
    if (summary.by_micro_phase[microPhase] !== expectedCount) errors.push(`CP00-171 ${microPhase} distribution drift`);
  }
  for (const [title, expectedCount] of Object.entries(
    MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.unit_scope_summary.title_distribution,
  )) {
    if (summary.by_title[title] !== expectedCount) errors.push(`CP00-171 ${title} title distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP171_PACK_BINDING,
  );
}

export function validateMasterDataCp171FailureTaxonomySensitiveEntryBoundary(contractProjection = null) {
  const errors = [];
  const catalog = MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY;
  if (catalog.pack_id !== MASTER_DATA_CP171_PACK_BINDING.pack_id) errors.push("CP00-171 sensitive entry pack ID drift");
  if (catalog.source_edge_case_escalation_catalog_id !== MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.catalog_id) {
    errors.push("CP00-171 source edge-case escalation catalog drift");
  }
  if (catalog.source_failure_taxonomy_catalog_id !== MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.catalog_id) {
    errors.push("CP00-171 source failure taxonomy catalog drift");
  }
  if (!catalog.phase_scope.includes("RP04.P07")) errors.push("CP00-171 missing RP04.P07 phase scope");
  for (const microPhase of ["RP04.P07.M05", "RP04.P07.M06"]) {
    if (!catalog.micro_phase_scope.includes(microPhase)) errors.push(`CP00-171 missing micro phase ${microPhase}`);
  }
  for (const key of ["audit_failure_hint", "hermes_failure_evidence", "claude_edge_case_prompt", "human_escalation_note"]) {
    if (!catalog.boundary_descriptors[key]) errors.push(`CP00-171 missing boundary descriptor ${key}`);
  }
  for (const key of [
    "failure_taxonomy",
    "missing_tenant_failure",
    "missing_actor_failure",
    "missing_matter_failure",
    "missing_resource_failure",
    "unknown_action_failure",
  ]) {
    if (!catalog.entry_failure_bindings[key]) errors.push(`CP00-171 missing entry failure binding ${key}`);
  }
  if (catalog.boundary_descriptors.audit_failure_hint?.appends_audit_event !== false) {
    errors.push("CP00-171 audit failure hint must not append audit events");
  }
  if (catalog.boundary_descriptors.audit_failure_hint?.exposes_audit_payload !== false) {
    errors.push("CP00-171 audit failure hint must not expose audit payload");
  }
  if (catalog.boundary_descriptors.hermes_failure_evidence?.emits_hermes_evidence !== false) {
    errors.push("CP00-171 Hermes failure evidence must not emit Hermes evidence from package code");
  }
  if (catalog.boundary_descriptors.hermes_failure_evidence?.executes_hermes_command !== false) {
    errors.push("CP00-171 Hermes failure evidence must not execute Hermes commands");
  }
  if (catalog.boundary_descriptors.claude_edge_case_prompt?.sends_claude_prompt !== false) {
    errors.push("CP00-171 Claude prompt boundary must not send prompts");
  }
  if (catalog.boundary_descriptors.claude_edge_case_prompt?.read_only !== true) {
    errors.push("CP00-171 Claude prompt boundary must be read-only");
  }
  if (catalog.boundary_descriptors.human_escalation_note?.dispatches_review_route !== false) {
    errors.push("CP00-171 human note must not dispatch review routes");
  }
  if (catalog.boundary_descriptors.human_escalation_note?.writes_case_note !== false) {
    errors.push("CP00-171 human note must not write case notes");
  }
  if (catalog.entry_failure_bindings.missing_tenant_failure?.exposes_foreign_tenant_id !== false) {
    errors.push("CP00-171 missing tenant failure must not expose foreign tenant ID");
  }
  if (catalog.entry_failure_bindings.missing_matter_failure?.exposes_matter_payload !== false) {
    errors.push("CP00-171 missing Matter failure must not expose matter payload");
  }
  if (catalog.entry_failure_bindings.missing_resource_failure?.exposes_resource_payload !== false) {
    errors.push("CP00-171 missing resource failure must not expose resource payload");
  }
  if (catalog.evidence_descriptors.hermes_sensitive_entry_boundary !== "H04.CP00-171.master_data_failure_taxonomy_sensitive_entry_boundary") {
    errors.push("CP00-171 Hermes evidence descriptor drift");
  }
  if (catalog.evidence_descriptors.claude_sensitive_entry_boundary_review !== "C04.CP00-171.master_data_failure_taxonomy_sensitive_entry_boundary") {
    errors.push("CP00-171 Claude review descriptor drift");
  }
  if (catalog.leak_guard.renderable_surface !== "customer_facing_missing_scope_failure_summary_only") {
    errors.push("CP00-171 renderable surface must be missing-scope summary only");
  }
  for (const internalField of [
    "permission_ref",
    "audit_hint_ref",
    "matched_rule_ref",
    "blocked_claim",
    "foreign_tenant_id",
    "hidden_source_values",
    "matter_payload",
    "resource_payload",
    "internal_prompt",
    "internal_note",
    "source_descriptor_key",
  ]) {
    if (!catalog.leak_guard.internal_reference_fields.includes(internalField)) {
      errors.push(`CP00-171 leak guard missing internal field ${internalField}`);
    }
  }
  if (MASTER_DATA_CP171_NO_WRITE_ATTESTATION.builds_failure_taxonomy_sensitive_entry_boundary !== true) {
    errors.push("CP00-171 must build failure taxonomy sensitive entry descriptors");
  }
  if (MASTER_DATA_CP171_NO_WRITE_ATTESTATION.loads_real_client_data !== false) errors.push("CP00-171 must not load real data");
  if (MASTER_DATA_CP171_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-171 must not evaluate runtime permission");
  if (MASTER_DATA_CP171_NO_WRITE_ATTESTATION.appends_audit_event !== false) errors.push("CP00-171 must not append audit events");
  if (MASTER_DATA_CP171_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-171 must not dispatch review routes");
  if (MASTER_DATA_CP171_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-171 must not dispatch approval routes");
  if (MASTER_DATA_CP171_NO_WRITE_ATTESTATION.emits_hermes_evidence !== false) errors.push("CP00-171 must not emit Hermes evidence");
  if (MASTER_DATA_CP171_NO_WRITE_ATTESTATION.executes_hermes_command !== false) errors.push("CP00-171 must not execute Hermes commands");
  if (MASTER_DATA_CP171_NO_WRITE_ATTESTATION.sends_claude_prompt !== false) errors.push("CP00-171 must not send Claude prompts");
  if (MASTER_DATA_CP171_NO_WRITE_ATTESTATION.writes_case_note !== false) errors.push("CP00-171 must not write case notes");
  for (const flag of [
    "executes_claude_review",
    "executes_retry",
    "executes_rollback",
    "acquires_runtime_lock",
    "renders_ui",
    "mutates_dom",
    "issues_network_request",
    "executes_api_handler",
    "writes_product_state",
    "executes_ai_retrieval",
    "executes_analytics_query",
  ]) {
    if (MASTER_DATA_CP171_NO_WRITE_ATTESTATION[flag] !== false) errors.push(`CP00-171 must keep ${flag} false`);
  }

  if (contractProjection) {
    const contractEntry = contractProjection.failure_taxonomy_sensitive_entry_boundary;
    if (contractEntry?.pack_id !== catalog.pack_id) errors.push("CP00-171 contract pack ID drift");
    if (contractEntry?.catalog_id !== catalog.catalog_id) errors.push("CP00-171 contract catalog ID drift");
    if (contractEntry?.source_edge_case_escalation_catalog_id !== catalog.source_edge_case_escalation_catalog_id) {
      errors.push("CP00-171 contract source edge-case escalation catalog drift");
    }
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(catalog.phase_scope)) {
      errors.push("CP00-171 contract phase scope drift");
    }
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(catalog.micro_phase_scope)) {
      errors.push("CP00-171 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.unit_scope_summary ?? {}) !== JSON.stringify(catalog.unit_scope_summary)) {
      errors.push("CP00-171 contract unit scope summary drift");
    }
    if (JSON.stringify(contractEntry?.boundary_descriptors ?? {}) !== JSON.stringify(catalog.boundary_descriptors)) {
      errors.push("CP00-171 contract boundary descriptors drift");
    }
    if (JSON.stringify(contractEntry?.entry_failure_bindings ?? {}) !== JSON.stringify(catalog.entry_failure_bindings)) {
      errors.push("CP00-171 contract entry failure bindings drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(catalog.evidence_descriptors)) {
      errors.push("CP00-171 contract evidence descriptors drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== catalog.leak_guard.renderable_surface) {
      errors.push("CP00-171 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.internal_reference_fields ?? []) !== JSON.stringify(catalog.leak_guard.internal_reference_fields)) {
      errors.push("CP00-171 contract internal reference fields drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(catalog.leak_guard.prohibited_outputs)) {
      errors.push("CP00-171 contract prohibited outputs drift");
    }
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      failure_taxonomy_sensitive_entry_boundary: catalog,
      no_write_attestation: MASTER_DATA_CP171_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP171_PACK_BINDING,
  );
}

export function createMasterDataCp171HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp171Coverage(planPack);
  const sensitiveEntry = validateMasterDataCp171FailureTaxonomySensitiveEntryBoundary();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.evidence_descriptors.hermes_sensitive_entry_boundary,
      gate: MASTER_DATA_CP171_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP171_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      failure_taxonomy_sensitive_entry_boundary_valid: sensitiveEntry.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP171_NO_WRITE_ATTESTATION,
      descriptor_count:
        Object.keys(MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.boundary_descriptors).length +
        Object.keys(MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.entry_failure_bindings).length,
      next_pack_id: MASTER_DATA_CP171_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP171_PACK_BINDING,
  );
}

export function createMasterDataCp171ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp171Coverage(planPack);
  const sensitiveEntry = validateMasterDataCp171FailureTaxonomySensitiveEntryBoundary();
  return freezeResult(
    {
      review_packet: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.evidence_descriptors.claude_sensitive_entry_boundary_review,
      gate: MASTER_DATA_CP171_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP171_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      failure_taxonomy_sensitive_entry_boundary_valid: sensitiveEntry.valid,
      questions: Object.freeze([
        "Does CP00-171 keep the Risk A audit/Hermes/Claude/human escalation entry boundary descriptor-only?",
        "Are missing tenant, actor, Matter, resource, and unknown action failures represented without leaking tenant, Matter, resource, prompt, note, or source taxonomy internals?",
        "Do Hermes and Claude descriptors remain references only, without runtime command execution or prompt sending from package code?",
        "Does the human escalation note avoid review dispatch, approval dispatch, and case-note writes?",
        "Does CP00-171 hand off cleanly to CP00-172 / RP04.P07.M06.S07?",
      ]),
      next_pack_id: MASTER_DATA_CP171_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP171_PACK_BINDING,
  );
}

export function createMasterDataCp171CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP171_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP171_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP171_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP171_PACK_BINDING.range,
      open_scope: "Continue RP04.P07.M06.S07 generated Master Data failure taxonomy boundary in CP00-172.",
      production_ready_flag: MASTER_DATA_CP171_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP171_PACK_BINDING,
  );
}

export function createMasterDataCp172CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  const byTitle = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byTitle[unit.title] = (byTitle[unit.title] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP172_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_title: Object.freeze(byTitle),
      catalog_id: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.catalog_id,
      operational_failure_bindings: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.operational_failure_bindings,
    },
    MASTER_DATA_CP172_PACK_BINDING,
  );
}

export function validateMasterDataCp172Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-172 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP172_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-172");
  if (planPack?.risk_class !== MASTER_DATA_CP172_PACK_BINDING.risk_class) errors.push("CP00-172 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP172_PACK_BINDING.unit_count) errors.push("CP00-172 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP172_PACK_BINDING.first_unit_id) errors.push("CP00-172 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP172_PACK_BINDING.last_unit_id) errors.push("CP00-172 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-172 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-172 must only include RP04 units");
  const summary = createMasterDataCp172CoverageSummary(planPack);
  for (const [deliverable, expectedCount] of Object.entries(
    MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.unit_scope_summary.deliverable_distribution,
  )) {
    if (summary.by_deliverable[deliverable] !== expectedCount) errors.push(`CP00-172 ${deliverable} distribution drift`);
  }
  for (const [microPhase, expectedCount] of Object.entries(
    MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.unit_scope_summary.micro_phase_distribution,
  )) {
    if (summary.by_micro_phase[microPhase] !== expectedCount) errors.push(`CP00-172 ${microPhase} distribution drift`);
  }
  for (const [title, expectedCount] of Object.entries(
    MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.unit_scope_summary.title_distribution,
  )) {
    if (summary.by_title[title] !== expectedCount) errors.push(`CP00-172 ${title} title distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP172_PACK_BINDING,
  );
}

export function validateMasterDataCp172FailureTaxonomyOperationalEdgeBoundary(contractProjection = null) {
  const errors = [];
  const catalog = MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY;
  if (catalog.pack_id !== MASTER_DATA_CP172_PACK_BINDING.pack_id) errors.push("CP00-172 operational edge pack ID drift");
  if (catalog.source_sensitive_entry_boundary_catalog_id !== MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.catalog_id) {
    errors.push("CP00-172 source sensitive entry catalog drift");
  }
  if (catalog.source_edge_case_escalation_catalog_id !== MASTER_DATA_FAILURE_TAXONOMY_EDGE_CASE_ESCALATION.catalog_id) {
    errors.push("CP00-172 source edge-case escalation catalog drift");
  }
  if (!catalog.phase_scope.includes("RP04.P07")) errors.push("CP00-172 missing RP04.P07 phase scope");
  if (!catalog.micro_phase_scope.includes("RP04.P07.M06")) errors.push("CP00-172 missing RP04.P07.M06 micro phase");
  for (const key of [
    "cross_tenant_failure",
    "permission_denied_failure",
    "ambiguous_rule_failure",
    "stale_reference_failure",
    "lock_conflict_failure",
    "retry_exhaustion_failure",
    "rollback_expectation",
    "compensation_expectation",
    "blocked_claim_receipt",
    "failure_fixture",
  ]) {
    if (!catalog.operational_failure_bindings[key]) errors.push(`CP00-172 missing operational binding ${key}`);
  }
  if (catalog.operational_failure_bindings.cross_tenant_failure?.exposes_foreign_tenant_id !== false) {
    errors.push("CP00-172 cross tenant failure must not expose foreign tenant ID");
  }
  if (catalog.operational_failure_bindings.permission_denied_failure?.exposes_permission_rule !== false) {
    errors.push("CP00-172 permission denied failure must not expose permission rule");
  }
  if (catalog.operational_failure_bindings.ambiguous_rule_failure?.exposes_rule_candidates !== false) {
    errors.push("CP00-172 ambiguous rule failure must not expose rule candidates");
  }
  if (catalog.operational_failure_bindings.stale_reference_failure?.exposes_stale_payload !== false) {
    errors.push("CP00-172 stale reference failure must not expose stale payload");
  }
  if (catalog.operational_failure_bindings.lock_conflict_failure?.acquires_runtime_lock !== false) {
    errors.push("CP00-172 lock conflict must not acquire runtime locks");
  }
  if (catalog.operational_failure_bindings.retry_exhaustion_failure?.executes_retry !== false) {
    errors.push("CP00-172 retry exhaustion must not execute retries");
  }
  if (catalog.operational_failure_bindings.rollback_expectation?.executes_rollback !== false) {
    errors.push("CP00-172 rollback expectation must not execute rollback");
  }
  if (catalog.operational_failure_bindings.compensation_expectation?.executes_compensation !== false) {
    errors.push("CP00-172 compensation expectation must not execute compensation");
  }
  if (catalog.operational_failure_bindings.blocked_claim_receipt?.emits_hermes_evidence !== false) {
    errors.push("CP00-172 blocked-claim receipt must not emit Hermes evidence");
  }
  if (catalog.operational_failure_bindings.failure_fixture?.loads_real_client_data !== false) {
    errors.push("CP00-172 failure fixture must not load real data");
  }
  if (catalog.evidence_descriptors.hermes_operational_edge_boundary !== "H04.CP00-172.master_data_failure_taxonomy_operational_edge_boundary") {
    errors.push("CP00-172 Hermes evidence descriptor drift");
  }
  if (catalog.evidence_descriptors.claude_operational_edge_boundary_review !== "C04.CP00-172.master_data_failure_taxonomy_operational_edge_boundary") {
    errors.push("CP00-172 Claude review descriptor drift");
  }
  if (catalog.leak_guard.renderable_surface !== "customer_facing_operational_failure_summary_only") {
    errors.push("CP00-172 renderable surface must be operational failure summary only");
  }
  for (const internalField of [
    "permission_ref",
    "audit_hint_ref",
    "matched_rule_ref",
    "blocked_claim",
    "blocked_claim_receipt_ref",
    "foreign_tenant_id",
    "cross_tenant_payload",
    "rule_candidates",
    "stale_payload",
    "retry_backoff",
    "rollback_state",
    "compensation_payload",
    "fixture_payload",
    "source_descriptor_key",
  ]) {
    if (!catalog.leak_guard.internal_reference_fields.includes(internalField)) {
      errors.push(`CP00-172 leak guard missing internal field ${internalField}`);
    }
  }
  if (MASTER_DATA_CP172_NO_WRITE_ATTESTATION.builds_failure_taxonomy_operational_edge_boundary !== true) {
    errors.push("CP00-172 must build failure taxonomy operational edge descriptors");
  }
  for (const flag of [
    "loads_real_client_data",
    "accepts_real_client_data",
    "evaluates_runtime_permission",
    "writes_audit_event",
    "appends_audit_event",
    "dispatches_review_route",
    "dispatches_approval_route",
    "executes_api_handler",
    "issues_network_request",
    "renders_ui",
    "mutates_dom",
    "executes_ai_retrieval",
    "executes_analytics_query",
    "emits_hermes_evidence",
    "executes_hermes_command",
    "executes_claude_review",
    "sends_claude_prompt",
    "executes_rollback",
    "executes_retry",
    "acquires_runtime_lock",
    "writes_product_state",
    "writes_case_note",
  ]) {
    if (MASTER_DATA_CP172_NO_WRITE_ATTESTATION[flag] !== false) errors.push(`CP00-172 must keep ${flag} false`);
  }

  if (contractProjection) {
    const contractEntry = contractProjection.failure_taxonomy_operational_edge_boundary;
    if (contractEntry?.pack_id !== catalog.pack_id) errors.push("CP00-172 contract pack ID drift");
    if (contractEntry?.catalog_id !== catalog.catalog_id) errors.push("CP00-172 contract catalog ID drift");
    if (contractEntry?.source_sensitive_entry_boundary_catalog_id !== catalog.source_sensitive_entry_boundary_catalog_id) {
      errors.push("CP00-172 contract source sensitive entry catalog drift");
    }
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(catalog.phase_scope)) {
      errors.push("CP00-172 contract phase scope drift");
    }
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(catalog.micro_phase_scope)) {
      errors.push("CP00-172 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.unit_scope_summary ?? {}) !== JSON.stringify(catalog.unit_scope_summary)) {
      errors.push("CP00-172 contract unit scope summary drift");
    }
    if (JSON.stringify(contractEntry?.operational_failure_bindings ?? {}) !== JSON.stringify(catalog.operational_failure_bindings)) {
      errors.push("CP00-172 contract operational failure bindings drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(catalog.evidence_descriptors)) {
      errors.push("CP00-172 contract evidence descriptors drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== catalog.leak_guard.renderable_surface) {
      errors.push("CP00-172 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.internal_reference_fields ?? []) !== JSON.stringify(catalog.leak_guard.internal_reference_fields)) {
      errors.push("CP00-172 contract internal reference fields drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(catalog.leak_guard.prohibited_outputs)) {
      errors.push("CP00-172 contract prohibited outputs drift");
    }
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      failure_taxonomy_operational_edge_boundary: catalog,
      no_write_attestation: MASTER_DATA_CP172_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP172_PACK_BINDING,
  );
}

export function createMasterDataCp172HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp172Coverage(planPack);
  const operationalEdge = validateMasterDataCp172FailureTaxonomyOperationalEdgeBoundary();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.evidence_descriptors.hermes_operational_edge_boundary,
      gate: MASTER_DATA_CP172_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP172_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      failure_taxonomy_operational_edge_boundary_valid: operationalEdge.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP172_NO_WRITE_ATTESTATION,
      descriptor_count: Object.keys(MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.operational_failure_bindings).length,
      next_pack_id: MASTER_DATA_CP172_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP172_PACK_BINDING,
  );
}

export function createMasterDataCp172ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp172Coverage(planPack);
  const operationalEdge = validateMasterDataCp172FailureTaxonomyOperationalEdgeBoundary();
  return freezeResult(
    {
      review_packet: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.evidence_descriptors.claude_operational_edge_boundary_review,
      gate: MASTER_DATA_CP172_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP172_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      failure_taxonomy_operational_edge_boundary_valid: operationalEdge.valid,
      questions: Object.freeze([
        "Does CP00-172 keep cross-tenant, permission denied, ambiguous rule, stale reference, lock, retry, rollback, compensation, blocked-claim, and fixture rows descriptor-only?",
        "Are customer-facing operational summaries free of tenant, permission, blocked-claim, stale, retry, rollback, compensation, fixture, prompt, note, and source descriptor internals?",
        "Do blocked-claim and Hermes descriptors remain references only, without runtime evidence emission or command execution from package code?",
        "Do lock, retry, rollback, and compensation entries avoid runtime locks, retries, rollback, compensation execution, route dispatch, and case-note writes?",
        "Does CP00-172 hand off cleanly to CP00-173 / RP04.P07.M06.S17?",
      ]),
      next_pack_id: MASTER_DATA_CP172_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP172_PACK_BINDING,
  );
}

export function createMasterDataCp172CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP172_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP172_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP172_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP172_PACK_BINDING.range,
      open_scope: "Continue RP04.P07.M06.S17 generated Master Data failure unit test and downstream review semantics in CP00-173.",
      production_ready_flag: MASTER_DATA_CP172_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP172_PACK_BINDING,
  );
}

export function createMasterDataCp173CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const byPhase = {};
  const byTitle = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byTitle[unit.title] = (byTitle[unit.title] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP173_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      by_phase: Object.freeze(byPhase),
      by_title: Object.freeze(byTitle),
      catalog_id: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.catalog_id,
      bridge_sections: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections,
    },
    MASTER_DATA_CP173_PACK_BINDING,
  );
}

export function validateMasterDataCp173Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-173 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP173_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-173");
  if (planPack?.risk_class !== MASTER_DATA_CP173_PACK_BINDING.risk_class) errors.push("CP00-173 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP173_PACK_BINDING.unit_count) errors.push("CP00-173 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP173_PACK_BINDING.first_unit_id) errors.push("CP00-173 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP173_PACK_BINDING.last_unit_id) errors.push("CP00-173 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-173 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-173 must only include RP04 units");
  const summary = createMasterDataCp173CoverageSummary(planPack);
  const expected = MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.unit_scope_summary;
  for (const [deliverable, expectedCount] of Object.entries(expected.deliverable_distribution)) {
    if (summary.by_deliverable[deliverable] !== expectedCount) errors.push(`CP00-173 ${deliverable} distribution drift`);
  }
  for (const [phaseId, expectedCount] of Object.entries(expected.phase_distribution)) {
    if (summary.by_phase[phaseId] !== expectedCount) errors.push(`CP00-173 ${phaseId} distribution drift`);
  }
  for (const [microPhase, expectedCount] of Object.entries(expected.micro_phase_distribution)) {
    if (summary.by_micro_phase[microPhase] !== expectedCount) errors.push(`CP00-173 ${microPhase} distribution drift`);
  }
  for (const [microTitle, expectedCount] of Object.entries(expected.micro_title_distribution)) {
    if (summary.by_micro_title[microTitle] !== expectedCount) errors.push(`CP00-173 ${microTitle} micro title distribution drift`);
  }
  for (const [title, expectedCount] of Object.entries(expected.title_distribution)) {
    if (summary.by_title[title] !== expectedCount) errors.push(`CP00-173 ${title} title distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP173_PACK_BINDING,
  );
}

export function validateMasterDataCp173FailureEvidenceReviewHandoffBridge(contractProjection = null) {
  const errors = [];
  const bridge = MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE;
  if (bridge.pack_id !== MASTER_DATA_CP173_PACK_BINDING.pack_id) errors.push("CP00-173 bridge pack ID drift");
  if (bridge.source_operational_edge_boundary_catalog_id !== MASTER_DATA_FAILURE_TAXONOMY_OPERATIONAL_EDGE_BOUNDARY.catalog_id) {
    errors.push("CP00-173 source operational edge boundary drift");
  }
  if (bridge.source_sensitive_entry_boundary_catalog_id !== MASTER_DATA_FAILURE_TAXONOMY_SENSITIVE_ENTRY_BOUNDARY.catalog_id) {
    errors.push("CP00-173 source sensitive entry boundary drift");
  }
  if (bridge.source_failure_taxonomy_catalog_id !== MASTER_DATA_PERMISSION_AUDIT_WORKFLOW_FAILURE_TAXONOMY.catalog_id) {
    errors.push("CP00-173 source failure taxonomy drift");
  }
  for (const phaseId of ["RP04.P07", "RP04.P08"]) {
    if (!bridge.phase_scope.includes(phaseId)) errors.push(`CP00-173 missing phase scope ${phaseId}`);
  }
  for (const microPhase of Object.keys(bridge.unit_scope_summary.micro_phase_distribution)) {
    if (!bridge.micro_phase_scope.includes(microPhase)) errors.push(`CP00-173 missing micro phase ${microPhase}`);
  }
  for (const sectionKey of [
    "failure_fixture_test_tail",
    "hermes_evidence_packet",
    "claude_review_packet",
    "closeout_and_handoff",
    "rp08_scope_contract_type_shape",
    "rp08_primary_secondary_workflow_receipts",
    "rp08_permission_audit_entry_boundary",
  ]) {
    if (!bridge.bridge_sections[sectionKey]) errors.push(`CP00-173 missing bridge section ${sectionKey}`);
  }
  const sectionUnitTotal = Object.values(bridge.bridge_sections).reduce((sum, section) => sum + section.unit_count, 0);
  if (sectionUnitTotal !== bridge.unit_scope_summary.planned_unit_count) errors.push("CP00-173 bridge section unit count drift");
  if (bridge.bridge_sections.hermes_evidence_packet.emits_hermes_evidence !== false) errors.push("CP00-173 Hermes section must not emit evidence");
  if (bridge.bridge_sections.hermes_evidence_packet.executes_hermes_command !== false) errors.push("CP00-173 Hermes section must not execute commands");
  if (bridge.bridge_sections.claude_review_packet.read_only !== true) errors.push("CP00-173 Claude section must be read-only");
  if (bridge.bridge_sections.claude_review_packet.sends_claude_prompt !== false) errors.push("CP00-173 Claude section must not send prompts");
  if (bridge.bridge_sections.claude_review_packet.executes_claude_review !== false) errors.push("CP00-173 Claude section must not execute review");
  if (bridge.bridge_sections.closeout_and_handoff.to_pack_id !== MASTER_DATA_CP173_PACK_BINDING.next_pack_id) {
    errors.push("CP00-173 handoff next pack drift");
  }
  if (bridge.bridge_sections.rp08_permission_audit_entry_boundary.next_sensitive_pack_id !== MASTER_DATA_CP173_PACK_BINDING.next_pack_id) {
    errors.push("CP00-173 permission/audit entry must defer sensitive tail to CP00-174");
  }
  if (bridge.bridge_sections.rp08_permission_audit_entry_boundary.evaluates_runtime_permission !== false) {
    errors.push("CP00-173 permission/audit entry must not evaluate runtime permission");
  }
  if (bridge.bridge_sections.rp08_permission_audit_entry_boundary.appends_audit_event !== false) {
    errors.push("CP00-173 permission/audit entry must not append audit events");
  }
  if (bridge.evidence_descriptors.hermes_failure_evidence_review_handoff_bridge !== "H04.CP00-173.master_data_failure_evidence_review_handoff_bridge") {
    errors.push("CP00-173 Hermes evidence descriptor drift");
  }
  if (bridge.evidence_descriptors.claude_failure_evidence_review_handoff_bridge_review !== "C04.CP00-173.master_data_failure_evidence_review_handoff_bridge") {
    errors.push("CP00-173 Claude review descriptor drift");
  }
  if (bridge.leak_guard.renderable_surface !== "customer_facing_failure_evidence_handoff_summary_only") {
    errors.push("CP00-173 renderable surface must be failure evidence handoff summary only");
  }
  for (const internalField of [
    "permission_ref",
    "audit_hint_ref",
    "blocked_claim",
    "blocked_claim_receipt_ref",
    "hermes_command_payload",
    "claude_prompt_payload",
    "runtime_permission_result",
    "audit_event_payload",
  ]) {
    if (!bridge.leak_guard.internal_reference_fields.includes(internalField)) {
      errors.push(`CP00-173 leak guard missing internal field ${internalField}`);
    }
  }
  if (MASTER_DATA_CP173_NO_WRITE_ATTESTATION.builds_failure_evidence_review_handoff_bridge !== true) {
    errors.push("CP00-173 must build failure evidence review handoff bridge descriptors");
  }
  for (const flag of [
    "loads_real_client_data",
    "accepts_real_client_data",
    "evaluates_runtime_permission",
    "writes_audit_event",
    "appends_audit_event",
    "dispatches_review_route",
    "dispatches_approval_route",
    "executes_api_handler",
    "issues_network_request",
    "renders_ui",
    "mutates_dom",
    "executes_ai_retrieval",
    "executes_analytics_query",
    "emits_hermes_evidence",
    "executes_hermes_command",
    "executes_claude_review",
    "sends_claude_prompt",
    "executes_rollback",
    "executes_retry",
    "acquires_runtime_lock",
    "writes_product_state",
    "writes_case_note",
  ]) {
    if (MASTER_DATA_CP173_NO_WRITE_ATTESTATION[flag] !== false) errors.push(`CP00-173 must keep ${flag} false`);
  }

  if (contractProjection) {
    const contractEntry = contractProjection.failure_evidence_review_handoff_bridge;
    if (contractEntry?.pack_id !== bridge.pack_id) errors.push("CP00-173 contract pack ID drift");
    if (contractEntry?.catalog_id !== bridge.catalog_id) errors.push("CP00-173 contract catalog ID drift");
    if (contractEntry?.source_operational_edge_boundary_catalog_id !== bridge.source_operational_edge_boundary_catalog_id) {
      errors.push("CP00-173 contract source operational edge boundary drift");
    }
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(bridge.phase_scope)) {
      errors.push("CP00-173 contract phase scope drift");
    }
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(bridge.micro_phase_scope)) {
      errors.push("CP00-173 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.unit_scope_summary ?? {}) !== JSON.stringify(bridge.unit_scope_summary)) {
      errors.push("CP00-173 contract unit scope summary drift");
    }
    if (JSON.stringify(contractEntry?.bridge_sections ?? {}) !== JSON.stringify(bridge.bridge_sections)) {
      errors.push("CP00-173 contract bridge sections drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(bridge.evidence_descriptors)) {
      errors.push("CP00-173 contract evidence descriptors drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== bridge.leak_guard.renderable_surface) {
      errors.push("CP00-173 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.internal_reference_fields ?? []) !== JSON.stringify(bridge.leak_guard.internal_reference_fields)) {
      errors.push("CP00-173 contract internal reference fields drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(bridge.leak_guard.prohibited_outputs)) {
      errors.push("CP00-173 contract prohibited outputs drift");
    }
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      failure_evidence_review_handoff_bridge: bridge,
      no_write_attestation: MASTER_DATA_CP173_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP173_PACK_BINDING,
  );
}

export function createMasterDataCp173HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp173Coverage(planPack);
  const bridge = validateMasterDataCp173FailureEvidenceReviewHandoffBridge();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.evidence_descriptors.hermes_failure_evidence_review_handoff_bridge,
      gate: MASTER_DATA_CP173_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP173_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      failure_evidence_review_handoff_bridge_valid: bridge.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP173_NO_WRITE_ATTESTATION,
      section_count: Object.keys(MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.bridge_sections).length,
      next_pack_id: MASTER_DATA_CP173_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP173_PACK_BINDING,
  );
}

export function createMasterDataCp173ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp173Coverage(planPack);
  const bridge = validateMasterDataCp173FailureEvidenceReviewHandoffBridge();
  return freezeResult(
    {
      review_packet: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.evidence_descriptors.claude_failure_evidence_review_handoff_bridge_review,
      gate: MASTER_DATA_CP173_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP173_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      failure_evidence_review_handoff_bridge_valid: bridge.valid,
      questions: Object.freeze([
        "Does CP00-173 cover all 150 planned Risk C units from RP04.P07.M06.S17 through RP04.P08.M05.S13 without widening the next Risk A permission/audit boundary?",
        "Are failure fixture tests, Hermes evidence packets, Claude review packets, closeout handoff, RP08 inventory, contract/type shape, workflow receipts, and permission/audit entry descriptors all represented?",
        "Do Hermes and Claude packet sections remain descriptors only without command execution, prompt sending, evidence emission, or package-triggered review execution?",
        "Do customer-facing bridge summaries exclude permission refs, audit internals, blocked claim refs, command payloads, Claude prompts, runtime permission results, audit event payloads, and hidden source values?",
        "Does CP00-173 hand off cleanly to CP00-174 / RP04.P08.M05.S14 for the sensitive permission/audit tail?",
      ]),
      next_pack_id: MASTER_DATA_CP173_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP173_PACK_BINDING,
  );
}

export function createMasterDataCp173CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP173_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP173_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP173_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP173_PACK_BINDING.range,
      open_scope: "Continue RP04.P08.M05.S14 generated Master Data permission/audit sensitive tail in CP00-174.",
      production_ready_flag: MASTER_DATA_CP173_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP173_PACK_BINDING,
  );
}

export function createMasterDataCp174CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const byPhase = {};
  const byTitle = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byTitle[unit.title] = (byTitle[unit.title] ?? 0) + 1;
  }
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP174_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      by_phase: Object.freeze(byPhase),
      by_title: Object.freeze(byTitle),
      catalog_id: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.catalog_id,
      boundary_sections: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections,
    },
    MASTER_DATA_CP174_PACK_BINDING,
  );
}

export function validateMasterDataCp174Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-174 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP174_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-174");
  if (planPack?.risk_class !== MASTER_DATA_CP174_PACK_BINDING.risk_class) errors.push("CP00-174 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP174_PACK_BINDING.unit_count) errors.push("CP00-174 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP174_PACK_BINDING.first_unit_id) errors.push("CP00-174 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP174_PACK_BINDING.last_unit_id) errors.push("CP00-174 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-174 duplicate unit IDs");
  const boundaryUnitIds = Object.values(MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections).map((section) => section.unit_id);
  if (JSON.stringify(boundaryUnitIds) !== JSON.stringify(unitIds)) errors.push("CP00-174 boundary section unit IDs must match plan units");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-174 must only include RP04 units");
  const summary = createMasterDataCp174CoverageSummary(planPack);
  const expected = MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.unit_scope_summary;
  for (const [deliverable, expectedCount] of Object.entries(expected.deliverable_distribution)) {
    if (summary.by_deliverable[deliverable] !== expectedCount) errors.push(`CP00-174 ${deliverable} distribution drift`);
  }
  for (const [phaseId, expectedCount] of Object.entries(expected.phase_distribution)) {
    if (summary.by_phase[phaseId] !== expectedCount) errors.push(`CP00-174 ${phaseId} distribution drift`);
  }
  for (const [microPhase, expectedCount] of Object.entries(expected.micro_phase_distribution)) {
    if (summary.by_micro_phase[microPhase] !== expectedCount) errors.push(`CP00-174 ${microPhase} distribution drift`);
  }
  for (const [microTitle, expectedCount] of Object.entries(expected.micro_title_distribution)) {
    if (summary.by_micro_title[microTitle] !== expectedCount) errors.push(`CP00-174 ${microTitle} micro title distribution drift`);
  }
  for (const [title, expectedCount] of Object.entries(expected.title_distribution)) {
    if (summary.by_title[title] !== expectedCount) errors.push(`CP00-174 ${title} title distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP174_PACK_BINDING,
  );
}

export function validateMasterDataCp174PermissionAuditSensitiveTailBoundary(contractProjection = null) {
  const errors = [];
  const boundary = MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY;
  if (boundary.pack_id !== MASTER_DATA_CP174_PACK_BINDING.pack_id) errors.push("CP00-174 boundary pack ID drift");
  if (boundary.source_failure_evidence_review_handoff_bridge_catalog_id !== MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.catalog_id) {
    errors.push("CP00-174 source failure evidence review handoff bridge drift");
  }
  if (boundary.source_permission_audit_binding_id !== MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id) {
    errors.push("CP00-174 source permission/audit binding drift");
  }
  for (const microPhase of ["RP04.P08.M05", "RP04.P08.M06"]) {
    if (!boundary.micro_phase_scope.includes(microPhase)) errors.push(`CP00-174 missing micro phase ${microPhase}`);
  }
  for (const sectionKey of [
    "block_semantics",
    "evidence_template",
    "validation_command_check",
    "harness_boundary_note",
    "closeout_handoff",
    "regression_receipt",
    "next_gate_readiness",
    "hermes_command_matrix",
    "evidence_field_list",
    "changed_file_receipt",
  ]) {
    if (!boundary.boundary_sections[sectionKey]) errors.push(`CP00-174 missing boundary section ${sectionKey}`);
  }
  if (Object.keys(boundary.boundary_sections).length !== MASTER_DATA_CP174_PACK_BINDING.unit_count) {
    errors.push("CP00-174 boundary section count drift");
  }
  if (boundary.boundary_sections.block_semantics.verdict !== "BLOCK") errors.push("CP00-174 block semantics must be BLOCK");
  if (boundary.boundary_sections.block_semantics.evaluates_runtime_permission !== false) {
    errors.push("CP00-174 block semantics must not evaluate runtime permission");
  }
  if (boundary.boundary_sections.block_semantics.appends_audit_event !== false) {
    errors.push("CP00-174 block semantics must not append audit events");
  }
  if (boundary.boundary_sections.evidence_template.emits_hermes_evidence !== false) errors.push("CP00-174 evidence template must not emit Hermes evidence");
  if (boundary.boundary_sections.evidence_template.executes_hermes_command !== false) {
    errors.push("CP00-174 evidence template must not execute Hermes commands");
  }
  if (boundary.boundary_sections.validation_command_check.executes_shell_from_service !== false) {
    errors.push("CP00-174 validation command check must not execute shell from service");
  }
  if (boundary.boundary_sections.closeout_handoff.to_pack_id !== MASTER_DATA_CP174_PACK_BINDING.next_pack_id) {
    errors.push("CP00-174 handoff next pack drift");
  }
  if (boundary.boundary_sections.next_gate_readiness.widens_current_risk_a_boundary !== false) {
    errors.push("CP00-174 must not widen the Risk A boundary");
  }
  if (boundary.boundary_sections.hermes_command_matrix.executes_hermes_command !== false) {
    errors.push("CP00-174 command matrix must be descriptor-only");
  }
  if (boundary.boundary_sections.evidence_field_list.exposes_internal_only_fields !== false) {
    errors.push("CP00-174 evidence field list must not expose internal-only fields");
  }
  if (boundary.boundary_sections.changed_file_receipt.embeds_diff_content !== false) {
    errors.push("CP00-174 changed-file receipt must not embed diff content");
  }
  if (boundary.evidence_descriptors.hermes_permission_audit_sensitive_tail_boundary !== "H04.CP00-174.master_data_permission_audit_sensitive_tail_boundary") {
    errors.push("CP00-174 Hermes evidence descriptor drift");
  }
  if (boundary.evidence_descriptors.claude_permission_audit_sensitive_tail_boundary_review !== "C04.CP00-174.master_data_permission_audit_sensitive_tail_boundary") {
    errors.push("CP00-174 Claude review descriptor drift");
  }
  if (boundary.leak_guard.renderable_surface !== "customer_facing_permission_audit_tail_boundary_summary_only") {
    errors.push("CP00-174 renderable surface must be tail boundary summary only");
  }
  for (const internalField of [
    "permission_ref",
    "audit_hint_ref",
    "runtime_permission_result",
    "audit_event_payload",
    "hermes_command_payload",
    "changed_file_diff",
  ]) {
    if (!boundary.leak_guard.internal_reference_fields.includes(internalField)) {
      errors.push(`CP00-174 leak guard missing internal field ${internalField}`);
    }
  }
  if (MASTER_DATA_CP174_NO_WRITE_ATTESTATION.builds_permission_audit_sensitive_tail_boundary !== true) {
    errors.push("CP00-174 must build permission/audit sensitive tail boundary descriptors");
  }
  for (const flag of [
    "loads_real_client_data",
    "accepts_real_client_data",
    "evaluates_runtime_permission",
    "writes_audit_event",
    "appends_audit_event",
    "dispatches_review_route",
    "dispatches_approval_route",
    "executes_api_handler",
    "issues_network_request",
    "renders_ui",
    "mutates_dom",
    "executes_ai_retrieval",
    "executes_analytics_query",
    "emits_hermes_evidence",
    "executes_hermes_command",
    "executes_claude_review",
    "sends_claude_prompt",
    "executes_rollback",
    "executes_retry",
    "acquires_runtime_lock",
    "writes_product_state",
    "writes_case_note",
  ]) {
    if (MASTER_DATA_CP174_NO_WRITE_ATTESTATION[flag] !== false) errors.push(`CP00-174 must keep ${flag} false`);
  }

  if (contractProjection) {
    const contractEntry = contractProjection.permission_audit_sensitive_tail_boundary;
    if (contractEntry?.pack_id !== boundary.pack_id) errors.push("CP00-174 contract pack ID drift");
    if (contractEntry?.catalog_id !== boundary.catalog_id) errors.push("CP00-174 contract catalog ID drift");
    if (contractEntry?.source_failure_evidence_review_handoff_bridge_catalog_id !== boundary.source_failure_evidence_review_handoff_bridge_catalog_id) {
      errors.push("CP00-174 contract source bridge drift");
    }
    if (contractEntry?.source_permission_audit_binding_id !== boundary.source_permission_audit_binding_id) {
      errors.push("CP00-174 contract source permission/audit binding drift");
    }
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(boundary.phase_scope)) {
      errors.push("CP00-174 contract phase scope drift");
    }
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(boundary.micro_phase_scope)) {
      errors.push("CP00-174 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.unit_scope_summary ?? {}) !== JSON.stringify(boundary.unit_scope_summary)) {
      errors.push("CP00-174 contract unit scope summary drift");
    }
    if (JSON.stringify(contractEntry?.boundary_sections ?? {}) !== JSON.stringify(boundary.boundary_sections)) {
      errors.push("CP00-174 contract boundary sections drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(boundary.evidence_descriptors)) {
      errors.push("CP00-174 contract evidence descriptors drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== boundary.leak_guard.renderable_surface) {
      errors.push("CP00-174 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.internal_reference_fields ?? []) !== JSON.stringify(boundary.leak_guard.internal_reference_fields)) {
      errors.push("CP00-174 contract internal reference fields drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(boundary.leak_guard.prohibited_outputs)) {
      errors.push("CP00-174 contract prohibited outputs drift");
    }
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      permission_audit_sensitive_tail_boundary: boundary,
      no_write_attestation: MASTER_DATA_CP174_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP174_PACK_BINDING,
  );
}

export function createMasterDataCp174HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp174Coverage(planPack);
  const boundary = validateMasterDataCp174PermissionAuditSensitiveTailBoundary();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.evidence_descriptors.hermes_permission_audit_sensitive_tail_boundary,
      gate: MASTER_DATA_CP174_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP174_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_sensitive_tail_boundary_valid: boundary.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP174_NO_WRITE_ATTESTATION,
      section_count: Object.keys(MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.boundary_sections).length,
      next_pack_id: MASTER_DATA_CP174_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP174_PACK_BINDING,
  );
}

export function createMasterDataCp174ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp174Coverage(planPack);
  const boundary = validateMasterDataCp174PermissionAuditSensitiveTailBoundary();
  return freezeResult(
    {
      review_packet: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.evidence_descriptors.claude_permission_audit_sensitive_tail_boundary_review,
      gate: MASTER_DATA_CP174_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP174_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_sensitive_tail_boundary_valid: boundary.valid,
      questions: Object.freeze([
        "Does CP00-174 cover exactly the 10 planned Risk A units from RP04.P08.M05.S14 through RP04.P08.M06.S03?",
        "Do BLOCK semantics, evidence template, validation command check, harness boundary note, closeout handoff, regression receipt, next gate readiness, Hermes command matrix, evidence field list, and changed-file receipt all remain descriptor-only?",
        "Does CP00-174 avoid runtime permission evaluation, audit appends, review/approval dispatch, Hermes command execution, Claude prompt sending, and changed-file diff embedding?",
        "Do customer-facing summaries exclude permission refs, audit internals, runtime permission results, audit event payloads, Hermes command payloads, changed-file diffs, and reviewer identity?",
        "Does CP00-174 hand off cleanly to CP00-175 / RP04.P08.M06.S04 without widening the Risk A boundary?",
      ]),
      next_pack_id: MASTER_DATA_CP174_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP174_PACK_BINDING,
  );
}

export function createMasterDataCp174CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP174_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP174_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP174_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP174_PACK_BINDING.range,
      open_scope: "Continue RP04.P08.M06.S04 generated Master Data evidence receipts and downstream UI leak readiness in CP00-175.",
      production_ready_flag: MASTER_DATA_CP174_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP174_PACK_BINDING,
  );
}

export function createMasterDataCp175CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const byPhase = {};
  const byTitle = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byTitle[unit.title] = (byTitle[unit.title] ?? 0) + 1;
  }
  const sectionUnitTotal = Object.values(MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections).reduce(
    (total, section) => total + section.unit_count,
    0,
  );
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP175_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      by_phase: Object.freeze(byPhase),
      by_title: Object.freeze(byTitle),
      catalog_id: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.catalog_id,
      bridge_sections: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections,
      section_unit_total: sectionUnitTotal,
    },
    MASTER_DATA_CP175_PACK_BINDING,
  );
}

export function validateMasterDataCp175Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-175 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP175_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-175");
  if (planPack?.risk_class !== MASTER_DATA_CP175_PACK_BINDING.risk_class) errors.push("CP00-175 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP175_PACK_BINDING.unit_count) errors.push("CP00-175 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP175_PACK_BINDING.first_unit_id) errors.push("CP00-175 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP175_PACK_BINDING.last_unit_id) errors.push("CP00-175 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-175 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-175 must only include RP04 units");
  const sectionUnitTotal = Object.values(MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections).reduce(
    (total, section) => total + section.unit_count,
    0,
  );
  if (sectionUnitTotal !== MASTER_DATA_CP175_PACK_BINDING.unit_count) errors.push("CP00-175 bridge section unit total drift");
  const summary = createMasterDataCp175CoverageSummary(planPack);
  const expected = MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.unit_scope_summary;
  for (const [deliverable, expectedCount] of Object.entries(expected.deliverable_distribution)) {
    if (summary.by_deliverable[deliverable] !== expectedCount) errors.push(`CP00-175 ${deliverable} distribution drift`);
  }
  for (const [phaseId, expectedCount] of Object.entries(expected.phase_distribution)) {
    if (summary.by_phase[phaseId] !== expectedCount) errors.push(`CP00-175 ${phaseId} distribution drift`);
  }
  for (const [microPhase, expectedCount] of Object.entries(expected.micro_phase_distribution)) {
    if (summary.by_micro_phase[microPhase] !== expectedCount) errors.push(`CP00-175 ${microPhase} distribution drift`);
  }
  for (const [microTitle, expectedCount] of Object.entries(expected.micro_title_distribution)) {
    if (summary.by_micro_title[microTitle] !== expectedCount) errors.push(`CP00-175 ${microTitle} micro title distribution drift`);
  }
  for (const [title, expectedCount] of Object.entries(expected.title_distribution)) {
    if (summary.by_title[title] !== expectedCount) errors.push(`CP00-175 ${title} title distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP175_PACK_BINDING,
  );
}

export function validateMasterDataCp175EvidenceReviewUiReadinessBridge(contractProjection = null) {
  const errors = [];
  const bridge = MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE;
  if (bridge.pack_id !== MASTER_DATA_CP175_PACK_BINDING.pack_id) errors.push("CP00-175 bridge pack ID drift");
  if (bridge.source_permission_audit_sensitive_tail_boundary_catalog_id !== MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.catalog_id) {
    errors.push("CP00-175 source permission/audit sensitive tail boundary drift");
  }
  if (bridge.source_failure_evidence_review_handoff_bridge_catalog_id !== MASTER_DATA_FAILURE_EVIDENCE_REVIEW_HANDOFF_BRIDGE.catalog_id) {
    errors.push("CP00-175 source failure evidence review handoff bridge drift");
  }
  if (bridge.source_permission_audit_binding_id !== MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id) {
    errors.push("CP00-175 source permission/audit binding drift");
  }
  for (const phaseId of ["RP04.P08", "RP04.P09"]) {
    if (!bridge.phase_scope.includes(phaseId)) errors.push(`CP00-175 missing phase ${phaseId}`);
  }
  for (const microPhase of [
    "RP04.P08.M06",
    "RP04.P08.M07",
    "RP04.P08.M08",
    "RP04.P08.M09",
    "RP04.P08.M10",
    "RP04.P09.M00",
    "RP04.P09.M01",
    "RP04.P09.M02",
    "RP04.P09.M03",
    "RP04.P09.M04",
    "RP04.P09.M05",
    "RP04.P09.M06",
    "RP04.P09.M07",
  ]) {
    if (!bridge.micro_phase_scope.includes(microPhase)) errors.push(`CP00-175 missing micro phase ${microPhase}`);
  }
  for (const sectionKey of [
    "rp08_fixture_evidence_receipts",
    "rp08_test_and_golden_evidence",
    "rp08_hermes_evidence_packet",
    "rp08_review_closeout_tail",
    "rp09_scope_contract_type_shape",
    "rp09_primary_secondary_workflows",
    "rp09_permission_audit_binding",
    "rp09_fixture_review_questions",
  ]) {
    if (!bridge.bridge_sections[sectionKey]) errors.push(`CP00-175 missing bridge section ${sectionKey}`);
  }
  const sectionUnitTotal = Object.values(bridge.bridge_sections).reduce((total, section) => total + section.unit_count, 0);
  if (sectionUnitTotal !== MASTER_DATA_CP175_PACK_BINDING.unit_count) errors.push("CP00-175 bridge sections must total 150 units");
  if (bridge.bridge_sections.rp08_hermes_evidence_packet.executes_hermes_command !== false) {
    errors.push("CP00-175 Hermes packet must not execute Hermes commands");
  }
  if (bridge.bridge_sections.rp08_hermes_evidence_packet.emits_hermes_evidence !== false) {
    errors.push("CP00-175 Hermes packet must not emit Hermes evidence from package code");
  }
  if (bridge.bridge_sections.rp08_review_closeout_tail.sends_claude_prompt !== false) {
    errors.push("CP00-175 Claude packet must not send prompts from package code");
  }
  if (bridge.bridge_sections.rp08_review_closeout_tail.executes_claude_review !== false) {
    errors.push("CP00-175 Claude packet must not execute reviews from package code");
  }
  if (bridge.bridge_sections.rp09_permission_audit_binding.evaluates_runtime_permission !== false) {
    errors.push("CP00-175 permission/audit binding must not evaluate runtime permission");
  }
  if (bridge.bridge_sections.rp09_permission_audit_binding.appends_audit_event !== false) {
    errors.push("CP00-175 permission/audit binding must not append audit events");
  }
  if (bridge.bridge_sections.rp09_fixture_review_questions.renders_ui !== false) {
    errors.push("CP00-175 UI leak questions must not render UI");
  }
  if (bridge.bridge_sections.rp09_fixture_review_questions.exposes_ui_leak_payload !== false) {
    errors.push("CP00-175 UI leak questions must not expose UI leak payloads");
  }
  if (bridge.evidence_descriptors.hermes_evidence_review_ui_readiness_bridge !== "H04.CP00-175.master_data_evidence_review_ui_readiness_bridge") {
    errors.push("CP00-175 Hermes evidence descriptor drift");
  }
  if (bridge.evidence_descriptors.claude_evidence_review_ui_readiness_bridge_review !== "C04.CP00-175.master_data_evidence_review_ui_readiness_bridge") {
    errors.push("CP00-175 Claude review descriptor drift");
  }
  if (bridge.leak_guard.renderable_surface !== "customer_facing_evidence_review_ui_readiness_summary_only") {
    errors.push("CP00-175 renderable surface must be evidence/review/UI readiness summary only");
  }
  for (const internalField of [
    "permission_ref",
    "audit_hint_ref",
    "runtime_permission_result",
    "audit_event_payload",
    "hermes_command_payload",
    "claude_prompt_payload",
    "changed_file_diff",
    "ui_leak_payload",
  ]) {
    if (!bridge.leak_guard.internal_reference_fields.includes(internalField)) {
      errors.push(`CP00-175 leak guard missing internal field ${internalField}`);
    }
  }
  if (MASTER_DATA_CP175_NO_WRITE_ATTESTATION.builds_evidence_review_ui_readiness_bridge !== true) {
    errors.push("CP00-175 must build evidence/review/UI readiness bridge descriptors");
  }
  for (const flag of [
    "loads_real_client_data",
    "accepts_real_client_data",
    "evaluates_runtime_permission",
    "writes_audit_event",
    "appends_audit_event",
    "dispatches_review_route",
    "dispatches_approval_route",
    "executes_api_handler",
    "issues_network_request",
    "renders_ui",
    "mutates_dom",
    "executes_ai_retrieval",
    "executes_analytics_query",
    "emits_hermes_evidence",
    "executes_hermes_command",
    "executes_claude_review",
    "sends_claude_prompt",
    "executes_rollback",
    "executes_retry",
    "acquires_runtime_lock",
    "writes_product_state",
    "writes_case_note",
  ]) {
    if (MASTER_DATA_CP175_NO_WRITE_ATTESTATION[flag] !== false) errors.push(`CP00-175 must keep ${flag} false`);
  }

  if (contractProjection) {
    const contractEntry = contractProjection.evidence_review_ui_readiness_bridge;
    if (contractEntry?.pack_id !== bridge.pack_id) errors.push("CP00-175 contract pack ID drift");
    if (contractEntry?.catalog_id !== bridge.catalog_id) errors.push("CP00-175 contract catalog ID drift");
    if (contractEntry?.source_permission_audit_sensitive_tail_boundary_catalog_id !== bridge.source_permission_audit_sensitive_tail_boundary_catalog_id) {
      errors.push("CP00-175 contract source sensitive tail drift");
    }
    if (contractEntry?.source_failure_evidence_review_handoff_bridge_catalog_id !== bridge.source_failure_evidence_review_handoff_bridge_catalog_id) {
      errors.push("CP00-175 contract source failure bridge drift");
    }
    if (contractEntry?.source_permission_audit_binding_id !== bridge.source_permission_audit_binding_id) {
      errors.push("CP00-175 contract source permission/audit binding drift");
    }
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(bridge.phase_scope)) {
      errors.push("CP00-175 contract phase scope drift");
    }
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(bridge.micro_phase_scope)) {
      errors.push("CP00-175 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.unit_scope_summary ?? {}) !== JSON.stringify(bridge.unit_scope_summary)) {
      errors.push("CP00-175 contract unit scope summary drift");
    }
    if (JSON.stringify(contractEntry?.bridge_sections ?? {}) !== JSON.stringify(bridge.bridge_sections)) {
      errors.push("CP00-175 contract bridge sections drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(bridge.evidence_descriptors)) {
      errors.push("CP00-175 contract evidence descriptors drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== bridge.leak_guard.renderable_surface) {
      errors.push("CP00-175 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.internal_reference_fields ?? []) !== JSON.stringify(bridge.leak_guard.internal_reference_fields)) {
      errors.push("CP00-175 contract internal reference fields drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(bridge.leak_guard.prohibited_outputs)) {
      errors.push("CP00-175 contract prohibited outputs drift");
    }
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      evidence_review_ui_readiness_bridge: bridge,
      no_write_attestation: MASTER_DATA_CP175_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP175_PACK_BINDING,
  );
}

export function createMasterDataCp175HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp175Coverage(planPack);
  const bridge = validateMasterDataCp175EvidenceReviewUiReadinessBridge();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.evidence_descriptors.hermes_evidence_review_ui_readiness_bridge,
      gate: MASTER_DATA_CP175_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP175_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      evidence_review_ui_readiness_bridge_valid: bridge.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP175_NO_WRITE_ATTESTATION,
      section_count: Object.keys(MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.bridge_sections).length,
      section_unit_total: coverage.summary.section_unit_total,
      next_pack_id: MASTER_DATA_CP175_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP175_PACK_BINDING,
  );
}

export function createMasterDataCp175ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp175Coverage(planPack);
  const bridge = validateMasterDataCp175EvidenceReviewUiReadinessBridge();
  return freezeResult(
    {
      review_packet: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.evidence_descriptors.claude_evidence_review_ui_readiness_bridge_review,
      gate: MASTER_DATA_CP175_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP175_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      evidence_review_ui_readiness_bridge_valid: bridge.valid,
      questions: Object.freeze([
        "Does CP00-175 cover exactly the 150 planned Risk C units from RP04.P08.M06.S04 through RP04.P09.M07.S06?",
        "Do Hermes evidence packet, Claude review packet, closeout, workflow, permission/audit, and UI leak readiness sections remain descriptor-only?",
        "Does CP00-175 avoid runtime permission evaluation, audit appends, review/approval dispatch, Hermes command execution, Claude prompt sending, UI rendering, DOM mutation, and changed-file diff embedding?",
        "Do customer-facing summaries exclude permission refs, audit internals, runtime permission results, audit event payloads, Hermes command payloads, Claude prompt payloads, changed-file diffs, reviewer identity, and UI leak payloads?",
        "Does CP00-175 hand off cleanly to CP00-176 / RP04.P09.M07.S07 without skipping the remaining RP04 terminal readiness units?",
      ]),
      next_pack_id: MASTER_DATA_CP175_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP175_PACK_BINDING,
  );
}

export function createMasterDataCp175CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP175_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP175_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP175_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP175_PACK_BINDING.range,
      open_scope: "Continue RP04.P09.M07.S07 generated Master Data terminal readiness and closeout units in CP00-176.",
      production_ready_flag: MASTER_DATA_CP175_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP175_PACK_BINDING,
  );
}

export function createMasterDataCp176CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const byPhase = {};
  const byTitle = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byTitle[unit.title] = (byTitle[unit.title] ?? 0) + 1;
  }
  const sectionUnitTotal = Object.values(MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections).reduce(
    (total, section) => total + section.unit_count,
    0,
  );
  const sectionUnitIds = Object.freeze(
    Object.values(MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections).flatMap((section) => {
      const [firstUnit, lastUnit] = section.unit_range.split("-");
      const firstMatch = /^(RP\d+\.P\d+\.M\d+\.S)(\d+)$/.exec(firstUnit);
      const lastMatch = /^(RP\d+\.P\d+\.M\d+\.S)(\d+)$/.exec(lastUnit);
      if (!firstMatch || !lastMatch || firstMatch[1] !== lastMatch[1]) return [];
      const width = firstMatch[2].length;
      const start = Number.parseInt(firstMatch[2], 10);
      const end = Number.parseInt(lastMatch[2], 10);
      return Array.from({ length: end - start + 1 }, (_, offset) => `${firstMatch[1]}${String(start + offset).padStart(width, "0")}`);
    }),
  );
  const unitIds = units.map((unit) => unit.id);
  return freezeResult(
    {
      pack_id: MASTER_DATA_CP176_PACK_BINDING.pack_id,
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      by_phase: Object.freeze(byPhase),
      by_title: Object.freeze(byTitle),
      catalog_id: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.catalog_id,
      terminal_sections: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections,
      section_unit_total: sectionUnitTotal,
      section_unit_ids: sectionUnitIds,
      section_unit_ids_match_plan: JSON.stringify(sectionUnitIds) === JSON.stringify(unitIds),
      section_unit_ids_missing_from_plan: Object.freeze(sectionUnitIds.filter((unitId) => !unitIds.includes(unitId))),
      plan_unit_ids_missing_from_sections: Object.freeze(unitIds.filter((unitId) => !sectionUnitIds.includes(unitId))),
    },
    MASTER_DATA_CP176_PACK_BINDING,
  );
}

export function validateMasterDataCp176Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-176 plan pack is required");
  if (planPack?.pack_id !== MASTER_DATA_CP176_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-176");
  if (planPack?.risk_class !== MASTER_DATA_CP176_PACK_BINDING.risk_class) errors.push("CP00-176 risk class drift");
  if (planPack?.unit_count !== MASTER_DATA_CP176_PACK_BINDING.unit_count) errors.push("CP00-176 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MASTER_DATA_CP176_PACK_BINDING.first_unit_id) errors.push("CP00-176 first unit drift");
  if (unitIds.at(-1) !== MASTER_DATA_CP176_PACK_BINDING.last_unit_id) errors.push("CP00-176 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-176 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP04")) errors.push("CP00-176 must only include RP04 units");
  const sectionUnitTotal = Object.values(MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections).reduce(
    (total, section) => total + section.unit_count,
    0,
  );
  if (sectionUnitTotal !== MASTER_DATA_CP176_PACK_BINDING.unit_count) errors.push("CP00-176 terminal section unit total drift");
  const summary = createMasterDataCp176CoverageSummary(planPack);
  if (summary.section_unit_ids.length !== MASTER_DATA_CP176_PACK_BINDING.unit_count) errors.push("CP00-176 terminal section unit ID count drift");
  if (summary.section_unit_ids_match_plan !== true) errors.push("CP00-176 terminal section unit IDs must match planned unit IDs");
  if (summary.section_unit_ids_missing_from_plan.length > 0) errors.push("CP00-176 terminal section ranges include units outside the plan");
  if (summary.plan_unit_ids_missing_from_sections.length > 0) errors.push("CP00-176 plan includes units outside terminal section ranges");
  const expected = MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.unit_scope_summary;
  for (const [deliverable, expectedCount] of Object.entries(expected.deliverable_distribution)) {
    if (summary.by_deliverable[deliverable] !== expectedCount) errors.push(`CP00-176 ${deliverable} distribution drift`);
  }
  for (const [phaseId, expectedCount] of Object.entries(expected.phase_distribution)) {
    if (summary.by_phase[phaseId] !== expectedCount) errors.push(`CP00-176 ${phaseId} distribution drift`);
  }
  for (const [microPhase, expectedCount] of Object.entries(expected.micro_phase_distribution)) {
    if (summary.by_micro_phase[microPhase] !== expectedCount) errors.push(`CP00-176 ${microPhase} distribution drift`);
  }
  for (const [microTitle, expectedCount] of Object.entries(expected.micro_title_distribution)) {
    if (summary.by_micro_title[microTitle] !== expectedCount) errors.push(`CP00-176 ${microTitle} micro title distribution drift`);
  }
  for (const [title, expectedCount] of Object.entries(expected.title_distribution)) {
    if (summary.by_title[title] !== expectedCount) errors.push(`CP00-176 ${title} title distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MASTER_DATA_CP176_PACK_BINDING,
  );
}

export function validateMasterDataCp176TerminalReviewCloseoutReadiness(contractProjection = null) {
  const errors = [];
  const readiness = MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS;
  if (readiness.pack_id !== MASTER_DATA_CP176_PACK_BINDING.pack_id) errors.push("CP00-176 terminal readiness pack ID drift");
  if (readiness.source_evidence_review_ui_readiness_bridge_catalog_id !== MASTER_DATA_EVIDENCE_REVIEW_UI_READINESS_BRIDGE.catalog_id) {
    errors.push("CP00-176 source evidence/review/UI bridge drift");
  }
  if (readiness.source_permission_audit_sensitive_tail_boundary_catalog_id !== MASTER_DATA_PERMISSION_AUDIT_SENSITIVE_TAIL_BOUNDARY.catalog_id) {
    errors.push("CP00-176 source permission/audit sensitive tail boundary drift");
  }
  if (readiness.source_permission_audit_binding_id !== MASTER_DATA_PERMISSION_AUDIT_BINDING.binding_id) {
    errors.push("CP00-176 source permission/audit binding drift");
  }
  if (!readiness.phase_scope.includes("RP04.P09")) errors.push("CP00-176 missing phase RP04.P09");
  for (const microPhase of ["RP04.P09.M07", "RP04.P09.M08", "RP04.P09.M09", "RP04.P09.M10"]) {
    if (!readiness.micro_phase_scope.includes(microPhase)) errors.push(`CP00-176 missing micro phase ${microPhase}`);
  }
  for (const sectionKey of [
    "rp09_test_golden_closeout_tail",
    "rp09_hermes_review_questions",
    "rp09_claude_review_questions",
    "rp09_closeout_handoff_questions",
  ]) {
    if (!readiness.terminal_sections[sectionKey]) errors.push(`CP00-176 missing terminal section ${sectionKey}`);
  }
  const sectionUnitTotal = Object.values(readiness.terminal_sections).reduce((total, section) => total + section.unit_count, 0);
  if (sectionUnitTotal !== MASTER_DATA_CP176_PACK_BINDING.unit_count) errors.push("CP00-176 terminal sections must total 34 units");
  if (readiness.terminal_sections.rp09_test_golden_closeout_tail.sends_claude_prompt !== false) {
    errors.push("CP00-176 test/golden tail must not send Claude prompts");
  }
  if (readiness.terminal_sections.rp09_test_golden_closeout_tail.writes_case_note !== false) {
    errors.push("CP00-176 test/golden tail must not write case notes");
  }
  if (readiness.terminal_sections.rp09_hermes_review_questions.executes_hermes_command !== false) {
    errors.push("CP00-176 Hermes questions must not execute Hermes commands");
  }
  if (readiness.terminal_sections.rp09_hermes_review_questions.renders_ui !== false) {
    errors.push("CP00-176 Hermes questions must not render UI");
  }
  if (readiness.terminal_sections.rp09_claude_review_questions.sends_claude_prompt !== false) {
    errors.push("CP00-176 Claude questions must not send prompts");
  }
  if (readiness.terminal_sections.rp09_claude_review_questions.executes_claude_review !== false) {
    errors.push("CP00-176 Claude questions must not execute reviews");
  }
  if (readiness.terminal_sections.rp09_closeout_handoff_questions.to_pack_id !== MASTER_DATA_CP176_PACK_BINDING.next_pack_id) {
    errors.push("CP00-176 handoff next pack drift");
  }
  if (readiness.terminal_sections.rp09_closeout_handoff_questions.next_subphase_id !== MASTER_DATA_CP176_PACK_BINDING.next_subphase_id) {
    errors.push("CP00-176 handoff next subphase drift");
  }
  if (readiness.terminal_sections.rp09_closeout_handoff_questions.next_program_id !== "RP05") {
    errors.push("CP00-176 handoff must target RP05");
  }
  if (readiness.terminal_sections.rp09_closeout_handoff_questions.evaluates_runtime_permission !== false) {
    errors.push("CP00-176 handoff must not evaluate runtime permission");
  }
  if (readiness.terminal_sections.rp09_closeout_handoff_questions.appends_audit_event !== false) {
    errors.push("CP00-176 handoff must not append audit events");
  }
  if (readiness.evidence_descriptors.hermes_terminal_review_closeout_readiness !== "H04.CP00-176.master_data_terminal_review_closeout_readiness") {
    errors.push("CP00-176 Hermes evidence descriptor drift");
  }
  if (readiness.evidence_descriptors.claude_terminal_review_closeout_readiness_review !== "C04.CP00-176.master_data_terminal_review_closeout_readiness") {
    errors.push("CP00-176 Claude review descriptor drift");
  }
  if (readiness.leak_guard.renderable_surface !== "customer_facing_terminal_review_closeout_readiness_summary_only") {
    errors.push("CP00-176 renderable surface must be terminal readiness summary only");
  }
  for (const internalField of [
    "permission_ref",
    "audit_hint_ref",
    "runtime_permission_result",
    "audit_event_payload",
    "hermes_command_payload",
    "claude_prompt_payload",
    "changed_file_diff",
    "ui_leak_payload",
    "finding_route_payload",
    "next_rp_dependency_payload",
  ]) {
    if (!readiness.leak_guard.internal_reference_fields.includes(internalField)) {
      errors.push(`CP00-176 leak guard missing internal field ${internalField}`);
    }
  }
  if (MASTER_DATA_CP176_NO_WRITE_ATTESTATION.builds_terminal_review_closeout_readiness !== true) {
    errors.push("CP00-176 must build terminal review closeout readiness descriptors");
  }
  for (const flag of [
    "loads_real_client_data",
    "accepts_real_client_data",
    "evaluates_runtime_permission",
    "writes_audit_event",
    "appends_audit_event",
    "dispatches_review_route",
    "dispatches_approval_route",
    "executes_api_handler",
    "issues_network_request",
    "renders_ui",
    "mutates_dom",
    "executes_ai_retrieval",
    "executes_analytics_query",
    "emits_hermes_evidence",
    "executes_hermes_command",
    "executes_claude_review",
    "sends_claude_prompt",
    "executes_rollback",
    "executes_retry",
    "acquires_runtime_lock",
    "writes_product_state",
    "writes_case_note",
  ]) {
    if (MASTER_DATA_CP176_NO_WRITE_ATTESTATION[flag] !== false) errors.push(`CP00-176 must keep ${flag} false`);
  }

  if (contractProjection) {
    const contractEntry = contractProjection.terminal_review_closeout_readiness;
    if (contractEntry?.pack_id !== readiness.pack_id) errors.push("CP00-176 contract pack ID drift");
    if (contractEntry?.catalog_id !== readiness.catalog_id) errors.push("CP00-176 contract catalog ID drift");
    if (contractEntry?.source_evidence_review_ui_readiness_bridge_catalog_id !== readiness.source_evidence_review_ui_readiness_bridge_catalog_id) {
      errors.push("CP00-176 contract source evidence/review/UI bridge drift");
    }
    if (contractEntry?.source_permission_audit_sensitive_tail_boundary_catalog_id !== readiness.source_permission_audit_sensitive_tail_boundary_catalog_id) {
      errors.push("CP00-176 contract source sensitive tail drift");
    }
    if (contractEntry?.source_permission_audit_binding_id !== readiness.source_permission_audit_binding_id) {
      errors.push("CP00-176 contract source permission/audit binding drift");
    }
    if (JSON.stringify(contractEntry?.phase_scope ?? []) !== JSON.stringify(readiness.phase_scope)) {
      errors.push("CP00-176 contract phase scope drift");
    }
    if (JSON.stringify(contractEntry?.micro_phase_scope ?? []) !== JSON.stringify(readiness.micro_phase_scope)) {
      errors.push("CP00-176 contract micro phase scope drift");
    }
    if (JSON.stringify(contractEntry?.unit_scope_summary ?? {}) !== JSON.stringify(readiness.unit_scope_summary)) {
      errors.push("CP00-176 contract unit scope summary drift");
    }
    if (JSON.stringify(contractEntry?.terminal_sections ?? {}) !== JSON.stringify(readiness.terminal_sections)) {
      errors.push("CP00-176 contract terminal sections drift");
    }
    if (JSON.stringify(contractEntry?.evidence_descriptors ?? {}) !== JSON.stringify(readiness.evidence_descriptors)) {
      errors.push("CP00-176 contract evidence descriptors drift");
    }
    if (contractEntry?.leak_guard?.renderable_surface !== readiness.leak_guard.renderable_surface) {
      errors.push("CP00-176 contract renderable surface drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.internal_reference_fields ?? []) !== JSON.stringify(readiness.leak_guard.internal_reference_fields)) {
      errors.push("CP00-176 contract internal reference fields drift");
    }
    if (JSON.stringify(contractEntry?.leak_guard?.prohibited_outputs ?? []) !== JSON.stringify(readiness.leak_guard.prohibited_outputs)) {
      errors.push("CP00-176 contract prohibited outputs drift");
    }
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      terminal_review_closeout_readiness: readiness,
      no_write_attestation: MASTER_DATA_CP176_NO_WRITE_ATTESTATION,
    },
    MASTER_DATA_CP176_PACK_BINDING,
  );
}

export function createMasterDataCp176HermesEvidencePacket(planPack) {
  const coverage = validateMasterDataCp176Coverage(planPack);
  const readiness = validateMasterDataCp176TerminalReviewCloseoutReadiness();
  return freezeResult(
    {
      evidence_packet: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.evidence_descriptors.hermes_terminal_review_closeout_readiness,
      gate: MASTER_DATA_CP176_PACK_BINDING.hermes_gate,
      pack_id: MASTER_DATA_CP176_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      terminal_review_closeout_readiness_valid: readiness.valid,
      no_real_data: true,
      no_write_attestation: MASTER_DATA_CP176_NO_WRITE_ATTESTATION,
      section_count: Object.keys(MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.terminal_sections).length,
      section_unit_total: coverage.summary.section_unit_total,
      next_pack_id: MASTER_DATA_CP176_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP176_PACK_BINDING,
  );
}

export function createMasterDataCp176ClaudeReviewPacket(planPack) {
  const coverage = validateMasterDataCp176Coverage(planPack);
  const readiness = validateMasterDataCp176TerminalReviewCloseoutReadiness();
  return freezeResult(
    {
      review_packet: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.evidence_descriptors.claude_terminal_review_closeout_readiness_review,
      gate: MASTER_DATA_CP176_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MASTER_DATA_CP176_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      terminal_review_closeout_readiness_valid: readiness.valid,
      questions: Object.freeze([
        "Does CP00-176 cover exactly the 34 planned Risk B units from RP04.P09.M07.S07 through RP04.P09.M10.S04?",
        "Do downstream readiness, risk register, severity taxonomy, go/no-go, finding routing, human approval, closeout notes, review questions, and RP05 handoff remain descriptor-only?",
        "Does CP00-176 avoid runtime permission evaluation, audit appends, review/approval dispatch, Hermes command execution, Claude prompt sending, UI rendering, DOM mutation, and case-note writes?",
        "Do customer-facing terminal summaries exclude permission refs, audit internals, runtime permission results, audit event payloads, Hermes command payloads, Claude prompt payloads, changed-file diffs, reviewer identity, finding-route payloads, next-RP dependency payloads, and UI leak payloads?",
        "Does CP00-176 close RP04 cleanly and hand off to CP00-177 / RP05.P00.M00.S01 without implementing RP05 behavior in the Master Data pack?",
      ]),
      next_pack_id: MASTER_DATA_CP176_PACK_BINDING.next_pack_id,
    },
    MASTER_DATA_CP176_PACK_BINDING,
  );
}

export function createMasterDataCp176CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: MASTER_DATA_TERMINAL_REVIEW_CLOSEOUT_READINESS.evidence_descriptors.closeout_handoff,
      from_pack_id: MASTER_DATA_CP176_PACK_BINDING.pack_id,
      to_pack_id: MASTER_DATA_CP176_PACK_BINDING.next_pack_id,
      next_subphase_id: MASTER_DATA_CP176_PACK_BINDING.next_subphase_id,
      closed_scope: MASTER_DATA_CP176_PACK_BINDING.range,
      open_scope: "Start RP05 Matter Core scope inventory and foundation units in CP00-177 at RP05.P00.M00.S01.",
      production_ready_flag: MASTER_DATA_CP176_PACK_BINDING.production_ready_flag,
    },
    MASTER_DATA_CP176_PACK_BINDING,
  );
}
