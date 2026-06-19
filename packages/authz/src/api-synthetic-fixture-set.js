import {
  PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT,
  createPermissionKernelCp113ApiPermissionAuditBindingFixture,
} from "./api-permission-audit-binding.js";

export const PERMISSION_KERNEL_CP114_PACK_BINDING = Object.freeze({
  pack_id: "CP00-114",
  planned_pack_id: "CP00-114",
  risk_class: "A",
  unit_count: 10,
  range: "RP02.P03.M05.S17-RP02.P03.M06.S06",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-113",
  next_pack_id: "CP00-115",
  next_subphase_id: "RP02.P03.M06.S07",
});

const CP114_TITLES = Object.freeze([
  "Versioning note",
  "Closeout handoff",
  "Downstream consumer note",
  "Command rerun",
  "Public export map",
  "Request contract",
  "Response contract",
  "Error code taxonomy",
  "Permission annotation",
  "Audit annotation",
]);

const CP114_DELIVERABLE_TYPES = Object.freeze({
  "Versioning note": "implementation",
  "Closeout handoff": "implementation",
  "Downstream consumer note": "implementation",
  "Command rerun": "implementation",
  "Public export map": "implementation",
  "Request contract": "contract",
  "Response contract": "contract",
  "Error code taxonomy": "implementation",
  "Permission annotation": "security_audit",
  "Audit annotation": "security_audit",
});

const CP114_NO_WRITE_ATTESTATION = Object.freeze({
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

export const PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP114_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp114_api_synthetic_fixture_set_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP114_PACK_BINDING.range,
  upstream_api_permission_audit_binding_pack_id: PERMISSION_KERNEL_CP114_PACK_BINDING.upstream_pack_id,
  covered_unit_count: PERMISSION_KERNEL_CP114_PACK_BINDING.unit_count,
  synthetic_only: true,
  risk_a_boundary_pack: true,
  metadata_only_fixture_set: true,
  version: "permission_api_binding.v0.1",
  no_write_attestation: CP114_NO_WRITE_ATTESTATION,
  fixture_surfaces: Object.freeze([
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
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP114_PACK_BINDING",
    "PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT",
    "createPermissionKernelCp114ApiSyntheticFixtureSetCatalog",
    "createPermissionKernelCp114CoveredUnitIds",
    "createPermissionKernelCp114ApiSyntheticFixtureSurface",
    "createPermissionKernelCp114ApiSyntheticFixtureMatrix",
    "createPermissionKernelCp114ApiSyntheticFixtureSetManifest",
    "createPermissionKernelCp114HermesEvidencePacket",
    "createPermissionKernelCp114ClaudeReviewPacket",
    "createPermissionKernelCp114CloseoutHandoff",
    "validatePermissionKernelCp114Coverage",
  ]),
  request_contract_fields: Object.freeze([
    "request_id",
    "api_version",
    "synthetic",
    "actor_id",
    "tenant_id",
    "matter_id",
    "action",
    "page",
    "page_size",
  ]),
  response_contract_fields: Object.freeze([
    "items",
    "page",
    "page_size",
    "next_cursor",
    "error_codes",
    "safety_codes",
    "omitted_fields",
    "allowlisted_fields",
  ]),
  error_codes: PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.error_codes,
  safety_codes: PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.safety_codes,
  permission_annotation_shape: Object.freeze(["source", "effect", "reason", "matched_rule_id", "persisted"]),
  audit_annotation_shape: Object.freeze(["source", "preview_only", "emitted_to_audit_ledger", "hint"]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP114_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP114_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel synthetic fixture set from RP02.P03.M06.S07 as Risk C; keep fixture surfaces synthetic-only and do not add runtime routes, persistence, audit writes, external sharing, AI retrieval, or LDIP implementation.",
  }),
});

