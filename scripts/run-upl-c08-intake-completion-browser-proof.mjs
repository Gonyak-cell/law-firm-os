#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/upl-c08-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-c08-intake-completion-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-c08-intake-completion-browser-proof.md`;
const SESSION_KEY = "lawos.session.envelope";

const TENANT = "tenant_upl_c08_intake_completion";
const ACTOR = "user_upl_c08_intake_operator";
const PARTY_ID = "party_upl_c08_new_client";
const ACCOUNT_ID = "account_upl_c08_new_client";
const OPPORTUNITY_ID = "opp_upl_c08_ui";
const INTAKE_ID = "intake_upl_c08_ui";
const CONFLICT_ID = "conflict_upl_c08_ui";
const SNAPSHOT_HASH = "snapshot_upl_c08_ui";
const CLEARANCE_ID = "clearance_upl_c08_ui";
const MATTER_ID = "matter_upl_c08_ui";

const sessionEnvelope = {
  schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
  state: "signed_in",
  session_ref: "desktop:user_upl_c08_intake:browser-proof",
  source: "desktop_offline_login",
  actor_ref: ACTOR,
  tenant_refs: { default: TENANT, client: TENANT, matter: TENANT, vault: TENANT, crm: TENANT },
  role_ids: ["crm_intake_user", "conflict_reviewer", "matter_runtime_user"],
  scopes: ["client_read", "matter_read"],
  review_state: "allow",
  expires_at: "2999-12-31T23:59:59.000Z",
};

let opportunity = null;
let intakeRequest = null;
let conflictCheck = null;
let conflictDecision = null;
let engagementRecord = null;
let clearanceToken = null;
let openedMatter = null;

function proofUrl(hash) {
  return `${WEB}/?locale=ko&view=clients&data=live&ctx=allow#${hash}`;
}

function collectionBody(requestId, items = []) {
  return {
    request_id: requestId,
    outcome: "passed",
    items,
    page_info: { limit: 25, has_more: false },
    safe_error_codes: [],
    audit_hint_ref: "upl_c08_browser_proof",
    ui_state: items.length === 0 ? "empty" : null,
    count_leak_prevented: true,
    production_ready_claim: false,
  };
}

function itemBody(requestId, item, extra = {}, status = 201) {
  return {
    request_id: requestId,
    outcome: status === 200 ? "idempotent_replay" : "created",
    item,
    audit_event: { event_id: `audit:${requestId}`, action: "browser.proof", decision: "allow", production_ready_claim: false },
    safe_error_codes: [],
    audit_hint_ref: "upl_c08_browser_proof",
    production_ready_claim: false,
    ...extra,
  };
}

function createOpportunityBody(payload = {}) {
  opportunity = {
    ...payload.opportunity,
    opportunity_id: OPPORTUNITY_ID,
    tenant_id: TENANT,
    party_id: payload.opportunity?.party_id ?? PARTY_ID,
    display_name: payload.opportunity?.display_name ?? "신규 의뢰",
    requested_scope_summary: payload.opportunity?.requested_scope_summary ?? "신규 의뢰 수임 검토",
    stage: "new",
    status: "active",
    allowed_conversion_target: "IntakeRequest",
    matter_id: null,
    production_ready_claim: false,
  };
  return itemBody("upl-c08-opportunity-create", opportunity);
}

function handoffBody() {
  opportunity = {
    ...opportunity,
    stage: "intake_requested",
    status: "active",
    intake_request_id: INTAKE_ID,
  };
  intakeRequest = {
    intake_request_id: INTAKE_ID,
    tenant_id: TENANT,
    opportunity_id: OPPORTUNITY_ID,
    requesting_party_id: opportunity.party_id,
    party_ids: [opportunity.party_id],
    requested_scope_summary: opportunity.requested_scope_summary,
    status: "open",
    owner_user_id: ACTOR,
    production_ready_claim: false,
  };
  return itemBody("upl-c08-handoff", intakeRequest, { opportunity });
}

