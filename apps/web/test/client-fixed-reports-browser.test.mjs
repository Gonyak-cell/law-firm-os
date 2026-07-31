import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile
} from "node:fs/promises";
import { createServer as createNetServer } from "node:net";
import {
  dirname,
  join,
  resolve
} from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { chromium } from "playwright";
import { createServer } from "vite";

const testDir = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(testDir, "..");
const evidenceDir = resolve(
  process.env.CLIENT_FIXED_REPORTS_INTEGRATION_EVIDENCE_DIR
    ?? resolve(webRoot, "../../.omo/evidence/client-fixed-reports-integration")
);
const tenantId = "tenant-client-fixed-reports-browser";
const reportIds = [
  "monthly_deposit_revenue",
  "inquiry_status",
  "revenue_ranking",
  "receivables_ranking"
];
const columns = {
  monthly_deposit_revenue: [
    { key: "month", label: "월" },
    { key: "net_deposit_revenue", label: "입금 매출" }
  ],
  inquiry_status: [
    { key: "status", label: "상태" },
    { key: "count", label: "건수" }
  ],
  revenue_ranking: [
    { key: "rank", label: "순위" },
    { key: "client_name", label: "고객" },
    { key: "matched_inflow_amount", label: "연결 입금" },
    { key: "linked_refund_amount", label: "환불" },
    { key: "net_deposit_revenue", label: "입금 매출" },
    { key: "latest_deposit_date", label: "최근 입금일" }
  ],
  receivables_ranking: [
    { key: "rank", label: "순위" },
    { key: "client_name", label: "고객" },
    { key: "agreed_amount", label: "약정 수임료" },
    { key: "active_allocated_amount", label: "반영 입금" },
    { key: "receivable_amount", label: "미수금" },
    { key: "earliest_due_date", label: "가장 이른 지급기한" }
  ]
};
const rows = {
  monthly_deposit_revenue: Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(2025, 7 + index, 1));
    return {
      month: `${date.getUTCFullYear()}-${String(
        date.getUTCMonth() + 1
      ).padStart(2, "0")}`,
      net_deposit_revenue: index === 10
        ? -300_000
        : index === 11
          ? 12_000_000
          : 0
    };
  }),
  inquiry_status: [
    { status: "새 문의", count: 2 },
    { status: "확인 중", count: 1 },
    { status: "상담 예정", count: 2 },
    { status: "수임 검토 중", count: 1 },
    { status: "수임 확정", count: 3 },
    { status: "수임하지 않음", count: 1 }
  ],
  revenue_ranking: [
    {
      rank: 1,
      client_name: "한빛건설",
      matched_inflow_amount: 18_000_000,
      linked_refund_amount: 2_000_000,
      net_deposit_revenue: 16_000_000,
      latest_deposit_date: "2026-07-30"
    },
    {
      rank: 2,
      client_name: "새봄자문",
      matched_inflow_amount: 11_000_000,
      linked_refund_amount: 0,
      net_deposit_revenue: 11_000_000,
      latest_deposit_date: "2026-07-25"
    }
  ],
  receivables_ranking: [
    {
      rank: 1,
      client_name: "미수 고객",
      agreed_amount: 15_000_000,
      active_allocated_amount: 5_000_000,
      receivable_amount: 10_000_000,
      earliest_due_date: "2026-08-10"
    },
    {
      rank: 2,
      client_name: "정산 고객",
      agreed_amount: 5_000_000,
      active_allocated_amount: 5_000_000,
      receivable_amount: 0,
      earliest_due_date: null
    }
  ]
};

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

function audit(action, decision = "allow") {
  return {
    event_id: `audit-${action}-${Date.now()}`,
    action,
    decision,
    tenant_authority: "signed_session",
    actor_id_included: false,
    tenant_id_included: false,
    raw_rows_included: false,
    source_values_included: false,
    production_ready_claim: false
  };
}

