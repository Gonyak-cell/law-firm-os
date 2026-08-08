import assert from "node:assert/strict";
import test from "node:test";

import { createOutlookConversationCanonicalSource } from "../src/outlook-conversation-canonical-source.js";

function providerResult(overrides = {}) {
  return {
    immutable_message_id: "message-outm27",
    internet_message_id: "<message-outm27@example.invalid>",
    mailbox_address: "user@example.invalid",
    mime_bytes: Buffer.from("From: user@example.invalid\r\n\r\nbody"),
    message_metadata: {
      conversation_id: "conversation-outm27",
      subject: "Canonical message",
      sender: { address: "user@example.invalid" },
      recipients: [],
      received_at: "2026-08-08T00:00:00.000Z",
      is_in_sent_items: true,
      is_draft: false,
      ...overrides,
    },
  };
}

test("OUTM-27 canonical source uses the existing own-mailbox MIME port and preserves provenance", async () => {
  // Given
  const calls = [];
  const source = createOutlookConversationCanonicalSource({
    mail_port: {
      async getOwnMessageMime(input) {
        calls.push(input);
        return providerResult();
      },
    },
  });

  // When
  const result = await source.getOwnMessage({
    tenant_id: "tenant-outm27",
    user_id: "user-outm27",
    entra_subject_id: "subject-outm27",
    message_id: "message-outm27",
  });

  // Then
  assert.equal(calls[0].rest_message_id, "message-outm27");
  assert.equal(result.immutable_message_id, "message-outm27");
  assert.equal(result.conversation_id, "conversation-outm27");
  assert.equal(result.is_in_sent_items, true);
  assert.equal(result.is_draft, false);
  assert.equal(result.mime_bytes.toString("utf8").includes("body"), true);
});

test("OUTM-27 canonical source rejects identity and provenance drift", async () => {
  for (const result of [
    providerResult({ is_draft: null }),
    { ...providerResult(), immutable_message_id: "changed-message-id" },
  ]) {
    const source = createOutlookConversationCanonicalSource({ mail_port: { async getOwnMessageMime() { return result; } } });
    await assert.rejects(
      source.getOwnMessage({ message_id: "message-outm27" }),
      (error) => error.safe_error_code === "OUTLOOK_CANONICAL_MESSAGE_IDENTITY_INVALID" && error.permanent === true,
    );
  }
});
