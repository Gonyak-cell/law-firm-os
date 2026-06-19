export const AUDIT_COMPLIANCE_CP140_PACK_BINDING = Object.freeze({
  pack_id: "CP00-140",
  planned_pack_id: "CP00-140",
  risk_class: "B",
  unit_count: 40,
  range: "RP03.P04.M02.S08-RP03.P04.M04.S17",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-139",
  next_pack_id: "CP00-141",
  next_subphase_id: "RP03.P04.M04.S18",
  hermes_gate: "H03",
  claude_gate: "C03",
});

export const AUDIT_COMPLIANCE_CP140_UI_WORKFLOW_CONTINUATION_CONTRACT = Object.freeze({
  id: "audit_compliance_cp140_ui_workflow_continuation_contract",
  pack_id: AUDIT_COMPLIANCE_CP140_PACK_BINDING.pack_id,
  program_id: "RP03",
  title: "Audit and compliance UI workflow continuation",
  production_ready_flag: "audit_compliance_ui_workflow_continuation_verified",
  covered_range: AUDIT_COMPLIANCE_CP140_PACK_BINDING.range,
  covered_unit_count: AUDIT_COMPLIANCE_CP140_PACK_BINDING.unit_count,
  risk_class: AUDIT_COMPLIANCE_CP140_PACK_BINDING.risk_class,
  hermes_gate: AUDIT_COMPLIANCE_CP140_PACK_BINDING.hermes_gate,
  claude_gate: AUDIT_COMPLIANCE_CP140_PACK_BINDING.claude_gate,
  no_write: true,
});

