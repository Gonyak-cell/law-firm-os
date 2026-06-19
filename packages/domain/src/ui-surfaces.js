import { createCoreDomainSyntheticFixtureSet } from "./fixtures.js";

export const CORE_DOMAIN_UI_PACK_BINDING = Object.freeze({
  pack_id: "CP00-098",
  planned_pack_id: "CP00-098",
  risk_class: "B",
  unit_count: 40,
  range: "RP01.P04.M02.S04-RP01.P04.M05.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
});

export const CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING = Object.freeze({
  pack_id: "CP00-099",
  planned_pack_id: "CP00-099",
  risk_class: "A",
  unit_count: 10,
  range: "RP01.P04.M05.S05-RP01.P04.M05.S14",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_ui_pack_id: "CP00-098",
});

export const CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING = Object.freeze({
  pack_id: "CP00-100",
  planned_pack_id: "CP00-100",
  risk_class: "A",
  unit_count: 10,
  range: "RP01.P04.M05.S15-RP01.P04.M06.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_permission_audit_pack_id: "CP00-099",
});

export const CORE_DOMAIN_UI_STATE_CONTRACT = Object.freeze({
  pack_id: "CP00-098",
  contract_id: "core_domain_ui_state_contract",
  source_unit_range: "RP01.P04.M02.S04-RP01.P04.M05.S04",
  accepts_real_client_data: false,
  evaluates_runtime_permission: false,
  writes_audit_event: false,
  writes_product_state: false,
  states: Object.freeze(["loading", "empty", "denied", "review_required", "ready", "error"]),
  state_matrix_required_states: Object.freeze(["loading", "empty", "denied", "review_required", "ready"]),
  responsive_modes: Object.freeze(["desktop_dense", "mobile_single_column"]),
});

export const CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT = Object.freeze({
  pack_id: "CP00-099",
  contract_id: "core_domain_permission_audit_binding_contract",
  source_unit_range: "RP01.P04.M05.S05-RP01.P04.M05.S14",
  surface_id: "permission_audit_binding_panel",
  upstream_ui_state_contract_id: CORE_DOMAIN_UI_STATE_CONTRACT.contract_id,
  accepts_real_client_data: false,
  evaluates_runtime_permission: false,
  writes_audit_event: false,
  writes_product_state: false,
  states: Object.freeze(["denied", "review_required"]),
  responsive_modes: Object.freeze(["desktop_dense", "mobile_single_column"]),
  required_actions: Object.freeze(["inspect_permission_badge", "open_review_reference", "inspect_audit_hint"]),
  permission_badge_policy: "reference_only_never_evaluated",
  audit_hint_policy: "display_only_never_written",
  keyboard_policy: "tab_order_must_reach_permission_badge_before_audit_hint",
  forbidden_claims: Object.freeze([
    "runtime_permission_evaluated",
    "audit_event_written",
    "product_state_mutated",
    "real_client_data_loaded",
    "ldip_implemented",
  ]),
});

export const CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT = Object.freeze({
  pack_id: "CP00-100",
  contract_id: "core_domain_permission_audit_fixture_contract",
  source_unit_range: "RP01.P04.M05.S15-RP01.P04.M06.S04",
  surface_id: "permission_audit_synthetic_fixture_panel",
  source_micro_phase_id: "RP01.P04.M06",
  upstream_permission_audit_contract_id: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.contract_id,
  accepts_real_client_data: false,
  evaluates_runtime_permission: false,
  writes_audit_event: false,
  writes_product_state: false,
  states: Object.freeze(["loading", "empty"]),
  responsive_modes: Object.freeze(["desktop_dense", "mobile_single_column"]),
  data_dependencies: Object.freeze(["Tenant", "Matter", "DocumentReference", "PermissionReference", "AuditEventReference"]),
  fixture_policy: "synthetic_fixture_only",
  visual_density_policy: "compact_operational_console",
  hermes_evidence_policy: "command_evidence_only_no_runtime_side_effects",
  forbidden_claims: Object.freeze([
    "runtime_permission_evaluated",
    "audit_event_written",
    "product_state_mutated",
    "real_client_data_loaded",
    "ldip_implemented",
  ]),
});

