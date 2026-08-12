import assert from "node:assert/strict";
import test from "node:test";
import {
  LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT,
  LAWOS_REHEARSAL_APPLICATION_ROLE,
  configureLawosApplicationRole,
  configureLawosProductionApplicationRole,
  configureLawosRehearsalApplicationRole,
  lawosApplicationRoleGrantStatements,
} from "../src/postgres/application-role.js";
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
    for (const table of ["tenants", "tenant_provisioning_requests"]) {
      await client.query(
        `GRANT INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON lawos_identity.${table} TO lawos_app`,
      );
    }
    await configureLawosApplicationRole(client, {
      databaseName: "postgres",
      password: "test-private-staging-role-password",
      tenantContextSecret: "test-private-staging-tenant-context-secret-material",
      syntheticTenantIds: ["tenant_lawos_staging_a", "tenant_lawos_staging_b"],
    });
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
    rolconnlimit: LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT,
  });
  const authorities = await pool.query(
    "SELECT tenant_id, synthetic_wildcard, active FROM lawos_security.tenant_context_authorities WHERE database_role = 'lawos_app' ORDER BY tenant_id",
  );
  assert.deepEqual(authorities.rows, [
    { tenant_id: "tenant_lawos_staging_a", synthetic_wildcard: false, active: true },
    { tenant_id: "tenant_lawos_staging_b", synthetic_wildcard: false, active: true },
  ]);
  const grants = await pool.query(
    `SELECT has_table_privilege('lawos_app', 'lawos_domain.records', 'SELECT') AS domain_select,
            has_table_privilege('lawos_app', 'lawos_domain.records', 'INSERT') AS domain_insert,
            has_table_privilege('lawos_app', 'lawos_domain.records', 'UPDATE') AS domain_update,
            has_table_privilege('lawos_app', 'lawos_security.tenant_context_authorities', 'SELECT') AS authority_select,
            has_table_privilege('lawos_app', 'lawos_security.tenant_context_authorities', 'INSERT') AS authority_insert,
            has_table_privilege('lawos_app', 'lawos_security.tenant_context_authorities', 'UPDATE') AS authority_update,
            has_table_privilege('lawos_app', 'lawos_identity.tenants', 'SELECT') AS tenant_registry_select,
            has_table_privilege('lawos_app', 'lawos_identity.tenants', 'INSERT') AS tenant_registry_insert,
            has_table_privilege('lawos_app', 'lawos_identity.tenants', 'UPDATE') AS tenant_registry_update,
            has_table_privilege('lawos_app', 'lawos_identity.tenants', 'DELETE') AS tenant_registry_delete,
            has_table_privilege('lawos_app', 'lawos_identity.tenants', 'TRUNCATE') AS tenant_registry_truncate,
            has_table_privilege('lawos_app', 'lawos_identity.tenants', 'REFERENCES') AS tenant_registry_references,
            has_table_privilege('lawos_app', 'lawos_identity.tenants', 'TRIGGER') AS tenant_registry_trigger,
            has_table_privilege('lawos_app', 'lawos_identity.tenant_provisioning_requests', 'SELECT') AS provisioning_select,
            has_table_privilege('lawos_app', 'lawos_identity.tenant_provisioning_requests', 'INSERT') AS provisioning_insert,
            has_table_privilege('lawos_app', 'lawos_identity.tenant_provisioning_requests', 'UPDATE') AS provisioning_update,
            has_table_privilege('lawos_app', 'lawos_identity.tenant_provisioning_requests', 'DELETE') AS provisioning_delete,
            has_table_privilege('lawos_app', 'lawos_identity.tenant_provisioning_requests', 'TRUNCATE') AS provisioning_truncate,
            has_table_privilege('lawos_app', 'lawos_identity.tenant_provisioning_requests', 'REFERENCES') AS provisioning_references,
            has_table_privilege('lawos_app', 'lawos_identity.tenant_provisioning_requests', 'TRIGGER') AS provisioning_trigger`,
  );
  assert.equal(grants.rows[0].domain_select, true);
  assert.equal(grants.rows[0].domain_insert, true);
  assert.equal(grants.rows[0].domain_update, true);
  assert.equal(grants.rows[0].authority_select, false);
  assert.equal(grants.rows[0].authority_insert, false);
  assert.equal(grants.rows[0].authority_update, false);
  assert.equal(grants.rows[0].tenant_registry_select, true);
  assert.equal(grants.rows[0].tenant_registry_insert, false);
  assert.equal(grants.rows[0].tenant_registry_update, false);
  assert.equal(grants.rows[0].tenant_registry_delete, false);
  assert.equal(grants.rows[0].tenant_registry_truncate, false);
  assert.equal(grants.rows[0].tenant_registry_references, false);
  assert.equal(grants.rows[0].tenant_registry_trigger, false);
  assert.equal(grants.rows[0].provisioning_select, true);
  assert.equal(grants.rows[0].provisioning_insert, false);
  assert.equal(grants.rows[0].provisioning_update, false);
  assert.equal(grants.rows[0].provisioning_delete, false);
  assert.equal(grants.rows[0].provisioning_truncate, false);
  assert.equal(grants.rows[0].provisioning_references, false);
  assert.equal(grants.rows[0].provisioning_trigger, false);
  const rowSecurity = await pool.query(
    `SELECT class.relname, class.relrowsecurity, class.relforcerowsecurity
       FROM pg_class AS class
       JOIN pg_namespace AS namespace ON namespace.oid = class.relnamespace
      WHERE namespace.nspname = 'lawos_identity'
        AND class.relname IN ('tenants', 'tenant_provisioning_requests')
      ORDER BY class.relname`,
  );
  assert.deepEqual(rowSecurity.rows, [
    { relname: "tenant_provisioning_requests", relrowsecurity: true, relforcerowsecurity: true },
    { relname: "tenants", relrowsecurity: true, relforcerowsecurity: true },
  ]);
  const roleGrants = lawosApplicationRoleGrantStatements();
  assert.equal(roleGrants.includes("GRANT SELECT, INSERT, UPDATE ON lawos_integrations.docusign_requests TO lawos_app"), true);
  assert.equal(roleGrants.includes("GRANT SELECT, INSERT ON lawos_integrations.docusign_webhook_receipts TO lawos_app"), true);
  assert.equal(roleGrants.includes("GRANT SELECT ON lawos_identity.tenants TO lawos_app"), true);
  assert.equal(roleGrants.includes("GRANT SELECT ON lawos_identity.tenant_provisioning_requests TO lawos_app"), true);
  assert.equal(roleGrants.some((statement) => /\b(?:ALL|INSERT|UPDATE|DELETE|TRUNCATE|REFERENCES|TRIGGER)\b/u.test(statement)
    && /lawos_identity\.(?:tenants|tenant_provisioning_requests)/u.test(statement)), false);
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

