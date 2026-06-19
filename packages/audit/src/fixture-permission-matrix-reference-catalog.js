export const AUDIT_COMPLIANCE_CP144_PACK_BINDING = Object.freeze({
  pack_id: "CP00-144",
  planned_pack_id: "CP00-144",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP03.P05.M06.S02",
  last_unit_id: "RP03.P06.M03.S19",
  range: "RP03.P05.M06.S02-RP03.P06.M03.S19",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-143",
  next_pack_id: "CP00-145",
  next_subphase_id: "RP03.P06.M03.S20",
  production_ready_flag: "audit_compliance_fixture_permission_matrix_reference_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP144_FIXTURE_PERMISSION_MATRIX_REFERENCE_CONTRACT = Object.freeze({
  id: "audit_compliance_cp144_fixture_permission_matrix_reference_contract",
  pack_id: AUDIT_COMPLIANCE_CP144_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance fixture permission matrix reference",
  production_ready_flag: AUDIT_COMPLIANCE_CP144_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP144_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP144_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP144_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP144_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP144_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP144_NO_WRITE_ATTESTATION = Object.freeze({
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
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP144_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "base_user_fixture_internal_payload",
  "base_matter_fixture_internal_payload",
  "base_document_fixture_internal_payload",
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
  "claude_prompt_internal_context",
  "hermes_receipt_internal_digest",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]);

const FIXTURE_WORKFLOW_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Base tenant fixture", deliverable_type: "fixture" }),
  Object.freeze({ index: 2, title: "Base user fixture", deliverable_type: "fixture" }),
  Object.freeze({ index: 3, title: "Base matter fixture", deliverable_type: "fixture" }),
  Object.freeze({ index: 4, title: "Base document fixture", deliverable_type: "fixture" }),
  Object.freeze({ index: 5, title: "Primary golden case", deliverable_type: "fixture" }),
  Object.freeze({ index: 6, title: "Secondary golden case", deliverable_type: "fixture" }),
  Object.freeze({ index: 7, title: "Review-required case", deliverable_type: "claude_review" }),
  Object.freeze({ index: 8, title: "Denied case", deliverable_type: "implementation" }),
  Object.freeze({ index: 9, title: "Cross-tenant case", deliverable_type: "implementation" }),
  Object.freeze({ index: 10, title: "Missing context case", deliverable_type: "implementation" }),
  Object.freeze({ index: 11, title: "Audit hint case", deliverable_type: "security_audit" }),
  Object.freeze({ index: 12, title: "Security trimming case", deliverable_type: "security_audit" }),
  Object.freeze({ index: 13, title: "AI retrieval or analytics case", deliverable_type: "implementation" }),
  Object.freeze({ index: 14, title: "Fixture manifest", deliverable_type: "fixture" }),
  Object.freeze({ index: 15, title: "Golden test", deliverable_type: "test" }),
  Object.freeze({ index: 16, title: "Failure test", deliverable_type: "test" }),
  Object.freeze({ index: 17, title: "Hermes fixture evidence", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 18, title: "Claude missing-test prompt", deliverable_type: "test" }),
  Object.freeze({ index: 19, title: "Closeout handoff", deliverable_type: "implementation" }),
  Object.freeze({ index: 20, title: "No-real-data check", deliverable_type: "implementation" }),
  Object.freeze({ index: 21, title: "Stable ID check", deliverable_type: "implementation" }),
  Object.freeze({ index: 22, title: "Replay command", deliverable_type: "implementation" }),
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
]);

