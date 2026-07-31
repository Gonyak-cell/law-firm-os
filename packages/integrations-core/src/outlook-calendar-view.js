import { createHash } from "node:crypto";
import {
  peopleDateKeyPlusDays,
  peopleDayBounds,
} from "../../hrx/src/people-intervals.js";

const GRAPH_ORIGIN = "https://graph.microsoft.com";
const SELECT_FIELDS = [
  "id",
  "subject",
  "start",
  "end",
  "isAllDay",
  "isCancelled",
  "sensitivity",
  "showAs",
  "isOrganizer",
  "responseStatus",
  "attendees",
  "iCalUId",
  "seriesMasterId",
  "type",
];

function failure(code, message) {
  const error = new Error(message);
  error.safe_error_code = code;
  return error;
}

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : null;
}

function timezoneOffsetMinutes(iso, timezone) {
  const instant = new Date(iso);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const localAsUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second),
  );
  return Math.round((localAsUtc - instant.getTime()) / 60000);
}

function offsetText(offsetMinutes) {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(absolute % 60).padStart(2, "0")}`;
}

function localBoundary(date, timezone) {
  const boundary = peopleDayBounds({ date, timezone }).start_at;
  return `${date}T00:00:00${offsetText(timezoneOffsetMinutes(boundary, timezone))}`;
}

function graphDateTime(value, timezone) {
  if (typeof value !== "string" || !value.trim()) {
    throw failure("OUTLOOK_CALENDAR_RESPONSE_INVALID", "Graph event dateTime is missing");
  }
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) {
    if (!Number.isFinite(Date.parse(value))) throw failure("OUTLOOK_CALENDAR_RESPONSE_INVALID", "Graph event dateTime is invalid");
    return new Date(value).toISOString();
  }
  const assumedUtc = Date.parse(`${value}Z`);
  if (!Number.isFinite(assumedUtc)) throw failure("OUTLOOK_CALENDAR_RESPONSE_INVALID", "Graph event dateTime is invalid");
  let candidate = assumedUtc;
  for (let iteration = 0; iteration < 3; iteration += 1) {
    const offset = timezoneOffsetMinutes(new Date(candidate).toISOString(), timezone);
    candidate = assumedUtc - (offset * 60000);
  }
  return new Date(candidate).toISOString();
}

function mailboxAddress(value) {
  return typeof value === "string" && value.trim()
    ? value.trim().toLowerCase()
    : null;
}

function selfAttendee(event, subjectAddress) {
  if (event.isOrganizer === true) return { attendee_type: "organizer", response_status: "organizer" };
  const trustedAddress = mailboxAddress(subjectAddress);
  const self = trustedAddress && Array.isArray(event.attendees)
    ? event.attendees.find((attendee) => (
        mailboxAddress(attendee?.emailAddress?.address) === trustedAddress
      ))
    : null;
  const attendeeType = self?.type === "required" || self?.type === "optional"
    ? self.type
    : "unknown";
  return {
    attendee_type: attendeeType,
    response_status: event.responseStatus?.response ?? self?.status?.response ?? "none",
  };
}

function normalizeEvent(event, timezone, subjectAddress) {
  if (!event || typeof event !== "object" || Array.isArray(event) || typeof event.id !== "string") {
    throw failure("OUTLOOK_CALENDAR_RESPONSE_INVALID", "Graph event is malformed");
  }
  const attendee = selfAttendee(event, subjectAddress);
  return Object.freeze({
    provider_event_id: event.id,
    provider_series_id: typeof event.seriesMasterId === "string" ? event.seriesMasterId : null,
    ical_uid: typeof event.iCalUId === "string" ? event.iCalUId : null,
    title: typeof event.subject === "string" ? event.subject : "일정",
    starts_at: graphDateTime(event.start?.dateTime, timezone),
    ends_at: graphDateTime(event.end?.dateTime, timezone),
    is_all_day: event.isAllDay === true,
    is_cancelled: event.isCancelled === true,
    sensitivity: typeof event.sensitivity === "string" ? event.sensitivity : "normal",
    show_as: typeof event.showAs === "string" ? event.showAs : "busy",
    is_organizer: event.isOrganizer === true,
    attendee_type: attendee.attendee_type,
    response_status: attendee.response_status,
    occurrence_type: typeof event.type === "string" ? event.type : "singleInstance",
    last_modified_at: typeof event.lastModifiedDateTime === "string" ? event.lastModifiedDateTime : null,
  });
}

function safeNextLink(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw failure("OUTLOOK_CALENDAR_RESPONSE_INVALID", "Graph nextLink is invalid");
  const url = new URL(value);
  if (url.origin !== GRAPH_ORIGIN) throw failure("OUTLOOK_CALENDAR_NEXT_LINK_UNSAFE", "Graph nextLink origin is not allowed");
  return url.toString();
}

function responseHash(events) {
  return `sha256:${createHash("sha256").update(JSON.stringify(events)).digest("hex")}`;
}

export function createOutlookCalendarViewAdapter({
  request,
  refreshCredential,
  wait = async () => {},
  max_retries = 2,
  max_pages = 10,
} = {}) {
  if (typeof request !== "function") throw new TypeError("Graph request port is required");
  if (!Number.isInteger(max_retries) || max_retries < 0 || max_retries > 5) throw new TypeError("max_retries must be between 0 and 5");
  if (!Number.isInteger(max_pages) || max_pages < 1 || max_pages > 50) throw new TypeError("max_pages must be between 1 and 50");

  return Object.freeze({
    async read({
      date,
      timezone = "Asia/Seoul",
      credential_ref,
      subject_address = null,
    } = {}) {
      if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new TypeError("date must be YYYY-MM-DD");
      if (typeof credential_ref !== "string" || !credential_ref) throw new TypeError("credential_ref is required");
      const nextDate = peopleDateKeyPlusDays(date, 1);
      const url = new URL("/v1.0/me/calendarView", GRAPH_ORIGIN);
      url.searchParams.set("startDateTime", localBoundary(date, timezone));
      url.searchParams.set("endDateTime", localBoundary(nextDate, timezone));
      url.searchParams.set("$select", SELECT_FIELDS.join(","));
      url.searchParams.set("$top", "100");
      let nextLink = url.toString();
      let credentialRef = credential_ref;
      let pageCount = 0;
      let requestCount = 0;
      let refreshed = false;
      const events = [];

      while (nextLink) {
        if (pageCount >= max_pages) throw failure("OUTLOOK_CALENDAR_PAGE_LIMIT", "Graph calendar page limit exceeded");
        let retries = 0;
        let response;
        while (true) {
          requestCount += 1;
          response = await request({
            url: nextLink,
            method: "GET",
            headers: {
              Prefer: `outlook.timezone="${timezone}"`,
              Accept: "application/json",
            },
            credential_ref: credentialRef,
          });
          if (response?.status === 401 && !refreshed && typeof refreshCredential === "function") {
            const nextCredential = await refreshCredential({ credential_ref: credentialRef });
            credentialRef = typeof nextCredential === "string"
              ? nextCredential
              : nextCredential?.credential_ref;
            if (typeof credentialRef !== "string" || !credentialRef) {
              throw failure("OUTLOOK_CALENDAR_REFRESH_FAILED", "Graph credential refresh failed");
            }
            refreshed = true;
            continue;
          }
          if (response?.status === 429 && retries < max_retries) {
            retries += 1;
            const seconds = Math.min(60, Math.max(0, Number(headerValue(response.headers, "retry-after")) || 0));
            await wait(seconds * 1000);
            continue;
          }
          break;
        }
        if (response?.status === 401) throw failure("OUTLOOK_CALENDAR_UNAUTHORIZED", "Graph calendar authorization failed");
        if (response?.status === 429) throw failure("OUTLOOK_CALENDAR_THROTTLED", "Graph calendar request remained throttled");
        if (response?.status !== 200) throw failure("OUTLOOK_CALENDAR_READ_FAILED", "Graph calendar read failed");
        const body = response.body;
        if (!body || typeof body !== "object" || Array.isArray(body) || !Array.isArray(body.value)) {
          throw failure("OUTLOOK_CALENDAR_RESPONSE_INVALID", "Graph calendar response is malformed");
        }
        events.push(...body.value.map((event) => normalizeEvent(event, timezone, subject_address)));
        nextLink = safeNextLink(body["@odata.nextLink"]);
        pageCount += 1;
      }
      const sorted = Object.freeze(events.sort((left, right) => (
        left.starts_at.localeCompare(right.starts_at)
        || left.provider_event_id.localeCompare(right.provider_event_id)
      )));
      return Object.freeze({
        date,
        timezone,
        events: sorted,
        credential_ref: credentialRef,
        page_count: pageCount,
        request_count: requestCount,
        response_hash: responseHash(sorted),
        body_requested: false,
        attachments_requested: false,
        location_requested: false,
      });
    },
  });
}

export const OUTLOOK_CALENDAR_VIEW_SELECT_FIELDS = Object.freeze([...SELECT_FIELDS]);
