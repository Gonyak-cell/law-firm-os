import { evaluatePermission, trimSearchResults } from "./evaluate.js";
import {
  PERMISSION_KERNEL_CP121_PERMISSION_MATRIX_RISK_BOUNDARY_CONTRACT,
  createPermissionKernelCp121PermissionMatrixRiskBoundary,
  runPermissionKernelCp121PermissionMatrixBoundaryCase,
} from "./permission-matrix-risk-boundary.js";

export const PERMISSION_KERNEL_CP122_PACK_BINDING = Object.freeze({
  pack_id: "CP00-122",
  planned_pack_id: "CP00-122",
  risk_class: "B",
  unit_count: 40,
  range: "RP02.P06.M04.S03-RP02.P06.M05.S20",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-121",
  next_pack_id: "CP00-123",
  next_subphase_id: "RP02.P06.M05.S21",
});

const CP122_NO_WRITE_ATTESTATION = Object.freeze({
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

const PERMISSION_MATRIX_TITLES = Object.freeze([
  "Permission matrix row",
  "View decision binding",
  "Search decision binding",
  "Mutation decision binding",
  "Export/download decision binding",
  "Share decision binding",
  "AI retrieval decision binding",
  "Audit hint fields",
  "Matched rule capture",
  "Deny-over-allow check",
  "Legal hold interaction",
  "Ethical wall interaction",
  "Object ACL interaction",
  "Review-required route",
  "Approval-required route",
  "Security trimming proof",
  "Audit event expectation",
  "Permission fixture",
  "Allowed test",
  "Denied test",
  "Cross-tenant test",
  "Leak prevention test",
]);

const DELIVERABLE_TYPES = Object.freeze({
  "Permission matrix row": "security_audit",
  "View decision binding": "implementation",
  "Search decision binding": "implementation",
  "Mutation decision binding": "implementation",
  "Export/download decision binding": "implementation",
  "Share decision binding": "implementation",
  "AI retrieval decision binding": "implementation",
  "Audit hint fields": "security_audit",
  "Matched rule capture": "implementation",
  "Deny-over-allow check": "implementation",
  "Legal hold interaction": "ui",
  "Ethical wall interaction": "ui",
  "Object ACL interaction": "ui",
  "Review-required route": "claude_review",
  "Approval-required route": "ui",
  "Security trimming proof": "security_audit",
  "Audit event expectation": "security_audit",
  "Permission fixture": "security_audit",
  "Allowed test": "test",
  "Denied test": "test",
  "Cross-tenant test": "test",
  "Leak prevention test": "test",
});

const CP122_PHASES = Object.freeze({
  "RP02.P06.M04": Object.freeze({
    start_index: 3,
    count: 20,
    micro_title: "Secondary Workflow Slice",
    phase_role: "permission_matrix_secondary_workflow_terminal",
    area: "permission_matrix_secondary_workflow",
    case_prefix: "secondary_workflow",
  }),
  "RP02.P06.M05": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Permission And Audit Binding",
    phase_role: "permission_matrix_permission_audit_binding_opening",
    area: "permission_matrix_permission_audit_binding",
    case_prefix: "permission_audit_binding",
  }),
});

const CP122_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "cross_tenant_resource_id",
  "unauthorized_result_count",
  "privileged_note",
  "sealed_audit_hint_payload",
  "external_share_target",
  "ai_retrieval_query",
]);

const SYNTHETIC_PRINCIPAL = Object.freeze({
  user_id: "u_cp122_attorney",
  tenant_id: "t_cp122",
  role_ids: Object.freeze(["attorney"]),
});

const SYNTHETIC_RESOURCE = Object.freeze({
  resource_id: "d_cp122_document",
  resource_type: "Document",
  tenant_id: "t_cp122",
  matter_id: "m_cp122",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_b_permission_matrix_workflow: true,
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
    no_write_attestation: CP122_NO_WRITE_ATTESTATION,
  });
}

function routeForDecision(decision) {
  if (decision.effect === "allow") return "completed_metadata_only";
  if (decision.effect === "approval_required") return "approval_required_routing";
  if (decision.effect === "review_required") return "review_required_routing";
  return "blocked_claim_output";
}

