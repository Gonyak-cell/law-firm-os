import { createHash } from "node:crypto";
import { hashDomainValue } from "../domain-ledger.js";
import { setPostgresRolePassword } from "./role-password.js";

export const LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE =
  "lawos_outlook_authority_owner";
export const LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE =
  "lawos_outlook_control_operator";
export const LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE =
  "lawos_outlook_assignment_worker";
export const LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE =
  "lawos_outlook_lifecycle_verifier";
export const LAWOS_OUTLOOK_MIGRATION_ADMIN_ROLE = "lawos_admin";
export const LAWOS_OUTLOOK_ROLE_BOOTSTRAP_SCHEMA_VERSION =
  "lawos.outlook-authority-role-bootstrap-receipt.v1";

const CATALOG_SCHEMA_VERSION =
  "law-firm-os.outlook-authority-catalog.v1";
const ROLE_READINESS_SCHEMA_VERSION =
  "law-firm-os.outlook-role-readiness.v2";
const NATIVE_RDS_READINESS_SCHEMA_VERSION =
  "law-firm-os.outlook-role-readiness.native-rds-history.v1";
const NATIVE_RDS_BOOTSTRAP_GRANTOR = "lawos_outlook_bootstrap_grantor";
const APPLICATION_ROLE_PRECONDITION_SCHEMA_VERSION =
  "lawos.outlook-application-role-precondition.v1";
const APPLICATION_ROLE = "lawos_app";
const OUTLOOK_AUTHORITY_SCHEMA = "lawos_email_dms";
const META_SCHEMA = "lawos_meta";
const TENANT_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const MANAGED_ROLES = Object.freeze([
  LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
  LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
  LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
  LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
]);
const LOGIN_ROLES = Object.freeze([
  LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
  LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
  LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
]);
const MEMBERSHIP_SCOPE_ROLES = Object.freeze([
  ...MANAGED_ROLES,
  APPLICATION_ROLE,
]);
const MEMBERSHIP_EDGE_SCOPE_ROLES = Object.freeze([
  ...MEMBERSHIP_SCOPE_ROLES,
  LAWOS_OUTLOOK_MIGRATION_ADMIN_ROLE,
]);
const BOOTSTRAP_ROLE_ATTRIBUTE_KEYS = Object.freeze([
  "can_login",
  "superuser",
  "createdb",
  "createrole",
  "inherit",
  "replication",
  "bypass_rls",
  "connection_limit",
  "valid_until_present",
  "valid_until",
  "config_count",
  "config",
]);
const APPLICATION_ROLE_CONFIG = Object.freeze([
  "idle_in_transaction_session_timeout=30s",
  "lock_timeout=5s",
  "statement_timeout=30s",
]);
const APPROVED_ACL_ROLES = new Set([
  ...MANAGED_ROLES,
  APPLICATION_ROLE,
  LAWOS_OUTLOOK_MIGRATION_ADMIN_ROLE,
  "public",
]);
const APPROVED_OBJECT_OWNERS = new Set([
  LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE,
  LAWOS_OUTLOOK_MIGRATION_ADMIN_ROLE,
]);
const TABLE_PRIVILEGES = new Set([
  "DELETE",
  "INSERT",
  "REFERENCES",
  "SELECT",
  "TRIGGER",
  "TRUNCATE",
  "UPDATE",
]);
const SCHEMA_PRIVILEGES = new Set(["CREATE", "USAGE"]);
const FUNCTION_PRIVILEGES = new Set(["EXECUTE"]);
const SHA256 = /^[0-9a-f]{64}$/u;
const SAFE_FUNCTION_SEARCH_PATH = "search_path=pg_catalog";
const POLICY_COMMANDS = new Set([
  "ALL",
  "DELETE",
  "INSERT",
  "SELECT",
  "UPDATE",
]);

function requiredText(value, label) {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw new TypeError(`${label} is required`);
  }
  return value;
}

function drift(code, message) {
  return Object.assign(new Error(message), {
    code,
    safe_error_code: code.replace(/^LAWOS_/u, ""),
  });
}

function approvedTenants(values) {
  const tenants = [...new Set(
    (values ?? []).map((value) => requiredText(value, "approved tenant id")),
  )].sort();
  if (tenants.length === 0
    || tenants.some((tenant) =>
      !TENANT_ID.test(tenant)
      || tenant === "*"
      || /^tenant_lawos_staging_/u.test(tenant))) {
    throw new TypeError(
      "exact approved non-wildcard production tenant ids are required",
    );
  }
  return tenants;
}

function expectedRole(roleName) {
  return {
    rolname: roleName,
    rolcanlogin: LOGIN_ROLES.includes(roleName) || roleName === APPLICATION_ROLE,
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolinherit: false,
    rolreplication: false,
    rolbypassrls: false,
  };
}

function assertExactRole(row, roleName) {
  const expected = expectedRole(roleName);
  if (!row || Object.entries(expected).some(([key, value]) => row[key] !== value)) {
    throw drift(
      "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
      "Outlook database role privilege drifted",
    );
  }
}

function assertExactRoles(rows) {
  const byName = new Map(rows.map((row) => [row.rolname, row]));
  if (byName.size !== MANAGED_ROLES.length) {
    throw drift(
      "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
      "Outlook database role catalog is incomplete",
    );
  }
  for (const roleName of MANAGED_ROLES) {
    assertExactRole(byName.get(roleName), roleName);
  }
}

async function readRoles(client, roleNames = MANAGED_ROLES) {
  const result = await client.query(
    `SELECT oid::text AS role_oid, rolname, rolcanlogin, rolsuper,
            rolcreatedb, rolcreaterole, rolinherit, rolreplication,
            rolbypassrls, rolconnlimit,
            CASE WHEN rolvaliduntil IS NULL THEN NULL
                 ELSE to_char(rolvaliduntil AT TIME ZONE 'UTC',
                              'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') END
              AS rolvaliduntil_canonical,
            rolconfig
       FROM pg_roles
      WHERE rolname = ANY($1::name[])
      ORDER BY rolname`,
    [roleNames],
  );
  return result.rows;
}

function bootstrapDrift(message) {
  return drift("LAWOS_OUTLOOK_DATABASE_ROLE_BOOTSTRAP_DRIFT", message);
}

function canonicalBootstrapText(value, label) {
  if (typeof value !== "string" || !value || value.trim() !== value) {
    throw bootstrapDrift(`${label} is invalid`);
  }
  return value;
}

function exactKeys(value, expected) {
  return value
    && typeof value === "object"
    && !Array.isArray(value)
    && equalJson(Object.keys(value).sort(), [...expected].sort());
}

function normalizedOid(value) {
  const canonical = typeof value === "number"
    ? String(value)
    : value;
  if (typeof canonical !== "string"
    || !/^[1-9][0-9]{0,9}$/u.test(canonical)) {
    throw bootstrapDrift("Outlook role bootstrap OID is invalid");
  }
  const oid = Number(canonical);
  if (!Number.isSafeInteger(oid) || oid < 1 || oid > 4_294_967_295) {
    throw bootstrapDrift("Outlook role bootstrap OID is invalid");
  }
  return oid;
}

function normalizedRoleState(value, expectedRoleName = null) {
  const roleName = canonicalBootstrapText(
    value?.name,
    "Outlook bootstrap role name",
  );
  if (value?.config != null && !Array.isArray(value.config)) {
    throw bootstrapDrift("Outlook role bootstrap role state is invalid");
  }
  const config = value?.config == null ? Object.freeze([]) : Object.freeze(
    value.config.map((setting) =>
      canonicalBootstrapText(
        setting,
        "Outlook bootstrap role configuration",
      )).sort(),
  );
  if ((expectedRoleName && roleName !== expectedRoleName)
    || !exactKeys(value, ["oid", "name", ...BOOTSTRAP_ROLE_ATTRIBUTE_KEYS])
    || [
      "can_login",
      "superuser",
      "createdb",
      "createrole",
      "inherit",
      "replication",
      "bypass_rls",
    ].some((key) => typeof value[key] !== "boolean")
    || !Number.isSafeInteger(value.connection_limit)
    || value.connection_limit < -1
    || typeof value.valid_until_present !== "boolean"
    || (value.valid_until_present !== (value.valid_until !== null))
    || (value.valid_until !== null
      && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/u.test(
        value.valid_until,
      ))
    || !Number.isSafeInteger(value.config_count)
    || value.config_count !== config.length
    || new Set(config).size !== config.length
    ) {
    throw bootstrapDrift("Outlook role bootstrap role state is invalid");
  }
  return Object.freeze({
    oid: normalizedOid(value.oid),
    name: roleName,
    can_login: value.can_login,
    superuser: value.superuser,
    createdb: value.createdb,
    createrole: value.createrole,
    inherit: value.inherit,
    replication: value.replication,
    bypass_rls: value.bypass_rls,
    connection_limit: value.connection_limit,
    valid_until_present: value.valid_until_present,
    valid_until: value.valid_until,
    config_count: config.length,
    config,
  });
}

function roleState(row) {
  return normalizedRoleState({
    oid: row.role_oid,
    name: row.rolname,
    can_login: row.rolcanlogin,
    superuser: row.rolsuper,
    createdb: row.rolcreatedb,
    createrole: row.rolcreaterole,
    inherit: row.rolinherit,
    replication: row.rolreplication,
    bypass_rls: row.rolbypassrls,
    connection_limit: row.rolconnlimit,
    valid_until_present: row.rolvaliduntil_canonical !== null,
    valid_until: row.rolvaliduntil_canonical,
    config_count: row.rolconfig?.length ?? 0,
    config: row.rolconfig ?? [],
  });
}

