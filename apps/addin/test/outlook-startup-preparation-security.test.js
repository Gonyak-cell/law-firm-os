import assert from "node:assert/strict";
import test from "node:test";

import {
  KEY,
  SECRET_MAILBOX,
  SECRET_TOKEN,
  binding,
  machine,
  storage,
  subject,
} from "./outlook-startup-preparation-test-support.js";

test("callback output keeps only state and an exported allowlisted machine reason", async () => {
  const api = await subject();
  assert.deepEqual(Object.values(api.OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS), [
    "interaction_required", "no_credential", "connection_required", "account_mismatch",
    "account_disabled", "installation_revoked", "offline", "transient_failure",
  ]);
  const store = storage();
  const runtime = await machine({
    store,
    prepare: async () => ({
      state: "login_required",
      reason: "interaction_required",
      session_token: SECRET_TOKEN,
      mailbox_address: SECRET_MAILBOX,
      arbitrary: { nested: SECRET_TOKEN },
    }),
  });
  const outcome = await runtime.prepare(binding());
  assert.deepEqual(outcome, {
    state: "login_required", reason: "interaction_required", supported: true, cache_hit: false,
  });
  assert.equal(store.raw(), null);
  assert.doesNotMatch(JSON.stringify(outcome), /callback-secret|privileged-lawyer/u);
});

test("every callback state accepts only its explicit machine-safe reason set", async () => {
  const api = await subject();
  const states = ["ready", "login_required", "connection_required", "revoked", "deferred"];
  const reasons = [null, ...Object.values(api.OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS)];
  const allowed = new Set([
    "ready\0", "login_required\0interaction_required", "login_required\0no_credential",
    "connection_required\0connection_required", "revoked\0account_mismatch",
    "revoked\0account_disabled", "revoked\0installation_revoked",
    "deferred\0offline", "deferred\0transient_failure",
  ]);
  for (const state of states) {
    for (const reason of reasons) {
      const store = storage();
      let calls = 0;
      const runtime = await machine({
        store,
        prepare: async () => { calls += 1; return { state, reason }; },
      });
      const pair = `${state}\0${reason ?? ""}`;
      if (allowed.has(pair)) {
        const result = await runtime.prepare(binding());
        assert.deepEqual([result.state, result.reason, calls], [state, reason, 1], pair);
        assert.equal(store.raw() === null, state !== "ready", pair);
      } else {
        await assert.rejects(
          runtime.prepare(binding()),
          (error) => error?.message === "OUTLOOK_PREPARATION_RESULT_INVALID"
            && error?.safe_error_code === "OUTLOOK_PREPARATION_RESULT_INVALID"
            && error?.cause === undefined,
          pair,
        );
        assert.deepEqual([calls, store.raw()], [1, null], pair);
      }
    }
  }
});

test("callback state and reason accessors are snapshotted exactly once", async () => {
  const logged = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...values) => logged.push(values);
  console.warn = (...values) => logged.push(values);
  try {
    for (const changingField of ["state", "reason"]) {
      let stateReads = 0;
      let reasonReads = 0;
      const callbackValue = {
        get state() {
          stateReads += 1;
          return changingField === "state" && stateReads > 1
            ? `mutable-state:${SECRET_TOKEN}:${SECRET_MAILBOX}` : "deferred";
        },
        get reason() {
          reasonReads += 1;
          return changingField === "reason" && reasonReads > 1
            ? `mutable-reason:${SECRET_TOKEN}:${SECRET_MAILBOX}` : "offline";
        },
      };
      const store = storage();
      const runtime = await machine({ store, prepare: async () => callbackValue });
      let exposed;
      try { exposed = await runtime.prepare(binding()); } catch (error) { exposed = error; }
      const observable = `${exposed?.message}\n${exposed?.stack}\n${JSON.stringify(exposed)}\n${store.raw()}\n${JSON.stringify(logged)}`;
      assert.doesNotMatch(observable, /mutable-state|mutable-reason|callback-secret|privileged-lawyer/u);
      assert.deepEqual(exposed, { state: "deferred", reason: "offline", supported: true, cache_hit: false });
      assert.deepEqual([stateReads, reasonReads, store.raw()], [1, 1, null]);
    }
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
});

