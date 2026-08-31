import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";

import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";
import { readyOutlookReadinessResponse } from "./helpers/outlook-readiness-fixture.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIST = path.join(ROOT, "apps/addin/dist");
const A = "matter-current";
const B = "matter-next";
const VERSION = "lawos-precedent-fts-v2";
const json = (body, status = 200) => ({ status, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
const waitable = () => { let release; const promise = new Promise((resolve) => { release = resolve; }); return { promise, release }; };
const item = (key) => ({ itemId: `office-${key}`, subject: `선례 메일 ${key}`, internetMessageId: `<${key}@example.invalid>`, conversationId: `conversation-${key}`, from: { displayName: "상대방", emailAddress: "sender@example.invalid" }, to: [], attachments: [], body: { getAsync(_type, callback) { callback({ status: "succeeded", value: `본문 ${key}` }); } }, getAllInternetHeadersAsync(callback) { callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" }); } });
const source = (id, matterId, kind = "case_law_document") => ({ source_id: id, source_kind: kind, title: `${id} 제목`, snippet: "계약책임과 손해배상 판시", source_matter_id: matterId, document_id: `document-${id}`, version_id: `version-${id}`, citation: kind === "case_law_document" ? { court: "대법원", case_number: "2025다54321", decision_date: "2026-06-11" } : null, source_reference: kind === "case_law_document" ? "대법원 2026. 6. 11. 선고 2025다54321 판결" : null, source_url: kind === "case_law_document" ? "https://glaw.scourt.go.kr/precedent/2025da54321" : `?view=vault&matter_id=${matterId}&document_id=document-${id}&document_version_id=version-${id}&document_sha256=${"a".repeat(64)}#vault-search-documents`, search_rank: "0.52", match_fields: ["metadata"], content_sha256: "a".repeat(64), index_version: VERSION, index_stale: false, raw_body_included: false, storage_pointer_ref_included: false });
const readiness = (state) => ({ request_id: "ready-001", outcome: "passed", runtime_ready: state.readinessMode === "ready", authoritative: state.readinessMode === "ready", index_version: VERSION, authority_fingerprint: "b".repeat(64), safe_error_codes: state.readinessMode === "stale" ? ["PRECEDENT_INDEX_STALE"] : [], production_ready_claim: false });
const pageBody = (state, duplicate = false) => { const rows = state.currentLeak ? [source("current-leak", B)] : duplicate ? [source("precedent-case", "matter-prior")] : state.searchPage === 1 ? [source("precedent-case", "matter-prior")] : [source("precedent-internal", "matter-other", "internal_matter_document")]; return { request_id: `search-${state.searchPage}`, outcome: "passed", items: rows, next_cursor: state.searchPage === 1 ? "cursor-1" : null, page_info: { returned_count: rows.length, has_more: state.searchPage === 1 }, safe_error_codes: [], count_leak_prevented: true, raw_body_included: false, storage_pointer_ref_included: false, index_version: VERSION, index_stale: false, authoritative: true, production_ready_claim: false }; };

async function openFixture(browser, web, state) {
  const page = await browser.newPage({ viewport: { width: 420, height: 800 } });
  await page.addInitScript(({ first, second }) => {
    const items = { A: first, B: second }; const handlers = [];
    const mailbox = { item: items.A, userProfile: { emailAddress: "qa@example.invalid" }, addHandlerAsync(_type, handler) { handlers.push(handler); }, removeHandlerAsync(_type, { handler } = {}) { const index = handlers.indexOf(handler); if (index >= 0) handlers.splice(index, 1); }, convertToRestId(id) { return id.replace("office-", "rest-"); } };
    window.Office = { onReady(callback) { callback({ host: "Outlook", platform: "web" }); }, EventType: { ItemChanged: "itemChanged" }, actions: { associate() {} }, MailboxEnums: { RestVersion: { v2_0: "v2.0" }, CoercionType: { Text: "text" } }, context: { requirements: { isSetSupported: () => false }, mailbox } };
    window.OfficeRuntime = { storage: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } };
    window.sessionStorage.setItem("lawos_addin_session_token", "lawos_session_v1.outm31-browser");
    window.__SET_OUTLOOK_ITEM = (key) => { mailbox.item = items[key]; for (const handler of [...handlers]) handler(); };
    window.__OPEN_LINKS = []; window.open = (url, target, features) => { window.__OPEN_LINKS.push({ url: new URL(String(url), window.location.origin).toString(), target, features }); return null; };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value) => { window.__COPIED = String(value); } } });
  }, { first: item("A"), second: item("B") });
  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", async (route) => {
    const request = route.request(); const url = new URL(request.url()); let body = {};
    try { body = request.postDataJSON() ?? {}; } catch {}
    state.requests.push({ method: request.method(), path: url.pathname, query: url.search, body });
    const fulfill = (payload, status = 200) => route.fulfill(json(payload, status));
    if (url.pathname === "/api/auth/office-sso/config") return fulfill({ item: { configured: true, client_id: "browser-client", tenant_id: "organizations", api_scope: "api://browser-client/access_as_user", scopes: ["api://browser-client/access_as_user"], callback_uri: `${url.origin}/addin/oauth-callback.html`, authority: "https://login.microsoftonline.com/organizations" } });
    if (url.pathname === "/api/auth/session") return state.authLoss ? fulfill({ safe_error_code: "AUTH_SESSION_INVALID" }, 401) : fulfill({ authenticated: true, session: { user_id: "outm31-user", tenant_id: "outm31-tenant", outlook_desktop_principal_ref: `odpr_${"A".repeat(43)}` } });
    if (url.pathname === "/api/outlook/connection") return fulfill({ item: { status: state.connection, active: state.connection === "connected", ...(["connected", "expired", "scope_insufficient", "reauthorization_required", "revoked"].includes(state.connection) ? { connection_id: "m365_connection_precedent_qa" } : {}), state_version: state.connection === "not_connected" ? 0 : 7, mailbox_address: "qa@example.invalid" } });
    if (url.pathname === "/api/outlook/readiness") return fulfill(readyOutlookReadinessResponse());
    if (url.pathname === "/api/outlook/bootstrap") return fulfill({ item: { ready: true } });
    if (url.pathname === "/api/outlook/operation-receipts/readback") return fulfill({ items: [] });
    if (url.pathname === "/api/outlook/messages/identity") return fulfill({ item: { canonical_graph_message_id: `canonical-${body.rest_message_id ?? "A"}`, rest_message_id: body.rest_message_id, internet_message_id: body.internet_message_id, conversation_id: body.conversation_id } });
    if (url.pathname === "/api/outlook/matters") {
      if (state.authLoss) return fulfill({ safe_error_code: "AUTH_SESSION_INVALID" }, 401);
      const rows = [{ matter_id: A, matter_code: "M-CURRENT", title: "Current Matter", client_display_name: "Client", status: "open" }, { matter_id: B, matter_code: "M-NEXT", title: "Next Matter", client_display_name: "Client", status: "open" }];
      const q = url.searchParams.get("q")?.toLowerCase() ?? ""; return fulfill({ items: q ? rows.filter((row) => `${row.matter_id} ${row.matter_code} ${row.title}`.toLowerCase().includes(q)) : rows });
    }
    if (url.pathname.endsWith("/timeline") || url.pathname.endsWith("/documents")) return fulfill(url.pathname.endsWith("/timeline") ? { request_id: "timeline", outcome: "passed", item: { matter_id: A, visible_entries: [], page_info: { limit: 8, has_more: false, next_cursor: null } } } : { items: [] });
    if (url.pathname === "/api/outlook/precedents/readiness") { if (state.holdReadiness) await state.readinessGate.promise; return fulfill(readiness(state)); }
    if (url.pathname === "/api/outlook/precedents") { const append = url.searchParams.has("cursor"); if (state.holdSearch) await state.searchGate.promise; state.searchPage = append ? 2 : 1; if (state.authLoss) return fulfill({ safe_error_code: "AUTH_SESSION_INVALID" }, 401); if (append && state.appendTransient && state.appendAttempts++ === 0) return fulfill({ ...pageBody(state), items: [{ ...source("precedent-internal", "matter-other", "internal_matter_document"), raw_body: "must-not-return" }] }); return fulfill(pageBody(state, state.duplicatePage)); }
    return fulfill({ items: [] });
  });
  await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".outlook-compact-shell");
  await page.waitForFunction(() => document.querySelector("[data-feature-id='all-functions']")?.disabled === false);
  return page;
}

