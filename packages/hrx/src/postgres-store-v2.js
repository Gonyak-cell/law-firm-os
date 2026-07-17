import {
  compareDomainSnapshots,
  createDomainSnapshot,
  hashDomainValue,
} from "../../persistence/src/domain-ledger.js";
import {
  HRX_APPEND_ONLY_TABLES,
  HRX_CAS_TABLES,
  HRX_STORE_TABLES,
  HRX_TABLE_PRIMARY_KEYS,
  HRX_TABLE_UNIQUE_CONSTRAINTS,
  createFileHrxStore,
  validateHrxStoreSnapshot,
} from "./store/file-store.js";
import { loadHrxCoreMigrations } from "./migrations/index.js";

export const HRX_POSTGRES_STORE_PORT_VERSION = "law-firm-os.hrx-postgres-store-port.v0.2";
export const HRX_DOMAIN_ID = "hrx";

const MIGRATION_RECORD_TYPE = "__hrx_schema_migration";
const materializedBaselines = new WeakMap();

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function recordIdentity(record) {
  return `${record.record_type}:${record.record_id}`;
}

function rowRecordId(table, row) {
  const primaryKey = HRX_TABLE_PRIMARY_KEYS[table];
  if (!primaryKey) throw new TypeError(`unknown HRX table: ${table}`);
  const identity = Object.fromEntries(primaryKey.map((field) => {
    const value = requiredText(row[field], `${table}.${field}`);
    return [field, value];
  }));
  return `sha256:${hashDomainValue(identity)}`;
}

function rowUniqueKey(table, row) {
  const fields = (HRX_TABLE_UNIQUE_CONSTRAINTS[table] ?? []).find((constraint) =>
    constraint.every((field) => row[field] !== undefined && row[field] !== null && row[field] !== ""));
  if (!fields) return null;
  return `sha256:${hashDomainValue({ fields, values: fields.map((field) => row[field]) })}`;
}

function migrationRecords(state, tenantId) {
  return (state.applied_migrations ?? []).map((migration) => ({
    tenant_id: tenantId,
    domain_id: HRX_DOMAIN_ID,
    record_type: MIGRATION_RECORD_TYPE,
    record_id: requiredText(migration.id, "HRX migration id"),
    unique_key: null,
    append_only: true,
    payload: {
      id: migration.id,
      hash: requiredText(migration.hash, "HRX migration hash"),
      applied_at: migration.applied_at ?? null,
    },
  }));
}

function tableRecords(state, tenantId) {
  return HRX_STORE_TABLES.flatMap((table) => (state.tables?.[table] ?? [])
    .filter((row) => row.tenant_id === tenantId)
    .map((row) => ({
      tenant_id: tenantId,
      domain_id: HRX_DOMAIN_ID,
      record_type: table,
      record_id: rowRecordId(table, row),
      unique_key: rowUniqueKey(table, row),
      append_only: HRX_APPEND_ONLY_TABLES.includes(table),
      payload: clone(row),
    })));
}

function orderedTableRows(state, table, tenantId) {
  return (state.tables?.[table] ?? [])
    .filter((row) => row.tenant_id === tenantId)
    .map(clone)
    .sort((left, right) => rowRecordId(table, left).localeCompare(rowRecordId(table, right)));
}

function tableHashes(state, tenantId) {
  return Object.freeze(Object.fromEntries(HRX_STORE_TABLES.map((table) => [
    table,
    hashDomainValue(orderedTableRows(state, table, tenantId)),
  ])));
}

function leaveLedgerEffect(row) {
  if (![row.amount_minutes].every(Number.isInteger)) return 0;
  if (["earned", "carryover", "released"].includes(row.entry_type)) return row.amount_minutes;
  if (["used", "reserved", "expired"].includes(row.entry_type)) return -row.amount_minutes;
  if (row.entry_type === "adjustment") {
    return row.adjustment_direction === "credit" ? row.amount_minutes : -row.amount_minutes;
  }
  return 0;
}

function recomputeLeaveLedger(state, tenantId) {
  const entries = orderedTableRows(state, "hrx_leave_balance_entries", tenantId);
  const balances = new Map();
  for (const row of entries) {
    const key = hashDomainValue({
      employee_id: row.employee_id ?? null,
      group_id: row.group_id ?? null,
    });
    balances.set(key, (balances.get(key) ?? 0) + leaveLedgerEffect(row));
  }
  const rows = [...balances.entries()].sort(([left], [right]) => left.localeCompare(right));
  return Object.freeze({
    entry_count: entries.length,
    balance_group_count: rows.length,
    net_minutes: rows.reduce((total, [, minutes]) => total + minutes, 0),
    balance_hash: hashDomainValue(rows),
    recomputation_passed: true,
  });
}

