import assert from "node:assert/strict";
import test from "node:test";

import { createPostgresPool } from "../../persistence/src/postgres/pool.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import { createMigratedPostgresFixture } from "../../persistence/test/helpers/disposable-postgres.js";
import { OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG as AUTHORITY } from "../src/outlook-desktop-assignment-authority-catalog.js";
import {
  createOutlookAssignmentMigrationPauseExpectation,
  digestOutlookAssignmentAuthoritySegments,
  readOutlookAssignmentBootstrapAuthority,
} from "../src/outlook-desktop-assignment-bootstrap-authority.js";
import {
  OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
  OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS,
} from "../src/outlook-desktop-assignment-authority-catalog.js";
import {
  OUTLOOK_DESKTOP_ASSIGNMENT_PROTECTED_OBJECT_FACTS_SHA256,
  readOutlookAssignmentProtectedObjectFacts,
} from "../src/outlook-desktop-assignment-authority-readback.js";
import { listEmailDmsPostgresMigrations } from "../src/migrations/index.js";
import {
  EMAIL_DMS_MIGRATION_ADMIN,
  createEmailDmsMigrationAdminPool,
  createEmailDmsMigrationFixture,
  provisionEmailDmsMigrationRoles,
  runEmailDmsMigrationAsAdmin,
  TEST_OUTLOOK_AUTHORITY_MANIFEST_SHA256,
  TEST_OUTLOOK_DATABASE_TARGET_RECEIPT_SHA256,
  TEST_OUTLOOK_MIGRATION_CATALOG_SHA256,
} from "./support/postgres-email-dms-migration-fixture.js";
import {
  insertReleaseArtifact,
  releaseArtifact,
} from "./helpers/outlook-desktop-release-trust-migration-fixture.js";

const ATTACKER = "lawos_outlook_acl_attacker";
const DELEGATE = "lawos_outlook_acl_delegate";
const LEGITIMATE_META_READER = "lawos_hrx_projection_writer";
const PROTECTED_ROLES = Object.freeze(Object.entries(AUTHORITY.role_attributes)
  .map(([name, attributes]) => Object.freeze({ name, ...attributes })));
const SUBJECTS = Object.freeze([
  "PUBLIC", ...PROTECTED_ROLES.map(({ name }) => name), ATTACKER, DELEGATE,
]);

function sortedAcl(rows) {
  return rows.map(({ grantee, privilege_type: privilege }) => `${grantee}:${privilege}`).sort();
}

function expectedReceipt(roleBootstrapSha256, overrides = {}) {
  return {
    expectedRoleBootstrapSha256: roleBootstrapSha256,
    expectedAuthorityManifestSha256: TEST_OUTLOOK_AUTHORITY_MANIFEST_SHA256,
    expectedDatabaseTargetReceiptSha256:
      TEST_OUTLOOK_DATABASE_TARGET_RECEIPT_SHA256,
    expectedMigrationCatalogSha256: TEST_OUTLOOK_MIGRATION_CATALOG_SHA256,
    ...overrides,
  };
}

