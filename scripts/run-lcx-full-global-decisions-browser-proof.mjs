#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  GLOBAL_DECISIONS_PROOF_MD_PATH,
  GLOBAL_DECISIONS_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-17-screenshots");
const FORBIDDEN_TEXT = /(permanent_global_promotion_claim\s*[:=]\s*true|go-live approved\s*[:=]\s*(true|approved)|production go-live\s*[:=]\s*(approved|ready|complete)|public_release\s*[:=]\s*true|Bearer\s+|sk-[A-Za-z0-9])/i;
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

async function capture(page, url, screenshotName) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  const snapshot = await page.evaluate(() => ({
    surface: document.querySelector("[data-global-utility-surface]")?.getAttribute("data-global-utility-surface") ?? "",
    conditional: document.querySelector("[data-global-conditional]")?.getAttribute("data-global-conditional") ?? "",
    decision_required: document.querySelector("[data-global-decision-required='true']") !== null,
    audit_required: document.querySelector("[data-global-audit-required='true']") !== null,
    legacy_routes: document.querySelector("[data-global-legacy-routes='true']")?.textContent.trim().replace(/\s+/g, " ") ?? "",
    body_sample: document.body.innerText.slice(0, 900)
  }));
  const screenshot = `${SCREENSHOT_DIR}/${screenshotName}.png`;
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  return { ...snapshot, screenshot };
}

const browser = await chromium.launch({ headless: true });
let snapshot;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  const calendar = await capture(page, `${WEB}/?view=calendar#calendar-people-external`, "calendar-people-external");
  const finance = await capture(page, `${WEB}/?view=finance#finance-matter-billing`, "finance-matter-billing");
  const dataImport = await capture(page, `${WEB}/?view=data-import#data-import-client`, "data-import-client");
  const policies = await capture(page, `${WEB}/?view=policies#policies-documents`, "policies-documents");
  const settingsAdvanced = await capture(page, `${WEB}/?view=settings#settings-advanced`, "settings-advanced");
  snapshot = { calendar, finance, dataImport, policies, settingsAdvanced, page_errors: pageErrors };
  await page.close();
} finally {
  await browser.close();
}

const checks = [
  { id: "calendar-decision-visible", passed: snapshot.calendar.surface === "calendar" && snapshot.calendar.decision_required },
  { id: "finance-decision-visible", passed: snapshot.finance.surface === "finance" && snapshot.finance.decision_required },
  { id: "data-import-decision-visible", passed: snapshot.dataImport.surface === "data-import" && snapshot.dataImport.decision_required },
  { id: "policies-decision-visible", passed: snapshot.policies.surface === "policies" && snapshot.policies.decision_required },
  { id: "settings-audit-required-visible", passed: snapshot.settingsAdvanced.surface === "settings" && snapshot.settingsAdvanced.audit_required },
  { id: "no-page-errors", passed: snapshot.page_errors.length === 0 },
  { id: "no-forbidden-text", passed: !FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot))) }
];

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.global_decisions_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-17.06",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  snapshot,
  checks,
  boundary: {
    browser_observation_only: true,
    permanent_global_promotion_claim: false,
    go_live_approved: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(GLOBAL_DECISIONS_PROOF_PATH, report);
writeText(
  GLOBAL_DECISIONS_PROOF_MD_PATH,
  `# LCX-FULL-17 Global Decisions Browser Proof\n\nGenerated at: ${report.generated_at}\n\nVerdict: ${report.verdict}\n\n${markdownTable(checks.map((check) => ({ Check: check.id, Result: check.passed ? "PASS" : "FAIL" })), ["Check", "Result"])}\n\nScreenshots: ${[snapshot.calendar.screenshot, snapshot.finance.screenshot, snapshot.dataImport.screenshot, snapshot.policies.screenshot, snapshot.settingsAdvanced.screenshot].join(", ")}\n\nBoundary: global decisions and audit-required settings are visible; no permanent promotion, go-live approval, production go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: report.verdict, proof: GLOBAL_DECISIONS_PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