function normalizedDatabase(value) {
  if (!exactKeys(value, ["oid", "name"])) {
    throw bootstrapDrift("Outlook role bootstrap database is invalid");
  }
  return Object.freeze({
    oid: normalizedOid(value.oid),
    name: canonicalBootstrapText(
      value.name,
      "Outlook bootstrap database name",
    ),
  });
}

function normalizedMigration(value) {
  if (!exactKeys(value, ["catalog_id", "schema_version", "target_schema"])) {
    throw bootstrapDrift("Outlook role bootstrap migration is invalid");
  }
  return Object.freeze({
    catalog_id: canonicalBootstrapText(
      value.catalog_id,
      "Outlook bootstrap migration catalog id",
    ),
    schema_version: canonicalBootstrapText(
      value.schema_version,
      "Outlook bootstrap migration schema version",
    ),
    target_schema: canonicalBootstrapText(
      value.target_schema,
      "Outlook bootstrap migration target schema",
    ),
  });
}

function normalizedRoleReference(value, label) {
  if (!exactKeys(value, ["oid", "name"])) {
    throw bootstrapDrift(`${label} is invalid`);
  }
  return Object.freeze({
    oid: normalizedOid(value.oid),
    name: canonicalBootstrapText(value.name, label),
  });
}

const MEMBERSHIP_KEYS = Object.freeze([
  "granted_role",
  "member",
  "grantor",
  "admin_option",
  "inherit_option",
  "set_option",
]);

function normalizedMembership(value) {
  if (!exactKeys(value, MEMBERSHIP_KEYS)
    || ["admin_option", "inherit_option", "set_option"].some(
      (key) => typeof value[key] !== "boolean",
    )) {
    throw bootstrapDrift("Outlook role bootstrap membership is invalid");
  }
  return Object.freeze({
    granted_role: normalizedRoleReference(
      value.granted_role,
      "Outlook granted role",
    ),
    member: normalizedRoleReference(value.member, "Outlook member role"),
    grantor: normalizedRoleReference(value.grantor, "Outlook grantor role"),
    admin_option: value.admin_option,
    inherit_option: value.inherit_option,
    set_option: value.set_option,
  });
}

function compareMembership(left, right) {
  return left.granted_role.name.localeCompare(right.granted_role.name)
    || left.member.name.localeCompare(right.member.name)
    || left.grantor.name.localeCompare(right.grantor.name)
    || left.granted_role.oid - right.granted_role.oid
    || left.member.oid - right.member.oid
    || left.grantor.oid - right.grantor.oid;
}

function assertExactBootstrapRole(role) {
  const expected = expectedRole(role.name);
  const expectedConfig = role.name === APPLICATION_ROLE
    ? APPLICATION_ROLE_CONFIG
    : [];
  if (role.can_login !== expected.rolcanlogin
    || role.superuser !== expected.rolsuper
    || role.createdb !== expected.rolcreatedb
    || role.createrole !== expected.rolcreaterole
    || role.inherit !== expected.rolinherit
    || role.replication !== expected.rolreplication
    || role.bypass_rls !== expected.rolbypassrls
    || role.valid_until_present !== false
    || role.valid_until !== null
    || role.connection_limit !== (role.name === APPLICATION_ROLE ? 64 : -1)
    || role.config_count !== expectedConfig.length
    || !equalJson(role.config, expectedConfig)) {
    throw drift(
      "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
      "Outlook database role privilege drifted",
    );
  }
}

function assertExactMigrationAdmin(role, { nativeRdsHistory = false } = {}) {
  if (role.can_login !== true
    || role.superuser !== false
    || role.createdb !== true
    || role.createrole !== true
    || role.inherit !== nativeRdsHistory
    || role.replication !== false
    || role.bypass_rls !== false
    || role.connection_limit !== -1
    || role.valid_until_present !== false
    || role.valid_until !== null
    || role.config_count !== 0) {
    throw bootstrapDrift("Outlook migration admin privilege drifted");
  }
  return role;
}

function normalizeRoleBootstrap(value, { nativeRdsHistory = null } = {}) {
  if (!exactKeys(value, [
    "schema_version",
    "postgres_major",
    "database",
    "migration",
    "schema_owners",
    "migration_admin",
    "bootstrap_grantor",
    "roles",
    "memberships",
  ]) || value.schema_version !== LAWOS_OUTLOOK_ROLE_BOOTSTRAP_SCHEMA_VERSION) {
    throw bootstrapDrift("Outlook role bootstrap schema is invalid");
  }
  if (value.postgres_major !== 16) {
    throw bootstrapDrift("Outlook role bootstrap PostgreSQL major drifted");
  }
  const migrationAdmin = normalizedRoleState(
    value.migration_admin,
    LAWOS_OUTLOOK_MIGRATION_ADMIN_ROLE,
  );
  assertExactMigrationAdmin(migrationAdmin, {
    nativeRdsHistory: nativeRdsHistory !== null,
  });
  if (!exactKeys(value.schema_owners, [
    OUTLOOK_AUTHORITY_SCHEMA,
    META_SCHEMA,
  ])) {
    throw bootstrapDrift("Outlook role bootstrap schema owners are invalid");
  }
  const schemaOwners = Object.freeze({
    [OUTLOOK_AUTHORITY_SCHEMA]: normalizedRoleReference(
      value.schema_owners[OUTLOOK_AUTHORITY_SCHEMA],
      "Outlook authority schema owner",
    ),
    [META_SCHEMA]: normalizedRoleReference(
      value.schema_owners[META_SCHEMA],
      "Outlook metadata schema owner",
    ),
  });
  if (Object.values(schemaOwners).some(({ oid, name }) =>
    oid !== migrationAdmin.oid || name !== migrationAdmin.name)) {
    throw bootstrapDrift("Outlook role bootstrap schema ownership drifted");
  }
  if (!Array.isArray(value.roles)
    || value.roles.length !== MEMBERSHIP_SCOPE_ROLES.length) {
    throw bootstrapDrift("Outlook role bootstrap state is incomplete");
  }
  const roles = Object.freeze(value.roles
    .map((role) => normalizedRoleState(role))
    .sort((left, right) => left.name.localeCompare(right.name)));
  if (!equalJson(
    roles.map(({ name }) => name),
    [...MEMBERSHIP_SCOPE_ROLES].sort(),
  ) || new Set(roles.map(({ oid }) => oid)).size !== roles.length
    || roles.some(({ oid, name }) =>
      oid === migrationAdmin.oid || name === migrationAdmin.name)) {
    throw bootstrapDrift("Outlook role bootstrap identities drifted");
  }
  for (const role of roles) {
    assertExactBootstrapRole(role);
  }
  const grantor = normalizedRoleReference(
    value.bootstrap_grantor,
    "Outlook bootstrap grantor role",
  );
  if (grantor.name === migrationAdmin.name
    || grantor.oid === migrationAdmin.oid
    || roles.some(({ name, oid }) => name === grantor.name || oid === grantor.oid)) {
    throw bootstrapDrift("Outlook role bootstrap grantor is not independent");
  }
  if (!Array.isArray(value.memberships)) {
    throw bootstrapDrift("Outlook role bootstrap memberships are missing");
  }
  const memberships = Object.freeze(
    value.memberships.map(normalizedMembership).sort(compareMembership),
  );
  const rolesByName = new Map(roles.map((role) => [role.name, role]));
  const applicationEdges = memberships.filter(
    ({ granted_role: grantedRole }) => grantedRole.name === APPLICATION_ROLE,
  );
  if (memberships.length !== MANAGED_ROLES.length + applicationEdges.length
    || applicationEdges.length > 1
    || memberships.some((membership) => {
      const granted = rolesByName.get(membership.granted_role.name);
      return !granted
        || membership.granted_role.oid !== granted.oid
        || membership.member.name !== migrationAdmin.name
        || membership.member.oid !== migrationAdmin.oid
        || membership.grantor.name !== grantor.name
        || membership.grantor.oid !== grantor.oid
        || membership.admin_option !== true
        || membership.inherit_option !== false
        || membership.set_option !== false;
    })
    || MANAGED_ROLES.some((roleName) =>
      memberships.filter(({ granted_role: grantedRole }) =>
        grantedRole.name === roleName).length !== 1)) {
    throw drift(
      "LAWOS_OUTLOOK_DATABASE_ROLE_MEMBERSHIP_DRIFT",
      "Outlook database role membership drifted",
    );
  }
  const bootstrap = Object.freeze({
    schema_version: LAWOS_OUTLOOK_ROLE_BOOTSTRAP_SCHEMA_VERSION,
    postgres_major: 16,
    database: normalizedDatabase(value.database),
    migration: normalizedMigration(value.migration),
    schema_owners: schemaOwners,
    migration_admin: migrationAdmin,
    bootstrap_grantor: grantor,
    roles,
    memberships,
  });
  if (nativeRdsHistory !== null) {
    normalizeNativeRdsHistory(nativeRdsHistory, bootstrap);
  }
  return bootstrap;
}

