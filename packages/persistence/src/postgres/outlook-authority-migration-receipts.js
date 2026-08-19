import { hashDomainValue } from "../domain-ledger.js";

const RUN_SCHEMA = "lawos.outlook-authority-migration-run-receipt.v1";
const FAILURE_SCHEMA =
  "lawos.outlook-authority-migration-failure-receipt.v1";
const SHA256 = /^[a-f0-9]{64}$/u;
const COMMIT_UNKNOWN_SAFE_ERROR_CODE = "OUTLOOK_POSTGRES_COMMIT_UNKNOWN";
const RUN_KEYS = Object.freeze([
  "authority_manifest_sha256", "authority_postflight_sha256", "backend_pid",
  "current_user", "database", "database_target_receipt_sha256",
  "migration_applied_count",
  "migration_catalog_sha256", "migration_run_receipt_sha256", "migrations",
  "outcome", "outlook_assignment_transaction_committed",
  "postgres_mutation_attempt_count", "postgres_mutation_committed_count",
  "postflight_role_bootstrap_sha256",
  "role_bootstrap_sha256", "role_configuration_transaction_committed_count",
  "schema_version", "session_user",
]);
const FAILURE_KEYS = Object.freeze([
  "authority_manifest_sha256", "authority_postflight_sha256", "backend_pid",
  "current_user", "database", "database_target_receipt_sha256",
  "failure_phase", "failure_receipt_sha256",
  "failure_safe_error_code", "migration_applied_count",
  "migration_catalog_sha256", "migrations", "outcome",
  "outlook_assignment_transaction_committed",
  "postgres_mutation_attempt_count", "postgres_mutation_committed_count",
  "postflight_role_bootstrap_sha256", "role_bootstrap_sha256",
  "role_configuration_transaction_committed_count", "schema_version",
  "session_user",
]);

function exactRecord(value, keys, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)
      || Object.keys(value).sort().join("\0") !== [...keys].sort().join("\0")) {
    throw new TypeError(`${name} has unexpected fields`);
  }
}

function nonnegative(value) {
  return Number.isSafeInteger(value) && value >= 0;
}

function digestOrNull(value) {
  return value === null || SHA256.test(value);
}

function exactExpected(value, expected = {}, { exactCatalog = false } = {}) {
  const keys = ["authority_manifest_sha256", "database_name",
    "database_target_receipt_sha256",
    "migration_catalog", "migration_catalog_sha256", "role_bootstrap_sha256",
    "session_user"];
  if (!expected || typeof expected !== "object" || Array.isArray(expected)
      || Object.keys(expected).some((key) => !keys.includes(key))) {
    throw new TypeError("Outlook authority receipt expectation is invalid");
  }
  const pairs = [
    ["authority_manifest_sha256", value.authority_manifest_sha256],
    ["database_target_receipt_sha256",
      value.database_target_receipt_sha256],
    ["migration_catalog_sha256", value.migration_catalog_sha256],
    ["role_bootstrap_sha256", value.role_bootstrap_sha256],
    ["database_name", value.database?.name],
    ["session_user", value.session_user],
  ];
  if (pairs.some(([key, actual]) => expected[key] !== undefined
    && expected[key] !== actual)) {
    throw new TypeError("Outlook authority receipt expectation mismatch");
  }
  if (expected.migration_catalog !== undefined) {
    if (!Array.isArray(expected.migration_catalog)
        || (exactCatalog
          ? value.migrations.length !== expected.migration_catalog.length
          : value.migrations.length > expected.migration_catalog.length)
        || value.migrations.some((migration, index) => {
          const catalogRow = expected.migration_catalog[index];
          return migration.id !== catalogRow?.id
            || migration.checksum !== catalogRow?.checksum;
        })) {
      throw new TypeError("Outlook authority receipt catalog mismatch");
    }
  }
}

function normalizeSafeErrorCode(value) {
  return typeof value === "string" && /^[A-Z][A-Z0-9_]{0,127}$/u.test(value)
    ? value
    : "POSTGRES_OPERATION_FAILED";
}

