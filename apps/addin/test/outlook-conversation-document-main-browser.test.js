import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";

import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";
import { outlookItemContextKey } from "../src/outlook-item-events.js";
import { createOutlookOperationItemContextRef } from "../src/outlook-operation-receipts.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIST = path.join(ROOT, "apps/addin/dist");
const ARTIFACT_DIR = process.env.OUTLOOK_MAIN_INTEGRATION_ARTIFACT_DIR || "";
const MATTER_A = "matter-main-a";
const MATTER_B = "matter-main-b";
const CONNECTION = "m365_connection_main_qa";
const HASH = "a".repeat(64);
const json = (body, status = 200) => ({ status, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });

function waitable() {
  let release;
  const promise = new Promise((resolve) => { release = resolve; });
  return { promise, release };
}

function officeItem(key) {
  return {
    itemId: `office-${key}`,
    subject: `계약서 검토 요청 ${key}`,
    internetMessageId: `<main-${key}@example.invalid>`,
    conversationId: `conversation-main-${key}`,
    from: { displayName: "상대방", emailAddress: "sender@example.invalid" },
    to: [],
    attachments: [],
    body: { getAsync(_type, callback) { callback({ status: "succeeded", value: `공급계약 검토 요청 ${key}` }); } },
    getAllInternetHeadersAsync(callback) { callback({ status: "succeeded", value: "Date: Mon, 10 Aug 2026 00:00:00 +0000" }); },
  };
}

function conversationPolicy(matterId, conversationId, status) {
  return {
    policy_id: `policy-${matterId}`,
    conversation_id: conversationId,
    matter_id: matterId,
    status,
    pause_reason: status === "paused" ? "동기화 대기" : null,
    version: 3,
    created_at: "2026-08-08T00:00:00.000Z",
    updated_at: "2026-08-08T00:01:00.000Z",
    revoked_at: status === "revoked" ? "2026-08-08T00:02:00.000Z" : null,
  };
}

function conversationCurrent(matterId, conversationId, item, ready = true) {
  return {
    request_id: `conversation-current-${matterId}`,
    outcome: "passed",
    item,
    readiness: { authoritative: true, runtime_ready: ready, auto_filing_enabled: ready },
    safe_error_codes: [],
    production_ready_claim: false,
  };
}

function conversationMutation(matterId, conversationId, status, outcome) {
  return {
    request_id: `conversation-mutation-${matterId}`,
    outcome,
    item: conversationPolicy(matterId, conversationId, status),
    subscription_sync: "synchronized",
    safe_error_codes: [],
    production_ready_claim: false,
  };
}

function documentTemplate() {
  return {
    template_id: "template-main",
    template_version: "v1",
    template_hash: HASH,
    label: "승인된 위임 계약서",
    category: "document",
    merge_field_count: 0,
    merge_fields: [],
    signer_roles: [],
    requires_approval: true,
    approval_receipt_present: true,
    raw_template_body_included: false,
    raw_contact_values_included: false,
    production_ready_claim: false,
  };
}

function documentCatalog(matterId) {
  const documentId = `document-${matterId}`;
  const versionId = `version-${matterId}`;
  return {
    request_id: `document-catalog-${matterId}`,
    outcome: "passed",
    matter_id: matterId,
    templates: [documentTemplate()],
    approval_requests: [],
    esign_requests: [{
      request_id: `esign-${matterId}`,
      matter_id: matterId,
      document: { document_id: documentId, version_id: versionId, sha256: HASH },
      recipients: [{ recipient_ref: "party-client", role: "client", routing_order: 1 }],
      state: "draft_created",
      canonical_document_ref: `matter://${matterId}/documents/${documentId}/versions/${versionId}`,
      can_send: false,
      can_reconcile: true,
      completion_artifacts: null,
      production_ready_claim: false,
    }],
    readiness: { authoritative: true, builder_ready: true, esign_ready: true },
    safe_error_codes: [],
    count_leak_prevented: true,
    production_ready_claim: false,
  };
}

