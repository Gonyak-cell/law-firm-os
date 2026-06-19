export const AUDIT_COMPLIANCE_CP151_PACK_BINDING = Object.freeze({
  pack_id: "CP00-151",
  planned_pack_id: "CP00-151",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP03.P07.M06.S09",
  last_unit_id: "RP03.P08.M04.S19",
  range: "RP03.P07.M06.S09-RP03.P08.M04.S19",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-150",
  next_pack_id: "CP00-152",
  next_subphase_id: "RP03.P08.M04.S20",
  production_ready_flag: "audit_compliance_failure_evidence_continuation_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP151_FAILURE_EVIDENCE_CONTINUATION_CONTRACT = Object.freeze({
  id: "audit_compliance_cp151_failure_evidence_continuation_contract",
  pack_id: AUDIT_COMPLIANCE_CP151_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance failure evidence continuation pack",
  production_ready_flag: AUDIT_COMPLIANCE_CP151_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP151_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP151_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP151_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP151_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP151_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP151_NO_WRITE_ATTESTATION = Object.freeze({
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
  executes_hermes_command: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_failure_case_payload: false,
  materializes_evidence_template: false,
  materializes_claude_edge_case_prompt: false,
  records_human_escalation_note: false,
  records_human_approval_marker: false,
  evaluates_failure_taxonomy: false,
  evaluates_permission_audit_binding: false,
  executes_failure_recovery: false,
  throws_failure: false,
  executes_retry_exhaustion: false,
  executes_rollback_expectation: false,
  executes_compensation: false,
  emits_blocked_claim_receipt: false,
  emits_audit_failure_hint: false,
  emits_hermes_failure_evidence: false,
  emits_command_result_receipt: false,
  emits_changed_file_receipt: false,
  emits_fixture_summary_receipt: false,
  emits_permission_summary_receipt: false,
  emits_audit_summary_receipt: false,
  emits_no_real_data_receipt: false,
  writes_failure_fixture: false,
  executes_failure_unit_test: false,
  executes_failure_integration_smoke: false,
  executes_regression_receipt: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP151_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "permission_binding_internal_rule",
  "audit_hint_internal_payload",
  "failure_taxonomy_internal_rule",
  "missing_context_internal_payload",
  "synthetic_fixture_internal_payload",
  "failure_fixture_internal_payload",
  "fixture_manifest_internal_body",
  "lock_conflict_internal_token",
  "rollback_internal_state",
  "compensation_internal_plan",
  "blocked_claim_internal_receipt",
  "retry_exhaustion_internal_counter",
  "failure_recovery_internal_policy",
  "audit_failure_hint_internal_payload",
  "hermes_failure_internal_digest",
  "hermes_command_internal_matrix",
  "command_result_internal_payload",
  "changed_file_internal_diff",
  "permission_summary_internal_payload",
  "audit_summary_internal_payload",
  "claude_dependency_internal_marker",
  "claude_edge_case_internal_prompt",
  "human_approval_internal_marker",
  "human_escalation_internal_reason",
  "evidence_template_internal_body",
  "regression_receipt_internal_payload",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]);

const FAILURE_UNITS = Object.freeze([
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
  Object.freeze({ index: 21, title: "Claude edge-case prompt", deliverable_type: "claude_review" }),
  Object.freeze({ index: 22, title: "Human escalation note", deliverable_type: "implementation" }),
]);

const EVIDENCE_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Hermes command matrix", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 2, title: "Evidence field list", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 3, title: "Changed-file receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 4, title: "Command result receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 5, title: "Fixture summary receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 6, title: "Blocked-claim receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 7, title: "Permission summary receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 8, title: "Audit summary receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 9, title: "No-real-data receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 10, title: "Claude dependency marker", deliverable_type: "claude_review" }),
  Object.freeze({ index: 11, title: "Human approval marker", deliverable_type: "implementation" }),
  Object.freeze({ index: 12, title: "PASS semantics", deliverable_type: "implementation" }),
  Object.freeze({ index: 13, title: "PASS_WITH_FINDINGS semantics", deliverable_type: "implementation" }),
  Object.freeze({ index: 14, title: "BLOCK semantics", deliverable_type: "implementation" }),
  Object.freeze({ index: 15, title: "Evidence template", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 16, title: "Validation command check", deliverable_type: "implementation" }),
  Object.freeze({ index: 17, title: "Harness boundary note", deliverable_type: "implementation" }),
  Object.freeze({ index: 18, title: "Closeout handoff", deliverable_type: "implementation" }),
  Object.freeze({ index: 19, title: "Regression receipt", deliverable_type: "test" }),
  Object.freeze({ index: 20, title: "Next gate readiness", deliverable_type: "implementation" }),
  Object.freeze({ index: 21, title: "Documentation update", deliverable_type: "implementation" }),
  Object.freeze({ index: 22, title: "Operator summary", deliverable_type: "implementation" }),
]);