function screenBody(reportId, mode = "data") {
  const reportRows = mode === "empty" ? [] : rows[reportId];
  return {
    request_id: `request-client-fixed-report-${reportId}`,
    outcome: mode === "empty" ? "empty" : "passed",
    ui_state: mode === "empty" ? "no_data" : null,
    safe_error_codes: [],
    audit_hint_ref: "ui_client_fixed_reports_probe",
    production_ready_claim: false,
    raw_sql_included: false,
    raw_query_payload_included: false,
    source_payload_included: false,
    count_leak_prevented: true,
    audit_event: audit("report.client_fixed.screen.read"),
    item: {
      report_id: reportId,
      title: "고정 리포트",
      columns: columns[reportId],
      rows: reportRows,
      row_count: reportRows.length,
      row_limit: reportId === "monthly_deposit_revenue"
        ? 12
        : reportId === "inquiry_status"
          ? 6
          : 10,
      as_of: "2026-07-31T01:00:00.000Z",
      timezone: "Asia/Seoul",
      source_status: mode === "empty" ? "no_data" : "available",
      snapshot: {
        token: `lawos_client_fixed_report_v1.${reportId}-opaque`,
        version: 1,
        expires_at: "2099-01-01T01:10:00.000Z"
      },
      print_contract: {
        rows_source: "screen_snapshot",
        server_pdf_required: false
      },
      bounded_result: true,
      permission_prefilter_applied: true,
      count_leak_prevented: true,
      raw_bank_source_included: false,
      raw_source_payload_included: false,
      contact_pii_included: false,
      internal_ids_included: false,
      source_digest_included: false,
      production_ready_claim: false,
      forbidden_raw_payload: "must-not-render"
    },
    forbidden_raw_payload: "must-not-render"
  };
}

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
    ))
  ].join("\n");
}

function csvBody(reportId) {
  const text = csvText(reportId);
  return {
    request_id: `request-client-fixed-report-export-${reportId}`,
    outcome: "created",
    ui_state: null,
    safe_error_codes: [],
    audit_hint_ref: "ui_client_fixed_reports_probe",
    production_ready_claim: false,
    raw_sql_included: false,
    raw_query_payload_included: false,
    source_payload_included: false,
    count_leak_prevented: true,
    idempotent_replay: false,
    audit_event: audit("report.client_fixed.csv.export"),
    item: {
      report_id: reportId,
      title: "고정 리포트",
      columns: columns[reportId],
      rows: rows[reportId],
      row_count: rows[reportId].length,
      source_status: "available",
      snapshot_version: 1,
      as_of: "2026-07-31T01:00:00.000Z",
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
      production_ready_claim: false
    }
  };
}

function guardedBody(mode) {
  return {
    request_id: `request-client-fixed-report-${mode}`,
    outcome: mode === "review" ? "review_required" : mode,
    ui_state: mode === "review" ? "review_required" : mode,
    items: [],
    safe_error_codes: [
      mode === "denied"
        ? "CLIENT_FIXED_REPORT_READ_DENIED"
        : mode === "review"
          ? "CLIENT_FIXED_REPORT_REVIEW_REQUIRED"
          : "CLIENT_FIXED_REPORT_SOURCE_UNAVAILABLE"
    ],
    audit_recorded: true,
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function genericCollection(pathname) {
  return {
    request_id: `generic-${pathname.replace(/[^a-z0-9]+/giu, "-")}`,
    outcome: "passed",
    ui_state: "empty",
    item: null,
    items: [],
    page_info: {
      returned_count: 0,
      omitted_item_count: null,
      has_more: false,
      next_cursor: null
    },
    safe_error_codes: [],
    audit_hint_ref: "generic-client-fixed-reports-browser",
    count_leak_prevented: true,
    permission_prefilter_applied: true,
    raw_source_payload_included: false,
    production_ready_claim: false
  };
}

function fulfill(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json; charset=utf-8",
    body: JSON.stringify(body)
  });
}

