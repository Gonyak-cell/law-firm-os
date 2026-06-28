#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx8-action-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx8-action-0148-0152-0163-people-sidebar-current-ui-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx8-action-0148-0152-0163-people-sidebar-current-ui-proof.md`;

const ROW_IDS = [
  "LCX8-ACTION-0148",
  "LCX8-ACTION-0152",
  "LCX8-ACTION-0153",
  "LCX8-ACTION-0154",
  "LCX8-ACTION-0155",
  "LCX8-ACTION-0156",
  "LCX8-ACTION-0157",
  "LCX8-ACTION-0158",
  "LCX8-ACTION-0159",
  "LCX8-ACTION-0160",
  "LCX8-ACTION-0161",
  "LCX8-ACTION-0162",
  "LCX8-ACTION-0163"
];

const routeRows = [
  ["LCX8-ACTION-0152", "구성원", "people-members", "관리"],
  ["LCX8-ACTION-0153", "조직", "people-org-chart", "관리", "current label for ledger label 조직도"],
  ["LCX8-ACTION-0154", "휴가관리", "people-leave", "휴가", "current label for ledger label 휴가"],
  ["LCX8-ACTION-0155", "요청 관리", "people-approvals", "요청/전자결재", "current label for ledger label 승인"],
  ["LCX8-ACTION-0156", "입퇴사 관리", "people-lifecycle", "관리", "current label for ledger label 입사·퇴사"],
  ["LCX8-ACTION-0157", "구성원 등록", "people-recruiting", "관리", "current label for ledger label 채용"],
  ["LCX8-ACTION-0158", "회사방침", "people-documents", "회사 설정", "current label for ledger label 인사 문서"],
  ["LCX8-ACTION-0159", "승인 규칙", "people-policy", "요청/전자결재", "current label for ledger label 인사 정책"],
  ["LCX8-ACTION-0160", "인사기록", "people-audit", "회사 설정", "current label for ledger label 활동 기록"],
  ["LCX8-ACTION-0161", "권한", "people-admin", "회사 설정", "current label for ledger label 권한 관리"],
  ["LCX8-ACTION-0162", "급여정산", "people-payroll", "마감 및 급여", "current label for ledger label 급여 정산"],
  ["LCX8-ACTION-0163", "실시간 리포트", "people-analytics", "리포트", "current label for ledger label 인사 현황"]
].map(([id, productLabel, section, groupLabel, reconciliation]) => ({ id, productLabel, section, groupLabel, reconciliation: reconciliation ?? null }));

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function screenshotPath(id, suffix = "proof") {
  return `${SCREENSHOT_DIR}/${id.toLowerCase()}-${suffix}.png`;
}

