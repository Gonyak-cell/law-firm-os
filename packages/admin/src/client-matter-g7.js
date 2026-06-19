export const ADMIN_G7A_TUW_COVERAGE = Object.freeze([
  "LFOS-G7-W12-T001",
  "LFOS-G7-W12-T002",
  "LFOS-G7-W12-T003",
  "LFOS-G7-W12-T004",
  "LFOS-G7-W12-T005",
]);

export const ADMIN_G7B_TUW_COVERAGE = Object.freeze([
  "LFOS-G7-W12-T006",
  "LFOS-G7-W12-T007",
  "LFOS-G7-W12-T008",
  "LFOS-G7-W12-T009",
  "LFOS-G7-W12-T010",
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
    dispatches_admin_runtime: false,
    dispatches_commercial_runtime: false,
    production_readiness_claim: "open",
    g7_runtime_readiness_claim: "open",
    enterprise_trust_claimed: false,
    go_live_approval_claimed: false,
  };
}

export function createAdminG7TenantAdminSettingsDescriptor(request = {}) {
  const settings = request.settings ?? {};
  const runtimeDispatch = request.dispatched_runtime === true || settings.dispatched_runtime === true;
  const writesState = request.writes_product_state === true || settings.writes_product_state === true;
  const permissionTested = settings.permission_checked === true && ["tenant_admin", "system_admin"].includes(settings.admin_role);
  const tenantScoped = !settings.tenant_id || settings.tenant_id === request.tenant_id;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "actor_id", "settings"], request).length > 0) {
    blockedClaims.push("tenant_admin_settings_required_context_missing");
  }
  if (!settings.settings_id) blockedClaims.push("tenant_admin_settings_id_required");
  if (!tenantScoped) blockedClaims.push("tenant_admin_settings_cross_tenant_blocked");
  if (!permissionTested) blockedClaims.push("tenant_admin_settings_admin_permission_required");
  if (writesState) blockedClaims.push("tenant_admin_settings_product_write_blocked");
  if (runtimeDispatch) blockedClaims.push("tenant_admin_settings_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W12-T001"),
    descriptor_type: "admin_g7_tenant_admin_settings_descriptor",
    tenant_id: request.tenant_id ?? settings.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    settings_id: settings.settings_id ?? null,
    changed_field_count: freezeArray(settings.changed_fields).length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    tenant_admin_settings_receipt: freezeRecord({
      admin_permission_tested: permissionTested,
      tenant_scope_tested: tenantScoped,
      settings_persisted: false,
      product_state_written: writesState,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createAdminG7PlanUsageModelDescriptor(request = {}) {
  const planUsage = request.plan_usage ?? {};
  const runtimeDispatch = request.dispatched_runtime === true || planUsage.dispatched_runtime === true;
  const directBillingWrite = request.direct_billing_write === true || planUsage.direct_billing_write === true;
  const tenantScoped = !planUsage.tenant_id || planUsage.tenant_id === request.tenant_id;
  const planChangeAudited = Boolean(planUsage.change_audit_ref);
  const billingWorkflowReviewed = Boolean(planUsage.billing_workflow_ref) && directBillingWrite !== true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "actor_id", "plan_usage"], request).length > 0) {
    blockedClaims.push("plan_usage_required_context_missing");
  }
  if (!planUsage.plan_id || !planUsage.usage_period_id) blockedClaims.push("plan_usage_model_identifier_required");
  if (!tenantScoped) blockedClaims.push("plan_usage_cross_tenant_blocked");
  if (!planChangeAudited) blockedClaims.push("plan_usage_change_audit_required");
  if (!billingWorkflowReviewed) blockedClaims.push("plan_usage_billing_workflow_review_required");
  if (directBillingWrite) blockedClaims.push("plan_usage_direct_billing_write_blocked");
  if (runtimeDispatch) blockedClaims.push("plan_usage_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W12-T002"),
    descriptor_type: "admin_g7_plan_usage_model_descriptor",
    tenant_id: request.tenant_id ?? planUsage.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    plan_id: planUsage.plan_id ?? null,
    usage_period_id: planUsage.usage_period_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    plan_usage_receipt: freezeRecord({
      plan_change_audit_tested: planChangeAudited,
      billing_workflow_review_required: billingWorkflowReviewed,
      billing_state_mutated: false,
      direct_billing_write_attempted: directBillingWrite,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createAdminG7AAdminOpsFoundationCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const missingTuws = ADMIN_G7A_TUW_COVERAGE.filter((tuwId) => !descriptorTuws.has(tuwId));
  const blockedDescriptors = descriptors.filter((descriptor) => descriptor?.outcome === "blocked");
  const blockedClaims = [];

  if (request.g7_entry_plan_validated !== true) blockedClaims.push("g7_admin_ops_requires_g7_entry_plan_handoff");
  if (request.g6_handoff_validated !== true) blockedClaims.push("g7_admin_ops_requires_g6_closeout_handoff");
  if (missingTuws.length > 0) blockedClaims.push("g7_admin_ops_foundation_tuw_coverage_required");
  if (blockedDescriptors.length > 0) blockedClaims.push("g7_admin_ops_foundation_blocked_descriptor_present");
  if (request.claims_enterprise_trust === true) blockedClaims.push("g7_admin_ops_enterprise_trust_claim_blocked");
  if (request.claims_go_live_approval === true) blockedClaims.push("g7_admin_ops_go_live_claim_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W12-T005"),
    descriptor_type: "admin_g7a_admin_ops_foundation_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    tuw_coverage: ADMIN_G7A_TUW_COVERAGE,
    missing_tuws: freezeArray(missingTuws),
    closeout_receipt: freezeRecord({
      g7_entry_plan_validated: request.g7_entry_plan_validated === true,
      g6_handoff_validated: request.g6_handoff_validated === true,
      admin_permission_evidence_required: true,
      observability_incident_release_evidence_required: true,
      runtime_readiness_claim: "open",
      enterprise_trust_claimed: false,
      go_live_approval_claimed: false,
    }),
  });
}