async function selectMatter(page, matterId) {
  await page.locator("[data-feature-id='matter.search']").click();
  const response = page.waitForResponse((r) => r.request().method() === "GET" && new URL(r.url()).pathname === "/api/outlook/matters");
  await page.locator("#matter-search-input").fill(matterId);
  await response;
  await page.waitForFunction(() => document.querySelectorAll("#matter-select option").length > 1);
  await page.locator("#matter-select").selectOption(matterId);
  await page.locator("[data-testid='outlook-overlay-close']").click();
  await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
}

test("OUTM31 all-functions precedent browser contract is authoritative and session-fenced", async () => {
  const browser = await chromium.launch({ headless: true }); const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  const state = { requests: [], connection: "not_connected", readinessMode: "ready", searchPage: 1, holdReadiness: false, holdSearch: false, appendTransient: false, appendAttempts: 0, duplicatePage: false, currentLeak: false, authLoss: false, readinessGate: waitable(), searchGate: waitable() };
  const page = await openFixture(browser, web, state);
  try {
    assert.deepEqual(await page.locator("[data-testid='outlook-icon-rail'] button").evaluateAll((buttons) => buttons.map((b) => b.dataset.featureId)), ["mail.save-with-attachments", "matter.search", "task.create", "time-entry.draft", "all-functions"]);
    await selectMatter(page, A);
    await page.locator("[data-feature-id='all-functions']").click();
    assert.equal(await page.locator("[data-action-row='precedent.search']").count(), 1);
    assert.equal(await page.locator("[data-testid='precedent-search-open']").isDisabled(), false);
    state.holdReadiness = true; state.readinessGate = waitable();
    const heldReadiness = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/outlook/precedents/readiness" && new URL(r.url()).searchParams.get("matter_id") === A);
    await page.locator("[data-testid='precedent-search-open']").click();
    await heldReadiness; await page.locator("[data-testid='outlook-overlay-close']").click(); await selectMatter(page, B);
    state.holdReadiness = false; state.readinessGate.release();
    assert.equal(await page.locator("[data-testid='outlook-precedent-panel']").count(), 0);
    assert.equal(new URL(state.requests.find((request) => request.path === "/api/outlook/precedents/readiness").query, "http://localhost").searchParams.get("matter_id"), A);
    await page.locator("[data-feature-id='all-functions']").click(); await page.locator("[data-testid='precedent-search-open']").click();
    await page.waitForSelector("[data-testid='outlook-precedent-panel'][data-ready='true']");
    assert.ok(["precedent-search-input", "precedent-search-back", "outlook-overlay-close"].includes(await page.evaluate(() => document.activeElement?.id || document.activeElement?.dataset?.testid)));
    await page.locator("[data-testid='outlook-precedent-search-input']").fill("계약책임");
    const search = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/outlook/precedents" && !new URL(r.url()).searchParams.has("cursor"));
    await page.locator("[data-testid='outlook-precedent-search-submit']").click(); await search; await page.waitForSelector("[data-testid='outlook-precedent-result']");
    assert.equal(await page.locator("[data-testid='outlook-precedent-result']").count(), 1);
    assert.doesNotMatch(await page.locator("[data-testid='outlook-precedent-results']").innerText(), new RegExp(A, "u"));
    await page.locator("[data-testid='outlook-precedent-result']").click();
    await page.waitForSelector("[data-testid='outlook-precedent-detail']");
    await page.locator("[data-testid='outlook-precedent-critical-source_id'] button").click();
    assert.equal(await page.evaluate(() => window.__COPIED), "precedent-case");
    await page.locator("[data-testid='outlook-precedent-open']").click();
    assert.deepEqual(await page.evaluate(() => window.__OPEN_LINKS), [{ url: `${web.origin}/?view=vault&matter_id=matter-prior&document_id=document-precedent-case&document_version_id=version-precedent-case&document_sha256=${"a".repeat(64)}#vault-search-documents`, target: "_blank", features: "noopener,noreferrer" }]);
    assert.equal(await page.locator("[data-testid='outlook-precedent-panel'] a[href], [data-testid='outlook-precedent-panel'] [href]").count(), 0);
    await page.locator("[data-action-row='precedent-search-back'] [data-testid='precedent-search-back']").click();
    await page.waitForSelector("[data-action-row='precedent.search']");
    await page.locator("[data-testid='precedent-search-open']").click(); await page.waitForSelector("[data-ready='true']");
    await page.locator("[data-testid='outlook-precedent-search-input']").fill("계약책임");
    const searchRequestStart = state.requests.length; const firstPage = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/outlook/precedents" && !new URL(r.url()).searchParams.has("cursor")); await page.locator("[data-testid='outlook-precedent-search-submit']").click(); await firstPage;
    const next = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/outlook/precedents" && new URL(r.url()).searchParams.has("cursor"));
    await page.locator("[data-testid='outlook-precedent-next']").click(); await next; await page.waitForFunction(() => document.querySelectorAll("[data-testid='outlook-precedent-result']").length === 2);
    assert.deepEqual(await page.locator("[data-testid='outlook-precedent-result']").evaluateAll((rows) => rows.map((r) => r.dataset.sourceId)), ["precedent-case", "precedent-internal"]);
    const precedentRequests = state.requests.slice(searchRequestStart).filter((request) => request.path === "/api/outlook/precedents");
    const firstSearchRequest = precedentRequests.find((request) => !new URL(request.query, "http://localhost").searchParams.has("cursor"));
    const nextSearchRequest = precedentRequests.find((request) => new URL(request.query, "http://localhost").searchParams.get("cursor") === "cursor-1");
    assert.equal(new URL(firstSearchRequest.query, "http://localhost").searchParams.get("q"), "계약책임");
    assert.equal(new URL(firstSearchRequest.query, "http://localhost").searchParams.get("matter_id"), B);
    assert.equal(new URL(firstSearchRequest.query, "http://localhost").searchParams.get("limit"), "10");
    assert.equal(new URL(nextSearchRequest.query, "http://localhost").searchParams.get("cursor"), "cursor-1");
    assert.doesNotMatch(JSON.stringify([firstSearchRequest, nextSearchRequest]), /actor|tenant|raw_body|storage_pointer/iu);
    const resetForTransient = page.waitForResponse((r) => r.status() === 200 && new URL(r.url()).pathname === "/api/outlook/precedents" && !new URL(r.url()).searchParams.has("cursor")); await page.locator("[data-testid='outlook-precedent-search-submit']").click(); await resetForTransient;
    state.appendTransient = true; state.appendAttempts = 0; const transientNext = page.waitForResponse((r) => r.status() === 200 && new URL(r.url()).pathname === "/api/outlook/precedents" && new URL(r.url()).searchParams.get("cursor") === "cursor-1"); await page.locator("[data-testid='outlook-precedent-next']").click(); await transientNext; await page.waitForSelector("[data-testid='outlook-precedent-retry']");
    assert.equal(await page.locator("[data-testid='outlook-precedent-busy']").count(), 0); assert.equal(await page.locator("[data-testid='outlook-precedent-retry']").count(), 1);
    state.appendTransient = false; const retriedNext = page.waitForResponse((r) => r.status() === 200 && new URL(r.url()).pathname === "/api/outlook/precedents" && new URL(r.url()).searchParams.get("cursor") === "cursor-1"); await page.locator("[data-testid='outlook-precedent-retry']").click(); await retriedNext; await page.waitForFunction(() => document.querySelector("[data-testid='outlook-precedent-busy']") === null); assert.equal(await page.locator("[data-testid='outlook-precedent-error']").count(), 0);
    state.currentLeak = true; const leaked = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/outlook/precedents" && !new URL(r.url()).searchParams.has("cursor")); await page.locator("[data-testid='outlook-precedent-search-submit']").click(); await leaked; await page.waitForSelector("[data-testid='outlook-precedent-error']");
    assert.equal(await page.locator("[data-testid='outlook-precedent-error']").count(), 1); state.currentLeak = false;
    state.duplicatePage = true; const duplicateFirst = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/outlook/precedents" && !new URL(r.url()).searchParams.has("cursor")); await page.locator("[data-testid='outlook-precedent-search-submit']").click(); await duplicateFirst; const duplicateNext = page.waitForResponse((r) => new URL(r.url()).pathname === "/api/outlook/precedents" && new URL(r.url()).searchParams.has("cursor")); await page.locator("[data-testid='outlook-precedent-next']").click(); await duplicateNext;
    await page.waitForSelector("[data-testid='outlook-precedent-error']"); assert.equal(await page.locator("[data-testid='outlook-precedent-error']").count(), 1); state.duplicatePage = false; const duplicateRetry = page.waitForResponse((r) => r.status() === 200 && new URL(r.url()).pathname === "/api/outlook/precedents" && new URL(r.url()).searchParams.get("cursor") === "cursor-1"); await page.locator("[data-testid='outlook-precedent-retry']").click(); await duplicateRetry; await page.waitForFunction(() => document.querySelector("[data-testid='outlook-precedent-busy']") === null); assert.equal(await page.locator("[data-testid='outlook-precedent-error']").count(), 0);

    state.holdSearch = true; state.searchGate = waitable(); const oldQuery = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/outlook/precedents" && !new URL(r.url()).searchParams.has("cursor")); await page.locator("[data-testid='outlook-precedent-search-input']").fill("계약책임"); await page.locator("[data-testid='outlook-precedent-search-submit']").click(); await oldQuery;
    await page.evaluate(() => { const input = document.querySelector("[data-testid='outlook-precedent-search-input']"); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set; setter.call(input, "새검색"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    state.holdSearch = false; state.searchGate.release(); await page.waitForFunction(() => document.querySelector("[data-testid='outlook-precedent-busy']") === null); assert.equal(await page.locator("[data-testid='outlook-precedent-result']").count(), 0); assert.equal(await page.locator("[data-testid='outlook-precedent-search-input']").inputValue(), "새검색");

    state.holdSearch = true; state.searchGate = waitable(); const backHeld = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/outlook/precedents"); await page.locator("[data-testid='outlook-precedent-search-submit']").click(); await backHeld; await page.locator("[data-testid='precedent-search-back']").click(); assert.equal(await page.locator("[data-action-row='precedent.search']").count(), 1); state.holdSearch = false; state.searchGate.release(); await page.waitForFunction(() => document.querySelector("[data-testid='outlook-precedent-panel']") === null); assert.equal(await page.locator("[data-testid='outlook-precedent-result']").count(), 0);

    await page.locator("[data-testid='precedent-search-open']").click(); await page.waitForSelector("[data-testid='outlook-precedent-panel'][data-ready='true']"); await page.locator("[data-testid='outlook-precedent-search-input']").fill("계약책임");

    state.holdSearch = true; state.searchGate = waitable();
    const heldSearch = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/outlook/precedents"); await page.locator("[data-testid='outlook-precedent-search-submit']").click(); await heldSearch;
    await page.evaluate(() => window.__SET_OUTLOOK_ITEM("B")); state.holdSearch = false; state.searchGate.release();
    await page.waitForFunction(() => document.querySelector("[data-testid='outlook-precedent-detail']") === null);
    assert.doesNotMatch(await page.locator("body").innerText(), /precedent-case/u);
    await selectMatter(page, B); await page.locator("[data-feature-id='all-functions']").click(); await page.locator("[data-testid='precedent-search-open']").click(); await page.waitForSelector("[data-testid='outlook-precedent-panel'][data-ready='true']"); await page.locator("[data-testid='outlook-precedent-search-input']").fill("계약책임");
    state.holdSearch = true; state.searchGate = waitable();
    const sessionSearch = page.waitForRequest((r) => new URL(r.url()).pathname === "/api/outlook/precedents"); await page.locator("[data-testid='outlook-precedent-search-submit']").click(); await sessionSearch;
    state.authLoss = true; state.holdSearch = false; const authSearch = page.waitForResponse((r) => r.status() === 401 && new URL(r.url()).pathname === "/api/outlook/precedents"); state.searchGate.release(); await authSearch;
    await page.waitForFunction(() => document.querySelector("[data-testid='business-gate']") !== null);
    assert.equal(await page.locator("[data-testid='business-gate']").count(), 1);
    assert.equal(await page.locator("[data-testid='outlook-overlay']").count(), 0); assert.equal(await page.locator("[data-testid='outlook-precedent-panel'], [data-testid='outlook-precedent-result']").count(), 0);
    state.authLoss = false;
    assert.doesNotMatch(await page.locator("body").innerText(), /precedent-case/u);
    for (const mode of ["not-ready", "stale"]) { state.readinessMode = mode; await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector("[data-feature-id='all-functions']"); await selectMatter(page, B); await page.locator("[data-feature-id='all-functions']").click(); await page.locator("[data-testid='precedent-search-open']").click(); await page.waitForSelector("[data-testid='outlook-precedent-panel'][data-ready='false']"); assert.equal(await page.locator("[data-testid='outlook-precedent-search-submit']").count(), 0); }
    state.readinessMode = "ready"; await page.reload({ waitUntil: "domcontentloaded" }); await page.waitForSelector("[data-feature-id='all-functions']"); await selectMatter(page, B); await page.evaluate(() => { Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false }); window.dispatchEvent(new Event("offline")); }); const offlineRequests = state.requests.length; await page.locator("[data-feature-id='all-functions']").click(); const offlineOpener = page.locator("[data-testid='precedent-search-open']"); assert.ok(await offlineOpener.count() === 0 || await offlineOpener.isDisabled()); assert.equal(state.requests.slice(offlineRequests).filter((request) => /precedents/.test(request.path)).length, 0);
  } finally { await page.close(); await browser.close(); await new Promise((resolve) => web.server.close(resolve)); }
});