async function runMigrationWithExpectedRows(adminPool, sql, rows) {
  const client = await adminPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE TEMP TABLE outlook_authority_expected_receipt (
      schema_version text,
      role_bootstrap_sha256 text,
      authority_manifest_sha256 text,
      database_target_receipt_sha256 text,
      migration_catalog_sha256 text
    ) ON COMMIT DROP`);
    for (const row of rows) {
      await client.query(
        `INSERT INTO outlook_authority_expected_receipt VALUES ($1,$2,$3,$4,$5)`,
        [row.schemaVersion, row.roleBootstrapSha256,
          row.authorityManifestSha256, row.databaseTargetReceiptSha256,
          row.migrationCatalogSha256],
      );
    }
    await client.query(sql);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

async function applyWithAdversarialDefaults(t, fixture) {
  const roleBootstrap = await provisionEmailDmsMigrationRoles(fixture.adminPool);
  const migrationAdminPool = createEmailDmsMigrationAdminPool(t, fixture);
  await fixture.adminPool.query(`CREATE ROLE ${ATTACKER} LOGIN NOINHERIT`);
  await fixture.adminPool.query(`CREATE ROLE ${DELEGATE} NOLOGIN NOINHERIT`);
  await fixture.adminPool.query(`CREATE ROLE ${LEGITIMATE_META_READER} NOLOGIN NOINHERIT`);
  await fixture.bootstrapPool.query(
    `REVOKE ${ATTACKER},${DELEGATE},${LEGITIMATE_META_READER}
       FROM ${EMAIL_DMS_MIGRATION_ADMIN}`,
  );
  const migrations = listEmailDmsPostgresMigrations();
  for (const migration of migrations.slice(0, -1)) {
    await runEmailDmsMigrationAsAdmin(migrationAdminPool, migration.sql);
  }
  await fixture.adminPool.query(
    `GRANT USAGE,CREATE ON SCHEMA lawos_email_dms TO ${ATTACKER} WITH GRANT OPTION`,
  );
  await fixture.adminPool.query(
    `GRANT USAGE,CREATE ON SCHEMA lawos_meta TO ${ATTACKER} WITH GRANT OPTION`,
  );
  await fixture.adminPool.query(`GRANT USAGE ON SCHEMA lawos_meta TO ${LEGITIMATE_META_READER}`);
  const attackerUrl = new URL(fixture.instance.connection_string);
  attackerUrl.username = ATTACKER;
  const attackerPool = createPostgresPool({
    connectionString: attackerUrl.toString(),
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-outlook-acl-seeder-test",
  });
  await fixture.adminPool.query(`
    CREATE FUNCTION public.hmac(text,text,boolean) RETURNS bytea
    LANGUAGE sql IMMUTABLE AS 'SELECT decode(repeat(''00'',32),''hex'')';
    CREATE FUNCTION public.sha256(bytea) RETURNS bytea
    LANGUAGE sql IMMUTABLE AS 'SELECT decode(repeat(''00'',32),''hex'')';
    CREATE FUNCTION public.gen_random_uuid(integer) RETURNS uuid
    LANGUAGE sql VOLATILE AS 'SELECT ''00000000-0000-0000-0000-000000000000''::uuid';
  `);
  try {
    await attackerPool.query(
      `GRANT USAGE,CREATE ON SCHEMA lawos_email_dms,lawos_meta TO ${DELEGATE}`,
    );
    await fixture.adminPool.query(`GRANT ALL ON ALL TABLES IN SCHEMA lawos_email_dms TO ${ATTACKER} WITH GRANT OPTION`);
    await fixture.adminPool.query(`GRANT ALL ON ALL FUNCTIONS IN SCHEMA lawos_email_dms TO ${ATTACKER} WITH GRANT OPTION`);
    await fixture.adminPool.query(`GRANT UPDATE (lease_expires_at,state_version,retired_at)
      ON lawos_email_dms.outlook_desktop_installations
      TO ${ATTACKER} WITH GRANT OPTION`);
    await attackerPool.query(
      `GRANT ALL ON ALL TABLES IN SCHEMA lawos_email_dms TO ${DELEGATE}`,
    );
    await attackerPool.query(
      `GRANT ALL ON ALL FUNCTIONS IN SCHEMA lawos_email_dms TO ${DELEGATE}`,
    );
    await attackerPool.query(`GRANT UPDATE (lease_expires_at,state_version,retired_at)
      ON lawos_email_dms.outlook_desktop_installations TO ${DELEGATE}`);
    await attackerPool.query(`CREATE TRIGGER zzz_outlook_acl_hostile_before
        BEFORE UPDATE ON lawos_email_dms.outlook_desktop_installations
        FOR EACH ROW EXECUTE FUNCTION
          lawos_email_dms.reject_outlook_desktop_immutable_mutation()`);
  } finally {
    await attackerPool.end();
  }
  await migrationAdminPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA lawos_email_dms GRANT ALL ON TABLES TO ${ATTACKER}`);
  await migrationAdminPool.query(`ALTER DEFAULT PRIVILEGES IN SCHEMA lawos_email_dms GRANT ALL ON FUNCTIONS TO ${ATTACKER}`);
  await fixture.adminPool.query(
    `CREATE POLICY hostile_installation_allow_all
       ON lawos_email_dms.outlook_desktop_installations
       FOR ALL TO PUBLIC USING (true) WITH CHECK (true)`,
  );
  await fixture.adminPool.query(
    `CREATE POLICY hostile_release_allow_all
       ON lawos_email_dms.outlook_desktop_release_artifacts
       FOR ALL TO PUBLIC USING (true) WITH CHECK (true)`,
  );
  await insertReleaseArtifact(fixture.adminPool, releaseArtifact("2", {
    tenant_id: "tenant-assignment-schema-foreign",
  }));
  const identity = (await migrationAdminPool.query(
    "SELECT session_user,current_user,current_database() AS current_database",
  )).rows[0];
  const expectedAuthority = await readOutlookAssignmentBootstrapAuthority(
    migrationAdminPool,
    {
      database_name: "postgres",
      bootstrap_grantor: roleBootstrap.bootstrap_grantor,
      lawos_app_membership_present:
        roleBootstrap.lawos_app_membership_present,
    },
  );
  await runEmailDmsMigrationAsAdmin(migrationAdminPool, migrations.at(-1).sql, {
    ...expectedReceipt(expectedAuthority.role_bootstrap_sha256),
  });
  await migrationAdminPool.end();
  return Object.freeze({ identity, expectedAuthority });
}

async function prepareThrough006(t, fixture) {
  const roleBootstrap = await provisionEmailDmsMigrationRoles(fixture.adminPool);
  const migrationAdminPool = createEmailDmsMigrationAdminPool(t, fixture);
  const migrations = listEmailDmsPostgresMigrations();
  for (const migration of migrations.slice(0, -1)) {
    await runEmailDmsMigrationAsAdmin(migrationAdminPool, migration.sql);
  }
  const expectedAuthority = await readOutlookAssignmentBootstrapAuthority(
    migrationAdminPool,
    {
      database_name: "postgres",
      bootstrap_grantor: roleBootstrap.bootstrap_grantor,
      lawos_app_membership_present:
        roleBootstrap.lawos_app_membership_present,
    },
  );
  const membershipMatrix = await readProtectedMembershipMatrix(
    fixture.bootstrapPool ?? fixture.adminPool,
  );
  return {
    expectedAuthority,
    membershipMatrix,
    migrationAdminPool,
    migration: migrations.at(-1),
  };
}

async function readProtectedMembershipMatrix(pool) {
  return (await pool.query(
    `SELECT target.rolname AS granted_role,
            member.rolname AS member,
            grantor.rolname AS grantor,
            membership.admin_option,
            membership.inherit_option,
            membership.set_option
       FROM pg_auth_members AS membership
       JOIN pg_roles AS target ON target.oid=membership.roleid
       JOIN pg_roles AS member ON member.oid=membership.member
       JOIN pg_roles AS grantor ON grantor.oid=membership.grantor
      WHERE target.rolname=ANY($1::text[])
         OR member.rolname=ANY($1::text[])
      ORDER BY target.rolname,member.rolname,grantor.rolname`,
    [PROTECTED_ROLES.map(({ name }) => name)],
  )).rows;
}

