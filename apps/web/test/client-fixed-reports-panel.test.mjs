import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { chromium } from "playwright";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");

const columns = {
  monthly_deposit_revenue: [
    { key: "month", label: "월" },
    { key: "net_deposit_revenue", label: "입금 매출" },
  ],
  inquiry_status: [
    { key: "status", label: "상태" },
    { key: "count", label: "건수" },
  ],
  revenue_ranking: [
    { key: "rank", label: "순위" },
    { key: "client_name", label: "고객" },
    { key: "matched_inflow_amount", label: "연결 입금" },
    { key: "linked_refund_amount", label: "환불" },
    { key: "net_deposit_revenue", label: "입금 매출" },
    { key: "latest_deposit_date", label: "최근 입금일" },
  ],
  receivables_ranking: [
    { key: "rank", label: "순위" },
    { key: "client_name", label: "고객" },
    { key: "agreed_amount", label: "약정 수임료" },
    { key: "active_allocated_amount", label: "반영 입금" },
    { key: "receivable_amount", label: "미수금" },
    { key: "earliest_due_date", label: "가장 이른 지급기한" },
  ],
};

const rows = {
  monthly_deposit_revenue: Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 7 + index, 1));
    return {
      month: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
      net_deposit_revenue: index === 9 ? -100 : index === 11 ? 1_000 : 0,
    };
  }),
  inquiry_status: [
    { status: "새 문의", count: 1 },
    { status: "확인 중", count: 0 },
    { status: "상담 예정", count: 1 },
    { status: "수임 검토 중", count: 1 },
    { status: "수임 확정", count: 1 },
    { status: "수임하지 않음", count: 1 },
  ],
  revenue_ranking: [
    {
      rank: 1,
      client_name: "'=HYPERLINK(\"https://bad.test\",\"열기\")",
      matched_inflow_amount: 700,
      linked_refund_amount: 200,
      net_deposit_revenue: 500,
      latest_deposit_date: "2026-07-20",
    },
    {
      rank: 2,
      client_name: "한빛건설",
      matched_inflow_amount: 500,
      linked_refund_amount: 0,
      net_deposit_revenue: 500,
      latest_deposit_date: "2026-07-15",
    },
    {
      rank: 3,
      client_name: "다온 법률",
      matched_inflow_amount: 0,
      linked_refund_amount: 25,
      net_deposit_revenue: -25,
      latest_deposit_date: null,
    },
  ],
  receivables_ranking: [
    {
      rank: 1,
      client_name: "미수 고객",
      agreed_amount: 300,
      active_allocated_amount: 200,
      receivable_amount: 100,
      earliest_due_date: null,
    },
    {
      rank: 2,
      client_name: "선순위 고객",
      agreed_amount: 100,
      active_allocated_amount: 100,
      receivable_amount: 0,
      earliest_due_date: "2026-08-10",
    },
  ],
};

function fixedScreen(reportId) {
  const snapshot = {
    token: `lawos_client_fixed_report_v1.${reportId}-opaque`,
    version: 1,
    expires_at: "2026-07-31T01:10:00.000Z",
  };
  return {
    outcome: "passed",
    ui_state: null,
    count_leak_prevented: true,
    exportSnapshot: snapshot,
    item: {
      report_id: reportId,
      columns: columns[reportId],
      rows: rows[reportId],
      row_count: rows[reportId].length,
      source_status: "available",
      snapshot,
      as_of: "2026-07-31T01:00:00.000Z",
      timezone: "Asia/Seoul",
      permission_prefilter_applied: true,
      count_leak_prevented: true,
      raw_bank_source_included: false,
      raw_source_payload_included: false,
      contact_pii_included: false,
      internal_ids_included: false,
    },
  };
}

function partialDashboard() {
  return {
    kind: "data",
    outcome: "partial",
    uiState: "partial",
    permissionPrefilterApplied: true,
    countLeakPrevented: true,
    rawBankSourceIncluded: false,
    rawSourcePayloadIncluded: false,
    credentialMaterialIncluded: false,
    sections: {
      monthly_deposit_revenue: {
        status: "partial",
        data: {
          points: [
            { month: "2026-06", net_deposit_revenue: 0 },
            { month: "2026-07", net_deposit_revenue: 1_000 },
          ],
        },
      },
    },
  };
}

