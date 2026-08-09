import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import { EMAIL_DMS_DOMAIN_DESCRIPTOR } from "../../../packages/email-dms/src/central-ledger.js";
import { createGraphCursorCodec } from "../../../packages/email-dms/src/graph-cursor-codec.js";
import { m365ConnectionId } from "../../../packages/email-dms/src/m365-connection-model.js";
import { listEmailDmsPostgresMigrations } from "../../../packages/email-dms/src/migrations/index.js";
import { createPostgresConversationMaintenanceAuthorityLookup } from "../../../packages/email-dms/src/postgres-conversation-maintenance-authority.js";
import { createPostgresConversationSyncStore } from "../../../packages/email-dms/src/postgres-conversation-sync-store.js";
import { createPostgresGraphSubscriptionService } from "../../../packages/email-dms/src/postgres-graph-subscription-service.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { createPostgresDomainLedger } from "../../../packages/persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot } from "../../../packages/persistence/src/record-domain-adapter.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  createPostgresM365ConversationCleanupPort,
  createPostgresM365ConversationPort,
} from "../src/postgres-m365-conversation-port.js";

const TENANT = "tenant-outm26-cleanup-port";
const USER = "user-outm26-cleanup-port";
const SUBJECT = "subject-outm26-cleanup-port";
const CONNECTION = m365ConnectionId({ tenant_id: TENANT, user_id: USER });
const ENTRA_TENANT = "entra-tenant-outm26-cleanup-port";
const RESOURCE = "me/mailFolders('inbox')/messages";
const PROVIDER_ID = "provider-outm26-cleanup-port";
const NOTIFICATION_URL = "https://api.example.test/api/outlook/graph/notifications";
const MAILBOX = "cleanup-port@example.test";
const MAILBOX_HASH = createHash("sha256").update(MAILBOX).digest("hex");

async function seed(t) {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 6 });
  if (!fixture) return null;
  const migrations = listEmailDmsPostgresMigrations();
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migrations[3].sql);
  const repository = createEmailDmsRepository({ seedRecords: [{
    model_type: "M365Connection",
    tenant_id: TENANT,
    m365_connection_id: CONNECTION,
    user_id: USER,
    entra_subject_id: SUBJECT,
    mailbox_address_hash: MAILBOX_HASH,
    credential_ref: "aws-secrets-manager:synthetic/cleanup-port",
    granted_scopes: ["Calendars.ReadWrite"],
    consented_at: "2026-08-08T00:00:00.000Z",
    expires_at: "2026-08-08T00:30:00.000Z",
    revoked_at: "2026-08-08T00:10:00.000Z",
    state_version: 2,
  }] });
  try {
    await createPostgresDomainLedger({ pool: fixture.appPool }).importSnapshot(
      createRecordRepositoryDomainSnapshot({
        descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
        repositories: [{ source_id: "outm26-cleanup-port", repository }],
        tenant_id: TENANT,
      }).snapshot,
    );
  } finally { repository.close(); }
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
    `INSERT INTO lawos_email_dms.graph_subscriptions
       (tenant_id,subscription_id,user_id,entra_subject_id,entra_tenant_id,
        m365_connection_id,mailbox_ref,resource,change_type,client_state_hash,
        client_state_ref,notification_url_hash,provider_subscription_id,
        provider_expires_at,status,created_at,updated_at)
     VALUES ($1,'subscription-cleanup-port',$2,$3,$4,$5,$6,$7,'created',$8,$9,$10,
       $11,'2026-08-08T02:00:00.000Z','active',$12,$12)`,
    [TENANT, USER, SUBJECT, ENTRA_TENANT, CONNECTION, MAILBOX_HASH, RESOURCE,
      "b".repeat(64), `client_state_ref_${"c".repeat(32)}`,
      createHash("sha256").update(NOTIFICATION_URL).digest("hex"), PROVIDER_ID,
      "2026-08-08T00:00:00.000Z"],
  ));
  return fixture;
}

