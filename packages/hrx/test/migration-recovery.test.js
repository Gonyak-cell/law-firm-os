import assert from "node:assert/strict";
import test from "node:test";
import { auditHrxMigrationRecovery } from "../../../scripts/validate-hrx-migration-recovery.mjs";

test("MG-006 reruns, rolls back, and restores migrations without partial commits", () => {
  const report = auditHrxMigrationRecovery();
  assert.equal(report.verdict, "PASS");
  assert.equal(report.migration_count, 29);
  assert.equal(report.partial_commit_count, 0);
  assert.equal(report.external_write_count, 0);

  const rerun = report.canonical_rerun;
  assert.equal(rerun.first_pending_count, 29);
  assert.equal(rerun.first_applied_count, 29);
  assert.equal(rerun.rerun_pending_count, 0);
  assert.equal(rerun.rerun_already_applied_count, 29);
  assert.equal(rerun.rerun_applied_count, 0);
  assert.equal(rerun.first_snapshot_sha256, rerun.rerun_snapshot_sha256);
  assert.equal(rerun.first_snapshot_sha256, rerun.reopened_snapshot_sha256);

  const failure = report.canonical_failure_rollback;
  assert.equal(failure.rollback_outcome, "restored");
  assert.equal(failure.partial_applied_count, 0);
  assert.equal(failure.before_snapshot_sha256, failure.restored_snapshot_sha256);
  assert.equal(failure.before_snapshot_sha256, failure.reopened_snapshot_sha256);

  const backup = report.canonical_backup_restore;
  assert.equal(backup.restore_exact, true);
  assert.equal(backup.backup_snapshot_sha256, backup.restored_snapshot_sha256);
  assert.equal(backup.backup_snapshot_sha256, backup.reopened_snapshot_sha256);
  assert.equal(backup.tampered_backup_error_code, "HRX_MIGRATION_BACKUP_CHECKSUM_MISMATCH");

  const sqlite = report.sqlite_recovery;
  assert.equal(sqlite.checkpoint, 25);
  assert.equal(sqlite.checkpoint_migration_count, 25);
  assert.equal(sqlite.upgrade_migration_count, 4);
  assert.equal(sqlite.backup_file_sha256, sqlite.restored_file_sha256);
  assert.equal(sqlite.checkpoint_schema_sha256, sqlite.restored_checkpoint_schema_sha256);
  assert.equal(sqlite.checkpoint_data_sha256, sqlite.restored_checkpoint_data_sha256);
  assert.equal(sqlite.first_final_schema_sha256, sqlite.restored_final_schema_sha256);
  assert.equal(sqlite.first_final_data_sha256, sqlite.restored_final_data_sha256);
  assert.equal(sqlite.partial_schema_object_count, 0);
  assert.equal(sqlite.failed_transaction_schema_sha256_before, sqlite.failed_transaction_schema_sha256_after);
  assert.equal(sqlite.failed_transaction_data_sha256_before, sqlite.failed_transaction_data_sha256_after);
  assert.equal(sqlite.failed_transaction_schema_sha256_before, sqlite.reopened_schema_sha256);
  assert.equal(sqlite.failed_transaction_data_sha256_before, sqlite.reopened_data_sha256);
  assert.equal(sqlite.integrity_check, "ok");
  assert.equal(sqlite.foreign_key_error_count, 0);
  assert.match(report.report_sha256, /^[a-f0-9]{64}$/);
});
