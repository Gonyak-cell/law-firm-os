import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";
import { localDateTimeToIso } from "../src/outlook-task-datetime.js";

const TEST_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(TEST_DIR, "../../..");
const DIST_ROOT = path.join(ROOT, "apps/addin/dist");
const MATTER = "matter-8f3", FOREIGN_MATTER = "matter-foreign";

function sourceIdentity(key) {
  const rest = `rest-${key}`;
  const internet = `<${key}@example.invalid>`;
  const conversation = `conversation-${key}`;
  return {
    canonical_graph_message_id: `canonical-${key}`,
    rest_message_id: rest,
    internet_message_id: internet,
    conversation_id: conversation,
    item_key: [rest, internet, conversation].join("\u001f"),
  };
}

function responsePayload(body, status = 200) {
  return {
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body),
  };
}

function item(key) {
  const identity = sourceIdentity(key);
  return {
    itemId: `office-${key}`,
    subject: `메일 ${key}`,
    internetMessageId: identity.internet_message_id,
    conversationId: identity.conversation_id,
    from: { displayName: "상대방", emailAddress: "sender@example.invalid" }, to: [{ displayName: "QA", emailAddress: "qa@example.invalid" }], attachments: [], dateTimeCreated: "2026-08-10T00:00:00.000Z",
    body: { getAsync(_type, callback) { callback({ status: "succeeded", value: `본문 ${key}` }); } }, getAllInternetHeadersAsync(callback) { callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" }); },
  };
}

async function openFixture(browser, web) {
  const state = {
    requests: [],
    task: null,
    patch: null,
    time: null,
    durableTaskCreates: 0,
    durableTaskUpdates: 0,
    durableTimeCreates: 0,
    hold: "",
    pending: new Map(),
    failReadback: false,
    probeOmit: false,
  };
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(({ itemA, itemB }) => {
    const items = { A: itemA, B: itemB };
    for (const [key, next] of Object.entries(items)) { next.body = { getAsync(_type, callback) { callback({ status: "succeeded", value: `본문 ${key}` }); } }; next.getAllInternetHeadersAsync = (callback) => callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" }); }
    const handlers = [];
    const mailbox = {
      item: items.A, userProfile: { emailAddress: "qa@example.invalid" },
      addHandlerAsync(_type, handler) { handlers.push(handler); },
      removeHandlerAsync(_type, { handler } = {}) { const index = handlers.indexOf(handler); if (index >= 0) handlers.splice(index, 1); },
    };
    window.Office = { onReady(callback) { callback({ host: "Outlook", platform: "web" }); }, EventType: { ItemChanged: "itemChanged" }, actions: { associate() {} }, MailboxEnums: { RestVersion: { v2_0: "v2.0" }, CoercionType: { Text: "text" } }, context: { requirements: { isSetSupported: () => false }, mailbox } };
    window.Office.context.mailbox.convertToRestId = (itemId) => itemId.replace("office-", "rest-");
    window.OfficeRuntime = { storage: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } };
    window.sessionStorage.setItem("lawos_addin_session_token", "lawos_session_v1.browser-test");
    window.__SET_OUTLOOK_ITEM = (key) => { mailbox.item = items[key]; for (const handler of [...handlers]) handler(); };
  }, { itemA: item("A"), itemB: item("B") });
  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(responsePayload("")));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    let body = {};
    try { body = request.postDataJSON() ?? {}; } catch {}
    state.requests.push({ method, path: url.pathname, query: url.search, body: structuredClone(body) });
    const fulfill = (payload, status = 200) => route.fulfill(responsePayload(payload, status));
    if (url.pathname === "/api/auth/office-sso/config") {
      return fulfill({ item: { configured: true, client_id: "browser-client", tenant_id: "organizations", api_scope: "api://browser-client/access_as_user", scopes: ["api://browser-client/access_as_user"], callback_uri: `${url.origin}/addin/oauth-callback.html`, authority: "https://login.microsoftonline.com/organizations" } });
    }
    if (url.pathname === "/api/auth/session") return fulfill({ authenticated: true, principal: { user_id: "browser-user", tenant_id: "browser-tenant" } });
    if (url.pathname === "/api/outlook/connection") return fulfill({ item: { status: "connected", active: true, connection_id: "m365_connection_editable_qa", state_version: 1, mailbox_address: "qa@example.invalid" } });
    if (["/api/outlook/bootstrap", "/api/outlook/operation-receipts/readback"].includes(url.pathname)) return fulfill(url.pathname.endsWith("readback") ? { items: [] } : { item: { ready: true } });
    if (url.pathname === "/api/outlook/matters") {
      const id = url.searchParams.get("matter_id");
      const rows = [
        { matter_id: MATTER, matter_code: "M-8F3", title: "Task Matter", client_display_name: "Client A", status: "open" },
        { matter_id: FOREIGN_MATTER, matter_code: "M-FOR", title: "Foreign Matter", client_display_name: "Client B", status: "open" },
      ];
      return fulfill({ items: id ? rows.filter((row) => row.matter_id === id) : rows });
    }
    if (url.pathname === "/api/outlook/messages/identity") {
      const key = String(body.rest_message_id ?? "").replace("rest-", "");
      return fulfill({ item: { ...sourceIdentity(key), rest_message_id: body.rest_message_id, internet_message_id: body.internet_message_id, conversation_id: body.conversation_id } });
    }
    if (url.pathname === "/api/outlook/email/file") {
      const key = String(body.email?.rest_message_id ?? "").replace("rest-", "");
      const identity = sourceIdentity(key);
      const thread = { ...identity, email_thread_id: `thread-${key}`, matter_id: body.matter_id, status: "active", filing_user: "browser-user", filing_time: "2026-08-10T00:00:00.000Z", filed_document_ids: [`document-${key}`] };
      return fulfill({ request_id: `file-${key}`, outcome: "created", filing_operation: "manual", source_identity: identity, email_thread: thread, timeline_event: { event_id: `file-event-${key}`, type: "outlook.email.filed", matter_id: body.matter_id, source_ref: thread.email_thread_id }, external_send_state: "not_applicable", attachment_state: { receipts: [], retry_attachment_ids: [] } });
    }
    if (url.pathname.endsWith("/timeline")) {
      if (state.failReadback) return fulfill({ safe_error_code: "READBACK_FAILED" }, 500);
      return fulfill({ request_id: "timeline-read", outcome: "passed", item: { matter_id: MATTER, visible_entries: [], page_info: { limit: 8, has_more: false, next_cursor: null } } });
    }
    if (url.pathname.endsWith("/documents")) return state.failReadback ? fulfill({ safe_error_code: "READBACK_FAILED" }, 500) : fulfill({ items: [] });
    if (url.pathname === "/api/outlook/tasks" && method === "POST") {
      if (state.probeOmit) return fulfill({ safe_error_code: "PROBE_REJECTED" }, 400);
      const replay = state.task?.key === body.idempotency_key;
      if (!state.task) {
        state.durableTaskCreates += 1;
        state.task = { key: body.idempotency_key, body: structuredClone(body), item: { activity_id: "task-A", version: 1, ...body.task, due_at: body.task?.due_at ?? null } };
      }
      const payload = { request_id: replay ? "task-replay" : "task-create", outcome: replay ? "idempotent_replay" : "task_created", idempotent_replay: replay, item: state.task.item };
      const held = state.hold === "task-create";
      if (held) { state.hold = ""; await new Promise((resolve) => state.pending.set("task-create", resolve)); }
      return fulfill(payload);
    }
    const taskMatch = url.pathname.match(/^\/api\/outlook\/tasks\/([^/]+)$/u);
    if (taskMatch && method === "PATCH") {
      const replay = state.patch?.key === body.idempotency_key;
      if (!state.patch) {
        state.durableTaskUpdates += 1;
        state.patch = { key: body.idempotency_key, body: structuredClone(body), item: { activity_id: taskMatch[1], version: 2, ...body.patch, due_at: body.patch?.due_at ?? null } };
      }
      const payload = { request_id: replay ? "task-patch-replay" : "task-patch", outcome: replay ? "idempotent_replay" : "task_updated", idempotent_replay: replay, item: state.patch.item };
      const held = state.hold === "task-update";
      if (held) { state.hold = ""; await new Promise((resolve) => state.pending.set("task-update", resolve)); }
      return fulfill(payload);
    }
    if (url.pathname === "/api/outlook/time-entry-drafts" && method === "POST") {
      const replay = state.time?.key === body.idempotency_key;
      if (!state.time) {
        state.durableTimeCreates += 1;
        state.time = { key: body.idempotency_key, body: structuredClone(body), item: { draft_ref: "draft-A", version: 1 } };
      }
      const payload = { request_id: replay ? "time-replay" : "time-create", outcome: replay ? "idempotent_replay" : "time_entry_draft_created", idempotent_replay: replay, item: state.time.item };
      const held = state.hold === "time";
      if (held) { state.hold = ""; await new Promise((resolve) => state.pending.set("time", resolve)); }
      return fulfill(payload);
    }
    return fulfill({ items: [] });
  });
  await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".outlook-compact-shell", { state: "visible" });
  await page.waitForFunction(() => document.querySelector("[data-feature-id='task.create']")?.disabled === false);
  state.release = (kind) => { state.pending.get(kind)?.(); state.pending.delete(kind); };
  return { page, state };
}

