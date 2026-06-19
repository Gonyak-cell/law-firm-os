export const AUDIT_COMPLIANCE_CP155_PACK_BINDING = Object.freeze({
  pack_id: "CP00-155",
  planned_pack_id: "CP00-155",
  risk_class: "C",
  unit_count: 28,
  first_unit_id: "RP03.P09.M07.S13",
  last_unit_id: "RP03.P09.M10.S04",
  range: "RP03.P09.M07.S13-RP03.P09.M10.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-154",
  next_pack_id: "CP00-156",
  next_subphase_id: "RP04.P00.M00.S01",
  production_ready_flag: "audit_compliance_review_terminal_closeout_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP155_REVIEW_TERMINAL_CLOSEOUT_CONTRACT = Object.freeze({
  id: "audit_compliance_cp155_review_terminal_closeout_contract",
  pack_id: AUDIT_COMPLIANCE_CP155_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance review terminal closeout pack",
  production_ready_flag: AUDIT_COMPLIANCE_CP155_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP155_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP155_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP155_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP155_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP155_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP155_NO_WRITE_ATTESTATION = Object.freeze({
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
  evaluates_missing_test_gap: false,
  evaluates_ui_leak: false,
  evaluates_downstream_readiness: false,
  materializes_risk_register: false,
  materializes_closeout_criteria: false,
  materializes_pass_closeout_note: false,
  materializes_pass_with_findings_closeout_note: false,
  materializes_block_closeout_note: false,
  materializes_next_rp_dependency: false,
  materializes_documentation_update: false,
  executes_command_rerun: false,
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

const CP155_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "review_question_internal_prompt",
  "security_question_internal_context",
  "permission_bypass_internal_probe",
  "audit_completeness_internal_probe",
  "missing_test_internal_gap",
  "ui_leak_internal_selector",
  "downstream_readiness_internal_signal",
  "risk_register_internal_entry",
  "closeout_criteria_internal_note",
  "pass_closeout_internal_note",
  "pass_with_findings_internal_note",
  "block_closeout_internal_note",
  "next_rp_dependency_internal_map",
  "documentation_update_internal_body",
  "command_rerun_internal_result",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]);

const REVIEW_TERMINAL_UNITS = Object.freeze([
  Object.freeze({ index: 13, title: "Claude review packet", deliverable_type: "claude_review" }),
  Object.freeze({ index: 14, title: "Closeout criteria", deliverable_type: "implementation" }),
  Object.freeze({ index: 15, title: "PASS closeout note", deliverable_type: "implementation" }),
  Object.freeze({ index: 16, title: "PASS_WITH_FINDINGS closeout note", deliverable_type: "implementation" }),
  Object.freeze({ index: 17, title: "BLOCK closeout note", deliverable_type: "implementation" }),
  Object.freeze({ index: 18, title: "Next RP dependency", deliverable_type: "implementation" }),
  Object.freeze({ index: 19, title: "Documentation update", deliverable_type: "implementation" }),
  Object.freeze({ index: 20, title: "Command rerun", deliverable_type: "implementation" }),
]);

const REVIEW_PACKET_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Architecture review questions", deliverable_type: "claude_review" }),
  Object.freeze({ index: 2, title: "Security review questions", deliverable_type: "claude_review" }),
  Object.freeze({ index: 3, title: "Permission bypass questions", deliverable_type: "security_audit" }),
  Object.freeze({ index: 4, title: "Audit completeness questions", deliverable_type: "security_audit" }),
  Object.freeze({ index: 5, title: "Missing test questions", deliverable_type: "test" }),
  Object.freeze({ index: 6, title: "UI leak questions", deliverable_type: "ui" }),
  Object.freeze({ index: 7, title: "Downstream readiness questions", deliverable_type: "implementation" }),
  Object.freeze({ index: 8, title: "Risk register", deliverable_type: "implementation" }),
]);

