import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import { createServer } from "vite";
import { installMatterUiSignedSession } from "./support/lawos-session-test-support.mjs";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const evidenceDir = process.env.MATTER_SMALL_FIRM_UI_EVIDENCE_DIR
  ? resolve(process.env.MATTER_SMALL_FIRM_UI_EVIDENCE_DIR)
  : null;
const [productStyles, matterStyles] = await Promise.all([
  readFile(resolve(webRoot, "src/styles.css"), "utf8"),
  readFile(resolve(webRoot, "src/components/matter-small-firm/matter-small-firm.css"), "utf8")
]);

function availablePort() {
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

function fixturePagePlugin() {
  return {
    name: "matter-small-firm-state-parity-page",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
        if (pathname !== "/__matter-small-firm-state-parity__") return next();
        response.statusCode = 200;
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.end("<!doctype html><html data-skin=\"forest\" lang=\"ko\"><body><main id=\"root\" class=\"page-canvas\"></main></body></html>");
      });
    }
  };
}

async function mountStateParityHarness(page) {
  await page.evaluate(async () => {
    const ReactModule = await import("/@id/react");
    const React = ReactModule.default ?? ReactModule;
    const ReactDomClientModule = await import("/@id/react-dom/client");
    const createRoot = ReactDomClientModule.createRoot ?? ReactDomClientModule.default?.createRoot;
    const { MatterDetailTabs } = await import("/src/components/matter-small-firm/MatterDetailTabs.jsx");
    const { MatterOperationsSurface } = await import("/src/components/matter-small-firm/MatterOperationsSurface.jsx");
    const { composeMatterTodayResult } = await import("/src/components/MattersSurface.jsx");
    const h = React.createElement;
    const matter = {
      matter_id: "matter-state-1",
      matter_code: "K-2026-STATE",
      title: "상태 검증 사건",
      owner_name: "목록 폴백 담당",
      backup_user_id: "목록 폴백 백업",
      document_count: 99,
      status: "open"
    };
    const detailCases = [
      ["loading", null],
      ["empty", { kind: "data", item: {} }],
      ["error", { kind: "error", message: "detail unavailable" }],
      ["blocked", { kind: "blocked", message: "detail blocked" }],
      ["denied", { kind: "data", uiState: "denied", item: {} }],
      ["data", {
        kind: "data",
        item: {
          summary: {
            owner: { display_name: "상세 담당" },
            backup: { display_name: "상세 백업" },
            next_action: { title: "상세 다음 행동" },
            next_deadline: { due_at: "2026-08-03T09:00:00.000+09:00" }
          }
        }
      }]
    ];
    const today = {
      kind: "data",
      item: {
        priority_rows: [{
          id: "task-today-success",
          task_id: "task-today-success",
          matter_id: matter.matter_id,
          title: "숨겨져야 할 성공 업무",
          ledger_ref: { model_type: "MatterTask", id: "task-today-success" }
        }],
        metrics: { missing_time_count: 0, wip_count: 0, overdue_ar_count: 0 }
      }
    };
    const calendarCases = [
      ["error", { kind: "error", message: "calendar unavailable" }],
      ["denied", { kind: "data", uiState: "denied", items: [] }],
      ["blocked", { kind: "blocked", uiState: "blocked", message: "calendar blocked" }],
      ["data", {
        kind: "data",
        items: [{
          id: "event-today-success",
          matter_id: matter.matter_id,
          title: "이번 주 일정",
          due_at: "2026-08-03T09:00:00.000+09:00"
        }]
      }]
    ];
    window.__matterStateParityEvents = [];

    function ListRetryHarness() {
      const [result, setResult] = React.useState({ kind: "error", message: "matter list unavailable" });
      return h(MatterOperationsSurface, {
        section: "matter-list",
        mode: "active",
        mattersResult: result,
        matters: [matter],
        listView: "active",
        onListViewChange() {},
        onRetry() {
          window.__matterStateParityEvents.push({ type: "matter-list-retry" });
          setResult({ kind: "data", items: [matter] });
        },
        onSelectMatter() {},
        onRestoreMatter() {}
      });
    }

    const detailSurfaces = detailCases.map(([name, detailResult]) => h(
      "section",
      { key: name, "data-detail-state-case": name },
      h(MatterDetailTabs, {
        matter,
        detailResult,
        overview: h("span", { "data-overview-success": "true" }, "개요 성공 내용"),
        billingPanel: h("span", null, "청구"),
        onOpenVault() {}
      })
    ));
    const todaySurfaces = calendarCases.map(([name, calendar]) => h(
      "section",
      { key: name, "data-today-calendar-case": name },
      h(MatterOperationsSurface, {
        section: "matter-today",
        result: composeMatterTodayResult(today, calendar),
        matters: [matter],
        onRetry() {},
        onSelectMatter() {},
        onNavigateSection() {},
        onDownloadReport() {}
      })
    ));

    createRoot(document.getElementById("root")).render(h(
      "div",
      { "data-state-parity-harness": "true" },
      h("div", { "data-detail-state-matrix": "true" }, detailSurfaces),
      h("div", { "data-today-state-matrix": "true" }, todaySurfaces),
      h("section", { "data-matter-list-retry-case": "true" }, h(ListRetryHarness))
    ));
    await new Promise((resolveFrame) => requestAnimationFrame(() => requestAnimationFrame(resolveFrame)));
  });
}

