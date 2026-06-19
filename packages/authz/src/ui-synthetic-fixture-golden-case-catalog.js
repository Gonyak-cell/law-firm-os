import {
  PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT,
  createPermissionKernelCp117UiStateSnapshotMatrix,
} from "./ui-evidence-state-snapshot.js";

export const PERMISSION_KERNEL_CP118_PACK_BINDING = Object.freeze({
  pack_id: "CP00-118",
  planned_pack_id: "CP00-118",
  risk_class: "C",
  unit_count: 150,
  range: "RP02.P04.M06.S06-RP02.P05.M04.S07",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-117",
  next_pack_id: "CP00-119",
  next_subphase_id: "RP02.P05.M04.S08",
});

const UI_TERMINAL_TITLES = Object.freeze([
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

const FIXTURE_GOLDEN_TITLES = Object.freeze([
  "Base tenant fixture",
  "Base user fixture",
  "Base matter fixture",
  "Base document fixture",
  "Primary golden case",
  "Secondary golden case",
  "Review-required case",
  "Denied case",
  "Cross-tenant case",
  "Missing context case",
  "Audit hint case",
  "Security trimming case",
  "AI retrieval or analytics case",
  "Fixture manifest",
  "Golden test",
  "Failure test",
  "Hermes fixture evidence",
  "Claude missing-test prompt",
  "Closeout handoff",
  "No-real-data check",
  "Stable ID check",
  "Replay command",
]);

const CP118_UI_PHASES = Object.freeze({
  "RP02.P04.M06": Object.freeze({
    start_index: 6,
    count: 15,
    micro_title: "Synthetic Fixture Set",
    phase_role: "ui_synthetic_fixture_set_terminal",
  }),
  "RP02.P04.M07": Object.freeze({
    start_index: 1,
    count: 22,
    micro_title: "Test And Golden Case Set",
    phase_role: "ui_test_golden_case_set",
  }),
  "RP02.P04.M08": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Hermes Evidence Packet",
    phase_role: "ui_hermes_evidence_packet",
  }),
  "RP02.P04.M09": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Claude Review Packet",
    phase_role: "ui_claude_review_packet",
  }),
  "RP02.P04.M10": Object.freeze({
    start_index: 1,
    count: 8,
    micro_title: "Closeout And Next Handoff",
    phase_role: "ui_closeout_next_handoff",
  }),
});

const CP118_FIXTURE_PHASES = Object.freeze({
  "RP02.P05.M00": Object.freeze({
    start_index: 1,
    count: 8,
    micro_title: "Scope Inventory",
    phase_role: "fixture_scope_inventory",
  }),
  "RP02.P05.M01": Object.freeze({
    start_index: 1,
    count: 8,
    micro_title: "Contract Draft",
    phase_role: "fixture_contract_draft",
  }),
  "RP02.P05.M02": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Type And Shape Definition",
    phase_role: "fixture_type_shape_definition",
  }),
  "RP02.P05.M03": Object.freeze({
    start_index: 1,
    count: 22,
    micro_title: "Primary Implementation Slice",
    phase_role: "fixture_primary_implementation_slice",
  }),
  "RP02.P05.M04": Object.freeze({
    start_index: 1,
    count: 7,
    micro_title: "Secondary Workflow Slice",
    phase_role: "fixture_secondary_workflow_slice_opening",
  }),
});

