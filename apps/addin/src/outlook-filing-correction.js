const CURRENT_PATH = "/api/outlook/email/corrections/current";
const CORRECTION_PATH = "/api/outlook/email/corrections";
const SHA256 = /^[a-f0-9]{64}$/u;
const SAFE_REF = /^[A-Za-z0-9._:-]{1,256}$/u;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const MAX_REASON = 500;
const PLACEMENT_FIELDS = ["placement_id", "correction_id", "event_kind", "email_thread_id", "original_receipt_id", "matter_id", "document_id", "mime_sha256", "occurred_at", "status", "copied_mime"];
const TIMELINE_FIELDS = ["event_id", "matter_id", "type", "correction_id", "reference_id", "document_id", "document_version_id", "mime_sha256", "copied_mime"];
const FORBIDDEN = new Set(["actor_id", "actorId", "tenant_id", "tenantId", "audit_hint_ref", "audit_hint", "raw_mime", "mime", "mime_bytes", "raw_body", "email_body", "document_bytes", "attachment_bytes", "storage_pointer", "storage_pointer_ref", "storage_path", "object_key", "object_id", "permission_count", "permission_counts", "denied_count"]);
const EVENT_KINDS = new Set(["original", "correction"]);
const STATUSES = new Set(["original", "applied"]);
const TIMELINE_TYPES = new Set(["outlook.email.filing.corrected_from", "outlook.email.filing.corrected_to"]);
const REQUEST_DESCRIPTORS = new WeakSet();

function fail(message, code = "API_RESPONSE_INVALID") { return Object.assign(new TypeError(message), { safe_error_code: code }); }

function object(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }

function text(value, field, max = 256) {
  if (typeof value !== "string") throw fail(field + " is required", "OUTLOOK_EMAIL_CORRECTION_INVALID");
  const normalized = value.trim();
  if (!normalized || normalized !== value || normalized.length > max || /[\u0000-\u001f\u007f]/u.test(normalized)) throw fail(field + " is invalid", "OUTLOOK_EMAIL_CORRECTION_INVALID");
  return normalized;
}

function ref(value, field) { const normalized = text(value, field); if (!SAFE_REF.test(normalized)) throw fail(field + " is unsafe"); return normalized; }

function correctionReason(value) {
  if (typeof value !== "string") throw fail("reason is required", "OUTLOOK_EMAIL_CORRECTION_INVALID");
  const normalized = value.trim();
  if (!normalized || normalized.length > MAX_REASON || /[\r\n]/u.test(normalized)) throw fail("reason must be one line with at most 500 characters", "OUTLOOK_EMAIL_CORRECTION_INVALID");
  return normalized;
}

function exact(value, fields, label) { if (!object(value) || Object.keys(value).length !== fields.length || fields.some((field) => !Object.hasOwn(value, field))) throw fail(label + " fields are incomplete or unsafe"); }

function contextKey(value) { if (typeof value !== "string" || !value || value.trim() !== value || value.length > 2048 || /[\u0000-\u001d\u007f]/u.test(value)) throw fail("item_context_key is invalid", "OUTLOOK_EMAIL_CORRECTION_INVALID"); return value; }
function sessionGeneration(value) { if (!Number.isSafeInteger(value) || value < 0) throw fail("session_generation is invalid", "OUTLOOK_EMAIL_CORRECTION_INVALID"); return value; }
function operationContext(value, label = "operation context") { exact(value, ["item_context_key", "session_generation"], label); return Object.freeze({ item_context_key: contextKey(value.item_context_key), session_generation: sessionGeneration(value.session_generation) }); }

function scan(value, seen = new WeakSet()) {
  if (!value || typeof value !== "object") return;
  if (seen.has(value)) throw fail("response evidence is cyclic");
  seen.add(value);
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN.has(key) || (key.endsWith("_included") && child === true)) throw fail("response evidence is unsafe"); scan(child, seen);
  }
}

function parts(value) {
  if (!object(value)) throw fail("response is required");
  const wrapped = object(value.body);
  if (wrapped && Object.keys(value).some((key) => !["body", "status"].includes(key))) throw fail("response envelope is unsafe");
  const body = wrapped ? value.body : value;
  scan(value); return { body, status: wrapped ? value.status : undefined };
}