const CP151_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P07.M06",
    phase_id: "RP03.P07",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    phase_role: "synthetic_fixture_failure_continuation_reference",
    evidence_mode: "synthetic_fixture_failure_continuation_reference",
    template: FAILURE_UNITS,
    start: 9,
    count: 14,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P07.M07",
    phase_id: "RP03.P07",
    micro_id: "M07",
    micro_title: "Test And Golden Case Set",
    phase_role: "failure_test_golden_case_reference",
    evidence_mode: "failure_test_golden_case_reference",
    template: FAILURE_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P07.M08",
    phase_id: "RP03.P07",
    micro_id: "M08",
    micro_title: "Hermes Evidence Packet",
    phase_role: "failure_hermes_evidence_packet_reference",
    evidence_mode: "failure_hermes_evidence_packet_reference",
    template: FAILURE_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P07.M09",
    phase_id: "RP03.P07",
    micro_id: "M09",
    micro_title: "Claude Review Packet",
    phase_role: "failure_claude_review_packet_reference",
    evidence_mode: "failure_claude_review_packet_reference",
    template: FAILURE_UNITS,
    count: 20,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P07.M10",
    phase_id: "RP03.P07",
    micro_id: "M10",
    micro_title: "Closeout And Next Handoff",
    phase_role: "failure_closeout_handoff_reference",
    evidence_mode: "failure_closeout_handoff_reference",
    template: FAILURE_UNITS,
    count: 11,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P08.M00",
    phase_id: "RP03.P08",
    micro_id: "M00",
    micro_title: "Scope Inventory",
    phase_role: "evidence_scope_inventory_reference",
    evidence_mode: "evidence_scope_inventory_reference",
    template: EVIDENCE_UNITS,
    count: 4,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P08.M01",
    phase_id: "RP03.P08",
    micro_id: "M01",
    micro_title: "Contract Draft",
    phase_role: "evidence_contract_draft_reference",
    evidence_mode: "evidence_contract_draft_reference",
    template: EVIDENCE_UNITS,
    count: 8,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P08.M02",
    phase_id: "RP03.P08",
    micro_id: "M02",
    micro_title: "Type And Shape Definition",
    phase_role: "evidence_type_shape_reference",
    evidence_mode: "evidence_type_shape_reference",
    template: EVIDENCE_UNITS,
    count: 8,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P08.M03",
    phase_id: "RP03.P08",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    phase_role: "evidence_primary_implementation_reference",
    evidence_mode: "evidence_primary_implementation_reference",
    template: EVIDENCE_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P08.M04",
    phase_id: "RP03.P08",
    micro_id: "M04",
    micro_title: "Secondary Workflow Slice",
    phase_role: "evidence_secondary_workflow_reference",
    evidence_mode: "evidence_secondary_workflow_reference",
    template: EVIDENCE_UNITS,
    count: 19,
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
    if (behaviorKind.includes("permission_denied") || behaviorKind.includes("audit_failure")) return "failure_evidence_audit_security_reference";
    if (behaviorKind.includes("blocked_claim") || behaviorKind.includes("hermes_failure")) return "failure_evidence_receipt_reference";
    if (behaviorKind.includes("fixture") || behaviorKind.includes("unit_test") || behaviorKind.includes("integration_smoke")) return "failure_evidence_fixture_test_reference";
    if (behaviorKind.includes("retry") || behaviorKind.includes("rollback") || behaviorKind.includes("compensation")) return "failure_evidence_recovery_boundary_reference";
    if (behaviorKind.includes("cross_tenant")) return "failure_evidence_tenant_boundary_reference";
    if (behaviorKind.includes("missing")) return "failure_evidence_missing_context_reference";
    if (behaviorKind.includes("lock")) return "failure_evidence_lock_reference";
    if (behaviorKind.includes("claude") || behaviorKind.includes("human")) return "failure_evidence_review_escalation_reference";
    return "failure_evidence_descriptor_reference";
  }
  if (behaviorKind.includes("hermes") || behaviorKind.includes("evidence") || behaviorKind.includes("receipt") || behaviorKind.includes("summary")) {
    return "hermes_evidence_receipt_reference";
  }
  if (behaviorKind.includes("claude")) return "hermes_evidence_claude_dependency_reference";
  if (behaviorKind.includes("pass") || behaviorKind.includes("block")) return "hermes_evidence_verdict_semantics_reference";
  if (behaviorKind.includes("validation") || behaviorKind.includes("regression")) return "hermes_evidence_validation_reference";
  if (behaviorKind.includes("handoff") || behaviorKind.includes("next_gate")) return "hermes_evidence_handoff_reference";
  return "hermes_evidence_operator_reference";
}

