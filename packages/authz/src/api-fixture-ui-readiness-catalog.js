import {
  PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT,
} from "./api-permission-audit-binding.js";
import {
  PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT,
  createPermissionKernelCp114ApiSyntheticFixtureMatrix,
} from "./api-synthetic-fixture-set.js";

export const PERMISSION_KERNEL_CP115_PACK_BINDING = Object.freeze({
  pack_id: "CP00-115",
  planned_pack_id: "CP00-115",
  risk_class: "C",
  unit_count: 150,
  range: "RP02.P03.M06.S07-RP02.P04.M05.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-114",
  next_pack_id: "CP00-116",
  next_subphase_id: "RP02.P04.M05.S08",
});

const API_TITLES = Object.freeze([
  "Public export map",
  "Request contract",
  "Response contract",
  "Error code taxonomy",
  "Permission annotation",
  "Audit annotation",
  "Pagination or filtering contract",
  "Serialization guard",
  "Unauthorized data omission",
  "API fixture",
  "Contract test",
  "Invalid request test",
  "Denied response test",
  "Hermes API evidence",
  "Claude interface prompt",
  "Documentation example",
  "Versioning note",
  "Closeout handoff",
  "Downstream consumer note",
  "Command rerun",
]);

const UI_TITLES = Object.freeze([
  "UI surface inventory",
  "Data dependency map",
  "Loading state",
  "Empty state",
  "Denied state",
  "Review-required state",
  "Primary interaction",
  "Secondary interaction",
  "Permission badge",
  "Audit hint display",
  "Error message copy",
  "Responsive desktop layout",
  "Responsive mobile layout",
  "Keyboard/focus behavior",
  "Visual density check",
  "Synthetic fixture binding",
  "Build smoke",
  "Hermes UI evidence",
  "Claude UI leak prompt",
  "Closeout handoff",
  "State snapshot",
  "No unauthorized count leak",
]);

const CP115_API_PHASES = Object.freeze({
  "RP02.P03.M06": Object.freeze({
    start_index: 7,
    count: 14,
    micro_title: "Synthetic Fixture Set",
    phase_role: "api_synthetic_fixture_set_terminal",
  }),
  "RP02.P03.M07": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Test And Golden Case Set",
    phase_role: "api_test_golden_case_set",
  }),
  "RP02.P03.M08": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Hermes Evidence Packet",
    phase_role: "api_hermes_evidence_packet",
  }),
  "RP02.P03.M09": Object.freeze({
    start_index: 1,
    count: 8,
    micro_title: "Claude Review Packet",
    phase_role: "api_claude_review_packet",
  }),
  "RP02.P03.M10": Object.freeze({
    start_index: 1,
    count: 3,
    micro_title: "Closeout And Next Handoff",
    phase_role: "api_closeout_next_handoff",
  }),
});

const CP115_UI_PHASES = Object.freeze({
  "RP02.P04.M00": Object.freeze({
    start_index: 1,
    count: 8,
    micro_title: "Scope Inventory",
    phase_role: "ui_scope_inventory",
  }),
  "RP02.P04.M01": Object.freeze({
    start_index: 1,
    count: 8,
    micro_title: "Contract Draft",
    phase_role: "ui_contract_draft",
  }),
  "RP02.P04.M02": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Type And Shape Definition",
    phase_role: "ui_type_shape_definition",
  }),
  "RP02.P04.M03": Object.freeze({
    start_index: 1,
    count: 22,
    micro_title: "Primary Implementation Slice",
    phase_role: "ui_primary_implementation_slice",
  }),
  "RP02.P04.M04": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Secondary Workflow Slice",
    phase_role: "ui_secondary_workflow_slice",
  }),
  "RP02.P04.M05": Object.freeze({
    start_index: 1,
    count: 7,
    micro_title: "Permission And Audit Binding",
    phase_role: "ui_permission_audit_binding_opening",
  }),
});

const CP115_NO_WRITE_ATTESTATION = Object.freeze({
  accepts_real_client_data: false,
  mutates_permission_policy: false,
  writes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  acquires_locks: false,
  executes_rollback: false,
  executes_retry: false,
  executes_ai_retrieval: false,
  executes_export_download: false,
  executes_external_share: false,
  grants_human_approval: false,
  executes_claude_review: false,
  implements_ldip: false,
});

