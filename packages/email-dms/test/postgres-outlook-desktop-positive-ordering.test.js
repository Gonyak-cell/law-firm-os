import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

import {
  authorityDigest,
  authorizeAndRegister,
  authorizeLifecycle,
  createOutlookAssignmentAuthorityFixture,
  roleJsonCall,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import { roleQuery } from "./support/postgres-outlook-desktop-positive-role-fixture.js";

function appState(authority) {
  return roleQuery(authority.appPool, authority.tenantId,
    "SELECT lawos_email_dms.read_outlook_desktop_assignment_state($1,$2,$3) AS value",
    [authority.tenantId, authority.principal.user_id, authority.principal.entra_subject_id]);
}

function workerCall(authority, statement, values) {
  return roleQuery(authority.workerPool, authority.tenantId, statement, values);
}

function claim(authority, workerId) {
  return workerCall(authority,
    "SELECT lawos_email_dms.claim_outlook_desktop_assignment_jobs($1,$2,10,1000,5) AS value",
    [authority.tenantId, workerId]);
}

function begin(authority, job, workerId) {
  return workerCall(authority,
    "SELECT lawos_email_dms.begin_outlook_desktop_assignment_dispatch($1,$2,$3,$4) AS value",
    [authority.tenantId, job.outbox_id, workerId, job.lease_token]);
}

function complete(authority, job, workerId, observedAssigned, suffix) {
  return workerCall(authority,
    "SELECT lawos_email_dms.complete_outlook_desktop_assignment_job($1,$2::jsonb) AS value",
    [authority.tenantId, JSON.stringify({
      outbox_id: job.outbox_id, worker_id: workerId, lease_token: job.lease_token,
      observed_assigned: observedAssigned, result_code: `ordering-${suffix}`,
      readback: {
        schema_version: "lawos.outlook-assignment-authoritative-readback.v1",
        request_terminal: true, propagation_stabilized: true,
        receipt_sha256: authorityDigest(`ordering-${suffix}`),
      },
    })]);
}

async function fixtureOnlyExpireRegisteredLeasePrerequisite(authority, installationId) {
  const values = [authority.tenantId, installationId];
  await assert.rejects(roleQuery(authority.appPool, authority.tenantId,
    `UPDATE lawos_email_dms.outlook_desktop_installations
        SET lease_expires_at=last_seen_at+interval '1 millisecond'
      WHERE tenant_id=$1 AND installation_id=$2 AND retired_at IS NULL
      RETURNING lease_expires_at AS value`, values),
  (error) => error?.code === "LAWOS_POSTGRES_ACCESS_DENIED" && error?.postgres_code === "42501");
  const snapshotSql = `SELECT jsonb_build_object('rows',COALESCE(jsonb_agg(
    CASE WHEN tenant_id=$1 AND installation_id=$2 THEN to_jsonb(row)-'lease_expires_at'
         ELSE to_jsonb(row) END ORDER BY tenant_id,installation_id),'[]'::jsonb))::text AS value
    FROM lawos_email_dms.outlook_desktop_installations AS row`;
  const before = (await authority.observerPool.query(snapshotSql, values)).rows[0].value;
  const lastSeenAt = (await authority.observerPool.query(
    `SELECT last_seen_at FROM lawos_email_dms.outlook_desktop_installations
      WHERE tenant_id=$1 AND installation_id=$2`, values)).rows[0].last_seen_at;
  const leasePrerequisiteAt = new Date(new Date(lastSeenAt).getTime() + 1).toISOString();
  await delay(Math.max(0, Date.parse(leasePrerequisiteAt) - Date.now()) + 5);
  // Privileged synthetic chronology setup only; never a runtime authority path.
  const result = await authority.leasePrerequisitePool.query(
    `UPDATE lawos_email_dms.outlook_desktop_installations
        SET lease_expires_at=$3
      WHERE tenant_id=$1 AND installation_id=$2 AND retired_at IS NULL
      RETURNING lease_expires_at,date_trunc('milliseconds',clock_timestamp()) AS database_now`,
    [...values, leasePrerequisiteAt],
  );
  assert.equal(result.rowCount, 1);
  assert.ok(result.rows[0].lease_expires_at <= result.rows[0].database_now);
  assert.equal((await authority.observerPool.query(snapshotSql, values)).rows[0].value, before);
}

async function outboxRows(authority) {
  return (await authority.observerPool.query(
    `SELECT provider_generation::int,action,provider_intent_sha256,status,remote_commit_state
       FROM lawos_email_dms.outlook_desktop_assignment_outbox
      WHERE tenant_id=$1 AND user_id=$2 ORDER BY provider_generation`,
    [authority.tenantId, authority.principal.user_id],
  )).rows;
}

test("single fixture-expired installation projects generation two remove without sweep", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-ordering-single-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "51" });
  const registered = await authorizeAndRegister(authority, "ordering-single");
  const installationId = registered.registration.installation_id;
  await fixtureOnlyExpireRegisteredLeasePrerequisite(authority, installationId);
  const state = await appState(authority);
  assert.equal(state.desired_assigned, false);
  assert.equal(state.active_trusted_install_count, 0);
  assert.equal(state.provider_generation, 2);
  const rows = await outboxRows(authority);
  assert.deepEqual(rows.map(({ provider_generation, action }) => ({ provider_generation, action })), [
    { provider_generation: 1, action: "add" },
    { provider_generation: 2, action: "remove" },
  ]);
  assert.equal(rows[1].provider_intent_sha256, state.provider_intent_sha256);
});

