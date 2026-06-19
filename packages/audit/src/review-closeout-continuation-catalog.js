export const AUDIT_COMPLIANCE_CP153_PACK_BINDING = Object.freeze({
  pack_id: "CP00-153",
  planned_pack_id: "CP00-153",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP03.P08.M06.S18",
  last_unit_id: "RP03.P09.M07.S02",
  range: "RP03.P08.M06.S18-RP03.P09.M07.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-152",
  next_pack_id: "CP00-154",
  next_subphase_id: "RP03.P09.M07.S03",
  production_ready_flag: "audit_compliance_review_closeout_continuation_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP153_REVIEW_CLOSEOUT_CONTINUATION_CONTRACT = Object.freeze({
  id: "audit_compliance_cp153_review_closeout_continuation_contract",
  pack_id: AUDIT_COMPLIANCE_CP153_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance review closeout continuation pack",
  production_ready_flag: AUDIT_COMPLIANCE_CP153_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP153_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP153_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP153_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP153_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP153_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP153_NO_WRITE_ATTESTATION = Object.freeze({
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
  executes_architecture_review: false,
  executes_security_review: false,
  executes_claude_review: false,
  sends_claude_prompt: false,
  records_human_approval_marker: false,
  writes_hermes_runtime: false,
  executes_hermes_command: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  materializes_fixture_manifest: false,
  materializes_evidence_template: false,
  materializes_review_packet: false,
  materializes_closeout_verdict: false,
  evaluates_permission_bypass: false,
  evaluates_audit_completeness: false,
  emits_command_result_receipt: false,
  emits_changed_file_receipt: false,
  emits_fixture_summary_receipt: false,
  emits_permission_summary_receipt: false,
  emits_audit_summary_receipt: false,
  emits_no_real_data_receipt: false,
  emits_hermes_evidence: false,
  executes_regression_receipt: false,
  exposes_ui_leak: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP153_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "synthetic_fixture_internal_payload",
  "fixture_manifest_internal_body",
  "hermes_command_internal_matrix",
  "evidence_template_internal_body",
  "command_result_internal_payload",
  "changed_file_internal_diff",
  "fixture_summary_internal_payload",
  "permission_summary_internal_payload",
  "audit_summary_internal_payload",
  "claude_dependency_internal_marker",
  "human_approval_internal_marker",
  "review_question_internal_prompt",
  "security_question_internal_context",
  "permission_bypass_internal_probe",
  "audit_completeness_internal_probe",
  "ui_leak_internal_selector",
  "risk_register_internal_entry",
  "finding_routing_internal_map",
  "human_approval_internal_summary",
  "closeout_verdict_internal_note",
  "command_rerun_internal_result",
  "cross_tenant_row_count",
  "unauthorized_object_name",
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

const REVIEW_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Architecture review questions", deliverable_type: "claude_review" }),
  Object.freeze({ index: 2, title: "Security review questions", deliverable_type: "claude_review" }),
  Object.freeze({ index: 3, title: "Permission bypass questions", deliverable_type: "security_audit" }),
  Object.freeze({ index: 4, title: "Audit completeness questions", deliverable_type: "security_audit" }),
  Object.freeze({ index: 5, title: "Missing test questions", deliverable_type: "test" }),
  Object.freeze({ index: 6, title: "UI leak questions", deliverable_type: "ui" }),
  Object.freeze({ index: 7, title: "Downstream readiness questions", deliverable_type: "implementation" }),
  Object.freeze({ index: 8, title: "Risk register", deliverable_type: "implementation" }),
  Object.freeze({ index: 9, title: "Severity taxonomy", deliverable_type: "implementation" }),
  Object.freeze({ index: 10, title: "Go/no-go verdict format", deliverable_type: "implementation" }),
  Object.freeze({ index: 11, title: "Finding routing map", deliverable_type: "implementation" }),
  Object.freeze({ index: 12, title: "Human approval summary", deliverable_type: "implementation" }),
  Object.freeze({ index: 13, title: "Claude review packet", deliverable_type: "claude_review" }),
  Object.freeze({ index: 14, title: "Closeout criteria", deliverable_type: "implementation" }),
  Object.freeze({ index: 15, title: "PASS closeout note", deliverable_type: "implementation" }),
  Object.freeze({ index: 16, title: "PASS_WITH_FINDINGS closeout note", deliverable_type: "implementation" }),
  Object.freeze({ index: 17, title: "BLOCK closeout note", deliverable_type: "implementation" }),
  Object.freeze({ index: 18, title: "Next RP dependency", deliverable_type: "implementation" }),
  Object.freeze({ index: 19, title: "Documentation update", deliverable_type: "implementation" }),
  Object.freeze({ index: 20, title: "Command rerun", deliverable_type: "implementation" }),
]);

const CP153_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P08.M06",
    phase_id: "RP03.P08",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    phase_role: "evidence_synthetic_fixture_terminal_reference",
    evidence_mode: "evidence_synthetic_fixture_terminal_reference",
    template: EVIDENCE_UNITS,
    start: 18,
    count: 3,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P08.M07",
    phase_id: "RP03.P08",
    micro_id: "M07",
    micro_title: "Test And Golden Case Set",
    phase_role: "evidence_test_golden_case_reference",
    evidence_mode: "evidence_test_golden_case_reference",
    template: EVIDENCE_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P08.M08",
    phase_id: "RP03.P08",
    micro_id: "M08",
    micro_title: "Hermes Evidence Packet",
    phase_role: "evidence_hermes_packet_reference",
    evidence_mode: "evidence_hermes_packet_reference",
    template: EVIDENCE_UNITS,
    count: 20,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P08.M09",
    phase_id: "RP03.P08",
    micro_id: "M09",
    micro_title: "Claude Review Packet",
    phase_role: "evidence_claude_review_packet_reference",
    evidence_mode: "evidence_claude_review_packet_reference",
    template: EVIDENCE_UNITS,
    count: 20,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P08.M10",
    phase_id: "RP03.P08",
    micro_id: "M10",
    micro_title: "Closeout And Next Handoff",
    phase_role: "evidence_closeout_handoff_reference",
    evidence_mode: "evidence_closeout_handoff_reference",
    template: EVIDENCE_UNITS,
    count: 8,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P09.M00",
    phase_id: "RP03.P09",
    micro_id: "M00",
    micro_title: "Scope Inventory",
    phase_role: "review_scope_inventory_reference",
    evidence_mode: "review_scope_inventory_reference",
    template: REVIEW_UNITS,
    count: 4,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P09.M01",
    phase_id: "RP03.P09",
    micro_id: "M01",
    micro_title: "Contract Draft",
    phase_role: "review_contract_draft_reference",
    evidence_mode: "review_contract_draft_reference",
    template: REVIEW_UNITS,
    count: 4,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P09.M02",
    phase_id: "RP03.P09",
    micro_id: "M02",
    micro_title: "Type And Shape Definition",
    phase_role: "review_type_shape_reference",
    evidence_mode: "review_type_shape_reference",
    template: REVIEW_UNITS,
    count: 8,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P09.M03",
    phase_id: "RP03.P09",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    phase_role: "review_primary_implementation_reference",
    evidence_mode: "review_primary_implementation_reference",
    template: REVIEW_UNITS,
    count: 20,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P09.M04",
    phase_id: "RP03.P09",
    micro_id: "M04",
    micro_title: "Secondary Workflow Slice",
    phase_role: "review_secondary_workflow_reference",
    evidence_mode: "review_secondary_workflow_reference",
    template: REVIEW_UNITS,
    count: 11,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P09.M05",
    phase_id: "RP03.P09",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    phase_role: "review_permission_audit_binding_reference",
    evidence_mode: "review_permission_audit_binding_reference",
    template: REVIEW_UNITS,
    count: 20,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P09.M06",
    phase_id: "RP03.P09",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    phase_role: "review_synthetic_fixture_reference",
    evidence_mode: "review_synthetic_fixture_reference",
    template: REVIEW_UNITS,
    count: 8,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P09.M07",
    phase_id: "RP03.P09",
    micro_id: "M07",
    micro_title: "Test And Golden Case Set",
    phase_role: "review_test_golden_case_opening_reference",
    evidence_mode: "review_test_golden_case_opening_reference",
    template: REVIEW_UNITS,
    count: 2,
  }),
]);

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function evidenceDomainFor(behaviorKind) {
  if (behaviorKind.includes("hermes") || behaviorKind.includes("evidence") || behaviorKind.includes("receipt") || behaviorKind.includes("summary")) {
    return "hermes_evidence_receipt_reference";
  }
  if (behaviorKind.includes("claude")) return "hermes_evidence_claude_dependency_reference";
  if (behaviorKind.includes("pass") || behaviorKind.includes("block")) return "hermes_evidence_verdict_semantics_reference";
  if (behaviorKind.includes("validation") || behaviorKind.includes("regression")) return "hermes_evidence_validation_reference";
  if (behaviorKind.includes("handoff") || behaviorKind.includes("next_gate")) return "hermes_evidence_handoff_reference";
  return "hermes_evidence_operator_reference";
}

