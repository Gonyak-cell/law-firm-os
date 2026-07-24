export const HRX_PROJECTION_WRITER_ROLE = "lawos_hrx_projection_writer";
export const HRX_PROJECTION_CONSUMER_ROLE = "lawos_app";
export const HRX_PROJECTION_ROLE_CONNECTION_LIMIT = 4;

const TENANT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const WRITER_GRANTS = Object.freeze([
  "GRANT USAGE ON SCHEMA lawos_meta, lawos_security, lawos_domain, lawos_hrx, lawos_projection TO lawos_hrx_projection_writer",
  "GRANT SELECT ON lawos_meta.schema_migrations TO lawos_hrx_projection_writer",
  "GRANT SELECT ON lawos_domain.records, lawos_domain.outbox_events TO lawos_hrx_projection_writer",
  "GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA lawos_hrx TO lawos_hrx_projection_writer",
  "GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA lawos_projection TO lawos_hrx_projection_writer",
  "ALTER DEFAULT PRIVILEGES IN SCHEMA lawos_hrx GRANT SELECT, INSERT, UPDATE ON TABLES TO lawos_hrx_projection_writer",
  "ALTER DEFAULT PRIVILEGES IN SCHEMA lawos_projection GRANT SELECT, INSERT, UPDATE ON TABLES TO lawos_hrx_projection_writer",
]);
const CONSUMER_GRANTS = Object.freeze([
  "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA lawos_hrx FROM lawos_app",
  "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA lawos_projection FROM lawos_app",
  "GRANT USAGE ON SCHEMA lawos_hrx TO lawos_app",
  "GRANT SELECT ON ALL TABLES IN SCHEMA lawos_hrx TO lawos_app",
  "ALTER DEFAULT PRIVILEGES IN SCHEMA lawos_hrx GRANT SELECT ON TABLES TO lawos_app",
]);

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function approvedTenants(values) {
  const tenants = [...new Set((values ?? []).map((value) => requiredText(value, "tenant id")))].sort();
  if (tenants.length < 1
    || tenants.some((tenant) =>
      !TENANT_ID.test(tenant)
      || /^tenant_lawos_staging_/u.test(tenant)
      || tenant === "*")) {
    throw new TypeError("exact approved production tenant ids are required");
  }
  return tenants;
}

export function hrxProjectionRoleGrantStatements() {
  return Object.freeze([...WRITER_GRANTS, ...CONSUMER_GRANTS]);
}

export async function configureHrxProjectionRole(client, {
  password,
  tenantContextSecret,
  approvedTenantIds,
} = {}) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL client is required");
  }
  const rolePassword = requiredText(password, "projection role password");
  const contextSecret = Buffer.from(
    requiredText(tenantContextSecret, "tenant context secret"),
    "utf8",
  );
  if (contextSecret.byteLength < 32) {
    throw new TypeError("tenant context secret must contain at least 32 bytes");
  }
  const tenants = approvedTenants(approvedTenantIds);
  let began = false;
  try {
    await client.query("BEGIN");
    began = true;
    const role = await client.query(
      `SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolinherit,
              rolreplication, rolbypassrls, rolconnlimit
         FROM pg_roles
        WHERE rolname = $1`,
      [HRX_PROJECTION_WRITER_ROLE],
    );
    if (role.rowCount === 0) {
      await client.query(
        `CREATE ROLE ${HRX_PROJECTION_WRITER_ROLE} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT ${HRX_PROJECTION_ROLE_CONNECTION_LIMIT}`,
      );
    } else {
      const current = role.rows[0] ?? {};
      if (current.rolcanlogin !== true
        || current.rolsuper !== false
        || current.rolcreatedb !== false
        || current.rolcreaterole !== false
        || current.rolinherit !== false
        || current.rolreplication !== false
        || current.rolbypassrls !== false
        || current.rolconnlimit !== HRX_PROJECTION_ROLE_CONNECTION_LIMIT) {
        throw Object.assign(new Error("HRX projection database role privilege drifted"), {
          code: "LAWOS_HRX_PROJECTION_ROLE_DRIFT",
          safe_error_code: "HRX_PROJECTION_ROLE_DRIFT",
        });
      }
    }
    await setPostgresRolePassword(client, {
      roleName: HRX_PROJECTION_WRITER_ROLE,
      password: rolePassword,
    });
    await client.query(
      `ALTER ROLE ${HRX_PROJECTION_WRITER_ROLE} SET statement_timeout = '120s'`,
    );
    await client.query(
      `ALTER ROLE ${HRX_PROJECTION_WRITER_ROLE} SET lock_timeout = '5s'`,
    );
    await client.query(
      `ALTER ROLE ${HRX_PROJECTION_WRITER_ROLE} SET idle_in_transaction_session_timeout = '120s'`,
    );
    await client.query(`REVOKE CREATE ON SCHEMA public FROM ${HRX_PROJECTION_WRITER_ROLE}`);
    for (const statement of [...WRITER_GRANTS, ...CONSUMER_GRANTS]) {
      await client.query(statement);
    }
    await client.query(
      "DELETE FROM lawos_security.tenant_context_authorities WHERE database_role = $1 AND tenant_id <> ALL($2::text[])",
      [HRX_PROJECTION_WRITER_ROLE, tenants],
    );
    for (const tenantId of tenants) {
      await client.query(
        `INSERT INTO lawos_security.tenant_context_authorities
           (database_role, tenant_id, context_secret, synthetic_wildcard, active)
         VALUES ($1, $2, $3, false, true)
         ON CONFLICT (database_role, tenant_id) DO UPDATE
           SET context_secret = EXCLUDED.context_secret,
               synthetic_wildcard = false,
               active = true,
               rotated_at = clock_timestamp()`,
        [HRX_PROJECTION_WRITER_ROLE, tenantId, contextSecret],
      );
    }
    await client.query("COMMIT");
    began = false;
    return Object.freeze({
      role_name: HRX_PROJECTION_WRITER_ROLE,
      consumer_role_name: HRX_PROJECTION_CONSUMER_ROLE,
      grant_statement_count: WRITER_GRANTS.length + CONSUMER_GRANTS.length,
      tenant_authority_count: tenants.length,
      connection_limit: HRX_PROJECTION_ROLE_CONNECTION_LIMIT,
      synthetic_wildcard_count: 0,
      consumer_write_grant_count: 0,
      password_returned: false,
      secret_material_returned: false,
    });
  } catch (error) {
    if (began) await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}
import { setPostgresRolePassword } from "../../persistence/src/postgres/role-password.js";
