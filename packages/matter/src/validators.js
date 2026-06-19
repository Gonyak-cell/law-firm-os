import {
  MATTER_CORE_CP177_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP177_PACK_BINDING,
  MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP178_PACK_BINDING,
  MATTER_CORE_CP179_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP179_PACK_BINDING,
  MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS,
  MATTER_CORE_CP180_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP180_PACK_BINDING,
  MATTER_CORE_CP180_SENSITIVE_SERVICE_BOUNDARY_REQUIREMENTS,
  MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS,
  MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP181_PACK_BINDING,
  MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP182_PACK_BINDING,
  MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS,
  MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP183_PACK_BINDING,
  MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS,
  MATTER_CORE_CP184_FIXTURE_EVIDENCE_TERMINAL_REQUIREMENTS,
  MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP184_PACK_BINDING,
  MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP185_PACK_BINDING,
  MATTER_CORE_CP185_PERMISSION_AUDIT_TAIL_REQUIREMENTS,
  MATTER_CORE_CP186_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP186_PACK_BINDING,
  MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS,
  MATTER_CORE_CP187_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP187_PACK_BINDING,
  MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS,
  MATTER_CORE_CP188_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP188_PACK_BINDING,
  MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS,
  MATTER_CORE_CP189_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP189_PACK_BINDING,
  MATTER_CORE_CP189_SYNTHETIC_FIXTURE_FAILURE_EVIDENCE_REQUIREMENTS,
  MATTER_CORE_CP190_FAILURE_RECEIPT_TAXONOMY_BOUNDARY_REQUIREMENTS,
  MATTER_CORE_CP190_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP190_PACK_BINDING,
  MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS,
  MATTER_CORE_CP191_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP191_PACK_BINDING,
  MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS,
  MATTER_CORE_CP192_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP192_PACK_BINDING,
  MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS,
  MATTER_CORE_CP193_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP193_PACK_BINDING,
  MATTER_CORE_CP194_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP194_PACK_BINDING,
  MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS,
  MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS,
  MATTER_CORE_CP195_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP195_PACK_BINDING,
  MATTER_CORE_CP196_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP196_PACK_BINDING,
  MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS,
  MATTER_CORE_CP197_NO_WRITE_ATTESTATION,
  MATTER_CORE_CP197_PACK_BINDING,
  MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS,
  MATTER_CORE_FUTURE_DEPENDENCIES,
  MATTER_CORE_MODEL_DEFINITIONS,
  MATTER_CORE_PROGRAM_CONTRACT,
  MATTER_CORE_SERVICE_BOUNDARY,
  MATTER_CORE_SERVICE_OPERATIONS,
  MATTER_GRAPH_EDGE_TYPES,
  MATTER_GRAPH_NODE_TYPES,
  MATTER_GRAPH_PROVIDER_BOUNDARY,
  getMatterCoreModelDefinition,
  listMatterCoreModelTypes,
} from "./registry.js";
import { createMatterCoreSyntheticFixture, missingMatterCoreRequiredFields } from "./model.js";

function freezeResult(result, packBinding = MATTER_CORE_CP177_PACK_BINDING, noWriteAttestation = MATTER_CORE_CP177_NO_WRITE_ATTESTATION) {
  return Object.freeze({
    ...result,
    pack_id: packBinding.pack_id,
    synthetic_only: true,
    no_real_client_data: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
    implements_loop_engine: false,
  });
}

function pushUnique(list, value) {
  if (!list.includes(value)) list.push(value);
}

export function validateMatterCoreRecord(modelType, record, options = {}) {
  const errors = [];
  const blocked_claims = [];
  const review_required_claims = [];
  let definition;
  try {
    definition = getMatterCoreModelDefinition(modelType);
  } catch (error) {
    errors.push(error.message);
    pushUnique(blocked_claims, "unknown_model_type");
  }

  if (definition) {
    const missing = missingMatterCoreRequiredFields(modelType, record);
    if (missing.length > 0) {
      errors.push(`${modelType} missing required fields: ${missing.join(", ")}`);
      pushUnique(blocked_claims, "missing_required_fields");
    }
    if (!record?.tenant_id) pushUnique(blocked_claims, "tenant_scope_missing");
    if (definition.matter_trace_policy === "required" && !record?.matter_id) {
      errors.push(`${modelType} requires matter_id`);
      pushUnique(blocked_claims, "missing_matter_trace");
    }
    if (record?.tenant_id && options.expected_tenant_id && record.tenant_id !== options.expected_tenant_id) {
      errors.push(`${modelType} tenant_id must match expected tenant ${options.expected_tenant_id}`);
      pushUnique(blocked_claims, "cross_tenant_reference");
    }
    if (record?.status && !definition.lifecycle_statuses.includes(record.status)) {
      errors.push(`${modelType} status must be one of ${definition.lifecycle_statuses.join(", ")}`);
      pushUnique(blocked_claims, "invalid_lifecycle_status");
    }
    if (record?.review_status && !definition.lifecycle_statuses.includes(record.review_status)) {
      errors.push(`${modelType} review_status must be one of ${definition.lifecycle_statuses.join(", ")}`);
      pushUnique(blocked_claims, "invalid_review_status");
    }
    if (modelType === "MatterWikiSection") {
      if (record.source_policy !== "uncited_internal_note" && record.source_link_refs?.length === 0) {
        errors.push("MatterWikiSection with source material must keep at least one source link or be marked uncited_internal_note");
        pushUnique(blocked_claims, "missing_source_link");
      }
      if (record.ai_generated === true && !["candidate", "under_review"].includes(record.review_status)) {
        errors.push("AI-generated MatterWikiSection must remain candidate or under_review before human review");
        pushUnique(blocked_claims, "ai_text_without_review");
      }
      if (record.client_visible_candidate === true && record.review_status !== "approved_client_visible") {
        pushUnique(review_required_claims, "client_visible_summary_requires_review");
      }
    }
    if (modelType === "MatterGraphNode" && !MATTER_GRAPH_NODE_TYPES.includes(record?.node_type)) {
      errors.push("MatterGraphNode node_type is outside the v2 graph vocabulary");
      pushUnique(blocked_claims, "unknown_graph_node_type");
    }
    if (modelType === "MatterGraphEdge") {
      if (!MATTER_GRAPH_EDGE_TYPES.includes(record?.edge_type)) {
        errors.push("MatterGraphEdge edge_type is outside the v2 graph vocabulary");
        pushUnique(blocked_claims, "unknown_graph_edge_type");
      }
      if (record.edge_type === "SIMILAR_TO") {
        for (const field of ["method", "score", "source_index", "permission_decision_id"]) {
          if (!record.similarity_metadata?.[field]) pushUnique(blocked_claims, `similar_to_${field}_missing`);
        }
      }
    }
  }

  return freezeResult({
    model_type: modelType,
    valid: errors.length === 0,
    checked: Object.freeze([
      "required_fields",
      "tenant_scope",
      "matter_trace",
      "lifecycle_status",
      "wiki_source_link_policy",
      "ai_review_state",
      "client_visible_review_gate",
      "graph_vocabulary",
      "similarity_permission_metadata",
    ]),
    errors: Object.freeze(errors),
    blocked_claims: Object.freeze(blocked_claims),
    review_required_claims: Object.freeze(review_required_claims),
    no_write_attestation: options.no_write_attestation ?? MATTER_CORE_CP177_NO_WRITE_ATTESTATION,
  }, options.pack_binding ?? MATTER_CORE_CP177_PACK_BINDING, options.no_write_attestation ?? MATTER_CORE_CP177_NO_WRITE_ATTESTATION);
}

export function validateMatterCoreRegistry(registry = MATTER_CORE_MODEL_DEFINITIONS) {
  const errors = [];
  const modelTypes = Object.keys(registry);
  for (const modelType of modelTypes) {
    const definition = registry[modelType];
    if (!definition.primary_id) errors.push(`${modelType} missing primary_id`);
    if (definition.tenant_field !== "tenant_id") errors.push(`${modelType} tenant field must be tenant_id`);
    if (definition.owner_module !== "MatterCore") errors.push(`${modelType} owner_module must be MatterCore`);
    if (!Array.isArray(definition.required_fields) || definition.required_fields.length === 0) {
      errors.push(`${modelType} missing required_fields`);
    }
    if (!definition.matter_trace_policy) errors.push(`${modelType} missing matter_trace_policy`);
  }
  if (!modelTypes.includes("MatterWiki")) errors.push("MatterWiki must be first-class in RP05");
  if (!modelTypes.includes("MatterGraphNode") || !modelTypes.includes("MatterGraphEdge")) {
    errors.push("MatterGraph node and edge skeletons must be present in RP05");
  }
  return freezeResult({
    valid: errors.length === 0,
    model_count: modelTypes.length,
    model_types: Object.freeze(modelTypes),
    errors: Object.freeze(errors),
  });
}

export function createMatterCoreCp177CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroTitle = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
  }
  return freezeResult({
    first_unit_id: units.at(0)?.id,
    last_unit_id: units.at(-1)?.id,
    unit_count: units.length,
    by_deliverable: Object.freeze(byDeliverable),
    by_phase: Object.freeze(byPhase),
    by_micro_title: Object.freeze(byMicroTitle),
    model_types: listMatterCoreModelTypes(),
    fixture_id: createMatterCoreSyntheticFixture().fixture_id,
  });
}

