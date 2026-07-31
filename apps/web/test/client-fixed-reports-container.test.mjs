import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import {
  dirname,
  join,
  resolve,
} from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const containerPath = resolve(
  webRoot,
  "src/components/ClientFixedReportsContainer.jsx",
);
const evidenceDir = process.env.CLIENT_FIXED_REPORTS_CONTAINER_EVIDENCE_DIR
  ? resolve(process.env.CLIENT_FIXED_REPORTS_CONTAINER_EVIDENCE_DIR)
  : resolve(webRoot, "../../.omo/evidence/client-fixed-reports-container");

const reportIds = [
  "monthly_deposit_revenue",
  "inquiry_status",
  "revenue_ranking",
  "receivables_ranking",
];

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
      month: `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1,
      ).padStart(2, "0")}`,
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

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/u.test(text)
    ? `"${text.replaceAll("\"", "\"\"")}"`
    : text;
}

function csvText(reportId) {
  return [
    columns[reportId].map(({ label }) => csvCell(label)).join(","),
    ...rows[reportId].map((row) => (
      columns[reportId].map(({ key }) => csvCell(row[key])).join(",")
    )),
  ].join("\n");
}

function fixedScreen(reportId, {
  state = "data",
  screenRows = rows[reportId],
} = {}) {
  const snapshot = {
    token: `lawos_client_fixed_report_v1.${reportId}-opaque`,
    version: 1,
    expires_at: "2026-07-31T01:10:00.000Z",
  };
  return {
    kind: "data",
    status: 200,
    outcome: state === "empty" ? "empty" : state === "data" ? "passed" : state,
    uiState: state === "data" ? null : state,
    countLeakPrevented: true,
    exportSnapshot: snapshot,
    item: {
      report_id: reportId,
      columns: columns[reportId],
      rows: screenRows,
      row_count: screenRows.length,
      source_status: state === "empty" ? "no_data" : state === "partial" ? "partial" : "available",
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

function safeExport(reportId) {
  const text = csvText(reportId);
  return {
    kind: "data",
    status: 201,
    outcome: "created",
    idempotent_replay: false,
    safe_error_codes: [],
    count_leak_prevented: true,
    raw_sql_included: false,
    raw_query_payload_included: false,
    source_payload_included: false,
    production_ready_claim: false,
    audit_event: {
      event_id: `audit-${reportId}`,
      action: "report.client_fixed.csv.export",
      decision: "allow",
      tenant_authority: "signed_session",
      actor_id_included: false,
      tenant_id_included: false,
      raw_rows_included: false,
      source_values_included: false,
      production_ready_claim: false,
    },
    item: {
      report_id: reportId,
      columns: columns[reportId],
      rows: rows[reportId],
      row_count: rows[reportId].length,
      source_status: "available",
      snapshot_version: 1,
      csv_text: text,
      csv_sha256: createHash("sha256").update(text).digest("hex"),
      csv_byte_size: Buffer.byteLength(text, "utf8"),
      mime_type: "text/csv; charset=utf-8",
      permission_prefilter_applied: true,
      count_leak_prevented: true,
      formula_injection_escaped: true,
      raw_bank_source_included: false,
      raw_source_payload_included: false,
      contact_pii_included: false,
      internal_ids_included: false,
      production_ready_claim: false,
    },
  };
}

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

function harnessEntry(fixtures, exports) {
  const fixtureJson = JSON.stringify(fixtures).replaceAll("<", "\\u003c");
  const exportJson = JSON.stringify(exports).replaceAll("<", "\\u003c");
  return `
import React from "react";
import { createRoot } from "react-dom/client";
import "/src/styles.css";
import { ClientFixedReportsContainer } from "/src/components/ClientFixedReportsContainer.jsx";

const fixtures = ${fixtureJson};
const exports = ${exportJson};
window.__calls = { reads: [], exports: [], prints: [] };
window.__downloadSideEffects = { objectUrls: 0, anchorClicks: 0 };
const originalCreateObjectURL = URL.createObjectURL.bind(URL);
URL.createObjectURL = (value) => {
  window.__downloadSideEffects.objectUrls += 1;
  return originalCreateObjectURL(value);
};
const originalAnchorClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function click() {
  if (this.download?.startsWith("client-")) {
    window.__downloadSideEffects.anchorClicks += 1;
  }
  return originalAnchorClick.call(this);
};
window.__modes = {
  monthly_deposit_revenue: "deferred",
  inquiry_status: "empty",
  revenue_ranking: "data",
  receivables_ranking: "review_required",
};
window.__exportMode = "safe";
window.__readResolvers = {};
window.__exportResolvers = [];
window.__setReadMode = (reportId, mode) => { window.__modes[reportId] = mode; };
window.__setExportMode = (mode) => { window.__exportMode = mode; };
window.__resolveRead = (reportId) => {
  const resolveRead = window.__readResolvers[reportId];
  if (!resolveRead) throw new Error("missing deferred read");
  delete window.__readResolvers[reportId];
  resolveRead(fixtures[reportId]);
};
window.__resolveOldestExport = () => {
  const pending = window.__exportResolvers.shift();
  if (!pending) throw new Error("missing deferred export");
  pending.resolve(exports[pending.input.reportId]);
};

function readReport(input) {
  window.__calls.reads.push(input);
  const mode = window.__modes[input.reportId];
  if (mode === "deferred") {
    return new Promise((resolveRead) => {
      window.__readResolvers[input.reportId] = resolveRead;
    });
  }
  if (mode === "empty") {
    return Promise.resolve({
      ...fixtures[input.reportId],
      outcome: "empty",
      uiState: "empty",
      item: {
        ...fixtures[input.reportId].item,
        rows: [],
        row_count: 0,
        source_status: "no_data",
      },
    });
  }
  if (mode === "partial") {
    return Promise.resolve({
      ...fixtures[input.reportId],
      outcome: "partial",
      uiState: "partial",
      item: {
        ...fixtures[input.reportId].item,
        source_status: "partial",
      },
    });
  }
  if (mode === "review_required" || mode === "denied") {
    return Promise.resolve({
      kind: "guarded",
      status: mode === "denied" ? 403 : 200,
      outcome: mode,
      uiState: mode,
    });
  }
  if (mode === "error") {
    return Promise.resolve({ kind: "error", status: 503, uiState: "error" });
  }
  return Promise.resolve(fixtures[input.reportId]);
}

function exportReport(input) {
  window.__calls.exports.push(input);
  if (window.__exportMode === "deferred") {
    return new Promise((resolveExport) => {
      window.__exportResolvers.push({ input, resolve: resolveExport });
    });
  }
  if (window.__exportMode === "reject") {
    return Promise.reject(new Error("transport failed"));
  }
  if (window.__exportMode === "conflict") {
    return Promise.resolve({
      kind: "error",
      status: 409,
      outcome: "error",
      uiState: "error",
      safe_error_codes: ["CLIENT_FIXED_REPORT_IDEMPOTENCY_CONFLICT"],
    });
  }
  if (window.__exportMode === "denied") {
    return Promise.resolve({
      kind: "guarded",
      status: 403,
      outcome: "denied",
      ui_state: "denied",
      safe_error_codes: ["CLIENT_FIXED_REPORT_EXPORT_DENIED"],
    });
  }
  if (window.__exportMode === "unsafe") {
    return Promise.resolve({
      ...exports[input.reportId],
      item: {
        ...exports[input.reportId].item,
        formula_injection_escaped: false,
      },
    });
  }
  if (window.__exportMode === "replay") {
    return Promise.resolve({
      ...exports[input.reportId],
      status: 200,
      outcome: "idempotent_replay",
      idempotent_replay: true,
      audit_event: {
        ...exports[input.reportId].audit_event,
        event_id: "audit-replay",
        action: "report.client_fixed.csv.replay",
        decision: "replay",
      },
    });
  }
  return Promise.resolve(exports[input.reportId]);
}

function printReport(report) {
  window.__calls.prints.push({
    id: report.id,
    rows: report.screenRows,
    sameRows: report.rows === report.screenRows,
  });
}

function Harness() {
  const [ctx, setCtx] = React.useState("allow");
  window.__setCtx = setCtx;
  return React.createElement(ClientFixedReportsContainer, {
    ctx,
    readReport,
    exportReport,
    printReport,
  });
}

createRoot(document.getElementById("root")).render(
  React.createElement(Harness),
);
`;
}

async function startFixture() {
  const fixtures = Object.fromEntries(
    reportIds.map((reportId) => [reportId, fixedScreen(reportId)]),
  );
  const exports = Object.fromEntries(
    reportIds.map((reportId) => [reportId, safeExport(reportId)]),
  );
  const entryPath = "/__client_fixed_reports_container_entry__.jsx";
  const entryId = "\0client-fixed-reports-container-entry";
  const port = await availablePort();
  const server = await createServer({
    configFile: false,
    root: webRoot,
    cacheDir: resolve(
      webRoot,
      "node_modules/.vite-client-fixed-reports-container-test",
    ),
    appType: "custom",
    logLevel: "error",
    optimizeDeps: {
      noDiscovery: true,
      include: ["react", "react-dom/client"],
    },
    plugins: [{
      name: "client-fixed-reports-container-test",
      resolveId(id) {
        return id === entryPath ? entryId : null;
      },
      load(id) {
        return id === entryId ? harnessEntry(fixtures, exports) : null;
      },
      configureServer(vite) {
        vite.middlewares.use((request, response, next) => {
          const pathname = new URL(
            request.url ?? "/",
            "http://fixture.test",
          ).pathname;
          if (pathname !== "/__client_fixed_reports_container__") {
            next();
            return;
          }
          response.statusCode = 200;
          response.setHeader("content-type", "text/html; charset=utf-8");
          response.end(`<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>고정 리포트 컨테이너</title>
  </head>
  <body>
    <main style="width:min(1120px,100%);margin:0 auto;padding:16px">
      <div id="root"></div>
    </main>
    <script type="module" src="${entryPath}"></script>
  </body>
</html>`);
        });
      },
    }],
    server: {
      host: "127.0.0.1",
      port,
      strictPort: true,
      hmr: false,
    },
  });
  await server.listen();
  return {
    fixtures,
    exports,
    server,
    url: `http://127.0.0.1:${port}/__client_fixed_reports_container__`,
  };
}

test("CL-P5-W03-T03 container stays on the four fixed callbacks without a generic builder", async () => {
  const source = await readFile(containerPath, "utf8");
  for (const reportId of reportIds) assert.match(source, new RegExp(reportId));
  assert.doesNotMatch(source, /ReportBuilder|report-builder|apiClient/u);
  assert.match(source, /readReport\(\{ reportId, ctx \}\)/u);
  assert.match(source, /request\.snapshotVersion/u);
  assert.match(source, /idempotencyKey/u);
});

test("CL-P5-W03-T03 stale export completion cannot create a Blob URL, click a download, or emit a file after tab or ctx changes", { timeout: 60_000 }, async (t) => {
  await mkdir(evidenceDir, { recursive: true });
  const fixture = await startFixture();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  let downloadCount = 0;
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  page.on("download", () => {
    downloadCount += 1;
  });
  t.after(async () => {
    await page.close();
    await context.close();
    await browser.close();
    await fixture.server.close();
  });

  await page.goto(fixture.url, { waitUntil: "networkidle" });
  await page.locator("[data-client-fixed-reports-container='true']").waitFor();
  await page.evaluate(() => window.__resolveRead("monthly_deposit_revenue"));
  await page.locator("[data-client-fixed-report-state='data']").waitFor();
  const initialSideEffects = await page.evaluate(
    () => window.__downloadSideEffects,
  );
  assert.deepEqual(initialSideEffects, { objectUrls: 0, anchorClicks: 0 });

  await page.evaluate(() => window.__setExportMode("deferred"));
  await page.getByRole("button", { name: "CSV 내보내기" }).click();
  await page.waitForFunction(() => window.__exportResolvers.length === 1);
  await page.getByRole("tab", { name: "입금 매출 상위 고객" }).click();
  await page.locator(
    "[data-client-fixed-report='revenue_ranking'][data-client-fixed-report-state='data']",
  ).waitFor();
  await page.evaluate(() => window.__resolveOldestExport());
  await page.waitForTimeout(60);
  const afterTabChange = await page.evaluate(
    () => window.__downloadSideEffects,
  );
  assert.deepEqual(afterTabChange, initialSideEffects);
  assert.equal(downloadCount, 0);

  await page.getByRole("button", { name: "CSV 내보내기" }).click();
  await page.waitForFunction(() => window.__exportResolvers.length === 1);
  await page.evaluate(() => window.__setCtx("review"));
  await page.waitForFunction(() => (
    window.__calls.reads.at(-1)?.ctx === "review"
  ));
  await page.locator(
    "[data-client-fixed-report='revenue_ranking'][data-client-fixed-report-state='data']",
  ).waitFor();
  await page.evaluate(() => window.__resolveOldestExport());
  await page.waitForTimeout(60);
  const afterCtxChange = await page.evaluate(
    () => window.__downloadSideEffects,
  );
  assert.deepEqual(afterCtxChange, initialSideEffects);
  assert.equal(downloadCount, 0);

  await page.evaluate(() => window.__setExportMode("safe"));
  const [currentDownload] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "CSV 내보내기" }).click(),
  ]);
  const currentCsvPath = join(
    evidenceDir,
    "client-current-after-stale-export.csv",
  );
  await currentDownload.saveAs(currentCsvPath);
  await page.locator(
    "[data-client-fixed-report-export-state='success']",
  ).waitFor();
  assert.equal(
    await readFile(currentCsvPath, "utf8"),
    csvText("revenue_ranking"),
  );
  assert.equal(downloadCount, 1);
  const afterCurrentSuccess = await page.evaluate(
    () => window.__downloadSideEffects,
  );
  assert.deepEqual(afterCurrentSuccess, {
    objectUrls: 1,
    anchorClicks: 1,
  });

  await page.evaluate(() => window.__setExportMode("replay"));
  const replayDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV 내보내기" }).click();
  await replayDownload;
  await page.locator(
    "[data-client-fixed-report-export-state='replay']",
  ).waitFor();
  assert.equal(downloadCount, 2);
  const afterReplay = await page.evaluate(
    () => window.__downloadSideEffects,
  );
  assert.deepEqual(afterReplay, {
    objectUrls: 2,
    anchorClicks: 2,
  });

  const exportCalls = await page.evaluate(() => window.__calls.exports);
  assert.equal(exportCalls.length, 4);
  assert.deepEqual(
    exportCalls.map(({ reportId, ctx }) => ({ reportId, ctx })),
    [
      { reportId: "monthly_deposit_revenue", ctx: "allow" },
      { reportId: "revenue_ranking", ctx: "allow" },
      { reportId: "revenue_ranking", ctx: "review" },
      { reportId: "revenue_ranking", ctx: "review" },
    ],
  );
  assert.equal(
    exportCalls[2].idempotencyKey,
    exportCalls[3].idempotencyKey,
  );
  assert.deepEqual(pageErrors, []);

  await writeFile(
    join(evidenceDir, "late-export-side-effects.json"),
    `${JSON.stringify({
      scenario: "CL-P5-W03-T03-late-export-side-effects",
      afterTabChange: {
        downloads: 0,
        ...afterTabChange,
      },
      afterCtxChange: {
        downloads: 0,
        ...afterCtxChange,
      },
      exactCurrentSuccess: {
        downloads: 1,
        ...afterCurrentSuccess,
      },
      replay: {
        downloads: 2,
        ...afterReplay,
        idempotencyKeyReused:
          exportCalls[2].idempotencyKey
          === exportCalls[3].idempotencyKey,
      },
      currentCsvSha256: createHash("sha256")
        .update(await readFile(currentCsvPath))
        .digest("hex"),
      pageErrors,
    }, null, 2)}\n`,
    "utf8",
  );
});

