export function outlookAttachmentReceiptError(message) {
  return Object.assign(new Error(message), {
    safe_error_code: "OUTLOOK_ADDIN_ATTACHMENT_RECEIPT_INVALID",
    status: 409,
  });
}

function requiredText(value, field) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) throw outlookAttachmentReceiptError(`${field} is required`);
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
      return authority.verify(receipt, {
        tenant_id: tenantId,
        matter_id: matterId,
        email_thread_id: emailThreadId,
      });
    } catch {
      throw outlookAttachmentReceiptError("Outlook attachment receipt signature or context is invalid");
    }
  }));
}

async function documentState({ dmsRuntime, tenantId, documentId } = {}) {
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
} = {}) {
  const sourceById = new Map();
  for (const source of thread.attachment_metadata) {
    const attachmentId = requiredText(source.attachment_id ?? source.id, "source_attachment.attachment_id");
    if (sourceById.has(attachmentId)) throw outlookAttachmentReceiptError("Filed Outlook attachment identity is duplicated");
    sourceById.set(attachmentId, source);
  }
  if (sourceById.size === 0 && supplied.length === 0) {
    return Object.freeze({ receipts: Object.freeze([]), retry_attachment_ids: Object.freeze([]) });
  }
  if (typeof authority?.issue !== "function") {
    throw outlookAttachmentReceiptError("Outlook attachment receipt authority is unavailable");
  }
  const mappings = dmsRuntime.repository
    .list({ tenant_id: tenantId, model_type: "DmsEmailAttachmentMapping", matter_id: matterId })
    .filter((mapping) => mapping.email_thread_id === thread.email_thread_id)
    .sort((left, right) => left.attachment_id.localeCompare(right.attachment_id, "en"));
  const receipts = [];
  const mappedIds = new Set();
  for (const mapping of mappings) {
    const source = sourceById.get(mapping.attachment_id);
    const state = await documentState({ dmsRuntime, tenantId, documentId: mapping.document_id });
    const version = state?.versions?.find((entry) => entry.version_id === mapping.version_id)
      ?? state?.version;
    if (
      !source
      || mappedIds.has(mapping.attachment_id)
      || mapping.tenant_id !== tenantId
      || mapping.matter_id !== matterId
      || mapping.name !== source.name
      || mapping.sha256 !== source.source_provenance?.sha256
      || mapping.source_byte_size !== source.source_provenance?.byte_size
      || mapping.source_message_ref !== source.source_provenance?.message_ref
      || mapping.source_provenance_authority !== source.source_provenance?.authority
      || state?.document?.document_id !== mapping.document_id
      || state.document.matter_id !== matterId
      || version?.version_id !== mapping.version_id
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
      || timelineEvent.matter_id !== matterId
      || timelineEvent.type !== "outlook.attachment.saved"
      || timelineEvent.source_ref !== mapping.document_id
      || timelineEvent.source_object_id !== mapping.document_id
    ) continue;
    mappedIds.add(mapping.attachment_id);
    receipts.push(authority.issue(mapping));
  }
  for (const verified of supplied) {
    const readback = receipts.find(({ attachment_id }) => attachment_id === verified.attachment_id);
    if (!readback || readback.receipt_ref !== verified.receipt_ref || readback.receipt_token !== authority.issue(verified).receipt_token) {
      throw outlookAttachmentReceiptError("Outlook attachment receipt has no matching persisted readback");
    }
  }
  return Object.freeze({
    receipts: Object.freeze(receipts),
    retry_attachment_ids: Object.freeze([...sourceById.keys()].filter((attachmentId) => !mappedIds.has(attachmentId))),
  });
}
