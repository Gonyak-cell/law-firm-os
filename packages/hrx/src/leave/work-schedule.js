import { createHash } from "node:crypto";

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function guardedError(message, safeErrorCode, status = 409) {
  const error = new TypeError(message);
  error.safe_error_code = safeErrorCode;
  error.status = status;
  return error;
}

function dateRange(startDate, endDate) {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.valueOf()) || Number.isNaN(end.valueOf()) || start > end) {
    throw new TypeError("leave date range is invalid");
  }
  const dates = [];
  for (let cursor = start; cursor <= end; cursor = new Date(cursor.valueOf() + 86_400_000)) {
    dates.push(cursor.toISOString().slice(0, 10));
  }
  return dates;
}

function isEffective(row, date) {
  return row.effective_from <= date && (!row.effective_to || row.effective_to >= date);
}

function minutesOfDay(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(time ?? "");
  if (!match) throw new TypeError(`invalid work schedule time: ${time}`);
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) throw new TypeError(`invalid work schedule time: ${time}`);
  return hours * 60 + minutes;
}

function scheduledPeriods(profile, date) {
  const schedule = typeof profile.weekly_schedule_json === "string"
    ? JSON.parse(profile.weekly_schedule_json)
    : profile.weekly_schedule_json;
  if (!schedule || typeof schedule !== "object") throw new TypeError("work schedule weekly_schedule_json is invalid");
  const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  const segments = schedule[String(weekday)] ?? schedule[weekday] ?? [];
  return segments.map((segment) => {
    const duration = minutesOfDay(segment.end) - minutesOfDay(segment.start);
    if (duration <= 0) throw new TypeError("work schedule segment end must follow start");
    return Object.freeze({ start: segment.start, end: segment.end, minutes: duration });
  });
}

function timeFromMinutes(value) {
  const hours = String(Math.floor(value / 60)).padStart(2, "0");
  const minutes = String(value % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function allocatePeriods(periods, requestedMinutes) {
  let remaining = requestedMinutes;
  const allocated = [];
  for (const period of periods) {
    if (remaining <= 0) break;
    const minutes = Math.min(period.minutes, remaining);
    allocated.push(Object.freeze({
      start: period.start,
      end: timeFromMinutes(minutesOfDay(period.start) + minutes),
      minutes,
    }));
    remaining -= minutes;
  }
  return Object.freeze(allocated);
}

function snapshotHash(value) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function validateTimezone(timezone) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: timezone }).format(new Date(0));
  } catch {
    throw new TypeError(`invalid IANA timezone: ${timezone}`);
  }
}

