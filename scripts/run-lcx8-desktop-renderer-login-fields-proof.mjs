#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx8-action-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx8-action-0248-0249-desktop-renderer-login-fields-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx8-action-0248-0249-desktop-renderer-login-fields-proof.md`;

const rows = [
  {
    id: "LCX8-ACTION-0248",
    label: "Desktop login email",
    selector: "[data-login-email]",
    fillValue: "desktop.operator@example.test",
    observedMode: "plain"
  },
  {
    id: "LCX8-ACTION-0249",
    label: "Desktop login password",
    selector: "[data-login-password]",
    fillValue: "MatterLocalProof!0249",
    observedMode: "masked"
  }
];

function screenshotPath(id) {
  return `${SCREENSHOT_DIR}/${id.toLowerCase()}-desktop-renderer-login-fields-proof.png`;
}

async function waitForQuiet(page, ms = 300) {
  await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

async function runRow(page, row) {
  const input = page.locator(row.selector).first();
  await input.waitFor({ state: "visible", timeout: 10000 });
  const beforeWrites = apiWrites.length;
  await input.fill(row.fillValue);
  await waitForQuiet(page);
  const value = await input.inputValue();
  const type = await input.getAttribute("type");
  const screenshot = screenshotPath(row.id);
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  const passed = value === row.fillValue && apiWrites.length === beforeWrites && (row.observedMode !== "masked" || type === "password");
  return {
    id: row.id,
    label: row.label,
    selector: row.selector,
    observed_state: row.observedMode === "masked" ? `password field accepted masked local input length ${value.length}` : `email field value ${value}`,
    raw_value_recorded: row.observedMode !== "masked",
    input_type: type,
    screenshot,
    status_decision: passed ? "UI_ONLY final" : "FAIL",
    trace_depth: "ui_state_only",
    api_write_count_delta: apiWrites.length - beforeWrites,
    persistence_claim: false,
    api_write_claim: false,
    native_bridge_claim: false,
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

await page.goto(`${WEB}/?locale=ko&view=auth&authStep=login&ctx=allow`, { waitUntil: "networkidle" });
await page.locator('[data-login-form="email-password"]').waitFor({ state: "visible", timeout: 15000 });

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
    name: `${proof.id} login field local state observed`,
    passed: proof.status_decision === "UI_ONLY final",
    details: { observed_state: proof.observed_state, input_type: proof.input_type }
  })),
  {
    name: "login proof performs no submit/API write",
    passed: apiWrites.length === 0,
    details: { apiWrites }
  },
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
    name: "proof observes no API 5xx",
    passed: api5xx.length === 0,
    details: { api5xx }
  }
];

const result = assertions.every((assertion) => assertion.passed) ? "PASS" : "FAIL";
const proof = {
  schema_version: "law-firm-os.lcx8.desktop-renderer-login-fields-proof.v0.1",
  generated_at: new Date().toISOString(),
  result,
  rows: rows.map((row) => row.id),
  scope: {
    local_browser_runtime: true,
    desktop_renderer_surface: true,
    web_origin: WEB,
    route: "?view=auth&authStep=login",
    trace_depths: ["ui_state_only"],
    status_decision: "UI_ONLY final classification; status remains UI_ONLY",
    persistence_claim: false,
    api_write_claim: false,
    native_bridge_claim: false,
    production_ready_claim: false,
    go_live_claim: false
  },
  source_trace: {
    auth_form: "apps/web/src/components/AuthSurface.jsx AuthForm loginEmail/loginPassword React state; submit handler owns onLogin/native bridge boundary",
    desktop_auth: "apps/desktop/src/main/auth.js MainProcessAuthCoordinator.login sanitizes renderer payload and strips password/token material from returned session payloads"
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
    "UI_ONLY local renderer field-state proof only",
    "no login submit was performed",
    "no API write or native bridge call was performed",
    "no password value is recorded in proof output",
    "no persistence, production-ready, or go-live claim is made"
  ]
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(proof, null, 2)}\n`);
writeFileSync(join(ROOT, MD_PATH), `${[
  "# LCX8 Desktop Renderer Login Fields Proof",
  "",
  `Generated at: ${proof.generated_at}`,
  "",
  `Result: ${proof.result}`,
  "",
  "## Rows",
  "",
  ...rowProofs.map((row) => `- ${row.id}: ${row.status_decision}; ${row.observed_state}; raw_value_recorded=${row.raw_value_recorded}`),
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
