import { Buffer } from "node:buffer";
import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export const CONTRACT_VERSION = "lawos.microsoft-egress.v1";
export const OPERATION_NAMES = Object.freeze([
  "oauth.jwks.get",
  "oauth.token.exchange",
  "oauth.token.refresh",
  "oauth.refresh-profile.bind-legacy-people",
  "graph.calendarView.list",
  "graph.calendarEvent.create",
  "graph.mailMessage.export",
]);

const LOGIN_ORIGIN = "https://login.microsoftonline.com";
const GRAPH_ORIGIN = "https://graph.microsoft.com";
const REDIRECT_URIS = Object.freeze({
  people:
    "https://d2mthcc8vp3cr2.cloudfront.net/api/outlook/connection/callback",
  client:
    "https://d2mthcc8vp3cr2.cloudfront.net/api/outlook/connection/callback",
});
const SCOPE_PROFILES = Object.freeze({
  people: Object.freeze([
    "openid",
    "profile",
    "email",
    "offline_access",
    "Calendars.ReadBasic",
  ]),
  client: Object.freeze([
    "openid",
    "profile",
    "email",
    "offline_access",
    "Calendars.ReadWrite",
    "Mail.Read",
  ]),
});
const ALLOWED_SCOPES = new Set(Object.values(SCOPE_PROFILES).flat());
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const PRINTABLE_ASCII = /^[\x21-\x7e]+$/u;
const CALENDAR_SELECT = [
  "id",
  "subject",
  "start",
  "end",
  "isAllDay",
  "isCancelled",
  "sensitivity",
  "showAs",
  "isOrganizer",
  "responseStatus",
  "attendees",
  "iCalUId",
  "seriesMasterId",
  "type",
  "lastModifiedDateTime",
].join(",");
const MAX_JSON_BYTES = 2 * 1024 * 1024;
const MAX_RESULT_BYTES = 5 * 1024 * 1024;
export const MAX_MIME_BYTES = 3 * 1024 * 1024;
const REFRESH_PROFILE_PROOF_CONTEXT =
  "lawos.microsoft-egress.refresh-profile.v1";
export const REFRESH_PROFILE_PROOF_CURRENT_KEY_ENV =
  "LAWOS_MICROSOFT_EGRESS_REFRESH_PROFILE_PROOF_CURRENT_KEY_B64URL";
export const REFRESH_PROFILE_PROOF_PREVIOUS_KEY_ENV =
  "LAWOS_MICROSOFT_EGRESS_REFRESH_PROFILE_PROOF_PREVIOUS_KEY_B64URL";
const REFRESH_PROFILE_PROOF_KEY_BYTES = 32;

class BrokerError extends Error {
  constructor(code, status = 400, details = {}) {
    super(code);
    this.name = "BrokerError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function invalid() {
  throw new BrokerError("INVALID_REQUEST", 400);
}

function plainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, { required = [], optional = [] } = {}) {
  if (!plainObject(value)) invalid();
  const allowed = new Set([...required, ...optional]);
  if (
    required.some((key) => !Object.hasOwn(value, key))
    || Object.keys(value).some((key) => !allowed.has(key))
  ) {
    invalid();
  }
  return value;
}

function text(value, { min = 1, max = 4096, pattern = null } = {}) {
  if (
    typeof value !== "string"
    || value.length < min
    || value.length > max
    || /[\u0000-\u001f\u007f]/u.test(value)
    || (pattern && !pattern.test(value))
  ) {
    invalid();
  }
  return value;
}

function uuid(value) {
  return text(value, { max: 36, pattern: UUID }).toLowerCase();
}

function accessToken(value) {
  return text(value, { max: 32 * 1024 });
}

function isoInstant(value) {
  const candidate = text(value, { max: 64 });
  if (
    !/(?:Z|[+-]\d{2}:\d{2})$/u.test(candidate)
    || !Number.isFinite(Date.parse(candidate))
  ) {
    invalid();
  }
  return new Date(candidate).toISOString();
}

