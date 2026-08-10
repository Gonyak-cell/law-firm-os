import assert from "node:assert/strict";
import test from "node:test";
import { createDmsRepository } from "../../../packages/dms/src/index.js";
import {
  createDmsRepositoryMimeAuthority,
  fileEmailThreadToMatter,
  outlookEmailFilingAuditEvent,
  outlookEmailFileRequestFingerprint,
} from "../../../packages/email-dms/src/email-filing-service.js";

const TENANT = "tenant_receipt_legacy_test";
const MATTER = "matter_receipt_legacy_test";

function fixture({ audit = "match", fingerprint = null } = {}) {
  const repository = createDmsRepository();
  const emailThreadId = `thread:legacy-${audit}`;
  const mimeSha256 = "b".repeat(64);
  const documentId = `doc:${emailThreadId}:original-mime:${mimeSha256}`;
  const versionId = `version:${emailThreadId}:original-mime`;
  const fileObjectId = `file:${emailThreadId}:original-mime`;
  const thread = repository.create({ model_type: "DmsEmailThread", tenant_id: TENANT, matter_id: MATTER, email_thread_id: emailThreadId, graph_message_id: "immutable:legacy", internet_message_id: "<legacy@amic.law>", conversation_id: `conversation:${audit}`, subject: "Legacy fixture", status: "active", filing_mode: "manual", filing_user: "original-actor", filing_time: "2026-08-06T00:00:00.000Z", filed_document_ids: [documentId], permission_envelope_id: "permission:legacy", audit_trace_id: "audit:legacy" });
  const authority = { permission_envelope_id: "permission:legacy", audit_trace_id: "audit:legacy" };
  repository.create({ model_type: "DmsDocument", tenant_id: TENANT, matter_id: MATTER, document_id: documentId, workspace_id: `workspace:${MATTER}`, folder_id: `folder:${MATTER}:00_Email`, title: "legacy.eml", status: "active", current_version_id: versionId, latest_sha256: mimeSha256, source_email_thread_id: emailThreadId, ...authority });
  repository.create({ model_type: "DmsDocumentVersion", tenant_id: TENANT, matter_id: MATTER, version_id: versionId, document_id: documentId, version_number: 1, status: "current", file_object_id: fileObjectId, sha256: mimeSha256, persisted: true, ...authority });
  const objectId = `object:${emailThreadId}`;
  repository.create({ model_type: "DmsFileObject", tenant_id: TENANT, matter_id: MATTER, file_object_id: fileObjectId, object_id: objectId, storage_pointer_ref: objectId, sha256: mimeSha256, byte_size: 1, mime_type: "message/rfc822", ...authority });
  const key = `outlook-email-file:${emailThreadId}:${mimeSha256}:dms`;
  if (audit !== "missing") {
    const filingAudit = outlookEmailFilingAuditEvent(thread);
    repository.appendAudit(audit === "stale"
      ? { ...filingAudit, occurred_at: "1999-01-01T00:00:00.000Z" }
      : audit === "foreign"
        ? { ...filingAudit, actor_id: "foreign-actor", metadata: { ...filingAudit.metadata, matter_id: "matter:foreign", actor_id: "foreign-actor" } }
        : filingAudit);
  }
  repository.recordIdempotency({ tenant_id: TENANT, idempotency_key: key, operation: "outlook_email_file", request_fingerprint: fingerprint, response: { outcome: "created", email_thread_id: emailThreadId, matter_id: MATTER, filed_document_ids: [documentId] } });
  const provider = {
    statObject: () => ({ object_id: objectId, sha256: mimeSha256, byte_size: 1, mime_type: "message/rfc822" }),
    digestObject: () => ({ object_id: objectId, sha256: mimeSha256, byte_size: 1 }),
  };
  return { repository, thread, authority: createDmsRepositoryMimeAuthority(repository, { provider }), key };
}

