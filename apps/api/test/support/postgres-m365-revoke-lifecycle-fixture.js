import { createHash } from "node:crypto";

import { EMAIL_DMS_DOMAIN_DESCRIPTOR } from "../../../../packages/email-dms/src/central-ledger.js";
import { createGraphCursorCodec } from "../../../../packages/email-dms/src/graph-cursor-codec.js";
import { hashMailboxAddress, m365ConnectionId } from "../../../../packages/email-dms/src/m365-connection-model.js";
import { createM365GraphConnectionService } from "../../../../packages/email-dms/src/m365-graph-connection-service.js";
import { listEmailDmsPostgresMigrations } from "../../../../packages/email-dms/src/migrations/index.js";
import { createPostgresConversationSyncStore } from "../../../../packages/email-dms/src/postgres-conversation-sync-store.js";
import { createPostgresGraphSubscriptionService } from "../../../../packages/email-dms/src/postgres-graph-subscription-service.js";
import { createEmailDmsRepository } from "../../../../packages/email-dms/src/repository.js";
import { createPostgresDomainLedger } from "../../../../packages/persistence/src/postgres/domain-ledger.js";
import { createRecordRepositoryDomainSnapshot, runRecordRepositoryDomainCommand } from "../../../../packages/persistence/src/record-domain-adapter.js";
import { withPostgresTransaction } from "../../../../packages/persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../../../packages/persistence/test/helpers/disposable-postgres.js";
import { runWithRequestFailureCompensation } from "../../src/postgres-api-runtime-authority.js";
import { createPostgresM365ConversationCleanupPort } from "../../src/postgres-m365-conversation-port.js";

const TENANT = "tenant-outm26-revoke-lifecycle";
const USER = "user-outm26-revoke-lifecycle";
const SUBJECT = "subject-outm26-revoke-lifecycle";
const CONNECTION = m365ConnectionId({ tenant_id: TENANT, user_id: USER });
const ENTRA_TENANT = "entra-outm26-revoke-lifecycle";
const MAILBOX = "revoke-lifecycle@example.test";
const MAILBOX_REF = hashMailboxAddress(MAILBOX);
const NOTIFICATION_URL = "https://api.example.test/api/outlook/graph/notifications";
const CURRENT_REF = "aws-secrets-manager:synthetic/outm26-revoke/current";
const SCOPES = ["Calendars.ReadWrite", "Mail.Read", "offline_access"];
const RESOURCES = ["me/mailFolders('inbox')/messages", "me/mailFolders('sentitems')/messages"];

function token({ expiresAt, accessToken }) {
  return {
    access_token: accessToken,
    refresh_token: `${accessToken}-refresh`,
    refresh_profile: "client",
    refresh_profile_proof: "r".repeat(43),
    entra_subject_id: SUBJECT,
    mailbox_address: MAILBOX,
    consented_at: "2026-08-07T00:00:00.000Z",
    expires_at: expiresAt,
    granted_scopes: SCOPES,
  };
}

