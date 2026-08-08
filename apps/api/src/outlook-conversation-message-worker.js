import { requiredSyncString } from "../../../packages/email-dms/src/conversation-sync-model.js";

const SERVICE_ACTOR = "outlook-conversation-sync-service";

function safeError(error) {
  const code = error?.safe_error_code ?? error?.code;
  return typeof code === "string" && /^[A-Z0-9_]{1,100}$/u.test(code)
    ? code
    : "OUTLOOK_CONVERSATION_SYNC_FAILED";
}

function ownerBinding(authority, job) {
  const subscription = authority?.subscription;
  const connection = authority?.connection;
  return subscription && connection
    && subscription.tenant_id === job.tenant_id
    && subscription.subscription_id === job.subscription_id
    && subscription.resource === job.resource
    && connection.tenant_id === job.tenant_id
    && connection.m365_connection_id === subscription.m365_connection_id
    && connection.user_id === subscription.user_id
    && connection.entra_subject_id === subscription.entra_subject_id;
}

function connectionPauseReason(connection, nowMs) {
  if (connection.revoked_at) return "connection_revoked";
  if (Date.parse(connection.expires_at) <= nowMs) return "connection_expired";
  if (!connection.granted_scopes?.includes("Mail.Read")) return "mail_read_scope_lost";
  if (connection.connection_authority !== "delegated"
    || connection.mailbox_scope !== "me") return "connection_authority_changed";
  return null;
}

export function createOutlookConversationMessageWorker({
  queue,
  authority_lookup,
  canonical_message_source,
  policy_lookup,
  current_authority,
  pause_policy,
  pause_connection_policies,
  filing_adapter,
  clock = () => new Date(),
} = {}) {
  if (typeof queue?.claim !== "function" || typeof queue?.extendLease !== "function"
    || typeof queue?.complete !== "function" || typeof queue?.fail !== "function"
    || typeof authority_lookup !== "function" || typeof policy_lookup !== "function"
    || typeof current_authority !== "function" || typeof pause_policy !== "function"
    || typeof pause_connection_policies !== "function"
    || typeof canonical_message_source?.getOwnMessage !== "function"
    || typeof filing_adapter?.fileCanonicalMessage !== "function") {
    throw new TypeError("Outlook conversation message worker dependencies are required");
  }

  async function runOnce({ tenant_id, worker_id, limit = 10 } = {}) {
    const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
    const workerId = requiredSyncString({ worker_id }, "worker_id");
    const counts = { claimed: 0, filed: 0, ignored: 0, paused: 0, retried: 0, dead_lettered: 0 };
    for (let index = 0; index < limit; index += 1) {
      const [job] = await queue.claim({ tenant_id: tenantId, worker_id: workerId, limit: 1, job_kinds: ["message_notification"] });
      if (!job) break;
      counts.claimed += 1;
      try {
        const authority = await authority_lookup({ subscription_id: job.subscription_id });
        if (!ownerBinding(authority, job)) throw Object.assign(new Error("Graph message authority is invalid"), { permanent: true, safe_error_code: "OUTLOOK_GRAPH_MESSAGE_AUTHORITY_INVALID" });
        const connection = authority.connection;
        const candidatePolicies = authority.policies?.filter((policy) =>
          policy.tenant_id === tenantId
          && policy.user_id === connection.user_id
          && policy.entra_subject_id === connection.entra_subject_id
          && policy.m365_connection_id === connection.m365_connection_id
          && policy.status === "active") ?? [];
        if (candidatePolicies.length === 0) {
          await queue.complete({ tenant_id: tenantId, worker_id: workerId, job_id: job.job_id, result_code: "connection_has_no_active_policy" });
          counts.ignored += 1;
          continue;
        }
        const connectionReason = connectionPauseReason(connection, clock().getTime());
        if (connectionReason) {
          await pause_connection_policies({
            tenant_id: tenantId,
            user_id: connection.user_id,
            entra_subject_id: connection.entra_subject_id,
            m365_connection_id: connection.m365_connection_id,
            reason: connectionReason,
            actor_id: SERVICE_ACTOR,
          });
          await queue.complete({ tenant_id: tenantId, worker_id: workerId, job_id: job.job_id, result_code: `policies_paused_${connectionReason}` });
          counts.paused += 1;
          continue;
        }
        if (authority.subscription.status !== "active") {
          await queue.complete({ tenant_id: tenantId, worker_id: workerId, job_id: job.job_id, result_code: "subscription_not_active" });
          counts.ignored += 1;
          continue;
        }
        await queue.extendLease({ tenant_id: tenantId, worker_id: workerId, job_id: job.job_id });
        const canonical = await canonical_message_source.getOwnMessage({
          tenant_id: tenantId,
          user_id: connection.user_id,
          entra_subject_id: connection.entra_subject_id,
          m365_connection_id: connection.m365_connection_id,
          message_id: job.message_id,
          resource: job.resource,
        });
        if (canonical.is_draft) {
          await queue.complete({ tenant_id: tenantId, worker_id: workerId, job_id: job.job_id, result_code: "draft_not_filed" });
          counts.ignored += 1;
          continue;
        }
        const policy = await policy_lookup({
          tenant_id: tenantId,
          subscription: authority.subscription,
          connection,
          conversation_id: canonical.conversation_id,
        });
        if (!policy) {
          await queue.complete({ tenant_id: tenantId, worker_id: workerId, job_id: job.job_id, result_code: "conversation_not_enabled" });
          counts.ignored += 1;
          continue;
        }
        const decision = await current_authority({ policy, connection, subscription: authority.subscription });
        if (decision?.allowed !== true) {
          const reason = requiredSyncString({ reason: decision?.reason ?? "authority_changed" }, "reason", 100);
          await pause_policy({ tenant_id: tenantId, policy_id: policy.policy_id, expected_version: policy.version, reason, actor_id: SERVICE_ACTOR });
          await queue.complete({ tenant_id: tenantId, worker_id: workerId, job_id: job.job_id, result_code: `policy_paused_${reason}` });
          counts.paused += 1;
          continue;
        }
        const filed = await filing_adapter.fileCanonicalMessage({
          policy,
          canonical,
          connection,
          actor_id: SERVICE_ACTOR,
          authorized_by_actor_id: policy.enabling_actor_id,
        });
        await queue.complete({ tenant_id: tenantId, worker_id: workerId, job_id: job.job_id, result_code: filed.outcome === "created" ? "filed" : "filing_replayed" });
        counts.filed += 1;
      } catch (error) {
        let failed;
        try {
          failed = await queue.fail({ tenant_id: tenantId, worker_id: workerId, job_id: job.job_id, error_code: safeError(error), permanent: error?.permanent === true });
        } catch (leaseError) {
          if (leaseError?.message !== "Graph notification job lease was lost") throw leaseError;
          counts.retried += 1;
          continue;
        }
        if (failed.status === "dead_letter") counts.dead_lettered += 1;
        else counts.retried += 1;
      }
    }
    return Object.freeze(counts);
  }

  return Object.freeze({ authority: "postgres-outlook-message-worker", runOnce });
}
