import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { APPROVED_ARTIFACT_ID, AUTHORITY_BINDING, CONNECTION, docusignRuntime, MATTER, TENANT, withServer, createDocusignFailClosedRuntime, DOCUSIGN_OUTLOOK_REQUESTS_PATH } from "./docusign-api-fixtures.js";
import { createDocusignEnvelopeRepository } from "../../../packages/integrations-core/src/index.js";

test("OUTM-33 HTTP queue and send routes require authz, idempotency and explicit human action", async () => {
  const runtime = await docusignRuntime({ prepare: false });
  await withServer(runtime, async (baseUrl) => {
    const denied = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}`, { method: "POST", headers: { authorization: "Bearer outlook-session", "content-type": "application/json" }, body: JSON.stringify({ matter_id: MATTER }) });
    assert.equal(denied.status, 400);
    const queued = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}`, { method: "POST", headers: { authorization: "Bearer outlook-session", "content-type": "application/json" }, body: JSON.stringify({ request_id: "request-api-http", matter_id: MATTER, connection_id: CONNECTION.connection_id, approved_artifact_id: APPROVED_ARTIFACT_ID, idempotency_key: "queue-api-http", explicit_human_action: true }) });
    const queuedBody = await queued.json();
    assert.equal(queued.status, 201, JSON.stringify(queuedBody));
    const crossMatter = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}/request-api-http/send`, { method: "POST", headers: { authorization: "Bearer outlook-session", "content-type": "application/json" }, body: JSON.stringify({ matter_id: "matter-other", idempotency_key: "send-cross-matter", explicit_human_action: true }) });
    assert.equal(crossMatter.status, 404);
    const sent = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}/request-api-http/send`, { method: "POST", headers: { authorization: "Bearer outlook-session", "content-type": "application/json" }, body: JSON.stringify({ matter_id: MATTER, idempotency_key: "send-api-http", explicit_human_action: true }) });
    const sentBody = await sent.json();
    assert.equal(sent.status, 200, JSON.stringify(sentBody));
    assert.equal(sentBody.item.state, "sent");
    assert.doesNotMatch(JSON.stringify(sentBody), /account-api|demo\.docusign|aws-secrets-manager/u);
  });
});

