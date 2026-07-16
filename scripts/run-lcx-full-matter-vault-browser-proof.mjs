#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  MATTER_VAULT_PROOF_MD_PATH,
  MATTER_VAULT_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-06-screenshots");
const FORBIDDEN_TEXT = /(vault_document_write_enabled\s*[:=]\s*true|email_send_complete\s*[:=]\s*true|public_release\s*[:=]\s*true|go_live\s*[:=]\s*true|Bearer\s+|sk-[A-Za-z0-9])/i;
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch({ headless: true });
let snapshot;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${WEB}/?view=matters#matter-vault`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  snapshot = await page.evaluate(() => {
    const boundary = document.querySelector("[data-lcx-vltui-03-document-workspace-boundary='true']");
    const attrs = boundary
      ? {
          source_state: boundary.getAttribute("data-lcx-vltui-03-vault-source-state"),
          preflight_state: boundary.getAttribute("data-lcx-vltui-03-preflight-state"),
          publish_state: boundary.getAttribute("data-lcx-vltui-03-publish-state"),
          publish_write_enabled: boundary.getAttribute("data-lcx-vltui-03-publish-write-enabled"),
          import_dry_run_state: boundary.getAttribute("data-lcx-vltui-03-import-dry-run-state"),
          import_execute_state: boundary.getAttribute("data-lcx-vltui-03-import-execute-state"),
          email_send_state: boundary.getAttribute("data-lcx-vltui-03-email-send-state")
        }
      : {};
    return {
      attrs,
      disabled_count: document.querySelectorAll("button:disabled").length,
      email_provider_blocked: document.querySelector("[data-matter-email-composer='provider-blocked']") !== null,
      body_sample: document.body.innerText.slice(0, 1000)
    };
  });
  const screenshot = `${SCREENSHOT_DIR}/matter-vault.png`;
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  snapshot.screenshot = screenshot;
  await page.close();
} finally {
  await browser.close();
}

const checks = [
  { id: "boundary-mounted", passed: Boolean(snapshot.attrs.publish_state) },
  { id: "publish-write-disabled", passed: snapshot.attrs.publish_write_enabled === "false" },
  { id: "import-execute-blocked", passed: ["preflight-required", "owner-provider-blocked"].includes(snapshot.attrs.import_execute_state) },
  { id: "email-send-guarded", passed: ["draft-required", "provider-blocked"].includes(snapshot.attrs.email_send_state) && snapshot.email_provider_blocked },
  { id: "no-forbidden-text", passed: !FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot))) }
];

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.matter_vault_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-06.05",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  snapshot,
  checks,
  boundary: {
    browser_observation_only: true,
    vault_write_complete_claim: false,
    email_send_complete_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(MATTER_VAULT_PROOF_PATH, report);
writeText(
  MATTER_VAULT_PROOF_MD_PATH,
  [
    "# LCX-FULL-06 Matter Vault Browser Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    markdownTable(checks.map((check) => ({ Check: check.id, Result: check.passed ? "PASS" : "FAIL" })), ["Check", "Result"]),
    "",
    `Screenshot: ${snapshot.screenshot}`,
    "",
    "Boundary: request/preflight/dry-run/email draft states only; no Vault write, external send, go-live, or public release claim."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: report.verdict, proof: MATTER_VAULT_PROOF_PATH, markdown: MATTER_VAULT_PROOF_MD_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