function receiptSummary(currentItem, matterId) {
  return {
    item_context_ref: createOutlookOperationItemContextRef({
      itemContextKey: outlookItemContextKey({
        item: currentItem,
        mode: currentItem.mode,
        provenance: currentItem.provenance,
      }),
      canonicalGraphMessageId: currentItem.canonical_graph_message_id,
    }),
    matter_id: matterId,
    operation: "file_email",
    outcome: "created",
    filing_mode: "manual",
    request_id: `filing-${matterId}`,
    email_thread_id: `thread-${matterId}`,
    document_ids: [`filed-${matterId}`],
    timeline_event_ids: [`timeline-${matterId}`],
    completed_at: "2026-08-10T00:00:00.000Z",
  };
}

function createState(connection = "connected") {
  return {
    connection,
    requests: [],
    conversationPolicies: new Map([[MATTER_A, null], [MATTER_B, "active"]]),
    conversationReady: new Map([[MATTER_A, true], [MATTER_B, false]]),
    conversationMutationGate: null,
    documentGetGate: null,
    documentMutationGate: null,
    forceConversation401: false,
    authDenied: false,
  };
}

async function openFixture(browser, web, state, width = 320) {
  const page = await browser.newPage({ viewport: { width, height: 760 } });
  await page.addInitScript(({ first, second }) => {
    const items = { A: first, B: second };
    const handlers = [];
    const mailbox = {
      item: items.A,
      userProfile: { emailAddress: "qa@example.invalid" },
      addHandlerAsync(_type, handler) { handlers.push(handler); },
      removeHandlerAsync(_type, { handler } = {}) { const index = handlers.indexOf(handler); if (index >= 0) handlers.splice(index, 1); },
      convertToRestId(id) { return id.replace("office-", "rest-"); },
    };
    window.Office = {
      onReady(callback) { callback({ host: "Outlook", platform: "web" }); },
      EventType: { ItemChanged: "itemChanged" },
      actions: { associate() {} },
      MailboxEnums: { RestVersion: { v2_0: "v2.0" }, CoercionType: { Text: "text" } },
      context: { requirements: { isSetSupported: () => false }, mailbox },
    };
    window.OfficeRuntime = { storage: { getItem: async () => null, setItem: async () => {}, removeItem: async () => {} } };
    window.sessionStorage.setItem("lawos_addin_session_token", "lawos_session_v1.main-integration");
    window.__SET_OUTLOOK_ITEM = (key) => { mailbox.item = items[key]; for (const handler of [...handlers]) handler(); };
    window.__OPEN_LINKS = [];
    window.open = (url, target, features) => { window.__OPEN_LINKS.push({ url: String(url), target, features }); return null; };
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (value) => { window.__COPIED = String(value); } } });
  }, { first: officeItem("A"), second: officeItem("B") });

  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let body = {};
    try { body = request.postDataJSON() ?? {}; } catch {}
    state.requests.push({ method: request.method(), path: url.pathname, query: url.search, body });
    const fulfill = (payload, status = 200) => route.fulfill(json(payload, status));
    if (url.pathname === "/api/auth/office-sso/config") return fulfill({ item: { configured: true, client_id: "main-browser-client", tenant_id: "organizations", api_scope: "api://main-browser-client/access_as_user", scopes: ["api://main-browser-client/access_as_user"], callback_uri: `${url.origin}/addin/oauth-callback.html`, authority: "https://login.microsoftonline.com/organizations" } });
    if (url.pathname === "/api/auth/session") return state.authDenied
      ? fulfill({ safe_error_code: "AUTH_SESSION_INVALID" }, 401)
      : fulfill({ authenticated: true, principal: { user_id: "main-browser-user", tenant_id: "main-browser-tenant" } });
    if (url.pathname === "/api/outlook/connection" && request.method() === "GET") return fulfill({ item: { status: state.connection, active: state.connection === "connected", ...(state.connection === "connected" ? { connection_id: CONNECTION } : {}), state_version: state.connection === "connected" ? 1 : 0, mailbox_address: "qa@example.invalid" } });
    if (url.pathname === "/api/outlook/bootstrap") return fulfill({ item: { ready: true } });
    if (url.pathname === "/api/outlook/messages/identity") return fulfill({ item: { canonical_graph_message_id: `canonical-${body.rest_message_id}`, rest_message_id: body.rest_message_id, internet_message_id: body.internet_message_id, conversation_id: body.conversation_id } });
    if (url.pathname === "/api/outlook/operation-receipts/readback") return fulfill({ items: [receiptSummary(body.current_item, body.matter_id)] });
    if (url.pathname === "/api/outlook/matters") return fulfill({ items: [
      { matter_id: MATTER_A, matter_code: "MAIN/A", title: "공급계약 검토 A", client_display_name: "예시 고객", status: "open" },
      { matter_id: MATTER_B, matter_code: "MAIN/B", title: "공급계약 검토 B", client_display_name: "예시 고객", status: "open" },
    ] });
    if (/\/timeline$/u.test(url.pathname)) {
      const matterId = url.pathname.split("/").at(-2);
      return fulfill({ request_id: `timeline-${matterId}`, outcome: "passed", item: {
        matter_id: matterId,
        visible_entries: [{ matter_id: matterId, event_id: `timeline-${matterId}`, type: "outlook.email.filed", title: "메일 저장", occurred_at: "2026-08-10T00:00:00.000Z", source_ref: `thread-${matterId}` }],
        page_info: { limit: 8, has_more: false, next_cursor: null },
      } });
    }
    if (/^\/api\/outlook\/matters\/[^/]+\/documents$/u.test(url.pathname)) return fulfill({ items: [] });
    if (url.pathname === "/api/outlook/conversation-policies" && request.method() === "GET") {
      if (state.forceConversation401) { state.authDenied = true; return fulfill({ safe_error_code: "AUTH_SESSION_INVALID" }, 401); }
      const matterId = url.searchParams.get("matter_id");
      const conversationId = url.searchParams.get("conversation_id");
      const status = state.conversationPolicies.get(matterId);
      return fulfill(conversationCurrent(matterId, conversationId, status ? conversationPolicy(matterId, conversationId, status) : null, state.conversationReady.get(matterId) !== false));
    }
    if (url.pathname === "/api/outlook/conversation-policies" && request.method() === "POST") {
      const gate = state.conversationMutationGate; state.conversationMutationGate = null;
      if (gate) await gate.promise;
      return fulfill(conversationMutation(body.matter_id, body.conversation_id, "active", "created"), 201);
    }
    if (/^\/api\/outlook\/conversation-policies\/[^/]+\/revoke$/u.test(url.pathname)) {
      return fulfill(conversationMutation(body.matter_id, `conversation-main-${body.matter_id === MATTER_A ? "A" : "B"}`, "revoked", "revoked"));
    }
    if (url.pathname === "/api/outlook/documents" && request.method() === "GET") {
      const matterId = url.searchParams.get("matter_id");
      const gate = state.documentGetGate; state.documentGetGate = null;
      if (gate) await gate.promise;
      return fulfill(documentCatalog(matterId));
    }
    if (url.pathname === "/api/outlook/documents/approval-requests" && request.method() === "POST") {
      const gate = state.documentMutationGate; state.documentMutationGate = null;
      if (gate) await gate.promise;
      return fulfill({ raw_body: "must-never-paint", provider_credentials: "must-never-paint" });
    }
    return fulfill({ item: {}, items: [], outcome: "ready", production_ready_claim: false });
  });

  await page.goto(`${web.origin}/addin/`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".outlook-compact-shell");
  await page.waitForFunction(() => document.querySelector("[data-feature-id='all-functions']")?.disabled === false);
  return page;
}