export function createHrxDomainSnapshot({ store, tenant_id } = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  if (!store || typeof store.snapshot !== "function") throw new TypeError("HRX source store snapshot is required");
  const state = store.snapshot();
  const integrity = validateHrxStoreSnapshot(state);
  const records = [...migrationRecords(state, tenantId), ...tableRecords(state, tenantId)];
  const sourceHash = hashDomainValue({
    tenant_id: tenantId,
    schema_version: state.schema_version,
    applied_migrations: state.applied_migrations,
    tables: Object.fromEntries(HRX_STORE_TABLES.map((table) => [
      table,
      (state.tables?.[table] ?? []).filter((row) => row.tenant_id === tenantId),
    ])),
  });
  const snapshot = createDomainSnapshot({
    tenant_id: tenantId,
    domain_id: HRX_DOMAIN_ID,
    records,
    source_hash: sourceHash,
  });
  const tableCounts = Object.fromEntries(HRX_STORE_TABLES.map((table) => [
    table,
    snapshot.records.filter((record) => record.record_type === table).length,
  ]));
  return Object.freeze({
    snapshot,
    inventory: Object.freeze({
      domain_id: HRX_DOMAIN_ID,
      migration_count: state.applied_migrations?.length ?? 0,
      expected_migration_count: loadHrxCoreMigrations().length,
      table_count: HRX_STORE_TABLES.length,
      source_record_count: snapshot.records.length,
      product_row_count: snapshot.records.length - (state.applied_migrations?.length ?? 0),
      append_only_table_count: HRX_APPEND_ONLY_TABLES.length,
      append_only_record_count: snapshot.records.filter((record) => record.append_only).length,
      cas_table_count: HRX_CAS_TABLES.length,
      unique_rule_count: Object.values(HRX_TABLE_UNIQUE_CONSTRAINTS)
        .reduce((total, constraints) => total + constraints.length, 0),
      tenant_mismatch_count: HRX_STORE_TABLES.reduce((total, table) => total
        + (state.tables?.[table] ?? []).filter((row) => row.tenant_id !== tenantId).length, 0),
      table_counts: Object.freeze(tableCounts),
      table_hashes: tableHashes(state, tenantId),
      row_count_hash: hashDomainValue(tableCounts),
      integrity,
      leave_ledger_recomputation: recomputeLeaveLedger(state, tenantId),
      pii_field_names: Object.freeze([
        "display_name",
        "legal_name",
        "work_email",
        "encrypted_amount_ref",
        "employee_id",
        "document_id",
      ]),
    }),
  });
}

function snapshotFromLedgerRecords(tenantId, records) {
  return createDomainSnapshot({
    tenant_id: tenantId,
    domain_id: HRX_DOMAIN_ID,
    records,
  });
}

export async function materializeHrxStoreFromPostgres({ ledger, tenant_id } = {}) {
  if (!ledger || typeof ledger.list !== "function") throw new TypeError("PostgreSQL domain ledger is required");
  const tenantId = requiredText(tenant_id, "tenant_id");
  const records = await ledger.list({ tenant_id: tenantId, domain_id: HRX_DOMAIN_ID });
  const state = {
    schema_version: "law-firm-os.hrx-file-store.v0.1",
    applied_migrations: records
      .filter((record) => record.record_type === MIGRATION_RECORD_TYPE)
      .map((record) => clone(record.payload))
      .sort((left, right) => left.id.localeCompare(right.id)),
    tables: Object.fromEntries(HRX_STORE_TABLES.map((table) => [
      table,
      records
        .filter((record) => record.record_type === table)
        .map((record) => clone(record.payload)),
    ])),
  };
  validateHrxStoreSnapshot(state);
  const store = createFileHrxStore({ initialState: state });
  materializedBaselines.set(store, snapshotFromLedgerRecords(tenantId, records));
  return store;
}

function baselineConflict(comparison) {
  return Object.assign(new Error("HRX PostgreSQL unit-of-work baseline changed before commit"), {
    code: "LAWOS_HRX_POSTGRES_BASELINE_CONFLICT",
    safe_error_code: "HRX_POSTGRES_BASELINE_CONFLICT",
    status: 409,
    difference_count: comparison.difference_count,
    difference_fingerprint: comparison.difference_fingerprint,
  });
}

function shadowDifference(comparison) {
  return Object.assign(new Error("HRX PostgreSQL readback differs from source unit of work"), {
    code: "LAWOS_HRX_POSTGRES_SHADOW_DIFFERENCE",
    safe_error_code: "HRX_POSTGRES_SHADOW_DIFFERENCE",
    status: 409,
    difference_count: comparison.difference_count,
    difference_fingerprint: comparison.difference_fingerprint,
  });
}

async function compareCommittedReadback({ ledger, tenantId, source }) {
  const records = await ledger.list({ tenant_id: tenantId, domain_id: HRX_DOMAIN_ID });
  const comparison = compareDomainSnapshots(source, snapshotFromLedgerRecords(tenantId, records));
  if (!comparison.equal) throw shadowDifference(comparison);
  return comparison;
}

