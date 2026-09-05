import assert from "node:assert/strict";
import test from "node:test";

import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import {
  insertReleaseArtifact,
  insertReleaseAudit,
  releaseArtifact,
  releaseAudit,
} from "./helpers/outlook-desktop-release-trust-migration-fixture.js";

const TABLES = [
  "outlook_desktop_release_artifacts",
  "outlook_desktop_release_trust_audit_events",
];
test("release-trust 006 stays byte-compatible before additive 007-010", () => {
  const migrations = listEmailDmsPostgresMigrations();
  assert.deepEqual(migrations.slice(-6).map(({ id }) => id), [
    "005_outlook_desktop_installation",
    "006_outlook_desktop_release_trust",
    "007_outlook_desktop_assignment",
    "008_outlook_desktop_trusted_current_read",
    "009_outlook_desktop_legacy_windows_compatibility",
    "010_internal_unsigned_installation_authority",
  ]);
  const migration = migrations.find(({ id }) => id === "006_outlook_desktop_release_trust");
  assert.equal(migration.checksum,
    "86921d4c43544858ae67a95c2c6cc8fb5deeef2731693285fcb4ffa22fd115c7");
});

test("release artifact identities are tenant-isolated, immutable, and revocable once", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  for (const migration of listEmailDmsPostgresMigrations().slice(0, 6)) {
    await fixture.adminPool.query(migration.sql);
  }

  const schema = await fixture.adminPool.query(
    `SELECT relation.relname AS table_name,
            relation.relrowsecurity AS rls_enabled,
            relation.relforcerowsecurity AS rls_forced
       FROM pg_class AS relation
       JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
      WHERE namespace.nspname = 'lawos_email_dms'
        AND relation.relname = ANY($1::text[])
      ORDER BY relation.relname`,
    [TABLES],
  );
  assert.deepEqual(schema.rows.map(({ table_name }) => table_name), [...TABLES].sort());
  assert.equal(schema.rows.every(({ rls_enabled, rls_forced }) => rls_enabled && rls_forced), true);
  const columns = await fixture.adminPool.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'lawos_email_dms' AND table_name = ANY($1::text[])`,
    [TABLES],
  );
  const sensitive = /^(private_key|public_key|access_token|refresh_token|client_secret|email_address|entra_subject_id|user_id)$/u;
  assert.equal(columns.rows.some(({ column_name }) => sensitive.test(column_name)), false);
  const privileges = await fixture.adminPool.query(
    `SELECT
       has_table_privilege('lawos_app', 'lawos_email_dms.outlook_desktop_release_artifacts', 'SELECT') AS artifact_select,
       has_table_privilege('lawos_app', 'lawos_email_dms.outlook_desktop_release_artifacts', 'INSERT') AS artifact_insert,
       has_table_privilege('lawos_app', 'lawos_email_dms.outlook_desktop_release_artifacts', 'UPDATE') AS artifact_update,
       has_table_privilege('lawos_app', 'lawos_email_dms.outlook_desktop_release_artifacts', 'DELETE') AS artifact_delete,
       has_table_privilege('lawos_app', 'lawos_email_dms.outlook_desktop_release_trust_audit_events', 'SELECT') AS audit_select,
       has_table_privilege('lawos_app', 'lawos_email_dms.outlook_desktop_release_trust_audit_events', 'INSERT') AS audit_insert,
       has_table_privilege('lawos_app', 'lawos_email_dms.outlook_desktop_release_trust_audit_events', 'UPDATE') AS audit_update,
       has_table_privilege('lawos_app', 'lawos_email_dms.outlook_desktop_release_trust_audit_events', 'DELETE') AS audit_delete`,
  );
  assert.deepEqual(privileges.rows[0], {
    artifact_select: true,
    artifact_insert: true,
    artifact_update: true,
    artifact_delete: false,
    audit_select: true,
    audit_insert: true,
    audit_update: false,
    audit_delete: false,
  });

  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-release-a" },
    (client) => insertReleaseArtifact(client, releaseArtifact()),
  );
  await assert.rejects(withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-release-a" },
    (client) => insertReleaseAudit(client, releaseAudit("approved", {
      event_id: "release-audit-wrong",
      final_artifact_sha256: "f".repeat(64),
    })),
  ));
  await assert.rejects(withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-release-a" },
    (client) => insertReleaseAudit(client, releaseAudit("approved", {
      event_id: "release-audit-wrong-binding",
      event_binding_sha256: "f".repeat(64),
    })),
  ));
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-release-a" },
    (client) => insertReleaseAudit(client, releaseAudit()),
  );
  await assert.rejects(withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-release-a" },
    (client) => insertReleaseAudit(client, releaseAudit("approved", {
      event_id: "release-audit-duplicate",
    })),
  ));
  await assert.rejects(withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-release-a" },
    (client) => insertReleaseAudit(client, releaseAudit("revoked", {
      event_id: "release-audit-premature-revocation",
    })),
  ));
  const hidden = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-release-b" },
    (client) => client.query("SELECT release_artifact_id FROM lawos_email_dms.outlook_desktop_release_artifacts"),
    { readOnly: true },
  );
  assert.deepEqual(hidden.rows, []);

  await assert.rejects(withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-release-b" },
    (client) => insertReleaseArtifact(client, releaseArtifact("2", { tenant_id: "tenant-release-a" })),
  ));
  await assert.rejects(fixture.adminPool.query(
    "DELETE FROM lawos_email_dms.outlook_desktop_release_artifacts WHERE release_artifact_id = 'release-artifact-1'",
  ));
  for (const [name, overrides] of [
    ["ticket digest", { embedded_release_ticket_sha256: releaseArtifact().embedded_release_ticket_sha256 }],
    ["ticket signature", { embedded_release_ticket_signature_sha256: releaseArtifact().embedded_release_ticket_signature_sha256 }],
    ["final artifact", { final_artifact_sha256: releaseArtifact().final_artifact_sha256 }],
    ["invalid digest", { approval_sha256: "not-a-digest" }],
    ["oversize inner artifact", { embedded_inner_artifact_bytes: 536_870_913 }],
  ]) {
    await t.test(name, async () => {
      await assert.rejects(withPostgresTransaction(
        fixture.appPool,
        { tenant_id: "tenant-release-a" },
        (client) => insertReleaseArtifact(client, releaseArtifact("2", overrides)),
      ));
    });
  }
  for (const [name, overrides] of [
    ["certificate validity", { macos_certificate_valid_until: "2026-08-17T00:00:00.000Z" }],
    ["technical evidence validity", { macos_evidence_expires_at: "2026-08-17T00:00:00.000Z" }],
    ["missing certificate end", { macos_certificate_valid_until: null }],
    ["missing evidence observation", { macos_evidence_observed_at: null }],
    ["missing evidence expiry", { macos_evidence_expires_at: null }],
  ]) {
    await t.test(name, async () => {
      await assert.rejects(withPostgresTransaction(
        fixture.appPool,
        { tenant_id: "tenant-release-a" },
        (client) => insertReleaseArtifact(client, releaseArtifact("2", overrides)),
      ));
    });
  }
  await t.test("unsigned Windows", async () => {
    await assert.rejects(withPostgresTransaction(
      fixture.appPool,
      { tenant_id: "tenant-release-a" },
      (client) => insertReleaseArtifact(client, releaseArtifact("2", {
        platform: "win32",
        arch: "x64",
        macos_team_id: null,
        macos_certificate_sha256: null,
        macos_certificate_valid_from: null,
        macos_certificate_valid_until: null,
        macos_signature_valid: null,
        macos_notarized: null,
        macos_stapled: null,
        macos_gatekeeper_status: "not_applicable",
        macos_technical_evidence_sha256: null,
        macos_evidence_observed_at: null,
        macos_evidence_expires_at: null,
        windows_authenticode_status: "not_signed",
      })),
    ));
  });

  await assert.rejects(withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-release-a" },
    (client) => client.query(
      "UPDATE lawos_email_dms.outlook_desktop_release_artifacts SET app_version = '9.9.9' WHERE release_artifact_id = 'release-artifact-1'",
    ),
  ));
  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-release-a" },
    (client) => client.query(
      `UPDATE lawos_email_dms.outlook_desktop_release_artifacts
          SET revoked_at = '2026-08-16T12:00:00.000Z',
              revocation_reason = 'owner-revoked'
        WHERE release_artifact_id = 'release-artifact-1'`,
    ),
  );
  await assert.rejects(withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-release-a" },
    (client) => client.query(
      `UPDATE lawos_email_dms.outlook_desktop_release_artifacts
          SET revocation_reason = 'rewritten'
        WHERE release_artifact_id = 'release-artifact-1'`,
    ),
  ));

  await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: "tenant-release-a" },
    (client) => insertReleaseAudit(client, releaseAudit("revoked", {
      event_id: "release-audit-1",
    })),
  );
  await assert.rejects(fixture.adminPool.query(
    "UPDATE lawos_email_dms.outlook_desktop_release_trust_audit_events SET event_type = 'approved' WHERE event_id = 'release-audit-1'",
  ));
  await assert.rejects(fixture.adminPool.query(
    "DELETE FROM lawos_email_dms.outlook_desktop_release_trust_audit_events WHERE event_id = 'release-audit-1'",
  ));
});
