import { evaluatePermission, trimSearchResults } from "./evaluate.js";
import {
  PERMISSION_KERNEL_CP122_PERMISSION_MATRIX_WORKFLOW_BINDING_CONTRACT,
  createPermissionKernelCp122PermissionMatrixWorkflowBinding,
  runPermissionKernelCp122PermissionMatrixWorkflowCase,
} from "./permission-matrix-workflow-binding.js";

export const PERMISSION_KERNEL_CP123_PACK_BINDING = Object.freeze({
  pack_id: "CP00-123",
  planned_pack_id: "CP00-123",
  risk_class: "A",
  unit_count: 10,
  range: "RP02.P06.M05.S21-RP02.P06.M06.S08",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-122",
  next_pack_id: "CP00-124",
  next_subphase_id: "RP02.P06.M06.S09",
});

const CP123_NO_WRITE_ATTESTATION = Object.freeze({
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

const CP123_UNITS = Object.freeze([
  Object.freeze({
    source_unit_id: "RP02.P06.M05.S21",
    micro_phase_id: "RP02.P06.M05",
    phase_id: "RP02.P06",
    micro_title: "Permission And Audit Binding",
    title: "Cross-tenant test",
    deliverable_type: "test",
    area: "permission_matrix_permission_audit_terminal",
    boundary_case_id: "permission_audit_cross_tenant_test",
    behavior_kind: "cross_tenant_test",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M05.S22",
    micro_phase_id: "RP02.P06.M05",
    phase_id: "RP02.P06",
    micro_title: "Permission And Audit Binding",
    title: "Leak prevention test",
    deliverable_type: "test",
    area: "permission_matrix_permission_audit_terminal",
    boundary_case_id: "permission_audit_leak_prevention_test",
    behavior_kind: "leak_prevention_test",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M06.S01",
    micro_phase_id: "RP02.P06.M06",
    phase_id: "RP02.P06",
    micro_title: "Synthetic Fixture Set",
    title: "Permission matrix row",
    deliverable_type: "security_audit",
    area: "permission_matrix_synthetic_fixture_opening",
    boundary_case_id: "synthetic_fixture_permission_matrix_row",
    behavior_kind: "permission_matrix_row",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M06.S02",
    micro_phase_id: "RP02.P06.M06",
    phase_id: "RP02.P06",
    micro_title: "Synthetic Fixture Set",
    title: "View decision binding",
    deliverable_type: "implementation",
    area: "permission_matrix_synthetic_fixture_opening",
    boundary_case_id: "synthetic_fixture_view_decision_binding",
    behavior_kind: "view_decision_binding",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M06.S03",
    micro_phase_id: "RP02.P06.M06",
    phase_id: "RP02.P06",
    micro_title: "Synthetic Fixture Set",
    title: "Search decision binding",
    deliverable_type: "implementation",
    area: "permission_matrix_synthetic_fixture_opening",
    boundary_case_id: "synthetic_fixture_search_decision_binding",
    behavior_kind: "search_decision_binding",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M06.S04",
    micro_phase_id: "RP02.P06.M06",
    phase_id: "RP02.P06",
    micro_title: "Synthetic Fixture Set",
    title: "Mutation decision binding",
    deliverable_type: "implementation",
    area: "permission_matrix_synthetic_fixture_opening",
    boundary_case_id: "synthetic_fixture_mutation_decision_binding",
    behavior_kind: "mutation_decision_binding",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M06.S05",
    micro_phase_id: "RP02.P06.M06",
    phase_id: "RP02.P06",
    micro_title: "Synthetic Fixture Set",
    title: "Export/download decision binding",
    deliverable_type: "implementation",
    area: "permission_matrix_synthetic_fixture_opening",
    boundary_case_id: "synthetic_fixture_export_download_decision_binding",
    behavior_kind: "export_download_decision_binding",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M06.S06",
    micro_phase_id: "RP02.P06.M06",
    phase_id: "RP02.P06",
    micro_title: "Synthetic Fixture Set",
    title: "Share decision binding",
    deliverable_type: "implementation",
    area: "permission_matrix_synthetic_fixture_opening",
    boundary_case_id: "synthetic_fixture_share_decision_binding",
    behavior_kind: "share_decision_binding",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M06.S07",
    micro_phase_id: "RP02.P06.M06",
    phase_id: "RP02.P06",
    micro_title: "Synthetic Fixture Set",
    title: "AI retrieval decision binding",
    deliverable_type: "implementation",
    area: "permission_matrix_synthetic_fixture_opening",
    boundary_case_id: "synthetic_fixture_ai_retrieval_decision_binding",
    behavior_kind: "ai_retrieval_decision_binding",
  }),
  Object.freeze({
    source_unit_id: "RP02.P06.M06.S08",
    micro_phase_id: "RP02.P06.M06",
    phase_id: "RP02.P06",
    micro_title: "Synthetic Fixture Set",
    title: "Audit hint fields",
    deliverable_type: "security_audit",
    area: "permission_matrix_synthetic_fixture_opening",
    boundary_case_id: "synthetic_fixture_audit_hint_fields",
    behavior_kind: "audit_hint_fields",
  }),
]);

const CP123_BOUNDARY_CASE_IDS = Object.freeze(CP123_UNITS.map((unit) => unit.boundary_case_id));
const CP123_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "cross_tenant_resource_id",
  "unauthorized_result_count",
  "privileged_note",
  "sealed_audit_hint_payload",
  "external_share_target",
  "ai_retrieval_query",
]);