async function assertRolledBack007(fixture, expectedMembershipMatrix) {
  const state = (await (fixture.bootstrapPool ?? fixture.adminPool).query(
    `SELECT to_regclass('lawos_meta.outlook_authority_bootstrap_receipts') IS NULL
              AS receipt_absent,
            (SELECT owner.rolname FROM pg_class AS relation
              JOIN pg_roles AS owner ON owner.oid=relation.relowner
             WHERE relation.oid=
               'lawos_email_dms.outlook_desktop_installations'::regclass)
              AS installation_owner,
            EXISTS (SELECT 1 FROM pg_auth_members AS membership
              WHERE membership.roleid='lawos_outlook_authority_owner'::regrole
                AND membership.member='lawos_admin'::regrole
                AND membership.grantor='lawos_admin'::regrole) AS self_set_edge`,
  )).rows[0];
  assert.deepEqual(state, {
    receipt_absent: true,
    installation_owner: EMAIL_DMS_MIGRATION_ADMIN,
    self_set_edge: false,
  });
  assert.deepEqual(
    await readProtectedMembershipMatrix(fixture.bootstrapPool ?? fixture.adminPool),
    expectedMembershipMatrix,
  );
}

test("assignment migration 007 declares a frozen exact authority catalog", () => {
  const migrations = listEmailDmsPostgresMigrations();
  assert.deepEqual(migrations.slice(-2).map(({ id }) => id), [
    "006_outlook_desktop_release_trust",
    "007_outlook_desktop_assignment",
  ]);
  assert.equal(Object.isFrozen(AUTHORITY), true);
  assert.equal(Object.isFrozen(AUTHORITY.tables), true);
  assert.equal(Object.isFrozen(AUTHORITY.functions), true);
  assert.equal(AUTHORITY.tables.length, 25);
  assert.equal(AUTHORITY.functions.length, 52);
  assert.equal(OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS.length, 30);
  assert.equal(Object.isFrozen(
    OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS,
  ), true);
  assert.match(OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG_SHA256,
    /^[a-f0-9]{64}$/u);
  assert.deepEqual(AUTHORITY.security_definer_functions,
    OUTLOOK_DESKTOP_ASSIGNMENT_SECURITY_DEFINER_FUNCTIONS);
  assert.equal(AUTHORITY.security_definer_functions.every((fn) =>
    fn.owner === AUTHORITY.owner && fn.allowed_roles.length === 1
      && ["serializable_read", "serializable_write"].includes(
        fn.transaction_mode,
      )), true);
  assert.equal(AUTHORITY.bootstrap_receipt.postgres_major, "16");
  assert.equal(AUTHORITY.bootstrap_receipt.canonical_segment_order.length, 20);
  assert.equal(AUTHORITY.bootstrap_receipt.canonical_segment_order[0], "digest_domain");
  assert.doesNotMatch(migrations.at(-1).sql, /CREATE\s+ROLE/iu);
});

test("assignment pause expectation has one exact closed digest shape", () => {
  const expectation = createOutlookAssignmentMigrationPauseExpectation({
    role_bootstrap_sha256: "a".repeat(64),
    authority_manifest_sha256: "b".repeat(64),
    database_target_receipt_sha256: "c".repeat(64),
    migration_catalog_sha256: "d".repeat(64),
  });
  assert.equal(Object.isFrozen(expectation), true);
  assert.deepEqual(expectation, {
    schema_version: AUTHORITY.bootstrap_receipt.schema_version,
    authority_manifest_sha256: "b".repeat(64),
    database_target_receipt_sha256: "c".repeat(64),
    migration_catalog_sha256: "d".repeat(64),
    role_bootstrap_sha256: "a".repeat(64),
  });
  assert.throws(() => createOutlookAssignmentMigrationPauseExpectation({
    role_bootstrap_sha256: "a".repeat(64),
    authority_manifest_sha256: "b".repeat(64),
    database_target_receipt_sha256: "c".repeat(64),
    migration_catalog_sha256: "wrong",
  }), TypeError);
});

test("bootstrap authority canonical u32be UTF-8 segments match PostgreSQL", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const segments = ["known-vector", "true", "false", "", "jwsuh-한글", "10"];
  const sql = (await fixture.adminPool.query(
    `SELECT encode(pg_catalog.sha256(string_agg(
       int4send(octet_length(convert_to(value,'UTF8')))||convert_to(value,'UTF8'),
       ''::bytea ORDER BY ordinality)),'hex') AS sha256
       FROM unnest($1::text[]) WITH ORDINALITY AS segment(value,ordinality)`,
    [segments],
  )).rows[0].sha256;
  assert.equal(digestOutlookAssignmentAuthoritySegments(segments),
    "dcb4c487dbc2c17c600ccad837362d0cc7bbe0bf91681e2d327ea1f0a9ffb3fd");
  assert.equal(sql, digestOutlookAssignmentAuthoritySegments(segments));
});

