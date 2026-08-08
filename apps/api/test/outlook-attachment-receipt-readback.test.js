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
  return {
    dmsRepository,
    matterRepository,
    mapping,
    document,
    version,
    timelineEvent,
    thread: {
      email_thread_id: THREAD,
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
    },
  };
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

test("authoritative attachment receipt requires exact persisted version and timeline provenance", async () => {
  const valid = fixture();
  const validIssues = { value: 0 };
  const accepted = await read(valid, validIssues);
  assert.equal(validIssues.value, 1);
  assert.equal(accepted.receipts.length, 1);
  assert.deepEqual(accepted.retry_attachment_ids, []);

  const crossDocument = fixture();
  crossDocument.dmsRepository.upsert({
    ...crossDocument.version,
    document_id: "document-cross-boundary",
  });
  const crossDocumentIssues = { value: 0 };
  await assert.rejects(read(crossDocument, crossDocumentIssues), /incomplete or mismatched/u);
  assert.equal(crossDocumentIssues.value, 0);

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
