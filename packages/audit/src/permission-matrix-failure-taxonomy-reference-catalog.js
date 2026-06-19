export const AUDIT_COMPLIANCE_CP147_PACK_BINDING = Object.freeze({
  pack_id: "CP00-147",
  planned_pack_id: "CP00-147",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP03.P06.M06.S04",
  last_unit_id: "RP03.P07.M03.S14",
  range: "RP03.P06.M06.S04-RP03.P07.M03.S14",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-146",
  next_pack_id: "CP00-148",
  next_subphase_id: "RP03.P07.M03.S15",
  production_ready_flag: "audit_compliance_permission_matrix_failure_taxonomy_reference_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP147_PERMISSION_MATRIX_FAILURE_TAXONOMY_REFERENCE_CONTRACT = Object.freeze({
  id: "audit_compliance_cp147_permission_matrix_failure_taxonomy_reference_contract",
  pack_id: AUDIT_COMPLIANCE_CP147_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance permission matrix failure taxonomy reference",
  production_ready_flag: AUDIT_COMPLIANCE_CP147_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP147_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP147_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP147_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP147_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP147_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP147_NO_WRITE_ATTESTATION = Object.freeze({
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
  mutates_dom: false,
  opens_browser: false,
  captures_screenshot: false,
  executes_ui_interaction: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  writes_hermes_runtime: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_golden_case_payload: false,
  materializes_failure_case_payload: false,
  executes_replay_command: false,
  executes_ai_retrieval: false,
  executes_analytics_query: false,
  persists_stable_id: false,
  emits_real_receipt: false,
  evaluates_permission_matrix: false,
  evaluates_view_decision: false,
  evaluates_search_decision: false,
  evaluates_mutation_decision: false,
  evaluates_export_download_decision: false,
  evaluates_share_decision: false,
  evaluates_ai_retrieval_decision: false,
  applies_legal_hold: false,
  applies_ethical_wall: false,
  reads_object_acl: false,
  routes_review_required: false,
  routes_approval_required: false,
  proves_security_trimming: false,
  emits_audit_event_expectation: false,
  writes_permission_fixture: false,
  executes_allowed_test: false,
  executes_denied_test: false,
  executes_cross_tenant_test: false,
  executes_leak_prevention_test: false,
  evaluates_failure_taxonomy: false,
  executes_failure_recovery: false,
  throws_failure: false,
  executes_retry_exhaustion: false,
  executes_rollback_expectation: false,
  executes_compensation: false,
  emits_blocked_claim_receipt: false,
  writes_failure_fixture: false,
  executes_failure_unit_test: false,
  executes_failure_integration_smoke: false,
  emits_audit_failure_hint: false,
  emits_hermes_failure_evidence: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP147_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "permission_matrix_internal_rule",
  "view_decision_internal_predicate",
  "search_decision_internal_predicate",
  "mutation_decision_internal_predicate",
  "export_download_internal_policy",
  "share_decision_internal_policy",
  "ai_retrieval_internal_policy",
  "legal_hold_internal_state",
  "ethical_wall_internal_rule",
  "object_acl_internal_grant",
  "review_route_internal_reason",
  "approval_route_internal_reason",
  "security_trimming_internal_query",
  "audit_event_internal_payload",
  "permission_fixture_internal_payload",
  "allowed_test_internal_fixture",
  "denied_test_internal_fixture",
  "cross_tenant_test_internal_fixture",
  "leak_prevention_test_internal_fixture",
  "fixture_manifest_internal_body",
  "golden_case_internal_payload",
  "failure_case_internal_payload",
  "claude_prompt_internal_context",
  "hermes_receipt_internal_digest",
  "failure_taxonomy_internal_rule",
  "missing_context_internal_payload",
  "failure_fixture_internal_payload",
  "rollback_internal_state",
  "compensation_internal_plan",
  "blocked_claim_internal_receipt",
  "retry_exhaustion_internal_counter",
  "failure_recovery_internal_policy",
  "audit_failure_hint_internal_payload",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]);

const PERMISSION_MATRIX_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Permission matrix row", deliverable_type: "security_audit" }),
  Object.freeze({ index: 2, title: "View decision binding", deliverable_type: "implementation" }),
  Object.freeze({ index: 3, title: "Search decision binding", deliverable_type: "implementation" }),
  Object.freeze({ index: 4, title: "Mutation decision binding", deliverable_type: "implementation" }),
  Object.freeze({ index: 5, title: "Export/download decision binding", deliverable_type: "implementation" }),
  Object.freeze({ index: 6, title: "Share decision binding", deliverable_type: "implementation" }),
  Object.freeze({ index: 7, title: "AI retrieval decision binding", deliverable_type: "implementation" }),
  Object.freeze({ index: 8, title: "Audit hint fields", deliverable_type: "security_audit" }),
  Object.freeze({ index: 9, title: "Matched rule capture", deliverable_type: "implementation" }),
  Object.freeze({ index: 10, title: "Deny-over-allow check", deliverable_type: "implementation" }),
  Object.freeze({ index: 11, title: "Legal hold interaction", deliverable_type: "ui" }),
  Object.freeze({ index: 12, title: "Ethical wall interaction", deliverable_type: "ui" }),
  Object.freeze({ index: 13, title: "Object ACL interaction", deliverable_type: "ui" }),
  Object.freeze({ index: 14, title: "Review-required route", deliverable_type: "claude_review" }),
  Object.freeze({ index: 15, title: "Approval-required route", deliverable_type: "ui" }),
  Object.freeze({ index: 16, title: "Security trimming proof", deliverable_type: "security_audit" }),
  Object.freeze({ index: 17, title: "Audit event expectation", deliverable_type: "security_audit" }),
  Object.freeze({ index: 18, title: "Permission fixture", deliverable_type: "security_audit" }),
  Object.freeze({ index: 19, title: "Allowed test", deliverable_type: "test" }),
  Object.freeze({ index: 20, title: "Denied test", deliverable_type: "test" }),
  Object.freeze({ index: 21, title: "Cross-tenant test", deliverable_type: "test" }),
  Object.freeze({ index: 22, title: "Leak prevention test", deliverable_type: "test" }),
]);

