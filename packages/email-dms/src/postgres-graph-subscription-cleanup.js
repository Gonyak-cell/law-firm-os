import { requiredSyncString } from "./conversation-sync-model.js";
import { isOwnedDelegatedConnection } from "./graph-subscription-binding.js";

export function createPostgresGraphSubscriptionCleanup({
  persistence,
  state_lookup,
  delete_owned_subscription,
  delete_before_connection_revoke,
  tenant_id: tenantId,
  entra_tenant_id: entraTenantId,
  actor_id: actorId,
  now,
} = {}) {
  async function cleanupLocal(
    input,
    local,
    targetStatus,
    deleteSubscription = delete_owned_subscription,
  ) {
    const startedAt = now();
    if (local.next_attempt_at
      && Date.parse(local.next_attempt_at) > startedAt.getTime()) {
      return { deferred: true, row: local };
    }
    let owned = local;
    if (local.provider_subscription_id) {
      owned = await persistence.beginCleanup(local, startedAt);
      try {
        const deleted = await deleteSubscription({
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

  async function revokeLocals(
    input,
    locals,
    outcome,
    deleteSubscription = delete_owned_subscription,
  ) {
    const subscriptions = [];
    let deferred = false;
    for (const local of locals) {
      const cleaned = await cleanupLocal(
        input,
        local,
        "revoked",
        deleteSubscription,
      );
      deferred ||= cleaned.deferred;
      if (cleaned.deferred) subscriptions.push(cleaned.row);
    }
    return {
      outcome: deferred ? "retry_scheduled" : outcome,
      subscriptions,
    };
  }

  async function beforeConnectionRevoke(input = {}) {
    for (const field of [
      "tenant_id",
      "user_id",
      "entra_subject_id",
      "m365_connection_id",
      "mailbox_ref",
    ]) requiredSyncString(input, field);
    if (input.tenant_id !== tenantId
      || typeof delete_before_connection_revoke !== "function") {
      throw new Error("Graph subscription pre-revoke authority does not match");
    }
    const state = await state_lookup(input);
    if (!state
      || !isOwnedDelegatedConnection(state.connection, input)
      || state.connection.revoked_at
      || state.connection.mailbox_address_hash !== input.mailbox_ref
      || !Number.isFinite(Date.parse(state.connection.expires_at))) {
      throw new Error("owned delegated Microsoft connection is required");
    }
    const result = await revokeLocals({
      ...input,
      actor_id: actorId,
      mailbox_ref: state.connection.mailbox_address_hash,
      entra_tenant_id: entraTenantId,
    }, state.subscriptions, "deleted_before_connection_revoke",
    delete_before_connection_revoke);
    return Object.freeze({
      ...result,
      subscriptions_deleted:
        result.outcome === "deleted_before_connection_revoke",
      credential_material_included: false,
    });
  }

  return Object.freeze({ cleanupLocal, revokeLocals, beforeConnectionRevoke });
}
