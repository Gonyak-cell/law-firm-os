export const PERMISSION_KERNEL_CP109_PACK_BINDING = Object.freeze({
  pack_id: "CP00-109",
  planned_pack_id: "CP00-109",
  risk_class: "C",
  unit_count: 150,
  range: "RP02.P01.M06.S01-RP02.P02.M04.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-108",
  next_pack_id: "CP00-110",
  next_subphase_id: "RP02.P02.M04.S07",
});

const CP109_MODEL_PHASES = Object.freeze({
  "RP02.P01.M06": Object.freeze({ count: 20, micro_title: "Synthetic Fixture Set", phase_role: "model_synthetic_fixture_set" }),
  "RP02.P01.M07": Object.freeze({ count: 20, micro_title: "Test And Golden Case Set", phase_role: "model_test_golden_case_set" }),
  "RP02.P01.M08": Object.freeze({ count: 20, micro_title: "Hermes Evidence Packet", phase_role: "model_hermes_evidence_packet" }),
  "RP02.P01.M09": Object.freeze({ count: 8, micro_title: "Claude Review Packet", phase_role: "model_claude_review_packet" }),
  "RP02.P01.M10": Object.freeze({ count: 3, micro_title: "Closeout And Next Handoff", phase_role: "model_closeout_handoff" }),
});

const CP109_SERVICE_PHASES = Object.freeze({
  "RP02.P02.M00": Object.freeze({ count: 11, micro_title: "Scope Inventory", phase_role: "service_scope_inventory" }),
  "RP02.P02.M01": Object.freeze({ count: 20, micro_title: "Contract Draft", phase_role: "service_contract_draft" }),
  "RP02.P02.M02": Object.freeze({ count: 20, micro_title: "Type And Shape Definition", phase_role: "service_type_shape_definition" }),
  "RP02.P02.M03": Object.freeze({ count: 22, micro_title: "Primary Implementation Slice", phase_role: "service_primary_implementation_slice" }),
  "RP02.P02.M04": Object.freeze({ count: 6, micro_title: "Secondary Workflow Slice", phase_role: "service_secondary_workflow_slice" }),
});

