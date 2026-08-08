import { randomUUID } from "node:crypto";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { requiredSyncString, syncDigest } from "./conversation-sync-model.js";
import { graphNotificationIdentity, graphNotificationPayloadHash, normalizeGraphNotification } from "./graph-notification-queue.js";

function integer(value, field, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) throw new TypeError(`${field} must be a positive integer`);
  return value;
}

async function audit(client, job, event, at, details = {}) {
  await client.query(
    `INSERT INTO lawos_email_dms.graph_sync_audit_events
       (tenant_id, event_id, event_type, object_id, actor_id, details, occurred_at)
     VALUES ($1, $2, $3, $4, 'graph-notification-runtime', $5::jsonb, $6)`,
    [job.tenant_id, randomUUID(), `graph_job.${event}`, job.job_id, JSON.stringify(details), at],
  );
}

function jobKind(input) {
  if (input.kind === "message") return "message_notification";
  return input.lifecycle_event === "missed" ? "delta_reconciliation" : "subscription_reconcile";
}

const JOB_KINDS = Object.freeze([
  "message_notification",
  "delta_reconciliation",
  "subscription_reconcile",
]);

async function applyLifecycle(client, input, subscription) {
  if (input.kind !== "lifecycle") return;
  if (input.lifecycle_event === "missed") {
    await client.query(
      `INSERT INTO lawos_email_dms.graph_delta_cursors
         (tenant_id, m365_connection_id, resource, cursor_ref,
          reconciliation_required_at, version)
       VALUES ($1, $2, $3, NULL, $4, 1)
       ON CONFLICT (tenant_id, m365_connection_id, resource) DO UPDATE
         SET reconciliation_required_at = EXCLUDED.reconciliation_required_at,
             version = lawos_email_dms.graph_delta_cursors.version + 1`,
      [input.tenant_id, subscription.m365_connection_id, input.resource, input.received_at],
    );
    return;
  }
  await client.query(
    `UPDATE lawos_email_dms.graph_subscriptions
        SET status = $4, next_attempt_at = $5, updated_at = $5
      WHERE tenant_id = $1 AND subscription_id = $2
        AND provider_subscription_id = $3`,
    [input.tenant_id, input.subscription_id, input.provider_subscription_id,
      input.lifecycle_event === "reauthorizationRequired" ? "reauthorization_required" : "expired",
      input.received_at],
  );
}