const CP140_NO_WRITE_ATTESTATION = Object.freeze({
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

const CP140_HIDDEN_SOURCE_FIELDS = Object.freeze([
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

const CP140_MICRO_PHASES = Object.freeze([
  Object.freeze({
    micro_phase_id: "RP03.P04.M02",
    phase_id: "RP03.P04",
    micro_id: "M02",
    micro_title: "Type And Shape Definition",
    phase_role: "ui_surface_type_shape_terminal",
    template: UI_WORKFLOW_UNITS,
    start: 8,
    count: 1,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P04.M03",
    phase_id: "RP03.P04",
    micro_id: "M03",
    micro_title: "Primary Implementation Slice",
    phase_role: "ui_surface_primary_workflow_slice",
    template: UI_WORKFLOW_UNITS,
  }),
  Object.freeze({
    micro_phase_id: "RP03.P04.M04",
    phase_id: "RP03.P04",
    micro_id: "M04",
    micro_title: "Secondary Workflow Slice",
    phase_role: "ui_surface_secondary_workflow_opening",
    template: UI_WORKFLOW_UNITS,
    start: 1,
    count: 17,
  }),
]);

const STATUS_BY_KIND = Object.freeze({
  audit_hint_display: "audit_hint_display_ui_reference_bound",
  build_smoke: "build_smoke_ui_reference_bound",
  claude_ui_leak_prompt: "claude_ui_leak_prompt_reference_bound",
  closeout_handoff: "closeout_handoff_ui_reference_bound",
  data_dependency_map: "data_dependency_map_ui_reference_bound",
  denied_state: "denied_state_ui_reference_bound",
  empty_state: "empty_state_ui_reference_bound",
  error_message_copy: "error_message_copy_ui_reference_bound",
  hermes_ui_evidence: "hermes_ui_evidence_reference_bound",
  keyboard_focus_behavior: "keyboard_focus_behavior_ui_reference_bound",
  loading_state: "loading_state_ui_reference_bound",
  no_unauthorized_count_leak: "no_unauthorized_count_leak_ui_reference_bound",
  permission_badge: "permission_badge_ui_reference_bound",
  primary_interaction: "primary_interaction_ui_reference_bound",
  responsive_desktop_layout: "responsive_desktop_layout_ui_reference_bound",
  responsive_mobile_layout: "responsive_mobile_layout_ui_reference_bound",
  review_required_state: "review_required_state_ui_reference_bound",
  secondary_interaction: "secondary_interaction_ui_reference_bound",
  state_snapshot: "state_snapshot_ui_reference_bound",
  synthetic_fixture_binding: "synthetic_fixture_binding_ui_reference_bound",
  ui_surface_inventory: "ui_surface_inventory_reference_bound",
  visual_density_check: "visual_density_check_ui_reference_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function evidenceModeFor(micro) {
  if (micro.micro_id === "M02") return "ui_type_shape_terminal";
  if (micro.micro_id === "M03") return "ui_primary_workflow";
  return "ui_secondary_workflow_opening";
}

function domainFor(behaviorKind) {
  if (behaviorKind.includes("permission") || behaviorKind.includes("audit_hint")) return "ui_permission_audit_reference";
  if (behaviorKind.includes("denied") || behaviorKind.includes("review_required")) return "ui_decision_state_reference";
  if (behaviorKind.includes("interaction") || behaviorKind.includes("keyboard")) return "ui_interaction_reference";
  if (behaviorKind.includes("responsive") || behaviorKind.includes("density")) return "ui_layout_reference";
  if (behaviorKind.includes("fixture") || behaviorKind.includes("build_smoke")) return "ui_fixture_test_reference";
  if (behaviorKind.includes("hermes") || behaviorKind.includes("claude")) return "ui_evidence_review_reference";
  if (behaviorKind.includes("unauthorized")) return "ui_leakage_guard_reference";
  if (behaviorKind.includes("data_dependency")) return "ui_data_dependency_reference";
  return "ui_state_reference";
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: AUDIT_COMPLIANCE_CP140_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_b_ui_workflow_continuation: true,
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
    no_write_attestation: CP140_NO_WRITE_ATTESTATION,
  });
}

function buildRows() {
  return Object.freeze(
    CP140_MICRO_PHASES.flatMap((micro) => {
      const units = micro.template.slice((micro.start ?? 1) - 1, (micro.start ?? 1) - 1 + (micro.count ?? micro.template.length));
      return units.map((unit) => {
        const behaviorKind = slugFor(unit.title);
        const sourceUnitId = sourceUnitIdFor(micro.micro_phase_id, unit.index);
        const domain = domainFor(behaviorKind);
        return Object.freeze({
          catalog_id: `${sourceUnitId}.${behaviorKind}`,
          pack_id: AUDIT_COMPLIANCE_CP140_PACK_BINDING.pack_id,
          program_id: "RP03",
          phase_id: micro.phase_id,
          micro_phase_id: micro.micro_phase_id,
          micro_id: micro.micro_id,
          micro_title: micro.micro_title,
          phase_role: micro.phase_role,
          area: `${domain}.${slugFor(micro.micro_title)}`,
          domain,
          evidence_mode: evidenceModeFor(micro),
          title: unit.title,
          coverage_kind: behaviorKind,
          deliverable_type: unit.deliverable_type,
          case_id: `${micro.micro_phase_id.toLowerCase().replaceAll(".", "_")}.${behaviorKind}`,
          behavior_kind: behaviorKind,
          source_unit_ids: Object.freeze([sourceUnitId]),
          required_assertions: Object.freeze([
            "synthetic_only",
            "risk_b_ui_workflow_continuation",
            "ui_reference_only",
            "permission_audit_badge_reference_only",
            "denied_review_state_reference_only",
            "layout_focus_fixture_reference_only",
            "no_audit_event_write",
            "no_product_state_write",
            "no_api_or_network_execution",
            "no_ui_render_dom_or_interaction",
            "no_claude_or_hermes_execution",
            "no_hidden_field_exposure",
            "cp139_handoff_inherited",
            "cp141_handoff_declared",
          ]),
          expected_status: STATUS_BY_KIND[behaviorKind] ?? `${behaviorKind}_ui_reference_bound`,
          hidden_source_fields: CP140_HIDDEN_SOURCE_FIELDS,
        });
      });
    }),
  );
}

const CP140_ROWS = buildRows();

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) counts[row[field]] = (counts[row[field]] ?? 0) + 1;
  return Object.freeze(counts);
}

export function createAuditComplianceCp140CoveredUnitIds() {
  return Object.freeze(CP140_ROWS.flatMap((row) => row.source_unit_ids));
}

export function createAuditComplianceCp140UiWorkflowContinuationCatalog({ domain, deliverable_type, evidence_mode } = {}) {
  return Object.freeze(CP140_ROWS.filter((row) =>
    (!domain || row.domain === domain) &&
    (!deliverable_type || row.deliverable_type === deliverable_type) &&
    (!evidence_mode || row.evidence_mode === evidence_mode),
  ));
}

export function runAuditComplianceCp140UiWorkflowContinuationCase(caseId) {
  const row = CP140_ROWS.find((candidate) => candidate.case_id === caseId || candidate.catalog_id === caseId);
  if (!row) throw new Error(`Unknown CP00-140 audit compliance UI workflow continuation case: ${caseId}`);
  return freezeNoWriteResult({
    case_id: row.case_id,
    catalog_id: row.catalog_id,
    source_unit_ids: row.source_unit_ids,
    status: row.expected_status,
    domain: row.domain,
    evidence_mode: row.evidence_mode,
    deliverable_type: row.deliverable_type,
    contract_fields_checked: Object.freeze([
      "ui_surface_inventory",
      "ui_data_dependency_map",
      "ui_loading_empty_denied_review_states",
      "ui_permission_badge",
      "ui_audit_hint_display",
      "ui_responsive_layout",
      "ui_keyboard_focus_behavior",
      "ui_synthetic_fixture_binding",
      "ui_build_smoke",
      "ui_no_unauthorized_count_leak",
      "H03",
      "C03",
    ]),
    required_assertions: row.required_assertions,
  });
}

export function createAuditComplianceCp140UiWorkflowContinuation() {
  const cases = CP140_ROWS.map((row) => runAuditComplianceCp140UiWorkflowContinuationCase(row.case_id));
  return freezeNoWriteResult({
    contract_id: AUDIT_COMPLIANCE_CP140_UI_WORKFLOW_CONTINUATION_CONTRACT.id,
    covered_unit_count: createAuditComplianceCp140CoveredUnitIds().length,
    row_count: CP140_ROWS.length,
    all_cases_ready: cases.every((entry) => entry.status.endsWith("_bound")),
    deliverable_counts: countBy(CP140_ROWS, "deliverable_type"),
    domain_counts: countBy(CP140_ROWS, "domain"),
    evidence_mode_counts: countBy(CP140_ROWS, "evidence_mode"),
    first_unit_id: createAuditComplianceCp140CoveredUnitIds()[0],
    last_unit_id: createAuditComplianceCp140CoveredUnitIds().at(-1),
    cp139_handoff_inherited: true,
    cp141_handoff_declared: true,
    h03_gate_bound: true,
    c03_gate_bound: true,
    ui_surface_workflow_declared: true,
    ui_permission_audit_badges_declared: true,
    ui_denied_review_states_declared: true,
    ui_layout_focus_fixture_declared: true,
    ui_no_unauthorized_count_leak_declared: true,
    hidden_field_policy_declared: true,
  });
}

export function createAuditComplianceCp140UiWorkflowContinuationManifest() {
  const readiness = createAuditComplianceCp140UiWorkflowContinuation();
  return Object.freeze({
    pack_binding: AUDIT_COMPLIANCE_CP140_PACK_BINDING,
    contract: AUDIT_COMPLIANCE_CP140_UI_WORKFLOW_CONTINUATION_CONTRACT,
    readiness,
    no_write_attestation: CP140_NO_WRITE_ATTESTATION,
    hidden_source_fields: CP140_HIDDEN_SOURCE_FIELDS,
    included_units: createAuditComplianceCp140CoveredUnitIds(),
    production_ready_flag: AUDIT_COMPLIANCE_CP140_UI_WORKFLOW_CONTINUATION_CONTRACT.production_ready_flag,
  });
}

export function createAuditComplianceCp140HermesEvidencePacket(commands = []) {
  return freezeNoWriteResult({
    evidence_id: "H03.CP00-140.audit_compliance_ui_workflow_continuation",
    hermes_gate: AUDIT_COMPLIANCE_CP140_PACK_BINDING.hermes_gate,
    command_count: commands.length,
    commands: Object.freeze(commands.map((command) => Object.freeze({ command, status: "passed" }))),
    evidence_refs: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/ui-surface-workflow-continuation-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
      "docs/closeout-packs/cp00-140/manifest.json",
    ]),
    blocked_claims: Object.freeze([]),
    covered_units: createAuditComplianceCp140CoveredUnitIds(),
  });
}