test("bootstrap authority rejects inherited admin and unapproved admin role edges", async (t) => {
  const fixture = await createEmailDmsMigrationFixture(t);
  if (!fixture) return;
  const prepared = await prepareThrough006(t, fixture);
  const options = {
    database_name: "postgres",
    bootstrap_grantor: prepared.expectedAuthority.bootstrap_grantor,
    lawos_app_membership_present:
      prepared.expectedAuthority.lawos_app_membership_present,
  };
  try {
    await fixture.bootstrapPool.query("ALTER ROLE lawos_admin INHERIT");
    await assert.rejects(
      readOutlookAssignmentBootstrapAuthority(prepared.migrationAdminPool, options),
      /migration admin is unsafe/iu,
    );

    await fixture.bootstrapPool.query("ALTER ROLE lawos_admin NOINHERIT");
    await fixture.bootstrapPool.query(
      "CREATE ROLE lawos_outlook_bootstrap_leak NOLOGIN NOINHERIT",
    );
    await fixture.bootstrapPool.query(
      "GRANT lawos_outlook_bootstrap_leak TO lawos_admin WITH ADMIN OPTION",
    );
    await assert.rejects(
      readOutlookAssignmentBootstrapAuthority(prepared.migrationAdminPool, options),
      /membership inventory mismatch/iu,
    );

    await fixture.bootstrapPool.query(
      "REVOKE lawos_outlook_bootstrap_leak FROM lawos_admin",
    );
    await fixture.bootstrapPool.query(
      "REVOKE lawos_outlook_assignment_worker FROM lawos_admin",
    );
    await prepared.migrationAdminPool.query(
      "CREATE ROLE lawos_outlook_bootstrap_replacement NOLOGIN NOINHERIT",
    );
    const substituted = (await fixture.bootstrapPool.query(`
      SELECT granted.rolname AS granted_role,member.rolname AS member,
             grantor.rolname AS grantor,membership.admin_option,
             membership.inherit_option,membership.set_option
        FROM pg_auth_members AS membership
        JOIN pg_roles AS granted ON granted.oid=membership.roleid
        JOIN pg_roles AS member ON member.oid=membership.member
        JOIN pg_roles AS grantor ON grantor.oid=membership.grantor
       WHERE member.rolname='lawos_admin'
       ORDER BY granted.rolname,grantor.rolname
    `)).rows;
    assert.equal(substituted.length,
      4 + Number(options.lawos_app_membership_present));
    assert.equal(substituted.some(({ granted_role: role }) =>
      role === "lawos_outlook_assignment_worker"), false);
    assert.deepEqual(substituted.find(({ granted_role: role }) =>
      role === "lawos_outlook_bootstrap_replacement"), {
      granted_role: "lawos_outlook_bootstrap_replacement",
      member: "lawos_admin",
      grantor: options.bootstrap_grantor,
      admin_option: true,
      inherit_option: false,
      set_option: false,
    });
    await assert.rejects(
      readOutlookAssignmentBootstrapAuthority(prepared.migrationAdminPool, options),
      /membership inventory mismatch/iu,
    );
  } finally {
    await prepared.migrationAdminPool.end();
  }
});

test("assignment migration fails closed when authority roles are absent", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  await assert.rejects(
    fixture.adminPool.query(listEmailDmsPostgresMigrations().at(-1).sql),
    /direct lawos_admin session/iu,
  );
});

test("assignment migration rolls back when expected receipt is missing or wrong", async (t) => {
  const fixture = await createEmailDmsMigrationFixture(t);
  if (!fixture) return;
  const prepared = await prepareThrough006(t, fixture);
  const correct = expectedReceipt(
    prepared.expectedAuthority.role_bootstrap_sha256,
  );
  try {
    for (const expected of [
      undefined,
      expectedReceipt("0".repeat(64)),
    ]) {
      await assert.rejects(
        runEmailDmsMigrationAsAdmin(prepared.migrationAdminPool,
          prepared.migration.sql,
          expected),
        /expected bootstrap receipt|expected bootstrap receipt mismatch/iu,
      );
      await assertRolledBack007(fixture, prepared.membershipMatrix);
    }
    const exactRow = {
      schemaVersion: "lawos.outlook-authority-role-bootstrap-receipt.v1",
      roleBootstrapSha256: correct.expectedRoleBootstrapSha256,
      authorityManifestSha256: correct.expectedAuthorityManifestSha256,
      databaseTargetReceiptSha256:
        correct.expectedDatabaseTargetReceiptSha256,
      migrationCatalogSha256: correct.expectedMigrationCatalogSha256,
    };
    for (const rows of [
      [{ ...exactRow, authorityManifestSha256: null }],
      [{ ...exactRow, databaseTargetReceiptSha256: "g".repeat(64) }],
      [{ ...exactRow, migrationCatalogSha256: "g".repeat(64) }],
      [exactRow, exactRow],
    ]) {
      await assert.rejects(
        runMigrationWithExpectedRows(prepared.migrationAdminPool,
          prepared.migration.sql, rows),
        /expected digest receipt is invalid/iu,
      );
      await assertRolledBack007(fixture, prepared.membershipMatrix);
    }
  } finally {
    await prepared.migrationAdminPool.end();
  }
});

test("late foreign default ACL failure rolls back owners, receipt, and temporary SET edge", async (t) => {
  const fixture = await createEmailDmsMigrationFixture(t);
  if (!fixture) return;
  const prepared = await prepareThrough006(t, fixture);
  await fixture.adminPool.query(`CREATE ROLE ${ATTACKER} LOGIN NOINHERIT`);
  await fixture.bootstrapPool.query(
    `ALTER DEFAULT PRIVILEGES IN SCHEMA lawos_email_dms
       GRANT ALL ON TABLES TO ${ATTACKER}`,
  );
  try {
    await assert.rejects(
      runEmailDmsMigrationAsAdmin(prepared.migrationAdminPool,
        prepared.migration.sql, {
          ...expectedReceipt(prepared.expectedAuthority.role_bootstrap_sha256),
        }),
      /permission denied to change default privileges/iu,
    );
    await assertRolledBack007(fixture, prepared.membershipMatrix);
  } finally {
    await prepared.migrationAdminPool.end();
  }
});