test("CL-P5-W03-T03 real Client reports route uses four fixed reports for read, CSV and print across states and viewports", { timeout: 90_000 }, async (t) => {
  await mkdir(evidenceDir, { recursive: true });
  const port = await availablePort();
  const server = await createServer({
    root: webRoot,
    logLevel: "silent",
    server: {
      host: "127.0.0.1",
      port,
      strictPort: true,
      hmr: false
    }
  });
  await server.listen();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage({
    viewport: { width: 1440, height: 1000 }
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const state = {
    modes: {
      monthly_deposit_revenue: "data",
      inquiry_status: "empty",
      revenue_ranking: "slow",
      receivables_ranking: "denied"
    },
    requests: [],
    exportBodies: [],
    expectedNetworkErrors: [],
    pageErrors: []
  };
  page.on("pageerror", (error) => state.pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    if (message.text().startsWith("Failed to load resource:")) {
      state.expectedNetworkErrors.push(message.text());
      return;
    }
    state.pageErrors.push(message.text());
  });
  t.after(async () => {
    await page.close();
    await context.close();
    await browser.close();
    await server.close();
  });

  await page.addInitScript(({ tenant }) => {
    sessionStorage.setItem("lawos.api.session", JSON.stringify({
      token_type: "Bearer",
      session_token: "lawos_session_v1.client_fixed_reports_browser",
      expires_at: "2099-01-01T00:00:00.000Z"
    }));
    sessionStorage.setItem("lawos.session.envelope", JSON.stringify({
      schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
      state: "signed_in",
      session_ref: "session-client-fixed-reports-browser",
      source: "api_signed_session",
      actor_ref: "user-client-fixed-reports-browser",
      tenant_refs: {
        default: tenant,
        client: tenant,
        matter: tenant,
        vault: tenant,
        crm: tenant
      },
      role_ids: ["analytics_user"],
      scopes: ["analytics:client:read", "analytics:client:export"],
      review_state: "allow",
      expires_at: "2099-01-01T00:00:00.000Z"
    }));
    window.__clientFixedReportPrintCalls = 0;
    window.print = () => {
      window.__clientFixedReportPrintCalls += 1;
    };
  }, { tenant: tenantId });

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const match = url.pathname.match(
      /^\/api\/reports\/clients\/fixed\/([^/.]+)(\.csv)?$/u
    );
    state.requests.push({
      pathname: url.pathname,
      method: request.method(),
      query: Object.fromEntries(url.searchParams),
      authorization: request.headers().authorization ?? null,
      permissionContext: request.headers()["x-lawos-permission-context"]
        ? JSON.parse(request.headers()["x-lawos-permission-context"])
        : null
    });
    if (!match) return fulfill(route, genericCollection(url.pathname));
    const reportId = decodeURIComponent(match[1]);
    if (match[2]) {
      const body = request.postDataJSON();
      state.exportBodies.push(body);
      return fulfill(route, csvBody(reportId), 201);
    }
    const mode = state.modes[reportId];
    if (mode === "slow") {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 300));
      return fulfill(route, screenBody(reportId));
    }
    if (mode === "denied") {
      return fulfill(route, guardedBody("denied"), 403);
    }
    if (mode === "review") {
      return fulfill(route, guardedBody("review"));
    }
    if (mode === "error") {
      return fulfill(route, guardedBody("error"), 503);
    }
    return fulfill(route, screenBody(reportId, mode));
  });

  await page.goto(
    `http://127.0.0.1:${port}/?view=clients&ctx=allow#client-reports`,
    { waitUntil: "domcontentloaded" }
  );
  const fixedContainer = page.locator(
    "[data-client-fixed-reports-container='true']"
  );
  await fixedContainer.waitFor();
  await page.locator(
    "[data-client-fixed-report='monthly_deposit_revenue'][data-client-fixed-report-state='data']"
  ).waitFor();
  assert.equal(await page.locator("[data-report-builder]").count(), 0);
  assert.equal(
    await page.locator("[data-client-fixed-reports-panel='true']").count(),
    1
  );
  assert.equal((await page.locator("body").innerText()).includes("must-not-render"), false);

  await page.getByRole("button", { name: "인쇄" }).click();
  assert.equal(
    await page.evaluate(() => window.__clientFixedReportPrintCalls),
    1
  );
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "CSV 내보내기" }).click()
  ]);
  const csvPath = join(
    evidenceDir,
    "client-monthly-deposit-revenue-integrated.csv"
  );
  await download.saveAs(csvPath);
  assert.equal(
    await readFile(csvPath, "utf8"),
    csvText("monthly_deposit_revenue")
  );
  await page.locator(
    "[data-client-fixed-report-export-state='success']"
  ).waitFor();

  const tabs = page.getByRole("tab");
  await tabs.first().focus();
  await page.keyboard.press("ArrowRight");
  assert.equal(
    await page.evaluate(() => document.activeElement?.textContent?.trim()),
    "문의 현황"
  );
  await page.keyboard.press("Enter");
  await page.locator(
    "[data-client-fixed-report='inquiry_status'][data-client-fixed-report-state='empty']"
  ).waitFor();
  assert.equal(
    await page.locator(
      "[data-client-fixed-report-notice='empty'][role='status']"
    ).count(),
    1
  );

  await page.getByRole("tab", { name: "입금 매출 상위 고객" }).click();
  await page.locator(
    "[data-client-fixed-report='revenue_ranking'][data-client-fixed-report-state='loading']"
  ).waitFor();
  assert.equal(
    await page.locator(
      "[data-client-fixed-report-notice='loading'][role='status']"
    ).count(),
    1
  );
  await page.getByRole("tab", { name: "문의 현황" }).click();
  await page.locator(
    "[data-client-fixed-report='inquiry_status'][data-client-fixed-report-state='empty']"
  ).waitFor();
  await page.waitForTimeout(360);
  assert.equal(
    await fixedContainer.getAttribute("data-client-fixed-reports-active"),
    "inquiry_status"
  );
  assert.equal(
    await page.locator(
      "[data-client-fixed-report='inquiry_status'][data-client-fixed-report-state='empty']"
    ).count(),
    1
  );

  await page.getByRole("tab", { name: "미수금 상위 고객" }).click();
  await page.locator(
    "[data-client-fixed-report='receivables_ranking'][data-client-fixed-report-state='denied']"
  ).waitFor();
  assert.equal(
    await page.locator(
      "[data-client-fixed-report-notice='denied'][role='status']"
    ).count(),
    1
  );
  state.modes.receivables_ranking = "review";
  await page.getByRole("tab", { name: "월별 입금 매출" }).click();
  await page.getByRole("tab", { name: "미수금 상위 고객" }).click();
  await page.locator(
    "[data-client-fixed-report='receivables_ranking'][data-client-fixed-report-state='review_required']"
  ).waitFor();
  assert.equal(
    await page.locator(
      "[data-client-fixed-report-notice='review_required'][role='status']"
    ).count(),
    1
  );
  state.modes.receivables_ranking = "error";
  await page.getByRole("button", { name: "다시 불러오기" }).click();
  await page.locator(
    "[data-client-fixed-report='receivables_ranking'][data-client-fixed-report-state='error']"
  ).waitFor();
  assert.equal(
    await page.locator(
      "[data-client-fixed-report-notice='error'][role='alert']"
    ).count(),
    1
  );
  state.modes.receivables_ranking = "data";
  await page.getByRole("button", { name: "다시 불러오기" }).click();
  await page.locator(
    "[data-client-fixed-report='receivables_ranking'][data-client-fixed-report-state='data']"
  ).waitFor();

  state.modes.revenue_ranking = "data";
  await page.getByRole("tab", { name: "입금 매출 상위 고객" }).click();
  await page.locator(
    "[data-client-fixed-report='revenue_ranking'][data-client-fixed-report-state='data']"
  ).waitFor();

  const viewportEvidence = {};
  for (const [width, height] of [
    [1440, 1000],
    [820, 960],
    [390, 844]
  ]) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(80);
    viewportEvidence[width] = await page.evaluate(() => {
      const container = document.querySelector(
        "[data-client-fixed-reports-container='true']"
      );
      const table = container?.querySelector(".data-table-wrap");
      return {
        documentOverflow:
          document.documentElement.scrollWidth
          > document.documentElement.clientWidth + 1,
        containerOverflow:
          container.scrollWidth > container.clientWidth + 1,
        tableOverflowX: table ? getComputedStyle(table).overflowX : null,
        selectedTabs: document.querySelectorAll(
          "[role='tab'][aria-selected='true']"
        ).length,
        labelledTabpanel: Boolean(
          document.querySelector("[role='tabpanel'][aria-labelledby]")
        )
      };
    });
    assert.deepEqual(viewportEvidence[width], {
      documentOverflow: false,
      containerOverflow: false,
      tableOverflowX: "auto",
      selectedTabs: 1,
      labelledTabpanel: true
    });
    await page.screenshot({
      path: join(
        evidenceDir,
        `client-fixed-reports-integrated-${width}.png`
      ),
      fullPage: true
    });
  }

  assert.equal(state.exportBodies.length, 1);
  assert.deepEqual(Object.keys(state.exportBodies[0]).sort(), [
    "audit_hint_ref",
    "idempotency_key",
    "permission_ref",
    "snapshot_token",
    "snapshot_version",
    "tenant_id"
  ]);
  assert.deepEqual(
    {
      tenant_id: state.exportBodies[0].tenant_id,
      permission_ref: state.exportBodies[0].permission_ref,
      audit_hint_ref: state.exportBodies[0].audit_hint_ref,
      snapshot_token: state.exportBodies[0].snapshot_token,
      snapshot_version: state.exportBodies[0].snapshot_version
    },
    {
      tenant_id: tenantId,
      permission_ref: "ui_client_fixed_reports",
      audit_hint_ref: "ui_client_fixed_reports_probe",
      snapshot_token:
        "lawos_client_fixed_report_v1.monthly_deposit_revenue-opaque",
      snapshot_version: 1
    }
  );
  assert.match(
    state.exportBodies[0].idempotency_key,
    /^client_fixed_report_export:[A-Za-z0-9]+$/u
  );
  const fixedRequests = state.requests.filter(({ pathname }) => (
    pathname.startsWith("/api/reports/clients/fixed/")
  ));
  assert.deepEqual(
    [...new Set(fixedRequests
      .filter(({ method }) => method === "GET")
      .map(({ pathname }) => pathname.split("/").at(-1)))].sort(),
    [...reportIds].sort()
  );
  assert.equal(
    state.requests.some(({ pathname }) => pathname === "/api/reports"),
    false
  );
  for (const request of fixedRequests) {
    assert.equal(
      request.authorization,
      "Bearer lawos_session_v1.client_fixed_reports_browser"
    );
    assert.equal(request.permissionContext.principal.tenant_id, tenantId);
    assert.equal(
      request.permissionContext.principal.user_id,
      "user-client-fixed-reports-browser"
    );
    if (request.method === "GET") {
      assert.equal(request.query.tenant_id, tenantId);
      assert.equal(request.query.permission_ref, "ui_client_fixed_reports");
      assert.equal(
        request.query.audit_hint_ref,
        "ui_client_fixed_reports_probe"
      );
    }
  }
  assert.equal(state.expectedNetworkErrors.length, 2);
  assert.deepEqual(state.pageErrors, []);

  const observables = {
    scenario: "CL-P5-W03-T03-client-fixed-reports-real-route",
    route: "clients/client-reports",
    reportIds,
    genericReportBuilderMounted: false,
    genericReportsEndpointCalled: false,
    statesObserved: [
      "loading",
      "data",
      "empty",
      "denied",
      "review_required",
      "error"
    ],
    lateReadIgnored: true,
    keyboardTabNavigation: true,
    printCalls: 1,
    csvDownload: {
      filename: download.suggestedFilename(),
      byteSize: Buffer.byteLength(
        csvText("monthly_deposit_revenue"),
        "utf8"
      ),
      exactScreenRows: true
    },
    signedTenantBound: true,
    snapshotOnlyExport: true,
    viewportEvidence,
    expectedNetworkErrors: state.expectedNetworkErrors,
    pageErrors: state.pageErrors
  };
  await writeFile(
    join(
      evidenceDir,
      "client-fixed-reports-integration-observables.json"
    ),
    `${JSON.stringify(observables, null, 2)}\n`,
    "utf8"
  );
});
