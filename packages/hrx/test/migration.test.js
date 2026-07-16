import assert from "node:assert/strict";
import test from "node:test";
import { createFileHrxStore } from "../src/store/file-store.js";
import { loadHrxCoreMigrations, runHrxMigrations } from "../src/migrations/index.js";

const migrations = loadHrxCoreMigrations();
const sql = migrations.map((migration) => migration.sql).join("\n");

test("HRX migrations create required tables idempotently", () => {
  for (const table of [
    "hrx_employees",
    "hrx_employment_profiles",
    "hrx_employee_user_links",
    "hrx_documents",
    "hrx_compensation_records",
    "hrx_leave_balance_entries",
    "hrx_leave_requests",
    "hrx_attendance_records",
    "hrx_overtime_requests",
    "hrx_job_openings",
    "hrx_candidates",
    "hrx_candidate_consents",
    "hrx_applications",
    "hrx_interviews",
    "hrx_offers",
    "hrx_onboarding_plans",
    "hrx_offboarding_cases",
    "hrx_audit_events",
    "hrx_ai_review_items",
    "hrx_ai_source_chunks",
    "hrx_analytics_snapshots",
    "hrx_leave_groups",
    "hrx_leave_types",
    "hrx_leave_policy_versions",
    "hrx_leave_policy_assignments",
    "hrx_work_schedule_profiles",
    "hrx_work_schedule_assignments",
    "hrx_leave_entitlements",
    "hrx_leave_accrual_rules",
    "hrx_leave_accrual_runs",
    "hrx_leave_accrual_batches",
    "hrx_leave_accrual_batch_periods",
    "hrx_approval_requests",
    "hrx_approval_steps",
    "hrx_approval_assignments",
    "hrx_approval_delegations",
    "hrx_approval_escalations",
    "hrx_leave_request_segments",
    "hrx_leave_request_allocations",
    "hrx_leave_reschedule_proposals",
    "hrx_leave_command_receipts",
    "hrx_leave_request_attachments",
    "hrx_leave_termination_reconciliations",
    "hrx_leave_promotion_campaigns",
    "hrx_leave_promotion_recipients",
    "hrx_leave_promotion_evidence_receipts",
    "hrx_leave_sync_outbox",
    "hrx_leave_integration_deliveries",
    "hrx_leave_integration_dead_letters",
    "hrx_leave_balance_snapshots",
    "hrx_leave_job_outbox",
    "hrx_leave_occurrence_upload_batches",
    "hrx_leave_occurrence_upload_rows",
    "hrx_payroll_periods",
    "hrx_payroll_runs",
    "hrx_payroll_profiles",
    "hrx_payroll_items",
    "hrx_payroll_item_assignments",
    "hrx_attendance_approval_receipts",
    "hrx_payroll_input_snapshots",
    "hrx_payroll_issues",
    "hrx_payroll_employee_results",
    "hrx_payroll_line_items",
    "hrx_payroll_rule_versions",
    "hrx_payroll_statement_templates",
    "hrx_payroll_statements",
    "hrx_payroll_delivery_receipts",
    "hrx_payroll_payment_batches",
    "hrx_payroll_payment_items",
    "hrx_payroll_filing_jobs",
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_employees_tenant_status/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_employment_profiles_employee/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_employee_user_links_employee/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_hrx_leave_ledger_idempotency/);
  assert.match(sql, /CREATE TRIGGER IF NOT EXISTS trg_hrx_leave_balance_entries_immutable_update/);
  assert.match(sql, /CREATE TRIGGER IF NOT EXISTS trg_hrx_leave_balance_entries_immutable_delete/);
  assert.match(sql, /ALTER TABLE hrx_offboarding_cases ADD COLUMN leave_reconciliation_status/);
  assert.match(sql, /ALTER TABLE hrx_leave_promotion_campaigns ADD COLUMN schedule_profile_id/);
  assert.match(sql, /ALTER TABLE hrx_leave_promotion_recipients ADD COLUMN first_delivery_state/);
  assert.match(sql, /ALTER TABLE hrx_leave_sync_outbox ADD COLUMN last_error_code/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_leave_job_outbox_state/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_leave_accrual_batches_status/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_leave_accrual_batch_periods_batch/);
  assert.match(sql, /ALTER TABLE hrx_leave_entitlements ADD COLUMN memo/);
  assert.match(sql, /ALTER TABLE hrx_leave_entitlements ADD COLUMN source_document_id/);
  assert.match(sql, /ALTER TABLE hrx_leave_entitlements ADD COLUMN approved_by_actor_id/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_leave_entitlements_source_document/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_leave_occurrence_upload_batches_status/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_leave_occurrence_upload_rows_batch/);
  assert.match(sql, /ALTER TABLE hrx_leave_promotion_recipients ADD COLUMN first_content_hash/);
  assert.match(sql, /ALTER TABLE hrx_leave_promotion_recipients ADD COLUMN second_content_hash/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_leave_promotion_evidence_recipient/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_leave_integration_dead_letters_state/);
  assert.match(sql, /ALTER TABLE hrx_leave_entitlements ADD COLUMN policy_rules_snapshot_hash/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_leave_entitlement_rule_snapshot/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_payroll_periods_status/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_payroll_rules_effective/);
  assert.match(sql, /ALTER TABLE hrx_payroll_input_snapshots ADD COLUMN input_json/);
  assert.match(sql, /ALTER TABLE hrx_overtime_requests ADD COLUMN payroll_segment_kind/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_payroll_issues_run/);
  assert.match(sql, /CREATE TRIGGER IF NOT EXISTS trg_hrx_compensation_records_immutable_update/);
  assert.match(sql, /CREATE TRIGGER IF NOT EXISTS trg_hrx_compensation_records_immutable_delete/);
  assert.match(sql, /ALTER TABLE hrx_payroll_profiles ADD COLUMN compensation_unit/);
  assert.match(sql, /ALTER TABLE hrx_payroll_profiles ADD COLUMN compensation_quantity/);
  assert.match(sql, /ALTER TABLE hrx_payroll_profiles ADD COLUMN withholding_category/);
  assert.match(sql, /CREATE TRIGGER IF NOT EXISTS trg_hrx_payroll_item_assignments_immutable_update/);
  assert.match(sql, /CREATE TRIGGER IF NOT EXISTS trg_hrx_attendance_approval_receipts_immutable_update/);
  assert.match(sql, /ALTER TABLE hrx_leave_accrual_rules ADD COLUMN logical_rule_code/);
  assert.match(sql, /ALTER TABLE hrx_leave_accrual_rules ADD COLUMN version INTEGER NOT NULL DEFAULT 1/);
  assert.match(sql, /ALTER TABLE hrx_leave_accrual_rules ADD COLUMN supersedes_rule_id/);
  assert.match(sql, /ALTER TABLE hrx_leave_accrual_runs ADD COLUMN as_of_date/);
  assert.match(sql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_hrx_leave_accrual_rules_logical_version/);
});

test("HRX core migration is non-destructive", () => {
  assert.doesNotMatch(sql, /\bDROP\s+TABLE\b/i);
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i);
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i);
});