async function selectMatter(page, matterId) {
  await page.locator("[data-feature-id='matter.search']").click();
  await page.locator("#matter-search-input").fill(matterId);
  await page.waitForFunction(() => document.querySelectorAll("#matter-select option").length > 1);
  const readback = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/outlook/operation-receipts/readback");
  await page.locator("#matter-select").selectOption(matterId);
  await readback;
  await page.locator("[data-testid='outlook-overlay-close']").click();
  await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
}

async function openAllFunctions(page) {
  await page.locator("[data-feature-id='all-functions']").click();
  await page.waitForSelector("[data-action-row='conversation.auto-save']");
}

async function shellMetrics(page) {
  return page.evaluate(() => {
    const shell = document.querySelector(".outlook-compact-shell");
    const panel = document.querySelector(".outlook-overlay-panel");
    const lineFailures = [...document.querySelectorAll(".outlook-flat-action-label, .outlook-one-line, .outlook-flat-action-button")].flatMap((element) => {
      const style = getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || element.clientWidth < 2) return [];
      const range = document.createRange(); range.selectNodeContents(element);
      const lines = new Set([...range.getClientRects()].map((rect) => Math.round(rect.top * 10) / 10));
      const safelyTruncated = style.whiteSpace === "nowrap" && ["hidden", "clip"].includes(style.overflowX) && style.textOverflow === "ellipsis";
      return lines.size <= 1 && (element.scrollWidth <= element.clientWidth || safelyTruncated) ? [] : [{ text: element.textContent.trim().slice(0, 80), lines: lines.size }];
    });
    return {
      viewport: window.innerWidth,
      document: { clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth },
      shell: { clientWidth: shell.clientWidth, scrollWidth: shell.scrollWidth },
      panel: panel ? { clientWidth: panel.clientWidth, scrollWidth: panel.scrollWidth } : null,
      lineFailures,
    };
  });
}

