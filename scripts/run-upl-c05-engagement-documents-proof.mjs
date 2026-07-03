#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PERMISSION_CONTEXT_HEADER } from "../apps/api/src/permission-gate.js";
import { startApiServer } from "../apps/api/src/server.js";
import { createIntakeRuntimeRepository } from "../packages/intake/src/runtime-repository.js";
import { createMasterDataRepository } from "../packages/master-data/src/index.js";
import { createMatterRepository } from "../packages/matter/src/index.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const JSON_PATH = join(ARTIFACT_DIR, "upl-c05-engagement-documents-proof.json");
const MD_PATH = join(ARTIFACT_DIR, "upl-c05-engagement-documents-proof.md");
const TENANT = "tenant_upl_c05_engagement_docs";
const ACTOR = "user_upl_c05_reviewer";
const INTAKE_ID = "intake_upl_c05_new_client";
const CONFLICT_ID = "conflict_upl_c05_review";
const ENGAGEMENT_ID = "engagement_upl_c05_signed";
const SIGNED_DOCUMENT_ID = "signed_doc_upl_c05_engagement";
const TEMPLATE_DOCUMENT_ID = "template_doc_upl_c05_engagement";
const SIGNED_UPLOAD_ID = "signed_upload_upl_c05_engagement";

mkdirSync(ARTIFACT_DIR, { recursive: true });

function permissionContext(effect = "allow") {
  return JSON.stringify({
    principal: { user_id: ACTOR, tenant_id: TENANT, role_ids: ["crm_intake_user", "conflict_reviewer", "matter_runtime_user"] },
    rules: [{ id: `rule_upl_c05_${effect}`, effect, action: "*" }],
    object_acl: [],
  });
}

async function apiJson(baseUrl, path, options = {}) {
  const headers = {
    [PERMISSION_CONTEXT_HEADER]: permissionContext(),
    ...(options.headers ?? {}),
  };
  if (options.body && !headers["content-type"]) headers["content-type"] = "application/json";
  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  const body = await response.json();
  return { status: response.status, body };
}

function intakeWrite(payload, idempotencyKey) {
  return {
    tenant_id: TENANT,
    permission_ref: "upl_c05_engagement_write",
    audit_hint_ref: "upl_c05_api_proof",
    actor_id: ACTOR,
    idempotency_key: idempotencyKey,
    ...payload,
  };
}

function blocked(response) {
  return response.status >= 400 && response.status < 500 && response.body.ui_state === "blocked";
}

function engagementPayload(overrides = {}) {
  return {
    engagement_id: ENGAGEMENT_ID,
    tenant_id: TENANT,
    intake_request_id: INTAKE_ID,
    template_id: "matter_engagement_letter",
    signed_document_id: SIGNED_DOCUMENT_ID,
    signature_ref: `signature:${SIGNED_DOCUMENT_ID}`,
    template_document: {
      template_document_id: TEMPLATE_DOCUMENT_ID,
      template_id: "matter_engagement_letter",
      document_title: "위임계약서",
      generation_state: "generated",
      merge_field_count: 3,
    },
    signed_document_upload: {
      signed_document_upload_id: SIGNED_UPLOAD_ID,
      document_id: SIGNED_DOCUMENT_ID,
      signed_document_id: SIGNED_DOCUMENT_ID,
      template_document_id: TEMPLATE_DOCUMENT_ID,
      signature_ref: `signature:${SIGNED_DOCUMENT_ID}`,
      content_sha256: `sha256:${SIGNED_DOCUMENT_ID}`,
      byte_size: 2048,
      mime_type: "application/pdf",
      upload_state: "uploaded",
      lx_registry_ref: "LX-06",
      bytes_included: false,
      storage_pointer_ref_included: false,
    },
    approver_id: ACTOR,
    ...overrides,
  };
}

const intakeRepository = createIntakeRuntimeRepository({
  seedRecords: [
    {
      model_type: "IntakeRequest",
      intake_request_id: INTAKE_ID,
      tenant_id: TENANT,
      opportunity_id: "opp_upl_c05_new_client",
      requesting_party_id: "party_upl_c05_new_client",
      party_ids: ["party_upl_c05_new_client"],
      requested_scope_summary: "위임계약 문서 생성과 서명본 업로드 검증",
      status: "open",
      owner_user_id: ACTOR,
    },
  ],
});

const crmMasterDataRepository = createMasterDataRepository({
  seedRecords: [
    {
      model_type: "Party",
      party_id: "party_upl_c05_new_client",
      tenant_id: TENANT,
      party_type: "organization",
      display_name: "신규 고객 주식회사",
      status: "active",
      owner_user_id: ACTOR,
    },
  ],
});

