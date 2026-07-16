#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5174";
const ARTIFACT_DIR = "artifacts/manual-qa";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/d16-hrx-ai-rag-browser-2026-07-03.json`;
const CITED_SCREENSHOT_PATH = `${SCREENSHOT_DIR}/d16-hrx-ai-rag-cited-2026-07-03.png`;
const LIMITED_SCREENSHOT_PATH = `${SCREENSHOT_DIR}/d16-hrx-ai-rag-limited-2026-07-03.png`;

function routeUrl(scopes) {
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
  for (const scope of scopes) params.append("desktop_scope_ref", scope);
  return `${WEB}/?${params.toString()}#people-ai`;
}

function normalizeText(text) {
  return String(text ?? "").replace(/\s+/g, " ").trim();
}

async function driveAssistant(page, scopes, screenshotPath) {
  const requests = [];
  const responses = [];
  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/hrx/ai/")) requests.push({ method: request.method(), url });
  });
  page.on("response", (response) => {
    const url = response.url();
    if (url.includes("/api/hrx/ai/")) responses.push({ status: response.status(), url });
  });

  await page.goto(routeUrl(scopes), { waitUntil: "networkidle", timeout: 20000 });
  await page.locator("#people-ai-assistant").waitFor({ state: "visible", timeout: 15000 });
  await page.getByRole("button", { name: "문의" }).click();
  await page.locator("[data-hrx-ai-source-scope]").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForTimeout(300);
  const text = normalizeText(await page.locator("#people-ai-assistant").innerText());
  const sourceScope = await page.locator("[data-hrx-ai-source-scope]").getAttribute("data-hrx-ai-source-scope");
  await page.screenshot({ path: join(ROOT, screenshotPath), fullPage: true });
  return Object.freeze({
    url: routeUrl(scopes),
    source_scope: sourceScope,
    text,
    screenshot: screenshotPath,
    requests,
    responses,
  });
}

function passed(value) {
  return value === true;
}

mkdirSync(join(ROOT, ARTIFACT_DIR), { recursive: true });
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch();
const citedPage = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const limitedPage = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const consoleMessages = [];
const pageErrors = [];

for (const page of [citedPage, limitedPage]) {
  page.on("console", (message) => {
    if ([ "error", "warning" ].includes(message.type())) consoleMessages.push({ type: message.type(), text: message.text() });
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));
}

let cited;
let limited;
try {
  cited = await driveAssistant(
    citedPage,
    ["hrx.ai.assistant", "hrx.ai.review.read", "hrx.document.read"],
    CITED_SCREENSHOT_PATH,
  );
  limited = await driveAssistant(
    limitedPage,
    ["hrx.ai.assistant", "hrx.ai.review.read"],
    LIMITED_SCREENSHOT_PATH,
  );
} finally {
  await browser.close();
}

const checks = [
  {
    id: "cited-rag-answer-visible",
    passed: cited.source_scope === "cited" && cited.text.includes("참고 자료") && cited.text.includes("취업규칙"),
  },
  {
    id: "limited-scope-insufficient-visible",
    passed: limited.source_scope === "insufficient" && limited.text.includes("권한 범위 내 근거 없음"),
  },
  {
    id: "assistant-post-observed",
    passed: cited.requests.some((request) => request.method === "POST" && request.url.includes("/api/hrx/ai/assistant")) &&
      limited.requests.some((request) => request.method === "POST" && request.url.includes("/api/hrx/ai/assistant")),
  },
  {
    id: "review-route-observed",
    passed: cited.responses.some((response) => response.status === 200 && response.url.includes("/api/hrx/ai/reviews")) &&
      limited.responses.some((response) => response.status === 200 && response.url.includes("/api/hrx/ai/reviews")),
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
  schema_version: "law-firm-os.wave1.upl_d16.hrx_ai_rag.browser_receipt.v0.1",
  generated_at: new Date().toISOString(),
  passed: checks.every((check) => passed(check.passed)),
  route: "people#people-ai",
  scope: {
    local_browser_runtime: true,
    full_text_chunk_index: true,
    actor_scope_bound: true,
    production_ready_claim: false,
    go_live_claim: false,
  },
  cited,
  limited,
  checks,
  consoleMessages,
  pageErrors,
};

writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ passed: receipt.passed, receipt: JSON_PATH, checks }, null, 2));
if (!receipt.passed) process.exit(1);
