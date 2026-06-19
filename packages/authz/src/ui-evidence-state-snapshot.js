import {
  PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT,
  createPermissionKernelCp116UiPermissionAuditBindingManifest,
  createPermissionKernelCp116UiPermissionAuditBindingMatrix,
  createPermissionKernelCp116UiPermissionAuditBindingSurface,
} from "./ui-permission-audit-binding.js";

export const PERMISSION_KERNEL_CP117_PACK_BINDING = Object.freeze({
  pack_id: "CP00-117",
  planned_pack_id: "CP00-117",
  risk_class: "A",
  unit_count: 10,
  range: "RP02.P04.M05.S18-RP02.P04.M06.S05",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-116",
  next_pack_id: "CP00-118",
  next_subphase_id: "RP02.P04.M06.S06",
});

const CP117_UNITS = Object.freeze([
  Object.freeze({
    id: "RP02.P04.M05.S18",
    title: "Hermes UI evidence",
    micro_phase_id: "RP02.P04.M05",
    micro_title: "Permission And Audit Binding",
    deliverable_type: "hermes_evidence",
    coverage_kind: "hermes_ui_evidence",
  }),
  Object.freeze({
    id: "RP02.P04.M05.S19",
    title: "Claude UI leak prompt",
    micro_phase_id: "RP02.P04.M05",
    micro_title: "Permission And Audit Binding",
    deliverable_type: "claude_review",
    coverage_kind: "claude_ui_leak_prompt",
  }),
  Object.freeze({
    id: "RP02.P04.M05.S20",
    title: "Closeout handoff",
    micro_phase_id: "RP02.P04.M05",
    micro_title: "Permission And Audit Binding",
    deliverable_type: "implementation",
    coverage_kind: "closeout_handoff",
  }),
  Object.freeze({
    id: "RP02.P04.M05.S21",
    title: "State snapshot",
    micro_phase_id: "RP02.P04.M05",
    micro_title: "Permission And Audit Binding",
    deliverable_type: "ui",
    coverage_kind: "state_snapshot",
  }),
  Object.freeze({
    id: "RP02.P04.M05.S22",
    title: "No unauthorized count leak",
    micro_phase_id: "RP02.P04.M05",
    micro_title: "Permission And Audit Binding",
    deliverable_type: "implementation",
    coverage_kind: "no_unauthorized_count_leak",
  }),
  Object.freeze({
    id: "RP02.P04.M06.S01",
    title: "UI surface inventory",
    micro_phase_id: "RP02.P04.M06",
    micro_title: "Synthetic Fixture Set",
    deliverable_type: "ui",
    coverage_kind: "ui_surface_inventory",
  }),
  Object.freeze({
    id: "RP02.P04.M06.S02",
    title: "Data dependency map",
    micro_phase_id: "RP02.P04.M06",
    micro_title: "Synthetic Fixture Set",
    deliverable_type: "implementation",
    coverage_kind: "data_dependency_map",
  }),
  Object.freeze({
    id: "RP02.P04.M06.S03",
    title: "Loading state",
    micro_phase_id: "RP02.P04.M06",
    micro_title: "Synthetic Fixture Set",
    deliverable_type: "ui",
    coverage_kind: "loading_state",
  }),
  Object.freeze({
    id: "RP02.P04.M06.S04",
    title: "Empty state",
    micro_phase_id: "RP02.P04.M06",
    micro_title: "Synthetic Fixture Set",
    deliverable_type: "ui",
    coverage_kind: "empty_state",
  }),
  Object.freeze({
    id: "RP02.P04.M06.S05",
    title: "Denied state",
    micro_phase_id: "RP02.P04.M06",
    micro_title: "Synthetic Fixture Set",
    deliverable_type: "ui",
    coverage_kind: "denied_state",
  }),
]);

