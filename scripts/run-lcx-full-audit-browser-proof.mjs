#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  AUDIT_RECEIPTS_PROOF_MD_PATH,
  AUDIT_RECEIPTS_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-18-screenshots");
const FORBIDDEN_TEXT = /(raw_payload_export_allowed\s*[:=]\s*true|receipt_export_complete\s*[:=]\s*true|production go-live\s*[:=]\s*(approved|ready|complete)|public_release\s*[:=]\s*true|Bearer\s+|sk-[A-Za-z0-9])/i;
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch({ headless: true });
let snapshot;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${WEB}/?view=people#people-audit`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(900);
  const peopleAudit = await page.evaluate(() => ({
    panel_mounted: document.querySelector("#people-audit") !== null,
    table_or_state_visible: document.querySelector("#people-audit table, #people-audit .live-data-state") !== null,
    body_sample: document.body.innerText.slice(0, 900)
  }));
  const peopleScreenshot = `${SCREENSHOT_DIR}/people-audit.png`;
  await page.screenshot({ path: join(ROOT, peopleScreenshot), fullPage: true });

  await page.goto(`${WEB}/?view=settings#settings-advanced`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(700);
  const settingsAudit = await page.evaluate(() => ({
    surface: document.querySelector("[data-global-utility-surface='settings']") !== null,
    audit_required: document.querySelector("[data-global-audit-required='true']") !== null,
    body_sample: document.body.innerText.slice(0, 900)
  }));
  const settingsScreenshot = `${SCREENSHOT_DIR}/settings-advanced-audit.png`;
  await page.screenshot({ path: join(ROOT, settingsScreenshot), fullPage: true });

  snapshot = {
    peopleAudit: { ...peopleAudit, screenshot: peopleScreenshot },
    settingsAudit: { ...settingsAudit, screenshot: settingsScreenshot },
    page_errors: pageErrors
  };
  await page.close();
} finally {
  await browser.close();
}

const checks = [
  { id: "people-audit-mounted", passed: snapshot.peopleAudit.panel_mounted && snapshot.peopleAudit.table_or_state_visible },
  { id: "settings-audit-required-mounted", passed: snapshot.settingsAudit.surface && snapshot.settingsAudit.audit_required },
  { id: "no-page-errors", passed: snapshot.page_errors.length === 0 },
  { id: "no-forbidden-text", passed: !FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot))) }
];

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.audit_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-18.05",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  snapshot,
  checks,
  boundary: {
    browser_observation_only: true,
    raw_payload_export_allowed: false,
    receipt_export_complete_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(AUDIT_RECEIPTS_PROOF_PATH, report);
writeText(
  AUDIT_RECEIPTS_PROOF_MD_PATH,
  `# LCX-FULL-18 Audit Browser Proof\n\nGenerated at: ${report.generated_at}\n\nVerdict: ${report.verdict}\n\n${markdownTable(checks.map((check) => ({ Check: check.id, Result: check.passed ? "PASS" : "FAIL" })), ["Check", "Result"])}\n\nScreenshots: ${[snapshot.peopleAudit.screenshot, snapshot.settingsAudit.screenshot].join(", ")}\n\nBoundary: audit surfaces are visible; no raw payload export, receipt export completion, production go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: report.verdict, proof: AUDIT_RECEIPTS_PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
