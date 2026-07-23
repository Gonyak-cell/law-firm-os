import assert from "node:assert/strict";
import test from "node:test";
import {
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
