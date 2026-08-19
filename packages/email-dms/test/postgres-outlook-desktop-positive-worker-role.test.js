import assert from "node:assert/strict";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

import {
  authorityDigest,
  createOutlookAssignmentAuthorityFixture,
  prepareRegistration,
  roleJsonCall,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import {
  assertTenantContextBoundary,
  policyApproval,
  roleQuery,
} from "./support/postgres-outlook-desktop-positive-role-fixture.js";

function workerCall(authority, statement, values) {
  return roleQuery(authority.workerPool, authority.tenantId, statement, values);
}

function claim(authority, workerId, leaseMilliseconds = 1_000, maxAttempts = 5) {
  return workerCall(
    authority,
    "SELECT lawos_email_dms.claim_outlook_desktop_assignment_jobs($1,$2,10,$3,$4) AS value",
    [authority.tenantId, workerId, leaseMilliseconds, maxAttempts],
  );
}

function begin(authority, job, workerId) {
  return workerCall(
    authority,
    "SELECT lawos_email_dms.begin_outlook_desktop_assignment_dispatch($1,$2,$3,$4) AS value",
    [authority.tenantId, job.outbox_id, workerId, job.lease_token],
  );
}

function completion(job, workerId, observedAssigned, suffix) {
  return {
    outbox_id: job.outbox_id,
    worker_id: workerId,
    lease_token: job.lease_token,
    observed_assigned: observedAssigned,
    result_code: `positive-readback-${suffix}`,
    readback: {
      schema_version: "lawos.outlook-assignment-authoritative-readback.v1",
      request_terminal: true,
      propagation_stabilized: true,
      receipt_sha256: authorityDigest(`positive-readback-${suffix}`),
    },
  };
}

function complete(authority, payload) {
  return workerCall(
    authority,
    "SELECT lawos_email_dms.complete_outlook_desktop_assignment_job($1,$2::jsonb) AS value",
    [authority.tenantId, JSON.stringify(payload)],
  );
}

async function pausePast(timestamp) {
  await delay(Math.max(0, Date.parse(timestamp) - Date.now()) + 150);
}

test("worker LOGIN role sweeps, leases, reads back, fails, retries, and recovers safely", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-runtime-worker-a",
  });
  if (!authority) return;
  const canary = await seedCanaryPolicy(authority, { suffix: "31" });
  const prepared = await prepareRegistration(authority, "positive31");
  await roleJsonCall(
    authority.appPool,
    authority.tenantId,
    "register_outlook_desktop_installation",
    prepared.registration,
  );
  const swept = await workerCall(
    authority,
    "SELECT lawos_email_dms.sweep_outlook_desktop_assignments($1,10) AS value",
    [authority.tenantId],
  );
  assert.equal(swept.length, 1);
  await assertTenantContextBoundary(
    authority.workerPool, authority.tenantId, "lawos_outlook_assignment_worker",
    "lawos_email_dms.sweep_outlook_desktop_assignments(text,integer)",
    "SELECT lawos_email_dms.sweep_outlook_desktop_assignments($1,10) AS value",
    [authority.tenantId],
  );

  const [first] = await claim(authority, "positive-worker-add-1");
  const firstCompletion = completion(first, "positive-worker-add-1", true, "add-one");
  await assert.rejects(complete(authority, firstCompletion));
  const extended = await workerCall(
    authority,
    "SELECT lawos_email_dms.extend_outlook_desktop_assignment_lease($1,$2,$3,$4,1000) AS value",
    [authority.tenantId, first.outbox_id, "positive-worker-add-1", first.lease_token],
  );
  assert.equal(extended.outcome, "lease_extended");
  assert.equal((await begin(authority, first, "positive-worker-add-1")).provider_call_allowed, true);
  await pausePast(extended.job.lease_expires_at);
  const [readback] = await claim(authority, "positive-worker-add-readback");
  assert.equal(readback.outbox_id, first.outbox_id);
  assert.equal(readback.dispatch_mode, "readback_only");
  assert.equal((await begin(
    authority, readback, "positive-worker-add-readback",
  )).provider_call_allowed, false);
  const addCompletion = completion(
    readback, "positive-worker-add-readback", true, "add-readback",
  );
  const added = await complete(authority, addCompletion);
  assert.equal(added.outcome, "completed");
  assert.deepEqual(await complete(authority, addCompletion), added);

  const revocation = await policyApproval(authority, canary.roster, authority.principal, {
    revision: 32,
    suffix: "remove",
    enabled: false,
  });
  await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "revoke_outlook_desktop_assignment_policy",
    revocation,
  );
  const [remove] = await claim(authority, "positive-worker-remove-1");
  const retry = await workerCall(
    authority,
    "SELECT lawos_email_dms.fail_outlook_desktop_assignment_job($1,$2::jsonb,1,100) AS value",
    [authority.tenantId, JSON.stringify({
      outbox_id: remove.outbox_id,
      worker_id: "positive-worker-remove-1",
      lease_token: remove.lease_token,
      error_code: "REMOTE_NOT_SENT",
      failure_certainty: "definitive_not_committed",
      permanent: false,
      non_commit_proof: null,
    })],
  );
  assert.equal(retry.outcome, "retry");
  assert.deepEqual(await workerCall(
    authority,
    "SELECT lawos_email_dms.recover_outlook_desktop_assignment_removals($1,10) AS value",
    [authority.tenantId],
  ), []);
  await pausePast(retry.job.available_at);
  assert.deepEqual(await claim(
    authority, "positive-worker-remove-exhausted", 1_000, 1,
  ), []);
  const recovered = await workerCall(
    authority,
    "SELECT lawos_email_dms.recover_outlook_desktop_assignment_removals($1,10) AS value",
    [authority.tenantId],
  );
  assert.equal(recovered.length, 1);
  assert.equal(recovered[0].outbox_id, remove.outbox_id);
  assert.equal(recovered[0].retry_epoch, retry.job.retry_epoch + 1);
  assert.equal(recovered[0].retry_epoch_attempt_count, 0);
  const [removeRetry] = await claim(
    authority, "positive-worker-remove-recovered", 1_000, 1,
  );
  assert.equal((await begin(
    authority, removeRetry, "positive-worker-remove-recovered",
  )).provider_call_allowed, true);
  const removeCompletion = completion(
    removeRetry, "positive-worker-remove-recovered", false, "remove-recovered",
  );
  assert.equal((await complete(authority, removeCompletion)).outcome, "completed");
  await assert.rejects(complete(authority, {
    ...removeCompletion,
    result_code: "positive-readback-conflict",
  }));
  assert.deepEqual(await claim(authority, "positive-worker-finished"), []);
});