test("HRX core migration preserves Employee/User separation", () => {
  assert.match(sql, /CONSTRAINT hrx_employee_user_links_purpose_check CHECK \(purpose = 'login_mapping'\)/);
  assert.match(sql, /CONSTRAINT hrx_employee_user_links_identity_check CHECK \(employee_id <> user_id\)/);
  assert.match(sql, /FOREIGN KEY \(tenant_id, employee_id\) REFERENCES hrx_employees \(tenant_id, employee_id\)/);
});

test("HRX migration runner applies core migration idempotently", () => {
  const store = createFileHrxStore();
  const first = runHrxMigrations(store);
  const second = runHrxMigrations(store);
  assert.deepEqual(first.map((result) => result.applied), migrations.map(() => true));
  assert.deepEqual(second.map((result) => result.applied), migrations.map(() => false));
  assert.deepEqual(
    store.snapshot().applied_migrations.map((migration) => migration.id),
    migrations.map((migration) => migration.id),
  );
  store.close();
});

test("HRX migration loader rejects destructive SQL", () => {
  assert.throws(
    () => runHrxMigrations(createFileHrxStore(), { migrations: [{ id: "bad", sql: "DROP TABLE hrx_employees;" }] }),
    /unsafe SQL pattern/,
  );
  assert.equal(loadHrxCoreMigrations()[0].id, "001_hrx_core");
  assert.equal(loadHrxCoreMigrations().at(-1).id, "029_hrx_leave_accrual_rule_version_index");
});
