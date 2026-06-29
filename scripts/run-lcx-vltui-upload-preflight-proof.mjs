#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx-vltui-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx-vltui-upload-preflight-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx-vltui-upload-preflight-proof.md`;

const readyStatusBody = {
  request_id: "vltui-upload-status-ready",
  outcome: "passed",
  item: {
    source_mode: "matter_app_api",
    client_upsert_path: "/api/matters/vault-bridge/clients/upsert",
    matter_upsert_path: "/api/matters/vault-bridge/matters/upsert",
    runtime_write_ready: true,
    repository_durable: true
  },
  safe_error_codes: [],
  state_idempotent: true,
  count_leak_prevented: true,
  production_ready_claim: false
};

const projectionOnlyStatusBody = {
  ...readyStatusBody,
  request_id: "vltui-upload-status-projection-only",
  item: {
    ...readyStatusBody.item,
    source_mode: "vault_projection_only",
    runtime_write_ready: false
  }
};

const positiveLookupBody = {
  request_id: "vltui-upload-lookup-positive",
  outcome: "passed",
  items: [
    {
      matter_id: "matter_lcx_vltui_alpha",
      matter_code: "SyntheticAlpha/Civil/Contract",
      matter_name: "Synthetic Alpha Contract",
      client_id: "client_lcx_vltui_alpha",
      client_display_name: "Synthetic Alpha Client",
      vault_workspace_id: "vault_workspace_lcx_vltui_alpha",
      source_revision: "lcx-vltui-approval-alpha",
      selected_ref: "matter:matter_lcx_vltui_alpha",
      lookup_label: "SyntheticAlpha/Civil/Contract",
      production_ready_claim: false
    }
  ],
  safe_error_codes: [],
  audit_hint_ref: "ui_cmp_g5_vault_probe",
  ui_state: null,
  count_leak_prevented: true,
  production_ready_claim: false
};

const passedPreflightBody = {
  request_id: "vltui-upload-preflight-pass",
  outcome: "preflight_passed",
  item: {
    preflight_ref: "vault-preflight:matter_lcx_vltui_alpha:browser-proof",
    selected_matter_ref: "matter:matter_lcx_vltui_alpha",
    matter_id: "matter_lcx_vltui_alpha",
    matter_code: "SyntheticAlpha/Civil/Contract",
    matter_name: "Synthetic Alpha Contract",
    client_id: "client_lcx_vltui_alpha",
    client_display_name: "Synthetic Alpha Client",
    action: "upload_preflight",
    allowed_next_step: "permission_check_only",
    source_mode: "matter_app_api",
    permission_checked: true,
    ethical_wall_clear: true,
    lifecycle_eligible: true,
    vault_document_write_enabled: false,
    production_ready_claim: false
  },
  safe_error_codes: [],
  audit_hint_ref: "ui_cmp_g5_vault_probe",
  ui_state: "preflight_passed",
  state_idempotent: true,
  count_leak_prevented: true,
  vault_document_write_enabled: false,
  production_ready_claim: false
};

const guardedPreflightBody = {
  request_id: "vltui-upload-preflight-guarded",
  outcome: "blocked",
  item: null,
  safe_error_codes: ["MATTER_VAULT_BRIDGE_BLOCKED"],
  audit_hint_ref: "ui_cmp_g5_vault_probe",
  ui_state: "blocked",
  state_idempotent: true,
  count_leak_prevented: true,
  vault_document_write_enabled: false,
  production_ready_claim: false
};

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function screenshotPath(id) {
  return `${SCREENSHOT_DIR}/lcx-vltui-02-03-${id}.png`;
}

function renderMarkdown(report) {
  const lines = [
    "# LCX-VLTUI-02.03 Upload Preflight Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    "| Scenario | State | Calls | Write Enabled | Passed | Screenshot |",
    "| --- | --- | ---: | --- | --- | --- |"
  ];
  for (const item of report.cases) {
    lines.push(`| ${item.id} | ${item.state} | ${item.preflight_calls} | ${item.vault_document_write_enabled} | ${item.passed} | ${item.screenshot} |`);
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- Synthetic browser route interception only.");
  lines.push("- The panel never sends document bytes and never reports an upload completion.");
  lines.push("- Source-blocked state keeps the action disabled and records zero preflight calls.");
  lines.push("- Passed state returns a reference-only preflight ref with Vault document write disabled.");
  lines.push("- This proof does not execute customer import, document mutation, public release, owner approval, or go-live.");
  return `${lines.join("\n")}\n`;
}

function forbiddenText(text) {
  return /(LAWOS_VAULT_BRIDGE_TOKEN|MATTER_APP_API_TOKEN|Bearer\s+|sk-[A-Za-z0-9]|document_bytes|storage_pointer|production_ready_claim|업로드 완료|전송 완료|go_live|public_release|owner_final_approval)/i.test(text);
}

async function basePage(browser, { statusBody = readyStatusBody, preflightBody = passedPreflightBody, preflightStatus = 200 } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  let preflightCalls = 0;
  await page.route("**/api/matters/vault-bridge/status", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(statusBody) });
  });
  await page.route("**/api/matters/vault-bridge/matter-lookup**", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(positiveLookupBody) });
  });
  await page.route("**/api/matters/vault-bridge/upload-preflight", (route) => {
    preflightCalls += 1;
    route.fulfill({ status: preflightStatus, contentType: "application/json", body: JSON.stringify(preflightBody) });
  });
  return { page, getPreflightCalls: () => preflightCalls };
}

