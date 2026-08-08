import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  applyLegalHold,
  applyPrivilegeLabel,
  assertCanDeleteHeldObject,
  assertRetentionAllowsDelete,
  assertStorageAdapter,
  checkoutDocument,
  checkinDocument,
  createDmsRepository,
  createFileStorageAdapter,
  createLocalStorageAdapter,
  createRagEvidenceLedger,
  createRedactionMetadata,
  createRetentionPolicy,
  createS3StorageAdapterPlaceholder,
  createSearchIndexEnvelope,
  DMS_SEARCH_INDEX_LIMITS,
  createSecureLink,
  createSharePointStorageAdapterPlaceholder,
  createVaultObjectId,
  downloadFileObjectWithAudit,
  exportRedactedDocument,
  filterPrivilegedForSearch,
  filterSearchResultsByAcl,
  serializeFileObjectSafe,
  searchMatterVault,
  uploadDocument,
  validateSecureLinkAccess,
  verifyHashLineage,
} from "../src/index.js";
import { fileEmailThreadToMatter } from "../../email-dms/src/email-filing-service.js";
import { createM365ConnectorPlaceholder as createM365 } from "../../email-dms/src/m365-placeholder.js";
import { fileHrDocumentToVault } from "../../hrx/src/hr-document-vault-service.js";

const TENANT = "tenant-rp07";
const MATTER = "matter-rp07";

function documentFixture(overrides = {}) {
  return {
    document_id: "doc-rp07-001",
    tenant_id: TENANT,
    matter_id: MATTER,
    workspace_id: "workspace-rp07",
    title: "Vault document",
    status: "active",
    current_version_id: "version-doc-rp07-001-1",
    permission_envelope_id: "perm-dms",
    audit_trace_id: "audit-dms",
    mime_type: "text/plain",
    ...overrides,
  };
}

test("G5 DMS repository persists metadata, idempotency, and audit across reopen", () => {
  const storePath = join(mkdtempSync(join(tmpdir(), "dms-runtime-")), "store.json");
  const repository = createDmsRepository({ filePath: storePath });
  repository.create({
    model_type: "DmsWorkspace",
    workspace_id: "workspace-rp07",
    tenant_id: TENANT,
    matter_id: MATTER,
    name: "Matter vault",
    status: "active",
    permission_envelope_id: "perm-dms",
    audit_trace_id: "audit-dms",
  });
  repository.recordIdempotency({ tenant_id: TENANT, idempotency_key: "idem-1", response: { ok: true } });
  repository.appendAudit({
    tenant_id: TENANT,
    event_id: "audit-1",
    actor_id: "user-dms",
    action: "dms.test",
    object_type: "DmsWorkspace",
    object_id: "workspace-rp07",
    decision: "allow",
  });
  repository.close();

  const reopened = createDmsRepository({ filePath: storePath });
  assert.equal(reopened.get({ tenant_id: TENANT, model_type: "DmsWorkspace", workspace_id: "workspace-rp07" }).name, "Matter vault");
  assert.equal(reopened.getIdempotency({ tenant_id: TENANT, idempotency_key: "idem-1" }).response.ok, true);
  assert.equal(reopened.listAudit({ tenant_id: TENANT }).length, 1);
});

test("G5 storage adapters hash content and reject credential material", () => {
  const storage = createLocalStorageAdapter({ adapter_id: "local-test" });
  assertStorageAdapter(storage);
  const receipt = storage.putObject({ tenant_id: TENANT, object_id: "object-1", bytes: "hello", content_type: "text/plain" });
  assert.equal(receipt.raw_path_exposed, false);
  assert.equal(storage.statObject({ tenant_id: TENANT, object_id: "object-1" }).sha256, receipt.sha256);
  const rootPath = join(mkdtempSync(join(tmpdir(), "dms-file-storage-")), "objects");
  const fileStorage = createFileStorageAdapter({ adapter_id: "file-test", rootPath });
  assertStorageAdapter(fileStorage);
  const fileReceipt = fileStorage.putObject({ tenant_id: TENANT, object_id: "object-file-1", bytes: "durable", content_type: "text/plain" });
  const reopened = createFileStorageAdapter({ adapter_id: "file-test", rootPath });
  assert.equal(reopened.getObject({ tenant_id: TENANT, object_id: "object-file-1" }).sha256, fileReceipt.sha256);
  assert.equal(reopened.getObject({ tenant_id: TENANT, object_id: "object-file-1" }).bytes.toString("utf8"), "durable");
  assert.throws(() => createS3StorageAdapterPlaceholder({ access_key: "secret" }), /credential_ref only/);
  assert.throws(() => createSharePointStorageAdapterPlaceholder({ access_token: "secret" }), /credential_ref only/);
  assert.equal(createM365({ credential_ref: "secretref:m365" }).credential_material_included, false);
  assert.equal(createM365({ credential_ref: "secretref:dms-m365" }).runtime_enabled, false);
});

