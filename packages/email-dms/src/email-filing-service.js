import { createEmailThread } from "./email-model.js";

export function fileEmailThreadToMatter({ repository, thread, actor_id, audit } = {}) {
  const existing = repository.get({
    tenant_id: thread.tenant_id,
    model_type: "DmsEmailThread",
    email_thread_id: thread.email_thread_id,
  });
  if (existing) return Object.freeze({ outcome: "idempotent_replay", thread: existing });
  const record = createEmailThread(thread);
  const persisted = repository.create({ ...record, model_type: "DmsEmailThread" });
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