export function createAdminG7AdminAuditViewerDescriptor(request = {}) {
  const auditViewer = request.audit_viewer ?? {};
  const query = auditViewer.query ?? request.query ?? {};
  const runtimeDispatch = request.dispatched_runtime === true || auditViewer.dispatched_runtime === true;
  const tenantScoped = query.tenant_id === request.tenant_id && auditViewer.tenant_scoped === true;
  const exposesUnauthorizedRows = auditViewer.exposes_unauthorized_admin_rows === true || request.exposes_unauthorized_admin_rows === true;
  const exposesHiddenPolicyInternals = auditViewer.exposes_hidden_policy_internals === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "actor_id", "audit_viewer"], request).length > 0) {
    blockedClaims.push("admin_audit_viewer_required_context_missing");
  }
  if (!auditViewer.viewer_id) blockedClaims.push("admin_audit_viewer_id_required");
  if (!tenantScoped) blockedClaims.push("admin_audit_viewer_tenant_scoped_query_required");
  if (exposesUnauthorizedRows) blockedClaims.push("admin_audit_viewer_unauthorized_rows_blocked");
  if (exposesHiddenPolicyInternals) blockedClaims.push("admin_audit_viewer_hidden_policy_internals_blocked");
  if (runtimeDispatch) blockedClaims.push("admin_audit_viewer_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W12-T008"),
    descriptor_type: "admin_g7_admin_audit_viewer_descriptor",
    tenant_id: request.tenant_id ?? query.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    viewer_id: auditViewer.viewer_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    admin_audit_viewer_receipt: freezeRecord({
      tenant_scoped_query_tested: tenantScoped,
      unauthorized_rows_omitted: !exposesUnauthorizedRows,
      hidden_policy_internals_omitted: !exposesHiddenPolicyInternals,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createAdminG7OperationsDashboardDescriptor(request = {}) {
  const dashboard = request.operations_dashboard ?? {};
  const widgets = freezeArray(dashboard.widgets ?? request.widgets);
  const runtimeDispatch = request.dispatched_runtime === true || dashboard.dispatched_runtime === true;
  const customerDataLeak = dashboard.customer_data_leak === true || request.customer_data_leak === true;
  const unauthorizedCountLeak = dashboard.unauthorized_count_leak === true;
  const tenantScoped = dashboard.tenant_scoped === true && (!dashboard.tenant_id || dashboard.tenant_id === request.tenant_id);
  const redactedWidgets = widgets.length > 0 && widgets.every((widget) => widget?.customer_payload_included !== true && widget?.redacted === true);
  const blockedClaims = [];

  if (missingFields(["tenant_id", "actor_id", "operations_dashboard"], request).length > 0) {
    blockedClaims.push("operations_dashboard_required_context_missing");
  }
  if (!dashboard.dashboard_id) blockedClaims.push("operations_dashboard_id_required");
  if (!tenantScoped) blockedClaims.push("operations_dashboard_tenant_scope_required");
  if (!redactedWidgets || customerDataLeak) blockedClaims.push("operations_dashboard_customer_data_leak_blocked");
  if (unauthorizedCountLeak) blockedClaims.push("operations_dashboard_unauthorized_count_leak_blocked");
  if (runtimeDispatch) blockedClaims.push("operations_dashboard_runtime_dispatch_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W12-T009"),
    descriptor_type: "admin_g7_operations_dashboard_descriptor",
    tenant_id: request.tenant_id ?? dashboard.tenant_id ?? null,
    actor_id: request.actor_id ?? null,
    dashboard_id: dashboard.dashboard_id ?? null,
    widget_count: widgets.length,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    operations_dashboard_receipt: freezeRecord({
      tenant_scope_tested: tenantScoped,
      no_customer_data_leak_tested: redactedWidgets && !customerDataLeak,
      unauthorized_count_leak_blocked: unauthorizedCountLeak,
      runtime_dispatched: runtimeDispatch,
    }),
  });
}

