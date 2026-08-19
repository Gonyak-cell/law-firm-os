import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import {
  OUTLOOK_DESKTOP_ASSIGNMENT_AUTHORITY_CATALOG as AUTHORITY,
  assertOutlookDesktopAssignmentAuthorityCatalog,
} from "./outlook-desktop-assignment-authority-catalog.js";

export const OUTLOOK_DESKTOP_ASSIGNMENT_PROTECTED_OBJECT_FACTS_SHA256 =
  "3ff15fea7ce8947f7dd4100e28536e21d0bfac7e56e60e5c831381a66f1e8458";

const FACTS_SCHEMA_VERSION =
  "lawos.outlook-authority-protected-object-facts.v1";
const TENANT_CONTEXT_FACTS_SCHEMA_VERSION =
  "lawos.outlook-tenant-context-authority-facts.v1";
const PREFLIGHT_SCHEMA_VERSION =
  "lawos.outlook-authority-migration-preflight.v1";
const PHASES = new Set(["pre_migration", "post_migration"]);

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) deepFreeze(child);
  }
  return value;
}

function exactPrivileges(actual, expected) {
  return Array.isArray(actual) && actual.length === expected.length
    && expected.every((entry, index) => {
      const value = actual[index];
      return value?.grantee === entry.grantee
        && value.privilege === entry.privilege
        && value.grantable === entry.grantable;
    });
}

function failTenantContextAuthority() {
  throw Object.assign(new Error("Outlook tenant context authority failed"), {
    code: "LAWOS_OUTLOOK_TENANT_CONTEXT_AUTHORITY_FAILED",
    safe_error_code: "OUTLOOK_TENANT_CONTEXT_AUTHORITY_FAILED",
    status: 500,
  });
}

