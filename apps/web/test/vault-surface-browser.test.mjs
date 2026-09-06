import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { build, createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const sha256 = "a".repeat(64);
const capabilityIds = ["read", "upload", "download", "attach", "work", "governance", "audit"];

async function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => error ? rejectPort(error) : resolvePort(port));
    });
  });
}

function projection() {
  return {
    schema_version: "law-firm-os.vault-capability-projection.v1",
    source: "server-derived",
    authoritative: true,
    provider_state: "ready",
    tenant_binding_state: "bound",
    user_binding_state: "bound",
    authority_ref_present: true,
    denied_by_default: true,
    client_must_not_infer_from_roles: true,
    token_material_returned: false,
    raw_policy_returned: false,
    role_names_returned: false,
    production_ready_claim: false,
    capabilities: capabilityIds.map((id) => ({ id, allowed: true, decision: "allow", safe_reason_code: null }))
  };
}

function session() {
  return {
    state: "signed_in",
    session_id: "session-vault-browser",
    user_id: "user-vault-browser",
    tenant_id: "tenant-vault-browser",
    email: "vault-browser@example.invalid",
    display_name: "Vault 검증 사용자",
    role_ids: [],
    scopes: ["vault.read", "vault.write", "vault.governance", "audit.read"],
    expires_at: "2099-01-01T00:00:00.000Z"
  };
}

