export const PERMISSION_KERNEL_CP108_PACK_BINDING = Object.freeze({
  pack_id: "CP00-108",
  planned_pack_id: "CP00-108",
  risk_class: "C",
  unit_count: 150,
  range: "RP02.P00.M00.S01-RP02.P01.M05.S20",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  next_pack_id: "CP00-109",
  next_subphase_id: "RP02.P01.M06.S01",
});

const PHASES = Object.freeze({
  "RP02.P00.M00": Object.freeze({ count: 1, micro_title: "Scope Inventory", phase_role: "scope_inventory" }),
  "RP02.P00.M01": Object.freeze({ count: 3, micro_title: "Contract Draft", phase_role: "contract_draft" }),
  "RP02.P00.M02": Object.freeze({ count: 3, micro_title: "Type And Shape Definition", phase_role: "type_shape_definition" }),
  "RP02.P00.M03": Object.freeze({ count: 11, micro_title: "Primary Implementation Slice", phase_role: "primary_implementation_slice" }),
  "RP02.P00.M04": Object.freeze({ count: 11, micro_title: "Secondary Workflow Slice", phase_role: "secondary_workflow_slice" }),
  "RP02.P00.M05": Object.freeze({ count: 11, micro_title: "Permission And Audit Binding", phase_role: "permission_audit_binding" }),
  "RP02.P00.M06": Object.freeze({ count: 8, micro_title: "Synthetic Fixture Set", phase_role: "synthetic_fixture_set" }),
  "RP02.P00.M07": Object.freeze({ count: 11, micro_title: "Test And Golden Case Set", phase_role: "test_golden_case_set" }),
  "RP02.P00.M08": Object.freeze({ count: 8, micro_title: "Hermes Evidence Packet", phase_role: "hermes_evidence_packet" }),
  "RP02.P00.M09": Object.freeze({ count: 3, micro_title: "Claude Review Packet", phase_role: "claude_review_packet" }),
  "RP02.P00.M10": Object.freeze({ count: 1, micro_title: "Closeout And Next Handoff", phase_role: "closeout_handoff" }),
  "RP02.P01.M00": Object.freeze({ count: 3, micro_title: "Scope Inventory", phase_role: "model_scope_inventory" }),
  "RP02.P01.M01": Object.freeze({ count: 8, micro_title: "Contract Draft", phase_role: "model_contract_draft" }),
  "RP02.P01.M02": Object.freeze({ count: 8, micro_title: "Type And Shape Definition", phase_role: "model_type_shape_definition" }),
  "RP02.P01.M03": Object.freeze({ count: 20, micro_title: "Primary Implementation Slice", phase_role: "model_primary_implementation_slice" }),
  "RP02.P01.M04": Object.freeze({ count: 20, micro_title: "Secondary Workflow Slice", phase_role: "model_secondary_workflow_slice" }),
  "RP02.P01.M05": Object.freeze({ count: 20, micro_title: "Permission And Audit Binding", phase_role: "model_permission_audit_binding" }),
});

const RP02_FOUNDATION_TITLES = Object.freeze([
  "Scope inventory",
  "Acceptance gate definition",
  "Non-goal boundary",
  "Target file map",
  "Contract schema outline",
  "Ownership note",
  "Matter-first trace note",
  "Permission baseline note",
  "Audit baseline note",
  "Synthetic data policy",
  "Risk register row",
]);

const RP02_MODEL_TITLES = Object.freeze([
  "Package directory layout",
  "Primary entity identifier",
  "Tenant scope field",
  "Matter trace reference",
  "Lifecycle status enum",
  "Ownership metadata",
  "Reference relationship map",
  "Required field registry",
  "Optional field registry",
  "State transition map",
  "Validation helper",
  "Fixture model",
  "Serialization shape",
  "Public export",
  "Model unit test",
  "Invalid reference test",
  "Ownership drift test",
  "Hermes model summary",
  "Claude model review prompt",
  "Closeout handoff",
]);

const NO_WRITE_ATTESTATION = Object.freeze({
  accepts_real_client_data: false,
  evaluates_runtime_permission: false,
  mutates_permission_policy: false,
  writes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  executes_ai_retrieval: false,
  executes_export_download: false,
  executes_external_share: false,
  mutates_locks: false,
  retries_operations: false,
  performs_rollback: false,
  performs_compensation: false,
  grants_human_approval: false,
  executes_claude_review: false,
  implements_ldip: false,
});

