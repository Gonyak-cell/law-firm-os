import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { DOCUSIGN_CONNECT_SIGNATURE_HEADER, DOCUSIGN_OUTLOOK_REQUESTS_PATH, DOCUSIGN_WEBHOOK_PATH, CONNECTION, docusignRuntime, HMAC_SECRET, MATTER, withServer } from "./docusign-api-fixtures.js";

function connectBody(status = "delivered", envelope_id = "envelope-api", account_id = CONNECTION.account_id) {
  return Buffer.from(JSON.stringify({ event: `envelope-${status}`, generatedDateTime: "2026-08-08T02:05:00.000Z", data: { accountId: account_id, envelopeId: envelope_id, envelopeSummary: { status, statusChangedDateTime: "2026-08-08T02:05:00.000Z" } } }));
}

test("OUTM-34 HTTP webhook preserves raw bytes for HMAC and rejects an altered signature before auth", async () => {
  const runtime = await docusignRuntime();
  await withServer(runtime, async (baseUrl) => {
    const body = connectBody();
    const goodSignature = createHmac("sha256", HMAC_SECRET).update(body).digest("base64");
    const denied = await fetch(`${baseUrl}${DOCUSIGN_WEBHOOK_PATH}`, { method: "POST", headers: { "content-type": "application/json", [DOCUSIGN_CONNECT_SIGNATURE_HEADER]: createHmac("sha256", HMAC_SECRET).update(Buffer.from("other")).digest("base64") }, body });
    assert.equal(denied.status, 401);
    assert.deepEqual((await denied.json()).safe_error_codes, ["DOCUSIGN_WEBHOOK_REJECTED"]);
    const accepted = await fetch(`${baseUrl}${DOCUSIGN_WEBHOOK_PATH}`, { method: "POST", headers: { "content-type": "application/json", [DOCUSIGN_CONNECT_SIGNATURE_HEADER]: goodSignature }, body });
    const acceptedBody = await accepted.json();
    assert.equal(accepted.status, 202, JSON.stringify(acceptedBody));
    assert.deepEqual([acceptedBody.outcome, acceptedBody.state, acceptedBody.provider_payload_returned], ["processed", "delivered", false]);
  });
});

test("OUTM-34 HTTP webhook fails closed when a same-account locator returns another envelope", async () => {
  let located;
  const runtime = await docusignRuntime({ webhookRequestResolver: async () => located });
  const state = runtime.repository.loadState();
  const requestA = state.requests[0];
  const requestB = { ...requestA, request_id: "request-api-other", envelope_id: "envelope-api-other", idempotency_key: "send-api-other", payload_sha256: "d".repeat(64), provider_correlation_ref: "docusign-correlation:request-api-other", event_hashes: [] };
  runtime.repository.replaceState({ ...state, requests: [requestA, requestB] });
  located = runtime.repository.loadState().requests[1];
  const before = runtime.repository.loadState();
  await withServer(runtime, async (baseUrl) => {
    const body = connectBody();
    const response = await fetch(`${baseUrl}${DOCUSIGN_WEBHOOK_PATH}`, { method: "POST", headers: { "content-type": "application/json", [DOCUSIGN_CONNECT_SIGNATURE_HEADER]: createHmac("sha256", HMAC_SECRET).update(body).digest("base64") }, body });
    const responseBody = await response.json();
    assert.equal(response.status, 401, JSON.stringify(responseBody));
    assert.deepEqual(responseBody.safe_error_codes, ["DOCUSIGN_WEBHOOK_REJECTED"]);
  });
  assert.deepEqual(runtime.repository.loadState(), before);
});

test("OUTM-34 Outlook read route requires Matter authorization and returns no provider identifiers", async () => {
  const allowedRuntime = await docusignRuntime();
  await withServer(allowedRuntime, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}?matter_id=${MATTER}`, { headers: { authorization: "Bearer outlook-session" } });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0].state, "sent");
    assert.doesNotMatch(JSON.stringify(body), /account-api|demo\.docusign|envelope-api|aws-secrets-manager|tenant-api/u);
  });
  const deniedRuntime = await docusignRuntime({ authorizeMatter: async () => false });
  await withServer(deniedRuntime, async (baseUrl) => {
    const response = await fetch(`${baseUrl}${DOCUSIGN_OUTLOOK_REQUESTS_PATH}?matter_id=${MATTER}`, { headers: { authorization: "Bearer outlook-session" } });
    assert.equal(response.status, 403);
    assert.deepEqual((await response.json()).safe_error_codes, ["DOCUSIGN_MATTER_ACCESS_DENIED"]);
  });
});
