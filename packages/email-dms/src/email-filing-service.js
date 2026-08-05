import { createEmailThread } from "./email-model.js";

export function fileEmailThreadToMatter({
  repository,
  thread,
  actor_id,
  audit,
  require_original_mime_document = false,
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
  const pending = existing ?? repository.create({
    ...createEmailThread({ ...thread, status: "draft" }),
    model_type: "DmsEmailThread",
  });
  if (!Array.isArray(pending.filed_document_ids) || pending.filed_document_ids.length === 0) {
    throw new Error("pending email thread requires an original MIME document link");
  }
  const appendAudit = () => {
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
    });
  };
  if (pending.status === "active") {
    appendAudit();
    return Object.freeze({ outcome: "idempotent_replay", thread: pending });
  }
  if (pending.status !== "draft") throw new Error("email thread is not recoverable");
  const finalize = (tx) => {
    appendAudit();
    return tx.update({
      tenant_id: pending.tenant_id,
      model_type: "DmsEmailThread",
      email_thread_id: pending.email_thread_id,
    }, { status: "active" });
  };
  if (typeof repository.transaction !== "function") {
    throw new Error("original MIME email filing requires an atomic repository transaction");
  }
  const persisted = repository.transaction(finalize);
  return Object.freeze({ outcome: "created", thread: persisted });
}