function normalizeNativeRdsHistory(value, bootstrap) {
  const pauseKeys = ["schema_version", "role_bootstrap_sha256",
    "authority_manifest_sha256", "database_target_receipt_sha256",
    "migration_catalog_sha256"];
  if (!exactKeys(value, ["pause_expectation", "bootstrap_grantor",
    "rds_superuser", "rdsadmin", "memberships"])
    || !exactKeys(value.pause_expectation, pauseKeys)
    || value.pause_expectation.schema_version
      !== LAWOS_OUTLOOK_ROLE_BOOTSTRAP_SCHEMA_VERSION
    || pauseKeys.slice(1).some((key) => typeof value.pause_expectation[key] !== "string"
      || !SHA256.test(value.pause_expectation[key]))) {
    throw bootstrapDrift("Native RDS historical authority is invalid");
  }
  const grantor = normalizedRoleState(value.bootstrap_grantor,
    NATIVE_RDS_BOOTSTRAP_GRANTOR);
  const rdsSuperuser = normalizedRoleState(value.rds_superuser, "rds_superuser");
  for (const role of [grantor, rdsSuperuser]) {
    if (role.can_login || role.superuser || role.createdb || role.createrole
      || role.inherit !== (role.name === "rds_superuser")
      || role.replication || role.bypass_rls || role.connection_limit !== -1
      || role.valid_until_present || role.valid_until !== null || role.config_count !== 0) {
      throw bootstrapDrift("Native RDS supporting role privilege drifted");
    }
  }
  const platformKeys = ["can_login", "superuser", "createdb", "createrole",
    "inherit", "replication", "bypass_rls"];
  if (!exactKeys(value.rdsadmin, ["oid", "name", ...platformKeys])
    || value.rdsadmin.name !== "rdsadmin"
    || platformKeys.some((key) => value.rdsadmin[key] !== true)) {
    throw bootstrapDrift("Native RDS platform grantor drifted");
  }
  const rdsadmin = Object.freeze({
    ...normalizedRoleReference({ oid: value.rdsadmin.oid, name: value.rdsadmin.name }),
    ...Object.fromEntries(platformKeys.map((key) => [key, true])),
  });
  const allRoles = [bootstrap.migration_admin, ...bootstrap.roles,
    grantor, rdsSuperuser, rdsadmin];
  if (new Set(allRoles.map(({ oid }) => oid)).size !== allRoles.length
    || bootstrap.bootstrap_grantor.oid !== grantor.oid
    || bootstrap.bootstrap_grantor.name !== grantor.name
    || bootstrap.memberships.length !== MANAGED_ROLES.length
    || !Array.isArray(value.memberships)) {
    throw bootstrapDrift("Native RDS historical identities drifted");
  }
  const ref = ({ oid, name }) => ({ oid, name });
  const edge = (role, member, admin, inherit) => ({
    granted_role: ref(role), member: ref(member), grantor: ref(rdsadmin),
    admin_option: admin, inherit_option: inherit, set_option: true,
  });
  const expected = [
    ...bootstrap.memberships,
    ...bootstrap.roles.filter(({ name }) => MANAGED_ROLES.includes(name))
      .map((role) => edge(role, grantor, true, false)),
    edge(grantor, bootstrap.migration_admin, true, false),
    edge(rdsSuperuser, bootstrap.migration_admin, false, true),
  ].map(normalizedMembership).sort(compareMembership);
  const memberships = value.memberships.map(normalizedMembership).sort(compareMembership);
  if (!equalJson(memberships, expected)) {
    throw drift("LAWOS_OUTLOOK_DATABASE_ROLE_MEMBERSHIP_DRIFT",
      "Native RDS historical membership graph drifted");
  }
  return Object.freeze({
    pause_expectation: Object.freeze({ ...value.pause_expectation }),
    bootstrap_grantor: grantor, rds_superuser: rdsSuperuser, rdsadmin,
    memberships: Object.freeze(memberships),
  });
}

function updateLengthPrefixed(hash, value) {
  const bytes = Buffer.from(String(value), "utf8");
  const length = Buffer.allocUnsafe(4);
  length.writeUInt32BE(bytes.byteLength);
  hash.update(length);
  hash.update(bytes);
}

function updateRoleDigest(hash, role) {
  updateLengthPrefixed(hash, role.oid);
  updateLengthPrefixed(hash, role.name);
  for (const key of [
    "can_login",
    "superuser",
    "createdb",
    "createrole",
    "inherit",
    "replication",
    "bypass_rls",
  ]) {
    updateLengthPrefixed(hash, role[key] ? "true" : "false");
  }
  updateLengthPrefixed(hash, role.connection_limit);
  updateLengthPrefixed(hash, role.valid_until_present ? "true" : "false");
  updateLengthPrefixed(hash, role.valid_until ?? "");
  updateLengthPrefixed(hash, role.config_count);
  for (const setting of role.config) updateLengthPrefixed(hash, setting);
}

export function lawosOutlookRoleBootstrapDigest(value, options = {}) {
  const bootstrap = normalizeRoleBootstrap(value, options);
  const hash = createHash("sha256");
  updateLengthPrefixed(
    hash,
    "lawos.outlook-authority-role-bootstrap-receipt.sha256.v1",
  );
  updateLengthPrefixed(hash, bootstrap.schema_version);
  updateLengthPrefixed(hash, bootstrap.postgres_major);
  updateLengthPrefixed(hash, bootstrap.database.oid);
  updateLengthPrefixed(hash, bootstrap.database.name);
  updateLengthPrefixed(hash, bootstrap.migration.catalog_id);
  updateLengthPrefixed(hash, bootstrap.migration.schema_version);
  updateLengthPrefixed(hash, bootstrap.migration.target_schema);
  updateLengthPrefixed(
    hash,
    bootstrap.schema_owners[OUTLOOK_AUTHORITY_SCHEMA].oid,
  );
  updateLengthPrefixed(
    hash,
    bootstrap.schema_owners[OUTLOOK_AUTHORITY_SCHEMA].name,
  );
  updateLengthPrefixed(hash, bootstrap.schema_owners[META_SCHEMA].oid);
  updateLengthPrefixed(hash, bootstrap.schema_owners[META_SCHEMA].name);
  updateRoleDigest(hash, bootstrap.migration_admin);
  updateLengthPrefixed(hash, bootstrap.bootstrap_grantor.oid);
  updateLengthPrefixed(hash, bootstrap.bootstrap_grantor.name);
  updateLengthPrefixed(hash, bootstrap.roles.length);
  for (const role of bootstrap.roles) updateRoleDigest(hash, role);
  const applicationMembershipPresent = bootstrap.memberships.some(
    ({ granted_role: grantedRole }) => grantedRole.name === APPLICATION_ROLE,
  );
  updateLengthPrefixed(
    hash,
    applicationMembershipPresent ? "true" : "false",
  );
  updateLengthPrefixed(hash, bootstrap.memberships.length);
  for (const membership of bootstrap.memberships) {
    updateLengthPrefixed(hash, membership.granted_role.oid);
    updateLengthPrefixed(hash, membership.granted_role.name);
    updateLengthPrefixed(hash, membership.member.oid);
    updateLengthPrefixed(hash, membership.member.name);
    updateLengthPrefixed(hash, membership.grantor.oid);
    updateLengthPrefixed(hash, membership.grantor.name);
    updateLengthPrefixed(hash, membership.admin_option ? "true" : "false");
    updateLengthPrefixed(hash, membership.inherit_option ? "true" : "false");
    updateLengthPrefixed(hash, membership.set_option ? "true" : "false");
  }
  return hash.digest("hex");
}

export function assertLawosOutlookRoleBootstrapReceipt(value, {
  expectedRoleBootstrap = null,
  historicalOutlookBootstrapSha256 = null,
} = {}) {
  try {
    const native = value?.schema_version === NATIVE_RDS_READINESS_SCHEMA_VERSION;
    const nativeRdsHistory = native
      ? normalizeNativeRdsHistory(value.native_rds_history, value.role_bootstrap) : null;
    if (native && (typeof historicalOutlookBootstrapSha256 !== "string"
      || !SHA256.test(historicalOutlookBootstrapSha256)
      || hashDomainValue(nativeRdsHistory.pause_expectation) !== historicalOutlookBootstrapSha256)) {
      throw bootstrapDrift("Native RDS replay requires its signed historical authority");
    }
    const bootstrap = normalizeRoleBootstrap(value?.role_bootstrap, { nativeRdsHistory });
    const digest = lawosOutlookRoleBootstrapDigest(bootstrap, { nativeRdsHistory });
    if (native && digest !== nativeRdsHistory.pause_expectation.role_bootstrap_sha256) {
      throw bootstrapDrift("Native RDS bootstrap changed from its historical authority");
    }
    const applicationMembershipCount = bootstrap.memberships.filter(
      ({ granted_role: grantedRole }) =>
        grantedRole.name === APPLICATION_ROLE,
    ).length;
    if (!exactKeys(value, [
      "schema_version",
      "role_count",
      "login_role_count",
      "tenant_authority_count",
      "membership_edge_count",
      "protected_membership_edge_count",
      "application_membership_edge_count",
      "synthetic_wildcard_count",
      "role_bootstrap",
      "role_bootstrap_sha256",
      "password_returned",
      "secret_material_returned",
      ...(native ? ["native_rds_history"] : []),
    ])
      || value.schema_version !== (native ? NATIVE_RDS_READINESS_SCHEMA_VERSION : ROLE_READINESS_SCHEMA_VERSION)
      || value.role_count !== MANAGED_ROLES.length
      || value.login_role_count !== LOGIN_ROLES.length
      || !Number.isSafeInteger(value.tenant_authority_count)
      || value.tenant_authority_count < 0
      || value.membership_edge_count !== bootstrap.memberships.length
      || value.protected_membership_edge_count !== MANAGED_ROLES.length
      || value.application_membership_edge_count
        !== applicationMembershipCount
      || value.synthetic_wildcard_count !== 0
      || value.role_bootstrap_sha256 !== digest
      || value.password_returned !== false
      || value.secret_material_returned !== false) {
      throw bootstrapDrift("Outlook role bootstrap receipt is invalid");
    }
    if (expectedRoleBootstrap) {
      const expected = assertLawosOutlookRoleBootstrapReceipt(
        expectedRoleBootstrap,
        { historicalOutlookBootstrapSha256 },
      );
      if (digest !== expected.role_bootstrap_sha256
        || !equalJson(nativeRdsHistory, expected.native_rds_history ?? null)) {
        throw bootstrapDrift("Outlook role bootstrap receipt changed");
      }
    }
    return Object.freeze({
      schema_version: native ? NATIVE_RDS_READINESS_SCHEMA_VERSION : ROLE_READINESS_SCHEMA_VERSION,
      role_count: MANAGED_ROLES.length,
      login_role_count: LOGIN_ROLES.length,
      tenant_authority_count: value.tenant_authority_count,
      membership_edge_count: bootstrap.memberships.length,
      protected_membership_edge_count: MANAGED_ROLES.length,
      application_membership_edge_count: applicationMembershipCount,
      synthetic_wildcard_count: 0,
      role_bootstrap: bootstrap,
      role_bootstrap_sha256: digest,
      password_returned: false,
      secret_material_returned: false,
      ...(native ? { native_rds_history: nativeRdsHistory } : {}),
    });
  } catch (error) {
    if (error?.code?.startsWith("LAWOS_OUTLOOK_DATABASE_ROLE_")) throw error;
    throw bootstrapDrift("Outlook role bootstrap receipt is invalid");
  }
}

