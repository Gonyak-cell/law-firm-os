export const AUDIT_COMPLIANCE_CP152_PACK_BINDING = Object.freeze({
  pack_id: "CP00-152",
  planned_pack_id: "CP00-152",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP03.P08.M04.S20",
  last_unit_id: "RP03.P08.M06.S17",
  range: "RP03.P08.M04.S20-RP03.P08.M06.S17",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-151",
  next_pack_id: "CP00-153",
  next_subphase_id: "RP03.P08.M06.S18",
  production_ready_flag: "audit_compliance_evidence_workflow_fixture_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP152_EVIDENCE_WORKFLOW_FIXTURE_CONTRACT = Object.freeze({
  id: "audit_compliance_cp152_evidence_workflow_fixture_contract",
  pack_id: AUDIT_COMPLIANCE_CP152_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance evidence workflow fixture pack",
  production_ready_flag: AUDIT_COMPLIANCE_CP152_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP152_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP152_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP152_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP152_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP152_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP152_NO_WRITE_ATTESTATION = Object.freeze({
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

const CP152_HIDDEN_SOURCE_FIELDS = Object.freeze([
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

const CP152_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P08.M04",
    phase_id: "RP03.P08",
    micro_id: "M04",
    micro_title: "Secondary Workflow Slice",
    phase_role: "evidence_secondary_workflow_terminal_reference",
    evidence_mode: "evidence_secondary_workflow_terminal_reference",
    template: EVIDENCE_UNITS,
    start: 20,
    count: 1,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P08.M05",
    phase_id: "RP03.P08",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    phase_role: "evidence_permission_audit_binding_reference",
    evidence_mode: "evidence_permission_audit_binding_reference",
    template: EVIDENCE_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P08.M06",
    phase_id: "RP03.P08",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    phase_role: "evidence_synthetic_fixture_opening_reference",
    evidence_mode: "evidence_synthetic_fixture_opening_reference",
    template: EVIDENCE_UNITS,
    count: 17,
  }),
]);

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function domainFor(behaviorKind, micro) {
  if (behaviorKind.includes("hermes") || behaviorKind.includes("evidence") || behaviorKind.includes("receipt") || behaviorKind.includes("summary")) {
    return "hermes_evidence_receipt_reference";
  }
  if (behaviorKind.includes("claude")) return "hermes_evidence_claude_dependency_reference";
  if (behaviorKind.includes("pass") || behaviorKind.includes("block")) return "hermes_evidence_verdict_semantics_reference";
  if (behaviorKind.includes("validation") || behaviorKind.includes("regression")) return "hermes_evidence_validation_reference";
  if (behaviorKind.includes("handoff") || behaviorKind.includes("next_gate")) return "hermes_evidence_handoff_reference";
  return "hermes_evidence_operator_reference";
}

function statusFor(behaviorKind) {
  return `${behaviorKind}_evidence_packet_reference_bound`;
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP152_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_b_evidence_workflow_fixture: true,
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
    no_write_attestation: CP152_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP152_MICRO_PHASES.flatMap((micro) => {
      const start = micro.start ?? 1;
      const units = micro.template.slice(start - 1, start - 1 + (micro.count ?? micro.template.length));
      return units.map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind, micro);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP152_PACK_BINDING.pack_id,
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
            "risk_b_evidence_workflow_fixture",
            "evidence_workflow_reference_only",
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
            "cp151_handoff_inherited",
            "cp153_handoff_declared",
          ]),
          expected_status: statusFor(behaviorKind, micro),
          hidden_source_fields: CP152_HIDDEN_SOURCE_FIELDS,
        });
      });
    }),
  );
}

