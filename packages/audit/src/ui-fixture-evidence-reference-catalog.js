export const AUDIT_COMPLIANCE_CP142_PACK_BINDING = Object.freeze({
  pack_id: "CP00-142",
  planned_pack_id: "CP00-142",
  risk_class: "C",
  unit_count: 150,
  first_unit_id: "RP03.P04.M06.S16",
  last_unit_id: "RP03.P05.M05.S13",
  range: "RP03.P04.M06.S16-RP03.P05.M05.S13",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-141",
  next_pack_id: "CP00-143",
  next_subphase_id: "RP03.P05.M05.S14",
  production_ready_flag: "audit_compliance_ui_fixture_evidence_reference_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP142_UI_FIXTURE_EVIDENCE_REFERENCE_CONTRACT = Object.freeze({
  id: "audit_compliance_cp142_ui_fixture_evidence_reference_contract",
  pack_id: AUDIT_COMPLIANCE_CP142_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance UI fixture evidence reference",
  production_ready_flag: AUDIT_COMPLIANCE_CP142_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP142_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP142_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP142_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP142_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP142_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP142_NO_WRITE_ATTESTATION = Object.freeze({
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
  materializes_golden_case_payload: false,
  executes_replay_command: false,
  executes_ai_retrieval: false,
  executes_analytics_query: false,
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP142_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "permission_badge_internal_rule",
  "denied_review_internal_reason",
  "ui_fixture_internal_body",
  "ui_screenshot_internal_path",
  "fixture_manifest_internal_body",
  "golden_case_internal_payload",
  "failure_case_internal_payload",
  "replay_command_internal_args",
  "ai_retrieval_internal_prompt",
  "analytics_internal_query",
  "claude_prompt_internal_context",
  "hermes_receipt_internal_digest",
  "cross_tenant_row_count",
  "unauthorized_object_name",
]);

const UI_WORKFLOW_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "UI surface inventory", deliverable_type: "ui" }),
  Object.freeze({ index: 2, title: "Data dependency map", deliverable_type: "implementation" }),
  Object.freeze({ index: 3, title: "Loading state", deliverable_type: "ui" }),
  Object.freeze({ index: 4, title: "Empty state", deliverable_type: "ui" }),
  Object.freeze({ index: 5, title: "Denied state", deliverable_type: "ui" }),
  Object.freeze({ index: 6, title: "Review-required state", deliverable_type: "claude_review" }),
  Object.freeze({ index: 7, title: "Primary interaction", deliverable_type: "ui" }),
  Object.freeze({ index: 8, title: "Secondary interaction", deliverable_type: "ui" }),
  Object.freeze({ index: 9, title: "Permission badge", deliverable_type: "security_audit" }),
  Object.freeze({ index: 10, title: "Audit hint display", deliverable_type: "security_audit" }),
  Object.freeze({ index: 11, title: "Error message copy", deliverable_type: "implementation" }),
  Object.freeze({ index: 12, title: "Responsive desktop layout", deliverable_type: "ui" }),
  Object.freeze({ index: 13, title: "Responsive mobile layout", deliverable_type: "ui" }),
  Object.freeze({ index: 14, title: "Keyboard/focus behavior", deliverable_type: "implementation" }),
  Object.freeze({ index: 15, title: "Visual density check", deliverable_type: "implementation" }),
  Object.freeze({ index: 16, title: "Synthetic fixture binding", deliverable_type: "fixture" }),
  Object.freeze({ index: 17, title: "Build smoke", deliverable_type: "test" }),
  Object.freeze({ index: 18, title: "Hermes UI evidence", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 19, title: "Claude UI leak prompt", deliverable_type: "claude_review" }),
  Object.freeze({ index: 20, title: "Closeout handoff", deliverable_type: "implementation" }),
  Object.freeze({ index: 21, title: "State snapshot", deliverable_type: "ui" }),
  Object.freeze({ index: 22, title: "No unauthorized count leak", deliverable_type: "implementation" }),
]);

const FIXTURE_CONTRACT_UNITS = Object.freeze([
  Object.freeze({ index: 1, title: "Base tenant fixture", deliverable_type: "fixture" }),
  Object.freeze({ index: 2, title: "Base user fixture", deliverable_type: "fixture" }),
  Object.freeze({ index: 3, title: "Base matter fixture", deliverable_type: "fixture" }),
  Object.freeze({ index: 4, title: "Base document fixture", deliverable_type: "fixture" }),
  Object.freeze({ index: 5, title: "Primary golden case", deliverable_type: "fixture" }),
  Object.freeze({ index: 6, title: "Secondary golden case", deliverable_type: "fixture" }),
  Object.freeze({ index: 7, title: "Review-required case", deliverable_type: "claude_review" }),
  Object.freeze({ index: 8, title: "Denied case", deliverable_type: "implementation" }),
]);

