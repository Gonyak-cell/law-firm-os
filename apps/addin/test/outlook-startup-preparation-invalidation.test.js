import assert from "node:assert/strict";
import test from "node:test";

import {
  binding,
  digest,
  eventually,
  machine,
  OWNER_B,
  readyRaw,
  storage,
} from "./outlook-startup-preparation-test-support.js";

const revoked = {
  state: "revoked",
  reason: "installation_revoked",
  supported: true,
  cache_hit: false,
};

test("invalidate removes matching READY while an active prepare is still hashing", async () => {
  let releaseHash;
  const hashGate = new Promise((resolve) => { releaseHash = resolve; });
  let holdHash = true;
  let hashCalls = 0;
  let prepareCalls = 0;
  const store = storage(await readyRaw());
  const runtime = await machine({
    store,
    hash: async (value) => {
      hashCalls += 1;
      if (holdHash) await hashGate;
      return digest(value);
    },
    prepare: async () => { prepareCalls += 1; return { state: "ready" }; },
  });
  const old = runtime.prepare(binding());
  await eventually(() => hashCalls === 5);
  const invalidated = await runtime.invalidate({ reason: "installation_revoked", nextState: "revoked" });
  const rawAfterInvalidate = store.raw();
  const stateAfterInvalidate = runtime.getState();
  const immediate = await runtime.prepare(binding());
  const callsAfterImmediate = prepareCalls;
  holdHash = false;
  releaseHash();
  const oldResult = await old;
  const retried = await runtime.prepare(binding());
  assert.deepEqual(invalidated, revoked);
  assert.equal(rawAfterInvalidate, null);
  assert.deepEqual(stateAfterInvalidate, revoked);
  assert.deepEqual([immediate.state, immediate.cache_hit, callsAfterImmediate], ["deferred", false, 0]);
  assert.deepEqual(oldResult, revoked);
  assert.deepEqual([retried.state, retried.cache_hit, prepareCalls], ["ready", false, 1]);
});

test("invalidate removes matching READY after the first cache read was already admitted", async () => {
  let releaseRead;
  const readGate = new Promise((resolve) => { releaseRead = resolve; });
  let prepareCalls = 0;
  const store = storage(await readyRaw(), {
    async beforeGet({ calls }) { if (calls.get === 1) await readGate; },
  });
  const runtime = await machine({
    store,
    prepare: async () => { prepareCalls += 1; return { state: "ready" }; },
  });
  const old = runtime.prepare(binding());
  await eventually(() => store.calls.get === 1);
  const invalidation = runtime.invalidate({ reason: "installation_revoked", nextState: "revoked" });
  releaseRead();
  const invalidated = await invalidation;
  const rawAfterInvalidate = store.raw();
  const stateAfterInvalidate = runtime.getState();
  const immediate = await runtime.prepare(binding());
  const oldResult = await old;
  const retried = immediate.state === "deferred" ? await runtime.prepare(binding()) : immediate;
  assert.deepEqual(invalidated, revoked);
  assert.equal(rawAfterInvalidate, null);
  assert.deepEqual(stateAfterInvalidate, revoked);
  assert.equal(immediate.cache_hit, false);
  assert.deepEqual(oldResult, revoked);
  assert.deepEqual([retried.state, retried.cache_hit, prepareCalls], ["ready", false, 1]);
});

test("unsupported A and supported B-to-C invalidations all await the latest held cleanup", async () => {
  let enabled = false;
  let raw = await readyRaw();
  let getCalls = 0;
  let releaseLatestRead;
  const latestReadGate = new Promise((resolve) => { releaseLatestRead = resolve; });
  const api = {
    get getItem() {
      if (!enabled) return undefined;
      return async () => {
        getCalls += 1;
        await latestReadGate;
        return raw;
      };
    },
    get setItem() {
      return enabled ? async (_key, value) => { raw = value; } : undefined;
    },
    get removeItem() {
      return enabled ? async () => { raw = null; } : undefined;
    },
  };
  const firstRuntime = await machine({ store: api });
  const secondRuntime = await machine({ store: api });
  const settled = [false, false, false];
  const observe = (promise, index) => promise.then((result) => {
    settled[index] = true;
    return result;
  });
  const first = observe(firstRuntime.invalidate({ reason: "account_changed", nextState: "idle" }), 0);
  enabled = true;
  const second = observe(secondRuntime.invalidate({ reason: "connection_changed", nextState: "deferred" }), 1);
  const third = observe(firstRuntime.invalidate({ reason: "installation_revoked", nextState: "revoked" }), 2);
  await eventually(() => getCalls === 1);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(settled, [false, false, false]);
  releaseLatestRead();
  const results = await Promise.all([first, second, third]);
  assert.deepEqual(results, [revoked, revoked, revoked]);
  assert.deepEqual(firstRuntime.getState(), revoked);
  assert.deepEqual(secondRuntime.getState(), revoked);
  assert.equal(raw, null);
});

test("invalidation during corrupt-record cleanup fences every later mutation", async () => {
  let releaseRemove;
  const removeGate = new Promise((resolve) => { releaseRemove = resolve; });
  const store = storage("{", { async beforeRemove() { await removeGate; } });
  let calls = 0;
  const runtime = await machine({
    store,
    prepare: async () => { calls += 1; return { state: "ready" }; },
  });
  const old = runtime.prepare(binding());
  await eventually(() => store.calls.remove === 1);
  const invalidation = runtime.invalidate({ reason: "installation_revoked", nextState: "revoked" });
  releaseRemove();
  const [oldOutcome, invalidated] = await Promise.all([old, invalidation]);
  assert.deepEqual([oldOutcome.state, invalidated.state, runtime.getState().state, calls, store.raw()], [
    "revoked", "revoked", "revoked", 0, null,
  ]);
});

