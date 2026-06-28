#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx8-action-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx8-action-0184-0187-0193-0198-0214-people-hrx-local-fields-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx8-action-0184-0187-0193-0198-0214-people-hrx-local-fields-proof.md`;

const rows = [
  {
    id: "LCX8-ACTION-0184",
    kind: "org_view",
    url: `${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-members`,
    ledgerLabel: "조직도",
    productLabel: "조직",
    expectSelector: "[data-hr-org-chart]",
    expectedText: /조직.*재직 구성원/s,
    reconciliation: "ledger label 조직도 maps to current visible 조직 button"
  },
  { id: "LCX8-ACTION-0187", kind: "workforce_tab", ledgerLabel: "재직", productLabel: "재직", tabLabel: "재직" },
  { id: "LCX8-ACTION-0188", kind: "workforce_tab", ledgerLabel: "입사 예정", productLabel: "입사 예정", tabLabel: "입사 예정" },
  { id: "LCX8-ACTION-0189", kind: "workforce_tab", ledgerLabel: "퇴사 예정", productLabel: "퇴사 예정", tabLabel: "퇴사 예정" },
  {
    id: "LCX8-ACTION-0190",
    kind: "workforce_tab",
    ledgerLabel: "종료",
    productLabel: "퇴사",
    tabLabel: "퇴사",
    reconciliation: "ledger label 종료 maps to current visible 퇴사 status tab"
  },
  {
    id: "LCX8-ACTION-0191",
    kind: "workforce_tab",
    ledgerLabel: "외부 협업",
    productLabel: "계약직",
    tabLabel: "계약직",
    reconciliation: "ledger label 외부 협업 maps to current visible 계약직 status tab"
  },
  {
    id: "LCX8-ACTION-0193",
    kind: "workforce_search",
    ledgerLabel: "구성원 검색",
    productLabel: "구성원 검색",
    fillValue: "인사"
  },
  { id: "LCX8-ACTION-0198", kind: "field", section: "people-leave", panel: "#people-leave", ledgerLabel: "시간", productLabel: "시간", fillValue: "4" },
  { id: "LCX8-ACTION-0199", kind: "field", section: "people-leave", panel: "#people-leave", ledgerLabel: "시작일", productLabel: "시작일", fillValue: "2026-07-01" },
  { id: "LCX8-ACTION-0200", kind: "field", section: "people-leave", panel: "#people-leave", ledgerLabel: "종료일", productLabel: "종료일", fillValue: "2026-07-01" },
  {
    id: "LCX8-ACTION-0205",
    kind: "field",
    section: "people-policy",
    panel: "#people-policy",
    ledgerLabel: "정책 이름",
    productLabel: "규칙 이름",
    fillValue: "approval-rule-local-proof",
    reconciliation: "ledger label 정책 이름 maps to current visible 규칙 이름 field"
  },
  { id: "LCX8-ACTION-0206", kind: "field", section: "people-policy", panel: "#people-policy", ledgerLabel: "유형", productLabel: "유형", fillValue: "approval" },
  { id: "LCX8-ACTION-0207", kind: "field", section: "people-policy", panel: "#people-policy", ledgerLabel: "버전", productLabel: "버전", fillValue: "v-local-proof" },
  { id: "LCX8-ACTION-0211", kind: "field", section: "people-payroll", panel: "#people-payroll", ledgerLabel: "기간", productLabel: "기간", fillValue: "2026-07" },
  { id: "LCX8-ACTION-0212", kind: "field", section: "people-payroll", panel: "#people-payroll", ledgerLabel: "구성원", productLabel: "구성원", fillValue: "대표 구성원" },
  { id: "LCX8-ACTION-0213", kind: "field", section: "people-payroll", panel: "#people-payroll", ledgerLabel: "외부 급여 서비스", productLabel: "외부 급여 서비스", fillValue: "외부 미리보기 전용" },
  { id: "LCX8-ACTION-0214", kind: "field", section: "people-payroll", panel: "#people-payroll", ledgerLabel: "문서 참조", productLabel: "문서 참조", fillValue: "문서:급여-proof-001" }
];

function screenshotPath(id) {
  return `${SCREENSHOT_DIR}/${id.toLowerCase()}-people-hrx-local-fields-proof.png`;
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function exactLabel(text) {
  return new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);
}

