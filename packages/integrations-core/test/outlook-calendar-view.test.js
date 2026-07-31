import assert from "node:assert/strict";
import test from "node:test";
import {
  createOutlookCalendarViewAdapter,
  OUTLOOK_CALENDAR_VIEW_SELECT_FIELDS,
} from "../src/outlook-calendar-view.js";

function graphEvent(overrides = {}) {
  return {
    id: "event-1",
    subject: "필수 회의",
    start: { dateTime: "2026-07-30T09:00:00", timeZone: "Asia/Seoul" },
    end: { dateTime: "2026-07-30T09:30:00", timeZone: "Asia/Seoul" },
    isAllDay: false,
    isCancelled: false,
    sensitivity: "normal",
    showAs: "busy",
    isOrganizer: false,
    responseStatus: { response: "accepted" },
    attendees: [
      {
        type: "required",
        status: { response: "accepted", time: "2026-07-29T00:00:00Z" },
        emailAddress: { name: "구성원", address: "member@example.test" },
      },
      {
        type: "optional",
        status: { response: "none", time: "0001-01-01T00:00:00Z" },
        emailAddress: { name: "동료", address: "colleague@example.test" },
      },
    ],
    iCalUId: "ical-1",
    seriesMasterId: null,
    type: "singleInstance",
    ...overrides,
  };
}

test("calendarView uses KST boundaries, minimal fields, two pages, and recurrence metadata", async () => {
  const calls = [];
  const adapter = createOutlookCalendarViewAdapter({
    request: async (call) => {
      calls.push(call);
      return calls.length === 1
        ? {
            status: 200,
            body: {
              value: [graphEvent()],
              "@odata.nextLink": "https://graph.microsoft.com/v1.0/me/calendarView?$skiptoken=page-2",
            },
          }
        : {
            status: 200,
            body: {
              value: [graphEvent({
                id: "event-2",
                subject: "반복 예외",
                type: "exception",
                seriesMasterId: "series-1",
                isAllDay: true,
                start: { dateTime: "2026-07-30T13:00:00", timeZone: "Asia/Seoul" },
                end: { dateTime: "2026-07-30T14:00:00", timeZone: "Asia/Seoul" },
              })],
            },
          };
    },
  });
  const result = await adapter.read({
    date: "2026-07-30",
    timezone: "Asia/Seoul",
    credential_ref: "vault:tenant-a:outlook-access:1",
    subject_address: "MEMBER@example.test",
  });
  const firstUrl = new URL(calls[0].url);
  assert.equal(firstUrl.searchParams.get("startDateTime"), "2026-07-30T00:00:00+09:00");
  assert.equal(firstUrl.searchParams.get("endDateTime"), "2026-07-31T00:00:00+09:00");
  assert.equal(calls[0].headers.Prefer, 'outlook.timezone="Asia/Seoul"');
  assert.equal(result.page_count, 2);
  assert.equal(result.events[1].occurrence_type, "exception");
  assert.equal(result.events[1].provider_series_id, "series-1");
  assert.equal(result.events[1].is_all_day, true);
  assert.equal(result.events[0].starts_at, "2026-07-30T00:00:00.000Z");
  assert.equal(result.events[0].attendee_type, "required");
  assert.equal(JSON.stringify(result).includes("member@example.test"), false);
  assert.equal(JSON.stringify(result).includes("colleague@example.test"), false);
  assert.equal(result.body_requested, false);
  assert.equal(result.attachments_requested, false);
  assert.equal(result.location_requested, false);
  assert.equal(OUTLOOK_CALENDAR_VIEW_SELECT_FIELDS.includes("body"), false);
  assert.equal(OUTLOOK_CALENDAR_VIEW_SELECT_FIELDS.includes("location"), false);
  assert.equal(OUTLOOK_CALENDAR_VIEW_SELECT_FIELDS.includes("lastModifiedDateTime"), false);
});

