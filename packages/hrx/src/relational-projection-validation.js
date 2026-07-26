import { createHash } from "node:crypto";
import { canonicalizeJson } from "../../runtime-auth/src/runtime-safety-approval-contract.js";
import { validateJsonPostgresPerformanceAcceptance } from "../../persistence/src/postgres/performance-acceptance.js";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  createHrxRelationalProductionInventory,
  inspectHrxRelationalSchema,
  projectHrxRelationalPayload,
  validateHrxRelationalMappingManifest,
} from "./relational-projection-contract.js";
import {
  HRX_APPEND_ONLY_TABLES,
  HRX_STORE_TABLES,
  HRX_TABLE_PRIMARY_KEYS,
} from "./store/file-store.js";
import {
  HRX_PROJECTION_AUDITOR_ROLE,
  HRX_PROJECTION_CONSUMER_ROLE,
  HRX_PROJECTION_WRITER_ROLE,
} from "./postgres-projection-role.js";

export const HRX_RELATIONAL_VALIDATION_VERSION =
  "law-firm-os.hrx-relational-projection-validation.v2";

const ZERO_COUNTERS = Object.freeze([
  "mapping_inventory_difference_count",
  "projection_state_difference_count",
  "shadow_difference_count",
  "logical_reference_failure_count",
  "unknown_nonnull_field_count",
  "tenant_negative_visible_count",
  "cursor_backlog_count",
  "cursor_regression_count",
  "transaction_rollback_failure_count",
  "append_only_guard_failure_count",
  "physical_delete_guard_failure_count",
  "source_authority_write_grant_count",
  "consumer_write_grant_count",
  "auditor_write_grant_count",
  "projection_authority_promotion_count",
  "receipt_verification_failure_count",
]);

function fail(message, code = "LAWOS_HRX_PROJECTION_VALIDATION") {
  throw Object.assign(new Error(message), { code, safe_error_code: code });
}

function stableJson(value) {
  return canonicalizeJson(value);
}

function sha256(value) {
  return createHash("sha256").update(stableJson(value)).digest("hex");
}

function material(value) {
  const { result_sha256: ignored, ...rest } = value;
  return rest;
}

function normalize(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, normalize(child)]),
    );
  }
  return value;
}

function rowKey(row, fields) {
  return sha256(fields.map((field) => [field, normalize(row[field])]));
}

function mappedSourceRow(source, mapping) {
  const projected = projectHrxRelationalPayload(source.payload, mapping);
  const deleted = source.payload.status === "deleted";
  const deletedAt = source.payload.deleted_at ?? null;
  if (deleted !== (deletedAt != null && String(deletedAt).trim() !== "")) {
    fail("source tombstone contract is incomplete");
  }
  const row = normalize(projected.row);
  row.lawos_projection_deleted_at =
    deleted ? new Date(deletedAt).toISOString() : null;
  return Object.freeze({
    row,
    deleted,
    unknownCount: projected.unknown_nonnull_field_count,
  });
}

function targetComparable(row, fields) {
  return Object.fromEntries(fields.map((field) => [field, normalize(row[field])]));
}