export async function flushHrxStoreToPostgres({ ledger, store, tenant_id } = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  const source = createHrxDomainSnapshot({ store, tenant_id: tenantId }).snapshot;
  const expectedBaseline = materializedBaselines.get(store);
  await ledger.transaction({ tenant_id: tenantId, domain_id: HRX_DOMAIN_ID }, async (tx) => {
    const currentRecords = await tx.list();
    if (expectedBaseline) {
      const baselineComparison = compareDomainSnapshots(
        expectedBaseline,
        snapshotFromLedgerRecords(tenantId, currentRecords),
      );
      if (!baselineComparison.equal) throw baselineConflict(baselineComparison);
    }
    const currentByIdentity = new Map(currentRecords.map((record) => [recordIdentity(record), record]));
    for (const record of source.records) {
      const current = currentByIdentity.get(recordIdentity(record));
      if (!current) {
        await tx.write({ ...record, expected_version: 0 });
      } else if (
        current.payload_hash !== record.payload_hash
        || current.unique_key !== record.unique_key
        || current.append_only !== record.append_only
      ) {
        await tx.write({ ...record, expected_version: current.state_version });
      }
    }
    if (currentRecords.some((record) => !source.records.some((candidate) =>
      candidate.record_type === record.record_type && candidate.record_id === record.record_id))) {
      throw Object.assign(new Error("HRX PostgreSQL unit of work cannot silently delete records"), {
        code: "LAWOS_HRX_POSTGRES_DELETE_UNSUPPORTED",
        safe_error_code: "HRX_POSTGRES_DELETE_UNSUPPORTED",
        status: 409,
      });
    }
    const comparison = compareDomainSnapshots(source, snapshotFromLedgerRecords(tenantId, await tx.list()));
    if (!comparison.equal) throw shadowDifference(comparison);
  });
  const comparison = await compareCommittedReadback({ ledger, tenantId, source });
  return Object.freeze({ snapshot: source, comparison });
}

export async function runHrxPostgresCommand({ ledger, tenant_id, command } = {}) {
  if (typeof command !== "function") throw new TypeError("HRX PostgreSQL command callback is required");
  const store = await materializeHrxStoreFromPostgres({ ledger, tenant_id });
  try {
    const result = await command(store);
    const flush = await flushHrxStoreToPostgres({ ledger, store, tenant_id });
    return Object.freeze({ result, flush });
  } finally {
    store.close();
  }
}

function tenantFromQuery(params = {}) {
  return requiredText(
    params.tenant_id ?? params.row?.tenant_id ?? params.where?.tenant_id,
    "tenant_id",
  );
}

export function createPostgresHrxStorePortV2({ ledger } = {}) {
  if (!ledger || typeof ledger.transaction !== "function") throw new TypeError("PostgreSQL domain ledger is required");
  let closed = false;
  const ensureOpen = () => {
    if (closed) throw new Error("HRX PostgreSQL store port is closed");
  };

  async function runLegacyCommand({ tenant_id, command } = {}) {
    ensureOpen();
    return runHrxPostgresCommand({ ledger, tenant_id, command });
  }

  return Object.freeze({
    kind: "hrx-postgres-store-v2",
    version: HRX_POSTGRES_STORE_PORT_VERSION,
    capabilities: Object.freeze({
      durable: true,
      authority: "postgres-v2",
      async_queries: true,
      async_transactions: true,
      tenant_scoped: true,
      rls_required: true,
      append_only_tables: HRX_APPEND_ONLY_TABLES,
      tables: HRX_STORE_TABLES,
      production_ready_claim: false,
    }),

    async query(operation, params = {}) {
      ensureOpen();
      const tenantId = tenantFromQuery(params);
      const command = await runHrxPostgresCommand({
        ledger,
        tenant_id: tenantId,
        command: (store) => store.query(operation, params),
      });
      return command.result;
    },

    async transaction({ tenant_id } = {}, callback) {
      ensureOpen();
      const tenantId = requiredText(tenant_id, "tenant_id");
      if (typeof callback !== "function") throw new TypeError("HRX PostgreSQL transaction callback is required");
      const command = await runHrxPostgresCommand({
        ledger,
        tenant_id: tenantId,
        command(store) {
          const transactionStore = Object.freeze({
            query: async (operation, params = {}) => store.query(operation, params),
            transaction: async () => { throw new Error("nested HRX PostgreSQL transactions are not supported"); },
          });
          return callback(transactionStore);
        },
      });
      return command.result;
    },

    async migrate({ tenant_id, migrations = loadHrxCoreMigrations() } = {}) {
      ensureOpen();
      const command = await runHrxPostgresCommand({
        ledger,
        tenant_id,
        command(store) {
          return migrations.map((migration) => store.migrate(migration));
        },
      });
      return command.result;
    },

    async snapshot({ tenant_id } = {}) {
      ensureOpen();
      const store = await materializeHrxStoreFromPostgres({ ledger, tenant_id });
      try {
        return store.snapshot();
      } finally {
        store.close();
      }
    },

    runLegacyCommand,

    close() {
      closed = true;
    },
  });
}
