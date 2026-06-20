import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryHrxRepository } from "../src/repository.js";

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
  effective_from: "2026-06-19",
};

test("in-memory HRX repository roundtrips Employee CRUD", () => {
  const repo = createInMemoryHrxRepository();
  const created = repo.createEmployee(employeeInput);
  assert.equal(created.display_name, "Ari Kim");
  assert.deepEqual(repo.getEmployee({ tenant_id: "tenant-a", employee_id: "emp-001" }), created);

  const updated = repo.updateEmployee(
    { tenant_id: "tenant-a", employee_id: "emp-001" },
    { display_name: "Ari K.", status: "on_leave" },
  );
  assert.equal(updated.display_name, "Ari K.");
  assert.equal(updated.status, "on_leave");
  assert.equal(repo.listEmployees({ tenant_id: "tenant-a" }).length, 1);

  assert.equal(repo.deleteEmployee({ tenant_id: "tenant-a", employee_id: "emp-001" }), true);
  assert.equal(repo.getEmployee({ tenant_id: "tenant-a", employee_id: "emp-001" }), undefined);
});

test("in-memory HRX repository roundtrips EmploymentProfile CRUD", () => {
  const repo = createInMemoryHrxRepository();
  repo.createEmployee(employeeInput);
  const created = repo.createEmploymentProfile(profileInput);
  assert.equal(created.employee_id, "emp-001");
  assert.equal(repo.listEmploymentProfiles({ tenant_id: "tenant-a", employee_id: "emp-001" }).length, 1);

  const updated = repo.updateEmploymentProfile(
    { tenant_id: "tenant-a", profile_id: "profile-001" },
    { title: "Senior Counsel", status: "on_leave" },
  );
  assert.equal(updated.title, "Senior Counsel");
  assert.equal(updated.status, "on_leave");

  assert.equal(repo.deleteEmploymentProfile({ tenant_id: "tenant-a", profile_id: "profile-001" }), true);
  assert.equal(repo.deleteEmployee({ tenant_id: "tenant-a", employee_id: "emp-001" }), true);
});

test("in-memory HRX repository enforces Employee/Profile boundaries", () => {
  const repo = createInMemoryHrxRepository();
  assert.throws(() => repo.createEmploymentProfile(profileInput), /employee not found/);
  repo.createEmployee(employeeInput);
  repo.createEmploymentProfile(profileInput);
  assert.throws(
    () => repo.deleteEmployee({ tenant_id: "tenant-a", employee_id: "emp-001" }),
    /cannot be deleted while EmploymentProfile rows exist/,
  );
  assert.throws(
    () => repo.updateEmployee({ tenant_id: "tenant-a", employee_id: "emp-001" }, { user_id: "user-001" }),
    /must not include user_id/,
  );
});

test("in-memory HRX repository supports EmployeeUserLink lifecycle without identity conflation", () => {
  const repo = createInMemoryHrxRepository();
  repo.createEmployee(employeeInput);
  const link = repo.createEmployeeUserLink({
    tenant_id: "tenant-a",
    link_id: "link-001",
    employee_id: "emp-001",
    user_id: "iam-user-001",
  });
  assert.equal(link.purpose, "login_mapping");
  assert.equal(repo.listEmployeeUserLinks({ tenant_id: "tenant-a", employee_id: "emp-001" }).length, 1);
  assert.throws(
    () =>
      repo.createEmployeeUserLink({
        tenant_id: "tenant-a",
        link_id: "link-002",
        employee_id: "emp-001",
        user_id: "emp-001",
      }),
    /must remain separate/,
  );
  assert.equal(repo.revokeEmployeeUserLink({ tenant_id: "tenant-a", link_id: "link-001" }), true);
});
