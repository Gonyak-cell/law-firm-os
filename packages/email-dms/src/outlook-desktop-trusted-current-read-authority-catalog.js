import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { listEmailDmsPostgresMigrations } from "./migrations/index.js";

const MIGRATION_ID = "008_outlook_desktop_trusted_current_read";
const migration = listEmailDmsPostgresMigrations()
  .find(({ id }) => id === MIGRATION_ID);
if (!migration) throw new TypeError(`${MIGRATION_ID} is not registered`);

export const OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS =
  Object.freeze([Object.freeze({
    signature:
      "lawos_email_dms.read_trusted_current_outlook_desktop_installation(text,text,text)",
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
    pg_get_functiondef_sha256:
      "1ff7f4764172f6bacd35567a0b4dda403212f6bce756088f5ac8cac51df629b7",
  })]);

export const OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS_SHA256 =
  hashDomainValue(
    OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS,
  );

export const OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG =
  Object.freeze({
    schema_version:
      "lawos.outlook-desktop-trusted-current-read-authority-catalog.v1",
    source_migration_id: migration.id,
    source_migration_file_name: migration.file_name,
    source_migration_checksum: migration.checksum,
    exposed_security_definer_function_count: 1,
    security_definer_functions:
      OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS,
    security_definer_functions_sha256:
      OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_SECURITY_DEFINER_FUNCTIONS_SHA256,
    raw_release_binding_table_grants: Object.freeze([]),
    temporary_role_membership_persisted: false,
    temporary_schema_create_persisted: false,
  });

export const OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG_SHA256 =
  hashDomainValue(OUTLOOK_DESKTOP_TRUSTED_CURRENT_READ_AUTHORITY_CATALOG);
