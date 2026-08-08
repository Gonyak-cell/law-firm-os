import assert from "node:assert/strict";
import test from "node:test";
import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { createDmsRepository } from "../../../packages/dms/src/index.js";
import { createMatterRepository } from "../../../packages/matter/src/index.js";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";

const TENANT = "tenant_receipt_readback_test";
const MATTER = "matter_receipt_readback_test";
const ACTOR = "user_receipt_readback_test";
const ENTRA = "entra_receipt_readback_test";
const MAILBOX = "readback@amic.kr";
const REST_ID = "rest-readback-a";
const CANONICAL_ID = "immutable:readback-a";
const INTERNET_ID = "<readback-a@amic.law>";
const CONVERSATION_ID = "conversation-readback-a";
const THREAD_ID = "thread:readback-a";
const DOCUMENT_ID = "document:readback-a";
const VERSION_ID = "version:readback-a";
const FILE_OBJECT_ID = "file:readback-a";
const MIME_SHA256 = "a".repeat(64);
const TIMELINE_ID = "timeline:readback-a";
const FILE_KEY = `outlook-email-file:${THREAD_ID}:${MIME_SHA256}`;
const ATTACHMENT_ID = "attachment:readback-a";
const ATTACH_DOCUMENT_ID = "document:readback-attachment-a";
const ATTACH_VERSION_ID = "version:readback-attachment-a";
const ATTACH_FILE_OBJECT_ID = "file:readback-attachment-a";
const ATTACH_SHA256 = "b".repeat(64);
const ATTACH_MAPPING_ID = "email-attachment:readback-a";
const ATTACH_TIMELINE_ID = "outlook.attachment.saved:readback-a";
const TASK_ID = "task:readback-a";
const TASK_TIMELINE_ID = "matter.timeline.activity:readback-a";

