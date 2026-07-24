import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";

export const JSON_POSTGRES_REHEARSAL_MIGRATION_CATALOG_VERSION =
  "law-firm-os.json-postgres-rehearsal-migration-catalog.v1";
export const JSON_POSTGRES_REHEARSAL_DMS_PROVIDER_CONTRACT_VERSION =
  "law-firm-os.json-postgres-rehearsal-dms-provider-contract.v1";
export const JSON_POSTGRES_REHEARSAL_BACKUP_RETENTION_CONTRACT_VERSION =
  "law-firm-os.json-postgres-rehearsal-backup-retention-contract.v1";
export const JSON_POSTGRES_REHEARSAL_PERFORMANCE_BUDGET_VERSION =
  "law-firm-os.json-postgres-rehearsal-performance-budget.v1";
export const JSON_POSTGRES_POST_WRITE_RUNBOOK_CONTRACT_VERSION =
  "law-firm-os.json-postgres-post-write-runbook-contract.v1";

const SHA256 = /^[0-9a-f]{64}$/u;
const MIGRATION_ID = /^[a-z0-9_]+$/u;
const FORBIDDEN_KEY =
  /(^|_)(?:password|passwd|passphrase|secret|token|credential|authorization|api_key|private_key|recovery_key|document_bytes|raw_bytes|raw_payload)(_|$)/iu;

function fail(message) {
  throw new Error(message);
}

function digest(value, digestKey) {
  const material = Object.fromEntries(
    Object.entries(value).filter(([key]) => key !== digestKey),
  );
  return createHash("sha256")
    .update(canonicalizeJson(material))
    .digest("hex");
}

function assertClosed(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || JSON.stringify(Object.keys(value).sort())
      !== JSON.stringify([...keys].sort())) {
    fail(`${label} schema is invalid`);
  }
}

function assertNoSensitiveKeys(value, path = "contract") {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      assertNoSensitiveKeys(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) fail(`${path} contains a sensitive key`);
    assertNoSensitiveKeys(item, `${path}.${key}`);
  }
}

function exactDigest(value, digestKey, label) {
  if (!SHA256.test(value[digestKey] ?? "")
    || value[digestKey] !== digest(value, digestKey)) {
    fail(`${label} digest drifted`);
  }
}

export function createJsonPostgresRehearsalMigrationCatalog(migrations = []) {
  const value = {
    schema_version: JSON_POSTGRES_REHEARSAL_MIGRATION_CATALOG_VERSION,
    authority: "postgres-v2",
    migration_count: migrations.length,
    migrations: migrations.map(({ id, file_name: fileName, checksum }) => ({
      id,
      file_name: fileName,
      checksum,
    })),
  };
  value.catalog_sha256 = digest(value, "catalog_sha256");
  validateJsonPostgresRehearsalMigrationCatalog(value);
  return Object.freeze(value);
}

export function validateJsonPostgresRehearsalMigrationCatalog(value = {}) {
  assertClosed(value, [
    "schema_version", "authority", "migration_count", "migrations",
    "catalog_sha256",
  ], "migration catalog");
  if (value.schema_version !== JSON_POSTGRES_REHEARSAL_MIGRATION_CATALOG_VERSION
    || value.authority !== "postgres-v2"
    || !Number.isSafeInteger(value.migration_count)
    || value.migration_count < 1
    || value.migration_count !== value.migrations?.length) {
    fail("migration catalog values are invalid");
  }
  let previous = "";
  for (const migration of value.migrations) {
    assertClosed(migration, ["id", "file_name", "checksum"], "migration");
    if (!MIGRATION_ID.test(migration.id ?? "")
      || typeof migration.file_name !== "string"
      || !migration.file_name.endsWith(".sql")
      || !SHA256.test(migration.checksum ?? "")
      || migration.id <= previous) {
      fail("migration catalog entry is invalid or unordered");
    }
    previous = migration.id;
  }
  exactDigest(value, "catalog_sha256", "migration catalog");
  return Object.freeze({
    valid: true,
    catalog_sha256: value.catalog_sha256,
    migration_count: value.migration_count,
  });
}

export function createJsonPostgresRehearsalDmsProviderContract() {
  const value = {
    schema_version: JSON_POSTGRES_REHEARSAL_DMS_PROVIDER_CONTRACT_VERSION,
    metadata_authority: "postgres-v2",
    provider: "postgres-dms-s3-v3",
    object_namespace: "tenant_id/object_id",
    target_prefix: "approved-real-rehearsal",
    public_access: false,
    versioning_required: true,
    sse_kms_required: true,
    object_lock_required: true,
    independent_digest_readback_required: true,
    legal_hold_precedes_retention: true,
    permanent_delete_requires_approval: true,
    source_bytes_in_evidence: false,
  };
  value.contract_sha256 = digest(value, "contract_sha256");
  validateJsonPostgresRehearsalDmsProviderContract(value);
  return Object.freeze(value);
}

