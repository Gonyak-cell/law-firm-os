import assert from "node:assert/strict";
import test from "node:test";
import { createDmsRepository } from "../../../packages/dms/src/index.js";
import {
  fileEmailThreadToMatter,
  outlookEmailFileRequestFingerprint,
} from "../../../packages/email-dms/src/email-filing-service.js";
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
  });
  return { repository, thread, idempotency_key: `${FILE_KEY}:dms` };
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

test("canonical filing replay rejects wrong operation, documents, fingerprint, and source identity without mutation", () => {
  for (const overrides of [
    { operation: "different_operation" },
    { response: { email_thread_id: THREAD_ID, matter_id: MATTER, filed_document_ids: ["document:other"], outcome: "created" } },
    { request_fingerprint: "f".repeat(64) },
  ]) {
    const fixture = serviceFixture();
    fixture.repository.recordIdempotency(validEntry(fixture, overrides));
    const beforeReceipt = fixture.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: fixture.idempotency_key });
    const beforeAudits = fixture.repository.listAudit({ tenant_id: TENANT, object_id: THREAD_ID });
    assert.throws(() => fileEmailThreadToMatter({
      repository: fixture.repository,
      thread: fixture.thread,
      actor_id: "replay-actor",
      require_original_mime_document: true,
      idempotency_key: fixture.idempotency_key,
    }), /idempotency/u);
    assert.deepEqual(fixture.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: fixture.idempotency_key }), beforeReceipt);
    assert.deepEqual(fixture.repository.listAudit({ tenant_id: TENANT, object_id: THREAD_ID }), beforeAudits);
  }
  const fixture = serviceFixture();
  fixture.repository.recordIdempotency(validEntry(fixture, { request_fingerprint: null }));
  const replay = fileEmailThreadToMatter({
    repository: fixture.repository,
    thread: fixture.thread,
    actor_id: "replay-actor",
    require_original_mime_document: true,
    idempotency_key: fixture.idempotency_key,
  });
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(
    fixture.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: fixture.idempotency_key }).request_fingerprint,
    outlookEmailFileRequestFingerprint(fixture.thread),
  );
  const sourceMismatch = serviceFixture();
  sourceMismatch.repository.recordIdempotency(validEntry(sourceMismatch));
  const beforeSource = sourceMismatch.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: sourceMismatch.idempotency_key });
  assert.throws(() => fileEmailThreadToMatter({
    repository: sourceMismatch.repository,
    thread: { ...sourceMismatch.thread, graph_message_id: "immutable:spoofed" },
    actor_id: "replay-actor",
    require_original_mime_document: true,
    idempotency_key: sourceMismatch.idempotency_key,
  }), /idempotency/u);
  assert.deepEqual(sourceMismatch.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: sourceMismatch.idempotency_key }), beforeSource);
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
