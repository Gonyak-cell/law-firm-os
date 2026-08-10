import assert from "node:assert/strict";
import test from "node:test";
import { createDmsRepository } from "../../dms/src/index.js";
import { fileEmailThreadToMatter } from "../src/email-filing-service.js";

function thread(documentId) {
  return {
    tenant_id: "tenant-email-filing-boundary",
    matter_id: "matter-email-filing-boundary",
    email_thread_id: "thread-email-filing-boundary",
    filed_document_ids: [documentId],
  };
}

async function rejectsWithoutMutation(documentId) {
  const repository = createDmsRepository();
  let auditWrites = 0;
  await assert.rejects(fileEmailThreadToMatter({
    repository,
    thread: thread(documentId),
    actor_id: "actor-email-filing-boundary",
    require_original_mime_document: true,
    idempotency_key: "email-filing-boundary",
    audit: { append() { auditWrites += 1; } },
  }), /filed_document_ids\[0\] is invalid/u);
  assert.equal(repository.list({
    tenant_id: "tenant-email-filing-boundary",
    model_type: "DmsEmailThread",
  }).length, 0);
  assert.equal(repository.getIdempotency({
    tenant_id: "tenant-email-filing-boundary",
    idempotency_key: "email-filing-boundary",
  }), undefined);
  assert.equal(auditWrites, 0);
}

test("NUL-bearing original MIME document ID fails before filing mutation", async () => {
  await rejectsWithoutMutation("document\u0000forged");
});

test("newline-bearing original MIME document ID fails before filing mutation", async () => {
  await rejectsWithoutMutation("document\nforged");
});

test("DEL-bearing original MIME document ID fails before filing mutation", async () => {
  await rejectsWithoutMutation("document\u007fforged");
});

test("C1 control-bearing original MIME document ID fails before filing mutation", async () => {
  await rejectsWithoutMutation("document\u0085forged");
});

test("padded original MIME document ID fails before filing mutation", async () => {
  await rejectsWithoutMutation(" document-padded ");
});

test("over-budget original MIME document ID fails before filing mutation", async () => {
  await rejectsWithoutMutation("d".repeat(513));
});
