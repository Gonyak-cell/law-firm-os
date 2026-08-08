import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { createConversationSyncRepository } from "../src/conversation-sync-repository.js";
import { createGraphNotificationQueue } from "../src/graph-notification-queue.js";

function notification(messageId = "message-outm27") {
  return {
    tenant_id: "tenant-outm27",
    subscription_id: "subscription-outm27",
    provider_subscription_id: "provider-subscription-outm27",
    resource: "me/mailFolders('inbox')/messages",
    message_id: messageId,
    change_type: "created",
    source: "webhook",
    received_at: "2026-08-08T00:00:00.000Z",
  };
}

test("OUTM-27 atomically deduplicates immutable receipts and durable outbox jobs", () => {
  // Given
  const repository = createConversationSyncRepository();
  const queue = createGraphNotificationQueue({ repository });

  // When
  const first = queue.enqueue(notification());
  const replay = queue.enqueue(notification());

  // Then
  assert.equal(first.outcome, "enqueued");
  assert.equal(replay.outcome, "duplicate");
  assert.equal(repository.snapshot().receipts.length, 1);
  assert.equal(repository.snapshot().jobs.length, 1);
  assert.equal(repository.snapshot().audit_events.length, 1);
  assert.equal(repository.snapshot().audit_events[0].event_type, "graph_job.enqueued");
  assert.throws(
    () => queue.enqueue({ ...notification("message-outm27"), provider_subscription_id: "different-provider" }),
    /receipt conflicts/u,
  );
});

test("OUTM-27 recovers an expired lease after restart and dead-letters at the bounded attempt limit", () => {
  // Given
  const filePath = join(mkdtempSync(join(tmpdir(), "outm27-queue-")), "state.json");
  let now = new Date("2026-08-08T00:00:00.000Z");
  const repository = createConversationSyncRepository({ filePath });
  const queue = createGraphNotificationQueue({ repository, clock: () => now, lease_ms: 1_000, max_attempts: 3, base_delay_ms: 100 });
  queue.enqueue(notification());
  const firstLease = queue.claim({ worker_id: "worker-one", limit: 1 })[0];

  // When
  now = new Date(now.getTime() + 1_001);
  const restarted = createGraphNotificationQueue({ repository: createConversationSyncRepository({ filePath }), clock: () => now, lease_ms: 1_000, max_attempts: 3, base_delay_ms: 100 });
  const secondLease = restarted.claim({ worker_id: "worker-two", limit: 1 })[0];
  const retry = restarted.fail({ worker_id: "worker-two", job_id: secondLease.job_id, error_code: "GRAPH_TEMPORARY", permanent: false });
  now = new Date(Date.parse(retry.available_at) + 1);
  const thirdLease = restarted.claim({ worker_id: "worker-three", limit: 1 })[0];
  const dead = restarted.fail({ worker_id: "worker-three", job_id: thirdLease.job_id, error_code: "GRAPH_STILL_DOWN", permanent: false });

  // Then
  assert.notEqual(firstLease.lease_owner, secondLease.lease_owner);
  assert.equal(firstLease.attempt_count, 1);
  assert.equal(secondLease.attempt_count, 2);
  assert.equal(retry.status, "retry");
  assert.equal(thirdLease.attempt_count, 3);
  assert.equal(dead.status, "dead_letter");
  assert.equal(restarted.claim({ worker_id: "worker-four", limit: 1 }).length, 0);
  const events = createConversationSyncRepository({ filePath }).snapshot().audit_events.map(({ event_type: type }) => type);
  assert.ok(events.includes("graph_job.leased"));
  assert.ok(events.includes("graph_job.retry_scheduled"));
  assert.ok(events.includes("graph_job.dead_lettered"));
});

test("OUTM-27 extends only an owned durable lease and audits the transition", () => {
  // Given
  let now = new Date("2026-08-08T00:00:00.000Z");
  const repository = createConversationSyncRepository();
  const queue = createGraphNotificationQueue({ repository, clock: () => now, lease_ms: 1_000 });
  queue.enqueue(notification());
  const leased = queue.claim({ worker_id: "worker-outm27", limit: 1 })[0];

  // When
  now = new Date(now.getTime() + 900);
  const extended = queue.extendLease({ worker_id: "worker-outm27", job_id: leased.job_id });

  // Then
  assert.equal(extended.lease_expires_at, "2026-08-08T00:00:01.900Z");
  assert.throws(
    () => queue.extendLease({ worker_id: "other-worker", job_id: leased.job_id }),
    /lease was lost/u,
  );
  assert.equal(repository.snapshot().audit_events.at(-1).event_type, "graph_job.lease_extended");
});

test("OUTM-27 queues lifecycle recovery and updates subscription state in the same transaction", () => {
  const repository = createConversationSyncRepository();
  repository.transaction((state) => state.subscriptions.push({
    tenant_id: "tenant-outm27",
    subscription_id: "subscription-outm27",
    provider_subscription_id: "provider-subscription-outm27",
    m365_connection_id: "connection-outm27",
    resource: "me/mailFolders('inbox')/messages",
    status: "active",
  }));
  const queue = createGraphNotificationQueue({ repository });
  const first = queue.enqueue({
    ...notification(),
    message_id: undefined,
    change_type: undefined,
    lifecycle_event: "reauthorizationRequired",
    subscription_expiration_at: "2026-08-08T02:00:00.000Z",
  });
  assert.equal(first.job.job_kind, "subscription_reconcile");
  assert.equal(repository.snapshot().subscriptions[0].status, "reauthorization_required");
  assert.equal(repository.snapshot().jobs.length, 1);
  assert.equal(queue.enqueue({
    ...notification(),
    message_id: undefined,
    change_type: undefined,
    lifecycle_event: "reauthorizationRequired",
    subscription_expiration_at: "2026-08-08T02:00:00.000Z",
  }).outcome, "duplicate");
});
