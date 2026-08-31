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
const EVIDENCE = path.join(ROOT, ".omo/evidence/amic-os-vault-mail-save-ui");
const MATTER = "matter-vault-source-browser";

const json = (body, status = 200) => ({
  status,
  contentType: "application/json; charset=utf-8",
  body: JSON.stringify(body),
});

function sourceIdentity(key) {
  return Object.freeze({
    canonical_graph_message_id: `immutable-vault-source-${key}`,
    rest_message_id: `rest-vault-source-${key}`,
    internet_message_id: `<vault-source-${key}@example.invalid>`,
    conversation_id: `conversation-vault-source-${key}`,
  });
}

function exactVersion(suffix, kind) {
  return Object.freeze({
    document_id: `document-vault-source-${suffix}`,
    version_id: `version-vault-source-${suffix}-1`,
    file_object_id: `file-vault-source-${suffix}-1`,
    sha256: suffix[0].repeat(64),
    byte_size: kind === "save_email" ? 128 : 17,
    mime_type: kind === "save_email" ? "message/rfc822" : "application/pdf",
  });
}

function vaultResponse({
  kind,
  suffix,
  filingMode = null,
  attachmentId = null,
  outcome = "readback_verified",
} = {}) {
  const exact = exactVersion(suffix, kind);
  return Object.freeze({
    request_id: `request-vault-source-${suffix}`,
    outcome,
    ok: true,
    idempotent_replay: outcome === "idempotent_replay",
    item: Object.freeze({
      operation_id: `vaultop_${suffix[0].repeat(32)}`,
      operation_kind: kind,
      ...exact,
      exact_readback_verified: true,
      raw_path_included: false,
      raw_bytes_included: false,
      mail_pii_included: false,
      token_material_returned: false,
      receipt: Object.freeze({
        operation_kind: kind,
        stage: "readback_verified",
        matter_id: MATTER,
        exact_version: exact,
      }),
    }),
    source_binding_sha256: "f".repeat(64),
    provider_authority_verified: true,
    production_ready_claim: false,
    ...(filingMode ? { filing_operation: filingMode } : {}),
    ...(attachmentId ? { selected_attachment_id: attachmentId } : {}),
  });
}

async function chooseMatter(page) {
  await page.locator("[data-feature-id='matter.search']").click();
  await page.locator("#matter-search-input").fill("M-VAULT-SOURCE");
  await page.waitForFunction((matterId) => Boolean(
    document.querySelector(`#matter-select option[value='${matterId}']`),
  ), MATTER);
  await page.locator("#matter-select").selectOption(MATTER);
  await page.locator("[data-testid='outlook-overlay-close']").click();
  await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
}

