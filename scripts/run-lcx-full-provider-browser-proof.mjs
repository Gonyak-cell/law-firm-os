#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import {
  PROVIDER_PROOF_MD_PATH,
  PROVIDER_PROOF_PATH,
  artifactPath,
  compactText,
  markdownTable,
  writeJson,
  writeText
} from "./lcx-full-helpers.mjs";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const SCREENSHOT_DIR = artifactPath("lcx-full-04-screenshots");
const FORBIDDEN_TEXT = /(provider_connected_claim\s*[:=]\s*true|provider_production_write_claim\s*[:=]\s*true|Bearer\s+|sk-[A-Za-z0-9]|refresh_token|id_token)/i;
const READY_STATUS = {
  request_id: "lcx-full-provider-bridge-ready",
  outcome: "ready",
  item: {
    source_mode: "matter_app",
    client_upsert_path: "reference-only",
    matter_upsert_path: "reference-only",
    runtime_write_ready: true,
    repository_durable: true
  },
  safe_error_codes: [],
  state_idempotent: true,
  count_leak_prevented: true,
  production_ready_claim: false
};

mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });

async function collect(page, id, path, selectors, routeReadyStatus = false) {
  if (routeReadyStatus) {
    await page.route("**/api/matters/vault-bridge/status", (route) => {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(READY_STATUS) });
    });
  }
  await page.goto(`${WEB}/${path}`, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(800);
  const snapshot = await page.evaluate((selectorNames) => {
    const attrs = [];
    for (const name of selectorNames) {
      for (const el of document.querySelectorAll(`[${name}]`)) {
        attrs.push({
          name,
          value: el.getAttribute(name),
          text: el.textContent.trim().replace(/\s+/g, " ").slice(0, 180)
        });
      }
    }
    return {
      attrs,
      body_sample: document.body.innerText.slice(0, 1000)
    };
  }, selectors);
  const screenshot = `${SCREENSHOT_DIR}/${id}.png`;
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  return {
    id,
    path,
    screenshot,
    ...snapshot,
    forbidden_text_detected: FORBIDDEN_TEXT.test(compactText(JSON.stringify(snapshot)))
  };
}

const browser = await chromium.launch({ headless: true });
const cases = [];
try {
  const blockedClient = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    cases.push(await collect(blockedClient, "client-provider-blocked", "?view=clients#client-data", [
      "data-enrichment-provider-admin",
      "data-segment-activation",
      "data-sf-b-w07-audit"
    ]));
  } finally {
    await blockedClient.close();
  }

  const blockedMatter = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    cases.push(await collect(blockedMatter, "matter-provider-blocked", "?view=matters#matter-vault", [
      "data-matter-email-composer",
      "data-sf-b-w03-channel-provider-state"
    ]));
  } finally {
    await blockedMatter.close();
  }

  const configuredBridge = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  try {
    cases.push(await collect(configuredBridge, "vault-bridge-configured-readonly", "?view=matters#matter-vault", [
      "data-lcx-vltui-03-vault-source-state",
      "data-lcx-vltui-03-publish-write-enabled"
    ], true));
  } finally {
    await configuredBridge.close();
  }
} finally {
  await browser.close();
}

const checks = cases.map((item) => ({
  case: item.id,
  passed: item.attrs.length > 0 && item.forbidden_text_detected === false
}));
const configured = cases.find((item) => item.id === "vault-bridge-configured-readonly");
checks.push({
  case: "provider-configured-branch-remains-readonly",
  passed: configured?.attrs.some((attr) => attr.name === "data-lcx-vltui-03-vault-source-state" && attr.value === "source-ready") === true &&
    configured?.attrs.some((attr) => attr.name === "data-lcx-vltui-03-publish-write-enabled" && attr.value === "false") === true
});

const report = {
  schema_version: "law-firm-os.lazycodex.lcx_full.provider_browser_proof.v0.1",
  generated_at: new Date().toISOString(),
  tuw_id: "LCX-FULL-04.05",
  verdict: checks.every((check) => check.passed) ? "PASS" : "FAIL",
  cases,
  checks,
  boundary: {
    browser_observation_only: true,
    provider_connected_claim: false,
    provider_production_write_claim: false,
    production_go_live_claim: false,
    public_release_claim: false
  }
};

writeJson(PROVIDER_PROOF_PATH, report);
writeText(
  PROVIDER_PROOF_MD_PATH,
  [
    "# LCX-FULL-04 Provider Browser Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    markdownTable(cases.map((item) => ({ Case: item.id, Attrs: item.attrs.length, Screenshot: item.screenshot })), ["Case", "Attrs", "Screenshot"]),
    "",
    "Boundary: provider-blocked and provider-configured-readonly UI states only; no provider connection or production write claim."
  ].join("\n") + "\n"
);

console.log(JSON.stringify({ verdict: report.verdict, proof: PROVIDER_PROOF_PATH, markdown: PROVIDER_PROOF_MD_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
