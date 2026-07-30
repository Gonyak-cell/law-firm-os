import assert from "node:assert/strict";
import test from "node:test";
import {
  LAWOS_CLIENT_SCOPES,
  LAWOS_FINANCE_SCOPES,
  LAWOS_INTERNAL_ROLE_ASSIGNMENTS,
  resolveLawosUserRoleAssignment,
} from "../src/production-lawos-role-registry.js";

test("production role registry contains no static assignments", () => {
  assert.deepEqual(LAWOS_INTERNAL_ROLE_ASSIGNMENTS, []);
});

test("production role registry derives only an active exact-tenant PostgreSQL membership", () => {
  const user = {
    user_id: "opaque-user-id",
    directory_source: "postgres-v2",
    tenant_memberships: [{
      tenant_id: "tenant-approved",
      status: "active",
      role_profile_id: "attorney",
      role_ids: ["attorney"],
      group_ids: ["legal"],
      scopes: ["matter.read"],
      hrx_scopes: ["hrx.profile.read"],
      source_ref: "approved-migration",
    }],
  };
  const assignment = resolveLawosUserRoleAssignment(user, {
    tenantId: "tenant-approved",
  });
  assert.equal(assignment.user_id, "opaque-user-id");
  assert.deepEqual(assignment.role_ids, ["attorney"]);
  assert.equal(assignment.tenant_membership.tenant_id, "tenant-approved");
  assert.equal(
    resolveLawosUserRoleAssignment(user, { tenantId: "tenant-other" }),
    null,
  );
});

test("production role registry restores finance scopes only for the verified highest-privilege system administrator", () => {
  const membership = {
    tenant_id: "tenant-approved",
    status: "active",
    role_profile_id: "system-admin",
    role_ids: ["system_super_admin"],
    group_ids: ["system-admins"],
    scopes: ["matter.read"],
    hrx_scopes: [],
    source_ref: "approved-migration",
  };
  const assignment = resolveLawosUserRoleAssignment({
    user_id: "opaque-highest-user-id",
    directory_source: "postgres-v2",
    highest_privilege: true,
    tenant_memberships: [membership],
  }, {
    tenantId: "tenant-approved",
  });
  assert.ok(assignment.scopes.includes("matter.read"));
  for (const scope of LAWOS_FINANCE_SCOPES) {
    assert.ok(assignment.scopes.includes(scope), `${scope} must be restored`);
  }
  for (const scope of LAWOS_CLIENT_SCOPES) {
    assert.ok(assignment.scopes.includes(scope), `${scope} must be restored`);
  }

  for (const user of [
    {
      user_id: "opaque-non-highest-admin-id",
      highest_privilege: false,
      tenant_memberships: [membership],
    },
    {
      user_id: "opaque-highest-non-system-admin-id",
      highest_privilege: true,
      tenant_memberships: [{
        ...membership,
        role_ids: ["tenant_admin"],
      }],
    },
  ]) {
    const ordinary = resolveLawosUserRoleAssignment(user, {
      tenantId: "tenant-approved",
    });
    assert.deepEqual(ordinary.scopes, ["matter.read"]);
  }
});
