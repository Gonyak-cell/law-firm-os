import { evaluatePermission } from "./evaluate.js";

export const PERMISSION_KERNEL_CP113_PACK_BINDING = Object.freeze({
  pack_id: "CP00-113",
  planned_pack_id: "CP00-113",
  risk_class: "A",
  unit_count: 10,
  range: "RP02.P03.M05.S07-RP02.P03.M05.S16",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-112",
  next_pack_id: "CP00-114",
  next_subphase_id: "RP02.P03.M05.S17",
});

const CP113_TITLES = Object.freeze([
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
]);

const CP113_DELIVERABLE_TYPES = Object.freeze({
  "Pagination or filtering contract": "contract",
  "Serialization guard": "implementation",
  "Unauthorized data omission": "implementation",
  "API fixture": "contract",
  "Contract test": "test",
  "Invalid request test": "test",
  "Denied response test": "test",
  "Hermes API evidence": "hermes_evidence",
  "Claude interface prompt": "claude_review",
  "Documentation example": "implementation",
});

const CP113_COVERAGE_KINDS = Object.freeze({
  "Pagination or filtering contract": "pagination_filtering_contract",
  "Serialization guard": "serialization_guard",
  "Unauthorized data omission": "unauthorized_data_omission",
  "API fixture": "api_fixture",
  "Contract test": "contract_test",
  "Invalid request test": "invalid_request_test",
  "Denied response test": "denied_response_test",
  "Hermes API evidence": "hermes_api_evidence",
  "Claude interface prompt": "claude_interface_prompt",
  "Documentation example": "documentation_example",
});

const CP113_NO_WRITE_ATTESTATION = Object.freeze({
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

export const PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP113_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp113_api_permission_audit_binding_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP113_PACK_BINDING.range,
  upstream_interface_closeout_pack_id: PERMISSION_KERNEL_CP113_PACK_BINDING.upstream_pack_id,
  covered_unit_count: PERMISSION_KERNEL_CP113_PACK_BINDING.unit_count,
  synthetic_only: true,
  risk_a_boundary_pack: true,
  metadata_only_api_binding: true,
  permission_evaluator_invoked_on_synthetic_inputs: true,
  audit_write_deferred_to_rp03: true,
  no_write_attestation: CP113_NO_WRITE_ATTESTATION,
  api_binding_surfaces: Object.freeze([
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
  ]),
  error_codes: Object.freeze([
    "non_synthetic_request_blocked",
    "tenant_boundary_precheck_failed",
    "matter_trace_precheck_failed",
    "permission_denied",
    "invalid_pagination",
  ]),
  safety_codes: Object.freeze(["unauthorized_data_omitted"]),
  serialized_response_allowlist: Object.freeze([
    "resource_id",
    "resource_type",
    "tenant_id",
    "matter_id",
    "title",
    "permission_annotation",
    "audit_annotation",
  ]),
  hidden_source_fields: Object.freeze([
    "privileged_note",
    "cross_tenant_secret",
    "internal_policy_label",
    "sealed_audit_hint_payload",
  ]),
  pagination_contract: Object.freeze({
    page_min: 1,
    page_size_min: 1,
    page_size_max: 100,
    invalid_code: "invalid_pagination",
  }),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP113_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP113_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel API permission and audit binding from RP02.P03.M05.S17 as Risk A; keep serialization, permission denial, audit preview, and unauthorized-data omission fail-closed.",
  }),
});

