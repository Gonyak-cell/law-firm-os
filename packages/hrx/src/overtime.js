export const HRX_OVERTIME_STATES = Object.freeze(["submitted", "approved", "rejected", "cancelled", "exported"]);
export const HRX_OVERTIME_RISK_TYPES = Object.freeze(["weekly_limit_exceeded", "unapproved_overtime_detected"]);
export const HRX_PAYROLL_OVERTIME_SEGMENT_KINDS = Object.freeze(["overtime", "night", "holiday", "weekly_holiday"]);

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

function wholeMinutes(value, field, { allowZero = false } = {}) {
  const minutes = Number(value);
  if (!Number.isSafeInteger(minutes) || (allowZero ? minutes < 0 : minutes <= 0)) {
    throw new TypeError(`${field} must be ${allowZero ? "a non-negative" : "a positive"} whole number of minutes`);
  }
  return minutes;
}

function minutesFromRequest(input = {}) {
  if (input.requested_minutes !== undefined && input.requested_minutes !== null) {
    return wholeMinutes(input.requested_minutes, "requested_minutes");
  }
  const minutes = requiredHours(input, "hours") * 60;
  if (!Number.isSafeInteger(minutes)) throw new TypeError("hours must resolve to positive whole minutes");
  return minutes;
}

function overtimeWarningCodes({ calculatedMinutes, requestedMinutes, approvedMinutes }) {
  const warnings = [];
  if (requestedMinutes > calculatedMinutes) warnings.push("OVERTIME_REQUEST_EXCEEDS_CALCULATED");
  if (approvedMinutes > calculatedMinutes) warnings.push("OVERTIME_APPROVAL_EXCEEDS_CALCULATED");
  return Object.freeze(warnings);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function optionalMonthMatches(workDate, month) {
  return !month || String(workDate ?? "").startsWith(`${month}-`);
}

function matchesOvertimeQuery(request, query = {}) {
  if (query.tenant_id && request.tenant_id !== query.tenant_id) return false;
  if (query.overtime_id && request.overtime_id !== query.overtime_id) return false;
  if (query.employee_id && request.employee_id !== query.employee_id) return false;
  if (query.state && request.state !== query.state) return false;
  if (query.work_date && request.work_date !== query.work_date) return false;
  if (!optionalMonthMatches(request.work_date, query.month)) return false;
  return true;
}

function sortOvertimeRequests(left, right) {
  return left.work_date.localeCompare(right.work_date) || left.overtime_id.localeCompare(right.overtime_id);
}

export function createOvertimeRequest(input = {}) {
  const state = input.state ?? "submitted";
  if (!HRX_OVERTIME_STATES.includes(state)) throw new TypeError(`state must be one of ${HRX_OVERTIME_STATES.join(", ")}`);
  if (state === "approved" && !input.approver_id) throw new TypeError("approver_id is required for approved overtime");
  if (state === "exported" && !input.export_ref) throw new TypeError("export_ref is required for exported overtime");
  const requestedMinutes = minutesFromRequest(input);
  const calculatedMinutes = wholeMinutes(
    input.calculated_minutes ?? requestedMinutes,
    "calculated_minutes",
    { allowZero: true },
  );
  const approvedMinutes = ["approved", "exported"].includes(state)
    ? wholeMinutes(input.approved_minutes ?? requestedMinutes, "approved_minutes")
    : 0;
  if (approvedMinutes > requestedMinutes) throw new TypeError("approved_minutes must not exceed requested_minutes");
  if (["approved", "exported"].includes(state) && input.approver_id === input.employee_id) {
    const error = new Error("Overtime request must be approved by another person");
    error.safe_error_code = "HRX_OVERTIME_SELF_APPROVAL";
    throw error;
  }
  const payrollSegmentKind = input.payroll_segment_kind ?? "overtime";
  if (!HRX_PAYROLL_OVERTIME_SEGMENT_KINDS.includes(payrollSegmentKind)) {
    throw new TypeError(`payroll_segment_kind must be one of ${HRX_PAYROLL_OVERTIME_SEGMENT_KINDS.join(", ")}`);
  }
  const warningCodes = overtimeWarningCodes({
    calculatedMinutes,
    requestedMinutes,
    approvedMinutes,
  });
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    overtime_id: requiredString(input, "overtime_id"),
    employee_id: requiredString(input, "employee_id"),
    work_date: requiredString(input, "work_date"),
    hours: requestedMinutes / 60,
    calculated_minutes: calculatedMinutes,
    requested_minutes: requestedMinutes,
    approved_minutes: approvedMinutes,
    reason: requiredString(input, "reason"),
    state,
    submitted_at: input.submitted_at ?? new Date().toISOString(),
    approver_id: input.approver_id ?? null,
    decided_at: input.decided_at ?? null,
    decision_reason: input.decision_reason ?? null,
    export_ref: input.export_ref ?? null,
    source_ref: input.source_ref ?? `OvertimeRequest:${requiredString(input, "overtime_id")}`,
    calculation_basis_ref: input.calculation_basis_ref ?? null,
    warning_codes_json: JSON.stringify(warningCodes),
    payroll_segment_kind: payrollSegmentKind,
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
  const approvedMinutes = ["approved", "exported"].includes(nextState)
    ? change.approved_minutes ?? (["approved", "exported"].includes(current.state) ? current.approved_minutes : current.requested_minutes)
    : 0;
  return createOvertimeRequest({
    ...current,
    ...change,
    approved_minutes: approvedMinutes,
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
    hours: overtime.approved_minutes / 60,
    calculated_minutes: overtime.calculated_minutes,
    requested_minutes: overtime.requested_minutes,
    approved_minutes: overtime.approved_minutes,
    work_date: overtime.work_date,
    calculation_runtime: false,
    human_review_required: true,
    source_ref: `OvertimeRequest:${overtime.overtime_id}`,
  });
}

function attendanceMinutes(row = {}) {
  const attendance = row ?? {};
  if (Number.isFinite(Number(attendance.recorded_hours))) {
    const minutes = Number(attendance.recorded_hours) * 60;
    if (Number.isSafeInteger(minutes) && minutes >= 0) return minutes;
  }
  if (attendance.clock_in_at && attendance.clock_out_at) {
    const elapsed = Date.parse(attendance.clock_out_at) - Date.parse(attendance.clock_in_at);
    if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed % 60_000 === 0) return elapsed / 60_000;
  }
  return 0;
}