export const PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP115_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp115_api_fixture_ui_readiness_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP115_PACK_BINDING.range,
  upstream_api_synthetic_fixture_set_pack_id: PERMISSION_KERNEL_CP115_PACK_BINDING.upstream_pack_id,
  covered_unit_count: PERMISSION_KERNEL_CP115_PACK_BINDING.unit_count,
  api_fixture_terminal_unit_count: 65,
  ui_readiness_unit_count: 85,
  synthetic_only: true,
  catalog_only: true,
  metadata_only_fixture_set: true,
  ui_readiness_catalog_only: true,
  inherited_api_version: PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.version,
  no_write_attestation: CP115_NO_WRITE_ATTESTATION,
  api_fixture_terminal_surfaces: Object.freeze([
    "pagination_filtering_contract",
    "serialization_guard",
    "unauthorized_data_omission",
    "api_fixture",
    "contract_test",
    "invalid_request_test",
    "denied_response_test",
    "hermes_api_evidence",
    "claude_interface_prompt",
    "documentation_example",
    "versioning_note",
    "closeout_handoff",
    "downstream_consumer_note",
    "command_rerun_reference",
    "public_export_map",
    "request_contract",
    "response_contract",
    "error_code_taxonomy",
    "permission_annotation",
    "audit_annotation",
  ]),
  ui_readiness_surfaces: Object.freeze([
    "ui_surface_inventory",
    "data_dependency_map",
    "loading_state",
    "empty_state",
    "denied_state",
    "review_required_state",
    "primary_interaction",
    "secondary_interaction",
    "permission_badge",
    "audit_hint_display",
    "error_message_copy",
    "responsive_desktop_layout",
    "responsive_mobile_layout",
    "keyboard_focus_behavior",
    "visual_density_check",
    "synthetic_fixture_binding",
    "build_smoke",
    "hermes_ui_evidence",
    "claude_ui_leak_prompt",
    "closeout_handoff",
    "state_snapshot",
    "no_unauthorized_count_leak",
  ]),
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP115_PACK_BINDING",
    "PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT",
    "createPermissionKernelCp115ApiFixtureUiReadinessCatalog",
    "createPermissionKernelCp115CoveredUnitIds",
    "createPermissionKernelCp115ApiFixtureUiReadinessMatrix",
    "createPermissionKernelCp115ApiFixtureUiReadinessManifest",
    "createPermissionKernelCp115HermesEvidencePacket",
    "createPermissionKernelCp115ClaudeReviewPacket",
    "createPermissionKernelCp115CloseoutHandoff",
    "validatePermissionKernelCp115Coverage",
  ]),
  hidden_source_fields: PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.hidden_source_fields,
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP115_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP115_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel UI permission/audit binding from RP02.P04.M05.S08 as Risk A; keep denied/review/permission badge/audit hint surfaces synthetic-only and do not expose unauthorized counts, runtime routes, persistence, audit writes, external sharing, AI retrieval, or LDIP implementation.",
  }),
});

function unitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function phaseIdFor(microPhaseId) {
  return microPhaseId.slice(0, "RP02.P00".length);
}

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function deliverableTypeFor(title) {
  if (title === "Request contract" || title === "Response contract" || title === "Pagination or filtering contract" || title === "API fixture") {
    return "contract";
  }
  if (title === "Permission annotation" || title === "Audit annotation" || title === "Permission badge" || title === "Audit hint display") {
    return "security_audit";
  }
  if (title === "Contract test" || title === "Invalid request test" || title === "Denied response test" || title === "Build smoke") {
    return "test";
  }
  if (title === "Hermes API evidence" || title === "Hermes UI evidence") return "hermes_evidence";
  if (title === "Claude interface prompt" || title === "Review-required state" || title === "Claude UI leak prompt") return "claude_review";
  if (title === "Synthetic fixture binding") return "fixture";
  if (
    title === "UI surface inventory" ||
    title === "Loading state" ||
    title === "Empty state" ||
    title === "Denied state" ||
    title === "Primary interaction" ||
    title === "Secondary interaction" ||
    title === "Responsive desktop layout" ||
    title === "Responsive mobile layout" ||
    title === "State snapshot"
  ) {
    return "ui";
  }
  return "implementation";
}

