import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  GRAPH_MESSAGE_RESOURCES,
  graphSubscriptionId,
  normalizeGraphSubscription,
  requiredSyncString,
  syncDigest,
} from "./conversation-sync-model.js";

// Deterministic test double only. Operational reconciliation is PostgreSQL.

function hashClientState(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertConnectionIdentity(connection, input) {
  if (!connection || connection.tenant_id !== input.tenant_id
    || connection.user_id !== input.user_id
    || connection.entra_subject_id !== input.entra_subject_id
    || connection.m365_connection_id !== input.m365_connection_id
    || typeof connection.mailbox_address_hash !== "string"
    || !/^[a-f0-9]{64}$/u.test(connection.mailbox_address_hash)) {
    throw new Error("matching Microsoft connection is required");
  }
}

function assertActiveConnection(connection, now) {
  if (connection.revoked_at || !connection.granted_scopes?.includes("Mail.Read")
    || !Number.isFinite(Date.parse(connection.expires_at))
    || Date.parse(connection.expires_at) <= now.getTime()
    || connection.connection_authority !== "delegated"
    || connection.mailbox_scope !== "me") {
    throw new Error("active delegated me-only Mail.Read connection is required");
  }
}

function safeErrorCode(error) {
  const value = error?.safe_error_code ?? error?.code;
  return typeof value === "string" && /^[A-Z0-9_]{1,80}$/u.test(value)
    ? value
    : "GRAPH_SUBSCRIPTION_FAILED";
}

export function createGraphSubscriptionService({
  repository,
  provider,
  connection_lookup,
  clock = () => new Date(),
  client_state_factory = () => randomBytes(32).toString("base64url"),
  lease_ms = 30_000,
  renewal_window_ms = 10 * 60 * 1000,
  expiration_factory,
} = {}) {
  if (!repository || !provider || typeof connection_lookup !== "function" || typeof expiration_factory !== "function") {
    throw new TypeError("Graph subscription dependencies are required");
  }

  function nowDate() {
    const date = clock();
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new TypeError("clock must return a valid Date");
    return date;
  }

  async function deleteRemote(input, local) {
    if (local.provider_subscription_id) {
      await provider.deleteOwnMessageSubscription({
        ...input,
        mailbox_scope: "me",
        provider_subscription_id: local.provider_subscription_id,
      });
    }
    repository.transaction((state) => {
      const current = state.subscriptions.find(({ subscription_id: id }) => id === local.subscription_id);
      if (current) {
        const occurredAt = nowDate().toISOString();
        Object.assign(current, { status: "revoked", lease_owner: null, lease_expires_at: null, updated_at: occurredAt });
        state.audit_events.push({ event_id: randomUUID(), tenant_id: current.tenant_id, event_type: "graph_subscription.revoked", object_id: current.subscription_id, actor_id: input.actor_id, occurred_at: occurredAt });
      }
    });
  }

  function acquire(input, resource, existing, operation) {
    const now = nowDate();
    const leaseOwner = randomUUID();
    const clientState = operation === "create" ? client_state_factory() : null;
    if (clientState !== null && (typeof clientState !== "string" || clientState.length < 16 || clientState.length > 128)) {
      throw new TypeError("client_state_factory must return 16..128 characters");
    }
    const subscriptionId = existing?.subscription_id ?? graphSubscriptionId({ ...input, resource });
    return repository.transaction((state) => {
      const current = state.subscriptions.find(({ subscription_id: id }) => id === subscriptionId);
      if (current?.lease_expires_at && Date.parse(current.lease_expires_at) > now.getTime()) return null;
      const value = normalizeGraphSubscription({
        ...(current ?? existing ?? {}),
        subscription_id: subscriptionId,
        tenant_id: input.tenant_id,
        user_id: input.user_id,
        entra_subject_id: input.entra_subject_id,
        entra_tenant_id: input.entra_tenant_id,
        m365_connection_id: input.m365_connection_id,
        mailbox_ref: input.mailbox_ref,
        resource,
        client_state_hash: clientState ? hashClientState(clientState) : current.client_state_hash,
        client_state_ref: current?.client_state_ref ?? syncDigest("client_state_ref", {
          subscription_id: subscriptionId,
          tenant_id: input.tenant_id,
        }),
        status: current?.status ?? "pending",
        lease_owner: leaseOwner,
        lease_expires_at: new Date(now.getTime() + lease_ms).toISOString(),
        created_at: current?.created_at ?? now.toISOString(),
        updated_at: now.toISOString(),
      });
      if (current) state.subscriptions.splice(state.subscriptions.indexOf(current), 1, value);
      else state.subscriptions.push(value);
      return { local: value, lease_owner: leaseOwner, client_state: clientState };
    });
  }

  function complete(lease, providerResult) {
    const now = nowDate().toISOString();
    return repository.transaction((state) => {
      const current = state.subscriptions.find(({ subscription_id: id }) => id === lease.local.subscription_id);
      if (!current || current.lease_owner !== lease.lease_owner) throw new Error("Graph subscription lease was lost");
      if (providerResult.resource !== current.resource || providerResult.change_type !== "created"
        || providerResult.client_state_hash !== current.client_state_hash
        || !providerResult.provider_subscription_id || !Number.isFinite(Date.parse(providerResult.expires_at))) {
        throw new Error("Graph subscription provider response is invalid");
      }
      const value = normalizeGraphSubscription({ ...current, provider_subscription_id: providerResult.provider_subscription_id, provider_expires_at: providerResult.expires_at, status: "active", lease_owner: null, lease_expires_at: null, attempt_count: 0, next_attempt_at: null, last_error_code: null, updated_at: now });
      state.subscriptions.splice(state.subscriptions.indexOf(current), 1, value);
      state.audit_events.push({ event_id: randomUUID(), tenant_id: value.tenant_id, event_type: "graph_subscription.active", object_id: value.subscription_id, actor_id: "graph-subscription-reconciler", occurred_at: now });
      return value;
    });
  }

  function fail(lease, error) {
    const now = nowDate();
    repository.transaction((state) => {
      const current = state.subscriptions.find(({ subscription_id: id }) => id === lease.local.subscription_id);
      if (!current || current.lease_owner !== lease.lease_owner) return;
      const attempts = current.attempt_count + 1;
      const dead = attempts >= 5;
      Object.assign(current, {
        status: dead ? "expired" : "pending",
        lease_owner: null,
        lease_expires_at: null,
        attempt_count: attempts,
        next_attempt_at: new Date(now.getTime() + Math.min(300_000, 1000 * (2 ** attempts))).toISOString(),
        last_error_code: safeErrorCode(error),
        updated_at: now.toISOString(),
      });
      state.audit_events.push({ event_id: randomUUID(), tenant_id: current.tenant_id, event_type: dead ? "graph_subscription.expired" : "graph_subscription.retry_scheduled", object_id: current.subscription_id, actor_id: "graph-subscription-reconciler", details: { safe_error_code: current.last_error_code, attempt_count: attempts }, occurred_at: now.toISOString() });
    });
  }

  function desiredExpiration(input, operation, existing, now) {
    const value = expiration_factory({ input, operation, existing, now: new Date(now) });
    if (typeof value !== "string" || !Number.isFinite(Date.parse(value)) || Date.parse(value) <= now.getTime()) {
      throw new TypeError("expiration_factory must return a future ISO instant");
    }
    return new Date(value).toISOString();
  }

  async function provision(input, resource, existing) {
    const now = nowDate();
    if (existing?.next_attempt_at && Date.parse(existing.next_attempt_at) > now.getTime()) return existing;
    const renew = existing?.status === "active" && existing.provider_subscription_id
      && Date.parse(existing.provider_expires_at) > now.getTime();
    if (renew && Date.parse(existing.provider_expires_at) - now.getTime() > renewal_window_ms) return existing;
    const operation = renew ? "renew" : "create";
    const lease = acquire(input, resource, existing, operation);
    if (!lease) {
      return repository.snapshot().subscriptions.find(({ subscription_id: id }) => id === (existing?.subscription_id ?? graphSubscriptionId({ ...input, resource }))) ?? existing;
    }
    try {
      const expiresAt = desiredExpiration(input, operation, existing, now);
      const result = operation === "renew"
        ? await provider.renewOwnMessageSubscription({ ...input, mailbox_scope: "me", provider_subscription_id: existing.provider_subscription_id, expiration_datetime: expiresAt, resource, change_type: "created", client_state_hash: existing.client_state_hash })
        : await provider.createOwnMessageSubscription({ ...input, mailbox_scope: "me", expiration_datetime: expiresAt, resource, change_type: "created", client_state: lease.client_state, client_state_hash: lease.local.client_state_hash });
      return complete(lease, result);
    } catch (error) {
      fail(lease, error);
      throw error;
    }
  }

  async function reconcile(input = {}) {
    for (const field of ["tenant_id", "user_id", "entra_subject_id", "entra_tenant_id", "actor_id", "m365_connection_id"]) requiredSyncString(input, field);
    const connection = connection_lookup(input);
    assertConnectionIdentity(connection, input);
    input = { ...input, mailbox_ref: connection.mailbox_address_hash };
    const snapshot = repository.snapshot();
    const activePolicies = snapshot.policies.filter((policy) => policy.tenant_id === input.tenant_id && policy.user_id === input.user_id && policy.entra_subject_id === input.entra_subject_id && policy.m365_connection_id === input.m365_connection_id && policy.status === "active");
    const locals = snapshot.subscriptions.filter((entry) => entry.tenant_id === input.tenant_id && entry.user_id === input.user_id && entry.entra_subject_id === input.entra_subject_id && entry.entra_tenant_id === input.entra_tenant_id && entry.m365_connection_id === input.m365_connection_id && entry.status !== "revoked");
    if (connection.revoked_at) {
      for (const local of locals) await deleteRemote(input, local);
      return { outcome: "revoked_connection", subscriptions: [] };
    }
    assertActiveConnection(connection, nowDate());
    if (activePolicies.length === 0) {
      for (const local of locals) await deleteRemote(input, local);
      return { outcome: locals.length ? "revoked_without_active_policy" : "disabled_without_active_policy", subscriptions: [] };
    }
    const remote = await provider.listOwnMessageSubscriptions({ ...input, mailbox_scope: "me" });
    repository.transaction((state) => {
      for (const local of state.subscriptions.filter((entry) => entry.tenant_id === input.tenant_id && entry.user_id === input.user_id && entry.entra_subject_id === input.entra_subject_id && entry.entra_tenant_id === input.entra_tenant_id && entry.m365_connection_id === input.m365_connection_id && entry.status !== "revoked")) {
        const match = remote.find((candidate) => candidate.provider_subscription_id === local.provider_subscription_id);
        if (match) {
          if (match.resource !== local.resource || match.client_state_hash !== local.client_state_hash) {
            throw new Error("Graph subscription ownership binding does not match");
          }
          Object.assign(local, { provider_subscription_id: match.provider_subscription_id, provider_expires_at: match.expires_at, status: "active", updated_at: nowDate().toISOString() });
        } else if (local.provider_subscription_id) {
          Object.assign(local, { provider_subscription_id: null, provider_expires_at: null, status: "expired", updated_at: nowDate().toISOString() });
        }
      }
    });
    const reconciledLocals = repository.snapshot().subscriptions.filter((entry) => entry.tenant_id === input.tenant_id && entry.user_id === input.user_id && entry.entra_subject_id === input.entra_subject_id && entry.entra_tenant_id === input.entra_tenant_id && entry.m365_connection_id === input.m365_connection_id && entry.status !== "revoked");
    const subscriptions = [];
    for (const resource of GRAPH_MESSAGE_RESOURCES) {
      const local = reconciledLocals.find((entry) => entry.resource === resource);
      subscriptions.push(await provision(input, resource, local));
    }
    return { outcome: "active", subscriptions };
  }

  return Object.freeze({ reconcile });
}
