const OUTLOOK_OPERATION_RESPONSE_STATES = Object.freeze({
  idle: "idle",
  working: "working",
  created: "created",
  complete: "complete",
  duplicate: "duplicate",
  partial: "partial",
  permission_changed: "permission_changed",
  stale_item: "stale_item",
  offline: "offline",
  reconnect_required: "reconnect_required",
  provider_blocked: "provider_blocked",
  failed: "failed",
});

const STATES = new Set(Object.values(OUTLOOK_OPERATION_RESPONSE_STATES));
const SAFE_REF_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:-";
const SAFE_ERROR_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
const FORBIDDEN_FIELDS = new Set([
  "access_token", "refresh_token", "token", "secret", "password", "authorization",
  "oauth_token", "id_token", "provider_payload", "body",
  "permission_count", "permission_counts", "count_permissions", "provider_message",
  "raw_provider_message", "provider_error", "raw_provider_error", "email_body",
  "mail_body", "message_body", "raw_body", "attachment_bytes", "attachment_content",
  "attachment_content_base64", "document_bytes", "content_base64", "storage_pointer",
  "storage_pointer_ref", "storage_path", "object_key", "raw_path", "local_path",
  "stack", "stack_trace", "ProductId", "product_id", "actor_id", "actorId",
  "tenant_id", "tenantId",
]);
const SAFE_RESULT_KEYS = new Set([
  "id", "ref", "receipt_ref", "result_ref", "status", "state", "outcome", "label", "name",
  "matter_id", "email_thread_id", "lead_id", "party_id", "process_id", "task_id", "task_ref",
  "followup_id", "document_id", "document_ref", "filing_id", "filing_ref", "attachment_id",
  "source_email_thread_id", "created_at", "updated_at", "request_id", "safe_error_code",
  "idempotent_replay", "duplicate", "partial", "warning_count",
]);
const SAFE_TEXT_KEYS = new Set(["status", "state", "outcome", "label", "name"]);
const SAFE_BOOLEAN_KEYS = new Set(["idempotent_replay", "duplicate", "partial"]);
const SAFE_NUMBER_KEYS = new Set(["warning_count"]);
const SENSITIVE_MESSAGE_WORDS = new Set([
  "token", "secret", "password", "authorization", "provider", "stack", "trace", "raw",
  "body", "content", "storage", "pointer",
]);
function plainObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
function contractError(message = "OUTLOOK_OPERATION_RESPONSE_INVALID") { return Object.assign(new TypeError(message), { safe_error_code: "OUTLOOK_OPERATION_RESPONSE_INVALID" }); }
function safeRef(value, field) { if (typeof value !== "string") throw contractError(`${field} is invalid`); const text = value.trim(); if (!text || text.length > 256) throw contractError(`${field} is invalid`); for (const character of text) if (!SAFE_REF_CHARS.includes(character)) throw contractError(`${field} is invalid`); return text; }
function safeErrorCode(value) { if (typeof value !== "string" || !value || value.length > 128) throw contractError("safe_error_code is invalid"); for (const character of value) if (!SAFE_ERROR_CHARS.includes(character)) throw contractError("safe_error_code is invalid"); return value; }
function safeBoolean(value, field, fallback = false) {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") throw contractError(`${field} must be boolean`);
  return value;
}

function safeStatus(value) {
  if (!Number.isSafeInteger(value) || value < 100 || value > 599) throw contractError("status is invalid");
  return value;
}
function sessionContext(context) {
  if (!plainObject(context) || !plainObject(context.principal)) throw contractError("server session context is required");
  const principal = context.principal;
  safeRef(principal.tenant_id, "context.principal.tenant_id");
  safeRef(principal.user_id, "context.principal.user_id");
  return principal;
}
function permissionCheck(input) {
  const value = input.permission_check ?? input.permissionCheck ?? input.permission_decision;
  const outcome = typeof value === "string"
    ? value.toLowerCase()
    : plainObject(value) ? String(value.outcome ?? value.effect ?? "").toLowerCase() : "";
  const normalized = outcome === "allowed" ? "allow" : outcome;
  if (!["allow", "denied", "review_required", "changed"].includes(normalized)) throw contractError("permission check outcome is required");
  return Object.freeze({ outcome: normalized });
}
function providerFlags(input) {
  const value = input.provider_flags ?? input.providerFlags;
  if (!plainObject(value)) throw contractError("provider flags are required");
  const flags = {};
  for (const key of ["enabled", "runtime_enabled", "blocked", "disabled", "provider_disabled", "receipt_present", "external_call_executed"]) {
    if (value[key] !== undefined) flags[key] = safeBoolean(value[key], `provider_flags.${key}`);
  }
  flags.enabled ??= false;
  flags.runtime_enabled ??= flags.enabled;
  flags.blocked ??= false;
  flags.disabled ??= false;
  flags.provider_disabled ??= false;
  flags.receipt_present ??= false;
  flags.external_call_executed ??= false;
  return Object.freeze(flags);
}
function providerBlocked(flags) {
  return flags.blocked === true || flags.disabled === true || flags.provider_disabled === true
    || flags.enabled === false || flags.runtime_enabled === false;
}
function auditReceipt(input) {
  const receipt = input.audit_receipt ?? input.auditReceipt;
  if (receipt === undefined || receipt === null) return null;
  if (!plainObject(receipt) || !["server_audit", "audit_service", "server"].includes(receipt.source) || receipt.append_only !== true) throw contractError("typed server audit receipt is required");
  return safeRef(receipt.ref ?? receipt.audit_ref, "audit_receipt.ref");
}