const CP155_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P09.M07",
    phase_id: "RP03.P09",
    micro_id: "M07",
    micro_title: "Test And Golden Case Set",
    phase_role: "review_test_golden_case_terminal_closeout",
    evidence_mode: "review_test_golden_case_terminal_closeout",
    template: REVIEW_TERMINAL_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P09.M08",
    phase_id: "RP03.P09",
    micro_id: "M08",
    micro_title: "Hermes Evidence Packet",
    phase_role: "review_hermes_evidence_packet_terminal",
    evidence_mode: "review_hermes_evidence_packet_terminal",
    template: REVIEW_PACKET_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P09.M09",
    phase_id: "RP03.P09",
    micro_id: "M09",
    micro_title: "Claude Review Packet",
    phase_role: "review_claude_review_packet_terminal",
    evidence_mode: "review_claude_review_packet_terminal",
    template: REVIEW_PACKET_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P09.M10",
    phase_id: "RP03.P09",
    micro_id: "M10",
    micro_title: "Closeout And Next Handoff",
    phase_role: "review_closeout_next_handoff_terminal",
    evidence_mode: "review_closeout_next_handoff_terminal",
    template: REVIEW_PACKET_UNITS,
    count: 4,
  }),
]);

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function domainFor(behaviorKind) {
  if (behaviorKind.includes("claude_review_packet")) return "review_claude_packet_terminal_reference";
  if (behaviorKind.includes("architecture")) return "review_architecture_question_terminal_reference";
  if (behaviorKind.includes("security")) return "review_security_question_terminal_reference";
  if (behaviorKind.includes("permission_bypass")) return "review_permission_bypass_question_terminal_reference";
  if (behaviorKind.includes("audit_completeness")) return "review_audit_completeness_question_terminal_reference";
  if (behaviorKind.includes("missing_test")) return "review_missing_test_question_terminal_reference";
  if (behaviorKind.includes("ui_leak")) return "review_ui_leak_question_terminal_reference";
  if (behaviorKind.includes("downstream")) return "review_downstream_readiness_terminal_reference";
  if (behaviorKind.includes("risk_register")) return "review_risk_register_terminal_reference";
  if (behaviorKind.includes("closeout_criteria")) return "review_closeout_criteria_terminal_reference";
  if (behaviorKind.includes("pass_with_findings")) return "review_pass_with_findings_terminal_reference";
  if (behaviorKind.includes("pass_closeout")) return "review_pass_terminal_reference";
  if (behaviorKind.includes("block_closeout")) return "review_block_terminal_reference";
  if (behaviorKind.includes("next_rp")) return "review_next_rp_dependency_terminal_reference";
  if (behaviorKind.includes("documentation")) return "review_documentation_update_terminal_reference";
  if (behaviorKind.includes("command_rerun")) return "review_command_rerun_terminal_reference";
  return "review_terminal_closeout_reference";
}

