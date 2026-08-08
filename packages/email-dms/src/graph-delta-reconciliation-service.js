import { GRAPH_MESSAGE_RESOURCES, requiredSyncString } from "./conversation-sync-model.js";

function cursorExpired(error) {
  return String(error?.safe_error_code ?? error?.code ?? "").includes("DELTA_CURSOR_EXPIRED");
}

export function createGraphDeltaReconciliationService({
  repository,
  queue,
  provider,
  clock = () => new Date(),
  max_pages = 20,
  recovery_window_ms,
} = {}) {
  if (!repository || !queue || typeof provider?.listOwnMessageDelta !== "function") {
    throw new TypeError("Graph delta reconciliation dependencies are required");
  }
  if (!Number.isSafeInteger(max_pages) || max_pages < 1 || max_pages > 100) throw new TypeError("max_pages must be between 1 and 100");
  if (!Number.isSafeInteger(recovery_window_ms) || recovery_window_ms < 1) throw new TypeError("recovery_window_ms must be positive");

  function recoveryStart(subscription) {
    const createdAt = Date.parse(subscription.created_at);
    const current = clock();
    if (!Number.isFinite(createdAt) || !(current instanceof Date) || !Number.isFinite(current.getTime())) throw new Error("Graph subscription recovery window is invalid");
    return new Date(Math.max(createdAt, current.getTime() - recovery_window_ms)).toISOString();
  }

  function writeCursor(input, resource, link) {
    repository.transaction((state) => {
      const existing = state.cursors.find((entry) => entry.tenant_id === input.tenant_id && entry.m365_connection_id === input.m365_connection_id && entry.resource === resource);
      const value = {
        tenant_id: input.tenant_id,
        m365_connection_id: input.m365_connection_id,
        resource,
        delta_link: link,
        last_reconciled_at: clock().toISOString(),
        version: (existing?.version ?? 0) + 1,
      };
      if (existing) state.cursors.splice(state.cursors.indexOf(existing), 1, value);
      else state.cursors.push(value);
    });
  }

  async function reconcileResource(input, subscription) {
    const resource = subscription.resource;
    let link = repository.snapshot().cursors.find((entry) => entry.tenant_id === input.tenant_id && entry.m365_connection_id === input.m365_connection_id && entry.resource === resource)?.delta_link ?? null;
    let resetUsed = false;
    let enqueued = 0;
    for (let page = 0; page < max_pages; page += 1) {
      let result;
      try {
        result = await provider.listOwnMessageDelta({ ...input, mailbox_scope: "me", resource, delta_link: link, start_at: link ? null : recoveryStart(subscription) });
      } catch (error) {
        if (!resetUsed && link && cursorExpired(error)) {
          resetUsed = true;
          link = null;
          writeCursor(input, resource, null);
          page -= 1;
          continue;
        }
        throw error;
      }
      if (!result || !Array.isArray(result.messages) || result.messages.length > 1000) throw new Error("Graph delta response is invalid");
      for (const message of result.messages) {
        if (message.removed === true) continue;
        const messageId = requiredSyncString(message, "message_id");
        const receivedAt = clock().toISOString();
        const queued = queue.enqueue({
          tenant_id: input.tenant_id,
          subscription_id: subscription.subscription_id,
          provider_subscription_id: subscription.provider_subscription_id,
          resource,
          message_id: messageId,
          change_type: "created",
          source: "delta_reconciliation",
          received_at: receivedAt,
        });
        if (queued.outcome === "enqueued") enqueued += 1;
      }
      link = result.next_link ?? result.delta_link;
      if (typeof link !== "string" || !link) throw new Error("Graph delta response is missing a continuation cursor");
      writeCursor(input, resource, link);
      if (!result.next_link) return enqueued;
    }
    return enqueued;
  }

  async function reconcile(input = {}) {
    for (const field of ["tenant_id", "user_id", "entra_subject_id", "m365_connection_id"]) requiredSyncString(input, field);
    const requested = input.resources ?? GRAPH_MESSAGE_RESOURCES;
    if (!Array.isArray(requested) || requested.some((resource) => !GRAPH_MESSAGE_RESOURCES.includes(resource))) throw new TypeError("resources must contain only Inbox and Sent Items messages");
    const snapshot = repository.snapshot();
    if (!snapshot.policies.some((policy) => policy.tenant_id === input.tenant_id && policy.m365_connection_id === input.m365_connection_id && policy.status === "active")) return { outcome: "disabled_without_active_policy", enqueued: 0 };
    const subscriptions = requested.map((resource) => snapshot.subscriptions.find((entry) => entry.tenant_id === input.tenant_id && entry.m365_connection_id === input.m365_connection_id && entry.resource === resource && entry.status === "active"));
    if (subscriptions.some((entry) => !entry)) throw new Error("active Graph subscription pair is required before delta reconciliation");
    let enqueued = 0;
    for (const subscription of subscriptions) enqueued += await reconcileResource(input, subscription);
    return { outcome: "reconciled", enqueued };
  }

  return Object.freeze({ reconcile });
}