async function readDatabase(client) {
  const result = await client.query(
    `SELECT database.oid::text AS oid,
            database.datname::text AS name
       FROM pg_database AS database
      WHERE database.datname = current_database()`,
  );
  if (result.rowCount !== 1) {
    throw bootstrapDrift("Outlook role bootstrap database is unavailable");
  }
  return normalizedDatabase(result.rows[0]);
}

async function readPostgresMajor(client) {
  const result = await client.query(
    `SELECT current_setting('server_version_num')::int / 10000
              AS postgres_major`,
  );
  if (result.rowCount !== 1 || result.rows[0].postgres_major !== 16) {
    throw bootstrapDrift("Outlook role bootstrap requires PostgreSQL 16");
  }
  return result.rows[0].postgres_major;
}

async function readSchemaOwners(client, migrationAdmin) {
  const result = await client.query(
    `SELECT namespace.nspname::text AS schema_name,
            owner.oid::text AS owner_oid,
            owner.rolname::text AS owner_name
       FROM pg_namespace AS namespace
       JOIN pg_roles AS owner ON owner.oid = namespace.nspowner
      WHERE namespace.nspname = ANY($1::name[])
      ORDER BY namespace.nspname`,
    [[OUTLOOK_AUTHORITY_SCHEMA, META_SCHEMA]],
  );
  const bySchema = new Map(result.rows.map((row) => [row.schema_name, row]));
  if (bySchema.size !== 2) {
    throw bootstrapDrift("Outlook role bootstrap schemas are unavailable");
  }
  const owners = Object.freeze(Object.fromEntries(
    [OUTLOOK_AUTHORITY_SCHEMA, META_SCHEMA].map((schemaName) => {
      const row = bySchema.get(schemaName);
      const owner = normalizedRoleReference({
        oid: row?.owner_oid,
        name: row?.owner_name,
      }, `Outlook ${schemaName} schema owner`);
      if (owner.oid !== migrationAdmin.oid
        || owner.name !== migrationAdmin.name) {
        throw bootstrapDrift("Outlook role bootstrap schema ownership drifted");
      }
      return [schemaName, owner];
    }),
  ));
  return owners;
}

async function readMigrationAdmin(client, migrationAdminRole) {
  if (migrationAdminRole !== LAWOS_OUTLOOK_MIGRATION_ADMIN_ROLE) {
    throw bootstrapDrift("Outlook migration admin identity drifted");
  }
  const result = await client.query(
    `SELECT current_user::text AS current_role,
            session_user::text AS session_role,
            role.oid::text AS oid,
            role.rolname::text AS name,
            role.rolcanlogin, role.rolsuper, role.rolcreatedb,
            role.rolcreaterole, role.rolinherit, role.rolreplication,
            role.rolbypassrls, role.rolconnlimit,
            CASE WHEN role.rolvaliduntil IS NULL THEN NULL
                 ELSE to_char(role.rolvaliduntil AT TIME ZONE 'UTC',
                              'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') END
              AS rolvaliduntil_canonical,
            role.rolconfig
       FROM pg_roles AS role
      WHERE role.rolname = $1`,
    [migrationAdminRole],
  );
  const row = result.rows[0];
  if (result.rowCount !== 1
    || row.current_role !== migrationAdminRole
    || row.session_role !== migrationAdminRole) {
    throw bootstrapDrift("Outlook migration admin session drifted");
  }
  return normalizedRoleState({
    oid: row.oid,
    name: row.name,
    can_login: row.rolcanlogin,
    superuser: row.rolsuper,
    createdb: row.rolcreatedb,
    createrole: row.rolcreaterole,
    inherit: row.rolinherit,
    replication: row.rolreplication,
    bypass_rls: row.rolbypassrls,
    connection_limit: row.rolconnlimit,
    valid_until_present: row.rolvaliduntil_canonical !== null,
    valid_until: row.rolvaliduntil_canonical,
    config_count: row.rolconfig?.length ?? 0,
    config: row.rolconfig ?? [],
  }, migrationAdminRole);
}

async function readMembershipEdges(
  client,
  roleNames = MEMBERSHIP_EDGE_SCOPE_ROLES,
) {
  const result = await client.query(
    `SELECT granted.oid::text AS granted_role_oid,
            granted.rolname::text AS granted_role_name,
            member.oid::text AS member_oid,
            member.rolname::text AS member_name,
            grantor.oid::text AS grantor_oid,
            grantor.rolname::text AS grantor_name,
            membership.admin_option,
            membership.inherit_option,
            membership.set_option
       FROM pg_auth_members AS membership
       JOIN pg_roles AS granted ON granted.oid = membership.roleid
       JOIN pg_roles AS member ON member.oid = membership.member
       JOIN pg_roles AS grantor ON grantor.oid = membership.grantor
      WHERE granted.rolname = ANY($1::name[])
         OR member.rolname = ANY($1::name[])
         OR grantor.rolname = ANY($1::name[])
      ORDER BY granted.rolname, member.rolname, grantor.rolname`,
    [roleNames],
  );
  return result.rows.map((row) => normalizedMembership({
    granted_role: { oid: row.granted_role_oid, name: row.granted_role_name },
    member: { oid: row.member_oid, name: row.member_name },
    grantor: { oid: row.grantor_oid, name: row.grantor_name },
    admin_option: row.admin_option,
    inherit_option: row.inherit_option,
    set_option: row.set_option,
  }));
}

function exactApplicationMembership(edges, {
  migrationAdmin,
  applicationRole,
  expectedPresent,
}) {
  const byGrantedRole = new Map();
  const grantors = new Set();
  for (const edge of edges) {
    const granted = edge.granted_role;
    const grantor = edge.grantor;
    if (!MEMBERSHIP_SCOPE_ROLES.includes(granted.name)
      || byGrantedRole.has(granted.name)
      || edge.member.name !== migrationAdmin.name
      || edge.member.oid !== migrationAdmin.oid
      || MEMBERSHIP_EDGE_SCOPE_ROLES.includes(grantor.name)
      || grantor.oid === migrationAdmin.oid
      || grantor.oid === applicationRole.oid
      || edge.admin_option !== true
      || edge.inherit_option !== false
      || edge.set_option !== false) {
      throw drift(
        "LAWOS_OUTLOOK_DATABASE_ROLE_MEMBERSHIP_DRIFT",
        "Outlook migration admin membership drifted",
      );
    }
    byGrantedRole.set(granted.name, edge);
    grantors.add(`${grantor.oid}\u0000${grantor.name}`);
  }
  const protectedCount = MANAGED_ROLES.filter((roleName) =>
    byGrantedRole.has(roleName)).length;
  const application = byGrantedRole.get(APPLICATION_ROLE) ?? null;
  if (grantors.size > 1
    || ![0, MANAGED_ROLES.length].includes(protectedCount)
    || edges.length !== protectedCount + Number(application !== null)
    || (application !== null) !== expectedPresent) {
    throw drift(
      "LAWOS_OUTLOOK_DATABASE_ROLE_MEMBERSHIP_DRIFT",
      "Outlook migration admin membership drifted",
    );
  }
  return application;
}

