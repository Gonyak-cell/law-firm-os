#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx-vltui-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx-vltui-browser-qa-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx-vltui-browser-qa-proof.md`;

const documentsBody = {
  request_id: "vltui-browser-qa-vault-documents",
  outcome: "passed",
  items: [
    {
      document_id: "doc_lcx_vltui_alpha",
      matter_id: "matter_lcx_vltui_alpha",
      workspace_id: "vault_workspace_lcx_vltui_alpha",
      title: "Synthetic Alpha Contract",
      status: "current",
      current_version_id: "version_lcx_vltui_alpha_current",
      registered_account: { display_name: "AMIC Vault Records" },
      privilege_label_id: "privileged-review",
      legal_hold_id: null
    }
  ],
  page_info: { limit: 25, has_more: false },
  safe_error_codes: [],
  audit_hint_ref: "ui_cmp_g5_vault_probe",
  ui_state: null,
  count_leak_prevented: true,
  production_ready_claim: false
};

const readyStatusBody = {
  request_id: "vltui-browser-qa-status-ready",
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
  request_id: "vltui-browser-qa-status-projection-only",
  item: {
    ...readyStatusBody.item,
    source_mode: "vault_projection_only",
    runtime_write_ready: false
  }
};

const positiveLookupBody = {
  request_id: "vltui-browser-qa-lookup-positive",
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
  request_id: "vltui-browser-qa-preflight-pass",
  outcome: "preflight_passed",
  item: {
    preflight_ref: "vault-preflight:matter_lcx_vltui_alpha:browser-qa",
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
  request_id: "vltui-browser-qa-preflight-guarded",
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
  return `${SCREENSHOT_DIR}/lcx-vltui-02-06-${id}.png`;
}

function forbiddenText(text) {
  return /(LAWOS_VAULT_BRIDGE_TOKEN|MATTER_APP_API_TOKEN|Bearer\s+|sk-[A-Za-z0-9]|document_bytes|storage_pointer|업로드 완료|전송 완료|go_live|public_release|owner_final_approval)/i.test(text);
}

function renderMarkdown(report) {
  const lines = [
    "# LCX-VLTUI-02.04~02.06 Browser QA Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    "| Scenario | Base State | Preflight Calls | Unexpected Writes | Write Enabled | Passed | Screenshot |",
    "| --- | --- | ---: | ---: | --- | --- | --- |"
  ];
  for (const item of report.cases) {
    lines.push(`| ${item.id} | ${item.base_state} | ${item.preflight_calls} | ${item.unexpected_write_calls} | ${item.boundary_write_enabled} | ${item.passed} | ${item.screenshot} |`);
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- Synthetic browser route interception only.");
  lines.push("- Version upload, metadata mutation, legal hold, retention, and document action controls remain disabled.");
  lines.push("- The only POST allowed in this proof is the reference-only upload preflight permission check.");
  lines.push("- This proof does not execute customer import, document mutation, public release, owner approval, or go-live.");
  return `${lines.join("\n")}\n`;
}

async function basePage(browser, { statusBody = readyStatusBody, preflightBody = passedPreflightBody, preflightStatus = 200 } = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const calls = {
    documents: 0,
    status: 0,
    lookup: 0,
    preflight: 0,
    unexpectedWrites: []
  };
  page.on("request", (request) => {
    const url = request.url();
    if (!url.includes("/api/")) return;
    if (request.method() === "GET") return;
    if (request.method() === "POST" && url.includes("/api/matters/vault-bridge/upload-preflight")) return;
    calls.unexpectedWrites.push({ method: request.method(), url });
  });
  await page.route("**/api/vault/documents?**", (route) => {
    calls.documents += 1;
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(documentsBody) });
  });
  await page.route("**/api/matters/vault-bridge/status", (route) => {
    calls.status += 1;
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(statusBody) });
  });
  await page.route("**/api/matters/vault-bridge/matter-lookup**", (route) => {
    calls.lookup += 1;
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(positiveLookupBody) });
  });
  await page.route("**/api/matters/vault-bridge/upload-preflight", (route) => {
    calls.preflight += 1;
    route.fulfill({ status: preflightStatus, contentType: "application/json", body: JSON.stringify(preflightBody) });
  });
  return { page, calls };
}

