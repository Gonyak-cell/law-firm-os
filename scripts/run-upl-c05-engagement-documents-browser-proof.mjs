#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const ROOT = process.cwd();
const WEB = process.env.MATTER_UI_URL ?? "http://127.0.0.1:5173";
const ARTIFACT_DIR = "docs/lazycodex/evidence/matter-web/artifacts";
const SCREENSHOT_DIR = `${ARTIFACT_DIR}/upl-c05-screenshots`;
const JSON_PATH = `${ARTIFACT_DIR}/upl-c05-engagement-documents-browser-proof.json`;
const MD_PATH = `${ARTIFACT_DIR}/upl-c05-engagement-documents-browser-proof.md`;
const SESSION_KEY = "lawos.session.envelope";

const TENANT = "tenant_upl_c05_engagement_docs";
const ACTOR = "user_upl_c05_reviewer";
const INTAKE_ID = "intake_upl_c05_ui";
const CONFLICT_ID = "conflict_upl_c05_ui";
const HIT_ID = "hit_upl_c05_ui_adverse";
const SNAPSHOT_HASH = "snapshot_upl_c05_ui";

const sessionEnvelope = {
  schema_version: "law-firm-os.desktop-web-session-envelope.v0.1",
  state: "signed_in",
  session_ref: "desktop:user_upl_c05_engagement:browser-proof",
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
  requesting_party_id: "party_upl_c05_new_client",
  party_ids: ["party_upl_c05_new_client"],
  requested_scope_summary: "위임계약 문서 생성과 서명본 업로드 검증",
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
  matched_party_id: "party_upl_c05_adverse",
  hit_source: "former_matter",
  source_record_ref: "MatterParty:matter_party_upl_c05_adverse",
  severity: "high",
  status: "review_required",
  matched_display_name: "신규 고객 주식회사",
  matched_model_type: "MatterParty",
  matched_party_role: "adverse_party",
  source_matter_ref_included: false,
  raw_hit_payload_visible: false,
  production_ready_claim: false,
};

const auditEvents = [
  { event_id: "audit_upl_c05_search", action: "conflict.search.executed", object_type: "ConflictSearch", object_id: "search_upl_c05_ui", metadata: { hit_count: 1 } },
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
    audit_hint_ref: "upl_c05_browser_proof",
    ui_state: items.length === 0 ? "empty" : null,
    count_leak_prevented: true,
    production_ready_claim: false,
  };
}

function baseItemBody(requestId, item, extra = {}, status = 201) {
  return {
    request_id: requestId,
    outcome: status === 200 ? "idempotent_replay" : "created",
    item,
    audit_event: { event_id: `audit:${requestId}`, action: "browser.proof", decision: "allow", production_ready_claim: false },
    safe_error_codes: [],
    audit_hint_ref: "upl_c05_browser_proof",
    production_ready_claim: false,
    ...extra,
  };
}

function conflictCheckBody() {
  return baseItemBody("upl-c05-conflict-check", conflictCheck, {
    conflict_search: {
      conflict_search_id: "search_upl_c05_ui",
      tenant_id: TENANT,
      conflict_check_id: CONFLICT_ID,
      normalized_terms: ["신규 고객"],
      generated_hit_ids: [HIT_ID],
      caller_supplied_hit_count_ignored: true,
      hit_count: 1,
      raw_query_included: false,
      status: "executed",
      production_ready_claim: false,
    },
    conflict_hits: [conflictHit],
    hit_count: 1,
  });
}

