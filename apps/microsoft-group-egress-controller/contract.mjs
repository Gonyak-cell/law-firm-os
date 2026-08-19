import { createHash } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const REFERENCE = /^[A-Za-z][A-Za-z0-9+.-]*:[A-Za-z0-9:/_.+=,@-]+$/u;
const PUBLIC_ERROR_STATUSES = Object.freeze({
  INVALID_REQUEST: Object.freeze([400]),
  UNSUPPORTED_OPERATION: Object.freeze([400]),
  TARGET_POLICY_VIOLATION: Object.freeze([409, 500]),
  PRINCIPAL_POLICY_VIOLATION: Object.freeze([409]),
  CREDENTIAL_UNAVAILABLE: Object.freeze([503]),
  UPSTREAM_AUTHORIZATION_FAILED: Object.freeze([401, 403]),
  UPSTREAM_THROTTLED: Object.freeze([429]),
  UPSTREAM_UNAVAILABLE: Object.freeze([503]),
  UPSTREAM_REJECTED: Object.freeze([502]),
  UPSTREAM_RESPONSE_INVALID: Object.freeze([502]),
  PAGE_BUDGET_EXHAUSTED: Object.freeze([502]),
  REMOTE_COMMIT_UNKNOWN: Object.freeze([503]),
  READBACK_MISMATCH: Object.freeze([503]),
});

export class GroupEgressError extends Error {
  constructor(code, status = 400, details = {}) {
    super(code);
    this.name = "GroupEgressError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function fail(code, status = 400, details = {}) {
  throw new GroupEgressError(code, status, details);
}

export function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function exactObject(
  value,
  { required = [], optional = [], code = "INVALID_REQUEST", status = 400 } = {},
) {
  if (!plainObject(value)) fail(code, status);
  const keys = Object.keys(value);
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !Object.hasOwn(value, key))
    || keys.some((key) => !allowed.has(key))
  ) {
    fail(code, status);
  }
  return value;
}

export function uuid(value, code = "INVALID_REQUEST", status = 400) {
  if (typeof value !== "string" || !UUID.test(value)) fail(code, status);
  return value.toLowerCase();
}

export function opaqueReference(value) {
  if (
    typeof value !== "string"
    || value.length < 3
    || value.length > 512
    || !REFERENCE.test(value)
  ) {
    throw new TypeError("Microsoft group egress configuration is invalid");
  }
  return value;
}

export function credential(value) {
  exactObject(value, {
    required: ["client_id", "client_secret"],
    code: "CREDENTIAL_UNAVAILABLE",
    status: 503,
  });
  const clientId = uuid(value.client_id, "CREDENTIAL_UNAVAILABLE", 503);
  if (
    typeof value.client_secret !== "string"
    || value.client_secret.length < 1
    || value.client_secret.length > 16 * 1024
    || /[\u0000-\u001f\u007f]/u.test(value.client_secret)
  ) {
    fail("CREDENTIAL_UNAVAILABLE", 503);
  }
  return { client_id: clientId, client_secret: value.client_secret };
}

export function principalFingerprint(principalId) {
  return createHash("sha256").update(principalId, "utf8").digest("hex");
}

export function sameMembers(left, right) {
  return left.length === right.length
    && left.every((value, index) => value === right[index]);
}

export function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function closedDetails(error) {
  const details = error.details;
  if (
    !plainObject(details)
    || Object.keys(details).length !== 1
    || !Object.hasOwn(details, "remote_commit_state")
  ) return {};
  if (
    (error.code === "REMOTE_COMMIT_UNKNOWN" || error.code === "READBACK_MISMATCH")
    && details.remote_commit_state === "unknown"
  ) return { remote_commit_state: "unknown" };
  if (
    error.code === "UPSTREAM_RESPONSE_INVALID"
    && details.remote_commit_state === "applied"
  ) return { remote_commit_state: "applied" };
  return {};
}

function internalFailure() {
  return {
    status: 500,
    error: { code: "CONTROLLER_INTERNAL_ERROR" },
  };
}

export function publicResult(error) {
  try {
    if (!(error instanceof GroupEgressError)) return internalFailure();
    const statuses = Object.hasOwn(PUBLIC_ERROR_STATUSES, error.code)
      ? PUBLIC_ERROR_STATUSES[error.code]
      : null;
    if (!statuses?.includes(error.status)) return internalFailure();
    return {
      status: error.status,
      error: { code: error.code, ...closedDetails(error) },
    };
  } catch {
    return internalFailure();
  }
}
