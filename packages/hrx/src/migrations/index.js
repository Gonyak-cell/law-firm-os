import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertHrxStorePort } from "../store/port.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export const HRX_CORE_MIGRATIONS = Object.freeze([
  Object.freeze({
    id: "001_hrx_core",
    filename: "001_hrx_core.sql",
  }),
  Object.freeze({
    id: "002_hrx_documents_leave_audit",
    filename: "002_hrx_documents_leave_audit.sql",
  }),
  Object.freeze({
    id: "003_hrx_ai_analytics",
    filename: "003_hrx_ai_analytics.sql",
  }),
  Object.freeze({
    id: "004_hrx_attendance",
    filename: "004_hrx_attendance.sql",
  }),
  Object.freeze({
    id: "005_hrx_overtime",
    filename: "005_hrx_overtime.sql",
  }),
  Object.freeze({
    id: "006_hrx_recruiting_lifecycle",
    filename: "006_hrx_recruiting_lifecycle.sql",
  }),
  Object.freeze({
    id: "007_hrx_leave_management",
    filename: "007_hrx_leave_management.sql",
  }),
  Object.freeze({
    id: "008_hrx_leave_reporting",
    filename: "008_hrx_leave_reporting.sql",
  }),
  Object.freeze({
    id: "009_hrx_leave_promotion",
    filename: "009_hrx_leave_promotion.sql",
  }),
  Object.freeze({
    id: "010_hrx_leave_integrations",
    filename: "010_hrx_leave_integrations.sql",
  }),
  Object.freeze({
    id: "011_hrx_leave_type_economics",
    filename: "011_hrx_leave_type_economics.sql",
  }),
  Object.freeze({
    id: "012_hrx_leave_job_outbox",
    filename: "012_hrx_leave_job_outbox.sql",
  }),
  Object.freeze({
    id: "013_hrx_leave_accrual_batches",
    filename: "013_hrx_leave_accrual_batches.sql",
  }),
  Object.freeze({
    id: "014_hrx_leave_occurrence_metadata",
    filename: "014_hrx_leave_occurrence_metadata.sql",
  }),
  Object.freeze({
    id: "015_hrx_leave_occurrence_upload_batches",
    filename: "015_hrx_leave_occurrence_upload_batches.sql",
  }),
  Object.freeze({
    id: "016_hrx_leave_promotion_exclusions",
    filename: "016_hrx_leave_promotion_exclusions.sql",
  }),
  Object.freeze({
    id: "017_hrx_leave_promotion_notice_hashes",
    filename: "017_hrx_leave_promotion_notice_hashes.sql",
  }),
  Object.freeze({
    id: "018_hrx_leave_promotion_evidence_receipts",
    filename: "018_hrx_leave_promotion_evidence_receipts.sql",
  }),
  Object.freeze({
    id: "019_hrx_leave_integration_dead_letters",
    filename: "019_hrx_leave_integration_dead_letters.sql",
  }),
  Object.freeze({
    id: "020_hrx_leave_rule_snapshots",
    filename: "020_hrx_leave_rule_snapshots.sql",
  }),
  Object.freeze({
    id: "021_hrx_payroll_runtime",
    filename: "021_hrx_payroll_runtime.sql",
  }),
  Object.freeze({
    id: "022_hrx_payroll_inputs",
    filename: "022_hrx_payroll_inputs.sql",
  }),
  Object.freeze({
    id: "023_hrx_payroll_profile_units",
    filename: "023_hrx_payroll_profile_units.sql",
  }),
  Object.freeze({
    id: "024_hrx_payroll_run_controls",
    filename: "024_hrx_payroll_run_controls.sql",
  }),
  Object.freeze({
    id: "025_hrx_payroll_year_end",
    filename: "025_hrx_payroll_year_end.sql",
  }),
]);

const UNSAFE_SQL_PATTERNS = Object.freeze([
  /\bDROP\s+TABLE\b/i,
  /\bTRUNCATE\b/i,
  /\bDELETE\s+FROM\b/i,
  /\bALTER\s+TABLE\b[^;]*\bDROP\b/i,
]);

export function readHrxMigration(filename) {
  return readFileSync(resolve(__dirname, filename), "utf8");
}

export function assertHrxMigrationIsNonDestructive(sql, { id = "unknown" } = {}) {
  for (const pattern of UNSAFE_SQL_PATTERNS) {
    if (pattern.test(sql)) {
      throw new Error(`HRX migration ${id} contains unsafe SQL pattern: ${pattern}`);
    }
  }
  return true;
}

export function loadHrxCoreMigrations() {
  return HRX_CORE_MIGRATIONS.map((migration) => {
    const sql = readHrxMigration(migration.filename);
    assertHrxMigrationIsNonDestructive(sql, migration);
    return Object.freeze({ ...migration, sql });
  });
}

export function runHrxMigrations(store, { migrations = loadHrxCoreMigrations() } = {}) {
  assertHrxStorePort(store);
  const results = [];
  for (const migration of migrations) {
    assertHrxMigrationIsNonDestructive(migration.sql, migration);
    results.push(store.migrate(migration));
  }
  return Object.freeze(results);
}
