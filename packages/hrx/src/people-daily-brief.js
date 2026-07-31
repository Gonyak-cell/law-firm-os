import { createHash } from "node:crypto";
import { classifyOutlookMeeting } from "./outlook-meeting-classifier.js";
import { mergePeopleMatterOutlookEvents } from "./people-event-dedupe.js";
import { peopleDayBounds } from "./people-intervals.js";
import { createPeopleMatterSelectorProjection } from "./people-matter-selectors.js";

const IMPORTANT_EVENT_KINDS = new Set(["court_hearing", "deadline"]);

function localDateKey(value, timezone) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(value));
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateKey(value, timezone) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return localDateKey(value, timezone);
}

function intervalTouchesDate({ starts_at: startsAt, ends_at: endsAt }, targetDate, timezone) {
  if (typeof startsAt === "string" && /^\d{4}-\d{2}-\d{2}$/.test(startsAt)) {
    if (!endsAt) return startsAt === targetDate;
    if (typeof endsAt !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(endsAt)) return false;
    return startsAt <= targetDate && targetDate < endsAt;
  }
  const startMs = typeof startsAt === "string" ? Date.parse(startsAt) : Number.NaN;
  if (!Number.isFinite(startMs)) return false;
  if (!endsAt) return localDateKey(startsAt, timezone) === targetDate;
  const endMs = typeof endsAt === "string" ? Date.parse(endsAt) : Number.NaN;
  if (!Number.isFinite(endMs) || endMs <= startMs) return false;
  const bounds = peopleDayBounds({ date: targetDate, timezone });
  return startMs < Date.parse(bounds.end_at) && endMs > Date.parse(bounds.start_at);
}

function matterLabel(matter) {
  return {
    matter_id: matter.matter_id,
    matter_code: matter.matter_code ?? null,
    matter_name: matter.matter_name ?? matter.title ?? null,
  };
}

function safeTask(task, matterById) {
  return Object.freeze({
    task_id: task.task_id,
    ...matterLabel(matterById.get(task.matter_id) ?? { matter_id: task.matter_id }),
    title: task.title ?? "제목 없는 업무",
    status: task.status,
    starts_at: task.starts_at ?? null,
    ends_at: task.ends_at ?? null,
    due_at: task.due_at ?? null,
    estimated_minutes: task.estimated_minutes ?? null,
    scheduling_state: task.starts_at && !task.ends_at
      ? "needs_end_time"
      : task.starts_at
        ? "time_bound"
        : task.due_at
          ? "due_only"
          : "unscheduled",
  });
}

function safeEvent(event, matterById) {
  return Object.freeze({
    event_id: event.event_id,
    ...matterLabel(matterById.get(event.matter_id) ?? { matter_id: event.matter_id }),
    title: event.title ?? "제목 없는 일정",
    event_kind: event.event_kind,
    starts_at: event.starts_at,
    ends_at: event.ends_at ?? null,
    location: event.location ?? null,
  });
}

function outlookEventKey(event) {
  return event?.calendar_event_ref
    ?? event?.provider_event_id
    ?? `${event?.starts_at ?? "unknown"}:${event?.ends_at ?? "unknown"}`;
}

function safeOutlookEvent(event, classification, mergeState) {
  return Object.freeze({
    calendar_event_ref: event.calendar_event_ref ?? null,
    title: event.title ?? "일정",
    starts_at: event.starts_at,
    ends_at: event.ends_at,
    is_all_day: event.is_all_day === true,
    show_as: event.show_as ?? "busy",
    is_required: classification.required,
    response_status: event.response_status ?? "none",
    is_organizer: event.is_organizer === true,
    privacy_view: event.privacy_view ?? null,
    merge_state: mergeState,
    possible_duplicate: mergeState === "possible_duplicate",
    classification_reason: classification.reason,
    classifier_version: classification.classifier_version,
  });
}

