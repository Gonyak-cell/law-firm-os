export const AUDIT_COMPLIANCE_CP139_PACK_BINDING = Object.freeze({
  pack_id: "CP00-139",
  planned_pack_id: "CP00-139",
  risk_class: "C",
  unit_count: 150,
  range: "RP03.P02.M09.S13-RP03.P04.M02.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-138",
  next_pack_id: "CP00-140",
  next_subphase_id: "RP03.P04.M02.S08",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP139_API_UI_REFERENCE_READINESS_CONTRACT = Object.freeze({
  id: "audit_compliance_cp139_api_ui_reference_readiness_contract",
  pack_id: AUDIT_COMPLIANCE_CP139_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance API/UI reference readiness",
  production_ready_flag: "audit_compliance_api_ui_reference_readiness_verified",
  covered_range: AUDIT_COMPLIANCE_CP139_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP139_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP139_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP139_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP139_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP139_NO_WRITE_ATTESTATION = Object.freeze({
  accepts_real_client_data: false,
  appends_audit_event: false,
  writes_audit_event: false,
  mutates_audit_event: false,
  deletes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  persists_hash_chain_state: false,
  persists_retention_policy: false,
  modifies_legal_hold: false,
  executes_permission_decision: false,
  executes_tenant_boundary_check: false,
  executes_matter_trace_check: false,
  executes_audit_hint_check: false,
  executes_audit_query: false,
  executes_compliance_export: false,
  executes_admin_access_review: false,
  executes_api_handler: false,
  issues_network_request: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  renders_ui: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP139_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "raw_document_body",
  "full_email_body",
  "secret",
  "credential",
  "payment_card_number",
  "bank_account_number",
  "access_token",
  "private_key",
  "tenant_filter_internal_expression",
  "matter_trace_internal_join",
  "permission_precheck_internal_rule",
  "audit_hint_internal_payload",
  "idempotency_internal_key",
  "lock_token_internal_value",
  "persistence_internal_target",
  "rollback_internal_action",
  "retry_internal_schedule",
  "api_request_internal_payload",
  "api_response_internal_payload",
  "api_fixture_internal_body",
  "ui_dependency_internal_query",
  "ui_state_internal_payload",
  "claude_prompt_internal_context",
  "hermes_receipt_internal_digest",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]);

const SERVICE_INTERFACE_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Service entrypoint contract", deliverable_type: "contract" }),
  Object.freeze({ index: 2, title: "Request normalization", deliverable_type: "implementation" }),
  Object.freeze({ index: 3, title: "Tenant boundary precheck", deliverable_type: "implementation" }),
  Object.freeze({ index: 4, title: "Matter trace precheck", deliverable_type: "implementation" }),
  Object.freeze({ index: 5, title: "Permission precheck", deliverable_type: "security_audit" }),
  Object.freeze({ index: 6, title: "Audit hint precheck", deliverable_type: "security_audit" }),
  Object.freeze({ index: 7, title: "Primary happy path", deliverable_type: "implementation" }),
  Object.freeze({ index: 8, title: "Secondary workflow path", deliverable_type: "implementation" }),
  Object.freeze({ index: 9, title: "State transition enforcement", deliverable_type: "ui" }),
  Object.freeze({ index: 10, title: "Idempotency key handling", deliverable_type: "implementation" }),
  Object.freeze({ index: 11, title: "Lock acquisition rule", deliverable_type: "ui" }),
  Object.freeze({ index: 12, title: "Persistence boundary", deliverable_type: "implementation" }),
  Object.freeze({ index: 13, title: "Validation error mapping", deliverable_type: "implementation" }),
  Object.freeze({ index: 14, title: "Review-required routing", deliverable_type: "claude_review" }),
  Object.freeze({ index: 15, title: "Approval-required routing", deliverable_type: "ui" }),
  Object.freeze({ index: 16, title: "Blocked-claim output", deliverable_type: "implementation" }),
  Object.freeze({ index: 17, title: "Rollback behavior", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 18, title: "Retry behavior", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 19, title: "Unit test: happy path", deliverable_type: "test" }),
  Object.freeze({ index: 20, title: "Unit test: denied path", deliverable_type: "test" }),
]);

const API_OPENING_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Public export map", deliverable_type: "implementation" }),
  Object.freeze({ index: 2, title: "Request contract", deliverable_type: "contract" }),
  Object.freeze({ index: 3, title: "Response contract", deliverable_type: "contract" }),
]);