const CP118_NO_WRITE_ATTESTATION = Object.freeze({
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
  executes_analytics_query: false,
  executes_export_download: false,
  executes_external_share: false,
  grants_human_approval: false,
  executes_claude_review: false,
  implements_ldip: false,
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function deliverableTypeFor(title) {
  if (title === "Claude missing-test prompt") return "test";
  if (title === "Build smoke") return "test";
  if (title.includes("Hermes")) return "hermes_evidence";
  if (title.includes("Claude") || title === "Review-required state" || title === "Review-required case") return "claude_review";
  if (
    title.includes("fixture") ||
    title.includes("Fixture") ||
    title.includes("golden case") ||
    title === "Primary golden case" ||
    title === "Secondary golden case"
  ) {
    return "fixture";
  }
  if (title.includes("test") || title.includes("Test")) return "test";
  if (["Permission badge", "Audit hint display", "Audit hint case", "Security trimming case"].includes(title)) return "security_audit";
  if (
    [
      "UI surface inventory",
      "Loading state",
      "Empty state",
      "Denied state",
      "Primary interaction",
      "Secondary interaction",
      "Responsive desktop layout",
      "Responsive mobile layout",
      "State snapshot",
    ].includes(title)
  ) {
    return "ui";
  }
  return "implementation";
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function freezeCatalogRow({ microPhaseId, phase, title, index, area }) {
  return Object.freeze({
    catalog_id: `${microPhaseId}.${slugFor(title)}`,
    pack_id: PERMISSION_KERNEL_CP118_PACK_BINDING.pack_id,
    program_id: "RP02",
    area,
    phase_id: microPhaseId.split(".").slice(0, 2).join("."),
    micro_phase_id: microPhaseId,
    micro_title: phase.micro_title,
    phase_role: phase.phase_role,
    title,
    coverage_kind: slugFor(title),
    deliverable_type: deliverableTypeFor(title),
    source_unit_ids: Object.freeze([sourceUnitIdFor(microPhaseId, index)]),
    required_assertions: Object.freeze([
      "synthetic_only",
      "catalog_only",
      "metadata_only_fixture_set",
      "no_real_data",
      "no_runtime_ui_route",
      "hidden_source_fields_not_exposed",
      "unauthorized_count_not_exposed",
      "no_permission_policy_mutation",
      "no_audit_write",
      "no_product_state_write",
      "no_export_or_external_share",
      "no_ai_or_analytics_execution",
    ]),
    boundary_flags: CP118_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    catalog_only: true,
    product_state_effect: "none",
  });
}

function buildRowsFromPhases(phaseMap, titleList, area) {
  const rows = [];
  for (const [microPhaseId, phase] of Object.entries(phaseMap)) {
    for (let offset = 0; offset < phase.count; offset += 1) {
      const index = phase.start_index + offset;
      rows.push(
        freezeCatalogRow({
          microPhaseId,
          phase,
          title: titleList[index - 1],
          index,
          area,
        }),
      );
    }
  }
  return rows;
}

export const PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP118_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp118_ui_synthetic_fixture_golden_case_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP118_PACK_BINDING.range,
  upstream_ui_evidence_state_snapshot_pack_id: PERMISSION_KERNEL_CP118_PACK_BINDING.upstream_pack_id,
  covered_unit_count: PERMISSION_KERNEL_CP118_PACK_BINDING.unit_count,
  ui_terminal_unit_count: 85,
  fixture_golden_case_unit_count: 65,
  synthetic_only: true,
  catalog_only: true,
  metadata_only_fixture_set: true,
  ui_runtime_route_added: false,
  inherited_ui_evidence_state_snapshot_contract_id:
    PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.contract_id,
  no_write_attestation: CP118_NO_WRITE_ATTESTATION,
  ui_terminal_surfaces: UI_TERMINAL_TITLES,
  fixture_golden_case_surfaces: FIXTURE_GOLDEN_TITLES,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP118_PACK_BINDING",
    "PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT",
    "createPermissionKernelCp118UiSyntheticFixtureGoldenCaseCatalog",
    "createPermissionKernelCp118CoveredUnitIds",
    "createPermissionKernelCp118UiSyntheticFixtureMatrix",
    "createPermissionKernelCp118UiSyntheticFixtureGoldenCaseManifest",
    "createPermissionKernelCp118HermesEvidencePacket",
    "createPermissionKernelCp118ClaudeReviewPacket",
    "createPermissionKernelCp118CloseoutHandoff",
    "validatePermissionKernelCp118Coverage",
  ]),
  hidden_source_fields: PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.hidden_source_fields,
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP118_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP118_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel fixture/golden cases at RP02.P05.M04.S08 as Risk B; close denied, cross-tenant, missing-context, audit-hint, security-trimming, AI/analytics blocked, fixture manifest, golden/failure test, Hermes fixture evidence, Claude missing-test prompt, handoff, no-real-data, stable-id, replay, and workflow surfaces without product-state writes.",
  }),
});

export function createPermissionKernelCp118UiSyntheticFixtureGoldenCaseCatalog() {
  return Object.freeze([
    ...buildRowsFromPhases(CP118_UI_PHASES, UI_TERMINAL_TITLES, "permission_ui_terminal_fixture_catalog"),
    ...buildRowsFromPhases(CP118_FIXTURE_PHASES, FIXTURE_GOLDEN_TITLES, "permission_fixture_golden_case_opening"),
  ]);
}

export function createPermissionKernelCp118CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp118UiSyntheticFixtureGoldenCaseCatalog().flatMap((item) => item.source_unit_ids));
}

