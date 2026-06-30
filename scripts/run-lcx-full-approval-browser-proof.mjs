#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  APPROVAL_PROOF_MD_PATH,
  APPROVAL_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-03-screenshots");
const ROUTES = [
  ["client-owner-bulk", "?view=clients#client-billing", ["data-sf-b-w02-owner-blocked-action"]],
  ["client-import-execute", "?view=clients#client-import", ["data-sf-b-w05-execute-owner-blocked-action"]],
  ["matter-owner-bulk", "?view=matters#matter-vault", ["data-sf-b-w02-matter-owner-blocked-action"]],
  ["legal-hold", "?view=vault#vault-documents", ["data-vault-boundary-owner"]]
];
const FORBIDDEN_TEXT = /(owner_approval_claim\s*[:=]\s*true|go_live\s*[:=]\s*true|production_ready\s*[:=]\s*true|Bearer\s+|sk-[A-Za-z0-9])/i;
const EXPECTED_HTTP_FAILURES = [
  { status: 403, pattern: /\/api\/matters\/vault-bridge\/status$/ },
  { status: 404, pattern: /\/api\/matters\/vault-bridge\/matter-lookup\?/ },
  { status: 404, pattern: /\/api\/crm\/(activities|proposals|client-settings)\?/ }
];

mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

function classifyHttpFailure(failure) {
  return { ...failure, expected: EXPECTED_HTTP_FAILURES.some((entry) => failure.status === entry.status && entry.pattern.test(failure.url)) };
}

async function collectRoute(page, id, path, selectors) {
  const httpFailures = [];
  const consoleErrors = [];
  const pageErrors = [];
  page.on("response", (response) => {
    if (response.status() >= 400) httpFailures.push({ status: response.status(), url: response.url(), type: response.request().resourceType() });
  });
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${WEB}/${path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(650);
  const snapshot = await page.evaluate((selectorNames) => {
    const attrs = [];
    for (const name of selectorNames) {
      for (const el of document.querySelectorAll(`[${name}]`)) {
        attrs.push({
          name,
          value: el.getAttribute(name),
          text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 160),
          disabled_buttons: [...el.querySelectorAll("button:disabled")].map((button) => button.textContent.trim()).filter(Boolean)
        });
      }
    }
    return {
      attrs,
      body_sample: document.body.innerText.slice(0, 1000)
    };
  }, selectors);
  const screenshot = `${SCREENSHOT_DIR}/${id}.png`;
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  const classifiedHttpFailures = httpFailures.map(classifyHttpFailure);
  return {
    id,
    path,
    screenshot,
    ...snapshot,
    console_unexpected_errors: consoleErrors.filter((error) => !/^Failed to load resource:/.test(error)),
    unexpected_http_failures: classifiedHttpFailures.filter((failure) => !failure.expected),
    page_errors: pageErrors,
    forbidden_text_detected: FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot)))
  };
}

const browser = await chromium.launch({ headless: true });
const routes = [];
try {
  for (const [id, path, selectors] of ROUTES) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    try {
      routes.push(await collectRoute(page, id, path, selectors));
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
}

const checks = routes.map((route) => ({
  route: route.id,
  passed: route.attrs.length > 0 &&
    route.console_unexpected_errors.length === 0 &&
    route.unexpected_http_failures.length === 0 &&
    route.page_errors.length === 0 &&
    route.forbidden_text_detected === false
}));

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.approval_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-03.05",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  routes,
  checks,
  boundary: {
    browser_observation_only: true,
    owner_approval_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(APPROVAL_PROOF_PATH, report);
writeText(
  APPROVAL_PROOF_MD_PATH,
  [
    "# LCX-FULL-03 Approval Browser Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    markdownTable(routes.map((route) => ({ Route: route.id, Attrs: route.attrs.length, Screenshot: route.screenshot })), ["Route", "Attrs", "Screenshot"]),
    "",
    "Boundary: observable owner-blocked/request states only; no owner approval, production go-live, or public release claim."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: report.verdict, proof: APPROVAL_PROOF_PATH, markdown: APPROVAL_PROOF_MD_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