export const CORE_DOMAIN_UI_SURFACES = Object.freeze({
  core_domain_entity_directory: Object.freeze({
    label: "Core domain entity directory",
    source_micro_phase_id: "RP01.P04.M03",
    data_dependencies: Object.freeze(["Entity", "Person", "Organization", "Client"]),
    primary_interaction: "select_entity",
    secondary_interaction: "open_related_matter_trace",
    empty_state: "no_synthetic_entities_available",
    denied_state: "entity_directory_permission_reference_denied",
    review_required_state: "entity_directory_review_required",
  }),
  matter_trace_panel: Object.freeze({
    label: "Matter trace panel",
    source_micro_phase_id: "RP01.P04.M04",
    data_dependencies: Object.freeze(["Matter", "MatterMember", "MatterStatusHistory"]),
    primary_interaction: "select_matter_trace",
    secondary_interaction: "open_status_history",
    empty_state: "no_matter_trace_selected",
    denied_state: "matter_trace_permission_reference_denied",
    review_required_state: "matter_trace_review_required",
  }),
  permission_audit_binding_panel: Object.freeze({
    label: "Permission and audit binding panel",
    source_micro_phase_id: "RP01.P04.M05",
    data_dependencies: Object.freeze(["PermissionReference", "PolicyReference", "AuditEventReference"]),
    primary_interaction: "inspect_permission_reference",
    secondary_interaction: "inspect_audit_hint",
    empty_state: "no_permission_audit_binding_selected",
    denied_state: "permission_reference_denied",
    review_required_state: "permission_audit_review_required",
  }),
});

function freezeUiState(state) {
  return Object.freeze({
    ...state,
    data_dependencies: Object.freeze(state.data_dependencies ?? []),
    actions: Object.freeze(state.actions ?? []),
    layout: Object.freeze(state.layout ?? {}),
    focus_order: Object.freeze(state.focus_order ?? []),
    permission_badge: Object.freeze(state.permission_badge ?? {}),
    audit_hint: Object.freeze(state.audit_hint ?? {}),
  });
}

export function getCoreDomainUiSurface(surface_id) {
  const surface = CORE_DOMAIN_UI_SURFACES[surface_id];
  if (!surface) throw new Error(`Unknown core domain UI surface ${surface_id}`);
  return surface;
}

export function createCoreDomainPermissionBadge(effect = "allow", options = {}) {
  return Object.freeze({
    label: effect === "deny" ? "Denied" : effect === "review" ? "Review required" : "Reference only",
    effect,
    permission_id: options.permission_id ?? "perm_ui_reference",
    evaluated: false,
    writes_product_state: false,
  });
}

export function createCoreDomainAuditHintDisplay(action, options = {}) {
  return Object.freeze({
    action,
    audit_event_id: options.audit_event_id ?? null,
    display_only: true,
    writes_audit_event: false,
    writes_product_state: false,
  });
}

