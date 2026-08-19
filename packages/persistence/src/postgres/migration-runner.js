import { checksumPostgresMigration, listPostgresFoundationMigrations } from "./migration-catalog.js";
import { sanitizePostgresError } from "./errors.js";
import {
  closeOutlookAuthorityMigrationCatalog,
  installOutlookAuthorityExpectation,
  isOutlookAuthorityMigration,
  normalizeOutlookAuthorityMigrationPauseExpectation,
  normalizeOutlookAuthorityPostflight,
} from "./outlook-authority-migration-seam.js";
import {
  createOutlookAuthorityMigrationFailureSummary,
  createOutlookAuthorityMigrationRunReceipt,
} from "./outlook-authority-migration-receipts.js";

export {
  assertOutlookAuthorityMigrationFailureReceipt,
  assertOutlookAuthorityMigrationRunReceipt,
  createOutlookAuthorityMigrationFailureSummary,
  createOutlookAuthorityMigrationRunReceipt,
} from "./outlook-authority-migration-receipts.js";
export {
  normalizeOutlookAuthorityMigrationPauseExpectation,
} from "./outlook-authority-migration-seam.js";

const MIGRATION_LOCK_KEY = 7_260_071_601;
const COMMIT_UNKNOWN_ERRORS = new WeakSet();
const ROLE_CONFIGURATION_COMMIT_UNKNOWN_EXPECTATIONS = new WeakMap();

export function createOutlookPostgresCommitUnknownError() {
  const error = Object.assign(new Error("PostgreSQL COMMIT outcome is unknown"), {
    code: "LAWOS_OUTLOOK_POSTGRES_COMMIT_UNKNOWN",
    safe_error_code: "OUTLOOK_POSTGRES_COMMIT_UNKNOWN",
    status: 503,
  });
  COMMIT_UNKNOWN_ERRORS.add(error);
  return error;
}

export function createOutlookPostgresRoleConfigurationCommitUnknownError(
  pauseExpectation,
) {
  const expectation = normalizeOutlookAuthorityMigrationPauseExpectation(
    pauseExpectation,
  );
  const error = createOutlookPostgresCommitUnknownError();
  ROLE_CONFIGURATION_COMMIT_UNKNOWN_EXPECTATIONS.set(error, expectation);
  return error;
}

export function assertOutlookPostgresRoleConfigurationCommitUnknownError(
  error,
) {
  const expectation = ROLE_CONFIGURATION_COMMIT_UNKNOWN_EXPECTATIONS.get(error);
  if (!expectation) {
    throw new TypeError(
      "Outlook role configuration COMMIT unknown error is required",
    );
  }
  return expectation;
}

function isOutlookPostgresCommitUnknownError(error) {
  return COMMIT_UNKNOWN_ERRORS.has(error);
}

function migrationHistoryError(message, details = {}) {
  return Object.assign(new Error(message), {
    code: "LAWOS_POSTGRES_MIGRATION_HISTORY_DIVERGED",
    safe_error_code: "POSTGRES_MIGRATION_HISTORY_DIVERGED",
    status: 500,
    ...details,
  });
}

function normalizeMigration(migration) {
  const id = String(migration?.id ?? "").trim();
  const sql = String(migration?.sql ?? "");
  if (!/^[a-z0-9_]+$/u.test(id)) throw new TypeError("PostgreSQL migration id must use lowercase letters, numbers and underscores");
  if (!sql.trim()) throw new TypeError(`PostgreSQL migration SQL is required: ${id}`);
  return Object.freeze({ ...migration, id, sql, checksum: checksumPostgresMigration(sql) });
}

async function readMigrationIdentity(client) {
  return (await client.query(
    `SELECT session_user,current_user,current_database() AS database_name,
            (SELECT oid::text FROM pg_database
              WHERE datname=current_database()) AS database_oid,
            pg_backend_pid() AS backend_pid`,
  )).rows[0];
}