function sourceUnitFor(offset) {
  const index = offset < 4 ? 17 + offset : 1 + (offset - 4);
  const microPhaseId = offset < 4 ? "RP02.P03.M05" : "RP02.P03.M06";
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function coverageKindFor(title) {
  return slugFor(title).replace("command_rerun", "command_rerun_reference");
}

function freezeCatalogRow(title, offset) {
  const microPhaseId = offset < 4 ? "RP02.P03.M05" : "RP02.P03.M06";
  return Object.freeze({
    catalog_id: `${microPhaseId}.${slugFor(title)}`,
    pack_id: PERMISSION_KERNEL_CP114_PACK_BINDING.pack_id,
    program_id: "RP02",
    area: "permission_api_synthetic_fixture_set",
    phase_id: "RP02.P03",
    micro_phase_id: microPhaseId,
    micro_title: offset < 4 ? "Permission And Audit Binding" : "Synthetic Fixture Set",
    phase_role: offset < 4 ? "api_permission_audit_binding_terminal" : "api_synthetic_fixture_set_opening",
    title,
    coverage_kind: coverageKindFor(title),
    deliverable_type: CP114_DELIVERABLE_TYPES[title],
    source_unit_ids: Object.freeze([sourceUnitFor(offset)]),
    required_assertions: Object.freeze([
      "synthetic_only",
      "public_export_map_matches_index_exports",
      "request_contract_versioned",
      "response_contract_allowlisted",
      "permission_annotation_metadata_only",
      "audit_annotation_preview_only",
      "no_permission_policy_mutation",
      "no_audit_write",
      "no_product_state_write",
    ]),
    boundary_flags: CP114_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    risk_a_boundary_pack: true,
    product_state_effect: "none",
  });
}

export function createPermissionKernelCp114ApiSyntheticFixtureSetCatalog() {
  return Object.freeze(CP114_TITLES.map((title, offset) => freezeCatalogRow(title, offset)));
}

export function createPermissionKernelCp114CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp114ApiSyntheticFixtureSetCatalog().flatMap((item) => item.source_unit_ids));
}

function versionedRequest(baseRequest) {
  return Object.freeze({
    ...baseRequest,
    api_version: PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.version,
  });
}

export function createPermissionKernelCp114ApiSyntheticFixtureSurface(request = {}) {
  const baseFixture = createPermissionKernelCp113ApiPermissionAuditBindingFixture(request);
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP114_PACK_BINDING.pack_id,
    fixture_surface_id: "permission_kernel_cp114_api_synthetic_fixture_surface",
    upstream_fixture_id: baseFixture.fixture_id,
    api_version: PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.version,
    public_export_map: Object.freeze({
      package: "@law-firm-os/authz",
      source_file: "packages/authz/src/api-synthetic-fixture-set.js",
      exported_symbols: PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.public_exports,
      runtime_route_exported: false,
      persistence_adapter_exported: false,
    }),
    request_contract: versionedRequest(baseFixture.request_contract),
    response_contract: baseFixture.response_contract,
    error_code_taxonomy: Object.freeze({
      error_codes: PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.error_codes,
      safety_codes: PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.safety_codes,
      permission_denied_exercised: baseFixture.response_contract.error_codes.includes("permission_denied"),
      invalid_pagination_exercised: baseFixture.response_contract.error_codes.includes("invalid_pagination"),
    }),
    permission_annotation: baseFixture.permission_annotation,
    audit_annotation: baseFixture.audit_annotation,
    downstream_consumer_note:
      "Downstream consumers may read this synthetic surface as a metadata-only contract; they must not treat it as a runtime API route, persistence adapter, audit writer, external share, AI retrieval path, or LDIP implementation.",
    command_rerun_reference: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-114",
    ]),
    writes_product_state: false,
    writes_audit_event: false,
    mutates_permission_policy: false,
    creates_database_rows: false,
    persists_idempotency_keys: false,
    acquires_locks: false,
    executes_export_download: false,
    executes_external_share: false,
    executes_ai_retrieval: false,
    no_write_attestation: CP114_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp114ApiSyntheticFixtureMatrix() {
  const surfaces = Object.freeze([
    createPermissionKernelCp114ApiSyntheticFixtureSurface(),
    createPermissionKernelCp114ApiSyntheticFixtureSurface({ decision: "deny" }),
    createPermissionKernelCp114ApiSyntheticFixtureSurface({ synthetic: false }),
    createPermissionKernelCp114ApiSyntheticFixtureSurface({ page_size: 101 }),
  ]);
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP114_PACK_BINDING.pack_id,
    fixture_surface_count: surfaces.length,
    surfaces,
    no_write_attestation: CP114_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp114ApiSyntheticFixtureSetManifest() {
  const rows = createPermissionKernelCp114ApiSyntheticFixtureSetCatalog();
  const unitIds = createPermissionKernelCp114CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const phaseCounts = rows.reduce((counts, row) => {
    counts[row.micro_phase_id] = (counts[row.micro_phase_id] ?? 0) + 1;
    return counts;
  }, {});
  const matrix = createPermissionKernelCp114ApiSyntheticFixtureMatrix();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP114_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp114_api_synthetic_fixture_set_manifest",
    source_unit_range: PERMISSION_KERNEL_CP114_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: new Set(rows.map((row) => row.micro_phase_id)).size,
    deliverable_counts: Object.freeze(deliverableCounts),
    phase_counts: Object.freeze(phaseCounts),
    fixture_surface_count: matrix.fixture_surface_count,
    synthetic_only: true,
    no_real_data: true,
    risk_a_boundary_pack: true,
    metadata_only_fixture_set: true,
    no_write_attestation: CP114_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP114_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP114_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp114HermesEvidencePacket() {
  const manifest = createPermissionKernelCp114ApiSyntheticFixtureSetManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP114_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp114_api_synthetic_fixture_set_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-114",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp114ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP114_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp114_api_synthetic_fixture_set_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-114 closes the planned Risk A RP02 API version/handoff and synthetic fixture opening units with versioned request contract, response contract, public export map, error taxonomy, permission/audit annotations, no runtime API route or persistence adapter, no permission/audit/product/database writes, no external share/export/AI/LDIP implementation, HRX embedded-only boundary, and handoff to CP00-115/RP02.P03.M06.S07.",
  });
}

