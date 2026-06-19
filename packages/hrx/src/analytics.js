function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function tenantRows(rows, tenantId) {
  return (Array.isArray(rows) ? rows : []).filter((row) => row.tenant_id === tenantId);
}

function countBy(rows, field) {
  const counts = {};
  for (const row of rows) {
    const key = row[field] ?? "unknown";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.freeze(counts);
}

function ratio(numerator, denominator) {
  if (denominator === 0) return 0;
  return Number(((numerator / denominator) * 100).toFixed(2));
}

export function createHrxPeopleAnalyticsReadModel(input = {}) {
  const tenantId = requiredString(input, "tenant_id");
  const employees = tenantRows(input.employees, tenantId);
  const leaveRequests = tenantRows(input.leave_requests, tenantId);
  const applications = tenantRows(input.applications, tenantId);
  const workload = tenantRows(input.workload_projection, tenantId);
  const activeEmployees = employees.filter((employee) => employee.status === "active");
  const terminatedEmployees = employees.filter((employee) => ["terminated", "inactive"].includes(employee.status));
  const approvedLeave = leaveRequests.filter((request) => request.state === "approved");

  return Object.freeze({
    tenant_id: tenantId,
    generated_from: "hrx_runtime_read_model",
    row_level_details_included: false,
    headcount: Object.freeze({
      total: employees.length,
      active: activeEmployees.length,
      on_leave: employees.filter((employee) => employee.status === "on_leave").length,
      terminated: terminatedEmployees.length,
      by_status: countBy(employees, "status"),
    }),
    leave: Object.freeze({
      total_requests: leaveRequests.length,
      approved_requests: approvedLeave.length,
      pending_requests: leaveRequests.filter((request) => ["submitted", "pending"].includes(request.state)).length,
      approved_hours: approvedLeave.reduce((sum, request) => sum + Number(request.amount ?? 0), 0),
    }),
    turnover: Object.freeze({
      terminated_count: terminatedEmployees.length,
      turnover_rate_pct: ratio(terminatedEmployees.length, employees.length),
    }),
    recruiting_funnel: Object.freeze({
      total_applications: applications.length,
      by_stage: countBy(applications, "stage"),
      offer_count: applications.filter((application) => application.stage === "offer").length,
      hired_count: applications.filter((application) => application.stage === "hired").length,
    }),
    workload: Object.freeze({
      employee_count: workload.length,
      total_hours: Number(workload.reduce((sum, row) => sum + Number(row.total_hours ?? 0), 0).toFixed(2)),
      average_capacity_pct: workload.length === 0
        ? 0
        : Number((workload.reduce((sum, row) => sum + Number(row.capacity_pct ?? 0), 0) / workload.length).toFixed(2)),
    }),
  });
}