export async function readOutlookAssignmentTenantContextAuthorityFacts(
  client,
  {
    authority_catalog: authorityCatalog = AUTHORITY,
    phase = "post_migration",
  } = {},
) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL migration client is required");
  }
  if (!PHASES.has(phase)) throw new TypeError("Outlook authority phase is invalid");
  const authority = assertOutlookDesktopAssignmentAuthorityCatalog(
    authorityCatalog,
    { database_name: authorityCatalog?.database?.name },
  );
  const expected = authority.tenant_context_authority;
  const currentTenant = (await client.query(
    `SELECT procedure.oid::text AS oid,
            format('%I.%I(%s)',function_schema.nspname,procedure.proname,
              replace(pg_get_function_identity_arguments(procedure.oid),
                ', ',',')) AS signature,
            owner.rolname AS owner,language.lanname AS language,
            CASE procedure.provolatile WHEN 's' THEN 'stable'
              WHEN 'i' THEN 'immutable' ELSE 'volatile' END AS volatility,
            procedure.prosecdef AS security_definer,
            COALESCE(to_jsonb(procedure.proconfig),'[]'::jsonb) AS config,
            encode(pg_catalog.sha256(pg_catalog.convert_to(
              procedure.prosrc,'UTF8')),'hex') AS body_sha256,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'grantee',COALESCE(grantee.rolname,'PUBLIC'),
              'privilege',privilege.privilege_type,
              'grantable',privilege.is_grantable
            ) ORDER BY COALESCE(grantee.rolname,'PUBLIC'),
                       privilege.privilege_type)
              FROM aclexplode(COALESCE(procedure.proacl,
                acldefault('f',procedure.proowner))) AS privilege
              LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
             WHERE privilege.grantee<>procedure.proowner),'[]'::jsonb)
              AS privileges,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'role',runtime.role_name,
              'exists',role.oid IS NOT NULL,
              'schema_usage',CASE WHEN role.oid IS NULL THEN NULL ELSE
                has_schema_privilege(role.oid,function_schema.oid,'USAGE') END,
              'function_execute',CASE WHEN role.oid IS NULL THEN NULL ELSE
                has_function_privilege(role.oid,procedure.oid,'EXECUTE') END)
              ORDER BY runtime.role_name)
             FROM unnest($2::text[]) AS runtime(role_name)
             LEFT JOIN pg_roles AS role ON role.rolname=runtime.role_name),
              '[]'::jsonb) AS callability
       FROM pg_proc AS procedure
       JOIN pg_roles AS owner ON owner.oid=procedure.proowner
       JOIN pg_language AS language ON language.oid=procedure.prolang
       JOIN pg_namespace AS function_schema
         ON function_schema.oid=procedure.pronamespace
      WHERE procedure.oid=to_regprocedure($1)`,
    [expected.signature, expected.public_schema.runtime_roles],
  )).rows[0];
  const securitySchema = (await client.query(
    `SELECT namespace.oid::text AS oid,namespace.nspname AS name,
            owner.rolname AS owner,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'grantee',COALESCE(grantee.rolname,'PUBLIC'),
              'privilege',privilege.privilege_type,
              'grantable',privilege.is_grantable
            ) ORDER BY COALESCE(grantee.rolname,'PUBLIC'),
                       privilege.privilege_type)
              FROM aclexplode(COALESCE(namespace.nspacl,
                acldefault('n',namespace.nspowner))) AS privilege
              LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
             WHERE privilege.grantee<>namespace.nspowner),'[]'::jsonb)
              AS privileges
       FROM pg_namespace AS namespace
       JOIN pg_roles AS owner ON owner.oid=namespace.nspowner
      WHERE namespace.nspname=$1`,
    [expected.schema.name],
  )).rows[0];
  const authorityTable = (await client.query(
    `SELECT relation.oid::text AS oid,
            format('%I.%I',relation_schema.nspname,relation.relname) AS name,
            owner.rolname AS owner,relation.relkind,
            relation.relrowsecurity AS rls_enabled,
            relation.relforcerowsecurity AS rls_forced,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'grantee',COALESCE(grantee.rolname,'PUBLIC'),
              'privilege',privilege.privilege_type,
              'grantable',privilege.is_grantable
            ) ORDER BY COALESCE(grantee.rolname,'PUBLIC'),
                       privilege.privilege_type)
              FROM aclexplode(COALESCE(relation.relacl,
                acldefault('r',relation.relowner))) AS privilege
              LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
             WHERE privilege.grantee<>relation.relowner),'[]'::jsonb)
              AS privileges,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'column',attribute.attname,
              'grantee',COALESCE(grantee.rolname,'PUBLIC'),
              'privilege',privilege.privilege_type,
              'grantable',privilege.is_grantable
            ) ORDER BY attribute.attnum,COALESCE(grantee.rolname,'PUBLIC'),
                       privilege.privilege_type)
              FROM pg_attribute AS attribute
              CROSS JOIN LATERAL aclexplode(attribute.attacl) AS privilege
              LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
             WHERE attribute.attrelid=relation.oid AND attribute.attnum>0
               AND NOT attribute.attisdropped),'[]'::jsonb)
              AS column_privileges
       FROM pg_class AS relation
       JOIN pg_namespace AS relation_schema
         ON relation_schema.oid=relation.relnamespace
       JOIN pg_roles AS owner ON owner.oid=relation.relowner
      WHERE relation.oid=to_regclass($1)`,
    [expected.authority_table.name],
  )).rows[0];
  const hmac = (await client.query(
    `SELECT procedure.oid::text AS oid,
            format('%I.%I(%s)',function_schema.nspname,procedure.proname,
              replace(pg_get_function_identity_arguments(procedure.oid),
                ', ',',')) AS signature,
            owner.rolname AS owner,extension.oid::text AS extension_oid,
            extension.extname AS extension,
            extension.extversion AS extension_version,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'grantee',COALESCE(grantee.rolname,'PUBLIC'),
              'privilege',privilege.privilege_type,
              'grantable',privilege.is_grantable
            ) ORDER BY COALESCE(grantee.rolname,'PUBLIC'),
                       privilege.privilege_type)
              FROM aclexplode(COALESCE(procedure.proacl,
                acldefault('f',procedure.proowner))) AS privilege
              LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
             WHERE privilege.grantee<>procedure.proowner),'[]'::jsonb)
              AS privileges
       FROM pg_proc AS procedure
       JOIN pg_roles AS owner ON owner.oid=procedure.proowner
       JOIN pg_namespace AS function_schema
         ON function_schema.oid=procedure.pronamespace
       JOIN pg_depend AS dependency
         ON dependency.classid='pg_proc'::regclass
        AND dependency.objid=procedure.oid AND dependency.deptype='e'
       JOIN pg_extension AS extension
         ON extension.oid=dependency.refobjid
        AND dependency.refclassid='pg_extension'::regclass
      WHERE procedure.oid=to_regprocedure($1)`,
    [expected.hmac.signature],
  )).rows[0];
  const publicSchema = (await client.query(
    `SELECT namespace.oid::text AS oid,namespace.nspname AS name,
            owner.rolname AS owner,
            EXISTS (
              SELECT 1 FROM aclexplode(COALESCE(namespace.nspacl,
                acldefault('n',namespace.nspowner))) AS privilege
               WHERE privilege.grantee=0
                 AND privilege.privilege_type='CREATE'
            ) AS public_can_create,
            EXISTS (
              SELECT 1 FROM aclexplode(COALESCE(namespace.nspacl,
                acldefault('n',namespace.nspowner))) AS privilege
               WHERE privilege.grantee=0
                 AND privilege.privilege_type='USAGE'
            ) AS public_can_use,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'role',runtime.role_name,
              'exists',role.oid IS NOT NULL,
              'can_use',CASE WHEN role.oid IS NULL THEN NULL ELSE
                has_schema_privilege(role.oid,namespace.oid,'USAGE') END,
              'can_create',CASE WHEN role.oid IS NULL THEN NULL ELSE
                has_schema_privilege(role.oid,namespace.oid,'CREATE') END)
              ORDER BY runtime.role_name)
             FROM unnest($2::text[]) AS runtime(role_name)
             LEFT JOIN pg_roles AS role ON role.rolname=runtime.role_name),
              '[]'::jsonb)
              AS runtime_create
       FROM pg_namespace AS namespace
       JOIN pg_roles AS owner ON owner.oid=namespace.nspowner
      WHERE namespace.nspname=$1`,
    [expected.public_schema.name, expected.public_schema.runtime_roles],
  )).rows[0];
  const expectedPath = expected.search_paths[phase];
  if (currentTenant?.signature !== expected.signature
      || currentTenant.owner !== expected.owner
      || currentTenant.language !== expected.language
      || currentTenant.volatility !== expected.volatility
      || currentTenant.security_definer !== expected.security_definer
      || currentTenant.body_sha256 !== expected.body_sha256
      || currentTenant.config?.length !== 1
      || currentTenant.config[0] !== expectedPath
      || !exactPrivileges(currentTenant.privileges, [
        { grantee: "PUBLIC", privilege: "EXECUTE", grantable: false },
      ])
      || !Array.isArray(currentTenant.callability)
      || currentTenant.callability.length !==
        expected.public_schema.runtime_roles.length
      || currentTenant.callability.some((entry) =>
        (entry.exists && (entry.schema_usage !== true
          || entry.function_execute !== true))
        || (!entry.exists && (entry.schema_usage !== null
          || entry.function_execute !== null)))
      || !currentTenant.callability.some((entry) =>
        entry.role === "lawos_app" && entry.exists)
      || (phase === "post_migration"
        && currentTenant.callability.some((entry) => !entry.exists))
      || securitySchema?.name !== expected.schema.name
      || securitySchema.owner !== expected.schema.owner
      || !exactPrivileges(securitySchema.privileges, [
        { grantee: "PUBLIC", privilege: "USAGE", grantable: false },
      ])
      || authorityTable?.name !== expected.authority_table.name
      || authorityTable.owner !== expected.authority_table.owner
      || authorityTable.relkind !== expected.authority_table.relkind
      || authorityTable.rls_enabled !== expected.authority_table.rls_enabled
      || authorityTable.rls_forced !== expected.authority_table.rls_forced
      || !exactPrivileges(authorityTable.privileges, [])
      || !Array.isArray(authorityTable.column_privileges)
      || authorityTable.column_privileges.length !== 0
      || hmac?.signature !== expected.hmac.signature
      || !/^[1-9][0-9]*$/u.test(hmac.oid ?? "")
      || !/^[1-9][0-9]*$/u.test(hmac.extension_oid ?? "")
      || typeof hmac.owner !== "string" || hmac.owner.length === 0
      || expected.hmac.disallowed_owners.includes(hmac.owner)
      || hmac.extension !== expected.hmac.extension
      || hmac.extension_version !== expected.hmac.extension_version
      || !exactPrivileges(hmac.privileges, [
        { grantee: "PUBLIC", privilege: "EXECUTE", grantable: false },
      ])
      || publicSchema?.name !== expected.public_schema.name
      || publicSchema.public_can_create !== expected.runtime_public_create
      || publicSchema.public_can_use !== expected.public_schema.public_usage
      || !Array.isArray(publicSchema.runtime_create)
      || publicSchema.runtime_create.length !==
        expected.public_schema.runtime_roles.length
      || publicSchema.runtime_create.some((entry) =>
        (entry.exists && (entry.can_create !== expected.public_schema.runtime_create
          || entry.can_use !== expected.public_schema.runtime_usage))
        || (!entry.exists && (entry.can_create !== null
          || entry.can_use !== null)))
      || !publicSchema.runtime_create.some((entry) =>
        entry.role === "lawos_app" && entry.exists)
      || (phase === "post_migration"
        && publicSchema.runtime_create.some((entry) => !entry.exists))) {
    failTenantContextAuthority();
  }
  const material = deepFreeze({
    schema_version: TENANT_CONTEXT_FACTS_SCHEMA_VERSION,
    phase,
    current_tenant: currentTenant,
    lawos_security_schema: securitySchema,
    authority_table: authorityTable,
    hmac,
    public_schema: publicSchema,
  });
  return Object.freeze({
    material,
    tenant_context_authority_facts_sha256: hashDomainValue(material),
  });
}