function placement(value) {
  exact(value, PLACEMENT_FIELDS, "placement");
  const result = Object.freeze({ placement_id: ref(value.placement_id, "placement_id"), correction_id: ref(value.correction_id, "correction_id"), event_kind: value.event_kind, email_thread_id: ref(value.email_thread_id, "email_thread_id"), original_receipt_id: ref(value.original_receipt_id, "original_receipt_id"), matter_id: ref(value.matter_id, "matter_id"), document_id: ref(value.document_id, "document_id"), mime_sha256: value.mime_sha256, occurred_at: ref(value.occurred_at, "occurred_at"), status: value.status, copied_mime: value.copied_mime });
  if (!EVENT_KINDS.has(result.event_kind) || !STATUSES.has(result.status)
    || !SHA256.test(result.mime_sha256) || result.copied_mime !== false
    || !ISO_UTC.test(result.occurred_at) || !Number.isFinite(Date.parse(result.occurred_at))
    || new Date(result.occurred_at).toISOString() !== result.occurred_at
    || (result.event_kind === "original" && result.status !== "original") || (result.event_kind === "correction" && result.status !== "applied")) throw fail("placement is incomplete or mismatched");
  return result;
}

function successBody(body, required) {
  const allowed = new Set(["request_id", "outcome", "item", "safe_error_codes", "count_leak_prevented", "production_ready_claim"]);
  if (required.includes("timeline_events")) for (const field of ["timeline_events", "idempotency_fingerprint", "idempotent_replay", "request_binding", "audit_event_id"]) allowed.add(field);
  if (!object(body) || Object.keys(body).some((key) => !allowed.has(key))) throw fail("response fields are unsafe");
  for (const field of required) if (!Object.hasOwn(body, field)) throw fail("response " + field + " is required");
  if (!Array.isArray(body.safe_error_codes) || body.safe_error_codes.length > 0 || body.count_leak_prevented !== true || body.production_ready_claim !== false) throw fail("successful response guards are missing"); return body;
}

function requestIdentity(value) {
  const fields = ["document_id", "email_thread_id", "expected_placement_id", "idempotency_key", "mime_sha256", "original_receipt_id", "reason", "source_matter_id", "target_matter_id"];
  exact(value, fields, "correction request");
  const result = { document_id: ref(value.document_id, "document_id"), email_thread_id: ref(value.email_thread_id, "email_thread_id"), expected_placement_id: ref(value.expected_placement_id, "expected_placement_id"), idempotency_key: ref(value.idempotency_key, "idempotency_key"), mime_sha256: value.mime_sha256, original_receipt_id: ref(value.original_receipt_id, "original_receipt_id"), reason: correctionReason(value.reason), source_matter_id: ref(value.source_matter_id, "source_matter_id"), target_matter_id: ref(value.target_matter_id, "target_matter_id") };
  if (!SHA256.test(result.mime_sha256) || result.source_matter_id === result.target_matter_id) throw fail("correction request identity is invalid", "OUTLOOK_EMAIL_CORRECTION_INVALID");
  return result;
}

function requestBinding(value) {
  const fields = ["email_thread_id", "original_receipt_id", "document_id", "mime_sha256", "source_matter_id", "target_matter_id", "expected_placement_id", "reason_sha256", "idempotency_key"];
  exact(value, fields, "request binding");
  const result = Object.freeze({ email_thread_id: ref(value.email_thread_id, "binding.email_thread_id"), original_receipt_id: ref(value.original_receipt_id, "binding.original_receipt_id"), document_id: ref(value.document_id, "binding.document_id"), mime_sha256: value.mime_sha256, source_matter_id: ref(value.source_matter_id, "binding.source_matter_id"), target_matter_id: ref(value.target_matter_id, "binding.target_matter_id"), expected_placement_id: ref(value.expected_placement_id, "binding.expected_placement_id"), reason_sha256: value.reason_sha256, idempotency_key: ref(value.idempotency_key, "binding.idempotency_key") });
  if (!SHA256.test(result.mime_sha256) || !SHA256.test(result.reason_sha256) || !/^outlook-email-correction:[a-f0-9]{64}$/u.test(result.idempotency_key) || result.source_matter_id === result.target_matter_id) throw fail("request binding is invalid", "OUTLOOK_EMAIL_CORRECTION_INVALID");
  return result;
}

