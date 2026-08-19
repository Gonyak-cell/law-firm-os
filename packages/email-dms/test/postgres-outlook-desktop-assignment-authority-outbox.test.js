import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  authorizeAndRegister,
  authorizeLifecycle,
  authorityDigest,
  createOutlookAssignmentAuthorityFixture,
  roleJsonCall,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";

function workerTx(authority, callback) {
  return withPostgresTransaction(
    authority.workerPool,
    { tenant_id: authority.tenantId, isolationLevel: "serializable" },
    callback,
  );
}

function claim(authority, workerId, maxAttempts = 5) {
  return workerTx(authority, async (client) => (await client.query(
    "SELECT lawos_email_dms.claim_outlook_desktop_assignment_jobs($1,$2,10,30000,$3) AS value",
    [authority.tenantId, workerId, maxAttempts],
  )).rows[0].value);
}

function begin(authority, job, workerId) {
  return workerTx(authority, async (client) => (await client.query(
    "SELECT lawos_email_dms.begin_outlook_desktop_assignment_dispatch($1,$2,$3,$4) AS value",
    [authority.tenantId, job.outbox_id, workerId, job.lease_token],
  )).rows[0].value);
}

function readback(suffix) {
  return {
    schema_version: "lawos.outlook-assignment-authoritative-readback.v1",
    request_terminal: true,
    propagation_stabilized: true,
    receipt_sha256: authorityDigest(`readback-${suffix}`),
  };
}

function completeText(authority, job, workerId, observedAssigned, suffix) {
  const payload = {
    outbox_id: job.outbox_id,
    worker_id: workerId,
    lease_token: job.lease_token,
    observed_assigned: observedAssigned,
    result_code: `readback-${suffix}`,
    readback: readback(suffix),
  };
  return workerTx(authority, async (client) => (await client.query(
    "SELECT lawos_email_dms.complete_outlook_desktop_assignment_job($1,$2::jsonb)::text AS value",
    [authority.tenantId, JSON.stringify(payload)],
  )).rows[0].value);
}

async function fixtureOnlyExpireOutboxLease(authority, outboxId) {
  await authority.leasePrerequisitePool.query(
    `UPDATE lawos_email_dms.outlook_desktop_assignment_outbox
        SET lease_expires_at=clock_timestamp()-interval '1 second',
            updated_at=clock_timestamp()
      WHERE tenant_id=$1 AND outbox_id=$2`,
    [authority.tenantId, outboxId],
  );
}

async function makeUnknownThenRemove(authority, suffix) {
  await seedCanaryPolicy(authority);
  const registered = await authorizeAndRegister(authority, suffix);
  const workerOne = `worker-${suffix}-one`;
  const [add] = await claim(authority, workerOne);
  assert.equal(add.action, "add");
  assert.equal((await begin(authority, add, workerOne)).provider_call_allowed, true);
  const retirement = await authorizeLifecycle(
    authority,
    registered,
    "retire",
    1,
    `${suffix}-retire`,
  );
  await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "retire_outlook_desktop_installation",
    retirement,
  );
  return { add, workerOne };
}

for (const variant of [
  { name: "late generation one add committed", observed: true, outcome: "completed" },
  { name: "generation one proved absent", observed: false, outcome: "reconciled" },
]) {
  test(`unknown generation is an ordering barrier until ${variant.name}`, async (t) => {
    const authority = await createOutlookAssignmentAuthorityFixture(t, {
      tenantId: `tenant-outbox-${variant.observed ? "late" : "absent"}-a`,
    });
    if (!authority) return;
    const { add, workerOne } = await makeUnknownThenRemove(
      authority,
      variant.observed ? "late" : "absent",
    );
    assert.deepEqual(await claim(authority, "worker-generation-two-blocked"), []);
    await fixtureOnlyExpireOutboxLease(authority, add.outbox_id);
    const [recovered] = await claim(authority, "worker-generation-one-readback");
    assert.equal(recovered.provider_generation, 1);
    assert.equal(recovered.dispatch_mode, "readback_only");
    assert.equal((await begin(
      authority,
      recovered,
      "worker-generation-one-readback",
    )).provider_call_allowed, false);
    await assert.rejects(completeText(
      authority,
      { ...recovered, lease_token: add.lease_token },
      workerOne,
      variant.observed,
      "stale-worker",
    ));
    const response = await completeText(
      authority,
      recovered,
      "worker-generation-one-readback",
      variant.observed,
      `generation-one-${variant.outcome}`,
    );
    assert.equal(JSON.parse(response).outcome, variant.outcome);
    const [remove] = await claim(authority, "worker-generation-two");
    assert.equal(remove.provider_generation, 2);
    assert.equal(remove.action, "remove");
    assert.equal((await begin(
      authority,
      remove,
      "worker-generation-two",
    )).provider_call_allowed, true);
    const removeResponse = await completeText(
      authority,
      remove,
      "worker-generation-two",
      false,
      "generation-two-absent",
    );
    assert.equal(JSON.parse(removeResponse).outcome, "completed");
    assert.deepEqual(await claim(authority, "worker-finished"), []);
  });
}

