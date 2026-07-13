import assert from "node:assert/strict";
import test from "node:test";
import { listLawosInternalRoleAssignments } from "../../src/lawos-role-registry.js";

const privilegedScopes = [
  "hrx.leave.policy.write",
  "hrx.leave.accrual.execute",
  "hrx.leave.ledger.adjust",
  "hrx.leave.promotion.manage",
  "hrx.leave.report.export",
  "hrx.leave.termination.settle",
];

test("staff leave compatibility grants self service without privileged operations", () => {
  const staff = listLawosInternalRoleAssignments().find((assignment) => assignment.role_profile_id === "lawos_staff");
  assert.ok(staff);
  assert.ok(staff.hrx_scopes.includes("hrx.leave.self.read"));
  assert.ok(staff.hrx_scopes.includes("hrx.leave.self.write"));
  assert.equal(staff.hrx_scopes.includes("hrx.leave.team.read"), false);
  assert.equal(staff.hrx_scopes.includes("hrx.leave.approve"), false);
  for (const scope of privilegedScopes) assert.equal(staff.hrx_scopes.includes(scope), false, scope);
});

test("manager leave compatibility adds team approval but not HR operations", () => {
  const manager = listLawosInternalRoleAssignments().find((assignment) => assignment.role_profile_id === "lawos_partner_attorney");
  assert.ok(manager);
  assert.ok(manager.hrx_scopes.includes("hrx.leave.team.read"));
  assert.ok(manager.hrx_scopes.includes("hrx.leave.approve"));
  for (const scope of privilegedScopes) assert.equal(manager.hrx_scopes.includes(scope), false, scope);
});

test("HR and admin profiles explicitly carry privileged leave operations", () => {
  for (const roleProfileId of ["lawos_hr_operations", "lawos_admin_operations"]) {
    const assignment = listLawosInternalRoleAssignments().find((entry) => entry.role_profile_id === roleProfileId);
    assert.ok(assignment, roleProfileId);
    for (const scope of privilegedScopes) assert.ok(assignment.hrx_scopes.includes(scope), `${roleProfileId}:${scope}`);
  }
});