function normalizeApplicationRolePrecondition(value) {
  if (!exactKeys(value, [
    "schema_version",
    "postgres_major",
    "database",
    "migration_admin",
    "application_role",
    "application_membership_present",
    "membership",
  ])
    || value.schema_version !== APPLICATION_ROLE_PRECONDITION_SCHEMA_VERSION
    || value.postgres_major !== 16
    || typeof value.application_membership_present !== "boolean") {
    throw bootstrapDrift("Outlook application role precondition is invalid");
  }
  const database = normalizedDatabase(value.database);
  const migrationAdmin = assertExactMigrationAdmin(normalizedRoleState(
    value.migration_admin,
    LAWOS_OUTLOOK_MIGRATION_ADMIN_ROLE,
  ));
  const applicationRole = normalizedRoleState(
    value.application_role,
    APPLICATION_ROLE,
  );
  assertExactBootstrapRole(applicationRole);
  const membership = value.membership === null
    ? null
    : normalizedMembership(value.membership);
  if ((membership !== null) !== value.application_membership_present
    || (membership && (
      membership.granted_role.oid !== applicationRole.oid
      || membership.granted_role.name !== applicationRole.name
      || membership.member.oid !== migrationAdmin.oid
      || membership.member.name !== migrationAdmin.name
      || membership.grantor.oid === migrationAdmin.oid
      || membership.grantor.name === migrationAdmin.name
      || membership.grantor.oid === applicationRole.oid
      || membership.grantor.name === applicationRole.name
      || membership.admin_option !== true
      || membership.inherit_option !== false
      || membership.set_option !== false
    ))) {
    throw drift(
      "LAWOS_OUTLOOK_DATABASE_ROLE_MEMBERSHIP_DRIFT",
      "Outlook application role membership drifted",
    );
  }
  return Object.freeze({
    schema_version: APPLICATION_ROLE_PRECONDITION_SCHEMA_VERSION,
    postgres_major: 16,
    database,
    migration_admin: migrationAdmin,
    application_role: applicationRole,
    application_membership_present: value.application_membership_present,
    membership,
  });
}

export async function verifyLawosOutlookApplicationRolePrecondition(client, {
  migrationAdminRole,
  expectedApplicationMembershipPresent,
} = {}) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL client is required");
  }
  if (typeof expectedApplicationMembershipPresent !== "boolean") {
    throw new TypeError(
      "expected Outlook application membership presence is required",
    );
  }
  const postgresMajor = await readPostgresMajor(client);
  const database = await readDatabase(client);
  const migrationAdmin = await readMigrationAdmin(client, migrationAdminRole);
  const rows = await readRoles(client, [APPLICATION_ROLE]);
  if (rows.length !== 1) {
    throw drift(
      "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
      "Outlook application role precondition is missing",
    );
  }
  const applicationRole = roleState(rows[0]);
  assertExactBootstrapRole(applicationRole);
  const memberships = await readMembershipEdges(client, [
    APPLICATION_ROLE,
    LAWOS_OUTLOOK_MIGRATION_ADMIN_ROLE,
  ]);
  const membership = exactApplicationMembership(memberships, {
    migrationAdmin,
    applicationRole,
    expectedPresent: expectedApplicationMembershipPresent,
  });
  return normalizeApplicationRolePrecondition({
    schema_version: APPLICATION_ROLE_PRECONDITION_SCHEMA_VERSION,
    postgres_major: postgresMajor,
    database,
    migration_admin: migrationAdmin,
    application_role: applicationRole,
    application_membership_present: expectedApplicationMembershipPresent,
    membership,
  });
}

async function readRoleBootstrap(client, {
  migrationAdminRole,
  migration,
  tenantAuthorityCount,
  expectedRoleBootstrap = null,
  historicalOutlookBootstrapSha256 = null,
  historicalPauseExpectation = null,
} = {}) {
  const database = await readDatabase(client);
  const postgresMajor = await readPostgresMajor(client);
  const migrationAdmin = await readMigrationAdmin(client, migrationAdminRole);
  const schemaOwners = await readSchemaOwners(client, migrationAdmin);
  const catalogRoles = await readRoles(client, MEMBERSHIP_SCOPE_ROLES);
  if (catalogRoles.length !== MEMBERSHIP_SCOPE_ROLES.length) {
    throw drift(
      "LAWOS_OUTLOOK_DATABASE_ROLE_DRIFT",
      "Outlook role bootstrap catalog is incomplete",
    );
  }
  const roles = catalogRoles.map(roleState);
  let nativeRdsHistory = null;
  let memberships;
  if (historicalOutlookBootstrapSha256 !== null && migrationAdmin.inherit === true) {
    if (typeof historicalOutlookBootstrapSha256 !== "string"
      || !SHA256.test(historicalOutlookBootstrapSha256)
      || hashDomainValue(historicalPauseExpectation) !== historicalOutlookBootstrapSha256) {
      throw bootstrapDrift("Native RDS replay historical authority is unbound");
    }
    const fullGraph = await readMembershipEdges(client,
      [...MEMBERSHIP_EDGE_SCOPE_ROLES, NATIVE_RDS_BOOTSTRAP_GRANTOR]);
    const supportingRows = await readRoles(client,
      [NATIVE_RDS_BOOTSTRAP_GRANTOR, "rds_superuser", "rdsadmin"]);
    if (supportingRows.length !== 3) {
      throw bootstrapDrift("Native RDS supporting roles are incomplete");
    }
    const supporting = new Map(supportingRows.map((row) => [row.rolname, row]));
    const platform = supporting.get("rdsadmin");
    nativeRdsHistory = {
      pause_expectation: historicalPauseExpectation,
      bootstrap_grantor: roleState(supporting.get(NATIVE_RDS_BOOTSTRAP_GRANTOR)),
      rds_superuser: roleState(supporting.get("rds_superuser")),
      rdsadmin: {
        oid: platform.role_oid, name: platform.rolname,
        can_login: platform.rolcanlogin, superuser: platform.rolsuper,
        createdb: platform.rolcreatedb, createrole: platform.rolcreaterole,
        inherit: platform.rolinherit, replication: platform.rolreplication,
        bypass_rls: platform.rolbypassrls,
      },
      memberships: fullGraph,
    };
    // The complete graph is checked below; only its original creator edges enter the old digest.
    memberships = fullGraph.filter((edge) =>
      edge.member.name === migrationAdminRole
        && edge.grantor.name === NATIVE_RDS_BOOTSTRAP_GRANTOR);
  } else {
    memberships = await readMembershipEdges(client);
  }
  memberships.sort(compareMembership);
  const protectedMemberships = memberships.filter(
    ({ granted_role: grantedRole }) =>
      MANAGED_ROLES.includes(grantedRole.name),
  );
  if (protectedMemberships.length !== MANAGED_ROLES.length) {
    throw drift(
      "LAWOS_OUTLOOK_DATABASE_ROLE_MEMBERSHIP_DRIFT",
      "Outlook protected role creator memberships are incomplete",
    );
  }
  const bootstrap = normalizeRoleBootstrap({
    schema_version: LAWOS_OUTLOOK_ROLE_BOOTSTRAP_SCHEMA_VERSION,
    postgres_major: postgresMajor,
    database,
    migration,
    schema_owners: schemaOwners,
    migration_admin: migrationAdmin,
    bootstrap_grantor: protectedMemberships[0].grantor,
    roles,
    memberships,
  }, { nativeRdsHistory });
  return assertLawosOutlookRoleBootstrapReceipt({
    schema_version: nativeRdsHistory ? NATIVE_RDS_READINESS_SCHEMA_VERSION : ROLE_READINESS_SCHEMA_VERSION,
    role_count: MANAGED_ROLES.length,
    login_role_count: LOGIN_ROLES.length,
    tenant_authority_count: tenantAuthorityCount,
    membership_edge_count: memberships.length,
    protected_membership_edge_count: protectedMemberships.length,
    application_membership_edge_count: memberships.length
      - protectedMemberships.length,
    synthetic_wildcard_count: 0,
    role_bootstrap: bootstrap,
    role_bootstrap_sha256: lawosOutlookRoleBootstrapDigest(bootstrap, { nativeRdsHistory }),
    password_returned: false,
    secret_material_returned: false,
    ...(nativeRdsHistory ? { native_rds_history: nativeRdsHistory } : {}),
  }, { expectedRoleBootstrap, historicalOutlookBootstrapSha256 });
}

async function readTenantAuthorities(client) {
  return (await client.query(
    `SELECT database_role::text AS database_role, tenant_id,
            synthetic_wildcard, active
       FROM lawos_security.tenant_context_authorities
      WHERE database_role = ANY($1::name[])
      ORDER BY database_role, tenant_id`,
    [MANAGED_ROLES],
  )).rows;
}

function assertTenantAuthorities(rows, tenants, { allowMissing = false } = {}) {
  const expected = new Set(
    LOGIN_ROLES.flatMap((roleName) =>
      tenants.map((tenantId) => `${roleName}\u0000${tenantId}`)),
  );
  const observed = new Set();
  for (const row of rows) {
    const key = `${row.database_role}\u0000${row.tenant_id}`;
    if (!expected.has(key)
      || observed.has(key)
      || row.synthetic_wildcard !== false
      || row.active !== true) {
      throw drift(
        "LAWOS_OUTLOOK_TENANT_AUTHORITY_DRIFT",
        "Outlook tenant context authority drifted",
      );
    }
    observed.add(key);
  }
  if (!allowMissing && observed.size !== expected.size) {
    throw drift(
      "LAWOS_OUTLOOK_TENANT_AUTHORITY_DRIFT",
      "Outlook tenant context authority is incomplete",
    );
  }
}

export async function verifyLawosOutlookDatabaseRoles(client, {
  migrationAdminRole,
  migration,
  approvedTenantIds,
  expectedRoleBootstrap = null,
  historicalOutlookBootstrapSha256 = null,
  historicalPauseExpectation = null,
} = {}) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL client is required");
  }
  const tenants = approvedTenants(approvedTenantIds);
  const migrationBinding = normalizedMigration(migration);
  assertTenantAuthorities(await readTenantAuthorities(client), tenants);
  return readRoleBootstrap(client, {
    migrationAdminRole,
    migration: migrationBinding,
    tenantAuthorityCount: LOGIN_ROLES.length * tenants.length,
    expectedRoleBootstrap,
    historicalOutlookBootstrapSha256,
    historicalPauseExpectation,
  });
}

