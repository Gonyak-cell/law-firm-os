#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx-vltui-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx-vltui-closeout-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx-vltui-closeout-proof.md`;

const SAFE_FORBIDDEN_TEXT = /(LAWOS_VAULT_BRIDGE_TOKEN|MATTER_APP_API_TOKEN|Bearer\s+|sk-[A-Za-z0-9]|document_bytes|storage_pointer|raw_cookie|refresh_token|id_token|go_live\s*=\s*true|public_release\s*=\s*true|owner_final_approval\s*=\s*true)/i;

const safeCollection = (requestId, items = []) => ({
  request_id: requestId,
  outcome: "passed",
  items,
  page_info: { limit: 25, has_more: false },
  safe_error_codes: [],
  omitted_fields: [],
  audit_hint_ref: `${requestId}_audit`,
  ui_state: items.length ? "ready" : "empty",
  count_leak_prevented: true,
  production_ready_claim: false
});

const syntheticMatter = {
  matter_id: "matter_lcx_vltui_alpha",
  matter_number: "SyntheticAlpha/Civil/Contract",
  matter_name: "Synthetic Alpha Contract",
  title: "Synthetic Alpha Contract",
  status: "open",
  risk_level: "medium",
  client_id: "client_lcx_vltui_alpha",
  legal_client_party_id: "client_lcx_vltui_alpha",
  client_display_name: "Synthetic Alpha Client",
  client_name: "Synthetic Alpha Client",
  vault_workspace_id: "vault_workspace_lcx_vltui_alpha",
  matter_vault_link: {
    matter_id: "matter_lcx_vltui_alpha",
    matter_code: "SyntheticAlpha/Civil/Contract",
    vault_workspace_id: "vault_workspace_lcx_vltui_alpha"
  }
};

const syntheticClient = {
  id: "client_lcx_vltui_alpha",
  client_id: "client_lcx_vltui_alpha",
  account_id: "client_lcx_vltui_alpha",
  display_name: "Synthetic Alpha Client",
  legal_name: "Synthetic Alpha Client",
  account_name: "Synthetic Alpha Client",
  account_source: "crm-runtime.Account",
  contact_source: "crm-runtime.Contact",
  status: "active"
};

const syntheticOpportunity = {
  opportunity_id: "opp_lcx_vltui_alpha",
  client_id: "client_lcx_vltui_alpha",
  account_id: "client_lcx_vltui_alpha",
  title: "Synthetic Alpha intake",
  stage: "qualified",
  amount: 1000,
  intake_request_id: null
};

const syntheticIntake = {
  intake_request_id: "intake_lcx_vltui_alpha",
  opportunity_id: "opp_lcx_vltui_alpha",
  client_id: "client_lcx_vltui_alpha",
  status: "review_ready",
  title: "Synthetic Alpha intake"
};

const syntheticDocument = {
  document_id: "doc_lcx_vltui_alpha",
  matter_id: syntheticMatter.matter_id,
  workspace_id: syntheticMatter.vault_workspace_id,
  title: "Synthetic Alpha Contract",
  status: "current",
  current_version_id: "version_lcx_vltui_alpha_current",
  registered_account: { display_name: "AMIC Vault Records" },
  privilege_label_id: "privileged-review",
  legal_hold_id: null
};

function markdown(report) {
  const lines = [
    "# LCX-VLTUI-90 Closeout Proof",
    "",
    `Generated at: ${report.generated_at}`,
    "",
    `Verdict: ${report.verdict}`,
    "",
    "| Case | Surface | Checks | Console Errors | API 4xx/5xx | Unexpected Writes | Screenshot |",
    "| --- | --- | ---: | ---: | ---: | ---: | --- |"
  ];
  for (const item of report.cases) {
    lines.push(`| ${item.id} | ${item.surface} | ${item.checks.filter((check) => check.passed).length}/${item.checks.length} | ${item.console_errors.length} | ${item.api_error_count} | ${item.unexpected_write_count} | ${item.screenshot} |`);
  }
  lines.push("");
  lines.push("## Boundary");
  lines.push("");
  lines.push("- Synthetic browser route interception only.");
  lines.push("- Client, Matter, Vault, People, global utility, and profile surfaces were browser-mounted.");
  lines.push("- Allowed POSTs are limited to reference-only CRM handoff, Matter recently-viewed audit, and Vault upload preflight.");
  lines.push("- No customer document import, Vault document mutation, provider send, owner final approval, public release, production readiness, or go-live is claimed.");
  return `${lines.join("\n")}\n`;
}

