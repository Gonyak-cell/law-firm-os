import { GRAPH_MESSAGE_RESOURCES, requiredSyncString } from "./conversation-sync-model.js";

function assertMe(input) {
  if (input.mailbox_scope !== "me" || !GRAPH_MESSAGE_RESOURCES.includes(input.resource)) {
    throw new TypeError("Graph conversation provider is limited to the signed-in user's Inbox and Sent Items");
  }
}

export function createMicrosoftGraphConversationProvider({ microsoft_egress_transport } = {}) {
  if (!microsoft_egress_transport) throw new TypeError("microsoft_egress_transport is required");
  const accessToken = (credential) => requiredSyncString(credential, "access_token", 32 * 1024);
  const bindOwner = (result, input) => {
    if (!input.entra_tenant_id || !input.entra_subject_id) return result;
    const binding = {
      entra_tenant_id: requiredSyncString(input, "entra_tenant_id"),
      account_id: requiredSyncString(input, "entra_subject_id"),
    };
    return Array.isArray(result)
      ? result.map((entry) => ({ ...entry, ...binding }))
      : { ...result, ...binding };
  };
  return Object.freeze({
    async createOwnMessageSubscription(input = {}) {
      assertMe(input);
      return bindOwner(await microsoft_egress_transport.graphMessageSubscriptionCreate({
        access_token: accessToken(input.credential),
        resource: input.resource,
        change_type: "created",
        client_state: requiredSyncString(input, "client_state", 128),
        expiration_datetime: requiredSyncString(input, "expiration_datetime", 64),
      }), input);
    },
    async renewOwnMessageSubscription(input = {}) {
      assertMe(input);
      return bindOwner(await microsoft_egress_transport.graphMessageSubscriptionRenew({
        access_token: accessToken(input.credential),
        provider_subscription_id: requiredSyncString(input, "provider_subscription_id"),
        expiration_datetime: requiredSyncString(input, "expiration_datetime", 64),
      }), input);
    },
    async listOwnMessageSubscriptions(input = {}) {
      if (input.mailbox_scope !== "me") throw new TypeError("mailbox_scope must be me");
      const binding = {
        entra_tenant_id: requiredSyncString(input, "entra_tenant_id"),
        account_id: requiredSyncString(input, "entra_subject_id"),
      };
      const subscriptions = await microsoft_egress_transport.graphMessageSubscriptionList({
        access_token: accessToken(input.credential),
        ...binding,
      });
      if (!Array.isArray(subscriptions) || subscriptions.some((entry) =>
        entry?.entra_tenant_id !== binding.entra_tenant_id
        || entry?.account_id !== binding.account_id)) {
        throw new Error("Graph subscription account binding does not match");
      }
      return subscriptions;
    },
    async deleteOwnMessageSubscription(input = {}) {
      if (input.mailbox_scope !== "me") throw new TypeError("mailbox_scope must be me");
      return microsoft_egress_transport.graphMessageSubscriptionDelete({
        access_token: accessToken(input.credential),
        provider_subscription_id: requiredSyncString(input, "provider_subscription_id"),
      });
    },
    async listOwnMessageDelta(input = {}) {
      assertMe(input);
      return microsoft_egress_transport.graphMessageDeltaList({
        access_token: accessToken(input.credential),
        resource: input.resource,
        delta_link: input.delta_link ?? null,
        start_at: input.start_at ?? null,
      });
    },
  });
}
