export const HRX_PROVIDER_RECEIPT_SCHEMA_VERSION = "law-firm-os.hrx.provider-receipt.v0.1";
export const HRX_PROVIDER_RECEIPT_KINDS = Object.freeze(["delivery", "calendar", "payroll", "bank", "filing"]);
export const HRX_PROVIDER_RECEIPT_STATES = Object.freeze(["pending", "succeeded", "failed"]);
export const HRX_PROVIDER_DELIVERY_STATES = Object.freeze(["queued", "sent", "delivered", "read", "failed", "unknown"]);
export const HRX_PROVIDER_ENVIRONMENTS = Object.freeze(["sandbox", "production"]);
export const HRX_PROVIDER_ITEM_STATES = Object.freeze(["succeeded", "failed", "unknown"]);
const TOKENIZED_REF = /^[A-Za-z][A-Za-z0-9_-]*:[^\s@]+$/;
const FORBIDDEN_RECEIPT_KEYS = new Set([
  "raw_payload",
  "access_token",
  "refresh_token",
  "authorization",
  "client_secret",
  "secret",
  "password",
  "account_number",
  "employee_id",
  "reason_text",
  "attachment_ids",
  "document_ids",
]);

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function optionalString(value, field) {
  if (value == null) return null;
  return requiredString(value, field);
}

function positiveInteger(value, field) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new TypeError(`${field} must be a positive integer`);
  return value;
}

function guardedError(message, code, status = 409) {
  const error = new Error(message);
  error.safe_error_code = code;
  error.status = status;
  return error;
}

function tokenizedRef(value, field) {
  const ref = requiredString(value, field);
  if (!TOKENIZED_REF.test(ref)) throw new TypeError(`${field} must be a tokenized reference`);
  if (/bearer|password|client[_-]?secret|access[_-]?token/i.test(ref)) throw new TypeError(`${field} must not contain credential material`);
  return ref;
}

function syntheticMarker(value) {
  return /(?:^|[-_/:.])(synthetic|sandbox|fixture|test)(?:$|[-_/:.])/i.test(String(value ?? ""));
}

function isoTimestamp(value, field) {
  const text = requiredString(value, field);
  if (Number.isNaN(Date.parse(text))) throw new TypeError(`${field} must be an ISO timestamp`);
  return new Date(text).toISOString();
}

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function forbiddenReceiptKey(value) {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const forbidden = forbiddenReceiptKey(item);
      if (forbidden) return forbidden;
    }
    return null;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_RECEIPT_KEYS.has(key.toLowerCase())) return key;
    const forbidden = forbiddenReceiptKey(child);
    if (forbidden) return forbidden;
  }
  return null;
}

export function normalizeHrxProviderDeliveryState(input = {}) {
  const explicit = input.delivery_state;
  if (explicit != null) {
    const value = requiredString(explicit, "delivery_state");
    if (!HRX_PROVIDER_DELIVERY_STATES.includes(value)) throw new TypeError("delivery_state is unsupported");
    return value;
  }
  const state = requiredString(input.state, "state");
  if (["pending", "pending_sync", "queued"].includes(state)) return "queued";
  if (["failed", "rejected"].includes(state)) return "failed";
  if (["not_configured", "disabled", "unknown"].includes(state)) return "unknown";
  if (["viewed", "read"].includes(state)) return "read";
  if (state === "sent") return "sent";
  if (state === "delivered") {
    return input.provider_kind === "delivery" && input.delivery_evidence_verified !== true
      ? "sent"
      : "delivered";
  }
  if (state === "succeeded") {
    if (input.read_evidence_verified === true) return "read";
    if (input.delivery_evidence_verified === true || input.provider_kind === "calendar") return "delivered";
    return "sent";
  }
  return "unknown";
}

