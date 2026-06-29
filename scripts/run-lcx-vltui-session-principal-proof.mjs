#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx-vltui-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx-vltui-session-principal-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx-vltui-session-principal-proof.md`;
const SESSION_KEY = "lawos.session.envelope";

const sessionEnvelope = {
  schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
  state: "signed_in",
  session_ref: "desktop:user_lcx_vltui_session:7",
  source: "desktop_offline_login",
  actor_ref: "user_lcx_vltui_session",
  tenant_refs: {
    default: "tenant_amic_matter_vault",
    client: "tenant_rp04_synthetic",
    matter: "tenant_rp05_synthetic",
    vault: "tenant_amic_matter_vault",
    crm: "tenant_cmp_g6_synthetic"
  },
  role_ids: ["matter_vault_admin", "matter_runtime_user", "master_data_reader"],
  scopes: ["client_read", "matter_read", "vault_read"],
  review_state: "allow",
  expires_at: "2999-12-31T23:59:59.000Z"
};

const genericClientBody = {
  request_id: "lcx-vltui-04-client-records",
  outcome: "passed",
  items: [
    {
      record_id: "client_lcx_vltui_alpha",
      display_name: "Synthetic Alpha Client",
      model_type: "client"
    }
  ],
  page_info: { limit: 25, has_more: false },
  safe_error_codes: [],
  omitted_fields: [],
  audit_hint_ref: "ui_cmp_r4_master_data_probe",
  ui_state: null
};

const genericMatterCollectionBody = {
  request_id: "lcx-vltui-04-matter-collection",
  outcome: "passed",
  items: [
    {
      matter_id: "matter_lcx_vltui_alpha",
      matter_code: "SyntheticAlpha/Civil/Contract",
      matter_name: "Synthetic Alpha Contract",
      title: "Synthetic Alpha Contract",
      status: "active",
      phase: "document_review",
      client_id: "client_lcx_vltui_alpha",
      client_display_name: "Synthetic Alpha Client",
      owner_display_name: "Matter Owner"
    }
  ],
  page_info: { limit: 25, has_more: false },
  safe_error_codes: [],
  audit_hint_ref: "ui_cmp_g4_matter_probe",
  ui_state: null,
  count_leak_prevented: true,
  production_ready_claim: false
};

const genericVaultCollectionBody = {
  request_id: "lcx-vltui-04-vault-collection",
  outcome: "passed",
  items: [
    {
      document_id: "doc_lcx_vltui_alpha",
      matter_id: "matter_lcx_vltui_alpha",
      title: "Synthetic Alpha Contract",
      status: "active",
      storage_pointer_ref_included: false,
      document_bytes_included: false
    }
  ],
  page_info: { limit: 25, has_more: false },
  safe_error_codes: [],
  audit_hint_ref: "ui_cmp_g5_vault_probe",
  ui_state: null,
  count_leak_prevented: true,
  production_ready_claim: false
};

const genericMatterItemBody = {
  request_id: "lcx-vltui-04-matter-item",
  outcome: "passed",
  item: {
    matter_id: "matter_lcx_vltui_alpha",
    matter_code: "SyntheticAlpha/Civil/Contract",
    matter_name: "Synthetic Alpha Contract",
    client_display_name: "Synthetic Alpha Client",
    document_count: 1
  },
  safe_error_codes: [],
  audit_hint_ref: "ui_cmp_g4_matter_probe",
  ui_state: null,
  count_leak_prevented: true,
  production_ready_claim: false
};

