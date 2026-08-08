import { graphSubscriptionSafeCode } from "./postgres-graph-subscription-state-support.js";

const DEFINITE_NOT_CREATED_CODES = new Set([
  "MICROSOFT_EGRESS_BROKER_CONFIG_UNAVAILABLE",
  "MICROSOFT_EGRESS_INVALID_REQUEST",
  "MICROSOFT_EGRESS_TARGET_POLICY_VIOLATION",
  "MICROSOFT_EGRESS_UPSTREAM_AUTHORIZATION_FAILED",
  "MICROSOFT_EGRESS_UPSTREAM_REJECTED",
  "MICROSOFT_EGRESS_UPSTREAM_THROTTLED",
]);

export function graphSubscriptionCreateFailureState(error) {
  if (error?.remote_commit_state === "not_created") return "not_created";
  if (error?.remote_commit_state === "unknown") return "unknown";
  const code = error?.safe_error_code ?? error?.code;
  return DEFINITE_NOT_CREATED_CODES.has(code)
    ? "not_created"
    : "unknown";
}

export function createPostgresGraphSubscriptionCreateRecovery({
  tx,
  audit,
  tenant_id: tenantId,
} = {}) {
  async function fail(lease, error, at, { retain_create_intent = true } = {}) {
    return tx(async (client) => {
      const row = (await client.query(
        `UPDATE lawos_email_dms.graph_subscriptions SET
          status='pending',lease_owner=NULL,lease_expires_at=NULL,
          attempt_count=attempt_count+1,next_attempt_at=$4,
          last_error_code=$3,updated_at=$5,
          provisioning_operation=CASE WHEN $7 THEN provisioning_operation ELSE NULL END,
          provisioning_correlation_id=CASE WHEN $7 THEN provisioning_correlation_id ELSE NULL END,
          provisioning_started_at=CASE WHEN $7 THEN provisioning_started_at ELSE NULL END
         WHERE tenant_id=$1 AND subscription_id=$2 AND lease_owner=$6 RETURNING *`,
        [tenantId, lease.row.subscription_id, graphSubscriptionSafeCode(error),
          new Date(at.getTime() + Math.min(300_000,
            1000 * (2 ** (Number(lease.row.attempt_count) + 1)))).toISOString(),
          at.toISOString(), lease.lease_owner, retain_create_intent],
      )).rows[0];
      if (row) await audit(client, "retry_scheduled", row, at, {
        safe_error_code: row.last_error_code,
        attempt_count: row.attempt_count,
        create_intent_retained: retain_create_intent,
      });
      return row;
    });
  }

  async function releaseCreateIntent(local, at) {
    return tx(async (client) => {
      const retryAt = new Date(at.getTime() + Math.min(300_000,
        1000 * (2 ** Number(local.attempt_count ?? 0)))).toISOString();
      const row = (await client.query(
        `UPDATE lawos_email_dms.graph_subscriptions SET
          provisioning_operation=NULL,provisioning_correlation_id=NULL,
          provisioning_started_at=NULL,lease_owner=NULL,lease_expires_at=NULL,
          status='pending',next_attempt_at=$4,
          last_error_code='GRAPH_CREATE_ADOPTION_WINDOW_EXHAUSTED',updated_at=$5
         WHERE tenant_id=$1 AND subscription_id=$2
           AND provider_subscription_id IS NULL
           AND provisioning_operation='create'
           AND provisioning_correlation_id=$3 RETURNING *`,
        [tenantId, local.subscription_id, local.provisioning_correlation_id,
          retryAt, at.toISOString()],
      )).rows[0];
      if (!row) throw new Error("Graph subscription create intent ownership was lost");
      await audit(client, "adoption_window_exhausted", row, at, {
        attempt_count: row.attempt_count,
        safe_error_code: row.last_error_code,
      });
      return row;
    });
  }

  return Object.freeze({ fail, releaseCreateIntent });
}