export function createCoreDomainUiState(surface_id, state = "ready", options = {}) {
  const surface = getCoreDomainUiSurface(surface_id);
  if (!CORE_DOMAIN_UI_STATE_CONTRACT.states.includes(state)) {
    throw new Error(`Core domain UI state must be one of ${CORE_DOMAIN_UI_STATE_CONTRACT.states.join(", ")}`);
  }
  const responsive_mode = options.responsive_mode ?? "desktop_dense";
  if (!CORE_DOMAIN_UI_STATE_CONTRACT.responsive_modes.includes(responsive_mode)) {
    throw new Error(`Core domain UI responsive_mode must be one of ${CORE_DOMAIN_UI_STATE_CONTRACT.responsive_modes.join(", ")}`);
  }
  const permissionEffect = state === "denied" ? "deny" : state === "review_required" ? "review" : "allow";
  return freezeUiState({
    pack_id: CORE_DOMAIN_UI_PACK_BINDING.pack_id,
    surface_id,
    source_micro_phase_id: surface.source_micro_phase_id,
    state,
    label: surface.label,
    data_dependencies: surface.data_dependencies,
    loading_state: "synthetic_placeholder_only",
    empty_state: surface.empty_state,
    denied_state: surface.denied_state,
    review_required_state: surface.review_required_state,
    primary_interaction: surface.primary_interaction,
    secondary_interaction: surface.secondary_interaction,
    actions:
      state === "denied"
        ? ["inspect_permission_badge"]
        : state === "review_required"
          ? ["open_review_reference", "inspect_audit_hint"]
          : [surface.primary_interaction, surface.secondary_interaction],
    permission_badge: createCoreDomainPermissionBadge(permissionEffect, options.permission_badge),
    audit_hint: createCoreDomainAuditHintDisplay(`ui.${surface_id}.${state}`, options.audit_hint),
    error_message_copy:
      state === "denied"
        ? "Access is blocked by a permission reference."
        : state === "review_required"
          ? "Review is required before this synthetic UI action can continue."
          : state === "loading"
            ? "Synthetic UI state is loading."
            : state === "error"
              ? "Synthetic UI state has a display-only error."
          : state === "empty"
            ? surface.empty_state
            : "Synthetic UI state is ready.",
    layout: {
      responsive_mode,
      density: options.density ?? "dense_scan",
      min_touch_target_px: responsive_mode === "mobile_single_column" ? 44 : 32,
      max_columns: responsive_mode === "mobile_single_column" ? 1 : 3,
    },
    focus_order: [surface.primary_interaction, surface.secondary_interaction, "inspect_permission_badge", "inspect_audit_hint"],
    keyboard_behavior: "tab_order_matches_focus_order",
    visual_density_check: "compact_operational_console",
    synthetic_only: true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
  });
}

export function createCoreDomainUiSurfaceStateMatrix() {
  return Object.freeze(
    Object.keys(CORE_DOMAIN_UI_SURFACES).flatMap((surface_id) =>
      CORE_DOMAIN_UI_STATE_CONTRACT.state_matrix_required_states.map((state) => createCoreDomainUiState(surface_id, state)),
    ),
  );
}

export function createCoreDomainUiFixtureBinding() {
  const fixtures = createCoreDomainSyntheticFixtureSet({ request_id: "req_rp01_cp098" });
  return Object.freeze({
    pack_id: CORE_DOMAIN_UI_PACK_BINDING.pack_id,
    synthetic_only: true,
    uses_real_client_data: false,
    tenant_id: fixtures.tenant.tenant_id,
    matter_id: fixtures.matter.matter_id,
    document_id: fixtures.document.document_id,
    surface_count: Object.keys(CORE_DOMAIN_UI_SURFACES).length,
    state_count: createCoreDomainUiSurfaceStateMatrix().length,
  });
}

export function createCoreDomainHermesUiEvidencePacket() {
  const matrix = createCoreDomainUiSurfaceStateMatrix();
  return Object.freeze({
    pack_id: CORE_DOMAIN_UI_PACK_BINDING.pack_id,
    evidence_packet_id: "core_domain_cp098_hermes_ui_evidence_packet",
    hermes_gate: "H01",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    state_count: matrix.length,
    command_anchors: Object.freeze([
      "node --test packages/domain/test/*.test.js",
      "npm run rp01:core-domain:validate",
      "npm run closeout-pack:validate CP00-098",
      "npm run build",
    ]),
    no_write_attestation: Object.freeze({
      evaluates_runtime_permission: false,
      writes_audit_event: false,
      writes_product_state: false,
      creates_database_rows: false,
    }),
  });
}

export function createCoreDomainClaudeUiLeakPrompt() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_UI_PACK_BINDING.pack_id,
    review_packet_id: "core_domain_cp098_claude_ui_leak_prompt",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    focus: "Verify CP00-098 UI states do not leak unauthorized data, do not imply runtime permission approval, and do not write audit or product state.",
  });
}

