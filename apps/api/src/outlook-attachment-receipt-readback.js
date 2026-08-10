import {
  assertExactOutlookSourceIdentity,
  OUTLOOK_SOURCE_IDENTITY_FIELDS,
  parseExactOutlookSourceIdentity,
} from "../../../packages/email-dms/src/outlook-source-identity.js";
import { parseExactDmsDocumentId } from "../../../packages/email-dms/src/exact-document-id.js";
import {
  OUTLOOK_ATTACHMENT_RECEIPT_CLAIM_FIELDS,
  outlookAttachmentReceiptClaims,
} from "./outlook-attachment-receipt-authority.js";

export function outlookAttachmentReceiptError(message) {
  return Object.assign(new Error(message), {
    safe_error_code: "OUTLOOK_ADDIN_ATTACHMENT_RECEIPT_INVALID",
    status: 409,
  });
}

function requiredText(value, field) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text || text !== value) {
    throw outlookAttachmentReceiptError(`${field} is required and exact`);
  }
  return text;
}

export function verifySuppliedOutlookAttachmentReceipts({
  receipts,
  authority,
  tenantId,
  matterId,
  emailThreadId,
} = {}) {
  if (receipts === undefined) return Object.freeze([]);
  if (!Array.isArray(receipts) || typeof authority?.verify !== "function") {
    throw outlookAttachmentReceiptError("Outlook attachment receipts are invalid");
  }
  const refs = new Set();
  return Object.freeze(receipts.map((receipt) => {
    if (
      !receipt
      || typeof receipt.receipt_ref !== "string"
      || typeof receipt.receipt_token !== "string"
      || refs.has(receipt.receipt_ref)
    ) {
      throw outlookAttachmentReceiptError("Outlook attachment receipt is incomplete or duplicated");
    }
    refs.add(receipt.receipt_ref);
    try {
      const verified = authority.verify(receipt, {
        tenant_id: tenantId,
        matter_id: matterId,
        email_thread_id: emailThreadId,
      });
      return Object.freeze({ ...verified, receipt_token: receipt.receipt_token });
    } catch {
      throw outlookAttachmentReceiptError("Outlook attachment receipt signature or context is invalid");
    }
  }));
}

async function documentState({ dmsRuntime, tenantId, documentId } = {}) {
  if (typeof dmsRuntime.upload_runtime?.getDocumentIntegrityState === "function") {
    return await dmsRuntime.upload_runtime.getDocumentIntegrityState({
      tenant_id: tenantId,
      document_id: documentId,
    });
  }
  if (typeof dmsRuntime.upload_runtime?.getDocumentState === "function") {
    return await dmsRuntime.upload_runtime.getDocumentState({
      tenant_id: tenantId,
      document_id: documentId,
    });
  }
  const document = dmsRuntime.repository.get({
    tenant_id: tenantId,
    model_type: "DmsDocument",
    document_id: documentId,
  });
  const version = document && dmsRuntime.repository.get({
    tenant_id: tenantId,
    model_type: "DmsDocumentVersion",
    version_id: document.current_version_id,
  });
  return document ? Object.freeze({ document, version, versions: Object.freeze(version ? [version] : []) }) : null;
}

