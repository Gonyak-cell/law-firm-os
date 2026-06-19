export const AUDIT_COMPLIANCE_CP154_PACK_BINDING = Object.freeze({
  pack_id: "CP00-154",
  planned_pack_id: "CP00-154",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP03.P09.M07.S03",
  last_unit_id: "RP03.P09.M07.S12",
  range: "RP03.P09.M07.S03-RP03.P09.M07.S12",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-153",
  next_pack_id: "CP00-155",
  next_subphase_id: "RP03.P09.M07.S13",
  production_ready_flag: "audit_compliance_review_sensitive_boundary_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP154_REVIEW_SENSITIVE_BOUNDARY_CONTRACT = Object.freeze({
  id: "audit_compliance_cp154_review_sensitive_boundary_contract",
  pack_id: AUDIT_COMPLIANCE_CP154_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance review sensitive boundary pack",
  production_ready_flag: AUDIT_COMPLIANCE_CP154_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP154_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP154_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP154_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP154_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP154_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP154_NO_WRITE_ATTESTATION = Object.freeze({
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
  materializes_severity_taxonomy: false,
  materializes_go_no_go_verdict: false,
  materializes_finding_routing_map: false,
  materializes_human_approval_summary: false,
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

const CP154_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "severity_taxonomy_internal_rule",
  "go_no_go_internal_verdict",
  "finding_routing_internal_map",
  "human_approval_internal_summary",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]);

const CP154_UNITS = Object.freeze([
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
]);

const CP154_MICRO_PHASE = Object.freeze({
  micro_phase_id: "RP03.P09.M07",
  phase_id: "RP03.P09",
  micro_id: "M07",
  micro_title: "Test And Golden Case Set",
  phase_role: "review_test_golden_case_sensitive_boundary",
  evidence_mode: "review_test_golden_case_sensitive_boundary",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(index) {
  return `${CP154_MICRO_PHASE.micro_phase_id}.S${String(index).padStart(2, "0")}`;
}

function domainFor(behaviorKind) {
  if (behaviorKind.includes("permission_bypass")) return "review_permission_bypass_question_boundary";
  if (behaviorKind.includes("audit_completeness")) return "review_audit_completeness_question_boundary";
  if (behaviorKind.includes("missing_test")) return "review_missing_test_question_boundary";
  if (behaviorKind.includes("ui_leak")) return "review_ui_leak_question_boundary";
  if (behaviorKind.includes("downstream")) return "review_downstream_readiness_question_boundary";
  if (behaviorKind.includes("risk_register")) return "review_risk_register_boundary";
  if (behaviorKind.includes("severity")) return "review_severity_taxonomy_boundary";
  if (behaviorKind.includes("go_no_go")) return "review_go_no_go_verdict_boundary";
  if (behaviorKind.includes("finding_routing")) return "review_finding_routing_boundary";
  if (behaviorKind.includes("approval")) return "review_human_approval_summary_boundary";
  return "review_sensitive_boundary";
}

function sensitiveAssertionFor(behaviorKind) {
  if (behaviorKind.includes("permission_bypass")) return "no_permission_bypass_probe_execution";
  if (behaviorKind.includes("audit_completeness")) return "no_audit_completeness_probe_execution";
  if (behaviorKind.includes("missing_test")) return "no_missing_test_gap_evaluation";
  if (behaviorKind.includes("ui_leak")) return "no_ui_leak_probe_execution";
  if (behaviorKind.includes("risk_register")) return "no_risk_register_materialization";
  if (behaviorKind.includes("severity")) return "no_severity_taxonomy_materialization";
  if (behaviorKind.includes("go_no_go")) return "no_go_no_go_verdict_materialization";
  if (behaviorKind.includes("finding_routing")) return "no_finding_routing_map_materialization";
  if (behaviorKind.includes("approval")) return "no_human_approval_summary_materialization";
  return "no_downstream_readiness_evaluation";
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP154_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_a_review_sensitive_boundary: true,
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
    materializes_severity_taxonomy: false,
    materializes_go_no_go_verdict: false,
    materializes_finding_routing_map: false,
    materializes_human_approval_summary: false,
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
    no_write_attestation: CP154_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(CP154_UNITS.map((unit) => {
    const behaviorKind = slugFor(unit.title);
    const sourceUnitId = sourceUnitIdFor(unit.index);
    const domain = domainFor(behaviorKind);
    return Object.freeze({
      catalog_id: `${sourceUnitId}.${behaviorKind}`,
      pack_id: AUDIT_COMPLIANCE_CP154_PACK_BINDING.pack_id,
      program_id: "RP03",
      phase_id: CP154_MICRO_PHASE.phase_id,
      micro_phase_id: CP154_MICRO_PHASE.micro_phase_id,
      micro_id: CP154_MICRO_PHASE.micro_id,
      micro_title: CP154_MICRO_PHASE.micro_title,
      phase_role: CP154_MICRO_PHASE.phase_role,
      area: `${domain}.${slugFor(CP154_MICRO_PHASE.micro_title)}`,
      domain,
      evidence_mode: CP154_MICRO_PHASE.evidence_mode,
      title: unit.title,
      coverage_kind: behaviorKind,
      deliverable_type: unit.deliverable_type,
      case_id: `${sourceUnitId}.${behaviorKind}`,
      behavior_kind: behaviorKind,
      source_unit_ids: Object.freeze([sourceUnitId]),
      required_assertions: Object.freeze([
        "synthetic_only",
        "risk_a_review_sensitive_boundary",
        "review_boundary_reference_only",
        "no_audit_event_write",
        "no_product_state_write",
        "no_permission_or_audit_binding_evaluation",
        "no_architecture_or_security_review_execution",
        "no_permission_bypass_or_audit_completeness_evaluation",
        "no_missing_test_ui_or_downstream_evaluation",
        "no_risk_severity_verdict_routing_or_approval_materialization",
        "no_fixture_payload_load_or_manifest_materialization",
        "no_receipt_or_hermes_evidence_emission",
        "no_hermes_command_execution",
        "no_claude_prompt_materialization_or_send",
        "no_human_marker_record_or_execute",
        "no_api_or_network_execution",
        "no_ui_render_dom_or_interaction",
        "no_hidden_field_exposure",
        "cp153_handoff_inherited",
        "cp155_handoff_declared",
        sensitiveAssertionFor(behaviorKind),
      ]),
      expected_status: `${behaviorKind}_review_sensitive_boundary_bound`,
      hidden_source_fields: CP154_HIDDEN_SOURCE_FIELDS,
    });
  }));
}

const CP154_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp154CoveredUnitIds() {
  return Object.freeze(CP154_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp154ReviewSensitiveBoundaryCatalog({ domain, deliverable_type } = {}) {
  return Object.freeze(CP154_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type),
  ));
}

export function runAuditComplianceCp154ReviewSensitiveBoundaryCase(caseId) {
  const row = CP154_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-154 audit compliance review sensitive boundary case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "permission_bypass_questions",
      "audit_completeness_questions",
      "missing_test_questions",
      "ui_leak_questions",
      "downstream_readiness_questions",
      "risk_register",
      "severity_taxonomy",
      "go_no_go_verdict_format",
      "finding_routing_map",
      "human_approval_summary",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp154ReviewSensitiveBoundary() {
  const cases = CP154_ROWS.map((row) => runAuditComplianceCp154ReviewSensitiveBoundaryCase(row.case_id));
  const coveredUnitIds = createAuditComplianceCp154CoveredUnitIds();
  const deliverableCounts = countBy(CP154_ROWS, "deliverable_type");
  const domainCounts = countBy(CP154_ROWS, "domain");
  const titles = new Set(CP154_ROWS.map((row) => row.title));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP154_REVIEW_SENSITIVE_BOUNDARY_CONTRACT.id,
    covered_unit_count: coveredUnitIds.length,
    row_count: CP154_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: deliverableCounts,
    domain_counts: domainCounts,
    evidence_mode_counts: countBy(CP154_ROWS, "evidence_mode"),
    first_unit_id: coveredUnitIds[0],
    last_unit_id: coveredUnitIds.at(-1),
    cp153_handoff_inherited:
      AUDIT_COMPLIANCE_CP154_PACK_BINDING.upstream_pack_id === "CP00-153" &&
      coveredUnitIds[0] === AUDIT_COMPLIANCE_CP154_PACK_BINDING.first_unit_id,
    cp155_handoff_declared:
      AUDIT_COMPLIANCE_CP154_PACK_BINDING.next_pack_id === "CP00-155" &&
      AUDIT_COMPLIANCE_CP154_PACK_BINDING.next_subphase_id === "RP03.P09.M07.S13",
    h03_gate_bound: AUDIT_COMPLIANCE_CP154_PACK_BINDING.hermes_gate === "H03",
    c03_gate_bound: AUDIT_COMPLIANCE_CP154_PACK_BINDING.claude_gate === "C03",
    sensitive_question_boundaries_declared:
      titles.has("Permission bypass questions") &&
      titles.has("Audit completeness questions") &&
      titles.has("Missing test questions") &&
      titles.has("UI leak questions") &&
      titles.has("Downstream readiness questions"),
    risk_verdict_routing_boundaries_declared:
      titles.has("Risk register") &&
      titles.has("Severity taxonomy") &&
      titles.has("Go/no-go verdict format") &&
      titles.has("Finding routing map") &&
      titles.has("Human approval summary"),
    deliverable_distribution_declared:
      deliverableCounts.security_audit === 2 &&
      deliverableCounts.test === 1 &&
      deliverableCounts.ui === 1 &&
      deliverableCounts.implementation === 6,
    domain_distribution_declared:
      Object.values(domainCounts).every((count) => count === 1) &&
      Object.keys(domainCounts).length === 10,
    no_review_or_sensitive_execution_declared:
      CP154_ROWS.every((row) => row.required_assertions.includes("no_architecture_or_security_review_execution")) &&
      CP154_ROWS.every((row) => row.required_assertions.includes("no_permission_bypass_or_audit_completeness_evaluation")) &&
      CP154_ROWS.every((row) => row.required_assertions.includes("no_missing_test_ui_or_downstream_evaluation")) &&
      CP154_ROWS.every((row) => row.required_assertions.includes("no_risk_severity_verdict_routing_or_approval_materialization")),
    hidden_field_policy_declared:
      CP154_ROWS.every((row) => row.hidden_source_fields === CP154_HIDDEN_SOURCE_FIELDS) &&
      CP154_HIDDEN_SOURCE_FIELDS.includes("permission_bypass_internal_probe") &&
      CP154_HIDDEN_SOURCE_FIELDS.includes("go_no_go_internal_verdict"),
  });
}

export function createAuditComplianceCp154ReviewSensitiveBoundaryManifest() {
  const readiness = createAuditComplianceCp154ReviewSensitiveBoundary();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP154_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP154_REVIEW_SENSITIVE_BOUNDARY_CONTRACT,
    readiness,
    no_write_attestation: CP154_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP154_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp154CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP154_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp154HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-154.audit_compliance_review_sensitive_boundary",
    hermes_gate: AUDIT_COMPLIANCE_CP154_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/review-sensitive-boundary-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-154/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp154CoveredUnitIds(),
  });
}

export function createAuditComplianceCp154ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-154.audit_compliance_review_sensitive_boundary",
    claude_gate: AUDIT_COMPLIANCE_CP154_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-154 cover exactly the 10 planned Risk A review-sensitive boundary units in order?",
      "Can any CP00-154 row evaluate permission bypass, audit completeness, missing tests, UI leaks, downstream readiness, or sensitive routing decisions?",
      "Can CP00-154 materialize risk registers, severity taxonomies, go/no-go verdicts, finding routes, human approval summaries, or closeout verdicts?",
      "Are H03/C03 packet descriptors reference-only and non-authoritative?",
      "Does CP00-154 hand off cleanly from CP00-153 to CP00-155 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/review-sensitive-boundary-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp154CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-154.to.CP00-155",
    from_pack_id: AUDIT_COMPLIANCE_CP154_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP154_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP154_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_review_closeout_terminal_continuation",
    dependencies: Object.freeze([
      "cp153_review_closeout_continuation",
      "p09_review_test_golden_sensitive_boundaries",
      "permission_bypass_and_audit_completeness_question_descriptors",
      "missing_test_and_ui_leak_question_descriptors",
      "risk_severity_verdict_routing_approval_descriptors",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp154Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp154CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP154_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP154_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP154_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP154_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
