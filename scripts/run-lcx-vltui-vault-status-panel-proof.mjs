#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx-vltui-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx-vltui-vault-status-panel-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx-vltui-vault-status-panel-proof.md`;

const scenarios = [
  {
    id: "unconfigured-missing-token",
    status: 503,
    expectedKind: "guarded",
    expectedReady: "false",
    expectedText: "브리지 설정 필요",
    body: {
      request_id: "vltui-proof-unconfigured",
      outcome: "blocked",
      item: null,
      safe_error_codes: ["MATTER_VAULT_BRIDGE_REQUIRED"],
      audit_hint_ref: "ui_cmp_g5_vault_probe",
      state_idempotent: true,
      count_leak_prevented: true,
      production_ready_claim: false
    }
  },
  {
    id: "ready-synthetic-matter-app-api",
    status: 200,
    expectedKind: "data",
    expectedReady: "true",
    expectedText: "합성 사전검사 가능",
    body: {
      request_id: "vltui-proof-ready",
      outcome: "ok",
      item: {
        source_mode: "matter_app_api",
        client_upsert_path: "/v1/integrations/matter-app/clients/upsert",
        matter_upsert_path: "/v1/integrations/matter-app/matters/upsert",
        runtime_write_ready: true,
        repository_durable: true
      },
      safe_error_codes: [],
      state_idempotent: true,
      count_leak_prevented: true,
      production_ready_claim: false
    }
  },
  {
    id: "projection-only-blocked",
    status: 200,
    expectedKind: "data",
    expectedReady: "false",
    expectedText: "Vault projection-only",
    body: {
      request_id: "vltui-proof-projection-only",
      outcome: "ok",
      item: {
        source_mode: "vault_projection_only",
        client_upsert_path: null,
        matter_upsert_path: null,
        runtime_write_ready: false,
        repository_durable: true
      },
      safe_error_codes: [],
      state_idempotent: true,
      count_leak_prevented: true,
      production_ready_claim: false
    }
  },
  {
    id: "stale-projection-blocked",
    status: 200,
    expectedKind: "data",
    expectedReady: "false",
    expectedText: "Stale projection",
    body: {
      request_id: "vltui-proof-stale-projection",
      outcome: "ok",
      item: {
        source_mode: "stale_projection",
        client_upsert_path: null,
        matter_upsert_path: null,
        runtime_write_ready: false,
        repository_durable: false
      },
      safe_error_codes: ["MATTER_VAULT_BRIDGE_STATUS_UNAVAILABLE"],
      state_idempotent: true,
      count_leak_prevented: true,
      production_ready_claim: false
    }
  },
  {
    id: "claim-boundary-blocked",
    status: 200,
    expectedKind: "data",
    expectedReady: "false",
    expectedText: "운영 승인 주장이 감지",
    body: {
      request_id: "vltui-proof-claim-boundary",
      outcome: "ok",
      item: {
        source_mode: "matter_app_api",
        client_upsert_path: "/v1/integrations/matter-app/clients/upsert",
        matter_upsert_path: "/v1/integrations/matter-app/matters/upsert",
        runtime_write_ready: true,
        repository_durable: true
      },
      safe_error_codes: [],
      state_idempotent: true,
      count_leak_prevented: true,
      production_ready_claim: true
    }
  }
];

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function screenshotPath(id) {
  return `${SCREENSHOT_DIR}/lcx-vltui-02-01-${id}.png`;
}

function renderMarkdown(report) {
  const lines = [
    "# LCX-VLTUI-02.01 Vault Status Panel Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    "| Scenario | HTTP | Kind | Ready | Passed | Screenshot |",
    "| --- | ---: | --- | --- | --- | --- |"
  ];
  for (const item of report.cases) {
    lines.push(`| ${item.id} | ${item.http_status} | ${item.kind} | ${item.ready} | ${item.passed} | ${item.screenshot} |`);
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- Synthetic browser route interception only.");
  lines.push("- No customer document body, storage pointer, bearer token, or external provider write is used.");
  lines.push("- This proof observes bridge-state rendering only and does not approve production use, public release, owner approval, or go-live.");
  return `${lines.join("\n")}\n`;
}

function forbiddenText(text) {
  return /(LAWOS_VAULT_BRIDGE_TOKEN|MATTER_APP_API_TOKEN|Bearer\s+|sk-[A-Za-z0-9]|production_ready_claim|go_live|public_release|owner_final_approval)/i.test(text);
}

async function collectScenario(browser, scenario) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  await page.route("**/api/matters/vault-bridge/status", (route) => {
    route.fulfill({
      status: scenario.status,
      contentType: "application/json",
      body: JSON.stringify(scenario.body)
    });
  });
  try {
    await page.goto(`${WEB}/?locale=ko&view=vault&data=live&ctx=allow#vault-documents`, { waitUntil: "domcontentloaded" });
    const panel = page.locator("[data-lcx-vltui-02-vault-bridge-panel='true']").first();
    await panel.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForFunction(({ selector, expected }) => {
      const node = document.querySelector(selector);
      return node?.getAttribute("data-vault-bridge-kind") === expected;
    }, {
      selector: "[data-lcx-vltui-02-vault-bridge-panel='true']",
      expected: scenario.expectedKind
    });
    const text = compact(await panel.innerText());
    const kind = await panel.getAttribute("data-vault-bridge-kind");
    const ready = await panel.getAttribute("data-vault-bridge-ready");
    const screenshot = screenshotPath(scenario.id);
    await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
    return {
      id: scenario.id,
      http_status: scenario.status,
      kind,
      ready,
      request_id: scenario.body.request_id,
      matched_expected_text: text.includes(scenario.expectedText),
      forbidden_text_detected: forbiddenText(text),
      text,
      screenshot,
      passed:
        kind === scenario.expectedKind &&
        ready === scenario.expectedReady &&
        text.includes(scenario.expectedText) &&
        !forbiddenText(text)
    };
  } finally {
    await page.close();
  }
}

async function main() {
  mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });
  const browser = await chromium.launch();
  try {
    const cases = [];
    for (const scenario of scenarios) {
      cases.push(await collectScenario(browser, scenario));
    }
    const report = {
      schema_version: "law-firm-os.lazycodex.lcx_vltui.vault_status_panel_proof.v0.1",
      tuw_id: "LCX-VLTUI-02.01",
      generated_at: new Date().toISOString(),
      web_url: WEB,
      source_refs: [
        "apps/web/src/components/VaultSurface.jsx",
        "apps/web/src/data/apiClient.js",
        "docs/lazycodex/lcx-vltui-01-vault-bridge-contract-2026-06-29.json"
      ],
      boundary: {
        synthetic_route_interception_only: true,
        customer_document_import_executed: false,
        vault_document_write_enabled: false,
        production_ready: false,
        public_release: false,
        go_live_approved: false,
        owner_final_approval: false
      },
      cases,
      verdict: cases.every((item) => item.passed) ? "PASS" : "FAIL"
    };
    writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(join(ROOT, MD_PATH), renderMarkdown(report));
    console.log(JSON.stringify({
      verdict: report.verdict,
      cases: report.cases.map((item) => ({
        id: item.id,
        kind: item.kind,
        ready: item.ready,
        passed: item.passed,
        screenshot: item.screenshot
      })),
      json: JSON_PATH,
      markdown: MD_PATH
    }, null, 2));
    if (report.verdict !== "PASS") process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
