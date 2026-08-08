import assert from "node:assert/strict";
import test from "node:test";

import { createConversationSyncRepository, createGraphNotificationQueue } from "../../../packages/email-dms/src/index.js";
import { createOutlookConversationSyncWorker } from "../src/outlook-conversation-sync-worker.js";

function fixture(conversationId = "conversation-outm27", { isDraft = false } = {}) {
  const repository = createConversationSyncRepository();
  repository.transaction((state) => {
    state.policies.push({ tenant_id: "tenant-outm27", policy_id: "policy-outm27", user_id: "user-outm27", m365_connection_id: "connection-outm27", matter_id: "matter-outm27", conversation_id: "conversation-outm27", status: "active", enabling_actor_id: "user-outm27" });
    state.subscriptions.push({ tenant_id: "tenant-outm27", subscription_id: "subscription-outm27", provider_subscription_id: "provider-outm27", m365_connection_id: "connection-outm27", resource: "me/mailFolders('inbox')/messages", status: "active" });
  });
  const queue = createGraphNotificationQueue({ repository });
  queue.enqueue({ tenant_id: "tenant-outm27", subscription_id: "subscription-outm27", provider_subscription_id: "provider-outm27", resource: "me/mailFolders('inbox')/messages", message_id: "message-outm27", change_type: "created", source: "webhook", received_at: "2026-08-08T00:00:00.000Z" });
  const calls = [];
  const worker = createOutlookConversationSyncWorker({
    repository,
    queue,
    canonical_message_source: {
      async getOwnMessage({ message_id: messageId }) { return { immutable_message_id: messageId, internet_message_id: `<${messageId}@example.invalid>`, conversation_id: conversationId, is_draft: isDraft, is_in_sent_items: false, mime_bytes: Buffer.from("From: outm27@example.invalid\r\n\r\nbody") }; },
    },
    filing_adapter: { async fileCanonicalMessage(input) { calls.push(input); return { outcome: "created", email_thread_id: "thread-outm27" }; } },
    connection_principal_lookup: () => ({ tenant_id: "tenant-outm27", user_id: "user-outm27", entra_subject_id: "subject-outm27" }),
    matter_access: () => true,
  });
  return { calls, queue, repository, worker };
}

test("OUTM-27 worker files only a canonical message matching one active explicit conversation policy", async () => {
  const runtime = fixture();
  const result = await runtime.worker.processBatch({ worker_id: "worker-outm27", limit: 10 });
  assert.equal(result.completed, 1);
  assert.equal(runtime.calls.length, 1);
  assert.equal(runtime.calls[0].policy.matter_id, "matter-outm27");
  assert.equal(runtime.repository.snapshot().jobs[0].status, "completed");
  assert.equal((await runtime.worker.processBatch({ worker_id: "worker-outm27", limit: 10 })).claimed, 0);
});

test("OUTM-27 worker safely completes a future message outside the enabled conversation without filing", async () => {
  const runtime = fixture("conversation-not-enabled");
  const result = await runtime.worker.processBatch({ worker_id: "worker-outm27", limit: 10 });
  assert.equal(result.ignored, 1);
  assert.equal(runtime.calls.length, 0);
  assert.equal(runtime.repository.snapshot().jobs[0].result_code, "conversation_not_enabled");
});

test("OUTM-27 worker never files draft messages", async () => {
  const runtime = fixture(undefined, { isDraft: true });
  const result = await runtime.worker.processBatch({ worker_id: "worker-outm27", limit: 10 });
  assert.equal(result.ignored, 1);
  assert.equal(runtime.calls.length, 0);
  assert.equal(runtime.repository.snapshot().jobs[0].result_code, "draft_not_filed");
});

test("OUTM-27 worker rechecks the policy after Graph fetch and never files after revocation", async () => {
  // Given
  const runtime = fixture();
  runtime.worker = createOutlookConversationSyncWorker({
    repository: runtime.repository,
    queue: runtime.queue,
    canonical_message_source: {
      async getOwnMessage() {
        runtime.repository.transaction((state) => { state.policies[0].status = "revoked"; });
        return { immutable_message_id: "message-outm27", internet_message_id: "<outm27@example.invalid>", conversation_id: "conversation-outm27", is_draft: false, is_in_sent_items: false, mime_bytes: Buffer.from("From: outm27@example.invalid\r\n\r\nbody") };
      },
    },
    filing_adapter: { async fileCanonicalMessage(input) { runtime.calls.push(input); return { outcome: "created" }; } },
    connection_principal_lookup: () => ({ tenant_id: "tenant-outm27", user_id: "user-outm27", entra_subject_id: "subject-outm27" }),
    matter_access: () => true,
  });

  // When
  const result = await runtime.worker.processBatch({ worker_id: "worker-outm27", limit: 1 });

  // Then
  assert.equal(result.ignored, 1);
  assert.equal(runtime.calls.length, 0);
  assert.equal(runtime.repository.snapshot().jobs[0].result_code, "conversation_not_enabled");
});

test("OUTM-27 worker files duplicate-free messages without relying on notification order", async () => {
  // Given
  const runtime = fixture();
  runtime.queue.enqueue({
    tenant_id: "tenant-outm27",
    subscription_id: "subscription-outm27",
    provider_subscription_id: "provider-outm27",
    resource: "me/mailFolders('inbox')/messages",
    message_id: "message-arrived-out-of-order",
    change_type: "created",
    source: "webhook",
    received_at: "2026-08-07T23:59:00.000Z",
  });

  // When
  const result = await runtime.worker.processBatch({ worker_id: "worker-outm27", limit: 10 });

  // Then
  assert.equal(result.completed, 2);
  assert.deepEqual(
    runtime.calls.map(({ canonical }) => canonical.immutable_message_id).sort(),
    ["message-arrived-out-of-order", "message-outm27"],
  );
  assert.equal(runtime.repository.snapshot().jobs.filter(({ status }) => status === "completed").length, 2);
});