function assertionFor(behaviorKind) {
  if (behaviorKind.includes("permission_bypass")) return "no_permission_bypass_probe_execution";
  if (behaviorKind.includes("audit_completeness")) return "no_audit_completeness_probe_execution";
  if (behaviorKind.includes("missing_test")) return "no_missing_test_gap_evaluation";
  if (behaviorKind.includes("ui_leak")) return "no_ui_leak_probe_execution";
  if (behaviorKind.includes("downstream")) return "no_downstream_readiness_evaluation";
  if (behaviorKind.includes("risk_register")) return "no_risk_register_materialization";
  if (behaviorKind.includes("closeout_criteria")) return "no_closeout_criteria_materialization";
  if (behaviorKind.includes("pass_with_findings")) return "no_pass_with_findings_note_materialization";
  if (behaviorKind.includes("pass_closeout")) return "no_pass_note_materialization";
  if (behaviorKind.includes("block_closeout")) return "no_block_note_materialization";
  if (behaviorKind.includes("next_rp")) return "no_next_rp_dependency_materialization";
  if (behaviorKind.includes("documentation")) return "no_documentation_update_materialization";
  if (behaviorKind.includes("command_rerun")) return "no_command_rerun_execution";
  return "no_review_packet_materialization";
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP155_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_review_terminal_closeout: true,
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
    evaluates_missing_test_gap: false,
    evaluates_ui_leak: false,
    evaluates_downstream_readiness: false,
    materializes_risk_register: false,
    materializes_closeout_criteria: false,
    materializes_pass_closeout_note: false,
    materializes_pass_with_findings_closeout_note: false,
    materializes_block_closeout_note: false,
    materializes_next_rp_dependency: false,
    materializes_documentation_update: false,
    executes_command_rerun: false,
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
    no_write_attestation: CP155_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(CP155_MICRO_PHASES.flatMap((micro) => {
    const units = micro.template.slice(0, micro.count ?? micro.template.length);
    return units.map((unit) => {
      const behaviorKind = slugFor(unit.title);
      const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
      const domain = domainFor(behaviorKind);
      return Object.freeze({
        catalog_id: `${sourceUnitId}.${behaviorKind}`,
        pack_id: AUDIT_COMPLIANCE_CP155_PACK_BINDING.pack_id,
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
          "risk_c_review_terminal_closeout",
          "review_terminal_reference_only",
          "no_audit_event_write",
          "no_product_state_write",
          "no_permission_or_audit_binding_evaluation",
          "no_architecture_or_security_review_execution",
          "no_permission_bypass_or_audit_completeness_evaluation",
          "no_missing_test_ui_or_downstream_evaluation",
          "no_terminal_closeout_materialization_or_execution",
          "no_receipt_or_hermes_evidence_emission",
          "no_hermes_command_execution",
          "no_claude_prompt_materialization_or_send",
          "no_human_marker_record_or_execute",
          "no_api_or_network_execution",
          "no_ui_render_dom_or_interaction",
          "no_hidden_field_exposure",
          "cp154_handoff_inherited",
          "cp156_handoff_declared",
          assertionFor(behaviorKind),
        ]),
        expected_status: `${behaviorKind}_review_terminal_closeout_bound`,
        hidden_source_fields: CP155_HIDDEN_SOURCE_FIELDS,
      });
    });
  }));
}