test("real Graph attendee fields classify required, optional, unknown, and organizer without persisting addresses", async () => {
  const adapter = createOutlookCalendarViewAdapter({
    request: async () => ({
      status: 200,
      body: {
        value: [
          graphEvent({ id: "required" }),
          graphEvent({
            id: "optional",
            attendees: [{
              type: "optional",
              status: { response: "tentativelyAccepted", time: "2026-07-29T00:00:00Z" },
              emailAddress: { name: "구성원", address: "member@example.test" },
            }],
            responseStatus: { response: "tentativelyAccepted", time: "2026-07-29T00:00:00Z" },
          }),
          graphEvent({
            id: "unmatched",
            attendees: [{
              type: "required",
              status: { response: "accepted", time: "2026-07-29T00:00:00Z" },
              emailAddress: { name: "다른 구성원", address: "other@example.test" },
            }],
          }),
          graphEvent({
            id: "organizer",
            isOrganizer: true,
            attendees: [{
              type: "required",
              status: { response: "accepted", time: "2026-07-29T00:00:00Z" },
              emailAddress: { name: "구성원", address: "member@example.test" },
            }],
            responseStatus: { response: "organizer", time: "0001-01-01T00:00:00Z" },
          }),
        ],
      },
    }),
  });
  const result = await adapter.read({
    date: "2026-07-30",
    timezone: "Asia/Seoul",
    credential_ref: "vault:tenant-a:outlook-access:1",
    subject_address: "Member@Example.Test",
  });
  const byId = Object.fromEntries(result.events.map((event) => [event.provider_event_id, event]));
  assert.equal(byId.required.attendee_type, "required");
  assert.equal(byId.optional.attendee_type, "optional");
  assert.equal(byId.optional.response_status, "tentativelyAccepted");
  assert.equal(byId.unmatched.attendee_type, "unknown");
  assert.equal(byId.organizer.attendee_type, "organizer");
  assert.equal(byId.organizer.response_status, "organizer");
  assert.equal(JSON.stringify(result).includes("@example.test"), false);
});

test("missing trusted subject address fails safe to unknown attendee type", async () => {
  const adapter = createOutlookCalendarViewAdapter({
    request: async () => ({ status: 200, body: { value: [graphEvent()] } }),
  });
  const result = await adapter.read({
    date: "2026-07-30",
    credential_ref: "vault:tenant-a:outlook-access:1",
  });
  assert.equal(result.events[0].attendee_type, "unknown");
  assert.equal(result.events[0].response_status, "accepted");
});

test("429 uses bounded Retry-After and 401 refreshes once", async () => {
  const waits = [];
  const statuses = [429, 401, 200];
  const credentialRefs = [];
  let refreshCount = 0;
  const adapter = createOutlookCalendarViewAdapter({
    request: async ({ credential_ref }) => {
      credentialRefs.push(credential_ref);
      const status = statuses.shift();
      return status === 200
        ? { status, body: { value: [] } }
        : { status, headers: { "retry-after": "2" }, body: {} };
    },
    wait: async (milliseconds) => waits.push(milliseconds),
    refreshCredential: async () => {
      refreshCount += 1;
      return { credential_ref: "vault:tenant-a:outlook-access:2" };
    },
  });
  const result = await adapter.read({
    date: "2026-07-30",
    timezone: "Asia/Seoul",
    credential_ref: "vault:tenant-a:outlook-access:1",
  });
  assert.deepEqual(waits, [2000]);
  assert.equal(refreshCount, 1);
  assert.deepEqual(credentialRefs, [
    "vault:tenant-a:outlook-access:1",
    "vault:tenant-a:outlook-access:1",
    "vault:tenant-a:outlook-access:2",
  ]);
  assert.equal(result.request_count, 3);
});

test("malformed responses and unsafe next links fail closed", async () => {
  const malformed = createOutlookCalendarViewAdapter({
    request: async () => ({ status: 200, body: { value: "not-an-array" } }),
  });
  await assert.rejects(
    () => malformed.read({ date: "2026-07-30", credential_ref: "vault:one" }),
    (error) => error.safe_error_code === "OUTLOOK_CALENDAR_RESPONSE_INVALID",
  );
  const unsafe = createOutlookCalendarViewAdapter({
    request: async () => ({
      status: 200,
      body: { value: [], "@odata.nextLink": "https://example.test/steal" },
    }),
  });
  await assert.rejects(
    () => unsafe.read({ date: "2026-07-30", credential_ref: "vault:one" }),
    (error) => error.safe_error_code === "OUTLOOK_CALENDAR_NEXT_LINK_UNSAFE",
  );
});
