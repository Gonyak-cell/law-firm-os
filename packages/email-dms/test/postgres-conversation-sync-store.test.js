import assert from "node:assert/strict";
import test from "node:test";

import { createPostgresDomainLedger } from "../../persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../persistence/src/record-domain-adapter.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { EMAIL_DMS_DOMAIN_DESCRIPTOR } from "../src/central-ledger.js";
import { createEmailDmsRepository } from "../src/repository.js";
import { createGraphCursorCodec } from "../src/graph-cursor-codec.js";
import { createGraphDeltaReconciliationService } from "../src/graph-delta-reconciliation-service.js";
import { createPostgresConversationSyncStore } from "../src/postgres-conversation-sync-store.js";
import { createPostgresGraphNotificationQueue } from "../src/postgres-graph-notification-queue.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";

const TENANT = "tenant-outm27-store";
const CONNECTION = "connection-outm27-store";
const RESOURCE = "me/mailFolders('inbox')/messages";

async function runtime(t) {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 4 });
  if (!fixture) return null;
  const migrations = listEmailDmsPostgresMigrations();
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migrations[2].sql);
  const repository = createEmailDmsRepository({ seedRecords: [{
    model_type: "M365Connection",
    tenant_id: TENANT,
    m365_connection_id: CONNECTION,
    user_id: "user-outm27-store",
    entra_subject_id: "subject-outm27-store",
    mailbox_address_hash: "a".repeat(64),
    credential_ref: "aws-secrets-manager:synthetic/outm27-store",
    granted_scopes: ["Mail.Read"],
    consented_at: "2026-08-08T00:00:00.000Z",
    expires_at: "2027-08-08T00:00:00.000Z",
    state_version: 1,
  }] });
  try {
    const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "outm27-store-test", repository }],
      tenant_id: TENANT,
    }).snapshot);
  } finally {
    repository.close();
  }
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, async (client) => {
    await client.query(
      `INSERT INTO lawos_email_dms.conversation_policies
         (tenant_id,policy_id,user_id,entra_subject_id,m365_connection_id,
          mailbox_ref,conversation_id,matter_id,seed_email_thread_id,
          seed_filing_receipt_ref,enabling_actor_id,status,version,created_at,updated_at)
       VALUES ($1,'policy-outm27-store','user-outm27-store','subject-outm27-store',$2,$3,
               'conversation-outm27-store','matter-outm27-store','thread-outm27-store',
               'receipt-outm27-store','user-outm27-store','active',1,$4,$4)`,
      [TENANT, CONNECTION, "a".repeat(64), "2026-08-08T00:00:00.000Z"],
    );
    await client.query(
      `INSERT INTO lawos_email_dms.graph_subscriptions
         (tenant_id,subscription_id,user_id,entra_subject_id,entra_tenant_id,
          m365_connection_id,mailbox_ref,resource,change_type,client_state_hash,
          client_state_ref,provider_subscription_id,provider_expires_at,status,
          created_at,updated_at)
       VALUES ($1,'subscription-outm27-store','user-outm27-store','subject-outm27-store',
               'entra-tenant-outm27-store',$2,$3,$4,'created',$5,$6,
               'provider-outm27-store','2026-08-08T02:00:00.000Z','active',$7,$7)`,
      [TENANT, CONNECTION, "a".repeat(64), RESOURCE, "b".repeat(64),
        `client_state_ref_${"c".repeat(32)}`, "2026-08-08T00:00:00.000Z"],
    );
  });
  return fixture;
}

test("OUTM-27 PostgreSQL store binds the canonical connection and seals delta cursors across restart", async (t) => {
  const fixture = await runtime(t);
  if (!fixture) return;
  const codec = createGraphCursorCodec({ key: Buffer.alloc(32, 7) });
  const createStore = () => createPostgresConversationSyncStore({
    pool: fixture.appPool,
    tenant_id: TENANT,
    cursor_codec: codec,
    clock: () => new Date("2026-08-08T00:10:00.000Z"),
  });
  const input = {
    tenant_id: TENANT,
    user_id: "user-outm27-store",
    entra_subject_id: "subject-outm27-store",
    m365_connection_id: CONNECTION,
  };
  const store = createStore();
  const authority = await store.findWebhookAuthority({ provider_subscription_id: "provider-outm27-store" });
  assert.equal(authority.connection.credential_ref, "aws-secrets-manager:synthetic/outm27-store");
  assert.equal(Object.hasOwn(authority.subscription, "connection_payload"), false);
  assert.equal((await store.readReconciliationState(input)).policies.length, 1);
  assert.equal((await store.readReconciliationState({ ...input, user_id: "same-tenant-intruder" })).policies.length, 0);

  const rawCursor = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$deltatoken=never-store-plaintext";
  await store.cursor_store.write(input, RESOURCE, rawCursor);
  const persisted = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => ({
    cursor: (await client.query("SELECT cursor_ref FROM lawos_email_dms.graph_delta_cursors")).rows[0].cursor_ref,
    audits: (await client.query("SELECT details::text AS details FROM lawos_email_dms.graph_sync_audit_events")).rows,
  }));
  assert.match(persisted.cursor, /^sealed:v1:/u);
  assert.equal(JSON.stringify(persisted).includes("never-store-plaintext"), false);
  assert.equal(await createStore().cursor_store.read(input, RESOURCE), rawCursor);
  await createStore().cursor_store.reset(input, RESOURCE);
  assert.equal(await createStore().cursor_store.read(input, RESOURCE), null);

  const restarted = createStore();
  const queue = createPostgresGraphNotificationQueue({
    pool: fixture.appPool,
    clock: () => new Date("2026-08-08T00:11:00.000Z"),
  });
  const providerCursor = "https://graph.microsoft.com/v1.0/me/mailFolders/inbox/messages/delta?$deltatoken=provider-never-store-plaintext";
  const delta = createGraphDeltaReconciliationService({
    state_lookup: restarted.readReconciliationState,
    cursor_store: restarted.cursor_store,
    queue,
    provider: {
      async listOwnMessageDelta() {
        return { messages: [{ message_id: "message-outm27-store" }], delta_link: providerCursor };
      },
    },
    clock: () => new Date("2026-08-08T00:11:00.000Z"),
    max_pages: 2,
    recovery_window_ms: 60 * 60 * 1000,
  });
  assert.deepEqual(await delta.reconcile({ ...input, resources: [RESOURCE] }), {
    outcome: "reconciled",
    enqueued: 1,
  });
  const afterDelta = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => ({
    cursor: (await client.query("SELECT cursor_ref FROM lawos_email_dms.graph_delta_cursors")).rows[0].cursor_ref,
    job: (await client.query("SELECT source FROM lawos_email_dms.graph_notification_receipts WHERE message_id='message-outm27-store'")).rows[0],
    audit: (await client.query("SELECT details::text AS details FROM lawos_email_dms.graph_sync_audit_events")).rows,
  }));
  assert.equal(afterDelta.job.source, "delta_reconciliation");
  assert.match(afterDelta.cursor, /^sealed:v1:/u);
  assert.equal(JSON.stringify(afterDelta).includes("provider-never-store-plaintext"), false);
});
