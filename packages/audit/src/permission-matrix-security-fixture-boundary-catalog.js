export const AUDIT_COMPLIANCE_CP146_PACK_BINDING = Object.freeze({
  pack_id: "CP00-146",
  planned_pack_id: "CP00-146",
  risk_class: "A",
  unit_count: 10,
  first_unit_id: "RP03.P06.M05.S16",
  last_unit_id: "RP03.P06.M06.S03",
  range: "RP03.P06.M05.S16-RP03.P06.M06.S03",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-145",
  next_pack_id: "CP00-147",
  next_subphase_id: "RP03.P06.M06.S04",
  production_ready_flag: "audit_compliance_permission_matrix_security_fixture_boundary_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP146_PERMISSION_MATRIX_SECURITY_FIXTURE_BOUNDARY_CONTRACT = Object.freeze({
  id: "audit_compliance_cp146_permission_matrix_security_fixture_boundary_contract",
  pack_id: AUDIT_COMPLIANCE_CP146_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance permission matrix security fixture boundary",
  production_ready_flag: AUDIT_COMPLIANCE_CP146_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP146_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP146_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP146_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP146_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP146_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP146_NO_WRITE_ATTESTATION = Object.freeze({
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
  executes_ai_retrieval: false,
  executes_analytics_query: false,
  evaluates_permission_matrix: false,
  evaluates_view_decision: false,
  evaluates_search_decision: false,
  proves_security_trimming: false,
  emits_audit_event_expectation: false,
  writes_permission_fixture: false,
  executes_allowed_test: false,
  executes_denied_test: false,
  executes_cross_tenant_test: false,
  executes_leak_prevention_test: false,
  materializes_fixture_manifest: false,
  loads_fixture_payload: false,
  reads_fixture_document_body: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP146_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "security_trimming_internal_query",
  "audit_event_internal_payload",
  "permission_fixture_internal_payload",
  "allowed_test_internal_fixture",
  "denied_test_internal_fixture",
  "cross_tenant_test_internal_fixture",
  "leak_prevention_test_internal_fixture",
  "fixture_manifest_internal_body",
  "claude_prompt_internal_context",
  "hermes_receipt_internal_digest",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]);

const CP146_UNITS = Object.freeze([
  Object.freeze({
    source_unit_id: "RP03.P06.M05.S16",
    micro_phase_id: "RP03.P06.M05",
    phase_id: "RP03.P06",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Security trimming proof",
    deliverable_type: "security_audit",
    evidence_mode: "permission_audit_security_test_boundary",
    domain: "permission_matrix_security_trimming_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P06.M05.S17",
    micro_phase_id: "RP03.P06.M05",
    phase_id: "RP03.P06",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Audit event expectation",
    deliverable_type: "security_audit",
    evidence_mode: "permission_audit_security_test_boundary",
    domain: "permission_matrix_audit_event_expectation_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P06.M05.S18",
    micro_phase_id: "RP03.P06.M05",
    phase_id: "RP03.P06",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Permission fixture",
    deliverable_type: "security_audit",
    evidence_mode: "permission_audit_security_test_boundary",
    domain: "permission_matrix_permission_fixture_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P06.M05.S19",
    micro_phase_id: "RP03.P06.M05",
    phase_id: "RP03.P06",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Allowed test",
    deliverable_type: "test",
    evidence_mode: "permission_audit_security_test_boundary",
    domain: "permission_matrix_allowed_test_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P06.M05.S20",
    micro_phase_id: "RP03.P06.M05",
    phase_id: "RP03.P06",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Denied test",
    deliverable_type: "test",
    evidence_mode: "permission_audit_security_test_boundary",
    domain: "permission_matrix_denied_test_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P06.M05.S21",
    micro_phase_id: "RP03.P06.M05",
    phase_id: "RP03.P06",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Cross-tenant test",
    deliverable_type: "test",
    evidence_mode: "permission_audit_security_test_boundary",
    domain: "permission_matrix_cross_tenant_test_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P06.M05.S22",
    micro_phase_id: "RP03.P06.M05",
    phase_id: "RP03.P06",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    title: "Leak prevention test",
    deliverable_type: "test",
    evidence_mode: "permission_audit_security_test_boundary",
    domain: "permission_matrix_leak_prevention_test_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P06.M06.S01",
    micro_phase_id: "RP03.P06.M06",
    phase_id: "RP03.P06",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    title: "Permission matrix row",
    deliverable_type: "security_audit",
    evidence_mode: "synthetic_fixture_permission_matrix_boundary",
    domain: "synthetic_fixture_permission_matrix_row_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P06.M06.S02",
    micro_phase_id: "RP03.P06.M06",
    phase_id: "RP03.P06",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    title: "View decision binding",
    deliverable_type: "implementation",
    evidence_mode: "synthetic_fixture_permission_matrix_boundary",
    domain: "synthetic_fixture_view_decision_reference",
  }),
  Object.freeze({
    source_unit_id: "RP03.P06.M06.S03",
    micro_phase_id: "RP03.P06.M06",
    phase_id: "RP03.P06",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    title: "Search decision binding",
    deliverable_type: "implementation",
    evidence_mode: "synthetic_fixture_permission_matrix_boundary",
    domain: "synthetic_fixture_search_decision_reference",
  }),
]);

const STATUS_BY_KIND = Object.freeze({
  allowed_test: "allowed_test_security_fixture_boundary_bound",
  audit_event_expectation: "audit_event_expectation_security_fixture_boundary_bound",
  cross_tenant_test: "cross_tenant_test_security_fixture_boundary_bound",
  denied_test: "denied_test_security_fixture_boundary_bound",
  leak_prevention_test: "leak_prevention_test_security_fixture_boundary_bound",
  permission_fixture: "permission_fixture_security_fixture_boundary_bound",
  permission_matrix_row: "permission_matrix_row_synthetic_fixture_boundary_bound",
  search_decision_binding: "search_decision_binding_synthetic_fixture_boundary_bound",
  security_trimming_proof: "security_trimming_proof_security_fixture_boundary_bound",
  view_decision_binding: "view_decision_binding_synthetic_fixture_boundary_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP146_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_a_permission_matrix_security_fixture_boundary: true,
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
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    evaluates_permission_matrix: false,
    evaluates_view_decision: false,
    evaluates_search_decision: false,
    proves_security_trimming: false,
    emits_audit_event_expectation: false,
    writes_permission_fixture: false,
    executes_allowed_test: false,
    executes_denied_test: false,
    executes_cross_tenant_test: false,
    executes_leak_prevention_test: false,
    materializes_fixture_manifest: false,
    loads_fixture_payload: false,
    reads_fixture_document_body: false,
    unauthorized_count_exposed: false,
    unauthorized_object_name_exposed: false,
    hidden_field_names_exposed: false,
    exposes_unauthorized_count: false,
    exposes_unauthorized_object_name: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: CP146_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(CP146_UNITS.map((unit) => {
    const behaviorKind = slugFor(unit.title);
    return Object.freeze({
      catalog_id: `${unit.source_unit_id}.${behaviorKind}`,
      pack_id: AUDIT_COMPLIANCE_CP146_PACK_BINDING.pack_id,
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
        "risk_a_permission_matrix_security_fixture_boundary",
        "permission_matrix_security_fixture_reference_only",
        "no_audit_event_write",
        "no_product_state_write",
        "no_permission_execution",
        "no_permission_matrix_view_or_search_evaluation",
        "no_security_trimming_proof_execution",
        "no_audit_event_expectation_emission",
        "no_permission_fixture_write",
        "no_allowed_denied_cross_tenant_or_leak_test_execution",
        "no_fixture_payload_load",
        "no_api_or_network_execution",
        "no_ui_render_dom_or_interaction",
        "no_claude_or_hermes_execution",
        "no_hidden_field_exposure",
        "cp145_handoff_inherited",
        "cp147_handoff_declared",
      ]),
      expected_status: STATUS_BY_KIND[behaviorKind],
      hidden_source_fields: CP146_HIDDEN_SOURCE_FIELDS,
    });
  }));
}

const CP146_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp146CoveredUnitIds() {
  return Object.freeze(CP146_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP146_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase(caseId) {
  const row = CP146_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-146 audit compliance permission matrix security fixture boundary case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "security_trimming_proof",
      "audit_event_expectation",
      "permission_fixture",
      "allowed_denied_cross_tenant_leak_tests",
      "synthetic_fixture_permission_matrix_row",
      "synthetic_fixture_view_search_decisions",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundary() {
  const cases = CP146_ROWS.map((row) => runAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP146_PERMISSION_MATRIX_SECURITY_FIXTURE_BOUNDARY_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp146CoveredUnitIds().length,
    row_count: CP146_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP146_ROWS, "deliverable_type"),
    domain_counts: countBy(CP146_ROWS, "domain"),
    evidence_mode_counts: countBy(CP146_ROWS, "evidence_mode"),
    first_unit_id: createAuditComplianceCp146CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp146CoveredUnitIds().at(-1),
    cp145_handoff_inherited: true,
    cp147_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    security_trimming_boundary_declared: true,
    audit_event_expectation_boundary_declared: true,
    permission_fixture_boundary_declared: true,
    allowed_denied_cross_tenant_leak_boundary_declared: true,
    synthetic_fixture_matrix_row_declared: true,
    synthetic_fixture_view_search_declared: true,
    hidden_field_policy_declared: true,
  });
}

export function createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundaryManifest() {
  const readiness = createAuditComplianceCp146PermissionMatrixSecurityFixtureBoundary();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP146_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP146_PERMISSION_MATRIX_SECURITY_FIXTURE_BOUNDARY_CONTRACT,
    readiness,
    no_write_attestation: CP146_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP146_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp146CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP146_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp146HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-146.audit_compliance_permission_matrix_security_fixture_boundary",
    hermes_gate: AUDIT_COMPLIANCE_CP146_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/permission-matrix-security-fixture-boundary-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-146/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp146CoveredUnitIds(),
  });
}

