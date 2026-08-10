import assert from "node:assert/strict";
import http from "node:http";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { chromium } from "playwright";
import { createServer } from "vite";
import {
  createOutlookConversationPolicyCurrentRequest,
  createOutlookConversationPolicyEnableRequest,
  createOutlookConversationPolicyRevokeRequest,
  parseOutlookConversationPolicyEnableResponse,
  parseOutlookConversationPolicyResponse,
  parseOutlookConversationPolicyRevokeResponse,
} from "../src/outlook-conversation-policy.js";

const ADDIN_ROOT = fileURLToPath(new URL("../", import.meta.url));
const READY = Object.freeze({ authoritative: true, runtime_ready: true, auto_filing_enabled: true });
const ACTIVE = Object.freeze({ policy_id: "policy-outm28", conversation_id: "conversation-outm28", matter_id: "matter-outm28", status: "active", pause_reason: null, version: 1, created_at: "2026-08-08T00:00:00.000Z", updated_at: "2026-08-08T00:00:00.000Z", revoked_at: null });
const envelope = (item = ACTIVE, outcome = "passed", readiness = READY) => ({ request_id: "request-outm28", outcome, item, readiness, safe_error_codes: [], production_ready_claim: false });
const mutationEnvelope = (item = ACTIVE, outcome = "created") => ({ request_id: "request-outm28", outcome, item, subscription_sync: "synchronized", safe_error_codes: [], production_ready_claim: false });
let vite;
let browserServer;
let origin;
let OutlookConversationPolicyPanel;

