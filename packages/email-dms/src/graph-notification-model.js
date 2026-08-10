import { createHash } from "node:crypto";

import {
  GRAPH_LIFECYCLE_EVENTS,
  GRAPH_MESSAGE_RESOURCES,
  requiredSyncString,
} from "./conversation-sync-model.js";

export function normalizeGraphNotification(input) {
  for (const field of ["tenant_id", "subscription_id", "provider_subscription_id", "resource", "received_at"]) requiredSyncString(input, field);
  const source = requiredSyncString(input, "source");
  if (!["webhook", "delta_reconciliation"].includes(source)) throw new TypeError("source must be webhook or delta_reconciliation");
  if (!GRAPH_MESSAGE_RESOURCES.includes(input.resource)) throw new TypeError("resource must be Inbox or Sent Items messages");
  const lifecycle = input.lifecycle_event ?? null;
  if (lifecycle !== null) {
    if (source !== "webhook" || !GRAPH_LIFECYCLE_EVENTS.includes(lifecycle)) throw new TypeError("lifecycle_event is invalid");
    return { ...input, source, kind: "lifecycle", lifecycle_event: lifecycle, message_id: null, change_type: null, subscription_expiration_at: requiredSyncString(input, "subscription_expiration_at") };
  }
  if (input.change_type !== "created") throw new TypeError("change_type must be created");
  return { ...input, source, kind: "message", lifecycle_event: null, message_id: requiredSyncString(input, "message_id"), change_type: "created", subscription_expiration_at: input.subscription_expiration_at ?? null };
}

export function graphNotificationIdentity(input) {
  return {
    tenant_id: input.tenant_id,
    subscription_id: input.subscription_id,
    resource: input.resource,
    kind: input.kind,
    discriminator: input.kind === "message" ? input.message_id : `${input.lifecycle_event}:${input.subscription_expiration_at}`,
  };
}

export function graphNotificationPayloadHash(input) {
  return createHash("sha256").update(JSON.stringify({
    ...graphNotificationIdentity(input),
    provider_subscription_id: input.provider_subscription_id,
    change_type: input.change_type,
    lifecycle_event: input.lifecycle_event,
  })).digest("hex");
}
