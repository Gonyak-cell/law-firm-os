import assert from "node:assert/strict";
import test from "node:test";

import { createOutlookConversationFilingRuntime } from "../src/outlook-conversation-filing-runtime.js";

test("OUTM-28 filing runtime rechecks current member authority and attributes the service actor", async () => {
  const captured = [];
  const policy = {
    tenant_id: "tenant-outm28-file",
    policy_id: "policy-outm28-file",
    user_id: "user-outm28-file",
    entra_subject_id: "subject-outm28-file",
    m365_connection_id: "connection-outm28-file",
    mailbox_ref: "a".repeat(64),
    matter_id: "matter-outm28-file",
    enabling_actor_id: "user-outm28-file",
  };
  const connection = {
    tenant_id: policy.tenant_id,
    user_id: policy.user_id,
    entra_subject_id: policy.entra_subject_id,
    m365_connection_id: policy.m365_connection_id,
    granted_scopes: ["Mail.Read"],
    expires_at: "2027-08-08T00:00:00.000Z",
    connection_authority: "delegated",
    mailbox_scope: "me",
    revoked_at: null,
  };
  const runtimes = {
    emailDmsRuntime: { repository: { get: () => connection } },
    matterRuntime: { repository: {
      get: () => ({ tenant_id: policy.tenant_id, matter_id: policy.matter_id, status: "open" }),
      list: () => [{ tenant_id: policy.tenant_id, matter_id: policy.matter_id, user_id: policy.user_id, status: "active" }],
    } },
    dmsRuntime: {},
  };
  const runtime = createOutlookConversationFilingRuntime({
    request_runtime_authority: {
      async run(input) { captured.push(["run", input]); return input.command(runtimes); },
    },
    clock: () => new Date("2026-08-08T00:00:00.000Z"),
    file_resolved: async (input) => {
      captured.push(["file", input]);
      return { status: 201, body: { outcome: "created", email_thread: input.resolvedCanonical.thread } };
    },
  });
  const result = await runtime.fileCanonicalMessage({
    policy,
    connection,
    actor_id: "outlook-conversation-sync-service",
    authorized_by_actor_id: "user-outm28-file",
    canonical: {
      rest_message_id: "rest-outm28-file",
      immutable_message_id: "immutable-outm28-file",
      internet_message_id: "<message-outm28-file@example.test>",
      conversation_id: "conversation-outm28-file",
      subject: "Canonical subject",
      sender: { address: "sender@example.test" },
      from: { address: "sender@example.test" },
      recipients: [
        { recipient_type: "to", address: "to@example.test" },
        { recipient_type: "cc", address: "cc@example.test" },
        { recipient_type: "bcc", address: "bcc@example.test" },
      ],
      received_at: "2026-08-08T00:00:02.000Z",
      sent_at: "2026-08-08T00:00:01.000Z",
      folder_kind: "sentitems",
      is_draft: false,
      mailbox_address: "sender@example.test",
      mime_bytes: Buffer.from("From: sender@example.test\r\nTo: to@example.test\r\n\r\nbody"),
    },
  });
  assert.equal(result.outcome, "created");
  const filing = captured.find(([event]) => event === "file")[1];
  assert.equal(filing.filingActorId, "outlook-conversation-sync-service");
  assert.equal(filing.mode, "sent");
  assert.equal(filing.resolvedCanonical.thread.filing_mode, "sent");
  assert.equal(Object.hasOwn(filing.body.email, "graph_message_id"), false);
  assert.deepEqual(
    [
      filing.body.email.canonical_graph_message_id,
      filing.body.email.rest_message_id,
      filing.body.email.internet_message_id,
      filing.body.email.conversation_id,
      filing.body.email.item_key,
    ],
    [
      "immutable-outm28-file",
      "rest-outm28-file",
      "<message-outm28-file@example.test>",
      "conversation-outm28-file",
      "rest-outm28-file\u001f<message-outm28-file@example.test>\u001fconversation-outm28-file",
    ],
  );
  assert.equal(filing.resolvedCanonical.thread.sent_at, "2026-08-08T00:00:01.000Z");
  assert.deepEqual(filing.resolvedCanonical.thread.to.map(({ address }) => address), ["to@example.test"]);
  assert.deepEqual(filing.resolvedCanonical.thread.cc.map(({ address }) => address), ["cc@example.test"]);
  assert.deepEqual(filing.resolvedCanonical.thread.bcc.map(({ address }) => address), ["bcc@example.test"]);
});