async function selectSyntheticMatter(page) {
  const picker = page.locator("[data-lcx-vltui-02-matter-picker='true']").first();
  await picker.waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-matter-picker='true']")?.getAttribute("data-vault-matter-lookup-kind") === "data");
  await page.locator("[data-vault-matter-lookup-results='true'] button").first().click();
  await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-matter-picker='true']")?.getAttribute("data-vault-matter-selected-ref") === "matter:matter_lcx_vltui_alpha");
}

async function boundarySnapshot(page) {
  const panel = page.locator("[data-lcx-vltui-02-action-boundaries='true']").first();
  await panel.waitFor({ state: "visible", timeout: 15000 });
  return panel.evaluate((element) => {
    const rows = Array.from(element.querySelectorAll("[data-vault-boundary-row='true']"));
    const buttons = Array.from(element.querySelectorAll("button"));
    return {
      base_state: element.getAttribute("data-vault-boundary-base-state"),
      boundary_write_enabled: element.getAttribute("data-vault-boundary-write-enabled"),
      preflight_ref: element.getAttribute("data-vault-boundary-preflight-ref"),
      states: {
        version_upload: element.getAttribute("data-vault-version-upload-state"),
        metadata_mutation: element.getAttribute("data-vault-metadata-mutation-state"),
        legal_hold: element.getAttribute("data-vault-legal-hold-state"),
        retention: element.getAttribute("data-vault-retention-state"),
        document_action: element.getAttribute("data-vault-document-action-state")
      },
      row_count: rows.length,
      rows: rows.map((row) => ({
        action: row.getAttribute("data-vault-boundary-action"),
        state: row.getAttribute("data-vault-boundary-state"),
        owner: row.getAttribute("data-vault-boundary-owner"),
        write_enabled: row.getAttribute("data-vault-boundary-write-enabled")
      })),
      disabled_buttons: buttons.length,
      all_buttons_disabled: buttons.every((button) => button.disabled)
    };
  });
}

async function captureBoundaryScreenshot(page, id) {
  await page.locator("[data-lcx-vltui-02-action-boundaries='true']").first().scrollIntoViewIfNeeded();
  const screenshot = screenshotPath(id);
  await page.screenshot({ path: join(ROOT, screenshot), fullPage: true });
  return screenshot;
}

async function readyPreflightPassed(browser) {
  const { page, calls } = await basePage(browser);
  try {
    await page.goto(`${WEB}/?locale=ko&view=vault&data=live&ctx=allow#vault-documents`, { waitUntil: "domcontentloaded" });
    await selectSyntheticMatter(page);
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-upload-preflight='true']")?.getAttribute("data-vault-upload-preflight-state") === "ready-to-check");
    await page.locator("[data-lcx-vltui-02-upload-preflight='true']").first().getByRole("button", { name: "사전검사 실행" }).click();
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-action-boundaries='true']")?.getAttribute("data-vault-boundary-base-state") === "preflight-checked");
    const snapshot = await boundarySnapshot(page);
    const text = compact(await page.locator("[data-lcx-vltui-02-action-boundaries='true']").first().innerText());
    const screenshot = await captureBoundaryScreenshot(page, "boundary-passed");
    return {
      id: "ready-preflight-passed",
      ...snapshot,
      api_calls: calls,
      preflight_calls: calls.preflight,
      unexpected_write_calls: calls.unexpectedWrites.length,
      forbidden_text_detected: forbiddenText(text),
      screenshot,
      passed: snapshot.base_state === "preflight-checked" &&
        snapshot.boundary_write_enabled === "false" &&
        snapshot.states.version_upload === "guarded" &&
        snapshot.states.metadata_mutation === "guarded" &&
        snapshot.states.legal_hold === "owner-blocked" &&
        snapshot.states.retention === "records-blocked" &&
        snapshot.states.document_action === "guarded" &&
        snapshot.row_count === 5 &&
        snapshot.all_buttons_disabled &&
        calls.preflight === 1 &&
        calls.unexpectedWrites.length === 0 &&
        text.includes("새 버전 등록") &&
        text.includes("메타데이터 변경") &&
        text.includes("법적 보존") &&
        text.includes("보존 정책") &&
        !forbiddenText(text)
    };
  } finally {
    await page.close();
  }
}

