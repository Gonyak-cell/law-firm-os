import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import { createPostgresGraphNotificationQueue } from "../src/postgres-graph-notification-queue.js";

const TENANT = "tenant-outm27-crash-recovery";
const RESOURCE = "me/mailFolders('inbox')/messages";

async function seed(t) {
  const fixture = await createMigratedPostgresFixture(t, { appPoolMax: 6 });
  if (!fixture) return null;
  const migrations = listEmailDmsPostgresMigrations();
  await fixture.adminPool.query(migrations[0].sql);
  await fixture.adminPool.query(migrations[3].sql);
  await withPostgresTransaction(fixture.appPool, { tenant_id: TENANT }, (client) => client.query(
    `INSERT INTO lawos_email_dms.graph_subscriptions
       (tenant_id,subscription_id,user_id,entra_subject_id,entra_tenant_id,
        m365_connection_id,mailbox_ref,resource,change_type,client_state_hash,
        client_state_ref,notification_url_hash,provider_subscription_id,
        provider_expires_at,status,created_at,updated_at)
     VALUES ($1,'subscription-crash','user-crash','subject-crash','entra-crash',
       'connection-crash',$2,$3,'created',$4,$5,$6,'provider-crash',$7,
       'active',$8,$8)`,
    [TENANT, "a".repeat(64), RESOURCE, "b".repeat(64),
      `client_state_ref_${"c".repeat(32)}`, "d".repeat(64),
      "2026-08-08T02:00:00.000Z", "2026-08-08T00:00:00.000Z"],
  ));
  return fixture;
}

test("OUTM-27 expired leases reach the durable dead letter after hard worker crashes", async (t) => {
  const fixture = await seed(t);
  if (!fixture) return;
  let now = new Date("2026-08-08T00:00:00.000Z");
  const queue = createPostgresGraphNotificationQueue({
    pool: fixture.appPool,
    clock: () => now,
    lease_ms: 100,
    max_attempts: 3,
  });
  await queue.enqueue({
    tenant_id: TENANT,
    subscription_id: "subscription-crash",
    provider_subscription_id: "provider-crash",
    resource: RESOURCE,
    message_id: "message-crash",
    change_type: "created",
    source: "webhook",
    received_at: now.toISOString(),
    subscription_expiration_at: "2026-08-08T02:00:00.000Z",
  });

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const jobs = await queue.claim({
      tenant_id: TENANT,
      worker_id: `crashed-worker-${attempt}`,
      limit: 1,
    });
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].attempt_count, attempt);
    now = new Date(now.getTime() + 101);
  }
  assert.deepEqual(await queue.claim({
    tenant_id: TENANT,
    worker_id: "worker-after-crashes",
    limit: 1,
  }), []);

  const terminal = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: TENANT, readOnly: true },
    async (client) => ({
      job: (await client.query(
        `SELECT status,attempt_count,lease_owner,lease_expires_at,last_error_code
           FROM lawos_email_dms.graph_notification_jobs`,
      )).rows[0],
      events: (await client.query(
        `SELECT event_type FROM lawos_email_dms.graph_sync_audit_events
          WHERE event_type='graph_job.dead_lettered'
          ORDER BY occurred_at,event_id`,
      )).rows,
    }),
  );
  assert.deepEqual(terminal.job, {
    status: "dead_letter",
    attempt_count: 3,
    lease_owner: null,
    lease_expires_at: null,
    last_error_code: "GRAPH_LEASE_EXPIRED_MAX_ATTEMPTS",
  });
  assert.deepEqual(terminal.events, [{ event_type: "graph_job.dead_lettered" }]);
});
