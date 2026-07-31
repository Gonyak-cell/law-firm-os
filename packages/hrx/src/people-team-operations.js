import { createHash } from "node:crypto";
import { createPeopleActionQueues } from "./people-action-queues.js";
import { createPeopleAttentionWindow } from "./people-attention-window.js";
import { createPeopleCapacityProjection } from "./people-capacity.js";
import { createPeopleDailyBriefProjection } from "./people-daily-brief.js";
import { createPeopleDeadlineStaffing } from "./people-deadline-staffing.js";
import { createPeopleWorkloadStage1 } from "./people-workload-stage1.js";
import { normalizePeopleInterval } from "./people-intervals.js";

export const PEOPLE_TEAM_OPERATIONS_MEMBER_LIMIT = 25;

function clippedDayInterval(item, date, timezone) {
  if (!item?.ends_at) return null;
  const normalized = normalizePeopleInterval(item, { date, timezone });
  if (!normalized) return null;
  return Object.freeze({
    starts_at: new Date(normalized.start_minute * 60_000).toISOString(),
    ends_at: new Date(normalized.end_minute * 60_000).toISOString(),
    duration_minutes: normalized.duration_minutes,
  });
}

function operationInterval(kind, item, date, timezone) {
  const clipped = clippedDayInterval(item, date, timezone);
  if (item.ends_at && !clipped) return null;
  return Object.freeze({
    kind,
    task_id: item.task_id ?? null,
    event_id: item.event_id ?? null,
    calendar_event_ref: item.calendar_event_ref ?? null,
    matter_id: item.matter_id,
    matter_code: item.matter_code,
    title: item.title,
    starts_at: clipped?.starts_at ?? item.starts_at,
    ends_at: clipped?.ends_at ?? item.ends_at,
  });
}

function timeUnspecifiedTask(schedulingState, task) {
  return Object.freeze({
    task_id: task.task_id,
    matter_id: task.matter_id,
    matter_code: task.matter_code,
    title: task.title,
    starts_at: task.starts_at ?? null,
    ends_at: task.ends_at ?? null,
    due_at: task.due_at ?? null,
    estimated_minutes: task.estimated_minutes ?? null,
    scheduling_state: schedulingState,
  });
}

function approvedLeaveInterval(item, clipped) {
  return Object.freeze({
    kind: "approved_leave",
    leave_interval_ref: item.leave_interval_ref,
    title: "휴가",
    starts_at: clipped.starts_at,
    ends_at: clipped.ends_at,
  });
}

function hashProjection(value) {
  return `sha256:${createHash("sha256").update(JSON.stringify(value)).digest("hex")}`;
}

