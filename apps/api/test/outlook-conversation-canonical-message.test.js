import assert from "node:assert/strict";
import test from "node:test";

import { createOutlookConversationCanonicalMessageSource } from "../src/outlook-conversation-canonical-message.js";

const MIME = Buffer.from("From: sender@example.test\r\nTo: recipient@example.test\r\n\r\nbody");

function result(overrides = {}) {
  return {
    immutable_message_id: "message-outm28",
    internet_message_id: "<message-outm28@example.test>",
    mailbox_address: "owner@example.test",
    mime_bytes: MIME,
    message_metadata: {
      conversation_id: "conversation-outm28",
      subject: "Canonical message",
      sender: { address: "sender@example.test" },
      from: { address: "from@example.test" },
      recipients: [{ address: "recipient@example.test", recipient_type: "to" }],
      received_at: "2026-08-08T00:00:00.000Z",
      sent_at: "2026-08-07T23:59:00.000Z",
      folder_kind: "inbox",
      is_in_sent_items: false,
      is_draft: false,
      ...overrides,
    },
  };
}

test("OUTM-28 canonical source preserves recipients and exact Inbox provenance", async () => {
  const calls = [];
  const source = createOutlookConversationCanonicalMessageSource({
    mail_port: { async getOwnMessageMime(input) { calls.push(input); return result(); } },
  });
  const canonical = await source.getOwnMessage({
    tenant_id: "tenant-outm28",
    user_id: "user-outm28",
    entra_subject_id: "subject-outm28",
    message_id: "message-outm28",
    resource: "me/mailFolders('inbox')/messages",
  });
  assert.equal(calls[0].rest_message_id, "message-outm28");
  assert.equal(canonical.folder_kind, "inbox");
  assert.equal(canonical.received_at, "2026-08-08T00:00:00.000Z");
  assert.equal(canonical.sent_at, "2026-08-07T23:59:00.000Z");
  assert.deepEqual(canonical.recipients, [{ address: "recipient@example.test", recipient_type: "to" }]);
  assert.equal(canonical.mime_bytes.equals(MIME), true);
});

test("OUTM-28 canonical source accepts exact Sent Items provenance and rejects folder drift", async () => {
  const sent = createOutlookConversationCanonicalMessageSource({
    mail_port: { async getOwnMessageMime() { return result({ folder_kind: "sentitems", is_in_sent_items: true }); } },
  });
  assert.equal((await sent.getOwnMessage({
    message_id: "message-outm28",
    resource: "me/mailFolders('sentitems')/messages",
  })).folder_kind, "sentitems");

  for (const [resource, metadata] of [
    ["me/mailFolders('inbox')/messages", { folder_kind: "sentitems", is_in_sent_items: true }],
    ["me/mailFolders('sentitems')/messages", { folder_kind: "inbox", is_in_sent_items: false }],
    ["me/mailFolders('inbox')/messages", { folder_kind: "other", is_in_sent_items: false }],
    ["me/mailFolders('inbox')/messages", { sent_at: null }],
  ]) {
    const source = createOutlookConversationCanonicalMessageSource({
      mail_port: { async getOwnMessageMime() { return result(metadata); } },
    });
    await assert.rejects(
      source.getOwnMessage({ message_id: "message-outm28", resource }),
      (error) => error.safe_error_code === "OUTLOOK_CANONICAL_MESSAGE_PROVENANCE_INVALID" && error.permanent === true,
    );
  }
});
