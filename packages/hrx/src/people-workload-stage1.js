import { selectExplicitPeopleTasks } from "../../matter/src/people-task-cutover.js";
import {
  peopleDateKeyPlusDays,
  peopleDayBounds,
  peopleIntervalTotalMinutes,
  peopleLocalDateKey,
} from "./people-intervals.js";

function weekStart(date) {
  const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
  return peopleDateKeyPlusDays(date, -(day === 0 ? 6 : day - 1));
}

function dueDate(value, timezone) {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return peopleLocalDateKey(value, timezone);
}

function intervalMinutes(task, startMs, endMs) {
  if (!task.starts_at || !task.ends_at) return null;
  const startsAt = Date.parse(task.starts_at);
  const endsAt = Date.parse(task.ends_at);
  if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) return null;
  const clippedStart = Math.max(startsAt, startMs);
  const clippedEnd = Math.min(endsAt, endMs);
  if (clippedEnd <= clippedStart) return null;
  return {
    start_minute: Math.floor(clippedStart / 60000),
    end_minute: Math.ceil(clippedEnd / 60000),
  };
}

export function createPeopleWorkloadStage1({
  tenant_id,
  as_of,
  timezone = "Asia/Seoul",
  employees = [],
  user_id_by_employee_id = {},
  identity_state_by_employee_id = {},
  visible_matter_ids = [],
  tasks = [],
} = {}) {
  const today = peopleLocalDateKey(as_of, timezone);
  const startDate = weekStart(today);
  const endDate = peopleDateKeyPlusDays(startDate, 7);
  const startMs = Date.parse(peopleDayBounds({ date: startDate, timezone }).start_at);
  const endMs = Date.parse(peopleDayBounds({ date: endDate, timezone }).start_at);
  const visible = new Set(visible_matter_ids);
  const rows = employees
    .filter((employee) => employee?.tenant_id === tenant_id)
    .map((employee) => {
      const userId = user_id_by_employee_id[employee.employee_id];
      const identityState = identity_state_by_employee_id[employee.employee_id]
        ?? (typeof userId === "string" && userId.trim() ? "resolved" : "missing");
      if (identityState !== "resolved" || typeof userId !== "string" || !userId.trim()) {
        return Object.freeze({
          employee_id: employee.employee_id,
          display_name: employee.display_name,
          workload_source_state: "identity_link_required",
          confirmed_minutes: null,
          time_unspecified_estimated_minutes: null,
          no_estimate_task_count: null,
          no_estimate_is_zero_minutes: false,
        });
      }
      const selected = userId
        ? selectExplicitPeopleTasks({
            tenant_id,
            user_id: userId,
            tasks: tasks.filter((task) => visible.has(task.matter_id)),
          })
        : { time_bound: [], due_only: [], unscheduled: [] };
      const all = [...selected.time_bound, ...selected.due_only, ...selected.unscheduled];
      const confirmedIntervals = all
        .map((task) => intervalMinutes(task, startMs, endMs))
        .filter(Boolean);
      const timeUnspecified = all.filter((task) => {
        if (intervalMinutes(task, startMs, endMs)) return false;
        if (task.starts_at && !task.ends_at) {
          const startsOn = dueDate(task.starts_at, timezone);
          return Boolean(startsOn && startsOn >= startDate && startsOn < endDate);
        }
        const due = dueDate(task.due_at, timezone);
        return !due || (due >= startDate && due < endDate);
      });
      const estimatedMinutes = timeUnspecified
        .filter((task) => Number.isInteger(task.estimated_minutes) && task.estimated_minutes > 0)
        .reduce((total, task) => total + task.estimated_minutes, 0);
      const noEstimateCount = timeUnspecified
        .filter((task) => !Number.isInteger(task.estimated_minutes) || task.estimated_minutes <= 0)
        .length;
      return Object.freeze({
        employee_id: employee.employee_id,
        display_name: employee.display_name,
        workload_source_state: "ok",
        confirmed_minutes: peopleIntervalTotalMinutes(confirmedIntervals),
        time_unspecified_estimated_minutes: estimatedMinutes,
        no_estimate_task_count: noEstimateCount,
        no_estimate_is_zero_minutes: false,
      });
    })
    .sort((left, right) => (
      String(left.display_name).localeCompare(String(right.display_name), "ko-KR")
      || left.employee_id.localeCompare(right.employee_id)
    ));
  return Object.freeze({
    week_start: startDate,
    week_end_exclusive: endDate,
    rows: Object.freeze(rows),
    capacity_percent_included: false,
    automatic_assignment_included: false,
    permission_filter_applied_before_aggregation: true,
  });
}
