import { GRAPH_MESSAGE_RESOURCES, requiredSyncString } from "../../../packages/email-dms/src/conversation-sync-model.js";
import { hashMailboxAddress } from "../../../packages/email-dms/src/m365-connection-model.js";
import { isOpaqueCredentialReference } from "../../../packages/persistence/src/credential-reference.js";
import { withPostgresTransaction } from "../../../packages/persistence/src/postgres/transaction.js";

function exactProviderIds(value) {
  if (!Array.isArray(value) || value.length < 1
    || value.length > GRAPH_MESSAGE_RESOURCES.length) {
    throw new TypeError("one or two provider_subscription_ids are required");
  }
  const ids = value.map((provider_subscription_id) =>
    requiredSyncString({ provider_subscription_id }, "provider_subscription_id"));
  if (new Set(ids).size !== ids.length) {
    throw new TypeError("provider_subscription_ids must be unique");
  }
  return Object.freeze(ids);
}

function exactCleanupConnection(payload, input) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || payload.model_type !== "M365Connection"
    || payload.tenant_id !== input.tenant_id
    || payload.user_id !== input.user_id
    || payload.entra_subject_id !== input.entra_subject_id
    || payload.m365_connection_id !== input.m365_connection_id
    || payload.mailbox_address_hash !== input.mailbox_ref
    || !/^[a-f0-9]{64}$/u.test(payload.mailbox_address_hash)
    || payload.connection_authority !== "delegated"
    || payload.mailbox_scope !== "me"
    || !isOpaqueCredentialReference(payload.credential_ref)) {
    throw new Error("Microsoft Graph cleanup connection ownership does not match");
  }
  return Object.freeze({
    tenant_id: payload.tenant_id,
    user_id: payload.user_id,
    entra_subject_id: payload.entra_subject_id,
    m365_connection_id: payload.m365_connection_id,
    mailbox_address_hash: payload.mailbox_address_hash,
    credential_ref: payload.credential_ref,
  });
}

function credentialOwned(credential, connection) {
  return requiredSyncString(credential, "entra_subject_id")
      === connection.entra_subject_id
    && hashMailboxAddress(requiredSyncString(credential, "mailbox_address"))
      === connection.mailbox_address_hash;
}

export function createPostgresM365CleanupSessionFactory({
  pool,
  tenant_id,
  entra_tenant_id,
  credential_vault,
  conversation_provider,
  clock,
} = {}) {
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
  const entraTenantId = requiredSyncString({ entra_tenant_id }, "entra_tenant_id");

  return async function createDeleteSession(input = {}, suppliedCredential = null) {
    for (const field of [
      "tenant_id", "user_id", "entra_subject_id", "m365_connection_id",
      "mailbox_ref", "entra_tenant_id",
    ]) requiredSyncString(input, field);
    if (input.tenant_id !== tenantId || input.entra_tenant_id !== entraTenantId) {
      throw new Error("Microsoft Graph cleanup tenant authority does not match");
    }
    const providerIds = exactProviderIds(input.provider_subscription_ids);
    const rows = await withPostgresTransaction(
      pool,
      { tenant_id: tenantId, readOnly: true },
      async (client) => (await client.query(
        `SELECT subscription.provider_subscription_id,subscription.resource,
                connection.payload->>'model_type' AS connection_model_type,
                connection.payload->>'tenant_id' AS connection_tenant_id,
                connection.payload->>'user_id' AS connection_user_id,
                connection.payload->>'entra_subject_id' AS connection_subject_id,
                connection.payload->>'m365_connection_id' AS connection_id,
                connection.payload->>'mailbox_address_hash' AS connection_mailbox_ref,
                connection.payload->>'credential_ref' AS connection_credential_ref,
                connection.payload->>'connection_authority' AS connection_authority,
                connection.payload->>'mailbox_scope' AS connection_mailbox_scope
           FROM lawos_email_dms.graph_subscriptions subscription
           JOIN lawos_domain.records connection
             ON connection.tenant_id=subscription.tenant_id
            AND connection.domain_id='email-dms'
            AND connection.record_type='M365Connection'
            AND connection.record_id=subscription.m365_connection_id
          WHERE subscription.tenant_id=$1 AND subscription.user_id=$2
            AND subscription.entra_subject_id=$3
            AND subscription.entra_tenant_id=$4
            AND subscription.m365_connection_id=$5
            AND subscription.mailbox_ref=$6
            AND subscription.provider_subscription_id=ANY($7::text[])
            AND subscription.status='cleanup_pending'`,
        [tenantId, input.user_id, input.entra_subject_id, entraTenantId,
          input.m365_connection_id, input.mailbox_ref, providerIds],
      )).rows,
    );
    const matchedProviderIds = new Set(rows.map((row) =>
      row.provider_subscription_id));
    const matchedResources = new Set(rows.map((row) => row.resource));
    if (rows.length !== providerIds.length
      || matchedProviderIds.size !== providerIds.length
      || providerIds.some((providerId) => !matchedProviderIds.has(providerId))
      || matchedResources.size !== rows.length
      || rows.some(({ resource }) => !GRAPH_MESSAGE_RESOURCES.includes(resource))) {
      throw new Error("Microsoft Graph cleanup provider ownership does not match");
    }
    const connection = exactCleanupConnection({
      model_type: rows[0].connection_model_type,
      tenant_id: rows[0].connection_tenant_id,
      user_id: rows[0].connection_user_id,
      entra_subject_id: rows[0].connection_subject_id,
      m365_connection_id: rows[0].connection_id,
      mailbox_address_hash: rows[0].connection_mailbox_ref,
      credential_ref: rows[0].connection_credential_ref,
      connection_authority: rows[0].connection_authority,
      mailbox_scope: rows[0].connection_mailbox_scope,
    }, input);
    let credential = suppliedCredential
      ?? await credential_vault.resolveDelegatedCredential({
        credential_ref: connection.credential_ref,
      });
    if (!credentialOwned(credential, connection)) {
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
      if (!refreshed || !credentialOwned(refreshed, connection)
        || !Number.isFinite(Date.parse(refreshed.expires_at))
        || Date.parse(refreshed.expires_at) <= at.getTime()) {
        throw new Error("Microsoft Graph cleanup refreshed credential is invalid");
      }
      credential = refreshed;
    }
    requiredSyncString(credential, "access_token", 32 * 1024);
    const remaining = new Set(providerIds);
    return Object.freeze({
      async deleteOwnMessageSubscription({ provider_subscription_id } = {}) {
        const providerId = requiredSyncString(
          { provider_subscription_id },
          "provider_subscription_id",
        );
        if (!remaining.delete(providerId)) {
          throw new Error("Microsoft Graph cleanup session provider ownership does not match");
        }
        return conversation_provider.deleteOwnMessageSubscription({
          tenant_id: tenantId,
          entra_tenant_id: entraTenantId,
          user_id: connection.user_id,
          entra_subject_id: connection.entra_subject_id,
          m365_connection_id: connection.m365_connection_id,
          mailbox_scope: "me",
          provider_subscription_id: providerId,
          credential,
        });
      },
    });
  };
}