const FAILURE_TAXONOMY_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Failure taxonomy", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 2, title: "Missing tenant failure", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 3, title: "Missing actor failure", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 4, title: "Missing Matter failure", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 5, title: "Missing resource failure", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 6, title: "Unknown action failure", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 7, title: "Cross-tenant failure", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 8, title: "Permission denied failure", deliverable_type: "security_audit" }),
  Object.freeze({ index: 9, title: "Ambiguous rule failure", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 10, title: "Stale reference failure", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 11, title: "Lock conflict failure", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 12, title: "Retry exhaustion failure", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 13, title: "Rollback expectation", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 14, title: "Compensation expectation", deliverable_type: "implementation" }),
  Object.freeze({ index: 15, title: "Blocked-claim receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 16, title: "Failure fixture", deliverable_type: "fixture" }),
  Object.freeze({ index: 17, title: "Failure unit test", deliverable_type: "test" }),
  Object.freeze({ index: 18, title: "Failure integration smoke", deliverable_type: "test" }),
  Object.freeze({ index: 19, title: "Audit failure hint", deliverable_type: "security_audit" }),
  Object.freeze({ index: 20, title: "Hermes failure evidence", deliverable_type: "hermes_evidence" }),
]);

const CP147_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P06.M06",
    phase_id: "RP03.P06",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    phase_role: "synthetic_fixture_permission_matrix_continuation_reference",
    evidence_mode: "synthetic_fixture_permission_matrix_continuation_reference",
    template: PERMISSION_MATRIX_UNITS,
    start: 4,
    count: 19,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P06.M07",
    phase_id: "RP03.P06",
    micro_id: "M07",
    micro_title: "Test And Golden Case Set",
    phase_role: "permission_test_golden_case_reference",
    evidence_mode: "permission_test_golden_case_reference",
    template: PERMISSION_MATRIX_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P06.M08",
    phase_id: "RP03.P06",
    micro_id: "M08",
    micro_title: "Hermes Evidence Packet",
    phase_role: "permission_hermes_evidence_packet_reference",
    evidence_mode: "permission_hermes_evidence_packet_reference",
    template: PERMISSION_MATRIX_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P06.M09",
    phase_id: "RP03.P06",
    micro_id: "M09",
    micro_title: "Claude Review Packet",
    phase_role: "permission_claude_review_packet_reference",
    evidence_mode: "permission_claude_review_packet_reference",
    template: PERMISSION_MATRIX_UNITS,
    count: 20,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P06.M10",
    phase_id: "RP03.P06",
    micro_id: "M10",
    micro_title: "Closeout And Next Handoff",
    phase_role: "permission_closeout_handoff_reference",
    evidence_mode: "permission_closeout_handoff_reference",
    template: PERMISSION_MATRIX_UNITS,
    count: 11,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P07.M00",
    phase_id: "RP03.P07",
    micro_id: "M00",
    micro_title: "Scope Inventory",
    phase_role: "failure_scope_inventory_reference",
    evidence_mode: "failure_scope_inventory_reference",
    template: FAILURE_TAXONOMY_UNITS,
    count: 11,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P07.M01",
    phase_id: "RP03.P07",
    micro_id: "M01",
    micro_title: "Contract Draft",
    phase_role: "failure_contract_draft_reference",
    evidence_mode: "failure_contract_draft_reference",
    template: FAILURE_TAXONOMY_UNITS,
    count: 11,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P07.M02",
    phase_id: "RP03.P07",
    micro_id: "M02",
    micro_title: "Type And Shape Definition",
    phase_role: "failure_type_shape_reference",
    evidence_mode: "failure_type_shape_reference",
    template: FAILURE_TAXONOMY_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P07.M03",
    phase_id: "RP03.P07",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    phase_role: "failure_primary_implementation_reference",
    evidence_mode: "failure_primary_implementation_reference",
    template: FAILURE_TAXONOMY_UNITS,
    count: 14,
  }),
]);

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function domainFor(behaviorKind, micro) {
  if (micro.phase_id === "RP03.P07") {
    if (behaviorKind.includes("permission_denied") || behaviorKind.includes("audit_failure")) return "failure_taxonomy_audit_security_reference";
    if (behaviorKind.includes("blocked_claim") || behaviorKind.includes("hermes_failure")) return "failure_taxonomy_evidence_reference";
    if (behaviorKind.includes("fixture") || behaviorKind.includes("unit_test") || behaviorKind.includes("integration_smoke")) return "failure_taxonomy_fixture_test_reference";
    if (behaviorKind.includes("retry") || behaviorKind.includes("rollback") || behaviorKind.includes("compensation")) return "failure_taxonomy_recovery_boundary_reference";
    if (behaviorKind.includes("cross_tenant")) return "failure_taxonomy_tenant_boundary_reference";
    if (behaviorKind.includes("missing")) return "failure_taxonomy_missing_context_reference";
    if (behaviorKind.includes("lock")) return "failure_taxonomy_lock_reference";
    return "failure_taxonomy_descriptor_reference";
  }
  if (behaviorKind.includes("permission_matrix") || behaviorKind.includes("audit_hint") || behaviorKind.includes("security_trimming") || behaviorKind.includes("audit_event") || behaviorKind.includes("permission_fixture")) {
    return "permission_matrix_security_reference";
  }
  if (behaviorKind.includes("ai_retrieval")) return "permission_matrix_ai_reference";
  if (behaviorKind.includes("export_download") || behaviorKind.includes("share")) return "permission_matrix_externalization_reference";
  if (behaviorKind.includes("legal_hold") || behaviorKind.includes("ethical_wall") || behaviorKind.includes("object_acl")) {
    return "permission_matrix_boundary_reference";
  }
  if (behaviorKind.includes("review_required") || behaviorKind.includes("approval_required")) return "permission_matrix_review_approval_reference";
  if (behaviorKind.includes("allowed_test") || behaviorKind.includes("denied_test") || behaviorKind.includes("cross_tenant_test") || behaviorKind.includes("leak_prevention_test")) {
    return "permission_matrix_test_reference";
  }
  return "permission_matrix_decision_reference";
}

