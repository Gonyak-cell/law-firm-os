import assert from "node:assert/strict";
import test from "node:test";
import {
  assertEmployeeUserSeparation,
  createLoginMapping,
  HRX_EMPLOYEE_USER_LINK_PURPOSE,
  resolveUniqueEmployeeUserLink,
  resolveUniqueUserForEmployee,
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

test("identity-link resolves a legacy user only when exactly one tenant link exists", () => {
  const links = [
    { tenant_id: "tenant-a", link_id: "link-a", user_id: "user-1", employee_id: "emp-1" },
    { tenant_id: "tenant-b", link_id: "link-b", user_id: "user-1", employee_id: "emp-other" },
  ];
  assert.deepEqual(resolveUniqueEmployeeUserLink({
    tenant_id: "tenant-a",
    user_id: "user-1",
    links,
  }), {
    state: "resolved",
    employee_id: "emp-1",
    link_id: "link-a",
  });
  assert.equal(resolveUniqueEmployeeUserLink({
    tenant_id: "tenant-a",
    user_id: "user-missing",
    links,
  }).state, "unresolved_missing");
  assert.equal(resolveUniqueEmployeeUserLink({
    tenant_id: "tenant-a",
    user_id: "user-1",
    links: [...links, { tenant_id: "tenant-a", link_id: "link-a2", user_id: "user-1", employee_id: "emp-2" }],
  }).state, "unresolved_ambiguous");
});

test("identity-link ignores wrong-purpose and revoked history when resolving the active login mapping", () => {
  const active = {
    tenant_id: "tenant-a",
    link_id: "link-active",
    user_id: "user-1",
    employee_id: "emp-active",
    purpose: HRX_EMPLOYEE_USER_LINK_PURPOSE,
    status: "active",
  };
  const ignored = [
    { ...active, link_id: "link-wrong-purpose", employee_id: "emp-wrong", purpose: "permission_grant" },
    { ...active, link_id: "link-revoked-at", employee_id: "emp-old-1", revoked_at: "2026-07-01T00:00:00.000Z" },
    { ...active, link_id: "link-revoked-flag", employee_id: "emp-old-2", revoked: true },
    { ...active, link_id: "link-inactive-flag", employee_id: "emp-old-3", active: false },
    { ...active, link_id: "link-inactive-status", employee_id: "emp-old-4", status: "inactive" },
    { ...active, link_id: "link-revoked-state", employee_id: "emp-old-5", state: "revoked" },
  ];

  assert.deepEqual(resolveUniqueEmployeeUserLink({
    tenant_id: "tenant-a",
    user_id: "user-1",
    links: [active, ...ignored],
  }), {
    state: "resolved",
    employee_id: "emp-active",
    link_id: "link-active",
  });
});

test("identity-link does not resolve when only wrong-purpose or revoked links remain", () => {
  const base = {
    tenant_id: "tenant-a",
    user_id: "user-1",
    employee_id: "emp-1",
  };

  assert.equal(resolveUniqueEmployeeUserLink({
    tenant_id: "tenant-a",
    user_id: "user-1",
    links: [
      { ...base, link_id: "link-wrong", purpose: "permission_grant" },
      {
        ...base,
        link_id: "link-revoked",
        purpose: HRX_EMPLOYEE_USER_LINK_PURPOSE,
        revoked_at: "2026-07-01T00:00:00.000Z",
      },
    ],
  }).state, "unresolved_missing");
});

test("identity-link resolves employee to a user only for one active login mapping", () => {
  const active = {
    tenant_id: "tenant-a",
    link_id: "link-active",
    user_id: "user-active",
    employee_id: "emp-1",
    purpose: HRX_EMPLOYEE_USER_LINK_PURPOSE,
  };
  const ignored = [
    { ...active, link_id: "link-wrong", user_id: "user-wrong", purpose: "permission_grant" },
    { ...active, link_id: "link-revoked", user_id: "user-old", revoked_at: "2026-07-01T00:00:00.000Z" },
    { ...active, link_id: "link-inactive", user_id: "user-inactive", status: "inactive" },
  ];

  assert.deepEqual(resolveUniqueUserForEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    links: [active, ...ignored],
  }), {
    state: "resolved",
    user_id: "user-active",
    link_id: "link-active",
  });
  assert.equal(resolveUniqueUserForEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-missing",
    links: [active],
  }).state, "unresolved_missing");
  assert.equal(resolveUniqueUserForEmployee({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    links: [active, { ...active, link_id: "link-second", user_id: "user-second" }],
  }).state, "unresolved_ambiguous");
});
