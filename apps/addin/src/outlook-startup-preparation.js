import {
  OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS,
  OUTLOOK_STARTUP_PREPARATION_CLOCK_SKEW_MS,
  OUTLOOK_STARTUP_PREPARATION_KEY,
  OUTLOOK_STARTUP_PREPARATION_MARKER_MS,
  OUTLOOK_STARTUP_PREPARATION_READY_TTL_MS,
  OUTLOOK_STARTUP_PREPARATION_STATES,
  hashOutlookStartupBinding,
  isOutlookStartupInvalidationState,
  normalizeOutlookStartupBinding,
  normalizeOutlookStartupCallbackResult,
} from "./outlook-startup-preparation-record.js";
import { createOutlookStartupPreparationStorage } from "./outlook-startup-preparation-storage.js";

export {
  OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS,
  OUTLOOK_STARTUP_PREPARATION_CLOCK_SKEW_MS,
  OUTLOOK_STARTUP_PREPARATION_KEY,
  OUTLOOK_STARTUP_PREPARATION_MARKER_MS,
  OUTLOOK_STARTUP_PREPARATION_READY_TTL_MS,
  OUTLOOK_STARTUP_PREPARATION_STATES,
};

const COORDINATORS = new WeakMap();

function outcome(state, { reason = null, supported = true, cacheHit = false } = {}) {
  return Object.freeze({ state, reason, supported, cache_hit: cacheHit });
}

function newCoordinator(storage) {
  return {
    generation: 0,
    activeFlight: null,
    current: outcome(OUTLOOK_STARTUP_PREPARATION_STATES.idle),
    latestInvalidation: null,
    operations: createOutlookStartupPreparationStorage(storage),
  };
}

function coordinatorFor(storage) {
  if ((typeof storage !== "object" || storage === null) && typeof storage !== "function") {
    return newCoordinator(storage);
  }
  let coordinator = COORDINATORS.get(storage);
  if (!coordinator) {
    coordinator = newCoordinator(storage);
    COORDINATORS.set(storage, coordinator);
  }
  return coordinator;
}

function safeError(code) {
  return Object.assign(new Error(code), { safe_error_code: code });
}

function invalidationReason(value) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized || normalized.length > 128 || !/^[A-Za-z0-9._-]+$/u.test(normalized)) {
    throw new TypeError("reason is invalid");
  }
  return normalized;
}

