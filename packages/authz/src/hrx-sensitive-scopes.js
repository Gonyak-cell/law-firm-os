export const HRX_SENSITIVE_SCOPE_GROUPS = Object.freeze({
  employee: Object.freeze(["hrx.employee.read", "hrx.employee.write"]),
  document: Object.freeze(["hrx.document.read", "hrx.document.write"]),
  compensation: Object.freeze(["hrx.compensation.read", "hrx.compensation.write"]),
  evaluation: Object.freeze(["hrx.evaluation.read", "hrx.evaluation.review", "hrx.evaluation.write"]),
  candidate: Object.freeze(["hrx.candidate.read", "hrx.candidate.write"]),
  payroll: Object.freeze(["hrx.payroll.preview", "hrx.payroll.export"]),
  audit: Object.freeze(["hrx.audit.read", "hrx.audit.append"]),
});

export const HRX_SENSITIVE_SCOPES = Object.freeze(Object.values(HRX_SENSITIVE_SCOPE_GROUPS).flat());

export const HRX_SENSITIVITY_REQUIRED_SCOPES = Object.freeze({
  employee: "hrx.employee.read",
  document: "hrx.document.read",
  compensation: "hrx.compensation.read",
  evaluation: "hrx.evaluation.read",
  candidate: "hrx.candidate.read",
  payroll: "hrx.payroll.preview",
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
