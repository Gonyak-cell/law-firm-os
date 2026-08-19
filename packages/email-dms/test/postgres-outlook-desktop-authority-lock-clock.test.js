import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  authorizeAndRegister,
  createOutlookAssignmentAuthorityFixture,
  prepareRegistration,
  roleJsonCall,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import { runBehindAdvisoryBarrier } from "./support/postgres-advisory-concurrency.js";
import {
  expandedRoster,
  policyApproval,
} from "./support/postgres-outlook-desktop-positive-role-fixture.js";

function principalKey(authority) {
  return `${authority.tenantId}\x1f${authority.principal.user_id}`
    + `\x1f${authority.principal.entra_subject_id}`;
}

function roleQuery(pool, tenantId, statement, values) {
  return withPostgresTransaction(
    pool,
    { tenant_id: tenantId, isolationLevel: "serializable" },
    async (client) => (await client.query(statement, values)).rows[0]?.value,
  );
}

async function waitPast(client, instant) {
  await client.query(
    `SELECT pg_sleep(GREATEST(0,EXTRACT(EPOCH FROM
      ($1::timestamptz-clock_timestamp())))+0.025)`,
    [instant],
  );
}

async function blockedCall(authority, { call, instant, lockKey, queryNeedle }) {
  const result = await runBehindAdvisoryBarrier({
    adminPool: authority.observerPool,
    calls: [call],
    lockKey,
    queryNeedle,
    settled: true,
    beforeRelease: ({ blocker }) => waitPast(blocker, instant),
  });
  assert.equal(result.waiter_count, 1);
  return result.results[0];
}

async function setShortInstallationLease(authority, installationId) {
  const lease = (await authority.leasePrerequisitePool.query(
    `UPDATE lawos_email_dms.outlook_desktop_installations
        SET lease_expires_at=date_trunc('milliseconds',clock_timestamp())+
          interval '1200 milliseconds'
      WHERE tenant_id=$1 AND installation_id=$2
      RETURNING lease_expires_at`,
    [authority.tenantId, installationId],
  )).rows[0].lease_expires_at;
  return new Date(lease).toISOString();
}

test("activation evaluates release validity after the release lock", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-activation-lock-clock-a",
    releaseLifetimeMilliseconds: 5_000,
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "60" });
  const prepared = await prepareRegistration(authority, "lock-clock", {
    authorizeActivation: false,
    lifetimeMilliseconds: 4_000,
    mintLifecycle: false,
  });
  const payload = prepared.activationAuthorization;
  const result = await blockedCall(authority, {
    lockKey: `${authority.tenantId}\x1foutlook-release\x1f${authority.release.release_artifact_id}`,
    queryNeedle: "authorize_outlook_desktop_activation",
    instant: authority.release.valid_until,
    call: () => roleJsonCall(authority.controlPool, authority.tenantId,
      "authorize_outlook_desktop_activation", payload),
  });
  assert.equal(result.status, "rejected");
  assert.equal((await authority.observerPool.query(
    `SELECT count(*)::int AS count
       FROM lawos_email_dms.outlook_desktop_activation_authorizations
      WHERE tenant_id=$1 AND activation_authorization_id=$2`,
    [authority.tenantId, payload.activation_reference],
  )).rows[0].count, 0);
});

test("expanded roster consumption evaluates authorization expiry after its locks", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-roster-lock-clock-a",
  });
  if (!authority) return;
  const canary = await seedCanaryPolicy(authority, { suffix: "61" });
  const expanded = await expandedRoster(authority, canary.roster, "lock-clock", {
    authorizationLifetimeMilliseconds: 1_200,
  });
  await roleJsonCall(authority.controlPool, authority.tenantId,
    "authorize_outlook_desktop_assignment_expansion", expanded.authorization);
  const result = await blockedCall(authority, {
    lockKey: `${authority.tenantId}\x1foutlook-assignment-expansion`,
    queryNeedle: "import_outlook_desktop_assignment_roster",
    instant: expanded.authorization.valid_until,
    call: () => roleJsonCall(authority.controlPool, authority.tenantId,
      "import_outlook_desktop_assignment_roster", expanded.roster),
  });
  assert.equal(result.status, "rejected");
  const state = (await authority.observerPool.query(
    `SELECT auth.consumed_at,roster.roster_version
       FROM lawos_email_dms.outlook_desktop_assignment_expansion_authorizations AS auth
       LEFT JOIN lawos_email_dms.outlook_desktop_assignment_rosters AS roster
         ON roster.tenant_id=auth.tenant_id
        AND roster.roster_version=$3
      WHERE auth.tenant_id=$1
        AND auth.expansion_authorization_id=$2`,
    [authority.tenantId, expanded.authorization.expansion_authorization_id,
      expanded.roster.roster_version],
  )).rows[0];
  assert.deepEqual(state, { consumed_at: null, roster_version: null });
});

