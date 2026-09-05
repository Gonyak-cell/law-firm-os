import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import {
  INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG_SHA256,
  INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS,
} from "./internal-unsigned-installation-authority-catalog.js";

const FUNCTIONS = INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS;
const TABLES = ["internal_unsigned_release_authorizations", "internal_unsigned_release_revocations", "internal_unsigned_installation_bindings"];
const CALLER_ROLES = ["lawos_app", "lawos_outlook_control_operator", "lawos_outlook_assignment_worker", "lawos_outlook_lifecycle_verifier"];
const OWNER = "lawos_outlook_authority_owner";
const EXPECTED = Object.freeze({
  functions: FUNCTIONS.map((entry) => ({
    signature: entry.signature, owner: entry.owner, language: entry.language,
    kind: { function: "f" }[entry.kind], volatility: { volatile: "v" }[entry.volatility],
    parallel: { unsafe: "u" }[entry.parallel], leakproof: entry.leakproof,
    security_definer: entry.security_definer, return_type: entry.return_type,
    config: [`search_path=${entry.search_path}`],
    definition_sha256: entry.pg_get_functiondef_sha256,
    privileges: [...entry.allowed_roles].sort().map((grantee) => ({ grantee, privilege: "EXECUTE", grantable: false })),
    unexpected_overload: false,
  })),
  tables: TABLES.map((name) => ({ name: `lawos_email_dms.${name}`, owner: "lawos_outlook_authority_owner",
    row_security: true, force_row_security: true, privileges: [], column_privileges: [],
    policies: [{ name: "tenant_isolation", permissive: true, command: "*", roles: ["0"],
      qual: "(tenant_id = lawos_security.current_tenant_id())", with_check: "(tenant_id = lawos_security.current_tenant_id())" }],
    triggers: [
      { name: "immutable_rows", enabled: "O", definition: `CREATE TRIGGER immutable_rows BEFORE DELETE OR UPDATE ON lawos_email_dms.${name} FOR EACH ROW EXECUTE FUNCTION lawos_email_dms.reject_outlook_desktop_immutable_mutation()` },
      { name: "immutable_truncate", enabled: "O", definition: `CREATE TRIGGER immutable_truncate BEFORE TRUNCATE ON lawos_email_dms.${name} FOR EACH STATEMENT EXECUTE FUNCTION lawos_email_dms.reject_outlook_desktop_immutable_mutation()` },
    ],
    effective_raw_access: false,
  })),
  roles: [...CALLER_ROLES, OWNER].sort().map((name) => ({ name, login: name !== OWNER,
    superuser: false, bypass_rls: false, create_role: false, create_db: false, replication: false })),
  role_access: CALLER_ROLES.flatMap((member) => [...CALLER_ROLES, OWNER]
    .filter((role) => role !== member).map((role) => ({ member, role, inherit: false, set_role: false }))),
  temporary_privileges: [{ owner_schema_create: false, self_grant: false }],
});

function failure() {
  return Object.assign(new Error("Internal installation authority metadata readback failed"), {
    code: "LAWOS_INTERNAL_INSTALLATION_AUTHORITY_READBACK",
    safe_error_code: "INTERNAL_INSTALLATION_AUTHORITY_READBACK_FAILED", status: 503,
  });
}

