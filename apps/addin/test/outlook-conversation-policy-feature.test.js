import assert from "node:assert/strict";
import http from "node:http";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";
const ADDIN_ROOT = fileURLToPath(new URL("../", import.meta.url));
const READY = Object.freeze({ authoritative: true, runtime_ready: true, auto_filing_enabled: true });
const UNREADY = Object.freeze({ authoritative: true, runtime_ready: false, auto_filing_enabled: false });
const BASE = Object.freeze({ contextKey: "context-a", matterId: "matter-a", conversationId: "conversation-a", m365ConnectionId: "connection-a", seedEmailThreadId: "thread-a" });
let vite, server, browser, origin;
function policy(status, values = {}) {
  return {
    policy_id: values.policy_id ?? `policy-${values.matter_id ?? "a"}`,
    conversation_id: values.conversation_id ?? "conversation-a", matter_id: values.matter_id ?? "matter-a", status,
    pause_reason: status === "paused" ? "동기화 대기" : null,
    version: values.version ?? 2, created_at: "2026-08-08T00:00:00.000Z", updated_at: "2026-08-08T00:01:00.000Z",
    revoked_at: status === "revoked" ? "2026-08-08T00:02:00.000Z" : null,
  };
}
const current = (item, readiness = READY) => ({ request_id: "request-current", outcome: "passed", item, readiness, safe_error_codes: [], production_ready_claim: false });
const mutation = (item, outcome, subscription_sync = "synchronized") => ({ request_id: "request-mutation", outcome, item, subscription_sync, safe_error_codes: [], production_ready_claim: false });
test.before(async () => {
  vite = await createServer({ root: ADDIN_ROOT, configFile: `${ADDIN_ROOT}/vite.config.js`, appType: "custom", logLevel: "silent", server: { middlewareMode: true } });
  server = http.createServer(async (request, response) => {
    if (request.url === "/conversation-feature-test.html") {
      const html = await vite.transformIndexHtml(request.url, `<!doctype html><html lang="ko"><body><div id="root"></div><script type="module">
        import React from "react";
        import { createRoot } from "react-dom/client";
        import "/src/styles.css";
        import { OutlookConversationPolicyFeature } from "/src/outlook-conversation-policy-feature.jsx";
        const root = createRoot(document.getElementById("root"));
        const pending = []; window.__requests = []; window.__activeContext = ""; window.__reconnects = 0;
        const dispatch = (requestTag, path, options = {}) => new Promise((resolve, reject) => {
          window.__requests.push({ requestTag, path, options }); pending.push({ resolve, reject });
        });
        window.__render = (input) => {
          const { omitContextCheck, omitRequestClient, requestTag = "default", ...props } = input;
          const requestJson = (path, options) => dispatch(requestTag, path, options);
          window.__activeContext = props.contextKey;
          root.render(React.createElement(OutlookConversationPolicyFeature, { ...props, requestJson: omitRequestClient ? undefined : requestJson, isContextCurrent: omitContextCheck ? undefined : (snapshot) => snapshot.contextKey === window.__activeContext, onReconnect: () => { window.__reconnects += 1; } }));
        };
        window.__resolve = (index, body) => pending[index].resolve(body);
        window.__reject = (index, value) => pending[index].reject(Object.assign(new Error(value.message), value));
        window.__unmount = () => root.unmount();
      </script></body></html>`);
      response.setHeader("content-type", "text/html; charset=utf-8"); response.end(html); return;
    }
    vite.middlewares(request, response, () => { response.statusCode = 404; response.end("not found"); });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`; browser = await chromium.launch({ headless: true });
});
test.after(async () => { await browser?.close(); await new Promise((resolve) => server?.close(resolve)); await vite?.close(); });
async function openFeature(props = BASE) {
  const page = await browser.newPage(); await page.goto(`${origin}/conversation-feature-test.html`);
  await page.waitForFunction(() => typeof window.__render === "function"); await page.evaluate((value) => window.__render(value), props);
  return page;
}
const render = (page, props) => page.evaluate((value) => window.__render(value), props);
const waitRequests = (page, count) => page.waitForFunction((expected) => window.__requests.length === expected, count);
const resolve = (page, index, body) => page.evaluate(({ requestIndex, value }) => window.__resolve(requestIndex, value), { requestIndex: index, value: body });
const reject = (page, index, value) => page.evaluate(({ requestIndex, error }) => window.__reject(requestIndex, error), { requestIndex: index, error: value });
const nextFrame = (page) => page.evaluate(() => new Promise(requestAnimationFrame));
const waitIdle = (page) => page.locator("[data-testid=outlook-conversation-policy-panel][aria-busy=false]").waitFor();
async function openLoaded(item, readiness = READY, props = BASE) {
  const page = await openFeature(props);
  await waitRequests(page, 1); await resolve(page, 0, current(item, readiness)); await waitIdle(page);
  return page;
}
async function assertView(page, status, label, action) {
  await page.locator(`[data-policy-status=${status}]`).waitFor(); assert.equal(await page.locator(".outlook-flat-action-label").textContent(), label);
  assert.equal(await page.getByTestId("outlook-conversation-policy-action").textContent(), action);
}
test("current readback renders none, active, paused, and revoked", async () => {
  const page = await openFeature();
  const cases = [[null, "unknown", "자동 저장 끔", "켜기"], [policy("active"), "active", "자동 저장 켬", "끄기"], [policy("paused"), "paused", "자동 저장 켬", "끄기"], [policy("revoked"), "revoked", "자동 저장 끔", "켜기"]];
  for (let index = 0; index < cases.length; index += 1) {
    const [item, status, label, action] = cases[index];
    const props = index === 0 ? BASE : { ...BASE, contextKey: `context-${index}` };
    if (index > 0) await render(page, props);
    await waitRequests(page, index + 1); await resolve(page, index, current(item)); await assertView(page, status, label, action);
    if (index === 0) {
      await render(page, props); await nextFrame(page); assert.equal(await page.evaluate(() => window.__requests.length), 1);
    }
  }
  await page.close();
});
test("filing, connection, context key, and context callback prerequisites fail closed", async () => {
  const page = await openFeature({ ...BASE, seedEmailThreadId: "" });
  await waitRequests(page, 1); await resolve(page, 0, current(null)); await waitIdle(page);
  assert.equal(await page.getByTestId("outlook-conversation-policy-action").isDisabled(), true); assert.equal(await page.getByTestId("outlook-conversation-policy-status").textContent(), "Matter에 메일을 먼저 보관해 주세요.");
  await render(page, { ...BASE, contextKey: "context-revoked-no-seed", seedEmailThreadId: "" });
  await waitRequests(page, 2); await resolve(page, 1, current(policy("revoked"))); await waitIdle(page);
  assert.equal(await page.getByTestId("outlook-conversation-policy-action").isDisabled(), true);
  await render(page, { ...BASE, contextKey: "context-reconnect", m365ConnectionId: "", connectionRequired: true });
  await page.waitForFunction(() => document.querySelector("[data-testid=outlook-conversation-policy-action]")?.textContent === "다시 연결");
  assert.equal(await page.evaluate(() => window.__requests.length), 2); await page.getByTestId("outlook-conversation-policy-action").click();
  assert.equal(await page.evaluate(() => window.__reconnects), 1);
  await render(page, { ...BASE, contextKey: "" }); await nextFrame(page);
  assert.equal(await page.evaluate(() => window.__requests.length), 2); assert.equal(await page.getByTestId("outlook-conversation-policy-action").isDisabled(), true);
  await render(page, { ...BASE, contextKey: "context-no-callback", omitContextCheck: true }); await nextFrame(page);
  assert.equal(await page.evaluate(() => window.__requests.length), 2); assert.equal(await page.getByTestId("outlook-conversation-policy-action").isDisabled(), true);
  await render(page, { ...BASE, contextKey: "context-no-request", omitRequestClient: true }); await nextFrame(page);
  assert.equal(await page.evaluate(() => window.__requests.length), 2); assert.equal(await page.getByTestId("outlook-conversation-policy-action").isDisabled(), true);
  await page.close();
});
test("offline transition preserves active policy, disables network, and refreshes online", async () => {
  const page = await openLoaded(policy("active"));
  await render(page, { ...BASE, offline: true });
  await page.waitForFunction(() => document.querySelector("[data-testid=outlook-conversation-policy-action]")?.disabled === true);
  await assertView(page, "active", "자동 저장 켬", "끄기"); await nextFrame(page);
  assert.equal(await page.evaluate(() => window.__requests.length), 1);
  await render(page, BASE); await waitRequests(page, 2);
  await assertView(page, "active", "자동 저장 켬", "끄기");
  assert.equal(await page.getByTestId("outlook-conversation-policy-panel").getAttribute("aria-busy"), "true");
  assert.equal(await page.getByTestId("outlook-conversation-policy-action").isDisabled(), true);
  await resolve(page, 1, current(policy("paused"))); await waitIdle(page);
  await assertView(page, "paused", "자동 저장 켬", "끄기");
  await render(page, { ...BASE, offline: true }); await nextFrame(page);
  await assertView(page, "paused", "자동 저장 켬", "끄기");
  assert.equal(await page.getByTestId("outlook-conversation-policy-action").isDisabled(), true); assert.equal(await page.evaluate(() => window.__requests.length), 2);
  await page.close();
});

test("enable sends the exact contract once and applies created retry status", async () => {
  const page = await openLoaded(null);
  await page.evaluate(() => { const button = document.querySelector("[data-testid=outlook-conversation-policy-action]"); button.click(); button.click(); });
  await waitRequests(page, 2); await nextFrame(page);
  assert.equal(await page.evaluate(() => window.__requests.length), 2);
  const request = await page.evaluate(() => window.__requests[1]);
  assert.deepEqual(Object.keys(request.options.body), ["m365_connection_id", "matter_id", "conversation_id", "seed_email_thread_id", "expected_version", "idempotency_key", "reason"]);
  assert.match(request.options.body.idempotency_key, /^outlook-conversation-enable:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu);
  assert.equal(request.options.body.reason, "Outlook 대화 자동 저장 켜기");
  for (const forbidden of ["tenant_id", "actor_id", "provider", "seed_filing_receipt_ref"]) assert.equal(forbidden in request.options.body, false);
  await resolve(page, 1, mutation(policy("active"), "created", "retry_scheduled")); await assertView(page, "active", "자동 저장 켬", "끄기");
  assert.equal(await page.getByTestId("outlook-conversation-policy-status").textContent(), "동기화 필요");
  await page.close();
});

test("inline request client rerenders neither refetch nor cancel and the latest client handles the next action", async () => {
  const page = await openLoaded(null, READY, { ...BASE, requestTag: "initial" }); await render(page, { ...BASE, requestTag: "before-enable" }); await nextFrame(page);
  assert.equal(await page.evaluate(() => window.__requests.length), 1); await page.getByTestId("outlook-conversation-policy-action").click(); await waitRequests(page, 2);
  assert.equal(await page.evaluate(() => window.__requests[1].requestTag), "before-enable"); await render(page, { ...BASE, requestTag: "during-enable" }); await nextFrame(page);
  assert.equal(await page.evaluate(() => window.__requests.length), 2); assert.equal(await page.getByTestId("outlook-conversation-policy-panel").getAttribute("aria-busy"), "true");
  await resolve(page, 1, mutation(policy("active"), "created")); await assertView(page, "active", "자동 저장 켬", "끄기"); await render(page, { ...BASE, requestTag: "after-enable" }); await nextFrame(page);
  assert.equal(await page.evaluate(() => window.__requests.length), 2); await assertView(page, "active", "자동 저장 켬", "끄기"); await page.getByTestId("outlook-conversation-policy-action").click(); await waitRequests(page, 3);
  assert.equal(await page.evaluate(() => window.__requests[2].requestTag), "after-enable"); await resolve(page, 2, mutation(policy("revoked"), "revoked")); await assertView(page, "revoked", "자동 저장 끔", "켜기");
  await page.close();
});

test("enable replay never paints history and retains its key until current succeeds", async () => {
  const page = await openLoaded(null);
  await page.getByTestId("outlook-conversation-policy-action").click(); await waitRequests(page, 2);
  const first = await page.evaluate(() => window.__requests[1]);
  await reject(page, 1, { message: "response lost" }); await page.getByText("처리하지 못했습니다. 다시 시도해 주세요.").waitFor();
  await page.getByTestId("outlook-conversation-policy-action").click(); await waitRequests(page, 3);
  assert.deepEqual(await page.evaluate(() => window.__requests[2]), first);
  await resolve(page, 2, mutation(policy("active"), "idempotent_replay", "retry_scheduled")); await waitRequests(page, 4);
  await assertView(page, "unknown", "자동 저장 끔", "켜기");
  assert.equal(await page.getByTestId("outlook-conversation-policy-panel").getAttribute("aria-busy"), "true");
  await reject(page, 3, { message: "current unavailable" }); await page.getByText("처리하지 못했습니다. 다시 시도해 주세요.").waitFor();
  await assertView(page, "unknown", "자동 저장 끔", "켜기");

  await page.getByTestId("outlook-conversation-policy-action").click(); await waitRequests(page, 5);
  assert.deepEqual(await page.evaluate(() => window.__requests[4]), first);
  await resolve(page, 4, mutation(policy("active"), "idempotent_replay", "retry_scheduled")); await waitRequests(page, 6);
  await resolve(page, 5, current(policy("revoked"))); await waitIdle(page);
  await assertView(page, "revoked", "자동 저장 끔", "켜기");
  await page.close();
});

test("revoke replay keeps prior active state until fresh current wins", async () => {
  const page = await openLoaded(policy("active"));
  await page.getByTestId("outlook-conversation-policy-action").click(); await waitRequests(page, 2);
  const first = await page.evaluate(() => window.__requests[1]);
  await reject(page, 1, { message: "response lost" }); await page.getByText("처리하지 못했습니다. 다시 시도해 주세요.").waitFor();
  await page.getByTestId("outlook-conversation-policy-action").click(); await waitRequests(page, 3);
  assert.deepEqual(await page.evaluate(() => window.__requests[2]), first);
  await resolve(page, 2, mutation(policy("revoked"), "idempotent_replay")); await waitRequests(page, 4);
  await assertView(page, "active", "자동 저장 켬", "끄기");
  await resolve(page, 3, current(policy("active", { version: 3 }))); await waitIdle(page);
  await assertView(page, "active", "자동 저장 켬", "끄기");
  await page.close();
});

test("revoke sends the exact policy version contract while readiness is false", async () => {
  const page = await openLoaded(policy("active"), UNREADY);
  assert.equal(await page.getByTestId("outlook-conversation-policy-action").isEnabled(), true); assert.equal(await page.getByTestId("outlook-conversation-policy-status").textContent(), "동기화 필요");
  await page.evaluate(() => { const button = document.querySelector("[data-testid=outlook-conversation-policy-action]"); button.click(); button.click(); });
  await waitRequests(page, 2);
  const request = await page.evaluate(() => window.__requests[1]);
  assert.equal(request.path, "/api/outlook/conversation-policies/policy-a/revoke");
  assert.deepEqual(Object.keys(request.options.body), ["m365_connection_id", "matter_id", "expected_version", "idempotency_key", "reason"]);
  assert.equal(request.options.body.expected_version, 2); assert.match(request.options.body.idempotency_key, /^outlook-conversation-revoke:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu);
  assert.equal(request.options.body.reason, "Outlook 대화 자동 저장 끄기");
  for (const forbidden of ["conversation_id", "tenant_id", "actor_id", "provider", "receipt"]) assert.equal(forbidden in request.options.body, false);
  await resolve(page, 1, mutation(policy("revoked"), "revoked"));
  await assertView(page, "revoked", "자동 저장 끔", "켜기");
  await page.close();
});

test("409 refreshes current and discards the stale version and idempotency key", async () => {
  const page = await openLoaded(policy("active", { version: 2 }));
  await page.getByTestId("outlook-conversation-policy-action").click(); await waitRequests(page, 2);
  const stale = await page.evaluate(() => window.__requests[1]);
  await reject(page, 1, { message: "version conflict", status: 409 }); await waitRequests(page, 3);
  await resolve(page, 2, current(policy("active", { version: 3 }))); await waitIdle(page);
  await page.getByTestId("outlook-conversation-policy-action").click(); await waitRequests(page, 4);
  const fresh = await page.evaluate(() => window.__requests[3]);
  assert.equal(fresh.options.body.expected_version, 3); assert.notEqual(fresh.options.body.idempotency_key, stale.options.body.idempotency_key);
  await resolve(page, 3, mutation(policy("revoked", { version: 4 }), "revoked"));
  await assertView(page, "revoked", "자동 저장 끔", "켜기");
  await page.close();
});

test("context and mount fences make late reads, writes, errors, and 401 inert", async () => {
  const page = await openFeature();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message)); await waitRequests(page, 1);
  await page.evaluate(() => { window.__activeContext = "foreign"; }); await resolve(page, 0, current(policy("active"))); await nextFrame(page);
  assert.equal(await page.getByTestId("outlook-conversation-policy-panel").getAttribute("data-policy-status"), "unknown"); assert.equal(await page.getByTestId("outlook-conversation-policy-panel").getAttribute("aria-busy"), "true");

  const contextB = { ...BASE, contextKey: "context-b", matterId: "matter-b", conversationId: "conversation-b" };
  await render(page, contextB); await waitRequests(page, 2);
  await resolve(page, 1, current(null)); await waitIdle(page);
  const contextC = { ...BASE, contextKey: "context-c", matterId: "matter-c", conversationId: "conversation-c" };
  const contextD = { ...BASE, contextKey: "context-d", matterId: "matter-d", conversationId: "conversation-d" };
  await render(page, contextC); await waitRequests(page, 3);
  await render(page, contextD); await waitRequests(page, 4);
  await reject(page, 2, { message: "stale secret error" }); assert.equal(await page.getByTestId("outlook-conversation-policy-status").textContent(), "처리 중");
  await resolve(page, 3, current(policy("active", { matter_id: "matter-d", conversation_id: "conversation-d" })));
  await waitIdle(page); await page.getByTestId("outlook-conversation-policy-action").click(); await waitRequests(page, 5);
  const contextE = { ...BASE, contextKey: "context-e", matterId: "matter-e", conversationId: "conversation-e" };
  await render(page, contextE); await waitRequests(page, 6);
  await resolve(page, 5, current(null)); await waitIdle(page);
  await resolve(page, 4, mutation(policy("revoked", { matter_id: "matter-d", conversation_id: "conversation-d" }), "revoked")); await nextFrame(page);
  await assertView(page, "unknown", "자동 저장 끔", "켜기");

  await render(page, { ...BASE, contextKey: "context-401" }); await waitRequests(page, 7);
  await reject(page, 6, { message: "session expired", status: 401, safe_error_code: "AUTH_SESSION_REQUIRED" }); await nextFrame(page);
  assert.equal(await page.getByTestId("outlook-conversation-policy-panel").getAttribute("aria-busy"), "true");
  assert.equal(await page.getByText("처리하지 못했습니다. 다시 시도해 주세요.").count(), 0);
  assert.equal((await page.locator("body").textContent()).includes("session expired"), false);

  await render(page, { ...BASE, contextKey: "context-unmount" }); await waitRequests(page, 8);
  await page.evaluate(() => window.__unmount()); await resolve(page, 7, current(null)); await nextFrame(page);
  assert.equal(await page.locator("#root").textContent(), ""); assert.deepEqual(pageErrors, []);
  await page.close();
});