function scopes(value, profile = null) {
  if (
    !Array.isArray(value)
    || value.length < 1
    || value.length > ALLOWED_SCOPES.size
  ) {
    invalid();
  }
  const unique = [...new Set(
    value.map((scope) => text(scope, { max: 64 })),
  )];
  const expectedProfiles = profile === null
    ? Object.values(SCOPE_PROFILES)
    : [SCOPE_PROFILES[profile]];
  if (
    unique.length !== value.length
    || unique.some((scope) => !ALLOWED_SCOPES.has(scope))
    || expectedProfiles.some(Boolean) === false
    || !expectedProfiles.some((expected) => (
      expected.length === unique.length
      && expected.every((scope) => unique.includes(scope))
    ))
  ) {
    invalid();
  }
  return unique;
}

function refreshProfileProof({
  proofKey,
  tenantId,
  clientId,
  profile,
  refreshToken,
}) {
  return createHmac("sha256", proofKey)
    .update([
      REFRESH_PROFILE_PROOF_CONTEXT,
      tenantId,
      clientId,
      profile,
      refreshToken,
    ].join("\u0000"), "utf8")
    .digest("base64url");
}

function proofKey(value, field) {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError(`${field} must be a 32-byte Uint8Array`);
  }
  const key = Buffer.from(value);
  if (key.byteLength !== REFRESH_PROFILE_PROOF_KEY_BYTES) {
    throw new TypeError(`${field} must be a 32-byte Uint8Array`);
  }
  return key;
}

function proofKeyring(value) {
  if (!plainObject(value)) {
    throw new TypeError("refresh_profile_proof_keyring is required");
  }
  const current = proofKey(value.current, "current proof key");
  const previous = value.previous === null || value.previous === undefined
    ? null
    : proofKey(value.previous, "previous proof key");
  if (previous && timingSafeEqual(current, previous)) {
    throw new TypeError("current and previous proof keys must differ");
  }
  return Object.freeze({ current, previous });
}

function proofKeyFromEnvironment(value, field, { required }) {
  if (value === undefined || value === null || value === "") {
    if (!required) return null;
    throw new TypeError(`${field} is required`);
  }
  if (
    typeof value !== "string"
    || !/^[A-Za-z0-9_-]{43}$/u.test(value)
  ) {
    throw new TypeError(`${field} must be unpadded base64url for 32 bytes`);
  }
  const key = Buffer.from(value, "base64url");
  if (
    key.byteLength !== REFRESH_PROFILE_PROOF_KEY_BYTES
    || key.toString("base64url") !== value
  ) {
    throw new TypeError(`${field} must be unpadded base64url for 32 bytes`);
  }
  return key;
}

/**
 * Broker-only production key contract:
 * - LAWOS_MICROSOFT_EGRESS_REFRESH_PROFILE_PROOF_CURRENT_KEY_B64URL is required.
 * - LAWOS_MICROSOFT_EGRESS_REFRESH_PROFILE_PROOF_PREVIOUS_KEY_B64URL is optional.
 * - Each value is unpadded base64url encoding of exactly 32 random bytes.
 */
export function refreshProfileProofKeyringFromEnvironment(env = process.env) {
  return proofKeyring({
    current: proofKeyFromEnvironment(
      env?.[REFRESH_PROFILE_PROOF_CURRENT_KEY_ENV],
      REFRESH_PROFILE_PROOF_CURRENT_KEY_ENV,
      { required: true },
    ),
    previous: proofKeyFromEnvironment(
      env?.[REFRESH_PROFILE_PROOF_PREVIOUS_KEY_ENV],
      REFRESH_PROFILE_PROOF_PREVIOUS_KEY_ENV,
      { required: false },
    ),
  });
}

function verifyRefreshProfileProof(input, expectedProofs) {
  const proof = text(input, {
    min: 43,
    max: 43,
    pattern: /^[A-Za-z0-9_-]{43}$/u,
  });
  const actualBytes = Buffer.from(proof, "utf8");
  let matched = 0;
  for (const expected of expectedProofs) {
    const expectedBytes = Buffer.from(expected, "utf8");
    if (actualBytes.byteLength === expectedBytes.byteLength) {
      matched |= timingSafeEqual(actualBytes, expectedBytes) ? 1 : 0;
    }
  }
  if (matched === 0) invalid();
}

