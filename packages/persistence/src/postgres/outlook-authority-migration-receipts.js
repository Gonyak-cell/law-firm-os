import { hashDomainValue } from "../domain-ledger.js";
import { normalizeOutlookAuthorityMigrationPauseExpectation } from "./outlook-authority-migration-seam.js";

const RUN_SCHEMA = "lawos.outlook-authority-migration-run-receipt.v1";
const HISTORICAL_RUN_SCHEMA = "lawos.outlook-authority-migration-run-receipt.v2";
const CURRENT_TARGET_RUN_SCHEMA = "lawos.outlook-authority-migration-run-receipt.v3";
const INTERNAL_INSTALLATION_HISTORICAL_CATALOG_SHA256 =
  "43c6a087834d9dd2177be0b63fc94cf723181b93b04f40a65689b6431bd44556";
const INTERNAL_INSTALLATION_CATALOG_SHA256 =
  "2ef366427d98ed297ab376c8fc7e6a255cf6a054d0eaa660dc6fb7e13c814f79";
const CORPORATE_WORKSPACE_CATALOG_SHA256 =
  "8de3211a545ebb7c50813990d15f6abc215ffd23a7d09ba2149d9b37fd96e8c7";
const CORPORATE_WORKSPACE_MIGRATION_ID = "016_dms_corporate_workspace";
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
    "historical_outlook_bootstrap_sha256",
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
    ["historical_outlook_bootstrap_sha256", value.historical_outlook_bootstrap_sha256],
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

function reviewedAppendMigrationId(value) {
  const corporate = value.migrations?.length === 81;
  if ((!corporate && value.migrations?.length !== 80)
      || value.migration_catalog_sha256 !== (corporate
        ? CORPORATE_WORKSPACE_CATALOG_SHA256
        : INTERNAL_INSTALLATION_CATALOG_SHA256)
      || hashDomainValue(value.migrations.map(({ id, checksum }) => ({ id, checksum })))
        !== (corporate
          ? "29530ec602b720deeb1e26625c85a3dcc1268e2bfc116b6b86bfada761cb38a7"
          : "4d2b71686f05f483fee882b742e363ee4ce24e95879dce267a81083adc47287f")) {
    return null;
  }
  return corporate ? CORPORATE_WORKSPACE_MIGRATION_ID
    : "309_client_internal_unsigned_installation_authority";
}

function isCorporateWorkspaceGap(value) {
  return reviewedAppendMigrationId(value) === CORPORATE_WORKSPACE_MIGRATION_ID
    && value.migrations.every(({ id, applied }) =>
      applied === (id === CORPORATE_WORKSPACE_MIGRATION_ID));
}

function isCorporateWorkspaceFailureBoundary(value) {
  if (!Array.isArray(value.migrations)) return false;
  if (value.migration_catalog_sha256 !== CORPORATE_WORKSPACE_CATALOG_SHA256) {
    return value.migrations.length !== 81;
  }
  if (value.role_configuration_transaction_committed_count !== 0
      || value.outlook_assignment_transaction_committed !== false) return false;
  if (value.migrations.length === 0) {
    return value.migration_applied_count === 0
      && value.postgres_mutation_attempt_count === 0
      && value.postgres_mutation_committed_count === 0;
  }
  if (value.migrations.length === 15) {
    return value.failure_phase === "migration"
      && value.migration_applied_count === 0
      && value.postgres_mutation_attempt_count === 1
      && [0, null].includes(value.postgres_mutation_committed_count)
      && value.migrations.every(({ applied }) => applied === false)
      && hashDomainValue(value.migrations.map(({ id, checksum }) => ({ id, checksum })))
        === "3e84240e675e9b8231ef1fa3a33897b3791859a8e723a001bb8c59ae8909a4fe";
  }
  return reviewedAppendMigrationId(value) === CORPORATE_WORKSPACE_MIGRATION_ID
    && value.failure_phase === "internal_installation_postflight"
    && value.postgres_mutation_attempt_count === value.migration_applied_count
    && value.postgres_mutation_committed_count === value.migration_applied_count
    && ((value.migration_applied_count === 0
      && value.migrations.every(({ applied }) => applied === false))
      || (value.migration_applied_count === 1 && isCorporateWorkspaceGap(value)));
}

function assertMigrationRows(migrations, { corporateWorkspaceGap = false } = {}) {
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
    if (appliedStarted && !migration.applied && !corporateWorkspaceGap) {
      throw new TypeError("Migration receipt is invalid");
    }
    appliedStarted ||= migration.applied;
    previous = migration.id;
  }
}