test("one expired and one live installation retain assignment without remove", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-ordering-two-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "52" });
  const expired = await authorizeAndRegister(authority, "ordering-expired");
  const live = await authorizeAndRegister(authority, "ordering-live");
  await fixtureOnlyExpireRegisteredLeasePrerequisite(
    authority, expired.registration.installation_id,
  );
  const state = await appState(authority);
  assert.equal(state.desired_assigned, true);
  assert.equal(state.active_trusted_install_count, 1);
  assert.equal(state.provider_generation, 1);
  const current = await roleQuery(authority.appPool, authority.tenantId,
    "SELECT lawos_email_dms.read_current_outlook_desktop_installation($1,$2,$3) AS value",
    [authority.tenantId, authority.principal.user_id, authority.principal.entra_subject_id], true);
  assert.equal(current.installation_id, live.registration.installation_id);
  assert.equal((await outboxRows(authority)).filter(({ action }) => action === "remove").length, 0);
});

test("resumed heartbeat orders generation three add behind generation two readback", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-ordering-resume-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "53" });
  const registered = await authorizeAndRegister(authority, "ordering-resume");
  const [add] = await claim(authority, "ordering-add");
  assert.equal((await begin(authority, add, "ordering-add")).provider_call_allowed, true);
  assert.equal((await complete(authority, add, "ordering-add", true, "add")).outcome, "completed");
  await fixtureOnlyExpireRegisteredLeasePrerequisite(
    authority, registered.registration.installation_id,
  );
  assert.equal((await appState(authority)).provider_generation, 2);
  const [remove] = await claim(authority, "ordering-remove-unknown");
  assert.equal((await begin(authority, remove, "ordering-remove-unknown")).provider_call_allowed, true);
  const ambiguous = await workerCall(authority,
    "SELECT lawos_email_dms.fail_outlook_desktop_assignment_job($1,$2::jsonb,5,100) AS value",
    [authority.tenantId, JSON.stringify({
      outbox_id: remove.outbox_id, worker_id: "ordering-remove-unknown",
      lease_token: remove.lease_token, error_code: "REMOTE_COMMIT_UNKNOWN",
      failure_certainty: "ambiguous", permanent: false, non_commit_proof: null,
    })]);
  assert.equal(ambiguous.outcome, "ambiguous");
  const heartbeat = await authorizeLifecycle(authority, registered, "heartbeat", 1, "ordering-resume");
  assert.equal((await roleJsonCall(authority.appPool, authority.tenantId,
    "heartbeat_outlook_desktop_installation", heartbeat)).body.installation.state_version, 2);
  const resumed = await appState(authority);
  assert.equal(resumed.desired_assigned, true);
  assert.equal(resumed.provider_generation, 3);
  await delay(Math.max(0, Date.parse(ambiguous.job.available_at) - Date.now()) + 150);
  const blocked = await claim(authority, "ordering-remove-readback");
  assert.equal(blocked.length, 1);
  assert.equal(blocked[0].provider_generation, 2);
  assert.equal(blocked[0].dispatch_mode, "readback_only");
  assert.equal((await begin(authority, blocked[0], "ordering-remove-readback")).provider_call_allowed, false);
  assert.equal((await complete(
    authority, blocked[0], "ordering-remove-readback", false, "remove-readback",
  )).outcome, "completed");
  const [resumedAdd] = await claim(authority, "ordering-resumed-add");
  assert.equal(resumedAdd.provider_generation, 3);
  assert.equal(resumedAdd.action, "add");
  assert.equal((await begin(authority, resumedAdd, "ordering-resumed-add")).provider_call_allowed, true);
  assert.equal((await complete(
    authority, resumedAdd, "ordering-resumed-add", true, "resumed-add",
  )).outcome, "completed");
});
