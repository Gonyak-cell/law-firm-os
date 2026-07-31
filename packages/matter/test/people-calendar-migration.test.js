import assert from "node:assert/strict";
import test from "node:test";
import { backfillPeopleCalendarEvents } from "../src/people-calendar-migration.js";

const TENANT = "tenant-people";

function legacy(id, overrides = {}) {
  return {
    tenant_id: TENANT,
    matter_id: `matter-${id}`,
    event_id: `event-${id}`,
    title: "재판 준비",
    status: "scheduled",
    starts_at: "2026-07-30T10:00:00.000Z",
    source_ref: `legacy-${id}`,
    ...overrides,
  };
}

test("calendar migration never infers a court hearing from title text", () => {
  const result = backfillPeopleCalendarEvents({
    tenant_id: TENANT,
    events: [legacy("title-only")],
  });

  assert.equal(result.rows[0].event_kind, "unknown");
  assert.equal(result.report.classified_count, 0);
  assert.equal(result.report.unknown_count, 1);
  assert.deepEqual(result.review_required.map(({ event_id }) => event_id), ["event-title-only"]);
});

test("explicit source metadata is repeatable and provider collisions are quarantined", () => {
  const metadata = [
    {
      tenant_id: TENANT,
      event_id: "event-a",
      event_kind: "court_hearing",
      provider: "outlook",
      provider_event_id: "graph-1",
    },
    {
      tenant_id: TENANT,
      event_id: "event-b",
      event_kind: "meeting",
      provider: "outlook",
      provider_event_id: "graph-1",
    },
  ];
  const input = {
    tenant_id: TENANT,
    events: [legacy("a"), legacy("b")],
    source_metadata: metadata,
  };
  const first = backfillPeopleCalendarEvents(input);
  const second = backfillPeopleCalendarEvents({ ...input, events: first.rows });

  assert.deepEqual(second, first);
  assert.equal(first.rows[0].event_kind, "court_hearing");
  assert.equal(first.rows[1].event_kind, "unknown");
  assert.equal(first.rows[1].provider_event_id, null);
  assert.equal(first.conflicts.length, 1);
  assert.equal(first.report.conflict_count, 1);
  assert.equal(first.report.title_inference_count, 0);
});
