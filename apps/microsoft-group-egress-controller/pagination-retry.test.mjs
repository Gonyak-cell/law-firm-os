import assert from "node:assert/strict";
import test from "node:test";

import {
  GRAPH_ORIGIN,
  GROUP_ID,
  OUTSIDE_PRINCIPAL_ID,
  PRINCIPAL_ID,
  SECOND_PRINCIPAL_ID,
  createController,
  envelope,
  group,
  json,
  member,
  membersResponse,
  targetRequest,
  tokenResponse,
} from "./test-fixtures.mjs";

const MEMBERS_PATH = `/v1.0/groups/${GROUP_ID}/members`;

test("member pagination is exact-host, direct-only, bounded, and loop-free", async () => {
  const calls = [];
  const { controller } = createController({
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      if (calls.length === 1) return tokenResponse();
      if (calls.length === 2) return json(group());
      if (calls.length === 3) {
        return membersResponse([PRINCIPAL_ID], {
          "@odata.nextLink": `${GRAPH_ORIGIN}${MEMBERS_PATH}?$skiptoken=opaque-page-2`,
        });
      }
      return membersResponse([SECOND_PRINCIPAL_ID]);
    },
  });

  const result = await controller(envelope("group.members.read", targetRequest()));

  assert.equal(result.ok, true);
  assert.equal(result.result.member_count, 2);
  const initial = new URL(calls[2].url);
  assert.equal(initial.pathname, MEMBERS_PATH);
  assert.equal(initial.searchParams.get("$select"), "id,userType,accountEnabled");
  assert.equal(initial.searchParams.get("$top"), "100");
  assert.equal(new URL(calls[3].url).searchParams.get("$skiptoken"), "opaque-page-2");
  assert.ok(calls.slice(2).every(({ options }) => options.method === "GET"));
});

test("cross-origin, wrong-path, injected-query, cyclic, duplicate, and excess pagination fail closed", async () => {
  const scenarios = [
    `${GRAPH_ORIGIN.replace("graph", "evil")}${MEMBERS_PATH}?$skiptoken=x`,
    `${GRAPH_ORIGIN}/v1.0/users?$skiptoken=x`,
    `${GRAPH_ORIGIN}${MEMBERS_PATH}?$skiptoken=x&$filter=accountEnabled%20eq%20true`,
    "cycle",
    "duplicate",
    "too-many",
    "too-many-pages",
    "nested-member",
    "unknown-member",
    "oversized-next-link",
  ];
  for (const scenario of scenarios) {
    let calls = 0;
    const { controller } = createController({
      fetch_impl: async (url) => {
        calls += 1;
        if (calls === 1) return tokenResponse();
        if (calls === 2) return json(group());
        if (scenario === "duplicate") {
          return json({ value: [member(PRINCIPAL_ID), member(PRINCIPAL_ID)] });
        }
        if (scenario === "too-many") {
          return json({ value: Array.from({ length: 101 }, () => member(PRINCIPAL_ID)) });
        }
        if (scenario === "nested-member") {
          return json({ value: [{ "@odata.type": "#microsoft.graph.group", id: GROUP_ID }] });
        }
        if (scenario === "unknown-member") {
          return membersResponse([OUTSIDE_PRINCIPAL_ID]);
        }
        if (scenario === "oversized-next-link") {
          return membersResponse([], {
            "@odata.nextLink": `${GRAPH_ORIGIN}${MEMBERS_PATH}?$skiptoken=${"x".repeat(17 * 1024)}`,
          });
        }
        if (scenario === "too-many-pages") {
          return membersResponse([], {
            "@odata.nextLink": `${GRAPH_ORIGIN}${MEMBERS_PATH}?$skiptoken=page-${calls}`,
          });
        }
        const next = scenario === "cycle" ? url : scenario;
        return membersResponse([], { "@odata.nextLink": next });
      },
    });
    const result = await controller(envelope("group.members.read", targetRequest()));
    assert.equal(result.ok, false, scenario);
    assert.ok([
      "TARGET_POLICY_VIOLATION",
      "PRINCIPAL_POLICY_VIOLATION",
      "UPSTREAM_RESPONSE_INVALID",
      "PAGE_BUDGET_EXHAUSTED",
    ].includes(result.error.code), `${scenario}:${result.error.code}`);
    assert.ok(calls <= 7, scenario);
  }
});

test("safe reads retry only known transient failures with injected clock and sleep", async () => {
  const sleeps = [];
  let calls = 0;
  const { controller } = createController({
    clock: () => Date.parse("2026-08-16T00:00:00.000Z"),
    sleep: async (milliseconds) => { sleeps.push(milliseconds); },
    fetch_impl: async () => {
      calls += 1;
      if (calls === 1) return tokenResponse();
      if (calls === 2) return json({}, 429, { "retry-after": "1" });
      if (calls === 3) return json({}, 503);
      return json(group());
    },
  });

  const result = await controller(envelope("group.target.inspect", targetRequest()));

  assert.equal(result.ok, true);
  assert.deepEqual(sleeps, [1000, 100]);
  assert.equal(calls, 4);
});

test("401/403 and exhausted 429/5xx reads fail closed without retrying unsafe requests", async () => {
  for (const status of [401, 403, 429, 500, 502, 503, 504]) {
    let calls = 0;
    const sleeps = [];
    const { controller } = createController({
      sleep: async (milliseconds) => { sleeps.push(milliseconds); },
      fetch_impl: async () => {
        calls += 1;
        if (calls === 1) return tokenResponse();
        return json({ provider: "details must not escape" }, status);
      },
    });
    const result = await controller(envelope("group.target.inspect", targetRequest()));
    assert.equal(result.ok, false, String(status));
    assert.equal(result.status, status === 401 || status === 403 ? status : status === 429 ? 429 : 503);
    assert.equal(calls, status === 401 || status === 403 ? 2 : 4);
    assert.equal(sleeps.length, status === 401 || status === 403 ? 0 : 2);
    assert.equal(JSON.stringify(result).includes("provider"), false);
  }
});