function runtimeFixture() {
  const matterRepository = createMatterRepository({ seedRecords: [{
    model_type: "Matter",
    tenant_id: TENANT,
    matter_id: MATTER,
    status: "open",
    title: "Readback Matter",
    client_id: "client:readback",
    created_by: ACTOR,
    created_at: "2026-08-08T00:00:00.000Z",
    permission_envelope_id: "permission:readback",
    audit_trace_id: "audit:readback",
  }, {
    model_type: "MatterTimelineEvent",
    tenant_id: TENANT,
    matter_id: MATTER,
    event_id: TIMELINE_ID,
    resource_id: TIMELINE_ID,
    occurred_at: "2026-08-08T00:00:00.000Z",
    type: "outlook.email.filed",
    title: "redacted title",
    source_ref: THREAD_ID,
    source_object_id: THREAD_ID,
    safe_summary: {
      filed_document_ids: [DOCUMENT_ID],
      original_mime_document_id: DOCUMENT_ID,
    },
  }] });
  const dmsRepository = createDmsRepository({ seedRecords: [{
    model_type: "DmsEmailThread",
    tenant_id: TENANT,
    matter_id: MATTER,
    email_thread_id: THREAD_ID,
    graph_message_id: CANONICAL_ID,
    internet_message_id: INTERNET_ID,
    conversation_id: CONVERSATION_ID,
    status: "active",
    filing_time: "2026-08-08T00:00:00.000Z",
    filed_document_ids: [DOCUMENT_ID],
    filing_mode: "manual",
    permission_envelope_id: "permission:readback",
    audit_trace_id: "audit:readback",
    subject: "never returned subject",
    body_preview: "never returned body",
  }, {
    model_type: "DmsDocument",
    tenant_id: TENANT,
    matter_id: MATTER,
    document_id: DOCUMENT_ID,
    title: "never returned document title",
    workspace_id: "workspace:readback",
    status: "active",
    source_email_thread_id: THREAD_ID,
    current_version_id: "version:readback-a",
    latest_sha256: MIME_SHA256,
    source_email_thread_id: THREAD_ID,
    permission_envelope_id: "permission:readback",
    audit_trace_id: "audit:readback",
  }, {
    model_type: "DmsDocumentVersion",
    tenant_id: TENANT,
    matter_id: MATTER,
    version_id: VERSION_ID,
    document_id: DOCUMENT_ID,
    version_number: 1,
    status: "current",
    file_object_id: FILE_OBJECT_ID,
    sha256: MIME_SHA256,
    persisted: true,
    permission_envelope_id: "permission:readback",
    audit_trace_id: "audit:readback",
  }, {
    model_type: "DmsFileObject",
    tenant_id: TENANT,
    matter_id: MATTER,
    file_object_id: FILE_OBJECT_ID,
    sha256: MIME_SHA256,
    byte_size: 1,
    mime_type: "message/rfc822",
    storage_pointer_ref: "object:readback-a",
    status: "committed",
    permission_envelope_id: "permission:readback",
    audit_trace_id: "audit:readback",
  }] });
  const emailDmsRepository = createEmailDmsRepository({ seedRecords: [{
    model_type: "M365Connection",
    m365_connection_id: m365ConnectionId({ tenant_id: TENANT, user_id: ACTOR }),
    tenant_id: TENANT,
    user_id: ACTOR,
    entra_subject_id: ENTRA,
    mailbox_address_hash: hashMailboxAddress(MAILBOX),
    credential_ref: "aws-secrets-manager:synthetic/readback-test",
    granted_scopes: [...M365_GRAPH_REQUIRED_SCOPES],
    consented_at: "2026-08-07T00:00:00.000Z",
    expires_at: "2026-08-09T00:00:00.000Z",
    revoked_at: null,
    state_version: 1,
  }] });
  const context = {
    principal: {
      tenant_id: TENANT,
      user_id: ACTOR,
      actor_id: ACTOR,
      entra_subject_id: ENTRA,
      scopes: ["matter.read"],
    },
    rules: [{ id: "readback-allow", effect: "allow", action: "*" }],
    object_acl: [],
  };
  const runtime = {
    matterRuntime: { repository: matterRepository },
    dmsRuntime: { repository: dmsRepository },
    emailDmsRuntime: { repository: emailDmsRepository },
    m365GraphConfig: {
      feature_enabled: true,
      inquiry_feature_enabled: true,
      provider_runtime_enabled: true,
      credential_vault: {
        async resolveDelegatedCredential() {
          return {
            access_token: "never-return-token",
            refresh_token: "never-return-refresh",
            mailbox_address: MAILBOX,
            refresh_profile: "client",
            refresh_profile_proof: "r".repeat(43),
            expires_at: "2026-08-09T00:00:00.000Z",
          };
        },
        async storeDelegatedCredential() { return "aws-secrets-manager:synthetic/readback-next"; },
        async deleteDelegatedCredential() {},
        referenceForGeneration() { return "aws-secrets-manager:synthetic/readback-next"; },
      },
      provider: {
        async getMeMessageMime() {
          return {
            mime_bytes: Buffer.from("MIME bytes never returned"),
            immutable_message_id: CANONICAL_ID,
            internet_message_id: INTERNET_ID,
            message_metadata: {
              conversation_id: CONVERSATION_ID,
              internet_message_id: INTERNET_ID,
              subject: "provider subject never returned",
            },
          };
        },
      },
    },
  };
  dmsRepository.appendAudit({
    event_id: `dms.document.upload:${DOCUMENT_ID}`,
    tenant_id: TENANT,
    actor_id: ACTOR,
    action: "dms.document.upload",
    object_type: "DmsDocument",
    object_id: DOCUMENT_ID,
    decision: "allow",
  });
  dmsRepository.appendAudit({
    event_id: `outlook.email.file:${TENANT}:${THREAD_ID}`,
    tenant_id: TENANT,
    actor_id: ACTOR,
    action: "dms.email.thread.file",
    object_type: "DmsEmailThread",
    object_id: THREAD_ID,
    decision: "allow",
    reason: "email_thread_filed_to_matter",
  });
  dmsRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: `outlook-original-mime:${THREAD_ID}:${MIME_SHA256}`,
    operation: "dms_document_upload",
    response: { document: { document_id: DOCUMENT_ID } },
  });
  dmsRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: `${FILE_KEY}:dms`,
    operation: "outlook_email_file",
    response: { email_thread_id: THREAD_ID, matter_id: MATTER },
  });
  fixtureMatterTimelineAuthority(matterRepository);
  return { context, runtime, matterRepository, dmsRepository };
}

