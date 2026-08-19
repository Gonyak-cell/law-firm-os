export const CATALOG_READBACK_SHA1 = /^[a-f0-9]{40}$/u;
export const CATALOG_READBACK_SHA256 = /^[a-f0-9]{64}$/u;
export const CATALOG_READBACK_TOKEN = /^[A-Za-z0-9._:-]{1,200}$/u;
export const CATALOG_READBACK_PACKET_KEYS = Object.freeze([
  "schema_version",
  "packet_id",
  "source_sha",
  "source_tree",
  "action",
  "operation",
  "environment",
  "target",
  "diagnostic_artifact",
  "rollback_artifact",
  "pre_state",
  "live_authority",
  "task2_inventory",
  "source_catalog",
  "output_contract_sha256",
  "operation_budget",
  "rollback_required",
  "data_scope",
  "contact_scope",
]);
export const CATALOG_READBACK_TARGET_KEYS = Object.freeze([
  "aws_account",
  "aws_region",
  "function_name",
  "execution_role",
]);

const ARTIFACT_KEYS = Object.freeze([
  "sha256",
  "bytes",
  "manifest_sha256",
  "code_sha256_base64",
]);
const PRE_STATE_KEYS = Object.freeze([
  "revision_id",
  "code_sha256_base64",
  "configuration_fingerprint_sha256",
  "non_code_configuration_fingerprint_sha256",
]);
const TASK2_INVENTORY_KEYS = Object.freeze([
  "schema_version",
  "inventory_sha256",
  "observed_at",
  "projection_auditor_row_sha256",
]);
const LIVE_AUTHORITY_KEYS = Object.freeze([
  "schema_version",
  "approval_audit_bucket_sha256",
  "aws_cli_toolchain_manifest_sha256",
  "database_host_sha256",
  "database_identifier_sha256",
  "deployment_artifact_sha256",
  "deployment_commit",
  "deployment_tree",
  "execution_packet_sha256",
  "program_input_bucket_sha256",
  "program_input_kms_key_arn_sha256",
  "projection_auditor_database_secret_id_sha256",
  "tenant_context_secret_id_sha256",
]);
const SOURCE_CATALOG_KEYS = Object.freeze([
  "migration_count",
  "catalog_sha256",
]);
const OPERATION_BUDGET_KEYS = Object.freeze([
  "update_function_code",
  "invoke_function",
  "update_function_configuration",
  "iam_writes",
  "secret_writes",
  "vpc_writes",
  "concurrency_writes",
  "database_writes",
]);

export function failCatalogReadbackAuthorization(code, message) {
  throw Object.assign(new Error(message), { code });
}

export function exactCatalogReadbackAuthorizationKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    failCatalogReadbackAuthorization(
      "LAWOS_CATALOG_READBACK_AUTHORIZATION_SCHEMA",
      `${label} fields are invalid`,
    );
  }
}

function digest(value, label) {
  if (!CATALOG_READBACK_SHA256.test(value ?? "")
    || value === "0".repeat(64)) {
    failCatalogReadbackAuthorization(
      "LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING",
      `${label} is invalid`,
    );
  }
  return value;
}

function codeSha256(value, label) {
  const decoded = Buffer.from(value ?? "", "base64");
  if (typeof value !== "string"
    || decoded.byteLength !== 32
    || decoded.equals(Buffer.alloc(32))
    || decoded.toString("base64") !== value) {
    failCatalogReadbackAuthorization(
      "LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING",
      `${label} is invalid`,
    );
  }
  return value;
}

export function validateCatalogReadbackArtifact(value, label) {
  exactCatalogReadbackAuthorizationKeys(value, ARTIFACT_KEYS, label);
  if (!Number.isSafeInteger(value.bytes) || value.bytes < 1) {
    failCatalogReadbackAuthorization(
      "LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING",
      `${label} byte size is invalid`,
    );
  }
  digest(value.sha256, `${label} SHA-256`);
  digest(value.manifest_sha256, `${label} manifest SHA-256`);
  codeSha256(value.code_sha256_base64, `${label} CodeSha256`);
  if (Buffer.from(value.code_sha256_base64, "base64").toString("hex")
      !== value.sha256) {
    failCatalogReadbackAuthorization(
      "LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING",
      `${label} code identity is inconsistent`,
    );
  }
  return value;
}