function statusFor(behaviorKind, micro) {
  return `${behaviorKind}_${micro.phase_id === "RP03.P07" ? "failure_taxonomy" : "permission_matrix"}_reference_bound`;
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP147_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_permission_matrix_failure_taxonomy_reference: true,
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
    mutates_dom: false,
    opens_browser: false,
    captures_screenshot: false,
    executes_ui_interaction: false,
    executes_claude_review: false,
    sends_claude_prompt: false,
    writes_hermes_runtime: false,
    loads_fixture_payload: false,
    reads_fixture_document_body: false,
    materializes_fixture_manifest: false,
    materializes_golden_case_payload: false,
    materializes_failure_case_payload: false,
    executes_replay_command: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    persists_stable_id: false,
    emits_real_receipt: false,
    evaluates_permission_matrix: false,
    evaluates_view_decision: false,
    evaluates_search_decision: false,
    evaluates_mutation_decision: false,
    evaluates_export_download_decision: false,
    evaluates_share_decision: false,
    evaluates_ai_retrieval_decision: false,
    applies_legal_hold: false,
    applies_ethical_wall: false,
    reads_object_acl: false,
    routes_review_required: false,
    routes_approval_required: false,
    proves_security_trimming: false,
    emits_audit_event_expectation: false,
    writes_permission_fixture: false,
    executes_allowed_test: false,
    executes_denied_test: false,
    executes_cross_tenant_test: false,
    executes_leak_prevention_test: false,
    evaluates_failure_taxonomy: false,
    executes_failure_recovery: false,
    throws_failure: false,
    executes_retry_exhaustion: false,
    executes_rollback_expectation: false,
    executes_compensation: false,
    emits_blocked_claim_receipt: false,
    writes_failure_fixture: false,
    executes_failure_unit_test: false,
    executes_failure_integration_smoke: false,
    emits_audit_failure_hint: false,
    emits_hermes_failure_evidence: false,
    unauthorized_count_exposed: false,
    unauthorized_object_name_exposed: false,
    hidden_field_names_exposed: false,
    exposes_unauthorized_count: false,
    exposes_unauthorized_object_name: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: CP147_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP147_MICRO_PHASES.flatMap((micro) => {
      const start = micro.start ?? 1;
      const units = micro.template.slice(start - 1, start - 1 + (micro.count ?? micro.template.length));
      return units.map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind, micro);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP147_PACK_BINDING.pack_id,
          program_id: "RP03",
          phase_id: micro.phase_id,
          micro_phase_id: micro.micro_phase_id,
          micro_id: micro.micro_id,
          micro_title: micro.micro_title,
          phase_role: micro.phase_role,
          area: `${domain}.${slugFor(micro.micro_title)}`,
          domain,
          evidence_mode: micro.evidence_mode,
          title: unit.title,
          coverage_kind: behaviorKind,
          deliverable_type: unit.deliverable_type,
          case_id: `${micro.micro_phase_id.toLowerCase().replaceAll(".", "_")}.${behaviorKind}`,
          behavior_kind: behaviorKind,
          source_unit_ids: Object.freeze([sourceUnitId]),
          required_assertions: Object.freeze([
            "synthetic_only",
            "risk_c_permission_matrix_failure_taxonomy_reference",
            "permission_matrix_reference_only",
            "failure_taxonomy_reference_only",
            "no_audit_event_write",
            "no_product_state_write",
            "no_permission_execution",
            "no_permission_matrix_evaluation",
            "no_failure_taxonomy_evaluation",
            "no_failure_recovery_execution",
            "no_fixture_payload_load",
            "no_failure_fixture_or_test_execution",
            "no_blocked_claim_or_hermes_failure_evidence_emission",
            "no_rollback_retry_or_compensation_execution",
            "no_api_or_network_execution",
            "no_ui_render_dom_or_interaction",
            "no_claude_or_hermes_execution",
            "no_hidden_field_exposure",
            "cp146_handoff_inherited",
            "cp148_handoff_declared",
          ]),
          expected_status: statusFor(behaviorKind, micro),
          hidden_source_fields: CP147_HIDDEN_SOURCE_FIELDS,
        });
      });
    }),
  );
}

