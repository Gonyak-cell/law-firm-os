const ACTION_RESULT_KINDS = new Set(["return", "error"]);
const ACTION_RESULT_OUTCOMES = new Set(["blocked", "retryable", "sent", "reconciled", "already_converged", "in_progress"]);
const ACTION_RESULT_STATUSES = new Set([200, 400, 401, 403, 404, 409, 503]);

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
  if (!ACTION_RESULT_KINDS.has(kind)) throw new TypeError("action_idempotency.result.kind is invalid");
  const outcome = requiredText(input.outcome, "action_idempotency.result.outcome");
  if (!ACTION_RESULT_OUTCOMES.has(outcome)) throw new TypeError("action_idempotency.result.outcome is invalid");
  const httpStatus = Number(input.http_status);
  if (!Number.isInteger(httpStatus) || !ACTION_RESULT_STATUSES.has(httpStatus)) throw new TypeError("action_idempotency.result.http_status is invalid");
  if (typeof input.retryable !== "boolean") throw new TypeError("action_idempotency.result.retryable is required");
  const code = safeErrorCode(input.safe_error_code);
  if (kind === "return" && httpStatus !== 200) throw new TypeError("normal action result must have HTTP 200");
  if (kind === "error" && httpStatus === 200) throw new TypeError("action error result must have an HTTP error status");
  if (kind === "error" && code == null) throw new TypeError("action error result requires a safe error code");
  if (outcome === "retryable" && input.retryable !== true) throw new TypeError("retryable action result must be retryable");
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