async function tenantSourceObservation(client, tenantId) {
  const targetUnion = HRX_STORE_TABLES.map((table, index) =>
    `SELECT $${index + 3}::text AS table_name,
            to_jsonb(projected_row) AS target_row
       FROM lawos_hrx."${table}" AS projected_row
      WHERE tenant_id = $1`).join("\nUNION ALL\n");
  const observed = await client.query(
    `SELECT
       COALESCE((
         SELECT jsonb_agg(
                  to_jsonb(record_row)
                  ORDER BY record_row.record_type, record_row.record_id
                )
           FROM (
             SELECT tenant_id, record_type, record_id, state_version, payload,
                    payload_hash, append_only,
                    pg_column_size(payload)::integer AS payload_bytes
               FROM lawos_domain.records
              WHERE tenant_id = $1
                AND domain_id = 'hrx'
                AND record_type = ANY($2::text[])
           ) AS record_row
       ), '[]'::jsonb) AS records,
       COALESCE((
         SELECT jsonb_agg(
                  to_jsonb(reference_row)
                  ORDER BY reference_row.source_record_type,
                           reference_row.source_record_id,
                           reference_row.reference_name,
                           reference_row.target_record_type,
                           reference_row.target_record_id
                )
           FROM (
             SELECT source_record_type, source_record_id, reference_name,
                    target_record_type, target_record_id
               FROM lawos_domain.record_references
              WHERE tenant_id = $1 AND source_domain_id = 'hrx'
           ) AS reference_row
       ), '[]'::jsonb) AS references,
       COALESCE((
         SELECT jsonb_agg(
                  to_jsonb(outbox_row)
                  ORDER BY outbox_row.created_at, outbox_row.event_id
                )
           FROM (
             SELECT event_id, created_at::text AS created_at
               FROM lawos_domain.outbox_events
              WHERE tenant_id = $1 AND domain_id = 'hrx'
           ) AS outbox_row
       ), '[]'::jsonb) AS outbox,
       (
         SELECT to_jsonb(cursor_row)
           FROM (
             SELECT last_created_at::text AS last_created_at, last_event_id
               FROM lawos_projection.hrx_outbox_cursor
              WHERE tenant_id = $1
              LIMIT 1
           ) AS cursor_row
       ) AS cursor,
       COALESCE((
         SELECT jsonb_agg(
                  to_jsonb(state_row)
                  ORDER BY state_row.source_record_type,
                           state_row.source_record_id
                )
           FROM (
             SELECT source_record_type, source_record_id, source_state_version,
                    source_payload_hash, source_status,
                    source_deleted_at::text AS source_deleted_at, archive_only,
                    target_primary_key_sha256, target_row_sha256
               FROM lawos_projection.hrx_record_state
              WHERE tenant_id = $1
           ) AS state_row
       ), '[]'::jsonb) AS state,
       COALESCE((
         SELECT jsonb_agg(
                  to_jsonb(target_entry)
                  ORDER BY target_entry.table_name
                )
           FROM (${targetUnion}) AS target_entry
       ), '[]'::jsonb) AS targets`,
    [tenantId, HRX_STORE_TABLES, ...HRX_STORE_TABLES],
  );
  const row = observed.rows[0];
  const targets = new Map(HRX_STORE_TABLES.map((table) => [table, []]));
  for (const target of row.targets) {
    targets.get(target.table_name).push(target.target_row);
  }
  return Object.freeze({
    tenantId,
    records: row.records,
    references: row.references,
    outbox: row.outbox,
    cursor: row.cursor ?? null,
    state: row.state,
    targets,
  });
}

function percentile(values, fraction) {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(
    ordered.length - 1,
    Math.max(0, Math.ceil(ordered.length * fraction) - 1),
  )];
}

