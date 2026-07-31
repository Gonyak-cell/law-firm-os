import assert from "node:assert/strict";
import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const evidenceDir = resolve(webRoot, "../../.omo/evidence/client-opportunity");

async function availablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolvePort(port));
    });
  });
}

function collection(requestId, items = []) {
  return {
    request_id: requestId,
    outcome: "passed",
    ui_state: items.length ? null : "empty",
    items,
    page_info: { returned_count: items.length, omitted_item_count: null, next_cursor: null },
    safe_error_codes: [],
    audit_hint_ref: `${requestId}-audit`,
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function opportunities() {
  return [
    {
      opportunity_id: "opp-review",
      display_name: "가온 법률",
      requested_scope_summary: "기업 자문",
      stage: "qualified",
      status: "active",
      engagement_decision: "pending",
      engagement_decision_version: 1,
      engagement_workflow_status: null,
      intake_request_id: null
    },
    {
      opportunity_id: "opp-waiting",
      display_name: "한빛 제조",
      requested_scope_summary: "노동 상담",
      stage: "intake_requested",
      status: "active",
      engagement_decision: "pending",
      engagement_decision_version: 1,
      engagement_workflow_status: "in_progress",
      intake_request_id: null
    },
    {
      opportunity_id: "opp-linked",
      display_name: "새봄 테크",
      requested_scope_summary: "계약 검토",
      stage: "qualified",
      status: "active",
      engagement_decision: "pending",
      engagement_decision_version: 1,
      engagement_workflow_status: "in_progress",
      intake_request_id: "intake-linked"
    },
    {
      opportunity_id: "opp-opened",
      display_name: "다온 바이오",
      requested_scope_summary: "개인정보 대응",
      stage: "intake_opened",
      status: "active",
      engagement_decision: "pending",
      engagement_decision_version: 1,
      engagement_workflow_status: "in_progress",
      intake_request_id: null
    },
    {
      opportunity_id: "opp-accepted",
      display_name: "수임 완료 고객",
      requested_scope_summary: "분쟁 대응",
      stage: "qualified",
      status: "active",
      engagement_decision: "accepted",
      engagement_decision_version: 2,
      engagement_workflow_status: "completed",
      intake_request_id: null
    },
    {
      opportunity_id: "opp-declined",
      display_name: "검토 종료 고객",
      requested_scope_summary: "가사 상담",
      stage: "closed_lost",
      status: "archived",
      engagement_decision: "declined",
      engagement_decision_version: 2,
      engagement_workflow_status: "completed",
      intake_request_id: null
    }
  ];
}

test("CL-P5-W02-T04 수임 현황은 선택·탭·검색·상담 연결과 반응형 키보드 계약을 지킨다", async () => {
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: { host: "127.0.0.1", port, strictPort: true, hmr: false }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const requests = [];
  const state = {
    items: opportunities(),
    handoffBodies: [],
    handoffMode: "success",
    handoffDelayMs: 0,
    dropNextHandoff: false,
    committedHandoffs: new Map()
  };
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(({ expiresAt }) => {
    sessionStorage.setItem("lawos.api.session", JSON.stringify({
      token_type: "Bearer",
      session_token: "lawos_session_v1.client_opportunity_browser",
      expires_at: expiresAt,
      session: { user_id: "user_client_opportunity_browser", tenant_id: "tenant_client_opportunity_browser" }
    }));
    sessionStorage.setItem("lawos.session.envelope", JSON.stringify({
      schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
      state: "signed_in",
      session_ref: "session_client_opportunity_browser",
      source: "api_signed_session",
      actor_ref: "user_client_opportunity_browser",
      tenant_refs: {
        default: "tenant_client_opportunity_browser",
        client: "tenant_client_opportunity_browser",
        matter: "tenant_client_opportunity_browser",
        vault: "tenant_client_opportunity_browser",
        crm: "tenant_client_opportunity_browser"
      },
      role_ids: ["crm_operator"],
      scopes: ["crm.opportunity.read", "crm.opportunity.write"],
      review_state: "allow",
      expires_at: expiresAt
    }));
  }, { expiresAt: "2099-01-01T00:00:00.000Z" });
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith("/api/")) return route.continue();
    requests.push({ method: request.method(), pathname: url.pathname, search: url.search, headers: request.headers() });
    if (url.pathname === "/api/crm/opportunities" && request.method() === "GET") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(collection("opportunities", state.items)) });
    }
    if (url.pathname.endsWith("/handoff") && request.method() === "POST") {
      const body = request.postDataJSON();
      state.handoffBodies.push(body);
      const id = url.pathname.split("/").at(-2);
      const source = state.items.find((item) => item.opportunity_id === id);
      if (state.handoffDelayMs > 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, state.handoffDelayMs));
      if (state.handoffMode !== "success") {
        const outcome = state.handoffMode;
        return route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({
          outcome,
          ui_state: outcome === "denied" ? "denied" : outcome === "review_required" ? "review_required" : "blocked",
          item: null,
          safe_error_codes: [`HANDOFF_${outcome.toUpperCase()}`],
          audit_hint_ref: "handoff-guarded-audit",
          production_ready_claim: false
        }) });
      }
      const replay = state.committedHandoffs.get(body.idempotency_key);
      const updated = replay?.opportunity ?? { ...source, stage: "intake_requested", intake_request_id: body.intake_request_id };
      const handoffItem = replay?.item ?? { intake_request_id: body.intake_request_id, opportunity_id: id, requested_scope_summary: body.requested_scope_summary };
      if (!replay) {
        state.items = state.items.map((item) => item.opportunity_id === id ? updated : item);
        state.committedHandoffs.set(body.idempotency_key, { opportunity: updated, item: handoffItem });
      }
      if (state.dropNextHandoff) {
        state.dropNextHandoff = false;
        await route.abort("failed");
        return;
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
        outcome: replay ? "idempotent_replay" : "passed",
        ui_state: null,
        item: handoffItem,
        opportunity: updated,
        safe_error_codes: [],
        audit_hint_ref: "handoff-audit",
        production_ready_claim: false
      }) });
    }
    if (url.pathname === "/api/profile/me") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ outcome: "passed", ui_state: null, item: { display_name: "수임 현황 테스트" }, safe_error_codes: [], count_leak_prevented: true, production_ready_claim: false }) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(collection(`generic-${url.pathname}`)) });
  });

  try {
    await page.goto(`http://127.0.0.1:${port}/?view=clients&ctx=allow#client-opportunities`, { waitUntil: "domcontentloaded" });
    await page.locator('[data-client-opportunity-surface="true"]').waitFor();
    assert.equal(await page.locator('[data-client-opportunity-row="true"]').count(), 6);
    assert.equal((await page.locator('[data-client-opportunity-surface="true"]').innerText()).includes("opp-review"), false);
    const opportunityRequest = requests.find(({ pathname, method }) => pathname === "/api/crm/opportunities" && method === "GET");
    assert.ok(opportunityRequest);
    assert.equal(new URLSearchParams(opportunityRequest.search).get("tenant_id"), "tenant_client_opportunity_browser");
    assert.equal(opportunityRequest.headers.authorization, "Bearer lawos_session_v1.client_opportunity_browser");
    await page.screenshot({ path: resolve(evidenceDir, "client-opportunity-1440.png"), fullPage: true });

    await page.getByRole("tab", { name: "상담 연결 대기", exact: true }).click();
    await page.locator('[data-client-opportunity-row="true"]').first().waitFor();
    await page.locator('[data-client-opportunity-row="true"]').first().click();
    const detailForEscape = page.locator('[data-client-opportunity-detail="true"]');
    await detailForEscape.waitFor();
    await page.keyboard.press("Escape");
    await detailForEscape.waitFor({ state: "hidden" });
    assert.equal(await page.locator('[data-client-opportunity-row="true"]').first().evaluate((element) => document.activeElement === element), true);
    await page.getByRole("tab", { name: "전체", exact: true }).click();
    await page.locator('[data-client-opportunity-row="true"]').first().waitFor();

    await page.getByRole("tab", { name: "검토 중", exact: true }).click();
    await page.locator('[data-client-opportunity-row="true"]').first().waitFor();
    const firstRow = page.locator('[data-client-opportunity-row="true"]').first();
    await firstRow.click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get("opportunity_id") === "opp-review");
    const detail = page.locator('[data-client-opportunity-detail="true"]');
    await detail.waitFor();
    assert.match(await detail.innerText(), /가온 법률/);
    assert.equal(await page.getByRole("button", { name: "상담으로 연결", exact: true }).count(), 1);
    const close = page.getByRole("button", { name: "수임 현황 상세 닫기", exact: true });
    assert.equal(await close.evaluate((element) => document.activeElement === element), true);
    await page.keyboard.press("Tab");
    assert.equal(await page.getByRole("button", { name: "상담으로 연결", exact: true }).evaluate((element) => document.activeElement === element), true);
    await page.keyboard.press("Tab");
    assert.equal(await close.evaluate((element) => document.activeElement === element), false);
    await page.getByRole("button", { name: "상담으로 연결", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "상담 연결이 완료되었습니다" }).waitFor();
    await page.waitForFunction(() => new URL(location.href).searchParams.get("tab") === "intake_opened");
    assert.equal(new URL(page.url()).searchParams.get("opportunity_id"), "opp-review");
    const selectedAfterHandoff = page.locator('[data-client-opportunity-detail="true"]');
    assert.equal(await selectedAfterHandoff.count(), 1);
    assert.equal(await selectedAfterHandoff.evaluate((element) => element.contains(document.activeElement)), true);
    assert.equal(state.handoffBodies.at(-1).requested_scope_summary, "기업 자문");
    assert.equal(state.handoffBodies.at(-1).opportunity_id, undefined);
    await page.setViewportSize({ width: 820, height: 900 });
    const tabletOverflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth
    }));
    assert.deepEqual(tabletOverflow, { document: 0, body: 0 });
    await page.screenshot({ path: resolve(evidenceDir, "client-opportunity-820.png"), fullPage: true });

    await page.getByRole("tab", { name: "수임 확정", exact: true }).click();
    await page.waitForFunction(() => new URL(location.href).searchParams.get("tab") === "accepted");
    assert.equal(await page.locator('[data-client-opportunity-detail="true"]').count(), 0);
    assert.equal(await page.locator('[data-client-opportunity-row="true"]').count(), 1);
    await page.getByLabel("고객·요청 범위 검색").fill("없는 고객");
    await page.waitForFunction(() => new URL(location.href).searchParams.get("opportunity_query") === "없는 고객");
    assert.equal(new URL(page.url()).searchParams.get("query"), null);
    assert.match(await page.locator('[data-client-opportunity-state="empty"]').innerText(), /조건에 맞는 수임 건이 없습니다/);

    await page.getByLabel("고객·요청 범위 검색").fill("");
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      body: document.body.scrollWidth - document.body.clientWidth
    }));
    assert.deepEqual(overflow, { document: 0, body: 0 });
    await page.screenshot({ path: resolve(evidenceDir, "client-opportunity-390.png"), fullPage: true });

    await page.getByRole("tab", { name: "전체", exact: true }).click();
    await page.locator('[data-client-opportunity-row="true"]').first().waitFor();
    state.dropNextHandoff = true;
    await page.locator('[data-client-opportunity-row="true"]').nth(1).click();
    await page.getByRole("button", { name: "상담으로 연결", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "상담 연결 결과를 확인하지 못했습니다" }).waitFor();
    const droppedHandoff = state.handoffBodies.at(-1);
    await page.getByRole("button", { name: "상담으로 연결", exact: true }).click();
    await page.getByRole("status").filter({ hasText: "상담 연결이 완료되었습니다" }).waitFor();
    const replayedHandoff = state.handoffBodies.at(-1);
    assert.equal(replayedHandoff.idempotency_key, droppedHandoff.idempotency_key);
    assert.equal(replayedHandoff.intake_request_id, droppedHandoff.intake_request_id);
    assert.equal(new URL(page.url()).searchParams.get("tab"), "intake_opened");
    assert.equal(new URL(page.url()).searchParams.get("opportunity_id"), "opp-waiting");

    await page.getByRole("tab", { name: "전체", exact: true }).click();
    await page.locator('[data-client-opportunity-row="true"]').first().waitFor();
    state.handoffDelayMs = 350;
    await page.locator('[data-client-opportunity-row="true"]').nth(5).click();
    await page.getByRole("button", { name: "상담으로 연결", exact: true }).click();
    await page.locator('[data-client-opportunity-row="true"]').nth(4).click();
    await page.waitForTimeout(500);
    assert.equal(await page.locator('[data-client-opportunity-detail="true"]').getByText("상담 연결이 완료되었습니다", { exact: false }).count(), 0);
    assert.match(await page.locator('[data-client-opportunity-row="true"]').nth(5).innerText(), /상담 연결 전/);
    state.handoffDelayMs = 0;

    await page.getByRole("tab", { name: "전체", exact: true }).click();
    await page.locator('[data-client-opportunity-row="true"]').first().waitFor();
    assert.equal(await page.locator('[data-client-opportunity-row="true"]').count(), 6);
    const guardedHandoff = async (rowIndex, mode, message) => {
      state.handoffMode = mode;
      const row = page.locator('[data-client-opportunity-row="true"]').nth(rowIndex);
      await row.click();
      const guardedDetail = page.locator('[data-client-opportunity-detail="true"]');
      await guardedDetail.waitFor();
      await page.getByRole("button", { name: "상담으로 연결", exact: true }).click();
      await page.getByRole("status").filter({ hasText: message }).waitFor();
      assert.equal(await page.locator('[data-client-opportunity-row="true"]').count(), 6);
      await page.keyboard.press("Escape");
      await guardedDetail.waitFor({ state: "hidden" });
    };
    await guardedHandoff(3, "denied", "상담 연결 권한이 없습니다");
    await guardedHandoff(4, "review_required", "담당자 확인이 필요합니다");
    await guardedHandoff(5, "blocked", "상담 연결이 차단되었습니다");
    state.handoffMode = "success";
  } finally {
    await browser.close();
    await server.close();
  }
});