const MODEL_TITLES = Object.freeze([
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

const SERVICE_TITLES = Object.freeze([
  "Service entrypoint contract",
  "Request normalization",
  "Tenant boundary precheck",
  "Matter trace precheck",
  "Permission precheck",
  "Audit hint precheck",
  "Primary happy path",
  "Secondary workflow path",
  "State transition enforcement",
  "Idempotency key handling",
  "Lock acquisition rule",
  "Persistence boundary",
  "Validation error mapping",
  "Review-required routing",
  "Approval-required routing",
  "Blocked-claim output",
  "Rollback behavior",
  "Retry behavior",
  "Unit test: happy path",
  "Unit test: denied path",
  "Unit test: review path",
  "Integration smoke case",
]);

const CP109_NO_WRITE_ATTESTATION = Object.freeze({
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

export const PERMISSION_KERNEL_CP109_MODEL_SERVICE_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP109_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp109_model_service_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP109_PACK_BINDING.range,
  upstream_foundation_pack_id: PERMISSION_KERNEL_CP109_PACK_BINDING.upstream_pack_id,
  covered_unit_count: PERMISSION_KERNEL_CP109_PACK_BINDING.unit_count,
  covered_model_unit_count: 71,
  covered_service_unit_count: 79,
  synthetic_only: true,
  catalog_only: true,
  metadata_precheck_only: true,
  no_write_attestation: CP109_NO_WRITE_ATTESTATION,
  service_entrypoints: Object.freeze([
    "normalize_permission_request",
    "precheck_tenant_boundary",
    "precheck_matter_trace",
    "prepare_permission_precheck_reference",
    "prepare_audit_hint_reference",
  ]),
  precheck_order: Object.freeze([
    "request_normalization",
    "tenant_boundary_precheck",
    "matter_trace_precheck",
    "permission_precheck_reference",
    "audit_hint_precheck_reference",
  ]),
  failure_boundaries: Object.freeze([
    "tenant_boundary_blocks_before_permission_precheck",
    "matter_trace_blocks_before_permission_precheck",
    "idempotency_key_is_metadata_only",
    "lock_acquisition_is_not_executed",
    "rollback_and_retry_are_reference_only",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP109_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP109_PACK_BINDING.next_subphase_id,
    next_scope: "Continue RP02 service workflow implementation from RP02.P02.M04.S07 without widening Risk A permission boundaries.",
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
  if (title === "Service entrypoint contract") return "contract";
  if (title === "Permission precheck" || title === "Audit hint precheck") return "security_audit";
  if (title === "Package directory layout" || title === "Required field registry" || title === "State transition map") return "ui";
  if (title === "State transition enforcement" || title === "Lock acquisition rule" || title === "Approval-required routing") return "ui";
  if (title === "Fixture model") return "fixture";
  if (title.startsWith("Unit test") || title === "Integration smoke case") return "test";
  if (title === "Model unit test" || title === "Invalid reference test" || title === "Ownership drift test") return "test";
  if (title === "Hermes model summary") return "hermes_evidence";
  if (title === "Claude model review prompt" || title === "Review-required routing") return "claude_review";
  if (title === "Rollback behavior" || title === "Retry behavior") return "failure_recovery";
  return "implementation";
}

function coverageKindFor(title, phaseRole) {
  if (title.includes("entrypoint")) return "service_contract";
  if (title.includes("normalization")) return "request_normalization";
  if (title.includes("Tenant")) return "tenant_boundary";
  if (title.includes("Matter")) return "matter_trace";
  if (title.includes("Permission")) return "permission_precheck_reference";
  if (title.includes("Audit")) return "audit_hint_reference";
  if (title.includes("Idempotency")) return "idempotency_metadata_reference";
  if (title.includes("Lock")) return "lock_reference";
  if (title.includes("Rollback")) return "rollback_reference";
  if (title.includes("Retry")) return "retry_reference";
  if (title.includes("test") || title.includes("smoke")) return "test_reference";
  if (title.includes("Hermes")) return "hermes_evidence_reference";
  if (title.includes("Claude") || title.includes("Review-required")) return "claude_review_reference";
  if (title.includes("Closeout")) return "closeout_handoff";
  if (phaseRole.includes("model")) return "model_reference";
  return "service_reference";
}

function freezeCatalogRow(row) {
  return Object.freeze({
    ...row,
    source_unit_ids: Object.freeze(row.source_unit_ids),
    required_fields: Object.freeze(row.required_fields),
    boundary_flags: CP109_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    catalog_only: true,
    metadata_precheck_only: true,
  });
}

function buildRowsFor(phases, titleSet, area) {
  const rows = [];
  for (const [microPhaseId, phase] of Object.entries(phases)) {
    for (let index = 1; index <= phase.count; index += 1) {
      const title = titleSet[index - 1];
      rows.push(
        freezeCatalogRow({
          catalog_id: `${microPhaseId}.${slugFor(title)}`,
          pack_id: PERMISSION_KERNEL_CP109_PACK_BINDING.pack_id,
          program_id: "RP02",
          area,
          phase_id: phaseIdFor(microPhaseId),
          micro_phase_id: microPhaseId,
          micro_title: phase.micro_title,
          phase_role: phase.phase_role,
          title,
          coverage_kind: coverageKindFor(title, phase.phase_role),
          deliverable_type: deliverableTypeFor(title),
          source_unit_ids: [unitIdFor(microPhaseId, index)],
          required_fields: [
            "pack_id",
            "program_id",
            "tenant_id",
            "matter_trace_reference",
            "permission_precheck_reference",
            "audit_hint_reference",
          ],
          permission_precheck_reference: "reference_only_no_policy_mutation",
          audit_hint_reference: "reference_only_until_rp03",
          matter_trace_reference: "matter_trace_precheck_metadata_only",
          product_state_effect: "none",
        }),
      );
    }
  }
  return rows;
}

export function createPermissionKernelCp109ModelServiceCatalog() {
  return Object.freeze([
    ...buildRowsFor(CP109_MODEL_PHASES, MODEL_TITLES, "permission_model"),
    ...buildRowsFor(CP109_SERVICE_PHASES, SERVICE_TITLES, "permission_service"),
  ]);
}

export function createPermissionKernelCp109CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp109ModelServiceCatalog().flatMap((item) => item.source_unit_ids));
}

export function createPermissionKernelCp109ServicePrecheck(request) {
  const normalized = Object.freeze({
    request_id: request?.request_id ?? "pk_cp109_request_synthetic",
    tenant_id: request?.tenant_id ?? "t_synthetic",
    actor_id: request?.actor_id ?? "u_synthetic",
    matter_id: request?.matter_id ?? null,
    resource_tenant_id: request?.resource?.tenant_id ?? request?.tenant_id ?? "t_synthetic",
    resource_matter_id: request?.resource?.matter_id ?? request?.matter_id ?? null,
    action: request?.action ?? "permission.preview",
    synthetic: request?.synthetic !== false,
  });
  const tenantOk = normalized.tenant_id === normalized.resource_tenant_id;
  const matterOk = !normalized.matter_id || !normalized.resource_matter_id || normalized.matter_id === normalized.resource_matter_id;
  const blocked = !normalized.synthetic || !tenantOk || !matterOk;
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP109_PACK_BINDING.pack_id,
    normalized_request: normalized,
    status: blocked ? "blocked_before_permission_evaluation" : "ready_for_permission_evaluator",
    tenant_boundary_precheck: tenantOk ? "pass" : "fail",
    matter_trace_precheck: matterOk ? "pass" : "fail",
    permission_precheck: blocked ? "not_evaluated" : "reference_only",
    audit_hint_precheck: blocked ? "minimal_block_hint_reference" : "reference_only",
    reason: !normalized.synthetic ? "non_synthetic_request_blocked" : !tenantOk ? "tenant_boundary_precheck_failed" : !matterOk ? "matter_trace_precheck_failed" : "metadata_precheck_passed",
    writes_product_state: false,
    writes_audit_event: false,
    mutates_permission_policy: false,
  });
}

export function createPermissionKernelCp109ModelServiceManifest() {
  const rows = createPermissionKernelCp109ModelServiceCatalog();
  const unitIds = createPermissionKernelCp109CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const areaCounts = rows.reduce((counts, row) => {
    counts[row.area] = (counts[row.area] ?? 0) + 1;
    return counts;
  }, {});
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP109_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp109_model_service_manifest",
    source_unit_range: PERMISSION_KERNEL_CP109_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: new Set(rows.map((row) => row.micro_phase_id)).size,
    area_counts: Object.freeze(areaCounts),
    deliverable_counts: Object.freeze(deliverableCounts),
    service_entrypoint_count: PERMISSION_KERNEL_CP109_MODEL_SERVICE_CONTRACT.service_entrypoints.length,
    precheck_order_count: PERMISSION_KERNEL_CP109_MODEL_SERVICE_CONTRACT.precheck_order.length,
    synthetic_only: true,
    no_real_data: true,
    metadata_precheck_only: true,
    no_write_attestation: CP109_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP109_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP109_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp109HermesEvidencePacket() {
  const manifest = createPermissionKernelCp109ModelServiceManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP109_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp109_model_service_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-109",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp109ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP109_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp109_model_service_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-109 extends RP02 Permission Kernel with model fixture/test/evidence references and metadata-only service prechecks; no permission policy mutation, no audit writes, no product state writes, no external share/export/AI/LDIP implementation, and handoff to CP00-110/RP02.P02.M04.S07.",
  });
}