function coverageKindFor(title, area) {
  if (title === "Pagination or filtering contract") return "pagination_filtering_contract";
  if (title === "Serialization guard") return "serialization_guard";
  if (title === "Unauthorized data omission") return "unauthorized_data_omission";
  if (title === "API fixture") return "api_fixture";
  if (title === "Contract test") return "contract_test";
  if (title === "Invalid request test") return "invalid_request_test";
  if (title === "Denied response test") return "denied_response_test";
  if (title === "Hermes API evidence") return "hermes_api_evidence";
  if (title === "Claude interface prompt") return "claude_interface_prompt";
  if (title === "Documentation example") return "documentation_example";
  if (title === "Versioning note") return "versioning_note";
  if (title === "Downstream consumer note") return "downstream_consumer_note";
  if (title === "Command rerun") return "command_rerun_reference";
  if (title === "Public export map") return "public_export_map";
  if (title === "Request contract") return "request_contract";
  if (title === "Response contract") return "response_contract";
  if (title === "Error code taxonomy") return "error_code_taxonomy";
  if (title === "Permission annotation" || title === "Permission badge") return "permission_annotation";
  if (title === "Audit annotation" || title === "Audit hint display") return "audit_annotation";
  if (title === "Review-required state") return "review_required_state";
  if (title === "No unauthorized count leak") return "no_unauthorized_count_leak";
  if (title === "Closeout handoff") return "closeout_handoff";
  return area === "permission_ui_surface_readiness" ? `ui_${slugFor(title)}` : `api_${slugFor(title)}`;
}

function requiredAssertionsFor(area, title) {
  const assertions = [
    "synthetic_only",
    "no_real_data",
    "no_permission_policy_mutation",
    "no_audit_write",
    "no_product_state_write",
    "no_external_share",
    "no_ai_retrieval",
    "ldip_not_implemented",
  ];
  if (area === "permission_api_fixture_terminal") {
    assertions.push("cp114_fixture_inherited", "unauthorized_data_omitted_before_response", "response_contract_allowlisted");
  }
  if (area === "permission_ui_surface_readiness") {
    assertions.push("ui_catalog_only", "permission_badge_metadata_only", "audit_hint_preview_only", "no_unauthorized_count_leak");
  }
  if (title.includes("Denied")) assertions.push("denied_state_does_not_expose_hidden_counts");
  if (title.includes("Review-required")) assertions.push("review_required_state_cannot_grant_approval");
  return assertions;
}

function freezeRow(row) {
  return Object.freeze({
    ...row,
    source_unit_ids: Object.freeze(row.source_unit_ids),
    required_assertions: Object.freeze(row.required_assertions),
    boundary_flags: CP115_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    catalog_only: true,
    product_state_effect: "none",
  });
}

function buildRowsFor(phases, titleSet, area) {
  const rows = [];
  for (const [microPhaseId, phase] of Object.entries(phases)) {
    for (let offset = 0; offset < phase.count; offset += 1) {
      const index = phase.start_index + offset;
      const title = titleSet[index - 1];
      rows.push(
        freezeRow({
          catalog_id: `${microPhaseId}.${slugFor(title)}`,
          pack_id: PERMISSION_KERNEL_CP115_PACK_BINDING.pack_id,
          program_id: "RP02",
          area,
          phase_id: phaseIdFor(microPhaseId),
          micro_phase_id: microPhaseId,
          micro_title: phase.micro_title,
          phase_role: phase.phase_role,
          title,
          coverage_kind: coverageKindFor(title, area),
          deliverable_type: deliverableTypeFor(title),
          source_unit_ids: [unitIdFor(microPhaseId, index)],
          required_assertions: requiredAssertionsFor(area, title),
        }),
      );
    }
  }
  return rows;
}

export function createPermissionKernelCp115ApiFixtureUiReadinessCatalog() {
  return Object.freeze([
    ...buildRowsFor(CP115_API_PHASES, API_TITLES, "permission_api_fixture_terminal"),
    ...buildRowsFor(CP115_UI_PHASES, UI_TITLES, "permission_ui_surface_readiness"),
  ]);
}

export function createPermissionKernelCp115CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp115ApiFixtureUiReadinessCatalog().flatMap((item) => item.source_unit_ids));
}

function freezeUiState(state) {
  return Object.freeze({
    ...state,
    synthetic_only: true,
    no_real_data: true,
    catalog_only: true,
    unauthorized_count_exposed: false,
    hidden_field_names_exposed: false,
    audit_hint_preview_only: true,
    writes_product_state: false,
    writes_audit_event: false,
    creates_database_rows: false,
    persists_idempotency_keys: false,
    acquires_locks: false,
    executes_export_download: false,
    executes_external_share: false,
    executes_ai_retrieval: false,
    grants_human_approval: false,
  });
}

