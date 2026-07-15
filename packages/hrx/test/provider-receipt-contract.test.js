import assert from "node:assert/strict";
import test from "node:test";
import {
  HRX_PROVIDER_RECEIPT_KINDS,
  HRX_PROVIDER_RECEIPT_SCHEMA_VERSION,
  assertHrxProviderReceiptSucceeded,
  createHrxProviderReceipt,
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
});