function unitIdFor(index) {
  return `RP02.P03.M05.S${String(index).padStart(2, "0")}`;
}

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function freezeCatalogRow(title, offset) {
  return Object.freeze({
    catalog_id: `RP02.P03.M05.${slugFor(title)}`,
    pack_id: PERMISSION_KERNEL_CP113_PACK_BINDING.pack_id,
    program_id: "RP02",
    area: "permission_api_permission_audit_binding",
    phase_id: "RP02.P03",
    micro_phase_id: "RP02.P03.M05",
    micro_title: "Permission And Audit Binding",
    phase_role: "api_permission_audit_binding_risk_a",
    title,
    coverage_kind: CP113_COVERAGE_KINDS[title],
    deliverable_type: CP113_DELIVERABLE_TYPES[title],
    source_unit_ids: Object.freeze([unitIdFor(7 + offset)]),
    required_assertions: Object.freeze([
      "synthetic_only",
      "permission_evaluator_invoked_only_after_prechecks",
      "audit_annotation_preview_only",
      "serialization_allowlist_enforced",
      "unauthorized_data_omitted_before_response",
      "no_permission_policy_mutation",
      "no_audit_write",
      "no_product_state_write",
    ]),
    boundary_flags: CP113_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    risk_a_boundary_pack: true,
    product_state_effect: "none",
  });
}

export function createPermissionKernelCp113ApiPermissionAuditBindingCatalog() {
  return Object.freeze(CP113_TITLES.map((title, offset) => freezeCatalogRow(title, offset)));
}

export function createPermissionKernelCp113CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp113ApiPermissionAuditBindingCatalog().flatMap((item) => item.source_unit_ids));
}

