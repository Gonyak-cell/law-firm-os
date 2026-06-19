import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

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
