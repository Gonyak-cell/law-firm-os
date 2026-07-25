import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  hrxRelationalMappingTable,
  validateHrxRelationalMappingManifest,
} from "./relational-projection-contract.js";
import {
  validateHrxRelationalProjectionValidation,
} from "./relational-projection-validation.js";

export const HRX_RELATIONAL_READER_VERSION =
  "law-firm-os.hrx-relational-projection-reader.v1";
export const HRX_RELATIONAL_QUERY_FAMILIES = Object.freeze([
  "shadow-only",
  "core-employee-roster",
  "recruiting-lifecycle",
  "leave-attendance",
  "payroll-compensation",
]);

const FALLBACK_CODES = new Set([
  "LAWOS_HRX_PROJECTION_READER_DISABLED",
  "LAWOS_HRX_PROJECTION_READER_STALE",
  "LAWOS_HRX_PROJECTION_READER_BACKLOG",
  "LAWOS_HRX_PROJECTION_READER_BINDING",
]);
const FAMILY_BY_WAVE = Object.freeze({
  1: "core-employee-roster",
  2: "recruiting-lifecycle",
  3: "leave-attendance",
  4: "payroll-compensation",
});
const MAX_READ_ROWS = 5_000;

function readerError(message, code) {
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
  if (!/^[a-z_][a-z0-9_]*$/u.test(text)) {
    throw new TypeError("unsafe SQL identifier");
  }
  return `"${text}"`;
}

function queryFamilyForMapping(mapping) {
  return FAMILY_BY_WAVE[mapping.rollout_wave] ?? null;
}

export function hrxRelationalQueryFamily(mappingManifest, tableName) {
  validateHrxRelationalMappingManifest(mappingManifest);
  const mapping = hrxRelationalMappingTable(mappingManifest, tableName);
  if (!mapping) {
    throw readerError(
      "HRX relational read requested an unapproved table",
      "LAWOS_HRX_PROJECTION_READER_TABLE",
    );
  }
  return queryFamilyForMapping(mapping);
}

export function isHrxProjectionFallbackError(error) {
  return FALLBACK_CODES.has(error?.code ?? error?.safe_error_code);
}

export async function activateHrxProjectionConsumerRoute(client, {
  tenantId,
  queryFamily,
  rolloutWave,
  mappingManifest,
  validationEvidence,
  maxStalenessMs,
  clock = () => Date.now(),
} = {}) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL admin client is required");
  }
  validateHrxRelationalMappingManifest(mappingManifest);
  validateHrxRelationalProjectionValidation(validationEvidence);
  const tenant = requiredText(tenantId, "tenantId");
  if (!HRX_RELATIONAL_QUERY_FAMILIES.includes(queryFamily)
    || queryFamily === "shadow-only"
    || !Number.isSafeInteger(rolloutWave)
    || rolloutWave < 1
    || rolloutWave > 4
    || FAMILY_BY_WAVE[rolloutWave] !== queryFamily
    || validationEvidence.outcome !== "PASS"
    || validationEvidence.mapping_manifest_sha256
      !== mappingManifest.manifest_sha256
    || !Number.isSafeInteger(maxStalenessMs)
    || maxStalenessMs < 1
    || maxStalenessMs > 3_600_000) {
    throw readerError(
      "HRX relational consumer route is not backed by an exact PASS validation",
      "LAWOS_HRX_PROJECTION_READER_BINDING",
    );
  }
  const priorRoutes = await client.query(
    `SELECT rollout_wave
       FROM lawos_projection.hrx_consumer_route
      WHERE tenant_id = $1
        AND enabled = true
        AND rollout_wave < $2
      ORDER BY rollout_wave`,
    [tenant, rolloutWave],
  );
  const enabledPriorWaves = new Set(
    priorRoutes.rows.map((row) => Number(row.rollout_wave)),
  );
  if (Array.from(
    { length: Math.max(0, rolloutWave - 1) },
    (_, index) => index + 1,
  ).some((wave) => !enabledPriorWaves.has(wave))) {
    throw readerError(
      "HRX relational consumer rollout skipped a prior wave",
      "LAWOS_HRX_PROJECTION_READER_SEQUENCE",
    );
  }
  await client.query(
    `INSERT INTO lawos_projection.hrx_consumer_route
       (tenant_id, query_family, rollout_wave, enabled, mapping_sha256,
        validation_result_sha256, max_staleness_ms, verified_at)
     VALUES ($1, $2, $3, true, $4, $5, $6, $7)
     ON CONFLICT (tenant_id, query_family) DO UPDATE
       SET rollout_wave = EXCLUDED.rollout_wave,
           enabled = true,
           mapping_sha256 = EXCLUDED.mapping_sha256,
           validation_result_sha256 = EXCLUDED.validation_result_sha256,
           max_staleness_ms = EXCLUDED.max_staleness_ms,
           verified_at = EXCLUDED.verified_at,
           updated_at = clock_timestamp()`,
    [
      tenant,
      queryFamily,
      rolloutWave,
      mappingManifest.manifest_sha256,
      validationEvidence.result_sha256,
      maxStalenessMs,
      new Date(clock()).toISOString(),
    ],
  );
  return Object.freeze({
    query_family: queryFamily,
    rollout_wave: rolloutWave,
    enabled: true,
    mapping_sha256: mappingManifest.manifest_sha256,
    validation_result_sha256: validationEvidence.result_sha256,
    authority_promoted: false,
  });
}

