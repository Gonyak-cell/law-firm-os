import { createHash } from "node:crypto";
import {
  compareDomainSnapshots,
  createDomainSnapshot,
  hashDomainValue,
} from "../../persistence/src/domain-ledger.js";
import {
  applyCommittedStateVersions,
  compareDomainSnapshotWithLedgerReadback,
  flushDomainSnapshotToScopedLedger,
} from "../../persistence/src/record-domain-adapter.js";
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
import { createHrxProjectionReadRouter } from "./relational-projection-reader.js";

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

function rowRecordId(table, row) {
  const primaryKey = HRX_TABLE_PRIMARY_KEYS[table];
  if (!primaryKey) throw new TypeError(`unknown HRX table: ${table}`);
  const identity = Object.fromEntries(primaryKey.map((field) => {
    const value = requiredText(row[field], `${table}.${field}`);
    return [field, value];
  }));
  return `sha256:${hashDomainValue(identity)}`;
}

export { rowRecordId as createHrxDomainRecordId };

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

function centralIdempotencyEntries(state, tenantId) {
  const entries = [];
  for (const table of HRX_STORE_TABLES) {
    for (const row of state.tables?.[table] ?? []) {
      if (row.tenant_id !== tenantId) continue;
      for (const [field, value] of Object.entries(row)) {
        if (field !== "idempotency_key" && !field.endsWith("_idempotency_key")) continue;
        const key = String(value ?? "").trim();
        if (!key) continue;
        const identity = { table, field, key_hash: hashDomainValue(key) };
        entries.push({
          tenant_id: tenantId,
          domain_id: HRX_DOMAIN_ID,
          key: `hrx:${hashDomainValue(identity)}`,
          request_hash: hashDomainValue({ domain_id: HRX_DOMAIN_ID, ...identity }),
          response: { source_record_type: table, source_response_included: false },
          created_at: row.created_at ?? row.occurred_at ?? null,
        });
      }
    }
  }
  return entries;
}

function centralAuditEvents(state, tenantId) {
  return (state.tables?.hrx_audit_events ?? [])
    .filter((row) => row.tenant_id === tenantId)
    .map((row) => ({
      tenant_id: tenantId,
      domain_id: HRX_DOMAIN_ID,
      event_id: requiredText(row.event_id, "HRX audit event_id"),
      event_type: requiredText(row.action, "HRX audit action"),
      actor_id: row.actor_id ?? null,
      object_type: row.object_type ?? null,
      object_id: row.object_id ?? null,
      payload: {
        source_event_hash: requiredText(row.event_hash, "HRX audit event_hash"),
        source_metadata_included: false,
      },
      created_at: row.occurred_at ?? null,
    }));
}