test("G5 document upload writes metadata, rolls back on storage failure, and hides raw file pointers", () => {
  const repository = createDmsRepository();
  const storage = createLocalStorageAdapter();
  const uploaded = uploadDocument({
    repository,
    storage,
    document: documentFixture(),
    bytes: "hello vault",
    actor_id: "user-dms",
    idempotency_key: "upload-1",
  });
  assert.equal(uploaded.outcome, "created");
  assert.equal(uploaded.file_object.raw_path_exposed, false);
  assert.equal(serializeFileObjectSafe(uploaded.file_object).storage_pointer_ref_included, false);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 1);
  assert.equal(repository.listAudit({ tenant_id: TENANT }).some((event) => event.action === "dms.document.upload"), true);
  const downloaded = downloadFileObjectWithAudit({
    repository,
    storage,
    tenant_id: TENANT,
    file_object_id: uploaded.file_object.file_object_id,
    actor_id: "user-dms",
    permission_decision_id: "decision-download-1",
  });
  assert.equal(downloaded.sha256, uploaded.file_object.sha256);
  assert.equal(downloaded.bytes.toString("utf8"), "hello vault");
  assert.equal(downloaded.file_object.storage_pointer_ref_included, false);
  assert.equal(downloaded.audit_event.action, "dms.document.download");

  const replay = uploadDocument({
    repository,
    storage,
    document: documentFixture(),
    bytes: "hello vault",
    actor_id: "user-dms",
    idempotency_key: "upload-1",
  });
  assert.equal(replay.idempotent_replay, true);

  const failing = createDmsRepository();
  assert.throws(
    () =>
      uploadDocument({
        repository: failing,
        storage: { putObject: () => { throw new Error("storage failed"); }, getObject() {}, statObject() {} },
        document: documentFixture({ document_id: "doc-fail", current_version_id: "version-doc-fail-1" }),
        bytes: "fail",
        actor_id: "user-dms",
        idempotency_key: "upload-fail",
      }),
    /storage failed/,
  );
  assert.equal(failing.list({ tenant_id: TENANT, model_type: "DmsDocument" }).length, 0);
});

test("G5 document guards enforce lineage, locks, privilege, legal hold, retention, and secure links", () => {
  const repository = createDmsRepository();
  const storage = createLocalStorageAdapter();
  const uploaded = uploadDocument({
    repository,
    storage,
    document: documentFixture(),
    bytes: "privileged vault",
    actor_id: "user-dms",
    idempotency_key: "upload-guard",
  });
  assert.equal(verifyHashLineage({ bytes: "privileged vault", expected_sha256: uploaded.storage_receipt.sha256 }).outcome, "passed");
  assert.equal(verifyHashLineage({ bytes: "tampered", expected_sha256: uploaded.storage_receipt.sha256 }).safe_error_code, "DMS_HASH_MISMATCH");

  checkoutDocument({ repository, tenant_id: TENANT, document_id: uploaded.document.document_id, actor_id: "editor-a" });
  assert.throws(
    () => checkoutDocument({ repository, tenant_id: TENANT, document_id: uploaded.document.document_id, actor_id: "editor-b" }),
    /already checked out/,
  );
  checkinDocument({ repository, tenant_id: TENANT, document_id: uploaded.document.document_id, actor_id: "editor-a" });

  applyPrivilegeLabel({
    repository,
    document: uploaded.document,
    label: { label_id: "priv-doc-1", privilege_class: "attorney_client" },
    actor_id: "user-dms",
  });
  const docs = repository.list({ tenant_id: TENANT, model_type: "DmsDocument" });
  assert.equal(filterPrivilegedForSearch({ documents: docs }).length, 0);

  applyLegalHold({ repository, document: uploaded.document, hold_id: "hold-doc-1", actor_id: "user-dms", reason: "litigation" });
  assert.throws(() => assertCanDeleteHeldObject({ repository, tenant_id: TENANT, document_id: uploaded.document.document_id }), /held object/);
  const policy = createRetentionPolicy({
    tenant_id: TENANT,
    matter_id: MATTER,
    retention_policy_id: "retention-doc-1",
    document_id: uploaded.document.document_id,
    retain_until_epoch_ms: 2_000,
  });
  assert.throws(() => assertRetentionAllowsDelete({ policy, nowEpochMs: 1_000 }), /retention guard/);

  const redaction = createRedactionMetadata({ tenant_id: TENANT, matter_id: MATTER, redaction_id: "redact-1", document_id: uploaded.document.document_id });
  assert.equal(exportRedactedDocument({ document: uploaded.document, redactions: [redaction] }).raw_bytes_included, false);
  const link = createSecureLink({
    tenant_id: TENANT,
    matter_id: MATTER,
    secure_link_id: "link-1",
    document_id: uploaded.document.document_id,
    expires_at: "2026-06-21T00:00:00.000Z",
  });
  assert.equal(validateSecureLinkAccess({ link, now: "2026-06-20T00:00:00.000Z" }).safe_error_code, "DMS_SECURE_LINK_MFA_REQUIRED");
  assert.equal(validateSecureLinkAccess({ link, mfa_satisfied: true, now: "2026-06-20T00:00:00.000Z" }).watermark_required, true);
});

