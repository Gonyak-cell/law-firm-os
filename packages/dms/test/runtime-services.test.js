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
  createLocalStorageAdapter,
  createRagEvidenceLedger,
  createRedactionMetadata,
  createRetentionPolicy,
  createS3StorageAdapterPlaceholder,
  createSearchIndexEnvelope,
  createSecureLink,
  createSharePointStorageAdapterPlaceholder,
  createVaultObjectId,
  exportRedactedDocument,
  filterPrivilegedForSearch,
  filterSearchResultsByAcl,
  serializeFileObjectSafe,
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
  const receipt = storage.putObject({ object_id: "object-1", bytes: "hello", content_type: "text/plain" });
  assert.equal(receipt.raw_path_exposed, false);
  assert.equal(storage.statObject({ object_id: "object-1" }).sha256, receipt.sha256);
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

test("G5 search, RAG, email, and HR document vault flows are permission and source safe", () => {
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
  const filed = fileEmailThreadToMatter({
    repository,
    thread: { tenant_id: TENANT, matter_id: MATTER, email_thread_id: "thread-1", subject: "Matter filing" },
    actor_id: "user-dms",
    audit: { append: (event) => emailAudit.push(event) },
  });
  assert.equal(filed.outcome, "created");
  assert.equal(fileEmailThreadToMatter({ repository, thread: filed.thread }).outcome, "idempotent_replay");
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
