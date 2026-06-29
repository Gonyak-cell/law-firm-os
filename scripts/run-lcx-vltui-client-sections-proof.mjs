#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/lcx-vltui-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/lcx-vltui-client-sections-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/lcx-vltui-client-sections-proof.md`;
const SESSION_KEY = "lawos.session.envelope";
const ACTOR_REF = "user_lcx_vltui_session";

const sessionEnvelope = {
  schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
  state: "signed_in",
  session_ref: "desktop:user_lcx_vltui_session:client-sections",
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
  scopes: ["client_read", "client_write", "matter_read", "vault_read"],
  review_state: "allow",
  expires_at: "2999-12-31T23:59:59.000Z"
};

function proofUrl(hash) {
  return `${WEB}/?locale=ko&view=clients&ctx=allow${hash}`;
}

function collectionBody(requestId, items = [], auditHintRef = "ui_lcx_vltui_05_probe") {
  return {
    request_id: requestId,
    outcome: "passed",
    items,
    page_info: { limit: 25, has_more: false },
    safe_error_codes: [],
    audit_hint_ref: auditHintRef,
    ui_state: items.length === 0 ? "empty" : null,
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

function itemBody({ requestId, outcome = "created", item = {}, auditHintRef = "ui_lcx_vltui_05_probe", action = "recorded", uiState = null, safeErrorCodes = [] }) {
  return {
    request_id: requestId,
    outcome,
    item,
    audit_event: {
      event_id: `${action}:${requestId}`,
      tenant_id: "tenant_cmp_g6_synthetic",
      actor_id: ACTOR_REF,
      action,
      object_type: "LCXClientSection",
      decision: outcome === "provider_blocked" || outcome === "approval_required" ? "approval_required" : "allow"
    },
    safe_error_codes: safeErrorCodes,
    audit_hint_ref: auditHintRef,
    ui_state: uiState,
    count_leak_prevented: true,
    production_ready_claim: false
  };
}

const clientRecords = [
  {
    client_group_id: "client_group_lcx_vltui_05",
    tenant_id: "tenant_rp04_synthetic",
    display_name: "Synthetic Client",
    primary_party_id: "party_cmp_g6_client_001",
    member_entity_ids: ["entity_cmp_g6_account_001"],
    status: "active",
    matter_core_enrichment: { matter_title: "Synthetic Alpha Contract" }
  }
];

const accounts = [
  {
    account_id: "org_cmp_g6_account_001",
    organization_id: "org_cmp_g6_account_001",
    client_group_id: "client_group_cmp_g6_account_001",
    party_id: "party_cmp_g6_client_001",
    display_name: "Synthetic Client",
    status: "active",
    account_source: "master-data.Organization",
    canonical_sync_state: "canonical_source",
    registration_number_included: false
  }
];

const contacts = [
  {
    contact_id: "person_cmp_g6_contact_001",
    account_id: "org_cmp_g6_account_001",
    display_name: "Synthetic Contact",
    status: "active",
    contact_source: "master-data.Person",
    canonical_sync_state: "canonical_source",
    contact_point_value_included: false
  }
];

const activities = [
  {
    crm_activity_id: "activity_cmp_g6_synthetic_001",
    party_id: "party_cmp_g6_client_001",
    opportunity_id: "opp_cmp_g6_synthetic_001",
    activity_type: "meeting",
    subject: "Client intake kickoff",
    confidential: false,
    status: "active",
    direct_matter_reference_included: false
  }
];

const proposals = [
  {
    proposal_id: "proposal_cmp_g6_synthetic_001",
    opportunity_id: "opp_cmp_g6_synthetic_001",
    party_id: "party_cmp_g6_client_001",
    display_name: "Client proposal draft",
    proposal_status: "draft",
    approval_state: "review_required",
    vault_document_ref_present: true,
    e_sign_send_enabled: false,
    e_sign_provider_status: "blocked_until_provider_receipt"
  }
];

const clientSettings = [
  {
    policy_id: "client_policy_cmp_g6_classification",
    resource_id: "client_policy_cmp_g6_classification",
    display_name: "Client classification policy",
    field_name: "client_classification",
    allowed_values: ["individual", "organization", "key_client"],
    duplicate_review_required: true,
    policy_write_permissioned: true,
    write_requires_role_ids: ["crm_intake_admin", "matter_vault_admin"]
  }
];

function crmCollection(url) {
  if (url.pathname === "/api/crm/accounts") return collectionBody("lcx-vltui-05-accounts", accounts);
  if (url.pathname === "/api/crm/contacts") return collectionBody("lcx-vltui-05-contacts", contacts);
  if (url.pathname.endsWith("/contacts")) {
    return collectionBody("lcx-vltui-05-account-contacts", [
      {
        relationship_id: "relationship_cmp_g6_account_contact_001",
        account_id: "org_cmp_g6_account_001",
        contact_id: "person_cmp_g6_contact_001",
        relationship_type: "primary_contact",
        contact_display_name: "Synthetic Contact",
        status: "active",
        contact_point_value_included: false
      }
    ]);
  }
  if (url.pathname === "/api/crm/leads") return collectionBody("lcx-vltui-05-leads", []);
  if (url.pathname === "/api/crm/opportunities") {
    return collectionBody("lcx-vltui-05-opportunities", [
      {
        opportunity_id: "opp_cmp_g6_synthetic_001",
        party_id: "party_cmp_g6_client_001",
        display_name: "Synthetic Opportunity",
        stage: "qualified",
        status: "active"
      }
    ]);
  }
  if (url.pathname === "/api/crm/activities") return collectionBody("lcx-vltui-05-activities", activities, "ui_lcx_vltui_05_activity_read_probe");
  if (url.pathname === "/api/crm/proposals") return collectionBody("lcx-vltui-05-proposals", proposals, "ui_lcx_vltui_05_proposal_read_probe");
  if (url.pathname === "/api/crm/client-settings") return collectionBody("lcx-vltui-05-client-settings", clientSettings, "ui_lcx_vltui_05_client_settings_read_probe");
  if (url.pathname === "/api/crm/duplicate-merge-proposals") {
    return collectionBody("lcx-vltui-05-merge-proposals", [
      {
        proposal_id: "dup_merge_lcx_vltui_05",
        proposal_state: "owner_decision_required",
        owner_decision_state: "owner_decision_required",
        candidate_count: 1,
        approval_ref_present: false,
        executable: false,
        automatic_merge_executed: false,
        rollback_metadata_present: false
      }
    ]);
  }
  return collectionBody("lcx-vltui-05-crm-generic", []);
}

function writeBody(url, method) {
  if (url.pathname === "/api/crm/activities" && method === "POST") {
    return itemBody({
      requestId: "lcx-vltui-05-activity-create",
      item: { ...activities[0], crm_activity_id: "activity_lcx_vltui_created", subject: "Client 후속 조치" },
      auditHintRef: "ui_lcx_vltui_05_activity_write_probe",
      action: "crm.activity.created"
    });
  }
  if (url.pathname.startsWith("/api/crm/activities/") && method === "PATCH") {
    return itemBody({
      requestId: "lcx-vltui-05-activity-patch",
      outcome: "updated",
      item: { ...activities[0], status: "review_required" },
      auditHintRef: "ui_lcx_vltui_05_activity_patch_probe",
      action: "crm.activity.patched"
    });
  }
  if (url.pathname === "/api/crm/proposals" && method === "POST") {
    return itemBody({
      requestId: "lcx-vltui-05-proposal-create",
      item: { ...proposals[0], proposal_id: "proposal_lcx_vltui_created", display_name: "Client 제안 초안" },
      auditHintRef: "ui_lcx_vltui_05_proposal_write_probe",
      action: "crm.proposal.created"
    });
  }
  if (url.pathname.startsWith("/api/crm/proposals/") && method === "PATCH") {
    return itemBody({
      requestId: "lcx-vltui-05-proposal-provider-blocked",
      outcome: "provider_blocked",
      item: proposals[0],
      auditHintRef: "ui_lcx_vltui_05_proposal_patch_probe",
      action: "crm.proposal.esign_send_blocked",
      uiState: "provider_blocked",
      safeErrorCodes: ["CRM_INTAKE_APPROVAL_REQUIRED"]
    });
  }
  if (url.pathname === "/api/crm/duplicate-merge-proposals" && method === "POST") {
    return itemBody({
      requestId: "lcx-vltui-05-merge-create",
      item: { proposal_id: "dup_merge_lcx_vltui_created", proposal_state: "owner_decision_required", executable: false },
      auditHintRef: "ui_sf_b_w01_merge_write_probe",
      action: "crm.duplicate_merge.proposal.created"
    });
  }
  if (url.pathname === "/api/intake/conflict-checks" && method === "POST") {
    return itemBody({
      requestId: "lcx-vltui-05-conflict-check",
      item: {
        conflict_check_id: "conflict_lcx_vltui_05",
        intake_request_id: "intake_cmp_g6_synthetic_001",
        snapshot_hash: "seed-snapshot-hash",
        status: "snapshot_recorded"
      },
      auditHintRef: "ui_cmp_g6_crm_intake_probe",
      action: "conflict.check.create"
    });
  }
  if (url.pathname === "/api/intake/clearance-tokens" && method === "POST") {
    return itemBody({
      requestId: "lcx-vltui-05-clearance-token",
      item: { clearance_token_id: "clearance_lcx_vltui_05", token_state: "valid" },
      auditHintRef: "ui_cmp_g6_crm_intake_probe",
      action: "clearance.token.issue"
    });
  }
  if (url.pathname.startsWith("/api/crm/client-settings/") && method === "PATCH") {
    return itemBody({
      requestId: "lcx-vltui-05-client-setting-patch",
      outcome: "updated",
      item: { ...clientSettings[0], duplicate_review_required: true },
      auditHintRef: "ui_lcx_vltui_05_client_settings_patch_probe",
      action: "crm.client_policy.patched"
    });
  }
  return itemBody({ requestId: "lcx-vltui-05-write-generic", item: {}, action: "crm.generic.recorded" });
}

function responseFor(url, method) {
  if (url.pathname === "/master-data/records") return collectionBody("lcx-vltui-05-client-records", clientRecords);
  if (url.pathname.startsWith("/api/crm") && (method === "POST" || method === "PATCH")) return writeBody(url, method);
  if (url.pathname.startsWith("/api/crm")) return crmCollection(url);
  if (url.pathname === "/api/intake/requests") {
    return collectionBody("lcx-vltui-05-intake-requests", [
      {
        intake_request_id: "intake_cmp_g6_synthetic_001",
        opportunity_id: "opp_cmp_g6_synthetic_001",
        requesting_party_id: "party_cmp_g6_client_001",
        party_ids: ["party_cmp_g6_client_001"],
        status: "open",
        requested_scope_summary: "Synthetic intake request"
      }
    ]);
  }
  if (url.pathname === "/api/intake/audit") return collectionBody("lcx-vltui-05-intake-audit", [{ action: "intake.read", decision: "allow" }]);
  if (url.pathname.startsWith("/api/intake")) return writeBody(url, method);
  if (url.pathname === "/api/finance/invoices") {
    return collectionBody("lcx-vltui-05-invoices", [
      { invoice_id: "invoice_cmp_g7_seed", amount_due: 400000, amount_paid: 0, currency: "KRW", status: "issued", billing_client_party_id: "party_cmp_g6_client_001" }
    ], "ui_cmp_g7_finance_probe");
  }
  if (url.pathname === "/api/finance/ar-aging") {
    return collectionBody("lcx-vltui-05-ar-aging", [
      { ar_balance_id: "ar_cmp_g7_seed", invoice_id: "invoice_cmp_g7_seed", balance: 400000, status: "open", billing_client_party_id: "party_cmp_g6_client_001" }
    ], "ui_cmp_g7_finance_probe");
  }
  if (url.pathname.startsWith("/api/finance")) return collectionBody("lcx-vltui-05-finance-generic", []);
  return collectionBody("lcx-vltui-05-generic", []);
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
  if (url.pathname === "/api/crm/activities") return "activity_create";
  if (url.pathname.startsWith("/api/crm/activities/")) return "activity_patch";
  if (url.pathname === "/api/crm/proposals") return "proposal_create";
  if (url.pathname.startsWith("/api/crm/proposals/")) return "proposal_provider_blocked";
  if (url.pathname === "/api/crm/duplicate-merge-proposals") return "merge_create";
  if (url.pathname === "/api/intake/conflict-checks") return "conflict_check";
  if (url.pathname === "/api/intake/clearance-tokens") return "clearance_token";
  if (url.pathname.startsWith("/api/crm/client-settings/")) return "client_setting_patch";
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

async function visible(page, selector) {
  await page.locator(selector).first().waitFor({ state: "visible", timeout: 15000 });
  return true;
}

function writePassed(write, auditHintRef) {
  const principal = write?.context?.principal ?? {};
  return (
    principal.user_id === ACTOR_REF &&
    principal.tenant_id === "tenant_cmp_g6_synthetic" &&
    principal.session_principal_source === "desktop_web_session_envelope" &&
    write.payload?.actor_id === ACTOR_REF &&
    write.payload?.audit_hint_ref === auditHintRef
  );
}

function forbiddenText(value) {
  return /@|password|reset|bearer|cookie|secret|credential|authorization|sk-|token_material/i.test(JSON.stringify(value));
}

function renderMarkdown(report) {
  const rows = report.cases[0].checks.map((item) => `| ${item.id} | ${item.passed ? "PASS" : "FAIL"} |`).join("\n");
  return `# LCX-VLTUI-05 Client Sections Proof\n\nVerdict: ${report.verdict}\n\n| Check | Result |\n|---|---|\n${rows}\n\nBoundary: Client sections are route-backed or explicitly provider/approval blocked; no production, go-live, public release, owner approval, or provider-send claim.\n`;
}

async function runCase(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  await context.addInitScript(
    ({ key, envelope }) => {
      window.sessionStorage.setItem(key, JSON.stringify(envelope));
    },
    { key: SESSION_KEY, envelope: sessionEnvelope }
  );
  const page = await context.newPage();
  const pageErrors = [];
  const writes = [];
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
      const body = responseFor(url, request.method());
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
      return;
    }
    await route.continue();
  });

  try {
    await page.goto(proofUrl("#client-activities"), { waitUntil: "domcontentloaded" });
    await visible(page, "[data-client-activities-connected='true']");
    await page.locator("[data-client-activity-create-action='true']").getByRole("button", { name: "추가" }).click();
    const activityCreate = await waitFor(() => writes.find((write) => write.kind === "activity_create"), "activity create");
    await page.locator("[data-client-activity-patch-action='true']").getByRole("button", { name: "검토 표시" }).click();
    const activityPatch = await waitFor(() => writes.find((write) => write.kind === "activity_patch"), "activity patch");

    await page.goto(proofUrl("#client-contracts"), { waitUntil: "domcontentloaded" });
    await visible(page, "[data-client-contracts-connected='true']");
    await page.locator("[data-client-contract-create-action='true']").getByRole("button", { name: "초안 생성" }).click();
    const proposalCreate = await waitFor(() => writes.find((write) => write.kind === "proposal_create"), "proposal create");
    await page.locator("[data-client-contract-esign-provider-blocked='true']").getByRole("button", { name: "발송 확인" }).click();
    const proposalBlocked = await waitFor(() => writes.find((write) => write.kind === "proposal_provider_blocked"), "proposal provider blocked");

    await page.goto(proofUrl("#client-relationships"), { waitUntil: "domcontentloaded" });
    await visible(page, "[data-client-relationships-connected='true']");
    await page.locator("[data-sf-b-w01r-merge-review='true']").getByRole("button", { name: "검토 생성" }).click();
    const mergeCreate = await waitFor(() => writes.find((write) => write.kind === "merge_create"), "merge proposal create");

    await page.goto(proofUrl("#client-conflict"), { waitUntil: "domcontentloaded" });
    await visible(page, "[data-client-conflict-connected='true']");
    await page.locator("[data-intake-clearance-action='true']").getByRole("button", { name: "이해상충 검토" }).click();
    const conflictCheck = await waitFor(() => writes.find((write) => write.kind === "conflict_check"), "conflict check");
    await page.locator("[data-intake-clearance-action='true']").getByRole("button", { name: "통과 처리" }).click();
    const clearanceToken = await waitFor(() => writes.find((write) => write.kind === "clearance_token"), "clearance token");

    await page.goto(proofUrl("#client-billing"), { waitUntil: "domcontentloaded" });
    const billingVisible = await visible(page, "[data-client-billing-connected='true']");
    const providerBlockedVisible = await visible(page, "[data-client-billing-provider-blocked='true']");

    await page.goto(proofUrl("#client-settings"), { waitUntil: "domcontentloaded" });
    await visible(page, "[data-client-settings-connected='true']");
    await page.locator("[data-client-settings-policy-patch-action='true']").getByRole("button", { name: "정책 확인" }).click();
    const clientSettingPatch = await waitFor(() => writes.find((write) => write.kind === "client_setting_patch"), "client setting patch");
    await page.screenshot({ path: join(ROOT, SCREENSHOT_DIR, "lcx-vltui-05-client-sections-proof.png"), fullPage: true });

    const checks = [
      { id: "activity-section-connected", passed: Boolean(activityCreate && activityPatch) },
      { id: "activity-create-session-audit", passed: writePassed(activityCreate, "ui_lcx_vltui_05_activity_write_probe") },
      { id: "activity-patch-session-audit", passed: writePassed(activityPatch, "ui_lcx_vltui_05_activity_patch_probe") },
      { id: "contract-section-connected", passed: Boolean(proposalCreate && proposalBlocked) },
      { id: "proposal-create-session-audit", passed: writePassed(proposalCreate, "ui_lcx_vltui_05_proposal_write_probe") },
      { id: "proposal-provider-blocked-session-audit", passed: writePassed(proposalBlocked, "ui_lcx_vltui_05_proposal_patch_probe") && proposalBlocked.payload?.field_updates?.e_sign_send_requested === true },
      { id: "relationship-merge-route-backed", passed: writePassed(mergeCreate, "ui_sf_b_w01_merge_write_probe") },
      { id: "conflict-clearance-route-backed", passed: writePassed(conflictCheck, "ui_cmp_g6_crm_intake_probe") && writePassed(clearanceToken, "ui_cmp_g6_crm_intake_probe") },
      { id: "billing-provider-blocked-visible", passed: billingVisible && providerBlockedVisible },
      { id: "settings-policy-session-admin-audit", passed: writePassed(clientSettingPatch, "ui_lcx_vltui_05_client_settings_patch_probe") },
      { id: "no-forbidden-session-or-secret-text", passed: !forbiddenText({ writes, checks: "lcx-vltui-05" }) },
      { id: "no-page-errors", passed: pageErrors.length === 0 }
    ];

    return {
      id: "client-planned-section-implementation",
      passed: checks.every((item) => item.passed),
      checks,
      writes: writes.map((write) => ({
        kind: write.kind,
        path: write.path,
        principal: write.context?.principal ?? null,
        audit_hint_ref: write.payload?.audit_hint_ref ?? null
      })),
      page_errors: pageErrors,
      screenshot: `${SCREENSHOT_DIR}/lcx-vltui-05-client-sections-proof.png`
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
      schema_version: "law-firm-os.lazycodex.lcx_vltui.client_sections_proof.v0.1",
      tuw_ids: ["LCX-VLTUI-05.01", "LCX-VLTUI-05.02", "LCX-VLTUI-05.03", "LCX-VLTUI-05.04", "LCX-VLTUI-05.05", "LCX-VLTUI-05.06", "LCX-VLTUI-05.07"],
      generated_at: new Date().toISOString(),
      verdict: result.passed ? "PASS" : "FAIL",
      boundary: {
        synthetic_route_interception_only: true,
        planned_client_section_count: 0,
        provider_send_executed: false,
        payment_or_invoice_send_executed: false,
        automatic_identity_merge_executed: false,
        customer_data_write_executed: false,
        production_ready: false,
        public_release: false,
        go_live_approved: false,
        owner_final_approval: false
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
    console.log(JSON.stringify({ verdict: report.verdict, proof: JSON_PATH, markdown: MD_PATH }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