export function createCoreDomainUiCloseoutHandoff() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_UI_PACK_BINDING.pack_id,
    current_range: CORE_DOMAIN_UI_PACK_BINDING.range,
    next_pack_id: "CP00-099",
    next_subphase_id: "RP01.P04.M05.S05",
    handoff_scope: "continue RP01.P04 permission/audit binding UI states from denied state onward",
    ldip_implemented: false,
    hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function createCoreDomainPermissionAuditBindingState(state = "denied", options = {}) {
  if (!CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.states.includes(state)) {
    throw new Error(
      `Core domain permission/audit binding state must be one of ${CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.states.join(", ")}`,
    );
  }
  const base = createCoreDomainUiState(CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.surface_id, state, options);
  const safeActions =
    state === "denied" ? ["inspect_permission_badge", "inspect_audit_hint"] : ["open_review_reference", "inspect_permission_badge", "inspect_audit_hint"];
  const permissionEffect = state === "denied" ? "deny" : "review";
  return freezeUiState({
    ...base,
    pack_id: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.pack_id,
    upstream_ui_pack_id: CORE_DOMAIN_UI_PACK_BINDING.pack_id,
    source_unit_range: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.range,
    risk_class: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.risk_class,
    actions: safeActions,
    primary_interaction: safeActions[0],
    secondary_interaction: safeActions.at(-1),
    permission_badge: {
      ...base.permission_badge,
      label: permissionEffect === "deny" ? "Denied" : "Review required",
      effect: permissionEffect,
      evaluated: false,
      policy: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.permission_badge_policy,
      approval_implied: false,
    },
    audit_hint: {
      ...base.audit_hint,
      display_only: true,
      writes_audit_event: false,
      policy: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.audit_hint_policy,
      ledger_event_created: false,
    },
    error_message_copy:
      state === "denied"
        ? "Access is blocked by a reference-only permission badge."
        : "Review is required; audit details are display-only until the audit kernel records an event.",
    focus_order: state === "denied" ? ["inspect_permission_badge", "inspect_audit_hint"] : ["open_review_reference", "inspect_permission_badge", "inspect_audit_hint"],
    keyboard_behavior: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.keyboard_policy,
    forbidden_claims: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.forbidden_claims,
    synthetic_only: true,
    uses_real_client_data: false,
    ldip_implemented: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    writes_product_state: false,
  });
}

export function createCoreDomainPermissionAuditBindingMatrix() {
  return Object.freeze(
    CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.responsive_modes.flatMap((responsive_mode) =>
      CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.states.map((state) =>
        createCoreDomainPermissionAuditBindingState(state, { responsive_mode }),
      ),
    ),
  );
}

export function createCoreDomainPermissionAuditBindingEvidencePacket() {
  const matrix = createCoreDomainPermissionAuditBindingMatrix();
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.pack_id,
    evidence_packet_id: "core_domain_cp099_permission_audit_binding_evidence_packet",
    hermes_gate: "H01",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    matrix_count: matrix.length,
    command_anchors: Object.freeze([
      "node --test packages/domain/test/*.test.js",
      "npm run rp01:core-domain:validate",
      "npm run closeout-pack:validate CP00-099",
      "npm run build",
    ]),
    no_write_attestation: Object.freeze({
      evaluates_runtime_permission: false,
      writes_audit_event: false,
      writes_product_state: false,
      creates_database_rows: false,
    }),
  });
}

export function createCoreDomainPermissionAuditBindingClaudePrompt() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.pack_id,
    review_packet_id: "core_domain_cp099_permission_audit_binding_claude_prompt",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    focus:
      "Verify CP00-099 permission/audit binding Risk A states are reference-only, deny/review-safe, no-write, synthetic-only, and do not imply runtime approval or audit persistence.",
  });
}

export function createCoreDomainPermissionAuditBindingCloseoutHandoff() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.pack_id,
    current_range: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.range,
    next_pack_id: "CP00-100",
    next_subphase_id: "RP01.P04.M05.S15",
    handoff_scope: "continue RP01.P04.M05 permission/audit binding from visual density through fixture/test/evidence units",
    ldip_implemented: false,
    hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function createCoreDomainPermissionAuditFixtureBinding(overrides = {}) {
  const fixtures = createCoreDomainSyntheticFixtureSet({
    request_id: overrides.request_id ?? "req_rp01_cp100",
    permission_id: overrides.permission_id ?? "perm_rp01_cp100_reference",
    audit_event_id: overrides.audit_event_id ?? "audit_ref_rp01_cp100_display",
    permission_effect: overrides.permission_effect,
  });
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.pack_id,
    upstream_permission_audit_pack_id: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.pack_id,
    synthetic_only: true,
    uses_real_client_data: false,
    request_id: fixtures.request.request_id,
    tenant_id: fixtures.tenant.tenant_id,
    matter_id: fixtures.matter.matter_id,
    document_id: fixtures.document.document_id,
    permission_id: fixtures.permission.permission_id,
    audit_event_id: fixtures.audit.audit_event_id,
    permission_effect_reference: fixtures.permission.effect,
    audit_display_only: true,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    writes_product_state: false,
  });
}

