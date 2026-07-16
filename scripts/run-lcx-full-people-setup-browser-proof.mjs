#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  PEOPLE_SETUP_PROOF_MD_PATH,
  PEOPLE_SETUP_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-14-screenshots");
const FORBIDDEN_TEXT = /(payroll_calculation_claim\s*[:=]\s*true|payroll_disbursement\s*[:=]\s*true|production go-live\s*[:=]\s*(approved|ready|complete)|public_release\s*[:=]\s*true|Bearer\s+|sk-[A-Za-z0-9])/i;
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

  const role = await capture(page, "people-role", () => ({
    feature_state: document.querySelector("[data-people-feature-state='people-role']")?.getAttribute("data-people-feature-status") ?? "",
    body_sample: document.body.innerText.slice(0, 700)
  }));
  const schedule = await capture(page, "people-work-schedule-external", () => ({
    global_surface: document.querySelector("[data-global-utility-surface='calendar']") !== null,
    decision_required: document.querySelector("[data-global-decision-required='true']") !== null,
    legacy_route_visible: document.querySelector("[data-global-legacy-routes='true']")?.textContent.includes("people#people-work-schedule-external") ?? false,
    body_sample: document.body.innerText.slice(0, 700)
  }));
  const leave = await capture(page, "people-leave", () => ({
    leave_route_mounted: document.querySelector("#people-leave") !== null,
    form_visible: document.querySelector("#people-leave form") !== null,
    body_sample: document.body.innerText.slice(0, 700)
  }));

  snapshot = { role, schedule, leave, page_errors: pageErrors };
  await page.close();
} finally {
  await browser.close();
}

const checks = [
  { id: "role-setup-state-visible", passed: snapshot.role.feature_state === "setup_required" },
  { id: "external-schedule-route-visible", passed: snapshot.schedule.global_surface && snapshot.schedule.decision_required && snapshot.schedule.legacy_route_visible },
  { id: "leave-route-mounted", passed: snapshot.leave.leave_route_mounted && snapshot.leave.form_visible },
  { id: "no-page-errors", passed: snapshot.page_errors.length === 0 },
  { id: "no-forbidden-text", passed: !FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot))) }
];

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.people_setup_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-14.05",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  snapshot,
  checks,
  boundary: {
    browser_observation_only: true,
    payroll_calculation_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(PEOPLE_SETUP_PROOF_PATH, report);
writeText(
  PEOPLE_SETUP_PROOF_MD_PATH,
  `# LCX-FULL-14 People Setup Browser Proof\n\nGenerated at: ${report.generated_at}\n\nVerdict: ${report.verdict}\n\n${markdownTable(checks.map((check) => ({ Check: check.id, Result: check.passed ? "PASS" : "FAIL" })), ["Check", "Result"])}\n\nScreenshots: ${[snapshot.role.screenshot, snapshot.schedule.screenshot, snapshot.leave.screenshot].join(", ")}\n\nBoundary: People setup states are route-visible; no payroll calculation, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: report.verdict, proof: PEOPLE_SETUP_PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