function stateFor({ input, permission, flags, status, replay, duplicate, partial }) {
  const requested = String(input.state ?? input.operation_state ?? input.outcome ?? "").toLowerCase();
  const aliases = Object.freeze({ completed: "complete", success: "complete", succeeded: "complete", allowed: "complete", idempotent_replay: "duplicate", denied: "permission_changed", review_required: "permission_changed", blocked: "failed", error: "failed" });
  let state = STATES.has(requested) ? requested : aliases[requested] ?? (requested ? "failed" : status === 201 ? "created" : status >= 200 && status < 300 ? "complete" : "failed");
  if (providerBlocked(flags)) state = "provider_blocked";
  if (["denied", "review_required", "changed"].includes(permission.outcome)) state = "permission_changed";
  if (replay || duplicate) state = "duplicate";
  if (partial && state !== "duplicate") state = "partial";
  if (status === 403 && !providerBlocked(flags)) state = "permission_changed";
  if (status === 409 && !["provider_blocked", "duplicate", "stale_item"].includes(state)) state = "failed";
  return state;
}

function safeResult(value) {
  if (value === undefined || value === null) return null;
  if (!plainObject(value)) throw contractError("result must be an object");
  const result = {};
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_FIELDS.has(key) || (key.endsWith("_included") && child === true)) throw contractError("unsafe result field");
    if (!SAFE_RESULT_KEYS.has(key)) throw contractError("unsafe result field");
    if (SAFE_BOOLEAN_KEYS.has(key)) {
      if (typeof child !== "boolean") throw contractError("unsafe result value");
      result[key] = child;
    } else if (SAFE_NUMBER_KEYS.has(key)) {
      if (!Number.isSafeInteger(child) || child < 0) throw contractError("unsafe result value");
      result[key] = child;
    } else if (SAFE_TEXT_KEYS.has(key)) {
      if (typeof child !== "string" || child.length > 256) throw contractError("unsafe result value");
      result[key] = child;
    } else if (child !== null) {
      result[key] = safeRef(child, key);
    } else result[key] = null;
  }
  if (Object.keys(result).length === 0) throw contractError("result fields are required");
  return Object.freeze(result);
}

function safeItems(value) {
  if (value === undefined || value === null) return undefined;
  if (!Array.isArray(value) || value.length > 100) throw contractError("items are invalid");
  return Object.freeze(value.map(safeResult));
}

function safeMessage(value) {
  if (typeof value !== "string" || value.length > 256) throw contractError("unsafe message");
  const words = value.toLowerCase().split(/[^a-z0-9]+/u).filter(Boolean);
  if (words.some((word) => SENSITIVE_MESSAGE_WORDS.has(word))) throw contractError("unsafe message");
  if ((words.includes("attachment") || words.includes("bytes")) && !/^(?:attachment\.content_base64 must be valid base64|attachment bytes (?:are required|must not exceed 2 mib)|attachment_id is not present on the filed outlook email|exactly one (?:selected )?attachment is required per request)$/u.test(value.trim().toLowerCase())) throw contractError("unsafe message");
}

