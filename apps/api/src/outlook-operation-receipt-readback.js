import { createHash } from "node:crypto";
import {
  auditList,
  hasAudit,
  idempotency,
  resolveVerifiedDocument,
} from "./outlook-operation-receipt-durable-chain.js";
import { canonicalFilingAudit, validateOutlookEmailFileIdempotency } from "../../../packages/email-dms/src/email-filing-service.js";
const DIGEST = /^[a-f0-9]{64}$/u;
const FOLLOWUP_TYPES = new Set(["task", "deadline"]);
const FILING_MODES = new Set(["manual", "sent"]);
const FILING_OUTCOMES = new Set(["created", "idempotent_replay"]);
function safeRef(value) {
  if (typeof value !== "string") return "";
  const next = value.normalize("NFKC").trim();
  return next && next.length <= 256 && !/[\s@]|:\/\/|[\u0000-\u001f\u007f]/u.test(next)
    ? next
    : "";
}
function opaqueRef(value) {
  return `request-ref:${createHash("sha256").update(String(value)).digest("hex").slice(0, 32)}`;
}

function sameList(left = [], right = []) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function iso(value) {
  const parsed = Date.parse(value ?? "");
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function visibleTimeline(repository, tenantId, matterId, actor) {
  return repository.list({ tenant_id: tenantId, model_type: "MatterTimelineEvent", matter_id: matterId })
    .filter((entry) => entry.silent !== true && entry.hidden_from_actor !== true)
    .filter((entry) => !entry.required_scope || actor?.scopes?.includes(entry.required_scope));
}

function timelineFor({ entries, type, sourceRef, sourceObjectId, check = () => true }) {
  return entries.find((entry) => (
    entry.type === type
    && entry.source_ref === sourceRef
    && (!sourceObjectId || entry.source_object_id === sourceObjectId)
    && check(entry)
  ));
}

function summary({ itemContextRef, matterId, operation, outcome, requestId, threadId, documentIds, timelineIds, completedAt, filingMode }) {
  const result = {
    item_context_ref: itemContextRef,
    matter_id: matterId,
    operation,
    outcome,
    ...(filingMode ? { filing_mode: filingMode } : {}),
    ...(requestId ? { request_id: requestId } : {}),
    ...(threadId ? { email_thread_id: threadId } : {}),
    ...(documentIds?.length ? { document_ids: Object.freeze([...documentIds].sort()) } : {}),
    ...(timelineIds?.length ? { timeline_event_ids: Object.freeze([...timelineIds].sort()) } : {}),
    completed_at: completedAt,
  };
  return Object.freeze(result);
}

function durableFilingOutcome(entry) {
  const candidate = entry?.response?.outcome
    ?? (entry?.response?.idempotent_replay === true ? "idempotent_replay" : null);
  return FILING_OUTCOMES.has(candidate) ? candidate : "created";
}

function filingReceiptEntry({ thread, dmsRepository, tenantId, digest }) {
  const entry = typeof dmsRepository.getIdempotency === "function"
    ? dmsRepository.getIdempotency({
      tenant_id: tenantId,
      idempotency_key: `outlook-email-file:${thread.email_thread_id}:${digest}:dms`,
    })
    : null;
  return validateOutlookEmailFileIdempotency({ entry, thread }).valid ? entry : null;
}

async function fileReceipt({ thread, itemContextRef, matterId, tenantId, dmsRepository, dmsAuthority, matterRepository, timeline, canReadDocument }) {
  if (thread.status !== "active" || !Array.isArray(thread.filed_document_ids) || thread.filed_document_ids.length === 0) return null;
  if (!FILING_MODES.has(thread.filing_mode)) return null;
  if (thread.filed_document_ids.length !== 1) return null;
  const documentRef = thread.filed_document_ids[0];
  const digest = documentRef.slice(documentRef.lastIndexOf(":") + 1);
  if (!DIGEST.test(digest)) return null;
  const documents = [];
  for (const documentId of thread.filed_document_ids) {
    if (!await canReadDocument(documentId)) return null;
    const verified = await resolveVerifiedDocument({ repository: dmsRepository, authority: dmsAuthority, tenantId, matterId, documentId, threadId: thread.email_thread_id, originalMimeSha256: digest });
    if (!verified) return null;
    documents.push(verified);
  }
  const documentAudits = documents.every((entry) => hasAudit(
    entry.auditEvents.length ? entry.auditEvents : auditList(dmsRepository, tenantId, entry.document.document_id),
    { action: "dms.document.upload", objectType: "DmsDocument", objectId: entry.document.document_id },
  ));
  const filingEntry = filingReceiptEntry({ thread, dmsRepository, tenantId, digest });
  if (
    !documentAudits
    || !canonicalFilingAudit(dmsRepository, thread)
    || !filingEntry
  ) return null;
  const type = thread.filing_mode === "sent" ? "outlook.email.sent_filed" : "outlook.email.filed";
  const event = timelineFor({
    entries: timeline,
    type,
    sourceRef: thread.email_thread_id,
    sourceObjectId: thread.email_thread_id,
    check: (entry) => sameList(entry.safe_summary?.filed_document_ids, thread.filed_document_ids)
      && entry.safe_summary?.original_mime_document_id === thread.filed_document_ids[0],
  });
  if (!event || !hasAudit(auditList(matterRepository, tenantId, event.event_id), {
    action: "matter.timeline.outlook.file",
    objectType: "MatterTimelineEvent",
    objectId: event.event_id,
  }) || !idempotency(matterRepository, tenantId, `outlook-email-file:${thread.email_thread_id}:${digest}:matter:${matterId}`, (entry) => entry.response?.timeline_event_id === event.event_id)) return null;
  return summary({
    itemContextRef,
    matterId,
    operation: "file_email",
    outcome: durableFilingOutcome(filingEntry),
    filingMode: thread.filing_mode,
    requestId: opaqueRef(`outlook-email-file:${thread.email_thread_id}:${digest}`),
    threadId: thread.email_thread_id,
    documentIds: thread.filed_document_ids,
    timelineIds: [event.event_id],
    completedAt: iso(event.occurred_at) || iso(thread.filing_time),
  });
}

async function attachmentReceipts({ thread, fileSummary, itemContextRef, matterId, tenantId, dmsRepository, dmsAuthority, matterRepository, timeline, canReadDocument }) {
  if (!fileSummary) return [];
  return Promise.all(dmsRepository.list({ tenant_id: tenantId, model_type: "DmsEmailAttachmentMapping", matter_id: matterId })
    .filter((mapping) => mapping.email_thread_id === thread.email_thread_id)
    .map(async (mapping) => {
      if (!await canReadDocument(mapping.document_id)) return null;
      const document = await resolveVerifiedDocument({ repository: dmsRepository, authority: dmsAuthority, tenantId, matterId, documentId: mapping.document_id, threadId: thread.email_thread_id, attachmentId: mapping.attachment_id });
      const digest = mapping.sha256;
      if (!document || !DIGEST.test(digest ?? "") || document.version.sha256 !== digest) return null;
      const operationKey = `outlook-attachment:${thread.email_thread_id}:${mapping.attachment_id}:${digest}`;
      const mappingAudits = auditList(dmsRepository, tenantId, mapping.mapping_id);
      const documentAudits = document.auditEvents.length ? document.auditEvents : auditList(dmsRepository, tenantId, mapping.document_id);
      const event = timelineFor({
        entries: timeline,
        type: "outlook.attachment.saved",
        sourceRef: mapping.document_id,
        sourceObjectId: mapping.document_id,
        check: (entry) => entry.safe_summary?.email_thread_id === thread.email_thread_id
          && entry.safe_summary?.sha256 === digest,
      });
      if (
        !hasAudit(mappingAudits, { action: "dms.email.attachment.map", objectType: "DmsEmailAttachmentMapping", objectId: mapping.mapping_id })
        || !hasAudit(documentAudits, { action: "dms.document.upload", objectType: "DmsDocument", objectId: mapping.document_id })
        || !event
        || !hasAudit(auditList(matterRepository, tenantId, event.event_id), { action: "matter.timeline.outlook.file", objectType: "MatterTimelineEvent", objectId: event.event_id })
        || !idempotency(dmsRepository, tenantId, `${operationKey}:dms-mapping`, (entry) => entry.response?.mapping_id === mapping.mapping_id && entry.response?.document_id === mapping.document_id)
        || !idempotency(matterRepository, tenantId, `${operationKey}:matter:${matterId}`, (entry) => entry.response?.timeline_event_id === event.event_id)
      ) return null;
      return summary({
        itemContextRef,
        matterId,
        operation: "save_attachments",
        outcome: "attachments_saved",
        requestId: opaqueRef(operationKey),
        threadId: thread.email_thread_id,
        documentIds: [mapping.document_id],
        timelineIds: [event.event_id],
        completedAt: iso(event.occurred_at),
      });
    }));
}

function followupRecords({ matterRepository, tenantId, matterId, threadId }) {
  const prefix = `DmsEmailThread:${threadId}`;
  return [
    ...matterRepository.list({ tenant_id: tenantId, model_type: "MatterTask", matter_id: matterId })
      .filter((record) => record.source_ref === prefix)
      .map((record) => ({ kind: "task", record, id: record.task_id })),
    ...matterRepository.list({ tenant_id: tenantId, model_type: "MatterCalendarEvent", matter_id: matterId })
      .map((record) => ({ kind: "deadline", record, id: record.event_id })),
  ].filter((entry) => FOLLOWUP_TYPES.has(entry.kind));
}

function followupReceipt({ candidate, thread, fileSummary, itemContextRef, matterId, tenantId, matterRepository, timeline }) {
  if (!fileSummary) return null;
  const { kind, id } = candidate;
  const operationKey = `outlook-followup:${tenantId}:${matterId}:${kind}:${thread.email_thread_id}:${id}`;
  const replay = typeof matterRepository.getIdempotency === "function"
    ? matterRepository.getIdempotency({ tenant_id: tenantId, idempotency_key: operationKey })
    : null;
  if (!replay || replay.response?.source_email_thread_id !== thread.email_thread_id) return null;
  const type = kind === "task" ? "matter.activity.task" : "matter.calendar.created";
  const sourceRef = kind === "task" ? `DmsEmailThread:${thread.email_thread_id}` : id;
  const event = timelineFor({ entries: timeline, type, sourceRef, sourceObjectId: id });
  if (!event || replay.response?.timeline_event?.event_id !== event.event_id) return null;
  const action = kind === "task" ? "matter.activity.created" : "matter.calendar.created";
  const objectType = kind === "task" ? "MatterTask" : "MatterCalendarEvent";
  if (!hasAudit(auditList(matterRepository, tenantId, id), { action, objectType, objectId: id })) return null;
  return summary({
    itemContextRef,
    matterId,
    operation: "create_followup",
    outcome: replay.response?.idempotent_replay ? "idempotent_replay" : "created",
    requestId: opaqueRef(operationKey),
    threadId: thread.email_thread_id,
    timelineIds: [event.event_id],
    completedAt: iso(event.occurred_at),
  });
}

export async function reconstructOutlookOperationReceiptSummaries({
  itemContextRef,
  matterId,
  tenantId,
  canonicalItem,
  dmsRepository,
  dmsAuthority,
  matterRepository,
  actor,
  canReadDocument,
} = {}) {
  const readDocument = typeof canReadDocument === "function" ? canReadDocument : async () => false;
  const timeline = visibleTimeline(matterRepository, tenantId, matterId, actor);
  const threads = dmsRepository.list({ tenant_id: tenantId, model_type: "DmsEmailThread", matter_id: matterId })
    .filter((thread) => (
      thread.graph_message_id === canonicalItem?.canonical_graph_message_id
      && thread.internet_message_id?.normalize?.("NFKC").toLowerCase() === canonicalItem?.internet_message_id?.normalize?.("NFKC").toLowerCase()
      && thread.conversation_id === canonicalItem?.conversation_id
    ));
  const results = [];
  for (const thread of threads) {
    const fileSummary = await fileReceipt({ thread, itemContextRef, matterId, tenantId, dmsRepository, dmsAuthority, matterRepository, timeline, canReadDocument: readDocument });
    if (fileSummary) results.push(fileSummary);
    results.push(...(await attachmentReceipts({ thread, fileSummary, itemContextRef, matterId, tenantId, dmsRepository, dmsAuthority, matterRepository, timeline, canReadDocument: readDocument })).filter(Boolean));
    for (const candidate of followupRecords({ matterRepository, tenantId, matterId, threadId: thread.email_thread_id })) {
      const receipt = followupReceipt({ candidate, thread, fileSummary, itemContextRef, matterId, tenantId, matterRepository, timeline });
      if (receipt) results.push(receipt);
    }
  }
  return Object.freeze(results.filter((entry) => entry?.completed_at).sort((left, right) => (
    left.completed_at.localeCompare(right.completed_at)
      || left.operation.localeCompare(right.operation)
      || String(left.email_thread_id).localeCompare(String(right.email_thread_id))
  )));
}