export function createCoreDomainPermissionAuditFixtureState(state = "loading", options = {}) {
  if (!CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.states.includes(state)) {
    throw new Error(`Core domain permission/audit fixture state must be one of ${CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.states.join(", ")}`);
  }
  const responsive_mode = options.responsive_mode ?? "desktop_dense";
  if (!CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.responsive_modes.includes(responsive_mode)) {
    throw new Error(
      `Core domain permission/audit fixture responsive_mode must be one of ${CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.responsive_modes.join(", ")}`,
    );
  }
  const fixture = createCoreDomainPermissionAuditFixtureBinding();
  return freezeUiState({
    pack_id: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.pack_id,
    upstream_permission_audit_pack_id: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_PACK_BINDING.pack_id,
    surface_id: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.surface_id,
    source_micro_phase_id: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.source_micro_phase_id,
    state,
    label: "Permission/audit synthetic fixture panel",
    data_dependencies: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.data_dependencies,
    loading_state: "synthetic_permission_audit_fixture_skeleton",
    empty_state: "no_permission_audit_fixture_selected",
    primary_interaction: "inspect_fixture_summary",
    secondary_interaction: state === "loading" ? null : "inspect_audit_hint",
    actions: state === "loading" ? ["inspect_fixture_summary"] : ["inspect_fixture_summary", "inspect_permission_badge", "inspect_audit_hint"],
    permission_badge: {
      label: "Reference only",
      effect: fixture.permission_effect_reference,
      permission_id: fixture.permission_id,
      evaluated: false,
      policy: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.permission_badge_policy,
      approval_implied: false,
      writes_product_state: false,
    },
    audit_hint: {
      action: "ui.permission_audit_synthetic_fixture_panel.display",
      audit_event_id: fixture.audit_event_id,
      display_only: true,
      writes_audit_event: false,
      ledger_event_created: false,
      policy: CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.audit_hint_policy,
      writes_product_state: false,
    },
    error_message_copy:
      state === "loading"
        ? "Synthetic permission and audit fixture metadata is loading."
        : "No synthetic permission and audit fixture is selected.",
    layout: {
      responsive_mode,
      density: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.visual_density_policy,
      min_touch_target_px: responsive_mode === "mobile_single_column" ? 44 : 32,
      max_columns: responsive_mode === "mobile_single_column" ? 1 : 3,
      max_visible_rows: responsive_mode === "mobile_single_column" ? 4 : 8,
    },
    focus_order:
      state === "loading"
        ? ["inspect_fixture_summary"]
        : ["inspect_fixture_summary", "inspect_permission_badge", "inspect_audit_hint"],
    keyboard_behavior: "tab_order_matches_visible_fixture_actions",
    visual_density_check: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.visual_density_policy,
    synthetic_only: true,
    uses_real_client_data: false,
    ldip_implemented: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    writes_product_state: false,
  });
}

export function createCoreDomainPermissionAuditFixtureStateMatrix() {
  return Object.freeze(
    CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.responsive_modes.flatMap((responsive_mode) =>
      CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.states.map((state) =>
        createCoreDomainPermissionAuditFixtureState(state, { responsive_mode }),
      ),
    ),
  );
}

