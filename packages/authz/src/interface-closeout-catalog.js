import { runPermissionKernelCp111SyntheticFixtureProfile } from "./synthetic-fixture-boundary.js";

export const PERMISSION_KERNEL_CP112_PACK_BINDING = Object.freeze({
  pack_id: "CP00-112",
  planned_pack_id: "CP00-112",
  risk_class: "C",
  unit_count: 150,
  range: "RP02.P02.M06.S13-RP02.P03.M05.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-111",
  next_pack_id: "CP00-113",
  next_subphase_id: "RP02.P03.M05.S07",
});

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

const CP112_SERVICE_PHASES = Object.freeze({
  "RP02.P02.M06": Object.freeze({
    start_index: 13,
    count: 10,
    micro_title: "Synthetic Fixture Set",
    phase_role: "service_fixture_terminal_validation",
  }),
  "RP02.P02.M07": Object.freeze({
    start_index: 1,
    count: 22,
    micro_title: "Test And Golden Case Set",
    phase_role: "service_test_golden_case_set",
  }),
  "RP02.P02.M08": Object.freeze({
    start_index: 1,
    count: 22,
    micro_title: "Hermes Evidence Packet",
    phase_role: "service_hermes_evidence_packet",
  }),
  "RP02.P02.M09": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Claude Review Packet",
    phase_role: "service_claude_review_packet",
  }),
  "RP02.P02.M10": Object.freeze({
    start_index: 1,
    count: 11,
    micro_title: "Closeout And Next Handoff",
    phase_role: "service_closeout_next_handoff",
  }),
});

const CP112_API_PHASES = Object.freeze({
  "RP02.P03.M00": Object.freeze({
    start_index: 1,
    count: 3,
    micro_title: "Scope Inventory",
    phase_role: "api_scope_inventory",
  }),
  "RP02.P03.M01": Object.freeze({
    start_index: 1,
    count: 8,
    micro_title: "Contract Draft",
    phase_role: "api_contract_draft",
  }),
  "RP02.P03.M02": Object.freeze({
    start_index: 1,
    count: 8,
    micro_title: "Type And Shape Definition",
    phase_role: "api_type_shape_definition",
  }),
  "RP02.P03.M03": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Primary Implementation Slice",
    phase_role: "api_primary_implementation_slice",
  }),
  "RP02.P03.M04": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Secondary Workflow Slice",
    phase_role: "api_secondary_workflow_slice",
  }),
  "RP02.P03.M05": Object.freeze({
    start_index: 1,
    count: 6,
    micro_title: "Permission And Audit Binding",
    phase_role: "api_permission_audit_binding",
  }),
});

