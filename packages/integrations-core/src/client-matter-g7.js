export const INTEGRATIONS_G7D_TUW_COVERAGE = Object.freeze([
  "LFOS-G7-W14-T001",
  "LFOS-G7-W14-T002",
  "LFOS-G7-W14-T003",
  "LFOS-G7-W14-T004",
  "LFOS-G7-W14-T005",
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
    reads_object_storage: false,
    writes_object_storage: false,
    calls_external_provider_api: false,
    opens_oauth_browser_flow: false,
    persists_access_token: false,
    persists_refresh_token: false,
    stores_secret_material: false,
    executes_sync_runtime: false,
    executes_migration_runtime: false,
    evaluates_runtime_permission: false,
    writes_permission_decision: false,
    writes_audit_event: false,
    appends_audit_event: false,
    executes_api_handler: false,
    executes_ui_runtime: false,
    includes_raw_external_payload: false,
    includes_credential_value: false,
    includes_secret_value: false,
    production_readiness_claim: "open",
    g7_runtime_readiness_claim: "open",
    enterprise_trust_claimed: false,
    go_live_approval_claimed: false,
  };
}

export function createIntegrationsG7ConnectorRegistryDescriptor(request = {}) {
  const connector = request.connector_registry ?? {};
  const tenantScoped = connector.tenant_id === request.tenant_id && Boolean(connector.matter_scope_ref);
  const permissionReviewed = Boolean(connector.permission_decision_ref) && connector.permission_scope_reviewed === true;
  const credentialExposure = connector.credential_value_included === true || request.credential_value_included === true;
  const providerRuntime = connector.calls_external_provider_api === true || request.calls_external_provider_api === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "connector_registry"], request).length > 0) {
    blockedClaims.push("connector_registry_required_context_missing");
  }
  if (!connector.connection_id || !connector.provider) blockedClaims.push("connector_registry_identity_required");
  if (!tenantScoped) blockedClaims.push("connector_registry_tenant_matter_scope_required");
  if (!permissionReviewed) blockedClaims.push("connector_registry_permission_scope_review_required");
  if (credentialExposure) blockedClaims.push("connector_registry_credential_exposure_blocked");
  if (providerRuntime) blockedClaims.push("connector_registry_provider_runtime_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W14-T001"),
    descriptor_type: "integrations_g7_connector_registry_descriptor",
    tenant_id: request.tenant_id ?? connector.tenant_id ?? null,
    connection_id: connector.connection_id ?? null,
    provider: connector.provider ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    connector_registry_receipt: freezeRecord({
      tenant_matter_scope_tested: tenantScoped,
      permission_scope_reviewed: permissionReviewed,
      credential_exposure_blocked: credentialExposure,
      provider_runtime_called: providerRuntime,
    }),
  });
}

export function createIntegrationsG7CredentialReferenceDescriptor(request = {}) {
  const credential = request.credential_ref ?? {};
  const secretRefOnly = Boolean(credential.secret_storage_ref) && credential.secret_value_returned !== true && credential.token_value_returned !== true;
  const rotationReviewed = Boolean(credential.rotation_status) && Boolean(credential.last_reviewed_at);
  const secretMaterialIncluded = credential.secret_value_included === true || credential.token_value_included === true || request.secret_value_included === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "credential_ref"], request).length > 0) {
    blockedClaims.push("credential_reference_required_context_missing");
  }
  if (!credential.credential_ref_id || !credential.connection_id) blockedClaims.push("credential_reference_identity_required");
  if (!secretRefOnly) blockedClaims.push("credential_reference_secret_not_returned_required");
  if (!rotationReviewed) blockedClaims.push("credential_reference_rotation_review_required");
  if (secretMaterialIncluded) blockedClaims.push("credential_reference_secret_material_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W14-T002"),
    descriptor_type: "integrations_g7_credential_reference_descriptor",
    tenant_id: request.tenant_id ?? credential.tenant_id ?? null,
    credential_ref_id: credential.credential_ref_id ?? null,
    connection_id: credential.connection_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    credential_reference_receipt: freezeRecord({
      secret_ref_only_tested: secretRefOnly,
      secret_value_returned: credential.secret_value_returned === true,
      token_value_returned: credential.token_value_returned === true,
      rotation_reviewed: rotationReviewed,
      secret_material_included: secretMaterialIncluded,
    }),
  });
}