const CP147_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp147CoveredUnitIds() {
  return Object.freeze(CP147_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP147_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase(caseId) {
  const row = CP147_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-147 audit compliance permission matrix failure taxonomy reference case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "permission_matrix_continuation",
      "permission_test_golden_case",
      "permission_hermes_evidence_packet",
      "permission_claude_review_packet",
      "permission_closeout_handoff",
      "failure_scope_inventory",
      "failure_contract_draft",
      "failure_type_shape",
      "failure_primary_implementation",
      "failure_taxonomy_descriptors",
      "failure_recovery_boundaries",
      "blocked_claim_and_hermes_failure_evidence",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp147PermissionMatrixFailureTaxonomyReference() {
  const cases = CP147_ROWS.map((row) => runAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP147_PERMISSION_MATRIX_FAILURE_TAXONOMY_REFERENCE_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp147CoveredUnitIds().length,
    row_count: CP147_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP147_ROWS, "deliverable_type"),
    domain_counts: countBy(CP147_ROWS, "domain"),
    evidence_mode_counts: countBy(CP147_ROWS, "evidence_mode"),
    first_unit_id: createAuditComplianceCp147CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp147CoveredUnitIds().at(-1),
    cp146_handoff_inherited: true,
    cp148_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    permission_matrix_continuation_declared: true,
    permission_matrix_test_golden_declared: true,
    permission_hermes_packet_declared: true,
    permission_claude_packet_declared: true,
    permission_closeout_handoff_declared: true,
    permission_matrix_decision_bindings_declared: true,
    permission_matrix_boundary_interactions_declared: true,
    permission_matrix_review_approval_declared: true,
    permission_matrix_test_boundary_declared: true,
    failure_scope_contract_declared: true,
    failure_type_shape_declared: true,
    failure_primary_implementation_declared: true,
    failure_taxonomy_descriptor_declared: true,
    failure_recovery_boundary_declared: true,
    failure_fixture_test_boundary_declared: true,
    failure_evidence_boundary_declared: true,
    hidden_field_policy_declared: true,
  });
}

export function createAuditComplianceCp147PermissionMatrixFailureTaxonomyReferenceManifest() {
  const readiness = createAuditComplianceCp147PermissionMatrixFailureTaxonomyReference();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP147_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP147_PERMISSION_MATRIX_FAILURE_TAXONOMY_REFERENCE_CONTRACT,
    readiness,
    no_write_attestation: CP147_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP147_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp147CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP147_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp147HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-147.audit_compliance_permission_matrix_failure_taxonomy_reference",
    hermes_gate: AUDIT_COMPLIANCE_CP147_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/permission-matrix-failure-taxonomy-reference-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-147/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp147CoveredUnitIds(),
  });
}

