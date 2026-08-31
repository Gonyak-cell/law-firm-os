import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";
import { readyOutlookReadinessResponse } from "./helpers/outlook-readiness-fixture.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIST = path.join(ROOT, "apps/addin/dist");
const SESSION = "lawos_session_v1.lifecycle-office-only";
const json = (body, status = 200) => ({
  status,
  contentType: "application/json; charset=utf-8",
  body: JSON.stringify(body),
});

test("office-only persisted token survives late Office ready in one module flight", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const sessionRequests = [];
  await page.addInitScript((session) => {
    const subscriptions = { add: 0, remove: 0 };
    const mailbox = {
      item: {
        itemId: "office-office-only",
        subject: "Office storage lifecycle",
        internetMessageId: "<office-only@example.invalid>",
        conversationId: "office-only-conversation",
        from: { displayName: "Sender", emailAddress: "sender@example.invalid" },
        to: [],
        attachments: [],
        body: { getAsync(_type, callback) { callback({ status: "succeeded", value: "body" }); } },
        getAllInternetHeadersAsync(callback) { callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" }); },
      },
      userProfile: { emailAddress: "qa@example.invalid" },
      addHandlerAsync() { subscriptions.add += 1; },
      removeHandlerAsync() { subscriptions.remove += 1; },
      convertToRestId(id) { return id.replace("office-", "rest-"); },
    };
    window.Office = {
      onReady(callback) { callback({ host: "Outlook", platform: "web" }); },
      EventType: { ItemChanged: "itemChanged" },
      actions: { associate() {} },
      MailboxEnums: { RestVersion: { v2_0: "v2.0" }, CoercionType: { Text: "text" } },
      context: { requirements: { isSetSupported: () => false }, mailbox },
    };
    window.__OFFICE_ONLY_GET_CALLS = 0;
    window.__OFFICE_ONLY_TOKEN = session;
    window.__OFFICE_ONLY_RELEASE = null;
    window.__OFFICE_ONLY_GATE = new Promise((resolve) => { window.__OFFICE_ONLY_RELEASE = resolve; });
    window.OfficeRuntime = {
      storage: {
        async getItem() {
          window.__OFFICE_ONLY_GET_CALLS += 1;
          if (window.__OFFICE_ONLY_GET_CALLS === 1) await window.__OFFICE_ONLY_GATE;
          return window.__OFFICE_ONLY_TOKEN;
        },
        async setItem() {},
        async removeItem() {},
      },
    };
    window.__OFFICE_ONLY_SUBSCRIPTIONS = () => ({ ...subscriptions });
    window.sessionStorage.removeItem("lawos_addin_session_token");
  }, SESSION);

  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/office-sso/config") {
      return route.fulfill(json({ item: {
        configured: true,
        client_id: "browser-client",
        tenant_id: "organizations",
        api_scope: "api://browser-client/access_as_user",
        scopes: ["api://browser-client/access_as_user"],
        callback_uri: `${url.origin}/addin/oauth-callback.html`,
        authority: "https://login.microsoftonline.com/organizations",
      } }));
    }
    if (url.pathname === "/api/auth/session") {
      sessionRequests.push(route.request());
      return route.fulfill(json({ authenticated: true, session: { user_id: "office-only-user", tenant_id: "office-only-tenant", outlook_desktop_principal_ref: `odpr_${"A".repeat(43)}` } }));
    }
    if (url.pathname === "/api/outlook/connection") {
      return route.fulfill(json({ item: { status: "connected", active: true, connection_id: "m365_connection_office_storage_qa", state_version: 7, mailbox_address: "qa@example.invalid" } }));
    }
    if (url.pathname === "/api/outlook/readiness") return route.fulfill(json(readyOutlookReadinessResponse()));
    if (url.pathname === "/api/outlook/bootstrap") return route.fulfill(json({ item: { ready: true, marker: "office-only" } }));
    return route.fulfill(json({ items: [] }));
  });

  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  try {
    await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__OFFICE_ONLY_GET_CALLS >= 1);
    await page.evaluate(() => window.dispatchEvent(new Event("lawos:office-ready")));
    await page.waitForFunction(() => window.__OFFICE_ONLY_SUBSCRIPTIONS().add === 2);
    assert.equal(await page.evaluate(() => window.__OFFICE_ONLY_GET_CALLS), 1);
    assert.equal(sessionRequests.length, 0);
    const sessionRequest = page.waitForRequest((request) => request.url().endsWith("/api/auth/session"));
    await page.evaluate(() => window.__OFFICE_ONLY_RELEASE());
    await sessionRequest;
    await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);
    assert.equal(await page.evaluate(() => window.__OFFICE_ONLY_GET_CALLS), 4);
    assert.equal(sessionRequests.length, 1);
    assert.equal(sessionRequests[0].headers().authorization, `Bearer ${SESSION}`);
    assert.equal(await page.evaluate(() => window.sessionStorage.getItem("lawos_addin_session_token")), null);
    assert.equal(await page.evaluate(() => window.__OFFICE_ONLY_TOKEN), SESSION);
    assert.equal(await page.locator("[data-testid='lawos-login-button']").count(), 0);
    assert.doesNotMatch(await page.locator("body").innerText(), /로그인 중입니다|로그인 세션 확인/u);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
});

