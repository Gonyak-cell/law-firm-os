import assert from "node:assert/strict";
import test from "node:test";

import {
  GROUP_ID,
  PRINCIPAL_ID,
  assertSafeEnvelope,
  createController,
  envelope,
  group,
  json,
  memberRequest,
  membersResponse,
  targetRequest,
  tokenResponse,
  user,
} from "./test-fixtures.mjs";

function immediateTimers() {
  const handles = [];
  return {
    handles,
    set_timeout(callback, milliseconds) {
      const handle = { callback, milliseconds, cleared: false, fired: false };
      handle.immediate = setImmediate(() => {
        if (handle.cleared) return;
        handle.fired = true;
        callback();
      });
      handles.push(handle);
      return handle;
    },
    clear_timeout(handle) {
      handle.cleared = true;
      clearImmediate(handle.immediate);
    },
  };
}

function neverSettles() {
  return new Promise(() => {});
}

test("token and Graph requests never leave the controller without a fresh AbortSignal", async () => {
  const calls = [];
  const { controller } = createController({
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1 ? tokenResponse() : json(group());
    },
  });

  const result = await controller(envelope("group.target.inspect", targetRequest()));

  assert.equal(result.ok, true);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(({ options }) => options.signal instanceof AbortSignal));
  assert.notEqual(calls[0].options.signal, calls[1].options.signal);
});

test("successful requests clear every fixed upper-bound timeout", async () => {
  const timers = immediateTimers();
  const calls = [];
  const { controller } = createController({
    set_timeout: timers.set_timeout,
    clear_timeout: timers.clear_timeout,
    fetch_impl: async (url, options) => {
      calls.push({ url, options });
      return calls.length === 1 ? tokenResponse() : json(group());
    },
  });

  const result = await controller(envelope("group.target.inspect", targetRequest()));

  assert.equal(result.ok, true);
  assert.equal(timers.handles.length, calls.length);
  assert.ok(timers.handles.every(({ milliseconds }) => milliseconds === 15000));
  assert.ok(timers.handles.every(({ cleared, fired }) => cleared && !fired));
  assert.ok(calls.every(({ options }) => !options.signal.aborted));
});

test("a never-settling token request aborts and terminates fail-closed", async () => {
  const timers = immediateTimers();
  const calls = [];
  const { controller } = createController({
    request_timeout_ms: 7,
    set_timeout: timers.set_timeout,
    clear_timeout: timers.clear_timeout,
    fetch_impl: (url, options) => {
      calls.push({ url, options });
      return neverSettles();
    },
  });

  const result = await controller(envelope("group.target.inspect", targetRequest()));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "UPSTREAM_UNAVAILABLE");
  assert.equal(calls.length, 1);
  assert.ok(calls[0].options.signal.aborted);
  assert.ok(timers.handles.every(({ cleared, fired }) => cleared && fired));
  assertSafeEnvelope(assert, result, result.error);
});

test("the same timeout remains armed while a token response body is consumed", async () => {
  const timers = immediateTimers();
  let signal;
  const { controller } = createController({
    request_timeout_ms: 7,
    set_timeout: timers.set_timeout,
    clear_timeout: timers.clear_timeout,
    fetch_impl: (_url, options) => {
      signal = options.signal;
      return new Response(new ReadableStream({
        pull: neverSettles,
      }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  });

  const result = await controller(envelope("group.target.inspect", targetRequest()));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "UPSTREAM_UNAVAILABLE");
  assert.ok(signal.aborted);
  assert.ok(timers.handles.every(({ cleared, fired }) => cleared && fired));
});

test("never-settling safe reads use three separately bounded attempts", async () => {
  const timers = immediateTimers();
  const calls = [];
  const { controller } = createController({
    request_timeout_ms: 7,
    set_timeout: timers.set_timeout,
    clear_timeout: timers.clear_timeout,
    fetch_impl: (url, options) => {
      calls.push({ url, options });
      return calls.length === 1 ? tokenResponse() : neverSettles();
    },
  });

  const result = await controller(envelope("group.target.inspect", targetRequest()));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "UPSTREAM_UNAVAILABLE");
  assert.equal(calls.length, 4);
  assert.ok(calls.every(({ options }) => options.signal instanceof AbortSignal));
  assert.ok(calls.slice(1).every(({ options }) => options.signal.aborted));
  assert.equal(new Set(calls.map(({ options }) => options.signal)).size, calls.length);
  assert.ok(timers.handles.every(({ cleared }) => cleared));
});

test("a timed-out unsafe write is not retried and bounded readback stays unknown", async () => {
  const timers = immediateTimers();
  const calls = [];
  let writeSeen = false;
  const { controller } = createController({
    request_timeout_ms: 7,
    set_timeout: timers.set_timeout,
    clear_timeout: timers.clear_timeout,
    fetch_impl: (url, options) => {
      const parsed = new URL(url);
      calls.push({ url, options });
      if (parsed.hostname === "login.microsoftonline.com") return tokenResponse();
      if (options.method === "POST") {
        writeSeen = true;
        return neverSettles();
      }
      if (parsed.pathname === `/v1.0/groups/${GROUP_ID}`) {
        return writeSeen ? neverSettles() : json(group());
      }
      if (parsed.pathname === `/v1.0/users/${PRINCIPAL_ID}`) return json(user());
      if (parsed.pathname === `/v1.0/groups/${GROUP_ID}/members`) {
        return membersResponse([]);
      }
      throw new Error("unexpected fixture route");
    },
  });

  const result = await controller(envelope("group.member.add", memberRequest()));

  assert.equal(result.ok, false);
  assert.equal(result.error.code, "REMOTE_COMMIT_UNKNOWN");
  assert.equal(result.error.remote_commit_state, "unknown");
  assert.equal(calls.filter(({ url, options }) => (
    options.method === "POST" && new URL(url).hostname === "graph.microsoft.com"
  )).length, 1);
  const groupReads = calls.filter(({ url, options }) => (
    options.method === "GET" && new URL(url).pathname === `/v1.0/groups/${GROUP_ID}`
  ));
  assert.equal(groupReads.length, 4);
  assert.ok(groupReads.slice(1).every(({ options }) => options.signal.aborted));
  assert.ok(calls.every(({ options }) => options.signal instanceof AbortSignal));
  assert.ok(timers.handles.every(({ cleared }) => cleared));
  assertSafeEnvelope(assert, result, result.error);
});

test("timeout configuration is exact and cannot exceed the fixed 15 second ceiling", () => {
  const timer = () => {};
  for (const override of [
    { request_timeout_ms: 0 },
    { request_timeout_ms: 15001 },
    { request_timeout_ms: 1.5 },
    { set_timeout: timer },
    { clear_timeout: timer },
    { set_timeout: 1, clear_timeout: timer },
  ]) {
    assert.throws(
      () => createController({ fetch_impl: async () => tokenResponse(), ...override }),
      /configuration is invalid/u,
    );
  }
});