export function createAdminG7BOpsCommercialCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const missingTuws = ADMIN_G7B_TUW_COVERAGE.filter((tuwId) => !descriptorTuws.has(tuwId));
  const blockedDescriptors = descriptors.filter((descriptor) => descriptor?.outcome === "blocked");
  const blockedClaims = [];

  if (request.g7a_handoff_validated !== true) blockedClaims.push("g7_ops_closeout_requires_g7a_handoff");
  if (request.g7_entry_plan_validated !== true) blockedClaims.push("g7_ops_closeout_requires_g7_entry_plan_handoff");
  if (missingTuws.length > 0) blockedClaims.push("g7_ops_closeout_tuw_coverage_required");
  if (blockedDescriptors.length > 0) blockedClaims.push("g7_ops_closeout_blocked_descriptor_present");
  if (request.claims_release_readiness === true) blockedClaims.push("g7_ops_closeout_release_readiness_claim_blocked");
  if (request.claims_go_live_approval === true) blockedClaims.push("g7_ops_closeout_go_live_claim_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W12-T010"),
    descriptor_type: "admin_g7b_ops_commercial_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    tuw_coverage: ADMIN_G7B_TUW_COVERAGE,
    missing_tuws: freezeArray(missingTuws),
    closeout_receipt: freezeRecord({
      g7a_handoff_validated: request.g7a_handoff_validated === true,
      deployment_rollback_evidence_required: true,
      compliance_evidence_checklist_required: true,
      tenant_scoped_admin_audit_required: true,
      no_customer_data_leak_required: true,
      release_readiness_evidence_required: true,
      runtime_readiness_claim: "open",
      release_readiness_claim: "open",
      go_live_approval_claimed: false,
    }),
  });
}
