#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { startApiServer } from "../apps/api/src/server.js";
import { apiSessionHeaders } from "../apps/api/test/helpers/session.js";
import { createVaultDmsRuntimeContext } from "../apps/api/src/vault-dms-runtime-context.js";
import { createDmsRepository } from "../packages/dms/src/repository.js";
import { createLocalStorageAdapter } from "../packages/dms/src/storage/local-storage-adapter.js";
import { sha256Hex } from "../packages/dms/src/storage/storage-adapter.js";
import { createIntakeRuntimeRepository } from "../packages/intake/src/runtime-repository.js";
import { createMasterDataRepository } from "../packages/master-data/src/index.js";
import { createMatterRepository } from "../packages/matter/src/index.js";

const ROOT = process.cwd();
const ARTIFACT_DIR = join(ROOT, "artifacts", "manual-qa");
const JSON_PATH = join(ARTIFACT_DIR, "upl-c05-engagement-documents-proof.json");
const MD_PATH = join(ARTIFACT_DIR, "upl-c05-engagement-documents-proof.md");
const TENANT = "tenant_cmp_g6_synthetic";
const ACTOR = "user_upl_c05_reviewer";
const INTAKE_ID = "intake_upl_c05_new_client";
const CONFLICT_ID = "conflict_upl_c05_review";
const ENGAGEMENT_ID = "engagement_upl_c05_signed";
const SIGNED_DOCUMENT_ID = "signed_doc_upl_c05_engagement";
const TEMPLATE_DOCUMENT_ID = "template_doc_upl_c05_engagement";
const SIGNED_UPLOAD_ID = "signed_upload_upl_c05_engagement";
const SIGNED_PDF_BYTES = Buffer.from("%PDF-1.4\nUPL-C05 signed engagement\n%%EOF\n");
const SIGNED_PDF_SHA256 = sha256Hex(SIGNED_PDF_BYTES);

mkdirSync(ARTIFACT_DIR, { recursive: true });

