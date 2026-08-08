import assert from "node:assert/strict";
import test from "node:test";

import {
  createConversationSyncRepository,
  createGraphDeltaReconciliationService,
  createGraphNotificationQueue,
} from "../src/index.js";

const RESOURCE = "me/mailFolders('inbox')/messages";
const PRINCIPAL = Object.freeze({ tenant_id: "tenant-outm27", user_id: "user-outm27", entra_subject_id: "subject-outm27", m365_connection_id: "connection-outm27" });

function stateFixture(repository) {
  repository.transaction((state) => {
    state.policies.push({
      tenant_id: "tenant-outm27",
      user_id: "user-outm27",
      m365_connection_id: "connection-outm27",
      conversation_id: "conversation-outm27",
      status: "active",
    });
    state.subscriptions.push({
      tenant_id: "tenant-outm27",
      subscription_id: "subscription-outm27",
      provider_subscription_id: "provider-outm27",
      m365_connection_id: "connection-outm27",
      resource: RESOURCE,
      status: "active",
      created_at: "2026-08-07T23:30:00.000Z",
    });
  });
}

test("OUTM-27 advances Graph delta pages only after durable enqueue and resumes from the stored cursor", async () => {
  // Given
  const repository = createConversationSyncRepository();
  stateFixture(repository);
  const queue = createGraphNotificationQueue({ repository });
  queue.enqueue({
    tenant_id: "tenant-outm27",
    subscription_id: "subscription-outm27",
    provider_subscription_id: "provider-outm27",
    resource: RESOURCE,
    message_id: "message-a",
    change_type: "created",
    source: "webhook",
    received_at: "2026-08-07T23:59:00.000Z",
  });
  const calls = [];
  const provider = {
    async listOwnMessageDelta(input) {
      calls.push(structuredClone(input));
      if (!input.delta_link) return { messages: [{ message_id: "message-a" }], next_link: "https://graph.microsoft.com/v1.0/me/mailFolders('inbox')/messages/delta?$skiptoken=page-2", delta_link: null };
      if (input.delta_link.includes("page-2")) return { messages: [{ message_id: "message-b" }], next_link: null, delta_link: "https://graph.microsoft.com/v1.0/me/mailFolders('inbox')/messages/delta?$deltatoken=done" };
      return { messages: [{ message_id: "message-b" }], next_link: null, delta_link: input.delta_link };
    },
  };
  const service = createGraphDeltaReconciliationService({ repository, queue, provider, clock: () => new Date("2026-08-08T00:00:00.000Z"), recovery_window_ms: 60 * 60 * 1000 });

  // When
  const first = await service.reconcile({ ...PRINCIPAL, resources: [RESOURCE] });
  const second = await service.reconcile({ ...PRINCIPAL, resources: [RESOURCE] });

  // Then
  assert.equal(first.enqueued, 1);
  assert.equal(second.enqueued, 0);
  assert.equal(repository.snapshot().jobs.length, 2);
  assert.equal(repository.snapshot().cursors[0].delta_link.includes("$deltatoken=done"), true);
  assert.equal(calls[2].delta_link.includes("$deltatoken=done"), true);
  assert.equal(calls[0].start_at, "2026-08-07T23:30:00.000Z");
  assert.equal(calls[1].start_at, null);
});

test("OUTM-27 clears an expired delta cursor and performs one bounded full reconciliation", async () => {
  // Given
  const repository = createConversationSyncRepository();
  stateFixture(repository);
  repository.transaction((state) => state.cursors.push({
    tenant_id: "tenant-outm27",
    m365_connection_id: "connection-outm27",
    resource: RESOURCE,
    delta_link: "https://graph.microsoft.com/v1.0/me/mailFolders('inbox')/messages/delta?$deltatoken=expired",
    version: 1,
  }));
  const queue = createGraphNotificationQueue({ repository });
  const calls = [];
  const provider = {
    async listOwnMessageDelta(input) {
      calls.push({ delta_link: input.delta_link, start_at: input.start_at });
      if (input.delta_link) throw Object.assign(new Error("expired"), { safe_error_code: "GRAPH_DELTA_CURSOR_EXPIRED" });
      return { messages: [{ message_id: "message-recovered" }], next_link: null, delta_link: "https://graph.microsoft.com/v1.0/me/mailFolders('inbox')/messages/delta?$deltatoken=recovered" };
    },
  };

  // When
  const result = await createGraphDeltaReconciliationService({ repository, queue, provider, clock: () => new Date("2026-08-08T00:00:00.000Z"), recovery_window_ms: 15 * 60 * 1000 }).reconcile({ ...PRINCIPAL, resources: [RESOURCE] });

  // Then
  assert.deepEqual(calls, [
    { delta_link: "https://graph.microsoft.com/v1.0/me/mailFolders('inbox')/messages/delta?$deltatoken=expired", start_at: null },
    { delta_link: null, start_at: "2026-08-07T23:45:00.000Z" },
  ]);
  assert.equal(result.enqueued, 1);
  assert.equal(repository.snapshot().cursors[0].delta_link.includes("recovered"), true);
  assert.equal(repository.snapshot().jobs.length, 1);
});