export function calculateOvertimeReviewMinutes({
  employee_id,
  work_date,
  requested_minutes,
  hours,
  attendance_records = [],
  standard_daily_minutes = 480,
} = {}) {
  const employeeId = requiredString({ employee_id }, "employee_id");
  const workDate = requiredString({ work_date }, "work_date");
  const requestedMinutes = minutesFromRequest({ requested_minutes, hours });
  const standardDailyMinutes = wholeMinutes(standard_daily_minutes, "standard_daily_minutes");
  const effective = effectiveAttendanceRecords(attendance_records)
    .filter((row) => row.employee_id === employeeId && row.work_date === workDate)
    .sort((left, right) => `${right.updated_at ?? right.created_at ?? ""}:${right.attendance_id}`
      .localeCompare(`${left.updated_at ?? left.created_at ?? ""}:${left.attendance_id}`))[0] ?? null;
  const recordedMinutes = attendanceMinutes(effective);
  const calculatedMinutes = Math.max(0, recordedMinutes - standardDailyMinutes);
  return Object.freeze({
    calculated_minutes: calculatedMinutes,
    requested_minutes: requestedMinutes,
    calculation_basis_ref: effective?.source_ref ?? null,
    warning_codes: overtimeWarningCodes({
      calculatedMinutes,
      requestedMinutes,
      approvedMinutes: 0,
    }),
  });
}

export function createInMemoryOvertimeStore(seed = []) {
  const requests = new Map();
  const key = (tenantId, overtimeId) => `${tenantId}:${overtimeId}`;

  function create(input) {
    const request = createOvertimeRequest(input);
    const requestKey = key(request.tenant_id, request.overtime_id);
    if (requests.has(requestKey)) throw new Error(`Duplicate overtime request: ${request.overtime_id}`);
    requests.set(requestKey, clone(request));
    return Object.freeze(clone(request));
  }

  function get(ref = {}) {
    const value = requests.get(key(ref.tenant_id, ref.overtime_id));
    return value ? Object.freeze(clone(value)) : undefined;
  }

  function update(ref = {}, change = {}) {
    const existing = get(ref);
    if (!existing) throw new Error(`Overtime request not found: ${ref.overtime_id}`);
    const request = transitionOvertimeRequest(existing, change);
    requests.set(key(request.tenant_id, request.overtime_id), clone(request));
    return Object.freeze(clone(request));
  }

  for (const request of seed) create(request);

  return Object.freeze({
    create,
    get,
    update,
    list(query = {}) {
      return Object.freeze(
        [...requests.values()]
          .filter((request) => matchesOvertimeQuery(request, query))
          .sort(sortOvertimeRequests)
          .map((request) => Object.freeze(clone(request))),
      );
    },
  });
}

