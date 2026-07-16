export const HRX_PROVIDER_RECEIPT_SCHEMA_VERSION = "law-firm-os.hrx.provider-receipt.v0.1";
export const HRX_PROVIDER_RECEIPT_KINDS = Object.freeze(["delivery", "calendar", "bank", "filing"]);
export const HRX_PROVIDER_RECEIPT_STATES = Object.freeze(["pending", "succeeded", "failed"]);

function requiredString(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} must be a non-empty string`);
  return value.trim();
}

function optionalString(value, field) {
  if (value == null) return null;
  return requiredString(value, field);
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
  for (const forbidden of ["raw_payload", "access_token", "secret", "account_number"]) {
    if (Object.hasOwn(input, forbidden)) throw new TypeError(`${forbidden} must not be stored in a provider receipt`);
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