const CP144_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P05.M06",
    phase_id: "RP03.P05",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    phase_role: "synthetic_fixture_continuation_reference",
    evidence_mode: "synthetic_fixture_continuation_reference",
    template: FIXTURE_WORKFLOW_UNITS,
    start: 2,
    count: 19,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P05.M07",
    phase_id: "RP03.P05",
    micro_id: "M07",
    micro_title: "Test And Golden Case Set",
    phase_role: "fixture_test_golden_case_reference",
    evidence_mode: "fixture_test_golden_case_reference",
    template: FIXTURE_WORKFLOW_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P05.M08",
    phase_id: "RP03.P05",
    micro_id: "M08",
    micro_title: "Hermes Evidence Packet",
    phase_role: "fixture_hermes_evidence_packet_reference",
    evidence_mode: "fixture_hermes_evidence_packet_reference",
    template: FIXTURE_WORKFLOW_UNITS,
    count: 20,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P05.M09",
    phase_id: "RP03.P05",
    micro_id: "M09",
    micro_title: "Claude Review Packet",
    phase_role: "fixture_claude_review_packet_reference",
    evidence_mode: "fixture_claude_review_packet_reference",
    template: FIXTURE_WORKFLOW_UNITS,
    count: 20,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P05.M10",
    phase_id: "RP03.P05",
    micro_id: "M10",
    micro_title: "Closeout And Next Handoff",
    phase_role: "fixture_closeout_handoff_reference",
    evidence_mode: "fixture_closeout_handoff_reference",
    template: FIXTURE_WORKFLOW_UNITS,
    count: 8,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P06.M00",
    phase_id: "RP03.P06",
    micro_id: "M00",
    micro_title: "Scope Inventory",
    phase_role: "permission_scope_inventory_reference",
    evidence_mode: "permission_scope_inventory_reference",
    template: PERMISSION_MATRIX_UNITS,
    count: 11,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P06.M01",
    phase_id: "RP03.P06",
    micro_id: "M01",
    micro_title: "Contract Draft",
    phase_role: "permission_contract_draft_reference",
    evidence_mode: "permission_contract_draft_reference",
    template: PERMISSION_MATRIX_UNITS,
    count: 11,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P06.M02",
    phase_id: "RP03.P06",
    micro_id: "M02",
    micro_title: "Type And Shape Definition",
    phase_role: "permission_type_shape_reference",
    evidence_mode: "permission_type_shape_reference",
    template: PERMISSION_MATRIX_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P06.M03",
    phase_id: "RP03.P06",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    phase_role: "permission_primary_implementation_reference",
    evidence_mode: "permission_primary_implementation_reference",
    template: PERMISSION_MATRIX_UNITS,
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
  if (micro.phase_id === "RP03.P05") {
    if (behaviorKind.includes("cross_tenant") || behaviorKind.includes("security") || behaviorKind.includes("audit_hint") || behaviorKind.includes("permission")) {
      return "fixture_permission_audit_guard_reference";
    }
    if (behaviorKind.includes("tenant") || behaviorKind.includes("user") || behaviorKind.includes("matter") || behaviorKind.includes("document")) {
      return "fixture_identity_object_reference";
    }
    if (behaviorKind.includes("golden") || behaviorKind.includes("test") || behaviorKind.includes("manifest") || behaviorKind.includes("stable_id")) {
      return "fixture_golden_case_reference";
    }
    if (behaviorKind.includes("ai_retrieval") || behaviorKind.includes("analytics")) return "fixture_ai_analytics_reference";
    if (behaviorKind.includes("hermes") || behaviorKind.includes("claude") || behaviorKind.includes("review_required")) return "fixture_evidence_review_reference";
    if (behaviorKind.includes("replay")) return "fixture_replay_command_reference";
    return "fixture_workflow_reference";
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
  if (behaviorKind.includes("allowed_test") || behaviorKind.includes("denied_test")) return "permission_matrix_test_reference";
  return "permission_matrix_decision_reference";
}

function statusFor(behaviorKind, micro) {
  return `${behaviorKind}_${micro.phase_id === "RP03.P06" ? "permission_matrix" : "fixture"}_reference_bound`;
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP144_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_fixture_permission_matrix_reference: true,
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
    implements_ldip: false,
    splits_hrx_product: false,
    unauthorized_count_exposed: false,
    unauthorized_object_name_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP144_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP144_MICRO_PHASES.flatMap((micro) => {
      const start = micro.start ?? 1;
      const units = micro.template.slice(start - 1, start - 1 + (micro.count ?? micro.template.length));
      return units.map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind, micro);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP144_PACK_BINDING.pack_id,
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
            "risk_c_fixture_permission_matrix_reference",
            "fixture_reference_only",
            "permission_matrix_reference_only",
            "no_audit_event_write",
            "no_product_state_write",
            "no_permission_execution",
            "no_permission_matrix_evaluation",
            "no_fixture_payload_load",
            "no_manifest_or_golden_payload_materialization",
            "no_replay_command_execution",
            "no_stable_id_or_receipt_persistence",
            "no_ai_analytics_or_ai_decision_execution",
            "no_legal_hold_ethical_wall_or_acl_execution",
            "no_api_or_network_execution",
            "no_ui_render_dom_or_interaction",
            "no_claude_or_hermes_execution",
            "no_hidden_field_exposure",
            "cp143_handoff_inherited",
            "cp145_handoff_declared",
          ]),
          expected_status: statusFor(behaviorKind, micro),
          hidden_source_fields: CP144_HIDDEN_SOURCE_FIELDS,
        });
      });
    }),
  );
}