export async function runPostgresMigrations(pool, {
  migrations = listPostgresFoundationMigrations(),
  appliedBy = "law-firm-os",
  allowedHistoricalGapIds = [],
  authorityManifestSha256,
  databaseTargetReceiptSha256,
  migrationCatalogSha256,
  onBeforeMigrations,
  onOutlookAuthorityPaused,
  onOutlookAuthorityPostMigration,
} = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  const ordered = migrations.map(normalizeMigration);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index - 1].id >= ordered[index].id) throw new Error("PostgreSQL migrations must be strictly forward ordered");
  }
  if (!Array.isArray(allowedHistoricalGapIds)) throw new TypeError("PostgreSQL historical migration gap ids must be an array");
  const callbacks = [onBeforeMigrations, onOutlookAuthorityPaused,
    onOutlookAuthorityPostMigration];
  const authorityCallbacksEnabled = callbacks.some((callback) => callback !== undefined);
  if (authorityCallbacksEnabled && callbacks.some((callback) => typeof callback !== "function")) {
    throw new TypeError("Outlook authority migration callbacks must be provided together");
  }
  if (authorityCallbacksEnabled
      && ordered.filter(isOutlookAuthorityMigration).length !== 1) {
    throw new TypeError("Outlook authority migration callback target must be unique");
  }
  const signedDigests = [
    ["authority manifest", authorityManifestSha256],
    ["database target receipt", databaseTargetReceiptSha256],
    ["migration catalog", migrationCatalogSha256],
  ];
  if (signedDigests.some(([, digest]) => digest !== undefined
      && !/^[a-f0-9]{64}$/u.test(digest))) {
    throw new TypeError("Outlook authority signed digest is invalid");
  }
  if (authorityCallbacksEnabled
      && signedDigests.some(([, digest]) => digest === undefined)) {
    throw new TypeError("Outlook authority signed digests are required");
  }
  const callbackCatalog = closeOutlookAuthorityMigrationCatalog(ordered);
  const catalogIds = new Set(ordered.map(({ id }) => id));
  const historicalGapIds = new Set();
  for (const value of allowedHistoricalGapIds) {
    if (typeof value !== "string" || !catalogIds.has(value) || historicalGapIds.has(value)) {
      throw new TypeError("PostgreSQL historical migration gap ids must be unique source catalog ids");
    }
    historicalGapIds.add(value);
  }
  let client;
  let lockHeld = false;
  let databaseIdentity;
  let beforeMigrationsResult;
  let authorityPauseExpectation;
  let authorityPostflight;
  const progress = {
    migration_phase: "preflight",
    migration_applied_count: 0,
    postgres_transaction_attempted_count: 0,
    postgres_transaction_committed_count: 0,
    role_configuration_transaction_attempted_count: 0,
    role_configuration_transaction_committed_count: 0,
    outlook_assignment_transaction_committed: false,
    outlook_authority_replay_verified: false,
  };
  const results = [];
  try {
    client = await pool.connect();
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    lockHeld = true;
    if (authorityCallbacksEnabled) {
      databaseIdentity = await readMigrationIdentity(client);
      progress.migration_phase = "before_migrations";
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY");
      try {
        beforeMigrationsResult = await onBeforeMigrations(
          client,
          callbackCatalog,
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      }
    }
    if (authorityCallbacksEnabled) {
      const ledger = (await client.query(
        `SELECT to_regnamespace('lawos_meta') IS NOT NULL
                  AS meta_schema_present,
                to_regclass('lawos_meta.schema_migrations') IS NOT NULL
                  AS migration_ledger_present`,
      )).rows[0];
      if (ledger?.meta_schema_present !== true
          || ledger.migration_ledger_present !== true) {
        throw migrationHistoryError(
          "Outlook authority migration requires a pre-existing migration ledger",
        );
      }
    } else {
      await client.query("CREATE SCHEMA IF NOT EXISTS lawos_meta");
      await client.query(`
        CREATE TABLE IF NOT EXISTS lawos_meta.schema_migrations (
          migration_id text PRIMARY KEY,
          checksum text NOT NULL,
          applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
          applied_by text NOT NULL
        )
      `);
    }
    const historyResult = await client.query(
      "SELECT migration_id, checksum, applied_at, applied_by FROM lawos_meta.schema_migrations ORDER BY migration_id",
    );
    const appliedIds = new Set(historyResult.rows.map(({ migration_id: id }) => id));
    const expectedHistoryCatalog = historicalGapIds.size === 0
      ? ordered
      : ordered.filter(({ id }) => !historicalGapIds.has(id) || appliedIds.has(id));
    for (let index = 0; index < historyResult.rows.length; index += 1) {
      const applied = historyResult.rows[index];
      const expected = expectedHistoryCatalog[index];
      if (!expected || applied.migration_id !== expected.id) {
        throw migrationHistoryError("PostgreSQL migration history is not a prefix of the source catalog", {
          migration_id: applied.migration_id,
          expected_migration_id: expected?.id ?? null,
        });
      }
      if (applied.checksum !== expected.checksum) {
        throw Object.assign(new Error("PostgreSQL migration checksum mismatch"), {
          code: "LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH",
          safe_error_code: "POSTGRES_MIGRATION_CHECKSUM_MISMATCH",
          status: 500,
          migration_id: expected.id,
        });
      }
    }
    const history = new Map(historyResult.rows.map((row) => [row.migration_id, row]));
    const authorityMigration = authorityCallbacksEnabled
      ? ordered.find(isOutlookAuthorityMigration)
      : null;
    const authorityAlreadyApplied = authorityMigration
      ? history.has(authorityMigration.id)
      : false;
    if (authorityAlreadyApplied) {
      if (history.size !== ordered.length || beforeMigrationsResult === undefined) {
        throw migrationHistoryError(
          "Outlook authority replay requires the exact completed catalog",
        );
      }
      authorityPauseExpectation =
        normalizeOutlookAuthorityMigrationPauseExpectation(
          beforeMigrationsResult,
        );
      if (authorityPauseExpectation.authority_manifest_sha256 !==
            authorityManifestSha256
          || authorityPauseExpectation.database_target_receipt_sha256 !==
            databaseTargetReceiptSha256
          || authorityPauseExpectation.migration_catalog_sha256 !==
            migrationCatalogSha256) {
        throw new TypeError("Outlook authority signed digest mismatch");
      }
      progress.migration_phase = "outlook_authority_replay";
      await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE READ ONLY");
      try {
        authorityPostflight = normalizeOutlookAuthorityPostflight(
          await onOutlookAuthorityPostMigration(client, callbackCatalog),
        );
        const postIdentity = await readMigrationIdentity(client);
        if (JSON.stringify(postIdentity) !== JSON.stringify(databaseIdentity)
            || authorityPostflight.role_bootstrap_sha256 !==
              authorityPauseExpectation.role_bootstrap_sha256) {
          throw new TypeError("Outlook authority replay postflight mismatch");
        }
        await client.query("COMMIT");
        progress.outlook_authority_replay_verified = true;
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      }
    } else if (beforeMigrationsResult !== undefined) {
      throw new TypeError(
        "Outlook authority pending migration preflight must not return a replay receipt",
      );
    }
    for (const migration of ordered) {
      const applied = history.get(migration.id);
      if (applied) {
        results.push(Object.freeze({ id: migration.id, checksum: migration.checksum, applied: false }));
        continue;
      }
      let pauseExpectation;
      const outlookAuthorityMigration = authorityCallbacksEnabled
        && isOutlookAuthorityMigration(migration);
      if (outlookAuthorityMigration) {
        progress.migration_phase = "outlook_authority_paused";
        progress.role_configuration_transaction_attempted_count = 1;
        let rawPauseExpectation;
        try {
          rawPauseExpectation = await onOutlookAuthorityPaused(
            client,
            callbackCatalog,
          );
        } catch (error) {
          if (isOutlookPostgresCommitUnknownError(error)) {
            progress.role_configuration_transaction_committed_count = null;
            authorityPauseExpectation =
              assertOutlookPostgresRoleConfigurationCommitUnknownError(error);
          }
          throw error;
        }
        progress.role_configuration_transaction_committed_count = 1;
        pauseExpectation = normalizeOutlookAuthorityMigrationPauseExpectation(
          rawPauseExpectation,
        );
        authorityPauseExpectation = pauseExpectation;
        if (pauseExpectation.authority_manifest_sha256 !==
              authorityManifestSha256
            || pauseExpectation.database_target_receipt_sha256 !==
              databaseTargetReceiptSha256
            || pauseExpectation.migration_catalog_sha256 !==
              migrationCatalogSha256) {
          throw new TypeError("Outlook authority signed digest mismatch");
        }
      }
      progress.migration_phase = outlookAuthorityMigration
        ? "outlook_authority_migration"
        : "migration";
      progress.postgres_transaction_attempted_count += 1;
      await client.query(outlookAuthorityMigration
        ? "BEGIN ISOLATION LEVEL SERIALIZABLE"
        : "BEGIN");
      try {
        if (pauseExpectation) {
          await installOutlookAuthorityExpectation(client, pauseExpectation);
        }
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO lawos_meta.schema_migrations (migration_id, checksum, applied_by) VALUES ($1, $2, $3)",
          [migration.id, migration.checksum, String(appliedBy).slice(0, 128)],
        );
        const postflight = outlookAuthorityMigration
          ? normalizeOutlookAuthorityPostflight(
            await onOutlookAuthorityPostMigration(client, callbackCatalog),
          )
          : null;
        if (postflight) {
          const postIdentity = await readMigrationIdentity(client);
          if (JSON.stringify(postIdentity) !== JSON.stringify(databaseIdentity)) {
            throw new TypeError("Outlook authority migration identity changed");
          }
        }
        if (postflight && postflight.role_bootstrap_sha256
            !== pauseExpectation.role_bootstrap_sha256) {
          throw new TypeError("Outlook authority postflight role receipt mismatch");
        }
        authorityPostflight = postflight ?? authorityPostflight;
        try {
          await client.query("COMMIT");
        } catch {
          progress.postgres_transaction_committed_count = null;
          if (outlookAuthorityMigration) {
            progress.outlook_assignment_transaction_committed = null;
          }
          throw createOutlookPostgresCommitUnknownError();
        }
        progress.postgres_transaction_committed_count += 1;
        progress.migration_applied_count += 1;
        if (outlookAuthorityMigration) {
          progress.outlook_assignment_transaction_committed = true;
        }
        results.push(Object.freeze({
          id: migration.id,
          checksum: migration.checksum,
          applied: true,
        }));
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      }
    }
    progress.migration_phase = "complete";
    return authorityCallbacksEnabled
      ? createOutlookAuthorityMigrationRunReceipt({
        identity: databaseIdentity,
        catalog: callbackCatalog,
        migrations: results,
        progress,
        pauseExpectation: authorityPauseExpectation,
        postflight: authorityPostflight,
      })
      : Object.freeze(results);
  } catch (error) {
    const sanitized = sanitizePostgresError(error);
    if (authorityCallbacksEnabled) {
      const failure = createOutlookAuthorityMigrationFailureSummary({
        identity: databaseIdentity,
        migrations: results,
        progress,
        pauseExpectation: authorityPauseExpectation,
        postflight: authorityPostflight,
        authorityManifestSha256,
        databaseTargetReceiptSha256,
        migrationCatalogSha256,
        safeErrorCode: sanitized.safe_error_code,
      });
      Object.assign(sanitized, progress, {
        outlook_authority_failure: failure,
        database_identity: databaseIdentity ?? null,
        role_bootstrap_sha256: failure.role_bootstrap_sha256,
        authority_postflight_sha256: failure.authority_postflight_sha256,
      });
    }
    throw sanitized;
  } finally {
    if (lockHeld) await client?.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]).catch(() => {});
    client?.release();
  }
}

