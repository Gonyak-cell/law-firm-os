import assert from "node:assert/strict";
import test from "node:test";

import {
  KEY,
  MARKER_MS,
  OWNER_A,
  OWNER_B,
  READY_MS,
  SKEW_MS,
  binding,
  clock,
  eventually,
  machine,
  markerRaw,
  readyRaw,
  storage,
  subject,
} from "./outlook-startup-preparation-test-support.js";

test("exports the fixed cache and state contract", async () => {
  const api = await subject();
  assert.deepEqual([
    api.OUTLOOK_STARTUP_PREPARATION_KEY,
    api.OUTLOOK_STARTUP_PREPARATION_READY_TTL_MS,
    api.OUTLOOK_STARTUP_PREPARATION_MARKER_MS,
    api.OUTLOOK_STARTUP_PREPARATION_CLOCK_SKEW_MS,
  ], [KEY, READY_MS, MARKER_MS, SKEW_MS]);
  assert.deepEqual(Object.values(api.OUTLOOK_STARTUP_PREPARATION_STATES), [
    "idle", "preparing", "login_required", "connection_required", "ready", "deferred", "revoked",
  ]);
});

test("same binding shares one module-local outcome and a different binding is fenced", async () => {
  const store = storage();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  const runtime = await machine({ store, prepare: async () => { calls += 1; await gate; return { state: "ready" }; } });
  const first = runtime.prepare(binding());
  const second = runtime.prepare(binding());
  await eventually(() => calls === 1);
  assert.equal(runtime.getState().state, "preparing");
  const different = await runtime.prepare(binding({ user_id: "user-b" }));
  assert.deepEqual([different.state, different.reason, calls], ["deferred", "coordination_deferred", 1]);
  release();
  const outcomes = await Promise.all([first, second]);
  assert.deepEqual(outcomes[0], outcomes[1]);
  assert.deepEqual([outcomes[0].state, outcomes[0].cache_hit, calls], ["ready", false, 1]);
});

test("factories in one module share a storage-scoped flight and fence other bindings", async () => {
  let value = null;
  let initialReads = 0;
  let releaseInitialReads;
  const bothInitialReads = new Promise((resolve) => { releaseInitialReads = resolve; });
  const written = [];
  const sharedStorage = {
    async getItem() {
      if (value === null && initialReads < 2) {
        initialReads += 1;
        if (initialReads === 2) releaseInitialReads();
        else await Promise.race([
          bothInitialReads,
          new Promise((resolve) => setImmediate(resolve)),
        ]);
        return null;
      }
      return written.length > 0 ? written.shift() : value;
    },
    async setItem(_key, next) {
      value = next;
      written.push(next);
    },
    async removeItem() { value = null; },
  };
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  const firstRuntime = await machine({ store: sharedStorage, owner: OWNER_A, prepare: async () => { calls += 1; await gate; return { state: "ready" }; } });
  const secondRuntime = await machine({ store: sharedStorage, owner: OWNER_B, prepare: async () => { calls += 1; await gate; return { state: "ready" }; } });
  const first = firstRuntime.prepare(binding());
  const second = secondRuntime.prepare(binding());
  await eventually(() => calls > 0);
  const other = await secondRuntime.prepare(binding({ user_id: "user-b" }));
  release();
  const outcomes = await Promise.all([first, second]);
  assert.deepEqual([calls, other.state, other.reason], [1, "deferred", "coordination_deferred"]);
  assert.deepEqual(outcomes[0], outcomes[1]);
});

test("a visible foreign marker defers, a stale marker recovers, and long same-module work never duplicates", async () => {
  const raw = await markerRaw();
  const marker = JSON.parse(raw);
  for (const [offset, callsExpected] of [[60_000, 0], [61_000, 1]]) {
    let calls = 0;
    const runtime = await machine({ store: storage(raw), time: clock(marker.marker_expires_at + offset), owner: OWNER_B, prepare: async () => { calls += 1; return { state: "ready" }; } });
    const result = await runtime.prepare(binding());
    assert.equal(calls, callsExpected);
    assert.equal(result.state, callsExpected ? "ready" : "deferred");
    if (!callsExpected) assert.equal(result.reason, "coordination_deferred");
  }

  const time = clock();
  const store = storage();
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let calls = 0;
  const runtime = await machine({ store, time, prepare: async () => { calls += 1; await gate; return { state: "ready" }; } });
  const pending = runtime.prepare(binding());
  await eventually(() => calls === 1);
  time.value += MARKER_MS + SKEW_MS + 1;
  const other = await runtime.prepare(binding({ user_id: "user-b" }));
  assert.deepEqual([other.state, other.reason, calls], ["deferred", "coordination_deferred", 1]);
  release();
  const completed = await pending;
  assert.deepEqual([completed.state, calls, JSON.parse(store.raw()).state], ["ready", 1, "ready"]);
});