async function withPanelModule(callback) {
  const server = await createServer({
    configFile: false,
    root: webRoot,
    appType: "custom",
    logLevel: "error",
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false },
  });
  try {
    const module = await server.ssrLoadModule(
      "/src/components/ClientFixedReportsPanel.jsx",
    );
    return await callback(module.ClientFixedReportsPanel);
  } finally {
    await server.close();
  }
}

test("panel starts without a report selection and renders all six read states with natural Korean copy", async () => {
  await withPanelModule((ClientFixedReportsPanel) => {
    const initial = renderToStaticMarkup(React.createElement(
      ClientFixedReportsPanel,
      { result: fixedScreen("revenue_ranking") },
    ));
    assert.match(initial, /data-client-fixed-reports-selection="none"/);
    assert.match(initial, /확인할 리포트를 선택하세요/);
    assert.match(
      initial,
      /화면에 보이는 내용과 같은 자료로 CSV를 만듭니다/,
    );
    assert.doesNotMatch(initial, /스냅샷/);
    assert.equal((initial.match(/role="tab"/g) ?? []).length, 4);
    assert.doesNotMatch(initial, /role="tabpanel"/);
    assert.doesNotMatch(
      initial,
      /lawos_client_fixed_report_v1\.revenue_ranking-opaque/,
    );

    const states = [
      [null, "loading", "리포트를 불러오는 중입니다."],
      [{ kind: "empty", uiState: "empty" }, "empty", "표시할 자료가 없습니다."],
      [{ kind: "guarded", uiState: "denied" }, "denied", "리포트 조회 권한이 없습니다."],
      [{ kind: "guarded", uiState: "review_required" }, "review_required", "리포트 확인이 필요합니다."],
      [partialDashboard(), "partial", "확인된 자료만 표시합니다."],
      [{ kind: "error", uiState: "error" }, "error", "리포트를 불러오지 못했습니다."],
    ];
    for (const [result, state, copy] of states) {
      const html = renderToStaticMarkup(React.createElement(
        ClientFixedReportsPanel,
        {
          result,
          selectedReportId: "monthly_deposit_revenue",
          actions: { onExportCsv() {}, onRetry() {} },
        },
      ));
      assert.match(html, new RegExp(`data-client-fixed-report-state="${state}"`));
      assert.match(html, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });
});

test("selected fixed screen renders exact rows while denied reads keep CSV disabled", async () => {
  await withPanelModule((ClientFixedReportsPanel) => {
    const selected = renderToStaticMarkup(React.createElement(
      ClientFixedReportsPanel,
      {
        result: fixedScreen("revenue_ranking"),
        selectedReportId: "revenue_ranking",
        actions: { onExportCsv() {}, onPrint() {} },
      },
    ));
    for (const header of columns.revenue_ranking.map(({ label }) => label)) {
      assert.match(selected, new RegExp(`>${header}<`));
    }
    assert.match(selected, /입금 매출 상위 고객 현재 화면 자료/);
    assert.match(selected, /최대 10개 · 현재 화면 기준/);
    assert.doesNotMatch(selected, /화면 행/);
    for (const [key, value] of Object.entries(rows.revenue_ranking[0])) {
      if (value !== null && key !== "client_name") {
        assert.match(
          selected,
          new RegExp(String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
        );
      }
    }
    assert.match(
      selected,
      /data-raw-value="&#x27;=HYPERLINK\(&quot;https:\/\/bad\.test&quot;,&quot;열기&quot;\)"/,
    );
    assert.match(
      selected,
      /aria-label="700원" data-client-fixed-report-cell="matched_inflow_amount" data-raw-value="700">700원<\/td>/,
    );
    assert.match(
      selected,
      /aria-label="200원" data-client-fixed-report-cell="linked_refund_amount" data-raw-value="200">200원<\/td>/,
    );
    assert.match(
      selected,
      /aria-label="500원" data-client-fixed-report-cell="net_deposit_revenue" data-raw-value="500">500원<\/td>/,
    );
    assert.match(
      selected,
      /aria-label="1" data-client-fixed-report-cell="rank" data-raw-value="1"><strong>1<\/strong><\/td>/,
    );
    assert.match(
      selected,
      /aria-label="2026-07-20" data-client-fixed-report-cell="latest_deposit_date" data-raw-value="2026-07-20">2026-07-20<\/td>/,
    );

    const monthly = renderToStaticMarkup(React.createElement(
      ClientFixedReportsPanel,
      {
        result: fixedScreen("monthly_deposit_revenue"),
        selectedReportId: "monthly_deposit_revenue",
      },
    ));
    assert.match(
      monthly,
      /aria-label="2025-08" data-client-fixed-report-cell="month" data-raw-value="2025-08"><strong>2025-08<\/strong><\/td>/,
    );
    assert.match(
      monthly,
      /aria-label="1,000원" data-client-fixed-report-cell="net_deposit_revenue" data-raw-value="1000">1,000원<\/td>/,
    );

    const inquiry = renderToStaticMarkup(React.createElement(
      ClientFixedReportsPanel,
      {
        result: fixedScreen("inquiry_status"),
        selectedReportId: "inquiry_status",
      },
    ));
    assert.match(
      inquiry,
      /aria-label="1" data-client-fixed-report-cell="count" data-raw-value="1">1<\/td>/,
    );

    const millionsScreen = structuredClone(fixedScreen("receivables_ranking"));
    millionsScreen.item.rows[0].agreed_amount = 20_000_000;
    millionsScreen.item.rows[0].active_allocated_amount = 2_000_000;
    millionsScreen.item.rows[0].receivable_amount = 18_000_000;
    const millions = renderToStaticMarkup(React.createElement(
      ClientFixedReportsPanel,
      {
        result: millionsScreen,
        selectedReportId: "receivables_ranking",
      },
    ));
    assert.match(
      millions,
      /aria-label="18,000,000원" data-client-fixed-report-cell="receivable_amount" data-raw-value="18000000">18,000,000원<\/td>/,
    );
    assert.doesNotMatch(
      selected,
      /<button class="primary-button" type="button" disabled=""/,
    );

    const denied = renderToStaticMarkup(React.createElement(
      ClientFixedReportsPanel,
      {
        result: { kind: "guarded", uiState: "denied" },
        selectedReportId: "revenue_ranking",
        actions: {
          exportAllowed: true,
          onExportCsv() {
            throw new Error("disabled export must not run");
          },
        },
      },
    ));
    assert.match(denied, /리포트 조회 권한이 없습니다/);
    assert.match(
      denied,
      /<button class="primary-button" type="button" disabled="">CSV 내보내기<\/button>/,
    );
  });
});

function availablePort() {
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

async function startBrowserFixture() {
  const fixtures = Object.fromEntries(
    Object.keys(columns).map((reportId) => [reportId, fixedScreen(reportId)]),
  );
  const fixtureJson = JSON.stringify(fixtures).replace(/</g, "\\u003c");
  const entryPath = "/__client_fixed_reports_panel_entry__.jsx";
  const resolvedEntryId = "\0client-fixed-reports-panel-entry";
  const pagePlugin = {
    name: "client-fixed-reports-panel-test-page",
    resolveId(id) {
      return id === entryPath ? resolvedEntryId : null;
    },
    load(id) {
      if (id !== resolvedEntryId) {
        return null;
      }
      return `
import React from "react";
import { createRoot } from "react-dom/client";
import "/src/styles.css";
import { ClientFixedReportsPanel } from "/src/components/ClientFixedReportsPanel.jsx";
const fixtures = window.__fixtures;
window.__calls = { select: [], exports: [], prints: [], retries: [] };
window.__nextExportResult = { outcome: "created", audit_event: { event_id: "audit-1" } };
window.__deferExport = false;
function Harness() {
  const [result, setResult] = React.useState(fixtures.revenue_ranking);
  window.__setResult = setResult;
  const actions = {
    onSelectReport(reportId) {
      window.__calls.select.push(reportId);
      setResult(fixtures[reportId]);
    },
    onExportCsv(...args) {
      window.__calls.exports.push({ args });
      if (window.__deferExport) {
        return new Promise((resolve) => { window.__resolveExport = resolve; });
      }
      return Promise.resolve(window.__nextExportResult);
    },
    onPrint(report) {
      window.__calls.prints.push({
        reportId: report.id,
        rows: report.screenRows,
        sameRows: report.screenRows === report.rows,
      });
    },
    onRetry(reportId) {
      window.__calls.retries.push(reportId);
    },
  };
  return React.createElement(ClientFixedReportsPanel, { result, actions });
}
createRoot(document.getElementById("root")).render(React.createElement(Harness));
`;
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://fixture.test").pathname;
        if (pathname !== "/__client_fixed_reports_panel__") {
          next();
          return;
        }
        response.statusCode = 200;
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.end(`<!doctype html>
<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>고정 리포트 패널</title></head>
<body><main style="width:min(1120px,100%);margin:0 auto;padding:16px"><div id="root"></div></main>
<script>window.__fixtures = ${fixtureJson};</script>
<script type="module" src="${entryPath}"></script></body></html>`);
      });
    },
  };
  const port = await availablePort();
  const server = await createServer({
    configFile: false,
    root: webRoot,
    appType: "custom",
    logLevel: "error",
    plugins: [pagePlugin],
    server: {
      host: "127.0.0.1",
      port,
      strictPort: true,
      hmr: false,
    },
  });
  await server.listen();
  return {
    server,
    url: `http://127.0.0.1:${port}/__client_fixed_reports_panel__`,
  };
}

async function probeMobileTable(page, rowIndex) {
  return page.evaluate((targetRowIndex) => {
    const wrap = document.querySelector(".data-table-wrap");
    const lastHeader = wrap?.querySelector("thead th:last-child");
    const lastCell = wrap
      ?.querySelectorAll("tbody tr")
      [targetRowIndex]?.querySelector("td:last-child");
    if (!wrap || !lastHeader || !lastCell) return null;
    const initialScrollLeft = wrap.scrollLeft;
    const maxScrollLeft = wrap.scrollWidth - wrap.clientWidth;
    wrap.scrollLeft = maxScrollLeft;
    const wrapRect = wrap.getBoundingClientRect();
    const lastHeaderRect = lastHeader.getBoundingClientRect();
    const lastCellRect = lastCell.getBoundingClientRect();
    return {
      clientWidth: wrap.clientWidth,
      scrollWidth: wrap.scrollWidth,
      overflowX: getComputedStyle(wrap).overflowX,
      initialScrollLeft,
      maxScrollLeft,
      scrollLeft: wrap.scrollLeft,
      scrollMoved: wrap.scrollLeft > initialScrollLeft,
      atScrollEnd: Math.abs(wrap.scrollLeft - maxScrollLeft) <= 1,
      lastHeaderText: lastHeader.textContent?.trim() ?? "",
      lastHeaderContentFits:
        lastHeader.scrollWidth <= lastHeader.clientWidth,
      lastValueText: lastCell.textContent?.trim() ?? "",
      lastValueRaw: lastCell.dataset.rawValue ?? "",
      lastValueAria: lastCell.getAttribute("aria-label"),
      lastValueContentFits: lastCell.scrollWidth <= lastCell.clientWidth,
      lastColumnVisible:
        lastHeaderRect.left >= wrapRect.left - 1
        && lastHeaderRect.right <= wrapRect.right + 1
        && lastCellRect.left >= wrapRect.left - 1
        && lastCellRect.right <= wrapRect.right + 1,
    };
  }, rowIndex);
}

test("browser interaction keeps exact export descriptors, print rows, replay/stale safety, keyboard focus, and 390px containment", { timeout: 60_000 }, async () => {
  const fixture = await startBrowserFixture();
  const browser = await chromium.launch({ headless: true });
  const evidenceDir = process.env.CLIENT_FIXED_REPORTS_EVIDENCE_DIR
    ? resolve(process.env.CLIENT_FIXED_REPORTS_EVIDENCE_DIR)
    : null;
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        pageErrors.push(message.text());
      }
    });
    await page.goto(fixture.url, { waitUntil: "networkidle" });

    const panel = page.locator("[data-client-fixed-reports-panel='true']");
    await panel.waitFor({ timeout: 10_000 }).catch(async (error) => {
      assert.fail(`${error.message}\nBrowser errors: ${pageErrors.join(" | ")}`);
    });
    assert.equal(await panel.getAttribute("data-client-fixed-reports-selection"), "none");
    assert.equal(await page.getByRole("tab", { selected: true }).count(), 0);
    assert.equal(await page.getByRole("tabpanel").count(), 0);

    const tabs = page.getByRole("tab");
    await tabs.first().focus();
    await page.keyboard.press("End");
    assert.equal(
      await page.evaluate(() => document.activeElement?.textContent?.trim()),
      "미수금 상위 고객",
    );
    assert.equal(await page.getByRole("tab", { selected: true }).count(), 0);
    await page.keyboard.press("Enter");
    await page.getByRole("tabpanel").waitFor();
    assert.equal(
      await page.getByRole("tab", { selected: true }).textContent(),
      "미수금 상위 고객",
    );

    const visibleRows = await page.locator("tbody tr").evaluateAll((tableRows) => (
      tableRows.map((row) => (
        [...row.querySelectorAll("td")].map((cell) => cell.dataset.rawValue ?? "")
      ))
    ));
    assert.deepEqual(
      visibleRows,
      rows.receivables_ranking.map((row) => (
        columns.receivables_ranking.map(({ key }) => (
          row[key] === null ? "" : String(row[key])
        ))
      )),
    );
    const displayedRows = await page.locator("tbody tr").evaluateAll((tableRows) => (
      tableRows.map((row) => (
        [...row.querySelectorAll("td")].map((cell) => cell.textContent?.trim() ?? "")
      ))
    ));
    assert.deepEqual(displayedRows, [
      ["1", "미수 고객", "300원", "200원", "100원", ""],
      ["2", "선순위 고객", "100원", "100원", "0원", "2026-08-10"],
    ]);

    await page.getByRole("button", { name: "CSV 내보내기" }).click();
    await page.locator("[data-client-fixed-report-export-state='success']").waitFor();
    const firstExport = await page.evaluate(() => window.__calls.exports[0]);
    assert.equal(firstExport.args.length, 1);
    assert.deepEqual(firstExport.args[0], {
      reportId: "receivables_ranking",
      contractVersion: "client-fixed-reports.v1",
      snapshotToken: "lawos_client_fixed_report_v1.receivables_ranking-opaque",
      snapshotVersion: 1,
    });
    assert.match(
      await page.locator("[data-client-fixed-report-export-state='success']").textContent(),
      /서버 감사 기록도 확인했습니다/,
    );

    await page.evaluate(() => {
      window.__nextExportResult = {
        outcome: "idempotent_replay",
        idempotent_replay: true,
        audit_event: { event_id: "audit-replay" },
      };
    });
    await page.getByRole("button", { name: "CSV 내보내기" }).click();
    await page.locator("[data-client-fixed-report-export-state='replay']").waitFor();
    const replayExports = await page.evaluate(() => window.__calls.exports);
    assert.equal(replayExports.length, 2);
    assert.deepEqual(replayExports[0].args[0], replayExports[1].args[0]);

    await page.getByRole("button", { name: "인쇄" }).click();
    const printCall = await page.evaluate(() => window.__calls.prints[0]);
    assert.equal(printCall.reportId, "receivables_ranking");
    assert.equal(printCall.sameRows, true);
    assert.deepEqual(printCall.rows, rows.receivables_ranking);

    await page.evaluate(() => {
      window.__nextExportResult = {
        kind: "error",
        safe_error_codes: ["CLIENT_FIXED_REPORT_SNAPSHOT_EXPIRED"],
        audit_recorded: true,
      };
    });
    await page.getByRole("button", { name: "CSV 내보내기" }).click();
    await page.locator("[data-client-fixed-report-export-state='stale']").waitFor();
    assert.match(
      await page.locator("[data-client-fixed-report-export-state='stale']").textContent(),
      /리포트를 다시 불러와 주세요/,
    );

    const exportCountBeforeDenied = await page.evaluate(() => window.__calls.exports.length);
    await page.evaluate(() => {
      window.__setResult({ kind: "guarded", uiState: "denied" });
    });
    await page.locator("[data-client-fixed-report-state='denied']").waitFor();
    assert.equal(
      await page.getByRole("button", { name: "CSV 내보내기" }).isDisabled(),
      true,
    );
    assert.equal(
      await page.evaluate(() => window.__calls.exports.length),
      exportCountBeforeDenied,
    );

    await page.getByRole("tab", { name: "입금 매출 상위 고객" }).click();
    await page.locator("[data-client-fixed-report='revenue_ranking'][data-client-fixed-report-state='data']").waitFor();
    await page.evaluate(() => {
      window.__deferExport = true;
      window.__nextExportResult = {
        outcome: "created",
        audit_event: { event_id: "late-audit" },
      };
    });
    await page.getByRole("button", { name: "CSV 내보내기" }).click();
    await page.getByRole("tab", { name: "월별 입금 매출" }).click();
    await page.evaluate(() => {
      window.__deferExport = false;
      window.__resolveExport(window.__nextExportResult);
    });
    await page.waitForTimeout(50);
    assert.equal(
      await page.locator("[data-client-fixed-report-export-state='success']").count(),
      0,
    );
    assert.equal(
      await panel.getAttribute("data-client-fixed-reports-selection"),
      "monthly_deposit_revenue",
    );

    const desktopOverflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    assert.equal(desktopOverflow.scrollWidth <= desktopOverflow.clientWidth + 1, true);

    if (evidenceDir) {
      await mkdir(evidenceDir, { recursive: true });
      await page.screenshot({
        path: resolve(evidenceDir, "client-fixed-reports-1440.png"),
        fullPage: true,
      });
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("tab", { name: "입금 매출 상위 고객" }).click();
    await page.locator("[data-client-fixed-report='revenue_ranking'][data-client-fixed-report-state='data']").waitFor();
    const revenueMobileTable = await probeMobileTable(page, 0);
    assert.ok(revenueMobileTable);
    assert.equal(revenueMobileTable.initialScrollLeft, 0);
    assert.equal(
      revenueMobileTable.scrollWidth > revenueMobileTable.clientWidth,
      true,
    );
    assert.equal(revenueMobileTable.overflowX, "auto");
    assert.equal(revenueMobileTable.scrollMoved, true);
    assert.equal(revenueMobileTable.atScrollEnd, true);
    assert.equal(revenueMobileTable.lastHeaderText, "최근 입금일");
    assert.equal(revenueMobileTable.lastHeaderContentFits, true);
    assert.equal(revenueMobileTable.lastValueText, "2026-07-20");
    assert.equal(revenueMobileTable.lastValueRaw, "2026-07-20");
    assert.equal(revenueMobileTable.lastValueAria, "2026-07-20");
    assert.equal(revenueMobileTable.lastValueContentFits, true);
    assert.equal(revenueMobileTable.lastColumnVisible, true);

    await page.getByRole("tab", { name: "미수금 상위 고객" }).click();
    await page.locator("[data-client-fixed-report='receivables_ranking'][data-client-fixed-report-state='data']").waitFor();
    const receivablesMobileTable = await probeMobileTable(page, 1);
    assert.ok(receivablesMobileTable);
    assert.equal(receivablesMobileTable.initialScrollLeft, 0);
    assert.equal(
      receivablesMobileTable.scrollWidth > receivablesMobileTable.clientWidth,
      true,
    );
    assert.equal(receivablesMobileTable.overflowX, "auto");
    assert.equal(receivablesMobileTable.scrollMoved, true);
    assert.equal(receivablesMobileTable.atScrollEnd, true);
    assert.equal(receivablesMobileTable.lastHeaderText, "가장 이른 지급기한");
    assert.equal(receivablesMobileTable.lastHeaderContentFits, true);
    assert.equal(receivablesMobileTable.lastValueText, "2026-08-10");
    assert.equal(receivablesMobileTable.lastValueRaw, "2026-08-10");
    assert.equal(receivablesMobileTable.lastValueAria, "2026-08-10");
    assert.equal(receivablesMobileTable.lastValueContentFits, true);
    assert.equal(receivablesMobileTable.lastColumnVisible, true);

    const mobileObservable = await page.evaluate(() => {
      const tabRects = [...document.querySelectorAll("[role='tab']")]
        .map((tab) => tab.getBoundingClientRect());
      return {
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        tabRows: new Set(tabRects.map(({ top }) => Math.round(top))).size,
        selectedTabs:
          document.querySelectorAll("[role='tab'][aria-selected='true']").length,
        tabpanelLabelled:
          Boolean(document.querySelector("[role='tabpanel'][aria-labelledby]")),
      };
    });
    assert.equal(
      mobileObservable.scrollWidth <= mobileObservable.clientWidth + 1,
      true,
    );
    assert.equal(mobileObservable.tabRows, 2);
    assert.equal(mobileObservable.selectedTabs, 1);
    assert.equal(mobileObservable.tabpanelLabelled, true);

    if (evidenceDir) {
      await page.screenshot({
        path: resolve(evidenceDir, "client-fixed-reports-390.png"),
        fullPage: true,
      });
      await writeFile(
        resolve(evidenceDir, "browser-observables.json"),
        `${JSON.stringify({
          scenario: "client-fixed-reports-panel-browser",
          firstExport,
          visibleRows,
          displayedRows,
          printCall,
          desktopOverflow,
          mobileObservable,
          revenueMobileTable,
          receivablesMobileTable,
          replayRequestEqual: true,
          deniedExportCallCountUnchanged: true,
          lateExportIgnoredAfterSelectionChange: true,
        }, null, 2)}\n`,
        "utf8",
      );
    }
  } finally {
    await browser.close();
    await fixture.server.close();
  }
});
