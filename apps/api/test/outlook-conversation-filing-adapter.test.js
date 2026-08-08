import assert from "node:assert/strict";
import test from "node:test";

import { createDmsRepository } from "../../../packages/dms/src/repository.js";
import { createEmailThread } from "../../../packages/email-dms/src/email-model.js";
import { createOutlookConversationFilingAdapter } from "../src/outlook-conversation-filing-adapter.js";

test("OUTM-27 canonical MIME adapter stages one immutable draft then delegates finalization to fileEmailThreadToMatter", async () => {
  // Given
  const repository = createDmsRepository();
  const stageCalls = [];
  const adapter = createOutlookConversationFilingAdapter({
    dms_repository: repository,
    async stage_original_mime({ thread, mime_bytes }) {
      stageCalls.push({ thread, mime_bytes });
      const existing = repository.get({ tenant_id: thread.tenant_id, model_type: "DmsEmailThread", email_thread_id: thread.email_thread_id });
      return existing ?? repository.create({ ...createEmailThread({ ...thread, status: "draft", filed_document_ids: ["document-original-mime-outm27"] }), model_type: "DmsEmailThread" });
    },
  });
  const input = {
    policy: { tenant_id: "tenant-outm27", matter_id: "matter-outm27", conversation_id: "conversation-outm27", mailbox_ref: "mailbox-outm27", m365_connection_id: "connection-outm27" },
    canonical: {
      immutable_message_id: "message-outm27",
      internet_message_id: "<outm27@example.invalid>",
      conversation_id: "conversation-outm27",
      subject: "OUTM-27 filing",
      sender: { address: "sender@example.invalid" },
      recipients: [{ address: "recipient@example.invalid", recipient_type: "to" }],
      received_at: "2026-08-08T00:00:00.000Z",
      is_in_sent_items: false,
      is_draft: false,
      mime_bytes: Buffer.from("From: sender@example.invalid\r\n\r\nbody"),
    },
    actor_id: "worker-outm27",
  };

  // When
  const first = await adapter.fileCanonicalMessage(input);
  const replay = await adapter.fileCanonicalMessage(input);

  // Then
  assert.equal(first.outcome, "created");
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(stageCalls.length, 2);
  assert.equal(repository.get({ tenant_id: "tenant-outm27", model_type: "DmsEmailThread", email_thread_id: first.email_thread_id }).status, "active");
  assert.equal(repository.listAudit({ tenant_id: "tenant-outm27", object_id: first.email_thread_id }).length, 1);
});

test("OUTM-27 adapter rejects Graph identity drift before staging MIME", async () => {
  let staged = false;
  const adapter = createOutlookConversationFilingAdapter({ dms_repository: createDmsRepository(), stage_original_mime: async () => { staged = true; } });
  await assert.rejects(adapter.fileCanonicalMessage({
    policy: { tenant_id: "tenant-outm27", matter_id: "matter-outm27", conversation_id: "conversation-outm27", mailbox_ref: "mailbox-outm27", m365_connection_id: "connection-outm27" },
    canonical: { immutable_message_id: "message-outm27", internet_message_id: "<outm27@example.invalid>", conversation_id: "different-conversation", subject: "drift", mime_bytes: Buffer.from("mime") },
    actor_id: "worker-outm27",
  }), /conversation identity does not match/u);
  assert.equal(staged, false);
});
