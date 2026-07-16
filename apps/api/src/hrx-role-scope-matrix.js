const EMPLOYEE_SCOPES = Object.freeze([
  "hrx.employee.read",
  "hrx.document.read",
  "hrx.leave.read",
  "hrx.leave.write",
  "hrx.leave.self.read",
  "hrx.leave.self.write",
  "hrx.payroll.self.read",
  "hrx.payroll.statement.self.read",
]);

const MANAGER_SCOPES = Object.freeze([
  ...EMPLOYEE_SCOPES,
  "hrx.approval.read",
  "hrx.approval.write",
  "hrx.leave.team.read",
  "hrx.leave.approve",
  "hrx.legal_people.read",
  "hrx.analytics.read",
  "hrx.ai.assistant",
  "hrx.ai.review.read",
]);

const HR_SCOPES = Object.freeze([
  ...MANAGER_SCOPES,
  "hrx.employee.write",
  "hrx.document.write",
  "hrx.attendance.read",
  "hrx.attendance.write",
  "hrx.overtime.read",
  "hrx.overtime.write",
  "hrx.risk.read",
  "hrx.risk.write",
  "hrx.candidate.read",
  "hrx.candidate.write",
  "hrx.lifecycle.read",
  "hrx.lifecycle.write",
  "hrx.policy.read",
  "hrx.policy.write",
  "hrx.leave.policy.read",
  "hrx.leave.policy.write",
  "hrx.leave.accrual.read",
  "hrx.leave.accrual.write",
  "hrx.leave.accrual.preview",
  "hrx.leave.accrual.execute",
  "hrx.leave.ledger.adjust",
  "hrx.leave.promotion.manage",
  "hrx.leave.report.export",
  "hrx.leave.termination.settle",
  "hrx.payroll.items.read",
  "hrx.payroll.items.write",
  "hrx.payroll.profiles.read",
  "hrx.payroll.profiles.write",
  "hrx.payroll.time-inputs.read",
  "hrx.payroll.time-inputs.write",
]);

const PAYROLL_PREPARER_SCOPES = Object.freeze([
  "hrx.compensation.read",
  "hrx.payroll.items.read",
  "hrx.payroll.profiles.read",
  "hrx.payroll.time-inputs.read",
  "hrx.payroll.preview",
  "hrx.payroll.export",
  "hrx.payroll.statement.manage",
  "hrx.payroll.payment.prepare",
  "hrx.payroll.filing.prepare",
]);

const PAYROLL_APPROVER_SCOPES = Object.freeze([
  "hrx.payroll.items.read",
  "hrx.payroll.profiles.read",
  "hrx.payroll.time-inputs.read",
  "hrx.payroll.preview",
  "hrx.payroll.approve",
  "hrx.payroll.payment.approve",
  "hrx.payroll.filing.submit",
]);

const AUDITOR_SCOPES = Object.freeze(["hrx.audit.read"]);

function unique(values) {
  return Object.freeze([...new Set(values)]);
}

function profile(profileId, scopes) {
  return Object.freeze({ profile_id: profileId, scopes: unique(scopes) });
}

export const HRX_ROLE_SCOPE_PROFILES = Object.freeze({
  employee: profile("employee", EMPLOYEE_SCOPES),
  manager: profile("manager", MANAGER_SCOPES),
  hr: profile("hr", HR_SCOPES),
  payroll_preparer: profile("payroll_preparer", PAYROLL_PREPARER_SCOPES),
  payroll_approver: profile("payroll_approver", PAYROLL_APPROVER_SCOPES),
  auditor: profile("auditor", AUDITOR_SCOPES),
  admin: profile("admin", [
    ...HR_SCOPES,
    ...PAYROLL_PREPARER_SCOPES,
    ...PAYROLL_APPROVER_SCOPES,
    ...AUDITOR_SCOPES,
    "hrx.audit.append",
    "hrx.analytics.export",
    "hrx.compensation.write",
    "hrx.evaluation.read",
    "hrx.evaluation.review",
    "hrx.evaluation.write",
  ]),
});

export function listHrxRoleScopeProfiles() {
  return Object.freeze(Object.values(HRX_ROLE_SCOPE_PROFILES));
}

export function hrxScopesForRoleProfile(profileId) {
  const profileRef = HRX_ROLE_SCOPE_PROFILES[profileId];
  if (!profileRef) throw new TypeError(`Unknown HRX role profile: ${profileId}`);
  return profileRef.scopes;
}

export function hrxRoleProfileAllowsPolicy(profileId, routePolicy) {
  if (!routePolicy?.required_scope) return false;
  return hrxScopesForRoleProfile(profileId).includes(routePolicy.required_scope);
}
