import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";
import { readyOutlookReadinessResponse } from "./helpers/outlook-readiness-fixture.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIST = path.join(ROOT, "apps/addin/dist");
const MATTER = "matter-todo9-busy";
const json = (body, status = 200) => ({
  status,
  contentType: "application/json; charset=utf-8",
  body: JSON.stringify(body),
});
const item = (key) => ({
  itemId: `office-busy-${key}`,
  subject: `Busy item ${key}`,
  internetMessageId: `<busy-${key}@example.invalid>`,
  conversationId: `busy-conversation-${key}`,
  from: { displayName: "Sender", emailAddress: "sender@example.invalid" },
  to: [],
  attachments: [],
  body: { getAsync(_type, callback) { callback({ status: "succeeded", value: `body-${key}` }); } },
  getAllInternetHeadersAsync(callback) {
    callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" });
  },
});

test("built ItemChanged clears busy without cancelling or repainting an issued write", async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  const requests = [];
  let releaseTask;
  const heldTask = new Promise((resolve) => { releaseTask = resolve; });

  await page.addInitScript(({ first, second, token }) => {
    const items = { A: first, B: second };
    const handlers = [];
    const subscriptions = { add: 0, remove: 0 };
    const mailbox = {
      item: items.A,
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
      async getItem() { return null; },
      async setItem() {},
      async removeItem() {},
    } };
    window.__BUSY_SET_ITEM = (key) => {
      mailbox.item = items[key];
      handlers.slice().forEach((handler) => handler());
    };
    window.__BUSY_SUBSCRIPTIONS = () => ({ ...subscriptions, active: handlers.length });
    window.sessionStorage.setItem("lawos_addin_session_token", token);
  }, {
    first: item("A"),
    second: item("B"),
    token: "lawos_session_v1.todo9-busy",
  });

  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const body = request.postDataJSON?.() ?? {};
    requests.push({ path: url.pathname, method, body });
    const fulfill = (payload, status = 200) => route.fulfill(json(payload, status));
    if (url.pathname === "/api/auth/office-sso/config") return fulfill({ item: {
      configured: true,
      client_id: "browser-client",
      tenant_id: "organizations",
      api_scope: "api://browser-client/access_as_user",
      scopes: ["api://browser-client/access_as_user"],
      callback_uri: `${url.origin}/addin/oauth-callback.html`,
      authority: "https://login.microsoftonline.com/organizations",
    } });
    if (url.pathname === "/api/auth/session") return fulfill({ authenticated: true, session: {
      tenant_id: "todo9-tenant",
      user_id: "todo9-user",
      outlook_desktop_principal_ref: `odpr_${"A".repeat(43)}`,
    } });
    if (url.pathname === "/api/outlook/connection") return fulfill({ item: {
      status: "connected",
      active: true,
      connection_id: "m365_connection_todo9_busy",
      state_version: 7,
      mailbox_address: "qa@example.invalid",
    } });
    if (url.pathname === "/api/outlook/readiness") return fulfill(readyOutlookReadinessResponse());
    if (url.pathname === "/api/outlook/bootstrap") return fulfill({ item: { ready: true } });
    if (url.pathname === "/api/outlook/matters") return fulfill({ items: [{
      matter_id: MATTER,
      matter_code: "M-T9",
      title: "Todo9 Busy Matter",
      client_display_name: "Client",
      status: "open",
    }] });
    if (url.pathname === "/api/outlook/messages/identity") return fulfill({ item: {
      canonical_graph_message_id: `canonical-${body.rest_message_id}`,
      rest_message_id: body.rest_message_id,
      internet_message_id: body.internet_message_id,
      conversation_id: body.conversation_id,
    } });
    if (url.pathname === "/api/outlook/tasks" && method === "POST") {
      await heldTask;
      return fulfill({
        request_id: "held-task-A",
        outcome: "task_created",
        item: { activity_id: "task-A", version: 1, title: "HELD-A" },
      });
    }
    return fulfill({ items: [] });
  });

  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  try {
    await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-feature-id='task.create']")?.disabled === false);
    assert.deepEqual(await page.evaluate(() => window.__BUSY_SUBSCRIPTIONS()), { add: 1, remove: 0, active: 1 });
    await page.locator("[data-feature-id='matter.search']").click();
    await page.locator("#matter-search-input").fill(MATTER);
    await page.waitForFunction((value) => document.querySelector(`#matter-select option[value='${value}']`), MATTER);
    await page.locator("#matter-select").selectOption(MATTER);
    await page.locator("[data-testid='outlook-overlay-close']").click();
    await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });

    await page.locator("[data-feature-id='task.create']").click();
    await page.locator("#task-draft-title").fill("HELD-A");
    const issued = page.waitForRequest((request) => (
      request.url().endsWith("/api/outlook/tasks") && request.method() === "POST"
    ));
    await page.locator("[data-testid='create-task-button']").click();
    await issued;
    assert.equal(await page.locator("[data-testid='busy-state']").count(), 1);
    assert.equal(requests.filter(({ path, method }) => path === "/api/outlook/tasks" && method === "POST").length, 1);

    await page.evaluate(() => window.__BUSY_SET_ITEM("B"));
    await page.waitForFunction(() => document.querySelector("#outlook-message-subject")?.textContent === "Busy item B");
    assert.equal(await page.locator("[data-testid='busy-state']").count(), 0);
    assert.equal(await page.locator("#task-draft-title").count(), 0);
    const response = page.waitForResponse((candidate) => (
      candidate.url().endsWith("/api/outlook/tasks") && candidate.request().method() === "POST"
    ));
    releaseTask();
    await response;
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => resolve())));
    assert.equal(await page.locator("[data-testid='busy-state']").count(), 0);
    assert.equal(await page.locator("#outlook-message-subject").textContent(), "Busy item B");
    assert.doesNotMatch(await page.locator("body").innerText(), /HELD-A|task-A|held-task-A/u);
    assert.equal(requests.filter(({ path, method }) => path === "/api/outlook/tasks" && method === "POST").length, 1);
  } finally {
    releaseTask();
    await page.close();
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
});