export function assertOutlookAuthorityMigrationRunReceipt(value, expected) {
  const currentTarget = value?.schema_version === CURRENT_TARGET_RUN_SCHEMA;
  const historical = currentTarget || value?.schema_version === HISTORICAL_RUN_SCHEMA;
  exactRecord(value, [...RUN_KEYS,
    ...(historical ? ["historical_migration_catalog_sha256"] : []),
    ...(currentTarget ? ["historical_outlook_bootstrap_receipt", "historical_outlook_bootstrap_sha256"] : [])],
  "Outlook authority migration run receipt");
  if (currentTarget) {
    const bootstrap = normalizeOutlookAuthorityMigrationPauseExpectation(value.historical_outlook_bootstrap_receipt);
    if (hashDomainValue(bootstrap) !== value.historical_outlook_bootstrap_sha256
        || bootstrap.role_bootstrap_sha256 !== value.role_bootstrap_sha256
        || bootstrap.authority_manifest_sha256 !== value.authority_manifest_sha256
        || bootstrap.migration_catalog_sha256 !== value.historical_migration_catalog_sha256) {
      throw new TypeError("Outlook authority historical bootstrap receipt is unbound");
    }
  }
  exactRecord(value.database, ["name", "oid"], "Outlook authority database");
  const { migration_run_receipt_sha256: receiptSha, ...material } = value;
  const committed = value.outcome === "committed";
  const verified = value.outcome === "verified";
  const appended = value.outcome === "appended";
  const reviewedAppendId = reviewedAppendMigrationId(value);
  if ((!historical && value.schema_version !== RUN_SCHEMA)
      || (!committed && !verified && !appended)
      || (historical && (committed
        || (!currentTarget && value.historical_migration_catalog_sha256 !==
          INTERNAL_INSTALLATION_HISTORICAL_CATALOG_SHA256)
        || value.migration_catalog_sha256 ===
          value.historical_migration_catalog_sha256))
      || !SHA256.test(receiptSha) || hashDomainValue(material) !== receiptSha
      || value.session_user !== value.current_user
      || !value.session_user || !value.database.name
      || !/^[1-9][0-9]*$/u.test(value.database.oid)
      || !Number.isSafeInteger(value.backend_pid) || value.backend_pid < 1
      || !Array.isArray(value.migrations) || value.migrations.length === 0
      || !nonnegative(value.migration_applied_count)
      || value.migration_applied_count !==
        value.migrations.filter(({ applied }) => applied === true).length
      || ((historical || appended || [80, 81].includes(value.migrations.length))
        && reviewedAppendId === null)
      || (committed && (
        reviewedAppendId === CORPORATE_WORKSPACE_MIGRATION_ID
        || value.role_configuration_transaction_committed_count !== 1
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
      || (appended && (
        value.migrations.some(({ id, applied }) => applied !== (id === reviewedAppendId))
        || value.migration_applied_count !== 1
        || value.role_configuration_transaction_committed_count !== 0
        || value.postgres_mutation_attempt_count !== 1
        || value.postgres_mutation_committed_count !== 1
        || value.outlook_assignment_transaction_committed !== false))
      || ![value.role_bootstrap_sha256,
        value.postflight_role_bootstrap_sha256,
        value.authority_manifest_sha256,
        value.database_target_receipt_sha256,
        value.migration_catalog_sha256,
        value.authority_postflight_sha256].every((digest) => SHA256.test(digest))
      || value.role_bootstrap_sha256 !== value.postflight_role_bootstrap_sha256) {
    throw new TypeError("Outlook authority migration run receipt is invalid");
  }
  assertMigrationRows(value.migrations, {
    corporateWorkspaceGap: appended && isCorporateWorkspaceGap(value),
  });
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
  const assignmentPreviouslyCommitted =
    value.outlook_assignment_transaction_committed === true
    && ["migration", "internal_installation_postflight"].includes(value.failure_phase)
    && value.role_configuration_transaction_committed_count === 1
    && value.migrations?.some(({ id, applied }) => applied
      && id === "306_client_outlook_desktop_assignment");
  const assignmentCommitValid = assignmentPreviouslyCommitted || (commitUnknown
    ? [false, null].includes(value.outlook_assignment_transaction_committed)
    : value.outlook_assignment_transaction_committed === false);
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
  const corporateWorkspaceFailureBoundary = isCorporateWorkspaceFailureBoundary(value);
  if (value.schema_version !== FAILURE_SCHEMA
      || !["failed", "partial"].includes(value.outcome)
      || !value.failure_phase
      || normalizeSafeErrorCode(value.failure_safe_error_code) !==
        value.failure_safe_error_code
      || !SHA256.test(receiptSha) || hashDomainValue(material) !== receiptSha
      || !databaseValid || (!identityAbsent && !identityPresent)
      || !nonnegative(value.migration_applied_count)
      || !Array.isArray(value.migrations)
      || !corporateWorkspaceFailureBoundary
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
  assertMigrationRows(value.migrations, {
    corporateWorkspaceGap: corporateWorkspaceFailureBoundary && isCorporateWorkspaceGap(value),
  });
  exactExpected(value, expected);
  return copyFrozen(value);
}

export function createOutlookAuthorityMigrationRunReceipt({
  identity, migrations, progress, pauseExpectation, postflight,
  migrationCatalogSha256 = pauseExpectation.migration_catalog_sha256,
  databaseTargetReceiptSha256 = pauseExpectation.database_target_receipt_sha256,
  historicalOutlookBootstrapSha256,
}) {
  const historical = migrationCatalogSha256 !==
    pauseExpectation.migration_catalog_sha256;
  const currentTarget = historicalOutlookBootstrapSha256 !== undefined;
  if ((currentTarget && (!historical
        || hashDomainValue(normalizeOutlookAuthorityMigrationPauseExpectation(pauseExpectation))
          !== historicalOutlookBootstrapSha256))
      || (!currentTarget && databaseTargetReceiptSha256 !== pauseExpectation.database_target_receipt_sha256)) {
    throw new TypeError("Outlook authority current target requires the signed historical bootstrap receipt");
  }
  const material = {
    schema_version: currentTarget ? CURRENT_TARGET_RUN_SCHEMA : historical ? HISTORICAL_RUN_SCHEMA : RUN_SCHEMA,
    outcome: progress.outlook_authority_replay_verified
      ? progress.migration_applied_count === 0 ? "verified" : "appended"
      : "committed",
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
    database_target_receipt_sha256: databaseTargetReceiptSha256,
    migration_catalog_sha256: migrationCatalogSha256,
    ...(historical ? { historical_migration_catalog_sha256:
      pauseExpectation.migration_catalog_sha256 } : {}),
    ...(currentTarget ? {
      historical_outlook_bootstrap_receipt: pauseExpectation,
      historical_outlook_bootstrap_sha256: historicalOutlookBootstrapSha256,
    } : {}),
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