export function createIntegrationsG7SyncJobDescriptor(request = {}) {
  const syncJob = request.sync_job ?? {};
  const retryPolicyPresent = Boolean(syncJob.retry_policy_ref) && syncJob.retry_attempt_limit > 0;
  const idempotencyTested = Boolean(syncJob.idempotency_key) && syncJob.duplicate_command_safe === true;
  const providerRuntime = syncJob.calls_external_provider_api === true || request.calls_external_provider_api === true;
  const writesState = syncJob.writes_product_state === true || request.writes_product_state === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "sync_job"], request).length > 0) {
    blockedClaims.push("sync_job_required_context_missing");
  }
  if (!syncJob.sync_job_id || !syncJob.connection_id) blockedClaims.push("sync_job_identity_required");
  if (!retryPolicyPresent) blockedClaims.push("sync_job_retry_policy_required");
  if (!idempotencyTested) blockedClaims.push("sync_job_idempotency_required");
  if (providerRuntime) blockedClaims.push("sync_job_provider_runtime_blocked");
  if (writesState) blockedClaims.push("sync_job_product_state_write_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W14-T003"),
    descriptor_type: "integrations_g7_sync_job_descriptor",
    tenant_id: request.tenant_id ?? syncJob.tenant_id ?? null,
    sync_job_id: syncJob.sync_job_id ?? null,
    connection_id: syncJob.connection_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    sync_job_receipt: freezeRecord({
      retry_policy_tested: retryPolicyPresent,
      idempotency_tested: idempotencyTested,
      provider_runtime_called: providerRuntime,
      product_state_written: writesState,
    }),
  });
}

export function createIntegrationsG7SyncCursorDescriptor(request = {}) {
  const cursor = request.sync_cursor ?? {};
  const resumable = Boolean(cursor.previous_cursor_ref) && Boolean(cursor.resume_token_ref) && cursor.resumable_sync_tested === true;
  const cursorValueExposed = cursor.cursor_value_returned === true || cursor.raw_cursor_included === true || request.cursor_value_returned === true;
  const runtimeAdvanced = cursor.runtime_advanced === true || request.runtime_advanced === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "sync_cursor"], request).length > 0) {
    blockedClaims.push("sync_cursor_required_context_missing");
  }
  if (!cursor.cursor_id || !cursor.sync_job_id) blockedClaims.push("sync_cursor_identity_required");
  if (!resumable) blockedClaims.push("sync_cursor_resumable_sync_required");
  if (cursorValueExposed) blockedClaims.push("sync_cursor_value_exposure_blocked");
  if (runtimeAdvanced) blockedClaims.push("sync_cursor_runtime_advance_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W14-T004"),
    descriptor_type: "integrations_g7_sync_cursor_descriptor",
    tenant_id: request.tenant_id ?? cursor.tenant_id ?? null,
    cursor_id: cursor.cursor_id ?? null,
    sync_job_id: cursor.sync_job_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    sync_cursor_receipt: freezeRecord({
      resumable_sync_tested: resumable,
      cursor_value_returned: cursorValueExposed,
      runtime_advanced: runtimeAdvanced,
    }),
  });
}