export function createPostgresGraphNotificationQueue({
  pool,
  clock = () => new Date(),
  lease_ms = 30_000,
  max_attempts = 5,
  base_delay_ms = 1_000,
} = {}) {
  if (!pool?.connect) throw new TypeError("PostgreSQL pool is required");
  integer(lease_ms, "lease_ms");
  integer(max_attempts, "max_attempts");
  integer(base_delay_ms, "base_delay_ms");
  const tx = (tenantId, callback) => withPostgresTransaction(pool, { tenant_id: tenantId, isolationLevel: "serializable" }, callback);
  const timestamp = () => {
    const value = clock();
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new TypeError("clock must return a valid Date");
    return value;
  };

  async function enqueue(raw = {}) {
    const input = normalizeGraphNotification(raw);
    const identity = graphNotificationIdentity(input);
    const receiptId = syncDigest("graph_receipt", identity);
    const jobId = syncDigest("graph_job", identity);
    const hash = graphNotificationPayloadHash(input);
    return tx(input.tenant_id, async (client) => {
      const subscriptionResult = await client.query(
        `SELECT * FROM lawos_email_dms.graph_subscriptions
          WHERE tenant_id = $1 AND subscription_id = $2
            AND provider_subscription_id = $3 AND resource = $4
          FOR UPDATE`,
        [input.tenant_id, input.subscription_id, input.provider_subscription_id, input.resource],
      );
      const subscription = subscriptionResult.rows[0];
      if (!subscription) throw new Error("Graph notification subscription ownership is invalid");
      const inserted = await client.query(
        `INSERT INTO lawos_email_dms.graph_notification_receipts
           (tenant_id, receipt_id, subscription_id, provider_subscription_id,
            source, resource, notification_kind, message_id, lifecycle_event,
            subscription_expiration_at, change_type, received_at, payload_sha256)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (tenant_id, receipt_id) DO NOTHING RETURNING *`,
        [input.tenant_id, receiptId, input.subscription_id, input.provider_subscription_id,
          input.source, input.resource, input.kind, input.message_id, input.lifecycle_event,
          input.subscription_expiration_at, input.change_type, input.received_at, hash],
      );
      if (inserted.rowCount === 0) {
        const existing = await client.query(
          `SELECT * FROM lawos_email_dms.graph_notification_receipts
            WHERE tenant_id = $1 AND receipt_id = $2`, [input.tenant_id, receiptId],
        );
        const receipt = existing.rows[0];
        if (!receipt || receipt.payload_sha256 !== hash || receipt.provider_subscription_id !== input.provider_subscription_id) throw new Error("Graph notification receipt conflicts with an existing identity");
        const job = await client.query(
          `SELECT * FROM lawos_email_dms.graph_notification_jobs
            WHERE tenant_id = $1 AND job_id = $2`, [input.tenant_id, jobId],
        );
        return { outcome: "duplicate", receipt, job: job.rows[0] };
      }
      await applyLifecycle(client, input, subscription);
      const job = (await client.query(
        `INSERT INTO lawos_email_dms.graph_notification_jobs
           (tenant_id, job_id, subscription_id, resource, notification_kind,
            job_kind, dedupe_key, message_id, lifecycle_event,
            subscription_expiration_at, status, available_at, attempt_count,
            created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'pending',$11,0,$11,$11)
         RETURNING *`,
        [input.tenant_id, jobId, input.subscription_id, input.resource, input.kind,
          jobKind(input), syncDigest("graph_job_dedupe", identity), input.message_id,
          input.lifecycle_event, input.subscription_expiration_at, input.received_at],
      )).rows[0];
      await audit(client, job, "enqueued", input.received_at, { source: input.source, job_kind: job.job_kind });
      return { outcome: "enqueued", receipt: inserted.rows[0], job };
    });
  }

  async function claim({ tenant_id, worker_id, limit = 10, job_kinds = null } = {}) {
    const tenantId = requiredSyncString({ tenant_id }, "tenant_id");
    const workerId = requiredSyncString({ worker_id }, "worker_id");
    integer(limit, "limit", 100);
    if (job_kinds !== null && (!Array.isArray(job_kinds) || job_kinds.length < 1
      || job_kinds.some((kind) => !JOB_KINDS.includes(kind)))) {
      throw new TypeError("job_kinds contains an unsupported Graph job kind");
    }
    const at = timestamp();
    return tx(tenantId, async (client) => {
      const result = await client.query(
        `WITH candidates AS (
           SELECT job_id FROM lawos_email_dms.graph_notification_jobs
            WHERE tenant_id = $1 AND available_at <= $2
              AND ($6::text[] IS NULL OR job_kind = ANY($6::text[]))
              AND (status IN ('pending','retry')
                OR (status = 'leased' AND lease_expires_at <= $2))
            ORDER BY created_at, job_id FOR UPDATE SKIP LOCKED LIMIT $3
         )
         UPDATE lawos_email_dms.graph_notification_jobs AS job
            SET status='leased', lease_owner=$4, lease_expires_at=$5,
                attempt_count=job.attempt_count+1, updated_at=$2
           FROM candidates WHERE job.tenant_id=$1 AND job.job_id=candidates.job_id
         RETURNING job.*`,
        [tenantId, at.toISOString(), limit, workerId,
          new Date(at.getTime() + lease_ms).toISOString(), job_kinds],
      );
      for (const job of result.rows) await audit(client, job, "leased", at.toISOString(), { attempt_count: job.attempt_count });
      return result.rows;
    });
  }

  async function transition(input, event, mutate) {
    const tenantId = requiredSyncString(input, "tenant_id");
    const workerId = requiredSyncString(input, "worker_id");
    const jobId = requiredSyncString(input, "job_id");
    return tx(tenantId, async (client) => {
      const selected = await client.query(
        `SELECT * FROM lawos_email_dms.graph_notification_jobs
          WHERE tenant_id=$1 AND job_id=$2 FOR UPDATE`, [tenantId, jobId],
      );
      const current = selected.rows[0];
      if (!current || current.status !== "leased" || current.lease_owner !== workerId) throw new Error("Graph notification job lease was lost");
      const at = timestamp();
      const update = mutate(current, at);
      const job = (await client.query(
        `UPDATE lawos_email_dms.graph_notification_jobs SET
           status=$3, available_at=$4, lease_owner=$5, lease_expires_at=$6,
           last_error_code=$7, result_code=$8, updated_at=$9
         WHERE tenant_id=$1 AND job_id=$2 RETURNING *`,
        [tenantId, jobId, update.status, update.available_at, update.lease_owner,
          update.lease_expires_at, update.last_error_code, update.result_code, at.toISOString()],
      )).rows[0];
      await audit(client, job, event(job), at.toISOString(), { attempt_count: job.attempt_count, result_code: job.result_code, safe_error_code: job.last_error_code });
      return job;
    });
  }

  const complete = (input = {}) => transition(input, () => "completed", (job) => ({ ...job, status: "completed", lease_owner: null, lease_expires_at: null, last_error_code: null, result_code: requiredSyncString(input, "result_code") }));
  const extendLease = (input = {}) => transition(input, () => "lease_extended", (job, at) => ({ ...job, lease_expires_at: new Date(at.getTime() + lease_ms).toISOString() }));
  const fail = (input = {}) => transition(input, (job) => job.status === "dead_letter" ? "dead_lettered" : "retry_scheduled", (job, at) => {
    const dead = input.permanent === true || job.attempt_count >= max_attempts;
    return { ...job, status: dead ? "dead_letter" : "retry", available_at: dead ? job.available_at : new Date(at.getTime() + Math.min(15 * 60_000, base_delay_ms * (2 ** (job.attempt_count - 1)))).toISOString(), lease_owner: null, lease_expires_at: null, last_error_code: requiredSyncString(input, "error_code", 100) };
  });

  return Object.freeze({ authority: "postgres-outlook-graph-queue", durable: true, enqueue, claim, extendLease, complete, fail });
}
