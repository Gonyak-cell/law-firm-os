import assert from "node:assert/strict";
import test from "node:test";
import {
  createEmployee,
  createEmployeeUserLink,
  createEmploymentProfile,
  HRX_CORE_SCHEMAS,
  HRX_CORE_SCHEMA_VERSION,
  validateEmployee,
  validateEmployeeUserLink,
  validateEmploymentProfile,
} from "../src/schema.js";

test("HRX core schema descriptors are exported", () => {
  assert.equal(HRX_CORE_SCHEMA_VERSION, "law-firm-os.hrx-core-schema.v0.1");
  assert.deepEqual(HRX_CORE_SCHEMAS.Employee.required, ["tenant_id", "employee_id", "display_name", "status"]);
  assert.deepEqual(HRX_CORE_SCHEMAS.EmployeeUserLink.purpose_values, ["login_mapping"]);
});

test("Employee schema preserves Employee/User separation", () => {
  const employee = createEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-001",
    display_name: "Ari Kim",
    status: "active",
  });
  assert.equal(employee.employee_id, "emp-001");
  assert.equal(employee.user_id, undefined);

  const validation = validateEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-002",
    display_name: "Bae Lee",
    status: "active",
    user_id: "user-002",
  });
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join("\n"), /Employee must not include user_id/);
});

test("EmploymentProfile schema links to Employee only", () => {
  const profile = createEmploymentProfile({
    tenant_id: "tenant-a",
    profile_id: "profile-001",
    employee_id: "emp-001",
    employment_type: "full_time",
    status: "active",
    title: "Counsel",
    effective_from: "2026-06-19",
  });
  assert.equal(profile.employee_id, "emp-001");
  assert.equal(profile.employment_type, "full_time");

  const validation = validateEmploymentProfile({
    tenant_id: "tenant-a",
    profile_id: "profile-002",
    employee_id: "emp-001",
    employment_type: "full_time",
    status: "active",
    effective_from: "2026-07-01",
    effective_to: "2026-06-30",
  });
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join("\n"), /effective_to must be on or after effective_from/);
});

test("EmployeeUserLink allows login mapping only and never conflates identifiers", () => {
  const link = createEmployeeUserLink({
    tenant_id: "tenant-a",
    link_id: "link-001",
    employee_id: "emp-001",
    user_id: "user-001",
    purpose: "login_mapping",
  });
  assert.equal(link.purpose, "login_mapping");

  const sameId = validateEmployeeUserLink({
    tenant_id: "tenant-a",
    link_id: "link-002",
    employee_id: "same-id",
    user_id: "same-id",
    purpose: "login_mapping",
  });
  assert.equal(sameId.ok, false);
  assert.match(sameId.errors.join("\n"), /employee_id must not equal user_id/);

  assert.throws(
    () =>
      createEmployeeUserLink({
        tenant_id: "tenant-a",
        link_id: "link-003",
        employee_id: "emp-003",
        user_id: "user-003",
        purpose: "permission_grant",
      }),
    /purpose must be one of: login_mapping/,
  );
});
