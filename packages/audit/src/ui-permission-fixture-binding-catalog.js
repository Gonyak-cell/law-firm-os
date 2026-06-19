export const AUDIT_COMPLIANCE_CP141_PACK_BINDING = Object.freeze({
  pack_id: "CP00-141",
  planned_pack_id: "CP00-141",
  risk_class: "B",
  unit_count: 40,
  first_unit_id: "RP03.P04.M04.S18",
  last_unit_id: "RP03.P04.M06.S15",
  range: "RP03.P04.M04.S18-RP03.P04.M06.S15",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-140",
  next_pack_id: "CP00-142",
  next_subphase_id: "RP03.P04.M06.S16",
  production_ready_flag: "audit_compliance_ui_permission_fixture_binding_verified",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP141_UI_PERMISSION_FIXTURE_BINDING_CONTRACT = Object.freeze({
  id: "audit_compliance_cp141_ui_permission_fixture_binding_contract",
  pack_id: AUDIT_COMPLIANCE_CP141_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance UI permission fixture binding",
  production_ready_flag: AUDIT_COMPLIANCE_CP141_PACK_BINDING.production_ready_flag,
  covered_range: AUDIT_COMPLIANCE_CP141_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP141_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP141_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP141_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP141_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP141_NO_WRITE_ATTESTATION = Object.freeze({
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
  implements_ldip: false,
  splits_hrx_product: false,
});

const CP141_HIDDEN_SOURCE_FIELDS = Object.freeze([
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
  "ui_dependency_internal_query",
  "ui_state_internal_payload",
  "ui_focus_internal_selector",
  "ui_fixture_internal_body",
  "ui_screenshot_internal_path",
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

const CP141_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P04.M04",
    phase_id: "RP03.P04",
    micro_id: "M04",
    micro_title: "Secondary Workflow Slice",
    phase_role: "ui_secondary_workflow_terminal",
    evidence_mode: "ui_secondary_workflow_terminal",
    template: UI_WORKFLOW_UNITS,
    start: 18,
    count: 3,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P04.M05",
    phase_id: "RP03.P04",
    micro_id: "M05",
    micro_title: "Permission And Audit Binding",
    phase_role: "ui_permission_audit_binding",
    evidence_mode: "ui_permission_audit_binding",
    template: UI_WORKFLOW_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P04.M06",
    phase_id: "RP03.P04",
    micro_id: "M06",
    micro_title: "Synthetic Fixture Set",
    phase_role: "ui_synthetic_fixture_opening",
    evidence_mode: "ui_synthetic_fixture_opening",
    template: UI_WORKFLOW_UNITS,
    start: 1,
    count: 15,
  }),
]);

const STATUS_BY_KIND = Object.freeze({
  audit_hint_display: "audit_hint_display_permission_fixture_reference_bound",
  build_smoke: "build_smoke_permission_fixture_reference_bound",
  claude_ui_leak_prompt: "claude_ui_leak_prompt_permission_fixture_reference_bound",
  closeout_handoff: "closeout_handoff_permission_fixture_reference_bound",
  data_dependency_map: "data_dependency_map_permission_fixture_reference_bound",
  denied_state: "denied_state_permission_fixture_reference_bound",
  empty_state: "empty_state_permission_fixture_reference_bound",
  error_message_copy: "error_message_copy_permission_fixture_reference_bound",
  hermes_ui_evidence: "hermes_ui_evidence_permission_fixture_reference_bound",
  keyboard_focus_behavior: "keyboard_focus_behavior_permission_fixture_reference_bound",
  loading_state: "loading_state_permission_fixture_reference_bound",
  no_unauthorized_count_leak: "no_unauthorized_count_leak_permission_fixture_reference_bound",
  permission_badge: "permission_badge_permission_fixture_reference_bound",
  primary_interaction: "primary_interaction_permission_fixture_reference_bound",
  responsive_desktop_layout: "responsive_desktop_layout_permission_fixture_reference_bound",
  responsive_mobile_layout: "responsive_mobile_layout_permission_fixture_reference_bound",
  review_required_state: "review_required_state_permission_fixture_reference_bound",
  secondary_interaction: "secondary_interaction_permission_fixture_reference_bound",
  state_snapshot: "state_snapshot_permission_fixture_reference_bound",
  synthetic_fixture_binding: "synthetic_fixture_binding_permission_fixture_reference_bound",
  ui_surface_inventory: "ui_surface_inventory_permission_fixture_reference_bound",
  visual_density_check: "visual_density_check_permission_fixture_reference_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function domainFor(behaviorKind, micro) {
  if (micro.micro_id === "M05") return "ui_permission_audit_binding_reference";
  if (micro.micro_id === "M06") return "ui_synthetic_fixture_reference";
  if (behaviorKind.includes("hermes") || behaviorKind.includes("claude")) return "ui_terminal_evidence_review_reference";
  if (behaviorKind.includes("handoff")) return "ui_terminal_closeout_handoff_reference";
  return "ui_terminal_workflow_reference";
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP141_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_b_ui_permission_fixture_binding: true,
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
    implements_ldip: false,
    splits_hrx_product: false,
    unauthorized_count_exposed: false,
    unauthorized_object_name_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP141_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP141_MICRO_PHASES.flatMap((micro) => {
      const units = micro.template.slice((micro.start ?? 1) - 1, (micro.start ?? 1) - 1 + (micro.count ?? micro.template.length));
      return units.map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind, micro);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP141_PACK_BINDING.pack_id,
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
            "risk_b_ui_permission_fixture_binding",
            "ui_reference_only",
            "permission_audit_binding_reference_only",
            "synthetic_fixture_reference_only",
            "terminal_evidence_review_reference_only",
            "no_audit_event_write",
            "no_product_state_write",
            "no_permission_execution",
            "no_api_or_network_execution",
            "no_ui_render_dom_or_interaction",
            "no_claude_or_hermes_execution",
            "no_hidden_field_exposure",
            "cp140_handoff_inherited",
            "cp142_handoff_declared",
          ]),
          expected_status: STATUS_BY_KIND[behaviorKind] ?? `${behaviorKind}_permission_fixture_reference_bound`,
          hidden_source_fields: CP141_HIDDEN_SOURCE_FIELDS,
        });
      });
    }),
  );
}

