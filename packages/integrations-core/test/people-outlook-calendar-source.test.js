import assert from "node:assert/strict";
import test from "node:test";
import { createOutlookCalendarCache } from "../src/outlook-calendar-cache.js";
import {
  createPeopleOutlookCalendarSource,
  createUnavailablePeopleOutlookCalendarSource,
} from "../src/people-outlook-calendar-source.js";
import { createPeopleProviderIdentityRegistry } from "../src/people-provider-identity.js";
import {
  createInMemoryOpaqueTokenVault,
  createOutlookConsentService,
} from "../src/outlook-token-vault.js";

function connectedFixture() {
  let now = "2026-07-30T00:00:00.000Z";
  const identityRegistry = createPeopleProviderIdentityRegistry({ clock: () => now });
  const vault = createInMemoryOpaqueTokenVault();
  const consentService = createOutlookConsentService({ vault, clock: () => now });
  const calendarCache = createOutlookCalendarCache({
    ttl_ms: 60_000,
    retention_ms: 300_000,
    clock: () => now,
  });
  consentService.grant({
    tenant_id: "tenant-a",
    provider_identity_id: "provider-1",
    consent_ref: "consent-1",
    grant_type: "delegated",
    scopes: ["Calendars.ReadBasic"],
    access_token: "raw-access-token",
    refresh_token: "raw-refresh-token",
    expires_at: "2026-07-30T02:00:00.000Z",
  });
  identityRegistry.connect({
    tenant_id: "tenant-a",
    employee_id: "emp-1",
    provider_identity_id: "provider-1",
    provider_subject_id: "subject-1",
    consent_ref: "consent-1",
  });
  return {
    identityRegistry,
    consentService,
    calendarCache,
    setNow(value) {
      now = value;
    },
  };
}

function input(employeeIds = ["emp-1"]) {
  return {
    tenant_id: "tenant-a",
    employee_ids: employeeIds,
    as_of: "2026-07-30T00:00:00.000Z",
    timezone: "Asia/Seoul",
  };
}

test("sync reads refresh through the opaque credential chain and reuse the minimal cache", async () => {
  const fixture = connectedFixture();
  const calls = [];
  const source = createPeopleOutlookCalendarSource({
    ...fixture,
    calendarViewAdapter: {
      async read(request) {
        calls.push(request);
        return {
          events: [{
            provider_event_id: "event-1",
            title: "고객 회의",
            starts_at: "2026-07-30T01:00:00.000Z",
            ends_at: "2026-07-30T01:30:00.000Z",
            attendee_type: "required",
            response_status: "accepted",
          }],
        };
      },
    },
    resolveSubjectAddress: async ({ provider_subject_id }) => {
      assert.equal(provider_subject_id, "subject-1");
      return "lawyer@example.test";
    },
    clock: () => "2026-07-30T00:00:00.000Z",
  });

  const pending = source.read(input());
  assert.equal(pending.state, "blocked");
  assert.equal(pending.safe_error_code, "OUTLOOK_CALENDAR_REFRESH_PENDING");
  assert.equal(typeof pending.then, "undefined");
  await source.whenIdle();

  const fresh = source.read(input());
  assert.equal(fresh.state, "ok");
  assert.equal(fresh.events_by_employee_id["emp-1"][0].title, "고객 회의");
  assert.equal(calls.length, 1);
  assert.match(calls[0].credential_ref, /^vault:/);
  assert.equal(calls[0].subject_address, "lawyer@example.test");
  assert.equal(JSON.stringify({ calls, fresh, cache: fixture.calendarCache.snapshot() }).includes("raw-access-token"), false);
  assert.equal(source.read(input()).state, "ok");
  assert.equal(calls.length, 1);
});

test("stale data remains available when a background provider refresh fails", async () => {
  const fixture = connectedFixture();
  let shouldFail = false;
  const source = createPeopleOutlookCalendarSource({
    ...fixture,
    calendarViewAdapter: {
      async read() {
        if (shouldFail) {
          const error = new Error("throttled");
          error.safe_error_code = "OUTLOOK_CALENDAR_THROTTLED";
          throw error;
        }
        return {
          events: [{
            provider_event_id: "event-1",
            title: "기존 일정",
            starts_at: "2026-07-30T01:00:00.000Z",
            ends_at: "2026-07-30T01:30:00.000Z",
          }],
        };
      },
    },
    clock: () => fixture.calendarCache.snapshot()[0]?.fetched_at ?? "2026-07-30T00:00:00.000Z",
  });
  await source.refresh(input());
  fixture.setNow("2026-07-30T00:02:00.000Z");
  shouldFail = true;

  assert.equal(source.read(input()).state, "stale");
  await source.whenIdle();
  const stale = source.read(input());
  assert.equal(stale.state, "stale");
  assert.equal(stale.safe_error_code, "OUTLOOK_CALENDAR_THROTTLED");
  assert.equal(stale.events_by_employee_id["emp-1"][0].title, "기존 일정");
});

test("unconnected members are empty without provider calls and unavailable configuration is blocked", () => {
  const fixture = connectedFixture();
  let calls = 0;
  const source = createPeopleOutlookCalendarSource({
    ...fixture,
    calendarViewAdapter: {
      async read() {
        calls += 1;
        return { events: [] };
      },
    },
  });
  const unconnected = source.read(input(["emp-2"]));
  assert.equal(unconnected.state, "ok");
  assert.deepEqual(unconnected.events_by_employee_id["emp-2"], []);
  assert.equal(calls, 0);

  const adapterMissing = createPeopleOutlookCalendarSource({
    ...fixture,
  }).read(input());
  assert.equal(adapterMissing.state, "blocked");
  assert.equal(adapterMissing.safe_error_code, "OUTLOOK_CALENDAR_ADAPTER_REQUIRED");

  const unavailable = createUnavailablePeopleOutlookCalendarSource({
    safe_error_code: "OUTLOOK_TOKEN_VAULT_REQUIRED",
  }).read(input(["emp-1", "emp-2"]));
  assert.equal(unavailable.state, "blocked");
  assert.equal(unavailable.safe_error_code, "OUTLOOK_TOKEN_VAULT_REQUIRED");
  assert.deepEqual(Object.keys(unavailable.events_by_employee_id), ["emp-1", "emp-2"]);
});