const CP112_NO_WRITE_ATTESTATION = Object.freeze({
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

export const PERMISSION_KERNEL_CP112_INTERFACE_CLOSEOUT_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP112_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp112_interface_closeout_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP112_PACK_BINDING.range,
  upstream_synthetic_fixture_boundary_pack_id: PERMISSION_KERNEL_CP112_PACK_BINDING.upstream_pack_id,
  covered_unit_count: PERMISSION_KERNEL_CP112_PACK_BINDING.unit_count,
  synthetic_only: true,
  catalog_only: true,
  api_interface_scaffold_only: true,
  no_write_attestation: CP112_NO_WRITE_ATTESTATION,
  terminal_service_surfaces: Object.freeze([
    "validation_error_mapping",
    "review_required_routing",
    "approval_required_routing",
    "blocked_claim_output",
    "rollback_reference",
    "retry_reference",
    "happy_denied_review_smoke_tests",
    "hermes_evidence_packet_reference",
    "claude_review_packet_reference",
    "closeout_next_handoff",
  ]),
  api_interface_surfaces: Object.freeze([
    "public_export_map",
    "request_contract",
    "response_contract",
    "error_code_taxonomy",
    "permission_annotation",
    "audit_annotation",
    "pagination_filtering_contract",
    "serialization_guard",
    "unauthorized_data_omission",
    "api_fixture",
  ]),
  error_codes: Object.freeze([
    "non_synthetic_request_blocked",
    "tenant_boundary_precheck_failed",
    "matter_trace_precheck_failed",
    "permission_denied",
    "invalid_pagination",
    "unauthorized_data_omitted",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP112_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP112_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel API permission and audit binding from RP02.P03.M05.S07 as Risk A; do not widen unauthorized-data, tenant, matter, audit, external-share, AI, or LDIP boundaries.",
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
  if (title.includes("contract") || title === "API fixture") return "contract";
  if (title.includes("Permission") || title.includes("Audit")) return "security_audit";
  if (title.includes("State transition") || title.includes("Lock") || title.includes("Approval-required")) return "ui";
  if (title.includes("Hermes")) return "hermes_evidence";
  if (title.includes("Claude") || title.includes("Review-required")) return "claude_review";
  if (title.includes("Rollback") || title.includes("Retry")) return "failure_recovery";
  if (title.includes("test") || title.includes("smoke")) return "test";
  return "implementation";
}

function coverageKindFor(title, area) {
  if (title.includes("Validation")) return "validation_error_mapping";
  if (title.includes("Review-required")) return "review_required_routing";
  if (title.includes("Approval-required")) return "approval_required_routing";
  if (title.includes("Blocked-claim")) return "blocked_claim_output";
  if (title.includes("Rollback")) return "rollback_reference";
  if (title.includes("Retry")) return "retry_reference";
  if (title.includes("test") || title.includes("smoke")) return "test_reference";
  if (title.includes("Hermes")) return "hermes_evidence_reference";
  if (title.includes("Claude")) return "claude_review_reference";
  if (title.includes("export")) return "public_export_map";
  if (title.includes("Request")) return "request_contract";
  if (title.includes("Response")) return "response_contract";
  if (title.includes("Error")) return "error_code_taxonomy";
  if (title.includes("Permission")) return "permission_annotation";
  if (title.includes("Audit")) return "audit_annotation";
  if (title.includes("Pagination")) return "pagination_filtering_contract";
  if (title.includes("Serialization")) return "serialization_guard";
  if (title.includes("Unauthorized")) return "unauthorized_data_omission";
  if (title.includes("API fixture")) return "api_fixture";
  if (title.includes("Closeout")) return "closeout_handoff";
  return area === "permission_api_interface" ? "api_interface_reference" : "service_terminal_reference";
}

function freezeRow(row) {
  return Object.freeze({
    ...row,
    source_unit_ids: Object.freeze(row.source_unit_ids),
    required_assertions: Object.freeze(row.required_assertions),
    boundary_flags: CP112_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    catalog_only: true,
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
          pack_id: PERMISSION_KERNEL_CP112_PACK_BINDING.pack_id,
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
          required_assertions: [
            "synthetic_only",
            "no_real_data",
            "no_permission_policy_mutation",
            "no_audit_write",
            "no_product_state_write",
            "unauthorized_data_omitted_before_response",
          ],
          product_state_effect: "none",
        }),
      );
    }
  }
  return rows;
}

export function createPermissionKernelCp112InterfaceCloseoutCatalog() {
  return Object.freeze([
    ...buildRowsFor(CP112_SERVICE_PHASES, SERVICE_TITLES, "permission_service_terminal_closeout"),
    ...buildRowsFor(CP112_API_PHASES, API_TITLES, "permission_api_interface"),
  ]);
}

export function createPermissionKernelCp112CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp112InterfaceCloseoutCatalog().flatMap((item) => item.source_unit_ids));
}

function sanitizeInteger(value, fallback) {
  if (!Number.isInteger(value) || value < 1) return fallback;
  return value;
}

