import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import {
  ARTIFACT_COLUMNS,
  insertReleaseArtifact,
  insertReleaseAudit,
} from "./helpers/outlook-desktop-release-trust-migration-fixture.js";
import {
  attachArtifactSnapshot,
  installRootSignedRegistry,
  RELEASE_TRUST_NOW,
  releaseTrustFixture,
} from "./helpers/outlook-desktop-release-trust-fixture.js";

const originalNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = "test";
after(() => {
  if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalNodeEnv;
});

test("PostgreSQL release authority requires the exact immutable approval event", async (t) => {
  const database = await createMigratedPostgresFixture(t);
  if (!database) return;
  for (const migration of listEmailDmsPostgresMigrations().slice(0, 6)) {
    await database.adminPool.query(migration.sql);
  }
  const item = await releaseTrustFixture();
  await attachArtifactSnapshot(t, item);
  const root = mkdtempSync(path.join(tmpdir(), "lawos-release-postgres-registry-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const registry = installRootSignedRegistry(root, item);
  item.row.trust_registry_sha256 = registry.sha256;
  item.row.trust_registry_serial = String(registry.registrySerial);
  const artifact = Object.fromEntries(
    ARTIFACT_COLUMNS.map((column) => [column, item.row[column]]),
  );
  const tenant = { tenant_id: item.ticket.lawos_tenant_id };
  await withPostgresTransaction(
    database.appPool,
    tenant,
    (client) => insertReleaseArtifact(client, artifact),
  );
  const query = (statement, values) => withPostgresTransaction(
    database.appPool,
    tenant,
    (client) => client.query(statement, values),
    { readOnly: true },
  );
  const { createOutlookDesktopReleaseTrustService } = await import(
    "../src/outlook-desktop-release-trust.js"
  );
  const service = createOutlookDesktopReleaseTrustService({
    database: { query },
    testOnlyNow: RELEASE_TRUST_NOW,
    testOnlyVerifiedRegistry: registry,
  });
  await assert.rejects(
    service.resolveApprovedArtifact(item.input),
    (error) => error?.code === "RELEASE_ARTIFACT_AUDIT_REQUIRED",
  );
  await withPostgresTransaction(
    database.appPool,
    tenant,
    (client) => insertReleaseAudit(client, {
      tenant_id: artifact.tenant_id,
      event_id: item.row.approval_audit_event_id,
      release_artifact_id: artifact.release_artifact_id,
      event_type: "approved",
      release_ticket_sha256: artifact.embedded_release_ticket_sha256,
      final_artifact_sha256: artifact.final_artifact_sha256,
      approval_sha256: artifact.approval_sha256,
      event_binding_sha256: item.row.approval_audit_event_binding_sha256,
      occurred_at: artifact.approved_at,
    }),
  );
  const result = await service.resolveApprovedArtifact(item.input);
  assert.equal(result.valid, true);
  assert.equal(result.registered_final_artifact_sha256, artifact.final_artifact_sha256);
  assert.equal(result.measured_inner_artifact_sha256, artifact.embedded_inner_artifact_sha256);
  assert.equal(result.measured_inner_artifact_bytes, Number(artifact.embedded_inner_artifact_bytes));
});
