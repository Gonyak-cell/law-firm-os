import assert from "node:assert/strict";
import test from "node:test";
import { mergePeopleMatterOutlookEvents } from "../src/people-event-dedupe.js";

function matter(overrides = {}) {
  return {
    event_id: "matter-event-1",
    event_kind: "court_hearing",
    title: "변론기일",
    starts_at: "2026-07-30T01:00:00.000Z",
    ends_at: "2026-07-30T02:00:00.000Z",
    status: "scheduled",
    responsible_attorneys: ["emp-1"],
    ...overrides,
  };
}

function outlook(overrides = {}) {
  return {
    provider_event_id: "provider-event-1",
    provider_series_id: null,
    ical_uid: "ical-1",
    calendar_event_ref: "sha256:redacted",
    title: "일정 있음",
    starts_at: "2026-07-30T01:00:00.000Z",
    ends_at: "2026-07-30T02:00:00.000Z",
    is_cancelled: false,
    privacy_view: "team",
    ...overrides,
  };
}

test("exact provider, series occurrence, and iCal matches merge with Matter authority", () => {
  const cases = [
    [
      matter({ provider_event_id: "provider-event-1" }),
      outlook(),
      "provider_event_id",
    ],
    [
      matter({ provider_series_id: "series-1", ical_uid: null }),
      outlook({ provider_event_id: "other", provider_series_id: "series-1", ical_uid: null }),
      "series_occurrence",
    ],
    [
      matter({ ical_uid: "ical-1" }),
      outlook({ provider_event_id: "other" }),
      "ical_uid",
    ],
  ];
  for (const [matterEvent, outlookEvent, rule] of cases) {
    const item = mergePeopleMatterOutlookEvents({
      matter_events: [matterEvent],
      outlook_events: [outlookEvent],
    }).items[0];
    assert.equal(item.merge_state, "merged");
    assert.equal(item.match_rule, rule);
    assert.equal(item.event_kind, "court_hearing");
    assert.deepEqual(item.responsible_attorneys, ["emp-1"]);
    assert.equal(item.outlook_event.title, "일정 있음");
  }
});

test("time or cancellation mismatch is a conflict and keyless overlap is never auto-merged", () => {
  const conflict = mergePeopleMatterOutlookEvents({
    matter_events: [matter({ provider_event_id: "provider-event-1" })],
    outlook_events: [outlook({
      starts_at: "2026-07-30T01:30:00.000Z",
      ends_at: "2026-07-30T02:30:00.000Z",
      is_cancelled: true,
    })],
  }).items[0];
  assert.equal(conflict.merge_state, "conflict");
  assert.deepEqual(conflict.conflict_reasons, ["time_mismatch", "cancellation_mismatch"]);

  const possible = mergePeopleMatterOutlookEvents({
    matter_events: [matter()],
    outlook_events: [outlook({ provider_event_id: "other", ical_uid: null })],
  });
  assert.equal(possible.items[0].merge_state, "possible_duplicate");
  assert.equal(possible.items[0].automatically_merged, false);
  assert.equal(possible.string_similarity_auto_merge, false);
});

test("unmatched events remain separate without expanding privacy fields", () => {
  const result = mergePeopleMatterOutlookEvents({
    matter_events: [matter({ starts_at: "2026-07-30T04:00:00.000Z", ends_at: "2026-07-30T05:00:00.000Z" })],
    outlook_events: [outlook()],
  });
  assert.deepEqual(result.items.map(({ merge_state }) => merge_state), ["matter_only", "outlook_only"]);
  assert.equal(JSON.stringify(result).includes("인수합병 자문 전략회의"), false);
  assert.equal(result.matter_authority_preserved, true);
});