export function createPermissionKernelCp115ApiFixtureUiReadinessMatrix() {
  const apiFixtureMatrix = createPermissionKernelCp114ApiSyntheticFixtureMatrix();
  const uiStates = Object.freeze([
    freezeUiState({ state_id: "loading_state", label: "Loading", permission_effect: "pending_reference", source: "RP02.P04.M00.S03" }),
    freezeUiState({ state_id: "empty_state", label: "Empty", permission_effect: "none", source: "RP02.P04.M00.S04" }),
    freezeUiState({ state_id: "denied_state", label: "Denied", permission_effect: "deny", source: "RP02.P04.M00.S05" }),
    freezeUiState({ state_id: "review_required_state", label: "Review required", permission_effect: "review_required", source: "RP02.P04.M00.S06" }),
    freezeUiState({ state_id: "primary_interaction", label: "Primary action", permission_effect: "allow_reference", source: "RP02.P04.M00.S07" }),
    freezeUiState({ state_id: "secondary_interaction", label: "Secondary action", permission_effect: "allow_reference", source: "RP02.P04.M00.S08" }),
    freezeUiState({ state_id: "permission_badge", label: "Permission badge", permission_effect: "metadata_only", source: "RP02.P04.M02.S09" }),
    freezeUiState({ state_id: "audit_hint_display", label: "Audit hint", permission_effect: "metadata_only", source: "RP02.P04.M02.S10" }),
    freezeUiState({ state_id: "responsive_desktop_layout", label: "Desktop", permission_effect: "layout_only", source: "RP02.P04.M02.S12" }),
    freezeUiState({ state_id: "responsive_mobile_layout", label: "Mobile", permission_effect: "layout_only", source: "RP02.P04.M02.S13" }),
    freezeUiState({ state_id: "keyboard_focus_behavior", label: "Keyboard focus", permission_effect: "navigation_only", source: "RP02.P04.M02.S14" }),
    freezeUiState({ state_id: "state_snapshot", label: "State snapshot", permission_effect: "metadata_only", source: "RP02.P04.M03.S21" }),
    freezeUiState({ state_id: "no_unauthorized_count_leak", label: "No unauthorized count leak", permission_effect: "redacted", source: "RP02.P04.M03.S22" }),
  ]);
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP115_PACK_BINDING.pack_id,
    api_fixture_matrix: apiFixtureMatrix,
    api_fixture_surface_count: apiFixtureMatrix.fixture_surface_count,
    ui_state_count: uiStates.length,
    ui_states: uiStates,
    inherited_api_version: PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.version,
    hidden_source_fields: PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT.hidden_source_fields,
    no_write_attestation: CP115_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp115ApiFixtureUiReadinessManifest() {
  const rows = createPermissionKernelCp115ApiFixtureUiReadinessCatalog();
  const unitIds = createPermissionKernelCp115CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const areaCounts = rows.reduce((counts, row) => {
    counts[row.area] = (counts[row.area] ?? 0) + 1;
    return counts;
  }, {});
  const phaseCounts = rows.reduce((counts, row) => {
    counts[row.micro_phase_id] = (counts[row.micro_phase_id] ?? 0) + 1;
    return counts;
  }, {});
  const matrix = createPermissionKernelCp115ApiFixtureUiReadinessMatrix();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP115_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp115_api_fixture_ui_readiness_manifest",
    source_unit_range: PERMISSION_KERNEL_CP115_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: new Set(rows.map((row) => row.micro_phase_id)).size,
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    deliverable_counts: Object.freeze(deliverableCounts),
    api_fixture_surface_count: matrix.api_fixture_surface_count,
    ui_state_count: matrix.ui_state_count,
    synthetic_only: true,
    no_real_data: true,
    catalog_only: true,
    ui_readiness_catalog_only: true,
    no_write_attestation: CP115_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP115_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP115_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp115HermesEvidencePacket() {
  const manifest = createPermissionKernelCp115ApiFixtureUiReadinessManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP115_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp115_api_fixture_ui_readiness_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-115",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp115ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP115_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp115_api_fixture_ui_readiness_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-115 closes the planned Risk C RP02 API fixture terminal, golden-case/evidence/review packet, closeout handoff, and UI readiness catalog units with metadata-only CP114 fixture inheritance, no unauthorized count or hidden field leakage, denied/review UI states, permission badge/audit hint catalog surfaces, no runtime UI implementation, no permission/audit/product/database writes, no external share/export/AI/LDIP implementation, HRX embedded-only boundary, and handoff to CP00-116/RP02.P04.M05.S08.",
  });
}

