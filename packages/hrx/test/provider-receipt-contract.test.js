import assert from "node:assert/strict";
import test from "node:test";
import {
  HRX_PROVIDER_DELIVERY_STATES,
  HRX_PROVIDER_RECEIPT_KINDS,
  HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
  assertHrxProviderReceiptSucceeded,
  assertHrxProviderReceiptForOperation,
  createHrxProviderReceipt,
  createHrxProviderIdempotencyGuard,
  createHrxProviderOperationBoundary,
  normalizeHrxProviderDeliveryState,
  summarizeHrxProviderItemOutcomes,
} from "../src/provider-receipt-contract.js";

function receipt(providerKind, state, patch = {}) {
  return {
    schema_version: HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
    receipt_id: `receipt-${providerKind}-${state}`,
    tenant_id: "tenant-synthetic",
    provider_kind: providerKind,
    provider_id: `synthetic-${providerKind}`,
    operation: `synthetic.${providerKind}.write`,
    idempotency_key: `${providerKind}:${state}:001`,
    payload_hash: `sha256:${"a".repeat(64)}`,
    state,
    requested_at: "2026-07-14T00:00:00.000Z",
    completed_at: state === "pending" ? null : "2026-07-14T00:00:01.000Z",
    provider_receipt_ref: state === "succeeded" ? `SyntheticReceipt:${providerKind}:001` : null,
    error_code: state === "failed" ? "SYNTHETIC_PROVIDER_REJECTED" : null,
    ...patch,
  };
}

test("GOV-006 defines one receipt state contract for delivery, calendar, bank, and filing", () => {
  for (const kind of HRX_PROVIDER_RECEIPT_KINDS) {
    assert.equal(createHrxProviderReceipt(receipt(kind, "pending")).state, "pending");
    assert.equal(assertHrxProviderReceiptSucceeded(receipt(kind, "succeeded")).provider_kind, kind);
    assert.equal(createHrxProviderReceipt(receipt(kind, "failed")).error_code, "SYNTHETIC_PROVIDER_REJECTED");
  }
});

test("GOV-006 rejects success without a provider receipt and failure without an error", () => {
  assert.throws(() => createHrxProviderReceipt(receipt("delivery", "succeeded", { provider_receipt_ref: null })), /requires provider receipt evidence/);
  assert.throws(() => createHrxProviderReceipt(receipt("calendar", "failed", { error_code: null })), /requires an error/);
  assert.throws(() => assertHrxProviderReceiptSucceeded(receipt("bank", "pending")), /not succeeded/);
});

test("GOV-006 receipt metadata cannot carry raw provider secrets", () => {
  assert.throws(() => createHrxProviderReceipt(receipt("filing", "pending", { access_token: "secret" })), /must not be stored/);
  assert.throws(
    () => createHrxProviderReceipt(receipt("delivery", "pending", { metadata: { refresh_token: "secret" } })),
    /must not be stored/,
  );
  assert.throws(
    () => createHrxProviderReceipt(receipt("delivery", "succeeded", { provider_receipt_ref: "Bearer secret" })),
    /opaque provider reference/,
  );
});

test("provider result states distinguish accepted sends from delivery and read evidence", () => {
  assert.deepEqual(HRX_PROVIDER_DELIVERY_STATES, [
    "queued",
    "sent",
    "delivered",
    "read",
    "failed",
    "unknown",
  ]);
  assert.equal(createHrxProviderReceipt(receipt("delivery", "pending")).delivery_state, "queued");
  assert.equal(createHrxProviderReceipt(receipt("delivery", "succeeded")).delivery_state, "sent");
  assert.equal(createHrxProviderReceipt(receipt("calendar", "succeeded")).delivery_state, "delivered");
  assert.equal(
    createHrxProviderReceipt(receipt("delivery", "succeeded", { delivery_state: "read" })).delivery_state,
    "read",
  );
  assert.equal(normalizeHrxProviderDeliveryState({ state: "not_configured" }), "unknown");
  assert.throws(
    () => createHrxProviderReceipt(receipt("delivery", "pending", { delivery_state: "delivered" })),
    /pending receipt delivery_state/,
  );
});

function boundary(overrides = {}) {
  return {
    environment: "sandbox",
    provider_kind: "filing",
    provider_id: "synthetic-filing",
    provider_connection_ref: "provider:sandbox/filing/connection",
    credential_ref: "vault:sandbox/filing/credential",
    allow_synthetic: true,
    maximum_attempts: 3,
    ...overrides,
  };
}