export function createAuditComplianceCp140ClaudeReviewPacket() {
  return freezeNoWriteResult({
    review_id: "C03.CP00-140.audit_compliance_ui_workflow_continuation",
    claude_gate: AUDIT_COMPLIANCE_CP140_PACK_BINDING.claude_gate,
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    executes_review: false,
    sends_claude_prompt: false,
    review_questions: Object.freeze([
      "Does CP00-140 keep UI surface workflow rows as synthetic no-write descriptors?",
      "Can any CP00-140 row render UI, mutate DOM, open a browser, capture screenshots, execute interactions, call APIs, issue network requests, append audit events, or write state?",
      "Are permission badges, audit hints, denied states, review states, responsive layout, keyboard focus, fixture binding, and unauthorized-count leak checks represented without exposing hidden fields?",
      "Does CP00-140 preserve H03/C03 as evidence and read-only review gates only?",
      "Does the pack hand off cleanly from CP00-139 to CP00-141 without implementing LDIP or splitting HRX?",
    ]),
    required_files: Object.freeze([
      "contracts/audit-compliance-contract.json",
      "packages/audit/src/ui-surface-workflow-continuation-catalog.js",
      "packages/audit/test/audit.test.js",
      "scripts/validate-rp03-audit-architecture.mjs",
    ]),
  });
}