export function createHrxProviderReceipt(input = {}) {
  if (input.schema_version !== HRX_PROVIDER_RECEIPT_SCHEMA_VERSION) throw new TypeError("provider receipt schema_version is unsupported");
  const providerKind = requiredString(input.provider_kind, "provider_kind");
  if (!HRX_PROVIDER_RECEIPT_KINDS.includes(providerKind)) throw new TypeError("provider_kind is unsupported");
  const state = requiredString(input.state, "state");
  if (!HRX_PROVIDER_RECEIPT_STATES.includes(state)) throw new TypeError("state is unsupported");
  const requestedAt = isoTimestamp(input.requested_at, "requested_at");
  const completedAt = input.completed_at == null ? null : isoTimestamp(input.completed_at, "completed_at");
  const providerReceiptRef = optionalString(input.provider_receipt_ref, "provider_receipt_ref");
  const errorCode = optionalString(input.error_code, "error_code");
  const payloadHash = requiredString(input.payload_hash, "payload_hash").toLowerCase();
  if (!/^sha256:[a-f0-9]{64}$/.test(payloadHash)) throw new TypeError("payload_hash must be a sha256 digest");
  if (state === "pending" && (completedAt || providerReceiptRef || errorCode)) throw new TypeError("pending receipt must not contain a completion result");
  if (state === "succeeded" && (!completedAt || !providerReceiptRef || errorCode)) throw new TypeError("succeeded receipt requires provider receipt evidence and no error");
  if (state === "failed" && (!completedAt || !errorCode || providerReceiptRef)) throw new TypeError("failed receipt requires an error and no success evidence");
  if (completedAt && completedAt < requestedAt) throw new TypeError("completed_at must not precede requested_at");
  const deliveryState = normalizeHrxProviderDeliveryState({
    state,
    provider_kind: providerKind,
    delivery_state: input.delivery_state,
    delivery_evidence_verified: input.delivery_evidence_verified,
    read_evidence_verified: input.read_evidence_verified,
  });
  if (state === "pending" && !["queued", "unknown"].includes(deliveryState)) {
    throw new TypeError("pending receipt delivery_state must be queued or unknown");
  }
  if (state === "succeeded" && !["sent", "delivered", "read"].includes(deliveryState)) {
    throw new TypeError("succeeded receipt delivery_state must be sent, delivered, or read");
  }
  if (state === "failed" && deliveryState !== "failed") {
    throw new TypeError("failed receipt delivery_state must be failed");
  }
  const forbidden = forbiddenReceiptKey(input);
  if (forbidden) throw new TypeError(`${forbidden} must not be stored in a provider receipt`);
  if (providerReceiptRef && /bearer|password|client[_-]?secret|access[_-]?token/i.test(providerReceiptRef)) {
    throw new TypeError("provider_receipt_ref must be an opaque provider reference");
  }
  return deepFreeze({
    schema_version: HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
    receipt_id: requiredString(input.receipt_id, "receipt_id"),
    tenant_id: requiredString(input.tenant_id, "tenant_id"),
    provider_kind: providerKind,
    provider_id: requiredString(input.provider_id, "provider_id"),
    operation: requiredString(input.operation, "operation"),
    idempotency_key: requiredString(input.idempotency_key, "idempotency_key"),
    payload_hash: payloadHash,
    state,
    delivery_state: deliveryState,
    requested_at: requestedAt,
    completed_at: completedAt,
    provider_receipt_ref: providerReceiptRef,
    error_code: errorCode,
  });
}

export function assertHrxProviderReceiptSucceeded(input) {
  const receipt = createHrxProviderReceipt(input);
  if (receipt.state !== "succeeded") throw new TypeError("provider receipt is not succeeded");
  return receipt;
}