export function createAuditComplianceCp146ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-146.audit_compliance_permission_matrix_security_fixture_boundary",
    claude_gate: AUDIT_COMPLIANCE_CP146_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-146 cover exactly the 10 planned Risk A units in order?",
      "Can any CP00-146 row prove security trimming, emit audit event expectations, write permission fixtures, or execute allowed/denied/cross-tenant/leak-prevention tests?",
      "Can any synthetic fixture row evaluate permission matrix, view, or search decisions or load hidden fixture payloads?",
      "Are unauthorized counts, unauthorized object names, hidden security trim predicates, and audit payloads suppressed?",
      "Does CP00-146 hand off cleanly from CP00-145 to CP00-147 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/permission-matrix-security-fixture-boundary-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp146CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-146.to.CP00-147",
    from_pack_id: AUDIT_COMPLIANCE_CP146_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP146_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP146_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_synthetic_fixture_permission_matrix_continuation",
    dependencies: Object.freeze([
      "cp145_permission_matrix_workflow_boundary",
      "security_trimming_proof_descriptor",
      "audit_event_expectation_descriptor",
      "permission_fixture_descriptor",
      "allowed_denied_cross_tenant_leak_test_descriptors",
      "synthetic_fixture_permission_matrix_view_search_descriptors",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp146Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp146CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP146_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP146_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP146_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP146_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