export function validateCatalogReadbackPreState(value) {
  exactCatalogReadbackAuthorizationKeys(
    value,
    PRE_STATE_KEYS,
    "pre-deploy state",
  );
  if (!CATALOG_READBACK_TOKEN.test(value.revision_id ?? "")) {
    failCatalogReadbackAuthorization(
      "LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING",
      "pre-deploy RevisionId is invalid",
    );
  }
  codeSha256(value.code_sha256_base64, "pre-deploy CodeSha256");
  digest(value.configuration_fingerprint_sha256, "pre-deploy full fingerprint");
  digest(
    value.non_code_configuration_fingerprint_sha256,
    "pre-deploy non-code fingerprint",
  );
  return value;
}

export function validateCatalogReadbackTask2Inventory(value) {
  exactCatalogReadbackAuthorizationKeys(
    value,
    TASK2_INVENTORY_KEYS,
    "Task 2 inventory binding",
  );
  if (value.schema_version
      !== "amic-os.outlook.production-aws-inventory.v2"
    || typeof value.observed_at !== "string"
    || !Number.isFinite(Date.parse(value.observed_at))
    || new Date(value.observed_at).toISOString() !== value.observed_at) {
    failCatalogReadbackAuthorization(
      "LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING",
      "Task 2 inventory identity is invalid",
    );
  }
  digest(value.inventory_sha256, "Task 2 inventory SHA-256");
  digest(
    value.projection_auditor_row_sha256,
    "Task 2 projection-auditor row SHA-256",
  );
  return value;
}

export function validateCatalogReadbackLiveAuthority(value) {
  exactCatalogReadbackAuthorizationKeys(
    value,
    LIVE_AUTHORITY_KEYS,
    "live projection-auditor authority",
  );
  if (value.schema_version
      !== "law-firm-os.production-migration-catalog-readback-live-authority.v1"
    || !CATALOG_READBACK_SHA1.test(value.deployment_commit ?? "")
    || !CATALOG_READBACK_SHA1.test(value.deployment_tree ?? "")) {
    failCatalogReadbackAuthorization(
      "LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING",
      "live projection-auditor authority identity is invalid",
    );
  }
  for (const key of LIVE_AUTHORITY_KEYS.slice(1).filter(
    (key) => !["deployment_commit", "deployment_tree"].includes(key),
  )) digest(value[key], `live authority ${key}`);
  return value;
}

export function validateCatalogReadbackSourceCatalog(value, expected = {}) {
  exactCatalogReadbackAuthorizationKeys(
    value,
    SOURCE_CATALOG_KEYS,
    "source catalog",
  );
  if (!Number.isSafeInteger(value.migration_count)
    || value.migration_count < 1
    || (expected.migrationCount !== undefined
      && value.migration_count !== expected.migrationCount)) {
    failCatalogReadbackAuthorization(
      "LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING",
      "source catalog count is invalid",
    );
  }
  digest(value.catalog_sha256, "source catalog SHA-256");
  if (expected.catalogSha256
    && value.catalog_sha256 !== expected.catalogSha256) {
    failCatalogReadbackAuthorization(
      "LAWOS_CATALOG_READBACK_AUTHORIZATION_BINDING",
      "source catalog SHA-256 drifted",
    );
  }
  return value;
}

export function validateCatalogReadbackOperationBudget(value) {
  exactCatalogReadbackAuthorizationKeys(
    value,
    OPERATION_BUDGET_KEYS,
    "operation budget",
  );
  const expected = {
    update_function_code: 2,
    invoke_function: 1,
    update_function_configuration: 0,
    iam_writes: 0,
    secret_writes: 0,
    vpc_writes: 0,
    concurrency_writes: 0,
    database_writes: 0,
  };
  if (Object.entries(expected).some(([key, count]) => value[key] !== count)) {
    failCatalogReadbackAuthorization(
      "LAWOS_CATALOG_READBACK_AUTHORIZATION_BUDGET",
      "operation budget is invalid",
    );
  }
  return expected;
}
