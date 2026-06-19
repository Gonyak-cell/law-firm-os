import { evaluatePermission, trimSearchResults } from "./evaluate.js";
import {
  PERMISSION_KERNEL_CP123_PERMISSION_AUDIT_TERMINAL_BOUNDARY_CONTRACT,
  createPermissionKernelCp123PermissionAuditTerminalBoundary,
  runPermissionKernelCp123PermissionAuditTerminalBoundaryCase,
} from "./permission-audit-terminal-boundary.js";

export const PERMISSION_KERNEL_CP124_PACK_BINDING = Object.freeze({
  pack_id: "CP00-124",
  planned_pack_id: "CP00-124",
  risk_class: "C",
  unit_count: 150,
  range: "RP02.P06.M06.S09-RP02.P07.M03.S10",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-123",
  next_pack_id: "CP00-125",
  next_subphase_id: "RP02.P07.M03.S11",
});

const CP124_NO_WRITE_ATTESTATION = Object.freeze({
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

const FAILURE_TITLES = Object.freeze([
  "Failure taxonomy",
  "Missing tenant failure",
  "Missing actor failure",
  "Missing Matter failure",
  "Missing resource failure",
  "Unknown action failure",
  "Cross-tenant failure",
  "Permission denied failure",
  "Ambiguous rule failure",
  "Stale reference failure",
  "Lock conflict failure",
  "Retry exhaustion failure",
  "Rollback expectation",
  "Compensation expectation",
  "Blocked-claim receipt",
  "Failure fixture",
  "Failure unit test",
  "Failure integration smoke",
  "Audit failure hint",
  "Hermes failure evidence",
]);

const PERMISSION_MATRIX_DELIVERABLE_TYPES = Object.freeze({
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

const FAILURE_DELIVERABLE_TYPES = Object.freeze({
  "Failure taxonomy": "failure_recovery",
  "Missing tenant failure": "failure_recovery",
  "Missing actor failure": "failure_recovery",
  "Missing Matter failure": "failure_recovery",
  "Missing resource failure": "failure_recovery",
  "Unknown action failure": "failure_recovery",
  "Cross-tenant failure": "failure_recovery",
  "Permission denied failure": "security_audit",
  "Ambiguous rule failure": "failure_recovery",
  "Stale reference failure": "failure_recovery",
  "Lock conflict failure": "failure_recovery",
  "Retry exhaustion failure": "failure_recovery",
  "Rollback expectation": "failure_recovery",
  "Compensation expectation": "implementation",
  "Blocked-claim receipt": "hermes_evidence",
  "Failure fixture": "fixture",
  "Failure unit test": "test",
  "Failure integration smoke": "test",
  "Audit failure hint": "security_audit",
  "Hermes failure evidence": "hermes_evidence",
});

const CP124_PERMISSION_MATRIX_PHASES = Object.freeze({
  "RP02.P06.M06": Object.freeze({
    start_index: 9,
    count: 14,
    micro_title: "Synthetic Fixture Set",
    phase_role: "permission_matrix_synthetic_fixture_terminal",
    area: "permission_matrix_synthetic_fixture_terminal",
    case_prefix: "synthetic_fixture_terminal",
  }),
  "RP02.P06.M07": Object.freeze({
    start_index: 1,
    count: 22,
    micro_title: "Test And Golden Case Set",
    phase_role: "permission_matrix_test_golden_case_set",
    area: "permission_matrix_test_golden_case_set",
    case_prefix: "test_golden_case_set",
  }),
  "RP02.P06.M08": Object.freeze({
    start_index: 1,
    count: 22,
    micro_title: "Hermes Evidence Packet",
    phase_role: "permission_matrix_hermes_evidence_packet",
    area: "permission_matrix_hermes_evidence_packet",
    case_prefix: "hermes_evidence_packet",
  }),
  "RP02.P06.M09": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Claude Review Packet",
    phase_role: "permission_matrix_claude_review_packet",
    area: "permission_matrix_claude_review_packet",
    case_prefix: "claude_review_packet",
  }),
  "RP02.P06.M10": Object.freeze({
    start_index: 1,
    count: 11,
    micro_title: "Closeout And Next Handoff",
    phase_role: "permission_matrix_closeout_next_handoff",
    area: "permission_matrix_closeout_next_handoff",
    case_prefix: "closeout_next_handoff",
  }),
});

const CP124_FAILURE_PHASES = Object.freeze({
  "RP02.P07.M00": Object.freeze({
    start_index: 1,
    count: 11,
    micro_title: "Scope Inventory",
    phase_role: "failure_taxonomy_scope_inventory",
    area: "failure_taxonomy_scope_inventory",
    case_prefix: "failure_scope_inventory",
  }),
  "RP02.P07.M01": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Contract Draft",
    phase_role: "failure_taxonomy_contract_draft",
    area: "failure_taxonomy_contract_draft",
    case_prefix: "failure_contract_draft",
  }),
  "RP02.P07.M02": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Type And Shape Definition",
    phase_role: "failure_taxonomy_type_shape_definition",
    area: "failure_taxonomy_type_shape_definition",
    case_prefix: "failure_type_shape_definition",
  }),
  "RP02.P07.M03": Object.freeze({
    start_index: 1,
    count: 10,
    micro_title: "Primary Implementation Slice",
    phase_role: "failure_taxonomy_primary_implementation_opening",
    area: "failure_taxonomy_primary_implementation_opening",
    case_prefix: "failure_primary_implementation",
  }),
});

