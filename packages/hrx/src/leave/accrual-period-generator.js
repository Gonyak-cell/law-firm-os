const SUPPORTED_SCHEDULES = new Set(["hire_anniversary", "fiscal_year", "monthly_perfect_attendance", "fixed_annual_date"]);

function guardedError(message, safeErrorCode) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = 400;
  return error;
}

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function isoDate(value, field) {
  const normalized = requiredString({ [field]: value }, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new TypeError(`${field} must be an ISO date`);
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) throw new TypeError(`${field} must be an ISO date`);
  return normalized;
}

function dateParts(value) {
  return { year: Number(value.slice(0, 4)), month: Number(value.slice(5, 7)), day: Number(value.slice(8, 10)) };
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function formatDate(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addMonthsClamped(value, months) {
  const { year, month, day } = dateParts(value);
  const absoluteMonth = year * 12 + month - 1 + months;
  const nextYear = Math.floor(absoluteMonth / 12);
  const nextMonth = (absoluteMonth % 12 + 12) % 12 + 1;
  return formatDate(nextYear, nextMonth, Math.min(day, daysInMonth(nextYear, nextMonth)));
}

function addYearsClamped(value, years) {
  return addMonthsClamped(value, years * 12);
}

function addDays(value, days) {
  const next = new Date(`${value}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

function monthDay(value, field) {
  const normalized = requiredString({ [field]: value }, field);
  if (!/^\d{2}-\d{2}$/.test(normalized)) throw new TypeError(`${field} must be MM-DD`);
  isoDate(`2000-${normalized}`, field);
  return normalized;
}

function annualAnchor(input, schedule) {
  if (schedule === "hire_anniversary") return isoDate(input.anchor_date, "anchor_date");
  const field = schedule === "fiscal_year" ? "fiscal_year_start" : "annual_date";
  return `2000-${monthDay(input[field] ?? "01-01", field)}`;
}

function annualOffset(anchor, start) {
  const years = dateParts(start).year - dateParts(anchor).year;
  if (years < 0 || addYearsClamped(anchor, years) !== start) {
    throw guardedError("start_date must match the configured annual anchor", "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_BOUNDARY_INVALID");
  }
  return years;
}

function assertRange(start, end) {
  if (end < start) throw guardedError("end_date must not precede start_date", "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_RANGE_INVALID");
  if (end > addDays(addYearsClamped(start, 10), -1)) {
    throw guardedError("accrual batch range cannot exceed 10 years", "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_LIMIT_EXCEEDED");
  }
}

function monthlyPeriods(start, end) {
  const startParts = dateParts(start);
  const endParts = dateParts(end);
  if (startParts.day !== 1 || endParts.day !== daysInMonth(endParts.year, endParts.month)) {
    throw guardedError("monthly range must start on the first day and end on the last day of a month", "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_BOUNDARY_INVALID");
  }
  const periods = [];
  for (let offset = 0; ; offset += 1) {
    const periodStart = addMonthsClamped(start, offset);
    if (periodStart > end) break;
    const periodEnd = addDays(addMonthsClamped(periodStart, 1), -1);
    if (periodEnd > end) throw guardedError("end_date must close a complete monthly period", "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_BOUNDARY_INVALID");
    periods.push(Object.freeze({
      period_key: periodStart.slice(0, 7),
      period_start: periodStart,
      period_end: periodEnd,
      occurred_on: periodEnd,
    }));
  }
  return periods;
}

function annualPeriods(schedule, anchor, start, end) {
  const offset = annualOffset(anchor, start);
  const periods = [];
  for (let index = 0; ; index += 1) {
    const periodStart = addYearsClamped(anchor, offset + index);
    if (periodStart > end) break;
    const nextStart = addYearsClamped(anchor, offset + index + 1);
    const periodEnd = addDays(nextStart, -1);
    if (periodEnd > end) throw guardedError("end_date must close a complete annual period", "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_BOUNDARY_INVALID");
    periods.push(Object.freeze({
      period_key: `${schedule}:${periodStart}`,
      period_start: periodStart,
      period_end: periodEnd,
      occurred_on: periodStart,
    }));
  }
  return periods;
}

export function generateLeaveAccrualBatchPeriods(input = {}) {
  const schedule = requiredString(input, "schedule");
  if (!SUPPORTED_SCHEDULES.has(schedule)) {
    throw guardedError("schedule is not supported for batch accrual", "HRX_LEAVE_ACCRUAL_BATCH_SCHEDULE_INVALID");
  }
  const start = isoDate(input.start_date, "start_date");
  const end = isoDate(input.end_date, "end_date");
  assertRange(start, end);
  const periods = schedule === "monthly_perfect_attendance"
    ? monthlyPeriods(start, end)
    : annualPeriods(schedule, annualAnchor(input, schedule), start, end);
  if (periods.length === 0 || periods.at(-1).period_end !== end) {
    throw guardedError("date range does not contain complete accrual periods", "HRX_LEAVE_ACCRUAL_BATCH_PERIOD_BOUNDARY_INVALID");
  }
  return Object.freeze({
    schedule,
    start_date: start,
    end_date: end,
    period_count: periods.length,
    periods: Object.freeze(periods),
  });
}