const CP117_NO_WRITE_ATTESTATION = Object.freeze({
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

export const PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP117_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp117_ui_evidence_state_snapshot_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP117_PACK_BINDING.range,
  upstream_ui_permission_audit_binding_pack_id: PERMISSION_KERNEL_CP117_PACK_BINDING.upstream_pack_id,
  covered_unit_count: PERMISSION_KERNEL_CP117_PACK_BINDING.unit_count,
  synthetic_only: true,
  risk_a_boundary_pack: true,
  metadata_only_ui_state_snapshot: true,
  ui_runtime_route_added: false,
  inherited_ui_permission_audit_contract_id: PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.contract_id,
  no_write_attestation: CP117_NO_WRITE_ATTESTATION,
  evidence_surfaces: Object.freeze(CP117_UNITS.map((unit) => unit.coverage_kind)),
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP117_PACK_BINDING",
    "PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT",
    "createPermissionKernelCp117UiEvidenceStateSnapshotCatalog",
    "createPermissionKernelCp117CoveredUnitIds",
    "createPermissionKernelCp117UiStateSnapshot",
    "createPermissionKernelCp117UiStateSnapshotMatrix",
    "createPermissionKernelCp117UiEvidenceStateSnapshotManifest",
    "createPermissionKernelCp117HermesEvidencePacket",
    "createPermissionKernelCp117ClaudeReviewPacket",
    "createPermissionKernelCp117CloseoutHandoff",
    "validatePermissionKernelCp117Coverage",
  ]),
  ui_state_ids: Object.freeze(["loading_state", "empty_state", "denied_state"]),
  state_snapshot_shape: Object.freeze([
    "state_id",
    "permission_effect",
    "permission_badge",
    "audit_hint_display",
    "error_message_copy",
    "unauthorized_count_exposed",
    "hidden_field_names_exposed",
    "writes_product_state",
  ]),
  data_dependency_sources: Object.freeze([
    "cp116_secondary_interaction",
    "cp116_permission_badge",
    "cp116_audit_hint_display",
    "cp116_responsive_layout",
    "cp116_synthetic_fixture_binding",
  ]),
  hidden_source_fields: PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.hidden_source_fields,
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP117_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP117_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel synthetic fixture set at RP02.P04.M06.S06 as Risk C; add review-required, interaction, permission badge, audit hint, copy, responsive, keyboard, fixture, evidence, review, closeout, and state snapshot surfaces without crossing runtime UI, permission, audit, product-state, export/share, AI, LDIP, or HRX boundaries.",
  }),
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function freezeCatalogRow(unit) {
  return Object.freeze({
    catalog_id: `${unit.micro_phase_id}.${slugFor(unit.title)}`,
    pack_id: PERMISSION_KERNEL_CP117_PACK_BINDING.pack_id,
    program_id: "RP02",
    area: "permission_ui_evidence_state_snapshot",
    phase_id: "RP02.P04",
    micro_phase_id: unit.micro_phase_id,
    micro_title: unit.micro_title,
    phase_role: "ui_evidence_state_snapshot_risk_a",
    title: unit.title,
    coverage_kind: unit.coverage_kind,
    deliverable_type: unit.deliverable_type,
    source_unit_ids: Object.freeze([unit.id]),
    required_assertions: Object.freeze([
      "synthetic_only",
      "metadata_only_ui_state_snapshot",
      "hermes_evidence_reference_only",
      "claude_leak_prompt_reference_only",
      "state_snapshot_no_write",
      "data_dependency_map_no_real_data",
      "loading_empty_denied_states_no_leak",
      "no_unauthorized_count_exposed",
      "hidden_source_fields_not_exposed",
      "no_runtime_ui_route",
    ]),
    boundary_flags: CP117_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    risk_a_boundary_pack: true,
    product_state_effect: "none",
  });
}

export function createPermissionKernelCp117UiEvidenceStateSnapshotCatalog() {
  return Object.freeze(CP117_UNITS.map((unit) => freezeCatalogRow(unit)));
}

export function createPermissionKernelCp117CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp117UiEvidenceStateSnapshotCatalog().flatMap((item) => item.source_unit_ids));
}

