import assert from "node:assert/strict";
import test from "node:test";
import {
  hrxRoleProfileAllowsPolicy,
  hrxScopesForRoleProfile,
  listHrxRoleScopeProfiles,
} from "../../src/hrx-role-scope-matrix.js";
import { listLawosInternalRoleAssignments } from "../../src/lawos-role-registry.js";
import { listHrxRoutePolicies, resolveHrxRoutePolicy } from "../../src/routes/hrx/route-policy-map.js";

function policy(method, pathname) {
  const resolved = resolveHrxRoutePolicy({ method, pathname });
  assert.ok(resolved, `${method} ${pathname}`);
  return resolved;
}

test("GOV-003 defines employee, manager, HR, payroll preparer, approver and auditor profiles", () => {
  assert.deepEqual(
    listHrxRoleScopeProfiles().map((profile) => profile.profile_id),
    ["employee", "manager", "hr", "payroll_preparer", "payroll_approver", "auditor", "admin"],
  );
  assert.equal(hrxScopesForRoleProfile("employee").includes("hrx.leave.approve"), false);
  assert.equal(hrxScopesForRoleProfile("manager").includes("hrx.leave.approve"), true);
  assert.equal(hrxScopesForRoleProfile("hr").includes("hrx.leave.policy.write"), true);
  assert.equal(hrxScopesForRoleProfile("hr").includes("hrx.payroll.statement.self.read"), true);
  assert.equal(hrxScopesForRoleProfile("hr").some((scope) => ["hrx.payroll.preview", "hrx.payroll.approve", "hrx.payroll.export"].includes(scope)), false);
  assert.equal(hrxScopesForRoleProfile("payroll_preparer").includes("hrx.payroll.export"), true);
  assert.equal(hrxScopesForRoleProfile("payroll_preparer").includes("hrx.payroll.approve"), false);
  assert.equal(hrxScopesForRoleProfile("payroll_approver").includes("hrx.payroll.approve"), true);
  assert.equal(hrxScopesForRoleProfile("payroll_approver").includes("hrx.payroll.export"), false);
  assert.deepEqual(hrxScopesForRoleProfile("auditor"), ["hrx.audit.read"]);
  assert.throws(() => hrxScopesForRoleProfile("unknown"), /Unknown HRX role profile/);
});

test("GOV-003 route decisions keep leave administration and payroll duties separated", () => {
  const self = policy("GET", "/api/hrx/leave/me");
  const team = policy("GET", "/api/hrx/leave/requests");
  const leavePolicyWrite = policy("POST", "/api/hrx/leave/accrual/rules");
  const payrollPreview = policy("POST", "/api/hrx/payroll/preview");
  const payrollApprove = policy("POST", "/api/hrx/payroll/approve");
  const payrollExport = policy("POST", "/api/hrx/payroll/export");
  const auditRead = policy("GET", "/api/hrx/audit");

  assert.equal(hrxRoleProfileAllowsPolicy("employee", self), true);
  assert.equal(hrxRoleProfileAllowsPolicy("employee", team), false);
  assert.equal(hrxRoleProfileAllowsPolicy("manager", team), true);
  assert.equal(hrxRoleProfileAllowsPolicy("manager", leavePolicyWrite), false);
  assert.equal(hrxRoleProfileAllowsPolicy("hr", leavePolicyWrite), true);
  assert.equal(hrxRoleProfileAllowsPolicy("hr", payrollPreview), false);
  assert.equal(hrxRoleProfileAllowsPolicy("payroll_preparer", payrollPreview), true);
  assert.equal(hrxRoleProfileAllowsPolicy("payroll_preparer", payrollApprove), false);
  assert.equal(hrxRoleProfileAllowsPolicy("payroll_preparer", payrollExport), true);
  assert.equal(hrxRoleProfileAllowsPolicy("payroll_approver", payrollPreview), true);
  assert.equal(hrxRoleProfileAllowsPolicy("payroll_approver", payrollApprove), true);
  assert.equal(hrxRoleProfileAllowsPolicy("payroll_approver", payrollExport), false);
  assert.equal(hrxRoleProfileAllowsPolicy("auditor", auditRead), true);
  assert.equal(hrxRoleProfileAllowsPolicy("auditor", payrollPreview), false);
});

test("GOV-003 covers every leave, payroll and audit route with at least one allow and one deny", () => {
  const profiles = listHrxRoleScopeProfiles();
  const policies = listHrxRoutePolicies().filter((entry) => ["leave", "payroll", "audit"].includes(entry.sensitivity));
  assert.ok(policies.length > 0);
  for (const routePolicy of policies) {
    const decisions = profiles.map((profile) => hrxRoleProfileAllowsPolicy(profile.profile_id, routePolicy));
    assert.ok(decisions.includes(true), `${routePolicy.id} must have an allowed profile`);
    assert.ok(decisions.includes(false), `${routePolicy.id} must have a denied profile`);
  }
});

test("GOV-003 maps live LawOS profiles to the canonical matrix without staff privilege escalation", () => {
  const assignments = listLawosInternalRoleAssignments();
  const staff = assignments.find((entry) => entry.role_profile_id === "lawos_staff");
  const manager = assignments.find((entry) => entry.role_profile_id === "lawos_partner_attorney");
  const hr = assignments.find((entry) => entry.role_profile_id === "lawos_hr_operations");
  const admin = assignments.find((entry) => entry.role_profile_id === "lawos_admin_operations");
  assert.deepEqual(staff.hrx_scopes, hrxScopesForRoleProfile("employee"));
  assert.deepEqual(manager.hrx_scopes, hrxScopesForRoleProfile("manager"));
  assert.deepEqual(hr.hrx_scopes, hrxScopesForRoleProfile("hr"));
  assert.deepEqual(admin.hrx_scopes, hrxScopesForRoleProfile("admin"));
  assert.equal(staff.hrx_scopes.includes("hrx.payroll.approve"), false);
  assert.equal(admin.hrx_scopes.includes("hrx.payroll.approve"), true);
});