async function sourceBlocked(browser) {
  const { page, calls } = await basePage(browser, { statusBody: projectionOnlyStatusBody });
  try {
    await page.goto(`${WEB}/?locale=ko&view=vault&data=live&ctx=allow#vault-documents`, { waitUntil: "domcontentloaded" });
    await selectSyntheticMatter(page);
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-action-boundaries='true']")?.getAttribute("data-vault-boundary-base-state") === "source-blocked");
    const snapshot = await boundarySnapshot(page);
    const text = compact(await page.locator("[data-lcx-vltui-02-action-boundaries='true']").first().innerText());
    const screenshot = await captureBoundaryScreenshot(page, "boundary-source-blocked");
    return {
      id: "source-blocked",
      ...snapshot,
      api_calls: calls,
      preflight_calls: calls.preflight,
      unexpected_write_calls: calls.unexpectedWrites.length,
      forbidden_text_detected: forbiddenText(text),
      screenshot,
      passed: snapshot.base_state === "source-blocked" &&
        snapshot.boundary_write_enabled === "false" &&
        Object.values(snapshot.states).every((state) => state === "source-blocked") &&
        snapshot.all_buttons_disabled &&
        calls.preflight === 0 &&
        calls.unexpectedWrites.length === 0 &&
        !forbiddenText(text)
    };
  } finally {
    await page.close();
  }
}

async function guardedPreflight(browser) {
  const { page, calls } = await basePage(browser, {
    preflightBody: guardedPreflightBody,
    preflightStatus: 403
  });
  try {
    await page.goto(`${WEB}/?locale=ko&view=vault&data=live&ctx=allow#vault-documents`, { waitUntil: "domcontentloaded" });
    await selectSyntheticMatter(page);
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-upload-preflight='true']")?.getAttribute("data-vault-upload-preflight-state") === "ready-to-check");
    await page.locator("[data-lcx-vltui-02-upload-preflight='true']").first().getByRole("button", { name: "사전검사 실행" }).click();
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-action-boundaries='true']")?.getAttribute("data-vault-boundary-base-state") === "permission-blocked");
    const snapshot = await boundarySnapshot(page);
    const text = compact(await page.locator("[data-lcx-vltui-02-action-boundaries='true']").first().innerText());
    const screenshot = await captureBoundaryScreenshot(page, "boundary-guarded");
    return {
      id: "guarded-preflight",
      ...snapshot,
      api_calls: calls,
      preflight_calls: calls.preflight,
      unexpected_write_calls: calls.unexpectedWrites.length,
      forbidden_text_detected: forbiddenText(text),
      screenshot,
      passed: snapshot.base_state === "permission-blocked" &&
        snapshot.boundary_write_enabled === "false" &&
        Object.values(snapshot.states).every((state) => state === "permission-blocked") &&
        snapshot.all_buttons_disabled &&
        calls.preflight === 1 &&
        calls.unexpectedWrites.length === 0 &&
        text.includes("권한 차단") &&
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
      await readyPreflightPassed(browser),
      await sourceBlocked(browser),
      await guardedPreflight(browser)
    ];
    const report = {
      schema_version: "law-firm-os.lazycodex.lcx_vltui.browser_qa_proof.v0.1",
      tuw_ids: ["LCX-VLTUI-02.04", "LCX-VLTUI-02.05", "LCX-VLTUI-02.06"],
      generated_at: new Date().toISOString(),
      web_url: WEB,
      source_refs: [
        "apps/web/src/components/VaultSurface.jsx",
        "apps/web/src/styles.css",
        "apps/web/test/ui-regression.test.mjs"
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
        base_state: item.base_state,
        preflight_calls: item.preflight_calls,
        unexpected_write_calls: item.unexpected_write_calls,
        boundary_write_enabled: item.boundary_write_enabled,
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