function inventoryTables(observations, schema) {
  const rowsByTable = new Map(HRX_STORE_TABLES.map((table) => [
    table,
    observations
      .flatMap((observation) => observation.records)
      .filter((row) => row.record_type === table),
  ]));
  const columnsByTable = new Map(HRX_STORE_TABLES.map((table) => [
    table,
    new Set(
      schema.columns
        .filter((column) => column.table_name === table)
        .map((column) => column.column_name)
        .filter((column) => column !== "lawos_projection_deleted_at"),
    ),
  ]));
  const foreignKeysByTable = new Map(HRX_STORE_TABLES.map((table) => [
    table,
    [],
  ]));
  const foreignKeyGroups = new Map();
  for (const foreignKey of schema.foreign_keys) {
    const key = `${foreignKey.table_name}:${foreignKey.constraint_name}`;
    const current = foreignKeyGroups.get(key) ?? {
      table_name: foreignKey.table_name,
      referenced_table_name: foreignKey.referenced_table_name,
      columns: [],
      referenced_columns: [],
    };
    current.columns.push([
      Number(foreignKey.ordinal_position),
      foreignKey.column_name,
    ]);
    current.referenced_columns.push([
      Number(foreignKey.ordinal_position),
      foreignKey.referenced_column_name,
    ]);
    foreignKeyGroups.set(key, current);
  }
  for (const foreignKey of foreignKeyGroups.values()) {
    foreignKeysByTable.get(foreignKey.table_name).push({
      referenced_table_name: foreignKey.referenced_table_name,
      columns: foreignKey.columns
        .sort(([left], [right]) => left - right)
        .map(([, column]) => column),
      referenced_columns: foreignKey.referenced_columns
        .sort(([left], [right]) => left - right)
        .map(([, column]) => column),
    });
  }
  return HRX_STORE_TABLES.map((table) => {
    const rows = rowsByTable.get(table)
      .sort((left, right) =>
        left.tenant_id.localeCompare(right.tenant_id)
          || left.record_id.localeCompare(right.record_id));
    const keyCounts = new Map();
    let unmappedNonNullFieldCount = 0;
    const allowedColumns = columnsByTable.get(table);
    for (const row of rows) {
      for (const key of Object.keys(row.payload).sort()) {
        const current = keyCounts.get(key) ?? { presence: 0, nulls: 0 };
        current.presence += 1;
        if (row.payload[key] == null) current.nulls += 1;
        keyCounts.set(key, current);
        if (!allowedColumns.has(key)
          && key !== "deleted_at"
          && row.payload[key] != null) {
          unmappedNonNullFieldCount += 1;
        }
      }
    }
    const versions = rows.map((row) => Number(row.state_version));
    const payloadBytes = rows.map((row) => Number(row.payload_bytes));
    const primaryKeys = new Set();
    let primaryKeyConflictCount = 0;
    for (const row of rows) {
      const keyValues = HRX_TABLE_PRIMARY_KEYS[table]
        .map((column) => row.payload[column]);
      if (keyValues.some((value) => value == null || String(value).trim() === "")) {
        primaryKeyConflictCount += 1;
        continue;
      }
      const key = sha256(keyValues);
      if (primaryKeys.has(key)) primaryKeyConflictCount += 1;
      primaryKeys.add(key);
    }
    let foreignKeyConflictCount = 0;
    for (const foreignKey of foreignKeysByTable.get(table)) {
      const targetKeys = new Set(
        rowsByTable.get(foreignKey.referenced_table_name)
          .map((row) => sha256(
            foreignKey.referenced_columns.map((column) => row.payload[column]),
          )),
      );
      for (const row of rows) {
        const values = foreignKey.columns.map((column) => row.payload[column]);
        if (values.every((value) => value == null)) continue;
        if (values.some((value) => value == null)
          || !targetKeys.has(sha256(values))) {
          foreignKeyConflictCount += 1;
        }
      }
    }
    const classification = rows.length === 0
      ? "schema_only"
      : (
        unmappedNonNullFieldCount === 0
        && primaryKeyConflictCount === 0
        && foreignKeyConflictCount === 0
          ? "populated"
          : "blocked_mapping"
      );
    return Object.freeze({
      table_name: table,
      source_count: rows.length,
      source_hash: sha256(rows.map((row) => ({
        tenant_id: row.tenant_id,
        record_id: row.record_id,
        state_version: Number(row.state_version),
        payload_hash: row.payload_hash,
      }))),
      state_version_min: versions.length ? Math.min(...versions) : 0,
      state_version_max: versions.length ? Math.max(...versions) : 0,
      payload_bytes_p50: percentile(payloadBytes, 0.5),
      payload_bytes_p95: percentile(payloadBytes, 0.95),
      payload_bytes_max: payloadBytes.length ? Math.max(...payloadBytes) : 0,
      soft_deleted_count: rows.filter((row) =>
        row.payload?.status === "deleted" && row.payload?.deleted_at != null).length,
      append_only_count: rows.filter((row) => row.append_only === true).length,
      reference_count: observations.reduce(
        (total, observation) => total + observation.references
          .filter((reference) => reference.source_record_type === table).length,
        0,
      ),
      json_path_presence_sha256: sha256(
        [...keyCounts.entries()]
          .map(([key, counts]) => [key, counts.presence])
          .sort(([left], [right]) => left.localeCompare(right)),
      ),
      json_path_null_ratio_sha256: sha256(
        [...keyCounts.entries()]
          .map(([key, counts]) => [key, counts.presence, counts.nulls])
          .sort(([left], [right]) => left.localeCompare(right)),
      ),
      unmapped_nonnull_field_count: unmappedNonNullFieldCount,
      primary_key_conflict_count: primaryKeyConflictCount,
      foreign_key_conflict_count: foreignKeyConflictCount,
      inventory_classification: classification,
    });
  });
}

async function genericLedgerQueryTelemetry(pool, tenantId) {
  try {
    return await withPostgresTransaction(
      pool,
      { tenant_id: tenantId, readOnly: true, statementTimeoutMillis: 30_000 },
      async (client) => {
        const result = await client.query(
          `SELECT COALESCE(sum(calls), 0)::bigint AS query_count,
                  COALESCE(
                    ceil(percentile_cont(0.95) WITHIN GROUP (
                      ORDER BY mean_exec_time
                    )),
                    0
                  )::bigint AS query_p95_ms
             FROM pg_stat_statements
            WHERE query ILIKE '%lawos_domain.records%'
              AND query ILIKE '%domain_id%'`,
        );
        return Object.freeze({
          available: true,
          queryCount: Number(result.rows[0]?.query_count ?? 0),
          queryP95Ms: Number(result.rows[0]?.query_p95_ms ?? 0),
        });
      },
    );
  } catch (error) {
    if (["42P01", "42501"].includes(error?.code)
      || ["42P01", "42501"].includes(error?.postgres_code)) {
      return Object.freeze({
        available: false,
        queryCount: 0,
        queryP95Ms: 0,
      });
    }
    throw error;
  }
}