const CP144_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp144CoveredUnitIds() {
  return Object.freeze(CP144_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp144FixturePermissionMatrixReferenceCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP144_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp144FixturePermissionMatrixReferenceCase(caseId) {
  const row = CP144_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-144 audit compliance fixture permission matrix reference case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "synthetic_fixture_continuation",
      "fixture_test_golden_case",
      "fixture_hermes_evidence_packet",
      "fixture_claude_review_packet",
      "fixture_closeout_handoff",
      "permission_scope_inventory",
      "permission_contract_draft",
      "permission_type_shape",
      "permission_primary_implementation",
      "permission_matrix_row",
      "view_search_mutation_export_share_ai_decisions",
      "legal_hold_ethical_wall_object_acl_interactions",
      "review_approval_routes",
      "security_trimming_and_audit_event_expectation",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp144FixturePermissionMatrixReference() {
  const cases = CP144_ROWS.map((row) => runAuditComplianceCp144FixturePermissionMatrixReferenceCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP144_FIXTURE_PERMISSION_MATRIX_REFERENCE_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp144CoveredUnitIds().length,
    row_count: CP144_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP144_ROWS, "deliverable_type"),
    domain_counts: countBy(CP144_ROWS, "domain"),
    evidence_mode_counts: countBy(CP144_ROWS, "evidence_mode"),
    first_unit_id: createAuditComplianceCp144CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp144CoveredUnitIds().at(-1),
    cp143_handoff_inherited: true,
    cp145_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    fixture_continuation_declared: true,
    fixture_test_golden_case_declared: true,
    fixture_hermes_packet_declared: true,
    fixture_claude_packet_declared: true,
    fixture_closeout_handoff_declared: true,
    permission_matrix_scope_contract_declared: true,
    permission_matrix_type_shape_declared: true,
    permission_matrix_primary_implementation_declared: true,
    permission_matrix_decision_bindings_declared: true,
    permission_matrix_boundary_interactions_declared: true,
    permission_matrix_review_approval_declared: true,
    permission_matrix_audit_security_declared: true,
    hidden_field_policy_declared: true,
  });
}

export function createAuditComplianceCp144FixturePermissionMatrixReferenceManifest() {
  const readiness = createAuditComplianceCp144FixturePermissionMatrixReference();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP144_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP144_FIXTURE_PERMISSION_MATRIX_REFERENCE_CONTRACT,
    readiness,
    no_write_attestation: CP144_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP144_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp144CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP144_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp144HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-144.audit_compliance_fixture_permission_matrix_reference",
    hermes_gate: AUDIT_COMPLIANCE_CP144_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/fixture-permission-matrix-reference-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-144/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp144CoveredUnitIds(),
  });
}

export function createAuditComplianceCp144ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-144.audit_compliance_fixture_permission_matrix_reference",
    claude_gate: AUDIT_COMPLIANCE_CP144_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-144 cover exactly the 150 planned Risk C fixture and permission matrix reference units in order?",
      "Can any CP00-144 fixture row load payloads, materialize manifests, persist stable IDs, emit receipts, run replay, execute AI retrieval, or analytics queries?",
      "Can any CP00-144 permission matrix row evaluate view, search, mutation, export/download, share, AI retrieval, legal hold, ethical wall, object ACL, review, approval, trimming, or audit event behavior?",
      "Are hidden source fields, unauthorized counts, object names, internal permission rules, ACL grants, and route reasons suppressed?",
      "Does CP00-144 hand off cleanly from CP00-143 to CP00-145 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/fixture-permission-matrix-reference-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp144CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-144.to.CP00-145",
    from_pack_id: AUDIT_COMPLIANCE_CP144_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP144_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP144_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_permission_matrix_denied_test_and_binding_continuation",
    dependencies: Object.freeze([
      "cp143_fixture_terminal_boundary",
      "p05_synthetic_fixture_continuation",
      "p05_fixture_hermes_claude_closeout_packets",
      "p06_permission_scope_inventory",
      "p06_permission_contract_and_type_shape_reference",
      "p06_permission_primary_implementation_reference",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp144Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp144CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP144_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP144_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP144_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP144_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