export function createOutlookStartupPreparation({
  storage = null,
  now = Date.now,
  createMarkerId = () => "",
  hash = null,
  prepare: runPreparation,
} = {}) {
  if (typeof now !== "function") throw new TypeError("now is required");
  if (typeof createMarkerId !== "function") throw new TypeError("createMarkerId is required");
  if (typeof runPreparation !== "function") throw new TypeError("prepare is required");

  const coordinator = coordinatorFor(storage);
  const operations = coordinator.operations;
  const isStale = (flight) => flight.generation !== coordinator.generation;
  const staleOutcome = (flight) => flight.invalidationResult
    ?? coordinator.latestInvalidation?.result
    ?? outcome(OUTLOOK_STARTUP_PREPARATION_STATES.deferred, { reason: "coordination_deferred" });
  const update = (flight, state, options) => {
    if (flight && isStale(flight)) return staleOutcome(flight);
    coordinator.current = outcome(state, options);
    return coordinator.current;
  };
  const unsupported = (flight, reason) => update(flight, OUTLOOK_STARTUP_PREPARATION_STATES.deferred, {
    reason,
    supported: false,
  });

  async function cleanupOrFail(flight) {
    const cleaned = await operations.cleanup(flight, () => isStale(flight));
    if (cleaned.kind === "stale") return staleOutcome(flight);
    if (cleaned.kind === "error") return unsupported(flight, "storage_cleanup_failed");
    return null;
  }

  async function execute(input, flight) {
    if (!operations.supported()) return unsupported(flight, "storage_unavailable");
    if (typeof hash !== "function") return unsupported(flight, "hash_unavailable");
    let binding;
    try { binding = await hashOutlookStartupBinding(input, hash); } catch {
      return isStale(flight) ? staleOutcome(flight) : unsupported(flight, "hash_unavailable");
    }
    if (isStale(flight)) return staleOutcome(flight);
    const ownership = await operations.claim({
      binding,
      flight,
      isStale: () => isStale(flight),
      now,
      createMarkerId,
    });
    if (isStale(flight) || ownership.kind === "stale") return staleOutcome(flight);
    if (ownership.kind === "ready") {
      return update(flight, OUTLOOK_STARTUP_PREPARATION_STATES.ready, { cacheHit: true });
    }
    if (ownership.kind === "deferred") {
      return update(flight, OUTLOOK_STARTUP_PREPARATION_STATES.deferred, { reason: ownership.reason });
    }
    if (ownership.kind === "error") return unsupported(flight, ownership.reason);
    update(flight, OUTLOOK_STARTUP_PREPARATION_STATES.preparing);

    let callbackValue;
    try { callbackValue = await runPreparation(); } catch {
      const cleanupResult = await cleanupOrFail(flight);
      if (cleanupResult) return cleanupResult;
      update(flight, OUTLOOK_STARTUP_PREPARATION_STATES.deferred, { reason: "preparation_failed" });
      throw safeError("OUTLOOK_PREPARATION_FAILED");
    }
    if (isStale(flight)) {
      await operations.cleanup(flight, () => isStale(flight));
      return staleOutcome(flight);
    }

    const prepared = normalizeOutlookStartupCallbackResult(callbackValue);
    if (!prepared) {
      const cleanupResult = await cleanupOrFail(flight);
      if (cleanupResult) return cleanupResult;
      update(flight, OUTLOOK_STARTUP_PREPARATION_STATES.deferred, { reason: "invalid_result" });
      throw safeError("OUTLOOK_PREPARATION_RESULT_INVALID");
    }
    if (prepared.state !== OUTLOOK_STARTUP_PREPARATION_STATES.ready) {
      const cleanupResult = await cleanupOrFail(flight);
      if (cleanupResult) return cleanupResult;
      return update(flight, prepared.state, { reason: prepared.reason });
    }

    const committed = await operations.commitReady(binding, flight, () => isStale(flight), now);
    if (isStale(flight) || committed.kind === "stale") return staleOutcome(flight);
    if (committed.kind === "owner_lost") {
      return update(flight, OUTLOOK_STARTUP_PREPARATION_STATES.deferred, { reason: "coordination_deferred" });
    }
    if (committed.kind === "clock_invalid") {
      const cleanupResult = await cleanupOrFail(flight);
      if (cleanupResult) return cleanupResult;
      return unsupported(flight, "clock_invalid");
    }
    if (committed.kind === "error") {
      const cleanupResult = await cleanupOrFail(flight);
      if (cleanupResult) return cleanupResult;
      return unsupported(flight, "storage_write_unconfirmed");
    }
    return update(flight, OUTLOOK_STARTUP_PREPARATION_STATES.ready);
  }

  function prepare(input) {
    const normalized = normalizeOutlookStartupBinding(input);
    const key = JSON.stringify(normalized);
    const active = coordinator.activeFlight;
    if (active) {
      if (!active.invalidated && active.key === key) return active.promise;
      return Promise.resolve(outcome(OUTLOOK_STARTUP_PREPARATION_STATES.deferred, {
        reason: "coordination_deferred",
      }));
    }
    const flight = {
      key,
      generation: coordinator.generation,
      invalidated: false,
      invalidationResult: null,
      observationSet: false,
      observedRaw: null,
      markerRaw: null,
      readyRaw: null,
      promise: null,
    };
    coordinator.activeFlight = flight;
    flight.promise = Promise.resolve().then(() => execute(normalized, flight));
    flight.promise.then(
      () => { if (coordinator.activeFlight === flight) coordinator.activeFlight = null; },
      () => { if (coordinator.activeFlight === flight) coordinator.activeFlight = null; },
    );
    return flight.promise;
  }

  async function invalidate({ reason = "invalidated", nextState = OUTLOOK_STARTUP_PREPARATION_STATES.idle } = {}) {
    const safeReason = invalidationReason(reason);
    if (!isOutlookStartupInvalidationState(nextState)) {
      throw new TypeError("nextState is invalid");
    }
    coordinator.generation += 1;
    const invalidationGeneration = coordinator.generation;
    const invalidated = outcome(nextState, { reason: safeReason });
    const pendingInvalidation = {
      result: invalidated,
      completion: null,
    };
    coordinator.latestInvalidation = pendingInvalidation;
    const oldFlight = coordinator.activeFlight;
    if (oldFlight) {
      oldFlight.invalidated = true;
      oldFlight.invalidationResult = invalidated;
    }
    const supportedAtRequest = operations.supported();
    pendingInvalidation.completion = (async () => {
      await Promise.resolve();
      if (coordinator.latestInvalidation !== pendingInvalidation) {
        const latest = coordinator.latestInvalidation;
        return latest?.completion ?? coordinator.current;
      }
      if (!supportedAtRequest) return unsupported(null, "storage_unavailable");
      const cleaned = await operations.invalidate(
        oldFlight,
        () => coordinator.generation === invalidationGeneration,
      );
      if (coordinator.latestInvalidation !== pendingInvalidation || cleaned.kind === "stale") {
        const latest = coordinator.latestInvalidation;
        return latest && latest !== pendingInvalidation ? latest.completion : coordinator.current;
      }
      if (cleaned.kind === "error") return unsupported(null, "storage_cleanup_failed");
      coordinator.current = invalidated;
      return coordinator.current;
    })();
    return pendingInvalidation.completion;
  }

  return Object.freeze({ prepare, invalidate, getState: () => coordinator.current });
}
