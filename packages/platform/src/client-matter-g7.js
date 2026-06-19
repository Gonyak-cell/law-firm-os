export const PLATFORM_G7G_TUW_COVERAGE = Object.freeze([
  "LFOS-G7-W15-T007",
  "LFOS-G7-W15-T008",
  "LFOS-G7-W15-T009",
  "LFOS-G7-W15-T010",
  "LFOS-G7-W15-T011",
  "LFOS-G7-W15-T012",
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
    executes_state_machine_runtime: false,
    executes_security_regression_runtime: false,
    executes_performance_runtime: false,
    executes_backup_restore_runtime: false,
    executes_uat_runtime: false,
    calls_external_provider_api: false,
    reads_customer_payload: false,
    includes_customer_data_payload: false,
    includes_secret_value: false,
    changes_production_config: false,
    production_release_executed: false,
    claims_security_approval: false,
    claims_uat_completion: false,
    claims_g7_approval: false,
    production_readiness_claim: "open",
    g7_runtime_readiness_claim: "open",
    go_live_approval_claimed: false,
  };
}

export function createPlatformG7StateTransitionTestDescriptor(request = {}) {
  const suite = request.state_transition_suite ?? {};
  const invalidTransitionBlocked =
    Boolean(suite.suite_ref) &&
    Boolean(suite.invalid_transition_matrix_ref) &&
    Boolean(suite.state_machine_model_ref) &&
    suite.invalid_transitions_blocked === true;
  const invalidTransitionAllowed =
    suite.invalid_transition_allowed === true || request.invalid_transition_allowed === true;
  const runtimeExecuted =
    suite.executes_state_machine_runtime === true || request.executes_state_machine_runtime === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "state_transition_suite"], request).length > 0) {
    blockedClaims.push("state_transition_required_context_missing");
  }
  if (!invalidTransitionBlocked) blockedClaims.push("state_transition_invalid_transition_blocked_required");
  if (invalidTransitionAllowed) blockedClaims.push("state_transition_invalid_transition_allowed_blocked");
  if (runtimeExecuted) blockedClaims.push("state_transition_runtime_execution_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T007"),
    descriptor_type: "platform_g7_state_transition_test_descriptor",
    tenant_id: request.tenant_id ?? null,
    suite_ref: suite.suite_ref ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    state_transition_receipt: freezeRecord({
      invalid_transitions_blocked: invalidTransitionBlocked,
      invalid_transition_allowed: invalidTransitionAllowed,
      state_machine_model_present: Boolean(suite.state_machine_model_ref),
      runtime_executed: runtimeExecuted,
    }),
  });
}

export function createPlatformG7SecurityRegressionDescriptor(request = {}) {
  const regression = request.security_regression ?? {};
  const tenantLeakAbsent =
    Boolean(regression.suite_ref) &&
    Boolean(regression.tenant_isolation_matrix_ref) &&
    Boolean(regression.privilege_regression_ref) &&
    regression.tenant_leak_absent === true;
  const tenantLeakDetected = regression.tenant_leak_detected === true || request.tenant_leak_detected === true;
  const runtimeExecuted =
    regression.executes_security_regression_runtime === true || request.executes_security_regression_runtime === true;
  const includesCustomerData =
    regression.includes_customer_data_payload === true || request.includes_customer_data_payload === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "security_regression"], request).length > 0) {
    blockedClaims.push("security_regression_required_context_missing");
  }
  if (!tenantLeakAbsent) blockedClaims.push("security_regression_tenant_leak_absent_required");
  if (tenantLeakDetected) blockedClaims.push("security_regression_tenant_leak_blocked");
  if (runtimeExecuted) blockedClaims.push("security_regression_runtime_execution_blocked");
  if (includesCustomerData) blockedClaims.push("security_regression_customer_payload_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T008"),
    descriptor_type: "platform_g7_security_regression_descriptor",
    tenant_id: request.tenant_id ?? null,
    suite_ref: regression.suite_ref ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    security_regression_receipt: freezeRecord({
      tenant_leak_absent: tenantLeakAbsent,
      tenant_leak_detected: tenantLeakDetected,
      tenant_isolation_matrix_present: Boolean(regression.tenant_isolation_matrix_ref),
      runtime_executed: runtimeExecuted,
      includes_customer_data_payload: includesCustomerData,
    }),
  });
}

