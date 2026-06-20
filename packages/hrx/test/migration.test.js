import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createFileHrxStore } from "../src/store/file-store.js";
import { loadHrxCoreMigrations, runHrxMigrations } from "../src/migrations/index.js";

const sql = readFileSync("packages/hrx/src/migrations/001_hrx_core.sql", "utf8");

test("HRX core migration creates required tables idempotently", () => {
  for (const table of ["hrx_employees", "hrx_employment_profiles", "hrx_employee_user_links"]) {
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
  assert.deepEqual(first.map((result) => result.applied), [true]);
  assert.deepEqual(second.map((result) => result.applied), [false]);
  assert.deepEqual(
    store.snapshot().applied_migrations.map((migration) => migration.id),
    ["001_hrx_core"],
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