export function validateJsonPostgresRehearsalDmsProviderContract(value = {}) {
  assertClosed(value, [
    "schema_version", "metadata_authority", "provider", "object_namespace",
    "target_prefix", "public_access", "versioning_required",
    "sse_kms_required", "object_lock_required",
    "independent_digest_readback_required",
    "legal_hold_precedes_retention", "permanent_delete_requires_approval",
    "source_bytes_in_evidence", "contract_sha256",
  ], "DMS provider contract");
  if (value.schema_version
      !== JSON_POSTGRES_REHEARSAL_DMS_PROVIDER_CONTRACT_VERSION
    || value.metadata_authority !== "postgres-v2"
    || value.provider !== "postgres-dms-s3-v3"
    || value.object_namespace !== "tenant_id/object_id"
    || value.target_prefix !== "approved-real-rehearsal"
    || value.public_access !== false
    || value.source_bytes_in_evidence !== false
    || [
      "versioning_required",
      "sse_kms_required",
      "object_lock_required",
      "independent_digest_readback_required",
      "legal_hold_precedes_retention",
      "permanent_delete_requires_approval",
    ].some((key) => value[key] !== true)) {
    fail("DMS provider contract values are invalid");
  }
  exactDigest(value, "contract_sha256", "DMS provider contract");
  return Object.freeze({ valid: true, contract_sha256: value.contract_sha256 });
}

export function createJsonPostgresRehearsalBackupRetentionContract() {
  const value = {
    schema_version:
      JSON_POSTGRES_REHEARSAL_BACKUP_RETENTION_CONTRACT_VERSION,
    source_content_mutation_allowed: false,
    immutable_off_device_backup_required: true,
    isolated_restore_required: true,
    program_input_retention_mode: "COMPLIANCE",
    program_input_retention_days: 365,
    dms_retention_mode: "COMPLIANCE",
    dms_retention_days: 365,
    dms_policy_id: "lawos-w12-default-365d",
    dms_retain_until: "2033-08-31T23:59:59.000Z",
    postgres_pitr_required: true,
    target_rpo_ms: 300_000,
    target_rto_ms: 3_600_000,
    cleanup_disposition: "retain-expire-only",
    permanent_delete_allowed: false,
  };
  value.contract_sha256 = digest(value, "contract_sha256");
  validateJsonPostgresRehearsalBackupRetentionContract(value);
  return Object.freeze(value);
}

export function validateJsonPostgresRehearsalBackupRetentionContract(
  value = {},
) {
  assertClosed(value, [
    "schema_version", "source_content_mutation_allowed",
    "immutable_off_device_backup_required", "isolated_restore_required",
    "program_input_retention_mode", "program_input_retention_days",
    "dms_retention_mode", "dms_retention_days", "dms_policy_id",
    "dms_retain_until", "postgres_pitr_required", "target_rpo_ms",
    "target_rto_ms", "cleanup_disposition", "permanent_delete_allowed",
    "contract_sha256",
  ], "backup retention contract");
  if (value.schema_version
      !== JSON_POSTGRES_REHEARSAL_BACKUP_RETENTION_CONTRACT_VERSION
    || value.source_content_mutation_allowed !== false
    || value.immutable_off_device_backup_required !== true
    || value.isolated_restore_required !== true
    || value.program_input_retention_mode !== "COMPLIANCE"
    || value.dms_retention_mode !== "COMPLIANCE"
    || value.program_input_retention_days < 365
    || value.dms_retention_days < 365
    || value.dms_policy_id !== "lawos-w12-default-365d"
    || value.dms_retain_until !== "2033-08-31T23:59:59.000Z"
    || value.postgres_pitr_required !== true
    || value.target_rpo_ms !== 300_000
    || value.target_rto_ms !== 3_600_000
    || value.cleanup_disposition !== "retain-expire-only"
    || value.permanent_delete_allowed !== false) {
    fail("backup retention contract values are invalid");
  }
  exactDigest(value, "contract_sha256", "backup retention contract");
  return Object.freeze({ valid: true, contract_sha256: value.contract_sha256 });
}