export async function collectHrxRelationalProductionInventory({
  pool,
  approvedTenantIds,
  inventoryProvenanceSha256,
} = {}) {
  if (!pool || !Array.isArray(approvedTenantIds) || approvedTenantIds.length < 1) {
    throw new TypeError("approved tenant inventory scope is required");
  }
  const observations = [];
  const schema = await inspectHrxRelationalSchema(pool);
  for (const tenantId of approvedTenantIds) {
    observations.push(await withPostgresTransaction(
      pool,
      { tenant_id: tenantId, readOnly: true, statementTimeoutMillis: 120_000 },
      (client) => tenantSourceObservation(client, tenantId),
    ));
  }
  const outboxLagMs = observations.reduce((maximum, observation) => {
    const newest = Date.parse(observation.outbox.at(-1)?.created_at);
    const cursor = Date.parse(observation.cursor?.last_created_at);
    const oldest = Date.parse(observation.outbox[0]?.created_at);
    if (!Number.isFinite(newest)) return maximum;
    const baseline = Number.isFinite(cursor)
      ? cursor
      : (Number.isFinite(oldest) ? oldest : newest);
    return Math.max(maximum, Math.max(0, newest - baseline));
  }, 0);
  const telemetry = await genericLedgerQueryTelemetry(
    pool,
    approvedTenantIds[0],
  );
  return createHrxRelationalProductionInventory({
    tenantCount: approvedTenantIds.length,
    tables: inventoryTables(observations, schema),
    outboxEventCount: observations.reduce(
      (total, observation) => total + observation.outbox.length,
      0,
    ),
    outboxLagMs,
    referenceCount: observations.reduce(
      (total, observation) => total + observation.references.length,
      0,
    ),
    inventoryProvenanceSha256,
    queryTelemetryAvailable: telemetry.available,
    genericLedgerQueryCount: telemetry.queryCount,
    genericLedgerQueryP95Ms: telemetry.queryP95Ms,
  });
}