test("configured authority digest rejects a changed lawos_meta owner", async (t) => {
  const fixture = await createEmailDmsMigrationFixture(t);
  if (!fixture) return;
  const prepared = await prepareThrough006(t, fixture);
  await fixture.bootstrapPool.query(
    `ALTER SCHEMA lawos_meta OWNER TO ${fixture.instance.username}`,
  );
  try {
    await assert.rejects(
      runEmailDmsMigrationAsAdmin(prepared.migrationAdminPool,
        prepared.migration.sql, {
          ...expectedReceipt(prepared.expectedAuthority.role_bootstrap_sha256),
        }),
      /required schemas are not owned by lawos_admin/iu,
    );
    await assertRolledBack007(fixture, prepared.membershipMatrix);
  } finally {
    await prepared.migrationAdminPool.end();
  }
});

test("foreign-owned email-DMS function fails 007 atomically", async (t) => {
  const fixture = await createEmailDmsMigrationFixture(t);
  if (!fixture) return;
  const prepared = await prepareThrough006(t, fixture);
  await fixture.adminPool.query(`CREATE ROLE ${ATTACKER} LOGIN NOINHERIT`);
  await fixture.adminPool.query(
    `GRANT USAGE,CREATE ON SCHEMA lawos_email_dms TO ${ATTACKER}`,
  );
  const attackerUrl = new URL(fixture.instance.connection_string);
  attackerUrl.username = ATTACKER;
  const attackerPool = createPostgresPool({
    connectionString: attackerUrl.toString(),
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-outlook-foreign-function-test",
  });
  try {
    await attackerPool.query(`CREATE FUNCTION
      lawos_email_dms.foreign_owned_hostile_scalar()
      RETURNS integer LANGUAGE sql IMMUTABLE AS 'SELECT 1'`);
    await assert.rejects(
      runEmailDmsMigrationAsAdmin(prepared.migrationAdminPool,
        prepared.migration.sql, {
          ...expectedReceipt(prepared.expectedAuthority.role_bootstrap_sha256),
        }),
      /email-DMS function is not approved/iu,
    );
    await assertRolledBack007(fixture, prepared.membershipMatrix);
    assert.equal((await fixture.bootstrapPool.query(
      `SELECT owner.rolname AS owner
         FROM pg_proc AS procedure JOIN pg_roles AS owner
           ON owner.oid=procedure.proowner
        WHERE procedure.oid=
          'lawos_email_dms.foreign_owned_hostile_scalar()'::regprocedure`,
    )).rows[0].owner, ATTACKER);
  } finally {
    await attackerPool.end();
    await prepared.migrationAdminPool.end();
  }
});

test("migration-admin-owned unapproved function fails 007 without CASCADE", async (t) => {
  const fixture = await createEmailDmsMigrationFixture(t);
  if (!fixture) return;
  const prepared = await prepareThrough006(t, fixture);
  await prepared.migrationAdminPool.query(`CREATE FUNCTION
    lawos_email_dms.admin_owned_unapproved_scalar()
    RETURNS integer LANGUAGE sql IMMUTABLE AS 'SELECT 1'`);
  try {
    await assert.rejects(
      runEmailDmsMigrationAsAdmin(prepared.migrationAdminPool,
        prepared.migration.sql, {
          ...expectedReceipt(prepared.expectedAuthority.role_bootstrap_sha256),
        }),
      /email-DMS function is not approved/iu,
    );
    await assertRolledBack007(fixture, prepared.membershipMatrix);
    assert.equal((await fixture.bootstrapPool.query(
      `SELECT to_regprocedure(
        'lawos_email_dms.admin_owned_unapproved_scalar()') IS NOT NULL
        AS preserved`,
    )).rows[0].preserved, true);
  } finally {
    await prepared.migrationAdminPool.end();
  }
});

