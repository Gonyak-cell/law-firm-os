import assert from "node:assert/strict";
import test from "node:test";

import { runBehindAdvisoryBarrier } from "./support/postgres-advisory-concurrency.js";
import {
  authorityBinding,
  authorityDigest,
  authorizeAndRegister,
  createOutlookAssignmentAuthorityFixture,
  prepareLifecycleAuthorization,
  roleDatabaseNow,
  roleJsonCall,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import {
  expandedRoster,
  policyApproval,
  roleQuery,
} from "./support/postgres-outlook-desktop-positive-role-fixture.js";

async function canaryRoster(authority, suffix) {
  const now = Date.parse(await roleDatabaseNow(authority.controlPool, authority.tenantId));
  const approvedAt = new Date(now - 1_000).toISOString();
  const validUntil = new Date(now + 3_600_000).toISOString();
  const rosterVersion = `positive-concurrent-roster-${suffix}`;
  const ownerApproval = authorityDigest(`positive-concurrent-owner-${suffix}`);
  const memberBinding = authorityBinding(
    "lawos.outlook-desktop-assignment-roster-member.v1",
    [authority.tenantId, rosterVersion, authority.principal.user_id,
      authority.principal.entra_subject_id],
  );
  const rosterBinding = authorityBinding(
    "lawos.outlook-desktop-assignment-roster.v1",
    [authority.tenantId, rosterVersion, "jwsuh_canary", "none", ownerApproval,
      approvedAt, approvedAt, validUntil, memberBinding],
  );
  return Object.freeze({
    roster_version: rosterVersion,
    rollout_stage: "jwsuh_canary",
    roster_binding_sha256: rosterBinding,
    owner_approval_sha256: ownerApproval,
    expansion_authorization_id: null,
    approved_at: approvedAt,
    valid_from: approvedAt,
    valid_until: validUntil,
    members: [{ ...authority.principal, member_binding_sha256: memberBinding }],
  });
}

function rosterText(authority, roster) {
  return roleQuery(
    authority.controlPool,
    authority.tenantId,
    "SELECT lawos_email_dms.import_outlook_desktop_assignment_roster($1,$2::jsonb)::text AS value",
    [authority.tenantId, JSON.stringify(roster)],
  );
}

function workerCall(authority, statement, values) {
  return roleQuery(authority.workerPool, authority.tenantId, statement, values);
}

test("two control backends import one canary roster and replay identical bytes", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-concurrent-roster-a",
  });
  if (!authority) return;
  const roster = await canaryRoster(authority, "81");
  // Read-only fixture observer holds the advisory key as a deterministic test barrier.
  const raced = await runBehindAdvisoryBarrier({
    adminPool: authority.observerPool,
    lockKey: `${authority.tenantId}\x1foutlook-assignment-roster`,
    queryNeedle: "import_outlook_desktop_assignment_roster",
    calls: [() => rosterText(authority, roster), () => rosterText(authority, roster)],
  });
  assert.equal(raced.waiter_count, 2);
  assert.equal(raced.values[0], raced.values[1]);
  assert.equal(JSON.parse(raced.values[0]).outcome, "imported");
  assert.equal(await rosterText(authority, roster), raced.values[0]);
  const counts = (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int FROM
         lawos_email_dms.outlook_desktop_assignment_canary_principals
        WHERE tenant_id=$1) AS canaries,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_assignment_rosters
        WHERE tenant_id=$1 AND roster_version=$2) AS rosters,
       (SELECT count(*)::int FROM
         lawos_email_dms.outlook_desktop_assignment_roster_members
        WHERE tenant_id=$1 AND roster_version=$2) AS members`,
    [authority.tenantId, roster.roster_version],
  )).rows[0];
  assert.deepEqual(counts, { canaries: 1, rosters: 1, members: 1 });
});

test("two worker backends complete one outbox job with one exact receipt", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-concurrent-completion-a",
  });
  if (!authority) return;
  await seedCanaryPolicy(authority, { suffix: "82" });
  await authorizeAndRegister(authority, "concurrent-completion");
  const workerId = "positive-concurrent-completion-worker";
  const [job] = await workerCall(authority,
    "SELECT lawos_email_dms.claim_outlook_desktop_assignment_jobs($1,$2,1,5000,5) AS value",
    [authority.tenantId, workerId]);
  assert.equal((await workerCall(authority,
    "SELECT lawos_email_dms.begin_outlook_desktop_assignment_dispatch($1,$2,$3,$4) AS value",
    [authority.tenantId, job.outbox_id, workerId, job.lease_token]
  )).provider_call_allowed, true);
  const completion = {
    outbox_id: job.outbox_id,
    worker_id: workerId,
    lease_token: job.lease_token,
    observed_assigned: true,
    result_code: "positive-concurrent-completion",
    readback: {
      schema_version: "lawos.outlook-assignment-authoritative-readback.v1",
      request_terminal: true,
      propagation_stabilized: true,
      receipt_sha256: authorityDigest("positive-concurrent-completion"),
    },
  };
  const completeText = () => workerCall(authority,
    "SELECT lawos_email_dms.complete_outlook_desktop_assignment_job($1,$2::jsonb)::text AS value",
    [authority.tenantId, JSON.stringify(completion)]);
  const completed = await runBehindAdvisoryBarrier({
    adminPool: authority.observerPool,
    lockKey: `${authority.tenantId}\x1foutlook-assignment-completion-request\x1f${job.outbox_id}`,
    queryNeedle: "complete_outlook_desktop_assignment_job",
    calls: [completeText, completeText],
  });
  assert.equal(completed.waiter_count, 2);
  assert.equal(completed.values[0], completed.values[1]);
  const stored = (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_assignment_outbox_receipts
         WHERE tenant_id=$1 AND outbox_id=$2) AS receipts,
       (SELECT response_text FROM lawos_email_dms.outlook_desktop_assignment_outbox_receipts
         WHERE tenant_id=$1 AND outbox_id=$2) AS response_text,
       job.status,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_assignment_audit_events
         WHERE tenant_id=job.tenant_id AND provider_generation=job.provider_generation
           AND provider_intent_sha256=job.provider_intent_sha256
           AND event_type='outbox_completed') AS audits
      FROM lawos_email_dms.outlook_desktop_assignment_outbox AS job
      WHERE job.tenant_id=$1 AND job.outbox_id=$2`,
    [authority.tenantId, job.outbox_id],
  )).rows[0];
  assert.deepEqual(stored, {
    receipts: 1,
    response_text: completed.values[0],
    status: "completed",
    audits: 1,
  });
});

