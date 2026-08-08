import { createEmailThread } from "./email-model.js";
import {
  OUTLOOK_EMAIL_FILE_IDEMPOTENCY_OPERATION,
  assertCanonicalIdempotencyKey,
  canonicalFilingAudit,
  filingAuditMetadata,
  outlookEmailFileRequestFingerprint,
  validateOutlookEmailFileIdempotency,
} from "./email-filing-canonical.js";

export { OUTLOOK_EMAIL_FILE_IDEMPOTENCY_OPERATION, canonicalFilingAudit, outlookEmailFileRequestFingerprint, validateOutlookEmailFileIdempotency } from "./email-filing-canonical.js";

export function fileEmailThreadToMatter({
  repository,
  thread,
  actor_id,
  audit,
  require_original_mime_document = false,
  idempotency_key,
  durable_mime_document,
} = {}) {
  const existing = repository.get({
    tenant_id: thread.tenant_id,
    model_type: "DmsEmailThread",
    email_thread_id: thread.email_thread_id,
  });
  if (!require_original_mime_document) {
    if (existing) return Object.freeze({ outcome: "idempotent_replay", thread: existing });
    const persisted = repository.create({
      ...createEmailThread(thread),
      model_type: "DmsEmailThread",
    });
    audit?.append?.({
      tenant_id: persisted.tenant_id,
      actor_id,
      action: "dms.email.thread.file",
      object_type: "DmsEmailThread",
      object_id: persisted.email_thread_id,
      decision: "allow",
      reason: "email_thread_filed_to_matter",
    });
    return Object.freeze({ outcome: "created", thread: persisted });
  }
  if (typeof idempotency_key !== "string" || idempotency_key.trim() === "") {
    throw new TypeError("original MIME email filing requires idempotency_key");
  }
  assertCanonicalIdempotencyKey(idempotency_key, existing ?? thread, repository, durable_mime_document);
  const replay = repository.getIdempotency({
    tenant_id: thread.tenant_id,
    idempotency_key,
  });
  if (replay) {
    if (
      !existing
      || existing.status !== "active"
      || (() => {
        try {
          return outlookEmailFileRequestFingerprint(thread) !== outlookEmailFileRequestFingerprint(existing);
        } catch {
          return true;
        }
      })()
    ) {
      throw new Error("email filing idempotency entry conflicts with the persisted thread");
    }
    const binding = validateOutlookEmailFileIdempotency({ entry: replay, thread: existing });
    if (!binding.valid) throw new Error("email filing idempotency receipt is not canonically bound");
    if (!canonicalFilingAudit(repository, existing)) throw new Error("email filing receipt lacks canonical filing audit");
    repository.recordIdempotency({
      tenant_id: thread.tenant_id,
      idempotency_key,
      operation: OUTLOOK_EMAIL_FILE_IDEMPOTENCY_OPERATION,
      request_fingerprint: binding.request_fingerprint,
      response: {
        outcome: "idempotent_replay",
        email_thread_id: existing.email_thread_id,
        matter_id: existing.matter_id,
        filed_document_ids: existing.filed_document_ids,
      },
      created_at: replay.created_at,
    });
    return Object.freeze({ outcome: "idempotent_replay", thread: existing });
  }
  const pending = existing ?? repository.create({
    ...createEmailThread({ ...thread, status: "draft" }),
    model_type: "DmsEmailThread",
  });
  if (!Array.isArray(pending.filed_document_ids) || pending.filed_document_ids.length === 0) {
    throw new Error("pending email thread requires an original MIME document link");
  }
  const appendAudit = (writer) => {
    if (typeof audit?.append !== "function") {
      throw new Error("original MIME email filing requires an audit writer");
    }
    return audit.append({
      tenant_id: pending.tenant_id,
      actor_id,
      action: "dms.email.thread.file",
      object_type: "DmsEmailThread",
      object_id: pending.email_thread_id,
      decision: "allow",
      reason: "email_thread_filed_to_matter",
      metadata: filingAuditMetadata(pending),
    }, writer);
  };
  if (typeof repository.transaction !== "function") {
    throw new Error("original MIME email filing requires an atomic repository transaction");
  }
  const persistIdempotency = (tx, persisted, outcome) => tx.recordIdempotency({
    tenant_id: persisted.tenant_id,
    idempotency_key,
    operation: OUTLOOK_EMAIL_FILE_IDEMPOTENCY_OPERATION,
    request_fingerprint: outlookEmailFileRequestFingerprint(persisted),
    response: {
      outcome,
      email_thread_id: persisted.email_thread_id,
      matter_id: persisted.matter_id,
      filed_document_ids: persisted.filed_document_ids,
    },
    created_at: persisted.filing_time,
  });
  if (pending.status === "active") {
    repository.transaction((tx) => {
      if (!canonicalFilingAudit(tx, pending)) throw new Error("active email filing audit conflicts with the persisted thread");
      persistIdempotency(tx, pending, "idempotent_replay");
    });
    return Object.freeze({ outcome: "idempotent_replay", thread: pending });
  }
  if (pending.status !== "draft") throw new Error("email thread is not recoverable");
  const finalize = (tx) => {
    const persisted = tx.update({
      tenant_id: pending.tenant_id,
      model_type: "DmsEmailThread",
      email_thread_id: pending.email_thread_id,
    }, { status: "active" });
    appendAudit(tx);
    persistIdempotency(tx, persisted, "created");
    return persisted;
  };
  const persisted = repository.transaction(finalize);
  return Object.freeze({ outcome: "created", thread: persisted });
}