test("sealed Vault source-save build uses provider-only routes, retries only failed attachments, and leaves ItemChanged inert", async () => {
  await mkdir(EVIDENCE, { recursive: true });
  const requests = [];
  let attachmentBFailures = 0;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });

  await page.addInitScript(({ token, receivedIdentity, sentIdentity }) => {
    const handlers = [];
    const hostCalls = [];
    const makeItem = ({ key, identity, sent, attachments }) => ({
      itemId: `office-vault-source-${key}`,
      subject: sent ? "Vault 보낸 메일" : "Vault 받은 메일",
      internetMessageId: identity.internet_message_id,
      conversationId: identity.conversation_id,
      from: sent
        ? { displayName: "QA", emailAddress: "qa@example.invalid" }
        : { displayName: "상대방", emailAddress: "sender@example.invalid" },
      to: [{ displayName: "QA", emailAddress: "qa@example.invalid" }],
      cc: [],
      attachments,
      dateTimeCreated: sent
        ? "2026-08-29T02:00:00.000Z"
        : "2026-08-29T01:00:00.000Z",
      body: {
        getAsync(_type, callback) {
          hostCalls.push({ method: "body.getAsync", key });
          callback({ status: "succeeded", value: "이 본문은 Vault 요청에 포함되면 안 됩니다." });
        },
      },
      getAllInternetHeadersAsync(callback) {
        hostCalls.push({ method: "getAllInternetHeadersAsync", key });
        callback({
          status: "succeeded",
          value: sent
            ? "Date: Sat, 29 Aug 2026 11:00:00 +0900"
            : "Date: Sat, 29 Aug 2026 10:00:00 +0900",
        });
      },
      getAttachmentContentAsync(attachmentId, callback) {
        hostCalls.push({ method: "getAttachmentContentAsync", key, attachmentId });
        callback({ status: "succeeded", value: { format: "base64", content: "Ynl0ZXM=" } });
      },
    });
    const items = {
      received: makeItem({
        key: "received",
        identity: receivedIdentity,
        sent: false,
        attachments: [
          { id: "attachment-a", name: "a.pdf", contentType: "application/pdf", size: 17 },
          { id: "attachment-b", name: "b.pdf", contentType: "application/pdf", size: 19 },
        ],
      }),
      sent: makeItem({
        key: "sent",
        identity: sentIdentity,
        sent: true,
        attachments: [
          { id: "attachment-sent", name: "sent.pdf", contentType: "application/pdf", size: 23 },
        ],
      }),
    };
    const mailbox = {
      item: items.received,
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
    window.__VAULT_SOURCE_HOST_CALLS = () => hostCalls.map((entry) => ({ ...entry }));
    window.__VAULT_SOURCE_SET_ITEM = (key) => {
      mailbox.item = items[key];
      handlers.slice().forEach((handler) => handler());
    };
    window.sessionStorage.setItem("lawos_addin_session_token", token);
  }, {
    token: "lawos_session_v1.vault-source-browser",
    receivedIdentity: sourceIdentity("received"),
    sentIdentity: sourceIdentity("sent"),
  });

  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    let body = {};
    try { body = request.postDataJSON() ?? {}; } catch {}
    requests.push({ path: url.pathname, search: url.search, method, body: structuredClone(body) });
    const fulfill = (payload, status = 200) => route.fulfill(json(payload, status));
    if (url.pathname === "/api/auth/office-sso/config") return fulfill({ item: {
      configured: true,
      client_id: "vault-source-browser-client",
      tenant_id: "organizations",
      api_scope: "api://vault-source-browser-client/access_as_user",
      scopes: ["api://vault-source-browser-client/access_as_user"],
      callback_uri: `${url.origin}/addin/oauth-callback.html`,
      authority: "https://login.microsoftonline.com/organizations",
    } });
    if (url.pathname === "/api/auth/session") return fulfill({ authenticated: true, session: {
      tenant_id: "tenant-vault-source-browser",
      user_id: "user-vault-source-browser",
      outlook_desktop_principal_ref: `odpr_${"A".repeat(43)}`,
    } });
    if (url.pathname === "/api/outlook/connection") return fulfill({ item: {
      status: "connected",
      active: true,
      connection_id: "m365_connection_vault_source_browser",
      state_version: 7,
      mailbox_address: "qa@example.invalid",
    } });
    if (url.pathname === "/api/outlook/readiness") return fulfill(readyOutlookReadinessResponse());
    if (url.pathname === "/api/outlook/bootstrap") return fulfill({ item: { ready: true } });
    if (url.pathname === "/api/outlook/operation-receipts/readback") return fulfill({ items: [] });
    if (url.pathname === "/api/outlook/matters") return fulfill({ items: [{
      matter_id: MATTER,
      matter_code: "M-VAULT-SOURCE",
      title: "Vault 메일 저장 검증",
      client_display_name: "예시 고객",
      status: "open",
    }] });
    if (url.pathname === "/api/outlook/messages/identity") {
      const key = String(body.rest_message_id).endsWith("sent") ? "sent" : "received";
      return fulfill({ item: {
        ...sourceIdentity(key),
        rest_message_id: body.rest_message_id,
        internet_message_id: body.internet_message_id,
        conversation_id: body.conversation_id,
      } });
    }
    if (url.pathname === `/api/outlook/matters/${MATTER}/timeline`) return fulfill({
      request_id: "vault-source-timeline",
      outcome: "passed",
      item: {
        matter_id: MATTER,
        visible_entries: [],
        page_info: { limit: 8, has_more: false, next_cursor: null },
      },
    });
    if (url.pathname === `/api/outlook/matters/${MATTER}/documents`) return fulfill({ items: [] });
    if (url.pathname === "/api/outlook/vault/email/save") {
      return fulfill(vaultResponse({ kind: "save_email", suffix: "a", filingMode: "manual" }));
    }
    if (url.pathname === "/api/outlook/vault/sent/save") {
      return fulfill(vaultResponse({ kind: "save_email", suffix: "b", filingMode: "sent" }));
    }
    if (url.pathname === "/api/outlook/vault/attachments/save") {
      const attachmentId = body.selected_attachment_ids?.[0];
      if (attachmentId === "attachment-b" && attachmentBFailures === 0) {
        attachmentBFailures += 1;
        return fulfill({
          outcome: "blocked",
          safe_error_codes: ["VAULT_PROVIDER_RECORDS_DENIED"],
        }, 503);
      }
      const suffix = attachmentId === "attachment-a"
        ? "c"
        : attachmentId === "attachment-b" ? "d" : "e";
      return fulfill(vaultResponse({
        kind: "save_email_attachment",
        suffix,
        attachmentId,
      }));
    }
    return fulfill({ items: [], production_ready_claim: false });
  });

  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  try {
    await page.goto(`${web.origin}/addin/?vaultSourceSaveEnabled=1`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("[data-feature-id='matter.search']")?.disabled === false);
    await chooseMatter(page);
    await page.locator("[data-feature-id='mail.save-with-attachments']").click();
    const receivedButton = page.locator("[data-testid='file-email-button']");
    const authority = await receivedButton.getAttribute("data-storage-authority");
    assert.ok(["amic-vault-api", "lawos-dms"].includes(authority));
    if (authority === "lawos-dms") {
      assert.equal(await page.getByText("Vault에 메일 및 첨부 저장", { exact: true }).count(), 0);
      assert.equal(requests.some(({ path: value }) => value.startsWith("/api/outlook/vault/")), false);
      assert.deepEqual(await page.evaluate(() => window.__VAULT_SOURCE_HOST_CALLS()), []);
      return;
    }

    assert.equal(await page.getByText("Vault에 메일 및 첨부 저장", { exact: true }).count(), 1);
    const geometry = await page.locator(".outlook-overlay-panel").evaluate((panel) => ({
      panelOverflow: panel.scrollWidth - panel.clientWidth,
      documentOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      controlsOutside: [...panel.querySelectorAll("button")].filter((control) => {
        const controlBox = control.getBoundingClientRect();
        const panelBox = panel.getBoundingClientRect();
        return controlBox.left < panelBox.left || controlBox.right > panelBox.right;
      }).length,
    }));
    assert.deepEqual(geometry, { panelOverflow: 0, documentOverflow: 0, controlsOutside: 0 });
    await page.screenshot({
      path: path.join(EVIDENCE, "received-vault-save-390.png"),
      fullPage: true,
    });

    await page.locator("[data-testid='outlook-overlay-close']").click();
    await page.waitForSelector("[data-testid='outlook-overlay']", { state: "detached" });
    const receivedPrimary = page.locator("[data-testid='outlook-primary-filing-button']");
    assert.equal(await receivedPrimary.textContent(), "메일 및 첨부 파일 저장");
    await receivedPrimary.click();
    await page.waitForFunction(() => !document.querySelector("[data-testid='busy-state']"));
    const receivedViewText = await page.locator("body").innerText();
    assert.match(
      receivedViewText,
      /메일은 Vault에 저장됐고 일부 첨부는 다시 시도해야 합니다\./u,
      `unexpected received-save result; requests=${JSON.stringify(requests)}`,
    );
    const sourcePathsAfterPartial = requests
      .filter(({ path: value }) => value.startsWith("/api/outlook/vault/"))
      .map(({ path: value }) => value);
    assert.deepEqual(sourcePathsAfterPartial, [
      "/api/outlook/vault/email/save",
      "/api/outlook/vault/attachments/save",
      "/api/outlook/vault/attachments/save",
    ]);
    assert.equal(requests.some(({ path: value }) => [
      "/api/outlook/email/file",
      "/api/outlook/attachments/save",
    ].includes(value)), false);
    for (const request of requests.filter(({ path: value }) => value.startsWith("/api/outlook/vault/"))) {
      const serialized = JSON.stringify(request.body);
      for (const forbidden of ["body", "body_preview", "content_base64", "content_text"]) {
        assert.equal(serialized.includes(forbidden), false, `${forbidden} leaked into ${request.path}`);
      }
    }
    const hostCallsAfterPartial = await page.evaluate(() => window.__VAULT_SOURCE_HOST_CALLS());
    assert.deepEqual(hostCallsAfterPartial.map(({ method }) => method), ["getAllInternetHeadersAsync"]);

    await page.locator("[data-feature-id='mail.save-with-attachments']").click();
    await page.locator("[data-testid='retry-vault-source-attachments-button']").click();
    await page.getByText("실패했던 첨부를 Vault에 저장했습니다.", { exact: true }).waitFor({ state: "visible" });
    const attachmentCalls = requests.filter(({ path: value }) => value === "/api/outlook/vault/attachments/save");
    assert.deepEqual(attachmentCalls.map(({ body }) => body.selected_attachment_ids), [
      ["attachment-a"],
      ["attachment-b"],
      ["attachment-b"],
    ]);
    assert.equal(requests.filter(({ path: value }) => value === "/api/outlook/vault/email/save").length, 1);
    assert.deepEqual(
      (await page.evaluate(() => window.__VAULT_SOURCE_HOST_CALLS())).map(({ method }) => method),
      ["getAllInternetHeadersAsync", "getAllInternetHeadersAsync"],
    );

    const requestsBeforeItemChanged = structuredClone(requests);
    const hostCallsBeforeItemChanged = await page.evaluate(() => window.__VAULT_SOURCE_HOST_CALLS());
    await page.evaluate(() => window.__VAULT_SOURCE_SET_ITEM("sent"));
    await page.waitForFunction(() => document.querySelector("#outlook-message-subject")?.textContent === "Vault 보낸 메일");
    assert.deepEqual(requests, requestsBeforeItemChanged, "ItemChanged must not call Vault or readiness APIs");
    assert.deepEqual(
      await page.evaluate(() => window.__VAULT_SOURCE_HOST_CALLS()),
      hostCallsBeforeItemChanged,
      "ItemChanged must not read mail or attachment content",
    );
    assert.equal(await page.locator("[data-testid='outlook-overlay']").count(), 0);
    assert.equal(await page.locator("[data-testid='busy-state']").count(), 0);

    await chooseMatter(page);
    const sentPrimary = page.locator("[data-testid='outlook-primary-filing-button']");
    assert.equal(await sentPrimary.textContent(), "보낸 메일 저장");
    await sentPrimary.click();
    await page.getByText("보낸 메일과 첨부를 Vault에 저장했습니다.", { exact: true }).waitFor({ state: "visible" });
    assert.equal(requests.filter(({ path: value }) => value === "/api/outlook/vault/sent/save").length, 1);
    assert.deepEqual(
      requests.filter(({ path: value }) => value === "/api/outlook/vault/attachments/save")
        .map(({ body }) => body.selected_attachment_ids),
      [["attachment-a"], ["attachment-b"], ["attachment-b"], ["attachment-sent"]],
    );
    assert.equal(requests.some(({ path: value }) => [
      "/api/outlook/email/file",
      "/api/outlook/attachments/save",
    ].includes(value)), false);
    assert.equal(
      (await page.evaluate(() => window.__VAULT_SOURCE_HOST_CALLS()))
        .some(({ method }) => method === "body.getAsync" || method === "getAttachmentContentAsync"),
      false,
    );
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
});

