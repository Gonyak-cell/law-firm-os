import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  authorizeAndRegister,
  authorizeLifecycle,
  createOutlookAssignmentAuthorityFixture,
  roleJsonCall,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import { runBehindAdvisoryBarrier } from "./support/postgres-advisory-concurrency.js";

function workerQuery(authority, statement, values) {
  return withPostgresTransaction(
    authority.workerPool,
    { tenant_id: authority.tenantId, isolationLevel: "serializable" },
    async (client) => (await client.query(statement, values)).rows[0]?.value,
  );
}

function claim(authority, workerId, leaseMilliseconds = 5_000, maxAttempts = 5) {
  return workerQuery(
    authority,
    "SELECT lawos_email_dms.claim_outlook_desktop_assignment_jobs($1,$2,10,$3,$4) AS value",
    [authority.tenantId, workerId, leaseMilliseconds, maxAttempts],
  );
}

async function waitPast(client, instant) {
  await client.query(
    `SELECT pg_sleep(GREATEST(0,EXTRACT(EPOCH FROM
      ($1::timestamptz-clock_timestamp())))+0.025)`,
    [instant],
  );
}

async function waitForBlockedQuery(client, queryNeedle) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    await client.query("SELECT pg_stat_clear_snapshot()");
    const row = (await client.query(
      `SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE datname=current_database() AND pid<>pg_backend_pid()
          AND wait_event_type='Lock' AND position($1 IN query)>0`,
      [queryNeedle],
    )).rows[0];
    if (row.count === 1) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`expected one blocked ${queryNeedle} call`);
}

test("claim captures its stale-lease clock only after the candidate row lock", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-claim-lock-clock-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "75" });
  await authorizeAndRegister(authority, "claim-lock-clock");
  const [first] = await claim(authority, "claim-clock-first", 1_200);
  const blocker = await authority.observerPool.connect();
  let open = false;
  try {
    await blocker.query("BEGIN");
    open = true;
    await blocker.query(
      `SELECT outbox_id FROM lawos_email_dms.outlook_desktop_assignment_outbox
        WHERE tenant_id=$1 AND outbox_id=$2 FOR UPDATE`,
      [authority.tenantId, first.outbox_id],
    );
    const pending = claim(authority, "claim-clock-second", 5_000);
    await waitForBlockedQuery(
      blocker, "claim_outlook_desktop_assignment_jobs",
    );
    await waitPast(blocker, first.lease_expires_at);
    await blocker.query("COMMIT");
    open = false;
    const [reclaimed] = await pending;
    assert.equal(reclaimed.outbox_id, first.outbox_id);
    assert.equal(reclaimed.lease_owner, "claim-clock-second");
    assert.notEqual(reclaimed.lease_token, first.lease_token);
    assert.equal(reclaimed.attempt_count, 2);
  } finally {
    if (open) await blocker.query("ROLLBACK").catch(() => {});
    blocker.release();
  }
});

test("mandatory removal recovery evaluates availability after principal and row locks", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-recover-lock-clock-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "76" });
  const registered = await authorizeAndRegister(authority, "recover-lock-clock");
  const retirement = await authorizeLifecycle(
    authority, registered, "retire", 1, "recover-lock-clock",
  );
  await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "retire_outlook_desktop_installation",
    retirement,
  );
  const [remove] = await claim(authority, "recover-clock-failure", 5_000, 1);
  assert.equal(remove.action, "remove");
  const failed = await workerQuery(
    authority,
    "SELECT lawos_email_dms.fail_outlook_desktop_assignment_job($1,$2::jsonb,1,100) AS value",
    [authority.tenantId, JSON.stringify({
      outbox_id: remove.outbox_id,
      worker_id: "recover-clock-failure",
      lease_token: remove.lease_token,
      error_code: "DEFINITIVE_REJECTION",
      failure_certainty: "definitive_not_committed",
      permanent: true,
      non_commit_proof: null,
    })],
  );
  assert.equal(failed.outcome, "retry");
  await waitPast(authority.observerPool, failed.job.available_at);
  assert.deepEqual(await claim(authority, "recover-clock-exhaust", 5_000, 1), []);
  const availability = (await authority.leasePrerequisitePool.query(
    `UPDATE lawos_email_dms.outlook_desktop_assignment_outbox
        SET available_at=date_trunc('milliseconds',clock_timestamp())+
          interval '1200 milliseconds'
      WHERE tenant_id=$1 AND outbox_id=$2 AND status='dead_letter'
      RETURNING available_at,retry_epoch::int,escalation_count::int`,
    [authority.tenantId, remove.outbox_id],
  )).rows[0];
  const barrier = await runBehindAdvisoryBarrier({
    adminPool: authority.observerPool,
    calls: [() => workerQuery(
      authority,
      "SELECT lawos_email_dms.recover_outlook_desktop_assignment_removals($1,10) AS value",
      [authority.tenantId],
    )],
    lockKey: `${authority.tenantId}\x1f${authority.principal.user_id}`
      + `\x1f${authority.principal.entra_subject_id}`,
    queryNeedle: "recover_outlook_desktop_assignment_removals",
    settled: true,
    beforeRelease: ({ blocker }) => waitPast(blocker, availability.available_at),
  });
  assert.equal(barrier.waiter_count, 1);
  assert.equal(barrier.results[0].status, "fulfilled");
  const [recovered] = barrier.results[0].value;
  assert.equal(recovered.status, "retry");
  assert.equal(recovered.retry_epoch, availability.retry_epoch + 1);
  assert.equal(recovered.retry_epoch_attempt_count, 0);
  assert.equal(recovered.escalation_count, availability.escalation_count + 1);
});