function providerRequestId(response) {
  for (const name of ["request-id", "client-request-id"]) {
    const value = response.headers?.get?.(name);
    if (
      typeof value === "string"
      && /^[A-Za-z0-9._:-]{1,200}$/u.test(value)
    ) {
      return value;
    }
  }
  return null;
}

function retryAfter(response) {
  const value = Number(response.headers?.get?.("retry-after"));
  return Number.isFinite(value) && value >= 0 && value <= 3600
    ? Math.floor(value)
    : null;
}

function upstreamFailure(response) {
  const details = {};
  const retry = retryAfter(response);
  if (retry !== null) details.retry_after_seconds = retry;
  const requestId = providerRequestId(response);
  if (requestId) details.provider_request_id = requestId;
  if (response.status === 429) {
    throw new BrokerError("UPSTREAM_THROTTLED", 429, details);
  }
  if (response.status === 401 || response.status === 403) {
    throw new BrokerError(
      "UPSTREAM_AUTHORIZATION_FAILED",
      response.status,
      details,
    );
  }
  const safeStatus = [400, 404, 409].includes(response.status)
    ? response.status
    : 502;
  throw new BrokerError("UPSTREAM_REJECTED", safeStatus, details);
}

function assertTarget(url, { origin, pathname }) {
  const parsed = url instanceof URL ? url : new URL(url);
  if (
    parsed.protocol !== "https:"
    || parsed.origin !== origin
    || parsed.username
    || parsed.password
    || parsed.hash
    || (typeof pathname === "string" && parsed.pathname !== pathname)
    || (pathname instanceof RegExp && !pathname.test(parsed.pathname))
  ) {
    throw new BrokerError("TARGET_POLICY_VIOLATION", 500);
  }
  return parsed;
}

