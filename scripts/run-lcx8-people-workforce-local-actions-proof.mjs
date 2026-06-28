#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx8-action-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx8-action-0183-0196-people-workforce-local-actions-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx8-action-0183-0196-people-workforce-local-actions-proof.md`;

const rows = [
  {
    id: "LCX8-ACTION-0183",
    url: `${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-members`,
    selector: "[data-hr-workforce-more]",
    expectSelector: "[data-hr-workforce-local-state]",
    expectedText: /추가 작업.*목록 작업/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0183-people-workforce-more-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0185",
    url: `${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-members`,
    selector: "[data-hr-workforce-add]",
    expectSelector: "[data-hr-workforce-local-state]",
    expectedText: /구성원 추가.*등록 준비 상태/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0185-people-workforce-add-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0186",
    url: `${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-members`,
    selector: "[data-hr-workforce-add-menu]",
    expectSelector: "[data-hr-workforce-local-state]",
    expectedText: /추가 메뉴.*목록 내보내기/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0186-people-workforce-add-menu-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0192",
    url: `${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-members`,
    selector: "[data-hr-workforce-table-options]",
    expectSelector: "[data-hr-workforce-local-state]",
    expectedText: /표 보기 옵션.*항목을 표시/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0192-people-workforce-table-options-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0194",
    url: `${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-members`,
    selector: "[data-hr-workforce-property-options]",
    expectSelector: "[data-hr-workforce-local-state]",
    expectedText: /속성 조정.*최근 확인/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0194-people-workforce-property-options-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0195",
    url: `${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-members`,
    selector: ".hr-roster-person",
    expectSelector: "#people-profile",
    expectedText: /구성원 상세.*선택됨/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0195-people-workforce-row-profile-proof.png`,
    classification: "api_read"
  },
  {
    id: "LCX8-ACTION-0196",
    url: `${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-lifecycle`,
    selector: ".hr-roster-person:has-text('입사 준비')",
    expectSelector: "[data-hr-workforce-local-state]",
    secondaryExpectSelector: "#people-lifecycle",
    expectedText: /입사 준비.*입퇴사 관리 보드/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0196-people-lifecycle-row-proof.png`,
    classification: "api_read"
  }
];

async function waitForQuiet(page, ms = 500) {
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

async function runRow(page, row) {
  await page.goto(row.url, { waitUntil: "networkidle" });
  await page.locator("#people-home [data-hr-workforce-table]").waitFor({ state: "visible", timeout: 15000 });
  const target = page.locator(row.selector).first();
  await target.waitFor({ state: "visible", timeout: 10000 });
  await target.click();
  await waitForQuiet(page);
  const state = page.locator(row.expectSelector).first();
  await state.waitFor({ state: "visible", timeout: 10000 });
  if (row.secondaryExpectSelector) {
    await page.locator(row.secondaryExpectSelector).first().waitFor({ state: "visible", timeout: 10000 });
  }
  const text = normalizeText(await state.innerText());
  await page.screenshot({ path: join(ROOT, row.screenshot), fullPage: true });
  return {
    id: row.id,
    url: row.url,
    selector: row.selector,
    expected_state_selector: row.expectSelector,
    secondary_expected_state_selector: row.secondaryExpectSelector ?? null,
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

const rowProofs = [];
try {
  for (const row of rows) rowProofs.push(await runRow(page, row));
} finally {
  await browser.close();
}

const unexpectedConsoleMessages = consoleMessages.filter((item) => !/Failed to load resource: the server responded with a status of 4\d\d/.test(item.text));
const hrxWrites = hrxRequests.filter((request) => !["GET", "HEAD", "OPTIONS"].includes(request.method));
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
    name: "proof performs no HRX API writes",
    passed: hrxWrites.length === 0,
    details: { hrxWrites }
  }
];

const result = assertions.every((assertion) => assertion.passed) ? "PASS" : "FAIL";
const proof = {
  schema_version: "law-firm-os.lcx8.people-workforce-local-actions-proof.v0.1",
  generated_at: new Date().toISOString(),
  result,
  rows: rows.map((row) => row.id),
  scope: {
    local_browser_runtime: true,
    web_origin: WEB,
    trace_depths: ["ui_state_only", "api_read"],
    persistence_claim: false,
    api_write_claim: false,
    production_ready_claim: false,
    go_live_claim: false
  },
  source_trace: {
    workforce_directory: "apps/web/src/people/employees/PeopleWorkforceDirectory.tsx local action state and roster row selection",
    people_home: "apps/web/src/people/PeopleHome.tsx people-members renders EmployeeProfile; people-lifecycle renders LifecycleBoard",
    lifecycle_board: "apps/web/src/people/lifecycle/LifecycleBoard.tsx API-backed lifecycle board is visible but write buttons are not clicked"
  },
  rowProofs,
  assertions,
  consoleMessages,
  pageErrors,
  hrxRequests,
  hrxResponses,
  hrxWrites
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(join(ROOT, MD_PATH), `${[
  "# LCX8 People Workforce Local Actions Proof",
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
  `- HRX requests observed: ${hrxRequests.length}`,
  `- HRX writes observed: ${hrxWrites.length}`,
  "",
  "## Non-Claims",
  "",
  "- Local browser UI-state and API-read proof only.",
  "- No persistence, API write, production readiness, or go-live claim.",
  ""
].join("\n")}\n`);

console.log(JSON.stringify({
  result,
  json: JSON_PATH,
  md: MD_PATH,
  assertions: `${assertions.filter((item) => item.passed).length}/${assertions.length}`,
  rows: rowProofs.map((row) => ({ id: row.id, status_decision: row.status_decision, observed_text: row.observed_text })),
  hrxReads: hrxRequests.length - hrxWrites.length,
  hrxWrites: hrxWrites.length
}, null, 2));
