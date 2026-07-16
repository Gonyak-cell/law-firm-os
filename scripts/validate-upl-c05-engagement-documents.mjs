#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { assertNodeProofPass } from "./lib/upl-proof-runner.mjs";

const ROOT = process.cwd();

function read(path) {
  return readFileSync(join(ROOT, path), "utf8");
}

function readJson(path) {
  return JSON.parse(read(path));
}

function assertExists(path) {
  assert.ok(existsSync(join(ROOT, path)), `${path} must exist`);
}

function assertPatterns(path, patterns) {
  const source = read(path);
  for (const pattern of patterns) assert.match(source, pattern, `${path} must match ${pattern}`);
}

assertPatterns("packages/intake/src/runtime-repository.js", [/EngagementTemplateDocument/, /EngagementSignedDocumentUpload/]);
assertPatterns("packages/intake/src/engagement-service.js", [
  /templateDocumentFor/,
  /signedUploadFor/,
  /content_sha256/,
  /byte_size/,
  /lx_registry_ref.*LX-06/s,
  /engagement\.template\.generated/,
  /engagement\.signed_document\.uploaded/,
  /signed_upload_verified: true/,
]);
assertPatterns("packages/intake/src/clearance-token-service.js", [
  /EngagementTemplateDocument/,
  /EngagementSignedDocumentUpload/,
  /missing_template_document/,
  /missing_signed_document_upload/,
  /engagement_signed_document_upload_id/,
  /engagement_signed_upload_verified/,
]);
assertPatterns("apps/api/src/crm-intake-runtime-context.js", [
  /template_document: input\.template_document/,
  /signed_document_upload: input\.signed_document_upload/,
  /signed_document_upload_id/,
  /signed_upload_verified/,
]);
assertPatterns("apps/web/src/data/apiClient.js", [
  /ENGAGEMENT_SIGNED_PDF_SHA256/,
  /ENGAGEMENT_SIGNED_PDF_BYTES_BASE64/,
  /ENGAGEMENT_SIGNED_PDF_BYTE_SIZE/,
  /template_document:/,
  /signed_document_upload:/,
  /content_sha256: ENGAGEMENT_SIGNED_PDF_SHA256/,
  /bytes_base64: ENGAGEMENT_SIGNED_PDF_BYTES_BASE64/,
  /lx_registry_ref: "LX-06"/,
  /bytes_included: false/,
]);
assertPatterns("apps/api/test/cmp-r4-g6-crm-intake.test.js", [/api-engagement-no-upload/, /signed_upload_cmp_g6_api_001/]);
assertPatterns("packages/intake/test/runtime-services.test.js", [/signed-upload-engagement-001/, /engagement_signed_document_upload_id/]);

assertExists("scripts/run-upl-c05-engagement-documents-proof.mjs");
assertExists("scripts/run-upl-c05-engagement-documents-browser-proof.mjs");

await assertNodeProofPass("scripts/run-upl-c05-engagement-documents-proof.mjs");

const apiProof = readJson("artifacts/manual-qa/upl-c05-engagement-documents-proof.json");
assert.equal(apiProof.verdict, "PASS");
assert.equal(apiProof.contract_ref, "UPL-C-05");
assert.equal(apiProof.observed.unsigned_engagement.status, 400);
assert.equal(apiProof.observed.unsigned_engagement.ui_state, "blocked");
assert.equal(apiProof.observed.no_upload_engagement.status, 400);
assert.equal(apiProof.observed.no_upload_engagement.ui_state, "blocked");
assert.equal(apiProof.observed.no_engagement_clearance.status, 400);
assert.equal(apiProof.observed.no_engagement_clearance.ui_state, "blocked");
assert.equal(apiProof.observed.engagement.engagement_ready, true);
assert.equal(apiProof.observed.engagement.template_document_id, "template_doc_upl_c05_engagement");
assert.equal(apiProof.observed.engagement.signed_document_upload_id, "signed_upload_upl_c05_engagement");
assert.equal(apiProof.observed.stored_upload.server_hash_recomputed, true);
assert.equal(apiProof.observed.clearance.engagement_review.lx06_upload_verified, true);
assert.equal(apiProof.observed.clearance.item.engagement_signed_document_upload_id, "signed_upload_upl_c05_engagement");
assert.equal(apiProof.observed.clearance.item.engagement_signed_upload_verified, true);
assert.ok(apiProof.observed.audit_actions.includes("engagement.template.generated"));
assert.ok(apiProof.observed.audit_actions.includes("engagement.signed_document.uploaded"));
assertExists("artifacts/manual-qa/upl-c05-engagement-documents-proof.md");

const browserProof = readJson("docs/lazycodex/evidence/matter-web/artifacts/upl-c05-engagement-documents-browser-proof.json");
assert.equal(browserProof.verdict, "PASS");
assert.equal(browserProof.contract_ref, "UPL-C-05");
const engagementWrite = browserProof.observed.writes.find((write) => write.kind === "engagement");
assert.ok(engagementWrite, "browser proof must capture engagement write");
assert.equal(engagementWrite.payload.engagement.template_document.template_id, "matter_engagement_letter");
assert.equal(engagementWrite.payload.engagement.signed_document_upload.document_id, engagementWrite.payload.engagement.signed_document_id);
assert.equal(engagementWrite.payload.engagement.signed_document_upload.lx_registry_ref, "LX-06");
assert.equal(engagementWrite.payload.engagement.signed_document_upload.bytes_included, false);
assert.equal(engagementWrite.payload.engagement.signed_document_upload.bytes_base64, "[redacted]");
assert.equal(browserProof.observed.stored_upload.server_hash_recomputed, true);
assert.equal(browserProof.observed.dms_readback.latest_sha256, engagementWrite.payload.engagement.signed_document_upload.content_sha256);
assert.equal(browserProof.observed.dms_readback.downloaded_sha256, engagementWrite.payload.engagement.signed_document_upload.content_sha256);
assert.equal(browserProof.observed.dms_readback.bytes_written_to_artifact, false);
assert.match(browserProof.observed.panel_text, /수임 승인 완료/);
assert.match(browserProof.observed.panel_text, /통과 처리되었습니다/);
assertExists("docs/lazycodex/evidence/matter-web/artifacts/upl-c05-engagement-documents-browser-proof.md");
assertExists("docs/lazycodex/evidence/matter-web/artifacts/upl-c05-screenshots/upl-c05-engagement-documents.png");

console.log(JSON.stringify({ ok: true, validator: "UPL-C-05", proofs: [apiProof.contract_ref, browserProof.contract_ref] }, null, 2));