function requestDescriptor(value) {
  if (!object(value) || !REQUEST_DESCRIPTORS.has(value)) throw fail("request descriptor provenance is required", "OUTLOOK_EMAIL_CORRECTION_INVALID");
  exact(value, ["path", "method", "body", "operation_context", "request_binding"], "request descriptor");
  if (value.path !== CORRECTION_PATH || value.method !== "POST") throw fail("request descriptor is invalid", "OUTLOOK_EMAIL_CORRECTION_INVALID");
  const body = requestIdentity(value.body); operationContext(value.operation_context); const binding = requestBinding(value.request_binding);
  for (const field of ["email_thread_id", "original_receipt_id", "document_id", "mime_sha256", "source_matter_id", "target_matter_id", "idempotency_key"]) if (binding[field] !== body[field]) throw fail("request binding identity is mismatched");
  if (binding.expected_placement_id !== body.expected_placement_id) throw fail("request binding prior placement is mismatched");
  return value;
}

async function digest(value, cryptoImpl) {
  if (typeof cryptoImpl?.subtle?.digest !== "function" || typeof globalThis.TextEncoder !== "function") throw fail("WebCrypto is unavailable", "OUTLOOK_OPERATION_KEY_UNAVAILABLE");
  const bytes = await cryptoImpl.subtle.digest("SHA-256", new TextEncoder().encode(value));
  const digestBytes = new Uint8Array(bytes); if (digestBytes.length !== 32) throw fail("WebCrypto returned an invalid digest", "OUTLOOK_OPERATION_KEY_UNAVAILABLE");
  return [...digestBytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function createOutlookFilingCorrectionCurrentRequest({ email_thread_id } = {}) {
  const thread = text(email_thread_id, "email_thread_id");
  return Object.freeze({
    path: CURRENT_PATH + "?email_thread_id=" + encodeURIComponent(thread),
    method: "GET",
  });
}

export function parseOutlookFilingCorrectionCurrentResponse(response, expected) {
  const { body, status } = parts(response);
  successBody(body, ["request_id", "outcome", "item"]);
  if ((status !== undefined && status !== 200) || body.outcome !== "passed") throw fail("current placement response is mismatched");
  ref(body.request_id, "request_id");
  if (!object(expected) || expected.email_thread_id === undefined) throw fail("current placement request identity is required", "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT");
  const expectedThread = text(expected.email_thread_id, "email_thread_id");
  const current = placement(body.item);
  if (current.email_thread_id !== expectedThread) throw fail("current placement thread is mismatched");
  for (const [field, value] of [["placement_id", expected.expected_placement_id], ["original_receipt_id", expected.original_receipt_id], ["document_id", expected.document_id], ["mime_sha256", expected.mime_sha256]]) {
    if (value !== undefined && current[field] !== value) throw fail("current placement identity is mismatched");
  }
  if (expected.source_matter_id !== undefined && current.matter_id !== text(expected.source_matter_id, "source_matter_id")) {
    throw fail("current placement Matter is mismatched");
  }
  return current;
}

export async function createOutlookFilingCorrectionIdempotencyKey({
  item_context_key, email_thread_id, original_receipt_id, document_id, mime_sha256,
  source_matter_id, current_placement_id, target_matter_id, reason: rawReason,
  cryptoImpl = globalThis.crypto,
} = {}) {
  const intent = {
    item_context_key: contextKey(item_context_key),
    email_thread_id: text(email_thread_id, "email_thread_id"),
    original_receipt_id: text(original_receipt_id, "original_receipt_id"),
    document_id: text(document_id, "document_id"),
    mime_sha256: text(mime_sha256, "mime_sha256"),
    source_matter_id: text(source_matter_id, "source_matter_id"),
    current_placement_id: text(current_placement_id, "current_placement_id"),
    target_matter_id: text(target_matter_id, "target_matter_id"),
    reason: correctionReason(rawReason),
  };
  if (!SHA256.test(intent.mime_sha256) || intent.source_matter_id === intent.target_matter_id) throw fail("idempotency intent is invalid", "OUTLOOK_EMAIL_CORRECTION_INVALID");
  return "outlook-email-correction:" + await digest(JSON.stringify(intent), cryptoImpl);
}

export async function createOutlookFilingCorrectionRequest({
  item_context_key, session_generation, email_thread_id, current_placement, target_matter_id, reason: rawReason, cryptoImpl = globalThis.crypto,
} = {}) {
  const operation_context = operationContext({ item_context_key, session_generation }); const selectedThread = text(email_thread_id, "email_thread_id"); const current = placement(current_placement);
  if (current.email_thread_id !== selectedThread) throw fail("selected thread and current placement differ", "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT");
  const target = ref(target_matter_id, "target_matter_id");
  if (current.matter_id === target) throw fail("source and target Matter must differ", "OUTLOOK_EMAIL_CORRECTION_SAME_MATTER");
  const normalizedReason = correctionReason(rawReason);
  const idempotencyKey = await createOutlookFilingCorrectionIdempotencyKey({ item_context_key: operation_context.item_context_key, email_thread_id: selectedThread, original_receipt_id: current.original_receipt_id, document_id: current.document_id, mime_sha256: current.mime_sha256, source_matter_id: current.matter_id, current_placement_id: current.placement_id, target_matter_id: target, reason: normalizedReason, cryptoImpl });
  const request_binding = requestBinding({ email_thread_id: selectedThread, original_receipt_id: current.original_receipt_id, document_id: current.document_id, mime_sha256: current.mime_sha256, source_matter_id: current.matter_id, target_matter_id: target, expected_placement_id: current.placement_id, reason_sha256: await digest(normalizedReason, cryptoImpl), idempotency_key: idempotencyKey });
  const descriptor = Object.freeze({
    path: CORRECTION_PATH,
    method: "POST",
    body: Object.freeze({ email_thread_id: selectedThread, original_receipt_id: current.original_receipt_id, document_id: current.document_id, mime_sha256: current.mime_sha256, source_matter_id: current.matter_id, target_matter_id: target, expected_placement_id: current.placement_id, reason: normalizedReason, idempotency_key: idempotencyKey }),
    operation_context,
    request_binding,
  });
  REQUEST_DESCRIPTORS.add(descriptor); return descriptor;
}

export function parseOutlookFilingCorrectionResponse(response, options = {}) {
  exact(options, ["request", "current"], "correction parser options");
  const { body, status } = parts(response);
  const descriptor = requestDescriptor(options.request);
  const identity = requestIdentity(descriptor.body);
  const currentContext = operationContext(options.current, "current operation context");
  successBody(body, ["request_id", "outcome", "item", "timeline_events", "request_binding"]);
  const replay = body.outcome === "idempotent_replay";
  if ((status !== undefined && status !== (replay ? 200 : 201)) || (!replay && body.outcome !== "created")) throw fail("correction response status or outcome is mismatched");
  if (body.idempotent_replay !== undefined && body.idempotent_replay !== replay) throw fail("replay marker is mismatched");
  const current = placement(body.item);
  const responseBinding = requestBinding(body.request_binding);
  for (const field of ["email_thread_id", "original_receipt_id", "document_id", "mime_sha256", "source_matter_id", "target_matter_id", "expected_placement_id", "reason_sha256", "idempotency_key"]) if (responseBinding[field] !== descriptor.request_binding[field]) throw fail("response request binding is mismatched");
  if (current.event_kind !== "correction" || current.matter_id !== identity.target_matter_id
    || current.email_thread_id !== identity.email_thread_id || current.original_receipt_id !== identity.original_receipt_id
    || current.document_id !== identity.document_id || current.mime_sha256 !== identity.mime_sha256
    || current.placement_id === identity.expected_placement_id
    || !SHA256.test(body.idempotency_fingerprint)) throw fail("correction response identity is mismatched");
  if (!Array.isArray(body.timeline_events) || body.timeline_events.length !== 2) throw fail("correction timeline is incomplete");
  const timelines = body.timeline_events.map((entry) => {
    exact(entry, TIMELINE_FIELDS, "timeline");
    const result = Object.freeze({
      event_id: ref(entry.event_id, "timeline.event_id"),
      matter_id: ref(entry.matter_id, "timeline.matter_id"),
      type: entry.type,
      correction_id: ref(entry.correction_id, "timeline.correction_id"),
      reference_id: ref(entry.reference_id, "timeline.reference_id"),
      document_id: ref(entry.document_id, "timeline.document_id"),
      document_version_id: ref(entry.document_version_id, "timeline.document_version_id"),
      mime_sha256: entry.mime_sha256,
      copied_mime: entry.copied_mime,
    });
    if (!TIMELINE_TYPES.has(result.type) || result.correction_id !== current.correction_id
      || result.document_id !== identity.document_id || result.mime_sha256 !== identity.mime_sha256
      || !SHA256.test(result.mime_sha256) || result.copied_mime !== false
      || result.reference_id !== "email-filing-placement-reference:" + current.placement_id) throw fail("timeline identity is mismatched");
    return result;
  });
  const source = timelines.find((entry) => entry.matter_id === identity.source_matter_id && entry.type.endsWith("corrected_from"));
  const target = timelines.find((entry) => entry.matter_id === identity.target_matter_id && entry.type.endsWith("corrected_to"));
  if (!source || !target || source === target || new Set(timelines.map((entry) => entry.event_id)).size !== 2
    || new Set(timelines.map((entry) => entry.document_version_id)).size !== 1) throw fail("timeline Matter references are incomplete");
  return Object.freeze({
    request_id: ref(body.request_id, "request_id"),
    outcome: body.outcome,
    idempotent_replay: replay,
    current,
    timeline_events: Object.freeze(timelines),
    idempotency_fingerprint: body.idempotency_fingerprint,
    operation_context: descriptor.operation_context,
    apply_to_current_view: currentContext.item_context_key === descriptor.operation_context.item_context_key
      && currentContext.session_generation === descriptor.operation_context.session_generation,
  });
}

export function mapOutlookFilingCorrectionError(error = {}) {
  const input = object(error) ? error : {};
  const payload = object(input.payload) ? input.payload : {};
  const supplied = payload.safe_error_code ?? payload.safe_error_codes?.[0] ?? input.safe_error_code ?? input.safe_error_codes?.[0];
  const known = new Set([
    "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED", "EMAIL_FILING_CORRECTION_STALE_PLACEMENT",
    "EMAIL_FILING_CORRECTION_IDEMPOTENCY_CONFLICT", "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT",
    "EMAIL_FILING_CORRECTION_ORIGINAL_NOT_FOUND", "EMAIL_FILING_CORRECTION_ORIGINAL_CONFLICT",
    "OUTLOOK_EMAIL_CORRECTION_INVALID", "ADDIN_API_REQUEST_TIMEOUT", "OUTLOOK_NETWORK_OFFLINE", "OUTLOOK_OFFLINE", "NETWORK_ERROR", "ERR_NETWORK", "ECONNRESET", "ETIMEDOUT",
    "AUTH_SESSION_REQUIRED", "AUTH_SESSION_INVALID", "M365_SCOPE_INSUFFICIENT",
  ]);
  const code = known.has(supplied) ? supplied : input.status === 403 ? "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED" : input.status === 0 ? "OUTLOOK_NETWORK_OFFLINE" : "OUTLOOK_EMAIL_CORRECTION_FAILED";
  const values = code === "OUTLOOK_EMAIL_CORRECTION_PERMISSION_DENIED"
    ? ["permission_changed", "refresh_permission", false]
    : code === "EMAIL_FILING_CORRECTION_STALE_PLACEMENT" || code === "OUTLOOK_EMAIL_CORRECTION_IDENTITY_CONFLICT" || code.endsWith("ORIGINAL_NOT_FOUND") || code.endsWith("ORIGINAL_CONFLICT")
      ? ["stale_item", "reload_current_placement", true]
      : code === "EMAIL_FILING_CORRECTION_IDEMPOTENCY_CONFLICT"
        ? ["duplicate", "show_existing_result", false]
        : ["ADDIN_API_REQUEST_TIMEOUT", "OUTLOOK_NETWORK_OFFLINE", "OUTLOOK_OFFLINE", "NETWORK_ERROR", "ERR_NETWORK", "ECONNRESET", "ETIMEDOUT"].includes(code)
          ? ["offline", "retry_when_online", true]
          : ["AUTH_SESSION_REQUIRED", "AUTH_SESSION_INVALID", "M365_SCOPE_INSUFFICIENT"].includes(code) ? ["reconnect_required", "reconnect_outlook", false] : ["failed", "retry_safely", false];
  const requestId = typeof (payload.request_id ?? input.request_id) === "string" && SAFE_REF.test(payload.request_id ?? input.request_id) ? payload.request_id ?? input.request_id : null;
  return Object.freeze({
    state: values[0],
    safe_error_code: code,
    request_id: requestId,
    recovery: Object.freeze({
      action: values[1],
      retryable: values[2],
      preserve_request_id: true,
      preserve_idempotency: true,
    }),
  });
}
