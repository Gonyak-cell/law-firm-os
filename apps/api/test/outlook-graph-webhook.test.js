import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createConversationSyncRepository, createGraphNotificationQueue } from "../../../packages/email-dms/src/index.js";
import { createOutlookGraphWebhookHandler } from "../src/outlook-graph-webhook.js";

const CLIENT_STATE = "client-state-outm27-never-persist";
const PROVIDER_SUBSCRIPTION = "provider-subscription-outm27";

function connection(overrides = {}) {
  return {
    tenant_id: "tenant-outm27",
    m365_connection_id: "connection-outm27",
    granted_scopes: ["Mail.Read"],
    expires_at: "2027-08-08T00:00:00.000Z",
    connection_authority: "delegated",
    mailbox_scope: "me",
    revoked_at: null,
    ...overrides,
  };
}

function fixture() {
  const repository = createConversationSyncRepository();
  repository.transaction((state) => state.subscriptions.push({
    tenant_id: "tenant-outm27",
    subscription_id: "subscription-outm27",
    provider_subscription_id: PROVIDER_SUBSCRIPTION,
    m365_connection_id: "connection-outm27",
    resource: "me/mailFolders('inbox')/messages",
    change_type: "created",
    client_state_hash: createHash("sha256").update(CLIENT_STATE).digest("hex"),
    provider_expires_at: "2026-08-08T02:00:00.000Z",
    status: "active",
  }));
  const queue = createGraphNotificationQueue({ repository, clock: () => new Date("2026-08-08T00:00:00.000Z") });
  return {
    repository,
    handler: createOutlookGraphWebhookHandler({ repository, queue, connection_lookup: () => connection(), notification_url: "https://api.amic.invalid/api/outlook/graph/notifications", clock: () => new Date("2026-08-08T00:00:00.000Z") }),
  };
}

function notification(overrides = {}) {
  return {
    subscriptionId: PROVIDER_SUBSCRIPTION,
    clientState: CLIENT_STATE,
    changeType: "created",
    resource: "me/messages/message-outm27",
    resourceData: { id: "message-outm27" },
    ...overrides,
  };
}

test("OUTM-27 returns Graph POST validationToken as plain text without requiring JSON", () => {
  const result = fixture().handler.handle({ method: "POST", query: { validationToken: "validation-token-outm27" }, headers: { "content-type": "text/plain" }, body: null });
  assert.deepEqual(result, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    body: "validation-token-outm27",
  });
});

test("OUTM-27 validates active subscription, resource, and clientState before enqueue-only 202", () => {
  // Given
  const runtime = fixture();
  const request = {
    method: "POST",
    query: {},
    headers: { "content-type": "application/json" },
    body: { value: [notification()] },
  };

  // When
  const first = runtime.handler.handle(request);
  const duplicate = runtime.handler.handle(request);
  const invalid = runtime.handler.handle({ ...request, body: { value: [notification({ clientState: "wrong-client-state" })] } });
  const unknown = runtime.handler.handle({ ...request, body: { value: [notification({ subscriptionId: "unknown-subscription" })] } });

  // Then
  assert.equal(first.status, 202);
  assert.equal(duplicate.status, 202);
  assert.equal(invalid.status, 400);
  assert.deepEqual(unknown, invalid);
  assert.equal(runtime.repository.snapshot().jobs.length, 1);
  assert.equal(runtime.repository.snapshot().receipts.length, 1);
  assert.equal(JSON.stringify(runtime.repository.snapshot()).includes(CLIENT_STATE), false);
});

test("OUTM-27 rejects mismatched message resource and expired subscription without provider work", () => {
  const runtime = fixture();
  const request = { method: "POST", query: {}, headers: { "content-type": "application/json" }, body: { value: [notification({ resourceData: { id: "different" } })] } };
  assert.equal(runtime.handler.handle(request).status, 400);
  runtime.repository.transaction((state) => { state.subscriptions[0].provider_expires_at = "2026-08-07T23:59:00.000Z"; });
  assert.equal(runtime.handler.handle({ ...request, body: { value: [notification()] } }).status, 400);
  assert.equal(runtime.repository.snapshot().jobs.length, 0);
});

test("OUTM-27 rejects a notification after its delegated connection is revoked", () => {
  const runtime = fixture();
  const handler = createOutlookGraphWebhookHandler({
    repository: runtime.repository,
    queue: createGraphNotificationQueue({ repository: runtime.repository }),
    connection_lookup: () => connection({ revoked_at: "2026-08-08T00:00:00.000Z" }),
    notification_url: "https://api.amic.invalid/api/outlook/graph/notifications",
    clock: () => new Date("2026-08-08T00:00:00.000Z"),
  });
  const result = handler.handle({ method: "POST", query: {}, headers: { "content-type": "application/json" }, body: { value: [notification()] } });
  assert.equal(result.status, 400);
  assert.equal(runtime.repository.snapshot().jobs.length, 0);
});

test("OUTM-27 fails closed unless the configured public notification URL is exact HTTPS", () => {
  const repository = createConversationSyncRepository();
  const queue = createGraphNotificationQueue({ repository });
  for (const notification_url of [
    "http://api.amic.invalid/api/outlook/graph/notifications",
    "https://api.amic.invalid/api/outlook/graph/notifications?forward=1",
    "https://api.amic.invalid/other",
  ]) {
    assert.throws(
      () => createOutlookGraphWebhookHandler({ repository, queue, connection_lookup: () => ({}), notification_url }),
      /public HTTPS Graph webhook URL/u,
    );
  }
});

test("OUTM-27 returns a retryable safe response when durable enqueue fails", () => {
  const runtime = fixture();
  let fetchOrFilingCalls = 0;
  const handler = createOutlookGraphWebhookHandler({
    repository: runtime.repository,
    connection_lookup: () => connection(),
    queue: {
      enqueue() {
        throw new Error("synthetic persistence detail must not escape");
      },
      fetchOrFile() { fetchOrFilingCalls += 1; },
    },
    notification_url: "https://api.amic.invalid/api/outlook/graph/notifications",
    clock: () => new Date("2026-08-08T00:00:00.000Z"),
  });

  const result = handler.handle({ method: "POST", query: {}, headers: { "content-type": "application/json" }, body: { value: [notification()] } });

  assert.deepEqual(result.body, { outcome: "blocked", safe_error_code: "OUTLOOK_GRAPH_PERSISTENCE_UNAVAILABLE" });
  assert.equal(result.status, 503);
  assert.equal(fetchOrFilingCalls, 0);
});
