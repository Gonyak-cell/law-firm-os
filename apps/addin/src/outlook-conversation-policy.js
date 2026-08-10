export const OUTLOOK_CONVERSATION_POLICY_PATH = "/api/outlook/conversation-policies";

const RESPONSE_INVALID = "API_RESPONSE_INVALID";
const SAFE_ID = /^[^\u0000-\u001f\u007f\s][^\u0000-\u001f\u007f\s]{0,1023}$/u;
const REQUEST_FIELDS = Object.freeze({
  current: Object.freeze(["m365_connection_id", "matter_id", "conversation_id"]),
  enable: Object.freeze([
    "m365_connection_id", "matter_id", "conversation_id", "seed_email_thread_id",
    "expected_version", "idempotency_key", "reason",
  ]),
  revoke: Object.freeze(["m365_connection_id", "matter_id", "expected_version", "idempotency_key", "reason"]),
});
const RESPONSE_FIELDS = Object.freeze([
  "request_id", "outcome", "item", "readiness", "safe_error_codes", "production_ready_claim",
]);
const MUTATION_RESPONSE_FIELDS = Object.freeze([
  "request_id", "outcome", "item", "subscription_sync", "safe_error_codes", "production_ready_claim",
]);
const READINESS_FIELDS = Object.freeze(["authoritative", "runtime_ready", "auto_filing_enabled"]);
const POLICY_FIELDS = Object.freeze([
  "policy_id", "conversation_id", "matter_id", "status", "pause_reason", "version",
  "created_at", "updated_at", "revoked_at",
]);
const POLICY_STATUSES = new Set(["active", "paused", "revoked"]);
const MUTATION_OUTCOMES = Object.freeze({
  enable: new Set(["created", "reenabled", "idempotent_replay"]),
  revoke: new Set(["revoked", "idempotent_replay"]),
});

function invalid(message = RESPONSE_INVALID, code = RESPONSE_INVALID) {
  throw Object.assign(new TypeError(message), { safe_error_code: code });
}

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactObject(value, fields, label) {
  if (!object(value) || Object.keys(value).length !== fields.length
      || fields.some((field) => !Object.hasOwn(value, field))) {
    invalid(`${label} fields are incomplete or unsafe`, "OUTLOOK_CONVERSATION_POLICY_INVALID");
  }
}

function requiredText(value, field, max = 1024) {
  if (typeof value !== "string" || value !== value.trim() || !value || value.length > max
      || !SAFE_ID.test(value)) {
    invalid(`${field} is invalid`, "OUTLOOK_CONVERSATION_POLICY_INVALID");
  }
  return value;
}

function reason(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 500
      || /[\r\n\u0000-\u001f\u007f]/u.test(value)) {
    invalid("reason is invalid", "OUTLOOK_CONVERSATION_POLICY_INVALID");
  }
  return value.trim();
}

function version(value, { allowZero = false } = {}) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    invalid("expected_version is invalid", "OUTLOOK_CONVERSATION_POLICY_INVALID");
  }
  return value;
}

function timestamp(value, field, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)
      || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) {
    invalid(`${field} is invalid`);
  }
  return value;
}

function requestOptions(value, label) {
  if (!object(value)) invalid(`${label} is required`, "OUTLOOK_CONVERSATION_POLICY_INVALID");
  return value;
}

function exactRequestOptions(value, fields, label) {
  const input = requestOptions(value, label);
  if (Object.keys(input).some((field) => !fields.includes(field))) {
    invalid(`${label} contains unsupported fields`, "OUTLOOK_CONVERSATION_POLICY_INVALID");
  }
  return input;
}

function queryPath(values) {
  return `${OUTLOOK_CONVERSATION_POLICY_PATH}?${REQUEST_FIELDS.current
    .map((field) => `${field}=${encodeURIComponent(values[field])}`).join("&")}`;
}

export function createOutlookConversationPolicyCurrentRequest(options = {}) {
  const input = exactRequestOptions(options, REQUEST_FIELDS.current, "conversation policy current request");
  const values = Object.fromEntries(REQUEST_FIELDS.current.map((field) => [
    field, requiredText(input[field], field),
  ]));
  return Object.freeze({ method: "GET", path: queryPath(values) });
}

export function createOutlookConversationPolicyEnableRequest(options = {}) {
  const input = exactRequestOptions(options, REQUEST_FIELDS.enable, "conversation policy enable request");
  const body = {
    m365_connection_id: requiredText(input.m365_connection_id, "m365_connection_id"),
    matter_id: requiredText(input.matter_id, "matter_id"),
    conversation_id: requiredText(input.conversation_id, "conversation_id"),
    seed_email_thread_id: requiredText(input.seed_email_thread_id, "seed_email_thread_id"),
    expected_version: version(input.expected_version, { allowZero: true }),
    idempotency_key: requiredText(input.idempotency_key, "idempotency_key"),
    reason: reason(input.reason),
  };
  return Object.freeze({ method: "POST", path: OUTLOOK_CONVERSATION_POLICY_PATH, body: Object.freeze(body) });
}

