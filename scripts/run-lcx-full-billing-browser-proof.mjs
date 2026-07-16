#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  BILLING_PROOF_MD_PATH,
  BILLING_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-12-screenshots");
const FORBIDDEN_TEXT = /(money_movement_performed\s*[:=]\s*true|tax_invoice_issued_external\s*[:=]\s*true|invoice_issue_complete\s*[:=]\s*true|production go-live\s*[:=]\s*(approved|ready|complete)|public_release\s*[:=]\s*true|Bearer\s+|sk-[A-Za-z0-9])/i;
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch({ headless: true });
let snapshot;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${WEB}/?view=clients#client-billing`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  const client = await page.evaluate(() => ({
    billing_connected: document.querySelector("[data-client-billing-connected='true']") !== null,
    provider_blocked: document.querySelector("[data-client-billing-provider-blocked='true']") !== null,
    body_sample: document.body.innerText.slice(0, 800)
  }));
  const clientScreenshot = `${SCREENSHOT_DIR}/client-billing.png`;
  await page.screenshot({ path: join(ROOT, clientScreenshot), fullPage: true });

  await page.goto(`${WEB}/?view=matters#matter-expenses`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  const matter = await page.evaluate(() => ({
    matter_billing_actions: document.querySelector("[data-matter-billing-actions='true']") !== null,
    disabled_count: document.querySelectorAll("button:disabled").length,
    body_sample: document.body.innerText.slice(0, 1000)
  }));
  const matterScreenshot = `${SCREENSHOT_DIR}/matter-expenses.png`;
  await page.screenshot({ path: join(ROOT, matterScreenshot), fullPage: true });

  snapshot = {
    client,
    matter,
    page_errors: pageErrors,
    screenshots: [clientScreenshot, matterScreenshot]
  };
  await page.close();
} finally {
  await browser.close();
}

const checks = [
  { id: "client-billing-mounted", passed: snapshot.client.billing_connected },
  { id: "client-provider-blocked-visible", passed: snapshot.client.provider_blocked },
  { id: "matter-expenses-mounted", passed: snapshot.matter.matter_billing_actions },
  { id: "no-page-errors", passed: snapshot.page_errors.length === 0 },
  { id: "no-forbidden-text", passed: !FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot))) }
];

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.billing_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-12.05",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  snapshot,
  checks,
  boundary: {
    browser_observation_only: true,
    invoice_issue_complete_claim: false,
    money_movement_claim: false,
    tax_invoice_issue_complete_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(BILLING_PROOF_PATH, report);
writeText(
  BILLING_PROOF_MD_PATH,
  `# LCX-FULL-12 Billing Browser Proof\n\nGenerated at: ${report.generated_at}\n\nVerdict: ${report.verdict}\n\n${markdownTable(checks.map((check) => ({ Check: check.id, Result: check.passed ? "PASS" : "FAIL" })), ["Check", "Result"])}\n\nScreenshots: ${snapshot.screenshots.join(", ")}\n\nBoundary: billing provider states are visible; no invoice issue, money movement, tax invoice external issue, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: report.verdict, proof: BILLING_PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