test("G5 search, RAG, email, and HR document vault flows are permission and source safe", async () => {
  const repository = createDmsRepository();
  const storage = createLocalStorageAdapter();
  const uploaded = uploadDocument({
    repository,
    storage,
    document: documentFixture(),
    bytes: "searchable",
    actor_id: "user-dms",
    idempotency_key: "upload-search",
  });
  const index = createSearchIndexEnvelope({ document: uploaded.document, version: uploaded.version, extracted_text_ref: "text-ref-1" });
  assert.equal(index.raw_text_included, false);
  const filtered = filterSearchResultsByAcl({
    results: [{ document_id: uploaded.document.document_id, title: uploaded.document.title }],
    principal: { user_id: "user-dms", role_ids: [] },
    object_acl: [{ principal_id: "user-dms", resource_id: uploaded.document.document_id, effect: "allow" }],
  });
  assert.equal(filtered.results.length, 1);
  assert.equal(filtered.omitted_result_count, null);
  const ledger = createRagEvidenceLedger({
    tenant_id: TENANT,
    matter_id: MATTER,
    ledger_id: "rag-ledger-1",
    sources: [{ document_id: uploaded.document.document_id, version_id: uploaded.version.version_id, citation_id: "cite-1" }],
  });
  assert.equal(ledger.citation_source_validation, true);

  const emailAudit = [];
  const filed = await fileEmailThreadToMatter({
    repository,
    thread: { tenant_id: TENANT, matter_id: MATTER, email_thread_id: "thread-1", subject: "Matter filing" },
    actor_id: "user-dms",
    audit: { append: (event) => emailAudit.push(event) },
  });
  assert.equal(filed.outcome, "created");
  assert.equal((await fileEmailThreadToMatter({ repository, thread: filed.thread })).outcome, "idempotent_replay");
  assert.equal(emailAudit[0].action, "dms.email.thread.file");

  assert.equal(createVaultObjectId({ tenant_id: TENANT, matter_id: MATTER, document_id: "doc", version_id: "v1" }).startsWith("vault:"), true);
  const hrAudit = [];
  const hrVault = fileHrDocumentToVault({
    document: {
      tenant_id: TENANT,
      document_id: "hr-doc-1",
      vault_object_id: "vault-hr-1",
      owning_context: "HRX",
      content_hash: "sha256:hr",
      storage_ref: "vault://hr/1",
    },
    principal: { tenant_id: TENANT, actor_id: "hr-reader", scopes: ["hrx:documents:read"] },
    audit: { append: (event) => hrAudit.push(event) },
  });
  assert.equal(hrVault.outcome, "ok");
  assert.equal(hrVault.envelope.document_bytes_included, false);
});