test("token installation owns B before a held Office write and never sends an authless restart read", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const tokenB = "lawos_session_v1.lifecycle-token-b";
  const sessionRequests = [];
  let authLoss = false;
  await page.addInitScript((token) => {
    let bridgeHandler = null;
    let silentCalls = 0;
    const subscriptions = { add: 0, remove: 0 };
    const mailbox = {
      item: { itemId: "office-token-race", subject: "Token race", internetMessageId: "<token-race@example.invalid>", conversationId: "token-race", from: { displayName: "Sender", emailAddress: "sender@example.invalid" }, to: [], attachments: [], body: { getAsync(_type, callback) { callback({ status: "succeeded", value: "body" }); } }, getAllInternetHeadersAsync(callback) { callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" }); } },
      userProfile: { emailAddress: "qa@example.invalid" }, addHandlerAsync() { subscriptions.add += 1; }, removeHandlerAsync() { subscriptions.remove += 1; }, convertToRestId(id) { return id.replace("office-", "rest-"); },
    };
    window.Office = { onReady(callback) { callback({ host: "Outlook", platform: "web" }); }, EventType: { ItemChanged: "itemChanged" }, actions: { associate() {} }, MailboxEnums: { RestVersion: { v2_0: "v2.0" }, CoercionType: { Text: "text" } }, context: { requirements: { isSetSupported: () => true }, mailbox } };
    window.__TOKEN_RACE_OFFICE_TOKEN = null;
    window.__TOKEN_RACE_AUTH_LOSS = false;
    window.__TOKEN_RACE_SET_STARTED = false;
    window.__TOKEN_RACE_RELEASE = null;
    window.__TOKEN_RACE_GATE = new Promise((resolve) => { window.__TOKEN_RACE_RELEASE = resolve; });
    window.OfficeRuntime = { storage: { async getItem() { return window.__TOKEN_RACE_OFFICE_TOKEN; }, async setItem(_key, value) { window.__TOKEN_RACE_OFFICE_TOKEN = value; window.__TOKEN_RACE_SET_STARTED = true; await window.__TOKEN_RACE_GATE; }, async removeItem() { window.__TOKEN_RACE_OFFICE_TOKEN = null; } } };
    window.__TOKEN_RACE_SUBSCRIPTIONS = () => ({ ...subscriptions });
    window.nestedAppAuthBridge = { addEventListener(_type, handler) { bridgeHandler = handler; }, postMessage(raw) { const request = JSON.parse(raw); const response = request.method === "GetInitContext" ? { requestId: request.requestId, success: true, initContext: { sdkName: "browser-test", sdkVersion: "1.0.0", accountContext: null, capabilities: {} } } : (++silentCalls === 1 ? { requestId: request.requestId, success: true, token: { access_token: "entra-B", id_token: "eyJhbGciOiJub25lIn0.eyJvaWQiOiJicm93c2VyLUIiLCJ0aWQiOiJicm93c2VyLXRlbmFudCIsInByZWZlcnJlZF91c2VybmFtZSI6InFhQGV4YW1wbGUuaW52YWxpZCIsIm5hbWUiOiJCIn0.signature", expires_in: 3600, scope: "api://browser-client/access_as_user", authority: "https://login.microsoftonline.com/organizations" }, account: { homeAccountId: "browser-B.browser-tenant", username: "qa@example.invalid", tenantId: "browser-tenant", localAccountId: "browser-B", environment: "login.microsoftonline.com" } } : { requestId: request.requestId, success: false, error: { code: "interaction_required", message: "interactive login required" } }); queueMicrotask(() => bridgeHandler?.({ data: JSON.stringify(response) })); } };
    window.sessionStorage.removeItem("lawos_addin_session_token");
  }, tokenB);
  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === "/api/auth/office-sso/config") return route.fulfill(json({ item: { configured: true, client_id: "browser-client", tenant_id: "organizations", api_scope: "api://browser-client/access_as_user", scopes: ["api://browser-client/access_as_user"], callback_uri: `${url.origin}/addin/oauth-callback.html`, authority: "https://login.microsoftonline.com/organizations" } }));
    if (url.pathname === "/api/auth/office-sso/exchange") return route.fulfill(json({ session_token: tokenB }));
    if (url.pathname === "/api/auth/session") { sessionRequests.push(route.request()); return route.fulfill(json({ authenticated: true, session: { user_id: "token-race-user", tenant_id: "token-race-tenant", outlook_desktop_principal_ref: `odpr_${"A".repeat(43)}` } })); }
    if (url.pathname === "/api/outlook/connection") return route.fulfill(json({ item: { status: "connected", active: true, connection_id: "m365_connection_office_storage_qa", state_version: 7, mailbox_address: "qa@example.invalid" } }));
    if (url.pathname === "/api/outlook/readiness") return route.fulfill(json(readyOutlookReadinessResponse()));
    if (url.pathname === "/api/outlook/bootstrap") return route.fulfill(json({ item: { ready: true, marker: "token-race" } }));
    if (url.pathname === "/api/outlook/matters" && url.searchParams.has("q") && authLoss) return route.fulfill({ status: 401, contentType: "text/plain; charset=utf-8", body: "" });
    return route.fulfill(json({ items: [] }));
  });
  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  try {
    await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__TOKEN_RACE_SET_STARTED === true);
    await page.evaluate(() => window.dispatchEvent(new Event("lawos:office-ready")));
    await page.waitForFunction(() => window.__TOKEN_RACE_SUBSCRIPTIONS().add === 2);
    assert.equal(sessionRequests.length, 0);
    await page.evaluate(() => window.__TOKEN_RACE_RELEASE());
    await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);
    assert.equal(sessionRequests.length, 1);
    assert.equal(sessionRequests[0].headers().authorization, `Bearer ${tokenB}`);
    assert.equal(await page.evaluate(() => window.__TOKEN_RACE_OFFICE_TOKEN), tokenB);
    assert.equal(await page.evaluate(() => window.sessionStorage.getItem("lawos_addin_session_token")), tokenB);
    assert.equal(await page.locator("[data-testid='lawos-login-button']").count(), 0);
    assert.doesNotMatch(await page.locator("body").innerText(), /로그인 중입니다|로그인 세션 확인/u);
    authLoss = true;
    await page.locator("[data-feature-id='matter.search']").click();
    await page.locator("#matter-search-input").fill("after-auth-loss");
    await page.waitForFunction(() => document.querySelector("[data-testid='lawos-login-button']"));
    await page.waitForFunction(() => window.__TOKEN_RACE_OFFICE_TOKEN === null && sessionStorage.getItem("lawos_addin_session_token") === null);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
});
