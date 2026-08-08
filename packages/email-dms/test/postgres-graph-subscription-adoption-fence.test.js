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
  NOTIFICATION_URL,
  SUBJECT,
  TENANT,
  graphSubscriptionInput,
  seedGraphSubscriptionFixture,
} from "./support/postgres-graph-subscription-fixture.js";

test("OUTM-26 an incomplete remote list never overwrites an uncommitted create intent", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 6 });
  if (!fixture) return;
  await seedGraphSubscriptionFixture(fixture);
  const store = createPostgresConversationSyncStore({
    pool: fixture.appPool,
    tenant_id: TENANT,
    cursor_codec: createGraphCursorCodec({ key: Buffer.alloc(32, 6) }),
  });
  let now = new Date("2026-08-08T00:00:00.000Z");
  let hideRemote = false;
  let sequence = 0;
  const remote = [];
  const createCalls = [];
  const provider = {
    async listOwnMessageSubscriptions() {
      return hideRemote ? [] : structuredClone(remote);
    },
    async createOwnMessageSubscription(input) {
      createCalls.push(input.resource);
      const created = {
        provider_subscription_id: `provider-adoption-fence-${++sequence}`,
        resource: input.resource,
        change_type: "created",
        client_state_hash: createHash("sha256").update(input.client_state).digest("hex"),
        notification_url: NOTIFICATION_URL,
        entra_tenant_id: ENTRA_TENANT,
        account_id: SUBJECT,
        expires_at: input.expiration_datetime,
      };
      remote.push(created);
      return structuredClone(created);
    },
    async renewOwnMessageSubscription(input) {
      return structuredClone(remote.find(({ provider_subscription_id: id }) =>
        id === input.provider_subscription_id));
    },
    async deleteOwnMessageSubscription() { return { deleted: true }; },
  };
  let clientState = 0;
  const service = () => createPostgresGraphSubscriptionService({
    pool: fixture.appPool,
    tenant_id: TENANT,
    state_lookup: store.readConnectionState,
    provider,
    entra_tenant_id: ENTRA_TENANT,
    notification_url: NOTIFICATION_URL,
    clock: () => now,
    lease_ms: 1_000,
    client_state_factory: () => `client-state-adoption-fence-${++clientState}`,
  });
  await fixture.adminPool.query(`
    CREATE OR REPLACE FUNCTION lawos_email_dms.reject_adoption_fence_commit()
    RETURNS trigger LANGUAGE plpgsql AS $$
    BEGIN
      IF OLD.provider_subscription_id IS NULL
        AND NEW.provider_subscription_id IS NOT NULL THEN
        RAISE EXCEPTION 'synthetic provider commit failure';
      END IF;
      RETURN NEW;
    END
    $$;
    CREATE TRIGGER reject_adoption_fence_commit
      BEFORE UPDATE ON lawos_email_dms.graph_subscriptions
      FOR EACH ROW EXECUTE FUNCTION
        lawos_email_dms.reject_adoption_fence_commit();
  `);
  await assert.rejects(service().reconcile(graphSubscriptionInput()));
  await fixture.adminPool.query(
    "DROP TRIGGER reject_adoption_fence_commit ON lawos_email_dms.graph_subscriptions",
  );
  await fixture.adminPool.query(
    "DROP FUNCTION lawos_email_dms.reject_adoption_fence_commit()",
  );
  const before = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => (await client.query(
      `SELECT resource,provisioning_correlation_id,client_state_hash
         FROM lawos_email_dms.graph_subscriptions`,
    )).rows[0],
  );

  hideRemote = true;
  now = new Date("2026-08-08T00:00:05.000Z");
  const deferred = await service().reconcile(graphSubscriptionInput());
  assert.equal(deferred.outcome, "retry_scheduled");
  assert.equal(createCalls.filter((resource) => resource === before.resource).length, 1);
  const after = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => (await client.query(
      `SELECT provider_subscription_id,provisioning_correlation_id,
              client_state_hash
         FROM lawos_email_dms.graph_subscriptions WHERE resource=$1`,
      [before.resource],
    )).rows[0],
  );
  assert.equal(after.provider_subscription_id, null);
  assert.equal(after.provisioning_correlation_id, before.provisioning_correlation_id);
  assert.equal(after.client_state_hash, before.client_state_hash);

  hideRemote = false;
  const adopted = await service().reconcile(graphSubscriptionInput());
  assert.equal(adopted.outcome, "active");
  assert.equal(createCalls.filter((resource) => resource === before.resource).length, 1);
  assert.equal(remote.length, 2);
});
