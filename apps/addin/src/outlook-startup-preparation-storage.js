import {
  OUTLOOK_STARTUP_PREPARATION_KEY,
  parseOutlookStartupRecord,
  readOutlookStartupClock,
  sameOutlookStartupBinding,
  serializeOutlookStartupMarker,
  serializeOutlookStartupReady,
} from "./outlook-startup-preparation-record.js";

export function createOutlookStartupPreparationStorage(storage) {
  let mutationTail = Promise.resolve();
  const enqueue = (operation) => {
    const scheduled = mutationTail.then(operation, operation);
    mutationTail = scheduled.then(() => undefined, () => undefined);
    return scheduled;
  };
  const read = () => storage.getItem(OUTLOOK_STARTUP_PREPARATION_KEY);
  const supported = () => {
    try {
      return typeof storage?.getItem === "function"
        && typeof storage?.setItem === "function"
        && typeof storage?.removeItem === "function";
    } catch {
      return false;
    }
  };

  async function claim({ binding, flight, isStale, now, createMarkerId }) {
    return enqueue(async () => {
      if (isStale()) return { kind: "stale" };
      const current = readOutlookStartupClock(now);
      if (current === null) return { kind: "error", reason: "clock_invalid" };
      let raw;
      try { raw = await read(); } catch { return { kind: "error", reason: "storage_unavailable" }; }
      flight.observationSet = true;
      flight.observedRaw = raw;
      if (isStale()) return { kind: "stale" };
      const existing = parseOutlookStartupRecord(raw, current);
      if (existing.kind === "ready" && sameOutlookStartupBinding(existing.value.binding, binding)) {
        if (existing.status === "active") return { kind: "ready" };
        if (existing.status === "future") return { kind: "deferred", reason: "clock_skew" };
      }
      if (existing.kind === "marker") {
        if (existing.status === "active") return { kind: "deferred", reason: "coordination_deferred" };
        if (existing.status === "future") return { kind: "deferred", reason: "clock_skew" };
      }
      if (existing.kind !== "empty") {
        try { await storage.removeItem(OUTLOOK_STARTUP_PREPARATION_KEY); } catch {
          return { kind: "error", reason: "storage_cleanup_failed" };
        }
        if (isStale()) return { kind: "stale" };
        let removed;
        try { removed = await read(); } catch { return { kind: "error", reason: "storage_cleanup_failed" }; }
        if (isStale()) return { kind: "stale" };
        if (removed !== null) return { kind: "error", reason: "storage_cleanup_failed" };
      }
      if (isStale()) return { kind: "stale" };
      let owner;
      try { owner = createMarkerId(); } catch { return { kind: "error", reason: "marker_owner_unavailable" }; }
      const marker = serializeOutlookStartupMarker(binding, owner, current);
      if (!marker) return { kind: "error", reason: "marker_owner_unavailable" };
      flight.markerRaw = marker;
      try { await storage.setItem(OUTLOOK_STARTUP_PREPARATION_KEY, marker); } catch {
        return { kind: "error", reason: "storage_write_unconfirmed" };
      }
      if (isStale()) return { kind: "stale" };
      let observed;
      try { observed = await read(); } catch { return { kind: "error", reason: "storage_write_unconfirmed" }; }
      if (isStale()) return { kind: "stale" };
      if (observed !== marker) {
        const winner = parseOutlookStartupRecord(observed, current);
        return winner.kind === "marker" || winner.kind === "ready"
          ? { kind: "deferred", reason: "coordination_deferred" }
          : { kind: "error", reason: "storage_write_unconfirmed" };
      }
      return { kind: "owned" };
    });
  }

  async function cleanup(flight, isStale) {
    return enqueue(async () => {
      if (isStale()) return { kind: "stale" };
      let raw;
      try { raw = await read(); } catch { return { kind: "error" }; }
      if (isStale()) return { kind: "stale" };
      if (raw !== flight.markerRaw && raw !== flight.readyRaw) return { kind: "clean" };
      try { await storage.removeItem(OUTLOOK_STARTUP_PREPARATION_KEY); } catch { return { kind: "error" }; }
      if (isStale()) return { kind: "stale" };
      let removed;
      try { removed = await read(); } catch { return { kind: "error" }; }
      if (isStale()) return { kind: "stale" };
      return removed === null ? { kind: "clean" } : { kind: "error" };
    });
  }

  async function commitReady(binding, flight, isStale, now) {
    const current = readOutlookStartupClock(now);
    const ready = current === null ? null : serializeOutlookStartupReady(binding, current);
    if (!ready) return { kind: "clock_invalid" };
    flight.readyRaw = ready;
    return enqueue(async () => {
      if (isStale()) return { kind: "stale" };
      let raw;
      try { raw = await read(); } catch { return { kind: "error" }; }
      if (isStale()) return { kind: "stale" };
      if (raw !== flight.markerRaw) return { kind: "owner_lost" };
      try { await storage.setItem(OUTLOOK_STARTUP_PREPARATION_KEY, ready); } catch { return { kind: "error" }; }
      if (isStale()) return { kind: "stale" };
      let observed;
      try { observed = await read(); } catch { return { kind: "error" }; }
      if (isStale()) return { kind: "stale" };
      return observed === ready ? { kind: "ready" } : { kind: "error" };
    });
  }

  async function invalidate(flight, isCurrent) {
    return enqueue(async () => {
      if (!isCurrent()) return { kind: "stale" };
      let raw;
      try { raw = await read(); } catch { return { kind: "error" }; }
      if (!isCurrent()) return { kind: "stale" };
      const known = flight
        ? [flight.observedRaw, flight.markerRaw, flight.readyRaw].filter((value) => typeof value === "string")
        : [];
      const snapshotsCurrentRaw = !flight || (!flight.observationSet && known.length === 0);
      if (raw === null || (!known.includes(raw) && !snapshotsCurrentRaw)) return { kind: "clean" };
      const expected = raw;
      let confirmed;
      try { confirmed = await read(); } catch { return { kind: "error" }; }
      if (!isCurrent()) return { kind: "stale" };
      if (confirmed !== expected) return { kind: "clean" };
      try { await storage.removeItem(OUTLOOK_STARTUP_PREPARATION_KEY); } catch { return { kind: "error" }; }
      if (!isCurrent()) return { kind: "stale" };
      let removed;
      try { removed = await read(); } catch { return { kind: "error" }; }
      if (!isCurrent()) return { kind: "stale" };
      return removed === expected ? { kind: "error" } : { kind: "clean" };
    });
  }

  return Object.freeze({ supported, claim, cleanup, commitReady, invalidate });
}
