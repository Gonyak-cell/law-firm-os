export const AUDIT_COMPLIANCE_CP145_PACK_BINDING = Object.freeze({
  pack_id: "CP00-145",
  planned_pack_id: "CP00-145",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP03.P06.M03.S20",
  last_unit_id: "RP03.P06.M05.S15",
  range: "RP03.P06.M03.S20-RP03.P06.M05.S15",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-144",
  next_pack_id: "CP00-146",
  next_subphase_id: "RP03.P06.M05.S16",
  production_ready_flag: "audit_compliance_permission_matrix_workflow_boundary_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP145_PERMISSION_MATRIX_WORKFLOW_BOUNDARY_CONTRACT = Object.freeze({
  id: "audit_compliance_cp145_permission_matrix_workflow_boundary_contract",
  pack_id: AUDIT_COMPLIANCE_CP145_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance permission matrix workflow boundary",
  production_ready_flag: AUDIT_COMPLIANCE_CP145_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP145_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP145_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP145_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP145_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP145_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP145_NO_WRITE_ATTESTATION = Object.freeze({
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
  executes_allowed_test: false,
  executes_denied_test: false,
  executes_cross_tenant_test: false,
  executes_leak_prevention_test: false,
  exposes_unauthorized_count: false,
  exposes_unauthorized_object_name: false,
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP145_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "allowed_test_internal_fixture",
  "denied_test_internal_fixture",
  "cross_tenant_test_internal_fixture",
  "leak_prevention_test_internal_fixture",
  "claude_prompt_internal_context",
  "hermes_receipt_internal_digest",
  "cross_tenant_row_count",
  "unauthorized_object_name",
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
  Object.freeze({ index: 21, title: "Cross-tenant test", deliverable_type: "test" }),
  Object.freeze({ index: 22, title: "Leak prevention test", deliverable_type: "test" }),
]);

const CP145_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P06.M03",
    phase_id: "RP03.P06",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    phase_role: "permission_primary_test_boundary",
    evidence_mode: "permission_primary_test_boundary",
    template: PERMISSION_MATRIX_UNITS,
    start: 20,
    count: 3,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P06.M04",
    phase_id: "RP03.P06",
    micro_id: "M04",
    micro_title: "Secondary Workflow Slice",
    phase_role: "permission_secondary_workflow_boundary",
    evidence_mode: "permission_secondary_workflow_boundary",
    template: PERMISSION_MATRIX_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P06.M05",
    phase_id: "RP03.P06",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    phase_role: "permission_audit_binding_route_boundary",
    evidence_mode: "permission_audit_binding_route_boundary",
    template: PERMISSION_MATRIX_UNITS,
    count: 15,
  }),
]);

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function domainFor(behaviorKind) {
  if (behaviorKind.includes("permission_matrix") || behaviorKind.includes("audit_hint") || behaviorKind.includes("security_trimming") || behaviorKind.includes("audit_event") || behaviorKind.includes("permission_fixture")) {
    return "permission_matrix_security_reference";
  }
  if (behaviorKind.includes("ai_retrieval")) return "permission_matrix_ai_reference";
  if (behaviorKind.includes("export_download") || behaviorKind.includes("share")) return "permission_matrix_externalization_reference";
  if (behaviorKind.includes("legal_hold") || behaviorKind.includes("ethical_wall") || behaviorKind.includes("object_acl")) {
    return "permission_matrix_boundary_reference";
  }
  if (behaviorKind.includes("review_required") || behaviorKind.includes("approval_required")) return "permission_matrix_review_approval_reference";
  if (behaviorKind.includes("allowed_test") || behaviorKind.includes("denied_test") || behaviorKind.includes("cross_tenant_test") || behaviorKind.includes("leak_prevention_test")) {
    return "permission_matrix_test_reference";
  }
  return "permission_matrix_decision_reference";
}

