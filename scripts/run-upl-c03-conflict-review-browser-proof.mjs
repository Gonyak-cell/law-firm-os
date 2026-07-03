#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/upl-c03-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-c03-conflict-review-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-c03-conflict-review-browser-proof.md`;
const SESSION_KEY = "lawos.session.envelope";

const TENANT = "tenant_upl_c03_conflict_review";
const ACTOR = "user_upl_c03_reviewer";
const INTAKE_ID = "intake_upl_c03_ui";
const CONFLICT_ID = "conflict_upl_c03_ui";
const HIT_ID = "hit_upl_c03_ui_adverse";
const ENGAGEMENT_ID = "engagement_upl_c03_ui";
const SNAPSHOT_HASH = "snapshot_upl_c03_ui";

const sessionEnvelope = {
  schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
  state: "signed_in",
  session_ref: "desktop:user_upl_c03_conflict:browser-proof",
  source: "desktop_offline_login",
  actor_ref: ACTOR,
  tenant_refs: { default: TENANT, client: TENANT, matter: TENANT, vault: TENANT, crm: TENANT },
  role_ids: ["crm_intake_user", "conflict_reviewer", "matter_runtime_user"],
  scopes: ["client_read", "matter_read"],
  review_state: "allow",
  expires_at: "2999-12-31T23:59:59.000Z",
};

const intakeRequest = {
  intake_request_id: INTAKE_ID,
  tenant_id: TENANT,
  requesting_party_id: "party_upl_c03_new_client",
  party_ids: ["party_upl_c03_new_client"],
  requested_scope_summary: "상대방 연계 이해상충 검토",
  status: "open",
  owner_user_id: ACTOR,
  production_ready_claim: false,
};

const conflictCheck = {
  conflict_check_id: CONFLICT_ID,
  tenant_id: TENANT,
  intake_request_id: INTAKE_ID,
  party_snapshot: { party_ids: intakeRequest.party_ids },
  snapshot_hash: SNAPSHOT_HASH,
  status: "review_required",
  production_ready_claim: false,
};

const conflictHit = {
  conflict_hit_id: HIT_ID,
  tenant_id: TENANT,
  conflict_check_id: CONFLICT_ID,
  matched_party_id: "party_upl_c03_adverse",
  hit_source: "former_matter",
  source_record_ref: "MatterParty:matter_party_upl_c03_adverse",
  severity: "high",
  status: "review_required",
  matched_display_name: "상대방 주식회사",
  matched_model_type: "MatterParty",
  matched_party_role: "adverse_party",
  source_matter_ref_included: false,
  raw_hit_payload_visible: false,
  production_ready_claim: false,
};

const auditEvents = [
  { event_id: "audit_upl_c03_search", action: "conflict.search.executed", object_type: "ConflictSearch", object_id: "search_upl_c03_ui", metadata: { hit_count: 1 } },
];

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
    audit_hint_ref: "upl_c03_browser_proof",
    ui_state: items.length === 0 ? "empty" : null,
    count_leak_prevented: true,
    production_ready_claim: false,
  };
}

function baseItemBody(requestId, item, extra = {}, status = 201) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: status === 200 ? "idempotent_replay" : "created",
      item,
      audit_event: { event_id: `audit:${requestId}`, action: "browser.proof", decision: "allow", production_ready_claim: false },
      safe_error_codes: [],
      audit_hint_ref: "upl_c03_browser_proof",
      production_ready_claim: false,
      ...extra,
    },
  };
}

function conflictCheckBody() {
  return baseItemBody("upl-c03-conflict-check", conflictCheck, {
    conflict_search: {
      conflict_search_id: "search_upl_c03_ui",
      tenant_id: TENANT,
      conflict_check_id: CONFLICT_ID,
      normalized_terms: ["상대방"],
      generated_hit_ids: [HIT_ID],
      caller_supplied_hit_count_ignored: true,
      hit_count: 1,
      raw_query_included: false,
      status: "executed",
      production_ready_claim: false,
    },
    conflict_hits: [conflictHit],
    hit_count: 1,
  }).body;
}

function decisionBody() {
  const clearedHit = { ...conflictHit, status: "cleared", reviewer_id: ACTOR, review_decision_id: "decision_upl_c03_ui" };
  return baseItemBody("upl-c03-decision", {
    conflict_decision_id: "decision_upl_c03_ui",
    tenant_id: TENANT,
    conflict_check_id: CONFLICT_ID,
    conflict_hit_ids: [HIT_ID],
    reviewer_id: ACTOR,
    decision: "clear",
    rationale: "ui_conflict_review",
    status: "cleared",
    production_ready_claim: false,
  }, {
    conflict_decision: {
      conflict_decision_id: "decision_upl_c03_ui",
      tenant_id: TENANT,
      conflict_check_id: CONFLICT_ID,
      reviewer_id: ACTOR,
      decision: "clear",
      status: "cleared",
      production_ready_claim: false,
    },
    conflict_check: { ...conflictCheck, status: "cleared", reviewer_id: ACTOR, review_decision: "clear" },
    conflict_hits: [clearedHit],
    clearance_link_ready: true,
  }).body;
}