function fixtureMatterTimelineAuthority(repository) {
  repository.appendAudit({
    event_id: `outlook.matter.timeline:${TIMELINE_ID}`,
    tenant_id: TENANT,
    actor_id: ACTOR,
    action: "matter.timeline.outlook.file",
    object_type: "MatterTimelineEvent",
    object_id: TIMELINE_ID,
    decision: "allow",
  });
  repository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: `${FILE_KEY}:matter:${MATTER}`,
    operation: "outlook_matter_timeline_append",
    response: { timeline_event_id: TIMELINE_ID, matter_id: MATTER },
  });
}

function seedOperationSpecificReceipts({ matterRepository, dmsRepository }) {
  dmsRepository.create({
    model_type: "DmsDocument",
    tenant_id: TENANT,
    matter_id: MATTER,
    document_id: ATTACH_DOCUMENT_ID,
    workspace_id: "workspace:readback",
    folder_id: "folder:readback:00_Email",
    title: "attachment.pdf",
    status: "active",
    current_version_id: ATTACH_VERSION_ID,
    latest_sha256: ATTACH_SHA256,
    source_email_thread_id: THREAD_ID,
    source_attachment_id: ATTACHMENT_ID,
    permission_envelope_id: "permission:readback",
    audit_trace_id: "audit:readback",
  });
  dmsRepository.create({
    model_type: "DmsDocumentVersion",
    tenant_id: TENANT,
    matter_id: MATTER,
    version_id: ATTACH_VERSION_ID,
    document_id: ATTACH_DOCUMENT_ID,
    version_number: 1,
    status: "current",
    file_object_id: ATTACH_FILE_OBJECT_ID,
    sha256: ATTACH_SHA256,
    persisted: true,
    permission_envelope_id: "permission:readback",
    audit_trace_id: "audit:readback",
  });
  dmsRepository.create({
    model_type: "DmsFileObject",
    tenant_id: TENANT,
    matter_id: MATTER,
    file_object_id: ATTACH_FILE_OBJECT_ID,
    sha256: ATTACH_SHA256,
    byte_size: 3,
    mime_type: "application/pdf",
    storage_pointer_ref: "object:readback-attachment-a",
    status: "committed",
    permission_envelope_id: "permission:readback",
    audit_trace_id: "audit:readback",
  });
  dmsRepository.create({
    model_type: "DmsEmailAttachmentMapping",
    tenant_id: TENANT,
    matter_id: MATTER,
    resource_id: ATTACH_MAPPING_ID,
    mapping_id: ATTACH_MAPPING_ID,
    email_thread_id: THREAD_ID,
    attachment_id: ATTACHMENT_ID,
    document_id: ATTACH_DOCUMENT_ID,
    sha256: ATTACH_SHA256,
    raw_bytes_included: false,
    storage_pointer_ref_included: false,
  });
  dmsRepository.appendAudit({
    event_id: `dms.document.upload:${ATTACH_DOCUMENT_ID}`,
    tenant_id: TENANT,
    actor_id: ACTOR,
    action: "dms.document.upload",
    object_type: "DmsDocument",
    object_id: ATTACH_DOCUMENT_ID,
    decision: "allow",
  });
  dmsRepository.appendAudit({
    event_id: `outlook.attachment.mapping:${TENANT}:${ATTACH_MAPPING_ID}`,
    tenant_id: TENANT,
    actor_id: ACTOR,
    action: "dms.email.attachment.map",
    object_type: "DmsEmailAttachmentMapping",
    object_id: ATTACH_MAPPING_ID,
    decision: "allow",
  });
  const attachmentKey = `outlook-attachment:${THREAD_ID}:${ATTACHMENT_ID}:${ATTACH_SHA256}`;
  dmsRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: attachmentKey,
    operation: "dms_document_upload",
    response: { document: { document_id: ATTACH_DOCUMENT_ID } },
  });
  dmsRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: `${attachmentKey}:dms-mapping`,
    operation: "outlook_attachment_mapping",
    response: { mapping_id: ATTACH_MAPPING_ID, document_id: ATTACH_DOCUMENT_ID },
  });
  matterRepository.create({
    model_type: "MatterTimelineEvent",
    tenant_id: TENANT,
    matter_id: MATTER,
    event_id: ATTACH_TIMELINE_ID,
    resource_id: ATTACH_TIMELINE_ID,
    occurred_at: "2026-08-08T00:02:00.000Z",
    type: "outlook.attachment.saved",
    title: "attachment.pdf",
    source_ref: ATTACH_DOCUMENT_ID,
    source_object_id: ATTACH_DOCUMENT_ID,
    safe_summary: { email_thread_id: THREAD_ID, sha256: ATTACH_SHA256 },
  });
  matterRepository.appendAudit({
    event_id: `outlook.matter.timeline:${ATTACH_TIMELINE_ID}`,
    tenant_id: TENANT,
    actor_id: ACTOR,
    action: "matter.timeline.outlook.file",
    object_type: "MatterTimelineEvent",
    object_id: ATTACH_TIMELINE_ID,
    decision: "allow",
  });
  matterRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: `${attachmentKey}:matter:${MATTER}`,
    operation: "outlook_matter_timeline_append",
    response: { timeline_event_id: ATTACH_TIMELINE_ID, matter_id: MATTER },
  });
  matterRepository.create({
    model_type: "MatterTask",
    tenant_id: TENANT,
    matter_id: MATTER,
    task_id: TASK_ID,
    resource_id: TASK_ID,
    title: "Review filed message",
    status: "todo",
    created_by: ACTOR,
    source_ref: `DmsEmailThread:${THREAD_ID}`,
  });
  matterRepository.create({
    model_type: "MatterTimelineEvent",
    tenant_id: TENANT,
    matter_id: MATTER,
    event_id: TASK_TIMELINE_ID,
    resource_id: TASK_TIMELINE_ID,
    occurred_at: "2026-08-08T00:03:00.000Z",
    type: "matter.activity.task",
    title: "Review filed message",
    source_ref: `DmsEmailThread:${THREAD_ID}`,
    source_object_id: TASK_ID,
    safe_summary: { activity_type: "task", status: "todo" },
  });
  matterRepository.appendAudit({
    event_id: `matter.activity.created:${TENANT}:${MATTER}:readback-a`,
    tenant_id: TENANT,
    actor_id: ACTOR,
    action: "matter.activity.created",
    object_type: "MatterTask",
    object_id: TASK_ID,
    decision: "allow",
  });
  matterRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: `outlook-followup:${TENANT}:${MATTER}:task:${THREAD_ID}:${TASK_ID}`,
    operation: "outlook_followup_create",
    response: {
      kind: "task",
      source_email_thread_id: THREAD_ID,
      item: { activity_id: TASK_ID },
      audit_event: { event_id: `matter.activity.created:${TENANT}:${MATTER}:readback-a` },
      timeline_event: { event_id: TASK_TIMELINE_ID },
    },
  });
}

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

