import assert from "node:assert/strict";
import test from "node:test";
import { APPROVED_ARTIFACT_ID, AUTHORITY_BINDING, CONNECTION, docusignRuntime, MATTER, TENANT, withServer, createDocusignFailClosedRuntime, DOCUSIGN_OUTLOOK_REQUESTS_PATH } from "./docusign-api-fixtures.js";

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
    assert.deepEqual([body.outcome, body.item.state, body.item.can_reconcile], ["reconciled", "reconciliation_required", true]);
    assert.equal(runtime.repository.loadState().requests[0].envelope_id, "envelope-api-recovered");
  });
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