export async function configureLawosOutlookDatabaseRoles(client, {
  migrationAdminRole,
  migration,
  applicationRolePrecondition,
  controlPassword,
  assignmentPassword,
  lifecycleVerifierPassword,
  tenantContextSecret,
  approvedTenantIds,
  createRoleConfigurationCommitUnknownError,
} = {}) {
  const callerContextSecret = Buffer.isBuffer(tenantContextSecret)
    ? tenantContextSecret : null;
  let contextSecret = null;
  let began = false;
  try {
    if (!client || typeof client.query !== "function") {
      throw new TypeError("PostgreSQL client is required");
    }
    if (createRoleConfigurationCommitUnknownError !== undefined
      && typeof createRoleConfigurationCommitUnknownError !== "function") {
      throw new TypeError(
        "Outlook role COMMIT unknown mapper must be a function",
      );
    }
    const controlRolePassword = requiredText(
      controlPassword,
      "Outlook control role password",
    );
    const assignmentRolePassword = requiredText(
      assignmentPassword,
      "Outlook assignment role password",
    );
    const lifecycleVerifierRolePassword = requiredText(
      lifecycleVerifierPassword,
      "Outlook lifecycle verifier role password",
    );
    if (new Set([
      controlRolePassword,
      assignmentRolePassword,
      lifecycleVerifierRolePassword,
    ]).size !== LOGIN_ROLES.length) {
      throw new TypeError("Outlook role passwords must be independent");
    }
    contextSecret = callerContextSecret
      ? Buffer.from(callerContextSecret)
      : Buffer.from(requiredText(tenantContextSecret, "tenant context secret"),
        "utf8");
    if (contextSecret.byteLength < 32) {
      throw new TypeError("tenant context secret must contain at least 32 bytes");
    }
    const tenants = approvedTenants(approvedTenantIds);
    const migrationBinding = normalizedMigration(migration);
    const expectedApplicationRole = normalizeApplicationRolePrecondition(
      applicationRolePrecondition,
    );
    await client.query("BEGIN");
    began = true;
    const observedApplicationRole =
      await verifyLawosOutlookApplicationRolePrecondition(client, {
        migrationAdminRole,
        expectedApplicationMembershipPresent:
          expectedApplicationRole.application_membership_present,
      });
    if (!equalJson(observedApplicationRole, expectedApplicationRole)) {
      throw bootstrapDrift("Outlook application role precondition changed");
    }
    const currentRoles = new Map(
      (await readRoles(client)).map((row) => [row.rolname, row]),
    );
    for (const roleName of MANAGED_ROLES) {
      const current = currentRoles.get(roleName);
      if (current) {
        assertExactRole(current, roleName);
        continue;
      }
      const login = LOGIN_ROLES.includes(roleName) ? "LOGIN" : "NOLOGIN";
      await client.query(
        `CREATE ROLE ${roleName} ${login} NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`,
      );
    }
    assertExactRoles(await readRoles(client));
    await readRoleBootstrap(client, {
      migrationAdminRole,
      migration: migrationBinding,
      tenantAuthorityCount: 0,
    });
    assertTenantAuthorities(
      await readTenantAuthorities(client),
      tenants,
      { allowMissing: true },
    );
    await setPostgresRolePassword(client, {
      roleName: LAWOS_OUTLOOK_CONTROL_OPERATOR_ROLE,
      password: controlRolePassword,
    });
    await setPostgresRolePassword(client, {
      roleName: LAWOS_OUTLOOK_ASSIGNMENT_WORKER_ROLE,
      password: assignmentRolePassword,
    });
    await setPostgresRolePassword(client, {
      roleName: LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE,
      password: lifecycleVerifierRolePassword,
    });
    for (const roleName of LOGIN_ROLES) {
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
    assertExactRoles(await readRoles(client));
    assertTenantAuthorities(await readTenantAuthorities(client), tenants);
    const readiness = await readRoleBootstrap(client, {
      migrationAdminRole,
      migration: migrationBinding,
      tenantAuthorityCount: LOGIN_ROLES.length * tenants.length,
    });
    began = false;
    try {
      await client.query("COMMIT");
    } catch (error) {
      if (!createRoleConfigurationCommitUnknownError) throw error;
      const mapped = createRoleConfigurationCommitUnknownError(readiness);
      if (!(mapped instanceof Error)) {
        throw new TypeError("Outlook role COMMIT unknown mapper is invalid");
      }
      throw mapped;
    }
    return readiness;
  } catch (error) {
    if (began) await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    contextSecret?.fill(0);
    callerContextSecret?.fill(0);
  }
}

function normalizeGrantMap(value, privileges) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Outlook authority grants must be an object");
  }
  const entries = Object.entries(value).sort(([left], [right]) =>
    left.localeCompare(right));
  if (entries.length === 0) {
    throw new TypeError("Outlook authority grants must not be empty");
  }
  const normalized = {};
  for (const [roleName, grants] of entries) {
    if (!APPROVED_ACL_ROLES.has(roleName)) {
      throw new TypeError("Outlook authority grant role is not approved");
    }
    if (!Array.isArray(grants) || grants.length === 0) {
      throw new TypeError("Outlook authority role grants must not be empty");
    }
    const seen = new Set();
    normalized[roleName] = grants.map((item) => {
      if (!exactKeys(item, ["privilege", "grantable"])) {
        throw new TypeError("Outlook authority privilege is not closed");
      }
      const privilege = requiredText(
        item?.privilege,
        "Outlook authority privilege",
      ).toUpperCase();
      if (!privileges.has(privilege)
        || typeof item?.grantable !== "boolean"
        || seen.has(privilege)) {
        throw new TypeError("Outlook authority privilege is invalid or duplicate");
      }
      seen.add(privilege);
      return Object.freeze({ privilege, grantable: item.grantable });
    }).sort((left, right) => left.privilege.localeCompare(right.privilege));
  }
  return Object.freeze(normalized);
}

function nullableExpression(value, label) {
  if (value == null) return null;
  return requiredText(value, label);
}

function normalizePolicy(value) {
  if (!exactKeys(value, [
    "name",
    "permissive",
    "command",
    "roles",
    "using_expression",
    "check_expression",
  ])) {
    throw new TypeError("Outlook authority policy is not closed");
  }
  const command = requiredText(value?.command, "Outlook policy command")
    .toUpperCase();
  const roles = [...new Set((value?.roles ?? []).map((role) =>
    requiredText(role, "Outlook policy role")))].sort();
  if (!POLICY_COMMANDS.has(command)
    || roles.length === 0
    || roles.some((role) => !APPROVED_ACL_ROLES.has(role))
    || typeof value?.permissive !== "boolean") {
    throw new TypeError("Outlook authority policy is invalid");
  }
  return Object.freeze({
    name: requiredText(value.name, "Outlook policy name"),
    permissive: value.permissive,
    command,
    roles: Object.freeze(roles),
    using_expression: nullableExpression(
      value.using_expression,
      "Outlook policy using expression",
    ),
    check_expression: nullableExpression(
      value.check_expression,
      "Outlook policy check expression",
    ),
  });
}

function normalizeFunctionConfiguration(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("Outlook authority function configuration is required");
  }
  const settings = value.map((setting) => requiredText(
    setting,
    "Outlook authority function configuration",
  )).sort();
  if (new Set(settings).size !== settings.length
    || settings.filter((setting) => setting.startsWith("search_path=")).length
      !== 1
    || !settings.includes(SAFE_FUNCTION_SEARCH_PATH)) {
    throw new TypeError("Outlook authority function search path is unsafe");
  }
  return Object.freeze(settings);
}

function normalizeSchemaEntries(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError("Outlook authority schema catalog must not be empty");
  }
  const seen = new Set();
  return Object.freeze(values.map((value) => {
    if (!exactKeys(value, ["regnamespace", "owner", "grants"])) {
      throw new TypeError("Outlook authority schema is not closed");
    }
    const identity = requiredText(
      value?.regnamespace,
      "Outlook authority regnamespace",
    );
    if (seen.has(identity)) {
      throw new TypeError("duplicate Outlook authority schema");
    }
    seen.add(identity);
    if (!APPROVED_OBJECT_OWNERS.has(value?.owner)) {
      throw new TypeError("Outlook authority object owner is invalid");
    }
    const grants = normalizeGrantMap(value.grants, SCHEMA_PRIVILEGES);
    const ownerGrants = grants[value.owner];
    if (!ownerGrants
      || ownerGrants.length !== SCHEMA_PRIVILEGES.size
      || ownerGrants.some(({ privilege, grantable }) =>
        !SCHEMA_PRIVILEGES.has(privilege) || grantable)
      || grants.public
      || Object.entries(grants).some(([roleName, roleGrants]) =>
        roleName !== value.owner
        && (roleGrants.length !== 1
          || roleGrants[0].privilege !== "USAGE"
          || roleGrants[0].grantable))) {
      throw new TypeError("Outlook authority schema grants are invalid");
    }
    return Object.freeze({
      regnamespace: identity,
      owner: value.owner,
      grants,
    });
  }).sort((left, right) =>
    left.regnamespace.localeCompare(right.regnamespace)));
}

