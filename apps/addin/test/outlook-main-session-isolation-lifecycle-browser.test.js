import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIST = path.join(ROOT, "apps/addin/dist");
const SESSION = "lawos_session_v1.lifecycle-browser";

const json = (body, status = 200) => ({
  status,
  contentType: "application/json; charset=utf-8",
  body: JSON.stringify(body),
});

test("held initial session validation survives office-ready restart and reaches authenticated", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  let releaseInitialValidation;
  const initialValidation = new Promise((resolve) => { releaseInitialValidation = resolve; });
  let sessionValidationCount = 0;
  const requests = [];

  await page.addInitScript((session) => {
    const item = {
      itemId: "office-lifecycle",
      subject: "Lifecycle validation",
      internetMessageId: "<lifecycle@example.invalid>",
      conversationId: "lifecycle-conversation",
      from: { displayName: "Sender", emailAddress: "sender@example.invalid" },
      to: [],
      attachments: [],
      body: { getAsync(_type, callback) { callback({ status: "succeeded", value: "body" }); } },
      getAllInternetHeadersAsync(callback) { callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" }); },
    };
    const handlers = [];
    const mailbox = {
      item,
      userProfile: { emailAddress: "qa@example.invalid" },
      addHandlerAsync(_type, handler) { handlers.push(handler); },
      removeHandlerAsync(_type, { handler } = {}) {
        const index = handlers.indexOf(handler);
        if (index >= 0) handlers.splice(index, 1);
      },
      convertToRestId(id) { return id.replace("office-", "rest-"); },
    };
    window.Office = {
      onReady(callback) { callback({ host: "Outlook", platform: "web" }); },
      EventType: { ItemChanged: "itemChanged" },
      actions: { associate() {} },
      MailboxEnums: { RestVersion: { v2_0: "v2.0" }, CoercionType: { Text: "text" } },
      context: {
        requirements: { isSetSupported: () => false },
        mailbox,
      },
    };
    window.OfficeRuntime = {
      storage: {
        async getItem() { return null; },
        async setItem() {},
        async removeItem() {},
      },
    };
    window.sessionStorage.setItem("lawos_addin_session_token", session);
  }, SESSION);

  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push({ path: url.pathname, authorization: request.headers().authorization ?? "" });
    if (url.pathname === "/api/auth/office-sso/config") {
      return route.fulfill(json({
        item: {
          configured: true,
          client_id: "browser-client",
          tenant_id: "organizations",
          api_scope: "api://browser-client/access_as_user",
          scopes: ["api://browser-client/access_as_user"],
          callback_uri: `${url.origin}/addin/oauth-callback.html`,
          authority: "https://login.microsoftonline.com/organizations",
        },
      }));
    }
    if (url.pathname === "/api/auth/session") {
      sessionValidationCount += 1;
      if (sessionValidationCount === 1) {
        await initialValidation;
      }
      return route.fulfill(json({ authenticated: true, principal: { user_id: "lifecycle-user", tenant_id: "lifecycle-tenant" } }));
    }
    if (url.pathname === "/api/outlook/connection") {
      return route.fulfill(json({ item: { status: "connected", active: true, connection_id: "m365_connection_lifecycle_qa", state_version: 1, mailbox_address: "qa@example.invalid" } }));
    }
    if (url.pathname === "/api/outlook/bootstrap") {
      return route.fulfill(json({ item: { ready: true, marker: "lifecycle" } }));
    }
    return route.fulfill(json({ items: [] }));
  });

  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  try {
    const firstValidationRequest = page.waitForRequest((request) => request.url().endsWith("/api/auth/session"));
    await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });
    await firstValidationRequest;
    const restartedValidationRequest = page.waitForRequest((request) => request.url().endsWith("/api/auth/session"));
    await page.evaluate(() => window.dispatchEvent(new Event("lawos:office-ready")));
    await restartedValidationRequest;
    await page.waitForFunction(() => document.querySelectorAll("[data-feature-id='matter.search']").length > 0);
    await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);

    assert.equal(sessionValidationCount >= 2, true);
    assert.equal(await page.evaluate(() => window.sessionStorage.getItem("lawos_addin_session_token")), SESSION);
    assert.equal(await page.locator("[data-testid='lawos-login-button']").count(), 0);
    const bodyText = await page.locator("body").innerText();
    assert.match(bodyText, /Matter|메일/u);
    assert.doesNotMatch(bodyText, /로그인 중입니다|로그인 세션 확인/u);
    assert.equal(requests.filter(({ path }) => path === "/api/auth/session").length >= 2, true);
    assert.equal(requests.filter(({ path }) => path === "/api/auth/session").every(({ authorization }) => authorization === `Bearer ${SESSION}`), true);

    releaseInitialValidation();
    await page.waitForTimeout(50);
    assert.equal(await page.locator("[data-feature-id='matter.search']").isEnabled(), true);
  } finally {
    releaseInitialValidation();
    await page.close();
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
});

