import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  authorizeAndRegister,
  createOutlookAssignmentAuthorityFixture,
  roleJsonCall,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import {
  expandedRoster,
  policyApproval,
} from "./support/postgres-outlook-desktop-positive-role-fixture.js";

function observe(pool, tenantId, statement, values) {
  const attempts = [];
  const retryCodes = [];
  const promise = withPostgresTransaction(
    pool,
    { tenant_id: tenantId, isolationLevel: "serializable" },
    async (client, { attempt }) => {
      attempts.push(attempt);
      try {
        return (await client.query(statement, values)).rows[0]?.value;
      } catch (error) {
        retryCodes.push(error?.code);
        throw error;
      }
    },
  );
  return { attempts, promise, retryCodes };
}

async function waitForAdvisoryWait(observer, queryNeedle) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    await observer.query("SELECT pg_stat_clear_snapshot()");
    const count = (await observer.query(
      `SELECT count(*)::int AS count FROM pg_stat_activity
        WHERE datname=current_database() AND pid<>pg_backend_pid()
          AND wait_event_type='Lock' AND wait_event='advisory'
          AND position($1 IN query)>0`,
      [queryNeedle],
    )).rows[0].count;
    if (count === 1) return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error(`expected one ${queryNeedle} advisory waiter`);
}

test("two-principal sweep and release revocation share lexical locks without deadlock", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-sweep-revoke-lock-a",
  });
  if (!authority) return;
  const canary = await seedCanaryPolicy(authority, { suffix: "81" });
  const expansion = await expandedRoster(authority, canary.roster, "sweep-revoke");
  await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "authorize_outlook_desktop_assignment_expansion",
    expansion.authorization,
  );
  await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "import_outlook_desktop_assignment_roster",
    expansion.roster,
  );
  const secondPrincipal = expansion.principals[1];
  const secondPolicy = await policyApproval(
    authority,
    expansion.roster,
    secondPrincipal,
    { revision: 1, suffix: "sweep-revoke" },
  );
  await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "approve_outlook_desktop_assignment_policy",
    secondPolicy,
  );
  const secondAuthority = Object.freeze({
    ...authority,
    principal: Object.freeze({ ...secondPrincipal }),
  });
  await Promise.all([
    authorizeAndRegister(authority, "sweep-revoke-canary"),
    authorizeAndRegister(secondAuthority, "sweep-revoke-expanded"),
  ]);
  const principals = (await authority.observerPool.query(
    `SELECT user_id,entra_subject_id
       FROM lawos_email_dms.outlook_desktop_assignment_states
      WHERE tenant_id=$1 ORDER BY user_id,entra_subject_id`,
    [authority.tenantId],
  )).rows;
  assert.equal(principals.length, 2);
  const firstKey = `${authority.tenantId}\x1f${principals[0].user_id}`
    + `\x1f${principals[0].entra_subject_id}`;
  const blocker = await authority.observerPool.connect();
  let open = false;
  let sweep;
  let revoke;
  try {
    await blocker.query("BEGIN");
    open = true;
    await blocker.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
      [firstKey],
    );
    sweep = observe(
      authority.workerPool,
      authority.tenantId,
      "SELECT lawos_email_dms.sweep_outlook_desktop_assignments($1,10) AS value",
      [authority.tenantId],
    );
    await waitForAdvisoryWait(blocker, "sweep_outlook_desktop_assignments");
    const revocation = {
      release_artifact_id: authority.release.release_artifact_id,
      revocation_event_id: "sweep-revoke-event-81",
      revocation_reason: "operator_rejected",
    };
    revoke = observe(
      authority.controlPool,
      authority.tenantId,
      "SELECT lawos_email_dms.revoke_outlook_desktop_release($1,$2,$3::jsonb) AS value",
      [authority.tenantId, "sweep-revoke-request-81", JSON.stringify(revocation)],
    );
    await waitForAdvisoryWait(blocker, "revoke_outlook_desktop_release");
    await blocker.query("COMMIT");
    open = false;
    const outcomes = await Promise.allSettled([sweep.promise, revoke.promise]);
    assert.deepEqual(outcomes.map(({ status }) => status), ["fulfilled", "fulfilled"]);
    assert.deepEqual(sweep.attempts, [1]);
    assert.deepEqual(sweep.retryCodes, []);
    assert.deepEqual(revoke.attempts, [1, 2]);
    assert.deepEqual(revoke.retryCodes, ["40001"]);
    assert.equal(revoke.retryCodes.includes("40P01"), false);
    assert.equal(JSON.parse(outcomes[1].value).projected_principal_count, 2);
  } finally {
    if (open) await blocker.query("ROLLBACK").catch(() => {});
    blocker.release();
    await Promise.allSettled([sweep?.promise, revoke?.promise].filter(Boolean));
  }
  const final = (await authority.observerPool.query(
    `SELECT count(*) FILTER (WHERE NOT state.desired_assigned)::int AS denied,
            count(*) FILTER (WHERE action='remove')::int AS removes
       FROM lawos_email_dms.outlook_desktop_assignment_states AS state
       LEFT JOIN lawos_email_dms.outlook_desktop_assignment_outbox AS job
         ON job.tenant_id=state.tenant_id AND job.user_id=state.user_id
        AND job.entra_subject_id=state.entra_subject_id
        AND job.provider_generation=state.provider_generation
        AND job.provider_intent_sha256=state.provider_intent_sha256
      WHERE state.tenant_id=$1`,
    [authority.tenantId],
  )).rows[0];
  assert.deepEqual(final, { denied: 2, removes: 2 });
});