test("CL-P5-W03-T03 fixed report container suppresses late reads, validates downloads, preserves retries, prints the visible report, and fits 1440/820/390", { timeout: 60_000 }, async (t) => {
  await mkdir(evidenceDir, { recursive: true });
  const fixture = await startFixture();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const pageErrors = [];
  let downloadCount = 0;
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") pageErrors.push(message.text());
  });
  page.on("download", () => {
    downloadCount += 1;
  });
  t.after(async () => {
    await page.close();
    await context.close();
    await browser.close();
    await fixture.server.close();
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(fixture.url, { waitUntil: "networkidle" });
  const container = page.locator("[data-client-fixed-reports-container='true']");
  await container.waitFor().catch((error) => {
    assert.fail(`${error.message}\nBrowser errors: ${pageErrors.join(" | ")}`);
  });
  assert.equal(
    await container.getAttribute("data-client-fixed-reports-active"),
    "monthly_deposit_revenue",
  );
  assert.equal(await page.getByRole("tab", { selected: true }).count(), 1);
  assert.equal(
    await page.getByRole("tab", { selected: true }).textContent(),
    "월별 입금 매출",
  );
  await page.locator("[data-client-fixed-report-state='loading']").waitFor();
  assert.deepEqual(await page.evaluate(() => window.__calls.reads), [{
    reportId: "monthly_deposit_revenue",
    ctx: "allow",
  }]);
  await page.evaluate(() => window.__resolveRead("monthly_deposit_revenue"));
  await page.locator("[data-client-fixed-report-state='data']").waitFor();

  const tabs = page.getByRole("tab");
  await tabs.first().focus();
  await page.keyboard.press("End");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "미수금 상위 고객",
  );
  assert.equal(
    await page.getByRole("tab", { selected: true }).textContent(),
    "월별 입금 매출",
  );
  await page.keyboard.press("Enter");
  await page.locator(
    "[data-client-fixed-report-state='review_required']",
  ).waitFor();
  assert.equal(await page.getByRole("tab", { selected: true }).count(), 1);

  await page.evaluate(() => {
    window.__setReadMode("receivables_ranking", "error");
  });
  await page.getByRole("button", { name: "다시 불러오기" }).click();
  await page.locator("[data-client-fixed-report-state='error']").waitFor();
  await page.evaluate(() => {
    window.__setReadMode("receivables_ranking", "denied");
  });
  await page.getByRole("button", { name: "다시 불러오기" }).click();
  await page.locator("[data-client-fixed-report-state='denied']").waitFor();

  await page.evaluate(() => {
    window.__setReadMode("revenue_ranking", "deferred");
  });
  await page.getByRole("tab", { name: "입금 매출 상위 고객" }).click();
  await page.locator("[data-client-fixed-report-state='loading']").waitFor();
  await page.getByRole("tab", { name: "문의 현황" }).click();
  await page.locator("[data-client-fixed-report-state='empty']").waitFor();
  await page.evaluate(() => window.__resolveRead("revenue_ranking"));
  await page.waitForTimeout(60);
  assert.equal(
    await container.getAttribute("data-client-fixed-reports-active"),
    "inquiry_status",
  );
  assert.equal(
    await page.locator("[data-client-fixed-report-state='empty']").count(),
    1,
    "late revenue response must not replace the newer empty inquiry report",
  );

  await page.evaluate(() => {
    window.__setReadMode("revenue_ranking", "partial");
  });
  await page.getByRole("tab", { name: "입금 매출 상위 고객" }).click();
  await page.locator("[data-client-fixed-report-state='partial']").waitFor();
  assert.equal(await page.locator("tbody tr").count(), rows.revenue_ranking.length);

  await page.evaluate(() => {
    window.__setReadMode("monthly_deposit_revenue", "data");
  });
  await page.getByRole("tab", { name: "월별 입금 매출" }).click();
  await page.locator("[data-client-fixed-report-state='data']").waitFor();
  await page.getByRole("button", { name: "인쇄" }).click();
  const printCall = await page.evaluate(() => window.__calls.prints[0]);
  assert.deepEqual(printCall, {
    id: "monthly_deposit_revenue",
    rows: rows.monthly_deposit_revenue,
    sameRows: true,
  });

  await page.evaluate(() => window.__setExportMode("reject"));
  await page.getByRole("button", { name: "CSV 내보내기" }).click();
  await page.locator(
    "[data-client-fixed-report-export-state='error']",
  ).waitFor();
  await page.evaluate(() => window.__setExportMode("safe"));
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "CSV 내보내기" }).click(),
  ]);
  await page.locator(
    "[data-client-fixed-report-export-state='success']",
  ).waitFor();
  const csvPath = join(evidenceDir, "client-monthly-deposit-revenue.csv");
  await download.saveAs(csvPath);
  assert.equal(download.suggestedFilename(), "client-monthly_deposit_revenue.csv");
  assert.equal(await readFile(csvPath, "utf8"), csvText("monthly_deposit_revenue"));

  const exportCalls = await page.evaluate(() => window.__calls.exports);
  assert.equal(exportCalls.length, 2);
  assert.equal(exportCalls[0].idempotencyKey, exportCalls[1].idempotencyKey);
  assert.deepEqual(exportCalls[1], {
    reportId: "monthly_deposit_revenue",
    contractVersion: "client-fixed-reports.v1",
    snapshotToken:
      "lawos_client_fixed_report_v1.monthly_deposit_revenue-opaque",
    snapshotVersion: 1,
    ctx: "allow",
    idempotencyKey: exportCalls[1].idempotencyKey,
  });
  assert.equal(Object.hasOwn(exportCalls[1], "rows"), false);
  assert.equal(Object.hasOwn(exportCalls[1], "columns"), false);

  for (const [mode, feedback] of [
    ["conflict", "error"],
    ["denied", "denied"],
    ["unsafe", "error"],
  ]) {
    const before = downloadCount;
    await page.evaluate((nextMode) => window.__setExportMode(nextMode), mode);
    await page.getByRole("button", { name: "CSV 내보내기" }).click();
    await page.waitForFunction(({ expected, count }) => (
      window.__calls.exports.length === count
      && document.querySelector(
        `[data-client-fixed-report-export-state="${expected}"]`,
      )
    ), { expected: feedback, count: exportCalls.length + (
      mode === "conflict" ? 1 : mode === "denied" ? 2 : 3
    ) });
    await page.waitForTimeout(40);
    assert.equal(downloadCount, before, `${mode} must not download`);
  }

  await page.evaluate(() => window.__setExportMode("replay"));
  const replayDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "CSV 내보내기" }).click();
  await replayDownload;
  await page.locator(
    "[data-client-fixed-report-export-state='replay']",
  ).waitFor();
  const replayCalls = await page.evaluate(() => window.__calls.exports);
  assert.equal(
    replayCalls.at(-1).idempotencyKey,
    replayCalls[0].idempotencyKey,
  );

  await page.evaluate(() => {
    window.__setReadMode("revenue_ranking", "data");
  });
  await page.getByRole("tab", { name: "입금 매출 상위 고객" }).click();
  await page.locator("[data-client-fixed-report-state='data']").waitFor();

  const viewportOverflow = {};
  for (const [width, height] of [
    [1440, 900],
    [820, 900],
    [390, 844],
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(40);
    viewportOverflow[width] = await page.evaluate(() => ({
      document:
        document.documentElement.scrollWidth
        > document.documentElement.clientWidth + 1,
      container: (() => {
        const element = document.querySelector(
          "[data-client-fixed-reports-container='true']",
        );
        return element.scrollWidth > element.clientWidth + 1;
      })(),
      selectedTabs:
        document.querySelectorAll("[role='tab'][aria-selected='true']").length,
      tabpanelLabelled:
        Boolean(document.querySelector("[role='tabpanel'][aria-labelledby]")),
    }));
    assert.deepEqual(viewportOverflow[width], {
      document: false,
      container: false,
      selectedTabs: 1,
      tabpanelLabelled: true,
    });
    await page.screenshot({
      path: join(evidenceDir, `client-fixed-reports-container-${width}.png`),
      fullPage: true,
    });
  }
  const mobileTable = await page.locator(".data-table-wrap").evaluate(
    (element) => ({
      overflowX: getComputedStyle(element).overflowX,
      scrollable: element.scrollWidth > element.clientWidth,
    }),
  );
  assert.deepEqual(mobileTable, { overflowX: "auto", scrollable: true });

  const reads = await page.evaluate(() => window.__calls.reads);
  assert.deepEqual(
    [...new Set(reads.map(({ reportId }) => reportId))].sort(),
    [...reportIds].sort(),
  );
  assert.equal(reads.every(({ reportId, ctx }) => (
    reportIds.includes(reportId) && ctx === "allow"
  )), true);
  assert.deepEqual(pageErrors, []);

  await writeFile(
    join(evidenceDir, "client-fixed-reports-container-observables.json"),
    `${JSON.stringify({
      scenario: "CL-P5-W03-T03-client-fixed-reports-container",
      reportIds,
      selectedReportCount: 1,
      readStates: [
        "loading",
        "data",
        "empty",
        "denied",
        "review_required",
        "partial",
        "error",
      ],
      canonicalSelectedReadsOnly: true,
      lateReadIgnored: true,
      keyboardFocusNavigation: true,
      exportSnapshotExact: true,
      stableRetryIdempotency: true,
      csvDigestAndAuditBoundaryValidated: true,
      conflict409Downloaded: false,
      deniedDownloaded: false,
      unsafeSuccessDownloaded: false,
      replayDownloaded: true,
      clientAuthoredRows: false,
      printedReport: printCall,
      viewportOverflow,
      mobileTable,
      pageErrors,
    }, null, 2)}\n`,
    "utf8",
  );
});