function freezeFixtureProfile(profile) {
  return Object.freeze({
    ...profile,
    synthetic_only: true,
    no_real_data: true,
    metadata_only_fixture_set: true,
    writes_product_state: false,
    writes_audit_event: false,
    mutates_permission_policy: false,
    creates_database_rows: false,
    persists_idempotency_keys: false,
    acquires_locks: false,
    executes_export_download: false,
    executes_external_share: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    grants_human_approval: false,
    unauthorized_count_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP118_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp118UiSyntheticFixtureMatrix() {
  const inheritedMatrix = createPermissionKernelCp117UiStateSnapshotMatrix();
  const uiTerminalSurfaces = Object.freeze(
    UI_TERMINAL_TITLES.map((title) =>
      freezeFixtureProfile({
        surface_id: slugFor(title),
        source: "cp118_ui_terminal_surface",
        title,
        inherited_snapshot_count: inheritedMatrix.state_count,
        permission_badge_grants_access: false,
        audit_hint_preview_only: true,
        runtime_ui_route_added: false,
      }),
    ),
  );
  const goldenCases = Object.freeze([
    freezeFixtureProfile({ case_id: "primary_golden_case", expected_effect: "allow_reference", fixture_kind: "golden" }),
    freezeFixtureProfile({ case_id: "secondary_golden_case", expected_effect: "allow_reference", fixture_kind: "golden" }),
    freezeFixtureProfile({ case_id: "review_required_case", expected_effect: "review_required", fixture_kind: "review" }),
    freezeFixtureProfile({ case_id: "denied_case", expected_effect: "deny", fixture_kind: "denied", grants_access: false }),
    freezeFixtureProfile({ case_id: "cross_tenant_case", expected_effect: "deny", fixture_kind: "tenant_boundary", tenant_drift_blocked: true }),
    freezeFixtureProfile({ case_id: "missing_context_case", expected_effect: "deny", fixture_kind: "missing_context", missing_context_blocked: true }),
    freezeFixtureProfile({ case_id: "audit_hint_case", expected_effect: "allow_reference", fixture_kind: "audit_hint", audit_hint_preview_only: true }),
    freezeFixtureProfile({
      case_id: "security_trimming_case",
      expected_effect: "allow_reference",
      fixture_kind: "security_trimming",
      unauthorized_items_omitted: true,
    }),
    freezeFixtureProfile({
      case_id: "ai_retrieval_or_analytics_case",
      expected_effect: "blocked_reference_only",
      fixture_kind: "ai_analytics_boundary",
      executes_ai_retrieval: false,
      executes_analytics_query: false,
    }),
  ]);
  const baseFixtures = Object.freeze(
    ["tenant", "user", "matter", "document"].map((fixture) =>
      freezeFixtureProfile({
        fixture_id: `base_${fixture}_fixture`,
        fixture,
        stable_id: `cp118_${fixture}_synthetic`,
        source: "cp118_base_fixture",
      }),
    ),
  );
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP118_PACK_BINDING.pack_id,
    inherited_pack_id: "CP00-117",
    inherited_state_count: inheritedMatrix.state_count,
    ui_terminal_surface_count: uiTerminalSurfaces.length,
    golden_case_count: goldenCases.length,
    base_fixture_count: baseFixtures.length,
    ui_terminal_surfaces: uiTerminalSurfaces,
    golden_cases: goldenCases,
    base_fixtures: baseFixtures,
    hidden_source_fields: PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT.hidden_source_fields,
    no_write_attestation: CP118_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp118UiSyntheticFixtureGoldenCaseManifest() {
  const rows = createPermissionKernelCp118UiSyntheticFixtureGoldenCaseCatalog();
  const unitIds = createPermissionKernelCp118CoveredUnitIds();
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
  const matrix = createPermissionKernelCp118UiSyntheticFixtureMatrix();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP118_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp118_ui_synthetic_fixture_golden_case_manifest",
    source_unit_range: PERMISSION_KERNEL_CP118_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    ui_terminal_surface_count: matrix.ui_terminal_surface_count,
    golden_case_count: matrix.golden_case_count,
    base_fixture_count: matrix.base_fixture_count,
    synthetic_only: true,
    no_real_data: true,
    risk_c_large_pack: true,
    metadata_only_fixture_set: true,
    no_write_attestation: CP118_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP118_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP118_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp118HermesEvidencePacket() {
  const manifest = createPermissionKernelCp118UiSyntheticFixtureGoldenCaseManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP118_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp118_ui_synthetic_fixture_golden_case_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-118",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp118ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP118_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp118_ui_synthetic_fixture_golden_case_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-118 closes the planned Risk C RP02 UI terminal fixture and fixture/golden-case opening units, inherits CP117 snapshots, preserves synthetic-only metadata-only fixture behavior, blocks unauthorized count and hidden-source-field leakage, and adds no runtime UI/API route, permission/audit/product/database writes, external share/export, AI/analytics execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp118CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP118_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP118_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP118_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP118_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP118_UI_SYNTHETIC_FIXTURE_GOLDEN_CASE_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp118Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp118UiSyntheticFixtureGoldenCaseCatalog();
  const unitIds = createPermissionKernelCp118CoveredUnitIds();
  const manifest = createPermissionKernelCp118UiSyntheticFixtureGoldenCaseManifest();
  const matrix = createPermissionKernelCp118UiSyntheticFixtureMatrix();
  const handoff = createPermissionKernelCp118CloseoutHandoff();

  if (rows.length !== PERMISSION_KERNEL_CP118_PACK_BINDING.unit_count) errors.push("CP00-118 row count must be 150");
  if (unitIds.length !== PERMISSION_KERNEL_CP118_PACK_BINDING.unit_count) errors.push("CP00-118 covered unit count must be 150");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-118 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P04.M06.S06") errors.push("CP00-118 first unit must be RP02.P04.M06.S06");
  if (unitIds.at(-1) !== "RP02.P05.M04.S07") errors.push("CP00-118 last unit must be RP02.P05.M04.S07");
  if (manifest.area_counts.permission_ui_terminal_fixture_catalog !== 85) errors.push("CP00-118 UI terminal count must be 85");
  if (manifest.area_counts.permission_fixture_golden_case_opening !== 65) errors.push("CP00-118 fixture/golden count must be 65");
  if (manifest.covered_micro_phase_count !== 10) errors.push("CP00-118 must cover ten micro phases");
  if (manifest.deliverable_counts.claude_review !== 14) errors.push("CP00-118 claude_review deliverable count must be 14");
  if (manifest.deliverable_counts.ui !== 35) errors.push("CP00-118 ui deliverable count must be 35");
  if (manifest.deliverable_counts.security_audit !== 12) errors.push("CP00-118 security_audit deliverable count must be 12");
  if (manifest.deliverable_counts.implementation !== 37) errors.push("CP00-118 implementation deliverable count must be 37");
  if (manifest.deliverable_counts.fixture !== 36) errors.push("CP00-118 fixture deliverable count must be 36");
  if (manifest.deliverable_counts.test !== 10) errors.push("CP00-118 test deliverable count must be 10");
  if (manifest.deliverable_counts.hermes_evidence !== 6) errors.push("CP00-118 hermes_evidence deliverable count must be 6");
  if (matrix.inherited_state_count !== 3) errors.push("CP00-118 must inherit the CP117 three-state snapshot matrix");
  if (matrix.ui_terminal_surface_count !== UI_TERMINAL_TITLES.length) errors.push("CP00-118 UI terminal surface count must be 22");
  if (matrix.golden_case_count !== 9) errors.push("CP00-118 golden case count must be 9");
  if (matrix.base_fixture_count !== 4) errors.push("CP00-118 base fixture count must be 4");
  for (const profile of [...matrix.ui_terminal_surfaces, ...matrix.golden_cases, ...matrix.base_fixtures]) {
    if (
      profile.unauthorized_count_exposed ||
      profile.hidden_field_names_exposed ||
      profile.mutates_permission_policy ||
      profile.writes_product_state ||
      profile.writes_audit_event ||
      profile.creates_database_rows ||
      profile.persists_idempotency_keys ||
      profile.acquires_locks ||
      profile.executes_export_download ||
      profile.executes_external_share ||
      profile.executes_ai_retrieval ||
      profile.executes_analytics_query ||
      profile.grants_human_approval
    ) {
      errors.push(`CP00-118 profile ${profile.surface_id ?? profile.case_id ?? profile.fixture_id} must remain no-write and leak-free`);
    }
  }
  if (!matrix.golden_cases.some((item) => item.case_id === "cross_tenant_case" && item.tenant_drift_blocked === true)) {
    errors.push("CP00-118 must include a blocked cross-tenant case");
  }
  if (!matrix.golden_cases.some((item) => item.case_id === "ai_retrieval_or_analytics_case" && item.executes_ai_retrieval === false)) {
    errors.push("CP00-118 must include blocked AI/analytics case");
  }
  if (handoff.next_pack_id !== "CP00-119" || handoff.next_subphase_id !== "RP02.P05.M04.S08") {
    errors.push("CP00-118 must hand off to CP00-119 / RP02.P05.M04.S08");
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