function createStableReplay(workflowCaseId, status) {
  return Object.freeze({
    stable_id: `cp122.${workflowCaseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "workflow_case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-122",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function createCatalogRow(microPhaseId, phase, index) {
  const title = PERMISSION_MATRIX_TITLES[index - 1];
  const behaviorKind = slugFor(title);
  const sourceUnitId = sourceUnitIdFor(microPhaseId, index);
  return Object.freeze({
    catalog_id: `${sourceUnitId}.${behaviorKind}`,
    pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.pack_id,
    program_id: "RP02",
    phase_id: "RP02.P06",
    micro_phase_id: microPhaseId,
    micro_title: phase.micro_title,
    phase_role: phase.phase_role,
    area: phase.area,
    title,
    coverage_kind: behaviorKind,
    deliverable_type: DELIVERABLE_TYPES[title],
    workflow_case_id: `${phase.case_prefix}.${behaviorKind}`,
    behavior_kind: behaviorKind,
    source_unit_ids: Object.freeze([sourceUnitId]),
    required_assertions: Object.freeze([
      "synthetic_only",
      "risk_b_permission_matrix_workflow",
      "cp121_risk_a_boundary_inherited",
      "permission_audit_binding_reference_only",
      "approval_and_review_routes_do_not_grant_authority",
      "security_trimming_omits_unauthorized_results",
      "audit_expectation_preview_only",
      "permission_fixture_not_persisted",
      "export_share_ai_boundaries_not_executed",
      "no_permission_policy_mutation",
      "no_audit_ledger_write",
      "no_product_or_database_write",
      "ldip_not_implemented",
      "hrx_embedded_inside_law_firm_os",
    ]),
    boundary_flags: CP122_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    product_state_effect: "none",
  });
}

function createDecisionInput(row, overrides = {}) {
  const rulePrefix = row.workflow_case_id.replaceAll(".", "_");
  const base = {
    workflow_case_id: row.workflow_case_id,
    synthetic: true,
    principal: SYNTHETIC_PRINCIPAL,
    resource: SYNTHETIC_RESOURCE,
    action: "document.view",
    rules: [
      { id: `${rulePrefix}_allow_view`, effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" },
    ],
    objectAcl: [],
  };

  if (row.behavior_kind === "mutation_decision_binding") {
    base.action = "document.update";
    base.rules = [
      { id: `${rulePrefix}_approval_update`, effect: "approval_required", role_id: "attorney", resource_type: "Document", action: "document.update" },
    ];
  }
  if (row.behavior_kind === "export_download_decision_binding" || row.behavior_kind === "review_required_route") {
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
  if (row.behavior_kind === "approval_required_route") {
    base.action = "document.delete.request";
    base.rules = [
      {
        id: `${rulePrefix}_approval_required`,
        effect: "approval_required",
        role_id: "attorney",
        resource_type: "Document",
        action: "document.delete.request",
      },
    ];
  }
  if (row.behavior_kind === "legal_hold_interaction") {
    base.rules = [
      { id: `${rulePrefix}_legal_hold_deny`, effect: "deny", role_id: "attorney", resource_type: "Document", action: "document.view", reason: "legal_hold" },
    ];
  }
  if (row.behavior_kind === "ethical_wall_interaction") {
    base.rules = [
      {
        id: `${rulePrefix}_ethical_wall_deny`,
        effect: "deny",
        role_id: "attorney",
        resource_type: "Document",
        action: "document.view",
        ethical_wall_matter_id: "m_cp122",
        reason: "ethical_wall",
      },
    ];
  }
  if (row.behavior_kind === "object_acl_interaction") {
    base.rules = [];
    base.objectAcl = [{ id: `${rulePrefix}_acl_deny`, effect: "deny", principal_id: SYNTHETIC_PRINCIPAL.user_id, action: "document.view" }];
  }
  if (row.behavior_kind === "matched_rule_capture" || row.behavior_kind === "allowed_test" || row.behavior_kind === "view_decision_binding") {
    base.rules = [
      { id: `${rulePrefix}_allow_matched_rule`, effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" },
    ];
  }
  if (row.behavior_kind === "deny_over_allow_check" || row.behavior_kind === "denied_test") {
    base.rules = [
      { id: `${rulePrefix}_allow_view`, effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" },
      { id: `${rulePrefix}_deny_override`, effect: "deny", role_id: "attorney", resource_type: "Document", action: "document.view", reason: "deny_over_allow" },
    ];
  }
  if (row.behavior_kind === "cross_tenant_test") {
    base.resource = Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: `${rulePrefix}_cross_tenant`, tenant_id: "t_other" });
  }
  return Object.freeze({ ...base, ...overrides });
}

function runSearchTrimWorkflow(row) {
  const rulePrefix = row.workflow_case_id.replaceAll(".", "_");
  const searchRules = Object.freeze([
    { id: `${rulePrefix}_allow_search`, effect: "allow", role_id: "attorney", resource_type: "Document", action: "search.view" },
  ]);
  const searchResults = Object.freeze([
    SYNTHETIC_RESOURCE,
    Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: `${rulePrefix}_cross_tenant`, tenant_id: "t_other", privileged_note: "must_not_render" }),
    Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: `${rulePrefix}_acl_denied`, privileged_note: "must_not_render" }),
  ]);
  const objectAcl = (resource) =>
    resource.resource_id.endsWith("_acl_denied")
      ? [{ id: `${rulePrefix}_acl_deny`, effect: "deny", principal_id: SYNTHETIC_PRINCIPAL.user_id, action: "search.view" }]
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

export const PERMISSION_KERNEL_CP122_PERMISSION_MATRIX_WORKFLOW_BINDING_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp122_permission_matrix_workflow_binding_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP122_PACK_BINDING.range,
  upstream_permission_matrix_risk_boundary_pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.upstream_pack_id,
  inherited_permission_matrix_risk_boundary_contract_id:
    PERMISSION_KERNEL_CP121_PERMISSION_MATRIX_RISK_BOUNDARY_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP122_PACK_BINDING.unit_count,
  risk_b_permission_matrix_workflow: true,
  synthetic_only: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  hidden_source_fields: CP122_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP122_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP122_PACK_BINDING",
    "PERMISSION_KERNEL_CP122_PERMISSION_MATRIX_WORKFLOW_BINDING_CONTRACT",
    "createPermissionKernelCp122PermissionMatrixWorkflowBindingCatalog",
    "createPermissionKernelCp122CoveredUnitIds",
    "createPermissionKernelCp122PermissionMatrixWorkflowBinding",
    "runPermissionKernelCp122PermissionMatrixWorkflowCase",
    "createPermissionKernelCp122PermissionMatrixWorkflowBindingManifest",
    "createPermissionKernelCp122HermesEvidencePacket",
    "createPermissionKernelCp122ClaudeReviewPacket",
    "createPermissionKernelCp122CloseoutHandoff",
    "validatePermissionKernelCp122Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP122_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel permission-and-audit binding terminal Risk A cases at RP02.P06.M05.S21 without widening tenant, approval, audit, export/share, AI, persistence, or LDIP implementation boundaries.",
  }),
});

export function createPermissionKernelCp122PermissionMatrixWorkflowBindingCatalog() {
  const rows = [];
  for (const [microPhaseId, phase] of Object.entries(CP122_PHASES)) {
    for (let offset = 0; offset < phase.count; offset += 1) {
      rows.push(createCatalogRow(microPhaseId, phase, phase.start_index + offset));
    }
  }
  return Object.freeze(rows);
}

export function createPermissionKernelCp122CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp122PermissionMatrixWorkflowBindingCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp122PermissionMatrixWorkflowCase(workflowCaseId, overrides = {}) {
  const row = createPermissionKernelCp122PermissionMatrixWorkflowBindingCatalog().find((item) => item.workflow_case_id === workflowCaseId);
  if (!row) {
    return freezeNoWriteResult({
      workflow_case_id: workflowCaseId,
      behavior_kind: "unknown",
      status: "blocked_before_permission_evaluation",
      reason: "unknown_permission_matrix_workflow_case",
      evaluator_invoked: false,
      decision: null,
      ...createStableReplay(workflowCaseId, "blocked_before_permission_evaluation"),
    });
  }
  if (row.behavior_kind === "search_decision_binding" || row.behavior_kind === "security_trimming_proof" || row.behavior_kind === "leak_prevention_test") {
    const trimWorkflow = runSearchTrimWorkflow(row);
    return freezeNoWriteResult({
      workflow_case_id: row.workflow_case_id,
      behavior_kind: row.behavior_kind,
      status: "security_trimmed_before_display",
      reason: "unauthorized_resources_omitted_without_counts",
      evaluator_invoked: true,
      decision: Object.freeze({ effect: "allow", reason: "security_trimmed" }),
      ...trimWorkflow,
      ...createStableReplay(row.workflow_case_id, "security_trimmed_before_display"),
    });
  }
  if (row.behavior_kind === "audit_hint_fields" || row.behavior_kind === "audit_event_expectation") {
    return freezeNoWriteResult({
      workflow_case_id: row.workflow_case_id,
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
      ...createStableReplay(row.workflow_case_id, "audit_expectation_recorded"),
    });
  }
  if (row.behavior_kind === "permission_fixture") {
    return freezeNoWriteResult({
      workflow_case_id: row.workflow_case_id,
      behavior_kind: row.behavior_kind,
      status: "permission_fixture_bound_metadata_only",
      reason: "synthetic_permission_fixture",
      evaluator_invoked: false,
      decision: null,
      permission_fixture: Object.freeze({
        principal_id: SYNTHETIC_PRINCIPAL.user_id,
        tenant_id: SYNTHETIC_PRINCIPAL.tenant_id,
        resource_id: SYNTHETIC_RESOURCE.resource_id,
        actions: Object.freeze(["document.view", "search.view", "document.download", "document.share.external"]),
        persisted: false,
      }),
      ...createStableReplay(row.workflow_case_id, "permission_fixture_bound_metadata_only"),
    });
  }
  if (row.behavior_kind === "permission_matrix_row") {
    return freezeNoWriteResult({
      workflow_case_id: row.workflow_case_id,
      behavior_kind: row.behavior_kind,
      status: "matrix_row_bound_metadata_only",
      reason: "permission_matrix_row_preview",
      evaluator_invoked: false,
      decision: null,
      matrix_row: Object.freeze({
        action_family: row.area,
        tenant_boundary_required: true,
        deny_over_allow: true,
        audit_hint_preview_only: true,
        persisted: false,
      }),
      ...createStableReplay(row.workflow_case_id, "matrix_row_bound_metadata_only"),
    });
  }
  if (row.behavior_kind === "ai_retrieval_decision_binding") {
    return freezeNoWriteResult({
      workflow_case_id: row.workflow_case_id,
      behavior_kind: row.behavior_kind,
      status: "blocked_ai_retrieval_boundary",
      reason: "ai_retrieval_reference_only",
      evaluator_invoked: false,
      decision: null,
      ...createStableReplay(row.workflow_case_id, "blocked_ai_retrieval_boundary"),
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
    workflow_case_id: row.workflow_case_id,
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
    ...createStableReplay(row.workflow_case_id, status),
  });
}

export function createPermissionKernelCp122PermissionMatrixWorkflowBinding() {
  const inheritedBoundary = createPermissionKernelCp121PermissionMatrixRiskBoundary();
  const inheritedApprovalRoute = runPermissionKernelCp121PermissionMatrixBoundaryCase("approval_required_route");
  const workflowCases = Object.freeze(
    createPermissionKernelCp122PermissionMatrixWorkflowBindingCatalog().map((row) =>
      runPermissionKernelCp122PermissionMatrixWorkflowCase(row.workflow_case_id),
    ),
  );
  const phaseCounts = workflowCases.reduce((counts, item) => {
    const prefix = item.workflow_case_id.split(".")[0];
    counts[prefix] = (counts[prefix] ?? 0) + 1;
    return counts;
  }, {});
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.upstream_pack_id,
    inherited_boundary_case_count: inheritedBoundary.boundary_case_count,
    inherited_approval_route_status: inheritedApprovalRoute.status,
    workflow_case_count: workflowCases.length,
    workflow_case_results: workflowCases,
    phase_result_counts: Object.freeze(phaseCounts),
    hidden_source_fields: CP122_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP122_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp122PermissionMatrixWorkflowBindingManifest() {
  const rows = createPermissionKernelCp122PermissionMatrixWorkflowBindingCatalog();
  const unitIds = createPermissionKernelCp122CoveredUnitIds();
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
  const matrix = createPermissionKernelCp122PermissionMatrixWorkflowBinding();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp122_permission_matrix_workflow_binding_manifest",
    source_unit_range: PERMISSION_KERNEL_CP122_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    workflow_case_count: matrix.workflow_case_count,
    inherited_boundary_case_count: matrix.inherited_boundary_case_count,
    synthetic_only: true,
    no_real_data: true,
    risk_b_permission_matrix_workflow: true,
    no_write_attestation: CP122_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP122_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp122HermesEvidencePacket() {
  const manifest = createPermissionKernelCp122PermissionMatrixWorkflowBindingManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp122_permission_matrix_workflow_binding_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-122",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp122ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp122_permission_matrix_workflow_binding_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-122 closes the planned Risk B RP02 permission matrix workflow units, inherits CP121 Risk A boundaries, safely routes search/mutation/export/share/AI/audit/matched-rule/deny/legal-hold/Ethical Wall/object-ACL/review/approval/security-trimming/fixture/test cases, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, export/share/AI execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp122CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP122_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP122_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP122_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP122_PERMISSION_MATRIX_WORKFLOW_BINDING_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp122Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp122PermissionMatrixWorkflowBindingCatalog();
  const unitIds = createPermissionKernelCp122CoveredUnitIds();
  const manifest = createPermissionKernelCp122PermissionMatrixWorkflowBindingManifest();
  const matrix = createPermissionKernelCp122PermissionMatrixWorkflowBinding();
  const resultById = Object.fromEntries(matrix.workflow_case_results.map((result) => [result.workflow_case_id, result]));
  const handoff = createPermissionKernelCp122CloseoutHandoff();

  if (rows.length !== 40) errors.push("CP00-122 row count must be 40");
  if (unitIds.length !== 40) errors.push("CP00-122 covered unit count must be 40");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-122 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P06.M04.S03") errors.push("CP00-122 first unit must be RP02.P06.M04.S03");
  if (unitIds.at(-1) !== "RP02.P06.M05.S20") errors.push("CP00-122 last unit must be RP02.P06.M05.S20");
  if (manifest.covered_micro_phase_count !== 2) errors.push("CP00-122 must cover two micro phases");
  if (manifest.phase_counts["RP02.P06.M04"] !== 20) errors.push("CP00-122 RP02.P06.M04 count must be 20");
  if (manifest.phase_counts["RP02.P06.M05"] !== 20) errors.push("CP00-122 RP02.P06.M05 count must be 20");
  if (manifest.deliverable_counts.implementation !== 15) errors.push("CP00-122 implementation deliverable count must be 15");
  if (manifest.deliverable_counts.security_audit !== 9) errors.push("CP00-122 security_audit deliverable count must be 9");
  if (manifest.deliverable_counts.ui !== 8) errors.push("CP00-122 ui deliverable count must be 8");
  if (manifest.deliverable_counts.claude_review !== 2) errors.push("CP00-122 claude_review deliverable count must be 2");
  if (manifest.deliverable_counts.test !== 6) errors.push("CP00-122 test deliverable count must be 6");
  if (manifest.area_counts.permission_matrix_secondary_workflow !== 20) errors.push("CP00-122 secondary workflow area count must be 20");
  if (manifest.area_counts.permission_matrix_permission_audit_binding !== 20) {
    errors.push("CP00-122 permission audit binding area count must be 20");
  }
  if (matrix.inherited_boundary_case_count !== 10) errors.push("CP00-122 must inherit 10 CP121 boundary cases");
  if (matrix.inherited_approval_route_status !== "approval_required_routing") errors.push("CP00-122 inherited approval route mismatch");
  if (matrix.workflow_case_count !== 40) errors.push("CP00-122 workflow case count must be 40");
  if (matrix.phase_result_counts.secondary_workflow !== 20) errors.push("CP00-122 secondary workflow result count must be 20");
  if (matrix.phase_result_counts.permission_audit_binding !== 20) errors.push("CP00-122 permission audit binding result count must be 20");

  for (const prefix of ["secondary_workflow", "permission_audit_binding"]) {
    const search = resultById[`${prefix}.search_decision_binding`];
    if (search?.trimmed_result_ids?.join(",") !== "d_cp122_document") errors.push(`CP00-122 ${prefix} search must trim to authorized document`);
    if (search?.hidden_fields_rendered !== false) errors.push(`CP00-122 ${prefix} search must hide hidden fields`);
    if (resultById[`${prefix}.mutation_decision_binding`]?.status !== "approval_required_routing") {
      errors.push(`CP00-122 ${prefix} mutation must require approval`);
    }
    if (resultById[`${prefix}.export_download_decision_binding`]?.status !== "review_required_routing") {
      errors.push(`CP00-122 ${prefix} export/download must require review`);
    }
    if (resultById[`${prefix}.share_decision_binding`]?.status !== "approval_required_routing") {
      errors.push(`CP00-122 ${prefix} share must require approval`);
    }
    if (resultById[`${prefix}.ai_retrieval_decision_binding`]?.status !== "blocked_ai_retrieval_boundary") {
      errors.push(`CP00-122 ${prefix} AI retrieval must be blocked`);
    }
    if (resultById[`${prefix}.audit_hint_fields`]?.audit_event_expectation?.emitted_to_audit_ledger !== false) {
      errors.push(`CP00-122 ${prefix} audit hint must not write ledger`);
    }
    if (resultById[`${prefix}.matched_rule_capture`]?.decision?.effect !== "allow") {
      errors.push(`CP00-122 ${prefix} matched rule capture must allow`);
    }
    if (resultById[`${prefix}.deny_over_allow_check`]?.decision?.effect !== "deny") {
      errors.push(`CP00-122 ${prefix} deny-over-allow must deny`);
    }
    if (resultById[`${prefix}.legal_hold_interaction`]?.reason !== "legal_hold") errors.push(`CP00-122 ${prefix} legal hold reason mismatch`);
    if (resultById[`${prefix}.ethical_wall_interaction`]?.reason !== "ethical_wall") errors.push(`CP00-122 ${prefix} ethical wall reason mismatch`);
    if (resultById[`${prefix}.object_acl_interaction`]?.reason !== "object_acl_deny") errors.push(`CP00-122 ${prefix} object ACL reason mismatch`);
    if (resultById[`${prefix}.review_required_route`]?.status !== "review_required_routing") {
      errors.push(`CP00-122 ${prefix} review route mismatch`);
    }
    if (resultById[`${prefix}.approval_required_route`]?.status !== "approval_required_routing") {
      errors.push(`CP00-122 ${prefix} approval route mismatch`);
    }
    if (resultById[`${prefix}.security_trimming_proof`]?.trimmed_result_ids?.join(",") !== "d_cp122_document") {
      errors.push(`CP00-122 ${prefix} trimming proof mismatch`);
    }
    if (resultById[`${prefix}.audit_event_expectation`]?.audit_event_expectation?.emitted_to_audit_ledger !== false) {
      errors.push(`CP00-122 ${prefix} audit expectation must not write ledger`);
    }
    if (resultById[`${prefix}.permission_fixture`]?.permission_fixture?.persisted !== false) {
      errors.push(`CP00-122 ${prefix} permission fixture must not persist`);
    }
    if (resultById[`${prefix}.allowed_test`]?.decision?.effect !== "allow") errors.push(`CP00-122 ${prefix} allowed test must allow`);
    if (resultById[`${prefix}.denied_test`]?.decision?.effect !== "deny") errors.push(`CP00-122 ${prefix} denied test must deny`);
  }
  if (resultById["secondary_workflow.cross_tenant_test"]?.reason !== "cross_tenant_deny") {
    errors.push("CP00-122 secondary workflow cross-tenant test must fail closed");
  }
  if (resultById["secondary_workflow.leak_prevention_test"]?.hidden_field_names_exposed !== false) {
    errors.push("CP00-122 secondary workflow leak prevention must hide field names");
  }

  for (const profile of matrix.workflow_case_results) {
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
      errors.push(`CP00-122 case ${profile.workflow_case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-123" || handoff.next_subphase_id !== "RP02.P06.M05.S21") {
    errors.push("CP00-122 must hand off to CP00-123 / RP02.P06.M05.S21");
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
