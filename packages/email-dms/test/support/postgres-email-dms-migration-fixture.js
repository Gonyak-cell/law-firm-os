import { randomBytes } from "node:crypto";
import { createPostgresPool } from "../../../persistence/src/postgres/pool.js";
import { runPostgresMigrations } from "../../../persistence/src/postgres/migration-runner.js";
import { startDisposablePostgres } from "../../../persistence/test/helpers/disposable-postgres.js";
import { OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG as AUTHORITY } from "../../src/outlook-desktop-assignment-authority-catalog.js";

export const EMAIL_DMS_MIGRATION_ADMIN = "lawos_admin";
export const TEST_OUTLOOK_AUTHORITY_MANIFEST_SHA256 = "a".repeat(64);
export const TEST_OUTLOOK_MIGRATION_CATALOG_SHA256 = "b".repeat(64);
export const TEST_OUTLOOK_DATABASE_TARGET_RECEIPT_SHA256 = "c".repeat(64);

const MIGRATION_ROLES = Object.freeze(Object.entries(AUTHORITY.role_attributes)
  .map(([name, { login }]) => Object.freeze({ name, login })));
const NEW_ROLES = MIGRATION_ROLES.filter(({ name }) => name !== "lawos_app");
const ROLE_SECRETS = new WeakMap();

function roleOptions({ login }) {
  return `${login ? "LOGIN" : "NOLOGIN"} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`;
}

