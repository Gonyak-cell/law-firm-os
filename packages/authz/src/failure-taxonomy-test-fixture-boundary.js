import {
  PERMISSION_KERNEL_CP126_FAILURE_TAXONOMY_WORKFLOW_BINDING_CONTRACT,
  createPermissionKernelCp126FailureTaxonomyWorkflowBinding,
  runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase,
} from "./failure-taxonomy-workflow-binding.js";

export const PERMISSION_KERNEL_CP127_PACK_BINDING = Object.freeze({
  pack_id: "CP00-127",
  planned_pack_id: "CP00-127",
  risk_class: "A",
  unit_count: 10,
  range: "RP02.P07.M05.S17-RP02.P07.M06.S04",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-126",
  next_pack_id: "CP00-128",
  next_subphase_id: "RP02.P07.M06.S05",
});

const CP127_NO_WRITE_ATTESTATION = Object.freeze({
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

const CP127_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "failure_internal_stack",
  "permission_denied_internal_rule",
  "synthetic_fixture_secret",
  "integration_smoke_trace",
  "sealed_audit_hint_payload",
  "hermes_runtime_receipt_id",
  "claude_prompt_context",
  "human_escalation_reviewer_id",
  "tenant_fixture_token",
  "matter_fixture_token",
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
  "Failure unit test": "test",
  "Failure integration smoke": "test",
  "Audit failure hint": "security_audit",
  "Hermes failure evidence": "hermes_evidence",
  "Claude edge-case prompt": "claude_review",
  "Human escalation note": "implementation",
});

const CP127_PHASES = Object.freeze({
  "RP02.P07.M05": Object.freeze({
    start_index: 17,
    count: 6,
    micro_title: "Permission And Audit Binding",
    phase_role: "failure_taxonomy_permission_audit_test_evidence_terminal",
    area: "failure_taxonomy_permission_audit_test_evidence",
    domain: "permission_audit_test_evidence",
    case_prefix: "permission_audit_test_evidence",
  }),
  "RP02.P07.M06": Object.freeze({
    start_index: 1,
    count: 4,
    micro_title: "Synthetic Fixture Set",
    phase_role: "failure_taxonomy_synthetic_fixture_opening",
    area: "failure_taxonomy_synthetic_fixture_opening",
    domain: "synthetic_fixture_boundary",
    case_prefix: "synthetic_fixture_opening",
  }),
});

const STATUS_BY_KIND = Object.freeze({
  failure_taxonomy: "failure_taxonomy_synthetic_fixture_bound",
  missing_tenant_failure: "blocked_missing_tenant",
  missing_actor_failure: "blocked_missing_actor",
  missing_matter_failure: "blocked_missing_matter",
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
  return Object.entries(CP127_PHASES).flatMap(([microPhaseId, phase]) =>
    Array.from({ length: phase.count }, (_, offset) => {
      const index = phase.start_index + offset;
      const title = FAILURE_TITLES[index - 1];
      const behaviorKind = slugFor(title);
      const sourceUnitId = sourceUnitIdFor(microPhaseId, index);
      return Object.freeze({
        catalog_id: `${sourceUnitId}.${behaviorKind}`,
        pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.pack_id,
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
          "risk_a_failure_taxonomy_test_fixture_boundary",
          "cp126_workflow_binding_inherited",
          "permission_audit_tests_reference_only",
          "synthetic_fixture_opening_fails_closed",
          "claude_prompt_read_only_and_not_executed",
          "human_escalation_does_not_grant_approval",
          "audit_hermes_reference_only",
          "no_permission_policy_mutation",
          "no_audit_ledger_write",
          "no_product_or_database_write",
          "export_share_ai_boundaries_not_executed",
          "ldip_not_implemented",
          "hrx_embedded_inside_law_firm_os",
        ]),
        boundary_flags: CP127_NO_WRITE_ATTESTATION,
        synthetic_only: true,
        no_real_data: true,
        product_state_effect: "none",
      });
    }),
  );
}