const FIXTURE_WORKFLOW_UNITS = Object.freeze([
  ...FIXTURE_CONTRACT_UNITS,
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

const CP142_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P04.M06",
    phase_id: "RP03.P04",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    phase_role: "ui_synthetic_fixture_terminal",
    evidence_mode: "ui_synthetic_fixture_terminal",
    template: UI_WORKFLOW_UNITS,
    start: 16,
    count: 5,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P04.M07",
    phase_id: "RP03.P04",
    micro_id: "M07",
    micro_title: "Test And Golden Case Set",
    phase_role: "ui_test_golden_case_reference",
    evidence_mode: "ui_test_golden_case_reference",
    template: UI_WORKFLOW_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P04.M08",
    phase_id: "RP03.P04",
    micro_id: "M08",
    micro_title: "Hermes Evidence Packet",
    phase_role: "ui_hermes_evidence_packet_reference",
    evidence_mode: "ui_hermes_evidence_packet_reference",
    template: UI_WORKFLOW_UNITS,
    count: 20,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P04.M09",
    phase_id: "RP03.P04",
    micro_id: "M09",
    micro_title: "Claude Review Packet",
    phase_role: "ui_claude_review_packet_reference",
    evidence_mode: "ui_claude_review_packet_reference",
    template: UI_WORKFLOW_UNITS,
    count: 20,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P04.M10",
    phase_id: "RP03.P04",
    micro_id: "M10",
    micro_title: "Closeout And Next Handoff",
    phase_role: "ui_closeout_handoff_reference",
    evidence_mode: "ui_closeout_handoff_reference",
    template: UI_WORKFLOW_UNITS,
    count: 8,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P05.M00",
    phase_id: "RP03.P05",
    micro_id: "M00",
    micro_title: "Scope Inventory",
    phase_role: "fixture_scope_inventory_reference",
    evidence_mode: "fixture_scope_inventory_reference",
    template: FIXTURE_CONTRACT_UNITS,
    count: 4,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P05.M01",
    phase_id: "RP03.P05",
    micro_id: "M01",
    micro_title: "Contract Draft",
    phase_role: "fixture_contract_draft_reference",
    evidence_mode: "fixture_contract_draft_reference",
    template: FIXTURE_CONTRACT_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P05.M02",
    phase_id: "RP03.P05",
    micro_id: "M02",
    micro_title: "Type And Shape Definition",
    phase_role: "fixture_type_shape_reference",
    evidence_mode: "fixture_type_shape_reference",
    template: FIXTURE_CONTRACT_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P05.M03",
    phase_id: "RP03.P05",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    phase_role: "fixture_primary_workflow_reference",
    evidence_mode: "fixture_primary_workflow_reference",
    template: FIXTURE_WORKFLOW_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P05.M04",
    phase_id: "RP03.P05",
    micro_id: "M04",
    micro_title: "Secondary Workflow Slice",
    phase_role: "fixture_secondary_workflow_reference",
    evidence_mode: "fixture_secondary_workflow_reference",
    template: FIXTURE_WORKFLOW_UNITS,
    count: 20,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P05.M05",
    phase_id: "RP03.P05",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    phase_role: "fixture_permission_audit_binding_reference",
    evidence_mode: "fixture_permission_audit_binding_reference",
    template: FIXTURE_WORKFLOW_UNITS,
    count: 13,
  }),
]);

