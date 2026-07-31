export const PEOPLE_SOURCE_ENVELOPE_SCHEMA_VERSION = "lawos.people-source-envelope.v1";

const SOURCE_STATES = new Set(["ok", "blocked", "stale"]);
const SAFE_ERROR_CODE = /^[A-Z][A-Z0-9_]{2,80}$/;

function requiredText(value, field) {
  if (typeof value !== "string" || !value.trim()) throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalTimestamp(value, field) {
  if (value === null || value === undefined) return null;
  const timestamp = requiredText(value, field);
  if (!Number.isFinite(Date.parse(timestamp))) throw new TypeError(`${field} must be an ISO timestamp`);
  return timestamp;
}

function validTimezone(value) {
  const timezone = requiredText(value, "timezone");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(0);
  } catch {
    throw new TypeError("timezone must be a valid IANA timezone");
  }
  return timezone;
}

function safeErrorCode(value, state) {
  if (state === "ok") return null;
  const code = requiredText(value, "safe_error_code");
  if (!SAFE_ERROR_CODE.test(code)) throw new TypeError("safe_error_code must contain only safe uppercase code characters");
  return code;
}

function normalizeSourceStatus(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("source_status entries must be objects");
  }
  const source = requiredText(value.source, "source_status.source");
  const state = requiredText(value.state, "source_status.state");
  if (!SOURCE_STATES.has(state)) throw new TypeError(`unsupported source_status.state: ${state}`);
  const lastSuccessAt = optionalTimestamp(value.last_success_at, "source_status.last_success_at");
  if ((state === "ok" || state === "stale") && !lastSuccessAt) {
    throw new TypeError(`source_status.last_success_at is required for ${state} sources`);
  }
  return Object.freeze({
    source,
    state,
    last_success_at: lastSuccessAt,
    stale_after: optionalTimestamp(value.stale_after, "source_status.stale_after"),
    safe_error_code: safeErrorCode(value.safe_error_code, state),
  });
}

function deriveEnvelopeState(sourceStatus) {
  if (sourceStatus.every(({ state }) => state === "ok")) return "ok";
  if (sourceStatus.some(({ state }) => state === "ok")) return "partial";
  if (sourceStatus.every(({ state }) => state === "stale")) return "stale";
  return "blocked";
}

export function createPeopleSourceEnvelope({
  as_of,
  timezone = "Asia/Seoul",
  source_status,
  data = {},
} = {}) {
  const asOf = optionalTimestamp(as_of, "as_of");
  if (!asOf) throw new TypeError("as_of is required");
  if (!Array.isArray(source_status) || source_status.length === 0) {
    throw new TypeError("source_status must contain at least one source");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError("data must be an object");
  }
  const normalizedStatus = source_status.map(normalizeSourceStatus);
  if (new Set(normalizedStatus.map(({ source }) => source)).size !== normalizedStatus.length) {
    throw new TypeError("source_status sources must be unique");
  }
  return Object.freeze({
    schema_version: PEOPLE_SOURCE_ENVELOPE_SCHEMA_VERSION,
    state: deriveEnvelopeState(normalizedStatus),
    as_of: asOf,
    timezone: validTimezone(timezone),
    source_status: Object.freeze(normalizedStatus),
    data: Object.freeze({ ...data }),
  });
}
