import { selectExplicitPeopleCourtHearings } from "../../matter/src/people-calendar-cutover.js";
import { selectCurrentPeopleAttorneyAssignments } from "../../matter/src/people-member-cutover.js";

export function selectMemberCourtHearings({
  tenant_id,
  employee_id,
  as_of,
  assignments = [],
  events = [],
} = {}) {
  const hearings = selectExplicitPeopleCourtHearings({
    tenant_id,
    allowed_matter_ids: [...new Set((Array.isArray(assignments) ? assignments : [])
      .filter((assignment) => assignment?.tenant_id === tenant_id)
      .map((assignment) => assignment.matter_id))],
    events,
  });
  return Object.freeze(hearings.filter((event) => (
    typeof event.starts_at === "string"
    && Number.isFinite(Date.parse(event.starts_at))
    && selectCurrentPeopleAttorneyAssignments({
      tenant_id,
      as_of: event.starts_at,
      members: assignments,
    }).some((assignment) => (
      assignment.matter_id === event.matter_id
      && assignment.employee_id === employee_id
    ))
  )));
}
