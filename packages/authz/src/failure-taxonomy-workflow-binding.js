import {
  PERMISSION_KERNEL_CP125_FAILURE_TAXONOMY_RISK_BOUNDARY_CONTRACT,
  createPermissionKernelCp125FailureTaxonomyRiskBoundary,
  runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase,
} from "./failure-taxonomy-risk-boundary.js";

export const PERMISSION_KERNEL_CP126_PACK_BINDING = Object.freeze({
  pack_id: "CP00-126",
  planned_pack_id: "CP00-126",
  risk_class: "B",
  unit_count: 40,
  range: "RP02.P07.M03.S21-RP02.P07.M05.S16",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-125",
  next_pack_id: "CP00-127",
  next_subphase_id: "RP02.P07.M05.S17",
});

const CP126_NO_WRITE_ATTESTATION = Object.freeze({
  accepts_real_client_data: false,
  mutates_permission_policy: false,
  writes_audit_event: false,
  writes_product_state: false,
  creates_database_rows: false,
  persists_idempotency_keys: false,
  acquires_locks: false,
  persists_lock_tokens: false,
  executes_rollback: false,
  executes_retry: false,
  executes_compensation: false,
  executes_ai_retrieval: false,
  executes_analytics_query: false,
  executes_export_download: false,
  executes_external_share: false,
  grants_human_approval: false,
  executes_claude_review: false,
  writes_hermes_runtime: false,
  implements_ldip: false,
});

const CP126_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "failure_internal_stack",
  "retry_lock_token",
  "lock_owner_token",
  "rollback_state_snapshot",
  "compensation_target",
  "blocked_claim_internal_reason",
  "sealed_audit_hint_payload",
  "permission_denied_internal_rule",
  "human_escalation_reviewer_id",
  "claude_prompt_context",
  "hermes_runtime_receipt_id",
  "external_share_target",
  "ai_retrieval_query",
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
  "Claude edge-case prompt",
  "Human escalation note",
]);

const DELIVERABLE_TYPES = Object.freeze({
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
  "Claude edge-case prompt": "claude_review",
  "Human escalation note": "implementation",
});

const CP126_PHASES = Object.freeze({
  "RP02.P07.M03": Object.freeze({
    start_index: 21,
    count: 2,
    micro_title: "Primary Implementation Slice",
    phase_role: "failure_taxonomy_primary_review_escalation",
    area: "failure_taxonomy_review_escalation",
    domain: "review_escalation",
    case_prefix: "primary_review_escalation",
  }),
  "RP02.P07.M04": Object.freeze({
    start_index: 1,
    count: 22,
    micro_title: "Secondary Workflow Slice",
    phase_role: "failure_taxonomy_secondary_workflow",
    area: "failure_taxonomy_secondary_workflow",
    domain: "failure_taxonomy",
    case_prefix: "secondary_workflow",
  }),
  "RP02.P07.M05": Object.freeze({
    start_index: 1,
    count: 16,
    micro_title: "Permission And Audit Binding",
    phase_role: "failure_taxonomy_permission_audit_binding_opening",
    area: "failure_taxonomy_permission_audit_binding",
    domain: "permission_audit_binding",
    case_prefix: "permission_audit_binding",
  }),
});

