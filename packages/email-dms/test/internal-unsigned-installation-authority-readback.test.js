import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import test from "node:test";
import {
  readInternalUnsignedInstallationAuthorityReadback,
  verifyInternalUnsignedInstallationAuthorityReadback,
} from "../src/internal-unsigned-installation-authority-readback.js";
import { createOutlookAssignmentAuthorityFixture } from "./support/postgres-outlook-desktop-assignment-authority-fixture.js";
import {
  POSTGRES_MIGRATION_CATALOG_READBACK_ROLE_SQL,
  POSTGRES_MIGRATION_CATALOG_READBACK_ROWS_SQL,
} from "../../persistence/src/postgres/migration-catalog-readback.js";
import { readProductionMigrationCatalogWithAuthority } from "../../../apps/api/src/production-migration-catalog-readback.js";
import { createInternalUnsignedInstallationRuntimeFromEnv } from "../../../apps/api/src/internal-unsigned-installation-runtime-context.js";

test("actual application-role metadata readback verifies five installed definitions and their exact authority boundaries", async (t) => {
  const fixture = await createOutlookAssignmentAuthorityFixture(t, { tenantId: "tenant-internal-metadata-readback" });
  assert.ok(fixture, "actual temporary PostgreSQL is required");
  const result = await verifyInternalUnsignedInstallationAuthorityReadback(fixture.appPool);
  assert.equal(result.function_count, 5);
  assert.equal(result.table_count, 3);
  assert.match(result.authority_facts_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(JSON.stringify(result).includes("CREATE FUNCTION"), false);

  for (const sql of [
    "ALTER FUNCTION lawos_email_dms.read_current_internal_unsigned_installation(text,text,text) COST 200",
    "GRANT EXECUTE ON FUNCTION lawos_email_dms.read_current_internal_unsigned_installation(text,text,text) TO PUBLIC",
    "ALTER FUNCTION lawos_email_dms.read_current_internal_unsigned_installation(text,text,text) OWNER TO lawos_admin",
    "GRANT SELECT ON TABLE lawos_email_dms.internal_unsigned_installation_bindings TO lawos_app",
    "GRANT SELECT(tenant_id) ON TABLE lawos_email_dms.internal_unsigned_installation_bindings TO lawos_app",
    "ALTER TABLE lawos_email_dms.internal_unsigned_installation_bindings DISABLE ROW LEVEL SECURITY",
    "GRANT CREATE ON SCHEMA lawos_email_dms TO lawos_outlook_authority_owner",
    "GRANT lawos_outlook_authority_owner TO lawos_app WITH INHERIT TRUE, SET TRUE",
    "GRANT lawos_outlook_control_operator TO lawos_app WITH INHERIT FALSE, SET TRUE",
    "ALTER ROLE lawos_outlook_authority_owner LOGIN",
    "DROP TRIGGER immutable_rows ON lawos_email_dms.internal_unsigned_installation_bindings",
    "ALTER TABLE lawos_email_dms.internal_unsigned_installation_bindings DISABLE TRIGGER immutable_rows",
    "ALTER POLICY tenant_isolation ON lawos_email_dms.internal_unsigned_installation_bindings USING (true) WITH CHECK (true)",
    "CREATE POLICY broader_access ON lawos_email_dms.internal_unsigned_installation_bindings USING (true)",
  ]) {
    const client = await fixture.observerPool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await assert.rejects(readInternalUnsignedInstallationAuthorityReadback(client), {
        code: "LAWOS_INTERNAL_INSTALLATION_AUTHORITY_READBACK",
      }, sql);
    } finally { await client.query("ROLLBACK"); client.release(); }
  }
  assert.deepEqual(await verifyInternalUnsignedInstallationAuthorityReadback(fixture.appPool), result);

  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const startup = {
    env: {
      AWS_REGION: "ap-northeast-2",
      LAWOS_INTERNAL_INSTALLATION_ATTESTATION_SECRET_ID: "synthetic/internal-attestation",
    },
    pool: fixture.appPool, tenant_id: fixture.tenantId,
    resolveSecret: async () => ({
      key_id: "synthetic-key-1",
      private_key_pem: privateKey.export({ type: "pkcs8", format: "pem" }),
      public_key_sha256: createHash("sha256").update(publicKey.export({ type: "spki", format: "der" })).digest("hex"),
    }),
  };
  assert.equal((await createInternalUnsignedInstallationRuntimeFromEnv(startup)).configured, true);
  try {
    await fixture.observerPool.query("GRANT EXECUTE ON FUNCTION lawos_email_dms.read_current_internal_unsigned_installation(text,text,text) TO PUBLIC");
    await assert.rejects(createInternalUnsignedInstallationRuntimeFromEnv(startup), { code: "LAWOS_INTERNAL_INSTALLATION_AUTHORITY_READBACK" });
  } finally {
    await fixture.observerPool.query("REVOKE EXECUTE ON FUNCTION lawos_email_dms.read_current_internal_unsigned_installation(text,text,text) FROM PUBLIC");
  }
  assert.equal((await createInternalUnsignedInstallationRuntimeFromEnv(startup)).configured, true);
});

test("production catalog default reader requires live authority once migration 309 is present without changing the v1 receipt fields", async () => {
  let connected = 0;
  const pool = {
    query: async (sql) => {
      if (sql === POSTGRES_MIGRATION_CATALOG_READBACK_ROLE_SQL) return { rows: [{ database_role: "lawos_hrx_projection_auditor", tenant_context_authority_ready: true }] };
      assert.equal(sql, POSTGRES_MIGRATION_CATALOG_READBACK_ROWS_SQL);
      return { rows: [{ migration_id: "309_client_internal_unsigned_installation_authority", checksum: "a".repeat(64) }] };
    },
    connect: async () => { connected += 1; throw new Error("private database error"); },
  };
  await assert.rejects(readProductionMigrationCatalogWithAuthority(pool), { code: "LAWOS_INTERNAL_INSTALLATION_AUTHORITY_READBACK" });
  assert.equal(connected, 1);
  const legacy = await readProductionMigrationCatalogWithAuthority({ ...pool, query: async (sql) =>
    sql === POSTGRES_MIGRATION_CATALOG_READBACK_ROWS_SQL ? { rows: [{ migration_id: "308_client_outlook_desktop_legacy_windows_compatibility", checksum: "b".repeat(64) }] } : pool.query(sql) });
  assert.equal(connected, 1);
  assert.deepEqual(Object.keys(legacy).sort(), ["catalog_sha256", "migration_count", "migrations", "schema_version", "tenant_context_authority_ready"]);
});
