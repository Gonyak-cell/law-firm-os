import { createHash } from "node:crypto";
import {
  normalizeOutlookAuthorityMigrationPauseExpectation,
} from "../../persistence/src/postgres/migration-runner.js";
import { OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG as AUTHORITY } from "./outlook-desktop-assignment-authority-catalog.js";

export const OUTLOOK_ASSIGNMENT_BOOTSTRAP_RECEIPT_SCHEMA_VERSION =
  AUTHORITY.bootstrap_receipt.schema_version;
export const OUTLOOK_ASSIGNMENT_MIGRATION_SCHEMA_VERSION =
  AUTHORITY.bootstrap_receipt.migration_schema_version;
export const OUTLOOK_ASSIGNMENT_MIGRATION_CATALOG_ID =
  AUTHORITY.bootstrap_receipt.migration_catalog_id;
export const OUTLOOK_ASSIGNMENT_BOOTSTRAP_DIGEST_DOMAIN =
  AUTHORITY.bootstrap_receipt.digest_domain;
export const OUTLOOK_ASSIGNMENT_BOOTSTRAP_CANONICAL_SEGMENT_ORDER =
  AUTHORITY.bootstrap_receipt.canonical_segment_order;

const ADMIN = AUTHORITY.migration_admin;
const TARGET_SCHEMA = AUTHORITY.schema.name;
const ROLE_NAMES = Object.freeze(Object.keys(AUTHORITY.role_attributes).sort());

export function createOutlookAssignmentMigrationPauseExpectation({
  role_bootstrap_sha256,
  authority_manifest_sha256,
  database_target_receipt_sha256,
  migration_catalog_sha256,
} = {}) {
  return normalizeOutlookAuthorityMigrationPauseExpectation({
    schema_version: OUTLOOK_ASSIGNMENT_BOOTSTRAP_RECEIPT_SCHEMA_VERSION,
    role_bootstrap_sha256,
    authority_manifest_sha256,
    database_target_receipt_sha256,
    migration_catalog_sha256,
  });
}

export const assertOutlookAssignmentMigrationPauseExpectation =
  normalizeOutlookAuthorityMigrationPauseExpectation;

export async function readOutlookAssignmentMigrationPauseExpectation(client) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL migration client is required");
  }
  const rows = (await client.query(
    `SELECT schema_version,role_bootstrap_sha256,
            authority_manifest_sha256,database_target_receipt_sha256,
            migration_catalog_sha256
       FROM lawos_meta.outlook_authority_bootstrap_receipts
      WHERE database_oid=(SELECT oid FROM pg_database
                            WHERE datname=current_database())
        AND database_name=current_database()
        AND migration_catalog_id=$1`,
    [OUTLOOK_ASSIGNMENT_MIGRATION_CATALOG_ID],
  )).rows;
  if (rows.length !== 1) {
    throw new TypeError("Outlook authority persisted pause expectation is invalid");
  }
  return createOutlookAssignmentMigrationPauseExpectation(rows[0]);
}

function bool(value) {
  return value ? "true" : "false";
}

function encodedSegments(values) {
  return (values ?? []).flatMap((value) => {
    const encoded = Buffer.from(String(value), "utf8");
    const length = Buffer.allocUnsafe(4);
    length.writeUInt32BE(encoded.byteLength);
    return [length, encoded];
  });
}

export function digestOutlookAssignmentAuthoritySegments(values) {
  if (!Array.isArray(values)) throw new TypeError("authority segments must be an array");
  return createHash("sha256").update(Buffer.concat(encodedSegments(values))).digest("hex");
}

function roleSegments(role) {
  const config = [...(role.rolconfig ?? [])].sort((left, right) =>
    Buffer.compare(Buffer.from(left, "utf8"), Buffer.from(right, "utf8")));
  const validUntilPresent = role.valid_until_present === true;
  if ((validUntilPresent && !/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/u.test(role.valid_until))
      || (!validUntilPresent && role.valid_until !== "")) {
    throw new Error("outlook authority role timestamp is invalid");
  }
  return [
    role.role_oid, role.role_name, bool(role.rolcanlogin), bool(role.rolsuper),
    bool(role.rolcreatedb), bool(role.rolcreaterole), bool(role.rolinherit),
    bool(role.rolreplication), bool(role.rolbypassrls), role.rolconnlimit,
    bool(validUntilPresent), role.valid_until, String(config.length), ...config,
  ];
}

function membershipSegments(edge) {
  return [
    edge.granted_role_oid, edge.granted_role, edge.member_oid, edge.member,
    edge.grantor_oid, edge.grantor, bool(edge.admin_option),
    bool(edge.inherit_option), bool(edge.set_option),
  ];
}

function assertRole(role, { login, owner = false } = {}) {
  if (!role || role.rolcanlogin !== login || role.rolsuper
      || role.rolcreatedb || role.rolcreaterole || role.rolinherit
      || role.rolreplication || role.rolbypassrls || (owner && login)) {
    throw new Error(`outlook authority protected role is unsafe: ${role?.role_name ?? "missing"}`);
  }
}