export function createSqlOvertimeStore({ store } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("SQL overtime store requires store.query");

  function create(input) {
    const request = createOvertimeRequest(input);
    return Object.freeze(
      store.query("insert", {
        table: "hrx_overtime_requests",
        row: { ...request, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      }),
    );
  }

  function get(ref = {}) {
    const value = store.query("selectOne", {
      table: "hrx_overtime_requests",
      where: { tenant_id: ref.tenant_id, overtime_id: ref.overtime_id },
    });
    return value ? Object.freeze(clone(value)) : undefined;
  }

  function update(ref = {}, change = {}) {
    const existing = get(ref);
    if (!existing) throw new Error(`Overtime request not found: ${ref.overtime_id}`);
    const request = transitionOvertimeRequest(existing, change);
    return Object.freeze(
      store.query("updateOne", {
        table: "hrx_overtime_requests",
        where: { tenant_id: request.tenant_id, overtime_id: request.overtime_id },
        patch: { ...request, updated_at: new Date().toISOString() },
      }),
    );
  }

  return Object.freeze({
    create,
    get,
    update,
    list(query = {}) {
      const where = {};
      if (query.tenant_id) where.tenant_id = query.tenant_id;
      if (query.overtime_id) where.overtime_id = query.overtime_id;
      if (query.employee_id) where.employee_id = query.employee_id;
      if (query.state) where.state = query.state;
      if (query.work_date) where.work_date = query.work_date;
      return Object.freeze(
        store
          .query("select", { table: "hrx_overtime_requests", where })
          .filter((request) => matchesOvertimeQuery(request, query))
          .sort(sortOvertimeRequests)
          .map((request) => Object.freeze(clone(request))),
      );
    },
  });
}

function effectiveAttendanceRecords(attendanceRecords = []) {
  const correctedAttendanceIds = new Set(attendanceRecords.map((record) => record.correction_of_attendance_id).filter(Boolean));
  return attendanceRecords.filter((record) => !correctedAttendanceIds.has(record.attendance_id));
}

function approvedOvertimeHoursByDate(overtimeRequests = []) {
  const totals = new Map();
  for (const request of overtimeRequests.map(createOvertimeRequest)) {
    if (!["approved", "exported"].includes(request.state)) continue;
    const key = `${request.employee_id}:${request.work_date}`;
    totals.set(key, (totals.get(key) ?? 0) + request.hours);
  }
  return totals;
}

function weekStart(date) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) throw new TypeError(`Invalid work_date: ${date}`);
  const day = parsed.getUTCDay() || 7;
  parsed.setUTCDate(parsed.getUTCDate() - day + 1);
  return parsed.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

export function createWeeklyOvertimeRiskReport({
  tenant_id,
  employee_id,
  attendance_records = [],
  overtime_requests = [],
  weekly_limit_hours = 52,
  standard_daily_hours = 8,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const employeeId = requiredString({ employee_id }, "employee_id");
  const weeklyLimitHours = Number(weekly_limit_hours);
  const standardDailyHours = Number(standard_daily_hours);
  if (!Number.isFinite(weeklyLimitHours) || weeklyLimitHours <= 0) throw new TypeError("weekly_limit_hours must be a finite number greater than 0");
  if (!Number.isFinite(standardDailyHours) || standardDailyHours <= 0) throw new TypeError("standard_daily_hours must be a finite number greater than 0");
  const approvedHoursByDate = approvedOvertimeHoursByDate(overtime_requests);
  const weeklyTotals = new Map();
  const events = [];

  for (const record of effectiveAttendanceRecords(attendance_records)) {
    if (record.tenant_id !== tenantId || record.employee_id !== employeeId) continue;
    const recordedHours = typeof record.recorded_hours === "number" ? record.recorded_hours : 0;
    const start = weekStart(record.work_date);
    weeklyTotals.set(start, (weeklyTotals.get(start) ?? 0) + recordedHours);

    const approvedHours = approvedHoursByDate.get(`${record.employee_id}:${record.work_date}`) ?? 0;
    const unapprovedHours = Math.max(0, recordedHours - standardDailyHours - approvedHours);
    if (unapprovedHours > 0) {
      events.push(Object.freeze({
        risk_id: `overtime-unapproved:${employeeId}:${record.work_date}`,
        risk_type: "unapproved_overtime_detected",
        severity: "warning",
        tenant_id: tenantId,
        employee_id: employeeId,
        work_date: record.work_date,
        recorded_hours: recordedHours,
        approved_overtime_hours: approvedHours,
        excess_hours: Number(unapprovedHours.toFixed(2)),
        attendance_id: record.attendance_id,
      }));
    }
  }

  for (const [start, totalHours] of weeklyTotals.entries()) {
    const excessHours = totalHours - weeklyLimitHours;
    if (excessHours > 0) {
      events.push(Object.freeze({
        risk_id: `overtime-weekly-limit:${employeeId}:${start}`,
        risk_type: "weekly_limit_exceeded",
        severity: "high",
        tenant_id: tenantId,
        employee_id: employeeId,
        week_start: start,
        week_end: addDays(start, 6),
        weekly_limit_hours: weeklyLimitHours,
        total_recorded_hours: Number(totalHours.toFixed(2)),
        excess_hours: Number(excessHours.toFixed(2)),
      }));
    }
  }

  return Object.freeze({
    tenant_id: tenantId,
    employee_id: employeeId,
    weekly_limit_hours: weeklyLimitHours,
    standard_daily_hours: standardDailyHours,
    events: Object.freeze(events),
  });
}