function safeOutlookConnection(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.freeze({
    provider: value.provider === "microsoft_graph" ? value.provider : "microsoft_graph",
    connection_state: typeof value.connection_state === "string" ? value.connection_state : "not_connected",
    can_manage: value.can_manage === true,
    delegated_scope: value.delegated_scope === "Calendars.ReadBasic" ? value.delegated_scope : "Calendars.ReadBasic",
    connected_at: typeof value.connected_at === "string" ? value.connected_at : null,
    expires_at: typeof value.expires_at === "string" ? value.expires_at : null,
    safe_error_code: typeof value.safe_error_code === "string" ? value.safe_error_code : null,
  });
}

function combinedResultHash(matterHash, outlookIntervals, requiredMeetings, connection) {
  return `sha256:${createHash("sha256").update(JSON.stringify({
    matter_hash: matterHash,
    outlook_intervals: outlookIntervals,
    required_meetings: requiredMeetings,
    outlook_connection: connection,
  })).digest("hex")}`;
}

function nextImportantEvent(events, matterId, asOf) {
  const asOfMs = Date.parse(asOf);
  return events
    .filter((event) => (
      event?.matter_id === matterId
      && IMPORTANT_EVENT_KINDS.has(event.event_kind)
      && event.status !== "cancelled"
      && Number.isFinite(Date.parse(event.starts_at))
      && Date.parse(event.starts_at) >= asOfMs
    ))
    .sort((left, right) => (
      Date.parse(left.starts_at) - Date.parse(right.starts_at)
      || String(left.event_id).localeCompare(String(right.event_id))
    ))[0] ?? null;
}

function assignedMatterRows({ assignments, matters, events, asOf }) {
  const matterById = new Map(matters.map((matter) => [matter.matter_id, matter]));
  return Object.freeze(
    assignments
      .map((assignment) => {
        const matter = matterById.get(assignment.matter_id);
        if (!matter) return null;
        const nextEvent = nextImportantEvent(events, assignment.matter_id, asOf);
        return Object.freeze({
          ...matterLabel(matter),
          role: assignment.role,
          next_important_event: nextEvent ? safeEvent(nextEvent, matterById) : null,
          handoff_state: assignment.valid_to ? "handoff_scheduled" : "current",
        });
      })
      .filter(Boolean)
      .sort((left, right) => {
        const leftAt = left.next_important_event?.starts_at ?? "9999-12-31T23:59:59.999Z";
        const rightAt = right.next_important_event?.starts_at ?? "9999-12-31T23:59:59.999Z";
        return leftAt.localeCompare(rightAt)
          || String(left.matter_code ?? left.matter_id).localeCompare(String(right.matter_code ?? right.matter_id));
      }),
  );
}

