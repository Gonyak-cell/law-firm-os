import {
  M365_GRAPH_REQUIRED_SCOPES,
  hashMailboxAddress,
  m365ConnectionId,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { createDmsRepository } from "../../../packages/dms/src/index.js";
import { createMatterRepository } from "../../../packages/matter/src/index.js";
import { outlookEmailFileRequestFingerprint } from "../../../packages/email-dms/src/email-filing-service.js";

export const TENANT = "tenant_receipt_readback_test";
export const MATTER = "matter_receipt_readback_test";
export const ACTOR = "user_receipt_readback_test";
const ENTRA = "entra_receipt_readback_test";
const MAILBOX = "readback@amic.kr";
export const REST_ID = "rest-readback-a";
export const CANONICAL_ID = "immutable:readback-a";
export const INTERNET_ID = "<readback-a@amic.law>";
export const CONVERSATION_ID = "conversation-readback-a";
export const THREAD_ID = "thread:readback-a";
export const MIME_SHA256 = "a".repeat(64);
export const DOCUMENT_ID = `doc:${THREAD_ID}:original-mime:${MIME_SHA256}`;
const VERSION_ID = "version:readback-a";
const FILE_OBJECT_ID = "file:readback-a";
export const TIMELINE_ID = "timeline:readback-a";
export const FILE_KEY = `outlook-email-file:${THREAD_ID}:${MIME_SHA256}`;
export const ATTACHMENT_ID = "attachment:readback-a";
export const ATTACH_DOCUMENT_ID = "document:readback-attachment-a";
const ATTACH_VERSION_ID = "version:readback-attachment-a";
const ATTACH_FILE_OBJECT_ID = "file:readback-attachment-a";
export const ATTACH_SHA256 = "b".repeat(64);
const ATTACH_MAPPING_ID = "email-attachment:readback-a";
export const ATTACH_TIMELINE_ID = "outlook.attachment.saved:readback-a";
export const TASK_ID = "task:readback-a";
export const TASK_TIMELINE_ID = "matter.timeline.activity:readback-a";

export function runtimeFixture() {
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
    filing_user: ACTOR,
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
    current_version_id: VERSION_ID,
    latest_sha256: MIME_SHA256,
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
    occurred_at: "2026-08-08T00:00:00.000Z",
    metadata: {
      tenant_id: TENANT,
      matter_id: MATTER,
      email_thread_id: THREAD_ID,
      graph_message_id: CANONICAL_ID,
      internet_message_id: INTERNET_ID.toLowerCase(),
      conversation_id: CONVERSATION_ID,
      filing_mode: "manual",
      filed_document_ids: [DOCUMENT_ID],
      actor_id: ACTOR,
    },
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
    request_fingerprint: outlookEmailFileRequestFingerprint({
      tenant_id: TENANT,
      matter_id: MATTER,
      email_thread_id: THREAD_ID,
      graph_message_id: CANONICAL_ID,
      internet_message_id: INTERNET_ID,
      conversation_id: CONVERSATION_ID,
      filing_mode: "manual",
      filed_document_ids: [DOCUMENT_ID],
    }),
    response: {
      email_thread_id: THREAD_ID,
      matter_id: MATTER,
      filed_document_ids: [DOCUMENT_ID],
      outcome: "created",
    },
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
