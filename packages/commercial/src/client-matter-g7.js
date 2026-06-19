export const COMMERCIAL_G7A_TUW_COVERAGE = Object.freeze([
  "LFOS-G7-W12-T003",
  "LFOS-G7-W12-T004",
  "LFOS-G7-W12-T005",
]);

export const COMMERCIAL_G7B_TUW_COVERAGE = Object.freeze([
  "LFOS-G7-W12-T006",
  "LFOS-G7-W12-T007",
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
    evaluates_runtime_permission: false,
    writes_permission_decision: false,
    writes_audit_event: false,
    appends_audit_event: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    dispatches_commercial_runtime: false,
    dispatches_observability_runtime: false,
    dispatches_incident_runtime: false,
    dispatches_release_runtime: false,
    production_readiness_claim: "open",
    g7_runtime_readiness_claim: "open",
    enterprise_trust_claimed: false,
    go_live_approval_claimed: false,
  };
}

export function createCommercialG7ObservabilityBaselineDescriptor(request = {}) {
  const observability = request.observability ?? {};
  const metrics = freezeArray(observability.metric_refs ?? request.metric_refs);
  const runtimeDispatch = request.dispatched_runtime === true || observability.dispatched_runtime === true;
  const customerDataLeak = request.customer_data_leak === true || observability.customer_data_leak === true;
  const routeLatencyDashboardPresent = Boolean(observability.route_latency_dashboard_ref);
  const redactionTested = observability.customer_data_redacted === true && observability.log_redaction === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "observability"], request).length > 0) {
    blockedClaims.push("observability_baseline_required_context_missing");
  }
  if (metrics.length === 0) blockedClaims.push("observability_metric_refs_required");
  if (!routeLatencyDashboardPresent) blockedClaims.push("observability_route_latency_dashboard_required");
  if (!redactionTested || customerDataLeak) blockedClaims.push("observability_customer_data_redaction_required");
  if (runtimeDispatch) blockedClaims.push("observability_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W12-T003"),
    descriptor_type: "commercial_g7_observability_baseline_descriptor",
    tenant_id: request.tenant_id ?? observability.tenant_id ?? null,
    route_latency_dashboard_ref: observability.route_latency_dashboard_ref ?? null,
    metric_count: metrics.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    observability_receipt: freezeRecord({
      metrics_logging_tested: metrics.length > 0,
      route_latency_dashboard_tested: routeLatencyDashboardPresent,
      customer_data_redaction_tested: redactionTested && !customerDataLeak,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createCommercialG7IncidentRunbookDescriptor(request = {}) {
  const runbook = request.incident_runbook ?? {};
  const lifecycleStates = freezeArray(runbook.lifecycle_states);
  const runtimeDispatch = request.dispatched_runtime === true || runbook.dispatched_runtime === true;
  const lifecycleCovered = ["triage", "contained", "resolved"].every((state) => lifecycleStates.includes(state));
  const escalationCovered = Boolean(runbook.owner_role && runbook.escalation_path);
  const customerSafeComms = runbook.customer_safe_comms === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "incident_runbook"], request).length > 0) {
    blockedClaims.push("incident_runbook_required_context_missing");
  }
  if (!runbook.runbook_id) blockedClaims.push("incident_runbook_id_required");
  if (!lifecycleCovered) blockedClaims.push("incident_runbook_lifecycle_required");
  if (!escalationCovered) blockedClaims.push("incident_runbook_escalation_required");
  if (!customerSafeComms) blockedClaims.push("incident_runbook_customer_safe_comms_required");
  if (runtimeDispatch) blockedClaims.push("incident_runbook_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W12-T004"),
    descriptor_type: "commercial_g7_incident_runbook_descriptor",
    tenant_id: request.tenant_id ?? runbook.tenant_id ?? null,
    runbook_id: runbook.runbook_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    incident_runbook_receipt: freezeRecord({
      incident_lifecycle_tested: lifecycleCovered,
      escalation_path_tested: escalationCovered,
      customer_safe_comms_tested: customerSafeComms,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createCommercialG7ReleaseCandidateDescriptor(request = {}) {
  const releaseCandidate = request.release_candidate ?? {};
  const runtimeDispatch = request.dispatched_runtime === true || releaseCandidate.dispatched_runtime === true;
  const approvalRequired = releaseCandidate.approval_required === true && Boolean(releaseCandidate.approval_gate_ref);
  const claimsProductionReady = releaseCandidate.claims_production_ready === true || request.claims_production_ready === true;
  const claimsGoLive = releaseCandidate.claims_go_live_approval === true || request.claims_go_live_approval === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "release_candidate"], request).length > 0) {
    blockedClaims.push("release_candidate_required_context_missing");
  }
  if (!releaseCandidate.release_candidate_id) blockedClaims.push("release_candidate_id_required");
  if (!approvalRequired) blockedClaims.push("release_candidate_approval_required");
  if (claimsProductionReady) blockedClaims.push("release_candidate_production_ready_claim_blocked");
  if (claimsGoLive) blockedClaims.push("release_candidate_go_live_claim_blocked");
  if (runtimeDispatch) blockedClaims.push("release_candidate_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W12-T005"),
    descriptor_type: "commercial_g7_release_candidate_descriptor",
    tenant_id: request.tenant_id ?? releaseCandidate.tenant_id ?? null,
    release_candidate_id: releaseCandidate.release_candidate_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    release_candidate_receipt: freezeRecord({
      approval_required_tested: approvalRequired,
      deployment_blocked_until_approved: releaseCandidate.deployment_blocked_until_approved === true,
      production_readiness_claim: "open",
      go_live_approval_claimed: false,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createCommercialG7DeploymentRunDescriptor(request = {}) {
  const deployment = request.deployment_run ?? {};
  const runtimeDispatch = request.dispatched_runtime === true || deployment.dispatched_runtime === true;
  const deployExecuted = request.deploy_executed === true || deployment.deploy_executed === true;
  const rollbackRecordPresent = Boolean(deployment.rollback_record_ref) && deployment.rollback_tested === true;
  const failedDeployMasked = deployment.failed_deploy_masked === true || request.failed_deploy_masked === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "deployment_run"], request).length > 0) {
    blockedClaims.push("deployment_run_required_context_missing");
  }
  if (!deployment.deployment_run_id) blockedClaims.push("deployment_run_id_required");
  if (!rollbackRecordPresent) blockedClaims.push("deployment_run_rollback_record_required");
  if (failedDeployMasked) blockedClaims.push("deployment_run_failed_deploy_masking_blocked");
  if (deployExecuted) blockedClaims.push("deployment_run_execution_blocked");
  if (runtimeDispatch) blockedClaims.push("deployment_run_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W12-T006"),
    descriptor_type: "commercial_g7_deployment_run_descriptor",
    tenant_id: request.tenant_id ?? deployment.tenant_id ?? null,
    deployment_run_id: deployment.deployment_run_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    deployment_run_receipt: freezeRecord({
      rollback_record_tested: rollbackRecordPresent,
      failed_deploy_masking_blocked: failedDeployMasked,
      deployment_executed: deployExecuted,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createCommercialG7ComplianceReportDescriptor(request = {}) {
  const report = request.compliance_report ?? {};
  const evidenceItems = freezeArray(report.evidence_items ?? request.evidence_items);
  const runtimeDispatch = request.dispatched_runtime === true || report.dispatched_runtime === true;
  const claimsSoc2 = report.claims_soc2_approval === true || request.claims_soc2_approval === true;
  const claimsIsmsp = report.claims_ismsp_approval === true || request.claims_ismsp_approval === true;
  const claimsEnterpriseApproval = report.claims_enterprise_approval === true || request.claims_enterprise_approval === true;
  const evidenceChecklistPresent = evidenceItems.length > 0 && evidenceItems.every((item) => item?.evidence_ref && item?.status);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "compliance_report"], request).length > 0) {
    blockedClaims.push("compliance_report_required_context_missing");
  }
  if (!report.report_id) blockedClaims.push("compliance_report_id_required");
  if (!evidenceChecklistPresent) blockedClaims.push("compliance_report_evidence_checklist_required");
  if (claimsSoc2 || claimsIsmsp) blockedClaims.push("compliance_report_certification_claim_blocked");
  if (claimsEnterpriseApproval) blockedClaims.push("compliance_report_enterprise_approval_claim_blocked");
  if (runtimeDispatch) blockedClaims.push("compliance_report_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W12-T007"),
    descriptor_type: "commercial_g7_compliance_report_descriptor",
    tenant_id: request.tenant_id ?? report.tenant_id ?? null,
    report_id: report.report_id ?? null,
    evidence_item_count: evidenceItems.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    compliance_report_receipt: freezeRecord({
      evidence_checklist_tested: evidenceChecklistPresent,
      soc2_approval_claimed: false,
      ismsp_approval_claimed: false,
      enterprise_approval_claimed: false,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}
