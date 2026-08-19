import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS,
  createPostgresOutlookDesktopReleaseArtifactImporter,
} from "../src/postgres-outlook-desktop-release-artifact-importer.js";
import {
  readOutlookDesktopReleaseArtifactSnapshot,
} from "../src/outlook-desktop-release-artifact-snapshot.js";
import {
  releaseArtifact,
} from "./helpers/outlook-desktop-release-trust-migration-fixture.js";
import {
  createOutlookAssignmentAuthorityFixture,
  roleDatabaseNow,
} from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";

const TENANT = "tenant-release-import-actual-007";

function measuredArtifact(t, bytes) {
  const root = mkdtempSync(join(tmpdir(), "lawos-actual-007-import-"));
  const name = "formal-macos.dmg";
  writeFileSync(join(root, name), bytes, { mode: 0o600 });
  const metadata = statSync(join(root, name));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return readOutlookDesktopReleaseArtifactSnapshot({
    rootDir: root,
    artifactPath: name,
    expectedUid: metadata.uid,
    expectedGid: metadata.gid,
    expectedMode: 0o600,
  });
}

test("actual 007 importer validates without writes and replays stored bytes", async (t) => {
  const authority = await createOutlookAssignmentAuthorityFixture(t, {
    tenantId: TENANT,
  });
  if (!authority) return;
  const now = Date.parse(await roleDatabaseNow(authority.controlPool, TENANT));
  const bytes = Buffer.from("actual 007 release importer authority\n".repeat(8));
  const row = releaseArtifact("1", {
    tenant_id: TENANT,
    release_artifact_id: "actual-007-release-91",
    release_ticket_id: "actual-007-ticket-91",
    approval_audit_event_id: "actual-007-import-approval-91",
    final_artifact_sha256: createHash("sha256").update(bytes).digest("hex"),
    final_artifact_bytes: bytes.length,
    macos_certificate_valid_from: new Date(now - 86_400_000).toISOString(),
    macos_certificate_valid_until: new Date(now + 4_500).toISOString(),
    macos_evidence_observed_at: new Date(now - 60_000).toISOString(),
    macos_evidence_expires_at: new Date(now + 4_500).toISOString(),
    ticket_issued_at: new Date(now - 60_000).toISOString(),
    ticket_expires_at: new Date(now + 4_500).toISOString(),
    valid_from: new Date(now + 4_000).toISOString(),
    valid_until: new Date(now + 4_500).toISOString(),
  });
  const artifact = Object.freeze(Object.fromEntries(
    OUTLOOK_DESKTOP_RELEASE_IMPORT_ARTIFACT_KEYS.map((key) => [key, row[key]]),
  ));
  let authorizationCount = 0;
  const importer = createPostgresOutlookDesktopReleaseArtifactImporter({
    authorize_import: async () => {
      authorizationCount += 1;
      return true;
    },
    control_pool: authority.controlPool,
    tenant_id: TENANT,
  });
  const command = Object.freeze({
    artifact,
    artifact_snapshot: measuredArtifact(t, bytes),
    request_id: "actual-007-import-request-91",
  });

  assert.equal(await importer.replay(command), null);
  const validated = await importer.validate(command);
  assert.equal(validated.writes, 0);
  assert.equal((await authority.observerPool.query(
    `SELECT count(*)::integer AS count
       FROM lawos_email_dms.outlook_desktop_release_import_receipts
      WHERE tenant_id=$1 AND request_id=$2`,
    [TENANT, command.request_id],
  )).rows[0].count, 0);

  const imported = await importer.execute(command);
  assert.equal(imported.outcome, "imported");
  await authority.observerPool.query(
    `SELECT pg_sleep(
       GREATEST(0,EXTRACT(EPOCH FROM ($1::timestamptz-clock_timestamp())))+0.05
     )`,
    [artifact.valid_until],
  );
  assert.ok(Date.parse(await roleDatabaseNow(authority.controlPool, TENANT))
    > Date.parse(artifact.valid_until));
  assert.deepEqual(await importer.replay({
    ...command,
    artifact_snapshot: Object.freeze({}),
  }), imported);
  const stored = (await authority.observerPool.query(
    `SELECT
       (SELECT count(*)::integer
          FROM lawos_email_dms.outlook_desktop_release_artifacts
         WHERE tenant_id=$1 AND release_artifact_id=$2) AS artifact_count,
       (SELECT count(*)::integer
          FROM lawos_email_dms.outlook_desktop_release_import_receipts
         WHERE tenant_id=$1 AND request_id=$3) AS receipt_count,
       (SELECT count(*)::integer
          FROM lawos_email_dms.outlook_desktop_release_trust_audit_events
         WHERE tenant_id=$1 AND event_id=$4) AS audit_count,
       (SELECT response_text
          FROM lawos_email_dms.outlook_desktop_release_import_receipts
         WHERE tenant_id=$1 AND request_id=$3) AS response_text`,
    [TENANT, artifact.release_artifact_id, command.request_id,
      artifact.approval_audit_event_id],
  )).rows[0];
  const rawReplay = await withPostgresTransaction(
    authority.controlPool,
    { tenant_id: TENANT, isolationLevel: "serializable", readOnly: true },
    async (client) => (await client.query(
      `SELECT lawos_email_dms.replay_outlook_desktop_release_import(
         $1,$2,$3::jsonb) AS response_text`,
      [TENANT, command.request_id, JSON.stringify(artifact)],
    )).rows[0].response_text,
  );
  assert.deepEqual(stored, {
    artifact_count: 1,
    receipt_count: 1,
    audit_count: 1,
    response_text: rawReplay,
  });
  const rawResponse = JSON.parse(rawReplay);
  assert.deepEqual({
    ...rawResponse,
    approved_at: new Date(rawResponse.approved_at).toISOString(),
    valid_until: new Date(rawResponse.valid_until).toISOString(),
  }, imported);
  assert.equal(authorizationCount, 2);
  for (const pool of [authority.appPool, authority.controlPool]) {
    await assert.rejects(pool.query(
      `DELETE FROM lawos_email_dms.outlook_desktop_release_artifacts
        WHERE tenant_id=$1 AND release_artifact_id=$2`,
      [TENANT, artifact.release_artifact_id],
    ), (error) => error?.code === "42501");
  }
});
