import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";
import { readyOutlookReadinessResponse } from "./helpers/outlook-readiness-fixture.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIST = path.join(ROOT, "apps/addin/dist");
const SCREENSHOT_DIR = process.env.LAWOS_TODO10_SCREENSHOT_DIR ?? "";
const OLD_SESSION = "lawos_session_v1.todo10-expired";
const SESSION = "lawos_session_v1.todo10-browser";
const PRINCIPAL_REF = `odpr_${"B".repeat(43)}`;
const STARTUP_PATHS = [
  "/api/auth/session",
  "/api/auth/office-sso/exchange",
  "/api/outlook/connection",
  "/api/outlook/readiness",
  "/api/outlook/bootstrap",
];
const json = (body, status = 200) => ({
  status,
  contentType: "application/json; charset=utf-8",
  body: JSON.stringify(body),
});

test("built startup 401 opens one NAA popup, then 20 ItemChanged events make zero startup calls", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const requests = [];
  await page.addInitScript(() => {
    const makeItem = (index) => ({
      itemId: `office-todo10-${index}`,
      subject: `Todo10 item ${index}`,
      internetMessageId: `<todo10-${index}@example.invalid>`,
      conversationId: `todo10-conversation-${index}`,
      from: { displayName: "Sender", emailAddress: "sender@example.invalid" },
      to: [],
      attachments: [],
      body: {
        getAsync(_type, callback) {
          callback({ status: "succeeded", value: `body-${index}` });
        },
      },
      getAllInternetHeadersAsync(callback) {
        callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" });
      },
    });
    const items = Array.from({ length: 26 }, (_, index) => makeItem(index));
    const handlers = [];
    const mailbox = {
      item: items[0],
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
      MailboxEnums: {
        RestVersion: { v2_0: "v2.0" },
        CoercionType: { Text: "text" },
      },
      context: {
        requirements: {
          isSetSupported(name, version) {
            return name === "NestedAppAuth" && version === "1.1";
          },
        },
        mailbox,
      },
    };

    let bridgeMessageHandler = null;
    let pendingPopupRequest = null;
    const methods = [];
    const send = (response) => queueMicrotask(() => {
      bridgeMessageHandler?.({ data: JSON.stringify(response) });
    });
    const tokenResponse = (requestId) => ({
      requestId,
      success: true,
      token: {
        access_token: "entra-access-token-must-stay-memory-only",
        id_token: "eyJhbGciOiJub25lIn0.eyJvaWQiOiJ0b2RvMTAtdXNlciIsInRpZCI6InRvZG8xMC10ZW5hbnQifQ.signature",
        expires_in: 3600,
        scope: "api://browser-client/access_as_user",
        authority: "https://login.microsoftonline.com/organizations",
      },
      account: {
        homeAccountId: "todo10-user.todo10-tenant",
        username: "qa@example.invalid",
        tenantId: "todo10-tenant",
        localAccountId: "todo10-user",
        environment: "login.microsoftonline.com",
      },
    });
    window.nestedAppAuthBridge = {
      addEventListener(_type, handler) { bridgeMessageHandler = handler; },
      postMessage(raw) {
        const request = JSON.parse(raw);
        methods.push(request.method);
        if (request.method === "GetInitContext") {
          send({
            requestId: request.requestId,
            success: true,
            initContext: {
              sdkName: "todo10-browser-test",
              sdkVersion: "1.0.0",
              accountContext: null,
              capabilities: {},
            },
          });
          return;
        }
        if (request.method === "GetToken") {
          send({
            requestId: request.requestId,
            success: false,
            error: {
              status: "USER_INTERACTION_REQUIRED",
              code: "interaction_required",
              description: "interactive login required",
            },
          });
          return;
        }
        if (request.method === "GetTokenPopup") {
          pendingPopupRequest = request;
          return;
        }
        throw new Error(`Unexpected NAA method: ${request.method}`);
      },
    };
    window.__TODO10_AUTH = () => ({
      methods: [...methods],
      popupPending: Boolean(pendingPopupRequest),
      activeItemHandlers: handlers.length,
    });
    window.__TODO10_RELEASE_POPUP = () => {
      if (!pendingPopupRequest) throw new Error("NAA popup is not pending");
      const request = pendingPopupRequest;
      pendingPopupRequest = null;
      send(tokenResponse(request.requestId));
    };
    window.__TODO10_SET_ITEM = (index) => {
      mailbox.item = items[index];
      handlers.slice().forEach((handler) => handler());
    };
    window.__TODO10_STORAGE = () => ({
      local: Object.entries(localStorage),
      session: Object.entries(sessionStorage),
    });
    let itemChangedActivityObserver = null;
    const itemChangedActivity = { busyMounts: 0 };
    window.__TODO10_START_ITEM_CHANGED_ACTIVITY_PROBE = () => {
      itemChangedActivityObserver?.disconnect();
      itemChangedActivity.busyMounts = 0;
      itemChangedActivityObserver = new MutationObserver((records) => {
        for (const record of records) {
          for (const node of record.addedNodes) {
            if (!(node instanceof Element)) continue;
            if (node.matches("[data-testid='busy-state']")) {
              itemChangedActivity.busyMounts += 1;
            }
            itemChangedActivity.busyMounts += node.querySelectorAll?.(
              "[data-testid='busy-state']",
            ).length ?? 0;
          }
        }
      });
      itemChangedActivityObserver.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    };
    window.__TODO10_ITEM_CHANGED_ACTIVITY = () => ({ ...itemChangedActivity });
    window.sessionStorage.setItem("lawos_addin_session_token", "lawos_session_v1.todo10-expired");
  });

  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  let connectionAttempts = 0;
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    requests.push({ path: url.pathname, method: route.request().method() });
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
    if (url.pathname === "/api/auth/office-sso/exchange") {
      assert.deepEqual(route.request().postDataJSON(), {
        access_token: "entra-access-token-must-stay-memory-only",
      });
      return route.fulfill(json({ session_token: SESSION }));
    }
    if (url.pathname === "/api/auth/session") {
      const authorization = route.request().headers().authorization;
      assert.equal([`Bearer ${OLD_SESSION}`, `Bearer ${SESSION}`].includes(authorization), true);
      return route.fulfill(json({
        authenticated: true,
        principal: { tenant_id: "todo10-tenant", user_id: "todo10-user" },
        session: {
          tenant_id: "todo10-tenant",
          user_id: "todo10-user",
          outlook_desktop_principal_ref: PRINCIPAL_REF,
        },
      }));
    }
    if (url.pathname === "/api/outlook/connection") {
      connectionAttempts += 1;
      if (connectionAttempts === 1) {
        assert.equal(route.request().headers().authorization, `Bearer ${OLD_SESSION}`);
        return route.fulfill(json({ safe_error_code: "AUTH_SESSION_INVALID" }, 401));
      }
      assert.equal(route.request().headers().authorization, `Bearer ${SESSION}`);
      return route.fulfill(json({ item: {
        status: "connected",
        active: true,
        connection_id: "m365_connection_todo10_browser",
        state_version: 7,
        mailbox_address: "qa@example.invalid",
      } }));
    }
    if (url.pathname === "/api/outlook/readiness") {
      return route.fulfill(json(readyOutlookReadinessResponse({ principalRef: PRINCIPAL_REF })));
    }
    if (url.pathname === "/api/outlook/bootstrap") {
      return route.fulfill(json({ item: { ready: true, marker: "todo10-browser" } }));
    }
    return route.fulfill(json({ items: [] }));
  });

  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  try {
    await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const state = window.__TODO10_AUTH?.();
      return state?.popupPending === true
        && state.activeItemHandlers === 1
        && document.querySelector("[data-testid='lawos-login-button']") === null
        && document.querySelector("[data-testid='business-gate']")?.textContent
          ?.includes("AMIC OS 로그인을 확인하고 있습니다.");
    });
    assert.deepEqual(await page.evaluate(() => window.__TODO10_AUTH().methods), [
      "GetInitContext",
      "GetTokenPopup",
    ]);
    if (SCREENSHOT_DIR) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "task-10-auth-popup-pending.png"),
        fullPage: true,
      });
    }

    const requestsBeforePendingItemChanges = requests.map((request) => ({ ...request }));
    await page.evaluate(() => window.__TODO10_START_ITEM_CHANGED_ACTIVITY_PROBE());
    for (let index = 1; index <= 5; index += 1) {
      await page.evaluate((next) => window.__TODO10_SET_ITEM(next), index);
      await page.waitForFunction((next) => (
        document.querySelector("#outlook-message-subject")?.textContent === `Todo10 item ${next}`
      ), index);
    }
    assert.deepEqual(await page.evaluate(() => window.__TODO10_AUTH().methods), [
      "GetInitContext",
      "GetTokenPopup",
    ]);
    assert.deepEqual(requests, requestsBeforePendingItemChanges);
    assert.deepEqual(await page.evaluate(() => window.__TODO10_ITEM_CHANGED_ACTIVITY()), {
      busyMounts: 0,
    });
    assert.equal(await page.locator("[data-testid='busy-state']").count(), 0);
    assert.deepEqual(
      STARTUP_PATHS.map((pathname) => requests.filter(({ path: candidate }) => candidate === pathname).length),
      [1, 0, 1, 0, 0],
    );

    await page.evaluate(() => window.__TODO10_RELEASE_POPUP());
    await page.waitForFunction(() => (
      document.querySelector("[data-feature-id='matter.search']")?.disabled === false
    ));
    await page.waitForFunction(() => {
      const raw = localStorage.getItem("lawos.outlook.prepare.v1");
      return raw && JSON.parse(raw).state === "ready";
    });
    const countStartupPaths = () => STARTUP_PATHS.map(
      (pathname) => requests.filter(({ path: candidate }) => candidate === pathname).length,
    );
    assert.deepEqual(countStartupPaths(), [2, 1, 2, 1, 1]);
    assert.deepEqual(await page.evaluate(() => window.__TODO10_AUTH().methods), [
      "GetInitContext",
      "GetTokenPopup",
    ]);
    if (SCREENSHOT_DIR) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, "task-10-auth-ready.png"),
        fullPage: true,
      });
    }

    const storage = await page.evaluate(() => window.__TODO10_STORAGE());
    assert.equal(storage.session.some(([key, value]) => (
      key === "lawos_addin_session_token" && value === "lawos_session_v1.todo10-browser"
    )), true);
    const persisted = JSON.stringify(storage);
    assert.equal(persisted.includes("entra-access-token-must-stay-memory-only"), false);
    assert.equal(persisted.includes("eyJhbGciOiJub25lIn0"), false);
    assert.equal(persisted.includes("qa@example.invalid"), false);
    assert.equal(persisted.includes("todo10-user"), false);

    const beforeItemChanges = countStartupPaths();
    const requestsBeforeReadyItemChanges = requests.map((request) => ({ ...request }));
    await page.evaluate(() => window.__TODO10_START_ITEM_CHANGED_ACTIVITY_PROBE());
    for (let index = 6; index <= 25; index += 1) {
      await page.evaluate((next) => window.__TODO10_SET_ITEM(next), index);
      await page.waitForFunction((next) => (
        document.querySelector("#outlook-message-subject")?.textContent === `Todo10 item ${next}`
      ), index);
    }
    assert.deepEqual(requests, requestsBeforeReadyItemChanges);
    assert.deepEqual(countStartupPaths(), beforeItemChanges);
    assert.deepEqual(await page.evaluate(() => window.__TODO10_AUTH().methods), [
      "GetInitContext",
      "GetTokenPopup",
    ]);
    assert.deepEqual(await page.evaluate(() => window.__TODO10_ITEM_CHANGED_ACTIVITY()), {
      busyMounts: 0,
    });
    assert.equal(await page.locator("[data-testid='busy-state']").count(), 0);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
});
