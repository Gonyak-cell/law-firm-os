import { requiredSyncString } from "../../../packages/email-dms/src/conversation-sync-model.js";

function safeErrorCode(error) {
  const code = error?.safe_error_code ?? error?.code;
  return typeof code === "string" && /^[A-Z0-9_]{1,100}$/u.test(code)
    ? code
    : "OUTLOOK_GRAPH_DELTA_RECONCILIATION_FAILED";
}

export function createOutlookConversationRecoveryWorker({
  queue,
  authority_lookup,
  delta_reconciler,
} = {}) {
  if (typeof queue?.claim !== "function" || typeof queue?.complete !== "function"
    || typeof queue?.fail !== "function" || typeof authority_lookup !== "function"
    || typeof delta_reconciler?.reconcile !== "function") {
    throw new TypeError("Outlook conversation recovery worker dependencies are required");
  }

  async function runOnce({ tenant_id, worker_id, limit = 10 } = {}) {
    const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
    const workerId = requiredSyncString({ worker_id }, "worker_id");
    const jobs = await queue.claim({
      tenant_id: tenantId,
      worker_id: workerId,
      limit,
      job_kinds: ["delta_reconciliation"],
    });
    const outcomes = [];
    for (const job of jobs) {
      try {
        const authority = await authority_lookup({ subscription_id: job.subscription_id });
        const subscription = authority?.subscription;
        const connection = authority?.connection;
        if (!subscription || !connection || subscription.tenant_id !== tenantId
          || subscription.resource !== job.resource) {
          throw Object.assign(new Error("Graph recovery authority is unavailable"), {
            safe_error_code: "OUTLOOK_GRAPH_RECOVERY_AUTHORITY_INVALID",
          });
        }
        const result = await delta_reconciler.reconcile({
          tenant_id: tenantId,
          user_id: connection.user_id,
          entra_subject_id: connection.entra_subject_id,
          m365_connection_id: connection.m365_connection_id,
          resources: [subscription.resource],
        });
        const completed = await queue.complete({
          tenant_id: tenantId,
          worker_id: workerId,
          job_id: job.job_id,
          result_code: result.outcome,
        });
        outcomes.push({ job_id: job.job_id, status: completed.status });
      } catch (error) {
        const failed = await queue.fail({
          tenant_id: tenantId,
          worker_id: workerId,
          job_id: job.job_id,
          error_code: safeErrorCode(error),
        });
        outcomes.push({ job_id: job.job_id, status: failed.status });
      }
    }
    return Object.freeze({ claimed: jobs.length, outcomes: Object.freeze(outcomes) });
  }

  return Object.freeze({ authority: "postgres-outlook-recovery-worker", runOnce });
}
