import assert from "node:assert/strict";
import test from "node:test";
import { configureLawosApplicationRole } from "../src/postgres/application-role.js";
import { createPostgresPool } from "../src/postgres/pool.js";
import { runPostgresMigrations } from "../src/postgres/migration-runner.js";
import { startDisposablePostgres } from "./helpers/disposable-postgres.js";

test("private staging application role is least privilege and tenant-explicit", async (t) => {
  const instance = await startDisposablePostgres(t);
  if (!instance) return;
  const pool = createPostgresPool({
    connectionString: instance.connection_string,
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-private-staging-role-test",
  });
  t.after(async () => {
    await pool.end();
    await instance.stop();
  });
  await runPostgresMigrations(pool, { appliedBy: "private-staging-role-test" });
  const client = await pool.connect();
  try {
    const result = await configureLawosApplicationRole(client, {
      databaseName: "postgres",
      password: "test-private-staging-role-password",
      tenantContextSecret: "test-private-staging-tenant-context-secret-material",
      syntheticTenantIds: ["tenant_lawos_staging_a", "tenant_lawos_staging_b"],
    });
    assert.equal(result.role_name, "lawos_app");
    assert.equal(result.tenant_authority_count, 2);
    assert.equal(result.synthetic_wildcard_count, 0);
    assert.equal(result.password_returned, false);
    assert.equal(JSON.stringify(result).includes("test-private-staging-role-password"), false);
  } finally {
    client.release();
  }
  const role = await pool.query(
    "SELECT rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls, rolconnlimit FROM pg_roles WHERE rolname = 'lawos_app'",
  );
  assert.deepEqual(role.rows[0], {
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolreplication: false,
    rolbypassrls: false,
    rolconnlimit: 20,
  });
  const authorities = await pool.query(
    "SELECT tenant_id, synthetic_wildcard, active FROM lawos_security.tenant_context_authorities WHERE database_role = 'lawos_app' ORDER BY tenant_id",
  );
  assert.deepEqual(authorities.rows, [
    { tenant_id: "tenant_lawos_staging_a", synthetic_wildcard: false, active: true },
    { tenant_id: "tenant_lawos_staging_b", synthetic_wildcard: false, active: true },
  ]);
  const grants = await pool.query(
    "SELECT has_table_privilege('lawos_app', 'lawos_domain.records', 'SELECT,INSERT,UPDATE') AS domain_rw, has_table_privilege('lawos_app', 'lawos_security.tenant_context_authorities', 'SELECT') AS authority_read",
  );
  assert.equal(grants.rows[0].domain_rw, true);
  assert.equal(grants.rows[0].authority_read, false);
});

test("private staging application role rejects wildcard and non-LawOS tenants", async () => {
  const client = { query: async () => { throw new Error("must not query"); } };
  await assert.rejects(
    configureLawosApplicationRole(client, {
      password: "test-password",
      tenantContextSecret: "test-private-staging-tenant-context-secret-material",
      syntheticTenantIds: ["*", "tenant_lawos_staging_a"],
    }),
    /approved LawOS synthetic staging tenant ids/u,
  );
});