test("invalid inputs and every storage ownership failure avoid an unowned callback", async () => {
  const invalid = [
    { tenant_id: "" }, { user_id: "" }, { principal_ref: "" }, { mailbox_address: "" },
    { installation_id: "" }, { installation_id: "bad" }, { build: "" },
    { installation_state_version: 0 }, { installation_state_version: 1.5 },
    { delegated_connection_state_version: 0 }, { delegated_connection_state_version: 1.5 },
  ];
  for (const patch of invalid) {
    const store = storage();
    let calls = 0;
    const runtime = await machine({ store, prepare: async () => { calls += 1; return { state: "ready" }; } });
    await assert.rejects(Promise.resolve().then(() => runtime.prepare(binding(patch))), TypeError);
    assert.deepEqual([store.calls.get + store.calls.set + store.calls.remove, calls], [0, 0]);
  }
  const failedStores = [
    storage(null, { beforeSet() { throw new Error("set"); } }),
    storage(null, { noOpSet: true }),
    storage(null, { beforeGet({ calls }) { if (calls.get > 1) throw new Error("read-back"); } }),
    storage("{", { beforeRemove() { throw new Error("remove"); } }),
    storage("{", { noOpRemove: true }),
  ];
  for (const store of failedStores) {
    let calls = 0;
    const runtime = await machine({ store, prepare: async () => { calls += 1; return { state: "ready" }; } });
    assert.equal((await runtime.prepare(binding())).state, "deferred");
    assert.equal(calls, 0);
  }
  for (const options of [{ store: null }, { store: {} }, { store: storage(), hash: null }]) {
    let calls = 0;
    const runtime = await machine({ ...options, prepare: async () => { calls += 1; return { state: "ready" }; } });
    const result = await runtime.prepare(binding());
    assert.deepEqual([result.state, result.supported, calls], ["deferred", false, 0]);
  }
});

test("terminal READY and callback-cleanup storage failures are explicit and fail closed", async () => {
  const terminalReadyFailures = [
    storage(null, { beforeSet({ calls }) { if (calls.set === 2) throw new Error("ready-set"); } }),
    storage(null, { beforeGet({ calls }) { if (calls.get === 4) throw new Error("ready-readback"); } }),
  ];
  for (const store of terminalReadyFailures) {
    let calls = 0;
    const runtime = await machine({ store, prepare: async () => { calls += 1; return { state: "ready" }; } });
    const result = await runtime.prepare(binding());
    assert.deepEqual([result.state, result.supported, calls, store.raw()], ["deferred", false, 1, null]);
  }

  const cleanupFailure = storage(null, { beforeRemove() { throw new Error("cleanup"); } });
  let calls = 0;
  const runtime = await machine({ store: cleanupFailure, prepare: async () => { calls += 1; return { state: "login_required" }; } });
  const result = await runtime.prepare(binding());
  assert.deepEqual([result.state, result.supported, calls], ["deferred", false, 1]);
});

test("owner-aware completion and cleanup never overwrite or delete newer state", async () => {
  for (const replacement of ["preparing", "ready"]) {
    const store = storage();
    const time = clock();
    let newer;
    const runtime = await machine({ store, time, prepare: async () => {
      const owned = JSON.parse(store.raw());
      time.value += MARKER_MS + SKEW_MS + 1;
      newer = replacement === "preparing" ? JSON.stringify({ ...owned, marker_owner: OWNER_B }) : await readyRaw();
      store.values.set(KEY, newer);
      return { state: "ready" };
    } });
    const result = await runtime.prepare(binding());
    assert.deepEqual([result.state, result.reason, store.raw()], ["deferred", "coordination_deferred", newer]);
  }
});

test("invalidate preserves a distinct replacement observed before its mutation begins", async () => {
  let raw = await readyRaw();
  const newer = await readyRaw(binding({ user_id: "user-b" }));
  let releaseRead;
  let firstReadStarted = false;
  const readGate = new Promise((resolve) => { releaseRead = resolve; });
  const api = {
    async getItem() {
      if (!firstReadStarted) {
        firstReadStarted = true;
        const observed = raw;
        await readGate;
        return observed;
      }
      return raw;
    },
    async setItem(_key, value) { raw = value; },
    async removeItem() { raw = null; },
  };
  let calls = 0;
  const runtime = await machine({
    store: api,
    prepare: async () => { calls += 1; return { state: "ready" }; },
  });
  const old = runtime.prepare(binding());
  await eventually(() => firstReadStarted);
  const invalidation = runtime.invalidate({ reason: "installation_revoked", nextState: "revoked" });
  raw = newer;
  releaseRead();
  assert.deepEqual(await invalidation, {
    state: "revoked", reason: "installation_revoked", supported: true, cache_hit: false,
  });
  assert.deepEqual([(await old).state, runtime.getState().state, calls, raw], ["revoked", "revoked", 0, newer]);
});
