import { evaluatePermission, trimSearchResults } from "./evaluate.js";
import {
  PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT,
  createPermissionKernelCp119FixtureWorkflowMatrix,
} from "./fixture-workflow-binding.js";

export const PERMISSION_KERNEL_CP120_PACK_BINDING = Object.freeze({
  pack_id: "CP00-120",
  planned_pack_id: "CP00-120",
  risk_class: "C",
  unit_count: 150,
  range: "RP02.P05.M06.S06-RP02.P06.M03.S14",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-119",
  next_pack_id: "CP00-121",
  next_subphase_id: "RP02.P06.M03.S15",
});

const FIXTURE_TITLES = Object.freeze([
  "Base tenant fixture",
  "Base user fixture",
  "Base matter fixture",
  "Base document fixture",
  "Primary golden case",
  "Secondary golden case",
  "Review-required case",
  "Denied case",
  "Cross-tenant case",
  "Missing context case",
  "Audit hint case",
  "Security trimming case",
  "AI retrieval or analytics case",
  "Fixture manifest",
  "Golden test",
  "Failure test",
  "Hermes fixture evidence",
  "Claude missing-test prompt",
  "Closeout handoff",
  "No-real-data check",
  "Stable ID check",
  "Replay command",
]);

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
]);

const CP120_FIXTURE_PHASES = Object.freeze({
  "RP02.P05.M06": Object.freeze({
    start_index: 6,
    count: 15,
    micro_title: "Synthetic Fixture Set",
    phase_role: "fixture_synthetic_fixture_terminal",
    area: "permission_fixture_evidence_review_closeout",
  }),
  "RP02.P05.M07": Object.freeze({
    start_index: 1,
    count: 22,
    micro_title: "Test And Golden Case Set",
    phase_role: "fixture_test_golden_case_set",
    area: "permission_fixture_evidence_review_closeout",
  }),
  "RP02.P05.M08": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Hermes Evidence Packet",
    phase_role: "fixture_hermes_evidence_packet",
    area: "permission_fixture_evidence_review_closeout",
  }),
  "RP02.P05.M09": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Claude Review Packet",
    phase_role: "fixture_claude_review_packet",
    area: "permission_fixture_evidence_review_closeout",
  }),
  "RP02.P05.M10": Object.freeze({
    start_index: 1,
    count: 8,
    micro_title: "Closeout And Next Handoff",
    phase_role: "fixture_closeout_next_handoff_opening",
    area: "permission_fixture_evidence_review_closeout",
  }),
});

const CP120_PERMISSION_MATRIX_PHASES = Object.freeze({
  "RP02.P06.M00": Object.freeze({
    start_index: 1,
    count: 11,
    micro_title: "Scope Inventory",
    phase_role: "permission_matrix_scope_inventory",
    area: "permission_matrix_scope_inventory",
  }),
  "RP02.P06.M01": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Contract Draft",
    phase_role: "permission_matrix_contract_draft",
    area: "permission_matrix_contract_draft",
  }),
  "RP02.P06.M02": Object.freeze({
    start_index: 1,
    count: 20,
    micro_title: "Type And Shape Definition",
    phase_role: "permission_matrix_type_shape_definition",
    area: "permission_matrix_type_shape_definition",
  }),
  "RP02.P06.M03": Object.freeze({
    start_index: 1,
    count: 14,
    micro_title: "Primary Implementation Slice",
    phase_role: "permission_matrix_primary_implementation_opening",
    area: "permission_matrix_primary_implementation_opening",
  }),
});

