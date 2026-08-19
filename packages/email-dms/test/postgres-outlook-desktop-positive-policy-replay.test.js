import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  authorizeAndRegister,
  createOutlookAssignmentAuthorityFixture,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import {
  policyApproval,
  roleQuery,
} from "./support/postgres-outlook-desktop-positive-role-fixture.js";

function policyText(authority, name, payload) {
  return roleQuery(
    authority.controlPool,
    authority.tenantId,
    `SELECT lawos_email_dms.${name}($1,$2::jsonb)::text AS value`,
    [authority.tenantId, JSON.stringify(payload)],
  );
}

async function commitWithoutReturningPolicyResponse(authority, payload) {
  await withPostgresTransaction(
    authority.controlPool,
    { tenant_id: authority.tenantId, isolationLevel: "serializable" },
    async (client) => {
      await client.query(
        "SELECT lawos_email_dms.approve_outlook_desktop_assignment_policy($1,$2::jsonb)",
        [authority.tenantId, JSON.stringify(payload)],
      );
    },
  );
}

async function policySnapshot(authority) {
  return (await authority.observerPool.query(
    `SELECT jsonb_build_object(
       'approvals',COALESCE((SELECT jsonb_agg(to_jsonb(approval) ORDER BY approval_id) FROM
         lawos_email_dms.outlook_desktop_assignment_policy_approvals AS approval
        WHERE approval.tenant_id=$1),'[]'::jsonb),
       'policies',COALESCE((SELECT jsonb_agg(to_jsonb(policy) ORDER BY user_id) FROM
         lawos_email_dms.outlook_desktop_assignment_policies AS policy
        WHERE policy.tenant_id=$1),'[]'::jsonb),
       'states',COALESCE((SELECT jsonb_agg(to_jsonb(state) ORDER BY user_id) FROM
         lawos_email_dms.outlook_desktop_assignment_states AS state
        WHERE state.tenant_id=$1),'[]'::jsonb),
       'outbox',COALESCE((SELECT jsonb_agg(to_jsonb(job)
          ORDER BY job.provider_generation,job.outbox_id)
         FROM lawos_email_dms.outlook_desktop_assignment_outbox AS job
        WHERE job.tenant_id=$1),'[]'::jsonb)
     )::text AS value`,
    [authority.tenantId],
  )).rows[0].value;
}

function shifted(timestamp, milliseconds) {
  return new Date(Date.parse(timestamp) + milliseconds).toISOString();
}

function exactPolicyReplayConflict(error) {
  return error?.code === "LAWOS_POSTGRES_OPERATION_FAILED"
    && error?.safe_error_code === "POSTGRES_OPERATION_FAILED"
    && error?.postgres_code === "LPC01";
}

test("policy response loss replays stored bytes and every changed field is inert", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-policy-replay-a",
  });
  if (!authority) return;
  const canary = await seedCanaryPolicy(authority, { suffix: "71" });
  await authorizeAndRegister(authority, "policy-replay-state");
  const approval = await policyApproval(authority, canary.roster, authority.principal, {
    revision: 72,
    suffix: "response-loss",
  });

  await commitWithoutReturningPolicyResponse(authority, approval);
  const replayText = await policyText(
    authority,
    "approve_outlook_desktop_assignment_policy",
    approval,
  );
  const storedText = (await authority.observerPool.query(
    `SELECT response_text FROM
       lawos_email_dms.outlook_desktop_assignment_policy_approvals
      WHERE tenant_id=$1 AND approval_id=$2`,
    [authority.tenantId, approval.approval_id],
  )).rows[0].response_text;
  assert.equal(replayText, storedText);
  assert.equal(JSON.parse(storedText).outcome, "approved");
  const committed = await policySnapshot(authority);

  const variants = [
    ["maximum_entitled", { maximum_entitled: false }],
    ["rollout_authorized", { rollout_authorized: false }],
    ["account_active", { account_active: false }],
    ["release_allowed", { release_allowed: false }],
    ["user_id", { user_id: `${approval.user_id}-changed` }],
    ["entra_subject_id", { entra_subject_id: `${approval.entra_subject_id}-changed` }],
    ["rollout_stage", { rollout_stage: "expanded" }],
    ["policy_revision", { policy_revision: approval.policy_revision + 1 }],
    ["approved_at", { approved_at: shifted(approval.approved_at, -1) }],
    ["valid_from", { valid_from: shifted(approval.valid_from, 1) }],
    ["valid_until", { valid_until: shifted(approval.valid_until, -1) }],
    ["roster_version", { roster_version: `${approval.roster_version}-changed` }],
    ["roster_binding_sha256", { roster_binding_sha256: "e".repeat(64) }],
    ["owner_approval_sha256", { owner_approval_sha256: "f".repeat(64) }],
  ];
  for (const [field, changed] of variants) {
    await assert.rejects(
      policyText(authority, "approve_outlook_desktop_assignment_policy", {
        ...approval,
        ...changed,
      }),
      exactPolicyReplayConflict,
      `${field} must conflict with the committed request`,
    );
    assert.equal(
      await policySnapshot(authority),
      committed,
      `${field} conflict must be mutation-free`,
    );
  }

  await assert.rejects(
    policyText(authority, "revoke_outlook_desktop_assignment_policy", {
      ...approval,
      maximum_entitled: false,
      rollout_authorized: false,
      account_active: false,
      release_allowed: false,
    }),
    exactPolicyReplayConflict,
  );
  assert.equal(await policySnapshot(authority), committed);
});
