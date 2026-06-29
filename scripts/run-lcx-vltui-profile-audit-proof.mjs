#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx-vltui-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx-vltui-profile-audit-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx-vltui-profile-audit-proof.md`;
const SESSION_KEY = "lawos.session.envelope";
const ACTOR_REF = "user_lcx_vltui_session";
const MATTER_ID = "matter_lcx_vltui_alpha";
const DRAFT_ID = "builder_draft_lcx_vltui_alpha";

const sessionEnvelope = {
  schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
  state: "signed_in",
  session_ref: "desktop:user_lcx_vltui_session:profile-audit",
  source: "desktop_offline_login",
  actor_ref: ACTOR_REF,
  tenant_refs: {
    default: "tenant_amic_matter_vault",
    client: "tenant_rp04_synthetic",
    matter: "tenant_rp05_synthetic",
    vault: "tenant_amic_matter_vault",
    crm: "tenant_cmp_g6_synthetic"
  },
  role_ids: ["matter_vault_admin", "matter_runtime_user", "master_data_reader", "crm_intake_user"],
  scopes: ["client_read", "matter_read", "vault_read"],
  review_state: "allow",
  expires_at: "2999-12-31T23:59:59.000Z"
};

function proofUrl(query) {
  return `${WEB}/${query.startsWith("?") ? query : `?${query}`}`;
}

