const ROLE_NAME = "lawos_app";
const SYNTHETIC_TENANT_PATTERN = /^tenant_lawos_staging_[a-z0-9_-]+$/u;

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
]);

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function quoteLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function normalizeSyntheticTenantIds(values) {
  const tenantIds = [...new Set((values ?? []).map((value) => requiredText(value, "synthetic tenant id")))].sort();
  if (tenantIds.length < 2 || tenantIds.some((tenantId) => !SYNTHETIC_TENANT_PATTERN.test(tenantId))) {
    throw new TypeError("at least two approved LawOS synthetic staging tenant ids are required");
  }
  return tenantIds;
}

export function lawosApplicationRoleGrantStatements() {
  return GRANTS;
}

export async function configureLawosApplicationRole(client, {
  password,
  tenantContextSecret,
  syntheticTenantIds,
} = {}) {
  if (!client || typeof client.query !== "function") throw new TypeError("PostgreSQL client is required");
  const rolePassword = requiredText(password, "application role password");
  const contextSecret = Buffer.from(requiredText(tenantContextSecret, "tenantContextSecret"), "utf8");
  if (contextSecret.byteLength < 32) throw new TypeError("tenantContextSecret must contain at least 32 bytes");
  const tenantIds = normalizeSyntheticTenantIds(syntheticTenantIds);
  let began = false;
  try {
    await client.query("BEGIN");
    began = true;
    const role = await client.query("SELECT 1 FROM pg_roles WHERE rolname = $1", [ROLE_NAME]);
    if (role.rowCount === 0) {
      await client.query(`CREATE ROLE ${ROLE_NAME} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20`);
    } else {
      await client.query(`ALTER ROLE ${ROLE_NAME} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 20`);
    }
    await client.query(`ALTER ROLE ${ROLE_NAME} PASSWORD ${quoteLiteral(rolePassword)}`);
    await client.query(`ALTER ROLE ${ROLE_NAME} SET statement_timeout = '30s'`);
    await client.query(`ALTER ROLE ${ROLE_NAME} SET lock_timeout = '5s'`);
    await client.query(`ALTER ROLE ${ROLE_NAME} SET idle_in_transaction_session_timeout = '30s'`);
    await client.query(`REVOKE CREATE ON SCHEMA public FROM ${ROLE_NAME}`);
    for (const statement of GRANTS) await client.query(statement);
    await client.query("DELETE FROM lawos_security.tenant_context_authorities WHERE database_role = $1 AND tenant_id <> ALL($2::text[])", [ROLE_NAME, tenantIds]);
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
        [ROLE_NAME, tenantId, contextSecret],
      );
    }
    await client.query("COMMIT");
    began = false;
    return Object.freeze({
      role_name: ROLE_NAME,
      grant_statement_count: GRANTS.length,
      tenant_authority_count: tenantIds.length,
      synthetic_wildcard_count: 0,
      password_returned: false,
      secret_material_returned: false,
    });
  } catch (error) {
    if (began) await client.query("ROLLBACK").catch(() => {});
    throw error;
  }
}
