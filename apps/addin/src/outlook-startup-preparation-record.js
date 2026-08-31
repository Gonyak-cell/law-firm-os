export const OUTLOOK_STARTUP_PREPARATION_KEY = "lawos.outlook.prepare.v1";
export const OUTLOOK_STARTUP_PREPARATION_READY_TTL_MS = 8 * 60 * 60 * 1000;
export const OUTLOOK_STARTUP_PREPARATION_MARKER_MS = 30 * 1000;
export const OUTLOOK_STARTUP_PREPARATION_CLOCK_SKEW_MS = 60 * 1000;

export const OUTLOOK_STARTUP_PREPARATION_STATES = Object.freeze({
  idle: "idle",
  preparing: "preparing",
  loginRequired: "login_required",
  connectionRequired: "connection_required",
  ready: "ready",
  deferred: "deferred",
  revoked: "revoked",
});

export const OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS = Object.freeze({
  interactionRequired: "interaction_required",
  noCredential: "no_credential",
  connectionRequired: "connection_required",
  accountMismatch: "account_mismatch",
  accountDisabled: "account_disabled",
  installationRevoked: "installation_revoked",
  offline: "offline",
  transientFailure: "transient_failure",
});

const DIGEST = /^[a-f0-9]{64}$/u;
const INSTALLATION_ID = /^odi_[A-Za-z0-9_-]{20,128}$/u;
const MARKER_ID = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;
const PRINCIPAL_REF = /^odpr_[A-Za-z0-9_-]{43}$/u;
const BINDING_FIELDS = [
  "build_hash",
  "delegated_connection_state_version",
  "installation_id",
  "installation_state_version",
  "mailbox_hash",
  "subject_hash",
  "tenant_hash",
  "user_hash",
];
const CALLBACK_REASONS_BY_STATE = new Map([
  [OUTLOOK_STARTUP_PREPARATION_STATES.ready, new Set([null])],
  [OUTLOOK_STARTUP_PREPARATION_STATES.loginRequired, new Set([
    OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS.interactionRequired,
    OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS.noCredential,
  ])],
  [OUTLOOK_STARTUP_PREPARATION_STATES.connectionRequired, new Set([
    OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS.connectionRequired,
  ])],
  [OUTLOOK_STARTUP_PREPARATION_STATES.revoked, new Set([
    OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS.accountMismatch,
    OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS.accountDisabled,
    OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS.installationRevoked,
  ])],
  [OUTLOOK_STARTUP_PREPARATION_STATES.deferred, new Set([
    OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS.offline,
    OUTLOOK_STARTUP_PREPARATION_CALLBACK_REASONS.transientFailure,
  ])],
]);
const INVALIDATION_STATES = new Set([
  OUTLOOK_STARTUP_PREPARATION_STATES.idle,
  OUTLOOK_STARTUP_PREPARATION_STATES.loginRequired,
  OUTLOOK_STARTUP_PREPARATION_STATES.connectionRequired,
  OUTLOOK_STARTUP_PREPARATION_STATES.deferred,
  OUTLOOK_STARTUP_PREPARATION_STATES.revoked,
]);

export function isOutlookStartupInvalidationState(value) {
  return INVALIDATION_STATES.has(value);
}

const isObject = (value) => value !== null
  && typeof value === "object"
  && !Array.isArray(value);
const matches = (pattern, value) => typeof value === "string" && pattern.test(value);

function exactFields(value, fields) {
  return isObject(value)
    && Object.keys(value).sort().join("\0") === [...fields].sort().join("\0");
}

function text(value, field, maximum = 512) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized || normalized.length > maximum) throw new TypeError(`${field} is invalid`);
  return normalized;
}

