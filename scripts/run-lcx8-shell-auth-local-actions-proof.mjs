#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx8-action-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx8-action-0004-0034-0112-0113-0164-0165-0296-0302-shell-auth-local-actions-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx8-action-0004-0034-0112-0113-0164-0165-0296-0302-shell-auth-local-actions-proof.md`;

const rows = [
  {
    id: "LCX8-ACTION-0004",
    url: `${WEB}/?view=auth&authStep=login`,
    action: "check",
    selector: "[data-login-remember]",
    expectSelector: "[data-login-remember-state]",
    expectedText: /로그인 이메일을 기억/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0004-remember-me-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0005",
    url: `${WEB}/?view=auth&authStep=login`,
    action: "click",
    selector: "[data-login-forgot-password]",
    expectSelector: "[data-login-recovery-state]",
    expectedText: /비밀번호 재설정 안내/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0005-forgot-password-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0017",
    url: `${WEB}/?view=home&ctx=allow`,
    action: "click",
    selector: "[data-topbar-help-trigger]",
    expectSelector: "[data-topbar-help-panel]",
    expectedText: /도움말.*운영 상태/s,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0017-help-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0027",
    url: `${WEB}/?view=home&ctx=allow`,
    setup: "notifications",
    action: "click",
    selector: "[data-notification-mark-read]",
    expectSelector: "[data-notification-read-state]",
    expectedText: /모든 알림을 읽음/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0027-notifications-read-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0028",
    url: `${WEB}/?view=home&ctx=allow`,
    setup: "notifications",
    action: "click",
    selector: "[data-notification-settings]",
    expectSelector: "[data-notification-settings-state]",
    expectedText: /알림 설정은 이 기기/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0028-notification-settings-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0034",
    url: `${WEB}/?view=home&ctx=allow`,
    action: "click",
    selector: "[data-workspace-menu-trigger]",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /Home 작업공간/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0034-workspace-menu-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0032",
    url: `${WEB}/?view=home&ctx=allow`,
    action: "click",
    selector: "[data-sidebar-utility='작업공간 설정']",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /작업공간 설정/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0032-workspace-settings-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0033",
    url: `${WEB}/?view=home&ctx=allow`,
    action: "click",
    selector: "[data-sidebar-utility='태그 관리']",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /태그 관리/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0033-tag-management-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0112",
    url: `${WEB}/?view=clients&ctx=allow`,
    action: "click",
    selector: "[data-sidebar-utility='Client 설정']",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /Client 설정/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0112-client-settings-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0113",
    url: `${WEB}/?view=clients&ctx=allow`,
    action: "click",
    selector: "[data-sidebar-utility='태그 관리']",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /태그 관리/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0113-client-tags-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0164",
    url: `${WEB}/?view=people&ctx=allow`,
    action: "click",
    selector: "[data-sidebar-utility='회사 설정']",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /회사 설정/,
    domLabel: "회사 설정",
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0164-people-settings-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0165",
    url: `${WEB}/?view=people&ctx=allow`,
    action: "click",
    selector: "[data-sidebar-utility='권한']",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /권한/,
    domLabel: "권한",
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0165-people-permissions-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0296",
    url: `${WEB}/?view=matters&ctx=allow`,
    action: "click",
    selector: "[data-sidebar-utility='Matter 설정']",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /Matter 설정/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0296-matter-settings-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0297",
    url: `${WEB}/?view=matters&ctx=allow`,
    action: "click",
    selector: "[data-sidebar-utility='태그 관리']",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /태그 관리/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0297-matter-tags-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0301",
    url: `${WEB}/?view=vault&ctx=allow`,
    action: "click",
    selector: "[data-sidebar-utility='Vault 설정']",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /Vault 설정/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0301-vault-settings-proof.png`,
    classification: "ui_state_only"
  },
  {
    id: "LCX8-ACTION-0302",
    url: `${WEB}/?view=vault&ctx=allow`,
    action: "click",
    selector: "[data-sidebar-utility='문서 태그']",
    expectSelector: "[data-sidebar-utility-panel]",
    expectedText: /문서 태그/,
    screenshot: `${SCREENSHOT_DIR}/lcx8-action-0302-vault-tags-proof.png`,
    classification: "ui_state_only"
  }
];

async function waitForQuiet(page, ms = 500) {
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function runRow(page, row) {
  await page.goto(row.url, { waitUntil: "networkidle" });
  if (row.setup === "notifications") {
    await page.locator("[data-notification-trigger]").click();
    await page.locator("[data-notification-drawer='open']").waitFor({ state: "visible", timeout: 10000 });
  }
  const target = page.locator(row.selector).first();
  await target.waitFor({ state: "visible", timeout: 10000 });
  if (row.action === "check") await target.check();
  else await target.click();
  await waitForQuiet(page);
  const state = page.locator(row.expectSelector).first();
  await state.waitFor({ state: "visible", timeout: 10000 });
  const text = (await state.innerText()).replace(/\s+/g, " ").trim();
  await page.screenshot({ path: join(ROOT, row.screenshot), fullPage: true });
  return {
    id: row.id,
    url: row.url,
    selector: row.selector,
    dom_label: row.domLabel ?? null,
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

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const consoleMessages = [];
const pageErrors = [];
page.on("console", (message) => {
  if (["error", "warning"].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() });
});
page.on("pageerror", (error) => pageErrors.push(String(error)));

const rowProofs = [];
try {
  for (const row of rows) rowProofs.push(await runRow(page, row));
} finally {
  await browser.close();
}

const unexpectedConsoleMessages = consoleMessages.filter((item) => !/Failed to load resource: the server responded with a status of 4\d\d/.test(item.text));
const assertions = [
  ...rowProofs.map((proof) => ({
    name: `${proof.id} local state observed`,
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
  }
];

const result = assertions.every((assertion) => assertion.passed) ? "PASS" : "FAIL";
const proof = {
  schema_version: "law-firm-os.lcx8.shell-auth-local-actions-proof.v0.1",
  generated_at: new Date().toISOString(),
  result,
  rows: rows.map((row) => row.id),
  scope: {
    local_browser_runtime: true,
    web_origin: WEB,
    trace_depth: "ui_state_only",
    persistence_claim: false,
    api_write_claim: false,
    production_ready_claim: false,
    go_live_claim: false
  },
  source_trace: {
    auth: "apps/web/src/components/AuthSurface.jsx AuthForm local remember/recovery state",
    shell: "apps/web/src/components/Shell.jsx Topbar, NotificationDrawer, Sidebar local state panels"
  },
  rowProofs,
  assertions,
  consoleMessages,
  pageErrors
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(join(ROOT, MD_PATH), `${[
  "# LCX8 Shell/Auth Local Actions Proof",
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
  "## Non-Claims",
  "",
  "- Local browser UI-state proof only.",
  "- No persistence, API write, production readiness, or go-live claim.",
  ""
].join("\n")}\n`);

console.log(JSON.stringify({
  result,
  json: JSON_PATH,
  md: MD_PATH,
  assertions: `${assertions.filter((item) => item.passed).length}/${assertions.length}`,
  rows: rowProofs.map((row) => ({ id: row.id, status_decision: row.status_decision, observed_text: row.observed_text }))
}, null, 2));
