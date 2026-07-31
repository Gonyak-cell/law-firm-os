import { selectCurrentPeopleAttorneyAssignments } from "../../matter/src/people-member-cutover.js";
import { selectExplicitPeopleTasks } from "../../matter/src/people-task-cutover.js";
import {
  normalizePeopleInterval,
  peopleDateKeyPlusDays,
  peopleDayBounds,
  peopleLocalDateKey,
} from "./people-intervals.js";

const IMPORTANT_EVENT_KINDS = new Set(["court_hearing", "deadline"]);

function matterFields(matterById, matterId) {
  const matter = matterById.get(matterId);
  return {
    matter_id: matterId,
    matter_code: matter?.matter_code ?? null,
    matter_name: matter?.matter_name ?? matter?.title ?? null,
  };
}

function memberFields(employeeById, employeeId) {
  const employee = employeeById.get(employeeId);
  return {
    employee_id: employeeId,
    display_name: employee?.display_name ?? "구성원 확인 필요",
  };
}

function inWindow(startsAt, startMs, endMs) {
  const value = Date.parse(startsAt);
  return Number.isFinite(value) && value >= startMs && value < endMs;
}

function clipToDay(interval, date, timezone, startMs, endMs) {
  if (!interval?.ends_at) {
    return inWindow(interval?.starts_at, startMs, endMs)
      ? Object.freeze({ starts_at: interval.starts_at, ends_at: null })
      : null;
  }
  try {
    const normalized = normalizePeopleInterval(interval, { date, timezone });
    return normalized
      ? Object.freeze({
          starts_at: new Date(normalized.start_minute * 60_000).toISOString(),
          ends_at: new Date(normalized.end_minute * 60_000).toISOString(),
        })
      : null;
  } catch {
    return null;
  }
}

function dateKey(value, timezone) {
  if (typeof value !== "string") return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return peopleLocalDateKey(value, timezone);
}

function sortRows(rows) {
  return Object.freeze(rows.sort((left, right) => (
    String(left.sort_at ?? "").localeCompare(String(right.sort_at ?? ""))
    || String(left.queue_id).localeCompare(String(right.queue_id))
  )).map((row) => Object.freeze(row)));
}

function queue(rows, { count_unknown = false } = {}) {
  const sorted = sortRows(rows);
  return Object.freeze({
    count: count_unknown ? null : sorted.length,
    rows: sorted,
    ...(count_unknown ? { source_state: "identity_link_required" } : {}),
  });
}