export async function verifyPostgresMigrationState(pool, {
  migrations = listPostgresFoundationMigrations(),
} = {}) {
  if (!pool || typeof pool.query !== "function") throw new TypeError("PostgreSQL pool is required");
  const ordered = migrations.map(normalizeMigration);
  let result;
  try {
    result = await pool.query(
      "SELECT migration_id, checksum FROM lawos_meta.schema_migrations ORDER BY migration_id",
    );
  } catch (error) {
    throw sanitizePostgresError(error);
  }
  if (result.rows.length !== ordered.length) {
    throw migrationHistoryError("PostgreSQL migration history is not at the exact source catalog", {
      applied_count: result.rows.length,
      expected_count: ordered.length,
    });
  }
  for (let index = 0; index < ordered.length; index += 1) {
    const applied = result.rows[index];
    const expected = ordered[index];
    if (applied.migration_id !== expected.id) {
      throw migrationHistoryError("PostgreSQL migration history differs from the source catalog", {
        migration_id: applied.migration_id,
        expected_migration_id: expected.id,
      });
    }
    if (applied.checksum !== expected.checksum) {
      throw Object.assign(new Error("PostgreSQL migration checksum mismatch"), {
        code: "LAWOS_POSTGRES_MIGRATION_CHECKSUM_MISMATCH",
        safe_error_code: "POSTGRES_MIGRATION_CHECKSUM_MISMATCH",
        status: 500,
        migration_id: expected.id,
      });
    }
  }
  return Object.freeze(ordered.map((migration) => Object.freeze({
    id: migration.id,
    checksum: migration.checksum,
    applied: true,
  })));
}