function collectionBody(requestId, items = []) {
  return {
    request_id: requestId,
    outcome: "passed",
    items,
    page_info: { limit: 25, has_more: false },
    safe_error_codes: [],
    omitted_fields: [],
    audit_hint_ref: "ui_lcx_vltui_04_probe",
    ui_state: items.length === 0 ? "empty" : null,
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function profileBody(mode) {
  if (mode === "empty") {
    return {
      request_id: "lcx-vltui-04-profile-empty",
      outcome: "passed",
      item: null,
      safe_error_codes: [],
      audit_hint_ref: "ui_profile_me_probe",
      ui_state: "empty",
      count_leak_prevented: true,
      production_ready_claim: false
    };
  }
  if (mode === "review") {
    return {
      status: 403,
      body: {
        request_id: "lcx-vltui-04-profile-review",
        outcome: "review_required",
        item: null,
        safe_error_codes: ["PROFILE_REVIEW_REQUIRED"],
        audit_hint_ref: "ui_profile_me_probe",
        ui_state: "review",
        count_leak_prevented: true,
        production_ready_claim: false
      }
    };
  }
  if (mode === "denied") {
    return {
      status: 403,
      body: {
        request_id: "lcx-vltui-04-profile-denied",
        outcome: "denied",
        item: null,
        safe_error_codes: ["PROFILE_PERMISSION_DENIED"],
        audit_hint_ref: "ui_profile_me_probe",
        ui_state: "denied",
        count_leak_prevented: true,
        production_ready_claim: false
      }
    };
  }
  if (mode === "error") {
    return { status: 500, body: { error: "synthetic_profile_error" } };
  }
  return {
    request_id: "lcx-vltui-04-profile-populated",
    outcome: "passed",
    item: {
      profile_ref: `profile:${ACTOR_REF}`,
      actor_ref: ACTOR_REF,
      tenant_ref: "tenant_rp04_synthetic",
      display_name: "세션 사용자",
      primary_role_label: "matter_vault_admin",
      role_count: 4,
      contract_summary: { state: "connected", visible_contract_count: 0, source_ref: "session_profile_projection" },
      account_summary: {
        state: "connected",
        session_principal_source: "desktop_web_session_envelope",
        session_source_ref: "desktop_offline_login"
      },
      secret_material_included: false,
      direct_identifier_included: false,
      production_ready_claim: false
    },
    safe_error_codes: [],
    audit_hint_ref: "ui_profile_me_probe",
    ui_state: "populated",
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function matterRecords() {
  return collectionBody("lcx-vltui-04-matters", [
    {
      matter_id: MATTER_ID,
      matter_code: "SyntheticAlpha/Civil/Contract",
      matter_name: "Synthetic Alpha Contract",
      title: "Synthetic Alpha Contract",
      status: "active",
      phase: "document_review",
      client_id: "client_lcx_vltui_alpha",
      client_display_name: "Synthetic Alpha Client",
      owner_display_name: "Matter Owner"
    }
  ]);
}

function matterItem(requestId) {
  return {
    request_id: requestId,
    outcome: "passed",
    item: {
      matter_id: MATTER_ID,
      matter_code: "SyntheticAlpha/Civil/Contract",
      matter_name: "Synthetic Alpha Contract",
      client_display_name: "Synthetic Alpha Client",
      document_count: 1,
      visible_entries: []
    },
    safe_error_codes: [],
    audit_hint_ref: "ui_lcx_vltui_04_matter_probe",
    ui_state: null,
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function bridgeStatusBody() {
  return {
    request_id: "lcx-vltui-04-bridge-ready",
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
}

function preflightBody() {
  return {
    request_id: "lcx-vltui-04-preflight",
    outcome: "preflight_passed",
    item: {
      preflight_ref: "vault-preflight:matter_lcx_vltui_alpha:profile-audit",
      selected_matter_ref: `matter:${MATTER_ID}`,
      matter_id: MATTER_ID,
      matter_code: "SyntheticAlpha/Civil/Contract",
      allowed_next_step: "permission_check_only",
      source_mode: "matter_app_api",
      permission_checked: true,
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
}

function writeBody(url) {
  if (url.pathname === "/api/crm/accounts") {
    return {
      request_id: "lcx-vltui-04-client-write",
      outcome: "created",
      item: { account_id: "account_lcx_vltui_session", display_name: "신규 Client", account_source: "crm-runtime.Account" },
      safe_error_codes: [],
      audit_hint_ref: "ui_sf_b_w01_account_write_probe",
      production_ready_claim: false
    };
  }
  if (url.pathname.endsWith("/builder-drafts")) {
    return {
      request_id: "lcx-vltui-04-builder-draft",
      outcome: "created",
      item: { draft_id: DRAFT_ID, title: "위임계약서 초안", status: "draft" },
      preview: { redacted: true },
      safe_error_codes: [],
      audit_hint_ref: "ui_sf_b_w04_builder_draft_create_probe",
      production_ready_claim: false
    };
  }
  return {
    request_id: "lcx-vltui-04-write",
    outcome: "recorded",
    item: {},
    safe_error_codes: [],
    audit_hint_ref: "ui_lcx_vltui_04_write_probe",
    production_ready_claim: false
  };
}

function responseFor(url, method, profileMode) {
  if (url.pathname === "/api/profile/me") return profileBody(profileMode);
  if (url.pathname === "/master-data/records") return collectionBody("lcx-vltui-04-client-records", []);
  if (url.pathname.startsWith("/api/crm") || url.pathname.startsWith("/api/intake")) {
    return method === "GET"
      ? collectionBody("lcx-vltui-04-crm-read", [{ account_id: "account_lcx_vltui_seed", display_name: "Synthetic Client", account_source: "crm-runtime.Account" }])
      : writeBody(url);
  }
  if (url.pathname === "/api/matters/vault-bridge/status") return bridgeStatusBody();
  if (url.pathname === "/api/matters/vault-bridge/upload-preflight") return preflightBody();
  if (url.pathname === "/api/matters") return matterRecords();
  if (url.pathname.includes("/vault-summary") || url.pathname.includes("/timeline")) return matterItem("lcx-vltui-04-matter-item");
  if (url.pathname.includes("/document-templates")) {
    return collectionBody("lcx-vltui-04-templates", [
      { template_id: "matter_engagement_letter", label: "위임계약서 초안", category: "document", requires_approval: true }
    ]);
  }
  if (url.pathname.startsWith("/api/matters/") && method !== "GET") return writeBody(url);
  if (url.pathname.startsWith("/api/matters/")) return collectionBody("lcx-vltui-04-matter-subcollection", []);
  if (url.pathname.startsWith("/api/vault")) return collectionBody("lcx-vltui-04-vault", [{ document_id: "doc_lcx_vltui", matter_id: MATTER_ID, title: "Synthetic Alpha Contract" }]);
  return collectionBody("lcx-vltui-04-generic", []);
}

function parseContext(request) {
  const header = request.headers()["x-lawos-permission-context"];
  if (!header) return null;
  try {
    return JSON.parse(header);
  } catch {
    return null;
  }
}

function classifyWrite(url, method) {
  if (method !== "POST" && method !== "PATCH") return null;
  if (url.pathname === "/api/crm/accounts") return "client_write";
  if (url.pathname.endsWith("/builder-drafts")) return "matter_write";
  if (url.pathname === "/api/matters/vault-bridge/upload-preflight") return "vault_write_candidate";
  return null;
}

async function waitFor(predicate, label) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    const value = predicate();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

async function waitForState(page, state) {
  await page.locator(`[data-profile-api-state='${state}']`).first().waitFor({ state: "visible", timeout: 15000 });
  return page.locator("[data-user-profile-surface]").first().getAttribute("data-profile-api-state");
}

function writePassed(write, { tenant, auditHint, requiresPayloadActor = true }) {
  const principal = write.context?.principal ?? {};
  return (
    principal.user_id === ACTOR_REF &&
    principal.tenant_id === tenant &&
    principal.session_principal_source === "desktop_web_session_envelope" &&
    write.payload?.audit_hint_ref === auditHint &&
    (!requiresPayloadActor || write.payload?.actor_id === ACTOR_REF)
  );
}

function forbiddenText(value) {
  return /@|password|reset|bearer|cookie|secret|credential|authorization|sk-|token_material/i.test(JSON.stringify(value));
}

function renderMarkdown(report) {
  const rows = report.cases[0].checks
    .map((item) => `| ${item.id} | ${item.passed ? "PASS" : "FAIL"} |`)
    .join("\n");
  return `# LCX-VLTUI-04 Profile And Audit Proof\n\nVerdict: ${report.verdict}\n\n| Check | Result |\n|---|---|\n${rows}\n\nBoundary: no customer write, production, go-live, public release, owner approval, secret material, or provider-send claim.\n`;
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
  const pageErrors = [];
  const writes = [];
  let profileMode = "populated";

  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const writeKind = classifyWrite(url, request.method());
    if (writeKind) {
      const payload = request.postData() ? JSON.parse(request.postData()) : {};
      writes.push({ kind: writeKind, path: url.pathname, context: parseContext(request), payload });
    }
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/master-data/")) {
      const bodyOrResponse = responseFor(url, request.method(), profileMode);
      const status = bodyOrResponse.status ?? 200;
      const body = bodyOrResponse.body ?? bodyOrResponse;
      await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
      return;
    }
    await route.continue();
  });

  try {
    profileMode = "populated";
    await page.goto(proofUrl("?locale=ko&view=profile&ctx=allow&case=populated"), { waitUntil: "domcontentloaded" });
    const populatedState = await waitForState(page, "populated");
    await page.locator("[data-user-profile-surface]").screenshot({
      path: join(ROOT, SCREENSHOT_DIR, "lcx-vltui-04-profile-api-proof.png")
    });
    await page.locator("[data-profile-help-route='settings-support']").click();
    await page.waitForURL(/view=settings.*#settings-support/, { timeout: 15000 });
    const helpRoute = new URL(page.url());

    await page.goto(proofUrl("?locale=ko&view=profile&ctx=allow&case=contract"), { waitUntil: "domcontentloaded" });
    await waitForState(page, "populated");
    await page.locator("[data-profile-contract-route='matters:matter-opening']").click();
    await page.waitForURL(/view=matters.*#matter-opening/, { timeout: 15000 });
    const contractRoute = new URL(page.url());

    await page.goto(proofUrl("?locale=ko&view=profile&ctx=allow&case=finance"), { waitUntil: "domcontentloaded" });
    await waitForState(page, "populated");
    await page.locator("[data-profile-action-route='finance:finance-expenses']").click();
    await page.waitForURL(/view=finance.*#finance-expenses/, { timeout: 15000 });
    const financeRoute = new URL(page.url());

    profileMode = "empty";
    await page.goto(proofUrl("?locale=ko&view=profile&ctx=allow&case=empty"), { waitUntil: "domcontentloaded" });
    const emptyState = await waitForState(page, "empty");
    profileMode = "review";
    await page.goto(proofUrl("?locale=ko&view=profile&ctx=review&case=review"), { waitUntil: "domcontentloaded" });
    const reviewState = await waitForState(page, "review");
    profileMode = "denied";
    await page.goto(proofUrl("?locale=ko&view=profile&ctx=denied&case=denied"), { waitUntil: "domcontentloaded" });
    const deniedState = await waitForState(page, "denied");
    profileMode = "error";
    await page.goto(proofUrl("?locale=ko&view=profile&ctx=allow&case=error"), { waitUntil: "domcontentloaded" });
    const errorState = await waitForState(page, "error");

    const clientOffset = writes.length;
    await page.goto(proofUrl("?locale=ko&view=clients&ctx=allow&case=client-write#client-accounts"), { waitUntil: "domcontentloaded" });
    await page.locator("[data-crm-account-create-action='true']").getByRole("button", { name: "생성" }).click();
    const clientWrite = await waitFor(() => writes.slice(clientOffset).find((write) => write.kind === "client_write"), "client write candidate");

    const matterOffset = writes.length;
    await page.goto(proofUrl("?locale=ko&view=matters&ctx=allow&case=matter-write#matter-vault"), { waitUntil: "domcontentloaded" });
    await page.locator("[data-lcx-vltui-03-document-workspace-boundary='true']").first().getByRole("button", { name: "문서 사전검사" }).click();
    const vaultWrite = await waitFor(() => writes.slice(matterOffset).find((write) => write.kind === "vault_write_candidate"), "vault write candidate");
    await page.locator("[data-sf-b-w04-document-builder='true']").getByRole("button", { name: "초안 생성" }).click();
    const matterWrite = await waitFor(() => writes.slice(matterOffset).find((write) => write.kind === "matter_write"), "matter write candidate");

    await page.screenshot({ path: join(ROOT, SCREENSHOT_DIR, "lcx-vltui-04-profile-audit-proof.png"), fullPage: true });

    const checks = [
      { id: "profile-populated-state", passed: populatedState === "populated" },
      { id: "profile-empty-state", passed: emptyState === "empty" },
      { id: "profile-review-state", passed: reviewState === "review" },
      { id: "profile-denied-state", passed: deniedState === "denied" },
      { id: "profile-error-state", passed: errorState === "error" },
      { id: "profile-help-route-backed", passed: helpRoute.searchParams.get("view") === "settings" && helpRoute.hash === "#settings-support" },
      { id: "profile-contract-route-backed", passed: contractRoute.searchParams.get("view") === "matters" && contractRoute.hash === "#matter-opening" },
      { id: "profile-finance-route-backed", passed: financeRoute.searchParams.get("view") === "finance" && financeRoute.hash === "#finance-expenses" },
      { id: "client-write-session-actor-audit", passed: writePassed(clientWrite, { tenant: "tenant_cmp_g6_synthetic", auditHint: "ui_sf_b_w01_account_write_probe" }) },
      { id: "matter-write-session-actor-audit", passed: writePassed(matterWrite, { tenant: "tenant_rp05_synthetic", auditHint: "ui_sf_b_w04_builder_draft_create_probe" }) },
      { id: "vault-write-candidate-session-actor-audit", passed: writePassed(vaultWrite, { tenant: "tenant_amic_matter_vault", auditHint: "ui_cmp_g5_vault_probe", requiresPayloadActor: false }) }
    ];

    return {
      id: "profile-route-states-and-audit-actors",
      passed: checks.every((item) => item.passed) && pageErrors.length === 0 && !forbiddenText({ writes, checks }),
      checks,
      writes: {
        client: { principal: clientWrite.context.principal, payload: clientWrite.payload },
        matter: { principal: matterWrite.context.principal, payload: matterWrite.payload },
        vault: { principal: vaultWrite.context.principal, payload: vaultWrite.payload }
      },
      page_errors: pageErrors,
      forbidden_text_detected: forbiddenText({ writes, checks }),
      screenshot: `${SCREENSHOT_DIR}/lcx-vltui-04-profile-api-proof.png`,
      audit_screenshot: `${SCREENSHOT_DIR}/lcx-vltui-04-profile-audit-proof.png`
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
      schema_version: "law-firm-os.lazycodex.lcx_vltui.profile_audit_proof.v0.1",
      tuw_ids: ["LCX-VLTUI-04.03", "LCX-VLTUI-04.04"],
      generated_at: new Date().toISOString(),
      verdict: result.passed ? "PASS" : "FAIL",
      boundary: {
        synthetic_route_interception_only: true,
        profile_api_route_backed: true,
        customer_data_write_executed: false,
        vault_document_write_enabled: false,
        production_ready: false,
        public_release: false,
        go_live_approved: false,
        owner_final_approval: false,
        secret_material_in_profile: false,
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
