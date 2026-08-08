import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { createPostgresGraphNotificationQueue } from "../src/postgres-graph-notification-queue.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";

const TENANT = "tenant-outm27-postgres";
const RESOURCE = "me/mailFolders('inbox')/messages";

async function runtime(t) {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 6 });
  if (!fixture) return null;
  const migrations = listEmailDmsPostgresMigrations();
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migrations[3].sql);
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, async (client) => {
    await client.query(
      `INSERT INTO lawos_email_dms.graph_subscriptions
         (tenant_id,subscription_id,user_id,entra_subject_id,entra_tenant_id,
          m365_connection_id,mailbox_ref,resource,change_type,client_state_hash,
          client_state_ref,notification_url_hash,provider_subscription_id,provider_expires_at,status,
          created_at,updated_at)
       VALUES ($1,'subscription-outm27','user-outm27','subject-outm27',
               'entra-tenant-outm27','connection-outm27',$2,$3,'created',$4,$5,$6,
               'provider-outm27','2026-08-08T02:00:00.000Z','active',
               '2026-08-08T00:00:00.000Z','2026-08-08T00:00:00.000Z')`,
      [TENANT, "a".repeat(64), RESOURCE, "b".repeat(64),
        `client_state_ref_${"c".repeat(32)}`, "d".repeat(64)],
    );
  });
  return fixture;
}

function notification(overrides = {}) {
  return {
    tenant_id: TENANT,
    subscription_id: "subscription-outm27",
    provider_subscription_id: "provider-outm27",
    resource: RESOURCE,
    message_id: "message-outm27",
    change_type: "created",
    source: "webhook",
    received_at: "2026-08-08T00:00:00.000Z",
    subscription_expiration_at: "2026-08-08T02:00:00.000Z",
    ...overrides,
  };
}

test("OUTM-27 PostgreSQL queue deduplicates concurrent delivery and leases once across restarts", async (t) => {
  const fixture = await runtime(t);
  if (!fixture) return;
  let now = new Date("2026-08-08T00:00:00.000Z");
  const first = createPostgresGraphNotificationQueue({ pool: fixture.appPool, clock: () => now, lease_ms: 100, base_delay_ms: 10 });
  const second = createPostgresGraphNotificationQueue({ pool: fixture.appPool, clock: () => now, lease_ms: 100, base_delay_ms: 10 });

  const enqueued = await Promise.all([first.enqueue(notification()), second.enqueue(notification())]);
  assert.deepEqual(enqueued.map(({ outcome }) => outcome).sort(), ["duplicate", "enqueued"]);
  const [left, right] = await Promise.all([
    first.claim({ tenant_id: TENANT, worker_id: "worker-left", limit: 1 }),
    second.claim({ tenant_id: TENANT, worker_id: "worker-right", limit: 1 }),
  ]);
  assert.equal(left.length + right.length, 1);
  const leased = [...left, ...right][0];
  const owner = leased.lease_owner;
  const retried = await first.fail({ tenant_id: TENANT, worker_id: owner, job_id: leased.job_id, error_code: "GRAPH_TEMPORARY" });
  assert.equal(retried.status, "retry");

  now = new Date(new Date(retried.available_at).getTime() + 1);
  const restarted = createPostgresGraphNotificationQueue({ pool: fixture.appPool, clock: () => now, lease_ms: 100, base_delay_ms: 10 });
  const reclaimed = (await restarted.claim({ tenant_id: TENANT, worker_id: "worker-restarted", limit: 1 }))[0];
  const completed = await restarted.complete({ tenant_id: TENANT, worker_id: "worker-restarted", job_id: reclaimed.job_id, result_code: "delta_reconciled" });
  assert.equal(completed.status, "completed");
  await restarted.enqueue(notification({ message_id: "message-outm27-dead-letter" }));
  const doomed = (await restarted.claim({ tenant_id: TENANT, worker_id: "worker-dead-letter", limit: 1 }))[0];
  const extended = await restarted.extendLease({ tenant_id: TENANT, worker_id: "worker-dead-letter", job_id: doomed.job_id });
  assert.ok(new Date(extended.lease_expires_at).getTime() > now.getTime());
  const dead = await restarted.fail({ tenant_id: TENANT, worker_id: "worker-dead-letter", job_id: doomed.job_id, error_code: "GRAPH_PERMANENT", permanent: true });
  assert.equal(dead.status, "dead_letter");
  const state = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => ({
    receipts: Number((await client.query("SELECT count(*)::int AS count FROM lawos_email_dms.graph_notification_receipts")).rows[0].count),
    jobs: Number((await client.query("SELECT count(*)::int AS count FROM lawos_email_dms.graph_notification_jobs")).rows[0].count),
    events: (await client.query("SELECT event_type FROM lawos_email_dms.graph_sync_audit_events ORDER BY occurred_at,event_id")).rows.map(({ event_type: type }) => type),
  }));
  assert.equal(state.receipts, 2);
  assert.equal(state.jobs, 2);
  assert.ok(state.events.includes("graph_job.retry_scheduled"));
  assert.ok(state.events.includes("graph_job.completed"));
  assert.ok(state.events.includes("graph_job.lease_extended"));
  assert.ok(state.events.includes("graph_job.dead_lettered"));
});

