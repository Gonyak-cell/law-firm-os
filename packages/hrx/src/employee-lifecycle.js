import { createEmployee } from "./schema.js";

export const HRX_EMPLOYEE_OPERATIONAL_STATUSES = Object.freeze([
  "onboarding",
  "probation",
  "active",
  "on_leave",
  "notice",
  "terminated",
]);

export const HRX_EMPLOYEE_STATUS_TRANSITIONS = Object.freeze({
  onboarding: Object.freeze(["probation", "active", "terminated"]),
  probation: Object.freeze(["active", "on_leave", "notice", "terminated"]),
  active: Object.freeze(["on_leave", "notice", "terminated"]),
  on_leave: Object.freeze(["active", "notice", "terminated"]),
  notice: Object.freeze(["active", "terminated"]),
  terminated: Object.freeze([]),
});

function isOperationalStatus(status) {
  return HRX_EMPLOYEE_OPERATIONAL_STATUSES.includes(status);
}

export function transitionEmployee(employee = {}, change = {}) {
  const nextStatus = change.status ?? employee.status;
  if (!isOperationalStatus(nextStatus)) {
    throw new TypeError(`Employee status must be one of: ${HRX_EMPLOYEE_OPERATIONAL_STATUSES.join(", ")}`);
  }
  if (nextStatus !== employee.status) {
    const allowed = HRX_EMPLOYEE_STATUS_TRANSITIONS[employee.status] ?? [];
    if (!allowed.includes(nextStatus)) {
      throw new TypeError(`Employee cannot transition from ${employee.status} to ${nextStatus}`);
    }
  }
  return createEmployee({
    ...employee,
    ...change,
    tenant_id: employee.tenant_id,
    employee_id: employee.employee_id,
  });
}

export function createEmployeeStatusChangeEvent(employee = {}, change = {}) {
  return Object.freeze({
    event_type: "hrx.employee.status.changed",
    tenant_id: employee.tenant_id,
    employee_id: employee.employee_id,
    from_status: employee.status,
    to_status: change.status ?? employee.status,
    reason: change.reason ?? "employee_status_updated",
  });
}
