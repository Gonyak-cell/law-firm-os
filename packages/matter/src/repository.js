import { existsSync } from "node:fs";
import { readFileSyncWithStaleRetry, writeJsonFileDurably } from "../../persistence/src/durable-file.js";
import { MATTER_CORE_MIGRATIONS } from "./migrations/index.js";
import {
  normalizeRepositoryRecord,
  primaryIdOf,
  repositoryRecordKey,
  repositoryRefKey,
} from "./repository-record.js";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function assertTenant(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("tenant_id is required");
}

function findUniquenessConflict({ records, record, key }) {
  if (record.model_type === "MatterWorktree" && record.status === "active") {
    return [...records.entries()].find(
      ([existingKey, existing]) =>
        existingKey !== key
        && existing.tenant_id === record.tenant_id
        && existing.model_type === "MatterWorktree"
        && existing.matter_id === record.matter_id
        && existing.status === "active",
    )?.[1];
  }
  if (record.model_type === "Matter" && record.matter_code) {
    return [...records.entries()].find(
      ([existingKey, existing]) =>
        existingKey !== key
        && existing.tenant_id === record.tenant_id
        && existing.model_type === "Matter"
        && existing.matter_code === record.matter_code,
    )?.[1];
  }
  if (record.model_type === "MatterClient" && record.client_short_name) {
    return [...records.entries()].find(
      ([existingKey, existing]) =>
        existingKey !== key
        && existing.tenant_id === record.tenant_id
        && existing.model_type === "MatterClient"
        && existing.client_short_name === record.client_short_name,
    )?.[1];
  }
  return null;
}

function emptyState() {
  return {
    migrations: [...MATTER_CORE_MIGRATIONS],
    records: [],
    idempotency: [],
    audit_events: [],
  };
}

function mergeMigrations(migrations = []) {
  const merged = new Map(migrations.map((migration) => [migration.id, migration]));
  for (const migration of MATTER_CORE_MIGRATIONS) merged.set(migration.id, migration);
  return [...merged.values()];
}

function loadState(filePath) {
  if (!filePath || !existsSync(filePath)) return emptyState();
  const parsed = JSON.parse(readFileSyncWithStaleRetry(filePath));
  const migrations = mergeMigrations(parsed.migrations);
  return {
    ...emptyState(),
    ...parsed,
    migrations,
    migration_upgrade_required: JSON.stringify(parsed.migrations ?? []) !== JSON.stringify(migrations),
    records: parsed.records ?? [],
    idempotency: parsed.idempotency ?? [],
    audit_events: parsed.audit_events ?? [],
  };
}

