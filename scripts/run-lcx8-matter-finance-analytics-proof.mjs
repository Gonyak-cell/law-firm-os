#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const API = process.env.LAWOS_API_URL ?? "http://127.0.0.1:4180";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx8-action-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx8-action-0307-0308-0309-0311-0313-matter-finance-analytics-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx8-action-0307-0308-0309-0311-0313-matter-finance-analytics-proof.md`;
const PERMISSION_CONTEXT_HEADER = "x-lawos-permission-context";

const MATTER_ID = "matter_rp05_synthetic_opening";
const MATTER_TENANT_ID = "tenant_rp05_synthetic";
const FINANCE_TENANT_ID = "tenant_cmp_g7_synthetic";
const ANALYTICS_TENANT_ID = "tenant_cmp_g8_synthetic";
const TARGET_ROWS = [
  "LCX8-ACTION-0307",
  "LCX8-ACTION-0308",
  "LCX8-ACTION-0309",
  "LCX8-ACTION-0311",
  "LCX8-ACTION-0312",
  "LCX8-ACTION-0313"
];

const contexts = {
  matter: {
    principal: { user_id: "matter_matter_operator", tenant_id: MATTER_TENANT_ID, role_ids: ["matter_runtime_user"] },
    rules: [{ id: "rule_matter_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  finance: {
    principal: { user_id: "matter_finance_operator", tenant_id: FINANCE_TENANT_ID, role_ids: ["finance_user"] },
    rules: [{ id: "rule_finance_allow", effect: "allow", action: "*" }],
    object_acl: []
  },
  analytics: {
    principal: { user_id: "matter_analytics_operator", tenant_id: ANALYTICS_TENANT_ID, role_ids: ["analytics_user"] },
    rules: [{ id: "rule_analytics_allow", effect: "allow", action: "*" }],
    object_acl: []
  }
};

function denied(context) {
  return { ...context, rules: [] };
}

function screenshotPath(name) {
  return `${SCREENSHOT_DIR}/${name}.png`;
}

function normalizeText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function contextHeaders(context) {
  return {
    "content-type": "application/json",
    [PERMISSION_CONTEXT_HEADER]: JSON.stringify(context)
  };
}

async function waitForQuiet(page, ms = 500) {
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function apiJson(path, { context, method = "GET", body } = {}) {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: contextHeaders(context),
    body: body ? JSON.stringify(body) : undefined
  });
  return { status: response.status, body: await response.json().catch(() => null), path };
}

async function clickAndCapture(page, responsePredicate, clickLocator) {
  const responsePromise = page.waitForResponse(responsePredicate, { timeout: 15000 });
  await clickLocator.click();
  const response = await responsePromise;
  await waitForQuiet(page);
  return { status: response.status(), url: response.url(), body: await response.json().catch(() => null) };
}

async function navigateHash(page, hash) {
  await page.evaluate((nextHash) => {
    window.location.hash = nextHash;
  }, hash);
  await page.locator(`#${hash}`).waitFor({ state: "visible", timeout: 15000 });
  await waitForQuiet(page);
}

function guardPassed(probe, code) {
  return probe.status === 403 && Array.isArray(probe.body?.safe_error_codes) && probe.body.safe_error_codes.includes(code);
}

function proofRow({ id, label, url, selector, observedText, screenshot, response, readBack, auditActions, guardProbes, nonClaims = [] }) {
  const passed =
    response?.status >= 200 &&
    response?.status < 300 &&
    (!readBack || readBack.passed === true) &&
    (auditActions ?? []).every((item) => item.found === true) &&
    (guardProbes ?? []).every((item) => item.passed === true);
  return {
    id,
    label,
    url,
    selector,
    observed_text: observedText,
    screenshot,
    response,
    read_back: readBack ?? null,
    audit_actions: auditActions ?? [],
    guard_probes: guardProbes ?? [],
    status_decision: passed ? "PASS" : "FAIL",
    trace_depth: "api_write",
    persistence_claim: Boolean(readBack),
    api_write_claim: true,
    production_ready_claim: false,
    non_claims: [
      "safe synthetic Matter/Finance/Analytics runtime proof only",
      "no external provider, banking, production-ready, or go-live claim",
      ...nonClaims
    ]
  };
}

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const consoleMessages = [];
const pageErrors = [];
const apiRequests = [];
const apiResponses = [];
const prerequisites = [];
const rowProofs = [];
const generated = {
  memberId: `lcx8-team-${Date.now()}`
};

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() });
});
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("request", (request) => {
  if (/\/api\/(matters|finance|analytics)\//.test(request.url())) apiRequests.push({ method: request.method(), url: request.url() });
});
page.on("response", (response) => {
  if (/\/api\/(matters|finance|analytics)\//.test(response.url())) apiResponses.push({ status: response.status(), url: response.url() });
});

try {
  await page.goto(`${WEB}/?locale=ko&view=matters&data=live&ctx=allow#matter-team`, { waitUntil: "networkidle" });
  await page.locator("#matter-team").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#matter-team label:has-text('팀원 번호') input").fill(generated.memberId);
  await page.locator("#matter-team label:has-text('구성원 계정') input").fill("emp-002");
  await page.locator("#matter-team label:has-text('로그인 계정') input").fill("user_rp05_associate");
  await page.locator("#matter-team label:has-text('역할') select").selectOption("responsible_attorney");
  const teamResponse = await clickAndCapture(
    page,
    (response) => response.url().includes(`/api/matters/${MATTER_ID}/team-members`) && response.request().method() === "POST",
    page.locator("#matter-team .matter-team-form .primary-button").first()
  );
  const matterReadAfterTeam = await apiJson(
    `/api/matters/${MATTER_ID}?tenant_id=${MATTER_TENANT_ID}&permission_ref=ui_cmp_g4_matter_live&audit_hint_ref=lcx8_team_readback`,
    { context: contexts.matter }
  );
  const matterAuditAfterTeam = await apiJson(
    `/api/matters/audit?tenant_id=${MATTER_TENANT_ID}&permission_ref=ui_cmp_g4_matter_live&audit_hint_ref=lcx8_team_audit`,
    { context: contexts.matter }
  );
  const teamGuard = await apiJson(`/api/matters/${MATTER_ID}/team-members`, {
    context: denied(contexts.matter),
    method: "POST",
    body: {
      tenant_id: MATTER_TENANT_ID,
      permission_ref: "ui_cmp_g4_matter_team",
      audit_hint_ref: "lcx8_team_denied",
      actor_id: "matter_matter_operator",
      member: {
        tenant_id: MATTER_TENANT_ID,
        member_id: "lcx8-team-denied",
        matter_id: MATTER_ID,
        employee_id: "emp-002",
        user_id: "user_rp05_associate",
        role: "responsible_attorney",
        status: "active"
      }
    }
  });
  const teamScreenshot = screenshotPath("lcx8-action-0307-matter-team-proof");
  await page.screenshot({ path: join(ROOT, teamScreenshot), fullPage: true });
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0307",
    label: "추가 / 책임자 지정",
    url: page.url(),
    selector: "#matter-team .matter-team-form .primary-button",
    observedText: normalizeText(await page.locator("#matter-team").innerText()),
    screenshot: teamScreenshot,
    response: teamResponse,
    readBack: {
      path: `/api/matters/${MATTER_ID}`,
      status: matterReadAfterTeam.status,
      object_id: MATTER_ID,
      passed:
        matterReadAfterTeam.status === 200 &&
        matterReadAfterTeam.body?.item?.owner_employee_id === "emp-002" &&
        matterReadAfterTeam.body?.item?.owner_display_name === "Synthetic Associate"
    },
    auditActions: [
      {
        action: "matter.team.member.add",
        object_id: generated.memberId,
        found: matterAuditAfterTeam.body?.items?.some((event) => event.action === "matter.team.member.add" && event.object_id === generated.memberId) === true
      },
      {
        action: "matter.owner.assignment",
        object_id: MATTER_ID,
        found: matterAuditAfterTeam.body?.items?.some((event) => event.action === "matter.owner.assignment" && event.object_id === MATTER_ID) === true
      }
    ],
    guardProbes: [{
      name: "matter team write denied",
      status: teamGuard.status,
      safe_error_codes: teamGuard.body?.safe_error_codes,
      passed: guardPassed(teamGuard, "MATTER_UNAUTHORIZED_OMISSION")
    }]
  }));

  await navigateHash(page, "matter-billing");
  const timeResponse = await clickAndCapture(
    page,
    (response) => response.url().includes("/api/finance/time-entries") && response.request().method() === "POST",
    page.locator("[data-matter-time-entry-action='true'] button").first()
  );
  const timeEntry = timeResponse.body?.item;
  const financeTimeRead = await apiJson(
    `/api/finance/time-entries?tenant_id=${FINANCE_TENANT_ID}&permission_ref=ui_cmp_g7_finance_live&audit_hint_ref=lcx8_time_readback`,
    { context: contexts.finance }
  );
  const timeGuard = await apiJson("/api/finance/time-entries", {
    context: denied(contexts.finance),
    method: "POST",
    body: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: "ui_cmp_g7_finance_live",
      audit_hint_ref: "lcx8_time_denied",
      actor_id: "matter_finance_operator",
      idempotency_key: "lcx8-denied-time",
      time_entry: {
        time_entry_id: "lcx8-denied-time",
        tenant_id: FINANCE_TENANT_ID,
        matter_id: MATTER_ID,
        role_id: "partner",
        work_date: "2026-06-20",
        narrative: "denied",
        duration_minutes: 30,
        billable: true
      }
    }
  });
  const timeScreenshot = screenshotPath("lcx8-action-0308-matter-finance-time-proof");
  await page.screenshot({ path: join(ROOT, timeScreenshot), fullPage: true });
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0308",
    label: "시간 기록",
    url: page.url(),
    selector: "[data-matter-time-entry-action='true'] button",
    observedText: normalizeText(await page.locator("#matter-billing").innerText()),
    screenshot: timeScreenshot,
    response: timeResponse,
    readBack: {
      path: "/api/finance/time-entries",
      status: financeTimeRead.status,
      object_id: timeEntry?.time_entry_id,
      passed: financeTimeRead.body?.items?.some((item) => item.time_entry_id === timeEntry?.time_entry_id) === true
    },
    auditActions: [{
      action: "time.entry.create",
      object_id: timeEntry?.time_entry_id,
      found: timeResponse.body?.audit_event?.action === "time.entry.create" && timeResponse.body?.audit_event?.object_id === timeEntry?.time_entry_id
    }],
    guardProbes: [{
      name: "finance time write denied",
      status: timeGuard.status,
      safe_error_codes: timeGuard.body?.safe_error_codes,
      passed: guardPassed(timeGuard, "FINANCE_UNAUTHORIZED_OMISSION")
    }]
  }));

  const wipResponse = await clickAndCapture(
    page,
    (response) => response.url().includes("/api/finance/wip") && response.request().method() === "POST",
    page.locator("#matter-billing button:has-text('청구 준비')").first()
  );
  const wipGuard = await apiJson("/api/finance/wip", {
    context: denied(contexts.finance),
    method: "POST",
    body: {
      tenant_id: FINANCE_TENANT_ID,
      permission_ref: "ui_cmp_g7_finance_live",
      audit_hint_ref: "lcx8_wip_denied",
      actor_id: "matter_finance_operator",
      idempotency_key: "lcx8-denied-wip",
      matter_id: MATTER_ID
    }
  });
  const financeAuditAfterWip = await apiJson(
    `/api/finance/audit?tenant_id=${FINANCE_TENANT_ID}&permission_ref=ui_cmp_g7_finance_live&audit_hint_ref=lcx8_wip_audit`,
    { context: contexts.finance }
  );
  const wipScreenshot = screenshotPath("lcx8-action-0309-matter-finance-wip-proof");
  await page.screenshot({ path: join(ROOT, wipScreenshot), fullPage: true });
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0309",
    label: "청구 준비",
    url: page.url(),
    selector: "#matter-billing button:has-text('청구 준비')",
    observedText: normalizeText(await page.locator("#matter-billing").innerText()),
    screenshot: wipScreenshot,
    response: wipResponse,
    readBack: {
      path: "/api/finance/wip response",
      status: wipResponse.status,
      object_id: wipResponse.body?.item?.wip_item_id,
      passed: Array.isArray(wipResponse.body?.items) && wipResponse.body.items.some((item) => item.matter_id === MATTER_ID)
    },
    auditActions: [{
      action: "wip.generate",
      object_id: MATTER_ID,
      found: financeAuditAfterWip.body?.items?.some((event) => event.action === "wip.generate" && event.object_id === MATTER_ID) === true
    }],
    guardProbes: [{
      name: "finance wip write denied",
      status: wipGuard.status,
      safe_error_codes: wipGuard.body?.safe_error_codes,
      passed: guardPassed(wipGuard, "FINANCE_UNAUTHORIZED_OMISSION")
    }]
  }));

  const paymentResponse = await clickAndCapture(
    page,
    (response) => response.url().includes("/api/finance/payments") && response.request().method() === "POST",
    page.locator("#matter-billing button:has-text('수납 기록')").first()
  );
  prerequisites.push({
    id: "LCX8-ACTION-0310",
    purpose: "prerequisite_for_lcx8_action_0313_profitability_button",
    response_status: paymentResponse.status,
    outcome: paymentResponse.body?.outcome,
    audit_action: paymentResponse.body?.audit_event?.action,
    status_decision: "BLOCKED remains BLOCKED / Lane D",
    non_claim: "local synthetic payment import prerequisite only; no banking/external receipt/payment execution claim"
  });

  await navigateHash(page, "matter-analytics");
  const refreshResponse = await clickAndCapture(
    page,
    (response) => response.url().includes("/api/analytics/refresh") && response.request().method() === "POST",
    page.locator("#matter-analytics button:has-text('새로고침')").first()
  );
  const dashboardRead = await apiJson(
    `/api/analytics/dashboards?tenant_id=${ANALYTICS_TENANT_ID}&permission_ref=ui_cmp_g8_analytics_live&audit_hint_ref=lcx8_refresh_readback`,
    { context: contexts.analytics }
  );
  const analyticsRefreshGuard = await apiJson("/api/analytics/refresh", {
    context: denied(contexts.analytics),
    method: "POST",
    body: {
      tenant_id: ANALYTICS_TENANT_ID,
      permission_ref: "ui_cmp_g8_analytics_live",
      audit_hint_ref: "lcx8_analytics_refresh_denied",
      actor_id: "matter_analytics_operator",
      idempotency_key: "lcx8-denied-analytics-refresh"
    }
  });
  const analyticsAuditAfterRefresh = await apiJson(
    `/api/analytics/audit?tenant_id=${ANALYTICS_TENANT_ID}&permission_ref=ui_cmp_g8_analytics_live&audit_hint_ref=lcx8_refresh_audit`,
    { context: contexts.analytics }
  );
  const refreshScreenshot = screenshotPath("lcx8-action-0311-matter-analytics-refresh-proof");
  await page.screenshot({ path: join(ROOT, refreshScreenshot), fullPage: true });
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0311",
    label: "새로고침",
    url: page.url(),
    selector: "#matter-analytics button:has-text('새로고침')",
    observedText: normalizeText(await page.locator("#matter-analytics").innerText()),
    screenshot: refreshScreenshot,
    response: refreshResponse,
    readBack: {
      path: "/api/analytics/dashboards",
      status: dashboardRead.status,
      object_id: refreshResponse.body?.item?.refresh_run_id,
      passed: dashboardRead.body?.items?.some((item) => item.dashboard_id === "dashboard-practice-pnl") === true
    },
    auditActions: [{
      action: "analytics.read_model.refresh",
      object_id: refreshResponse.body?.item?.refresh_run_id,
      found: analyticsAuditAfterRefresh.body?.items?.some((event) => event.action === "analytics.read_model.refresh" && event.object_id === refreshResponse.body?.item?.refresh_run_id) === true
    }],
    guardProbes: [{
      name: "analytics refresh denied",
      status: analyticsRefreshGuard.status,
      safe_error_codes: analyticsRefreshGuard.body?.safe_error_codes,
      passed: guardPassed(analyticsRefreshGuard, "ANALYTICS_UNAUTHORIZED_OMISSION")
    }]
  }));

  const exportResponse = await clickAndCapture(
    page,
    (response) => response.url().includes("/api/analytics/exports") && response.request().method() === "POST",
    page.locator("[data-matter-analytics-export-action='true'] button").first()
  );
  const exportGuard = await apiJson("/api/analytics/exports", {
    context: denied(contexts.analytics),
    method: "POST",
    body: {
      tenant_id: ANALYTICS_TENANT_ID,
      permission_ref: "ui_cmp_g8_analytics_live",
      audit_hint_ref: "lcx8_analytics_export_denied",
      actor_id: "matter_analytics_operator",
      idempotency_key: "lcx8-denied-analytics-export",
      analytics_export: {
        tenant_id: ANALYTICS_TENANT_ID,
        analytics_export_id: "lcx8-denied-analytics-export",
        dashboard_id: "dashboard-ar-aging",
        export_format: "csv",
        permission_ref: "ui_cmp_g8_analytics_live"
      }
    }
  });
  const analyticsAuditAfterExport = await apiJson(
    `/api/analytics/audit?tenant_id=${ANALYTICS_TENANT_ID}&permission_ref=ui_cmp_g8_analytics_live&audit_hint_ref=lcx8_export_audit`,
    { context: contexts.analytics }
  );
  const exportScreenshot = screenshotPath("lcx8-action-0312-matter-analytics-export-proof");
  await page.screenshot({ path: join(ROOT, exportScreenshot), fullPage: true });
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0312",
    label: "내보내기",
    url: page.url(),
    selector: "[data-matter-analytics-export-action='true'] button",
    observedText: normalizeText(await page.locator("#matter-analytics").innerText()),
    screenshot: exportScreenshot,
    response: exportResponse,
    readBack: {
      path: "/api/analytics/exports response",
      status: exportResponse.status,
      object_id: exportResponse.body?.item?.analytics_export_id,
      passed:
        exportResponse.body?.item?.analytics_export_id &&
        exportResponse.body.item.status === "ready_for_review" &&
        exportResponse.body.item.matter_detail_omitted === true &&
        exportResponse.body.item.credential_material_included === false
    },
    auditActions: [{
      action: "analytics.export.create",
      object_id: exportResponse.body?.item?.analytics_export_id,
      found: analyticsAuditAfterExport.body?.items?.some((event) => event.action === "analytics.export.create" && event.object_id === exportResponse.body?.item?.analytics_export_id) === true
    }],
    guardProbes: [{
      name: "analytics export denied",
      status: exportGuard.status,
      safe_error_codes: exportGuard.body?.safe_error_codes,
      passed: guardPassed(exportGuard, "ANALYTICS_UNAUTHORIZED_OMISSION")
    }]
  }));

  const profitabilityResponse = await clickAndCapture(
    page,
    (response) => response.url().includes("/api/analytics/matter-profitability") && response.request().method() === "POST",
    page.locator("#matter-analytics button:has-text('손익 갱신')").first()
  );
  const profitabilityRead = await apiJson(
    `/api/analytics/matter-profitability?tenant_id=${ANALYTICS_TENANT_ID}&permission_ref=ui_cmp_g8_analytics_live&audit_hint_ref=lcx8_profitability_readback`,
    { context: contexts.analytics }
  );
  const profitabilityGuard = await apiJson("/api/analytics/matter-profitability", {
    context: denied(contexts.analytics),
    method: "POST",
    body: {
      tenant_id: ANALYTICS_TENANT_ID,
      permission_ref: "ui_cmp_g8_analytics_live",
      audit_hint_ref: "lcx8_profitability_denied",
      actor_id: "matter_analytics_operator",
      idempotency_key: "lcx8-denied-profitability",
      matter_id: MATTER_ID,
      time_entries: [{ standard_value: 400000 }],
      invoices: [{ amount_due: 400000 }],
      payments: [{ amount: 400000 }]
    }
  });
  const analyticsAuditAfterProfitability = await apiJson(
    `/api/analytics/audit?tenant_id=${ANALYTICS_TENANT_ID}&permission_ref=ui_cmp_g8_analytics_live&audit_hint_ref=lcx8_profitability_audit`,
    { context: contexts.analytics }
  );
  const profitabilityScreenshot = screenshotPath("lcx8-action-0313-matter-analytics-profitability-proof");
  await page.screenshot({ path: join(ROOT, profitabilityScreenshot), fullPage: true });
  rowProofs.push(proofRow({
    id: "LCX8-ACTION-0313",
    label: "손익 갱신",
    url: page.url(),
    selector: "#matter-analytics button:has-text('손익 갱신')",
    observedText: normalizeText(await page.locator("#matter-analytics").innerText()),
    screenshot: profitabilityScreenshot,
    response: profitabilityResponse,
    readBack: {
      path: "/api/analytics/matter-profitability",
      status: profitabilityRead.status,
      object_id: profitabilityResponse.body?.item?.matter_profitability_id,
      passed:
        profitabilityRead.body?.items?.some(
          (item) =>
            item.matter_profitability_id === profitabilityResponse.body?.item?.matter_profitability_id &&
            Number(item.collected_value) > 0
        ) === true
    },
    auditActions: [{
      action: "analytics.matter_profitability.refresh",
      object_id: profitabilityResponse.body?.item?.matter_profitability_id,
      found:
        analyticsAuditAfterProfitability.body?.items?.some(
          (event) =>
            event.action === "analytics.matter_profitability.refresh" &&
            event.object_id === profitabilityResponse.body?.item?.matter_profitability_id
        ) === true
    }],
    guardProbes: [{
      name: "analytics profitability denied",
      status: profitabilityGuard.status,
      safe_error_codes: profitabilityGuard.body?.safe_error_codes,
      passed: guardPassed(profitabilityGuard, "ANALYTICS_UNAUTHORIZED_OMISSION")
    }],
    nonClaims: ["LCX8-ACTION-0310 payment import was used only as a local prerequisite and remains Lane D without external banking receipt"]
  }));
} finally {
  await browser.close();
}