async function waitForQuiet(page, ms = 450) {
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function gotoPeople(page, section = "people-members") {
  await page.goto(`${WEB}/?locale=ko&view=people&data=live&ctx=allow#${section}`, { waitUntil: "networkidle" });
  await page.locator("[data-context-sidebar='people']").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#people-home").waitFor({ state: "visible", timeout: 15000 });
}

async function ensureGroupOpen(page, label) {
  const groupButton = page.locator(".sidebar-group-toggle").filter({ hasText: label }).first();
  await groupButton.waitFor({ state: "visible", timeout: 15000 });
  const expanded = await groupButton.getAttribute("aria-expanded");
  if (expanded !== "true") {
    await groupButton.click();
    await page.waitForTimeout(150);
  }
  return groupButton;
}

async function runGroupToggle(page) {
  await gotoPeople(page, "people-members");
  const groupButton = await ensureGroupOpen(page, "관리");
  const before = await groupButton.getAttribute("aria-expanded");
  await groupButton.click();
  await page.waitForTimeout(150);
  const afterCollapse = await groupButton.getAttribute("aria-expanded");
  await groupButton.click();
  await page.waitForTimeout(150);
  const afterExpand = await groupButton.getAttribute("aria-expanded");
  const screenshot = screenshotPath("LCX8-ACTION-0148", "group-toggle");
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  return {
    id: "LCX8-ACTION-0148",
    product_label: "관리",
    route: "/?locale=ko&view=people&data=live&ctx=allow#people-members",
    observed: { before, afterCollapse, afterExpand },
    screenshot,
    status_decision: before === "true" && afterCollapse === "false" && afterExpand === "true" ? "UI_ONLY final" : "FAIL",
    trace_depth: "ui_state_only",
    persistence_claim: false,
    api_write_claim: false,
    production_ready_claim: false
  };
}

async function runRouteRow(page, row) {
  await gotoPeople(page, row.section === "people-documents" ? "people-members" : "people-documents");
  await ensureGroupOpen(page, row.groupLabel);
  const networkStart = networkEvents.length;
  const requestStart = requestEvents.length;
  const button = page.locator(".sidebar-child").filter({ hasText: row.productLabel }).first();
  await button.waitFor({ state: "visible", timeout: 15000 });
  await button.click();
  await page.waitForFunction((section) => window.location.hash === `#${section}`, row.section, { timeout: 10000 });
  await waitForQuiet(page);
  const activeButtonText = compact(await page.locator(".sidebar-child[aria-current='location']").first().innerText());
  const peopleText = compact(await page.locator("#people-home").first().innerText());
  const screenshot = screenshotPath(row.id, "route");
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  const requests = requestEvents.slice(requestStart);
  const responses = networkEvents.slice(networkStart);
  const apiWrites = requests.filter((request) => request.url.includes("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method));
  const passed =
    windowHashMatches(await page.evaluate(() => window.location.hash), row.section) &&
    activeButtonText.includes(row.productLabel) &&
    peopleText.length > 0 &&
    apiWrites.length === 0 &&
    responses.every((response) => response.status < 500);
  return {
    id: row.id,
    product_label: row.productLabel,
    expected_section: row.section,
    current_url: page.url().replace(WEB, ""),
    active_button_text: activeButtonText,
    people_surface_text_excerpt: peopleText.slice(0, 240),
    reconciliation: row.reconciliation,
    api_write_count: apiWrites.length,
    api_5xx_count: responses.filter((response) => response.status >= 500).length,
    screenshot,
    status_decision: passed ? "UI_ONLY final" : "FAIL",
    trace_depth: "route_navigation",
    persistence_claim: false,
    api_write_claim: false,
    production_ready_claim: false
  };
}

function windowHashMatches(hash, section) {
  return hash === `#${section}`;
}

mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const consoleMessages = [];
const pageErrors = [];
const requestEvents = [];
const networkEvents = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() });
});
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("request", (request) => requestEvents.push({ method: request.method(), url: request.url() }));
page.on("response", (response) => {
  const url = response.url();
  if (/\/(?:api|master-data)(?:\/|\?|$)/.test(url)) {
    networkEvents.push({ method: response.request().method(), status: response.status(), url });
  }
});

const rowProofs = [];
try {
  rowProofs.push(await runGroupToggle(page));
  for (const row of routeRows) rowProofs.push(await runRouteRow(page, row));
} finally {
  await browser.close();
}

const unexpectedConsoleMessages = consoleMessages.filter((item) => !/Failed to load resource: the server responded with a status of 4\d\d/.test(item.text));
const passed = rowProofs.every((row) => row.status_decision === "UI_ONLY final") && pageErrors.length === 0 && unexpectedConsoleMessages.length === 0;
const proof = {
  schema_version: "law-firm-os.lcx8.people-sidebar-current-ui-proof.v0.1",
  generated_at: new Date().toISOString(),
  result: passed ? "PASS" : "FAIL",
  action_ids: ROW_IDS,
  status_decision: "UI_ONLY final classification; status remains UI_ONLY",
  base_url: WEB,
  rowProofs,
  console_messages_recorded_not_gated: consoleMessages,
  unexpected_console_messages: unexpectedConsoleMessages,
  page_errors: pageErrors,
  non_claims: [
    "current product UI route/navigation proof only",
    "no API write or persistence claim",
    "no external provider, production-ready, or go-live claim",
    "LCX8-ACTION-0146/0147/0149/0150/0151 are excluded because their legacy Legal People/sidebar labels are not current visible sidebar actions"
  ]
};

writeFileSync(JSON_PATH, `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(MD_PATH, `${[
  "# LCX8 People Sidebar Current UI Proof",
  "",
  `- Result: ${proof.result}`,
  "- Status decision: UI_ONLY final classification; status remains UI_ONLY",
  `- Generated: ${proof.generated_at}`,
  `- Base URL: ${WEB}`,
  "",
  "## Rows",
  ...rowProofs.map((row) => `- ${row.id}: ${row.status_decision}; ${row.product_label}; ${row.expected_section ?? "group-toggle"}${row.reconciliation ? `; ${row.reconciliation}` : ""}`),
  "",
  "## Non-Claims",
  ...proof.non_claims.map((item) => `- ${item}`)
].join("\n")}\n`);

console.log(JSON.stringify({
  result: proof.result,
  action_ids: ROW_IDS,
  row_count: rowProofs.length,
  proof: JSON_PATH,
  proof_md: MD_PATH,
  status_decision: proof.status_decision
}, null, 2));

if (!passed) process.exitCode = 1;
