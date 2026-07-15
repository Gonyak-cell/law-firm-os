import assert from "node:assert/strict";
import test from "node:test";
import { auditHrxCheckpointUpgrades } from "../../../scripts/validate-hrx-checkpoint-upgrades.mjs";

test("MG-005 upgrades 010, 020, and 025 file databases without data loss", () => {
  const report = auditHrxCheckpointUpgrades();
  assert.equal(report.verdict, "PASS");
  assert.equal(report.final_migration_count, 28);
  assert.equal(report.final_migration, "028_hrx_leave_accrual_rule_versions.sql");
  assert.deepEqual(report.checkpoints.map(({ checkpoint }) => checkpoint), [10, 20, 25]);
  assert.deepEqual(report.checkpoints.map(({ upgrade_migration_count }) => upgrade_migration_count), [18, 8, 3]);
  assert.equal(report.checkpoint_count, 3);
  assert.equal(report.total_seeded_table_count, 32);
  assert.equal(report.total_seeded_row_count, 32);
  assert.equal(report.total_changed_existing_row_count, 0);
  assert.equal(report.total_lost_existing_row_count, 0);
  assert.equal(report.total_unexpected_new_row_count, 0);
  assert.equal(report.total_backfill_check_count, 30);
  for (const checkpoint of report.checkpoints) {
    assert.equal(checkpoint.verdict, "PASS");
    assert.equal(checkpoint.data_snapshot_sha256_before, checkpoint.data_snapshot_sha256_after);
    assert.equal(checkpoint.data_snapshot_sha256_before, checkpoint.data_snapshot_sha256_reopened);
    assert.equal(checkpoint.final_schema_sha256, report.fresh_schema_sha256);
    assert.equal(checkpoint.changed_existing_row_count, 0);
    assert.equal(checkpoint.lost_existing_row_count, 0);
    assert.equal(checkpoint.unexpected_new_row_count, 0);
    assert.equal(checkpoint.durable_reopen, true);
    assert.equal(checkpoint.backfill_checks.every(({ verdict }) => verdict === "PASS"), true);
    assert.deepEqual(checkpoint.checkpoint_validation, { integrity_check: "ok", foreign_key_error_count: 0 });
    assert.deepEqual(checkpoint.upgraded_validation, { integrity_check: "ok", foreign_key_error_count: 0 });
    assert.deepEqual(checkpoint.reopened_validation, { integrity_check: "ok", foreign_key_error_count: 0 });
  }
  assert.match(report.report_sha256, /^[a-f0-9]{64}$/);
});