export function createCoreDomainPermissionAuditVisualDensityReport() {
  const matrix = createCoreDomainPermissionAuditFixtureStateMatrix();
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.pack_id,
    density_policy: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.visual_density_policy,
    matrix_count: matrix.length,
    desktop_max_columns: 3,
    mobile_max_columns: 1,
    mobile_min_touch_target_px: 44,
    focus_order_matches_actions: matrix.every((item) => item.actions.every((action) => item.focus_order.includes(action))),
    no_layout_claims_write_state: matrix.every((item) => item.writes_product_state === false),
  });
}

export function createCoreDomainPermissionAuditFixtureEvidencePacket() {
  const fixture = createCoreDomainPermissionAuditFixtureBinding();
  const density = createCoreDomainPermissionAuditVisualDensityReport();
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.pack_id,
    evidence_packet_id: "core_domain_cp100_permission_audit_fixture_evidence_packet",
    hermes_gate: "H01",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    fixture_id: fixture.request_id,
    matrix_count: density.matrix_count,
    command_anchors: Object.freeze([
      "node --test packages/domain/test/*.test.js",
      "npm run rp01:core-domain:validate",
      "npm run closeout-pack:validate CP00-100",
      "npm run build",
    ]),
    no_write_attestation: Object.freeze({
      evaluates_runtime_permission: false,
      writes_audit_event: false,
      writes_product_state: false,
      creates_database_rows: false,
    }),
  });
}

export function createCoreDomainPermissionAuditFixtureClaudePrompt() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.pack_id,
    review_packet_id: "core_domain_cp100_permission_audit_fixture_claude_prompt",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    focus:
      "Verify CP00-100 permission/audit fixture and visual-density evidence are synthetic-only, no-write, reference-only, and do not imply permission approval, audit persistence, product mutation, real data use, or LDIP implementation.",
  });
}

export function createCoreDomainPermissionAuditFixtureCloseoutHandoff() {
  return Object.freeze({
    pack_id: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.pack_id,
    current_range: CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_PACK_BINDING.range,
    next_pack_id: "CP00-101",
    next_subphase_id: "RP01.P04.M06.S05",
    handoff_scope: "continue RP01.P04.M06 synthetic fixture set from denied state through interaction, evidence, review, and handoff units",
    ldip_implemented: false,
    hrx_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validateCoreDomainCp100Coverage() {
  const fixture = createCoreDomainPermissionAuditFixtureBinding();
  const matrix = createCoreDomainPermissionAuditFixtureStateMatrix();
  const density = createCoreDomainPermissionAuditVisualDensityReport();
  const evidence = createCoreDomainPermissionAuditFixtureEvidencePacket();
  const review = createCoreDomainPermissionAuditFixtureClaudePrompt();
  const handoff = createCoreDomainPermissionAuditFixtureCloseoutHandoff();
  const errors = [];
  if (matrix.length !== 4) errors.push("permission/audit fixture matrix must cover two states across two responsive modes");
  if (fixture.uses_real_client_data !== false || fixture.synthetic_only !== true) errors.push("fixture binding must remain synthetic-only");
  if (density.focus_order_matches_actions !== true || density.no_layout_claims_write_state !== true) {
    errors.push("visual density report must match visible actions and remain no-write");
  }
  for (const item of matrix) {
    if (item.surface_id !== CORE_DOMAIN_PERMISSION_AUDIT_FIXTURE_CONTRACT.surface_id) errors.push("fixture surface mismatch");
    if (item.permission_badge.evaluated !== false || item.permission_badge.approval_implied !== false) {
      errors.push("fixture permission badge must not evaluate permission or imply approval");
    }
    if (item.audit_hint.display_only !== true || item.audit_hint.writes_audit_event !== false || item.audit_hint.ledger_event_created !== false) {
      errors.push("fixture audit hint must remain display-only");
    }
    if (item.evaluates_runtime_permission !== false || item.writes_audit_event !== false || item.writes_product_state !== false) {
      errors.push("fixture state must remain no-write and non-runtime");
    }
    if (item.uses_real_client_data !== false || item.ldip_implemented !== false) {
      errors.push("fixture state must remain synthetic and LDIP-free");
    }
  }
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    matrix_count: matrix.length,
    density_policy: density.density_policy,
    evidence_packet_id: evidence.evidence_packet_id,
    review_packet_id: review.review_packet_id,
    next_subphase_id: handoff.next_subphase_id,
  });
}

export function validateCoreDomainCp099Coverage() {
  const matrix = createCoreDomainPermissionAuditBindingMatrix();
  const registeredSurface = getCoreDomainUiSurface(CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.surface_id);
  const evidence = createCoreDomainPermissionAuditBindingEvidencePacket();
  const review = createCoreDomainPermissionAuditBindingClaudePrompt();
  const handoff = createCoreDomainPermissionAuditBindingCloseoutHandoff();
  const errors = [];
  if (registeredSurface.source_micro_phase_id !== "RP01.P04.M05") errors.push("permission/audit binding surface must be registered to RP01.P04.M05");
  if (matrix.length !== 4) errors.push("permission/audit binding matrix must cover two states across two responsive modes");
  for (const item of matrix) {
    if (item.surface_id !== CORE_DOMAIN_PERMISSION_AUDIT_BINDING_CONTRACT.surface_id) errors.push("matrix item surface mismatch");
    if (item.permission_badge.evaluated !== false || item.permission_badge.approval_implied !== false) {
      errors.push("permission badge must remain reference-only and never imply approval");
    }
    if (item.audit_hint.display_only !== true || item.audit_hint.writes_audit_event !== false || item.audit_hint.ledger_event_created !== false) {
      errors.push("audit hint must remain display-only and never create ledger events");
    }
    if (!item.actions.every((action) => item.focus_order.includes(action))) {
      errors.push("focus order must include every available state action");
    }
    if (item.state === "denied" && item.focus_order.includes("open_review_reference")) {
      errors.push("denied state must not expose an unavailable review focus stop");
    }
    if (!item.focus_order.includes("inspect_permission_badge") || !item.focus_order.includes("inspect_audit_hint")) {
      errors.push("focus order must include permission badge and audit hint");
    }
    if (item.evaluates_runtime_permission !== false || item.writes_audit_event !== false || item.writes_product_state !== false) {
      errors.push("permission/audit binding state must remain no-write and non-runtime");
    }
    if (item.uses_real_client_data !== false || item.ldip_implemented !== false) {
      errors.push("permission/audit binding state must remain synthetic and LDIP-free");
    }
  }
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    matrix_count: matrix.length,
    evidence_packet_id: evidence.evidence_packet_id,
    review_packet_id: review.review_packet_id,
    next_subphase_id: handoff.next_subphase_id,
  });
}