const STATUS_BY_KIND = Object.freeze({
  failure_taxonomy: "failure_taxonomy_workflow_bound",
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
  claude_edge_case_prompt: "claude_edge_case_prompt_bound",
  human_escalation_note: "human_escalation_note_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function buildRowsFromPhases() {
  return Object.entries(CP126_PHASES).flatMap(([microPhaseId, phase]) =>
    Array.from({ length: phase.count }, (_, offset) => {
      const index = phase.start_index + offset;
      const title = FAILURE_TITLES[index - 1];
      const behaviorKind = slugFor(title);
      const sourceUnitId = sourceUnitIdFor(microPhaseId, index);
      return Object.freeze({
        catalog_id: `${sourceUnitId}.${behaviorKind}`,
        pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.pack_id,
        program_id: "RP02",
        phase_id: "RP02.P07",
        micro_phase_id: microPhaseId,
        micro_title: phase.micro_title,
        phase_role: phase.phase_role,
        area: phase.area,
        domain: phase.domain,
        title,
        coverage_kind: behaviorKind,
        deliverable_type: DELIVERABLE_TYPES[title],
        case_id: `${phase.case_prefix}.${behaviorKind}`,
        behavior_kind: behaviorKind,
        source_unit_ids: Object.freeze([sourceUnitId]),
        required_assertions: Object.freeze([
          "synthetic_only",
          "risk_b_failure_taxonomy_workflow_binding",
          "cp125_failure_boundary_inherited",
          "failure_taxonomy_fails_closed",
          "permission_audit_binding_reference_only",
          "claude_prompt_read_only_and_not_executed",
          "human_escalation_does_not_grant_approval",
          "lock_retry_rollback_compensation_not_executed",
          "blocked_claim_audit_hermes_reference_only",
          "fixture_and_test_data_synthetic_only",
          "no_permission_policy_mutation",
          "no_audit_ledger_write",
          "no_product_or_database_write",
          "export_share_ai_boundaries_not_executed",
          "ldip_not_implemented",
          "hrx_embedded_inside_law_firm_os",
        ]),
        boundary_flags: CP126_NO_WRITE_ATTESTATION,
        synthetic_only: true,
        no_real_data: true,
        product_state_effect: "none",
      });
    }),
  );
}

function createStableReplay(caseId, status) {
  return Object.freeze({
    stable_id: `cp126.${caseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-126",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_b_failure_taxonomy_workflow_binding: true,
    writes_product_state: false,
    writes_audit_event: false,
    mutates_permission_policy: false,
    creates_database_rows: false,
    persists_idempotency_keys: false,
    acquires_locks: false,
    persists_lock_tokens: false,
    executes_rollback: false,
    executes_retry: false,
    executes_compensation: false,
    executes_export_download: false,
    executes_external_share: false,
    executes_ai_retrieval: false,
    executes_analytics_query: false,
    grants_human_approval: false,
    executes_claude_review: false,
    writes_hermes_runtime: false,
    implements_ldip: false,
    unauthorized_count_exposed: false,
    hidden_field_names_exposed: false,
    no_write_attestation: CP126_NO_WRITE_ATTESTATION,
  });
}

function routeForKind(kind) {
  if (kind === "claude_edge_case_prompt") return "read_only_review_prompt_reference";
  if (kind === "human_escalation_note") return "manual_escalation_reference";
  if (kind === "permission_denied_failure") return "permission_denied_reference";
  if (kind === "cross_tenant_failure") return "cross_tenant_blocked_reference";
  if (kind === "blocked_claim_receipt") return "blocked_claim_receipt_reference";
  if (kind === "audit_failure_hint") return "audit_hint_preview_reference";
  if (kind === "hermes_failure_evidence") return "hermes_evidence_reference";
  return "fail_closed_reference";
}

function createWorkflowResult(row) {
  const status = STATUS_BY_KIND[row.behavior_kind] ?? "blocked_unknown_failure_kind";
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
    workflow_binding: Object.freeze({
      phase_role: row.phase_role,
      route: routeForKind(row.behavior_kind),
      permission_evaluator_invoked: false,
      runtime_route_added: false,
      fails_closed: true,
      persisted: false,
    }),
    permission_audit_binding: Object.freeze({
      enabled_for_phase: row.domain === "permission_audit_binding",
      permission_decision_reference_only: true,
      audit_hint_preview_only: true,
      emitted_to_audit_ledger: false,
      hidden_fields_rendered: false,
      unauthorized_count_exposed: false,
      cross_tenant_denied: row.behavior_kind === "cross_tenant_failure",
      permission_denied: row.behavior_kind === "permission_denied_failure",
    }),
    lock_policy: Object.freeze({
      lock_conflict_detected: row.behavior_kind === "lock_conflict_failure",
      lock_acquired: false,
      lock_token_persisted: false,
    }),
    retry_policy: Object.freeze({
      retry_allowed_by_this_pack: false,
      retry_executed: false,
      retry_receipt_reference_only: row.behavior_kind === "retry_exhaustion_failure",
    }),
    rollback_policy: Object.freeze({
      rollback_expected: row.behavior_kind === "rollback_expectation",
      rollback_executed: false,
      rollback_state_snapshot_persisted: false,
    }),
    compensation_policy: Object.freeze({
      compensation_expected: row.behavior_kind === "compensation_expectation",
      compensation_executed: false,
      compensation_target_persisted: false,
    }),
    blocked_claim_receipt: Object.freeze({
      required: row.behavior_kind === "blocked_claim_receipt",
      emitted_to_hermes_runtime: false,
      preview_only: true,
      persisted: false,
    }),
    failure_fixture: Object.freeze({
      fixture_kind: row.behavior_kind,
      fixture_bound: row.behavior_kind === "failure_fixture",
      persisted: false,
      contains_real_data: false,
    }),
    failure_test_binding: Object.freeze({
      unit_test_bound: row.behavior_kind === "failure_unit_test",
      integration_smoke_bound: row.behavior_kind === "failure_integration_smoke",
      deterministic: true,
      runs_against_synthetic_metadata_only: true,
    }),
    audit_failure_hint: Object.freeze({
      preview_only: true,
      emitted_to_audit_ledger: false,
      hidden_fields_rendered: false,
      bound: row.behavior_kind === "audit_failure_hint" || row.domain === "permission_audit_binding",
    }),
    hermes_failure_evidence: Object.freeze({
      reference_only: true,
      command_evidence_required_at_pack_closeout: true,
      writes_hermes_runtime: false,
      bound: row.behavior_kind === "hermes_failure_evidence",
    }),
    claude_edge_case_prompt: Object.freeze({
      prompt_bound: row.behavior_kind === "claude_edge_case_prompt",
      read_only: true,
      executes_claude_review: false,
      pack_level_review_must_be_recorded_separately: true,
    }),
    human_escalation_note: Object.freeze({
      escalation_bound: row.behavior_kind === "human_escalation_note",
      grants_human_approval: false,
      approval_reference_only: true,
      persisted: false,
    }),
    ...createStableReplay(row.case_id, status),
  });
}

export const PERMISSION_KERNEL_CP126_FAILURE_TAXONOMY_WORKFLOW_BINDING_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp126_failure_taxonomy_workflow_binding_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP126_PACK_BINDING.range,
  upstream_failure_taxonomy_risk_boundary_pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.upstream_pack_id,
  inherited_failure_taxonomy_risk_boundary_contract_id:
    PERMISSION_KERNEL_CP125_FAILURE_TAXONOMY_RISK_BOUNDARY_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP126_PACK_BINDING.unit_count,
  risk_b_failure_taxonomy_workflow_binding: true,
  synthetic_only: true,
  metadata_only_failure_taxonomy: true,
  workflow_binding_reference_only: true,
  permission_audit_binding_reference_only: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  hidden_source_fields: CP126_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP126_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP126_PACK_BINDING",
    "PERMISSION_KERNEL_CP126_FAILURE_TAXONOMY_WORKFLOW_BINDING_CONTRACT",
    "createPermissionKernelCp126FailureTaxonomyWorkflowBindingCatalog",
    "createPermissionKernelCp126CoveredUnitIds",
    "createPermissionKernelCp126FailureTaxonomyWorkflowBinding",
    "runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase",
    "createPermissionKernelCp126FailureTaxonomyWorkflowBindingManifest",
    "createPermissionKernelCp126HermesEvidencePacket",
    "createPermissionKernelCp126ClaudeReviewPacket",
    "createPermissionKernelCp126CloseoutHandoff",
    "validatePermissionKernelCp126Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP126_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel permission/audit failure tests at RP02.P07.M05.S17 as planned CP00-127 Risk A; preserve CP126 workflow, review/escalation, permission/audit, fixture, and evidence bindings as synthetic metadata-only and no-write.",
  }),
});

export function createPermissionKernelCp126FailureTaxonomyWorkflowBindingCatalog() {
  return Object.freeze(buildRowsFromPhases());
}

export function createPermissionKernelCp126CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp126FailureTaxonomyWorkflowBindingCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase(caseId) {
  const row = createPermissionKernelCp126FailureTaxonomyWorkflowBindingCatalog().find((item) => item.case_id === caseId);
  if (!row) {
    return freezeNoWriteResult({
      case_id: caseId,
      domain: "unknown",
      behavior_kind: "unknown",
      status: "blocked_before_permission_evaluation",
      reason: "unknown_failure_taxonomy_workflow_binding_case",
      evaluator_invoked: false,
      decision: null,
      fail_closed: true,
      ...createStableReplay(caseId, "blocked_before_permission_evaluation"),
    });
  }
  return createWorkflowResult(row);
}

export function createPermissionKernelCp126FailureTaxonomyWorkflowBinding() {
  const catalog = createPermissionKernelCp126FailureTaxonomyWorkflowBindingCatalog();
  const inheritedBoundary = createPermissionKernelCp125FailureTaxonomyRiskBoundary();
  const inheritedLock = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase(
    "failure_taxonomy_risk_boundary.lock_conflict_failure",
  );
  const inheritedHermes = runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase(
    "failure_taxonomy_risk_boundary.hermes_failure_evidence",
  );
  const caseResults = Object.freeze(catalog.map((row) => runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase(row.case_id)));
  const domainCounts = caseResults.reduce((counts, result) => {
    counts[result.domain] = (counts[result.domain] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = caseResults.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {});

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.upstream_pack_id,
    inherited_failure_boundary_result_count: inheritedBoundary.result_count,
    inherited_lock_conflict_status: inheritedLock.status,
    inherited_hermes_failure_reference_only: inheritedHermes.hermes_failure_evidence?.reference_only === true,
    result_count: caseResults.length,
    review_escalation_result_count: domainCounts.review_escalation ?? 0,
    secondary_workflow_result_count: domainCounts.failure_taxonomy ?? 0,
    permission_audit_binding_result_count: domainCounts.permission_audit_binding ?? 0,
    case_results: caseResults,
    failure_workflow_status_counts: Object.freeze(statusCounts),
    hidden_source_fields: CP126_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP126_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp126FailureTaxonomyWorkflowBindingManifest() {
  const rows = createPermissionKernelCp126FailureTaxonomyWorkflowBindingCatalog();
  const unitIds = createPermissionKernelCp126CoveredUnitIds();
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
  const matrix = createPermissionKernelCp126FailureTaxonomyWorkflowBinding();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp126_failure_taxonomy_workflow_binding_manifest",
    source_unit_range: PERMISSION_KERNEL_CP126_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    domain_counts: Object.freeze(domainCounts),
    result_count: matrix.result_count,
    inherited_failure_boundary_result_count: matrix.inherited_failure_boundary_result_count,
    synthetic_only: true,
    no_real_data: true,
    risk_b_failure_taxonomy_workflow_binding: true,
    metadata_only_failure_taxonomy: true,
    workflow_binding_reference_only: true,
    permission_audit_binding_reference_only: true,
    no_write_attestation: CP126_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP126_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp126HermesEvidencePacket() {
  const manifest = createPermissionKernelCp126FailureTaxonomyWorkflowBindingManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp126_failure_taxonomy_workflow_binding_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-126",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp126ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp126_failure_taxonomy_workflow_binding_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-126 closes the planned Risk B failure taxonomy workflow and permission/audit binding units RP02.P07.M03.S21-RP02.P07.M05.S16, inherits CP125 boundary behavior, preserves synthetic-only metadata-only behavior, records Claude prompt and human escalation references without executing review or granting approval, maps secondary workflow and permission/audit failure cases to fail-closed reference-only outputs, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, idempotency persistence, locks, retries, rollback, compensation, external share/export, AI/analytics execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp126CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP126_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP126_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP126_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP126_FAILURE_TAXONOMY_WORKFLOW_BINDING_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp126Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp126FailureTaxonomyWorkflowBindingCatalog();
  const unitIds = createPermissionKernelCp126CoveredUnitIds();
  const manifest = createPermissionKernelCp126FailureTaxonomyWorkflowBindingManifest();
  const matrix = createPermissionKernelCp126FailureTaxonomyWorkflowBinding();
  const handoff = createPermissionKernelCp126CloseoutHandoff();
  const resultById = Object.fromEntries(matrix.case_results.map((result) => [result.case_id, result]));

  if (rows.length !== 40) errors.push("CP00-126 row count must be 40");
  if (unitIds.length !== 40) errors.push("CP00-126 covered unit count must be 40");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-126 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P07.M03.S21") errors.push("CP00-126 first unit must be RP02.P07.M03.S21");
  if (unitIds.at(-1) !== "RP02.P07.M05.S16") errors.push("CP00-126 last unit must be RP02.P07.M05.S16");
  if (manifest.covered_micro_phase_count !== 3) errors.push("CP00-126 must cover three micro phases");
  if (manifest.phase_counts["RP02.P07.M03"] !== 2) errors.push("CP00-126 RP02.P07.M03 count must be 2");
  if (manifest.phase_counts["RP02.P07.M04"] !== 22) errors.push("CP00-126 RP02.P07.M04 count must be 22");
  if (manifest.phase_counts["RP02.P07.M05"] !== 16) errors.push("CP00-126 RP02.P07.M05 count must be 16");
  if (manifest.domain_counts.review_escalation !== 2) errors.push("CP00-126 review escalation domain count must be 2");
  if (manifest.domain_counts.failure_taxonomy !== 22) errors.push("CP00-126 failure taxonomy domain count must be 22");
  if (manifest.domain_counts.permission_audit_binding !== 16) {
    errors.push("CP00-126 permission audit binding domain count must be 16");
  }
  if (manifest.deliverable_counts.failure_recovery !== 24) errors.push("CP00-126 failure_recovery deliverable count must be 24");
  if (manifest.deliverable_counts.implementation !== 4) errors.push("CP00-126 implementation deliverable count must be 4");
  if (manifest.deliverable_counts.security_audit !== 3) errors.push("CP00-126 security_audit deliverable count must be 3");
  if (manifest.deliverable_counts.hermes_evidence !== 3) errors.push("CP00-126 hermes_evidence deliverable count must be 3");
  if (manifest.deliverable_counts.fixture !== 2) errors.push("CP00-126 fixture deliverable count must be 2");
  if (manifest.deliverable_counts.test !== 2) errors.push("CP00-126 test deliverable count must be 2");
  if (manifest.deliverable_counts.claude_review !== 2) errors.push("CP00-126 claude_review deliverable count must be 2");
  if (matrix.inherited_failure_boundary_result_count !== 10) errors.push("CP00-126 must inherit CP125 boundary result count");
  if (matrix.inherited_lock_conflict_status !== "blocked_lock_conflict") errors.push("CP00-126 must inherit CP125 lock conflict status");
  if (matrix.inherited_hermes_failure_reference_only !== true) errors.push("CP00-126 must inherit CP125 Hermes reference-only state");
  if (matrix.review_escalation_result_count !== 2) errors.push("CP00-126 review escalation result count must be 2");
  if (matrix.secondary_workflow_result_count !== 22) errors.push("CP00-126 secondary workflow result count must be 22");
  if (matrix.permission_audit_binding_result_count !== 16) errors.push("CP00-126 permission audit binding result count must be 16");

  if (resultById["primary_review_escalation.claude_edge_case_prompt"]?.claude_edge_case_prompt?.executes_claude_review !== false) {
    errors.push("CP00-126 Claude edge-case prompt must not execute Claude review");
  }
  if (resultById["primary_review_escalation.human_escalation_note"]?.human_escalation_note?.grants_human_approval !== false) {
    errors.push("CP00-126 human escalation note must not grant approval");
  }
  if (resultById["secondary_workflow.missing_tenant_failure"]?.status !== "blocked_missing_tenant") {
    errors.push("CP00-126 missing tenant failure must fail closed");
  }
  if (resultById["secondary_workflow.cross_tenant_failure"]?.permission_audit_binding?.cross_tenant_denied !== true) {
    errors.push("CP00-126 cross-tenant workflow must bind denial reference");
  }
  if (resultById["secondary_workflow.lock_conflict_failure"]?.lock_policy?.lock_acquired !== false) {
    errors.push("CP00-126 lock conflict workflow must not acquire locks");
  }
  if (resultById["secondary_workflow.retry_exhaustion_failure"]?.retry_policy?.retry_executed !== false) {
    errors.push("CP00-126 retry workflow must not execute retry");
  }
  if (resultById["secondary_workflow.rollback_expectation"]?.rollback_policy?.rollback_executed !== false) {
    errors.push("CP00-126 rollback workflow must not execute rollback");
  }
  if (resultById["secondary_workflow.compensation_expectation"]?.compensation_policy?.compensation_executed !== false) {
    errors.push("CP00-126 compensation workflow must not execute compensation");
  }
  if (resultById["secondary_workflow.blocked_claim_receipt"]?.blocked_claim_receipt?.preview_only !== true) {
    errors.push("CP00-126 blocked claim workflow must be preview-only");
  }
  if (resultById["secondary_workflow.audit_failure_hint"]?.audit_failure_hint?.emitted_to_audit_ledger !== false) {
    errors.push("CP00-126 audit failure hint must not write audit ledger");
  }
  if (resultById["secondary_workflow.hermes_failure_evidence"]?.hermes_failure_evidence?.writes_hermes_runtime !== false) {
    errors.push("CP00-126 Hermes workflow evidence must not write runtime");
  }
  if (resultById["permission_audit_binding.permission_denied_failure"]?.permission_audit_binding?.permission_denied !== true) {
    errors.push("CP00-126 permission denied audit binding must mark denied reference");
  }
  if (resultById["permission_audit_binding.permission_denied_failure"]?.permission_audit_binding?.emitted_to_audit_ledger !== false) {
    errors.push("CP00-126 permission denied audit binding must not write audit ledger");
  }
  if (resultById["permission_audit_binding.failure_fixture"]?.failure_fixture?.contains_real_data !== false) {
    errors.push("CP00-126 permission audit fixture must not contain real data");
  }

  for (const profile of matrix.case_results) {
    if (
      profile.unauthorized_count_exposed ||
      profile.hidden_field_names_exposed ||
      profile.mutates_permission_policy ||
      profile.writes_product_state ||
      profile.writes_audit_event ||
      profile.creates_database_rows ||
      profile.persists_idempotency_keys ||
      profile.acquires_locks ||
      profile.persists_lock_tokens ||
      profile.executes_rollback ||
      profile.executes_retry ||
      profile.executes_compensation ||
      profile.executes_export_download ||
      profile.executes_external_share ||
      profile.executes_ai_retrieval ||
      profile.executes_analytics_query ||
      profile.grants_human_approval ||
      profile.executes_claude_review ||
      profile.writes_hermes_runtime ||
      profile.implements_ldip
    ) {
      errors.push(`CP00-126 case ${profile.case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-127" || handoff.next_subphase_id !== "RP02.P07.M05.S17") {
    errors.push("CP00-126 must hand off to CP00-127 / RP02.P07.M05.S17");
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
