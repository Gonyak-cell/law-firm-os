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
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_employees_tenant_status/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_employment_profiles_employee/);
  assert.match(sql, /CREATE INDEX IF NOT EXISTS idx_hrx_employee_user_links_employee/);
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
});
