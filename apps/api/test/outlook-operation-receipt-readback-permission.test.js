import assert from "node:assert/strict";
import test from "node:test";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";
import {
  ATTACH_DOCUMENT_ID,
  CANONICAL_ID,
  CONVERSATION_ID,
  DOCUMENT_ID,
  INTERNET_ID,
  MATTER,
  REST_ID,
  TENANT,
  THREAD_ID,
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

test("hosted Vault provider is authoritative for Outlook exact-version document reads", async () => {
  const fixture = runtimeFixture();
  const providerCalls = [];
  const providerDocumentId = "document:hosted-vault";
  const response = await handleOutlookAddinApiRequest({
    pathname: `/api/outlook/matters/${MATTER}/documents`,
    method: "GET",
    query: { tenant_id: TENANT },
    requestId: "request:documents-hosted-vault",
    context: fixture.context,
    runtime: {
      ...fixture.runtime,
      vaultUploadProvider: {
        async listDocuments(input) {
          providerCalls.push(input);
          return {
            items: [{
              document_id: providerDocumentId,
              matter_id: MATTER,
              title: "Hosted Vault document",
              current_version_id: "version:hosted-vault",
              version_id: "version:hosted-vault",
              current_file_object_id: "file:hosted-vault",
              file_object_id: "file:hosted-vault",
              latest_sha256: "d".repeat(64),
              content_sha256: "d".repeat(64),
              current_byte_size: 1_272,
              byte_size: 1_272,
              current_mime_type: "application/pdf",
              mime_type: "application/pdf",
              filename: "hosted-vault.pdf",
              indexed_at: null,
              match_fields: ["title"],
            }],
          };
        },
      },
    },
  });

  assert.equal(response.status, 200);
  assert.deepEqual(providerCalls, [{
    principal: { tenant_id: TENANT, user_id: fixture.context.principal.user_id },
    lawos_matter_id: MATTER,
    page: 1,
    page_size: 50,
  }]);
  assert.deepEqual(response.body.items, [{
    document_id: providerDocumentId,
    matter_id: MATTER,
    title: "Hosted Vault document",
    folder_id: null,
    current_version_id: "version:hosted-vault",
    latest_sha256: "d".repeat(64),
    document_bytes_included: false,
    storage_pointer_ref_included: false,
    production_ready_claim: false,
    exact_version_available: true,
    exact_version: {
      document_id: providerDocumentId,
      version_id: "version:hosted-vault",
      file_object_id: "file:hosted-vault",
      sha256: "d".repeat(64),
      byte_size: 1_272,
      mime_type: "application/pdf",
    },
  }]);
});

test("document authorization precedes provider integrity and remounts only allowed attachments", async () => {
  const fixture = runtimeFixture();
  seedOperationSpecificReceipts(fixture);
  const deniedDocumentId = "document:readback-denied";
  const unknownDocumentId = "document:readback-unknown";
  for (const [attachmentId, documentId] of [
    ["attachment:readback-denied", deniedDocumentId],
    ["attachment:readback-unknown", unknownDocumentId],
  ]) {
    fixture.dmsRepository.create({
      model_type: "DmsEmailAttachmentMapping",
      tenant_id: TENANT,
      matter_id: MATTER,
      resource_id: `email-attachment:${attachmentId}`,
      mapping_id: `email-attachment:${attachmentId}`,
      email_thread_id: THREAD_ID,
      attachment_id: attachmentId,
      name: `${attachmentId}.pdf`,
      document_id: documentId,
      version_id: `version:${attachmentId}`,
      attachment_outcome: "created",
      sha256: "c".repeat(64),
      source_byte_size: 3,
      source_message_ref: `message-ref:${attachmentId}`,
      source_provenance_authority: "microsoft_graph_mime",
      raw_bytes_included: false,
      storage_pointer_ref_included: false,
    });
  }
  const integrityReads = [];
  const integrityAuthority = fixture.runtime.dmsRuntime.upload_runtime;
  fixture.runtime.dmsRuntime.upload_runtime = {
    ...integrityAuthority,
    async getDocumentIntegrityState(input) {
      integrityReads.push(input.document_id);
      return integrityAuthority.getDocumentIntegrityState(input);
    },
  };
  const context = {
    ...fixture.context,
    rules: [{ id: "matter-read", effect: "allow", action: "outlook:matter:read" }],
    object_acl: [MATTER, DOCUMENT_ID, ATTACH_DOCUMENT_ID].map((resourceId) => ({
      id: `allow-${resourceId}`,
      effect: "allow",
      principal_id: fixture.context.principal.user_id,
      resource_id: resourceId,
      action: "outlook:document:read",
    })).concat({
      id: "deny-attachment-document",
      effect: "deny",
      principal_id: fixture.context.principal.user_id,
      resource_id: deniedDocumentId,
      action: "outlook:document:read",
    }),
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
  assert.deepEqual(documents.body.items.map((entry) => entry.document_id), [DOCUMENT_ID, ATTACH_DOCUMENT_ID]);
  const originalMime = documents.body.items.find((entry) => entry.document_id === DOCUMENT_ID);
  assert.equal(originalMime.exact_version_available, true);
  assert.deepEqual(originalMime.exact_version, {
    document_id: DOCUMENT_ID,
    version_id: "version:readback-a",
    file_object_id: "file:readback-a",
    sha256: "a".repeat(64),
    byte_size: 1,
    mime_type: "message/rfc822",
  });
  assert.equal(originalMime.document_bytes_included, false);
  assert.equal(originalMime.storage_pointer_ref_included, false);
  assert.doesNotMatch(
    JSON.stringify(documents.body),
    /"storage_pointer_ref":|object:readback-a|"document_bytes":|"raw_path":/iu,
  );
  const response = await readback({ ...fixture, context }, readbackBody(), "request:readback-mixed");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.items.map((entry) => entry.operation), ["file_email", "save_attachments", "create_followup"]);
  assert.deepEqual(
    response.body.items.find((entry) => entry.operation === "save_attachments").document_ids,
    [ATTACH_DOCUMENT_ID],
  );
  assert.deepEqual(integrityReads, [DOCUMENT_ID, ATTACH_DOCUMENT_ID]);
  assert.doesNotMatch(JSON.stringify(response.body), new RegExp(`${deniedDocumentId}|${unknownDocumentId}`, "u"));
  assert.equal("denied_count" in response.body, false);
});
