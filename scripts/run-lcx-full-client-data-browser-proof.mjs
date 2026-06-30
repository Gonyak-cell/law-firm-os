#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  CLIENT_DATA_PROOF_MD_PATH,
  CLIENT_DATA_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-10-screenshots");
const SELECTORS = [
  "data-data-cloud-enrichment",
  "data-enrichment-provider-admin",
  "data-sf-b-w07-enrichment-job-action",
  "data-sf-b-w07-enrichment-preview",
  "data-sf-b-w07-enrichment-execute-provider-blocked-action",
  "data-identity-resolution",
  "data-segment-activation",
  "data-sf-b-w07-audit"
];
const FORBIDDEN_TEXT = /(provider enrichment live|provider_enrichment_live\s*[:=]\s*true|raw_provider|raw_identifier|Bearer\s+|sk-[A-Za-z0-9])/i;
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch({ headless: true });
let snapshot;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${WEB}/?view=clients#client-data`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  snapshot = await page.evaluate((selectors) => {
    const attrs = [];
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(`[${selector}]`)) {
        attrs.push({ name: selector, value: el.getAttribute(selector), text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 180) });
      }
    }
    return { attrs, disabled_count: document.querySelectorAll("button:disabled").length, body_sample: document.body.innerText.slice(0, 1200) };
  }, SELECTORS);
  const screenshot = `${SCREENSHOT_DIR}/client-data.png`;
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  snapshot.screenshot = screenshot;
  await page.close();
} finally {
  await browser.close();
}

const has = (name, value) => snapshot.attrs.some((attr) => attr.name === name && (value === undefined || attr.value === value));
const checks = [
  { id: "workspace-mounted", passed: has("data-data-cloud-enrichment") },
  { id: "provider-blocked", passed: has("data-enrichment-provider-admin", "provider-blocked") },
  { id: "job-action-visible", passed: has("data-sf-b-w07-enrichment-job-action") },
  { id: "execute-provider-blocked", passed: has("data-sf-b-w07-enrichment-execute-provider-blocked-action") },
  { id: "identity-review-visible", passed: has("data-identity-resolution") },
  { id: "segment-provider-blocked", passed: has("data-segment-activation", "provider-blocked") },
  { id: "audit-redaction-visible", passed: has("data-sf-b-w07-audit") },
  { id: "no-forbidden-text", passed: !FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot))) }
];

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.client_data_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-10.06",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  snapshot,
  checks,
  boundary: { browser_observation_only: true, provider_enrichment_live_claim: false, provider_receipt_claim: false }
};

writeJson(CLIENT_DATA_PROOF_PATH, report);
writeText(
  CLIENT_DATA_PROOF_MD_PATH,
  `# LCX-FULL-10 Client Data Browser Proof\n\nGenerated at: ${report.generated_at}\n\nVerdict: ${report.verdict}\n\n${markdownTable(checks.map((check) => ({ Check: check.id, Result: check.passed ? "PASS" : "FAIL" })), ["Check", "Result"])}\n\nScreenshot: ${snapshot.screenshot}\n\nBoundary: provider/owner/consent states are observable without provider enrichment live claim.\n`
);

console.log(JSON.stringify({ verdict: report.verdict, proof: CLIENT_DATA_PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