test("UPL-E-01 DMS search indexes PDF/DOCX body text without exposing raw text", () => {
  const pdfDocument = documentFixture({
    document_id: "doc-e01-body-search",
    current_version_id: "version-doc-e01-body-search-1",
    title: "전문검색 검증 문서",
    mime_type: "application/pdf",
  });
  const pdfIndex = createSearchIndexEnvelope({
    document: pdfDocument,
    version: { version_id: pdfDocument.current_version_id },
    file_object: { mime_type: "application/pdf" },
    bytes: "%PDF-1.4\n(차임증액 본문키워드 검증)\n%%EOF",
  });
  assert.equal(pdfIndex.body_text_indexed, true);
  assert.equal(pdfIndex.search_backend, "json_substring_search");
  assert.equal(pdfIndex.raw_text_included, false);
  assert.equal(pdfIndex.storage_pointer_ref_included, false);
  assert.ok(pdfIndex.indexed_fields.includes("body_text"));

  const docxDocument = documentFixture({
    document_id: "doc-e01-docx-body-search",
    current_version_id: "version-doc-e01-docx-body-search-1",
    title: "DOCX 전문검색 검증 문서",
    mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const docxIndex = createSearchIndexEnvelope({
    document: docxDocument,
    version: { version_id: docxDocument.current_version_id },
    file_object: { mime_type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
    bytes: "<w:document><w:t>퇴직금 본문키워드 검증 &amp;lt;보존&amp;gt;</w:t></w:document>",
  });
  assert.equal(docxIndex.body_text_indexed, true);

  const search = searchMatterVault({
    permission_decision_id: "decision-e01-search",
    query: "차임증액",
    index_rows: [pdfIndex, docxIndex],
    allowed_document_ids: [pdfDocument.document_id, docxDocument.document_id],
  });
  assert.equal(search.results.length, 1);
  assert.deepEqual(search.results[0].match_fields, ["body_text"]);
  assert.equal(search.results[0].raw_text_included, false);
  assert.equal(search.results[0].storage_pointer_ref_included, false);
  assert.equal(JSON.stringify(search.results[0]).includes("차임증액"), false);

  const docxSearch = searchMatterVault({
    permission_decision_id: "decision-e01-docx-search",
    query: "퇴직금",
    index_rows: [pdfIndex, docxIndex],
    allowed_document_ids: [pdfDocument.document_id, docxDocument.document_id],
  });
  assert.equal(docxSearch.results[0].document_id, docxDocument.document_id);
  assert.equal(JSON.stringify(docxSearch.results[0]).includes("퇴직금"), false);

  const entitySearch = searchMatterVault({
    permission_decision_id: "decision-e01-docx-entity-search",
    query: "&lt;보존&gt;",
    index_rows: [docxIndex],
    allowed_document_ids: [docxDocument.document_id],
  });
  assert.equal(entitySearch.results[0].document_id, docxDocument.document_id);
  assert.equal(searchMatterVault({
    permission_decision_id: "decision-e01-docx-double-decode-denial",
    query: "<보존>",
    index_rows: [docxIndex],
    allowed_document_ids: [docxDocument.document_id],
  }).results.length, 0);
});

test("UPL-E-02 DMS OCR sidecar indexes scanned PDF text without claiming OCR runtime execution", () => {
  const document = documentFixture({
    document_id: "doc-e02-scanned-pdf",
    current_version_id: "version-doc-e02-scanned-pdf-1",
    title: "스캔 PDF OCR 검증",
    mime_type: "application/pdf",
  });
  const index = createSearchIndexEnvelope({
    document,
    version: { version_id: document.current_version_id },
    file_object: { mime_type: "application/pdf" },
    bytes: "%PDF-1.4\n/Type /XObject /Subtype /Image\n%%EOF",
    ocr_text: "토지대장 OCR키워드 검증",
  });
  assert.equal(index.ocr_text_indexed, true);
  assert.equal(index.ocr_runtime_executed, false);
  assert.equal(index.ocr_provider, "caller_supplied_ocr_sidecar");
  assert.equal(index.search_backend, "json_substring_search");
  assert.ok(index.indexed_fields.includes("ocr_text"));

  const search = searchMatterVault({
    permission_decision_id: "decision-e02-ocr-search",
    query: "OCR키워드",
    index_rows: [index],
    allowed_document_ids: [document.document_id],
  });
  assert.equal(search.results.length, 1);
  assert.deepEqual(search.results[0].match_fields, ["ocr_text"]);
  assert.equal(search.results[0].ocr_text_indexed, true);
  assert.equal(search.results[0].ocr_runtime_executed, false);
  assert.equal(search.results[0].raw_text_included, false);
  assert.equal(search.results[0].storage_pointer_ref_included, false);
  assert.equal(JSON.stringify(search.results[0]).includes("OCR키워드"), false);
});

test("Vault search indexing rejects oversized source bytes and OCR sidecars", () => {
  const document = documentFixture({
    document_id: "doc-index-limit",
    current_version_id: "version-index-limit-1",
    mime_type: "application/pdf",
  });
  assert.throws(
    () => createSearchIndexEnvelope({
      document,
      version: { version_id: document.current_version_id },
      bytes: Buffer.alloc(DMS_SEARCH_INDEX_LIMITS.source_bytes + 1),
    }),
    (error) => error.safe_error_code === "DMS_SEARCH_INDEX_INPUT_TOO_LARGE" && error.status === 413,
  );
  assert.throws(
    () => createSearchIndexEnvelope({
      document,
      version: { version_id: document.current_version_id },
      bytes: "%PDF-1.4",
      ocr_text: "x".repeat(DMS_SEARCH_INDEX_LIMITS.ocr_characters + 1),
    }),
    (error) => error.safe_error_code === "DMS_SEARCH_INDEX_INPUT_TOO_LARGE" && error.status === 413,
  );
});