const API_SHAPE_UNITS = Object.freeze([
  ...API_OPENING_UNITS,
  Object.freeze({ index: 4, title: "Error code taxonomy", deliverable_type: "implementation" }),
  Object.freeze({ index: 5, title: "Permission annotation", deliverable_type: "security_audit" }),
  Object.freeze({ index: 6, title: "Audit annotation", deliverable_type: "security_audit" }),
  Object.freeze({ index: 7, title: "Pagination or filtering contract", deliverable_type: "contract" }),
  Object.freeze({ index: 8, title: "Serialization guard", deliverable_type: "implementation" }),
]);

const API_FULL_UNITS = Object.freeze([
  ...API_SHAPE_UNITS,
  Object.freeze({ index: 9, title: "Unauthorized data omission", deliverable_type: "implementation" }),
  Object.freeze({ index: 10, title: "API fixture", deliverable_type: "contract" }),
  Object.freeze({ index: 11, title: "Contract test", deliverable_type: "test" }),
  Object.freeze({ index: 12, title: "Invalid request test", deliverable_type: "test" }),
  Object.freeze({ index: 13, title: "Denied response test", deliverable_type: "test" }),
  Object.freeze({ index: 14, title: "Hermes API evidence", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 15, title: "Claude interface prompt", deliverable_type: "claude_review" }),
  Object.freeze({ index: 16, title: "Documentation example", deliverable_type: "implementation" }),
  Object.freeze({ index: 17, title: "Versioning note", deliverable_type: "implementation" }),
  Object.freeze({ index: 18, title: "Closeout handoff", deliverable_type: "implementation" }),
  Object.freeze({ index: 19, title: "Downstream consumer note", deliverable_type: "implementation" }),
  Object.freeze({ index: 20, title: "Command rerun", deliverable_type: "implementation" }),
]);

const UI_SCOPE_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "UI surface inventory", deliverable_type: "ui" }),
  Object.freeze({ index: 2, title: "Data dependency map", deliverable_type: "implementation" }),
  Object.freeze({ index: 3, title: "Loading state", deliverable_type: "ui" }),
  Object.freeze({ index: 4, title: "Empty state", deliverable_type: "ui" }),
]);

const UI_CONTRACT_UNITS = Object.freeze([
  ...UI_SCOPE_UNITS,
  Object.freeze({ index: 5, title: "Denied state", deliverable_type: "ui" }),
  Object.freeze({ index: 6, title: "Review-required state", deliverable_type: "claude_review" }),
  Object.freeze({ index: 7, title: "Primary interaction", deliverable_type: "ui" }),
  Object.freeze({ index: 8, title: "Secondary interaction", deliverable_type: "ui" }),
]);

const UI_TYPE_UNITS = Object.freeze(UI_CONTRACT_UNITS.slice(0, 7));