test("production application role accepts only the exact approved real-tenant set", async () => {
  const queries = [];
  const client = {
    async query(statement, parameters = []) {
      queries.push({ statement, parameters });
      if (/SELECT rolcanlogin, rolsuper/u.test(statement)) {
        return {
          rowCount: 1,
          rows: [{
            rolcanlogin: true,
            rolsuper: false,
            rolcreatedb: false,
            rolcreaterole: false,
            rolinherit: false,
            rolreplication: false,
            rolbypassrls: false,
            rolconnlimit: LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT,
          }],
        };
      }
      return { rowCount: 0, rows: [] };
    },
  };
  const result = await configureLawosProductionApplicationRole(client, {
    password: "test-production-role-password",
    tenantContextSecret: "test-production-tenant-context-secret-material",
    approvedTenantIds: ["tenant_amic", "tenant_client_001", "tenant_amic"],
  });
  assert.equal(result.authority_scope, "approved-production-tenants");
  assert.equal(result.tenant_authority_count, 2);
  assert.equal(result.synthetic_wildcard_count, 0);
  const deleteQuery = queries.find(({ statement }) => /DELETE FROM lawos_security\.tenant_context_authorities/u.test(statement));
  assert.deepEqual(deleteQuery.parameters[1], ["tenant_amic", "tenant_client_001"]);
  const insertedTenantIds = queries
    .filter(({ statement }) => /INSERT INTO lawos_security\.tenant_context_authorities/u.test(statement))
    .map(({ parameters }) => parameters[1]);
  assert.deepEqual(insertedTenantIds, ["tenant_amic", "tenant_client_001"]);
});

