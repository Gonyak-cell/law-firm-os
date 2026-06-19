import assert from "node:assert/strict";
import test from "node:test";

import {
  MIGRATION_G7E_TUW_COVERAGE,
  createMigrationG7AccountingConnectorExportDescriptor,
  createMigrationG7DashboardDescriptor,
  createMigrationG7ECutoverCloseoutDescriptor,
  createMigrationG7ImportValidationFrameworkDescriptor,
  createMigrationG7MigrationBatchDescriptor,
} from "../src/index.js";

const tenant_id = "tenant_g7e_migration";
const migration_batch_id = "batch_g7e";

test("G7-E migration batch requires import audit, lineage, and dry-run boundary", () => {
  const batch = createMigrationG7MigrationBatchDescriptor({
    tenant_id,
    migration_batch: {
      migration_batch_id,
      source_system: "sharepoint",
      source_manifest_ref: "source_manifest_g7e",
      source_lineage_ref: "lineage_g7e",
      import_audit_ref: "import_audit_g7e",
      import_audit_tested: true,
      dry_run_only: true,
    },
  });

  assert.equal(batch.outcome, "review_required");
  assert.equal(batch.migration_batch_receipt.import_audit_tested, true);
  assert.equal(batch.migration_batch_receipt.source_lineage_tested, true);
  assert.equal(batch.migration_batch_receipt.dry_run_only, true);

  const blocked = createMigrationG7MigrationBatchDescriptor({
    tenant_id,
    migration_batch: {
      migration_batch_id: "batch_bad",
      source_system: "file_server",
      import_execution_started: true,
      imports_records: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("migration_batch_import_audit_required"));
  assert.ok(blocked.blocked_claims.includes("migration_batch_dry_run_only_required"));
  assert.ok(blocked.blocked_claims.includes("migration_batch_product_state_write_blocked"));
});

test("G7-E import validation detects duplicate Party candidates and failed rows", () => {
  const validation = createMigrationG7ImportValidationFrameworkDescriptor({
    tenant_id,
    import_validation: {
      validation_run_id: "validation_g7e",
      migration_batch_id,
      duplicate_party_candidates_ref: "duplicate_candidates_g7e",
      duplicate_party_detection_tested: true,
      failed_row_report_ref: "failed_rows_g7e",
      schema_validation_tested: true,
      review_queue_ref: "review_queue_g7e",
      human_review_required: true,
    },
  });

  assert.equal(validation.outcome, "review_required");
  assert.equal(validation.import_validation_receipt.duplicate_party_detection_tested, true);
  assert.equal(validation.import_validation_receipt.failed_row_report_tested, true);
  assert.equal(validation.import_validation_receipt.human_review_required, true);

  const blocked = createMigrationG7ImportValidationFrameworkDescriptor({
    tenant_id,
    import_validation: {
      validation_run_id: "validation_bad",
      migration_batch_id,
      auto_merge_duplicate_party: true,
      cross_tenant_match_allowed: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("import_validation_duplicate_party_detection_required"));
  assert.ok(blocked.blocked_claims.includes("import_validation_auto_merge_blocked"));
  assert.ok(blocked.blocked_claims.includes("import_validation_cross_tenant_match_blocked"));
});

test("G7-E accounting connector export requires human review before external send", () => {
  const accountingExport = createMigrationG7AccountingConnectorExportDescriptor({
    tenant_id,
    accounting_export: {
      accounting_export_id: "accounting_export_g7e",
      migration_batch_id,
      provider: "WEHAGO",
      preview_payload_ref: "preview_payload_g7e",
      preview_generated: true,
      review_approval_ref: "review_g7e",
      human_review_required: true,
    },
  });

  assert.equal(accountingExport.outcome, "review_required");
  assert.equal(accountingExport.accounting_export_receipt.provider_allowed, true);
  assert.equal(accountingExport.accounting_export_receipt.preview_generated, true);
  assert.equal(accountingExport.accounting_export_receipt.human_review_before_export, true);

  const blocked = createMigrationG7AccountingConnectorExportDescriptor({
    tenant_id,
    accounting_export: {
      accounting_export_id: "accounting_export_bad",
      migration_batch_id,
      provider: "custom_provider",
      export_payload_sent: true,
      secret_value_included: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("accounting_export_provider_required"));
  assert.ok(blocked.blocked_claims.includes("accounting_export_human_review_required"));
  assert.ok(blocked.blocked_claims.includes("accounting_export_external_send_blocked"));
  assert.ok(blocked.blocked_claims.includes("accounting_export_secret_exposure_blocked"));
});

test("G7-E migration dashboard requires tenant-scoped failed-row review without payload leak", () => {
  const dashboard = createMigrationG7DashboardDescriptor({
    tenant_id,
    migration_dashboard: {
      tenant_id,
      dashboard_id: "dashboard_g7e",
      tenant_scoped_query: true,
      failed_row_queue_ref: "failed_row_queue_g7e",
      failed_row_review_tested: true,
      permission_scope_ref: "permission_scope_g7e",
      permission_scope_reviewed: true,
    },
  });

  assert.equal(dashboard.outcome, "review_required");
  assert.equal(dashboard.migration_dashboard_receipt.tenant_scoped_query_tested, true);
  assert.equal(dashboard.migration_dashboard_receipt.failed_row_review_tested, true);
  assert.equal(dashboard.migration_dashboard_receipt.permission_scope_reviewed, true);

  const blocked = createMigrationG7DashboardDescriptor({
    tenant_id,
    migration_dashboard: {
      tenant_id: "other_tenant",
      dashboard_id: "dashboard_bad",
      includes_raw_source_payload: true,
      customer_data_leak_detected: true,
      executes_ui_runtime: true,
    },
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("migration_dashboard_tenant_scoped_query_required"));
  assert.ok(blocked.blocked_claims.includes("migration_dashboard_failed_row_review_required"));
  assert.ok(blocked.blocked_claims.includes("migration_dashboard_customer_data_leak_blocked"));
});

test("G7-E cutover closeout records evidence without approving cutover or go-live", () => {
  const descriptors = [
    { tuw_id: "LFOS-G7-W14-T006", outcome: "review_required" },
    { tuw_id: "LFOS-G7-W14-T007", outcome: "review_required" },
    { tuw_id: "LFOS-G7-W14-T008", outcome: "review_required" },
    { tuw_id: "LFOS-G7-W14-T009", outcome: "review_required" },
    { tuw_id: "LFOS-G7-W14-T010", outcome: "review_required" },
  ];
  const closeout = createMigrationG7ECutoverCloseoutDescriptor({
    tenant_id,
    g7d_handoff_validated: true,
    rp23_contract_validated: true,
    rp25_contract_validated: true,
    cutover_readiness_evidence_ref: "cutover_evidence_g7e",
    cutover_rehearsal_completed: true,
    rollback_plan_ref: "rollback_plan_g7e",
    human_cutover_review_required: true,
    descriptors,
  });

  assert.deepEqual(closeout.tuw_coverage, MIGRATION_G7E_TUW_COVERAGE);
  assert.equal(closeout.outcome, "review_required");
  assert.equal(closeout.closeout_receipt.cutover_readiness_evidence_recorded, true);
  assert.equal(closeout.closeout_receipt.runtime_readiness_claim, "open");
  assert.equal(closeout.closeout_receipt.go_live_approval_claimed, false);

  const blocked = createMigrationG7ECutoverCloseoutDescriptor({
    tenant_id,
    descriptors: [{ tuw_id: "LFOS-G7-W14-T006", outcome: "review_required" }],
    claims_cutover_approved: true,
    claims_runtime_readiness: true,
    claims_go_live_approval: true,
  });

  assert.equal(blocked.outcome, "blocked");
  assert.ok(blocked.blocked_claims.includes("migration_cutover_requires_g7d_handoff"));
  assert.ok(blocked.blocked_claims.includes("migration_cutover_tuw_coverage_required"));
  assert.ok(blocked.blocked_claims.includes("migration_cutover_closeout_evidence_required"));
  assert.ok(blocked.blocked_claims.includes("migration_cutover_go_live_claim_blocked"));
});