async function waitForQuiet(page, ms = 300) {
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function runOrgView(page, row) {
  await page.goto(row.url, { waitUntil: "networkidle" });
  await page.locator("#people-home [data-hr-workforce-table]").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#people-home [data-hr-workforce-table] button").filter({ hasText: row.productLabel }).first().click();
  await waitForQuiet(page);
  const target = page.locator(row.expectSelector).first();
  await target.waitFor({ state: "visible", timeout: 10000 });
  const observedText = normalizeText(await target.innerText());
  return {
    observed_state: observedText,
    passed: row.expectedText.test(observedText)
  };
}

async function runWorkforceTab(page, row) {
  await page.goto(`${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-members`, { waitUntil: "networkidle" });
  await page.locator("#people-home [data-hr-workforce-table]").waitFor({ state: "visible", timeout: 15000 });
  await page.locator("#people-home .hr-roster-tabs button").filter({ hasText: exactLabel(row.tabLabel) }).first().click();
  await waitForQuiet(page);
  const active = page.locator("#people-home .hr-roster-tabs button.active").first();
  await active.waitFor({ state: "visible", timeout: 10000 });
  const activeText = normalizeText(await active.innerText());
  await page.locator("#people-home [data-hr-library-table]").first().waitFor({ state: "visible", timeout: 10000 });
  return {
    observed_state: `active tab: ${activeText}`,
    passed: activeText === row.tabLabel
  };
}

async function runWorkforceSearch(page, row) {
  await page.goto(`${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-members`, { waitUntil: "networkidle" });
  await page.locator("#people-home [data-hr-workforce-table]").waitFor({ state: "visible", timeout: 15000 });
  const input = page.locator('#people-home input[aria-label="구성원 검색"]').first();
  await input.waitFor({ state: "visible", timeout: 10000 });
  await input.fill(row.fillValue);
  await waitForQuiet(page);
  const value = await input.inputValue();
  await page.locator("#people-home [data-hr-library-table]").first().waitFor({ state: "visible", timeout: 10000 });
  return {
    observed_state: `search value: ${value}`,
    passed: value === row.fillValue
  };
}

async function runField(page, row) {
  await page.goto(`${WEB}/?locale=ko&view=people&data=live&ctx=allow#${row.section}`, { waitUntil: "networkidle" });
  const panel = page.locator(row.panel).first();
  await panel.waitFor({ state: "visible", timeout: 15000 });
  const input = panel.locator("label").filter({ hasText: row.productLabel }).locator("input").first();
  await input.waitFor({ state: "visible", timeout: 10000 });
  await input.fill(row.fillValue);
  await waitForQuiet(page);
  const value = await input.inputValue();
  return {
    observed_state: `${row.productLabel}: ${value}`,
    passed: value === row.fillValue
  };
}

async function runRow(page, row) {
  const beforeWrites = apiWrites.length;
  let result;
  if (row.kind === "org_view") result = await runOrgView(page, row);
  else if (row.kind === "workforce_tab") result = await runWorkforceTab(page, row);
  else if (row.kind === "workforce_search") result = await runWorkforceSearch(page, row);
  else result = await runField(page, row);

  const screenshot = screenshotPath(row.id);
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  return {
    id: row.id,
    kind: row.kind,
    ledger_label: row.ledgerLabel,
    product_label: row.productLabel,
    reconciliation: row.reconciliation ?? null,
    observed_state: result.observed_state,
    screenshot,
    status_decision: result.passed && apiWrites.length === beforeWrites ? "UI_ONLY final" : "FAIL",
    trace_depth: "ui_state_only",
    api_write_count_delta: apiWrites.length - beforeWrites,
    persistence_claim: false,
    api_write_claim: false,
    external_receipt_claim: false,
    production_ready_claim: false,
    go_live_claim: false
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
const apiWrites = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() });
});
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("request", (request) => {
  const url = request.url();
  if (!url.includes("/api/")) return;
  const item = { method: request.method(), url };
  apiRequests.push(item);
  if (!["GET", "HEAD", "OPTIONS"].includes(item.method)) apiWrites.push(item);
});
page.on("response", (response) => {
  const url = response.url();
  if (url.includes("/api/")) apiResponses.push({ status: response.status(), url });
});

