import { createHash } from "node:crypto";
import { GRAPH_MESSAGE_RESOURCES, requiredSyncString } from "./conversation-sync-model.js";
import { exactGraphNotificationUrl, isActiveOwnedConnection, matchesGraphSubscriptionIntent } from "./graph-subscription-binding.js";
import { createPostgresGraphSubscriptionState } from "./postgres-graph-subscription-state.js";
const ACTOR = "graph-subscription-reconciler";
export function createPostgresGraphSubscriptionService({
  pool,
  tenant_id,
  state_lookup,
  provider,
  cleanup_provider = null,
  entra_tenant_id,
  notification_url,
  clock = () => new Date(),
  lease_ms = 30_000,
  renewal_window_ms = 10 * 60_000,
  expiration_factory = ({ now }) =>
    new Date(now.getTime() + 60 * 60_000).toISOString(),
  client_state_factory,
} = {}) {
  if (!pool?.connect || typeof state_lookup !== "function") {
    throw new TypeError("PostgreSQL Graph subscription state is required");
  }
  for (const method of ["createOwnMessageSubscription", "renewOwnMessageSubscription",
    "listOwnMessageSubscriptions", "deleteOwnMessageSubscription"]) {
    if (typeof provider?.[method] !== "function") {
      throw new TypeError("Microsoft Graph subscription provider is required");
    }
  }
  const deleteOwnedSubscription = (cleanup_provider === null
    ? provider.deleteOwnMessageSubscription : cleanup_provider.deleteLocallyOwnedMessageSubscription)?.bind(cleanup_provider ?? provider);
  if (typeof deleteOwnedSubscription !== "function") throw new TypeError("Microsoft Graph subscription cleanup provider is required");
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
  const entraTenantId = requiredSyncString({ entra_tenant_id }, "entra_tenant_id");
  const notificationUrl = exactGraphNotificationUrl(notification_url);
  const notificationUrlHash = createHash("sha256")
    .update(notificationUrl).digest("hex");
  const persistence = createPostgresGraphSubscriptionState({
    pool,
    tenant_id: tenantId,
    entra_tenant_id: entraTenantId,
    notification_url_hash: notificationUrlHash,
    lease_ms,
    ...(client_state_factory ? { client_state_factory } : {}),
  });
  const now = () => {
    const value = clock();
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
      throw new TypeError("clock must return a valid Date");
    }
    return value;
  };
  async function provision(input, resource, existing) {
    const startedAt = now();
    if (existing?.next_attempt_at
      && Date.parse(existing.next_attempt_at) > startedAt.getTime()) return existing;
    if (!existing?.provider_subscription_id && existing?.provisioning_operation === "create"
      && existing?.provisioning_correlation_id) return existing;
    const renewable = existing?.status === "active"
      && existing.provider_subscription_id
      && Date.parse(existing.provider_expires_at) > startedAt.getTime();
    if (renewable
      && Date.parse(existing.provider_expires_at) - startedAt.getTime()
        > renewal_window_ms) return existing;
    const operation = renewable ? "renew" : "create";
    const lease = await persistence.acquire(
      input,
      resource,
      existing,
      operation,
      startedAt,
    );
    if (!lease) return existing;
    try {
      const expiresAt = expiration_factory({
        input,
        operation,
        existing,
        now: startedAt,
      });
      if (!Number.isFinite(Date.parse(expiresAt))
        || Date.parse(expiresAt) <= startedAt.getTime()) {
        throw new TypeError("expiration_factory must return a future instant");
      }
      const result = operation === "renew"
        ? await provider.renewOwnMessageSubscription({
          ...input,
          resource,
          change_type: "created",
          provider_subscription_id: existing.provider_subscription_id,
          expiration_datetime: expiresAt,
        })
        : await provider.createOwnMessageSubscription({
          ...input,
          resource,
          entra_tenant_id: entraTenantId,
          change_type: "created",
          client_state: lease.client_state,
          client_state_hash: lease.row.client_state_hash,
          provisioning_correlation_id:
            lease.row.provisioning_correlation_id,
          expiration_datetime: expiresAt,
        });
      if (!matchesGraphSubscriptionIntent(lease.row, result, input)) {
        throw new Error("Graph subscription provider response binding does not match");
      }
      return await persistence.complete(lease, result, now());
    } catch (error) {
      await persistence.fail(lease, error, now());
      throw error;
    }
  }
  async function cleanupLocal(input, local, targetStatus) {
    const startedAt = now();
    if (local.next_attempt_at
      && Date.parse(local.next_attempt_at) > startedAt.getTime()) {
      return { deferred: true, row: local };
    }
    let owned = local;
    if (local.provider_subscription_id) {
      owned = await persistence.beginCleanup(local, startedAt);
      try {
        const deleted = await deleteOwnedSubscription({
          ...input,
          provider_subscription_id: owned.provider_subscription_id,
        });
        if (deleted?.deleted !== true) {
          throw new Error("Graph subscription provider delete was not confirmed");
        }
      } catch (error) {
        await persistence.scheduleDeleteRetry(owned, error, now());
        throw error;
      }
    }
    return {
      deferred: false,
      row: await persistence.finishCleanup(owned, targetStatus, now()),
    };
  }
  async function revokeLocals(input, locals, outcome) {
    const subscriptions = [];
    let deferred = false;
    for (const local of locals) {
      const cleaned = await cleanupLocal(input, local, "revoked");
      deferred ||= cleaned.deferred;
      if (cleaned.deferred) subscriptions.push(cleaned.row);
    }
    return {
      outcome: deferred ? "retry_scheduled" : outcome,
      subscriptions,
    };
  }
  async function adoptExactIntents(locals, remote) {
    for (const local of locals) {
      if (local.provider_subscription_id
        || local.provisioning_operation !== "create"
        || !local.provisioning_correlation_id) continue;
      const matches = remote.filter((entry) => matchesGraphSubscriptionIntent(local, entry, {
        entra_tenant_id: entraTenantId,
        entra_subject_id: local.entra_subject_id,
      }));
      if (matches.length > 1) {
        throw new Error("Graph subscription adoption is ambiguous");
      }
      if (matches.length === 1) {
        const adopted = await persistence.adopt(local, matches[0], now());
        if (adopted) Object.assign(local, adopted);
      }
    }
  }
  async function reconcile(input = {}) {
    for (const field of [
      "tenant_id",
      "user_id",
      "entra_subject_id",
      "actor_id",
      "m365_connection_id",
    ]) requiredSyncString(input, field);
    if (input.tenant_id !== tenantId || input.actor_id !== ACTOR) {
      throw new Error("Graph subscription service authority does not match");
    }
    const state = await state_lookup(input);
    if (!state) {
      throw new Error("Microsoft connection is not owned by the requested principal");
    }
    const bound = {
      ...input,
      mailbox_ref: state.connection.mailbox_address_hash,
      entra_tenant_id: entraTenantId,
    };
    const expiresAt = Date.parse(state.connection.expires_at);
    if (!Number.isFinite(expiresAt)) {
      throw new Error("active delegated me-only Mail.Read connection is required");
    }
    const inactiveOutcome = state.connection.revoked_at
      ? "revoked_connection"
      : expiresAt <= now().getTime()
        ? "expired_connection"
        : !state.connection.granted_scopes?.includes("Mail.Read")
          ? "scope_lost_connection"
          : null;
    if (inactiveOutcome) {
      return revokeLocals(bound, state.subscriptions, inactiveOutcome);
    }
    if (!isActiveOwnedConnection(state.connection, input, now())) {
      throw new Error("active delegated me-only Mail.Read connection is required");
    }
    if (state.policies.length === 0) {
      return revokeLocals(
        bound,
        state.subscriptions,
        state.subscriptions.length
          ? "revoked_without_active_policy"
          : "disabled_without_active_policy",
      );
    }
    const remote = await provider.listOwnMessageSubscriptions(bound);
    for (const local of state.subscriptions) {
      if (!local.provider_subscription_id) continue;
      const match = remote.find((entry) =>
        entry.provider_subscription_id === local.provider_subscription_id);
      if (match && !matchesGraphSubscriptionIntent(local, match, bound)) {
        throw new Error("Graph subscription ownership binding does not match");
      }
      if (!match || local.status === "reauthorization_required"
        || local.status === "cleanup_pending") {
        const cleaned = await cleanupLocal(bound, local, "pending");
        Object.assign(local, cleaned.row);
      }
    }
    await adoptExactIntents(state.subscriptions, remote);
    const subscriptions = [];
    for (const resource of GRAPH_MESSAGE_RESOURCES) {
      subscriptions.push(await provision(
        bound,
        resource,
        state.subscriptions.find((entry) => entry.resource === resource),
      ));
    }
    return {
      outcome: subscriptions.every((entry) => entry?.status === "active")
        ? "active"
        : "retry_scheduled",
      subscriptions,
    };
  }
  return Object.freeze({ authority: "postgres-graph-subscription-reconciler", reconcile });
}
