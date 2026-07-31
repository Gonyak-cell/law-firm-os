import { createHash } from "node:crypto";

const TEAM_VIEW_ROLES = new Set(["manager", "people_ops", "admin"]);

function failure(code, message) {
  const error = new Error(message);
  error.safe_error_code = code;
  return error;
}

function eventRef(value) {
  return `sha256:${createHash("sha256").update(String(value)).digest("hex")}`;
}

function requiredTimestamp(value, field) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw failure("OUTLOOK_CALENDAR_PRIVACY_INVALID", `${field} must be an ISO timestamp`);
  }
  return value;
}

function canRead({ viewer_employee_id, subject_employee_id, viewer_roles }) {
  if (viewer_employee_id && viewer_employee_id === subject_employee_id) return "self";
  const roles = new Set(Array.isArray(viewer_roles) ? viewer_roles : []);
  return [...roles].some((role) => TEAM_VIEW_ROLES.has(role)) ? "team" : null;
}

export function redactOutlookCalendarEvent({
  event,
  viewer_employee_id,
  subject_employee_id,
  viewer_roles = [],
} = {}) {
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    throw failure("OUTLOOK_CALENDAR_PRIVACY_INVALID", "Outlook event is invalid");
  }
  const access = canRead({ viewer_employee_id, subject_employee_id, viewer_roles });
  if (!access) throw failure("OUTLOOK_CALENDAR_PRIVACY_DENIED", "Outlook calendar access is denied");
  const privateEvent = String(event.sensitivity ?? "").toLowerCase() === "private";
  const self = access === "self";
  return Object.freeze({
    calendar_event_ref: eventRef(event.provider_event_id ?? `${event.starts_at}:${event.ends_at}`),
    title: privateEvent ? "비공개 일정" : self ? String(event.title ?? "일정") : "일정 있음",
    starts_at: requiredTimestamp(event.starts_at, "starts_at"),
    ends_at: requiredTimestamp(event.ends_at, "ends_at"),
    is_all_day: event.is_all_day === true,
    is_cancelled: event.is_cancelled === true,
    show_as: typeof event.show_as === "string" ? event.show_as : "busy",
    is_required: String(event.attendee_type ?? "").toLowerCase() === "required",
    response_status: typeof event.response_status === "string" ? event.response_status : "none",
    is_organizer: event.is_organizer === true,
    privacy_view: self ? "self" : "team",
  });
}

export function projectOutlookCalendarForViewer({
  events = [],
  viewer_employee_id,
  subject_employee_id,
  viewer_roles = [],
} = {}) {
  try {
    const projected = events.map((event) => redactOutlookCalendarEvent({
      event,
      viewer_employee_id,
      subject_employee_id,
      viewer_roles,
    }));
    return Object.freeze({
      state: "ok",
      events: Object.freeze(projected),
      existence_hidden: true,
    });
  } catch (error) {
    return Object.freeze({
      state: "blocked",
      events: null,
      safe_error_code: typeof error?.safe_error_code === "string"
        ? error.safe_error_code
        : "OUTLOOK_CALENDAR_PRIVACY_FAILED",
      existence_hidden: true,
    });
  }
}
