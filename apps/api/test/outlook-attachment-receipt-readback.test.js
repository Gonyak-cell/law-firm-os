import assert from "node:assert/strict";
import test from "node:test";
import {
  createDmsRepository,
  createLocalStorageAdapter,
  createPostgresDmsUploadRuntime,
  sha256Hex,
} from "../../../packages/dms/src/index.js";
import { createMatterRepository } from "../../../packages/matter/src/index.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
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
const RECEIPT_SECRET = "outlook-attachment-readback-test-secret-v1";
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

function signedReceipt(state, overrides = {}) {
  return createOutlookAttachmentReceiptAuthority({ secret: RECEIPT_SECRET }).issue({
    ...state.mapping,
    ...SOURCE_IDENTITY,
    ...overrides,
  });
}

async function read(state, issueCount, {
  supplied = [],
  repository = state.dmsRepository,
} = {}) {
  const receiptAuthority = createOutlookAttachmentReceiptAuthority({
    secret: RECEIPT_SECRET,
  });
  return readOutlookAttachmentReceiptState({
    dmsRuntime: { repository },
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
    supplied,
  });
}

test("authoritative attachment readback signs one fully bound persisted receipt", async () => {
  const valid = fixture();
  const validIssues = { value: 0 };
  const accepted = await read(valid, validIssues);
  assert.equal(validIssues.value, 1);
  assert.equal(accepted.receipts.length, 1);
  assert.deepEqual(
    Object.fromEntries(Object.keys(SOURCE_IDENTITY).map((field) => [field, accepted.receipts[0][field]])),
    SOURCE_IDENTITY,
  );
  assert.equal(accepted.receipts[0].source_byte_size, 42);
  assert.equal(accepted.receipts[0].source_message_ref, MESSAGE_REF);
  assert.equal(accepted.receipts[0].source_provenance_authority, AUTHORITY);
  assert.deepEqual(accepted.retry_attachment_ids, []);
});

test("authoritative PostgreSQL source readback signs after a runtime restart", async (t) => {
  const postgres = await createMigratedPostgresFixture(t);
  if (!postgres) return;
  const state = fixture();
  const bytes = Buffer.from("PostgreSQL Outlook receipt readback bytes");
  const sha256 = sha256Hex(bytes);
  state.dmsRepository.upsert({ ...state.mapping, sha256, source_byte_size: bytes.byteLength });
  mutatePersistedThread(state, {
    attachment_metadata: [{
      ...state.thread.attachment_metadata[0],
      source_provenance: {
        ...state.thread.attachment_metadata[0].source_provenance,
        sha256,
        byte_size: bytes.byteLength,
      },
    }],
  });
  state.matterRepository.upsert({
    ...state.timelineEvent,
    safe_summary: {
      ...state.timelineEvent.safe_summary,
      sha256,
      byte_size: bytes.byteLength,
    },
  });
  state.matterRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: `outlook-attachment:${THREAD}:${ATTACHMENT}:${sha256}:matter:${MATTER}`,
    operation: "outlook_matter_timeline_append",
    response: { timeline_event_id: state.timelineEvent.event_id },
  });
  const storage = createLocalStorageAdapter({ adapter_id: "outlook-receipt-postgres" });
  const writer = createPostgresDmsUploadRuntime({ pool: postgres.appPool, storage });
  await writer.uploadDocument({
    document: {
      tenant_id: TENANT,
      matter_id: MATTER,
      workspace_id: "workspace-receipt-readback",
      document_id: DOCUMENT,
      current_version_id: VERSION,
      title: "contract.pdf",
      mime_type: "application/pdf",
      permission_envelope_id: "permission-receipt-readback",
      audit_trace_id: "audit-receipt-readback",
      source_email_thread_id: THREAD,
      source_attachment_id: ATTACHMENT,
    },
    bytes,
    actor_id: "receipt-postgres-test",
    idempotency_key: "outlook-receipt-postgres",
  });
  const reader = createPostgresDmsUploadRuntime({ pool: postgres.appPool, storage });
  const receiptAuthority = createOutlookAttachmentReceiptAuthority({ secret: RECEIPT_SECRET });
  const issues = { value: 0 };
  const accepted = await readOutlookAttachmentReceiptState({
    dmsRuntime: { repository: state.dmsRepository, upload_runtime: reader },
    matterRuntime: { repository: state.matterRepository },
    authority: {
      verify: receiptAuthority.verify,
      issue(input) {
        issues.value += 1;
        return receiptAuthority.issue(input);
      },
    },
    thread: state.thread,
    tenantId: TENANT,
    matterId: MATTER,
  });
  assert.equal(issues.value, 1);
  assert.equal(accepted.receipts[0].document_id, DOCUMENT);
  assert.equal(accepted.receipts[0].sha256, sha256);
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

test("persisted document from another source thread produces zero attachment receipts", async () => {
  const wrongSourceThread = fixture();
  wrongSourceThread.dmsRepository.upsert({
    ...wrongSourceThread.document,
    source_email_thread_id: "thread-other",
  });
  const issues = { value: 0 };
  await assert.rejects(read(wrongSourceThread, issues), /incomplete or mismatched/u);
  assert.equal(issues.value, 0);
});

test("persisted document from another source attachment produces zero attachment receipts", async () => {
  const wrongSourceAttachment = fixture();
  wrongSourceAttachment.dmsRepository.upsert({
    ...wrongSourceAttachment.document,
    source_attachment_id: "attachment-other",
  });
  const issues = { value: 0 };
  await assert.rejects(read(wrongSourceAttachment, issues), /incomplete or mismatched/u);
  assert.equal(issues.value, 0);
});

