import { createHash } from "node:crypto";
import { createEmailThread } from "../../../packages/email-dms/src/email-model.js";
import { fileEmailThreadToMatter } from "../../../packages/email-dms/src/email-filing-service.js";

function text(value, field) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function threadId(canonical, tenantId) {
  return `thread:${createHash("sha256").update(JSON.stringify([tenantId, canonical.immutable_message_id, canonical.internet_message_id])).digest("hex")}`;
}

export function createOutlookConversationFilingAdapter({ dms_repository, stage_original_mime } = {}) {
  if (!dms_repository || typeof stage_original_mime !== "function") throw new TypeError("canonical MIME filing dependencies are required");
  async function fileCanonicalMessage({ policy, canonical, actor_id } = {}) {
    const tenantId = text(policy?.tenant_id, "policy.tenant_id");
    const matterId = text(policy?.matter_id, "policy.matter_id");
    const conversationId = text(canonical?.conversation_id, "canonical.conversation_id");
    if (conversationId !== text(policy?.conversation_id, "policy.conversation_id")) throw Object.assign(new Error("Canonical conversation identity does not match its filing policy"), { permanent: true });
    const graphId = text(canonical?.immutable_message_id, "canonical.immutable_message_id");
    const internetId = text(canonical?.internet_message_id, "canonical.internet_message_id");
    if (canonical?.is_draft !== false || typeof canonical?.is_in_sent_items !== "boolean") throw Object.assign(new Error("Canonical Graph message provenance is invalid"), { permanent: true });
    if (!Buffer.isBuffer(canonical?.mime_bytes) || canonical.mime_bytes.byteLength === 0) throw new TypeError("canonical MIME bytes are required");
    const id = threadId(canonical, tenantId);
    const to = (canonical.recipients ?? []).filter(({ recipient_type: type }) => (type ?? "to") === "to");
    const cc = (canonical.recipients ?? []).filter(({ recipient_type: type }) => type === "cc");
    const bcc = (canonical.recipients ?? []).filter(({ recipient_type: type }) => type === "bcc");
    const thread = createEmailThread({
      tenant_id: tenantId, matter_id: matterId, email_thread_id: id,
      graph_message_id: graphId, internet_message_id: internetId,
      conversation_id: conversationId, subject: text(canonical?.subject, "canonical.subject"),
      from: canonical.sender ?? {}, to, cc, bcc,
      received_at: canonical.received_at, sent_at: canonical.received_at,
      mailbox_ref: policy.mailbox_ref, account_ref: policy.m365_connection_id,
      filing_user: actor_id, filing_mode: "conversation_auto",
    });
    const mimeHash = createHash("sha256").update(canonical.mime_bytes).digest("hex");
    const staged = await stage_original_mime({ policy, canonical, thread, mime_bytes: canonical.mime_bytes, mime_sha256: mimeHash, actor_id, idempotency_key: `outlook-conversation-mime:${id}:${mimeHash}` });
    const pending = staged?.thread ?? staged;
    if (!pending || pending.email_thread_id !== id || pending.tenant_id !== tenantId || pending.matter_id !== matterId || pending.status !== "draft" && pending.status !== "active" || pending.conversation_id !== conversationId || pending.graph_message_id !== graphId || pending.internet_message_id !== internetId || pending.filed_document_ids?.length !== 1) {
      throw new Error("staged canonical MIME thread is invalid");
    }
    const result = fileEmailThreadToMatter({
      repository: dms_repository,
      thread: pending,
      actor_id,
      require_original_mime_document: true,
      idempotency_key: `outlook-conversation-file:${id}:${mimeHash}`,
      audit: { append: (event, writer = dms_repository) => writer.appendAudit({ ...event, event_id: `outlook.conversation.file:${tenantId}:${id}`, occurred_at: pending.filing_time }) },
    });
    return Object.freeze({ outcome: result.outcome, email_thread_id: result.thread.email_thread_id, thread: result.thread });
  }
  return Object.freeze({ fileCanonicalMessage });
}