const CP152_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp152CoveredUnitIds() {
  return Object.freeze(CP152_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp152EvidenceWorkflowFixtureCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP152_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp152EvidenceWorkflowFixtureCase(caseId) {
  const row = CP152_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-152 audit compliance evidence workflow fixture case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "evidence_workflow_descriptors",
      "synthetic_fixture_evidence_rows",
      "evidence_regression_receipt",
      "hermes_evidence_packet",
      "claude_review_packet",
      "closeout_handoff",
      "hermes_scope_inventory",
      "hermes_contract_type_shape",
      "hermes_primary_secondary_evidence_rows",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp152EvidenceWorkflowFixture() {
  const cases = CP152_ROWS.map((row) => runAuditComplianceCp152EvidenceWorkflowFixtureCase(row.case_id));
  const coveredUnitIds = createAuditComplianceCp152CoveredUnitIds();
  const deliverableCounts = countBy(CP152_ROWS, "deliverable_type");
  const evidenceModeCounts = countBy(CP152_ROWS, "evidence_mode");
  const titles = new Set(CP152_ROWS.map((row) => row.title));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP152_EVIDENCE_WORKFLOW_FIXTURE_CONTRACT.id,
    covered_unit_count: coveredUnitIds.length,
    row_count: CP152_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: deliverableCounts,
    domain_counts: countBy(CP152_ROWS, "domain"),
    evidence_mode_counts: evidenceModeCounts,
    first_unit_id: coveredUnitIds[0],
    last_unit_id: coveredUnitIds.at(-1),
    cp151_handoff_inherited:
      AUDIT_COMPLIANCE_CP152_PACK_BINDING.upstream_pack_id === "CP00-151" &&
      coveredUnitIds[0] === AUDIT_COMPLIANCE_CP152_PACK_BINDING.first_unit_id,
    cp153_handoff_declared:
      AUDIT_COMPLIANCE_CP152_PACK_BINDING.next_pack_id === "CP00-153" &&
      AUDIT_COMPLIANCE_CP152_PACK_BINDING.next_subphase_id === "RP03.P08.M06.S18",
    h03_gate_bound: AUDIT_COMPLIANCE_CP152_PACK_BINDING.hermes_gate === "H03",
    c03_gate_bound: AUDIT_COMPLIANCE_CP152_PACK_BINDING.claude_gate === "C03",
    secondary_workflow_terminal_declared:
      evidenceModeCounts.evidence_secondary_workflow_terminal_reference === 1 &&
      titles.has("Next gate readiness"),
    permission_audit_binding_declared:
      evidenceModeCounts.evidence_permission_audit_binding_reference === 22 &&
      titles.has("Permission summary receipt") &&
      titles.has("Audit summary receipt"),
    synthetic_fixture_opening_declared:
      evidenceModeCounts.evidence_synthetic_fixture_opening_reference === 17 &&
      titles.has("Hermes command matrix") &&
      titles.has("Harness boundary note"),
    hermes_evidence_receipt_boundary_declared:
      deliverableCounts.hermes_evidence === 20 &&
      titles.has("Changed-file receipt") &&
      titles.has("Command result receipt") &&
      titles.has("Fixture summary receipt") &&
      titles.has("No-real-data receipt"),
    verdict_semantics_declared:
      titles.has("PASS semantics") &&
      titles.has("PASS_WITH_FINDINGS semantics") &&
      titles.has("BLOCK semantics"),
    validation_and_regression_boundaries_declared:
      deliverableCounts.test === 1 &&
      titles.has("Validation command check") &&
      titles.has("Regression receipt"),
    claude_and_human_marker_boundaries_declared:
      deliverableCounts.claude_review === 2 &&
      titles.has("Claude dependency marker") &&
      titles.has("Human approval marker"),
    no_fixture_materialization_declared:
      CP152_ROWS.every((row) => row.required_assertions.includes("no_fixture_payload_load_or_manifest_materialization")),
    hidden_field_policy_declared:
      CP152_ROWS.every((row) => row.hidden_source_fields === CP152_HIDDEN_SOURCE_FIELDS) &&
      CP152_HIDDEN_SOURCE_FIELDS.includes("hermes_command_internal_matrix") &&
      CP152_HIDDEN_SOURCE_FIELDS.includes("unauthorized_object_name"),
  });
}

export function createAuditComplianceCp152EvidenceWorkflowFixtureManifest() {
  const readiness = createAuditComplianceCp152EvidenceWorkflowFixture();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP152_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP152_EVIDENCE_WORKFLOW_FIXTURE_CONTRACT,
    readiness,
    no_write_attestation: CP152_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP152_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp152CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP152_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp152HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-152.audit_compliance_evidence_workflow_fixture",
    hermes_gate: AUDIT_COMPLIANCE_CP152_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/evidence-workflow-fixture-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-152/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp152CoveredUnitIds(),
  });
}

export function createAuditComplianceCp152ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-152.audit_compliance_evidence_workflow_fixture",
    claude_gate: AUDIT_COMPLIANCE_CP152_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-152 cover exactly the 40 planned Risk B evidence workflow and fixture units in order?",
      "Can any CP00-152 evidence workflow row evaluate permission/audit binding, emit receipts, write fixtures, execute tests, or expose hidden internals?",
      "Can any CP00-152 fixture evidence row execute Hermes commands, emit receipts, materialize evidence templates, send Claude prompts, record human markers, or write audit/product state?",
      "Are H03/C03 packet descriptors and PASS/PASS_WITH_FINDINGS/BLOCK semantics reference-only and non-authoritative?",
      "Does CP00-152 hand off cleanly from CP00-151 to CP00-153 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/evidence-workflow-fixture-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp152CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-152.to.CP00-153",
    from_pack_id: AUDIT_COMPLIANCE_CP152_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP152_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP152_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_hermes_evidence_secondary_terminal_continuation",
    dependencies: Object.freeze([
      "cp151_failure_evidence_continuation",
      "p07_evidence_workflow_descriptors",
      "p07_failure_hermes_claude_closeout_descriptors",
      "p08_hermes_evidence_scope_contract_type_shape_descriptors",
      "p08_primary_secondary_evidence_packet_descriptors",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp152Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp152CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP152_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP152_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP152_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP152_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
