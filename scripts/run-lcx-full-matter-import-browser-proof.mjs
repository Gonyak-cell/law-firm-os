#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  MATTER_IMPORT_PROOF_MD_PATH,
  MATTER_IMPORT_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-08-screenshots");
const SELECTORS = [
  "data-lcx-vltui-06-claim-state",
  "data-lcx-vltui-06-import-execute-blocked",
  "data-sf-b-w05-execute-owner-blocked-action"
];
const FORBIDDEN_TEXT = /(production import complete|production_import_complete\s*[:=]\s*true|raw_rows|Bearer\s+|sk-[A-Za-z0-9])/i;
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch({ headless: true });
let snapshot;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${WEB}/?view=matters#matter-import`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  snapshot = await page.evaluate((selectors) => {
    const attrs = [];
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(`[${selector}]`)) {
        attrs.push({ name: selector, value: el.getAttribute(selector), text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 180) });
      }
    }
    return { attrs, disabled_count: document.querySelectorAll("button:disabled").length, body_sample: document.body.innerText.slice(0, 1000) };
  }, SELECTORS);
  const screenshot = `${SCREENSHOT_DIR}/matter-import.png`;
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  snapshot.screenshot = screenshot;
  await page.close();
} finally {
  await browser.close();
}

const checks = [
  { id: "claim-bounded", passed: snapshot.attrs.some((attr) => attr.name === "data-lcx-vltui-06-claim-state" && attr.value === "bounded") },
  { id: "execute-blocked", passed: snapshot.attrs.some((attr) => attr.name === "data-lcx-vltui-06-import-execute-blocked" && attr.value === "true") },
  { id: "owner-action-visible", passed: snapshot.attrs.some((attr) => attr.name === "data-sf-b-w05-execute-owner-blocked-action") },
  { id: "no-forbidden-text", passed: !FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot))) }
];

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.matter_import_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-08.06",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  snapshot,
  checks,
  boundary: { browser_observation_only: true, production_import_complete_claim: false, raw_rows_included: false }
};

writeJson(MATTER_IMPORT_PROOF_PATH, report);
writeText(
  MATTER_IMPORT_PROOF_MD_PATH,
  `# LCX-FULL-08 Matter Import Browser Proof\n\nGenerated at: ${report.generated_at}\n\nVerdict: ${report.verdict}\n\n${markdownTable(checks.map((check) => ({ Check: check.id, Result: check.passed ? "PASS" : "FAIL" })), ["Check", "Result"])}\n\nScreenshot: ${snapshot.screenshot}\n\nBoundary: execute state is visible and not production-complete.\n`
);

console.log(JSON.stringify({ verdict: report.verdict, proof: MATTER_IMPORT_PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
