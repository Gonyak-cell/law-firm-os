import {
  ACTOR,
  ATTACH_DOCUMENT_ID,
  ATTACHMENT_ID,
  ATTACH_BYTE_SIZE,
  ATTACH_MESSAGE_REF,
  ATTACH_PROVENANCE_AUTHORITY,
  ATTACH_SHA256,
  ATTACH_TIMELINE_ID,
  CANONICAL_ID,
  CONVERSATION_ID,
  INTERNET_ID,
  ITEM_KEY,
  MATTER,
  REST_ID,
  TENANT,
  THREAD_ID,
  TASK_ID,
  TASK_TIMELINE_ID,
} from "./outlook-operation-receipt-readback-fixture.js";

const ATTACH_VERSION_ID = "version:readback-attachment-a";
const ATTACH_FILE_OBJECT_ID = "file:readback-attachment-a";
const ATTACH_MAPPING_ID = "email-attachment:readback-a";

export function seedOperationSpecificReceipts({ matterRepository, dmsRepository }) {
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
    object_id: "object:readback-attachment-a",
    sha256: ATTACH_SHA256,
    byte_size: ATTACH_BYTE_SIZE,
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
    name: "attachment.pdf",
    document_id: ATTACH_DOCUMENT_ID,
    version_id: ATTACH_VERSION_ID,
    attachment_outcome: "created",
    sha256: ATTACH_SHA256,
    source_byte_size: ATTACH_BYTE_SIZE,
    source_message_ref: ATTACH_MESSAGE_REF,
    source_provenance_authority: ATTACH_PROVENANCE_AUTHORITY,
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
    safe_summary: {
      email_thread_id: THREAD_ID,
      canonical_graph_message_id: CANONICAL_ID,
      rest_message_id: REST_ID,
      internet_message_id: INTERNET_ID,
      conversation_id: CONVERSATION_ID,
      item_key: ITEM_KEY,
      attachment_id: ATTACHMENT_ID,
      document_id: ATTACH_DOCUMENT_ID,
      version_id: ATTACH_VERSION_ID,
      sha256: ATTACH_SHA256,
      byte_size: ATTACH_BYTE_SIZE,
      source_message_ref: ATTACH_MESSAGE_REF,
      source_provenance_authority: ATTACH_PROVENANCE_AUTHORITY,
    },
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
