import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";

import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";
import { readyOutlookReadinessResponse } from "./helpers/outlook-readiness-fixture.js";
import {
  correctionApiRequest,
  currentCorrectionPath,
  startCorrectionApiFixture,
} from "../../api/test/helpers/outlook-email-filing-correction-api-fixture.js";
import {
  DOCUMENT_ID,
  MATTER_A,
  MATTER_B,
  RECEIPT_ID,
  THREAD_ID,
} from "../../../packages/email-dms/test/helpers/email-filing-correction-fixture.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIST = path.join(ROOT, "apps/addin/dist");
const SESSION = "lawos_session_v1.outm22-browser";
const CORRECTION = "/api/outlook/email/corrections";
const json = (body, status = 200) => ({ status, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });

function fnv(value) {
  let hash = 0xcbf29ce484222325n;
  for (const character of value) hash = BigInt.asUintN(64, (hash ^ BigInt(character.codePointAt(0))) * 0x100000001b3n);
  return hash.toString(16).padStart(16, "0");
}

function item(key) {
  return {
    itemId: `office-${key}`, subject: `OUTM22 ${key}`, internetMessageId: `<outm22-${key}@example.invalid>`, conversationId: `outm22-${key}`,
    from: { displayName: "상대방", emailAddress: "sender@example.invalid" }, to: [], attachments: [],
    body: { getAsync(_type, callback) { callback({ status: "succeeded", value: "공급계약 검토 요청드립니다." }); } },
    getAllInternetHeadersAsync(callback) { callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" }); },
  };
}

function receiptSummary(current) {
  const contextKey = [
    [current.rest_message_id, current.internet_message_id, current.conversation_id].join("\u001f"),
    current.mode, current.provenance,
  ].join("\u001e");
  return {
    item_context_ref: `item-context:${fnv(`${contextKey}\u001f${current.canonical_graph_message_id}`)}`,
    matter_id: MATTER_A, operation: "file_email", outcome: "created", filing_mode: "manual", request_id: "file-outm22",
    email_thread_id: THREAD_ID, document_ids: [DOCUMENT_ID], timeline_event_ids: [RECEIPT_ID], completed_at: "2026-08-10T00:00:00.000Z",
  };
}

async function openFixture(browser, fixture, state) {
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(({ initial, next }) => {
    const handlers = [];
    const items = { A: initial, B: next };
    for (const [key, nextItem] of Object.entries(items)) {
      nextItem.body = { getAsync(_type, callback) { callback({ status: "succeeded", value: `본문 ${key}` }); } };
      nextItem.getAllInternetHeadersAsync = (callback) => callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" });
    }
    const mailbox = {
      item: items.A, userProfile: { emailAddress: "qa@example.invalid" },
      addHandlerAsync(_type, handler) { handlers.push(handler); },
      removeHandlerAsync(_type, { handler } = {}) { const index = handlers.indexOf(handler); if (index >= 0) handlers.splice(index, 1); },
      convertToRestId(id) { return id.replace("office-", "rest-"); },
    };
    window.Office = { onReady(callback) { callback({ host: "Outlook", platform: "web" }); }, EventType: { ItemChanged: "itemChanged" }, actions: { associate() {} }, MailboxEnums: { RestVersion: { v2_0: "v2.0" }, CoercionType: { Text: "text" } }, context: { requirements: { isSetSupported: () => false }, mailbox } };
    window.OfficeRuntime = { storage: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } };
    window.sessionStorage.setItem("lawos_addin_session_token", "lawos_session_v1.outm22-browser");
    window.__SET_OUTLOOK_ITEM = (key) => { mailbox.item = items[key]; for (const handler of [...handlers]) handler(); };
  }, { initial: item("A"), next: item("B") });
  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = (() => { try { return request.postDataJSON() ?? {}; } catch { return {}; } })();
    state.requests.push({ method: request.method(), path: url.pathname, query: url.search, body });
    const fulfill = (payload, status = 200) => route.fulfill(json(payload, status));
    if (url.pathname === "/api/auth/office-sso/config") return fulfill({ item: { configured: true, client_id: "browser-client", tenant_id: "organizations", api_scope: "api://browser-client/access_as_user", scopes: ["api://browser-client/access_as_user"], callback_uri: `${url.origin}/addin/oauth-callback.html`, authority: "https://login.microsoftonline.com/organizations" } });
    if (url.pathname === "/api/auth/session") return fulfill({ authenticated: true, session: { user_id: "outm22-user", tenant_id: "tenant-outm20", outlook_desktop_principal_ref: `odpr_${"A".repeat(43)}` } });
    if (url.pathname === "/api/outlook/connection") return fulfill({ item: { status: state.connectionState, active: state.connectionState === "connected", ...(state.connectionState === "connected" ? { connection_id: "m365_connection_correction_qa" } : {}), state_version: state.connectionState === "connected" ? 7 : 0, mailbox_address: "qa@example.invalid" } });
    if (url.pathname === "/api/outlook/readiness") return fulfill(readyOutlookReadinessResponse());
    if (url.pathname === "/api/outlook/bootstrap") return fulfill({ item: { ready: true } });
    if (url.pathname === "/api/outlook/messages/identity") return fulfill({ item: { canonical_graph_message_id: `canonical-${body.rest_message_id ?? "A"}`, rest_message_id: body.rest_message_id, internet_message_id: body.internet_message_id, conversation_id: body.conversation_id } });
    if (url.pathname === "/api/outlook/email/file") {
      const identity = { canonical_graph_message_id: "canonical-rest-A", rest_message_id: "rest-A", internet_message_id: "<outm22-A@example.invalid>", conversation_id: "outm22-A", item_key: "rest-A\u001f<outm22-A@example.invalid>\u001foutm22-A" };
      return fulfill({ request_id: "file-outm22", outcome: "created", filing_operation: "manual", source_identity: identity, email_thread: { ...identity, email_thread_id: THREAD_ID, matter_id: MATTER_A, status: "active", filing_user: "outm22-user", filing_time: "2026-08-10T00:00:00.000Z", filed_document_ids: [DOCUMENT_ID] }, timeline_event: { event_id: RECEIPT_ID, type: "outlook.email.filed", matter_id: MATTER_A, source_ref: THREAD_ID }, external_send_state: "not_applicable", attachment_state: { receipts: [], retry_attachment_ids: [] } });
    }
    if (url.pathname === "/api/outlook/operation-receipts/readback") return fulfill({ items: [receiptSummary(body.current_item)] });
    if (url.pathname === "/api/outlook/matters") return fulfill({ items: [
      { matter_id: MATTER_A, matter_code: "OUTM22/A", title: "Matter A", client_display_name: "Client", status: "open" },
      { matter_id: MATTER_B, matter_code: "OUTM22/B", title: "Matter B", client_display_name: "Client", status: "open" },
    ] });
    if (/\/timeline$/u.test(url.pathname)) {
      if (state.failMatterReadback) { state.failMatterReadback = false; return fulfill({ safe_error_codes: ["READBACK_FAILED"] }, 503); }
      return fulfill({ request_id: "timeline-outm22", outcome: "passed", item: { matter_id: url.pathname.split("/").at(-2), visible_entries: [], page_info: { limit: 8, has_more: false, next_cursor: null } } });
    }
    if (/\/documents$/u.test(url.pathname)) return fulfill({ items: [] });
    if (url.pathname === CORRECTION) {
      if (state.holdPost) { await new Promise((resolve) => { state.releasePost = resolve; }); }
      const response = await correctionApiRequest(fixture, CORRECTION, { method: "POST", body });
      if (state.failAfterPost) { state.failMatterReadback = true; state.failAfterPost = false; }
      return fulfill(response.body, response.response.status);
    }
    if (url.pathname === "/api/outlook/email/corrections/current") {
      const response = await correctionApiRequest(fixture, currentCorrectionPath(url.searchParams.get("email_thread_id")));
      return fulfill(response.body, response.response.status);
    }
    return fulfill({ items: [] });
  });
  await page.goto(`${state.web.origin}/addin/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".outlook-compact-shell");
  await page.waitForFunction(() => document.querySelector("[data-feature-id='all-functions']")?.disabled === false);
  return page;
}

async function selectMatter(page, matterId) {
  await page.locator("[data-feature-id='matter.search']").click();
  await page.locator("#matter-search-input").fill(matterId);
  await page.waitForFunction(() => document.querySelectorAll("#matter-select option").length > 1);
  await page.locator("#matter-select").selectOption(matterId);
  await page.locator("[data-testid='outlook-overlay-close']").click();
  await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
}

async function openCorrection(page, { resultOnly = false } = {}) {
  await page.locator("[data-feature-id='all-functions']").click();
  await page.locator("[data-action-row='filing.correct-placement'] button").click();
  await page.waitForSelector(resultOnly ? "[data-testid='filing-correction-result']" : "[data-filing-correction-panel]", { timeout: 10_000 });
}

async function primeLiveCorrection(page) {
  await selectMatter(page, MATTER_A);
  await page.locator("[data-feature-id='mail.save-with-attachments']").click();
  await page.locator("[data-testid='file-email-button']").click();
  await page.waitForSelector("[data-testid='operation-result']", { timeout: 10_000 });
  await page.locator("[data-testid='outlook-overlay-close']").click();
  await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
  await page.locator("[data-feature-id='all-functions']").click();
  assert.equal(await page.locator("[data-action-row='matter-readbacks'] button").isDisabled(), false);
  assert.equal(await page.locator("[data-testid='file-sent-email-button']").isDisabled(), true);
  assert.equal(await page.locator("[data-testid='smart-alert-button']").isDisabled(), false);
  await page.locator("[data-testid='filing-correction-open']").click();
  await page.waitForSelector("[data-filing-correction-panel]", { timeout: 10_000 });
}

test("OUTM22 built matter-full correction uses live filing and nonfatal readback", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "outm22-main-browser-"));
  const fixture = await startCorrectionApiFixture({ matterFilePath: path.join(root, "matter.json") });
  const browser = await chromium.launch({ headless: true });
  const state = { requests: [], connectionState: "connected", holdPost: false, releasePost: null, failMatterReadback: false, failAfterPost: false };
  const web = await startOutlookAddinStaticServer({ distRoot: DIST }); state.web = web;
  try {
    const page = await openFixture(browser, fixture, state);
    assert.deepEqual(await page.locator("[data-testid='outlook-icon-rail'] button").evaluateAll((buttons) => buttons.map((button) => button.dataset.featureId)), ["mail.save-with-attachments", "matter.search", "task.create", "time-entry.draft", "all-functions"]);
    assert.equal(await page.locator("[data-feature-id='mail.save-with-attachments']").isDisabled(), false);
    for (const id of ["matter.search", "task.create", "time-entry.draft", "all-functions"]) assert.equal(await page.locator(`[data-feature-id='${id}']`).isDisabled(), false);
    await primeLiveCorrection(page);
    assert.ok(state.requests.some((request) => request.method === "GET" && request.path === "/api/outlook/email/corrections/current" && request.query === `?email_thread_id=${encodeURIComponent(THREAD_ID)}`));
    await page.locator("[data-testid='filing-correction-target-search']").fill("matter-b");
    await page.waitForFunction(() => document.querySelectorAll("[data-testid='filing-correction-target-select'] option").length > 1);
    await page.locator("[data-testid='filing-correction-target-select']").selectOption(MATTER_B);
    assert.match(await page.locator("[data-ui-critical-value][aria-label='현재 Matter']").innerText(), /OUTM22\/A/u);
    await page.locator("[data-testid='filing-correction-reason']").fill("담당 Matter 정정");
    await page.locator("[data-testid='filing-correction-confirmation']").check();
    assert.equal(await page.locator("[data-testid='filing-correction-submit']").isDisabled(), false);
    state.failAfterPost = true;
    await page.locator("[data-testid='filing-correction-submit']").click();
    await page.waitForSelector("[data-testid='filing-correction-result']");
    await page.waitForSelector("[data-testid='filing-correction-readback-pending']");
    assert.equal(await page.locator("[data-testid='filing-correction-result']").innerText(), "변경됨");
    assert.match(await page.locator("[data-testid='filing-correction-readback-pending']").innerText(), /목록은 새로 불러오지 못했습니다/u);
    const correctionPosts = () => state.requests.filter((request) => request.method === "POST" && request.path === CORRECTION);
    assert.equal(correctionPosts().length, 1);
    assert.deepEqual(Object.keys(correctionPosts()[0].body).sort(), ["document_id", "email_thread_id", "expected_placement_id", "idempotency_key", "mime_sha256", "original_receipt_id", "reason", "source_matter_id", "target_matter_id"]);
    assert.equal(correctionPosts()[0].body.source_matter_id, MATTER_A);
    assert.match(correctionPosts()[0].body.idempotency_key, /^outlook-email-correction:[a-f0-9]{64}$/u);
    assert.doesNotMatch(JSON.stringify(correctionPosts()[0].body), /actor_id|tenant_id|raw|count|storage/iu);
    assert.doesNotMatch(await page.locator("body").innerText(), /READBACK_FAILED|actor_id|tenant_id|storage_pointer|count/u);
    for (const selector of ["[data-testid='filing-correction-target-search']", "[data-testid='filing-correction-target-select']", "[data-testid='filing-correction-reason']", "[data-testid='filing-correction-confirmation']", "[data-testid='filing-correction-submit']"]) {
      assert.equal(await page.locator(selector).count(), 0);
    }
  } finally {
    await browser.close(); await fixture.close(); await new Promise((resolve) => web.server.close(resolve)); await rm(root, { recursive: true, force: true });
  }
});

test("OUTM22 delayed correction is durable but cannot paint old A after A-to-B-to-A", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "outm22-main-browser-stale-"));
  const fixture = await startCorrectionApiFixture({ matterFilePath: path.join(root, "matter.json") });
  const browser = await chromium.launch({ headless: true });
  const state = { requests: [], connectionState: "connected", holdPost: false, releasePost: null, failMatterReadback: false, failAfterPost: false };
  const web = await startOutlookAddinStaticServer({ distRoot: DIST }); state.web = web;
  try {
    const page = await openFixture(browser, fixture, state); await primeLiveCorrection(page);
    await page.locator("[data-testid='filing-correction-target-search']").fill("matter-b");
    await page.waitForFunction(() => document.querySelectorAll("[data-testid='filing-correction-target-select'] option").length > 1);
    await page.locator("[data-testid='filing-correction-target-select']").selectOption(MATTER_B);
    await page.locator("[data-testid='filing-correction-reason']").fill("담당 Matter 정정");
    await page.locator("[data-testid='filing-correction-confirmation']").check();
    state.holdPost = true;
    const heldPost = page.waitForRequest((request) => request.method() === "POST" && request.url().endsWith(CORRECTION));
    const heldResponse = page.waitForResponse((response) => response.request().method() === "POST" && response.url().endsWith(CORRECTION), { timeout: 10_000 });
    await page.locator("[data-testid='filing-correction-submit']").click(); await heldPost;
    assert.equal(await page.locator("[data-testid='filing-correction-back']").isDisabled(), false);
    await page.locator("[data-testid='filing-correction-back']").click();
    assert.equal(await page.locator("[data-testid='filing-correction-open']").isDisabled(), true);
    await page.waitForFunction(() => document.activeElement?.matches("[data-testid='outlook-overlay-close']"), { timeout: 10_000 });
    assert.equal(await page.locator("[data-testid='outlook-overlay-close']").isDisabled(), false);
    await page.evaluate(() => window.__SET_OUTLOOK_ITEM("B"));
    for (let i = 0; i < 50 && !state.releasePost; i += 1) await new Promise((resolve) => setImmediate(resolve));
    state.holdPost = false; state.releasePost?.();
    await heldResponse;
    await page.waitForFunction(() => !document.querySelector("[data-testid='busy-state']"));
    assert.equal(await page.locator("[data-filing-correction-panel]").count(), 0);
    assert.equal(await page.locator("[data-testid='filing-correction-result']").count(), 0);
    assert.doesNotMatch(await page.locator("body").innerText(), /변경됨/u);
    assert.equal(state.requests.filter((request) => request.method === "POST" && request.path === CORRECTION).length, 1);
    await page.evaluate(() => window.__SET_OUTLOOK_ITEM("A")); await selectMatter(page, MATTER_A); await openCorrection(page, { resultOnly: true });
    assert.equal(await page.locator("[data-testid='filing-correction-result']").innerText(), "변경됨");
    for (const selector of ["[data-testid='filing-correction-target-search']", "[data-testid='filing-correction-submit']"]) assert.equal(await page.locator(selector).count(), 0);
  } finally {
    await browser.close(); await fixture.close(); await new Promise((resolve) => web.server.close(resolve)); await rm(root, { recursive: true, force: true });
  }
});

test("OUTM22 graph-disconnected correction surface remains reachable but fail-closes without a live filing receipt", async () => {
  const root = mkdtempSync(path.join(tmpdir(), "outm22-main-browser-disconnected-"));
  const fixture = await startCorrectionApiFixture({ matterFilePath: path.join(root, "matter.json") });
  const browser = await chromium.launch({ headless: true });
  const state = { requests: [], connectionState: "not_connected", holdPost: false, releasePost: null, failMatterReadback: false, failAfterPost: false };
  const web = await startOutlookAddinStaticServer({ distRoot: DIST }); state.web = web;
  try {
    const page = await openFixture(browser, fixture, state);
    assert.equal(await page.locator("[data-feature-id='mail.save-with-attachments']").isDisabled(), true);
    for (const id of ["matter.search", "task.create", "time-entry.draft", "all-functions"]) assert.equal(await page.locator(`[data-feature-id='${id}']`).isDisabled(), false);
    await selectMatter(page, MATTER_A); await page.locator("[data-feature-id='all-functions']").click();
    assert.equal(await page.locator("[data-testid='file-sent-email-button']").isDisabled(), true);
    assert.equal(await page.locator("[data-testid='smart-alert-button']").isDisabled(), true);
    await page.locator("[data-action-row='matter-readbacks'] button").click(); await page.waitForFunction(() => !document.querySelector("[data-testid='busy-state']"));
    await page.locator("[data-testid='filing-correction-open']").click();
    assert.equal(await page.locator("[data-testid='filing-correction-open']").count(), 0);
    await page.waitForSelector("[data-testid='filing-correction-state']");
    assert.match(await page.locator("[data-testid='filing-correction-state']").innerText(), /저장한 뒤/u);
    assert.equal(state.requests.filter((request) => request.path === "/api/outlook/email/corrections/current").length, 0);
  } finally {
    await browser.close(); await fixture.close(); await new Promise((resolve) => web.server.close(resolve)); await rm(root, { recursive: true, force: true });
  }
});