test("operation receipt readback revalidates identity, returns only durable safe refs, and is read-only", async () => {
  const fixture = runtimeFixture();
  const beforeIdempotency = fixture.dmsRepository.list({ model_type: "DmsEmailThread" }).length;
  const response = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId: "request:readback-a",
    context: fixture.context,
    runtime: fixture.runtime,
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.outcome, "passed");
  assert.equal(response.body.items.length, 1);
  const summary = response.body.items[0];
  assert.deepEqual(Object.keys(summary).sort(), [
    "completed_at",
    "document_ids",
    "email_thread_id",
    "item_context_ref",
    "matter_id",
    "operation",
    "outcome",
    "request_id",
    "timeline_event_ids",
  ]);
  assert.match(summary.item_context_ref, /^item-context:[a-f0-9]{16}$/u);
  assert.deepEqual(summary.document_ids, [DOCUMENT_ID]);
  assert.deepEqual(summary.timeline_event_ids, [TIMELINE_ID]);
  assert.doesNotMatch(JSON.stringify(response.body), /subject|body|participant|MIME|token|storage/u);
  assert.equal(fixture.dmsRepository.list({ model_type: "DmsEmailThread" }).length, beforeIdempotency);
});

test("operation receipt readback reconstructs file, attachment, and follow-up operations from durable chains", async () => {
  const fixture = runtimeFixture();
  seedOperationSpecificReceipts(fixture);
  const response = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId: "request:readback-operations",
    context: fixture.context,
    runtime: fixture.runtime,
  });
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
  assert.equal(followup.email_thread_id, THREAD_ID);
});