const FIXTURE_DELIVERABLE_TYPES = Object.freeze({
  "Base tenant fixture": "fixture",
  "Base user fixture": "fixture",
  "Base matter fixture": "fixture",
  "Base document fixture": "fixture",
  "Primary golden case": "fixture",
  "Secondary golden case": "fixture",
  "Review-required case": "claude_review",
  "Denied case": "implementation",
  "Cross-tenant case": "implementation",
  "Missing context case": "implementation",
  "Audit hint case": "security_audit",
  "Security trimming case": "security_audit",
  "AI retrieval or analytics case": "implementation",
  "Fixture manifest": "fixture",
  "Golden test": "test",
  "Failure test": "test",
  "Hermes fixture evidence": "hermes_evidence",
  "Claude missing-test prompt": "test",
  "Closeout handoff": "implementation",
  "No-real-data check": "implementation",
  "Stable ID check": "implementation",
  "Replay command": "implementation",
});

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
});

const CP120_NO_WRITE_ATTESTATION = Object.freeze({
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

const CP120_DECISION_BINDING_IDS = Object.freeze([
  "view_decision_binding",
  "search_decision_binding",
  "mutation_decision_binding",
  "export_download_decision_binding",
  "share_decision_binding",
  "ai_retrieval_decision_binding",
  "audit_hint_fields",
  "matched_rule_capture",
  "deny_over_allow_check",
  "legal_hold_interaction",
  "ethical_wall_interaction",
  "object_acl_interaction",
  "review_required_route",
  "approval_required_route",
  "security_trimming_proof",
  "audit_event_expectation",
  "permission_fixture",
  "allowed_test",
  "denied_test",
]);

const SYNTHETIC_PRINCIPAL = Object.freeze({
  user_id: "u_cp120_attorney",
  tenant_id: "t_cp120",
  role_ids: Object.freeze(["attorney"]),
});

const SYNTHETIC_RESOURCE = Object.freeze({
  resource_id: "d_cp120_document",
  resource_type: "Document",
  tenant_id: "t_cp120",
  matter_id: "m_cp120",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function freezeCatalogRow({ microPhaseId, phase, title, index, deliverableType }) {
  return Object.freeze({
    catalog_id: `${microPhaseId}.${slugFor(title)}`,
    pack_id: PERMISSION_KERNEL_CP120_PACK_BINDING.pack_id,
    program_id: "RP02",
    area: phase.area,
    phase_id: microPhaseId.split(".").slice(0, 2).join("."),
    micro_phase_id: microPhaseId,
    micro_title: phase.micro_title,
    phase_role: phase.phase_role,
    title,
    coverage_kind: slugFor(title),
    deliverable_type: deliverableType,
    source_unit_ids: Object.freeze([sourceUnitIdFor(microPhaseId, index)]),
    required_assertions: Object.freeze([
      "synthetic_only",
      "metadata_only_permission_fixture_matrix",
      "cp119_fixture_workflow_inherited",
      "no_real_data",
      "no_runtime_ui_or_api_route",
      "no_permission_policy_mutation",
      "no_audit_ledger_write",
      "no_product_or_database_write",
      "export_share_ai_boundaries_reference_only",
      "security_trimming_omits_unauthorized_results",
      "audit_expectation_not_audit_write",
      "ldip_not_implemented",
      "hrx_embedded_inside_law_firm_os",
    ]),
    boundary_flags: CP120_NO_WRITE_ATTESTATION,
    synthetic_only: true,
    no_real_data: true,
    metadata_only_permission_fixture_matrix: true,
    product_state_effect: "none",
  });
}

function buildRowsFromPhases(phaseMap, titleList, deliverableMap) {
  const rows = [];
  for (const [microPhaseId, phase] of Object.entries(phaseMap)) {
    for (let offset = 0; offset < phase.count; offset += 1) {
      const index = phase.start_index + offset;
      const title = titleList[index - 1];
      rows.push(freezeCatalogRow({ microPhaseId, phase, title, index, deliverableType: deliverableMap[title] }));
    }
  }
  return rows;
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP120_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    metadata_only_permission_fixture_matrix: true,
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
    no_write_attestation: CP120_NO_WRITE_ATTESTATION,
  });
}

function routeForDecision(decision) {
  if (decision.effect === "allow") return "completed_metadata_only";
  if (decision.effect === "review_required") return "review_required_routing";
  if (decision.effect === "approval_required") return "approval_required_routing";
  return "blocked_claim_output";
}

function createDecisionInput(bindingId, overrides = {}) {
  const base = {
    binding_id: bindingId,
    synthetic: true,
    principal: SYNTHETIC_PRINCIPAL,
    resource: SYNTHETIC_RESOURCE,
    action: "document.view",
    rules: [{ id: "cp120_allow_view", effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" }],
    objectAcl: [],
  };

  if (bindingId === "search_decision_binding" || bindingId === "security_trimming_proof") {
    base.action = "search.view";
    base.rules = [{ id: "cp120_allow_search", effect: "allow", role_id: "attorney", resource_type: "Document", action: "search.view" }];
    base.search_results = Object.freeze([
      SYNTHETIC_RESOURCE,
      Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: "d_cp120_cross_tenant", tenant_id: "t_other", matter_id: "m_other" }),
      Object.freeze({ ...SYNTHETIC_RESOURCE, resource_id: "d_cp120_acl_denied" }),
    ]);
    base.objectAcl = (resource) =>
      resource.resource_id === "d_cp120_acl_denied"
        ? [{ id: "cp120_acl_deny", effect: "deny", principal_id: "u_cp120_attorney", action: "search.view" }]
        : [];
  }
  if (bindingId === "mutation_decision_binding") {
    base.action = "document.update";
    base.rules = [
      { id: "cp120_approval_update", effect: "approval_required", role_id: "attorney", resource_type: "Document", action: "document.update" },
    ];
  }
  if (bindingId === "export_download_decision_binding") {
    base.action = "document.download";
    base.rules = [
      { id: "cp120_review_download", effect: "review_required", role_id: "attorney", resource_type: "Document", action: "document.download" },
    ];
  }
  if (bindingId === "share_decision_binding") {
    base.action = "document.share.external";
    base.rules = [
      { id: "cp120_approval_share", effect: "approval_required", role_id: "attorney", resource_type: "Document", action: "document.share.external" },
    ];
  }
  if (bindingId === "ai_retrieval_decision_binding") {
    base.action = "ai.retrieval.preview";
    base.requested_ai_retrieval = true;
  }
  if (bindingId === "legal_hold_interaction") {
    base.rules = [
      { id: "cp120_legal_hold_deny", effect: "deny", role_id: "attorney", resource_type: "Document", action: "document.view", reason: "legal_hold" },
    ];
  }
  if (bindingId === "ethical_wall_interaction") {
    base.rules = [
      {
        id: "cp120_ethical_wall_deny",
        effect: "deny",
        role_id: "attorney",
        resource_type: "Document",
        action: "document.view",
        ethical_wall_matter_id: "m_cp120",
        reason: "ethical_wall",
      },
    ];
  }
  if (bindingId === "object_acl_interaction") {
    base.rules = [];
    base.objectAcl = [{ id: "cp120_acl_deny", effect: "deny", principal_id: "u_cp120_attorney", action: "document.view" }];
  }
  if (bindingId === "review_required_route") {
    base.action = "document.download";
    base.rules = [
      { id: "cp120_review_required", effect: "review_required", role_id: "attorney", resource_type: "Document", action: "document.download" },
    ];
  }
  if (bindingId === "approval_required_route") {
    base.action = "document.delete.request";
    base.rules = [
      {
        id: "cp120_approval_required",
        effect: "approval_required",
        role_id: "attorney",
        resource_type: "Document",
        action: "document.delete.request",
      },
    ];
  }
  if (bindingId === "deny_over_allow_check" || bindingId === "denied_test") {
    base.rules = [
      { id: "cp120_allow_view", effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" },
      { id: "cp120_deny_override", effect: "deny", role_id: "attorney", resource_type: "Document", action: "document.view", reason: "deny_over_allow" },
    ];
  }
  if (bindingId === "allowed_test" || bindingId === "matched_rule_capture") {
    base.rules = [
      { id: "cp120_allow_matched_rule", effect: "allow", role_id: "attorney", resource_type: "Document", action: "document.view" },
    ];
  }

  return Object.freeze({ ...base, ...overrides });
}

function createStableReplay(bindingId, status) {
  return Object.freeze({
    stable_id: `cp120.${bindingId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "binding_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-120",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

export const PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP120_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp120_fixture_evidence_permission_matrix_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP120_PACK_BINDING.range,
  upstream_fixture_workflow_binding_pack_id: PERMISSION_KERNEL_CP120_PACK_BINDING.upstream_pack_id,
  covered_unit_count: PERMISSION_KERNEL_CP120_PACK_BINDING.unit_count,
  risk_c_fixture_evidence_permission_matrix: true,
  synthetic_only: true,
  metadata_only_permission_fixture_matrix: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  inherited_fixture_workflow_binding_contract_id: PERMISSION_KERNEL_CP119_FIXTURE_WORKFLOW_BINDING_CONTRACT.contract_id,
  fixture_evidence_unit_count: 85,
  permission_matrix_unit_count: 65,
  decision_binding_ids: CP120_DECISION_BINDING_IDS,
  no_write_attestation: CP120_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP120_PACK_BINDING",
    "PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT",
    "createPermissionKernelCp120FixtureEvidencePermissionMatrixCatalog",
    "createPermissionKernelCp120CoveredUnitIds",
    "createPermissionKernelCp120FixtureEvidencePermissionMatrix",
    "runPermissionKernelCp120PermissionDecisionBinding",
    "createPermissionKernelCp120FixtureEvidencePermissionMatrixManifest",
    "createPermissionKernelCp120HermesEvidencePacket",
    "createPermissionKernelCp120ClaudeReviewPacket",
    "createPermissionKernelCp120CloseoutHandoff",
    "validatePermissionKernelCp120Coverage",
  ]),
  hidden_source_fields: Object.freeze(["privileged_note", "cross_tenant_secret", "internal_policy_label", "sealed_audit_hint_payload"]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP120_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP120_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel primary implementation slice at RP02.P06.M03.S15 as Risk A; close approval-required, security-trimming, audit expectation, permission fixture, and allowed/denied test boundaries without runtime export/share/AI execution or audit/product writes.",
  }),
});

export function createPermissionKernelCp120FixtureEvidencePermissionMatrixCatalog() {
  return Object.freeze([
    ...buildRowsFromPhases(CP120_FIXTURE_PHASES, FIXTURE_TITLES, FIXTURE_DELIVERABLE_TYPES),
    ...buildRowsFromPhases(CP120_PERMISSION_MATRIX_PHASES, PERMISSION_MATRIX_TITLES, PERMISSION_MATRIX_DELIVERABLE_TYPES),
  ]);
}

export function createPermissionKernelCp120CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp120FixtureEvidencePermissionMatrixCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp120PermissionDecisionBinding(bindingId, overrides = {}) {
  if (!CP120_DECISION_BINDING_IDS.includes(bindingId)) {
    return freezeNoWriteResult({
      binding_id: bindingId,
      status: "blocked_before_permission_evaluation",
      reason: "unknown_permission_matrix_binding",
      evaluator_invoked: false,
      decision: null,
      ...createStableReplay(bindingId, "blocked_before_permission_evaluation"),
    });
  }
  if (bindingId === "permission_fixture") {
    return freezeNoWriteResult({
      binding_id: bindingId,
      status: "bound_metadata_only",
      reason: "synthetic_permission_fixture",
      evaluator_invoked: false,
      decision: null,
      permission_fixture: Object.freeze({
        principal_id: SYNTHETIC_PRINCIPAL.user_id,
        tenant_id: SYNTHETIC_PRINCIPAL.tenant_id,
        matter_id: SYNTHETIC_RESOURCE.matter_id,
        actions: Object.freeze(["document.view", "search.view", "document.download"]),
        persisted: false,
      }),
      ...createStableReplay(bindingId, "bound_metadata_only"),
    });
  }
  if (bindingId === "audit_hint_fields" || bindingId === "audit_event_expectation") {
    return freezeNoWriteResult({
      binding_id: bindingId,
      status: "audit_expectation_recorded",
      reason: "audit_hint_preview_only",
      evaluator_invoked: false,
      decision: null,
      audit_hint_fields: Object.freeze(["actor_id", "action", "object_id", "tenant_id", "reason", "effect"]),
      audit_event_expectation: Object.freeze({
        expected_when_runtime_pack_adds_audit_writer: true,
        emitted_to_audit_ledger: false,
        preview_only: true,
      }),
      ...createStableReplay(bindingId, "audit_expectation_recorded"),
    });
  }
  if (bindingId === "ai_retrieval_decision_binding") {
    return freezeNoWriteResult({
      binding_id: bindingId,
      status: "blocked_ai_retrieval_boundary",
      reason: "ai_retrieval_reference_only",
      evaluator_invoked: false,
      decision: null,
      ...createStableReplay(bindingId, "blocked_ai_retrieval_boundary"),
    });
  }

  const input = createDecisionInput(bindingId, overrides);
  if (bindingId === "search_decision_binding" || bindingId === "security_trimming_proof") {
    const trimmed = trimSearchResults(input.principal, input.search_results, input.rules, input.objectAcl, "search.view");
    return freezeNoWriteResult({
      binding_id: bindingId,
      status: "completed_metadata_only",
      reason: "security_trimmed_before_display",
      evaluator_invoked: true,
      decision: Object.freeze({ effect: "allow", reason: "security_trimmed" }),
      trimmed_result_ids: Object.freeze(trimmed.map((resource) => resource.resource_id)),
      omitted_result_policy: "do_not_count_or_render_unauthorized_results",
      ...createStableReplay(bindingId, "completed_metadata_only"),
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
    binding_id: bindingId,
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
    ...createStableReplay(bindingId, status),
  });
}

function createFixtureEvidenceRecord(microPhaseId, phase) {
  return freezeNoWriteResult({
    record_id: `${microPhaseId}.fixture_evidence_record`,
    micro_phase_id: microPhaseId,
    micro_title: phase.micro_title,
    phase_role: phase.phase_role,
    status: "fixture_evidence_bound",
    inherited_pack_id: "CP00-119",
    inherited_workflow_case_count: createPermissionKernelCp119FixtureWorkflowMatrix().workflow_case_count,
    hermes_evidence_reference_only: phase.micro_title === "Hermes Evidence Packet",
    claude_review_reference_only: phase.micro_title === "Claude Review Packet",
    closeout_reference_only: phase.micro_title === "Closeout And Next Handoff",
    ...createStableReplay(`${microPhaseId}.fixture_evidence_record`, "fixture_evidence_bound"),
  });
}

export function createPermissionKernelCp120FixtureEvidencePermissionMatrix() {
  const inheritedMatrix = createPermissionKernelCp119FixtureWorkflowMatrix();
  const fixtureEvidenceRecords = Object.freeze(
    Object.entries(CP120_FIXTURE_PHASES).map(([microPhaseId, phase]) => createFixtureEvidenceRecord(microPhaseId, phase)),
  );
  const decisionBindings = Object.freeze(
    CP120_DECISION_BINDING_IDS.map((bindingId) => runPermissionKernelCp120PermissionDecisionBinding(bindingId)),
  );

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP120_PACK_BINDING.pack_id,
    inherited_pack_id: "CP00-119",
    inherited_workflow_case_count: inheritedMatrix.workflow_case_count,
    inherited_base_fixture_binding_count: inheritedMatrix.base_fixture_binding_count,
    fixture_evidence_record_count: fixtureEvidenceRecords.length,
    permission_decision_binding_count: decisionBindings.length,
    fixture_evidence_records: fixtureEvidenceRecords,
    permission_decision_bindings: decisionBindings,
    hidden_source_fields: PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT.hidden_source_fields,
    no_write_attestation: CP120_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp120FixtureEvidencePermissionMatrixManifest() {
  const rows = createPermissionKernelCp120FixtureEvidencePermissionMatrixCatalog();
  const unitIds = createPermissionKernelCp120CoveredUnitIds();
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
  const matrix = createPermissionKernelCp120FixtureEvidencePermissionMatrix();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP120_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp120_fixture_evidence_permission_matrix_manifest",
    source_unit_range: PERMISSION_KERNEL_CP120_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    fixture_evidence_record_count: matrix.fixture_evidence_record_count,
    permission_decision_binding_count: matrix.permission_decision_binding_count,
    synthetic_only: true,
    no_real_data: true,
    risk_c_fixture_evidence_permission_matrix: true,
    metadata_only_permission_fixture_matrix: true,
    no_write_attestation: CP120_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP120_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP120_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp120HermesEvidencePacket() {
  const manifest = createPermissionKernelCp120FixtureEvidencePermissionMatrixManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP120_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp120_fixture_evidence_permission_matrix_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-120",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp120ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP120_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp120_fixture_evidence_permission_matrix_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-120 closes the planned Risk C RP02 fixture evidence, review, closeout, and permission matrix opening units, inherits CP119 workflow bindings, preserves metadata-only synthetic permission matrix behavior, routes view/search/mutation/export/share/AI/legal-hold/ethical-wall/object-ACL/review/approval decisions without unsafe execution, keeps audit expectations preview-only, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, external share/export, AI/analytics execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp120CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP120_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP120_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP120_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP120_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP120_FIXTURE_EVIDENCE_PERMISSION_MATRIX_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp120Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp120FixtureEvidencePermissionMatrixCatalog();
  const unitIds = createPermissionKernelCp120CoveredUnitIds();
  const manifest = createPermissionKernelCp120FixtureEvidencePermissionMatrixManifest();
  const matrix = createPermissionKernelCp120FixtureEvidencePermissionMatrix();
  const handoff = createPermissionKernelCp120CloseoutHandoff();

  if (rows.length !== PERMISSION_KERNEL_CP120_PACK_BINDING.unit_count) errors.push("CP00-120 row count must be 150");
  if (unitIds.length !== PERMISSION_KERNEL_CP120_PACK_BINDING.unit_count) errors.push("CP00-120 covered unit count must be 150");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-120 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P05.M06.S06") errors.push("CP00-120 first unit must be RP02.P05.M06.S06");
  if (unitIds.at(-1) !== "RP02.P06.M03.S14") errors.push("CP00-120 last unit must be RP02.P06.M03.S14");
  if (manifest.covered_micro_phase_count !== 9) errors.push("CP00-120 must cover nine micro phases");
  if (manifest.area_counts.permission_fixture_evidence_review_closeout !== 85) errors.push("CP00-120 fixture evidence area count must be 85");
  if (manifest.area_counts.permission_matrix_scope_inventory !== 11) errors.push("CP00-120 matrix scope area count must be 11");
  if (manifest.area_counts.permission_matrix_contract_draft !== 20) errors.push("CP00-120 matrix contract area count must be 20");
  if (manifest.area_counts.permission_matrix_type_shape_definition !== 20) errors.push("CP00-120 matrix type area count must be 20");
  if (manifest.area_counts.permission_matrix_primary_implementation_opening !== 14) {
    errors.push("CP00-120 matrix implementation opening area count must be 14");
  }
  if (manifest.deliverable_counts.fixture !== 29) errors.push("CP00-120 fixture deliverable count must be 29");
  if (manifest.deliverable_counts.claude_review !== 8) errors.push("CP00-120 claude_review deliverable count must be 8");
  if (manifest.deliverable_counts.implementation !== 59) errors.push("CP00-120 implementation deliverable count must be 59");
  if (manifest.deliverable_counts.security_audit !== 22) errors.push("CP00-120 security_audit deliverable count must be 22");
  if (manifest.deliverable_counts.test !== 16) errors.push("CP00-120 test deliverable count must be 16");
  if (manifest.deliverable_counts.hermes_evidence !== 4) errors.push("CP00-120 hermes_evidence deliverable count must be 4");
  if (manifest.deliverable_counts.ui !== 12) errors.push("CP00-120 ui deliverable count must be 12");
  if (matrix.inherited_workflow_case_count !== 9) errors.push("CP00-120 must inherit nine CP119 workflow cases");
  if (matrix.inherited_base_fixture_binding_count !== 4) errors.push("CP00-120 must inherit four CP119 base fixture bindings");
  if (matrix.fixture_evidence_record_count !== 5) errors.push("CP00-120 fixture evidence record count must be 5");
  if (matrix.permission_decision_binding_count !== CP120_DECISION_BINDING_IDS.length) errors.push("CP00-120 decision binding count mismatch");

  const bindingById = Object.fromEntries(matrix.permission_decision_bindings.map((binding) => [binding.binding_id, binding]));
  if (bindingById.view_decision_binding?.status !== "completed_metadata_only") errors.push("CP00-120 view binding must complete metadata-only");
  if (bindingById.search_decision_binding?.trimmed_result_ids?.join(",") !== "d_cp120_document") {
    errors.push("CP00-120 search binding must security-trim unauthorized resources");
  }
  if (bindingById.mutation_decision_binding?.status !== "approval_required_routing") {
    errors.push("CP00-120 mutation binding must require approval");
  }
  if (bindingById.export_download_decision_binding?.status !== "review_required_routing") {
    errors.push("CP00-120 export/download binding must require review");
  }
  if (bindingById.share_decision_binding?.status !== "approval_required_routing") {
    errors.push("CP00-120 share binding must require approval");
  }
  if (bindingById.ai_retrieval_decision_binding?.status !== "blocked_ai_retrieval_boundary") {
    errors.push("CP00-120 AI retrieval binding must be blocked");
  }
  if (bindingById.legal_hold_interaction?.reason !== "legal_hold") errors.push("CP00-120 legal hold reason mismatch");
  if (bindingById.ethical_wall_interaction?.reason !== "ethical_wall") errors.push("CP00-120 ethical wall reason mismatch");
  if (bindingById.object_acl_interaction?.reason !== "object_acl_deny") errors.push("CP00-120 object ACL reason mismatch");
  if (bindingById.review_required_route?.status !== "review_required_routing") errors.push("CP00-120 review route mismatch");
  if (bindingById.approval_required_route?.status !== "approval_required_routing") errors.push("CP00-120 approval route mismatch");
  if (bindingById.deny_over_allow_check?.decision?.effect !== "deny") errors.push("CP00-120 deny-over-allow must deny");
  if (bindingById.audit_event_expectation?.audit_event_expectation?.emitted_to_audit_ledger !== false) {
    errors.push("CP00-120 audit event expectation must not write ledger");
  }
  if (bindingById.permission_fixture?.permission_fixture?.persisted !== false) errors.push("CP00-120 permission fixture must not persist");

  for (const profile of [...matrix.fixture_evidence_records, ...matrix.permission_decision_bindings]) {
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
      errors.push(`CP00-120 profile ${profile.binding_id ?? profile.record_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-121" || handoff.next_subphase_id !== "RP02.P06.M03.S15") {
    errors.push("CP00-120 must hand off to CP00-121 / RP02.P06.M03.S15");
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
