import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

import { startOutlookAddinStaticServer } from "../../../scripts/lib/outlook-addin-static-server.mjs";
import { readyOutlookReadinessResponse } from "./helpers/outlook-readiness-fixture.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const DIST = path.join(ROOT, "apps/addin/dist");
const EVIDENCE = path.join(ROOT, ".omo/evidence/amic-os-vault-ojs-att-00-ui");
const MATTER = "matter-vault-picker-browser";
const EXACT = Object.freeze({
  document_id: "document-vault-picker-browser",
  version_id: "version-vault-picker-browser-7",
  file_object_id: "file-vault-picker-browser-7",
  sha256: "b".repeat(64),
  byte_size: 37,
  mime_type: "application/pdf",
});
const OPERATION_ID = `vaultop_${"a".repeat(32)}`;

const json = (body, status = 200) => ({
  status,
  contentType: "application/json; charset=utf-8",
  body: JSON.stringify(body),
});

function authorization() {
  return {
    request_id: "request-vault-picker-authorize",
    outcome: "attachment_delivery_authorized",
    ok: true,
    operation_id: OPERATION_ID,
    attachment_name: "공급계약서-확정본.pdf",
    exact_version: EXACT,
    delivery_uri: "https://lawos-api.example.test/api/outlook/vault/attachments/delivery/lawos_ovd_v1.opaque.ciphertext.tag",
    expires_at: "2026-08-29T02:00:30.000Z",
    receipt: {
      operation_kind: "attach_outlook",
      stage: "authorized",
      matter_id: MATTER,
      exact_version: EXACT,
    },
    lawos_delivery_channel: true,
    provider_authority_verified: true,
    provider_grant_returned: false,
    raw_bytes_included: false,
    storage_locator_returned: false,
    production_ready_claim: false,
  };
}

function completion() {
  return {
    request_id: "request-vault-picker-complete",
    outcome: "attachment_verified",
    ok: true,
    operation_id: OPERATION_ID,
    operation_kind: "attach_outlook",
    exact_version: EXACT,
    receipt: {
      operation_kind: "attach_outlook",
      stage: "attached",
      matter_id: MATTER,
      exact_version: EXACT,
    },
    attachment_ack_sha256: "c".repeat(64),
    graph_host_verified: true,
    client_ack_authoritative: false,
    host_verification_authority: "microsoft-graph-draft-mime",
    attachment_id_returned: false,
    attachment_name_returned: false,
    provider_grant_returned: false,
    raw_bytes_included: false,
    storage_locator_returned: false,
    production_ready_claim: false,
  };
}

