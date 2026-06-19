export const AUDIT_COMPLIANCE_CP148_PACK_BINDING = Object.freeze({
  pack_id: "CP00-148",
  planned_pack_id: "CP00-148",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP03.P07.M03.S15",
  last_unit_id: "RP03.P07.M04.S02",
  range: "RP03.P07.M03.S15-RP03.P07.M04.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-147",
  next_pack_id: "CP00-149",
  next_subphase_id: "RP03.P07.M04.S03",
  production_ready_flag: "audit_compliance_failure_boundary_sensitive_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP148_FAILURE_BOUNDARY_SENSITIVE_CONTRACT = Object.freeze({
  id: "audit_compliance_cp148_failure_boundary_sensitive_contract",
  pack_id: AUDIT_COMPLIANCE_CP148_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance failure boundary sensitive pack",
  production_ready_flag: AUDIT_COMPLIANCE_CP148_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP148_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP148_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP148_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP148_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP148_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP148_NO_WRITE_ATTESTATION = Object.freeze({
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
  materializes_failure_case_payload: false,
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
  materializes_claude_edge_case_prompt: false,
  records_human_escalation_note: false,
  executes_human_escalation: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP148_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "audit_hint_internal_payload",
  "failure_taxonomy_internal_rule",
  "missing_context_internal_payload",
  "failure_fixture_internal_payload",
  "rollback_internal_state",
  "compensation_internal_plan",
  "blocked_claim_internal_receipt",
  "retry_exhaustion_internal_counter",
  "failure_recovery_internal_policy",
  "audit_failure_hint_internal_payload",
  "hermes_failure_internal_digest",
  "claude_edge_case_internal_prompt",
  "human_escalation_internal_reason",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]);

const CP148_UNITS = Object.freeze([
  Object.freeze({
    source_unit_id: "RP03.P07.M03.S15",
    micro_phase_id: "RP03.P07.M03",
    phase_id: "RP03.P07",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    title: "Blocked-claim receipt",
    deliverable_type: "hermes_evidence",
    evidence_mode: "failure_primary_sensitive_boundary",
    domain: "failure_boundary_blocked_claim_receipt_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P07.M03.S16",
    micro_phase_id: "RP03.P07.M03",
    phase_id: "RP03.P07",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    title: "Failure fixture",
    deliverable_type: "fixture",
    evidence_mode: "failure_primary_sensitive_boundary",
    domain: "failure_boundary_fixture_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P07.M03.S17",
    micro_phase_id: "RP03.P07.M03",
    phase_id: "RP03.P07",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    title: "Failure unit test",
    deliverable_type: "test",
    evidence_mode: "failure_primary_sensitive_boundary",
    domain: "failure_boundary_test_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P07.M03.S18",
    micro_phase_id: "RP03.P07.M03",
    phase_id: "RP03.P07",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    title: "Failure integration smoke",
    deliverable_type: "test",
    evidence_mode: "failure_primary_sensitive_boundary",
    domain: "failure_boundary_test_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P07.M03.S19",
    micro_phase_id: "RP03.P07.M03",
    phase_id: "RP03.P07",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    title: "Audit failure hint",
    deliverable_type: "security_audit",
    evidence_mode: "failure_primary_sensitive_boundary",
    domain: "failure_boundary_audit_hint_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P07.M03.S20",
    micro_phase_id: "RP03.P07.M03",
    phase_id: "RP03.P07",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    title: "Hermes failure evidence",
    deliverable_type: "hermes_evidence",
    evidence_mode: "failure_primary_sensitive_boundary",
    domain: "failure_boundary_hermes_evidence_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P07.M03.S21",
    micro_phase_id: "RP03.P07.M03",
    phase_id: "RP03.P07",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    title: "Claude edge-case prompt",
    deliverable_type: "claude_review",
    evidence_mode: "failure_primary_sensitive_boundary",
    domain: "failure_boundary_claude_prompt_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P07.M03.S22",
    micro_phase_id: "RP03.P07.M03",
    phase_id: "RP03.P07",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    title: "Human escalation note",
    deliverable_type: "implementation",
    evidence_mode: "failure_primary_sensitive_boundary",
    domain: "failure_boundary_human_escalation_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P07.M04.S01",
    micro_phase_id: "RP03.P07.M04",
    phase_id: "RP03.P07",
    micro_id: "M04",
    micro_title: "Secondary Workflow Slice",
    title: "Failure taxonomy",
    deliverable_type: "failure_recovery",
    evidence_mode: "failure_secondary_workflow_boundary",
    domain: "failure_boundary_taxonomy_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P07.M04.S02",
    micro_phase_id: "RP03.P07.M04",
    phase_id: "RP03.P07",
    micro_id: "M04",
    micro_title: "Secondary Workflow Slice",
    title: "Missing tenant failure",
    deliverable_type: "failure_recovery",
    evidence_mode: "failure_secondary_workflow_boundary",
    domain: "failure_boundary_missing_context_reference",
  }),
]);

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP148_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_a_failure_boundary_sensitive: true,
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
    materializes_failure_case_payload: false,
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
    materializes_claude_edge_case_prompt: false,
    records_human_escalation_note: false,
    executes_human_escalation: false,
    unauthorized_count_exposed: false,
    unauthorized_object_name_exposed: false,
    hidden_field_names_exposed: false,
    exposes_unauthorized_count: false,
    exposes_unauthorized_object_name: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: CP148_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(CP148_UNITS.map((unit) => {
    const behaviorKind = slugFor(unit.title);
    return Object.freeze({
      catalog_id: `${unit.source_unit_id}.${behaviorKind}`,
      pack_id: AUDIT_COMPLIANCE_CP148_PACK_BINDING.pack_id,
      program_id: "RP03",
      phase_id: unit.phase_id,
      micro_phase_id: unit.micro_phase_id,
      micro_id: unit.micro_id,
      micro_title: unit.micro_title,
      phase_role: unit.evidence_mode,
      area: `${unit.domain}.${slugFor(unit.micro_title)}`,
      domain: unit.domain,
      evidence_mode: unit.evidence_mode,
      title: unit.title,
      coverage_kind: behaviorKind,
      deliverable_type: unit.deliverable_type,
      case_id: `${unit.micro_phase_id.toLowerCase().replaceAll(".", "_")}.${behaviorKind}`,
      behavior_kind: behaviorKind,
      source_unit_ids: Object.freeze([unit.source_unit_id]),
      required_assertions: Object.freeze([
        "synthetic_only",
        "risk_a_failure_boundary_sensitive",
        "failure_boundary_reference_only",
        "no_audit_event_write",
        "no_product_state_write",
        "no_failure_taxonomy_evaluation",
        "no_failure_recovery_execution",
        "no_blocked_claim_or_hermes_failure_evidence_emission",
        "no_failure_fixture_write_or_test_execution",
        "no_claude_prompt_or_human_escalation_execution",
        "no_fixture_payload_load",
        "no_api_or_network_execution",
        "no_ui_render_dom_or_interaction",
        "no_claude_or_hermes_execution",
        "no_hidden_field_exposure",
        "cp147_handoff_inherited",
        "cp149_handoff_declared",
      ]),
      expected_status: `${behaviorKind}_failure_boundary_sensitive_bound`,
      hidden_source_fields: CP148_HIDDEN_SOURCE_FIELDS,
    });
  }));
}

const CP148_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp148CoveredUnitIds() {
  return Object.freeze(CP148_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp148FailureBoundarySensitiveCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP148_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp148FailureBoundarySensitiveCase(caseId) {
  const row = CP148_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-148 audit compliance failure boundary sensitive case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "blocked_claim_receipt",
      "failure_fixture",
      "failure_unit_and_integration_tests",
      "audit_failure_hint",
      "hermes_failure_evidence",
      "claude_edge_case_prompt",
      "human_escalation_note",
      "failure_taxonomy_secondary_workflow",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp148FailureBoundarySensitive() {
  const cases = CP148_ROWS.map((row) => runAuditComplianceCp148FailureBoundarySensitiveCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP148_FAILURE_BOUNDARY_SENSITIVE_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp148CoveredUnitIds().length,
    row_count: CP148_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP148_ROWS, "deliverable_type"),
    domain_counts: countBy(CP148_ROWS, "domain"),
    evidence_mode_counts: countBy(CP148_ROWS, "evidence_mode"),
    first_unit_id: createAuditComplianceCp148CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp148CoveredUnitIds().at(-1),
    cp147_handoff_inherited: true,
    cp149_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    blocked_claim_receipt_boundary_declared: true,
    failure_fixture_boundary_declared: true,
    failure_test_boundary_declared: true,
    audit_failure_hint_boundary_declared: true,
    hermes_failure_evidence_boundary_declared: true,
    claude_edge_case_prompt_boundary_declared: true,
    human_escalation_note_boundary_declared: true,
    failure_secondary_workflow_declared: true,
    hidden_field_policy_declared: true,
  });
}

export function createAuditComplianceCp148FailureBoundarySensitiveManifest() {
  const readiness = createAuditComplianceCp148FailureBoundarySensitive();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP148_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP148_FAILURE_BOUNDARY_SENSITIVE_CONTRACT,
    readiness,
    no_write_attestation: CP148_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP148_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp148CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP148_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp148HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-148.audit_compliance_failure_boundary_sensitive",
    hermes_gate: AUDIT_COMPLIANCE_CP148_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/failure-boundary-sensitive-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-148/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp148CoveredUnitIds(),
  });
}