export function createPlatformG7PerformanceSmokeDescriptor(request = {}) {
  const smoke = request.performance_smoke ?? {};
  const latencyThresholdPresent =
    Boolean(smoke.smoke_report_ref) &&
    Boolean(smoke.latency_threshold_ref) &&
    smoke.agreed_latency_threshold_ms > 0 &&
    smoke.threshold_reviewed === true;
  const runtimeExecuted = smoke.executes_performance_runtime === true || request.executes_performance_runtime === true;
  const claimsLatencySloMet = smoke.claims_latency_slo_met === true || request.claims_latency_slo_met === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "performance_smoke"], request).length > 0) {
    blockedClaims.push("performance_smoke_required_context_missing");
  }
  if (!latencyThresholdPresent) blockedClaims.push("performance_smoke_latency_threshold_required");
  if (!smoke.sample_window_ref) blockedClaims.push("performance_smoke_sample_window_required");
  if (runtimeExecuted) blockedClaims.push("performance_smoke_runtime_execution_blocked");
  if (claimsLatencySloMet) blockedClaims.push("performance_smoke_latency_slo_claim_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T009"),
    descriptor_type: "platform_g7_performance_smoke_descriptor",
    tenant_id: request.tenant_id ?? null,
    smoke_report_ref: smoke.smoke_report_ref ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    performance_smoke_receipt: freezeRecord({
      latency_threshold_reviewed: latencyThresholdPresent,
      agreed_latency_threshold_ms: smoke.agreed_latency_threshold_ms ?? null,
      sample_window_present: Boolean(smoke.sample_window_ref),
      runtime_executed: runtimeExecuted,
      claims_latency_slo_met: claimsLatencySloMet,
    }),
  });
}

export function createPlatformG7BackupRestoreDrillDescriptor(request = {}) {
  const drill = request.backup_restore ?? {};
  const restoreVerified =
    Boolean(drill.drill_report_ref) &&
    Boolean(drill.restore_point_ref) &&
    Boolean(drill.rollback_runbook_ref) &&
    drill.restore_verified === true;
  const runtimeExecuted =
    drill.executes_backup_restore_runtime === true || request.executes_backup_restore_runtime === true;
  const productionRestoreExecuted =
    drill.production_restore_executed === true || request.production_restore_executed === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "backup_restore"], request).length > 0) {
    blockedClaims.push("backup_restore_required_context_missing");
  }
  if (!restoreVerified) blockedClaims.push("backup_restore_restore_verified_required");
  if (!drill.rpo_rto_review_ref) blockedClaims.push("backup_restore_rpo_rto_review_required");
  if (runtimeExecuted) blockedClaims.push("backup_restore_runtime_execution_blocked");
  if (productionRestoreExecuted) blockedClaims.push("backup_restore_production_restore_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T010"),
    descriptor_type: "platform_g7_backup_restore_drill_descriptor",
    tenant_id: request.tenant_id ?? null,
    drill_report_ref: drill.drill_report_ref ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    backup_restore_receipt: freezeRecord({
      restore_verified: restoreVerified,
      restore_point_present: Boolean(drill.restore_point_ref),
      rollback_runbook_present: Boolean(drill.rollback_runbook_ref),
      rpo_rto_review_present: Boolean(drill.rpo_rto_review_ref),
      runtime_executed: runtimeExecuted,
      production_restore_executed: productionRestoreExecuted,
    }),
  });
}

