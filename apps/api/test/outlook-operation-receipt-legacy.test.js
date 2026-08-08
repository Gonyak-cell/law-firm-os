import assert from "node:assert/strict";
import test from "node:test";
import { createDmsRepository } from "../../../packages/dms/src/index.js";
import {
  fileEmailThreadToMatter,
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
  repository.create({ model_type: "DmsFileObject", tenant_id: TENANT, matter_id: MATTER, file_object_id: fileObjectId, storage_pointer_ref: `object:${emailThreadId}`, sha256: mimeSha256, byte_size: 1, mime_type: "message/rfc822", ...authority });
  const key = `outlook-email-file:${emailThreadId}:${mimeSha256}:dms`;
  if (audit !== "missing") {
    repository.appendAudit({ event_id: `outlook.email.file:${TENANT}:${emailThreadId}`, tenant_id: TENANT, actor_id: audit === "foreign" ? "foreign-actor" : "original-actor", action: "dms.email.thread.file", object_type: "DmsEmailThread", object_id: emailThreadId, decision: "allow", reason: "email_thread_filed_to_matter", occurred_at: audit === "stale" ? "1999-01-01T00:00:00.000Z" : thread.filing_time, metadata: audit === "foreign" ? { operation: "outlook_email_file", tenant_id: TENANT, matter_id: "matter:foreign", email_thread_id: emailThreadId, graph_message_id: thread.graph_message_id, internet_message_id: thread.internet_message_id, conversation_id: thread.conversation_id, filing_mode: "manual", filed_document_ids: [documentId], actor_id: "foreign-actor" } : { operation: "outlook_email_file", tenant_id: TENANT, matter_id: MATTER, email_thread_id: emailThreadId, graph_message_id: thread.graph_message_id, internet_message_id: thread.internet_message_id, conversation_id: thread.conversation_id, filing_mode: "manual", filed_document_ids: [documentId], actor_id: "original-actor" } });
  }
  repository.recordIdempotency({ tenant_id: TENANT, idempotency_key: key, operation: "outlook_email_file", request_fingerprint: fingerprint, response: { outcome: "created", email_thread_id: emailThreadId, matter_id: MATTER, filed_document_ids: [documentId] } });
  return { repository, thread, key };
}

test("legacy null-fingerprint replay backfills only after matching durable audit", () => {
  const { repository, thread, key } = fixture();
  const result = fileEmailThreadToMatter({ repository, thread, actor_id: "replay-actor", require_original_mime_document: true, idempotency_key: key });
  assert.equal(result.outcome, "idempotent_replay");
  assert.equal(repository.listAudit({ tenant_id: TENANT, object_id: thread.email_thread_id })[0].actor_id, "original-actor");
  assert.equal(repository.getIdempotency({ tenant_id: TENANT, idempotency_key: key }).request_fingerprint, outlookEmailFileRequestFingerprint(thread));
});

test("legacy null-fingerprint replay rejects missing, stale, or foreign audit without mutation", () => {
  for (const audit of ["missing", "stale", "foreign"]) {
    const { repository, thread, key } = fixture({ audit });
    const before = JSON.stringify(repository.snapshot());
    assert.throws(() => fileEmailThreadToMatter({ repository, thread, actor_id: "replay-actor", require_original_mime_document: true, idempotency_key: key }), /audit/u);
    const after = JSON.stringify(repository.snapshot());
    assert.equal(after, before);
    assert.equal(Buffer.byteLength(after), Buffer.byteLength(before));
    assert.equal(repository.snapshot().idempotency.length, JSON.parse(before).idempotency.length);
  }
});

test("fingerprinted replay rejects a missing canonical filing audit without mutation", () => {
  const { repository, thread, key } = fixture({ audit: "missing" });
  repository.recordIdempotency({ ...repository.getIdempotency({ tenant_id: TENANT, idempotency_key: key }), request_fingerprint: outlookEmailFileRequestFingerprint(thread) });
  const before = JSON.stringify(repository.snapshot());
  assert.throws(() => fileEmailThreadToMatter({ repository, thread, actor_id: "replay-actor", require_original_mime_document: true, idempotency_key: key }), /audit/u);
  assert.equal(JSON.stringify(repository.snapshot()), before);
});

test("caller digest cannot bypass a deleted original MIME FileObject", () => {
  const seeded = fixture();
  seeded.repository.recordIdempotency({ ...seeded.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: seeded.key }), request_fingerprint: outlookEmailFileRequestFingerprint(seeded.thread) });
  const fileObject = seeded.repository.get({ tenant_id: TENANT, model_type: "DmsDocumentVersion", version_id: `version:${seeded.thread.email_thread_id}:original-mime` });
  seeded.repository.delete({ tenant_id: TENANT, model_type: "DmsFileObject", file_object_id: fileObject.file_object_id });
  const before = JSON.stringify(seeded.repository.snapshot());
  const digest = seeded.thread.filed_document_ids[0].split(":").at(-1);
  assert.throws(() => fileEmailThreadToMatter({ repository: seeded.repository, thread: seeded.thread, actor_id: "replay-actor", require_original_mime_document: true, idempotency_key: seeded.key, authoritative_mime_sha256: digest }), /authority/u);
  assert.equal(JSON.stringify(seeded.repository.snapshot()), before);
});
