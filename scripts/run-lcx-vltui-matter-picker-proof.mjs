#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx-vltui-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx-vltui-matter-picker-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx-vltui-matter-picker-proof.md`;

const readyStatusBody = {
  request_id: "vltui-picker-status-ready",
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
};

const positiveLookupBody = {
  request_id: "vltui-picker-lookup-positive",
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

const guardedLookupBody = {
  request_id: "vltui-picker-lookup-guarded",
  outcome: "blocked",
  items: [],
  safe_error_codes: ["MATTER_VAULT_BRIDGE_BLOCKED"],
  audit_hint_ref: "ui_cmp_g5_vault_probe",
  ui_state: "blocked",
  count_leak_prevented: true,
  production_ready_claim: false
};

function compact(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function screenshotPath(id) {
  return `${SCREENSHOT_DIR}/lcx-vltui-02-02-${id}.png`;
}

function renderMarkdown(report) {
  const lines = [
    "# LCX-VLTUI-02.02 Matter Picker Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    "| Scenario | Kind | Selected | Passed | Screenshot |",
    "| --- | --- | --- | --- | --- |"
  ];
  for (const item of report.cases) {
    lines.push(`| ${item.id} | ${item.kind} | ${item.selected_ref || ""} | ${item.passed} | ${item.screenshot} |`);
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- Synthetic browser route interception only.");
  lines.push("- UUID-shaped normal input is blocked locally before another lookup request is sent.");
  lines.push("- Lookup candidates expose reference-safe Matter and Client labels only.");
  lines.push("- This proof does not execute upload, document mutation, customer import, public release, owner approval, or go-live.");
  return `${lines.join("\n")}\n`;
}

function forbiddenText(text) {
  return /(LAWOS_VAULT_BRIDGE_TOKEN|MATTER_APP_API_TOKEN|Bearer\s+|sk-[A-Za-z0-9]|document_bytes|storage_pointer|production_ready_claim|go_live|public_release|owner_final_approval)/i.test(text);
}

async function basePage(browser, lookupBody = positiveLookupBody) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  let lookupCalls = 0;
  await page.route("**/api/matters/vault-bridge/status", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(readyStatusBody) });
  });
  await page.route("**/api/matters/vault-bridge/matter-lookup**", (route) => {
    lookupCalls += 1;
    const status = lookupBody === guardedLookupBody ? 403 : 200;
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(lookupBody) });
  });
  return { page, getLookupCalls: () => lookupCalls };
}

async function positiveSelection(browser) {
  const { page } = await basePage(browser);
  try {
    await page.goto(`${WEB}/?locale=ko&view=vault&data=live&ctx=allow#vault-documents`, { waitUntil: "domcontentloaded" });
    const picker = page.locator("[data-lcx-vltui-02-matter-picker='true']").first();
    await picker.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-matter-picker='true']")?.getAttribute("data-vault-matter-lookup-kind") === "data");
    await page.locator("[data-vault-matter-lookup-results='true'] button").first().click();
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-matter-picker='true']")?.getAttribute("data-vault-matter-selected-ref") === "matter:matter_lcx_vltui_alpha");
    const text = compact(await picker.innerText());
    const screenshot = screenshotPath("positive-selection");
    await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
    const selectedRef = await picker.getAttribute("data-vault-matter-selected-ref");
    return {
      id: "positive-selection",
      kind: await picker.getAttribute("data-vault-matter-lookup-kind"),
      selected_ref: selectedRef,
      forbidden_text_detected: forbiddenText(text),
      screenshot,
      passed: selectedRef === "matter:matter_lcx_vltui_alpha" && text.includes("SyntheticAlpha/Civil/Contract") && !forbiddenText(text)
    };
  } finally {
    await page.close();
  }
}

async function guardedLookup(browser) {
  const { page } = await basePage(browser, guardedLookupBody);
  try {
    await page.goto(`${WEB}/?locale=ko&view=vault&data=live&ctx=allow#vault-documents`, { waitUntil: "domcontentloaded" });
    const picker = page.locator("[data-lcx-vltui-02-matter-picker='true']").first();
    await picker.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-matter-picker='true']")?.getAttribute("data-vault-matter-lookup-kind") === "guarded");
    const text = compact(await picker.innerText());
    const screenshot = screenshotPath("guarded-lookup");
    await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
    return {
      id: "guarded-lookup",
      kind: await picker.getAttribute("data-vault-matter-lookup-kind"),
      selected_ref: await picker.getAttribute("data-vault-matter-selected-ref"),
      forbidden_text_detected: forbiddenText(text),
      screenshot,
      passed: text.includes("Matter lookup 차단됨") && text.includes("브리지 인증 차단") && !forbiddenText(text)
    };
  } finally {
    await page.close();
  }
}

async function uuidBlocked(browser) {
  const { page, getLookupCalls } = await basePage(browser);
  try {
    await page.goto(`${WEB}/?locale=ko&view=vault&data=live&ctx=allow#vault-documents`, { waitUntil: "domcontentloaded" });
    const picker = page.locator("[data-lcx-vltui-02-matter-picker='true']").first();
    await picker.waitFor({ state: "visible", timeout: 15000 });
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-matter-picker='true']")?.getAttribute("data-vault-matter-lookup-kind") === "data");
    const callsBeforeUuid = getLookupCalls();
    await page.getByLabel("Matter 검색").fill("9f13f7c6-3a9d-4d6d-9412-88db09548c11");
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-matter-picker='true']")?.getAttribute("data-vault-matter-lookup-kind") === "blocked-local");
    await page.waitForTimeout(300);
    const text = compact(await picker.innerText());
    const screenshot = screenshotPath("uuid-local-block");
    await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
    return {
      id: "uuid-local-block",
      kind: await picker.getAttribute("data-vault-matter-lookup-kind"),
      selected_ref: await picker.getAttribute("data-vault-matter-selected-ref"),
      lookup_calls_before_uuid: callsBeforeUuid,
      lookup_calls_after_uuid: getLookupCalls(),
      forbidden_text_detected: forbiddenText(text),
      screenshot,
      passed: text.includes("UUID 직접 입력은 허용하지 않습니다") && getLookupCalls() === callsBeforeUuid && !forbiddenText(text)
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
      await positiveSelection(browser),
      await guardedLookup(browser),
      await uuidBlocked(browser)
    ];
    const report = {
      schema_version: "law-firm-os.lazycodex.lcx_vltui.matter_picker_proof.v0.1",
      tuw_id: "LCX-VLTUI-02.02",
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
        kind: item.kind,
        selected_ref: item.selected_ref,
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
