export const HRX_SENSITIVE_SCOPE_GROUPS = Object.freeze({
  employee: Object.freeze(["hrx.employee.read", "hrx.employee.write"]),
  document: Object.freeze(["hrx.document.read", "hrx.document.write"]),
  attendance: Object.freeze(["hrx.attendance.read", "hrx.attendance.write"]),
  overtime: Object.freeze(["hrx.overtime.read", "hrx.overtime.write"]),
  compensation: Object.freeze(["hrx.compensation.read", "hrx.compensation.write"]),
  evaluation: Object.freeze(["hrx.evaluation.read", "hrx.evaluation.review", "hrx.evaluation.write"]),
  candidate: Object.freeze(["hrx.candidate.read", "hrx.candidate.write"]),
  lifecycle: Object.freeze(["hrx.lifecycle.read", "hrx.lifecycle.write"]),
  leave: Object.freeze([
    "hrx.leave.self.read",
    "hrx.leave.self.write",
    "hrx.leave.team.read",
    "hrx.leave.approve",
    "hrx.leave.policy.read",
    "hrx.leave.policy.write",
    "hrx.leave.accrual.execute",
    "hrx.leave.ledger.adjust",
    "hrx.leave.promotion.manage",
    "hrx.leave.report.export",
    "hrx.leave.termination.settle",
  ]),
  payroll: Object.freeze([
    "hrx.payroll.preview",
    "hrx.payroll.approve",
    "hrx.payroll.export",
    "hrx.payroll.statement.self.read",
    "hrx.payroll.statement.manage",
    "hrx.payroll.payment.prepare",
    "hrx.payroll.payment.approve",
    "hrx.payroll.filing.prepare",
    "hrx.payroll.filing.submit",
  ]),
  analytics: Object.freeze(["hrx.analytics.read", "hrx.analytics.export"]),
  ai: Object.freeze(["hrx.ai.assistant", "hrx.ai.review.read"]),
  audit: Object.freeze(["hrx.audit.read", "hrx.audit.append"]),
});

export const HRX_SENSITIVE_SCOPES = Object.freeze(Object.values(HRX_SENSITIVE_SCOPE_GROUPS).flat());

export const HRX_SENSITIVITY_REQUIRED_SCOPES = Object.freeze({
  employee: "hrx.employee.read",
  document: "hrx.document.read",
  attendance: "hrx.attendance.read",
  overtime: "hrx.overtime.read",
  compensation: "hrx.compensation.read",
  evaluation: "hrx.evaluation.read",
  candidate: "hrx.candidate.read",
  lifecycle: "hrx.lifecycle.read",
  leave: "hrx.leave.self.read",
  payroll: "hrx.payroll.preview",
  analytics: "hrx.analytics.read",
  ai: "hrx.ai.assistant",
  audit: "hrx.audit.read",
});

export function isHrxSensitiveScope(scope) {
  return HRX_SENSITIVE_SCOPES.includes(scope);
}

export function principalHasHrxScope(principal = {}, scope) {
  return Array.isArray(principal.hrx_scopes) && principal.hrx_scopes.includes(scope);
}

export function requiredScopeForHrxSensitivity(sensitivity) {
  return HRX_SENSITIVITY_REQUIRED_SCOPES[sensitivity] ?? null;
}
