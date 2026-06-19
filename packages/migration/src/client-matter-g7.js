export const MIGRATION_G7E_TUW_COVERAGE = Object.freeze([
  "LFOS-G7-W14-T006",
  "LFOS-G7-W14-T007",
  "LFOS-G7-W14-T008",
  "LFOS-G7-W14-T009",
  "LFOS-G7-W14-T010",
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
    imports_records: false,
    executes_import_runtime: false,
    executes_migration_runtime: false,
    executes_accounting_export_runtime: false,
    calls_external_provider_api: false,
    calls_external_accounting_api: false,
    sends_accounting_export_payload: false,
    reads_object_storage: false,
    writes_object_storage: false,
    evaluates_runtime_permission: false,
    writes_permission_decision: false,
    writes_audit_event: false,
    appends_audit_event: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    includes_raw_source_payload: false,
    includes_customer_data_payload: false,
    includes_credential_value: false,
    includes_secret_value: false,
    applies_cutover: false,
    rollback_executed: false,
    cutover_approval_claimed: false,
    production_readiness_claim: "open",
    g7_runtime_readiness_claim: "open",
    cutover_readiness_claim: "open",
    enterprise_trust_claimed: false,
    go_live_approval_claimed: false,
  };
}

export function createMigrationG7MigrationBatchDescriptor(request = {}) {
  const batch = request.migration_batch ?? {};
  const importAuditTested = Boolean(batch.import_audit_ref) && batch.import_audit_tested === true;
  const sourceLineageTested = Boolean(batch.source_manifest_ref) && Boolean(batch.source_lineage_ref);
  const dryRunOnly = batch.dry_run_only === true && batch.import_execution_started !== true;
  const runtimeExecuted = batch.executes_migration_runtime === true || request.executes_migration_runtime === true || batch.import_execution_started === true;
  const writesState = batch.writes_product_state === true || request.writes_product_state === true || batch.imports_records === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "migration_batch"], request).length > 0) {
    blockedClaims.push("migration_batch_required_context_missing");
  }
  if (!batch.migration_batch_id || !batch.source_system) blockedClaims.push("migration_batch_identity_required");
  if (!importAuditTested) blockedClaims.push("migration_batch_import_audit_required");
  if (!sourceLineageTested) blockedClaims.push("migration_batch_source_lineage_required");
  if (!dryRunOnly) blockedClaims.push("migration_batch_dry_run_only_required");
  if (runtimeExecuted) blockedClaims.push("migration_batch_runtime_execution_blocked");
  if (writesState) blockedClaims.push("migration_batch_product_state_write_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W14-T006"),
    descriptor_type: "migration_g7_migration_batch_descriptor",
    tenant_id: request.tenant_id ?? batch.tenant_id ?? null,
    migration_batch_id: batch.migration_batch_id ?? null,
    source_system: batch.source_system ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    migration_batch_receipt: freezeRecord({
      import_audit_tested: importAuditTested,
      source_lineage_tested: sourceLineageTested,
      dry_run_only: dryRunOnly,
      migration_runtime_executed: runtimeExecuted,
      product_state_written: writesState,
    }),
  });
}