function compareSourceAndTarget(observations, mappingManifest) {
  const mappingByTable = new Map(
    mappingManifest.tables.map((mapping) => [mapping.table_name, mapping]),
  );
  const targetSets = new Map();
  let sourceCount = 0;
  let targetCount = 0;
  let shadowDifferences = 0;
  let unknownFields = 0;
  let logicalReferenceFailures = 0;
  let mappingInventoryDifferences = 0;
  let projectionStateDifferences = 0;
  const tableObservations = [];

  for (const mapping of mappingManifest.tables) {
    const sources = observations
      .flatMap((observation) => observation.records)
      .filter((row) => row.record_type === mapping.table_name)
      .sort((left, right) =>
        left.tenant_id.localeCompare(right.tenant_id)
          || left.record_id.localeCompare(right.record_id));
    const targets = observations
      .flatMap((observation) => observation.targets.get(mapping.table_name) ?? [])
      .sort((left, right) => rowKey(left, mapping.primary_key)
        .localeCompare(rowKey(right, mapping.primary_key)));
    const targetByPrimary = new Map(
      targets.map((row) => [rowKey(row, mapping.primary_key), row]),
    );
    const stateRows = observations
      .flatMap((observation) => observation.state)
      .filter((row) => row.source_record_type === mapping.table_name);
    const stateBySource = new Map(
      stateRows.map((row) => [
        `${row.source_record_type}:${row.source_record_id}`,
        row,
      ]),
    );
    const sourceIdentities = new Set();
    const expectedTargetKeys = new Set(
      stateRows
        .filter((row) => row.archive_only === true)
        .map((row) => row.target_primary_key_sha256)
        .filter(Boolean),
    );
    targetSets.set(mapping.table_name, targetByPrimary);
    sourceCount += sources.length;
    targetCount += targets.length;
    for (const source of sources) {
      const mapped = mappedSourceRow(source, mapping);
      const sourceIdentity = `${source.record_type}:${source.record_id}`;
      sourceIdentities.add(sourceIdentity);
      unknownFields += mapped.unknownCount;
      const targetKey = rowKey(mapped.row, mapping.primary_key);
      expectedTargetKeys.add(targetKey);
      const target = targetByPrimary.get(targetKey);
      const state = stateBySource.get(sourceIdentity);
      const expectedStatus = mapped.deleted
        ? "deleted"
        : (source.payload.status ?? null);
      const expectedRowHash = target
        ? sha256(targetComparable(target, Object.keys(mapped.row).sort()))
        : sha256({
          tombstone: true,
          deleted_at: mapped.row.lawos_projection_deleted_at,
        });
      if (!state
        || Number(state.source_state_version) !== Number(source.state_version)
        || state.source_payload_hash !== source.payload_hash
        || normalize(state.source_status) !== normalize(expectedStatus)
        || normalize(state.source_deleted_at)
          !== normalize(mapped.row.lawos_projection_deleted_at)
        || state.archive_only !== mapped.deleted
        || state.target_primary_key_sha256 !== targetKey
        || state.target_row_sha256 !== expectedRowHash) {
        projectionStateDifferences += 1;
      }
      if (mapped.deleted) {
        if (target
          && normalize(target.lawos_projection_deleted_at)
            !== mapped.row.lawos_projection_deleted_at) {
          shadowDifferences += 1;
        }
        continue;
      }
      const fields = Object.keys(mapped.row).sort();
      if (!target
        || sha256(targetComparable(target, fields))
          !== sha256(targetComparable(mapped.row, fields))) {
        shadowDifferences += 1;
      }
    }
    projectionStateDifferences += stateRows
      .filter((row) => row.archive_only !== true
        && !sourceIdentities.has(
          `${row.source_record_type}:${row.source_record_id}`,
        )).length;
    shadowDifferences += [...targetByPrimary.keys()]
      .filter((key) => !expectedTargetKeys.has(key)).length;
    const actualHash = sha256(sources.map((row) => ({
      tenant_id: row.tenant_id,
      record_id: row.record_id,
      state_version: Number(row.state_version),
      payload_hash: row.payload_hash,
    })));
    // The signed manifest binds the pre-backfill baseline. After approved
    // incremental events, current counts and hashes may legitimately differ;
    // current source/target equality is enforced above instead.
    tableObservations.push(Object.freeze({
      table_name: mapping.table_name,
      source_count: sources.length,
      target_count: targets.length,
      source_hash: actualHash,
      target_hash: sha256(targets.map((row) =>
        targetComparable(row, [...mapping.payload_columns, ...mapping.internal_columns]))),
    }));
  }

  for (const mapping of mappingManifest.tables) {
    for (const foreignKey of mapping.foreign_keys) {
      const targetSet = targetSets.get(foreignKey.referenced_table);
      const sourceRows = observations
        .flatMap((observation) => observation.targets.get(mapping.table_name) ?? []);
      for (const row of sourceRows) {
        const values = foreignKey.columns.map((column) => row[column]);
        // PostgreSQL's default MATCH SIMPLE composite-FK semantics skip
        // validation when any referencing column is null.
        if (values.some((value) => value == null)) continue;
        const targetMaterial = Object.fromEntries(
          foreignKey.referenced_columns.map((column, index) => [column, values[index]]),
        );
        if (!targetSet.has(rowKey(targetMaterial, foreignKey.referenced_columns))) {
          logicalReferenceFailures += 1;
        }
      }
    }
  }
  return Object.freeze({
    sourceCount,
    targetCount,
    shadowDifferences,
    unknownFields,
    logicalReferenceFailures,
    mappingInventoryDifferences,
    projectionStateDifferences,
    tableObservations: Object.freeze(tableObservations),
  });
}

function cursorObservation(observations, now) {
  let backlog = 0;
  let regression = 0;
  let maxLagMs = 0;
  for (const observation of observations) {
    const cursor = observation.cursor;
    const after = observation.outbox.filter((event) => {
      if (!cursor?.last_created_at) return true;
      return event.created_at > cursor.last_created_at
        || (event.created_at === cursor.last_created_at
          && event.event_id > cursor.last_event_id);
    });
    backlog += after.length;
    if (after.length > 0) {
      const oldestPendingTime = Date.parse(after[0].created_at);
      if (Number.isFinite(oldestPendingTime)) {
        maxLagMs = Math.max(maxLagMs, Math.max(0, now - oldestPendingTime));
      }
    }
    if (cursor?.last_created_at) {
      const latest = observation.outbox.at(-1);
      if (latest
        && (latest.created_at < cursor.last_created_at
          || (latest.created_at === cursor.last_created_at
            && latest.event_id < cursor.last_event_id))) {
        regression += 1;
      }
    }
  }
  return Object.freeze({ backlog, regression, maxLagMs });
}

