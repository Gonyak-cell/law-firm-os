import assert from "node:assert/strict";
import test from "node:test";
import { classifyOutlookMeeting } from "../src/outlook-meeting-classifier.js";

const AS_OF = "2026-07-30T01:00:00.000Z";

function classify(overrides = {}) {
  return classifyOutlookMeeting({
    as_of: AS_OF,
    event: {
      attendee_type: "required",
      response_status: "accepted",
      is_cancelled: false,
      is_organizer: false,
      is_all_day: false,
      ends_at: "2026-07-30T02:00:00.000Z",
      ...overrides,
    },
  });
}

test("required accepted and tentative meetings remain actionable while optional does not", () => {
  assert.equal(classify().include_in_today_tasks, true);
  assert.equal(classify({ response_status: "tentative" }).include_in_today_tasks, true);
  assert.equal(classify({ response_status: "tentativelyAccepted" }).include_in_today_tasks, true);
  assert.equal(classify({ attendee_type: "optional" }).include_in_today_tasks, false);
  assert.equal(classify({ attendee_type: "optional" }).include_in_timeline, true);
});

test("declined, cancelled, organizer-only, and ended meetings are excluded from Today tasks", () => {
  assert.deepEqual(
    [
      classify({ response_status: "declined" }),
      classify({ is_cancelled: true }),
      classify({ attendee_type: "organizer", is_organizer: true }),
      classify({ ends_at: "2026-07-30T00:59:59.000Z" }),
    ].map(({ include_in_today_tasks }) => include_in_today_tasks),
    [false, false, false, false],
  );
  assert.equal(classify({ is_cancelled: true }).include_in_timeline, false);
  assert.equal(classify({ ends_at: "2026-07-30T00:59:59.000Z" }).include_in_timeline, true);
});

test("required all-day meeting follows the same attendee rule without inventing duration", () => {
  const allDay = classify({ is_all_day: true });
  assert.equal(allDay.include_in_today_tasks, true);
  assert.equal(allDay.all_day, true);
  assert.equal(allDay.classifier_version, "people-outlook-meeting.v1");
});
