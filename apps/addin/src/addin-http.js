export const DEFAULT_ADDIN_API_TIMEOUT_MS = 45_000;

export function createAddinHttpError(code, message = code, details = {}) {
  return Object.assign(new Error(message), {
    name: "AddinHttpError",
    safe_error_code: code,
    ...details,
  });
}

export async function fetchAddinApi({
  url,
  options = {},
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_ADDIN_API_TIMEOUT_MS,
  AbortControllerImpl = globalThis.AbortController,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
} = {}) {
  if (
    typeof fetchImpl !== "function"
    || typeof AbortControllerImpl !== "function"
    || typeof setTimeoutImpl !== "function"
    || typeof clearTimeoutImpl !== "function"
    || !Number.isSafeInteger(timeoutMs)
    || timeoutMs < 1
  ) {
    throw new TypeError("Add-in HTTP runtime is required");
  }
  const controller = new AbortControllerImpl();
  const timer = setTimeoutImpl(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal?.aborted === true) {
      throw createAddinHttpError(
        "ADDIN_API_REQUEST_TIMEOUT",
        "AMIC OS API request timed out",
        { timeout_ms: timeoutMs },
      );
    }
    throw error;
  } finally {
    clearTimeoutImpl(timer);
  }
}