export function validateCoreDomainCp098Coverage() {
  const matrix = createCoreDomainUiSurfaceStateMatrix();
  const fixture = createCoreDomainUiFixtureBinding();
  const evidence = createCoreDomainHermesUiEvidencePacket();
  const review = createCoreDomainClaudeUiLeakPrompt();
  const handoff = createCoreDomainUiCloseoutHandoff();
  const errors = [];
  const states = new Set(matrix.map((item) => item.state));
  for (const required of CORE_DOMAIN_UI_STATE_CONTRACT.state_matrix_required_states) {
    if (!states.has(required)) errors.push(`missing UI state ${required}`);
  }
  if (matrix.some((item) => item.writes_product_state !== false)) errors.push("UI states must not write product state");
  if (matrix.some((item) => item.evaluates_runtime_permission !== false || item.permission_badge.evaluated !== false)) {
    errors.push("UI states must not evaluate runtime permission");
  }
  if (matrix.some((item) => item.writes_audit_event !== false || item.audit_hint.writes_audit_event !== false)) {
    errors.push("UI states must not write audit events");
  }
  if (matrix.some((item) => !item.focus_order.includes("inspect_permission_badge"))) errors.push("UI focus order must include permission badge");
  if (fixture.uses_real_client_data !== false) errors.push("UI fixture must be synthetic-only");
  return Object.freeze({
    valid: errors.length === 0,
    errors: Object.freeze(errors),
    state_count: matrix.length,
    surface_count: Object.keys(CORE_DOMAIN_UI_SURFACES).length,
    evidence_packet_id: evidence.evidence_packet_id,
    review_packet_id: review.review_packet_id,
    next_subphase_id: handoff.next_subphase_id,
  });
}