export function createPeopleDailyBriefProjection({
  tenant_id,
  employee,
  user_id,
  as_of,
  timezone = "Asia/Seoul",
  visible_matters = [],
  assignments = [],
  tasks = [],
  events = [],
  identity_state = "resolved",
  outlook_events = [],
  outlook_connection = null,
} = {}) {
  if (!employee || employee.tenant_id !== tenant_id) throw new TypeError("employee must belong to tenant_id");
  if (typeof as_of !== "string" || !Number.isFinite(Date.parse(as_of))) throw new TypeError("as_of must be an ISO timestamp");
  const targetDate = localDateKey(as_of, timezone);
  const visibleMatterIds = visible_matters.map(({ matter_id }) => matter_id);
  const selected = createPeopleMatterSelectorProjection({
    tenant_id,
    employee_id: employee.employee_id,
    user_id,
    as_of,
    visible_matter_ids: visibleMatterIds,
    assignments,
    tasks,
    events,
    identity_state,
  });
  const matterById = new Map(visible_matters.map((matter) => [matter.matter_id, matter]));
  const timeBound = (selected.member_tasks?.time_bound ?? [])
    .filter((task) => intervalTouchesDate(task, targetDate, timezone))
    .map((task) => safeTask(task, matterById));
  const dueOnly = (selected.member_tasks?.due_only ?? [])
    .filter((task) => dateKey(task.due_at, timezone) === targetDate)
    .map((task) => safeTask(task, matterById));
  const unscheduled = (selected.member_tasks?.unscheduled ?? [])
    .filter((task) => !task.starts_at || dateKey(task.starts_at, timezone) === targetDate)
    .map((task) => safeTask(task, matterById));
  const todayMatterEvents = selected.member_events
    .filter((event) => intervalTouchesDate(event, targetDate, timezone));
  const hearings = todayMatterEvents.map((event) => safeEvent(event, matterById));
  const todayOutlookEvents = (Array.isArray(outlook_events) ? outlook_events : [])
    .filter((event) => intervalTouchesDate(event, targetDate, timezone));
  const mergedEvents = mergePeopleMatterOutlookEvents({
    matter_events: todayMatterEvents,
    outlook_events: todayOutlookEvents,
  });
  const mergeStateByOutlookKey = new Map(
    mergedEvents.items
      .filter((item) => item.outlook_event)
      .map((item) => [outlookEventKey(item.outlook_event), item.merge_state]),
  );
  const classifiedOutlook = todayOutlookEvents.map((event) => {
    const classification = classifyOutlookMeeting({ event, as_of });
    const mergeState = mergeStateByOutlookKey.get(outlookEventKey(event)) ?? "outlook_only";
    return {
      event: safeOutlookEvent(event, classification, mergeState),
      classification,
      mergeState,
    };
  });
  const outlookIntervals = Object.freeze(
    classifiedOutlook
      .filter(({ classification, mergeState }) => classification.include_in_timeline && mergeState !== "merged")
      .map(({ event }) => event)
      .sort((left, right) => left.starts_at.localeCompare(right.starts_at) || left.title.localeCompare(right.title, "ko-KR")),
  );
  const requiredMeetings = Object.freeze(
    classifiedOutlook
      .filter(({ classification, mergeState }) => classification.include_in_today_tasks && mergeState !== "merged")
      .map(({ event }) => event)
      .sort((left, right) => left.starts_at.localeCompare(right.starts_at) || left.title.localeCompare(right.title, "ko-KR")),
  );
  const safeConnection = safeOutlookConnection(outlook_connection);
  const confirmationItems = [];
  if (identity_state !== "resolved") {
    confirmationItems.push(Object.freeze({
      kind: "employee_user_link_confirmation_required",
      employee_id: employee.employee_id,
      safe_reason: identity_state,
    }));
  }
  for (const task of unscheduled) {
    confirmationItems.push(Object.freeze({
      kind: "task_time_confirmation_required",
      task_id: task.task_id,
      matter_id: task.matter_id,
    }));
  }
  return Object.freeze({
    member: Object.freeze({
      employee_id: employee.employee_id,
      display_name: employee.display_name,
      status: employee.status,
      title: employee.title ?? null,
    }),
    date: targetDate,
    tasks: selected.member_tasks === null
      ? null
      : Object.freeze({
          time_bound: Object.freeze(timeBound),
          due_only: Object.freeze(dueOnly),
          unscheduled: Object.freeze(unscheduled),
        }),
    task_source_state: selected.task_source_state,
    hearings: Object.freeze(hearings),
    outlook_intervals: outlookIntervals,
    required_meetings: requiredMeetings,
    outlook_connection: safeConnection,
    outlook_event_merge: Object.freeze({
      merged_count: mergedEvents.items.filter((item) => item.merge_state === "merged").length,
      conflict_count: mergedEvents.items.filter((item) => item.merge_state === "conflict").length,
      possible_duplicate_count: mergedEvents.items.filter((item) => item.merge_state === "possible_duplicate").length,
      string_similarity_auto_merge: false,
      matter_authority_preserved: true,
    }),
    assigned_matters: assignedMatterRows({
      assignments: selected.active_attorney_assignments,
      matters: visible_matters,
      events,
      asOf: as_of,
    }),
    confirmation_items: Object.freeze(confirmationItems),
    permission_filter_applied_before_aggregation: true,
    existence_hidden: true,
    result_hash: combinedResultHash(selected.result_hash, outlookIntervals, requiredMeetings, safeConnection),
  });
}
