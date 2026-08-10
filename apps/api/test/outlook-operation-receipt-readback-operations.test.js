import assert from "node:assert/strict";
import test from "node:test";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";
import {
  ATTACH_DOCUMENT_ID,
  ATTACH_TIMELINE_ID,
  CONVERSATION_ID,
  CANONICAL_ID,
  DOCUMENT_ID,
  INTERNET_ID,
  MATTER,
  REST_ID,
  TENANT,
  THREAD_ID,
  TASK_TIMELINE_ID,
  runtimeFixture,
} from "./outlook-operation-receipt-readback-fixture.js";
import { seedOperationSpecificReceipts } from "./outlook-operation-receipt-readback-operations.js";

function readbackBody() {
  return {
    matter_id: MATTER,
    current_item: {
      rest_message_id: REST_ID,
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

function replaceThread(fixture, overrides) {
  const thread = fixture.dmsRepository.get({
    tenant_id: TENANT,
    model_type: "DmsEmailThread",
    email_thread_id: THREAD_ID,
  });
  fixture.dmsRepository.delete({
    tenant_id: TENANT,
    model_type: "DmsEmailThread",
    email_thread_id: THREAD_ID,
  });
  fixture.dmsRepository.create({ ...thread, ...overrides });
}

function operations(response) {
  return response.body.items.map((entry) => entry.operation);
}

test("readback reconstructs file, attachment, and follow-up operations from durable chains", async () => {
  const fixture = runtimeFixture();
  seedOperationSpecificReceipts(fixture);
  const response = await readback(fixture, "request:readback-operations");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.items.map((entry) => entry.operation), [
    "file_email",
    "save_attachments",
    "create_followup",
  ]);
  const attachment = response.body.items.find((entry) => entry.operation === "save_attachments");
  assert.deepEqual(attachment.document_ids, [ATTACH_DOCUMENT_ID]);
  assert.deepEqual(attachment.timeline_event_ids, [ATTACH_TIMELINE_ID]);
  const followup = response.body.items.find((entry) => entry.operation === "create_followup");
  assert.deepEqual(followup.timeline_event_ids, [TASK_TIMELINE_ID]);
  assert.equal(followup.email_thread_id, "thread:readback-a");
});

test("incomplete legacy attachment chain cannot remount save_attachments", async () => {
  const fixture = runtimeFixture();
  seedOperationSpecificReceipts(fixture);
  replaceThread(fixture, { rest_message_id: null, item_key: null });
  const response = await readback(fixture, "request:readback-legacy-attachment");
  assert.equal(response.status, 200);
  assert.deepEqual(operations(response), ["file_email", "create_followup"]);
});

test("wrong persisted REST identity cannot remount save_attachments", async () => {
  const fixture = runtimeFixture();
  seedOperationSpecificReceipts(fixture);
  const wrongRest = "rest-readback-wrong";
  replaceThread(fixture, {
    rest_message_id: wrongRest,
    item_key: [wrongRest, INTERNET_ID, CONVERSATION_ID].join("\u001f"),
  });
  const response = await readback(fixture, "request:readback-wrong-rest");
  assert.equal(response.status, 200);
  assert.deepEqual(operations(response), ["file_email", "create_followup"]);
});

test("wrong persisted item_key cannot remount save_attachments", async () => {
  const fixture = runtimeFixture();
  seedOperationSpecificReceipts(fixture);
  replaceThread(fixture, {
    item_key: ["rest-readback-wrong", INTERNET_ID, CONVERSATION_ID].join("\u001f"),
  });
  const response = await readback(fixture, "request:readback-wrong-item-key");
  assert.equal(response.status, 200);
  assert.deepEqual(operations(response), ["file_email", "create_followup"]);
});

test("readback uses the production DMS authority adapter and fails safe on Matter mismatch", async () => {
  const fixture = runtimeFixture();
  seedOperationSpecificReceipts(fixture);
  const authorityStates = new Map(
    [DOCUMENT_ID, ATTACH_DOCUMENT_ID].map((documentId) => {
      const localDocument = fixture.dmsRepository.get({ tenant_id: fixture.context.principal.tenant_id, model_type: "DmsDocument", document_id: documentId });
      const localVersion = fixture.dmsRepository.get({ tenant_id: fixture.context.principal.tenant_id, model_type: "DmsDocumentVersion", version_id: localDocument.current_version_id });
      const localFileObject = fixture.dmsRepository.get({ tenant_id: fixture.context.principal.tenant_id, model_type: "DmsFileObject", file_object_id: localVersion.file_object_id });
      const document = localDocument;
      const { matter_id: _versionMatter, status: _versionStatus, persisted: _persisted, ...version } = localVersion;
      const { matter_id: _fileMatter, ...fileObject } = localFileObject;
      return [documentId, {
        document,
        versions: [version],
        file_objects: [fileObject],
        provider_integrity: {
          object_id: fileObject.object_id,
          sha256: fileObject.sha256,
          byte_size: Number(fileObject.byte_size),
          mime_type: fileObject.mime_type,
        },
        audit_events: [{ event_id: `audit:production:${documentId}`, event_type: "dms.document.metadata_committed", object_type: "DmsDocument", object_id: documentId }],
      }];
    }),
  );
  fixture.runtime.dmsRuntime.upload_runtime = {
    async getDocumentState({ tenant_id: tenantId, document_id: documentId }) {
      return tenantId === fixture.context.principal.tenant_id ? authorityStates.get(documentId) ?? null : null;
    },
    async getDocumentIntegrityState({ tenant_id: tenantId, document_id: documentId }) {
      return tenantId === fixture.context.principal.tenant_id ? authorityStates.get(documentId) ?? null : null;
    },
  };
  for (const documentId of [DOCUMENT_ID, ATTACH_DOCUMENT_ID]) {
    fixture.dmsRepository.update(
      { tenant_id: fixture.context.principal.tenant_id, model_type: "DmsDocument", document_id: documentId },
      { status: "archived", source_email_thread_id: "thread:untrusted-local-copy" },
    );
  }
  const response = await readback(fixture, "request:readback-authority");
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.items.map((entry) => entry.operation), [
    "file_email",
    "save_attachments",
    "create_followup",
  ]);
  authorityStates.set(DOCUMENT_ID, {
    ...authorityStates.get(DOCUMENT_ID),
    document: { ...authorityStates.get(DOCUMENT_ID).document, matter_id: "matter:other" },
  });
  const mismatched = await readback(fixture, "request:readback-authority-mismatch");
  assert.equal(mismatched.body.outcome, "empty");
  assert.deepEqual(mismatched.body.items, []);
});

test("readback omits incomplete document, SHA, and timeline chains", async () => {
  for (const mutate of [
    (fixture) => fixture.dmsRepository.delete({ tenant_id: fixture.context.principal.tenant_id, model_type: "DmsDocument", document_id: DOCUMENT_ID }),
    (fixture) => fixture.matterRepository.delete({ tenant_id: fixture.context.principal.tenant_id, model_type: "MatterTimelineEvent", resource_id: "timeline:readback-a" }),
    (fixture) => fixture.dmsRepository.update({ tenant_id: fixture.context.principal.tenant_id, model_type: "DmsDocument", document_id: DOCUMENT_ID }, { source_email_thread_id: "thread:other" }),
    (fixture) => fixture.dmsRepository.update({ tenant_id: fixture.context.principal.tenant_id, model_type: "DmsDocument", document_id: DOCUMENT_ID }, { latest_sha256: "c".repeat(64) }),
    (fixture) => fixture.matterRepository.update({ tenant_id: fixture.context.principal.tenant_id, model_type: "MatterTimelineEvent", resource_id: "timeline:readback-a" }, { source_ref: "thread:other", source_object_id: "thread:other" }),
  ]) {
    const fixture = runtimeFixture();
    mutate(fixture);
    const response = await readback(fixture, "request:readback-incomplete");
    assert.equal(response.body.outcome, "empty");
    assert.deepEqual(response.body.items, []);
  }
});