async function mountActualMattersSurface(page, { activeSection = "matter-today" } = {}) {
  await page.evaluate(async ({ activeSection: requestedSection }) => {
    const ReactModule = await import("/@id/react");
    const React = ReactModule.default ?? ReactModule;
    const ReactDomClientModule = await import("/@id/react-dom/client");
    const createRoot = ReactDomClientModule.createRoot ?? ReactDomClientModule.default?.createRoot;
    const { MattersSurface } = await import("/src/components/MattersSurface.jsx");
    const NativeBlob = window.Blob;
    const nativeCreateObjectURL = window.URL.createObjectURL.bind(window.URL);
    const nativeRevokeObjectURL = window.URL.revokeObjectURL.bind(window.URL);
    const nativeLinkClick = window.HTMLAnchorElement.prototype.click;
    window.__matterCsvEffects = {
      blob_constructions: 0,
      object_urls: 0,
      link_clicks: 0,
      revocations: 0,
      filenames: []
    };
    window.Blob = function InstrumentedBlob(...args) {
      window.__matterCsvEffects.blob_constructions += 1;
      return new NativeBlob(...args);
    };
    window.Blob.prototype = NativeBlob.prototype;
    window.URL.createObjectURL = (...args) => {
      window.__matterCsvEffects.object_urls += 1;
      return nativeCreateObjectURL(...args);
    };
    window.URL.revokeObjectURL = (...args) => {
      window.__matterCsvEffects.revocations += 1;
      return nativeRevokeObjectURL(...args);
    };
    window.HTMLAnchorElement.prototype.click = function instrumentedClick() {
      window.__matterCsvEffects.link_clicks += 1;
      window.__matterCsvEffects.filenames.push(this.download);
      return nativeLinkClick.call(this);
    };
    createRoot(document.getElementById("root")).render(React.createElement(MattersSurface, {
      labels: { mattersTitle: "Matter" },
      activeSection: requestedSection,
      liveCtx: "allow"
    }));
  }, { activeSection });
}