async function fixedFetch(fetchImpl, url, options, target) {
  const parsed = assertTarget(url, target);
  try {
    return await fetchImpl(parsed.toString(), {
      ...options,
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    if (error instanceof BrokerError) throw error;
    throw new BrokerError("UPSTREAM_UNAVAILABLE", 503);
  }
}

async function readBoundedBytes(response, maximum) {
  if (!response.body?.getReader) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > maximum) {
      throw new BrokerError("RESPONSE_TOO_LARGE", 502);
    }
    return bytes;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximum) {
      await reader.cancel().catch(() => {});
      throw new BrokerError("RESPONSE_TOO_LARGE", 502);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

async function readJson(response) {
  const bytes = await readBoundedBytes(response, MAX_JSON_BYTES);
  try {
    const value = JSON.parse(bytes.toString("utf8"));
    if (!plainObject(value)) throw new TypeError("object required");
    return value;
  } catch {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
}

function ensureResultSize(result) {
  if (Buffer.byteLength(JSON.stringify(result), "utf8") > MAX_RESULT_BYTES) {
    throw new BrokerError("RESPONSE_TOO_LARGE", 502);
  }
  return result;
}

function optionalString(value, maximum = 4096) {
  return typeof value === "string" && value.length <= maximum
    ? value
    : null;
}

function publicJwk(value) {
  if (!plainObject(value)) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  const result = {};
  for (const field of ["kty", "use", "kid", "x5t", "n", "e", "alg"]) {
    const item = optionalString(value[field], 16 * 1024);
    if (item !== null) result[field] = item;
  }
  if (Array.isArray(value.x5c) && value.x5c.length <= 5) {
    result.x5c = value.x5c.map((item) => {
      if (typeof item !== "string" || item.length > 32 * 1024) {
        throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
      }
      return item;
    });
  }
  if (!result.kty || !result.kid) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  return result;
}

function tokenResult(body) {
  const result = {
    token_type: optionalString(body.token_type, 32) ?? "Bearer",
    scope: optionalString(body.scope, 1024),
    expires_in: Number(body.expires_in),
    access_token: optionalString(body.access_token, 32 * 1024),
  };
  if (
    !Number.isFinite(result.expires_in)
    || result.expires_in < 1
    || !result.access_token
  ) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  for (const field of ["refresh_token", "id_token"]) {
    const value = optionalString(body[field], 32 * 1024);
    if (value !== null) result[field] = value;
  }
  const extended = Number(body.ext_expires_in);
  if (Number.isFinite(extended) && extended >= 1) {
    result.ext_expires_in = extended;
  }
  return result;
}

async function jwksGet(fetchImpl, request) {
  exactObject(request, { required: ["tenant_id"] });
  const tenantId = uuid(request.tenant_id);
  const pathname = `/${tenantId}/discovery/v2.0/keys`;
  const response = await fixedFetch(
    fetchImpl,
    `${LOGIN_ORIGIN}${pathname}`,
    { method: "GET", headers: { accept: "application/json" } },
    { origin: LOGIN_ORIGIN, pathname },
  );
  if (response.status !== 200) upstreamFailure(response);
  const body = await readJson(response);
  if (
    !Array.isArray(body.keys)
    || body.keys.length < 1
    || body.keys.length > 50
  ) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  return {
    keys: body.keys.map(publicJwk),
    provider_request_id: providerRequestId(response),
  };
}

async function tokenCall(fetchImpl, request, grant, resolveRefreshProofKeys) {
  const exchange = grant === "authorization_code";
  exactObject(request, {
    required: exchange
      ? [
        "tenant_id",
        "client_id",
        "authorization_code",
        "code_verifier",
        "redirect_profile",
        "scopes",
        "client_secret",
      ]
      : [
        "tenant_id",
        "client_id",
        "refresh_token",
        "refresh_profile_proof",
        "redirect_profile",
        "scopes",
        "client_secret",
      ],
  });
  const tenantId = uuid(request.tenant_id);
  const clientId = uuid(request.client_id);
  const clientSecret = text(request.client_secret, { max: 4096 });
  const redirectProfile = text(request.redirect_profile, {
    max: 16,
    pattern: /^(?:people|client)$/u,
  });
  const requestedScopes = scopes(request.scopes, redirectProfile);
  // Resolve broker proof configuration only after the request has passed
  // schema/profile validation and before any token egress occurs. A missing
  // or malformed production key therefore fails closed in the broker
  // envelope without affecting unrelated operations.
  const refreshProofKeys = resolveRefreshProofKeys();
  const form = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: grant,
    scope: requestedScopes.join(" "),
  });
  let currentRefreshToken = null;
  if (exchange) {
    const redirectUri = REDIRECT_URIS[redirectProfile];
    if (!redirectUri) invalid();
    form.set(
      "code",
      text(request.authorization_code, {
        max: 4096,
        pattern: PRINTABLE_ASCII,
      }),
    );
    form.set(
      "code_verifier",
      text(request.code_verifier, {
        min: 43,
        max: 128,
        pattern: /^[A-Za-z0-9._~-]+$/u,
      }),
    );
    form.set("redirect_uri", redirectUri);
  } else {
    currentRefreshToken = text(request.refresh_token, { max: 32 * 1024 });
    verifyRefreshProfileProof(
      request.refresh_profile_proof,
      [refreshProofKeys.current, refreshProofKeys.previous]
        .filter(Boolean)
        .map((key) => refreshProfileProof({
          proofKey: key,
          tenantId,
          clientId,
          profile: redirectProfile,
          refreshToken: currentRefreshToken,
        })),
    );
    form.set("refresh_token", currentRefreshToken);
  }
  const pathname = `/${tenantId}/oauth2/v2.0/token`;
  const response = await fixedFetch(
    fetchImpl,
    `${LOGIN_ORIGIN}${pathname}`,
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    },
    { origin: LOGIN_ORIGIN, pathname },
  );
  if (response.status !== 200) upstreamFailure(response);
  const result = tokenResult(await readJson(response));
  const boundRefreshToken = result.refresh_token ?? currentRefreshToken;
  if (!boundRefreshToken) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  return {
    ...result,
    refresh_profile: redirectProfile,
    refresh_profile_proof: refreshProfileProof({
      proofKey: refreshProofKeys.current,
      tenantId,
      clientId,
      profile: redirectProfile,
      refreshToken: boundRefreshToken,
    }),
    provider_request_id: providerRequestId(response),
  };
}