function reviewDomainFor(behaviorKind) {
  if (behaviorKind.includes("architecture")) return "claude_architecture_review_question_reference";
  if (behaviorKind.includes("security")) return "claude_security_review_question_reference";
  if (behaviorKind.includes("permission_bypass")) return "claude_permission_bypass_review_question_reference";
  if (behaviorKind.includes("audit_completeness")) return "claude_audit_completeness_review_question_reference";
  if (behaviorKind.includes("missing_test")) return "claude_missing_test_review_question_reference";
  if (behaviorKind.includes("ui_leak")) return "claude_ui_leak_review_question_reference";
  if (behaviorKind.includes("risk_register")) return "review_risk_register_reference";
  if (behaviorKind.includes("severity")) return "review_severity_taxonomy_reference";
  if (behaviorKind.includes("go_no_go")) return "review_verdict_format_reference";
  if (behaviorKind.includes("finding_routing")) return "review_finding_routing_reference";
  if (behaviorKind.includes("approval")) return "review_human_approval_summary_reference";
  if (behaviorKind.includes("closeout") || behaviorKind.includes("block") || behaviorKind.includes("pass")) return "review_closeout_verdict_reference";
  if (behaviorKind.includes("next_rp")) return "review_next_dependency_reference";
  if (behaviorKind.includes("command")) return "review_command_rerun_reference";
  return "review_downstream_readiness_reference";
}