function mergeCentralEntries(priorEntries, derivedEntries, identity, fingerprint, conflictCode) {
  const merged = new Map((priorEntries ?? []).map((entry) => [identity(entry), entry]));
  for (const entry of derivedEntries) {
    const key = identity(entry);
    const prior = merged.get(key);
    if (prior && fingerprint(prior) !== fingerprint(entry)) {
      throw Object.assign(new Error("HRX central metadata conflicts with the materialized PostgreSQL baseline"), {
        code: conflictCode,
        safe_error_code: "HRX_POSTGRES_CENTRAL_METADATA_CONFLICT",
        status: 409,
      });
    }
    merged.set(key, entry);
  }
  return [...merged.values()];
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
  const baseline = materializedBaselines.get(store);
  const idempotencyEntries = mergeCentralEntries(
    baseline?.idempotency_entries,
    centralIdempotencyEntries(state, tenantId),
    (entry) => entry.key,
    (entry) => hashDomainValue({ request_hash: entry.request_hash, response: entry.response }),
    "LAWOS_HRX_POSTGRES_IDEMPOTENCY_CONFLICT",
  );
  const auditEvents = mergeCentralEntries(
    baseline?.audit_events,
    centralAuditEvents(state, tenantId),
    (event) => event.event_id,
    (event) => hashDomainValue({
      event_type: event.event_type,
      actor_id: event.actor_id,
      object_type: event.object_type,
      object_id: event.object_id,
      payload: event.payload,
    }),
    "LAWOS_HRX_POSTGRES_AUDIT_CONFLICT",
  );
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
    idempotency_entries: idempotencyEntries,
    audit_events: auditEvents,
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
      idempotency_count: snapshot.idempotency_entries.length,
      audit_event_count: snapshot.audit_events.length,
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

function snapshotFromLedgerRecords(tenantId, records, idempotencyEntries = [], auditEvents = []) {
  return createDomainSnapshot({
    tenant_id: tenantId,
    domain_id: HRX_DOMAIN_ID,
    records,
    idempotency_entries: idempotencyEntries,
    audit_events: auditEvents,
  });
}

export async function materializeHrxStoreFromPostgres({ ledger, tenant_id } = {}) {
  if (!ledger || typeof ledger.list !== "function") throw new TypeError("PostgreSQL domain ledger is required");
  const tenantId = requiredText(tenant_id, "tenant_id");
  if (typeof ledger.listIdempotency !== "function" || typeof ledger.listAudit !== "function") {
    throw new TypeError("PostgreSQL domain ledger idempotency and audit methods are required");
  }
  const scope = { tenant_id: tenantId, domain_id: HRX_DOMAIN_ID };
  const records = await ledger.list(scope);
  const idempotencyEntries = await ledger.listIdempotency(scope);
  const auditEvents = await ledger.listAudit(scope);
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
  materializedBaselines.set(store, snapshotFromLedgerRecords(
    tenantId,
    records,
    idempotencyEntries,
    auditEvents,
  ));
  return store;
}

export async function materializeHrxStoreWithProjection({
  ledger,
  tenant_id,
  projectionReader,
} = {}) {
  if (!projectionReader
    || typeof projectionReader.materializeSnapshot !== "function"
    || projectionReader.authority !== "read-model-only"
    || projectionReader.fallback_authority !== "postgres-v2-generic-ledger") {
    throw new TypeError("HRX relational projection reader contract is invalid");
  }
  const tenantId = requiredText(tenant_id, "tenant_id");
  const sourceStore = await materializeHrxStoreFromPostgres({
    ledger,
    tenant_id: tenantId,
  });
  let projectionStore;
  try {
    assertHrxPostgresAuthorityReady({
      store: sourceStore,
      tenant_id: tenantId,
    });
    const materialized = await projectionReader.materializeSnapshot({
      tenant_id: tenantId,
      source_snapshot: sourceStore.snapshot(),
    });
    projectionStore = createFileHrxStore({
      initialState: materialized.snapshot,
    });
    let closed = false;
    const ensureOpen = () => {
      if (closed) throw new Error("HRX projected request store is closed");
    };
    const readOperations = new Set(["select", "selectOne"]);
    const store = {
      kind: "hrx-postgres-relational-read-overlay",
      version: HRX_POSTGRES_STORE_PORT_VERSION,
      capabilities: Object.freeze({
        ...sourceStore.capabilities,
        durable: true,
        migrations: false,
        authority: "postgres-v2",
        relational_read_projection: true,
        relational_projection_authority: "read-model-only",
        relational_projection_fallback: "postgres-v2-generic-ledger",
        projected_table_names: materialized.projected_table_names,
        fallback_families: materialized.fallback_families,
        json_fallback: false,
      }),
      query(operation, params = {}) {
        ensureOpen();
        if (readOperations.has(operation)) {
          return projectionStore.query(operation, params);
        }
        return sourceStore.transaction((sourceTransaction) =>
          projectionStore.transaction((projectionTransaction) => {
            const result = sourceTransaction.query(operation, params);
            projectionTransaction.query(operation, params);
            return result;
          }));
      },
      transaction(callback) {
        ensureOpen();
        if (typeof callback !== "function") {
          throw new TypeError("transaction callback is required");
        }
        return sourceStore.transaction((sourceTransaction) =>
          projectionStore.transaction((projectionTransaction) => {
            const transactionStore = Object.freeze({
              ...sourceTransaction,
              query(operation, params = {}) {
                if (readOperations.has(operation)) {
                  return projectionTransaction.query(operation, params);
                }
                const result = sourceTransaction.query(operation, params);
                projectionTransaction.query(operation, params);
                return result;
              },
              transaction() {
                throw new Error("nested HRX transactions are not supported");
              },
            });
            return callback(transactionStore);
          }));
      },
      migrate(migration) {
        ensureOpen();
        void migration;
        throw new Error(
          "HRX projected request store cannot execute schema migrations",
        );
      },
      snapshot() {
        ensureOpen();
        return sourceStore.snapshot();
      },
      durableGeneration() {
        ensureOpen();
        return sourceStore.durableGeneration();
      },
      close() {
        if (closed) return;
        closed = true;
        projectionStore.close();
        sourceStore.close();
      },
    };
    materializedBaselines.set(store, getHrxMaterializedBaseline(sourceStore));
    return store;
  } catch (error) {
    projectionStore?.close();
    sourceStore.close();
    throw error;
  }
}

function migrationHash(sql) {
  return createHash("sha256").update(sql).digest("hex");
}

export function assertHrxPostgresAuthorityReady({ store, tenant_id } = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  const state = store.snapshot();
  const expected = loadHrxCoreMigrations().map((migration) => ({
    id: migration.id,
    hash: migrationHash(migration.sql),
  })).sort((left, right) => left.id.localeCompare(right.id));
  const actual = (state.applied_migrations ?? []).map((migration) => ({
    id: migration.id,
    hash: migration.hash,
  })).sort((left, right) => left.id.localeCompare(right.id));
  const baseline = materializedBaselines.get(store);
  const source = applyCommittedStateVersions(
    createHrxDomainSnapshot({ store, tenant_id: tenantId }).snapshot,
    baseline,
  );
  const comparison = baseline ? compareDomainSnapshots(baseline, source) : null;
  if (hashDomainValue(actual) !== hashDomainValue(expected) || comparison?.equal !== true) {
    throw Object.assign(new Error("HRX PostgreSQL authority requires an exact pre-authority import"), {
      code: "LAWOS_HRX_POSTGRES_AUTHORITY_NOT_READY",
      safe_error_code: "HRX_POSTGRES_AUTHORITY_NOT_READY",
      status: 503,
      expected_migration_count: expected.length,
      actual_migration_count: actual.length,
      central_metadata_equal: comparison?.equal === true,
    });
  }
  return Object.freeze({ source, baseline, migration_count: expected.length });
}

export function getHrxMaterializedBaseline(store) {
  const baseline = materializedBaselines.get(store);
  if (!baseline) throw new TypeError("HRX PostgreSQL materialized baseline is required");
  return baseline;
}

export function createHrxOperationalDomainSnapshot({ store, tenant_id, request_context } = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  const baseline = getHrxMaterializedBaseline(store);
  const base = applyCommittedStateVersions(
    createHrxDomainSnapshot({ store, tenant_id: tenantId }).snapshot,
    baseline,
  );
  if (compareDomainSnapshots(baseline, base).equal) return base;

  const idempotencyKey = requiredText(request_context?.idempotency_key, "HRX request idempotency_key");
  const method = requiredText(request_context?.method ?? "COMMAND", "HRX request method").toUpperCase();
  const pathname = requiredText(request_context?.pathname ?? "internal-command", "HRX request pathname");
  const requestFingerprint = {
    method,
    pathname_hash: hashDomainValue(pathname),
    request_target_hash: request_context?.request_target_hash ?? null,
    request_body_hash: request_context?.request_body_hash ?? null,
    idempotency_key_hash: hashDomainValue(idempotencyKey),
  };
  const centralKey = `hrx-api:${hashDomainValue({
    tenant_id: tenantId,
    idempotency_key_hash: requestFingerprint.idempotency_key_hash,
  })}`;
  const requestHash = hashDomainValue(requestFingerprint);
  const priorIdempotency = baseline.idempotency_entries.find((entry) => entry.key === centralKey);
  if (priorIdempotency && priorIdempotency.request_hash !== requestHash) {
    throw Object.assign(new Error("HRX API idempotency key was reused for a different request"), {
      code: "LAWOS_HRX_POSTGRES_IDEMPOTENCY_CONFLICT",
      safe_error_code: "HRX_POSTGRES_IDEMPOTENCY_CONFLICT",
      status: 409,
    });
  }
  const auditEventId = `hrx-api-audit:${hashDomainValue({ tenant_id: tenantId, central_key: centralKey })}`;
  return createDomainSnapshot({
    ...base,
    idempotency_entries: base.idempotency_entries.concat(priorIdempotency ? [] : [{
      tenant_id: tenantId,
      domain_id: HRX_DOMAIN_ID,
      key: centralKey,
      request_hash: requestHash,
      response: { outcome_recorded: true, response_payload_included: false },
    }]),
    audit_events: base.audit_events.some((event) => event.event_id === auditEventId)
      ? base.audit_events
      : base.audit_events.concat([{
        tenant_id: tenantId,
        domain_id: HRX_DOMAIN_ID,
        event_id: auditEventId,
        event_type: "hrx.api.mutation_committed",
        actor_id: request_context?.actor_id ?? null,
        object_type: "HrxApiCommand",
        object_id: centralKey,
        payload: {
          method,
          pathname_hash: requestFingerprint.pathname_hash,
          request_target_hash: requestFingerprint.request_target_hash,
          request_body_hash: requestFingerprint.request_body_hash,
          request_payload_included: false,
        },
      }]),
  });
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
  const comparison = await compareDomainSnapshotWithLedgerReadback({
    ledger,
    source,
    tenant_id: tenantId,
    domain_id: HRX_DOMAIN_ID,
  });
  if (!comparison.equal) throw shadowDifference(comparison);
  return comparison;
}

export async function flushHrxStoreToPostgres({ ledger, store, tenant_id, request_context = null } = {}) {
  const tenantId = requiredText(tenant_id, "tenant_id");
  const source = createHrxOperationalDomainSnapshot({ store, tenant_id: tenantId, request_context });
  const expectedBaseline = materializedBaselines.get(store);
  try {
    await ledger.transaction({ tenant_id: tenantId, domain_id: HRX_DOMAIN_ID }, (tx) =>
      flushDomainSnapshotToScopedLedger({
        tx,
        source,
        tenant_id: tenantId,
        domain_id: HRX_DOMAIN_ID,
        expected_baseline: expectedBaseline,
      }));
  } catch (error) {
    if (error?.safe_error_code === "DOMAIN_BASELINE_CONFLICT") {
      throw baselineConflict({
        difference_count: error.difference_count,
        difference_fingerprint: error.difference_fingerprint,
      });
    }
    throw error;
  }
  const comparison = await compareCommittedReadback({ ledger, tenantId, source });
  return Object.freeze({ snapshot: source, comparison });
}

export async function runHrxPostgresCommand({ ledger, tenant_id, command, request_context = null } = {}) {
  if (typeof command !== "function") throw new TypeError("HRX PostgreSQL command callback is required");
  const store = await materializeHrxStoreFromPostgres({ ledger, tenant_id });
  try {
    const result = await command(store);
    const flush = await flushHrxStoreToPostgres({ ledger, store, tenant_id, request_context });
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

export function createPostgresHrxStorePortV2({
  ledger,
  projectionReader = null,
} = {}) {
  if (!ledger || typeof ledger.transaction !== "function") throw new TypeError("PostgreSQL domain ledger is required");
  if (projectionReader != null
    && (typeof projectionReader.query !== "function"
      || projectionReader.authority !== "read-model-only"
      || projectionReader.fallback_authority !== "postgres-v2-generic-ledger")) {
    throw new TypeError("HRX relational projection reader contract is invalid");
  }
  let closed = false;
  const ensureOpen = () => {
    if (closed) throw new Error("HRX PostgreSQL store port is closed");
  };

  async function runLegacyCommand({ tenant_id, command, request_context = null } = {}) {
    ensureOpen();
    return runHrxPostgresCommand({ ledger, tenant_id, command, request_context });
  }
  const projectionReadRouter = projectionReader == null
    ? null
    : createHrxProjectionReadRouter({
      projectionReader,
      genericLedgerRead: async (operation, params = {}) => {
        const tenantId = tenantFromQuery(params);
        const command = await runHrxPostgresCommand({
          ledger,
          tenant_id: tenantId,
          command: (store) => store.query(operation, params),
          request_context: {
            method: `STORE:${operation}`,
            pathname: `hrx-store/${params.table ?? "unknown"}`,
            idempotency_key: params.idempotency_key
              ?? params.row?.idempotency_key
              ?? params.where?.idempotency_key
              ?? `hrx-store-query:${hashDomainValue({ operation, params })}`,
            request_body_hash: hashDomainValue(params),
            actor_id: params.actor_id ?? null,
          },
        });
        return command.result;
      },
    });

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
      relational_read_projection: projectionReader != null,
      relational_projection_authority: "read-model-only",
      relational_projection_fallback: "postgres-v2-generic-ledger",
      json_fallback: false,
      production_ready_claim: false,
    }),

    async query(operation, params = {}) {
      ensureOpen();
      if (projectionReadRouter) {
        return projectionReadRouter.query(operation, params);
      }
      const tenantId = tenantFromQuery(params);
      const command = await runHrxPostgresCommand({
        ledger,
        tenant_id: tenantId,
        command: (store) => store.query(operation, params),
        request_context: {
          method: `STORE:${operation}`,
          pathname: `hrx-store/${params.table ?? "unknown"}`,
          idempotency_key: params.idempotency_key
            ?? params.row?.idempotency_key
            ?? params.where?.idempotency_key
            ?? `hrx-store-query:${hashDomainValue({ operation, params })}`,
          request_body_hash: hashDomainValue(params),
          actor_id: params.actor_id ?? null,
        },
      });
      return command.result;
    },

    async transaction({ tenant_id, idempotency_key, actor_id = null } = {}, callback) {
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
        request_context: {
          method: "STORE:TRANSACTION",
          pathname: "hrx-store/transaction",
          idempotency_key,
          actor_id,
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
        request_context: {
          method: "STORE:MIGRATE",
          pathname: "hrx-store/migrations",
          idempotency_key: `hrx-migrate:${hashDomainValue(migrations.map((migration) => migration.id))}`,
          request_body_hash: hashDomainValue(migrations.map((migration) => ({ id: migration.id, sql_hash: migrationHash(migration.sql) }))),
          actor_id: "system-migration",
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