function bindLegacyPeopleRefreshProfile(request, resolveRefreshProofKeys) {
  exactObject(request, {
    required: ["tenant_id", "client_id", "refresh_token"],
  });
  const tenantId = uuid(request.tenant_id);
  const clientId = uuid(request.client_id);
  const refreshToken = text(request.refresh_token, { max: 32 * 1024 });
  const refreshProofKeys = resolveRefreshProofKeys();
  return {
    refresh_profile: "people",
    refresh_profile_proof: refreshProfileProof({
      proofKey: refreshProofKeys.current,
      tenantId,
      clientId,
      profile: "people",
      refreshToken,
    }),
  };
}

function graphHeaders(token, extra = {}) {
  return {
    accept: "application/json",
    authorization: `Bearer ${token}`,
    ...extra,
  };
}

function attendee(value) {
  if (!plainObject(value)) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  return {
    type: optionalString(value.type, 32),
    status: plainObject(value.status)
      ? {
        response: optionalString(value.status.response, 64),
        time: optionalString(value.status.time, 64),
      }
      : null,
    emailAddress: plainObject(value.emailAddress)
      ? {
        name: optionalString(value.emailAddress.name, 512),
        address: optionalString(value.emailAddress.address, 320),
      }
      : null,
  };
}

function calendarEvent(value) {
  if (
    !plainObject(value)
    || typeof value.id !== "string"
    || value.id.length > 4096
  ) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  const attendees = Array.isArray(value.attendees) ? value.attendees : [];
  if (attendees.length > 200) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  return {
    id: value.id,
    subject: optionalString(value.subject, 4096),
    start: plainObject(value.start)
      ? {
        dateTime: optionalString(value.start.dateTime, 64),
        timeZone: optionalString(value.start.timeZone, 128),
      }
      : null,
    end: plainObject(value.end)
      ? {
        dateTime: optionalString(value.end.dateTime, 64),
        timeZone: optionalString(value.end.timeZone, 128),
      }
      : null,
    isAllDay: value.isAllDay === true,
    isCancelled: value.isCancelled === true,
    sensitivity: optionalString(value.sensitivity, 64),
    showAs: optionalString(value.showAs, 64),
    isOrganizer: value.isOrganizer === true,
    responseStatus: plainObject(value.responseStatus)
      ? {
        response: optionalString(value.responseStatus.response, 64),
        time: optionalString(value.responseStatus.time, 64),
      }
      : null,
    attendees: attendees.map(attendee),
    iCalUId: optionalString(value.iCalUId),
    seriesMasterId: optionalString(value.seriesMasterId),
    type: optionalString(value.type, 64),
    lastModifiedDateTime: optionalString(value.lastModifiedDateTime, 64),
  };
}

function safeCalendarNextLink(value) {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string" || value.length > 16 * 1024) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  return assertTarget(value, {
    origin: GRAPH_ORIGIN,
    pathname: "/v1.0/me/calendarView",
  }).toString();
}

async function calendarViewList(fetchImpl, request) {
  exactObject(request, {
    required: [
      "access_token",
      "start_date_time",
      "end_date_time",
      "timezone",
    ],
  });
  const token = accessToken(request.access_token);
  const start = isoInstant(request.start_date_time);
  const end = isoInstant(request.end_date_time);
  if (
    request.timezone !== "Asia/Seoul"
    || Date.parse(end) <= Date.parse(start)
    || Date.parse(end) - Date.parse(start) > 2 * 24 * 60 * 60 * 1000
  ) {
    invalid();
  }
  const initial = new URL("/v1.0/me/calendarView", GRAPH_ORIGIN);
  initial.searchParams.set("startDateTime", request.start_date_time);
  initial.searchParams.set("endDateTime", request.end_date_time);
  initial.searchParams.set("$select", CALENDAR_SELECT);
  initial.searchParams.set("$top", "100");
  const events = [];
  const requestIds = [];
  let next = initial.toString();
  let pageCount = 0;
  while (next) {
    if (pageCount >= 10) {
      throw new BrokerError("PAGE_LIMIT_EXCEEDED", 502);
    }
    const response = await fixedFetch(
      fetchImpl,
      next,
      {
        method: "GET",
        headers: graphHeaders(token, {
          Prefer: 'outlook.timezone="Asia/Seoul"',
        }),
      },
      { origin: GRAPH_ORIGIN, pathname: "/v1.0/me/calendarView" },
    );
    if (response.status !== 200) upstreamFailure(response);
    const body = await readJson(response);
    if (!Array.isArray(body.value)) {
      throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
    }
    events.push(...body.value.map(calendarEvent));
    if (events.length > 1000) {
      throw new BrokerError("RESPONSE_TOO_LARGE", 502);
    }
    const requestId = providerRequestId(response);
    if (requestId) requestIds.push(requestId);
    next = safeCalendarNextLink(body["@odata.nextLink"]);
    pageCount += 1;
  }
  return ensureResultSize({
    events,
    page_count: pageCount,
    provider_request_ids: requestIds,
  });
}

