import { createHash, randomUUID } from "node:crypto";

const INCLUDED_ATTENDANCE_STATUSES = new Set(["present", "remote"]);
const INCLUDED_OVERTIME_STATES = new Set(["approved", "exported"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function isoDate(input, field) {
  const value = requiredString(input, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new TypeError(`${field} must be an ISO date`);
  }
  return value;
}

function instant(input, field) {
  const value = requiredString(input, field);
  const milliseconds = Date.parse(value);
  if (Number.isNaN(milliseconds)) throw new TypeError(`${field} must be an ISO instant`);
  return Object.freeze({ value, milliseconds });
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
}

function hash(value) {
  return createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
}

function guardedError(message, safeErrorCode, status = 400) {
  const error = new Error(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function effectiveAttendance(rows) {
  const corrected = new Set(rows.map((row) => row.correction_of_attendance_id).filter(Boolean));
  const current = rows.filter((row) => !corrected.has(row.attendance_id));
  const byDate = new Map();
  for (const row of current) {
    const key = `${row.employee_id}:${row.work_date}`;
    const existing = byDate.get(key);
    if (!existing || `${existing.updated_at ?? existing.created_at ?? ""}:${existing.attendance_id}`
      < `${row.updated_at ?? row.created_at ?? ""}:${row.attendance_id}`) {
      byDate.set(key, row);
    }
  }
  return [...byDate.values()];
}

export function selectApprovedAttendance({
  attendance_records = [],
  approval_receipts = [],
  tenant_id,
  period_start,
  period_end,
  as_of,
} = {}) {
  const tenantId = requiredString({ tenant_id }, "tenant_id");
  const start = isoDate({ period_start }, "period_start");
  const end = isoDate({ period_end }, "period_end");
  if (end < start) throw new TypeError("period_end must not precede period_start");
  const cutoff = instant({ as_of }, "as_of").milliseconds;
  const attendanceAtCutoff = attendance_records.filter((row) => {
    const recordedAt = row.created_at ?? row.updated_at;
    if (!recordedAt) return true;
    const milliseconds = Date.parse(recordedAt);
    if (Number.isNaN(milliseconds)) throw new TypeError("attendance timestamp must be an ISO instant");
    return milliseconds <= cutoff;
  });
  const receipts = new Map(
    approval_receipts
      .filter((row) => row.tenant_id === tenantId && Date.parse(row.approved_at) <= cutoff)
      .map((row) => [row.attendance_id, row]),
  );
  return Object.freeze(
    effectiveAttendance(attendanceAtCutoff.filter((row) => row.tenant_id === tenantId))
      .filter((row) => row.work_date >= start && row.work_date <= end)
      .filter((row) => INCLUDED_ATTENDANCE_STATUSES.has(row.status))
      .filter((row) => receipts.get(row.attendance_id)?.attendance_source_ref === row.source_ref)
      .sort((left, right) => `${left.employee_id}:${left.work_date}:${left.attendance_id}`
        .localeCompare(`${right.employee_id}:${right.work_date}:${right.attendance_id}`)),
  );
}

function localParts(milliseconds, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(milliseconds));
  const part = (type) => parts.find((item) => item.type === type)?.value;
  return Object.freeze({ date: `${part("year")}-${part("month")}-${part("day")}`, hour: Number(part("hour")) });
}

function intervalMinutes(row, timezone, holidays) {
  const start = instant(row, "clock_in_at");
  const end = instant(row, "clock_out_at");
  const duration = end.milliseconds - start.milliseconds;
  if (duration <= 0 || duration % 60_000 !== 0) {
    throw new TypeError("attendance interval must be a positive whole number of minutes");
  }
  let night = 0;
  let holiday = 0;
  for (let cursor = start.milliseconds; cursor < end.milliseconds; cursor += 60_000) {
    const local = localParts(cursor, timezone);
    if (local.hour >= 22 || local.hour < 6) night += 1;
    if (holidays.has(local.date)) holiday += 1;
  }
  return Object.freeze({ total: duration / 60_000, night, holiday });
}

function overtimeMinutes(row) {
  const minutes = Number(row.hours) * 60;
  if (!Number.isSafeInteger(minutes) || minutes <= 0) {
    throw new TypeError("approved overtime hours must resolve to positive whole minutes");
  }
  return minutes;
}

export function projectApprovedPayrollTimeInput(input = {}) {
  const tenantId = requiredString(input, "tenant_id");
  const periodStart = isoDate(input, "period_start");
  const periodEnd = isoDate(input, "period_end");
  if (periodEnd < periodStart) throw new TypeError("period_end must not precede period_start");
  const asOf = instant(input, "as_of");
  const timezone = input.timezone ?? "Asia/Seoul";
  localParts(asOf.milliseconds, timezone);
  const holidays = new Set((input.holiday_dates ?? []).map((date) => isoDate({ date }, "date")));
  const attendance = selectApprovedAttendance({
    attendance_records: input.attendance_records,
    approval_receipts: input.approval_receipts,
    tenant_id: tenantId,
    period_start: periodStart,
    period_end: periodEnd,
    as_of: asOf.value,
  });
  const overtime = (input.overtime_requests ?? [])
    .filter((row) => row.tenant_id === tenantId)
    .filter((row) => row.work_date >= periodStart && row.work_date <= periodEnd)
    .filter((row) => INCLUDED_OVERTIME_STATES.has(row.state))
    .filter((row) => Date.parse(row.decided_at) <= asOf.milliseconds);

  const workdays = new Map();
  const target = (employeeId, workDate) => {
    const key = `${employeeId}:${workDate}`;
    if (!workdays.has(key)) {
      workdays.set(key, {
        employee_id: employeeId,
        total_minutes: 0,
        overtime_minutes: 0,
        night_minutes: 0,
        holiday_minutes: 0,
        source_refs: [],
      });
    }
    return workdays.get(key);
  };
  for (const row of attendance) {
    const interval = intervalMinutes(row, timezone, holidays);
    const totals = target(row.employee_id, row.work_date);
    totals.total_minutes += interval.total;
    totals.night_minutes += interval.night;
    totals.holiday_minutes += interval.holiday;
    totals.source_refs.push({
      object_type: "AttendanceRecord",
      object_id: row.attendance_id,
      source_ref: row.source_ref,
      source_state: "approved",
    });
  }
  for (const row of overtime) {
    const totals = target(requiredString(row, "employee_id"), isoDate(row, "work_date"));
    totals.overtime_minutes += overtimeMinutes(row);
    totals.source_refs.push({
      object_type: "OvertimeRequest",
      object_id: requiredString(row, "overtime_id"),
      source_ref: requiredString(row, "source_ref"),
      source_state: row.state,
    });
  }

  const employees = new Map();
  for (const day of workdays.values()) {
    if (day.total_minutes === 0) continue;
    if (day.overtime_minutes > day.total_minutes) {
      throw guardedError(
        "Approved overtime exceeds approved attendance for the work date",
        "HRX_PAYROLL_TIME_OVERTIME_EXCEEDS_ATTENDANCE",
        409,
      );
    }
    const totals = employees.get(day.employee_id) ?? {
      regular_minutes: 0,
      overtime_minutes: 0,
      night_minutes: 0,
      holiday_minutes: 0,
      source_refs: [],
    };
    totals.regular_minutes += day.total_minutes - day.overtime_minutes;
    totals.overtime_minutes += day.overtime_minutes;
    totals.night_minutes += day.night_minutes;
    totals.holiday_minutes += day.holiday_minutes;
    totals.source_refs.push(...day.source_refs);
    employees.set(day.employee_id, totals);
  }
  const employeeInputs = [...employees.entries()]
    .map(([employee_id, totals]) => Object.freeze({
      employee_id,
      ...totals,
      source_refs: Object.freeze(totals.source_refs.sort((left, right) =>
        `${left.object_type}:${left.object_id}`.localeCompare(`${right.object_type}:${right.object_id}`))),
    }))
    .sort((left, right) => left.employee_id.localeCompare(right.employee_id));
  const projection = {
    tenant_id: tenantId,
    period_start: periodStart,
    period_end: periodEnd,
    as_of: asOf.value,
    source_version: requiredString(input, "source_version"),
    timezone,
    employee_inputs: Object.freeze(employeeInputs),
    payroll_calculation_runtime: false,
    disbursement_instruction_included: false,
  };
  return Object.freeze({ ...projection, input_hash: hash(projection) });
}

export function createSqlPayrollTimeInputService({
  store,
  clock = () => new Date().toISOString(),
  idFactory = (prefix) => `${prefix}_${randomUUID()}`,
} = {}) {
  if (!store || typeof store.query !== "function" || typeof store.transaction !== "function") {
    throw new TypeError("SQL payroll time input service requires a transactional store");
  }
  return Object.freeze({
    recordAttendanceApproval(context = {}, input = {}) {
      const tenantId = requiredString(context, "tenant_id");
      const actorId = requiredString(context, "actor_id");
      const attendanceId = requiredString(input, "attendance_id");
      const idempotencyKey = requiredString(input, "idempotency_key");
      const attendance = store.query("selectOne", {
        table: "hrx_attendance_records",
        where: { tenant_id: tenantId, attendance_id: attendanceId },
      });
      if (!attendance) throw guardedError("Attendance record not found", "HRX_PAYROLL_ATTENDANCE_NOT_FOUND", 404);
      const candidate = {
        tenant_id: tenantId,
        approval_receipt_id: input.approval_receipt_id ?? idFactory("attendance_approval_receipt"),
        attendance_id: attendance.attendance_id,
        employee_id: attendance.employee_id,
        approved_by_actor_id: actorId,
        approved_at: instant({ approved_at: input.approved_at ?? clock() }, "approved_at").value,
        attendance_source_ref: attendance.source_ref,
        idempotency_key: idempotencyKey,
        created_at: clock(),
      };
      return store.transaction((tx) => {
        const existing = tx.query("selectOne", {
          table: "hrx_attendance_approval_receipts",
          where: { tenant_id: tenantId, idempotency_key: idempotencyKey },
        });
        if (existing) {
          if (existing.attendance_id !== candidate.attendance_id
            || existing.attendance_source_ref !== candidate.attendance_source_ref) {
            throw guardedError(
              "Attendance approval idempotency conflict",
              "HRX_PAYROLL_ATTENDANCE_APPROVAL_IDEMPOTENCY_CONFLICT",
              409,
            );
          }
          return Object.freeze({ ...existing });
        }
        return Object.freeze(tx.query("insert", {
          table: "hrx_attendance_approval_receipts",
          row: candidate,
        }));
      });
    },
    projectApprovedInput(context = {}, input = {}) {
      const tenantId = requiredString(context, "tenant_id");
      requiredString(context, "actor_id");
      return projectApprovedPayrollTimeInput({
        ...input,
        tenant_id: tenantId,
        attendance_records: store.query("select", {
          table: "hrx_attendance_records",
          where: { tenant_id: tenantId },
        }),
        approval_receipts: store.query("select", {
          table: "hrx_attendance_approval_receipts",
          where: { tenant_id: tenantId },
        }),
        overtime_requests: store.query("select", {
          table: "hrx_overtime_requests",
          where: { tenant_id: tenantId },
        }),
      });
    },
  });
}
