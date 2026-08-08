import { GRAPH_MESSAGE_RESOURCES, requiredSyncString } from "./conversation-sync-model.js";

function assertMe(input) {
  if (input.mailbox_scope !== "me" || !GRAPH_MESSAGE_RESOURCES.includes(input.resource)) {
    throw new TypeError("Graph conversation provider is limited to the signed-in user's Inbox and Sent Items");
  }
}

export function createMicrosoftGraphConversationProvider({ microsoft_egress_transport } = {}) {
  if (!microsoft_egress_transport) throw new TypeError("microsoft_egress_transport is required");
  const accessToken = (credential) => requiredSyncString(credential, "access_token", 32 * 1024);
  return Object.freeze({
    async createOwnMessageSubscription(input = {}) {
      assertMe(input);
      return microsoft_egress_transport.graphMessageSubscriptionCreate({
        access_token: accessToken(input.credential),
        resource: input.resource,
        change_type: "created",
        client_state: requiredSyncString(input, "client_state", 128),
        expiration_datetime: requiredSyncString(input, "expiration_datetime", 64),
      });
    },
    async renewOwnMessageSubscription(input = {}) {
      assertMe(input);
      return microsoft_egress_transport.graphMessageSubscriptionRenew({
        access_token: accessToken(input.credential),
        provider_subscription_id: requiredSyncString(input, "provider_subscription_id"),
        expiration_datetime: requiredSyncString(input, "expiration_datetime", 64),
      });
    },
    async listOwnMessageSubscriptions(input = {}) {
      if (input.mailbox_scope !== "me") throw new TypeError("mailbox_scope must be me");
      return microsoft_egress_transport.graphMessageSubscriptionList({ access_token: accessToken(input.credential) });
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
