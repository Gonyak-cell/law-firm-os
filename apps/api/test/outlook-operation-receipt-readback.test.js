import assert from "node:assert/strict";
import test from "node:test";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";
import {
  CANONICAL_ID,
  CONVERSATION_ID,
  DOCUMENT_ID,
  FILE_KEY,
  INTERNET_ID,
  MATTER,
  MIME_SHA256,
  REST_ID,
  THREAD_ID,
  TIMELINE_ID,
  runtimeFixture,
} from "./outlook-operation-receipt-readback-fixture.js";

function readbackBody(overrides = {}) {
  return {
    matter_id: MATTER,
    current_item: {
      rest_message_id: REST_ID,
      canonical_graph_message_id: CANONICAL_ID,
      internet_message_id: INTERNET_ID,
      conversation_id: CONVERSATION_ID,
      mode: "read",
      provenance: "received",
      ...overrides,
    },
  };
}

async function readback(fixture, body = readbackBody(), requestId = "request:readback") {
  return handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body,
    requestId,
    context: fixture.context,
    runtime: fixture.runtime,
  });
}

test("readback revalidates identity, returns only durable safe refs, and is read-only", async () => {
  const fixture = runtimeFixture();
  const beforeThreads = fixture.dmsRepository.list({ model_type: "DmsEmailThread" }).length;
  const response = await readback(fixture);
  assert.equal(response.status, 200);
  assert.equal(response.body.outcome, "passed");
  assert.equal(response.body.items.length, 1);
  const summary = response.body.items[0];
  assert.deepEqual(Object.keys(summary).sort(), [
    "completed_at",
    "document_ids",
    "email_thread_id",
    "filing_mode",
    "item_context_ref",
    "matter_id",
    "operation",
    "outcome",
    "request_id",
    "timeline_event_ids",
  ]);
  assert.equal(summary.filing_mode, "manual");
  assert.equal(summary.outcome, "created");
  assert.match(summary.item_context_ref, /^item-context:[a-f0-9]{16}$/u);
  assert.deepEqual(summary.document_ids, [DOCUMENT_ID]);
  assert.deepEqual(summary.timeline_event_ids, [TIMELINE_ID]);
  assert.doesNotMatch(JSON.stringify(response.body), /subject|body|participant|MIME|token|storage/u);
  assert.equal(fixture.dmsRepository.list({ model_type: "DmsEmailThread" }).length, beforeThreads);
});

test("readback preserves sent filing mode and durable replay outcome", async () => {
  const fixture = runtimeFixture();
  fixture.dmsRepository.update(
    { tenant_id: fixture.context.principal.tenant_id, model_type: "DmsEmailThread", email_thread_id: THREAD_ID },
    { filing_mode: "sent" },
  );
  fixture.matterRepository.update(
    { tenant_id: fixture.context.principal.tenant_id, model_type: "MatterTimelineEvent", resource_id: TIMELINE_ID },
    { type: "outlook.email.sent_filed" },
  );
  fixture.dmsRepository.recordIdempotency({
    tenant_id: fixture.context.principal.tenant_id,
    idempotency_key: `${FILE_KEY}:dms`,
    operation: "outlook_email_file",
    response: { email_thread_id: THREAD_ID, matter_id: MATTER, outcome: "idempotent_replay" },
  });
  const response = await readback(fixture, readbackBody({ mode: "read", provenance: "sent" }), "request:readback-sent");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.items.map(({ operation, outcome, filing_mode }) => ({ operation, outcome, filing_mode })), [
    { operation: "file_email", outcome: "idempotent_replay", filing_mode: "sent" },
  ]);
});
