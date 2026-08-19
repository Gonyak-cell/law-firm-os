import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import {
  authorizeAndRegister,
  authorizeLifecycle,
  createOutlookAssignmentAuthorityFixture,
  prepareRegistration,
  roleDatabaseNow,
  roleJsonCall,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import {
  assertTenantContextBoundary,
  policyApproval,
  preparedAuthorizationPayloads,
  roleQuery,
} from "./support/postgres-outlook-desktop-positive-role-fixture.js";
function appRead(authority, name, values) {
  return roleQuery(
    authority.appPool,
    authority.tenantId,
    `SELECT lawos_email_dms.${name}(${values.map((_, index) => `$${index + 1}`).join(",")}) AS value`,
    values,
    name !== "read_outlook_desktop_assignment_state",
  );
}
async function pausePast(timestamp) {
  await delay(Math.max(0, Date.parse(timestamp) - Date.now()) + 150);
}
test("verifier and app LOGIN roles enforce activation, lifecycle race, reads, and expiry projection", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-runtime-lifecycle-a",
  });
  if (!authority) return;
  const canary = await seedCanaryPolicy(authority, { suffix: "21" });
  const prepared = await prepareRegistration(authority, "positive21");
  const payloads = preparedAuthorizationPayloads(authority, prepared, "positive21");
  assert.deepEqual(await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "authorize_outlook_desktop_activation",
    payloads.activation,
  ), prepared.activation);
  await assert.rejects(roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "authorize_outlook_desktop_activation",
    { ...payloads.activation, local_measurement_evidence_sha256: "f".repeat(64) },
  ));
  assert.equal((await roleJsonCall(
    authority.verifierPool,
    authority.tenantId,
    "mint_outlook_desktop_lifecycle_verifier_receipt",
    payloads.verifier,
  )).outcome, "authorized");
  await assertTenantContextBoundary(authority.verifierPool, authority.tenantId,
    "lawos_outlook_lifecycle_verifier",
    "lawos_email_dms.mint_outlook_desktop_lifecycle_verifier_receipt(text,jsonb)",
    "SELECT lawos_email_dms.mint_outlook_desktop_lifecycle_verifier_receipt($1,$2::jsonb) AS value",
    [authority.tenantId, JSON.stringify(payloads.verifier)]);
  await assert.rejects(roleJsonCall(
    authority.verifierPool,
    authority.tenantId,
    "mint_outlook_desktop_lifecycle_verifier_receipt",
    { ...payloads.verifier, proof_receipt_sha256: "f".repeat(64) },
  ));
  let counts = (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_activation_authorizations) AS activations,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations) AS lifecycle,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_installations) AS installations`,
  )).rows[0];
  assert.deepEqual(counts, { activations: 1, lifecycle: 1, installations: 0 });
  const registered = await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "register_outlook_desktop_installation",
    prepared.registration,
  );
  assert.equal(registered.body.outcome, "registered");
  assert.deepEqual(await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "register_outlook_desktop_installation",
    prepared.registration,
  ), registered);
  await assertTenantContextBoundary(authority.appPool, authority.tenantId, "lawos_app",
    "lawos_email_dms.register_outlook_desktop_installation(text,jsonb)",
    "SELECT lawos_email_dms.register_outlook_desktop_installation($1,$2::jsonb) AS value", [authority.tenantId, JSON.stringify(prepared.registration)]);
  await assert.rejects(roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "register_outlook_desktop_installation",
    { ...prepared.registration, request_fingerprint: "f".repeat(64) },
  ));
  const principal = [authority.tenantId, authority.principal.user_id, authority.principal.entra_subject_id];
  assert.equal((await appRead(
    authority,
    "read_outlook_desktop_installation",
    [...principal, prepared.registration.installation_id],
  )).status, "active");
  assert.equal((await appRead(
    authority,
    "read_current_outlook_desktop_installation",
    principal,
  )).installation_id, prepared.registration.installation_id);
  assert.equal((await appRead(
    authority,
    "read_outlook_desktop_assignment_state",
    principal,
  )).desired_assigned, true);
  const shortUntil = new Date(Date.parse(
    await roleDatabaseNow(authority.controlPool, authority.tenantId),
  ) + 1_500).toISOString();
  const expiring = await policyApproval(authority, canary.roster, authority.principal, {
    revision: 22,
    suffix: "expiring",
    validUntil: shortUntil,
  });
  await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "approve_outlook_desktop_assignment_policy",
    expiring,
  );
  await pausePast(shortUntil);
  assert.equal((await appRead(
    authority,
    "read_current_outlook_desktop_installation",
    principal,
  )).status, "active");
  assert.equal((await appRead(
    authority,
    "read_outlook_desktop_assignment_state",
    principal,
  )).desired_assigned, false);
  const heartbeat = await authorizeLifecycle(authority, prepared, "heartbeat", 1, "positive21-hb1");
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
  const racingHeartbeat = await authorizeLifecycle(
    authority, prepared, "heartbeat", 2, "positive21-hb2",
  );
  const retirement = await authorizeLifecycle(
    authority, prepared, "retire", 2, "positive21-retire",
  );
  await assert.rejects(roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "heartbeat_outlook_desktop_installation",
    racingHeartbeat,
  ));
  const retired = await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "retire_outlook_desktop_installation",
    retirement,
  );
  assert.equal(retired.body.installation.status, "retired");
  assert.deepEqual(await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "retire_outlook_desktop_installation",
    retirement,
  ), retired);
  assert.equal((await appRead(
    authority,
    "read_outlook_desktop_installation",
    [...principal, prepared.registration.installation_id],
  )).status, "retired");
  counts = (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_installations) AS installations,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_activation_authorizations WHERE consumed_at IS NOT NULL) AS activations,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations WHERE consumed_at IS NOT NULL) AS lifecycle`,
  )).rows[0];
  assert.deepEqual(counts, { installations: 1, activations: 1, lifecycle: 3 });
});
test("release revocation immediately removes assignment authority but preserves retirement", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-runtime-revocation-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "41" });
  const registered = await authorizeAndRegister(authority, "positive41");
  const principal = [authority.tenantId, authority.principal.user_id,
    authority.principal.entra_subject_id];
  assert.equal((await appRead(
    authority, "read_outlook_desktop_assignment_state", principal,
  )).desired_assigned, true);
  const revocation = {
    release_artifact_id: authority.release.release_artifact_id,
    revocation_event_id: "positive-runtime-release-revoked-41",
    revocation_reason: "operator_rejected",
  };
  const revokedText = await roleQuery(
    authority.controlPool,
    authority.tenantId,
    "SELECT lawos_email_dms.revoke_outlook_desktop_release($1,$2,$3::jsonb) AS value",
    [authority.tenantId, "positive-runtime-release-revoke-41", JSON.stringify(revocation)],
  );
  assert.equal(JSON.parse(revokedText).projected_principal_count, 1);
  assert.equal((await appRead(
    authority, "read_outlook_desktop_assignment_state", principal,
  )).desired_assigned, false);
  const removal = (await authority.observerPool.query(
    `SELECT state.desired_assigned,state.provider_generation,state.provider_intent_sha256,
            job.action,job.provider_generation AS job_generation,
            job.provider_intent_sha256 AS job_intent
       FROM lawos_email_dms.outlook_desktop_assignment_states AS state
       JOIN lawos_email_dms.outlook_desktop_assignment_outbox AS job
         ON job.tenant_id=state.tenant_id AND job.user_id=state.user_id
        AND job.provider_generation=state.provider_generation
      WHERE state.tenant_id=$1 AND state.user_id=$2`,
    [authority.tenantId, authority.principal.user_id],
  )).rows[0];
  assert.equal(removal.desired_assigned, false);
  assert.equal(removal.action, "remove");
  assert.equal(removal.job_generation, removal.provider_generation);
  assert.equal(removal.job_intent, removal.provider_intent_sha256);
  await assert.rejects(authorizeLifecycle(
    authority, registered, "heartbeat", 1, "positive41-heartbeat",
  ), (error) => error?.code === "LAWOS_POSTGRES_OPERATION_FAILED"
    && error?.safe_error_code === "POSTGRES_OPERATION_FAILED"
    && error?.postgres_code === "LOU01");
  const retirement = await authorizeLifecycle(
    authority, registered, "retire", 1, "positive41-retire",
  );
  assert.equal((await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "retire_outlook_desktop_installation",
    retirement,
  )).body.installation.status, "retired");
});
