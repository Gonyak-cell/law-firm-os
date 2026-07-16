import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createSqlPayrollItemCatalog } from "../src/payroll-item-catalog.js";
import { createSqlPayrollProfileService } from "../src/payroll-profile-service.js";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const NOW = "2026-07-14T00:00:00.000Z";

function createFixture(filePath) {
  const store = createFileHrxStore(filePath ? { filePath } : undefined);
  runHrxMigrations(store);
  createSqlHrxRepository({ store, clock: () => NOW }).createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-a",
    display_name: "Synthetic employee",
    status: "active",
  });
  createSqlPayrollItemCatalog({ store, clock: () => NOW }).create(
    { tenant_id: "tenant-a", actor_id: "hr-001" },
    {
      item_id: "base-a",
      code: "BASE_SALARY",
      display_name: "기본급",
      kind: "earning",
      tax_treatment: "taxable",
      value_mode: "fixed",
      calculation_order: 10,
      effective_from: "2026-01-01",
    },
  );
  const service = createSqlPayrollProfileService({
    store,
    clock: () => NOW,
    encryptionOptions: { keyMaterial: "synthetic-payroll-profile-key" },
  });
  const actor = { tenant_id: "tenant-a", actor_id: "hr-001" };
  service.createProfile(actor, {
    payroll_profile_id: "profile-a",
    employee_id: "emp-a",
    employment_type: "monthly",
    pay_group_code: "KR-MONTHLY",
    compensation_ref: "compensation:profile-a",
    effective_from: "2026-01-01",
  });
  return { store, service, actor };
}

test("Forest payroll profile stays mutable while item assignments are append-only and masked", () => {
  const { store, service, actor } = createFixture();
  const updated = service.updateProfile(actor, {
    payroll_profile_id: "profile-a",
    expected_version: 1,
    pay_group_code: "KR-MONTHLY-UPDATED",
  });
  assert.equal(updated.state_version, 2);
  const assignment = service.createAssignment(actor, "profile-a", {
    assignment_id: "assignment-a-v1",
    item_id: "base-a",
    version: 1,
    amount_minor: 12_345_678,
    effective_from: "2026-01-01",
    source_ref: "HRX:payroll-assignment:a:v1",
  });
  assert.match(assignment.masked_compensation_ref, /^compensation_ref_hash:[a-f0-9]{24}$/);
  assert.equal(Object.hasOwn(assignment, "encrypted_amount_ref"), false);
  assert.equal(assignment.raw_amount_included, false);
  assert.throws(
    () => store.query("updateOne", {
      table: "hrx_payroll_item_assignments",
      where: { tenant_id: "tenant-a", assignment_id: "assignment-a-v1" },
      patch: { status: "inactive" },
    }),
    /append-only/,
  );
  store.close();
});

test("assignment periods, currency, tenant, and raw amount boundaries fail closed", () => {
  const { store, service, actor } = createFixture();
  service.createAssignment(actor, "profile-a", {
    assignment_id: "assignment-a-v1",
    item_id: "base-a",
    version: 1,
    amount_minor: 1_000_000,
    effective_from: "2026-01-01",
    effective_to: "2026-06-30",
    source_ref: "HRX:payroll-assignment:a:v1",
  });
  assert.throws(
    () => service.createAssignment(actor, "profile-a", {
      assignment_id: "overlap",
      item_id: "base-a",
      version: 2,
      amount_minor: 2_000_000,
      effective_from: "2026-06-30",
      source_ref: "HRX:payroll-assignment:a:v2",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_ASSIGNMENT_PERIOD_OVERLAP",
  );
  assert.throws(
    () => service.createAssignment(actor, "profile-a", {
      assignment_id: "wrong-currency",
      item_id: "base-a",
      version: 3,
      amount_minor: 2_000_000,
      currency_ref: "Currency:USD",
      effective_from: "2026-07-01",
      source_ref: "HRX:payroll-assignment:a:v3",
    }),
    (error) => error.safe_error_code === "HRX_PAYROLL_ASSIGNMENT_CURRENCY_MISMATCH",
  );
  assert.throws(
    () => service.getProfile({ tenant_id: "tenant-b", actor_id: "hr-b" }, "profile-a"),
    (error) => error.safe_error_code === "HRX_PAYROLL_PROFILE_NOT_FOUND",
  );
  store.close();
});

test("assignment ciphertext survives restart without serializing raw amount", () => {
  const directory = mkdtempSync(join(tmpdir(), "lawos-payroll-profile-"));
  const filePath = join(directory, "hrx.json");
  try {
    const { store, service, actor } = createFixture(filePath);
    service.createAssignment(actor, "profile-a", {
      assignment_id: "assignment-a-v1",
      item_id: "base-a",
      version: 1,
      amount_minor: 12_345_678,
      effective_from: "2026-01-01",
      source_ref: "HRX:payroll-assignment:a:v1",
    });
    store.close();
    const serialized = readFileSync(filePath, "utf8");
    assert.match(serialized, /lawos-comp-v1\./);
    assert.doesNotMatch(serialized, /12345678|amount_minor/);
    const reopened = createFileHrxStore({ filePath });
    const visible = createSqlPayrollProfileService({ store: reopened, clock: () => NOW })
      .getProfile(actor, "profile-a", { include_history: true });
    assert.equal(visible.assignments.length, 1);
    assert.doesNotMatch(JSON.stringify(visible), /lawos-comp-v1|12345678/);
    reopened.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