test("policy approval evaluates expiry after the principal lock", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-policy-lock-clock-a",
  });
  if (!authority) return;
  const canary = await seedCanaryPolicy(authority, { suffix: "62" });
  const now = Date.now();
  const approval = await policyApproval(
    authority,
    canary.roster,
    authority.principal,
    { revision: 63, suffix: "lock-clock", validUntil: new Date(now + 1_200).toISOString() },
  );
  const result = await blockedCall(authority, {
    lockKey: principalKey(authority),
    queryNeedle: "approve_outlook_desktop_assignment_policy",
    instant: approval.valid_until,
    call: () => roleJsonCall(authority.controlPool, authority.tenantId,
      "approve_outlook_desktop_assignment_policy", approval),
  });
  assert.equal(result.status, "rejected");
  const policy = (await authority.observerPool.query(
    `SELECT policy_revision::int FROM lawos_email_dms.outlook_desktop_assignment_policies
      WHERE tenant_id=$1 AND user_id=$2`,
    [authority.tenantId, authority.principal.user_id],
  )).rows[0];
  assert.deepEqual(policy, { policy_revision: 62 });
});

for (const operation of ["read", "sweep"]) {
  test(`${operation} projects lease expiry using a post-principal-lock clock`, async (t) => {
    const authority = await createOutlookAssignmentAuthorityFixture(t, {
      tenantId: `tenant-${operation}-lock-clock-a`,
    });
    if (!authority) return;
    await seedCanaryPolicy(authority, { suffix: operation === "read" ? "64" : "65" });
    const registered = await authorizeAndRegister(authority, operation);
    const leaseExpiresAt = await setShortInstallationLease(
      authority, registered.registration.installation_id,
    );
    const result = await blockedCall(authority, {
      lockKey: principalKey(authority),
      queryNeedle: operation === "read"
        ? "read_outlook_desktop_assignment_state"
        : "sweep_outlook_desktop_assignments",
      instant: leaseExpiresAt,
      call: () => operation === "read"
        ? roleQuery(authority.appPool, authority.tenantId,
          "SELECT lawos_email_dms.read_outlook_desktop_assignment_state($1,$2,$3) AS value",
          [authority.tenantId, authority.principal.user_id,
            authority.principal.entra_subject_id])
        : roleQuery(authority.workerPool, authority.tenantId,
          "SELECT lawos_email_dms.sweep_outlook_desktop_assignments($1,10) AS value",
          [authority.tenantId]),
    });
    assert.equal(result.status, "fulfilled");
    const snapshot = (await authority.observerPool.query(
      `SELECT state.desired_assigned,state.active_trusted_install_count::int,
              count(job.*) FILTER (WHERE job.action='remove')::int AS removes
         FROM lawos_email_dms.outlook_desktop_assignment_states AS state
         LEFT JOIN lawos_email_dms.outlook_desktop_assignment_outbox AS job
           ON job.tenant_id=state.tenant_id AND job.user_id=state.user_id
        WHERE state.tenant_id=$1 AND state.user_id=$2
        GROUP BY state.desired_assigned,state.active_trusted_install_count`,
      [authority.tenantId, authority.principal.user_id],
    )).rows[0];
    assert.deepEqual(snapshot, {
      desired_assigned: false,
      active_trusted_install_count: 0,
      removes: 1,
    });
  });
}