function conflictCheckBody(payload = {}) {
  conflictCheck = {
    ...payload.conflict_check,
    conflict_check_id: CONFLICT_ID,
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    party_snapshot: { party_ids: [PARTY_ID] },
    snapshot_hash: SNAPSHOT_HASH,
    status: "snapshot_recorded",
    production_ready_claim: false,
  };
  return itemBody("upl-c08-conflict-check", conflictCheck, {
    conflict_search: {
      conflict_search_id: "search_upl_c08_ui",
      tenant_id: TENANT,
      conflict_check_id: CONFLICT_ID,
      normalized_terms: ["신규의뢰"],
      generated_hit_ids: [],
      caller_supplied_hit_count_ignored: true,
      hit_count: 0,
      raw_query_included: false,
      status: "executed",
      production_ready_claim: false,
    },
    conflict_hits: [],
    hit_count: 0,
  });
}

function decisionBody() {
  conflictDecision = {
    conflict_decision_id: "decision_upl_c08_ui",
    tenant_id: TENANT,
    conflict_check_id: CONFLICT_ID,
    conflict_hit_ids: [],
    reviewer_id: ACTOR,
    decision: "clear",
    rationale: "ui_intake_completion_review",
    status: "cleared",
    production_ready_claim: false,
  };
  conflictCheck = { ...conflictCheck, status: "cleared", reviewer_id: ACTOR, review_decision: "clear" };
  return itemBody("upl-c08-decision", conflictDecision, {
    conflict_decision: conflictDecision,
    conflict_check: conflictCheck,
    conflict_hits: [],
    clearance_link_ready: true,
  });
}

function engagementBody(payload = {}) {
  const engagement = payload.engagement ?? {};
  engagementRecord = {
    engagement_id: engagement.engagement_id,
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    template_id: engagement.template_id,
    template_document_id: engagement.template_document?.template_document_id,
    signed_document_id: engagement.signed_document_id,
    signature_ref: engagement.signature_ref,
    signed_document_upload_id: engagement.signed_document_upload?.signed_document_upload_id,
    signed_upload_verified: true,
    status: "approved",
    production_ready_claim: false,
  };
  return itemBody("upl-c08-engagement", engagementRecord, {
    outcome: "approved",
    engagement: engagementRecord,
    engagement_ready: true,
    template_document_id: engagementRecord.template_document_id,
    signed_document_id: engagementRecord.signed_document_id,
    signed_document_upload_id: engagementRecord.signed_document_upload_id,
    signed_upload_verified: true,
  });
}

function clearanceBody(payload = {}) {
  clearanceToken = {
    ...payload.token,
    clearance_token_id: CLEARANCE_ID,
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    conflict_check_id: CONFLICT_ID,
    engagement_id: engagementRecord?.engagement_id,
    snapshot_hash: SNAPSHOT_HASH,
    token_state: "active",
    status: "active",
    conflict_review_satisfied: true,
    engagement_review_satisfied: true,
    production_ready_claim: false,
  };
  return itemBody("upl-c08-clearance", clearanceToken, {
    validation: { valid: true, errors: [], token_state: "active", production_ready_claim: false },
    conflict_review: { review_satisfied: true, reason: "clear_decision_recorded", conflict_check_id: CONFLICT_ID, hit_count: 0 },
    engagement_review: { engagement_satisfied: true, reason: "approved_engagement_recorded", engagement_id: engagementRecord?.engagement_id },
  });
}

