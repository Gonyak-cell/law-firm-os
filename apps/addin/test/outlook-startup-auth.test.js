import assert from "node:assert/strict";
import test from "node:test";

import {
  signedSession,
  startupFixture,
  subject,
} from "./helpers/outlook-startup-runtime-fixture.js";

function withSessionPolicy(fixture, { silent, interactive = signedSession() } = {}) {
  const calls = [];
  fixture.input.acquireSession = async (options = {}) => {
    const normalized = {
      interactive: options.interactive === true,
      force: options.force === true,
    };
    calls.push(normalized);
    fixture.events.push(normalized.interactive ? "session:interactive" : "session:silent");
    const value = normalized.interactive ? interactive : silent;
    if (value instanceof Error) throw value;
    return value;
  };
  return calls;
}

test("interaction-required startup opens one interactive NAA popup for the shared module flight", async () => {
  const fixture = startupFixture();
  const calls = withSessionPolicy(fixture, {
    silent: { authenticated: false, safe_error_code: "LAWOS_INTERACTION_REQUIRED" },
  });
  const runtime = await subject();
  const first = runtime.startOutlookStartup(fixture.input);
  const second = runtime.startOutlookStartup(fixture.input);

  assert.equal(first, second);
  const result = await first;
  assert.equal(result.state, "ready");
  assert.deepEqual(calls, [
    { interactive: false, force: false },
    { interactive: true, force: true },
  ]);
  assert.deepEqual(fixture.events, [
    "session:silent",
    "session:interactive",
    "/api/outlook/connection",
    "/api/outlook/readiness",
    "/api/outlook/bootstrap",
  ]);
});

test("an existing signed session stays silent and never opens the interactive path", async () => {
  const fixture = startupFixture();
  const calls = withSessionPolicy(fixture, { silent: signedSession() });
  const runtime = await subject();
  assert.equal((await runtime.startOutlookStartup(fixture.input)).state, "ready");
  assert.deepEqual(calls, [{ interactive: false, force: false }]);
});

test("terminal startup 401 consumes the one popup and revalidates authority once", async () => {
  const fixture = startupFixture();
  const sessionCalls = withSessionPolicy(fixture, { silent: signedSession() });
  const requestJson = fixture.input.requestJson;
  let connectionAttempts = 0;
  fixture.input.requestJson = async (path, options) => {
    if (path === "/api/outlook/connection" && connectionAttempts++ === 0) {
      fixture.events.push(path);
      fixture.requests.push({ path, options });
      throw Object.assign(new Error("AUTH_SESSION_INVALID"), {
        status: 401,
        safe_error_code: "AUTH_SESSION_INVALID",
      });
    }
    return requestJson(path, options);
  };
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);

  assert.equal(result.state, "ready");
  assert.deepEqual(sessionCalls, [
    { interactive: false, force: false },
    { interactive: true, force: true },
  ]);
  assert.equal(fixture.requests.filter(({ path }) => path === "/api/outlook/connection").length, 2);
  assert.equal(fixture.requests.filter(({ path }) => path === "/api/outlook/readiness").length, 1);
  assert.equal(fixture.requests.filter(({ path }) => path === "/api/outlook/bootstrap").length, 1);
});

test("a 403 account block never opens a popup and becomes a revoked account outcome", async () => {
  const fixture = startupFixture();
  const calls = withSessionPolicy(fixture, {
    silent: Object.assign(new Error("do not echo provider detail"), {
      status: 403,
      safe_error_code: "AUTH_ACCOUNT_DISABLED",
    }),
  });
  const runtime = await subject();
  const result = await runtime.startOutlookStartup(fixture.input);

  assert.deepEqual([result.state, result.reason], ["revoked", "account_mismatch"]);
  assert.deepEqual(calls, [{ interactive: false, force: false }]);
  assert.equal(JSON.stringify(result).includes("provider detail"), false);
});

for (const status of [0, 408, 429, 503]) {
  test(`transient auth status ${status} defers with zero popup`, async () => {
    const fixture = startupFixture();
    const calls = withSessionPolicy(fixture, {
      silent: Object.assign(new Error("transient provider detail"), { status }),
    });
    const runtime = await subject();
    const result = await runtime.startOutlookStartup(fixture.input);
    assert.deepEqual([result.state, result.reason], ["deferred", "transient_failure"]);
    assert.deepEqual(calls, [{ interactive: false, force: false }]);
    assert.equal(JSON.stringify(result).includes("provider detail"), false);
  });
}

test("a failed interactive attempt is latched and cannot open a second popup", async () => {
  const fixture = startupFixture();
  const calls = withSessionPolicy(fixture, {
    silent: { authenticated: false, safe_error_code: "LAWOS_INTERACTION_REQUIRED" },
    interactive: Object.assign(new Error("offline during popup"), { status: 408 }),
  });
  const runtime = await subject();
  const first = runtime.startOutlookStartup(fixture.input);
  const result = await first;
  assert.deepEqual([result.state, result.reason], ["deferred", "transient_failure"]);
  assert.equal(runtime.startOutlookStartup(fixture.input), first);
  assert.deepEqual(calls, [
    { interactive: false, force: false },
    { interactive: true, force: true },
  ]);
});