async function selectSyntheticMatter(page) {
  const picker = page.locator("[data-lcx-vltui-02-matter-picker='true']").first();
  await picker.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-matter-picker='true']")?.getAttribute("data-vault-matter-lookup-kind") === "data");
  await page.locator("[data-vault-matter-lookup-results='true'] button").first().click();
  await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-matter-picker='true']")?.getAttribute("data-vault-matter-selected-ref") === "matter:matter_lcx_vltui_alpha");
}

async function passedPreflight(browser) {
  const { page, getPreflightCalls } = await basePage(browser);
  try {
    await page.goto(`${WEB}/?locale=ko&view=vault&data=live&ctx=allow#vault-documents`, { waitUntil: "domcontentloaded" });
    await selectSyntheticMatter(page);
    const panel = page.locator("[data-lcx-vltui-02-upload-preflight='true']").first();
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-upload-preflight='true']")?.getAttribute("data-vault-upload-preflight-state") === "ready-to-check");
    await panel.getByRole("button", { name: "사전검사 실행" }).click();
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-upload-preflight='true']")?.getAttribute("data-vault-upload-preflight-state") === "passed");
    const text = compact(await panel.innerText());
    const screenshot = screenshotPath("passed");
    await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
    const state = await panel.getAttribute("data-vault-upload-preflight-state");
    const writeEnabled = await panel.getAttribute("data-vault-upload-write-enabled");
    const preflightRef = await panel.getAttribute("data-vault-upload-preflight-ref");
    return {
      id: "passed",
      state,
      preflight_calls: getPreflightCalls(),
      preflight_ref: preflightRef,
      vault_document_write_enabled: writeEnabled,
      forbidden_text_detected: forbiddenText(text),
      screenshot,
      passed: state === "passed" &&
        getPreflightCalls() === 1 &&
        writeEnabled === "false" &&
        preflightRef === passedPreflightBody.item.preflight_ref &&
        text.includes("사전검사 통과") &&
        text.includes("Vault 쓰기는 계속 차단") &&
        !forbiddenText(text)
    };
  } finally {
    await page.close();
  }
}

async function sourceBlocked(browser) {
  const { page, getPreflightCalls } = await basePage(browser, { statusBody: projectionOnlyStatusBody });
  try {
    await page.goto(`${WEB}/?locale=ko&view=vault&data=live&ctx=allow#vault-documents`, { waitUntil: "domcontentloaded" });
    await selectSyntheticMatter(page);
    const panel = page.locator("[data-lcx-vltui-02-upload-preflight='true']").first();
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-upload-preflight='true']")?.getAttribute("data-vault-upload-preflight-state") === "source-blocked");
    const disabled = await panel.getByRole("button", { name: "사전검사 실행" }).isDisabled();
    const text = compact(await panel.innerText());
    const screenshot = screenshotPath("source-blocked");
    await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
    return {
      id: "source-blocked",
      state: await panel.getAttribute("data-vault-upload-preflight-state"),
      preflight_calls: getPreflightCalls(),
      vault_document_write_enabled: await panel.getAttribute("data-vault-upload-write-enabled"),
      action_disabled: disabled,
      forbidden_text_detected: forbiddenText(text),
      screenshot,
      passed: disabled && getPreflightCalls() === 0 && text.includes("사전검사 차단") && !forbiddenText(text)
    };
  } finally {
    await page.close();
  }
}

async function guardedPreflight(browser) {
  const { page, getPreflightCalls } = await basePage(browser, {
    preflightBody: guardedPreflightBody,
    preflightStatus: 403
  });
  try {
    await page.goto(`${WEB}/?locale=ko&view=vault&data=live&ctx=allow#vault-documents`, { waitUntil: "domcontentloaded" });
    await selectSyntheticMatter(page);
    const panel = page.locator("[data-lcx-vltui-02-upload-preflight='true']").first();
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-upload-preflight='true']")?.getAttribute("data-vault-upload-preflight-state") === "ready-to-check");
    await panel.getByRole("button", { name: "사전검사 실행" }).click();
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-upload-preflight='true']")?.getAttribute("data-vault-upload-preflight-state") === "guarded");
    const text = compact(await panel.innerText());
    const screenshot = screenshotPath("guarded");
    await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
    return {
      id: "guarded",
      state: await panel.getAttribute("data-vault-upload-preflight-state"),
      preflight_calls: getPreflightCalls(),
      vault_document_write_enabled: await panel.getAttribute("data-vault-upload-write-enabled"),
      forbidden_text_detected: forbiddenText(text),
      screenshot,
      passed: getPreflightCalls() === 1 &&
        text.includes("사전검사 차단") &&
        text.includes("브리지 인증 차단") &&
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
    const cases = [
      await passedPreflight(browser),
      await sourceBlocked(browser),
      await guardedPreflight(browser)
    ];
    const report = {
      schema_version: "law-firm-os.lazycodex.lcx_vltui.upload_preflight_proof.v0.1",
      tuw_id: "LCX-VLTUI-02.03",
      generated_at: new Date().toISOString(),
      web_url: WEB,
      source_refs: [
        "apps/api/src/matter-runtime-context.js",
        "apps/web/src/components/VaultSurface.jsx",
        "apps/web/src/data/apiClient.js"
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
        state: item.state,
        preflight_calls: item.preflight_calls,
        vault_document_write_enabled: item.vault_document_write_enabled,
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
