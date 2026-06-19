export const HRX_REPORTING_LINE_TYPES = Object.freeze(["solid", "dotted"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createHrxReportingLine(input = {}) {
  const lineType = requiredString(input, "line_type");
  if (!HRX_REPORTING_LINE_TYPES.includes(lineType)) {
    throw new TypeError(`line_type must be one of ${HRX_REPORTING_LINE_TYPES.join(", ")}`);
  }
  const employeeId = requiredString(input, "employee_id");
  const managerEmployeeId = requiredString(input, "manager_employee_id");
  if (employeeId === managerEmployeeId) throw new TypeError("employee_id must not equal manager_employee_id");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    reporting_line_id: requiredString(input, "reporting_line_id"),
    employee_id: employeeId,
    manager_employee_id: managerEmployeeId,
    line_type: lineType,
    effective_from: requiredString(input, "effective_from"),
    effective_to: input.effective_to ?? null,
  });
}
