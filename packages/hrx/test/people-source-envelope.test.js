import assert from "node:assert/strict";
import test from "node:test";
import {
  PEOPLE_SOURCE_ENVELOPE_SCHEMA_VERSION,
  createPeopleSourceEnvelope,
} from "../src/people-source-envelope.js";

const AS_OF = "2026-07-30T09:30:00.000Z";

function status(source, state = "ok", overrides = {}) {
  return {
    source,
    state,
    last_success_at: state === "ok" ? AS_OF : null,
    stale_after: "2026-07-30T10:00:00.000Z",
    safe_error_code: state === "ok" ? null : "PEOPLE_SOURCE_UNAVAILABLE",
    ...overrides,
  };
}

test("people source envelope has one versioned 기준시각 contract for healthy sources", () => {
  const envelope = createPeopleSourceEnvelope({
    as_of: AS_OF,
    timezone: "Asia/Seoul",
    source_status: [status("matter"), status("hrx")],
    data: {
      matter: { assigned_matter_count: 2 },
      hrx: { active_member_count: 10 },
    },
  });

  assert.equal(envelope.schema_version, PEOPLE_SOURCE_ENVELOPE_SCHEMA_VERSION);
  assert.equal(envelope.state, "ok");
  assert.equal(envelope.as_of, AS_OF);
  assert.equal(envelope.timezone, "Asia/Seoul");
  assert.deepEqual(envelope.source_status.map(({ source, state }) => ({ source, state })), [
    { source: "matter", state: "ok" },
    { source: "hrx", state: "ok" },
  ]);
});

test("partial keeps healthy source data and never substitutes a failed source with zero", () => {
  const envelope = createPeopleSourceEnvelope({
    as_of: AS_OF,
    timezone: "Asia/Seoul",
    source_status: [
      status("matter"),
      status("outlook", "blocked"),
    ],
    data: {
      matter: { assigned_matter_count: 2 },
    },
  });

  assert.equal(envelope.state, "partial");
  assert.deepEqual(envelope.data.matter, { assigned_matter_count: 2 });
  assert.equal(Object.hasOwn(envelope.data, "outlook"), false);
});

test("all blocked and all stale sources remain distinguishable", () => {
  const blocked = createPeopleSourceEnvelope({
    as_of: AS_OF,
    timezone: "Asia/Seoul",
    source_status: [status("outlook", "blocked")],
    data: {},
  });
  const stale = createPeopleSourceEnvelope({
    as_of: AS_OF,
    timezone: "Asia/Seoul",
    source_status: [
      status("matter", "stale", {
        last_success_at: "2026-07-29T09:30:00.000Z",
      }),
    ],
    data: { matter: { assigned_matter_count: 1 } },
  });

  assert.equal(blocked.state, "blocked");
  assert.equal(stale.state, "stale");
  assert.deepEqual(stale.data.matter, { assigned_matter_count: 1 });
});

test("source status only serializes safe fields and rejects invalid temporal metadata", () => {
  const envelope = createPeopleSourceEnvelope({
    as_of: AS_OF,
    timezone: "Asia/Seoul",
    source_status: [{
      ...status("outlook", "blocked"),
      provider_payload: { access_token: "do-not-serialize" },
      internal_error: "Graph bearer token expired",
    }],
    data: {},
  });
  const serialized = JSON.stringify(envelope);

  assert.equal(serialized.includes("access_token"), false);
  assert.equal(serialized.includes("bearer"), false);
  assert.deepEqual(Object.keys(envelope.source_status[0]), [
    "source",
    "state",
    "last_success_at",
    "stale_after",
    "safe_error_code",
  ]);
  assert.throws(() => createPeopleSourceEnvelope({
    as_of: "not-a-timestamp",
    timezone: "Asia/Seoul",
    source_status: [status("matter")],
    data: {},
  }), /as_of/);
  assert.throws(() => createPeopleSourceEnvelope({
    as_of: AS_OF,
    timezone: "Moon\\/Sea",
    source_status: [status("matter")],
    data: {},
  }), /timezone/);
});
