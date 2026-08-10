export const OUTLOOK_OPERATION_STATES = Object.freeze({ idle: "idle", working: "working", created: "created", complete: "complete", duplicate: "duplicate", partial: "partial", permissionChanged: "permission_changed", staleItem: "stale_item", offline: "offline", reconnectRequired: "reconnect_required", providerBlocked: "provider_blocked", failed: "failed" });
const STATES = new Set(Object.values(OUTLOOK_OPERATION_STATES));
const SAFE_REF_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789._:-";
const UNSAFE_RESPONSE_KEYS = new Set(["access_token", "refresh_token", "oauth_token", "id_token", "token", "secret", "password", "authorization", "permission_count", "permission_counts", "count_permissions", "provider_message", "raw_provider_message", "provider_error", "raw_provider_error", "provider_payload", "body", "email_body", "mail_body", "message_body", "raw_body", "attachment_bytes", "attachment_content", "attachment_content_base64", "document_bytes", "content_base64", "storage_pointer", "storage_pointer_ref", "storage_path", "object_key", "raw_path", "local_path", "stack", "stack_trace", "ProductId", "product_id", "actor_id", "actorId", "tenant_id", "tenantId"]);
const group = (state, action, retryable, codes) => Object.fromEntries(codes.map((code) => [code, Object.freeze({ state, action, retryable })]));
const ERROR_MAP = Object.freeze({
  ...group("stale_item", "reload_item", true, ["OUTLOOK_ITEM_CHANGED_DURING_ACTION", "OUTLOOK_ACTION_CONTEXT_CHANGED", "OUTLOOK_FILED_EMAIL_MISMATCH", "OUTLOOK_ADDIN_EMAIL_IDENTITY_CONFLICT", "OUTLOOK_ADDIN_ATTACHMENT_PROVENANCE_MISMATCH", "OUTLOOK_ADDIN_SENT_MESSAGE_PROVENANCE_MISMATCH", "OUTLOOK_ITEM_IDENTITY_REQUIRED"]),
  ...group("offline", "retry_when_online", true, ["ADDIN_API_REQUEST_TIMEOUT", "OUTLOOK_NETWORK_OFFLINE", "OUTLOOK_OFFLINE", "NETWORK_ERROR", "ERR_NETWORK", "ECONNRESET", "ETIMEDOUT"]),
  ...group("reconnect_required", "reconnect_outlook", false, ["AUTH_SESSION_REQUIRED", "AUTH_SESSION_INVALID", "M365_CONNECTION_NOT_FOUND", "M365_SCOPE_INSUFFICIENT", "M365_CONNECTION_DISCONNECT_NOT_CONFIRMED", "M365_CONNECTION_CREDENTIAL_CLEANUP_PENDING", "OUTLOOK_AUTHORIZATION_RESTART_REQUIRED", "OUTLOOK_REAUTHORIZATION_REQUIRED"]),
  ...group("permission_changed", "refresh_permission", false, ["OUTLOOK_ADDIN_PERMISSION_DENIED", "OUTLOOK_ADDIN_REVIEW_REQUIRED", "M365_CONNECTION_TENANT_MISMATCH"]),
  ...group("duplicate", "show_existing_result", false, ["OUTLOOK_INQUIRY_IDEMPOTENCY_CONFLICT", "OUTLOOK_IDEMPOTENCY_CONFLICT", "OUTLOOK_OPERATION_DUPLICATE"]),
  ...group("provider_blocked", "contact_admin", false, ["M365_GRAPH_FEATURE_DISABLED", "M365_PROVIDER_RUNTIME_DISABLED", "M365_EXTERNAL_READINESS_BLOCKED", "M365_PROVIDER_RESPONSE_INVALID", "M365_PROVIDER_UNAVAILABLE", "OUTLOOK_OAUTH_PROVIDER_ERROR", "OUTLOOK_INQUIRY_RUNTIME_UNAVAILABLE"]),
});
const VISIBLE_COPY = Object.freeze({ idle: "대기 중입니다.", working: "처리 중입니다.", created: "생성했습니다.", complete: "처리했습니다.", duplicate: "이미 처리된 요청입니다. 기존 결과를 확인해 주세요.", partial: "일부만 처리되었습니다. 결과를 확인해 주세요.", permission_changed: "권한을 확인한 뒤 다시 시도해 주세요.", stale_item: "항목이 변경되었습니다. 다시 불러와 주세요.", offline: "네트워크 연결을 확인한 뒤 다시 시도해 주세요.", reconnect_required: "Outlook 연결을 다시 설정해 주세요.", provider_blocked: "관리자에게 Outlook 연결 설정을 확인해 달라고 요청해 주세요.", failed: "처리하지 못했습니다. 잠시 후 다시 시도해 주세요." });
const RECOVERY_COPY = Object.freeze({ idle: "요청을 시작하면 작업 상태를 표시합니다.", working: "현재 요청을 취소하지 말고 완료 또는 실패 상태를 기다립니다.", created: "생성된 결과를 열어 서버 영수증과 요청 ID를 확인합니다.", complete: "서버 결과를 확인하고 같은 중복 방지 키로 중복 제출하지 않습니다.", duplicate: "기존 서버 결과를 요청 ID와 중복 방지 지문으로 조회합니다.", partial: "완료된 항목과 미처리 항목을 확인한 뒤 필요한 부분만 재시도합니다.", permission_changed: "현재 서버 세션의 권한을 새로 확인하고 허용된 범위만 다시 요청합니다.", stale_item: "현재 Outlook 항목을 다시 읽어 새 식별자로 작업을 재시도합니다.", offline: "연결이 복구된 뒤 동일한 요청 ID와 중복 방지 키를 보존해 재시도합니다.", reconnect_required: "서버 세션과 Outlook 연결을 다시 설정한 뒤 작업을 재시도합니다.", provider_blocked: "관리자가 제공자 기능과 운영 준비 상태를 확인할 때까지 작업을 중단합니다.", failed: "안전한 오류 코드만 기록하고 원문 메시지·토큰·본문을 표시하지 않은 채 요청 ID로 지원팀에 문의합니다." });
const OUTCOME_TO_STATE = Object.freeze({ idle: "idle", working: "working", created: "created", create: "created", complete: "complete", completed: "complete", success: "complete", succeeded: "complete", passed: "complete", updated: "complete", duplicate: "duplicate", idempotent_replay: "duplicate", partial: "partial", permission_changed: "permission_changed", denied: "permission_changed", review_required: "permission_changed", stale_item: "stale_item", offline: "offline", reconnect_required: "reconnect_required", provider_blocked: "provider_blocked", failed: "failed", blocked: "failed", error: "failed" });
const plainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const safeRef = (value) => { if (typeof value !== "string") return null; const text = value.trim(); return text && text.length <= 200 && [...text].every((character) => SAFE_REF_CHARS.includes(character)) ? text : null; };
const safeState = (value) => typeof value === "string" && STATES.has(value) ? value : null;
const safeStatus = (value) => Number.isSafeInteger(value) && value >= 100 && value <= 599 ? value : null;
const safeBoolean = (value) => typeof value === "boolean" ? value : null;
function operationName(value) { const operation = safeRef(typeof value === "string" ? value : plainObject(value) ? value.operation : null); if (!operation) throw new TypeError("operation is required"); return operation; }
function metadata(source) {
  const input = plainObject(source) ? source : {}, result = {};
  let invalid = false;
  for (const [field, candidate] of [["request_id", input.request_id ?? input.requestId], ["idempotency_key", input.idempotency_key ?? input.idempotencyKey], ["idempotency_fingerprint", input.idempotency_fingerprint ?? input.idempotencyFingerprint], ["audit_ref", input.audit_ref ?? input.auditRef]]) {
    if (candidate === undefined || candidate === null) continue;
    const value = safeRef(candidate); if (!value) invalid = true; else result[field] = value;
  }
  const permission = input.permission_check ?? input.permissionCheck ?? input.permission_decision;
  if (permission !== undefined && permission !== null) {
    const value = typeof permission === "string" ? permission.toLowerCase() : plainObject(permission) ? String(permission.outcome ?? permission.effect ?? "").toLowerCase() : "";
    const normalized = value === "allowed" ? "allow" : value;
    if (!["allow", "denied", "review_required", "changed"].includes(normalized)) invalid = true; else result.permission_check = { outcome: normalized };
  }
  const provider = input.provider_flags ?? input.providerFlags;
  if (provider !== undefined && provider !== null) {
    if (!plainObject(provider)) invalid = true;
    else {
      const flags = {};
      for (const key of ["enabled", "runtime_enabled", "blocked", "disabled", "provider_disabled", "receipt_present", "external_call_executed"]) {
        if (provider[key] !== undefined) { const value = safeBoolean(provider[key]); if (value === null) invalid = true; else flags[key] = value; }
      }
      result.provider_flags = flags;
    }
  }
  for (const key of Object.keys(input)) if (key.endsWith("_included") && input[key] === true) invalid = true;
  return { ...result, invalid };
}
function hasUnsafeResponseEvidence(value, seen = new WeakSet(), active = new WeakSet(), budget = { count: 0 }) {
  if (value === null || value === undefined || ["boolean", "string", "number"].includes(typeof value)) return false;
  if (typeof value !== "object") return true;
  if (active.has(value)) return true;
  if (seen.has(value) || budget.count++ >= 1000) return budget.count > 1000;
  seen.add(value); active.add(value);
  const unsafe = Object.entries(value).some(([key, child]) => UNSAFE_RESPONSE_KEYS.has(key) || (key.endsWith("_included") && child === true) || (key === "production_ready_claim" && child === true) || hasUnsafeResponseEvidence(child, seen, active, budget));
  active.delete(value);
  return unsafe;
}
const providerBlocked = (flags) => flags?.blocked === true || flags?.disabled === true || flags?.provider_disabled === true || flags?.enabled === false || flags?.runtime_enabled === false;
const record = (operation) => ({ operation, state: "idle", request_id: null, idempotency_key: null, idempotency_fingerprint: null, idempotent_replay: false, duplicate: false, partial: false, permission_check: null, audit_ref: null, provider_flags: {}, production_ready_claim: false, safe_error_code: null, visible_action: null, recovery: null });
const freezeState = (value) => Object.freeze({ ...value, provider_flags: Object.freeze({ ...(value.provider_flags ?? {}) }), permission_check: value.permission_check ? Object.freeze({ ...value.permission_check }) : null, recovery: value.recovery ? Object.freeze({ ...value.recovery }) : null });
function merge(current, incoming) {
  const next = { ...current }, value = metadata(incoming);
  for (const field of ["request_id", "idempotency_key", "idempotency_fingerprint", "audit_ref", "permission_check", "provider_flags"]) if (value[field] !== undefined) next[field] = value[field];
  if (incoming.idempotent_replay === true) next.idempotent_replay = true;
  if (incoming.duplicate === true) next.duplicate = true;
  if (incoming.partial === true) next.partial = true;
  return next;
}
function mapError(error = {}) {
  const source = plainObject(error) ? error : {}, suppliedCode = source.safe_error_code ?? source.code, mapped = typeof suppliedCode === "string" ? ERROR_MAP[suppliedCode] : undefined, value = metadata(source);
  let state = mapped?.state ?? "failed";
  if (source.status === 403 && state === "failed") state = "permission_changed";
  if (source.status === 0 && state === "failed") state = "offline";
  if (value.provider_flags && providerBlocked(value.provider_flags)) state = "provider_blocked";
  if (["denied", "review_required", "changed"].includes(value.permission_check?.outcome)) state = "permission_changed";
  if (source.idempotent_replay === true || source.duplicate === true) state = "duplicate";
  if (source.partial === true && state !== "duplicate") state = "partial";
  if (source.status === 403 && !providerBlocked(value.provider_flags)) state = "permission_changed";
  if (value.invalid) state = "failed";
  const action = mapped?.action ?? ({ duplicate: "show_existing_result", partial: "review_partial_result", permission_changed: "refresh_permission", provider_blocked: "contact_admin", offline: "retry_when_online", reconnect_required: "reconnect_outlook", stale_item: "reload_item" }[state] ?? "retry_safely");
  return { state, safe_error_code: mapped ? suppliedCode : "OUTLOOK_OPERATION_FAILED", status: safeStatus(source.status), request_id: safeRef(source.request_id ?? source.requestId), idempotency_key: safeRef(source.idempotency_key ?? source.idempotencyKey), idempotency_fingerprint: safeRef(source.idempotency_fingerprint ?? source.idempotencyFingerprint), audit_ref: safeRef(source.audit_ref ?? source.auditRef), idempotent_replay: source.idempotent_replay === true, duplicate: source.duplicate === true || state === "duplicate", partial: source.partial === true || state === "partial", visible_action: VISIBLE_COPY[state], recovery: { action, retryable: mapped?.retryable ?? ["stale_item", "offline", "failed"].includes(state), preserve_request_id: true, preserve_idempotency: true, hidden_message: RECOVERY_COPY[state] }, provider_flags: value.provider_flags ?? {}, permission_check: value.permission_check ?? null };
}
function responseParts(source) {
  const response = plainObject(source.response) ? source.response : source, wrapped = plainObject(response.body) && (response !== source || safeStatus(response.status) !== null), payload = plainObject(response.payload) && (response !== source || safeStatus(response.status) !== null);
  const body = wrapped ? response.body : payload ? response.payload : response, envelope = { ...source };
  delete envelope.response; delete envelope.payload; if (response === source && (wrapped || payload)) delete envelope.body;
  return { response, body, envelope };
}
const stateFrom = (source) => { const value = source.state ?? source.operation_state ?? source.outcome; return typeof value === "string" ? safeState(value) ?? OUTCOME_TO_STATE[value.toLowerCase()] ?? "failed" : null; };
export function createOutlookOperationState(operation) { return freezeState(record(operationName(operation))); }
export function normalizeOutlookOperationError(error = {}) { return Object.freeze(mapError(error)); }
export function transitionOutlookOperationState(current, input = {}) {
  if (!plainObject(current) || !safeState(current.state)) throw new TypeError("current Outlook operation state is required");
  const operation = operationName(current.operation); if (metadata(current).invalid) throw new TypeError("current Outlook operation state is unsafe");
  const source = plainObject(input) ? input : {}, { response, body, envelope } = responseParts(source), status = safeStatus(response.status ?? body.status), leak = hasUnsafeResponseEvidence(body) || hasUnsafeResponseEvidence(envelope);
  const error = source.error ?? (status !== null && status >= 400 ? { ...body, status, safe_error_code: body.safe_error_code ?? (Array.isArray(body.safe_error_codes) ? body.safe_error_codes[0] : undefined) } : null);
  if (error || leak) {
    const failure = mapError(error ?? { safe_error_code: "OUTLOOK_OPERATION_FAILED" }), mergedFailure = merge({ ...record(operation), ...current }, failure), preserved = Object.fromEntries(["request_id", "idempotency_key", "idempotency_fingerprint", "audit_ref", "permission_check"].map((field) => [field, failure[field] ?? mergedFailure[field]]));
    return freezeState({ ...mergedFailure, ...failure, ...preserved, provider_flags: Object.keys(failure.provider_flags ?? {}).length ? failure.provider_flags : mergedFailure.provider_flags, production_ready_claim: false });
  }
  const merged = merge({ ...record(operation), ...current }, { ...body, ...source }), incoming = metadata({ ...body, ...source });
  let state = stateFrom({ ...body, ...source });
  if (incoming.invalid) state = "failed";
  if (providerBlocked(merged.provider_flags)) state = "provider_blocked";
  if (["denied", "review_required", "changed"].includes(merged.permission_check?.outcome)) state = "permission_changed";
  if (merged.idempotent_replay || merged.duplicate) state = "duplicate";
  if (merged.partial && state !== "duplicate") state = "partial";
  if (!state) state = status !== null && status >= 200 && status < 300 ? "complete" : "failed";
  if (status === 403 && !providerBlocked(merged.provider_flags)) state = "permission_changed";
  if (status === 409 && !["provider_blocked", "duplicate", "stale_item"].includes(state)) state = "failed";
  const recovery = ["idle", "working", "created", "complete"].includes(state) ? null : { action: state === "duplicate" ? "show_existing_result" : state === "partial" ? "review_partial_result" : state === "permission_changed" ? "refresh_permission" : state === "stale_item" ? "reload_item" : state === "offline" ? "retry_when_online" : state === "reconnect_required" ? "reconnect_outlook" : state === "provider_blocked" ? "contact_admin" : "retry_safely", retryable: ["stale_item", "offline", "failed"].includes(state), preserve_request_id: true, preserve_idempotency: true, hidden_message: RECOVERY_COPY[state] };
  return freezeState({ ...merged, state, duplicate: merged.duplicate || state === "duplicate", partial: merged.partial || state === "partial", production_ready_claim: false, visible_action: ["idle", "working", "created", "complete"].includes(state) ? null : VISIBLE_COPY[state], recovery });
}