function documentsBody(corporate = false) {
  return {
    request_id: "req-vault-browser-documents",
    outcome: "passed",
    items: [{
      document_id: "document-vault-browser-001",
      matter_id: corporate ? null : "matter-vault-browser-001",
      workspace_id: "workspace-vault-browser-001",
      title: "계약 검토 의견서",
      status: "active",
      current_version_id: "version-vault-browser-003",
      latest_sha256: sha256,
      current_file_object_id: "file-object-vault-browser-003",
      current_byte_size: 4096,
      current_mime_type: "application/pdf",
      filename: "계약 검토 의견서.pdf",
      privilege_label_id: "privileged",
      legal_hold_id: "hold-vault-browser-001",
      raw_path_exposed: false,
      document_bytes_included: false,
      storage_pointer_ref_included: false
    }],
    summary: null,
    page_info: null,
    safe_error_codes: [],
    audit_hint_ref: "audit-vault-browser",
    ui_state: null,
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function preferencesBody() {
  return {
    request_id: "req-vault-browser-preferences",
    outcome: "passed",
    item: {
      recent: [{ id: "recent-1", query: "의견서", searched_at: "2026-08-28T05:00:00.000Z", current_version_only: true }],
      saved: [{ id: "saved-1", query: "계약", searched_at: "2026-08-27T05:00:00.000Z", current_version_only: true }]
    },
    safe_error_codes: [],
    audit_hint_ref: "audit-vault-browser",
    production_ready_claim: false
  };
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({ status, contentType: "application/json; charset=utf-8", body: JSON.stringify(body) });
}

test("desktop cold start and reload bind the first Vault reads to the restored signed session", async (t) => {
  const output = await mkdtemp(join(tmpdir(), "lawos-desktop-session-"));
  t.after(() => rm(output, { recursive: true, force: true }));
  await build({
    root: webRoot,
    base: "./",
    logLevel: "silent",
    build: { outDir: output, emptyOutDir: true }
  });
  const browser = await chromium.launch({ headless: true, args: ["--allow-file-access-from-files"] });
  try {
    const page = await browser.newPage();
    await page.addInitScript(({ sessionValue, capabilityValue, documents, preferences }) => {
      sessionStorage.clear();
      window.__desktopReads = [];
      window.__desktopStatusCalls = 0;
      const restored = new Promise((resolveStatus) => {
        window.__restoreDesktopSession = () => resolveStatus(sessionValue);
      });
      window.matterSession = Object.freeze({
        status() {
          window.__desktopStatusCalls += 1;
          return restored;
        },
        async features() {
          return { ok: true, http_status: 200, vault_capabilities: capabilityValue };
        },
        async api(request) {
          const url = new URL(request.path, "https://runtime.example.invalid");
          const envelope = JSON.parse(sessionStorage.getItem("lawos.session.envelope") ?? "null");
          window.__desktopReads.push({
            path: url.pathname,
            tenant: url.searchParams.get("tenant_id"),
            actor: envelope?.actor_ref ?? null,
            sessionTenant: envelope?.tenant_refs?.vault ?? null
          });
          const bound = envelope?.actor_ref === sessionValue.user_id
            && envelope?.tenant_refs?.vault === sessionValue.tenant_id
            && url.searchParams.get("tenant_id") === sessionValue.tenant_id;
          const body = url.pathname === "/api/vault/documents" ? documents
            : url.pathname === "/api/vault/search/preferences" ? preferences : null;
          return body && bound
            ? { http_status: 200, body }
            : { http_status: 403, body: { outcome: "blocked", safe_error_codes: ["SESSION_BINDING_REQUIRED"] } };
        }
      });
    }, { sessionValue: session(), capabilityValue: projection(), documents: documentsBody(), preferences: preferencesBody() });
    await page.goto(`${pathToFileURL(join(output, "index.html"))}?desktop=1&view=vault&ctx=allow#vault-home`);
    for (let attempt = 0; attempt < 2; attempt += 1) {
      if (attempt) await page.reload();
      await page.waitForFunction(() => window.__desktopStatusCalls > 0);
      assert.deepEqual(await page.evaluate(() => window.__desktopReads), []);
      await page.evaluate(() => window.__restoreDesktopSession());
      await page.waitForFunction(() => window.__desktopReads.some((read) => read.path === "/api/vault/search/preferences"));
      const reads = await page.evaluate(() => window.__desktopReads);
      const vaultReads = reads.filter((read) => ["/api/vault/documents", "/api/vault/search/preferences"].includes(read.path));
      assert.deepEqual([...new Set(vaultReads.map((read) => read.path))].sort(), ["/api/vault/documents", "/api/vault/search/preferences"]);
      for (const read of vaultReads) {
        assert.equal(read.tenant, session().tenant_id, `${read.path} first request tenant`);
        assert.equal(read.actor, session().user_id, `${read.path} first request actor`);
        assert.equal(read.sessionTenant, session().tenant_id);
      }
      await page.locator('[data-vault-document-list="true"] .amic-search-row').first().waitFor();
      assert.doesNotMatch(await page.locator("body").innerText(), /문서를 불러오지 못했습니다|검색 기록을 불러오지 못했습니다/);
    }
  } finally {
    await browser.close();
  }
});

test("Vault full-capability surface renders canonical groups, exact-version details, audit, and responsive containment", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  const browser = await chromium.launch({ headless: true });
  try {
    await server.listen();
    const baseUrl = server.resolvedUrls?.local?.[0];
    assert.ok(baseUrl);
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    let malformedAudit = false;
    let corporateDocument = false;
    await page.addInitScript(({ sessionValue, capabilityValue }) => {
      sessionStorage.setItem("lawos.api.session", JSON.stringify({
        token_type: "Bearer",
        session_token: "lawos_session_v1.browser.fixture",
        expires_at: sessionValue.expires_at,
        session: sessionValue,
        vault_capabilities: capabilityValue
      }));
      window.__vaultSaveCalls = [];
      window.__vaultPreviewCalls = [];
      window.__vaultOutlookAttachCalls = [];
      window.__classicOutlookAttachHandler = null;
      Object.defineProperty(window, "matterSession", {
        configurable: false,
        value: Object.freeze({
          onClassicOutlookAttachRequested(handler) {
            window.__classicOutlookAttachHandler = handler;
            return () => {
              if (window.__classicOutlookAttachHandler === handler) {
                window.__classicOutlookAttachHandler = null;
              }
            };
          },
        }),
      });
      Object.defineProperty(window, "amicFileBridge", {
        configurable: false,
        value: Object.freeze({
          async saveDocumentAs(request) {
            window.__vaultSaveCalls.push(request);
            if (window.__cancelVaultSave) return { state: "cancelled" };
            return {
              state: "saved",
              file: { name: request.suggestedName, size: request.byteSize, pathVisibleToRenderer: false },
              backendDownload: {
                documentId: request.documentId,
                versionId: request.versionId,
                fileObjectId: request.fileObjectId,
                sha256: request.sha256,
                byteSize: request.byteSize,
                mimeType: request.mimeType,
                pathVisibleToRenderer: false,
              },
            };
          },
          async openDocumentPreview(request) {
            window.__vaultPreviewCalls.push(request);
            return {
              state: "opened",
              preview: {
                tempId: "11111111-1111-4111-8111-111111111111",
                name: request.suggestedName,
                scope: "amic-os-vault-preview",
                expiresAt: Date.now() + 300_000,
                pathVisibleToRenderer: false,
              },
              backendDownload: {
                documentId: request.documentId,
                versionId: request.versionId,
                fileObjectId: request.fileObjectId,
                sha256: request.sha256,
                byteSize: request.byteSize,
                mimeType: request.mimeType,
                pathVisibleToRenderer: false,
              },
            };
          },
          async attachDocumentToClassicOutlook(request) {
            window.__vaultOutlookAttachCalls.push(request);
            return {
              state: "attached",
              operationId: `vaultop_${"b".repeat(32)}`,
              documentId: request.documentId,
              versionId: request.versionId,
              sha256: request.sha256,
              byteSize: request.byteSize,
              pathVisibleToRenderer: false,
              rawBytesIncluded: false,
              tokenMaterialReturned: false,
            };
          },
        }),
      });
    }, { sessionValue: session(), capabilityValue: projection() });
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/auth/session") {
        await fulfillJson(route, { request_id: "req-vault-browser-session", outcome: "passed", ok: true, session: session(), vault_capabilities: projection(), production_ready_claim: false });
        return;
      }
      if (url.pathname === "/api/vault/documents") {
        await fulfillJson(route, documentsBody(corporateDocument));
        return;
      }
      if (url.pathname === "/api/vault/search/preferences") {
        await fulfillJson(route, preferencesBody());
        return;
      }
      if (url.pathname === "/api/vault/audit") {
        await fulfillJson(route, {
          request_id: "req-vault-browser-audit",
          outcome: "passed",
          items: [{
            event_id: "event-vault-browser-001",
            action: "dms:document:read",
            decision: malformedAudit ? "unexpected-decision" : "allow",
            occurred_at: "2026-08-28T05:30:00.000Z",
            actor_id: "actor-must-not-render",
            raw_path: "/private/vault/must-not-render.pdf",
            storage_locator: "s3://private-vault/must-not-render",
            metadata: { access_token: "token-must-not-render" }
          }],
          safe_error_codes: [],
          audit_hint_ref: "audit-vault-browser",
          count_leak_prevented: true,
          production_ready_claim: false
        });
        return;
      }
      if (url.pathname === "/api/vault/search") {
        await fulfillJson(route, { ...documentsBody(corporateDocument), request_id: "req-vault-browser-search" });
        return;
      }
      await fulfillJson(route, { outcome: "not_found", items: [], safe_error_codes: ["NOT_FOUND"] }, 404);
    });

    await page.goto(`${baseUrl}?view=vault&ctx=allow#vault-home`, { waitUntil: "networkidle" });
    await page.locator('[data-amic-vault-surface="true"]').waitFor();
    assert.equal(await page.locator(".forest-hero h1").textContent(), "Vault");
    assert.deepEqual(await page.locator('[data-context-sidebar="vault"] [data-sidebar-group]').evaluateAll((groups) => groups.map((group) => group.getAttribute("data-sidebar-group"))), [
      "vault-documents",
      "vault-search",
      "vault-work",
      "vault-integrations",
      "vault-governance"
    ]);
    assert.equal(await page.locator('[data-vault-capability-boundary]').count(), 0);
    assert.equal(await page.locator('[data-vault-document-list="true"] .amic-search-row').count(), 1);

    await page.locator('[data-vault-document-list="true"] .amic-search-row').first().click();
    await page.locator('[data-vault-exact-version-facts="true"]').waitFor();
    const location = new URL(page.url());
    assert.equal(location.searchParams.get("document_id"), "document-vault-browser-001");
    assert.equal(location.searchParams.get("document_version_id"), "version-vault-browser-003");
    assert.equal(location.searchParams.get("document_sha256"), sha256);
    assert.equal(await page.locator('[data-vault-exact-version-facts="true"]').textContent().then((text) => text.includes(sha256)), true);
    const versionHistoryState = page.locator('[data-vault-version-history="unavailable"]');
    await versionHistoryState.waitFor();
    assert.match(await versionHistoryState.textContent(), /버전 기록은 아직 제공되지 않습니다/);
    assert.match(await versionHistoryState.textContent(), /Vault 서버가 전체 기록을 제공하기 전까지/);
    assert.equal(await versionHistoryState.locator("table, button, input, select, textarea, a").count(), 0);
    const previewButton = page.getByRole("button", { name: "미리보기" });
    assert.equal(await previewButton.isEnabled(), true);
    await previewButton.click();
    await page.getByText("정확한 버전을 기본 문서 앱에서 열었습니다. 임시 파일은 자동으로 삭제됩니다.").waitFor();
    const previewCalls = await page.evaluate(() => window.__vaultPreviewCalls);
    assert.deepEqual(previewCalls, [{
      matterId: "matter-vault-browser-001",
      documentId: "document-vault-browser-001",
      versionId: "version-vault-browser-003",
      fileObjectId: "file-object-vault-browser-003",
      sha256,
      byteSize: 4096,
      mimeType: "application/pdf",
      suggestedName: "계약 검토 의견서.pdf",
    }]);
    assert.equal(JSON.stringify(previewCalls).includes("bytes"), false);
    assert.equal(JSON.stringify(previewCalls).includes("filePath"), false);
    const screenshotDir = process.env.LAWOS_VAULT_SCREENSHOT_DIR;
    if (screenshotDir) {
      await mkdir(screenshotDir, { recursive: true });
      await page.screenshot({ path: join(screenshotDir, "vault-preview-opened-1440.png"), fullPage: true });
    }
    const saveButton = page.getByRole("button", { name: "내 컴퓨터에 저장" });
    assert.equal(await saveButton.isEnabled(), true);
    await saveButton.click();
    await page.getByText("선택한 위치에 저장했고 Vault 전달 기록을 확인했습니다.").waitFor();
    const saveCalls = await page.evaluate(() => window.__vaultSaveCalls);
    assert.deepEqual(saveCalls, [{
      matterId: "matter-vault-browser-001",
      documentId: "document-vault-browser-001",
      versionId: "version-vault-browser-003",
      fileObjectId: "file-object-vault-browser-003",
      sha256,
      byteSize: 4096,
      mimeType: "application/pdf",
      suggestedName: "계약 검토 의견서.pdf",
      title: "내 컴퓨터에 저장",
    }]);
    assert.equal(JSON.stringify(saveCalls).includes("bytes"), false);
    assert.equal(JSON.stringify(saveCalls).includes("filePath"), false);
    assert.equal(JSON.stringify(saveCalls).includes("idempotency"), false);

    await page.goto(`${baseUrl}?view=vault&ctx=allow&query=${encodeURIComponent("계약")}&current_version=current&date_from=2026-08-01&date_to=2026-08-31#vault-search-all`, { waitUntil: "networkidle" });
    await page.locator('[data-vault-document-list="true"] .amic-search-row').first().click();
    await page.locator('[data-vault-exact-version-facts="true"]').waitFor();
    const searchDetailLocation = new URL(page.url());
    assert.equal(searchDetailLocation.searchParams.get("query"), "계약");
    assert.equal(searchDetailLocation.searchParams.get("current_version"), "current");
    assert.equal(searchDetailLocation.searchParams.get("date_from"), "2026-08-01");
    assert.equal(searchDetailLocation.searchParams.get("date_to"), "2026-08-31");
    assert.equal(searchDetailLocation.searchParams.get("document_version_id"), "version-vault-browser-003");

    if (screenshotDir) {
      await mkdir(screenshotDir, { recursive: true });
      await page.screenshot({ path: join(screenshotDir, "vault-1440.png"), fullPage: true });
    }

    await page.goto(`${baseUrl}?view=vault&ctx=allow#vault-audit`, { waitUntil: "networkidle" });
    assert.equal(await page.locator(".vault-audit-row").count(), 1);
    assert.match(await page.locator(".vault-audit-row").textContent(), /dms:document:read/);
    assert.doesNotMatch(await page.locator("body").innerText(), /must-not-render|private-vault/u);
    malformedAudit = true;
    await page.reload({ waitUntil: "networkidle" });
    await page.getByText("감사 이벤트를 불러오지 못했습니다.").waitFor();
    assert.equal(await page.locator(".vault-audit-row").count(), 0);
    malformedAudit = false;

    for (const [section, marker] of [
      ["vault-outlook", "outlook-explicit-action"],
      ["vault-email", "email-filing"],
      ["vault-ethical-wall", "ethical-wall-authority"],
      ["vault-dlp", "dlp-authority"]
    ]) {
      await page.goto(`${baseUrl}?view=vault&ctx=allow#${section}`, {
        waitUntil: "networkidle"
      });
      const pending = page.locator(`[data-vault-pending-boundary="${marker}"]`);
      await pending.waitFor();
      assert.equal(await pending.locator("button, input, select, textarea").count(), 0);
    }

    await page.evaluate(() => window.__classicOutlookAttachHandler?.({
      type: "classic_outlook_attach_request",
      request_handle: `classic-outlook-${"3".repeat(32)}`,
      expires_at: new Date(Date.now() + 60_000).toISOString(),
      source: "classic_outlook_compose",
      exact_version_required: true,
      raw_path_included: false,
      raw_bytes_included: false,
      token_material_returned: false,
    }));
    await page.locator('[data-vault-outlook-attach-request="active"]').waitFor();
    assert.match(await page.locator('[data-vault-outlook-attach-request="active"]').textContent(), /현재 Outlook 초안에 첨부할 문서를 선택하세요/);
    await page.locator('[data-vault-document-list="true"] .amic-search-row').first().click();
    const outlookAttachButton = page.getByRole("button", { name: "현재 Outlook 초안에 첨부" });
    await outlookAttachButton.waitFor();
    assert.equal(await outlookAttachButton.isEnabled(), true);
    await outlookAttachButton.click();
    await page.getByText("정확한 버전을 현재 Outlook 초안에 첨부했고 Vault 기록을 확인했습니다.").waitFor();
    const outlookAttachCalls = await page.evaluate(() => window.__vaultOutlookAttachCalls);
    assert.deepEqual(outlookAttachCalls, [{
      requestHandle: `classic-outlook-${"3".repeat(32)}`,
      matterId: "matter-vault-browser-001",
      documentId: "document-vault-browser-001",
      versionId: "version-vault-browser-003",
      fileObjectId: "file-object-vault-browser-003",
      sha256,
      byteSize: 4096,
      mimeType: "application/pdf",
      suggestedName: "계약 검토 의견서.pdf",
    }]);
    assert.equal(JSON.stringify(outlookAttachCalls).includes("bytes"), false);
    assert.equal(JSON.stringify(outlookAttachCalls).includes("installation"), false);
    assert.equal(JSON.stringify(outlookAttachCalls).includes("compose"), false);

    await page.goto(`${baseUrl}?view=vault&ctx=allow#vault-records`, {
      waitUntil: "networkidle"
    });
    assert.equal(await page.locator("form").count(), 0);
    const recordsList = page.locator('[data-vault-document-list="true"]');
    await recordsList.waitFor();
    assert.equal(await recordsList.count(), 1);

    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto(`${baseUrl}?view=vault&ctx=allow#vault-home`, { waitUntil: "networkidle" });
    const tabletContextTrigger = page.locator('[data-context-sidebar-trigger="true"]');
    if (await tabletContextTrigger.getAttribute("aria-expanded") === "true") {
      await tabletContextTrigger.click();
    }
    await page.locator('[data-context-sidebar="vault"]').waitFor({ state: "hidden" });
    const tabletOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    assert.ok(tabletOverflow.scrollWidth <= tabletOverflow.clientWidth + 1, JSON.stringify(tabletOverflow));
    await page.mouse.move(600, 20);
    if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "vault-1024.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${baseUrl}?view=vault&ctx=allow#vault-home`, { waitUntil: "networkidle" });
    const contextTrigger = page.locator('[data-context-sidebar-trigger="true"]');
    if (await contextTrigger.getAttribute("aria-expanded") !== "true") {
      await contextTrigger.click();
      await page.waitForFunction(() => document.querySelector(".app-frame")?.classList.contains("context-sidebar-open"));
    }
    assert.equal(await contextTrigger.getAttribute("aria-expanded"), "true");
    assert.equal(await page.locator('[data-context-sidebar="vault"] .workspace-card-label').textContent(), "Vault");
    await page.mouse.move(120, 200);
    await page.waitForTimeout(180);
    if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "vault-390-menu.png"), fullPage: true });

    await contextTrigger.click();
    await page.waitForFunction(() => !document.querySelector(".app-frame")?.classList.contains("context-sidebar-open"));
    await page.locator('[data-context-sidebar="vault"]').waitFor({ state: "hidden" });
    assert.equal(await contextTrigger.getAttribute("aria-expanded"), "false");
    const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    assert.ok(overflow.scrollWidth <= overflow.clientWidth + 1, JSON.stringify(overflow));
    await page.mouse.move(300, 20);
    if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "vault-390.png"), fullPage: true });

    await page.goto(`${baseUrl}?view=vault&ctx=allow&matter_id=matter-vault-browser-001&document_id=document-vault-browser-001&document_version_id=version-vault-browser-003&document_sha256=${sha256}#vault-files`, { waitUntil: "networkidle" });
    const mobileVersionHistoryState = page.locator('[data-vault-version-history="unavailable"]');
    await mobileVersionHistoryState.waitFor();
    assert.equal(await mobileVersionHistoryState.locator("table, button, input, select, textarea, a").count(), 0);
    const mobileActions = page.locator('[data-vault-document-save-actions="true"]');
    await mobileActions.scrollIntoViewIfNeeded();
    assert.equal(await mobileActions.locator("button").count(), 2);
    const mobileActionBoxes = await mobileActions.locator("button").evaluateAll((buttons) => buttons.map((button) => {
      const box = button.getBoundingClientRect();
      return { left: box.left, right: box.right, width: box.width };
    }));
    assert.equal(mobileActionBoxes.every((box) => box.left >= 0 && box.right <= 390 && box.width > 0), true);
    if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "vault-detail-actions-390.png") });
    const mobileDetailOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    assert.ok(mobileDetailOverflow.scrollWidth <= mobileDetailOverflow.clientWidth + 1, JSON.stringify(mobileDetailOverflow));
    if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "vault-detail-390.png"), fullPage: true });
    await mobileVersionHistoryState.scrollIntoViewIfNeeded();
    const mobileVersionHistoryBox = await mobileVersionHistoryState.boundingBox();
    assert.ok(mobileVersionHistoryBox);
    assert.ok(mobileVersionHistoryBox.x >= 0 && mobileVersionHistoryBox.x + mobileVersionHistoryBox.width <= 390, JSON.stringify(mobileVersionHistoryBox));
    if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "vault-detail-version-history-390.png") });

    await page.goto(`${baseUrl}?view=vault&ctx=allow&matter_id=matter-vault-browser-001&document_id=document-vault-browser-001&document_version_id=version-vault-browser-003&document_sha256=${"b".repeat(64)}#vault-files`, { waitUntil: "networkidle" });
    assert.equal(await page.locator('[data-vault-exact-target-mismatch="true"]').count(), 1);
    assert.equal(await page.locator('[data-vault-exact-version-facts="true"]').count(), 0);

    await page.goto(`${baseUrl}?view=vault&ctx=allow#vault-upload`, { waitUntil: "networkidle" });
    const desktopBoundary = page.locator('[data-vault-pending-boundary="desktop-file-bridge-required"]');
    await desktopBoundary.waitFor();
    assert.match(await desktopBoundary.textContent(), /AMIC OS 데스크톱 앱/);
    assert.match(await desktopBoundary.textContent(), /별도 Vault 설치 없이/);
    assert.equal(await page.locator('input[type="file"]').count(), 0);
    corporateDocument = true;
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(`${baseUrl}?view=vault&ctx=allow#vault-home`, { waitUntil: "networkidle" });
    await page.locator('[data-vault-document-list="true"] .amic-search-row').first().click();
    await page.locator('[data-vault-exact-version-facts="true"]').waitFor();
    await page.getByRole("button", { name: "미리보기" }).click();
    await page.getByText("정확한 버전을 기본 문서 앱에서 열었습니다. 임시 파일은 자동으로 삭제됩니다.").waitFor();
    const corporatePreview = await page.evaluate(() => window.__vaultPreviewCalls.at(-1));
    assert.match(await page.locator('[data-vault-exact-version-facts="true"]').innerText(), /문서 공간/u);
    assert.doesNotMatch(await page.locator('[data-vault-exact-version-facts="true"]').innerText(), /Matter|확인 필요/u);
    assert.equal(corporatePreview.matterId, null);
    assert.equal(corporatePreview.workspaceId, "workspace-vault-browser-001");
    await page.evaluate(() => { window.__cancelVaultSave = true; });
    await page.getByRole("button", { name: "내 컴퓨터에 저장" }).click();
    await page.waitForFunction(() => window.__vaultSaveCalls.length === 1);
    assert.equal(await page.getByText("선택한 위치에 저장했고 Vault 전달 기록을 확인했습니다.").count(), 0);
    await page.evaluate(() => { window.__cancelVaultSave = false; });
    await page.getByRole("button", { name: "내 컴퓨터에 저장" }).click();
    await page.getByText("선택한 위치에 저장했고 Vault 전달 기록을 확인했습니다.").waitFor();
    const corporateSave = await page.evaluate(() => window.__vaultSaveCalls.at(-1));
    assert.equal(corporateSave.matterId, null);
    assert.equal(corporateSave.workspaceId, "workspace-vault-browser-001");
    assert.equal(corporateSave.sha256, sha256);
    await page.evaluate(() => window.__classicOutlookAttachHandler?.({
      request_handle: `classic-outlook-${"a".repeat(32)}`, expires_at: new Date(Date.now() + 60_000).toISOString(),
    }));
    assert.equal(await page.getByRole("button", { name: "현재 Outlook 초안에 첨부", exact: true }).count(), 0);
    assert.equal((await page.evaluate(() => window.__vaultOutlookAttachCalls)).length, 0);
    if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "vault-corporate-document-1440.png"), fullPage: true });
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Vault upload requires explicit preflight, native selection, explicit save, and exact readback before document navigation", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  const browser = await chromium.launch({ headless: true });
  const uploadedSha256 = "c".repeat(64);
  try {
    await server.listen();
    const baseUrl = server.resolvedUrls?.local?.[0];
    assert.ok(baseUrl);
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(({ sessionValue, capabilityValue, exactSha256 }) => {
      sessionStorage.setItem("lawos.api.session", JSON.stringify({
        token_type: "Bearer",
        session_token: "lawos_session_v1.browser.fixture",
        expires_at: sessionValue.expires_at,
        session: sessionValue,
        vault_capabilities: capabilityValue
      }));
      window.__vaultUploadCalls = [];
      Object.defineProperty(window, "amicFileBridge", {
        configurable: false,
        value: Object.freeze({
          async status() {
            window.__vaultUploadCalls.push({ method: "status" });
            return {
              state: "available",
              bridgeExposed: true,
              nativePickerAvailable: true,
              preflightAvailable: true,
              uploadAvailable: true,
              uploadReady: true,
              uploadResumeAvailable: true,
              pathVisibleToRenderer: false,
              fileBytesVisibleToRenderer: false
            };
          },
          async precheckUpload(request) {
            window.__vaultUploadCalls.push({ method: "precheckUpload", request });
            return {
              state: "allowed",
              preflightId: "file-preflight-browser-001",
              expiresAt: Date.now() + 60_000,
              maxUploadBytes: 16 * 1024 * 1024,
              pathVisibleToRenderer: false
            };
          },
          async chooseFileForUpload(preflightId) {
            window.__vaultUploadCalls.push({ method: "chooseFileForUpload", preflightId });
            return {
              state: "selected",
              file: {
                handleId: "file-handle-browser-001",
                name: "계약서.pdf",
                size: 4096,
                mimeType: "application/pdf",
                pathVisibleToRenderer: false
              }
            };
          },
          async cancelUpload(handleId) {
            window.__vaultUploadCalls.push({ method: "cancelUpload", handleId });
            return { state: "cancelled", handleId, userFileDeleted: false };
          },
          async resumePendingUploads() {
            window.__vaultUploadCalls.push({ method: "resumePendingUploads" });
            return [];
          },
          async uploadSelectedFile(handleId) {
            window.__vaultUploadCalls.push({ method: "uploadSelectedFile", handleId });
            return {
              state: "uploaded",
              documentId: "document-upload-browser-001",
              versionId: "version-upload-browser-001",
              fileObjectId: "file-object-upload-browser-001",
              sha256: exactSha256,
              byteSize: 4096,
              mimeType: "application/pdf",
              auditEventId: "audit-upload-browser-001",
              pathVisibleToRenderer: false
            };
          }
        })
      });
    }, { sessionValue: session(), capabilityValue: projection(), exactSha256: uploadedSha256 });

    let summaryMode = "provider";
    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/auth/session") {
        await fulfillJson(route, { request_id: "req-vault-upload-session", outcome: "passed", ok: true, session: session(), vault_capabilities: projection(), production_ready_claim: false });
        return;
      }
      if (url.pathname === "/api/matters") {
        await fulfillJson(route, {
          request_id: "req-vault-upload-matters",
          outcome: "passed",
          items: [{ matter_id: "matter-upload-browser-001", matter_code: "2026-001", title: "업로드 검증", status: "open", vault_workspace_id: "workspace-upload-browser-001" }],
          safe_error_codes: [],
          audit_hint_ref: "audit-vault-upload-matters",
          ui_state: null,
          page_info: { next_cursor: null },
          count_leak_prevented: true,
          production_ready_claim: false
        });
        return;
      }
      if (url.pathname === "/api/matters/matter-upload-browser-001/vault-summary") {
        await fulfillJson(route, {
          request_id: "req-vault-upload-summary",
          outcome: "passed",
          item: summaryMode === "provider" ? null : {
            matter_id: "matter-upload-browser-001",
            vault_workspace_id: "workspace-upload-browser-001",
            default_folder_id: "folder-upload-browser-001",
            workspace_status: "active",
            raw_storage_path_included: false,
            document_bytes_included: false,
            production_ready_claim: false
          },
          safe_error_codes: [],
          audit_hint_ref: "audit-vault-upload-summary",
          ui_state: summaryMode === "provider" ? "empty" : null,
          count_leak_prevented: true,
          production_ready_claim: false
        });
        return;
      }
      if (url.pathname === "/api/vault/documents") {
        await fulfillJson(route, {
          ...documentsBody(),
          request_id: "req-vault-upload-document-readback",
          items: [{
            document_id: "document-upload-browser-001",
            matter_id: "matter-upload-browser-001",
            workspace_id: "workspace-upload-browser-001",
            title: "계약서.pdf",
            status: "active",
            current_version_id: "version-upload-browser-001",
            latest_sha256: uploadedSha256,
            raw_path_exposed: false,
            document_bytes_included: false,
            storage_pointer_ref_included: false
          }]
        });
        return;
      }
      if (url.pathname === "/api/vault/search/preferences") {
        await fulfillJson(route, preferencesBody());
        return;
      }
      await fulfillJson(route, { outcome: "not_found", items: [], safe_error_codes: ["NOT_FOUND"] }, 404);
    });

    await page.goto(`${baseUrl}?view=vault&ctx=allow&matter_id=matter-upload-browser-001#vault-upload`, { waitUntil: "networkidle" });
    await page.locator('[data-vault-upload-destination="preflight"]').waitFor();
    assert.match(await page.locator('[data-vault-upload-destination="preflight"]').textContent(), /저장 준비 확인에서 서버가 확정/);
    assert.equal(await page.locator('input[type="file"]').count(), 0);
    assert.deepEqual(await page.evaluate(() => window.__vaultUploadCalls.map((call) => call.method)), ["status", "resumePendingUploads"]);

    await page.getByRole("button", { name: "저장 준비 확인" }).click();
    await page.locator('[data-vault-upload-workflow="ready"]').waitFor();
    await page.locator('[data-vault-upload-destination="ready"]').waitFor();
    assert.deepEqual(await page.evaluate(() => window.__vaultUploadCalls), [
      { method: "status" },
      { method: "resumePendingUploads" },
      {
        method: "precheckUpload",
        request: {
          matterId: "matter-upload-browser-001",
          workspaceId: null,
          folderId: null
        }
      }
    ]);

    await page.getByRole("button", { name: "파일 선택" }).click();
    await page.locator('[data-vault-upload-workflow="selected"]').waitFor();
    assert.match(await page.locator('[data-vault-upload-selected-file="true"]').textContent(), /계약서\.pdf/);
    assert.deepEqual(await page.evaluate(() => window.__vaultUploadCalls.map((call) => call.method)), ["status", "resumePendingUploads", "precheckUpload", "chooseFileForUpload"]);

    await page.getByRole("button", { name: "Vault에 저장" }).click();
    await page.locator('[data-vault-upload-readback="verified"]').waitFor();
    assert.deepEqual(await page.evaluate(() => window.__vaultUploadCalls.map((call) => call.method)), ["status", "resumePendingUploads", "precheckUpload", "chooseFileForUpload", "uploadSelectedFile"]);
    const readbackText = await page.locator('[data-vault-upload-readback="verified"]').textContent();
    assert.match(readbackText, /document-upload-browser-001/);
    assert.match(readbackText, /version-upload-browser-001/);
    assert.match(readbackText, new RegExp(uploadedSha256));
    assert.equal(readbackText.includes("/Users/"), false);

    const screenshotDir = process.env.LAWOS_VAULT_SCREENSHOT_DIR;
    if (screenshotDir) {
      await mkdir(screenshotDir, { recursive: true });
      await page.screenshot({ path: join(screenshotDir, "vault-upload-complete-1280.png"), fullPage: true });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileContextTrigger = page.locator('[data-context-sidebar-trigger="true"]');
    if (await mobileContextTrigger.getAttribute("aria-expanded") === "true") {
      await mobileContextTrigger.click();
      await page.waitForFunction(() => !document.querySelector(".app-frame")?.classList.contains("context-sidebar-open"));
    }
    await page.locator('[data-context-sidebar="vault"]').waitFor({ state: "hidden" });
    const mobileOverflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
    assert.ok(mobileOverflow.scrollWidth <= mobileOverflow.clientWidth + 1, JSON.stringify(mobileOverflow));
    if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "vault-upload-complete-390.png"), fullPage: true });
    const mobileOpenButton = page.getByRole("button", { name: "저장한 문서 열기" });
    await mobileOpenButton.scrollIntoViewIfNeeded();
    assert.equal(await mobileOpenButton.isVisible(), true);
    if (screenshotDir) await page.screenshot({ path: join(screenshotDir, "vault-upload-complete-390-bottom.png"), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 });

    await page.getByRole("button", { name: "저장한 문서 열기" }).click();
    await page.locator('[data-vault-exact-version-facts="true"]').waitFor();
    const location = new URL(page.url());
    assert.equal(location.hash, "#vault-files");
    assert.equal(location.searchParams.get("matter_id"), "matter-upload-browser-001");
    assert.equal(location.searchParams.get("document_id"), "document-upload-browser-001");
    assert.equal(location.searchParams.get("document_version_id"), "version-upload-browser-001");
    assert.equal(location.searchParams.get("document_sha256"), uploadedSha256);

    summaryMode = "linked";
    await page.goto(`${baseUrl}?view=vault&ctx=allow&matter_id=matter-upload-browser-001#vault-upload`, { waitUntil: "networkidle" });
    await page.locator('[data-vault-upload-destination="ready"]').waitFor();
    await page.getByRole("button", { name: "저장 준비 확인" }).click();
    await page.locator('[data-vault-upload-workflow="ready"]').waitFor();
    assert.deepEqual(await page.evaluate(() => window.__vaultUploadCalls.at(-1)), {
      method: "precheckUpload",
      request: {
        matterId: "matter-upload-browser-001",
        workspaceId: "workspace-upload-browser-001",
        folderId: "folder-upload-browser-001"
      }
    });
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Vault upload resumes an accepted operation after renderer reload without selecting or sending the file again", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  const browser = await chromium.launch({ headless: true });
  const operationId = "vaultop_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const sha256 = "d".repeat(64);
  try {
    await server.listen();
    const baseUrl = server.resolvedUrls?.local?.[0];
    assert.ok(baseUrl);
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(({ sessionValue, capabilityValue, exactSha256, pendingOperationId }) => {
      sessionStorage.setItem("lawos.api.session", JSON.stringify({
        token_type: "Bearer",
        session_token: "lawos_session_v1.browser.resume.fixture",
        expires_at: sessionValue.expires_at,
        session: sessionValue,
        vault_capabilities: capabilityValue
      }));
      if (!localStorage.getItem("vault-recovery-state")) {
        localStorage.setItem("vault-recovery-state", "processing");
        localStorage.setItem("vault-recovery-status-calls", "0");
        localStorage.setItem("vault-recovery-upload-calls", "0");
      }
      Object.defineProperty(window, "amicFileBridge", {
        configurable: false,
        value: Object.freeze({
          async status() {
            return {
              state: "available",
              bridgeExposed: true,
              nativePickerAvailable: true,
              preflightAvailable: true,
              uploadAvailable: true,
              uploadReady: true,
              uploadResumeAvailable: true,
              pathVisibleToRenderer: false,
              fileBytesVisibleToRenderer: false
            };
          },
          async precheckUpload() { throw new Error("unexpected precheck"); },
          async chooseFileForUpload() { throw new Error("unexpected picker"); },
          async cancelUpload() { throw new Error("unexpected cancel"); },
          async uploadSelectedFile() {
            localStorage.setItem(
              "vault-recovery-upload-calls",
              String(Number(localStorage.getItem("vault-recovery-upload-calls")) + 1),
            );
            throw new Error("accepted bytes must not be sent again");
          },
          async resumePendingUploads() {
            localStorage.setItem(
              "vault-recovery-status-calls",
              String(Number(localStorage.getItem("vault-recovery-status-calls")) + 1),
            );
            if (localStorage.getItem("vault-recovery-state") === "complete") {
              return [{
                state: "uploaded",
                operationId: pendingOperationId,
                matterId: "matter-upload-resume-001",
                documentId: "document-upload-resume-001",
                versionId: "version-upload-resume-001",
                fileObjectId: "file-object-upload-resume-001",
                sha256: exactSha256,
                byteSize: 8192,
                mimeType: "application/pdf",
                auditEventId: "audit-upload-resume-001",
                pathVisibleToRenderer: false,
                rawBytesIncluded: false,
                filenameIncluded: false
              }];
            }
            return [{
              state: "processing",
              operationId: pendingOperationId,
              matterId: "matter-upload-resume-001",
              stage: "scanning",
              retryAfterMs: 5000,
              sha256: exactSha256,
              byteSize: 8192,
              mimeType: "application/pdf",
              exactReadbackVerified: false,
              pathVisibleToRenderer: false,
              rawBytesIncluded: false,
              filenameIncluded: false
            }];
          }
        })
      });
    }, {
      sessionValue: session(),
      capabilityValue: projection(),
      exactSha256: sha256,
      pendingOperationId: operationId,
    });

    await page.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === "/api/auth/session") {
        await fulfillJson(route, { request_id: "req-vault-resume-session", outcome: "passed", ok: true, session: session(), vault_capabilities: projection(), production_ready_claim: false });
        return;
      }
      if (url.pathname === "/api/matters") {
        await fulfillJson(route, {
          request_id: "req-vault-resume-matters",
          outcome: "passed",
          items: [{ matter_id: "matter-upload-resume-001", matter_code: "2026-002", title: "재실행 복구", status: "open", vault_workspace_id: "workspace-upload-resume-001" }],
          safe_error_codes: [],
          audit_hint_ref: "audit-vault-resume-matters",
          ui_state: null,
          page_info: { next_cursor: null },
          count_leak_prevented: true,
          production_ready_claim: false
        });
        return;
      }
      if (url.pathname === "/api/matters/matter-upload-resume-001/vault-summary") {
        await fulfillJson(route, {
          request_id: "req-vault-resume-summary",
          outcome: "passed",
          item: {
            matter_id: "matter-upload-resume-001",
            vault_workspace_id: "workspace-upload-resume-001",
            default_folder_id: "folder-upload-resume-001",
            workspace_status: "active",
            raw_storage_path_included: false,
            document_bytes_included: false,
            production_ready_claim: false
          },
          safe_error_codes: [],
          audit_hint_ref: "audit-vault-resume-summary",
          ui_state: null,
          count_leak_prevented: true,
          production_ready_claim: false
        });
        return;
      }
      if (url.pathname === "/api/vault/search/preferences") {
        await fulfillJson(route, preferencesBody());
        return;
      }
      await fulfillJson(route, { outcome: "not_found", items: [], safe_error_codes: ["NOT_FOUND"] }, 404);
    });

    const url = `${baseUrl}?view=vault&ctx=allow&matter_id=matter-upload-resume-001#vault-upload`;
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator('[data-vault-upload-processing="true"]').waitFor();
    assert.match(await page.locator('[data-vault-upload-processing="true"]').textContent(), /보안 검사 중/);
    assert.equal(await page.evaluate(() => Number(localStorage.getItem("vault-recovery-upload-calls"))), 0);
    const callsBeforeReload = await page.evaluate(() => Number(localStorage.getItem("vault-recovery-status-calls")));
    assert.ok(callsBeforeReload >= 1);

    await page.evaluate(() => localStorage.setItem("vault-recovery-state", "complete"));
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-vault-upload-readback="verified"]').waitFor();
    const readback = await page.locator('[data-vault-upload-readback="verified"]').textContent();
    assert.match(readback, /document-upload-resume-001/);
    assert.match(readback, /version-upload-resume-001/);
    assert.match(readback, new RegExp(sha256));
    assert.equal(await page.evaluate(() => Number(localStorage.getItem("vault-recovery-upload-calls"))), 0);
    assert.ok(await page.evaluate(() => Number(localStorage.getItem("vault-recovery-status-calls"))) > callsBeforeReload);
  } finally {
    await browser.close();
    await server.close();
  }
});

