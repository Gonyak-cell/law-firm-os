export const AUDIT_COMPLIANCE_CP150_PACK_BINDING = Object.freeze({
  pack_id: "CP00-150",
  planned_pack_id: "CP00-150",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP03.P07.M05.S21",
  last_unit_id: "RP03.P07.M06.S08",
  range: "RP03.P07.M05.S21-RP03.P07.M06.S08",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-149",
  next_pack_id: "CP00-151",
  next_subphase_id: "RP03.P07.M06.S09",
  production_ready_flag: "audit_compliance_failure_fixture_sensitive_boundary_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP150_FAILURE_FIXTURE_SENSITIVE_BOUNDARY_CONTRACT = Object.freeze({
  id: "audit_compliance_cp150_failure_fixture_sensitive_boundary_contract",
  pack_id: AUDIT_COMPLIANCE_CP150_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance failure fixture sensitive boundary pack",
  production_ready_flag: AUDIT_COMPLIANCE_CP150_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP150_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP150_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP150_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP150_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP150_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP150_NO_WRITE_ATTESTATION = Object.freeze({
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
  evaluates_permission_audit_binding: false,
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

const CP150_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "fixture_manifest_internal_body",
  "failure_fixture_internal_payload",
  "blocked_claim_internal_receipt",
  "audit_failure_hint_internal_payload",
  "hermes_failure_internal_digest",
  "claude_edge_case_internal_prompt",
  "human_escalation_internal_reason",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]);

const CP150_MICRO_SLICES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P07.M05",
    phase_id: "RP03.P07",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    evidence_mode: "permission_audit_sensitive_terminal_boundary",
    unit_start: 21,
    entries: Object.freeze([
      ["Claude edge-case prompt", "claude_review", "permission_audit_claude_prompt_sensitive_reference"],
      ["Human escalation note", "implementation", "permission_audit_human_escalation_sensitive_reference"],
    ]),
  }),
  Object.freeze({
    micro_phase_id: "RP03.P07.M06",
    phase_id: "RP03.P07",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    evidence_mode: "synthetic_fixture_failure_opening_boundary",
    unit_start: 1,
    entries: Object.freeze([
      ["Failure taxonomy", "failure_recovery", "synthetic_fixture_failure_taxonomy_reference"],
      ["Missing tenant failure", "failure_recovery", "synthetic_fixture_missing_tenant_reference"],
      ["Missing actor failure", "failure_recovery", "synthetic_fixture_missing_actor_reference"],
      ["Missing Matter failure", "failure_recovery", "synthetic_fixture_missing_matter_reference"],
      ["Missing resource failure", "failure_recovery", "synthetic_fixture_missing_resource_reference"],
      ["Unknown action failure", "failure_recovery", "synthetic_fixture_unknown_action_reference"],
      ["Cross-tenant failure", "failure_recovery", "synthetic_fixture_cross_tenant_reference"],
      ["Permission denied failure", "security_audit", "synthetic_fixture_permission_denied_reference"],
    ]),
  }),
]);

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP150_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_a_failure_fixture_sensitive_boundary: true,
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
    evaluates_permission_audit_binding: false,
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
    no_write_attestation: CP150_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  const rows = [];
  for (const slice of CP150_MICRO_SLICES) {
    slice.entries.forEach(([title, deliverableType, domain], index) => {
      const sourceUnitId = `${slice.micro_phase_id}.S${String(slice.unit_start + index).padStart(2, "0")}`;
      const behaviorKind = slugFor(title);
      rows.push(Object.freeze({
        catalog_id: `${sourceUnitId}.${behaviorKind}`,
        pack_id: AUDIT_COMPLIANCE_CP150_PACK_BINDING.pack_id,
        program_id: "RP03",
        phase_id: slice.phase_id,
        micro_phase_id: slice.micro_phase_id,
        micro_id: slice.micro_id,
        micro_title: slice.micro_title,
        phase_role: slice.evidence_mode,
        area: `${domain}.${slugFor(slice.micro_title)}`,
        domain,
        evidence_mode: slice.evidence_mode,
        title,
        coverage_kind: behaviorKind,
        deliverable_type: deliverableType,
        case_id: `${sourceUnitId}.${behaviorKind}`,
        behavior_kind: behaviorKind,
        source_unit_ids: Object.freeze([sourceUnitId]),
        required_assertions: Object.freeze([
          "synthetic_only",
          "risk_a_failure_fixture_sensitive_boundary",
          "failure_fixture_reference_only",
          "no_audit_event_write",
          "no_product_state_write",
          "no_permission_or_audit_binding_evaluation",
          "no_failure_taxonomy_evaluation",
          "no_failure_recovery_execution",
          "no_fixture_payload_load_or_manifest_materialization",
          "no_claude_prompt_materialization_or_send",
          "no_human_escalation_record_or_execute",
          "no_api_or_network_execution",
          "no_ui_render_dom_or_interaction",
          "no_claude_or_hermes_execution",
          "no_hidden_field_exposure",
          "cp149_handoff_inherited",
          "cp151_handoff_declared",
        ]),
        expected_status: `${behaviorKind}_sensitive_fixture_boundary_bound`,
        hidden_source_fields: CP150_HIDDEN_SOURCE_FIELDS,
      }));
    });
  }
  return Object.freeze(rows);
}

