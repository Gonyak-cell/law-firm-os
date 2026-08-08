export function createOutlookConversationCanonicalSource({ mail_port } = {}) {
  if (typeof mail_port?.getOwnMessageMime !== "function") throw new TypeError("M365 mail port is required");
  return Object.freeze({
    async getOwnMessage(input = {}) {
      const result = await mail_port.getOwnMessageMime({ ...input, rest_message_id: input.message_id });
      if (result.immutable_message_id !== input.message_id || !Buffer.isBuffer(result.mime_bytes) || result.mime_bytes.byteLength === 0 || !result.internet_message_id || !result.message_metadata?.conversation_id || typeof result.message_metadata.is_in_sent_items !== "boolean" || typeof result.message_metadata.is_draft !== "boolean") {
        throw Object.assign(new Error("Canonical Graph message identity is invalid"), { safe_error_code: "OUTLOOK_CANONICAL_MESSAGE_IDENTITY_INVALID", permanent: true });
      }
      return Object.freeze({
        immutable_message_id: result.immutable_message_id,
        internet_message_id: result.internet_message_id,
        conversation_id: result.message_metadata.conversation_id,
        subject: result.message_metadata.subject || "Outlook message",
        sender: result.message_metadata.from ?? result.message_metadata.sender ?? {},
        recipients: result.message_metadata.recipients ?? [],
        received_at: result.message_metadata.received_at,
        is_in_sent_items: result.message_metadata.is_in_sent_items,
        is_draft: result.message_metadata.is_draft,
        mailbox_address: result.mailbox_address,
        mime_bytes: result.mime_bytes,
      });
    },
  });
}