function routeBody(url, method) {
  const { pathname } = new URL(url);
  if (pathname === "/api/profile/me") {
    return {
      status: 200,
      body: {
        request_id: "lcx_vltui_90_profile",
        outcome: "passed",
        item: {
          display_name: "Session Operator",
          role_count: 3,
          contract_summary: { state: "connected" }
        },
        safe_error_codes: [],
        audit_hint_ref: "ui_profile_me_probe",
        ui_state: "ready",
        count_leak_prevented: true,
        production_ready_claim: false
      }
    };
  }

  if (pathname === "/api/hrx/employees") {
    return {
      status: 200,
      body: {
        employees: [
          {
            employee_id: "employee_lcx_vltui_alpha",
            display_name: "Synthetic People Member",
            status: "active",
            department: "Legal Ops",
            role_title: "Matter Coordinator"
          }
        ]
      }
    };
  }

  if (pathname === "/api/matters/vault-bridge/status") {
    return {
      status: 200,
      body: {
        request_id: "lcx_vltui_90_bridge_status",
        outcome: "passed",
        item: {
          source_mode: "matter_app_api",
          client_upsert_path: "/api/matters/vault-bridge/clients/upsert",
          matter_upsert_path: "/api/matters/vault-bridge/matters/upsert",
          runtime_write_ready: true,
          repository_durable: true
        },
        safe_error_codes: [],
        audit_hint_ref: "ui_cmp_g5_vault_probe",
        state_idempotent: true,
        count_leak_prevented: true,
        production_ready_claim: false
      }
    };
  }

  if (pathname === "/api/matters/vault-bridge/matter-lookup") {
    return {
      status: 200,
      body: {
        ...safeCollection("lcx_vltui_90_matter_lookup", [
          {
            matter_id: syntheticMatter.matter_id,
            matter_code: syntheticMatter.matter_number,
            matter_name: syntheticMatter.title,
            client_id: syntheticMatter.client_id,
            client_display_name: syntheticMatter.client_display_name,
            vault_workspace_id: syntheticMatter.vault_workspace_id,
            source_revision: "lcx-vltui-90",
            selected_ref: `matter:${syntheticMatter.matter_id}`,
            lookup_label: syntheticMatter.matter_number,
            production_ready_claim: false
          }
        ]),
        count_leak_prevented: true
      }
    };
  }

  if (pathname === "/api/matters/vault-bridge/upload-preflight") {
    return {
      status: 200,
      body: {
        request_id: "lcx_vltui_90_upload_preflight",
        outcome: "preflight_passed",
        item: {
          preflight_ref: "vault-preflight:matter_lcx_vltui_alpha:lcx-vltui-90",
          selected_matter_ref: `matter:${syntheticMatter.matter_id}`,
          matter_id: syntheticMatter.matter_id,
          matter_code: syntheticMatter.matter_number,
          matter_name: syntheticMatter.title,
          client_id: syntheticMatter.client_id,
          client_display_name: syntheticMatter.client_display_name,
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
      }
    };
  }

  if (pathname === "/api/vault/documents") {
    return { status: 200, body: safeCollection("lcx_vltui_90_vault_documents", [syntheticDocument]) };
  }

  if (pathname === "/api/matters" && method === "GET") {
    return { status: 200, body: safeCollection("lcx_vltui_90_matters", [syntheticMatter]) };
  }

  if (pathname === "/api/matters/list-views") {
    return {
      status: 200,
      body: safeCollection("lcx_vltui_90_matter_list_views", [
        { list_view_id: "matter_list_lcx_vltui", label: "Open Matters", filter_status: "open" }
      ])
    };
  }

  if (pathname === "/api/matters/recently-viewed") {
    return { status: 200, body: safeCollection("lcx_vltui_90_recent_matters", [syntheticMatter]) };
  }

  if (pathname.endsWith("/recently-viewed") && method === "POST") {
    return {
      status: 200,
      body: {
        request_id: "lcx_vltui_90_recent_write",
        outcome: "passed",
        item: syntheticMatter,
        safe_error_codes: [],
        audit_hint_ref: "ui_sf_b_w02_recently_viewed_probe",
        ui_state: "ready",
        production_ready_claim: false
      }
    };
  }

  if (pathname.endsWith("/command-center") || pathname.endsWith("/vault-summary")) {
    return {
      status: 200,
      body: {
        request_id: "lcx_vltui_90_matter_item",
        outcome: "passed",
        item: syntheticMatter,
        team: [],
        client_report: { client_id: syntheticMatter.client_id, status: "linked" },
        vault_summary: { vault_workspace_id: syntheticMatter.vault_workspace_id, status: "linked" },
        matter_vault_link: syntheticMatter.matter_vault_link,
        safe_error_codes: [],
        audit_hint_ref: "ui_mv_matter_probe",
        ui_state: "ready",
        count_leak_prevented: true,
        production_ready_claim: false
      }
    };
  }

  if (pathname.endsWith("/timeline")) {
    return {
      status: 200,
      body: {
        request_id: "lcx_vltui_90_timeline",
        outcome: "passed",
        item: { phases: [], latest_activity: null },
        safe_error_codes: [],
        ui_state: "ready",
        production_ready_claim: false
      }
    };
  }

  if (pathname.startsWith("/api/matters/") && method === "GET") {
    return { status: 200, body: safeCollection("lcx_vltui_90_matter_collection", [syntheticDocument]) };
  }

  if (pathname === "/api/matters/audit" || pathname.includes("/record-actions/")) {
    return { status: 200, body: safeCollection("lcx_vltui_90_audit", []) };
  }

  if (pathname === "/api/crm/opportunities") {
    return { status: 200, body: safeCollection("lcx_vltui_90_opportunities", [syntheticOpportunity]) };
  }

  if (pathname.match(/^\/api\/crm\/opportunities\/[^/]+\/handoff$/) && method === "POST") {
    return {
      status: 200,
      body: {
        request_id: "lcx_vltui_90_crm_handoff",
        outcome: "passed",
        item: syntheticIntake,
        opportunity: { ...syntheticOpportunity, stage: "intake_requested", intake_request_id: syntheticIntake.intake_request_id },
        safe_error_codes: [],
        audit_hint_ref: "ui_cmp_g6_crm_intake_probe",
        ui_state: "ready",
        production_ready_claim: false
      }
    };
  }

  if (pathname === "/api/intake/requests") {
    return { status: 200, body: safeCollection("lcx_vltui_90_intake_requests", [syntheticIntake]) };
  }

  if (pathname.startsWith("/api/crm/") || pathname.startsWith("/api/intake/")) {
    return { status: 200, body: safeCollection("lcx_vltui_90_crm_collection", [syntheticClient]) };
  }

  if (pathname.startsWith("/api/finance/") || pathname.startsWith("/api/analytics/")) {
    return { status: 200, body: safeCollection("lcx_vltui_90_finance_analytics", []) };
  }

  return {
    status: 200,
    body: {
      request_id: "lcx_vltui_90_generic",
      outcome: "passed",
      item: null,
      items: [],
      safe_error_codes: [],
      audit_hint_ref: "lcx_vltui_90_generic_probe",
      ui_state: "empty",
      count_leak_prevented: true,
      production_ready_claim: false
    }
  };
}

async function setupRoutes(page, observed) {
  page.on("console", (message) => {
    if (["error"].includes(message.type())) observed.consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => {
    observed.pageErrors.push(error.message);
  });
  page.on("request", (request) => {
    const url = request.url();
    if (!url.includes("/api/") && !url.includes("/master-data/records")) return;
    const method = request.method();
    const pathname = new URL(url).pathname;
    observed.apiRequests.push({ method, pathname });
    if (method === "GET") return;
    const allowedWrite =
      (method === "POST" && pathname.match(/^\/api\/crm\/opportunities\/[^/]+\/handoff$/)) ||
      (method === "POST" && pathname.endsWith("/recently-viewed")) ||
      (method === "POST" && pathname === "/api/matters/vault-bridge/upload-preflight");
    if (!allowedWrite) observed.unexpectedWrites.push({ method, pathname });
  });
  page.on("response", (response) => {
    const url = response.url();
    if (!url.includes("/api/") && !url.includes("/master-data/records")) return;
    if (response.status() >= 400) observed.apiErrors.push({ status: response.status(), pathname: new URL(url).pathname });
  });
  await page.route("**/master-data/records?**", (route) => {
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(safeCollection("lcx_vltui_90_master_data", [syntheticClient])) });
  });
  await page.route("**/api/**", (route) => {
    const request = route.request();
    const { status, body } = routeBody(request.url(), request.method());
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  });
}

