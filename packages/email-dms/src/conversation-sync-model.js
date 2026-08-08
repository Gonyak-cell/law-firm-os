import { createHash } from "node:crypto";

export const GRAPH_MESSAGE_RESOURCES = Object.freeze([
  "me/mailFolders('inbox')/messages",
  "me/mailFolders('sentitems')/messages",
]);

export const CONVERSATION_POLICY_STATUSES = Object.freeze([
  "active",
  "paused",
  "revoked",
]);

export const GRAPH_SUBSCRIPTION_STATUSES = Object.freeze([
  "pending",
  "active",
  "reauthorization_required",
  "expired",
  "revoked",
]);

export const GRAPH_LIFECYCLE_EVENTS = Object.freeze([
  "missed",
  "reauthorizationRequired",
  "subscriptionRemoved",
]);

export function requiredSyncString(input, field, maxLength = 1024) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${field} is required`);
  }
  const normalized = value.trim();
  if (normalized.length > maxLength) {
    throw new TypeError(`${field} exceeds ${maxLength} characters`);
  }
  return normalized;
}

export function syncDigest(prefix, value) {
  return `${prefix}_${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")
    .slice(0, 32)}`;
}

export function conversationPolicyId(input = {}) {
  return syncDigest("conversation_policy", {
    tenant_id: requiredSyncString(input, "tenant_id"),
    m365_connection_id: requiredSyncString(input, "m365_connection_id"),
    conversation_id: requiredSyncString(input, "conversation_id"),
    matter_id: requiredSyncString(input, "matter_id"),
  });
}

export function normalizeConversationPolicy(input = {}) {
  const status = requiredSyncString(input, "status");
  if (!CONVERSATION_POLICY_STATUSES.includes(status)) {
    throw new TypeError("conversation policy status is invalid");
  }
  if (!Number.isSafeInteger(input.version) || input.version < 1) {
    throw new TypeError("conversation policy version must be positive");
  }
  return Object.freeze({
    policy_id: requiredSyncString(input, "policy_id"),
    tenant_id: requiredSyncString(input, "tenant_id"),
    user_id: requiredSyncString(input, "user_id"),
    entra_subject_id: requiredSyncString(input, "entra_subject_id"),
    m365_connection_id: requiredSyncString(input, "m365_connection_id"),
    mailbox_ref: requiredSyncString(input, "mailbox_ref"),
    conversation_id: requiredSyncString(input, "conversation_id"),
    matter_id: requiredSyncString(input, "matter_id"),
    seed_email_thread_id: requiredSyncString(input, "seed_email_thread_id"),
    seed_filing_receipt_ref: requiredSyncString(input, "seed_filing_receipt_ref"),
    enabling_actor_id: requiredSyncString(input, "enabling_actor_id"),
    status,
    pause_reason: input.pause_reason ?? null,
    version: input.version,
    created_at: requiredSyncString(input, "created_at"),
    updated_at: requiredSyncString(input, "updated_at"),
    revoked_at: input.revoked_at ?? null,
  });
}

export function graphSubscriptionId(input = {}) {
  const resource = requiredSyncString(input, "resource");
  if (!GRAPH_MESSAGE_RESOURCES.includes(resource)) {
    throw new TypeError("Graph subscription resource must be Inbox or Sent Items messages");
  }
  return syncDigest("graph_subscription", {
    tenant_id: requiredSyncString(input, "tenant_id"),
    m365_connection_id: requiredSyncString(input, "m365_connection_id"),
    resource,
  });
}

export function normalizeGraphSubscription(input = {}) {
  const resource = requiredSyncString(input, "resource");
  if (!GRAPH_MESSAGE_RESOURCES.includes(resource)) {
    throw new TypeError("Graph subscription resource must be Inbox or Sent Items messages");
  }
  const hash = requiredSyncString(input, "client_state_hash");
  if (!/^[a-f0-9]{64}$/u.test(hash)) {
    throw new TypeError("client_state_hash must be a lowercase SHA-256 digest");
  }
  const status = requiredSyncString(input, "status");
  if (!GRAPH_SUBSCRIPTION_STATUSES.includes(status)) {
    throw new TypeError("Graph subscription status is invalid");
  }
  return Object.freeze({
    subscription_id: requiredSyncString(input, "subscription_id"),
    tenant_id: requiredSyncString(input, "tenant_id"),
    user_id: requiredSyncString(input, "user_id"),
    entra_subject_id: requiredSyncString(input, "entra_subject_id"),
    entra_tenant_id: requiredSyncString(input, "entra_tenant_id"),
    m365_connection_id: requiredSyncString(input, "m365_connection_id"),
    mailbox_ref: requiredSyncString(input, "mailbox_ref"),
    resource,
    change_type: "created",
    client_state_hash: hash,
    client_state_ref: requiredSyncString(input, "client_state_ref"),
    provider_subscription_id: input.provider_subscription_id ?? null,
    provider_expires_at: input.provider_expires_at ?? null,
    status,
    lease_owner: input.lease_owner ?? null,
    lease_expires_at: input.lease_expires_at ?? null,
    attempt_count: input.attempt_count ?? 0,
    next_attempt_at: input.next_attempt_at ?? null,
    last_error_code: input.last_error_code ?? null,
    created_at: requiredSyncString(input, "created_at"),
    updated_at: requiredSyncString(input, "updated_at"),
  });
}