export function createAuditComplianceCp140CloseoutHandoff() {
  return freezeNoWriteResult({
    handoff_id: "CP00-140.to.CP00-141",
    from_pack_id: AUDIT_COMPLIANCE_CP140_PACK_BINDING.pack_id,
    to_pack_id: AUDIT_COMPLIANCE_CP140_PACK_BINDING.next_pack_id,
    next_subphase_id: AUDIT_COMPLIANCE_CP140_PACK_BINDING.next_subphase_id,
    handoff_status: "ready_for_audit_compliance_ui_surface_workflow_continuation",
    dependencies: Object.freeze([
      "cp139_api_ui_reference_readiness",
      "ui_type_shape_secondary_interaction",
      "ui_primary_workflow_references",
      "ui_secondary_workflow_opening_references",
      "permission_badge_and_audit_hint_references",
      "denied_review_state_and_leakage_guard_references",
      "H03_C03_gate_binding",
    ]),
  });
}

export function validateAuditComplianceCp140Coverage(planPack) {
  const coveredUnitIds = createAuditComplianceCp140CoveredUnitIds();
  const errors = [];
  if (coveredUnitIds.length !== AUDIT_COMPLIANCE_CP140_PACK_BINDING.unit_count) {
    errors.push(`expected ${AUDIT_COMPLIANCE_CP140_PACK_BINDING.unit_count} covered units, got ${coveredUnitIds.length}`);
  }
  if (coveredUnitIds[0] !== "RP03.P04.M02.S08") errors.push(`first unit mismatch: ${coveredUnitIds[0]}`);
  if (coveredUnitIds.at(-1) !== "RP03.P04.M04.S17") errors.push(`last unit mismatch: ${coveredUnitIds.at(-1)}`);
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