async function calendarEventCreate(fetchImpl, request) {
  exactObject(request, {
    required: [
      "access_token",
      "subject",
      "start_at",
      "end_at",
      "transaction_id",
    ],
  });
  const token = accessToken(request.access_token);
  const start = isoInstant(request.start_at);
  const end = isoInstant(request.end_at);
  if (
    Date.parse(end) <= Date.parse(start)
    || Date.parse(end) - Date.parse(start) > 7 * 24 * 60 * 60 * 1000
  ) {
    invalid();
  }
  const subject = text(request.subject, { max: 160 });
  const transactionId = text(request.transaction_id, {
    max: 128,
    pattern: /^[A-Za-z0-9._:-]+$/u,
  });
  const pathname = "/v1.0/me/events";
  const response = await fixedFetch(
    fetchImpl,
    `${GRAPH_ORIGIN}${pathname}`,
    {
      method: "POST",
      headers: graphHeaders(token, {
        "content-type": "application/json",
      }),
      body: JSON.stringify({
        subject,
        start: {
          dateTime: start.replace(/Z$/u, ""),
          timeZone: "UTC",
        },
        end: {
          dateTime: end.replace(/Z$/u, ""),
          timeZone: "UTC",
        },
        transactionId,
        sensitivity: "private",
        showAs: "busy",
      }),
    },
    { origin: GRAPH_ORIGIN, pathname },
  );
  if (response.status !== 201) upstreamFailure(response);
  const body = await readJson(response);
  const eventId = optionalString(body.id);
  if (!eventId) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  const webLink = optionalString(body.webLink, 4096);
  if (webLink) {
    const parsed = new URL(webLink);
    const host = parsed.hostname.toLowerCase();
    const allowedHost = host === "outlook.office.com"
      || host.endsWith(".outlook.office.com")
      || host === "outlook.office365.com"
      || host.endsWith(".outlook.office365.com");
    if (parsed.protocol !== "https:" || !allowedHost) {
      throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
    }
  }
  return {
    event_id: eventId,
    web_link: webLink,
    provider_request_id: providerRequestId(response),
  };
}

function sentItemsFolderId(value) {
  if (!plainObject(value)) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  const folderId = optionalString(value.id);
  if (!folderId) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  return folderId;
}

