import assert from "node:assert/strict";
import test from "node:test";
import { createDmsRepositoryMimeAuthority, fileEmailThreadToMatter } from "../../../packages/email-dms/src/email-filing-service.js";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";
import {
  CANONICAL_ID,
  CONVERSATION_ID,
  FILE_KEY,
  INTERNET_ID,
  MATTER,
  THREAD_ID,
  TENANT,
  runtimeFixture,
} from "./outlook-operation-receipt-readback-fixture.js";

function authorityWithDigestObjectId(fixture, digestObjectId) {
  const objectId = "object:readback-a";
  return createDmsRepositoryMimeAuthority(fixture.dmsRepository, {
    provider: {
      statObject: () => ({ object_id: objectId, sha256: "a".repeat(64), byte_size: 1, mime_type: "message/rfc822" }),
      digestObject: () => ({ object_id: digestObjectId, sha256: "a".repeat(64), byte_size: 1 }),
    },
  });
}

function readback(fixture) {
  fixture.runtime.dmsRuntime.upload_runtime = authorityWithDigestObjectId(fixture, "object:foreign");
  return handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: {
      matter_id: MATTER,
      current_item: {
        rest_message_id: "rest-readback-a",
        canonical_graph_message_id: CANONICAL_ID,
        internet_message_id: INTERNET_ID,
        conversation_id: CONVERSATION_ID,
        mode: "read",
        provenance: "received",
      },
    },
    requestId: "request:provider-object-boundary",
    context: fixture.context,
    runtime: fixture.runtime,
  });
}

test("foreign provider digest object identity fails service and readback closed without mutation", async () => {
  const serviceFixture = runtimeFixture();
  const thread = serviceFixture.dmsRepository.get({ tenant_id: TENANT, model_type: "DmsEmailThread", email_thread_id: THREAD_ID });
  const beforeService = JSON.stringify(serviceFixture.dmsRepository.snapshot());
  await assert.rejects(fileEmailThreadToMatter({
    repository: serviceFixture.dmsRepository,
    thread,
    actor_id: "replay-actor",
    require_original_mime_document: true,
    idempotency_key: `${FILE_KEY}:dms`,
    durable_mime_authority: authorityWithDigestObjectId(serviceFixture, "object:foreign"),
  }), /provider|authority|conflict/u);
  assert.equal(JSON.stringify(serviceFixture.dmsRepository.snapshot()), beforeService);

  const routeFixture = runtimeFixture();
  const beforeReadback = JSON.stringify(routeFixture.dmsRepository.snapshot());
  const response = await readback(routeFixture);
  assert.equal(response.status, 200);
  assert.equal(response.body.outcome, "empty");
  assert.deepEqual(response.body.items, []);
  assert.equal(JSON.stringify(routeFixture.dmsRepository.snapshot()), beforeReadback);
  assert.equal(routeFixture.dmsRepository.getIdempotency({ tenant_id: TENANT, idempotency_key: `${FILE_KEY}:dms` }).response.outcome, "created");
});
