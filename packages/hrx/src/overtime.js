export const HRX_OVERTIME_STATES = Object.freeze(["submitted", "approved", "rejected", "cancelled", "exported"]);

const OVERTIME_TRANSITIONS = Object.freeze({
  submitted: Object.freeze(["approved", "rejected", "cancelled"]),
  approved: Object.freeze(["exported"]),
  rejected: Object.freeze([]),
  cancelled: Object.freeze([]),
  exported: Object.freeze([]),
});

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function requiredHours(input, field) {
  const value = input?.[field];
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${field} must be a finite number greater than 0`);
  }
  return value;
}

export function createOvertimeRequest(input = {}) {
  const state = input.state ?? "submitted";
  if (!HRX_OVERTIME_STATES.includes(state)) throw new TypeError(`state must be one of ${HRX_OVERTIME_STATES.join(", ")}`);
  if (state === "approved" && !input.approver_id) throw new TypeError("approver_id is required for approved overtime");
  if (state === "exported" && !input.export_ref) throw new TypeError("export_ref is required for exported overtime");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    overtime_id: requiredString(input, "overtime_id"),
    employee_id: requiredString(input, "employee_id"),
    work_date: requiredString(input, "work_date"),
    hours: requiredHours(input, "hours"),
    reason: requiredString(input, "reason"),
    state,
    submitted_at: input.submitted_at ?? new Date().toISOString(),
    approver_id: input.approver_id ?? null,
    decided_at: input.decided_at ?? null,
    export_ref: input.export_ref ?? null,
  });
}

export function transitionOvertimeRequest(request = {}, change = {}) {
  const current = createOvertimeRequest(request);
  const nextState = change.state ?? current.state;
  if (nextState !== current.state && !(OVERTIME_TRANSITIONS[current.state] ?? []).includes(nextState)) {
    throw new TypeError(`OvertimeRequest cannot transition from ${current.state} to ${nextState}`);
  }
  if (nextState === "approved" && !change.approver_id && !current.approver_id) {
    throw new TypeError("approver_id is required for approved overtime");
  }
  return createOvertimeRequest({
    ...current,
    ...change,
    decided_at: ["approved", "rejected", "cancelled"].includes(nextState)
      ? change.decided_at ?? new Date().toISOString()
      : current.decided_at,
  });
}

export function createOvertimeExportRecord(request = {}, input = {}) {
  const overtime = createOvertimeRequest(request);
  if (overtime.state !== "approved") throw new TypeError("OvertimeRequest must be approved before export");
  const exportRef = requiredString(input, "export_ref");
  return Object.freeze({
    tenant_id: overtime.tenant_id,
    export_ref: exportRef,
    overtime_id: overtime.overtime_id,
    employee_id: overtime.employee_id,
    hours: overtime.hours,
    work_date: overtime.work_date,
    calculation_runtime: false,
    human_review_required: true,
    source_ref: `OvertimeRequest:${overtime.overtime_id}`,
  });
}
