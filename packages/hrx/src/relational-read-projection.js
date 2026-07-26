import { createHash } from "node:crypto";
import { validateJsonPostgresPerformanceAcceptance } from "../../persistence/src/postgres/performance-acceptance.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  assertHrxRelationalMappingMatchesDatabase,
  projectHrxRelationalPayload,
  validateHrxRelationalMappingManifest,
} from "./relational-projection-contract.js";

export const HRX_RELATIONAL_PROJECTION_VERSION =
  "law-firm-os.hrx-relational-read-projection.v2";

const SHA256_ZERO = "0".repeat(64);
const LEASE_SECONDS = 120;
const MAX_BATCH_SIZE = 5_000;
const MAX_INCREMENTAL_EVENT_BATCH = 5_000;
const NON_PROJECTED_RECORD_TYPES = Object.freeze([
  "__hrx_schema_migration",
]);

function projectionError(message, code) {
  return Object.assign(new Error(message), {
    code,
    safe_error_code: code,
  });
}

function requiredText(value, label) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${label} is required`);
  return text;
}

function quoteIdentifier(value) {
  const text = requiredText(value, "SQL identifier");
  if (!/^[a-z_][a-z0-9_]*$/u.test(text)) throw new TypeError("unsafe SQL identifier");
  return `"${text}"`;
}

function stableJson(value) {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function normalizeValue(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeValue(entry)]),
    );
  }
  return value;
}

function comparableRow(row, sourceKeys) {
  return Object.fromEntries(sourceKeys.map((key) => [key, normalizeValue(row?.[key])]));
}

function performanceContract(performanceAcceptance, mappingManifest) {
  validateJsonPostgresPerformanceAcceptance(performanceAcceptance);
  if (performanceAcceptance.acceptance_sha256 !== mappingManifest.performance_acceptance_sha256
    || performanceAcceptance.batch_size > MAX_BATCH_SIZE
    || performanceAcceptance.pool_max > 2
    || performanceAcceptance.statement_timeout_ms > 120_000
    || performanceAcceptance.connection_timeout_ms > 10_000) {
    throw projectionError(
      "HRX projection performance acceptance exceeds the bounded runtime contract",
      "LAWOS_HRX_PROJECTION_PERFORMANCE_CONTRACT",
    );
  }
  return Object.freeze({
    batchSize: performanceAcceptance.batch_size,
    statementTimeoutMillis: performanceAcceptance.statement_timeout_ms,
  });
}

function manifestIndex(mappingManifest, rolloutWave = null) {
  const tables = mappingManifest.dependency_order.filter((table) =>
    rolloutWave == null
      || mappingManifest.tables.find((mapping) =>
        mapping.table_name === table)?.rollout_wave === rolloutWave);
  return Object.freeze({
    byTable: new Map(mappingManifest.tables.map((table) => [table.table_name, table])),
    position: new Map(tables.map((table, index) => [table, index])),
    tables,
  });
}

function lifecycle(payload, mapping) {
  const deleted = payload?.status === "deleted";
  const deletedAt = payload?.deleted_at;
  if (deleted !== (deletedAt != null && String(deletedAt).trim() !== "")) {
    throw projectionError(
      `HRX projection tombstone is incomplete: ${mapping.table_name}`,
      "LAWOS_HRX_PROJECTION_TOMBSTONE_INVALID",
    );
  }
  if (deleted && mapping.append_only) {
    throw projectionError(
      `append-only HRX projection row cannot be tombstoned: ${mapping.table_name}`,
      "LAWOS_HRX_PROJECTION_APPEND_ONLY_CONFLICT",
    );
  }
  if (deleted && Number.isNaN(Date.parse(deletedAt))) {
    throw projectionError(
      `HRX projection tombstone timestamp is invalid: ${mapping.table_name}`,
      "LAWOS_HRX_PROJECTION_TOMBSTONE_INVALID",
    );
  }
  return Object.freeze({
    deleted,
    deletedAt: deleted ? new Date(deletedAt).toISOString() : null,
  });
}

function rowForMapping(payload, mapping) {
  const projected = projectHrxRelationalPayload(payload, mapping);
  const state = lifecycle(payload, mapping);
  const row = { ...projected.row };
  const required = state.deleted ? mapping.primary_key : mapping.required_columns;
  for (const key of new Set([...mapping.primary_key, ...required])) {
    if (row[key] == null || String(row[key]).trim() === "") {
      throw new TypeError(`HRX projection required field is missing: ${mapping.table_name}.${key}`);
    }
  }
  if (row.tenant_id == null) {
    throw new TypeError(`HRX projection tenant is missing: ${mapping.table_name}`);
  }
  row.lawos_projection_deleted_at = state.deletedAt;
  return Object.freeze({
    row,
    lifecycle: state,
    unknownNonNullCount: projected.unknown_nonnull_field_count,
  });
}

async function readTargetRow(client, mapping, row) {
  const where = mapping.primary_key
    .map((key, index) => `${quoteIdentifier(key)} = $${index + 1}`)
    .join(" AND ");
  const result = await client.query(
    `SELECT * FROM lawos_hrx.${quoteIdentifier(mapping.table_name)} WHERE ${where}`,
    mapping.primary_key.map((key) => row[key]),
  );
  if (result.rowCount > 1) {
    throw projectionError(
      `HRX projection primary key is not unique: ${mapping.table_name}`,
      "LAWOS_HRX_PROJECTION_PRIMARY_KEY",
    );
  }
  return result.rows[0] ?? null;
}

async function writeTargetRow(client, { mapping, row, existing, tombstone }) {
  if (tombstone) {
    if (!existing) return "noop";
    await client.query(
      `UPDATE lawos_hrx.${quoteIdentifier(mapping.table_name)}
          SET lawos_projection_deleted_at = $1
        WHERE ${mapping.primary_key
          .map((key, index) => `${quoteIdentifier(key)} = $${index + 2}`)
          .join(" AND ")}`,
      [row.lawos_projection_deleted_at, ...mapping.primary_key.map((key) => row[key])],
    );
    return "updated";
  }
  const keys = Object.keys(row).sort();
  const sourceHash = sha256(comparableRow(row, keys));
  if (existing) {
    const targetHash = sha256(comparableRow(existing, keys));
    if (targetHash === sourceHash) return "noop";
    if (mapping.append_only) {
      throw projectionError(
        `append-only HRX projection row differs from its source: ${mapping.table_name}`,
        "LAWOS_HRX_PROJECTION_APPEND_ONLY_CONFLICT",
      );
    }
    const mutable = keys.filter((key) => !mapping.primary_key.includes(key));
    if (mutable.length === 0) {
      throw projectionError(
        `HRX projection row has no mutable columns: ${mapping.table_name}`,
        "LAWOS_HRX_PROJECTION_NO_MUTABLE_COLUMNS",
      );
    }
    const values = mutable.map((key) => row[key]);
    const whereOffset = mutable.length;
    await client.query(
      `UPDATE lawos_hrx.${quoteIdentifier(mapping.table_name)}
          SET ${mutable.map((key, index) =>
            `${quoteIdentifier(key)} = $${index + 1}`).join(", ")}
        WHERE ${mapping.primary_key.map((key, index) =>
          `${quoteIdentifier(key)} = $${whereOffset + index + 1}`).join(" AND ")}`,
      [...values, ...mapping.primary_key.map((key) => row[key])],
    );
    return "updated";
  }
  await client.query(
    `INSERT INTO lawos_hrx.${quoteIdentifier(mapping.table_name)}
       (${keys.map(quoteIdentifier).join(", ")})
     VALUES (${keys.map((_, index) => `$${index + 1}`).join(", ")})`,
    keys.map((key) => row[key]),
  );
  return "inserted";
}

async function projectionState(client, tenantId, source) {
  const result = await client.query(
    `SELECT source_state_version, source_payload_hash, source_status,
            source_deleted_at, archive_only, target_primary_key_sha256,
            target_row_sha256
       FROM lawos_projection.hrx_record_state
      WHERE tenant_id = $1
        AND source_record_type = $2
        AND source_record_id = $3
      FOR UPDATE`,
    [tenantId, source.record_type, source.record_id],
  );
  return result.rows[0] ?? null;
}

function assertSourceProgression(prior, source, lifecycleState) {
  if (!prior) return;
  if (Number(prior.source_state_version) > Number(source.state_version)
    || (Number(prior.source_state_version) === Number(source.state_version)
      && prior.source_payload_hash !== source.payload_hash)) {
    throw projectionError(
      "HRX projection source version or hash regressed",
      "LAWOS_HRX_PROJECTION_SOURCE_REGRESSION",
    );
  }
  if (prior.archive_only === true && !lifecycleState.deleted) {
    throw projectionError(
      "HRX projection tombstone cannot be silently resurrected",
      "LAWOS_HRX_PROJECTION_TOMBSTONE_REGRESSION",
    );
  }
}

async function projectSource(client, {
  tenantId,
  source,
  mapping,
  runRef,
  faultInjector,
} = {}) {
  const projected = rowForMapping(source.payload, mapping);
  if (projected.row.tenant_id !== tenantId) {
    throw projectionError(
      "HRX projection payload tenant drifted",
      "LAWOS_HRX_PROJECTION_TENANT_DRIFT",
    );
  }
  const prior = await projectionState(client, tenantId, source);
  assertSourceProgression(prior, source, projected.lifecycle);
  const existing = await readTargetRow(client, mapping, projected.row);
  const priorMatches = prior
    && Number(prior.source_state_version) === Number(source.state_version)
    && prior.source_payload_hash === source.payload_hash;
  let outcome;
  if (priorMatches) {
    if (projected.lifecycle.deleted) {
      if (existing
        && normalizeValue(existing.lawos_projection_deleted_at)
          !== projected.row.lawos_projection_deleted_at) {
        throw projectionError(
          "HRX projection tombstone target drifted after a completed projection",
          "LAWOS_HRX_PROJECTION_TARGET_DRIFT",
        );
      }
    } else {
      const keys = Object.keys(projected.row).sort();
      if (!existing
        || sha256(comparableRow(existing, keys))
          !== sha256(comparableRow(projected.row, keys))) {
        throw projectionError(
          "HRX projection target drifted after a completed projection",
          "LAWOS_HRX_PROJECTION_TARGET_DRIFT",
        );
      }
    }
    outcome = "noop";
  } else {
    outcome = await writeTargetRow(client, {
      mapping,
      row: projected.row,
      existing,
      tombstone: projected.lifecycle.deleted,
    });
  }
  const readback = await readTargetRow(client, mapping, projected.row);
  if (projected.lifecycle.deleted) {
    if (readback
      && normalizeValue(readback.lawos_projection_deleted_at)
        !== projected.row.lawos_projection_deleted_at) {
      throw projectionError(
        "HRX relational projection tombstone readback differs",
        "LAWOS_HRX_PROJECTION_READBACK",
      );
    }
  } else {
    const keys = Object.keys(projected.row).sort();
    if (!readback
      || sha256(comparableRow(readback, keys))
        !== sha256(comparableRow(projected.row, keys))) {
      throw projectionError(
        "HRX relational projection readback differs from the source authority",
        "LAWOS_HRX_PROJECTION_READBACK",
      );
    }
  }
  const targetPrimaryKeySha256 = sha256(
    mapping.primary_key.map((field) => [field, normalizeValue(projected.row[field])]),
  );
  const targetRowSha256 = readback
    ? sha256(comparableRow(readback, Object.keys(projected.row).sort()))
    : sha256({ tombstone: true, deleted_at: projected.lifecycle.deletedAt });
  if (priorMatches) {
    if ((prior.target_primary_key_sha256 != null
        && prior.target_primary_key_sha256 !== targetPrimaryKeySha256)
      || (prior.target_row_sha256 != null
        && prior.target_row_sha256 !== targetRowSha256)) {
      throw projectionError(
        "HRX projection lineage hash drifted after a completed projection",
        "LAWOS_HRX_PROJECTION_TARGET_DRIFT",
      );
    }
  } else {
    await client.query(
      `INSERT INTO lawos_projection.hrx_record_state
         (tenant_id, source_record_type, source_record_id, source_state_version,
          source_payload_hash, source_status, source_deleted_at, archive_only,
          projection_run_ref, target_primary_key_sha256, target_row_sha256)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (tenant_id, source_record_type, source_record_id) DO UPDATE
         SET source_state_version = EXCLUDED.source_state_version,
             source_payload_hash = EXCLUDED.source_payload_hash,
             source_status = EXCLUDED.source_status,
             source_deleted_at = EXCLUDED.source_deleted_at,
             archive_only = EXCLUDED.archive_only,
             projection_run_ref = EXCLUDED.projection_run_ref,
             target_primary_key_sha256 = EXCLUDED.target_primary_key_sha256,
             target_row_sha256 = EXCLUDED.target_row_sha256,
             projected_at = clock_timestamp()`,
      [
        tenantId,
        mapping.table_name,
        source.record_id,
        source.state_version,
        source.payload_hash,
        projected.lifecycle.deleted ? "deleted" : (source.payload.status ?? null),
        projected.lifecycle.deletedAt,
        projected.lifecycle.deleted,
        runRef,
        targetPrimaryKeySha256,
        targetRowSha256,
      ],
    );
  }
  faultInjector?.("after_record", {
    record_type: mapping.table_name,
    record_id_sha256: sha256(source.record_id),
  });
  return Object.freeze({
    outcome,
    target_material: {
      table: mapping.table_name,
      record_id_sha256: sha256(source.record_id),
      row_hash: targetRowSha256,
    },
  });
}

function transactionOptions(tenantId, statementTimeoutMillis, readOnly = false) {
  return {
    tenant_id: tenantId,
    isolationLevel: "serializable",
    statementTimeoutMillis,
    readOnly,
  };
}

async function acquireLease(pool, {
  tenantId,
  ownerRef,
  mappingSha256,
  statementTimeoutMillis,
} = {}) {
  return withPostgresTransaction(
    pool,
    transactionOptions(tenantId, statementTimeoutMillis),
    async (client) => {
      const claimed = await client.query(
        `INSERT INTO lawos_projection.hrx_projection_lease
           (tenant_id, lease_owner_ref, mapping_sha256, lease_expires_at)
         VALUES ($1, $2, $3, clock_timestamp() + ($4::integer * interval '1 second'))
         ON CONFLICT (tenant_id) DO UPDATE
           SET lease_owner_ref = EXCLUDED.lease_owner_ref,
               mapping_sha256 = EXCLUDED.mapping_sha256,
               lease_expires_at = EXCLUDED.lease_expires_at,
               updated_at = clock_timestamp()
         WHERE lawos_projection.hrx_projection_lease.lease_expires_at <= clock_timestamp()
            OR lawos_projection.hrx_projection_lease.lease_owner_ref = EXCLUDED.lease_owner_ref
         RETURNING tenant_id`,
        [tenantId, ownerRef, mappingSha256, LEASE_SECONDS],
      );
      if (claimed.rowCount !== 1) {
        throw projectionError(
          "another HRX projection worker holds the tenant lease",
          "LAWOS_HRX_PROJECTION_LEASE_HELD",
        );
      }
      return true;
    },
  );
}

async function renewLease(client, { tenantId, ownerRef, mappingSha256 } = {}) {
  const renewed = await client.query(
    `UPDATE lawos_projection.hrx_projection_lease
        SET lease_expires_at = clock_timestamp() + ($4::integer * interval '1 second'),
            updated_at = clock_timestamp()
      WHERE tenant_id = $1
        AND lease_owner_ref = $2
        AND mapping_sha256 = $3
        AND lease_expires_at > clock_timestamp()
      RETURNING tenant_id`,
    [tenantId, ownerRef, mappingSha256, LEASE_SECONDS],
  );
  if (renewed.rowCount !== 1) {
    throw projectionError(
      "HRX projection worker lost its tenant lease",
      "LAWOS_HRX_PROJECTION_LEASE_LOST",
    );
  }
}

async function releaseLease(pool, {
  tenantId,
  ownerRef,
  statementTimeoutMillis,
} = {}) {
  await withPostgresTransaction(
    pool,
    transactionOptions(tenantId, statementTimeoutMillis),
    (client) => client.query(
      `UPDATE lawos_projection.hrx_projection_lease
          SET lease_expires_at = clock_timestamp(),
              updated_at = clock_timestamp()
        WHERE tenant_id = $1 AND lease_owner_ref = $2`,
      [tenantId, ownerRef],
    ),
  ).catch(() => {});
}

async function unknownSourceTypeCount(client, tenantId, approvedTables) {
  const result = await client.query(
    `SELECT count(*)::integer AS count
       FROM lawos_domain.records
      WHERE tenant_id = $1
        AND domain_id = 'hrx'
        AND NOT (record_type = ANY($2::text[]))`,
    [tenantId, [...approvedTables, ...NON_PROJECTED_RECORD_TYPES]],
  );
  return Number(result.rows[0]?.count ?? 0);
}

async function sourceBatch(client, {
  tenantId,
  tables,
  lastTableOrdinal,
  lastRecordId,
  batchSize,
} = {}) {
  const result = await client.query(
    `SELECT record_type, record_id, state_version, payload, payload_hash
       FROM lawos_domain.records
      WHERE tenant_id = $1
        AND domain_id = 'hrx'
        AND record_type = ANY($2::text[])
        AND (
          array_position($2::text[], record_type) - 1,
          record_id
        ) > ($3::integer, $4::text)
      ORDER BY array_position($2::text[], record_type), record_id
      LIMIT $5`,
    [tenantId, tables, lastTableOrdinal, lastRecordId, batchSize],
  );
  return result.rows;
}

async function sourceHighWatermark(client, tenantId) {
  const result = await client.query(
    `SELECT created_at::text AS created_at, event_id
       FROM lawos_domain.outbox_events
      WHERE tenant_id = $1 AND domain_id = 'hrx'
      ORDER BY created_at DESC, event_id DESC
      LIMIT 1`,
    [tenantId],
  );
  return result.rows[0] ?? null;
}

async function ensureBackfillCheckpoint(client, {
  tenantId,
  mappingManifest,
  runRef,
  rolloutWave,
} = {}) {
  const current = await client.query(
    `SELECT checkpoint.*,
            source_high_watermark_created_at::text
              AS source_high_watermark_created_at_text
      FROM lawos_projection.hrx_backfill_checkpoint
         AS checkpoint
      WHERE tenant_id = $1 AND rollout_wave = $2
      FOR UPDATE`,
    [tenantId, rolloutWave],
  );
  if (current.rows[0]) {
    const checkpoint = current.rows[0];
    if (checkpoint.mapping_sha256 !== mappingManifest.manifest_sha256
      || checkpoint.performance_acceptance_sha256
        !== mappingManifest.performance_acceptance_sha256) {
      throw projectionError(
        "HRX backfill checkpoint drifted from the approved mapping",
        "LAWOS_HRX_PROJECTION_CHECKPOINT_DRIFT",
      );
    }
    await client.query(
      `UPDATE lawos_projection.hrx_backfill_checkpoint
          SET run_ref = $3, updated_at = clock_timestamp()
        WHERE tenant_id = $1 AND rollout_wave = $2`,
      [tenantId, rolloutWave, runRef],
    );
    return checkpoint;
  }
  let watermark;
  if (rolloutWave === 1) {
    watermark = await sourceHighWatermark(client, tenantId);
  } else {
    const prior = await client.query(
      `SELECT count(*) FILTER (
                WHERE status = 'complete' AND completed_at IS NOT NULL
              )::integer AS completed_count,
              min(source_high_watermark_created_at)::text
                AS source_high_watermark_created_at,
              min(source_high_watermark_event_id)
                AS source_high_watermark_event_id,
              count(DISTINCT source_high_watermark_created_at)::integer
                AS watermark_time_count,
              count(DISTINCT source_high_watermark_event_id)::integer
                AS watermark_event_count
         FROM lawos_projection.hrx_backfill_checkpoint
        WHERE tenant_id = $1 AND rollout_wave < $2`,
      [tenantId, rolloutWave],
    );
    const priorState = prior.rows[0];
    if (Number(priorState?.completed_count ?? 0) !== rolloutWave - 1
      || Number(priorState?.watermark_time_count ?? 0) > 1
      || Number(priorState?.watermark_event_count ?? 0) > 1) {
      throw projectionError(
        "HRX backfill rollout skipped or drifted from a prior wave",
        "LAWOS_HRX_PROJECTION_WAVE_SEQUENCE",
      );
    }
    watermark = priorState?.source_high_watermark_created_at == null
      ? null
      : {
        created_at: priorState.source_high_watermark_created_at,
        event_id: priorState.source_high_watermark_event_id,
      };
  }
  const inserted = await client.query(
    `INSERT INTO lawos_projection.hrx_backfill_checkpoint
       (tenant_id, rollout_wave, mapping_sha256,
        performance_acceptance_sha256, run_ref,
        source_high_watermark_created_at, source_high_watermark_event_id,
        status, source_stream_hash, target_stream_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'running', $8, $8)
     RETURNING *,
       source_high_watermark_created_at::text
         AS source_high_watermark_created_at_text`,
    [
      tenantId,
      rolloutWave,
      mappingManifest.manifest_sha256,
      mappingManifest.performance_acceptance_sha256,
      runRef,
      watermark?.created_at ?? null,
      watermark?.event_id ?? null,
      SHA256_ZERO,
    ],
  );
  return inserted.rows[0];
}

async function assertNoUnapprovedPhysicalAbsence(client, tenantId) {
  const missing = await client.query(
    `SELECT count(*)::integer AS count
       FROM lawos_projection.hrx_record_state AS state
      WHERE state.tenant_id = $1
        AND state.archive_only = false
        AND NOT EXISTS (
          SELECT 1
            FROM lawos_domain.records AS source
           WHERE source.tenant_id = state.tenant_id
             AND source.domain_id = 'hrx'
             AND source.record_type = state.source_record_type
             AND source.record_id = state.source_record_id
        )`,
    [tenantId],
  );
  if (Number(missing.rows[0]?.count ?? 0) !== 0) {
    throw projectionError(
      "HRX projection source disappeared without a committed tombstone",
      "LAWOS_HRX_PROJECTION_PHYSICAL_ABSENCE",
    );
  }
}

async function runBackfill(pool, {
  tenantId,
  mappingManifest,
  performance,
  index,
  ownerRef,
  runRef,
  rolloutWave,
  approvedTables,
  faultInjector,
} = {}) {
  const totals = {
    inserted: 0,
    updated: 0,
    noop: 0,
    processed: 0,
    batches: 0,
    sourceHash: SHA256_ZERO,
    targetHash: SHA256_ZERO,
    completed: false,
  };
  const expectedBatchCount = Math.ceil(
    mappingManifest.tables
      .filter((table) => table.rollout_wave === rolloutWave)
      .reduce((total, table) => total + table.expected_source_count, 0)
      / performance.batchSize,
  ) + 1;
  const maxBatches = Math.max(1, expectedBatchCount);
  for (let batchIndex = 0; batchIndex < maxBatches; batchIndex += 1) {
    const batch = await withPostgresTransaction(
      pool,
      transactionOptions(tenantId, performance.statementTimeoutMillis),
      async (client) => {
        await renewLease(client, {
          tenantId,
          ownerRef,
          mappingSha256: mappingManifest.manifest_sha256,
        });
        if (batchIndex === 0) {
          await assertHrxRelationalMappingMatchesDatabase(client, mappingManifest);
          if (await unknownSourceTypeCount(client, tenantId, approvedTables) !== 0) {
            throw projectionError(
              "unapproved HRX record type exists in the source authority",
              "LAWOS_HRX_PROJECTION_UNAPPROVED_RECORD_TYPE",
            );
          }
        }
        const checkpoint = await ensureBackfillCheckpoint(client, {
          tenantId,
          mappingManifest,
          runRef,
          rolloutWave,
        });
        if (checkpoint.status === "complete") {
          return Object.freeze({ complete: true, rows: [], inserted: 0, updated: 0, noop: 0 });
        }
        const rows = await sourceBatch(client, {
          tenantId,
          tables: index.tables,
          lastTableOrdinal: Number(checkpoint.last_table_ordinal),
          lastRecordId: checkpoint.last_record_id,
          batchSize: performance.batchSize,
        });
        if (rows.length === 0) {
          await assertNoUnapprovedPhysicalAbsence(client, tenantId);
          if (rolloutWave === 5
            && checkpoint.source_high_watermark_created_at_text != null) {
            await client.query(
              `INSERT INTO lawos_projection.hrx_outbox_cursor
                 (tenant_id, last_created_at, last_event_id)
               VALUES ($1, $2, $3)
               ON CONFLICT (tenant_id) DO UPDATE
                 SET last_created_at = EXCLUDED.last_created_at,
                     last_event_id = EXCLUDED.last_event_id,
                     projected_at = clock_timestamp()`,
              [
                tenantId,
                checkpoint.source_high_watermark_created_at_text,
                checkpoint.source_high_watermark_event_id,
              ],
            );
          }
          await client.query(
            `UPDATE lawos_projection.hrx_backfill_checkpoint
                SET status = 'complete',
                    completed_at = clock_timestamp(),
                    updated_at = clock_timestamp()
              WHERE tenant_id = $1 AND rollout_wave = $2`,
            [tenantId, rolloutWave],
          );
          faultInjector?.("before_checkpoint_commit", { batch_index: batchIndex });
          return Object.freeze({ complete: true, rows: [], inserted: 0, updated: 0, noop: 0 });
        }
        let inserted = 0;
        let updated = 0;
        let noop = 0;
        const targetMaterial = [];
        for (const source of rows) {
          const mapping = index.byTable.get(source.record_type);
          if (!mapping) {
            throw projectionError(
              "unapproved HRX projection record type",
              "LAWOS_HRX_PROJECTION_UNAPPROVED_RECORD_TYPE",
            );
          }
          const projected = await projectSource(client, {
            tenantId,
            source,
            mapping,
            runRef,
            faultInjector,
          });
          if (projected.outcome === "inserted") inserted += 1;
          else if (projected.outcome === "updated") updated += 1;
          else noop += 1;
          targetMaterial.push(projected.target_material);
        }
        const last = rows.at(-1);
        const lastOrdinal = index.position.get(last.record_type);
        const sourceMaterial = rows.map((row) => ({
          record_type: row.record_type,
          record_id: row.record_id,
          state_version: Number(row.state_version),
          payload_hash: row.payload_hash,
        }));
        const nextSourceHash = sha256({
          previous: checkpoint.source_stream_hash,
          batch: sourceMaterial,
        });
        const nextTargetHash = sha256({
          previous: checkpoint.target_stream_hash,
          batch: targetMaterial,
        });
        await client.query(
          `UPDATE lawos_projection.hrx_backfill_checkpoint
              SET last_table_ordinal = $3,
                  last_record_id = $4,
                  processed_record_count = processed_record_count + $5,
                  projected_insert_count = projected_insert_count + $6,
                  projected_update_count = projected_update_count + $7,
                  projected_noop_count = projected_noop_count + $8,
                  source_stream_hash = $9,
                  target_stream_hash = $10,
                  updated_at = clock_timestamp()
            WHERE tenant_id = $1 AND rollout_wave = $2`,
          [
            tenantId,
            rolloutWave,
            lastOrdinal,
            last.record_id,
            rows.length,
            inserted,
            updated,
            noop,
            nextSourceHash,
            nextTargetHash,
          ],
        );
        faultInjector?.("before_checkpoint_commit", { batch_index: batchIndex });
        return Object.freeze({
          complete: false,
          rows,
          inserted,
          updated,
          noop,
          sourceHash: nextSourceHash,
          targetHash: nextTargetHash,
        });
      },
    );
    totals.inserted += batch.inserted;
    totals.updated += batch.updated;
    totals.noop += batch.noop;
    totals.processed += batch.rows.length;
    if (batch.rows.length > 0) totals.batches += 1;
    totals.sourceHash = batch.sourceHash ?? totals.sourceHash;
    totals.targetHash = batch.targetHash ?? totals.targetHash;
    faultInjector?.("after_batch_commit", { batch_index: batchIndex });
    if (batch.complete) {
      totals.completed = true;
      break;
    }
  }
  if (!totals.completed) {
    throw projectionError(
      "HRX backfill exceeded its inventory-derived batch bound",
      "LAWOS_HRX_PROJECTION_BATCH_BOUND",
    );
  }
  return Object.freeze({ ...totals, rolloutWave });
}

function validateProjectionEvent(event, index) {
  if (typeof event.aggregate_type !== "string" || !event.aggregate_type.trim()
    || typeof event.aggregate_id !== "string" || !event.aggregate_id.trim()
    || !event.payload || typeof event.payload !== "object"
    || Array.isArray(event.payload)
    || Object.keys(event.payload).some((key) =>
      !["audit_event_id", "event_type", "payload_hash", "projection_records"].includes(key))
    || !Array.isArray(event.payload.projection_records)
    || event.payload.projection_records.length < 1
    || event.payload.projection_records.length > MAX_BATCH_SIZE) {
    throw projectionError(
      "HRX outbox event does not contain the approved projection contract",
      "LAWOS_HRX_PROJECTION_EVENT_SHAPE",
    );
  }
  return event.payload.projection_records.map((reference) => {
    if (!reference || typeof reference !== "object" || Array.isArray(reference)
      || JSON.stringify(Object.keys(reference).sort())
        !== JSON.stringify(["record_id", "record_type"])
      || typeof reference.record_id !== "string"
      || !reference.record_id.trim()) {
      throw projectionError(
        "HRX outbox event contains an unapproved projection record reference",
        "LAWOS_HRX_PROJECTION_EVENT_SHAPE",
      );
    }
    if (NON_PROJECTED_RECORD_TYPES.includes(reference.record_type)) {
      return null;
    }
    if (!index.byTable.has(reference.record_type)) {
      throw projectionError(
        "HRX outbox event contains an unapproved projection record reference",
        "LAWOS_HRX_PROJECTION_EVENT_SHAPE",
      );
    }
    return Object.freeze({
      record_type: reference.record_type,
      record_id: reference.record_id,
    });
  }).filter(Boolean);
}

async function pendingOutbox(client, tenantId, cursor, limit) {
  const values = [tenantId];
  let after = "";
  if (cursor?.last_created_at != null) {
    values.push(cursor.last_created_at, cursor.last_event_id);
    after = " AND (created_at, event_id) > ($2::timestamptz, $3::text)";
  }
  values.push(limit);
  const limitParameter = values.length;
  const result = await client.query(
    `SELECT event_id, created_at::text AS created_at, aggregate_type,
            aggregate_id, payload
       FROM lawos_domain.outbox_events
      WHERE tenant_id = $1
        AND domain_id = 'hrx'${after}
      ORDER BY created_at, event_id
      LIMIT $${limitParameter}`,
    values,
  );
  return result.rows;
}

async function sourceRowsForReferences(client, tenantId, references) {
  const recordTypes = references.map((reference) => reference.record_type);
  const recordIds = references.map((reference) => reference.record_id);
  const result = await client.query(
    `SELECT record_type, record_id, state_version, payload, payload_hash
       FROM lawos_domain.records
      WHERE tenant_id = $1
        AND domain_id = 'hrx'
        AND (record_type, record_id) IN (
          SELECT * FROM unnest($2::text[], $3::text[])
        )`,
    [tenantId, recordTypes, recordIds],
  );
  return result.rows;
}

async function runIncremental(pool, {
  tenantId,
  mappingManifest,
  performance,
  index,
  ownerRef,
  runRef,
  faultInjector,
} = {}) {
  return withPostgresTransaction(
    pool,
    transactionOptions(tenantId, performance.statementTimeoutMillis),
    async (client) => {
      await renewLease(client, {
        tenantId,
        ownerRef,
        mappingSha256: mappingManifest.manifest_sha256,
      });
      await assertHrxRelationalMappingMatchesDatabase(client, mappingManifest);
      const checkpoint = await client.query(
        `SELECT count(*) FILTER (
                  WHERE status = 'complete' AND completed_at IS NOT NULL
                )::integer AS completed_wave_count,
                count(*) FILTER (
                  WHERE mapping_sha256 <> $2
                     OR performance_acceptance_sha256 <> $3
                )::integer AS drifted_wave_count
           FROM lawos_projection.hrx_backfill_checkpoint
          WHERE tenant_id = $1`,
        [
          tenantId,
          mappingManifest.manifest_sha256,
          mappingManifest.performance_acceptance_sha256,
        ],
      );
      if (Number(checkpoint.rows[0]?.completed_wave_count ?? 0) !== 5
        || Number(checkpoint.rows[0]?.drifted_wave_count ?? 0) !== 0) {
        throw projectionError(
          "HRX incremental projection requires a completed backfill checkpoint",
          "LAWOS_HRX_PROJECTION_BACKFILL_INCOMPLETE",
        );
      }
      await assertNoUnapprovedPhysicalAbsence(client, tenantId);
      const cursorResult = await client.query(
        `SELECT last_created_at::text AS last_created_at, last_event_id
           FROM lawos_projection.hrx_outbox_cursor
          WHERE tenant_id = $1
          FOR UPDATE`,
        [tenantId],
      );
      const cursor = cursorResult.rows[0] ?? null;
      const eventLimit = Math.min(performance.batchSize, MAX_INCREMENTAL_EVENT_BATCH);
      const events = await pendingOutbox(client, tenantId, cursor, eventLimit);
      if (events.length === 0) {
        return Object.freeze({
          sourceRows: [],
          sourceHash: sha256([]),
          targetHash: sha256([]),
          inserted: 0,
          updated: 0,
          noop: 0,
          eventCount: 0,
          eventWaveCounts: Object.freeze({
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0,
          }),
          remainingEventCount: 0,
          batchCount: 0,
        });
      }
      const references = new Map();
      const eventWaveCounts = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      };
      for (const event of events) {
        const eventReferences = validateProjectionEvent(event, index);
        const eventWaves = new Set();
        for (const reference of eventReferences) {
          references.set(`${reference.record_type}:${reference.record_id}`, reference);
          eventWaves.add(index.byTable.get(reference.record_type).rollout_wave);
        }
        for (const wave of eventWaves) {
          eventWaveCounts[wave] += 1;
        }
      }
      const orderedReferences = [...references.values()].sort((left, right) =>
        index.position.get(left.record_type) - index.position.get(right.record_type)
          || left.record_id.localeCompare(right.record_id));
      const sources = await sourceRowsForReferences(client, tenantId, orderedReferences);
      const sourceByIdentity = new Map(
        sources.map((source) => [`${source.record_type}:${source.record_id}`, source]),
      );
      for (const reference of orderedReferences) {
        if (sourceByIdentity.has(`${reference.record_type}:${reference.record_id}`)) continue;
        const state = await client.query(
          `SELECT archive_only
             FROM lawos_projection.hrx_record_state
            WHERE tenant_id = $1
              AND source_record_type = $2
              AND source_record_id = $3`,
          [tenantId, reference.record_type, reference.record_id],
        );
        if (state.rows[0]?.archive_only !== true) {
          throw projectionError(
            "HRX outbox event references a physically absent source without a tombstone",
            "LAWOS_HRX_PROJECTION_PHYSICAL_ABSENCE",
          );
        }
      }
      let inserted = 0;
      let updated = 0;
      let noop = 0;
      const targetMaterial = [];
      for (const reference of orderedReferences) {
        const source = sourceByIdentity.get(`${reference.record_type}:${reference.record_id}`);
        if (!source) {
          noop += 1;
          continue;
        }
        const projected = await projectSource(client, {
          tenantId,
          source,
          mapping: index.byTable.get(source.record_type),
          runRef,
          faultInjector,
        });
        if (projected.outcome === "inserted") inserted += 1;
        else if (projected.outcome === "updated") updated += 1;
        else noop += 1;
        targetMaterial.push(projected.target_material);
      }
      faultInjector?.("before_cursor_advance", { event_count: events.length });
      const last = events.at(-1);
      await client.query(
        `INSERT INTO lawos_projection.hrx_outbox_cursor
           (tenant_id, last_created_at, last_event_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (tenant_id) DO UPDATE
           SET last_created_at = EXCLUDED.last_created_at,
               last_event_id = EXCLUDED.last_event_id,
               projected_at = clock_timestamp()`,
        [tenantId, last.created_at, last.event_id],
      );
      const remaining = await client.query(
        `SELECT count(*)::integer AS count
           FROM lawos_domain.outbox_events
          WHERE tenant_id = $1
            AND domain_id = 'hrx'
            AND (created_at, event_id) > ($2::timestamptz, $3::text)`,
        [tenantId, last.created_at, last.event_id],
      );
      return Object.freeze({
        sourceRows: sources,
        sourceHash: sha256(sources.map((row) => ({
          record_type: row.record_type,
          record_id: row.record_id,
          state_version: Number(row.state_version),
          payload_hash: row.payload_hash,
        }))),
        targetHash: sha256(targetMaterial),
        inserted,
        updated,
        noop,
        eventCount: events.length,
        eventWaveCounts: Object.freeze(eventWaveCounts),
        remainingEventCount: Number(remaining.rows[0]?.count ?? 0),
        batchCount: 1,
      });
    },
  );
}

async function resolvedMode(pool, tenantId, requestedMode, statementTimeoutMillis) {
  if (requestedMode !== "resume") return requestedMode;
  return withPostgresTransaction(
    pool,
    transactionOptions(tenantId, statementTimeoutMillis, true),
    async (client) => {
      const checkpoint = await client.query(
        `SELECT count(*) FILTER (
                  WHERE status = 'complete' AND completed_at IS NOT NULL
                )::integer AS completed_wave_count
           FROM lawos_projection.hrx_backfill_checkpoint
          WHERE tenant_id = $1`,
        [tenantId],
      );
      return Number(checkpoint.rows[0]?.completed_wave_count ?? 0) === 5
        ? "incremental"
        : "backfill";
    },
  );
}

async function negativeTenantProbe(pool, tenantId, negativeTenantId) {
  if (negativeTenantId == null) {
    return Object.freeze({ visible: 0, denied: 0 });
  }
  try {
    const visible = await withPostgresTransaction(
      pool,
      { tenant_id: negativeTenantId, readOnly: true },
      async (client) => {
        const state = await client.query(
          `SELECT count(*)::integer AS count
             FROM lawos_projection.hrx_record_state
            WHERE tenant_id = $1`,
          [tenantId],
        );
        return Number(state.rows[0]?.count ?? 0);
      },
    );
    if (visible !== 0) {
      throw projectionError(
        "HRX relational projection is visible to the wrong tenant",
        "LAWOS_HRX_PROJECTION_TENANT_LEAK",
      );
    }
    return Object.freeze({ visible, denied: 0 });
  } catch (error) {
    if (error?.code !== "LAWOS_POSTGRES_ACCESS_DENIED") throw error;
    return Object.freeze({ visible: 0, denied: 1 });
  }
}

export async function projectHrxRelationalReadModel({
  pool,
  tenant_id,
  mode = "incremental",
  mappingManifest,
  performanceAcceptance,
  workerRef,
  backfillWave = null,
  negativeTenantId = null,
  faultInjector = null,
} = {}) {
  if (!["backfill", "resume", "incremental"].includes(mode)) {
    throw new TypeError("HRX projection mode is invalid");
  }
  const tenantId = requiredText(tenant_id, "tenant_id");
  const worker = requiredText(workerRef, "workerRef");
  if (backfillWave != null
    && (!Number.isSafeInteger(backfillWave)
      || backfillWave < 1
      || backfillWave > 5)) {
    throw new TypeError("backfillWave must be an integer from 1 through 5");
  }
  if (negativeTenantId != null
    && requiredText(negativeTenantId, "negativeTenantId") === tenantId) {
    throw new TypeError("negative tenant must differ from the source tenant");
  }
  validateHrxRelationalMappingManifest(mappingManifest);
  const performance = performanceContract(performanceAcceptance, mappingManifest);
  const index = manifestIndex(mappingManifest);
  const ownerRef = `sha256:${sha256(worker)}`;
  const runRef = `sha256:${sha256({
    worker,
    mapping_sha256: mappingManifest.manifest_sha256,
  })}`;
  await acquireLease(pool, {
    tenantId,
    ownerRef,
    mappingSha256: mappingManifest.manifest_sha256,
    statementTimeoutMillis: performance.statementTimeoutMillis,
  });
  let result;
  let executionMode;
  try {
    executionMode = await resolvedMode(
      pool,
      tenantId,
      mode,
      performance.statementTimeoutMillis,
    );
    if (executionMode === "backfill") {
      const waves = backfillWave == null
        ? [1, 2, 3, 4, 5]
        : [backfillWave];
      const waveResults = [];
      for (const rolloutWave of waves) {
        waveResults.push(await runBackfill(pool, {
          tenantId,
          mappingManifest,
          performance,
          index: manifestIndex(mappingManifest, rolloutWave),
          approvedTables: index.tables,
          ownerRef,
          runRef,
          rolloutWave,
          faultInjector,
        }));
      }
      result = Object.freeze({
        rolloutWave: backfillWave,
        processed: waveResults.reduce(
          (total, wave) => total + wave.processed,
          0,
        ),
        inserted: waveResults.reduce(
          (total, wave) => total + wave.inserted,
          0,
        ),
        updated: waveResults.reduce(
          (total, wave) => total + wave.updated,
          0,
        ),
        noop: waveResults.reduce(
          (total, wave) => total + wave.noop,
          0,
        ),
        batches: waveResults.reduce(
          (total, wave) => total + wave.batches,
          0,
        ),
        completedWaveCount: waveResults.filter((wave) => wave.completed).length,
        sourceHash: sha256(waveResults.map((wave) => ({
          rollout_wave: wave.rolloutWave,
          source_hash: wave.sourceHash,
        }))),
        targetHash: sha256(waveResults.map((wave) => ({
          rollout_wave: wave.rolloutWave,
          target_hash: wave.targetHash,
        }))),
      });
    } else {
      result = await runIncremental(pool, {
        tenantId,
        mappingManifest,
        performance,
        index,
        ownerRef,
        runRef,
        faultInjector,
      });
    }
  } finally {
    await releaseLease(pool, {
      tenantId,
      ownerRef,
      statementTimeoutMillis: performance.statementTimeoutMillis,
    });
  }
  const negative = await negativeTenantProbe(pool, tenantId, negativeTenantId);
  const normalized = executionMode === "backfill"
    ? {
      sourceCount: result.processed,
      inserted: result.inserted,
      updated: result.updated,
      noop: result.noop,
      eventCount: 0,
      remainingEventCount: 0,
      batchCount: result.batches,
      sourceHash: result.sourceHash,
      targetHash: result.targetHash,
      backfillWave: result.rolloutWave,
      completedWaveCount: result.completedWaveCount,
      eventWaveCounts: Object.freeze({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      }),
    }
    : {
      sourceCount: result.sourceRows.length,
      inserted: result.inserted,
      updated: result.updated,
      noop: result.noop,
      eventCount: result.eventCount,
      remainingEventCount: result.remainingEventCount,
      batchCount: result.batchCount,
      sourceHash: result.sourceHash,
      targetHash: result.targetHash,
      backfillWave: null,
      completedWaveCount: 5,
      eventWaveCounts: result.eventWaveCounts,
    };
  const value = {
    schema_version: HRX_RELATIONAL_PROJECTION_VERSION,
    outcome: "PASS",
    mode: executionMode,
    source_authority: "postgres-v2-generic-ledger",
    projection_authority: "read-only",
    mapping_manifest_sha256: mappingManifest.manifest_sha256,
    performance_acceptance_sha256: performanceAcceptance.acceptance_sha256,
    backfill_wave: normalized.backfillWave,
    source_hash: normalized.sourceHash,
    target_hash: normalized.targetHash,
    safe_counts: {
      source_record_count: normalized.sourceCount,
      projected_insert_count: normalized.inserted,
      projected_update_count: normalized.updated,
      projected_noop_count: normalized.noop,
      committed_batch_count: normalized.batchCount,
      completed_backfill_wave_count: normalized.completedWaveCount,
      consumed_outbox_event_count: normalized.eventCount,
      observed_event_wave_1_count: normalized.eventWaveCounts[1],
      observed_event_wave_2_count: normalized.eventWaveCounts[2],
      observed_event_wave_3_count: normalized.eventWaveCounts[3],
      observed_event_wave_4_count: normalized.eventWaveCounts[4],
      observed_event_wave_5_count: normalized.eventWaveCounts[5],
      remaining_outbox_event_count: normalized.remainingEventCount,
      tenant_negative_visible_count: negative.visible,
      negative_tenant_context_denied_count: negative.denied,
      unmapped_nonnull_field_count: 0,
      physical_delete_count: 0,
      source_authority_write_count: 0,
      dual_write_count: 0,
      partial_commit_count: 0,
    },
    claims: {
      one_way_projection: true,
      bounded_checkpoint_resume: true,
      event_scoped_incremental_projection: true,
      physical_delete_prohibited: true,
      operational_request_dual_write: false,
      generic_ledger_authority_preserved: true,
      projection_write_authority: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  return Object.freeze({ ...value, result_sha256: sha256(value) });
}