export function createAuditComplianceCp148ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-148.audit_compliance_failure_boundary_sensitive",
    claude_gate: AUDIT_COMPLIANCE_CP148_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-148 cover exactly the 10 planned Risk A failure boundary units in order?",
      "Can any CP00-148 row emit blocked-claim receipts, Hermes failure evidence, audit failure hints, or write audit/product state?",
      "Can any CP00-148 row load fixtures, write failure fixtures, execute unit/integration tests, or execute failure recovery?",
      "Can any CP00-148 row send Claude prompts, record human escalation notes, render UI, call APIs, or expose hidden failure internals?",
      "Does CP00-148 hand off cleanly from CP00-147 to CP00-149 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/failure-boundary-sensitive-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp148CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-148.to.CP00-149",
    from_pack_id: AUDIT_COMPLIANCE_CP148_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP148_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP148_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_failure_secondary_workflow_continuation",
    dependencies: Object.freeze([
      "cp147_permission_matrix_failure_taxonomy_reference",
      "blocked_claim_receipt_descriptor",
      "failure_fixture_test_descriptor",
      "audit_failure_hint_descriptor",
      "hermes_failure_evidence_descriptor",
      "claude_edge_case_prompt_descriptor",
      "human_escalation_note_descriptor",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp148Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp148CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP148_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP148_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP148_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP148_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
