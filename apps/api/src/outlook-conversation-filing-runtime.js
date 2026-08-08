import { createHash } from "node:crypto";
import { createSafeInquiryDisplayCopy } from "../../../packages/email-dms/src/inquiry-evidence-storage-service.js";
import { fileResolvedCanonicalOutlookEmail } from "./outlook-addin-runtime-context.js";
import { verifyConversationWorkerAuthority } from "./outlook-conversation-current-authority.js";

const SERVICE_ACTOR = "outlook-conversation-sync-service";

function digest(value) {
  return createHash("sha256").update(value).digest("hex");
}

function resolvedMessage(policy, canonical, clock) {
  const mime = Buffer.from(canonical.mime_bytes);
  const mimeSha256 = digest(mime);
  const messageRef = digest(canonical.immutable_message_id);
  const attachments = createSafeInquiryDisplayCopy({
    mime_bytes: mime,
    message_metadata: {
      subject: canonical.subject,
      sender: canonical.sender ?? canonical.from,
      recipients: canonical.recipients,
      received_at: canonical.received_at,
    },
    max_display_bytes: 1,
  }).attachment_manifest.map((attachment, index) => Object.freeze({
    attachment_id: `mime:${index}:${attachment.sha256}`,
    name: attachment.file_name,
    content_type: attachment.mime_type,
    size: attachment.byte_size,
    sha256: attachment.sha256,
    source_provenance: Object.freeze({
      authority: "microsoft_graph_mime",
      sha256: attachment.sha256,
      byte_size: attachment.byte_size,
      message_ref: messageRef,
      provider_request_ref: null,
      occurrence: index,
      raw_bytes_included: false,
    }),
  }));
  const at = clock().toISOString();
  const recipients = (kind) => canonical.recipients.filter(({ recipient_type: type }) => type === kind);
  const emailThreadId = `thread:${digest(JSON.stringify([
    policy.tenant_id,
    canonical.immutable_message_id.normalize("NFKC"),
    canonical.internet_message_id.normalize("NFKC").toLowerCase(),
  ]))}`;
  const thread = Object.freeze({
    tenant_id: policy.tenant_id,
    matter_id: policy.matter_id,
    email_thread_id: emailThreadId,
    email_id: `email:${digest(canonical.immutable_message_id).slice(0, 32)}`,
    graph_message_id: canonical.immutable_message_id,
    internet_message_id: canonical.internet_message_id,
    conversation_id: canonical.conversation_id,
    subject: canonical.subject,
    from: canonical.from ?? {},
    to: recipients("to"),
    cc: recipients("cc"),
    bcc: recipients("bcc"),
    body_ref: `sha256:${mimeSha256}`,
    body_preview: "",
    sent_at: canonical.sent_at,
    received_at: canonical.received_at,
    mailbox_ref: policy.mailbox_ref,
    account_ref: policy.m365_connection_id,
    attachment_metadata: Object.freeze(attachments),
    filing_user: SERVICE_ACTOR,
    filing_time: at,
    filing_mode: "automatic_conversation",
    confidentiality: "internal",
    privilege: "undetermined",
    ai_processed: false,
    message_ids: Object.freeze([canonical.immutable_message_id, canonical.internet_message_id]),
  });
  return Object.freeze({
    thread,
    mime_bytes: mime,
    mime_sha256: mimeSha256,
    mailbox_address: canonical.mailbox_address,
    sender_address: canonical.sender?.address ?? null,
    from_address: canonical.from?.address ?? null,
    is_in_sent_items: canonical.folder_kind === "sentitems",
    is_draft: canonical.is_draft,
  });
}

export function createOutlookConversationFilingRuntime({
  request_runtime_authority,
  clock = () => new Date(),
  file_resolved = fileResolvedCanonicalOutlookEmail,
} = {}) {
  if (typeof request_runtime_authority?.run !== "function" || typeof file_resolved !== "function") {
    throw new TypeError("Outlook conversation filing runtime dependencies are required");
  }
  return Object.freeze({
    async fileCanonicalMessage({ policy, canonical, connection, actor_id, authorized_by_actor_id } = {}) {
      if (actor_id !== SERVICE_ACTOR || authorized_by_actor_id !== policy?.enabling_actor_id) {
        throw Object.assign(new Error("conversation filing service authority is invalid"), { permanent: true });
      }
      const resolvedCanonical = resolvedMessage(policy, canonical, clock);
      return request_runtime_authority.run({
        tenant_id: policy.tenant_id,
        request_context: { method: "POST", pathname: "/internal/outlook/conversation-sync", actor_id: SERVICE_ACTOR },
        command: async (runtimes) => {
          const authority = verifyConversationWorkerAuthority({ runtimes, policy, connection, clock });
          if (!authority.allowed) throw Object.assign(new Error(authority.reason), { safe_error_code: "OUTLOOK_CONVERSATION_AUTHORITY_CHANGED" });
          const context = Object.freeze({
            principal: Object.freeze({ tenant_id: policy.tenant_id, user_id: policy.user_id, entra_subject_id: policy.entra_subject_id }),
            rules: Object.freeze([Object.freeze({ id: "outlook-conversation-current-matter-member", effect: "allow", action: "outlook:email:file" })]),
            object_acl: Object.freeze([]),
          });
          const result = await file_resolved({
            body: { tenant_id: policy.tenant_id, matter_id: policy.matter_id, email: resolvedCanonical.thread },
            context,
            requestId: `outlook-conversation:${canonical.immutable_message_id}`,
            runtime: runtimes,
            mode: canonical.folder_kind === "sentitems" ? "sent" : "automatic",
            resolvedCanonical,
            filingActorId: SERVICE_ACTOR,
          });
          if (!result || result.status < 200 || result.status >= 300) {
            throw Object.assign(new Error("canonical conversation filing failed"), { safe_error_code: result?.body?.safe_error_codes?.[0] ?? "OUTLOOK_CONVERSATION_FILING_FAILED" });
          }
          return Object.freeze({ outcome: result.body.outcome, email_thread_id: result.body.email_thread.email_thread_id });
        },
      });
    },
  });
}
