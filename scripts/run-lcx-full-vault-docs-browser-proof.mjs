#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  VAULT_DOCS_PROOF_MD_PATH,
  VAULT_DOCS_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-07-screenshots");
const EXPECTED_ACTIONS = ["version-upload", "metadata-mutation", "legal-hold", "retention", "document-action"];
const FORBIDDEN_TEXT = /(data-vault-boundary-write-enabled=\"true\"|document_mutation_complete\s*[:=]\s*true|public_release\s*[:=]\s*true|go_live\s*[:=]\s*true|Bearer\s+|sk-[A-Za-z0-9])/i;
mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

const browser = await chromium.launch({ headless: true });
let snapshot;
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${WEB}/?view=vault#vault-documents`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  snapshot = await page.evaluate((expectedActions) => {
    const panel = document.querySelector("[data-lcx-vltui-02-action-boundaries='true']");
    const rows = [...document.querySelectorAll("[data-vault-boundary-row='true']")].map((row) => ({
      action: row.getAttribute("data-vault-boundary-action"),
      state: row.getAttribute("data-vault-boundary-state"),
      owner: row.getAttribute("data-vault-boundary-owner"),
      write_enabled: row.getAttribute("data-vault-boundary-write-enabled"),
      disabled_buttons: [...row.querySelectorAll("button:disabled")].map((button) => button.textContent.trim())
    }));
    return {
      base_state: panel?.getAttribute("data-vault-boundary-base-state") ?? "",
      base_write_enabled: panel?.getAttribute("data-vault-boundary-write-enabled") ?? "",
      rows,
      missing_actions: expectedActions.filter((id) => !rows.some((row) => row.action === id)),
      disabled_count: document.querySelectorAll("button:disabled").length,
      body_sample: document.body.innerText.slice(0, 1000)
    };
  }, EXPECTED_ACTIONS);
  const screenshot = `${SCREENSHOT_DIR}/vault-documents.png`;
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  snapshot.screenshot = screenshot;
  await page.close();
} finally {
  await browser.close();
}

const checks = [
  { id: "five-action-rows", passed: snapshot.rows.length >= 5 && snapshot.missing_actions.length === 0 },
  { id: "base-write-disabled", passed: snapshot.base_write_enabled === "false" },
  { id: "rows-write-disabled", passed: snapshot.rows.every((row) => row.write_enabled === "false") },
  { id: "legal-hold-owner-gated", passed: snapshot.rows.some((row) => row.action === "legal-hold" && /Owner/.test(row.owner)) },
  { id: "retention-records-gated", passed: snapshot.rows.some((row) => row.action === "retention" && /Records/.test(row.owner)) },
  { id: "no-forbidden-text", passed: !FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot))) }
];

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.vault_docs_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-07.06",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  snapshot,
  checks,
  boundary: {
    browser_observation_only: true,
    document_mutation_complete_claim: false,
    owner_decision_claim: false,
    records_policy_receipt_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(VAULT_DOCS_PROOF_PATH, report);
writeText(
  VAULT_DOCS_PROOF_MD_PATH,
  [
    "# LCX-FULL-07 Vault Docs Browser Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    markdownTable(snapshot.rows.map((row) => ({ Action: row.action, State: row.state, Owner: row.owner, Write: row.write_enabled })), ["Action", "State", "Owner", "Write"]),
    "",
    `Screenshot: ${snapshot.screenshot}`,
    "",
    "Boundary: five document action rows are traced and write-disabled; no document mutation, records policy receipt, go-live, or public release claim."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: report.verdict, proof: VAULT_DOCS_PROOF_PATH, markdown: VAULT_DOCS_PROOF_MD_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
