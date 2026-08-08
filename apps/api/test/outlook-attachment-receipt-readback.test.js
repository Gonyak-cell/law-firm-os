import assert from "node:assert/strict";
import test from "node:test";
import { createDmsRepository } from "../../../packages/dms/src/index.js";
import { createMatterRepository } from "../../../packages/matter/src/index.js";
import { createOutlookAttachmentReceiptAuthority } from "../src/outlook-attachment-receipt-authority.js";
import { readOutlookAttachmentReceiptState } from "../src/outlook-attachment-receipt-readback.js";

const TENANT = "tenant-receipt-readback";
const MATTER = "matter-receipt-readback";
const THREAD = "thread-receipt-readback";
const ATTACHMENT = "attachment-receipt-readback";
const DOCUMENT = "document-receipt-readback";
const VERSION = "version-receipt-readback";
const SHA256 = "a".repeat(64);
const MESSAGE_REF = "message-ref-receipt-readback";
const AUTHORITY = "microsoft_graph_mime";
const SOURCE_IDENTITY = Object.freeze({
  canonical_graph_message_id: "immutable:receipt-readback",
  rest_message_id: "rest:receipt-readback",
  internet_message_id: "<receipt-readback@amic.law>",
  conversation_id: "conversation-receipt-readback",
  item_key: [
    "rest:receipt-readback",
    "<receipt-readback@amic.law>",
    "conversation-receipt-readback",
  ].join("\u001f"),
});

function fixture() {
  const dmsRepository = createDmsRepository();
  const matterRepository = createMatterRepository();
  const mapping = dmsRepository.create({
    model_type: "DmsEmailAttachmentMapping",
    resource_id: `email-attachment:${THREAD}:${ATTACHMENT}`,
    mapping_id: `email-attachment:${THREAD}:${ATTACHMENT}`,
    tenant_id: TENANT,
    matter_id: MATTER,
    email_thread_id: THREAD,
    attachment_id: ATTACHMENT,
    name: "contract.pdf",
    document_id: DOCUMENT,
    version_id: VERSION,
    attachment_outcome: "created",
    sha256: SHA256,
    source_byte_size: 42,
    source_message_ref: MESSAGE_REF,
    source_provenance_authority: AUTHORITY,
    raw_bytes_included: false,
    storage_pointer_ref_included: false,
  });
  const document = dmsRepository.create({
    model_type: "DmsDocument",
    tenant_id: TENANT,
    matter_id: MATTER,
    document_id: DOCUMENT,
    workspace_id: "workspace-receipt-readback",
    title: "contract.pdf",
    status: "active",
    current_version_id: VERSION,
    latest_sha256: SHA256,
    source_email_thread_id: THREAD,
    source_attachment_id: ATTACHMENT,
    permission_envelope_id: "permission-receipt-readback",
    audit_trace_id: "audit-receipt-readback",
  });
  const version = dmsRepository.create({
    model_type: "DmsDocumentVersion",
    tenant_id: TENANT,
    matter_id: MATTER,
    version_id: VERSION,
    document_id: DOCUMENT,
    version_number: 1,
    status: "current",
    file_object_id: "file-object-receipt-readback",
    permission_envelope_id: "permission-receipt-readback",
    audit_trace_id: "audit-receipt-readback",
    sha256: SHA256,
  });
  const timelineEvent = matterRepository.create({
    model_type: "MatterTimelineEvent",
    resource_id: `timeline:${DOCUMENT}`,
    event_id: `timeline:${DOCUMENT}`,
    tenant_id: TENANT,
    matter_id: MATTER,
    occurred_at: "2026-08-08T00:00:00.000Z",
    type: "outlook.attachment.saved",
    title: "contract.pdf",
    source_ref: DOCUMENT,
    source_object_id: DOCUMENT,
    safe_summary: {
      email_thread_id: THREAD,
      ...SOURCE_IDENTITY,
      attachment_id: ATTACHMENT,
      document_id: DOCUMENT,
      version_id: VERSION,
      sha256: SHA256,
      byte_size: 42,
      source_message_ref: MESSAGE_REF,
      source_provenance_authority: AUTHORITY,
    },
  });
  matterRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: `outlook-attachment:${THREAD}:${ATTACHMENT}:${SHA256}:matter:${MATTER}`,
    operation: "outlook_matter_timeline_append",
    response: { timeline_event_id: timelineEvent.event_id },
  });
  const thread = dmsRepository.create({
    model_type: "DmsEmailThread",
    tenant_id: TENANT,
    matter_id: MATTER,
    email_thread_id: THREAD,
    subject: "Receipt readback",
    status: "active",
    permission_envelope_id: "permission-receipt-readback",
    audit_trace_id: "audit-receipt-readback",
    ...SOURCE_IDENTITY,
    attachment_metadata: [{
      attachment_id: ATTACHMENT,
      name: "contract.pdf",
      source_provenance: {
        sha256: SHA256,
        byte_size: 42,
        message_ref: MESSAGE_REF,
        authority: AUTHORITY,
      },
    }],
  });
  return {
    dmsRepository,
    matterRepository,
    mapping,
    document,
    version,
    timelineEvent,
    thread,
  };
}

function mutatePersistedThread(state, overrides) {
  state.dmsRepository.delete({
    tenant_id: state.thread.tenant_id,
    model_type: "DmsEmailThread",
    email_thread_id: state.thread.email_thread_id,
  });
  state.thread = state.dmsRepository.create({ ...state.thread, ...overrides });
}