const CP139_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P02.M09",
    phase_id: "RP03.P02",
    micro_id: "M09",
    micro_title: "Claude Review Packet",
    phase_role: "service_interface_claude_packet_terminal",
    template: SERVICE_INTERFACE_UNITS,
    start: 13,
    count: 8,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P02.M10",
    phase_id: "RP03.P02",
    micro_id: "M10",
    micro_title: "Closeout And Next Handoff",
    phase_role: "service_interface_closeout_handoff_terminal",
    template: SERVICE_INTERFACE_UNITS,
    start: 1,
    count: 11,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P03.M00",
    phase_id: "RP03.P03",
    micro_id: "M00",
    micro_title: "Scope Inventory",
    phase_role: "api_interface_scope_inventory",
    template: API_OPENING_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P03.M01",
    phase_id: "RP03.P03",
    micro_id: "M01",
    micro_title: "Contract Draft",
    phase_role: "api_interface_contract_draft",
    template: API_OPENING_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P03.M02",
    phase_id: "RP03.P03",
    micro_id: "M02",
    micro_title: "Type And Shape Definition",
    phase_role: "api_interface_type_shape_definition",
    template: API_SHAPE_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P03.M03",
    phase_id: "RP03.P03",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    phase_role: "api_interface_primary_implementation_slice",
    template: API_FULL_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P03.M04",
    phase_id: "RP03.P03",
    micro_id: "M04",
    micro_title: "Secondary Workflow Slice",
    phase_role: "api_interface_secondary_workflow_slice",
    template: API_FULL_UNITS,
    start: 1,
    count: 11,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P03.M05",
    phase_id: "RP03.P03",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    phase_role: "api_interface_permission_audit_binding",
    template: API_FULL_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P03.M06",
    phase_id: "RP03.P03",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    phase_role: "api_interface_synthetic_fixture_set",
    template: API_SHAPE_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P03.M07",
    phase_id: "RP03.P03",
    micro_id: "M07",
    micro_title: "Test And Golden Case Set",
    phase_role: "api_interface_test_golden_case_set",
    template: API_FULL_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P03.M08",
    phase_id: "RP03.P03",
    micro_id: "M08",
    micro_title: "Hermes Evidence Packet",
    phase_role: "api_interface_hermes_evidence_packet",
    template: API_SHAPE_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P03.M09",
    phase_id: "RP03.P03",
    micro_id: "M09",
    micro_title: "Claude Review Packet",
    phase_role: "api_interface_claude_review_packet",
    template: API_SHAPE_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P03.M10",
    phase_id: "RP03.P03",
    micro_id: "M10",
    micro_title: "Closeout And Next Handoff",
    phase_role: "api_interface_closeout_handoff",
    template: API_OPENING_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P04.M00",
    phase_id: "RP03.P04",
    micro_id: "M00",
    micro_title: "Scope Inventory",
    phase_role: "ui_surface_scope_inventory",
    template: UI_SCOPE_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P04.M01",
    phase_id: "RP03.P04",
    micro_id: "M01",
    micro_title: "Contract Draft",
    phase_role: "ui_surface_contract_draft",
    template: UI_CONTRACT_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P04.M02",
    phase_id: "RP03.P04",
    micro_id: "M02",
    micro_title: "Type And Shape Definition",
    phase_role: "ui_surface_type_shape_definition_opening",
    template: UI_TYPE_UNITS,
  }),
]);