function matterOpeningBody(payload = {}) {
  openedMatter = {
    ...payload.matter,
    matter_id: MATTER_ID,
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    clearance_token_id: payload.clearance_token?.clearance_token_id,
    matter_number: "CMP-G6-INTAKE-0001",
    status: "opening",
    production_ready_claim: false,
  };
  return itemBody("upl-c08-matter-opening", openedMatter, {
    matter: openedMatter,
  });
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function run() {
  mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1180 } });
  const writes = [];
  const consoleEvents = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleEvents.push({ type: message.type(), text: message.text() });
  });
  page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText ?? "request_failed" }));
  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)), { key: SESSION_KEY, value: sessionEnvelope });

  await page.route("**/api/**", (route) => fulfillJson(route, collectionBody("upl-c08-empty", [])));
  await page.route("**/master-data/**", (route) => fulfillJson(route, collectionBody("upl-c08-master-empty", [])));
  await page.route("**/api/crm/accounts?**", (route) =>
    fulfillJson(route, collectionBody("upl-c08-accounts", [{
      account_id: ACCOUNT_ID,
      tenant_id: TENANT,
      party_id: PARTY_ID,
      display_name: "신규 의뢰 고객",
      status: "active",
      production_ready_claim: false,
    }])),
  );
  await page.route("**/api/crm/opportunities?**", (route) =>
    fulfillJson(route, collectionBody("upl-c08-opportunities", opportunity ? [opportunity] : [])),
  );
  await page.route("**/api/intake/requests**", (route) =>
    fulfillJson(route, collectionBody("upl-c08-intake-list", intakeRequest ? [intakeRequest] : [])),
  );
  await page.route("**/api/intake/audit**", (route) => fulfillJson(route, collectionBody("upl-c08-audit", [])));
  await page.route("**/api/crm/opportunities", async (route, request) => {
    const payload = request.postDataJSON();
    writes.push({ kind: "opportunity", payload });
    await fulfillJson(route, createOpportunityBody(payload), 201);
  });
  await page.route("**/api/crm/opportunities/*/handoff", async (route, request) => {
    const payload = request.postDataJSON();
    writes.push({ kind: "handoff", payload });
    await fulfillJson(route, handoffBody(), 201);
  });
  await page.route("**/api/intake/conflict-checks", async (route, request) => {
    const payload = request.postDataJSON();
    writes.push({ kind: "conflict_check", payload });
    await fulfillJson(route, conflictCheckBody(payload), 201);
  });
  await page.route("**/api/intake/conflict-decisions", async (route, request) => {
    const payload = request.postDataJSON();
    writes.push({ kind: "decision", payload });
    await fulfillJson(route, decisionBody(), 201);
  });
  await page.route("**/api/intake/engagements", async (route, request) => {
    const payload = request.postDataJSON();
    writes.push({ kind: "engagement", payload });
    await fulfillJson(route, engagementBody(payload), 201);
  });
  await page.route("**/api/intake/clearance-tokens", async (route, request) => {
    const payload = request.postDataJSON();
    writes.push({ kind: "clearance", payload });
    await fulfillJson(route, clearanceBody(payload), 201);
  });
  await page.route("**/api/matters/openings", async (route, request) => {
    const payload = request.postDataJSON();
    writes.push({ kind: "matter_opening", payload });
    await fulfillJson(route, matterOpeningBody(payload), 201);
  });

  await page.goto(proofUrl("client-intake"), { waitUntil: "domcontentloaded" });
  const surface = page.locator("[data-upl-c08-intake-completion-surface='true']");
  await surface.waitFor({ state: "visible", timeout: 15000 });
  const manualInputCount = await surface.locator("input, textarea").count();
  await surface.getByRole("button", { name: "의뢰 접수" }).click();
  await surface.getByText("신규 의뢰가 인테이크로 접수되었습니다.").waitFor({ state: "visible", timeout: 15000 });
  const actionPanel = page.locator("[data-intake-matter-opening-flow='true']");
  await actionPanel.getByRole("button", { name: "이해상충 검토" }).click();
  await page.locator("[data-intake-conflict-hit-list='true']").getByText("히트 없음", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
  await actionPanel.getByRole("button", { name: "검토 결정" }).click();
  await actionPanel.getByText("검토 결정이 기록되었습니다.").waitFor({ state: "visible", timeout: 15000 });
  await actionPanel.getByRole("button", { name: "수임 승인" }).click();
  await actionPanel.getByText("수임 승인 완료.").waitFor({ state: "visible", timeout: 15000 });
  await actionPanel.getByRole("button", { name: "통과 처리" }).click();
  await actionPanel.getByText("통과 처리되었습니다.").waitFor({ state: "visible", timeout: 15000 });
  await actionPanel.getByRole("button", { name: "Matter 개설" }).click();
  await actionPanel.getByText("Matter가 개설되었습니다.").waitFor({ state: "visible", timeout: 15000 });

  const surfaceText = await surface.innerText();
  const screenshot = join(ROOT, SCREENSHOT_DIR, "upl-c08-intake-completion.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  await browser.close();

  const writeOrder = writes.map((write) => write.kind);
  const opportunityWrite = writes.find((write) => write.kind === "opportunity");
  const handoffWrite = writes.find((write) => write.kind === "handoff");
  const conflictWrite = writes.find((write) => write.kind === "conflict_check");
  const clearanceWrite = writes.find((write) => write.kind === "clearance");
  const matterWrite = writes.find((write) => write.kind === "matter_opening");
  const checks = [
    {
      id: "intake-surface-mounted-with-new-inquiry-action",
      passed: surfaceText.includes("신규 의뢰 접수") && surfaceText.includes("인테이크") && manualInputCount === 0,
    },
    {
      id: "ui-drives-full-intake-to-matter-write-order",
      passed: JSON.stringify(writeOrder) === JSON.stringify(["opportunity", "handoff", "conflict_check", "decision", "engagement", "clearance", "matter_opening"]),
    },
    {
      id: "opportunity-does-not-shortcut-to-matter",
      passed:
        opportunityWrite?.payload?.opportunity?.party_id === PARTY_ID &&
        opportunityWrite?.payload?.opportunity?.display_name === "신규 의뢰" &&
        opportunityWrite?.payload?.opportunity?.matter_id === undefined &&
        opportunityWrite?.payload?.opportunity?.matter_open_command === undefined,
    },
    {
      id: "handoff-creates-active-intake-context",
      passed: handoffWrite?.payload?.intake_request_id && intakeRequest?.intake_request_id === INTAKE_ID && intakeRequest?.opportunity_id === OPPORTUNITY_ID,
    },
    {
      id: "conflict-clearance-uses-created-intake",
      passed:
        conflictWrite?.payload?.conflict_check?.intake_request_id === INTAKE_ID &&
        conflictWrite?.payload?.conflict_check?.party_snapshot?.party_ids?.includes(PARTY_ID) &&
        clearanceWrite?.payload?.token?.intake_request_id === INTAKE_ID &&
        clearanceWrite?.payload?.token?.snapshot_hash === SNAPSHOT_HASH,
    },
    {
      id: "matter-opening-uses-clearance-token",
      passed:
        matterWrite?.payload?.permission_ref === "ui_cmp_g6_intake_matter_open" &&
        matterWrite?.payload?.clearance_token?.clearance_token_id === CLEARANCE_ID &&
        matterWrite?.payload?.matter?.legal_client_party_id === PARTY_ID,
    },
    {
      id: "completion-success-rendered",
      passed: surfaceText.includes("Matter가 개설되었습니다.") && surfaceText.includes("통과 처리되었습니다."),
    },
    {
      id: "browser-proof-clean",
      passed: consoleEvents.length === 0 && failedRequests.length === 0,
    },
  ];
  const report = {
    schema_version: "law-firm-os.upl-c08.browser-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    contract_ref: "UPL-C-08",
    url: proofUrl("client-intake"),
    screenshot,
    checks,
    observed: {
      write_order: writeOrder,
      writes,
      manual_input_count: manualInputCount,
      surface_text: surfaceText,
      opened_matter: openedMatter,
      console_events: consoleEvents,
      failed_requests: failedRequests,
    },
  };
  writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    join(ROOT, MD_PATH),
    [
      "# UPL-C-08 Intake Completion Browser Proof",
      "",
      `- verdict: ${report.verdict}`,
      `- url: ${report.url}`,
      `- screenshot: ${screenshot}`,
      `- manual_input_count: ${manualInputCount}`,
      "",
      "## Checks",
      ...checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`),
      "",
      "## Write Order",
      ...writeOrder.map((kind, index) => `- ${index + 1}. ${kind}`),
      "",
    ].join("\n"),
  );
  console.log(JSON.stringify({ verdict: report.verdict, proof: JSON_PATH, screenshot }, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}

await run();