async function newObservedPage(browser) {
  const observed = { apiRequests: [], apiErrors: [], unexpectedWrites: [], consoleErrors: [], pageErrors: [] };
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  await setupRoutes(page, observed);
  return { page, observed };
}

async function screenshot(page, id) {
  const path = `${SCREENSHOT_DIR}/lcx-vltui-90-${id}.png`;
  await page.screenshot({ path: join(ROOT, path), fullPage: true });
  return path;
}

async function checkVisible(page, selector, label, timeout = 15000) {
  const locator = page.locator(selector).first();
  await locator.waitFor({ state: "visible", timeout });
  return { id: label, passed: await locator.count() > 0 };
}

function caseResult({ id, surface, checks, observed, screenshot: shot, text }) {
  const forbiddenTextDetected = SAFE_FORBIDDEN_TEXT.test(text);
  const passed = checks.every((check) => check.passed) &&
    observed.consoleErrors.length === 0 &&
    observed.pageErrors.length === 0 &&
    observed.apiErrors.length === 0 &&
    observed.unexpectedWrites.length === 0 &&
    !forbiddenTextDetected;
  return {
    id,
    surface,
    checks,
    api_request_count: observed.apiRequests.length,
    api_error_count: observed.apiErrors.length,
    unexpected_write_count: observed.unexpectedWrites.length,
    console_errors: observed.consoleErrors,
    page_errors: observed.pageErrors,
    forbidden_text_detected: forbiddenTextDetected,
    screenshot: shot,
    passed
  };
}