async function read(state, issueCount) {
  const receiptAuthority = createOutlookAttachmentReceiptAuthority({
    secret: "outlook-attachment-readback-test-secret-v1",
  });
  return readOutlookAttachmentReceiptState({
    dmsRuntime: { repository: state.dmsRepository },
    matterRuntime: { repository: state.matterRepository },
    authority: {
      verify: receiptAuthority.verify,
      issue(input) {
        issueCount.value += 1;
        return receiptAuthority.issue(input);
      },
    },
    thread: state.thread,
    tenantId: TENANT,
    matterId: MATTER,
  });
}

test("authoritative attachment readback signs one fully bound persisted receipt", async () => {
  const valid = fixture();
  const validIssues = { value: 0 };
  const accepted = await read(valid, validIssues);
  assert.equal(validIssues.value, 1);
  assert.equal(accepted.receipts.length, 1);
  assert.deepEqual(accepted.retry_attachment_ids, []);
});

test("cross-document persisted version produces zero attachment receipts", async () => {
  const crossDocument = fixture();
  crossDocument.dmsRepository.upsert({
    ...crossDocument.version,
    document_id: "document-cross-boundary",
  });
  const crossDocumentIssues = { value: 0 };
  await assert.rejects(read(crossDocument, crossDocumentIssues), /incomplete or mismatched/u);
  assert.equal(crossDocumentIssues.value, 0);
});

test("a later corrupt mapping prevents signing an earlier valid mapping", async () => {
  const partial = fixture();
  partial.dmsRepository.create({
    model_type: "DmsEmailAttachmentMapping",
    resource_id: `email-attachment:${THREAD}:zz-corrupt`,
    mapping_id: `email-attachment:${THREAD}:zz-corrupt`,
    tenant_id: TENANT,
    matter_id: MATTER,
    email_thread_id: THREAD,
    attachment_id: "zz-corrupt",
    name: "corrupt.pdf",
    document_id: "document-missing",
    version_id: "version-missing",
    attachment_outcome: "created",
    sha256: SHA256,
    source_byte_size: 42,
    source_message_ref: MESSAGE_REF,
    source_provenance_authority: AUTHORITY,
  });
  mutatePersistedThread(partial, {
    attachment_metadata: [
      ...partial.thread.attachment_metadata,
      {
        attachment_id: "zz-corrupt",
        name: "corrupt.pdf",
        source_provenance: {
          sha256: SHA256,
          byte_size: 42,
          message_ref: MESSAGE_REF,
          authority: AUTHORITY,
        },
      },
    ],
  });
  const issues = { value: 0 };
  await assert.rejects(read(partial, issues), /incomplete or mismatched/u);
  assert.equal(issues.value, 0);
});

test("persisted version from another Matter produces zero attachment receipts", async () => {
  const wrongMatter = fixture();
  wrongMatter.dmsRepository.upsert({ ...wrongMatter.version, matter_id: "matter-other" });
  const issues = { value: 0 };
  await assert.rejects(read(wrongMatter, issues), /incomplete or mismatched/u);
  assert.equal(issues.value, 0);
});

test("persisted document SHA different from its mapping and version produces zero receipts", async () => {
  const wrongSha = fixture();
  wrongSha.dmsRepository.upsert({ ...wrongSha.document, latest_sha256: "b".repeat(64) });
  const issues = { value: 0 };
  await assert.rejects(read(wrongSha, issues), /incomplete or mismatched/u);
  assert.equal(issues.value, 0);
});

test("thread from another tenant produces zero attachment receipts", async () => {
  const wrongTenant = fixture();
  mutatePersistedThread(wrongTenant, { tenant_id: "tenant-other" });
  const issues = { value: 0 };
  await assert.rejects(read(wrongTenant, issues), /thread context/u);
  assert.equal(issues.value, 0);
});

test("thread from another Matter produces zero attachment receipts", async () => {
  const wrongMatter = fixture();
  mutatePersistedThread(wrongMatter, { matter_id: "matter-other" });
  const issues = { value: 0 };
  await assert.rejects(read(wrongMatter, issues), /thread context/u);
  assert.equal(issues.value, 0);
});

test("inactive thread produces zero attachment receipts", async () => {
  const inactive = fixture();
  mutatePersistedThread(inactive, { status: "draft" });
  const issues = { value: 0 };
  await assert.rejects(read(inactive, issues), /thread context/u);
  assert.equal(issues.value, 0);
});

test("revoked thread produces zero attachment receipts", async () => {
  const revoked = fixture();
  revoked.thread = {
    ...revoked.thread,
    revoked_at: "2026-08-08T00:00:00.000Z",
  };
  const issues = { value: 0 };
  await assert.rejects(read(revoked, issues), /thread context/u);
  assert.equal(issues.value, 0);
});

test("timeline with a different version binding returns retry and zero receipts", async () => {
  const wrongTimeline = fixture();
  wrongTimeline.matterRepository.upsert({
    ...wrongTimeline.timelineEvent,
    safe_summary: { ...wrongTimeline.timelineEvent.safe_summary, version_id: "version-other" },
  });
  const wrongTimelineIssues = { value: 0 };
  const rejected = await read(wrongTimeline, wrongTimelineIssues);
  assert.equal(wrongTimelineIssues.value, 0);
  assert.deepEqual(rejected.receipts, []);
  assert.deepEqual(rejected.retry_attachment_ids, [ATTACHMENT]);
});

test("timeline with a different exact Outlook source tuple returns retry and zero receipts", async () => {
  const wrongTimeline = fixture();
  wrongTimeline.matterRepository.upsert({
    ...wrongTimeline.timelineEvent,
    safe_summary: {
      ...wrongTimeline.timelineEvent.safe_summary,
      canonical_graph_message_id: "immutable:other",
    },
  });
  const issues = { value: 0 };
  const rejected = await read(wrongTimeline, issues);
  assert.equal(issues.value, 0);
  assert.deepEqual(rejected.receipts, []);
  assert.deepEqual(rejected.retry_attachment_ids, [ATTACHMENT]);
});