export function assertOutlookAssignmentMigrationPreflightReceipt(value) {
  const keys = [
    "lawos_app_membership_present",
    "material",
    "migration_preflight_sha256",
    "tenant_context_authority_facts_sha256",
  ];
  if (!value || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).sort().join("\0") !== keys.join("\0")
      || value.material?.schema_version !== PREFLIGHT_SCHEMA_VERSION
      || !PHASES.has(value.material.phase)
      || value.material.tenant_context?.schema_version !==
        TENANT_CONTEXT_FACTS_SCHEMA_VERSION
      || value.material.tenant_context.phase !== value.material.phase
      || !/^[a-f0-9]{64}$/u.test(
        value.material.authority_catalog_sha256 ?? "",
      )
      || typeof value.material.expected_database_name !== "string"
      || value.material.identity?.database_name !==
        value.material.expected_database_name
      || !/^[a-f0-9]{64}$/u.test(
        value.tenant_context_authority_facts_sha256 ?? "",
      )
      || hashDomainValue(value.material.tenant_context) !==
        value.tenant_context_authority_facts_sha256
      || !/^[a-f0-9]{64}$/u.test(value.migration_preflight_sha256 ?? "")
      || hashDomainValue(value.material) !== value.migration_preflight_sha256
      || typeof value.lawos_app_membership_present !== "boolean"
      || value.material.lawos_app_membership.present !==
        value.lawos_app_membership_present) {
    throw new TypeError("Outlook assignment migration preflight receipt is invalid");
  }
  return deepFreeze(structuredClone(value));
}