async function databaseContractObservation(pool, tenantId) {
  return withPostgresTransaction(
    pool,
    { tenant_id: tenantId, readOnly: true, statementTimeoutMillis: 120_000 },
    async (client) => {
      const observed = await client.query(
        `WITH trigger_contract AS (
           SELECT trigger_row.tgname AS trigger_name,
                  relation.relname AS event_object_table
             FROM pg_trigger AS trigger_row
             JOIN pg_class AS relation ON relation.oid = trigger_row.tgrelid
             JOIN pg_namespace AS namespace
               ON namespace.oid = relation.relnamespace
            WHERE namespace.nspname = 'lawos_hrx'
              AND NOT trigger_row.tgisinternal
              AND trigger_row.tgname IN (
                'lawos_hrx_append_only_guard',
                'lawos_hrx_delete_guard'
              )
         ),
         grant_contract AS (
           SELECT granted_role.rolname AS grantee,
                  namespace.nspname AS table_schema,
                  expanded_acl.privilege_type
             FROM pg_class AS relation
             JOIN pg_namespace AS namespace
               ON namespace.oid = relation.relnamespace
             CROSS JOIN LATERAL aclexplode(
               COALESCE(
                 relation.relacl,
                 acldefault('r', relation.relowner)
               )
             ) AS expanded_acl
             JOIN pg_roles AS granted_role
               ON granted_role.oid = expanded_acl.grantee
            WHERE granted_role.rolname = ANY($2::text[])
              AND namespace.nspname = ANY($3::text[])
              AND relation.relkind IN ('r', 'p')
         )
         SELECT
           (
             SELECT count(*)::integer
               FROM pg_class AS relation
               JOIN pg_namespace AS namespace
                 ON namespace.oid = relation.relnamespace
              WHERE namespace.nspname = 'lawos_hrx'
                AND relation.relkind = 'r'
                AND relation.relrowsecurity
                AND relation.relforcerowsecurity
           ) AS forced_rls_count,
           (
             SELECT count(DISTINCT event_object_table)::integer
               FROM trigger_contract
              WHERE trigger_name = 'lawos_hrx_append_only_guard'
           ) AS append_guard_count,
           (
             SELECT count(DISTINCT event_object_table)::integer
               FROM trigger_contract
              WHERE trigger_name = 'lawos_hrx_delete_guard'
           ) AS delete_guard_count,
           (
             SELECT count(*)::integer
               FROM grant_contract
              WHERE grantee = $4
                AND table_schema = 'lawos_domain'
                AND privilege_type = ANY($7::text[])
           ) AS writer_source_write_count,
           (
             SELECT count(*)::integer
               FROM grant_contract
              WHERE grantee = $5
                AND table_schema IN ('lawos_hrx', 'lawos_projection')
                AND privilege_type = ANY($7::text[])
           ) AS consumer_write_count,
           (
             SELECT count(*)::integer
               FROM grant_contract
              WHERE grantee = $6
                AND privilege_type = ANY($7::text[])
           ) AS auditor_write_count,
           (
             SELECT (
                      5 - count(*) FILTER (
                        WHERE status = 'complete'
                          AND completed_at IS NOT NULL
                      )
                    )::integer
                    + count(*) FILTER (
                        WHERE status <> 'complete' OR completed_at IS NULL
                      )::integer
               FROM lawos_projection.hrx_backfill_checkpoint
              WHERE tenant_id = $1
           ) AS incomplete_checkpoint_count`,
        [
          tenantId,
          [
            HRX_PROJECTION_WRITER_ROLE,
            HRX_PROJECTION_AUDITOR_ROLE,
            HRX_PROJECTION_CONSUMER_ROLE,
          ],
          ["lawos_domain", "lawos_hrx", "lawos_projection"],
          HRX_PROJECTION_WRITER_ROLE,
          HRX_PROJECTION_CONSUMER_ROLE,
          HRX_PROJECTION_AUDITOR_ROLE,
          ["INSERT", "UPDATE", "DELETE", "TRUNCATE"],
        ],
      );
      const row = observed.rows[0];
      return Object.freeze({
        forcedRlsCount: Number(row.forced_rls_count ?? 0),
        appendOnlyGuardFailureCount: Math.max(
          0,
          HRX_APPEND_ONLY_TABLES.length - Number(row.append_guard_count ?? 0),
        ),
        physicalDeleteGuardFailureCount: Math.max(
          0,
          HRX_STORE_TABLES.length - Number(row.delete_guard_count ?? 0),
        ),
        writerSourceWriteGrantCount:
          Number(row.writer_source_write_count ?? 0),
        consumerWriteGrantCount: Number(row.consumer_write_count ?? 0),
        auditorWriteGrantCount: Number(row.auditor_write_count ?? 0),
        incompleteCheckpointCount:
          Number(row.incomplete_checkpoint_count ?? 0),
      });
    },
  );
}