export async function readOutlookAttachmentReceiptState({
  dmsRuntime,
  matterRuntime,
  authority,
  thread,
  tenantId,
  matterId,
  supplied = [],
  attachmentId,
  sourceIdentity,
} = {}) {
  let threadSourceIdentity;
  try {
    threadSourceIdentity = parseExactOutlookSourceIdentity(thread);
    if (sourceIdentity !== undefined) {
      assertExactOutlookSourceIdentity(sourceIdentity, threadSourceIdentity);
    }
  } catch {
    throw outlookAttachmentReceiptError("Filed Outlook thread source identity is incomplete or mismatched");
  }
  if (
    !Array.isArray(supplied)
    || thread?.tenant_id !== tenantId
    || thread?.matter_id !== matterId
    || thread?.status !== "active"
    || thread?.revoked === true
    || thread?.revoked_at != null
  ) {
    throw outlookAttachmentReceiptError("Filed Outlook thread context is incomplete or mismatched");
  }
  requiredText(thread.email_thread_id, "email_thread_id");
  if (!Array.isArray(thread.attachment_metadata)) {
    throw outlookAttachmentReceiptError("Filed Outlook attachment metadata is incomplete");
  }
  const sourceById = new Map();
  for (const source of thread.attachment_metadata) {
    const sourceAttachmentId = requiredText(source.attachment_id ?? source.id, "source_attachment.attachment_id");
    if (sourceById.has(sourceAttachmentId)) throw outlookAttachmentReceiptError("Filed Outlook attachment identity is duplicated");
    sourceById.set(sourceAttachmentId, source);
  }
  const scopedAttachmentId = attachmentId === undefined
    ? null
    : requiredText(attachmentId, "attachment_id");
  if (scopedAttachmentId !== null && !sourceById.has(scopedAttachmentId)) {
    throw outlookAttachmentReceiptError("Filed Outlook attachment identity is missing");
  }
  const requestedIds = scopedAttachmentId === null ? [...sourceById.keys()] : [scopedAttachmentId];
  if (requestedIds.length === 0 && supplied.length === 0) {
    return Object.freeze({ receipts: Object.freeze([]), retry_attachment_ids: Object.freeze([]) });
  }
  if (typeof authority?.issue !== "function") {
    throw outlookAttachmentReceiptError("Outlook attachment receipt authority is unavailable");
  }
  const mappings = dmsRuntime.repository
    .list({ tenant_id: tenantId, model_type: "DmsEmailAttachmentMapping", matter_id: matterId })
    .filter((mapping) => mapping.email_thread_id === thread.email_thread_id)
    .filter((mapping) => scopedAttachmentId === null || mapping.attachment_id === scopedAttachmentId)
    .sort((left, right) => left.attachment_id.localeCompare(right.attachment_id, "en"));
  const validatedMappings = [];
  const mappedIds = new Set();
  for (const mapping of mappings) {
    const source = sourceById.get(mapping.attachment_id);
    let mappingDocumentId;
    try {
      mappingDocumentId = parseExactDmsDocumentId(mapping.document_id, "mapping.document_id");
    } catch {
      throw outlookAttachmentReceiptError("Outlook attachment mapping readback is incomplete or mismatched");
    }
    const state = await documentState({ dmsRuntime, tenantId, documentId: mappingDocumentId });
    const version = state?.versions?.find((entry) => entry.version_id === mapping.version_id)
      ?? state?.version;
    if (
      !source
      || mappedIds.has(mapping.attachment_id)
      || mapping.tenant_id !== tenantId
      || mapping.matter_id !== matterId
      || mapping.email_thread_id !== thread.email_thread_id
      || mapping.name !== source.name
      || mapping.sha256 !== source.source_provenance?.sha256
      || mapping.source_byte_size !== source.source_provenance?.byte_size
      || mapping.source_message_ref !== source.source_provenance?.message_ref
      || mapping.source_provenance_authority !== source.source_provenance?.authority
      || state?.document?.document_id !== mapping.document_id
      || state.document.tenant_id !== tenantId
      || state.document.matter_id !== matterId
      || state.document.status !== "active"
      || state.document.current_version_id !== mapping.version_id
      || state.document.latest_sha256 !== mapping.sha256
      || state.document.source_email_thread_id !== thread.email_thread_id
      || state.document.source_attachment_id !== mapping.attachment_id
      || version?.version_id !== mapping.version_id
      || version.document_id !== mapping.document_id
      || version.tenant_id !== tenantId
      || (version.matter_id !== undefined && version.matter_id !== matterId)
      || version.sha256 !== mapping.sha256
    ) {
      throw outlookAttachmentReceiptError("Outlook attachment mapping readback is incomplete or mismatched");
    }
    const operationKey = `outlook-attachment:${thread.email_thread_id}:${mapping.attachment_id}:${mapping.sha256}`;
    const timelineReplay = matterRuntime.repository.getIdempotency({
      tenant_id: tenantId,
      idempotency_key: `${operationKey}:matter:${matterId}`,
    });
    const timelineEvent = timelineReplay && matterRuntime.repository.get({
      tenant_id: tenantId,
      model_type: "MatterTimelineEvent",
      resource_id: timelineReplay.response?.timeline_event_id,
    });
    if (
      !timelineEvent
      || timelineEvent.tenant_id !== tenantId
      || timelineEvent.matter_id !== matterId
      || timelineEvent.type !== "outlook.attachment.saved"
      || timelineEvent.source_ref !== mapping.document_id
      || timelineEvent.source_object_id !== mapping.document_id
      || timelineEvent.safe_summary?.email_thread_id !== mapping.email_thread_id
      || timelineEvent.safe_summary?.attachment_id !== mapping.attachment_id
      || timelineEvent.safe_summary?.document_id !== mapping.document_id
      || timelineEvent.safe_summary?.version_id !== mapping.version_id
      || timelineEvent.safe_summary?.sha256 !== mapping.sha256
      || timelineEvent.safe_summary?.byte_size !== mapping.source_byte_size
      || timelineEvent.safe_summary?.source_message_ref !== mapping.source_message_ref
      || timelineEvent.safe_summary?.source_provenance_authority !== mapping.source_provenance_authority
      || OUTLOOK_SOURCE_IDENTITY_FIELDS.some(
        (field) => timelineEvent.safe_summary?.[field] !== threadSourceIdentity[field],
      )
    ) continue;
    mappedIds.add(mapping.attachment_id);
    validatedMappings.push(outlookAttachmentReceiptClaims({
      ...mapping,
      ...threadSourceIdentity,
    }));
  }
  if (supplied.length > 0 && typeof authority.verify !== "function") {
    throw outlookAttachmentReceiptError("Outlook attachment receipt authority is unavailable");
  }
  for (const receipt of supplied) {
    let verified;
    try {
      verified = authority.verify(receipt, {
        tenant_id: tenantId,
        matter_id: matterId,
        email_thread_id: thread.email_thread_id,
        ...threadSourceIdentity,
      });
    } catch {
      throw outlookAttachmentReceiptError("Outlook attachment receipt signature or context is invalid");
    }
    const readback = validatedMappings.find(
      ({ attachment_id }) => attachment_id === verified.attachment_id,
    );
    if (
      !readback
      || OUTLOOK_ATTACHMENT_RECEIPT_CLAIM_FIELDS.some(
        (field) => readback[field] !== verified[field],
      )
    ) {
      throw outlookAttachmentReceiptError("Outlook attachment receipt has no matching persisted readback");
    }
  }
  const receipts = validatedMappings.map((mapping) => authority.issue(mapping));
  return Object.freeze({
    receipts: Object.freeze(receipts),
    retry_attachment_ids: Object.freeze(requestedIds.filter((requestedId) => !mappedIds.has(requestedId))),
  });
}