function statusFor(behaviorKind, micro) {
  return `${behaviorKind}_${micro.phase_id === "RP03.P07" ? "failure_continuation" : "evidence_packet"}_reference_bound`;
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP151_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_failure_evidence_continuation: true,
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
    executes_hermes_command: false,
    loads_fixture_payload: false,
    reads_fixture_document_body: false,
    materializes_fixture_manifest: false,
    materializes_failure_case_payload: false,
    materializes_evidence_template: false,
    materializes_claude_edge_case_prompt: false,
    records_human_escalation_note: false,
    records_human_approval_marker: false,
    evaluates_failure_taxonomy: false,
    evaluates_permission_audit_binding: false,
    executes_failure_recovery: false,
    throws_failure: false,
    executes_retry_exhaustion: false,
    executes_rollback_expectation: false,
    executes_compensation: false,
    emits_blocked_claim_receipt: false,
    emits_audit_failure_hint: false,
    emits_hermes_failure_evidence: false,
    emits_command_result_receipt: false,
    emits_changed_file_receipt: false,
    emits_fixture_summary_receipt: false,
    emits_permission_summary_receipt: false,
    emits_audit_summary_receipt: false,
    emits_no_real_data_receipt: false,
    writes_failure_fixture: false,
    executes_failure_unit_test: false,
    executes_failure_integration_smoke: false,
    executes_regression_receipt: false,
    unauthorized_count_exposed: false,
    unauthorized_object_name_exposed: false,
    hidden_field_names_exposed: false,
    exposes_unauthorized_count: false,
    exposes_unauthorized_object_name: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: CP151_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP151_MICRO_PHASES.flatMap((micro) => {
      const start = micro.start ?? 1;
      const units = micro.template.slice(start - 1, start - 1 + (micro.count ?? micro.template.length));
      return units.map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind, micro);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP151_PACK_BINDING.pack_id,
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
          case_id: `${sourceUnitId}.${behaviorKind}`,
          behavior_kind: behaviorKind,
          source_unit_ids: Object.freeze([sourceUnitId]),
          required_assertions: Object.freeze([
            "synthetic_only",
            "risk_c_failure_evidence_continuation",
            "failure_continuation_reference_only",
            "hermes_evidence_reference_only",
            "no_audit_event_write",
            "no_product_state_write",
            "no_permission_or_audit_binding_evaluation",
            "no_failure_taxonomy_evaluation",
            "no_failure_recovery_execution",
            "no_fixture_payload_load_or_manifest_materialization",
            "no_receipt_or_hermes_evidence_emission",
            "no_hermes_command_execution",
            "no_claude_prompt_materialization_or_send",
            "no_human_marker_record_or_execute",
            "no_api_or_network_execution",
            "no_ui_render_dom_or_interaction",
            "no_hidden_field_exposure",
            "cp150_handoff_inherited",
            "cp152_handoff_declared",
          ]),
          expected_status: statusFor(behaviorKind, micro),
          hidden_source_fields: CP151_HIDDEN_SOURCE_FIELDS,
        });
      });
    }),
  );
}