function decisionBody() {
  const clearedHit = { ...conflictHit, status: "cleared", reviewer_id: ACTOR, review_decision_id: "decision_upl_c05_ui" };
  return baseItemBody("upl-c05-decision", {
    conflict_decision_id: "decision_upl_c05_ui",
    tenant_id: TENANT,
    conflict_check_id: CONFLICT_ID,
    conflict_hit_ids: [HIT_ID],
    reviewer_id: ACTOR,
    decision: "clear",
    rationale: "ui_engagement_document_review",
    status: "cleared",
    production_ready_claim: false,
  }, {
    conflict_decision: {
      conflict_decision_id: "decision_upl_c05_ui",
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
  });
}

function waiverBody() {
  return baseItemBody("upl-c05-waiver", {
    waiver_id: "waiver_upl_c05_ui",
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    conflict_check_id: CONFLICT_ID,
    conflict_hit_ids: [HIT_ID],
    consent_document_id: "consent_doc_upl_c05_ui",
    approver_id: ACTOR,
    status: "approved",
    production_ready_claim: false,
  }, {
    outcome: "approved",
    waiver: {
      waiver_id: "waiver_upl_c05_ui",
      tenant_id: TENANT,
      intake_request_id: INTAKE_ID,
      conflict_check_id: CONFLICT_ID,
      consent_document_id: "consent_doc_upl_c05_ui",
      status: "approved",
      production_ready_claim: false,
    },
    conflict_check: { ...conflictCheck, status: "cleared", waiver_id: "waiver_upl_c05_ui" },
    clearance_link_ready: true,
  });
}

function engagementBody(payload = {}) {
  const engagement = payload.engagement ?? {};
  const templateDocument = {
    ...engagement.template_document,
    model_type: "EngagementTemplateDocument",
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    engagement_id: engagement.engagement_id,
    generation_state: "generated",
    production_ready_claim: false,
  };
  const signedUpload = {
    ...engagement.signed_document_upload,
    model_type: "EngagementSignedDocumentUpload",
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    engagement_id: engagement.engagement_id,
    upload_state: "uploaded",
    lx_registry_ref: "LX-06",
    production_ready_claim: false,
  };
  const item = {
    engagement_id: engagement.engagement_id,
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    template_id: engagement.template_id,
    template_document_id: templateDocument.template_document_id,
    signed_document_id: engagement.signed_document_id,
    signature_ref: engagement.signature_ref,
    signed_document_upload_id: signedUpload.signed_document_upload_id,
    signed_document_sha256: signedUpload.content_sha256,
    signed_upload_verified: true,
    template_document_generated: true,
    lx06_upload_verified: true,
    status: "approved",
    production_ready_claim: false,
  };
  return baseItemBody("upl-c05-engagement", item, {
    outcome: "approved",
    engagement: item,
    template_document: templateDocument,
    signed_document_upload: signedUpload,
    engagement_ready: true,
    template_document_id: templateDocument.template_document_id,
    signed_document_id: item.signed_document_id,
    signed_document_upload_id: signedUpload.signed_document_upload_id,
    signed_upload_verified: true,
  });
}

function clearanceBody(payload = {}, engagementPayload = {}) {
  const token = payload.token ?? {};
  const engagement = engagementPayload.engagement ?? {};
  const upload = engagement.signed_document_upload ?? {};
  const item = {
    clearance_token_id: token.clearance_token_id,
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    conflict_check_id: CONFLICT_ID,
    engagement_id: token.engagement_id,
    snapshot_hash: SNAPSHOT_HASH,
    token_state: "active",
    status: "active",
    conflict_review_satisfied: true,
    engagement_review_satisfied: true,
    engagement_template_document_id: engagement.template_document?.template_document_id,
    engagement_signed_document_upload_id: upload.signed_document_upload_id,
    engagement_signed_document_sha256: upload.content_sha256,
    engagement_signed_upload_verified: true,
    production_ready_claim: false,
  };
  return baseItemBody("upl-c05-clearance", item, {
    validation: { valid: true, errors: [], token_state: "active", production_ready_claim: false },
    conflict_review: { review_satisfied: true, reason: "clear_decision_recorded", conflict_check_id: CONFLICT_ID, hit_count: 1, production_ready_claim: false },
    engagement_review: {
      engagement_satisfied: true,
      reason: "approved_engagement_recorded",
      engagement_id: token.engagement_id,
      template_document_id: item.engagement_template_document_id,
      signed_document_upload_id: item.engagement_signed_document_upload_id,
      signed_upload_verified: true,
      production_ready_claim: false,
    },
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
  let lastEngagementPayload = null;

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) consoleEvents.push({ type: message.type(), text: message.text() });
  });
  page.on("requestfailed", (request) => failedRequests.push({ url: request.url(), failure: request.failure()?.errorText ?? "request_failed" }));
  await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, JSON.stringify(value)), { key: SESSION_KEY, value: sessionEnvelope });

  await page.route("**/api/**", (route) => fulfillJson(route, collectionBody("upl-c05-empty", [])));
  await page.route("**/master-data/**", (route) => fulfillJson(route, collectionBody("upl-c05-master-empty", [])));
  await page.route("**/api/intake/clearance-tokens", async (route, request) => {
    const payload = request.postDataJSON();
    writes.push({ kind: "clearance", payload });
    auditEvents.push({ event_id: "audit_upl_c05_clearance", action: "clearance.token.issue", object_type: "ClearanceToken", object_id: payload.token?.clearance_token_id, metadata: { conflict_check_id: CONFLICT_ID } });
    await fulfillJson(route, clearanceBody(payload, lastEngagementPayload ?? {}), 201);
  });
  await page.route("**/api/intake/engagements", async (route, request) => {
    const payload = request.postDataJSON();
    lastEngagementPayload = payload;
    writes.push({ kind: "engagement", payload });
    auditEvents.push({ event_id: "audit_upl_c05_template", action: "engagement.template.generated", object_type: "EngagementTemplateDocument", object_id: payload.engagement?.template_document?.template_document_id, metadata: { intake_request_id: INTAKE_ID } });
    auditEvents.push({ event_id: "audit_upl_c05_upload", action: "engagement.signed_document.uploaded", object_type: "EngagementSignedDocumentUpload", object_id: payload.engagement?.signed_document_upload?.signed_document_upload_id, metadata: { intake_request_id: INTAKE_ID } });
    auditEvents.push({ event_id: "audit_upl_c05_engagement", action: "engagement.approved", object_type: "Engagement", object_id: payload.engagement?.engagement_id, metadata: { intake_request_id: INTAKE_ID } });
    await fulfillJson(route, engagementBody(payload), 201);
  });
  await page.route("**/api/intake/waivers", async (route, request) => {
    writes.push({ kind: "waiver", payload: request.postDataJSON() });
    auditEvents.push({ event_id: "audit_upl_c05_waiver", action: "waiver.approved", object_type: "Waiver", object_id: "waiver_upl_c05_ui", metadata: { consent_document_id: "consent_doc_upl_c05_ui" } });
    await fulfillJson(route, waiverBody(), 201);
  });
  await page.route("**/api/intake/conflict-decisions", async (route, request) => {
    writes.push({ kind: "decision", payload: request.postDataJSON() });
    auditEvents.push({ event_id: "audit_upl_c05_decision", action: "conflict.decision.record", object_type: "ConflictDecision", object_id: "decision_upl_c05_ui", metadata: { reviewer_id: ACTOR } });
    await fulfillJson(route, decisionBody(), 201);
  });
  await page.route("**/api/intake/conflict-checks", async (route, request) => {
    writes.push({ kind: "conflict_check", payload: request.postDataJSON() });
    auditEvents.push({ event_id: "audit_upl_c05_hit", action: "conflict.hit.create", object_type: "ConflictHit", object_id: HIT_ID, metadata: { hit_source: "former_matter" } });
    await fulfillJson(route, conflictCheckBody(), 201);
  });
  await page.route("**/api/intake/audit**", (route) => fulfillJson(route, collectionBody("upl-c05-audit-list", auditEvents)));
  await page.route("**/api/intake/requests**", (route) => fulfillJson(route, collectionBody("upl-c05-intake-list", [intakeRequest])));

  await page.goto(proofUrl("client-conflict"), { waitUntil: "domcontentloaded" });
  await page.locator("[data-client-conflict-connected='true']").waitFor({ state: "visible", timeout: 15000 });
  const actionPanel = page.locator("[data-intake-matter-opening-flow='true']");
  await actionPanel.getByRole("button", { name: "이해상충 검토" }).click();
  await page.locator("[data-intake-conflict-hit-list='true']").getByText("신규 고객 주식회사", { exact: true }).waitFor({ state: "visible", timeout: 15000 });
  await actionPanel.getByRole("button", { name: "검토 결정" }).click();
  await actionPanel.getByText("검토 결정이 기록되었습니다.").waitFor({ state: "visible", timeout: 15000 });
  await actionPanel.getByRole("button", { name: "Waiver 승인" }).click();
  await actionPanel.getByText("Waiver 승인 기록이 남았습니다.").waitFor({ state: "visible", timeout: 15000 });
  await actionPanel.getByRole("button", { name: "수임 승인" }).click();
  await actionPanel.getByText("수임 승인 완료.").waitFor({ state: "visible", timeout: 15000 });
  await actionPanel.getByRole("button", { name: "통과 처리" }).click();
  await actionPanel.getByText("통과 처리되었습니다.").waitFor({ state: "visible", timeout: 15000 });

  const panelText = await actionPanel.innerText();
  const screenshot = join(ROOT, SCREENSHOT_DIR, "upl-c05-engagement-documents.png");
  await page.screenshot({ path: screenshot, fullPage: true });
  await browser.close();

  const engagementWrite = writes.find((write) => write.kind === "engagement");
  const clearanceWrite = writes.find((write) => write.kind === "clearance");
  const engagement = engagementWrite?.payload?.engagement ?? {};
  const upload = engagement.signed_document_upload ?? {};
  const template = engagement.template_document ?? {};
  const checks = [
    {
      id: "ui-drives-engagement-and-clearance-routes",
      passed: ["conflict_check", "decision", "waiver", "engagement", "clearance"].every((kind) => writes.some((write) => write.kind === kind)),
    },
    {
      id: "engagement-payload-includes-template-document",
      passed:
        typeof template.template_document_id === "string" &&
        template.template_document_id.startsWith("template_doc:") &&
        template.template_id === "matter_engagement_letter" &&
        template.document_title === "위임계약서" &&
        template.generation_state === "generated",
    },
    {
      id: "engagement-payload-includes-lx06-signed-upload",
      passed:
        typeof upload.signed_document_upload_id === "string" &&
        upload.signed_document_upload_id.startsWith("signed_upload:") &&
        upload.document_id === engagement.signed_document_id &&
        upload.signed_document_id === engagement.signed_document_id &&
        upload.template_document_id === template.template_document_id &&
        upload.signature_ref === engagement.signature_ref &&
        typeof upload.content_sha256 === "string" &&
        upload.content_sha256.startsWith("sha256:") &&
        upload.byte_size > 0 &&
        upload.mime_type === "application/pdf" &&
        upload.lx_registry_ref === "LX-06" &&
        upload.bytes_included === false &&
        upload.storage_pointer_ref_included === false,
    },
    {
      id: "clearance-uses-approved-engagement-record",
      passed: clearanceWrite?.payload?.token?.engagement_id === engagement.engagement_id && clearanceWrite?.payload?.token?.snapshot_hash === SNAPSHOT_HASH,
    },
    {
      id: "engagement-document-success-rendered",
      passed: panelText.includes("수임 승인 완료.") && panelText.includes("통과 처리되었습니다."),
    },
    {
      id: "browser-proof-clean",
      passed: consoleEvents.length === 0 && failedRequests.length === 0,
    },
  ];
  const report = {
    schema_version: "law-firm-os.upl-c05.browser-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    contract_ref: "UPL-C-05",
    url: proofUrl("client-conflict"),
    screenshot,
    checks,
    observed: { writes, panel_text: panelText, audit_events: auditEvents, console_events: consoleEvents, failed_requests: failedRequests },
  };
  writeFileSync(join(ROOT, JSON_PATH), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(
    join(ROOT, MD_PATH),
    [
      "# UPL-C-05 Engagement Documents Browser Proof",
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