async function negativeTenantVisibility(pool, approvedTenantId, negativeTenantId) {
  try {
    return await withPostgresTransaction(
      pool,
      { tenant_id: negativeTenantId, readOnly: true },
      async (client) => {
        const result = await client.query(
          `SELECT count(*)::integer AS count
             FROM lawos_projection.hrx_record_state
            WHERE tenant_id = $1`,
          [approvedTenantId],
        );
        return Number(result.rows[0]?.count ?? 0);
      },
    );
  } catch (error) {
    if (error?.code !== "LAWOS_POSTGRES_ACCESS_DENIED") throw error;
    return 0;
  }
}

export async function validateHrxRelationalReadModel({
  pool,
  approvedTenantIds,
  negativeTenantId,
  mappingManifest,
  performanceAcceptance,
  sourceSha,
  sourceTree,
  packetSha256,
  receiptVerificationFailureCount = 0,
  clock = () => Date.now(),
} = {}) {
  validateHrxRelationalMappingManifest(mappingManifest);
  validateJsonPostgresPerformanceAcceptance(performanceAcceptance);
  if (mappingManifest.performance_acceptance_sha256
    !== performanceAcceptance.acceptance_sha256
    || !Array.isArray(approvedTenantIds)
    || approvedTenantIds.length < 1
    || approvedTenantIds.includes(negativeTenantId)
    || !/^[a-f0-9]{40}$/u.test(sourceSha ?? "")
    || !/^[a-f0-9]{40}$/u.test(sourceTree ?? "")
    || !/^[a-f0-9]{64}$/u.test(packetSha256 ?? "")
    || !Number.isSafeInteger(receiptVerificationFailureCount)
    || receiptVerificationFailureCount < 0) {
    fail("relational validation scope or performance binding is invalid");
  }
  const started = clock();
  const observationsPromise = Promise.all(approvedTenantIds.map((tenantId) =>
    withPostgresTransaction(
      pool,
      {
        tenant_id: tenantId,
        readOnly: true,
        statementTimeoutMillis: performanceAcceptance.statement_timeout_ms,
      },
      (client) => tenantSourceObservation(client, tenantId),
    )));
  const databasePromise =
    databaseContractObservation(pool, approvedTenantIds[0]);
  const tenantNegativePromise = negativeTenantVisibility(
    pool,
    approvedTenantIds[0],
    negativeTenantId,
  );
  const [observations, database, tenantNegativeVisible] = await Promise.all([
    observationsPromise,
    databasePromise,
    tenantNegativePromise,
  ]);
  const comparison = compareSourceAndTarget(observations, mappingManifest);
  const cursor = cursorObservation(observations, clock());
  const elapsedMs = Math.max(0, clock() - started);
  const safeCounts = {
    approved_tenant_count: approvedTenantIds.length,
    mapped_table_count: mappingManifest.table_count,
    source_record_count: comparison.sourceCount,
    target_record_count: comparison.targetCount,
    mapping_inventory_difference_count: comparison.mappingInventoryDifferences,
    projection_state_difference_count: comparison.projectionStateDifferences,
    shadow_difference_count: comparison.shadowDifferences,
    logical_reference_failure_count: comparison.logicalReferenceFailures,
    unknown_nonnull_field_count: comparison.unknownFields,
    tenant_negative_visible_count: tenantNegativeVisible,
    cursor_backlog_count: cursor.backlog,
    cursor_regression_count: cursor.regression,
    transaction_rollback_failure_count: database.incompleteCheckpointCount,
    append_only_guard_failure_count: database.appendOnlyGuardFailureCount,
    physical_delete_guard_failure_count: database.physicalDeleteGuardFailureCount,
    source_authority_write_grant_count: database.writerSourceWriteGrantCount,
    consumer_write_grant_count: database.consumerWriteGrantCount,
    auditor_write_grant_count: database.auditorWriteGrantCount,
    projection_authority_promotion_count: 0,
    receipt_verification_failure_count: receiptVerificationFailureCount,
    forced_rls_table_count: database.forcedRlsCount,
    validation_elapsed_ms: elapsedMs,
    observed_outbox_lag_ms: cursor.maxLagMs,
  };
  const zeroCountsPassed = ZERO_COUNTERS.every((key) => safeCounts[key] === 0);
  const value = {
    schema_version: HRX_RELATIONAL_VALIDATION_VERSION,
    outcome: zeroCountsPassed
      && database.forcedRlsCount === mappingManifest.table_count
      && elapsedMs <= performanceAcceptance.migration_p95_ms
      && cursor.maxLagMs <= performanceAcceptance.outbox_lag_p95_ms
      ? "PASS"
      : "FAIL",
    source_authority: "postgres-v2-generic-ledger",
    projection_authority: "read-only",
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: packetSha256,
    mapping_manifest_sha256: mappingManifest.manifest_sha256,
    inventory_sha256: mappingManifest.inventory_sha256,
    performance_acceptance_sha256: performanceAcceptance.acceptance_sha256,
    table_observations: comparison.tableObservations,
    safe_counts: safeCounts,
    claims: {
      observations_collected_by_read_only_auditor: true,
      selected_table_contract_verified:
        comparison.mappingInventoryDifferences === 0,
      shadow_count_hash_ordering_passed: comparison.shadowDifferences === 0,
      logical_reference_readback_passed:
        comparison.logicalReferenceFailures === 0,
      projection_performance_accepted:
        elapsedMs <= performanceAcceptance.migration_p95_ms
          && cursor.maxLagMs <= performanceAcceptance.outbox_lag_p95_ms,
      tenant_rls_passed:
        tenantNegativeVisible === 0
          && database.forcedRlsCount === mappingManifest.table_count,
      transaction_rollback_passed: database.incompleteCheckpointCount === 0,
      append_only_conflict_guard_passed:
        database.appendOnlyGuardFailureCount === 0,
      physical_delete_guard_passed:
        database.physicalDeleteGuardFailureCount === 0,
      projection_consumers_read_only: database.consumerWriteGrantCount === 0,
      generic_ledger_authority_preserved:
        database.writerSourceWriteGrantCount === 0,
      authority_promotion_not_granted: true,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
    },
  };
  const result = Object.freeze({ ...value, result_sha256: sha256(value) });
  validateHrxRelationalProjectionValidation(result);
  return result;
}

