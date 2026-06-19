import {
  PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT,
} from "./api-permission-audit-binding.js";
import {
  PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT,
  createPermissionKernelCp115ApiFixtureUiReadinessMatrix,
} from "./api-fixture-ui-readiness-catalog.js";

export const PERMISSION_KERNEL_CP116_PACK_BINDING = Object.freeze({
  pack_id: "CP00-116",
  planned_pack_id: "CP00-116",
  risk_class: "A",
  unit_count: 10,
  range: "RP02.P04.M05.S08-RP02.P04.M05.S17",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-115",
  next_pack_id: "CP00-117",
  next_subphase_id: "RP02.P04.M05.S18",
});

const CP116_TITLES = Object.freeze([
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
]);

const CP116_DELIVERABLE_TYPES = Object.freeze({
  "Secondary interaction": "ui",
  "Permission badge": "security_audit",
  "Audit hint display": "security_audit",
  "Error message copy": "implementation",
  "Responsive desktop layout": "ui",
  "Responsive mobile layout": "ui",
  "Keyboard/focus behavior": "implementation",
  "Visual density check": "implementation",
  "Synthetic fixture binding": "fixture",
  "Build smoke": "test",
});

const CP116_NO_WRITE_ATTESTATION = Object.freeze({
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

export const PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP116_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp116_ui_permission_audit_binding_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP116_PACK_BINDING.range,
  upstream_api_fixture_ui_readiness_pack_id: PERMISSION_KERNEL_CP116_PACK_BINDING.upstream_pack_id,
  covered_unit_count: PERMISSION_KERNEL_CP116_PACK_BINDING.unit_count,
  synthetic_only: true,
  risk_a_boundary_pack: true,
  metadata_only_ui_binding: true,
  ui_runtime_route_added: false,
  inherited_ui_readiness_contract_id: PERMISSION_KERNEL_CP115_API_FIXTURE_UI_READINESS_CONTRACT.contract_id,
  no_write_attestation: CP116_NO_WRITE_ATTESTATION,
  binding_surfaces: Object.freeze([
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
  ]),
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP116_PACK_BINDING",
    "PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT",
    "createPermissionKernelCp116UiPermissionAuditBindingCatalog",
    "createPermissionKernelCp116CoveredUnitIds",
    "createPermissionKernelCp116UiPermissionAuditBindingSurface",
    "createPermissionKernelCp116UiPermissionAuditBindingMatrix",
    "createPermissionKernelCp116UiPermissionAuditBindingManifest",
    "createPermissionKernelCp116HermesEvidencePacket",
    "createPermissionKernelCp116ClaudeReviewPacket",
    "createPermissionKernelCp116CloseoutHandoff",
    "validatePermissionKernelCp116Coverage",
  ]),
  permission_badge_shape: Object.freeze(["source", "effect", "label", "reason", "visible", "persisted", "grants_access"]),
  audit_hint_shape: Object.freeze(["source", "preview_only", "emitted_to_audit_ledger", "hint", "hidden_field_names_exposed"]),
  error_copy_codes: Object.freeze(["permission_denied", "review_required", "invalid_request", "redacted_unauthorized_count"]),
  hidden_source_fields: PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.hidden_source_fields,
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP116_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP116_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel UI permission/audit binding from RP02.P04.M05.S18 as Risk A; keep Hermes UI evidence, Claude UI leak prompt, closeout handoff, state snapshot, and no-unauthorized-count-leak surfaces synthetic-only and no-write.",
  }),
});

