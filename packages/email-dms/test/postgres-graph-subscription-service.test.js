import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createPostgresConversationSyncStore } from "../src/postgres-conversation-sync-store.js";
import { createGraphCursorCodec } from "../src/graph-cursor-codec.js";
import { createPostgresConversationMaintenanceStore } from "../src/postgres-conversation-maintenance-store.js";
import { createPostgresGraphSubscriptionService } from "../src/postgres-graph-subscription-service.js";
import {
  CONNECTION,
  ENTRA_TENANT,
  graphSubscriptionInput,
  NOTIFICATION_URL,
  seedGraphSubscriptionFixture,
  SUBJECT,
  TENANT,
  USER,
} from "./support/postgres-graph-subscription-fixture.js";

test("OUTM-26 PostgreSQL reconciler owns one Inbox/Sent pair and never deletes an unknown remote", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 6 });
  if (!fixture) return;
  await seedGraphSubscriptionFixture(fixture);
  const store = createPostgresConversationSyncStore({
    pool: fixture.appPool,
    tenant_id: TENANT,
    cursor_codec: createGraphCursorCodec({ key: Buffer.alloc(32, 8) }),
  });
  const calls = [];
  let now = new Date("2026-08-08T00:00:00.000Z");
  let deleteFailure = null;
  const remote = [{
    provider_subscription_id: "provider-unknown-other-connection",
    resource: "me/mailFolders('inbox')/messages",
    change_type: "created",
    client_state_hash: "f".repeat(64),
    notification_url: NOTIFICATION_URL,
    entra_tenant_id: ENTRA_TENANT,
    account_id: SUBJECT,
    expires_at: "2026-08-08T02:00:00.000Z",
  }];
  const provider = {
    async listOwnMessageSubscriptions() { calls.push(["list"]); return structuredClone(remote); },
    async createOwnMessageSubscription(value) {
      const created = {
        provider_subscription_id: `provider-owned-${remote.length}`,
        resource: value.resource,
        change_type: "created",
        client_state_hash: createHash("sha256").update(value.client_state).digest("hex"),
        notification_url: NOTIFICATION_URL,
        entra_tenant_id: ENTRA_TENANT,
        account_id: SUBJECT,
        expires_at: "2026-08-08T01:00:00.000Z",
      };
      calls.push(["create", value.resource]);
      remote.push(created);
      return created;
    },
    async renewOwnMessageSubscription(value) {
      calls.push(["renew", value.provider_subscription_id]);
      return structuredClone(remote.find((entry) => entry.provider_subscription_id === value.provider_subscription_id));
    },
    async deleteOwnMessageSubscription(value) {
      calls.push(["delete", value.provider_subscription_id]);
      if (value.provider_subscription_id === deleteFailure) throw new Error("synthetic provider delete failure");
      return { deleted: true };
    },
  };
  const service = createPostgresGraphSubscriptionService({
    pool: fixture.appPool,
    tenant_id: TENANT,
    state_lookup: store.readConnectionState,
    provider,
    entra_tenant_id: ENTRA_TENANT,
    notification_url: NOTIFICATION_URL,
    clock: () => now,
    client_state_factory: (() => { let sequence = 0; return () => `client-state-outm26-postgres-${++sequence}`; })(),
  });
  const result = await service.reconcile(graphSubscriptionInput());
  assert.deepEqual(result.subscriptions.map(({ resource }) => resource).sort(), [
    "me/mailFolders('inbox')/messages",
    "me/mailFolders('sentitems')/messages",
  ]);
  assert.equal(calls.filter(([operation]) => operation === "create").length, 2);
  assert.equal(calls.some(([operation, id]) => operation === "delete" && id === "provider-unknown-other-connection"), false);
  const maintenanceStore = createPostgresConversationMaintenanceStore({
    pool: fixture.appPool,
    tenant_id: TENANT,
    clock: () => now,
  });
  assert.deepEqual(await maintenanceStore.listDueSubscriptionPrincipals(), []);

  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
    "UPDATE lawos_email_dms.conversation_policies SET status='revoked'",
  ));
  assert.deepEqual(await maintenanceStore.listDueSubscriptionPrincipals(), [{
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    m365_connection_id: CONNECTION,
  }]);
  const failedDeleteId = result.subscriptions[0].provider_subscription_id;
  deleteFailure = failedDeleteId;
  await assert.rejects(service.reconcile(graphSubscriptionInput()), /synthetic provider delete failure/u);
  const retry = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => ({
    subscription: (await client.query(
      "SELECT status,last_error_code,next_attempt_at FROM lawos_email_dms.graph_subscriptions WHERE provider_subscription_id=$1",
      [failedDeleteId],
    )).rows[0],
    audit: (await client.query(
      "SELECT event_type FROM lawos_email_dms.graph_sync_audit_events WHERE event_type='graph_subscription.delete_retry_scheduled'",
    )).rows,
  }));
  assert.equal(retry.subscription.status, "cleanup_pending");
  assert.equal(retry.subscription.last_error_code, "GRAPH_SUBSCRIPTION_FAILED");
  assert.ok(Date.parse(retry.subscription.next_attempt_at) > now.getTime());
  assert.equal(retry.audit.length, 1);
  deleteFailure = null;
  now = new Date("2026-08-08T00:00:05.000Z");
  const revoked = await service.reconcile(graphSubscriptionInput());
  assert.equal(revoked.outcome, "revoked_without_active_policy");
  const deleted = [...new Set(calls.filter(([operation]) => operation === "delete").map(([, id]) => id))].sort();
  assert.deepEqual(deleted, result.subscriptions.map(({ provider_subscription_id: id }) => id).sort());
  assert.equal(calls.filter(([operation, id]) => operation === "delete" && id === failedDeleteId).length, 2);
  assert.equal(deleted.includes("provider-unknown-other-connection"), false);
});
