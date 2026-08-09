import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { assertProviderIntegrityState } from "./durable-mime-authority.js";
export { createDmsRepositoryMimeAuthority } from "./repository-mime-authority.js";
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
  if (!authority || typeof authority.getDocumentIntegrityState !== "function") {
    throw new Error("email filing requires a live durable original MIME document authority");
  }
  return authority.getDocumentIntegrityState({
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
  const { document, version, fileObject } = assertProviderIntegrityState(durableDocumentState);
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

export function outlookEmailFilingAuditEvent(thread) {
  const metadata = canonicalFilingAuditMetadata(thread);
  return Object.freeze({
    event_id: `outlook.email.file:${metadata.tenant_id}:${metadata.email_thread_id}`,
    tenant_id: metadata.tenant_id,
    actor_id: metadata.actor_id,
    action: "dms.email.thread.file",
    object_type: "DmsEmailThread",
    object_id: metadata.email_thread_id,
    decision: "allow",
    reason: "email_thread_filed_to_matter",
    occurred_at: canonicalText(thread.filing_time, "filing_time"),
    metadata: Object.freeze({
      ...metadata,
      raw_provider_payload_included: false,
      credential_material_included: false,
    }),
  });
}

function importedCanonicalFilingAudit(event, expected) {
  if (!Number.isFinite(Date.parse(event?.created_at))) return false;
  return isDeepStrictEqual(event, {
    tenant_id: expected.tenant_id,
    event_id: expected.event_id,
    action: expected.action,
    actor_id: expected.actor_id,
    object_type: expected.object_type,
    object_id: expected.object_id,
    payload: {
      imported_event_hash: hashDomainValue(expected),
      source_payload_included: false,
    },
    created_at: event.created_at,
  });
}

export function canonicalFilingAudit(repository, thread) {
  let expected;
  try {
    expected = outlookEmailFilingAuditEvent(thread);
  } catch {
    return null;
  }
  const events = repository.listAudit({ tenant_id: expected.tenant_id, object_id: expected.object_id })
    .filter((event) => event.action === expected.action);
  if (events.length !== 1) return null;
  const event = events[0];
  if (importedCanonicalFilingAudit(event, expected)) return event;
  return isDeepStrictEqual(event, expected) ? event : null;
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