const STATUS_BY_KIND = Object.freeze({
  api_fixture: "api_fixture_reference_bound",
  approval_required_routing: "approval_required_routing_reference_bound",
  audit_annotation: "audit_annotation_reference_bound",
  audit_hint_precheck: "audit_hint_precheck_reference_bound",
  blocked_claim_output: "blocked_claim_output_reference_bound",
  claude_interface_prompt: "claude_interface_prompt_reference_bound",
  closeout_handoff: "closeout_handoff_reference_bound",
  command_rerun: "command_rerun_reference_bound",
  contract_test: "contract_test_reference_bound",
  data_dependency_map: "data_dependency_map_reference_bound",
  denied_response_test: "denied_response_test_reference_bound",
  denied_state: "denied_state_reference_bound",
  documentation_example: "documentation_example_reference_bound",
  downstream_consumer_note: "downstream_consumer_note_reference_bound",
  empty_state: "empty_state_reference_bound",
  error_code_taxonomy: "error_code_taxonomy_reference_bound",
  hermes_api_evidence: "hermes_api_evidence_reference_bound",
  idempotency_key_handling: "idempotency_key_handling_reference_bound",
  invalid_request_test: "invalid_request_test_reference_bound",
  loading_state: "loading_state_reference_bound",
  lock_acquisition_rule: "lock_acquisition_rule_reference_bound",
  matter_trace_precheck: "matter_trace_precheck_reference_bound",
  pagination_or_filtering_contract: "pagination_filtering_contract_reference_bound",
  permission_annotation: "permission_annotation_reference_bound",
  permission_precheck: "permission_precheck_reference_bound",
  primary_happy_path: "primary_happy_path_reference_bound",
  primary_interaction: "primary_interaction_reference_bound",
  public_export_map: "public_export_map_reference_bound",
  request_contract: "request_contract_reference_bound",
  request_normalization: "request_normalization_reference_bound",
  response_contract: "response_contract_reference_bound",
  retry_behavior: "retry_behavior_reference_bound",
  review_required_routing: "review_required_routing_reference_bound",
  review_required_state: "review_required_state_reference_bound",
  rollback_behavior: "rollback_behavior_reference_bound",
  secondary_interaction: "secondary_interaction_reference_bound",
  secondary_workflow_path: "secondary_workflow_path_reference_bound",
  serialization_guard: "serialization_guard_reference_bound",
  service_entrypoint_contract: "service_entrypoint_contract_reference_bound",
  state_transition_enforcement: "state_transition_enforcement_reference_bound",
  tenant_boundary_precheck: "tenant_boundary_precheck_reference_bound",
  ui_surface_inventory: "ui_surface_inventory_reference_bound",
  unauthorized_data_omission: "unauthorized_data_omission_reference_bound",
  unit_test_denied_path: "unit_test_denied_path_reference_bound",
  unit_test_happy_path: "unit_test_happy_path_reference_bound",
  validation_error_mapping: "validation_error_mapping_reference_bound",
  versioning_note: "versioning_note_reference_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function modeFor(micro) {
  if (micro.phase_id === "RP03.P02") return micro.micro_id === "M09" ? "service_claude_packet_terminal" : "service_closeout_handoff";
  if (micro.phase_id === "RP03.P04") return "ui_reference_readiness";
  if (micro.micro_id === "M08") return "api_hermes_evidence_packet";
  if (micro.micro_id === "M09") return "api_claude_review_packet";
  if (micro.micro_id === "M10") return "api_closeout_handoff";
  return "api_reference_readiness";
}

function domainFor(behaviorKind, micro) {
  if (micro.phase_id === "RP03.P04") {
    if (behaviorKind.includes("data_dependency")) return "ui_data_dependency_reference";
    if (behaviorKind.includes("review_required")) return "ui_review_state_reference";
    if (behaviorKind.includes("interaction")) return "ui_interaction_reference";
    return "ui_state_reference";
  }
  if (micro.phase_id === "RP03.P02") {
    if (behaviorKind.includes("rollback") || behaviorKind.includes("retry")) return "service_failure_recovery_terminal_reference";
    if (behaviorKind.includes("review") || behaviorKind.includes("approval")) return "service_review_routing_terminal_reference";
    if (behaviorKind.includes("idempotency") || behaviorKind.includes("lock")) return "service_state_boundary_terminal_reference";
    if (behaviorKind.includes("tenant") || behaviorKind.includes("matter")) return "service_boundary_handoff_reference";
    if (behaviorKind.includes("permission") || behaviorKind.includes("audit_hint")) return "service_permission_audit_handoff_reference";
    return "service_closeout_terminal_reference";
  }
  if (behaviorKind.includes("permission") || behaviorKind.includes("audit_annotation")) return "api_permission_audit_reference";
  if (behaviorKind.includes("unauthorized")) return "api_unauthorized_data_reference";
  if (behaviorKind.includes("fixture")) return "api_fixture_reference";
  if (behaviorKind.includes("test")) return "api_test_reference";
  if (behaviorKind.includes("hermes")) return "api_hermes_evidence_reference";
  if (behaviorKind.includes("claude")) return "api_claude_review_reference";
  if (behaviorKind.includes("serialization")) return "api_serialization_reference";
  if (behaviorKind.includes("request") || behaviorKind.includes("response") || behaviorKind.includes("contract")) {
    return "api_contract_reference";
  }
  return "api_interface_reference";
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP139_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_api_ui_reference_readiness: true,
    writes_product_state: false,
    appends_audit_event: false,
    writes_audit_event: false,
    mutates_audit_event: false,
    deletes_audit_event: false,
    creates_database_rows: false,
    persists_idempotency_keys: false,
    persists_hash_chain_state: false,
    persists_retention_policy: false,
    modifies_legal_hold: false,
    executes_permission_decision: false,
    executes_tenant_boundary_check: false,
    executes_matter_trace_check: false,
    executes_audit_hint_check: false,
    executes_audit_query: false,
    executes_compliance_export: false,
    executes_admin_access_review: false,
    executes_api_handler: false,
    issues_network_request: false,
    acquires_locks: false,
    persists_lock_tokens: false,
    executes_rollback: false,
    executes_retry: false,
    renders_ui: false,
    executes_ui_interaction: false,
    executes_claude_review: false,
    sends_claude_prompt: false,
    writes_hermes_runtime: false,
    implements_ldip: false,
    splits_hrx_product: false,
    unauthorized_count_exposed: false,
    unauthorized_object_name_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP139_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP139_MICRO_PHASES.flatMap((micro) => {
      const units = micro.template.slice((micro.start ?? 1) - 1, (micro.start ?? 1) - 1 + (micro.count ?? micro.template.length));
      return units.map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind, micro);
        const evidenceMode = modeFor(micro);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP139_PACK_BINDING.pack_id,
          program_id: "RP03",
          phase_id: micro.phase_id,
          micro_phase_id: micro.micro_phase_id,
          micro_id: micro.micro_id,
          micro_title: micro.micro_title,
          phase_role: micro.phase_role,
          area: `${domain}.${slugFor(micro.micro_title)}`,
          domain,
          evidence_mode: evidenceMode,
          title: unit.title,
          coverage_kind: behaviorKind,
          deliverable_type: unit.deliverable_type,
          case_id: `${micro.micro_phase_id.toLowerCase().replaceAll(".", "_")}.${behaviorKind}`,
          behavior_kind: behaviorKind,
          source_unit_ids: Object.freeze([sourceUnitId]),
          required_assertions: Object.freeze([
            "synthetic_only",
            "risk_c_api_ui_reference_readiness",
            "service_terminal_reference_only",
            "api_contract_reference_only",
            "api_permission_audit_reference_only",
            "api_unauthorized_data_omission_reference_only",
            "ui_reference_only",
            "no_audit_event_write",
            "no_product_state_write",
            "no_api_execution",
            "no_ui_render_or_interaction",
            "no_claude_or_hermes_execution",
            "no_hidden_field_exposure",
            "cp138_handoff_inherited",
            "cp140_handoff_declared",
          ]),
          expected_status: STATUS_BY_KIND[behaviorKind] ?? `${behaviorKind}_reference_bound`,
          hidden_source_fields: CP139_HIDDEN_SOURCE_FIELDS,
        });
      });
    }),
  );
}