const rowProofs = [];
try {
  for (const row of rows) rowProofs.push(await runRow(page, row));
} finally {
  await browser.close();
}

const unexpectedConsoleMessages = consoleMessages.filter((item) => !/Failed to load resource: the server responded with a status of 4\d\d/.test(item.text));
const api5xx = apiResponses.filter((response) => response.status >= 500);
const assertions = [
  ...rowProofs.map((proof) => ({
    name: `${proof.id} UI_ONLY final state observed`,
    passed: proof.status_decision === "UI_ONLY final",
    details: { observed_state: proof.observed_state, product_label: proof.product_label }
  })),
  {
    name: "browser has no page errors",
    passed: pageErrors.length === 0,
    details: { pageErrors }
  },
  {
    name: "browser has no unexpected console errors",
    passed: unexpectedConsoleMessages.length === 0,
    details: { consoleMessages, unexpectedConsoleMessages }
  },
  {
    name: "proof performs no API writes",
    passed: apiWrites.length === 0,
    details: { apiWrites }
  },
  {
    name: "proof observes no API 5xx",
    passed: api5xx.length === 0,
    details: { api5xx }
  }
];

const result = assertions.every((assertion) => assertion.passed) ? "PASS" : "FAIL";
const proof = {
  schema_version: "law-firm-os.lcx8.people-hrx-local-fields-proof.v0.1",
  generated_at: new Date().toISOString(),
  result,
  rows: rows.map((row) => row.id),
  scope: {
    local_browser_runtime: true,
    web_origin: WEB,
    trace_depths: ["ui_state_only"],
    status_decision: "UI_ONLY final classification; status remains UI_ONLY",
    persistence_claim: false,
    api_write_claim: false,
    external_receipt_claim: false,
    production_ready_claim: false,
    go_live_claim: false
  },
  source_trace: {
    workforce_directory: "apps/web/src/people/employees/PeopleWorkforceDirectory.tsx STATUS_TABS, org view toggle, and search input local React state",
    leave_request_page: "apps/web/src/people/leave/LeaveRequestPage.tsx amount/start_date/end_date form state; submit row owns HRX write boundary",
    policy_console: "apps/web/src/admin/hrx/HRXPolicyConsole.tsx policy form state; submit row owns HRX write boundary",
    payroll_boundary: "apps/web/src/people/payroll/PayrollBoundaryPanel.tsx payroll form state; preview/approve/export rows own HRX write boundary"
  },
  rowProofs,
  assertions,
  consoleMessages,
  pageErrors,
  apiRequests,
  apiResponses,
  apiWrites,
  api5xx,
  non_claims: [
    "UI_ONLY local browser state proof only",
    "no form submit or action button write was performed",
    "no persistence or reload proof is claimed",
    "no external provider receipt is claimed",
    "no production-ready or go-live claim is made"
  ]
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(join(ROOT, MD_PATH), `${[
  "# LCX8 People HRX Local Fields Proof",
  "",
  `Generated at: ${proof.generated_at}`,
  "",
  `Result: ${proof.result}`,
  "",
  "## Rows",
  "",
  ...rowProofs.map((row) => `- ${row.id}: ${row.status_decision}; ${row.product_label}; ${row.observed_state}${row.reconciliation ? `; ${row.reconciliation}` : ""}`),
  "",
  "## Assertions",
  "",
  ...assertions.map((assertion) => `- ${assertion.passed ? "PASS" : "FAIL"}: ${assertion.name}`),
  "",
  "## Network",
  "",
  `- API requests: ${apiRequests.length}`,
  `- API writes: ${apiWrites.length}`,
  `- API 5xx: ${api5xx.length}`,
  "",
  "## Non-Claims",
  "",
  ...proof.non_claims.map((item) => `- ${item}`)
].join("\n")}\n`);

if (result !== "PASS") {
  console.error(JSON.stringify({ result, assertions, rowProofs, apiWrites, api5xx, pageErrors, unexpectedConsoleMessages }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({
  result,
  action_ids: rows.map((row) => row.id),
  row_count: rows.length,
  proof: JSON_PATH,
  proof_md: MD_PATH,
  status_decision: proof.scope.status_decision
}, null, 2));
