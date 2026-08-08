import { EMAIL_DMS_DOMAIN_DESCRIPTOR } from "../../../packages/email-dms/src/central-ledger.js";
import { createM365ConversationSyncPort } from "../../../packages/email-dms/src/m365-conversation-sync-port.js";
import { createEmailDmsRepository } from "../../../packages/email-dms/src/repository.js";
import { requiredSyncString } from "../../../packages/email-dms/src/conversation-sync-model.js";
import {
  hashMailboxAddress,
  normalizeM365Connection,
} from "../../../packages/email-dms/src/m365-connection-model.js";
import { runRecordRepositoryDomainCommand } from "../../../packages/persistence/src/record-domain-adapter.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";

const METHODS = Object.freeze([
  "createOwnMessageSubscription",
  "renewOwnMessageSubscription",
  "listOwnMessageSubscriptions",
  "deleteOwnMessageSubscription",
  "listOwnMessageDelta",
]);

export function createPostgresM365ConversationPort({
  ledger,
  tenant_id,
  credential_vault,
  conversation_provider,
  clock = () => new Date(),
} = {}) {
  if (typeof ledger?.transaction !== "function") throw new TypeError("PostgreSQL domain ledger is required");
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
  for (const method of METHODS) {
    if (typeof conversation_provider?.[method] !== "function") throw new TypeError("Microsoft Graph conversation provider is required");
  }

  async function execute(method, input = {}) {
    if (requiredSyncString(input, "tenant_id") !== tenantId) throw new Error("Microsoft Graph tenant authority does not match");
    const result = await runRecordRepositoryDomainCommand({
      ledger,
      descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
      tenant_id: tenantId,
      create_repository: createEmailDmsRepository,
      command: (repository) => createM365ConversationSyncPort({
        repository,
        credential_vault,
        conversation_provider,
        credential_refresh_provider: conversation_provider,
        feature_enabled: true,
        provider_runtime_enabled: true,
        clock,
      })[method](input),
    });
    return result.result;
  }

  return Object.freeze(Object.fromEntries(METHODS.map((method) => [
    method,
    (input = {}) => execute(method, input),
  ])));
}

export function createPostgresM365ConversationCleanupPort({
  pool,
  ledger,
  tenant_id,
  entra_tenant_id,
  credential_vault,
  conversation_provider,
  clock = () => new Date(),
} = {}) {
  if (!pool?.connect || typeof ledger?.transaction !== "function") {
    throw new TypeError("PostgreSQL cleanup authority is required");
  }
  if (typeof credential_vault?.resolveDelegatedCredential !== "function"
    || typeof conversation_provider?.deleteOwnMessageSubscription !== "function") {
    throw new TypeError("Microsoft Graph subscription cleanup dependencies are required");
  }
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
  const entraTenantId = requiredSyncString({ entra_tenant_id }, "entra_tenant_id");

  async function remove(input = {}, suppliedCredential = null) {
    const fields = [
      "tenant_id",
      "user_id",
      "entra_subject_id",
      "m365_connection_id",
      "mailbox_ref",
      "provider_subscription_id",
      "entra_tenant_id",
    ];
    for (const field of fields) requiredSyncString(input, field);
    if (input.tenant_id !== tenantId || input.entra_tenant_id !== entraTenantId) {
      throw new Error("Microsoft Graph cleanup tenant authority does not match");
    }
    const owned = await withPostgresTransaction(
      pool,
      { tenant_id: tenantId, readOnly: true },
      async (client) => (await client.query(
        `SELECT subscription_id FROM lawos_email_dms.graph_subscriptions
          WHERE tenant_id=$1 AND user_id=$2 AND entra_subject_id=$3
            AND entra_tenant_id=$4 AND m365_connection_id=$5
            AND mailbox_ref=$6 AND provider_subscription_id=$7
            AND status='cleanup_pending'`,
        [tenantId, input.user_id, input.entra_subject_id, entraTenantId,
          input.m365_connection_id, input.mailbox_ref,
          input.provider_subscription_id],
      )).rows,
    );
    if (owned.length !== 1) {
      throw new Error("Microsoft Graph cleanup provider ownership does not match");
    }
    const result = await runRecordRepositoryDomainCommand({
      ledger,
      descriptor: EMAIL_DMS_DOMAIN_DESCRIPTOR,
      tenant_id: tenantId,
      create_repository: createEmailDmsRepository,
      command: async (repository) => {
        const matches = repository.list({
          tenant_id: tenantId,
          model_type: "M365Connection",
        }).filter((record) =>
          record.m365_connection_id === input.m365_connection_id
          && record.user_id === input.user_id
          && record.entra_subject_id === input.entra_subject_id);
        if (matches.length !== 1) {
          throw new Error("Microsoft Graph cleanup connection ownership does not match");
        }
        let connection = normalizeM365Connection(matches[0]);
        if (connection.mailbox_address_hash !== input.mailbox_ref) {
          throw new Error("Microsoft Graph cleanup mailbox ownership does not match");
        }
        let credential = suppliedCredential;
        credential ??= await credential_vault.resolveDelegatedCredential({
          credential_ref: connection.credential_ref,
        });
        const credentialOwned = (value) =>
          requiredSyncString(value, "entra_subject_id") === connection.entra_subject_id
          && hashMailboxAddress(requiredSyncString(value, "mailbox_address"))
            === connection.mailbox_address_hash;
        if (!credentialOwned(credential)) {
          throw new Error("Microsoft Graph cleanup credential ownership does not match");
        }
        const at = clock();
        if (!(at instanceof Date) || !Number.isFinite(at.getTime())) {
          throw new TypeError("clock must return a valid Date");
        }
        const credentialExpiresAt = Date.parse(credential.expires_at);
        if (!Number.isFinite(credentialExpiresAt)) {
          throw new Error("Microsoft Graph cleanup credential expiry is invalid");
        }
        if (!suppliedCredential && credentialExpiresAt <= at.getTime()) {
          if (typeof conversation_provider.refreshDelegatedCredential !== "function") {
            throw new Error("Microsoft Graph cleanup credential refresh is unavailable");
          }
          const refreshed = (await conversation_provider.refreshDelegatedCredential({
            credential,
            entra_subject_id: connection.entra_subject_id,
            mailbox_scope: "me",
          }))?.token_bundle;
          if (!refreshed || !credentialOwned(refreshed)
            || !Number.isFinite(Date.parse(refreshed.expires_at))
            || Date.parse(refreshed.expires_at) <= at.getTime()) {
            throw new Error("Microsoft Graph cleanup refreshed credential is invalid");
          }
          requiredSyncString(refreshed, "access_token", 32 * 1024);
          credential = refreshed;
        }
        return conversation_provider.deleteOwnMessageSubscription({
          tenant_id: tenantId,
          entra_tenant_id: entraTenantId,
          user_id: connection.user_id,
          entra_subject_id: connection.entra_subject_id,
          m365_connection_id: connection.m365_connection_id,
          mailbox_scope: "me",
          provider_subscription_id: input.provider_subscription_id,
          credential,
        });
      },
    });
    return result.result;
  }

  return Object.freeze({
    authority: "postgres-m365-subscription-delete-only",
    deleteLocallyOwnedMessageSubscription: remove,
    deleteLocallyOwnedMessageSubscriptionBeforeRevoke(input = {}) {
      if (!input.credential || typeof input.credential !== "object") {
        throw new TypeError("Microsoft Graph pre-revoke delete credential is required");
      }
      return remove(input, input.credential);
    },
  });
}
