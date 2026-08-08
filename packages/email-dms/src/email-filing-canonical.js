import { createHash } from "node:crypto";
export const OUTLOOK_EMAIL_FILE_IDEMPOTENCY_OPERATION = "outlook_email_file";
const FILING_MODES = new Set(["manual", "sent"]);
const FILING_OUTCOMES = new Set(["created", "idempotent_replay"]);
const ORIGINAL_MIME_DOCUMENT = /^doc:(.+):original-mime:([a-f0-9]{64})$/u;
function canonicalText(value, field) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`email filing ${field} is required for canonical replay binding`);
  }
  return value.normalize("NFKC").trim();
}
function canonicalDocumentIds(thread) {
  if (!Array.isArray(thread?.filed_document_ids) || thread.filed_document_ids.length === 0) {
    throw new Error("email filing requires canonical filed document links");
  }
  const ids = thread.filed_document_ids.map((value) => canonicalText(value, "filed_document_ids"));
  if (new Set(ids).size !== ids.length) throw new Error("email filing document links must be unique");
  return ids;
}
function canonicalMimeSha256(thread, documentIds = canonicalDocumentIds(thread)) {
  if (documentIds.length !== 1) {
    throw new Error("email filing requires one canonical original MIME document");
  }
  const match = ORIGINAL_MIME_DOCUMENT.exec(documentIds[0]);
  if (!match || match[1] !== canonicalText(thread.email_thread_id, "email_thread_id")) {
    throw new Error("email filing original MIME document link is not canonical");
  }
  return match[2];
}
function canonicalBinding(thread = {}) {
  const filingMode = canonicalText(thread.filing_mode ?? "manual", "filing_mode").toLowerCase();
  if (!FILING_MODES.has(filingMode)) throw new Error("email filing mode is not canonical");
  const filedDocumentIds = canonicalDocumentIds(thread);
  return Object.freeze({
    tenant_id: canonicalText(thread.tenant_id, "tenant_id"),
    matter_id: canonicalText(thread.matter_id, "matter_id"),
    email_thread_id: canonicalText(thread.email_thread_id, "email_thread_id"),
    graph_message_id: canonicalText(thread.graph_message_id, "graph_message_id"),
    internet_message_id: canonicalText(thread.internet_message_id, "internet_message_id").toLowerCase(),
    conversation_id: canonicalText(thread.conversation_id, "conversation_id"),
    filing_mode: filingMode,
    filed_document_ids: Object.freeze(filedDocumentIds),
    mime_sha256: canonicalMimeSha256(thread, filedDocumentIds),
  });
}
function sameDocumentIds(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}
function durableMimeState(authority, binding) {
  if (!authority || typeof authority.getDocumentState !== "function") {
    throw new Error("email filing requires a live durable original MIME document authority");
  }
  return authority.getDocumentState({
    tenant_id: binding.tenant_id,
    document_id: binding.filed_document_ids[0],
  });
}

export function assertDurableOriginalMimeState(state, {
  tenant_id: tenantId,
  matter_id: matterId,
  email_thread_id: emailThreadId,
  document_id: documentId,
  mime_sha256: mimeSha256,
} = {}) {
  const durableDocumentState = state;
  const document = durableDocumentState?.document;
  const version = durableDocumentState?.versions?.find((item) => item.version_id === document?.current_version_id)
    ?? durableDocumentState?.version;
  const fileObject = durableDocumentState?.file_objects?.find((item) => item.file_object_id === version?.file_object_id)
    ?? durableDocumentState?.file_object;
  const documentMime = document?.mime_type ?? document?.content_type;
  const fileMime = fileObject?.mime_type ?? fileObject?.content_type;
  const durableSha = document?.latest_sha256 ?? version?.sha256 ?? fileObject?.sha256;
  if (
    !document
    || document.document_id !== documentId
    || document.tenant_id !== tenantId
    || document.matter_id !== matterId
    || document.status !== "active"
    || (document.source_email_thread_id !== undefined && document.source_email_thread_id !== emailThreadId)
    || durableSha !== mimeSha256
    || (document.latest_sha256 !== undefined && document.latest_sha256 !== mimeSha256)
    || (documentMime !== undefined && documentMime !== "message/rfc822")
    || typeof document.current_version_id !== "string"
  ) throw new Error("email filing original MIME document authority conflicts with the canonical binding");
  if (
    !version
    || version.version_id !== document.current_version_id
    || version.document_id !== documentId
    || version.tenant_id !== tenantId
    || version.sha256 !== mimeSha256
    || version.persisted === false
    || (version.status !== undefined && !["active", "current"].includes(version.status))
    || typeof version.file_object_id !== "string"
  ) throw new Error("email filing original MIME version authority conflicts with the canonical binding");
  if (
    !fileObject
    || fileObject.file_object_id !== version.file_object_id
    || fileObject.tenant_id !== tenantId
    || (fileObject.status !== undefined && !["active", "committed"].includes(fileObject.status))
    || fileObject.sha256 !== mimeSha256
    || fileMime !== "message/rfc822"
    || !Number.isSafeInteger(fileObject.byte_size)
    || fileObject.byte_size < 0
  ) throw new Error("email filing original MIME file authority conflicts with the canonical binding");
  return Object.freeze({ document, version, fileObject });
}

async function durableMimeBinding(binding, authority) {
  const durableDocumentState = await durableMimeState(authority, binding);
  assertDurableOriginalMimeState(durableDocumentState, {
    tenant_id: binding.tenant_id,
    matter_id: binding.matter_id,
    email_thread_id: binding.email_thread_id,
    document_id: binding.filed_document_ids[0],
    mime_sha256: binding.mime_sha256,
  });
}