export function createOutlookConversationPolicyRevokeRequest(options = {}) {
  const input = exactRequestOptions(options, ["policy_id", ...REQUEST_FIELDS.revoke], "conversation policy revoke request");
  const policyId = requiredText(input.policy_id, "policy_id");
  const body = {
    m365_connection_id: requiredText(input.m365_connection_id, "m365_connection_id"),
    matter_id: requiredText(input.matter_id, "matter_id"),
    expected_version: version(input.expected_version),
    idempotency_key: requiredText(input.idempotency_key, "idempotency_key"),
    reason: reason(input.reason),
  };
  return Object.freeze({
    method: "POST",
    path: `${OUTLOOK_CONVERSATION_POLICY_PATH}/${encodeURIComponent(policyId)}/revoke`,
    body: Object.freeze(body),
  });
}

function responseBody(response) {
  if (object(response) && Object.hasOwn(response, "body")) {
    if (!Object.hasOwn(response, "status") || Object.keys(response).some((key) => !["body", "status"].includes(key))
        || !Number.isSafeInteger(response.status) || response.status < 200 || response.status > 299) invalid();
    return response.body;
  }
  return response;
}

function responseStatus(response) {
  return object(response) && Object.hasOwn(response, "body") ? response.status : undefined;
}

function parseReadiness(value) {
  exactObject(value, READINESS_FIELDS, "readiness");
  if (value.authoritative !== true || ["runtime_ready", "auto_filing_enabled"].some((field) => typeof value[field] !== "boolean")) invalid();
  return Object.freeze({
    authoritative: value.authoritative,
    runtime_ready: value.runtime_ready,
    auto_filing_enabled: value.auto_filing_enabled,
  });
}

export function projectOutlookConversationPolicy(value) {
  exactObject(value, POLICY_FIELDS, "policy");
  const policy = {
    policy_id: requiredText(value.policy_id, "policy_id"),
    conversation_id: requiredText(value.conversation_id, "conversation_id"),
    matter_id: requiredText(value.matter_id, "matter_id"),
    status: value.status,
    pause_reason: value.pause_reason,
    version: version(value.version),
    created_at: timestamp(value.created_at, "created_at"),
    updated_at: timestamp(value.updated_at, "updated_at"),
    revoked_at: timestamp(value.revoked_at, "revoked_at", { nullable: true }),
  };
  if (!POLICY_STATUSES.has(policy.status)
      || (policy.pause_reason !== null && typeof policy.pause_reason !== "string")
      || policy.pause_reason !== null && !policy.pause_reason.trim()
      || policy.pause_reason !== null && /[\r\n\u0000-\u001f\u007f]/u.test(policy.pause_reason)
      || policy.status === "active" && (policy.pause_reason !== null || policy.revoked_at !== null)
      || policy.status === "paused" && policy.revoked_at !== null
      || policy.status === "revoked" && policy.revoked_at === null) invalid();
  return Object.freeze(policy);
}

function parsedItem(body, outcome, operation) {
  const item = body.item === null ? null : projectOutlookConversationPolicy(body.item);
  if ((operation === "current" && outcome !== "passed") || (operation !== "current" && !item)) invalid();
  if (operation === "enable" && item && outcome !== "idempotent_replay" && item.status !== "active") invalid();
  if (operation === "revoke" && item && outcome !== "idempotent_replay" && item.status !== "revoked") invalid();
  return item;
}

export function parseOutlookConversationPolicyResponse(response, options = {}) {
  const operation = options?.operation;
  if (!Object.hasOwn(MUTATION_OUTCOMES, operation) && operation !== "current") {
    invalid("conversation policy response operation is required", "OUTLOOK_CONVERSATION_POLICY_INVALID");
  }
  const body = responseBody(response);
  exactObject(body, operation === "current" ? RESPONSE_FIELDS : MUTATION_RESPONSE_FIELDS, "conversation policy response");
  const requestId = requiredText(body.request_id, "request_id");
  if (!(operation === "current" ? body.outcome === "passed" : MUTATION_OUTCOMES[operation].has(body.outcome))
      || !Array.isArray(body.safe_error_codes)
      || body.safe_error_codes.length !== 0 || body.production_ready_claim !== false) invalid();
  const status = responseStatus(response);
  if (status !== undefined) {
    const expectedStatus = operation === "current" || operation === "revoke"
      ? 200
      : body.outcome === "created" ? 201 : 200;
    if (status !== expectedStatus) invalid();
  }
  const readiness = operation === "current" ? parseReadiness(body.readiness) : undefined;
  const item = parsedItem(body, body.outcome, operation);
  if (operation !== "current" && !["synchronized", "retry_scheduled"].includes(body.subscription_sync)) invalid();
  for (const field of ["matter_id", "conversation_id"]) {
    if (options[field] !== undefined && item && item[field] !== requiredText(options[field], field)) invalid();
  }
  return Object.freeze({
    request_id: requestId,
    outcome: body.outcome,
    item,
    ...(readiness ? { readiness } : { subscription_sync: body.subscription_sync }),
  });
}

export function parseOutlookConversationPolicyCurrentResponse(response, options = {}) {
  return parseOutlookConversationPolicyResponse(response, { ...options, operation: "current" });
}

export function parseOutlookConversationPolicyEnableResponse(response, options = {}) {
  return parseOutlookConversationPolicyResponse(response, { ...options, operation: "enable" });
}

export function parseOutlookConversationPolicyRevokeResponse(response, options = {}) {
  return parseOutlookConversationPolicyResponse(response, { ...options, operation: "revoke" });
}

export const sanitizeOutlookConversationPolicyResponse = parseOutlookConversationPolicyResponse;