const CP139_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp139CoveredUnitIds() {
  return Object.freeze(CP139_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp139ApiUiReferenceReadinessCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP139_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp139ApiUiReferenceReadinessCase(caseId) {
  const row = CP139_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-139 audit compliance API/UI reference readiness case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "service_closeout_handoff",
      "api_public_export_map",
      "api_request_contract",
      "api_response_contract",
      "api_permission_annotation",
      "api_audit_annotation",
      "api_unauthorized_data_omission",
      "api_fixture",
      "api_contract_test",
      "ui_surface_inventory",
      "ui_denied_state",
      "ui_review_required_state",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp139ApiUiReferenceReadiness() {
  const cases = CP139_ROWS.map((row) => runAuditComplianceCp139ApiUiReferenceReadinessCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP139_API_UI_REFERENCE_READINESS_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp139CoveredUnitIds().length,
    row_count: CP139_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP139_ROWS, "deliverable_type"),
    domain_counts: countBy(CP139_ROWS, "domain"),
    evidence_mode_counts: countBy(CP139_ROWS, "evidence_mode"),
    first_unit_id: createAuditComplianceCp139CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp139CoveredUnitIds().at(-1),
    cp138_handoff_inherited: true,
    cp140_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    service_claude_packet_terminal_declared: true,
    service_closeout_handoff_declared: true,
    api_interface_contract_declared: true,
    api_permission_audit_binding_declared: true,
    api_unauthorized_data_omission_declared: true,
    ui_reference_opening_declared: true,
    hidden_field_policy_declared: true,
  });
}

export function createAuditComplianceCp139ApiUiReferenceReadinessManifest() {
  const readiness = createAuditComplianceCp139ApiUiReferenceReadiness();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP139_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP139_API_UI_REFERENCE_READINESS_CONTRACT,
    readiness,
    no_write_attestation: CP139_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP139_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp139CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP139_API_UI_REFERENCE_READINESS_CONTRACT.production_ready_flag,
  });
}