function normalizeCatalogEntries(values, kind) {
  if (!Array.isArray(values)) {
    throw new TypeError(`Outlook authority ${kind} catalog must be an array`);
  }
  const identityKey = kind === "table" ? "regclass" : "regprocedure";
  const seen = new Set();
  return Object.freeze(values.map((value) => {
    const expectedKeys = kind === "function"
      ? [
          "regprocedure",
          "regnamespace",
          "owner",
          "language",
          "security_definer",
          "configuration",
          "body_sha256",
          "grants",
        ]
      : [
          "regclass",
          "regnamespace",
          "owner",
          "row_security",
          "force_row_security",
          "policies",
          "grants",
        ];
    if (!exactKeys(value, expectedKeys)) {
      throw new TypeError(`Outlook authority ${kind} is not closed`);
    }
    const identity = requiredText(
      value?.[identityKey],
      `Outlook authority ${identityKey}`,
    );
    if (seen.has(identity)) {
      throw new TypeError(`duplicate Outlook authority ${kind}`);
    }
    seen.add(identity);
    if (!APPROVED_OBJECT_OWNERS.has(value?.owner)) {
      throw new TypeError("Outlook authority object owner is invalid");
    }
    const regnamespace = requiredText(
      value?.regnamespace,
      "Outlook authority object regnamespace",
    );
    if (kind === "function") {
      const language = requiredText(
        value.language,
        "Outlook authority function language",
      ).toLowerCase();
      if (typeof value?.security_definer !== "boolean"
        || !SHA256.test(value?.body_sha256 ?? "")) {
        throw new TypeError("Outlook authority function protection is invalid");
      }
      return Object.freeze({
        regprocedure: identity,
        regnamespace,
        owner: value.owner,
        language,
        security_definer: value.security_definer,
        configuration: normalizeFunctionConfiguration(value.configuration),
        body_sha256: value.body_sha256,
        grants: normalizeGrantMap(value.grants, FUNCTION_PRIVILEGES),
      });
    }
    if (typeof value?.row_security !== "boolean"
      || typeof value?.force_row_security !== "boolean"
      || !Array.isArray(value?.policies)) {
      throw new TypeError("Outlook authority table protection is invalid");
    }
    const policies = value.policies.map(normalizePolicy)
      .sort((left, right) => left.name.localeCompare(right.name));
    if (new Set(policies.map(({ name }) => name)).size !== policies.length) {
      throw new TypeError("duplicate Outlook authority table policy");
    }
    return Object.freeze({
      regclass: identity,
      regnamespace,
      owner: value.owner,
      row_security: value.row_security,
      force_row_security: value.force_row_security,
      policies: Object.freeze(policies),
      grants: normalizeGrantMap(value.grants, TABLE_PRIVILEGES),
    });
  }).sort((left, right) =>
    left[identityKey].localeCompare(right[identityKey])));
}

function callerHasSchemaUsage(schemas, entry, callerRole) {
  const schema = schemas.find(({ regnamespace }) =>
    regnamespace === entry.regnamespace);
  const grants = schema?.grants[callerRole];
  return grants?.length === 1
    && grants[0].privilege === "USAGE"
    && grants[0].grantable === false;
}

function assertLifecycleReceiptAuthority(schemas, tables, functions) {
  const rawTableDml = tables.some((entry) =>
    entry.grants[LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE]);
  const unsafeApplicationTableGrant = tables.some((entry) =>
    entry.grants[APPLICATION_ROLE]?.some(
      ({ privilege }) => privilege !== "SELECT",
    ));
  const lifecycleMintFunctions = functions.filter(
    (entry) => entry.grants[LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE],
  );
  const applicationConsumers = functions.filter(
    (entry) => entry.grants.lawos_app,
  );
  const hasExactCallerAcl = (entry, callerRole) => {
    const callers = Object.keys(entry.grants);
    const callerGrants = entry.grants[callerRole];
    return callers.length === 2
      && callers.includes(LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE)
      && callers.includes(callerRole)
      && entry.owner === LAWOS_OUTLOOK_AUTHORITY_OWNER_ROLE
      && entry.security_definer === true
      && entry.configuration.includes(SAFE_FUNCTION_SEARCH_PATH)
      && callerHasSchemaUsage(schemas, entry, callerRole)
      && callerGrants.length === 1
      && callerGrants[0].privilege === "EXECUTE"
      && callerGrants[0].grantable === false;
  };
  if (rawTableDml
    || unsafeApplicationTableGrant
    || lifecycleMintFunctions.length === 0
    || lifecycleMintFunctions.some((entry) =>
      !hasExactCallerAcl(entry, LAWOS_OUTLOOK_LIFECYCLE_VERIFIER_ROLE))
    || applicationConsumers.length === 0
    || applicationConsumers.some((entry) =>
      !hasExactCallerAcl(entry, "lawos_app"))) {
    throw new TypeError("Outlook lifecycle receipt authority is invalid");
  }
}

export function normalizeLawosOutlookAuthorityCatalog(value) {
  const catalogKeys = [
    "schema_version",
    "catalog_id",
    "target_schema",
    "schemas",
    "tables",
    "functions",
  ];
  const hasDigest = exactKeys(value, [...catalogKeys, "catalog_sha256"]);
  if ((!exactKeys(value, catalogKeys) && !hasDigest)
    || value?.schema_version !== CATALOG_SCHEMA_VERSION) {
    throw new TypeError("Outlook authority catalog schema version is invalid");
  }
  const schemas = normalizeSchemaEntries(value.schemas);
  const tables = normalizeCatalogEntries(value.tables, "table");
  const functions = normalizeCatalogEntries(value.functions, "function");
  if (tables.length + functions.length === 0) {
    throw new TypeError("Outlook authority catalog must not be empty");
  }
  const schemaNames = new Set(schemas.map(({ regnamespace }) => regnamespace));
  const targetSchema = requiredText(
    value.target_schema,
    "Outlook authority target schema",
  );
  if ([...tables, ...functions].some(({ regnamespace }) =>
    !schemaNames.has(regnamespace)) || !schemaNames.has(targetSchema)) {
    throw new TypeError("Outlook authority object schema is not cataloged");
  }
  assertLifecycleReceiptAuthority(schemas, tables, functions);
  const material = Object.freeze({
    schema_version: CATALOG_SCHEMA_VERSION,
    catalog_id: requiredText(value.catalog_id, "Outlook authority catalog id"),
    target_schema: targetSchema,
    schemas,
    tables,
    functions,
  });
  const catalogSha256 = createHash("sha256")
    .update(JSON.stringify(material))
    .digest("hex");
  if (hasDigest && value.catalog_sha256 !== catalogSha256) {
    throw new TypeError("Outlook authority catalog digest drifted");
  }
  return Object.freeze({
    ...material,
    catalog_sha256: catalogSha256,
  });
}

function flattenGrants(grants) {
  return Object.entries(grants).flatMap(([grantee, values]) =>
    values.map(({ privilege, grantable }) => ({
      grantee,
      privilege,
      grantable,
    }))).sort((left, right) =>
    left.grantee.localeCompare(right.grantee)
    || left.privilege.localeCompare(right.privilege));
}

function equalJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

async function schemaState(client, entry) {
  const object = await client.query(
    `SELECT namespace.oid::text AS oid,
            namespace.oid::regnamespace::text AS regnamespace,
            owner.rolname AS owner
       FROM pg_namespace AS namespace
       JOIN pg_roles AS owner ON owner.oid = namespace.nspowner
      WHERE namespace.oid = to_regnamespace($1)`,
    [entry.regnamespace],
  );
  if (object.rows.length === 0) return null;
  const grants = (await client.query(
    `SELECT CASE WHEN acl.grantee = 0 THEN 'public'
                 ELSE grantee.rolname::text END AS grantee,
            upper(acl.privilege_type) AS privilege,
            acl.is_grantable AS grantable
       FROM pg_namespace AS namespace
       CROSS JOIN LATERAL aclexplode(
         COALESCE(namespace.nspacl, acldefault('n', namespace.nspowner))
       ) AS acl
       LEFT JOIN pg_roles AS grantee ON grantee.oid = acl.grantee
      WHERE namespace.oid = $1::oid
      ORDER BY grantee, privilege`,
    [object.rows[0].oid],
  )).rows;
  return { ...object.rows[0], grants };
}

async function tableState(client, entry) {
  const object = await client.query(
    `SELECT relation.oid::text AS oid,
            relation.relnamespace::regnamespace::text AS regnamespace,
            owner.rolname AS owner,
            relation.relrowsecurity AS row_security,
            relation.relforcerowsecurity AS force_row_security
       FROM pg_class AS relation
       JOIN pg_roles AS owner ON owner.oid = relation.relowner
      WHERE relation.oid = to_regclass($1)
        AND relation.relkind IN ('r', 'p')`,
    [entry.regclass],
  );
  if (object.rows.length === 0) return null;
  const oid = object.rows[0].oid;
  const policies = (await client.query(
    `SELECT policy.polname AS name,
            policy.polpermissive AS permissive,
            CASE policy.polcmd
              WHEN '*' THEN 'ALL'
              WHEN 'r' THEN 'SELECT'
              WHEN 'a' THEN 'INSERT'
              WHEN 'w' THEN 'UPDATE'
              WHEN 'd' THEN 'DELETE'
            END AS command,
            ARRAY(
              SELECT CASE WHEN role_oid = 0 THEN 'public'
                          ELSE policy_role.rolname::text END
                FROM unnest(policy.polroles) AS role_oid
                LEFT JOIN pg_roles AS policy_role
                  ON policy_role.oid = role_oid
               ORDER BY 1
            ) AS roles,
            pg_get_expr(policy.polqual, policy.polrelid) AS using_expression,
            pg_get_expr(policy.polwithcheck, policy.polrelid) AS check_expression
       FROM pg_policy AS policy
      WHERE policy.polrelid = $1::oid
      ORDER BY policy.polname`,
    [oid],
  )).rows;
  const grants = (await client.query(
    `SELECT CASE WHEN acl.grantee = 0 THEN 'public'
                 ELSE grantee.rolname::text END AS grantee,
            upper(acl.privilege_type) AS privilege,
            acl.is_grantable AS grantable
       FROM pg_class AS relation
       CROSS JOIN LATERAL aclexplode(
         COALESCE(relation.relacl, acldefault('r', relation.relowner))
       ) AS acl
       LEFT JOIN pg_roles AS grantee ON grantee.oid = acl.grantee
      WHERE relation.oid = $1::oid
      ORDER BY grantee, privilege`,
    [oid],
  )).rows;
  return { ...object.rows[0], policies, grants };
}