export function createPlatformG7UatScriptPackageDescriptor(request = {}) {
  const uat = request.uat_package ?? {};
  const scriptPackagePresent = Boolean(uat.script_package_ref) && Boolean(uat.role_scenario_matrix_ref);
  const userSignoffRecorded =
    Boolean(uat.signoff_tracker_ref) &&
    Boolean(uat.representative_user_signoff_ref) &&
    uat.user_signoff_recorded === true;
  const runtimeExecuted = uat.executes_uat_runtime === true || request.executes_uat_runtime === true;
  const claimsUatCompletion =
    uat.claims_full_uat_completion === true ||
    request.claims_uat_completion === true ||
    request.claims_user_signoff_complete === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "uat_package"], request).length > 0) {
    blockedClaims.push("uat_script_required_context_missing");
  }
  if (!scriptPackagePresent) blockedClaims.push("uat_script_package_required");
  if (!userSignoffRecorded) blockedClaims.push("uat_script_user_signoff_required");
  if (runtimeExecuted) blockedClaims.push("uat_script_runtime_execution_blocked");
  if (claimsUatCompletion) blockedClaims.push("uat_completion_claim_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T011"),
    descriptor_type: "platform_g7_uat_script_package_descriptor",
    tenant_id: request.tenant_id ?? null,
    script_package_ref: uat.script_package_ref ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    uat_package_receipt: freezeRecord({
      script_package_present: scriptPackagePresent,
      user_signoff_recorded: userSignoffRecorded,
      signoff_tracker_present: Boolean(uat.signoff_tracker_ref),
      runtime_executed: runtimeExecuted,
      uat_completion_claimed: claimsUatCompletion,
    }),
  });
}

export function createPlatformG7GReleaseReadinessCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const missingTuws = PLATFORM_G7G_TUW_COVERAGE.filter((tuwId) => !descriptorTuws.has(tuwId));
  const blockedDescriptors = descriptors.filter((descriptor) => descriptor?.outcome === "blocked");
  const humanDispositionRequired =
    request.human_readiness_disposition_required === true && Boolean(request.human_disposition_tracker_ref);
  const readinessPacketPresent = Boolean(request.readiness_review_packet_ref);
  const findingsRegisterPresent = Boolean(request.unresolved_findings_register_ref);
  const waiverRegisterPresent = Boolean(request.waiver_register_ref);
  const blockedClaims = [];

  if (request.g7f_handoff_validated !== true) {
    blockedClaims.push("release_readiness_requires_g7f_handoff");
  }
  if (request.rp27_contract_validated !== true) {
    blockedClaims.push("release_readiness_requires_rp27_contract_validation");
  }
  if (request.rp29_contract_validated !== true) {
    blockedClaims.push("release_readiness_requires_rp29_contract_validation");
  }
  if (missingTuws.length > 0) blockedClaims.push("release_readiness_tuw_coverage_required");
  if (blockedDescriptors.length > 0) blockedClaims.push("release_readiness_blocked_descriptor_present");
  if (!readinessPacketPresent) blockedClaims.push("release_readiness_review_packet_required");
  if (!findingsRegisterPresent) blockedClaims.push("release_readiness_unresolved_findings_register_required");
  if (!waiverRegisterPresent) blockedClaims.push("release_readiness_waiver_register_required");
  if (!humanDispositionRequired) blockedClaims.push("release_readiness_human_disposition_required");
  if (request.claims_g7_approval === true) blockedClaims.push("release_readiness_g7_approval_claim_blocked");
  if (request.claims_security_approval === true) blockedClaims.push("release_readiness_security_approval_claim_blocked");
  if (request.claims_uat_completion === true) blockedClaims.push("release_readiness_uat_completion_claim_blocked");
  if (request.claims_production_readiness === true) {
    blockedClaims.push("release_readiness_production_readiness_claim_blocked");
  }
  if (request.claims_go_live_approval === true) blockedClaims.push("release_readiness_go_live_claim_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W15-T012"),
    descriptor_type: "platform_g7g_release_readiness_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    tuw_coverage: PLATFORM_G7G_TUW_COVERAGE,
    missing_tuws: freezeArray(missingTuws),
    closeout_receipt: freezeRecord({
      g7f_handoff_validated: request.g7f_handoff_validated === true,
      rp27_contract_validated: request.rp27_contract_validated === true,
      rp29_contract_validated: request.rp29_contract_validated === true,
      state_transition_tests_required: true,
      security_regression_required: true,
      performance_smoke_required: true,
      backup_restore_drill_required: true,
      uat_script_package_required: true,
      readiness_review_packet_present: readinessPacketPresent,
      unresolved_findings_register_present: findingsRegisterPresent,
      waiver_register_present: waiverRegisterPresent,
      human_readiness_disposition_required: humanDispositionRequired,
      g7_approval_claimed: false,
      security_approval_claimed: false,
      uat_completion_claimed: false,
      runtime_readiness_claim: "open",
      production_readiness_claim: "open",
      go_live_approval_claimed: false,
    }),
  });
}
