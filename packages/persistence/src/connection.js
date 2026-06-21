import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createPersistenceConfig } from "./config.js";
import { PERSISTENCE_TABLES, createTenantRecord } from "./schema.js";

export const PERSISTENCE_STORE_VERSION = "law-firm-os.persistence-store.v0.1";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function emptyState() {
  return {
    schema_version: PERSISTENCE_STORE_VERSION,
    tables: Object.fromEntries(PERSISTENCE_TABLES.map((table) => [table, []]))
  };
}

function normalizeState(input) {
  const state = { ...emptyState(), ...(input ?? {}) };
  state.tables = { ...emptyState().tables, ...(state.tables ?? {}) };
  for (const table of PERSISTENCE_TABLES) {
    if (!Array.isArray(state.tables[table])) state.tables[table] = [];
  }
  return state;
}

function storeFilePath(config) {
  return config.root_dir ? join(config.root_dir, "persistence-store.json") : undefined;
}

function requireTable(table) {
  if (!PERSISTENCE_TABLES.includes(table)) throw new TypeError(`unknown persistence table: ${table}`);
}

function matchesWhere(row, where = {}) {
  return Object.entries(where).every(([field, value]) => row[field] === value);
}

function normalizeRow(table, row) {
  if (table === "runtime_tenants") return createTenantRecord(row);
  if (table === "runtime_migration_history") {
    if (typeof row.id !== "string" || row.id.trim() === "") throw new TypeError("migration id is required");
    if (typeof row.checksum !== "string" || row.checksum.trim() === "") throw new TypeError("migration checksum is required");
    return Object.freeze({
      id: row.id,
      checksum: row.checksum,
      applied_at: row.applied_at ?? new Date(0).toISOString(),
      rolled_back_at: row.rolled_back_at
    });
  }
  return Object.freeze({ ...row });
}

export function createPersistenceConnection(input = {}) {
  const config = createPersistenceConfig(input);
  const filePath = storeFilePath(config);
  let state = normalizeState(filePath && existsSync(filePath) ? JSON.parse(readFileSync(filePath, "utf8")) : undefined);
  let closed = false;

  function ensureOpen() {
    if (closed) throw new Error("Persistence connection is closed");
  }

  function flush() {
    if (!filePath) return;
    mkdirSync(dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`);
    renameSync(tempPath, filePath);
  }

  const connection = {
    kind: "lawos-synthetic-persistence-connection",
    config,
    capabilities: Object.freeze({
      durable: Boolean(filePath),
      synthetic_only: true,
      migrations: true,
      transactions: true,
      production_ready_claim: false
    }),

    insert(table, row) {
      ensureOpen();
      requireTable(table);
      const next = normalizeRow(table, row);
      state.tables[table].push(clone(next));
      flush();
      return Object.freeze(clone(next));
    },

    select(table, where = {}) {
      ensureOpen();
      requireTable(table);
      return Object.freeze(state.tables[table].filter((row) => matchesWhere(row, where)).map((row) => Object.freeze(clone(row))));
    },

    replaceTable(table, rows = []) {
      ensureOpen();
      requireTable(table);
      state.tables[table] = rows.map((row) => clone(normalizeRow(table, row)));
      flush();
      return Object.freeze({ table, rows: state.tables[table].length });
    },

    transaction(callback) {
      ensureOpen();
      if (typeof callback !== "function") throw new TypeError("transaction callback is required");
      const original = clone(state);
      const draft = normalizeState(clone(state));
      const tx = {
        ...connection,
        insert(table, row) {
          requireTable(table);
          const next = normalizeRow(table, row);
          draft.tables[table].push(clone(next));
          return Object.freeze(clone(next));
        },
        select(table, where = {}) {
          requireTable(table);
          return Object.freeze(draft.tables[table].filter((row) => matchesWhere(row, where)).map((row) => Object.freeze(clone(row))));
        },
        replaceTable(table, rows = []) {
          requireTable(table);
          draft.tables[table] = rows.map((row) => clone(normalizeRow(table, row)));
          return Object.freeze({ table, rows: draft.tables[table].length });
        },
        transaction() {
          throw new Error("nested Runtime Spine persistence transactions are not supported");
        }
      };
      try {
        const result = callback(Object.freeze(tx));
        state = normalizeState(draft);
        flush();
        return result;
      } catch (error) {
        state = normalizeState(original);
        throw error;
      }
    },

    snapshot() {
      ensureOpen();
      return clone(state);
    },

    close() {
      if (!closed) flush();
      closed = true;
    }
  };

  return Object.freeze(connection);
}