async function clientToMatterHandoff(browser) {
  const { page, observed } = await newObservedPage(browser);
  try {
    await page.goto(`${WEB}/?locale=ko&view=clients&data=live&ctx=allow#client-opportunities`, { waitUntil: "domcontentloaded" });
    const checks = [
      await checkVisible(page, "[data-crm-handoff-action='true']", "crm-handoff-mounted"),
      await checkVisible(page, "[data-client-record-workspace='right-panel']", "client-record-workspace-mounted")
    ];
    await page.locator("[data-crm-handoff-action='true'] button").first().click();
    checks.push(await checkVisible(page, "[data-crm-handoff-refresh-result='true']", "crm-handoff-result-mounted"));
    const shot = await screenshot(page, "client-to-matter-handoff");
    const text = await page.locator("body").innerText();
    return caseResult({ id: "client-to-matter-handoff", surface: "Client", checks, observed, screenshot: shot, text });
  } finally {
    await page.close();
  }
}

async function matterToVaultWorkspace(browser) {
  const { page, observed } = await newObservedPage(browser);
  try {
    await page.goto(`${WEB}/?locale=ko&view=matters&data=live&ctx=allow#matter-evidence`, { waitUntil: "domcontentloaded" });
    const checks = [
      await checkVisible(page, "[data-lcx-vltui-06-connected-section='evidence'][data-lcx-vltui-06-section-id='matter-evidence']", "matter-evidence-connected"),
      await checkVisible(page, "[data-lcx-vltui-06-vault-backed-shortcuts='evidence']", "matter-vault-shortcut-mounted")
    ];
    await page.locator("[data-lcx-vltui-06-vault-shortcut-action='true']").first().click();
    checks.push(await checkVisible(page, "[data-lcx-vltui-03-document-workspace-boundary='true']", "matter-vault-workspace-boundary"));
    const boundary = await page.locator("[data-lcx-vltui-03-document-workspace-boundary='true']").first().evaluate((node) => ({
      publishWriteEnabled: node.getAttribute("data-lcx-vltui-03-publish-write-enabled"),
      preflightState: node.getAttribute("data-lcx-vltui-03-preflight-state")
    }));
    checks.push({ id: "matter-vault-publish-write-disabled", passed: boundary.publishWriteEnabled === "false" });
    const shot = await screenshot(page, "matter-to-vault-workspace");
    const text = await page.locator("body").innerText();
    return caseResult({ id: "matter-to-vault-workspace", surface: "Matter", checks, observed, screenshot: shot, text });
  } finally {
    await page.close();
  }
}

