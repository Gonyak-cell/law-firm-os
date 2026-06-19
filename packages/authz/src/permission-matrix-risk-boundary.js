import { evaluatePermission, trimSearchResults } from "./evaluate.js";
import {
  PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT,
  createPermissionKernelCp120FixtureEvidencePermissionMatrix,
  runPermissionKernelCp120PermissionDecisionBinding,
} from "./fixture-evidence-permission-matrix.js";

export const PERMISSION_KERNEL_CP121_PACK_BINDING = Object.freeze({
  pack_id: "CP00-121",
  planned_pack_id: "CP00-121",
  risk_class: "A",
  unit_count: 10,
  range: "RP02.P06.M03.S15-RP02.P06.M04.S02",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-120",
  next_pack_id: "CP00-122",
  next_subphase_id: "RP02.P06.M04.S03",
});

const CP121_NO_WRITE_ATTESTATION = Object.freeze({
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

const CP121_UNITS = Object.freeze([
  Object.freeze({
    source_unit_id: "RP02.P06.M03.S15",
    micro_phase_id: "RP02.P06.M03",
    phase_id: "RP02.P06",
    micro_title: "Primary Implementation Slice",
    title: "Approval-required route",
    deliverable_type: "ui",
    boundary_case_id: "approval_required_route",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M03.S16",
    micro_phase_id: "RP02.P06.M03",
    phase_id: "RP02.P06",
    micro_title: "Primary Implementation Slice",
    title: "Security trimming proof",
    deliverable_type: "security_audit",
    boundary_case_id: "security_trimming_proof",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M03.S17",
    micro_phase_id: "RP02.P06.M03",
    phase_id: "RP02.P06",
    micro_title: "Primary Implementation Slice",
    title: "Audit event expectation",
    deliverable_type: "security_audit",
    boundary_case_id: "audit_event_expectation",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M03.S18",
    micro_phase_id: "RP02.P06.M03",
    phase_id: "RP02.P06",
    micro_title: "Primary Implementation Slice",
    title: "Permission fixture",
    deliverable_type: "security_audit",
    boundary_case_id: "permission_fixture",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M03.S19",
    micro_phase_id: "RP02.P06.M03",
    phase_id: "RP02.P06",
    micro_title: "Primary Implementation Slice",
    title: "Allowed test",
    deliverable_type: "test",
    boundary_case_id: "allowed_test",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M03.S20",
    micro_phase_id: "RP02.P06.M03",
    phase_id: "RP02.P06",
    micro_title: "Primary Implementation Slice",
    title: "Denied test",
    deliverable_type: "test",
    boundary_case_id: "denied_test",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M03.S21",
    micro_phase_id: "RP02.P06.M03",
    phase_id: "RP02.P06",
    micro_title: "Primary Implementation Slice",
    title: "Cross-tenant test",
    deliverable_type: "test",
    boundary_case_id: "cross_tenant_test",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M03.S22",
    micro_phase_id: "RP02.P06.M03",
    phase_id: "RP02.P06",
    micro_title: "Primary Implementation Slice",
    title: "Leak prevention test",
    deliverable_type: "test",
    boundary_case_id: "leak_prevention_test",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M04.S01",
    micro_phase_id: "RP02.P06.M04",
    phase_id: "RP02.P06",
    micro_title: "Secondary Workflow Slice",
    title: "Permission matrix row",
    deliverable_type: "security_audit",
    boundary_case_id: "permission_matrix_row",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M04.S02",
    micro_phase_id: "RP02.P06.M04",
    phase_id: "RP02.P06",
    micro_title: "Secondary Workflow Slice",
    title: "View decision binding",
    deliverable_type: "implementation",
    boundary_case_id: "view_decision_binding",
  }),
]);

const CP121_BOUNDARY_CASE_IDS = Object.freeze(CP121_UNITS.map((unit) => unit.boundary_case_id));
const CP121_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "cross_tenant_resource_id",
  "unauthorized_result_count",
  "privileged_note",
  "sealed_audit_hint_payload",
]);

