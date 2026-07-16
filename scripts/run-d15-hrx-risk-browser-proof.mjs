#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const ARTIFACT_DIR = "artifacts/manual-qa";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/d15-hrx-risk-dashboard-browser-2026-07-03.json`;
const SCREENSHOT_PATH = `${SCREENSHOT_DIR}/d15-hrx-risk-dashboard-browser-2026-07-03.png`;
const HRX_SCOPES = [
  "hrx.employee.read",
  "hrx.document.read",
  "hrx.attendance.read",
  "hrx.overtime.read",
  "hrx.risk.read",
  "hrx.risk.write",
  "hrx.audit.read",
];
const RISK_TYPES = [
  "employment_contract_missing",
  "annual_leave_promotion_target",
  "statutory_training_missing",
  "overtime_risk",
  "offboarded_access_not_revoked",
];
const RISK_LABELS = ["근로계약 미체결", "연차촉진 대상", "법정교육 미이수", "초과근로 위험", "퇴사자 권한 미회수"];

function routeUrl() {
  const params = new URLSearchParams({
    locale: "ko",
    view: "people",
    data: "live",
    ctx: "allow",
    desktop: "1",
    desktop_actor_ref: "user_amic_jwsuh",
    desktop_tenant_ref: "tenant_amic_matter_vault",
    desktop_role_ref: "hr_admin",
    desktop_expires_at: "2026-07-03T23:59:59.000Z",
  });
  params.append("desktop_role_ref", "people_ops");
  for (const scope of HRX_SCOPES) params.append("desktop_scope_ref", scope);
  return `${WEB}/?${params.toString()}#people-risk`;
}

function normalizeText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

function passed(value) {
  return value === true;
}

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const consoleMessages = [];
const pageErrors = [];
const hrxRequests = [];
const hrxResponses = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() });
});
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("request", (request) => {
  const url = request.url();
  if (url.includes("/api/hrx/")) hrxRequests.push({ method: request.method(), url });
});
page.on("response", (response) => {
  const url = response.url();
  if (url.includes("/api/hrx/")) hrxResponses.push({ status: response.status(), url });
});

let snapshot = {};
try {
  await page.goto(routeUrl(), { waitUntil: "networkidle", timeout: 20000 });
  await page.locator("[data-hrx-risk-dashboard='true']").waitFor({ state: "visible", timeout: 15000 });
  const beforeScan = await page.locator("#people-risk").innerText();
  await page.locator("[data-hrx-risk-scan='true']").click();
  await page.locator("[data-hrx-risk-event-list='true'] [data-risk-event-id]").first().waitFor({ state: "visible", timeout: 15000 });
  const acknowledgeButton = page.locator("[data-hrx-risk-event-list='true'] [data-risk-event-id] button:not(:disabled)").first();
  const acknowledgeMode = await acknowledgeButton.count() > 0 ? "clicked" : "already_acknowledged";
  if (acknowledgeMode === "clicked") await acknowledgeButton.click();
  await page.waitForTimeout(300);
  const afterScan = await page.locator("#people-risk").innerText();
  const visibleRiskTypes = await page.locator("[data-hrx-risk-type-strip='legal-five'] [data-risk-type]").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-risk-type")).filter(Boolean),
  );
  const eventRows = await page.locator("[data-hrx-risk-event-list='true'] [data-risk-event-id]").evaluateAll((nodes) =>
    nodes.map((node) => ({
      risk_event_id: node.getAttribute("data-risk-event-id"),
      risk_type: node.getAttribute("data-risk-type"),
      text: node.textContent,
    })),
  );
  await page.screenshot({ path: join(ROOT, SCREENSHOT_PATH), fullPage: true });
  snapshot = {
    url: routeUrl(),
    before_scan_text: normalizeText(beforeScan),
    after_scan_text: normalizeText(afterScan),
    acknowledge_mode: acknowledgeMode,
    visible_risk_types: visibleRiskTypes,
    event_rows: eventRows.map((row) => ({ ...row, text: normalizeText(row.text) })),
    screenshot: SCREENSHOT_PATH,
  };
} finally {
  await browser.close();
}

const scanRequests = hrxRequests.filter((request) => request.method === "POST" && request.url.includes("/api/hrx/risks/scan"));
const transitionRequests = hrxRequests.filter((request) => request.method === "POST" && request.url.includes("/api/hrx/risks/") && request.url.includes("/transition"));
const riskListResponses = hrxResponses.filter((response) => response.url.includes("/api/hrx/risks") && response.status === 200);
const checks = [
  {
    id: "risk-dashboard-mounted",
    passed: snapshot.after_scan_text?.includes("HR 리스크") === true,
  },
  {
    id: "scan-post-observed",
    passed: scanRequests.length >= 1 && hrxResponses.some((response) => response.status === 200 && response.url.includes("/api/hrx/risks/scan")),
  },
  {
    id: "legal-five-visible",
    passed: RISK_TYPES.every((type) => snapshot.visible_risk_types?.includes(type)) && RISK_LABELS.every((label) => snapshot.after_scan_text?.includes(label)),
  },
  {
    id: "risk-event-rows-created",
    passed: Array.isArray(snapshot.event_rows) && snapshot.event_rows.length >= 5,
  },
  {
    id: "acknowledge-transition-observed",
    passed: (transitionRequests.length >= 1 || snapshot.acknowledge_mode === "already_acknowledged") && snapshot.after_scan_text?.includes("확인"),
  },
  {
    id: "risk-api-list-response-observed",
    passed: riskListResponses.length >= 1,
  },
  {
    id: "browser-had-no-page-errors",
    passed: pageErrors.length === 0,
  },
  {
    id: "browser-had-no-unexpected-console-errors",
    passed: consoleMessages.filter((item) => !/Failed to load resource: the server responded with a status of 4\d\d/.test(item.text)).length === 0,
  },
];

const receipt = {
  schema_version: "law-firm-os.wave1.upl_d15.hrx_risk_dashboard.browser_receipt.v0.1",
  generated_at: new Date().toISOString(),
  passed: checks.every((check) => passed(check.passed)),
  route: "people#people-risk",
  scope: {
    local_browser_runtime: true,
    legal_five_rules: RISK_TYPES,
    api_write_claim: true,
    production_ready_claim: false,
    go_live_claim: false,
  },
  snapshot,
  checks,
  hrxRequests,
  hrxResponses,
  consoleMessages,
  pageErrors,
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ passed: receipt.passed, receipt: JSON_PATH, checks }, null, 2));
if (!receipt.passed) process.exit(1);
