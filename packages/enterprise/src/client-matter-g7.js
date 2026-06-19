export const ENTERPRISE_G7F_TUW_COVERAGE = Object.freeze([
  "LFOS-G7-W15-T001",
  "LFOS-G7-W15-T002",
  "LFOS-G7-W15-T003",
  "LFOS-G7-W15-T004",
  "LFOS-G7-W15-T005",
  "LFOS-G7-W15-T006",
]);

function freezeRecord(record) {
  return Object.freeze(record);
}

function freezeArray(values) {
  return Object.freeze([...(values ?? [])]);
}

function missingFields(fields, input) {
  return fields.filter((field) => input?.[field] === undefined || input?.[field] === null || input?.[field] === "");
}

function outcomeFor(blockedClaims) {
  return blockedClaims.length > 0 ? "blocked" : "review_required";
}

function noRuntimeBoundary(tuwId) {
  return {
    tuw_id: tuwId,
    synthetic_only: true,
    no_real_data: true,
    writes_product_state: false,
    creates_database_rows: false,
    updates_database_rows: false,
    deletes_database_rows: false,
    executes_live_test_suite: false,
    executes_security_scanner_runtime: false,
    executes_permission_runtime: false,
    executes_audit_runtime: false,
    persists_idempotency_key: false,
    calls_external_provider_api: false,
    reads_customer_payload: false,
    includes_customer_data_payload: false,
    includes_secret_value: false,
    includes_security_finding_payload: false,
    emits_runtime_audit_event: false,
    claims_coverage_threshold_met: false,
    claims_pm_qa_final_approval: false,
    claims_security_approval: false,
    claims_uat_completion: false,
    production_readiness_claim: "open",
    g7_runtime_readiness_claim: "open",
    enterprise_trust_claimed: false,
    go_live_approval_claimed: false,
  };
}

export function createEnterpriseG7TestStrategyDescriptor(request = {}) {
  const strategy = request.test_strategy ?? {};
  const pmQaReviewRequired = strategy.pm_qa_review_required === true && Boolean(strategy.pm_qa_review_marker_ref);
  const riskCoveragePresent = Boolean(strategy.risk_matrix_ref) && Boolean(strategy.workflow_coverage_matrix_ref);
  const finalApprovalClaimed = strategy.pm_qa_final_approval_claimed === true || request.pm_qa_final_approval_claimed === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "test_strategy"], request).length > 0) {
    blockedClaims.push("test_strategy_required_context_missing");
  }
  if (!strategy.strategy_doc_ref) blockedClaims.push("test_strategy_document_required");
  if (!pmQaReviewRequired) blockedClaims.push("test_strategy_pm_qa_review_required");
  if (!riskCoveragePresent) blockedClaims.push("test_strategy_risk_coverage_matrix_required");
  if (finalApprovalClaimed) blockedClaims.push("test_strategy_final_approval_claim_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T001"),
    descriptor_type: "enterprise_g7_test_strategy_descriptor",
    tenant_id: request.tenant_id ?? null,
    strategy_doc_ref: strategy.strategy_doc_ref ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    test_strategy_receipt: freezeRecord({
      pm_qa_review_required: pmQaReviewRequired,
      risk_coverage_matrix_present: riskCoveragePresent,
      final_approval_claimed: finalApprovalClaimed,
    }),
  });
}

export function createEnterpriseG7UnitBaselineDescriptor(request = {}) {
  const baseline = request.unit_baseline ?? {};
  const coverageThresholdPresent =
    Boolean(baseline.coverage_threshold_ref) &&
    baseline.coverage_threshold_percent > 0 &&
    baseline.coverage_threshold_reviewed === true;
  const unitSuitePresent = Boolean(baseline.unit_suite_ref) && baseline.unit_suite_inventory_reviewed === true;
  const claimsCoverageMet = baseline.claims_coverage_threshold_met === true || request.claims_coverage_threshold_met === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "unit_baseline"], request).length > 0) {
    blockedClaims.push("unit_baseline_required_context_missing");
  }
  if (!unitSuitePresent) blockedClaims.push("unit_baseline_suite_inventory_required");
  if (!coverageThresholdPresent) blockedClaims.push("unit_baseline_coverage_threshold_required");
  if (!baseline.failure_budget_ref) blockedClaims.push("unit_baseline_failure_budget_required");
  if (claimsCoverageMet) blockedClaims.push("unit_baseline_local_coverage_claim_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T002"),
    descriptor_type: "enterprise_g7_unit_baseline_descriptor",
    tenant_id: request.tenant_id ?? null,
    unit_suite_ref: baseline.unit_suite_ref ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    unit_baseline_receipt: freezeRecord({
      unit_suite_inventory_reviewed: unitSuitePresent,
      coverage_threshold_reviewed: coverageThresholdPresent,
      failure_budget_present: Boolean(baseline.failure_budget_ref),
      claims_coverage_threshold_met: claimsCoverageMet,
    }),
  });
}