export async function verifyOutlookAssignmentMigrationPreflight(
  client,
  {
    authority_catalog: authorityCatalog = AUTHORITY,
    phase = "pre_migration",
  } = {},
) {
  if (!PHASES.has(phase)) throw new TypeError("Outlook authority phase is invalid");
  const authority = assertOutlookDesktopAssignmentAuthorityCatalog(
    authorityCatalog,
    { database_name: authorityCatalog?.database?.name },
  );
  const tenantContext = await readOutlookAssignmentTenantContextAuthorityFacts(
    client,
    { authority_catalog: authority, phase },
  );
  const identity = (await client.query(
    `SELECT session_user,current_user,current_database() AS database_name,
            database.oid::text AS database_oid,
            (current_setting('server_version_num')::integer/10000)::text
              AS postgres_major,
            pg_backend_pid() AS backend_pid
       FROM pg_database AS database
      WHERE database.datname=current_database()`,
  )).rows[0];
  const app = (await client.query(
    `SELECT oid::text AS role_oid,rolname AS role_name,rolcanlogin,rolsuper,
            rolcreatedb,rolcreaterole,rolinherit,rolreplication,rolbypassrls,
            rolconnlimit::text,rolvaliduntil IS NOT NULL AS valid_until_present,
            COALESCE(to_char(rolvaliduntil AT TIME ZONE 'UTC',
              'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'') AS valid_until,
            COALESCE(to_jsonb(rolconfig),'[]'::jsonb) AS config
       FROM pg_roles WHERE rolname='lawos_app'`,
  )).rows[0];
  const memberships = (await client.query(
    `SELECT granted.oid::text AS granted_role_oid,
            granted.rolname AS granted_role,
            member.oid::text AS member_oid,member.rolname AS member,
            grantor.oid::text AS grantor_oid,grantor.rolname AS grantor,
            membership.admin_option,membership.inherit_option,
            membership.set_option
       FROM pg_auth_members AS membership
       JOIN pg_roles AS granted ON granted.oid=membership.roleid
       JOIN pg_roles AS member ON member.oid=membership.member
       JOIN pg_roles AS grantor ON grantor.oid=membership.grantor
      WHERE granted.rolname='lawos_app' OR member.rolname='lawos_app'
      ORDER BY granted.rolname,member.rolname,grantor.rolname`,
  )).rows;
  const expectedApp = authority.role_attributes.lawos_app;
  const policy = authority.bootstrap_receipt.lawos_app_membership_policy;
  const edge = memberships[0] ?? null;
  if (identity?.session_user !== authority.migration_admin
      || identity.current_user !== authority.migration_admin
      || identity.database_name !== authority.database.name
      || identity.postgres_major !== authority.bootstrap_receipt.postgres_major
      || !/^[1-9][0-9]*$/u.test(identity.database_oid ?? "")
      || !Number.isSafeInteger(identity.backend_pid) || identity.backend_pid < 1
      || app?.role_name !== "lawos_app"
      || app.rolcanlogin !== expectedApp.login
      || app.rolsuper !== expectedApp.superuser
      || app.rolcreatedb !== expectedApp.createdb
      || app.rolcreaterole !== expectedApp.createrole
      || app.rolinherit !== expectedApp.inherit
      || app.rolreplication !== expectedApp.replication
      || app.rolbypassrls !== expectedApp.bypassrls
      || memberships.length > 1
      || (edge && (edge.granted_role !== "lawos_app"
        || edge.member !== policy.member
        || edge.grantor === authority.migration_admin
        || edge.admin_option !== policy.admin_option
        || edge.inherit_option !== policy.inherit_option
        || edge.set_option !== policy.set_option))) {
    failTenantContextAuthority();
  }
  const material = deepFreeze({
    schema_version: PREFLIGHT_SCHEMA_VERSION,
    phase,
    authority_catalog_sha256: hashDomainValue(authority),
    expected_database_name: authority.database.name,
    identity,
    lawos_app: app,
    lawos_app_membership: Object.freeze({
      present: edge !== null,
      edge,
    }),
    tenant_context: tenantContext.material,
  });
  return assertOutlookAssignmentMigrationPreflightReceipt({
    material,
    lawos_app_membership_present: edge !== null,
    tenant_context_authority_facts_sha256:
      tenantContext.tenant_context_authority_facts_sha256,
    migration_preflight_sha256: hashDomainValue(material),
  });
}