function positiveVersion(value, field) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${field} is invalid`);
  return value;
}

export function normalizeOutlookStartupBinding(value) {
  if (!isObject(value)) throw new TypeError("binding is invalid");
  if (Object.hasOwn(value, "subject_id")) throw new TypeError("subject_id is obsolete");
  const installationId = text(value.installation_id, "installation_id", 132);
  if (!INSTALLATION_ID.test(installationId)) throw new TypeError("installation_id is invalid");
  let principalRef;
  try { principalRef = value.principal_ref; } catch { throw new TypeError("principal_ref is invalid"); }
  if (typeof principalRef !== "string" || !PRINCIPAL_REF.test(principalRef)) {
    throw new TypeError("principal_ref is invalid");
  }
  return Object.freeze({
    tenant_id: text(value.tenant_id, "tenant_id"),
    user_id: text(value.user_id, "user_id"),
    principal_ref: principalRef,
    mailbox_address: text(value.mailbox_address, "mailbox_address").toLowerCase(),
    installation_id: installationId,
    installation_state_version: positiveVersion(value.installation_state_version, "installation_state_version"),
    delegated_connection_state_version: positiveVersion(
      value.delegated_connection_state_version,
      "delegated_connection_state_version",
    ),
    build: text(value.build, "build", 256),
  });
}

export async function hashOutlookStartupBinding(input, hash) {
  const digests = await Promise.all([
    input.tenant_id,
    input.user_id,
    input.principal_ref,
    input.mailbox_address,
    input.build,
  ].map((value) => hash(value)));
  if (!digests.every((value) => typeof value === "string" && DIGEST.test(value))) {
    throw new TypeError("hash result is invalid");
  }
  return Object.freeze({
    tenant_hash: digests[0],
    user_hash: digests[1],
    subject_hash: digests[2], // Persisted wire name for digest(principal_ref).
    mailbox_hash: digests[3],
    build_hash: digests[4],
    installation_id: input.installation_id,
    installation_state_version: input.installation_state_version,
    delegated_connection_state_version: input.delegated_connection_state_version,
  });
}

function validStoredBinding(value) {
  return exactFields(value, BINDING_FIELDS)
    && matches(DIGEST, value.tenant_hash)
    && matches(DIGEST, value.user_hash)
    && matches(DIGEST, value.subject_hash)
    && matches(DIGEST, value.mailbox_hash)
    && matches(DIGEST, value.build_hash)
    && matches(INSTALLATION_ID, value.installation_id)
    && Number.isSafeInteger(value.installation_state_version)
    && value.installation_state_version > 0
    && Number.isSafeInteger(value.delegated_connection_state_version)
    && value.delegated_connection_state_version > 0;
}

export function sameOutlookStartupBinding(left, right) {
  return BINDING_FIELDS.every((field) => left?.[field] === right?.[field]);
}

export function validOutlookStartupInstant(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

export function readOutlookStartupClock(now) {
  let value;
  try { value = now(); } catch { return null; }
  if (!validOutlookStartupInstant(value)) return null;
  return value <= Number.MAX_SAFE_INTEGER - OUTLOOK_STARTUP_PREPARATION_READY_TTL_MS
    ? value
    : null;
}

function timing(start, end, now, duration) {
  if (
    !validOutlookStartupInstant(start)
    || !validOutlookStartupInstant(end)
    || start > Number.MAX_SAFE_INTEGER - duration
    || start + duration !== end
  ) return "invalid";
  if (start > now && start - now > OUTLOOK_STARTUP_PREPARATION_CLOCK_SKEW_MS) return "future";
  if (now > end && now - end > OUTLOOK_STARTUP_PREPARATION_CLOCK_SKEW_MS) return "expired";
  return "active";
}

export function parseOutlookStartupRecord(raw, now) {
  if (!validOutlookStartupInstant(now)) return { kind: "clock_invalid" };
  if (raw === null || raw === undefined) return { kind: "empty" };
  if (typeof raw !== "string") return { kind: "corrupt" };
  let value;
  try { value = JSON.parse(raw); } catch { return { kind: "corrupt" }; }
  if (value?.schema !== OUTLOOK_STARTUP_PREPARATION_KEY || !validStoredBinding(value?.binding)) {
    return { kind: "corrupt" };
  }
  if (
    value.state === OUTLOOK_STARTUP_PREPARATION_STATES.ready
    && exactFields(value, ["schema", "state", "binding", "prepared_at", "expires_at"])
  ) {
    const status = timing(value.prepared_at, value.expires_at, now, OUTLOOK_STARTUP_PREPARATION_READY_TTL_MS);
    return status === "invalid" ? { kind: "corrupt" } : { kind: "ready", status, value };
  }
  if (
    value.state === OUTLOOK_STARTUP_PREPARATION_STATES.preparing
    && exactFields(value, [
      "schema", "state", "binding", "marker_owner", "marker_started_at", "marker_expires_at",
    ])
    && matches(MARKER_ID, value.marker_owner)
  ) {
    const status = timing(value.marker_started_at, value.marker_expires_at, now, OUTLOOK_STARTUP_PREPARATION_MARKER_MS);
    return status === "invalid" ? { kind: "corrupt" } : { kind: "marker", status, value };
  }
  return { kind: "corrupt" };
}

export function serializeOutlookStartupMarker(binding, owner, startedAt) {
  if (!MARKER_ID.test(typeof owner === "string" ? owner : "")) return null;
  const expiresAt = startedAt + OUTLOOK_STARTUP_PREPARATION_MARKER_MS;
  if (!validOutlookStartupInstant(startedAt) || !validOutlookStartupInstant(expiresAt)) return null;
  return JSON.stringify({
    schema: OUTLOOK_STARTUP_PREPARATION_KEY,
    state: OUTLOOK_STARTUP_PREPARATION_STATES.preparing,
    binding,
    marker_owner: owner,
    marker_started_at: startedAt,
    marker_expires_at: expiresAt,
  });
}

export function serializeOutlookStartupReady(binding, preparedAt) {
  const expiresAt = preparedAt + OUTLOOK_STARTUP_PREPARATION_READY_TTL_MS;
  if (!validOutlookStartupInstant(preparedAt) || !validOutlookStartupInstant(expiresAt)) return null;
  return JSON.stringify({
    schema: OUTLOOK_STARTUP_PREPARATION_KEY,
    state: OUTLOOK_STARTUP_PREPARATION_STATES.ready,
    binding,
    prepared_at: preparedAt,
    expires_at: expiresAt,
  });
}

export function normalizeOutlookStartupCallbackResult(value) {
  try {
    if (!isObject(value)) return null;
    const state = value.state;
    const suppliedReason = value.reason;
    const reason = suppliedReason === null || suppliedReason === undefined ? null : suppliedReason;
    if (!CALLBACK_REASONS_BY_STATE.get(state)?.has(reason)) return null;
    return Object.freeze({ state, reason });
  } catch {
    return null;
  }
}