function createStableReplay(caseId, status) {
  return Object.freeze({
    stable_id: `cp127.${caseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-127",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_a_failure_taxonomy_test_fixture_boundary: true,
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
    no_write_attestation: CP127_NO_WRITE_ATTESTATION,
  });
}

function createBoundaryResult(row) {
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
    permission_audit_test_evidence: Object.freeze({
      enabled_for_phase: row.domain === "permission_audit_test_evidence",
      unit_test_bound: row.behavior_kind === "failure_unit_test",
      integration_smoke_bound: row.behavior_kind === "failure_integration_smoke",
      deterministic: true,
      runs_against_synthetic_metadata_only: true,
      persisted: false,
    }),
    synthetic_fixture_boundary: Object.freeze({
      enabled_for_phase: row.domain === "synthetic_fixture_boundary",
      fixture_kind: row.behavior_kind,
      missing_tenant_denied: row.behavior_kind === "missing_tenant_failure",
      missing_actor_denied: row.behavior_kind === "missing_actor_failure",
      missing_matter_denied: row.behavior_kind === "missing_matter_failure",
      fixture_contains_real_data: false,
      fixture_persisted: false,
    }),
    audit_failure_hint: Object.freeze({
      preview_only: true,
      emitted_to_audit_ledger: false,
      hidden_fields_rendered: false,
      bound: row.behavior_kind === "audit_failure_hint",
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

export const PERMISSION_KERNEL_CP127_FAILURE_TAXONOMY_TEST_FIXTURE_BOUNDARY_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp127_failure_taxonomy_test_fixture_boundary_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP127_PACK_BINDING.range,
  upstream_failure_taxonomy_workflow_binding_pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.upstream_pack_id,
  inherited_failure_taxonomy_workflow_binding_contract_id:
    PERMISSION_KERNEL_CP126_FAILURE_TAXONOMY_WORKFLOW_BINDING_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP127_PACK_BINDING.unit_count,
  risk_a_failure_taxonomy_test_fixture_boundary: true,
  synthetic_only: true,
  permission_audit_tests_reference_only: true,
  synthetic_fixture_opening_reference_only: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  hidden_source_fields: CP127_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP127_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP127_PACK_BINDING",
    "PERMISSION_KERNEL_CP127_FAILURE_TAXONOMY_TEST_FIXTURE_BOUNDARY_CONTRACT",
    "createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCatalog",
    "createPermissionKernelCp127CoveredUnitIds",
    "createPermissionKernelCp127FailureTaxonomyTestFixtureBoundary",
    "runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase",
    "createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryManifest",
    "createPermissionKernelCp127HermesEvidencePacket",
    "createPermissionKernelCp127ClaudeReviewPacket",
    "createPermissionKernelCp127CloseoutHandoff",
    "validatePermissionKernelCp127Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP127_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel synthetic fixture failure taxonomy at RP02.P07.M06.S05 as planned CP00-128 Risk C; preserve CP127 test, evidence, review/escalation, and synthetic fixture opening boundaries as synthetic metadata-only and no-write.",
  }),
});

export function createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCatalog() {
  return Object.freeze(buildRowsFromPhases());
}

export function createPermissionKernelCp127CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(caseId) {
  const row = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCatalog().find((item) => item.case_id === caseId);
  if (!row) {
    return freezeNoWriteResult({
      case_id: caseId,
      domain: "unknown",
      behavior_kind: "unknown",
      status: "blocked_before_permission_evaluation",
      reason: "unknown_failure_taxonomy_test_fixture_boundary_case",
      evaluator_invoked: false,
      decision: null,
      fail_closed: true,
      ...createStableReplay(caseId, "blocked_before_permission_evaluation"),
    });
  }
  return createBoundaryResult(row);
}

export function createPermissionKernelCp127FailureTaxonomyTestFixtureBoundary() {
  const catalog = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCatalog();
  const inheritedWorkflow = createPermissionKernelCp126FailureTaxonomyWorkflowBinding();
  const inheritedUnitTest = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase(
    "secondary_workflow.failure_unit_test",
  );
  const inheritedHermes = runPermissionKernelCp126FailureTaxonomyWorkflowBindingCase(
    "secondary_workflow.hermes_failure_evidence",
  );
  const caseResults = Object.freeze(catalog.map((row) => runPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCase(row.case_id)));
  const domainCounts = caseResults.reduce((counts, result) => {
    counts[result.domain] = (counts[result.domain] ?? 0) + 1;
    return counts;
  }, {});
  const statusCounts = caseResults.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {});

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.upstream_pack_id,
    inherited_workflow_result_count: inheritedWorkflow.result_count,
    inherited_permission_audit_unit_test_bound: inheritedUnitTest.failure_test_binding?.unit_test_bound === true,
    inherited_hermes_failure_reference_only: inheritedHermes.hermes_failure_evidence?.reference_only === true,
    result_count: caseResults.length,
    permission_audit_test_evidence_result_count: domainCounts.permission_audit_test_evidence ?? 0,
    synthetic_fixture_boundary_result_count: domainCounts.synthetic_fixture_boundary ?? 0,
    case_results: caseResults,
    failure_test_fixture_status_counts: Object.freeze(statusCounts),
    hidden_source_fields: CP127_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP127_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryManifest() {
  const rows = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCatalog();
  const unitIds = createPermissionKernelCp127CoveredUnitIds();
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
  const matrix = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundary();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp127_failure_taxonomy_test_fixture_boundary_manifest",
    source_unit_range: PERMISSION_KERNEL_CP127_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    domain_counts: Object.freeze(domainCounts),
    result_count: matrix.result_count,
    inherited_workflow_result_count: matrix.inherited_workflow_result_count,
    synthetic_only: true,
    no_real_data: true,
    risk_a_failure_taxonomy_test_fixture_boundary: true,
    permission_audit_tests_reference_only: true,
    synthetic_fixture_opening_reference_only: true,
    no_write_attestation: CP127_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP127_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp127HermesEvidencePacket() {
  const manifest = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp127_failure_taxonomy_test_fixture_boundary_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-127",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp127ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp127_failure_taxonomy_test_fixture_boundary_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-127 closes the planned Risk A permission/audit test evidence and synthetic fixture opening units RP02.P07.M05.S17-RP02.P07.M06.S04, inherits CP126 workflow behavior, preserves synthetic-only metadata-only behavior, keeps unit tests and integration smoke deterministic and reference-only, keeps audit and Hermes evidence preview/reference-only, binds Claude prompt and human escalation references without executing review or granting approval, opens synthetic fixture failure taxonomy for missing tenant, actor, and Matter failures without real data or persistence, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, idempotency persistence, locks, retries, rollback, compensation, external share/export, AI/analytics execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp127CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP127_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP127_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP127_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP127_FAILURE_TAXONOMY_TEST_FIXTURE_BOUNDARY_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp127Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryCatalog();
  const unitIds = createPermissionKernelCp127CoveredUnitIds();
  const manifest = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundaryManifest();
  const matrix = createPermissionKernelCp127FailureTaxonomyTestFixtureBoundary();
  const handoff = createPermissionKernelCp127CloseoutHandoff();
  const resultById = Object.fromEntries(matrix.case_results.map((result) => [result.case_id, result]));

  if (rows.length !== 10) errors.push("CP00-127 row count must be 10");
  if (unitIds.length !== 10) errors.push("CP00-127 covered unit count must be 10");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-127 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P07.M05.S17") errors.push("CP00-127 first unit must be RP02.P07.M05.S17");
  if (unitIds.at(-1) !== "RP02.P07.M06.S04") errors.push("CP00-127 last unit must be RP02.P07.M06.S04");
  if (manifest.covered_micro_phase_count !== 2) errors.push("CP00-127 must cover two micro phases");
  if (manifest.phase_counts["RP02.P07.M05"] !== 6) errors.push("CP00-127 RP02.P07.M05 count must be 6");
  if (manifest.phase_counts["RP02.P07.M06"] !== 4) errors.push("CP00-127 RP02.P07.M06 count must be 4");
  if (manifest.domain_counts.permission_audit_test_evidence !== 6) {
    errors.push("CP00-127 permission audit test evidence domain count must be 6");
  }
  if (manifest.domain_counts.synthetic_fixture_boundary !== 4) {
    errors.push("CP00-127 synthetic fixture boundary domain count must be 4");
  }
  if (manifest.deliverable_counts.test !== 2) errors.push("CP00-127 test deliverable count must be 2");
  if (manifest.deliverable_counts.security_audit !== 1) errors.push("CP00-127 security_audit deliverable count must be 1");
  if (manifest.deliverable_counts.hermes_evidence !== 1) errors.push("CP00-127 hermes_evidence deliverable count must be 1");
  if (manifest.deliverable_counts.claude_review !== 1) errors.push("CP00-127 claude_review deliverable count must be 1");
  if (manifest.deliverable_counts.implementation !== 1) errors.push("CP00-127 implementation deliverable count must be 1");
  if (manifest.deliverable_counts.failure_recovery !== 4) errors.push("CP00-127 failure_recovery deliverable count must be 4");
  if (matrix.inherited_workflow_result_count !== 40) errors.push("CP00-127 must inherit CP126 workflow result count");
  if (matrix.inherited_permission_audit_unit_test_bound !== true) {
    errors.push("CP00-127 must inherit CP126 permission audit unit test binding");
  }
  if (matrix.inherited_hermes_failure_reference_only !== true) {
    errors.push("CP00-127 must inherit CP126 Hermes reference-only state");
  }
  if (matrix.permission_audit_test_evidence_result_count !== 6) {
    errors.push("CP00-127 permission audit test evidence result count must be 6");
  }
  if (matrix.synthetic_fixture_boundary_result_count !== 4) {
    errors.push("CP00-127 synthetic fixture boundary result count must be 4");
  }

  if (resultById["permission_audit_test_evidence.failure_unit_test"]?.permission_audit_test_evidence?.unit_test_bound !== true) {
    errors.push("CP00-127 failure unit test must bind unit test reference");
  }
  if (resultById["permission_audit_test_evidence.failure_integration_smoke"]?.permission_audit_test_evidence?.integration_smoke_bound !== true) {
    errors.push("CP00-127 integration smoke must bind smoke reference");
  }
  if (resultById["permission_audit_test_evidence.audit_failure_hint"]?.audit_failure_hint?.emitted_to_audit_ledger !== false) {
    errors.push("CP00-127 audit failure hint must not write audit ledger");
  }
  if (resultById["permission_audit_test_evidence.hermes_failure_evidence"]?.hermes_failure_evidence?.writes_hermes_runtime !== false) {
    errors.push("CP00-127 Hermes failure evidence must not write runtime");
  }
  if (resultById["permission_audit_test_evidence.claude_edge_case_prompt"]?.claude_edge_case_prompt?.executes_claude_review !== false) {
    errors.push("CP00-127 Claude edge-case prompt must not execute Claude review");
  }
  if (resultById["permission_audit_test_evidence.human_escalation_note"]?.human_escalation_note?.grants_human_approval !== false) {
    errors.push("CP00-127 human escalation note must not grant approval");
  }
  if (resultById["synthetic_fixture_opening.missing_tenant_failure"]?.synthetic_fixture_boundary?.missing_tenant_denied !== true) {
    errors.push("CP00-127 missing tenant fixture must fail closed");
  }
  if (resultById["synthetic_fixture_opening.missing_actor_failure"]?.synthetic_fixture_boundary?.missing_actor_denied !== true) {
    errors.push("CP00-127 missing actor fixture must fail closed");
  }
  if (resultById["synthetic_fixture_opening.missing_matter_failure"]?.synthetic_fixture_boundary?.missing_matter_denied !== true) {
    errors.push("CP00-127 missing Matter fixture must fail closed");
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
      errors.push(`CP00-127 case ${profile.case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-128" || handoff.next_subphase_id !== "RP02.P07.M06.S05") {
    errors.push("CP00-127 must hand off to CP00-128 / RP02.P07.M06.S05");
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