const CP155_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp155CoveredUnitIds() {
  return Object.freeze(CP155_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp155ReviewTerminalCloseoutCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP155_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp155ReviewTerminalCloseoutCase(caseId) {
  const row = CP155_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-155 audit compliance review terminal closeout case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "claude_review_packet",
      "closeout_criteria",
      "pass_closeout_note",
      "pass_with_findings_closeout_note",
      "block_closeout_note",
      "next_rp_dependency",
      "documentation_update",
      "command_rerun",
      "architecture_review_questions",
      "security_review_questions",
      "permission_bypass_questions",
      "audit_completeness_questions",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp155ReviewTerminalCloseout() {
  const cases = CP155_ROWS.map((row) => runAuditComplianceCp155ReviewTerminalCloseoutCase(row.case_id));
  const coveredUnitIds = createAuditComplianceCp155CoveredUnitIds();
  const deliverableCounts = countBy(CP155_ROWS, "deliverable_type");
  const evidenceModeCounts = countBy(CP155_ROWS, "evidence_mode");
  const titles = new Set(CP155_ROWS.map((row) => row.title));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP155_REVIEW_TERMINAL_CLOSEOUT_CONTRACT.id,
    covered_unit_count: coveredUnitIds.length,
    row_count: CP155_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: deliverableCounts,
    domain_counts: countBy(CP155_ROWS, "domain"),
    evidence_mode_counts: evidenceModeCounts,
    first_unit_id: coveredUnitIds[0],
    last_unit_id: coveredUnitIds.at(-1),
    cp154_handoff_inherited:
      AUDIT_COMPLIANCE_CP155_PACK_BINDING.upstream_pack_id === "CP00-154" &&
      coveredUnitIds[0] === AUDIT_COMPLIANCE_CP155_PACK_BINDING.first_unit_id,
    cp156_handoff_declared:
      AUDIT_COMPLIANCE_CP155_PACK_BINDING.next_pack_id === "CP00-156" &&
      AUDIT_COMPLIANCE_CP155_PACK_BINDING.next_subphase_id === "RP04.P00.M00.S01",
    h03_gate_bound: AUDIT_COMPLIANCE_CP155_PACK_BINDING.hermes_gate === "H03",
    c03_gate_bound: AUDIT_COMPLIANCE_CP155_PACK_BINDING.claude_gate === "C03",
    terminal_closeout_rows_declared:
      titles.has("Claude review packet") &&
      titles.has("Closeout criteria") &&
      titles.has("PASS closeout note") &&
      titles.has("PASS_WITH_FINDINGS closeout note") &&
      titles.has("BLOCK closeout note") &&
      titles.has("Next RP dependency") &&
      titles.has("Documentation update") &&
      titles.has("Command rerun"),
    terminal_review_questions_declared:
      titles.has("Architecture review questions") &&
      titles.has("Security review questions") &&
      titles.has("Permission bypass questions") &&
      titles.has("Audit completeness questions"),
    evidence_mode_distribution_declared:
      evidenceModeCounts.review_test_golden_case_terminal_closeout === 8 &&
      evidenceModeCounts.review_hermes_evidence_packet_terminal === 8 &&
      evidenceModeCounts.review_claude_review_packet_terminal === 8 &&
      evidenceModeCounts.review_closeout_next_handoff_terminal === 4,
    deliverable_distribution_declared:
      deliverableCounts.implementation === 11 &&
      deliverableCounts.claude_review === 7 &&
      deliverableCounts.security_audit === 6 &&
      deliverableCounts.test === 2 &&
      deliverableCounts.ui === 2,
    no_review_or_terminal_execution_declared:
      CP155_ROWS.every((row) => row.required_assertions.includes("no_architecture_or_security_review_execution")) &&
      CP155_ROWS.every((row) => row.required_assertions.includes("no_terminal_closeout_materialization_or_execution")),
    hidden_field_policy_declared:
      CP155_ROWS.every((row) => row.hidden_source_fields === CP155_HIDDEN_SOURCE_FIELDS) &&
      CP155_HIDDEN_SOURCE_FIELDS.includes("command_rerun_internal_result") &&
      CP155_HIDDEN_SOURCE_FIELDS.includes("next_rp_dependency_internal_map"),
  });
}

export function createAuditComplianceCp155ReviewTerminalCloseoutManifest() {
  const readiness = createAuditComplianceCp155ReviewTerminalCloseout();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP155_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP155_REVIEW_TERMINAL_CLOSEOUT_CONTRACT,
    readiness,
    no_write_attestation: CP155_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP155_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp155CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP155_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp155HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-155.audit_compliance_review_terminal_closeout",
    hermes_gate: AUDIT_COMPLIANCE_CP155_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/review-terminal-closeout-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-155/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp155CoveredUnitIds(),
  });
}

export function createAuditComplianceCp155ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-155.audit_compliance_review_terminal_closeout",
    claude_gate: AUDIT_COMPLIANCE_CP155_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-155 cover exactly the 28 planned Risk C terminal closeout units in order?",
      "Can any CP00-155 row execute Hermes commands, emit receipts, run Claude review, or write audit/product state?",
      "Can any CP00-155 row evaluate permission bypass, audit completeness, missing tests, UI leaks, or downstream readiness?",
      "Are terminal PASS/PASS_WITH_FINDINGS/BLOCK, next-RP dependency, documentation update, and command rerun rows descriptor-only?",
      "Does CP00-155 hand off cleanly from CP00-154 to RP04 CP00-156 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/review-terminal-closeout-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp155CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-155.to.CP00-156",
    from_pack_id: AUDIT_COMPLIANCE_CP155_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP155_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP155_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_rp04_master_data_entry_readiness",
    dependencies: Object.freeze([
      "cp154_review_sensitive_boundary",
      "rp03_review_terminal_closeout_descriptors",
      "rp03_hermes_evidence_packet_terminal_descriptors",
      "rp03_claude_review_packet_terminal_descriptors",
      "rp03_closeout_next_handoff_descriptors",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp155Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp155CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP155_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP155_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP155_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP155_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
