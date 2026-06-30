#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  MATTER_COMMS_PROOF_MD_PATH,
  MATTER_COMMS_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-13-screenshots");
const FORBIDDEN_TEXT = /(external_message_sent\s*[:=]\s*true|email_send_complete\s*[:=]\s*true|message_send_complete\s*[:=]\s*true|production go-live\s*[:=]\s*(approved|ready|complete)|public_release\s*[:=]\s*true|Bearer\s+|sk-[A-Za-z0-9]|@[A-Za-z0-9.-]+)/i;
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch({ headless: true });
let snapshot;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`${WEB}/?view=matters#matter-vault`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  const draftButton = page.locator("[data-sf-b-w04-email-draft-action='true']").first();
  if (await draftButton.isVisible().catch(() => false)) {
    await draftButton.click();
    await page.waitForTimeout(300);
  }
  const sendButton = page.locator("[data-sf-b-w04-email-send-boundary-action='true']").first();
  if (await sendButton.isVisible().catch(() => false)) {
    const disabled = await sendButton.isDisabled().catch(() => true);
    if (!disabled) {
      await sendButton.click();
      await page.waitForTimeout(300);
    }
  }
  const vault = await page.evaluate(() => ({
    composer_mounted: document.querySelector("[data-sf-b-w04-email-composer='true']") !== null,
    provider_blocked_composer: document.querySelector("[data-matter-email-composer='provider-blocked']") !== null,
    draft_result: document.querySelector("[data-sf-b-w04-email-draft-result='true']") !== null,
    send_boundary_action: document.querySelector("[data-sf-b-w04-email-send-boundary-action='true']") !== null,
    provider_blocked_result: document.querySelector("[data-sf-b-w04-email-send-provider-blocked='true']") !== null,
    body_sample: document.body.innerText.slice(0, 1000).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+/gi, "[redacted-email]")
  }));
  const vaultScreenshot = `${SCREENSHOT_DIR}/matter-vault-email.png`;
  await page.screenshot({ path: join(ROOT, vaultScreenshot), fullPage: true });

  await page.goto(`${WEB}/?view=matters#matter-channel`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  const channel = await page.evaluate(() => ({
    channel_workspace: document.querySelector("[data-sf-b-w03-channel-workspace='true']") !== null,
    channel_composer: document.querySelector("[data-sf-b-w03-channel-composer='true']") !== null,
    provider_blocked_result: document.querySelector("[data-sf-b-w03-provider-blocked-result='true']") !== null,
    body_sample: document.body.innerText.slice(0, 1000).replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+/gi, "[redacted-email]")
  }));
  const channelScreenshot = `${SCREENSHOT_DIR}/matter-channel.png`;
  await page.screenshot({ path: join(ROOT, channelScreenshot), fullPage: true });

  snapshot = {
    vault,
    channel,
    page_errors: pageErrors,
    screenshots: [vaultScreenshot, channelScreenshot]
  };
  await page.close();
} finally {
  await browser.close();
}

const checks = [
  { id: "vault-email-composer-mounted", passed: snapshot.vault.composer_mounted },
  { id: "vault-provider-blocked-visible", passed: snapshot.vault.provider_blocked_composer },
  { id: "vault-send-boundary-result-visible", passed: snapshot.vault.provider_blocked_result },
  { id: "matter-channel-provider-visible", passed: snapshot.channel.channel_workspace && snapshot.channel.provider_blocked_result },
  { id: "no-page-errors", passed: snapshot.page_errors.length === 0 },
  { id: "no-forbidden-text", passed: !FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot))) }
];

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.matter_comms_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-13.05",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  snapshot,
  checks,
  boundary: {
    browser_observation_only: true,
    external_message_sent_claim: false,
    provider_send_complete_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(MATTER_COMMS_PROOF_PATH, report);
writeText(
  MATTER_COMMS_PROOF_MD_PATH,
  `# LCX-FULL-13 Matter Comms Browser Proof\n\nGenerated at: ${report.generated_at}\n\nVerdict: ${report.verdict}\n\n${markdownTable(checks.map((check) => ({ Check: check.id, Result: check.passed ? "PASS" : "FAIL" })), ["Check", "Result"])}\n\nScreenshots: ${snapshot.screenshots.join(", ")}\n\nBoundary: Matter communication draft/request/provider-blocked states are visible; no external send, go-live, or public release claim.\n`
);

console.log(JSON.stringify({ verdict: report.verdict, proof: MATTER_COMMS_PROOF_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
