#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  PEOPLE_GOVERNANCE_PROOF_MD_PATH,
  PEOPLE_GOVERNANCE_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-15-screenshots");
const FORBIDDEN_TEXT = /(direct_permission_mutation_performed\s*[:=]\s*true|sensitive_field_exposed\s*[:=]\s*true|provider production write\s*[:=]\s*(true|ready|complete)|production go-live\s*[:=]\s*(approved|ready|complete)|public_release\s*[:=]\s*true|Bearer\s+|sk-[A-Za-z0-9])/i;
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const SELECTORS = [
  "data-global-utility-surface",
  "data-global-utility-card",
  "data-global-legacy-routes",
  "data-global-conditional-preview"
];

const browser = await chromium.launch({ headless: true });
let snapshot;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`${WEB}/?view=people#people-admin`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(1000);
  snapshot = await page.evaluate((selectors) => {
    const attrs = [];
    for (const selector of selectors) {
      for (const el of document.querySelectorAll(`[${selector}]`)) {
        attrs.push({ name: selector, value: el.getAttribute(selector), text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 180) });
      }
    }
    return { attrs, body_sample: document.body.innerText.slice(0, 1000) };
  }, SELECTORS);
  const screenshot = `${SCREENSHOT_DIR}/people-admin.png`;
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  snapshot.screenshot = screenshot;
  snapshot.page_errors = pageErrors;
  await page.close();
} finally {
  await browser.close();
}

const hasAttr = (name, value = null) => snapshot.attrs.some((attr) => attr.name === name && (value === null || attr.value === value));
const hasLegacyRoute = (route) => snapshot.attrs.some((attr) => attr.name === "data-global-legacy-routes" && attr.text.includes(route));
const checks = [
  { id: "settings-surface-mounted", passed: hasAttr("data-global-utility-surface", "settings") },
  { id: "permissions-card-visible", passed: hasAttr("data-global-utility-card", "settings-permissions") },
  { id: "people-admin-legacy-route-visible", passed: hasLegacyRoute("people#people-admin") },
  { id: "conditional-preview-visible", passed: hasAttr("data-global-conditional-preview", "true") },
  { id: "no-page-errors", passed: snapshot.page_errors.length === 0 },
  { id: "no-forbidden-text", passed: !FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot))) }
];

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.people_governance_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-15.05",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  snapshot,
  checks,
  boundary: {
    browser_observation_only: true,
    direct_permission_mutation_claim: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(PEOPLE_GOVERNANCE_PROOF_PATH, report);
writeText(
  PEOPLE_GOVERNANCE_PROOF_MD_PATH,
  `# LCX-FULL-15 People Governance Browser Proof\n\nGenerated at: ${report.generated_at}\n\nVerdict: ${report.verdict}\n\n${markdownTable(checks.map((check) => ({ Check: check.id, Result: check.passed ? "PASS" : "FAIL" })), ["Check", "Result"])}\n\nScreenshot: ${snapshot.screenshot}\n\nBoundary: people#people-admin resolves to the global settings permission surface in the latest UI; governance actions remain validator-gated with no direct permission mutation, provider production write, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: report.verdict, proof: PEOPLE_GOVERNANCE_PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
