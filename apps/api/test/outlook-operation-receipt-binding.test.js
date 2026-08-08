import assert from "node:assert/strict";
import test from "node:test";
import { createDmsRepository } from "../../../packages/dms/src/index.js";
import { createDmsRepositoryMimeAuthority, fileEmailThreadToMatter, outlookEmailFileRequestFingerprint } from "../../../packages/email-dms/src/email-filing-service.js";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";
import {
  CANONICAL_ID,
  CONVERSATION_ID,
  DOCUMENT_ID,
  FILE_KEY,
  INTERNET_ID,
  MATTER,
  THREAD_ID,
  TENANT,
  runtimeFixture,
} from "./outlook-operation-receipt-readback-fixture.js";
function seedMimeAuthority(repository, thread) {
  const documentId = thread.filed_document_ids[0];
  const sha256 = documentId.slice(documentId.lastIndexOf(":") + 1);
  const versionId = `version:${thread.email_thread_id}:original-mime`;
  const fileObjectId = `file:${thread.email_thread_id}:original-mime`;
  const authority = { permission_envelope_id: "permission:service-fixture", audit_trace_id: "audit:service-fixture" };
  repository.create({ model_type: "DmsDocument", tenant_id: thread.tenant_id, matter_id: thread.matter_id, document_id: documentId, workspace_id: `workspace:${thread.matter_id}`, folder_id: `folder:${thread.matter_id}:00_Email`, title: "canonical fixture.eml", status: "active", current_version_id: versionId, latest_sha256: sha256, source_email_thread_id: thread.email_thread_id, ...authority });
  repository.create({ model_type: "DmsDocumentVersion", tenant_id: thread.tenant_id, matter_id: thread.matter_id, version_id: versionId, document_id: documentId, version_number: 1, status: "current", file_object_id: fileObjectId, sha256, persisted: true, ...authority });
  repository.create({ model_type: "DmsFileObject", tenant_id: thread.tenant_id, matter_id: thread.matter_id, file_object_id: fileObjectId, object_id: `object:${thread.email_thread_id}`, sha256, byte_size: 1, mime_type: "message/rfc822", storage_pointer_ref: `object:${thread.email_thread_id}`, status: "committed", ...authority });
}
function assertSnapshotUnchanged(repository, before) { const after = JSON.stringify(repository.snapshot()); assert.equal(after, before); assert.equal(Buffer.byteLength(after), Buffer.byteLength(before)); assert.equal(JSON.parse(after).idempotency.length, JSON.parse(before).idempotency.length); }
function serviceFixture() {
  const repository = createDmsRepository();
  const thread = repository.create({
    model_type: "DmsEmailThread",
    tenant_id: TENANT,
    matter_id: MATTER,
    email_thread_id: THREAD_ID,
    graph_message_id: CANONICAL_ID,
    internet_message_id: INTERNET_ID,
    conversation_id: CONVERSATION_ID,
    subject: "canonical service fixture",
    status: "active",
    filing_mode: "manual",
    filing_user: "service-actor",
    filing_time: "2026-08-08T00:00:00.000Z",
    filed_document_ids: [DOCUMENT_ID],
    permission_envelope_id: "permission:service-fixture",
    audit_trace_id: "audit:service-fixture",
  });
  repository.appendAudit({
    event_id: `outlook.email.file:${TENANT}:${THREAD_ID}`,
    tenant_id: TENANT,
    actor_id: "service-actor",
    action: "dms.email.thread.file",
    object_type: "DmsEmailThread",
    object_id: THREAD_ID,
    decision: "allow",
    reason: "email_thread_filed_to_matter",
    occurred_at: thread.filing_time,
    metadata: {
      operation: "outlook_email_file",
      tenant_id: TENANT,
      matter_id: MATTER,
      email_thread_id: THREAD_ID,
      graph_message_id: CANONICAL_ID,
      internet_message_id: INTERNET_ID.toLowerCase(),
      conversation_id: CONVERSATION_ID,
      filing_mode: "manual",
      filed_document_ids: [DOCUMENT_ID],
      actor_id: "service-actor",
    },
  });
  seedMimeAuthority(repository, thread);
  const objectId = `object:${thread.email_thread_id}`;
  const provider = {
    statObject: () => ({ object_id: objectId, sha256: thread.filed_document_ids[0].slice(-64), byte_size: 1, mime_type: "message/rfc822" }),
    digestObject: () => ({ object_id: objectId, sha256: thread.filed_document_ids[0].slice(-64), byte_size: 1 }),
  };
  return { repository, thread, authority: createDmsRepositoryMimeAuthority(repository, { provider }), idempotency_key: `${FILE_KEY}:dms` };
}
function validEntry(fixture, overrides = {}) {
  return {
    tenant_id: TENANT,
    idempotency_key: fixture.idempotency_key,
    operation: "outlook_email_file",
    request_fingerprint: outlookEmailFileRequestFingerprint(fixture.thread),
    response: {
      email_thread_id: THREAD_ID,
      matter_id: MATTER,
      filed_document_ids: [DOCUMENT_ID],
      outcome: "created",
    },
    ...overrides,
  };
}
test("canonical filing replay rejects wrong operation, documents, fingerprint, and source identity without mutation", async () => {
  for (const overrides of [
    { operation: "different_operation" },
    { response: { email_thread_id: THREAD_ID, matter_id: MATTER, filed_document_ids: ["document:other"], outcome: "created" } },
    { request_fingerprint: "f".repeat(64) },
  ]) {
    const fixture = serviceFixture();
    fixture.repository.recordIdempotency(validEntry(fixture, overrides));
    const beforeReceipt = fixture.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: fixture.idempotency_key });
    const beforeAudits = fixture.repository.listAudit({ tenant_id: TENANT, object_id: THREAD_ID });
    await assert.rejects(fileEmailThreadToMatter({
      repository: fixture.repository,
      thread: fixture.thread,
      actor_id: "replay-actor",
      require_original_mime_document: true,
      idempotency_key: fixture.idempotency_key,
      durable_mime_authority: fixture.authority,
    }), /idempotency/u);
    assert.deepEqual(fixture.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: fixture.idempotency_key }), beforeReceipt);
    assert.deepEqual(fixture.repository.listAudit({ tenant_id: TENANT, object_id: THREAD_ID }), beforeAudits);
  }
  const fixture = serviceFixture();
  fixture.repository.recordIdempotency(validEntry(fixture, { request_fingerprint: null }));
  const replay = await fileEmailThreadToMatter({
    repository: fixture.repository,
    thread: fixture.thread,
    actor_id: "replay-actor",
    require_original_mime_document: true,
    idempotency_key: fixture.idempotency_key,
    durable_mime_authority: fixture.authority,
  });
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(
    fixture.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: fixture.idempotency_key }).request_fingerprint,
    outlookEmailFileRequestFingerprint(fixture.thread),
  );
  const sourceMismatch = serviceFixture();
  sourceMismatch.repository.recordIdempotency(validEntry(sourceMismatch));
  const beforeSource = sourceMismatch.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: sourceMismatch.idempotency_key });
  await assert.rejects(fileEmailThreadToMatter({
    repository: sourceMismatch.repository,
    thread: { ...sourceMismatch.thread, graph_message_id: "immutable:spoofed" },
    actor_id: "replay-actor",
    require_original_mime_document: true,
    idempotency_key: sourceMismatch.idempotency_key,
    durable_mime_authority: sourceMismatch.authority,
  }), /idempotency/u);
  assert.deepEqual(sourceMismatch.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: sourceMismatch.idempotency_key }), beforeSource);
});
test("canonical filing rejects a foreign digest key before lookup or mutation", async () => {
  const fixture = serviceFixture();
  fixture.repository.recordIdempotency(validEntry(fixture));
  const before = JSON.stringify(fixture.repository.snapshot());
  const foreignThread = { ...fixture.thread, filed_document_ids: [`doc:${THREAD_ID}:original-mime:${"f".repeat(64)}`] };
  const foreignKey = `outlook-email-file:${THREAD_ID}:${"f".repeat(64)}:dms`;
  await assert.rejects(fileEmailThreadToMatter({
    repository: fixture.repository,
    thread: foreignThread,
    actor_id: "replay-actor",
    require_original_mime_document: true,
    idempotency_key: foreignKey,
    durable_mime_authority: fixture.authority,
  }), /canonical|authority/u);
  assertSnapshotUnchanged(fixture.repository, before);
});
function readbackBody() {
  return {
    matter_id: MATTER,
    current_item: {
      rest_message_id: "rest-readback-a",
      canonical_graph_message_id: CANONICAL_ID,
      internet_message_id: INTERNET_ID,
      conversation_id: CONVERSATION_ID,
      mode: "read",
      provenance: "received",
    },
  };
}
async function readback(fixture, requestId) {
  return handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId,
    context: fixture.context,
    runtime: fixture.runtime,
  });
}
test("API readback fails closed for wrong durable operation, document set, or fingerprint", async () => {
  for (const overrides of [
    { operation: "different_operation" },
    { response: { email_thread_id: THREAD_ID, matter_id: MATTER, filed_document_ids: ["document:other"], outcome: "idempotent_replay" } },
    { request_fingerprint: "0".repeat(64) },
  ]) {
    const fixture = runtimeFixture();
    const before = fixture.dmsRepository.getIdempotency({ tenant_id: TENANT, idempotency_key: `${FILE_KEY}:dms` });
    fixture.dmsRepository.recordIdempotency({
      ...before,
      ...overrides,
      response: overrides.response ?? before.response,
    });
    const response = await readback(fixture, `request:binding-${String(overrides.operation ?? overrides.request_fingerprint ?? "documents")}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.outcome, "empty");
    assert.deepEqual(response.body.items, []);
    assert.deepEqual(
      fixture.dmsRepository.getIdempotency({ tenant_id: TENANT, idempotency_key: `${FILE_KEY}:dms` }),
      { ...before, ...overrides, response: overrides.response ?? before.response },
    );
  }
});
test("API legacy receipt without fingerprint is reconciled only from the durable thread and document set", async () => {
  const fixture = runtimeFixture();
  const key = `${FILE_KEY}:dms`;
  const before = fixture.dmsRepository.getIdempotency({ tenant_id: TENANT, idempotency_key: key });
  fixture.dmsRepository.recordIdempotency({ ...before, request_fingerprint: null });
  const response = await readback(fixture, "request:binding-legacy");
  assert.equal(response.status, 200);
  assert.equal(response.body.items[0].email_thread_id, THREAD_ID);
  assert.deepEqual(fixture.dmsRepository.getIdempotency({ tenant_id: TENANT, idempotency_key: key }), { ...before, request_fingerprint: null });
});
test("API ignores a foreign digest receipt key and preserves the repository byte-for-byte", async () => {
  const fixture = runtimeFixture();
  const expectedKey = `${FILE_KEY}:dms`;
  const expected = fixture.dmsRepository.getIdempotency({ tenant_id: TENANT, idempotency_key: expectedKey });
  const foreignKey = `outlook-email-file:${THREAD_ID}:${"f".repeat(64)}:dms`;
  fixture.dmsRepository.recordIdempotency({ ...expected, idempotency_key: foreignKey });
  fixture.dmsRepository.recordIdempotency({ ...expected, operation: "foreign_operation" });
  const before = JSON.stringify(fixture.dmsRepository.snapshot());
  const response = await readback(fixture, "request:binding-foreign-digest");
  assert.equal(response.status, 200);
  assert.equal(response.body.outcome, "empty");
  assert.deepEqual(response.body.items, []);
  assertSnapshotUnchanged(fixture.dmsRepository, before);
});
test("API fails closed for a missing or foreign canonical filing audit without mutation", async () => {
  for (const metadata of [null, { matter_id: "matter:foreign" }]) {
    const fixture = runtimeFixture();
    fixture.dmsRepository.recordIdempotency({
      ...fixture.dmsRepository.getIdempotency({ tenant_id: TENANT, idempotency_key: `${FILE_KEY}:dms` }),
      request_fingerprint: null,
    });
    fixture.dmsRepository.appendAudit({
      event_id: `outlook.email.file:${TENANT}:${THREAD_ID}`,
      tenant_id: TENANT,
      actor_id: "foreign-audit-actor",
      action: "dms.email.thread.file",
      object_type: "DmsEmailThread",
      object_id: THREAD_ID,
      decision: "allow",
      reason: "email_thread_filed_to_matter",
      occurred_at: "2026-08-08T00:00:00.000Z",
      ...(metadata ? { metadata } : {}),
    });
    const before = JSON.stringify(fixture.dmsRepository.snapshot());
    const response = await readback(fixture, `request:binding-audit-${metadata ? "foreign" : "missing"}`);
    assert.equal(response.status, 200);
    assert.equal(response.body.outcome, "empty");
    assert.deepEqual(response.body.items, []);
    assertSnapshotUnchanged(fixture.dmsRepository, before);
  }
});