export function createJsonPostgresRehearsalPerformanceBudget({
  recordCount,
  accountCount,
  tenantCount,
  dmsObjectCount,
} = {}) {
  const value = {
    schema_version: JSON_POSTGRES_REHEARSAL_PERFORMANCE_BUDGET_VERSION,
    record_count: recordCount,
    account_count: accountCount,
    tenant_count: tenantCount,
    dms_object_count: dmsObjectCount,
    batch_size: Math.max(1, recordCount),
    pool_max: 4,
    statement_timeout_ms: 120_000,
    connection_timeout_ms: 10_000,
    migration_p95_limit_ms: 5_000,
    outbox_lag_p95_limit_ms: 2_000,
    target_rpo_ms: 300_000,
    target_rto_ms: 3_600_000,
    measurement_required_in_w12: true,
  };
  value.budget_sha256 = digest(value, "budget_sha256");
  validateJsonPostgresRehearsalPerformanceBudget(value);
  return Object.freeze(value);
}

export function validateJsonPostgresRehearsalPerformanceBudget(value = {}) {
  assertClosed(value, [
    "schema_version", "record_count", "account_count", "tenant_count",
    "dms_object_count", "batch_size", "pool_max", "statement_timeout_ms",
    "connection_timeout_ms", "migration_p95_limit_ms",
    "outbox_lag_p95_limit_ms", "target_rpo_ms", "target_rto_ms",
    "measurement_required_in_w12", "budget_sha256",
  ], "performance budget");
  for (const key of [
    "record_count", "account_count", "tenant_count", "dms_object_count",
  ]) {
    if (!Number.isSafeInteger(value[key]) || value[key] < 0) {
      fail(`performance budget ${key} is invalid`);
    }
  }
  for (const key of [
    "batch_size", "pool_max", "statement_timeout_ms",
    "connection_timeout_ms", "migration_p95_limit_ms",
    "outbox_lag_p95_limit_ms", "target_rpo_ms", "target_rto_ms",
  ]) {
    if (!Number.isSafeInteger(value[key]) || value[key] < 1) {
      fail(`performance budget ${key} is invalid`);
    }
  }
  if (value.schema_version !== JSON_POSTGRES_REHEARSAL_PERFORMANCE_BUDGET_VERSION
    || value.record_count < value.account_count
    || value.tenant_count !== 1
    || value.batch_size > value.record_count
    || value.pool_max > 100
    || value.statement_timeout_ms > 15 * 60 * 1000
    || value.connection_timeout_ms > 60 * 1000
    || value.measurement_required_in_w12 !== true) {
    fail("performance budget values are invalid");
  }
  exactDigest(value, "budget_sha256", "performance budget");
  return Object.freeze({ valid: true, budget_sha256: value.budget_sha256 });
}

export function createJsonPostgresPostWriteRunbookContract() {
  const value = {
    schema_version: JSON_POSTGRES_POST_WRITE_RUNBOOK_CONTRACT_VERSION,
    first_write_boundary_receipt_required: true,
    pre_write_code_config_rollback_allowed: true,
    post_write_json_rollback_allowed: false,
    post_write_dual_write_allowed: false,
    post_write_recovery_modes: ["checkpoint-resume", "forward-repair", "pitr"],
    production_operator_roles: [
      "matter-prod-deploy-admin",
      "matter-cutover-operator",
      "matter-readonly-auditor",
    ],
    immutable_audit_required: true,
    owner_escalation_required_on_stop_condition: true,
  };
  value.contract_sha256 = digest(value, "contract_sha256");
  validateJsonPostgresPostWriteRunbookContract(value);
  return Object.freeze(value);
}

export function validateJsonPostgresPostWriteRunbookContract(value = {}) {
  assertClosed(value, [
    "schema_version", "first_write_boundary_receipt_required",
    "pre_write_code_config_rollback_allowed",
    "post_write_json_rollback_allowed", "post_write_dual_write_allowed",
    "post_write_recovery_modes", "production_operator_roles",
    "immutable_audit_required", "owner_escalation_required_on_stop_condition",
    "contract_sha256",
  ], "post-write runbook contract");
  if (value.schema_version !== JSON_POSTGRES_POST_WRITE_RUNBOOK_CONTRACT_VERSION
    || value.first_write_boundary_receipt_required !== true
    || value.pre_write_code_config_rollback_allowed !== true
    || value.post_write_json_rollback_allowed !== false
    || value.post_write_dual_write_allowed !== false
    || JSON.stringify(value.post_write_recovery_modes)
      !== JSON.stringify(["checkpoint-resume", "forward-repair", "pitr"])
    || JSON.stringify(value.production_operator_roles) !== JSON.stringify([
      "matter-prod-deploy-admin",
      "matter-cutover-operator",
      "matter-readonly-auditor",
    ])
    || value.immutable_audit_required !== true
    || value.owner_escalation_required_on_stop_condition !== true) {
    fail("post-write runbook contract values are invalid");
  }
  assertNoSensitiveKeys(value);
  exactDigest(value, "contract_sha256", "post-write runbook contract");
  return Object.freeze({ valid: true, contract_sha256: value.contract_sha256 });
}