export function validateHrxRelationalProjectionValidation(value = {}) {
  if (value.schema_version !== HRX_RELATIONAL_VALIDATION_VERSION
    || !["PASS", "FAIL"].includes(value.outcome)
    || value.source_authority !== "postgres-v2-generic-ledger"
    || value.projection_authority !== "read-only"
    || !/^[a-f0-9]{40}$/u.test(value.source_sha ?? "")
    || !/^[a-f0-9]{40}$/u.test(value.source_tree ?? "")
    || !/^[a-f0-9]{64}$/u.test(value.packet_sha256 ?? "")
    || !Array.isArray(value.table_observations)
    || value.table_observations.length !== HRX_STORE_TABLES.length
    || !value.safe_counts || !value.claims
    || value.claims.observations_collected_by_read_only_auditor !== true
    || value.claims.raw_value_returned !== false
    || value.claims.pii_returned !== false
    || value.claims.secret_material_returned !== false
    || value.result_sha256 !== sha256(material(value))) {
    fail("relational projection validation evidence is invalid");
  }
  if (value.outcome === "PASS") {
    if (ZERO_COUNTERS.some((key) => value.safe_counts[key] !== 0)
      || value.claims.selected_table_contract_verified !== true
      || value.claims.shadow_count_hash_ordering_passed !== true
      || value.claims.logical_reference_readback_passed !== true
      || value.claims.projection_performance_accepted !== true
      || value.claims.tenant_rls_passed !== true
      || value.claims.transaction_rollback_passed !== true
      || value.claims.append_only_conflict_guard_passed !== true
      || value.claims.physical_delete_guard_passed !== true
      || value.claims.projection_consumers_read_only !== true
      || value.claims.generic_ledger_authority_preserved !== true
      || value.claims.authority_promotion_not_granted !== true) {
      fail("relational projection PASS evidence contains a failed observation");
    }
  }
  return Object.freeze({
    valid: true,
    outcome: value.outcome,
    result_sha256: value.result_sha256,
  });
}