function domainFor(behaviorKind, micro) {
  if (micro.phase_id === "RP03.P08") return evidenceDomainFor(behaviorKind);
  return reviewDomainFor(behaviorKind);
}

function statusFor(behaviorKind, micro) {
  const suffix = micro.phase_id === "RP03.P08" ? "evidence_packet_reference_bound" : "review_closeout_reference_bound";
  return `${behaviorKind}_${suffix}`;
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP153_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_review_closeout_continuation: true,
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
    executes_architecture_review: false,
    executes_security_review: false,
    executes_claude_review: false,
    sends_claude_prompt: false,
    records_human_approval_marker: false,
    writes_hermes_runtime: false,
    executes_hermes_command: false,
    loads_fixture_payload: false,
    reads_fixture_document_body: false,
    materializes_fixture_manifest: false,
    materializes_evidence_template: false,
    materializes_review_packet: false,
    materializes_closeout_verdict: false,
    evaluates_permission_bypass: false,
    evaluates_audit_completeness: false,
    emits_command_result_receipt: false,
    emits_changed_file_receipt: false,
    emits_fixture_summary_receipt: false,
    emits_permission_summary_receipt: false,
    emits_audit_summary_receipt: false,
    emits_no_real_data_receipt: false,
    emits_hermes_evidence: false,
    executes_regression_receipt: false,
    exposes_ui_leak: false,
    unauthorized_count_exposed: false,
    unauthorized_object_name_exposed: false,
    hidden_field_names_exposed: false,
    exposes_unauthorized_count: false,
    exposes_unauthorized_object_name: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: CP153_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP153_MICRO_PHASES.flatMap((micro) => {
      const start = micro.start ?? 1;
      const units = micro.template.slice(start - 1, start - 1 + (micro.count ?? micro.template.length));
      return units.map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind, micro);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP153_PACK_BINDING.pack_id,
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
            "risk_c_review_closeout_continuation",
            "evidence_and_review_reference_only",
            "no_audit_event_write",
            "no_product_state_write",
            "no_permission_or_audit_binding_evaluation",
            "no_architecture_or_security_review_execution",
            "no_permission_bypass_or_audit_completeness_evaluation",
            "no_fixture_payload_load_or_manifest_materialization",
            "no_receipt_or_hermes_evidence_emission",
            "no_hermes_command_execution",
            "no_claude_prompt_materialization_or_send",
            "no_human_marker_record_or_execute",
            "no_api_or_network_execution",
            "no_ui_render_dom_or_interaction",
            "no_hidden_field_exposure",
            "cp152_handoff_inherited",
            "cp154_handoff_declared",
          ]),
          expected_status: statusFor(behaviorKind, micro),
          hidden_source_fields: CP153_HIDDEN_SOURCE_FIELDS,
        });
      });
    }),
  );
}

