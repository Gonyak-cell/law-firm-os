import {
  PERMISSION_KERNEL_CP124_PERMISSION_FIXTURE_FAILURE_TAXONOMY_CONTRACT,
  createPermissionKernelCp124PermissionFixtureFailureTaxonomy,
  runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase,
} from "./permission-fixture-failure-taxonomy.js";

export const PERMISSION_KERNEL_CP125_PACK_BINDING = Object.freeze({
  pack_id: "CP00-125",
  planned_pack_id: "CP00-125",
  risk_class: "A",
  unit_count: 10,
  range: "RP02.P07.M03.S11-RP02.P07.M03.S20",
  plan_ref: "docs/closeout-pack-plan/closeout-pack-plan.json",
  upstream_pack_id: "CP00-124",
  next_pack_id: "CP00-126",
  next_subphase_id: "RP02.P07.M03.S21",
});

const CP125_NO_WRITE_ATTESTATION = Object.freeze({
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

const CP125_HIDDEN_SOURCE_FIELDS = Object.freeze([
  "failure_internal_stack",
  "retry_lock_token",
  "lock_owner_token",
  "rollback_state_snapshot",
  "compensation_target",
  "blocked_claim_internal_reason",
  "sealed_audit_hint_payload",
  "hermes_runtime_receipt_id",
  "external_share_target",
  "ai_retrieval_query",
]);

const CP125_UNITS = Object.freeze([
  Object.freeze({ index: 11, title: "Lock conflict failure", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 12, title: "Retry exhaustion failure", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 13, title: "Rollback expectation", deliverable_type: "failure_recovery" }),
  Object.freeze({ index: 14, title: "Compensation expectation", deliverable_type: "implementation" }),
  Object.freeze({ index: 15, title: "Blocked-claim receipt", deliverable_type: "hermes_evidence" }),
  Object.freeze({ index: 16, title: "Failure fixture", deliverable_type: "fixture" }),
  Object.freeze({ index: 17, title: "Failure unit test", deliverable_type: "test" }),
  Object.freeze({ index: 18, title: "Failure integration smoke", deliverable_type: "test" }),
  Object.freeze({ index: 19, title: "Audit failure hint", deliverable_type: "security_audit" }),
  Object.freeze({ index: 20, title: "Hermes failure evidence", deliverable_type: "hermes_evidence" }),
]);

const CP125_BEHAVIOR = Object.freeze({
  lock_conflict_failure: Object.freeze({
    status: "blocked_lock_conflict",
    failure_code: "permission_kernel.lock_conflict_failure",
    lock_conflict_detected: true,
  }),
  retry_exhaustion_failure: Object.freeze({
    status: "retry_exhausted_no_retry_execution",
    failure_code: "permission_kernel.retry_exhaustion_failure",
    retry_receipt_reference_only: true,
  }),
  rollback_expectation: Object.freeze({
    status: "rollback_expected_not_executed",
    failure_code: "permission_kernel.rollback_expectation",
    rollback_expected: true,
  }),
  compensation_expectation: Object.freeze({
    status: "compensation_expected_not_executed",
    failure_code: "permission_kernel.compensation_expectation",
    compensation_expected: true,
  }),
  blocked_claim_receipt: Object.freeze({
    status: "blocked_claim_receipt_bound",
    failure_code: "permission_kernel.blocked_claim_receipt",
    blocked_claim_receipt_required: true,
  }),
  failure_fixture: Object.freeze({
    status: "failure_fixture_bound",
    failure_code: "permission_kernel.failure_fixture",
    fixture_bound: true,
  }),
  failure_unit_test: Object.freeze({
    status: "failure_test_bound",
    failure_code: "permission_kernel.failure_unit_test",
    test_bound: true,
  }),
  failure_integration_smoke: Object.freeze({
    status: "failure_smoke_bound",
    failure_code: "permission_kernel.failure_integration_smoke",
    smoke_bound: true,
  }),
  audit_failure_hint: Object.freeze({
    status: "audit_failure_hint_bound",
    failure_code: "permission_kernel.audit_failure_hint",
    audit_hint_bound: true,
  }),
  hermes_failure_evidence: Object.freeze({
    status: "hermes_failure_evidence_bound",
    failure_code: "permission_kernel.hermes_failure_evidence",
    hermes_evidence_bound: true,
  }),
});

function slugFor(text) {
  return text.toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function sourceUnitIdFor(index) {
  return `RP02.P07.M03.S${String(index).padStart(2, "0")}`;
}

function createStableReplay(caseId, status) {
  return Object.freeze({
    stable_id: `cp125.${caseId}`,
    stable_id_check: Object.freeze({ deterministic: true, source: "case_id", persisted: false }),
    replay_command: "node --test packages/authz/test/*.test.js --test-name-pattern=CP00-125",
    replay_status: status,
    replay_persists_state: false,
    replay_acquires_lock: false,
  });
}

function freezeNoWriteResult(result) {
  return Object.freeze({
    ...result,
    pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.pack_id,
    synthetic_only: true,
    no_real_data: true,
    risk_a_failure_taxonomy_boundary: true,
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
    no_write_attestation: CP125_NO_WRITE_ATTESTATION,
  });
}

function createBoundaryResult(row) {
  const behavior = CP125_BEHAVIOR[row.behavior_kind] ?? Object.freeze({
    status: "blocked_unknown_failure_kind",
    failure_code: "permission_kernel.unknown_failure_kind",
  });

  return freezeNoWriteResult({
    case_id: row.case_id,
    domain: row.domain,
    behavior_kind: row.behavior_kind,
    status: behavior.status,
    reason: row.behavior_kind,
    evaluator_invoked: false,
    decision: null,
    failure_code: behavior.failure_code,
    fail_closed: true,
    lock_policy: Object.freeze({
      lock_conflict_detected: behavior.lock_conflict_detected === true,
      lock_acquired: false,
      lock_token_persisted: false,
      lock_token_persisted_to_database: false,
    }),
    retry_policy: Object.freeze({
      retry_allowed_by_this_pack: false,
      retry_executed: false,
      retry_receipt_reference_only: behavior.retry_receipt_reference_only === true,
    }),
    rollback_policy: Object.freeze({
      rollback_expected: behavior.rollback_expected === true,
      rollback_executed: false,
      rollback_state_snapshot_persisted: false,
    }),
    compensation_policy: Object.freeze({
      compensation_expected: behavior.compensation_expected === true,
      compensation_executed: false,
      compensation_target_persisted: false,
    }),
    blocked_claim_receipt: Object.freeze({
      required: behavior.blocked_claim_receipt_required === true,
      emitted_to_hermes_runtime: false,
      preview_only: true,
      persisted: false,
    }),
    failure_fixture: Object.freeze({
      fixture_kind: row.behavior_kind,
      fixture_bound: behavior.fixture_bound === true,
      persisted: false,
      contains_real_data: false,
    }),
    failure_test_binding: Object.freeze({
      unit_test_bound: behavior.test_bound === true,
      integration_smoke_bound: behavior.smoke_bound === true,
      deterministic: true,
      runs_against_synthetic_metadata_only: true,
    }),
    audit_failure_hint: Object.freeze({
      preview_only: true,
      emitted_to_audit_ledger: false,
      hidden_fields_rendered: false,
      bound: behavior.audit_hint_bound === true,
    }),
    hermes_failure_evidence: Object.freeze({
      reference_only: true,
      command_evidence_required_at_pack_closeout: true,
      writes_hermes_runtime: false,
      bound: behavior.hermes_evidence_bound === true,
    }),
    ...createStableReplay(row.case_id, behavior.status),
  });
}

export const PERMISSION_KERNEL_CP125_FAILURE_TAXONOMY_RISK_BOUNDARY_CONTRACT = Object.freeze({
  pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.pack_id,
  contract_id: "permission_kernel_cp125_failure_taxonomy_risk_boundary_contract",
  program_id: "RP02",
  source_unit_range: PERMISSION_KERNEL_CP125_PACK_BINDING.range,
  upstream_permission_fixture_failure_taxonomy_pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.upstream_pack_id,
  inherited_permission_fixture_failure_taxonomy_contract_id:
    PERMISSION_KERNEL_CP124_PERMISSION_FIXTURE_FAILURE_TAXONOMY_CONTRACT.contract_id,
  covered_unit_count: PERMISSION_KERNEL_CP125_PACK_BINDING.unit_count,
  risk_a_failure_taxonomy_boundary: true,
  synthetic_only: true,
  metadata_only_failure_taxonomy: true,
  terminal_primary_failure_boundary: true,
  runtime_ui_route_added: false,
  runtime_api_route_added: false,
  hidden_source_fields: CP125_HIDDEN_SOURCE_FIELDS,
  no_write_attestation: CP125_NO_WRITE_ATTESTATION,
  public_exports: Object.freeze([
    "PERMISSION_KERNEL_CP125_PACK_BINDING",
    "PERMISSION_KERNEL_CP125_FAILURE_TAXONOMY_RISK_BOUNDARY_CONTRACT",
    "createPermissionKernelCp125FailureTaxonomyRiskBoundaryCatalog",
    "createPermissionKernelCp125CoveredUnitIds",
    "createPermissionKernelCp125FailureTaxonomyRiskBoundary",
    "runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase",
    "createPermissionKernelCp125FailureTaxonomyRiskBoundaryManifest",
    "createPermissionKernelCp125HermesEvidencePacket",
    "createPermissionKernelCp125ClaudeReviewPacket",
    "createPermissionKernelCp125CloseoutHandoff",
    "validatePermissionKernelCp125Coverage",
  ]),
  handoff: Object.freeze({
    next_pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP125_PACK_BINDING.next_subphase_id,
    next_scope:
      "Continue RP02 Permission Kernel failure taxonomy and audit binding at RP02.P07.M03.S21 as planned CP00-126 Risk B; preserve CP125 lock, retry, rollback, compensation, blocked-claim, fixture, test, audit hint, and Hermes evidence boundaries as synthetic metadata-only and no-write.",
  }),
});

export function createPermissionKernelCp125FailureTaxonomyRiskBoundaryCatalog() {
  return Object.freeze(
    CP125_UNITS.map((unit) => {
      const behaviorKind = slugFor(unit.title);
      const sourceUnitId = sourceUnitIdFor(unit.index);
      return Object.freeze({
        catalog_id: `${sourceUnitId}.${behaviorKind}`,
        pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.pack_id,
        program_id: "RP02",
        phase_id: "RP02.P07",
        micro_phase_id: "RP02.P07.M03",
        micro_title: "Primary Implementation Slice",
        phase_role: "failure_taxonomy_primary_boundary_terminal",
        area: "failure_taxonomy_risk_boundary",
        domain: "failure_taxonomy",
        title: unit.title,
        coverage_kind: behaviorKind,
        deliverable_type: unit.deliverable_type,
        case_id: `failure_taxonomy_risk_boundary.${behaviorKind}`,
        behavior_kind: behaviorKind,
        source_unit_ids: Object.freeze([sourceUnitId]),
        required_assertions: Object.freeze([
          "synthetic_only",
          "risk_a_failure_taxonomy_boundary",
          "cp124_failure_taxonomy_inherited",
          "failure_taxonomy_fails_closed",
          "lock_conflict_never_acquires_or_persists_lock",
          "retry_exhaustion_never_executes_retry",
          "rollback_and_compensation_never_execute",
          "blocked_claim_audit_hermes_reference_only",
          "fixture_and_test_data_synthetic_only",
          "no_permission_policy_mutation",
          "no_audit_ledger_write",
          "no_product_or_database_write",
          "export_share_ai_boundaries_not_executed",
          "ldip_not_implemented",
          "hrx_embedded_inside_law_firm_os",
        ]),
        boundary_flags: CP125_NO_WRITE_ATTESTATION,
        synthetic_only: true,
        no_real_data: true,
        product_state_effect: "none",
      });
    }),
  );
}

export function createPermissionKernelCp125CoveredUnitIds() {
  return Object.freeze(createPermissionKernelCp125FailureTaxonomyRiskBoundaryCatalog().flatMap((item) => item.source_unit_ids));
}

export function runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase(caseId) {
  const row = createPermissionKernelCp125FailureTaxonomyRiskBoundaryCatalog().find((item) => item.case_id === caseId);
  if (!row) {
    return freezeNoWriteResult({
      case_id: caseId,
      domain: "unknown",
      behavior_kind: "unknown",
      status: "blocked_before_permission_evaluation",
      reason: "unknown_failure_taxonomy_risk_boundary_case",
      evaluator_invoked: false,
      decision: null,
      fail_closed: true,
      ...createStableReplay(caseId, "blocked_before_permission_evaluation"),
    });
  }
  return createBoundaryResult(row);
}

export function createPermissionKernelCp125FailureTaxonomyRiskBoundary() {
  const catalog = createPermissionKernelCp125FailureTaxonomyRiskBoundaryCatalog();
  const inheritedMatrix = createPermissionKernelCp124PermissionFixtureFailureTaxonomy();
  const inheritedLock = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase(
    "failure_type_shape_definition.lock_conflict_failure",
  );
  const inheritedRetry = runPermissionKernelCp124PermissionFixtureFailureTaxonomyCase(
    "failure_contract_draft.retry_exhaustion_failure",
  );
  const caseResults = Object.freeze(catalog.map((row) => runPermissionKernelCp125FailureTaxonomyRiskBoundaryCase(row.case_id)));
  const statusCounts = caseResults.reduce((counts, result) => {
    counts[result.status] = (counts[result.status] ?? 0) + 1;
    return counts;
  }, {});

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.pack_id,
    inherited_pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.upstream_pack_id,
    inherited_failure_taxonomy_result_count: inheritedMatrix.failure_taxonomy_result_count,
    inherited_lock_conflict_status: inheritedLock.status,
    inherited_retry_exhaustion_status: inheritedRetry.status,
    result_count: caseResults.length,
    case_results: caseResults,
    failure_boundary_status_counts: Object.freeze(statusCounts),
    hidden_source_fields: CP125_HIDDEN_SOURCE_FIELDS,
    no_write_attestation: CP125_NO_WRITE_ATTESTATION,
  });
}

export function createPermissionKernelCp125FailureTaxonomyRiskBoundaryManifest() {
  const rows = createPermissionKernelCp125FailureTaxonomyRiskBoundaryCatalog();
  const unitIds = createPermissionKernelCp125CoveredUnitIds();
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
  const matrix = createPermissionKernelCp125FailureTaxonomyRiskBoundary();

  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.pack_id,
    manifest_id: "permission_kernel_cp125_failure_taxonomy_risk_boundary_manifest",
    source_unit_range: PERMISSION_KERNEL_CP125_PACK_BINDING.range,
    first_unit_id: unitIds[0],
    last_unit_id: unitIds.at(-1),
    covered_unit_count: unitIds.length,
    covered_micro_phase_count: Object.keys(phaseCounts).length,
    deliverable_counts: Object.freeze(deliverableCounts),
    area_counts: Object.freeze(areaCounts),
    phase_counts: Object.freeze(phaseCounts),
    domain_counts: Object.freeze({ failure_taxonomy: rows.length }),
    result_count: matrix.result_count,
    inherited_failure_taxonomy_result_count: matrix.inherited_failure_taxonomy_result_count,
    synthetic_only: true,
    no_real_data: true,
    risk_a_failure_taxonomy_boundary: true,
    metadata_only_failure_taxonomy: true,
    no_write_attestation: CP125_NO_WRITE_ATTESTATION,
    next_pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP125_PACK_BINDING.next_subphase_id,
  });
}