test("Matter detail, Today composite, Matter-list retry, and CSV export render truthful outcomes", { timeout: 120_000 }, async () => {
  if (evidenceDir) await mkdir(evidenceDir, { recursive: true });
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    plugins: [fixturePagePlugin()],
    server: { host: "127.0.0.1", port, strictPort: true }
  });
  const browser = await chromium.launch({ headless: true, args: ["--disable-gpu"] });
  try {
    await server.listen();
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`http://127.0.0.1:${port}/__matter-small-firm-state-parity__`, { waitUntil: "domcontentloaded" });
    await page.addStyleTag({ content: `${productStyles}\n${matterStyles}\n[data-state-parity-harness] { display: grid; gap: 24px; } [data-detail-state-matrix], [data-today-state-matrix] { display: grid; gap: 20px; }` });
    await mountStateParityHarness(page);
    await page.locator("[data-state-parity-harness]").waitFor();

    for (const name of ["loading", "empty", "error", "blocked", "denied"]) {
      const detailCase = page.locator(`[data-detail-state-case="${name}"]`);
      assert.equal(await detailCase.locator(`[data-matter-ops-state="${name}"]`).count(), 1, name);
      assert.equal(await detailCase.locator("[data-overview-success]").count(), 0, name);
      assert.doesNotMatch(await detailCase.textContent(), /목록 폴백 담당|목록 폴백 백업|99/);
    }
    const detailData = page.locator('[data-detail-state-case="data"]');
    assert.match(await detailData.textContent(), /상세 담당/);
    assert.match(await detailData.textContent(), /상세 백업/);
    assert.equal(await detailData.locator("[data-overview-success]").count(), 1);

    for (const name of ["error", "blocked", "denied"]) {
      const todayCase = page.locator(`[data-today-calendar-case="${name}"]`);
      assert.equal(await todayCase.locator(`[data-matter-ops-state="${name}"]`).count(), 1, name);
      assert.equal(await todayCase.locator('[data-task-id="task-today-success"]').count(), 0, name);
      assert.doesNotMatch(await todayCase.textContent(), /숨겨져야 할 성공 업무/);
    }
    const todayData = page.locator('[data-today-calendar-case="data"]');
    assert.equal(await todayData.locator('[data-task-id="task-today-success"]').count(), 1);
    assert.match(await todayData.textContent(), /이번 주 일정/);

    const listRetry = page.locator("[data-matter-list-retry-case]");
    assert.equal(await listRetry.locator('[data-matter-ops-state="error"]').count(), 1);
    await listRetry.getByRole("button", { name: "다시 시도" }).click();
    await listRetry.locator("tbody tr").waitFor();
    assert.match(await listRetry.textContent(), /K-2026-STATE/);
    assert.deepEqual(await page.evaluate(() => window.__matterStateParityEvents), [
      { type: "matter-list-retry" }
    ]);

    const observables = {
      detail_states: await page.locator("[data-detail-state-case]").evaluateAll((nodes) =>
        nodes.map((node) => ({
          case: node.getAttribute("data-detail-state-case"),
          state: node.querySelector("[data-matter-ops-state]")?.getAttribute("data-matter-ops-state") ?? "data",
          overview_success_visible: Boolean(node.querySelector("[data-overview-success]"))
        }))),
      today_calendar_states: await page.locator("[data-today-calendar-case]").evaluateAll((nodes) =>
        nodes.map((node) => ({
          case: node.getAttribute("data-today-calendar-case"),
          state: node.querySelector("[data-matter-ops-state]")?.getAttribute("data-matter-ops-state") ?? "data",
          happy_task_visible: Boolean(node.querySelector('[data-task-id="task-today-success"]'))
        }))),
      matter_list_retry_events: await page.evaluate(() => window.__matterStateParityEvents)
    };
    if (evidenceDir) {
      await page.screenshot({ path: join(evidenceDir, "state-parity-render.png"), fullPage: true });
    }

    const overlayMatter = {
      matter_id: "matter-overlay-state-1",
      matter_code: "K-2026-OVERLAY",
      title: "오버레이 권한 상태 검증",
      client_display_name: "상태 검증 의뢰인",
      owner_user_id: "person-overlay-owner",
      owner_display_name: "상세 담당",
      status: "open"
    };
    const overlayMutationSelectors = [
      "[data-matter-record-inline-edit-action]",
      "[data-matter-record-owner-change-action]",
      "[data-sf-b-w02-matter-record-actions]",
      "[data-sf-b-w02-matter-owner-blocked-action]",
      "[data-sf-b-w02-matter-action-audit-feed]"
    ];
    const overlayCases = [
      { name: "error", status: 503, outcome: "error", uiState: "error", expectedState: "error" },
      { name: "guarded", status: 403, outcome: "denied", uiState: "denied", expectedState: "denied" },
      { name: "blocked", status: 409, outcome: "blocked", uiState: "blocked", expectedState: "blocked" },
      { name: "data", status: 200, outcome: "passed", uiState: "data", expectedState: null }
    ];
    const overlayStateObservables = [];

    for (const overlayCase of overlayCases) {
      const overlayPage = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
      await installMatterUiSignedSession(overlayPage);
      let releaseDetail;
      let markDetailStarted;
      const detailGate = new Promise((resolveDetail) => {
        releaseDetail = resolveDetail;
      });
      const detailStarted = new Promise((resolveStarted) => {
        markDetailStarted = resolveStarted;
      });
      try {
        await overlayPage.route("**/api/**", async (route) => {
          const request = route.request();
          const url = new URL(request.url());
          const base = {
            request_id: `overlay-state-${overlayCase.name}-${url.pathname}`,
            outcome: "passed",
            items: [],
            item: {},
            safe_error_codes: [],
            audit_hint_ref: "overlay-state-audit",
            ui_state: "data",
            production_ready_claim: false,
            count_leak_prevented: true,
            page_info: { next_cursor: null }
          };
          if (request.method() === "GET" && url.pathname === "/api/matters") {
            return route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ ...base, item: undefined, items: [overlayMatter] })
            });
          }
          if (request.method() === "GET" && url.pathname === "/api/hrx/employees") {
            return route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                employees: [{
                  employee_id: "employee-overlay-owner",
                  display_name: "상세 담당",
                  status: "active"
                }]
              })
            });
          }
          if (request.method() === "GET" && url.pathname === "/api/hrx/employee-user-links") {
            return route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                links: [{
                  employee_id: "employee-overlay-owner",
                  user_id: overlayMatter.owner_user_id,
                  status: "active"
                }]
              })
            });
          }
          if (
            request.method() === "GET"
            && url.pathname === `/api/matter/ops/matters/${overlayMatter.matter_id}`
          ) {
            markDetailStarted();
            await detailGate;
            const body = overlayCase.name === "data"
              ? {
                  ...base,
                  outcome: overlayCase.outcome,
                  ui_state: overlayCase.uiState,
                  items: undefined,
                  item: {
                    matter: overlayMatter,
                    summary: {
                      owner_user_id: overlayMatter.owner_user_id,
                      owner: { user_id: overlayMatter.owner_user_id, display_name: overlayMatter.owner_display_name },
                      backup_user_id: null,
                      backup: null,
                      next_action: { title: "상세 상태 확인" },
                      next_deadline: { due_at: "2026-08-03T09:00:00.000+09:00" }
                    },
                    tab_data: {
                      work_deadlines: [],
                      contact_history: [],
                      documents: [],
                      time_billing: [{
                        time_entry_id: "time-overlay-state-1",
                        matter_id: overlayMatter.matter_id,
                        duration_minutes: 30,
                        billable: true
                      }]
                    }
                  }
                }
              : {
                  ...base,
                  outcome: overlayCase.outcome,
                  ui_state: overlayCase.uiState,
                  item: undefined,
                  items: [],
                  safe_error_codes: [`OVERLAY_${overlayCase.name.toUpperCase()}`]
                };
            return route.fulfill({
              status: overlayCase.status,
              contentType: "application/json",
              body: JSON.stringify(body)
            });
          }
          if (
            request.method() === "GET"
            && url.pathname === `/api/matter/ops/matters/${overlayMatter.matter_id}/closeout`
          ) {
            return route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ ...base, item: undefined, items: [], can_close: true })
            });
          }
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(base)
          });
        });
        await overlayPage.goto(`http://127.0.0.1:${port}/__matter-small-firm-state-parity__`, { waitUntil: "domcontentloaded" });
        await overlayPage.addStyleTag({ content: `${productStyles}\n${matterStyles}` });
        await mountActualMattersSurface(overlayPage, { activeSection: "matter-list" });
        const listScreen = overlayPage.locator('[data-matter-small-firm-screen="matter-list"]');
        const matterRow = listScreen.locator("tbody tr").filter({ hasText: overlayMatter.matter_code });
        await matterRow.waitFor();
        await matterRow.getByRole("button", { name: "사건 열기", exact: true }).click();
        const overlay = overlayPage.locator('[data-matter-record-workspace="right-panel"]');
        await overlay.waitFor();
        await detailStarted;
        await overlay.locator('[data-matter-ops-state="loading"]').waitFor();

        const loadingMutationCounts = Object.fromEntries(await Promise.all(
          overlayMutationSelectors.map(async (selector) => [selector, await overlay.locator(selector).count()])
        ));
        const loadingProfilePanelCount = await overlay.locator("[data-matter-profile-panel]").count();
        const loadingHandoffFormCount = await overlay.locator("[data-matter-handoff-form]").count();
        const loadingProfileEditActionCount = await overlay.getByRole("button", { name: "편집", exact: true }).count();
        const loadingStakeholderAddActionCount = await overlay.getByRole("button", { name: "관계자 추가", exact: true }).count();
        const loadingHandoffSubmitCount = await overlay.locator("[data-matter-handoff-submit]").count();
        const loadingCloseActionCount = await overlay.getByRole("button", { name: "사건 종결", exact: true }).count();
        assert.deepEqual(Object.values(loadingMutationCounts), [0, 0, 0, 0, 0]);
        assert.deepEqual(
          [
            loadingProfilePanelCount,
            loadingHandoffFormCount,
            loadingProfileEditActionCount,
            loadingStakeholderAddActionCount,
            loadingHandoffSubmitCount,
            loadingCloseActionCount
          ],
          [0, 0, 0, 0, 0, 0]
        );
        const billingTab = overlay.getByRole("tab", { name: "시간·청구" });
        await billingTab.click();
        const loadingBillingActionCount = await overlay.locator("[data-matter-charge-actions]").count();
        assert.equal(loadingBillingActionCount, 0);
        await overlay.getByRole("tab", { name: "개요", exact: true }).click();
        if (evidenceDir && overlayCase.name === "error") {
          await overlayPage.screenshot({ path: join(evidenceDir, "matter-record-overlay-loading-1440.png"), fullPage: true });
        }

        releaseDetail();
        if (overlayCase.expectedState) {
          await overlay.locator(`[data-matter-ops-state="${overlayCase.expectedState}"]`).waitFor();
        } else {
          await overlay.locator("[data-matter-record-inline-edit-action]").waitFor();
        }
        const settledMutationCounts = Object.fromEntries(await Promise.all(
          overlayMutationSelectors.map(async (selector) => [selector, await overlay.locator(selector).count()])
        ));
        const expectedMutationCount = overlayCase.name === "data" ? 1 : 0;
        assert.deepEqual(
          Object.values(settledMutationCounts),
          [expectedMutationCount, expectedMutationCount, expectedMutationCount, expectedMutationCount, expectedMutationCount]
        );
        const profilePanelCount = await overlay.locator("[data-matter-profile-panel]").count();
        const handoffFormCount = await overlay.locator("[data-matter-handoff-form]").count();
        const profileEditActionCount = await overlay.getByRole("button", { name: "편집", exact: true }).count();
        const stakeholderAddActionCount = await overlay.getByRole("button", { name: "관계자 추가", exact: true }).count();
        const handoffSubmitCount = await overlay.locator("[data-matter-handoff-submit]").count();
        assert.equal(profilePanelCount, expectedMutationCount);
        assert.equal(handoffFormCount, expectedMutationCount);
        assert.equal(profileEditActionCount, expectedMutationCount);
        assert.equal(stakeholderAddActionCount, expectedMutationCount);
        assert.equal(handoffSubmitCount, expectedMutationCount);
        const closeAction = overlay.getByRole("button", { name: "사건 종결", exact: true });
        const closeActionCount = await closeAction.count();
        assert.equal(closeActionCount, expectedMutationCount);
        let reachableEnabled = null;
        if (overlayCase.name === "data") {
          await overlayPage.waitForFunction(() => {
            const selectors = [
              "[data-matter-record-inline-edit-action] button",
              "[data-matter-record-owner-change-action] button",
              "[data-sf-b-w02-matter-record-actions] button",
              "[data-sf-b-w02-matter-owner-blocked-action] button",
              "[data-matter-handoff-submit]"
            ];
            return selectors.every((selector) => {
              const control = document.querySelector(selector);
              return control && !control.disabled;
            });
          });
          reachableEnabled = {
            inline_edit: await overlay.locator("[data-matter-record-inline-edit-action] button").isEnabled(),
            owner_change: await overlay.locator("[data-matter-record-owner-change-action] button").isEnabled(),
            record_field: await overlay.locator("[data-sf-b-w02-matter-record-actions] button").isEnabled(),
            bulk_owner: await overlay.locator("[data-sf-b-w02-matter-owner-blocked-action] button").isEnabled(),
            handoff: await overlay.locator("[data-matter-handoff-submit]").isEnabled(),
            close: await closeAction.isEnabled(),
            profile_edit: await overlay.getByRole("button", { name: "편집", exact: true }).isEnabled(),
            stakeholder_add: await overlay.getByRole("button", { name: "관계자 추가", exact: true }).isEnabled()
          };
          assert.deepEqual(Object.values(reachableEnabled), [true, true, true, true, true, true, true, true]);
        }
        if (evidenceDir && overlayCase.name === "data") {
          await overlayPage.screenshot({
            path: join(evidenceDir, "matter-record-overlay-data-overview-1440.png"),
            fullPage: true
          });
        }
        await billingTab.click();
        if (overlayCase.name === "data") {
          await overlay.locator("[data-matter-charge-actions]").waitFor();
        } else {
          await overlay.locator(`[data-matter-ops-state="${overlayCase.expectedState}"]`).waitFor();
        }
        const billingActionCount = await overlay.locator("[data-matter-charge-actions]").count();
        assert.equal(billingActionCount, expectedMutationCount);
        if (overlayCase.name === "data") {
          const billingTimeSubmit = overlay.locator('[data-matter-time-entry-form] button[type="submit"]');
          await billingTimeSubmit.waitFor();
          assert.equal(await billingTimeSubmit.isEnabled(), true);
          reachableEnabled.billing_time_entry = true;
        }
        if (evidenceDir) {
          await overlayPage.screenshot({
            path: join(evidenceDir, `matter-record-overlay-${overlayCase.name}-1440.png`),
            fullPage: true
          });
        }
        overlayStateObservables.push({
          case: overlayCase.name,
          detail_http_status: overlayCase.status,
          rendered_state: overlayCase.expectedState ?? "data",
          loading_mutation_counts: loadingMutationCounts,
          loading_profile_panel_count: loadingProfilePanelCount,
          loading_handoff_form_count: loadingHandoffFormCount,
          loading_profile_edit_action_count: loadingProfileEditActionCount,
          loading_stakeholder_add_action_count: loadingStakeholderAddActionCount,
          loading_handoff_submit_count: loadingHandoffSubmitCount,
          loading_close_action_count: loadingCloseActionCount,
          loading_billing_action_count: loadingBillingActionCount,
          settled_mutation_counts: settledMutationCounts,
          profile_panel_count: profilePanelCount,
          handoff_form_count: handoffFormCount,
          profile_edit_action_count: profileEditActionCount,
          stakeholder_add_action_count: stakeholderAddActionCount,
          handoff_submit_count: handoffSubmitCount,
          close_action_count: closeActionCount,
          billing_action_count: billingActionCount,
          reachable_enabled: reachableEnabled
        });
      } finally {
        releaseDetail?.();
        await overlayPage.close();
      }
    }
    observables.full_overlay_mutation_gate = overlayStateObservables;
    if (evidenceDir) {
      await writeFile(
        join(evidenceDir, "full-overlay-mutation-gate-observables.json"),
        `${JSON.stringify(overlayStateObservables, null, 2)}\n`
      );
    }

    let csvMode = "network";
    const csvRequests = [];
    const downloadNames = [];
    const reportPath = "/api/matter/ops/report.csv";
    const pageWithReport = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    await installMatterUiSignedSession(pageWithReport);
    pageWithReport.on("download", (download) => downloadNames.push(download.suggestedFilename()));
    await pageWithReport.route("**/api/**", async (route) => {
      const url = new URL(route.request().url());
      const base = {
        request_id: `state-parity-${url.pathname}`,
        outcome: "passed",
        items: [],
        item: {},
        safe_error_codes: [],
        audit_hint_ref: "state-parity-audit",
        ui_state: "data",
        production_ready_claim: false,
        count_leak_prevented: true,
        page_info: { next_cursor: null }
      };
      if (url.pathname === reportPath) {
        csvRequests.push(csvMode);
        if (csvMode === "network") return route.abort("failed");
        if (csvMode === "http-error") {
          return route.fulfill({ status: 503, contentType: "text/plain", body: "unavailable" });
        }
        return route.fulfill({
          status: 200,
          headers: {
            "content-type": "text/csv; charset=utf-8",
            "content-disposition": "attachment; filename=matter-weekly-operations.csv"
          },
          body: "matter_id,title\nmatter-state-1,상태 검증 사건\n"
        });
      }
      if (url.pathname === "/api/matters") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            item: undefined,
            items: [{
              matter_id: "matter-state-1",
              matter_code: "K-2026-STATE",
              title: "상태 검증 사건",
              status: "open"
            }]
          })
        });
      }
      if (url.pathname === "/api/matter/ops/today") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            items: undefined,
            item: {
              priority_rows: [{
                id: "task-report-1",
                matter_id: "matter-state-1",
                title: "보고서 검증 업무"
              }],
              metrics: { missing_time_count: 0, wip_count: 0, overdue_ar_count: 0 }
            }
          })
        });
      }
      if (url.pathname === "/api/matter/ops/calendar") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ...base,
            item: undefined,
            items: []
          })
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(base)
      });
    });
    await pageWithReport.goto(`http://127.0.0.1:${port}/__matter-small-firm-state-parity__?view=matters#matter-today`, { waitUntil: "domcontentloaded" });
    await pageWithReport.addStyleTag({ content: `${productStyles}\n${matterStyles}` });
    await mountActualMattersSurface(pageWithReport);
    const reportButton = pageWithReport.getByRole("button", { name: "CSV", exact: true });
    await reportButton.waitFor();

    await Promise.all([
      pageWithReport.waitForRequest((request) => new URL(request.url()).pathname === reportPath),
      reportButton.click()
    ]);
    await pageWithReport.getByRole("alert").filter({ hasText: "CSV를 내려받지 못했습니다." }).waitFor();
    assert.deepEqual(await pageWithReport.evaluate(() => window.__matterCsvEffects), {
      blob_constructions: 0,
      object_urls: 0,
      link_clicks: 0,
      revocations: 0,
      filenames: []
    });
    assert.deepEqual(downloadNames, []);

    csvMode = "http-error";
    await Promise.all([
      pageWithReport.waitForResponse((response) => new URL(response.url()).pathname === reportPath && response.status() === 503),
      reportButton.click()
    ]);
    await pageWithReport.getByRole("alert").filter({ hasText: "CSV를 내려받지 못했습니다." }).waitFor();
    assert.deepEqual(await pageWithReport.evaluate(() => window.__matterCsvEffects), {
      blob_constructions: 0,
      object_urls: 0,
      link_clicks: 0,
      revocations: 0,
      filenames: []
    });
    assert.deepEqual(downloadNames, []);
    if (evidenceDir) {
      await pageWithReport.screenshot({ path: join(evidenceDir, "csv-failure-render.png"), fullPage: true });
    }

    csvMode = "success";
    const downloadPromise = pageWithReport.waitForEvent("download");
    await Promise.all([
      pageWithReport.waitForResponse((response) => new URL(response.url()).pathname === reportPath && response.status() === 200),
      reportButton.click()
    ]);
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), "matter-weekly-operations.csv");
    if (evidenceDir) await download.saveAs(join(evidenceDir, "matter-weekly-operations.csv"));
    await pageWithReport.waitForFunction(() => window.__matterCsvEffects.link_clicks === 1);
    const csvEffects = await pageWithReport.evaluate(() => window.__matterCsvEffects);
    assert.deepEqual(csvEffects, {
      blob_constructions: 1,
      object_urls: 1,
      link_clicks: 1,
      revocations: 1,
      filenames: ["matter-weekly-operations.csv"]
    });
    assert.deepEqual(downloadNames, ["matter-weekly-operations.csv"]);
    assert.equal(await pageWithReport.getByRole("alert").filter({ hasText: "CSV를 내려받지 못했습니다." }).count(), 0);
    observables.csv = {
      requests: csvRequests,
      failure_effects: { blob_constructions: 0, object_urls: 0, link_clicks: 0, revocations: 0 },
      success_effects: csvEffects,
      browser_downloads: downloadNames
    };
    if (evidenceDir) {
      await pageWithReport.screenshot({ path: join(evidenceDir, "csv-success-render.png"), fullPage: true });
      await writeFile(join(evidenceDir, "state-parity-observables.json"), `${JSON.stringify(observables, null, 2)}\n`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
});