test("sealed build flag controls the compose picker; flag-on cancellation, exact attach, retry, and ItemChanged remain bounded", async () => {
  await mkdir(EVIDENCE, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
  const requests = [];
  let completionAttempts = 0;

  await page.addInitScript(({ token, exact }) => {
    const handlers = [];
    const hostCalls = [];
    const attachments = [];
    const compose = {
      itemId: "office-vault-picker-compose",
      internetMessageId: null,
      conversationId: null,
      subject: {
        getAsync(callback) { callback({ status: "succeeded", value: "Vault picker compose" }); },
      },
      from: { displayName: "작성자", emailAddress: "qa@example.invalid" },
      to: { getAsync(callback) { callback({ status: "succeeded", value: [] }); } },
      cc: { getAsync(callback) { callback({ status: "succeeded", value: [] }); } },
      bcc: { getAsync(callback) { callback({ status: "succeeded", value: [] }); } },
      attachments: [],
      body: { getAsync(_type, callback) { callback({ status: "succeeded", value: "작성 중 본문" }); } },
      saveAsync(callback) {
        hostCalls.push({ method: "saveAsync" });
        callback({ status: "succeeded", value: "office-vault-picker-compose" });
      },
      addFileAttachmentAsync(uri, name, options, callback) {
        hostCalls.push({ method: "addFileAttachmentAsync", uri, name, options });
        attachments.push({ id: "office-vault-picker-attachment", name, size: exact.byte_size });
        callback({ status: "succeeded", value: "office-vault-picker-attachment" });
      },
      getAttachmentsAsync(callback) {
        hostCalls.push({ method: "getAttachmentsAsync" });
        callback({ status: "succeeded", value: attachments.map((entry) => ({ ...entry })) });
      },
    };
    const read = {
      itemId: "office-vault-picker-read",
      subject: "Vault picker read item",
      internetMessageId: "<vault-picker-read@example.invalid>",
      conversationId: "vault-picker-read-conversation",
      from: { displayName: "상대방", emailAddress: "sender@example.invalid" },
      to: [],
      cc: [],
      attachments: [],
      body: { getAsync(_type, callback) { callback({ status: "succeeded", value: "읽기 본문" }); } },
      getAllInternetHeadersAsync(callback) {
        callback({ status: "succeeded", value: "Date: Sat, 29 Aug 2026 00:00:00 +0900" });
      },
    };
    const mailbox = {
      item: compose,
      userProfile: { emailAddress: "qa@example.invalid" },
      addHandlerAsync(_type, handler) { handlers.push(handler); },
      removeHandlerAsync(_type, { handler } = {}) {
        const index = handlers.indexOf(handler);
        if (index >= 0) handlers.splice(index, 1);
      },
      convertToRestId(value) { return value.replace("office-", "rest-"); },
    };
    window.Office = {
      onReady(callback) { callback({ host: "Outlook", platform: "web" }); },
      AsyncResultStatus: { Succeeded: "succeeded", Failed: "failed" },
      EventType: { ItemChanged: "itemChanged" },
      actions: { associate() {} },
      MailboxEnums: {
        RestVersion: { v2_0: "v2.0" },
        CoercionType: { Text: "text" },
      },
      context: {
        requirements: { isSetSupported: () => false },
        mailbox,
      },
    };
    window.OfficeRuntime = { storage: {
      async getItem() { return null; },
      async setItem() {},
      async removeItem() {},
    } };
    window.__VAULT_PICKER_HOST_CALLS = () => hostCalls.map((entry) => ({ ...entry }));
    window.__VAULT_PICKER_SET_READ_ITEM = () => {
      mailbox.item = read;
      handlers.slice().forEach((handler) => handler());
    };
    window.sessionStorage.setItem("lawos_addin_session_token", token);
  }, {
    token: "lawos_session_v1.vault-picker-browser",
    exact: EXACT,
  });

  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const body = method === "POST" ? request.postDataJSON?.() ?? {} : null;
    requests.push({ path: url.pathname, search: url.search, method, body });
    const fulfill = (payload, status = 200) => route.fulfill(json(payload, status));
    if (url.pathname === "/api/auth/office-sso/config") return fulfill({ item: {
      configured: true,
      client_id: "vault-picker-browser-client",
      tenant_id: "organizations",
      api_scope: "api://vault-picker-browser-client/access_as_user",
      scopes: ["api://vault-picker-browser-client/access_as_user"],
      callback_uri: `${url.origin}/addin/oauth-callback.html`,
      authority: "https://login.microsoftonline.com/organizations",
    } });
    if (url.pathname === "/api/auth/session") return fulfill({ authenticated: true, session: {
      tenant_id: "tenant-vault-picker-browser",
      user_id: "user-vault-picker-browser",
      outlook_desktop_principal_ref: `odpr_${"A".repeat(43)}`,
    } });
    if (url.pathname === "/api/outlook/connection") return fulfill({ item: {
      status: "connected",
      active: true,
      connection_id: "m365_connection_vault_picker_browser",
      state_version: 7,
      mailbox_address: "qa@example.invalid",
    } });
    if (url.pathname === "/api/outlook/readiness") return fulfill(readyOutlookReadinessResponse());
    if (url.pathname === "/api/outlook/bootstrap") return fulfill({ item: { ready: true } });
    if (url.pathname === "/api/outlook/matters") return fulfill({ items: [{
      matter_id: MATTER,
      matter_code: "M-VAULT-ATT",
      title: "Vault 첨부 검증",
      client_display_name: "예시 고객",
      status: "open",
    }] });
    if (url.pathname === "/api/outlook/messages/identity") return fulfill({ item: {
      rest_message_id: body.rest_message_id,
      internet_message_id: body.internet_message_id,
      conversation_id: body.conversation_id,
      canonical_graph_message_id: "immutable-vault-picker-compose",
    } });
    if (url.pathname === "/api/outlook/operation-receipts/readback") return fulfill({ items: [] });
    if (url.pathname === `/api/outlook/matters/${MATTER}/timeline`) return fulfill({
      request_id: "vault-picker-timeline",
      outcome: "passed",
      item: {
        matter_id: MATTER,
        visible_entries: [],
        page_info: { limit: 8, has_more: false, next_cursor: null },
      },
    });
    if (url.pathname === `/api/outlook/matters/${MATTER}/documents`) return fulfill({
      items: [{
        document_id: EXACT.document_id,
        matter_id: MATTER,
        title: "공급계약서 확정본.pdf",
        current_version_id: EXACT.version_id,
        latest_sha256: EXACT.sha256,
        exact_version_available: true,
        exact_version: EXACT,
        document_bytes_included: false,
        storage_pointer_ref_included: false,
        production_ready_claim: false,
      }],
      document_bytes_included: false,
    });
    if (url.pathname === "/api/outlook/vault/attachments/authorize") {
      return fulfill(authorization());
    }
    if (url.pathname === "/api/outlook/vault/attachments/complete") {
      completionAttempts += 1;
      if (completionAttempts === 1) {
        return fulfill({
          outcome: "blocked",
          safe_error_codes: ["OUTLOOK_VAULT_ATTACHMENT_COMPLETION_UNAVAILABLE"],
        }, 503);
      }
      return fulfill(completion());
    }
    return fulfill({ items: [], production_ready_claim: false });
  });

  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  try {
    await page.goto(`${web.origin}/addin/?vaultExactAttachmentEnabled=1`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);
    const vaultActionCount = await page.locator("[data-feature-id='vault.attach-exact-version']").count();
    assert.ok([0, 1].includes(vaultActionCount));
    if (vaultActionCount === 0) {
      assert.deepEqual(await page.evaluate(() => window.__VAULT_PICKER_HOST_CALLS()), []);
      assert.equal(
        requests.some(({ path: value }) => value.startsWith("/api/outlook/vault/attachments/")),
        false,
      );
      return;
    }
    assert.equal(await page.locator("[data-feature-id='vault.attach-exact-version']").isDisabled(), true);

    await page.locator("[data-feature-id='matter.search']").click();
    await page.locator("#matter-search-input").fill("M-VAULT-ATT");
    await page.waitForFunction((matterId) => Boolean(document.querySelector(`#matter-select option[value='${matterId}']`)), MATTER);
    await page.locator("#matter-select").selectOption(MATTER);
    await page.waitForResponse((response) => new URL(response.url()).pathname === `/api/outlook/matters/${MATTER}/documents`);
    assert.equal(
      requests.some(({ path: value }) => value === "/api/outlook/messages/identity"),
      false,
      "compose drafts must not invoke read-message canonical identity recovery",
    );
    assert.equal(
      requests.some(({ path: value }) => value === "/api/outlook/operation-receipts/readback"),
      false,
      "compose drafts must not invoke read-message receipt recovery",
    );
    await page.locator("[data-testid='outlook-overlay-close']").click();
    await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
    await page.waitForFunction(() => document.querySelector("[data-feature-id='vault.attach-exact-version']")?.disabled === false);

    const baselineRequests = requests.length;
    const baselineHostCalls = await page.evaluate(() => window.__VAULT_PICKER_HOST_CALLS());
    await page.locator("[data-feature-id='vault.attach-exact-version']").click();
    await page.locator("[data-testid='outlook-vault-attachment-picker']").waitFor({ state: "visible" });
    await page.locator("[data-testid='outlook-vault-attachment-cancel']").click();
    await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
    assert.equal(requests.length, baselineRequests, "picker cancellation must not call an API");
    assert.deepEqual(
      await page.evaluate(() => window.__VAULT_PICKER_HOST_CALLS()),
      baselineHostCalls,
      "picker cancellation must not save or mutate the draft",
    );

    await page.locator("[data-feature-id='vault.attach-exact-version']").click();
    await page.locator("[data-testid='outlook-vault-attachment-version']").selectOption({ index: 1 });
    const exactPanel = page.locator("[data-testid='outlook-vault-exact-version']");
    await exactPanel.waitFor({ state: "visible" });
    assert.match(await exactPanel.innerText(), new RegExp(EXACT.version_id, "u"));
    assert.match(await exactPanel.innerText(), new RegExp(EXACT.sha256, "u"));
    assert.match(await exactPanel.innerText(), /37 B · application\/pdf/u);
    const geometry = await page.locator(".outlook-overlay-panel").evaluate((panel) => {
      const panelBox = panel.getBoundingClientRect();
      const controlsOutside = [...panel.querySelectorAll("button, select")].filter((control) => {
        const box = control.getBoundingClientRect();
        return box.left < panelBox.left || box.right > panelBox.right
          || box.top < panelBox.top || box.bottom > panelBox.bottom;
      }).length;
      const criticalValues = [...panel.querySelectorAll(".outlook-critical-value")].map((value) => {
        const style = getComputedStyle(value);
        return {
          overflowX: style.overflowX,
          clientWidth: value.clientWidth,
          scrollWidth: value.scrollWidth,
        };
      });
      return {
        panelOverflow: panel.scrollWidth - panel.clientWidth,
        documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        controlsOutside,
        criticalValues,
      };
    });
    assert.equal(geometry.panelOverflow, 0);
    assert.equal(geometry.documentOverflow, 0);
    assert.equal(geometry.controlsOutside, 0);
    assert.equal(geometry.criticalValues.length, 2);
    assert.equal(geometry.criticalValues.every(({ overflowX }) => overflowX === "auto"), true);
    assert.equal(geometry.criticalValues[1].scrollWidth > geometry.criticalValues[1].clientWidth, true);
    await page.screenshot({
      path: path.join(EVIDENCE, "compose-picker-390.png"),
      fullPage: true,
    });

    await page.locator("[data-testid='outlook-vault-attachment-submit']").click();
    await page.locator("[data-testid='outlook-vault-attachment-pending']").waitFor({ state: "visible" });
    assert.deepEqual(
      (await page.evaluate(() => window.__VAULT_PICKER_HOST_CALLS())).map(({ method }) => method),
      ["saveAsync", "addFileAttachmentAsync", "getAttachmentsAsync"],
    );
    assert.equal(requests.filter(({ path: value }) => value === "/api/outlook/vault/attachments/authorize").length, 1);
    assert.equal(requests.filter(({ path: value }) => value === "/api/outlook/vault/attachments/complete").length, 1);

    await page.locator("[data-testid='outlook-vault-attachment-retry']").click();
    await page.getByText("선택한 Vault 버전을 첨부했습니다.", { exact: true }).first().waitFor({ state: "visible" });
    const hostCalls = await page.evaluate(() => window.__VAULT_PICKER_HOST_CALLS());
    assert.deepEqual(hostCalls.map(({ method }) => method), [
      "saveAsync",
      "addFileAttachmentAsync",
      "getAttachmentsAsync",
      "getAttachmentsAsync",
    ]);
    assert.equal(hostCalls.filter(({ method }) => method === "addFileAttachmentAsync").length, 1);
    assert.equal(requests.filter(({ path: value }) => value === "/api/outlook/vault/attachments/authorize").length, 1);
    assert.equal(requests.filter(({ path: value }) => value === "/api/outlook/vault/attachments/complete").length, 2);
    const authorize = requests.find(({ path: value }) => value === "/api/outlook/vault/attachments/authorize");
    assert.equal(authorize.method, "POST");
    assert.equal(authorize.body.matter_id, MATTER);
    assert.deepEqual(authorize.body.exact_version, EXACT);
    assert.equal("storage_pointer_ref" in authorize.body, false);
    assert.equal("document_bytes" in authorize.body, false);

    const requestsBeforeItemChanged = structuredClone(requests);
    const callsBeforeItemChanged = structuredClone(hostCalls);
    await page.evaluate(() => window.__VAULT_PICKER_SET_READ_ITEM());
    await page.waitForFunction(() => document.querySelector("#outlook-message-subject")?.textContent === "Vault picker read item");
    assert.equal(await page.locator("[data-testid='outlook-overlay']").count(), 0);
    assert.equal(await page.locator("[data-feature-id='vault.attach-exact-version']").count(), 0);
    assert.equal(await page.locator("[data-testid='busy-state']").count(), 0);
    assert.deepEqual(requests, requestsBeforeItemChanged, "ItemChanged must not call Vault or readiness APIs");
    assert.deepEqual(
      await page.evaluate(() => window.__VAULT_PICKER_HOST_CALLS()),
      callsBeforeItemChanged,
      "ItemChanged must not touch the draft or attachments",
    );
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
});
