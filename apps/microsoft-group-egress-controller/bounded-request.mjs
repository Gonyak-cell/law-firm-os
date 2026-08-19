export const MAX_REQUEST_TIMEOUT_MS = 15_000;

function timeoutError() {
  const error = new Error("UPSTREAM_REQUEST_TIMEOUT");
  error.name = "RequestTimeoutError";
  return error;
}

export function createBoundedRequest({
  fetchImpl,
  timeoutMs,
  setTimeoutImpl,
  clearTimeoutImpl,
}) {
  return async function boundedRequest(url, options, consume) {
    const controller = new AbortController();
    let rejectTimeout;
    const timeout = new Promise((_, reject) => { rejectTimeout = reject; });
    const timeoutHandle = setTimeoutImpl(() => {
      const error = timeoutError();
      controller.abort(error);
      rejectTimeout(error);
    }, timeoutMs);
    let operation;
    try {
      operation = Promise.resolve(fetchImpl(url, {
        ...options,
        signal: controller.signal,
      })).then(consume);
    } catch (error) {
      operation = Promise.reject(error);
    }
    try {
      return await Promise.race([operation, timeout]);
    } finally {
      clearTimeoutImpl(timeoutHandle);
    }
  };
}
