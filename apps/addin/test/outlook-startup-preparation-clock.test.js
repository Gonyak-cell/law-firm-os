import assert from "node:assert/strict";
import test from "node:test";

import {
  T0,
  binding,
  machine,
  readyRaw,
  storage,
} from "./outlook-startup-preparation-test-support.js";

const CLOCK_INVALID = {
  state: "deferred",
  reason: "clock_invalid",
  supported: false,
  cache_hit: false,
};

test("invalid clock primitives never authorize a cached READY", async () => {
  const original = await readyRaw();
  const cases = [
    ["NaN", () => Number.NaN],
    ["Infinity", () => Number.POSITIVE_INFINITY],
    ["fractional", () => T0 + 0.5],
    ["numeric string", () => String(T0)],
    ["symbol", () => Symbol("clock")],
    ["negative", () => -1],
    ["throwing", () => { throw new Error("raw-clock-error"); }],
    ["unsafe end-time arithmetic", () => Number.MAX_SAFE_INTEGER],
  ];
  for (const [name, readClock] of cases) {
    let calls = 0;
    const store = storage(original);
    const runtime = await machine({
      store,
      time: { now: readClock },
      prepare: async () => { calls += 1; return { state: "ready" }; },
    });
    let exposed;
    try { exposed = await runtime.prepare(binding()); } catch (error) { exposed = error; }
    assert.deepEqual(exposed, CLOCK_INVALID, name);
    assert.deepEqual([calls, store.raw()], [0, original], name);
    assert.doesNotMatch(`${exposed?.message}\n${exposed?.stack}\n${JSON.stringify(exposed)}`, /raw-clock-error/u, name);
  }
});

test("clock failure at READY serialization reports cleanup failure before returning", async () => {
  const cases = [
    ["confirmed remove", {}, "clock_invalid", null],
    ["no-op remove", { noOpRemove: true }, "storage_cleanup_failed", "preparing"],
    ["throwing remove", { beforeRemove() { throw new Error("raw-remove-error"); } }, "storage_cleanup_failed", "preparing"],
  ];
  for (const [name, behavior, reason, remainingState] of cases) {
    const time = { value: T0, now() { return this.value; } };
    const store = storage(null, behavior);
    let calls = 0;
    const runtime = await machine({
      store,
      time,
      prepare: async () => {
        calls += 1;
        time.value = Number.NaN;
        return { state: "ready" };
      },
    });
    const result = await runtime.prepare(binding());
    assert.deepEqual(result, {
      state: "deferred", reason, supported: false, cache_hit: false,
    }, name);
    assert.equal(calls, 1, name);
    assert.equal(store.raw() === null ? null : JSON.parse(store.raw()).state, remainingState, name);
  }
});
