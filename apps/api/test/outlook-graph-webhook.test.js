import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createConversationSyncRepository, createGraphNotificationQueue } from "../../../packages/email-dms/src/index.js";
import { createOutlookGraphWebhookHandler } from "../src/outlook-graph-webhook.js";

const CLIENT_STATE = "client-state-outm27-never-persist";
const PROVIDER_SUBSCRIPTION = "provider-subscription-outm27";
const SUBJECT = "00000000-0000-4000-8000-000000000027";
const ENTRA_TENANT = "00000000-0000-4000-8000-000000000026";
const EXPIRES = "2026-08-08T02:00:00.000Z";

function connection(overrides = {}) {
  return {
    tenant_id: "tenant-outm27",
    user_id: "user-outm27",
    entra_subject_id: SUBJECT,
    m365_connection_id: "connection-outm27",
    mailbox_address_hash: "a".repeat(64),
    granted_scopes: ["Mail.Read"],
    expires_at: "2027-08-08T00:00:00.000Z",
    connection_authority: "delegated",
    mailbox_scope: "me",
    revoked_at: null,
    ...overrides,
  };
}

function fixture(connectionOverrides = {}) {
  const repository = createConversationSyncRepository();
  repository.transaction((state) => state.subscriptions.push({
    tenant_id: "tenant-outm27",
    subscription_id: "subscription-outm27",
    provider_subscription_id: PROVIDER_SUBSCRIPTION,
    user_id: "user-outm27",
    entra_subject_id: SUBJECT,
    entra_tenant_id: ENTRA_TENANT,
    m365_connection_id: "connection-outm27",
    mailbox_ref: "a".repeat(64),
    resource: "me/mailFolders('inbox')/messages",
    change_type: "created",
    client_state_hash: createHash("sha256").update(CLIENT_STATE).digest("hex"),
    client_state_ref: `client_state_ref_${"b".repeat(32)}`,
    provider_expires_at: EXPIRES,
    status: "active",
  }));
  const queue = createGraphNotificationQueue({ repository, clock: () => new Date("2026-08-08T00:00:00.000Z") });
  return {
    repository,
    handler: createOutlookGraphWebhookHandler({ repository, queue, connection_lookup: () => connection(connectionOverrides), notification_url: "https://api.amic.invalid/api/outlook/graph/notifications", clock: () => new Date("2026-08-08T00:00:00.000Z") }),
  };
}

function notification(overrides = {}) {
  return {
    subscriptionId: PROVIDER_SUBSCRIPTION,
    subscriptionExpirationDateTime: EXPIRES,
    tenantId: ENTRA_TENANT,
    clientState: CLIENT_STATE,
    changeType: "created",
    resource: `Users/${SUBJECT}/Messages/message-outm27`,
    resourceData: { id: "message-outm27", "@odata.type": "#Microsoft.Graph.Message" },
    ...overrides,
  };
}

function request(body) {
  return { method: "POST", query: {}, headers: { "content-type": "application/json" }, body: { value: [body] } };
}

test("OUTM-27 returns Graph POST validationToken as plain text without JSON", async () => {
  const result = await fixture().handler.handle({ method: "POST", query: { validationToken: "validation-token-outm27" }, headers: { "content-type": "text/plain" }, body: null });
  assert.deepEqual(result, { status: 200, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }, body: "validation-token-outm27" });
});

test("OUTM-27 binds tenant, account, mailbox, subscription expiry, resource, and clientState before enqueue-only 202", async () => {
  const runtime = fixture();
  const first = await runtime.handler.handle(request(notification()));
  const duplicate = await runtime.handler.handle(request(notification()));
  for (const invalid of [
    notification({ clientState: "wrong-client-state" }),
    notification({ tenantId: "other-entra-tenant" }),
    notification({ resource: "Users/other-subject/Messages/message-outm27" }),
    notification({ subscriptionExpirationDateTime: "2026-08-08T03:00:00.000Z" }),
    notification({ subscriptionId: "unknown-subscription" }),
  ]) assert.equal((await runtime.handler.handle(request(invalid))).status, 400);
  assert.equal(first.status, 202);
  assert.equal(duplicate.status, 202);
  assert.equal(runtime.repository.snapshot().jobs.length, 1);
  assert.equal(runtime.repository.snapshot().receipts.length, 1);
  assert.equal(JSON.stringify(runtime.repository.snapshot()).includes(CLIENT_STATE), false);
});

