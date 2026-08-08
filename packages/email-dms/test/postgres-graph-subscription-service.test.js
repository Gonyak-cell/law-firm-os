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

async function seed(fixture) {
  const migrations = listEmailDmsPostgresMigrations();
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migrations[2].sql);
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
  assert.equal(retry.subscription.status, "pending");
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
