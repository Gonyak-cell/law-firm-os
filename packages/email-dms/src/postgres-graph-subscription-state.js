import { randomBytes, randomUUID } from "node:crypto";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { graphSubscriptionId, requiredSyncString, syncDigest } from "./conversation-sync-model.js";
import {
  createGraphSubscriptionAuditor,
  graphSubscriptionSafeCode,
  hashGraphSubscriptionSecret,
} from "./postgres-graph-subscription-state-support.js";
import { createPostgresGraphSubscriptionCreateRecovery } from "./postgres-graph-subscription-create-recovery.js";
export function createPostgresGraphSubscriptionState({
  pool,
  tenant_id,
  entra_tenant_id,
  notification_url_hash,
  lease_ms = 30_000,
  client_state_factory = () => randomBytes(32).toString("base64url"),
} = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL Graph subscription state is required");
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
  const entraTenantId = requiredSyncString({ entra_tenant_id }, "entra_tenant_id");
  const notificationUrlHash = requiredSyncString({ notification_url_hash }, "notification_url_hash");
  if (!/^[a-f0-9]{64}$/u.test(notificationUrlHash)) {
    throw new TypeError("notification_url_hash must be a lowercase SHA-256 digest");
  }
  const tx = (callback) => withPostgresTransaction(pool, {
    tenant_id: tenantId,
    isolationLevel: "serializable",
  }, callback);
  const audit = createGraphSubscriptionAuditor(tenantId);
  const createRecovery = createPostgresGraphSubscriptionCreateRecovery({
    tx,
    audit,
    tenant_id: tenantId,
  });
  async function acquire(input, resource, existing, operation, at, intendedExpiresAt) {
    const secret = operation === "create" ? client_state_factory() : null;
    if (secret !== null && (typeof secret !== "string"
      || secret.length < 16 || secret.length > 128)) {
      throw new TypeError("client_state_factory must return 16..128 characters");
    }
    const subscriptionId = existing?.subscription_id
      ?? graphSubscriptionId({ ...input, resource });
    const leaseOwner = randomUUID();
    const correlationId = operation === "create" ? randomUUID() : null;
    return tx(async (client) => {
      await client.query(
        `INSERT INTO lawos_email_dms.graph_subscriptions
          (tenant_id,subscription_id,user_id,entra_subject_id,entra_tenant_id,
           m365_connection_id,mailbox_ref,resource,change_type,client_state_hash,
           client_state_ref,notification_url_hash,status,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'created',$9,$10,$11,'pending',$12,$12)
         ON CONFLICT (tenant_id,subscription_id) DO NOTHING`,
        [tenantId, subscriptionId, input.user_id, input.entra_subject_id,
          entraTenantId, input.m365_connection_id, input.mailbox_ref, resource,
          secret ? hashGraphSubscriptionSecret(secret) : existing.client_state_hash,
          existing?.client_state_ref ?? syncDigest("client_state_ref", {
            tenant_id: tenantId,
            subscription_id: subscriptionId,
          }), notificationUrlHash, at.toISOString()],
      );
      const row = (await client.query(
        `SELECT * FROM lawos_email_dms.graph_subscriptions
          WHERE tenant_id=$1 AND subscription_id=$2 FOR UPDATE`,
        [tenantId, subscriptionId],
      )).rows[0];
      if ((row.lease_expires_at && Date.parse(row.lease_expires_at) > at.getTime())
        || row.status === "cleanup_pending") return null;
      if (row.user_id !== input.user_id
        || row.entra_subject_id !== input.entra_subject_id
        || row.entra_tenant_id !== entraTenantId
        || row.notification_url_hash !== notificationUrlHash
        || row.m365_connection_id !== input.m365_connection_id
        || row.mailbox_ref !== input.mailbox_ref || row.resource !== resource) {
        throw new Error("Graph subscription ownership binding does not match");
      }
      const result = (await client.query(
        `UPDATE lawos_email_dms.graph_subscriptions SET
          client_state_hash=CASE WHEN $3::text IS NULL THEN client_state_hash ELSE $3 END,
          provisioning_operation=CASE WHEN $4::text='create' THEN 'create' ELSE provisioning_operation END,
          provisioning_correlation_id=CASE WHEN $4::text='create' THEN $5::uuid ELSE provisioning_correlation_id END,
          provisioning_started_at=CASE WHEN $4::text='create' THEN $6 ELSE provisioning_started_at END,
          provider_expires_at=CASE WHEN $4::text='create' THEN $9 ELSE provider_expires_at END,
          status=CASE WHEN $4::text='create' THEN 'pending' ELSE status END,
          lease_owner=$7,lease_expires_at=$8,updated_at=$6
         WHERE tenant_id=$1 AND subscription_id=$2 RETURNING *`,
        [tenantId, subscriptionId,
          secret ? hashGraphSubscriptionSecret(secret) : null, operation,
          correlationId, at.toISOString(), leaseOwner,
          new Date(at.getTime() + lease_ms).toISOString(), intendedExpiresAt],
      )).rows[0];
      if (operation === "create") {
        await audit(client, "create_intent", result, at, {
          correlation_id: result.provisioning_correlation_id,
          resource,
          client_state_hash: result.client_state_hash,
          intended_expires_at: result.provider_expires_at,
        });
      }
      return { row: result, lease_owner: leaseOwner, client_state: secret };
    });
  }
  async function complete(lease, providerResult, at) {
    return tx(async (client) => {
      const row = (await client.query(
        `SELECT * FROM lawos_email_dms.graph_subscriptions
          WHERE tenant_id=$1 AND subscription_id=$2 FOR UPDATE`,
        [tenantId, lease.row.subscription_id],
      )).rows[0];
      if (!row || row.lease_owner !== lease.lease_owner
        || Date.parse(row.lease_expires_at) <= at.getTime()
        || providerResult.resource !== row.resource
        || providerResult.change_type !== "created"
        || providerResult.client_state_hash !== row.client_state_hash
        || !providerResult.provider_subscription_id
        || (row.provisioning_operation === "create"
          && new Date(providerResult.expires_at).getTime()
            !== new Date(row.provider_expires_at).getTime())
        || Date.parse(providerResult.expires_at) <= at.getTime()) {
        throw new Error("Graph subscription provider response is invalid");
      }
      const active = (await client.query(
        `UPDATE lawos_email_dms.graph_subscriptions SET
          provider_subscription_id=$3,provider_expires_at=$4,status='active',
          lease_owner=NULL,lease_expires_at=NULL,attempt_count=0,next_attempt_at=NULL,
          last_error_code=NULL,updated_at=$5
         WHERE tenant_id=$1 AND subscription_id=$2 RETURNING *`,
        [tenantId, row.subscription_id, providerResult.provider_subscription_id,
          providerResult.expires_at, at.toISOString()],
      )).rows[0];
      await audit(client, "active", active, at, {
        resource: active.resource,
        correlation_id: active.provisioning_correlation_id,
      });
      return active;
    });
  }

  async function beginCleanup(local, at) {
    return tx(async (client) => {
      const row = (await client.query(
        `UPDATE lawos_email_dms.graph_subscriptions SET
          status='cleanup_pending',lease_owner=NULL,lease_expires_at=NULL,updated_at=$4
         WHERE tenant_id=$1 AND subscription_id=$2
           AND provider_subscription_id=$3 RETURNING *`,
        [tenantId, local.subscription_id,
          local.provider_subscription_id, at.toISOString()],
      )).rows[0];
      if (!row) throw new Error("Graph subscription cleanup ownership was lost");
      await audit(client, "cleanup_pending", row, at, {
        provider_subscription_id: row.provider_subscription_id,
      });
      return row;
    });
  }

  async function scheduleDeleteRetry(local, error, at) {
    return tx(async (client) => {
      const row = (await client.query(
        `UPDATE lawos_email_dms.graph_subscriptions SET
          status='cleanup_pending',attempt_count=attempt_count+1,next_attempt_at=$4,
          last_error_code=$3,updated_at=$5
         WHERE tenant_id=$1 AND subscription_id=$2
           AND provider_subscription_id=$6 RETURNING *`,
        [tenantId, local.subscription_id, graphSubscriptionSafeCode(error),
          new Date(at.getTime() + Math.min(300_000,
            1000 * (2 ** (Number(local.attempt_count ?? 0) + 1)))).toISOString(),
          at.toISOString(), local.provider_subscription_id],
      )).rows[0];
      if (row) await audit(client, "delete_retry_scheduled", row, at, {
        safe_error_code: row.last_error_code,
        attempt_count: row.attempt_count,
      });
      return row;
    });
  }

  async function finishCleanup(local, status, at) {
    if (!new Set(["pending", "revoked"]).has(status)) {
      throw new TypeError("Graph subscription cleanup status is invalid");
    }
    return tx(async (client) => {
      const row = (await client.query(
        `UPDATE lawos_email_dms.graph_subscriptions SET
          provider_subscription_id=NULL,provider_expires_at=NULL,status=$4,
          provisioning_operation=NULL,provisioning_correlation_id=NULL,
          provisioning_started_at=NULL,lease_owner=NULL,lease_expires_at=NULL,
          attempt_count=0,next_attempt_at=NULL,last_error_code=NULL,updated_at=$5
         WHERE tenant_id=$1 AND subscription_id=$2
           AND provider_subscription_id IS NOT DISTINCT FROM $3 RETURNING *`,
        [tenantId, local.subscription_id,
          local.provider_subscription_id ?? null, status, at.toISOString()],
      )).rows[0];
      if (!row) throw new Error("Graph subscription cleanup ownership was lost");
      await audit(client, status === "revoked" ? "revoked" : "cleaned", row, at, {
        provider_subscription_id_present: Boolean(local.provider_subscription_id),
      });
      return row;
    });
  }

  async function adopt(local, remote, at) {
    return tx(async (client) => {
      const row = (await client.query(
        `SELECT * FROM lawos_email_dms.graph_subscriptions
          WHERE tenant_id=$1 AND subscription_id=$2 FOR UPDATE`,
        [tenantId, local.subscription_id],
      )).rows[0];
      if (!row || row.provider_subscription_id
        || row.provisioning_operation !== "create"
        || !row.provisioning_correlation_id
        || (row.lease_expires_at && Date.parse(row.lease_expires_at) > at.getTime())) {
        return null;
      }
      if (remote.resource !== row.resource || remote.change_type !== "created"
        || remote.client_state_hash !== row.client_state_hash
        || !remote.provider_subscription_id
        || new Date(remote.expires_at).getTime()
          !== new Date(row.provider_expires_at).getTime()
        || Date.parse(remote.expires_at) <= at.getTime()) {
        throw new Error("Graph subscription adoption binding does not match");
      }
      const active = (await client.query(
        `UPDATE lawos_email_dms.graph_subscriptions SET
          provider_subscription_id=$3,provider_expires_at=$4,status='active',
          lease_owner=NULL,lease_expires_at=NULL,attempt_count=0,next_attempt_at=NULL,
          last_error_code=NULL,updated_at=$5
         WHERE tenant_id=$1 AND subscription_id=$2 RETURNING *`,
        [tenantId, row.subscription_id, remote.provider_subscription_id,
          remote.expires_at, at.toISOString()],
      )).rows[0];
      await audit(client, "adopted", active, at, {
        correlation_id: active.provisioning_correlation_id,
        provider_subscription_id: active.provider_subscription_id,
      });
      return active;
    });
  }

  return Object.freeze({ acquire, complete, fail: createRecovery.fail,
    releaseCreateIntent: createRecovery.releaseCreateIntent, beginCleanup,
    scheduleDeleteRetry, finishCleanup, adopt });
}