export function createIntegrationsG7ReconciliationRunDescriptor(request = {}) {
  const reconciliation = request.reconciliation_run ?? {};
  const mismatchReportPresent = Boolean(reconciliation.mismatch_report_ref) && reconciliation.mismatch_report_tested === true;
  const humanReviewRequired = reconciliation.human_review_required === true;
  const autoResolvedMismatch = reconciliation.auto_resolved_mismatch === true || request.auto_resolved_mismatch === true;
  const writesState = reconciliation.writes_product_state === true || request.writes_product_state === true;
  const blockedClaims = [];

  if (missingFields(["tenant_id", "reconciliation_run"], request).length > 0) {
    blockedClaims.push("reconciliation_run_required_context_missing");
  }
  if (!reconciliation.reconciliation_run_id || !reconciliation.connection_id) blockedClaims.push("reconciliation_run_identity_required");
  if (!mismatchReportPresent) blockedClaims.push("reconciliation_run_mismatch_report_required");
  if (!humanReviewRequired) blockedClaims.push("reconciliation_run_human_review_required");
  if (autoResolvedMismatch) blockedClaims.push("reconciliation_run_auto_resolve_blocked");
  if (writesState) blockedClaims.push("reconciliation_run_product_state_write_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W14-T005"),
    descriptor_type: "integrations_g7_reconciliation_run_descriptor",
    tenant_id: request.tenant_id ?? reconciliation.tenant_id ?? null,
    reconciliation_run_id: reconciliation.reconciliation_run_id ?? null,
    connection_id: reconciliation.connection_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    reconciliation_run_receipt: freezeRecord({
      mismatch_report_tested: mismatchReportPresent,
      human_review_required: humanReviewRequired,
      auto_resolved_mismatch: autoResolvedMismatch,
      product_state_written: writesState,
    }),
  });
}

export function createIntegrationsG7DIntegrationMigrationFoundationCloseoutDescriptor(request = {}) {
  const descriptors = freezeArray(request.descriptors);
  const descriptorTuws = new Set(descriptors.map((descriptor) => descriptor?.tuw_id));
  const missingTuws = INTEGRATIONS_G7D_TUW_COVERAGE.filter((tuwId) => !descriptorTuws.has(tuwId));
  const blockedDescriptors = descriptors.filter((descriptor) => descriptor?.outcome === "blocked");
  const blockedClaims = [];

  if (request.g7c_handoff_validated !== true) blockedClaims.push("integration_migration_foundation_requires_g7c_handoff");
  if (request.rp22_contract_validated !== true) blockedClaims.push("integration_migration_foundation_requires_rp22_contract_validation");
  if (request.rp25_contract_validated !== true) blockedClaims.push("integration_migration_foundation_requires_rp25_contract_validation");
  if (missingTuws.length > 0) blockedClaims.push("integration_migration_foundation_tuw_coverage_required");
  if (blockedDescriptors.length > 0) blockedClaims.push("integration_migration_foundation_blocked_descriptor_present");
  if (request.claims_runtime_readiness === true) blockedClaims.push("integration_migration_foundation_runtime_readiness_claim_blocked");
  if (request.claims_go_live_approval === true) blockedClaims.push("integration_migration_foundation_go_live_claim_blocked");

  return freezeRecord({
    ...noRuntimeBoundary("LFOS-G7-W14-T005"),
    descriptor_type: "integrations_g7d_integration_migration_foundation_closeout_descriptor",
    tenant_id: request.tenant_id ?? null,
    outcome: outcomeFor(blockedClaims),
    blocked_claims: freezeArray(blockedClaims),
    tuw_coverage: INTEGRATIONS_G7D_TUW_COVERAGE,
    missing_tuws: freezeArray(missingTuws),
    closeout_receipt: freezeRecord({
      g7c_handoff_validated: request.g7c_handoff_validated === true,
      rp22_contract_validated: request.rp22_contract_validated === true,
      rp25_contract_validated: request.rp25_contract_validated === true,
      connector_registry_required: true,
      credential_secret_not_returned_required: true,
      sync_idempotency_required: true,
      cursor_resumability_required: true,
      mismatch_report_required: true,
      runtime_readiness_claim: "open",
      enterprise_trust_claimed: false,
      go_live_approval_claimed: false,
    }),
  });
}