export function createMigrationG7ImportValidationFrameworkDescriptor(request = {}) {
  const validation = request.import_validation ?? {};
  const duplicatePartyDetection = Boolean(validation.duplicate_party_candidates_ref) && validation.duplicate_party_detection_tested === true;
  const failedRowReport = Boolean(validation.failed_row_report_ref) && validation.schema_validation_tested === true;
  const humanReviewRequired = validation.human_review_required === true && Boolean(validation.review_queue_ref);
  const autoMerge = validation.auto_merge_duplicate_party === true || request.auto_merge_duplicate_party === true;
  const crossTenantMatch = validation.cross_tenant_match_allowed === true || request.cross_tenant_match_allowed === true;
  const writesState = validation.writes_product_state === true || request.writes_product_state === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "import_validation"], request).length > 0) {
    blockedClaims.push("import_validation_required_context_missing");
  }
  if (!validation.validation_run_id || !validation.migration_batch_id) blockedClaims.push("import_validation_identity_required");
  if (!duplicatePartyDetection) blockedClaims.push("import_validation_duplicate_party_detection_required");
  if (!failedRowReport) blockedClaims.push("import_validation_failed_row_report_required");
  if (!humanReviewRequired) blockedClaims.push("import_validation_human_review_required");
  if (autoMerge) blockedClaims.push("import_validation_auto_merge_blocked");
  if (crossTenantMatch) blockedClaims.push("import_validation_cross_tenant_match_blocked");
  if (writesState) blockedClaims.push("import_validation_product_state_write_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W14-T007"),
    descriptor_type: "migration_g7_import_validation_framework_descriptor",
    tenant_id: request.tenant_id ?? validation.tenant_id ?? null,
    validation_run_id: validation.validation_run_id ?? null,
    migration_batch_id: validation.migration_batch_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    import_validation_receipt: freezeRecord({
      duplicate_party_detection_tested: duplicatePartyDetection,
      failed_row_report_tested: failedRowReport,
      human_review_required: humanReviewRequired,
      auto_merge_duplicate_party: autoMerge,
      cross_tenant_match_allowed: crossTenantMatch,
      product_state_written: writesState,
    }),
  });
}

export function createMigrationG7AccountingConnectorExportDescriptor(request = {}) {
  const accountingExport = request.accounting_export ?? {};
  const provider = String(accountingExport.provider ?? "").toLowerCase();
  const providerAllowed = provider === "wehago" || provider === "douzone";
  const previewGenerated = Boolean(accountingExport.preview_payload_ref) && accountingExport.preview_generated === true;
  const humanReviewBeforeExport = accountingExport.human_review_required === true && Boolean(accountingExport.review_approval_ref);
  const externalSend = accountingExport.export_payload_sent === true || accountingExport.calls_external_accounting_api === true || request.calls_external_accounting_api === true;
  const secretExposure = accountingExport.credential_value_included === true || accountingExport.secret_value_included === true || request.secret_value_included === true;
  const writesState = accountingExport.writes_product_state === true || request.writes_product_state === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "accounting_export"], request).length > 0) {
    blockedClaims.push("accounting_export_required_context_missing");
  }
  if (!accountingExport.accounting_export_id || !accountingExport.migration_batch_id) blockedClaims.push("accounting_export_identity_required");
  if (!providerAllowed) blockedClaims.push("accounting_export_provider_required");
  if (!previewGenerated) blockedClaims.push("accounting_export_preview_required");
  if (!humanReviewBeforeExport) blockedClaims.push("accounting_export_human_review_required");
  if (externalSend) blockedClaims.push("accounting_export_external_send_blocked");
  if (secretExposure) blockedClaims.push("accounting_export_secret_exposure_blocked");
  if (writesState) blockedClaims.push("accounting_export_product_state_write_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W14-T008"),
    descriptor_type: "migration_g7_accounting_connector_export_descriptor",
    tenant_id: request.tenant_id ?? accountingExport.tenant_id ?? null,
    accounting_export_id: accountingExport.accounting_export_id ?? null,
    provider: accountingExport.provider ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    accounting_export_receipt: freezeRecord({
      provider_allowed: providerAllowed,
      preview_generated: previewGenerated,
      human_review_before_export: humanReviewBeforeExport,
      external_send_attempted: externalSend,
      secret_exposure_detected: secretExposure,
      product_state_written: writesState,
    }),
  });
}

