import { selectCurrentPeopleAttorneyAssignments } from "../../matter/src/people-member-cutover.js";
import {
  normalizePeopleInterval,
  peopleDateKeyPlusDays,
  peopleDayBounds,
  peopleIntervalOverlapMinutes,
  peopleLocalDateKey,
} from "./people-intervals.js";

const IMPORTANT_EVENT_KINDS = new Set(["court_hearing", "deadline"]);

function inRange(value, startMs, endMs) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp >= startMs && timestamp < endMs;
}

function eventInterval(event, date, timezone) {
  if (!event.ends_at) return null;
  return normalizePeopleInterval(event, { date, timezone });
}

export function createPeopleAttentionWindow({
  tenant_id,
  as_of,
  timezone = "Asia/Seoul",
  visible_matters = [],
  assignments = [],
  events = [],
  approved_leave_intervals = [],
} = {}) {
  const startDate = peopleLocalDateKey(as_of, timezone);
  const endDate = peopleDateKeyPlusDays(startDate, 14);
  const startMs = Date.parse(peopleDayBounds({ date: startDate, timezone }).start_at);
  const endMs = Date.parse(peopleDayBounds({ date: endDate, timezone }).start_at);
  const matterById = new Map(visible_matters.map((matter) => [matter.matter_id, matter]));
  const visibleIds = new Set(matterById.keys());
  const visibleAssignments = assignments.filter((assignment) => visibleIds.has(assignment.matter_id));
  const candidates = events
    .filter((event) => (
      event?.tenant_id === tenant_id
      && IMPORTANT_EVENT_KINDS.has(event.event_kind)
      && event.status !== "cancelled"
      && visibleIds.has(event.matter_id)
      && inRange(event.starts_at, startMs, endMs)
    ))
    .sort((left, right) => (
      Date.parse(left.starts_at) - Date.parse(right.starts_at)
      || left.event_id.localeCompare(right.event_id)
    ));
  const assignmentsByEvent = new Map(candidates.map((event) => [
    event.event_id,
    selectCurrentPeopleAttorneyAssignments({
      tenant_id,
      as_of: event.starts_at,
      members: visibleAssignments,
    }).filter((assignment) => assignment.matter_id === event.matter_id),
  ]));
  const reasonsByEvent = new Map(candidates.map((event) => [
    event.event_id,
    new Set([event.event_kind === "court_hearing" ? "court_hearing" : "deadline"]),
  ]));
  for (const event of candidates) {
    if ((assignmentsByEvent.get(event.event_id)?.length ?? 0) === 0) {
      reasonsByEvent.get(event.event_id).add("assignee_required");
    }
  }
  const eventsByEmployee = new Map();
  for (const event of candidates) {
    for (const assignment of assignmentsByEvent.get(event.event_id) ?? []) {
      const rows = eventsByEmployee.get(assignment.employee_id) ?? [];
      rows.push(event);
      eventsByEmployee.set(assignment.employee_id, rows);
    }
  }
  for (const [employeeId, employeeEvents] of eventsByEmployee) {
    for (let leftIndex = 0; leftIndex < employeeEvents.length; leftIndex += 1) {
      const left = employeeEvents[leftIndex];
      const leftDate = peopleLocalDateKey(left.starts_at, timezone);
      const leftInterval = eventInterval(left, leftDate, timezone);
      if (!leftInterval) continue;
      for (let rightIndex = leftIndex + 1; rightIndex < employeeEvents.length; rightIndex += 1) {
        const right = employeeEvents[rightIndex];
        if (peopleLocalDateKey(right.starts_at, timezone) !== leftDate) continue;
        const rightInterval = eventInterval(right, leftDate, timezone);
        if (peopleIntervalOverlapMinutes(leftInterval, rightInterval) > 0) {
          reasonsByEvent.get(left.event_id).add(`schedule_conflict:${employeeId}`);
          reasonsByEvent.get(right.event_id).add(`schedule_conflict:${employeeId}`);
        }
      }
    }
  }
  for (const leave of approved_leave_intervals.filter((row) => row?.tenant_id === tenant_id && row.state === "approved")) {
    const assignedEvents = eventsByEmployee.get(leave.employee_id) ?? [];
    for (const event of assignedEvents) {
      const date = peopleLocalDateKey(event.starts_at, timezone);
      const eventRow = eventInterval(event, date, timezone);
      const leaveRow = normalizePeopleInterval(leave, { date, timezone });
      if (eventRow && leaveRow && peopleIntervalOverlapMinutes(eventRow, leaveRow) > 0) {
        reasonsByEvent.get(event.event_id).add(`approved_leave_conflict:${leave.employee_id}`);
      }
    }
  }
  return Object.freeze({
    start_date: startDate,
    end_date_exclusive: endDate,
    items: Object.freeze(candidates.map((event) => {
      const matter = matterById.get(event.matter_id);
      return Object.freeze({
        attention_id: `attention:${event.event_id}`,
        event_id: event.event_id,
        event_kind: event.event_kind,
        title: event.title ?? (event.event_kind === "court_hearing" ? "재판기일" : "기한"),
        starts_at: event.starts_at,
        ends_at: event.ends_at ?? null,
        date: peopleLocalDateKey(event.starts_at, timezone),
        matter_id: event.matter_id,
        matter_code: matter?.matter_code ?? null,
        matter_name: matter?.matter_name ?? matter?.title ?? null,
        reasons: Object.freeze([...reasonsByEvent.get(event.event_id)].sort()),
        destination: Object.freeze({
          view: "matters",
          section: "matters-list",
          matter_id: event.matter_id,
        }),
      });
    })),
    permission_filter_applied_before_aggregation: true,
    existence_hidden: true,
  });
}