async function apiJson(baseUrl, path, options = {}) {
  const sessionHeaders = await apiSessionHeaders(baseUrl);
  const headers = {
    ...sessionHeaders,
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
      content_sha256: SIGNED_PDF_SHA256,
      bytes_base64: SIGNED_PDF_BYTES.toString("base64"),
      byte_size: SIGNED_PDF_BYTES.byteLength,
      mime_type: "application/pdf",
      matter_id: "matter_upl_c05_engagement",
      workspace_id: "workspace_upl_c05_engagement",
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

const dmsRepository = createDmsRepository();
const dmsStorage = createLocalStorageAdapter({ adapter_id: "upl-c05-engagement-vault" });
const dmsRuntime = createVaultDmsRuntimeContext({ repository: dmsRepository, storage: dmsStorage });

const started = await startApiServer({ port: 0, intakeRepository, crmMasterDataRepository, matterRepository, dmsRuntime });
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
  const forgedHashEngagement = await apiJson(baseUrl, "/api/intake/engagements", {
    method: "POST",
    body: JSON.stringify(intakeWrite({
      engagement: engagementPayload({
        engagement_id: "engagement_upl_c05_forged_hash",
        signed_document_id: "signed_doc_upl_c05_forged_hash",
        signature_ref: "signature:signed_doc_upl_c05_forged_hash",
        signed_document_upload: {
          signed_document_upload_id: "signed_upload_upl_c05_forged_hash",
          document_id: "signed_doc_upl_c05_forged_hash",
          signed_document_id: "signed_doc_upl_c05_forged_hash",
          signature_ref: "signature:signed_doc_upl_c05_forged_hash",
          content_sha256: "sha256:caller-forged-hash",
          bytes_base64: SIGNED_PDF_BYTES.toString("base64"),
          byte_size: 1,
          mime_type: "application/pdf",
          matter_id: "matter_upl_c05_engagement",
          workspace_id: "workspace_upl_c05_engagement",
        },
      }),
    }, "upl-c05-engagement-forged-hash")),
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
  const storedDmsDocument = dmsRepository.get({ tenant_id: TENANT, model_type: "DmsDocument", document_id: SIGNED_DOCUMENT_ID });
  const storedDmsFileObject = storedUpload?.dms_file_object_id
    ? dmsRepository.get({ tenant_id: TENANT, model_type: "DmsFileObject", file_object_id: storedUpload.dms_file_object_id })
    : null;
  const storedObject = storedDmsFileObject?.vault_object_id
    ? dmsStorage.getObject({ object_id: storedDmsFileObject.vault_object_id })
    : null;
  const auditActions = new Set(intakeRepository.listAudit({ tenant_id: TENANT }).map((event) => event.action));
  const checks = [
    { id: "unsigned-engagement-is-blocked", passed: blocked(unsignedEngagement) },
    { id: "signed-document-without-upload-is-blocked", passed: blocked(noUploadEngagement) },
    { id: "forged-caller-hash-is-blocked-before-approval", passed: blocked(forgedHashEngagement) },
    { id: "clearance-without-engagement-is-blocked", passed: blocked(noEngagementToken) },
    {
      id: "engagement-approval-stores-signed-bytes-through-dms",
      passed:
        engagement.status === 201 &&
        engagement.body.engagement_ready === true &&
        engagement.body.template_document_id === TEMPLATE_DOCUMENT_ID &&
        engagement.body.signed_document_upload_id === SIGNED_UPLOAD_ID &&
        storedTemplate?.generation_state === "generated" &&
        storedUpload?.lx_registry_ref === "LX-06" &&
        storedUpload?.content_sha256 === SIGNED_PDF_SHA256 &&
        storedUpload?.byte_size === SIGNED_PDF_BYTES.byteLength &&
        storedUpload?.server_hash_recomputed === true &&
        storedUpload?.bytes_included === false &&
        storedUpload?.storage_pointer_ref_included === false &&
        storedDmsDocument?.latest_sha256 === SIGNED_PDF_SHA256 &&
        storedDmsFileObject?.sha256 === SIGNED_PDF_SHA256 &&
        storedObject?.sha256 === SIGNED_PDF_SHA256,
    },
    {
      id: "downloaded-dms-object-hash-matches-signed-pdf",
      passed:
        Buffer.isBuffer(storedObject?.bytes) &&
        storedObject.bytes.equals(SIGNED_PDF_BYTES) &&
        sha256Hex(storedObject.bytes) === SIGNED_PDF_SHA256,
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
      forged_hash_engagement: { status: forgedHashEngagement.status, ui_state: forgedHashEngagement.body.ui_state, safe_error_codes: forgedHashEngagement.body.safe_error_codes },
      no_engagement_clearance: { status: noEngagementToken.status, ui_state: noEngagementToken.body.ui_state, safe_error_codes: noEngagementToken.body.safe_error_codes },
      engagement: {
        status: engagement.status,
        engagement_ready: engagement.body.engagement_ready,
        template_document_id: engagement.body.template_document_id,
        signed_document_upload_id: engagement.body.signed_document_upload_id,
        signed_upload_verified: engagement.body.signed_upload_verified,
      },
      clearance: { status: token.status, item: token.body.item, engagement_review: token.body.engagement_review },
      stored_template: {
        template_document_id: storedTemplate?.template_document_id,
        generation_state: storedTemplate?.generation_state,
        document_payload_included: storedTemplate?.document_payload_included,
      },
      stored_upload: {
        signed_document_upload_id: storedUpload?.signed_document_upload_id,
        signed_document_id: storedUpload?.signed_document_id,
        content_sha256: storedUpload?.content_sha256,
        byte_size: storedUpload?.byte_size,
        dms_document_id: storedUpload?.dms_document_id,
        dms_version_id: storedUpload?.dms_version_id,
        dms_file_object_id: storedUpload?.dms_file_object_id,
        server_hash_recomputed: storedUpload?.server_hash_recomputed,
        bytes_included: storedUpload?.bytes_included,
        storage_pointer_ref_included: storedUpload?.storage_pointer_ref_included,
      },
      dms_readback: {
        document_id: storedDmsDocument?.document_id,
        latest_sha256: storedDmsDocument?.latest_sha256,
        file_object_id: storedDmsFileObject?.file_object_id,
        file_object_sha256: storedDmsFileObject?.sha256,
        downloaded_sha256: storedObject?.sha256,
        downloaded_byte_size: storedObject?.bytes?.byteLength ?? null,
        raw_path_exposed: false,
        storage_pointer_ref_included: false,
        bytes_written_to_artifact: false,
      },
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
    `- forged_hash_engagement: ${report.observed.forged_hash_engagement.status} ${report.observed.forged_hash_engagement.ui_state}`,
    `- no_engagement_clearance: ${report.observed.no_engagement_clearance.status} ${report.observed.no_engagement_clearance.ui_state}`,
    "",
    "## DMS readback",
    `- server sha256: ${report.observed.stored_upload.content_sha256}`,
    `- downloaded sha256: ${report.observed.dms_readback.downloaded_sha256}`,
    `- downloaded byte size: ${report.observed.dms_readback.downloaded_byte_size}`,
    `- bytes written to artifact: ${report.observed.dms_readback.bytes_written_to_artifact}`,
    "",
  ].join("\n"),
);

console.log(JSON.stringify({ verdict: report.verdict, proof: JSON_PATH }, null, 2));
if (report.verdict !== "PASS") process.exit(1);
