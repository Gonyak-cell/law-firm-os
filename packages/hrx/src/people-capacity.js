import {
  normalizePeopleInterval,
  peopleIntervalOverlapMinutes,
  peopleIntervalTotalMinutes,
  peopleLocalDateKey,
  peopleLocalTimeIso,
  unionPeopleIntervals,
} from "./people-intervals.js";

function normalizeIntervals(intervals, date, timezone) {
  return (Array.isArray(intervals) ? intervals : [])
    .map((interval) => normalizePeopleInterval(interval, { date, timezone }))
    .filter(Boolean);
}

function overlapMinutes(leftRows, rightRows) {
  const left = unionPeopleIntervals(leftRows);
  const right = unionPeopleIntervals(rightRows);
  let minutes = 0;
  for (const leftInterval of left) {
    for (const rightInterval of right) {
      minutes += peopleIntervalOverlapMinutes(leftInterval, rightInterval);
    }
  }
  return minutes;
}

function intersectIntervals(leftRows, rightRows) {
  const intersections = [];
  for (const left of unionPeopleIntervals(leftRows)) {
    for (const right of unionPeopleIntervals(rightRows)) {
      const start = Math.max(left.start_minute, right.start_minute);
      const end = Math.min(left.end_minute, right.end_minute);
      if (end > start) intersections.push({ start_minute: start, end_minute: end });
    }
  }
  return unionPeopleIntervals(intersections);
}

function normalizeWorkPeriods(schedule, date, fallbackTimezone) {
  if (!Array.isArray(schedule.work_periods)) return null;
  const timezone = schedule.timezone ?? fallbackTimezone;
  try {
    return normalizeIntervals(schedule.work_periods.map((period) => {
      if (period?.starts_at && period?.ends_at) return period;
      if (typeof period?.start !== "string" || typeof period?.end !== "string") {
        throw new TypeError("work period requires start and end");
      }
      return {
        starts_at: peopleLocalTimeIso(date, period.start, timezone),
        ends_at: peopleLocalTimeIso(date, period.end, timezone),
      };
    }), date, timezone);
  } catch {
    return null;
  }
}

function evidenceIntervalsWithinWorkPeriods(intervals, workPeriods, date, timezone) {
  return (Array.isArray(intervals) ? intervals : []).filter((interval) => {
    const normalized = normalizePeopleInterval(interval, { date, timezone });
    return normalized && overlapMinutes([normalized], workPeriods) > 0;
  });
}

function calendarEvidence(intervals) {
  return Object.freeze((Array.isArray(intervals) ? intervals : []).map((interval) => Object.freeze({
    kind: interval.kind ?? "calendar",
    title: interval.title ?? "일정",
    starts_at: interval.starts_at,
    ends_at: interval.ends_at,
    source_ref: interval.task_id
      ?? interval.event_id
      ?? interval.calendar_event_ref
      ?? null,
  })));
}

function leaveEvidence(intervals) {
  return Object.freeze((Array.isArray(intervals) ? intervals : []).map((interval) => Object.freeze({
    title: "휴가",
    starts_at: interval.starts_at,
    ends_at: interval.ends_at,
    leave_interval_ref: interval.leave_interval_ref ?? null,
  })));
}