function walkEvidence(value, seen, active, budget) {
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "string" || typeof value === "number") return;
  if (typeof value !== "object") throw contractError("OUTLOOK_OPERATION_EVIDENCE_UNSAFE");
  if (active.has(value)) throw contractError("OUTLOOK_OPERATION_EVIDENCE_UNSAFE");
  if (seen.has(value)) return;
  if (budget.count++ >= 1000) throw contractError("OUTLOOK_OPERATION_EVIDENCE_UNSAFE");
  seen.add(value); active.add(value);
  try {
    for (const [key, child] of Object.entries(value)) {
      if (FORBIDDEN_FIELDS.has(key) || (key.endsWith("_included") && child === true) || (key === "production_ready_claim" && child === true)) throw contractError("OUTLOOK_OPERATION_EVIDENCE_UNSAFE");
      if (key === "message") safeMessage(child);
      walkEvidence(child, seen, active, budget);
    }
  } finally {
    active.delete(value);
  }
}
function unwrapTransportEvidence(value) {
  if (!plainObject(value)) return { body: value, envelope: null };
  if (Number.isSafeInteger(value.status) && plainObject(value.body)) {
    const envelope = { ...value };
    delete envelope.body;
    return { body: value.body, envelope };
  }
  if (plainObject(value.response) && Number.isSafeInteger(value.response.status) && plainObject(value.response.body)) {
    const envelope = { ...value };
    delete envelope.response;
    return { body: value.response.body, envelope };
  }
  return { body: value, envelope: null };
}
export function assertOutlookOperationEvidenceSafe(value) {
  const { body, envelope } = unwrapTransportEvidence(value);
  if (!plainObject(body)) throw contractError("OUTLOOK_OPERATION_EVIDENCE_UNSAFE");
  const seen = new WeakSet();
  walkEvidence(body, seen, new WeakSet(), { count: 0 });
  if (envelope) walkEvidence(envelope, seen, new WeakSet(), { count: 0 });
  return true;
}

export function createOutlookOperationResponse(input = {}) {
  if (!plainObject(input)) throw contractError("response input is required");
  for (const field of ["actor_id", "actorId", "tenant_id", "tenantId", "product_id", "productId", "ProductId", "principal", "authenticated_server_principal"]) {
    if (input[field] !== undefined) throw contractError(`${field} is not a server authority`);
  }
  if (input.production_ready_claim === true || input.productionReadyClaim === true) throw contractError("production_ready_claim must be false");
  for (const [field, value] of Object.entries(input)) if (field.endsWith("_included") && value === true) throw contractError("OUTLOOK_OPERATION_EVIDENCE_UNSAFE");
  const evidenceInput = { ...input };
  delete evidenceInput.context;
  delete evidenceInput.verified_context;
  assertOutlookOperationEvidenceSafe(evidenceInput);
  sessionContext(input.context ?? input.verified_context);
  const requestId = safeRef(input.request_id ?? input.requestId, "request_id");
  const status = safeStatus(input.status ?? 200);
  const permission = permissionCheck(input);
  const fingerprint = safeRef(input.idempotency_fingerprint ?? input.idempotencyFingerprint, "idempotency_fingerprint");
  const flags = providerFlags(input);
  const replay = safeBoolean(input.idempotent_replay ?? input.idempotentReplay, "idempotent_replay");
  const duplicate = safeBoolean(input.duplicate, "duplicate");
  const partial = safeBoolean(input.partial, "partial");
  const state = stateFor({ input, permission, flags, status, replay, duplicate, partial });
  const codes = input.safe_error_codes ?? [];
  if (!Array.isArray(codes)) throw contractError("safe_error_codes are invalid");
  const safeCodes = codes.map(safeErrorCode);
  const item = safeResult(input.item ?? input.result ?? input.receipt);
  const items = safeItems(input.items);
  const body = {
    request_id: requestId,
    state,
    outcome: state,
    item,
    ...(items === undefined ? {} : { items }),
    permission_check: permission,
    idempotency_fingerprint: fingerprint,
    idempotent_replay: replay,
    duplicate: duplicate || state === "duplicate",
    partial: partial || state === "partial",
    provider_flags: flags,
    production_ready_claim: false,
    count_leak_prevented: true,
    credential_material_included: false,
    raw_provider_message_included: false,
    email_body_included: false,
    attachment_bytes_included: false,
    storage_pointer_included: false,
    stack_trace_included: false,
    safe_error_codes: Object.freeze(safeCodes),
  };
  const auditRef = auditReceipt(input);
  if (auditRef) {
    body.audit_ref = auditRef;
    body.audit_append_only = true;
  }
  if (state === "complete" && item === null && items === undefined && status >= 200 && status < 300) throw contractError("successful operation result is required");
  assertOutlookOperationEvidenceSafe(body);
  return Object.freeze({ status, body: Object.freeze(body) });
}
