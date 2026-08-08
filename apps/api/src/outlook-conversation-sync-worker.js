function safeErrorCode(error) {
  const value = error?.safe_error_code ?? error?.code;
  return typeof value === "string" && /^[A-Z0-9_]{1,100}$/u.test(value) ? value : "OUTLOOK_CONVERSATION_SYNC_FAILED";
}

export function createOutlookConversationSyncWorker({
  repository,
  queue,
  canonical_message_source,
  filing_adapter,
  connection_principal_lookup,
  matter_access,
} = {}) {
  if (!repository || !queue || typeof canonical_message_source?.getOwnMessage !== "function" || typeof filing_adapter?.fileCanonicalMessage !== "function" || typeof connection_principal_lookup !== "function" || typeof matter_access !== "function") {
    throw new TypeError("Outlook conversation worker dependencies are required");
  }

  async function processBatch({ worker_id, limit = 10 } = {}) {
    const jobs = queue.claim({ worker_id, limit });
    const result = { claimed: jobs.length, completed: 0, ignored: 0, retried: 0, dead_lettered: 0 };
    for (const job of jobs) {
      try {
        const snapshot = repository.snapshot();
        const subscription = snapshot.subscriptions.find((entry) => entry.tenant_id === job.tenant_id && entry.subscription_id === job.subscription_id);
        if (!subscription || subscription.status !== "active") {
          queue.complete({ worker_id, job_id: job.job_id, result_code: "subscription_inactive" });
          result.ignored += 1;
          continue;
        }
        const principal = connection_principal_lookup({ tenant_id: job.tenant_id, m365_connection_id: subscription.m365_connection_id });
        const canonical = await canonical_message_source.getOwnMessage({ ...principal, message_id: job.message_id, resource: job.resource });
        queue.extendLease({ worker_id, job_id: job.job_id });
        if (canonical.is_draft === true) {
          queue.complete({ worker_id, job_id: job.job_id, result_code: "draft_not_filed" });
          result.ignored += 1;
          continue;
        }
        const current = repository.snapshot();
        const currentSubscription = current.subscriptions.find((entry) => entry.tenant_id === job.tenant_id && entry.subscription_id === job.subscription_id);
        if (!currentSubscription || currentSubscription.status !== "active") {
          queue.complete({ worker_id, job_id: job.job_id, result_code: "subscription_inactive" });
          result.ignored += 1;
          continue;
        }
        const policy = current.policies.find((entry) => entry.tenant_id === job.tenant_id && entry.m365_connection_id === currentSubscription.m365_connection_id && entry.status === "active" && entry.conversation_id === canonical.conversation_id);
        if (!policy) {
          queue.complete({ worker_id, job_id: job.job_id, result_code: "conversation_not_enabled" });
          result.ignored += 1;
          continue;
        }
        if (!matter_access({ ...policy, principal })) throw Object.assign(new Error("Matter access changed"), { safe_error_code: "OUTLOOK_CONVERSATION_MATTER_ACCESS_CHANGED", permanent: true });
        const filed = await filing_adapter.fileCanonicalMessage({ policy, canonical, actor_id: policy.enabling_actor_id ?? principal.user_id });
        queue.complete({ worker_id, job_id: job.job_id, result_code: filed.outcome === "created" ? "filed" : "filing_replayed" });
        result.completed += 1;
      } catch (error) {
        const failed = queue.fail({ worker_id, job_id: job.job_id, error_code: safeErrorCode(error), permanent: error?.permanent === true });
        if (failed.status === "dead_letter") result.dead_lettered += 1;
        else result.retried += 1;
      }
    }
    return Object.freeze(result);
  }

  return Object.freeze({ processBatch });
}
