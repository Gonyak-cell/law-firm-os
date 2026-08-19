import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  authorizeAndRegister,
  authorizeLifecycle,
  createOutlookAssignmentAuthorityFixture,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import { roleQuery } from "./support/postgres-outlook-desktop-positive-role-fixture.js";

const RELEASE_LOCK_DOMAIN = "outlook-release";

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function advisoryKey(authority, parts) {
  return (await authority.observerPool.query(
    "SELECT hashtextextended(array_to_string($1::text[],chr(31)),0)::text AS value",
    [parts],
  )).rows[0].value;
}

async function waitForLockState(authority, pid, expectations, label) {
  const tuples = expectations.map((_, index) =>
    `($${index * 2 + 2}::bigint,$${index * 2 + 3}::text)`).join(",");
  const values = [pid, ...expectations.flatMap(({ key, state }) => [key, state])];
  const deadline = Date.now() + 3_000;
  let observations;
  do {
    const result = await authority.observerPool.query(
      `WITH expected(advisory_key,expected_state) AS (VALUES ${tuples}),
       parts AS (
         SELECT advisory_key,expected_state,
                ((advisory_key>>32)&4294967295)::oid AS classid,
                (advisory_key&4294967295)::oid AS objid
           FROM expected
       ), observed AS (
         SELECT parts.*,lock.pid,lock.mode,lock.granted,lock.waitstart
           FROM parts LEFT JOIN pg_locks AS lock
             ON lock.pid=$1 AND lock.locktype='advisory'
            AND lock.mode='ExclusiveLock' AND lock.objsubid=1
            AND lock.classid=parts.classid AND lock.objid=parts.objid
       )
       SELECT bool_and(CASE expected_state
                WHEN 'granted' THEN granted IS TRUE
                WHEN 'waiting' THEN granted IS FALSE
                WHEN 'absent' THEN pid IS NULL ELSE false END) AS ready,
              jsonb_agg(jsonb_build_object(
                'key',advisory_key::text,'expected',expected_state,'pid',pid,
                'mode',mode,'granted',granted,'waitstart',waitstart)
                ORDER BY advisory_key) AS observations
         FROM observed`,
      values,
    );
    observations = result.rows[0].observations;
    if (result.rows[0].ready) return observations;
    await delay(10);
  } while (Date.now() < deadline);
  const locks = (await authority.observerPool.query(
    `SELECT locktype,mode,granted,classid::text,objid::text,objsubid,waitstart
       FROM pg_locks WHERE pid=$1 ORDER BY locktype,mode,classid,objid`,
    [pid],
  )).rows;
  assert.fail(`${label} lock state timeout: ${JSON.stringify({ observations, locks })}`);
}

function observeOperation(pool, tenantId, statement, values) {
  const started = deferred();
  const attempts = [];
  const promise = withPostgresTransaction(
    pool,
    { tenant_id: tenantId, isolationLevel: "serializable" },
    async (client, { attempt }) => {
      attempts.push(attempt);
      const backendPid = (await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
      if (attempt === 1) started.resolve(backendPid);
      const value = (await client.query(statement, values)).rows[0]?.value;
      return { backend_pid: backendPid, value };
    },
  ).then(
    (result) => ({ ...result, terminal_at: process.hrtime.bigint() }),
    (error) => {
      error.terminal_at = process.hrtime.bigint();
      throw error;
    },
  );
  return { attempts, promise, started: started.promise };
}

async function holdFixtureAdvisoryBarrier(observerPool, key, unblock, started) {
  const client = await observerPool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    const pid = (await client.query("SELECT pg_backend_pid() AS pid")).rows[0].pid;
    await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [key]);
    started.resolve(pid);
    await unblock.promise;
    await client.query("COMMIT");
    transactionOpen = false;
    return pid;
  } finally {
    if (transactionOpen) await client.query("ROLLBACK").catch(() => {});
    client.release();
  }
}

function appState(authority) {
  return roleQuery(authority.appPool, authority.tenantId,
    "SELECT lawos_email_dms.read_outlook_desktop_assignment_state($1,$2,$3) AS value",
    [authority.tenantId, authority.principal.user_id, authority.principal.entra_subject_id]);
}

