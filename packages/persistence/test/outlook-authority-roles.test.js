import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import test from "node:test";
import { listEmailDmsPostgresMigrations } from "../../email-dms/src/migrations/index.js";
import {
  LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
  LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
  LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
  LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
  LAWOS_OUTLOOK_ROLE_BOOTSTRAP_SCHEMA_VERSION,
  assertLawosOutlookAuthorityVerification,
  assertLawosOutlookRoleBootstrapReceipt,
  configureLawosOutlookDatabaseRoles,
  lawosOutlookRoleBootstrapDigest,
  normalizeLawosOutlookAuthorityCatalog,
  verifyLawosOutlookApplicationRolePrecondition,
  verifyLawosOutlookAuthorityCatalog,
  verifyLawosOutlookDatabaseRoles,
} from "../src/postgres/outlook-authority-roles.js";
import { runPostgresMigrations } from "../src/postgres/migration-runner.js";
import { createPostgresPool } from "../src/postgres/pool.js";
import { startDisposablePostgres } from "./helpers/disposable-postgres.js";
import { syntheticNativeRdsReadiness } from "./helpers/native-rds-role-history.js";

const TENANT_CONTEXT_SECRET =
  "outlook-tenant-context-secret-at-least-32-bytes";
const SYNTHETIC_MIGRATION = Object.freeze({
  catalog_id: "synthetic-email-dms-007",
  schema_version: "law-firm-os.outlook-authority-catalog.v1",
  target_schema: "lawos_outlook_test",
});
const ASSIGNMENT_FUNCTION_BODY = `BEGIN
  IF session_user <> 'lawos_outlook_assignment_worker' THEN
    RAISE EXCEPTION 'unexpected assignment worker';
  END IF;
  RETURN value;
END`;
const CONSUME_FUNCTION_BODY = `BEGIN
  IF session_user <> 'lawos_app' THEN
    RAISE EXCEPTION 'unexpected application role';
  END IF;
  IF value IS NULL OR value !~ '^receipt_[a-z0-9_]{1,64}$' THEN
    RAISE EXCEPTION 'invalid receipt id';
  END IF;
  PERFORM 1
    FROM lawos_outlook_test.lifecycle_receipts
   WHERE receipt_id = value
     AND tenant_id = 'tenant_amic';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown receipt';
  END IF;
  RETURN value;
END`;
const MINT_FUNCTION_BODY = `BEGIN
  IF session_user <> 'lawos_outlook_lifecycle_verifier' THEN
    RAISE EXCEPTION 'unexpected lifecycle verifier';
  END IF;
  IF value IS NULL OR value !~ '^receipt_[a-z0-9_]{1,64}$' THEN
    RAISE EXCEPTION 'invalid receipt id';
  END IF;
  INSERT INTO lawos_outlook_test.lifecycle_receipts (receipt_id, tenant_id)
  VALUES (value, 'tenant_amic')
  ON CONFLICT (receipt_id) DO NOTHING;
  PERFORM 1
    FROM lawos_outlook_test.lifecycle_receipts
   WHERE receipt_id = value
     AND tenant_id = 'tenant_amic';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'receipt binding drifted';
  END IF;
  RETURN value;
END`;

function grant(privilege, grantable = false) {
  return { privilege, grantable };
}

function functionProtection(body) {
  return {
    language: "plpgsql",
    security_definer: true,
    configuration: ["search_path=pg_catalog"],
    body_sha256: createHash("sha256").update(body).digest("hex"),
  };
}

function syntheticAuthorityCatalog() {
  return {
    schema_version: "law-firm-os.outlook-authority-catalog.v1",
    catalog_id: "synthetic-email-dms-007",
    target_schema: "lawos_outlook_test",
    schemas: [{
      regnamespace: "lawos_outlook_test",
      owner: "lawos_admin",
      grants: {
        lawos_admin: [
          grant("CREATE"),
          grant("USAGE"),
        ],
        [LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE]: [grant("USAGE")],
        [LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE]: [grant("USAGE")],
        [LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE]: [grant("USAGE")],
        [LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE]: [grant("USAGE")],
        lawos_app: [grant("USAGE")],
      },
    }],
    tables: [{
      regclass: "lawos_outlook_test.assignment_jobs",
      regnamespace: "lawos_outlook_test",
      owner: LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      row_security: true,
      force_row_security: true,
      policies: [{
        name: "assignment_jobs_tenant_policy",
        permissive: true,
        command: "ALL",
        roles: ["public"],
        using_expression: "true",
        check_expression: "true",
      }],
      grants: {
        [LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE]: [
          "DELETE",
          "INSERT",
          "REFERENCES",
          "SELECT",
          "TRIGGER",
          "TRUNCATE",
          "UPDATE",
        ].map((privilege) => grant(privilege)),
        [LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE]: [
          grant("SELECT"),
          grant("UPDATE"),
        ],
        [LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE]: [
          grant("INSERT"),
          grant("SELECT"),
          grant("UPDATE"),
        ],
      },
    }, {
      regclass: "lawos_outlook_test.lifecycle_receipts",
      regnamespace: "lawos_outlook_test",
      owner: LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      row_security: true,
      force_row_security: true,
      policies: [{
        name: "lifecycle_receipts_tenant_policy",
        permissive: true,
        command: "ALL",
        roles: ["public"],
        using_expression: "true",
        check_expression: "true",
      }],
      grants: {
        [LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE]: [
          "DELETE",
          "INSERT",
          "REFERENCES",
          "SELECT",
          "TRIGGER",
          "TRUNCATE",
          "UPDATE",
        ].map((privilege) => grant(privilege)),
      },
    }],
    functions: [{
      regprocedure: "lawos_outlook_test.claim_assignment(text)",
      regnamespace: "lawos_outlook_test",
      owner: LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      ...functionProtection(ASSIGNMENT_FUNCTION_BODY),
      grants: {
        [LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE]: [grant("EXECUTE")],
        [LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE]: [grant("EXECUTE")],
      },
    }, {
      regprocedure: "lawos_outlook_test.consume_lifecycle_receipt(text)",
      regnamespace: "lawos_outlook_test",
      owner: LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      ...functionProtection(CONSUME_FUNCTION_BODY),
      grants: {
        [LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE]: [grant("EXECUTE")],
        lawos_app: [grant("EXECUTE")],
      },
    }, {
      regprocedure: "lawos_outlook_test.mint_lifecycle_receipt(text)",
      regnamespace: "lawos_outlook_test",
      owner: LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      ...functionProtection(MINT_FUNCTION_BODY),
      grants: {
        [LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE]: [grant("EXECUTE")],
        [LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE]: [grant("EXECUTE")],
      },
    }],
  };
}

async function createProductionLikeMigrationAdmin(pool, instance) {
  await pool.query(
    `CREATE ROLE lawos_admin LOGIN NOSUPERUSER CREATEDB CREATEROLE
       NOINHERIT NOREPLICATION NOBYPASSRLS`,
  );
  await pool.query("ALTER DATABASE postgres OWNER TO lawos_admin");
  const migrationAdminUrl = new URL(instance.connection_string);
  migrationAdminUrl.username = "lawos_admin";
  const migrationAdminPool = createPostgresPool({
    connectionString: migrationAdminUrl.toString(),
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-outlook-role-bootstrap-migration-admin-test",
    max: 1,
  });
  return migrationAdminPool;
}

async function createExactApplicationRole(client) {
  await client.query(
    `CREATE ROLE lawos_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE
       NOINHERIT NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 64
       PASSWORD 'application-password-value'`,
  );
  await client.query("ALTER ROLE lawos_app SET statement_timeout = '30s'");
  await client.query("ALTER ROLE lawos_app SET lock_timeout = '5s'");
  await client.query(
    "ALTER ROLE lawos_app SET idle_in_transaction_session_timeout = '30s'",
  );
}

async function applyEmailDmsThrough006(client) {
  for (const migration of listEmailDmsPostgresMigrations()) {
    if (migration.id === "007_outlook_desktop_assignment") break;
    await client.query(migration.sql);
  }
}

function outlookRoleConfiguration(overrides = {}) {
  return {
    migrationAdminRole: "lawos_admin",
    migration: SYNTHETIC_MIGRATION,
    controlPassword: "control-password-value",
    assignmentPassword: "assignment-password-value",
    lifecycleVerifierPassword: "lifecycle-password-value",
    tenantContextSecret: TENANT_CONTEXT_SECRET,
    approvedTenantIds: ["tenant_amic", "tenant_client_001"],
    ...overrides,
  };
}