async function chooseMatter(page, matterId) {
  await page.locator("[data-feature-id='matter.search']").click();
  await page.locator("#matter-search-input").fill(matterId);
  await page.waitForTimeout(350);
  await page.locator("#matter-select").selectOption(matterId);
  await page.locator("[data-testid='outlook-overlay-close']").click();
  await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
}

async function waitBusyDone(page) {
  await page.waitForFunction(() => !document.querySelector("[data-testid='busy-state']"));
}

async function switchItem(page, key) {
  await page.evaluate((next) => window.__SET_OUTLOOK_ITEM(next), key);
  await page.waitForTimeout(80);
}

test("8f3 editable task/time actions preserve idempotent intent across hostile Office item changes", async () => {
  const web = await startOutlookAddinStaticServer({ distRoot: DIST_ROOT });
  const browser = await chromium.launch({ headless: true });
  let page;
  let state;
  try {
    ({ page, state } = await openFixture(browser, web));
    await chooseMatter(page, MATTER); await page.locator("[data-feature-id='mail.save-with-attachments']").click();
    await page.locator("[data-testid='file-email-button']").click();
    await page.getByTestId("operation-result").waitFor({ state: "visible" });
    await page.locator("[data-testid='outlook-overlay-close']").click(); await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });

    state.hold = "task-create";
    await page.locator("[data-feature-id='task.create']").click(); await page.locator("#task-draft-title").fill("CREATE-A"); await page.locator("#task-draft-due").fill("2026-08-11T09:30");
    const createRequest = page.waitForRequest((request) => request.url().endsWith("/api/outlook/tasks") && request.method() === "POST");
    await page.locator("[data-testid='create-task-button']").click();
    await createRequest;
    await switchItem(page, "B");
    assert.equal(await page.locator("#task-draft-title").count(), 0, "A task form leaked into B"); assert.doesNotMatch(await page.locator("body").innerText(), /CREATE-A|task-A/u, "A task result leaked into B");
    state.release("task-create");
    await waitBusyDone(page);

    await chooseMatter(page, MATTER);
    state.probeOmit = true;
    await page.locator("[data-feature-id='task.create']").click(); await page.locator("#task-draft-title").fill("STALE-B");
    await page.locator("[data-testid='create-task-button']").click(); await waitBusyDone(page);
    assert.equal(state.requests.at(-1).body.source_email_thread_id, undefined, "stale item carried source_email_thread_id");
    await page.locator("[data-testid='outlook-overlay-close']").click(); await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
    await switchItem(page, "A"); await chooseMatter(page, MATTER); await chooseMatter(page, FOREIGN_MATTER);
    await page.locator("[data-feature-id='task.create']").click(); await page.locator("#task-draft-title").fill("FOREIGN-A");
    await page.locator("[data-testid='create-task-button']").click(); await waitBusyDone(page);
    assert.equal(state.requests.at(-1).body.source_email_thread_id, undefined, "foreign Matter carried source_email_thread_id");
    await page.locator("[data-testid='outlook-overlay-close']").click(); await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
    state.probeOmit = false;
    await chooseMatter(page, MATTER);

    state.failReadback = true;
    await page.locator("[data-feature-id='task.create']").click(); await page.locator("#task-draft-title").fill("CREATE-A"); await page.locator("#task-draft-due").fill("2026-08-11T09:30"); await page.locator("[data-testid='create-task-button']").click();
    await page.getByText("업무는 저장됐지만 목록은 새로 불러오지 못했습니다.", { exact: true }).waitFor({ state: "visible" });
    const creates = state.requests.filter(({ path, method }) => path === "/api/outlook/tasks" && method === "POST");
    assert.equal(state.durableTaskCreates, 1); assert.deepEqual(creates.at(-1).body, creates.find(({ body }) => body.task?.title === "CREATE-A")?.body); assert.ok(creates.at(-1).body.source_email_thread_id === "thread-A"); assert.equal(creates.at(-1).body.task.due_at, localDateTimeToIso("2026-08-11T09:30"));

    state.failReadback = false;
    state.hold = "task-update";
    await page.locator("#task-draft-title").fill("PATCH-A");
    const patchRequest = page.waitForRequest((request) => /\/api\/outlook\/tasks\/task-A$/u.test(request.url()) && request.method() === "PATCH");
    await page.locator("[data-testid='create-task-button']").click();
    await patchRequest;
    await switchItem(page, "B");
    assert.equal(await page.locator("#task-draft-title").count(), 0, "A patch form leaked into B");
    state.release("task-update");
    await waitBusyDone(page);
    await switchItem(page, "A");
    await chooseMatter(page, MATTER);
    state.failReadback = true;
    await page.locator("[data-feature-id='task.create']").click();
    await page.locator("#task-draft-title").fill("PATCH-A");
    await page.locator("[data-testid='create-task-button']").click();
    await page.getByText("업무는 저장됐지만 목록은 새로 불러오지 못했습니다.", { exact: true }).waitFor({ state: "visible" });
    const patches = state.requests.filter(({ path, method }) => /^\/api\/outlook\/tasks\/task-A$/u.test(path) && method === "PATCH");
    assert.equal(state.durableTaskUpdates, 1); assert.equal(patches.length, 2); assert.deepEqual(patches[0].body, patches[1].body); assert.equal(patches[0].body.expected_version, 1);

    state.failReadback = false;
    await page.locator("[data-testid='outlook-overlay-close']").click(); await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
    await page.locator("[data-feature-id='time-entry.draft']").click();
    await page.locator("#time-entry-narrative").fill("TIME-A"); await page.locator("#time-entry-duration").fill("45");
    state.hold = "time";
    const timeRequest = page.waitForRequest((request) => request.url().endsWith("/api/outlook/time-entry-drafts") && request.method() === "POST");
    await page.locator("[data-testid='create-time-entry-draft-button']").click();
    await timeRequest;
    await switchItem(page, "B");
    assert.equal(await page.locator("#time-entry-draft-form").count(), 0, "A time form leaked into B");
    state.release("time");
    await waitBusyDone(page);
    await switchItem(page, "A");
    await chooseMatter(page, MATTER);
    state.failReadback = true;
    await page.locator("[data-feature-id='time-entry.draft']").click();
    await page.locator("#time-entry-narrative").fill("TIME-A"); await page.locator("#time-entry-duration").fill("45");
    await page.locator("[data-testid='create-time-entry-draft-button']").click();
    await page.getByText("시간기록 초안은 저장됐지만 목록은 새로 불러오지 못했습니다.", { exact: true }).waitFor({ state: "visible" });
    const times = state.requests.filter(({ path, method }) => path === "/api/outlook/time-entry-drafts" && method === "POST");
    assert.equal(state.durableTimeCreates, 1); assert.equal(times.length, 2); assert.deepEqual(times[0].body, times[1].body); assert.ok(times[0].body.idempotency_key.startsWith("outlook-time-entry-draft:"));
  } finally {
    await page?.close();
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
});
