const CONFLICT_CODES = new Set([
  "LAWOS_REPOSITORY_CONFLICT",
  "LAWOS_STORE_CONFLICT",
  "LAWOS_IDEMPOTENCY_CONFLICT",
  "LAWOS_POSTGRES_CONFLICT",
]);

export async function dispatchApiHandler(handler, ...args) {
  if (typeof handler !== "function") throw new TypeError("API handler is required");
  return await handler(...args);
}

export function mapApiHandlerError(error, { requestId = null } = {}) {
  const conflict = CONFLICT_CODES.has(error?.code) || error?.status === 409;
  const denied = error?.status === 403;
  const unavailable = error?.code === "LAWOS_POSTGRES_RETRY_EXHAUSTED" || error?.status === 503;
  const status = conflict ? 409 : denied ? 403 : unavailable ? 503 : 500;
  const safeErrorCode = conflict
    ? error?.safe_error_code ?? "REPOSITORY_VERSION_CONFLICT"
    : denied
      ? error?.safe_error_code ?? "API_ACCESS_DENIED"
      : unavailable
        ? error?.safe_error_code ?? "API_DEPENDENCY_UNAVAILABLE"
        : "API_INTERNAL_ERROR";
  return Object.freeze({
    status,
    body: Object.freeze({
      request_id: requestId,
      outcome: "blocked",
      safe_error_codes: Object.freeze([safeErrorCode]),
      error: conflict ? "conflict" : denied ? "access_denied" : unavailable ? "dependency_unavailable" : "internal_error",
      detail_exposed: false,
      production_ready_claim: false,
    }),
  });
}
