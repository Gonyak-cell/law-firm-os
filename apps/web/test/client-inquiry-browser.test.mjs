import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { stat } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const evidenceDir = resolve(webRoot, "../../.omo/evidence/client-inquiry");

async function availablePort() {
  return new Promise((resolvePort, rejectPort) => {
    const server = createNetServer();
    server.once("error", rejectPort);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

function listBody() {
  return {
    outcome: "passed",
    ui_state: null,
    data_status: "complete",
    items: [
      {
        lead_id: "lead-visible",
        display_name: "계약 검토 문의",
        visible_status: "new",
        visible_status_label: "새 문의",
        source: "outlook_addin",
        received_at: "2026-07-31T01:00:00.000Z",
        assigned_user_id: null,
        next_action: "담당 변호사 지정"
      },
      {
        lead_id: "lead-manual",
        display_name: "직접 등록 문의",
        visible_status: "reviewing",
        visible_status_label: "확인 중",
        source: "manual",
        received_at: "2026-07-30T08:00:00.000Z",
        assigned_user_id: "user-attorney",
        next_action: "상담 일정 확인"
      }
    ],
    page_info: { returned_count: 2, omitted_item_count: null },
    source_status: {
      crm_consultations: "complete",
      crm_leads: "complete",
      crm_opportunities: "complete"
    },
    permission_filter_applied: true,
    count_leak_prevented: true,
    safe_error_codes: []
  };
}

function detailBody() {
  return {
    outcome: "passed",
    data_status: "complete",
    item: {
      ...listBody().items[0],
      consultations_access: "allowed",
      consultations: [{
        scheduled_start: "2026-08-01T01:00:00.000Z",
        scheduled_end: null,
        completed_at: null,
        timezone: "Asia/Seoul",
        subject: "초기 상담",
        outcome: null,
        next_action: "상담 준비",
        confidential: false,
        confidential_details_included: true,
        status: "scheduled"
      }],
      evidence: {
        access: "allowed",
        source_status: "complete",
        items: [{
          inquiry_email_evidence_id: "evidence-visible",
          received_at: "2026-07-31T01:00:00.000Z",
          subject: "계약 검토 요청",
          sender_display_name: "문의 발신자",
          capture_status: "captured",
          raw_content_included: false,
          mailbox_address_included: false,
          provider_message_identifiers_included: false,
          storage_object_identifiers_included: false,
          display_content_path: "/api/outlook/inquiries/evidence/evidence-visible/content?kind=display",
          original_content_path: "/api/outlook/inquiries/evidence/evidence-visible/content?kind=original"
        }],
        page_info: { returned_count: 1, omitted_item_count: null },
        count_leak_prevented: true
      }
    },
    source_status: {
      crm_consultations: "complete",
      crm_leads: "complete",
      crm_opportunities: "complete",
      email_evidence: "complete"
    },
    permission_filter_applied: true,
    count_leak_prevented: true,
    safe_error_codes: []
  };
}

function genericCollection(pathname) {
  return {
    request_id: `ui-test-${pathname.replace(/[^a-z0-9]+/giu, "-")}`,
    outcome: "passed",
    ui_state: "empty",
    items: [],
    page_info: { returned_count: 0, omitted_item_count: null, next_cursor: null },
    safe_error_codes: [],
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

test("Client 새 문의는 canonical list/detail/evidence를 1440·820·390에서 안전하게 연다", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true, hmr: false }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const requests = [];
  const displayText = "안전한 표시용 메일 본문";
  const originalBytes = Buffer.from("From: sender@example.test\r\n\r\n원본", "utf8");
  const displaySha = createHash("sha256").update(Buffer.from(displayText, "utf8")).digest("hex");
  const originalSha = createHash("sha256").update(originalBytes).digest("hex");
  let delayOriginalResponse = false;
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(({ expiresAt }) => {
    sessionStorage.setItem("lawos.api.session", JSON.stringify({
      token_type: "Bearer",
      session_token: "lawos_session_v1.client_inquiry_browser",
      expires_at: expiresAt,
      session: {
        user_id: "user_client_inquiry_browser",
        tenant_id: "tenant_client_inquiry_browser"
      }
    }));
    sessionStorage.setItem("lawos.session.envelope", JSON.stringify({
      schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
      state: "signed_in",
      session_ref: "session_client_inquiry_browser",
      source: "api_signed_session",
      actor_ref: "user_client_inquiry_browser",
      tenant_refs: {
        default: "tenant_client_inquiry_browser",
        client: "tenant_client_inquiry_browser",
        matter: "tenant_client_inquiry_browser",
        vault: "tenant_client_inquiry_browser",
        crm: "tenant_client_inquiry_browser"
      },
      role_ids: ["crm_operator"],
      scopes: ["crm.inquiry.read"],
      review_state: "allow",
      expires_at: expiresAt
    }));
  }, { expiresAt: "2099-01-01T00:00:00.000Z" });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    requests.push({ pathname: url.pathname, search: url.search, headers: request.headers() });
    if (url.pathname === "/api/crm/inquiries") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(listBody()) });
    }
    if (url.pathname === "/api/crm/inquiries/lead-visible") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(detailBody()) });
    }
    if (url.pathname === "/api/outlook/inquiries/evidence/evidence-visible/content") {
      const kind = url.searchParams.get("kind");
      if (kind === "display") {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
          outcome: "passed",
          safe_error_codes: [],
          item: {
            inquiry_email_evidence_id: "evidence-visible",
            object_kind: "sanitized_display",
            encoding: "utf8",
            content_text: displayText,
            content_base64: null,
            content_sha256: displaySha,
            byte_size: Buffer.byteLength(displayText, "utf8"),
            mime_type: "text/plain; charset=utf-8",
            scan_status: "clean",
            raw_path_exposed: false,
            storage_pointer_ref_included: false,
            executable_preview_enabled: false,
            external_resources_loaded: false
          }
        }) });
      }
      if (delayOriginalResponse) await new Promise((resolveDelay) => setTimeout(resolveDelay, 600));
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        outcome: "passed",
        safe_error_codes: [],
        item: {
          inquiry_email_evidence_id: "evidence-visible",
          object_kind: "original_mime",
          encoding: "base64",
          content_text: null,
          content_base64: originalBytes.toString("base64"),
          content_sha256: originalSha,
          byte_size: originalBytes.byteLength,
          mime_type: "message/rfc822",
          scan_status: "clean",
          raw_path_exposed: false,
          storage_pointer_ref_included: false,
          executable_preview_enabled: false,
          external_resources_loaded: false
        }
      }) });
    }
    if (url.pathname === "/api/profile/me") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        outcome: "passed",
        ui_state: null,
        item: { display_name: "UI 테스트" },
        safe_error_codes: [],
        count_leak_prevented: true
      }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(genericCollection(url.pathname)) });
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/?view=clients&ctx=allow#client-leads`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-client-inquiry-list="true"]').waitFor();
    assert.equal(await page.locator('[data-client-inquiry-row]').count(), 2);
    assert.match(await page.locator('[data-client-inquiry-list="true"]').innerText(), /Outlook/);
    assert.match(await page.locator('[data-client-inquiry-list="true"]').innerText(), /직접 등록/);
    assert.equal(await page.locator('[data-record-overlay="inquiry"]').count(), 0);
    assert.equal((await page.locator('[data-client-inquiry-list="true"]').innerText()).includes("lead-visible"), false);
    const inquiryListRequest = requests.find(({ pathname }) => pathname === "/api/crm/inquiries");
    assert.ok(inquiryListRequest);
    assert.equal(new URLSearchParams(inquiryListRequest.search).get("tenant_id"), "tenant_client_inquiry_browser");
    assert.equal(inquiryListRequest.headers.authorization, "Bearer lawos_session_v1.client_inquiry_browser");
    const permissionContext = JSON.parse(inquiryListRequest.headers["x-lawos-permission-context"]);
    assert.equal(permissionContext.principal.tenant_id, "tenant_client_inquiry_browser");
    assert.equal(permissionContext.principal.user_id, "user_client_inquiry_browser");
    assert.equal(permissionContext.principal.session_context_ref, "session_client_inquiry_browser");
    await page.screenshot({ path: resolve(evidenceDir, "client-inquiry-1440.png"), fullPage: true });

    const firstRowButton = page.locator('[data-client-inquiry-row-button]').first();
    await firstRowButton.click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get("inquiry_id") === "lead-visible");
    await page.locator('[data-record-overlay="inquiry"]').waitFor();
    const inquiryDialog = page.getByRole("dialog", { name: "계약 검토 문의 문의 상세" });
    const inquiryClose = page.getByRole("button", { name: "문의 상세 닫기", exact: true }).last();
    await inquiryClose.waitFor();
    assert.equal(await inquiryClose.evaluate((element) => document.activeElement === element), true);
    await page.keyboard.press("Shift+Tab");
    assert.equal(await inquiryDialog.evaluate((element) => element.contains(document.activeElement)), true);
    await page.keyboard.press("Tab");
    assert.equal(await inquiryClose.evaluate((element) => document.activeElement === element), true);
    const detailText = await page.locator('[data-client-inquiry-detail="true"]').innerText();
    assert.match(detailText, /담당\s+미지정/);
    assert.match(detailText, /다음 행동\s+담당 변호사 지정/);
    assert.match(detailText, /안전한 메타데이터/);
    assert.equal(detailText.includes("evidence-visible"), false);

    await page.getByRole("button", { name: "메일 내용 보기", exact: true }).click();
    await page.locator('pre[aria-label="안전한 메일 내용"]').waitFor();
    assert.equal(await page.locator('pre[aria-label="안전한 메일 내용"]').innerText(), displayText);
    assert.equal(await page.locator("iframe").count(), 0);
    assert.ok(requests.some(({ pathname, search }) => pathname.includes("/api/outlook/inquiries/evidence/") && search.includes("kind=display")));

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "원본 .eml 다운로드", exact: true }).click();
    const download = await downloadPromise;
    assert.match(download.suggestedFilename(), /\.eml$/u);
    const downloadPath = resolve(evidenceDir, "client-inquiry-original.eml");
    await download.saveAs(downloadPath);
    assert.ok((await stat(downloadPath)).size > 0);
    assert.ok(requests.some(({ pathname, search }) => pathname.includes("/api/outlook/inquiries/evidence/") && search.includes("kind=original")));

    await page.setViewportSize({ width: 820, height: 1000 });
    const tabletOverflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth
    }));
    assert.deepEqual(tabletOverflow, { document: 0, body: 0 });
    await page.screenshot({ path: resolve(evidenceDir, "client-inquiry-820.png"), fullPage: true });

    await page.setViewportSize({ width: 390, height: 844 });
    const mobileDetailOverflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth
    }));
    assert.deepEqual(mobileDetailOverflow, { document: 0, body: 0 });
    const mobilePanel = await page.locator('[data-record-overlay="inquiry"] .record-overlay-panel').boundingBox();
    assert.ok(mobilePanel);
    assert.equal(Math.round(mobilePanel.x), 0);
    assert.equal(Math.round(mobilePanel.width), 390);
    assert.match(await page.locator('[data-client-inquiry-detail="true"]').innerText(), /계약 검토 문의/);
    await page.screenshot({ path: resolve(evidenceDir, "client-inquiry-390.png"), fullPage: true });

    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !new URL(location.href).searchParams.get("inquiry_id"));
    await page.locator('[data-record-overlay="inquiry"]').waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => document.activeElement?.matches("[data-client-inquiry-row-button]")), true);
    const mobileOverflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth
    }));
    assert.deepEqual(mobileOverflow, { document: 0, body: 0 });
    assert.equal(await page.locator('[data-context-sidebar-trigger="true"]').getAttribute("aria-expanded"), "false");
    const mobileListBox = await page.locator('[data-client-inquiry-list="true"]').boundingBox();
    assert.ok(mobileListBox);
    assert.ok(mobileListBox.x >= 55);
    assert.ok(mobileListBox.x + mobileListBox.width <= 390);
    await page.screenshot({ path: resolve(evidenceDir, "client-inquiry-390-list.png"), fullPage: true });

    await firstRowButton.click();
    await page.locator('[data-record-overlay="inquiry"]').waitFor();
    await page.getByRole("button", { name: "메일 내용 보기", exact: true }).click();
    await page.locator('pre[aria-label="안전한 메일 내용"]').waitFor();
    delayOriginalResponse = true;
    const staleDownload = page.waitForEvent("download", { timeout: 1_200 }).then(() => true, () => false);
    await page.getByRole("button", { name: "원본 .eml 다운로드", exact: true }).click();
    await page.keyboard.press("Escape");
    await page.locator('[data-record-overlay="inquiry"]').waitFor({ state: "hidden" });
    assert.equal(await staleDownload, false);
    assert.equal(new URL(page.url()).searchParams.get("inquiry_id"), null);
  } finally {
    await page.close();
    await browser.close();
    await server.close();
  }
});
