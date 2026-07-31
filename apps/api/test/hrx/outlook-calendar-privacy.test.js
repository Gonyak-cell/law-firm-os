import assert from "node:assert/strict";
import test from "node:test";
import {
  projectOutlookCalendarForViewer,
  redactOutlookCalendarEvent,
} from "../../../../packages/hrx/src/outlook-calendar-privacy.js";

const event = {
  provider_event_id: "provider-event-1",
  title: "인수합병 자문 전략회의",
  starts_at: "2026-07-30T01:00:00.000Z",
  ends_at: "2026-07-30T02:00:00.000Z",
  sensitivity: "normal",
  show_as: "busy",
  attendee_type: "required",
  response_status: "accepted",
  is_organizer: false,
  body: "raw body must never leave",
  location: "secret meeting room",
  attachments: [{ name: "secret.pdf" }],
  attendees: [{ address: "person@example.test" }],
  raw_payload: { access_token: "secret-token" },
};

test("self sees a normal title while manager, people_ops, and admin see only busy metadata", () => {
  const self = redactOutlookCalendarEvent({
    event,
    viewer_employee_id: "emp-1",
    subject_employee_id: "emp-1",
  });
  assert.equal(self.title, "인수합병 자문 전략회의");
  for (const role of ["manager", "people_ops", "admin"]) {
    const team = redactOutlookCalendarEvent({
      event,
      viewer_employee_id: "viewer",
      subject_employee_id: "emp-1",
      viewer_roles: [role],
    });
    assert.equal(team.title, "일정 있음");
    assert.equal(team.is_required, true);
    assert.equal(team.show_as, "busy");
    assert.equal(team.privacy_view, "team");
  }
});

test("private is hidden even from self and raw fields never serialize", () => {
  const privateEvent = redactOutlookCalendarEvent({
    event: { ...event, sensitivity: "private" },
    viewer_employee_id: "emp-1",
    subject_employee_id: "emp-1",
  });
  assert.equal(privateEvent.title, "비공개 일정");
  const serialized = JSON.stringify(privateEvent);
  for (const forbidden of ["raw body", "secret meeting", "secret.pdf", "person@example", "secret-token", "provider-event-1"]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("unauthorized and malformed projections block the whole source without count inference", () => {
  const denied = projectOutlookCalendarForViewer({
    events: [event],
    viewer_employee_id: "stranger",
    subject_employee_id: "emp-1",
    viewer_roles: ["staff"],
  });
  assert.deepEqual(denied, {
    state: "blocked",
    events: null,
    safe_error_code: "OUTLOOK_CALENDAR_PRIVACY_DENIED",
    existence_hidden: true,
  });
  assert.equal(Object.hasOwn(denied, "count"), false);
  assert.equal(Object.hasOwn(denied, "omitted_count"), false);
  const malformed = projectOutlookCalendarForViewer({
    events: [{ ...event, starts_at: "invalid" }],
    viewer_employee_id: "emp-1",
    subject_employee_id: "emp-1",
  });
  assert.equal(malformed.state, "blocked");
  assert.equal(JSON.stringify(malformed).includes("invalid"), false);
});