export async function readOutlookAssignmentProtectedObjectFacts(client) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL migration client is required");
  }
  const tables = (await client.query(
    `SELECT expected.name,owner.rolname AS owner,relation.relkind,
            relation.relrowsecurity AS rls_enabled,
            relation.relforcerowsecurity AS rls_forced,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'name',policy.polname,'permissive',policy.polpermissive,
              'command',policy.polcmd,'roles',policy.polroles,
              'using',pg_get_expr(policy.polqual,policy.polrelid),
              'with_check',pg_get_expr(policy.polwithcheck,policy.polrelid)
            ) ORDER BY policy.polname) FROM pg_policy AS policy
              WHERE policy.polrelid=relation.oid),'[]'::jsonb) AS policies,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'grantee',COALESCE(grantee.rolname,'PUBLIC'),
              'privilege',privilege.privilege_type,
              'grantable',privilege.is_grantable
            ) ORDER BY COALESCE(grantee.rolname,'PUBLIC'),
                       privilege.privilege_type)
              FROM aclexplode(COALESCE(relation.relacl,
                acldefault('r',relation.relowner))) AS privilege
              LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
             WHERE privilege.grantee<>relation.relowner),'[]'::jsonb)
              AS privileges,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'column',attribute.attname,
              'grantee',COALESCE(grantee.rolname,'PUBLIC'),
              'privilege',privilege.privilege_type,
              'grantable',privilege.is_grantable
            ) ORDER BY attribute.attnum,COALESCE(grantee.rolname,'PUBLIC'),
                       privilege.privilege_type)
              FROM pg_attribute AS attribute
              CROSS JOIN LATERAL aclexplode(attribute.attacl) AS privilege
              LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
             WHERE attribute.attrelid=relation.oid AND attribute.attnum>0
               AND NOT attribute.attisdropped),'[]'::jsonb)
              AS column_privileges,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'name',trigger.tgname,
              'function_signature',trigger.tgfoid::regprocedure::text,
              'type',trigger.tgtype,'enabled',trigger.tgenabled,
              'constraint_oid',trigger.tgconstraint,
              'deferrable',trigger.tgdeferrable,
              'initially_deferred',trigger.tginitdeferred
            ) ORDER BY trigger.tgname) FROM pg_trigger AS trigger
             WHERE trigger.tgrelid=relation.oid AND NOT trigger.tgisinternal),
              '[]'::jsonb) AS triggers
       FROM unnest($1::text[]) WITH ORDINALITY AS expected(name,position)
       LEFT JOIN pg_class AS relation ON relation.oid=to_regclass(expected.name)
       LEFT JOIN pg_roles AS owner ON owner.oid=relation.relowner
      ORDER BY expected.position`,
    [AUTHORITY.tables.map(({ name }) => name)],
  )).rows;
  const functions = (await client.query(
    `SELECT expected.signature,owner.rolname AS owner,language.lanname AS language,
            procedure.prokind AS kind,procedure.prosecdef AS security_definer,
            procedure.provolatile AS volatility,
            procedure.proparallel AS parallel,
            procedure.proisstrict AS strict,
            pg_get_function_result(procedure.oid) AS return_type,
            COALESCE(to_jsonb(procedure.proconfig),'[]'::jsonb) AS config,
            encode(pg_catalog.sha256(pg_catalog.convert_to(
              procedure.prosrc,'UTF8')),'hex') AS body_sha256,
            COALESCE((SELECT jsonb_agg(jsonb_build_object(
              'grantee',COALESCE(grantee.rolname,'PUBLIC'),
              'privilege',privilege.privilege_type,
              'grantable',privilege.is_grantable
            ) ORDER BY COALESCE(grantee.rolname,'PUBLIC'),
                       privilege.privilege_type)
              FROM aclexplode(COALESCE(procedure.proacl,
                acldefault('f',procedure.proowner))) AS privilege
              LEFT JOIN pg_roles AS grantee ON grantee.oid=privilege.grantee
             WHERE privilege.grantee<>procedure.proowner),'[]'::jsonb)
              AS privileges
       FROM unnest($1::text[]) WITH ORDINALITY
         AS expected(signature,position)
       LEFT JOIN pg_proc AS procedure
         ON procedure.oid=to_regprocedure(expected.signature)
       LEFT JOIN pg_roles AS owner ON owner.oid=procedure.proowner
       LEFT JOIN pg_language AS language ON language.oid=procedure.prolang
      ORDER BY expected.position`,
    [AUTHORITY.functions.map(({ signature }) => signature)],
  )).rows;
  const material = deepFreeze({
    schema_version: FACTS_SCHEMA_VERSION,
    tables,
    functions,
  });
  return Object.freeze({
    material,
    protected_table_count: tables.length,
    protected_function_count: functions.length,
    protected_object_facts_sha256: hashDomainValue(material),
  });
}