const vaultBridgeStatusBody = {
  request_id: "lcx-vltui-04-vault-bridge",
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

function proofUrl(query) {
  return `${WEB}/${query.startsWith("?") ? query : `?${query}`}`;
}

function classifyRequest(url) {
  if (url.pathname === "/master-data/records") return "client_records";
  if (url.pathname === "/api/matters") return "matter_records";
  if (url.pathname === "/api/vault/documents") return "vault_documents";
  if (url.pathname === "/api/matters/vault-bridge/status") return "vault_bridge_status";
  return null;
}

function responseFor(url) {
  if (url.pathname === "/master-data/records") return genericClientBody;
  if (url.pathname === "/api/matters/vault-bridge/status") return vaultBridgeStatusBody;
  if (url.pathname.startsWith("/api/vault/")) return genericVaultCollectionBody;
  if (url.pathname === "/api/matters") return genericMatterCollectionBody;
  if (url.pathname.startsWith("/api/matters/")) {
    return url.pathname.endsWith("/timeline") || url.pathname.endsWith("/vault-summary")
      ? genericMatterItemBody
      : genericMatterCollectionBody;
  }
  return {
    request_id: "lcx-vltui-04-generic",
    outcome: "passed",
    items: [],
    page_info: { limit: 25, has_more: false },
    safe_error_codes: [],
    audit_hint_ref: "ui_lcx_vltui_04_probe",
    ui_state: null,
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function parsePermissionContext(request) {
  const header = request.headers()["x-lawos-permission-context"];
  if (!header) return null;
  try {
    return JSON.parse(header);
  } catch {
    return { parse_error: true };
  }
}

async function waitForCapture(captured, offset, predicate, label) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const found = captured.slice(offset).find(predicate);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function ruleMode(record) {
  const rules = record.context?.rules ?? [];
  if (rules.length === 0) return "denied";
  if (rules.some((rule) => rule.effect === "review_required")) return "review";
  if (rules.some((rule) => rule.effect === "allow")) return "allow";
  return "unknown";
}

function contextMatches(record, { domain, tenant, mode }) {
  const principal = record.context?.principal ?? {};
  return (
    principal.user_id === sessionEnvelope.actor_ref &&
    principal.tenant_id === tenant &&
    Array.isArray(principal.role_ids) &&
    principal.role_ids.includes("matter_vault_admin") &&
    principal.session_principal_source === "desktop_web_session_envelope" &&
    principal.session_source_ref === "desktop_offline_login" &&
    ruleMode(record) === mode &&
    record.domain === domain
  );
}

function forbiddenHeaderText(captured) {
  const text = JSON.stringify(captured);
  return /@|password|reset|bearer|cookie|secret|credential|authorization|sk-|token_material/i.test(text);
}

function renderMarkdown(report) {
  const rows = report.cases
    .flatMap((item) => item.cases ?? [item])
    .map((item) => `| ${item.id} | ${item.domain} | ${item.expected_mode} | ${item.passed ? "PASS" : "FAIL"} |`)
    .join("\n");
  return `# LCX-VLTUI-04 Session Principal Proof\n\nVerdict: ${report.verdict}\n\n| Case | Domain | Mode | Result |\n|---|---|---|---|\n${rows}\n\nBoundary: no production, go-live, public release, owner approval, bearer, reset token, cookie, password, or customer data execution claim.\n`;
}

async function gotoAndCapture(page, captured, query, predicate, label) {
  const offset = captured.length;
  await page.goto(proofUrl(query), { waitUntil: "domcontentloaded" });
  return waitForCapture(captured, offset, predicate, label);
}

async function runCase(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  await context.addInitScript(
    ({ key, envelope }) => {
      if (!window.sessionStorage.getItem(key)) {
        window.sessionStorage.setItem(key, JSON.stringify(envelope));
      }
    },
    { key: SESSION_KEY, envelope: sessionEnvelope }
  );
  const page = await context.newPage();
  const captured = [];
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const domain = classifyRequest(url);
    const permissionContext = parsePermissionContext(request);
    if (domain && permissionContext) {
      captured.push({
        domain,
        method: request.method(),
        path: url.pathname,
        context: permissionContext
      });
    }

    if (
      url.pathname.startsWith("/api/") ||
      url.pathname === "/master-data/records" ||
      url.pathname.startsWith("/master-data/")
    ) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(responseFor(url))
      });
      return;
    }
    await route.continue();
  });

  try {
    const clientAllow = await gotoAndCapture(
      page,
      captured,
      "?locale=ko&view=clients&data=live&ctx=allow",
      (record) => contextMatches(record, { domain: "client_records", tenant: "tenant_rp04_synthetic", mode: "allow" }),
      "client allow session context"
    );
    const matterAllow = await gotoAndCapture(
      page,
      captured,
      "?locale=ko&view=matters&data=live&ctx=allow",
      (record) => contextMatches(record, { domain: "matter_records", tenant: "tenant_rp05_synthetic", mode: "allow" }),
      "matter allow session context"
    );
    const vaultAllow = await gotoAndCapture(
      page,
      captured,
      "?locale=ko&view=vault&data=live&ctx=allow",
      (record) => contextMatches(record, { domain: "vault_documents", tenant: "tenant_amic_matter_vault", mode: "allow" }),
      "vault allow session context"
    );
    const bridgeAllow = await waitForCapture(
      captured,
      0,
      (record) => contextMatches(record, { domain: "vault_bridge_status", tenant: "tenant_amic_matter_vault", mode: "allow" }),
      "vault bridge session context"
    );

    await page.evaluate(
      ({ key, envelope }) => {
        window.sessionStorage.setItem(key, JSON.stringify({ ...envelope, session_ref: "desktop:user_lcx_vltui_session:review", review_state: "review" }));
      },
      { key: SESSION_KEY, envelope: sessionEnvelope }
    );
    const matterReview = await gotoAndCapture(
      page,
      captured,
      "?locale=ko&view=matters&data=live&ctx=allow",
      (record) => contextMatches(record, { domain: "matter_records", tenant: "tenant_rp05_synthetic", mode: "review" }),
      "matter review session context"
    );

    await page.evaluate(
      ({ key, envelope }) => {
        window.sessionStorage.setItem(key, JSON.stringify(envelope));
      },
      { key: SESSION_KEY, envelope: sessionEnvelope }
    );
    const vaultDenied = await gotoAndCapture(
      page,
      captured,
      "?locale=ko&view=vault&data=live&ctx=denied",
      (record) => contextMatches(record, { domain: "vault_documents", tenant: "tenant_amic_matter_vault", mode: "denied" }),
      "vault denied session context"
    );

    await page.locator("body").screenshot({ path: join(ROOT, SCREENSHOT_DIR, "lcx-vltui-04-session-principal-proof.png") });

    const cases = [
      { id: "client-allow-session-principal", domain: "client", expected_mode: "allow", record: clientAllow },
      { id: "matter-allow-session-principal", domain: "matter", expected_mode: "allow", record: matterAllow },
      { id: "vault-allow-session-principal", domain: "vault", expected_mode: "allow", record: vaultAllow },
      { id: "vault-bridge-allow-session-principal", domain: "vault", expected_mode: "allow", record: bridgeAllow },
      { id: "matter-envelope-review-fail-closed", domain: "matter", expected_mode: "review", record: matterReview },
      { id: "vault-query-denied-fail-closed", domain: "vault", expected_mode: "denied", record: vaultDenied }
    ].map((item) => ({
      ...item,
      passed: ruleMode(item.record) === item.expected_mode && item.record.context.principal.user_id === sessionEnvelope.actor_ref,
      principal: item.record.context.principal,
      rule_effects: item.record.context.rules.map((rule) => rule.effect)
    }));

    return {
      id: "session-principal-headers",
      passed: cases.every((item) => item.passed) && pageErrors.length === 0 && !forbiddenHeaderText(captured),
      session_envelope: {
        schema_version: sessionEnvelope.schema_version,
        source: sessionEnvelope.source,
        actor_ref: sessionEnvelope.actor_ref,
        tenant_refs: sessionEnvelope.tenant_refs,
        role_ids: sessionEnvelope.role_ids,
        scopes: sessionEnvelope.scopes,
        review_state: sessionEnvelope.review_state,
        expires_at: sessionEnvelope.expires_at
      },
      captured_count: captured.length,
      cases,
      page_errors: pageErrors,
      forbidden_header_text_detected: forbiddenHeaderText(captured),
      screenshot: `${SCREENSHOT_DIR}/lcx-vltui-04-session-principal-proof.png`
    };
  } finally {
    await context.close();
  }
}

async function main() {
  mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });
  const browser = await chromium.launch();
  try {
    const result = await runCase(browser);
    const report = {
      schema_version: "law-firm-os.lazycodex.lcx_vltui.session_principal_proof.v0.1",
      tuw_ids: ["LCX-VLTUI-04.01", "LCX-VLTUI-04.02"],
      generated_at: new Date().toISOString(),
      verdict: result.passed ? "PASS" : "FAIL",
      boundary: {
        synthetic_route_interception_only: true,
        session_header_source: "desktop_web_session_envelope",
        customer_data_write_executed: false,
        production_ready: false,
        public_release: false,
        go_live_approved: false,
        owner_final_approval: false,
        secret_material_in_envelope: false,
        secret_material_in_permission_header: false
      },
      cases: [result]
    };
    writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(join(ROOT, MD_PATH), renderMarkdown(report));
    if (report.verdict !== "PASS") {
      console.error(JSON.stringify(report, null, 2));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({
      verdict: report.verdict,
      tuw_ids: report.tuw_ids,
      proof: JSON_PATH,
      markdown: MD_PATH
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
