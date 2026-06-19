import assert from "node:assert/strict";
import test from "node:test";
import {
  assertEmployeeUserSeparation,
  createLoginMapping,
  HRX_EMPLOYEE_USER_LINK_PURPOSE,
  validateLoginMapping,
} from "../src/identity-link.js";

test("login mapping links Employee to IAM User without conflating identifiers", () => {
  const link = createLoginMapping({
    tenant_id: "tenant-a",
    link_id: "link-001",
    employee_id: "emp-001",
    user_id: "user-001",
  });
  assert.equal(link.purpose, HRX_EMPLOYEE_USER_LINK_PURPOSE);
  assert.equal(link.employee_id, "emp-001");
  assert.equal(link.user_id, "user-001");
});

test("identity-link rejects same Employee and IAM User identifiers", () => {
  assert.throws(
    () =>
      assertEmployeeUserSeparation({
        employee_id: "same-id",
        user_id: "same-id",
        purpose: "login_mapping",
      }),
    /must remain separate/,
  );

  const validation = validateLoginMapping({
    tenant_id: "tenant-a",
    link_id: "link-002",
    employee_id: "same-id",
    user_id: "same-id",
  });
  assert.equal(validation.ok, false);
  assert.match(validation.errors.join("\n"), /must remain separate/);
});

test("identity-link allows login_mapping purpose only", () => {
  assert.throws(
    () =>
      createLoginMapping({
        tenant_id: "tenant-a",
        link_id: "link-003",
        employee_id: "emp-003",
        user_id: "user-003",
        purpose: "permission_grant",
      }),
    /purpose must be login_mapping/,
  );
});