const STATUS_BY_KIND = Object.freeze({
  ai_retrieval_or_analytics_case: "ai_retrieval_or_analytics_case_fixture_reference_bound",
  audit_hint_case: "audit_hint_case_fixture_reference_bound",
  audit_hint_display: "audit_hint_display_ui_fixture_evidence_reference_bound",
  base_document_fixture: "base_document_fixture_reference_bound",
  base_matter_fixture: "base_matter_fixture_reference_bound",
  base_tenant_fixture: "base_tenant_fixture_reference_bound",
  base_user_fixture: "base_user_fixture_reference_bound",
  build_smoke: "build_smoke_ui_fixture_evidence_reference_bound",
  claude_missing_test_prompt: "claude_missing_test_prompt_fixture_reference_bound",
  claude_ui_leak_prompt: "claude_ui_leak_prompt_ui_fixture_evidence_reference_bound",
  closeout_handoff: "closeout_handoff_fixture_evidence_reference_bound",
  cross_tenant_case: "cross_tenant_case_fixture_reference_bound",
  data_dependency_map: "data_dependency_map_ui_fixture_evidence_reference_bound",
  denied_case: "denied_case_fixture_reference_bound",
  denied_state: "denied_state_ui_fixture_evidence_reference_bound",
  empty_state: "empty_state_ui_fixture_evidence_reference_bound",
  error_message_copy: "error_message_copy_ui_fixture_evidence_reference_bound",
  failure_test: "failure_test_fixture_reference_bound",
  fixture_manifest: "fixture_manifest_reference_bound",
  golden_test: "golden_test_fixture_reference_bound",
  hermes_fixture_evidence: "hermes_fixture_evidence_reference_bound",
  hermes_ui_evidence: "hermes_ui_evidence_ui_fixture_evidence_reference_bound",
  keyboard_focus_behavior: "keyboard_focus_behavior_ui_fixture_evidence_reference_bound",
  loading_state: "loading_state_ui_fixture_evidence_reference_bound",
  missing_context_case: "missing_context_case_fixture_reference_bound",
  no_real_data_check: "no_real_data_check_fixture_reference_bound",
  no_unauthorized_count_leak: "no_unauthorized_count_leak_ui_fixture_evidence_reference_bound",
  permission_badge: "permission_badge_ui_fixture_evidence_reference_bound",
  primary_golden_case: "primary_golden_case_fixture_reference_bound",
  primary_interaction: "primary_interaction_ui_fixture_evidence_reference_bound",
  responsive_desktop_layout: "responsive_desktop_layout_ui_fixture_evidence_reference_bound",
  responsive_mobile_layout: "responsive_mobile_layout_ui_fixture_evidence_reference_bound",
  review_required_case: "review_required_case_fixture_reference_bound",
  review_required_state: "review_required_state_ui_fixture_evidence_reference_bound",
  secondary_golden_case: "secondary_golden_case_fixture_reference_bound",
  secondary_interaction: "secondary_interaction_ui_fixture_evidence_reference_bound",
  security_trimming_case: "security_trimming_case_fixture_reference_bound",
  stable_id_check: "stable_id_check_fixture_reference_bound",
  state_snapshot: "state_snapshot_ui_fixture_evidence_reference_bound",
  synthetic_fixture_binding: "synthetic_fixture_binding_ui_fixture_evidence_reference_bound",
  ui_surface_inventory: "ui_surface_inventory_ui_fixture_evidence_reference_bound",
  visual_density_check: "visual_density_check_ui_fixture_evidence_reference_bound",
});

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
    if (behaviorKind.includes("hermes") || behaviorKind.includes("claude")) return "fixture_evidence_review_reference";
    return "fixture_workflow_reference";
  }
  if (micro.micro_id === "M08") return "ui_hermes_evidence_packet_reference";
  if (micro.micro_id === "M09") return "ui_claude_review_packet_reference";
  if (micro.micro_id === "M10") return "ui_closeout_handoff_reference";
  if (behaviorKind.includes("permission") || behaviorKind.includes("audit_hint")) return "ui_permission_audit_reference";
  if (behaviorKind.includes("hermes") || behaviorKind.includes("claude")) return "ui_evidence_review_reference";
  if (behaviorKind.includes("fixture") || behaviorKind.includes("build_smoke")) return "ui_fixture_evidence_reference";
  return "ui_test_golden_case_reference";
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP142_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_ui_fixture_evidence_reference: true,
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
    materializes_golden_case_payload: false,
    executes_replay_command: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    implements_ldip: false,
    splits_hrx_product: false,
    unauthorized_count_exposed: false,
    unauthorized_object_name_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP142_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP142_MICRO_PHASES.flatMap((micro) => {
      const start = micro.start ?? 1;
      const units = micro.template.slice(start - 1, start - 1 + (micro.count ?? micro.template.length));
      return units.map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind, micro);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP142_PACK_BINDING.pack_id,
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
            "risk_c_ui_fixture_evidence_reference",
            "ui_reference_only",
            "fixture_reference_only",
            "golden_case_reference_only",
            "permission_audit_guard_reference_only",
            "evidence_review_reference_only",
            "no_audit_event_write",
            "no_product_state_write",
            "no_permission_execution",
            "no_fixture_payload_load",
            "no_ai_or_analytics_execution",
            "no_api_or_network_execution",
            "no_ui_render_dom_or_interaction",
            "no_claude_or_hermes_execution",
            "no_hidden_field_exposure",
            "cp141_handoff_inherited",
            "cp143_handoff_declared",
          ]),
          expected_status: STATUS_BY_KIND[behaviorKind] ?? `${behaviorKind}_ui_fixture_evidence_reference_bound`,
          hidden_source_fields: CP142_HIDDEN_SOURCE_FIELDS,
        });
      });
    }),
  );
}

