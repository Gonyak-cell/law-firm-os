export const HRX_RISK_EVENT_CATEGORIES = Object.freeze(["harassment", "discrimination", "security", "privacy", "payroll", "performance", "other"]);
export const HRX_RISK_EVENT_SEVERITIES = Object.freeze(["low", "medium", "high", "critical"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createHrxRiskEvent(input = {}) {
  const category = requiredString(input, "category");
  if (!HRX_RISK_EVENT_CATEGORIES.includes(category)) {
    throw new TypeError(`category must be one of ${HRX_RISK_EVENT_CATEGORIES.join(", ")}`);
  }
  const severity = requiredString(input, "severity");
  if (!HRX_RISK_EVENT_SEVERITIES.includes(severity)) {
    throw new TypeError(`severity must be one of ${HRX_RISK_EVENT_SEVERITIES.join(", ")}`);
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    risk_event_id: requiredString(input, "risk_event_id"),
    employee_id: input.employee_id ?? null,
    candidate_id: input.candidate_id ?? null,
    category,
    severity,
    intake_source_ref: requiredString(input, "intake_source_ref"),
    matter_id: input.matter_id ?? null,
    status: input.status ?? "open",
  });
}