test("NUL-bearing mapping document ID is rejected before persistence or receipt issuance", async () => {
  const state = fixture();
  const issues = { value: 0 };
  assert.throws(
    () => state.dmsRepository.upsert({ ...state.mapping, document_id: "document\u0000forged" }),
    /persistence rejected/u,
  );
  assert.equal(state.dmsRepository.get({
    tenant_id: TENANT,
    model_type: "DmsEmailAttachmentMapping",
    resource_id: state.mapping.resource_id,
  }).document_id, DOCUMENT);
  const corruptReadRepository = {
    get: (query) => state.dmsRepository.get(query),
    list: (query) => state.dmsRepository.list(query).map((record) => (
      record.resource_id === state.mapping.resource_id
        ? { ...record, document_id: "document\u0000forged" }
        : record
    )),
  };
  await assert.rejects(
    read(state, issues, { repository: corruptReadRepository }),
    /incomplete or mismatched/u,
  );
  assert.equal(issues.value, 0);
});

test("control-bearing persisted mapping document ID produces zero attachment receipts", async () => {
  const state = fixture();
  state.dmsRepository.upsert({ ...state.mapping, document_id: "document\nforged" });
  const issues = { value: 0 };
  await assert.rejects(read(state, issues), /incomplete or mismatched/u);
  assert.equal(issues.value, 0);
});

test("C1 control-bearing persisted mapping document ID produces zero attachment receipts", async () => {
  const state = fixture();
  state.dmsRepository.upsert({ ...state.mapping, document_id: "document\u0085forged" });
  const issues = { value: 0 };
  await assert.rejects(read(state, issues), /incomplete or mismatched/u);
  assert.equal(issues.value, 0);
});

test("padded persisted mapping document ID produces zero attachment receipts", async () => {
  const state = fixture();
  state.dmsRepository.upsert({ ...state.mapping, document_id: " document-padded " });
  const issues = { value: 0 };
  await assert.rejects(read(state, issues), /incomplete or mismatched/u);
  assert.equal(issues.value, 0);
});

test("over-budget persisted mapping document ID produces zero attachment receipts", async () => {
  const state = fixture();
  state.dmsRepository.upsert({ ...state.mapping, document_id: "d".repeat(513) });
  const issues = { value: 0 };
  await assert.rejects(read(state, issues), /incomplete or mismatched/u);
  assert.equal(issues.value, 0);
});

test("forged supplied receipt fails authentication before any attachment receipt is issued", async () => {
  const state = fixture();
  const receipt = signedReceipt(state);
  const issues = { value: 0 };
  await assert.rejects(
    read(state, issues, {
      supplied: [{ receipt_ref: receipt.receipt_ref, receipt_token: `${receipt.receipt_token}A` }],
    }),
    /signature or context/u,
  );
  assert.equal(issues.value, 0);
});

test("same-context stale source identity receipt is rejected before any receipt is issued", async () => {
  const state = fixture();
  const receipt = signedReceipt(state, { canonical_graph_message_id: "immutable:stale" });
  const issues = { value: 0 };
  await assert.rejects(read(state, issues, { supplied: [receipt] }), /signature or context/u);
  assert.equal(issues.value, 0);
});

test("same-context stale document receipt is rejected before any receipt is issued", async () => {
  const state = fixture();
  const receipt = signedReceipt(state, { document_id: "document-stale" });
  const issues = { value: 0 };
  await assert.rejects(read(state, issues, { supplied: [receipt] }), /no matching persisted readback/u);
  assert.equal(issues.value, 0);
});

test("same-context stale version receipt is rejected before any receipt is issued", async () => {
  const state = fixture();
  const receipt = signedReceipt(state, { version_id: "version-stale" });
  const issues = { value: 0 };
  await assert.rejects(read(state, issues, { supplied: [receipt] }), /no matching persisted readback/u);
  assert.equal(issues.value, 0);
});

test("same-context stale SHA receipt is rejected before any receipt is issued", async () => {
  const state = fixture();
  const receipt = signedReceipt(state, { sha256: "b".repeat(64) });
  const issues = { value: 0 };
  await assert.rejects(read(state, issues, { supplied: [receipt] }), /no matching persisted readback/u);
  assert.equal(issues.value, 0);
});

test("same-context stale byte-size receipt is rejected before any receipt is issued", async () => {
  const state = fixture();
  const receipt = signedReceipt(state, { source_byte_size: 43 });
  const issues = { value: 0 };
  await assert.rejects(read(state, issues, { supplied: [receipt] }), /no matching persisted readback/u);
  assert.equal(issues.value, 0);
});

test("same-context stale provenance-authority receipt is rejected before any receipt is issued", async () => {
  const state = fixture();
  const receipt = signedReceipt(state, { source_provenance_authority: "stale_authority" });
  const issues = { value: 0 };
  await assert.rejects(read(state, issues, { supplied: [receipt] }), /no matching persisted readback/u);
  assert.equal(issues.value, 0);
});

test("same-context stale source-message receipt is rejected before any receipt is issued", async () => {
  const state = fixture();
  const receipt = signedReceipt(state, { source_message_ref: "message-ref-stale" });
  const issues = { value: 0 };
  await assert.rejects(read(state, issues, { supplied: [receipt] }), /no matching persisted readback/u);
  assert.equal(issues.value, 0);
});

test("fully bound supplied receipt is authenticated before one current receipt is issued", async () => {
  const state = fixture();
  const receipt = signedReceipt(state);
  const issues = { value: 0 };
  const accepted = await read(state, issues, { supplied: [receipt] });
  assert.equal(issues.value, 1);
  assert.equal(accepted.receipts[0].receipt_token, receipt.receipt_token);
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