function recordingRoleConfigurationClient(client, {
  loseCommitResponse = false,
  failTenantAuthorityWrite = false,
} = {}) {
  const statements = [];
  const retainedBuffers = [];
  let commitResponseLost = false;
  return {
    statements,
    retainedBuffers,
    client: {
      async query(statement, values) {
        const sql = String(statement).trim();
        statements.push(sql);
        for (const value of values ?? []) {
          if (Buffer.isBuffer(value)) retainedBuffers.push(value);
        }
        if (failTenantAuthorityWrite
          && /^INSERT INTO lawos_security\.tenant_context_authorities\b/iu
            .test(sql)) {
          throw new Error("synthetic tenant authority pre-COMMIT failure");
        }
        const result = await client.query(statement, values);
        if (loseCommitResponse && !commitResponseLost && /^COMMIT$/iu.test(sql)) {
          commitResponseLost = true;
          throw new Error("synthetic role COMMIT response loss");
        }
        return result;
      },
    },
  };
}

function assertZeroedBuffers(buffers) {
  assert.ok(buffers.length > 0);
  for (const buffer of buffers) {
    assert.ok(buffer.every((value) => value === 0));
  }
}

function roleState({ oid, name, canLogin, inherit = false, config = [] }) {
  return {
    oid,
    name,
    can_login: canLogin,
    superuser: false,
    createdb: false,
    createrole: false,
    inherit,
    replication: false,
    bypass_rls: false,
    connection_limit: name === "lawos_app" ? 64 : -1,
    valid_until_present: false,
    valid_until: null,
    config_count: config.length,
    config,
  };
}

function knownRoleBootstrap({ applicationMembership = true } = {}) {
  const migrationAdmin = {
    ...roleState({
      oid: 16_384,
      name: "lawos_admin",
      canLogin: true,
    }),
    createdb: true,
    createrole: true,
  };
  const roles = [
    roleState({
      oid: 16_390,
      name: "lawos_app",
      canLogin: true,
      config: [
        "idle_in_transaction_session_timeout=30s",
        "lock_timeout=5s",
        "statement_timeout=30s",
      ],
    }),
    roleState({
      oid: 16_392,
      name: LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      canLogin: true,
    }),
    roleState({
      oid: 16_391,
      name: LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      canLogin: false,
    }),
    roleState({
      oid: 16_393,
      name: LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      canLogin: true,
    }),
    roleState({
      oid: 16_394,
      name: LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
      canLogin: true,
    }),
  ].sort((left, right) => left.name.localeCompare(right.name));
  const bootstrapGrantor = { oid: 10, name: "bootstrap_superuser" };
  const membershipFor = (role) => ({
    granted_role: { oid: role.oid, name: role.name },
    member: { oid: migrationAdmin.oid, name: migrationAdmin.name },
    grantor: bootstrapGrantor,
    admin_option: true,
    inherit_option: false,
    set_option: false,
  });
  return {
    schema_version: LAWOS_OUTLOOK_ROLE_BOOTSTRAP_SCHEMA_VERSION,
    postgres_major: 16,
    database: { oid: 5, name: "lawos_fixture" },
    migration: SYNTHETIC_MIGRATION,
    schema_owners: {
      lawos_email_dms: { oid: migrationAdmin.oid, name: migrationAdmin.name },
      lawos_meta: { oid: migrationAdmin.oid, name: migrationAdmin.name },
    },
    migration_admin: migrationAdmin,
    bootstrap_grantor: bootstrapGrantor,
    roles,
    memberships: roles
      .filter(({ name }) => name !== "lawos_app" || applicationMembership)
      .map(membershipFor),
  };
}

function readinessForBootstrap(roleBootstrap, tenantAuthorityCount = 3) {
  const applicationMembershipCount = roleBootstrap.memberships.filter(
    ({ granted_role: grantedRole }) => grantedRole.name === "lawos_app",
  ).length;
  return {
    schema_version: "law-firm-os.outlook-role-readiness.v2",
    role_count: 4,
    login_role_count: 3,
    tenant_authority_count: tenantAuthorityCount,
    membership_edge_count: roleBootstrap.memberships.length,
    protected_membership_edge_count: 4,
    application_membership_edge_count: applicationMembershipCount,
    synthetic_wildcard_count: 0,
    role_bootstrap: roleBootstrap,
    role_bootstrap_sha256: lawosOutlookRoleBootstrapDigest(roleBootstrap),
    password_returned: false,
    secret_material_returned: false,
  };
}

async function sqlRoleBootstrapDigest(client, roleBootstrap) {
  const result = await client.query(
    `WITH receipt AS (
       SELECT $1::jsonb AS value
     ), roles AS (
       SELECT role,
              row_number() OVER (ORDER BY role->>'name')::int AS role_index
         FROM receipt
         CROSS JOIN LATERAL jsonb_array_elements(value->'roles') AS role
     ), memberships AS (
       SELECT membership,
              row_number() OVER (
                ORDER BY membership#>>'{granted_role,name}',
                         membership#>>'{member,name}',
                         membership#>>'{grantor,name}',
                         (membership#>>'{granted_role,oid}')::oid,
                         (membership#>>'{member,oid}')::oid,
                         (membership#>>'{grantor,oid}')::oid
              )::int AS membership_index
         FROM receipt
         CROSS JOIN LATERAL jsonb_array_elements(
           value->'memberships'
         ) AS membership
     ), fields(sort_key, value) AS (
       SELECT ARRAY[0],
              'lawos.outlook-authority-role-bootstrap-receipt.sha256.v1'
       UNION ALL SELECT ARRAY[1], value->>'schema_version' FROM receipt
       UNION ALL SELECT ARRAY[2], value->>'postgres_major' FROM receipt
       UNION ALL SELECT ARRAY[3], value#>>'{database,oid}' FROM receipt
       UNION ALL SELECT ARRAY[4], value#>>'{database,name}' FROM receipt
       UNION ALL SELECT ARRAY[5], value#>>'{migration,catalog_id}' FROM receipt
       UNION ALL SELECT ARRAY[6], value#>>'{migration,schema_version}' FROM receipt
       UNION ALL SELECT ARRAY[7], value#>>'{migration,target_schema}' FROM receipt
       UNION ALL SELECT ARRAY[8], value#>>'{schema_owners,lawos_email_dms,oid}' FROM receipt
       UNION ALL SELECT ARRAY[9], value#>>'{schema_owners,lawos_email_dms,name}' FROM receipt
       UNION ALL SELECT ARRAY[10], value#>>'{schema_owners,lawos_meta,oid}' FROM receipt
       UNION ALL SELECT ARRAY[11], value#>>'{schema_owners,lawos_meta,name}' FROM receipt
       UNION ALL SELECT ARRAY[12, 0], value#>>'{migration_admin,oid}' FROM receipt
       UNION ALL SELECT ARRAY[12, 1], value#>>'{migration_admin,name}' FROM receipt
       UNION ALL SELECT ARRAY[12, 2], value#>>'{migration_admin,can_login}' FROM receipt
       UNION ALL SELECT ARRAY[12, 3], value#>>'{migration_admin,superuser}' FROM receipt
       UNION ALL SELECT ARRAY[12, 4], value#>>'{migration_admin,createdb}' FROM receipt
       UNION ALL SELECT ARRAY[12, 5], value#>>'{migration_admin,createrole}' FROM receipt
       UNION ALL SELECT ARRAY[12, 6], value#>>'{migration_admin,inherit}' FROM receipt
       UNION ALL SELECT ARRAY[12, 7], value#>>'{migration_admin,replication}' FROM receipt
       UNION ALL SELECT ARRAY[12, 8], value#>>'{migration_admin,bypass_rls}' FROM receipt
       UNION ALL SELECT ARRAY[12, 9], value#>>'{migration_admin,connection_limit}' FROM receipt
       UNION ALL SELECT ARRAY[12, 10], value#>>'{migration_admin,valid_until_present}' FROM receipt
       UNION ALL SELECT ARRAY[12, 11], COALESCE(value#>>'{migration_admin,valid_until}', '') FROM receipt
       UNION ALL SELECT ARRAY[12, 12], jsonb_array_length(value#>'{migration_admin,config}')::text FROM receipt
       UNION ALL
       SELECT ARRAY[12, 13, config.ordinality::int], config.setting
         FROM receipt
         CROSS JOIN LATERAL jsonb_array_elements_text(
           value#>'{migration_admin,config}'
         ) WITH ORDINALITY AS config(setting, ordinality)
       UNION ALL SELECT ARRAY[13], value#>>'{bootstrap_grantor,oid}' FROM receipt
       UNION ALL SELECT ARRAY[14], value#>>'{bootstrap_grantor,name}' FROM receipt
       UNION ALL SELECT ARRAY[15], jsonb_array_length(value->'roles')::text FROM receipt
       UNION ALL SELECT ARRAY[16, role_index, 0], role->>'oid' FROM roles
       UNION ALL SELECT ARRAY[16, role_index, 1], role->>'name' FROM roles
       UNION ALL SELECT ARRAY[16, role_index, 2], role->>'can_login' FROM roles
       UNION ALL SELECT ARRAY[16, role_index, 3], role->>'superuser' FROM roles
       UNION ALL SELECT ARRAY[16, role_index, 4], role->>'createdb' FROM roles
       UNION ALL SELECT ARRAY[16, role_index, 5], role->>'createrole' FROM roles
       UNION ALL SELECT ARRAY[16, role_index, 6], role->>'inherit' FROM roles
       UNION ALL SELECT ARRAY[16, role_index, 7], role->>'replication' FROM roles
       UNION ALL SELECT ARRAY[16, role_index, 8], role->>'bypass_rls' FROM roles
       UNION ALL SELECT ARRAY[16, role_index, 9], role->>'connection_limit' FROM roles
       UNION ALL SELECT ARRAY[16, role_index, 10], role->>'valid_until_present' FROM roles
       UNION ALL SELECT ARRAY[16, role_index, 11], COALESCE(role->>'valid_until', '') FROM roles
       UNION ALL SELECT ARRAY[16, role_index, 12], jsonb_array_length(role->'config')::text FROM roles
       UNION ALL
       SELECT ARRAY[16, roles.role_index, 13, config.ordinality::int],
              config.setting
         FROM roles
         CROSS JOIN LATERAL jsonb_array_elements_text(
           roles.role->'config'
         ) WITH ORDINALITY AS config(setting, ordinality)
       UNION ALL
       SELECT ARRAY[17], EXISTS (
         SELECT 1 FROM memberships
          WHERE membership#>>'{granted_role,name}' = 'lawos_app'
       )::text
       UNION ALL SELECT ARRAY[18], jsonb_array_length(value->'memberships')::text FROM receipt
       UNION ALL SELECT ARRAY[19, membership_index, 0], membership#>>'{granted_role,oid}' FROM memberships
       UNION ALL SELECT ARRAY[19, membership_index, 1], membership#>>'{granted_role,name}' FROM memberships
       UNION ALL SELECT ARRAY[19, membership_index, 2], membership#>>'{member,oid}' FROM memberships
       UNION ALL SELECT ARRAY[19, membership_index, 3], membership#>>'{member,name}' FROM memberships
       UNION ALL SELECT ARRAY[19, membership_index, 4], membership#>>'{grantor,oid}' FROM memberships
       UNION ALL SELECT ARRAY[19, membership_index, 5], membership#>>'{grantor,name}' FROM memberships
       UNION ALL SELECT ARRAY[19, membership_index, 6], membership->>'admin_option' FROM memberships
       UNION ALL SELECT ARRAY[19, membership_index, 7], membership->>'inherit_option' FROM memberships
       UNION ALL SELECT ARRAY[19, membership_index, 8], membership->>'set_option' FROM memberships
     )
     SELECT encode(pg_catalog.sha256(string_agg(
              int4send(octet_length(convert_to(value, 'UTF8')))
                || convert_to(value, 'UTF8'),
              ''::bytea ORDER BY sort_key
            )), 'hex') AS sha256
       FROM fields`,
    [JSON.stringify(roleBootstrap)],
  );
  return result.rows[0].sha256;
}

