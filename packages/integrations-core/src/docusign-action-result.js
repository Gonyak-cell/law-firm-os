const ACTION_RESULT_VARIANTS = Object.freeze([
  Object.freeze({ kind: "return", outcome: "sent", http_status: 200, retryable: false, safe_error_code: false }),
  Object.freeze({ kind: "return", outcome: "reconciled", http_status: 200, retryable: false, safe_error_code: false }),
  Object.freeze({ kind: "return", outcome: "already_converged", http_status: 200, retryable: false, safe_error_code: false }),
  Object.freeze({ kind: "return", outcome: "blocked", http_status: 200, retryable: false, safe_error_code: true }),
  Object.freeze({ kind: "error", outcome: "blocked", http_status: 400, retryable: false, safe_error_code: true }),
  Object.freeze({ kind: "error", outcome: "blocked", http_status: 401, retryable: false, safe_error_code: true }),
  Object.freeze({ kind: "error", outcome: "blocked", http_status: 403, retryable: false, safe_error_code: true }),
  Object.freeze({ kind: "error", outcome: "blocked", http_status: 404, retryable: false, safe_error_code: true }),
  Object.freeze({ kind: "error", outcome: "blocked", http_status: 409, retryable: false, safe_error_code: true }),
  Object.freeze({ kind: "error", outcome: "retryable", http_status: 503, retryable: true, safe_error_code: true }),
]);

function requiredText(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function safeErrorCode(value) {
  if (value == null) return null;
  const code = requiredText(value, "action_idempotency.result.safe_error_code");
  if (!/^[A-Z0-9_]+$/u.test(code)) throw new TypeError("action_idempotency.result.safe_error_code is invalid");
  return code;
}

/**
 * Durable, constrained public result for a completed action attempt.
 * `kind` distinguishes an HTTP error that must be thrown from a normal 200
 * response whose public outcome is blocked (provider rejection).
 */
export function normalizeDocusignActionResult(input) {
  if (input == null) return null;
  if (typeof input !== "object" || Array.isArray(input)) throw new TypeError("action_idempotency.result must be an object");
  const kind = requiredText(input.kind, "action_idempotency.result.kind");
  const outcome = requiredText(input.outcome, "action_idempotency.result.outcome");
  const httpStatus = Number(input.http_status);
  if (typeof input.retryable !== "boolean") throw new TypeError("action_idempotency.result.retryable is required");
  const code = safeErrorCode(input.safe_error_code);
  const variant = ACTION_RESULT_VARIANTS.find((candidate) => candidate.kind === kind
    && candidate.outcome === outcome
    && candidate.http_status === httpStatus
    && candidate.retryable === input.retryable);
  if (!variant || (variant.safe_error_code ? code == null : code != null)) throw new TypeError("action_idempotency.result variant is invalid");
  return Object.freeze({ kind, outcome, http_status: httpStatus, retryable: input.retryable, safe_error_code: code });
}

export function docusignActionResult(input) {
  return normalizeDocusignActionResult(input);
}

/**
 * Shared replay projector. It never trusts arbitrary persisted fields: the
 * action result is normalized before becoming either a safe public return or
 * a typed error. Callers supply their request projector/error constructor to
 * avoid coupling this persistence seam to either executor.
 */
export function projectDocusignActionResult({ action, request, projectRequest, createError }) {
  const result = normalizeDocusignActionResult(action?.result);
  if (!result) return null;
  if (typeof projectRequest !== "function" || typeof createError !== "function") throw new TypeError("action result projector callbacks are required");
  if (result.kind === "error") {
    const error = createError(result.safe_error_code, result.http_status, result.retryable);
    error.request = projectRequest(request);
    throw error;
  }
  return Object.freeze({
    outcome: result.outcome,
    request: projectRequest(request),
    ...(result.safe_error_code ? { safe_error_code: result.safe_error_code } : {}),
  });
}