test("assignment migration applies the exact role, RLS, table, function, and schema authority matrix", async (t) => {
  const fixture = await createEmailDmsMigrationFixture(t);
  if (!fixture) return;
  const { identity: migrationIdentity, expectedAuthority } =
    await applyWithAdversarialDefaults(t, fixture);
  assert.deepEqual(migrationIdentity, {
    session_user: EMAIL_DMS_MIGRATION_ADMIN,
    current_user: EMAIL_DMS_MIGRATION_ADMIN,
    current_database: "postgres",
  });

  const roleRows = await fixture.adminPool.query(
    `SELECT rolname,rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,
            rolinherit,rolreplication,rolbypassrls
       FROM pg_roles WHERE rolname=ANY($1::text[]) ORDER BY rolname`,
    [PROTECTED_ROLES.map(({ name }) => name)],
  );
  assert.equal(roleRows.rowCount, 5);
  for (const row of roleRows.rows) {
    const expected = PROTECTED_ROLES.find(({ name }) => name === row.rolname);
    assert.deepEqual(row, {
      rolname: expected.name,
      rolcanlogin: expected.login,
      rolsuper: expected.superuser,
      rolcreatedb: expected.createdb,
      rolcreaterole: expected.createrole,
      rolinherit: expected.inherit,
      rolreplication: expected.replication,
      rolbypassrls: expected.bypassrls,
    });
  }
  const memberships = await fixture.adminPool.query(
    `SELECT target.rolname AS granted_role,member.rolname AS member,
            grantor.rolname AS grantor,membership.admin_option,
            membership.inherit_option,membership.set_option
       FROM pg_auth_members AS membership
       JOIN pg_roles AS target ON target.oid=membership.roleid
       JOIN pg_roles AS member ON member.oid=membership.member
       JOIN pg_roles AS grantor ON grantor.oid=membership.grantor
      WHERE membership.roleid=ANY($1::regrole[])
         OR membership.member=ANY($1::regrole[])
      ORDER BY target.rolname,member.rolname,grantor.rolname`,
    [PROTECTED_ROLES.map(({ name }) => name)],
  );
  assert.equal(memberships.rowCount,
    4 + Number(expectedAuthority.lawos_app_membership_present));
  assert.deepEqual(memberships.rows.map((row) => ({
    ...row,
    grantor: "<bootstrap>",
  })), [
    ...(expectedAuthority.lawos_app_membership_present ? ["lawos_app"] : []),
    "lawos_outlook_assignment_worker",
    "lawos_outlook_authority_owner",
    "lawos_outlook_control_operator",
    "lawos_outlook_lifecycle_verifier",
  ].map((granted_role) => ({
    granted_role,
    member: EMAIL_DMS_MIGRATION_ADMIN,
    grantor: "<bootstrap>",
    admin_option: true,
    inherit_option: false,
    set_option: false,
  })));
  assert.equal(new Set(memberships.rows.map(({ grantor }) => grantor)).size, 1);
  const receipt = (await fixture.adminPool.query(
    `SELECT receipt.*,owner.rolname AS owner,relation.relrowsecurity,
            relation.relforcerowsecurity,
            mod(date_part('microseconds',receipt.captured_at)::bigint,1000)=0
              AS canonical_millisecond
       FROM lawos_meta.outlook_authority_bootstrap_receipts AS receipt
       JOIN pg_class AS relation ON relation.oid=
         'lawos_meta.outlook_authority_bootstrap_receipts'::regclass
       JOIN pg_roles AS owner ON owner.oid=relation.relowner`,
  )).rows[0];
  assert.equal(receipt.role_bootstrap_sha256,
    expectedAuthority.role_bootstrap_sha256);
  assert.equal(receipt.authority_manifest_sha256,
    TEST_OUTLOOK_AUTHORITY_MANIFEST_SHA256);
  assert.equal(receipt.database_target_receipt_sha256,
    TEST_OUTLOOK_DATABASE_TARGET_RECEIPT_SHA256);
  assert.equal(receipt.migration_catalog_sha256,
    TEST_OUTLOOK_MIGRATION_CATALOG_SHA256);
  assert.equal(receipt.digest_domain, AUTHORITY.bootstrap_receipt.digest_domain);
  assert.equal(receipt.postgres_major, 16);
  assert.equal(receipt.owner, AUTHORITY.bootstrap_receipt.owner);
  assert.equal(receipt.relrowsecurity, false);
  assert.equal(receipt.relforcerowsecurity, false);
  assert.equal(receipt.canonical_millisecond, true);
  assert.equal(receipt.protected_roles.length, 5);
  assert.equal(receipt.protected_memberships.length,
    4 + Number(expectedAuthority.lawos_app_membership_present));
  const protectedFacts = await readOutlookAssignmentProtectedObjectFacts(
    fixture.adminPool,
  );
  assert.equal(protectedFacts.protected_table_count, 25);
  assert.equal(protectedFacts.protected_function_count, 52);
  assert.equal(protectedFacts.protected_object_facts_sha256,
    OUTLOOK_DESKTOP_ASSIGNMENT_PROTECTED_OBJECT_FACTS_SHA256);
  const retryInvariant = (await fixture.adminPool.query(
    `SELECT pg_get_constraintdef(constraint_row.oid) AS definition
       FROM pg_constraint AS constraint_row
      WHERE constraint_row.conrelid=
        'lawos_email_dms.outlook_desktop_assignment_outbox'::regclass
        AND constraint_row.conname='outlook_desktop_assignment_retry_epoch_check'`,
  )).rows[0]?.definition;
  assert.match(retryInvariant,
    /attempt_count >= \(retry_epoch \+ retry_epoch_attempt_count\)/u);
  assert.equal(receipt.protected_roles.every((role) =>
    !("config" in role) && typeof role.valid_until_present === "boolean"
      && /^[a-f0-9]{64}$/u.test(role.config_sha256)), true);
  const appConfig = (await fixture.adminPool.query(
    "SELECT rolconfig,rolvaliduntil FROM pg_roles WHERE rolname='lawos_app'",
  )).rows[0];
  assert.equal(appConfig.rolvaliduntil, null);
  assert.notDeepEqual(appConfig.rolconfig, [...appConfig.rolconfig].sort());
  await assert.rejects(
    fixture.bootstrapPool.query(
      `UPDATE lawos_meta.outlook_authority_bootstrap_receipts
          SET captured_at=captured_at+interval '1 millisecond'`,
    ), /immutable/iu,
  );

  for (const table of AUTHORITY.tables) {
    const relation = await fixture.adminPool.query(
      `SELECT owner.rolname AS owner,relation.relrowsecurity,relation.relforcerowsecurity
         FROM pg_class AS relation
         JOIN pg_roles AS owner ON owner.oid=relation.relowner
        WHERE relation.oid=to_regclass($1)`,
      [table.name],
    );
    assert.deepEqual(relation.rows[0], {
      owner: AUTHORITY.owner,
      relrowsecurity: table.rls_enabled,
      relforcerowsecurity: table.rls_forced,
    }, table.name);
    const policies = await fixture.adminPool.query(
      `SELECT policy.polname,policy.polpermissive,policy.polcmd,policy.polroles,
              pg_get_expr(policy.polqual,policy.polrelid) AS using_expression,
              pg_get_expr(policy.polwithcheck,policy.polrelid) AS check_expression
         FROM pg_policy AS policy
        WHERE policy.polrelid=to_regclass($1) ORDER BY policy.polname`,
      [table.name],
    );
    assert.deepEqual(policies.rows, [{
      polname: table.policy,
      polpermissive: true,
      polcmd: "*",
      polroles: [0],
      using_expression: "(tenant_id = lawos_security.current_tenant_id())",
      check_expression: "(tenant_id = lawos_security.current_tenant_id())",
    }], table.name);
    const acl = await fixture.adminPool.query(
      `SELECT COALESCE(role.rolname,'PUBLIC') AS grantee,privilege.privilege_type,
              privilege.is_grantable
         FROM pg_class AS relation
         CROSS JOIN LATERAL aclexplode(COALESCE(relation.relacl,acldefault('r',relation.relowner))) AS privilege
         LEFT JOIN pg_roles AS role ON role.oid=privilege.grantee
        WHERE relation.oid=to_regclass($1) AND privilege.grantee<>relation.relowner`,
      [table.name],
    );
    const expected = Object.entries(table.privileges)
      .flatMap(([role, privileges]) => privileges.map((privilege) => `${role}:${privilege}`)).sort();
    assert.deepEqual(sortedAcl(acl.rows), expected, table.name);
    assert.equal(acl.rows.every(({ is_grantable }) => !is_grantable), true,
      `${table.name} grant options`);
    const columnAcl = await fixture.adminPool.query(
      `SELECT attribute.attname,privilege.privilege_type
         FROM pg_attribute AS attribute
         CROSS JOIN LATERAL aclexplode(attribute.attacl) AS privilege
        WHERE attribute.attrelid=to_regclass($1)
          AND attribute.attnum>0 AND NOT attribute.attisdropped`,
      [table.name],
    );
    assert.deepEqual(columnAcl.rows, [], `${table.name} column ACL`);
    const triggers = await fixture.adminPool.query(
      `SELECT trigger.tgname AS name,
              trigger.tgfoid::regprocedure::text AS function_signature,
              trigger.tgtype::integer AS type,trigger.tgenabled AS enabled,
              trigger.tgconstraint::integer AS constraint_oid,
              trigger.tgdeferrable AS deferrable,
              trigger.tginitdeferred AS initially_deferred
         FROM pg_trigger AS trigger
        WHERE trigger.tgrelid=to_regclass($1) AND NOT trigger.tgisinternal
        ORDER BY trigger.tgname`,
      [table.name],
    );
    assert.deepEqual(triggers.rows,
      [...table.triggers].sort((left, right) => left.name.localeCompare(right.name)),
      `${table.name} trigger inventory`);
  }

  for (const fn of AUTHORITY.functions) {
    const procedure = await fixture.adminPool.query(
      `SELECT owner.rolname AS owner
         FROM pg_proc AS procedure
         JOIN pg_roles AS owner ON owner.oid=procedure.proowner
        WHERE procedure.oid=to_regprocedure($1)`,
      [fn.signature],
    );
    assert.deepEqual(procedure.rows, [{ owner: fn.owner }], fn.signature);
    const acl = await fixture.adminPool.query(
      `SELECT COALESCE(role.rolname,'PUBLIC') AS grantee,privilege.privilege_type,
              privilege.is_grantable
         FROM pg_proc AS procedure
         CROSS JOIN LATERAL aclexplode(COALESCE(procedure.proacl,acldefault('f',procedure.proowner))) AS privilege
         LEFT JOIN pg_roles AS role ON role.oid=privilege.grantee
        WHERE procedure.oid=to_regprocedure($1) AND privilege.grantee<>procedure.proowner`,
      [fn.signature],
    );
    const expected = Object.entries(fn.privileges)
      .flatMap(([role, privileges]) => privileges.map((privilege) => `${role}:${privilege}`)).sort();
    assert.deepEqual(sortedAcl(acl.rows), expected, fn.signature);
    assert.equal(acl.rows.every(({ is_grantable }) => !is_grantable), true,
      `${fn.signature} grant options`);
  }

  for (const subject of SUBJECTS) {
    if (subject === "PUBLIC") {
      const schemaAcl = await fixture.adminPool.query(
        `SELECT privilege.privilege_type
           FROM pg_namespace AS namespace
           CROSS JOIN LATERAL aclexplode(COALESCE(namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
          WHERE namespace.nspname='lawos_email_dms' AND privilege.grantee=0`,
      );
      assert.deepEqual(schemaAcl.rows, []);
      continue;
    }
    const schema = await fixture.adminPool.query(
      `SELECT has_schema_privilege($1,'lawos_email_dms','USAGE') AS usage,
              has_schema_privilege($1,'lawos_email_dms','CREATE') AS create`,
      [subject],
    );
    assert.equal(schema.rows[0].usage,
      AUTHORITY.schema.privileges[subject]?.includes("USAGE") ?? false,
      subject);
    assert.equal(schema.rows[0].create, false, subject);
  }
  const schemaAcl = await fixture.adminPool.query(
    `SELECT COALESCE(role.rolname,'PUBLIC') AS grantee,privilege.privilege_type,
            privilege.is_grantable
       FROM pg_namespace AS namespace
       CROSS JOIN LATERAL aclexplode(COALESCE(namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
       LEFT JOIN pg_roles AS role ON role.oid=privilege.grantee
      WHERE namespace.nspname='lawos_email_dms'
        AND privilege.grantee<>namespace.nspowner`,
  );
  assert.deepEqual(sortedAcl(schemaAcl.rows), Object.entries(
    AUTHORITY.schema.privileges,
  ).flatMap(([role, privileges]) => privileges.map(
    (privilege) => `${role}:${privilege}`,
  )).sort());
  assert.equal(schemaAcl.rows.every(({ is_grantable }) => !is_grantable), true);
  const metaSchemaAcl = await fixture.adminPool.query(
    `SELECT COALESCE(role.rolname,'PUBLIC') AS grantee,privilege.privilege_type,
            privilege.is_grantable
       FROM pg_namespace AS namespace
       CROSS JOIN LATERAL aclexplode(COALESCE(
         namespace.nspacl,acldefault('n',namespace.nspowner))) AS privilege
       LEFT JOIN pg_roles AS role ON role.oid=privilege.grantee
      WHERE namespace.nspname='lawos_meta'
        AND privilege.grantee<>namespace.nspowner`,
  );
  const requiredMetaAcl = Object.entries(AUTHORITY.meta_schema.privileges)
    .flatMap(([role, privileges]) => privileges.map(
      (privilege) => `${role}:${privilege}`,
    ));
  assert.deepEqual(sortedAcl(metaSchemaAcl.rows), [
    ...requiredMetaAcl,
    `${ATTACKER}:USAGE`,
    `${LEGITIMATE_META_READER}:USAGE`,
  ].sort());
  assert.equal(metaSchemaAcl.rows.every(({ is_grantable }) => !is_grantable), true);
  const metaSchemaCapabilities = await fixture.adminPool.query(
    `SELECT role_name,
            has_schema_privilege(role_name,'lawos_meta','USAGE') AS usage,
            has_schema_privilege(role_name,'lawos_meta','CREATE') AS create
       FROM unnest($1::text[]) AS role(role_name) ORDER BY role_name`,
    [[ATTACKER, DELEGATE]],
  );
  assert.deepEqual(metaSchemaCapabilities.rows, [
    { role_name: ATTACKER, usage: true, create: false },
    { role_name: DELEGATE, usage: false, create: false },
  ]);
  const hostileDefaults = await fixture.adminPool.query(
    `SELECT 1
       FROM pg_default_acl AS defaults
       JOIN pg_namespace AS namespace ON namespace.oid=defaults.defaclnamespace
       CROSS JOIN LATERAL aclexplode(defaults.defaclacl) AS privilege
      WHERE namespace.nspname='lawos_email_dms'
        AND privilege.grantee=$1::regrole`,
    [ATTACKER],
  );
  assert.equal(hostileDefaults.rowCount, 0);
});