test("OUTM-27 queues missed and reauthorization lifecycle work without provider calls", async () => {
  const missed = fixture();
  const foreignResource = await missed.handler.handle(request(notification({
    changeType: undefined,
    resource: `Users/foreign-subject/Messages/message-outm27`,
    resourceData: undefined,
    lifecycleEvent: "missed",
  })));
  assert.equal(foreignResource.status, 400);
  const missedResult = await missed.handler.handle(request(notification({
    changeType: undefined,
    resource: undefined,
    resourceData: undefined,
    lifecycleEvent: "missed",
  })));
  assert.equal(missedResult.status, 202);
  assert.equal(missed.repository.snapshot().jobs[0].job_kind, "delta_reconciliation");
  assert.equal(missed.repository.snapshot().cursors[0].reconciliation_required_at, "2026-08-08T00:00:00.000Z");

  const reauthorization = fixture();
  const reauthorizationResult = await reauthorization.handler.handle(request(notification({
    changeType: undefined,
    resource: undefined,
    resourceData: undefined,
    lifecycleEvent: "reauthorizationRequired",
  })));
  assert.equal(reauthorizationResult.status, 202);
  assert.equal(reauthorization.repository.snapshot().subscriptions[0].status, "reauthorization_required");
  assert.equal(reauthorization.repository.snapshot().jobs[0].job_kind, "subscription_reconcile");
});

test("OUTM-27 rejects identity drift, expiry, and revoked delegated authority", async () => {
  const mismatch = fixture();
  assert.equal((await mismatch.handler.handle(request(notification({ resourceData: { id: "different" } })))).status, 400);
  mismatch.repository.transaction((state) => { state.subscriptions[0].provider_expires_at = "2026-08-07T23:59:00.000Z"; });
  assert.equal((await mismatch.handler.handle(request(notification({ subscriptionExpirationDateTime: "2026-08-07T23:59:00.000Z" })))).status, 400);
  assert.equal((await fixture({ revoked_at: "2026-08-08T00:00:00.000Z" }).handler.handle(request(notification()))).status, 400);
  assert.equal((await fixture({ user_id: "same-tenant-intruder" }).handler.handle(request(notification()))).status, 400);
});

test("OUTM-27 fails closed unless the configured notification URL is exact HTTPS", () => {
  const repository = createConversationSyncRepository();
  const queue = createGraphNotificationQueue({ repository });
  for (const notification_url of ["http://api.amic.invalid/api/outlook/graph/notifications", "https://api.amic.invalid/api/outlook/graph/notifications?forward=1", "https://api.amic.invalid/other"]) {
    assert.throws(() => createOutlookGraphWebhookHandler({ repository, queue, connection_lookup: () => ({}), notification_url }), /public HTTPS Graph webhook URL/u);
  }
});

test("OUTM-27 returns a retryable safe response when durable enqueue fails", async () => {
  const runtime = fixture();
  const handler = createOutlookGraphWebhookHandler({
    repository: runtime.repository,
    connection_lookup: () => connection(),
    queue: { async enqueue() { throw new Error("synthetic persistence detail must not escape"); } },
    notification_url: "https://api.amic.invalid/api/outlook/graph/notifications",
    clock: () => new Date("2026-08-08T00:00:00.000Z"),
  });
  const result = await handler.handle(request(notification()));
  assert.deepEqual(result.body, { outcome: "blocked", safe_error_code: "OUTLOOK_GRAPH_PERSISTENCE_UNAVAILABLE" });
  assert.equal(result.status, 503);
});
