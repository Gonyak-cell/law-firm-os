import { listPostgresFoundationMigrations } from "../../persistence/src/postgres/migration-catalog.js";
import {
  runPostgresMigrations,
  verifyPostgresMigrationState,
} from "../../persistence/src/postgres/migration-runner.js";
import {
  HRX_APPEND_ONLY_TABLES,
  HRX_STORE_TABLES,
} from "./store/file-store.js";
import { loadHrxCoreMigrations } from "./migrations/index.js";

export const HRX_POSTGRES_SCHEMA = "lawos_hrx";
export const HRX_POSTGRES_MIGRATION_VERSION = "law-firm-os.hrx-postgres-migrations.v0.1";

const SQLITE_ABORT_TRIGGER = /CREATE\s+TRIGGER\s+IF\s+NOT\s+EXISTS\s+([a-z0-9_]+)\s+BEFORE\s+(UPDATE|DELETE)\s+ON\s+([a-z0-9_]+)\s+BEGIN\s+SELECT\s+RAISE\s*\(\s*ABORT\s*,\s*'[^']*'\s*\)\s*;\s*END\s*;/giu;

function quoteIdentifier(value) {
  const identifier = String(value ?? "");
  if (!/^[a-z_][a-z0-9_]*$/u.test(identifier)) throw new TypeError(`unsafe PostgreSQL identifier: ${identifier}`);
  return `"${identifier}"`;
}