function waiverBody() {
  return baseItemBody("upl-c03-waiver", {
    waiver_id: "waiver_upl_c03_ui",
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    conflict_check_id: CONFLICT_ID,
    conflict_hit_ids: [HIT_ID],
    consent_document_id: "consent_doc_upl_c03_ui",
    approver_id: ACTOR,
    status: "approved",
    production_ready_claim: false,
  }, {
    outcome: "approved",
    waiver: {
      waiver_id: "waiver_upl_c03_ui",
      tenant_id: TENANT,
      intake_request_id: INTAKE_ID,
      conflict_check_id: CONFLICT_ID,
      consent_document_id: "consent_doc_upl_c03_ui",
      status: "approved",
      production_ready_claim: false,
    },
    conflict_check: { ...conflictCheck, status: "cleared", waiver_id: "waiver_upl_c03_ui" },
    clearance_link_ready: true,
  }).body;
}

function engagementBody() {
  return baseItemBody("upl-c03-engagement", {
    engagement_id: ENGAGEMENT_ID,
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    template_id: "matter_engagement_letter",
    signed_document_id: "signed_doc_upl_c03_ui",
    signature_ref: "signature:signed_doc_upl_c03_ui",
    status: "approved",
    production_ready_claim: false,
  }, {
    outcome: "approved",
    engagement: {
      engagement_id: ENGAGEMENT_ID,
      tenant_id: TENANT,
      intake_request_id: INTAKE_ID,
      signed_document_id: "signed_doc_upl_c03_ui",
      signature_ref: "signature:signed_doc_upl_c03_ui",
      status: "approved",
      production_ready_claim: false,
    },
    engagement_ready: true,
    signed_document_id: "signed_doc_upl_c03_ui",
  }).body;
}