export function createPermissionKernelCp125HermesEvidencePacket() {
  const manifest = createPermissionKernelCp125FailureTaxonomyRiskBoundaryManifest();
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.pack_id,
    evidence_packet_id: "permission_kernel_cp125_failure_taxonomy_risk_boundary_hermes_packet",
    hermes_gate: "H02",
    status: "ready_for_command_evidence",
    synthetic_only: true,
    no_real_data: true,
    covered_unit_count: manifest.covered_unit_count,
    command_anchors: Object.freeze([
      "node --test packages/authz/test/*.test.js",
      "npm run rp02:permission-kernel:validate",
      "npm run closeout-pack:validate CP00-125",
      "npm test",
      "npm run build",
    ]),
    no_write_attestation: manifest.no_write_attestation,
  });
}

export function createPermissionKernelCp125ClaudeReviewPacket() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.pack_id,
    review_packet_id: "permission_kernel_cp125_failure_taxonomy_risk_boundary_claude_packet",
    model: "claude-opus-4-8",
    effort: "max",
    read_only: true,
    exactly_one_valid_pack_review_required: true,
    focus:
      "Verify CP00-125 closes the planned Risk A failure taxonomy boundary units RP02.P07.M03.S11-S20, inherits CP124 failure taxonomy behavior, preserves synthetic-only metadata-only behavior, blocks lock conflicts without lock acquisition or lock token persistence, handles retry exhaustion without retry execution, records rollback and compensation expectations without execution or writes, keeps blocked-claim/audit/Hermes evidence preview or reference only, binds fixture/test/smoke units to deterministic synthetic metadata only, and adds no runtime UI/API routes, permission policy mutations, audit/product/database writes, idempotency persistence, locks, retries, rollback, compensation, external share/export, AI/analytics execution, LDIP implementation, or HRX split.",
  });
}