const SYNTHETIC_PRINCIPAL = Object.freeze({
  user_id: "u_cp123_attorney",
  tenant_id: "t_cp123",
  role_ids: Object.freeze(["attorney"]),
});

const SYNTHETIC_RESOURCE = Object.freeze({
  resource_id: "d_cp123_document",
  resource_type: "Document",
  tenant_id: "t_cp123",
  matter_id: "m_cp123",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_a_permission_audit_terminal_boundary: true,
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
    no_write_attestation: CP123_NO_WRITE_ATTESTATION,
  });
}

function routeForDecision(decision) {
  if (decision.effect === "allow") return "completed_metadata_only";
  if (decision.effect === "approval_required") return "approval_required_routing";
  if (decision.effect === "review_required") return "review_required_routing";
  return "blocked_claim_output";
}

function createStableReplay(boundaryCaseId, status) {
  return Object.freeze({
    stable_id: `cp123.${boundaryCaseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "boundary_case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-123",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function createDecisionInput(row, overrides = {}) {
  const rulePrefix = row.boundary_case_id;
  const base = {
    boundary_case_id: row.boundary_case_id,
    synthetic: true,
    principal: SYNTHETIC_PRINCIPAL,
    resource: SYNTHETIC_RESOURCE,
    action: "document.view",
    rules: [
      { id: `${rulePrefix}_allow_view`, effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" },
    ],
    objectAcl: [],
  };
  if (row.behavior_kind === "cross_tenant_test") {
    base.resource = Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: "d_cp123_cross_tenant", tenant_id: "t_other" });
  }
  if (row.behavior_kind === "mutation_decision_binding") {
    base.action = "document.update";
    base.rules = [
      { id: `${rulePrefix}_approval_update`, effect: "approval_required", role_id: "attorney", resource_type: "Document", action: "document.update" },
    ];
  }
  if (row.behavior_kind === "export_download_decision_binding") {
    base.action = "document.download";
    base.rules = [
      { id: `${rulePrefix}_review_download`, effect: "review_required", role_id: "attorney", resource_type: "Document", action: "document.download" },
    ];
  }
  if (row.behavior_kind === "share_decision_binding") {
    base.action = "document.share.external";
    base.rules = [
      {
        id: `${rulePrefix}_approval_share`,
        effect: "approval_required",
        role_id: "attorney",
        resource_type: "Document",
        action: "document.share.external",
      },
    ];
  }
  return Object.freeze({ ...base, ...overrides });
}

function runSearchTrimBoundary(row) {
  const searchRules = Object.freeze([
    { id: `${row.boundary_case_id}_allow_search`, effect: "allow", role_id: "attorney", resource_type: "Document", action: "search.view" },
  ]);
  const searchResults = Object.freeze([
    SYNTHETIC_RESOURCE,
    Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: "d_cp123_cross_tenant", tenant_id: "t_other", privileged_note: "must_not_render" }),
    Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: "d_cp123_acl_denied", privileged_note: "must_not_render" }),
  ]);
  const objectAcl = (resource) =>
    resource.resource_id === "d_cp123_acl_denied"
      ? [{ id: `${row.boundary_case_id}_acl_deny`, effect: "deny", principal_id: SYNTHETIC_PRINCIPAL.user_id, action: "search.view" }]
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

export const PERMISSION_KERNEL_CP123_PERMISSION_AUDIT_TERMINAL_BOUNDARY_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp123_permission_audit_terminal_boundary_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP123_PACK_BINDING.range,
  upstream_permission_matrix_workflow_binding_pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.upstream_pack_id,
  inherited_permission_matrix_workflow_binding_contract_id:
    PERMISSION_KERNEL_CP122_PERMISSION_MATRIX_WORKFLOW_BINDING_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP123_PACK_BINDING.unit_count,
  risk_a_permission_audit_terminal_boundary: true,
  synthetic_only: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  boundary_case_ids: CP123_BOUNDARY_CASE_IDS,
  hidden_source_fields: CP123_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP123_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP123_PACK_BINDING",
    "PERMISSION_KERNEL_CP123_PERMISSION_AUDIT_TERMINAL_BOUNDARY_CONTRACT",
    "createPermissionKernelCp123PermissionAuditTerminalBoundaryCatalog",
    "createPermissionKernelCp123CoveredUnitIds",
    "createPermissionKernelCp123PermissionAuditTerminalBoundary",
    "runPermissionKernelCp123PermissionAuditTerminalBoundaryCase",
    "createPermissionKernelCp123PermissionAuditTerminalBoundaryManifest",
    "createPermissionKernelCp123HermesEvidencePacket",
    "createPermissionKernelCp123ClaudeReviewPacket",
    "createPermissionKernelCp123CloseoutHandoff",
    "validatePermissionKernelCp123Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP123_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel synthetic fixture, evidence, review, closeout, and failure taxonomy opening at RP02.P06.M06.S09 as Risk C without weakening tenant, approval, audit, export/share, AI, persistence, or LDIP boundaries.",
  }),
});

export function createPermissionKernelCp123PermissionAuditTerminalBoundaryCatalog() {
  return Object.freeze(
    CP123_UNITS.map((unit) =>
      Object.freeze({
        catalog_id: `${unit.source_unit_id}.${slugFor(unit.title)}`,
        pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.pack_id,
        program_id: "RP02",
        phase_id: unit.phase_id,
        micro_phase_id: unit.micro_phase_id,
        micro_title: unit.micro_title,
        title: unit.title,
        area: unit.area,
        coverage_kind: slugFor(unit.title),
        deliverable_type: unit.deliverable_type,
        boundary_case_id: unit.boundary_case_id,
        behavior_kind: unit.behavior_kind,
        source_unit_ids: Object.freeze([unit.source_unit_id]),
        required_assertions: Object.freeze([
          "synthetic_only",
          "risk_a_permission_audit_terminal_boundary",
          "cp122_workflow_binding_inherited",
          "cross_tenant_and_leak_terminal_cases_fail_closed",
          "synthetic_fixture_opening_reference_only",
          "export_share_ai_boundaries_not_executed",
          "audit_hint_preview_only",
          "no_permission_policy_mutation",
          "no_audit_ledger_write",
          "no_product_or_database_write",
          "ldip_not_implemented",
          "hrx_embedded_inside_law_firm_os",
        ]),
        boundary_flags: CP123_NO_WRITE_ATTESTATION,
        synthetic_only: true,
        no_real_data: true,
        product_state_effect: "none",
      }),
    ),
  );
}

export function createPermissionKernelCp123CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp123PermissionAuditTerminalBoundaryCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp123PermissionAuditTerminalBoundaryCase(boundaryCaseId, overrides = {}) {
  const row = createPermissionKernelCp123PermissionAuditTerminalBoundaryCatalog().find((item) => item.boundary_case_id === boundaryCaseId);
  if (!row) {
    return freezeNoWriteResult({
      boundary_case_id: boundaryCaseId,
      behavior_kind: "unknown",
      status: "blocked_before_permission_evaluation",
      reason: "unknown_permission_audit_terminal_boundary_case",
      evaluator_invoked: false,
      decision: null,
      ...createStableReplay(boundaryCaseId, "blocked_before_permission_evaluation"),
    });
  }
  if (row.behavior_kind === "search_decision_binding" || row.behavior_kind === "leak_prevention_test") {
    const trimBoundary = runSearchTrimBoundary(row);
    return freezeNoWriteResult({
      boundary_case_id: row.boundary_case_id,
      behavior_kind: row.behavior_kind,
      status: "security_trimmed_before_display",
      reason: "unauthorized_resources_omitted_without_counts",
      evaluator_invoked: true,
      decision: Object.freeze({ effect: "allow", reason: "security_trimmed" }),
      ...trimBoundary,
      ...createStableReplay(row.boundary_case_id, "security_trimmed_before_display"),
    });
  }
  if (row.behavior_kind === "permission_matrix_row") {
    return freezeNoWriteResult({
      boundary_case_id: row.boundary_case_id,
      behavior_kind: row.behavior_kind,
      status: "matrix_row_bound_metadata_only",
      reason: "synthetic_fixture_matrix_row_preview",
      evaluator_invoked: false,
      decision: null,
      matrix_row: Object.freeze({
        fixture_scope: "permission_kernel_synthetic_fixture_opening",
        tenant_boundary_required: true,
        audit_hint_preview_only: true,
        persisted: false,
      }),
      ...createStableReplay(row.boundary_case_id, "matrix_row_bound_metadata_only"),
    });
  }
  if (row.behavior_kind === "audit_hint_fields") {
    return freezeNoWriteResult({
      boundary_case_id: row.boundary_case_id,
      behavior_kind: row.behavior_kind,
      status: "audit_expectation_recorded",
      reason: "audit_hint_preview_only",
      evaluator_invoked: false,
      decision: null,
      audit_hint_fields: Object.freeze(["actor_id", "action", "object_id", "tenant_id", "reason", "effect"]),
      audit_event_expectation: Object.freeze({
        expected_runtime_event_type: "permission.decision.evaluated",
        emitted_to_audit_ledger: false,
        preview_only: true,
      }),
      ...createStableReplay(row.boundary_case_id, "audit_expectation_recorded"),
    });
  }
  if (row.behavior_kind === "ai_retrieval_decision_binding") {
    return freezeNoWriteResult({
      boundary_case_id: row.boundary_case_id,
      behavior_kind: row.behavior_kind,
      status: "blocked_ai_retrieval_boundary",
      reason: "ai_retrieval_reference_only",
      evaluator_invoked: false,
      decision: null,
      ...createStableReplay(row.boundary_case_id, "blocked_ai_retrieval_boundary"),
    });
  }

  const input = createDecisionInput(row, overrides);
  const decision = evaluatePermission({
    principal: input.principal,
    resource: input.resource,
    action: input.action,
    rules: input.rules,
    objectAcl: input.objectAcl,
  });
  const status = routeForDecision(decision);
  return freezeNoWriteResult({
    boundary_case_id: row.boundary_case_id,
    behavior_kind: row.behavior_kind,
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
    ...createStableReplay(row.boundary_case_id, status),
  });
}

export function createPermissionKernelCp123PermissionAuditTerminalBoundary() {
  const inheritedWorkflow = createPermissionKernelCp122PermissionMatrixWorkflowBinding();
  const inheritedLeak = runPermissionKernelCp122PermissionMatrixWorkflowCase("secondary_workflow.leak_prevention_test");
  const boundaryCases = Object.freeze(
    CP123_BOUNDARY_CASE_IDS.map((caseId) => runPermissionKernelCp123PermissionAuditTerminalBoundaryCase(caseId)),
  );
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.upstream_pack_id,
    inherited_workflow_case_count: inheritedWorkflow.workflow_case_count,
    inherited_leak_prevention_status: inheritedLeak.status,
    boundary_case_count: boundaryCases.length,
    boundary_case_results: boundaryCases,
    hidden_source_fields: CP123_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP123_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp123PermissionAuditTerminalBoundaryManifest() {
  const rows = createPermissionKernelCp123PermissionAuditTerminalBoundaryCatalog();
  const unitIds = createPermissionKernelCp123CoveredUnitIds();
  const deliverableCounts = rows.reduce((counts, row) => {
    counts[row.deliverable_type] = (counts[row.deliverable_type] ?? 0) + 1;
    return counts;
  }, {});
  const phaseCounts = rows.reduce((counts, row) => {
    counts[row.micro_phase_id] = (counts[row.micro_phase_id] ?? 0) + 1;
    return counts;
  }, {});
  const areaCounts = rows.reduce((counts, row) => {
    counts[row.area] = (counts[row.area] ?? 0) + 1;
    return counts;
  }, {});
  const matrix = createPermissionKernelCp123PermissionAuditTerminalBoundary();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp123_permission_audit_terminal_boundary_manifest",
    source_unit_range: PERMISSION_KERNEL_CP123_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    phase_counts: Object.freeze(phaseCounts),
    area_counts: Object.freeze(areaCounts),
    inherited_workflow_case_count: matrix.inherited_workflow_case_count,
    boundary_case_count: matrix.boundary_case_count,
    synthetic_only: true,
    no_real_data: true,
    risk_a_permission_audit_terminal_boundary: true,
    no_write_attestation: CP123_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP123_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp123HermesEvidencePacket() {
  const manifest = createPermissionKernelCp123PermissionAuditTerminalBoundaryManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp123_permission_audit_terminal_boundary_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-123",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp123ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp123_permission_audit_terminal_boundary_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-123 closes the planned Risk A RP02 permission/audit terminal and synthetic fixture opening units, inherits CP122 workflow bindings, preserves cross-tenant and leak-prevention fail-closed behavior, blocks AI retrieval, routes mutation/share/export safely, keeps audit hints preview-only, and adds no runtime UI/API routes, policy mutations, audit/product/database writes, export/share/AI execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp123CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP123_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP123_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP123_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP123_PERMISSION_AUDIT_TERMINAL_BOUNDARY_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp123Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp123PermissionAuditTerminalBoundaryCatalog();
  const unitIds = createPermissionKernelCp123CoveredUnitIds();
  const manifest = createPermissionKernelCp123PermissionAuditTerminalBoundaryManifest();
  const matrix = createPermissionKernelCp123PermissionAuditTerminalBoundary();
  const resultById = Object.fromEntries(matrix.boundary_case_results.map((result) => [result.boundary_case_id, result]));
  const handoff = createPermissionKernelCp123CloseoutHandoff();

  if (rows.length !== 10) errors.push("CP00-123 row count must be 10");
  if (unitIds.length !== 10) errors.push("CP00-123 covered unit count must be 10");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-123 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P06.M05.S21") errors.push("CP00-123 first unit must be RP02.P06.M05.S21");
  if (unitIds.at(-1) !== "RP02.P06.M06.S08") errors.push("CP00-123 last unit must be RP02.P06.M06.S08");
  if (manifest.covered_micro_phase_count !== 2) errors.push("CP00-123 must cover two micro phases");
  if (manifest.phase_counts["RP02.P06.M05"] !== 2) errors.push("CP00-123 RP02.P06.M05 count must be 2");
  if (manifest.phase_counts["RP02.P06.M06"] !== 8) errors.push("CP00-123 RP02.P06.M06 count must be 8");
  if (manifest.area_counts.permission_matrix_permission_audit_terminal !== 2) {
    errors.push("CP00-123 permission/audit terminal area count must be 2");
  }
  if (manifest.area_counts.permission_matrix_synthetic_fixture_opening !== 8) {
    errors.push("CP00-123 synthetic fixture opening area count must be 8");
  }
  if (manifest.deliverable_counts.test !== 2) errors.push("CP00-123 test deliverable count must be 2");
  if (manifest.deliverable_counts.security_audit !== 2) errors.push("CP00-123 security_audit deliverable count must be 2");
  if (manifest.deliverable_counts.implementation !== 6) errors.push("CP00-123 implementation deliverable count must be 6");
  if (matrix.inherited_workflow_case_count !== 40) errors.push("CP00-123 must inherit 40 CP122 workflow cases");
  if (matrix.inherited_leak_prevention_status !== "security_trimmed_before_display") {
    errors.push("CP00-123 inherited leak prevention status mismatch");
  }
  if (matrix.boundary_case_count !== 10) errors.push("CP00-123 boundary case count must be 10");

  if (resultById.permission_audit_cross_tenant_test?.reason !== "cross_tenant_deny") {
    errors.push("CP00-123 permission/audit cross-tenant test must fail closed");
  }
  if (resultById.permission_audit_cross_tenant_test?.decision?.audit_hint?.object_id !== "redacted_cross_tenant_object") {
    errors.push("CP00-123 cross-tenant audit hint object must be redacted");
  }
  if (resultById.permission_audit_leak_prevention_test?.trimmed_result_ids?.join(",") !== "d_cp123_document") {
    errors.push("CP00-123 leak prevention must trim to authorized document");
  }
  if (resultById.permission_audit_leak_prevention_test?.hidden_fields_rendered !== false) {
    errors.push("CP00-123 leak prevention must hide fields");
  }
  if (resultById.synthetic_fixture_permission_matrix_row?.matrix_row?.persisted !== false) {
    errors.push("CP00-123 matrix row must not persist");
  }
  if (resultById.synthetic_fixture_view_decision_binding?.status !== "completed_metadata_only") {
    errors.push("CP00-123 view binding must complete metadata-only");
  }
  if (resultById.synthetic_fixture_search_decision_binding?.trimmed_result_ids?.join(",") !== "d_cp123_document") {
    errors.push("CP00-123 search binding must trim to authorized document");
  }
  if (resultById.synthetic_fixture_mutation_decision_binding?.status !== "approval_required_routing") {
    errors.push("CP00-123 mutation binding must require approval");
  }
  if (resultById.synthetic_fixture_export_download_decision_binding?.status !== "review_required_routing") {
    errors.push("CP00-123 export/download must require review");
  }
  if (resultById.synthetic_fixture_share_decision_binding?.status !== "approval_required_routing") {
    errors.push("CP00-123 share must require approval");
  }
  if (resultById.synthetic_fixture_ai_retrieval_decision_binding?.status !== "blocked_ai_retrieval_boundary") {
    errors.push("CP00-123 AI retrieval must be blocked");
  }
  if (resultById.synthetic_fixture_audit_hint_fields?.audit_event_expectation?.emitted_to_audit_ledger !== false) {
    errors.push("CP00-123 audit hint must not write ledger");
  }

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
      errors.push(`CP00-123 case ${profile.boundary_case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-124" || handoff.next_subphase_id !== "RP02.P06.M06.S09") {
    errors.push("CP00-123 must hand off to CP00-124 / RP02.P06.M06.S09");
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