export const PERMISSION_KERNEL_CP108_FOUNDATION_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP108_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp108_foundation_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP108_PACK_BINDING.range,
  covered_unit_count: PERMISSION_KERNEL_CP108_PACK_BINDING.unit_count,
  covered_micro_phase_count: Object.keys(PHASES).length,
  catalog_only: true,
  runtime_evaluator_unchanged: true,
  synthetic_only: true,
  no_write_attestation: NO_WRITE_ATTESTATION,
  boundary_invariants: Object.freeze([
    "tenant_scope_required",
    "matter_trace_reference_preserved",
    "permission_policy_mutation_deferred_to_later_risk_a_pack",
    "audit_ledger_write_deferred_to_rp03",
    "external_share_decision_deferred_to_explicit_policy_pack",
    "ldip_planning_preserved_no_implementation",
  ]),
  permission_surfaces: Object.freeze([
    "tenant_scope",
    "role_reference",
    "policy_reference",
    "object_acl_reference",
    "deny_rule_reference",
    "security_trim_reference",
    "audit_hint_reference",
    "matter_trace_reference",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP108_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP108_PACK_BINDING.next_subphase_id,
    next_scope: "Continue RP02 permission kernel fixture, test, evidence, and closeout modeling from RP02.P01.M06.S01.",
  }),
});

function unitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function phaseIdFor(microPhaseId) {
  return microPhaseId.slice(0, "RP02.P00".length);
}

function titleFor(microPhaseId, index) {
  const titles = microPhaseId.startsWith("RP02.P00") ? RP02_FOUNDATION_TITLES : RP02_MODEL_TITLES;
  return titles[index - 1];
}

function deliverableTypeFor(title) {
  if (title === "Contract schema outline") return "contract";
  if (title === "Permission baseline note" || title === "Audit baseline note") return "security_audit";
  if (title === "Package directory layout" || title === "Required field registry" || title === "State transition map") return "ui";
  if (title === "Fixture model") return "fixture";
  if (title === "Model unit test" || title === "Invalid reference test" || title === "Ownership drift test") return "test";
  if (title === "Hermes model summary") return "hermes_evidence";
  if (title === "Claude model review prompt") return "claude_review";
  return "implementation";
}

function coverageKindFor(title, phaseRole) {
  if (title.includes("inventory")) return "inventory";
  if (title.includes("gate")) return "acceptance_gate";
  if (title.includes("Non-goal")) return "non_goal_boundary";
  if (title.includes("Contract")) return "contract_schema";
  if (title.includes("Permission") || phaseRole.includes("permission")) return "permission_boundary";
  if (title.includes("Audit") || phaseRole.includes("audit")) return "audit_boundary";
  if (title.includes("Fixture")) return "synthetic_fixture";
  if (title.includes("test")) return "test_reference";
  if (title.includes("Hermes")) return "hermes_evidence_reference";
  if (title.includes("Claude")) return "claude_review_reference";
  if (title.includes("Closeout")) return "closeout_handoff";
  return "foundation_reference";
}

function freezeCatalogRow(row) {
  return Object.freeze({
    ...row,
    source_unit_ids: Object.freeze(row.source_unit_ids),
    required_fields: Object.freeze(row.required_fields),
    boundary_flags: NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    catalog_only: true,
    runtime_evaluator_unchanged: true,
  });
}

export function createPermissionKernelCp108FoundationCatalog() {
  const rows = [];
  for (const [microPhaseId, phase] of Object.entries(PHASES)) {
    for (let index = 1; index <= phase.count; index += 1) {
      const title = titleFor(microPhaseId, index);
      const deliverableType = deliverableTypeFor(title);
      rows.push(
        freezeCatalogRow({
          catalog_id: `${microPhaseId}.${title.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`,
          pack_id: PERMISSION_KERNEL_CP108_PACK_BINDING.pack_id,
          program_id: "RP02",
          phase_id: phaseIdFor(microPhaseId),
          micro_phase_id: microPhaseId,
          micro_title: phase.micro_title,
          phase_role: phase.phase_role,
          title,
          coverage_kind: coverageKindFor(title, phase.phase_role),
          deliverable_type: deliverableType,
          source_unit_ids: [unitIdFor(microPhaseId, index)],
          required_fields: ["pack_id", "program_id", "tenant_id", "matter_trace_reference", "permission_surface", "audit_hint_reference"],
          permission_surface: title.includes("Tenant") ? "tenant_scope" : "permission_reference",
          audit_hint_reference: "audit_hint_reference_only_until_rp03",
          matter_trace_reference: "matter_trace_reference_preserved",
          product_state_effect: "none",
        }),
      );
    }
  }
  return Object.freeze(rows);
}