export function createPeopleTeamOperationsProjection({
  tenant_id,
  employees = [],
  user_id_by_employee_id = {},
  identity_state_by_employee_id = {},
  as_of,
  timezone = "Asia/Seoul",
  visible_matters = [],
  assignments = [],
  tasks = [],
  events = [],
  time_entries = [],
  approved_leave_intervals = [],
  capacity_enabled = false,
  capacity_schedule_days_by_employee_id = {},
  capacity_source_state = "ok",
  outlook_events_by_employee_id = {},
  outlook_connection_state_by_employee_id = {},
  member_limit = PEOPLE_TEAM_OPERATIONS_MEMBER_LIMIT,
} = {}) {
  if (!Number.isInteger(member_limit) || member_limit < 1) throw new TypeError("member_limit must be a positive integer");
  const roster = (Array.isArray(employees) ? employees : [])
    .filter((employee) => employee?.tenant_id === tenant_id)
    .filter((employee) => !["inactive", "terminated"].includes(employee.status))
    .sort((left, right) => (
      String(left.display_name).localeCompare(String(right.display_name), "ko-KR")
      || String(left.employee_id).localeCompare(String(right.employee_id))
    ));
  if (roster.length > member_limit) {
    const error = new RangeError(`People team operations supports at most ${member_limit} active members`);
    error.safe_error_code = "PEOPLE_TEAM_SIZE_LIMIT_EXCEEDED";
    throw error;
  }
  const dailyByEmployeeId = new Map();
  const members = roster.map((employee) => {
    const identityState = identity_state_by_employee_id[employee.employee_id] ?? "missing";
    const daily = createPeopleDailyBriefProjection({
      tenant_id,
      employee,
      user_id: user_id_by_employee_id[employee.employee_id] ?? null,
      as_of,
      timezone,
      visible_matters,
      assignments,
      tasks,
      events,
      identity_state: identityState,
      outlook_events: outlook_events_by_employee_id[employee.employee_id] ?? [],
      outlook_connection: outlook_connection_state_by_employee_id[employee.employee_id] ?? null,
    });
    dailyByEmployeeId.set(employee.employee_id, daily);
    const memberTasks = daily.tasks;
    const approvedLeaveToday = approved_leave_intervals
      .filter((leave) => (
        leave?.tenant_id === tenant_id
        && leave.employee_id === employee.employee_id
        && leave.state === "approved"
      ))
      .map((leave) => {
        const clipped = clippedDayInterval(leave, daily.date, timezone);
        return clipped ? { leave, clipped } : null;
      })
      .filter(Boolean);
    const todayIntervals = [
      ...(memberTasks?.time_bound ?? [])
        .map((task) => operationInterval("matter_task", task, daily.date, timezone)),
      ...daily.hearings
        .map((event) => operationInterval("court_hearing", event, daily.date, timezone)),
      ...daily.outlook_intervals
        .map((event) => operationInterval("outlook_calendar", event, daily.date, timezone)),
      ...approvedLeaveToday
        .map(({ leave, clipped }) => approvedLeaveInterval(leave, clipped)),
    ].filter(Boolean).sort((left, right) => (
      String(left.starts_at).localeCompare(String(right.starts_at))
      || String(left.kind).localeCompare(String(right.kind))
      || String(left.title).localeCompare(String(right.title))
    ));
    const timeUnspecifiedTasks = memberTasks
      ? [
          ...memberTasks.due_only.map((task) => timeUnspecifiedTask("due_only", task)),
          ...memberTasks.unscheduled.map((task) => timeUnspecifiedTask(
            task.starts_at && !task.ends_at ? "needs_end_time" : "unscheduled",
            task,
          )),
        ]
      : null;
    return Object.freeze({
      member: daily.member,
      today_intervals: Object.freeze(todayIntervals),
      time_unspecified_tasks: timeUnspecifiedTasks ? Object.freeze(timeUnspecifiedTasks) : null,
      assigned_matter_count: daily.assigned_matters.length,
      today_task_count: memberTasks
        ? memberTasks.time_bound.length + memberTasks.due_only.length + memberTasks.unscheduled.length
        : null,
      today_hearing_count: daily.hearings.length,
      required_meeting_count: daily.required_meetings.length,
      approved_leave_minutes: approvedLeaveToday
        .reduce((total, { clipped }) => total + clipped.duration_minutes, 0),
      outlook_connection: daily.outlook_connection,
      confirmation_items: daily.confirmation_items,
    });
  });
  const actionQueues = createPeopleActionQueues({
    tenant_id,
    as_of,
    timezone,
    employees: roster,
    user_id_by_employee_id,
    identity_state_by_employee_id,
    visible_matters,
    assignments,
    tasks,
    events,
    time_entries,
    outlook_required_meetings_by_employee_id: Object.fromEntries(
      members.map((member) => [
        member.member.employee_id,
        dailyByEmployeeId.get(member.member.employee_id)?.required_meetings ?? [],
      ]),
    ),
  });
  const workloadStage1 = createPeopleWorkloadStage1({
    tenant_id,
    as_of,
    timezone,
    employees: roster,
    user_id_by_employee_id,
    identity_state_by_employee_id,
    visible_matter_ids: visible_matters.map(({ matter_id }) => matter_id),
    tasks,
  });
  const peopleCapacity = capacity_enabled
    ? createPeopleCapacityProjection({
        tenant_id,
        as_of,
        timezone,
        employees: roster,
        schedule_days_by_employee_id: capacity_schedule_days_by_employee_id,
        busy_intervals_by_employee_id: Object.fromEntries(
          members.map((member) => [
            member.member.employee_id,
            member.today_intervals.filter((interval) => interval.kind !== "approved_leave"),
          ]),
        ),
        approved_leave_intervals,
        source_state: capacity_source_state,
      })
    : null;
  const attentionWindow = createPeopleAttentionWindow({
    tenant_id,
    as_of,
    timezone,
    visible_matters,
    assignments,
    events,
    approved_leave_intervals,
  });
  const deadlineStaffing = createPeopleDeadlineStaffing({
    tenant_id,
    as_of,
    timezone,
    employees: roster,
    visible_matters,
    assignments,
    events,
  });
  const projection = Object.freeze({
    team_members: Object.freeze(members),
    member_count: members.length,
    action_queues: actionQueues,
    workload_stage1: workloadStage1,
    ...(peopleCapacity ? { people_capacity: peopleCapacity } : {}),
    attention_window: attentionWindow,
    deadline_staffing: deadlineStaffing,
    response_bounds: Object.freeze({
      member_limit,
      truncated: false,
      pagination: false,
    }),
    permission_filter_applied_before_aggregation: true,
    existence_hidden: true,
  });
  return Object.freeze({
    ...projection,
    result_hash: hashProjection(projection),
  });
}