async function functionState(client, entry) {
  const object = await client.query(
    `SELECT routine.oid::text AS oid,
            routine.pronamespace::regnamespace::text AS regnamespace,
            owner.rolname AS owner,
            language.lanname AS language,
            routine.prosecdef AS security_definer,
            ARRAY(
              SELECT setting
                FROM unnest(COALESCE(
                  routine.proconfig,
                  ARRAY[]::text[]
                )) AS setting
               ORDER BY setting
            ) AS configuration,
            routine.prosrc AS body
       FROM pg_proc AS routine
       JOIN pg_roles AS owner ON owner.oid = routine.proowner
       JOIN pg_language AS language ON language.oid = routine.prolang
      WHERE routine.oid = to_regprocedure($1)`,
    [entry.regprocedure],
  );
  if (object.rows.length === 0) return null;
  const grants = (await client.query(
    `SELECT CASE WHEN acl.grantee = 0 THEN 'public'
                 ELSE grantee.rolname::text END AS grantee,
            upper(acl.privilege_type) AS privilege,
            acl.is_grantable AS grantable
       FROM pg_proc AS routine
       CROSS JOIN LATERAL aclexplode(
         COALESCE(routine.proacl, acldefault('f', routine.proowner))
       ) AS acl
       LEFT JOIN pg_roles AS grantee ON grantee.oid = acl.grantee
      WHERE routine.oid = $1::oid
      ORDER BY grantee, privilege`,
    [object.rows[0].oid],
  )).rows;
  const { body, ...metadata } = object.rows[0];
  return {
    ...metadata,
    body_sha256: createHash("sha256").update(body).digest("hex"),
    grants,
  };
}

export function assertLawosOutlookAuthorityVerification(value, {
  catalog,
  phase,
  roleBootstrap,
} = {}) {
  const normalized = normalizeLawosOutlookAuthorityCatalog(catalog);
  const bootstrap = assertLawosOutlookRoleBootstrapReceipt(roleBootstrap);
  const missingSchemaCount = Number(value?.missing_schema_count);
  const missingTableCount = Number(value?.missing_table_count);
  const missingFunctionCount = Number(value?.missing_function_count);
  const missingObjectCount = Number(value?.missing_object_count);
  if (!exactKeys(value, [
    "outcome",
    "phase",
    "catalog_sha256",
    "role_bootstrap_sha256",
    "verified_schema_count",
    "verified_table_count",
    "verified_function_count",
    "missing_schema_count",
    "missing_table_count",
    "missing_function_count",
    "missing_object_count",
    "unknown_owned_object_count",
    "secret_material_returned",
  ])
    || value.outcome !== "PASS"
    || value.phase !== phase
    || value.catalog_sha256 !== normalized.catalog_sha256
    || value.role_bootstrap_sha256 !== bootstrap.role_bootstrap_sha256
    || !["pre-migration", "post-migration"].includes(phase)
    || !Number.isSafeInteger(value.verified_schema_count)
    || !Number.isSafeInteger(value.verified_table_count)
    || !Number.isSafeInteger(value.verified_function_count)
    || !Number.isSafeInteger(missingSchemaCount)
    || !Number.isSafeInteger(missingTableCount)
    || !Number.isSafeInteger(missingFunctionCount)
    || !Number.isSafeInteger(missingObjectCount)
    || value.verified_schema_count < 0
    || value.verified_table_count < 0
    || value.verified_function_count < 0
    || missingSchemaCount < 0
    || missingTableCount < 0
    || missingFunctionCount < 0
    || missingObjectCount < 0
    || value.verified_schema_count + missingSchemaCount
      !== normalized.schemas.length
    || value.verified_table_count + missingTableCount
      !== normalized.tables.length
    || value.verified_function_count + missingFunctionCount
      !== normalized.functions.length
    || missingObjectCount !== missingSchemaCount
      + missingTableCount
      + missingFunctionCount
    || value.unknown_owned_object_count !== 0
    || value.secret_material_returned !== false
    || (phase === "post-migration" && missingObjectCount !== 0)) {
    throw drift(
      "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
      "Outlook authority verification is missing or unbound",
    );
  }
  return Object.freeze({ ...value });
}

export async function verifyLawosOutlookAuthorityCatalog(client, {
  catalog,
  phase,
  roleBootstrap,
} = {}) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL client is required");
  }
  if (!["pre-migration", "post-migration"].includes(phase)) {
    throw new TypeError("Outlook authority verification phase is invalid");
  }
  const normalized = normalizeLawosOutlookAuthorityCatalog(catalog);
  const bootstrap = assertLawosOutlookRoleBootstrapReceipt(roleBootstrap);
  const expectedOids = new Set();
  let verifiedSchemaCount = 0;
  let verifiedTableCount = 0;
  let verifiedFunctionCount = 0;
  let missingSchemaCount = 0;
  let missingTableCount = 0;
  let missingFunctionCount = 0;
  for (const entry of normalized.schemas) {
    const state = await schemaState(client, entry);
    if (!state) {
      missingSchemaCount += 1;
      continue;
    }
    expectedOids.add(`schema:${state.oid}`);
    if (state.regnamespace !== entry.regnamespace
      || state.owner !== entry.owner
      || !equalJson(state.grants, flattenGrants(entry.grants))) {
      throw drift(
        "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
        "Outlook authority schema protection drifted",
      );
    }
    verifiedSchemaCount += 1;
  }
  for (const entry of normalized.tables) {
    const state = await tableState(client, entry);
    if (!state) {
      missingTableCount += 1;
      continue;
    }
    expectedOids.add(`table:${state.oid}`);
    if (state.regnamespace !== entry.regnamespace
      || state.owner !== entry.owner
      || state.row_security !== entry.row_security
      || state.force_row_security !== entry.force_row_security
      || !equalJson(state.policies, entry.policies)
      || !equalJson(state.grants, flattenGrants(entry.grants))) {
      throw drift(
        "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
        "Outlook authority table protection drifted",
      );
    }
    verifiedTableCount += 1;
  }
  for (const entry of normalized.functions) {
    const state = await functionState(client, entry);
    if (!state) {
      missingFunctionCount += 1;
      continue;
    }
    expectedOids.add(`function:${state.oid}`);
    if (state.regnamespace !== entry.regnamespace
      || state.owner !== entry.owner
      || state.language !== entry.language
      || state.security_definer !== entry.security_definer
      || !equalJson(state.configuration, entry.configuration)
      || state.body_sha256 !== entry.body_sha256
      || !equalJson(state.grants, flattenGrants(entry.grants))) {
      throw drift(
        "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
        "Outlook authority function protection drifted",
      );
    }
    verifiedFunctionCount += 1;
  }
  const owned = await client.query(
    `SELECT 'schema:' || namespace.oid::text AS object_ref
       FROM pg_namespace AS namespace
       JOIN pg_roles AS owner ON owner.oid = namespace.nspowner
      WHERE owner.rolname = ANY($1::name[])
      UNION ALL
     SELECT 'table:' || relation.oid::text AS object_ref
       FROM pg_class AS relation
       JOIN pg_roles AS owner ON owner.oid = relation.relowner
      WHERE owner.rolname = ANY($1::name[])
        AND relation.relkind IN ('r', 'p')
      UNION ALL
     SELECT 'function:' || routine.oid::text AS object_ref
       FROM pg_proc AS routine
       JOIN pg_roles AS owner ON owner.oid = routine.proowner
      WHERE owner.rolname = ANY($1::name[])
      ORDER BY object_ref`,
    [MANAGED_ROLES],
  );
  const unknownOwnedObjectCount = owned.rows.filter(
    ({ object_ref: objectRef }) => !expectedOids.has(objectRef),
  ).length;
  const missingObjectCount = missingSchemaCount
    + missingTableCount
    + missingFunctionCount;
  if (unknownOwnedObjectCount !== 0
    || (phase === "post-migration" && missingObjectCount !== 0)) {
    throw drift(
      "LAWOS_OUTLOOK_AUTHORITY_CATALOG_DRIFT",
      "Outlook authority catalog has unknown or missing objects",
    );
  }
  return assertLawosOutlookAuthorityVerification({
    outcome: "PASS",
    phase,
    catalog_sha256: normalized.catalog_sha256,
    role_bootstrap_sha256: bootstrap.role_bootstrap_sha256,
    verified_schema_count: verifiedSchemaCount,
    verified_table_count: verifiedTableCount,
    verified_function_count: verifiedFunctionCount,
    missing_schema_count: missingSchemaCount,
    missing_table_count: missingTableCount,
    missing_function_count: missingFunctionCount,
    missing_object_count: missingObjectCount,
    unknown_owned_object_count: 0,
    secret_material_returned: false,
  }, { catalog: normalized, phase, roleBootstrap: bootstrap });
}
