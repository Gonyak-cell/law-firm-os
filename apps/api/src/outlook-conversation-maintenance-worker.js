import { requiredSyncString } from "../../../packages/email-dms/src/conversation-sync-model.js";

const SUBSCRIPTION_ACTOR = "graph-subscription-reconciler";

function boundedLimit(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) {
    throw new TypeError("limit must be between 1 and 100");
  }
  return value;
}

export function createOutlookConversationMaintenanceWorker({
  maintenance_store,
  subscription_service,
  subscription_worker,
  recovery_worker,
  message_worker,
} = {}) {
  if (typeof maintenance_store?.listDueSubscriptionPrincipals !== "function"
    || typeof subscription_service?.reconcile !== "function"
    || typeof subscription_worker?.runOnce !== "function"
    || typeof recovery_worker?.runOnce !== "function"
    || typeof message_worker?.runOnce !== "function") {
    throw new TypeError("Outlook conversation maintenance worker dependencies are required");
  }

  async function runOnce({ tenant_id, worker_id, limit = 10 } = {}) {
    const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
    const workerId = requiredSyncString({ worker_id }, "worker_id", 200);
    const bounded = boundedLimit(limit);
    const candidates = await maintenance_store.listDueSubscriptionPrincipals({ limit: bounded });
    const subscriptionReconciliation = { attempted: candidates.length, succeeded: 0, failed: 0 };
    for (const principal of candidates) {
      try {
        await subscription_service.reconcile({
          ...principal,
          tenant_id: tenantId,
          actor_id: SUBSCRIPTION_ACTOR,
        });
        subscriptionReconciliation.succeeded += 1;
      } catch {
        subscriptionReconciliation.failed += 1;
      }
    }
    const subscriptionJobs = await subscription_worker.runOnce({
      tenant_id: tenantId,
      worker_id: `${workerId}:subscription`,
      limit: bounded,
    });
    const recoveryJobs = await recovery_worker.runOnce({
      tenant_id: tenantId,
      worker_id: `${workerId}:recovery`,
      limit: bounded,
    });
    const messageJobs = await message_worker.runOnce({
      tenant_id: tenantId,
      worker_id: `${workerId}:message`,
      limit: bounded,
    });
    return Object.freeze({
      subscription_reconciliation: Object.freeze(subscriptionReconciliation),
      subscription_jobs: subscriptionJobs,
      recovery_jobs: recoveryJobs,
      message_jobs: messageJobs,
    });
  }

  return Object.freeze({
    authority: "postgres-outlook-conversation-maintenance-worker",
    max_batch_size: 100,
    runOnce,
  });
}