export function createHrxProviderOperationBoundary(input = {}) {
  const environment = requiredString(input.environment, "environment");
  if (!HRX_PROVIDER_ENVIRONMENTS.includes(environment)) throw new TypeError("environment is unsupported");
  const providerKind = requiredString(input.provider_kind, "provider_kind");
  if (!HRX_PROVIDER_RECEIPT_KINDS.includes(providerKind)) throw new TypeError("provider_kind is unsupported");
  const allowSynthetic = input.allow_synthetic === true;
  const connectionState = input.connection_state ?? "connected";
  if (!["connected", "disconnected"].includes(connectionState)) throw new TypeError("connection_state is unsupported");
  if (environment === "production" && allowSynthetic) {
    throw guardedError("Production provider boundary cannot allow synthetic receipts", "HRX_PROVIDER_SYNTHETIC_PRODUCTION_FORBIDDEN", 403);
  }
  const providerConnectionRef = tokenizedRef(input.provider_connection_ref, "provider_connection_ref");
  const credentialRef = tokenizedRef(input.credential_ref, "credential_ref");
  if (environment === "production" && (syntheticMarker(providerConnectionRef) || syntheticMarker(credentialRef))) {
    throw guardedError("Production provider boundary requires production references", "HRX_PROVIDER_PRODUCTION_REFERENCE_REQUIRED", 403);
  }
  return deepFreeze({
    environment,
    provider_kind: providerKind,
    provider_id: input.provider_id == null ? null : requiredString(input.provider_id, "provider_id"),
    provider_connection_ref: providerConnectionRef,
    credential_ref: credentialRef,
    connection_state: connectionState,
    allow_synthetic: allowSynthetic,
    maximum_attempts: input.maximum_attempts == null ? 3 : positiveInteger(input.maximum_attempts, "maximum_attempts"),
  });
}

export function assertHrxProviderReceiptForOperation(receiptInput, {
  boundary: boundaryInput,
  tenant_id,
  operation,
  idempotency_key,
  payload_hash,
  attempt_count = 1,
} = {}) {
  const boundary = createHrxProviderOperationBoundary(boundaryInput);
  if (boundary.connection_state !== "connected") {
    throw guardedError("Provider connection is not active", "HRX_PROVIDER_CONNECTION_REQUIRED", 503);
  }
  const receipt = createHrxProviderReceipt(receiptInput);
  const expected = {
    tenant_id: requiredString(tenant_id, "tenant_id"),
    operation: requiredString(operation, "operation"),
    idempotency_key: requiredString(idempotency_key, "idempotency_key"),
    payload_hash: requiredString(payload_hash, "payload_hash").toLowerCase(),
  };
  if (receipt.provider_kind !== boundary.provider_kind) throw guardedError("Provider receipt kind mismatch", "HRX_PROVIDER_RECEIPT_SCOPE_MISMATCH");
  if (boundary.provider_id && receipt.provider_id !== boundary.provider_id) throw guardedError("Provider receipt identity mismatch", "HRX_PROVIDER_RECEIPT_SCOPE_MISMATCH");
  for (const field of ["tenant_id", "operation", "idempotency_key", "payload_hash"]) {
    if (receipt[field] !== expected[field]) throw guardedError(`Provider receipt ${field} mismatch`, "HRX_PROVIDER_RECEIPT_SCOPE_MISMATCH");
  }
  const attemptCount = positiveInteger(attempt_count, "attempt_count");
  if (attemptCount > boundary.maximum_attempts) throw guardedError("Provider retry limit exceeded", "HRX_PROVIDER_RETRY_LIMIT_EXCEEDED");
  const synthetic = [
    receipt.provider_id,
    receipt.provider_receipt_ref,
    receipt.error_code,
  ].some(syntheticMarker);
  if (boundary.environment === "production" && synthetic) {
    throw guardedError("Synthetic provider receipt cannot prove a production operation", "HRX_PROVIDER_SYNTHETIC_PRODUCTION_FORBIDDEN", 403);
  }
  if (boundary.environment === "sandbox" && !boundary.allow_synthetic && synthetic) {
    throw guardedError("Synthetic provider receipt is not allowed", "HRX_PROVIDER_SYNTHETIC_RECEIPT_FORBIDDEN", 403);
  }
  const retryState = receipt.state === "pending"
    ? "poll"
    : receipt.state === "failed" && attemptCount < boundary.maximum_attempts
      ? "retry"
      : receipt.state === "failed"
        ? "exhausted"
        : "complete";
  return deepFreeze({
    receipt,
    environment: boundary.environment,
    provider_connection_ref: boundary.provider_connection_ref,
    credential_ref: boundary.credential_ref,
    attempt_count: attemptCount,
    retry_state: retryState,
    retry_scope: retryState === "retry" ? "same_operation" : retryState === "poll" ? "receipt_status" : "none",
    production_ready_claim: false,
  });
}