export function createMatterRepository({ filePath, seedRecords = [] } = {}) {
  let closed = false;
  let state = loadState(filePath);
  const records = new Map();
  const idempotency = new Map();
  const auditEvents = new Map();

  function currentState() {
    return {
      migrations: state.migrations,
      records: [...records.values()],
      idempotency: [...idempotency.values()],
      audit_events: [...auditEvents.values()],
    };
  }

  function persist({ createBackup = true } = {}) {
    if (!filePath) return;
    const nextState = currentState();
    writeJsonFileDurably({
      filePath,
      value: nextState,
      previousState: state,
      createBackup,
    });
    state = nextState;
  }

  function assertOpen() {
    if (closed) throw new Error("Matter repository is closed");
  }

  function put(record, { overwrite = false, createBackup = true } = {}) {
    const normalized = normalizeRepositoryRecord(record);
    const key = repositoryRecordKey(normalized);
    const conflict = findUniquenessConflict({ records, record: normalized, key });
    if (conflict) {
      if (normalized.model_type === "MatterWorktree") {
        throw new Error(`active MatterWorktree already exists for Matter ${normalized.matter_id}`);
      }
      const field = normalized.model_type === "Matter" ? "matter_code" : "client_short_name";
      throw new Error(`${normalized.model_type} ${field} already exists: ${normalized[field]}`);
    }
    if (!overwrite && records.has(key)) throw new Error(`${normalized.model_type} already exists: ${primaryIdOf(normalized)}`);
    records.set(key, clone(normalized));
    persist({ createBackup });
    return Object.freeze(clone(normalized));
  }

  for (const record of state.records) records.set(repositoryRecordKey(record), clone(record));
  for (const entry of state.idempotency) idempotency.set(`${entry.tenant_id}:${entry.idempotency_key}`, clone(entry));
  for (const event of state.audit_events) auditEvents.set(`${event.tenant_id}:${event.event_id}`, clone(event));
  if (state.migration_upgrade_required) persist();
  for (const record of seedRecords) {
    if (!records.has(repositoryRecordKey(normalizeRepositoryRecord(record)))) put(record, { overwrite: true, createBackup: false });
  }

  return Object.freeze({
    durable: Boolean(filePath),
    migrations: Object.freeze([...state.migrations]),
    create(record) {
      assertOpen();
      return put(record);
    },
    upsert(record) {
      assertOpen();
      return put(record, { overwrite: true });
    },
    update(ref, patch = {}) {
      assertOpen();
      const current = records.get(repositoryRefKey(ref));
      if (!current) throw new Error(`${ref.model_type} not found: ${ref.id ?? ref.resource_id}`);
      return put({ ...current, ...patch, tenant_id: current.tenant_id, model_type: current.model_type, resource_id: current.resource_id }, { overwrite: true });
    },
    get(ref) {
      assertOpen();
      return Object.freeze(clone(records.get(repositoryRefKey(ref))));
    },
    list(query = {}) {
      assertOpen();
      return Object.freeze(
        [...records.values()]
          .filter((record) => !query.tenant_id || record.tenant_id === query.tenant_id)
          .filter((record) => !query.model_type || record.model_type === query.model_type)
          .filter((record) => !query.matter_id || record.matter_id === query.matter_id)
          .map((record) => Object.freeze(clone(record))),
      );
    },
    delete(ref) {
      assertOpen();
      const deleted = records.delete(repositoryRefKey(ref));
      persist();
      return deleted;
    },
    recordIdempotency(entry = {}) {
      assertOpen();
      assertTenant(entry.tenant_id);
      if (typeof entry.idempotency_key !== "string" || entry.idempotency_key.trim() === "") {
        throw new TypeError("idempotency_key is required");
      }
      const value = Object.freeze({
        tenant_id: entry.tenant_id,
        idempotency_key: entry.idempotency_key,
        operation: entry.operation ?? "matter_operation",
        response: clone(entry.response ?? {}),
        created_at: entry.created_at ?? new Date().toISOString(),
      });
      idempotency.set(`${value.tenant_id}:${value.idempotency_key}`, clone(value));
      persist();
      return value;
    },
    getIdempotency(ref = {}) {
      assertOpen();
      return Object.freeze(clone(idempotency.get(`${ref.tenant_id}:${ref.idempotency_key}`)));
    },
    appendAudit(event = {}) {
      assertOpen();
      assertTenant(event.tenant_id);
      const eventId = event.event_id;
      if (typeof eventId !== "string" || eventId.trim() === "") throw new TypeError("event_id is required");
      const value = Object.freeze({ ...clone(event), event_id: eventId });
      auditEvents.set(`${value.tenant_id}:${value.event_id}`, clone(value));
      persist();
      return value;
    },
    listAudit(query = {}) {
      assertOpen();
      return Object.freeze(
        [...auditEvents.values()]
          .filter((event) => !query.tenant_id || event.tenant_id === query.tenant_id)
          .filter((event) => !query.object_id || event.object_id === query.object_id)
          .map((event) => Object.freeze(clone(event))),
      );
    },
    transaction(fn) {
      assertOpen();
      const before = {
        records: new Map([...records.entries()].map(([key, value]) => [key, clone(value)])),
        idempotency: new Map([...idempotency.entries()].map(([key, value]) => [key, clone(value)])),
        auditEvents: new Map([...auditEvents.entries()].map(([key, value]) => [key, clone(value)])),
      };
      try {
        const result = fn(this);
        persist();
        return result;
      } catch (error) {
        records.clear();
        idempotency.clear();
        auditEvents.clear();
        for (const [key, value] of before.records) records.set(key, value);
        for (const [key, value] of before.idempotency) idempotency.set(key, value);
        for (const [key, value] of before.auditEvents) auditEvents.set(key, value);
        persist();
        throw error;
      }
    },
    snapshot() {
      assertOpen();
      return Object.freeze({
        records: Object.freeze([...records.values()].map((record) => Object.freeze(clone(record)))),
        idempotency: Object.freeze([...idempotency.values()].map((entry) => Object.freeze(clone(entry)))),
        audit_events: Object.freeze([...auditEvents.values()].map((event) => Object.freeze(clone(event)))),
      });
    },
    close() {
      closed = true;
    },
  });
}