test("release lock commits before a concurrently waiting heartbeat", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-release-heartbeat-lock-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "61" });
  const registered = await authorizeAndRegister(authority, "release-heartbeat-lock");
  const heartbeat = await authorizeLifecycle(
    authority, registered, "heartbeat", 1, "release-heartbeat-lock",
  );
  const before = await appState(authority);
  const principalKey = await advisoryKey(authority, [
    authority.tenantId, authority.principal.user_id, authority.principal.entra_subject_id,
  ]);
  const releaseKey = await advisoryKey(authority, [
    authority.tenantId, RELEASE_LOCK_DOMAIN, authority.release.release_artifact_id,
  ]);
  const unblock = deferred();
  const blockerStarted = deferred();
  // Fixture-superuser barrier only; exact LOGIN pools remain runtime calls only.
  const blocker = holdFixtureAdvisoryBarrier(
    authority.observerPool, principalKey, unblock, blockerStarted,
  );
  const blockerPid = await blockerStarted.promise;
  await waitForLockState(authority, blockerPid, [
    { key: principalKey, state: "granted" },
  ], "principal blocker");

  const revocation = {
    release_artifact_id: authority.release.release_artifact_id,
    revocation_event_id: "release-heartbeat-lock-revoked-61",
    revocation_reason: "operator_rejected",
  };
  const revoke = observeOperation(
    authority.controlPool,
    authority.tenantId,
    "SELECT lawos_email_dms.revoke_outlook_desktop_release($1,$2,$3::jsonb) AS value",
    [authority.tenantId, "release-heartbeat-lock-revoke-61", JSON.stringify(revocation)],
  );
  const revokePid = await revoke.started;
  let heartbeatOperation;
  let outcomes;
  try {
    await waitForLockState(authority, revokePid, [
      { key: releaseKey, state: "granted" },
      { key: principalKey, state: "waiting" },
    ], "release revocation");
    heartbeatOperation = observeOperation(
      authority.appPool,
      authority.tenantId,
      "SELECT lawos_email_dms.heartbeat_outlook_desktop_installation($1,$2::jsonb) AS value",
      [authority.tenantId, JSON.stringify(heartbeat)],
    );
    const heartbeatPid = await heartbeatOperation.started;
    assert.notEqual(heartbeatPid, revokePid);
    assert.notEqual(heartbeatPid, blockerPid);
    await waitForLockState(authority, heartbeatPid, [
      { key: releaseKey, state: "waiting" },
      { key: principalKey, state: "absent" },
    ], "heartbeat release wait");
    unblock.resolve();
    await blocker;
    outcomes = await Promise.allSettled([revoke.promise, heartbeatOperation.promise]);
  } finally {
    unblock.resolve();
    await blocker.catch(() => {});
    if (!outcomes) {
      outcomes = await Promise.allSettled([
        revoke.promise,
        ...(heartbeatOperation ? [heartbeatOperation.promise] : []),
      ]);
    }
  }
  const [revoked, rejectedHeartbeat] = outcomes;
  assert.equal(revoked.status, "fulfilled");
  const revokedBody = JSON.parse(revoked.value.value);
  assert.equal(revokedBody.outcome, "revoked");
  assert.equal(rejectedHeartbeat.status, "rejected");
  assert.equal(rejectedHeartbeat.reason.code, "LAWOS_POSTGRES_OPERATION_FAILED");
  assert.equal(rejectedHeartbeat.reason.safe_error_code, "POSTGRES_OPERATION_FAILED");
  assert.equal(rejectedHeartbeat.reason.postgres_code, "LOU01");
  assert.notEqual(rejectedHeartbeat.reason.postgres_code, "40P01");
  assert.deepEqual(revoke.attempts, [1]);
  assert.deepEqual(heartbeatOperation.attempts, [1, 2]);
  assert.ok(revoked.value.terminal_at < rejectedHeartbeat.reason.terminal_at);

  const state = await appState(authority);
  assert.equal(state.desired_assigned, false);
  assert.equal(state.provider_generation, before.provider_generation + 1);
  assert.ok(state.state_revision > before.state_revision);
  const current = await authority.observerPool.query(
    `SELECT count(*)::int AS current_removes,
            min(job.provider_intent_sha256) AS provider_intent_sha256,
            min(artifact.revoked_at) AS revoked_at,
            count(*) FILTER (WHERE lifecycle.consumed_at IS NOT NULL)::int AS consumed
       FROM lawos_email_dms.outlook_desktop_assignment_outbox AS job
       JOIN lawos_email_dms.outlook_desktop_release_artifacts AS artifact
         ON artifact.tenant_id=job.tenant_id AND artifact.release_artifact_id=$3
       LEFT JOIN lawos_email_dms.outlook_desktop_lifecycle_authorizations AS lifecycle
         ON lifecycle.tenant_id=job.tenant_id AND lifecycle.lifecycle_authorization_id=$4
      WHERE job.tenant_id=$1 AND job.user_id=$2 AND job.provider_generation=$5
        AND job.action='remove' AND NOT job.desired_assigned`,
    [authority.tenantId, authority.principal.user_id, authority.release.release_artifact_id,
      heartbeat.lifecycle_authorization_id, state.provider_generation],
  );
  assert.equal(current.rows[0].current_removes, 1);
  assert.equal(current.rows[0].provider_intent_sha256, state.provider_intent_sha256);
  assert.equal(current.rows[0].consumed, 0);
  assert.equal(new Date(current.rows[0].revoked_at).getTime(), Date.parse(revokedBody.revoked_at));
});