test("OUTM-33 HTTP reconcile route recovers by provider correlation without a second create or send", async () => {
  const runtime = await docusignRuntime();
  runtime.repository.transact({ tenant_id: TENANT }, (state) => { state.requests[0] = { ...state.requests[0], state: "reconciliation_required", envelope_id: null, operation_lease: null, attempt_phase: "create_failed" }; });
  await withServer(runtime, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}/request-api/reconcile`, { method: "POST", headers: { authorization: "Bearer outlook-session", "content-type": "application/json" }, body: JSON.stringify({ matter_id: MATTER, idempotency_key: "reconcile-api", explicit_human_action: true }) });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.deepEqual([body.outcome, body.item.state, body.item.can_send, body.item.can_reconcile], ["reconciled", "draft_created", true, true]);
    assert.equal(runtime.repository.loadState().requests[0].envelope_id, "envelope-api-recovered");
  });
});

test("OUTM-33 HTTP rejected-send replay preserves blocked status and safe error after restart", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "docusign-api-action-failed-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "outbox.json");
  let createCalls = 0;
  const adapter = {
    async createDraft() { createCalls += 1; throw Object.assign(new Error("provider rejected"), { provider_status: 400 }); },
    async send() { throw new Error("send must not run"); },
    async getStatus() { return { status: "delivered" }; },
    async downloadDocument() { return Buffer.from("unused"); },
  };
  const runtime = await docusignRuntime({ prepare: false, repository: createDocusignEnvelopeRepository({ filePath }), adapter });
  await runtime.envelope_service.queueApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-api" }, request_id: "request-api-failed", tenant_id: TENANT, matter_id: MATTER, connection_id: CONNECTION.connection_id, idempotency_key: "queue-api-failed", approved_artifact_id: APPROVED_ARTIFACT_ID, explicit_human_action: true, authority_binding: AUTHORITY_BINDING });
  const body = { matter_id: MATTER, idempotency_key: "send-api-failed", explicit_human_action: true };
  await withServer(runtime, async (baseUrl) => {
    const first = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}/request-api-failed/send`, { method: "POST", headers: { authorization: "Bearer outlook-session", "content-type": "application/json" }, body: JSON.stringify(body) });
    const firstBody = await first.json();
    assert.deepEqual([first.status, firstBody.outcome, firstBody.safe_error_codes], [200, "blocked", ["DOCUSIGN_PROVIDER_REJECTED"]]);
  });
  const restarted = await docusignRuntime({ prepare: false, repository: createDocusignEnvelopeRepository({ filePath }), adapter });
  await withServer(restarted, async (baseUrl) => {
    const replay = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}/request-api-failed/send`, { method: "POST", headers: { authorization: "Bearer outlook-session", "content-type": "application/json" }, body: JSON.stringify(body) });
    const replayBody = await replay.json();
    assert.deepEqual([replay.status, replayBody.outcome, replayBody.safe_error_codes], [200, "blocked", ["DOCUSIGN_PROVIDER_REJECTED"]]);
  });
  assert.equal(createCalls, 1);
});

test("OUTM-33 HTTP unknown-reconcile replay stays retryable after restart and never claims in-progress", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "docusign-api-action-unknown-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "outbox.json");
  let findCalls = 0;
  const adapter = {
    async createDraft() { return { envelope_id: "unused" }; },
    async send() { return { status: "sent" }; },
    async findByCorrelation() { findCalls += 1; throw Object.assign(new Error("provider lookup ambiguous"), { provider_status: 503 }); },
    async getStatus() { return { status: "delivered" }; },
    async downloadDocument() { return Buffer.from("unused"); },
  };
  const repository = createDocusignEnvelopeRepository({ filePath });
  const runtime = await docusignRuntime({ prepare: false, repository, adapter });
  await runtime.envelope_service.queueApprovedRequest({ principal: { tenant_id: TENANT, actor_id: "actor-api" }, request_id: "request-api-unknown", tenant_id: TENANT, matter_id: MATTER, connection_id: CONNECTION.connection_id, idempotency_key: "queue-api-unknown", approved_artifact_id: APPROVED_ARTIFACT_ID, explicit_human_action: true, authority_binding: AUTHORITY_BINDING });
  repository.transact({ tenant_id: TENANT }, (state) => { state.requests[0] = { ...state.requests[0], state: "reconciliation_required", attempt_phase: "create_failed", operation_lease: null }; });
  const body = { matter_id: MATTER, idempotency_key: "reconcile-api-unknown", explicit_human_action: true };
  await withServer(runtime, async (baseUrl) => {
    const first = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}/request-api-unknown/reconcile`, { method: "POST", headers: { authorization: "Bearer outlook-session", "content-type": "application/json" }, body: JSON.stringify(body) });
    const firstBody = await first.json();
    assert.deepEqual([first.status, firstBody.outcome, firstBody.safe_error_codes], [503, "blocked", ["DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS"]]);
  });
  const restarted = await docusignRuntime({ prepare: false, repository: createDocusignEnvelopeRepository({ filePath }), adapter });
  await withServer(restarted, async (baseUrl) => {
    const replay = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}/request-api-unknown/reconcile`, { method: "POST", headers: { authorization: "Bearer outlook-session", "content-type": "application/json" }, body: JSON.stringify(body) });
    const replayBody = await replay.json();
    assert.deepEqual([replay.status, replayBody.outcome, replayBody.safe_error_codes], [503, "blocked", ["DOCUSIGN_PROVIDER_RESULT_AMBIGUOUS"]]);
  });
  assert.equal(findCalls, 1);
  assert.equal((await restarted.repository.readState?.({ tenant_id: TENANT }) ?? restarted.repository.loadState()).requests[0].operation_lease, null);
});

test("OUTM-33 server default fail-closed authority reaches the live route with zero outbox rows", async () => {
  const runtime = createDocusignFailClosedRuntime({ authorizeMatter: async () => ({ allowed: true, authority_binding: AUTHORITY_BINDING }) });
  await withServer(runtime, async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/health`);
    const healthBody = await health.json();
    assert.deepEqual([health.status, healthBody.docusign.status, healthBody.docusign.worker_injected], [200, "blocked", true]);
    const response = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}`, { method: "POST", headers: { authorization: "Bearer outlook-session", "content-type": "application/json" }, body: JSON.stringify({ request_id: "request-blocked-http", matter_id: MATTER, connection_id: CONNECTION.connection_id, approved_artifact_id: APPROVED_ARTIFACT_ID, idempotency_key: "queue-blocked-http", explicit_human_action: true }) });
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.deepEqual(body.safe_error_codes, ["DOCUSIGN_APPROVED_DOCUMENT_AUTHORITY_BLOCKED"]);
    assert.equal(runtime.repository.loadState().requests.length, 0);
  });
});

test("OUTM-34 repository and secret outages are retryable redacted 503 responses", async () => {
  const runtime = { envelope_service: { listRequests: async () => { throw new Error("postgresql://user:raw-password@host/db"); } }, authorizeMatter: async () => true };
  await withServer(runtime, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}?matter_id=${MATTER}`, { headers: { authorization: "Bearer outlook-session" } });
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.detail_exposed, false);
    assert.doesNotMatch(JSON.stringify(body), /raw-password|postgresql/u);
  });
});
