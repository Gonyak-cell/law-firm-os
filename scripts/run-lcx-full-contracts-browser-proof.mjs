#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  CONTRACTS_PROOF_MD_PATH,
  CONTRACTS_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-11-screenshots");
const FORBIDDEN_TEXT = /(esign_send_complete\s*[:=]\s*true|envelope_sent\s*[:=]\s*true|production go-live\s*[:=]\s*(approved|ready|complete)|public_release\s*[:=]\s*true|Bearer\s+|sk-[A-Za-z0-9])/i;
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch({ headless: true });
let snapshot;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${WEB}/?view=clients#client-contracts`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  const createButton = page.locator("[data-client-contract-create-action='true'] button").first();
  if (await createButton.isVisible().catch(() => false)) {
    await createButton.click();
    await page.waitForTimeout(300);
  }
  const providerButton = page.locator("[data-client-contract-esign-provider-blocked='true'] button").first();
  if (await providerButton.isVisible().catch(() => false)) {
    const disabled = await providerButton.isDisabled().catch(() => true);
    if (!disabled) {
      await providerButton.click();
      await page.waitForTimeout(300);
    }
  }
  snapshot = await page.evaluate(() => ({
    contracts_connected: document.querySelector("[data-client-contracts-connected='true']") !== null,
    draft_action_visible: document.querySelector("[data-client-contract-create-action='true']") !== null,
    esign_provider_blocked_visible: document.querySelector("[data-client-contract-esign-provider-blocked='true']") !== null,
    disabled_count: document.querySelectorAll("button:disabled").length,
    body_sample: document.body.innerText.slice(0, 1200)
  }));
  const screenshot = `${SCREENSHOT_DIR}/client-contracts.png`;
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  snapshot.screenshot = screenshot;
  snapshot.page_errors = pageErrors;
  await page.close();
} finally {
  await browser.close();
}

const checks = [
  { id: "contracts-route-mounted", passed: snapshot.contracts_connected },
  { id: "draft-action-visible", passed: snapshot.draft_action_visible },
  { id: "esign-provider-blocked-visible", passed: snapshot.esign_provider_blocked_visible },
  { id: "no-page-errors", passed: snapshot.page_errors.length === 0 },
  { id: "no-forbidden-text", passed: !FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot))) }
];

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.contracts_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-11.05",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  snapshot,
  checks,
  boundary: {
    browser_observation_only: true,
    e_sign_send_complete_claim: false,
    envelope_sent_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(CONTRACTS_PROOF_PATH, report);
writeText(
  CONTRACTS_PROOF_MD_PATH,
  `# LCX-FULL-11 Contracts Browser Proof\n\nGenerated at: ${report.generated_at}\n\nVerdict: ${report.verdict}\n\n${markdownTable(checks.map((check) => ({ Check: check.id, Result: check.passed ? "PASS" : "FAIL" })), ["Check", "Result"])}\n\nScreenshot: ${snapshot.screenshot}\n\nBoundary: contract/e-sign route is observable; no envelope sent, external e-sign completion, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: report.verdict, proof: CONTRACTS_PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