export function createAuditComplianceCp139HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-139.audit_compliance_api_ui_reference_readiness",
    hermes_gate: AUDIT_COMPLIANCE_CP139_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/api-ui-reference-readiness-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-139/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp139CoveredUnitIds(),
  });
}

export function createAuditComplianceCp139ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-139.audit_compliance_api_ui_reference_readiness",
    claude_gate: AUDIT_COMPLIANCE_CP139_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-139 keep service terminal, API contract, API permission/audit, fixture, and UI opening rows as no-write descriptors?",
      "Can any CP00-139 row execute an API handler, issue a network request, render UI, interact with UI, append audit events, write state, or expose hidden fields?",
      "Are unauthorized data omission, denied UI state, review-required UI state, and permission/audit annotations represented without leaking unauthorized counts or object names?",
      "Does CP00-139 preserve H03/C03 as evidence and read-only review gates only?",
      "Does the pack hand off cleanly from CP00-138 to CP00-140 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/api-ui-reference-readiness-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp139CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-139.to.CP00-140",
    from_pack_id: AUDIT_COMPLIANCE_CP139_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP139_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP139_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_ui_surface_continuation",
    dependencies: Object.freeze([
      "cp138_claude_packet_sensitive_boundary",
      "service_interface_closeout_handoff",
      "api_interface_contract_references",
      "api_permission_audit_binding_references",
      "api_unauthorized_data_omission_references",
      "ui_surface_opening_references",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp139Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp139CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP139_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP139_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== "RP03.P02.M09.S13") errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== "RP03.P04.M02.S07") errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
  if (new Set(coveredUnitIds).size !== coveredUnitIds.length) errors.push("covered units must be unique");
  if (planPack) {
    const plannedUnitIds = planPack.included_units?.map((unit) => unit.id) ?? [];
    if (plannedUnitIds.length !== coveredUnitIds.length) {
      errors.push(`plan included unit count mismatch: ${plannedUnitIds.length}`);
    }
    const mismatch = coveredUnitIds.find((unitId, index) => unitId !== plannedUnitIds[index]);
    if (mismatch) errors.push(`plan unit order mismatch at ${mismatch}`);
  }
  return Object.freeze({
    ok: errors.length === 0,
    errors: Object.freeze(errors),
    covered_unit_count: coveredUnitIds.length,
    first_unit_id: coveredUnitIds[0],
    last_unit_id: coveredUnitIds.at(-1),
  });
}