test("PEO-TUW-068 rejects synthetic production evidence and requires safe connection and credential references", () => {
  assert.throws(
    () => createHrxProviderOperationBoundary(boundary({ environment: "production", allow_synthetic: true })),
    (error) => error.safe_error_code === "HRX_PROVIDER_SYNTHETIC_PRODUCTION_FORBIDDEN",
  );
  assert.throws(
    () => createHrxProviderOperationBoundary(boundary({ credential_ref: "raw-password" })),
    /tokenized reference/,
  );
  const production = boundary({
    environment: "production",
    provider_id: null,
    provider_connection_ref: "provider:production/filing/connection",
    credential_ref: "vault:production/filing/credential",
    allow_synthetic: false,
  });
  assert.throws(
    () => assertHrxProviderReceiptForOperation(receipt("filing", "succeeded"), {
      boundary: production,
      tenant_id: "tenant-synthetic",
      operation: "synthetic.filing.write",
      idempotency_key: "filing:succeeded:001",
      payload_hash: `sha256:${"a".repeat(64)}`,
    }),
    (error) => error.safe_error_code === "HRX_PROVIDER_SYNTHETIC_PRODUCTION_FORBIDDEN",
  );
});

test("PEO-TUW-068 binds receipts to the exact request and exposes bounded retry state without raw payloads", () => {
  const pending = assertHrxProviderReceiptForOperation(receipt("filing", "pending"), {
    boundary: boundary(),
    tenant_id: "tenant-synthetic",
    operation: "synthetic.filing.write",
    idempotency_key: "filing:pending:001",
    payload_hash: `sha256:${"a".repeat(64)}`,
    attempt_count: 1,
  });
  assert.deepEqual([pending.retry_state, pending.retry_scope], ["poll", "receipt_status"]);
  const failed = assertHrxProviderReceiptForOperation(receipt("filing", "failed"), {
    boundary: boundary(),
    tenant_id: "tenant-synthetic",
    operation: "synthetic.filing.write",
    idempotency_key: "filing:failed:001",
    payload_hash: `sha256:${"a".repeat(64)}`,
    attempt_count: 2,
  });
  assert.deepEqual([failed.retry_state, failed.retry_scope], ["retry", "same_operation"]);
  assert.throws(
    () => assertHrxProviderReceiptForOperation(receipt("filing", "succeeded"), {
      boundary: boundary(),
      tenant_id: "another-tenant",
      operation: "synthetic.filing.write",
      idempotency_key: "filing:succeeded:001",
      payload_hash: `sha256:${"a".repeat(64)}`,
    }),
    (error) => error.safe_error_code === "HRX_PROVIDER_RECEIPT_SCOPE_MISMATCH",
  );
  assert.doesNotMatch(JSON.stringify(failed), /raw_payload|access_token|password|client_secret/);
});

test("PEO-TUW-068 coalesces the same key and rejects a different payload before provider execution", async () => {
  const guard = createHrxProviderIdempotencyGuard();
  let calls = 0;
  let release;
  const pending = new Promise((resolve) => { release = resolve; });
  const request = {
    tenant_id: "tenant-synthetic",
    provider_kind: "filing",
    idempotency_key: "filing-operation-001",
    payload_hash: `sha256:${"b".repeat(64)}`,
  };
  const first = guard.execute(request, async () => {
    calls += 1;
    await pending;
    return { provider_receipt_ref: "provider:sandbox/filing/001" };
  });
  const replay = guard.execute(request, async () => {
    calls += 1;
    return { provider_receipt_ref: "provider:sandbox/filing/duplicate" };
  });
  release();
  assert.deepEqual(await first, { replayed: false, result: { provider_receipt_ref: "provider:sandbox/filing/001" } });
  assert.deepEqual(await replay, { replayed: true, result: { provider_receipt_ref: "provider:sandbox/filing/001" } });
  assert.equal(calls, 1);
  await assert.rejects(
    guard.execute({ ...request, payload_hash: `sha256:${"c".repeat(64)}` }, async () => ({})),
    (error) => error.safe_error_code === "HRX_PROVIDER_IDEMPOTENCY_CONFLICT",
  );
});

test("PEO-TUW-068 preserves partial success and retries only failed or unknown item references", () => {
  const summary = summarizeHrxProviderItemOutcomes({
    items: [
      { item_ref: "provider-item:payment/001", state: "succeeded", provider_receipt_ref: "provider:sandbox/bank/001", safe_error_code: null },
      { item_ref: "provider-item:payment/002", state: "failed", provider_receipt_ref: null, safe_error_code: "BANK_REJECTED" },
      { item_ref: "provider-item:payment/003", state: "unknown", provider_receipt_ref: null, safe_error_code: null },
    ],
  });
  assert.deepEqual({
    state: summary.overall_state,
    succeeded: summary.succeeded_count,
    failed: summary.failed_count,
    unknown: summary.unknown_count,
    retry: summary.retry_item_refs,
  }, {
    state: "partial_success",
    succeeded: 1,
    failed: 1,
    unknown: 1,
    retry: ["provider-item:payment/002", "provider-item:payment/003"],
  });
  assert.throws(
    () => summarizeHrxProviderItemOutcomes({ items: [{ item_ref: "provider-item:payment/001", state: "failed", raw_payload: { account_number: "secret" }, safe_error_code: "FAILED" }] }),
    /must not be stored/,
  );
});