export function createPermissionKernelCp114CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP114_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP114_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP114_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP114_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp114Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp114ApiSyntheticFixtureSetCatalog();
  const unitIds = createPermissionKernelCp114CoveredUnitIds();
  const manifest = createPermissionKernelCp114ApiSyntheticFixtureSetManifest();
  const matrix = createPermissionKernelCp114ApiSyntheticFixtureMatrix();
  const allowSurface = matrix.surfaces[0];
  const deniedSurface = matrix.surfaces[1];
  const invalidSurface = matrix.surfaces[2];
  const invalidPaginationSurface = matrix.surfaces[3];
  const handoff = createPermissionKernelCp114CloseoutHandoff();

  if (rows.length !== PERMISSION_KERNEL_CP114_PACK_BINDING.unit_count) errors.push("CP00-114 row count must be 10");
  if (unitIds.length !== PERMISSION_KERNEL_CP114_PACK_BINDING.unit_count) errors.push("CP00-114 covered unit count must be 10");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-114 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P03.M05.S17") errors.push("CP00-114 first unit must be RP02.P03.M05.S17");
  if (unitIds.at(-1) !== "RP02.P03.M06.S06") errors.push("CP00-114 last unit must be RP02.P03.M06.S06");
  if (manifest.phase_counts["RP02.P03.M05"] !== 4) errors.push("CP00-114 RP02.P03.M05 count must be 4");
  if (manifest.phase_counts["RP02.P03.M06"] !== 6) errors.push("CP00-114 RP02.P03.M06 count must be 6");
  if (manifest.deliverable_counts.implementation !== 6) errors.push("CP00-114 implementation deliverable count must be 6");
  if (manifest.deliverable_counts.contract !== 2) errors.push("CP00-114 contract deliverable count must be 2");
  if (manifest.deliverable_counts.security_audit !== 2) errors.push("CP00-114 security_audit deliverable count must be 2");
  if (matrix.fixture_surface_count !== 4) errors.push("CP00-114 fixture matrix must include 4 surfaces");

  for (const expected of PERMISSION_KERNEL_CP114_API_SYNTHETIC_FIXTURE_SET_CONTRACT.public_exports) {
    if (!allowSurface.public_export_map.exported_symbols.includes(expected)) errors.push(`CP00-114 public export map missing ${expected}`);
  }
  if (allowSurface.public_export_map.runtime_route_exported) errors.push("CP00-114 must not export runtime route");
  if (allowSurface.public_export_map.persistence_adapter_exported) errors.push("CP00-114 must not export persistence adapter");
  if (allowSurface.request_contract.api_version !== "permission_api_binding.v0.1") errors.push("CP00-114 request contract must be versioned");
  if (allowSurface.response_contract.items.length !== 1) errors.push("CP00-114 allow surface must include one synthetic response item");
  if (!allowSurface.response_contract.safety_codes.includes("unauthorized_data_omitted")) errors.push("CP00-114 response must carry unauthorized_data_omitted");
  if (allowSurface.permission_annotation.effect !== "allow") errors.push("CP00-114 permission annotation must bind allow effect");
  if (allowSurface.audit_annotation.preview_only !== true || allowSurface.audit_annotation.emitted_to_audit_ledger !== false) {
    errors.push("CP00-114 audit annotation must stay preview-only");
  }
  if (!deniedSurface.error_code_taxonomy.permission_denied_exercised) errors.push("CP00-114 denied surface must exercise permission_denied");
  if (!invalidPaginationSurface.error_code_taxonomy.invalid_pagination_exercised) {
    errors.push("CP00-114 invalid pagination surface must exercise invalid_pagination");
  }
  if (!invalidSurface.response_contract.error_codes.includes("non_synthetic_request_blocked")) {
    errors.push("CP00-114 non-synthetic surface must be blocked");
  }
  for (const surface of matrix.surfaces) {
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
      errors.push(`CP00-114 surface ${surface.fixture_surface_id} must remain metadata-only and no-write`);
    }
  }
  if (handoff.next_pack_id !== "CP00-115" || handoff.next_subphase_id !== "RP02.P03.M06.S07") {
    errors.push("CP00-114 must hand off to CP00-115 / RP02.P03.M06.S07");
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
