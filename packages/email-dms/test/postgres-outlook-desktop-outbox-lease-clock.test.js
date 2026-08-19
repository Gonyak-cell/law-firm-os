import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  authorityDigest,
  authorizeAndRegister,
  createOutlookAssignmentAuthorityFixture,
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

function principalKey(authority) {
  return `${authority.tenantId}\x1f${authority.principal.user_id}`
    + `\x1f${authority.principal.entra_subject_id}`;
}

function claim(authority, workerId) {
  return workerQuery(
    authority,
    "SELECT lawos_email_dms.claim_outlook_desktop_assignment_jobs($1,$2,10,1200,5) AS value",
    [authority.tenantId, workerId],
  );
}

function begin(authority, job, workerId) {
  return workerQuery(
    authority,
    "SELECT lawos_email_dms.begin_outlook_desktop_assignment_dispatch($1,$2,$3,$4) AS value",
    [authority.tenantId, job.outbox_id, workerId, job.lease_token],
  );
}

async function jobSnapshot(authority, outboxId) {
  return (await authority.observerPool.query(
    `SELECT to_jsonb(job)::text AS value
       FROM lawos_email_dms.outlook_desktop_assignment_outbox AS job
      WHERE tenant_id=$1 AND outbox_id=$2`,
    [authority.tenantId, outboxId],
  )).rows[0].value;
}

async function prepare(authority, suffix, { dispatch = false } = {}) {
  await seedCanaryPolicy(authority, { suffix });
  await authorizeAndRegister(authority, `lease-clock-${suffix}`);
  const workerId = `lease-clock-worker-${suffix}`;
  const [job] = await claim(authority, workerId);
  if (dispatch) await begin(authority, job, workerId);
  return { job, workerId };
}

async function blockedPastLease(authority, job, call, queryNeedle) {
  const result = await runBehindAdvisoryBarrier({
    adminPool: authority.observerPool,
    calls: [call],
    lockKey: principalKey(authority),
    queryNeedle,
    settled: true,
    beforeRelease: ({ blocker }) => blocker.query(
      `SELECT pg_sleep(GREATEST(0,EXTRACT(EPOCH FROM
        ($1::timestamptz-clock_timestamp())))+0.025)`,
      [job.lease_expires_at],
    ),
  });
  assert.equal(result.waiter_count, 1);
  assert.equal(result.results[0].status, "rejected");
  assert.equal(result.results[0].reason.code, "LAWOS_POSTGRES_OPERATION_FAILED");
  assert.equal(result.results[0].reason.postgres_code, "P0001");
}

const scenarios = [
  {
    name: "lease extension",
    suffix: "71",
    queryNeedle: "extend_outlook_desktop_assignment_lease",
    call: (authority, job, workerId) => workerQuery(
      authority,
      "SELECT lawos_email_dms.extend_outlook_desktop_assignment_lease($1,$2,$3,$4,30000) AS value",
      [authority.tenantId, job.outbox_id, workerId, job.lease_token],
    ),
  },
  {
    name: "dispatch begin",
    suffix: "72",
    queryNeedle: "begin_outlook_desktop_assignment_dispatch",
    call: (authority, job, workerId) => begin(authority, job, workerId),
  },
  {
    name: "typed failure",
    suffix: "73",
    queryNeedle: "fail_outlook_desktop_assignment_job",
    call: (authority, job, workerId) => workerQuery(
      authority,
      "SELECT lawos_email_dms.fail_outlook_desktop_assignment_job($1,$2::jsonb,5,100) AS value",
      [authority.tenantId, JSON.stringify({
        outbox_id: job.outbox_id,
        worker_id: workerId,
        lease_token: job.lease_token,
        error_code: "DEFINITIVE_REJECTION",
        failure_certainty: "definitive_not_committed",
        permanent: false,
        non_commit_proof: null,
      })],
    ),
  },
  {
    name: "completion",
    suffix: "74",
    queryNeedle: "complete_outlook_desktop_assignment_job",
    dispatch: true,
    call: (authority, job, workerId) => workerQuery(
      authority,
      "SELECT lawos_email_dms.complete_outlook_desktop_assignment_job($1,$2::jsonb) AS value",
      [authority.tenantId, JSON.stringify({
        outbox_id: job.outbox_id,
        worker_id: workerId,
        lease_token: job.lease_token,
        observed_assigned: true,
        result_code: "LEASE_CLOCK_READBACK",
        readback: {
          schema_version: "lawos.outlook-assignment-authoritative-readback.v1",
          request_terminal: true,
          propagation_stabilized: true,
          receipt_sha256: authorityDigest("lease-clock-completion"),
        },
      })],
    ),
  },
];

for (const scenario of scenarios) {
  test(`${scenario.name} cannot use a clock captured before its principal lock`, async (t) => {
    const authority = await createOutlookAssignmentAuthorityFixture(t, {
      tenantId: `tenant-outbox-${scenario.suffix}-lock-clock-a`,
    });
    if (!authority) return;
    const { job, workerId } = await prepare(authority, scenario.suffix, scenario);
    const before = await jobSnapshot(authority, job.outbox_id);
    await blockedPastLease(
      authority,
      job,
      () => scenario.call(authority, job, workerId),
      scenario.queryNeedle,
    );
    assert.equal(await jobSnapshot(authority, job.outbox_id), before);
  });
}