export async function readOutlookAssignmentBootstrapAuthority(pool, {
  database_name: expectedDatabase,
  bootstrap_grantor: expectedGrantor,
  lawos_app_membership_present: expectedAppMembership,
} = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  if (!expectedDatabase || !expectedGrantor || typeof expectedAppMembership !== "boolean") {
    throw new TypeError("configured database, grantor, and app membership are required");
  }
  const client = await pool.connect();
  try {
    const identity = (await client.query(
      `SELECT session_user,current_user,current_database() AS database_name,
              database.oid AS database_oid,
              (current_setting('server_version_num')::integer/10000)::text
                AS postgres_major,
              target_owner.oid::text AS target_schema_owner_oid,
              target_owner.rolname AS target_schema_owner,
              meta_owner.oid::text AS meta_schema_owner_oid,
              meta_owner.rolname AS meta_schema_owner
         FROM pg_database AS database
         JOIN pg_namespace AS target_schema ON target_schema.nspname=$1
         JOIN pg_roles AS target_owner ON target_owner.oid=target_schema.nspowner
         JOIN pg_namespace AS meta_schema ON meta_schema.nspname='lawos_meta'
         JOIN pg_roles AS meta_owner ON meta_owner.oid=meta_schema.nspowner
        WHERE database.datname=current_database()`,
      [TARGET_SCHEMA],
    )).rows[0];
    if (identity?.session_user !== ADMIN || identity.current_user !== ADMIN
        || identity.database_name !== expectedDatabase
        || identity.postgres_major !== AUTHORITY.bootstrap_receipt.postgres_major
        || identity.target_schema_owner !== ADMIN
        || identity.meta_schema_owner !== ADMIN) {
      throw new Error("outlook authority migration database identity mismatch");
    }
    const admin = (await client.query(
      `SELECT oid::text AS role_oid,rolname AS role_name,rolcanlogin,rolsuper,
              rolcreatedb,rolcreaterole,rolinherit,rolreplication,rolbypassrls,
              rolconnlimit::text,rolvaliduntil IS NOT NULL AS valid_until_present,
              COALESCE(to_char(rolvaliduntil AT TIME ZONE 'UTC',
                'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'') AS valid_until,rolconfig
         FROM pg_roles WHERE rolname=$1`, [ADMIN],
    )).rows[0];
    if (!admin?.rolcanlogin || admin.rolsuper || !admin.rolcreatedb
        || !admin.rolcreaterole || admin.rolinherit || admin.rolreplication
        || admin.rolbypassrls) {
      throw new Error("outlook authority migration admin is unsafe");
    }
    const roles = (await client.query(
      `SELECT oid::text AS role_oid,rolname AS role_name,rolcanlogin,rolsuper,
              rolcreatedb,rolcreaterole,rolinherit,rolreplication,rolbypassrls,
              rolconnlimit::text,rolvaliduntil IS NOT NULL AS valid_until_present,
              COALESCE(to_char(rolvaliduntil AT TIME ZONE 'UTC',
                'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'') AS valid_until,rolconfig
         FROM pg_roles WHERE rolname=ANY($1::text[]) ORDER BY rolname`, [ROLE_NAMES],
    )).rows;
    if (roles.length !== ROLE_NAMES.length) throw new Error("outlook authority role inventory mismatch");
    for (const role of roles) assertRole(role, {
      login: role.role_name !== "lawos_outlook_authority_owner",
      owner: role.role_name === "lawos_outlook_authority_owner",
    });
    const edges = (await client.query(
      `SELECT granted.oid::text AS granted_role_oid,granted.rolname AS granted_role,
              member.oid::text AS member_oid,member.rolname AS member,
              grantor.oid::text AS grantor_oid,grantor.rolname AS grantor,
              membership.admin_option,membership.inherit_option,membership.set_option
         FROM pg_auth_members AS membership
         JOIN pg_roles AS granted ON granted.oid=membership.roleid
         JOIN pg_roles AS member ON member.oid=membership.member
         JOIN pg_roles AS grantor ON grantor.oid=membership.grantor
        WHERE granted.rolname=ANY($1::text[]) OR member.rolname=ANY($1::text[])
           OR granted.rolname=$2 OR member.rolname=$2 OR grantor.rolname=$2
        ORDER BY granted.rolname,member.rolname,grantor.rolname`, [ROLE_NAMES, ADMIN],
    )).rows;
    const expectedGrantedRoles = new Set(ROLE_NAMES.filter((role) =>
      role !== "lawos_app" || expectedAppMembership));
    const grantedRoles = new Set(edges.map(({ granted_role: role }) => role));
    const appPresent = grantedRoles.has("lawos_app");
    if (edges.length !== expectedGrantedRoles.size
        || grantedRoles.size !== expectedGrantedRoles.size
        || [...expectedGrantedRoles].some((role) => !grantedRoles.has(role))
        || appPresent !== expectedAppMembership
        || edges.some((edge) => edge.member !== ADMIN || !edge.admin_option
          || edge.inherit_option || edge.set_option || edge.grantor !== expectedGrantor)
        || new Set(edges.map(({ grantor }) => grantor)).size !== 1) {
      throw new Error("outlook authority membership inventory mismatch");
    }
    const values = [
      OUTLOOK_ASSIGNMENT_BOOTSTRAP_DIGEST_DOMAIN,
      OUTLOOK_ASSIGNMENT_BOOTSTRAP_RECEIPT_SCHEMA_VERSION,
      identity.postgres_major,
      identity.database_oid, identity.database_name,
      OUTLOOK_ASSIGNMENT_MIGRATION_CATALOG_ID,
      OUTLOOK_ASSIGNMENT_MIGRATION_SCHEMA_VERSION, TARGET_SCHEMA,
      identity.target_schema_owner_oid, identity.target_schema_owner,
      identity.meta_schema_owner_oid, identity.meta_schema_owner,
      ...roleSegments(admin), edges[0].grantor_oid, expectedGrantor,
      String(roles.length), ...roles.flatMap(roleSegments), bool(appPresent),
      String(edges.length),
      ...edges.flatMap(membershipSegments),
    ];
    return Object.freeze({
      role_bootstrap_sha256: digestOutlookAssignmentAuthoritySegments(values),
      bootstrap_grantor: expectedGrantor,
      database_name: identity.database_name,
      database_oid: String(identity.database_oid),
      lawos_app_membership_present: appPresent,
    });
  } finally {
    client.release();
  }
}