function copyFrozen(value) {
  if (Array.isArray(value)) return Object.freeze(value.map(copyFrozen));
  if (!value || typeof value !== "object") return value;
  return Object.freeze(Object.fromEntries(Object.entries(value).map(
    ([key, child]) => [key, copyFrozen(child)],
  )));
}

function assertMigrationRows(migrations) {
  if (!Array.isArray(migrations)) throw new TypeError("Migration receipt is invalid");
  let previous = "";
  let appliedStarted = false;
  for (const migration of migrations) {
    exactRecord(migration, ["applied", "checksum", "id"], "Migration receipt");
    if (!/^[a-z0-9_]+$/u.test(migration.id) || migration.id <= previous
        || !SHA256.test(migration.checksum)
        || typeof migration.applied !== "boolean") {
      throw new TypeError("Migration receipt is invalid");
    }
    if (appliedStarted && !migration.applied) {
      throw new TypeError("Migration receipt is invalid");
    }
    appliedStarted ||= migration.applied;
    previous = migration.id;
  }
}

export function assertOutlookAuthorityMigrationRunReceipt(value, expected) {
  exactRecord(value, RUN_KEYS, "Outlook authority migration run receipt");
  exactRecord(value.database, ["name", "oid"], "Outlook authority database");
  const { migration_run_receipt_sha256: receiptSha, ...material } = value;
  const committed = value.outcome === "committed";
  const verified = value.outcome === "verified";
  if (value.schema_version !== RUN_SCHEMA || (!committed && !verified)
      || !SHA256.test(receiptSha) || hashDomainValue(material) !== receiptSha
      || value.session_user !== value.current_user
      || !value.session_user || !value.database.name
      || !/^[1-9][0-9]*$/u.test(value.database.oid)
      || !Number.isSafeInteger(value.backend_pid) || value.backend_pid < 1
      || !Array.isArray(value.migrations) || value.migrations.length === 0
      || !nonnegative(value.migration_applied_count)
      || value.migration_applied_count !==
        value.migrations.filter(({ applied }) => applied === true).length
      || (committed && (
        value.role_configuration_transaction_committed_count !== 1
        || value.postgres_mutation_attempt_count !==
          value.migration_applied_count + 1
        || value.postgres_mutation_committed_count !==
          value.postgres_mutation_attempt_count
        || value.outlook_assignment_transaction_committed !== true))
      || (verified && (
        value.migration_applied_count !== 0
        || value.role_configuration_transaction_committed_count !== 0
        || value.postgres_mutation_attempt_count !== 0
        || value.postgres_mutation_committed_count !== 0
        || value.outlook_assignment_transaction_committed !== false
        || value.migrations.some(({ applied }) => applied)))
      || ![value.role_bootstrap_sha256,
        value.postflight_role_bootstrap_sha256,
        value.authority_manifest_sha256,
        value.database_target_receipt_sha256,
        value.migration_catalog_sha256,
        value.authority_postflight_sha256].every((digest) => SHA256.test(digest))
      || value.role_bootstrap_sha256 !== value.postflight_role_bootstrap_sha256) {
    throw new TypeError("Outlook authority migration run receipt is invalid");
  }
  assertMigrationRows(value.migrations);
  exactExpected(value, expected, { exactCatalog: true });
  return copyFrozen(value);
}