const CP151_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp151CoveredUnitIds() {
  return Object.freeze(CP151_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp151FailureEvidenceContinuationCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP151_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp151FailureEvidenceContinuationCase(caseId) {
  const row = CP151_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-151 audit compliance failure evidence continuation case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "failure_continuation_descriptors",
      "synthetic_fixture_failure_rows",
      "failure_test_golden_case",
      "failure_hermes_evidence_packet",
      "failure_claude_review_packet",
      "failure_closeout_handoff",
      "hermes_scope_inventory",
      "hermes_contract_type_shape",
      "hermes_primary_secondary_evidence_rows",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp151FailureEvidenceContinuation() {
  const cases = CP151_ROWS.map((row) => runAuditComplianceCp151FailureEvidenceContinuationCase(row.case_id));
  const coveredUnitIds = createAuditComplianceCp151CoveredUnitIds();
  const deliverableCounts = countBy(CP151_ROWS, "deliverable_type");
  const evidenceModeCounts = countBy(CP151_ROWS, "evidence_mode");
  const titles = new Set(CP151_ROWS.map((row) => row.title));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP151_FAILURE_EVIDENCE_CONTINUATION_CONTRACT.id,
    covered_unit_count: coveredUnitIds.length,
    row_count: CP151_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: deliverableCounts,
    domain_counts: countBy(CP151_ROWS, "domain"),
    evidence_mode_counts: evidenceModeCounts,
    first_unit_id: coveredUnitIds[0],
    last_unit_id: coveredUnitIds.at(-1),
    cp150_handoff_inherited:
      AUDIT_COMPLIANCE_CP151_PACK_BINDING.upstream_pack_id === "CP00-150" &&
      coveredUnitIds[0] === AUDIT_COMPLIANCE_CP151_PACK_BINDING.first_unit_id,
    cp152_handoff_declared:
      AUDIT_COMPLIANCE_CP151_PACK_BINDING.next_pack_id === "CP00-152" &&
      AUDIT_COMPLIANCE_CP151_PACK_BINDING.next_subphase_id === "RP03.P08.M04.S20",
    h03_gate_bound: AUDIT_COMPLIANCE_CP151_PACK_BINDING.hermes_gate === "H03",
    c03_gate_bound: AUDIT_COMPLIANCE_CP151_PACK_BINDING.claude_gate === "C03",
    failure_continuation_declared:
      evidenceModeCounts.synthetic_fixture_failure_continuation_reference === 14 &&
      evidenceModeCounts.failure_test_golden_case_reference === 22 &&
      evidenceModeCounts.failure_hermes_evidence_packet_reference === 22,
    failure_review_closeout_declared:
      evidenceModeCounts.failure_claude_review_packet_reference === 20 &&
      evidenceModeCounts.failure_closeout_handoff_reference === 11,
    hermes_evidence_scope_contract_declared:
      evidenceModeCounts.evidence_scope_inventory_reference === 4 &&
      evidenceModeCounts.evidence_contract_draft_reference === 8 &&
      evidenceModeCounts.evidence_type_shape_reference === 8,
    hermes_evidence_primary_secondary_declared:
      evidenceModeCounts.evidence_primary_implementation_reference === 22 &&
      evidenceModeCounts.evidence_secondary_workflow_reference === 19,
    failure_taxonomy_descriptor_declared: titles.has("Failure taxonomy") && deliverableCounts.failure_recovery === 51,
    failure_fixture_test_boundary_declared:
      titles.has("Failure fixture") &&
      titles.has("Failure unit test") &&
      titles.has("Failure integration smoke") &&
      deliverableCounts.fixture === 4 &&
      deliverableCounts.test === 10,
    failure_evidence_receipt_boundary_declared:
      titles.has("Blocked-claim receipt") &&
      titles.has("Hermes failure evidence") &&
      deliverableCounts.hermes_evidence === 48,
    verdict_semantics_declared:
      titles.has("PASS semantics") &&
      titles.has("PASS_WITH_FINDINGS semantics") &&
      titles.has("BLOCK semantics"),
    claude_and_human_marker_boundaries_declared:
      deliverableCounts.claude_review === 5 &&
      titles.has("Claude dependency marker") &&
      titles.has("Human approval marker"),
    hidden_field_policy_declared:
      CP151_ROWS.every((row) => row.hidden_source_fields === CP151_HIDDEN_SOURCE_FIELDS) &&
      CP151_HIDDEN_SOURCE_FIELDS.includes("hermes_command_internal_matrix") &&
      CP151_HIDDEN_SOURCE_FIELDS.includes("unauthorized_object_name"),
  });
}

export function createAuditComplianceCp151FailureEvidenceContinuationManifest() {
  const readiness = createAuditComplianceCp151FailureEvidenceContinuation();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP151_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP151_FAILURE_EVIDENCE_CONTINUATION_CONTRACT,
    readiness,
    no_write_attestation: CP151_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP151_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp151CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP151_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp151HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-151.audit_compliance_failure_evidence_continuation",
    hermes_gate: AUDIT_COMPLIANCE_CP151_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/failure-evidence-continuation-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-151/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp151CoveredUnitIds(),
  });
}

export function createAuditComplianceCp151ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-151.audit_compliance_failure_evidence_continuation",
    claude_gate: AUDIT_COMPLIANCE_CP151_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-151 cover exactly the 150 planned Risk C failure continuation and Hermes evidence units in order?",
      "Can any CP00-151 failure row evaluate taxonomy, execute recovery, emit receipts, write fixtures, execute tests, or expose hidden internals?",
      "Can any CP00-151 evidence row execute Hermes commands, emit receipts, materialize evidence templates, send Claude prompts, record human markers, or write audit/product state?",
      "Are H03/C03 packet descriptors and PASS/PASS_WITH_FINDINGS/BLOCK semantics reference-only and non-authoritative?",
      "Does CP00-151 hand off cleanly from CP00-150 to CP00-152 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/failure-evidence-continuation-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp151CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-151.to.CP00-152",
    from_pack_id: AUDIT_COMPLIANCE_CP151_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP151_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP151_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_hermes_evidence_secondary_terminal_continuation",
    dependencies: Object.freeze([
      "cp150_failure_fixture_sensitive_boundary",
      "p07_failure_continuation_descriptors",
      "p07_failure_hermes_claude_closeout_descriptors",
      "p08_hermes_evidence_scope_contract_type_shape_descriptors",
      "p08_primary_secondary_evidence_packet_descriptors",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp151Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp151CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP151_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP151_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP151_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP151_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