export function createMigrationG7DashboardDescriptor(request = {}) {
  const dashboard = request.migration_dashboard ?? {};
  const tenantScopedQuery = dashboard.tenant_id === request.tenant_id && dashboard.tenant_scoped_query === true;
  const failedRowReview = Boolean(dashboard.failed_row_queue_ref) && dashboard.failed_row_review_tested === true;
  const permissionScopeReviewed = Boolean(dashboard.permission_scope_ref) && dashboard.permission_scope_reviewed === true;
  const rawPayloadExposure = dashboard.includes_raw_source_payload === true || request.includes_raw_source_payload === true;
  const customerDataLeak = dashboard.customer_data_leak_detected === true || request.customer_data_leak_detected === true;
  const uiRuntime = dashboard.executes_ui_runtime === true || request.executes_ui_runtime === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "migration_dashboard"], request).length > 0) {
    blockedClaims.push("migration_dashboard_required_context_missing");
  }
  if (!dashboard.dashboard_id) blockedClaims.push("migration_dashboard_identity_required");
  if (!tenantScopedQuery) blockedClaims.push("migration_dashboard_tenant_scoped_query_required");
  if (!failedRowReview) blockedClaims.push("migration_dashboard_failed_row_review_required");
  if (!permissionScopeReviewed) blockedClaims.push("migration_dashboard_permission_scope_required");
  if (rawPayloadExposure) blockedClaims.push("migration_dashboard_raw_payload_exposure_blocked");
  if (customerDataLeak) blockedClaims.push("migration_dashboard_customer_data_leak_blocked");
  if (uiRuntime) blockedClaims.push("migration_dashboard_ui_runtime_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W14-T009"),
    descriptor_type: "migration_g7_dashboard_descriptor",
    tenant_id: request.tenant_id ?? dashboard.tenant_id ?? null,
    dashboard_id: dashboard.dashboard_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    migration_dashboard_receipt: freezeRecord({
      tenant_scoped_query_tested: tenantScopedQuery,
      failed_row_review_tested: failedRowReview,
      permission_scope_reviewed: permissionScopeReviewed,
      raw_payload_exposed: rawPayloadExposure,
      customer_data_leak_detected: customerDataLeak,
      ui_runtime_executed: uiRuntime,
    }),
  });
}

export function createMigrationG7ECutoverCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const missingTuws = MIGRATION_G7E_TUW_COVERAGE.filter((tuwId) => !descriptorTuws.has(tuwId));
  const blockedDescriptors = descriptors.filter((descriptor) => descriptor?.outcome === "blocked");
  const cutoverEvidenceRecorded =
    Boolean(request.cutover_readiness_evidence_ref) &&
    request.cutover_rehearsal_completed === true &&
    Boolean(request.rollback_plan_ref) &&
    request.human_cutover_review_required === true;
  const blockedClaims = [];

  if (request.g7d_handoff_validated !== true) blockedClaims.push("migration_cutover_requires_g7d_handoff");
  if (request.rp23_contract_validated !== true) blockedClaims.push("migration_cutover_requires_rp23_contract_validation");
  if (request.rp25_contract_validated !== true) blockedClaims.push("migration_cutover_requires_rp25_contract_validation");
  if (missingTuws.length > 0) blockedClaims.push("migration_cutover_tuw_coverage_required");
  if (blockedDescriptors.length > 0) blockedClaims.push("migration_cutover_blocked_descriptor_present");
  if (!cutoverEvidenceRecorded) blockedClaims.push("migration_cutover_closeout_evidence_required");
  if (request.claims_cutover_approved === true) blockedClaims.push("migration_cutover_approval_claim_blocked");
  if (request.claims_runtime_readiness === true) blockedClaims.push("migration_cutover_runtime_readiness_claim_blocked");
  if (request.claims_go_live_approval === true) blockedClaims.push("migration_cutover_go_live_claim_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W14-T010"),
    descriptor_type: "migration_g7e_cutover_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    tuw_coverage: MIGRATION_G7E_TUW_COVERAGE,
    missing_tuws: freezeArray(missingTuws),
    closeout_receipt: freezeRecord({
      g7d_handoff_validated: request.g7d_handoff_validated === true,
      rp23_contract_validated: request.rp23_contract_validated === true,
      rp25_contract_validated: request.rp25_contract_validated === true,
      import_audit_required: true,
      duplicate_party_detection_required: true,
      human_review_before_export_required: true,
      failed_row_review_required: true,
      cutover_readiness_evidence_recorded: cutoverEvidenceRecorded,
      cutover_approval_claimed: false,
      runtime_readiness_claim: "open",
      production_readiness_claim: "open",
      go_live_approval_claimed: false,
    }),
  });
}