export function createSqlWorkScheduleResolver({ store, holidayResolver = () => false } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("work schedule resolver requires store.query");

  function resolveDays(input = {}) {
    const tenantId = requiredString(input, "tenant_id");
    const employeeId = requiredString(input, "employee_id");
    const startDate = requiredString(input, "start_date");
    const endDate = requiredString(input, "end_date");
    const organizationIds = new Set(input.organization_ids ?? []);
    const assignments = store.query("select", {
      table: "hrx_work_schedule_assignments",
      where: { tenant_id: tenantId },
    });
    return dateRange(startDate, endDate).map((date) => {
        const candidates = assignments
          .filter((assignment) => isEffective(assignment, date))
          .filter((assignment) => assignment.employee_id === employeeId || organizationIds.has(assignment.organization_id))
          .sort((left, right) => {
            const targetRank = Number(right.employee_id === employeeId) - Number(left.employee_id === employeeId);
            return targetRank || right.priority - left.priority || left.schedule_assignment_id.localeCompare(right.schedule_assignment_id);
          });
        if (candidates.length === 0) {
          throw guardedError("An explicit work schedule assignment is required", "HRX_LEAVE_WORK_SCHEDULE_REQUIRED");
        }
        const selected = candidates[0];
        const selectedRank = Number(selected.employee_id === employeeId);
        const ambiguous = candidates.find(
          (candidate, index) =>
            index > 0 &&
            Number(candidate.employee_id === employeeId) === selectedRank &&
            candidate.priority === selected.priority &&
            candidate.schedule_profile_id !== selected.schedule_profile_id,
        );
        if (ambiguous) {
          throw guardedError("Overlapping work schedule assignments require review", "HRX_LEAVE_WORK_SCHEDULE_AMBIGUOUS");
        }
        const profile = store.query("selectOne", {
          table: "hrx_work_schedule_profiles",
          where: { tenant_id: tenantId, schedule_profile_id: selected.schedule_profile_id },
        });
        if (!profile || !isEffective(profile, date)) {
          throw guardedError("Assigned work schedule profile is not effective", "HRX_LEAVE_WORK_SCHEDULE_REQUIRED");
        }
        validateTimezone(profile.timezone);
        const holiday = Boolean(holidayResolver({ tenant_id: tenantId, profile, date }));
        const workPeriods = scheduledPeriods(profile, date);
        const capacity = holiday ? 0 : workPeriods.reduce((total, period) => total + period.minutes, 0);
        return Object.freeze({
          date,
          schedule_assignment_id: selected.schedule_assignment_id,
          schedule_profile_id: profile.schedule_profile_id,
          schedule_state_version: profile.state_version,
          timezone: profile.timezone,
          scheduled_minutes: capacity,
          holiday_calendar_ref: profile.holiday_calendar_ref ?? null,
          non_working_reason: holiday ? "holiday" : capacity === 0 ? "not_scheduled" : null,
          work_periods: Object.freeze(holiday ? [] : workPeriods),
        });
      });
  }

  function allocate(days, requestedMinutes) {
    if (!Number.isInteger(requestedMinutes) || requestedMinutes <= 0) {
      throw new TypeError("requested_minutes must be a positive integer");
    }
    let remaining = requestedMinutes;
    const segments = [];
    for (const day of days) {
        const capacity = day.scheduled_minutes;
        const minutes = Math.min(capacity, remaining);
        if (minutes > 0) {
          const snapshot = {
            ...day,
            scheduled_minutes: capacity,
            requested_minutes: minutes,
            leave_periods: allocatePeriods(day.work_periods, minutes),
          };
          segments.push(Object.freeze({ ...snapshot, schedule_snapshot_hash: snapshotHash(snapshot) }));
          remaining -= minutes;
        }
      }
      if (remaining > 0) {
        throw guardedError("Requested leave exceeds assigned work schedule minutes", "HRX_LEAVE_SCHEDULE_MINUTES_EXCEEDED");
      }
      const aggregate = Object.freeze({
        timezone: segments[0]?.timezone,
        requested_minutes: requestedMinutes,
        segments: Object.freeze(segments),
        range_days: Object.freeze(days),
        included_dates: Object.freeze(segments.map((segment) => segment.date)),
        non_working_dates: Object.freeze(
          days
            .filter((day) => day.scheduled_minutes === 0)
            .map((day) => Object.freeze({ date: day.date, reason: day.non_working_reason })),
        ),
      });
      return Object.freeze({ ...aggregate, schedule_snapshot_hash: snapshotHash(aggregate) });
  }

  return Object.freeze({
    resolve(input = {}) {
      return allocate(resolveDays(input), input.requested_minutes);
    },

    preview(input = {}) {
      const durationMode = requiredString(input, "duration_mode");
      if (!["full_day", "half_day", "quarter_day", "hours"].includes(durationMode)) {
        throw new TypeError("duration_mode is invalid");
      }
      const days = resolveDays(input);
      const totalScheduledMinutes = days.reduce((total, day) => total + day.scheduled_minutes, 0);
      if (totalScheduledMinutes <= 0) {
        throw guardedError("The selected range contains no assigned working time", "HRX_LEAVE_NON_WORKING_RANGE");
      }
      if (durationMode !== "full_day" && input.start_date !== input.end_date) {
        throw guardedError("Partial-day leave must use one work date", "HRX_LEAVE_PARTIAL_DAY_SINGLE_DATE_REQUIRED");
      }
      let requestedMinutes = totalScheduledMinutes;
      if (durationMode === "half_day") requestedMinutes = Math.floor(totalScheduledMinutes / 2);
      if (durationMode === "quarter_day") requestedMinutes = Math.floor(totalScheduledMinutes / 4);
      if (durationMode === "hours") {
        requestedMinutes = input.requested_minutes;
        if (!Number.isInteger(requestedMinutes) || requestedMinutes <= 0 || requestedMinutes % 30 !== 0) {
          throw new TypeError("hour leave requested_minutes must be a positive 30-minute increment");
        }
      }
      const resolved = allocate(days, requestedMinutes);
      return Object.freeze({
        ...resolved,
        duration_mode: durationMode,
        total_scheduled_minutes: totalScheduledMinutes,
      });
    },
  });
}
