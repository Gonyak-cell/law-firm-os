export const AUDIT_COMPLIANCE_CP143_PACK_BINDING = Object.freeze({
  pack_id: "CP00-143",
  planned_pack_id: "CP00-143",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP03.P05.M05.S14",
  last_unit_id: "RP03.P05.M06.S01",
  range: "RP03.P05.M05.S14-RP03.P05.M06.S01",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-142",
  next_pack_id: "CP00-144",
  next_subphase_id: "RP03.P05.M06.S02",
  production_ready_flag: "audit_compliance_fixture_terminal_boundary_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP143_FIXTURE_TERMINAL_BOUNDARY_CONTRACT = Object.freeze({
  id: "audit_compliance_cp143_fixture_terminal_boundary_contract",
  pack_id: AUDIT_COMPLIANCE_CP143_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance fixture terminal boundary",
  production_ready_flag: AUDIT_COMPLIANCE_CP143_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP143_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP143_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP143_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP143_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP143_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP143_NO_WRITE_ATTESTATION = Object.freeze({
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
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP143_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "fixture_manifest_internal_body",
  "golden_case_internal_payload",
  "failure_case_internal_payload",
  "replay_command_internal_args",
  "stable_id_internal_seed",
  "base_tenant_fixture_internal_payload",
  "claude_prompt_internal_context",
  "hermes_receipt_internal_digest",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]);

const CP143_UNITS = Object.freeze([
  Object.freeze({
    index: 14,
    source_unit_id: "RP03.P05.M05.S14",
    micro_phase_id: "RP03.P05.M05",
    phase_id: "RP03.P05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Fixture manifest",
    deliverable_type: "fixture",
    evidence_mode: "fixture_permission_audit_terminal_boundary",
    domain: "fixture_manifest_boundary_reference",
  }),
  Object.freeze({
    index: 15,
    source_unit_id: "RP03.P05.M05.S15",
    micro_phase_id: "RP03.P05.M05",
    phase_id: "RP03.P05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Golden test",
    deliverable_type: "test",
    evidence_mode: "fixture_permission_audit_terminal_boundary",
    domain: "fixture_golden_test_boundary_reference",
  }),
  Object.freeze({
    index: 16,
    source_unit_id: "RP03.P05.M05.S16",
    micro_phase_id: "RP03.P05.M05",
    phase_id: "RP03.P05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Failure test",
    deliverable_type: "test",
    evidence_mode: "fixture_permission_audit_terminal_boundary",
    domain: "fixture_failure_test_boundary_reference",
  }),
  Object.freeze({
    index: 17,
    source_unit_id: "RP03.P05.M05.S17",
    micro_phase_id: "RP03.P05.M05",
    phase_id: "RP03.P05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Hermes fixture evidence",
    deliverable_type: "hermes_evidence",
    evidence_mode: "fixture_permission_audit_terminal_boundary",
    domain: "fixture_hermes_evidence_boundary_reference",
  }),
  Object.freeze({
    index: 18,
    source_unit_id: "RP03.P05.M05.S18",
    micro_phase_id: "RP03.P05.M05",
    phase_id: "RP03.P05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Claude missing-test prompt",
    deliverable_type: "test",
    evidence_mode: "fixture_permission_audit_terminal_boundary",
    domain: "fixture_claude_prompt_boundary_reference",
  }),
  Object.freeze({
    index: 19,
    source_unit_id: "RP03.P05.M05.S19",
    micro_phase_id: "RP03.P05.M05",
    phase_id: "RP03.P05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Closeout handoff",
    deliverable_type: "implementation",
    evidence_mode: "fixture_permission_audit_terminal_boundary",
    domain: "fixture_closeout_handoff_boundary_reference",
  }),
  Object.freeze({
    index: 20,
    source_unit_id: "RP03.P05.M05.S20",
    micro_phase_id: "RP03.P05.M05",
    phase_id: "RP03.P05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "No-real-data check",
    deliverable_type: "implementation",
    evidence_mode: "fixture_permission_audit_terminal_boundary",
    domain: "fixture_no_real_data_boundary_reference",
  }),
  Object.freeze({
    index: 21,
    source_unit_id: "RP03.P05.M05.S21",
    micro_phase_id: "RP03.P05.M05",
    phase_id: "RP03.P05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Stable ID check",
    deliverable_type: "implementation",
    evidence_mode: "fixture_permission_audit_terminal_boundary",
    domain: "fixture_stable_id_boundary_reference",
  }),
  Object.freeze({
    index: 22,
    source_unit_id: "RP03.P05.M05.S22",
    micro_phase_id: "RP03.P05.M05",
    phase_id: "RP03.P05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Replay command",
    deliverable_type: "implementation",
    evidence_mode: "fixture_permission_audit_terminal_boundary",
    domain: "fixture_replay_command_boundary_reference",
  }),
  Object.freeze({
    index: 1,
    source_unit_id: "RP03.P05.M06.S01",
    micro_phase_id: "RP03.P05.M06",
    phase_id: "RP03.P05",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    title: "Base tenant fixture",
    deliverable_type: "fixture",
    evidence_mode: "synthetic_fixture_base_tenant_boundary",
    domain: "fixture_base_tenant_boundary_reference",
  }),
]);

const STATUS_BY_KIND = Object.freeze({
  base_tenant_fixture: "base_tenant_fixture_boundary_reference_bound",
  claude_missing_test_prompt: "claude_missing_test_prompt_boundary_reference_bound",
  closeout_handoff: "closeout_handoff_boundary_reference_bound",
  failure_test: "failure_test_boundary_reference_bound",
  fixture_manifest: "fixture_manifest_boundary_reference_bound",
  golden_test: "golden_test_boundary_reference_bound",
  hermes_fixture_evidence: "hermes_fixture_evidence_boundary_reference_bound",
  no_real_data_check: "no_real_data_check_boundary_reference_bound",
  replay_command: "replay_command_boundary_reference_bound",
  stable_id_check: "stable_id_check_boundary_reference_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP143_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_a_fixture_terminal_boundary: true,
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
    implements_ldip: false,
    splits_hrx_product: false,
    unauthorized_count_exposed: false,
    unauthorized_object_name_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP143_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(CP143_UNITS.map((unit) => {
    const behaviorKind = slugFor(unit.title);
    return Object.freeze({
      catalog_id: `${unit.source_unit_id}.${behaviorKind}`,
      pack_id: AUDIT_COMPLIANCE_CP143_PACK_BINDING.pack_id,
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
        "risk_a_fixture_terminal_boundary",
        "fixture_terminal_reference_only",
        "no_audit_event_write",
        "no_product_state_write",
        "no_permission_execution",
        "no_fixture_payload_load",
        "no_manifest_materialization",
        "no_golden_or_failure_payload_materialization",
        "no_replay_command_execution",
        "no_stable_id_persistence",
        "no_api_or_network_execution",
        "no_ui_render_dom_or_interaction",
        "no_claude_or_hermes_execution",
        "no_hidden_field_exposure",
        "cp142_handoff_inherited",
        "cp144_handoff_declared",
      ]),
      expected_status: STATUS_BY_KIND[behaviorKind],
      hidden_source_fields: CP143_HIDDEN_SOURCE_FIELDS,
    });
  }));
}

const CP143_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp143CoveredUnitIds() {
  return Object.freeze(CP143_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp143FixtureTerminalBoundaryCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP143_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp143FixtureTerminalBoundaryCase(caseId) {
  const row = CP143_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-143 audit compliance fixture terminal boundary case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
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
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp143FixtureTerminalBoundary() {
  const cases = CP143_ROWS.map((row) => runAuditComplianceCp143FixtureTerminalBoundaryCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP143_FIXTURE_TERMINAL_BOUNDARY_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp143CoveredUnitIds().length,
    row_count: CP143_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP143_ROWS, "deliverable_type"),
    domain_counts: countBy(CP143_ROWS, "domain"),
    evidence_mode_counts: countBy(CP143_ROWS, "evidence_mode"),
    first_unit_id: createAuditComplianceCp143CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp143CoveredUnitIds().at(-1),
    cp142_handoff_inherited: true,
    cp144_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    fixture_terminal_boundary_declared: true,
    fixture_manifest_boundary_declared: true,
    golden_failure_test_boundary_declared: true,
    hermes_claude_boundary_declared: true,
    no_real_data_boundary_declared: true,
    stable_id_replay_boundary_declared: true,
    base_tenant_fixture_boundary_declared: true,
    hidden_field_policy_declared: true,
  });
}

export function createAuditComplianceCp143FixtureTerminalBoundaryManifest() {
  const readiness = createAuditComplianceCp143FixtureTerminalBoundary();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP143_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP143_FIXTURE_TERMINAL_BOUNDARY_CONTRACT,
    readiness,
    no_write_attestation: CP143_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP143_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp143CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP143_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp143HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-143.audit_compliance_fixture_terminal_boundary",
    hermes_gate: AUDIT_COMPLIANCE_CP143_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/fixture-terminal-boundary-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-143/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp143CoveredUnitIds(),
  });
}

export function createAuditComplianceCp143ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-143.audit_compliance_fixture_terminal_boundary",
    claude_gate: AUDIT_COMPLIANCE_CP143_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-143 cover exactly the 10 planned Risk A units in order?",
      "Can any CP00-143 row load fixture payloads, materialize manifests, materialize golden/failure payloads, persist stable IDs, or execute replay commands?",
      "Are Hermes evidence and Claude prompt rows descriptor-only and unable to write runtime state or send prompts?",
      "Does the base tenant fixture row avoid reading internal fixture payloads or real tenant data?",
      "Does CP00-143 hand off cleanly from CP00-142 to CP00-144 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/fixture-terminal-boundary-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp143CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-143.to.CP00-144",
    from_pack_id: AUDIT_COMPLIANCE_CP143_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP143_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP143_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_synthetic_fixture_continuation",
    dependencies: Object.freeze([
      "cp142_ui_fixture_evidence_reference",
      "fixture_manifest_boundary",
      "golden_failure_test_boundary",
      "hermes_claude_descriptor_boundary",
      "no_real_data_stable_id_replay_boundary",
      "base_tenant_fixture_boundary",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp143Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp143CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP143_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP143_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP143_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP143_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