test("same lifecycle authorization ID serializes changed principals as LLC01", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-concurrent-lifecycle-a",
  });
  if (!authority) return;
  const canary = await seedCanaryPolicy(authority, { suffix: "83" });
  const expansion = await expandedRoster(
    authority,
    canary.roster,
    "concurrent-lifecycle",
  );
  const other = Object.freeze({
    ...authority,
    principal: Object.freeze({ ...expansion.principals[1] }),
  });
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
  await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "approve_outlook_desktop_assignment_policy",
    await policyApproval(authority, expansion.roster, other.principal, {
      revision: 1,
      suffix: "concurrent-lifecycle",
    }),
  );
  const lifecycleId = "lifecycle-register-concurrent-shared";
  const leftRegistration = await authorizeAndRegister(
    authority,
    "concurrent-lifecycle-left",
  );
  const rightRegistration = await authorizeAndRegister(
    other,
    "concurrent-lifecycle-right",
  );
  const left = await prepareLifecycleAuthorization(
    authority,
    leftRegistration,
    "heartbeat",
    1,
    "concurrent-lifecycle-left",
    { lifecycleAuthorizationId: lifecycleId },
  );
  const right = await prepareLifecycleAuthorization(
    other,
    rightRegistration,
    "heartbeat",
    1,
    "concurrent-lifecycle-right",
    { lifecycleAuthorizationId: lifecycleId },
  );
  const leftPayload = left.authorization;
  const rightPayload = right.authorization;
  const verifierText = (payload) => roleQuery(authority.verifierPool, authority.tenantId,
    "SELECT lawos_email_dms.mint_outlook_desktop_lifecycle_verifier_receipt($1,$2::jsonb)::text AS value",
    [authority.tenantId, JSON.stringify(payload)]);
  const raced = await runBehindAdvisoryBarrier({
    adminPool: authority.observerPool,
    lockKey: `${authority.tenantId}\x1foutlook-lifecycle-authorization-request\x1f${lifecycleId}`,
    queryNeedle: "mint_outlook_desktop_lifecycle_verifier_receipt",
    calls: [() => verifierText(leftPayload), () => verifierText(rightPayload)],
    settled: true,
  });
  assert.equal(raced.waiter_count, 2);
  const fulfilled = raced.results.filter(({ status }) => status === "fulfilled");
  const rejected = raced.results.filter(({ status }) => status === "rejected");
  assert.equal(fulfilled.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(JSON.parse(fulfilled[0].value).outcome, "authorized");
  assert.equal(rejected[0].reason.code, "LAWOS_POSTGRES_OPERATION_FAILED");
  assert.equal(rejected[0].reason.safe_error_code, "POSTGRES_OPERATION_FAILED");
  assert.equal(rejected[0].reason.postgres_code, "LLC01");
  assert.notEqual(rejected[0].reason.postgres_code, "23505");
  const stored = (await authority.observerPool.query(
    `SELECT count(*)::int AS rows,min(response_text) AS response_text
       FROM lawos_email_dms.outlook_desktop_lifecycle_authorizations
      WHERE tenant_id=$1 AND lifecycle_authorization_id=$2`,
    [authority.tenantId, lifecycleId],
  )).rows[0];
  assert.deepEqual(stored, { rows: 1, response_text: fulfilled[0].value });
});