function unitIdFor(offset) {
  return `RP02.P04.M05.S${String(8 + offset).padStart(2, "0")}`;
}

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function coverageKindFor(title) {
  if (title === "Secondary interaction") return "secondary_interaction";
  if (title === "Permission badge") return "permission_badge";
  if (title === "Audit hint display") return "audit_hint_display";
  if (title === "Error message copy") return "error_message_copy";
  if (title === "Responsive desktop layout") return "responsive_desktop_layout";
  if (title === "Responsive mobile layout") return "responsive_mobile_layout";
  if (title === "Keyboard/focus behavior") return "keyboard_focus_behavior";
  if (title === "Visual density check") return "visual_density_check";
  if (title === "Synthetic fixture binding") return "synthetic_fixture_binding";
  if (title === "Build smoke") return "build_smoke";
  return slugFor(title);
}

function freezeCatalogRow(title, offset) {
  return Object.freeze({
    catalog_id: `RP02.P04.M05.${slugFor(title)}`,
    pack_id: PERMISSION_KERNEL_CP116_PACK_BINDING.pack_id,
    program_id: "RP02",
    area: "permission_ui_permission_audit_binding",
    phase_id: "RP02.P04",
    micro_phase_id: "RP02.P04.M05",
    micro_title: "Permission And Audit Binding",
    phase_role: "ui_permission_audit_binding_risk_a",
    title,
    coverage_kind: coverageKindFor(title),
    deliverable_type: CP116_DELIVERABLE_TYPES[title],
    source_unit_ids: Object.freeze([unitIdFor(offset)]),
    required_assertions: Object.freeze([
      "synthetic_only",
      "metadata_only_ui_binding",
      "permission_badge_cannot_grant_access",
      "audit_hint_preview_only",
      "hidden_source_fields_not_exposed",
      "unauthorized_count_not_exposed",
      "no_permission_policy_mutation",
      "no_audit_write",
      "no_product_state_write",
      "no_external_share",
    ]),
    boundary_flags: CP116_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    risk_a_boundary_pack: true,
    product_state_effect: "none",
  });
}

export function createPermissionKernelCp116UiPermissionAuditBindingCatalog() {
  return Object.freeze(CP116_TITLES.map((title, offset) => freezeCatalogRow(title, offset)));
}

export function createPermissionKernelCp116CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp116UiPermissionAuditBindingCatalog().flatMap((item) => item.source_unit_ids));
}

function sanitizeHint(hint = {}) {
  return Object.freeze({
    actor_id: hint.actor_id ?? "u_cp116_ui",
    action: hint.action ?? "permission.ui.preview",
    tenant_id: hint.tenant_id ?? "t_cp116",
    matter_id: hint.matter_id ?? "m_cp116",
    effect: hint.effect ?? "allow_reference",
    reason: hint.reason ?? "synthetic_ui_preview",
  });
}