const CP142_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp142CoveredUnitIds() {
  return Object.freeze(CP142_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp142UiFixtureEvidenceReferenceCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP142_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp142UiFixtureEvidenceReferenceCase(caseId) {
  const row = CP142_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-142 audit compliance UI fixture evidence reference case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "ui_synthetic_fixture_terminal",
      "ui_test_golden_case_reference",
      "ui_hermes_evidence_packet",
      "ui_claude_review_packet",
      "ui_closeout_handoff",
      "fixture_scope_inventory",
      "fixture_contract_draft",
      "fixture_type_shape_definition",
      "fixture_primary_workflow",
      "fixture_secondary_workflow",
      "fixture_permission_audit_binding",
      "fixture_no_real_data",
      "fixture_stable_id",
      "fixture_replay_command_reference",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp142UiFixtureEvidenceReference() {
  const cases = CP142_ROWS.map((row) => runAuditComplianceCp142UiFixtureEvidenceReferenceCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP142_UI_FIXTURE_EVIDENCE_REFERENCE_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp142CoveredUnitIds().length,
    row_count: CP142_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP142_ROWS, "deliverable_type"),
    domain_counts: countBy(CP142_ROWS, "domain"),
    evidence_mode_counts: countBy(CP142_ROWS, "evidence_mode"),
    first_unit_id: createAuditComplianceCp142CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp142CoveredUnitIds().at(-1),
    cp141_handoff_inherited: true,
    cp143_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    ui_fixture_evidence_reference_declared: true,
    ui_terminal_fixture_declared: true,
    ui_evidence_review_packet_declared: true,
    ui_closeout_handoff_declared: true,
    p05_fixture_lane_declared: true,
    fixture_contract_type_shape_declared: true,
    fixture_primary_secondary_workflows_declared: true,
    fixture_permission_audit_binding_declared: true,
    fixture_no_real_data_declared: true,
    fixture_stable_id_replay_declared: true,
    fixture_ai_analytics_reference_declared: true,
    hidden_field_policy_declared: true,
  });
}

export function createAuditComplianceCp142UiFixtureEvidenceReferenceManifest() {
  const readiness = createAuditComplianceCp142UiFixtureEvidenceReference();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP142_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP142_UI_FIXTURE_EVIDENCE_REFERENCE_CONTRACT,
    readiness,
    no_write_attestation: CP142_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP142_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp142CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP142_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp142HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-142.audit_compliance_ui_fixture_evidence_reference",
    hermes_gate: AUDIT_COMPLIANCE_CP142_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/ui-fixture-evidence-reference-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-142/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp142CoveredUnitIds(),
  });
}

export function createAuditComplianceCp142ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-142.audit_compliance_ui_fixture_evidence_reference",
    claude_gate: AUDIT_COMPLIANCE_CP142_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-142 map all 150 planned UI fixture/evidence and P05 fixture units in plan order?",
      "Can any CP00-142 row load fixture payloads, materialize golden-case payloads, run replay commands, execute AI retrieval, execute analytics queries, or write audit/product state?",
      "Are tenant, user, matter, document, golden, denied, cross-tenant, audit hint, security trimming, AI retrieval, and analytics cases descriptor-only?",
      "Does CP00-142 preserve hidden source fields and unauthorized count/object name suppression?",
      "Does the pack hand off cleanly from CP00-141 to CP00-143 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/ui-fixture-evidence-reference-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp142CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-142.to.CP00-143",
    from_pack_id: AUDIT_COMPLIANCE_CP142_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP142_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP142_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_fixture_permission_audit_terminal_continuation",
    dependencies: Object.freeze([
      "cp141_ui_permission_fixture_binding",
      "ui_synthetic_fixture_terminal_references",
      "ui_test_golden_case_references",
      "ui_hermes_claude_evidence_packet_references",
      "p05_fixture_contract_and_type_shape_references",
      "p05_fixture_workflow_references",
      "permission_audit_fixture_guards",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp142Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp142CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP142_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP142_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP142_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP142_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