export function createPermissionKernelCp109CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP109_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP109_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP109_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP109_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP109_MODEL_SERVICE_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp109Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp109ModelServiceCatalog();
  const unitIds = createPermissionKernelCp109CoveredUnitIds();
  const manifest = createPermissionKernelCp109ModelServiceManifest();
  const handoff = createPermissionKernelCp109CloseoutHandoff();

  if (rows.length !== PERMISSION_KERNEL_CP109_PACK_BINDING.unit_count) errors.push("CP00-109 row count must be 150");
  if (unitIds.length !== PERMISSION_KERNEL_CP109_PACK_BINDING.unit_count) errors.push("CP00-109 covered unit count must be 150");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-109 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P01.M06.S01") errors.push("CP00-109 first unit must be RP02.P01.M06.S01");
  if (unitIds.at(-1) !== "RP02.P02.M04.S06") errors.push("CP00-109 last unit must be RP02.P02.M04.S06");
  if (manifest.area_counts.permission_model !== 71) errors.push("CP00-109 model count must be 71");
  if (manifest.area_counts.permission_service !== 79) errors.push("CP00-109 service count must be 79");
  if (manifest.covered_micro_phase_count !== 10) errors.push("CP00-109 must cover 10 micro phases");
  if (manifest.deliverable_counts.implementation !== 77) errors.push("CP00-109 implementation deliverable count must be 77");
  if (manifest.deliverable_counts.ui !== 23) errors.push("CP00-109 ui deliverable count must be 23");
  if (manifest.deliverable_counts.contract !== 5) errors.push("CP00-109 contract deliverable count must be 5");
  if (manifest.deliverable_counts.security_audit !== 10) errors.push("CP00-109 security_audit deliverable count must be 10");
  if (manifest.deliverable_counts.test !== 17) errors.push("CP00-109 test deliverable count must be 17");
  if (manifest.deliverable_counts.fixture !== 3) errors.push("CP00-109 fixture deliverable count must be 3");
  if (manifest.deliverable_counts.hermes_evidence !== 3) errors.push("CP00-109 Hermes evidence count must be 3");
  if (manifest.deliverable_counts.claude_review !== 6) errors.push("CP00-109 Claude review count must be 6");
  if (manifest.deliverable_counts.failure_recovery !== 6) errors.push("CP00-109 failure recovery count must be 6");
  for (const row of rows) {
    if (row.boundary_flags !== CP109_NO_WRITE_ATTESTATION) errors.push(`${row.catalog_id} must share no-write attestation`);
    if (!row.synthetic_only || !row.no_real_data || !row.catalog_only) errors.push(`${row.catalog_id} must stay synthetic catalog-only`);
  }
  const passPrecheck = createPermissionKernelCp109ServicePrecheck({
    synthetic: true,
    tenant_id: "t_synthetic",
    matter_id: "m_001",
    resource: { tenant_id: "t_synthetic", matter_id: "m_001" },
  });
  const blockedPrecheck = createPermissionKernelCp109ServicePrecheck({
    synthetic: true,
    tenant_id: "t_synthetic",
    matter_id: "m_001",
    resource: { tenant_id: "t_other", matter_id: "m_001" },
  });
  if (passPrecheck.status !== "ready_for_permission_evaluator") errors.push("CP00-109 pass precheck must be ready_for_permission_evaluator");
  if (blockedPrecheck.status !== "blocked_before_permission_evaluation") errors.push("CP00-109 cross-tenant precheck must block before evaluator");
  if (handoff.next_pack_id !== "CP00-110" || handoff.next_subphase_id !== "RP02.P02.M04.S07") {
    errors.push("CP00-109 must hand off to CP00-110 / RP02.P02.M04.S07");
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