test("operation receipt readback uses the production DMS authority adapter for document/version/file state", async () => {
  const fixture = runtimeFixture();
  seedOperationSpecificReceipts(fixture);
  const authorityStates = new Map(
    [DOCUMENT_ID, ATTACH_DOCUMENT_ID].map((documentId) => {
      const localDocument = fixture.dmsRepository.get({ tenant_id: TENANT, model_type: "DmsDocument", document_id: documentId });
      const localVersion = fixture.dmsRepository.get({ tenant_id: TENANT, model_type: "DmsDocumentVersion", version_id: localDocument.current_version_id });
      const localFileObject = fixture.dmsRepository.get({ tenant_id: TENANT, model_type: "DmsFileObject", file_object_id: localVersion.file_object_id });
      const { source_email_thread_id: _sourceThread, source_attachment_id: _sourceAttachment, latest_sha256: _latestSha, ...document } = localDocument;
      const { matter_id: _versionMatter, status: _versionStatus, persisted: _persisted, ...version } = localVersion;
      const { matter_id: _fileMatter, ...fileObject } = localFileObject;
      return [documentId, {
        document,
        versions: [version],
        file_objects: [fileObject],
        audit_events: [{
          event_id: `audit:production:${documentId}`,
          event_type: "dms.document.metadata_committed",
          object_type: "DmsDocument",
          object_id: documentId,
        }],
      }];
    }),
  );
  fixture.runtime.dmsRuntime.upload_runtime = {
    async getDocumentState({ tenant_id: tenantId, document_id: documentId }) {
      return tenantId === TENANT ? authorityStates.get(documentId) ?? null : null;
    },
  };
  for (const documentId of [DOCUMENT_ID, ATTACH_DOCUMENT_ID]) {
    fixture.dmsRepository.update(
      { tenant_id: TENANT, model_type: "DmsDocument", document_id: documentId },
      { status: "archived", source_email_thread_id: "thread:untrusted-local-copy" },
    );
  }
  const response = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId: "request:readback-authority",
    context: fixture.context,
    runtime: fixture.runtime,
  });
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
  const mismatchedAuthority = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId: "request:readback-authority-mismatch",
    context: fixture.context,
    runtime: fixture.runtime,
  });
  assert.equal(mismatchedAuthority.body.outcome, "empty");
  assert.deepEqual(mismatchedAuthority.body.items, []);
});

