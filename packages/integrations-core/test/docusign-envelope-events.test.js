import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DOCUSIGN_CONNECT_SIGNATURE_HEADER, createDocusignEnvelopeEventService, createDocusignEnvelopeRepository } from "../src/index.js";
import { approvedSource, connectBody, CONNECTION, preparedRuntime, SECRET, signature, webhook } from "./docusign-events-fixtures.js";

test("OUTM-34 verifies HMAC against exact raw bytes before receipt or projection mutation", async () => {
  const runtime = await preparedRuntime();
  const body = connectBody({ status: "delivered" });
  await assert.rejects(webhook(runtime.events, Buffer.from(`${body.toString("utf8")} `), signature(body)), (error) => error?.safe_error_code === "DOCUSIGN_WEBHOOK_SIGNATURE_INVALID" && error?.status === 401);
  await assert.rejects(runtime.events.processWebhook({ raw_body: body, headers: {} }), (error) => error?.safe_error_code === "DOCUSIGN_WEBHOOK_SIGNATURE_INVALID" && error?.status === 401);
  assert.deepEqual([runtime.repository.loadState().requests[0].state, runtime.repository.loadState().webhook_receipts.length, runtime.receipts.length], ["sent", 0, 0]);
});

test("OUTM-34 secret-vault outage is a retryable redacted 503 and mutates neither receipt nor projection", async () => {
  const runtime = await preparedRuntime({ resolveSecret: async () => { throw new Error("secret://raw-provider-hmac-value"); } });
  await assert.rejects(webhook(runtime.events, connectBody({ status: "delivered" })), (error) => error?.status === 503 && error?.retryable === true && error?.safe_error_code === "DOCUSIGN_SECRET_UNAVAILABLE" && !JSON.stringify(error).includes("raw-provider-hmac-value"));
  assert.deepEqual([runtime.repository.loadState().requests[0].state, runtime.receipts.length], ["sent", 0]);
});

test("OUTM-34 stores a protected raw receipt reference and exposes only the safe Outlook projection", async () => {
  const runtime = await preparedRuntime();
  const result = await webhook(runtime.events, connectBody({ status: "delivered" }));
  assert.deepEqual([result.outcome, result.request.state, runtime.receipts.length], ["processed", "delivered", 1]);
  assert.equal(result.request.can_send, false);
  assert.doesNotMatch(JSON.stringify(result), /account-001|demo\.docusign|aws-secrets-manager|test-only-connect/u);
});

test("OUTM-34 deduplicates canonical events and rejects out-of-order status regression", async () => {
  const runtime = await preparedRuntime();
  const delivered = connectBody({ status: "delivered" });
  const first = await webhook(runtime.events, delivered);
  const duplicate = await webhook(runtime.events, delivered);
  const older = await webhook(runtime.events, connectBody({ status: "sent", occurred_at: "2026-08-08T01:06:00.000Z" }));
  assert.deepEqual([first.outcome, duplicate.outcome, older.outcome], ["processed", "replayed", "ignored"]);
  assert.equal(runtime.repository.loadState().requests[0].state, "delivered");
  assert.equal(runtime.repository.loadState().webhook_receipts.length, 2);
});

test("OUTM-34 rejects a signed event from a different DocuSign account before receipt storage", async () => {
  const runtime = await preparedRuntime();
  await assert.rejects(webhook(runtime.events, connectBody({ status: "delivered", account_id: "account-other" })), (error) => error?.safe_error_code === "DOCUSIGN_WEBHOOK_REJECTED" && error?.status === 401);
  assert.deepEqual([runtime.repository.loadState().requests[0].state, runtime.receipts.length], ["sent", 0]);
});

test("OUTM-34 rejects a same-account cross-envelope locator before receipt, projection, or artifact writes and after restart", async () => {
  const dir = mkdtempSync(join(tmpdir(), "outm34-envelope-binding-"));
  try {
    const filePath = join(dir, "outbox.json");
    const runtime = await preparedRuntime({ filePath });
    const state = runtime.repository.loadState();
    const requestA = state.requests[0];
    const requestB = { ...requestA, request_id: "esign-request-002", envelope_id: "envelope-002", idempotency_key: "esign-send-002", payload_sha256: "c".repeat(64), provider_correlation_ref: "docusign-correlation:esign-request-002", event_hashes: [] };
    runtime.repository.replaceState({ ...state, requests: [requestA, requestB] });
    const resolver = async () => runtime.repository.loadState().requests[1];
    const events = createDocusignEnvelopeEventService({ repository: runtime.repository, connectionResolver: async () => CONNECTION, webhookRequestResolver: resolver, resolveSecret: async ({ ref }) => ref === CONNECTION.hmac_secret_ref ? SECRET : null, adapter: runtime.adapter, receiptStore: runtime.receiptStore, artifactStore: runtime.artifactStore, approvedDocumentResolver: async () => approvedSource(), clock: () => runtime.now.value });
    const before = runtime.repository.loadState();
    await assert.rejects(webhook(events, connectBody({ status: "delivered", envelope_id: "envelope-001" })), (error) => error?.safe_error_code === "DOCUSIGN_WEBHOOK_REJECTED" && error?.status === 401);
    assert.deepEqual(runtime.repository.loadState(), before);
    assert.equal(runtime.receipts.length, 0);
    const reopened = createDocusignEnvelopeRepository({ filePath });
    const restarted = createDocusignEnvelopeEventService({ repository: reopened, connectionResolver: async () => CONNECTION, webhookRequestResolver: resolver, resolveSecret: async ({ ref }) => ref === CONNECTION.hmac_secret_ref ? SECRET : null, adapter: runtime.adapter, receiptStore: runtime.receiptStore, artifactStore: runtime.artifactStore, approvedDocumentResolver: async () => approvedSource(), clock: () => runtime.now.value });
    await assert.rejects(webhook(restarted, connectBody({ status: "delivered", envelope_id: "envelope-001" })), (error) => error?.safe_error_code === "DOCUSIGN_WEBHOOK_REJECTED" && error?.status === 401);
    assert.deepEqual(reopened.loadState(), before);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