export function createPermissionKernelCp115CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP115_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP115_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP115_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP115_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp115Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp115ApiFixtureUiReadinessCatalog();
  const unitIds = createPermissionKernelCp115CoveredUnitIds();
  const manifest = createPermissionKernelCp115ApiFixtureUiReadinessManifest();
  const matrix = createPermissionKernelCp115ApiFixtureUiReadinessMatrix();
  const handoff = createPermissionKernelCp115CloseoutHandoff();

  if (rows.length !== PERMISSION_KERNEL_CP115_PACK_BINDING.unit_count) errors.push("CP00-115 row count must be 150");
  if (unitIds.length !== PERMISSION_KERNEL_CP115_PACK_BINDING.unit_count) errors.push("CP00-115 covered unit count must be 150");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-115 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P03.M06.S07") errors.push("CP00-115 first unit must be RP02.P03.M06.S07");
  if (unitIds.at(-1) !== "RP02.P04.M05.S07") errors.push("CP00-115 last unit must be RP02.P04.M05.S07");
  if (manifest.area_counts.permission_api_fixture_terminal !== 65) errors.push("CP00-115 API terminal area count must be 65");
  if (manifest.area_counts.permission_ui_surface_readiness !== 85) errors.push("CP00-115 UI readiness area count must be 85");
  if (manifest.covered_micro_phase_count !== 11) errors.push("CP00-115 must cover 11 micro phases");
  if (manifest.deliverable_counts.implementation !== 48) errors.push("CP00-115 implementation deliverable count must be 48");
  if (manifest.deliverable_counts.contract !== 15) errors.push("CP00-115 contract deliverable count must be 15");
  if (manifest.deliverable_counts.security_audit !== 12) errors.push("CP00-115 security_audit deliverable count must be 12");
  if (manifest.deliverable_counts.test !== 12) errors.push("CP00-115 test deliverable count must be 12");
  if (manifest.deliverable_counts.hermes_evidence !== 6) errors.push("CP00-115 hermes_evidence deliverable count must be 6");
  if (manifest.deliverable_counts.claude_review !== 12) errors.push("CP00-115 claude_review deliverable count must be 12");
  if (manifest.deliverable_counts.ui !== 42) errors.push("CP00-115 ui deliverable count must be 42");
  if (manifest.deliverable_counts.fixture !== 3) errors.push("CP00-115 fixture deliverable count must be 3");
  if (matrix.api_fixture_surface_count !== 4) errors.push("CP00-115 must inherit 4 CP114 API fixture surfaces");
  if (matrix.ui_state_count !== 13) errors.push("CP00-115 must define 13 UI readiness states");
  if (!matrix.ui_states.some((state) => state.state_id === "denied_state" && state.permission_effect === "deny")) {
    errors.push("CP00-115 UI matrix must include denied state");
  }
  if (!matrix.ui_states.some((state) => state.state_id === "review_required_state" && state.permission_effect === "review_required")) {
    errors.push("CP00-115 UI matrix must include review-required state");
  }
  if (!matrix.ui_states.some((state) => state.state_id === "no_unauthorized_count_leak" && state.unauthorized_count_exposed === false)) {
    errors.push("CP00-115 UI matrix must include no unauthorized count leak state");
  }
  for (const row of rows) {
    if (row.boundary_flags !== CP115_NO_WRITE_ATTESTATION) errors.push(`${row.catalog_id} must share no-write attestation`);
    if (!row.synthetic_only || !row.no_real_data || !row.catalog_only) errors.push(`${row.catalog_id} must stay synthetic catalog-only`);
  }
  for (const surface of matrix.api_fixture_matrix.surfaces) {
    if (
      surface.mutates_permission_policy ||
      surface.writes_product_state ||
      surface.writes_audit_event ||
      surface.creates_database_rows ||
      surface.persists_idempotency_keys ||
      surface.acquires_locks ||
      surface.executes_export_download ||
      surface.executes_external_share ||
      surface.executes_ai_retrieval
    ) {
      errors.push(`CP00-115 inherited API surface ${surface.fixture_surface_id} must remain no-write`);
    }
  }
  for (const state of matrix.ui_states) {
    if (
      state.unauthorized_count_exposed ||
      state.hidden_field_names_exposed ||
      state.writes_product_state ||
      state.writes_audit_event ||
      state.creates_database_rows ||
      state.persists_idempotency_keys ||
      state.acquires_locks ||
      state.executes_export_download ||
      state.executes_external_share ||
      state.executes_ai_retrieval ||
      state.grants_human_approval
    ) {
      errors.push(`CP00-115 UI state ${state.state_id} must remain metadata-only and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-116" || handoff.next_subphase_id !== "RP02.P04.M05.S08") {
    errors.push("CP00-115 must hand off to CP00-116 / RP02.P04.M05.S08");
  }

  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    covered_unit_count: unitIds.length,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    next_pack_id: handoff.next_pack_id,
    next_subphase_id: handoff.next_subphase_id,
  });
}