const CP153_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp153CoveredUnitIds() {
  return Object.freeze(CP153_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp153ReviewCloseoutContinuationCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP153_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp153ReviewCloseoutContinuationCase(caseId) {
  const row = CP153_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-153 audit compliance review closeout continuation case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "review_closeout_continuation_descriptors",
      "hermes_evidence_packet_terminal_rows",
      "claude_review_question_rows",
      "permission_bypass_question_rows",
      "audit_completeness_question_rows",
      "ui_leak_question_rows",
      "risk_register",
      "finding_routing_map",
      "closeout_verdict_format",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp153ReviewCloseoutContinuation() {
  const cases = CP153_ROWS.map((row) => runAuditComplianceCp153ReviewCloseoutContinuationCase(row.case_id));
  const coveredUnitIds = createAuditComplianceCp153CoveredUnitIds();
  const deliverableCounts = countBy(CP153_ROWS, "deliverable_type");
  const evidenceModeCounts = countBy(CP153_ROWS, "evidence_mode");
  const titles = new Set(CP153_ROWS.map((row) => row.title));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP153_REVIEW_CLOSEOUT_CONTINUATION_CONTRACT.id,
    covered_unit_count: coveredUnitIds.length,
    row_count: CP153_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: deliverableCounts,
    domain_counts: countBy(CP153_ROWS, "domain"),
    evidence_mode_counts: evidenceModeCounts,
    first_unit_id: coveredUnitIds[0],
    last_unit_id: coveredUnitIds.at(-1),
    cp152_handoff_inherited:
      AUDIT_COMPLIANCE_CP153_PACK_BINDING.upstream_pack_id === "CP00-152" &&
      coveredUnitIds[0] === AUDIT_COMPLIANCE_CP153_PACK_BINDING.first_unit_id,
    cp154_handoff_declared:
      AUDIT_COMPLIANCE_CP153_PACK_BINDING.next_pack_id === "CP00-154" &&
      AUDIT_COMPLIANCE_CP153_PACK_BINDING.next_subphase_id === "RP03.P09.M07.S03",
    h03_gate_bound: AUDIT_COMPLIANCE_CP153_PACK_BINDING.hermes_gate === "H03",
    c03_gate_bound: AUDIT_COMPLIANCE_CP153_PACK_BINDING.claude_gate === "C03",
    p08_evidence_terminal_declared:
      evidenceModeCounts.evidence_synthetic_fixture_terminal_reference === 3 &&
      evidenceModeCounts.evidence_test_golden_case_reference === 22 &&
      evidenceModeCounts.evidence_hermes_packet_reference === 20 &&
      evidenceModeCounts.evidence_claude_review_packet_reference === 20 &&
      evidenceModeCounts.evidence_closeout_handoff_reference === 8,
    p09_review_question_opening_declared:
      evidenceModeCounts.review_scope_inventory_reference === 4 &&
      evidenceModeCounts.review_contract_draft_reference === 4 &&
      evidenceModeCounts.review_type_shape_reference === 8 &&
      evidenceModeCounts.review_primary_implementation_reference === 20 &&
      evidenceModeCounts.review_secondary_workflow_reference === 11 &&
      evidenceModeCounts.review_permission_audit_binding_reference === 20 &&
      evidenceModeCounts.review_synthetic_fixture_reference === 8 &&
      evidenceModeCounts.review_test_golden_case_opening_reference === 2,
    deliverable_distribution_declared:
      deliverableCounts.implementation === 63 &&
      deliverableCounts.test === 9 &&
      deliverableCounts.hermes_evidence === 38 &&
      deliverableCounts.claude_review === 21 &&
      deliverableCounts.security_audit === 14 &&
      deliverableCounts.ui === 5,
    review_question_boundaries_declared:
      titles.has("Architecture review questions") &&
      titles.has("Security review questions") &&
      titles.has("Permission bypass questions") &&
      titles.has("Audit completeness questions") &&
      titles.has("UI leak questions"),
    closeout_verdict_boundaries_declared:
      titles.has("PASS closeout note") &&
      titles.has("PASS_WITH_FINDINGS closeout note") &&
      titles.has("BLOCK closeout note") &&
      titles.has("Finding routing map"),
    no_review_or_evidence_execution_declared:
      CP153_ROWS.every((row) => row.required_assertions.includes("no_architecture_or_security_review_execution")) &&
      CP153_ROWS.every((row) => row.required_assertions.includes("no_receipt_or_hermes_evidence_emission")),
    hidden_field_policy_declared:
      CP153_ROWS.every((row) => row.hidden_source_fields === CP153_HIDDEN_SOURCE_FIELDS) &&
      CP153_HIDDEN_SOURCE_FIELDS.includes("permission_bypass_internal_probe") &&
      CP153_HIDDEN_SOURCE_FIELDS.includes("ui_leak_internal_selector"),
  });
}

export function createAuditComplianceCp153ReviewCloseoutContinuationManifest() {
  const readiness = createAuditComplianceCp153ReviewCloseoutContinuation();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP153_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP153_REVIEW_CLOSEOUT_CONTINUATION_CONTRACT,
    readiness,
    no_write_attestation: CP153_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP153_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp153CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP153_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp153HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-153.audit_compliance_review_closeout_continuation",
    hermes_gate: AUDIT_COMPLIANCE_CP153_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/review-closeout-continuation-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-153/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp153CoveredUnitIds(),
  });
}

export function createAuditComplianceCp153ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-153.audit_compliance_review_closeout_continuation",
    claude_gate: AUDIT_COMPLIANCE_CP153_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-153 cover exactly the 150 planned Risk C evidence terminal and review closeout units in order?",
      "Can any CP00-153 evidence row execute Hermes commands, emit receipts, materialize templates, or write audit/product state?",
      "Can any CP00-153 review row execute architecture/security review, evaluate permission bypass or audit completeness, record human approval, or expose hidden internals?",
      "Are H03/C03 packet descriptors and PASS/PASS_WITH_FINDINGS/BLOCK semantics reference-only and non-authoritative?",
      "Does CP00-153 hand off cleanly from CP00-152 to CP00-154 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/review-closeout-continuation-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp153CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-153.to.CP00-154",
    from_pack_id: AUDIT_COMPLIANCE_CP153_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP153_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP153_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_review_test_golden_case_sensitive_continuation",
    dependencies: Object.freeze([
      "cp152_evidence_workflow_fixture",
      "p08_evidence_workflow_descriptors",
      "p08_hermes_claude_closeout_descriptors",
      "p09_review_question_descriptors",
      "p09_finding_routing_closeout_descriptors",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp153Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp153CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP153_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP153_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP153_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP153_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
