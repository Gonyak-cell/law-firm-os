import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import {
  insertReleaseArtifact,
  releaseArtifact,
} from "./helpers/outlook-desktop-release-trust-migration-fixture.js";

test("PostgreSQL keeps macOS observation and approval inside certificate validity", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  for (const migration of listEmailDmsPostgresMigrations().slice(0, 6)) {
    await fixture.adminPool.query(migration.sql);
  }
  const insert = (artifact) => withPostgresTransaction(
    fixture.appPool,
    { tenant_id: artifact.tenant_id },
    (client) => insertReleaseArtifact(client, artifact),
  );
  const invalidChronologies = [
    ["observation before certificate", {
      macos_certificate_valid_from: "2026-08-16T09:30:00.000Z",
    }],
    ["approval before certificate", {
      macos_certificate_valid_from: "2026-08-16T10:30:00.000Z",
      valid_from: "2026-08-16T11:00:00.000Z",
    }],
    ["observation at certificate expiry", {
      macos_certificate_valid_until: "2026-08-16T11:00:00.000Z",
      macos_evidence_observed_at: "2026-08-16T11:00:00.000Z",
      approved_at: "2026-08-16T11:00:00.000Z",
      valid_from: "2026-08-16T11:00:00.000Z",
    }],
  ];
  for (const [index, [name, overrides]] of invalidChronologies.entries()) {
    await t.test(name, async () => {
      await assert.rejects(insert(releaseArtifact(String(index + 2), overrides)));
    });
  }
  await t.test("exact inclusive starts and exclusive end coverage", async () => {
    const start = "2026-08-16T10:00:00.000Z";
    const end = "2026-08-18T10:00:00.000Z";
    await insert(releaseArtifact("9", {
      macos_certificate_valid_from: start,
      macos_certificate_valid_until: end,
      macos_evidence_observed_at: start,
      macos_evidence_expires_at: end,
      approved_at: start,
      valid_from: start,
      valid_until: end,
    }));
  });
});