export async function disableHrxProjectionConsumerRoutes(client, {
  tenantId,
} = {}) {
  if (!client || typeof client.query !== "function") {
    throw new TypeError("PostgreSQL admin client is required");
  }
  const result = await client.query(
    `UPDATE lawos_projection.hrx_consumer_route
        SET enabled = false, updated_at = clock_timestamp()
      WHERE tenant_id = $1 AND enabled = true`,
    [requiredText(tenantId, "tenantId")],
  );
  return Object.freeze({
    disabled_route_count: Number(result.rowCount ?? 0),
    generic_ledger_fallback: true,
    projection_rows_deleted: false,
  });
}

async function assertRouteReady(client, {
  tenantId,
  queryFamily,
  mappingManifest,
  clock,
} = {}) {
  const route = await client.query(
    `SELECT enabled, mapping_sha256, validation_result_sha256,
            max_staleness_ms, verified_at::text AS verified_at
       FROM lawos_projection.hrx_consumer_route
      WHERE tenant_id = $1 AND query_family = $2`,
    [tenantId, queryFamily],
  );
  const value = route.rows[0];
  if (value?.enabled !== true) {
    throw readerError(
      "HRX relational consumer route is disabled",
      "LAWOS_HRX_PROJECTION_READER_DISABLED",
    );
  }
  if (value.mapping_sha256 !== mappingManifest.manifest_sha256
    || !/^[a-f0-9]{64}$/u.test(value.validation_result_sha256 ?? "")) {
    throw readerError(
      "HRX relational consumer route binding drifted",
      "LAWOS_HRX_PROJECTION_READER_BINDING",
    );
  }
  const verifiedAt = Date.parse(value.verified_at);
  if (!Number.isFinite(verifiedAt)
    || clock() - verifiedAt > Number(value.max_staleness_ms)) {
    throw readerError(
      "HRX relational consumer route validation is stale",
      "LAWOS_HRX_PROJECTION_READER_STALE",
    );
  }
  const readiness = await client.query(
    `SELECT count(*) FILTER (
                WHERE checkpoint.status = 'complete'
                  AND checkpoint.completed_at IS NOT NULL
              )::integer AS completed_wave_count,
            count(*) FILTER (
                WHERE checkpoint.mapping_sha256 <> $2
              )::integer AS mapping_drift_count,
            (
              SELECT count(*)::integer
                FROM lawos_domain.outbox_events AS event
               WHERE event.tenant_id = $1
                 AND event.domain_id = 'hrx'
                 AND (
                   cursor.last_created_at IS NULL
                   OR (event.created_at, event.event_id)
                      > (cursor.last_created_at, cursor.last_event_id)
                 )
            ) AS backlog_count
       FROM lawos_projection.hrx_backfill_checkpoint AS checkpoint
       LEFT JOIN lawos_projection.hrx_outbox_cursor AS cursor
         ON cursor.tenant_id = checkpoint.tenant_id
      WHERE checkpoint.tenant_id = $1
      GROUP BY cursor.last_created_at, cursor.last_event_id`,
    [tenantId, mappingManifest.manifest_sha256],
  );
  const checkpoint = readiness.rows[0];
  if (Number(checkpoint?.completed_wave_count ?? 0) !== 5
    || Number(checkpoint?.mapping_drift_count ?? 0) !== 0) {
    throw readerError(
      "HRX relational consumer route checkpoint drifted",
      "LAWOS_HRX_PROJECTION_READER_BINDING",
    );
  }
  if (Number(checkpoint.backlog_count ?? 0) !== 0) {
    throw readerError(
      "HRX relational consumer route has an outbox backlog",
      "LAWOS_HRX_PROJECTION_READER_BACKLOG",
    );
  }
}

