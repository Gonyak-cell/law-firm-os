const RESOURCE_FOLDERS = Object.freeze({
  "me/mailFolders('inbox')/messages": "inbox",
  "me/mailFolders('sentitems')/messages": "sentitems",
});

function permanent(message) {
  return Object.assign(new Error(message), {
    safe_error_code: "OUTLOOK_CANONICAL_MESSAGE_PROVENANCE_INVALID",
    permanent: true,
  });
}
function present(value) {
  return typeof value === "string" && value.trim() !== "";
}

export function createOutlookConversationCanonicalMessageSource({ mail_port } = {}) {
  if (typeof mail_port?.getOwnMessageMime !== "function") throw new TypeError("M365 mail port is required");
  return Object.freeze({
    async getOwnMessage(input = {}) {
      const expectedFolder = RESOURCE_FOLDERS[input.resource];
      if (!expectedFolder) throw permanent("Graph subscription resource is invalid");
      const result = await mail_port.getOwnMessageMime({
        ...input,
        rest_message_id: input.message_id,
      });
      const metadata = result?.message_metadata;
      if (
        result?.immutable_message_id !== input.message_id
        || !Buffer.isBuffer(result?.mime_bytes)
        || result.mime_bytes.byteLength === 0
        || !present(result.internet_message_id)
        || !present(metadata?.conversation_id)
        || !present(metadata?.subject)
        || !present(metadata?.received_at)
        || !present(metadata?.sent_at)
        || metadata?.folder_kind !== expectedFolder
        || metadata?.is_in_sent_items !== (expectedFolder === "sentitems")
        || typeof metadata?.is_draft !== "boolean"
      ) {
        throw permanent("Canonical Graph message identity or folder provenance is invalid");
      }
      return Object.freeze({
        immutable_message_id: result.immutable_message_id,
        internet_message_id: result.internet_message_id,
        conversation_id: metadata.conversation_id,
        subject: metadata.subject,
        sender: metadata.sender ?? null,
        from: metadata.from ?? null,
        recipients: Object.freeze([...(metadata.recipients ?? [])]),
        received_at: metadata.received_at,
        sent_at: metadata.sent_at,
        folder_kind: metadata.folder_kind,
        is_in_sent_items: metadata.is_in_sent_items,
        is_draft: metadata.is_draft,
        has_attachments: metadata.has_attachments === true,
        mailbox_address: result.mailbox_address,
        mime_bytes: result.mime_bytes,
      });
    },
  });
}
