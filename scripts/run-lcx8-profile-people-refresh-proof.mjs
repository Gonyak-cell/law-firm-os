#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx8-action-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx8-action-0233-0243-0324-profile-people-refresh-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx8-action-0233-0243-0324-profile-people-refresh-proof.md`;

const rows = [
  {
    id: "LCX8-ACTION-0233",
    url: `${WEB}/?locale=ko&view=profile&ctx=allow`,
    selector: ".sidebar-item:has-text('비용 관리')",
    expectSelector: "[data-profile-section-state='expenses']",
    expectedText: /비용 관리.*검토 상태/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0233-profile-expenses-proof.png`,
    classification: "route_navigation"
  },
  {
    id: "LCX8-ACTION-0234",
    url: `${WEB}/?locale=ko&view=profile&ctx=allow`,
    selector: ".sidebar-item:has-text('정산 내역')",
    expectSelector: "[data-profile-section-state='transactions']",
    expectedText: /정산 내역.*지급 상태/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0234-profile-transactions-proof.png`,
    classification: "route_navigation"
  },
  {
    id: "LCX8-ACTION-0235",
    url: `${WEB}/?locale=ko&view=profile&ctx=allow`,
    selector: ".sidebar-item:has-text('지급 설정')",
    expectSelector: "[data-profile-section-state='payments']",
    expectedText: /지급 설정.*프로필 API/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0235-profile-payments-proof.png`,
    classification: "route_navigation"
  },
  {
    id: "LCX8-ACTION-0236",
    url: `${WEB}/?locale=ko&view=profile&ctx=allow`,
    selector: ".sidebar-item:has-text('입금 계좌')",
    expectSelector: "[data-profile-section-state='withdrawal']",
    expectedText: /입금 계좌.*표시하지 않습니다/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0236-profile-withdrawal-proof.png`,
    classification: "route_navigation"
  },
  {
    id: "LCX8-ACTION-0237",
    url: `${WEB}/?locale=ko&view=profile&ctx=allow`,
    selector: "[data-sidebar-utility='초대 관리']",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /초대 관리.*현재 세션/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0237-profile-invite-utility-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0238",
    url: `${WEB}/?locale=ko&view=profile&ctx=allow`,
    selector: "[data-sidebar-utility='커뮤니티']",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /커뮤니티.*현재 세션/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0238-profile-community-utility-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0239",
    url: `${WEB}/?locale=ko&view=profile&ctx=allow`,
    selector: "[data-profile-help-feedback]",
    expectSelector: "[data-profile-local-state]",
    expectedText: /도움말 및 피드백.*접수 상태/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0239-profile-help-feedback-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0240",
    url: `${WEB}/?locale=ko&view=profile&ctx=allow`,
    selector: "[data-profile-contract-create]",
    expectSelector: "[data-profile-local-state]",
    expectedText: /계약 생성.*Matter 개시/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0240-profile-contract-create-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0241",
    url: `${WEB}/?locale=ko&view=profile&ctx=allow`,
    selector: "[data-profile-action-card='비용·정산 내역']",
    expectSelector: "[data-profile-local-state]",
    expectedText: /비용·정산 내역.*프로필 데이터/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0241-profile-expense-card-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0242",
    url: `${WEB}/?locale=ko&view=profile&ctx=allow`,
    selector: "[data-profile-action-card='개인정보 관리']",
    expectSelector: "[data-profile-local-state]",
    expectedText: /개인정보 관리.*프로필 API/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0242-profile-privacy-card-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0243",
    url: `${WEB}/?locale=ko&view=profile&ctx=allow`,
    selector: "[data-profile-action-card='부재 일정']",
    expectSelector: "[data-profile-local-state]",
    expectedText: /부재 일정.*캘린더/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0243-profile-absence-card-proof.png`,
    classification: "ui_state_only"
  }
];

const peopleRefreshRow = {
  id: "LCX8-ACTION-0324",
  url: `${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-approvals`,
  selector: "#people-home button:has-text('새로고침')",
  expectSelector: "#people-approvals",
  expectedText: /요청 관리|승인|반려|불러오는 중/s,
  screenshot: `${SCREENSHOT_DIR}/lcx8-action-0324-people-header-refresh-proof.png`,
  classification: "api_read"
};

async function waitForQuiet(page, ms = 500) {
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

async function runProfileRow(page, row) {
  await page.goto(row.url, { waitUntil: "networkidle" });
  await page.locator("[data-user-profile-surface]").waitFor({ state: "visible", timeout: 10000 });
  await page.locator(row.selector).first().click();
  await waitForQuiet(page);
  const state = page.locator(row.expectSelector).first();
  await state.waitFor({ state: "visible", timeout: 10000 });
  const text = normalizeText(await state.innerText());
  await page.screenshot({ path: join(ROOT, row.screenshot), fullPage: true });
  return {
    id: row.id,
    url: row.url,
    selector: row.selector,
    expected_state_selector: row.expectSelector,
    expected_text: String(row.expectedText),
    observed_text: text,
    screenshot: row.screenshot,
    status_decision: row.expectedText.test(text) ? "PASS" : "FAIL",
    trace_depth: row.classification,
    persistence_claim: false,
    api_write_claim: false,
    production_ready_claim: false
  };
}

async function runPeopleRefreshRow(page, row) {
  await page.goto(row.url, { waitUntil: "networkidle" });
  await page.locator("#people-home").waitFor({ state: "visible", timeout: 15000 });
  await page.locator(row.expectSelector).first().waitFor({ state: "visible", timeout: 15000 });
  const refreshResponse = page.waitForResponse(
    (response) => response.url().includes("/api/hrx/approvals") && response.request().method() === "GET",
    { timeout: 15000 }
  );
  await page.locator(row.selector).first().click();
  const response = await refreshResponse;
  await waitForQuiet(page);
  const state = page.locator(row.expectSelector).first();
  const text = normalizeText(await state.innerText());
  await page.screenshot({ path: join(ROOT, row.screenshot), fullPage: true });
  return {
    id: row.id,
    url: row.url,
    selector: row.selector,
    expected_state_selector: row.expectSelector,
    expected_text: String(row.expectedText),
    observed_text: text,
    refresh_response: { url: response.url(), status: response.status() },
    screenshot: row.screenshot,
    status_decision: response.status() < 500 && row.expectedText.test(text) ? "PASS" : "FAIL",
    trace_depth: row.classification,
    persistence_claim: false,
    api_write_claim: false,
    production_ready_claim: false
  };
}

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const consoleMessages = [];
const pageErrors = [];
const requests = [];
const responses = [];

page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() });
});
page.on("pageerror", (error) => pageErrors.push(String(error)));
page.on("request", (request) => {
  requests.push({ method: request.method(), url: request.url() });
});
page.on("response", (response) => {
  responses.push({ status: response.status(), url: response.url() });
});

const rowProofs = [];
try {
  for (const row of rows) rowProofs.push(await runProfileRow(page, row));
  rowProofs.push(await runPeopleRefreshRow(page, peopleRefreshRow));
} finally {
  await browser.close();
}

const unexpectedConsoleMessages = consoleMessages.filter((item) => !/Failed to load resource: the server responded with a status of 4\d\d/.test(item.text));
const apiWrites = requests.filter((request) => request.url.includes("/api/") && !["GET", "HEAD", "OPTIONS"].includes(request.method));
const assertions = [
  ...rowProofs.map((proof) => ({
    name: `${proof.id} expected state observed`,
    passed: proof.status_decision === "PASS",
    details: { observed_text: proof.observed_text, selector: proof.expected_state_selector }
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
  }
];

const result = assertions.every((assertion) => assertion.passed) ? "PASS" : "FAIL";
const proof = {
  schema_version: "law-firm-os.lcx8.profile-people-refresh-proof.v0.1",
  generated_at: new Date().toISOString(),
  result,
  rows: [...rows.map((row) => row.id), peopleRefreshRow.id],
  scope: {
    local_browser_runtime: true,
    web_origin: WEB,
    trace_depths: ["route_navigation", "ui_state_only", "api_read"],
    persistence_claim: false,
    api_write_claim: false,
    production_ready_claim: false,
    go_live_claim: false
  },
  source_trace: {
    profile: "apps/web/src/components/UserProfileSurface.jsx reads active hash for profile sections and renders local action state for top/actions cards",
    shell: "apps/web/src/components/Shell.jsx profile sidebar utility buttons render data-sidebar-utility-panel",
    people_refresh: "apps/web/src/people/PeopleHome.tsx refreshKey remounts standalone HRX panels so existing useEffect fetches run again"
  },
  rowProofs,
  assertions,
  consoleMessages,
  pageErrors,
  requests: requests.filter((request) => request.url.includes("/api/")),
  responses: responses.filter((response) => response.url.includes("/api/")),
  apiWrites
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(join(ROOT, MD_PATH), `${[
  "# LCX8 Profile And People Refresh Proof",
  "",
  `Generated at: ${proof.generated_at}`,
  "",
  `Result: ${proof.result}`,
  "",
  "## Rows",
  "",
  ...rowProofs.map((row) => `- ${row.id}: ${row.status_decision} (${row.observed_text})`),
  "",
  "## Assertions",
  "",
  ...assertions.map((assertion) => `- ${assertion.passed ? "PASS" : "FAIL"}: ${assertion.name}`),
  "",
  "## Network",
  "",
  `- API writes observed: ${apiWrites.length}`,
  "",
  "## Non-Claims",
  "",
  "- Local browser route/UI-state and API-read proof only.",
  "- No persistence, API write, production readiness, or go-live claim.",
  ""
].join("\n")}\n`);

console.log(JSON.stringify({
  result,
  json: JSON_PATH,
  md: MD_PATH,
  assertions: `${assertions.filter((item) => item.passed).length}/${assertions.length}`,
  rows: rowProofs.map((row) => ({ id: row.id, status_decision: row.status_decision, observed_text: row.observed_text })),
  apiWrites: apiWrites.length
}, null, 2));
