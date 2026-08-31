import {
  KEY,
  binding,
  eventually,
  machine,
  readyRaw,
  storage,
} from "./outlook-startup-preparation-test-support.js";

const foreignBinding = binding({ user_id: "user-b" });

async function invalidationRemoveBoundary() {
  const foreign = await readyRaw(foreignBinding);
  const store = storage(await readyRaw(), {
    beforeRemove({ values }) { values.set(KEY, foreign); },
  });
  const runtime = await machine({ store });
  const result = await runtime.invalidate({ reason: "installation_revoked", nextState: "revoked" });
  return {
    boundary: "invalidation_remove",
    result_state: result.state,
    current_state: runtime.getState().state,
    foreign_preserved: store.raw() === foreign,
    remove_calls: store.calls.remove,
  };
}

async function readySetBoundary() {
  const foreign = await readyRaw(foreignBinding);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let readySetStarted = false;
  const store = storage(null, {
    async beforeSet({ value, values }) {
      if (JSON.parse(value).state === "ready") {
        readySetStarted = true;
        values.set(KEY, foreign);
        await gate;
      }
    },
  });
  const runtime = await machine({ store });
  const old = runtime.prepare(binding());
  await eventually(() => readySetStarted);
  const invalidation = runtime.invalidate({ reason: "installation_revoked", nextState: "revoked" });
  release();
  const [oldResult, invalidated] = await Promise.all([old, invalidation]);
  return {
    boundary: "ready_set",
    old_state: oldResult.state,
    invalidated_state: invalidated.state,
    current_state: runtime.getState().state,
    foreign_preserved: store.raw() === foreign,
  };
}

async function callbackCleanupRemoveBoundary() {
  const foreign = await readyRaw(foreignBinding);
  let callbackCalls = 0;
  const store = storage(null, {
    beforeRemove({ values }) { values.set(KEY, foreign); },
  });
  const runtime = await machine({
    store,
    prepare: async () => {
      callbackCalls += 1;
      return { state: "login_required", reason: "interaction_required" };
    },
  });
  const result = await runtime.prepare(binding());
  return {
    boundary: "callback_cleanup_remove",
    result_state: result.state,
    current_state: runtime.getState().state,
    callback_calls: callbackCalls,
    foreign_preserved: store.raw() === foreign,
  };
}

async function corruptCleanupRemoveBoundary() {
  const foreign = await readyRaw(foreignBinding);
  let callbackCalls = 0;
  const store = storage("{", {
    beforeRemove({ values }) { values.set(KEY, foreign); },
  });
  const runtime = await machine({
    store,
    prepare: async () => {
      callbackCalls += 1;
      return { state: "ready" };
    },
  });
  const result = await runtime.prepare(binding());
  return {
    boundary: "corrupt_cleanup_remove",
    result_state: result.state,
    current_state: runtime.getState().state,
    callback_calls: callbackCalls,
    foreign_preserved: store.raw() === foreign,
  };
}

const boundaries = await Promise.all([
  invalidationRemoveBoundary(),
  readySetBoundary(),
  callbackCleanupRemoveBoundary(),
  corruptCleanupRemoveBoundary(),
]);

console.log(JSON.stringify({
  classification: "expected_design_red_documenting_non_atomic_advisory_storage",
  cross_context_atomic_preservation_claim: false,
  global_singleton_claim: false,
  boundaries,
}));
console.error("DESIGN_GUARANTEE_UNSUPPORTED: check-then-set/remove cannot atomically preserve cross-context replacements");
process.exitCode = 1;