test("Outlook role bootstrap captures only PG16 automatic creator memberships", async (t) => {
  const instance = await startDisposablePostgres(t, { registerCleanup: false });
  if (!instance) return;
  const pool = createPostgresPool({
    connectionString: instance.connection_string,
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-outlook-role-bootstrap-superuser-test",
    max: 1,
  });
  let migrationAdminPool;
  t.after(async () => {
    await migrationAdminPool?.end();
    await pool.end();
    await instance.stop();
  });
  migrationAdminPool = await createProductionLikeMigrationAdmin(
    pool,
    instance,
  );
  await runPostgresMigrations(migrationAdminPool, {
    appliedBy: "outlook-role-bootstrap-membership-test",
  });
  await assert.rejects(
    verifyLawosOutlookApplicationRolePrecondition(migrationAdminPool, {
      migrationAdminRole: "lawos_admin",
      expectedApplicationMembershipPresent: false,
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
  );
  await createExactApplicationRole(pool);
  for (const roleName of ["lawos_admin", "lawos_app"]) {
    await pool.query(`ALTER ROLE ${roleName} INHERIT`);
    await assert.rejects(
      verifyLawosOutlookApplicationRolePrecondition(migrationAdminPool, {
        migrationAdminRole: "lawos_admin",
        expectedApplicationMembershipPresent: false,
      }),
      (error) => error?.code === (roleName === "lawos_admin"
        ? "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT"
        : "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT"),
    );
    await pool.query(`ALTER ROLE ${roleName} NOINHERIT`);
  }
  await pool.query(
    "CREATE ROLE lawos_unexpected_admin_parent NOLOGIN NOSUPERUSER CREATEDB NOINHERIT",
  );
  await pool.query(
    "GRANT lawos_unexpected_admin_parent TO lawos_admin WITH SET TRUE, INHERIT FALSE, ADMIN FALSE",
  );
  await assert.rejects(
    verifyLawosOutlookApplicationRolePrecondition(migrationAdminPool, {
      migrationAdminRole: "lawos_admin",
      expectedApplicationMembershipPresent: false,
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_MEMBERSHIP_DRIFT",
  );
  await pool.query("REVOKE lawos_unexpected_admin_parent FROM lawos_admin");
  await pool.query("DROP ROLE lawos_unexpected_admin_parent");
  const applicationRolePrecondition =
    await verifyLawosOutlookApplicationRolePrecondition(
      migrationAdminPool,
      {
        migrationAdminRole: "lawos_admin",
        expectedApplicationMembershipPresent: false,
      },
    );
  await applyEmailDmsThrough006(migrationAdminPool);
  const version = await pool.query(
    "SELECT current_setting('server_version_num')::int AS version_num",
  );
  assert.equal(Math.trunc(version.rows[0].version_num / 10_000), 16);
  await pool.query("ALTER ROLE lawos_app SET statement_timeout = '31s'");
  await assert.rejects(
    configureLawosOutlookDatabaseRoles(
      migrationAdminPool,
      outlookRoleConfiguration({
        approvedTenantIds: ["tenant_amic"],
        applicationRolePrecondition,
      }),
    ),
    (error) => error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
  );
  await pool.query("ALTER ROLE lawos_app SET statement_timeout = '30s'");
  await pool.query(`
    CREATE FUNCTION lawos_security.reject_outlook_role_bootstrap_test()
    RETURNS trigger LANGUAGE plpgsql AS $test_failure$
    BEGIN
      RAISE EXCEPTION 'synthetic tenant authority write failure';
    END
    $test_failure$
  `);
  await pool.query(`
    CREATE TRIGGER reject_outlook_role_bootstrap_test
      BEFORE INSERT ON lawos_security.tenant_context_authorities
      FOR EACH ROW EXECUTE FUNCTION
        lawos_security.reject_outlook_role_bootstrap_test()
  `);
  await assert.rejects(
    configureLawosOutlookDatabaseRoles(
      migrationAdminPool,
      outlookRoleConfiguration({
        approvedTenantIds: ["tenant_amic"],
        applicationRolePrecondition,
      }),
    ),
    /synthetic tenant authority write failure/u,
  );
  assert.equal((await pool.query(
    `SELECT count(*)::int AS role_count
       FROM pg_roles
      WHERE rolname = ANY($1::name[])`,
    [[
      LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
    ]],
  )).rows[0].role_count, 0);
  assert.equal((await pool.query(
    `SELECT count(*)::int AS edge_count
       FROM pg_auth_members AS membership
       JOIN pg_roles AS granted ON granted.oid = membership.roleid
       JOIN pg_roles AS member ON member.oid = membership.member
      WHERE granted.rolname = ANY($1::name[])
         OR member.rolname = ANY($1::name[])`,
    [[
      LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
    ]],
  )).rows[0].edge_count, 0);
  await pool.query(
    `DROP TRIGGER reject_outlook_role_bootstrap_test
       ON lawos_security.tenant_context_authorities`,
  );
  await pool.query(
    "DROP FUNCTION lawos_security.reject_outlook_role_bootstrap_test()",
  );

  const configured = await configureLawosOutlookDatabaseRoles(
    migrationAdminPool,
    outlookRoleConfiguration({
      approvedTenantIds: ["tenant_amic"],
      applicationRolePrecondition,
    }),
  );
  assert.equal(configured.membership_edge_count, 4);
  assert.equal(configured.protected_membership_edge_count, 4);
  assert.equal(configured.application_membership_edge_count, 0);
  assert.match(configured.role_bootstrap_sha256, /^[0-9a-f]{64}$/u);
  assert.equal(
    await sqlRoleBootstrapDigest(pool, configured.role_bootstrap),
    configured.role_bootstrap_sha256,
  );
  assert.equal(configured.role_bootstrap.migration_admin.name, "lawos_admin");
  assert.equal(configured.role_bootstrap.migration_admin.superuser, false);
  assert.equal(configured.role_bootstrap.migration_admin.createdb, true);
  assert.equal(configured.role_bootstrap.migration_admin.createrole, true);
  assert.notEqual(
    configured.role_bootstrap.bootstrap_grantor.name,
    "lawos_admin",
  );

  const memberships = await pool.query(
    `SELECT granted.rolname AS granted_role,
            member.rolname AS member_role,
            grantor.rolname AS grantor_role,
            membership.admin_option,
            membership.inherit_option,
            membership.set_option
       FROM pg_auth_members AS membership
       JOIN pg_roles AS granted ON granted.oid = membership.roleid
       JOIN pg_roles AS member ON member.oid = membership.member
       JOIN pg_roles AS grantor ON grantor.oid = membership.grantor
      WHERE granted.rolname = ANY($1::name[])
         OR member.rolname = ANY($1::name[])
      ORDER BY granted.rolname, member.rolname, grantor.rolname`,
    [[
      "lawos_app",
      LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
    ]],
  );
  assert.equal(memberships.rowCount, 4);
  for (const row of memberships.rows) {
    assert.equal(row.member_role, "lawos_admin");
    assert.equal(
      row.grantor_role,
      configured.role_bootstrap.bootstrap_grantor.name,
    );
    assert.equal(row.admin_option, true);
    assert.equal(row.inherit_option, false);
    assert.equal(row.set_option, false);
  }

  await migrationAdminPool.query(
    `GRANT ${LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE} TO lawos_admin
       WITH SET TRUE, INHERIT FALSE, ADMIN FALSE`,
  );
  await assert.rejects(
    verifyLawosOutlookDatabaseRoles(migrationAdminPool, {
      migrationAdminRole: "lawos_admin",
      migration: SYNTHETIC_MIGRATION,
      approvedTenantIds: ["tenant_amic"],
      expectedRoleBootstrap: configured,
    }),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_MEMBERSHIP_DRIFT",
  );
  await migrationAdminPool.query(
    `REVOKE ${LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE} FROM lawos_admin`,
  );
  const verified = await verifyLawosOutlookDatabaseRoles(
    migrationAdminPool,
    {
      migrationAdminRole: "lawos_admin",
      migration: SYNTHETIC_MIGRATION,
      approvedTenantIds: ["tenant_amic"],
      expectedRoleBootstrap: configured,
    },
  );
  assert.equal(
    verified.role_bootstrap_sha256,
    configured.role_bootstrap_sha256,
  );

  await pool.query("ALTER ROLE lawos_admin INHERIT");
  await assert.rejects(
    verifyLawosOutlookDatabaseRoles(migrationAdminPool, {
      migrationAdminRole: "lawos_admin",
      migration: SYNTHETIC_MIGRATION,
      approvedTenantIds: ["tenant_amic"],
      expectedRoleBootstrap: configured,
    }),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT",
  );
  await pool.query("ALTER ROLE lawos_admin NOINHERIT");
  await pool.query("ALTER ROLE lawos_admin NOCREATEDB");
  await assert.rejects(
    verifyLawosOutlookDatabaseRoles(migrationAdminPool, {
      migrationAdminRole: "lawos_admin",
      migration: SYNTHETIC_MIGRATION,
      approvedTenantIds: ["tenant_amic"],
    }),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT",
  );
  await pool.query("ALTER ROLE lawos_admin CREATEDB");
  await pool.query("ALTER SCHEMA lawos_email_dms OWNER TO CURRENT_USER");
  await assert.rejects(
    verifyLawosOutlookDatabaseRoles(migrationAdminPool, {
      migrationAdminRole: "lawos_admin",
      migration: SYNTHETIC_MIGRATION,
      approvedTenantIds: ["tenant_amic"],
    }),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT",
  );
  await pool.query("ALTER SCHEMA lawos_email_dms OWNER TO lawos_admin");
});

test("Outlook role configuration maps a lost COMMIT response without rollback", async (t) => {
  const instance = await startDisposablePostgres(t, { registerCleanup: false });
  if (!instance) return;
  const pool = createPostgresPool({
    connectionString: instance.connection_string,
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-outlook-role-commit-unknown-test",
    max: 1,
  });
  let migrationAdminPool;
  t.after(async () => {
    await migrationAdminPool?.end();
    await pool.end();
    await instance.stop();
  });
  migrationAdminPool = await createProductionLikeMigrationAdmin(pool, instance);
  await runPostgresMigrations(migrationAdminPool, {
    appliedBy: "outlook-role-commit-unknown-test",
  });
  await createExactApplicationRole(migrationAdminPool);
  const applicationRolePrecondition =
    await verifyLawosOutlookApplicationRolePrecondition(
      migrationAdminPool,
      {
        migrationAdminRole: "lawos_admin",
        expectedApplicationMembershipPresent: true,
      },
    );
  await applyEmailDmsThrough006(migrationAdminPool);

  const unknown = Object.assign(new Error("closed synthetic COMMIT unknown"), {
    code: "LAWOS_OUTLOOK_POSTGRES_COMMIT_UNKNOWN",
  });
  const lost = recordingRoleConfigurationClient(migrationAdminPool, {
    loseCommitResponse: true,
  });
  let preCommitReadiness;
  await assert.rejects(
    configureLawosOutlookDatabaseRoles(
      lost.client,
      outlookRoleConfiguration({
        applicationRolePrecondition,
        createRoleConfigurationCommitUnknownError(readiness) {
          preCommitReadiness = readiness;
          return unknown;
        },
      }),
    ),
    (error) => error === unknown,
  );
  assert.match(preCommitReadiness.role_bootstrap_sha256, /^[a-f0-9]{64}$/u);
  const commitIndex = lost.statements.findIndex((sql) => /^COMMIT$/iu.test(sql));
  assert.ok(commitIndex >= 0);
  assert.equal(
    lost.statements.slice(commitIndex + 1).some((sql) => /^ROLLBACK$/iu.test(sql)),
    false,
  );
  assert.equal((await pool.query(
    `SELECT count(*)::int AS role_count
       FROM pg_roles
      WHERE rolname = ANY($1::name[])`,
    [[
      LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
    ]],
  )).rows[0].role_count, 4);

  const recovery = recordingRoleConfigurationClient(migrationAdminPool);
  const recovered = await configureLawosOutlookDatabaseRoles(
    recovery.client,
    outlookRoleConfiguration({
      applicationRolePrecondition,
    }),
  );
  assert.equal(
    recovered.role_bootstrap_sha256,
    preCommitReadiness.role_bootstrap_sha256,
  );
});

test("Outlook role configuration zeroizes its tenant-context Buffer before client validation", async () => {
  const invalidClientSecret = Buffer.from(TENANT_CONTEXT_SECRET);
  await assert.rejects(
    configureLawosOutlookDatabaseRoles(
      null,
      outlookRoleConfiguration({ tenantContextSecret: invalidClientSecret }),
    ),
    /PostgreSQL client is required/u,
  );
  assertZeroedBuffers([invalidClientSecret]);
});

test("Outlook role configuration zeroizes tenant-context Buffers on success, failure, and COMMIT unknown", async (t) => {
  const instance = await startDisposablePostgres(t, { registerCleanup: false });
  if (!instance) return;
  const pool = createPostgresPool({
    connectionString: instance.connection_string,
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-outlook-role-buffer-zeroization-test",
    max: 1,
  });
  let migrationAdminPool;
  t.after(async () => {
    await migrationAdminPool?.end();
    await pool.end();
    await instance.stop();
  });
  migrationAdminPool = await createProductionLikeMigrationAdmin(pool, instance);
  await runPostgresMigrations(migrationAdminPool, {
    appliedBy: "outlook-role-buffer-zeroization-test",
  });
  await createExactApplicationRole(migrationAdminPool);
  const applicationRolePrecondition =
    await verifyLawosOutlookApplicationRolePrecondition(
      migrationAdminPool,
      {
        migrationAdminRole: "lawos_admin",
        expectedApplicationMembershipPresent: true,
      },
    );
  await applyEmailDmsThrough006(migrationAdminPool);

  const successSecret = Buffer.from(TENANT_CONTEXT_SECRET);
  const success = recordingRoleConfigurationClient(migrationAdminPool);
  await configureLawosOutlookDatabaseRoles(
    success.client,
    outlookRoleConfiguration({
      applicationRolePrecondition,
      tenantContextSecret: successSecret,
    }),
  );
  assertZeroedBuffers([successSecret, ...success.retainedBuffers]);

  const failedSecret = Buffer.from(TENANT_CONTEXT_SECRET);
  const failed = recordingRoleConfigurationClient(migrationAdminPool, {
    failTenantAuthorityWrite: true,
  });
  await assert.rejects(
    configureLawosOutlookDatabaseRoles(
      failed.client,
      outlookRoleConfiguration({
        applicationRolePrecondition,
        tenantContextSecret: failedSecret,
      }),
    ),
    /synthetic tenant authority pre-COMMIT failure/u,
  );
  assert.ok(failed.statements.some((sql) => /^ROLLBACK$/iu.test(sql)));
  assertZeroedBuffers([failedSecret, ...failed.retainedBuffers]);

  const unknown = Object.assign(new Error("closed synthetic COMMIT unknown"), {
    code: "LAWOS_OUTLOOK_POSTGRES_COMMIT_UNKNOWN",
  });
  const unknownSecret = Buffer.from(TENANT_CONTEXT_SECRET);
  const lost = recordingRoleConfigurationClient(migrationAdminPool, {
    loseCommitResponse: true,
  });
  let unknownReadiness;
  await assert.rejects(
    configureLawosOutlookDatabaseRoles(
      lost.client,
      outlookRoleConfiguration({
        applicationRolePrecondition,
        tenantContextSecret: unknownSecret,
        createRoleConfigurationCommitUnknownError(readiness) {
          unknownReadiness = readiness;
          return unknown;
        },
      }),
    ),
    (error) => error === unknown,
  );
  assertZeroedBuffers([unknownSecret, ...lost.retainedBuffers]);

  const recoverySecret = Buffer.from(TENANT_CONTEXT_SECRET);
  const recovery = recordingRoleConfigurationClient(migrationAdminPool);
  const recovered = await configureLawosOutlookDatabaseRoles(
    recovery.client,
    outlookRoleConfiguration({
      applicationRolePrecondition,
      tenantContextSecret: recoverySecret,
    }),
  );
  assert.equal(
    recovered.role_bootstrap_sha256,
    unknownReadiness.role_bootstrap_sha256,
  );
  assertZeroedBuffers([recoverySecret, ...recovery.retainedBuffers]);
});

test("Outlook database roles and synthetic 007 authority stay exact in disposable PostgreSQL", async (t) => {
  const instance = await startDisposablePostgres(t, { registerCleanup: false });
  if (!instance) return;
  const pool = createPostgresPool({
    connectionString: instance.connection_string,
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-outlook-authority-role-test",
    max: 2,
  });
  let client;
  let migrationAdminPool;
  let lifecyclePool;
  let applicationPool;
  t.after(async () => {
    await lifecyclePool?.end();
    await applicationPool?.end();
    await migrationAdminPool?.end();
    client?.release();
    await pool.end();
    await instance.stop();
  });
  migrationAdminPool = await createProductionLikeMigrationAdmin(
    pool,
    instance,
  );
  await runPostgresMigrations(migrationAdminPool, {
    appliedBy: "outlook-authority-role-test",
  });
  await createExactApplicationRole(migrationAdminPool);
  const applicationRolePrecondition =
    await verifyLawosOutlookApplicationRolePrecondition(
      migrationAdminPool,
      {
        migrationAdminRole: "lawos_admin",
        expectedApplicationMembershipPresent: true,
      },
    );
  await applyEmailDmsThrough006(migrationAdminPool);
  client = await pool.connect();

  await assert.rejects(
    configureLawosOutlookDatabaseRoles(
      migrationAdminPool,
      outlookRoleConfiguration({
        controlPassword: "duplicate-password",
        assignmentPassword: "duplicate-password",
        approvedTenantIds: ["tenant_amic"],
        applicationRolePrecondition,
      }),
    ),
    /independent/u,
  );

  const configured = await configureLawosOutlookDatabaseRoles(
    migrationAdminPool,
    outlookRoleConfiguration({
      approvedTenantIds: [
        "tenant_amic",
        "tenant_client_001",
        "tenant_amic",
      ],
      applicationRolePrecondition,
    }),
  );
  assert.equal(configured.role_count, 4);
  assert.equal(configured.login_role_count, 3);
  assert.equal(configured.tenant_authority_count, 6);
  assert.equal(configured.membership_edge_count, 5);
  assert.equal(configured.protected_membership_edge_count, 4);
  assert.equal(configured.application_membership_edge_count, 1);
  assert.equal(configured.synthetic_wildcard_count, 0);
  assert.equal(configured.password_returned, false);
  assert.equal(JSON.stringify(configured).includes("password-value"), false);
  assert.equal(
    await sqlRoleBootstrapDigest(pool, configured.role_bootstrap),
    configured.role_bootstrap_sha256,
  );

  const roles = await pool.query(
    `SELECT rolname, rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
            rolinherit, rolreplication, rolbypassrls
       FROM pg_roles
      WHERE rolname = ANY($1::name[])
      ORDER BY rolname`,
    [[
      LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
    ]],
  );
  assert.deepEqual(roles.rows, [
    {
      rolname: LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      rolcanlogin: true,
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolinherit: false,
      rolreplication: false,
      rolbypassrls: false,
    },
    {
      rolname: LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      rolcanlogin: false,
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolinherit: false,
      rolreplication: false,
      rolbypassrls: false,
    },
    {
      rolname: LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      rolcanlogin: true,
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolinherit: false,
      rolreplication: false,
      rolbypassrls: false,
    },
    {
      rolname: LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
      rolcanlogin: true,
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolinherit: false,
      rolreplication: false,
      rolbypassrls: false,
    },
  ]);
  const membership = await pool.query(
    `SELECT granted.rolname AS granted_role, member.rolname AS member_role,
            grantor.rolname AS grantor_role, membership.admin_option,
            membership.inherit_option, membership.set_option
       FROM pg_auth_members AS membership
       JOIN pg_roles AS granted ON granted.oid = membership.roleid
       JOIN pg_roles AS member ON member.oid = membership.member
       JOIN pg_roles AS grantor ON grantor.oid = membership.grantor
      WHERE granted.rolname = ANY($1::name[])
         OR member.rolname = ANY($1::name[])`,
    [[
      "lawos_app",
      LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
    ]],
  );
  assert.equal(membership.rowCount, 5);
  for (const row of membership.rows) {
    assert.equal(row.member_role, "lawos_admin");
    assert.equal(
      row.grantor_role,
      configured.role_bootstrap.bootstrap_grantor.name,
    );
    assert.equal(row.admin_option, true);
    assert.equal(row.inherit_option, false);
    assert.equal(row.set_option, false);
  }
  const authorities = await pool.query(
    `SELECT database_role, tenant_id, synthetic_wildcard, active
       FROM lawos_security.tenant_context_authorities
      WHERE database_role = ANY($1::name[])
      ORDER BY database_role, tenant_id`,
    [[
      LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
      LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
    ]],
  );
  assert.deepEqual(authorities.rows, [
    {
      database_role: LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      tenant_id: "tenant_amic",
      synthetic_wildcard: false,
      active: true,
    },
    {
      database_role: LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      tenant_id: "tenant_client_001",
      synthetic_wildcard: false,
      active: true,
    },
    {
      database_role: LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      tenant_id: "tenant_amic",
      synthetic_wildcard: false,
      active: true,
    },
    {
      database_role: LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      tenant_id: "tenant_client_001",
      synthetic_wildcard: false,
      active: true,
    },
    {
      database_role: LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
      tenant_id: "tenant_amic",
      synthetic_wildcard: false,
      active: true,
    },
    {
      database_role: LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
      tenant_id: "tenant_client_001",
      synthetic_wildcard: false,
      active: true,
    },
  ]);

  const catalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticAuthorityCatalog(),
  );
  const beforeObjects = await verifyLawosOutlookAuthorityCatalog(client, {
    catalog,
    phase: "pre-migration",
    roleBootstrap: configured,
  });
  assert.equal(beforeObjects.outcome, "PASS");
  assert.equal(beforeObjects.missing_schema_count, 1);
  assert.equal(beforeObjects.missing_object_count, 6);

  await client.query("CREATE SCHEMA lawos_outlook_test");
  await client.query(
    "ALTER SCHEMA lawos_outlook_test OWNER TO lawos_admin",
  );
  await client.query("REVOKE ALL ON SCHEMA lawos_outlook_test FROM PUBLIC");
  await client.query(
    `GRANT USAGE ON SCHEMA lawos_outlook_test TO ${LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE}`,
  );
  await client.query(
    `GRANT USAGE ON SCHEMA lawos_outlook_test TO ${LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE}`,
  );
  await client.query(
    `GRANT USAGE ON SCHEMA lawos_outlook_test TO ${LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE}`,
  );
  await client.query(
    `GRANT USAGE ON SCHEMA lawos_outlook_test TO ${LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE}`,
  );
  await client.query(`
    CREATE TABLE lawos_outlook_test.assignment_jobs (
      tenant_id text PRIMARY KEY,
      status text NOT NULL
    )
  `);
  await client.query(
    `ALTER TABLE lawos_outlook_test.assignment_jobs OWNER TO ${LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE}`,
  );
  await client.query(
    "ALTER TABLE lawos_outlook_test.assignment_jobs ENABLE ROW LEVEL SECURITY",
  );
  await client.query(
    "ALTER TABLE lawos_outlook_test.assignment_jobs FORCE ROW LEVEL SECURITY",
  );
  await client.query(`
    CREATE POLICY assignment_jobs_tenant_policy
      ON lawos_outlook_test.assignment_jobs
      AS PERMISSIVE FOR ALL TO PUBLIC
      USING (true) WITH CHECK (true)
  `);
  await client.query(
    `GRANT SELECT, UPDATE ON lawos_outlook_test.assignment_jobs TO ${LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE}`,
  );
  await client.query(
    `GRANT INSERT, SELECT, UPDATE ON lawos_outlook_test.assignment_jobs TO ${LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE}`,
  );
  await client.query(
    "GRANT USAGE ON SCHEMA lawos_outlook_test TO lawos_app",
  );
  await client.query(`
    CREATE TABLE lawos_outlook_test.lifecycle_receipts (
      receipt_id text PRIMARY KEY,
      tenant_id text NOT NULL
    )
  `);
  await client.query(
    `ALTER TABLE lawos_outlook_test.lifecycle_receipts OWNER TO ${LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE}`,
  );
  await client.query(
    "ALTER TABLE lawos_outlook_test.lifecycle_receipts ENABLE ROW LEVEL SECURITY",
  );
  await client.query(
    "ALTER TABLE lawos_outlook_test.lifecycle_receipts FORCE ROW LEVEL SECURITY",
  );
  await client.query(`
    CREATE POLICY lifecycle_receipts_tenant_policy
      ON lawos_outlook_test.lifecycle_receipts
      AS PERMISSIVE FOR ALL TO PUBLIC
      USING (true) WITH CHECK (true)
  `);
  await client.query(`
    CREATE FUNCTION lawos_outlook_test.claim_assignment(value text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $lawos_outlook_test$${ASSIGNMENT_FUNCTION_BODY}$lawos_outlook_test$
  `);
  await client.query(
    `ALTER FUNCTION lawos_outlook_test.claim_assignment(text) OWNER TO ${LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE}`,
  );
  await client.query(
    "REVOKE ALL ON FUNCTION lawos_outlook_test.claim_assignment(text) FROM PUBLIC",
  );
  await client.query(
    `GRANT EXECUTE ON FUNCTION lawos_outlook_test.claim_assignment(text) TO ${LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE}`,
  );
  await client.query(`
    CREATE FUNCTION lawos_outlook_test.consume_lifecycle_receipt(value text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $lawos_outlook_test$${CONSUME_FUNCTION_BODY}$lawos_outlook_test$
  `);
  await client.query(
    `ALTER FUNCTION lawos_outlook_test.consume_lifecycle_receipt(text) OWNER TO ${LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE}`,
  );
  await client.query(
    "REVOKE ALL ON FUNCTION lawos_outlook_test.consume_lifecycle_receipt(text) FROM PUBLIC",
  );
  await client.query(
    "GRANT EXECUTE ON FUNCTION lawos_outlook_test.consume_lifecycle_receipt(text) TO lawos_app",
  );
  await client.query(`
    CREATE FUNCTION lawos_outlook_test.mint_lifecycle_receipt(value text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $lawos_outlook_test$${MINT_FUNCTION_BODY}$lawos_outlook_test$
  `);
  await client.query(
    `ALTER FUNCTION lawos_outlook_test.mint_lifecycle_receipt(text) OWNER TO ${LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE}`,
  );
  await client.query(
    "REVOKE ALL ON FUNCTION lawos_outlook_test.mint_lifecycle_receipt(text) FROM PUBLIC",
  );
  await client.query(
    `GRANT EXECUTE ON FUNCTION lawos_outlook_test.mint_lifecycle_receipt(text) TO ${LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE}`,
  );

  const verified = await verifyLawosOutlookAuthorityCatalog(client, {
    catalog,
    phase: "post-migration",
    roleBootstrap: configured,
  });
  assert.equal(verified.outcome, "PASS");
  assert.equal(verified.catalog_sha256, catalog.catalog_sha256);
  assert.equal(verified.verified_schema_count, 1);
  assert.equal(verified.verified_table_count, 2);
  assert.equal(verified.verified_function_count, 3);
  assert.equal(verified.missing_object_count, 0);
  assert.equal(verified.unknown_owned_object_count, 0);

  const lifecycleUrl = new URL(instance.connection_string);
  lifecycleUrl.username = LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE;
  lifecycleUrl.password = "lifecycle-password-value";
  lifecyclePool = createPostgresPool({
    connectionString: lifecycleUrl.toString(),
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-outlook-lifecycle-caller-test",
    max: 1,
  });
  const applicationUrl = new URL(instance.connection_string);
  applicationUrl.username = "lawos_app";
  applicationUrl.password = "application-password-value";
  applicationPool = createPostgresPool({
    connectionString: applicationUrl.toString(),
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-outlook-application-caller-test",
    max: 1,
  });
  const receiptId = "receipt_synthetic_001";
  assert.equal((await lifecyclePool.query(
    "SELECT lawos_outlook_test.mint_lifecycle_receipt($1) AS value",
    [receiptId],
  )).rows[0].value, receiptId);
  assert.deepEqual((await client.query(
    `SELECT receipt_id, tenant_id
       FROM lawos_outlook_test.lifecycle_receipts`,
  )).rows, [{ receipt_id: receiptId, tenant_id: "tenant_amic" }]);
  assert.equal((await applicationPool.query(
    "SELECT lawos_outlook_test.consume_lifecycle_receipt($1) AS value",
    [receiptId],
  )).rows[0].value, receiptId);
  await assert.rejects(
    lifecyclePool.query(
      "SELECT lawos_outlook_test.consume_lifecycle_receipt($1)",
      [receiptId],
    ),
    /permission denied/u,
  );
  await assert.rejects(
    applicationPool.query(
      "SELECT lawos_outlook_test.mint_lifecycle_receipt($1)",
      [receiptId],
    ),
    /permission denied/u,
  );
  await assert.rejects(
    lifecyclePool.query(
      `INSERT INTO lawos_outlook_test.lifecycle_receipts
         (receipt_id, tenant_id) VALUES ('receipt_raw_001', 'tenant_amic')`,
    ),
    /permission denied/u,
  );
  await assert.rejects(
    applicationPool.query(
      "SELECT * FROM lawos_outlook_test.lifecycle_receipts",
    ),
    /permission denied/u,
  );

  await client.query(
    "ALTER FUNCTION lawos_outlook_test.mint_lifecycle_receipt(text) SECURITY INVOKER",
  );
  await assert.rejects(
    verifyLawosOutlookAuthorityCatalog(client, {
      catalog,
      phase: "post-migration",
      roleBootstrap: configured,
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );
  await client.query(
    "ALTER FUNCTION lawos_outlook_test.mint_lifecycle_receipt(text) SECURITY DEFINER",
  );
  await client.query(
    "ALTER FUNCTION lawos_outlook_test.mint_lifecycle_receipt(text) RESET ALL",
  );
  await assert.rejects(
    verifyLawosOutlookAuthorityCatalog(client, {
      catalog,
      phase: "post-migration",
      roleBootstrap: configured,
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );
  await client.query(
    "ALTER FUNCTION lawos_outlook_test.mint_lifecycle_receipt(text) SET search_path = pg_catalog",
  );
  await client.query(`
    CREATE OR REPLACE FUNCTION lawos_outlook_test.mint_lifecycle_receipt(value text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $lawos_outlook_test$BEGIN RETURN value || '_drift'; END$lawos_outlook_test$
  `);
  await assert.rejects(
    verifyLawosOutlookAuthorityCatalog(client, {
      catalog,
      phase: "post-migration",
      roleBootstrap: configured,
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );
  await client.query(`
    CREATE OR REPLACE FUNCTION lawos_outlook_test.mint_lifecycle_receipt(value text)
    RETURNS text
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $lawos_outlook_test$${MINT_FUNCTION_BODY}$lawos_outlook_test$
  `);
  await client.query(
    `REVOKE USAGE ON SCHEMA lawos_outlook_test FROM ${LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE}`,
  );
  await assert.rejects(
    verifyLawosOutlookAuthorityCatalog(client, {
      catalog,
      phase: "post-migration",
      roleBootstrap: configured,
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );
  await client.query(
    `GRANT USAGE ON SCHEMA lawos_outlook_test TO ${LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE}`,
  );
  await client.query(
    "ALTER TABLE lawos_outlook_test.lifecycle_receipts NO FORCE ROW LEVEL SECURITY",
  );
  await assert.rejects(
    verifyLawosOutlookAuthorityCatalog(client, {
      catalog,
      phase: "post-migration",
      roleBootstrap: configured,
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );
  await client.query(
    "ALTER TABLE lawos_outlook_test.lifecycle_receipts FORCE ROW LEVEL SECURITY",
  );
  await client.query(`
    ALTER POLICY lifecycle_receipts_tenant_policy
      ON lawos_outlook_test.lifecycle_receipts
      USING (false) WITH CHECK (true)
  `);
  await assert.rejects(
    verifyLawosOutlookAuthorityCatalog(client, {
      catalog,
      phase: "post-migration",
      roleBootstrap: configured,
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );
  await client.query(`
    ALTER POLICY lifecycle_receipts_tenant_policy
      ON lawos_outlook_test.lifecycle_receipts
      USING (true) WITH CHECK (true)
  `);
  await client.query(
    "CREATE TABLE lawos_outlook_test.unknown_owner_object (id text)",
  );
  await client.query(
    `ALTER TABLE lawos_outlook_test.unknown_owner_object OWNER TO ${LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE}`,
  );
  await assert.rejects(
    verifyLawosOutlookAuthorityCatalog(client, {
      catalog,
      phase: "post-migration",
      roleBootstrap: configured,
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );
  await client.query("DROP TABLE lawos_outlook_test.unknown_owner_object");

  await client.query(
    `GRANT DELETE ON lawos_outlook_test.assignment_jobs TO ${LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE}`,
  );
  await assert.rejects(
    verifyLawosOutlookAuthorityCatalog(client, {
      catalog,
      phase: "post-migration",
      roleBootstrap: configured,
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );
  await client.query(
    `REVOKE DELETE ON lawos_outlook_test.assignment_jobs FROM ${LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE}`,
  );

  const missingCatalog = normalizeLawosOutlookAuthorityCatalog({
    ...syntheticAuthorityCatalog(),
    functions: [
      ...syntheticAuthorityCatalog().functions,
      {
        regprocedure: "lawos_outlook_test.missing_007_function(text)",
        regnamespace: "lawos_outlook_test",
        owner: LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
        ...functionProtection("BEGIN RETURN value; END"),
        grants: {
          [LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE]: [grant("EXECUTE")],
        },
      },
    ],
  });
  await assert.rejects(
    verifyLawosOutlookAuthorityCatalog(client, {
      catalog: missingCatalog,
      phase: "post-migration",
      roleBootstrap: configured,
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );

  for (const roleName of [
    LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
    LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
    LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
    LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
  ]) {
    await client.query(`ALTER ROLE ${roleName} INHERIT`);
    const observed = recordingRoleConfigurationClient(migrationAdminPool);
    await assert.rejects(
      configureLawosOutlookDatabaseRoles(
        observed.client,
        outlookRoleConfiguration({ applicationRolePrecondition }),
      ),
      (error) => error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
    );
    assert.ok(observed.statements.some((sql) => /^ROLLBACK$/iu.test(sql)));
    assert.equal(observed.statements.some((sql) =>
      /^INSERT INTO lawos_security\.tenant_context_authorities\b/iu.test(sql)),
    false);
    await client.query(`ALTER ROLE ${roleName} NOINHERIT`);
  }

  await client.query(`ALTER ROLE ${LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE} CREATEDB`);
  await assert.rejects(
    configureLawosOutlookDatabaseRoles(
      migrationAdminPool,
      outlookRoleConfiguration({ applicationRolePrecondition }),
    ),
    (error) => error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
  );
  await client.query(`ALTER ROLE ${LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE} NOCREATEDB`);

  await client.query(`GRANT ${LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE} TO lawos_app`);
  await assert.rejects(
    configureLawosOutlookDatabaseRoles(
      migrationAdminPool,
      outlookRoleConfiguration({ applicationRolePrecondition }),
    ),
    (error) => error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_MEMBERSHIP_DRIFT",
  );
  await client.query(`REVOKE ${LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE} FROM lawos_app`);

  await client.query(
    `INSERT INTO lawos_security.tenant_context_authorities
       (database_role, tenant_id, context_secret, synthetic_wildcard, active)
     VALUES ($1, '*', $2, true, true)`,
    [LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE, Buffer.from(TENANT_CONTEXT_SECRET)],
  );
  await assert.rejects(
    configureLawosOutlookDatabaseRoles(
      migrationAdminPool,
      outlookRoleConfiguration({ applicationRolePrecondition }),
    ),
    (error) => error?.code === "LAWOS_OUTLOOK_TENANT_AUTHORITY_DRIFT",
  );
});

test("native RDS replay requires signed history and every supporting edge", async (t) => {
  const { receipt, historicalOutlookBootstrapSha256 } =
    syntheticNativeRdsReadiness(knownRoleBootstrap());
  const expected = { historicalOutlookBootstrapSha256 };
  const normalized = assertLawosOutlookRoleBootstrapReceipt(receipt, expected);
  assert.equal(normalized.native_rds_history.memberships.length, 10);
  assert.equal(normalized.role_bootstrap.migration_admin.inherit, true);
  assert.throws(() => assertLawosOutlookRoleBootstrapReceipt(receipt), /signed historical/u);
  assert.throws(() => lawosOutlookRoleBootstrapDigest(receipt.role_bootstrap), /privilege drifted/u);
  const mutations = [
    (r) => { r.native_rds_history.pause_expectation.database_target_receipt_sha256 = "0".repeat(64); },
    (r) => { r.native_rds_history.bootstrap_grantor.can_login = true; },
    (r) => { r.native_rds_history.bootstrap_grantor.inherit = true; },
    (r) => { r.native_rds_history.rds_superuser.can_login = true; },
    (r) => { r.native_rds_history.rdsadmin.superuser = false; },
    (r) => { r.native_rds_history.rdsadmin.name = "rds_forged"; },
    (r) => { r.native_rds_history.rdsadmin.oid = r.role_bootstrap.migration_admin.oid; },
    (r) => { r.role_bootstrap.roles[0].superuser = true; },
    (r) => { r.role_bootstrap.migration_admin.inherit = false; },
    (r) => { r.role_bootstrap.migration_admin.valid_until_present = true; r.role_bootstrap.migration_admin.valid_until = "2030-01-01T00:00:00.000000Z"; },
    (r) => { r.native_rds_history.memberships.push(r.native_rds_history.memberships[0]); },
    (r) => { r.native_rds_history.unexpected = true; },
    ...receipt.native_rds_history.memberships.flatMap((_, i) => [
      (r) => { r.native_rds_history.memberships.splice(i, 1); },
      (r) => { r.native_rds_history.memberships[i].set_option = !r.native_rds_history.memberships[i].set_option; },
      (r) => { r.native_rds_history.memberships[i].inherit_option = !r.native_rds_history.memberships[i].inherit_option; },
      (r) => { r.native_rds_history.memberships[i].admin_option = !r.native_rds_history.memberships[i].admin_option; },
    ]),
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(receipt); mutate(changed);
    assert.throws(() => assertLawosOutlookRoleBootstrapReceipt(changed, expected));
  }
  const instance = await startDisposablePostgres(t);
  if (!instance) return;
  const pool = createPostgresPool({ connectionString: instance.connection_string,
    sslMode: "disable", allowInsecureLocal: true });
  t.after(async () => { await pool.end(); await instance.stop(); });
  assert.equal(await sqlRoleBootstrapDigest(pool, receipt.role_bootstrap),
    receipt.role_bootstrap_sha256);
});

test("Outlook role bootstrap receipt is closed and binds every live identity", () => {
  const withApplicationEdge = readinessForBootstrap(knownRoleBootstrap());
  const withoutApplicationEdge = readinessForBootstrap(
    knownRoleBootstrap({ applicationMembership: false }),
  );
  const normalized = assertLawosOutlookRoleBootstrapReceipt(
    withApplicationEdge,
  );
  const normalizedWithoutApplication =
    assertLawosOutlookRoleBootstrapReceipt(withoutApplicationEdge);
  assert.equal(normalized.membership_edge_count, 5);
  assert.equal(normalized.application_membership_edge_count, 1);
  assert.equal(normalizedWithoutApplication.membership_edge_count, 4);
  assert.equal(normalizedWithoutApplication.application_membership_edge_count, 0);
  assert.notEqual(
    normalized.role_bootstrap_sha256,
    normalizedWithoutApplication.role_bootstrap_sha256,
  );

  assert.throws(
    () => assertLawosOutlookRoleBootstrapReceipt({
      ...withApplicationEdge,
      unexpected: true,
    }),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT",
  );
  assert.throws(
    () => assertLawosOutlookRoleBootstrapReceipt({
      ...withApplicationEdge,
      role_bootstrap_sha256: "0".repeat(64),
    }),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT",
  );

  for (const coerciveOid of ["05", true]) {
    const coerciveDatabaseOid = structuredClone(
      withApplicationEdge.role_bootstrap,
    );
    coerciveDatabaseOid.database.oid = coerciveOid;
    assert.throws(
      () => lawosOutlookRoleBootstrapDigest(coerciveDatabaseOid),
      (error) =>
        error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT",
    );
  }
  for (const nonCanonicalName of [true, " lawos_fixture "]) {
    const nonCanonicalDatabaseName = structuredClone(
      withApplicationEdge.role_bootstrap,
    );
    nonCanonicalDatabaseName.database.name = nonCanonicalName;
    assert.throws(
      () => lawosOutlookRoleBootstrapDigest(nonCanonicalDatabaseName),
      (error) =>
        error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT",
    );
  }

  const postgresMajorDrift = structuredClone(withApplicationEdge);
  postgresMajorDrift.role_bootstrap.postgres_major = 15;
  assert.throws(
    () => assertLawosOutlookRoleBootstrapReceipt(postgresMajorDrift),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT",
  );

  const schemaOwnerDrift = structuredClone(withApplicationEdge);
  schemaOwnerDrift.role_bootstrap.schema_owners.lawos_meta = {
    oid: 99,
    name: "wrong_owner",
  };
  assert.throws(
    () => assertLawosOutlookRoleBootstrapReceipt(schemaOwnerDrift),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT",
  );

  const selfSetEdge = structuredClone(withApplicationEdge);
  selfSetEdge.role_bootstrap.memberships.push({
    ...structuredClone(selfSetEdge.role_bootstrap.memberships[0]),
    grantor: {
      oid: selfSetEdge.role_bootstrap.migration_admin.oid,
      name: selfSetEdge.role_bootstrap.migration_admin.name,
    },
    admin_option: false,
    set_option: true,
  });
  assert.throws(
    () => assertLawosOutlookRoleBootstrapReceipt(selfSetEdge),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_MEMBERSHIP_DRIFT",
  );

  const duplicateRoleOid = structuredClone(withApplicationEdge);
  duplicateRoleOid.role_bootstrap.roles[1].oid =
    duplicateRoleOid.role_bootstrap.roles[0].oid;
  assert.throws(
    () => assertLawosOutlookRoleBootstrapReceipt(duplicateRoleOid),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT",
  );

  const applicationPrivilegeDrift = structuredClone(withApplicationEdge);
  const application = applicationPrivilegeDrift.role_bootstrap.roles.find(
    ({ name }) => name === "lawos_app",
  );
  application.connection_limit = 65;
  assert.throws(
    () => assertLawosOutlookRoleBootstrapReceipt(applicationPrivilegeDrift),
    (error) => error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
  );

  const applicationInheritDrift = structuredClone(withApplicationEdge);
  applicationInheritDrift.role_bootstrap.roles.find(
    ({ name }) => name === "lawos_app",
  ).inherit = true;
  assert.throws(
    () => assertLawosOutlookRoleBootstrapReceipt(applicationInheritDrift),
    (error) => error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
  );

  const observedRoleInherit = structuredClone(withApplicationEdge);
  observedRoleInherit.role_bootstrap.roles.find(
    ({ name }) => name === LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
  ).inherit = true;
  assert.throws(
    () => assertLawosOutlookRoleBootstrapReceipt(observedRoleInherit),
    (error) => error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
  );

  const unsafeMembershipInherit = structuredClone(withApplicationEdge);
  unsafeMembershipInherit.role_bootstrap.memberships[0].inherit_option = true;
  assert.throws(
    () => assertLawosOutlookRoleBootstrapReceipt(unsafeMembershipInherit),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_MEMBERSHIP_DRIFT",
  );

  const databaseDrift = structuredClone(withApplicationEdge);
  databaseDrift.role_bootstrap.database.name = "wrong_database";
  databaseDrift.role_bootstrap_sha256 = lawosOutlookRoleBootstrapDigest(
    databaseDrift.role_bootstrap,
  );
  assert.throws(
    () => assertLawosOutlookRoleBootstrapReceipt(databaseDrift, {
      expectedRoleBootstrap: withApplicationEdge,
    }),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT",
  );

  const adminObservedAttributeDrift = structuredClone(withApplicationEdge);
  adminObservedAttributeDrift.role_bootstrap.migration_admin.inherit = true;
  assert.throws(
    () => assertLawosOutlookRoleBootstrapReceipt(
      adminObservedAttributeDrift,
    ),
    (error) =>
      error?.code === "LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT",
  );
});

test("Outlook authority catalog is closed and rejects duplicate identities or unknown roles", () => {
  const catalog = syntheticAuthorityCatalog();
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      unexpected: true,
    }),
    /schema version is invalid/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      catalog_id: { toString: () => catalog.catalog_id },
    }),
    /catalog id is required/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      target_schema: ` ${catalog.target_schema}`,
    }),
    /target schema is required/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      schemas: [{ ...catalog.schemas[0], unexpected: true }],
    }),
    /schema is not closed/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      tables: catalog.tables.map((table, index) => index === 0 ? {
        ...table,
        grants: {
          ...table.grants,
          [LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE]: [{
            ...table.grants[LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE][0],
            unexpected: true,
          }],
        },
      } : table),
    }),
    /privilege is not closed/u,
  );
  const normalized = normalizeLawosOutlookAuthorityCatalog(catalog);
  assert.equal(normalized.schemas[0].owner, "lawos_admin");
  const catalogReviewedApplicationSelect = normalizeLawosOutlookAuthorityCatalog({
    ...catalog,
    tables: catalog.tables.map((table, index) => index === 0 ? {
      ...table,
      grants: {
        ...table.grants,
        lawos_app: [grant("SELECT")],
      },
    } : table),
  });
  assert.deepEqual(
    catalogReviewedApplicationSelect.tables[0].grants.lawos_app,
    [grant("SELECT")],
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      tables: catalog.tables.map((table, index) => index === 0 ? {
        ...table,
        grants: {
          ...table.grants,
          lawos_app: [grant("UPDATE")],
        },
      } : table),
    }),
    /lifecycle receipt authority is invalid/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...normalized,
      catalog_sha256: "0".repeat(64),
    }),
    /digest drifted/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      schemas: [...catalog.schemas, catalog.schemas[0]],
    }),
    /duplicate Outlook authority schema/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      tables: [...catalog.tables, catalog.tables[0]],
    }),
    /duplicate Outlook authority table/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      functions: [{
        ...catalog.functions[0],
        grants: { unknown_role: [grant("EXECUTE")] },
      }],
    }),
    /grant role is not approved/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      tables: catalog.tables.map((table) => table.regclass.endsWith(
        ".lifecycle_receipts",
      ) ? {
          ...table,
          grants: {
            ...table.grants,
            [LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE]: [grant("INSERT")],
          },
        } : table),
    }),
    /lifecycle receipt authority is invalid/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      functions: catalog.functions.map((routine) =>
        routine.regprocedure.includes("consume_lifecycle_receipt") ? {
            ...routine,
            grants: {
              ...routine.grants,
              [LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE]: [grant("EXECUTE")],
            },
          } : routine),
    }),
    /lifecycle receipt authority is invalid/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      schemas: catalog.schemas.map((schema) => ({
        ...schema,
        grants: {
          ...schema.grants,
          [LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE]: [grant("CREATE")],
        },
      })),
    }),
    /schema grants are invalid/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      functions: catalog.functions.map((routine) =>
        routine.regprocedure.includes("mint_lifecycle_receipt") ? {
            ...routine,
            security_definer: false,
          } : routine),
    }),
    /lifecycle receipt authority is invalid/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      functions: catalog.functions.map((routine) => ({
        ...routine,
        configuration: ["search_path=public"],
      })),
    }),
    /function search path is unsafe/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      functions: catalog.functions.map((routine) => ({
        ...routine,
        body_sha256: "not-a-digest",
      })),
    }),
    /function protection is invalid/u,
  );
  assert.throws(
    () => normalizeLawosOutlookAuthorityCatalog({
      ...catalog,
      tables: [],
      functions: [],
    }),
    /must not be empty/u,
  );
});