export function createPeopleActionQueues({
  tenant_id,
  as_of,
  timezone = "Asia/Seoul",
  employees = [],
  user_id_by_employee_id = {},
  identity_state_by_employee_id = {},
  visible_matters = [],
  assignments = [],
  tasks = [],
  events = [],
  time_entries = [],
  outlook_required_meetings_by_employee_id = {},
} = {}) {
  const today = peopleLocalDateKey(as_of, timezone);
  const todayBounds = peopleDayBounds({ date: today, timezone });
  const windowEnd = peopleDayBounds({
    date: peopleDateKeyPlusDays(today, 14),
    timezone,
  }).start_minute * 60000;
  const startMs = Date.parse(todayBounds.start_at);
  const endMs = Date.parse(todayBounds.end_at);
  const matterById = new Map(visible_matters.map((matter) => [matter.matter_id, matter]));
  const visibleMatterIds = new Set(matterById.keys());
  const employeeById = new Map(employees.map((employee) => [employee.employee_id, employee]));
  const visibleAssignments = assignments.filter((assignment) => visibleMatterIds.has(assignment.matter_id));
  const todayTaskCountUnknown = employees.some((employee) => {
    const userId = user_id_by_employee_id[employee.employee_id];
    const identityState = identity_state_by_employee_id[employee.employee_id]
      ?? (typeof userId === "string" && userId.trim() ? "resolved" : "missing");
    return identityState !== "resolved" || typeof userId !== "string" || !userId.trim();
  });
  const currentAssignments = selectCurrentPeopleAttorneyAssignments({
    tenant_id,
    as_of,
    members: visibleAssignments,
  });
  const todayRows = [];
  for (const employee of employees) {
    const userId = user_id_by_employee_id[employee.employee_id];
    if (!userId) continue;
    const selected = selectExplicitPeopleTasks({
      tenant_id,
      user_id: userId,
      tasks: tasks.filter((task) => visibleMatterIds.has(task.matter_id)),
    });
    for (const task of selected.time_bound) {
      const clipped = clipToDay(task, today, timezone, startMs, endMs);
      if (!clipped) continue;
      todayRows.push({
        queue_id: `task:${task.task_id}`,
        kind: "matter_task",
        title: task.title ?? "제목 없는 업무",
        sort_at: clipped.starts_at,
        starts_at: clipped.starts_at,
        ends_at: clipped.ends_at,
        due_at: task.due_at ?? null,
        ...memberFields(employeeById, employee.employee_id),
        ...matterFields(matterById, task.matter_id),
        destination: { view: "matters", section: "matters-list", matter_id: task.matter_id },
      });
    }
    for (const task of selected.due_only.filter((row) => dateKey(row.due_at, timezone) === today)) {
      todayRows.push({
        queue_id: `task:${task.task_id}`,
        kind: "matter_task",
        title: task.title ?? "제목 없는 업무",
        sort_at: task.due_at,
        starts_at: null,
        due_at: task.due_at,
        ...memberFields(employeeById, employee.employee_id),
        ...matterFields(matterById, task.matter_id),
        destination: { view: "matters", section: "matters-list", matter_id: task.matter_id },
      });
    }
    for (const meeting of Array.isArray(outlook_required_meetings_by_employee_id[employee.employee_id])
      ? outlook_required_meetings_by_employee_id[employee.employee_id]
      : []) {
      const clipped = clipToDay(meeting, today, timezone, startMs, endMs);
      if (!clipped) continue;
      todayRows.push({
        queue_id: `outlook:${meeting.calendar_event_ref ?? `${employee.employee_id}:${meeting.starts_at}`}`,
        kind: "outlook_calendar",
        title: meeting.title ?? "필수 참석 회의",
        sort_at: clipped.starts_at,
        starts_at: clipped.starts_at,
        ends_at: clipped.ends_at,
        due_at: null,
        ...memberFields(employeeById, employee.employee_id),
        destination: { view: "people", section: "people-overview", employee_id: employee.employee_id },
      });
    }
  }
  for (const event of events) {
    if (
      event?.tenant_id !== tenant_id
      || event.event_kind !== "court_hearing"
      || event.status === "cancelled"
      || !visibleMatterIds.has(event.matter_id)
    ) continue;
    const clipped = clipToDay(event, today, timezone, startMs, endMs);
    if (!clipped) continue;
    const eventAssignments = selectCurrentPeopleAttorneyAssignments({
      tenant_id,
      as_of: event.starts_at,
      members: visibleAssignments,
    }).filter((assignment) => assignment.matter_id === event.matter_id);
    for (const assignment of eventAssignments) {
      todayRows.push({
        queue_id: `hearing:${event.event_id}:${assignment.employee_id}`,
        kind: "court_hearing",
        title: event.title ?? "재판기일",
        sort_at: clipped.starts_at,
        starts_at: clipped.starts_at,
        ends_at: clipped.ends_at,
        due_at: null,
        ...memberFields(employeeById, assignment.employee_id),
        ...matterFields(matterById, event.matter_id),
        destination: { view: "matters", section: "matters-list", matter_id: event.matter_id },
      });
    }
  }
  const assigneeRequired = events
    .filter((event) => (
      event?.tenant_id === tenant_id
      && IMPORTANT_EVENT_KINDS.has(event.event_kind)
      && event.status !== "cancelled"
      && visibleMatterIds.has(event.matter_id)
      && inWindow(event.starts_at, startMs, windowEnd)
      && selectCurrentPeopleAttorneyAssignments({
        tenant_id,
        as_of: event.starts_at,
        members: visibleAssignments,
      }).every((assignment) => assignment.matter_id !== event.matter_id)
    ))
    .map((event) => ({
      queue_id: `assignee:${event.event_id}`,
      kind: event.event_kind,
      title: event.title ?? (event.event_kind === "court_hearing" ? "재판기일" : "기한"),
      sort_at: event.starts_at,
      starts_at: event.starts_at,
      ...matterFields(matterById, event.matter_id),
      destination: { view: "matters", section: "matters-list", matter_id: event.matter_id },
    }));
  const handoffConfirmation = currentAssignments
    .filter((assignment) => assignment.valid_to && inWindow(assignment.valid_to, startMs, windowEnd))
    .map((assignment) => ({
      queue_id: `handoff:${assignment.member_id}`,
      kind: "matter_handoff",
      title: "담당 사건 인계 확인",
      sort_at: assignment.valid_to,
      valid_to: assignment.valid_to,
      ...memberFields(employeeById, assignment.employee_id),
      ...matterFields(matterById, assignment.matter_id),
      destination: { view: "people", section: "people-lifecycle", employee_id: assignment.employee_id },
    }));
  const timeRecordConfirmation = (Array.isArray(time_entries) ? time_entries : [])
    .filter((entry) => (
      entry?.tenant_id === tenant_id
      && entry.work_date === today
      && ["missing", "needs_review"].includes(entry.confirmation_state)
      && (!entry.matter_id || visibleMatterIds.has(entry.matter_id))
    ))
    .map((entry) => ({
      queue_id: `time-entry:${entry.time_entry_id ?? entry.employee_id}`,
      kind: "time_record",
      title: entry.confirmation_state === "missing" ? "시간기록 입력 필요" : "시간기록 확인 필요",
      sort_at: entry.work_date,
      confirmation_state: entry.confirmation_state,
      ...memberFields(employeeById, entry.employee_id),
      ...(entry.matter_id ? matterFields(matterById, entry.matter_id) : {}),
      destination: { view: "people", section: "people-attendance-records", employee_id: entry.employee_id },
    }));
  return Object.freeze({
    today_tasks: queue(todayRows, { count_unknown: todayTaskCountUnknown }),
    assignee_required: queue(assigneeRequired),
    handoff_confirmation: queue(handoffConfirmation),
    time_record_confirmation: queue(timeRecordConfirmation),
    permission_filter_applied_before_aggregation: true,
    existence_hidden: true,
  });
}