export function createHrxRelationalProjectionReader({
  pool,
  mappingManifest,
  clock = () => Date.now(),
} = {}) {
  if (!pool || typeof pool.connect !== "function") {
    throw new TypeError("PostgreSQL projection consumer pool is required");
  }
  validateHrxRelationalMappingManifest(mappingManifest);

  async function query(operation, params = {}) {
    if (!["select", "selectOne"].includes(operation)) {
      throw readerError(
        "HRX relational projection consumer is read-only",
        "LAWOS_HRX_PROJECTION_READER_WRITE",
      );
    }
    const tenantId = requiredText(
      params.tenant_id ?? params.where?.tenant_id,
      "tenant_id",
    );
    if (params.where?.tenant_id != null
      && params.where.tenant_id !== tenantId) {
      throw readerError(
        "HRX relational projection consumer tenant drifted",
        "LAWOS_HRX_PROJECTION_READER_TENANT_DRIFT",
      );
    }
    const mapping = hrxRelationalMappingTable(
      mappingManifest,
      requiredText(params.table, "table"),
    );
    if (!mapping) {
      throw readerError(
        "HRX relational read requested an unapproved table",
        "LAWOS_HRX_PROJECTION_READER_TABLE",
      );
    }
    const queryFamily = queryFamilyForMapping(mapping);
    if (!queryFamily) {
      throw readerError(
        "HRX relational table is not in an approved consumer query family",
        "LAWOS_HRX_PROJECTION_READER_DISABLED",
      );
    }
    const allowedColumns = new Set(mapping.payload_columns);
    const filters = Object.entries(params.where ?? {})
      .filter(([key]) => key !== "tenant_id");
    if (filters.some(([key]) => !allowedColumns.has(key))) {
      throw readerError(
        "HRX relational read contains an unmapped filter",
        "LAWOS_HRX_PROJECTION_READER_FILTER",
      );
    }
    return withPostgresTransaction(
      pool,
      { tenant_id: tenantId, readOnly: true },
      async (client) => {
        await assertRouteReady(client, {
          tenantId,
          queryFamily,
          mappingManifest,
          clock,
        });
        const values = [tenantId, ...filters.map(([, value]) => value)];
        const predicates = [
          `"tenant_id" = $1`,
          "lawos_projection_deleted_at IS NULL",
          ...filters.map(([key], index) =>
            `${quoteIdentifier(key)} = $${index + 2}`),
        ];
        const result = await client.query(
          `SELECT ${mapping.payload_columns.map(quoteIdentifier).join(", ")}
             FROM lawos_hrx.${quoteIdentifier(mapping.table_name)}
            WHERE ${predicates.join(" AND ")}
            ORDER BY ${mapping.primary_key.map(quoteIdentifier).join(", ")}
            LIMIT ${operation === "selectOne" ? 2 : MAX_READ_ROWS}`,
          values,
        );
        if (operation === "selectOne" && result.rowCount > 1) {
          throw readerError(
            "HRX relational selectOne is not unique",
            "LAWOS_HRX_PROJECTION_READER_NOT_UNIQUE",
          );
        }
        return operation === "selectOne"
          ? (result.rows[0] ?? undefined)
          : result.rows;
      },
    );
  }

  return Object.freeze({
    kind: "hrx-relational-projection-reader",
    version: HRX_RELATIONAL_READER_VERSION,
    authority: "read-model-only",
    fallback_authority: "postgres-v2-generic-ledger",
    query,
  });
}

export function createHrxProjectionReadRouter({
  projectionReader,
  genericLedgerRead,
} = {}) {
  if (!projectionReader || typeof projectionReader.query !== "function"
    || typeof genericLedgerRead !== "function") {
    throw new TypeError("projection reader and generic PostgreSQL fallback are required");
  }
  return Object.freeze({
    authority: "postgres-v2",
    projection_authority: "read-model-only",
    json_fallback: false,
    async query(operation, params) {
      if (!["select", "selectOne"].includes(operation)) {
        return genericLedgerRead(operation, params);
      }
      try {
        return await projectionReader.query(operation, params);
      } catch (error) {
        if (!isHrxProjectionFallbackError(error)) throw error;
        return genericLedgerRead(operation, params);
      }
    },
  });
}