test("OUTM-27 PostgreSQL lifecycle transition and recovery outbox commit atomically", async (t) => {
  const fixture = await runtime(t);
  if (!fixture) return;
  const queue = createPostgresGraphNotificationQueue({ pool: fixture.appPool });
  const result = await queue.enqueue(notification({
    message_id: undefined,
    change_type: undefined,
    lifecycle_event: "reauthorizationRequired",
  }));
  assert.equal(result.job.job_kind, "subscription_reconcile");
  const state = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => ({
    subscription: (await client.query("SELECT status FROM lawos_email_dms.graph_subscriptions")).rows[0],
    job: (await client.query("SELECT status,job_kind FROM lawos_email_dms.graph_notification_jobs")).rows[0],
    audit: (await client.query("SELECT event_type FROM lawos_email_dms.graph_sync_audit_events")).rows[0],
  }));
  assert.equal(state.subscription.status, "reauthorization_required");
  assert.deepEqual(state.job, { status: "pending", job_kind: "subscription_reconcile" });
  assert.equal(state.audit.event_type, "graph_job.enqueued");
});

test("OUTM-27 webhook and delta reconciliation converge on one durable message job", async (t) => {
  const fixture = await runtime(t);
  if (!fixture) return;
  const queue = createPostgresGraphNotificationQueue({ pool: fixture.appPool });
  const results = await Promise.all([
    queue.enqueue(notification({ source: "webhook", received_at: "2026-08-08T00:00:00.000Z" })),
    queue.enqueue(notification({
      source: "delta_reconciliation",
      received_at: "2026-08-08T00:05:00.000Z",
      subscription_expiration_at: undefined,
    })),
  ]);
  assert.deepEqual(results.map(({ outcome }) => outcome).sort(), ["duplicate", "enqueued"]);
  const state = await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT, readOnly: true }, async (client) => ({
    receipts: Number((await client.query(
      "SELECT count(*)::int AS count FROM lawos_email_dms.graph_notification_receipts",
    )).rows[0].count),
    jobs: Number((await client.query(
      "SELECT count(*)::int AS count FROM lawos_email_dms.graph_notification_jobs",
    )).rows[0].count),
    message: (await client.query(
      "SELECT message_id,job_kind,status FROM lawos_email_dms.graph_notification_jobs",
    )).rows[0],
  }));
  assert.equal(state.receipts, 1);
  assert.equal(state.jobs, 1);
  assert.deepEqual(state.message, {
    message_id: "message-outm27",
    job_kind: "message_notification",
    status: "pending",
  });
});
