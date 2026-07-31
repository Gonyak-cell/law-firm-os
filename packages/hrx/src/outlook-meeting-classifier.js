const ACCEPTED_RESPONSES = new Set(["accepted", "tentativelyaccepted", "tentative", "none", "notresponded"]);

export function classifyOutlookMeeting({ event, as_of } = {}) {
  if (!event || typeof event !== "object" || Array.isArray(event)) throw new TypeError("event is required");
  if (typeof as_of !== "string" || !Number.isFinite(Date.parse(as_of))) throw new TypeError("as_of must be an ISO timestamp");
  const endsAt = Date.parse(event.ends_at);
  if (!Number.isFinite(endsAt)) throw new TypeError("event.ends_at must be an ISO timestamp");
  const cancelled = event.is_cancelled === true;
  const attendeeType = String(event.attendee_type ?? "unknown").toLowerCase();
  const responseStatus = String(event.response_status ?? "none").toLowerCase();
  const required = event.is_required === true || attendeeType === "required";
  const organizerOnly = attendeeType === "organizer" || (event.is_organizer === true && !required);
  const declined = responseStatus === "declined";
  const ended = endsAt <= Date.parse(as_of);
  const includeInTimeline = !cancelled;
  const includeInTodayTasks = (
    includeInTimeline
    && required
    && !organizerOnly
    && !declined
    && ACCEPTED_RESPONSES.has(responseStatus)
    && !ended
  );
  let reason = "required_upcoming";
  if (cancelled) reason = "cancelled";
  else if (ended) reason = "ended";
  else if (declined) reason = "declined";
  else if (organizerOnly) reason = "organizer_only";
  else if (!required) reason = "optional_or_unknown";
  else if (!ACCEPTED_RESPONSES.has(responseStatus)) reason = "response_not_actionable";
  return Object.freeze({
    include_in_timeline: includeInTimeline,
    include_in_today_tasks: includeInTodayTasks,
    required,
    organizer_only: organizerOnly,
    declined,
    ended,
    all_day: event.is_all_day === true,
    reason,
    classifier_version: "people-outlook-meeting.v1",
  });
}