test("legacy null-fingerprint replay remains immutable after matching durable audit", async () => {
  const { repository, thread, authority, key } = fixture();
  const before = JSON.stringify(repository.snapshot());
  const result = await fileEmailThreadToMatter({ repository, thread, actor_id: "replay-actor", require_original_mime_document: true, idempotency_key: key, durable_mime_authority: authority });
  assert.equal(result.outcome, "idempotent_replay");
  assert.equal(repository.listAudit({ tenant_id: TENANT, object_id: thread.email_thread_id })[0].actor_id, "original-actor");
  assert.equal(repository.getIdempotency({ tenant_id: TENANT, idempotency_key: key }).request_fingerprint, null);
  const after = JSON.stringify(repository.snapshot());
  assert.equal(after, before);
  assert.equal(Buffer.byteLength(after), Buffer.byteLength(before));
  assert.equal(JSON.parse(after).idempotency.length, JSON.parse(before).idempotency.length);
});

test("legacy null-fingerprint replay rejects missing, stale, or foreign audit without mutation", async () => {
  for (const audit of ["missing", "stale", "foreign"]) {
    const { repository, thread, authority, key } = fixture({ audit });
    const before = JSON.stringify(repository.snapshot());
    await assert.rejects(fileEmailThreadToMatter({ repository, thread, actor_id: "replay-actor", require_original_mime_document: true, idempotency_key: key, durable_mime_authority: authority }), /audit/u);
    const after = JSON.stringify(repository.snapshot());
    assert.equal(after, before);
    assert.equal(Buffer.byteLength(after), Buffer.byteLength(before));
    assert.equal(repository.snapshot().idempotency.length, JSON.parse(before).idempotency.length);
  }
});

test("fingerprinted replay rejects a missing canonical filing audit without mutation", async () => {
  const { repository, thread, authority, key } = fixture({ audit: "missing" });
  repository.recordIdempotency({ ...repository.getIdempotency({ tenant_id: TENANT, idempotency_key: key }), request_fingerprint: outlookEmailFileRequestFingerprint(thread) });
  const before = JSON.stringify(repository.snapshot());
  await assert.rejects(fileEmailThreadToMatter({ repository, thread, actor_id: "replay-actor", require_original_mime_document: true, idempotency_key: key, durable_mime_authority: authority }), /audit/u);
  assert.equal(JSON.stringify(repository.snapshot()), before);
});

test("stale caller MIME snapshots cannot bypass deleted durable originals", async () => {
  const seeded = fixture();
  seeded.repository.recordIdempotency({ ...seeded.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: seeded.key }), request_fingerprint: outlookEmailFileRequestFingerprint(seeded.thread) });
  const document = seeded.repository.get({ tenant_id: TENANT, model_type: "DmsDocument", document_id: seeded.thread.filed_document_ids[0] });
  const version = seeded.repository.get({ tenant_id: TENANT, model_type: "DmsDocumentVersion", version_id: document.current_version_id });
  const fileObject = seeded.repository.get({ tenant_id: TENANT, model_type: "DmsFileObject", file_object_id: version.file_object_id });
  const staleSnapshot = { document, versions: [version], file_objects: [fileObject] };
  seeded.repository.delete({ tenant_id: TENANT, model_type: "DmsFileObject", file_object_id: fileObject.file_object_id });
  seeded.repository.delete({ tenant_id: TENANT, model_type: "DmsDocumentVersion", version_id: version.version_id });
  seeded.repository.delete({ tenant_id: TENANT, model_type: "DmsDocument", document_id: document.document_id });
  const before = JSON.stringify(seeded.repository.snapshot());
  await assert.rejects(fileEmailThreadToMatter({ repository: seeded.repository, thread: seeded.thread, actor_id: "replay-actor", require_original_mime_document: true, idempotency_key: seeded.key, durable_mime_authority: seeded.authority, durable_mime_document: staleSnapshot }), /snapshot/u);
  assert.equal(JSON.stringify(seeded.repository.snapshot()), before);
});
