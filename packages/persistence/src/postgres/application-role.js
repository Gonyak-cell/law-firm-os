import { setPostgresRolePassword } from "./role-password.js";

export const LAWOS_PRODUCTION_APPLICATION_ROLE = "lawos_app";
const ROLE_NAME = LAWOS_PRODUCTION_APPLICATION_ROLE;
export const LAWOS_REHEARSAL_APPLICATION_ROLE = "lawos_rehearsal_app";
const ALLOWED_ROLE_NAMES = new Set([ROLE_NAME, LAWOS_REHEARSAL_APPLICATION_ROLE]);
const SYNTHETIC_TENANT_PATTERN = /^tenant_lawos_staging_[a-z0-9_-]+$/u;
const TENANT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const LEGACY_CONNECTION_LIMITS = new Set([20, 21]);
export const LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT = 64;

const GRANTS = Object.freeze([
  "GRANT USAGE ON SCHEMA lawos_meta TO lawos_app",
  "GRANT SELECT ON lawos_meta.schema_migrations TO lawos_app",
  "GRANT USAGE ON SCHEMA lawos_runtime TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_runtime.records TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_runtime.idempotency_keys TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_runtime.audit_events TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_runtime.outbox_events TO lawos_app",
  "GRANT USAGE ON SCHEMA lawos_identity TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_identity.accounts TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_identity.account_memberships TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_identity.directory_idempotency_keys TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_identity.directory_outbox_events TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_identity.sessions TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_identity.challenges TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_identity.password_reset_jobs TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_identity.break_glass_requests TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_identity.break_glass_approvals TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_identity.security_audit_events TO lawos_app",
  "GRANT USAGE ON SCHEMA lawos_domain TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_domain.records TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_domain.record_references TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_domain.idempotency_keys TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_domain.audit_events TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_domain.outbox_events TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_domain.import_receipts TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_domain.shadow_receipts TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_domain.rehearsal_receipts TO lawos_app",
  "GRANT USAGE ON SCHEMA lawos_dms TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_dms.upload_sessions TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_dms.documents TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_dms.file_objects TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_dms.document_versions TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_dms.idempotency_keys TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_dms.audit_events TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_dms.outbox_events TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_dms.legal_holds TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_dms.retention_policies TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_dms.delete_intents TO lawos_app",
  "GRANT USAGE ON SCHEMA lawos_integrations TO lawos_app",
  "GRANT SELECT, INSERT, UPDATE ON lawos_integrations.docusign_requests TO lawos_app",
  "GRANT SELECT, INSERT ON lawos_integrations.docusign_webhook_receipts TO lawos_app",
]);

function roleGrantStatements(roleName) {
  if (!ALLOWED_ROLE_NAMES.has(roleName)) {
    throw new TypeError("LawOS application role name is not approved");
  }
  return GRANTS.map((statement) => statement.replaceAll(ROLE_NAME, roleName));
}

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function normalizeSyntheticTenantIds(values) {
  const tenantIds = [...new Set((values ?? []).map((value) => requiredText(value, "synthetic tenant id")))].sort();
  if (tenantIds.length < 2 || tenantIds.some((tenantId) => !SYNTHETIC_TENANT_PATTERN.test(tenantId))) {
    throw new TypeError("at least two approved LawOS synthetic staging tenant ids are required");
  }
  return tenantIds;
}

function normalizeProductionTenantIds(values) {
  const tenantIds = [...new Set((values ?? []).map((value) => requiredText(value, "approved tenant id")))].sort();
  if (tenantIds.length < 1 || tenantIds.some((tenantId) =>
    !TENANT_ID_PATTERN.test(tenantId)
    || SYNTHETIC_TENANT_PATTERN.test(tenantId)
    || tenantId === "*")) {
    throw new TypeError("at least one exact approved non-synthetic production tenant id is required");
  }
  return tenantIds;
}

export function lawosApplicationRoleGrantStatements() {
  return GRANTS;
}