export async function createPostgresM365RevokeLifecycleFixture(t, {
  expired = false,
  failSentOnce = false,
} = {}) {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 8 });
  if (!fixture) return null;
  const migrations = listEmailDmsPostgresMigrations();
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migrations[3].sql);
  let now = new Date("2026-08-08T00:10:00.000Z");
  const initialExpiry = expired ? "2026-08-08T00:05:00.000Z" : "2026-08-08T01:00:00.000Z";
  const repository = createEmailDmsRepository({ seedRecords: [{
    model_type: "M365Connection",
    tenant_id: TENANT,
    m365_connection_id: CONNECTION,
    user_id: USER,
    entra_subject_id: SUBJECT,
    mailbox_address_hash: MAILBOX_REF,
    credential_ref: CURRENT_REF,
    granted_scopes: SCOPES,
    consented_at: "2026-08-07T00:00:00.000Z",
    expires_at: initialExpiry,
    state_version: 1,
  }] });
  const ledger = createPostgresDomainLedger({ pool: fixture.appPool });
  try {
    await ledger.importSnapshot(createRecordRepositoryDomainSnapshot({
      descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
      repositories: [{ source_id: "outm26-revoke-lifecycle", repository }],
      tenant_id: TENANT,
    }).snapshot);
  } finally { repository.close(); }
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, async (client) => {
    for (const [index, resource] of RESOURCES.entries()) {
      await client.query(
        `INSERT INTO lawos_email_dms.graph_subscriptions
          (tenant_id,subscription_id,user_id,entra_subject_id,entra_tenant_id,
           m365_connection_id,mailbox_ref,resource,change_type,client_state_hash,
           client_state_ref,notification_url_hash,provider_subscription_id,
           provider_expires_at,status,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'created',$9,$10,$11,$12,$13,'active',$14,$14)`,
        [TENANT, `subscription-revoke-${index}`, USER, SUBJECT, ENTRA_TENANT,
          CONNECTION, MAILBOX_REF, resource, `${index + 1}`.repeat(64),
          `client_state_ref_${String(index + 1).repeat(32)}`,
          createHash("sha256").update(NOTIFICATION_URL).digest("hex"),
          `provider-revoke-${index}`, "2026-08-08T02:00:00.000Z",
          "2026-08-08T00:00:00.000Z"],
      );
    }
  });

  const events = [];
  const credentialStore = new Map([[CURRENT_REF, token({
    expiresAt: initialExpiry,
    accessToken: expired ? "expired-access" : "current-access",
  })]]);
  const credentialVault = {
    referenceForGeneration({ credential_generation: generation }) {
      return `aws-secrets-manager:synthetic/outm26-revoke/${generation}`;
    },
    async resolveDelegatedCredential({ credential_ref: ref }) {
      if (!credentialStore.has(ref)) {
        throw Object.assign(new Error("credential missing"), {
          name: "ResourceNotFoundException",
        });
      }
      return structuredClone(credentialStore.get(ref));
    },
    async storeDelegatedCredential({ credential_generation, token_bundle }) {
      const ref = this.referenceForGeneration({ credential_generation });
      credentialStore.set(ref, structuredClone(token_bundle));
      events.push(["vault_store", ref]);
      return ref;
    },
    async deleteDelegatedCredential({ credential_ref: ref }) {
      events.push(["vault_delete", ref]);
      credentialStore.delete(ref);
      return { deleted: true };
    },
  };
  const remote = new Set(["provider-revoke-0", "provider-revoke-1"]);
  let pendingSentFailure = failSentOnce;
  const requireUsable = (credential) => {
    if (Date.parse(credential.expires_at) <= now.getTime()) {
      throw Object.assign(new Error("expired access token rejected"), { status: 401 });
    }
  };
  const provider = {
    async refreshDelegatedCredential({ credential }) {
      events.push(["refresh", credential.access_token]);
      return {
        expires_at: "2026-08-08T01:30:00.000Z",
        token_bundle: token({
          expiresAt: "2026-08-08T01:30:00.000Z",
          accessToken: "refreshed-access",
        }),
      };
    },
    async revokeDelegatedCredential({ credential }) {
      requireUsable(credential);
      events.push(["provider_revoke", credential.access_token]);
      return { revoked: true };
    },
    async deleteOwnMessageSubscription(input) {
      requireUsable(input.credential);
      events.push(["subscription_delete", input.provider_subscription_id,
        input.credential.access_token]);
      if (input.provider_subscription_id === "provider-revoke-1"
        && pendingSentFailure) {
        pendingSentFailure = false;
        throw new Error("synthetic transient subscription delete");
      }
      remote.delete(input.provider_subscription_id);
      return { deleted: true };
    },
    async createOwnMessageSubscription() { throw new Error("create not allowed"); },
    async renewOwnMessageSubscription() { throw new Error("renew not allowed"); },
    async listOwnMessageSubscriptions() { throw new Error("list not allowed"); },
  };
  const cleanupPort = createPostgresM365ConversationCleanupPort({
    pool: fixture.appPool,
    ledger,
    tenant_id: TENANT,
    entra_tenant_id: ENTRA_TENANT,
    credential_vault: credentialVault,
    conversation_provider: provider,
    clock: () => now,
  });
  const store = createPostgresConversationSyncStore({
    pool: fixture.appPool,
    tenant_id: TENANT,
    cursor_codec: createGraphCursorCodec({ key: Buffer.alloc(32, 7) }),
  });
  const subscriptionService = createPostgresGraphSubscriptionService({
    pool: fixture.appPool,
    tenant_id: TENANT,
    state_lookup: store.readConnectionState,
    provider,
    cleanup_provider: cleanupPort,
    entra_tenant_id: ENTRA_TENANT,
    notification_url: NOTIFICATION_URL,
    clock: () => now,
  });

  const revoke = () => runWithRequestFailureCompensation(async (compensator) => {
    const command = await runRecordRepositoryDomainCommand({
      ledger,
      descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
      tenant_id: TENANT,
      create_repository: createEmailDmsRepository,
      command: (domainRepository) => createM365GraphConnectionService({
        repository: domainRepository,
        credential_vault: credentialVault,
        provider,
        feature_enabled: true,
        provider_runtime_enabled: true,
        request_failure_compensator: compensator,
        clock: () => now,
        before_revoke_connection: (input) =>
          subscriptionService.cleanupBeforeConnectionRevoke(input),
      }).revokeConnection({
        tenant_id: TENANT,
        user_id: USER,
        entra_subject_id: SUBJECT,
        expected_state_version: 1,
        reason: "owner_requested_disconnect",
      }),
    });
    return command.result;
  });
  const state = () => withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => ({
      connection: (await client.query(
        `SELECT payload FROM lawos_domain.records
          WHERE tenant_id=$1 AND domain_id='email-dms'
            AND record_type='M365Connection' AND record_id=$2`,
        [TENANT, CONNECTION],
      )).rows[0].payload,
      subscriptions: (await client.query(
        `SELECT resource,status,provider_subscription_id,next_attempt_at
           FROM lawos_email_dms.graph_subscriptions ORDER BY resource`,
      )).rows,
    }),
  );
  return {
    credentialStore,
    events,
    remote,
    revoke,
    cleanupExpired: () => subscriptionService.reconcile({
      tenant_id: TENANT,
      user_id: USER,
      entra_subject_id: SUBJECT,
      actor_id: "graph-subscription-reconciler",
      m365_connection_id: CONNECTION,
    }),
    state,
    advancePastRetry: async () => {
      const retry = (await state()).subscriptions
        .map(({ next_attempt_at: value }) => Date.parse(value))
        .filter(Number.isFinite);
      now = new Date(Math.max(...retry) + 1);
    },
  };
}
