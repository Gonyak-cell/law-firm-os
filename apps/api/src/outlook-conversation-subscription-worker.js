import { requiredSyncString } from "../../../packages/email-dms/src/conversation-sync-model.js";

function safeCode(error) {
  const value = error?.safe_error_code ?? error?.code;
  return typeof value === "string" && /^[A-Z0-9_]{1,100}$/u.test(value)
    ? value : "OUTLOOK_GRAPH_SUBSCRIPTION_RECONCILIATION_FAILED";
}

export function createOutlookConversationSubscriptionWorker({ queue, authority_lookup, subscription_service } = {}) {
  if (typeof queue?.claim !== "function" || typeof queue?.complete !== "function"
    || typeof queue?.fail !== "function" || typeof authority_lookup !== "function"
    || typeof subscription_service?.reconcile !== "function") {
    throw new TypeError("Outlook subscription worker dependencies are required");
  }
  async function runOnce({ tenant_id, worker_id, limit = 10 } = {}) {
    const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
    const workerId = requiredSyncString({ worker_id }, "worker_id");
    const jobs = await queue.claim({ tenant_id: tenantId, worker_id: workerId, limit, job_kinds: ["subscription_reconcile"] });
    const outcomes = [];
    for (const job of jobs) {
      try {
        const authority = await authority_lookup({ subscription_id: job.subscription_id });
        const subscription = authority?.subscription;
        const connection = authority?.connection;
        if (!subscription || !connection || subscription.tenant_id !== tenantId
          || subscription.subscription_id !== job.subscription_id
          || subscription.resource !== job.resource
          || connection.tenant_id !== tenantId
          || connection.user_id !== subscription.user_id
          || connection.entra_subject_id !== subscription.entra_subject_id
          || connection.m365_connection_id !== subscription.m365_connection_id) {
          throw Object.assign(new Error("Graph subscription worker authority is invalid"), { permanent: true });
        }
        const result = await subscription_service.reconcile({
          tenant_id: tenantId,
          user_id: connection.user_id,
          entra_subject_id: connection.entra_subject_id,
          actor_id: "graph-subscription-reconciler",
          m365_connection_id: connection.m365_connection_id,
        });
        const completed = await queue.complete({ tenant_id: tenantId, worker_id: workerId, job_id: job.job_id, result_code: result.outcome });
        outcomes.push({ job_id: job.job_id, status: completed.status });
      } catch (error) {
        const failed = await queue.fail({ tenant_id: tenantId, worker_id: workerId, job_id: job.job_id, error_code: safeCode(error), permanent: error?.permanent === true });
        outcomes.push({ job_id: job.job_id, status: failed.status });
      }
    }
    return Object.freeze({ claimed: jobs.length, outcomes: Object.freeze(outcomes) });
  }
  return Object.freeze({ authority: "postgres-outlook-subscription-worker", runOnce });
}