test("invalidate waits out an old READY write and the old generation cannot win", async () => {
  let releaseReadyWrite;
  let readyWriteStarted = false;
  const readyWriteGate = new Promise((resolve) => { releaseReadyWrite = resolve; });
  const store = storage(null, {
    async beforeSet({ value }) {
      if (JSON.parse(value).state === "ready") {
        readyWriteStarted = true;
        await readyWriteGate;
      }
    },
  });
  const runtime = await machine({ store });
  const old = runtime.prepare(binding());
  await eventually(() => readyWriteStarted);
  let invalidationSettled = false;
  const invalidation = runtime.invalidate({ reason: "installation_revoked", nextState: "revoked" })
    .then((result) => { invalidationSettled = true; return result; });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(invalidationSettled, false);
  releaseReadyWrite();
  const [oldOutcome, invalidated] = await Promise.all([old, invalidation]);
  assert.deepEqual([oldOutcome.state, invalidated.state, runtime.getState().state], ["revoked", "revoked", "revoked"]);
  assert.equal(store.raw(), null);
});

test("overlapping invalidates settle only after the latest cleanup and publication", async () => {
  const gates = Array.from({ length: 3 }, () => {
    let release;
    return { promise: new Promise((resolve) => { release = resolve; }), release };
  });
  const store = storage(await readyRaw(), {
    async beforeGet({ calls }) { if (calls.get <= 3) await gates[calls.get - 1].promise; },
  });
  const firstRuntime = await machine({ store });
  const secondRuntime = await machine({ store, owner: OWNER_B });
  const settled = [false, false, false];
  const snapshots = [];
  const observe = (promise, index) => promise.then((result) => {
    settled[index] = true;
    snapshots.push([result.state, result.reason, firstRuntime.getState().state, store.raw()]);
    return result;
  });
  const first = observe(firstRuntime.invalidate({ reason: "account_changed", nextState: "idle" }), 0);
  await eventually(() => store.calls.get === 1);
  const second = observe(secondRuntime.invalidate({ reason: "connection_changed", nextState: "deferred" }), 1);
  const third = observe(firstRuntime.invalidate({ reason: "installation_revoked", nextState: "revoked" }), 2);
  gates[0].release();
  await eventually(() => store.calls.get === 2);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(settled, [false, false, false]);
  gates[1].release();
  await eventually(() => store.calls.get === 3);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(settled, [false, false, false]);
  gates[2].release();
  const results = await Promise.all([first, second, third]);
  for (const result of results) assert.deepEqual([result.state, result.reason], ["revoked", "installation_revoked"]);
  for (const snapshot of snapshots) assert.deepEqual(snapshot, ["revoked", "installation_revoked", "revoked", null]);
  assert.deepEqual([firstRuntime.getState().state, secondRuntime.getState().state, store.raw()], ["revoked", "revoked", null]);
});

test("a superseded invalidate awaits the latest cleanup failure and returns its safe result", async () => {
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  const store = storage(await readyRaw(), {
    async beforeGet({ calls }) { if (calls.get === 1) await gate; },
    beforeRemove() { throw new Error("synthetic-cleanup-secret"); },
  });
  const firstRuntime = await machine({ store });
  const secondRuntime = await machine({ store, owner: OWNER_B });
  const first = firstRuntime.invalidate({ reason: "account_changed", nextState: "idle" });
  await eventually(() => store.calls.get === 1);
  const second = secondRuntime.invalidate({ reason: "installation_revoked", nextState: "revoked" });
  release();
  const results = await Promise.all([first, second]);
  for (const result of results) {
    assert.deepEqual(result, { state: "deferred", reason: "storage_cleanup_failed", supported: false, cache_hit: false });
  }
  assert.deepEqual(firstRuntime.getState(), results[0]);
  assert.doesNotMatch(JSON.stringify(results), /synthetic-cleanup-secret/u);
  assert.notEqual(store.raw(), null);
});

test("invalidate carries reason/state, fences late work, and makes retry wait for cleanup", async () => {
  const store = storage();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  const runtime = await machine({
    store,
    prepare: async () => { calls += 1; if (calls === 1) await gate; return { state: "ready" }; },
  });
  const old = runtime.prepare(binding());
  await eventually(() => calls === 1);
  assert.deepEqual(await runtime.invalidate({ reason: "account_changed", nextState: "idle" }), {
    state: "idle", reason: "account_changed", supported: true, cache_hit: false,
  });
  const immediate = await runtime.prepare(binding({ user_id: "user-b" }));
  assert.deepEqual([immediate.state, immediate.reason, calls], ["deferred", "coordination_deferred", 1]);
  release();
  assert.equal((await old).state, "idle");
  assert.equal(store.raw(), null);
  assert.equal((await runtime.prepare(binding({ user_id: "user-b" }))).state, "ready");
  assert.equal(calls, 2);
  assert.deepEqual(await runtime.invalidate({ reason: "installation_revoked", nextState: "revoked" }), revoked);
  await assert.rejects(runtime.invalidate({ reason: "bad", nextState: "ready" }), TypeError);
});