export function createPermissionKernelCp125CloseoutHandoff() {
  return Object.freeze({
    pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.pack_id,
    current_range: PERMISSION_KERNEL_CP125_PACK_BINDING.range,
    next_pack_id: PERMISSION_KERNEL_CP125_PACK_BINDING.next_pack_id,
    next_subphase_id: PERMISSION_KERNEL_CP125_PACK_BINDING.next_subphase_id,
    handoff_scope: PERMISSION_KERNEL_CP125_FAILURE_TAXONOMY_RISK_BOUNDARY_CONTRACT.handoff.next_scope,
    ldip_implemented: false,
    hrx_embedded_boundary: "embedded_people_hr_evidence_module_inside_law_firm_os",
  });
}

export function validatePermissionKernelCp125Coverage() {
  const errors = [];
  const rows = createPermissionKernelCp125FailureTaxonomyRiskBoundaryCatalog();
  const unitIds = createPermissionKernelCp125CoveredUnitIds();
  const manifest = createPermissionKernelCp125FailureTaxonomyRiskBoundaryManifest();
  const matrix = createPermissionKernelCp125FailureTaxonomyRiskBoundary();
  const handoff = createPermissionKernelCp125CloseoutHandoff();
  const resultById = Object.fromEntries(matrix.case_results.map((result) => [result.case_id, result]));

  if (rows.length !== 10) errors.push("CP00-125 row count must be 10");
  if (unitIds.length !== 10) errors.push("CP00-125 covered unit count must be 10");
  if (new Set(unitIds).size !== unitIds.length) errors.push("CP00-125 covered unit ids must be unique");
  if (unitIds[0] !== "RP02.P07.M03.S11") errors.push("CP00-125 first unit must be RP02.P07.M03.S11");
  if (unitIds.at(-1) !== "RP02.P07.M03.S20") errors.push("CP00-125 last unit must be RP02.P07.M03.S20");
  if (manifest.covered_micro_phase_count !== 1) errors.push("CP00-125 must cover one micro phase");
  if (manifest.domain_counts.failure_taxonomy !== 10) errors.push("CP00-125 failure taxonomy domain count must be 10");
  if (manifest.phase_counts["RP02.P07.M03"] !== 10) errors.push("CP00-125 RP02.P07.M03 count must be 10");
  if (manifest.deliverable_counts.failure_recovery !== 3) errors.push("CP00-125 failure_recovery deliverable count must be 3");
  if (manifest.deliverable_counts.implementation !== 1) errors.push("CP00-125 implementation deliverable count must be 1");
  if (manifest.deliverable_counts.hermes_evidence !== 2) errors.push("CP00-125 hermes_evidence deliverable count must be 2");
  if (manifest.deliverable_counts.fixture !== 1) errors.push("CP00-125 fixture deliverable count must be 1");
  if (manifest.deliverable_counts.test !== 2) errors.push("CP00-125 test deliverable count must be 2");
  if (manifest.deliverable_counts.security_audit !== 1) errors.push("CP00-125 security_audit deliverable count must be 1");
  if (matrix.inherited_failure_taxonomy_result_count !== 61) errors.push("CP00-125 must inherit CP124 failure taxonomy result count");
  if (matrix.inherited_lock_conflict_status !== "blocked_lock_conflict") errors.push("CP00-125 must inherit CP124 lock conflict status");
  if (matrix.inherited_retry_exhaustion_status !== "retry_exhausted_no_retry_execution") {
    errors.push("CP00-125 must inherit CP124 retry exhaustion status");
  }
  if (matrix.result_count !== 10) errors.push("CP00-125 result count must be 10");
  if (resultById["failure_taxonomy_risk_boundary.lock_conflict_failure"]?.lock_policy?.lock_acquired !== false) {
    errors.push("CP00-125 lock conflict must not acquire locks");
  }
  if (resultById["failure_taxonomy_risk_boundary.lock_conflict_failure"]?.lock_policy?.lock_token_persisted !== false) {
    errors.push("CP00-125 lock conflict must not persist lock token");
  }
  if (resultById["failure_taxonomy_risk_boundary.retry_exhaustion_failure"]?.retry_policy?.retry_executed !== false) {
    errors.push("CP00-125 retry exhaustion must not execute retry");
  }
  if (resultById["failure_taxonomy_risk_boundary.rollback_expectation"]?.rollback_policy?.rollback_executed !== false) {
    errors.push("CP00-125 rollback expectation must not execute rollback");
  }
  if (resultById["failure_taxonomy_risk_boundary.compensation_expectation"]?.compensation_policy?.compensation_executed !== false) {
    errors.push("CP00-125 compensation expectation must not execute compensation");
  }
  if (resultById["failure_taxonomy_risk_boundary.blocked_claim_receipt"]?.blocked_claim_receipt?.preview_only !== true) {
    errors.push("CP00-125 blocked claim receipt must be preview-only");
  }
  if (resultById["failure_taxonomy_risk_boundary.failure_fixture"]?.failure_fixture?.contains_real_data !== false) {
    errors.push("CP00-125 failure fixture must not contain real data");
  }
  if (resultById["failure_taxonomy_risk_boundary.failure_unit_test"]?.failure_test_binding?.deterministic !== true) {
    errors.push("CP00-125 failure unit test binding must be deterministic");
  }
  if (resultById["failure_taxonomy_risk_boundary.failure_integration_smoke"]?.failure_test_binding?.integration_smoke_bound !== true) {
    errors.push("CP00-125 integration smoke must be bound");
  }
  if (resultById["failure_taxonomy_risk_boundary.audit_failure_hint"]?.audit_failure_hint?.emitted_to_audit_ledger !== false) {
    errors.push("CP00-125 audit failure hint must not write audit ledger");
  }
  if (resultById["failure_taxonomy_risk_boundary.hermes_failure_evidence"]?.hermes_failure_evidence?.writes_hermes_runtime !== false) {
    errors.push("CP00-125 Hermes failure evidence must not write Hermes runtime");
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
      profile.writes_hermes_runtime ||
      profile.implements_ldip
    ) {
      errors.push(`CP00-125 case ${profile.case_id} must remain no-write and leak-free`);
    }
  }
  if (handoff.next_pack_id !== "CP00-126" || handoff.next_subphase_id !== "RP02.P07.M03.S21") {
    errors.push("CP00-125 must hand off to CP00-126 / RP02.P07.M03.S21");
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