function clearanceBody() {
  return baseItemBody("upl-c03-clearance", {
    clearance_token_id: "clearance_upl_c03_ui",
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    conflict_check_id: CONFLICT_ID,
    engagement_id: ENGAGEMENT_ID,
    snapshot_hash: SNAPSHOT_HASH,
    token_state: "active",
    status: "active",
    conflict_review_satisfied: true,
    engagement_review_satisfied: true,
    production_ready_claim: false,
  }, {
    validation: { valid: true, errors: [], token_state: "active", production_ready_claim: false },
    conflict_review: { review_satisfied: true, reason: "clear_decision_recorded", conflict_check_id: CONFLICT_ID, hit_count: 1, production_ready_claim: false },
    engagement_review: { engagement_satisfied: true, reason: "approved_engagement_recorded", engagement_id: ENGAGEMENT_ID, production_ready_claim: false },
  }).body;
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

async function run() {
  mkdirSync(join(ROOT, SCREENSHOT_DIR), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const writes = [];
  const consoleEvents = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleEvents.push({ type: message.type(), text: message.text() });
  });
  page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText ?? "request_failed" }));
  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)), { key: SESSION_KEY, value: sessionEnvelope });

  await page.route("**/api/**", (route) => fulfillJson(route, collectionBody("upl-c03-empty", [])));
  await page.route("**/master-data/**", (route) => fulfillJson(route, collectionBody("upl-c03-master-empty", [])));
  await page.route("**/api/intake/clearance-tokens", async (route, request) => {
    writes.push({ kind: "clearance", payload: request.postDataJSON() });
    auditEvents.push({ event_id: "audit_upl_c03_clearance", action: "clearance.token.issue", object_type: "ClearanceToken", object_id: "clearance_upl_c03_ui", metadata: { conflict_check_id: CONFLICT_ID } });
    await fulfillJson(route, clearanceBody(), 201);
  });
  await page.route("**/api/intake/engagements", async (route, request) => {
    writes.push({ kind: "engagement", payload: request.postDataJSON() });
    auditEvents.push({ event_id: "audit_upl_c03_engagement", action: "engagement.approved", object_type: "Engagement", object_id: ENGAGEMENT_ID, metadata: { intake_request_id: INTAKE_ID } });
    await fulfillJson(route, engagementBody(), 201);
  });
  await page.route("**/api/intake/waivers", async (route, request) => {
    writes.push({ kind: "waiver", payload: request.postDataJSON() });
    auditEvents.push({ event_id: "audit_upl_c03_waiver", action: "waiver.approved", object_type: "Waiver", object_id: "waiver_upl_c03_ui", metadata: { consent_document_id: "consent_doc_upl_c03_ui" } });
    await fulfillJson(route, waiverBody(), 201);
  });
  await page.route("**/api/intake/conflict-decisions", async (route, request) => {
    writes.push({ kind: "decision", payload: request.postDataJSON() });
    auditEvents.push({ event_id: "audit_upl_c03_decision", action: "conflict.decision.record", object_type: "ConflictDecision", object_id: "decision_upl_c03_ui", metadata: { reviewer_id: ACTOR } });
    await fulfillJson(route, decisionBody(), 201);
  });
  await page.route("**/api/intake/conflict-checks", async (route, request) => {
    writes.push({ kind: "conflict_check", payload: request.postDataJSON() });
    auditEvents.push({ event_id: "audit_upl_c03_hit", action: "conflict.hit.create", object_type: "ConflictHit", object_id: HIT_ID, metadata: { hit_source: "former_matter" } });
    await fulfillJson(route, conflictCheckBody(), 201);
  });
  await page.route("**/api/intake/audit**", (route) => fulfillJson(route, collectionBody("upl-c03-audit-list", auditEvents)));
  await page.route("**/api/intake/requests**", (route) => fulfillJson(route, collectionBody("upl-c03-intake-list", [intakeRequest])));

  await page.goto(proofUrl("client-conflict"), { waitUntil: "domcontentloaded" });
  await page.locator("[data-client-conflict-connected='true']").waitFor({ state: "visible", timeout: 15000 });
  const actionPanel = page.locator("[data-intake-conflict-review-flow='true']");
  await actionPanel.getByRole("button", { name: "이해상충 검토" }).click();
  await page.locator("[data-intake-conflict-hit-list='true']").getByText("상대방 주식회사", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
  await actionPanel.getByRole("button", { name: "검토 결정" }).click();
  await actionPanel.getByText("검토 결정이 기록되었습니다.").waitFor({ state: "visible", timeout: 15000 });
  await actionPanel.getByRole("button", { name: "Waiver 승인" }).click();
  await actionPanel.getByText("Waiver 승인 기록이 남았습니다.").waitFor({ state: "visible", timeout: 15000 });
  await actionPanel.getByRole("button", { name: "수임 승인" }).click();
  await actionPanel.getByText("수임 승인 완료.").waitFor({ state: "visible", timeout: 15000 });
  await actionPanel.getByRole("button", { name: "통과 처리" }).click();
  await actionPanel.getByText("통과 처리되었습니다.").waitFor({ state: "visible", timeout: 15000 });

  const panelText = await actionPanel.innerText();
  const hitListText = await page.locator("[data-intake-conflict-hit-list='true']").innerText();
  const screenshot = join(ROOT, SCREENSHOT_DIR, "upl-c03-conflict-review-flow.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  await browser.close();

  const writeKinds = writes.map((write) => write.kind);
  const checks = [
    {
      id: "review-flow-buttons-drive-all-routes",
      passed: ["conflict_check", "decision", "waiver", "engagement", "clearance"].every((kind) => writeKinds.includes(kind)),
    },
    {
      id: "conflict-review-ui-shows-hit-decision-waiver-clearance",
      passed:
        hitListText.includes("상대방 주식회사") &&
        hitListText.includes("과거 Matter") &&
        panelText.includes("검토 결정이 기록되었습니다.") &&
        panelText.includes("Waiver 승인 기록이 남았습니다.") &&
        panelText.includes("수임 승인 완료.") &&
        panelText.includes("통과 처리되었습니다."),
    },
    {
      id: "browser-proof-clean",
      passed: consoleEvents.length === 0 && failedRequests.length === 0,
    },
  ];
  const report = {
    schema_version: "law-firm-os.upl-c03.browser-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    contract_ref: "UPL-C-03",
    url: proofUrl("client-conflict"),
    screenshot,
    checks,
    observed: { writes, panel_text: panelText, hit_list_text: hitListText, audit_events: auditEvents, console_events: consoleEvents, failed_requests: failedRequests },
  };
  writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    join(ROOT, MD_PATH),
    [
      "# UPL-C-03 Conflict Review Browser Proof",
      "",
      `- verdict: ${report.verdict}`,
      `- url: ${report.url}`,
      `- screenshot: ${screenshot}`,
      "",
      "## Checks",
      ...checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`),
      "",
      "## Writes",
      ...writes.map((write) => `- ${write.kind}`),
      "",
    ].join("\n"),
  );
  console.log(JSON.stringify({ verdict: report.verdict, proof: JSON_PATH, screenshot }, null, 2));
  if (report.verdict !== "PASS") process.exit(1);
}

await run();