function messageMetadata(value, immutableId, sentItemsId) {
  if (!plainObject(value) || value.id !== immutableId) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  const parentFolderId = optionalString(value.parentFolderId);
  if (!parentFolderId || typeof value.isDraft !== "boolean") {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  const recipients = (items) => {
    if (!Array.isArray(items) || items.length > 500) {
      throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
    }
    return items.map((item) => ({
      name: optionalString(item?.emailAddress?.name, 512),
      address: optionalString(item?.emailAddress?.address, 320),
    }));
  };
  return {
    id: immutableId,
    internet_message_id: optionalString(value.internetMessageId),
    conversation_id: optionalString(value.conversationId),
    subject: optionalString(value.subject, 4096),
    sender: plainObject(value.sender)
      ? {
        name: optionalString(value.sender.emailAddress?.name, 512),
        address: optionalString(value.sender.emailAddress?.address, 320),
      }
      : null,
    from: plainObject(value.from)
      ? {
        name: optionalString(value.from.emailAddress?.name, 512),
        address: optionalString(value.from.emailAddress?.address, 320),
      }
      : null,
    to_recipients: recipients(value.toRecipients ?? []),
    cc_recipients: recipients(value.ccRecipients ?? []),
    bcc_recipients: recipients(value.bccRecipients ?? []),
    received_at: optionalString(value.receivedDateTime, 64),
    has_attachments: value.hasAttachments === true,
    is_in_sent_items: parentFolderId === sentItemsId,
    is_draft: value.isDraft,
  };
}

async function mailMessageExport(fetchImpl, request) {
  exactObject(request, {
    required: ["access_token", "rest_message_id"],
  });
  const token = accessToken(request.access_token);
  const restId = text(request.rest_message_id, { max: 4096 });
  const translatePath = "/v1.0/me/translateExchangeIds";
  const translationResponse = await fixedFetch(
    fetchImpl,
    `${GRAPH_ORIGIN}${translatePath}`,
    {
      method: "POST",
      headers: graphHeaders(token, {
        "content-type": "application/json",
      }),
      body: JSON.stringify({
        inputIds: [restId],
        sourceIdType: "restId",
        targetIdType: "restImmutableEntryId",
      }),
    },
    { origin: GRAPH_ORIGIN, pathname: translatePath },
  );
  if (translationResponse.status !== 200) {
    upstreamFailure(translationResponse);
  }
  const translation = await readJson(translationResponse);
  const translated = Array.isArray(translation.value)
    ? translation.value
    : [];
  if (
    translated.length !== 1
    || translated[0]?.sourceId !== restId
    || typeof translated[0]?.targetId !== "string"
  ) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  const immutableId = text(translated[0].targetId, { max: 4096 });
  const encodedId = encodeURIComponent(immutableId);
  const messagePath = `/v1.0/me/messages/${encodedId}`;
  const metadataUrl = new URL(messagePath, GRAPH_ORIGIN);
  metadataUrl.searchParams.set(
    "$select",
    [
      "id",
      "internetMessageId",
      "conversationId",
      "subject",
      "sender",
      "from",
      "toRecipients",
      "ccRecipients",
      "bccRecipients",
      "receivedDateTime",
      "hasAttachments",
      "parentFolderId",
      "isDraft",
    ].join(","),
  );
  const immutableHeaders = graphHeaders(token, {
    Prefer: 'IdType="ImmutableId"',
  });
  const metadataResponse = await fixedFetch(
    fetchImpl,
    metadataUrl,
    { method: "GET", headers: immutableHeaders },
    { origin: GRAPH_ORIGIN, pathname: messagePath },
  );
  if (metadataResponse.status !== 200) upstreamFailure(metadataResponse);
  const sentItemsPath = "/v1.0/me/mailFolders/sentitems";
  const sentItemsUrl = new URL(sentItemsPath, GRAPH_ORIGIN);
  sentItemsUrl.searchParams.set("$select", "id");
  const sentItemsResponse = await fixedFetch(
    fetchImpl,
    sentItemsUrl,
    { method: "GET", headers: immutableHeaders },
    { origin: GRAPH_ORIGIN, pathname: sentItemsPath },
  );
  if (sentItemsResponse.status !== 200) upstreamFailure(sentItemsResponse);
  const sentItemsId = sentItemsFolderId(await readJson(sentItemsResponse));
  const metadata = messageMetadata(
    await readJson(metadataResponse),
    immutableId,
    sentItemsId,
  );
  const mimePath = `${messagePath}/$value`;
  const mimeResponse = await fixedFetch(
    fetchImpl,
    `${GRAPH_ORIGIN}${mimePath}`,
    {
      method: "GET",
      headers: {
        ...immutableHeaders,
        accept: "message/rfc822, application/octet-stream",
      },
    },
    { origin: GRAPH_ORIGIN, pathname: mimePath },
  );
  if (mimeResponse.status !== 200) upstreamFailure(mimeResponse);
  const mime = await readBoundedBytes(mimeResponse, MAX_MIME_BYTES);
  const header = mime.toString(
    "utf8",
    0,
    Math.min(mime.length, 64 * 1024),
  );
  if (
    !/(?:^|\r?\n)(?:from|to|date|subject|message-id|mime-version):/iu
      .test(header)
  ) {
    throw new BrokerError("UPSTREAM_RESPONSE_INVALID", 502);
  }
  return ensureResultSize({
    immutable_message_id: immutableId,
    internet_message_id: metadata.internet_message_id,
    message_metadata: metadata,
    mime_base64: mime.toString("base64"),
    mime_bytes: mime.byteLength,
    provider_request_ids: {
      translation: providerRequestId(translationResponse),
      metadata: providerRequestId(metadataResponse),
      sent_items: providerRequestId(sentItemsResponse),
      mime: providerRequestId(mimeResponse),
    },
  });
}

const OPERATIONS = Object.freeze({
  "oauth.jwks.get": jwksGet,
  "oauth.token.exchange": (fetchImpl, request, resolveRefreshProofKeys) => (
    tokenCall(
      fetchImpl,
      request,
      "authorization_code",
      resolveRefreshProofKeys,
    )
  ),
  "oauth.token.refresh": (fetchImpl, request, resolveRefreshProofKeys) => (
    tokenCall(
      fetchImpl,
      request,
      "refresh_token",
      resolveRefreshProofKeys,
    )
  ),
  "oauth.refresh-profile.bind-legacy-people": (
    _fetchImpl,
    request,
    resolveRefreshProofKeys,
  ) => bindLegacyPeopleRefreshProfile(request, resolveRefreshProofKeys),
  "graph.calendarView.list": calendarViewList,
  "graph.calendarEvent.create": calendarEventCreate,
  "graph.mailMessage.export": mailMessageExport,
});

export function createHandler({
  fetch_impl = globalThis.fetch,
  refresh_profile_proof_keyring,
  refresh_profile_proof_keyring_from_environment,
} = {}) {
  if (typeof fetch_impl !== "function") {
    throw new TypeError("fetch_impl is required");
  }
  // Keep explicit test/in-process keyrings eagerly validated for backwards
  // compatibility. Production handlers use the loader lazily so unrelated
  // JWKS/Graph operations can still return their normal result when the
  // proof-key configuration is absent.
  const explicitRefreshProofKeys = refresh_profile_proof_keyring === undefined
    ? null
    : proofKeyring(refresh_profile_proof_keyring);
  const loadRefreshProofKeys = typeof refresh_profile_proof_keyring_from_environment
    === "function"
    ? refresh_profile_proof_keyring_from_environment
    : () => refreshProfileProofKeyringFromEnvironment(process.env);
  let loadedRefreshProofKeys = explicitRefreshProofKeys;
  const resolveRefreshProofKeys = () => {
    if (loadedRefreshProofKeys) return loadedRefreshProofKeys;
    try {
      loadedRefreshProofKeys = proofKeyring(loadRefreshProofKeys());
      return loadedRefreshProofKeys;
    } catch {
      // Never expose the environment variable names or values in the public
      // broker envelope. The proof-dependent operation remains fail-closed.
      throw new BrokerError("BROKER_CONFIG_UNAVAILABLE", 503);
    }
  };
  return async function microsoftEgressBroker(event) {
    const operation =
      typeof event?.operation === "string" && event.operation.length <= 80
        ? event.operation
        : null;
    try {
      exactObject(event, {
        required: ["contract_version", "operation", "request"],
      });
      if (event.contract_version !== CONTRACT_VERSION) invalid();
      const execute = OPERATIONS[event.operation];
      if (!execute) {
        throw new BrokerError("UNSUPPORTED_OPERATION", 400);
      }
      const result = await execute(
        fetch_impl,
        event.request,
        resolveRefreshProofKeys,
      );
      return {
        contract_version: CONTRACT_VERSION,
        operation: event.operation,
        ok: true,
        status: 200,
        result,
      };
    } catch (error) {
      const safe = error instanceof BrokerError
        ? error
        : new BrokerError("BROKER_INTERNAL_ERROR", 500);
      return {
        contract_version: CONTRACT_VERSION,
        operation,
        ok: false,
        status: safe.status,
        error: {
          code: safe.code,
          ...safe.details,
        },
      };
    }
  };
}

let productionHandler = null;

export async function handler(event) {
  productionHandler ??= createHandler();
  return productionHandler(event);
}