async function runLifecycleUnauthorizedCase({ body, contentType }) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const session = "lawos_session_v1.lifecycle-401";
  let sessionValidationCount = 0;
  await page.addInitScript((token) => {
    let bridgeHandler = null;
    const mailbox = {
      item: {
        itemId: "office-lifecycle-401",
        subject: "Lifecycle 401",
        internetMessageId: "<lifecycle-401@example.invalid>",
        conversationId: "lifecycle-401-conversation",
        from: { displayName: "Sender", emailAddress: "sender@example.invalid" },
        to: [],
        attachments: [],
        body: { getAsync(_type, callback) { callback({ status: "succeeded", value: "body" }); } },
        getAllInternetHeadersAsync(callback) { callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" }); },
      },
      userProfile: { emailAddress: "qa@example.invalid" },
      addHandlerAsync() {},
      removeHandlerAsync() {},
    };
    window.Office = {
      onReady(callback) { callback({ host: "Outlook", platform: "web" }); },
      EventType: { ItemChanged: "itemChanged" },
      actions: { associate() {} },
      MailboxEnums: { RestVersion: { v2_0: "v2.0" }, CoercionType: { Text: "text" } },
      context: { requirements: { isSetSupported: () => true }, mailbox },
    };
    window.OfficeRuntime = { storage: {
      async getItem() { return null; },
      async setItem() {},
      async removeItem() {},
    } };
    window.nestedAppAuthBridge = {
      addEventListener(_type, handler) { bridgeHandler = handler; },
      postMessage(raw) {
        const request = JSON.parse(raw);
        const response = request.method === "GetInitContext"
          ? { requestId: request.requestId, success: true, initContext: { sdkName: "browser-test", sdkVersion: "1.0.0", accountContext: null, capabilities: {} } }
          : { requestId: request.requestId, success: false, error: { code: "interaction_required", message: "interactive login required" } };
        queueMicrotask(() => bridgeHandler?.({ data: JSON.stringify(response) }));
      },
    };
    window.sessionStorage.setItem("lawos_addin_session_token", token);
  }, session);
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
      sessionValidationCount += 1;
      if (sessionValidationCount === 1) return route.fulfill(json({ authenticated: true, principal: { user_id: "lifecycle-user", tenant_id: "lifecycle-tenant" } }));
      return route.fulfill({ status: 401, contentType, body });
    }
    if (url.pathname === "/api/outlook/connection") return route.fulfill(json({ item: { status: "connected", active: true, connection_id: "m365_connection_lifecycle_qa", state_version: 1, mailbox_address: "qa@example.invalid" } }));
    if (url.pathname === "/api/outlook/bootstrap") return route.fulfill(json({ item: { ready: true, marker: "lifecycle" } }));
    return route.fulfill(json({ items: [] }));
  });
  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  try {
    await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);
    await page.evaluate(() => window.dispatchEvent(new Event("lawos:office-ready")));
    await page.waitForFunction(() => document.querySelector("[data-testid='lawos-login-button']"));
    assert.equal(sessionValidationCount, 2);
    assert.doesNotMatch(await page.locator("body").innerText(), /로그인 중입니다|로그인 세션 확인/u);
    assert.equal(await page.evaluate(() => sessionStorage.getItem("lawos_addin_session_token")), null);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
}

for (const unauthorizedCase of [
  { name: "bodyless", body: "", contentType: "text/plain; charset=utf-8" },
  { name: "HTML", body: "<html>expired</html>", contentType: "text/html; charset=utf-8" },
]) {
  test(`lifecycle restart ${unauthorizedCase.name} 401 converges to loginRequired`, async () => {
    await runLifecycleUnauthorizedCase(unauthorizedCase);
  });
}