const CP150_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp150CoveredUnitIds() {
  return Object.freeze(CP150_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp150FailureFixtureSensitiveBoundaryCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP150_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp150FailureFixtureSensitiveBoundaryCase(caseId) {
  const row = CP150_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-150 audit compliance failure fixture sensitive boundary case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "permission_audit_terminal_boundary",
      "synthetic_fixture_set_boundary",
      "failure_taxonomy",
      "missing_context_failures",
      "cross_tenant_failure",
      "permission_denied_failure",
      "claude_edge_case_prompt",
      "human_escalation_note",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp150FailureFixtureSensitiveBoundary() {
  const cases = CP150_ROWS.map((row) => runAuditComplianceCp150FailureFixtureSensitiveBoundaryCase(row.case_id));
  const coveredUnitIds = createAuditComplianceCp150CoveredUnitIds();
  const deliverableCounts = countBy(CP150_ROWS, "deliverable_type");
  const evidenceModeCounts = countBy(CP150_ROWS, "evidence_mode");
  const titles = new Set(CP150_ROWS.map((row) => row.title));
  const noFixtureMaterialization =
    CP150_NO_WRITE_ATTESTATION.loads_fixture_payload === false &&
    CP150_NO_WRITE_ATTESTATION.materializes_fixture_manifest === false &&
    CP150_NO_WRITE_ATTESTATION.materializes_failure_case_payload === false;
  const noPromptOrEscalationExecution =
    CP150_NO_WRITE_ATTESTATION.materializes_claude_edge_case_prompt === false &&
    CP150_NO_WRITE_ATTESTATION.sends_claude_prompt === false &&
    CP150_NO_WRITE_ATTESTATION.records_human_escalation_note === false &&
    CP150_NO_WRITE_ATTESTATION.executes_human_escalation === false;
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP150_FAILURE_FIXTURE_SENSITIVE_BOUNDARY_CONTRACT.id,
    covered_unit_count: coveredUnitIds.length,
    row_count: CP150_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: deliverableCounts,
    domain_counts: countBy(CP150_ROWS, "domain"),
    evidence_mode_counts: evidenceModeCounts,
    first_unit_id: coveredUnitIds[0],
    last_unit_id: coveredUnitIds.at(-1),
    cp149_handoff_inherited:
      AUDIT_COMPLIANCE_CP150_PACK_BINDING.upstream_pack_id === "CP00-149" &&
      coveredUnitIds[0] === AUDIT_COMPLIANCE_CP150_PACK_BINDING.first_unit_id,
    cp151_handoff_declared:
      AUDIT_COMPLIANCE_CP150_PACK_BINDING.next_pack_id === "CP00-151" &&
      AUDIT_COMPLIANCE_CP150_PACK_BINDING.next_subphase_id === "RP03.P07.M06.S09",
    h03_gate_bound: AUDIT_COMPLIANCE_CP150_PACK_BINDING.hermes_gate === "H03",
    c03_gate_bound: AUDIT_COMPLIANCE_CP150_PACK_BINDING.claude_gate === "C03",
    permission_audit_sensitive_terminal_declared:
      evidenceModeCounts.permission_audit_sensitive_terminal_boundary === 2 &&
      deliverableCounts.claude_review === 1 &&
      deliverableCounts.implementation === 1,
    synthetic_fixture_failure_opening_declared:
      evidenceModeCounts.synthetic_fixture_failure_opening_boundary === 8 &&
      deliverableCounts.failure_recovery === 7 &&
      deliverableCounts.security_audit === 1,
    sensitive_failure_taxonomy_boundary_declared: titles.has("Failure taxonomy"),
    missing_context_failure_boundaries_declared:
      ["Missing tenant failure", "Missing actor failure", "Missing Matter failure", "Missing resource failure", "Unknown action failure"]
        .every((title) => titles.has(title)),
    cross_tenant_permission_denied_boundaries_declared:
      titles.has("Cross-tenant failure") && titles.has("Permission denied failure"),
    fixture_payload_non_materialization_declared: noFixtureMaterialization,
    claude_edge_case_prompt_boundary_declared:
      titles.has("Claude edge-case prompt") && noPromptOrEscalationExecution,
    human_escalation_note_boundary_declared:
      titles.has("Human escalation note") && noPromptOrEscalationExecution,
    hidden_field_policy_declared:
      CP150_ROWS.every((row) => row.hidden_source_fields === CP150_HIDDEN_SOURCE_FIELDS) &&
      CP150_HIDDEN_SOURCE_FIELDS.includes("synthetic_fixture_internal_payload") &&
      CP150_HIDDEN_SOURCE_FIELDS.includes("unauthorized_object_name"),
  });
}

export function createAuditComplianceCp150FailureFixtureSensitiveBoundaryManifest() {
  const readiness = createAuditComplianceCp150FailureFixtureSensitiveBoundary();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP150_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP150_FAILURE_FIXTURE_SENSITIVE_BOUNDARY_CONTRACT,
    readiness,
    no_write_attestation: CP150_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP150_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp150CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP150_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp150HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-150.audit_compliance_failure_fixture_sensitive_boundary",
    hermes_gate: AUDIT_COMPLIANCE_CP150_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/failure-fixture-sensitive-boundary-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-150/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp150CoveredUnitIds(),
  });
}

export function createAuditComplianceCp150ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-150.audit_compliance_failure_fixture_sensitive_boundary",
    claude_gate: AUDIT_COMPLIANCE_CP150_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-150 cover exactly the 10 planned Risk A units in order?",
      "Can any CP00-150 row materialize Claude prompts, record human escalation, or load fixture payloads?",
      "Can any CP00-150 row evaluate permission/audit binding, failure taxonomy, or execute failure recovery?",
      "Can any CP00-150 row write audit/product state, emit receipts/evidence, call APIs, render UI, or expose hidden internals?",
      "Does CP00-150 hand off cleanly from CP00-149 to CP00-151 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/failure-fixture-sensitive-boundary-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp150CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-150.to.CP00-151",
    from_pack_id: AUDIT_COMPLIANCE_CP150_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP150_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP150_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_synthetic_fixture_failure_continuation",
    dependencies: Object.freeze([
      "cp149_failure_workflow_continuation",
      "permission_audit_terminal_sensitive_boundary",
      "synthetic_fixture_failure_opening_boundary",
      "missing_context_failure_descriptors",
      "cross_tenant_permission_denied_descriptors",
      "fixture_payload_non_materialization_policy",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp150Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp150CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP150_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP150_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP150_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP150_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