test("operation receipt readback omits incomplete document or timeline chains", async () => {
  const missingDocument = runtimeFixture();
  missingDocument.dmsRepository.delete({
    tenant_id: TENANT,
    model_type: "DmsDocument",
    document_id: DOCUMENT_ID,
  });
  const noDocument = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId: "request:readback-missing-document",
    context: missingDocument.context,
    runtime: missingDocument.runtime,
  });
  assert.equal(noDocument.body.outcome, "empty");
  assert.deepEqual(noDocument.body.items, []);

  const missingTimeline = runtimeFixture();
  missingTimeline.matterRepository.delete({
    tenant_id: TENANT,
    model_type: "MatterTimelineEvent",
    resource_id: TIMELINE_ID,
  });
  const noTimeline = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId: "request:readback-missing-timeline",
    context: missingTimeline.context,
    runtime: missingTimeline.runtime,
  });
  assert.equal(noTimeline.body.outcome, "empty");
  assert.deepEqual(noTimeline.body.items, []);

  const mismatchedDocument = runtimeFixture();
  mismatchedDocument.dmsRepository.update(
    { tenant_id: TENANT, model_type: "DmsDocument", document_id: DOCUMENT_ID },
    { source_email_thread_id: "thread:other" },
  );
  const noMismatchedDocument = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId: "request:readback-mismatched-document",
    context: mismatchedDocument.context,
    runtime: mismatchedDocument.runtime,
  });
  assert.equal(noMismatchedDocument.body.outcome, "empty");
  assert.deepEqual(noMismatchedDocument.body.items, []);

  const mismatchedSha = runtimeFixture();
  mismatchedSha.dmsRepository.update(
    { tenant_id: TENANT, model_type: "DmsDocument", document_id: DOCUMENT_ID },
    { latest_sha256: "c".repeat(64) },
  );
  const noMismatchedSha = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId: "request:readback-mismatched-sha",
    context: mismatchedSha.context,
    runtime: mismatchedSha.runtime,
  });
  assert.equal(noMismatchedSha.body.outcome, "empty");
  assert.deepEqual(noMismatchedSha.body.items, []);

  const mismatchedTimeline = runtimeFixture();
  mismatchedTimeline.matterRepository.update(
    { tenant_id: TENANT, model_type: "MatterTimelineEvent", resource_id: TIMELINE_ID },
    { source_ref: "thread:other", source_object_id: "thread:other" },
  );
  const noMismatchedTimeline = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId: "request:readback-mismatched-timeline",
    context: mismatchedTimeline.context,
    runtime: mismatchedTimeline.runtime,
  });
  assert.equal(noMismatchedTimeline.body.outcome, "empty");
  assert.deepEqual(noMismatchedTimeline.body.items, []);
});

test("operation receipt readback rejects flat, alias, mixed, and unknown input schemas", async () => {
  const fixture = runtimeFixture();
  for (const body of [
    { matter_id: MATTER, ...readbackBody().current_item },
    { ...readbackBody(), item: readbackBody().current_item },
    { ...readbackBody(), current_item: readbackBody().current_item, rest_message_id: REST_ID },
    { ...readbackBody(), unknown: "reject" },
  ]) {
    const response = await handleOutlookAddinApiRequest({
      pathname: "/api/outlook/operation-receipts/readback",
      method: "POST",
      body,
      requestId: "request:readback-schema",
      context: fixture.context,
      runtime: fixture.runtime,
    });
    assert.equal(response.status, 200);
    assert.equal(response.body.outcome, "empty");
    assert.deepEqual(response.body.items, []);
  }
});

test("operation receipt readback returns safe empty for provider identity mismatch and permission denial", async () => {
  const fixture = runtimeFixture();
  const mismatch = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody({ internet_message_id: "<wrong@amic.law>" }),
    requestId: "request:readback-mismatch",
    context: fixture.context,
    runtime: fixture.runtime,
  });
  assert.equal(mismatch.status, 200);
  assert.equal(mismatch.body.outcome, "empty");
  assert.deepEqual(mismatch.body.items, []);
  assert.equal("denied_count" in mismatch.body, false);

  const denied = await handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: readbackBody(),
    requestId: "request:readback-denied",
    context: { ...fixture.context, rules: [{ id: "deny", effect: "deny", action: "*" }] },
    runtime: fixture.runtime,
  });
  assert.equal(denied.status, 403);
  assert.equal(denied.body.outcome, "denied");
  assert.equal("denied_count" in denied.body, false);
  assert.deepEqual(denied.body.items ?? null, null);
});
