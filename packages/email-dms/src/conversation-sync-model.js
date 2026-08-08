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
