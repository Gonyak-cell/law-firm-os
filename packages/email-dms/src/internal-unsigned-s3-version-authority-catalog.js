import { hashDomainValue } from "../../persistence/src/domain-ledger.js";
import { listEmailDmsPostgresMigrations } from "./migrations/index.js";
import {
  INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG,
  INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS,
} from "./internal-unsigned-installation-authority-catalog.js";

const migration = listEmailDmsPostgresMigrations().find(({ id }) => id === "011_internal_unsigned_s3_version");
if (!migration) throw new TypeError("011_internal_unsigned_s3_version is not registered");

export const INTERNAL_UNSIGNED_S3_VERSION_SECURITY_DEFINER_FUNCTIONS = Object.freeze(
  INTERNAL_UNSIGNED_INSTALLATION_SECURITY_DEFINER_FUNCTIONS.map((entry) => entry.signature ===
    "lawos_email_dms.authorize_internal_unsigned_release(text,jsonb)"
    ? Object.freeze({ ...entry, pg_get_functiondef_sha256:
      "4d0f70a5a0d09154982b295e4c54a67837538db54bd8502495aac6480df2feb6" })
    : entry),
);
export const INTERNAL_UNSIGNED_S3_VERSION_SECURITY_DEFINER_FUNCTIONS_SHA256 =
  hashDomainValue(INTERNAL_UNSIGNED_S3_VERSION_SECURITY_DEFINER_FUNCTIONS);
export const INTERNAL_UNSIGNED_S3_VERSION_AUTHORITY_CATALOG = Object.freeze({
  ...INTERNAL_UNSIGNED_INSTALLATION_AUTHORITY_CATALOG,
  source_migration_id: migration.id,
  source_migration_file_name: migration.file_name,
  source_migration_checksum: migration.checksum,
  security_definer_functions: INTERNAL_UNSIGNED_S3_VERSION_SECURITY_DEFINER_FUNCTIONS,
  security_definer_functions_sha256: INTERNAL_UNSIGNED_S3_VERSION_SECURITY_DEFINER_FUNCTIONS_SHA256,
});
export const INTERNAL_UNSIGNED_S3_VERSION_AUTHORITY_CATALOG_SHA256 =
  hashDomainValue(INTERNAL_UNSIGNED_S3_VERSION_AUTHORITY_CATALOG);
