import assert from "node:assert/strict";
import test from "node:test";
import { createMatterActivityCalendarChannelService } from "../src/activity-calendar-channel-service.js";
import {
  comparePeopleCalendarSelectors,
  selectExplicitPeopleCourtHearings,
} from "../src/people-calendar-cutover.js";
import { createMatterRepository } from "../src/repository.js";

const TENANT = "tenant-people";

test("new calendar writer requires an explicit event_kind", () => {
  const service = createMatterActivityCalendarChannelService({
    repository: createMatterRepository(),
  });
  const input = {
    tenant_id: TENANT,
    matter_id: "matter-1",
    actor_id: "user-1",
    occurred_at: "2026-07-30T09:00:00.000Z",
    event: {
      event_id: "event-1",
      title: "변론기일",
      status: "scheduled",
      starts_at: "2026-07-30T10:00:00.000Z",
    },
  };
  assert.throws(() => service.createCalendarEvent(input), /event_kind/);
  const created = service.createCalendarEvent({
    ...input,
    event: { ...input.event, event_kind: "court_hearing" },
  });
  assert.equal(created.item.event_kind, "court_hearing");
});

test("People hearing selector accepts only explicit non-cancelled court hearings", () => {
  const base = {
    tenant_id: TENANT,
    matter_id: "matter-1",
    starts_at: "2026-07-30T10:00:00.000Z",
    status: "scheduled",
  };
  const selected = selectExplicitPeopleCourtHearings({
    tenant_id: TENANT,
    allowed_matter_ids: ["matter-1"],
    events: [
      { ...base, event_id: "hearing", event_kind: "court_hearing", title: "변론기일" },
      { ...base, event_id: "title-only", event_kind: "unknown", title: "Court hearing preparation" },
      { ...base, event_id: "deadline", event_kind: "deadline", title: "제출기한" },
      { ...base, event_id: "internal", event_kind: "internal", title: "내부 회의" },
      { ...base, event_id: "cancelled", event_kind: "court_hearing", status: "cancelled", title: "취소 기일" },
    ],
  });

  assert.deepEqual(selected.map(({ event_id }) => event_id), ["hearing"]);
  const parity = comparePeopleCalendarSelectors({
    tenant_id: TENANT,
    allowed_matter_ids: ["matter-1"],
    events: [
      { ...base, event_id: "title-only", event_kind: "unknown", title: "Court hearing preparation" },
    ],
  });
  assert.equal(parity.legacy_count, 1);
  assert.equal(parity.explicit_count, 0);
  assert.deepEqual(parity.review_event_ids, ["title-only"]);
});
