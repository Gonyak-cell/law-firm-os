import { createLocalStorageAdapter } from "../../../packages/dms/src/storage/local-storage-adapter.js";
import { sha256Hex } from "../../../packages/dms/src/storage/storage-adapter.js";
import { createPostgresDmsUploadRuntime } from "../../../packages/dms/src/postgres-upload-runtime.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  filingAuditMetadata,
} from "../../../packages/email-dms/src/email-filing-canonical.js";
import { outlookEmailFileRequestFingerprint } from "../../../packages/email-dms/src/email-filing-service.js";
import { handleOutlookAddinApiRequest } from "../src/outlook-addin-runtime-context.js";
import {
  ACTOR,
  MATTER,
  TENANT,
  runtimeFixture,
} from "./outlook-operation-receipt-readback-fixture.js";

export { ACTOR, MATTER, TENANT };

export const GRAPH_ID = "immutable:pg-receipt-authority";
export const INTERNET_ID = "<pg-receipt-authority@amic.law>";
export const CONVERSATION_ID = "conversation-pg-receipt-authority";
export const THREAD_ID = "thread:pg-receipt-authority";
export const SUBJECT = "PostgreSQL receipt authority";

export function pgCounts(adminPool) {
  return adminPool.query(
    `SELECT
       (SELECT count(*) FROM lawos_dms.documents WHERE tenant_id = $1) AS documents,
       (SELECT count(*) FROM lawos_dms.document_versions WHERE tenant_id = $1) AS versions,
       (SELECT count(*) FROM lawos_dms.file_objects WHERE tenant_id = $1) AS file_objects,
       (SELECT count(*) FROM lawos_dms.idempotency_keys WHERE tenant_id = $1) AS idempotency`,
    [TENANT],
  ).then(({ rows }) => rows[0]);
}

export function readback(fixture) {
  return handleOutlookAddinApiRequest({
    pathname: "/api/outlook/operation-receipts/readback",
    method: "POST",
    body: {
      matter_id: MATTER,
      current_item: {
        rest_message_id: "rest:pg-receipt-authority",
        canonical_graph_message_id: GRAPH_ID,
        internet_message_id: INTERNET_ID,
        conversation_id: CONVERSATION_ID,
        mode: "read",
        provenance: "received",
      },
    },
    requestId: "request:pg-receipt-authority-readback",
    context: fixture.context,
    runtime: fixture.runtime,
  });
}

export async function createPgReceiptFixture(t) {
  const pg = await createMigratedPostgresFixture(t);
  if (!pg) return null;
  const fixture = runtimeFixture();
  const storage = createLocalStorageAdapter({ adapter_id: "pg-outlook-receipt-authority" });
  const uploadRuntime = createPostgresDmsUploadRuntime({
    pool: pg.appPool,
    storage,
    sourceOnly: false,
    clock: () => new Date("2026-08-08T00:00:00.000Z"),
    verifyPermanentDeleteApproval: async () => ({
      verified: true,
      receipt_ref: "approval:pg-receipt-authority",
      receipt_sha256: "d".repeat(64),
      key_id: "key:pg-receipt-authority",
    }),
  });
  fixture.runtime.dmsRuntime.upload_runtime = uploadRuntime;
  fixture.runtime.m365GraphConfig.provider = {
    async getMeMessageMime() {
      return {
        mime_bytes: Buffer.from("From: pg@example.test\\r\\nSubject: PostgreSQL receipt authority\\r\\n\\r\\nbody"),
        immutable_message_id: GRAPH_ID,
        internet_message_id: INTERNET_ID,
        message_metadata: { conversation_id: CONVERSATION_ID, internet_message_id: INTERNET_ID, subject: SUBJECT },
      };
    },
  };
  const bytes = Buffer.from(`From: pg@example.test\r\nSubject: ${SUBJECT}\r\n\r\nbody`);
  const digest = sha256Hex(bytes);
  const documentId = `doc:${THREAD_ID}:original-mime:${digest}`;
  const versionId = `version:${documentId}:1`;
  await uploadRuntime.uploadDocument({
    document: {
      tenant_id: TENANT,
      matter_id: MATTER,
      document_id: documentId,
      workspace_id: "workspace:readback",
      title: `${SUBJECT}.eml`,
      mime_type: "message/rfc822",
      current_version_id: versionId,
      permission_envelope_id: "permission:readback",
      audit_trace_id: "audit:readback",
    },
    bytes,
    actor_id: ACTOR,
    idempotency_key: `pg-original-mime:${THREAD_ID}`,
    version_number: 1,
  });
  const repository = fixture.dmsRepository;
  const thread = repository.create({
    model_type: "DmsEmailThread",
    tenant_id: TENANT,
    matter_id: MATTER,
    email_thread_id: THREAD_ID,
    graph_message_id: GRAPH_ID,
    internet_message_id: INTERNET_ID,
    conversation_id: CONVERSATION_ID,
    subject: SUBJECT,
    status: "active",
    filing_mode: "manual",
    filing_user: ACTOR,
    filing_time: "2026-08-08T00:00:00.000Z",
    filed_document_ids: [documentId],
    permission_envelope_id: "permission:readback",
    audit_trace_id: "audit:readback",
  });
  repository.appendAudit({
    event_id: `outlook.email.file:${TENANT}:${THREAD_ID}`,
    tenant_id: TENANT,
    actor_id: ACTOR,
    action: "dms.email.thread.file",
    object_type: "DmsEmailThread",
    object_id: THREAD_ID,
    decision: "allow",
    reason: "email_thread_filed_to_matter",
    occurred_at: thread.filing_time,
    metadata: filingAuditMetadata(thread),
  });
  const key = `outlook-email-file:${THREAD_ID}:${digest}:dms`;
  repository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: key,
    operation: "outlook_email_file",
    request_fingerprint: outlookEmailFileRequestFingerprint(thread),
    response: { outcome: "created", email_thread_id: THREAD_ID, matter_id: MATTER, filed_document_ids: [documentId] },
  });
  const timelineId = `timeline:${THREAD_ID}`;
  fixture.matterRepository.create({
    model_type: "MatterTimelineEvent",
    tenant_id: TENANT,
    matter_id: MATTER,
    event_id: timelineId,
    resource_id: timelineId,
    occurred_at: thread.filing_time,
    type: "outlook.email.filed",
    source_ref: THREAD_ID,
    source_object_id: THREAD_ID,
    safe_summary: { filed_document_ids: [documentId], original_mime_document_id: documentId },
  });
  fixture.matterRepository.appendAudit({
    event_id: `audit:matter.timeline:${THREAD_ID}`,
    tenant_id: TENANT,
    actor_id: ACTOR,
    action: "matter.timeline.outlook.file",
    object_type: "MatterTimelineEvent",
    object_id: timelineId,
    decision: "allow",
  });
  fixture.matterRepository.recordIdempotency({
    tenant_id: TENANT,
    idempotency_key: `outlook-email-file:${THREAD_ID}:${digest}:matter:${MATTER}`,
    operation: "matter_timeline_outlook_file",
    response: { timeline_event_id: timelineId },
  });
  return { pg, fixture, uploadRuntime, repository, thread, key, digest, documentId, versionId, bytes };
}
