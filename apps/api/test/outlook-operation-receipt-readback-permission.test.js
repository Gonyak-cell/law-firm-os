import assert from "node:assert/strict";
import test from "node:test";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";
import {
  ATTACH_DOCUMENT_ID,
  ATTACH_TIMELINE_ID,
  CANONICAL_ID,
  CONVERSATION_ID,
  DOCUMENT_ID,
  INTERNET_ID,
  MATTER,
  REST_ID,
  TENANT,
  runtimeFixture,
} from "./outlook-operation-receipt-readback-fixture.js";
import { seedOperationSpecificReceipts } from "./outlook-operation-receipt-readback-operations.js";

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

async function readback(fixture, body = readbackBody(), requestId = "request:readback-security") {
  return handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body,
    requestId,
    context: fixture.context,
    runtime: fixture.runtime,
  });
}

test("readback accepts only the canonical nested schema", async () => {
  const fixture = runtimeFixture();
  const canonical = readbackBody();
  for (const body of [
    { matter_id: MATTER, ...canonical.current_item },
    { ...canonical, item: canonical.current_item },
    { ...canonical, rest_message_id: REST_ID },
    { ...canonical, unknown: "reject" },
  ]) {
    const response = await readback(fixture, body, "request:readback-schema");
    assert.equal(response.status, 200);
    assert.equal(response.body.outcome, "empty");
    assert.deepEqual(response.body.items, []);
  }
});

test("provider mismatch and Matter denial are safe and disclose no counts", async () => {
  const fixture = runtimeFixture();
  const mismatch = await readback(fixture, readbackBody({ internet_message_id: "<wrong@amic.law>" }), "request:readback-mismatch");
  assert.equal(mismatch.status, 200);
  assert.equal(mismatch.body.outcome, "empty");
  assert.deepEqual(mismatch.body.items, []);
  assert.equal("denied_count" in mismatch.body, false);

  const denied = await readback({
    ...fixture,
    context: { ...fixture.context, rules: [{ id: "deny-all", effect: "deny", action: "*" }] },
  }, readbackBody(), "request:readback-denied");
  assert.equal(denied.status, 403);
  assert.equal(denied.body.outcome, "denied");
  assert.equal("denied_count" in denied.body, false);
  assert.deepEqual(denied.body.items ?? null, null);
});

test("document permission denial blocks the documents route and receipt identifiers", async () => {
  const fixture = runtimeFixture();
  const splitPermission = {
    ...fixture.context,
    rules: [
      { id: "matter-read", effect: "allow", action: "outlook:matter:read" },
      { id: "document-deny", effect: "deny", action: "outlook:document:read" },
    ],
  };
  const documents = await handleOutlookAddinApiRequest({
    pathname: `/api/outlook/matters/${MATTER}/documents`,
    method: "GET",
    query: { tenant_id: TENANT },
    requestId: "request:documents-denied",
    context: splitPermission,
    runtime: fixture.runtime,
  });
  assert.equal(documents.status, 403);
  const response = await readback({ ...fixture, context: splitPermission }, readbackBody(), "request:readback-document-denied");
  assert.equal(response.status, 200);
  assert.equal(response.body.outcome, "empty");
  assert.deepEqual(response.body.items, []);
  const bodyJson = JSON.stringify(response.body);
  assert.equal(bodyJson.includes(DOCUMENT_ID), false);
  assert.equal(bodyJson.includes("thread:readback-a"), false);
  assert.equal(bodyJson.includes("timeline:readback-a"), false);
});

test("document object ACL trims only the denied attachment receipt", async () => {
  const fixture = runtimeFixture();
  seedOperationSpecificReceipts(fixture);
  const context = {
    ...fixture.context,
    object_acl: [{
      id: "deny-attachment-document",
      effect: "deny",
      principal_id: fixture.context.principal.user_id,
      resource_id: ATTACH_DOCUMENT_ID,
      action: "outlook:document:read",
    }],
  };
  const documents = await handleOutlookAddinApiRequest({
    pathname: `/api/outlook/matters/${MATTER}/documents`,
    method: "GET",
    query: { tenant_id: TENANT },
    requestId: "request:documents-mixed",
    context,
    runtime: fixture.runtime,
  });
  assert.equal(documents.status, 200);
  assert.deepEqual(documents.body.items.map((entry) => entry.document_id), [DOCUMENT_ID]);
  const response = await readback({ ...fixture, context }, readbackBody(), "request:readback-mixed");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.items.map((entry) => entry.operation), ["file_email", "create_followup"]);
  assert.doesNotMatch(JSON.stringify(response.body), new RegExp(`${ATTACH_DOCUMENT_ID}|${ATTACH_TIMELINE_ID}`, "u"));
  assert.equal("denied_count" in response.body, false);
});