test("sealed task-pane relaunch resumes an accepted Vault source only after an explicit status action", async () => {
  await mkdir(EVIDENCE, { recursive: true });
  const requests = [];
  const operationId = `vaultop_${"a".repeat(32)}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 780 } });

  await page.addInitScript(({ token, pendingKey, pendingValue, identity }) => {
    const handlers = [];
    const hostCalls = [];
    const makeItem = (suffix) => ({
      itemId: `office-vault-resume-${suffix}`,
      subject: `Vault resume ${suffix}`,
      internetMessageId: identity.internet_message_id,
      conversationId: identity.conversation_id,
      from: { displayName: "상대방", emailAddress: "sender@example.invalid" },
      to: [{ displayName: "QA", emailAddress: "qa@example.invalid" }],
      cc: [],
      attachments: [],
      body: {
        getAsync(_type, callback) {
          hostCalls.push("body.getAsync");
          callback({ status: "succeeded", value: "must not be read" });
        },
      },
      getAllInternetHeadersAsync(callback) {
        hostCalls.push("getAllInternetHeadersAsync");
        callback({ status: "succeeded", value: "Date: Sat, 29 Aug 2026 15:00:00 +0900" });
      },
    });
    const mailbox = {
      item: makeItem("initial"),
      userProfile: { emailAddress: "qa@example.invalid" },
      addHandlerAsync(_type, handler) { handlers.push(handler); },
      removeHandlerAsync(_type, { handler } = {}) {
        const index = handlers.indexOf(handler);
        if (index >= 0) handlers.splice(index, 1);
      },
      convertToRestId() { return identity.rest_message_id; },
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
    window.__VAULT_RESUME_HOST_CALLS = () => [...hostCalls];
    window.__VAULT_RESUME_ITEM_CHANGED = () => {
      mailbox.item = makeItem("changed");
      handlers.slice().forEach((handler) => handler());
    };
    window.localStorage.setItem(pendingKey, pendingValue);
    window.sessionStorage.setItem("lawos_addin_session_token", token);
  }, {
    token: "lawos_session_v1.vault-source-resume-browser",
    pendingKey: "lawos.outlook.vault-source.pending.v1",
    pendingValue: JSON.stringify({
      schema: "law-firm-os.outlook-vault-source-pending.v1",
      entries: [{
        operation_id: operationId,
        operation_kind: "save_email",
        created_at: "2026-08-29T06:00:00.000Z",
        updated_at: "2026-08-29T06:00:00.000Z",
        outlook_item_id_included: false,
        graph_message_id_included: false,
        attachment_id_included: false,
        matter_id_included: false,
        source_bytes_included: false,
        mail_pii_included: false,
      }],
    }),
    identity: sourceIdentity("resume"),
  });

  await page.route("https://appsforoffice.microsoft.com/**", (route) => route.fulfill(json("")));
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let body = {};
    try { body = request.postDataJSON() ?? {}; } catch {}
    requests.push({ path: url.pathname, method: request.method(), body: structuredClone(body) });
    const fulfill = (payload, status = 200) => route.fulfill(json(payload, status));
    if (url.pathname === "/api/auth/office-sso/config") return fulfill({ item: {
      configured: true,
      client_id: "vault-source-browser-client",
      tenant_id: "organizations",
      api_scope: "api://vault-source-browser-client/access_as_user",
      scopes: ["api://vault-source-browser-client/access_as_user"],
      callback_uri: `${url.origin}/addin/oauth-callback.html`,
      authority: "https://login.microsoftonline.com/organizations",
    } });
    if (url.pathname === "/api/auth/session") return fulfill({ authenticated: true, session: {
      tenant_id: "tenant-vault-source-browser",
      user_id: "user-vault-source-browser",
      outlook_desktop_principal_ref: `odpr_${"A".repeat(43)}`,
    } });
    if (url.pathname === "/api/outlook/connection") return fulfill({ item: {
      status: "connected",
      active: true,
      connection_id: "m365_connection_vault_source_browser",
      state_version: 7,
      mailbox_address: "qa@example.invalid",
    } });
    if (url.pathname === "/api/outlook/readiness") return fulfill(readyOutlookReadinessResponse());
    if (url.pathname === "/api/outlook/bootstrap") return fulfill({ item: { ready: true } });
    if (url.pathname === "/api/outlook/operation-receipts/readback") return fulfill({ items: [] });
    if (url.pathname === "/api/outlook/vault/source/status") {
      assert.deepEqual(body, { operation_id: operationId });
      return fulfill(vaultResponse({ kind: "save_email", suffix: "a" }));
    }
    return fulfill({ items: [], production_ready_claim: false });
  });

  const web = await startOutlookAddinStaticServer({ distRoot: DIST });
  try {
    await page.goto(`${web.origin}/addin/?vaultSourceSaveEnabled=1`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (
      document.querySelector("[data-feature-id='mail.save-with-attachments']")?.disabled === false
    ));
    await page.locator("[data-feature-id='mail.save-with-attachments']").click();
    const storageAuthority = await page.locator("[data-testid='file-email-button']")
      .getAttribute("data-storage-authority");
    assert.ok(["amic-vault-api", "lawos-dms"].includes(storageAuthority));
    if (storageAuthority === "lawos-dms") {
      assert.deepEqual(
        requests.filter(({ path: value }) => value.startsWith("/api/outlook/vault/")),
        [],
      );
      assert.deepEqual(await page.evaluate(() => window.__VAULT_RESUME_HOST_CALLS()), []);
      return;
    }
    await page.getByTestId("resume-vault-source-save-button")
      .waitFor({ state: "visible", timeout: 5_000 });
    assert.deepEqual(
      requests.filter(({ path: value }) => value.startsWith("/api/outlook/vault/")),
      [],
      "task-pane startup must not inspect or resume Vault work",
    );
    assert.deepEqual(await page.evaluate(() => window.__VAULT_RESUME_HOST_CALLS()), []);
    await page.getByTestId("resume-vault-source-save-button").click();
    try {
      await page.getByText("중단됐던 Vault 저장의 정확 버전을 확인했습니다.", { exact: true })
        .waitFor({ state: "visible", timeout: 5_000 });
    } catch {
      assert.fail(`resume result missing; requests=${JSON.stringify(requests)} body=${JSON.stringify(await page.locator("body").innerText())} pending=${JSON.stringify(await page.evaluate((key) => localStorage.getItem(key), "lawos.outlook.vault-source.pending.v1"))}`);
    }
    await page.screenshot({
      path: path.join(EVIDENCE, "source-save-recovered-after-relaunch-390.png"),
      fullPage: true,
    });
    assert.deepEqual(
      requests.filter(({ path: value }) => value.startsWith("/api/outlook/vault/"))
        .map(({ path: value }) => value),
      ["/api/outlook/vault/source/status"],
    );
    assert.deepEqual(await page.evaluate(() => window.__VAULT_RESUME_HOST_CALLS()), []);
    const stored = JSON.parse(await page.evaluate((key) => localStorage.getItem(key),
      "lawos.outlook.vault-source.pending.v1"));
    assert.deepEqual(stored.entries, []);

    const beforeItemChanged = structuredClone(requests);
    await page.evaluate(() => window.__VAULT_RESUME_ITEM_CHANGED());
    await page.waitForFunction(() => document.querySelector("#outlook-message-subject")?.textContent === "Vault resume changed");
    assert.deepEqual(requests, beforeItemChanged, "ItemChanged must not restart Vault recovery");
    assert.deepEqual(await page.evaluate(() => window.__VAULT_RESUME_HOST_CALLS()), []);
  } finally {
    await page.close();
    await browser.close();
    await new Promise((resolve) => web.server.close(resolve));
  }
});
