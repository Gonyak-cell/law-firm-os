import { checksumPostgresMigration, listPostgresFoundationMigrations } from "./migration-catalog.js";
import { sanitizePostgresError } from "./errors.js";

const MIGRATION_LOCK_KEY = 7_260_071_601;

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

export async function runPostgresMigrations(pool, {
  migrations = listPostgresFoundationMigrations(),
  appliedBy = "law-firm-os",
  allowedHistoricalGapIds = [],
} = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");
  const ordered = migrations.map(normalizeMigration);
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index - 1].id >= ordered[index].id) throw new Error("PostgreSQL migrations must be strictly forward ordered");
  }
  if (!Array.isArray(allowedHistoricalGapIds)) throw new TypeError("PostgreSQL historical migration gap ids must be an array");
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
  try {
    client = await pool.connect();
    await client.query("CREATE SCHEMA IF NOT EXISTS lawos_meta");
    await client.query(`
      CREATE TABLE IF NOT EXISTS lawos_meta.schema_migrations (
        migration_id text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        applied_by text NOT NULL
      )
    `);
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    lockHeld = true;
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
    const results = [];
    for (const migration of ordered) {
      const applied = history.get(migration.id);
      if (applied) {
        results.push(Object.freeze({ id: migration.id, checksum: migration.checksum, applied: false }));
        continue;
      }
      await client.query("BEGIN");
      try {
        await client.query(migration.sql);
        await client.query(
          "INSERT INTO lawos_meta.schema_migrations (migration_id, checksum, applied_by) VALUES ($1, $2, $3)",
          [migration.id, migration.checksum, String(appliedBy).slice(0, 128)],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        throw error;
      }
      results.push(Object.freeze({ id: migration.id, checksum: migration.checksum, applied: true }));
    }
    return Object.freeze(results);
  } catch (error) {
    throw sanitizePostgresError(error);
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
