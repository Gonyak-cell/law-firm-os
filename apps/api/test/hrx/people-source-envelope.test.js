import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPeopleSourceEnvelopeFromSettled,
  readPeopleSourceEnvelope,
} from "../../src/routes/hrx/people-source-envelope.js";

const AS_OF = "2026-07-30T09:30:00.000Z";

test("API adapter retains fulfilled sources and omits rejected source values", () => {
  const envelope = buildPeopleSourceEnvelopeFromSettled({
    as_of: AS_OF,
    timezone: "Asia/Seoul",
    sources: [
      {
        source: "matter",
        result: { status: "fulfilled", value: { assigned_matter_count: 2 } },
        last_success_at: AS_OF,
        stale_after: "2026-07-30T10:00:00.000Z",
      },
      {
        source: "outlook",
        result: {
          status: "rejected",
          reason: Object.assign(new Error("Graph token abc-123 expired"), {
            access_token: "do-not-serialize",
            provider_payload: { secret: "do-not-serialize" },
          }),
        },
        stale_after: "2026-07-30T10:00:00.000Z",
      },
    ],
  });

  assert.equal(envelope.state, "partial");
  assert.deepEqual(envelope.data, { matter: { assigned_matter_count: 2 } });
  assert.equal(envelope.source_status[1].safe_error_code, "PEOPLE_SOURCE_UNAVAILABLE");
  const serialized = JSON.stringify(envelope);
  assert.equal(serialized.includes("token"), false);
  assert.equal(serialized.includes("secret"), false);
  assert.equal(serialized.includes('"outlook":0'), false);
});

test("API adapter accepts only a syntactically safe error code", () => {
  const envelope = buildPeopleSourceEnvelopeFromSettled({
    as_of: AS_OF,
    timezone: "Asia/Seoul",
    sources: [{
      source: "outlook",
      result: {
        status: "rejected",
        reason: Object.assign(new Error("provider failed"), {
          safe_error_code: "OUTLOOK_CONSENT_REQUIRED",
        }),
      },
      stale_after: "2026-07-30T10:00:00.000Z",
    }],
  });

  assert.equal(envelope.state, "blocked");
  assert.equal(envelope.source_status[0].safe_error_code, "OUTLOOK_CONSENT_REQUIRED");
});

test("stale fallback is explicit and a live multi-source read returns partial", async () => {
  const envelope = await readPeopleSourceEnvelope({
    as_of: AS_OF,
    timezone: "Asia/Seoul",
    sources: [
      {
        source: "hrx",
        read: async () => ({ active_member_count: 10 }),
        stale_after: "2026-07-30T10:00:00.000Z",
      },
      {
        source: "outlook",
        read: async () => {
          throw Object.assign(new Error("not connected"), {
            safe_error_code: "OUTLOOK_CONSENT_REQUIRED",
          });
        },
        last_success_at: "2026-07-29T09:30:00.000Z",
        stale_after: "2026-07-29T10:00:00.000Z",
        fallback: { required_meeting_count: 1 },
      },
    ],
  });

  assert.equal(envelope.state, "partial");
  assert.deepEqual(envelope.data.hrx, { active_member_count: 10 });
  assert.deepEqual(envelope.data.outlook, { required_meeting_count: 1 });
  assert.equal(envelope.source_status[1].state, "stale");
});
