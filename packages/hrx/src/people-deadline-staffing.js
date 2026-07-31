import { selectCurrentPeopleAttorneyAssignments } from "../../matter/src/people-member-cutover.js";
import {
  peopleDateKeyPlusDays,
  peopleDayBounds,
  peopleLocalDateKey,
} from "./people-intervals.js";

const IMPORTANT_EVENT_KINDS = new Set(["court_hearing", "deadline"]);

function staffingState(count) {
  if (count === 0) return Object.freeze({ state: "assignee_required", label: "담당자 지정 필요" });
  if (count === 1) return Object.freeze({ state: "assigned", label: "담당 확인" });
  return Object.freeze({ state: "joint", label: "공동 담당" });
}

export function createPeopleDeadlineStaffing({
  tenant_id,
  as_of,
  timezone = "Asia/Seoul",
  employees = [],
  visible_matters = [],
  assignments = [],
  events = [],
} = {}) {
  const startDate = peopleLocalDateKey(as_of, timezone);
  const endDate = peopleDateKeyPlusDays(startDate, 14);
  const startMs = Date.parse(peopleDayBounds({ date: startDate, timezone }).start_at);
  const endMs = Date.parse(peopleDayBounds({ date: endDate, timezone }).start_at);
  const matterById = new Map(visible_matters.map((matter) => [matter.matter_id, matter]));
  const visibleIds = new Set(matterById.keys());
  const employeeById = new Map(employees.map((employee) => [employee.employee_id, employee]));
  const visibleAssignments = assignments.filter((assignment) => visibleIds.has(assignment.matter_id));
  const items = events
    .filter((event) => {
      const timestamp = Date.parse(event?.starts_at);
      return event?.tenant_id === tenant_id
        && IMPORTANT_EVENT_KINDS.has(event.event_kind)
        && event.status !== "cancelled"
        && visibleIds.has(event.matter_id)
        && Number.isFinite(timestamp)
        && timestamp >= startMs
        && timestamp < endMs;
    })
    .sort((left, right) => (
      Date.parse(left.starts_at) - Date.parse(right.starts_at)
      || left.event_id.localeCompare(right.event_id)
    ))
    .map((event) => {
      const matter = matterById.get(event.matter_id);
      const attorneys = selectCurrentPeopleAttorneyAssignments({
        tenant_id,
        as_of: event.starts_at,
        members: visibleAssignments,
      })
        .filter((assignment) => assignment.matter_id === event.matter_id)
        .map((assignment) => ({
          employee_id: assignment.employee_id,
          display_name: employeeById.get(assignment.employee_id)?.display_name ?? "구성원 확인 필요",
        }))
        .sort((left, right) => (
          left.display_name.localeCompare(right.display_name, "ko-KR")
          || left.employee_id.localeCompare(right.employee_id)
        ));
      const status = staffingState(attorneys.length);
      return Object.freeze({
        staffing_id: `staffing:${event.event_id}`,
        event_id: event.event_id,
        event_kind: event.event_kind,
        title: event.title ?? (event.event_kind === "court_hearing" ? "재판기일" : "기한"),
        starts_at: event.starts_at,
        matter_id: event.matter_id,
        matter_code: matter?.matter_code ?? null,
        matter_name: matter?.matter_name ?? matter?.title ?? null,
        attorney_count: attorneys.length,
        attorneys: Object.freeze(attorneys.map((attorney) => Object.freeze(attorney))),
        staffing_state: status.state,
        staffing_label: status.label,
        destination: Object.freeze({
          view: "matters",
          section: "matters-list",
          matter_id: event.matter_id,
        }),
      });
    });
  return Object.freeze({
    start_date: startDate,
    end_date_exclusive: endDate,
    items: Object.freeze(items),
    permission_filter_applied_before_aggregation: true,
    existence_hidden: true,
  });
}