export function translateHrxMigrationToPostgres(sql) {
  const translatedTriggers = String(sql).replace(
    SQLITE_ABORT_TRIGGER,
    (_match, triggerName, operation, tableName) => [
      `DROP TRIGGER IF EXISTS ${quoteIdentifier(triggerName)} ON ${quoteIdentifier(tableName)};`,
      `CREATE TRIGGER ${quoteIdentifier(triggerName)}`,
      `BEFORE ${operation.toUpperCase()} ON ${quoteIdentifier(tableName)}`,
      "FOR EACH ROW EXECUTE FUNCTION lawos_runtime.reject_hrx_append_only();",
    ].join("\n"),
  );
  if (/\bRAISE\s*\(\s*ABORT\b/iu.test(translatedTriggers)) {
    throw new Error("untranslated SQLite RAISE trigger remains in HRX migration");
  }
  return [
    `SET LOCAL search_path TO ${quoteIdentifier(HRX_POSTGRES_SCHEMA)}, public;`,
    translatedTriggers,
  ].join("\n");
}

function bootstrapSql() {
  return `
CREATE SCHEMA IF NOT EXISTS ${quoteIdentifier(HRX_POSTGRES_SCHEMA)};

CREATE OR REPLACE FUNCTION lawos_runtime.reject_hrx_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'HRX append-only row cannot be changed' USING ERRCODE = '23514';
END;
$$;
`;
}

function hardeningSql() {
  const policies = HRX_STORE_TABLES.flatMap((table) => {
    const qualified = `${quoteIdentifier(HRX_POSTGRES_SCHEMA)}.${quoteIdentifier(table)}`;
    return [
      `ALTER TABLE ${qualified} ENABLE ROW LEVEL SECURITY;`,
      `ALTER TABLE ${qualified} FORCE ROW LEVEL SECURITY;`,
      `DROP POLICY IF EXISTS tenant_isolation ON ${qualified};`,
      `CREATE POLICY tenant_isolation ON ${qualified}`,
      "  USING (tenant_id = lawos_security.current_tenant_id())",
      "  WITH CHECK (tenant_id = lawos_security.current_tenant_id());",
    ].join("\n");
  });
  return policies.join("\n\n");
}

function appendOnlyHardeningSql() {
  return HRX_APPEND_ONLY_TABLES.map((table) => {
    const qualified = `${quoteIdentifier(HRX_POSTGRES_SCHEMA)}.${quoteIdentifier(table)}`;
    return [
      `DROP TRIGGER IF EXISTS lawos_hrx_append_only_guard ON ${qualified};`,
      "CREATE TRIGGER lawos_hrx_append_only_guard",
      `BEFORE UPDATE OR DELETE ON ${qualified}`,
      "FOR EACH ROW EXECUTE FUNCTION lawos_runtime.reject_hrx_append_only();",
    ].join("\n");
  }).join("\n\n");
}

function projectionStateSql() {
  return `
CREATE SCHEMA IF NOT EXISTS lawos_projection;

CREATE TABLE IF NOT EXISTS lawos_projection.hrx_record_state (
  tenant_id text NOT NULL,
  source_record_type text NOT NULL,
  source_record_id text NOT NULL,
  source_state_version bigint NOT NULL CHECK (source_state_version >= 1),
  source_payload_hash text NOT NULL CHECK (source_payload_hash ~ '^[a-f0-9]{64}$'),
  projected_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, source_record_type, source_record_id)
);

CREATE TABLE IF NOT EXISTS lawos_projection.hrx_outbox_cursor (
  tenant_id text PRIMARY KEY,
  last_created_at timestamptz,
  last_event_id text,
  projected_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  CHECK ((last_created_at IS NULL) = (last_event_id IS NULL))
);

ALTER TABLE lawos_projection.hrx_record_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_projection.hrx_record_state FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_projection.hrx_outbox_cursor ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_projection.hrx_outbox_cursor FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation ON lawos_projection.hrx_record_state;
CREATE POLICY tenant_isolation ON lawos_projection.hrx_record_state
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON lawos_projection.hrx_outbox_cursor;
CREATE POLICY tenant_isolation ON lawos_projection.hrx_outbox_cursor
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());
`;
}

function boundedProjectionSql() {
  const targetHardening = HRX_STORE_TABLES.map((table) => {
    const qualified = `${quoteIdentifier(HRX_POSTGRES_SCHEMA)}.${quoteIdentifier(table)}`;
    return [
      `ALTER TABLE ${qualified}`,
      "  ADD COLUMN IF NOT EXISTS lawos_projection_deleted_at timestamptz;",
      `DROP TRIGGER IF EXISTS lawos_hrx_delete_guard ON ${qualified};`,
      "CREATE TRIGGER lawos_hrx_delete_guard",
      `BEFORE DELETE ON ${qualified}`,
      "FOR EACH ROW EXECUTE FUNCTION lawos_runtime.reject_hrx_projection_delete();",
    ].join("\n");
  }).join("\n\n");
  return `
CREATE OR REPLACE FUNCTION lawos_runtime.reject_hrx_projection_delete()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'HRX projection rows cannot be physically deleted' USING ERRCODE = '23514';
END;
$$;

ALTER TABLE lawos_projection.hrx_record_state
  ADD COLUMN IF NOT EXISTS source_status text,
  ADD COLUMN IF NOT EXISTS source_deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS archive_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS projection_run_ref text,
  ADD COLUMN IF NOT EXISTS target_primary_key_sha256 text
    CHECK (
      target_primary_key_sha256 IS NULL
      OR target_primary_key_sha256 ~ '^[a-f0-9]{64}$'
    ),
  ADD COLUMN IF NOT EXISTS target_row_sha256 text
    CHECK (
      target_row_sha256 IS NULL
      OR target_row_sha256 ~ '^[a-f0-9]{64}$'
    );

CREATE TABLE IF NOT EXISTS lawos_projection.hrx_backfill_checkpoint (
  tenant_id text NOT NULL,
  rollout_wave integer NOT NULL CHECK (rollout_wave BETWEEN 1 AND 5),
  mapping_sha256 text NOT NULL CHECK (mapping_sha256 ~ '^[a-f0-9]{64}$'),
  performance_acceptance_sha256 text NOT NULL
    CHECK (performance_acceptance_sha256 ~ '^[a-f0-9]{64}$'),
  run_ref text NOT NULL,
  source_high_watermark_created_at timestamptz,
  source_high_watermark_event_id text,
  last_table_ordinal integer NOT NULL DEFAULT -1 CHECK (last_table_ordinal >= -1),
  last_record_id text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('running', 'complete')),
  processed_record_count bigint NOT NULL DEFAULT 0 CHECK (processed_record_count >= 0),
  projected_insert_count bigint NOT NULL DEFAULT 0 CHECK (projected_insert_count >= 0),
  projected_update_count bigint NOT NULL DEFAULT 0 CHECK (projected_update_count >= 0),
  projected_noop_count bigint NOT NULL DEFAULT 0 CHECK (projected_noop_count >= 0),
  source_stream_hash text NOT NULL CHECK (source_stream_hash ~ '^[a-f0-9]{64}$'),
  target_stream_hash text NOT NULL CHECK (target_stream_hash ~ '^[a-f0-9]{64}$'),
  started_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  completed_at timestamptz,
  CHECK (
    (source_high_watermark_created_at IS NULL)
      = (source_high_watermark_event_id IS NULL)
  ),
  CHECK ((status = 'complete') = (completed_at IS NOT NULL)),
  PRIMARY KEY (tenant_id, rollout_wave)
);

CREATE TABLE IF NOT EXISTS lawos_projection.hrx_projection_lease (
  tenant_id text PRIMARY KEY,
  lease_owner_ref text NOT NULL,
  mapping_sha256 text NOT NULL CHECK (mapping_sha256 ~ '^[a-f0-9]{64}$'),
  lease_expires_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE lawos_projection.hrx_backfill_checkpoint ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_projection.hrx_backfill_checkpoint FORCE ROW LEVEL SECURITY;
ALTER TABLE lawos_projection.hrx_projection_lease ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_projection.hrx_projection_lease FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation
  ON lawos_projection.hrx_backfill_checkpoint;
CREATE POLICY tenant_isolation ON lawos_projection.hrx_backfill_checkpoint
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation
  ON lawos_projection.hrx_projection_lease;
CREATE POLICY tenant_isolation ON lawos_projection.hrx_projection_lease
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());

${targetHardening}
`;
}

function projectionConsumerRoutingSql() {
  return `
CREATE TABLE IF NOT EXISTS lawos_projection.hrx_consumer_route (
  tenant_id text NOT NULL,
  query_family text NOT NULL CHECK (
    query_family IN (
      'shadow-only',
      'core-employee-roster',
      'recruiting-lifecycle',
      'leave-attendance',
      'payroll-compensation'
    )
  ),
  rollout_wave integer NOT NULL CHECK (rollout_wave BETWEEN 0 AND 4),
  enabled boolean NOT NULL DEFAULT false,
  mapping_sha256 text NOT NULL CHECK (mapping_sha256 ~ '^[a-f0-9]{64}$'),
  validation_result_sha256 text NOT NULL
    CHECK (validation_result_sha256 ~ '^[a-f0-9]{64}$'),
  max_staleness_ms integer NOT NULL CHECK (
    max_staleness_ms BETWEEN 1 AND 3600000
  ),
  verified_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, query_family)
);

ALTER TABLE lawos_projection.hrx_consumer_route ENABLE ROW LEVEL SECURITY;
ALTER TABLE lawos_projection.hrx_consumer_route FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation
  ON lawos_projection.hrx_consumer_route;
CREATE POLICY tenant_isolation ON lawos_projection.hrx_consumer_route
  USING (tenant_id = lawos_security.current_tenant_id())
  WITH CHECK (tenant_id = lawos_security.current_tenant_id());
`;
}

export function listHrxPostgresMigrations() {
  const translated = loadHrxCoreMigrations().map((migration, index) => Object.freeze({
    id: `${String(index + 101).padStart(3, "0")}_hrx_${migration.id}`,
    file_name: migration.filename,
    source_migration_id: migration.id,
    sql: translateHrxMigrationToPostgres(migration.sql),
  }));
  return Object.freeze([
    Object.freeze({ id: "100_hrx_schema", file_name: null, sql: bootstrapSql() }),
    ...translated,
    Object.freeze({ id: "200_hrx_rls", file_name: null, sql: hardeningSql() }),
    Object.freeze({ id: "201_hrx_append_only", file_name: null, sql: appendOnlyHardeningSql() }),
    Object.freeze({ id: "202_hrx_projection_state", file_name: null, sql: projectionStateSql() }),
    Object.freeze({ id: "203_hrx_bounded_projection", file_name: null, sql: boundedProjectionSql() }),
    Object.freeze({ id: "204_hrx_projection_consumer_routing", file_name: null, sql: projectionConsumerRoutingSql() }),
  ]);
}

export function classifyHrxPostgresMigrationGaps() {
  const migrations = loadHrxCoreMigrations();
  const rows = migrations.map((migration) => {
    const sqliteTriggerCount = [...migration.sql.matchAll(new RegExp(SQLITE_ABORT_TRIGGER.source, "giu"))].length;
    return Object.freeze({
      migration_id: migration.id,
      filename: migration.filename,
      classification: sqliteTriggerCount > 0 ? "TRANSLATE_SQLITE_TRIGGER" : "POSTGRES_DDL_COMPATIBLE",
      sqlite_trigger_count: sqliteTriggerCount,
      destructive_statement_count: 0,
      translated_sql_ready: true,
    });
  });
  return Object.freeze({
    contract_version: HRX_POSTGRES_MIGRATION_VERSION,
    migration_count: rows.length,
    compatible_count: rows.filter((row) => row.classification === "POSTGRES_DDL_COMPATIBLE").length,
    translated_trigger_migration_count: rows.filter((row) => row.classification === "TRANSLATE_SQLITE_TRIGGER").length,
    translated_trigger_count: rows.reduce((total, row) => total + row.sqlite_trigger_count, 0),
    table_count: HRX_STORE_TABLES.length,
    append_only_table_count: HRX_APPEND_ONLY_TABLES.length,
    rows: Object.freeze(rows),
  });
}

export async function runHrxPostgresMigrations(pool, options = {}) {
  return runPostgresMigrations(pool, {
    ...options,
    migrations: [
      ...listPostgresFoundationMigrations(),
      ...listHrxPostgresMigrations(),
    ],
  });
}

export async function verifyHrxPostgresMigrationState(pool) {
  return verifyPostgresMigrationState(pool, {
    migrations: [
      ...listPostgresFoundationMigrations(),
      ...listHrxPostgresMigrations(),
    ],
  });
}
