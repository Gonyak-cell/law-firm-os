import { randomUUID } from "node:crypto";
import { stableJsonStringify } from "../../persistence/src/durable-file.js";
import {
  conversationPolicyId,
  normalizeConversationPolicy,
  requiredSyncString,
  syncDigest,
} from "./conversation-sync-model.js";

// Deterministic test double only. Operational policy authority is PostgreSQL.

function fingerprint(input) {
  return syncDigest("request", stableJsonStringify(input));
}

function requireVersion(value) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError("expected_version must be a non-negative integer");
  }
  return value;
}

function assertConnection(connection, input, now) {
  if (
    !connection
    || connection.tenant_id !== input.tenant_id
    || connection.m365_connection_id !== input.m365_connection_id
    || connection.user_id !== input.user_id
    || connection.entra_subject_id !== input.entra_subject_id
    || connection.revoked_at
    || !Number.isFinite(Date.parse(connection.expires_at))
    || Date.parse(connection.expires_at) <= now.getTime()
    || !connection.granted_scopes?.includes("Mail.Read")
    || connection.connection_authority !== "delegated"
    || connection.mailbox_scope !== "me"
  ) {
    throw new Error("active delegated me-only Mail.Read connection is required");
  }
}

function assertPolicyOwner(policy, input, { requireActor = false } = {}) {
  if (
    policy.user_id !== input.user_id
    || policy.entra_subject_id !== input.entra_subject_id
    || policy.m365_connection_id !== input.m365_connection_id
    || policy.matter_id !== input.matter_id
    || (requireActor && input.actor_id !== policy.user_id)
  ) {
    throw new Error("conversation policy owner authority does not match");
  }
}

function assertSeed(seed, input) {
  if (
    !seed
    || seed.tenant_id !== input.tenant_id
    || seed.matter_id !== input.matter_id
    || seed.email_thread_id !== input.seed_email_thread_id
    || seed.filing_receipt_ref !== input.seed_filing_receipt_ref
    || seed.conversation_id !== input.conversation_id
    || seed.account_ref !== input.m365_connection_id
    || seed.status !== "active"
    || !seed.filed_document_ids?.length
  ) {
    throw new Error("seed filing does not match the requested conversation and Matter");
  }
}

function replayOrConflict(state, input, operation) {
  const key = requiredSyncString(input, "idempotency_key");
  const found = state.idempotency.find((entry) => (
    entry.tenant_id === input.tenant_id && entry.idempotency_key === key
  ));
  if (!found) return null;
  if (found.operation !== operation || found.request_fingerprint !== fingerprint(input)) {
    throw new Error("idempotency key conflicts with a different request");
  }
  return { ...found.response, outcome: "idempotent_replay" };
}

function recordMutation(state, { input, operation, policy, outcome, now }) {
  const response = { outcome, policy };
  state.idempotency.push({
    tenant_id: input.tenant_id,
    idempotency_key: input.idempotency_key,
    operation,
    request_fingerprint: fingerprint(input),
    response,
    created_at: now,
  });
  state.audit_events.push({
    event_id: randomUUID(),
    tenant_id: input.tenant_id,
    event_type: `conversation_policy.${operation}`,
    object_id: policy.policy_id,
    actor_id: input.actor_id,
    version: policy.version,
    occurred_at: now,
  });
  return response;
}