export function assertOutlookAuthorityMigrationFailureReceipt(value, expected) {
  exactRecord(value, FAILURE_KEYS, "Outlook authority migration failure receipt");
  const { failure_receipt_sha256: receiptSha, ...material } = value;
  const identityAbsent = value.session_user === null
    && value.current_user === null && value.database === null
    && value.backend_pid === null;
  const identityPresent = typeof value.session_user === "string"
    && value.session_user.length > 0 && value.session_user === value.current_user
    && Number.isSafeInteger(value.backend_pid) && value.backend_pid > 0
    && value.database && typeof value.database === "object"
    && Object.keys(value.database).sort().join("\0") === "name\0oid"
    && /^[1-9][0-9]*$/u.test(value.database.oid)
    && typeof value.database.name === "string" && value.database.name.length > 0;
  const databaseValid = value.database === null || (
    value.database && Object.keys(value.database).sort().join("\0") === "name\0oid"
      && /^[1-9][0-9]*$/u.test(value.database.oid) && value.database.name
  );
  const commitUnknown = value.failure_safe_error_code ===
    COMMIT_UNKNOWN_SAFE_ERROR_CODE;
  const committedCountValid = commitUnknown
    ? value.postgres_mutation_committed_count === null
    : nonnegative(value.postgres_mutation_committed_count)
      && value.postgres_mutation_committed_count <=
        value.postgres_mutation_attempt_count
      && value.postgres_mutation_committed_count ===
        value.migration_applied_count
          + value.role_configuration_transaction_committed_count;
  const roleCountValid = commitUnknown
    ? [0, 1, null].includes(
      value.role_configuration_transaction_committed_count,
    )
    : [0, 1].includes(value.role_configuration_transaction_committed_count);
  const assignmentCommitValid = commitUnknown
    ? [false, null].includes(value.outlook_assignment_transaction_committed)
    : value.outlook_assignment_transaction_committed === false;
  const unknownAffectsCommit = commitUnknown
    && (value.postgres_mutation_committed_count === null)
    && (value.role_configuration_transaction_committed_count === null
      || value.outlook_assignment_transaction_committed === null
      || value.postgres_mutation_attempt_count >
        value.migration_applied_count
          + value.role_configuration_transaction_committed_count);
  const roleConfigurationCommitUnknown = commitUnknown
    && value.failure_phase === "outlook_authority_paused"
    && value.role_configuration_transaction_committed_count === null;
  if (value.schema_version !== FAILURE_SCHEMA
      || !["failed", "partial"].includes(value.outcome)
      || !value.failure_phase
      || normalizeSafeErrorCode(value.failure_safe_error_code) !==
        value.failure_safe_error_code
      || !SHA256.test(receiptSha) || hashDomainValue(material) !== receiptSha
      || !databaseValid || (!identityAbsent && !identityPresent)
      || !nonnegative(value.migration_applied_count)
      || !Array.isArray(value.migrations)
      || value.migration_applied_count !==
        value.migrations.filter(({ applied }) => applied === true).length
      || !roleCountValid
      || !nonnegative(value.postgres_mutation_attempt_count)
      || !committedCountValid
      || (commitUnknown !== unknownAffectsCommit)
      || ![value.role_bootstrap_sha256,
        value.postflight_role_bootstrap_sha256,
        value.authority_manifest_sha256,
        value.database_target_receipt_sha256,
        value.migration_catalog_sha256,
        value.authority_postflight_sha256].every(digestOrNull)
      || (roleConfigurationCommitUnknown && (
        !SHA256.test(value.role_bootstrap_sha256)
        || !SHA256.test(value.authority_manifest_sha256)
        || !SHA256.test(value.database_target_receipt_sha256)
        || !SHA256.test(value.migration_catalog_sha256)
        || value.postflight_role_bootstrap_sha256 !== null
        || value.authority_postflight_sha256 !== null
        || value.outlook_assignment_transaction_committed !== false))
      || !assignmentCommitValid) {
    throw new TypeError("Outlook authority migration failure receipt is invalid");
  }
  assertMigrationRows(value.migrations);
  exactExpected(value, expected);
  return copyFrozen(value);
}