export function validateMatterCoreCp177Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-177 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP177_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-177");
  if (planPack?.risk_class !== MATTER_CORE_CP177_PACK_BINDING.risk_class) errors.push("CP00-177 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP177_PACK_BINDING.unit_count) errors.push("CP00-177 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP177_PACK_BINDING.first_unit_id) errors.push("CP00-177 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP177_PACK_BINDING.last_unit_id) errors.push("CP00-177 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-177 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-177 must only include RP05 units");

  const summary = createMatterCoreCp177CoverageSummary(planPack);
  const expectedDeliverables = {
    implementation: 104,
    contract: 3,
    security_audit: 6,
    ui: 19,
    fixture: 3,
    test: 9,
    hermes_evidence: 3,
    claude_review: 3,
  };
  for (const [deliverable, count] of Object.entries(expectedDeliverables)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-177 ${deliverable} distribution drift`);
  }
  if (summary.by_phase["RP05.P00"] !== 52) errors.push("CP00-177 RP05.P00 distribution drift");
  if (summary.by_phase["RP05.P01"] !== 98) errors.push("CP00-177 RP05.P01 distribution drift");

  return freezeResult({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    summary,
  });
}

export function validateMatterCoreCp177Foundation(contractProjection = {}) {
  const errors = [];
  const registry = validateMatterCoreRegistry();
  const fixture = createMatterCoreSyntheticFixture();
  if (!registry.valid) errors.push(...registry.errors);
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      MATTER_CORE_CP177_PACK_BINDING.pack_id,
      MATTER_CORE_CP178_PACK_BINDING.pack_id,
      MATTER_CORE_CP179_PACK_BINDING.pack_id,
      MATTER_CORE_CP180_PACK_BINDING.pack_id,
      MATTER_CORE_CP181_PACK_BINDING.pack_id,
      MATTER_CORE_CP182_PACK_BINDING.pack_id,
      MATTER_CORE_CP183_PACK_BINDING.pack_id,
      MATTER_CORE_CP184_PACK_BINDING.pack_id,
      MATTER_CORE_CP185_PACK_BINDING.pack_id,
      MATTER_CORE_CP186_PACK_BINDING.pack_id,
      MATTER_CORE_CP187_PACK_BINDING.pack_id,
      MATTER_CORE_CP188_PACK_BINDING.pack_id,
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("contract current_pack must preserve CP00-177 foundation or advance through CP00-193");
  }
  if (contractProjection?.program?.program_id !== "RP05") errors.push("contract program must be RP05");
  if (contractProjection?.program?.owner_module !== "MatterCore") errors.push("contract owner module must be MatterCore");
  if (contractProjection?.v2_overlay?.matter_wiki?.first_class_workspace !== true) errors.push("contract must declare MatterWiki first-class workspace");
  if (contractProjection?.v2_overlay?.matter_graph?.provider_runtime_selected !== false) errors.push("contract must keep MatterGraph provider runtime unselected in CP177");
  if (contractProjection?.future_dependencies?.citation_ledger?.cp177_status !== "reserved_reference_only") errors.push("CitationLedger must remain reserved reference only");
  if (contractProjection?.future_dependencies?.loop_context?.cp177_status !== "stable_context_reference_only") errors.push("Loop context must remain stable reference only");
  if (contractProjection?.no_write_attestation?.implements_loop_engine !== false) errors.push("CP177 must not implement Loop engine");
  if (fixture.wiki_shell.exposes_client_visible_wiki_output !== false) errors.push("wiki shell must not expose client-visible output");
  if (fixture.graph_skeleton.provider_runtime_selected !== false) errors.push("graph skeleton must not select runtime provider");
  return freezeResult({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    registry_valid: registry.valid,
    fixture_id: fixture.fixture_id,
    fixture_record_count: fixture.records.length,
    wiki_section_count: fixture.wiki_shell.sections.length,
    graph_node_count: fixture.graph_skeleton.nodes.length,
    graph_edge_count: fixture.graph_skeleton.edges.length,
    no_write_attestation: MATTER_CORE_CP177_NO_WRITE_ATTESTATION,
  });
}

export function createMatterCoreCp177HermesEvidencePacket(planPack, contractProjection = {}) {
  const coverage = validateMatterCoreCp177Coverage(planPack);
  const foundation = validateMatterCoreCp177Foundation(contractProjection);
  return freezeResult({
    evidence_packet: "H05.CP00-177.matter_core_foundation_wiki_graph_skeleton",
    gate: MATTER_CORE_CP177_PACK_BINDING.hermes_gate,
    coverage_valid: coverage.valid,
    foundation_valid: foundation.valid,
    model_count: listMatterCoreModelTypes().length,
    graph_node_type_count: MATTER_GRAPH_NODE_TYPES.length,
    graph_edge_type_count: MATTER_GRAPH_EDGE_TYPES.length,
    provider_boundary: MATTER_GRAPH_PROVIDER_BOUNDARY.provider_contract,
    future_dependencies: MATTER_CORE_FUTURE_DEPENDENCIES,
    no_write_attestation: MATTER_CORE_CP177_NO_WRITE_ATTESTATION,
    production_ready_candidate: coverage.valid && foundation.valid,
  });
}

export function createMatterCoreCp177ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp177Coverage(planPack);
  return freezeResult({
    review_packet: "C05.CP00-177.matter_core_foundation_wiki_graph_skeleton",
    model: "claude-opus-4-8",
    effort: "max",
    mode: "read_only",
    coverage_valid: coverage.valid,
    review_questions: Object.freeze([
      "Does CP00-177 keep MatterWiki first-class without exposing client-visible output before permission trimming and human review?",
      "Does CP00-177 define a provider-neutral MatterGraph skeleton without implementing Neo4j/runtime traversal?",
      "Are CitationLedger and Loop references reserved for their later RP/CP stages?",
      "Are tenant, matter trace, permission envelope, and audit trace fields present in the RP05 foundation records?",
    ]),
    invalid_review_blockers: Object.freeze(["not_logged_in", "malformed_json", "tool_call_shaped_output"]),
  });
}

export function createMatterCoreCp177CloseoutHandoff(planPack) {
  const coverage = validateMatterCoreCp177Coverage(planPack);
  return freezeResult({
    handoff_id: "CP00-177-to-CP00-178",
    from_pack_id: MATTER_CORE_CP177_PACK_BINDING.pack_id,
    to_pack_id: MATTER_CORE_CP177_PACK_BINDING.next_pack_id,
    next_subphase_id: MATTER_CORE_CP177_PACK_BINDING.next_subphase_id,
    coverage_valid: coverage.valid,
    next_focus: Object.freeze([
      "complete RP05.P01 Hermes evidence tail",
      "continue Matter model ownership metadata and reference maps",
      "advance RP05.P02 service/domain implementation without moving Loop engine earlier",
    ]),
    blocked_future_claims: Object.freeze(MATTER_CORE_PROGRAM_CONTRACT.forbidden_in_cp177),
  });
}

export function createMatterCoreCp178CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      service_entrypoint: MATTER_CORE_SERVICE_BOUNDARY.service_entrypoint,
      supported_operations: MATTER_CORE_SERVICE_BOUNDARY.supported_operations,
      service_prechecks: MATTER_CORE_SERVICE_BOUNDARY.prechecks,
    },
    MATTER_CORE_CP178_PACK_BINDING,
    MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp178Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-178 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP178_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-178");
  if (planPack?.risk_class !== MATTER_CORE_CP178_PACK_BINDING.risk_class) errors.push("CP00-178 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP178_PACK_BINDING.unit_count) errors.push("CP00-178 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP178_PACK_BINDING.first_unit_id) errors.push("CP00-178 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP178_PACK_BINDING.last_unit_id) errors.push("CP00-178 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-178 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-178 must only include RP05 units");

  const summary = createMatterCoreCp178CoverageSummary(planPack);
  const expectedDeliverables = {
    implementation: 70,
    ui: 23,
    contract: 8,
    security_audit: 16,
    claude_review: 5,
    failure_recovery: 10,
    test: 18,
  };
  for (const [deliverable, count] of Object.entries(expectedDeliverables)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-178 ${deliverable} distribution drift`);
  }
  if (summary.by_phase["RP05.P01"] !== 14) errors.push("CP00-178 RP05.P01 distribution drift");
  if (summary.by_phase["RP05.P02"] !== 136) errors.push("CP00-178 RP05.P02 distribution drift");
  const expectedMicro = {
    "RP05.P01.M08": 3,
    "RP05.P01.M09": 8,
    "RP05.P01.M10": 3,
    "RP05.P02.M00": 11,
    "RP05.P02.M01": 11,
    "RP05.P02.M02": 20,
    "RP05.P02.M03": 22,
    "RP05.P02.M04": 22,
    "RP05.P02.M05": 22,
    "RP05.P02.M06": 22,
    "RP05.P02.M07": 6,
  };
  for (const [microPhase, count] of Object.entries(expectedMicro)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-178 ${microPhase} distribution drift`);
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP178_PACK_BINDING,
    MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp178ServiceBoundary(contractProjection = {}) {
  const errors = [];
  const operations = Object.keys(MATTER_CORE_SERVICE_OPERATIONS);
  if (MATTER_CORE_SERVICE_BOUNDARY.pack_id !== MATTER_CORE_CP178_PACK_BINDING.pack_id) errors.push("CP00-178 service boundary pack drift");
  if (MATTER_CORE_SERVICE_BOUNDARY.service_entrypoint !== "executeMatterCoreServiceWorkflow") {
    errors.push("CP00-178 service entrypoint drift");
  }
  if (operations.length !== 5) errors.push("CP00-178 must expose five descriptor service operations");
  for (const operation of ["matter_opening", "member_assignment", "task_planning", "wiki_section_staging", "graph_relationship_staging"]) {
    if (!operations.includes(operation)) errors.push(`CP00-178 missing service operation ${operation}`);
    if (!MATTER_CORE_SERVICE_BOUNDARY.supported_operations.includes(operation)) errors.push(`CP00-178 boundary missing ${operation}`);
  }
  for (const precheck of [
    "tenant_boundary_precheck",
    "matter_trace_precheck",
    "permission_precheck",
    "audit_hint_precheck",
    "state_transition_enforcement",
    "idempotency_key_handling",
    "lock_acquisition_rule",
    "persistence_boundary",
  ]) {
    if (!MATTER_CORE_SERVICE_BOUNDARY.prechecks.includes(precheck)) errors.push(`CP00-178 missing ${precheck}`);
  }
  for (const claim of [
    "tenant_scope_missing",
    "tenant_boundary_mismatch",
    "missing_matter_trace",
    "permission_precheck_required",
    "audit_hint_precheck_required",
    "idempotency_key_required",
    "unsupported_service_operation",
    "missing_source_link",
    "ai_text_without_review",
    "similar_to_permission_decision_id_missing",
  ]) {
    if (!MATTER_CORE_SERVICE_BOUNDARY.customer_safe_error_codes[claim]) errors.push(`CP00-178 missing safe error code for ${claim}`);
  }
  if (MATTER_CORE_CP178_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-178 must not write product state");
  if (MATTER_CORE_CP178_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-178 must not evaluate runtime permission");
  if (MATTER_CORE_CP178_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-178 must not write audit events");
  if (MATTER_CORE_CP178_NO_WRITE_ATTESTATION.acquires_runtime_lock !== false) errors.push("CP00-178 must not acquire runtime locks");
  if (MATTER_CORE_CP178_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-178 must not implement Loop engine");
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      MATTER_CORE_CP178_PACK_BINDING.pack_id,
      MATTER_CORE_CP179_PACK_BINDING.pack_id,
      MATTER_CORE_CP180_PACK_BINDING.pack_id,
      MATTER_CORE_CP181_PACK_BINDING.pack_id,
      MATTER_CORE_CP182_PACK_BINDING.pack_id,
      MATTER_CORE_CP183_PACK_BINDING.pack_id,
      MATTER_CORE_CP184_PACK_BINDING.pack_id,
      MATTER_CORE_CP185_PACK_BINDING.pack_id,
      MATTER_CORE_CP186_PACK_BINDING.pack_id,
      MATTER_CORE_CP187_PACK_BINDING.pack_id,
      MATTER_CORE_CP188_PACK_BINDING.pack_id,
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-178 contract current_pack drift");
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      operation_count: operations.length,
      supported_operations: MATTER_CORE_SERVICE_BOUNDARY.supported_operations,
      prechecks: MATTER_CORE_SERVICE_BOUNDARY.prechecks,
      no_write_attestation: MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP178_PACK_BINDING,
    MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp178HermesEvidencePacket(planPack, contractProjection = {}) {
  const coverage = validateMatterCoreCp178Coverage(planPack);
  const serviceBoundary = validateMatterCoreCp178ServiceBoundary(contractProjection);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-178.matter_core_service_domain_descriptor_boundary",
      gate: MATTER_CORE_CP178_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      service_boundary_valid: serviceBoundary.valid,
      operation_count: serviceBoundary.operation_count,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
      blocked_claim_examples: Object.keys(MATTER_CORE_SERVICE_BOUNDARY.customer_safe_error_codes),
      review_required_routes: MATTER_CORE_SERVICE_BOUNDARY.review_required_routes,
      next_pack_id: MATTER_CORE_CP178_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && serviceBoundary.valid,
    },
    MATTER_CORE_CP178_PACK_BINDING,
    MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp178ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp178Coverage(planPack);
  const serviceBoundary = validateMatterCoreCp178ServiceBoundary();
  return freezeResult(
    {
      review_packet: "C05.CP00-178.matter_core_service_domain_descriptor_boundary",
      gate: MATTER_CORE_CP178_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      service_boundary_valid: serviceBoundary.valid,
      questions: Object.freeze([
        "Does CP00-178 preserve descriptor-only Matter service behavior with no persistence, API, permission, audit, or lock execution?",
        "Are tenant, Matter trace, permission, audit hint, state transition, idempotency, lock, and persistence boundaries explicit?",
        "Are wiki client-visible and graph similarity paths routed to review without dispatching runtime actions?",
        "Does CP00-178 bind all 150 planned units without creating a one-unit closeout?",
        "Does CP00-178 hand off to CP00-179 / RP05.P02.M07.S07 without moving Loop or CitationLedger implementation early?",
      ]),
      invalid_review_blockers: Object.freeze(["not_logged_in", "stdout_0_bytes", "malformed_json", "tool_call_shaped_output"]),
      next_pack_id: MATTER_CORE_CP178_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP178_PACK_BINDING,
    MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp178CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-178-to-CP00-179",
      from_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP178_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP178_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP178_PACK_BINDING.range,
      open_scope: "Continue RP05.P02.M07.S07-RP05.P02.M09.S02 service tail, golden cases, and evidence review bridge without runtime persistence.",
      production_ready_flag: MATTER_CORE_CP178_PACK_BINDING.production_ready_flag,
    },
    MATTER_CORE_CP178_PACK_BINDING,
    MATTER_CORE_CP178_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp179CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      service_source_pack_id: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.source_service_pack_id,
      required_outcomes: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.required_outcomes,
      hardened_review_sequence: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.hardened_review_sequence,
    },
    MATTER_CORE_CP179_PACK_BINDING,
    MATTER_CORE_CP179_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp179Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-179 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP179_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-179");
  if (planPack?.risk_class !== MATTER_CORE_CP179_PACK_BINDING.risk_class) errors.push("CP00-179 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP179_PACK_BINDING.unit_count) errors.push("CP00-179 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP179_PACK_BINDING.first_unit_id) errors.push("CP00-179 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP179_PACK_BINDING.last_unit_id) errors.push("CP00-179 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-179 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-179 must only include RP05 units");

  const summary = createMatterCoreCp179CoverageSummary(planPack);
  const expectedDeliverables = {
    implementation: 16,
    ui: 6,
    claude_review: 2,
    failure_recovery: 4,
    test: 8,
    contract: 2,
    security_audit: 2,
  };
  for (const [deliverable, count] of Object.entries(expectedDeliverables)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-179 ${deliverable} distribution drift`);
  }
  if (summary.by_phase["RP05.P02"] !== 40) errors.push("CP00-179 RP05.P02 distribution drift");
  const expectedMicro = {
    "RP05.P02.M07": 16,
    "RP05.P02.M08": 22,
    "RP05.P02.M09": 2,
  };
  for (const [microPhase, count] of Object.entries(expectedMicro)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-179 ${microPhase} distribution drift`);
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP179_PACK_BINDING,
    MATTER_CORE_CP179_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp179ServiceEvidence(contractProjection = {}) {
  const errors = [];
  const requirements = MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS;
  if (requirements.source_service_pack_id !== MATTER_CORE_CP178_PACK_BINDING.pack_id) {
    errors.push("CP00-179 must derive service evidence from CP00-178 source service pack");
  }
  if (requirements.source_service_entrypoint !== MATTER_CORE_SERVICE_BOUNDARY.service_entrypoint) {
    errors.push("CP00-179 source service entrypoint drift");
  }
  for (const outcome of ["passed", "review_required", "approval_required", "blocked"]) {
    if (!requirements.required_outcomes.includes(outcome)) errors.push(`CP00-179 missing golden outcome ${outcome}`);
  }
  for (const claim of [
    "tenant_boundary_mismatch",
    "missing_matter_trace",
    "permission_precheck_required",
    "audit_hint_precheck_required",
    "unsupported_service_operation",
  ]) {
    if (!requirements.required_negative_claims.includes(claim)) errors.push(`CP00-179 missing negative claim ${claim}`);
    if (!MATTER_CORE_SERVICE_BOUNDARY.customer_safe_error_codes[claim]) errors.push(`CP00-179 missing customer-safe error for ${claim}`);
  }
  for (const step of [
    "baseline",
    "readiness",
    "read_only_claude_raw_capture",
    "normalize",
    "receipt_validate",
    "adjudication",
    "construction_inspection",
    "final_closeout_validation",
  ]) {
    if (!requirements.hardened_review_sequence.includes(step)) errors.push(`CP00-179 missing hardened review step ${step}`);
  }
  for (const tool of ["Read", "Grep", "Glob"]) {
    if (!requirements.allowed_claude_tools.includes(tool)) errors.push(`CP00-179 missing allowed read-only Claude tool ${tool}`);
  }
  for (const forbidden of ["auth_failure", "stdout_0_bytes", "malformed_json", "tool_call_shaped_output"]) {
    if (!requirements.forbidden_review_evidence.includes(forbidden)) errors.push(`CP00-179 missing forbidden review evidence ${forbidden}`);
  }
  if (MATTER_CORE_CP179_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-179 must not write product state");
  if (MATTER_CORE_CP179_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-179 must not evaluate runtime permission");
  if (MATTER_CORE_CP179_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-179 must not write audit events");
  if (MATTER_CORE_CP179_NO_WRITE_ATTESTATION.acquires_runtime_lock !== false) errors.push("CP00-179 must not acquire runtime locks");
  if (MATTER_CORE_CP179_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-179 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP179_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-179 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      MATTER_CORE_CP179_PACK_BINDING.pack_id,
      MATTER_CORE_CP180_PACK_BINDING.pack_id,
      MATTER_CORE_CP181_PACK_BINDING.pack_id,
      MATTER_CORE_CP182_PACK_BINDING.pack_id,
      MATTER_CORE_CP183_PACK_BINDING.pack_id,
      MATTER_CORE_CP184_PACK_BINDING.pack_id,
      MATTER_CORE_CP185_PACK_BINDING.pack_id,
      MATTER_CORE_CP186_PACK_BINDING.pack_id,
      MATTER_CORE_CP187_PACK_BINDING.pack_id,
      MATTER_CORE_CP188_PACK_BINDING.pack_id,
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-179 contract current_pack drift");
  }
  if (contractProjection?.service_boundary?.pack_id && contractProjection.service_boundary.pack_id !== MATTER_CORE_CP178_PACK_BINDING.pack_id) {
    errors.push("CP00-179 must keep CP00-178 service boundary as the source boundary");
  }
  if (contractProjection?.no_write_attestation?.implements_loop_engine !== false) errors.push("CP00-179 must not implement Loop engine");

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      service_source_pack_id: requirements.source_service_pack_id,
      required_outcomes: requirements.required_outcomes,
      required_negative_claims: requirements.required_negative_claims,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP179_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP179_PACK_BINDING,
    MATTER_CORE_CP179_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp179HermesEvidencePacket(planPack, contractProjection = {}) {
  const coverage = validateMatterCoreCp179Coverage(planPack);
  const serviceEvidence = validateMatterCoreCp179ServiceEvidence(contractProjection);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-179.matter_core_service_tail_evidence_review_bridge",
      gate: MATTER_CORE_CP179_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      service_evidence_valid: serviceEvidence.valid,
      service_source_pack_id: serviceEvidence.service_source_pack_id,
      required_outcomes: serviceEvidence.required_outcomes,
      required_negative_claims: serviceEvidence.required_negative_claims,
      hardened_review_sequence: serviceEvidence.hardened_review_sequence,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP179_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP179_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && serviceEvidence.valid,
    },
    MATTER_CORE_CP179_PACK_BINDING,
    MATTER_CORE_CP179_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp179ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp179Coverage(planPack);
  const serviceEvidence = validateMatterCoreCp179ServiceEvidence();
  return freezeResult(
    {
      review_packet: "C05.CP00-179.matter_core_service_tail_evidence_review_bridge",
      gate: MATTER_CORE_CP179_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP179_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      service_evidence_valid: serviceEvidence.valid,
      service_source_pack_id: serviceEvidence.service_source_pack_id,
      review_sequence: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-179 prove the CP00-178 Matter service boundary with golden outcomes without changing it into runtime persistence?",
        "Are happy path, review required, approval required, blocked, denied, idempotency, lock, rollback, retry, and safe error evidence covered?",
        "Does the pack-level Claude review evidence use the hardened baseline/readiness/run/normalize/receipt validation sequence?",
        "Does CP00-179 avoid treating Claude as final approval or claiming enterprise trust from local validation alone?",
        "Does CP00-179 hand off to CP00-180 / RP05.P02.M09.S03 without moving CitationLedger or Loop implementation early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP179_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP179_PACK_BINDING,
    MATTER_CORE_CP179_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp179CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-179-to-CP00-180",
      from_pack_id: MATTER_CORE_CP179_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP179_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP179_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP179_PACK_BINDING.range,
      open_scope: "Continue RP05.P02.M09.S03-RP05.P02.M09.S12 sensitive service review evidence tail in CP00-180 Risk A.",
      production_ready_flag: MATTER_CORE_CP179_PACK_BINDING.production_ready_flag,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP179_PACK_BINDING,
    MATTER_CORE_CP179_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp180CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      sensitive_prechecks: MATTER_CORE_CP180_SENSITIVE_SERVICE_BOUNDARY_REQUIREMENTS.sensitive_prechecks,
      required_failure_claims: MATTER_CORE_CP180_SENSITIVE_SERVICE_BOUNDARY_REQUIREMENTS.required_failure_claims,
    },
    MATTER_CORE_CP180_PACK_BINDING,
    MATTER_CORE_CP180_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp180Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-180 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP180_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-180");
  if (planPack?.risk_class !== MATTER_CORE_CP180_PACK_BINDING.risk_class) errors.push("CP00-180 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP180_PACK_BINDING.unit_count) errors.push("CP00-180 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP180_PACK_BINDING.first_unit_id) errors.push("CP00-180 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP180_PACK_BINDING.last_unit_id) errors.push("CP00-180 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-180 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-180 must only include RP05 units");

  const summary = createMatterCoreCp180CoverageSummary(planPack);
  const expectedDeliverables = {
    implementation: 6,
    security_audit: 2,
    ui: 2,
  };
  for (const [deliverable, count] of Object.entries(expectedDeliverables)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-180 ${deliverable} distribution drift`);
  }
  if (summary.by_phase["RP05.P02"] !== 10) errors.push("CP00-180 RP05.P02 distribution drift");
  if (summary.by_micro_phase["RP05.P02.M09"] !== 10) errors.push("CP00-180 RP05.P02.M09 distribution drift");

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP180_PACK_BINDING,
    MATTER_CORE_CP180_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp180SensitiveBoundary(contractProjection = {}) {
  const errors = [];
  const requirements = MATTER_CORE_CP180_SENSITIVE_SERVICE_BOUNDARY_REQUIREMENTS;
  if (requirements.source_service_pack_id !== MATTER_CORE_CP178_PACK_BINDING.pack_id) {
    errors.push("CP00-180 must derive sensitive boundary evidence from CP00-178 service pack");
  }
  if (requirements.upstream_evidence_pack_id !== MATTER_CORE_CP179_PACK_BINDING.pack_id) {
    errors.push("CP00-180 upstream evidence pack drift");
  }
  for (const precheck of requirements.sensitive_prechecks) {
    if (!MATTER_CORE_SERVICE_BOUNDARY.prechecks.includes(precheck)) errors.push(`CP00-180 missing sensitive precheck ${precheck}`);
  }
  for (const claim of requirements.required_failure_claims) {
    if (!MATTER_CORE_SERVICE_BOUNDARY.customer_safe_error_codes[claim]) errors.push(`CP00-180 missing safe error code for ${claim}`);
  }
  for (const operation of requirements.required_success_paths) {
    if (!MATTER_CORE_SERVICE_BOUNDARY.supported_operations.includes(operation)) errors.push(`CP00-180 missing success path ${operation}`);
  }
  if (MATTER_CORE_CP180_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-180 must not write product state");
  if (MATTER_CORE_CP180_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-180 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP180_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-180 must not write audit events");
  if (MATTER_CORE_CP180_NO_WRITE_ATTESTATION.acquires_runtime_lock !== false) errors.push("CP00-180 must not acquire runtime locks");
  if (MATTER_CORE_CP180_NO_WRITE_ATTESTATION.executes_retry !== false) errors.push("CP00-180 must not execute retries");
  if (MATTER_CORE_CP180_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-180 must not implement Loop engine");
  if (MATTER_CORE_CP180_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-180 must not promote Claude to final approval");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      MATTER_CORE_CP180_PACK_BINDING.pack_id,
      MATTER_CORE_CP181_PACK_BINDING.pack_id,
      MATTER_CORE_CP182_PACK_BINDING.pack_id,
      MATTER_CORE_CP183_PACK_BINDING.pack_id,
      MATTER_CORE_CP184_PACK_BINDING.pack_id,
      MATTER_CORE_CP185_PACK_BINDING.pack_id,
      MATTER_CORE_CP186_PACK_BINDING.pack_id,
      MATTER_CORE_CP186_PACK_BINDING.pack_id,
      MATTER_CORE_CP187_PACK_BINDING.pack_id,
      MATTER_CORE_CP188_PACK_BINDING.pack_id,
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-180 contract current_pack drift");
  }
  if (contractProjection?.service_boundary?.pack_id && contractProjection.service_boundary.pack_id !== MATTER_CORE_CP178_PACK_BINDING.pack_id) {
    errors.push("CP00-180 must keep CP00-178 service boundary as the source boundary");
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      service_source_pack_id: requirements.source_service_pack_id,
      upstream_evidence_pack_id: requirements.upstream_evidence_pack_id,
      sensitive_prechecks: requirements.sensitive_prechecks,
      required_failure_claims: requirements.required_failure_claims,
      required_success_paths: requirements.required_success_paths,
      required_safe_boundaries: requirements.required_safe_boundaries,
      no_write_attestation: MATTER_CORE_CP180_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP180_PACK_BINDING,
    MATTER_CORE_CP180_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp180HermesEvidencePacket(planPack, contractProjection = {}) {
  const coverage = validateMatterCoreCp180Coverage(planPack);
  const sensitiveBoundary = validateMatterCoreCp180SensitiveBoundary(contractProjection);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-180.matter_core_sensitive_service_precheck_boundary",
      gate: MATTER_CORE_CP180_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      sensitive_boundary_valid: sensitiveBoundary.valid,
      service_source_pack_id: sensitiveBoundary.service_source_pack_id,
      sensitive_prechecks: sensitiveBoundary.sensitive_prechecks,
      required_failure_claims: sensitiveBoundary.required_failure_claims,
      required_success_paths: sensitiveBoundary.required_success_paths,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP180_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP180_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && sensitiveBoundary.valid,
    },
    MATTER_CORE_CP180_PACK_BINDING,
    MATTER_CORE_CP180_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp180ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp180Coverage(planPack);
  const sensitiveBoundary = validateMatterCoreCp180SensitiveBoundary();
  return freezeResult(
    {
      review_packet: "C05.CP00-180.matter_core_sensitive_service_precheck_boundary",
      gate: MATTER_CORE_CP180_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP180_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      sensitive_boundary_valid: sensitiveBoundary.valid,
      service_source_pack_id: sensitiveBoundary.service_source_pack_id,
      questions: Object.freeze([
        "Does CP00-180 keep tenant, Matter trace, permission, audit, idempotency, lock, and persistence checks descriptor-only and fail-closed?",
        "Are customer-safe error codes available for all sensitive failure claims without leaking unauthorized data?",
        "Do primary and secondary workflow success paths remain synthetic and no-write?",
        "Does CP00-180 preserve Claude as a read-only reviewer and avoid enterprise trust claims from local validation?",
        "Does CP00-180 hand off to CP00-181 / RP05.P02.M09.S13 without moving CitationLedger or Loop implementation early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP180_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP180_PACK_BINDING,
    MATTER_CORE_CP180_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp180CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-180-to-CP00-181",
      from_pack_id: MATTER_CORE_CP180_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP180_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP180_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP180_PACK_BINDING.range,
      open_scope: "Continue RP05.P02.M09.S13 onward validation mapping, review/approval routing, rollback/retry, tests, and API/interface bridge in CP00-181 Risk C.",
      production_ready_flag: MATTER_CORE_CP180_PACK_BINDING.production_ready_flag,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
      upstream_evidence_pack_id: MATTER_CORE_CP179_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP180_PACK_BINDING,
    MATTER_CORE_CP180_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp181CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      public_exports: MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS.public_exports,
      ui_surface_inventory: MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS.ui_surface_inventory,
    },
    MATTER_CORE_CP181_PACK_BINDING,
    MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp181Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-181 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP181_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-181");
  if (planPack?.risk_class !== MATTER_CORE_CP181_PACK_BINDING.risk_class) errors.push("CP00-181 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP181_PACK_BINDING.unit_count) errors.push("CP00-181 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP181_PACK_BINDING.first_unit_id) errors.push("CP00-181 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP181_PACK_BINDING.last_unit_id) errors.push("CP00-181 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-181 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-181 must only include RP05 units");

  const summary = createMatterCoreCp181CoverageSummary(planPack);
  const expectedDeliverables = {
    implementation: 57,
    claude_review: 6,
    ui: 17,
    failure_recovery: 2,
    test: 12,
    contract: 35,
    security_audit: 18,
    hermes_evidence: 3,
  };
  for (const [deliverable, count] of Object.entries(expectedDeliverables)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-181 ${deliverable} distribution drift`);
  }
  const expectedPhases = {
    "RP05.P02": 19,
    "RP05.P03": 112,
    "RP05.P04": 19,
  };
  for (const [phase, count] of Object.entries(expectedPhases)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-181 ${phase} distribution drift`);
  }
  const expectedMicro = {
    "RP05.P02.M09": 8,
    "RP05.P02.M10": 11,
    "RP05.P03.M00": 3,
    "RP05.P03.M01": 3,
    "RP05.P03.M02": 8,
    "RP05.P03.M03": 20,
    "RP05.P03.M04": 11,
    "RP05.P03.M05": 20,
    "RP05.P03.M06": 8,
    "RP05.P03.M07": 20,
    "RP05.P03.M08": 8,
    "RP05.P03.M09": 8,
    "RP05.P03.M10": 3,
    "RP05.P04.M00": 4,
    "RP05.P04.M01": 8,
    "RP05.P04.M02": 7,
  };
  for (const [microPhase, count] of Object.entries(expectedMicro)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-181 ${microPhase} distribution drift`);
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP181_PACK_BINDING,
    MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp181ApiInterface(contractProjection = {}) {
  const errors = [];
  const requirements = MATTER_CORE_CP181_API_INTERFACE_REQUIREMENTS;
  if (requirements.source_service_pack_id !== MATTER_CORE_CP178_PACK_BINDING.pack_id) {
    errors.push("CP00-181 must derive API interface from CP00-178 service boundary");
  }
  if (requirements.upstream_sensitive_boundary_pack_id !== MATTER_CORE_CP180_PACK_BINDING.pack_id) {
    errors.push("CP00-181 upstream sensitive boundary drift");
  }
  for (const field of ["request_id", "tenant_id", "operation", "permission_ref", "audit_hint_ref", "payload"]) {
    if (!requirements.request_contract_fields.includes(field)) errors.push(`CP00-181 request contract missing ${field}`);
  }
  for (const field of ["outcome", "status_code", "descriptor_ref", "customer_safe_error_codes", "ui_state"]) {
    if (!requirements.response_contract_fields.includes(field)) errors.push(`CP00-181 response contract missing ${field}`);
  }
  for (const claim of requirements.required_error_claims) {
    if (!MATTER_CORE_SERVICE_BOUNDARY.customer_safe_error_codes[claim]) errors.push(`CP00-181 missing safe error code for ${claim}`);
  }
  for (const guard of ["no_raw_payload", "customer_safe_error_codes_only", "descriptor_ref_instead_of_full_record"]) {
    if (!requirements.serialization_guards.includes(guard)) errors.push(`CP00-181 missing serialization guard ${guard}`);
  }
  if (MATTER_CORE_CP181_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-181 must not implement Loop engine");
  if (MATTER_CORE_CP181_NO_WRITE_ATTESTATION.exposes_raw_payload !== false) errors.push("CP00-181 must not expose raw payload");
  if (MATTER_CORE_CP181_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-181 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP181_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-181 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id &&
    ![
      MATTER_CORE_CP181_PACK_BINDING.pack_id,
      MATTER_CORE_CP182_PACK_BINDING.pack_id,
      MATTER_CORE_CP183_PACK_BINDING.pack_id,
      MATTER_CORE_CP184_PACK_BINDING.pack_id,
      MATTER_CORE_CP185_PACK_BINDING.pack_id,
      MATTER_CORE_CP186_PACK_BINDING.pack_id,
      MATTER_CORE_CP187_PACK_BINDING.pack_id,
      MATTER_CORE_CP188_PACK_BINDING.pack_id,
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-181 contract current_pack drift");
  }
  if (contractProjection?.service_boundary?.pack_id && contractProjection.service_boundary.pack_id !== MATTER_CORE_CP178_PACK_BINDING.pack_id) {
    errors.push("CP00-181 must keep CP00-178 service boundary as the source boundary");
  }
  if (contractProjection?.no_write_attestation?.implements_loop_engine !== false) errors.push("CP00-181 must not implement Loop engine");

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_service_pack_id: requirements.source_service_pack_id,
      upstream_sensitive_boundary_pack_id: requirements.upstream_sensitive_boundary_pack_id,
      public_exports: requirements.public_exports,
      request_contract_fields: requirements.request_contract_fields,
      response_contract_fields: requirements.response_contract_fields,
      serialization_guards: requirements.serialization_guards,
      ui_states: requirements.ui_states,
      ui_surface_inventory: requirements.ui_surface_inventory,
      no_write_attestation: MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP181_PACK_BINDING,
    MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp181HermesEvidencePacket(planPack, contractProjection = {}) {
  const coverage = validateMatterCoreCp181Coverage(planPack);
  const apiInterface = validateMatterCoreCp181ApiInterface(contractProjection);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-181.matter_core_api_interface_ui_state_bridge",
      gate: MATTER_CORE_CP181_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      api_interface_valid: apiInterface.valid,
      service_source_pack_id: apiInterface.source_service_pack_id,
      request_contract_fields: apiInterface.request_contract_fields,
      response_contract_fields: apiInterface.response_contract_fields,
      serialization_guards: apiInterface.serialization_guards,
      ui_states: apiInterface.ui_states,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP181_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && apiInterface.valid,
    },
    MATTER_CORE_CP181_PACK_BINDING,
    MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp181ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp181Coverage(planPack);
  const apiInterface = validateMatterCoreCp181ApiInterface();
  return freezeResult(
    {
      review_packet: "C05.CP00-181.matter_core_api_interface_ui_state_bridge",
      gate: MATTER_CORE_CP181_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP181_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      api_interface_valid: apiInterface.valid,
      service_source_pack_id: apiInterface.source_service_pack_id,
      questions: Object.freeze([
        "Does CP00-181 expose only descriptor API/interface contracts without executing API handlers or persistence?",
        "Are validation error mapping, review-required routing, approval-required routing, blocked claims, rollback, and retry behavior represented as safe response descriptors?",
        "Do UI states cover loading, empty, denied, review-required, approval-required, and ready surfaces without exposing raw payload or client-visible wiki output?",
        "Does CP00-181 bind all 150 planned units and avoid arbitrary one-unit closeout behavior?",
        "Does CP00-181 hand off to CP00-182 / RP05.P04.M02.S08 without moving CitationLedger or Loop implementation early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP181_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP181_PACK_BINDING,
    MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp181CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-181-to-CP00-182",
      from_pack_id: MATTER_CORE_CP181_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP181_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP181_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP181_PACK_BINDING.range,
      open_scope: "Continue RP05.P04.M02.S08 onward UI secondary interaction, build smoke, and interface workflow implementation in CP00-182 without runtime persistence or Loop execution.",
      production_ready_flag: MATTER_CORE_CP181_PACK_BINDING.production_ready_flag,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
      upstream_sensitive_boundary_pack_id: MATTER_CORE_CP180_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP181_PACK_BINDING,
    MATTER_CORE_CP181_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp182CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      required_states: MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS.required_states,
      required_display_guards: MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS.required_display_guards,
    },
    MATTER_CORE_CP182_PACK_BINDING,
    MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp182Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-182 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP182_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-182");
  if (planPack?.risk_class !== MATTER_CORE_CP182_PACK_BINDING.risk_class) errors.push("CP00-182 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP182_PACK_BINDING.unit_count) errors.push("CP00-182 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP182_PACK_BINDING.first_unit_id) errors.push("CP00-182 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP182_PACK_BINDING.last_unit_id) errors.push("CP00-182 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-182 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-182 must only include RP05 units");

  const summary = createMatterCoreCp182CoverageSummary(planPack);
  const expectedDeliverables = {
    ui: 18,
    implementation: 10,
    claude_review: 3,
    security_audit: 4,
    fixture: 2,
    test: 2,
    hermes_evidence: 1,
  };
  for (const [deliverable, count] of Object.entries(expectedDeliverables)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-182 ${deliverable} distribution drift`);
  }
  if (summary.by_phase["RP05.P04"] !== 40) errors.push("CP00-182 RP05.P04 distribution drift");
  const expectedMicro = {
    "RP05.P04.M02": 1,
    "RP05.P04.M03": 22,
    "RP05.P04.M04": 17,
  };
  for (const [microPhase, count] of Object.entries(expectedMicro)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-182 ${microPhase} distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP182_PACK_BINDING,
    MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp182UiWorkflow(contractProjection = {}) {
  const errors = [];
  const requirements = MATTER_CORE_CP182_UI_WORKFLOW_REQUIREMENTS;
  if (requirements.source_api_interface_pack_id !== MATTER_CORE_CP181_PACK_BINDING.pack_id) {
    errors.push("CP00-182 must derive UI workflow from CP00-181 API interface");
  }
  if (requirements.source_service_pack_id !== MATTER_CORE_CP178_PACK_BINDING.pack_id) {
    errors.push("CP00-182 must keep CP00-178 as the source service boundary");
  }
  for (const state of ["loading", "empty", "denied", "review_required", "approval_required", "ready"]) {
    if (!requirements.required_states.includes(state)) errors.push(`CP00-182 missing UI state ${state}`);
  }
  for (const interaction of [
    "open_descriptor_preview",
    "open_review_queue_descriptor",
    "open_approval_route_descriptor",
    "refresh_descriptor_without_mutation",
    "show_safe_error_summary",
  ]) {
    if (!requirements.required_interactions.includes(interaction)) errors.push(`CP00-182 missing interaction ${interaction}`);
  }
  for (const guard of [
    "permission_badge_ref_only",
    "audit_hint_ref_only",
    "customer_safe_error_copy",
    "desktop_layout_descriptor",
    "mobile_layout_descriptor",
    "keyboard_focus_order",
    "visual_density_descriptor",
    "synthetic_fixture_binding",
    "build_smoke_descriptor",
    "no_unauthorized_count_leak",
  ]) {
    if (!requirements.required_display_guards.includes(guard)) errors.push(`CP00-182 missing display guard ${guard}`);
  }
  for (const code of Object.values(MATTER_CORE_SERVICE_BOUNDARY.customer_safe_error_codes)) {
    if (!requirements.safe_error_copy[code]) errors.push(`CP00-182 missing safe error copy ${code}`);
  }
  if (MATTER_CORE_CP182_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-182 must not render live DOM");
  if (MATTER_CORE_CP182_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-182 must not execute API handlers");
  if (MATTER_CORE_CP182_NO_WRITE_ATTESTATION.leaks_unauthorized_counts !== false) errors.push("CP00-182 must not leak unauthorized counts");
  if (MATTER_CORE_CP182_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-182 must not implement Loop engine");
  if (MATTER_CORE_CP182_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-182 must not promote Claude to final approval");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP182_PACK_BINDING.pack_id,
      MATTER_CORE_CP183_PACK_BINDING.pack_id,
      MATTER_CORE_CP184_PACK_BINDING.pack_id,
      MATTER_CORE_CP185_PACK_BINDING.pack_id,
      MATTER_CORE_CP186_PACK_BINDING.pack_id,
      MATTER_CORE_CP187_PACK_BINDING.pack_id,
      MATTER_CORE_CP188_PACK_BINDING.pack_id,
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-182 contract current_pack drift");
  }
  if (contractProjection?.api_interface_ui_state_bridge?.pack_id && contractProjection.api_interface_ui_state_bridge.pack_id !== MATTER_CORE_CP181_PACK_BINDING.pack_id) {
    errors.push("CP00-182 must keep CP00-181 API bridge as source");
  }
  if (contractProjection?.no_write_attestation?.implements_loop_engine !== false) errors.push("CP00-182 must not implement Loop engine");

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_api_interface_pack_id: requirements.source_api_interface_pack_id,
      source_service_pack_id: requirements.source_service_pack_id,
      required_surfaces: requirements.required_surfaces,
      required_states: requirements.required_states,
      required_interactions: requirements.required_interactions,
      required_display_guards: requirements.required_display_guards,
      safe_error_copy: requirements.safe_error_copy,
      no_write_attestation: MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP182_PACK_BINDING,
    MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp182HermesEvidencePacket(planPack, contractProjection = {}) {
  const coverage = validateMatterCoreCp182Coverage(planPack);
  const uiWorkflow = validateMatterCoreCp182UiWorkflow(contractProjection);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-182.matter_core_ui_interaction_workflow_descriptor",
      gate: MATTER_CORE_CP182_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      ui_workflow_valid: uiWorkflow.valid,
      source_api_interface_pack_id: uiWorkflow.source_api_interface_pack_id,
      required_states: uiWorkflow.required_states,
      required_display_guards: uiWorkflow.required_display_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP182_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && uiWorkflow.valid,
    },
    MATTER_CORE_CP182_PACK_BINDING,
    MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp182ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp182Coverage(planPack);
  const uiWorkflow = validateMatterCoreCp182UiWorkflow();
  return freezeResult(
    {
      review_packet: "C05.CP00-182.matter_core_ui_interaction_workflow_descriptor",
      gate: MATTER_CORE_CP182_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP182_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      ui_workflow_valid: uiWorkflow.valid,
      source_api_interface_pack_id: uiWorkflow.source_api_interface_pack_id,
      questions: Object.freeze([
        "Does CP00-182 keep UI workflow output descriptor-only without live DOM render, API handler execution, persistence, or audit writes?",
        "Are loading, empty, denied, review-required, approval-required, ready, primary, and secondary interaction states represented?",
        "Are permission badge, audit hint, safe error copy, responsive layout, keyboard focus, visual density, fixture binding, and build smoke descriptors customer-safe?",
        "Does CP00-182 avoid unauthorized count leaks and raw payload exposure?",
        "Does CP00-182 hand off to CP00-183 / RP05.P04.M04.S18 without moving CitationLedger or Loop implementation early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP182_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP182_PACK_BINDING,
    MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp182CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-182-to-CP00-183",
      from_pack_id: MATTER_CORE_CP182_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP182_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP182_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP182_PACK_BINDING.range,
      open_scope: "Continue RP05.P04.M04.S18 onward Hermes UI evidence and synthetic fixture set without runtime persistence, live DOM rendering, or Loop execution.",
      production_ready_flag: MATTER_CORE_CP182_PACK_BINDING.production_ready_flag,
      source_api_interface_pack_id: MATTER_CORE_CP181_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP182_PACK_BINDING,
    MATTER_CORE_CP182_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp183CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      required_evidence_sections: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_evidence_sections,
      required_permission_audit_binding: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_permission_audit_binding,
      required_fixture_surfaces: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_fixture_surfaces,
      required_fixture_states: MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS.required_fixture_states,
    },
    MATTER_CORE_CP183_PACK_BINDING,
    MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp183Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-183 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP183_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-183");
  if (planPack?.risk_class !== MATTER_CORE_CP183_PACK_BINDING.risk_class) errors.push("CP00-183 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP183_PACK_BINDING.unit_count) errors.push("CP00-183 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP183_PACK_BINDING.first_unit_id) errors.push("CP00-183 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP183_PACK_BINDING.last_unit_id) errors.push("CP00-183 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-183 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-183 must only include RP05 units");

  const summary = createMatterCoreCp183CoverageSummary(planPack);
  const expectedDeliverables = {
    hermes_evidence: 2,
    claude_review: 4,
    implementation: 11,
    ui: 17,
    security_audit: 4,
    fixture: 1,
    test: 1,
  };
  for (const [deliverable, count] of Object.entries(expectedDeliverables)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-183 ${deliverable} distribution drift`);
  }
  if (summary.by_phase["RP05.P04"] !== 40) errors.push("CP00-183 RP05.P04 distribution drift");
  const expectedMicro = {
    "RP05.P04.M04": 3,
    "RP05.P04.M05": 22,
    "RP05.P04.M06": 15,
  };
  for (const [microPhase, count] of Object.entries(expectedMicro)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-183 ${microPhase} distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP183_PACK_BINDING,
    MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp183UiEvidencePermissionFixture(contractProjection = {}) {
  const errors = [];
  const requirements = MATTER_CORE_CP183_UI_EVIDENCE_REQUIREMENTS;
  if (requirements.source_ui_workflow_pack_id !== MATTER_CORE_CP182_PACK_BINDING.pack_id) {
    errors.push("CP00-183 must derive UI evidence from CP00-182 UI workflow");
  }
  if (requirements.source_api_interface_pack_id !== MATTER_CORE_CP181_PACK_BINDING.pack_id) {
    errors.push("CP00-183 must keep CP00-181 API interface as the API source");
  }
  for (const section of [
    "hermes_ui_evidence",
    "claude_ui_leak_prompt",
    "closeout_handoff",
    "permission_audit_binding",
    "synthetic_fixture_set",
  ]) {
    if (!requirements.required_evidence_sections.includes(section)) errors.push(`CP00-183 missing evidence section ${section}`);
  }
  for (const guard of [
    "permission_badge_ref_only",
    "audit_hint_ref_only",
    "safe_error_copy",
    "review_required_state",
    "denied_state",
    "no_permission_decision_detail_leak",
    "no_audit_event_body_leak",
    "no_unauthorized_count_leak",
  ]) {
    if (!requirements.required_permission_audit_binding.includes(guard)) errors.push(`CP00-183 missing permission/audit guard ${guard}`);
  }
  for (const surface of [
    "matter_opening_panel",
    "matter_member_assignment_panel",
    "matter_task_planning_panel",
    "matter_wiki_section_review_panel",
    "matter_graph_relationship_review_panel",
  ]) {
    if (!requirements.required_fixture_surfaces.includes(surface)) errors.push(`CP00-183 missing fixture surface ${surface}`);
  }
  for (const state of ["loading", "empty", "denied", "review_required", "approval_required", "ready"]) {
    if (!requirements.required_fixture_states.includes(state)) errors.push(`CP00-183 missing fixture state ${state}`);
  }
  for (const check of [
    "no_raw_payload",
    "no_permission_decision_detail",
    "no_audit_event_body",
    "no_unauthorized_count",
    "no_client_visible_wiki_output",
    "claude_not_final_approval",
  ]) {
    if (!requirements.leak_prompt_checks.includes(check)) errors.push(`CP00-183 missing leak prompt check ${check}`);
  }
  for (const check of [
    "synthetic_fixture_binding",
    "build_smoke_descriptor",
    "permission_badge_ref_only",
    "audit_hint_ref_only",
    "state_snapshot_without_unauthorized_count",
  ]) {
    if (!requirements.hermes_evidence_checks.includes(check)) errors.push(`CP00-183 missing Hermes evidence check ${check}`);
  }
  if (MATTER_CORE_CP183_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-183 must not render live DOM");
  if (MATTER_CORE_CP183_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-183 must not execute API handlers");
  if (MATTER_CORE_CP183_NO_WRITE_ATTESTATION.leaks_unauthorized_counts !== false) errors.push("CP00-183 must not leak unauthorized counts");
  if (MATTER_CORE_CP183_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-183 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP183_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-183 must not leak audit event body");
  if (MATTER_CORE_CP183_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-183 must not implement Loop engine");
  if (MATTER_CORE_CP183_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-183 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP183_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-183 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP183_PACK_BINDING.pack_id,
      MATTER_CORE_CP184_PACK_BINDING.pack_id,
      MATTER_CORE_CP185_PACK_BINDING.pack_id,
      MATTER_CORE_CP186_PACK_BINDING.pack_id,
      MATTER_CORE_CP187_PACK_BINDING.pack_id,
      MATTER_CORE_CP188_PACK_BINDING.pack_id,
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-183 contract current_pack drift");
  }
  if (contractProjection?.ui_evidence_permission_fixture?.pack_id && contractProjection.ui_evidence_permission_fixture.pack_id !== MATTER_CORE_CP183_PACK_BINDING.pack_id) {
    errors.push("CP00-183 contract UI evidence section drift");
  }
  if (contractProjection?.ui_interaction_workflow?.pack_id && contractProjection.ui_interaction_workflow.pack_id !== MATTER_CORE_CP182_PACK_BINDING.pack_id) {
    errors.push("CP00-183 must keep CP00-182 UI workflow as source");
  }
  if (
    contractProjection?.no_write_attestation
    && contractProjection.no_write_attestation.implements_loop_engine !== false
  ) {
    errors.push("CP00-183 must not implement Loop engine");
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_ui_workflow_pack_id: requirements.source_ui_workflow_pack_id,
      source_api_interface_pack_id: requirements.source_api_interface_pack_id,
      required_evidence_sections: requirements.required_evidence_sections,
      required_permission_audit_binding: requirements.required_permission_audit_binding,
      required_fixture_surfaces: requirements.required_fixture_surfaces,
      required_fixture_states: requirements.required_fixture_states,
      leak_prompt_checks: requirements.leak_prompt_checks,
      hermes_evidence_checks: requirements.hermes_evidence_checks,
      no_write_attestation: MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP183_PACK_BINDING,
    MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp183HermesEvidencePacket(planPack, contractProjection = {}) {
  const coverage = validateMatterCoreCp183Coverage(planPack);
  const uiEvidence = validateMatterCoreCp183UiEvidencePermissionFixture(contractProjection);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-183.matter_core_ui_evidence_permission_fixture",
      gate: MATTER_CORE_CP183_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      ui_evidence_valid: uiEvidence.valid,
      source_ui_workflow_pack_id: uiEvidence.source_ui_workflow_pack_id,
      required_evidence_sections: uiEvidence.required_evidence_sections,
      required_permission_audit_binding: uiEvidence.required_permission_audit_binding,
      required_fixture_surfaces: uiEvidence.required_fixture_surfaces,
      required_fixture_states: uiEvidence.required_fixture_states,
      leak_prompt_checks: uiEvidence.leak_prompt_checks,
      hermes_evidence_checks: uiEvidence.hermes_evidence_checks,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP183_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && uiEvidence.valid,
    },
    MATTER_CORE_CP183_PACK_BINDING,
    MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp183ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp183Coverage(planPack);
  const uiEvidence = validateMatterCoreCp183UiEvidencePermissionFixture();
  return freezeResult(
    {
      review_packet: "C05.CP00-183.matter_core_ui_evidence_permission_fixture",
      gate: MATTER_CORE_CP183_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP183_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      ui_evidence_valid: uiEvidence.valid,
      source_ui_workflow_pack_id: uiEvidence.source_ui_workflow_pack_id,
      questions: Object.freeze([
        "Does CP00-183 prove Hermes UI evidence, Claude leak prompts, closeout handoff, permission/audit binding, and synthetic fixture set coverage for all included units?",
        "Are permission badges and audit hints reference-only without decision detail or audit event body exposure?",
        "Do synthetic fixtures cover all required surfaces and states without raw payloads, unauthorized counts, live DOM rendering, or API handler execution?",
        "Does CP00-183 preserve Claude as a read-only reviewer and avoid enterprise trust claims from local validation?",
        "Does CP00-183 hand off to CP00-184 / RP05.P04.M06.S16 without moving CitationLedger or Loop implementation early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP183_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP183_PACK_BINDING,
    MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp183CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-183-to-CP00-184",
      from_pack_id: MATTER_CORE_CP183_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP183_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP183_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP183_PACK_BINDING.range,
      open_scope: "Continue RP05.P04.M06.S16 onward synthetic fixture binding and Matter Core UI evidence tail in CP00-184 without runtime persistence, live DOM rendering, or Loop execution.",
      production_ready_flag: MATTER_CORE_CP183_PACK_BINDING.production_ready_flag,
      source_ui_workflow_pack_id: MATTER_CORE_CP182_PACK_BINDING.pack_id,
      source_api_interface_pack_id: MATTER_CORE_CP181_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP183_PACK_BINDING,
    MATTER_CORE_CP183_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp184CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      terminal_micro_phases: MATTER_CORE_CP184_FIXTURE_EVIDENCE_TERMINAL_REQUIREMENTS.rp05_p04_terminal_micro_phases,
      p05_entry_micro_phases: MATTER_CORE_CP184_FIXTURE_EVIDENCE_TERMINAL_REQUIREMENTS.rp05_p05_entry_micro_phases,
    },
    MATTER_CORE_CP184_PACK_BINDING,
    MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp184Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-184 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP184_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-184");
  if (planPack?.risk_class !== MATTER_CORE_CP184_PACK_BINDING.risk_class) errors.push("CP00-184 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP184_PACK_BINDING.unit_count) errors.push("CP00-184 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP184_PACK_BINDING.first_unit_id) errors.push("CP00-184 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP184_PACK_BINDING.last_unit_id) errors.push("CP00-184 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-184 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-184 must only include RP05 units");

  const summary = createMatterCoreCp184CoverageSummary(planPack);
  const expectedDeliverables = {
    fixture: 40,
    test: 10,
    hermes_evidence: 6,
    claude_review: 13,
    implementation: 38,
    ui: 31,
    security_audit: 12,
  };
  for (const [deliverable, count] of Object.entries(expectedDeliverables)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-184 ${deliverable} distribution drift`);
  }
  if (summary.by_phase["RP05.P04"] !== 75) errors.push("CP00-184 RP05.P04 distribution drift");
  if (summary.by_phase["RP05.P05"] !== 75) errors.push("CP00-184 RP05.P05 distribution drift");
  const expectedMicro = {
    "RP05.P04.M06": 5,
    "RP05.P04.M07": 22,
    "RP05.P04.M08": 20,
    "RP05.P04.M09": 20,
    "RP05.P04.M10": 8,
    "RP05.P05.M00": 4,
    "RP05.P05.M01": 8,
    "RP05.P05.M02": 8,
    "RP05.P05.M03": 22,
    "RP05.P05.M04": 20,
    "RP05.P05.M05": 13,
  };
  for (const [microPhase, count] of Object.entries(expectedMicro)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-184 ${microPhase} distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP184_PACK_BINDING,
    MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp184FixtureEvidenceTerminal(contractProjection = {}) {
  const errors = [];
  const requirements = MATTER_CORE_CP184_FIXTURE_EVIDENCE_TERMINAL_REQUIREMENTS;
  if (requirements.source_ui_evidence_pack_id !== MATTER_CORE_CP183_PACK_BINDING.pack_id) {
    errors.push("CP00-184 must derive fixture terminal evidence from CP00-183 UI evidence");
  }
  if (requirements.source_ui_workflow_pack_id !== MATTER_CORE_CP182_PACK_BINDING.pack_id) {
    errors.push("CP00-184 must keep CP00-182 UI workflow as the UI workflow source");
  }
  if (requirements.source_service_pack_id !== MATTER_CORE_CP178_PACK_BINDING.pack_id) {
    errors.push("CP00-184 must keep CP00-178 service boundary as the source service");
  }
  for (const section of [
    "synthetic_fixture_binding",
    "build_smoke",
    "hermes_ui_evidence",
    "claude_ui_leak_prompt",
    "closeout_handoff",
    "golden_case_set",
    "failure_case_set",
    "p05_permission_audit_entry",
  ]) {
    if (!requirements.required_terminal_sections.includes(section)) errors.push(`CP00-184 missing terminal section ${section}`);
  }
  for (const guard of [
    "no_raw_payload",
    "no_real_document_content",
    "no_permission_decision_detail",
    "no_audit_event_body",
    "no_unauthorized_count",
    "no_client_visible_wiki_output",
  ]) {
    if (!requirements.required_no_leak_guards.includes(guard)) errors.push(`CP00-184 missing no-leak guard ${guard}`);
  }
  for (const surface of [
    "scope_inventory",
    "contract_draft",
    "type_shape_definition",
    "primary_implementation_slice",
    "secondary_workflow_slice",
    "permission_audit_binding",
  ]) {
    if (!requirements.required_p05_entry_surfaces.includes(surface)) errors.push(`CP00-184 missing P05 entry surface ${surface}`);
  }
  for (const caseType of [
    "base_tenant_fixture",
    "base_user_fixture",
    "base_matter_fixture",
    "base_document_fixture",
    "primary_golden_case",
    "secondary_golden_case",
    "review_required_case",
    "denied_case",
    "cross_tenant_case",
    "missing_context_case",
    "audit_hint_case",
    "security_trimming_case",
    "ai_retrieval_or_analytics_case",
    "fixture_manifest",
    "golden_test",
    "failure_test",
    "hermes_fixture_evidence",
    "claude_missing_test_prompt",
    "closeout_handoff",
    "no_real_data_check",
    "stable_id_check",
    "replay_command",
  ]) {
    if (!requirements.required_case_types.includes(caseType)) errors.push(`CP00-184 missing case type ${caseType}`);
  }
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-184 must not write product state");
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) errors.push("CP00-184 must not evaluate runtime permission");
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-184 must not write audit events");
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-184 must not render live DOM");
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-184 must not execute API handlers");
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.leaks_unauthorized_counts !== false) errors.push("CP00-184 must not leak unauthorized counts");
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-184 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-184 must not leak audit event body");
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.uses_real_client_data !== false) errors.push("CP00-184 must not use real client data");
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.uses_real_document_data !== false) errors.push("CP00-184 must not use real document data");
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-184 must not implement Loop engine");
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-184 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP184_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-184 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP184_PACK_BINDING.pack_id,
      MATTER_CORE_CP185_PACK_BINDING.pack_id,
      MATTER_CORE_CP186_PACK_BINDING.pack_id,
      MATTER_CORE_CP187_PACK_BINDING.pack_id,
      MATTER_CORE_CP188_PACK_BINDING.pack_id,
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-184 contract current_pack drift");
  }
  if (
    contractProjection?.fixture_evidence_terminal_entry?.pack_id
    && contractProjection.fixture_evidence_terminal_entry.pack_id !== MATTER_CORE_CP184_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-184 contract fixture evidence section drift");
  }
  if (contractProjection?.ui_evidence_permission_fixture?.pack_id && contractProjection.ui_evidence_permission_fixture.pack_id !== MATTER_CORE_CP183_PACK_BINDING.pack_id) {
    errors.push("CP00-184 must keep CP00-183 UI evidence as source");
  }
  if (
    contractProjection?.no_write_attestation
    && contractProjection.no_write_attestation.implements_loop_engine !== false
  ) {
    errors.push("CP00-184 must not implement Loop engine");
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_ui_evidence_pack_id: requirements.source_ui_evidence_pack_id,
      required_terminal_sections: requirements.required_terminal_sections,
      required_no_leak_guards: requirements.required_no_leak_guards,
      required_p05_entry_surfaces: requirements.required_p05_entry_surfaces,
      required_case_types: requirements.required_case_types,
      no_write_attestation: MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP184_PACK_BINDING,
    MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp184HermesEvidencePacket(planPack, contractProjection = {}) {
  const coverage = validateMatterCoreCp184Coverage(planPack);
  const fixtureEvidence = validateMatterCoreCp184FixtureEvidenceTerminal(contractProjection);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-184.matter_core_fixture_evidence_terminal_entry",
      gate: MATTER_CORE_CP184_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      fixture_evidence_valid: fixtureEvidence.valid,
      source_ui_evidence_pack_id: fixtureEvidence.source_ui_evidence_pack_id,
      required_terminal_sections: fixtureEvidence.required_terminal_sections,
      required_no_leak_guards: fixtureEvidence.required_no_leak_guards,
      required_p05_entry_surfaces: fixtureEvidence.required_p05_entry_surfaces,
      required_case_types: fixtureEvidence.required_case_types,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP184_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && fixtureEvidence.valid,
    },
    MATTER_CORE_CP184_PACK_BINDING,
    MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp184ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp184Coverage(planPack);
  const fixtureEvidence = validateMatterCoreCp184FixtureEvidenceTerminal();
  return freezeResult(
    {
      review_packet: "C05.CP00-184.matter_core_fixture_evidence_terminal_entry",
      gate: MATTER_CORE_CP184_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP184_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      fixture_evidence_valid: fixtureEvidence.valid,
      source_ui_evidence_pack_id: fixtureEvidence.source_ui_evidence_pack_id,
      questions: Object.freeze([
        "Does CP00-184 close the RP05.P04 fixture/evidence terminal units and open the RP05.P05 fixture/test/permission-audit entry without runtime writes?",
        "Do P05 entry cases cover base fixtures, golden cases, review-required, denied, cross-tenant, missing-context, audit-hint, security-trimming, AI retrieval/analytics, no-real-data, stable ID, and replay command rows?",
        "Are raw payloads, real document content, permission decision details, audit event bodies, unauthorized counts, and client-visible wiki output excluded?",
        "Does CP00-184 preserve Claude as a read-only reviewer and avoid enterprise trust claims from local validation?",
        "Does CP00-184 hand off to CP00-185 / RP05.P05.M05.S14 without moving CitationLedger or Loop implementation early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP184_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP184_PACK_BINDING,
    MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp184CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-184-to-CP00-185",
      from_pack_id: MATTER_CORE_CP184_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP184_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP184_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP184_PACK_BINDING.range,
      open_scope: "Continue RP05.P05.M05.S14 onward permission/audit binding tail and fixture validation in CP00-185 without runtime persistence, live DOM rendering, or Loop execution.",
      production_ready_flag: MATTER_CORE_CP184_PACK_BINDING.production_ready_flag,
      source_ui_evidence_pack_id: MATTER_CORE_CP183_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP184_PACK_BINDING,
    MATTER_CORE_CP184_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp185CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const unitTitles = [];
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    unitTitles.push(unit.title);
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      unit_titles: Object.freeze(unitTitles),
      required_units: MATTER_CORE_CP185_PERMISSION_AUDIT_TAIL_REQUIREMENTS.required_units,
    },
    MATTER_CORE_CP185_PACK_BINDING,
    MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp185Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-185 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP185_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-185");
  if (planPack?.risk_class !== MATTER_CORE_CP185_PACK_BINDING.risk_class) errors.push("CP00-185 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP185_PACK_BINDING.unit_count) errors.push("CP00-185 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP185_PACK_BINDING.first_unit_id) errors.push("CP00-185 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP185_PACK_BINDING.last_unit_id) errors.push("CP00-185 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-185 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-185 must only include RP05 units");

  const summary = createMatterCoreCp185CoverageSummary(planPack);
  const expectedDeliverables = {
    fixture: 2,
    test: 3,
    hermes_evidence: 1,
    implementation: 4,
  };
  for (const [deliverable, count] of Object.entries(expectedDeliverables)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-185 ${deliverable} distribution drift`);
  }
  if (summary.by_phase["RP05.P05"] !== 10) errors.push("CP00-185 RP05.P05 distribution drift");
  if (summary.by_micro_phase["RP05.P05.M05"] !== 9) errors.push("CP00-185 RP05.P05.M05 distribution drift");
  if (summary.by_micro_phase["RP05.P05.M06"] !== 1) errors.push("CP00-185 RP05.P05.M06 distribution drift");
  const normalizedTitles = new Set(summary.unit_titles.map((title) => title.toLowerCase().replace(/[^a-z0-9]/g, "")));
  for (const unitKey of MATTER_CORE_CP185_PERMISSION_AUDIT_TAIL_REQUIREMENTS.required_units) {
    const normalizedUnitKey = unitKey.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!normalizedTitles.has(normalizedUnitKey)) errors.push(`CP00-185 missing unit ${unitKey}`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP185_PACK_BINDING,
    MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp185PermissionAuditTail(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP185_PERMISSION_AUDIT_TAIL_REQUIREMENTS;
  if (requirements.source_fixture_evidence_terminal_pack_id !== MATTER_CORE_CP184_PACK_BINDING.pack_id) {
    errors.push("CP00-185 must inherit CP00-184 fixture evidence terminal entry");
  }
  if (requirements.source_ui_evidence_pack_id !== MATTER_CORE_CP183_PACK_BINDING.pack_id) {
    errors.push("CP00-185 must keep CP00-183 UI evidence as source");
  }
  if (requirements.source_sensitive_boundary_pack_id !== MATTER_CORE_CP180_PACK_BINDING.pack_id) {
    errors.push("CP00-185 must keep CP00-180 sensitive boundary as source");
  }
  for (const unitKey of [
    "fixture_manifest",
    "golden_test",
    "failure_test",
    "hermes_fixture_evidence",
    "claude_missing_test_prompt",
    "closeout_handoff",
    "no_real_data_check",
    "stable_id_check",
    "replay_command",
    "base_tenant_fixture",
  ]) {
    if (!requirements.required_units.includes(unitKey)) errors.push(`CP00-185 missing required unit ${unitKey}`);
  }
  for (const check of [
    "permission_badge_ref_only",
    "audit_hint_ref_only",
    "customer_safe_error_codes_only",
    "no_runtime_permission_evaluation",
    "no_audit_event_write",
    "no_permission_decision_detail",
    "no_audit_event_body",
    "no_unauthorized_count",
    "no_real_client_data",
    "no_real_document_content",
    "stable_id_shape",
    "replay_command_inert",
  ]) {
    if (!requirements.required_tail_checks.includes(check)) errors.push(`CP00-185 missing tail check ${check}`);
  }
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-185 must not write product state");
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-185 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-185 must not write audit events");
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.acquires_runtime_lock !== false) errors.push("CP00-185 must not acquire runtime locks");
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.persists_idempotency_key !== false) errors.push("CP00-185 must not persist idempotency keys");
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-185 must not render live DOM");
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-185 must not execute API handlers");
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.leaks_unauthorized_counts !== false) errors.push("CP00-185 must not leak unauthorized counts");
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-185 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-185 must not leak audit event body");
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.uses_real_client_data !== false) errors.push("CP00-185 must not use real client data");
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.uses_real_document_data !== false) errors.push("CP00-185 must not use real document data");
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-185 must not implement Loop engine");
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-185 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP185_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-185 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP185_PACK_BINDING.pack_id,
      MATTER_CORE_CP186_PACK_BINDING.pack_id,
      MATTER_CORE_CP187_PACK_BINDING.pack_id,
      MATTER_CORE_CP188_PACK_BINDING.pack_id,
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-185 contract current_pack drift");
  }
  if (
    contractProjection?.permission_audit_tail_fixture?.pack_id
    && contractProjection.permission_audit_tail_fixture.pack_id !== MATTER_CORE_CP185_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-185 contract permission audit tail section drift");
  }
  if (
    contractProjection?.fixture_evidence_terminal_entry?.pack_id
    && contractProjection.fixture_evidence_terminal_entry.pack_id !== MATTER_CORE_CP184_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-185 must keep CP00-184 fixture evidence terminal entry as source");
  }
  if (contractProjection?.no_write_attestation && contractProjection.no_write_attestation.implements_loop_engine !== false) {
    errors.push("CP00-185 must not implement Loop engine");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP185_PACK_BINDING.pack_id) errors.push("CP00-185 descriptor pack drift");
    if (descriptor.tail_row_count !== MATTER_CORE_CP185_PACK_BINDING.unit_count) errors.push("CP00-185 descriptor tail row count drift");
    if (descriptor.failure_test?.outcome !== "blocked") errors.push("CP00-185 failure test must be blocked");
    if (descriptor.claude_missing_test_prompt?.outcome !== "review_required") errors.push("CP00-185 Claude missing-test prompt must require review");
    if (descriptor.base_tenant_fixture?.contains_real_client_data !== false) errors.push("CP00-185 base tenant fixture must not contain real client data");
    if (descriptor.leak_guards?.no_permission_decision_detail !== true) errors.push("CP00-185 descriptor must not leak permission detail");
    if (descriptor.leak_guards?.no_audit_event_body !== true) errors.push("CP00-185 descriptor must not leak audit body");
    if (descriptor.leak_guards?.no_unauthorized_count !== true) errors.push("CP00-185 descriptor must not leak unauthorized counts");
    if (descriptor.leak_guards?.replay_commands_inert !== true) errors.push("CP00-185 replay commands must be inert");
  }

  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_fixture_evidence_terminal_pack_id: requirements.source_fixture_evidence_terminal_pack_id,
      required_units: requirements.required_units,
      required_tail_checks: requirements.required_tail_checks,
      expected_outcomes: requirements.expected_outcomes,
      no_write_attestation: MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP185_PACK_BINDING,
    MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp185HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp185Coverage(planPack);
  const permissionAuditTail = validateMatterCoreCp185PermissionAuditTail(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-185.matter_core_permission_audit_tail_fixture",
      gate: MATTER_CORE_CP185_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      permission_audit_tail_valid: permissionAuditTail.valid,
      source_fixture_evidence_terminal_pack_id: permissionAuditTail.source_fixture_evidence_terminal_pack_id,
      required_units: permissionAuditTail.required_units,
      required_tail_checks: permissionAuditTail.required_tail_checks,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP185_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && permissionAuditTail.valid,
    },
    MATTER_CORE_CP185_PACK_BINDING,
    MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp185ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp185Coverage(planPack);
  const permissionAuditTail = validateMatterCoreCp185PermissionAuditTail();
  return freezeResult(
    {
      review_packet: "C05.CP00-185.matter_core_permission_audit_tail_fixture",
      gate: MATTER_CORE_CP185_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP185_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_tail_valid: permissionAuditTail.valid,
      source_fixture_evidence_terminal_pack_id: permissionAuditTail.source_fixture_evidence_terminal_pack_id,
      questions: Object.freeze([
        "Does CP00-185 keep this Risk A permission/audit tail to exactly 10 planned units?",
        "Do fixture manifest, golden test, failure test, Hermes fixture evidence, Claude missing-test prompt, closeout handoff, no-real-data check, stable ID check, replay command, and base tenant fixture rows remain descriptor-only?",
        "Are runtime permission evaluation, audit writes, idempotency persistence, live DOM rendering, API handlers, raw payloads, permission decision details, audit event bodies, unauthorized counts, and real data excluded?",
        "Does CP00-185 hand off to CP00-186 / RP05.P05.M06.S02 without moving CitationLedger or Loop implementation early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP179_SERVICE_EVIDENCE_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP185_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP185_PACK_BINDING,
    MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp185CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-185-to-CP00-186",
      from_pack_id: MATTER_CORE_CP185_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP185_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP185_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP185_PACK_BINDING.range,
      open_scope: "Continue RP05.P05.M06.S02 onward synthetic fixture set rows in CP00-186 without widening Risk A permission/audit boundaries or implementing Loop execution.",
      production_ready_flag: MATTER_CORE_CP185_PACK_BINDING.production_ready_flag,
      source_fixture_evidence_terminal_pack_id: MATTER_CORE_CP184_PACK_BINDING.pack_id,
      source_sensitive_boundary_pack_id: MATTER_CORE_CP180_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP185_PACK_BINDING,
    MATTER_CORE_CP185_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp186CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      p05_fixture_micro_phases: MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS.p05_fixture_micro_phases,
      p06_permission_micro_phases: MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS.p06_permission_micro_phases,
    },
    MATTER_CORE_CP186_PACK_BINDING,
    MATTER_CORE_CP186_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp186Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-186 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP186_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-186");
  if (planPack?.risk_class !== MATTER_CORE_CP186_PACK_BINDING.risk_class) errors.push("CP00-186 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP186_PACK_BINDING.unit_count) errors.push("CP00-186 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP186_PACK_BINDING.first_unit_id) errors.push("CP00-186 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP186_PACK_BINDING.last_unit_id) errors.push("CP00-186 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-186 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-186 must only include RP05 units");

  const summary = createMatterCoreCp186CoverageSummary(planPack);
  const expectedDeliverables = {
    fixture: 33,
    claude_review: 7,
    implementation: 59,
    security_audit: 22,
    test: 15,
    hermes_evidence: 4,
    ui: 10,
  };
  for (const [deliverable, count] of Object.entries(expectedDeliverables)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-186 ${deliverable} distribution drift`);
  }
  if (summary.by_phase["RP05.P05"] !== 89) errors.push("CP00-186 RP05.P05 distribution drift");
  if (summary.by_phase["RP05.P06"] !== 61) errors.push("CP00-186 RP05.P06 distribution drift");
  const expectedMicro = {
    "RP05.P05.M06": 19,
    "RP05.P05.M07": 22,
    "RP05.P05.M08": 20,
    "RP05.P05.M09": 20,
    "RP05.P05.M10": 8,
    "RP05.P06.M00": 11,
    "RP05.P06.M01": 11,
    "RP05.P06.M02": 20,
    "RP05.P06.M03": 19,
  };
  for (const [microPhase, count] of Object.entries(expectedMicro)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-186 ${microPhase} distribution drift`);
  }
  for (const title of MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS.p05_fixture_micro_phases) {
    if (!summary.by_micro_title[title]) errors.push(`CP00-186 missing P05 fixture micro phase ${title}`);
  }
  for (const title of MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS.p06_permission_micro_phases) {
    if (!summary.by_micro_title[title]) errors.push(`CP00-186 missing P06 permission micro phase ${title}`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP186_PACK_BINDING,
    MATTER_CORE_CP186_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp186SyntheticFixturePermissionSubstrate(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS;
  if (requirements.source_permission_audit_tail_pack_id !== MATTER_CORE_CP185_PACK_BINDING.pack_id) {
    errors.push("CP00-186 must inherit CP00-185 permission audit tail");
  }
  if (requirements.source_fixture_evidence_terminal_pack_id !== MATTER_CORE_CP184_PACK_BINDING.pack_id) {
    errors.push("CP00-186 must inherit CP00-184 fixture evidence terminal entry");
  }
  if (requirements.source_sensitive_boundary_pack_id !== MATTER_CORE_CP180_PACK_BINDING.pack_id) {
    errors.push("CP00-186 must keep CP00-180 sensitive boundary as source");
  }
  if (requirements.source_service_pack_id !== MATTER_CORE_CP178_PACK_BINDING.pack_id) {
    errors.push("CP00-186 must keep CP00-178 service boundary as source");
  }
  for (const control of [
    "base_user_fixture",
    "base_matter_fixture",
    "base_document_fixture",
    "review_required_case",
    "denied_case",
    "cross_tenant_case",
    "security_trimming_case",
    "ai_retrieval_or_analytics_case",
    "hermes_fixture_evidence",
    "claude_missing_test_prompt",
    "replay_command",
  ]) {
    if (!requirements.required_fixture_controls.includes(control)) errors.push(`CP00-186 missing fixture control ${control}`);
  }
  for (const control of [
    "permission_matrix_row",
    "view_decision_binding",
    "search_decision_binding",
    "mutation_decision_binding",
    "export_download_decision_binding",
    "share_decision_binding",
    "ai_retrieval_decision_binding",
    "audit_hint_fields",
    "matched_rule_capture",
    "deny_over_allow_check",
    "legal_hold_interaction",
    "ethical_wall_interaction",
    "object_acl_interaction",
    "review_required_route",
    "approval_required_route",
    "security_trimming_proof",
    "audit_event_expectation",
    "permission_fixture",
    "allowed_test",
    "denied_test",
  ]) {
    if (!requirements.required_permission_controls.includes(control)) errors.push(`CP00-186 missing permission control ${control}`);
  }
  for (const guard of [
    "no_raw_payload",
    "no_real_client_data",
    "no_real_document_content",
    "no_runtime_permission_evaluation",
    "no_permission_decision_detail",
    "no_audit_event_body",
    "no_audit_event_write",
    "no_unauthorized_count",
    "no_client_visible_wiki_output",
    "replay_command_inert",
  ]) {
    if (!requirements.required_no_leak_guards.includes(guard)) errors.push(`CP00-186 missing no-leak guard ${guard}`);
  }
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-186 must not write product state");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-186 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-186 must not write audit events");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.acquires_runtime_lock !== false) errors.push("CP00-186 must not acquire runtime locks");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.persists_idempotency_key !== false) errors.push("CP00-186 must not persist idempotency keys");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-186 must not dispatch review routes");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-186 must not dispatch approval routes");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-186 must not render live DOM");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-186 must not execute API handlers");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.leaks_unauthorized_counts !== false) errors.push("CP00-186 must not leak unauthorized counts");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-186 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-186 must not leak audit event body");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.uses_real_client_data !== false) errors.push("CP00-186 must not use real client data");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.uses_real_document_data !== false) errors.push("CP00-186 must not use real document data");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-186 must not implement Loop engine");
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-186 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP186_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-186 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP186_PACK_BINDING.pack_id,
      MATTER_CORE_CP187_PACK_BINDING.pack_id,
      MATTER_CORE_CP188_PACK_BINDING.pack_id,
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-186 contract current_pack drift");
  }
  if (
    contractProjection?.synthetic_fixture_permission_substrate?.pack_id
    && contractProjection.synthetic_fixture_permission_substrate.pack_id !== MATTER_CORE_CP186_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-186 contract synthetic fixture permission substrate section drift");
  }
  if (
    contractProjection?.permission_audit_tail_fixture?.pack_id
    && contractProjection.permission_audit_tail_fixture.pack_id !== MATTER_CORE_CP185_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-186 must keep CP00-185 permission audit tail as source");
  }
  if (contractProjection?.no_write_attestation && contractProjection.no_write_attestation.implements_loop_engine !== false) {
    errors.push("CP00-186 must not implement Loop engine");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP186_PACK_BINDING.pack_id) errors.push("CP00-186 descriptor pack drift");
    if (descriptor.source_permission_audit_tail_pack_id !== MATTER_CORE_CP185_PACK_BINDING.pack_id) {
      errors.push("CP00-186 descriptor must source CP00-185 tail");
    }
    if (descriptor.fixture_row_count < requirements.required_fixture_controls.length) errors.push("CP00-186 descriptor fixture row coverage too small");
    if (descriptor.permission_substrate_row_count < requirements.required_permission_controls.length) {
      errors.push("CP00-186 descriptor permission substrate coverage too small");
    }
    if (!descriptor.denied_test_rows?.some((row) => row.outcome === "blocked")) errors.push("CP00-186 denied test row must be blocked");
    if (!descriptor.allowed_test_rows?.some((row) => row.outcome === "passed")) errors.push("CP00-186 allowed test row must pass");
    if (!descriptor.review_required_rows?.some((row) => row.control === "review_required_route")) {
      errors.push("CP00-186 review-required route row is missing");
    }
    if (!descriptor.approval_required_rows?.some((row) => row.control === "approval_required_route")) {
      errors.push("CP00-186 approval-required route row is missing");
    }
    for (const guard of [
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "replay_commands_inert",
    ]) {
      if (descriptor.leak_guards?.[guard] !== true) errors.push(`CP00-186 descriptor missing leak guard ${guard}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_permission_audit_tail_pack_id: requirements.source_permission_audit_tail_pack_id,
      required_fixture_controls: requirements.required_fixture_controls,
      required_permission_controls: requirements.required_permission_controls,
      required_no_leak_guards: requirements.required_no_leak_guards,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP186_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP186_PACK_BINDING,
    MATTER_CORE_CP186_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp186HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp186Coverage(planPack);
  const substrate = validateMatterCoreCp186SyntheticFixturePermissionSubstrate(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-186.matter_core_synthetic_fixture_permission_substrate",
      gate: MATTER_CORE_CP186_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      synthetic_fixture_permission_substrate_valid: substrate.valid,
      source_permission_audit_tail_pack_id: substrate.source_permission_audit_tail_pack_id,
      required_fixture_controls: substrate.required_fixture_controls,
      required_permission_controls: substrate.required_permission_controls,
      required_no_leak_guards: substrate.required_no_leak_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP186_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP186_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && substrate.valid,
    },
    MATTER_CORE_CP186_PACK_BINDING,
    MATTER_CORE_CP186_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp186ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp186Coverage(planPack);
  const substrate = validateMatterCoreCp186SyntheticFixturePermissionSubstrate();
  return freezeResult(
    {
      review_packet: "C05.CP00-186.matter_core_synthetic_fixture_permission_substrate",
      gate: MATTER_CORE_CP186_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP186_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      synthetic_fixture_permission_substrate_valid: substrate.valid,
      source_permission_audit_tail_pack_id: substrate.source_permission_audit_tail_pack_id,
      review_sequence: MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-186 bind all 150 planned RP05.P05/RP05.P06 units as one Risk C pack without creating isolated unit closeouts?",
        "Do the P05 fixture, evidence, Claude packet, handoff, and P06 permission substrate rows remain descriptor-only and synthetic?",
        "Are runtime permission evaluation, audit writes, route dispatch, persistence, API handler execution, raw payloads, permission decision details, audit event bodies, unauthorized counts, real data, and Loop execution excluded?",
        "Does CP00-186 preserve Claude as read-only review evidence only and avoid enterprise trust claims from local validation?",
        "Does CP00-186 hand off to CP00-187 / RP05.P06.M03.S20 without moving CitationLedger or Loop implementation early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP186_SYNTHETIC_FIXTURE_PERMISSION_SUBSTRATE_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP186_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP186_PACK_BINDING,
    MATTER_CORE_CP186_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp186CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-186-to-CP00-187",
      from_pack_id: MATTER_CORE_CP186_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP186_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP186_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP186_PACK_BINDING.range,
      open_scope:
        "Continue RP05.P06.M03.S20 onward permission substrate denied-test tail and follow-on workflow slices in CP00-187 without runtime permission evaluation, audit writes, or Loop execution.",
      production_ready_flag: MATTER_CORE_CP186_PACK_BINDING.production_ready_flag,
      source_permission_audit_tail_pack_id: MATTER_CORE_CP185_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP186_PACK_BINDING,
    MATTER_CORE_CP186_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp187CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const unitTitles = [];
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    unitTitles.push(unit.title);
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      unit_titles: Object.freeze(unitTitles),
      primary_tail_tests: MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS.primary_tail_tests,
      secondary_workflow_controls: MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS.secondary_workflow_controls,
      permission_audit_binding_controls:
        MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS.permission_audit_binding_controls,
    },
    MATTER_CORE_CP187_PACK_BINDING,
    MATTER_CORE_CP187_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp187Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-187 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP187_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-187");
  if (planPack?.risk_class !== MATTER_CORE_CP187_PACK_BINDING.risk_class) errors.push("CP00-187 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP187_PACK_BINDING.unit_count) errors.push("CP00-187 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP187_PACK_BINDING.first_unit_id) errors.push("CP00-187 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP187_PACK_BINDING.last_unit_id) errors.push("CP00-187 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-187 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-187 must only include RP05 units");

  const summary = createMatterCoreCp187CoverageSummary(planPack);
  const expectedDeliverables = {
    test: 7,
    security_audit: 7,
    implementation: 16,
    ui: 8,
    claude_review: 2,
  };
  for (const [deliverable, count] of Object.entries(expectedDeliverables)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-187 ${deliverable} distribution drift`);
  }
  if (summary.by_phase["RP05.P06"] !== 40) errors.push("CP00-187 RP05.P06 distribution drift");
  const expectedMicro = {
    "RP05.P06.M03": 3,
    "RP05.P06.M04": 22,
    "RP05.P06.M05": 15,
  };
  for (const [microPhase, count] of Object.entries(expectedMicro)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-187 ${microPhase} distribution drift`);
  }
  for (const title of ["Primary Implementation Slice", "Secondary Workflow Slice", "Permission And Audit Binding"]) {
    if (!summary.by_micro_title[title]) errors.push(`CP00-187 missing ${title}`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP187_PACK_BINDING,
    MATTER_CORE_CP187_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp187PermissionSubstrateWorkflowBinding(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS;
  if (requirements.source_synthetic_fixture_permission_substrate_pack_id !== MATTER_CORE_CP186_PACK_BINDING.pack_id) {
    errors.push("CP00-187 must inherit CP00-186 synthetic fixture permission substrate");
  }
  if (requirements.source_permission_audit_tail_pack_id !== MATTER_CORE_CP185_PACK_BINDING.pack_id) {
    errors.push("CP00-187 must keep CP00-185 permission audit tail as source");
  }
  if (requirements.source_sensitive_boundary_pack_id !== MATTER_CORE_CP180_PACK_BINDING.pack_id) {
    errors.push("CP00-187 must keep CP00-180 sensitive boundary as source");
  }
  if (requirements.source_service_pack_id !== MATTER_CORE_CP178_PACK_BINDING.pack_id) {
    errors.push("CP00-187 must keep CP00-178 service boundary as source");
  }
  for (const control of ["denied_test", "cross_tenant_test", "leak_prevention_test"]) {
    if (!requirements.primary_tail_tests.includes(control)) errors.push(`CP00-187 missing primary tail test ${control}`);
  }
  for (const control of [
    "permission_matrix_row",
    "view_decision_binding",
    "search_decision_binding",
    "mutation_decision_binding",
    "export_download_decision_binding",
    "share_decision_binding",
    "ai_retrieval_decision_binding",
    "audit_hint_fields",
    "matched_rule_capture",
    "deny_over_allow_check",
    "legal_hold_interaction",
    "ethical_wall_interaction",
    "object_acl_interaction",
    "review_required_route",
    "approval_required_route",
    "security_trimming_proof",
    "audit_event_expectation",
    "permission_fixture",
    "allowed_test",
    "denied_test",
    "cross_tenant_test",
    "leak_prevention_test",
  ]) {
    if (!requirements.secondary_workflow_controls.includes(control)) errors.push(`CP00-187 missing secondary workflow control ${control}`);
  }
  for (const control of [
    "permission_matrix_row",
    "view_decision_binding",
    "search_decision_binding",
    "mutation_decision_binding",
    "export_download_decision_binding",
    "share_decision_binding",
    "ai_retrieval_decision_binding",
    "audit_hint_fields",
    "matched_rule_capture",
    "deny_over_allow_check",
    "legal_hold_interaction",
    "ethical_wall_interaction",
    "object_acl_interaction",
    "review_required_route",
    "approval_required_route",
  ]) {
    if (!requirements.permission_audit_binding_controls.includes(control)) {
      errors.push(`CP00-187 missing permission/audit binding control ${control}`);
    }
  }
  for (const binding of [
    "permission_matrix_row_ref",
    "view_decision_ref",
    "search_decision_ref",
    "mutation_decision_ref",
    "export_download_decision_ref",
    "share_decision_ref",
    "ai_retrieval_decision_ref",
    "audit_hint_fields_ref",
    "matched_rule_ref",
    "deny_over_allow_applied",
    "legal_hold_ref",
    "ethical_wall_ref",
    "object_acl_ref",
    "review_route_ref",
    "approval_route_ref",
  ]) {
    if (!requirements.required_workflow_bindings.includes(binding)) errors.push(`CP00-187 missing workflow binding ${binding}`);
  }
  for (const guard of requirements.required_no_leak_guards) {
    if (![
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "no_client_visible_wiki_output",
      "replay_command_inert",
    ].includes(guard)) {
      errors.push(`CP00-187 unsupported no-leak guard ${guard}`);
    }
  }
  if (MATTER_CORE_CP187_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-187 must not write product state");
  if (MATTER_CORE_CP187_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-187 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP187_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-187 must not write audit events");
  if (MATTER_CORE_CP187_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-187 must not dispatch review routes");
  if (MATTER_CORE_CP187_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-187 must not dispatch approval routes");
  if (MATTER_CORE_CP187_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-187 must not render live DOM");
  if (MATTER_CORE_CP187_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-187 must not execute API handlers");
  if (MATTER_CORE_CP187_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-187 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP187_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-187 must not leak audit event body");
  if (MATTER_CORE_CP187_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-187 must not implement Loop engine");
  if (MATTER_CORE_CP187_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-187 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP187_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-187 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP187_PACK_BINDING.pack_id,
      MATTER_CORE_CP188_PACK_BINDING.pack_id,
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(
      contractProjection.current_pack.pack_id,
    )
  ) {
    errors.push("CP00-187 contract current_pack drift");
  }
  if (
    contractProjection?.permission_substrate_workflow_binding?.pack_id
    && contractProjection.permission_substrate_workflow_binding.pack_id !== MATTER_CORE_CP187_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-187 contract permission substrate workflow binding section drift");
  }
  if (
    contractProjection?.synthetic_fixture_permission_substrate?.pack_id
    && contractProjection.synthetic_fixture_permission_substrate.pack_id !== MATTER_CORE_CP186_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-187 must keep CP00-186 synthetic fixture permission substrate as source");
  }
  if (contractProjection?.no_write_attestation && contractProjection.no_write_attestation.implements_loop_engine !== false) {
    errors.push("CP00-187 must not implement Loop engine");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP187_PACK_BINDING.pack_id) errors.push("CP00-187 descriptor pack drift");
    if (descriptor.source_synthetic_fixture_permission_substrate_pack_id !== MATTER_CORE_CP186_PACK_BINDING.pack_id) {
      errors.push("CP00-187 descriptor must source CP00-186 substrate");
    }
    if (descriptor.workflow_binding_row_count !== MATTER_CORE_CP187_PACK_BINDING.unit_count) {
      errors.push("CP00-187 descriptor workflow binding row count drift");
    }
    if (descriptor.primary_tail_test_rows?.length !== requirements.primary_tail_tests.length) {
      errors.push("CP00-187 descriptor primary tail test coverage drift");
    }
    if (descriptor.secondary_workflow_rows?.length !== requirements.secondary_workflow_controls.length) {
      errors.push("CP00-187 descriptor secondary workflow coverage drift");
    }
    if (descriptor.permission_audit_binding_rows?.length !== requirements.permission_audit_binding_controls.length) {
      errors.push("CP00-187 descriptor permission/audit binding coverage drift");
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "denied_test")) {
      errors.push("CP00-187 denied test row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "cross_tenant_test")) {
      errors.push("CP00-187 cross-tenant test row must be blocked");
    }
    if (!descriptor.workflow_binding_rows?.some((row) => row.control === "leak_prevention_test" && row.security_trimming_proof_ref)) {
      errors.push("CP00-187 leak prevention test must bind security trimming proof");
    }
    if (!descriptor.rows_by_outcome?.review_required?.some((row) => row.control === "review_required_route")) {
      errors.push("CP00-187 review-required route row is missing");
    }
    if (!descriptor.rows_by_outcome?.approval_required?.some((row) => row.control === "approval_required_route")) {
      errors.push("CP00-187 approval-required route row is missing");
    }
    for (const guard of [
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "no_route_dispatch",
      "replay_commands_inert",
    ]) {
      if (descriptor.leak_guards?.[guard] !== true) errors.push(`CP00-187 descriptor missing leak guard ${guard}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_synthetic_fixture_permission_substrate_pack_id: requirements.source_synthetic_fixture_permission_substrate_pack_id,
      primary_tail_tests: requirements.primary_tail_tests,
      secondary_workflow_controls: requirements.secondary_workflow_controls,
      permission_audit_binding_controls: requirements.permission_audit_binding_controls,
      required_workflow_bindings: requirements.required_workflow_bindings,
      required_no_leak_guards: requirements.required_no_leak_guards,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP187_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP187_PACK_BINDING,
    MATTER_CORE_CP187_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp187HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp187Coverage(planPack);
  const workflowBinding = validateMatterCoreCp187PermissionSubstrateWorkflowBinding(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-187.matter_core_permission_substrate_workflow_binding",
      gate: MATTER_CORE_CP187_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      permission_substrate_workflow_binding_valid: workflowBinding.valid,
      source_synthetic_fixture_permission_substrate_pack_id: workflowBinding.source_synthetic_fixture_permission_substrate_pack_id,
      primary_tail_tests: workflowBinding.primary_tail_tests,
      secondary_workflow_controls: workflowBinding.secondary_workflow_controls,
      permission_audit_binding_controls: workflowBinding.permission_audit_binding_controls,
      required_no_leak_guards: workflowBinding.required_no_leak_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP187_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP187_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && workflowBinding.valid,
    },
    MATTER_CORE_CP187_PACK_BINDING,
    MATTER_CORE_CP187_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp187ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp187Coverage(planPack);
  const workflowBinding = validateMatterCoreCp187PermissionSubstrateWorkflowBinding();
  return freezeResult(
    {
      review_packet: "C05.CP00-187.matter_core_permission_substrate_workflow_binding",
      gate: MATTER_CORE_CP187_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP187_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_substrate_workflow_binding_valid: workflowBinding.valid,
      source_synthetic_fixture_permission_substrate_pack_id: workflowBinding.source_synthetic_fixture_permission_substrate_pack_id,
      review_sequence: MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-187 bind all 40 planned RP05.P06 units as one Risk B pack without creating isolated unit closeouts?",
        "Do denied, cross-tenant, leak-prevention, secondary workflow, and permission/audit binding rows stay descriptor-only with no runtime permission evaluation?",
        "Are audit hints, matched rules, legal hold, ethical wall, object ACL, review route, and approval route captured as references without audit writes or route dispatch?",
        "Does CP00-187 preserve Claude as a read-only reviewer and avoid final approval or enterprise trust claims?",
        "Does CP00-187 hand off to CP00-188 / RP05.P06.M05.S16 without moving CitationLedger or Loop implementation early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP187_PERMISSION_SUBSTRATE_WORKFLOW_BINDING_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP187_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP187_PACK_BINDING,
    MATTER_CORE_CP187_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp187CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-187-to-CP00-188",
      from_pack_id: MATTER_CORE_CP187_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP187_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP187_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP187_PACK_BINDING.range,
      open_scope:
        "Continue RP05.P06.M05.S16 onward security trimming, audit event expectation, permission fixture, tests, and synthetic fixture set entry in CP00-188 Risk A without runtime permission evaluation, audit writes, route dispatch, or Loop execution.",
      production_ready_flag: MATTER_CORE_CP187_PACK_BINDING.production_ready_flag,
      source_synthetic_fixture_permission_substrate_pack_id: MATTER_CORE_CP186_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP187_PACK_BINDING,
    MATTER_CORE_CP187_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp188CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const unitTitles = [];
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    unitTitles.push(unit.title);
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      unit_titles: Object.freeze(unitTitles),
      permission_audit_binding_tail_controls:
        MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS.permission_audit_binding_tail_controls,
      synthetic_fixture_entry_controls: MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS.synthetic_fixture_entry_controls,
    },
    MATTER_CORE_CP188_PACK_BINDING,
    MATTER_CORE_CP188_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp188Coverage(planPack) {
  const errors = [];
  if (!planPack) errors.push("CP00-188 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP188_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-188");
  if (planPack?.risk_class !== MATTER_CORE_CP188_PACK_BINDING.risk_class) errors.push("CP00-188 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP188_PACK_BINDING.unit_count) errors.push("CP00-188 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP188_PACK_BINDING.first_unit_id) errors.push("CP00-188 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP188_PACK_BINDING.last_unit_id) errors.push("CP00-188 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-188 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-188 must only include RP05 units");

  const summary = createMatterCoreCp188CoverageSummary(planPack);
  const expectedDeliverables = {
    security_audit: 4,
    test: 4,
    implementation: 2,
  };
  for (const [deliverable, count] of Object.entries(expectedDeliverables)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-188 ${deliverable} distribution drift`);
  }
  if (summary.by_phase["RP05.P06"] !== 10) errors.push("CP00-188 RP05.P06 distribution drift");
  if (summary.by_micro_phase["RP05.P06.M05"] !== 7) errors.push("CP00-188 RP05.P06.M05 distribution drift");
  if (summary.by_micro_phase["RP05.P06.M06"] !== 3) errors.push("CP00-188 RP05.P06.M06 distribution drift");
  for (const title of ["Permission And Audit Binding", "Synthetic Fixture Set"]) {
    if (!summary.by_micro_title[title]) errors.push(`CP00-188 missing ${title}`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP188_PACK_BINDING,
    MATTER_CORE_CP188_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp188PermissionAuditSecurityFixture(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS;
  if (requirements.source_permission_substrate_workflow_binding_pack_id !== MATTER_CORE_CP187_PACK_BINDING.pack_id) {
    errors.push("CP00-188 must inherit CP00-187 permission substrate workflow binding");
  }
  if (requirements.source_synthetic_fixture_permission_substrate_pack_id !== MATTER_CORE_CP186_PACK_BINDING.pack_id) {
    errors.push("CP00-188 must keep CP00-186 synthetic fixture permission substrate as source");
  }
  if (requirements.source_sensitive_boundary_pack_id !== MATTER_CORE_CP180_PACK_BINDING.pack_id) {
    errors.push("CP00-188 must keep CP00-180 sensitive boundary as source");
  }
  for (const control of [
    "security_trimming_proof",
    "audit_event_expectation",
    "permission_fixture",
    "allowed_test",
    "denied_test",
    "cross_tenant_test",
    "leak_prevention_test",
  ]) {
    if (!requirements.permission_audit_binding_tail_controls.includes(control)) errors.push(`CP00-188 missing tail control ${control}`);
  }
  for (const control of ["permission_matrix_row", "view_decision_binding", "search_decision_binding"]) {
    if (!requirements.synthetic_fixture_entry_controls.includes(control)) errors.push(`CP00-188 missing synthetic fixture entry control ${control}`);
  }
  for (const boundaryRef of [
    "security_trimming_proof_ref",
    "audit_event_expectation_ref",
    "permission_fixture_ref",
    "permission_matrix_row_ref",
    "view_decision_ref",
    "search_decision_ref",
    "matched_rule_ref",
    "customer_safe_error_codes",
  ]) {
    if (!requirements.required_boundary_refs.includes(boundaryRef)) errors.push(`CP00-188 missing boundary ref ${boundaryRef}`);
  }
  if (MATTER_CORE_CP188_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-188 must not write product state");
  if (MATTER_CORE_CP188_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-188 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP188_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-188 must not write audit events");
  if (MATTER_CORE_CP188_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-188 must not dispatch review routes");
  if (MATTER_CORE_CP188_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-188 must not dispatch approval routes");
  if (MATTER_CORE_CP188_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-188 must not render live DOM");
  if (MATTER_CORE_CP188_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-188 must not execute API handlers");
  if (MATTER_CORE_CP188_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-188 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP188_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-188 must not leak audit event body");
  if (MATTER_CORE_CP188_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-188 must not implement Loop engine");
  if (MATTER_CORE_CP188_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-188 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP188_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-188 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP188_PACK_BINDING.pack_id,
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(
      contractProjection.current_pack.pack_id,
    )
  ) {
    errors.push("CP00-188 contract current_pack drift");
  }
  if (
    contractProjection?.permission_audit_security_fixture_boundary?.pack_id
    && contractProjection.permission_audit_security_fixture_boundary.pack_id !== MATTER_CORE_CP188_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-188 contract permission audit security fixture section drift");
  }
  if (
    contractProjection?.permission_substrate_workflow_binding?.pack_id
    && contractProjection.permission_substrate_workflow_binding.pack_id !== MATTER_CORE_CP187_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-188 must keep CP00-187 permission substrate workflow binding as source");
  }
  if (contractProjection?.no_write_attestation && contractProjection.no_write_attestation.implements_loop_engine !== false) {
    errors.push("CP00-188 must not implement Loop engine");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP188_PACK_BINDING.pack_id) errors.push("CP00-188 descriptor pack drift");
    if (descriptor.source_permission_substrate_workflow_binding_pack_id !== MATTER_CORE_CP187_PACK_BINDING.pack_id) {
      errors.push("CP00-188 descriptor must source CP00-187 workflow binding");
    }
    if (descriptor.security_fixture_row_count !== MATTER_CORE_CP188_PACK_BINDING.unit_count) {
      errors.push("CP00-188 descriptor security fixture row count drift");
    }
    if (descriptor.permission_audit_tail_rows?.length !== requirements.permission_audit_binding_tail_controls.length) {
      errors.push("CP00-188 descriptor permission/audit tail coverage drift");
    }
    if (descriptor.synthetic_fixture_entry_rows?.length !== requirements.synthetic_fixture_entry_controls.length) {
      errors.push("CP00-188 descriptor synthetic fixture entry coverage drift");
    }
    if (!descriptor.rows_by_outcome?.passed?.some((row) => row.control === "allowed_test")) {
      errors.push("CP00-188 allowed test row must pass");
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "denied_test")) {
      errors.push("CP00-188 denied test row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "cross_tenant_test")) {
      errors.push("CP00-188 cross-tenant test row must be blocked");
    }
    if (!descriptor.security_fixture_rows?.some((row) => row.control === "leak_prevention_test" && row.security_trimming_proof_ref)) {
      errors.push("CP00-188 leak prevention test must bind security trimming proof");
    }
    if (!descriptor.security_fixture_rows?.some((row) => row.control === "audit_event_expectation" && row.audit_event_expectation_ref)) {
      errors.push("CP00-188 audit event expectation row must bind audit expectation ref");
    }
    if (!descriptor.security_fixture_rows?.some((row) => row.control === "permission_fixture" && row.permission_fixture_ref)) {
      errors.push("CP00-188 permission fixture row must bind fixture ref");
    }
    for (const guard of [
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "no_route_dispatch",
      "replay_commands_inert",
    ]) {
      if (descriptor.leak_guards?.[guard] !== true) errors.push(`CP00-188 descriptor missing leak guard ${guard}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_permission_substrate_workflow_binding_pack_id: requirements.source_permission_substrate_workflow_binding_pack_id,
      permission_audit_binding_tail_controls: requirements.permission_audit_binding_tail_controls,
      synthetic_fixture_entry_controls: requirements.synthetic_fixture_entry_controls,
      required_boundary_refs: requirements.required_boundary_refs,
      required_no_leak_guards: requirements.required_no_leak_guards,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP188_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP188_PACK_BINDING,
    MATTER_CORE_CP188_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp188HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp188Coverage(planPack);
  const securityFixture = validateMatterCoreCp188PermissionAuditSecurityFixture(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-188.matter_core_permission_audit_security_fixture_boundary",
      gate: MATTER_CORE_CP188_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      permission_audit_security_fixture_valid: securityFixture.valid,
      source_permission_substrate_workflow_binding_pack_id: securityFixture.source_permission_substrate_workflow_binding_pack_id,
      permission_audit_binding_tail_controls: securityFixture.permission_audit_binding_tail_controls,
      synthetic_fixture_entry_controls: securityFixture.synthetic_fixture_entry_controls,
      required_boundary_refs: securityFixture.required_boundary_refs,
      required_no_leak_guards: securityFixture.required_no_leak_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP188_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP188_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && securityFixture.valid,
    },
    MATTER_CORE_CP188_PACK_BINDING,
    MATTER_CORE_CP188_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp188ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp188Coverage(planPack);
  const securityFixture = validateMatterCoreCp188PermissionAuditSecurityFixture();
  return freezeResult(
    {
      review_packet: "C05.CP00-188.matter_core_permission_audit_security_fixture_boundary",
      gate: MATTER_CORE_CP188_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP188_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_security_fixture_valid: securityFixture.valid,
      source_permission_substrate_workflow_binding_pack_id: securityFixture.source_permission_substrate_workflow_binding_pack_id,
      review_sequence: MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-188 keep the security trimming, audit expectation, permission fixture, and allowed/denied/cross-tenant/leak tests as descriptor-only rows?",
        "Do the M06 permission matrix, view decision, and search decision rows remain synthetic fixture entry descriptors without runtime permission evaluation?",
        "Are audit event bodies, permission decision details, unauthorized counts, route dispatch, live DOM rendering, and API handlers excluded?",
        "Does CP00-188 preserve Claude as a read-only reviewer and avoid final approval or enterprise trust claims?",
        "Does CP00-188 hand off to CP00-189 / RP05.P06.M06.S04 without moving CitationLedger or Loop implementation early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP188_PERMISSION_AUDIT_SECURITY_FIXTURE_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP188_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP188_PACK_BINDING,
    MATTER_CORE_CP188_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp188CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-188-to-CP00-189",
      from_pack_id: MATTER_CORE_CP188_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP188_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP188_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP188_PACK_BINDING.range,
      open_scope:
        "Continue RP05.P06.M06.S04 onward generated synthetic fixture workflow controls in CP00-189 without moving permission/audit runtime, CitationLedger, or Loop implementation early.",
      production_ready_flag: MATTER_CORE_CP188_PACK_BINDING.production_ready_flag,
      source_permission_substrate_workflow_binding_pack_id: MATTER_CORE_CP187_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP188_PACK_BINDING,
    MATTER_CORE_CP188_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp189CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const unitTitles = [];
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    unitTitles.push(unit.title);
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      unit_titles: Object.freeze(unitTitles),
      synthetic_control_template: MATTER_CORE_CP189_SYNTHETIC_FIXTURE_FAILURE_EVIDENCE_REQUIREMENTS.synthetic_control_template,
      failure_control_template: MATTER_CORE_CP189_SYNTHETIC_FIXTURE_FAILURE_EVIDENCE_REQUIREMENTS.failure_control_template,
    },
    MATTER_CORE_CP189_PACK_BINDING,
    MATTER_CORE_CP189_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp189Coverage(planPack) {
  const errors = [];
  const requirements = MATTER_CORE_CP189_SYNTHETIC_FIXTURE_FAILURE_EVIDENCE_REQUIREMENTS;
  if (!planPack) errors.push("CP00-189 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP189_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-189");
  if (planPack?.risk_class !== MATTER_CORE_CP189_PACK_BINDING.risk_class) errors.push("CP00-189 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP189_PACK_BINDING.unit_count) errors.push("CP00-189 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP189_PACK_BINDING.first_unit_id) errors.push("CP00-189 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP189_PACK_BINDING.last_unit_id) errors.push("CP00-189 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-189 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-189 must only include RP05 units");

  const summary = createMatterCoreCp189CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-189 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-189 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-189 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-189 ${microTitle} distribution drift`);
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP189_PACK_BINDING,
    MATTER_CORE_CP189_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp189SyntheticFixtureFailureEvidence(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP189_SYNTHETIC_FIXTURE_FAILURE_EVIDENCE_REQUIREMENTS;
  if (requirements.source_permission_audit_security_fixture_boundary_pack_id !== MATTER_CORE_CP188_PACK_BINDING.pack_id) {
    errors.push("CP00-189 must inherit CP00-188 permission/audit security fixture boundary");
  }
  if (requirements.source_permission_substrate_workflow_binding_pack_id !== MATTER_CORE_CP187_PACK_BINDING.pack_id) {
    errors.push("CP00-189 must keep CP00-187 permission substrate workflow binding as source");
  }
  if (requirements.source_synthetic_fixture_permission_substrate_pack_id !== MATTER_CORE_CP186_PACK_BINDING.pack_id) {
    errors.push("CP00-189 must keep CP00-186 synthetic fixture permission substrate as source");
  }
  for (const failureClaim of requirements.required_failure_claims) {
    if (!requirements.failure_control_template.includes(failureClaim)) errors.push(`CP00-189 missing failure claim ${failureClaim}`);
  }
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-189 must not write product state");
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-189 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-189 must not write audit events");
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-189 must not dispatch review routes");
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-189 must not dispatch approval routes");
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.executes_rollback !== false) errors.push("CP00-189 must not execute rollback");
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.executes_retry !== false) errors.push("CP00-189 must not execute retry");
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-189 must not render live DOM");
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-189 must not execute API handlers");
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-189 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-189 must not leak audit event body");
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-189 must not implement Loop engine");
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-189 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP189_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-189 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP189_PACK_BINDING.pack_id,
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-189 contract current_pack drift");
  }
  if (
    contractProjection?.synthetic_fixture_failure_evidence_continuation?.pack_id
    && contractProjection.synthetic_fixture_failure_evidence_continuation.pack_id !== MATTER_CORE_CP189_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-189 contract synthetic fixture failure evidence continuation section drift");
  }
  if (
    contractProjection?.permission_audit_security_fixture_boundary?.pack_id
    && contractProjection.permission_audit_security_fixture_boundary.pack_id !== MATTER_CORE_CP188_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-189 must keep CP00-188 permission/audit security fixture boundary as source");
  }
  if (contractProjection?.no_write_attestation && contractProjection.no_write_attestation.implements_loop_engine !== false) {
    errors.push("CP00-189 must not implement Loop engine");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP189_PACK_BINDING.pack_id) errors.push("CP00-189 descriptor pack drift");
    if (descriptor.source_permission_audit_security_fixture_boundary_pack_id !== MATTER_CORE_CP188_PACK_BINDING.pack_id) {
      errors.push("CP00-189 descriptor must source CP00-188 security fixture boundary");
    }
    if (descriptor.continuation_row_count !== MATTER_CORE_CP189_PACK_BINDING.unit_count) {
      errors.push("CP00-189 descriptor continuation row count drift");
    }
    if (descriptor.synthetic_rows?.length !== requirements.phase_counts["RP05.P06"]) {
      errors.push("CP00-189 descriptor synthetic row count drift");
    }
    if (descriptor.failure_rows?.length !== requirements.phase_counts["RP05.P07"]) {
      errors.push("CP00-189 descriptor failure row count drift");
    }
    const emittedBoundaryRefs = new Set();
    for (const row of descriptor.continuation_rows ?? []) {
      for (const [key, value] of Object.entries(row)) {
        if (key.endsWith("_ref") && value) emittedBoundaryRefs.add(key);
      }
      if (Array.isArray(row.customer_safe_error_codes) && row.customer_safe_error_codes.length > 0) {
        emittedBoundaryRefs.add("customer_safe_error_codes");
      }
    }
    for (const boundaryRef of requirements.required_boundary_refs) {
      if (!emittedBoundaryRefs.has(boundaryRef)) {
        errors.push(`CP00-189 descriptor missing emitted boundary ref ${boundaryRef}`);
      }
    }
    for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
      if (descriptor.rows_by_micro_phase?.[microPhase] !== count) errors.push(`CP00-189 descriptor ${microPhase} row count drift`);
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "permission_denied_failure")) {
      errors.push("CP00-189 permission denied failure row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "cross_tenant_failure")) {
      errors.push("CP00-189 cross-tenant failure row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.review_required?.some((row) => row.control === "review_required_route")) {
      errors.push("CP00-189 review-required route row is missing");
    }
    if (!descriptor.rows_by_outcome?.approval_required?.some((row) => row.control === "approval_required_route")) {
      errors.push("CP00-189 approval-required route row is missing");
    }
    if (!descriptor.failure_rows?.some((row) => row.control === "blocked_claim_receipt" && row.blocked_claim_receipt_ref)) {
      errors.push("CP00-189 blocked-claim receipt row must bind receipt ref");
    }
    if (!descriptor.failure_rows?.some((row) => row.control === "hermes_failure_evidence" && row.hermes_failure_evidence_ref)) {
      errors.push("CP00-189 Hermes failure evidence row must bind evidence ref");
    }
    if (!descriptor.synthetic_rows?.some((row) => row.control === "leak_prevention_test" && row.security_trimming_proof_ref)) {
      errors.push("CP00-189 leak prevention row must bind security trimming proof");
    }
    for (const guard of [
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "no_route_dispatch",
      "no_failure_recovery_execution",
      "replay_commands_inert",
    ]) {
      if (descriptor.leak_guards?.[guard] !== true) errors.push(`CP00-189 descriptor missing leak guard ${guard}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_permission_audit_security_fixture_boundary_pack_id:
        requirements.source_permission_audit_security_fixture_boundary_pack_id,
      synthetic_control_template: requirements.synthetic_control_template,
      failure_control_template: requirements.failure_control_template,
      micro_phase_row_counts: requirements.micro_phase_row_counts,
      required_failure_claims: requirements.required_failure_claims,
      required_boundary_refs: requirements.required_boundary_refs,
      required_no_leak_guards: requirements.required_no_leak_guards,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP189_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP189_PACK_BINDING,
    MATTER_CORE_CP189_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp189HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp189Coverage(planPack);
  const continuation = validateMatterCoreCp189SyntheticFixtureFailureEvidence(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-189.matter_core_synthetic_fixture_failure_evidence_continuation",
      gate: MATTER_CORE_CP189_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      synthetic_fixture_failure_evidence_valid: continuation.valid,
      source_permission_audit_security_fixture_boundary_pack_id:
        continuation.source_permission_audit_security_fixture_boundary_pack_id,
      synthetic_control_template_count: continuation.synthetic_control_template.length,
      failure_control_template_count: continuation.failure_control_template.length,
      micro_phase_row_counts: continuation.micro_phase_row_counts,
      required_failure_claims: continuation.required_failure_claims,
      required_no_leak_guards: continuation.required_no_leak_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP189_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP189_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && continuation.valid,
    },
    MATTER_CORE_CP189_PACK_BINDING,
    MATTER_CORE_CP189_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp189ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp189Coverage(planPack);
  const continuation = validateMatterCoreCp189SyntheticFixtureFailureEvidence();
  return freezeResult(
    {
      review_packet: "C05.CP00-189.matter_core_synthetic_fixture_failure_evidence_continuation",
      gate: MATTER_CORE_CP189_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP189_SYNTHETIC_FIXTURE_FAILURE_EVIDENCE_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP189_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      synthetic_fixture_failure_evidence_valid: continuation.valid,
      source_permission_audit_security_fixture_boundary_pack_id:
        continuation.source_permission_audit_security_fixture_boundary_pack_id,
      review_sequence: MATTER_CORE_CP189_SYNTHETIC_FIXTURE_FAILURE_EVIDENCE_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-189 bind all 150 planned RP05.P06/P07 units as one Risk C descriptor-only pack without creating isolated unit closeouts?",
        "Do synthetic fixture, Hermes evidence, Claude review, closeout handoff, and failure taxonomy rows remain frozen descriptors with no runtime permission/audit/failure execution?",
        "Are blocked claim receipt, Hermes failure evidence, audit failure hint, rollback expectation, and compensation expectation represented as refs without executing rollback/retry?",
        "Does CP00-189 preserve Claude as a read-only reviewer and avoid final approval or enterprise trust claims?",
        "Does CP00-189 hand off to CP00-190 / RP05.P07.M03.S15 without moving CitationLedger or Loop implementation early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP189_SYNTHETIC_FIXTURE_FAILURE_EVIDENCE_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP189_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP189_PACK_BINDING,
    MATTER_CORE_CP189_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp189CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-189-to-CP00-190",
      from_pack_id: MATTER_CORE_CP189_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP189_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP189_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP189_PACK_BINDING.range,
      open_scope:
        "Continue RP05.P07.M03.S15 onward Risk A failure/permission tail in CP00-190 without executing failure recovery, permission runtime, audit writes, CitationLedger, or Loop.",
      production_ready_flag: MATTER_CORE_CP189_PACK_BINDING.production_ready_flag,
      source_permission_audit_security_fixture_boundary_pack_id: MATTER_CORE_CP188_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP189_PACK_BINDING,
    MATTER_CORE_CP189_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp190CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const unitTitles = [];
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    unitTitles.push(unit.title);
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      unit_titles: Object.freeze(unitTitles),
      required_controls: MATTER_CORE_CP190_FAILURE_RECEIPT_TAXONOMY_BOUNDARY_REQUIREMENTS.required_controls,
    },
    MATTER_CORE_CP190_PACK_BINDING,
    MATTER_CORE_CP190_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp190Coverage(planPack) {
  const errors = [];
  const requirements = MATTER_CORE_CP190_FAILURE_RECEIPT_TAXONOMY_BOUNDARY_REQUIREMENTS;
  if (!planPack) errors.push("CP00-190 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP190_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-190");
  if (planPack?.risk_class !== MATTER_CORE_CP190_PACK_BINDING.risk_class) errors.push("CP00-190 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP190_PACK_BINDING.unit_count) errors.push("CP00-190 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP190_PACK_BINDING.first_unit_id) errors.push("CP00-190 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP190_PACK_BINDING.last_unit_id) errors.push("CP00-190 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-190 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-190 must only include RP05 units");

  const summary = createMatterCoreCp190CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-190 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-190 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-190 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-190 ${microTitle} distribution drift`);
  }
  const expectedTitlesByControl = {
    blocked_claim_receipt: "Blocked-claim receipt",
    failure_fixture: "Failure fixture",
    failure_unit_test: "Failure unit test",
    failure_integration_smoke: "Failure integration smoke",
    audit_failure_hint: "Audit failure hint",
    hermes_failure_evidence: "Hermes failure evidence",
    claude_edge_case_prompt: "Claude edge-case prompt",
    human_escalation_note: "Human escalation note",
    failure_taxonomy: "Failure taxonomy",
    missing_tenant_failure: "Missing tenant failure",
  };
  for (const control of requirements.required_controls) {
    const expectedTitle = expectedTitlesByControl[control];
    if (expectedTitle && !summary.unit_titles.some((title) => title.toLowerCase() === expectedTitle.toLowerCase())) {
      errors.push(`CP00-190 missing planned unit title for ${control}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP190_PACK_BINDING,
    MATTER_CORE_CP190_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp190FailureReceiptTaxonomyBoundary(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP190_FAILURE_RECEIPT_TAXONOMY_BOUNDARY_REQUIREMENTS;
  if (requirements.source_synthetic_fixture_failure_evidence_continuation_pack_id !== MATTER_CORE_CP189_PACK_BINDING.pack_id) {
    errors.push("CP00-190 must inherit CP00-189 synthetic fixture failure evidence continuation");
  }
  if (requirements.source_permission_audit_security_fixture_boundary_pack_id !== MATTER_CORE_CP188_PACK_BINDING.pack_id) {
    errors.push("CP00-190 must keep CP00-188 permission/audit security fixture boundary as source");
  }
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-190 must not write product state");
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-190 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-190 must not write audit events");
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-190 must not dispatch review routes");
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-190 must not dispatch approval routes");
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.executes_rollback !== false) errors.push("CP00-190 must not execute rollback");
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.executes_retry !== false) errors.push("CP00-190 must not execute retry");
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-190 must not render live DOM");
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-190 must not execute API handlers");
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-190 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-190 must not leak audit event body");
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-190 must not implement Loop engine");
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-190 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP190_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-190 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP190_PACK_BINDING.pack_id,
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-190 contract current_pack drift");
  }
  if (
    contractProjection?.failure_receipt_taxonomy_boundary?.pack_id
    && contractProjection.failure_receipt_taxonomy_boundary.pack_id !== MATTER_CORE_CP190_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-190 contract failure receipt taxonomy boundary section drift");
  }
  if (
    contractProjection?.synthetic_fixture_failure_evidence_continuation?.pack_id
    && contractProjection.synthetic_fixture_failure_evidence_continuation.pack_id !== MATTER_CORE_CP189_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-190 must keep CP00-189 synthetic fixture failure evidence continuation as source");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP190_PACK_BINDING.pack_id) errors.push("CP00-190 descriptor pack drift");
    if (descriptor.source_synthetic_fixture_failure_evidence_continuation_pack_id !== MATTER_CORE_CP189_PACK_BINDING.pack_id) {
      errors.push("CP00-190 descriptor must source CP00-189 continuation pack");
    }
    if (descriptor.failure_boundary_row_count !== MATTER_CORE_CP190_PACK_BINDING.unit_count) {
      errors.push("CP00-190 descriptor row count drift");
    }
    for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
      if (descriptor.rows_by_micro_phase?.[microPhase] !== count) errors.push(`CP00-190 descriptor ${microPhase} row count drift`);
    }
    const emittedBoundaryRefs = new Set();
    const emittedSafeCodes = new Set();
    for (const row of descriptor.failure_boundary_rows ?? []) {
      for (const [key, value] of Object.entries(row)) {
        if (key.endsWith("_ref") && value) emittedBoundaryRefs.add(key);
      }
      for (const code of row.customer_safe_error_codes ?? []) emittedSafeCodes.add(code);
      if (Array.isArray(row.customer_safe_error_codes) && row.customer_safe_error_codes.length > 0) {
        emittedBoundaryRefs.add("customer_safe_error_codes");
      }
    }
    for (const boundaryRef of requirements.required_boundary_refs) {
      if (!emittedBoundaryRefs.has(boundaryRef)) errors.push(`CP00-190 descriptor missing emitted boundary ref ${boundaryRef}`);
    }
    for (const control of requirements.required_controls) {
      if (!descriptor.failure_boundary_rows?.some((row) => row.control === control)) {
        errors.push(`CP00-190 descriptor missing control ${control}`);
      }
    }
    for (const safeCode of requirements.required_customer_safe_error_codes) {
      if (!emittedSafeCodes.has(safeCode)) errors.push(`CP00-190 descriptor missing customer-safe error ${safeCode}`);
    }
    for (const outcome of requirements.required_outcomes) {
      if (!descriptor.rows_by_outcome?.[outcome]?.length) errors.push(`CP00-190 descriptor missing outcome ${outcome}`);
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "missing_tenant_failure")) {
      errors.push("CP00-190 missing tenant failure row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.review_required?.some((row) => row.control === "claude_edge_case_prompt")) {
      errors.push("CP00-190 Claude edge-case prompt row must be review_required");
    }
    if (!descriptor.rows_by_outcome?.approval_required?.some((row) => row.control === "human_escalation_note")) {
      errors.push("CP00-190 human escalation note row must be approval_required");
    }
    for (const guard of [
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "no_route_dispatch",
      "no_failure_recovery_execution",
      "replay_commands_inert",
    ]) {
      if (descriptor.leak_guards?.[guard] !== true) errors.push(`CP00-190 descriptor missing leak guard ${guard}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_synthetic_fixture_failure_evidence_continuation_pack_id:
        requirements.source_synthetic_fixture_failure_evidence_continuation_pack_id,
      required_controls: requirements.required_controls,
      required_boundary_refs: requirements.required_boundary_refs,
      required_customer_safe_error_codes: requirements.required_customer_safe_error_codes,
      required_no_leak_guards: requirements.required_no_leak_guards,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP190_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP190_PACK_BINDING,
    MATTER_CORE_CP190_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp190HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp190Coverage(planPack);
  const boundary = validateMatterCoreCp190FailureReceiptTaxonomyBoundary(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-190.matter_core_failure_receipt_taxonomy_boundary",
      gate: MATTER_CORE_CP190_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      failure_receipt_taxonomy_boundary_valid: boundary.valid,
      source_synthetic_fixture_failure_evidence_continuation_pack_id:
        boundary.source_synthetic_fixture_failure_evidence_continuation_pack_id,
      required_controls: boundary.required_controls,
      required_customer_safe_error_codes: boundary.required_customer_safe_error_codes,
      required_no_leak_guards: boundary.required_no_leak_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP190_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP190_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && boundary.valid,
    },
    MATTER_CORE_CP190_PACK_BINDING,
    MATTER_CORE_CP190_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp190ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp190Coverage(planPack);
  const boundary = validateMatterCoreCp190FailureReceiptTaxonomyBoundary();
  return freezeResult(
    {
      review_packet: "C05.CP00-190.matter_core_failure_receipt_taxonomy_boundary",
      gate: MATTER_CORE_CP190_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP190_FAILURE_RECEIPT_TAXONOMY_BOUNDARY_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP190_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      failure_receipt_taxonomy_boundary_valid: boundary.valid,
      source_synthetic_fixture_failure_evidence_continuation_pack_id:
        boundary.source_synthetic_fixture_failure_evidence_continuation_pack_id,
      review_sequence: MATTER_CORE_CP190_FAILURE_RECEIPT_TAXONOMY_BOUNDARY_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-190 keep blocked-claim receipt, failure fixture, audit failure hint, Hermes failure evidence, Claude edge-case prompt, human escalation note, failure taxonomy, and missing tenant failure as descriptor-only refs?",
        "Does CP00-190 avoid executing failure recovery, rollback, retry, permission runtime, audit writes, API handlers, live DOM, CitationLedger, or Loop?",
        "Are customer-safe error codes present without leaking permission decision details, audit event bodies, raw payloads, or unauthorized counts?",
        "Does CP00-190 preserve Claude as a read-only reviewer and avoid final approval or enterprise trust claims?",
        "Does CP00-190 hand off to CP00-191 / RP05.P07.M04.S03 without moving future functionality early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP190_FAILURE_RECEIPT_TAXONOMY_BOUNDARY_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP190_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP190_PACK_BINDING,
    MATTER_CORE_CP190_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp190CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-190-to-CP00-191",
      from_pack_id: MATTER_CORE_CP190_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP190_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP190_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP190_PACK_BINDING.range,
      open_scope:
        "Continue RP05.P07.M04.S03 onward generated failure boundary rows in CP00-191 without executing failure recovery, permission runtime, audit writes, CitationLedger, or Loop.",
      production_ready_flag: MATTER_CORE_CP190_PACK_BINDING.production_ready_flag,
      source_synthetic_fixture_failure_evidence_continuation_pack_id: MATTER_CORE_CP189_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP190_PACK_BINDING,
    MATTER_CORE_CP190_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp191CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const unitTitles = [];
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    unitTitles.push(unit.title);
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      unit_titles: Object.freeze(unitTitles),
      required_secondary_workflow_controls:
        MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS.secondary_workflow_controls,
      required_permission_audit_binding_controls:
        MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS.permission_audit_binding_controls,
    },
    MATTER_CORE_CP191_PACK_BINDING,
    MATTER_CORE_CP191_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp191Coverage(planPack) {
  const errors = [];
  const requirements = MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS;
  if (!planPack) errors.push("CP00-191 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP191_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-191");
  if (planPack?.risk_class !== MATTER_CORE_CP191_PACK_BINDING.risk_class) errors.push("CP00-191 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP191_PACK_BINDING.unit_count) errors.push("CP00-191 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP191_PACK_BINDING.first_unit_id) errors.push("CP00-191 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP191_PACK_BINDING.last_unit_id) errors.push("CP00-191 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-191 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-191 must only include RP05 units");

  const summary = createMatterCoreCp191CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-191 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-191 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-191 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-191 ${microTitle} distribution drift`);
  }
  for (const title of [
    "Missing actor failure",
    "Missing Matter failure",
    "Missing resource failure",
    "Unknown action failure",
    "Cross-tenant failure",
    "Permission denied failure",
    "Ambiguous rule failure",
    "Stale reference failure",
    "Lock conflict failure",
    "Retry exhaustion failure",
    "Rollback expectation",
    "Compensation expectation",
    "Blocked-claim receipt",
    "Failure fixture",
    "Failure unit test",
    "Failure integration smoke",
    "Audit failure hint",
    "Hermes failure evidence",
    "Claude edge-case prompt",
    "Human escalation note",
    "Failure taxonomy",
    "Missing tenant failure",
  ]) {
    if (!summary.unit_titles.some((unitTitle) => unitTitle.toLowerCase() === title.toLowerCase())) {
      errors.push(`CP00-191 missing planned unit title ${title}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP191_PACK_BINDING,
    MATTER_CORE_CP191_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp191GeneratedFailureRecoveryBinding(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS;
  if (requirements.source_failure_receipt_taxonomy_boundary_pack_id !== MATTER_CORE_CP190_PACK_BINDING.pack_id) {
    errors.push("CP00-191 must inherit CP00-190 failure receipt taxonomy boundary");
  }
  if (requirements.source_permission_substrate_workflow_binding_pack_id !== MATTER_CORE_CP187_PACK_BINDING.pack_id) {
    errors.push("CP00-191 must preserve CP00-187 permission substrate workflow binding as source");
  }
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-191 must not write product state");
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-191 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-191 must not write audit events");
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-191 must not dispatch review routes");
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-191 must not dispatch approval routes");
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.executes_rollback !== false) errors.push("CP00-191 must not execute rollback");
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.executes_retry !== false) errors.push("CP00-191 must not execute retry");
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-191 must not render live DOM");
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-191 must not execute API handlers");
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-191 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-191 must not leak audit event body");
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-191 must not implement Loop engine");
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-191 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP191_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-191 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP191_PACK_BINDING.pack_id,
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(
      contractProjection.current_pack.pack_id,
    )
  ) {
    errors.push("CP00-191 contract current_pack drift");
  }
  if (
    contractProjection?.generated_failure_recovery_binding?.pack_id
    && contractProjection.generated_failure_recovery_binding.pack_id !== MATTER_CORE_CP191_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-191 contract generated failure recovery binding section drift");
  }
  if (
    contractProjection?.failure_receipt_taxonomy_boundary?.pack_id
    && contractProjection.failure_receipt_taxonomy_boundary.pack_id !== MATTER_CORE_CP190_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-191 must keep CP00-190 failure receipt taxonomy boundary as source");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP191_PACK_BINDING.pack_id) errors.push("CP00-191 descriptor pack drift");
    if (descriptor.source_failure_receipt_taxonomy_boundary_pack_id !== MATTER_CORE_CP190_PACK_BINDING.pack_id) {
      errors.push("CP00-191 descriptor must source CP00-190 boundary pack");
    }
    if (descriptor.generated_failure_row_count !== MATTER_CORE_CP191_PACK_BINDING.unit_count) {
      errors.push("CP00-191 descriptor row count drift");
    }
    for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
      if (descriptor.rows_by_micro_phase?.[microPhase] !== count) errors.push(`CP00-191 descriptor ${microPhase} row count drift`);
    }
    if (descriptor.rows_by_group?.["secondary-workflow"] !== 20) errors.push("CP00-191 secondary workflow row count drift");
    if (descriptor.rows_by_group?.["permission-audit-binding"] !== 20) errors.push("CP00-191 permission audit binding row count drift");
    const emittedBoundaryRefs = new Set();
    const emittedSafeCodes = new Set();
    for (const row of descriptor.generated_failure_rows ?? []) {
      for (const [key, value] of Object.entries(row)) {
        if (key.endsWith("_ref") && value) emittedBoundaryRefs.add(key);
      }
      for (const code of row.customer_safe_error_codes ?? []) emittedSafeCodes.add(code);
      if (Array.isArray(row.customer_safe_error_codes) && row.customer_safe_error_codes.length > 0) {
        emittedBoundaryRefs.add("customer_safe_error_codes");
      }
    }
    for (const boundaryRef of requirements.required_boundary_refs) {
      if (!emittedBoundaryRefs.has(boundaryRef)) errors.push(`CP00-191 descriptor missing emitted boundary ref ${boundaryRef}`);
    }
    for (const control of [...requirements.secondary_workflow_controls, ...requirements.permission_audit_binding_controls]) {
      if (!descriptor.generated_failure_rows?.some((row) => row.control === control)) {
        errors.push(`CP00-191 descriptor missing control ${control}`);
      }
    }
    for (const safeCode of requirements.required_customer_safe_error_codes) {
      if (!emittedSafeCodes.has(safeCode)) errors.push(`CP00-191 descriptor missing customer-safe error ${safeCode}`);
    }
    for (const outcome of requirements.required_outcomes) {
      if (!descriptor.rows_by_outcome?.[outcome]?.length) errors.push(`CP00-191 descriptor missing outcome ${outcome}`);
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "permission_denied_failure")) {
      errors.push("CP00-191 permission denied failure row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "cross_tenant_failure")) {
      errors.push("CP00-191 cross tenant failure row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.review_required?.some((row) => row.control === "claude_edge_case_prompt")) {
      errors.push("CP00-191 Claude edge-case prompt row must be review_required");
    }
    if (!descriptor.rows_by_outcome?.approval_required?.some((row) => row.control === "human_escalation_note")) {
      errors.push("CP00-191 human escalation note row must be approval_required");
    }
    for (const guard of [
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "no_route_dispatch",
      "no_failure_recovery_execution",
      "replay_commands_inert",
    ]) {
      if (descriptor.leak_guards?.[guard] !== true) errors.push(`CP00-191 descriptor missing leak guard ${guard}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_failure_receipt_taxonomy_boundary_pack_id: requirements.source_failure_receipt_taxonomy_boundary_pack_id,
      required_secondary_workflow_controls: requirements.secondary_workflow_controls,
      required_permission_audit_binding_controls: requirements.permission_audit_binding_controls,
      required_boundary_refs: requirements.required_boundary_refs,
      required_customer_safe_error_codes: requirements.required_customer_safe_error_codes,
      required_no_leak_guards: requirements.required_no_leak_guards,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP191_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP191_PACK_BINDING,
    MATTER_CORE_CP191_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp191HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp191Coverage(planPack);
  const binding = validateMatterCoreCp191GeneratedFailureRecoveryBinding(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-191.matter_core_generated_failure_recovery_binding",
      gate: MATTER_CORE_CP191_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      generated_failure_recovery_binding_valid: binding.valid,
      source_failure_receipt_taxonomy_boundary_pack_id: binding.source_failure_receipt_taxonomy_boundary_pack_id,
      required_secondary_workflow_controls: binding.required_secondary_workflow_controls,
      required_permission_audit_binding_controls: binding.required_permission_audit_binding_controls,
      required_customer_safe_error_codes: binding.required_customer_safe_error_codes,
      required_no_leak_guards: binding.required_no_leak_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP191_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP191_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && binding.valid,
    },
    MATTER_CORE_CP191_PACK_BINDING,
    MATTER_CORE_CP191_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp191ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp191Coverage(planPack);
  const binding = validateMatterCoreCp191GeneratedFailureRecoveryBinding();
  return freezeResult(
    {
      review_packet: "C05.CP00-191.matter_core_generated_failure_recovery_binding",
      gate: MATTER_CORE_CP191_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP191_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      generated_failure_recovery_binding_valid: binding.valid,
      source_failure_receipt_taxonomy_boundary_pack_id: binding.source_failure_receipt_taxonomy_boundary_pack_id,
      review_sequence: MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-191 cover all 40 planned failure recovery and permission/audit binding units without splitting into smaller packs?",
        "Does CP00-191 keep missing actor, missing matter, cross-tenant, permission denied, stale reference, lock conflict, retry exhaustion, and rollback rows fail-closed?",
        "Does CP00-191 avoid executing permission evaluation, audit writes, rollback, retry, API handlers, route dispatch, live DOM, Citation Ledger, or Loop?",
        "Are customer-safe error codes and refs present without leaking permission decision details, audit event bodies, raw payloads, or unauthorized counts?",
        "Does CP00-191 preserve Claude as a read-only reviewer and hand off to CP00-192 / RP05.P07.M05.S21 without moving future functionality early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP191_GENERATED_FAILURE_RECOVERY_BINDING_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP191_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP191_PACK_BINDING,
    MATTER_CORE_CP191_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp191CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-191-to-CP00-192",
      from_pack_id: MATTER_CORE_CP191_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP191_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP191_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP191_PACK_BINDING.range,
      open_scope:
        "Continue RP05.P07.M05.S21 onward generated Claude/human handoff tail and RP05.P07 terminal rows in CP00-192 without executing runtime permission, audit writes, recovery, CitationLedger, or Loop.",
      production_ready_flag: MATTER_CORE_CP191_PACK_BINDING.production_ready_flag,
      source_failure_receipt_taxonomy_boundary_pack_id: MATTER_CORE_CP190_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP191_PACK_BINDING,
    MATTER_CORE_CP191_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp192CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const unitTitles = [];
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    unitTitles.push(unit.title);
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      unit_titles: Object.freeze(unitTitles),
      required_tail_review_controls: MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS.tail_review_controls,
      required_fixture_entry_controls: MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS.fixture_entry_controls,
    },
    MATTER_CORE_CP192_PACK_BINDING,
    MATTER_CORE_CP192_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp192Coverage(planPack) {
  const errors = [];
  const requirements = MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS;
  if (!planPack) errors.push("CP00-192 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP192_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-192");
  if (planPack?.risk_class !== MATTER_CORE_CP192_PACK_BINDING.risk_class) errors.push("CP00-192 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP192_PACK_BINDING.unit_count) errors.push("CP00-192 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP192_PACK_BINDING.first_unit_id) errors.push("CP00-192 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP192_PACK_BINDING.last_unit_id) errors.push("CP00-192 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-192 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-192 must only include RP05 units");

  const summary = createMatterCoreCp192CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-192 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-192 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-192 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-192 ${microTitle} distribution drift`);
  }
  for (const title of [
    "Claude edge-case prompt",
    "Human escalation note",
    "Failure taxonomy",
    "Missing tenant failure",
    "Missing actor failure",
    "Missing Matter failure",
    "Missing resource failure",
    "Unknown action failure",
    "Cross-tenant failure",
    "Permission denied failure",
  ]) {
    if (!summary.unit_titles.some((unitTitle) => unitTitle.toLowerCase() === title.toLowerCase())) {
      errors.push(`CP00-192 missing planned unit title ${title}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP192_PACK_BINDING,
    MATTER_CORE_CP192_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp192FailureFixtureEntryBoundary(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS;
  if (requirements.source_generated_failure_recovery_binding_pack_id !== MATTER_CORE_CP191_PACK_BINDING.pack_id) {
    errors.push("CP00-192 must inherit CP00-191 generated failure recovery binding");
  }
  if (requirements.source_failure_receipt_taxonomy_boundary_pack_id !== MATTER_CORE_CP190_PACK_BINDING.pack_id) {
    errors.push("CP00-192 must preserve CP00-190 failure receipt taxonomy boundary as source");
  }
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-192 must not write product state");
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-192 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-192 must not write audit events");
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-192 must not dispatch review routes");
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-192 must not dispatch approval routes");
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.executes_rollback !== false) errors.push("CP00-192 must not execute rollback");
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.executes_retry !== false) errors.push("CP00-192 must not execute retry");
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-192 must not render live DOM");
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-192 must not execute API handlers");
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-192 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-192 must not leak audit event body");
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-192 must not implement Loop engine");
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-192 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP192_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-192 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP192_PACK_BINDING.pack_id,
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(
      contractProjection.current_pack.pack_id,
    )
  ) {
    errors.push("CP00-192 contract current_pack drift");
  }
  if (
    contractProjection?.failure_fixture_entry_boundary?.pack_id
    && contractProjection.failure_fixture_entry_boundary.pack_id !== MATTER_CORE_CP192_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-192 contract failure fixture entry boundary section drift");
  }
  if (
    contractProjection?.generated_failure_recovery_binding?.pack_id
    && contractProjection.generated_failure_recovery_binding.pack_id !== MATTER_CORE_CP191_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-192 must keep CP00-191 generated failure recovery binding as source");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP192_PACK_BINDING.pack_id) errors.push("CP00-192 descriptor pack drift");
    if (descriptor.source_generated_failure_recovery_binding_pack_id !== MATTER_CORE_CP191_PACK_BINDING.pack_id) {
      errors.push("CP00-192 descriptor must source CP00-191 binding pack");
    }
    if (descriptor.failure_fixture_entry_row_count !== MATTER_CORE_CP192_PACK_BINDING.unit_count) {
      errors.push("CP00-192 descriptor row count drift");
    }
    for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
      if (descriptor.rows_by_micro_phase?.[microPhase] !== count) errors.push(`CP00-192 descriptor ${microPhase} row count drift`);
    }
    if (descriptor.rows_by_group?.["review-escalation-tail"] !== 2) errors.push("CP00-192 review escalation tail row count drift");
    if (descriptor.rows_by_group?.["failure-fixture-entry"] !== 8) errors.push("CP00-192 failure fixture entry row count drift");
    const emittedBoundaryRefs = new Set();
    const emittedSafeCodes = new Set();
    for (const row of descriptor.failure_fixture_entry_rows ?? []) {
      for (const [key, value] of Object.entries(row)) {
        if (key.endsWith("_ref") && value) emittedBoundaryRefs.add(key);
      }
      for (const code of row.customer_safe_error_codes ?? []) emittedSafeCodes.add(code);
      if (Array.isArray(row.customer_safe_error_codes) && row.customer_safe_error_codes.length > 0) {
        emittedBoundaryRefs.add("customer_safe_error_codes");
      }
    }
    for (const boundaryRef of requirements.required_boundary_refs) {
      if (!emittedBoundaryRefs.has(boundaryRef)) errors.push(`CP00-192 descriptor missing emitted boundary ref ${boundaryRef}`);
    }
    for (const control of [...requirements.tail_review_controls, ...requirements.fixture_entry_controls]) {
      if (!descriptor.failure_fixture_entry_rows?.some((row) => row.control === control)) {
        errors.push(`CP00-192 descriptor missing control ${control}`);
      }
    }
    for (const safeCode of requirements.required_customer_safe_error_codes) {
      if (!emittedSafeCodes.has(safeCode)) errors.push(`CP00-192 descriptor missing customer-safe error ${safeCode}`);
    }
    for (const outcome of requirements.required_outcomes) {
      if (!descriptor.rows_by_outcome?.[outcome]?.length) errors.push(`CP00-192 descriptor missing outcome ${outcome}`);
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "permission_denied_failure")) {
      errors.push("CP00-192 permission denied failure row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "cross_tenant_failure")) {
      errors.push("CP00-192 cross tenant failure row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.review_required?.some((row) => row.control === "claude_edge_case_prompt")) {
      errors.push("CP00-192 Claude edge-case prompt row must be review_required");
    }
    if (!descriptor.rows_by_outcome?.approval_required?.some((row) => row.control === "human_escalation_note")) {
      errors.push("CP00-192 human escalation note row must be approval_required");
    }
    for (const guard of [
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "no_route_dispatch",
      "no_failure_recovery_execution",
      "replay_commands_inert",
    ]) {
      if (descriptor.leak_guards?.[guard] !== true) errors.push(`CP00-192 descriptor missing leak guard ${guard}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_generated_failure_recovery_binding_pack_id: requirements.source_generated_failure_recovery_binding_pack_id,
      required_tail_review_controls: requirements.tail_review_controls,
      required_fixture_entry_controls: requirements.fixture_entry_controls,
      required_boundary_refs: requirements.required_boundary_refs,
      required_customer_safe_error_codes: requirements.required_customer_safe_error_codes,
      required_no_leak_guards: requirements.required_no_leak_guards,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP192_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP192_PACK_BINDING,
    MATTER_CORE_CP192_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp192HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp192Coverage(planPack);
  const boundary = validateMatterCoreCp192FailureFixtureEntryBoundary(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-192.matter_core_failure_fixture_entry_boundary",
      gate: MATTER_CORE_CP192_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      failure_fixture_entry_boundary_valid: boundary.valid,
      source_generated_failure_recovery_binding_pack_id: boundary.source_generated_failure_recovery_binding_pack_id,
      required_tail_review_controls: boundary.required_tail_review_controls,
      required_fixture_entry_controls: boundary.required_fixture_entry_controls,
      required_customer_safe_error_codes: boundary.required_customer_safe_error_codes,
      required_no_leak_guards: boundary.required_no_leak_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP192_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP192_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && boundary.valid,
    },
    MATTER_CORE_CP192_PACK_BINDING,
    MATTER_CORE_CP192_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp192ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp192Coverage(planPack);
  const boundary = validateMatterCoreCp192FailureFixtureEntryBoundary();
  return freezeResult(
    {
      review_packet: "C05.CP00-192.matter_core_failure_fixture_entry_boundary",
      gate: MATTER_CORE_CP192_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP192_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      failure_fixture_entry_boundary_valid: boundary.valid,
      source_generated_failure_recovery_binding_pack_id: boundary.source_generated_failure_recovery_binding_pack_id,
      review_sequence: MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-192 cover exactly the 10 planned Risk A units from RP05.P07.M05.S21 through RP05.P07.M06.S08?",
        "Does CP00-192 keep Claude edge-case and human escalation as review/approval refs without dispatching routes?",
        "Do missing tenant, actor, matter, resource, unknown action, cross-tenant, and permission denied rows fail closed with customer-safe codes?",
        "Does CP00-192 avoid permission evaluation, audit writes, rollback, retry, API handlers, live DOM, Citation Ledger, and Loop behavior?",
        "Does CP00-192 preserve Claude as a read-only reviewer and hand off to CP00-193 / RP05.P07.M06.S09 without moving future functionality early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP192_FAILURE_FIXTURE_ENTRY_BOUNDARY_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP192_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP192_PACK_BINDING,
    MATTER_CORE_CP192_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp192CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-192-to-CP00-193",
      from_pack_id: MATTER_CORE_CP192_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP192_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP192_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP192_PACK_BINDING.range,
      open_scope:
        "Continue RP05.P07.M06.S09 onward synthetic fixture/failure recovery rows in CP00-193 without executing runtime permission, audit writes, recovery, CitationLedger, or Loop.",
      production_ready_flag: MATTER_CORE_CP192_PACK_BINDING.production_ready_flag,
      source_generated_failure_recovery_binding_pack_id: MATTER_CORE_CP191_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP192_PACK_BINDING,
    MATTER_CORE_CP192_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp193CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const unitTitles = [];
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    unitTitles.push(unit.title);
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      unit_titles: Object.freeze(unitTitles),
      required_failure_controls: MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS.required_failure_controls,
      required_evidence_controls: MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS.required_evidence_controls,
    },
    MATTER_CORE_CP193_PACK_BINDING,
    MATTER_CORE_CP193_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp193Coverage(planPack) {
  const errors = [];
  const requirements = MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS;
  if (!planPack) errors.push("CP00-193 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP193_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-193");
  if (planPack?.risk_class !== MATTER_CORE_CP193_PACK_BINDING.risk_class) errors.push("CP00-193 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP193_PACK_BINDING.unit_count) errors.push("CP00-193 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP193_PACK_BINDING.first_unit_id) errors.push("CP00-193 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP193_PACK_BINDING.last_unit_id) errors.push("CP00-193 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-193 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-193 must only include RP05 units");

  const summary = createMatterCoreCp193CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-193 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-193 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-193 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-193 ${microTitle} distribution drift`);
  }
  for (const title of [
    "Ambiguous rule failure",
    "Stale reference failure",
    "Lock conflict failure",
    "Retry exhaustion failure",
    "Rollback expectation",
    "Compensation expectation",
    "Blocked-claim receipt",
    "Failure fixture",
    "Failure unit test",
    "Failure integration smoke",
    "Audit failure hint",
    "Hermes failure evidence",
    "Claude edge-case prompt",
    "Human escalation note",
    "Hermes command matrix",
    "Evidence field list",
    "Changed-file receipt",
    "Command result receipt",
    "PASS semantics",
    "PASS_WITH_FINDINGS semantics",
    "BLOCK semantics",
    "Closeout handoff",
    "Regression receipt",
  ]) {
    if (!summary.unit_titles.some((unitTitle) => unitTitle.toLowerCase() === title.toLowerCase())) {
      errors.push(`CP00-193 missing planned unit title ${title}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP193_PACK_BINDING,
    MATTER_CORE_CP193_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp193FailureFixtureEvidenceReviewBridge(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS;
  if (requirements.source_failure_fixture_entry_boundary_pack_id !== MATTER_CORE_CP192_PACK_BINDING.pack_id) {
    errors.push("CP00-193 must inherit CP00-192 failure fixture entry boundary");
  }
  if (requirements.source_generated_failure_recovery_binding_pack_id !== MATTER_CORE_CP191_PACK_BINDING.pack_id) {
    errors.push("CP00-193 must keep CP00-191 generated failure recovery binding as source");
  }
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-193 must not write product state");
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-193 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-193 must not write audit events");
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-193 must not dispatch review routes");
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-193 must not dispatch approval routes");
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.executes_rollback !== false) errors.push("CP00-193 must not execute rollback");
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.executes_retry !== false) errors.push("CP00-193 must not execute retry");
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-193 must not render live DOM");
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-193 must not execute API handlers");
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-193 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-193 must not leak audit event body");
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-193 must not implement Loop engine");
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-193 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP193_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-193 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP193_PACK_BINDING.pack_id,
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(
      contractProjection.current_pack.pack_id,
    )
  ) {
    errors.push("CP00-193 contract current_pack drift");
  }
  if (
    contractProjection?.failure_fixture_evidence_review_bridge?.pack_id
    && contractProjection.failure_fixture_evidence_review_bridge.pack_id !== MATTER_CORE_CP193_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-193 contract failure fixture evidence review bridge section drift");
  }
  if (
    contractProjection?.failure_fixture_entry_boundary?.pack_id
    && contractProjection.failure_fixture_entry_boundary.pack_id !== MATTER_CORE_CP192_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-193 must keep CP00-192 failure fixture entry boundary as source");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP193_PACK_BINDING.pack_id) errors.push("CP00-193 descriptor pack drift");
    if (descriptor.source_failure_fixture_entry_boundary_pack_id !== MATTER_CORE_CP192_PACK_BINDING.pack_id) {
      errors.push("CP00-193 descriptor must source CP00-192 entry boundary pack");
    }
    if (descriptor.failure_fixture_evidence_review_row_count !== MATTER_CORE_CP193_PACK_BINDING.unit_count) {
      errors.push("CP00-193 descriptor row count drift");
    }
    for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
      if (descriptor.rows_by_micro_phase?.[microPhase] !== count) errors.push(`CP00-193 descriptor ${microPhase} row count drift`);
    }
    for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
      if (descriptor.rows_by_micro_title?.[microTitle] !== count) errors.push(`CP00-193 descriptor ${microTitle} row count drift`);
    }
    for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
      if (descriptor.rows_by_deliverable?.[deliverable] !== count) {
        errors.push(`CP00-193 descriptor ${deliverable} deliverable count drift`);
      }
    }
    const emittedBoundaryRefs = new Set();
    const emittedSafeCodes = new Set();
    for (const row of descriptor.failure_fixture_evidence_review_rows ?? []) {
      for (const [key, value] of Object.entries(row)) {
        if (key.endsWith("_ref") && value) emittedBoundaryRefs.add(key);
      }
      for (const code of row.customer_safe_error_codes ?? []) emittedSafeCodes.add(code);
      if (Array.isArray(row.customer_safe_error_codes) && row.customer_safe_error_codes.length > 0) {
        emittedBoundaryRefs.add("customer_safe_error_codes");
      }
    }
    for (const boundaryRef of requirements.required_boundary_refs) {
      if (!emittedBoundaryRefs.has(boundaryRef)) errors.push(`CP00-193 descriptor missing emitted boundary ref ${boundaryRef}`);
    }
    for (const control of [...requirements.required_failure_controls, ...requirements.required_evidence_controls]) {
      if (!descriptor.failure_fixture_evidence_review_rows?.some((row) => row.control === control)) {
        errors.push(`CP00-193 descriptor missing control ${control}`);
      }
    }
    for (const safeCode of requirements.required_customer_safe_error_codes) {
      if (!emittedSafeCodes.has(safeCode)) errors.push(`CP00-193 descriptor missing customer-safe error ${safeCode}`);
    }
    for (const outcome of requirements.required_outcomes) {
      if (!descriptor.rows_by_outcome?.[outcome]?.length) errors.push(`CP00-193 descriptor missing outcome ${outcome}`);
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "permission_denied_failure")) {
      errors.push("CP00-193 permission denied failure row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "block_semantics")) {
      errors.push("CP00-193 block semantics row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.review_required?.some((row) => row.control === "claude_dependency_marker")) {
      errors.push("CP00-193 Claude dependency marker row must be review_required");
    }
    if (!descriptor.rows_by_outcome?.approval_required?.some((row) => row.control === "human_approval_marker")) {
      errors.push("CP00-193 human approval marker row must be approval_required");
    }
    for (const guard of [
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "no_route_dispatch",
      "no_failure_recovery_execution",
      "replay_commands_inert",
    ]) {
      if (descriptor.leak_guards?.[guard] !== true) errors.push(`CP00-193 descriptor missing leak guard ${guard}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_failure_fixture_entry_boundary_pack_id: requirements.source_failure_fixture_entry_boundary_pack_id,
      required_failure_controls: requirements.required_failure_controls,
      required_evidence_controls: requirements.required_evidence_controls,
      required_boundary_refs: requirements.required_boundary_refs,
      required_customer_safe_error_codes: requirements.required_customer_safe_error_codes,
      required_no_leak_guards: requirements.required_no_leak_guards,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP193_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP193_PACK_BINDING,
    MATTER_CORE_CP193_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp193HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp193Coverage(planPack);
  const bridge = validateMatterCoreCp193FailureFixtureEvidenceReviewBridge(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-193.matter_core_failure_fixture_evidence_review_bridge",
      gate: MATTER_CORE_CP193_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      failure_fixture_evidence_review_bridge_valid: bridge.valid,
      source_failure_fixture_entry_boundary_pack_id: bridge.source_failure_fixture_entry_boundary_pack_id,
      required_failure_controls: bridge.required_failure_controls,
      required_evidence_controls: bridge.required_evidence_controls,
      required_customer_safe_error_codes: bridge.required_customer_safe_error_codes,
      required_no_leak_guards: bridge.required_no_leak_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP193_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP193_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && bridge.valid,
    },
    MATTER_CORE_CP193_PACK_BINDING,
    MATTER_CORE_CP193_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp193ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp193Coverage(planPack);
  const bridge = validateMatterCoreCp193FailureFixtureEvidenceReviewBridge();
  return freezeResult(
    {
      review_packet: "C05.CP00-193.matter_core_failure_fixture_evidence_review_bridge",
      gate: MATTER_CORE_CP193_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP193_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      failure_fixture_evidence_review_bridge_valid: bridge.valid,
      source_failure_fixture_entry_boundary_pack_id: bridge.source_failure_fixture_entry_boundary_pack_id,
      review_sequence: MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-193 cover exactly the 150 planned Risk C units from RP05.P07.M06.S09 through RP05.P08.M04.S19?",
        "Does CP00-193 group repeated failure fixture, golden test, Hermes evidence, Claude review, and closeout rows without splitting into isolated unit closeouts?",
        "Do blocked failure rows and BLOCK semantics fail closed while Claude/human markers remain review/approval refs only?",
        "Does CP00-193 avoid permission evaluation, audit writes, rollback, retry, API handlers, live DOM, Citation Ledger, and Loop behavior?",
        "Does CP00-193 preserve Claude as a read-only reviewer and hand off to CP00-194 / RP05.P08.M04.S20 without moving future functionality early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP193_FAILURE_FIXTURE_EVIDENCE_REVIEW_BRIDGE_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP193_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP193_PACK_BINDING,
    MATTER_CORE_CP193_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp193CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-193-to-CP00-194",
      from_pack_id: MATTER_CORE_CP193_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP193_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP193_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP193_PACK_BINDING.range,
      open_scope:
        "Continue RP05.P08.M04.S20 onward secondary workflow terminal and recovery fixture rows in CP00-194 without executing runtime permission, audit writes, recovery, CitationLedger, or Loop.",
      production_ready_flag: MATTER_CORE_CP193_PACK_BINDING.production_ready_flag,
      source_failure_fixture_entry_boundary_pack_id: MATTER_CORE_CP192_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP193_PACK_BINDING,
    MATTER_CORE_CP193_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp194CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const unitTitles = [];
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    unitTitles.push(unit.title);
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      unit_titles: Object.freeze(unitTitles),
      required_evidence_controls: MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS.required_evidence_controls,
    },
    MATTER_CORE_CP194_PACK_BINDING,
    MATTER_CORE_CP194_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp194Coverage(planPack) {
  const errors = [];
  const requirements = MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS;
  if (!planPack) errors.push("CP00-194 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP194_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-194");
  if (planPack?.risk_class !== MATTER_CORE_CP194_PACK_BINDING.risk_class) errors.push("CP00-194 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP194_PACK_BINDING.unit_count) errors.push("CP00-194 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP194_PACK_BINDING.first_unit_id) errors.push("CP00-194 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP194_PACK_BINDING.last_unit_id) errors.push("CP00-194 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-194 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-194 must only include RP05 units");

  const summary = createMatterCoreCp194CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-194 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-194 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-194 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-194 ${microTitle} distribution drift`);
  }
  for (const title of [
    "Next gate readiness",
    "Hermes command matrix",
    "Evidence field list",
    "Changed-file receipt",
    "Command result receipt",
    "Fixture summary receipt",
    "Blocked-claim receipt",
    "Permission summary receipt",
    "Audit summary receipt",
    "No-real-data receipt",
    "Claude dependency marker",
    "Human approval marker",
    "PASS semantics",
    "PASS_WITH_FINDINGS semantics",
    "BLOCK semantics",
    "Evidence template",
    "Validation command check",
    "Harness boundary note",
    "Closeout handoff",
    "Regression receipt",
    "Documentation update",
    "Operator summary",
  ]) {
    if (!summary.unit_titles.some((unitTitle) => unitTitle.toLowerCase() === title.toLowerCase())) {
      errors.push(`CP00-194 missing planned unit title ${title}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP194_PACK_BINDING,
    MATTER_CORE_CP194_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp194PermissionAuditEvidenceTerminalBridge(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS;
  if (requirements.source_failure_fixture_evidence_review_bridge_pack_id !== MATTER_CORE_CP193_PACK_BINDING.pack_id) {
    errors.push("CP00-194 must inherit CP00-193 evidence review bridge");
  }
  if (requirements.source_permission_substrate_workflow_binding_pack_id !== MATTER_CORE_CP187_PACK_BINDING.pack_id) {
    errors.push("CP00-194 must preserve CP00-187 permission substrate workflow binding as source");
  }
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-194 must not write product state");
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-194 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-194 must not write audit events");
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-194 must not dispatch review routes");
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-194 must not dispatch approval routes");
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.executes_rollback !== false) errors.push("CP00-194 must not execute rollback");
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.executes_retry !== false) errors.push("CP00-194 must not execute retry");
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-194 must not render live DOM");
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-194 must not execute API handlers");
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-194 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-194 must not leak audit event body");
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-194 must not implement Loop engine");
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-194 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP194_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-194 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![
      MATTER_CORE_CP194_PACK_BINDING.pack_id,
      MATTER_CORE_CP195_PACK_BINDING.pack_id,
      MATTER_CORE_CP196_PACK_BINDING.pack_id,
      MATTER_CORE_CP197_PACK_BINDING.pack_id,
    ].includes(
      contractProjection.current_pack.pack_id,
    )
  ) {
    errors.push("CP00-194 contract current_pack drift");
  }
  if (
    contractProjection?.permission_audit_evidence_terminal_bridge?.pack_id
    && contractProjection.permission_audit_evidence_terminal_bridge.pack_id !== MATTER_CORE_CP194_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-194 contract permission audit evidence terminal bridge section drift");
  }
  if (
    contractProjection?.failure_fixture_evidence_review_bridge?.pack_id
    && contractProjection.failure_fixture_evidence_review_bridge.pack_id !== MATTER_CORE_CP193_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-194 must keep CP00-193 evidence review bridge as source");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP194_PACK_BINDING.pack_id) errors.push("CP00-194 descriptor pack drift");
    if (descriptor.source_failure_fixture_evidence_review_bridge_pack_id !== MATTER_CORE_CP193_PACK_BINDING.pack_id) {
      errors.push("CP00-194 descriptor must source CP00-193 evidence review bridge pack");
    }
    if (descriptor.permission_audit_evidence_terminal_row_count !== MATTER_CORE_CP194_PACK_BINDING.unit_count) {
      errors.push("CP00-194 descriptor row count drift");
    }
    for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
      if (descriptor.rows_by_micro_phase?.[microPhase] !== count) errors.push(`CP00-194 descriptor ${microPhase} row count drift`);
    }
    for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
      if (descriptor.rows_by_micro_title?.[microTitle] !== count) errors.push(`CP00-194 descriptor ${microTitle} row count drift`);
    }
    for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
      if (descriptor.rows_by_deliverable?.[deliverable] !== count) {
        errors.push(`CP00-194 descriptor ${deliverable} deliverable count drift`);
      }
    }
    const emittedBoundaryRefs = new Set();
    const emittedSafeCodes = new Set();
    for (const row of descriptor.permission_audit_evidence_terminal_rows ?? []) {
      for (const [key, value] of Object.entries(row)) {
        if (key.endsWith("_ref") && value) emittedBoundaryRefs.add(key);
      }
      for (const code of row.customer_safe_error_codes ?? []) emittedSafeCodes.add(code);
      if (Array.isArray(row.customer_safe_error_codes) && row.customer_safe_error_codes.length > 0) {
        emittedBoundaryRefs.add("customer_safe_error_codes");
      }
    }
    for (const boundaryRef of requirements.required_boundary_refs) {
      if (!emittedBoundaryRefs.has(boundaryRef)) errors.push(`CP00-194 descriptor missing emitted boundary ref ${boundaryRef}`);
    }
    for (const control of requirements.required_evidence_controls) {
      if (!descriptor.permission_audit_evidence_terminal_rows?.some((row) => row.control === control)) {
        errors.push(`CP00-194 descriptor missing control ${control}`);
      }
    }
    for (const safeCode of requirements.required_customer_safe_error_codes) {
      if (!emittedSafeCodes.has(safeCode)) errors.push(`CP00-194 descriptor missing customer-safe error ${safeCode}`);
    }
    for (const outcome of requirements.required_outcomes) {
      if (!descriptor.rows_by_outcome?.[outcome]?.length) errors.push(`CP00-194 descriptor missing outcome ${outcome}`);
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "block_semantics")) {
      errors.push("CP00-194 block semantics row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.review_required?.some((row) => row.control === "claude_dependency_marker")) {
      errors.push("CP00-194 Claude dependency marker row must be review_required");
    }
    if (!descriptor.rows_by_outcome?.approval_required?.some((row) => row.control === "human_approval_marker")) {
      errors.push("CP00-194 human approval marker row must be approval_required");
    }
    for (const guard of [
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "no_route_dispatch",
      "no_failure_recovery_execution",
      "replay_commands_inert",
    ]) {
      if (descriptor.leak_guards?.[guard] !== true) errors.push(`CP00-194 descriptor missing leak guard ${guard}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_failure_fixture_evidence_review_bridge_pack_id: requirements.source_failure_fixture_evidence_review_bridge_pack_id,
      required_evidence_controls: requirements.required_evidence_controls,
      required_boundary_refs: requirements.required_boundary_refs,
      required_customer_safe_error_codes: requirements.required_customer_safe_error_codes,
      required_no_leak_guards: requirements.required_no_leak_guards,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP194_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP194_PACK_BINDING,
    MATTER_CORE_CP194_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp194HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp194Coverage(planPack);
  const bridge = validateMatterCoreCp194PermissionAuditEvidenceTerminalBridge(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-194.matter_core_permission_audit_evidence_terminal_bridge",
      gate: MATTER_CORE_CP194_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      permission_audit_evidence_terminal_bridge_valid: bridge.valid,
      source_failure_fixture_evidence_review_bridge_pack_id: bridge.source_failure_fixture_evidence_review_bridge_pack_id,
      required_evidence_controls: bridge.required_evidence_controls,
      required_customer_safe_error_codes: bridge.required_customer_safe_error_codes,
      required_no_leak_guards: bridge.required_no_leak_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP194_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP194_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && bridge.valid,
    },
    MATTER_CORE_CP194_PACK_BINDING,
    MATTER_CORE_CP194_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp194ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp194Coverage(planPack);
  const bridge = validateMatterCoreCp194PermissionAuditEvidenceTerminalBridge();
  return freezeResult(
    {
      review_packet: "C05.CP00-194.matter_core_permission_audit_evidence_terminal_bridge",
      gate: MATTER_CORE_CP194_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP194_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      permission_audit_evidence_terminal_bridge_valid: bridge.valid,
      source_failure_fixture_evidence_review_bridge_pack_id: bridge.source_failure_fixture_evidence_review_bridge_pack_id,
      review_sequence: MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-194 cover exactly the 40 planned Risk B units from RP05.P08.M04.S20 through RP05.P08.M06.S17?",
        "Does CP00-194 preserve permission/audit refs and customer-safe evidence semantics without evaluating runtime permissions or writing audit events?",
        "Do BLOCK, Claude dependency, and human approval markers remain descriptor-only outcomes rather than dispatched routes?",
        "Does CP00-194 avoid rollback, retry, API handlers, live DOM, Citation Ledger, and Loop behavior?",
        "Does CP00-194 preserve Claude as a read-only reviewer and hand off to CP00-195 / RP05.P08.M06.S18 without moving future functionality early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP194_PERMISSION_AUDIT_EVIDENCE_TERMINAL_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP194_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP194_PACK_BINDING,
    MATTER_CORE_CP194_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp194CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-194-to-CP00-195",
      from_pack_id: MATTER_CORE_CP194_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP194_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP194_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP194_PACK_BINDING.range,
      open_scope:
        "Continue RP05.P08.M06.S18 onward synthetic fixture terminal rows in CP00-195 without executing runtime permission, audit writes, recovery, CitationLedger, or Loop.",
      production_ready_flag: MATTER_CORE_CP194_PACK_BINDING.production_ready_flag,
      source_failure_fixture_evidence_review_bridge_pack_id: MATTER_CORE_CP193_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP194_PACK_BINDING,
    MATTER_CORE_CP194_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp195CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const unitTitles = [];
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    unitTitles.push(unit.title);
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      unit_titles: Object.freeze(unitTitles),
      required_terminal_controls:
        MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS.required_terminal_controls,
    },
    MATTER_CORE_CP195_PACK_BINDING,
    MATTER_CORE_CP195_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp195Coverage(planPack) {
  const errors = [];
  const requirements = MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS;
  if (!planPack) errors.push("CP00-195 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP195_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-195");
  if (planPack?.risk_class !== MATTER_CORE_CP195_PACK_BINDING.risk_class) errors.push("CP00-195 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP195_PACK_BINDING.unit_count) errors.push("CP00-195 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP195_PACK_BINDING.first_unit_id) errors.push("CP00-195 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP195_PACK_BINDING.last_unit_id) errors.push("CP00-195 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-195 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-195 must only include RP05 units");

  const summary = createMatterCoreCp195CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-195 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-195 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-195 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-195 ${microTitle} distribution drift`);
  }
  for (const microPhase of [...requirements.required_p08_micro_phases, ...requirements.required_p09_micro_phases]) {
    if (!summary.by_micro_phase[microPhase]) errors.push(`CP00-195 missing planned micro phase ${microPhase}`);
  }
  for (const title of [
    "Closeout handoff",
    "Regression receipt",
    "Next gate readiness",
    "Architecture review questions",
    "Security review questions",
    "Permission bypass questions",
    "Audit completeness questions",
    "UI leak questions",
    "Risk register",
    "Claude review packet",
    "Command rerun",
  ]) {
    if (!summary.unit_titles.some((unitTitle) => unitTitle.toLowerCase() === title.toLowerCase())) {
      errors.push(`CP00-195 missing planned unit title ${title}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP195_PACK_BINDING,
    MATTER_CORE_CP195_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp195EvidenceReviewHandoffTerminalBridge(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS;
  if (requirements.source_permission_audit_evidence_terminal_bridge_pack_id !== MATTER_CORE_CP194_PACK_BINDING.pack_id) {
    errors.push("CP00-195 must inherit CP00-194 permission/audit evidence terminal bridge");
  }
  if (requirements.source_failure_fixture_evidence_review_bridge_pack_id !== MATTER_CORE_CP193_PACK_BINDING.pack_id) {
    errors.push("CP00-195 must preserve CP00-193 failure fixture evidence review bridge as source");
  }
  if (requirements.source_permission_substrate_workflow_binding_pack_id !== MATTER_CORE_CP187_PACK_BINDING.pack_id) {
    errors.push("CP00-195 must preserve CP00-187 permission substrate workflow binding as source");
  }
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-195 must not write product state");
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-195 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-195 must not write audit events");
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-195 must not dispatch review routes");
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-195 must not dispatch approval routes");
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.executes_rollback !== false) errors.push("CP00-195 must not execute rollback");
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.executes_retry !== false) errors.push("CP00-195 must not execute retry");
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-195 must not render live DOM");
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-195 must not execute API handlers");
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-195 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-195 must not leak audit event body");
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-195 must not implement Loop engine");
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-195 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP195_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-195 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![MATTER_CORE_CP195_PACK_BINDING.pack_id, MATTER_CORE_CP196_PACK_BINDING.pack_id, MATTER_CORE_CP197_PACK_BINDING.pack_id].includes(
      contractProjection.current_pack.pack_id,
    )
  ) {
    errors.push("CP00-195 contract current_pack drift");
  }
  if (
    contractProjection?.evidence_review_handoff_terminal_bridge?.pack_id
    && contractProjection.evidence_review_handoff_terminal_bridge.pack_id !== MATTER_CORE_CP195_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-195 contract evidence review handoff terminal bridge section drift");
  }
  if (
    contractProjection?.permission_audit_evidence_terminal_bridge?.pack_id
    && contractProjection.permission_audit_evidence_terminal_bridge.pack_id !== MATTER_CORE_CP194_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-195 must keep CP00-194 permission/audit evidence terminal bridge as source");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP195_PACK_BINDING.pack_id) errors.push("CP00-195 descriptor pack drift");
    if (descriptor.source_permission_audit_evidence_terminal_bridge_pack_id !== MATTER_CORE_CP194_PACK_BINDING.pack_id) {
      errors.push("CP00-195 descriptor must source CP00-194 permission/audit evidence terminal bridge pack");
    }
    if (descriptor.evidence_review_handoff_terminal_row_count !== MATTER_CORE_CP195_PACK_BINDING.unit_count) {
      errors.push("CP00-195 descriptor row count drift");
    }
    for (const [phase, count] of Object.entries(requirements.phase_counts)) {
      if (descriptor.rows_by_phase?.[phase] !== count) errors.push(`CP00-195 descriptor ${phase} row count drift`);
    }
    for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
      if (descriptor.rows_by_micro_phase?.[microPhase] !== count) errors.push(`CP00-195 descriptor ${microPhase} row count drift`);
    }
    for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
      if (descriptor.rows_by_micro_title?.[microTitle] !== count) errors.push(`CP00-195 descriptor ${microTitle} row count drift`);
    }
    for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
      if (descriptor.rows_by_deliverable?.[deliverable] !== count) {
        errors.push(`CP00-195 descriptor ${deliverable} deliverable count drift`);
      }
    }
    const emittedSafeCodes = new Set();
    for (const row of descriptor.evidence_review_handoff_terminal_rows ?? []) {
      for (const code of row.customer_safe_error_codes ?? []) emittedSafeCodes.add(code);
    }
    for (const control of requirements.required_terminal_controls) {
      if (!descriptor.evidence_review_handoff_terminal_rows?.some((row) => row.control === control)) {
        errors.push(`CP00-195 descriptor missing terminal control ${control}`);
      }
    }
    for (const safeCode of requirements.required_customer_safe_error_codes) {
      if (!emittedSafeCodes.has(safeCode)) errors.push(`CP00-195 descriptor missing customer-safe error ${safeCode}`);
    }
    for (const outcome of requirements.required_outcomes) {
      if (!descriptor.rows_by_outcome?.[outcome]?.length) errors.push(`CP00-195 descriptor missing outcome ${outcome}`);
    }
    if (!descriptor.rows_by_outcome?.blocked?.some((row) => row.control === "permission_bypass_questions")) {
      errors.push("CP00-195 permission bypass questions row must be blocked");
    }
    if (!descriptor.rows_by_outcome?.review_required?.some((row) => row.control === "architecture_review_questions")) {
      errors.push("CP00-195 architecture review questions row must be review_required");
    }
    if (!descriptor.rows_by_outcome?.approval_required?.some((row) => row.control === "human_approval_summary")) {
      errors.push("CP00-195 human approval summary row must be approval_required");
    }
    if ((descriptor.security_audit_rows ?? []).length !== requirements.deliverable_counts.security_audit) {
      errors.push("CP00-195 security audit row count drift");
    }
    if ((descriptor.ui_leak_rows ?? []).length !== requirements.deliverable_counts.ui) {
      errors.push("CP00-195 UI leak row count drift");
    }
    for (const guard of [
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "no_route_dispatch",
      "no_failure_recovery_execution",
      "replay_commands_inert",
    ]) {
      if (descriptor.leak_guards?.[guard] !== true) errors.push(`CP00-195 descriptor missing leak guard ${guard}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_permission_audit_evidence_terminal_bridge_pack_id:
        requirements.source_permission_audit_evidence_terminal_bridge_pack_id,
      required_terminal_controls: requirements.required_terminal_controls,
      required_customer_safe_error_codes: requirements.required_customer_safe_error_codes,
      required_no_leak_guards: requirements.required_no_leak_guards,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP195_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP195_PACK_BINDING,
    MATTER_CORE_CP195_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp195HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp195Coverage(planPack);
  const bridge = validateMatterCoreCp195EvidenceReviewHandoffTerminalBridge(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-195.matter_core_evidence_review_handoff_terminal_bridge",
      gate: MATTER_CORE_CP195_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      evidence_review_handoff_terminal_bridge_valid: bridge.valid,
      source_permission_audit_evidence_terminal_bridge_pack_id:
        bridge.source_permission_audit_evidence_terminal_bridge_pack_id,
      required_terminal_controls: bridge.required_terminal_controls,
      required_customer_safe_error_codes: bridge.required_customer_safe_error_codes,
      required_no_leak_guards: bridge.required_no_leak_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP195_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP195_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && bridge.valid,
    },
    MATTER_CORE_CP195_PACK_BINDING,
    MATTER_CORE_CP195_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp195ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp195Coverage(planPack);
  const bridge = validateMatterCoreCp195EvidenceReviewHandoffTerminalBridge();
  return freezeResult(
    {
      review_packet: "C05.CP00-195.matter_core_evidence_review_handoff_terminal_bridge",
      gate: MATTER_CORE_CP195_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP195_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      evidence_review_handoff_terminal_bridge_valid: bridge.valid,
      source_permission_audit_evidence_terminal_bridge_pack_id:
        bridge.source_permission_audit_evidence_terminal_bridge_pack_id,
      review_sequence: MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-195 cover exactly the 150 planned Risk C units from RP05.P08.M06.S18 through RP05.P09.M07.S02?",
        "Does CP00-195 keep review questions, security/audit questions, UI leak questions, and risk routing as descriptor-only refs?",
        "Do blocked security/audit questions, Claude review questions, and human approval summaries remain non-dispatched outcomes?",
        "Does CP00-195 avoid runtime permission evaluation, audit writes, route dispatch, API handlers, live DOM, Citation Ledger, and Loop behavior?",
        "Does CP00-195 preserve Claude as a read-only reviewer and hand off to CP00-196 / RP05.P09.M07.S03 without moving future functionality early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP195_EVIDENCE_REVIEW_HANDOFF_TERMINAL_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP195_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP195_PACK_BINDING,
    MATTER_CORE_CP195_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp195CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-195-to-CP00-196",
      from_pack_id: MATTER_CORE_CP195_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP195_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP195_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP195_PACK_BINDING.range,
      open_scope:
        "Continue RP05.P09.M07.S03 onward Test And Golden Case Set security/audit rows in CP00-196 without executing runtime permission, audit writes, route dispatch, CitationLedger, or Loop.",
      production_ready_flag: MATTER_CORE_CP195_PACK_BINDING.production_ready_flag,
      source_permission_audit_evidence_terminal_bridge_pack_id: MATTER_CORE_CP194_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP195_PACK_BINDING,
    MATTER_CORE_CP195_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp196CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const unitTitles = [];
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    unitTitles.push(unit.title);
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      unit_titles: Object.freeze(unitTitles),
      required_question_controls: MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS.required_question_controls,
    },
    MATTER_CORE_CP196_PACK_BINDING,
    MATTER_CORE_CP196_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp196Coverage(planPack) {
  const errors = [];
  const requirements = MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS;
  if (!planPack) errors.push("CP00-196 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP196_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-196");
  if (planPack?.risk_class !== MATTER_CORE_CP196_PACK_BINDING.risk_class) errors.push("CP00-196 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP196_PACK_BINDING.unit_count) errors.push("CP00-196 unit count drift");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP196_PACK_BINDING.first_unit_id) errors.push("CP00-196 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP196_PACK_BINDING.last_unit_id) errors.push("CP00-196 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-196 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-196 must only include RP05 units");

  const summary = createMatterCoreCp196CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-196 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-196 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-196 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-196 ${microTitle} distribution drift`);
  }
  for (const title of [
    "Permission bypass questions",
    "Audit completeness questions",
    "Missing test questions",
    "UI leak questions",
    "Downstream readiness questions",
    "Risk register",
    "Severity taxonomy",
    "Go/no-go verdict format",
    "Finding routing map",
    "Human approval summary",
  ]) {
    if (!summary.unit_titles.some((unitTitle) => unitTitle.toLowerCase() === title.toLowerCase())) {
      errors.push(`CP00-196 missing planned unit title ${title}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP196_PACK_BINDING,
    MATTER_CORE_CP196_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp196ReviewQuestionSecurityGate(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS;
  if (requirements.source_evidence_review_handoff_terminal_bridge_pack_id !== MATTER_CORE_CP195_PACK_BINDING.pack_id) {
    errors.push("CP00-196 must source CP00-195 evidence review handoff terminal bridge");
  }
  if (requirements.source_permission_audit_evidence_terminal_bridge_pack_id !== MATTER_CORE_CP194_PACK_BINDING.pack_id) {
    errors.push("CP00-196 must inherit CP00-194 permission/audit evidence bridge");
  }
  if (MATTER_CORE_CP196_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-196 must not write product state");
  if (MATTER_CORE_CP196_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-196 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP196_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-196 must not write audit events");
  if (MATTER_CORE_CP196_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-196 must not dispatch review routes");
  if (MATTER_CORE_CP196_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-196 must not dispatch approval routes");
  if (MATTER_CORE_CP196_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-196 must not render live DOM");
  if (MATTER_CORE_CP196_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-196 must not execute API handlers");
  if (MATTER_CORE_CP196_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-196 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP196_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-196 must not leak audit event body");
  if (MATTER_CORE_CP196_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-196 must not implement Loop engine");
  if (MATTER_CORE_CP196_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-196 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP196_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-196 must not claim enterprise trust from local validation");
  }
  if (
    contractProjection?.current_pack?.pack_id
    && ![MATTER_CORE_CP196_PACK_BINDING.pack_id, MATTER_CORE_CP197_PACK_BINDING.pack_id].includes(contractProjection.current_pack.pack_id)
  ) {
    errors.push("CP00-196 contract current_pack drift");
  }
  if (
    contractProjection?.review_question_security_gate?.pack_id
    && contractProjection.review_question_security_gate.pack_id !== MATTER_CORE_CP196_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-196 contract review question security gate section drift");
  }
  if (
    contractProjection?.evidence_review_handoff_terminal_bridge?.pack_id
    && contractProjection.evidence_review_handoff_terminal_bridge.pack_id !== MATTER_CORE_CP195_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-196 must keep CP00-195 evidence review handoff terminal bridge as source");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP196_PACK_BINDING.pack_id) errors.push("CP00-196 descriptor pack drift");
    if (descriptor.source_evidence_review_handoff_terminal_bridge_pack_id !== MATTER_CORE_CP195_PACK_BINDING.pack_id) {
      errors.push("CP00-196 descriptor must source CP00-195");
    }
    if (descriptor.review_question_security_gate_row_count !== MATTER_CORE_CP196_PACK_BINDING.unit_count) {
      errors.push("CP00-196 descriptor row count drift");
    }
    for (const [phase, count] of Object.entries(requirements.phase_counts)) {
      if (descriptor.rows_by_phase?.[phase] !== count) errors.push(`CP00-196 descriptor ${phase} row count drift`);
    }
    for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
      if (descriptor.rows_by_micro_phase?.[microPhase] !== count) errors.push(`CP00-196 descriptor ${microPhase} row count drift`);
    }
    for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
      if (descriptor.rows_by_micro_title?.[microTitle] !== count) errors.push(`CP00-196 descriptor ${microTitle} row count drift`);
    }
    for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
      if (descriptor.rows_by_deliverable?.[deliverable] !== count) {
        errors.push(`CP00-196 descriptor ${deliverable} deliverable count drift`);
      }
    }
    for (const control of requirements.required_question_controls) {
      if (!descriptor.review_question_security_gate_rows?.some((row) => row.control === control)) {
        errors.push(`CP00-196 descriptor missing question control ${control}`);
      }
    }
    const emittedSafeCodes = new Set();
    for (const row of descriptor.review_question_security_gate_rows ?? []) {
      for (const code of row.customer_safe_error_codes ?? []) emittedSafeCodes.add(code);
    }
    for (const safeCode of requirements.required_customer_safe_error_codes) {
      if (!emittedSafeCodes.has(safeCode)) errors.push(`CP00-196 descriptor missing customer-safe error ${safeCode}`);
    }
    for (const outcome of requirements.required_outcomes) {
      if (!descriptor.rows_by_outcome?.[outcome]?.length) errors.push(`CP00-196 descriptor missing outcome ${outcome}`);
    }
    if ((descriptor.blocked_question_rows ?? []).length !== requirements.blocked_controls.length) {
      errors.push("CP00-196 blocked security question row count drift");
    }
    if ((descriptor.test_question_rows ?? []).length !== requirements.test_controls.length) {
      errors.push("CP00-196 missing-test question row count drift");
    }
    if ((descriptor.ui_leak_rows ?? []).length !== requirements.ui_guard_controls.length) {
      errors.push("CP00-196 UI leak row count drift");
    }
    if ((descriptor.human_approval_rows ?? []).length !== requirements.approval_required_controls.length) {
      errors.push("CP00-196 human approval row count drift");
    }
    for (const guard of [
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "no_route_dispatch",
      "no_failure_recovery_execution",
      "replay_commands_inert",
    ]) {
      if (descriptor.leak_guards?.[guard] !== true) errors.push(`CP00-196 descriptor missing leak guard ${guard}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_evidence_review_handoff_terminal_bridge_pack_id:
        requirements.source_evidence_review_handoff_terminal_bridge_pack_id,
      required_question_controls: requirements.required_question_controls,
      required_customer_safe_error_codes: requirements.required_customer_safe_error_codes,
      required_no_leak_guards: requirements.required_no_leak_guards,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP196_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP196_PACK_BINDING,
    MATTER_CORE_CP196_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp196HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp196Coverage(planPack);
  const gate = validateMatterCoreCp196ReviewQuestionSecurityGate(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-196.matter_core_review_question_security_gate",
      gate: MATTER_CORE_CP196_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      review_question_security_gate_valid: gate.valid,
      source_evidence_review_handoff_terminal_bridge_pack_id:
        gate.source_evidence_review_handoff_terminal_bridge_pack_id,
      required_question_controls: gate.required_question_controls,
      required_customer_safe_error_codes: gate.required_customer_safe_error_codes,
      required_no_leak_guards: gate.required_no_leak_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP196_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP196_PACK_BINDING.next_pack_id,
      production_ready_candidate: coverage.valid && gate.valid,
    },
    MATTER_CORE_CP196_PACK_BINDING,
    MATTER_CORE_CP196_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp196ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp196Coverage(planPack);
  const gate = validateMatterCoreCp196ReviewQuestionSecurityGate();
  return freezeResult(
    {
      review_packet: "C05.CP00-196.matter_core_review_question_security_gate",
      gate: MATTER_CORE_CP196_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP196_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      review_question_security_gate_valid: gate.valid,
      source_evidence_review_handoff_terminal_bridge_pack_id:
        gate.source_evidence_review_handoff_terminal_bridge_pack_id,
      review_sequence: MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-196 cover exactly the 10 planned Risk A units from RP05.P09.M07.S03 through RP05.P09.M07.S12?",
        "Do permission-bypass and audit-completeness questions remain blocked descriptor rows without leaking decision detail or audit bodies?",
        "Do missing-test, UI-leak, risk, severity, go/no-go, finding-routing, and human-approval rows remain descriptor-only references?",
        "Does CP00-196 avoid runtime permission evaluation, audit writes, route dispatch, API handlers, live DOM, Citation Ledger, and Loop behavior?",
        "Does CP00-196 preserve Claude as read-only review and hand off to CP00-197 / RP05.P09.M07.S13 without moving RP06 functionality early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP196_REVIEW_QUESTION_SECURITY_GATE_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP196_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP196_PACK_BINDING,
    MATTER_CORE_CP196_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp196CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-196-to-CP00-197",
      from_pack_id: MATTER_CORE_CP196_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP196_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP196_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP196_PACK_BINDING.range,
      open_scope:
        "Continue RP05.P09.M07.S13 onward review packet and terminal RP05.P09.M08-M10 rows in CP00-197 without moving RP06 DMS Core functionality early.",
      production_ready_flag: MATTER_CORE_CP196_PACK_BINDING.production_ready_flag,
      source_evidence_review_handoff_terminal_bridge_pack_id: MATTER_CORE_CP195_PACK_BINDING.pack_id,
      source_permission_audit_evidence_terminal_bridge_pack_id: MATTER_CORE_CP194_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
    },
    MATTER_CORE_CP196_PACK_BINDING,
    MATTER_CORE_CP196_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp197CoverageSummary(planPack) {
  const units = planPack?.included_units ?? [];
  const byDeliverable = {};
  const byPhase = {};
  const byMicroPhase = {};
  const byMicroTitle = {};
  const unitTitles = [];
  for (const unit of units) {
    byDeliverable[unit.deliverable_type] = (byDeliverable[unit.deliverable_type] ?? 0) + 1;
    byPhase[unit.phase_id] = (byPhase[unit.phase_id] ?? 0) + 1;
    byMicroPhase[unit.source_micro_phase_id] = (byMicroPhase[unit.source_micro_phase_id] ?? 0) + 1;
    byMicroTitle[unit.micro_title] = (byMicroTitle[unit.micro_title] ?? 0) + 1;
    unitTitles.push(unit.title);
  }
  return freezeResult(
    {
      first_unit_id: units.at(0)?.id,
      last_unit_id: units.at(-1)?.id,
      unit_count: units.length,
      by_deliverable: Object.freeze(byDeliverable),
      by_phase: Object.freeze(byPhase),
      by_micro_phase: Object.freeze(byMicroPhase),
      by_micro_title: Object.freeze(byMicroTitle),
      unit_titles: Object.freeze(unitTitles),
      required_terminal_controls: MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS.required_terminal_controls,
    },
    MATTER_CORE_CP197_PACK_BINDING,
    MATTER_CORE_CP197_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp197Coverage(planPack) {
  const errors = [];
  const requirements = MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS;
  if (!planPack) errors.push("CP00-197 plan pack is required");
  if (planPack?.pack_id !== MATTER_CORE_CP197_PACK_BINDING.pack_id) errors.push("plan pack must be CP00-197");
  if (planPack?.risk_class !== MATTER_CORE_CP197_PACK_BINDING.risk_class) errors.push("CP00-197 risk class drift");
  if (planPack?.unit_count !== MATTER_CORE_CP197_PACK_BINDING.unit_count) errors.push("CP00-197 unit count drift");
  if (!planPack?.override_reason) errors.push("CP00-197 must preserve Risk C override reason for 28-unit terminal boundary");
  const unitIds = (planPack?.included_units ?? []).map((unit) => unit.id);
  if (unitIds[0] !== MATTER_CORE_CP197_PACK_BINDING.first_unit_id) errors.push("CP00-197 first unit drift");
  if (unitIds.at(-1) !== MATTER_CORE_CP197_PACK_BINDING.last_unit_id) errors.push("CP00-197 last unit drift");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-197 duplicate unit IDs");
  if ((planPack?.included_units ?? []).some((unit) => unit.program_id !== "RP05")) errors.push("CP00-197 must only include RP05 units");

  const summary = createMatterCoreCp197CoverageSummary(planPack);
  for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
    if (summary.by_deliverable[deliverable] !== count) errors.push(`CP00-197 ${deliverable} distribution drift`);
  }
  for (const [phase, count] of Object.entries(requirements.phase_counts)) {
    if (summary.by_phase[phase] !== count) errors.push(`CP00-197 ${phase} distribution drift`);
  }
  for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
    if (summary.by_micro_phase[microPhase] !== count) errors.push(`CP00-197 ${microPhase} distribution drift`);
  }
  for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
    if (summary.by_micro_title[microTitle] !== count) errors.push(`CP00-197 ${microTitle} distribution drift`);
  }
  for (const title of [
    "Claude review packet",
    "Closeout criteria",
    "PASS closeout note",
    "PASS_WITH_FINDINGS closeout note",
    "BLOCK closeout note",
    "Next RP dependency",
    "Documentation update",
    "Command rerun",
    "Architecture review questions",
    "Security review questions",
    "Permission bypass questions",
    "Audit completeness questions",
    "Missing test questions",
    "UI leak questions",
    "Downstream readiness questions",
    "Risk register",
  ]) {
    if (!summary.unit_titles.some((unitTitle) => unitTitle.toLowerCase() === title.toLowerCase())) {
      errors.push(`CP00-197 missing planned unit title ${title}`);
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      summary,
    },
    MATTER_CORE_CP197_PACK_BINDING,
    MATTER_CORE_CP197_NO_WRITE_ATTESTATION,
  );
}

export function validateMatterCoreCp197TerminalReviewCloseoutHandoff(contractProjection = {}, descriptor = null) {
  const errors = [];
  const requirements = MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS;
  if (requirements.source_review_question_security_gate_pack_id !== MATTER_CORE_CP196_PACK_BINDING.pack_id) {
    errors.push("CP00-197 must source CP00-196 review question security gate");
  }
  if (requirements.source_evidence_review_handoff_terminal_bridge_pack_id !== MATTER_CORE_CP195_PACK_BINDING.pack_id) {
    errors.push("CP00-197 must preserve CP00-195 evidence review handoff source");
  }
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.writes_product_state !== false) errors.push("CP00-197 must not write product state");
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.evaluates_runtime_permission !== false) {
    errors.push("CP00-197 must not evaluate runtime permission");
  }
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.writes_audit_event !== false) errors.push("CP00-197 must not write audit events");
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.dispatches_review_route !== false) errors.push("CP00-197 must not dispatch review routes");
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.dispatches_approval_route !== false) errors.push("CP00-197 must not dispatch approval routes");
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.renders_live_dom !== false) errors.push("CP00-197 must not render live DOM");
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.executes_api_handler !== false) errors.push("CP00-197 must not execute API handlers");
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.leaks_permission_decision_detail !== false) {
    errors.push("CP00-197 must not leak permission decision detail");
  }
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.leaks_audit_event_body !== false) errors.push("CP00-197 must not leak audit event body");
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.implements_loop_engine !== false) errors.push("CP00-197 must not implement Loop engine");
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.implements_rp06_dms_runtime !== false) {
    errors.push("CP00-197 must not implement RP06 DMS runtime");
  }
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.promotes_claude_to_final_approval !== false) {
    errors.push("CP00-197 must not promote Claude to final approval");
  }
  if (MATTER_CORE_CP197_NO_WRITE_ATTESTATION.claims_enterprise_trust_from_local_validation !== false) {
    errors.push("CP00-197 must not claim enterprise trust from local validation");
  }
  if (contractProjection?.current_pack?.pack_id && contractProjection.current_pack.pack_id !== MATTER_CORE_CP197_PACK_BINDING.pack_id) {
    errors.push("CP00-197 contract current_pack drift");
  }
  if (
    contractProjection?.terminal_review_closeout_handoff?.pack_id
    && contractProjection.terminal_review_closeout_handoff.pack_id !== MATTER_CORE_CP197_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-197 contract terminal closeout section drift");
  }
  if (
    contractProjection?.review_question_security_gate?.pack_id
    && contractProjection.review_question_security_gate.pack_id !== MATTER_CORE_CP196_PACK_BINDING.pack_id
  ) {
    errors.push("CP00-197 must keep CP00-196 review question security gate as source");
  }
  if (descriptor) {
    if (descriptor.pack_id !== MATTER_CORE_CP197_PACK_BINDING.pack_id) errors.push("CP00-197 descriptor pack drift");
    if (descriptor.source_review_question_security_gate_pack_id !== MATTER_CORE_CP196_PACK_BINDING.pack_id) {
      errors.push("CP00-197 descriptor must source CP00-196");
    }
    if (descriptor.terminal_review_closeout_handoff_row_count !== MATTER_CORE_CP197_PACK_BINDING.unit_count) {
      errors.push("CP00-197 descriptor row count drift");
    }
    if (descriptor.risk_c_override_reason !== MATTER_CORE_CP197_PACK_BINDING.override_reason) {
      errors.push("CP00-197 descriptor must preserve override reason");
    }
    for (const [phase, count] of Object.entries(requirements.phase_counts)) {
      if (descriptor.rows_by_phase?.[phase] !== count) errors.push(`CP00-197 descriptor ${phase} row count drift`);
    }
    for (const [microPhase, count] of Object.entries(requirements.micro_phase_row_counts)) {
      if (descriptor.rows_by_micro_phase?.[microPhase] !== count) errors.push(`CP00-197 descriptor ${microPhase} row count drift`);
    }
    for (const [microTitle, count] of Object.entries(requirements.micro_title_row_counts)) {
      if (descriptor.rows_by_micro_title?.[microTitle] !== count) errors.push(`CP00-197 descriptor ${microTitle} row count drift`);
    }
    for (const [deliverable, count] of Object.entries(requirements.deliverable_counts)) {
      if (descriptor.rows_by_deliverable?.[deliverable] !== count) {
        errors.push(`CP00-197 descriptor ${deliverable} deliverable count drift`);
      }
    }
    for (const control of requirements.required_terminal_controls) {
      if (!descriptor.terminal_review_closeout_handoff_rows?.some((row) => row.control === control)) {
        errors.push(`CP00-197 descriptor missing terminal control ${control}`);
      }
    }
    const emittedSafeCodes = new Set();
    for (const row of descriptor.terminal_review_closeout_handoff_rows ?? []) {
      for (const code of row.customer_safe_error_codes ?? []) emittedSafeCodes.add(code);
    }
    for (const safeCode of requirements.required_customer_safe_error_codes) {
      if (!emittedSafeCodes.has(safeCode)) errors.push(`CP00-197 descriptor missing customer-safe error ${safeCode}`);
    }
    for (const outcome of requirements.required_outcomes) {
      if (!descriptor.rows_by_outcome?.[outcome]?.length) errors.push(`CP00-197 descriptor missing outcome ${outcome}`);
    }
    if ((descriptor.blocked_question_rows ?? []).length !== 7) errors.push("CP00-197 blocked question row count drift");
    if ((descriptor.review_required_rows ?? []).length !== 7) errors.push("CP00-197 review-required row count drift");
    if ((descriptor.test_question_rows ?? []).length !== 2) errors.push("CP00-197 missing-test row count drift");
    if ((descriptor.ui_leak_rows ?? []).length !== 2) errors.push("CP00-197 UI leak row count drift");
    if ((descriptor.handoff_rows ?? []).length !== 4) errors.push("CP00-197 handoff row count drift");
    if ((descriptor.closeout_note_rows ?? []).length !== 3) errors.push("CP00-197 closeout note row count drift");
    for (const guard of [
      "no_raw_payload",
      "no_real_client_data",
      "no_real_document_content",
      "no_runtime_permission_evaluation",
      "no_permission_decision_detail",
      "no_audit_event_body",
      "no_audit_event_write",
      "no_unauthorized_count",
      "no_route_dispatch",
      "no_failure_recovery_execution",
      "no_rp06_runtime_implementation",
      "replay_commands_inert",
    ]) {
      if (descriptor.leak_guards?.[guard] !== true) errors.push(`CP00-197 descriptor missing leak guard ${guard}`);
    }
    if (descriptor.closeout_handoff?.to_pack_id !== MATTER_CORE_CP197_PACK_BINDING.next_pack_id) {
      errors.push("CP00-197 descriptor handoff must point to CP00-198");
    }
    if (descriptor.closeout_handoff?.next_subphase_id !== MATTER_CORE_CP197_PACK_BINDING.next_subphase_id) {
      errors.push("CP00-197 descriptor handoff must point to RP06.P00.M00.S01");
    }
    if (descriptor.closeout_handoff?.next_program_runtime_implemented !== false) {
      errors.push("CP00-197 descriptor must not implement RP06 runtime");
    }
  }
  return freezeResult(
    {
      valid: errors.length === 0,
      errors: Object.freeze(errors),
      source_review_question_security_gate_pack_id: requirements.source_review_question_security_gate_pack_id,
      required_terminal_controls: requirements.required_terminal_controls,
      required_customer_safe_error_codes: requirements.required_customer_safe_error_codes,
      required_no_leak_guards: requirements.required_no_leak_guards,
      hardened_review_sequence: requirements.hardened_review_sequence,
      allowed_claude_tools: requirements.allowed_claude_tools,
      forbidden_review_evidence: requirements.forbidden_review_evidence,
      no_write_attestation: MATTER_CORE_CP197_NO_WRITE_ATTESTATION,
    },
    MATTER_CORE_CP197_PACK_BINDING,
    MATTER_CORE_CP197_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp197HermesEvidencePacket(planPack, contractProjection = {}, descriptor = null) {
  const coverage = validateMatterCoreCp197Coverage(planPack);
  const handoff = validateMatterCoreCp197TerminalReviewCloseoutHandoff(contractProjection, descriptor);
  return freezeResult(
    {
      evidence_packet: "H05.CP00-197.matter_core_terminal_review_closeout_handoff",
      gate: MATTER_CORE_CP197_PACK_BINDING.hermes_gate,
      coverage_valid: coverage.valid,
      terminal_review_closeout_handoff_valid: handoff.valid,
      source_review_question_security_gate_pack_id: handoff.source_review_question_security_gate_pack_id,
      required_terminal_controls: handoff.required_terminal_controls,
      required_customer_safe_error_codes: handoff.required_customer_safe_error_codes,
      required_no_leak_guards: handoff.required_no_leak_guards,
      no_real_data: true,
      no_write_attestation: MATTER_CORE_CP197_NO_WRITE_ATTESTATION,
      next_pack_id: MATTER_CORE_CP197_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP197_PACK_BINDING.next_subphase_id,
      rp06_runtime_implemented: false,
      production_ready_candidate: coverage.valid && handoff.valid,
    },
    MATTER_CORE_CP197_PACK_BINDING,
    MATTER_CORE_CP197_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp197ClaudeReviewPacket(planPack) {
  const coverage = validateMatterCoreCp197Coverage(planPack);
  const handoff = validateMatterCoreCp197TerminalReviewCloseoutHandoff();
  return freezeResult(
    {
      review_packet: "C05.CP00-197.matter_core_terminal_review_closeout_handoff",
      gate: MATTER_CORE_CP197_PACK_BINDING.claude_gate,
      required_model: "claude-opus-4-8",
      required_effort: "max",
      read_only: true,
      source_inspection_basis: "read_tools_used",
      allowed_tools: MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS.allowed_claude_tools,
      pack_id: MATTER_CORE_CP197_PACK_BINDING.pack_id,
      coverage_valid: coverage.valid,
      terminal_review_closeout_handoff_valid: handoff.valid,
      source_review_question_security_gate_pack_id: handoff.source_review_question_security_gate_pack_id,
      review_sequence: MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS.hardened_review_sequence,
      questions: Object.freeze([
        "Does CP00-197 cover exactly the 28 planned Risk C override units from RP05.P09.M07.S13 through RP05.P09.M10.S04?",
        "Does CP00-197 preserve review packet, closeout notes, Hermes/Claude questions, permission-bypass, audit-completeness, missing-test, UI-leak, downstream readiness, and risk rows as descriptor-only refs?",
        "Do blocked security/audit and block closeout rows remain non-dispatched outcomes without leaking permission decision detail or audit event bodies?",
        "Does CP00-197 avoid runtime permission evaluation, audit writes, route dispatch, API handlers, live DOM, Citation Ledger, Loop behavior, and RP06 DMS runtime?",
        "Does CP00-197 hand off to CP00-198 / RP06.P00.M00.S01 without moving DMS Core functionality early?",
      ]),
      invalid_review_blockers: MATTER_CORE_CP197_TERMINAL_REVIEW_CLOSEOUT_HANDOFF_REQUIREMENTS.forbidden_review_evidence,
      next_pack_id: MATTER_CORE_CP197_PACK_BINDING.next_pack_id,
    },
    MATTER_CORE_CP197_PACK_BINDING,
    MATTER_CORE_CP197_NO_WRITE_ATTESTATION,
  );
}

export function createMatterCoreCp197CloseoutHandoff() {
  return freezeResult(
    {
      handoff_id: "CP00-197-to-CP00-198",
      from_pack_id: MATTER_CORE_CP197_PACK_BINDING.pack_id,
      to_pack_id: MATTER_CORE_CP197_PACK_BINDING.next_pack_id,
      next_subphase_id: MATTER_CORE_CP197_PACK_BINDING.next_subphase_id,
      closed_scope: MATTER_CORE_CP197_PACK_BINDING.range,
      open_scope:
        "Continue into RP06 DMS Core planning in CP00-198 / RP06.P00.M00.S01 without treating CP00-197 descriptor evidence as DMS runtime implementation.",
      production_ready_flag: MATTER_CORE_CP197_PACK_BINDING.production_ready_flag,
      source_review_question_security_gate_pack_id: MATTER_CORE_CP196_PACK_BINDING.pack_id,
      source_evidence_review_handoff_terminal_bridge_pack_id: MATTER_CORE_CP195_PACK_BINDING.pack_id,
      source_permission_audit_evidence_terminal_bridge_pack_id: MATTER_CORE_CP194_PACK_BINDING.pack_id,
      source_service_pack_id: MATTER_CORE_CP178_PACK_BINDING.pack_id,
      rp06_runtime_implemented: false,
    },
    MATTER_CORE_CP197_PACK_BINDING,
    MATTER_CORE_CP197_NO_WRITE_ATTESTATION,
  );
}
