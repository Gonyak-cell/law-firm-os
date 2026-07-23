import assert from "node:assert/strict";
import test from "node:test";
import {
  configureHrxProjectionRole,
  HRX_PROJECTION_ROLE_CONNECTION_LIMIT,
  HRX_PROJECTION_WRITER_ROLE,
  hrxProjectionRoleGrantStatements,
} from "../src/postgres-projection-role.js";

const TENANT_CONTEXT_SECRET = "projection-tenant-context-secret-at-least-32-bytes";

function clientWithRole(role = null) {
  const calls = [];
  return {
    calls,
    async query(text, values = []) {
      calls.push({ text, values });
      if (String(text).includes("FROM pg_roles")) {
        return role == null
          ? { rowCount: 0, rows: [] }
          : { rowCount: 1, rows: [role] };
      }
      return { rowCount: 0, rows: [] };
    },
  };
}

test("projection writer is separate, forced through exact tenants, and leaves consumers read-only", async () => {
  const client = clientWithRole();
  const result = await configureHrxProjectionRole(client, {
    password: "projection-role-value",
    tenantContextSecret: TENANT_CONTEXT_SECRET,
    approvedTenantIds: ["tenant_amic", "tenant_amic"],
  });
  const sql = client.calls.map((call) => call.text).join("\n");
  assert.match(sql, new RegExp(`CREATE ROLE ${HRX_PROJECTION_WRITER_ROLE} LOGIN NOSUPERUSER`));
  assert.match(sql, /NOBYPASSRLS CONNECTION LIMIT 4/u);
  assert.match(sql, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA lawos_hrx FROM lawos_app/u);
  assert.match(sql, /GRANT SELECT ON ALL TABLES IN SCHEMA lawos_hrx TO lawos_app/u);
  assert.doesNotMatch(sql, /GRANT (?:INSERT|UPDATE|DELETE).* TO lawos_app/u);
  assert.equal(client.calls.filter((call) => String(call.text).includes("tenant_context_authorities")).length, 2);
  assert.equal(result.tenant_authority_count, 1);
  assert.equal(result.connection_limit, HRX_PROJECTION_ROLE_CONNECTION_LIMIT);
  assert.equal(result.consumer_write_grant_count, 0);
  assert.equal(result.password_returned, false);
  assert.equal(JSON.stringify(result).includes("projection-role-value"), false);
  assert.equal(hrxProjectionRoleGrantStatements().length, result.grant_statement_count);
});

test("projection writer refuses privilege drift and rolls back", async () => {
  const client = clientWithRole({
    rolcanlogin: true,
    rolsuper: true,
    rolcreatedb: false,
    rolcreaterole: false,
    rolinherit: false,
    rolreplication: false,
    rolbypassrls: false,
    rolconnlimit: HRX_PROJECTION_ROLE_CONNECTION_LIMIT,
  });
  await assert.rejects(
    configureHrxProjectionRole(client, {
      password: "projection-role-value",
      tenantContextSecret: TENANT_CONTEXT_SECRET,
      approvedTenantIds: ["tenant_amic"],
    }),
    (error) => error?.code === "LAWOS_HRX_PROJECTION_ROLE_DRIFT",
  );
  assert.equal(client.calls.at(-1).text, "ROLLBACK");
});

test("projection writer rejects synthetic, wildcard, and short-secret authority", async () => {
  for (const approvedTenantIds of [["tenant_lawos_staging_admin"], ["*"], []]) {
    await assert.rejects(
      configureHrxProjectionRole(clientWithRole(), {
        password: "projection-role-value",
        tenantContextSecret: TENANT_CONTEXT_SECRET,
        approvedTenantIds,
      }),
      /exact approved production tenant ids/u,
    );
  }
  await assert.rejects(
    configureHrxProjectionRole(clientWithRole(), {
      password: "projection-role-value",
      tenantContextSecret: "short",
      approvedTenantIds: ["tenant_amic"],
    }),
    /at least 32 bytes/u,
  );
});