async function configureApplicationRole(client, {
  password,
  tenantContextSecret,
  tenantIds,
  authorityScope,
  roleName = ROLE_NAME,
} = {}) {
  if (!client || typeof client.query !== "function") throw new TypeError("PostgreSQL client is required");
  if (!ALLOWED_ROLE_NAMES.has(roleName)) throw new TypeError("LawOS application role name is not approved");
  const rolePassword = requiredText(password, "application role password");
  const contextSecret = Buffer.from(requiredText(tenantContextSecret, "tenantContextSecret"), "utf8");
  const grants = roleGrantStatements(roleName);
  if (contextSecret.byteLength < 32) throw new TypeError("tenantContextSecret must contain at least 32 bytes");
  let began = false;
  let connectionLimitMigrated = false;
  try {
    await client.query("BEGIN");
    began = true;
    const role = await client.query(
      `SELECT rolcanlogin, rolsuper, rolcreatedb, rolcreaterole, rolinherit,
              rolreplication, rolbypassrls, rolconnlimit
         FROM pg_roles
        WHERE rolname = $1`,
      [roleName],
    );
    if (role.rowCount === 0) {
      await client.query(`CREATE ROLE ${roleName} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT ${LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT}`);
    } else {
      const current = role.rows[0] ?? {};
      if (current.rolcanlogin !== true
        || current.rolsuper !== false
        || current.rolcreatedb !== false
        || current.rolcreaterole !== false
        || current.rolinherit !== false
        || current.rolreplication !== false
        || current.rolbypassrls !== false) {
        throw Object.assign(new Error("LawOS application database role privilege drifted"), {
          code: "LAWOS_POSTGRES_APPLICATION_ROLE_DRIFT",
          safe_error_code: "POSTGRES_APPLICATION_ROLE_DRIFT",
        });
      }
      if (LEGACY_CONNECTION_LIMITS.has(current.rolconnlimit)) {
        await client.query(`ALTER ROLE ${roleName} CONNECTION LIMIT ${LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT}`);
        connectionLimitMigrated = true;
      } else if (current.rolconnlimit !== LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT) {
        throw Object.assign(new Error("LawOS application database role connection limit drifted"), {
          code: "LAWOS_POSTGRES_APPLICATION_ROLE_DRIFT",
          safe_error_code: "POSTGRES_APPLICATION_ROLE_DRIFT",
        });
      }
    }
    await setPostgresRolePassword(client, {
      roleName,
      password: rolePassword,
    });
    await client.query(`ALTER ROLE ${roleName} SET statement_timeout = '30s'`);
    await client.query(`ALTER ROLE ${roleName} SET lock_timeout = '5s'`);
    await client.query(`ALTER ROLE ${roleName} SET idle_in_transaction_session_timeout = '30s'`);
    await client.query(`REVOKE CREATE ON SCHEMA public FROM ${roleName}`);
    for (const statement of grants) await client.query(statement);
    await client.query("DELETE FROM lawos_security.tenant_context_authorities WHERE database_role = $1 AND tenant_id <> ALL($2::text[])", [roleName, tenantIds]);
    for (const tenantId of tenantIds) {
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
    await client.query("COMMIT");
    began = false;
    return Object.freeze({
      role_name: roleName,
      grant_statement_count: grants.length,
      tenant_authority_count: tenantIds.length,
      authority_scope: authorityScope,
      connection_limit: LAWOS_APPLICATION_ROLE_CONNECTION_LIMIT,
      connection_limit_migrated: connectionLimitMigrated,
      synthetic_wildcard_count: 0,
      password_returned: false,
      secret_material_returned: false,
    });
  } catch (error) {
    if (began) await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}

export async function configureLawosApplicationRole(client, {
  password,
  tenantContextSecret,
  syntheticTenantIds,
} = {}) {
  return configureApplicationRole(client, {
    password,
    tenantContextSecret,
    tenantIds: normalizeSyntheticTenantIds(syntheticTenantIds),
    authorityScope: "synthetic-private-staging",
  });
}

export async function configureLawosProductionApplicationRole(client, {
  password,
  tenantContextSecret,
  approvedTenantIds,
} = {}) {
  return configureApplicationRole(client, {
    password,
    tenantContextSecret,
    tenantIds: normalizeProductionTenantIds(approvedTenantIds),
    authorityScope: "approved-production-tenants",
  });
}

export async function configureLawosRehearsalApplicationRole(client, {
  password,
  tenantContextSecret,
  approvedTenantIds,
} = {}) {
  return configureApplicationRole(client, {
    password,
    tenantContextSecret,
    tenantIds: normalizeProductionTenantIds(approvedTenantIds),
    authorityScope: "approved-private-rehearsal-tenants",
    roleName: LAWOS_REHEARSAL_APPLICATION_ROLE,
  });
}
