import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";
import { readyOutlookReadinessResponse } from "./helpers/outlook-readiness-fixture.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIST = path.join(ROOT, "apps/addin/dist");
const SESSION = "lawos_session_v1.todo9-main";
const PRINCIPAL_REF = `odpr_${"A".repeat(43)}`;
const FORBIDDEN = [
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

test("built taskpane prepares once and 20 ItemChanged events stay item-only", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const requests = [];
  await page.addInitScript(({ session }) => {
    const makeItem = (index) => ({
      itemId: `office-todo9-${index}`,
      subject: `Todo9 item ${index}`,
      internetMessageId: `<todo9-${index}@example.invalid>`,
      conversationId: `todo9-conversation-${index}`,
      from: { displayName: "Sender", emailAddress: "sender@example.invalid" },
      to: [],
      attachments: [],
      body: { getAsync(_type, callback) { callback({ status: "succeeded", value: `body-${index}` }); } },
      getAllInternetHeadersAsync(callback) {
        callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" });
      },
    });
    const items = Array.from({ length: 21 }, (_, index) => makeItem(index));
    const handlers = [];
    const subscriptions = { add: 0, remove: 0 };
    const officeRuntimeCalls = [];
    const officeRuntimeValues = new Map();
    const mailbox = {
      item: items[0],
      userProfile: { emailAddress: "qa@example.invalid" },
      addHandlerAsync(_type, handler) { subscriptions.add += 1; handlers.push(handler); },
      removeHandlerAsync(_type, { handler } = {}) {
        subscriptions.remove += 1;
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
      context: { requirements: { isSetSupported: () => false }, mailbox },
    };
    window.OfficeRuntime = { storage: {
      async getItem(key) { officeRuntimeCalls.push(["get", key]); return officeRuntimeValues.get(key) ?? null; },
      async setItem(key, value) { officeRuntimeCalls.push(["set", key]); officeRuntimeValues.set(key, value); },
      async removeItem(key) { officeRuntimeCalls.push(["remove", key]); officeRuntimeValues.delete(key); },
    } };
    window.__TODO9_DIALOGS = 0;
    window.Office.context.ui = { displayDialogAsync() { window.__TODO9_DIALOGS += 1; } };
    window.__TODO9_SET_ITEM = (index) => {
      mailbox.item = items[index];
      handlers.slice().forEach((handler) => handler());
    };
    window.__TODO9_SUBSCRIPTIONS = () => ({ ...subscriptions, active: handlers.length });
    window.__TODO9_OFFICE_RUNTIME = () => ({
      calls: officeRuntimeCalls.map((call) => [...call]),
      entries: [...officeRuntimeValues.entries()],
    });
    window.sessionStorage.setItem("lawos_addin_session_token", session);
  }, { session: SESSION });

  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", (route) => {
    const url = new URL(route.request().url());
    requests.push({ path: url.pathname, search: url.search, method: route.request().method() });
    if (url.pathname === "/api/auth/office-sso/config") return route.fulfill(json({ item: {
      configured: true,
      client_id: "browser-client",
      tenant_id: "organizations",
      api_scope: "api://browser-client/access_as_user",
      scopes: ["api://browser-client/access_as_user"],
      callback_uri: `${url.origin}/addin/oauth-callback.html`,
      authority: "https://login.microsoftonline.com/organizations",
    } }));
    if (url.pathname === "/api/auth/session") return route.fulfill(json({
      authenticated: true,
      principal: { tenant_id: "todo9-tenant", user_id: "todo9-user" },
      session: {
        tenant_id: "todo9-tenant",
        user_id: "todo9-user",
        outlook_desktop_principal_ref: PRINCIPAL_REF,
      },
    }));
    if (url.pathname === "/api/outlook/connection") return route.fulfill(json({ item: {
      status: "connected",
      active: true,
      connection_id: "m365_connection_todo9_main",
      state_version: 7,
      mailbox_address: "qa@example.invalid",
    } }));
    if (url.pathname === "/api/outlook/readiness") {
      return route.fulfill(json(readyOutlookReadinessResponse()));
    }
    if (url.pathname === "/api/outlook/bootstrap") {
      return route.fulfill(json({ item: { ready: true, marker: "todo9-cold" } }));
    }
    return route.fulfill(json({ items: [] }));
  });

  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  try {
    await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);
    await page.waitForFunction(() => document.querySelector("#outlook-message-subject")?.textContent === "Todo9 item 0");
    const count = (pathname) => requests.filter(({ path: candidate }) => candidate === pathname).length;
    assert.deepEqual(FORBIDDEN.map(count), [1, 0, 1, 1, 1]);
    assert.equal(requests.find(({ path: candidate }) => candidate === "/api/outlook/readiness")?.search, "");
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem("lawos.outlook.prepare.v1"))).state, "ready");
    assert.deepEqual(await page.evaluate(() => window.__TODO9_OFFICE_RUNTIME()), { calls: [], entries: [] });

    await page.evaluate(() => window.dispatchEvent(new Event("lawos:office-ready")));
    const observed = [];
    for (let index = 1; index <= 20; index += 1) {
      await page.evaluate((next) => window.__TODO9_SET_ITEM(next), index);
      await page.waitForFunction((next) => (
        document.querySelector("#outlook-message-subject")?.textContent === `Todo9 item ${next}`
      ), index);
      observed.push(await page.locator("#outlook-message-subject").textContent());
    }
    assert.deepEqual(observed, Array.from({ length: 20 }, (_, index) => `Todo9 item ${index + 1}`));
    assert.deepEqual(await page.evaluate(() => window.__TODO9_SUBSCRIPTIONS()), {
      add: 2,
      remove: 1,
      active: 1,
    });
    assert.deepEqual(FORBIDDEN.map(count), [1, 0, 1, 1, 1]);
    assert.equal(await page.evaluate(() => window.__TODO9_DIALOGS), 0);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);
    await page.waitForFunction(() => document.querySelector("#outlook-message-subject")?.textContent === "Todo9 item 0");
    assert.deepEqual(FORBIDDEN.map(count), [2, 0, 2, 2, 1]);
    assert.equal(
      requests.filter(({ path: candidate }) => candidate === "/api/outlook/readiness")
        .every(({ search }) => search === ""),
      true,
    );
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem("lawos.outlook.prepare.v1"))).state, "ready");
    assert.deepEqual(await page.evaluate(() => window.__TODO9_OFFICE_RUNTIME()), { calls: [], entries: [] });
    assert.equal(await page.evaluate(() => window.__TODO9_DIALOGS), 0);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
});