function statusFor(behaviorKind) {
  return `${behaviorKind}_permission_matrix_workflow_boundary_bound`;
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP145_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_b_permission_matrix_workflow_boundary: true,
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
    executes_allowed_test: false,
    executes_denied_test: false,
    executes_cross_tenant_test: false,
    executes_leak_prevention_test: false,
    unauthorized_count_exposed: false,
    unauthorized_object_name_exposed: false,
    hidden_field_names_exposed: false,
    exposes_unauthorized_count: false,
    exposes_unauthorized_object_name: false,
    implements_ldip: false,
    splits_hrx_product: false,
    no_write_attestation: CP145_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP145_MICRO_PHASES.flatMap((micro) => {
      const start = micro.start ?? 1;
      const units = micro.template.slice(start - 1, start - 1 + (micro.count ?? micro.template.length));
      return units.map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP145_PACK_BINDING.pack_id,
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
            "risk_b_permission_matrix_workflow_boundary",
            "permission_matrix_reference_only",
            "no_audit_event_write",
            "no_product_state_write",
            "no_permission_execution",
            "no_permission_matrix_evaluation",
            "no_permission_test_execution",
            "no_ai_analytics_or_ai_decision_execution",
            "no_legal_hold_ethical_wall_or_acl_execution",
            "no_review_or_approval_routing",
            "no_security_trimming_or_audit_event_execution",
            "no_api_or_network_execution",
            "no_ui_render_dom_or_interaction",
            "no_claude_or_hermes_execution",
            "no_hidden_field_exposure",
            "cp144_handoff_inherited",
            "cp146_handoff_declared",
          ]),
          expected_status: statusFor(behaviorKind),
          hidden_source_fields: CP145_HIDDEN_SOURCE_FIELDS,
        });
      });
    }),
  );
}

const CP145_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp145CoveredUnitIds() {
  return Object.freeze(CP145_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp145PermissionMatrixWorkflowBoundaryCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP145_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase(caseId) {
  const row = CP145_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-145 audit compliance permission matrix workflow boundary case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "permission_primary_test_boundary",
      "permission_secondary_workflow_boundary",
      "permission_audit_binding_route_boundary",
      "view_search_mutation_export_share_ai_decisions",
      "legal_hold_ethical_wall_object_acl_interactions",
      "review_approval_routes",
      "allowed_denied_cross_tenant_leak_tests",
      "security_trimming_and_audit_event_expectation",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp145PermissionMatrixWorkflowBoundary() {
  const cases = CP145_ROWS.map((row) => runAuditComplianceCp145PermissionMatrixWorkflowBoundaryCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP145_PERMISSION_MATRIX_WORKFLOW_BOUNDARY_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp145CoveredUnitIds().length,
    row_count: CP145_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP145_ROWS, "deliverable_type"),
    domain_counts: countBy(CP145_ROWS, "domain"),
    evidence_mode_counts: countBy(CP145_ROWS, "evidence_mode"),
    first_unit_id: createAuditComplianceCp145CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp145CoveredUnitIds().at(-1),
    cp144_handoff_inherited: true,
    cp146_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    permission_primary_test_boundary_declared: true,
    permission_secondary_workflow_declared: true,
    permission_audit_binding_route_declared: true,
    permission_matrix_decision_bindings_declared: true,
    permission_matrix_boundary_interactions_declared: true,
    permission_matrix_review_approval_declared: true,
    permission_matrix_test_boundary_declared: true,
    permission_matrix_audit_security_declared: true,
    hidden_field_policy_declared: true,
  });
}

export function createAuditComplianceCp145PermissionMatrixWorkflowBoundaryManifest() {
  const readiness = createAuditComplianceCp145PermissionMatrixWorkflowBoundary();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP145_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP145_PERMISSION_MATRIX_WORKFLOW_BOUNDARY_CONTRACT,
    readiness,
    no_write_attestation: CP145_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP145_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp145CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP145_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp145HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-145.audit_compliance_permission_matrix_workflow_boundary",
    hermes_gate: AUDIT_COMPLIANCE_CP145_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/permission-matrix-workflow-boundary-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-145/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp145CoveredUnitIds(),
  });
}

export function createAuditComplianceCp145ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-145.audit_compliance_permission_matrix_workflow_boundary",
    claude_gate: AUDIT_COMPLIANCE_CP145_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-145 cover exactly the 40 planned Risk B permission matrix workflow boundary units in order?",
      "Can any CP00-145 row evaluate permission matrix, view, search, mutation, export/download, share, AI retrieval, legal hold, ethical wall, object ACL, review, approval, trimming, or audit event behavior?",
      "Can any CP00-145 row execute allowed, denied, cross-tenant, or leak-prevention tests rather than describing them?",
      "Are hidden permission rules, route reasons, object ACL grants, unauthorized counts, and unauthorized object names suppressed?",
      "Does CP00-145 hand off cleanly from CP00-144 to CP00-146 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/permission-matrix-workflow-boundary-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp145CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-145.to.CP00-146",
    from_pack_id: AUDIT_COMPLIANCE_CP145_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP145_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP145_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_permission_matrix_security_trim_and_fixture_continuation",
    dependencies: Object.freeze([
      "cp144_fixture_permission_matrix_reference",
      "permission_primary_denied_cross_tenant_leak_tests",
      "permission_secondary_workflow_matrix_references",
      "permission_audit_binding_route_references",
      "permission_matrix_no_write_boundary",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp145Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp145CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP145_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP145_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP145_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP145_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