async function vaultToMatterLookup(browser) {
  const { page, observed } = await newObservedPage(browser);
  try {
    await page.goto(`${WEB}/?locale=ko&view=vault&data=live&ctx=allow#vault-documents`, { waitUntil: "domcontentloaded" });
    const checks = [
      await checkVisible(page, "[data-lcx-vltui-02-vault-bridge-panel='true']", "vault-bridge-mounted"),
      await checkVisible(page, "[data-lcx-vltui-02-matter-picker='true']", "vault-matter-picker-mounted"),
      await checkVisible(page, "[data-lcx-vltui-02-upload-preflight='true']", "vault-upload-preflight-mounted"),
      await checkVisible(page, "[data-lcx-vltui-02-action-boundaries='true']", "vault-action-boundaries-mounted")
    ];
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-matter-picker='true']")?.getAttribute("data-vault-matter-lookup-kind") === "data");
    await page.locator("[data-vault-matter-lookup-results='true'] button").first().click();
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-matter-picker='true']")?.getAttribute("data-vault-matter-selected-ref") === "matter:matter_lcx_vltui_alpha");
    await page.locator("[data-lcx-vltui-02-upload-preflight='true'] button").first().click();
    await page.waitForFunction(() => document.querySelector("[data-lcx-vltui-02-action-boundaries='true']")?.getAttribute("data-vault-boundary-base-state") === "preflight-checked");
    const boundary = await page.locator("[data-lcx-vltui-02-action-boundaries='true']").first().evaluate((node) => ({
      writeEnabled: node.getAttribute("data-vault-boundary-write-enabled"),
      rowCount: node.querySelectorAll("[data-vault-boundary-row='true']").length
    }));
    checks.push({ id: "vault-selected-matter-safe-ref", passed: true });
    checks.push({ id: "vault-boundary-write-disabled", passed: boundary.writeEnabled === "false" });
    checks.push({ id: "vault-boundary-five-rows", passed: boundary.rowCount === 5 });
    const shot = await screenshot(page, "vault-to-matter-lookup");
    const text = await page.locator("body").innerText();
    return caseResult({ id: "vault-to-matter-lookup", surface: "Vault", checks, observed, screenshot: shot, text });
  } finally {
    await page.close();
  }
}