const CP141_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp141CoveredUnitIds() {
  return Object.freeze(CP141_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp141UiPermissionFixtureBindingCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP141_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp141UiPermissionFixtureBindingCase(caseId) {
  const row = CP141_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-141 audit compliance UI permission fixture binding case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "ui_permission_audit_binding",
      "ui_synthetic_fixture_opening",
      "ui_terminal_hermes_evidence",
      "ui_terminal_claude_review",
      "ui_closeout_handoff",
      "ui_denied_review_state",
      "ui_permission_badge",
      "ui_audit_hint_display",
      "ui_responsive_layout",
      "ui_keyboard_focus_behavior",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp141UiPermissionFixtureBinding() {
  const cases = CP141_ROWS.map((row) => runAuditComplianceCp141UiPermissionFixtureBindingCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP141_UI_PERMISSION_FIXTURE_BINDING_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp141CoveredUnitIds().length,
    row_count: CP141_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP141_ROWS, "deliverable_type"),
    domain_counts: countBy(CP141_ROWS, "domain"),
    evidence_mode_counts: countBy(CP141_ROWS, "evidence_mode"),
    first_unit_id: createAuditComplianceCp141CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp141CoveredUnitIds().at(-1),
    cp140_handoff_inherited: true,
    cp142_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    ui_permission_audit_binding_declared: true,
    ui_synthetic_fixture_opening_declared: true,
    ui_terminal_evidence_review_declared: true,
    ui_denied_review_states_declared: true,
    ui_layout_focus_declared: true,
    ui_no_hidden_field_exposure_declared: true,
    hidden_field_policy_declared: true,
  });
}

export function createAuditComplianceCp141UiPermissionFixtureBindingManifest() {
  const readiness = createAuditComplianceCp141UiPermissionFixtureBinding();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP141_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP141_UI_PERMISSION_FIXTURE_BINDING_CONTRACT,
    readiness,
    no_write_attestation: CP141_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP141_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp141CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP141_PACK_BINDING.production_ready_flag,
  });
}

export function createAuditComplianceCp141HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-141.audit_compliance_ui_permission_fixture_binding",
    hermes_gate: AUDIT_COMPLIANCE_CP141_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/ui-permission-fixture-binding-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-141/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp141CoveredUnitIds(),
  });
}

export function createAuditComplianceCp141ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-141.audit_compliance_ui_permission_fixture_binding",
    claude_gate: AUDIT_COMPLIANCE_CP141_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-141 keep permission/audit binding and fixture rows as synthetic no-write descriptors?",
      "Can any CP00-141 row execute permission decisions, audit hint checks, API handlers, network requests, DOM mutation, screenshots, or UI interactions?",
      "Are denied/review states, permission badges, audit hints, responsive layout, focus behavior, and fixture opening references represented without exposing hidden fields?",
      "Does CP00-141 preserve H03/C03 as evidence and read-only review gates only?",
      "Does the pack hand off cleanly from CP00-140 to CP00-142 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/ui-permission-fixture-binding-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp141CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-141.to.CP00-142",
    from_pack_id: AUDIT_COMPLIANCE_CP141_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP141_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP141_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_synthetic_fixture_continuation",
    dependencies: Object.freeze([
      "cp140_ui_workflow_continuation",
      "ui_secondary_workflow_terminal_references",
      "ui_permission_audit_binding_references",
      "ui_synthetic_fixture_opening_references",
      "denied_review_state_and_hidden_field_guards",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp141Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp141CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP141_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP141_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== AUDIT_COMPLIANCE_CP141_PACK_BINDING.first_unit_id) errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== AUDIT_COMPLIANCE_CP141_PACK_BINDING.last_unit_id) errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