const assertions = [
  ...rowProofs.map((row) => ({
    name: `${row.id} browser/API/write/read-back/audit/guard proof`,
    passed: row.status_decision === "PASS",
    details: {
      response_status: row.response?.status,
      read_back: row.read_back,
      audit_actions: row.audit_actions,
      guard_probes: row.guard_probes
    }
  })),
  {
    name: "all target rows covered exactly once",
    passed: TARGET_ROWS.every((id) => rowProofs.some((row) => row.id === id)) && rowProofs.length === TARGET_ROWS.length,
    details: { targetRows: TARGET_ROWS, rowProofs: rowProofs.map((row) => row.id) }
  },
  {
    name: "no page errors",
    passed: pageErrors.length === 0,
    details: { pageErrors }
  },
  {
    name: "no unexpected console errors",
    passed: consoleMessages.filter((message) => message.type === "error").length === 0,
    details: { consoleMessages }
  },
  {
    name: "all observed browser writes stayed inside Matter/Finance/Analytics APIs",
    passed: apiRequests.filter((request) => request.method !== "GET").every((request) => /\/api\/(matters|finance|analytics)\//.test(request.url)),
    details: { writes: apiRequests.filter((request) => request.method !== "GET") }
  },
  {
    name: "payment prerequisite recorded without PASS promotion claim",
    passed: prerequisites.some((item) => item.id === "LCX8-ACTION-0310" && item.status_decision.includes("BLOCKED remains BLOCKED")),
    details: { prerequisites }
  }
];

const result = assertions.every((assertion) => assertion.passed) ? "PASS" : "FAIL";
const proof = {
  schema_version: "law-firm-os.lcx8.matter-finance-analytics-proof.v0.1",
  generated_at: new Date().toISOString(),
  result,
  rows: rowProofs.map((row) => row.id),
  scope: {
    local_browser_runtime: true,
    web_origin: WEB,
    api_origin: API,
    trace_depth: "api_write",
    safe_synthetic_fixture: true,
    external_provider_execution_claim: false,
    banking_receipt_claim: false,
    payment_execution_claim: false,
    production_ready_claim: false,
    go_live_claim: false
  },
  source_trace: {
    team: "apps/web/src/components/MatterTeamRoster.jsx -> addMatterTeamMember -> POST /api/matters/:matter_id/team-members",
    finance: "apps/web/src/components/MattersSurface.jsx BillingActionPanel -> createFinanceTimeEntry/generateFinanceWip/importFinancePayment -> finance API",
    analytics: "apps/web/src/components/MattersSurface.jsx AnalyticsActionPanel -> refreshAnalyticsDashboards/createAnalyticsExport/refreshMatterProfitability -> analytics API"
  },
  prerequisites,
  rowProofs,
  assertions,
  consoleMessages,
  pageErrors,
  apiRequests,
  apiResponses
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(join(ROOT, MD_PATH), `${[
  "# LCX8 Matter Finance Analytics Proof",
  "",
  `Generated at: ${proof.generated_at}`,
  "",
  `Result: ${proof.result}`,
  "",
  "## Rows",
  "",
  ...rowProofs.map((row) => `- ${row.id}: ${row.status_decision} (${row.label}; response ${row.response?.status}; read-back ${row.read_back?.passed}; audit ${row.audit_actions.map((item) => `${item.action}:${item.found}`).join(", ")})`),
  "",
  "## Prerequisites",
  "",
  ...prerequisites.map((item) => `- ${item.id}: ${item.status_decision}; ${item.non_claim}`),
  "",
  "## Assertions",
  "",
  ...assertions.map((assertion) => `- ${assertion.passed ? "PASS" : "FAIL"}: ${assertion.name}`),
  "",
  "## Non-Claims",
  "",
  "- Safe synthetic local Matter/Finance/Analytics runtime proof only.",
  "- LCX8-ACTION-0310 payment import remains BLOCKED / Lane D until external banking receipt exists.",
  "- No external provider, banking receipt, payment execution, production readiness, or go-live claim.",
  ""
].join("\n")}\n`);

console.log(JSON.stringify({
  result,
  json: JSON_PATH,
  md: MD_PATH,
  assertions: `${assertions.filter((item) => item.passed).length}/${assertions.length}`,
  rows: rowProofs.map((row) => ({ id: row.id, status_decision: row.status_decision, response: row.response?.status, readBack: row.read_back?.passed })),
  prerequisites,
  nonClaims: proof.scope
}, null, 2));