export function createEnterpriseG7IntegrationBaselineDescriptor(request = {}) {
  const baseline = request.integration_baseline ?? {};
  const keyWorkflowsPassed = Boolean(baseline.integration_suite_ref) && baseline.key_workflows_passed === true;
  const environmentIsolated = baseline.environment_isolated === true && baseline.live_customer_data_used !== true;
  const externalRuntime = baseline.calls_external_provider_api === true || request.calls_external_provider_api === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "integration_baseline"], request).length > 0) {
    blockedClaims.push("integration_baseline_required_context_missing");
  }
  if (!keyWorkflowsPassed) blockedClaims.push("integration_baseline_key_workflow_pass_required");
  if (!environmentIsolated) blockedClaims.push("integration_baseline_isolated_environment_required");
  if (!baseline.workflow_list_ref) blockedClaims.push("integration_baseline_workflow_list_required");
  if (externalRuntime) blockedClaims.push("integration_baseline_external_runtime_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T003"),
    descriptor_type: "enterprise_g7_integration_baseline_descriptor",
    tenant_id: request.tenant_id ?? null,
    integration_suite_ref: baseline.integration_suite_ref ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    integration_baseline_receipt: freezeRecord({
      key_workflows_passed: keyWorkflowsPassed,
      environment_isolated: environmentIsolated,
      workflow_list_present: Boolean(baseline.workflow_list_ref),
      external_runtime_called: externalRuntime,
    }),
  });
}

export function createEnterpriseG7PermissionNegativeDescriptor(request = {}) {
  const negative = request.permission_negative ?? {};
  const unauthorizedBlocked = Boolean(negative.negative_suite_ref) && negative.unauthorized_access_blocked === true;
  const denyOverAllow = negative.deny_over_allow_tested === true && Boolean(negative.deny_matrix_ref);
  const bypassAllowed = negative.permission_bypass_allowed === true || request.permission_bypass_allowed === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "permission_negative"], request).length > 0) {
    blockedClaims.push("permission_negative_required_context_missing");
  }
  if (!unauthorizedBlocked) blockedClaims.push("permission_negative_unauthorized_blocked_required");
  if (!denyOverAllow) blockedClaims.push("permission_negative_deny_over_allow_required");
  if (bypassAllowed) blockedClaims.push("permission_negative_bypass_allowed_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T004"),
    descriptor_type: "enterprise_g7_permission_negative_descriptor",
    tenant_id: request.tenant_id ?? null,
    negative_suite_ref: negative.negative_suite_ref ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    permission_negative_receipt: freezeRecord({
      unauthorized_access_blocked: unauthorizedBlocked,
      deny_over_allow_tested: denyOverAllow,
      permission_bypass_allowed: bypassAllowed,
    }),
  });
}

export function createEnterpriseG7AuditCompletenessDescriptor(request = {}) {
  const audit = request.audit_completeness ?? {};
  const everyWriteMapped = Boolean(audit.write_event_matrix_ref) && audit.every_write_has_event === true;
  const auditSchemaPresent = Boolean(audit.audit_event_schema_ref) && audit.audit_event_schema_reviewed === true;
  const writesWithoutAudit = audit.writes_without_audit_allowed === true || request.writes_without_audit_allowed === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "audit_completeness"], request).length > 0) {
    blockedClaims.push("audit_completeness_required_context_missing");
  }
  if (!everyWriteMapped) blockedClaims.push("audit_completeness_every_write_event_required");
  if (!auditSchemaPresent) blockedClaims.push("audit_completeness_schema_review_required");
  if (writesWithoutAudit) blockedClaims.push("audit_completeness_write_without_audit_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T005"),
    descriptor_type: "enterprise_g7_audit_completeness_descriptor",
    tenant_id: request.tenant_id ?? null,
    write_event_matrix_ref: audit.write_event_matrix_ref ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    audit_completeness_receipt: freezeRecord({
      every_write_has_event: everyWriteMapped,
      audit_event_schema_reviewed: auditSchemaPresent,
      writes_without_audit_allowed: writesWithoutAudit,
    }),
  });
}