export function createPermissionKernelCp108CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp108FoundationCatalog().flatMap((item) => item.source_unit_ids));
}

export function createPermissionKernelCp108FoundationManifest() {
  const rows = createPermissionKernelCp108FoundationCatalog();
  const unitIds = createPermissionKernelCp108CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const phaseCounts = rows.reduce((counts, row) => {
    counts[row.phase_id] = (counts[row.phase_id] ?? 0) + 1;
    return counts;
  }, {});
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP108_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp108_foundation_manifest",
    source_unit_range: PERMISSION_KERNEL_CP108_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: new Set(rows.map((row) => row.micro_phase_id)).size,
    phase_counts: Object.freeze(phaseCounts),
    deliverable_counts: Object.freeze(deliverableCounts),
    permission_surface_count: PERMISSION_KERNEL_CP108_FOUNDATION_CONTRACT.permission_surfaces.length,
    boundary_invariant_count: PERMISSION_KERNEL_CP108_FOUNDATION_CONTRACT.boundary_invariants.length,
    synthetic_only: true,
    no_real_data: true,
    no_write_attestation: NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP108_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP108_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp108HermesEvidencePacket() {
  const manifest = createPermissionKernelCp108FoundationManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP108_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp108_foundation_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-108",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp108ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP108_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp108_foundation_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-108 starts RP02 Permission Kernel with a 150-unit synthetic-only foundation catalog; no runtime policy mutation, no audit ledger writes, no product state writes, no external share/export/AI/LDIP implementation, and handoff to CP00-109/RP02.P01.M06.S01.",
  });
}

export function createPermissionKernelCp108CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP108_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP108_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP108_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP108_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP108_FOUNDATION_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp108Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp108FoundationCatalog();
  const unitIds = createPermissionKernelCp108CoveredUnitIds();
  const manifest = createPermissionKernelCp108FoundationManifest();
  const handoff = createPermissionKernelCp108CloseoutHandoff();

  if (rows.length !== PERMISSION_KERNEL_CP108_PACK_BINDING.unit_count) {
    errors.push(`CP00-108 row count must be ${PERMISSION_KERNEL_CP108_PACK_BINDING.unit_count}`);
  }
  if (unitIds.length !== PERMISSION_KERNEL_CP108_PACK_BINDING.unit_count) {
    errors.push(`CP00-108 covered unit count must be ${PERMISSION_KERNEL_CP108_PACK_BINDING.unit_count}`);
  }
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-108 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P00.M00.S01") errors.push("CP00-108 first unit must be RP02.P00.M00.S01");
  if (unitIds.at(-1) !== "RP02.P01.M05.S20") errors.push("CP00-108 last unit must be RP02.P01.M05.S20");
  if (manifest.phase_counts["RP02.P00"] !== 71) errors.push("CP00-108 RP02.P00 count must be 71");
  if (manifest.phase_counts["RP02.P01"] !== 79) errors.push("CP00-108 RP02.P01 count must be 79");
  if (manifest.covered_micro_phase_count !== 17) errors.push("CP00-108 must cover 17 micro phases");
  if (manifest.deliverable_counts.contract !== 6) errors.push("CP00-108 contract outline count must be 6");
  if (manifest.deliverable_counts.security_audit !== 10) errors.push("CP00-108 security audit reference count must be 10");
  if (manifest.deliverable_counts.test !== 9) errors.push("CP00-108 test reference count must be 9");
  if (manifest.deliverable_counts.hermes_evidence !== 3) errors.push("CP00-108 Hermes evidence reference count must be 3");
  if (manifest.deliverable_counts.claude_review !== 3) errors.push("CP00-108 Claude review reference count must be 3");
  for (const row of rows) {
    if (row.boundary_flags !== NO_WRITE_ATTESTATION) errors.push(`${row.catalog_id} must share no-write attestation`);
    if (!row.synthetic_only || !row.no_real_data || !row.catalog_only) errors.push(`${row.catalog_id} must stay synthetic catalog-only`);
    for (const [flag, value] of Object.entries(NO_WRITE_ATTESTATION)) {
      if (value !== false) errors.push(`CP00-108 no-write flag ${flag} must be false`);
    }
  }
  if (handoff.next_pack_id !== "CP00-109" || handoff.next_subphase_id !== "RP02.P01.M06.S01") {
    errors.push("CP00-108 must hand off to CP00-109 / RP02.P01.M06.S01");
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