export function createConversationPolicyService({
  repository,
  seed_filing_lookup,
  connection_lookup,
  matter_access,
  clock = () => new Date(),
} = {}) {
  if (!repository || typeof seed_filing_lookup !== "function"
    || typeof connection_lookup !== "function" || typeof matter_access !== "function") {
    throw new TypeError("conversation policy dependencies are required");
  }

  function enable(input = {}) {
    for (const field of ["tenant_id", "user_id", "entra_subject_id", "actor_id", "m365_connection_id", "matter_id", "conversation_id", "seed_email_thread_id", "seed_filing_receipt_ref", "idempotency_key"]) {
      requiredSyncString(input, field);
    }
    if (input.actor_id !== input.user_id) throw new Error("conversation policy owner authority does not match");
    requireVersion(input.expected_version);
    const connection = connection_lookup(input);
    assertConnection(connection, input, clock());
    if (!matter_access(input)) throw new Error("Matter access is required");
    const seed = seed_filing_lookup(input);
    return repository.transaction((state) => {
      const replay = replayOrConflict(state, input, "enabled");
      if (replay) return replay;
      assertSeed(seed, input);
      const policyId = conversationPolicyId(input);
      const activeConflict = state.policies.find((entry) => (
        entry.tenant_id === input.tenant_id
        && entry.m365_connection_id === input.m365_connection_id
        && entry.conversation_id === input.conversation_id
        && entry.status === "active"
        && entry.matter_id !== input.matter_id
      ));
      if (activeConflict) {
        throw new Error("conversation already has an active Matter policy; revoke it first");
      }
      const existing = state.policies.find((entry) => (
        entry.tenant_id === input.tenant_id && entry.policy_id === policyId
      ));
      if ((existing?.version ?? 0) !== input.expected_version) {
        throw new Error("conversation policy version conflict");
      }
      if (existing && (existing.matter_id !== input.matter_id
        || existing.seed_email_thread_id !== input.seed_email_thread_id
        || existing.seed_filing_receipt_ref !== input.seed_filing_receipt_ref)) {
        throw new Error("conversation policy seed is immutable");
      }
      const now = clock().toISOString();
      const policy = normalizeConversationPolicy({
        ...(existing ?? {}),
        policy_id: policyId,
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        entra_subject_id: input.entra_subject_id,
        m365_connection_id: input.m365_connection_id,
        mailbox_ref: seed.mailbox_ref,
        conversation_id: input.conversation_id,
        matter_id: input.matter_id,
        seed_email_thread_id: input.seed_email_thread_id,
        seed_filing_receipt_ref: input.seed_filing_receipt_ref,
        enabling_actor_id: input.actor_id,
        status: "active",
        pause_reason: null,
        version: (existing?.version ?? 0) + 1,
        created_at: existing?.created_at ?? now,
        updated_at: now,
        revoked_at: null,
      });
      if (existing) state.policies.splice(state.policies.indexOf(existing), 1, policy);
      else state.policies.push(policy);
      return recordMutation(state, { input, operation: "enabled", policy, outcome: existing ? "reenabled" : "created", now });
    });
  }

  function revoke(input = {}) {
    for (const field of ["tenant_id", "user_id", "entra_subject_id", "actor_id", "m365_connection_id", "matter_id", "policy_id", "reason", "idempotency_key"]) requiredSyncString(input, field);
    requireVersion(input.expected_version);
    return repository.transaction((state) => {
      const existing = state.policies.find((entry) => entry.tenant_id === input.tenant_id && entry.policy_id === input.policy_id);
      if (!existing) throw new Error("conversation policy not found");
      assertPolicyOwner(existing, input, { requireActor: true });
      assertConnection(connection_lookup(input), input, clock());
      if (!matter_access({ ...input, policy: existing })) throw new Error("Matter access is required");
      const replay = replayOrConflict(state, input, "revoked");
      if (replay) return replay;
      if (existing.version !== input.expected_version) throw new Error("conversation policy version conflict");
      const now = clock().toISOString();
      const policy = normalizeConversationPolicy({ ...existing, status: "revoked", pause_reason: input.reason, version: existing.version + 1, updated_at: now, revoked_at: now });
      state.policies.splice(state.policies.indexOf(existing), 1, policy);
      return recordMutation(state, { input, operation: "revoked", policy, outcome: "revoked", now });
    });
  }

  function reconcile(input = {}) {
    for (const field of ["tenant_id", "user_id", "entra_subject_id", "actor_id", "m365_connection_id", "matter_id", "policy_id"]) requiredSyncString(input, field);
    return repository.transaction((state) => {
      const existing = state.policies.find((entry) => entry.tenant_id === input.tenant_id && entry.policy_id === input.policy_id);
      if (!existing) throw new Error("conversation policy not found");
      assertPolicyOwner(existing, input);
      if (existing.status !== "active") return { outcome: "unchanged", policy: existing };
      const lookup = { ...existing, actor_id: input.actor_id };
      let reason = null;
      try { assertConnection(connection_lookup(lookup), lookup, clock()); } catch { reason = "connection_invalid"; }
      if (!reason && !matter_access(lookup)) reason = "matter_access_changed";
      if (!reason) return { outcome: "unchanged", policy: existing };
      const now = clock().toISOString();
      const policy = normalizeConversationPolicy({ ...existing, status: "paused", pause_reason: reason, version: existing.version + 1, updated_at: now });
      state.policies.splice(state.policies.indexOf(existing), 1, policy);
      state.audit_events.push({ event_id: randomUUID(), tenant_id: input.tenant_id, event_type: "conversation_policy.paused", object_id: policy.policy_id, actor_id: input.actor_id, version: policy.version, reason, occurred_at: now });
      return { outcome: "paused", policy };
    });
  }

  return Object.freeze({ enable, revoke, reconcile });
}