test("OUTM-26 revoked cleanup uses only the owner-bound production delete capability", async (t) => {
  const fixture = await seed(t);
  if (!fixture) return;
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  let now = new Date("2026-08-08T00:10:01.000Z");
  let failDelete = true;
  const calls = [];
  const currentCredentialRef = "aws-secrets-manager:synthetic/cleanup-port";
  const allScopes = ["Calendars.ReadWrite", "Mail.Read", "offline_access"];
  const credential = (expiresAt, accessToken) => ({
    access_token: accessToken,
    refresh_token: `${accessToken}-refresh`,
    refresh_profile: "client",
    refresh_profile_proof: "p".repeat(43),
    entra_subject_id: SUBJECT,
    mailbox_address: MAILBOX,
    consented_at: "2026-08-08T00:00:00.000Z",
    expires_at: expiresAt,
    granted_scopes: allScopes,
  });
  const credentials = new Map([[currentCredentialRef,
    credential("2026-08-08T00:30:00.000Z", "cleanup-access-token")]]);
  const provider = Object.fromEntries([
    "createOwnMessageSubscription",
    "renewOwnMessageSubscription",
    "listOwnMessageSubscriptions",
    "deleteOwnMessageSubscription",
    "listOwnMessageDelta",
  ].map((method) => [method, async (input) => {
    calls.push([method, input]);
    if (method === "deleteOwnMessageSubscription") {
      if (failDelete) throw new Error("synthetic cleanup outage");
      if (Date.parse(input.credential.expires_at) <= now.getTime()) {
        throw Object.assign(new Error("expired cleanup token rejected"), {
          status: 401,
        });
      }
      return { deleted: true, provider_subscription_id: input.provider_subscription_id };
    }
    throw new Error("cleanup must not use non-delete Graph operations");
  }]));
  provider.refreshDelegatedCredential = async () => ({
    expires_at: "2026-08-08T01:30:00.000Z",
    token_bundle: credential(
      "2026-08-08T01:30:00.000Z",
      "cleanup-refreshed-token",
    ),
  });
  const credentialVault = {
    referenceForGeneration({ credential_generation: generation }) {
      return `aws-secrets-manager:synthetic/cleanup-port/${generation}`;
    },
    async resolveDelegatedCredential({ credential_ref: credentialRef }) {
      if (!credentials.has(credentialRef)) {
        throw Object.assign(new Error("credential not found"), {
          name: "ResourceNotFoundException",
        });
      }
      return structuredClone(credentials.get(credentialRef));
    },
    async storeDelegatedCredential({ credential_generation, token_bundle }) {
      credentials.set(
        this.referenceForGeneration({ credential_generation }),
        structuredClone(token_bundle),
      );
    },
    async deleteDelegatedCredential({ credential_ref: credentialRef }) {
      credentials.delete(credentialRef);
      return { deleted: true };
    },
  };
  const activePort = createPostgresM365ConversationPort({
    ledger,
    tenant_id: TENANT,
    credential_vault: credentialVault,
    conversation_provider: provider,
    clock: () => now,
  });
  await assert.rejects(activePort.deleteOwnMessageSubscription({
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    m365_connection_id: CONNECTION,
    provider_subscription_id: PROVIDER_ID,
  }), (error) => error.safe_error_code === "M365_CONNECTION_NOT_FOUND");
  assert.equal(calls.length, 0);

  const cleanupPort = createPostgresM365ConversationCleanupPort({
    pool: fixture.appPool,
    ledger,
    tenant_id: TENANT,
    entra_tenant_id: ENTRA_TENANT,
    credential_vault: credentialVault,
    conversation_provider: provider,
    clock: () => now,
  });
  assert.deepEqual(Object.keys(cleanupPort).sort(), [
    "authority",
    "createLocallyOwnedMessageSubscriptionDeleteSession",
    "deleteLocallyOwnedMessageSubscription",
    "deleteLocallyOwnedMessageSubscriptionBeforeRevoke",
  ]);
  const store = createPostgresConversationSyncStore({
    pool: fixture.appPool,
    tenant_id: TENANT,
    cursor_codec: createGraphCursorCodec({ key: Buffer.alloc(32, 4) }),
  });
  const service = createPostgresGraphSubscriptionService({
    pool: fixture.appPool,
    tenant_id: TENANT,
    state_lookup: store.readConnectionState,
    maintenance_state_lookup: createPostgresConversationMaintenanceAuthorityLookup({
      pool: fixture.appPool,
      tenant_id: TENANT,
    }),
    provider: activePort,
    cleanup_provider: cleanupPort,
    entra_tenant_id: ENTRA_TENANT,
    notification_url: NOTIFICATION_URL,
    clock: () => now,
  });
  const input = {
    tenant_id: TENANT,
    user_id: USER,
    entra_subject_id: SUBJECT,
    actor_id: "graph-subscription-reconciler",
    m365_connection_id: CONNECTION,
  };
  await assert.rejects(service.reconcile(input), /synthetic cleanup outage/u);
  let state = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => ({
    subscription: (await client.query("SELECT status,provider_subscription_id,next_attempt_at FROM lawos_email_dms.graph_subscriptions")).rows[0],
    retries: Number((await client.query("SELECT count(*)::int AS count FROM lawos_email_dms.graph_sync_audit_events WHERE event_type='graph_subscription.delete_retry_scheduled'")).rows[0].count),
  }));
  assert.equal(state.subscription.status, "cleanup_pending");
  assert.equal(state.subscription.provider_subscription_id, PROVIDER_ID);
  assert.equal(state.retries, 1);
  await assert.rejects(
    cleanupPort.deleteLocallyOwnedMessageSubscriptionBeforeRevoke({
      tenant_id: TENANT,
      user_id: USER,
      entra_subject_id: SUBJECT,
      m365_connection_id: CONNECTION,
      mailbox_ref: MAILBOX_HASH,
      provider_subscription_id: PROVIDER_ID,
      entra_tenant_id: ENTRA_TENANT,
      credential: {
        ...credential("2026-08-08T00:30:00.000Z", "wrong-owner-token"),
        entra_subject_id: "wrong-subject",
      },
    }),
    /credential ownership/u,
  );
  assert.equal(calls.length, 1);

  failDelete = false;
  now = new Date(Date.parse(state.subscription.next_attempt_at) + 1);
  const cleaned = await service.reconcile(input);
  assert.equal(cleaned.outcome, "revoked_connection");
  state = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => ({
    subscription: (await client.query("SELECT status,provider_subscription_id FROM lawos_email_dms.graph_subscriptions")).rows[0],
    revoked: Number((await client.query("SELECT count(*)::int AS count FROM lawos_email_dms.graph_sync_audit_events WHERE event_type='graph_subscription.revoked'")).rows[0].count),
  }));
  assert.deepEqual(state.subscription, { status: "revoked", provider_subscription_id: null });
  assert.equal(state.revoked, 1);
  assert.deepEqual(calls.map(([method, value]) => [method, value.provider_subscription_id]), [
    ["deleteOwnMessageSubscription", PROVIDER_ID],
    ["deleteOwnMessageSubscription", PROVIDER_ID],
  ]);

  async function resetConnectionAndSubscription({ providerId, scopes, expiresAt }) {
    await withPostgresTransaction(
      fixture.appPool,
      { tenant_id: TENANT },
      async (client) => {
        await client.query(
          `UPDATE lawos_domain.records
              SET payload=(payload - 'revoked_at')
                || jsonb_build_object('granted_scopes',$2::jsonb,'expires_at',$3::text)
            WHERE tenant_id=$1 AND domain_id='email-dms'
              AND record_type='M365Connection' AND record_id=$4`,
          [TENANT, JSON.stringify(scopes), expiresAt, CONNECTION],
        );
        await client.query(
          `UPDATE lawos_email_dms.graph_subscriptions
              SET provider_subscription_id=$2,provider_expires_at=$3,status='active',
                  attempt_count=0,next_attempt_at=NULL,last_error_code=NULL
            WHERE tenant_id=$1`,
          [TENANT, providerId, "2026-08-08T02:00:00.000Z"],
        );
      },
    );
  }

  await resetConnectionAndSubscription({
    providerId: "provider-outm26-scope-lost",
    scopes: ["Calendars.ReadWrite"],
    expiresAt: "2026-08-08T00:30:00.000Z",
  });
  const scopeLost = await service.reconcile(input);
  assert.equal(scopeLost.outcome, "scope_lost_connection");

  await resetConnectionAndSubscription({
    providerId: "provider-outm26-expired",
    scopes: allScopes,
    expiresAt: "2026-08-08T00:09:00.000Z",
  });
  credentials.set(currentCredentialRef,
    credential("2026-08-08T00:09:00.000Z", "cleanup-expired-token"));
  const expired = await service.reconcile(input);
  assert.equal(expired.outcome, "expired_connection");
  assert.deepEqual(calls
    .filter(([method]) => method === "deleteOwnMessageSubscription")
    .map(([method, value]) => [method, value.provider_subscription_id]), [
    ["deleteOwnMessageSubscription", PROVIDER_ID],
    ["deleteOwnMessageSubscription", PROVIDER_ID],
    ["deleteOwnMessageSubscription", "provider-outm26-scope-lost"],
    ["deleteOwnMessageSubscription", "provider-outm26-expired"],
  ]);
  await resetConnectionAndSubscription({
    providerId: "provider-outm26-malformed-expiry",
    scopes: ["Mail.Read"],
    expiresAt: "not-an-instant",
  });
  const malformed = await service.reconcile(input);
  assert.equal(malformed.outcome, "expired_connection");
  assert.equal(calls.some(([, value]) =>
    value.provider_subscription_id === "provider-outm26-malformed-expiry"), true);
});
