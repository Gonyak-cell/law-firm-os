import { randomUUID } from "node:crypto";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { GRAPH_MESSAGE_RESOURCES, requiredSyncString } from "./conversation-sync-model.js";
import { normalizeM365Connection } from "./m365-connection-model.js";

function current(clock) {
  const value = clock();
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new TypeError("clock must return a valid Date");
  return value.toISOString();
}

export function createPostgresConversationSyncStore({
  pool,
  tenant_id,
  cursor_codec,
  clock = () => new Date(),
} = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
  if (!cursor_codec || typeof cursor_codec.seal !== "function" || typeof cursor_codec.open !== "function") throw new TypeError("Graph cursor codec is required");
  const tx = (callback, options = {}) => withPostgresTransaction(pool, { tenant_id: tenantId, ...options }, callback);

  async function findAuthority(field, value) {
    const predicate = field === "provider"
      ? "subscription.provider_subscription_id = $2"
      : "subscription.subscription_id = $2";
    return tx(async (client) => {
      const result = await client.query(
        `SELECT subscription.*, connection.payload AS connection_payload
           FROM lawos_email_dms.graph_subscriptions AS subscription
           JOIN lawos_domain.records AS connection
             ON connection.tenant_id = subscription.tenant_id
            AND connection.domain_id = 'email-dms'
            AND connection.record_type = 'M365Connection'
            AND connection.record_id = subscription.m365_connection_id
          WHERE subscription.tenant_id = $1
            AND ${predicate}`,
        [tenantId, value],
      );
      if (result.rowCount !== 1) return null;
      const row = result.rows[0];
      const connection = normalizeM365Connection(row.connection_payload);
      const subscription = { ...row };
      delete subscription.connection_payload;
      const policies = (await client.query(
        `SELECT * FROM lawos_email_dms.conversation_policies
          WHERE tenant_id=$1 AND user_id=$2 AND entra_subject_id=$3
            AND m365_connection_id=$4 AND status='active'
          ORDER BY policy_id`,
        [tenantId, subscription.user_id, subscription.entra_subject_id,
          subscription.m365_connection_id],
      )).rows;
      return Object.freeze({
        subscription: Object.freeze(subscription),
        connection,
        policies: Object.freeze(policies.map(Object.freeze)),
      });
    }, { readOnly: true });
  }

  const findWebhookAuthority = ({ provider_subscription_id } = {}) => findAuthority(
    "provider",
    requiredSyncString({ provider_subscription_id }, "provider_subscription_id"),
  );
  const findSubscriptionAuthority = ({ subscription_id } = {}) => findAuthority(
    "subscription",
    requiredSyncString({ subscription_id }, "subscription_id"),
  );

  async function readConnectionState(input = {}) {
    for (const field of ["tenant_id", "user_id", "entra_subject_id", "m365_connection_id"]) requiredSyncString(input, field);
    if (input.tenant_id !== tenantId) throw new Error("Graph connection tenant authority does not match");
    return tx(async (client) => {
      const connectionRow = (await client.query(
        `SELECT payload FROM lawos_domain.records
          WHERE tenant_id=$1 AND domain_id='email-dms'
            AND record_type='M365Connection' AND record_id=$2`,
        [tenantId, input.m365_connection_id],
      )).rows[0];
      if (!connectionRow) return null;
      const connection = normalizeM365Connection(connectionRow.payload);
      if (connection.user_id !== input.user_id || connection.entra_subject_id !== input.entra_subject_id) return null;
      const policies = (await client.query(
        `SELECT * FROM lawos_email_dms.conversation_policies
          WHERE tenant_id=$1 AND user_id=$2 AND entra_subject_id=$3
            AND m365_connection_id=$4 AND status='active'`,
        [tenantId, input.user_id, input.entra_subject_id, input.m365_connection_id],
      )).rows;
      const subscriptions = (await client.query(
        `SELECT * FROM lawos_email_dms.graph_subscriptions
          WHERE tenant_id=$1 AND user_id=$2 AND entra_subject_id=$3
            AND m365_connection_id=$4 AND status<>'revoked'`,
        [tenantId, input.user_id, input.entra_subject_id, input.m365_connection_id],
      )).rows;
      return Object.freeze({ connection, policies: Object.freeze(policies), subscriptions: Object.freeze(subscriptions) });
    }, { readOnly: true });
  }

  async function findActivePolicy(input = {}) {
    for (const field of ["tenant_id", "user_id", "entra_subject_id", "m365_connection_id", "conversation_id"]) requiredSyncString(input, field);
    if (input.tenant_id !== tenantId) throw new Error("conversation policy tenant authority does not match");
    return tx(async (client) => {
      const rows = (await client.query(
        `SELECT * FROM lawos_email_dms.conversation_policies
          WHERE tenant_id=$1 AND user_id=$2 AND entra_subject_id=$3
            AND m365_connection_id=$4 AND conversation_id=$5 AND status='active'`,
        [tenantId, input.user_id, input.entra_subject_id, input.m365_connection_id, input.conversation_id],
      )).rows;
      if (rows.length > 1) throw new Error("conversation has conflicting active policies");
      return rows[0] ?? null;
    }, { readOnly: true });
  }

  async function readReconciliationState(input = {}) {
    for (const field of ["tenant_id", "user_id", "entra_subject_id", "m365_connection_id"]) requiredSyncString(input, field);
    if (input.tenant_id !== tenantId) throw new Error("Graph reconciliation tenant authority does not match");
    return tx(async (client) => {
      const result = await client.query(
        `SELECT
           COALESCE(jsonb_agg(DISTINCT policy.*)
             FILTER (WHERE policy.policy_id IS NOT NULL), '[]'::jsonb) AS policies,
           COALESCE(jsonb_agg(DISTINCT subscription.*)
             FILTER (WHERE subscription.subscription_id IS NOT NULL), '[]'::jsonb) AS subscriptions
         FROM lawos_domain.records AS connection
         LEFT JOIN lawos_email_dms.conversation_policies AS policy
           ON policy.tenant_id = connection.tenant_id
          AND policy.user_id = $2 AND policy.entra_subject_id = $3
          AND policy.m365_connection_id = $4 AND policy.status = 'active'
         LEFT JOIN lawos_email_dms.graph_subscriptions AS subscription
           ON subscription.tenant_id = connection.tenant_id
          AND subscription.user_id = $2 AND subscription.entra_subject_id = $3
          AND subscription.m365_connection_id = $4
          AND subscription.status = 'active'
        WHERE connection.tenant_id = $1 AND connection.domain_id = 'email-dms'
          AND connection.record_type = 'M365Connection' AND connection.record_id = $4
          AND connection.payload->>'user_id' = $2
          AND connection.payload->>'entra_subject_id' = $3`,
        [tenantId, input.user_id, input.entra_subject_id, input.m365_connection_id],
      );
      return Object.freeze({
        policies: Object.freeze(result.rows[0]?.policies ?? []),
        subscriptions: Object.freeze(result.rows[0]?.subscriptions ?? []),
      });
    }, { readOnly: true });
  }

  function binding(input, resource) {
    if (!GRAPH_MESSAGE_RESOURCES.includes(resource)) throw new TypeError("Graph cursor resource is invalid");
    return { tenant_id: tenantId, m365_connection_id: requiredSyncString(input, "m365_connection_id"), resource };
  }

  async function readCursor(input, resource) {
    const key = binding(input, resource);
    return tx(async (client) => {
      const result = await client.query(
        `SELECT cursor_ref FROM lawos_email_dms.graph_delta_cursors
          WHERE tenant_id=$1 AND m365_connection_id=$2 AND resource=$3`,
        [tenantId, key.m365_connection_id, resource],
      );
      return result.rows[0]?.cursor_ref ? cursor_codec.open(result.rows[0].cursor_ref, key) : null;
    }, { readOnly: true });
  }

  async function writeCursor(input, resource, link) {
    const key = binding(input, resource);
    const at = current(clock);
    const reference = cursor_codec.seal(link, key);
    return tx(async (client) => {
      const result = await client.query(
        `INSERT INTO lawos_email_dms.graph_delta_cursors
           (tenant_id,m365_connection_id,resource,cursor_ref,
            reconciliation_required_at,last_reconciled_at,version)
         VALUES ($1,$2,$3,$4,NULL,$5,1)
         ON CONFLICT (tenant_id,m365_connection_id,resource) DO UPDATE SET
           cursor_ref=EXCLUDED.cursor_ref, reconciliation_required_at=NULL,
           last_reconciled_at=EXCLUDED.last_reconciled_at,
           version=lawos_email_dms.graph_delta_cursors.version+1
         RETURNING version`,
        [tenantId, key.m365_connection_id, resource, reference, at],
      );
      await client.query(
        `INSERT INTO lawos_email_dms.graph_sync_audit_events
           (tenant_id,event_id,event_type,object_id,actor_id,details,occurred_at)
         VALUES ($1,$2,'graph_delta.cursor_advanced',$3,
                 'graph-delta-reconciler',$4::jsonb,$5)`,
        [tenantId, randomUUID(), `${key.m365_connection_id}:${resource}`, JSON.stringify({ version: Number(result.rows[0].version) }), at],
      );
    });
  }

  async function resetCursor(input, resource) {
    const key = binding(input, resource);
    const at = current(clock);
    return tx(async (client) => {
      const result = await client.query(
        `INSERT INTO lawos_email_dms.graph_delta_cursors
           (tenant_id,m365_connection_id,resource,cursor_ref,
            reconciliation_required_at,last_reconciled_at,version)
         VALUES ($1,$2,$3,NULL,$4,NULL,1)
         ON CONFLICT (tenant_id,m365_connection_id,resource) DO UPDATE SET
           cursor_ref=NULL, reconciliation_required_at=EXCLUDED.reconciliation_required_at,
           version=lawos_email_dms.graph_delta_cursors.version+1
         RETURNING version`,
        [tenantId, key.m365_connection_id, resource, at],
      );
      await client.query(
        `INSERT INTO lawos_email_dms.graph_sync_audit_events
           (tenant_id,event_id,event_type,object_id,actor_id,details,occurred_at)
         VALUES ($1,$2,'graph_delta.cursor_reset',$3,
                 'graph-delta-reconciler',$4::jsonb,$5)`,
        [tenantId, randomUUID(), `${key.m365_connection_id}:${resource}`, JSON.stringify({ version: Number(result.rows[0].version), reason: "provider_cursor_expired" }), at],
      );
    });
  }

  return Object.freeze({
    authority: "postgres-outlook-conversation-sync",
    durable: true,
    tenant_id: tenantId,
    findWebhookAuthority,
    findSubscriptionAuthority,
    readConnectionState,
    findActivePolicy,
    readReconciliationState,
    cursor_store: Object.freeze({ read: readCursor, write: writeCursor, reset: resetCursor }),
  });
}
