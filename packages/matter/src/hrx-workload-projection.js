function numberValue(value) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function cleanId(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function emptyProjection(tenantId, employeeId) {
  return {
    tenant_id: tenantId,
    employee_id: employeeId,
    matter_count: 0,
    total_hours: 0,
    billable_hours: 0,
    non_billable_hours: 0,
    capacity_pct: 0,
  };
}

export function createHrxMatterWorkloadProjection({ tenant_id, assignments = [] } = {}) {
  const tenantId = cleanId(tenant_id, "tenant_id");
  const byEmployee = new Map();
  for (const assignment of assignments) {
    if (assignment.tenant_id !== tenantId) continue;
    const employeeId = cleanId(assignment.employee_id, "employee_id");
    const current = byEmployee.get(employeeId) ?? emptyProjection(tenantId, employeeId);
    current.matter_count += assignment.matter_id ? 1 : 0;
    current.total_hours += numberValue(assignment.hours);
    if (assignment.billable === false) current.non_billable_hours += numberValue(assignment.hours);
    else current.billable_hours += numberValue(assignment.hours);
    current.capacity_pct += numberValue(assignment.capacity_pct);
    byEmployee.set(employeeId, current);
  }
  return Object.freeze(
    [...byEmployee.values()].map((item) =>
      Object.freeze({
        ...item,
        total_hours: Number(item.total_hours.toFixed(2)),
        billable_hours: Number(item.billable_hours.toFixed(2)),
        non_billable_hours: Number(item.non_billable_hours.toFixed(2)),
        capacity_pct: Number(item.capacity_pct.toFixed(2)),
      }),
    ),
  );
}
