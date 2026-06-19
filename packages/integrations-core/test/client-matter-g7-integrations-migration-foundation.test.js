import assert from "node:assert/strict";
import test from "node:test";

import {
  INTEGRATIONS_G7D_TUW_COVERAGE,
  createIntegrationsG7ConnectorRegistryDescriptor,
  createIntegrationsG7CredentialReferenceDescriptor,
  createIntegrationsG7DIntegrationMigrationFoundationCloseoutDescriptor,
  createIntegrationsG7ReconciliationRunDescriptor,
  createIntegrationsG7SyncCursorDescriptor,
  createIntegrationsG7SyncJobDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g7d_integrations";
const connection_id = "connection_g7d";

test("G7-D connector registry and credential reference block credential exposure", () => {
  const connector = createIntegrationsG7ConnectorRegistryDescriptor({
    tenant_id,
    connector_registry: {
      tenant_id,
      connection_id,
      provider: "microsoft_365",
      matter_scope_ref: "matter_scope_g7d",
      permission_decision_ref: "permission_g7d",
      permission_scope_reviewed: true,
    },
  });
  const credential = createIntegrationsG7CredentialReferenceDescriptor({
    tenant_id,
    credential_ref: {
      credential_ref_id: "credential_g7d",
      connection_id,
      secret_storage_ref: "vault_ref_g7d",
      rotation_status: "reviewed",
      last_reviewed_at: "2026-06-19",
    },
  });

  assert.equal(connector.outcome, "review_required");
  assert.equal(connector.connector_registry_receipt.tenant_matter_scope_tested, true);
  assert.equal(credential.outcome, "review_required");
  assert.equal(credential.credential_reference_receipt.secret_ref_only_tested, true);

  const blocked = createIntegrationsG7CredentialReferenceDescriptor({
    tenant_id,
    credential_ref: {
      credential_ref_id: "credential_bad",
      connection_id,
      secret_storage_ref: "vault_ref_bad",
      secret_value_returned: true,
      token_value_included: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("credential_reference_secret_not_returned_required"));
  assert.ok(blocked.blocked_claims.includes("credential_reference_rotation_review_required"));
  assert.ok(blocked.blocked_claims.includes("credential_reference_secret_material_blocked"));
});

test("G7-D sync job and cursor require idempotency and resumability without runtime", () => {
  const syncJob = createIntegrationsG7SyncJobDescriptor({
    tenant_id,
    sync_job: {
      sync_job_id: "sync_job_g7d",
      connection_id,
      retry_policy_ref: "retry_policy_g7d",
      retry_attempt_limit: 3,
      idempotency_key: "idempotency_g7d",
      duplicate_command_safe: true,
    },
  });
  const cursor = createIntegrationsG7SyncCursorDescriptor({
    tenant_id,
    sync_cursor: {
      cursor_id: "cursor_g7d",
      sync_job_id: "sync_job_g7d",
      previous_cursor_ref: "cursor_previous_g7d",
      resume_token_ref: "resume_ref_g7d",
      resumable_sync_tested: true,
    },
  });

  assert.equal(syncJob.sync_job_receipt.retry_policy_tested, true);
  assert.equal(syncJob.sync_job_receipt.idempotency_tested, true);
  assert.equal(cursor.sync_cursor_receipt.resumable_sync_tested, true);

  const blocked = createIntegrationsG7SyncCursorDescriptor({
    tenant_id,
    sync_cursor: {
      cursor_id: "cursor_bad",
      sync_job_id: "sync_job_bad",
      cursor_value_returned: true,
      runtime_advanced: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("sync_cursor_resumable_sync_required"));
  assert.ok(blocked.blocked_claims.includes("sync_cursor_value_exposure_blocked"));
  assert.ok(blocked.blocked_claims.includes("sync_cursor_runtime_advance_blocked"));
});

test("G7-D reconciliation run requires mismatch report and human review", () => {
  const reconciliation = createIntegrationsG7ReconciliationRunDescriptor({
    tenant_id,
    reconciliation_run: {
      reconciliation_run_id: "reconciliation_g7d",
      connection_id,
      mismatch_report_ref: "mismatch_report_g7d",
      mismatch_report_tested: true,
      human_review_required: true,
    },
  });

  assert.equal(reconciliation.outcome, "review_required");
  assert.equal(reconciliation.reconciliation_run_receipt.mismatch_report_tested, true);
  assert.equal(reconciliation.reconciliation_run_receipt.human_review_required, true);

  const blocked = createIntegrationsG7ReconciliationRunDescriptor({
    tenant_id,
    reconciliation_run: {
      reconciliation_run_id: "reconciliation_bad",
      connection_id,
      auto_resolved_mismatch: true,
      writes_product_state: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("reconciliation_run_mismatch_report_required"));
  assert.ok(blocked.blocked_claims.includes("reconciliation_run_human_review_required"));
  assert.ok(blocked.blocked_claims.includes("reconciliation_run_auto_resolve_blocked"));
  assert.ok(blocked.blocked_claims.includes("reconciliation_run_product_state_write_blocked"));
});

test("G7-D foundation closeout summarizes five TUWs without readiness or go-live claims", () => {
  const descriptors = [
    { tuw_id: "LFOS-G7-W14-T001", outcome: "review_required" },
    { tuw_id: "LFOS-G7-W14-T002", outcome: "review_required" },
    { tuw_id: "LFOS-G7-W14-T003", outcome: "review_required" },
    { tuw_id: "LFOS-G7-W14-T004", outcome: "review_required" },
    { tuw_id: "LFOS-G7-W14-T005", outcome: "review_required" },
  ];
  const closeout = createIntegrationsG7DIntegrationMigrationFoundationCloseoutDescriptor({
    tenant_id,
    g7c_handoff_validated: true,
    rp22_contract_validated: true,
    rp25_contract_validated: true,
    descriptors,
  });

  assert.deepEqual(closeout.tuw_coverage, INTEGRATIONS_G7D_TUW_COVERAGE);
  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(closeout.closeout_receipt.go_live_approval_claimed, false);

  const blocked = createIntegrationsG7DIntegrationMigrationFoundationCloseoutDescriptor({
    tenant_id,
    descriptors: [{ tuw_id: "LFOS-G7-W14-T001", outcome: "review_required" }],
    claims_runtime_readiness: true,
    claims_go_live_approval: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("integration_migration_foundation_requires_g7c_handoff"));
  assert.ok(blocked.blocked_claims.includes("integration_migration_foundation_tuw_coverage_required"));
  assert.ok(blocked.blocked_claims.includes("integration_migration_foundation_runtime_readiness_claim_blocked"));
  assert.ok(blocked.blocked_claims.includes("integration_migration_foundation_go_live_claim_blocked"));
});