export function createPermissionKernelCp112ApiInterfaceFixture(request = {}) {
  const synthetic = request.synthetic !== false;
  const page = sanitizeInteger(request.page ?? 1, 1);
  const pageSize = sanitizeInteger(request.page_size ?? 25, 25);
  const principal = Object.freeze({
    user_id: request.actor_id ?? "u_interface_fixture",
    tenant_id: request.tenant_id ?? "t_interface",
    role_ids: Object.freeze(request.role_ids ?? ["attorney"]),
  });
  const resource = Object.freeze({
    resource_id: request.resource_id ?? "d_interface",
    resource_type: request.resource_type ?? "Document",
    tenant_id: request.resource_tenant_id ?? principal.tenant_id,
    matter_id: request.resource_matter_id ?? request.matter_id ?? "m_interface",
    title: request.title ?? "Synthetic permission interface document",
    privileged_note: request.privileged_note ?? "redacted privileged fixture note",
    cross_tenant_secret: request.cross_tenant_secret ?? "redacted cross tenant fixture secret",
  });
  const errors = [];
  if (!synthetic) errors.push("non_synthetic_request_blocked");
  if (principal.tenant_id !== resource.tenant_id) errors.push("tenant_boundary_precheck_failed");
  if ((request.matter_id ?? resource.matter_id) !== resource.matter_id) errors.push("matter_trace_precheck_failed");
  if (request.page_size !== undefined && (!Number.isInteger(request.page_size) || request.page_size < 1 || request.page_size > 100)) {
    errors.push("invalid_pagination");
  }
  const omittedFields = ["privileged_note", "cross_tenant_secret"];
  const responseItem = Object.freeze({
    resource_id: resource.resource_id,
    resource_type: resource.resource_type,
    tenant_id: resource.tenant_id,
    matter_id: resource.matter_id,
    title: resource.title,
    permission_annotation: "permission_kernel.synthetic_interface_preview",
    audit_annotation: "audit_hint_preview_only_until_rp03",
  });
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP112_PACK_BINDING.pack_id,
    fixture_id: "permission_kernel_cp112_api_interface_fixture",
    status: errors.length > 0 ? "invalid_request_mapped" : "ready_metadata_only_response",
    request_contract: Object.freeze({
      request_id: request.request_id ?? "cp112_api_fixture_request",
      synthetic,
      actor_id: principal.user_id,
      tenant_id: principal.tenant_id,
      matter_id: request.matter_id ?? resource.matter_id,
      action: request.action ?? "permission.interface.preview",
      page,
      page_size: pageSize,
    }),
    response_contract: Object.freeze({
      items: Object.freeze(errors.length > 0 ? [] : [responseItem]),
      page,
      page_size: pageSize,
      next_cursor: null,
      omitted_fields: Object.freeze(omittedFields),
      error_codes: Object.freeze(errors),
    }),
    unauthorized_data_omitted: true,
    permission_annotation: "permission_kernel.synthetic_interface_preview",
    audit_annotation: "audit_hint_preview_only_until_rp03",
    writes_product_state: false,
    writes_audit_event: false,
    creates_database_rows: false,
    executes_export_download: false,
    executes_external_share: false,
    executes_ai_retrieval: false,
    no_write_attestation: CP112_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp112TerminalFixtureMatrix() {
  const profiles = [
    runPermissionKernelCp111SyntheticFixtureProfile("permission_allow"),
    runPermissionKernelCp111SyntheticFixtureProfile("permission_deny"),
    runPermissionKernelCp111SyntheticFixtureProfile("state_transition_review_required"),
    runPermissionKernelCp111SyntheticFixtureProfile("audit_hint_preview"),
    runPermissionKernelCp111SyntheticFixtureProfile("idempotency_receipt_metadata_only"),
    runPermissionKernelCp111SyntheticFixtureProfile("lock_receipt_metadata_only"),
    runPermissionKernelCp111SyntheticFixtureProfile("persistence_boundary_metadata_only"),
  ];
  const apiFixtures = [
    createPermissionKernelCp112ApiInterfaceFixture(),
    createPermissionKernelCp112ApiInterfaceFixture({ synthetic: false }),
    createPermissionKernelCp112ApiInterfaceFixture({ tenant_id: "t_interface", resource_tenant_id: "t_other" }),
    createPermissionKernelCp112ApiInterfaceFixture({ page_size: 101 }),
  ];
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP112_PACK_BINDING.pack_id,
    service_profiles: Object.freeze(profiles),
    api_fixtures: Object.freeze(apiFixtures),
    service_profile_count: profiles.length,
    api_fixture_count: apiFixtures.length,
    no_write_attestation: CP112_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp112InterfaceCloseoutManifest() {
  const rows = createPermissionKernelCp112InterfaceCloseoutCatalog();
  const unitIds = createPermissionKernelCp112CoveredUnitIds();
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
  const matrix = createPermissionKernelCp112TerminalFixtureMatrix();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP112_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp112_interface_closeout_manifest",
    source_unit_range: PERMISSION_KERNEL_CP112_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: new Set(rows.map((row) => row.micro_phase_id)).size,
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    deliverable_counts: Object.freeze(deliverableCounts),
    service_profile_count: matrix.service_profile_count,
    api_fixture_count: matrix.api_fixture_count,
    synthetic_only: true,
    no_real_data: true,
    catalog_only: true,
    no_write_attestation: CP112_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP112_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP112_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp112HermesEvidencePacket() {
  const manifest = createPermissionKernelCp112InterfaceCloseoutManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP112_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp112_interface_closeout_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-112",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp112ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP112_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp112_interface_closeout_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-112 closes the planned Risk C RP02 terminal fixture/evidence/Claude/closeout and API interface scaffold units with synthetic-only catalogs, unauthorized data omission, validation error mapping, metadata-only evidence packets, no audit/product-state/database writes, no external share/export/AI/LDIP implementation, HRX embedded-only boundary, and handoff to CP00-113/RP02.P03.M05.S07.",
  });
}

export function createPermissionKernelCp112CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP112_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP112_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP112_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP112_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP112_INTERFACE_CLOSEOUT_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp112Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp112InterfaceCloseoutCatalog();
  const unitIds = createPermissionKernelCp112CoveredUnitIds();
  const manifest = createPermissionKernelCp112InterfaceCloseoutManifest();
  const matrix = createPermissionKernelCp112TerminalFixtureMatrix();
  const apiFixture = createPermissionKernelCp112ApiInterfaceFixture();
  const invalidFixture = createPermissionKernelCp112ApiInterfaceFixture({ synthetic: false });
  const crossTenantFixture = createPermissionKernelCp112ApiInterfaceFixture({ tenant_id: "t_interface", resource_tenant_id: "t_other" });
  const matterDriftFixture = createPermissionKernelCp112ApiInterfaceFixture({
    matter_id: "m_request_context",
    resource_matter_id: "m_resource_context",
  });
  const handoff = createPermissionKernelCp112CloseoutHandoff();

  if (rows.length !== PERMISSION_KERNEL_CP112_PACK_BINDING.unit_count) errors.push("CP00-112 row count must be 150");
  if (unitIds.length !== PERMISSION_KERNEL_CP112_PACK_BINDING.unit_count) errors.push("CP00-112 covered unit count must be 150");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-112 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P02.M06.S13") errors.push("CP00-112 first unit must be RP02.P02.M06.S13");
  if (unitIds.at(-1) !== "RP02.P03.M05.S06") errors.push("CP00-112 last unit must be RP02.P03.M05.S06");
  if (manifest.area_counts.permission_service_terminal_closeout !== 85) errors.push("CP00-112 service terminal area count must be 85");
  if (manifest.area_counts.permission_api_interface !== 65) errors.push("CP00-112 API interface area count must be 65");
  if (manifest.covered_micro_phase_count !== 11) errors.push("CP00-112 must cover 11 micro phases");
  if (manifest.deliverable_counts.implementation !== 62) errors.push("CP00-112 implementation deliverable count must be 62");
  if (manifest.deliverable_counts.contract !== 22) errors.push("CP00-112 contract deliverable count must be 22");
  if (manifest.deliverable_counts.security_audit !== 18) errors.push("CP00-112 security_audit deliverable count must be 18");
  if (manifest.deliverable_counts.ui !== 12) errors.push("CP00-112 ui deliverable count must be 12");
  if (manifest.deliverable_counts.claude_review !== 6) errors.push("CP00-112 Claude review deliverable count must be 6");
  if (manifest.deliverable_counts.failure_recovery !== 8) errors.push("CP00-112 failure recovery deliverable count must be 8");
  if (manifest.deliverable_counts.test !== 20) errors.push("CP00-112 test deliverable count must be 20");
  if (manifest.deliverable_counts.hermes_evidence !== 2) errors.push("CP00-112 Hermes evidence deliverable count must be 2");
  for (const row of rows) {
    if (row.boundary_flags !== CP112_NO_WRITE_ATTESTATION) errors.push(`${row.catalog_id} must share no-write attestation`);
    if (!row.synthetic_only || !row.no_real_data || !row.catalog_only) errors.push(`${row.catalog_id} must stay synthetic catalog-only`);
  }
  if (!apiFixture.unauthorized_data_omitted) errors.push("CP00-112 API fixture must omit unauthorized data");
  if (apiFixture.response_contract.items[0]?.privileged_note !== undefined) errors.push("CP00-112 API fixture must not expose privileged_note");
  if (apiFixture.response_contract.items[0]?.cross_tenant_secret !== undefined) errors.push("CP00-112 API fixture must not expose cross_tenant_secret");
  if (apiFixture.writes_product_state || apiFixture.writes_audit_event || apiFixture.creates_database_rows) {
    errors.push("CP00-112 API fixture must not write product, audit, or database state");
  }
  if (!invalidFixture.response_contract.error_codes.includes("non_synthetic_request_blocked")) {
    errors.push("CP00-112 invalid fixture must map non-synthetic requests");
  }
  if (!crossTenantFixture.response_contract.error_codes.includes("tenant_boundary_precheck_failed")) {
    errors.push("CP00-112 cross-tenant fixture must map tenant boundary failure");
  }
  if (!matterDriftFixture.response_contract.error_codes.includes("matter_trace_precheck_failed")) {
    errors.push("CP00-112 matter-drift fixture must map matter trace precheck failure");
  }
  for (const profile of matrix.service_profiles) {
    if (profile.idempotency_persisted || profile.lock_acquired || profile.writes_product_state || profile.writes_audit_event) {
      errors.push(`CP00-112 service profile ${profile.profile_name} must remain metadata-only`);
    }
  }
  if (handoff.next_pack_id !== "CP00-113" || handoff.next_subphase_id !== "RP02.P03.M05.S07") {
    errors.push("CP00-112 must hand off to CP00-113 / RP02.P03.M05.S07");
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