export async function assertCanonicalIdempotencyKey(key, thread, authority) {
  const value = canonicalText(key, "idempotency_key");
  const binding = canonicalBinding(thread);
  await durableMimeBinding(binding, authority);
  if (value !== `outlook-email-file:${binding.email_thread_id}:${binding.mime_sha256}:dms`) {
    throw new Error("email filing idempotency key is not canonical");
  }
  return value;
}

export function createDmsRepositoryMimeAuthority(repository) {
  if (!repository || typeof repository.get !== "function") {
    throw new TypeError("email filing requires a DMS repository authority");
  }
  return Object.freeze({
    getDocumentState({ tenant_id: tenantId, document_id: documentId }) {
      const document = repository.get({ tenant_id: tenantId, model_type: "DmsDocument", document_id: documentId });
      const version = document?.current_version_id
        ? repository.get({ tenant_id: tenantId, model_type: "DmsDocumentVersion", version_id: document.current_version_id })
        : null;
      const fileObject = version?.file_object_id
        ? repository.get({ tenant_id: tenantId, model_type: "DmsFileObject", file_object_id: version.file_object_id })
        : null;
      return { document, versions: version ? [version] : [], file_objects: fileObject ? [fileObject] : [] };
    },
  });
}

function canonicalFilingAuditMetadata(thread) {
  const binding = canonicalBinding(thread);
  const actorId = canonicalText(thread.filing_user, "filing_user");
  return {
    operation: OUTLOOK_EMAIL_FILE_IDEMPOTENCY_OPERATION,
    tenant_id: binding.tenant_id,
    matter_id: binding.matter_id,
    email_thread_id: binding.email_thread_id,
    graph_message_id: binding.graph_message_id,
    internet_message_id: binding.internet_message_id,
    conversation_id: binding.conversation_id,
    filing_mode: binding.filing_mode,
    filed_document_ids: [...binding.filed_document_ids],
    actor_id: actorId,
  };
}

export function canonicalFilingAudit(repository, thread) {
  let binding;
  let actorId;
  try {
    binding = canonicalBinding(thread);
    actorId = canonicalText(thread.filing_user, "filing_user");
  } catch {
    return null;
  }
  const events = repository.listAudit({ tenant_id: binding.tenant_id, object_id: binding.email_thread_id })
    .filter((event) => event.action === "dms.email.thread.file");
  if (events.length !== 1) return null;
  const event = events[0];
  const metadata = event.metadata;
  if (
    event.tenant_id !== binding.tenant_id
    || event.actor_id !== actorId
    || event.object_type !== "DmsEmailThread"
    || event.object_id !== binding.email_thread_id
    || event.decision !== "allow"
    || event.reason !== "email_thread_filed_to_matter"
    || event.occurred_at !== thread.filing_time
    || !metadata || typeof metadata !== "object" || Array.isArray(metadata)
    || metadata.tenant_id !== binding.tenant_id
    || metadata.operation !== OUTLOOK_EMAIL_FILE_IDEMPOTENCY_OPERATION
    || metadata.matter_id !== binding.matter_id
    || metadata.email_thread_id !== binding.email_thread_id
    || metadata.graph_message_id !== binding.graph_message_id
    || metadata.internet_message_id !== binding.internet_message_id
    || metadata.conversation_id !== binding.conversation_id
    || metadata.filing_mode !== binding.filing_mode
    || metadata.actor_id !== actorId
    || !sameDocumentIds(metadata.filed_document_ids, binding.filed_document_ids)
  ) return null;
  return event;
}

export function filingAuditMetadata(thread) {
  return canonicalFilingAuditMetadata(thread);
}

export function outlookEmailFileRequestFingerprint(thread = {}) {
  const binding = canonicalBinding(thread);
  return createHash("sha256")
    .update(JSON.stringify({ schema: "outlook-email-file:v1", operation: OUTLOOK_EMAIL_FILE_IDEMPOTENCY_OPERATION, ...binding }))
    .digest("hex");
}

export function validateOutlookEmailFileIdempotency({ entry, thread } = {}) {
  let binding;
  try {
    binding = canonicalBinding(thread);
  } catch {
    return Object.freeze({ valid: false });
  }
  const response = entry?.response;
  const allowedResponseFields = new Set(["outcome", "email_thread_id", "matter_id", "filed_document_ids"]);
  if (
    entry?.operation !== OUTLOOK_EMAIL_FILE_IDEMPOTENCY_OPERATION
    || !response || typeof response !== "object" || Array.isArray(response)
    || Object.keys(response).some((field) => !allowedResponseFields.has(field))
    || response.email_thread_id !== binding.email_thread_id
    || response.matter_id !== binding.matter_id
    || !sameDocumentIds(response.filed_document_ids, binding.filed_document_ids)
    || !FILING_OUTCOMES.has(response.outcome)
  ) return Object.freeze({ valid: false });
  const expected = outlookEmailFileRequestFingerprint(thread);
  if (entry.request_fingerprint !== null && entry.request_fingerprint !== undefined) {
    if (typeof entry.request_fingerprint !== "string" || entry.request_fingerprint !== expected) {
      return Object.freeze({ valid: false });
    }
  }
  return Object.freeze({
    valid: true,
    legacy: entry.request_fingerprint == null,
    request_fingerprint: expected,
    binding,
  });
}
