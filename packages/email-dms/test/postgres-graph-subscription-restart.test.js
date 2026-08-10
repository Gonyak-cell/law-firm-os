import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createGraphCursorCodec } from "../src/graph-cursor-codec.js";
import { createPostgresConversationSyncStore } from "../src/postgres-conversation-sync-store.js";
import { createPostgresGraphSubscriptionService } from "../src/postgres-graph-subscription-service.js";
import {
  ENTRA_TENANT,
  graphSubscriptionInput,
  NOTIFICATION_URL,
  seedGraphSubscriptionFixture,
  SUBJECT,
  TENANT,
} from "./support/postgres-graph-subscription-fixture.js";

test("OUTM-26 PostgreSQL restart adopts exact create intents and retains cleanup ownership until delete succeeds", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 6 });
  if (!fixture) return;
  await seedGraphSubscriptionFixture(fixture);
  const store = createPostgresConversationSyncStore({
    pool: fixture.appPool,
    tenant_id: TENANT,
    cursor_codec: createGraphCursorCodec({ key: Buffer.alloc(32, 9) }),
  });
  const calls = [];
  let now = new Date("2026-08-08T00:00:00.000Z");
  let expireSentLease = false;
  let deleteFailure = null;
  let sequence = 0;
  const remote = [{
    provider_subscription_id: "provider-unknown-restart",
    resource: "me/mailFolders('inbox')/messages",
    change_type: "created",
    client_state_hash: "f".repeat(64),
    notification_url: NOTIFICATION_URL,
    entra_tenant_id: ENTRA_TENANT,
    account_id: SUBJECT,
    expires_at: "2026-08-08T02:00:00.000Z",
  }];
  const provider = {
    async listOwnMessageSubscriptions(value) {
      calls.push(["list", value.entra_subject_id]);
      return structuredClone(remote);
    },
    async createOwnMessageSubscription(value) {
      const created = {
        provider_subscription_id: `provider-restart-${++sequence}`,
        resource: value.resource,
        change_type: "created",
        client_state_hash: createHash("sha256").update(value.client_state).digest("hex"),
        notification_url: NOTIFICATION_URL,
        entra_tenant_id: ENTRA_TENANT,
        account_id: SUBJECT,
        expires_at: value.expiration_datetime,
      };
      calls.push(["create", value.resource, value.provisioning_correlation_id]);
      remote.push(created);
      if (expireSentLease && value.resource.includes("sentitems")) now = new Date(now.getTime() + 2_000);
      return structuredClone(created);
    },
    async renewOwnMessageSubscription(value) {
      calls.push(["renew", value.provider_subscription_id]);
      return structuredClone(remote.find((entry) =>
        entry.provider_subscription_id === value.provider_subscription_id));
    },
    async deleteOwnMessageSubscription(value) {
      calls.push(["delete", value.provider_subscription_id]);
      if (value.provider_subscription_id === deleteFailure) throw new Error("synthetic cleanup retry");
      const index = remote.findIndex((entry) =>
        entry.provider_subscription_id === value.provider_subscription_id);
      if (index >= 0) remote.splice(index, 1);
      return { deleted: true };
    },
  };
  let clientStateSequence = 0;
  const service = () => createPostgresGraphSubscriptionService({
    pool: fixture.appPool,
    tenant_id: TENANT,
    state_lookup: store.readConnectionState,
    provider,
    entra_tenant_id: ENTRA_TENANT,
    notification_url: NOTIFICATION_URL,
    clock: () => now,
    lease_ms: 1_000,
    client_state_factory: () => `client-state-restart-${++clientStateSequence}`,
  });
  await fixture.adminPool.query(`
    CREATE OR REPLACE FUNCTION lawos_email_dms.reject_provider_commit_for_test()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.provider_subscription_id IS NULL
        AND NEW.provider_subscription_id IS NOT NULL THEN
        RAISE EXCEPTION 'synthetic provider commit failure';
      END IF;
      RETURN NEW;
    END
    $$;
    CREATE TRIGGER reject_provider_commit_for_test
      BEFORE UPDATE ON lawos_email_dms.graph_subscriptions
      FOR EACH ROW EXECUTE FUNCTION
        lawos_email_dms.reject_provider_commit_for_test();
  `);

  await assert.rejects(service().reconcile(graphSubscriptionInput()), (error) =>
    error.safe_error_code === "POSTGRES_OPERATION_FAILED");
  const ambiguous = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => (await client.query(
      `SELECT status,provider_subscription_id,provisioning_operation,
              provisioning_correlation_id,client_state_hash
         FROM lawos_email_dms.graph_subscriptions`,
    )).rows[0],
  );
  assert.equal(ambiguous.status, "pending");
  assert.equal(ambiguous.provider_subscription_id, null);
  assert.equal(ambiguous.provisioning_operation, "create");
  assert.match(ambiguous.provisioning_correlation_id, /^[a-f0-9-]{36}$/u);
  assert.equal(remote.some((entry) =>
    entry.provider_subscription_id.startsWith("provider-restart-")), true);
  await fixture.adminPool.query(
    "DROP TRIGGER reject_provider_commit_for_test ON lawos_email_dms.graph_subscriptions",
  );
  await fixture.adminPool.query(
    "DROP FUNCTION lawos_email_dms.reject_provider_commit_for_test()",
  );

  now = new Date("2026-08-08T00:00:05.000Z");
  expireSentLease = true;
  const firstRestartCall = calls.length;
  await assert.rejects(service().reconcile(graphSubscriptionInput()), /provider response is invalid/u);
  assert.equal(calls[firstRestartCall][0], "list");
  const afterLeaseExpiry = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => (await client.query(
      `SELECT resource,status,provider_subscription_id,
              provisioning_correlation_id
         FROM lawos_email_dms.graph_subscriptions ORDER BY resource`,
    )).rows,
  );
  assert.equal(afterLeaseExpiry.find(({ resource }) =>
    resource.includes("inbox")).status, "active");
  assert.equal(afterLeaseExpiry.find(({ resource }) =>
    resource.includes("sentitems")).status, "pending");

  now = new Date(now.getTime() + 5_000);
  expireSentLease = false;
  const secondRestartCall = calls.length;
  const adopted = await service().reconcile(graphSubscriptionInput());
  assert.equal(calls[secondRestartCall][0], "list");
  assert.equal(adopted.outcome, "active");
  assert.equal(calls.filter(([operation]) => operation === "create").length, 2);
  assert.equal(remote.filter(({ provider_subscription_id }) =>
    provider_subscription_id.startsWith("provider-restart-")).length, 2);
  assert.equal(remote.some(({ provider_subscription_id }) =>
    provider_subscription_id === "provider-unknown-restart"), true);

  const inbox = adopted.subscriptions.find(({ resource }) =>
    resource.includes("inbox"));
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT },
    (client) => client.query(
      `UPDATE lawos_email_dms.graph_subscriptions
          SET status='reauthorization_required'
        WHERE subscription_id=$1`,
      [inbox.subscription_id],
    ),
  );
  deleteFailure = inbox.provider_subscription_id;
  const failedCleanupCall = calls.length;
  await assert.rejects(service().reconcile(graphSubscriptionInput()), /synthetic cleanup retry/u);
  assert.deepEqual(calls.slice(failedCleanupCall).map(([operation]) => operation), [
    "list",
    "delete",
  ]);
  const retained = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => (await client.query(
      `SELECT status,provider_subscription_id,last_error_code,next_attempt_at
         FROM lawos_email_dms.graph_subscriptions
        WHERE subscription_id=$1`,
      [inbox.subscription_id],
    )).rows[0],
  );
  assert.equal(retained.status, "cleanup_pending");
  assert.equal(retained.provider_subscription_id, inbox.provider_subscription_id);
  assert.equal(retained.last_error_code, "GRAPH_SUBSCRIPTION_FAILED");

  deleteFailure = null;
  now = new Date(Date.parse(retained.next_attempt_at) + 1);
  const recovered = await service().reconcile(graphSubscriptionInput());
  const replacement = recovered.subscriptions.find(({ resource }) =>
    resource.includes("inbox"));
  assert.equal(recovered.outcome, "active");
  assert.notEqual(replacement.provider_subscription_id, inbox.provider_subscription_id);
  assert.equal(remote.some(({ provider_subscription_id }) =>
    provider_subscription_id === inbox.provider_subscription_id), false);
  assert.equal(calls.some(([operation, id]) =>
    operation === "delete" && id === "provider-unknown-restart"), false);
  const adoptedAudits = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    (client) => client.query(
      `SELECT event_type FROM lawos_email_dms.graph_sync_audit_events
        WHERE event_type='graph_subscription.adopted'`,
    ),
  );
  assert.equal(adoptedAudits.rowCount, 2);
});
