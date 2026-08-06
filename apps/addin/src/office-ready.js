export const OFFICE_READY_TIMEOUT_MS = 5 * 1000;

export function waitForOfficeReady({
  Office = globalThis.Office,
  timeoutMs = OFFICE_READY_TIMEOUT_MS,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
  onLateReady = () => {},
} = {}) {
  const onReady = Office?.onReady;
  if (typeof onReady !== "function") return Promise.resolve({ status: "unavailable" });
  return new Promise((resolve) => {
    let outcomeResolved = false;
    let readyNotified = false;
    let timeoutId;
    const resolveInitial = (status) => {
      if (outcomeResolved) return;
      outcomeResolved = true;
      clearTimeoutImpl(timeoutId);
      resolve({ status });
    };
    const notifyReady = () => {
      if (readyNotified) return;
      readyNotified = true;
      if (outcomeResolved) onLateReady();
      else resolveInitial("ready");
    };
    timeoutId = setTimeoutImpl(() => resolveInitial("timed_out"), timeoutMs);
    try {
      const result = onReady(notifyReady);
      if (result && typeof result.then === "function") {
        result.then(notifyReady, () => resolveInitial("failed"));
      }
    } catch {
      resolveInitial("failed");
    }
  });
}

export function startOfficeTaskPane({ render, waitForReady, register }) {
  render();
  void waitForReady().then(register);
}

export function createRegistrationLatch(register) {
  let registered = false;
  return () => {
    if (registered) return true;
    registered = register() === true;
    return registered;
  };
}
