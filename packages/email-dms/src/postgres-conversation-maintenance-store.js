import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { requiredSyncString } from "./conversation-sync-model.js";

function boundedLimit(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 100) {
    throw new TypeError("limit must be between 1 and 100");
  }
  return value;
}

export function createPostgresConversationMaintenanceStore({
  pool,
  tenant_id,
  clock = () => new Date(),
  renewal_window_ms = 10 * 60_000,
} = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
  if (!Number.isSafeInteger(renewal_window_ms) || renewal_window_ms < 1) {
    throw new TypeError("renewal_window_ms must be positive");
  }

  async function listDueSubscriptionPrincipals({ limit = 25 } = {}) {
    const at = clock();
    if (!(at instanceof Date) || !Number.isFinite(at.getTime())) {
      throw new TypeError("clock must return a valid Date");
    }
    const renewalBefore = new Date(at.getTime() + renewal_window_ms).toISOString();
    return withPostgresTransaction(pool, { tenant_id: tenantId, readOnly: true }, async (client) => {
      const result = await client.query(
        `WITH principals AS (
           SELECT user_id,entra_subject_id,m365_connection_id
             FROM lawos_email_dms.conversation_policies
            WHERE tenant_id=$1 AND status='active'
           UNION
           SELECT user_id,entra_subject_id,m365_connection_id
             FROM lawos_email_dms.graph_subscriptions
            WHERE tenant_id=$1 AND status<>'revoked'
         ), state AS (
           SELECT principal.*,
             connection.payload->>'revoked_at' AS connection_revoked_at,
             (connection.payload->>'expires_at' IS NULL
               OR connection.payload->>'expires_at' !~
                 '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'
               OR connection.payload->>'expires_at' <= $5)
               AS connection_expired,
             NOT COALESCE(jsonb_typeof(connection.payload->'granted_scopes')='array'
               AND connection.payload->'granted_scopes' ? 'Mail.Read', false)
               AS connection_scope_lost,
             EXISTS (
               SELECT 1 FROM lawos_email_dms.conversation_policies policy
                WHERE policy.tenant_id=$1 AND policy.status='active'
                  AND policy.user_id=principal.user_id
                  AND policy.entra_subject_id=principal.entra_subject_id
                  AND policy.m365_connection_id=principal.m365_connection_id
             ) AS has_policy,
             count(DISTINCT subscription.resource)
               FILTER (WHERE subscription.status<>'revoked') AS resource_count,
             bool_or(subscription.status='active'
               AND (subscription.provider_expires_at IS NULL
                 OR subscription.provider_expires_at <= $3)) AS renewal_due,
             bool_or(subscription.status<>'active'
               AND (subscription.next_attempt_at IS NULL OR subscription.next_attempt_at <= $2)) AS retry_due,
             bool_or(subscription.status<>'revoked'
               AND (subscription.next_attempt_at IS NULL OR subscription.next_attempt_at <= $2)) AS cleanup_due
           FROM principals principal
           JOIN lawos_domain.records connection
             ON connection.tenant_id=$1 AND connection.domain_id='email-dms'
            AND connection.record_type='M365Connection'
            AND connection.record_id=principal.m365_connection_id
           LEFT JOIN lawos_email_dms.graph_subscriptions subscription
             ON subscription.tenant_id=$1
            AND subscription.user_id=principal.user_id
            AND subscription.entra_subject_id=principal.entra_subject_id
            AND subscription.m365_connection_id=principal.m365_connection_id
          GROUP BY principal.user_id,principal.entra_subject_id,
            principal.m365_connection_id,connection.payload
         )
         SELECT user_id,entra_subject_id,m365_connection_id
           FROM state
          WHERE (connection_revoked_at IS NOT NULL AND resource_count > 0 AND cleanup_due)
             OR (NOT has_policy AND resource_count > 0 AND cleanup_due)
             OR (has_policy AND (connection_revoked_at IS NOT NULL
               OR connection_expired OR connection_scope_lost
               OR resource_count < 2 OR renewal_due OR retry_due))
          ORDER BY m365_connection_id
          LIMIT $4`,
        [tenantId, at.toISOString(), renewalBefore, boundedLimit(limit),
          at.toISOString()],
      );
      return Object.freeze(result.rows.map((row) => Object.freeze({
        tenant_id: tenantId,
        user_id: row.user_id,
        entra_subject_id: row.entra_subject_id,
        m365_connection_id: row.m365_connection_id,
      })));
    });
  }

  return Object.freeze({
    authority: "postgres-outlook-conversation-maintenance-store",
    listDueSubscriptionPrincipals,
  });
}