export function createHrxSandboxProviderOperationBoundary(providerKind) {
  const kind = requiredString(providerKind, "provider_kind");
  return createHrxProviderOperationBoundary({
    environment: "sandbox",
    provider_kind: kind,
    provider_connection_ref: `provider:sandbox/${kind}/connection`,
    credential_ref: `vault:sandbox/${kind}/credential`,
    connection_state: "connected",
    allow_synthetic: true,
    maximum_attempts: 3,
  });
}

export function summarizeHrxProviderItemOutcomes(input = {}) {
  if (!Array.isArray(input.items) || input.items.length === 0) throw new TypeError("items must be a non-empty array");
  const seen = new Set();
  const items = input.items.map((item) => {
    const itemRef = tokenizedRef(item.item_ref, "item_ref");
    if (seen.has(itemRef)) throw guardedError("Provider item outcome is duplicated", "HRX_PROVIDER_ITEM_DUPLICATE");
    seen.add(itemRef);
    const state = requiredString(item.state, "state");
    if (!HRX_PROVIDER_ITEM_STATES.includes(state)) throw new TypeError("provider item state is unsupported");
    const providerReceiptRef = item.provider_receipt_ref == null ? null : tokenizedRef(item.provider_receipt_ref, "provider_receipt_ref");
    const safeErrorCode = item.safe_error_code == null ? null : requiredString(item.safe_error_code, "safe_error_code");
    if (state === "succeeded" && (!providerReceiptRef || safeErrorCode)) throw new TypeError("succeeded provider item requires receipt evidence and no error");
    if (state === "failed" && (!safeErrorCode || providerReceiptRef)) throw new TypeError("failed provider item requires a safe error and no success evidence");
    if (state === "unknown" && providerReceiptRef) throw new TypeError("unknown provider item must not claim success evidence");
    const forbidden = forbiddenReceiptKey(item);
    if (forbidden) throw new TypeError(`${forbidden} must not be stored in a provider item outcome`);
    return deepFreeze({
      item_ref: itemRef,
      state,
      provider_receipt_ref: providerReceiptRef,
      safe_error_code: safeErrorCode,
    });
  });
  const succeededCount = items.filter((item) => item.state === "succeeded").length;
  const failedCount = items.filter((item) => item.state === "failed").length;
  const unknownCount = items.filter((item) => item.state === "unknown").length;
  const overallState = succeededCount === items.length
    ? "succeeded"
    : failedCount === items.length
      ? "failed"
      : succeededCount > 0
        ? "partial_success"
        : "unknown";
  return deepFreeze({
    overall_state: overallState,
    item_count: items.length,
    succeeded_count: succeededCount,
    failed_count: failedCount,
    unknown_count: unknownCount,
    retry_item_refs: items.filter((item) => item.state !== "succeeded").map((item) => item.item_ref),
    items,
    production_ready_claim: false,
  });
}

export function createHrxProviderIdempotencyGuard() {
  const executions = new Map();
  return Object.freeze({
    async execute(request = {}, operation) {
      if (typeof operation !== "function") throw new TypeError("operation must be a function");
      const tenantId = requiredString(request.tenant_id, "tenant_id");
      const providerKind = requiredString(request.provider_kind, "provider_kind");
      const idempotencyKey = requiredString(request.idempotency_key, "idempotency_key");
      const payloadHash = requiredString(request.payload_hash, "payload_hash").toLowerCase();
      const key = `${tenantId}\u0000${providerKind}\u0000${idempotencyKey}`;
      const existing = executions.get(key);
      if (existing) {
        if (existing.payload_hash !== payloadHash) throw guardedError("Idempotency key payload conflict", "HRX_PROVIDER_IDEMPOTENCY_CONFLICT");
        return deepFreeze({ replayed: true, result: await existing.promise });
      }
      const promise = Promise.resolve().then(operation);
      executions.set(key, { payload_hash: payloadHash, promise });
      try {
        return deepFreeze({ replayed: false, result: await promise });
      } catch (error) {
        executions.delete(key);
        throw error;
      }
    },
  });
}