test("Vault search history stays server-authoritative and favorites remain explicitly unavailable", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  const browser = await chromium.launch({ headless: true });
  const mutations = [];
  let serverPreferences = preferencesBody().item;
  try {
    await server.listen();
    const baseUrl = server.resolvedUrls?.local?.[0];
    assert.ok(baseUrl);
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.addInitScript(({ sessionValue, capabilityValue }) => {
      sessionStorage.setItem("lawos.api.session", JSON.stringify({
        token_type: "Bearer",
        session_token: "lawos_session_v1.browser.fixture",
        expires_at: sessionValue.expires_at,
        session: sessionValue,
        vault_capabilities: capabilityValue
      }));
      window.confirm = () => true;
    }, { sessionValue: session(), capabilityValue: projection() });

    const requests = [];
    await page.route("**/api/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const method = request.method();
      requests.push({ path: url.pathname, method });
      if (url.pathname === "/api/auth/session") {
        await fulfillJson(route, {
          request_id: "req-vault-search-session",
          outcome: "passed",
          ok: true,
          session: session(),
          vault_capabilities: projection(),
          production_ready_claim: false
        });
        return;
      }
      if (url.pathname === "/api/vault/search/preferences" && method === "GET") {
        await fulfillJson(route, {
          ...preferencesBody(),
          request_id: "req-vault-search-preferences-read",
          item: serverPreferences
        });
        return;
      }
      if (url.pathname === "/api/vault/search/preferences" && method === "POST") {
        const body = request.postDataJSON();
        mutations.push(body);
        const record = {
          id: `${body.operation}-server-${mutations.length}`,
          query: body.query,
          searched_at: "2026-08-29T00:00:00.000Z",
          current_version_only: body.current_version_only,
          date_from: body.date_from,
          date_to: body.date_to
        };
        if (body.operation === "remember") {
          serverPreferences = {
            ...serverPreferences,
            recent: [record, ...serverPreferences.recent.filter((item) => item.query !== body.query)]
          };
        } else if (body.operation === "save") {
          serverPreferences = {
            ...serverPreferences,
            saved: [record, ...serverPreferences.saved.filter((item) => item.query !== body.query)]
          };
        } else if (body.operation === "delete_saved") {
          serverPreferences = {
            ...serverPreferences,
            saved: serverPreferences.saved.filter((item) => item.id !== body.id)
          };
        } else if (body.operation === "clear_recent") {
          serverPreferences = { ...serverPreferences, recent: [] };
        } else {
          await fulfillJson(route, { outcome: "invalid_operation" }, 400);
          return;
        }
        await fulfillJson(route, {
          ...preferencesBody(),
          request_id: `req-vault-search-preferences-${body.operation}`,
          item: serverPreferences
        });
        return;
      }
      if (url.pathname === "/api/vault/search") {
        assert.equal(url.searchParams.get("q"), "의견서");
        assert.equal(url.searchParams.get("current_version"), "current");
        await fulfillJson(route, {
          ...documentsBody(),
          request_id: "req-vault-search-result"
        });
        return;
      }
      await fulfillJson(route, {
        outcome: "not_found",
        items: [],
        safe_error_codes: ["NOT_FOUND"]
      }, 404);
    });

    await page.goto(`${baseUrl}?view=vault&ctx=allow#vault-search-recent`, {
      waitUntil: "networkidle"
    });
    const recentQuery = page.locator(".search-query-open").filter({ hasText: "의견서" });
    await recentQuery.waitFor();
    await recentQuery.click();
    await page.locator('[data-vault-section="vault-search-all"]').waitFor();
    await page.getByText("계약 검토 의견서").waitFor();
    await page.waitForFunction(() => {
      const button = [...document.querySelectorAll("button")]
        .find((candidate) => candidate.textContent?.includes("검색 저장"));
      return button && !button.disabled;
    });
    assert.equal(mutations[0].operation, "remember");

    await page.getByRole("button", { name: "검색 저장" }).click();
    await page.getByRole("button", { name: "저장됨" }).waitFor();
    assert.equal(mutations[1].operation, "save");
    assert.equal(mutations[1].query, "의견서");
    assert.equal(JSON.stringify(mutations).includes("session_token"), false);
    assert.equal(JSON.stringify(mutations).includes("role"), false);

    await page.locator('[data-sidebar-section="vault-search-saved"]').click();
    await page.locator('[data-vault-section="vault-search-saved"]').waitFor();
    const deleteSaved = page.getByRole("button", { name: "의견서 삭제" });
    await deleteSaved.waitFor();
    await deleteSaved.click();
    await deleteSaved.waitFor({ state: "detached" });
    assert.equal(mutations[2].operation, "delete_saved");
    assert.match(mutations[2].id, /^save-server-/u);

    await page.locator('[data-sidebar-section="vault-search-recent"]').click();
    await page.locator('[data-vault-section="vault-search-recent"]').waitFor();
    await page.getByRole("button", { name: "최근 검색 비우기" }).click();
    await page.getByText("표시할 기록이 없습니다.").waitFor();
    assert.equal(mutations[3].operation, "clear_recent");

    await page.locator('[data-sidebar-default-section="vault-home"]').click();
    const requestsBeforeFavorites = requests.map((request) => ({ ...request }));
    await page.locator('[data-sidebar-section="vault-favorites"]').click();
    const favoritesBoundary = page.locator(
      '[data-vault-pending-boundary="favorites-authority"]'
    );
    await favoritesBoundary.waitFor();
    assert.match(await favoritesBoundary.textContent(), /Vault 서버/);
    assert.equal(await favoritesBoundary.locator("button").count(), 0);
    await page.waitForTimeout(50);
    assert.deepEqual(requests, requestsBeforeFavorites);
    assert.equal(await page.evaluate(() => (
      [...Object.keys(localStorage), ...Object.keys(sessionStorage)]
        .some((key) => /favorite/i.test(key))
    )), false);
  } finally {
    await browser.close();
    await server.close();
  }
});