function freezeSurface(surface) {
  return Object.freeze({
    ...surface,
    synthetic_only: true,
    no_real_data: true,
    metadata_only_ui_binding: true,
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
    no_write_attestation: CP116_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp116UiPermissionAuditBindingSurface(request = {}) {
  const inheritedMatrix = createPermissionKernelCp115ApiFixtureUiReadinessMatrix();
  const effect = request.effect ?? "allow_reference";
  const badgeLabel = effect === "deny" ? "Access denied" : effect === "review_required" ? "Review required" : "Permitted reference";
  const permissionBadge = Object.freeze({
    source: "cp116_permission_badge",
    effect,
    label: badgeLabel,
    reason: request.reason ?? (effect === "deny" ? "permission_denied" : "synthetic_ui_preview"),
    visible: true,
    persisted: false,
    grants_access: false,
  });
  const auditHintDisplay = Object.freeze({
    source: "cp116_audit_hint_display",
    preview_only: true,
    emitted_to_audit_ledger: false,
    hint: sanitizeHint({ ...request.audit_hint, effect, reason: permissionBadge.reason }),
    hidden_field_names_exposed: false,
  });
  const errorMessageCopy = Object.freeze({
    permission_denied: "Access is unavailable for this synthetic preview.",
    review_required: "This synthetic action requires review before any production workflow can continue.",
    invalid_request: "The synthetic request shape is invalid.",
    redacted_unauthorized_count: "Some unavailable items are hidden.",
    exposes_unauthorized_count: false,
    exposes_hidden_field_names: false,
  });
  const layout = Object.freeze({
    desktop: Object.freeze({ breakpoint: "desktop", permission_badge_visible: true, audit_hint_visible: true, density: "compact" }),
    mobile: Object.freeze({ breakpoint: "mobile", permission_badge_visible: true, audit_hint_visible: false, density: "compact" }),
    keyboard_focus_order: Object.freeze(["secondary_interaction", "permission_badge", "audit_hint_display"]),
    visual_density: "compact_audit_safe",
  });
  return freezeSurface({
    pack_id: PERMISSION_KERNEL_CP116_PACK_BINDING.pack_id,
    surface_id: "permission_kernel_cp116_ui_permission_audit_binding_surface",
    inherited_pack_id: inheritedMatrix.pack_id,
    inherited_ui_state_count: inheritedMatrix.ui_state_count,
    inherited_api_fixture_surface_count: inheritedMatrix.api_fixture_surface_count,
    secondary_interaction: Object.freeze({
      action_id: "cp116_secondary_interaction",
      enabled: effect !== "deny",
      requires_review: effect === "review_required",
      grants_access: false,
      executes_workflow: false,
    }),
    permission_badge: permissionBadge,
    audit_hint_display: auditHintDisplay,
    error_message_copy: errorMessageCopy,
    responsive_layout: layout,
    synthetic_fixture_binding: Object.freeze({
      fixture_source_pack_id: "CP00-115",
      fixture_surface_count: inheritedMatrix.api_fixture_surface_count,
      ui_state_count: inheritedMatrix.ui_state_count,
      bound_to_runtime_route: false,
      writes_product_state: false,
    }),
    build_smoke: Object.freeze({
      command: "node --test packages/authz/test/*.test.js",
      expected_status: "passed",
      runtime_ui_route_required: false,
    }),
  });
}

export function createPermissionKernelCp116UiPermissionAuditBindingMatrix() {
  const surfaces = Object.freeze([
    createPermissionKernelCp116UiPermissionAuditBindingSurface(),
    createPermissionKernelCp116UiPermissionAuditBindingSurface({ effect: "deny", reason: "permission_denied" }),
    createPermissionKernelCp116UiPermissionAuditBindingSurface({ effect: "review_required", reason: "review_required" }),
  ]);
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP116_PACK_BINDING.pack_id,
    surface_count: surfaces.length,
    surfaces,
    no_write_attestation: CP116_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp116UiPermissionAuditBindingManifest() {
  const rows = createPermissionKernelCp116UiPermissionAuditBindingCatalog();
  const unitIds = createPermissionKernelCp116CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const matrix = createPermissionKernelCp116UiPermissionAuditBindingMatrix();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP116_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp116_ui_permission_audit_binding_manifest",
    source_unit_range: PERMISSION_KERNEL_CP116_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: new Set(rows.map((row) => row.micro_phase_id)).size,
    deliverable_counts: Object.freeze(deliverableCounts),
    surface_count: matrix.surface_count,
    synthetic_only: true,
    no_real_data: true,
    risk_a_boundary_pack: true,
    metadata_only_ui_binding: true,
    no_write_attestation: CP116_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP116_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP116_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp116HermesEvidencePacket() {
  const manifest = createPermissionKernelCp116UiPermissionAuditBindingManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP116_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp116_ui_permission_audit_binding_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-116",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp116ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP116_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp116_ui_permission_audit_binding_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-116 closes the planned Risk A RP02 UI permission/audit binding units with secondary interaction, permission badge, audit hint display, error copy, responsive desktop/mobile layout, keyboard/focus behavior, visual density, synthetic fixture binding, build smoke, no unauthorized count leak, no hidden source field exposure, no runtime UI/API route, no permission/audit/product/database writes, no external share/export/AI/LDIP implementation, HRX embedded-only boundary, and handoff to CP00-117/RP02.P04.M05.S18.",
  });
}

export function createPermissionKernelCp116CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP116_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP116_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP116_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP116_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp116Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp116UiPermissionAuditBindingCatalog();
  const unitIds = createPermissionKernelCp116CoveredUnitIds();
  const manifest = createPermissionKernelCp116UiPermissionAuditBindingManifest();
  const matrix = createPermissionKernelCp116UiPermissionAuditBindingMatrix();
  const allowSurface = matrix.surfaces[0];
  const deniedSurface = matrix.surfaces[1];
  const reviewSurface = matrix.surfaces[2];
  const handoff = createPermissionKernelCp116CloseoutHandoff();

  if (rows.length !== PERMISSION_KERNEL_CP116_PACK_BINDING.unit_count) errors.push("CP00-116 row count must be 10");
  if (unitIds.length !== PERMISSION_KERNEL_CP116_PACK_BINDING.unit_count) errors.push("CP00-116 covered unit count must be 10");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-116 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P04.M05.S08") errors.push("CP00-116 first unit must be RP02.P04.M05.S08");
  if (unitIds.at(-1) !== "RP02.P04.M05.S17") errors.push("CP00-116 last unit must be RP02.P04.M05.S17");
  if (manifest.deliverable_counts.ui !== 3) errors.push("CP00-116 ui deliverable count must be 3");
  if (manifest.deliverable_counts.security_audit !== 2) errors.push("CP00-116 security_audit deliverable count must be 2");
  if (manifest.deliverable_counts.implementation !== 3) errors.push("CP00-116 implementation deliverable count must be 3");
  if (manifest.deliverable_counts.fixture !== 1) errors.push("CP00-116 fixture deliverable count must be 1");
  if (manifest.deliverable_counts.test !== 1) errors.push("CP00-116 test deliverable count must be 1");
  if (matrix.surface_count !== 3) errors.push("CP00-116 matrix must include allow, denied, and review surfaces");
  if (allowSurface.permission_badge.grants_access) errors.push("CP00-116 permission badge must not grant access");
  if (deniedSurface.secondary_interaction.enabled) errors.push("CP00-116 denied secondary interaction must be disabled");
  if (!reviewSurface.secondary_interaction.requires_review) errors.push("CP00-116 review secondary interaction must require review");
  for (const surface of matrix.surfaces) {
    if (surface.audit_hint_display.preview_only !== true || surface.audit_hint_display.emitted_to_audit_ledger !== false) {
      errors.push("CP00-116 audit hint display must stay preview-only");
    }
    if (surface.error_message_copy.exposes_unauthorized_count || surface.error_message_copy.exposes_hidden_field_names) {
      errors.push("CP00-116 error copy must not expose unauthorized counts or hidden field names");
    }
    for (const hiddenField of PERMISSION_KERNEL_CP116_UI_PERMISSION_AUDIT_BINDING_CONTRACT.hidden_source_fields) {
      if (Object.hasOwn(surface.audit_hint_display.hint, hiddenField)) {
        errors.push(`CP00-116 audit hint must not expose ${hiddenField}`);
      }
    }
    if (
      surface.unauthorized_count_exposed ||
      surface.hidden_field_names_exposed ||
      surface.runtime_ui_route_added ||
      surface.mutates_permission_policy ||
      surface.writes_product_state ||
      surface.writes_audit_event ||
      surface.creates_database_rows ||
      surface.persists_idempotency_keys ||
      surface.acquires_locks ||
      surface.executes_export_download ||
      surface.executes_external_share ||
      surface.executes_ai_retrieval ||
      surface.grants_human_approval
    ) {
      errors.push(`CP00-116 surface ${surface.surface_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-117" || handoff.next_subphase_id !== "RP02.P04.M05.S18") {
    errors.push("CP00-116 must hand off to CP00-117 / RP02.P04.M05.S18");
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