async function peopleProfileGlobal(browser) {
  const { page, observed } = await newObservedPage(browser);
  try {
    const checks = [];
    await page.goto(`${WEB}/?locale=ko&view=people&data=live&ctx=allow#people-members`, { waitUntil: "domcontentloaded" });
    checks.push(await checkVisible(page, "[data-hrx-api-backed='true']", "people-api-backed-mounted"));
    await page.goto(`${WEB}/?locale=ko&view=profile&data=live&ctx=allow`, { waitUntil: "domcontentloaded" });
    checks.push(await checkVisible(page, "[data-user-profile-surface='matter-consistent']", "profile-surface-mounted"));
    await page.waitForFunction(() => document.querySelector("[data-profile-api-backed='true']")?.getAttribute("data-profile-api-state") === "populated");
    checks.push({ id: "profile-api-populated", passed: true });
    await page.goto(`${WEB}/?locale=ko&view=home&data=live&ctx=allow`, { waitUntil: "domcontentloaded" });
    await page.locator("[data-notification-trigger='true']").click();
    checks.push(await checkVisible(page, "[data-notification-drawer='open']", "notification-drawer-mounted"));
    await page.goto(`${WEB}/?locale=ko&view=messages&data=live&ctx=allow#messages-matter-channel`, { waitUntil: "domcontentloaded" });
    checks.push(await checkVisible(page, "[data-global-utility-surface='messages']", "global-utility-mounted"));
    checks.push(await checkVisible(page, "[data-global-utility-card='messages-matter-channel']", "global-matter-message-card-mounted"));
    const shot = await screenshot(page, "people-profile-global");
    const text = await page.locator("body").innerText();
    return caseResult({ id: "people-profile-global", surface: "People/Profile/Global", checks, observed, screenshot: shot, text });
  } finally {
    await page.close();
  }
}

async function main() {
  mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });
  const browser = await chromium.launch();
  try {
    const cases = [
      await clientToMatterHandoff(browser),
      await matterToVaultWorkspace(browser),
      await vaultToMatterLookup(browser),
      await peopleProfileGlobal(browser)
    ];
    const report = {
      schema_version: "law-firm-os.lazycodex.lcx_vltui.closeout_proof.v0.1",
      tuw_ids: [
        "LCX-VLTUI-90.01",
        "LCX-VLTUI-90.02",
        "LCX-VLTUI-90.03",
        "LCX-VLTUI-90.04",
        "LCX-VLTUI-90.05",
        "LCX-VLTUI-90.06",
        "LCX-VLTUI-90.07"
      ],
      generated_at: new Date().toISOString(),
      web_url: WEB,
      source_refs: [
        "apps/web/src/components/ClientsSurface.jsx",
        "apps/web/src/components/MattersSurface.jsx",
        "apps/web/src/components/MatterVaultPanel.jsx",
        "apps/web/src/components/VaultSurface.jsx",
        "apps/web/src/people/PeopleHome.tsx",
        "apps/web/src/components/UserProfileSurface.jsx",
        "apps/web/src/components/GlobalUtilitySurface.jsx"
      ],
      allowed_write_calls: [
        "POST /api/crm/opportunities/:id/handoff",
        "POST /api/matters/:id/recently-viewed",
        "POST /api/matters/vault-bridge/upload-preflight"
      ],
      boundary: {
        synthetic_route_interception_only: true,
        client_to_matter_handoff_mounted: true,
        matter_to_vault_workspace_mounted: true,
        vault_to_matter_lookup_mounted: true,
        people_profile_global_mounted: true,
        customer_document_import_executed: false,
        vault_document_mutation_executed: false,
        vault_document_write_enabled: false,
        provider_send_executed: false,
        owner_final_approval: false,
        production_ready: false,
        public_release: false,
        go_live_approved: false
      },
      cases,
      verdict: cases.every((item) => item.passed) ? "PASS" : "FAIL"
    };
    writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(report, null, 2)}\n`);
    writeFileSync(join(ROOT, MD_PATH), markdown(report));
    console.log(JSON.stringify({
      verdict: report.verdict,
      cases: report.cases.map((item) => ({
        id: item.id,
        checks: item.checks.filter((check) => check.passed).length,
        total_checks: item.checks.length,
        unexpected_write_count: item.unexpected_write_count,
        api_error_count: item.api_error_count,
        screenshot: item.screenshot,
        passed: item.passed
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
