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
    workload_source: "time_entry_aggregation",
    time_entry_count: 0,
    matter_count: 0,
    total_hours: 0,
    billable_hours: 0,
    non_billable_hours: 0,
    capacity_pct: 0,
    leave_deadline_conflict_count: 0,
    leave_deadline_conflicts: [],
  };
}

function dateKey(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.slice(0, 10);
}

function dateInRange(date, start, end) {
  const day = dateKey(date);
  const startDay = dateKey(start);
  const endDay = dateKey(end);
  if (!day || !startDay || !endDay) return false;
  return day >= startDay && day <= endDay;
}

function employeeIdForTimeEntry(entry) {
  return entry.employee_id ?? entry.actor_id ?? entry.user_id;
}

function addConflictRows({ projections, tenantId, leaveRequests, deadlines }) {
  const activeLeave = leaveRequests
    .filter((request) => request.tenant_id === tenantId)
    .filter((request) => !["rejected", "cancelled"].includes(request.state))
    .filter((request) => request.employee_id && request.start_date && request.end_date);

  for (const deadline of deadlines) {
    if (deadline.tenant_id !== tenantId || !deadline.employee_id || !deadline.due_date) continue;
    const projection = projections.get(deadline.employee_id);
    if (!projection) continue;
    const overlaps = activeLeave.filter((request) =>
      request.employee_id === deadline.employee_id &&
      dateInRange(deadline.due_date, request.start_date, request.end_date)
    );
    for (const request of overlaps) {
      projection.leave_deadline_conflicts.push(Object.freeze({
        conflict_id: `${deadline.deadline_id}:${request.request_id}`,
        deadline_id: deadline.deadline_id,
        leave_request_id: request.request_id,
        conflict_date: dateKey(deadline.due_date),
        conflict_type: "leave_deadline_overlap",
        warning_only: true,
      }));
    }
  }
}

export function createHrxMatterWorkloadProjection({
  tenant_id,
  time_entries = [],
  leave_requests = [],
  deadlines = [],
  assignments = [],
  default_capacity_hours = 40,
} = {}) {
  const tenantId = cleanId(tenant_id, "tenant_id");
  const byEmployee = new Map();
  const timeEntriesForTenant = time_entries.filter((entry) => entry.tenant_id === tenantId);

  for (const entry of timeEntriesForTenant) {
    const employeeId = cleanId(employeeIdForTimeEntry(entry), "employee_id");
    const current = byEmployee.get(employeeId) ?? emptyProjection(tenantId, employeeId);
    const hours = numberValue(entry.duration_minutes) / 60;
    current.time_entry_count += 1;
    if (!current.matter_ids) current.matter_ids = new Set();
    if (entry.matter_id) current.matter_ids.add(entry.matter_id);
    current.total_hours += hours;
    if (entry.billable === false) current.non_billable_hours += hours;
    else current.billable_hours += hours;
    current.capacity_pct = default_capacity_hours > 0 ? (current.total_hours / default_capacity_hours) * 100 : 0;
    byEmployee.set(employeeId, current);
  }

  if (timeEntriesForTenant.length === 0) for (const assignment of assignments) {
    if (assignment.tenant_id !== tenantId) continue;
    const employeeId = cleanId(assignment.employee_id, "employee_id");
    const current = byEmployee.get(employeeId) ?? emptyProjection(tenantId, employeeId);
    current.workload_source = "assignment_fallback";
    current.matter_count += assignment.matter_id ? 1 : 0;
    current.total_hours += numberValue(assignment.hours);
    if (assignment.billable === false) current.non_billable_hours += numberValue(assignment.hours);
    else current.billable_hours += numberValue(assignment.hours);
    current.capacity_pct += numberValue(assignment.capacity_pct);
    byEmployee.set(employeeId, current);
  }

  addConflictRows({ projections: byEmployee, tenantId, leaveRequests: leave_requests, deadlines });

  return Object.freeze(
    [...byEmployee.values()].map((item) =>
      Object.freeze({
        tenant_id: item.tenant_id,
        employee_id: item.employee_id,
        workload_source: item.workload_source,
        time_entry_count: item.time_entry_count,
        matter_count: item.matter_ids ? item.matter_ids.size : item.matter_count,
        total_hours: Number(item.total_hours.toFixed(2)),
        billable_hours: Number(item.billable_hours.toFixed(2)),
        non_billable_hours: Number(item.non_billable_hours.toFixed(2)),
        capacity_pct: Number(item.capacity_pct.toFixed(2)),
        leave_deadline_conflict_count: item.leave_deadline_conflicts.length,
        leave_deadline_conflicts: Object.freeze(item.leave_deadline_conflicts),
      }),
    ),
  );
}
