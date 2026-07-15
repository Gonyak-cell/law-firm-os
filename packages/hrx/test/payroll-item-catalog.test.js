import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createInMemoryPayrollItemCatalog,
  createPayrollItem,
  createSqlPayrollItemCatalog,
} from "../src/payroll-item-catalog.js";
import { runHrxMigrations } from "../src/migrations/index.js";
import { createFileHrxStore } from "../src/store/file-store.js";

const base = Object.freeze({
  tenant_id: "tenant-a",
  item_id: "base-salary",
  code: "base_salary",
  display_name: "기본급",
  kind: "earning",
  tax_treatment: "taxable",
  value_mode: "fixed",
  calculation_order: 10,
  effective_from: "2026-01-01",
});

test("payroll item validates and normalizes catalog fields", () => {
  const item = createPayrollItem(base);
  assert.equal(item.code, "BASE_SALARY");
  assert.equal(item.status, "active");
  assert.equal(item.effective_to, null);
  assert.throws(() => createPayrollItem({ ...base, kind: "bonus" }), /kind must be one of/);
  assert.throws(() => createPayrollItem({ ...base, calculation_order: -1 }), /non-negative integer/);
  assert.throws(
    () => createPayrollItem({ ...base, effective_from: "2026-02-01", effective_to: "2026-01-31" }),
    /must not precede/,
  );
});

test("payroll item catalog rejects duplicate tenant codes and isolates tenants", () => {
  const catalog = createInMemoryPayrollItemCatalog();
  const tenantA = { tenant_id: "tenant-a" };
  const tenantB = { tenant_id: "tenant-b" };
  catalog.create(tenantA, base);
  assert.throws(() => catalog.create(tenantA, { ...base, item_id: "base-salary-2" }), /Duplicate payroll item code/);
  catalog.create(tenantB, { ...base, tenant_id: "tenant-b", item_id: "tenant-b-base" });
  assert.deepEqual(catalog.list(tenantA).map((item) => item.item_id), ["base-salary"]);
  assert.deepEqual(catalog.list(tenantB).map((item) => item.item_id), ["tenant-b-base"]);
  assert.equal(catalog.get(tenantB, "base-salary"), undefined);
});

test("SQL payroll item catalog persists optimistic updates across restart", () => {
  const directory = mkdtempSync(join(tmpdir(), "lawos-payroll-items-"));
  const filePath = join(directory, "hrx.json");
  try {
    const store = createFileHrxStore({ filePath });
    runHrxMigrations(store);
    const events = [];
    const catalog = createSqlPayrollItemCatalog({
      store,
      audit: { append(event) { events.push(event); } },
      clock: () => "2026-07-14T00:00:00.000Z",
    });
    const actor = { tenant_id: "tenant-a", actor_id: "hr-001" };
    const created = catalog.create(actor, base);
    const updated = catalog.update(actor, created.item_id, {
      expected_version: 1,
      display_name: "기본 급여",
      status: "inactive",
    });
    assert.equal(updated.state_version, 2);
    assert.equal(events.length, 2);
    assert.throws(() => catalog.update(actor, created.item_id, { expected_version: 1 }), /version conflict/);
    store.close();

    const reopened = createFileHrxStore({ filePath });
    const persisted = createSqlPayrollItemCatalog({ store: reopened }).list(actor, { include_inactive: true });
    assert.equal(persisted[0].display_name, "기본 급여");
    assert.deepEqual(createSqlPayrollItemCatalog({ store: reopened }).list({ tenant_id: "tenant-b", actor_id: "hr-002" }), []);
    reopened.close();
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