test("application and pregranted attacker cannot bypass protected authority", async (t) => {
  const fixture = await createEmailDmsMigrationFixture(t);
  if (!fixture) return;
  await applyWithAdversarialDefaults(t, fixture);
  const tenant = "tenant-assignment-schema-a";
  const crossTenantRead = await withPostgresTransaction(
    fixture.appPool,
    { tenant_id: tenant, readOnly: true },
    (client) => client.query(
      `SELECT release_artifact_id
         FROM lawos_email_dms.outlook_desktop_release_artifacts
        WHERE tenant_id='tenant-assignment-schema-foreign'`,
    ),
  );
  assert.equal(crossTenantRead.rowCount, 0);
  await assert.rejects(
    fixture.adminPool.query(
      "SELECT * FROM lawos_email_dms.outlook_desktop_installations",
    ), (error) => error?.code === "42501",
  );
  for (const statement of [
    "UPDATE lawos_email_dms.outlook_desktop_release_artifacts SET revoked_at=clock_timestamp()",
    `INSERT INTO lawos_email_dms.outlook_desktop_assignment_states
       (tenant_id,user_id,entra_subject_id,policy_revision,policy_binding_sha256,
        active_trusted_install_count,trust_authority,trust_authority_revision,
        trust_authority_binding_sha256,desired_assigned,denial_reasons,
        aggregate_sha256,state_revision,provider_generation,
        provider_intent_sha256,evaluated_at)
     VALUES ('tenant-assignment-schema-a','forged-user','forged-subject',1,
             repeat('a',64),1,'forged',1,repeat('b',64),true,'[]',
             repeat('c',64),1,1,repeat('d',64),clock_timestamp())`,
  ]) {
    await assert.rejects(withPostgresTransaction(
      fixture.appPool,
      { tenant_id: tenant },
      (client) => client.query(statement),
    ), (error) => error?.code === "LAWOS_POSTGRES_ACCESS_DENIED" && error?.postgres_code === "42501");
  }

  const attackerUrl = new URL(fixture.instance.connection_string);
  attackerUrl.username = ATTACKER;
  const attackerPool = createPostgresPool({
    connectionString: attackerUrl.toString(),
    sslMode: "disable",
    allowInsecureLocal: true,
    applicationName: "lawos-outlook-acl-attacker-test",
  });
  try {
    await assert.rejects(
      attackerPool.query("SELECT lawos_email_dms.authorize_outlook_desktop_activation('tenant-x','{}'::jsonb)"),
      (error) => error?.code === "42501",
    );
    await assert.rejects(
      attackerPool.query("SELECT * FROM lawos_meta.outlook_authority_bootstrap_receipts"),
      (error) => error?.code === "42501",
    );
    await assert.rejects(
      attackerPool.query(`UPDATE lawos_email_dms.outlook_desktop_installations
        SET lease_expires_at=clock_timestamp() WHERE false`),
      (error) => error?.code === "42501",
    );
  } finally {
    await attackerPool.end();
  }
});
