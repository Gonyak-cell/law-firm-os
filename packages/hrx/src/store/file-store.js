import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { HRX_DURABLE_CORE_TABLES, HRX_DURABLE_WORKFLOW_TABLES, HRX_STORE_PORT_VERSION } from "./port.js";

const PRIMARY_KEYS = Object.freeze({
  hrx_employees: ["tenant_id", "employee_id"],
  hrx_employment_profiles: ["tenant_id", "profile_id"],
  hrx_employee_user_links: ["tenant_id", "link_id"],
  hrx_documents: ["tenant_id", "document_id"],
  hrx_leave_balance_entries: ["tenant_id", "entry_id"],
  hrx_leave_requests: ["tenant_id", "request_id"],
  hrx_audit_events: ["tenant_id", "event_id"],
  hrx_ai_review_items: ["tenant_id", "review_id"],
  hrx_ai_source_chunks: ["tenant_id", "source_ref", "chunk_id"],
  hrx_analytics_snapshots: ["tenant_id", "snapshot_id"],
});

const TABLES = Object.freeze([...HRX_DURABLE_CORE_TABLES, ...HRX_DURABLE_WORKFLOW_TABLES]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function emptyState() {
  return {
    schema_version: "law-firm-os.hrx-file-store.v0.1",
    applied_migrations: [],
    tables: Object.fromEntries(TABLES.map((table) => [table, []])),
  };
}

function normalizeState(input) {
  const state = { ...emptyState(), ...(input ?? {}) };
  state.applied_migrations = Array.isArray(state.applied_migrations) ? state.applied_migrations : [];
  state.tables = { ...emptyState().tables, ...(state.tables ?? {}) };
  for (const table of TABLES) {
    if (!Array.isArray(state.tables[table])) state.tables[table] = [];
  }
  return state;
}

function hash(text) {
  return createHash("sha256").update(String(text)).digest("hex");
}

function requireTable(table) {
  if (!TABLES.includes(table)) throw new TypeError(`unknown HRX table: ${table}`);
}

function matchesWhere(row, where = {}) {
  return Object.entries(where).every(([field, value]) => row[field] === value);
}

function samePrimaryKey(table, left, right) {
  return PRIMARY_KEYS[table].every((field) => left[field] === right[field]);
}

function assertPrimaryKey(table, row) {
  for (const field of PRIMARY_KEYS[table]) {
    if (typeof row[field] !== "string" || row[field].trim() === "") {
      throw new TypeError(`${table}.${field} primary key is required`);
    }
  }
}

function assertCoreConstraints(state, table, row) {
  if (["hrx_documents", "hrx_leave_balance_entries", "hrx_leave_requests"].includes(table)) {
    const employeeExists = state.tables.hrx_employees.some(
      (employee) => employee.tenant_id === row.tenant_id && employee.employee_id === row.employee_id,
    );
    if (!employeeExists) throw new ReferenceError(`${table} employee not found: ${row.employee_id}`);
  }
  if (table === "hrx_employment_profiles") {
    const employeeExists = state.tables.hrx_employees.some(
      (employee) => employee.tenant_id === row.tenant_id && employee.employee_id === row.employee_id,
    );
    if (!employeeExists) throw new ReferenceError(`EmploymentProfile employee not found: ${row.employee_id}`);
  }
  if (table === "hrx_employee_user_links") {
    if (row.purpose !== "login_mapping") throw new TypeError("Employee/User link purpose must be login_mapping");
    if (row.employee_id === row.user_id) throw new TypeError("Employee and IAM User identifiers must remain separate");
    const employeeExists = state.tables.hrx_employees.some(
      (employee) => employee.tenant_id === row.tenant_id && employee.employee_id === row.employee_id,
    );
    if (!employeeExists) throw new ReferenceError(`EmployeeUserLink employee not found: ${row.employee_id}`);
    const duplicateUserPurpose = state.tables.hrx_employee_user_links.some(
      (link) =>
        link.tenant_id === row.tenant_id &&
        link.user_id === row.user_id &&
        link.purpose === row.purpose &&
        !samePrimaryKey(table, link, row),
    );
    if (duplicateUserPurpose) throw new Error(`EmployeeUserLink already exists for user/purpose: ${row.user_id}`);
  }
  if (table === "hrx_documents") {
    for (const blocked of ["body", "content", "text", "document_body"]) {
      if (Object.hasOwn(row, blocked)) throw new TypeError(`HR document metadata must not include ${blocked}`);
    }
    if (row.document_body_included !== false) throw new TypeError("HR document body must not be stored");
  }
  if (table === "hrx_audit_events") {
    if (typeof row.event_hash !== "string" || row.event_hash.trim() === "") {
      throw new TypeError("HRX audit event_hash is required");
    }
  }
}

function executeQuery(state, operation, params = {}) {
  if (typeof operation !== "string" || operation.trim() === "") {
    throw new TypeError("HRX store query operation is required");
  }
  const table = params.table;
  if (table) requireTable(table);

  if (operation === "insert") {
    const row = clone(params.row);
    assertPrimaryKey(table, row);
    assertCoreConstraints(state, table, row);
    if (state.tables[table].some((current) => samePrimaryKey(table, current, row))) {
      throw new Error(`${table} already exists`);
    }
    state.tables[table].push(row);
    return clone(row);
  }

  if (operation === "select") {
    return state.tables[table].filter((row) => matchesWhere(row, params.where)).map(clone);
  }

  if (operation === "selectOne") {
    return clone(state.tables[table].find((row) => matchesWhere(row, params.where)));
  }

  if (operation === "updateOne") {
    const index = state.tables[table].findIndex((row) => matchesWhere(row, params.where));
    if (index === -1) return undefined;
    const next = { ...state.tables[table][index], ...clone(params.patch) };
    assertPrimaryKey(table, next);
    assertCoreConstraints(state, table, next);
    state.tables[table][index] = next;
    return clone(next);
  }

  if (operation === "deleteOne") {
    const index = state.tables[table].findIndex((row) => matchesWhere(row, params.where));
    if (index === -1) return false;
    state.tables[table].splice(index, 1);
    return true;
  }

  throw new TypeError(`unsupported HRX store query operation: ${operation}`);
}

export function createFileHrxStore({ filePath, initialState } = {}) {
  let state = normalizeState(filePath && existsSync(filePath) ? JSON.parse(readFileSync(filePath, "utf8")) : initialState);
  let closed = false;

  function ensureOpen() {
    if (closed) throw new Error("HRX store is closed");
  }

  function flush() {
    if (!filePath) return;
    mkdirSync(dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`);
    renameSync(tempPath, filePath);
  }

  const store = {
    kind: "hrx-file-sql-store",
    version: HRX_STORE_PORT_VERSION,
    capabilities: Object.freeze({
      durable: Boolean(filePath),
      migrations: true,
      transactions: true,
      tables: TABLES,
    }),

    query(operation, params = {}) {
      ensureOpen();
      const result = executeQuery(state, operation, params);
      if (["insert", "updateOne", "deleteOne"].includes(operation)) flush();
      return result;
    },

    transaction(callback) {
      ensureOpen();
      if (typeof callback !== "function") throw new TypeError("transaction callback is required");
      const original = clone(state);
      const draft = clone(state);
      const transactionStore = {
        ...store,
        query(operation, params = {}) {
          return executeQuery(draft, operation, params);
        },
        transaction() {
          throw new Error("nested HRX transactions are not supported");
        },
      };
      try {
        const result = callback(transactionStore);
        state = normalizeState(draft);
        flush();
        return result;
      } catch (error) {
        state = normalizeState(original);
        throw error;
      }
    },

    migrate(migration) {
      ensureOpen();
      if (!migration || typeof migration.id !== "string" || typeof migration.sql !== "string") {
        throw new TypeError("migration id and sql are required");
      }
      if (state.applied_migrations.some((applied) => applied.id === migration.id)) {
        return { id: migration.id, applied: false };
      }
      for (const table of TABLES) {
        if (!Array.isArray(state.tables[table])) state.tables[table] = [];
      }
      const applied = {
        id: migration.id,
        hash: hash(migration.sql),
        applied_at: migration.applied_at ?? new Date(0).toISOString(),
      };
      state.applied_migrations.push(applied);
      flush();
      return { id: migration.id, applied: true, hash: applied.hash };
    },

    snapshot() {
      ensureOpen();
      return clone(state);
    },

    close() {
      if (!closed) flush();
      closed = true;
    },
  };

  return store;
}