export async function readInternalUnsignedInstallationAuthorityReadback(client) {
  if (!client || typeof client.query !== "function") throw failure();
  try {
    const functions = (await client.query(
      `SELECT expected.signature,owner.rolname AS owner,language.lanname AS language,
        procedure.prokind AS kind,procedure.provolatile AS volatility,
        procedure.proparallel AS parallel,procedure.proleakproof AS leakproof,
        procedure.prosecdef AS security_definer,
        pg_catalog.pg_get_function_result(procedure.oid) AS return_type,
        COALESCE(to_jsonb(procedure.proconfig),'[]'::jsonb) AS config,
        encode(pg_catalog.sha256(pg_catalog.convert_to(
          pg_catalog.pg_get_functiondef(procedure.oid),'UTF8')),'hex') AS definition_sha256,
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'grantee',COALESCE(grantee.rolname,'PUBLIC'),
          'privilege',privilege.privilege_type,'grantable',privilege.is_grantable
        ) ORDER BY COALESCE(grantee.rolname,'PUBLIC'),privilege.privilege_type)
          FROM pg_catalog.aclexplode(COALESCE(procedure.proacl,
            pg_catalog.acldefault('f',procedure.proowner))) AS privilege
          LEFT JOIN pg_catalog.pg_roles AS grantee ON grantee.oid=privilege.grantee
          WHERE privilege.grantee<>procedure.proowner),'[]'::jsonb) AS privileges,
        EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS other
          WHERE other.pronamespace=procedure.pronamespace
            AND other.proname=procedure.proname AND other.oid<>procedure.oid) AS unexpected_overload
       FROM unnest($1::text[]) WITH ORDINALITY AS expected(signature,position)
       LEFT JOIN pg_catalog.pg_proc AS procedure ON procedure.oid=pg_catalog.to_regprocedure(expected.signature)
       LEFT JOIN pg_catalog.pg_roles AS owner ON owner.oid=procedure.proowner
       LEFT JOIN pg_catalog.pg_language AS language ON language.oid=procedure.prolang
       ORDER BY expected.position`, [FUNCTIONS.map(({ signature }) => signature)],
    )).rows;
    const tables = (await client.query(
      `SELECT expected.name,owner.rolname AS owner,
        relation.relrowsecurity AS row_security,relation.relforcerowsecurity AS force_row_security,
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'grantee',COALESCE(grantee.rolname,'PUBLIC'),'privilege',privilege.privilege_type,
          'grantable',privilege.is_grantable) ORDER BY COALESCE(grantee.rolname,'PUBLIC'),privilege.privilege_type)
          FROM pg_catalog.aclexplode(COALESCE(relation.relacl,
            pg_catalog.acldefault('r',relation.relowner))) AS privilege
          LEFT JOIN pg_catalog.pg_roles AS grantee ON grantee.oid=privilege.grantee
          WHERE privilege.grantee<>relation.relowner),'[]'::jsonb) AS privileges,
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'column',attribute.attname,'grantee',COALESCE(grantee.rolname,'PUBLIC'),
          'privilege',privilege.privilege_type,'grantable',privilege.is_grantable)
          ORDER BY attribute.attnum,COALESCE(grantee.rolname,'PUBLIC'),privilege.privilege_type)
          FROM pg_catalog.pg_attribute AS attribute
          CROSS JOIN LATERAL pg_catalog.aclexplode(attribute.attacl) AS privilege
          LEFT JOIN pg_catalog.pg_roles AS grantee ON grantee.oid=privilege.grantee
          WHERE attribute.attrelid=relation.oid AND privilege.grantee<>relation.relowner),'[]'::jsonb) AS column_privileges,
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'name',policy.polname,'permissive',policy.polpermissive,'command',policy.polcmd,
          'roles',to_jsonb(policy.polroles),'qual',pg_catalog.pg_get_expr(policy.polqual,policy.polrelid),
          'with_check',pg_catalog.pg_get_expr(policy.polwithcheck,policy.polrelid)) ORDER BY policy.polname)
          FROM pg_catalog.pg_policy AS policy WHERE policy.polrelid=relation.oid),'[]'::jsonb) AS policies,
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'name',trigger.tgname,'enabled',trigger.tgenabled,'definition',pg_catalog.pg_get_triggerdef(trigger.oid))
          ORDER BY trigger.tgname) FROM pg_catalog.pg_trigger AS trigger
          WHERE trigger.tgrelid=relation.oid AND NOT trigger.tgisinternal),'[]'::jsonb) AS triggers,
        EXISTS (SELECT 1 FROM unnest($2::text[]) AS caller(name)
          WHERE pg_catalog.has_table_privilege(caller.name,relation.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
            OR pg_catalog.has_any_column_privilege(caller.name,relation.oid,'SELECT,INSERT,UPDATE,REFERENCES')) AS effective_raw_access
       FROM unnest($1::text[]) WITH ORDINALITY AS expected(name,position)
       LEFT JOIN pg_catalog.pg_class AS relation ON relation.oid=pg_catalog.to_regclass(expected.name)
       LEFT JOIN pg_catalog.pg_roles AS owner ON owner.oid=relation.relowner
       ORDER BY expected.position`, [TABLES.map((name) => `lawos_email_dms.${name}`), CALLER_ROLES],
    )).rows;
    const roles = (await client.query(
      `SELECT expected.name,role.rolcanlogin AS login,role.rolsuper AS superuser,
        role.rolbypassrls AS bypass_rls,role.rolcreaterole AS create_role,
        role.rolcreatedb AS create_db,role.rolreplication AS replication
       FROM unnest($1::text[]) AS expected(name)
       LEFT JOIN pg_catalog.pg_roles AS role ON role.rolname=expected.name
       ORDER BY expected.name`, [[...CALLER_ROLES, OWNER]],
    )).rows;
    const roleAccess = (await client.query(
      `SELECT member.name AS member,role.name AS role,
        pg_catalog.pg_has_role(member.name,role.name,'USAGE') AS inherit,
        pg_catalog.pg_has_role(member.name,role.name,'SET') AS set_role
       FROM unnest($1::text[]) WITH ORDINALITY AS member(name,position)
       CROSS JOIN unnest($2::text[]) WITH ORDINALITY AS role(name,position)
       WHERE member.name<>role.name ORDER BY member.position,role.position`,
      [CALLER_ROLES, [...CALLER_ROLES, OWNER]],
    )).rows;
    const temporaryPrivileges = (await client.query(
      `SELECT pg_catalog.has_schema_privilege('lawos_outlook_authority_owner',
        'lawos_email_dms','CREATE') AS owner_schema_create,
        EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members
          WHERE roleid='lawos_outlook_authority_owner'::regrole
            AND member='lawos_admin'::regrole AND grantor='lawos_admin'::regrole) AS self_grant`,
    )).rows;
    const facts = { functions, tables, roles, role_access: roleAccess, temporary_privileges: temporaryPrivileges };
    if (hashDomainValue(facts) !== hashDomainValue(EXPECTED)) throw failure();
    return Object.freeze({
      schema_version: "lawos.internal-unsigned-installation-authority-readback.v1",
      authority_catalog_sha256: INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG_SHA256,
      function_count: FUNCTIONS.length, table_count: TABLES.length,
      authority_facts_sha256: hashDomainValue(facts),
    });
  } catch { throw failure(); }
}

export async function verifyInternalUnsignedInstallationAuthorityReadback(pool) {
  if (!pool || typeof pool.connect !== "function") throw failure();
  let client;
  let releaseError;
  try {
    client = await pool.connect();
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY");
    await client.query("SET LOCAL statement_timeout = 15000");
    const receipt = await readInternalUnsignedInstallationAuthorityReadback(client);
    await client.query("COMMIT");
    return receipt;
  } catch {
    if (client) {
      try { await client.query("ROLLBACK"); } catch { releaseError = failure(); }
    }
    throw failure();
  } finally { client?.release(releaseError); }
}
