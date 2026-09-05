import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { listEmailDmsPostgresMigrations } from "./migrations/index.js";

const MIGRATION_ID = "010_internal_unsigned_installation_authority";
const migration = listEmailDmsPostgresMigrations().find(({ id }) => id === MIGRATION_ID);
if (!migration) throw new TypeError(`${MIGRATION_ID} is not registered`);

export const INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS = Object.freeze([
  Object.freeze({
    signature: "lawos_email_dms.authorize_internal_unsigned_release(text,jsonb)",
    owner: "lawos_outlook_authority_owner",
    allowed_roles: Object.freeze(["lawos_outlook_control_operator"]),
    transaction_mode: "serializable",
    language: "plpgsql",
    kind: "function",
    volatility: "volatile",
    parallel: "unsafe",
    leakproof: false,
    security_definer: true,
    search_path: "pg_catalog, lawos_email_dms, lawos_security",
    return_type: "jsonb",
    pg_get_functiondef_sha256: "95bef8686872287ada9726df999c497cf1ce948c8e3bf9ade437cfb5ba3f57f8",
  }),
  Object.freeze({
    signature: "lawos_email_dms.revoke_internal_unsigned_release(text,jsonb)",
    owner: "lawos_outlook_authority_owner",
    allowed_roles: Object.freeze(["lawos_outlook_control_operator"]),
    transaction_mode: "serializable",
    language: "plpgsql",
    kind: "function",
    volatility: "volatile",
    parallel: "unsafe",
    leakproof: false,
    security_definer: true,
    search_path: "pg_catalog, lawos_email_dms, lawos_security",
    return_type: "jsonb",
    pg_get_functiondef_sha256: "2ca9d405e26d36c3a3aad967b27d360885cb264cff630b94a6e7c4311564a3db",
  }),
  Object.freeze({
    signature: "lawos_email_dms.apply_internal_unsigned_installation(text,jsonb)",
    owner: "lawos_outlook_authority_owner",
    allowed_roles: Object.freeze(["lawos_app"]),
    transaction_mode: "serializable",
    language: "plpgsql",
    kind: "function",
    volatility: "volatile",
    parallel: "unsafe",
    leakproof: false,
    security_definer: true,
    search_path: "pg_catalog, lawos_email_dms, lawos_security",
    return_type: "jsonb",
    pg_get_functiondef_sha256: "f23acaddac3cf6b85fec1231553fd6957d3480a3cc4f9389d5b1d93bdad7d5e2",
  }),
  Object.freeze({
    signature: "lawos_email_dms.read_current_internal_unsigned_installation(text,text,text)",
    owner: "lawos_outlook_authority_owner",
    allowed_roles: Object.freeze(["lawos_app"]),
    transaction_mode: "serializable_read_only",
    language: "plpgsql",
    kind: "function",
    volatility: "volatile",
    parallel: "unsafe",
    leakproof: false,
    security_definer: true,
    search_path: "pg_catalog, lawos_email_dms, lawos_security",
    return_type: "jsonb",
    pg_get_functiondef_sha256: "73b6bf09960eb74aa2152474a656095570884869e9d9cb75adbb9e15ef7a6cc9",
  }),
  Object.freeze({
    signature: "lawos_email_dms.read_internal_unsigned_installation_proof_key(text,text,text,text)",
    owner: "lawos_outlook_authority_owner",
    allowed_roles: Object.freeze(["lawos_app"]),
    transaction_mode: "serializable_read_only",
    language: "plpgsql",
    kind: "function",
    volatility: "volatile",
    parallel: "unsafe",
    leakproof: false,
    security_definer: true,
    search_path: "pg_catalog, lawos_email_dms, lawos_security",
    return_type: "jsonb",
    pg_get_functiondef_sha256: "085e72b17e977cf4dd9ded5a0be6916673e3a5db931825b20b07b72928679363",
  })
]);

export const INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS_SHA256 =
  hashDomainValue(INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS);

export const INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG = Object.freeze({
  schema_version: "lawos.internal-unsigned-installation-authority-catalog.v1",
  source_migration_id: migration.id,
  source_migration_file_name: migration.file_name,
  source_migration_checksum: migration.checksum,
  exposed_security_definer_function_count: 5,
  security_definer_functions: INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS,
  security_definer_functions_sha256:
    INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS_SHA256,
  raw_release_binding_table_grants: Object.freeze([]),
  temporary_role_membership_persisted: false,
  temporary_schema_create_persisted: false,
});

export const INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG_SHA256 =
  hashDomainValue(INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG);