test("Outlook authority verification rejects forged catalog receipts", () => {
  const catalog = normalizeLawosOutlookAuthorityCatalog(
    syntheticAuthorityCatalog(),
  );
  const roleBootstrap = assertLawosOutlookRoleBootstrapReceipt(
    readinessForBootstrap(knownRoleBootstrap()),
  );
  const receipt = {
    outcome: "PASS",
    phase: "post-migration",
    catalog_sha256: catalog.catalog_sha256,
    role_bootstrap_sha256: roleBootstrap.role_bootstrap_sha256,
    verified_schema_count: catalog.schemas.length,
    verified_table_count: catalog.tables.length,
    verified_function_count: catalog.functions.length,
    missing_schema_count: 0,
    missing_table_count: 0,
    missing_function_count: 0,
    missing_object_count: 0,
    unknown_owned_object_count: 0,
    secret_material_returned: false,
  };
  assert.throws(
    () => assertLawosOutlookAuthorityVerification({
      ...receipt,
      catalog_sha256: "0".repeat(64),
    }, { catalog, phase: "post-migration", roleBootstrap }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );
  assert.throws(
    () => assertLawosOutlookAuthorityVerification({
      ...receipt,
      unexpected: true,
    }, { catalog, phase: "post-migration", roleBootstrap }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );
  assert.throws(
    () => assertLawosOutlookAuthorityVerification({
      ...receipt,
      verified_function_count: receipt.verified_function_count - 1,
    }, { catalog, phase: "post-migration", roleBootstrap }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );
  assert.throws(
    () => assertLawosOutlookAuthorityVerification(receipt, {
      catalog,
      phase: "pre-migration",
      roleBootstrap,
    }),
    (error) => error?.code === "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
  );
});
