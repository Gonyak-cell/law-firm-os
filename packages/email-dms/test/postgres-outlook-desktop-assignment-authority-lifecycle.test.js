import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  authorizeLifecycle,
  authorizeAndRegister,
  createOutlookAssignmentAuthorityFixture,
  prepareRegistration,
  roleJsonCall,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";

async function readState(authority) {
  return withPostgresTransaction(
    authority.appPool,
    { tenant_id: authority.tenantId },
    async (client) => (await client.query(
      "SELECT lawos_email_dms.read_outlook_desktop_assignment_state($1,$2,$3) AS value",
      [authority.tenantId, authority.principal.user_id,
        authority.principal.entra_subject_id],
    )).rows[0].value,
  );
}

test("exact control, verifier, and app roles atomically register one trusted canary installation", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t);
  if (!authority) return;
  await seedCanaryPolicy(authority);
  const registered = await authorizeAndRegister(authority);
  assert.equal(registered.result.response_status, 201);
  assert.equal(registered.result.body.outcome, "registered");
  const replay = await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "register_outlook_desktop_installation",
    registered.registration,
  );
  assert.deepEqual(replay, registered.result);
  const state = await readState(authority);
  assert.equal(state.desired_assigned, true);
  assert.equal(Number(state.active_trusted_install_count), 1);
  assert.equal(Number(state.provider_generation), 1);
  const counts = await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_installations) AS installations,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_activation_authorizations WHERE consumed_at IS NOT NULL) AS activations,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations WHERE consumed_at IS NOT NULL) AS lifecycle_receipts,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_installation_release_bindings) AS bindings,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_assignment_outbox) AS jobs`,
  );
  assert.deepEqual(counts.rows[0], {
    installations: 1,
    activations: 1,
    lifecycle_receipts: 1,
    bindings: 1,
    jobs: 1,
  });
});

test("multiple exact installations retain access until the last authorized retirement", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-assignment-multiple-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority);
  const [left, right] = await Promise.all([
    authorizeAndRegister(authority, "left"),
    authorizeAndRegister(authority, "right"),
  ]);
  let state = await readState(authority);
  assert.equal(state.desired_assigned, true);
  assert.equal(Number(state.active_trusted_install_count), 2);
  assert.equal(Number(state.provider_generation), 1);

  const heartbeat = await authorizeLifecycle(authority, left, "heartbeat", 1, "left-1");
  const heartbeatResult = await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "heartbeat_outlook_desktop_installation",
    heartbeat,
  );
  assert.equal(heartbeatResult.body.installation.state_version, 2);
  assert.deepEqual(await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "heartbeat_outlook_desktop_installation",
    heartbeat,
  ), heartbeatResult);

  const retireLeft = await authorizeLifecycle(authority, left, "retire", 2, "left-2");
  await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "retire_outlook_desktop_installation",
    retireLeft,
  );
  state = await readState(authority);
  assert.equal(state.desired_assigned, true);
  assert.equal(Number(state.active_trusted_install_count), 1);

  const retireRight = await authorizeLifecycle(authority, right, "retire", 1, "right-1");
  const retired = await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "retire_outlook_desktop_installation",
    retireRight,
  );
  assert.deepEqual(await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "retire_outlook_desktop_installation",
    retireRight,
  ), retired);
  state = await readState(authority);
  assert.equal(state.desired_assigned, false);
  assert.equal(Number(state.active_trusted_install_count), 0);
  assert.equal(Number(state.provider_generation), 2);
  const jobs = await authority.observerPool.query(
    "SELECT action FROM lawos_email_dms.outlook_desktop_assignment_outbox ORDER BY provider_generation",
  );
  assert.deepEqual(jobs.rows, [{ action: "add" }, { action: "remove" }]);
});

test("a pending protected retire intent fences a racing heartbeat and retirement wins", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-assignment-retire-race-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority);
  const registered = await authorizeAndRegister(authority, "race");
  const heartbeat = await authorizeLifecycle(authority, registered, "heartbeat", 1, "race-heartbeat");
  const retirement = await authorizeLifecycle(authority, registered, "retire", 1, "race-retire");
  await assert.rejects(roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "heartbeat_outlook_desktop_installation",
    heartbeat,
  ));
  const retired = await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "retire_outlook_desktop_installation",
    retirement,
  );
  assert.equal(retired.body.installation.status, "retired");
  assert.equal((await readState(authority)).desired_assigned, false);
});

test("registration recomputes canonical SPKI and rejects a substituted public key atomically", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-assignment-spki-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority);
  const prepared = await prepareRegistration(authority, "original");
  const substitute = generateKeyPairSync("ed25519").publicKey.export({
    type: "spki",
    format: "der",
  });
  const changed = {
    ...prepared.registration,
    installation_id: "odi_assignment_device_substitute01",
    idempotency_key: "idempotency-register-substitute",
    request_id: "request-register-substitute",
    event_id: "event-register-substitute",
    device_public_key: substitute.toString("base64"),
  };
  await assert.rejects(roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "register_outlook_desktop_installation",
    changed,
  ));
  const digest = createHash("sha256").update(substitute).digest("hex");
  assert.notEqual(digest, changed.device_key_fingerprint);
  const counts = await authority.observerPool.query(
    `SELECT count(*)::int AS installations,
            count(*) FILTER (WHERE device_key_fingerprint=$1)::int AS substituted
       FROM lawos_email_dms.outlook_desktop_installations`,
    [digest],
  );
  const securityCounts = await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_installations) AS installations,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_activation_authorizations WHERE consumed_at IS NOT NULL) AS activations,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations WHERE consumed_at IS NOT NULL) AS lifecycle_receipts,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_installation_release_bindings) AS bindings,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_installation_audit_events) AS audits,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_assignment_outbox) AS jobs`,
  );
  assert.deepEqual(counts.rows[0], { installations: 0, substituted: 0 });
  assert.deepEqual(securityCounts.rows[0], {
    installations: 0,
    activations: 0,
    lifecycle_receipts: 0,
    bindings: 0,
    audits: 0,
    jobs: 0,
  });
});