export function createEnterpriseG7IdempotencyBaselineDescriptor(request = {}) {
  const baseline = request.idempotency_baseline ?? {};
  const duplicateSafe = Boolean(baseline.idempotency_suite_ref) && baseline.duplicate_commands_safe === true;
  const replayProtection = Boolean(baseline.idempotency_key_ref) && baseline.replay_protection_tested === true;
  const duplicateSideEffect = baseline.duplicate_side_effect_allowed === true || request.duplicate_side_effect_allowed === true;
  const persistsIdempotencyKey = baseline.persists_idempotency_key === true || request.persists_idempotency_key === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "idempotency_baseline"], request).length > 0) {
    blockedClaims.push("idempotency_baseline_required_context_missing");
  }
  if (!duplicateSafe) blockedClaims.push("idempotency_duplicate_command_safe_required");
  if (!replayProtection) blockedClaims.push("idempotency_replay_protection_required");
  if (duplicateSideEffect) blockedClaims.push("idempotency_duplicate_side_effect_blocked");
  if (persistsIdempotencyKey) blockedClaims.push("idempotency_key_persistence_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T006"),
    descriptor_type: "enterprise_g7_idempotency_baseline_descriptor",
    tenant_id: request.tenant_id ?? null,
    idempotency_suite_ref: baseline.idempotency_suite_ref ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    idempotency_baseline_receipt: freezeRecord({
      duplicate_commands_safe: duplicateSafe,
      replay_protection_tested: replayProtection,
      duplicate_side_effect_allowed: duplicateSideEffect,
      persists_idempotency_key: persistsIdempotencyKey,
    }),
  });
}

export function createEnterpriseG7FQaSecurityBaselineCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const missingTuws = ENTERPRISE_G7F_TUW_COVERAGE.filter((tuwId) => !descriptorTuws.has(tuwId));
  const blockedDescriptors = descriptors.filter((descriptor) => descriptor?.outcome === "blocked");
  const blockedClaims = [];

  if (request.g7e_handoff_validated !== true) blockedClaims.push("qa_security_baseline_requires_g7e_handoff");
  if (request.rp26_contract_validated !== true) blockedClaims.push("qa_security_baseline_requires_rp26_contract_validation");
  if (missingTuws.length > 0) blockedClaims.push("qa_security_baseline_tuw_coverage_required");
  if (blockedDescriptors.length > 0) blockedClaims.push("qa_security_baseline_blocked_descriptor_present");
  if (request.claims_security_approval === true) blockedClaims.push("qa_security_baseline_security_approval_claim_blocked");
  if (request.claims_uat_completion === true) blockedClaims.push("qa_security_baseline_uat_completion_claim_blocked");
  if (request.claims_runtime_readiness === true) blockedClaims.push("qa_security_baseline_runtime_readiness_claim_blocked");
  if (request.claims_go_live_approval === true) blockedClaims.push("qa_security_baseline_go_live_claim_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T006"),
    descriptor_type: "enterprise_g7f_qa_security_baseline_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    tuw_coverage: ENTERPRISE_G7F_TUW_COVERAGE,
    missing_tuws: freezeArray(missingTuws),
    closeout_receipt: freezeRecord({
      g7e_handoff_validated: request.g7e_handoff_validated === true,
      rp26_contract_validated: request.rp26_contract_validated === true,
      test_strategy_required: true,
      unit_threshold_required: true,
      integration_workflow_pass_required: true,
      permission_negative_required: true,
      audit_completeness_required: true,
      idempotency_required: true,
      security_approval_claimed: false,
      uat_completion_claimed: false,
      runtime_readiness_claim: "open",
      production_readiness_claim: "open",
      go_live_approval_claimed: false,
    }),
  });
}