function createDataDependencyMap(inheritedSurface) {
  return Object.freeze({
    map_id: "permission_kernel_cp117_data_dependency_map",
    source_pack_id: "CP00-116",
    source_contract_id: PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.contract_id,
    sources: PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.data_dependency_sources,
    allowed_fields: Object.freeze([
      "state_id",
      "permission_effect",
      "permission_badge.effect",
      "permission_badge.label",
      "permission_badge.reason",
      "audit_hint_display.hint.actor_id",
      "audit_hint_display.hint.action",
      "audit_hint_display.hint.tenant_id",
      "audit_hint_display.hint.matter_id",
      "audit_hint_display.hint.effect",
      "audit_hint_display.hint.reason",
      "responsive_layout.desktop.breakpoint",
      "responsive_layout.mobile.breakpoint",
    ]),
    denied_fields: PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.hidden_source_fields,
    real_client_data_sources: Object.freeze([]),
    derived_from_runtime_route: false,
    derived_from_product_state: false,
    writes_product_state: false,
    writes_audit_event: false,
    unauthorized_count_source: "not_collected",
    inherited_surface_id: inheritedSurface.surface_id,
  });
}

function freezeSnapshot(snapshot) {
  return Object.freeze({
    ...snapshot,
    synthetic_only: true,
    no_real_data: true,
    metadata_only_ui_state_snapshot: true,
    runtime_ui_route_added: false,
    unauthorized_count_exposed: false,
    hidden_field_names_exposed: false,
    writes_product_state: false,
    writes_audit_event: false,
    mutates_permission_policy: false,
    creates_database_rows: false,
    persists_idempotency_keys: false,
    acquires_locks: false,
    executes_export_download: false,
    executes_external_share: false,
    executes_ai_retrieval: false,
    grants_human_approval: false,
    no_write_attestation: CP117_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp117UiStateSnapshot(request = {}) {
  const stateId = request.state_id ?? "loading_state";
  const effect = stateId === "denied_state" ? "deny" : request.effect ?? "allow_reference";
  const inheritedSurface = createPermissionKernelCp116UiPermissionAuditBindingSurface({
    effect,
    reason: effect === "deny" ? "permission_denied" : "synthetic_ui_snapshot",
    audit_hint: request.audit_hint,
  });
  const inheritedManifest = createPermissionKernelCp116UiPermissionAuditBindingManifest();
  const permissionBadge = Object.freeze({
    ...inheritedSurface.permission_badge,
    source: "cp117_state_snapshot_permission_badge",
    persisted: false,
    grants_access: false,
  });
  const auditHintDisplay = Object.freeze({
    ...inheritedSurface.audit_hint_display,
    source: "cp117_state_snapshot_audit_hint_display",
    preview_only: true,
    emitted_to_audit_ledger: false,
    hidden_field_names_exposed: false,
  });
  const errorMessageCopy = Object.freeze({
    ...inheritedSurface.error_message_copy,
    exposes_unauthorized_count: false,
    exposes_hidden_field_names: false,
  });
  const stateSnapshot = Object.freeze({
    state_id: stateId,
    permission_effect: effect,
    display_mode: request.display_mode ?? (stateId === "loading_state" ? "skeleton" : "message"),
    loading: stateId === "loading_state",
    empty: stateId === "empty_state",
    denied: stateId === "denied_state",
    permission_badge: permissionBadge,
    audit_hint_display: auditHintDisplay,
    error_message_copy: errorMessageCopy,
    unauthorized_count_exposed: false,
    hidden_field_names_exposed: false,
    writes_product_state: false,
  });
  return freezeSnapshot({
    pack_id: PERMISSION_KERNEL_CP117_PACK_BINDING.pack_id,
    snapshot_id: `permission_kernel_cp117_${stateId}`,
    inherited_pack_id: "CP00-116",
    inherited_unit_range: inheritedManifest.source_unit_range,
    inherited_surface_count: createPermissionKernelCp116UiPermissionAuditBindingMatrix().surface_count,
    state_snapshot: stateSnapshot,
    hermes_ui_evidence: Object.freeze({
      gate: "H02",
      evidence_mode: "command_evidence_reference",
      command_ref: "npm run rp02:permission-kernel:validate",
      writes_product_state: false,
    }),
    claude_ui_leak_prompt: Object.freeze({
      model: "claude-opus-4-8",
      effort: "max",
      read_only: true,
      prompt_scope: "verify CP117 UI snapshots do not leak hidden fields or unauthorized counts",
      executes_claude_review: false,
    }),
    closeout_handoff: PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.handoff,
    no_unauthorized_count_leak: Object.freeze({
      unauthorized_count_collected: false,
      unauthorized_count_rendered: false,
      hidden_field_names_rendered: false,
      redacted_copy: "Unavailable items are hidden.",
    }),
    ui_surface_inventory: Object.freeze([
      "state_snapshot",
      "permission_badge",
      "audit_hint_display",
      "error_message_copy",
      "loading_state",
      "empty_state",
      "denied_state",
    ]),
    data_dependency_map: createDataDependencyMap(inheritedSurface),
    loading_state: Object.freeze({
      state_id: "loading_state",
      skeleton_only: true,
      renders_permission_badge: false,
      renders_unauthorized_count: false,
      writes_product_state: false,
    }),
    empty_state: Object.freeze({
      state_id: "empty_state",
      message: "No synthetic items are available.",
      renders_permission_badge: true,
      renders_unauthorized_count: false,
      writes_product_state: false,
    }),
    denied_state: Object.freeze({
      state_id: "denied_state",
      permission_effect: "deny",
      secondary_interaction_enabled: false,
      renders_permission_badge: true,
      renders_unauthorized_count: false,
      grants_access: false,
      writes_product_state: false,
    }),
  });
}

export function createPermissionKernelCp117UiStateSnapshotMatrix() {
  const snapshots = Object.freeze([
    createPermissionKernelCp117UiStateSnapshot({ state_id: "loading_state", display_mode: "skeleton" }),
    createPermissionKernelCp117UiStateSnapshot({ state_id: "empty_state", display_mode: "message" }),
    createPermissionKernelCp117UiStateSnapshot({ state_id: "denied_state", display_mode: "blocked" }),
  ]);
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP117_PACK_BINDING.pack_id,
    state_count: snapshots.length,
    states: PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.ui_state_ids,
    snapshots,
    no_write_attestation: CP117_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp117UiEvidenceStateSnapshotManifest() {
  const rows = createPermissionKernelCp117UiEvidenceStateSnapshotCatalog();
  const unitIds = createPermissionKernelCp117CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const matrix = createPermissionKernelCp117UiStateSnapshotMatrix();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP117_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp117_ui_evidence_state_snapshot_manifest",
    source_unit_range: PERMISSION_KERNEL_CP117_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: new Set(rows.map((row) => row.micro_phase_id)).size,
    deliverable_counts: Object.freeze(deliverableCounts),
    state_count: matrix.state_count,
    synthetic_only: true,
    no_real_data: true,
    risk_a_boundary_pack: true,
    metadata_only_ui_state_snapshot: true,
    no_write_attestation: CP117_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP117_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP117_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp117HermesEvidencePacket() {
  const manifest = createPermissionKernelCp117UiEvidenceStateSnapshotManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP117_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp117_ui_evidence_state_snapshot_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-117",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp117ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP117_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp117_ui_evidence_state_snapshot_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-117 closes the planned Risk A RP02 UI evidence/state snapshot units with Hermes UI evidence, Claude UI leak prompt, closeout handoff, state snapshot, no unauthorized count leak, UI surface inventory, data dependency map, loading state, empty state, denied state, no hidden source field exposure, no runtime UI/API route, no permission/audit/product/database writes, no external share/export/AI/LDIP implementation, HRX embedded-only boundary, and handoff to CP00-118/RP02.P04.M06.S06.",
  });
}

export function createPermissionKernelCp117CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP117_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP117_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP117_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP117_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp117Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp117UiEvidenceStateSnapshotCatalog();
  const unitIds = createPermissionKernelCp117CoveredUnitIds();
  const manifest = createPermissionKernelCp117UiEvidenceStateSnapshotManifest();
  const matrix = createPermissionKernelCp117UiStateSnapshotMatrix();
  const handoff = createPermissionKernelCp117CloseoutHandoff();
  const deniedSnapshot = matrix.snapshots.find((snapshot) => snapshot.state_snapshot.state_id === "denied_state");

  if (rows.length !== PERMISSION_KERNEL_CP117_PACK_BINDING.unit_count) errors.push("CP00-117 row count must be 10");
  if (unitIds.length !== PERMISSION_KERNEL_CP117_PACK_BINDING.unit_count) errors.push("CP00-117 covered unit count must be 10");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-117 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P04.M05.S18") errors.push("CP00-117 first unit must be RP02.P04.M05.S18");
  if (unitIds.at(-1) !== "RP02.P04.M06.S05") errors.push("CP00-117 last unit must be RP02.P04.M06.S05");
  if (manifest.deliverable_counts.hermes_evidence !== 1) errors.push("CP00-117 Hermes evidence deliverable count must be 1");
  if (manifest.deliverable_counts.claude_review !== 1) errors.push("CP00-117 Claude review deliverable count must be 1");
  if (manifest.deliverable_counts.implementation !== 3) errors.push("CP00-117 implementation deliverable count must be 3");
  if (manifest.deliverable_counts.ui !== 5) errors.push("CP00-117 ui deliverable count must be 5");
  if (manifest.covered_micro_phase_count !== 2) errors.push("CP00-117 must cover two micro phases");
  if (matrix.state_count !== 3) errors.push("CP00-117 matrix must include loading, empty, and denied snapshots");
  if (!deniedSnapshot || deniedSnapshot.state_snapshot.permission_effect !== "deny") {
    errors.push("CP00-117 denied state must carry deny permission effect");
  }
  if (deniedSnapshot?.denied_state.secondary_interaction_enabled !== false || deniedSnapshot?.denied_state.grants_access !== false) {
    errors.push("CP00-117 denied state must disable secondary interaction and grant no access");
  }
  for (const snapshot of matrix.snapshots) {
    if (snapshot.state_snapshot.permission_badge.grants_access) errors.push("CP00-117 permission badge must not grant access");
    if (snapshot.state_snapshot.audit_hint_display.preview_only !== true) errors.push("CP00-117 audit hint must stay preview-only");
    if (snapshot.state_snapshot.audit_hint_display.emitted_to_audit_ledger !== false) {
      errors.push("CP00-117 audit hint must not emit to audit ledger");
    }
    if (snapshot.state_snapshot.error_message_copy.exposes_unauthorized_count) {
      errors.push("CP00-117 error copy must not expose unauthorized counts");
    }
    if (snapshot.no_unauthorized_count_leak.unauthorized_count_collected || snapshot.no_unauthorized_count_leak.unauthorized_count_rendered) {
      errors.push("CP00-117 must not collect or render unauthorized counts");
    }
    if (snapshot.data_dependency_map.real_client_data_sources.length !== 0) {
      errors.push("CP00-117 data dependency map must not include real client data sources");
    }
    for (const hiddenField of PERMISSION_KERNEL_CP117_UI_EVIDENCE_STATE_SNAPSHOT_CONTRACT.hidden_source_fields) {
      if (Object.hasOwn(snapshot.state_snapshot.audit_hint_display.hint, hiddenField)) {
        errors.push(`CP00-117 audit hint must not expose ${hiddenField}`);
      }
      if (!snapshot.data_dependency_map.denied_fields.includes(hiddenField)) {
        errors.push(`CP00-117 data dependency map must deny ${hiddenField}`);
      }
    }
    if (
      snapshot.unauthorized_count_exposed ||
      snapshot.hidden_field_names_exposed ||
      snapshot.runtime_ui_route_added ||
      snapshot.mutates_permission_policy ||
      snapshot.writes_product_state ||
      snapshot.writes_audit_event ||
      snapshot.creates_database_rows ||
      snapshot.persists_idempotency_keys ||
      snapshot.acquires_locks ||
      snapshot.executes_export_download ||
      snapshot.executes_external_share ||
      snapshot.executes_ai_retrieval ||
      snapshot.grants_human_approval
    ) {
      errors.push(`CP00-117 snapshot ${snapshot.snapshot_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-118" || handoff.next_subphase_id !== "RP02.P04.M06.S06") {
    errors.push("CP00-117 must hand off to CP00-118 / RP02.P04.M06.S06");
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
