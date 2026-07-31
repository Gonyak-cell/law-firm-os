import assert from "node:assert/strict";
import test from "node:test";
import {
  createOutlookCalendarCache,
  OUTLOOK_CALENDAR_CACHE_EVENT_FIELDS,
} from "../src/outlook-calendar-cache.js";

function setup() {
  let now = "2026-07-30T00:00:00.000Z";
  const cache = createOutlookCalendarCache({
    ttl_ms: 60_000,
    retention_ms: 300_000,
    clock: () => now,
  });
  const input = {
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_identity_id: "provider-1",
    date: "2026-07-30",
  };
  return { cache, input, setNow: (value) => { now = value; } };
}

test("calendar cache isolates tenant, employee, and provider identity keys", () => {
  const { cache, input } = setup();
  cache.put({
    ...input,
    events: [{
      provider_event_id: "event-1",
      title: "회의",
      starts_at: "2026-07-30T00:00:00.000Z",
      ends_at: "2026-07-30T01:00:00.000Z",
      body: "must-not-cache",
      location: "must-not-cache",
    }],
  });
  assert.equal(cache.get(input).state, "ok");
  assert.equal(cache.get({ ...input, tenant_id: "tenant-b" }).state, "miss");
  assert.equal(cache.get({ ...input, employee_id: "emp-2" }).state, "miss");
  assert.equal(cache.get({ ...input, provider_identity_id: "provider-2" }).state, "miss");
  const serialized = JSON.stringify(cache.snapshot());
  assert.equal(serialized.includes("must-not-cache"), false);
  assert.equal(OUTLOOK_CALENDAR_CACHE_EVENT_FIELDS.includes("body"), false);
  assert.equal(OUTLOOK_CALENDAR_CACHE_EVENT_FIELDS.includes("location"), false);
});

test("cache hit avoids provider calls and stale 429 falls back once", async () => {
  const { cache, input, setNow } = setup();
  cache.put({
    ...input,
    events: [{ provider_event_id: "event-1", title: "회의" }],
    etag: "etag-1",
    delta_ref: "delta-1",
  });
  let calls = 0;
  const hit = await cache.readThrough({
    ...input,
    load: async () => {
      calls += 1;
      return { events: [] };
    },
  });
  assert.equal(hit.state, "ok");
  assert.equal(hit.cache, "hit");
  assert.equal(calls, 0);
  setNow("2026-07-30T00:02:00.000Z");
  const throttled = new Error("throttled");
  throttled.safe_error_code = "OUTLOOK_CALENDAR_THROTTLED";
  const stale = await cache.readThrough({
    ...input,
    load: async ({ etag, delta_ref }) => {
      calls += 1;
      assert.equal(etag, "etag-1");
      assert.equal(delta_ref, "delta-1");
      throw throttled;
    },
  });
  assert.equal(calls, 1);
  assert.equal(stale.state, "stale");
  assert.equal(stale.events.length, 1);
  assert.equal(stale.safe_error_code, "OUTLOOK_CALENDAR_THROTTLED");
});

test("token revoke deletion and retention purge remove cached personal data", () => {
  const { cache, input, setNow } = setup();
  cache.put({ ...input, events: [{ provider_event_id: "event-1" }] });
  cache.put({ ...input, date: "2026-07-31", events: [{ provider_event_id: "event-2" }] });
  assert.equal(cache.deleteForIdentity(input).deleted_count, 2);
  assert.equal(cache.snapshot().length, 0);
  cache.put({ ...input, events: [{ provider_event_id: "event-3" }] });
  setNow("2026-07-30T00:06:00.000Z");
  assert.equal(cache.purgeExpired().deleted_count, 1);
  assert.equal(cache.snapshot().length, 0);
});