test.before(async () => {
  vite = await createServer({ root: ADDIN_ROOT, configFile: `${ADDIN_ROOT}/vite.config.js`, appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
  ({ OutlookConversationPolicyPanel } = await vite.ssrLoadModule("/src/outlook-conversation-policy-panel.jsx"));
  browserServer = http.createServer(async (request, response) => {
    if (request.url === "/outlook-conversation-policy-test.html") {
      const html = await vite.transformIndexHtml(request.url, `<!doctype html><html lang="ko"><body><div id="root"></div><script type="module">
        import React from "react"; import { createRoot } from "react-dom/client"; import { OutlookConversationPolicyPanel } from "/src/outlook-conversation-policy-panel.jsx";
        const root = createRoot(document.getElementById("root")); window.__calls = [];
        window.__render = (props) => root.render(React.createElement(OutlookConversationPolicyPanel, { ...props, onEnable: () => window.__calls.push("enable"), onRevoke: () => window.__calls.push("revoke"), onReconnect: () => window.__calls.push("reconnect") }));
      </script></body></html>`);
      response.setHeader("content-type", "text/html; charset=utf-8"); response.end(html); return;
    }
    vite.middlewares(request, response, () => { response.statusCode = 404; response.end("not found"); });
  });
  await new Promise((resolve) => browserServer.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${browserServer.address().port}`;
});

test.after(async () => {
  await new Promise((resolve) => browserServer?.close(resolve));
  await vite?.close();
});

function render(props = {}) {
  return renderToStaticMarkup(React.createElement(OutlookConversationPolicyPanel, { readiness: READY, onEnable() {}, onRevoke() {}, ...props }));
}

test("OUTM28 request builders bind only the exact current, enable, and revoke fields", () => {
  assert.deepEqual(createOutlookConversationPolicyCurrentRequest({ m365_connection_id: "connection/outm28", matter_id: "matter-outm28", conversation_id: "conversation-outm28" }), {
    method: "GET",
    path: "/api/outlook/conversation-policies?m365_connection_id=connection%2Foutm28&matter_id=matter-outm28&conversation_id=conversation-outm28",
  });
  const enable = createOutlookConversationPolicyEnableRequest({ m365_connection_id: "connection-outm28", matter_id: "matter-outm28", conversation_id: "conversation-outm28", seed_email_thread_id: "thread-outm28", expected_version: 0, idempotency_key: "enable-outm28", reason: "사용자 요청" });
  assert.deepEqual(Object.keys(enable.body), ["m365_connection_id", "matter_id", "conversation_id", "seed_email_thread_id", "expected_version", "idempotency_key", "reason"]);
  const revoke = createOutlookConversationPolicyRevokeRequest({ policy_id: "policy/outm28", m365_connection_id: "connection-outm28", matter_id: "matter-outm28", expected_version: 1, idempotency_key: "revoke-outm28", reason: "사용자 요청" });
  assert.equal(revoke.path, "/api/outlook/conversation-policies/policy%2Foutm28/revoke");
  assert.deepEqual(Object.keys(revoke.body), ["m365_connection_id", "matter_id", "expected_version", "idempotency_key", "reason"]);
  assert.throws(() => createOutlookConversationPolicyCurrentRequest({ m365_connection_id: "connection-outm28", matter_id: "matter-outm28", conversation_id: "conversation-outm28", tenant_id: "hidden" }));
  assert.throws(() => createOutlookConversationPolicyEnableRequest({ m365_connection_id: "connection-outm28", matter_id: "matter-outm28", conversation_id: "conversation-outm28", seed_email_thread_id: "thread-outm28", expected_version: 0, idempotency_key: "enable-outm28", reason: "사용자 요청", seed_filing_receipt_ref: "hidden" }));
});

test("OUTM28 response parser projects safe policy state and rejects authority/provider/raw fields", () => {
  assert.throws(() => parseOutlookConversationPolicyResponse(envelope()), /operation|required/u);
  const parsed = parseOutlookConversationPolicyResponse(envelope(), { operation: "current", matter_id: "matter-outm28", conversation_id: "conversation-outm28" });
  assert.deepEqual(parsed.item, ACTIVE);
  assert.deepEqual(parsed.readiness, READY);
  for (const field of ["tenant_id", "user_id", "entra_subject_id", "mailbox_ref", "seed_email_thread_id", "seed_filing_receipt_ref", "enabling_actor_id", "provider_subscription_id", "raw_body"]) {
    assert.throws(() => parseOutlookConversationPolicyResponse(envelope({ ...ACTIVE, [field]: "hidden" }), { operation: "current" }), /unsafe|invalid/u);
  }
  for (const response of [
    envelope({ ...ACTIVE, state: "active" }),
    envelope({ ...ACTIVE, status: "ACTIVE" }),
    envelope({ ...ACTIVE, version: 0 }),
    { ...envelope(), subscription_sync: "synchronized" },
    { ...envelope(), readiness: { ...READY, provider: "graph" } },
    { ...envelope(), outcome: "success" },
  ]) assert.throws(() => parseOutlookConversationPolicyResponse(response, { operation: "current" }));
  assert.equal(parseOutlookConversationPolicyEnableResponse(mutationEnvelope()).subscription_sync, "synchronized");
  assert.equal(parseOutlookConversationPolicyRevokeResponse(mutationEnvelope({ ...ACTIVE, status: "revoked", pause_reason: "disabled", version: 2, updated_at: "2026-08-08T00:01:00.000Z", revoked_at: "2026-08-08T00:01:00.000Z" }, "revoked")).item.status, "revoked");
  assert.equal(parseOutlookConversationPolicyEnableResponse({ status: 201, body: mutationEnvelope() }).outcome, "created");
  assert.throws(() => parseOutlookConversationPolicyResponse({ status: 201, body: envelope() }, { operation: "current" }));
  assert.throws(() => parseOutlookConversationPolicyResponse(mutationEnvelope(), { operation: "current" }));
  const notReady = parseOutlookConversationPolicyResponse(envelope(null, "passed", { authoritative: true, runtime_ready: false, auto_filing_enabled: false }), { operation: "current" });
  assert.equal(notReady.item, null);
  assert.equal(notReady.readiness.runtime_ready, false);
  assert.throws(() => parseOutlookConversationPolicyResponse(envelope(null, "passed", { authoritative: false, runtime_ready: true, auto_filing_enabled: true }), { operation: "current" }));
});

test("OUTM28 SSR panel is compact, Korean, fail-closed, and connection-safe", () => {
  assert.match(render({ policy: null }), /자동 저장 끔/u);
  assert.match(render({ policy: null }), />켜기</u);
  const filingBlocked = render({ policy: null, filingRequired: true });
  assert.match(filingBlocked, /자동 저장 끔/u);
  assert.match(filingBlocked, /Matter에 메일을 먼저 저장해 주세요\./u);
  assert.match(filingBlocked, /data-testid="outlook-conversation-policy-action"[^>]*disabled/u);
  assert.match(render({ policy: ACTIVE }), /자동 저장 켬/u);
  const activeSyncPending = render({ policy: ACTIVE, syncPending: true });
  assert.match(activeSyncPending, /자동 저장 켬/u);
  assert.match(activeSyncPending, /동기화 필요/u);
  assert.doesNotMatch(activeSyncPending, /data-testid="outlook-conversation-policy-action"[^>]*disabled/u);
  const paused = render({ policy: { ...ACTIVE, status: "paused", pause_reason: "connection_invalid" }, readiness: { ...READY, auto_filing_enabled: false } });
  assert.match(paused, /자동 저장 켬/u);
  assert.match(paused, /동기화 필요/u);
  assert.doesNotMatch(paused, /data-testid="outlook-conversation-policy-action"[^>]*disabled/u);
  const activeUnready = render({ policy: ACTIVE, readiness: { ...READY, runtime_ready: false } });
  assert.match(activeUnready, /자동 저장 켬/u);
  assert.match(activeUnready, /동기화 필요/u);
  assert.doesNotMatch(activeUnready, /data-testid="outlook-conversation-policy-action"[^>]*disabled/u);
  const revokedFilingBlocked = render({ policy: { ...ACTIVE, status: "revoked", pause_reason: "disabled", version: 2, updated_at: "2026-08-08T00:01:00.000Z", revoked_at: "2026-08-08T00:01:00.000Z" }, filingRequired: true });
  assert.match(revokedFilingBlocked, /Matter에 메일을 먼저 저장해 주세요\./u);
  assert.match(revokedFilingBlocked, /data-testid="outlook-conversation-policy-action"[^>]*disabled/u);
  const activeFilingIgnored = render({ policy: ACTIVE, filingRequired: true });
  assert.match(activeFilingIgnored, /자동 저장 켬/u);
  assert.match(activeFilingIgnored, />끄기</u);
  assert.doesNotMatch(activeFilingIgnored, /Matter에 메일을 먼저 저장해 주세요\./u);
  const blocked = render({ policy: ACTIVE, connectionRequired: true });
  assert.match(blocked, />다시 연결</u);
  assert.match(blocked, /disabled/u);
  const busy = render({ policy: ACTIVE, busy: true });
  assert.match(busy, /aria-busy="true"/u);
  assert.match(busy, /처리 중/u);
  assert.match(busy, /role="status"[^>]*aria-live="polite"/u);
  assert.doesNotMatch(blocked, /Graph|provider|tenant|entra|mailbox|subscription|raw/iu);
});

test("OUTM28 rendered button performs one action and stays disabled while busy", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto(`${origin}/outlook-conversation-policy-test.html`, { waitUntil: "networkidle" });
    await page.evaluate(() => window.__render({ policy: null, readiness: { authoritative: true, runtime_ready: true, auto_filing_enabled: true } }));
    await page.locator("[data-testid='outlook-conversation-policy-action']").click();
    assert.deepEqual(await page.evaluate(() => window.__calls), ["enable"]);
    await page.evaluate((policy) => window.__render({ policy, readiness: { authoritative: true, runtime_ready: false, auto_filing_enabled: false } }), ACTIVE);
    await page.waitForFunction(() => document.querySelector("[data-testid='outlook-conversation-policy-action']")?.textContent === "끄기");
    assert.equal(await page.locator("[data-testid='outlook-conversation-policy-action']").isDisabled(), false);
    await page.locator("[data-testid='outlook-conversation-policy-action']").click();
    assert.deepEqual(await page.evaluate(() => window.__calls), ["enable", "revoke"]);
    const paused = { ...ACTIVE, status: "paused", pause_reason: "connection_invalid" };
    await page.evaluate((policy) => window.__render({ policy, readiness: { authoritative: true, runtime_ready: true, auto_filing_enabled: false } }), paused);
    await page.waitForFunction(() => document.querySelector("[data-testid='outlook-conversation-policy-action']")?.textContent === "끄기");
    assert.match(await page.locator("[data-testid='outlook-conversation-policy-status']").textContent(), /동기화 필요/u);
    await page.locator("[data-testid='outlook-conversation-policy-action']").click();
    assert.deepEqual(await page.evaluate(() => window.__calls), ["enable", "revoke", "revoke"]);
    await page.evaluate(() => window.__render({ policy: null, readiness: { authoritative: true, runtime_ready: true, auto_filing_enabled: true }, filingRequired: true }));
    await page.waitForFunction(() => document.querySelector("[data-testid='outlook-conversation-policy-action']")?.disabled === true);
    assert.equal(await page.locator("[data-testid='outlook-conversation-policy-status']").textContent(), "Matter에 메일을 먼저 저장해 주세요.");
    await page.locator("[data-testid='outlook-conversation-policy-action']").click({ force: true });
    assert.deepEqual(await page.evaluate(() => window.__calls), ["enable", "revoke", "revoke"]);
    await page.evaluate((policy) => window.__render({ policy, readiness: { authoritative: true, runtime_ready: true, auto_filing_enabled: true }, busy: true }), ACTIVE);
    await page.waitForFunction(() => document.querySelector("[data-testid='outlook-conversation-policy-action']")?.disabled === true);
    const button = page.locator("[data-testid='outlook-conversation-policy-action']");
    assert.equal(await button.isDisabled(), true);
    await button.click({ force: true });
    assert.deepEqual(await page.evaluate(() => window.__calls), ["enable", "revoke", "revoke"]);
    await page.evaluate(() => window.__render({ policy: null, readiness: { authoritative: true, runtime_ready: true, auto_filing_enabled: true }, connectionRequired: true }));
    await page.waitForFunction(() => document.querySelector("[data-testid='outlook-conversation-policy-action']")?.textContent === "다시 연결");
    assert.equal(await page.locator("[data-testid='outlook-conversation-policy-action']").textContent(), "다시 연결");
    assert.equal(await page.locator("[data-testid='outlook-conversation-policy-action']").isDisabled(), false);
  } finally {
    await page.close();
    await browser.close();
  }
});