test("worker completion replay is exact and lease extension never shortens", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-outbox-replay-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority);
  await authorizeAndRegister(authority, "replay");
  const workerId = "worker-replay";
  const [job] = await claim(authority, workerId);
  const originalExpiry = Date.parse(job.lease_expires_at);
  const extended = await workerTx(authority, async (client) => (await client.query(
    "SELECT lawos_email_dms.extend_outlook_desktop_assignment_lease($1,$2,$3,$4,1000) AS value",
    [authority.tenantId, job.outbox_id, workerId, job.lease_token],
  )).rows[0].value);
  assert.ok(Date.parse(extended.job.lease_expires_at) >= originalExpiry);
  await begin(authority, job, workerId);
  const first = await completeText(authority, job, workerId, true, "exact-replay");
  const replay = await completeText(authority, job, workerId, true, "exact-replay");
  assert.equal(replay, first);
  const receipt = await authority.observerPool.query(
    "SELECT response_text FROM lawos_email_dms.outlook_desktop_assignment_outbox_receipts WHERE outbox_id=$1",
    [job.outbox_id],
  );
  assert.equal(receipt.rows[0].response_text, first);
  await assert.rejects(completeText(authority, job, workerId, true, "changed-receipt"));
});

test("typed failures preserve unknown and mandatory removal remains recoverable", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-outbox-failure-a",
  });
  if (!authority) return;
  const { add } = await makeUnknownThenRemove(authority, "failure");
  await fixtureOnlyExpireOutboxLease(authority, add.outbox_id);
  const [unknown] = await claim(authority, "worker-unknown-failure", 1);
  const ambiguous = await workerTx(authority, async (client) => (await client.query(
    "SELECT lawos_email_dms.fail_outlook_desktop_assignment_job($1,$2::jsonb,1,100) AS value",
    [authority.tenantId, JSON.stringify({
      outbox_id: unknown.outbox_id,
      worker_id: "worker-unknown-failure",
      lease_token: unknown.lease_token,
      error_code: "REMOTE_COMMIT_UNKNOWN",
      failure_certainty: "ambiguous",
      permanent: false,
      non_commit_proof: null,
    })],
  )).rows[0].value);
  assert.equal(ambiguous.job.remote_commit_state, "unknown");
  assert.deepEqual(await claim(authority, "worker-newer-still-blocked", 1), []);
  await authority.leasePrerequisitePool.query(
    `UPDATE lawos_email_dms.outlook_desktop_assignment_outbox
        SET available_at=clock_timestamp()-interval '1 second'
      WHERE tenant_id=$1 AND outbox_id=$2`,
    [authority.tenantId, unknown.outbox_id],
  );
  const [readbackJob] = await claim(authority, "worker-definitive-readback", 1);
  const definitive = await workerTx(authority, async (client) => (await client.query(
    "SELECT lawos_email_dms.fail_outlook_desktop_assignment_job($1,$2::jsonb,1,100) AS value",
    [authority.tenantId, JSON.stringify({
      outbox_id: readbackJob.outbox_id,
      worker_id: "worker-definitive-readback",
      lease_token: readbackJob.lease_token,
      error_code: "REMOTE_COMMIT_NOT_FOUND",
      failure_certainty: "definitive_not_committed",
      permanent: true,
      non_commit_proof: {
        schema_version: "lawos.outlook-assignment-non-commit-proof.v1",
        request_terminal: true,
        propagation_stabilized: true,
        receipt_sha256: authorityDigest("definitive-non-commit"),
      },
    })],
  )).rows[0].value);
  assert.equal(definitive.job.remote_commit_state, "not_sent");
  assert.equal(definitive.outcome, "dead_letter");
  const [remove] = await claim(authority, "worker-removal-after-reconcile", 1);
  assert.equal(remove.action, "remove");
  const failedRemove = await workerTx(authority, async (client) => (await client.query(
    "SELECT lawos_email_dms.fail_outlook_desktop_assignment_job($1,$2::jsonb,1,100) AS value",
    [authority.tenantId, JSON.stringify({
      outbox_id: remove.outbox_id,
      worker_id: "worker-removal-after-reconcile",
      lease_token: remove.lease_token,
      error_code: "REMOTE_REJECTED",
      failure_certainty: "definitive_not_committed",
      permanent: true,
      non_commit_proof: null,
    })],
  )).rows[0].value);
  assert.equal(failedRemove.outcome, "retry");
  assert.equal(failedRemove.job.escalation_count, 1);
  await authority.observerPool.query(
    `SELECT pg_sleep(GREATEST(0,EXTRACT(EPOCH FROM
       ((SELECT available_at
           FROM lawos_email_dms.outlook_desktop_assignment_outbox
          WHERE tenant_id=$1 AND outbox_id=$2)-clock_timestamp()))))`,
    [authority.tenantId, remove.outbox_id],
  );
  assert.deepEqual(await claim(authority, "worker-removal-exhaustion", 1), []);
  const deadLetter = (await authority.observerPool.query(
    `SELECT status,retry_epoch,retry_epoch_attempt_count,escalation_count
       FROM lawos_email_dms.outlook_desktop_assignment_outbox
      WHERE tenant_id=$1 AND outbox_id=$2`,
    [authority.tenantId, remove.outbox_id],
  )).rows[0];
  assert.equal(deadLetter.status, "dead_letter");
  const recovered = await workerTx(authority, async (client) => (await client.query(
    "SELECT lawos_email_dms.recover_outlook_desktop_assignment_removals($1,10) AS value",
    [authority.tenantId],
  )).rows[0].value);
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].retry_epoch, deadLetter.retry_epoch + 1);
  assert.equal(recovered[0].retry_epoch_attempt_count, 0);
  assert.equal(recovered[0].escalation_count, deadLetter.escalation_count + 1);
  const [retry] = await claim(authority, "worker-removal-retry", 1);
  assert.equal(retry.action, "remove");
  assert.equal((await begin(authority, retry, "worker-removal-retry")).provider_call_allowed, true);
  assert.equal(JSON.parse(await completeText(
    authority,
    retry,
    "worker-removal-retry",
    false,
    "mandatory-remove-complete",
  )).outcome, "completed");
});
