import { createHash } from "node:crypto";
import { withPostgresTransaction } from "../../persistence/src/postgres/transaction.js";
import {
  HRX_APPEND_ONLY_TABLES,
  HRX_STORE_TABLES,
  HRX_TABLE_PRIMARY_KEYS,
} from "./store/file-store.js";

export const HRX_RELATIONAL_PROJECTION_VERSION = "law-firm-os.hrx-relational-read-projection.v1";

const TABLES = new Set(HRX_STORE_TABLES);
const APPEND_ONLY = new Set(HRX_APPEND_ONLY_TABLES);

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
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`;
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
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalizeValue(entry)]));
  }
  return value;
}

function rowForColumns(payload, columns, table) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError(`HRX projection payload must be an object: ${table}`);
  }
  const row = Object.fromEntries(Object.entries(payload).filter(([key]) => columns.has(key)));
  const primaryKey = HRX_TABLE_PRIMARY_KEYS[table];
  for (const key of primaryKey) {
    if (!columns.has(key) || row[key] == null || String(row[key]).trim() === "") {
      throw new TypeError(`HRX projection primary key is missing: ${table}.${key}`);
    }
  }
  if (row.tenant_id == null) throw new TypeError(`HRX projection tenant is missing: ${table}`);
  return row;
}

async function tableColumns(client) {
  const result = await client.query(
    `SELECT table_name, column_name
       FROM information_schema.columns
      WHERE table_schema = 'lawos_hrx'
        AND table_name = ANY($1::text[])
      ORDER BY table_name, ordinal_position`,
    [HRX_STORE_TABLES],
  );
  const byTable = new Map(HRX_STORE_TABLES.map((table) => [table, new Set()]));
  for (const row of result.rows) byTable.get(row.table_name)?.add(row.column_name);
  for (const [table, columns] of byTable) {
    if (columns.size === 0) throw new Error(`HRX relational projection table is missing: ${table}`);
  }
  return byTable;
}

async function readTargetRow(client, table, primaryKey, row) {
  const where = primaryKey.map((key, index) => `${quoteIdentifier(key)} = $${index + 1}`).join(" AND ");
  const result = await client.query(
    `SELECT * FROM lawos_hrx.${quoteIdentifier(table)} WHERE ${where}`,
    primaryKey.map((key) => row[key]),
  );
  if (result.rowCount > 1) throw new Error(`HRX projection primary key is not unique: ${table}`);
  return result.rows[0] ?? null;
}

function comparableRow(row, sourceKeys) {
  return Object.fromEntries(sourceKeys.map((key) => [key, normalizeValue(row?.[key])]));
}

async function writeTargetRow(client, { table, primaryKey, row, existing }) {
  const keys = Object.keys(row).sort();
  const sourceHash = sha256(comparableRow(row, keys));
  if (existing) {
    const targetHash = sha256(comparableRow(existing, keys));
    if (targetHash === sourceHash) return "noop";
    if (APPEND_ONLY.has(table)) {
      const error = new Error(`append-only HRX projection row differs from its source: ${table}`);
      error.code = "LAWOS_HRX_PROJECTION_APPEND_ONLY_CONFLICT";
      throw error;
    }
    const mutable = keys.filter((key) => !primaryKey.includes(key));
    if (mutable.length === 0) throw new Error(`HRX projection row has no mutable columns: ${table}`);
    const values = mutable.map((key) => row[key]);
    const whereOffset = mutable.length;
    await client.query(
      `UPDATE lawos_hrx.${quoteIdentifier(table)}
          SET ${mutable.map((key, index) => `${quoteIdentifier(key)} = $${index + 1}`).join(", ")}
        WHERE ${primaryKey.map((key, index) => `${quoteIdentifier(key)} = $${whereOffset + index + 1}`).join(" AND ")}`,
      [...values, ...primaryKey.map((key) => row[key])],
    );
    return "updated";
  }
  await client.query(
    `INSERT INTO lawos_hrx.${quoteIdentifier(table)}
       (${keys.map(quoteIdentifier).join(", ")})
     VALUES (${keys.map((_, index) => `$${index + 1}`).join(", ")})`,
    keys.map((key) => row[key]),
  );
  return "inserted";
}

async function sourceRows(client, tenantId) {
  const result = await client.query(
    `SELECT record_type, record_id, state_version, payload, payload_hash
       FROM lawos_domain.records
      WHERE tenant_id = $1
        AND domain_id = 'hrx'
        AND record_type = ANY($2::text[])
      ORDER BY record_type, record_id`,
    [tenantId, HRX_STORE_TABLES],
  );
  return result.rows;
}

async function pendingOutbox(client, tenantId, cursor) {
  const values = [tenantId];
  let after = "";
  if (cursor?.last_created_at != null) {
    values.push(cursor.last_created_at, cursor.last_event_id);
    after = " AND (created_at, event_id) > ($2::timestamptz, $3::text)";
  }
  const result = await client.query(
    `SELECT event_id, created_at::text AS created_at
       FROM lawos_domain.outbox_events
      WHERE tenant_id = $1
        AND domain_id = 'hrx'${after}
      ORDER BY created_at, event_id`,
    values,
  );
  return result.rows;
}

export async function projectHrxRelationalReadModel({
  pool,
  tenant_id,
  mode = "incremental",
  negativeTenantId = null,
  faultInjector = null,
} = {}) {
  if (!["backfill", "incremental"].includes(mode)) throw new TypeError("HRX projection mode is invalid");
  const tenantId = requiredText(tenant_id, "tenant_id");
  if (negativeTenantId != null && requiredText(negativeTenantId, "negativeTenantId") === tenantId) {
    throw new TypeError("negative tenant must differ from the source tenant");
  }
  const result = await withPostgresTransaction(pool, {
    tenant_id: tenantId,
    isolationLevel: "serializable",
    statementTimeoutMillis: 120_000,
  }, async (client) => {
    const columnsByTable = await tableColumns(client);
    const cursorResult = await client.query(
      "SELECT last_created_at::text AS last_created_at, last_event_id FROM lawos_projection.hrx_outbox_cursor WHERE tenant_id = $1 FOR UPDATE",
      [tenantId],
    );
    const cursor = cursorResult.rows[0] ?? null;
    const events = await pendingOutbox(client, tenantId, cursor);
    if (mode === "incremental" && events.length === 0) {
      return {
        sourceRows: [],
        sourceHash: sha256([]),
        targetHash: sha256([]),
        inserted: 0,
        updated: 0,
        noop: 0,
        eventCount: 0,
      };
    }
    const sources = await sourceRows(client, tenantId);
    const identities = new Set(sources.map((row) => `${row.record_type}:${row.record_id}`));
    const stale = await client.query(
      `SELECT source_record_type, source_record_id
         FROM lawos_projection.hrx_record_state
        WHERE tenant_id = $1`,
      [tenantId],
    );
    if (stale.rows.some((row) => !identities.has(`${row.source_record_type}:${row.source_record_id}`))) {
      throw new Error("HRX projection state contains a source record no longer present in the authority ledger");
    }
    let inserted = 0;
    let updated = 0;
    let noop = 0;
    const targetMaterial = [];
    for (const source of sources) {
      const table = source.record_type;
      if (!TABLES.has(table)) throw new Error("unapproved HRX projection record type");
      const row = rowForColumns(source.payload, columnsByTable.get(table), table);
      if (row.tenant_id !== tenantId) throw new Error("HRX projection payload tenant drifted");
      const state = await client.query(
        `SELECT source_state_version, source_payload_hash
           FROM lawos_projection.hrx_record_state
          WHERE tenant_id = $1 AND source_record_type = $2 AND source_record_id = $3
          FOR UPDATE`,
        [tenantId, table, source.record_id],
      );
      const prior = state.rows[0] ?? null;
      if (prior && (Number(prior.source_state_version) > Number(source.state_version)
        || (Number(prior.source_state_version) === Number(source.state_version)
          && prior.source_payload_hash !== source.payload_hash))) {
        throw new Error("HRX projection source version or hash regressed");
      }
      const primaryKey = HRX_TABLE_PRIMARY_KEYS[table];
      const existing = await readTargetRow(client, table, primaryKey, row);
      if (prior && Number(prior.source_state_version) === Number(source.state_version)
        && prior.source_payload_hash === source.payload_hash) {
        if (!existing || sha256(comparableRow(existing, Object.keys(row).sort())) !== sha256(comparableRow(row, Object.keys(row).sort()))) {
          throw new Error("HRX projection target drifted after a previously completed projection");
        }
        noop += 1;
      } else {
        const outcome = await writeTargetRow(client, { table, primaryKey, row, existing });
        if (outcome === "inserted") inserted += 1;
        else if (outcome === "updated") updated += 1;
        else noop += 1;
        await client.query(
          `INSERT INTO lawos_projection.hrx_record_state
             (tenant_id, source_record_type, source_record_id, source_state_version, source_payload_hash)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (tenant_id, source_record_type, source_record_id) DO UPDATE
             SET source_state_version = EXCLUDED.source_state_version,
                 source_payload_hash = EXCLUDED.source_payload_hash,
                 projected_at = clock_timestamp()`,
          [tenantId, table, source.record_id, source.state_version, source.payload_hash],
        );
      }
      faultInjector?.("after_record", { record_type: table, record_id: source.record_id });
      const readback = await readTargetRow(client, table, primaryKey, row);
      if (!readback || sha256(comparableRow(readback, Object.keys(row).sort())) !== sha256(comparableRow(row, Object.keys(row).sort()))) {
        throw new Error("HRX relational projection readback differs from the source authority");
      }
      targetMaterial.push({ table, record_id: source.record_id, row: comparableRow(readback, Object.keys(row).sort()) });
    }
    if (events.length > 0) {
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
    }
    return {
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
    };
  });

  let negativeVisible = 0;
  let negativeTenantContextDenied = 0;
  if (negativeTenantId != null) {
    try {
      negativeVisible = await withPostgresTransaction(pool, {
        tenant_id: negativeTenantId,
        readOnly: true,
      }, async (client) => {
        const state = await client.query(
          "SELECT count(*)::integer AS count FROM lawos_projection.hrx_record_state WHERE tenant_id = $1",
          [tenantId],
        );
        return Number(state.rows[0]?.count ?? 0);
      });
    } catch (error) {
      if (error?.code !== "LAWOS_POSTGRES_ACCESS_DENIED") throw error;
      negativeTenantContextDenied = 1;
    }
    if (negativeVisible !== 0) throw new Error("HRX relational projection is visible to the wrong tenant");
  }
  const value = {
    schema_version: HRX_RELATIONAL_PROJECTION_VERSION,
    outcome: "PASS",
    mode,
    source_authority: "postgres-v2-generic-ledger",
    projection_authority: "read-only",
    source_hash: result.sourceHash,
    target_hash: result.targetHash,
    safe_counts: {
      source_record_count: result.sourceRows.length,
      projected_insert_count: result.inserted,
      projected_update_count: result.updated,
      projected_noop_count: result.noop,
      consumed_outbox_event_count: result.eventCount,
      tenant_negative_visible_count: negativeVisible,
      negative_tenant_context_denied_count: negativeTenantContextDenied,
      source_authority_write_count: 0,
      dual_write_count: 0,
      partial_commit_count: 0,
    },
    claims: {
      one_way_projection: true,
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
