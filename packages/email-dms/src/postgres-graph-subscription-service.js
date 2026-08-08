import { createHash, randomBytes, randomUUID } from "node:crypto";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { GRAPH_MESSAGE_RESOURCES, graphSubscriptionId, requiredSyncString, syncDigest } from "./conversation-sync-model.js";

const ACTOR = "graph-subscription-reconciler";

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function activeConnection(connection, input, now) {
  return connection && connection.tenant_id === input.tenant_id
    && connection.user_id === input.user_id
    && connection.entra_subject_id === input.entra_subject_id
    && connection.m365_connection_id === input.m365_connection_id
    && !connection.revoked_at && Date.parse(connection.expires_at) > now.getTime()
    && connection.connection_authority === "delegated" && connection.mailbox_scope === "me"
    && connection.granted_scopes?.includes("Mail.Read")
    && /^[a-f0-9]{64}$/u.test(connection.mailbox_address_hash ?? "");
}

function safeCode(error) {
  const value = error?.safe_error_code ?? error?.code;
  return typeof value === "string" && /^[A-Z0-9_]{1,80}$/u.test(value) ? value : "GRAPH_SUBSCRIPTION_FAILED";
}

export function createPostgresGraphSubscriptionService({
  pool,
  tenant_id,
  state_lookup,
  provider,
  entra_tenant_id,
  clock = () => new Date(),
  lease_ms = 30_000,
  renewal_window_ms = 10 * 60_000,
  expiration_factory = ({ now }) => new Date(now.getTime() + 60 * 60_000).toISOString(),
  client_state_factory = () => randomBytes(32).toString("base64url"),
} = {}) {
  if (!pool?.connect || typeof state_lookup !== "function") throw new TypeError("PostgreSQL Graph subscription state is required");
  for (const method of ["createOwnMessageSubscription", "renewOwnMessageSubscription", "listOwnMessageSubscriptions", "deleteOwnMessageSubscription"]) {
    if (typeof provider?.[method] !== "function") throw new TypeError("Microsoft Graph subscription provider is required");
  }
  const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
  const entraTenantId = requiredSyncString({ entra_tenant_id }, "entra_tenant_id");
  const tx = (callback) => withPostgresTransaction(pool, { tenant_id: tenantId, isolationLevel: "serializable" }, callback);
  const now = () => {
    const value = clock();
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new TypeError("clock must return a valid Date");
    return value;
  };

  async function audit(client, event, row, at, details = {}) {
    await client.query(
      `INSERT INTO lawos_email_dms.graph_sync_audit_events
        (tenant_id,event_id,event_type,object_id,actor_id,details,occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
      [tenantId, randomUUID(), `graph_subscription.${event}`, row.subscription_id, ACTOR, JSON.stringify(details), at],
    );
  }

  async function acquire(input, resource, existing, operation, at) {
    const secret = operation === "create" ? client_state_factory() : null;
    if (secret !== null && (typeof secret !== "string" || secret.length < 16 || secret.length > 128)) throw new TypeError("client_state_factory must return 16..128 characters");
    const subscriptionId = existing?.subscription_id ?? graphSubscriptionId({ ...input, resource });
    const leaseOwner = randomUUID();
    return tx(async (client) => {
      await client.query(
        `INSERT INTO lawos_email_dms.graph_subscriptions
          (tenant_id,subscription_id,user_id,entra_subject_id,entra_tenant_id,
           m365_connection_id,mailbox_ref,resource,change_type,client_state_hash,
           client_state_ref,status,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'created',$9,$10,'pending',$11,$11)
         ON CONFLICT (tenant_id,subscription_id) DO NOTHING`,
        [tenantId, subscriptionId, input.user_id, input.entra_subject_id, entraTenantId,
          input.m365_connection_id, input.mailbox_ref, resource, secret ? hash(secret) : existing.client_state_hash,
          existing?.client_state_ref ?? syncDigest("client_state_ref", { tenant_id: tenantId, subscription_id: subscriptionId }), at.toISOString()],
      );
      const row = (await client.query(
        `SELECT * FROM lawos_email_dms.graph_subscriptions
          WHERE tenant_id=$1 AND subscription_id=$2 FOR UPDATE`, [tenantId, subscriptionId],
      )).rows[0];
      if (row.lease_expires_at && Date.parse(row.lease_expires_at) > at.getTime()) return null;
      if (row.user_id !== input.user_id || row.entra_subject_id !== input.entra_subject_id
        || row.entra_tenant_id !== entraTenantId || row.m365_connection_id !== input.m365_connection_id
        || row.mailbox_ref !== input.mailbox_ref || row.resource !== resource) throw new Error("Graph subscription ownership binding does not match");
      const result = (await client.query(
        `UPDATE lawos_email_dms.graph_subscriptions SET
          client_state_hash=CASE WHEN $3::text IS NULL THEN client_state_hash ELSE $3 END,
          lease_owner=$4,lease_expires_at=$5,updated_at=$6
         WHERE tenant_id=$1 AND subscription_id=$2 RETURNING *`,
        [tenantId, subscriptionId, secret ? hash(secret) : null, leaseOwner,
          new Date(at.getTime() + lease_ms).toISOString(), at.toISOString()],
      )).rows[0];
      return { row: result, lease_owner: leaseOwner, client_state: secret };
    });
  }

  async function complete(lease, providerResult, at) {
    return tx(async (client) => {
      const row = (await client.query(
        `SELECT * FROM lawos_email_dms.graph_subscriptions
          WHERE tenant_id=$1 AND subscription_id=$2 FOR UPDATE`, [tenantId, lease.row.subscription_id],
      )).rows[0];
      if (!row || row.lease_owner !== lease.lease_owner || providerResult.resource !== row.resource
        || providerResult.change_type !== "created" || providerResult.client_state_hash !== row.client_state_hash
        || !providerResult.provider_subscription_id || Date.parse(providerResult.expires_at) <= at.getTime()) {
        throw new Error("Graph subscription provider response is invalid");
      }
      const active = (await client.query(
        `UPDATE lawos_email_dms.graph_subscriptions SET
          provider_subscription_id=$3,provider_expires_at=$4,status='active',
          lease_owner=NULL,lease_expires_at=NULL,attempt_count=0,next_attempt_at=NULL,
          last_error_code=NULL,updated_at=$5
         WHERE tenant_id=$1 AND subscription_id=$2 RETURNING *`,
        [tenantId, row.subscription_id, providerResult.provider_subscription_id, providerResult.expires_at, at.toISOString()],
      )).rows[0];
      await audit(client, "active", active, at.toISOString(), { resource: active.resource });
      return active;
    });
  }

  async function fail(lease, error, at) {
    await tx(async (client) => {
      const row = (await client.query(
        `UPDATE lawos_email_dms.graph_subscriptions SET
          status='pending',lease_owner=NULL,lease_expires_at=NULL,attempt_count=attempt_count+1,
          next_attempt_at=$4,last_error_code=$3,updated_at=$5
         WHERE tenant_id=$1 AND subscription_id=$2 AND lease_owner=$6 RETURNING *`,
        [tenantId, lease.row.subscription_id, safeCode(error),
          new Date(at.getTime() + Math.min(300_000, 1000 * (2 ** (Number(lease.row.attempt_count) + 1)))).toISOString(), at.toISOString(), lease.lease_owner],
      )).rows[0];
      if (row) await audit(client, "retry_scheduled", row, at.toISOString(), { safe_error_code: row.last_error_code, attempt_count: row.attempt_count });
    });
  }

  async function scheduleDeleteRetry(local, error, at) {
    return tx(async (client) => {
      const row = (await client.query(
        `UPDATE lawos_email_dms.graph_subscriptions SET
          status='pending',lease_owner=NULL,lease_expires_at=NULL,
          attempt_count=attempt_count+1,next_attempt_at=$4,
          last_error_code=$3,updated_at=$5
         WHERE tenant_id=$1 AND subscription_id=$2 RETURNING *`,
        [tenantId, local.subscription_id, safeCode(error),
          new Date(at.getTime() + Math.min(300_000, 1000 * (2 ** (Number(local.attempt_count ?? 0) + 1)))).toISOString(),
          at.toISOString()],
      )).rows[0];
      if (row) await audit(client, "delete_retry_scheduled", row, at.toISOString(), {
        safe_error_code: row.last_error_code,
        attempt_count: row.attempt_count,
      });
      return row;
    });
  }

  async function provision(input, resource, existing) {
    const at = now();
    if (existing?.next_attempt_at && Date.parse(existing.next_attempt_at) > at.getTime()) return existing;
    const renewable = existing?.status === "active" && existing.provider_subscription_id
      && Date.parse(existing.provider_expires_at) > at.getTime();
    if (renewable && Date.parse(existing.provider_expires_at) - at.getTime() > renewal_window_ms) return existing;
    const operation = renewable ? "renew" : "create";
    const lease = await acquire(input, resource, existing, operation, at);
    if (!lease) return existing;
    try {
      const expiresAt = expiration_factory({ input, operation, existing, now: at });
      if (!Number.isFinite(Date.parse(expiresAt)) || Date.parse(expiresAt) <= at.getTime()) throw new TypeError("expiration_factory must return a future instant");
      const result = operation === "renew"
        ? await provider.renewOwnMessageSubscription({ ...input, provider_subscription_id: existing.provider_subscription_id, expiration_datetime: expiresAt })
        : await provider.createOwnMessageSubscription({ ...input, resource, change_type: "created", client_state: lease.client_state, client_state_hash: lease.row.client_state_hash, expiration_datetime: expiresAt });
      return await complete(lease, result, at);
    } catch (error) {
      await fail(lease, error, at);
      throw error;
    }
  }

  async function revokeLocals(input, locals, outcome) {
    let deferred = false;
    for (const local of locals) {
      const at = now();
      if (local.next_attempt_at && Date.parse(local.next_attempt_at) > at.getTime()) {
        deferred = true;
        continue;
      }
      if (local.provider_subscription_id) {
        try {
          await provider.deleteOwnMessageSubscription({ ...input, provider_subscription_id: local.provider_subscription_id });
        } catch (error) {
          await scheduleDeleteRetry(local, error, at);
          throw error;
        }
      }
      await tx(async (client) => {
        const row = (await client.query(
          `UPDATE lawos_email_dms.graph_subscriptions SET status='revoked',lease_owner=NULL,
            lease_expires_at=NULL,next_attempt_at=NULL,last_error_code=NULL,updated_at=$3
           WHERE tenant_id=$1 AND subscription_id=$2 RETURNING *`,
          [tenantId, local.subscription_id, at.toISOString()],
        )).rows[0];
        if (row) await audit(client, "revoked", row, row.updated_at, { provider_subscription_id_present: Boolean(local.provider_subscription_id) });
      });
    }
    return { outcome: deferred ? "retry_scheduled" : outcome, subscriptions: deferred ? locals : [] };
  }

  async function reconcile(input = {}) {
    for (const field of ["tenant_id", "user_id", "entra_subject_id", "actor_id", "m365_connection_id"]) requiredSyncString(input, field);
    if (input.tenant_id !== tenantId || input.actor_id !== ACTOR) throw new Error("Graph subscription service authority does not match");
    const state = await state_lookup(input);
    if (!state) throw new Error("Microsoft connection is not owned by the requested principal");
    const bound = { ...input, mailbox_ref: state.connection.mailbox_address_hash };
    if (state.connection.revoked_at) return revokeLocals(bound, state.subscriptions, "revoked_connection");
    if (!activeConnection(state.connection, input, now())) throw new Error("active delegated me-only Mail.Read connection is required");
    if (state.policies.length === 0) return revokeLocals(bound, state.subscriptions, state.subscriptions.length ? "revoked_without_active_policy" : "disabled_without_active_policy");
    const remote = await provider.listOwnMessageSubscriptions(bound);
    for (const local of state.subscriptions) {
      const match = remote.find((entry) => entry.provider_subscription_id === local.provider_subscription_id);
      if (match && (match.resource !== local.resource || match.client_state_hash !== local.client_state_hash)) throw new Error("Graph subscription ownership binding does not match");
      if (!match && local.provider_subscription_id) {
        await tx((client) => client.query(
          `UPDATE lawos_email_dms.graph_subscriptions SET provider_subscription_id=NULL,
            provider_expires_at=NULL,status='expired',updated_at=$3
           WHERE tenant_id=$1 AND subscription_id=$2`, [tenantId, local.subscription_id, now().toISOString()],
        ));
        local.provider_subscription_id = null;
        local.provider_expires_at = null;
        local.status = "expired";
      }
    }
    const subscriptions = [];
    for (const resource of GRAPH_MESSAGE_RESOURCES) subscriptions.push(await provision(bound, resource, state.subscriptions.find((entry) => entry.resource === resource)));
    return { outcome: subscriptions.every((entry) => entry?.status === "active") ? "active" : "retry_scheduled", subscriptions };
  }

  return Object.freeze({ authority: "postgres-graph-subscription-reconciler", reconcile });
}
