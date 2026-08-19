import assert from "node:assert/strict";
import test from "node:test";

import { runBehindAdvisoryBarrier } from "./support/postgres-advisory-concurrency.js";
import {
  createOutlookAssignmentAuthorityFixture,
  roleJsonCall,
  seedCanaryPolicy,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import {
  assertProtectedObservationBoundary,
  assertTenantContextBoundary,
  expandedRoster,
  policyApproval,
  releaseImportPayload,
  roleQuery,
} from "./support/postgres-outlook-desktop-positive-role-fixture.js";

function controlText(authority, name, requestId, payload) {
  return roleQuery(
    authority.controlPool,
    authority.tenantId,
    `SELECT lawos_email_dms.${name}($1,$2,$3::jsonb) AS value`,
    [authority.tenantId, requestId, JSON.stringify(payload)],
  );
}

function controlRace(authority, name, requestId, payload) {
  const domain = name === "import_outlook_desktop_release_artifact"
    ? "outlook-release-import-request" : "outlook-release-revocation-request";
  return runBehindAdvisoryBarrier({
    adminPool: authority.observerPool,
    lockKey: `${authority.tenantId}\x1f${domain}\x1f${requestId}`,
    queryNeedle: name,
    calls: [() => controlText(authority, name, requestId, payload),
      () => controlText(authority, name, requestId, payload)],
  });
}

async function releaseState(authority, importRequest, revokeRequest = null) {
  return (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_release_artifacts) AS artifacts,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_release_import_receipts) AS imports,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_release_revocation_receipts) AS revocations,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_release_trust_audit_events) AS audits,
       (SELECT response_text FROM lawos_email_dms.outlook_desktop_release_import_receipts
         WHERE tenant_id=$1 AND request_id=$2) AS import_response,
       (SELECT response_text FROM lawos_email_dms.outlook_desktop_release_revocation_receipts
         WHERE tenant_id=$1 AND request_id=$3) AS revoke_response`,
    [authority.tenantId, importRequest, revokeRequest],
  )).rows[0];
}

test("control LOGIN role imports and revokes a release with exact replay and rollback", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-control-release-a",
  });
  if (!authority) return;
  await assertProtectedObservationBoundary(authority);
  const artifact = await releaseImportPayload(authority);
  const importRequest = "positive-release-import-2";
  assert.equal(await controlText(
    authority,
    "replay_outlook_desktop_release_import",
    importRequest,
    artifact,
  ), null);
  const imports = await controlRace(
    authority, "import_outlook_desktop_release_artifact", importRequest, artifact,
  );
  assert.equal(imports.waiter_count, 2);
  const importedText = imports.values[0];
  assert.equal(imports.values[1], importedText);
  assert.equal(JSON.parse(importedText).outcome, "imported");
  assert.equal(await controlText(
    authority,
    "replay_outlook_desktop_release_import",
    importRequest,
    artifact,
  ), importedText);
  await assertTenantContextBoundary(
    authority.controlPool,
    authority.tenantId,
    "lawos_outlook_control_operator",
    "lawos_email_dms.replay_outlook_desktop_release_import(text,text,jsonb)",
    "SELECT lawos_email_dms.replay_outlook_desktop_release_import($1,$2,$3::jsonb) AS value",
    [authority.tenantId, importRequest, JSON.stringify(artifact)],
  );
  await assert.rejects(controlText(
    authority,
    "import_outlook_desktop_release_artifact",
    importRequest,
    { ...artifact, final_artifact_sha256: "f".repeat(64) },
  ));
  await assert.rejects(controlText(
    authority,
    "import_outlook_desktop_release_artifact",
    "positive-release-import-invalid",
    { ...artifact, platform: "win32" },
  ));
  assert.deepEqual(await releaseState(authority, importRequest), {
    artifacts: 2,
    imports: 1,
    revocations: 0,
    audits: 2,
    import_response: importedText,
    revoke_response: null,
  });

  const revocation = {
    release_artifact_id: artifact.release_artifact_id,
    revocation_event_id: "positive-release-revocation-2",
    revocation_reason: "operator_rejected",
  };
  const revokeRequest = "positive-release-revoke-2";
  assert.equal(await controlText(
    authority,
    "replay_outlook_desktop_release_revocation",
    revokeRequest,
    revocation,
  ), null);
  const revocations = await controlRace(
    authority, "revoke_outlook_desktop_release", revokeRequest, revocation,
  );
  assert.equal(revocations.waiter_count, 2);
  const revokedText = revocations.values[0];
  assert.equal(revocations.values[1], revokedText);
  assert.equal(JSON.parse(revokedText).outcome, "revoked");
  assert.equal(await controlText(
    authority,
    "replay_outlook_desktop_release_revocation",
    revokeRequest,
    revocation,
  ), revokedText);
  await assert.rejects(controlText(
    authority,
    "revoke_outlook_desktop_release",
    revokeRequest,
    { ...revocation, revocation_reason: "receipt_conflict" },
  ));
  await assert.rejects(controlText(
    authority,
    "revoke_outlook_desktop_release",
    "positive-release-revoke-absent",
    { ...revocation, release_artifact_id: "positive-release-absent" },
  ));
  assert.deepEqual(await releaseState(authority, importRequest, revokeRequest), {
    artifacts: 2,
    imports: 1,
    revocations: 1,
    audits: 3,
    import_response: importedText,
    revoke_response: revokedText,
  });
});

test("control LOGIN role preserves canary while expanding and revoking policy", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-positive-control-policy-a",
  });
  if (!authority) return;
  const canary = await seedCanaryPolicy(authority, { suffix: "11" });
  assert.equal((await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "import_outlook_desktop_assignment_roster",
    canary.roster,
  )).outcome, "imported");
  assert.deepEqual(await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "approve_outlook_desktop_assignment_policy",
    canary.approval,
  ), canary.result);
  await assert.rejects(roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "import_outlook_desktop_assignment_roster",
    { ...canary.roster, owner_approval_sha256: "f".repeat(64) },
  ));

  const expansion = await expandedRoster(authority, canary.roster, "11");
  const expansionAuthorized = await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "authorize_outlook_desktop_assignment_expansion",
    expansion.authorization,
  );
  assert.equal(expansionAuthorized.outcome, "authorized");
  assert.deepEqual(await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "authorize_outlook_desktop_assignment_expansion",
    expansion.authorization,
  ), expansionAuthorized);
  await assert.rejects(roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "authorize_outlook_desktop_assignment_expansion",
    { ...expansion.authorization, canary_success_evidence_sha256: "f".repeat(64) },
  ));
  const rosterImported = await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "import_outlook_desktop_assignment_roster",
    expansion.roster,
  );
  assert.equal(rosterImported.outcome, "imported");
  assert.deepEqual(await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "import_outlook_desktop_assignment_roster",
    expansion.roster,
  ), rosterImported);

  const principal = expansion.principals[1];
  const approved = await policyApproval(authority, expansion.roster, principal, {
    revision: 1,
    suffix: "expanded",
  });
  assert.equal((await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "approve_outlook_desktop_assignment_policy",
    approved,
  )).outcome, "approved");
  const revoked = await policyApproval(authority, expansion.roster, principal, {
    revision: 2,
    suffix: "expanded-revoke",
    enabled: false,
  });
  const revokedResult = await roleJsonCall(
    authority.controlPool,
    authority.tenantId,
    "revoke_outlook_desktop_assignment_policy",
    revoked,
  );
  assert.equal(revokedResult.outcome, "approved");
  assert.equal(revokedResult.projection.state.desired_assigned, false);
  const counts = (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_assignment_canary_principals) AS canaries,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_assignment_rosters) AS rosters,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_assignment_expansion_authorizations WHERE consumed_at IS NOT NULL) AS expansions,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_assignment_policy_approvals) AS approvals`,
  )).rows[0];
  assert.deepEqual(counts, { canaries: 1, rosters: 2, expansions: 1, approvals: 3 });
});
