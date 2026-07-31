import { createHash } from "node:crypto";
import { selectCurrentPeopleAttorneyAssignments } from "../../matter/src/people-member-cutover.js";
import { selectExplicitPeopleTasks } from "../../matter/src/people-task-cutover.js";
import { selectExplicitPeopleCourtHearings } from "../../matter/src/people-calendar-cutover.js";

function visibleSet(ids = []) {
  return new Set(Array.isArray(ids) ? ids : []);
}

export function activeAttorneyAssignments({
  tenant_id,
  employee_id,
  as_of,
  assignments = [],
  visible_matter_ids = [],
} = {}) {
  const visible = visibleSet(visible_matter_ids);
  return Object.freeze(
    selectCurrentPeopleAttorneyAssignments({
      tenant_id,
      as_of,
      members: (Array.isArray(assignments) ? assignments : [])
        .filter((assignment) => visible.has(assignment.matter_id)),
    }).filter((assignment) => assignment.employee_id === employee_id),
  );
}

export function memberTasks({
  tenant_id,
  user_id,
  identity_state = typeof user_id === "string" && user_id.trim() ? "resolved" : "missing",
  tasks = [],
  visible_matter_ids = [],
} = {}) {
  if (identity_state !== "resolved" || typeof user_id !== "string" || !user_id.trim()) return null;
  const visible = visibleSet(visible_matter_ids);
  return selectExplicitPeopleTasks({
    tenant_id,
    user_id,
    tasks: (Array.isArray(tasks) ? tasks : []).filter((task) => visible.has(task.matter_id)),
  });
}

export function memberEvents({
  tenant_id,
  employee_id,
  as_of,
  assignments = [],
  events = [],
  visible_matter_ids = [],
} = {}) {
  const visible = visibleSet(visible_matter_ids);
  const visibleAssignments = (Array.isArray(assignments) ? assignments : [])
    .filter((assignment) => visible.has(assignment.matter_id));
  const hearings = selectExplicitPeopleCourtHearings({
    tenant_id,
    allowed_matter_ids: visible_matter_ids,
    events,
  });
  return Object.freeze(hearings.filter((event) => (
    typeof event.starts_at === "string"
    && Number.isFinite(Date.parse(event.starts_at))
    && selectCurrentPeopleAttorneyAssignments({
      tenant_id,
      as_of: event.starts_at,
      members: visibleAssignments,
    }).some((assignment) => (
      assignment.matter_id === event.matter_id
      && assignment.employee_id === employee_id
    ))
  )));
}

export function createPeopleMatterSelectorProjection(input = {}) {
  const attorneyAssignments = activeAttorneyAssignments(input);
  const tasks = memberTasks(input);
  const events = memberEvents(input);
  const projection = {
    active_attorney_assignments: attorneyAssignments,
    member_tasks: tasks,
    member_events: events,
    task_source_state: tasks === null ? "identity_link_required" : "ok",
    permission_filter_applied_before_aggregation: true,
    existence_hidden: true,
  };
  return Object.freeze({
    ...projection,
    result_hash: `sha256:${createHash("sha256").update(JSON.stringify(projection)).digest("hex")}`,
  });
}