const matterRepository = createMatterRepository({
  seedRecords: [
    {
      model_type: "MatterParty",
      resource_id: "matter_party_upl_c05_adverse",
      matter_party_id: "matter_party_upl_c05_adverse",
      tenant_id: TENANT,
      matter_id: "matter_upl_c05_former",
      party_id: "party_upl_c05_adverse",
      display_name: "신규 고객 주식회사",
      party_role: "adverse_party",
      role_scope: "matter_conflict_subject",
      conflict_subject: true,
      retroactive_entry: true,
      status: "active",
      raw_contact_values_included: false,
      production_ready_claim: false,
    },
  ],
});

const started = await startApiServer({ port: 0, intakeRepository, crmMasterDataRepository, matterRepository });
let report;
try {
  const baseUrl = `http://${started.host}:${started.port}`;
  const check = await apiJson(baseUrl, "/api/intake/conflict-checks", {
    method: "POST",
    body: JSON.stringify(intakeWrite({
      conflict_check: {
        conflict_check_id: CONFLICT_ID,
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        party_snapshot: { party_ids: ["party_upl_c05_new_client"], aliases: ["신규 고객 주식회사"] },
        snapshot_hash: "snapshot_upl_c05_review",
        status: "snapshot_recorded",
        owner_user_id: ACTOR,
      },
    }, "upl-c05-conflict-check")),
  });
  const hitId = check.body.conflict_hits?.[0]?.conflict_hit_id;
  const decision = await apiJson(baseUrl, "/api/intake/conflict-decisions", {
    method: "POST",
    body: JSON.stringify(intakeWrite({
      conflict_decision: {
        conflict_decision_id: "decision_upl_c05_clear",
        tenant_id: TENANT,
        conflict_check_id: CONFLICT_ID,
        conflict_hit_ids: [hitId],
        reviewer_id: ACTOR,
        decision: "clear",
        rationale: "engagement_documents_required_before_clearance",
      },
    }, "upl-c05-conflict-decision")),
  });
  const waiver = await apiJson(baseUrl, "/api/intake/waivers", {
    method: "POST",
    body: JSON.stringify(intakeWrite({
      waiver: {
        waiver_id: "waiver_upl_c05_consent",
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        conflict_check_id: CONFLICT_ID,
        conflict_hit_ids: [hitId],
        consent_document_id: "consent_doc_upl_c05_signed",
        approver_id: ACTOR,
        approval_reason: "reviewer_confirmed_consent_document",
      },
    }, "upl-c05-waiver")),
  });

  const unsignedEngagement = await apiJson(baseUrl, "/api/intake/engagements", {
    method: "POST",
    body: JSON.stringify(intakeWrite({
      engagement: {
        engagement_id: "engagement_upl_c05_unsigned",
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        template_id: "matter_engagement_letter",
        signature_ref: "signature:missing-document",
        approver_id: ACTOR,
      },
    }, "upl-c05-engagement-unsigned")),
  });
  const noUploadEngagement = await apiJson(baseUrl, "/api/intake/engagements", {
    method: "POST",
    body: JSON.stringify(intakeWrite({
      engagement: engagementPayload({
        engagement_id: "engagement_upl_c05_no_upload",
        signed_document_upload: undefined,
      }),
    }, "upl-c05-engagement-no-upload")),
  });
  const noEngagementToken = await apiJson(baseUrl, "/api/intake/clearance-tokens", {
    method: "POST",
    body: JSON.stringify(intakeWrite({
      now: "2026-07-03T00:00:00.000Z",
      token: {
        clearance_token_id: "clearance_upl_c05_no_engagement",
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        conflict_check_id: CONFLICT_ID,
        engagement_id: ENGAGEMENT_ID,
        snapshot_hash: check.body.item?.snapshot_hash,
        expires_at: "2026-07-10T00:00:00.000Z",
      },
    }, "upl-c05-clearance-no-engagement")),
  });

  const engagement = await apiJson(baseUrl, "/api/intake/engagements", {
    method: "POST",
    body: JSON.stringify(intakeWrite({ engagement: engagementPayload() }, "upl-c05-engagement-valid")),
  });
  const token = await apiJson(baseUrl, "/api/intake/clearance-tokens", {
    method: "POST",
    body: JSON.stringify(intakeWrite({
      now: "2026-07-03T00:00:00.000Z",
      token: {
        clearance_token_id: "clearance_upl_c05_valid",
        tenant_id: TENANT,
        intake_request_id: INTAKE_ID,
        conflict_check_id: CONFLICT_ID,
        engagement_id: ENGAGEMENT_ID,
        snapshot_hash: check.body.item?.snapshot_hash,
        expires_at: "2026-07-10T00:00:00.000Z",
      },
    }, "upl-c05-clearance-valid")),
  });

  const storedTemplate = intakeRepository.get({ tenant_id: TENANT, model_type: "EngagementTemplateDocument", template_document_id: TEMPLATE_DOCUMENT_ID });
  const storedUpload = intakeRepository.get({ tenant_id: TENANT, model_type: "EngagementSignedDocumentUpload", signed_document_upload_id: SIGNED_UPLOAD_ID });
  const auditActions = new Set(intakeRepository.listAudit({ tenant_id: TENANT }).map((event) => event.action));
  const checks = [
    { id: "unsigned-engagement-is-blocked", passed: blocked(unsignedEngagement) },
    { id: "signed-document-without-upload-is-blocked", passed: blocked(noUploadEngagement) },
    { id: "clearance-without-engagement-is-blocked", passed: blocked(noEngagementToken) },
    {
      id: "engagement-approval-creates-template-document-and-signed-upload",
      passed:
        engagement.status === 201 &&
        engagement.body.engagement_ready === true &&
        engagement.body.template_document_id === TEMPLATE_DOCUMENT_ID &&
        engagement.body.signed_document_upload_id === SIGNED_UPLOAD_ID &&
        storedTemplate?.generation_state === "generated" &&
        storedUpload?.lx_registry_ref === "LX-06" &&
        storedUpload?.content_sha256 === `sha256:${SIGNED_DOCUMENT_ID}`,
    },
    {
      id: "clearance-reconciles-engagement-document-ledger",
      passed:
        token.status === 201 &&
        token.body.validation?.valid === true &&
        token.body.engagement_review?.engagement_satisfied === true &&
        token.body.item?.engagement_template_document_id === TEMPLATE_DOCUMENT_ID &&
        token.body.item?.engagement_signed_document_upload_id === SIGNED_UPLOAD_ID &&
        token.body.item?.engagement_signed_upload_verified === true,
    },
    {
      id: "engagement-document-audit-history-present",
      passed:
        check.status === 201 &&
        decision.status === 201 &&
        waiver.status === 201 &&
        ["engagement.template.generated", "engagement.signed_document.uploaded", "engagement.approved", "clearance.token.issue"].every((action) => auditActions.has(action)),
    },
  ];

  report = {
    schema_version: "law-firm-os.upl-c05.engagement-documents-proof.v0.1",
    generated_at: new Date().toISOString(),
    verdict: checks.every((item) => item.passed) ? "PASS" : "FAIL",
    api_url: baseUrl,
    contract_ref: "UPL-C-05",
    exercised_routes: ["POST /api/intake/engagements", "POST /api/intake/clearance-tokens"],
    checks,
    observed: {
      unsigned_engagement: { status: unsignedEngagement.status, ui_state: unsignedEngagement.body.ui_state, safe_error_codes: unsignedEngagement.body.safe_error_codes },
      no_upload_engagement: { status: noUploadEngagement.status, ui_state: noUploadEngagement.body.ui_state, safe_error_codes: noUploadEngagement.body.safe_error_codes },
      no_engagement_clearance: { status: noEngagementToken.status, ui_state: noEngagementToken.body.ui_state, safe_error_codes: noEngagementToken.body.safe_error_codes },
      engagement: {
        status: engagement.status,
        engagement_ready: engagement.body.engagement_ready,
        template_document_id: engagement.body.template_document_id,
        signed_document_upload_id: engagement.body.signed_document_upload_id,
        signed_upload_verified: engagement.body.signed_upload_verified,
      },
      clearance: { status: token.status, item: token.body.item, engagement_review: token.body.engagement_review },
      stored_template: storedTemplate,
      stored_upload: storedUpload,
      audit_actions: [...auditActions].sort(),
    },
  };
} finally {
  await new Promise((resolve) => started.server.close(resolve));
}

writeFileSync(JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(
  MD_PATH,
  [
    "# UPL-C-05 Engagement Documents Proof",
    "",
    `- verdict: ${report.verdict}`,
    `- api: ${report.api_url}`,
    `- contract: ${report.contract_ref}`,
    "",
    "## Checks",
    ...report.checks.map((check) => `- ${check.passed ? "PASS" : "FAIL"} ${check.id}`),
    "",
    "## Blocked paths",
    `- unsigned_engagement: ${report.observed.unsigned_engagement.status} ${report.observed.unsigned_engagement.ui_state}`,
    `- no_upload_engagement: ${report.observed.no_upload_engagement.status} ${report.observed.no_upload_engagement.ui_state}`,
    `- no_engagement_clearance: ${report.observed.no_engagement_clearance.status} ${report.observed.no_engagement_clearance.ui_state}`,
    "",
  ].join("\n"),
);

console.log(JSON.stringify({ verdict: report.verdict, proof: JSON_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