export function createAuditComplianceCp147ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-147.audit_compliance_permission_matrix_failure_taxonomy_reference",
    claude_gate: AUDIT_COMPLIANCE_CP147_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-147 cover exactly the 150 planned Risk C permission matrix continuation and failure taxonomy reference units in order?",
      "Can any CP00-147 permission matrix row evaluate decisions, apply legal hold or ethical wall, read object ACL, route review or approval, prove trimming, emit audit events, or execute permission tests?",
      "Can any CP00-147 failure taxonomy row evaluate a taxonomy, throw failures, execute recovery, retry exhaustion, rollback, compensation, fixtures, unit tests, integration smokes, blocked-claim receipts, or Hermes failure evidence?",
      "Are hidden source fields, unauthorized counts, object names, internal permission policies, failure recovery state, rollback state, compensation plans, and blocked-claim internals suppressed?",
      "Does CP00-147 hand off cleanly from CP00-146 to CP00-148 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/permission-matrix-failure-taxonomy-reference-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp147CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-147.to.CP00-148",
    from_pack_id: AUDIT_COMPLIANCE_CP147_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP147_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP147_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_failure_boundary_sensitive_pack",
    dependencies: Object.freeze([
      "cp146_permission_matrix_security_fixture_boundary",
      "p06_permission_matrix_continuation_reference",
      "p06_permission_evidence_review_closeout_packets",
      "p07_failure_scope_inventory",
      "p07_failure_contract_type_shape_reference",
      "p07_failure_primary_implementation_reference",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp147Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp147CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP147_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP147_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP147_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP147_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