function isValidIntegerInRange(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function defaultPrincipal(request = {}) {
  return Object.freeze({
    user_id: request.actor_id ?? "u_cp113_api_binding",
    tenant_id: request.tenant_id ?? "t_cp113",
    role_ids: Object.freeze(request.role_ids ?? ["attorney"]),
  });
}

function defaultResource(request = {}, principal) {
  return Object.freeze({
    resource_id: request.resource_id ?? "d_cp113_permission_api",
    resource_type: request.resource_type ?? "Document",
    tenant_id: request.resource_tenant_id ?? principal.tenant_id,
    matter_id: request.resource_matter_id ?? request.matter_id ?? "m_cp113",
    title: request.title ?? "Synthetic CP113 permission API document",
    privileged_note: request.privileged_note ?? "privileged synthetic source note",
    cross_tenant_secret: request.cross_tenant_secret ?? "cross tenant synthetic source secret",
    internal_policy_label: request.internal_policy_label ?? "policy/internal/ethical-wall",
    sealed_audit_hint_payload: request.sealed_audit_hint_payload ?? "sealed synthetic audit payload",
  });
}

function defaultRules(request = {}, resource) {
  if (request.rules) return request.rules;
  if (request.decision === "deny") {
    return [
      {
        id: "cp113_deny_rule",
        effect: "deny",
        role_id: "attorney",
        resource_type: resource.resource_type,
        action: request.action ?? "document.view",
        reason: "permission_denied",
      },
    ];
  }
  return [
    {
      id: "cp113_allow_rule",
      effect: "allow",
      role_id: "attorney",
      resource_type: resource.resource_type,
      action: request.action ?? "document.view",
      reason: "synthetic_allow",
    },
  ];
}

function serializeResource(resource, permissionAnnotation, auditAnnotation) {
  return Object.freeze({
    resource_id: resource.resource_id,
    resource_type: resource.resource_type,
    tenant_id: resource.tenant_id,
    matter_id: resource.matter_id,
    title: resource.title,
    permission_annotation: permissionAnnotation,
    audit_annotation: auditAnnotation,
  });
}

function sanitizeAuditHint(hint) {
  if (!hint) return null;
  return Object.freeze({
    actor_id: hint.actor_id,
    action: hint.action,
    object_id: hint.object_id,
    tenant_id: hint.tenant_id,
    reason: hint.reason,
    effect: hint.effect,
  });
}

export function createPermissionKernelCp113ApiPermissionAuditBindingFixture(request = {}) {
  const synthetic = request.synthetic !== false;
  const principal = defaultPrincipal(request);
  const resource = defaultResource(request, principal);
  const action = request.action ?? "document.view";
  const page = request.page ?? 1;
  const pageSize = request.page_size ?? 25;
  const errors = [];

  if (!synthetic) errors.push("non_synthetic_request_blocked");
  if (principal.tenant_id !== resource.tenant_id) errors.push("tenant_boundary_precheck_failed");
  if ((request.matter_id ?? resource.matter_id) !== resource.matter_id) errors.push("matter_trace_precheck_failed");
  if (!isValidIntegerInRange(page, 1, Number.MAX_SAFE_INTEGER) || !isValidIntegerInRange(pageSize, 1, 100)) {
    errors.push("invalid_pagination");
  }

  const precheckPassed = errors.length === 0;
  const decision = precheckPassed
    ? evaluatePermission({
        principal,
        resource,
        action,
        rules: defaultRules(request, resource),
        objectAcl: request.object_acl ?? [],
      })
    : null;

  if (decision?.effect === "deny") errors.push("permission_denied");

  const permissionAnnotation = Object.freeze({
    source: "evaluatePermission",
    effect: decision?.effect ?? "not_evaluated",
    reason: decision?.reason ?? errors[0] ?? "not_evaluated",
    matched_rule_id: decision?.matched_rule_id ?? null,
    persisted: false,
  });
  const auditAnnotation = Object.freeze({
    source: "evaluatePermission.audit_hint",
    preview_only: true,
    emitted_to_audit_ledger: false,
    hint: sanitizeAuditHint(decision?.audit_hint),
  });
  const allowed = decision?.effect === "allow" && errors.length === 0;
  const omittedFields = PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.hidden_source_fields;
  const safetyCodes = ["unauthorized_data_omitted"];

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP113_PACK_BINDING.pack_id,
    fixture_id: "permission_kernel_cp113_api_permission_audit_binding_fixture",
    status: allowed ? "ready_metadata_only_response" : errors.includes("permission_denied") ? "denied_metadata_only_response" : "invalid_request_mapped",
    risk_class: PERMISSION_KERNEL_CP113_PACK_BINDING.risk_class,
    request_contract: Object.freeze({
      request_id: request.request_id ?? "cp113_api_permission_audit_binding_request",
      synthetic,
      actor_id: principal.user_id,
      tenant_id: principal.tenant_id,
      matter_id: request.matter_id ?? resource.matter_id,
      action,
      page,
      page_size: pageSize,
    }),
    response_contract: Object.freeze({
      items: Object.freeze(allowed ? [serializeResource(resource, permissionAnnotation, auditAnnotation)] : []),
      page: isValidIntegerInRange(page, 1, Number.MAX_SAFE_INTEGER) ? page : 1,
      page_size: isValidIntegerInRange(pageSize, 1, 100) ? pageSize : 25,
      next_cursor: null,
      error_codes: Object.freeze(errors),
      safety_codes: Object.freeze(safetyCodes),
      omitted_fields: omittedFields,
      allowlisted_fields: PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.serialized_response_allowlist,
    }),
    pagination_filtering_contract: Object.freeze({
      page,
      page_size: pageSize,
      valid: errors.includes("invalid_pagination") === false,
      max_page_size: 100,
      applied_before_response: true,
    }),
    serialization_guard: Object.freeze({
      allowlist_enforced: true,
      allowlisted_fields: PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.serialized_response_allowlist,
      omitted_fields: omittedFields,
      hidden_source_fields_present: true,
      unauthorized_data_omitted: true,
    }),
    permission_annotation: permissionAnnotation,
    audit_annotation: auditAnnotation,
    evaluator_invoked: Boolean(decision),
    unauthorized_data_omitted: true,
    mutates_permission_policy: false,
    writes_product_state: false,
    writes_audit_event: false,
    creates_database_rows: false,
    persists_idempotency_keys: false,
    acquires_locks: false,
    executes_export_download: false,
    executes_external_share: false,
    executes_ai_retrieval: false,
    no_write_attestation: CP113_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp113ApiPermissionAuditBindingFixtureMatrix() {
  const fixtures = Object.freeze([
    createPermissionKernelCp113ApiPermissionAuditBindingFixture(),
    createPermissionKernelCp113ApiPermissionAuditBindingFixture({ decision: "deny" }),
    createPermissionKernelCp113ApiPermissionAuditBindingFixture({ synthetic: false }),
    createPermissionKernelCp113ApiPermissionAuditBindingFixture({ page_size: 101 }),
    createPermissionKernelCp113ApiPermissionAuditBindingFixture({ tenant_id: "t_cp113", resource_tenant_id: "t_other" }),
    createPermissionKernelCp113ApiPermissionAuditBindingFixture({
      matter_id: "m_request_context",
      resource_matter_id: "m_resource_context",
    }),
  ]);
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP113_PACK_BINDING.pack_id,
    fixture_count: fixtures.length,
    fixtures,
    no_write_attestation: CP113_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp113ApiPermissionAuditBindingManifest() {
  const rows = createPermissionKernelCp113ApiPermissionAuditBindingCatalog();
  const unitIds = createPermissionKernelCp113CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const fixtureMatrix = createPermissionKernelCp113ApiPermissionAuditBindingFixtureMatrix();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP113_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp113_api_permission_audit_binding_manifest",
    source_unit_range: PERMISSION_KERNEL_CP113_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: new Set(rows.map((row) => row.micro_phase_id)).size,
    deliverable_counts: Object.freeze(deliverableCounts),
    fixture_count: fixtureMatrix.fixture_count,
    synthetic_only: true,
    no_real_data: true,
    risk_a_boundary_pack: true,
    metadata_only_api_binding: true,
    no_write_attestation: CP113_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP113_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP113_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp113HermesEvidencePacket() {
  const manifest = createPermissionKernelCp113ApiPermissionAuditBindingManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP113_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp113_api_permission_audit_binding_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-113",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp113ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP113_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp113_api_permission_audit_binding_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-113 closes the planned Risk A RP02 API permission/audit binding units with pagination bounds, serialization allowlist, unauthorized-data omission, permission_denied and invalid_pagination fixtures, audit preview-only annotations, no permission/audit/product/database writes, no external share/export/AI/LDIP implementation, HRX embedded-only boundary, and handoff to CP00-114/RP02.P03.M05.S17.",
  });
}

export function createPermissionKernelCp113CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP113_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP113_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP113_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP113_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP113_API_PERMISSION_AUDIT_BINDING_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp113Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp113ApiPermissionAuditBindingCatalog();
  const unitIds = createPermissionKernelCp113CoveredUnitIds();
  const manifest = createPermissionKernelCp113ApiPermissionAuditBindingManifest();
  const matrix = createPermissionKernelCp113ApiPermissionAuditBindingFixtureMatrix();
  const allowFixture = matrix.fixtures[0];
  const deniedFixture = matrix.fixtures[1];
  const nonSyntheticFixture = matrix.fixtures[2];
  const invalidPaginationFixture = matrix.fixtures[3];
  const crossTenantFixture = matrix.fixtures[4];
  const matterDriftFixture = matrix.fixtures[5];
  const handoff = createPermissionKernelCp113CloseoutHandoff();

  if (rows.length !== PERMISSION_KERNEL_CP113_PACK_BINDING.unit_count) errors.push("CP00-113 row count must be 10");
  if (unitIds.length !== PERMISSION_KERNEL_CP113_PACK_BINDING.unit_count) errors.push("CP00-113 covered unit count must be 10");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-113 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P03.M05.S07") errors.push("CP00-113 first unit must be RP02.P03.M05.S07");
  if (unitIds.at(-1) !== "RP02.P03.M05.S16") errors.push("CP00-113 last unit must be RP02.P03.M05.S16");
  if (manifest.deliverable_counts.contract !== 2) errors.push("CP00-113 contract deliverable count must be 2");
  if (manifest.deliverable_counts.implementation !== 3) errors.push("CP00-113 implementation deliverable count must be 3");
  if (manifest.deliverable_counts.test !== 3) errors.push("CP00-113 test deliverable count must be 3");
  if (manifest.deliverable_counts.hermes_evidence !== 1) errors.push("CP00-113 Hermes evidence deliverable count must be 1");
  if (manifest.deliverable_counts.claude_review !== 1) errors.push("CP00-113 Claude review deliverable count must be 1");
  if (matrix.fixture_count !== 6) errors.push("CP00-113 fixture matrix must include 6 cases");

  if (allowFixture.status !== "ready_metadata_only_response") errors.push("CP00-113 allow fixture must be ready");
  if (allowFixture.response_contract.items.length !== 1) errors.push("CP00-113 allow fixture must return one serialized item");
  if (allowFixture.response_contract.items[0]?.privileged_note !== undefined) errors.push("CP00-113 must omit privileged_note");
  if (allowFixture.response_contract.items[0]?.cross_tenant_secret !== undefined) errors.push("CP00-113 must omit cross_tenant_secret");
  if (!allowFixture.response_contract.safety_codes.includes("unauthorized_data_omitted")) {
    errors.push("CP00-113 allow fixture must exercise unauthorized_data_omitted safety code");
  }
  if (!allowFixture.pagination_filtering_contract.applied_before_response) errors.push("CP00-113 pagination contract must apply before response");
  if (!allowFixture.serialization_guard.allowlist_enforced) errors.push("CP00-113 serialization allowlist must be enforced");
  if (!allowFixture.evaluator_invoked) errors.push("CP00-113 allow fixture must invoke evaluator after prechecks");
  if (allowFixture.audit_annotation.emitted_to_audit_ledger !== false) errors.push("CP00-113 audit annotation must remain preview-only");

  if (deniedFixture.status !== "denied_metadata_only_response") errors.push("CP00-113 denied fixture must be denied metadata-only");
  if (!deniedFixture.response_contract.error_codes.includes("permission_denied")) errors.push("CP00-113 denied fixture must exercise permission_denied");
  if (deniedFixture.response_contract.items.length !== 0) errors.push("CP00-113 denied fixture must return no items");
  if (!invalidPaginationFixture.response_contract.error_codes.includes("invalid_pagination")) {
    errors.push("CP00-113 invalid pagination fixture must exercise invalid_pagination");
  }
  if (!nonSyntheticFixture.response_contract.error_codes.includes("non_synthetic_request_blocked")) {
    errors.push("CP00-113 non-synthetic fixture must be blocked");
  }
  if (!crossTenantFixture.response_contract.error_codes.includes("tenant_boundary_precheck_failed")) {
    errors.push("CP00-113 cross-tenant fixture must be blocked");
  }
  if (!matterDriftFixture.response_contract.error_codes.includes("matter_trace_precheck_failed")) {
    errors.push("CP00-113 matter-drift fixture must be blocked");
  }

  for (const fixture of matrix.fixtures) {
    if (
      fixture.mutates_permission_policy ||
      fixture.writes_product_state ||
      fixture.writes_audit_event ||
      fixture.creates_database_rows ||
      fixture.persists_idempotency_keys ||
      fixture.acquires_locks ||
      fixture.executes_export_download ||
      fixture.executes_external_share ||
      fixture.executes_ai_retrieval
    ) {
      errors.push(`CP00-113 fixture ${fixture.status} must remain metadata-only and no-write`);
    }
  }
  if (handoff.next_pack_id !== "CP00-114" || handoff.next_subphase_id !== "RP02.P03.M05.S17") {
    errors.push("CP00-113 must hand off to CP00-114 / RP02.P03.M05.S17");
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
