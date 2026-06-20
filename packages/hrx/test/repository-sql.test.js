import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createSqlHrxRepository } from "../src/repository-sql.js";
import { createFileHrxStore } from "../src/store/file-store.js";
import { runHrxMigrations } from "../src/migrations/index.js";

function createDurableRepo() {
  const dir = mkdtempSync(join(tmpdir(), "hrx-repository-sql-"));
  const store = createFileHrxStore({ filePath: join(dir, "hrx-store.json") });
  runHrxMigrations(store);
  return {
    store,
    repository: createSqlHrxRepository({ store, clock: () => "2026-06-20T00:00:00.000Z" }),
  };
}

const employeeInput = {
  tenant_id: "tenant-a",
  employee_id: "emp-001",
  display_name: "Ari Kim",
  status: "active",
};

const profileInput = {
  tenant_id: "tenant-a",
  profile_id: "profile-001",
  employee_id: "emp-001",
  employment_type: "full_time",
  status: "active",
  title: "Counsel",
  effective_from: "2026-06-20",
};

test("SQL HRX repository roundtrips Employee and EmploymentProfile through store port", () => {
  const { repository, store } = createDurableRepo();
  const employee = repository.createEmployee(employeeInput);
  assert.equal(employee.created_at, "2026-06-20T00:00:00.000Z");
  assert.equal(repository.getEmployee({ tenant_id: "tenant-a", employee_id: "emp-001" }).display_name, "Ari Kim");

  const profile = repository.createEmploymentProfile(profileInput);
  assert.equal(profile.employee_id, "emp-001");
  assert.equal(repository.listEmploymentProfiles({ tenant_id: "tenant-a", employee_id: "emp-001" }).length, 1);

  const updated = repository.updateEmployee(
    { tenant_id: "tenant-a", employee_id: "emp-001" },
    { display_name: "Ari K.", status: "on_leave" },
  );
  assert.equal(updated.status, "on_leave");
  assert.equal(repository.updateEmploymentProfile({ tenant_id: "tenant-a", profile_id: "profile-001" }, { title: "Senior Counsel" }).title, "Senior Counsel");
  assert.equal(repository.deleteEmploymentProfile({ tenant_id: "tenant-a", profile_id: "profile-001" }), true);
  assert.equal(repository.deleteEmployee({ tenant_id: "tenant-a", employee_id: "emp-001" }), true);
  store.close();
});

test("SQL HRX repository persists EmployeeUserLink login mapping only", () => {
  const { repository, store } = createDurableRepo();
  repository.createEmployee(employeeInput);
  const link = repository.createEmployeeUserLink({
    tenant_id: "tenant-a",
    link_id: "link-001",
    employee_id: "emp-001",
    user_id: "user-001",
    purpose: "login_mapping",
  });
  assert.equal(link.purpose, "login_mapping");
  assert.equal(repository.listEmployeeUserLinks({ tenant_id: "tenant-a", employee_id: "emp-001" }).length, 1);
  assert.throws(
    () =>
      repository.createEmployeeUserLink({
        tenant_id: "tenant-a",
        link_id: "link-002",
        employee_id: "emp-001",
        user_id: "emp-001",
        purpose: "login_mapping",
      }),
    /identifiers must remain separate/,
  );
  assert.throws(
    () =>
      repository.createEmployeeUserLink({
        tenant_id: "tenant-a",
        link_id: "link-003",
        employee_id: "emp-001",
        user_id: "user-003",
        purpose: "payroll_identity",
      }),
    /purpose must be login_mapping/,
  );
  assert.equal(repository.revokeEmployeeUserLink({ tenant_id: "tenant-a", link_id: "link-001" }), true);
  store.close();
});

test("SQL HRX repository rolls back failed transaction", () => {
  const { repository, store } = createDurableRepo();
  assert.throws(
    () =>
      repository.transaction((tx) => {
        tx.createEmployee(employeeInput);
        tx.createEmploymentProfile({ ...profileInput, employee_id: "missing-employee" });
      }),
    /employee not found/,
  );
  assert.equal(repository.listEmployees({ tenant_id: "tenant-a" }).length, 0);
  store.close();
});