export function createOutlookAuthorityMigrationRunReceipt({
  identity, migrations, progress, pauseExpectation, postflight,
}) {
  const material = {
    schema_version: RUN_SCHEMA,
    outcome: progress.outlook_authority_replay_verified
      ? "verified" : "committed",
    session_user: identity.session_user, current_user: identity.current_user,
    database: { oid: String(identity.database_oid), name: identity.database_name },
    backend_pid: identity.backend_pid,
    migrations: migrations.map(({ id, checksum, applied }) => ({ id, checksum, applied })),
    migration_applied_count: progress.migration_applied_count,
    role_configuration_transaction_committed_count:
      progress.role_configuration_transaction_committed_count,
    postgres_mutation_attempt_count: progress.postgres_transaction_attempted_count
      + progress.role_configuration_transaction_attempted_count,
    postgres_mutation_committed_count: progress.postgres_transaction_committed_count
      + progress.role_configuration_transaction_committed_count,
    role_bootstrap_sha256: pauseExpectation.role_bootstrap_sha256,
    postflight_role_bootstrap_sha256: postflight.role_bootstrap_sha256,
    authority_manifest_sha256: pauseExpectation.authority_manifest_sha256,
    database_target_receipt_sha256:
      pauseExpectation.database_target_receipt_sha256,
    migration_catalog_sha256: pauseExpectation.migration_catalog_sha256,
    authority_postflight_sha256: postflight.authority_postflight_sha256,
    outlook_assignment_transaction_committed:
      progress.outlook_assignment_transaction_committed,
  };
  return assertOutlookAuthorityMigrationRunReceipt({
    ...material,
    migration_run_receipt_sha256: hashDomainValue(material),
  });
}

export function createOutlookAuthorityMigrationFailureSummary({
  identity, migrations, progress, pauseExpectation, postflight,
  authorityManifestSha256, databaseTargetReceiptSha256,
  migrationCatalogSha256, safeErrorCode,
}) {
  const commitUnknown = safeErrorCode === COMMIT_UNKNOWN_SAFE_ERROR_CODE;
  const committedCount = progress.postgres_transaction_committed_count === null
      || progress.role_configuration_transaction_committed_count === null
    ? null
    : progress.postgres_transaction_committed_count
      + progress.role_configuration_transaction_committed_count;
  const material = {
    schema_version: FAILURE_SCHEMA,
    outcome: commitUnknown || progress.migration_applied_count > 0
      || progress.role_configuration_transaction_committed_count > 0
      ? "partial" : "failed",
    failure_phase: progress.migration_phase,
    failure_safe_error_code: normalizeSafeErrorCode(safeErrorCode),
    session_user: identity?.session_user ?? null,
    current_user: identity?.current_user ?? null,
    database: identity ? {
      oid: String(identity.database_oid), name: identity.database_name,
    } : null,
    backend_pid: identity?.backend_pid ?? null,
    migrations: migrations.map(({ id, checksum, applied }) => ({
      id, checksum, applied,
    })),
    migration_applied_count: progress.migration_applied_count,
    role_configuration_transaction_committed_count:
      progress.role_configuration_transaction_committed_count,
    postgres_mutation_attempt_count: progress.postgres_transaction_attempted_count
      + progress.role_configuration_transaction_attempted_count,
    postgres_mutation_committed_count: committedCount,
    role_bootstrap_sha256: pauseExpectation?.role_bootstrap_sha256 ?? null,
    postflight_role_bootstrap_sha256: postflight?.role_bootstrap_sha256 ?? null,
    authority_manifest_sha256:
      authorityManifestSha256
        ?? pauseExpectation?.authority_manifest_sha256 ?? null,
    database_target_receipt_sha256:
      databaseTargetReceiptSha256
        ?? pauseExpectation?.database_target_receipt_sha256 ?? null,
    migration_catalog_sha256:
      migrationCatalogSha256
        ?? pauseExpectation?.migration_catalog_sha256 ?? null,
    authority_postflight_sha256: postflight?.authority_postflight_sha256 ?? null,
    outlook_assignment_transaction_committed:
      progress.outlook_assignment_transaction_committed,
  };
  return assertOutlookAuthorityMigrationFailureReceipt({
    ...material, failure_receipt_sha256: hashDomainValue(material),
  });
}