export function createPeopleCapacityProjection({
  tenant_id,
  as_of,
  timezone = "Asia/Seoul",
  employees = [],
  schedule_days_by_employee_id = {},
  busy_intervals_by_employee_id = {},
  approved_leave_intervals = [],
  source_state = "ok",
} = {}) {
  if (!["ok", "leave_required"].includes(source_state)) {
    throw new TypeError("source_state must be ok or leave_required");
  }
  const date = peopleLocalDateKey(as_of, timezone);
  const rows = (Array.isArray(employees) ? employees : [])
    .filter((employee) => employee?.tenant_id === tenant_id)
    .map((employee) => {
      if (source_state !== "ok") {
        return Object.freeze({
          employee_id: employee.employee_id,
          display_name: employee.display_name,
          date,
          state: "source_required",
          scheduled_minutes: null,
          calendar_reserved_minutes: null,
          approved_leave_minutes: null,
          calendar_leave_overlap_minutes: null,
          occupied_minutes: null,
          remaining_minutes: null,
          overbooked_minutes: null,
          label: "휴가 정보 확인 필요",
          evidence: Object.freeze({
            schedule: null,
            calendar: Object.freeze([]),
            leave: Object.freeze([]),
          }),
        });
      }
      const schedules = (schedule_days_by_employee_id[employee.employee_id] ?? [])
        .filter((day) => day?.date === date);
      const schedule = schedules[0];
      const scheduleTimezone = schedule?.timezone ?? timezone;
      const workPeriods = schedules.length === 1
        ? normalizeWorkPeriods(schedule, date, timezone)
        : null;
      if (
        schedules.length !== 1
        || !Number.isInteger(schedule?.scheduled_minutes)
        || workPeriods === null
      ) {
        return Object.freeze({
          employee_id: employee.employee_id,
          display_name: employee.display_name,
          date,
          state: "schedule_required",
          scheduled_minutes: null,
          calendar_reserved_minutes: null,
          approved_leave_minutes: null,
          calendar_leave_overlap_minutes: null,
          occupied_minutes: null,
          remaining_minutes: null,
          overbooked_minutes: null,
          label: "근로시간 확인 필요",
          evidence: Object.freeze({
            schedule: null,
            calendar: Object.freeze([]),
            leave: Object.freeze([]),
          }),
        });
      }
      if (schedule.scheduled_minutes < 0) throw new TypeError("scheduled_minutes must not be negative");
      const busy = (busy_intervals_by_employee_id[employee.employee_id] ?? [])
        .filter((interval) => interval?.kind !== "approved_leave");
      const leave = approved_leave_intervals
        .filter((interval) => (
          interval?.tenant_id === tenant_id
          && interval.employee_id === employee.employee_id
          && interval.state === "approved"
        ));
      const normalizedBusy = normalizeIntervals(busy, date, scheduleTimezone);
      const normalizedLeave = normalizeIntervals(leave, date, scheduleTimezone);
      const scheduledBusy = intersectIntervals(normalizedBusy, workPeriods);
      const scheduledLeave = intersectIntervals(normalizedLeave, workPeriods);
      const calendarReservedMinutes = peopleIntervalTotalMinutes(scheduledBusy);
      const approvedLeaveMinutes = peopleIntervalTotalMinutes(scheduledLeave);
      const calendarLeaveOverlapMinutes = overlapMinutes(scheduledBusy, scheduledLeave);
      const occupiedMinutes = peopleIntervalTotalMinutes([...scheduledBusy, ...scheduledLeave]);
      const remainingMinutes = schedule.scheduled_minutes - occupiedMinutes;
      const overbookedMinutes = Math.max(0, -remainingMinutes);
      const state = remainingMinutes < 0
        ? "overbooked"
        : remainingMinutes === 0
          ? "fully_booked"
          : "available";
      return Object.freeze({
        employee_id: employee.employee_id,
        display_name: employee.display_name,
        date,
        state,
        scheduled_minutes: schedule.scheduled_minutes,
        calendar_reserved_minutes: calendarReservedMinutes,
        approved_leave_minutes: approvedLeaveMinutes,
        calendar_leave_overlap_minutes: calendarLeaveOverlapMinutes,
        occupied_minutes: occupiedMinutes,
        remaining_minutes: remainingMinutes,
        overbooked_minutes: overbookedMinutes,
        label: state === "overbooked" ? "예정 초과" : state === "fully_booked" ? "남은 시간 없음" : "시간 남음",
        evidence: Object.freeze({
          schedule: Object.freeze({
            schedule_profile_id: schedule.schedule_profile_id ?? null,
            schedule_assignment_id: schedule.schedule_assignment_id ?? null,
            scheduled_minutes: schedule.scheduled_minutes,
            work_periods: Object.freeze(schedule.work_periods.map((period) => Object.freeze({ ...period }))),
          }),
          calendar: calendarEvidence(
            evidenceIntervalsWithinWorkPeriods(busy, workPeriods, date, scheduleTimezone),
          ),
          leave: leaveEvidence(
            evidenceIntervalsWithinWorkPeriods(leave, workPeriods, date, scheduleTimezone),
          ),
        }),
      });
    })
    .sort((left, right) => (
      String(left.display_name).localeCompare(String(right.display_name), "ko-KR")
      || String(left.employee_id).localeCompare(String(right.employee_id))
    ));
  return Object.freeze({
    date,
    rows: Object.freeze(rows),
    calculation: "scheduled_minutes_minus_union_of_calendar_and_approved_leave",
    source_state,
    minute_precision: true,
    ranking_included: false,
    automatic_assignment_included: false,
    performance_evaluation_included: false,
  });
}
