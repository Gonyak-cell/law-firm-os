import {
  PERMISSION_KERNEL_CP127_FAILURE_TAXONOMY_TEST_FIXTURE_BOUNDARY_CONTRACT,
  createPermissionKernelCp127FailureTaxonomyTestFixtureBoundary,
  runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase,
} from "./failure-taxonomy-test-fixture-boundary.js";

export const PERMISSION_KERNEL_CP128_PACK_BINDING = Object.freeze({
  pack_id: "CP00-128",
  planned_pack_id: "CP00-128",
  risk_class: "C",
  unit_count: 150,
  range: "RP02.P07.M06.S05-RP02.P08.M03.S21",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-127",
  next_pack_id: "CP00-129",
  next_subphase_id: "RP02.P08.M03.S22",
});

const CP128_NO_WRITE_ATTESTATION = Object.freeze({
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

const CP128_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "failure_internal_stack",
  "synthetic_fixture_secret",
  "golden_case_trace",
  "hermes_runtime_receipt_id",
  "command_result_raw_output",
  "audit_summary_internal_rule",
  "claude_prompt_context",
  "human_approval_reviewer_id",
  "validation_harness_secret",
  "next_gate_internal_cursor",
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

const EVIDENCE_TITLES = Object.freeze([
  "Hermes command matrix",
  "Evidence field list",
  "Changed-file receipt",
  "Command result receipt",
  "Fixture summary receipt",
  "Blocked-claim receipt",
  "Permission summary receipt",
  "Audit summary receipt",
  "No-real-data receipt",
  "Claude dependency marker",
  "Human approval marker",
  "PASS semantics",
  "PASS_WITH_FINDINGS semantics",
  "BLOCK semantics",
  "Evidence template",
  "Validation command check",
  "Harness boundary note",
  "Closeout handoff",
  "Regression receipt",
  "Next gate readiness",
  "Documentation update",
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
  "Hermes command matrix": "hermes_evidence",
  "Evidence field list": "hermes_evidence",
  "Changed-file receipt": "hermes_evidence",
  "Command result receipt": "hermes_evidence",
  "Fixture summary receipt": "hermes_evidence",
  "Permission summary receipt": "hermes_evidence",
  "Audit summary receipt": "hermes_evidence",
  "No-real-data receipt": "hermes_evidence",
  "Claude dependency marker": "claude_review",
  "Human approval marker": "implementation",
  "PASS semantics": "implementation",
  "PASS_WITH_FINDINGS semantics": "implementation",
  "BLOCK semantics": "implementation",
  "Evidence template": "hermes_evidence",
  "Validation command check": "implementation",
  "Harness boundary note": "implementation",
  "Closeout handoff": "implementation",
  "Regression receipt": "test",
  "Next gate readiness": "implementation",
  "Documentation update": "implementation",
});

const CP128_PHASES = Object.freeze({
  "RP02.P07.M06": Object.freeze({
    start_index: 5,
    titles: FAILURE_TITLES.slice(4),
    micro_title: "Synthetic Fixture Set",
    phase_role: "synthetic_fixture_terminal",
    area: "failure_taxonomy_synthetic_fixture_terminal",
    domain: "synthetic_fixture_terminal",
    case_prefix: "synthetic_fixture_terminal",
  }),
  "RP02.P07.M07": Object.freeze({
    start_index: 1,
    titles: FAILURE_TITLES,
    micro_title: "Test And Golden Case Set",
    phase_role: "test_golden_case_set",
    area: "failure_taxonomy_test_golden_case_set",
    domain: "test_golden_case_set",
    case_prefix: "test_golden_case_set",
  }),
  "RP02.P07.M08": Object.freeze({
    start_index: 1,
    titles: FAILURE_TITLES,
    micro_title: "Hermes Evidence Packet",
    phase_role: "failure_taxonomy_hermes_evidence_packet",
    area: "failure_taxonomy_hermes_evidence_packet",
    domain: "hermes_evidence_packet",
    case_prefix: "hermes_evidence_packet",
  }),
  "RP02.P07.M09": Object.freeze({
    start_index: 1,
    titles: FAILURE_TITLES.slice(0, 20),
    micro_title: "Claude Review Packet",
    phase_role: "failure_taxonomy_claude_review_packet",
    area: "failure_taxonomy_claude_review_packet",
    domain: "claude_review_packet",
    case_prefix: "claude_review_packet",
  }),
  "RP02.P07.M10": Object.freeze({
    start_index: 1,
    titles: FAILURE_TITLES.slice(0, 11),
    micro_title: "Closeout And Next Handoff",
    phase_role: "failure_taxonomy_closeout_next_handoff",
    area: "failure_taxonomy_closeout_next_handoff",
    domain: "closeout_next_handoff",
    case_prefix: "closeout_next_handoff",
  }),
  "RP02.P08.M00": Object.freeze({
    start_index: 1,
    titles: EVIDENCE_TITLES.slice(0, 8),
    micro_title: "Scope Inventory",
    phase_role: "hermes_evidence_scope_inventory",
    area: "hermes_evidence_scope_inventory",
    domain: "scope_inventory",
    case_prefix: "scope_inventory",
  }),
  "RP02.P08.M01": Object.freeze({
    start_index: 1,
    titles: EVIDENCE_TITLES.slice(0, 8),
    micro_title: "Contract Draft",
    phase_role: "hermes_evidence_contract_draft",
    area: "hermes_evidence_contract_draft",
    domain: "contract_draft",
    case_prefix: "contract_draft",
  }),
  "RP02.P08.M02": Object.freeze({
    start_index: 1,
    titles: EVIDENCE_TITLES.slice(0, 20),
    micro_title: "Type And Shape Definition",
    phase_role: "hermes_evidence_type_shape_definition",
    area: "hermes_evidence_type_shape_definition",
    domain: "type_shape_definition",
    case_prefix: "type_shape_definition",
  }),
  "RP02.P08.M03": Object.freeze({
    start_index: 1,
    titles: EVIDENCE_TITLES,
    micro_title: "Primary Implementation Slice",
    phase_role: "hermes_evidence_primary_implementation_slice",
    area: "hermes_evidence_primary_implementation_slice",
    domain: "primary_implementation_slice",
    case_prefix: "primary_implementation_slice",
  }),
});

const FAILURE_STATUS_BY_KIND = Object.freeze({
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
  rollback_expectation: "rollback_expected_no_execution",
  compensation_expectation: "compensation_expected_no_execution",
  blocked_claim_receipt: "blocked_claim_receipt_preview",
  failure_fixture: "failure_fixture_bound",
  failure_unit_test: "failure_unit_test_bound",
  failure_integration_smoke: "failure_integration_smoke_bound",
  audit_failure_hint: "audit_failure_hint_bound",
  hermes_failure_evidence: "hermes_failure_evidence_bound",
  claude_edge_case_prompt: "claude_edge_case_prompt_bound",
  human_escalation_note: "human_escalation_note_bound",
});

const EVIDENCE_STATUS_BY_KIND = Object.freeze({
  hermes_command_matrix: "hermes_command_matrix_bound",
  evidence_field_list: "evidence_field_list_bound",
  changed_file_receipt: "changed_file_receipt_bound",
  command_result_receipt: "command_result_receipt_bound",
  fixture_summary_receipt: "fixture_summary_receipt_bound",
  blocked_claim_receipt: "blocked_claim_receipt_preview",
  permission_summary_receipt: "permission_summary_receipt_bound",
  audit_summary_receipt: "audit_summary_receipt_bound",
  no_real_data_receipt: "no_real_data_receipt_bound",
  claude_dependency_marker: "claude_dependency_marker_bound",
  human_approval_marker: "human_approval_marker_reference_only",
  pass_semantics: "pass_semantics_bound",
  pass_with_findings_semantics: "pass_with_findings_semantics_bound",
  block_semantics: "block_semantics_bound",
  evidence_template: "evidence_template_bound",
  validation_command_check: "validation_command_check_bound",
  harness_boundary_note: "harness_boundary_note_bound",
  closeout_handoff: "closeout_handoff_bound",
  regression_receipt: "regression_receipt_bound",
  next_gate_readiness: "next_gate_readiness_bound",
  documentation_update: "documentation_update_bound",
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(microPhaseId, index) {
  return `${microPhaseId}.S${String(index).padStart(2, "0")}`;
}

function buildRowsFromPhases() {
  return Object.entries(CP128_PHASES).flatMap(([microPhaseId, phase]) =>
    phase.titles.map((title, offset) => {
      const index = phase.start_index + offset;
      const behaviorKind = slugFor(title);
      const sourceUnitId = sourceUnitIdFor(microPhaseId, index);
      return Object.freeze({
        catalog_id: `${sourceUnitId}.${behaviorKind}`,
        pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.pack_id,
        program_id: "RP02",
        phase_id: microPhaseId.startsWith("RP02.P07") ? "RP02.P07" : "RP02.P08",
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
          "risk_c_evidence_harness_pack",
          "cp127_test_fixture_boundary_inherited",
          "failure_taxonomy_and_fixture_rows_fail_closed",
          "test_and_golden_cases_are_reference_only",
          "hermes_evidence_packets_are_reference_only",
          "claude_review_packets_are_read_only_and_not_executed",
          "human_approval_markers_do_not_grant_approval",
          "closeout_handoff_does_not_commit_or_approve",
          "no_permission_policy_mutation",
          "no_audit_ledger_write",
          "no_product_or_database_write",
          "export_share_ai_boundaries_not_executed",
          "ldip_not_implemented",
          "hrx_embedded_inside_law_firm_os",
        ]),
        boundary_flags: CP128_NO_WRITE_ATTESTATION,
        synthetic_only: true,
        no_real_data: true,
        product_state_effect: "none",
      });
    }),
  );
}

function createStableReplay(caseId, status) {
  return Object.freeze({
    stable_id: `cp128.${caseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-128",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_c_evidence_harness_pack: true,
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
    no_write_attestation: CP128_NO_WRITE_ATTESTATION,
  });
}

function createBoundaryResult(row) {
  const status =
    FAILURE_STATUS_BY_KIND[row.behavior_kind] ??
    EVIDENCE_STATUS_BY_KIND[row.behavior_kind] ??
    "blocked_unknown_evidence_harness_kind";
  const isFailurePhase = row.micro_phase_id.startsWith("RP02.P07");
  const isEvidencePhase = row.micro_phase_id.startsWith("RP02.P08");
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
    failure_taxonomy_profile: Object.freeze({
      enabled_for_phase: isFailurePhase,
      missing_tenant_denied: row.behavior_kind === "missing_tenant_failure",
      missing_actor_denied: row.behavior_kind === "missing_actor_failure",
      missing_matter_denied: row.behavior_kind === "missing_matter_failure",
      missing_resource_denied: row.behavior_kind === "missing_resource_failure",
      unknown_action_denied: row.behavior_kind === "unknown_action_failure",
      cross_tenant_denied: row.behavior_kind === "cross_tenant_failure",
      permission_denied: row.behavior_kind === "permission_denied_failure",
      ambiguous_rule_denied: row.behavior_kind === "ambiguous_rule_failure",
      stale_reference_denied: row.behavior_kind === "stale_reference_failure",
      lock_conflict_denied: row.behavior_kind === "lock_conflict_failure",
      retry_exhaustion_denied: row.behavior_kind === "retry_exhaustion_failure",
      rollback_expected: row.behavior_kind === "rollback_expectation",
      compensation_expected: row.behavior_kind === "compensation_expectation",
      fixture_contains_real_data: false,
      fixture_persisted: false,
    }),
    test_golden_case: Object.freeze({
      enabled_for_phase: row.domain === "test_golden_case_set",
      golden_case_reference_only: row.domain === "test_golden_case_set",
      failure_unit_test_bound: row.behavior_kind === "failure_unit_test",
      integration_smoke_bound: row.behavior_kind === "failure_integration_smoke",
      regression_receipt_bound: row.behavior_kind === "regression_receipt",
      deterministic: true,
      persisted: false,
    }),
    hermes_evidence_packet: Object.freeze({
      enabled_for_phase: row.domain === "hermes_evidence_packet" || isEvidencePhase || row.deliverable_type === "hermes_evidence",
      command_matrix_bound: row.behavior_kind === "hermes_command_matrix",
      evidence_field_list_bound: row.behavior_kind === "evidence_field_list",
      changed_file_receipt_bound: row.behavior_kind === "changed_file_receipt",
      command_result_receipt_bound: row.behavior_kind === "command_result_receipt",
      fixture_summary_receipt_bound: row.behavior_kind === "fixture_summary_receipt",
      permission_summary_receipt_bound: row.behavior_kind === "permission_summary_receipt",
      audit_summary_receipt_bound: row.behavior_kind === "audit_summary_receipt",
      no_real_data_receipt_bound: row.behavior_kind === "no_real_data_receipt",
      evidence_template_bound: row.behavior_kind === "evidence_template",
      blocked_claim_preview_only: row.behavior_kind === "blocked_claim_receipt",
      reference_only: true,
      writes_hermes_runtime: false,
      emitted_to_audit_ledger: false,
    }),
    claude_review_packet: Object.freeze({
      enabled_for_phase: row.domain === "claude_review_packet" || row.deliverable_type === "claude_review",
      prompt_bound: row.behavior_kind === "claude_edge_case_prompt",
      dependency_marker_bound: row.behavior_kind === "claude_dependency_marker",
      read_only: true,
      executes_claude_review: false,
      exactly_one_valid_pack_review_recorded_separately: true,
    }),
    human_approval_marker: Object.freeze({
      marker_bound: row.behavior_kind === "human_approval_marker" || row.behavior_kind === "human_escalation_note",
      grants_human_approval: false,
      approval_reference_only: true,
      persisted: false,
    }),
    closeout_handoff: Object.freeze({
      enabled_for_phase: row.domain === "closeout_next_handoff" || row.behavior_kind === "closeout_handoff",
      closeout_handoff_bound: row.behavior_kind === "closeout_handoff",
      next_gate_readiness_bound: row.behavior_kind === "next_gate_readiness",
      validation_command_check_bound: row.behavior_kind === "validation_command_check",
      harness_boundary_note_bound: row.behavior_kind === "harness_boundary_note",
      documentation_update_bound: row.behavior_kind === "documentation_update",
      next_pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.next_pack_id,
      next_subphase_id: PERMISSION_KERNEL_CP128_PACK_BINDING.next_subphase_id,
      commits_pack: false,
      marks_production_ready: false,
    }),
    verdict_semantics: Object.freeze({
      pass_bound: row.behavior_kind === "pass_semantics",
      pass_with_findings_bound: row.behavior_kind === "pass_with_findings_semantics",
      block_bound: row.behavior_kind === "block_semantics",
      block_prevents_production_ready: row.behavior_kind === "block_semantics",
    }),
    ...createStableReplay(row.case_id, status),
  });
}

export const PERMISSION_KERNEL_CP128_FAILURE_TAXONOMY_EVIDENCE_HARNESS_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp128_failure_taxonomy_evidence_harness_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP128_PACK_BINDING.range,
  upstream_failure_taxonomy_test_fixture_boundary_pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.upstream_pack_id,
  inherited_failure_taxonomy_test_fixture_boundary_contract_id:
    PERMISSION_KERNEL_CP127_FAILURE_TAXONOMY_TEST_FIXTURE_BOUNDARY_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP128_PACK_BINDING.unit_count,
  risk_c_evidence_harness_pack: true,
  synthetic_only: true,
  metadata_only_failure_taxonomy_evidence: true,
  hermes_packet_reference_only: true,
  claude_packet_reference_only: true,
  closeout_handoff_reference_only: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  hidden_source_fields: CP128_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP128_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP128_PACK_BINDING",
    "PERMISSION_KERNEL_CP128_FAILURE_TAXONOMY_EVIDENCE_HARNESS_CONTRACT",
    "createPermissionKernelCp128FailureTaxonomyEvidenceHarnessCatalog",
    "createPermissionKernelCp128CoveredUnitIds",
    "createPermissionKernelCp128FailureTaxonomyEvidenceHarness",
    "runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase",
    "createPermissionKernelCp128FailureTaxonomyEvidenceHarnessManifest",
    "createPermissionKernelCp128HermesEvidencePacket",
    "createPermissionKernelCp128ClaudeReviewPacket",
    "createPermissionKernelCp128CloseoutHandoff",
    "validatePermissionKernelCp128Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP128_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel Hermes evidence primary implementation slice at RP02.P08.M03.S22 as planned CP00-129 Risk B; preserve CP128 failure taxonomy, test/golden, Hermes evidence, Claude packet, closeout handoff, and evidence harness rows as synthetic metadata-only and no-write.",
  }),
});

export function createPermissionKernelCp128FailureTaxonomyEvidenceHarnessCatalog() {
  return Object.freeze(buildRowsFromPhases());
}

export function createPermissionKernelCp128CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp128FailureTaxonomyEvidenceHarnessCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase(caseId) {
  const row = createPermissionKernelCp128FailureTaxonomyEvidenceHarnessCatalog().find((item) => item.case_id === caseId);
  if (!row) {
    return freezeNoWriteResult({
      case_id: caseId,
      domain: "unknown",
      behavior_kind: "unknown",
      status: "blocked_before_permission_evaluation",
      reason: "unknown_failure_taxonomy_evidence_harness_case",
      evaluator_invoked: false,
      decision: null,
      fail_closed: true,
      ...createStableReplay(caseId, "blocked_before_permission_evaluation"),
    });
  }
  return createBoundaryResult(row);
}

export function createPermissionKernelCp128FailureTaxonomyEvidenceHarness() {
  const catalog = createPermissionKernelCp128FailureTaxonomyEvidenceHarnessCatalog();
  const inheritedBoundary = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundary();
  const inheritedMissingTenant = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
    "synthetic_fixture_opening.missing_tenant_failure",
  );
  const inheritedClaudePrompt = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
    "permission_audit_test_evidence.claude_edge_case_prompt",
  );
  const inheritedHermesFailure = runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(
    "permission_audit_test_evidence.hermes_failure_evidence",
  );
  const caseResults = Object.freeze(catalog.map((row) => runPermissionKernelCp128FailureTaxonomyEvidenceHarnessCase(row.case_id)));
  const domainCounts = caseResults.reduce((counts, result) => {
    counts[result.domain] = (counts[result.domain] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = caseResults.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {});

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.upstream_pack_id,
    inherited_test_fixture_result_count: inheritedBoundary.result_count,
    inherited_missing_tenant_denied: inheritedMissingTenant.synthetic_fixture_boundary?.missing_tenant_denied === true,
    inherited_claude_prompt_not_executed: inheritedClaudePrompt.claude_edge_case_prompt?.executes_claude_review === false,
    inherited_hermes_failure_reference_only: inheritedHermesFailure.hermes_failure_evidence?.reference_only === true,
    result_count: caseResults.length,
    domain_counts: Object.freeze(domainCounts),
    synthetic_fixture_terminal_result_count: domainCounts.synthetic_fixture_terminal ?? 0,
    test_golden_case_result_count: domainCounts.test_golden_case_set ?? 0,
    hermes_evidence_packet_result_count: domainCounts.hermes_evidence_packet ?? 0,
    claude_review_packet_result_count: domainCounts.claude_review_packet ?? 0,
    closeout_next_handoff_result_count: domainCounts.closeout_next_handoff ?? 0,
    p08_evidence_result_count:
      (domainCounts.scope_inventory ?? 0) +
      (domainCounts.contract_draft ?? 0) +
      (domainCounts.type_shape_definition ?? 0) +
      (domainCounts.primary_implementation_slice ?? 0),
    case_results: caseResults,
    evidence_harness_status_counts: Object.freeze(statusCounts),
    hidden_source_fields: CP128_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP128_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp128FailureTaxonomyEvidenceHarnessManifest() {
  const rows = createPermissionKernelCp128FailureTaxonomyEvidenceHarnessCatalog();
  const unitIds = createPermissionKernelCp128CoveredUnitIds();
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
  const matrix = createPermissionKernelCp128FailureTaxonomyEvidenceHarness();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp128_failure_taxonomy_evidence_harness_manifest",
    source_unit_range: PERMISSION_KERNEL_CP128_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    domain_counts: Object.freeze(domainCounts),
    result_count: matrix.result_count,
    inherited_test_fixture_result_count: matrix.inherited_test_fixture_result_count,
    synthetic_only: true,
    no_real_data: true,
    risk_c_evidence_harness_pack: true,
    metadata_only_failure_taxonomy_evidence: true,
    no_write_attestation: CP128_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP128_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp128HermesEvidencePacket() {
  const manifest = createPermissionKernelCp128FailureTaxonomyEvidenceHarnessManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp128_failure_taxonomy_evidence_harness_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-128",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp128ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp128_failure_taxonomy_evidence_harness_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-128 closes the planned Risk C failure taxonomy evidence harness units RP02.P07.M06.S05-RP02.P08.M03.S21, inherits CP127 test fixture behavior, preserves synthetic-only metadata-only behavior, keeps failure taxonomy and fixture rows fail-closed, keeps test/golden cases deterministic and reference-only, keeps Hermes evidence packets preview/reference-only, binds Claude review packets without executing Claude, binds human approval markers without granting approval, preserves closeout handoff as reference-only, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, idempotency persistence, locks, retries, rollback, compensation, external share/export, AI/analytics execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp128CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP128_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP128_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP128_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP128_FAILURE_TAXONOMY_EVIDENCE_HARNESS_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp128Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp128FailureTaxonomyEvidenceHarnessCatalog();
  const unitIds = createPermissionKernelCp128CoveredUnitIds();
  const manifest = createPermissionKernelCp128FailureTaxonomyEvidenceHarnessManifest();
  const matrix = createPermissionKernelCp128FailureTaxonomyEvidenceHarness();
  const handoff = createPermissionKernelCp128CloseoutHandoff();
  const resultById = Object.fromEntries(matrix.case_results.map((result) => [result.case_id, result]));

  if (rows.length !== 150) errors.push("CP00-128 row count must be 150");
  if (unitIds.length !== 150) errors.push("CP00-128 covered unit count must be 150");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-128 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P07.M06.S05") errors.push("CP00-128 first unit must be RP02.P07.M06.S05");
  if (unitIds.at(-1) !== "RP02.P08.M03.S21") errors.push("CP00-128 last unit must be RP02.P08.M03.S21");
  if (manifest.covered_micro_phase_count !== 9) errors.push("CP00-128 must cover nine micro phases");
  for (const [microPhaseId, count] of Object.entries({
    "RP02.P07.M06": 18,
    "RP02.P07.M07": 22,
    "RP02.P07.M08": 22,
    "RP02.P07.M09": 20,
    "RP02.P07.M10": 11,
    "RP02.P08.M00": 8,
    "RP02.P08.M01": 8,
    "RP02.P08.M02": 20,
    "RP02.P08.M03": 21,
  })) {
    if (manifest.phase_counts[microPhaseId] !== count) errors.push(`CP00-128 ${microPhaseId} count must be ${count}`);
  }
  for (const [domain, count] of Object.entries({
    synthetic_fixture_terminal: 18,
    test_golden_case_set: 22,
    hermes_evidence_packet: 22,
    claude_review_packet: 20,
    closeout_next_handoff: 11,
    scope_inventory: 8,
    contract_draft: 8,
    type_shape_definition: 20,
    primary_implementation_slice: 21,
  })) {
    if (manifest.domain_counts[domain] !== count) errors.push(`CP00-128 ${domain} domain count must be ${count}`);
  }
  for (const [deliverableType, count] of Object.entries({
    failure_recovery: 54,
    security_audit: 9,
    implementation: 24,
    hermes_evidence: 44,
    fixture: 4,
    test: 10,
    claude_review: 5,
  })) {
    if (manifest.deliverable_counts[deliverableType] !== count) {
      errors.push(`CP00-128 ${deliverableType} deliverable count must be ${count}`);
    }
  }
  if (matrix.inherited_test_fixture_result_count !== 10) errors.push("CP00-128 must inherit CP127 result count");
  if (matrix.inherited_missing_tenant_denied !== true) errors.push("CP00-128 must inherit CP127 missing tenant denial");
  if (matrix.inherited_claude_prompt_not_executed !== true) errors.push("CP00-128 must inherit CP127 Claude no-execution state");
  if (matrix.inherited_hermes_failure_reference_only !== true) errors.push("CP00-128 must inherit CP127 Hermes reference-only state");
  if (matrix.result_count !== 150) errors.push("CP00-128 result count must be 150");
  if (matrix.synthetic_fixture_terminal_result_count !== 18) errors.push("CP00-128 synthetic fixture terminal result count must be 18");
  if (matrix.test_golden_case_result_count !== 22) errors.push("CP00-128 test golden case result count must be 22");
  if (matrix.hermes_evidence_packet_result_count !== 22) errors.push("CP00-128 Hermes evidence packet result count must be 22");
  if (matrix.claude_review_packet_result_count !== 20) errors.push("CP00-128 Claude review packet result count must be 20");
  if (matrix.closeout_next_handoff_result_count !== 11) errors.push("CP00-128 closeout handoff result count must be 11");
  if (matrix.p08_evidence_result_count !== 57) errors.push("CP00-128 P08 evidence result count must be 57");

  if (resultById["synthetic_fixture_terminal.missing_resource_failure"]?.failure_taxonomy_profile?.missing_resource_denied !== true) {
    errors.push("CP00-128 missing resource fixture must fail closed");
  }
  if (resultById["synthetic_fixture_terminal.cross_tenant_failure"]?.failure_taxonomy_profile?.cross_tenant_denied !== true) {
    errors.push("CP00-128 cross-tenant fixture must fail closed");
  }
  if (resultById["synthetic_fixture_terminal.lock_conflict_failure"]?.acquires_locks !== false) {
    errors.push("CP00-128 lock conflict must not acquire locks");
  }
  if (resultById["synthetic_fixture_terminal.retry_exhaustion_failure"]?.executes_retry !== false) {
    errors.push("CP00-128 retry exhaustion must not execute retry");
  }
  if (resultById["test_golden_case_set.failure_unit_test"]?.test_golden_case?.failure_unit_test_bound !== true) {
    errors.push("CP00-128 test golden failure unit test must be bound");
  }
  if (resultById["test_golden_case_set.failure_integration_smoke"]?.test_golden_case?.integration_smoke_bound !== true) {
    errors.push("CP00-128 test golden integration smoke must be bound");
  }
  if (resultById["hermes_evidence_packet.hermes_failure_evidence"]?.hermes_evidence_packet?.writes_hermes_runtime !== false) {
    errors.push("CP00-128 Hermes evidence packet must not write runtime");
  }
  if (resultById["type_shape_definition.claude_dependency_marker"]?.claude_review_packet?.executes_claude_review !== false) {
    errors.push("CP00-128 Claude dependency marker must not execute review");
  }
  if (resultById["closeout_next_handoff.lock_conflict_failure"]?.acquires_locks !== false) {
    errors.push("CP00-128 closeout handoff lock conflict must not acquire locks");
  }
  if (resultById["scope_inventory.hermes_command_matrix"]?.hermes_evidence_packet?.command_matrix_bound !== true) {
    errors.push("CP00-128 scope inventory must bind Hermes command matrix");
  }
  if (resultById["contract_draft.evidence_field_list"]?.hermes_evidence_packet?.evidence_field_list_bound !== true) {
    errors.push("CP00-128 contract draft must bind evidence field list");
  }
  if (resultById["type_shape_definition.pass_semantics"]?.verdict_semantics?.pass_bound !== true) {
    errors.push("CP00-128 type shape must bind PASS semantics");
  }
  if (resultById["type_shape_definition.block_semantics"]?.verdict_semantics?.block_prevents_production_ready !== true) {
    errors.push("CP00-128 type shape must bind BLOCK semantics");
  }
  if (resultById["type_shape_definition.regression_receipt"]?.test_golden_case?.regression_receipt_bound !== true) {
    errors.push("CP00-128 type shape must bind regression receipt");
  }
  if (resultById["primary_implementation_slice.documentation_update"]?.closeout_handoff?.documentation_update_bound !== true) {
    errors.push("CP00-128 primary implementation must bind documentation update");
  }
  if (resultById["primary_implementation_slice.next_gate_readiness"]?.closeout_handoff?.next_gate_readiness_bound !== true) {
    errors.push("CP00-128 primary implementation must bind next gate readiness");
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
      errors.push(`CP00-128 case ${profile.case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-129" || handoff.next_subphase_id !== "RP02.P08.M03.S22") {
    errors.push("CP00-128 must hand off to CP00-129 / RP02.P08.M03.S22");
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
