import { createHash } from "node:crypto";
import { createEmailThread } from "./email-model.js";

export const OUTLOOK_EMAIL_FILE_IDEMPOTENCY_OPERATION = "outlook_email_file";
const FILING_MODES = new Set(["manual", "sent"]);
const FILING_OUTCOMES = new Set(["created", "idempotent_replay"]);

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

function canonicalBinding(thread = {}) {
  const filingMode = canonicalText(thread.filing_mode ?? "manual", "filing_mode").toLowerCase();
  if (!FILING_MODES.has(filingMode)) throw new Error("email filing mode is not canonical");
  return Object.freeze({
    tenant_id: canonicalText(thread.tenant_id, "tenant_id"),
    matter_id: canonicalText(thread.matter_id, "matter_id"),
    email_thread_id: canonicalText(thread.email_thread_id, "email_thread_id"),
    graph_message_id: canonicalText(thread.graph_message_id, "graph_message_id"),
    internet_message_id: canonicalText(thread.internet_message_id, "internet_message_id").toLowerCase(),
    conversation_id: canonicalText(thread.conversation_id, "conversation_id"),
    filing_mode: filingMode,
    filed_document_ids: Object.freeze(canonicalDocumentIds(thread)),
  });
}

export function outlookEmailFileRequestFingerprint(thread = {}) {
  const binding = canonicalBinding(thread);
  return createHash("sha256")
    .update(JSON.stringify({ schema: "outlook-email-file:v1", operation: OUTLOOK_EMAIL_FILE_IDEMPOTENCY_OPERATION, ...binding }))
    .digest("hex");
}

function sameDocumentIds(left, right) {
  return Array.isArray(left)
    && Array.isArray(right)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function assertCanonicalIdempotencyKey(key, thread) {
  const value = canonicalText(key, "idempotency_key");
  const prefix = `outlook-email-file:${canonicalText(thread.email_thread_id, "email_thread_id")}:`;
  if (!value.startsWith(prefix) || !value.endsWith(":dms")) {
    throw new Error("email filing idempotency key is not canonical");
  }
  return value;
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

export function fileEmailThreadToMatter({
  repository,
  thread,
  actor_id,
  audit,
  require_original_mime_document = false,
  idempotency_key,
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
  assertCanonicalIdempotencyKey(idempotency_key, thread);
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
      const existingAudits = tx.listAudit({
        tenant_id: pending.tenant_id,
        object_id: pending.email_thread_id,
      }).filter((event) => event.action === "dms.email.thread.file");
      if (existingAudits.length > 1) {
        throw new Error("active email filing has conflicting audit records");
      }
      const existingAudit = existingAudits[0];
      if (!existingAudit) {
        throw new Error("active email filing is missing its immutable audit record");
      }
      if (
        existingAudit.actor_id !== pending.filing_user
        || existingAudit.occurred_at !== pending.filing_time
        || existingAudit.object_type !== "DmsEmailThread"
        || existingAudit.decision !== "allow"
        || existingAudit.reason !== "email_thread_filed_to_matter"
      ) {
        throw new Error("active email filing audit conflicts with the persisted thread");
      }
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
