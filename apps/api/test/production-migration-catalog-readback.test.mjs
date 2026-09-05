import assert from "node:assert/strict";
import test from "node:test";

import {
  executeProductionMigrationCatalogReadback,
  validateProductionMigrationCatalogReadbackEvent,
} from "../src/production-migration-catalog-readback.js";
import {
  NOW,
  SOURCE_SHA,
  SOURCE_TREE,
  packet,
  readback,
  signedEvent,
} from "./production-migration-catalog-readback-fixtures.mjs";
import {
  CLIENT_OPERATIONS_SCHEMA_MANIFEST,
} from "../src/client-operations-schema.js";

function testValidator() {
  return (input) => validateProductionMigrationCatalogReadbackEvent(input);
}

function testExecutor() {
  return (input) => executeProductionMigrationCatalogReadback(input);
}

test("the action binds the full closed 81-row schema ledger", () => {
  assert.equal(CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_migration_count, 81);
  assert.equal(
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_sha256,
    "29530ec602b720deeb1e26625c85a3dcc1268e2bfc116b6b86bfada761cb38a7",
  );
  assert.equal(
    packet().packet.source_catalog.catalog_sha256,
    CLIENT_OPERATIONS_SCHEMA_MANIFEST.schema_sha256,
  );
});

test("the action validates approval before reading exactly one auditor secret", async () => {
  const fixture = signedEvent();
  Object.assign(fixture.env, {
    LAWOS_MASTER_DATABASE_SECRET_ID: "forbidden-master-secret",
    LAWOS_PROJECTION_WRITER_DATABASE_SECRET_ID: "forbidden-writer-secret",
    LAWOS_TENANT_CONTEXT_DATABASE_SECRET_ID: "forbidden-tenant-secret",
  });
  const secretReads = [];
  const poolOptions = [];
  let poolEnded = 0;
  const result = await testExecutor()({
    ...fixture,
    now: NOW,
    resolveSecret: async ({ secretId, region }) => {
      secretReads.push({ secretId, region });
      return { username: "lawos_hrx_projection_auditor", password: "private-password" };
    },
    createPool: (options) => {
      poolOptions.push(options);
      return { end: async () => { poolEnded += 1; } };
    },
    readCatalog: async () => readback(false),
  });
  assert.deepEqual(result.catalog, readback(false));
  assert.equal(result.lineage.source_sha, SOURCE_SHA);
  assert.equal(result.lineage.source_tree, SOURCE_TREE);
  assert.equal(result.lineage.packet_sha256, packet().packet_sha256);
  assert.equal(result.preflight_receipt_sha256, "c".repeat(64));
  assert.match(result.receipt_sha256, /^[a-f0-9]{64}$/u);
  assert.deepEqual(secretReads, [{ secretId: "lawos/hrx-projection-auditor", region: "ap-northeast-2" }]);
  assert.equal(poolOptions.length, 1);
  assert.equal(poolOptions[0].sslMode, "verify-full");
  assert.equal(poolOptions[0].max, 1);
  assert.equal(poolOptions[0].connectionTimeoutMillis, 5_000);
  assert.equal(poolOptions[0].statementTimeoutMillis, 15_000);
  assert.match(poolOptions[0].connectionString, /^postgresql:\/\/lawos_hrx_projection_auditor:/u);
  assert.equal(poolEnded, 1);
  const serializedResult = JSON.stringify(result);
  for (const privateAuthorizationValue of Object.values(
    fixture.event.authorization,
  )) {
    assert.equal(serializedResult.includes(privateAuthorizationValue), false);
  }
  for (const authorityField of [
    "outlook_assignment_authority",
    "outlook_trusted_current_read_authority",
    "authority_catalog_sha256",
    "authority_table_count",
    "authority_function_count",
    "role_catalog_count",
    "exposed_security_definer_function_count",
    "exposed_security_definer_function_catalog_sha256",
    "assignment_state_read",
    "trusted_current_read",
  ]) assert.equal(serializedResult.includes(authorityField), false);
});

test("the action rejects a self-consistent PostgreSQL ledger subset", async () => {
  const fixture = signedEvent();
  const current = readback(false);
  const incomplete = readback(false, {
    migrations: current.migrations.slice(0, -1),
  });
  let poolEnded = 0;
  await assert.rejects(
    testExecutor()({
      ...fixture,
      now: NOW,
      resolveSecret: async () => ({
        username: "lawos_hrx_projection_auditor",
        password: "private-password",
      }),
      createPool: () => ({
        end: async () => { poolEnded += 1; },
      }),
      readCatalog: async () => incomplete,
    }),
    (error) => error?.code === "LAWOS_CATALOG_READBACK_SCHEMA",
  );
  assert.equal(poolEnded, 1);
});

test("event fields are closed and arbitrary SQL-like input rejects before pool creation", async () => {
  for (const extra of [
    { sql: "DELETE FROM lawos_meta.schema_migrations" },
    { query: "SELECT * FROM confidential_business_rows" },
    { statement: "UPDATE lawos_domain.records" },
    { filter: "tenant_id='*'" },
    { limit: 1 },
    { requestContext: {} },
    { rawPath: "/catalog" },
    { httpMethod: "POST" },
  ]) {
    const fixture = signedEvent();
    Object.assign(fixture.event, extra);
    let poolCreated = 0;
    assert.throws(
      () => testValidator()({ ...fixture, now: NOW }),
      (error) => error?.code === "LAWOS_CATALOG_READBACK_EVENT",
    );
    await assert.rejects(
      testExecutor()({
        ...fixture,
        now: NOW,
        resolveSecret: async () => { throw new Error("must not read secret"); },
        createPool: () => { poolCreated += 1; },
      }),
      (error) => error?.code === "LAWOS_CATALOG_READBACK_EVENT",
    );
    assert.equal(poolCreated, 0);
  }
});