test("throwing storage method accessors become fixed unsupported results", async () => {
  const logged = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...values) => logged.push(values);
  console.warn = (...values) => logged.push(values);
  try {
    for (const method of ["getItem", "setItem", "removeItem"]) {
      const api = { async getItem() { return null; }, async setItem() {}, async removeItem() {} };
      Object.defineProperty(api, method, {
        configurable: true,
        get() { throw new Error(`storage-accessor:${method}:${SECRET_TOKEN}:${SECRET_MAILBOX}`); },
      });
      let calls = 0;
      const runtime = await machine({
        store: { api },
        prepare: async () => { calls += 1; return { state: "ready" }; },
      });
      let exposed;
      try { exposed = await runtime.prepare(binding()); } catch (error) { exposed = error; }
      assert.deepEqual(exposed, {
        state: "deferred", reason: "storage_unavailable", supported: false, cache_hit: false,
      });
      assert.equal(calls, 0);
      assert.doesNotMatch(`${JSON.stringify(exposed)}\n${JSON.stringify(logged)}`, /storage-accessor|callback-secret|privileged-lawyer/u);
    }
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
});

test("arbitrary callback reasons are rejected without echoing secret material", async () => {
  const deceptiveResults = [
    { state: "deferred", reason: `attacker:${SECRET_TOKEN}:${SECRET_MAILBOX}` },
    Object.defineProperty({ state: "deferred" }, "reason", {
      get() { throw new Error(`getter:${SECRET_TOKEN}:${SECRET_MAILBOX}`); },
    }),
  ];
  for (const callbackValue of deceptiveResults) {
    const store = storage();
    const runtime = await machine({ store, prepare: async () => callbackValue });
    let exposed;
    try { await runtime.prepare(binding()); } catch (error) { exposed = error; }
    assert.equal(exposed?.message, "OUTLOOK_PREPARATION_RESULT_INVALID");
    assert.equal(exposed?.safe_error_code, "OUTLOOK_PREPARATION_RESULT_INVALID");
    assert.equal(exposed?.cause, undefined);
    assert.doesNotMatch(`${exposed?.message}\n${exposed?.stack}\n${JSON.stringify(exposed)}\n${store.raw()}`, /callback-secret|privileged-lawyer/u);
  }
});

test("a rejected callback exposes only a fixed error and preserves newer bytes", async () => {
  const store = storage();
  const newer = JSON.stringify({ schema: KEY, state: "newer_owner", opaque: true });
  const callbackError = Object.assign(
    new Error(`provider rejected ${SECRET_TOKEN} for ${SECRET_MAILBOX}`),
    { safe_error_code: SECRET_TOKEN, cause: new Error(SECRET_MAILBOX) },
  );
  const logged = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = (...values) => logged.push(values);
  console.warn = (...values) => logged.push(values);
  let exposed;
  try {
    const runtime = await machine({
      store,
      prepare: async () => { store.replace(newer); throw callbackError; },
    });
    try { await runtime.prepare(binding()); } catch (error) { exposed = error; }
  } finally {
    console.error = originalError;
    console.warn = originalWarn;
  }
  assert.equal(exposed?.message, "OUTLOOK_PREPARATION_FAILED");
  assert.equal(exposed?.safe_error_code, "OUTLOOK_PREPARATION_FAILED");
  assert.equal(exposed?.cause, undefined);
  const observable = `${exposed?.message}\n${exposed?.stack}\n${JSON.stringify(exposed)}\n${store.raw()}\n${JSON.stringify(logged)}`;
  assert.doesNotMatch(observable, /callback-secret|privileged-lawyer|provider rejected/u);
  assert.equal(store.raw(), newer);
});