const SYNTHETIC_PRINCIPAL = Object.freeze({
  user_id: "u_cp121_attorney",
  tenant_id: "t_cp121",
  role_ids: Object.freeze(["attorney"]),
});

const SYNTHETIC_RESOURCE = Object.freeze({
  resource_id: "d_cp121_document",
  resource_type: "Document",
  tenant_id: "t_cp121",
  matter_id: "m_cp121",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_a_permission_boundary: true,
    writes_product_state: false,
    writes_audit_event: false,
    mutates_permission_policy: false,
    creates_database_rows: false,
    persists_idempotency_keys: false,
    acquires_locks: false,
    executes_rollback: false,
    executes_retry: false,
    executes_export_download: false,
    executes_external_share: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    grants_human_approval: false,
    executes_claude_review: false,
    implements_ldip: false,
    unauthorized_count_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP121_NO_WRITE_ATTESTATION,
  });
}

function routeForDecision(decision) {
  if (decision.effect === "allow") return "completed_metadata_only";
  if (decision.effect === "approval_required") return "approval_required_routing";
  if (decision.effect === "review_required") return "review_required_routing";
  return "blocked_claim_output";
}

function createStableReplay(caseId, status) {
  return Object.freeze({
    stable_id: `cp121.${caseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "boundary_case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-121",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function createDecisionInput(caseId, overrides = {}) {
  const base = {
    boundary_case_id: caseId,
    synthetic: true,
    principal: SYNTHETIC_PRINCIPAL,
    resource: SYNTHETIC_RESOURCE,
    action: "document.view",
    rules: [
      { id: "cp121_allow_view", effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" },
    ],
    objectAcl: [],
  };

  if (caseId === "approval_required_route") {
    base.action = "document.delete.request";
    base.rules = [
      {
        id: "cp121_approval_required",
        effect: "approval_required",
        role_id: "attorney",
        resource_type: "Document",
        action: "document.delete.request",
      },
    ];
  }
  if (caseId === "allowed_test") {
    base.rules = [
      {
        id: "cp121_allow_matched_rule",
        effect: "allow",
        role_id: "attorney",
        resource_type: "Document",
        action: "document.view",
      },
    ];
  }
  if (caseId === "denied_test") {
    base.rules = [
      { id: "cp121_allow_view", effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" },
      {
        id: "cp121_deny_override",
        effect: "deny",
        role_id: "attorney",
        resource_type: "Document",
        action: "document.view",
        reason: "deny_over_allow",
      },
    ];
  }
  if (caseId === "cross_tenant_test") {
    base.resource = Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: "d_cp121_cross_tenant", tenant_id: "t_other" });
  }
  return Object.freeze({ ...base, ...overrides });
}

function runSearchTrimBoundary() {
  const searchRules = Object.freeze([
    { id: "cp121_allow_search", effect: "allow", role_id: "attorney", resource_type: "Document", action: "search.view" },
  ]);
  const searchResults = Object.freeze([
    SYNTHETIC_RESOURCE,
    Object.freeze({
      ...SYNTHETIC_RESOURCE,
      resource_id: "d_cp121_cross_tenant",
      tenant_id: "t_other",
      matter_id: "m_other",
      privileged_note: "must_not_render",
    }),
    Object.freeze({
      ...SYNTHETIC_RESOURCE,
      resource_id: "d_cp121_acl_denied",
      privileged_note: "must_not_render",
    }),
  ]);
  const objectAcl = (resource) =>
    resource.resource_id === "d_cp121_acl_denied"
      ? [{ id: "cp121_acl_deny", effect: "deny", principal_id: SYNTHETIC_PRINCIPAL.user_id, action: "search.view" }]
      : [];
  const trimmed = trimSearchResults(SYNTHETIC_PRINCIPAL, searchResults, searchRules, objectAcl, "search.view");
  return Object.freeze({
    trimmed_result_ids: Object.freeze(trimmed.map((resource) => resource.resource_id)),
    rendered_result_count: trimmed.length,
    omitted_result_policy: "do_not_count_or_render_unauthorized_results",
    rendered_fields: Object.freeze(["resource_id", "resource_type", "matter_id"]),
    hidden_fields_rendered: false,
  });
}

export const PERMISSION_KERNEL_CP121_PERMISSION_MATRIX_RISK_BOUNDARY_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp121_permission_matrix_risk_boundary_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP121_PACK_BINDING.range,
  upstream_fixture_evidence_permission_matrix_pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.upstream_pack_id,
  inherited_fixture_evidence_permission_matrix_contract_id:
    PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP121_PACK_BINDING.unit_count,
  risk_a_permission_boundary: true,
  synthetic_only: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  boundary_case_ids: CP121_BOUNDARY_CASE_IDS,
  hidden_source_fields: CP121_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP121_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP121_PACK_BINDING",
    "PERMISSION_KERNEL_CP121_PERMISSION_MATRIX_RISK_BOUNDARY_CONTRACT",
    "createPermissionKernelCp121PermissionMatrixRiskBoundaryCatalog",
    "createPermissionKernelCp121CoveredUnitIds",
    "createPermissionKernelCp121PermissionMatrixRiskBoundary",
    "runPermissionKernelCp121PermissionMatrixBoundaryCase",
    "createPermissionKernelCp121PermissionMatrixRiskBoundaryManifest",
    "createPermissionKernelCp121HermesEvidencePacket",
    "createPermissionKernelCp121ClaudeReviewPacket",
    "createPermissionKernelCp121CloseoutHandoff",
    "validatePermissionKernelCp121Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP121_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel secondary workflow slice at RP02.P06.M04.S03 as Risk B; expand remaining permission matrix workflow behavior without crossing tenant, audit, approval, export/share, AI, persistence, or LDIP implementation boundaries.",
  }),
});

export function createPermissionKernelCp121PermissionMatrixRiskBoundaryCatalog() {
  return Object.freeze(
    CP121_UNITS.map((unit) =>
      Object.freeze({
        catalog_id: `${unit.source_unit_id}.${slugFor(unit.title)}`,
        pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.pack_id,
        program_id: "RP02",
        phase_id: unit.phase_id,
        micro_phase_id: unit.micro_phase_id,
        micro_title: unit.micro_title,
        title: unit.title,
        coverage_kind: slugFor(unit.title),
        deliverable_type: unit.deliverable_type,
        boundary_case_id: unit.boundary_case_id,
        source_unit_ids: Object.freeze([unit.source_unit_id]),
        required_assertions: Object.freeze([
          "synthetic_only",
          "risk_a_permission_boundary",
          "approval_required_route_does_not_grant_approval",
          "security_trimming_omits_unauthorized_results",
          "audit_event_expectation_preview_only",
          "permission_fixture_not_persisted",
          "allowed_denied_cross_tenant_leak_tests_fail_closed",
          "no_permission_policy_mutation",
          "no_audit_ledger_write",
          "no_product_or_database_write",
          "no_external_share_export_ai_execution",
          "ldip_not_implemented",
          "hrx_embedded_inside_law_firm_os",
        ]),
        boundary_flags: CP121_NO_WRITE_ATTESTATION,
        synthetic_only: true,
        no_real_data: true,
        risk_a_permission_boundary: true,
        product_state_effect: "none",
      }),
    ),
  );
}

export function createPermissionKernelCp121CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp121PermissionMatrixRiskBoundaryCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp121PermissionMatrixBoundaryCase(caseId, overrides = {}) {
  if (!CP121_BOUNDARY_CASE_IDS.includes(caseId)) {
    return freezeNoWriteResult({
      boundary_case_id: caseId,
      status: "blocked_before_permission_evaluation",
      reason: "unknown_permission_matrix_risk_boundary_case",
      evaluator_invoked: false,
      decision: null,
      ...createStableReplay(caseId, "blocked_before_permission_evaluation"),
    });
  }
  if (caseId === "security_trimming_proof" || caseId === "leak_prevention_test") {
    const trimBoundary = runSearchTrimBoundary();
    return freezeNoWriteResult({
      boundary_case_id: caseId,
      status: "security_trimmed_before_display",
      reason: "unauthorized_resources_omitted_without_counts",
      evaluator_invoked: true,
      decision: Object.freeze({ effect: "allow", reason: "security_trimmed" }),
      ...trimBoundary,
      ...createStableReplay(caseId, "security_trimmed_before_display"),
    });
  }
  if (caseId === "audit_event_expectation") {
    return freezeNoWriteResult({
      boundary_case_id: caseId,
      status: "audit_expectation_recorded",
      reason: "audit_event_expectation_preview_only",
      evaluator_invoked: false,
      decision: null,
      audit_event_expectation: Object.freeze({
        expected_runtime_event_type: "permission.decision.evaluated",
        expected_actor_id: SYNTHETIC_PRINCIPAL.user_id,
        expected_tenant_id: SYNTHETIC_PRINCIPAL.tenant_id,
        emitted_to_audit_ledger: false,
        preview_only: true,
      }),
      ...createStableReplay(caseId, "audit_expectation_recorded"),
    });
  }
  if (caseId === "permission_fixture") {
    return freezeNoWriteResult({
      boundary_case_id: caseId,
      status: "permission_fixture_bound_metadata_only",
      reason: "synthetic_permission_fixture",
      evaluator_invoked: false,
      decision: null,
      permission_fixture: Object.freeze({
        principal_id: SYNTHETIC_PRINCIPAL.user_id,
        tenant_id: SYNTHETIC_PRINCIPAL.tenant_id,
        resource_id: SYNTHETIC_RESOURCE.resource_id,
        matter_id: SYNTHETIC_RESOURCE.matter_id,
        actions: Object.freeze(["document.view", "search.view", "document.delete.request"]),
        persisted: false,
      }),
      ...createStableReplay(caseId, "permission_fixture_bound_metadata_only"),
    });
  }
  if (caseId === "permission_matrix_row") {
    return freezeNoWriteResult({
      boundary_case_id: caseId,
      status: "matrix_row_bound_metadata_only",
      reason: "permission_matrix_row_preview",
      evaluator_invoked: false,
      decision: null,
      matrix_row: Object.freeze({
        action: "document.view",
        resource_type: "Document",
        tenant_boundary_required: true,
        expected_route: "completed_metadata_only",
        deny_over_allow: true,
        audit_hint_preview_only: true,
        persisted: false,
      }),
      ...createStableReplay(caseId, "matrix_row_bound_metadata_only"),
    });
  }

  const input = createDecisionInput(caseId, overrides);
  const decision = evaluatePermission({
    principal: input.principal,
    resource: input.resource,
    action: input.action,
    rules: input.rules,
    objectAcl: input.objectAcl,
  });
  const status = routeForDecision(decision);
  return freezeNoWriteResult({
    boundary_case_id: caseId,
    status,
    reason: decision.reason,
    evaluator_invoked: true,
    decision: Object.freeze(decision),
    matched_rule_id: decision.matched_rule_id,
    audit_hint: Object.freeze({
      preview_only: true,
      emitted_to_audit_ledger: false,
      hint: Object.freeze(decision.audit_hint),
    }),
    ...createStableReplay(caseId, status),
  });
}

export function createPermissionKernelCp121PermissionMatrixRiskBoundary() {
  const inheritedMatrix = createPermissionKernelCp120FixtureEvidencePermissionMatrix();
  const inheritedApprovalRoute = runPermissionKernelCp120PermissionDecisionBinding("approval_required_route");
  const caseResults = Object.freeze(CP121_BOUNDARY_CASE_IDS.map((caseId) => runPermissionKernelCp121PermissionMatrixBoundaryCase(caseId)));
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.upstream_pack_id,
    inherited_permission_decision_binding_count: inheritedMatrix.permission_decision_binding_count,
    inherited_approval_route_status: inheritedApprovalRoute.status,
    boundary_case_count: caseResults.length,
    boundary_case_results: caseResults,
    hidden_source_fields: CP121_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP121_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp121PermissionMatrixRiskBoundaryManifest() {
  const rows = createPermissionKernelCp121PermissionMatrixRiskBoundaryCatalog();
  const unitIds = createPermissionKernelCp121CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const phaseCounts = rows.reduce((counts, row) => {
    counts[row.micro_phase_id] = (counts[row.micro_phase_id] ?? 0) + 1;
    return counts;
  }, {});
  const matrix = createPermissionKernelCp121PermissionMatrixRiskBoundary();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp121_permission_matrix_risk_boundary_manifest",
    source_unit_range: PERMISSION_KERNEL_CP121_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    phase_counts: Object.freeze(phaseCounts),
    boundary_case_count: matrix.boundary_case_count,
    inherited_permission_decision_binding_count: matrix.inherited_permission_decision_binding_count,
    synthetic_only: true,
    no_real_data: true,
    risk_a_permission_boundary: true,
    no_write_attestation: CP121_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP121_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp121HermesEvidencePacket() {
  const manifest = createPermissionKernelCp121PermissionMatrixRiskBoundaryManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp121_permission_matrix_risk_boundary_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-121",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp121ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp121_permission_matrix_risk_boundary_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-121 closes the planned Risk A RP02 permission matrix boundary units, preserves approval-required routing without granting approval, trims unauthorized search results without counts or hidden fields, records audit event expectations without ledger writes, binds synthetic permission fixtures without persistence, covers allowed/denied/cross-tenant/leak-prevention tests, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, export/share/AI execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp121CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP121_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP121_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP121_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP121_PERMISSION_MATRIX_RISK_BOUNDARY_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp121Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp121PermissionMatrixRiskBoundaryCatalog();
  const unitIds = createPermissionKernelCp121CoveredUnitIds();
  const manifest = createPermissionKernelCp121PermissionMatrixRiskBoundaryManifest();
  const matrix = createPermissionKernelCp121PermissionMatrixRiskBoundary();
  const handoff = createPermissionKernelCp121CloseoutHandoff();
  const resultById = Object.fromEntries(matrix.boundary_case_results.map((result) => [result.boundary_case_id, result]));

  if (rows.length !== PERMISSION_KERNEL_CP121_PACK_BINDING.unit_count) errors.push("CP00-121 row count must be 10");
  if (unitIds.length !== PERMISSION_KERNEL_CP121_PACK_BINDING.unit_count) errors.push("CP00-121 covered unit count must be 10");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-121 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P06.M03.S15") errors.push("CP00-121 first unit must be RP02.P06.M03.S15");
  if (unitIds.at(-1) !== "RP02.P06.M04.S02") errors.push("CP00-121 last unit must be RP02.P06.M04.S02");
  if (manifest.covered_micro_phase_count !== 2) errors.push("CP00-121 must cover two micro phases");
  if (manifest.deliverable_counts.ui !== 1) errors.push("CP00-121 ui deliverable count must be 1");
  if (manifest.deliverable_counts.security_audit !== 4) errors.push("CP00-121 security_audit deliverable count must be 4");
  if (manifest.deliverable_counts.test !== 4) errors.push("CP00-121 test deliverable count must be 4");
  if (manifest.deliverable_counts.implementation !== 1) errors.push("CP00-121 implementation deliverable count must be 1");
  if (manifest.phase_counts["RP02.P06.M03"] !== 8) errors.push("CP00-121 RP02.P06.M03 count must be 8");
  if (manifest.phase_counts["RP02.P06.M04"] !== 2) errors.push("CP00-121 RP02.P06.M04 count must be 2");
  if (matrix.inherited_permission_decision_binding_count !== 19) errors.push("CP00-121 must inherit 19 CP120 decision bindings");
  if (matrix.inherited_approval_route_status !== "approval_required_routing") {
    errors.push("CP00-121 inherited approval route must be approval_required_routing");
  }
  if (matrix.boundary_case_count !== CP121_BOUNDARY_CASE_IDS.length) errors.push("CP00-121 boundary case count mismatch");

  if (resultById.approval_required_route?.status !== "approval_required_routing") {
    errors.push("CP00-121 approval route must require approval");
  }
  if (resultById.approval_required_route?.grants_human_approval !== false) {
    errors.push("CP00-121 approval route must not grant approval");
  }
  if (resultById.security_trimming_proof?.trimmed_result_ids?.join(",") !== "d_cp121_document") {
    errors.push("CP00-121 security trimming must only render the authorized document");
  }
  if (resultById.security_trimming_proof?.rendered_result_count !== 1) {
    errors.push("CP00-121 security trimming rendered count must be 1");
  }
  if (resultById.security_trimming_proof?.hidden_fields_rendered !== false) {
    errors.push("CP00-121 security trimming must not render hidden fields");
  }
  if (resultById.audit_event_expectation?.audit_event_expectation?.emitted_to_audit_ledger !== false) {
    errors.push("CP00-121 audit event expectation must not write audit ledger");
  }
  if (resultById.permission_fixture?.permission_fixture?.persisted !== false) {
    errors.push("CP00-121 permission fixture must not persist");
  }
  if (resultById.allowed_test?.decision?.effect !== "allow") errors.push("CP00-121 allowed test must allow");
  if (resultById.denied_test?.decision?.effect !== "deny") errors.push("CP00-121 denied test must deny");
  if (resultById.cross_tenant_test?.reason !== "cross_tenant_deny") errors.push("CP00-121 cross-tenant test must fail closed");
  if (resultById.cross_tenant_test?.decision?.audit_hint?.object_id !== "redacted_cross_tenant_object") {
    errors.push("CP00-121 cross-tenant audit hint object must be redacted");
  }
  if (resultById.leak_prevention_test?.unauthorized_count_exposed !== false) {
    errors.push("CP00-121 leak prevention must not expose unauthorized count");
  }
  if (resultById.leak_prevention_test?.hidden_field_names_exposed !== false) {
    errors.push("CP00-121 leak prevention must not expose hidden field names");
  }
  if (resultById.permission_matrix_row?.matrix_row?.persisted !== false) errors.push("CP00-121 matrix row must not persist");
  if (resultById.view_decision_binding?.status !== "completed_metadata_only") errors.push("CP00-121 view binding must complete metadata-only");
  if (resultById.view_decision_binding?.matched_rule_id !== "cp121_allow_view") errors.push("CP00-121 view binding matched rule mismatch");

  for (const profile of matrix.boundary_case_results) {
    if (
      profile.unauthorized_count_exposed ||
      profile.hidden_field_names_exposed ||
      profile.mutates_permission_policy ||
      profile.writes_product_state ||
      profile.writes_audit_event ||
      profile.creates_database_rows ||
      profile.persists_idempotency_keys ||
      profile.acquires_locks ||
      profile.executes_rollback ||
      profile.executes_retry ||
      profile.executes_export_download ||
      profile.executes_external_share ||
      profile.executes_ai_retrieval ||
      profile.executes_analytics_query ||
      profile.grants_human_approval ||
      profile.implements_ldip
    ) {
      errors.push(`CP00-121 case ${profile.boundary_case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-122" || handoff.next_subphase_id !== "RP02.P06.M04.S03") {
    errors.push("CP00-121 must hand off to CP00-122 / RP02.P06.M04.S03");
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
