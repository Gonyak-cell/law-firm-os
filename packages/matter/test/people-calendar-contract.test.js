import assert from "node:assert/strict";
import test from "node:test";
import {
  MATTER_CALENDAR_EVENT_KINDS,
  createMatterCalendarEvent,
} from "../src/model.js";
import { createMatterRepository } from "../src/repository.js";

const BASE = {
  tenant_id: "tenant-people",
  matter_id: "matter-1",
  event_id: "event-1",
  title: "기일",
  status: "scheduled",
  starts_at: "2026-07-30T10:00:00.000Z",
  ends_at: "2026-07-30T11:00:00.000Z",
  event_kind: "court_hearing",
  provider: "outlook",
  provider_event_id: "graph-event-1",
  provider_series_id: "graph-series-1",
};

test("Matter calendar accepts only explicit People event kinds including cancelled hearings", () => {
  for (const eventKind of MATTER_CALENDAR_EVENT_KINDS) {
    assert.equal(createMatterCalendarEvent({
      ...BASE,
      event_id: `event-${eventKind}`,
      event_kind: eventKind,
    }).event_kind, eventKind);
  }
  assert.equal(createMatterCalendarEvent({ ...BASE, status: "cancelled" }).status, "cancelled");
  assert.throws(() => createMatterCalendarEvent({ ...BASE, event_kind: "trial-ish" }), /event_kind/);
});

test("calendar interval and provider identity contracts reject unsafe inputs", () => {
  assert.throws(() => createMatterCalendarEvent({
    ...BASE,
    ends_at: "2026-07-30T09:00:00.000Z",
  }), /ends_at/);
  assert.throws(() => createMatterCalendarEvent({
    ...BASE,
    provider: null,
  }), /provider/);
  assert.throws(() => createMatterCalendarEvent({
    ...BASE,
    raw_provider_payload: { access_token: "secret" },
  }), /raw provider/i);
  assert.throws(() => createMatterCalendarEvent({
    ...BASE,
    body: "private Graph body",
  }), /raw provider/i);
});

test("provider event id is tenant-unique without blocking another tenant", () => {
  const repository = createMatterRepository();
  repository.create(createMatterCalendarEvent(BASE));
  assert.throws(() => repository.create(createMatterCalendarEvent({
    ...BASE,
    matter_id: "matter-2",
    event_id: "event-2",
  })), /provider_event_id/);
  assert.doesNotThrow(() => repository.create(createMatterCalendarEvent({
    ...BASE,
    tenant_id: "tenant-other",
    matter_id: "matter-2",
    event_id: "event-2",
  })));
});