const CP124_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "cross_tenant_resource_id",
  "unauthorized_result_count",
  "privileged_note",
  "sealed_audit_hint_payload",
  "failure_internal_stack",
  "retry_lock_token",
  "rollback_state_snapshot",
  "compensation_target",
  "external_share_target",
  "ai_retrieval_query",
]);

const SYNTHETIC_PRINCIPAL = Object.freeze({
  user_id: "u_cp124_attorney",
  tenant_id: "t_cp124",
  role_ids: Object.freeze(["attorney"]),
});

const SYNTHETIC_RESOURCE = Object.freeze({
  resource_id: "d_cp124_document",
  resource_type: "Document",
  tenant_id: "t_cp124",
  matter_id: "m_cp124",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function buildRowsFromPhases(phases, titles, deliverableTypes, domain) {
  return Object.entries(phases).flatMap(([microPhaseId, phase]) =>
    Array.from({ length: phase.count }, (_, offset) => {
      const index = phase.start_index + offset;
      const title = titles[index - 1];
      const behaviorKind = slugFor(title);
      const sourceUnitId = sourceUnitIdFor(microPhaseId, index);
      return Object.freeze({
        catalog_id: `${sourceUnitId}.${behaviorKind}`,
        pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.pack_id,
        program_id: "RP02",
        phase_id: microPhaseId.slice(0, "RP02.P06".length),
        micro_phase_id: microPhaseId,
        micro_title: phase.micro_title,
        phase_role: phase.phase_role,
        area: phase.area,
        domain,
        title,
        coverage_kind: behaviorKind,
        deliverable_type: deliverableTypes[title],
        case_id: `${phase.case_prefix}.${behaviorKind}`,
        behavior_kind: behaviorKind,
        source_unit_ids: Object.freeze([sourceUnitId]),
        required_assertions: Object.freeze([
          "synthetic_only",
          "risk_c_permission_fixture_failure_taxonomy",
          "cp123_terminal_boundary_inherited",
          "permission_matrix_routes_reference_only",
          "failure_taxonomy_fails_closed",
          "no_permission_policy_mutation",
          "no_audit_ledger_write",
          "no_product_or_database_write",
          "no_retry_rollback_lock_execution",
          "export_share_ai_boundaries_not_executed",
          "ldip_not_implemented",
          "hrx_embedded_inside_law_firm_os",
        ]),
        boundary_flags: CP124_NO_WRITE_ATTESTATION,
        synthetic_only: true,
        no_real_data: true,
        product_state_effect: "none",
      });
    }),
  );
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_permission_fixture_failure_taxonomy: true,
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
    no_write_attestation: CP124_NO_WRITE_ATTESTATION,
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
    stable_id: `cp124.${caseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-124",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function createDecisionInput(row, overrides = {}) {
  const base = {
    case_id: row.case_id,
    synthetic: true,
    principal: SYNTHETIC_PRINCIPAL,
    resource: SYNTHETIC_RESOURCE,
    action: "document.view",
    rules: [{ id: `${row.case_id}.allow_view`, effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" }],
    objectAcl: [],
  };

  if (["search_decision_binding", "security_trimming_proof", "leak_prevention_test"].includes(row.behavior_kind)) {
    base.action = "search.view";
    base.rules = [{ id: `${row.case_id}.allow_search`, effect: "allow", role_id: "attorney", resource_type: "Document", action: "search.view" }];
    base.search_results = Object.freeze([
      SYNTHETIC_RESOURCE,
      Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: "d_cp124_cross_tenant", tenant_id: "t_other", privileged_note: "must_not_render" }),
      Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: "d_cp124_acl_denied", privileged_note: "must_not_render" }),
    ]);
    base.objectAcl = (resource) =>
      resource.resource_id === "d_cp124_acl_denied"
        ? [{ id: `${row.case_id}.acl_deny`, effect: "deny", principal_id: SYNTHETIC_PRINCIPAL.user_id, action: "search.view" }]
        : [];
  }
  if (row.behavior_kind === "mutation_decision_binding") {
    base.action = "document.update";
    base.rules = [
      { id: `${row.case_id}.approval_update`, effect: "approval_required", role_id: "attorney", resource_type: "Document", action: "document.update" },
    ];
  }
  if (row.behavior_kind === "export_download_decision_binding") {
    base.action = "document.download";
    base.rules = [
      { id: `${row.case_id}.review_download`, effect: "review_required", role_id: "attorney", resource_type: "Document", action: "document.download" },
    ];
  }
  if (row.behavior_kind === "share_decision_binding") {
    base.action = "document.share.external";
    base.rules = [
      { id: `${row.case_id}.approval_share`, effect: "approval_required", role_id: "attorney", resource_type: "Document", action: "document.share.external" },
    ];
  }
  if (row.behavior_kind === "legal_hold_interaction") {
    base.rules = [
      { id: `${row.case_id}.legal_hold_deny`, effect: "deny", role_id: "attorney", resource_type: "Document", action: "document.view", reason: "legal_hold" },
    ];
  }
  if (row.behavior_kind === "ethical_wall_interaction") {
    base.rules = [
      {
        id: `${row.case_id}.ethical_wall_deny`,
        effect: "deny",
        role_id: "attorney",
        resource_type: "Document",
        action: "document.view",
        ethical_wall_matter_id: SYNTHETIC_RESOURCE.matter_id,
        reason: "ethical_wall",
      },
    ];
  }
  if (row.behavior_kind === "object_acl_interaction") {
    base.rules = [];
    base.objectAcl = [{ id: `${row.case_id}.acl_deny`, effect: "deny", principal_id: SYNTHETIC_PRINCIPAL.user_id, action: "document.view" }];
  }
  if (row.behavior_kind === "review_required_route") {
    base.action = "document.download";
    base.rules = [
      { id: `${row.case_id}.review_required`, effect: "review_required", role_id: "attorney", resource_type: "Document", action: "document.download" },
    ];
  }
  if (row.behavior_kind === "approval_required_route") {
    base.action = "document.delete.request";
    base.rules = [
      { id: `${row.case_id}.approval_required`, effect: "approval_required", role_id: "attorney", resource_type: "Document", action: "document.delete.request" },
    ];
  }
  if (["deny_over_allow_check", "denied_test"].includes(row.behavior_kind)) {
    base.rules = [
      { id: `${row.case_id}.allow_view`, effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" },
      { id: `${row.case_id}.deny_override`, effect: "deny", role_id: "attorney", resource_type: "Document", action: "document.view", reason: "deny_over_allow" },
    ];
  }
  if (["allowed_test", "matched_rule_capture", "view_decision_binding"].includes(row.behavior_kind)) {
    base.rules = [
      { id: `${row.case_id}.allow_matched_rule`, effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" },
    ];
  }
  if (row.behavior_kind === "cross_tenant_test") {
    base.resource = Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: "d_cp124_cross_tenant", tenant_id: "t_other" });
  }

  return Object.freeze({ ...base, ...overrides });
}

function runPermissionMatrixCase(row, overrides = {}) {
  if (row.behavior_kind === "permission_matrix_row") {
    return freezeNoWriteResult({
      case_id: row.case_id,
      domain: row.domain,
      behavior_kind: row.behavior_kind,
      status: "matrix_row_bound_metadata_only",
      reason: "synthetic_permission_matrix_terminal_row",
      evaluator_invoked: false,
      decision: null,
      matrix_row: Object.freeze({
        phase_role: row.phase_role,
        tenant_boundary_required: true,
        audit_hint_preview_only: true,
        persisted: false,
      }),
      ...createStableReplay(row.case_id, "matrix_row_bound_metadata_only"),
    });
  }
  if (row.behavior_kind === "permission_fixture") {
    return freezeNoWriteResult({
      case_id: row.case_id,
      domain: row.domain,
      behavior_kind: row.behavior_kind,
      status: "permission_fixture_bound_metadata_only",
      reason: "synthetic_permission_fixture",
      evaluator_invoked: false,
      decision: null,
      permission_fixture: Object.freeze({
        principal_id: SYNTHETIC_PRINCIPAL.user_id,
        tenant_id: SYNTHETIC_PRINCIPAL.tenant_id,
        matter_id: SYNTHETIC_RESOURCE.matter_id,
        actions: Object.freeze(["document.view", "search.view", "document.download", "document.share.external"]),
        persisted: false,
      }),
      ...createStableReplay(row.case_id, "permission_fixture_bound_metadata_only"),
    });
  }
  if (row.behavior_kind === "audit_hint_fields" || row.behavior_kind === "audit_event_expectation") {
    return freezeNoWriteResult({
      case_id: row.case_id,
      domain: row.domain,
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
      ...createStableReplay(row.case_id, "audit_expectation_recorded"),
    });
  }
  if (row.behavior_kind === "ai_retrieval_decision_binding") {
    return freezeNoWriteResult({
      case_id: row.case_id,
      domain: row.domain,
      behavior_kind: row.behavior_kind,
      status: "blocked_ai_retrieval_boundary",
      reason: "ai_retrieval_reference_only",
      evaluator_invoked: false,
      decision: null,
      ...createStableReplay(row.case_id, "blocked_ai_retrieval_boundary"),
    });
  }

  const input = createDecisionInput(row, overrides);
  if (["search_decision_binding", "security_trimming_proof", "leak_prevention_test"].includes(row.behavior_kind)) {
    const trimmed = trimSearchResults(input.principal, input.search_results, input.rules, input.objectAcl, "search.view");
    return freezeNoWriteResult({
      case_id: row.case_id,
      domain: row.domain,
      behavior_kind: row.behavior_kind,
      status: "security_trimmed_before_display",
      reason: "unauthorized_resources_omitted_without_counts",
      evaluator_invoked: true,
      decision: Object.freeze({ effect: "allow", reason: "security_trimmed" }),
      trimmed_result_ids: Object.freeze(trimmed.map((resource) => resource.resource_id)),
      rendered_result_count: trimmed.length,
      omitted_result_policy: "do_not_count_or_render_unauthorized_results",
      rendered_fields: Object.freeze(["resource_id", "resource_type", "matter_id"]),
      hidden_fields_rendered: false,
      ...createStableReplay(row.case_id, "security_trimmed_before_display"),
    });
  }

  const decision = evaluatePermission({
    principal: input.principal,
    resource: input.resource,
    action: input.action,
    rules: input.rules,
    objectAcl: input.objectAcl,
  });
  const status = routeForDecision(decision);
  return freezeNoWriteResult({
    case_id: row.case_id,
    domain: row.domain,
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
    ...createStableReplay(row.case_id, status),
  });
}

function runFailureTaxonomyCase(row) {
  const statusByKind = Object.freeze({
    failure_taxonomy: "failure_taxonomy_bound",
    missing_tenant_failure: "blocked_missing_tenant",
    missing_actor_failure: "blocked_missing_actor",
    missing_matter_failure: "blocked_missing_matter",
    missing_resource_failure: "blocked_missing_resource",
    unknown_action_failure: "blocked_unknown_action",
    cross_tenant_failure: "blocked_cross_tenant",
    permission_denied_failure: "blocked_permission_denied",
    ambiguous_rule_failure: "blocked_ambiguous_rule",
    stale_reference_failure: "blocked_stale_reference",
    lock_conflict_failure: "blocked_lock_conflict",
    retry_exhaustion_failure: "retry_exhausted_no_retry_execution",
    rollback_expectation: "rollback_expected_not_executed",
    compensation_expectation: "compensation_expected_not_executed",
    blocked_claim_receipt: "blocked_claim_receipt_bound",
    failure_fixture: "failure_fixture_bound",
    failure_unit_test: "failure_test_bound",
    failure_integration_smoke: "failure_smoke_bound",
    audit_failure_hint: "audit_failure_hint_bound",
    hermes_failure_evidence: "hermes_failure_evidence_bound",
  });
  const status = statusByKind[row.behavior_kind] ?? "blocked_unknown_failure_kind";
  return freezeNoWriteResult({
    case_id: row.case_id,
    domain: row.domain,
    behavior_kind: row.behavior_kind,
    status,
    reason: row.behavior_kind,
    evaluator_invoked: false,
    decision: null,
    failure_code: `permission_kernel.${row.behavior_kind}`,
    fail_closed: true,
    retry_policy: Object.freeze({
      retry_allowed_by_this_pack: false,
      retry_executed: false,
      retry_receipt_reference_only: row.behavior_kind === "retry_exhaustion_failure",
    }),
    rollback_policy: Object.freeze({
      rollback_expected: row.behavior_kind === "rollback_expectation",
      rollback_executed: false,
      compensation_executed: false,
    }),
    lock_policy: Object.freeze({
      lock_conflict_detected: row.behavior_kind === "lock_conflict_failure",
      lock_acquired: false,
      lock_token_persisted: false,
    }),
    blocked_claim_receipt: Object.freeze({
      required: ["blocked_claim_receipt", "permission_denied_failure", "cross_tenant_failure"].includes(row.behavior_kind),
      emitted_to_hermes_runtime: false,
      preview_only: true,
    }),
    failure_fixture: Object.freeze({
      fixture_kind: row.behavior_kind,
      persisted: false,
      contains_real_data: false,
    }),
    audit_failure_hint: Object.freeze({
      preview_only: true,
      emitted_to_audit_ledger: false,
      hidden_fields_rendered: false,
    }),
    hermes_failure_evidence: Object.freeze({
      reference_only: true,
      command_evidence_required_at_pack_closeout: true,
      writes_hermes_runtime: false,
    }),
    ...createStableReplay(row.case_id, status),
  });
}

export const PERMISSION_KERNEL_CP124_PERMISSION_FIXTURE_FAILURE_TAXONOMY_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp124_permission_fixture_failure_taxonomy_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP124_PACK_BINDING.range,
  upstream_permission_audit_terminal_boundary_pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.upstream_pack_id,
  inherited_permission_audit_terminal_boundary_contract_id:
    PERMISSION_KERNEL_CP123_PERMISSION_AUDIT_TERMINAL_BOUNDARY_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP124_PACK_BINDING.unit_count,
  permission_matrix_unit_count: 89,
  failure_taxonomy_unit_count: 61,
  risk_c_permission_fixture_failure_taxonomy: true,
  synthetic_only: true,
  metadata_only_permission_fixture_matrix: true,
  metadata_only_failure_taxonomy: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  hidden_source_fields: CP124_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP124_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP124_PACK_BINDING",
    "PERMISSION_KERNEL_CP124_PERMISSION_FIXTURE_FAILURE_TAXONOMY_CONTRACT",
    "createPermissionKernelCp124PermissionFixtureFailureTaxonomyCatalog",
    "createPermissionKernelCp124CoveredUnitIds",
    "createPermissionKernelCp124PermissionFixtureFailureTaxonomy",
    "runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase",
    "createPermissionKernelCp124PermissionFixtureFailureTaxonomyManifest",
    "createPermissionKernelCp124HermesEvidencePacket",
    "createPermissionKernelCp124ClaudeReviewPacket",
    "createPermissionKernelCp124CloseoutHandoff",
    "validatePermissionKernelCp124Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP124_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel failure taxonomy primary implementation at RP02.P07.M03.S11 as Risk A; close lock conflict, retry exhaustion, rollback, compensation, blocked-claim, fixture, failure test, audit hint, and Hermes evidence boundaries without executing locks, retries, rollback, compensation, audit writes, export/share, AI, LDIP, or HRX split.",
  }),
});

export function createPermissionKernelCp124PermissionFixtureFailureTaxonomyCatalog() {
  return Object.freeze([
    ...buildRowsFromPhases(CP124_PERMISSION_MATRIX_PHASES, PERMISSION_MATRIX_TITLES, PERMISSION_MATRIX_DELIVERABLE_TYPES, "permission_matrix"),
    ...buildRowsFromPhases(CP124_FAILURE_PHASES, FAILURE_TITLES, FAILURE_DELIVERABLE_TYPES, "failure_taxonomy"),
  ]);
}

export function createPermissionKernelCp124CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp124PermissionFixtureFailureTaxonomyCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase(caseId, overrides = {}) {
  const row = createPermissionKernelCp124PermissionFixtureFailureTaxonomyCatalog().find((item) => item.case_id === caseId);
  if (!row) {
    return freezeNoWriteResult({
      case_id: caseId,
      domain: "unknown",
      behavior_kind: "unknown",
      status: "blocked_before_permission_evaluation",
      reason: "unknown_permission_fixture_failure_taxonomy_case",
      evaluator_invoked: false,
      decision: null,
      ...createStableReplay(caseId, "blocked_before_permission_evaluation"),
    });
  }
  if (row.domain === "failure_taxonomy") return runFailureTaxonomyCase(row);
  return runPermissionMatrixCase(row, overrides);
}

export function createPermissionKernelCp124PermissionFixtureFailureTaxonomy() {
  const catalog = createPermissionKernelCp124PermissionFixtureFailureTaxonomyCatalog();
  const inheritedTerminal = createPermissionKernelCp123PermissionAuditTerminalBoundary();
  const inheritedCrossTenant = runPermissionKernelCp123PermissionAuditTerminalBoundaryCase("permission_audit_cross_tenant_test");
  const permissionRows = catalog.filter((row) => row.domain === "permission_matrix");
  const failureRows = catalog.filter((row) => row.domain === "failure_taxonomy");
  const permissionMatrixCaseResults = Object.freeze(
    permissionRows.map((row) => runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase(row.case_id)),
  );
  const failureTaxonomyResults = Object.freeze(
    failureRows.map((row) => runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase(row.case_id)),
  );

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.upstream_pack_id,
    inherited_terminal_boundary_case_count: inheritedTerminal.boundary_case_count,
    inherited_cross_tenant_reason: inheritedCrossTenant.reason,
    permission_matrix_case_count: permissionMatrixCaseResults.length,
    failure_taxonomy_result_count: failureTaxonomyResults.length,
    permission_matrix_case_results: permissionMatrixCaseResults,
    failure_taxonomy_results: failureTaxonomyResults,
    hidden_source_fields: CP124_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP124_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp124PermissionFixtureFailureTaxonomyManifest() {
  const rows = createPermissionKernelCp124PermissionFixtureFailureTaxonomyCatalog();
  const unitIds = createPermissionKernelCp124CoveredUnitIds();
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
  const domainCounts = rows.reduce((counts, row) => {
    counts[row.domain] = (counts[row.domain] ?? 0) + 1;
    return counts;
  }, {});
  const matrix = createPermissionKernelCp124PermissionFixtureFailureTaxonomy();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp124_permission_fixture_failure_taxonomy_manifest",
    source_unit_range: PERMISSION_KERNEL_CP124_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    domain_counts: Object.freeze(domainCounts),
    permission_matrix_case_count: matrix.permission_matrix_case_count,
    failure_taxonomy_result_count: matrix.failure_taxonomy_result_count,
    inherited_terminal_boundary_case_count: matrix.inherited_terminal_boundary_case_count,
    synthetic_only: true,
    no_real_data: true,
    risk_c_permission_fixture_failure_taxonomy: true,
    metadata_only_permission_fixture_matrix: true,
    metadata_only_failure_taxonomy: true,
    no_write_attestation: CP124_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP124_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp124HermesEvidencePacket() {
  const manifest = createPermissionKernelCp124PermissionFixtureFailureTaxonomyManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp124_permission_fixture_failure_taxonomy_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-124",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp124ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp124_permission_fixture_failure_taxonomy_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-124 closes the planned Risk C RP02 permission matrix terminal and failure taxonomy opening units, inherits CP123 terminal boundaries, preserves synthetic-only metadata-only behavior, routes permission matrix decisions without unsafe execution, fails closed for failure taxonomy cases, keeps audit/Hermes evidence preview-only, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, locks, retry, rollback, compensation, external share/export, AI/analytics execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp124CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP124_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP124_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP124_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP124_PERMISSION_FIXTURE_FAILURE_TAXONOMY_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp124Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp124PermissionFixtureFailureTaxonomyCatalog();
  const unitIds = createPermissionKernelCp124CoveredUnitIds();
  const manifest = createPermissionKernelCp124PermissionFixtureFailureTaxonomyManifest();
  const matrix = createPermissionKernelCp124PermissionFixtureFailureTaxonomy();
  const handoff = createPermissionKernelCp124CloseoutHandoff();
  const resultById = Object.fromEntries([
    ...matrix.permission_matrix_case_results,
    ...matrix.failure_taxonomy_results,
  ].map((result) => [result.case_id, result]));

  if (rows.length !== 150) errors.push("CP00-124 row count must be 150");
  if (unitIds.length !== 150) errors.push("CP00-124 covered unit count must be 150");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-124 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P06.M06.S09") errors.push("CP00-124 first unit must be RP02.P06.M06.S09");
  if (unitIds.at(-1) !== "RP02.P07.M03.S10") errors.push("CP00-124 last unit must be RP02.P07.M03.S10");
  if (manifest.covered_micro_phase_count !== 9) errors.push("CP00-124 must cover nine micro phases");
  if (manifest.domain_counts.permission_matrix !== 89) errors.push("CP00-124 permission matrix domain count must be 89");
  if (manifest.domain_counts.failure_taxonomy !== 61) errors.push("CP00-124 failure taxonomy domain count must be 61");
  if (manifest.phase_counts["RP02.P06.M06"] !== 14) errors.push("CP00-124 RP02.P06.M06 count must be 14");
  if (manifest.phase_counts["RP02.P06.M07"] !== 22) errors.push("CP00-124 RP02.P06.M07 count must be 22");
  if (manifest.phase_counts["RP02.P06.M08"] !== 22) errors.push("CP00-124 RP02.P06.M08 count must be 22");
  if (manifest.phase_counts["RP02.P06.M09"] !== 20) errors.push("CP00-124 RP02.P06.M09 count must be 20");
  if (manifest.phase_counts["RP02.P06.M10"] !== 11) errors.push("CP00-124 RP02.P06.M10 count must be 11");
  if (manifest.phase_counts["RP02.P07.M00"] !== 11) errors.push("CP00-124 RP02.P07.M00 count must be 11");
  if (manifest.phase_counts["RP02.P07.M01"] !== 20) errors.push("CP00-124 RP02.P07.M01 count must be 20");
  if (manifest.phase_counts["RP02.P07.M02"] !== 20) errors.push("CP00-124 RP02.P07.M02 count must be 20");
  if (manifest.phase_counts["RP02.P07.M03"] !== 10) errors.push("CP00-124 RP02.P07.M03 count must be 10");
  if (manifest.deliverable_counts.implementation !== 36) errors.push("CP00-124 implementation deliverable count must be 36");
  if (manifest.deliverable_counts.ui !== 17) errors.push("CP00-124 ui deliverable count must be 17");
  if (manifest.deliverable_counts.claude_review !== 4) errors.push("CP00-124 claude_review deliverable count must be 4");
  if (manifest.deliverable_counts.security_audit !== 26) errors.push("CP00-124 security_audit deliverable count must be 26");
  if (manifest.deliverable_counts.test !== 18) errors.push("CP00-124 test deliverable count must be 18");
  if (manifest.deliverable_counts.failure_recovery !== 43) errors.push("CP00-124 failure_recovery deliverable count must be 43");
  if (manifest.deliverable_counts.hermes_evidence !== 4) errors.push("CP00-124 hermes_evidence deliverable count must be 4");
  if (manifest.deliverable_counts.fixture !== 2) errors.push("CP00-124 fixture deliverable count must be 2");
  if (matrix.inherited_terminal_boundary_case_count !== 10) errors.push("CP00-124 must inherit ten CP123 terminal boundary cases");
  if (matrix.inherited_cross_tenant_reason !== "cross_tenant_deny") errors.push("CP00-124 must inherit CP123 cross-tenant denial");
  if (matrix.permission_matrix_case_count !== 89) errors.push("CP00-124 permission matrix case count must be 89");
  if (matrix.failure_taxonomy_result_count !== 61) errors.push("CP00-124 failure taxonomy result count must be 61");

  if (resultById["synthetic_fixture_terminal.matched_rule_capture"]?.decision?.effect !== "allow") {
    errors.push("CP00-124 matched rule capture must allow metadata-only");
  }
  if (resultById["test_golden_case_set.cross_tenant_test"]?.decision?.audit_hint?.object_id !== "redacted_cross_tenant_object") {
    errors.push("CP00-124 cross-tenant test must redact object id");
  }
  if (resultById["test_golden_case_set.leak_prevention_test"]?.trimmed_result_ids?.join(",") !== "d_cp124_document") {
    errors.push("CP00-124 leak prevention must trim to authorized document");
  }
  if (resultById["hermes_evidence_packet.security_trimming_proof"]?.hidden_fields_rendered !== false) {
    errors.push("CP00-124 security trimming must hide fields");
  }
  if (resultById["claude_review_packet.review_required_route"]?.status !== "review_required_routing") {
    errors.push("CP00-124 review route must require review");
  }
  if (resultById["claude_review_packet.approval_required_route"]?.status !== "approval_required_routing") {
    errors.push("CP00-124 approval route must require approval");
  }
  if (resultById["closeout_next_handoff.legal_hold_interaction"]?.reason !== "legal_hold") {
    errors.push("CP00-124 closeout legal hold interaction mismatch");
  }
  if (resultById["failure_scope_inventory.missing_tenant_failure"]?.status !== "blocked_missing_tenant") {
    errors.push("CP00-124 missing tenant failure must fail closed");
  }
  if (resultById["failure_contract_draft.retry_exhaustion_failure"]?.executes_retry !== false) {
    errors.push("CP00-124 retry exhaustion must not execute retry");
  }
  if (resultById["failure_contract_draft.rollback_expectation"]?.executes_rollback !== false) {
    errors.push("CP00-124 rollback expectation must not execute rollback");
  }
  if (resultById["failure_type_shape_definition.lock_conflict_failure"]?.acquires_locks !== false) {
    errors.push("CP00-124 lock conflict must not acquire locks");
  }
  if (resultById["failure_type_shape_definition.blocked_claim_receipt"]?.blocked_claim_receipt?.preview_only !== true) {
    errors.push("CP00-124 blocked claim receipt must be preview-only");
  }
  if (resultById["failure_type_shape_definition.audit_failure_hint"]?.audit_failure_hint?.emitted_to_audit_ledger !== false) {
    errors.push("CP00-124 audit failure hint must not write audit ledger");
  }
  if (resultById["failure_type_shape_definition.hermes_failure_evidence"]?.hermes_failure_evidence?.reference_only !== true) {
    errors.push("CP00-124 Hermes failure evidence must be reference-only");
  }

  for (const profile of [...matrix.permission_matrix_case_results, ...matrix.failure_taxonomy_results]) {
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
      errors.push(`CP00-124 case ${profile.case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-125" || handoff.next_subphase_id !== "RP02.P07.M03.S11") {
    errors.push("CP00-124 must hand off to CP00-125 / RP02.P07.M03.S11");
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
