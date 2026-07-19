import assert from "node:assert/strict";
import test from "node:test";
import { auditFreshHrxDatabase } from "../../../scripts/validate-hrx-fresh-db.mjs";

test("MG-004 executes migrations 001-031 on a fresh SQLite database", () => {
  const report = auditFreshHrxDatabase();
  assert.equal(report.verdict, "PASS");
  assert.equal(report.migration_count, 31);
  assert.equal(report.migration_first, "001_hrx_core.sql");
  assert.equal(report.migration_last, "031_hrx_leave_command_receipts_append_only.sql");
  assert.deepEqual(
    report.migration_receipts.map((receipt) => receipt.filename.slice(0, 3)),
    Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(3, "0")),
  );
  assert.deepEqual(report.actual_object_counts, { tables: 77, indexes: 58, triggers: 14 });
  assert.deepEqual(report.actual_object_counts, report.expected_object_counts);
  assert.equal(report.required_column_checks.length, 7);
  assert.equal(report.forbidden_column_checks.length, 7);
  assert.equal(report.forbidden_table_count, 0);
  assert.equal(report.constraint_probes.length, 7);
  assert.equal(report.constraint_probes.every((probe) => probe.verdict === "PASS"), true);
  assert.equal(report.empty_table_count, 77);
  assert.equal(report.nonempty_table_count, 0);
  assert.equal(report.integrity_check, "ok");
  assert.equal(report.foreign_key_error_count, 0);
  assert.match(report.migration_manifest_sha256, /^[a-f0-9]{64}$/);
  assert.match(report.schema_manifest_sha256, /^[a-f0-9]{64}$/);
  assert.match(report.row_count_manifest_sha256, /^[a-f0-9]{64}$/);
});
