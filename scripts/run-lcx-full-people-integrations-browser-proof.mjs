#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  PEOPLE_INTEGRATIONS_PROOF_MD_PATH,
  PEOPLE_INTEGRATIONS_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-16-screenshots");
const FORBIDDEN_TEXT = /(external_send_performed\s*[:=]\s*true|payroll_disbursement_performed\s*[:=]\s*true|payroll_calculation_performed\s*[:=]\s*true|provider production write\s*[:=]\s*(true|ready|complete)|production go-live\s*[:=]\s*(approved|ready|complete)|public_release\s*[:=]\s*true|Bearer\s+|sk-[A-Za-z0-9])/i;
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

async function capture(page, section, evaluate) {
  await page.goto(`${WEB}/?view=people#${section}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  const snapshot = await page.evaluate(evaluate);
  const screenshot = `${SCREENSHOT_DIR}/${section}.png`;
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  return { ...snapshot, screenshot };
}

const browser = await chromium.launch({ headless: true });
let snapshot;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const eContract = await capture(page, "people-econtract-send", () => ({
    global_surface: document.querySelector("[data-global-utility-surface='esign']") !== null,
    legacy_route_visible: document.querySelector("[data-global-legacy-routes='true']")?.textContent.includes("people#people-econtract-send") ?? false,
    body_sample: document.body.innerText.slice(0, 700)
  }));
  const payroll = await capture(page, "people-payroll", () => ({
    payroll_route_mounted: document.querySelector("#people-payroll") !== null,
    preview_button_visible: document.querySelector("#people-payroll button") !== null,
    body_sample: document.body.innerText.slice(0, 700)
  }));
  const message = await capture(page, "people-message-send", () => ({
    global_surface: document.querySelector("[data-global-utility-surface='messages']") !== null,
    legacy_route_visible: document.querySelector("[data-global-legacy-routes='true']")?.textContent.includes("people#people-message-send") ?? false,
    body_sample: document.body.innerText.slice(0, 700)
  }));
  const company = await capture(page, "people-company-integrations", () => ({
    global_surface: document.querySelector("[data-global-utility-surface='settings']") !== null,
    legacy_route_visible: document.querySelector("[data-global-legacy-routes='true']")?.textContent.includes("people#people-company-integrations") ?? false,
    body_sample: document.body.innerText.slice(0, 700)
  }));

  snapshot = { eContract, payroll, message, company, page_errors: pageErrors };
  await page.close();
} finally {
  await browser.close();
}

const checks = [
  { id: "econtract-integration-visible", passed: snapshot.eContract.global_surface && snapshot.eContract.legacy_route_visible },
  { id: "payroll-boundary-visible", passed: snapshot.payroll.payroll_route_mounted && snapshot.payroll.preview_button_visible },
  { id: "message-integration-visible", passed: snapshot.message.global_surface && snapshot.message.legacy_route_visible },
  { id: "company-integration-visible", passed: snapshot.company.global_surface && snapshot.company.legacy_route_visible },
  { id: "no-page-errors", passed: snapshot.page_errors.length === 0 },
  { id: "no-forbidden-text", passed: !FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot))) }
];

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.people_integrations_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-16.05",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  snapshot,
  checks,
  boundary: {
    browser_observation_only: true,
    external_send_claim: false,
    payroll_calculation_claim: false,
    payroll_disbursement_claim: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(PEOPLE_INTEGRATIONS_PROOF_PATH, report);
writeText(
  PEOPLE_INTEGRATIONS_PROOF_MD_PATH,
  `# LCX-FULL-16 People Integrations Browser Proof\n\nGenerated at: ${report.generated_at}\n\nVerdict: ${report.verdict}\n\n${markdownTable(checks.map((check) => ({ Check: check.id, Result: check.passed ? "PASS" : "FAIL" })), ["Check", "Result"])}\n\nScreenshots: ${[snapshot.eContract.screenshot, snapshot.payroll.screenshot, snapshot.message.screenshot, snapshot.company.screenshot].join(", ")}\n\nBoundary: People integration routes are visible through the latest global utility mapping plus the payroll boundary route; no external send, payroll calculation/disbursement, provider production write, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: report.verdict, proof: PEOPLE_INTEGRATIONS_PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
