import { setPostgresRolePassword } from "../../persistence/src/postgres/role-password.js";
import { HRX_STORE_TABLES } from "./store/file-store.js";

export const HRX_PROJECTION_WRITER_ROLE = "lawos_hrx_projection_writer";
export const HRX_PROJECTION_AUDITOR_ROLE = "lawos_hrx_projection_auditor";
export const HRX_PROJECTION_CONSUMER_ROLE = "lawos_app";
export const HRX_PROJECTION_ROLE_CONNECTION_LIMIT = 4;
export const HRX_PROJECTION_AUDITOR_CONNECTION_LIMIT = 2;

const TENANT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const TARGET_TABLES = HRX_STORE_TABLES
  .map((table) => `lawos_hrx."${table}"`)
  .join(", ");
const PROJECTION_RUNTIME_TABLES = [
  "lawos_projection.hrx_record_state",
  "lawos_projection.hrx_outbox_cursor",
  "lawos_projection.hrx_backfill_checkpoint",
  "lawos_projection.hrx_projection_lease",
  "lawos_projection.hrx_consumer_route",
].join(", ");
const PROJECTION_AUDIT_TABLES = PROJECTION_RUNTIME_TABLES;
const WRITER_GRANTS = Object.freeze([
  "GRANT USAGE ON SCHEMA lawos_meta, lawos_security, lawos_domain, lawos_hrx, lawos_projection TO lawos_hrx_projection_writer",
  "GRANT SELECT ON lawos_meta.schema_migrations TO lawos_hrx_projection_writer",
  "GRANT SELECT ON lawos_domain.records, lawos_domain.outbox_events TO lawos_hrx_projection_writer",
  "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA lawos_domain FROM lawos_hrx_projection_writer",
  "REVOKE DELETE, TRUNCATE ON ALL TABLES IN SCHEMA lawos_hrx FROM lawos_hrx_projection_writer",
  "REVOKE DELETE, TRUNCATE ON ALL TABLES IN SCHEMA lawos_projection FROM lawos_hrx_projection_writer",
  `GRANT SELECT, INSERT, UPDATE ON ${TARGET_TABLES} TO lawos_hrx_projection_writer`,
  `GRANT SELECT, INSERT, UPDATE ON ${PROJECTION_RUNTIME_TABLES} TO lawos_hrx_projection_writer`,
]);
const AUDITOR_GRANTS = Object.freeze([
  "GRANT USAGE ON SCHEMA lawos_meta, lawos_security, lawos_domain, lawos_hrx, lawos_projection TO lawos_hrx_projection_auditor",
  "GRANT SELECT ON lawos_meta.schema_migrations TO lawos_hrx_projection_auditor",
  "GRANT SELECT ON lawos_domain.records, lawos_domain.record_references, lawos_domain.outbox_events TO lawos_hrx_projection_auditor",
  "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA lawos_domain FROM lawos_hrx_projection_auditor",
  "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA lawos_hrx FROM lawos_hrx_projection_auditor",
  "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA lawos_projection FROM lawos_hrx_projection_auditor",
  `GRANT SELECT ON ${TARGET_TABLES} TO lawos_hrx_projection_auditor`,
  `GRANT SELECT ON ${PROJECTION_AUDIT_TABLES} TO lawos_hrx_projection_auditor`,
]);
const CONSUMER_GRANTS = Object.freeze([
  "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA lawos_hrx FROM lawos_app",
  "REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA lawos_projection FROM lawos_app",
  "GRANT USAGE ON SCHEMA lawos_hrx, lawos_projection TO lawos_app",
  `GRANT SELECT ON ${TARGET_TABLES} TO lawos_app`,
  "GRANT SELECT ON lawos_projection.hrx_backfill_checkpoint, lawos_projection.hrx_outbox_cursor, lawos_projection.hrx_consumer_route TO lawos_app",
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
  return Object.freeze([...WRITER_GRANTS, ...AUDITOR_GRANTS, ...CONSUMER_GRANTS]);
}

export async function configureHrxProjectionRole(client, {
  password,
  auditorPassword,
  tenantContextSecret,
  approvedTenantIds,
} = {}) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL client is required");
  }
  const rolePassword = requiredText(password, "projection role password");
  const auditorRolePassword = requiredText(auditorPassword, "projection auditor role password");
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
    const ensureRole = async (roleName, connectionLimit) => {
      const role = await client.query(
        `SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolinherit,
                rolreplication, rolbypassrls, rolconnlimit
           FROM pg_roles
          WHERE rolname = $1`,
        [roleName],
      );
      if (role.rowCount === 0) {
        await client.query(
          `CREATE ROLE ${roleName} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT ${connectionLimit}`,
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
          || current.rolconnlimit !== connectionLimit) {
          throw Object.assign(new Error("HRX projection database role privilege drifted"), {
            code: "LAWOS_HRX_PROJECTION_ROLE_DRIFT",
            safe_error_code: "HRX_PROJECTION_ROLE_DRIFT",
          });
        }
      }
    };
    await ensureRole(HRX_PROJECTION_WRITER_ROLE, HRX_PROJECTION_ROLE_CONNECTION_LIMIT);
    await ensureRole(HRX_PROJECTION_AUDITOR_ROLE, HRX_PROJECTION_AUDITOR_CONNECTION_LIMIT);
    await setPostgresRolePassword(client, {
      roleName: HRX_PROJECTION_WRITER_ROLE,
      password: rolePassword,
    });
    await setPostgresRolePassword(client, {
      roleName: HRX_PROJECTION_AUDITOR_ROLE,
      password: auditorRolePassword,
    });
    for (const roleName of [HRX_PROJECTION_WRITER_ROLE, HRX_PROJECTION_AUDITOR_ROLE]) {
      await client.query(
        `ALTER ROLE ${roleName} SET statement_timeout = '120s'`,
      );
      await client.query(
        `ALTER ROLE ${roleName} SET lock_timeout = '5s'`,
      );
      await client.query(
        `ALTER ROLE ${roleName} SET idle_in_transaction_session_timeout = '120s'`,
      );
      await client.query(`REVOKE CREATE ON SCHEMA public FROM ${roleName}`);
    }
    for (const statement of [...WRITER_GRANTS, ...AUDITOR_GRANTS, ...CONSUMER_GRANTS]) {
      await client.query(statement);
    }
    for (const roleName of [HRX_PROJECTION_WRITER_ROLE, HRX_PROJECTION_AUDITOR_ROLE]) {
      await client.query(
        "DELETE FROM lawos_security.tenant_context_authorities WHERE database_role = $1 AND tenant_id <> ALL($2::text[])",
        [roleName, tenants],
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
          [roleName, tenantId, contextSecret],
        );
      }
    }
    await client.query("COMMIT");
    began = false;
    return Object.freeze({
      role_name: HRX_PROJECTION_WRITER_ROLE,
      auditor_role_name: HRX_PROJECTION_AUDITOR_ROLE,
      consumer_role_name: HRX_PROJECTION_CONSUMER_ROLE,
      grant_statement_count: WRITER_GRANTS.length + AUDITOR_GRANTS.length + CONSUMER_GRANTS.length,
      tenant_authority_count: tenants.length * 2,
      connection_limit: HRX_PROJECTION_ROLE_CONNECTION_LIMIT,
      auditor_connection_limit: HRX_PROJECTION_AUDITOR_CONNECTION_LIMIT,
      synthetic_wildcard_count: 0,
      consumer_write_grant_count: 0,
      auditor_write_grant_count: 0,
      password_returned: false,
      secret_material_returned: false,
    });
  } catch (error) {
    if (began) await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}
