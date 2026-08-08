import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { createPostgresDomainLedger } from "../../persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../persistence/src/record-domain-adapter.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { EMAIL_DMS_DOMAIN_DESCRIPTOR } from "../src/central-ledger.js";
import { createEmailDmsRepository } from "../src/repository.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import { createPostgresConversationSyncStore } from "../src/postgres-conversation-sync-store.js";
import { createGraphCursorCodec } from "../src/graph-cursor-codec.js";
import { createPostgresConversationMaintenanceStore } from "../src/postgres-conversation-maintenance-store.js";
import { createPostgresGraphSubscriptionService } from "../src/postgres-graph-subscription-service.js";

const TENANT = "tenant-outm26-postgres";
const USER = "user-outm26-postgres";
const SUBJECT = "subject-outm26-postgres";
const CONNECTION = "connection-outm26-postgres";
const ENTRA_TENANT = "entra-tenant-outm26-postgres";
const NOTIFICATION_URL = "https://api.example.test/api/outlook/graph/notifications";

async function seed(fixture) {
  const migrations = listEmailDmsPostgresMigrations();
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migrations[3].sql);
  const repository = createEmailDmsRepository({ seedRecords: [{
    model_type: "M365Connection",
    tenant_id: TENANT,
    m365_connection_id: CONNECTION,
    user_id: USER,
    entra_subject_id: SUBJECT,
    mailbox_address_hash: "a".repeat(64),
    credential_ref: "aws-secrets-manager:synthetic/outm26-postgres",
    granted_scopes: ["Mail.Read"],
    consented_at: "2026-08-08T00:00:00.000Z",
    expires_at: "2027-08-08T00:00:00.000Z",
    state_version: 1,
  }] });
  try {
    await createPostgresDomainLedger({ pool: fixture.appPool }).importSnapshot(
      createRecordRepositoryDomainSnapshot({
        descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
        repositories: [{ source_id: "outm26-postgres", repository }],
        tenant_id: TENANT,
      }).snapshot,
    );
  } finally { repository.close(); }
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
    `INSERT INTO lawos_email_dms.conversation_policies
      (tenant_id,policy_id,user_id,entra_subject_id,m365_connection_id,mailbox_ref,
       conversation_id,matter_id,seed_email_thread_id,seed_filing_receipt_ref,
       enabling_actor_id,status,version,created_at,updated_at)
     VALUES ($1,'policy-outm26-postgres',$2,$3,$4,$5,'conversation-outm26-postgres',
       'matter-outm26-postgres','thread-outm26-postgres','receipt-outm26-postgres',
       $2,'active',1,$6,$6)`,
    [TENANT, USER, SUBJECT, CONNECTION, "a".repeat(64), "2026-08-08T00:00:00.000Z"],
  ));
}

function input() {
  return {
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    actor_id: "graph-subscription-reconciler",
    m365_connection_id: CONNECTION,
  };
}

test("OUTM-26 PostgreSQL reconciler owns one Inbox/Sent pair and never deletes an unknown remote", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 6 });
  if (!fixture) return;
  await seed(fixture);
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
  const result = await service.reconcile(input());
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
  await assert.rejects(service.reconcile(input()), /synthetic provider delete failure/u);
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
  const revoked = await service.reconcile(input());
  assert.equal(revoked.outcome, "revoked_without_active_policy");
  const deleted = [...new Set(calls.filter(([operation]) => operation === "delete").map(([, id]) => id))].sort();
  assert.deepEqual(deleted, result.subscriptions.map(({ provider_subscription_id: id }) => id).sort());
  assert.equal(calls.filter(([operation, id]) => operation === "delete" && id === failedDeleteId).length, 2);
  assert.equal(deleted.includes("provider-unknown-other-connection"), false);
});

test("OUTM-26 PostgreSQL restart adopts exact create intents and retains cleanup ownership until delete succeeds", async (t) => {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 6 });
  if (!fixture) return;
  await seed(fixture);
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
      if (expireSentLease && value.resource.includes("sentitems")) {
        now = new Date(now.getTime() + 2_000);
      }
      return structuredClone(created);
    },
    async renewOwnMessageSubscription(value) {
      calls.push(["renew", value.provider_subscription_id]);
      return structuredClone(remote.find((entry) =>
        entry.provider_subscription_id === value.provider_subscription_id));
    },
    async deleteOwnMessageSubscription(value) {
      calls.push(["delete", value.provider_subscription_id]);
      if (value.provider_subscription_id === deleteFailure) {
        throw new Error("synthetic cleanup retry");
      }
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
    client_state_factory: () =>
      `client-state-restart-${++clientStateSequence}`,
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

  await assert.rejects(service().reconcile(input()), (error) =>
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
  await assert.rejects(service().reconcile(input()), /provider response is invalid/u);
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
  const adopted = await service().reconcile(input());
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
  await assert.rejects(service().reconcile(input()), /synthetic cleanup retry/u);
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
  const recovered = await service().reconcile(input());
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