export async function createEmailDmsMigrationFixture(t, { appPoolMax = 10 } = {}) {
  const instance = await startDisposablePostgres(t, { registerCleanup: false });
  if (!instance) return null;
  const bootstrapPool = createPostgresPool({
    connectionString: instance.connection_string,
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-email-dms-bootstrap-test",
  });
  let adminPool;
  let appPool;
  const tenantContextSecret = randomBytes(32).toString("base64url");
  try {
    await bootstrapPool.query(`CREATE ROLE ${EMAIL_DMS_MIGRATION_ADMIN}
      LOGIN NOSUPERUSER CREATEDB CREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
    await bootstrapPool.query(`ALTER DATABASE postgres OWNER TO ${EMAIL_DMS_MIGRATION_ADMIN}`);
    const adminUrl = new URL(instance.connection_string);
    adminUrl.username = EMAIL_DMS_MIGRATION_ADMIN;
    adminPool = createPostgresPool({
      connectionString: adminUrl.toString(),
      sslMode: "disable",
      allowInsecureLocal: true,
      applicationName: "lawos-email-dms-migration-admin-test",
    });
    await runPostgresMigrations(adminPool, { appliedBy: "email-dms-authority-test" });
    await adminPool.query("CREATE ROLE lawos_app LOGIN NOINHERIT");
    await bootstrapPool.query("ALTER DATABASE postgres SET lawos.environment = 'synthetic-test'");
    await adminPool.query(
      `INSERT INTO lawos_security.tenant_context_authorities
         (database_role,tenant_id,context_secret,synthetic_wildcard)
       VALUES ('lawos_app','*',$1,true)`,
      [Buffer.from(tenantContextSecret, "utf8")],
    );
    const appUrl = new URL(instance.connection_string);
    appUrl.username = "lawos_app";
    appPool = createPostgresPool({
      connectionString: appUrl.toString(),
      sslMode: "disable",
      allowInsecureLocal: true,
      applicationName: "lawos-email-dms-app-test",
      tenantContextSecret,
      max: appPoolMax,
    });
  } catch (error) {
    await appPool?.end().catch(() => {});
    await adminPool?.end().catch(() => {});
    await bootstrapPool.end().catch(() => {});
    await instance.stop();
    throw error;
  }
  t.after(async () => {
    await appPool.end();
    await adminPool.end();
    await bootstrapPool.end();
    await instance.stop();
  });
  return Object.freeze({
    instance,adminPool,appPool,tenantContextSecret,bootstrapPool,
  });
}

export async function provisionEmailDmsMigrationRoles(adminPool) {
  const migrationAdmin = (await adminPool.query(
    `SELECT rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolinherit,
            rolreplication,rolbypassrls
       FROM pg_roles WHERE rolname=$1`, [EMAIL_DMS_MIGRATION_ADMIN],
  )).rows[0];
  if (!migrationAdmin) {
    await adminPool.query(`CREATE ROLE ${EMAIL_DMS_MIGRATION_ADMIN}
      LOGIN NOSUPERUSER CREATEDB CREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
  } else if (!migrationAdmin.rolcanlogin || migrationAdmin.rolsuper
      || !migrationAdmin.rolcreatedb || !migrationAdmin.rolcreaterole
      || migrationAdmin.rolinherit || migrationAdmin.rolreplication
      || migrationAdmin.rolbypassrls) {
    await adminPool.query(`ALTER ROLE ${EMAIL_DMS_MIGRATION_ADMIN}
      LOGIN NOSUPERUSER CREATEDB CREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`);
  }
  await adminPool.query(`GRANT CREATE ON DATABASE postgres TO ${EMAIL_DMS_MIGRATION_ADMIN}`);
  await adminPool.query(`ALTER SCHEMA lawos_meta OWNER TO ${EMAIL_DMS_MIGRATION_ADMIN}`);
  await adminPool.query(`GRANT USAGE ON SCHEMA lawos_security TO ${EMAIL_DMS_MIGRATION_ADMIN}`);
  await adminPool.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA lawos_security TO ${EMAIL_DMS_MIGRATION_ADMIN}`);
  const appAttributes = (await adminPool.query(
    `SELECT rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolinherit,
            rolreplication,rolbypassrls
       FROM pg_roles WHERE rolname='lawos_app'`,
  )).rows[0];
  if (!appAttributes?.rolcanlogin || appAttributes.rolsuper
      || appAttributes.rolcreatedb || appAttributes.rolcreaterole
      || appAttributes.rolinherit || appAttributes.rolreplication
      || appAttributes.rolbypassrls) {
    await adminPool.query(`ALTER ROLE lawos_app ${roleOptions({ login: true })}`);
  }
  await adminPool.query("ALTER ROLE lawos_app SET statement_timeout = '30s'");
  await adminPool.query("ALTER ROLE lawos_app SET lock_timeout = '5s'");
  await adminPool.query("ALTER ROLE lawos_app SET idle_in_transaction_session_timeout = '30s'");

  const client = await adminPool.connect();
  try {
    await client.query(`SET SESSION AUTHORIZATION ${EMAIL_DMS_MIGRATION_ADMIN}`);
    const existing = new Set((await client.query(
      "SELECT rolname FROM pg_roles WHERE rolname=ANY($1::text[])",
      [NEW_ROLES.map(({ name }) => name)],
    )).rows.map(({ rolname }) => rolname));
    for (const role of NEW_ROLES) {
      if (!existing.has(role.name)) {
        await client.query(`CREATE ROLE ${role.name} ${roleOptions(role)}`);
      }
    }
  } finally {
    await client.query("RESET SESSION AUTHORIZATION").catch(() => {});
    client.release();
  }
  for (const role of NEW_ROLES) {
    const attributes = (await adminPool.query(
      `SELECT rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolinherit,
              rolreplication,rolbypassrls
         FROM pg_roles WHERE rolname=$1`, [role.name],
    )).rows[0];
    if (attributes?.rolcanlogin !== role.login || attributes.rolsuper
        || attributes.rolcreatedb || attributes.rolcreaterole
        || attributes.rolinherit || attributes.rolreplication
        || attributes.rolbypassrls) {
      await adminPool.query(`ALTER ROLE ${role.name} ${roleOptions(role)}`);
    }
  }
  const secrets = new Map([["lawos_app", null]]);
  for (const name of [
    EMAIL_DMS_MIGRATION_ADMIN,
    ...NEW_ROLES.filter(({ login }) => login).map(({ name }) => name),
  ]) {
    const secret = randomBytes(32);
    secrets.set(name, secret);
    await adminPool.query(
      `INSERT INTO lawos_security.tenant_context_authorities
         (database_role,tenant_id,context_secret,synthetic_wildcard)
       VALUES ($1,'*',$2,true)
       ON CONFLICT (database_role,tenant_id) DO UPDATE
         SET context_secret=EXCLUDED.context_secret,synthetic_wildcard=true,
             active=true,rotated_at=clock_timestamp()`,
      [name, secret],
    );
  }
  ROLE_SECRETS.set(adminPool, secrets);
  const graph = await adminPool.query(
    `SELECT target.rolname,grantor.rolname AS grantor,
            membership.admin_option,membership.inherit_option,membership.set_option
       FROM pg_auth_members AS membership
       JOIN pg_roles AS target ON target.oid=membership.roleid
       JOIN pg_roles AS member ON member.oid=membership.member
       JOIN pg_roles AS grantor ON grantor.oid=membership.grantor
      WHERE member.rolname=$1 AND target.rolname=ANY($2::text[])
      ORDER BY target.rolname,grantor.rolname`,
    [EMAIL_DMS_MIGRATION_ADMIN, NEW_ROLES.map(({ name }) => name)],
  );
  if (graph.rowCount !== NEW_ROLES.length
      || graph.rows.some((row) => !row.admin_option || row.inherit_option || row.set_option)
      || new Set(graph.rows.map(({ grantor }) => grantor)).size !== 1) {
    throw new Error("disposable PostgreSQL did not produce the required PG16 role creator graph");
  }
  const appMembership = (await adminPool.query(
    `SELECT count(*)::integer AS count
       FROM pg_auth_members AS membership
       JOIN pg_roles AS target ON target.oid=membership.roleid
       JOIN pg_roles AS member ON member.oid=membership.member
       JOIN pg_roles AS grantor ON grantor.oid=membership.grantor
      WHERE target.rolname='lawos_app' AND member.rolname=$1
        AND grantor.rolname=$2 AND membership.admin_option
        AND NOT membership.inherit_option AND NOT membership.set_option`,
    [EMAIL_DMS_MIGRATION_ADMIN, graph.rows[0].grantor],
  )).rows[0].count;
  return Object.freeze({
    bootstrap_grantor: graph.rows[0].grantor,
    lawos_app_membership_present: appMembership === 1,
    edges: Object.freeze(graph.rows.map((row) => Object.freeze({ ...row }))),
  });
}

export async function runEmailDmsMigrationAsAdmin(adminPool, sql, {
  expectedRoleBootstrapSha256,
  expectedAuthorityManifestSha256,
  expectedDatabaseTargetReceiptSha256,
  expectedMigrationCatalogSha256,
} = {}) {
  const client = await adminPool.connect();
  try {
    await client.query("BEGIN");
    if (expectedRoleBootstrapSha256 !== undefined
        || expectedAuthorityManifestSha256 !== undefined
        || expectedDatabaseTargetReceiptSha256 !== undefined
        || expectedMigrationCatalogSha256 !== undefined) {
      if (![expectedRoleBootstrapSha256, expectedAuthorityManifestSha256,
        expectedDatabaseTargetReceiptSha256,
        expectedMigrationCatalogSha256].every((value) =>
        /^[a-f0-9]{64}$/u.test(value ?? ""))) {
        throw new TypeError("expected outlook authority digests are invalid");
      }
      await client.query(`
        CREATE TEMP TABLE outlook_authority_expected_receipt (
          schema_version text NOT NULL,
          role_bootstrap_sha256 text NOT NULL,
          authority_manifest_sha256 text NOT NULL,
          database_target_receipt_sha256 text NOT NULL,
          migration_catalog_sha256 text NOT NULL
        ) ON COMMIT DROP
      `);
      await client.query(
        `INSERT INTO outlook_authority_expected_receipt
           (schema_version,role_bootstrap_sha256,
            authority_manifest_sha256,database_target_receipt_sha256,
            migration_catalog_sha256)
         VALUES ('lawos.outlook-authority-role-bootstrap-receipt.v1',$1,$2,$3,$4)`,
        [expectedRoleBootstrapSha256, expectedAuthorityManifestSha256,
          expectedDatabaseTargetReceiptSha256,
          expectedMigrationCatalogSha256],
      );
    }
    const result = await client.query(sql);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export function createEmailDmsMigrationAdminPool(t, fixture, { max = 2 } = {}) {
  return createEmailDmsRolePool(t, fixture, EMAIL_DMS_MIGRATION_ADMIN, { max });
}

export function createEmailDmsRolePool(_t, fixture, role, { max = 4 } = {}) {
  const url = new URL(fixture.instance.connection_string);
  url.username = role;
  const pool = createPostgresPool({
    connectionString: url.toString(),
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: `lawos-email-dms-${role}-test`,
    tenantContextSecret: ROLE_SECRETS.get(fixture.adminPool)?.get(role)
      ?? fixture.tenantContextSecret,
    max,
  });
  return pool;
}