test("private rehearsal uses a distinct least-privilege role without changing lawos_app", async () => {
  const queries = [];
  const client = {
    async query(statement, parameters = []) {
      queries.push({ statement, parameters });
      if (/SELECT rolcanlogin, rolsuper/u.test(statement)) {
        assert.deepEqual(parameters, [LAWOS_REHEARSAL_APPLICATION_ROLE]);
        return { rowCount: 0, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    },
  };
  const result = await configureLawosRehearsalApplicationRole(client, {
    password: "test-private-rehearsal-role-password",
    tenantContextSecret: "test-private-rehearsal-tenant-context-secret-material",
    approvedTenantIds: ["tenant_amic"],
  });
  assert.equal(result.role_name, LAWOS_REHEARSAL_APPLICATION_ROLE);
  assert.equal(result.authority_scope, "approved-private-rehearsal-tenants");
  assert.equal(result.tenant_authority_count, 1);
  assert.equal(
    queries.some(({ statement }) => /\blawos_app\b/u.test(statement)),
    false,
  );
  assert.equal(
    queries.some(({ statement }) => statement ===
      `CREATE ROLE ${LAWOS_REHEARSAL_APPLICATION_ROLE} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT ${LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT}`),
    true,
  );
});

test("production application role rejects wildcard, synthetic staging and empty tenant authority", async () => {
  const client = { query: async () => { throw new Error("must not query"); } };
  for (const approvedTenantIds of [
    [],
    ["*"],
    ["tenant_lawos_staging_a"],
    ["tenant with spaces"],
  ]) {
    await assert.rejects(
      configureLawosProductionApplicationRole(client, {
        password: "test-password",
        tenantContextSecret: "test-production-tenant-context-secret-material",
        approvedTenantIds,
      }),
      /exact approved non-synthetic production tenant id/u,
    );
  }
});

test("private staging application role does not require database or superuser logging settings", async () => {
  const queries = [];
  const client = {
    async query(statement) {
      queries.push(statement);
      if (/SELECT rolcanlogin, rolsuper/u.test(statement)) {
        return {
          rowCount: 1,
          rows: [{
            rolcanlogin: true,
            rolsuper: false,
            rolcreatedb: false,
            rolcreaterole: false,
            rolinherit: false,
            rolreplication: false,
            rolbypassrls: false,
            rolconnlimit: LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT,
          }],
        };
      }
      return { rowCount: 0, rows: [] };
    },
  };
  const result = await configureLawosApplicationRole(client, {
    password: "test-private-staging-role-password",
    tenantContextSecret: "test-private-staging-tenant-context-secret-material",
    syntheticTenantIds: ["tenant_lawos_staging_a", "tenant_lawos_staging_b"],
  });
  assert.equal(queries.some((statement) => /^ALTER DATABASE\b/u.test(statement)), false);
  assert.equal(queries.some((statement) => /^SET(?: LOCAL)? log_/u.test(statement)), false);
  assert.equal(queries.some((statement) => /^ALTER ROLE lawos_app LOGIN\b/u.test(statement)), false);
  assert.equal(result.synthetic_wildcard_count, 0);
  assert.equal(result.tenant_authority_count, 2);
  assert.equal(result.connection_limit, LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT);
  assert.equal(result.connection_limit_migrated, false);
});

for (const priorConnectionLimit of [20, 21]) {
  test(`private staging application role migrates the known prior connection limit ${priorConnectionLimit}`, async () => {
    const queries = [];
    const client = {
      async query(statement) {
        queries.push(statement);
        if (/SELECT rolcanlogin, rolsuper/u.test(statement)) {
          return {
            rowCount: 1,
            rows: [{
              rolcanlogin: true,
              rolsuper: false,
              rolcreatedb: false,
              rolcreaterole: false,
              rolinherit: false,
              rolreplication: false,
              rolbypassrls: false,
              rolconnlimit: priorConnectionLimit,
            }],
          };
        }
        return { rowCount: 0, rows: [] };
      },
    };
    const result = await configureLawosApplicationRole(client, {
      password: "test-private-staging-role-password",
      tenantContextSecret: "test-private-staging-tenant-context-secret-material",
      syntheticTenantIds: ["tenant_lawos_staging_a", "tenant_lawos_staging_b"],
    });
    assert.equal(result.connection_limit_migrated, true);
    assert.equal(result.connection_limit, LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT);
    assert.equal(queries.filter((statement) => statement === `ALTER ROLE lawos_app CONNECTION LIMIT ${LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT}`).length, 1);
  });
}

test("private staging application role fails closed on existing privilege drift", async () => {
  const queries = [];
  const client = {
    async query(statement) {
      queries.push(statement);
      if (/SELECT rolcanlogin, rolsuper/u.test(statement)) {
        return {
          rowCount: 1,
          rows: [{
            rolcanlogin: true,
            rolsuper: false,
            rolcreatedb: true,
            rolcreaterole: false,
            rolinherit: false,
            rolreplication: false,
            rolbypassrls: false,
            rolconnlimit: LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT,
          }],
        };
      }
      return { rowCount: 0, rows: [] };
    },
  };
  await assert.rejects(
    configureLawosApplicationRole(client, {
      password: "test-private-staging-role-password",
      tenantContextSecret: "test-private-staging-tenant-context-secret-material",
      syntheticTenantIds: ["tenant_lawos_staging_a", "tenant_lawos_staging_b"],
    }),
    (error) => error.code === "LAWOS_POSTGRES_APPLICATION_ROLE_DRIFT",
  );
  assert.equal(queries.some((statement) => /^ALTER ROLE\b/u.test(statement)), false);
});

test("private staging application role rejects an unknown connection limit", async () => {
  const queries = [];
  const client = {
    async query(statement) {
      queries.push(statement);
      if (/SELECT rolcanlogin, rolsuper/u.test(statement)) {
        return {
          rowCount: 1,
          rows: [{
            rolcanlogin: true,
            rolsuper: false,
            rolcreatedb: false,
            rolcreaterole: false,
            rolinherit: false,
            rolreplication: false,
            rolbypassrls: false,
            rolconnlimit: LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT + 1,
          }],
        };
      }
      return { rowCount: 0, rows: [] };
    },
  };
  await assert.rejects(
    configureLawosApplicationRole(client, {
      password: "test-private-staging-role-password",
      tenantContextSecret: "test-private-staging-tenant-context-secret-material",
      syntheticTenantIds: ["tenant_lawos_staging_a", "tenant_lawos_staging_b"],
    }),
    (error) => error.code === "LAWOS_POSTGRES_APPLICATION_ROLE_DRIFT",
  );
  assert.equal(queries.some((statement) => /^ALTER ROLE lawos_app CONNECTION LIMIT\b/u.test(statement)), false);
});
