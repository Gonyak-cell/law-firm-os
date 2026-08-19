import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS } from "../src/postgres-outlook-desktop-release-artifact-importer.js";
import { releaseArtifact } from "./helpers/outlook-desktop-release-trust-migration-fixture.js";
import { runBehindAdvisoryBarrier } from "./support/postgres-advisory-concurrency.js";
import {
  createOutlookAssignmentAuthorityFixture,
  roleDatabaseNow,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";

function controlText(authority, name, requestId, payload) {
  return withPostgresTransaction(
    authority.controlPool,
    { tenant_id: authority.tenantId, isolationLevel: "serializable" },
    async (client) => (await client.query(
      `SELECT lawos_email_dms.${name}($1,$2,$3::jsonb) AS value`,
      [authority.tenantId, requestId, JSON.stringify(payload)],
    )).rows[0]?.value,
  );
}

async function importPayload(authority) {
  const now = Date.parse(await roleDatabaseNow(authority.controlPool, authority.tenantId));
  const artifact = releaseArtifact("7", {
    tenant_id: authority.tenantId,
    release_artifact_id: "release-concurrent-7",
    release_ticket_id: "ticket-concurrent-7",
    approval_audit_event_id: "audit-concurrent-7",
    macos_certificate_valid_from: new Date(now - 86_400_000).toISOString(),
    macos_certificate_valid_until: new Date(now + 86_400_000).toISOString(),
    macos_evidence_observed_at: new Date(now - 60_000).toISOString(),
    macos_evidence_expires_at: new Date(now + 86_400_000).toISOString(),
    ticket_issued_at: new Date(now - 60_000).toISOString(),
    ticket_expires_at: new Date(now + 86_400_000).toISOString(),
    valid_from: new Date(now + 60_000).toISOString(),
    valid_until: new Date(now + 86_400_000).toISOString(),
  });
  return Object.freeze(Object.fromEntries(
    OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS.map((key) => [key, artifact[key]]),
  ));
}

async function exactCounts(authority, artifactId, importId, revokeId) {
  return (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_release_artifacts
         WHERE tenant_id=$1 AND release_artifact_id=$2) AS artifacts,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_release_import_receipts
         WHERE tenant_id=$1 AND request_id=$3) AS import_receipts,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_release_revocation_receipts
         WHERE tenant_id=$1 AND request_id=$4) AS revocation_receipts,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_release_trust_audit_events
         WHERE tenant_id=$1 AND release_artifact_id=$2 AND event_type='approved') AS approvals,
       (SELECT count(*)::int FROM lawos_email_dms.outlook_desktop_release_trust_audit_events
         WHERE tenant_id=$1 AND release_artifact_id=$2 AND event_type='revoked') AS revocations`,
    [authority.tenantId, artifactId, importId, revokeId],
  )).rows[0];
}

test("concurrent release import and revoke serialize by request and replay exact stored responses", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: "tenant-release-authority-concurrency-a",
  });
  if (!authority) return;
  const payload = await importPayload(authority);
  const importId = "release-import-concurrent-7";
  const importRace = await runBehindAdvisoryBarrier({
    adminPool: authority.observerPool,
    lockKey: `${authority.tenantId}\x1foutlook-release-import-request\x1f${importId}`,
    queryNeedle: "import_outlook_desktop_release_artifact",
    calls: [0, 1].map(() => () => controlText(
      authority, "import_outlook_desktop_release_artifact", importId, payload,
    )),
  });
  assert.equal(importRace.waiter_count, 2);
  assert.equal(importRace.values[0], importRace.values[1]);
  assert.equal(await controlText(
    authority, "replay_outlook_desktop_release_import", importId, payload,
  ), importRace.values[0]);
  await assert.rejects(controlText(
    authority,
    "import_outlook_desktop_release_artifact",
    importId,
    { ...payload, final_artifact_sha256: "f".repeat(64) },
  ), (error) => error?.code === "LAWOS_POSTGRES_OPERATION_FAILED"
    && error?.postgres_code === "P0001");

  const revocation = Object.freeze({
    release_artifact_id: payload.release_artifact_id,
    revocation_event_id: "release-revoke-audit-concurrent-7",
    revocation_reason: "operator_rejected",
  });
  const revokeId = "release-revoke-concurrent-7";
  const revokeRace = await runBehindAdvisoryBarrier({
    adminPool: authority.observerPool,
    lockKey: `${authority.tenantId}\x1foutlook-release-revocation-request\x1f${revokeId}`,
    queryNeedle: "revoke_outlook_desktop_release",
    calls: [0, 1].map(() => () => controlText(
      authority, "revoke_outlook_desktop_release", revokeId, revocation,
    )),
  });
  assert.equal(revokeRace.waiter_count, 2);
  assert.equal(revokeRace.values[0], revokeRace.values[1]);
  assert.equal(await controlText(
    authority, "replay_outlook_desktop_release_revocation", revokeId, revocation,
  ), revokeRace.values[0]);
  await assert.rejects(controlText(
    authority,
    "revoke_outlook_desktop_release",
    revokeId,
    { ...revocation, revocation_reason: "receipt_conflict" },
  ), (error) => error?.code === "LAWOS_POSTGRES_OPERATION_FAILED"
    && error?.postgres_code === "P0001");
  assert.deepEqual(await exactCounts(
    authority, payload.release_artifact_id, importId, revokeId,
  ), {
    artifacts: 1,
    import_receipts: 1,
    revocation_receipts: 1,
    approvals: 1,
    revocations: 1,
  });
});
