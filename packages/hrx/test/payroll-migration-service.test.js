import assert from "node:assert/strict";
import test from "node:test";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createPayrollProfileMigrationService, PAYROLL_PROFILE_MIGRATION_APPROVAL_SCHEMA_VERSION } from "../src/payroll/migration-service.js";
import { createPayrollRepository } from "../src/payroll/repository.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const TENANT = "tenant-payroll-migration";
const CONTEXT = Object.freeze({ tenant_id: TENANT, actor_id: "payroll-migration-operator" });
const SOURCE = Object.freeze([{ source_key: "vault:legacy-payroll/profile-001", employee_id: "emp-001", employment_type: "monthly", pay_group_code: "KR-MONTHLY", compensation_ref: "compensation:legacy/emp-001/v1", effective_from: "2026-01-01", unused_leave_minutes: 0 }]);

function setup() {
  const store = createFileHrxStore();
  runHrxMigrations(store);
  createSqlHrxRepository({ store }).createEmployee({ tenant_id: TENANT, employee_id: "emp-001", display_name: "Private Employee", status: "active" });
  const repository = createPayrollRepository({ store });
  return { store, repository, service: createPayrollProfileMigrationService({ store, repository, clock: () => "2026-07-15T12:00:00.000Z" }) };
}

function approval(preview) {
  return { schema_version: PAYROLL_PROFILE_MIGRATION_APPROVAL_SCHEMA_VERSION, tenant_id: TENANT, preview_hash: preview.preview_hash, decision: "approved", approved_by_actor_id: "owner-001" };
}

test("PY-MIG-001 keeps dry-run receipts repo-safe and requires an exact owner manifest", () => {
  const { store, repository, service } = setup();
  const before = store.snapshot();
  const preview = service.preview(CONTEXT, { source_rows: SOURCE });
  assert.deepEqual([preview.source_count, preview.create_count, preview.error_count], [1, 1, 0]);
  assert.equal(repository.listProfiles(CONTEXT).length, 0);
  assert.deepEqual(store.snapshot(), before);
  assert.doesNotMatch(JSON.stringify(preview), /Private Employee|emp-001|compensation:legacy/);
  assert.throws(() => service.execute(CONTEXT, { source_rows: SOURCE, approval_manifest: { ...approval(preview), preview_hash: "sha256:wrong" } }), (error) => error.safe_error_code === "HRX_PAYROLL_MIGRATION_APPROVAL_REQUIRED");
  store.close();
});

test("PY-MIG-001 executes once, reconciles leave balances, and restores the exact backup", () => {
  const { store, repository, service } = setup();
  const before = store.snapshot();
  const preview = service.preview(CONTEXT, { source_rows: SOURCE });
  const result = service.execute(CONTEXT, { source_rows: SOURCE, approval_manifest: approval(preview) });
  assert.equal(result.created_count, 1);
  assert.equal(repository.listProfiles(CONTEXT).length, 1);
  const rerun = service.preview(CONTEXT, { source_rows: SOURCE });
  assert.deepEqual([rerun.create_count, rerun.preserved_count, rerun.error_count], [0, 1, 0]);
  const rolledBack = service.rollback(CONTEXT, { rollback_manifest: result.rollback_manifest });
  assert.equal(rolledBack.outcome, "rolled_back");
  assert.deepEqual(store.snapshot(), before);
  store.close();
});

test("PY-MIG-001 blocks missing employees, conflicting profiles, and unexplained leave variance", () => {
  const { store, repository, service } = setup();
  repository.createProfile(CONTEXT, { payroll_profile_id: "existing-profile", employee_id: "emp-001", employment_type: "hourly", pay_group_code: "KR-HOURLY", compensation_ref: "compensation:existing/emp-001", effective_from: "2026-01-01" });
  const preview = service.preview(CONTEXT, { source_rows: [{ ...SOURCE[0], unused_leave_minutes: 60 }, { ...SOURCE[0], source_key: "vault:legacy-payroll/missing", employee_id: "missing-employee" }] });
  assert.ok(preview.error_counts.employee_missing > 0);
  assert.ok(preview.error_counts.profile_conflict > 0);
  assert.ok(preview.error_counts.leave_balance_variance > 0);
  assert.throws(() => service.execute(CONTEXT, { source_rows: SOURCE, approval_manifest: approval(preview) }), (error) => error.safe_error_code === "HRX_PAYROLL_MIGRATION_APPROVAL_REQUIRED");
  store.close();
});