function latestRequest(state, predicate) {
  return [...state.requests].reverse().find(predicate);
}

async function settlePaint(page) {
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

test("OUTM28/OUTM34 built main shell fences context and keeps compact command UI", { timeout: 120_000 }, async () => {
  if (ARTIFACT_DIR) mkdirSync(ARTIFACT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  const evidence = { rails: [], screenshots: [], metrics: {}, requests: {} };
  try {
    const state = createState();
    const page = await openFixture(browser, web, state);
    evidence.rails = await page.locator("[data-testid='outlook-icon-rail'] button").evaluateAll((buttons) => buttons.map((button) => button.dataset.featureId));
    assert.deepEqual(evidence.rails, ["mail.save-with-attachments", "matter.search", "task.create", "time-entry.draft", "all-functions"]);
    await selectMatter(page, MATTER_A);
    await page.waitForSelector("[data-testid='outlook-receipt-recovery']");
    assert.equal(await page.locator("[data-testid='outlook-readiness-status']").count(), 0);
    assert.match(
      await page.locator("[data-testid='outlook-receipt-recovery']").textContent(),
      /저장된 메일 기록을 확인했습니다\./u,
    );
    if (ARTIFACT_DIR) {
      const target = path.join(ARTIFACT_DIR, "main-recovered-receipt-no-readiness.png");
      await page.screenshot({ path: target, fullPage: false }); evidence.screenshots.push(target);
    }
    await openAllFunctions(page);
    assert.equal(await page.locator("[data-action-row='conversation.auto-save']").count(), 1);
    assert.equal(await page.locator("[data-action-row='document.create-and-sign-status']").count(), 1);
    assert.equal(await page.locator(".outlook-overlay-panel h2").textContent(), "추가 작업");

    await page.setViewportSize({ width: 160, height: 760 });
    evidence.metrics.width160 = await shellMetrics(page);
    assert.equal(evidence.metrics.width160.document.scrollWidth, evidence.metrics.width160.document.clientWidth);
    assert.ok(evidence.metrics.width160.shell.scrollWidth <= evidence.metrics.width160.shell.clientWidth);
    assert.ok(evidence.metrics.width160.panel.scrollWidth <= evidence.metrics.width160.panel.clientWidth);
    assert.deepEqual(evidence.metrics.width160.lineFailures, []);
    if (ARTIFACT_DIR) {
      const target = path.join(ARTIFACT_DIR, "main-catalog-160.png");
      await page.screenshot({ path: target, fullPage: false }); evidence.screenshots.push(target);
    }

    await page.locator("[data-testid='conversation-auto-save-open']").click();
    await page.waitForSelector("[data-testid='outlook-conversation-policy-panel'][aria-busy='false']");
    assert.equal(await page.locator(".outlook-overlay-panel h2").textContent(), "대화 자동 저장");
    const conversationGetA = latestRequest(state, (request) => request.method === "GET" && request.path === "/api/outlook/conversation-policies");
    assert.equal(new URLSearchParams(conversationGetA.query).get("m365_connection_id"), CONNECTION);
    assert.equal(new URLSearchParams(conversationGetA.query).get("matter_id"), MATTER_A);
    assert.equal(new URLSearchParams(conversationGetA.query).get("conversation_id"), "conversation-main-A");
    const conversationActionState = await page.locator("[data-testid='outlook-conversation-policy-panel']").evaluate((panel) => ({
      disabled: panel.querySelector("[data-testid='outlook-conversation-policy-action']")?.disabled,
      ready: panel.dataset.ready,
      status: panel.dataset.policyStatus,
      message: panel.querySelector("[data-testid='outlook-conversation-policy-status']")?.textContent ?? "",
    }));
    assert.equal(conversationActionState.disabled, false, JSON.stringify({
      conversationActionState,
      readbacks: state.requests.filter((request) => request.path === "/api/outlook/operation-receipts/readback"),
    }));
    await page.locator("[data-testid='conversation-auto-save-back']").click();
    await page.waitForFunction(() => document.activeElement?.id === "conversation-auto-save-open");

    await page.locator("[data-testid='conversation-auto-save-open']").click();
    await page.waitForSelector("[data-testid='outlook-conversation-policy-panel'][aria-busy='false']");
    const conversationGate = waitable(); state.conversationMutationGate = conversationGate;
    const enableRequest = page.waitForRequest((request) => request.method() === "POST" && new URL(request.url()).pathname === "/api/outlook/conversation-policies");
    const enableResponse = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/outlook/conversation-policies");
    await page.locator("[data-testid='outlook-conversation-policy-action']").click(); await enableRequest;
    const enable = latestRequest(state, (request) => request.method === "POST" && request.path === "/api/outlook/conversation-policies");
    assert.deepEqual(Object.keys(enable.body), ["m365_connection_id", "matter_id", "conversation_id", "seed_email_thread_id", "expected_version", "idempotency_key", "reason"]);
    assert.deepEqual({ ...enable.body, idempotency_key: "<key>" }, {
      m365_connection_id: CONNECTION,
      matter_id: MATTER_A,
      conversation_id: "conversation-main-A",
      seed_email_thread_id: `thread-${MATTER_A}`,
      expected_version: 0,
      idempotency_key: "<key>",
      reason: "Outlook 대화 자동 저장 켜기",
    });
    assert.match(enable.body.idempotency_key, /^outlook-conversation-enable:/u);
    assert.equal(await page.locator("[data-testid='outlook-overlay-close']").isDisabled(), false);
    await page.locator("[data-testid='outlook-overlay-close']").click();
    await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
    await page.evaluate(() => window.__SET_OUTLOOK_ITEM("B"));
    conversationGate.release();
    await enableResponse;
    await settlePaint(page);
    assert.equal(await page.locator("[data-testid='outlook-conversation-policy-panel']").count(), 0);
    assert.doesNotMatch(await page.locator("body").innerText(), /자동 저장 켬/u);

    await selectMatter(page, MATTER_B);
    await openAllFunctions(page);
    await page.locator("[data-testid='conversation-auto-save-open']").click();
    await page.waitForSelector("[data-testid='outlook-conversation-policy-panel'][data-policy-status='active'][aria-busy='false']");
    assert.equal(await page.locator("[data-testid='outlook-conversation-policy-status']").textContent(), "동기화 필요");
    const revokeRequest = page.waitForRequest((request) => request.method() === "POST" && /\/revoke$/u.test(new URL(request.url()).pathname));
    await page.locator("[data-testid='outlook-conversation-policy-action']").click(); await revokeRequest;
    await page.waitForSelector("[data-testid='outlook-conversation-policy-panel'][data-policy-status='revoked'][aria-busy='false']");
    const revoke = latestRequest(state, (request) => request.method === "POST" && /\/revoke$/u.test(request.path));
    assert.equal(revoke.path, `/api/outlook/conversation-policies/policy-${MATTER_B}/revoke`);
    assert.deepEqual(Object.keys(revoke.body), ["m365_connection_id", "matter_id", "expected_version", "idempotency_key", "reason"]);
    assert.equal(revoke.body.m365_connection_id, CONNECTION);
    assert.equal(revoke.body.matter_id, MATTER_B);
    assert.equal(revoke.body.expected_version, 3);
    assert.match(revoke.body.idempotency_key, /^outlook-conversation-revoke:/u);
    assert.equal(revoke.body.reason, "Outlook 대화 자동 저장 끄기");

    await page.locator("[data-testid='conversation-auto-save-back']").click();
    const documentGetGate = waitable(); state.documentGetGate = documentGetGate;
    const heldDocumentGet = page.waitForRequest((request) => request.method() === "GET" && new URL(request.url()).pathname === "/api/outlook/documents");
    const heldDocumentGetResponse = page.waitForResponse((response) => response.request().method() === "GET" && new URL(response.url()).pathname === "/api/outlook/documents");
    await page.locator("[data-testid='document-create-and-sign-status-open']").click(); await heldDocumentGet;
    assert.equal(await page.locator(".outlook-overlay-panel h2").textContent(), "문서 만들기·서명 상태");
    assert.equal(await page.locator("[data-testid='document-create-and-sign-status-back']").isDisabled(), false);
    assert.equal(await page.locator("[data-testid='outlook-overlay-close']").isDisabled(), false);
    await page.locator("[data-testid='document-create-and-sign-status-back']").click();
    await page.waitForFunction(() => document.activeElement?.id === "document-create-and-sign-status-open");
    documentGetGate.release(); await heldDocumentGetResponse; await settlePaint(page);
    assert.equal(await page.locator("[data-testid='outlook-document-signing-panel']").count(), 0);

    await page.locator("[data-testid='document-create-and-sign-status-open']").click();
    await page.waitForSelector("[data-testid='outlook-document-signing-panel'][aria-busy='false']");
    await page.setViewportSize({ width: 320, height: 760 });
    evidence.metrics.width320 = await shellMetrics(page);
    assert.equal(evidence.metrics.width320.document.scrollWidth, evidence.metrics.width320.document.clientWidth);
    assert.ok(evidence.metrics.width320.panel.scrollWidth <= evidence.metrics.width320.panel.clientWidth);
    assert.deepEqual(evidence.metrics.width320.lineFailures, []);
    if (ARTIFACT_DIR) {
      const target = path.join(ARTIFACT_DIR, "document-status-320.png");
      await page.screenshot({ path: target, fullPage: false }); evidence.screenshots.push(target);
    }
    const canonical = `matter://${MATTER_B}/documents/document-${MATTER_B}/versions/version-${MATTER_B}`;
    assert.equal(await page.locator("[data-testid='document-canonical-ref']").textContent(), canonical);
    assert.equal(await page.locator("[data-testid='outlook-document-signing-panel'] a[href]").count(), 0);
    await page.locator("[data-testid='document-canonical-copy']").click();
    await page.locator("[data-testid='document-canonical-open']").click();
    assert.equal(await page.evaluate(() => window.__COPIED), canonical);
    const opened = await page.evaluate(() => window.__OPEN_LINKS);
    assert.equal(opened.length, 1);
    assert.equal(new URL(opened[0].url).searchParams.get("document_id"), `document-${MATTER_B}`);
    assert.equal(new URL(opened[0].url).hash, "#vault-search-documents");
    assert.equal(opened[0].target, "_blank"); assert.equal(opened[0].features, "noopener,noreferrer");
    assert.doesNotMatch(opened[0].url, /^matter:|docusign|provider/iu);

    const documentMutationGate = waitable(); state.documentMutationGate = documentMutationGate;
    const heldDocumentMutation = page.waitForRequest((request) => request.method() === "POST" && new URL(request.url()).pathname === "/api/outlook/documents/approval-requests");
    const heldDocumentMutationResponse = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/outlook/documents/approval-requests");
    await page.locator("[data-testid='document-request-approval']").click(); await heldDocumentMutation;
    const approval = latestRequest(state, (request) => request.method === "POST" && request.path === "/api/outlook/documents/approval-requests");
    assert.deepEqual(Object.keys(approval.body), ["matter_id", "template_id", "template_version", "title", "merge_data", "signer_role_refs", "idempotency_key", "explicit_human_action"]);
    assert.equal(approval.body.matter_id, MATTER_B); assert.deepEqual(approval.body.merge_data, {}); assert.deepEqual(approval.body.signer_role_refs, []);
    assert.match(approval.body.idempotency_key, /^outlook-document-approval:/u); assert.equal(approval.body.explicit_human_action, true);
    assert.doesNotMatch(JSON.stringify(approval.body), /tenant|actor|credential|token|raw_body|document_bytes|storage_pointer|provider/iu);
    assert.equal(await page.locator("[data-testid='document-create-and-sign-status-back']").isDisabled(), false);
    await page.locator("[data-testid='document-create-and-sign-status-back']").click();
    await page.locator("[data-testid='outlook-overlay-close']").click();
    await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
    await selectMatter(page, MATTER_A);
    documentMutationGate.release(); await heldDocumentMutationResponse; await settlePaint(page);
    assert.doesNotMatch(await page.locator("body").innerText(), /must-never-paint|provider_credentials|raw_body/u);

    await openAllFunctions(page);
    await page.locator("[data-testid='outlook-overlay-close']").click();
    await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
    await page.waitForFunction(() => document.activeElement?.dataset?.featureId === "all-functions");

    state.forceConversation401 = true;
    await openAllFunctions(page);
    await page.locator("[data-testid='conversation-auto-save-open']").click();
    await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
    await page.waitForSelector("[data-testid='lawos-login-button']");
    assert.doesNotMatch(await page.locator("body").innerText(), /AUTH_SESSION|main-browser-tenant|credential|token/u);
    evidence.requests.connected = state.requests.filter((request) => ["/api/outlook/conversation-policies", "/api/outlook/documents", "/api/outlook/documents/approval-requests"].includes(request.path) || /\/revoke$/u.test(request.path));
    await page.close();

    const disconnectedState = createState("not_connected");
    const disconnected = await openFixture(browser, web, disconnectedState, 160);
    assert.deepEqual(await disconnected.locator("[data-testid='outlook-icon-rail'] button").evaluateAll((buttons) => buttons.map((button) => button.dataset.featureId)), evidence.rails);
    await selectMatter(disconnected, MATTER_A);
    await openAllFunctions(disconnected);
    assert.equal(await disconnected.locator("[data-testid='document-create-and-sign-status-open']").isDisabled(), false);
    await disconnected.locator("[data-testid='conversation-auto-save-open']").click();
    await disconnected.waitForSelector("[data-testid='outlook-conversation-policy-action']");
    assert.equal(await disconnected.locator("[data-testid='outlook-conversation-policy-action']").textContent(), "다시 연결");
    assert.equal(await disconnected.locator("[data-testid='outlook-conversation-policy-action']").isDisabled(), false);
    await disconnected.context().setOffline(true);
    await disconnected.waitForFunction(() => document.querySelector("[data-testid='outlook-conversation-policy-action']")?.disabled === true);
    if (ARTIFACT_DIR) {
      const target = path.join(ARTIFACT_DIR, "conversation-reconnect-offline-160.png");
      await disconnected.screenshot({ path: target, fullPage: false }); evidence.screenshots.push(target);
    }
    await disconnected.context().setOffline(false);
    await disconnected.waitForFunction(() => document.querySelector("[data-testid='outlook-conversation-policy-action']")?.disabled === false);
    await disconnected.locator("[data-testid='conversation-auto-save-back']").click();
    await disconnected.locator("[data-testid='document-create-and-sign-status-open']").click();
    await disconnected.waitForSelector("[data-testid='outlook-document-signing-panel'][aria-busy='false']");
    assert.ok(disconnectedState.requests.some((request) => request.method === "GET" && request.path === "/api/outlook/documents" && new URLSearchParams(request.query).get("matter_id") === MATTER_A));
    assert.equal(disconnectedState.requests.some((request) => /graph|docusign|provider/iu.test(request.path)), false);
    evidence.requests.disconnected = disconnectedState.requests.filter((request) => request.path === "/api/outlook/documents" || request.path === "/api/outlook/conversation-policies");
    await disconnected.close();

    assert.ok([...evidence.requests.connected, ...evidence.requests.disconnected].every((request) => request.path.startsWith("/api/")));
    if (ARTIFACT_DIR) writeFileSync(path.join(ARTIFACT_DIR, "browser-observables.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  } finally {
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
});
