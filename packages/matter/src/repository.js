import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createMatterCoreRecord } from "./model.js";
import { MATTER_CORE_MIGRATIONS } from "./migrations/index.js";

const PRIMARY_ID_FIELDS = Object.freeze({
  Matter: "matter_id",
  MatterMember: "member_id",
  MatterTask: "task_id",
  MatterCalendarEvent: "event_id",
  MatterChecklist: "checklist_id",
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function primaryIdOf(record) {
  const field = PRIMARY_ID_FIELDS[record.model_type];
  return field ? record[field] : record.resource_id ?? record.id;
}

function assertTenant(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("tenant_id is required");
}

function normalizeRecord(input = {}) {
  if (typeof input.model_type !== "string" || input.model_type.trim() === "") {
    throw new TypeError("model_type is required");
  }
  const record = PRIMARY_ID_FIELDS[input.model_type]
    ? { ...input, ...createMatterCoreRecord(input.model_type, input) }
    : { ...input };
  assertTenant(record.tenant_id);
  const resourceId = primaryIdOf(record);
  if (typeof resourceId !== "string" || resourceId.trim() === "") {
    throw new TypeError(`${record.model_type} resource id is required`);
  }
  return Object.freeze({
    ...record,
    resource_id: resourceId,
    writes_product_state: true,
    creates_database_rows: record.creates_database_rows ?? true,
  });
}

function recordKey(record) {
  return `${record.tenant_id}:${record.model_type}:${primaryIdOf(record)}`;
}

function refKey(ref = {}) {
  const modelType = ref.model_type;
  const field = PRIMARY_ID_FIELDS[modelType];
  const id = ref.id ?? ref.resource_id ?? (field ? ref[field] : undefined);
  return `${ref.tenant_id}:${modelType}:${id}`;
}

function emptyState() {
  return {
    migrations: [...MATTER_CORE_MIGRATIONS],
    records: [],
    idempotency: [],
    audit_events: [],
  };
}

function loadState(filePath) {
  if (!filePath || !existsSync(filePath)) return emptyState();
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  return {
    ...emptyState(),
    ...parsed,
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

  function persist() {
    if (!filePath) return;
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(
      filePath,
      `${JSON.stringify(
        {
          migrations: state.migrations,
          records: [...records.values()],
          idempotency: [...idempotency.values()],
          audit_events: [...auditEvents.values()],
        },
        null,
        2,
      )}\n`,
    );
  }

  function assertOpen() {
    if (closed) throw new Error("Matter repository is closed");
  }

  function put(record, { overwrite = false } = {}) {
    const normalized = normalizeRecord(record);
    const key = recordKey(normalized);
    if (!overwrite && records.has(key)) throw new Error(`${normalized.model_type} already exists: ${primaryIdOf(normalized)}`);
    records.set(key, clone(normalized));
    persist();
    return Object.freeze(clone(normalized));
  }

  for (const record of state.records) records.set(recordKey(record), clone(record));
  for (const entry of state.idempotency) idempotency.set(`${entry.tenant_id}:${entry.idempotency_key}`, clone(entry));
  for (const event of state.audit_events) auditEvents.set(`${event.tenant_id}:${event.event_id}`, clone(event));
  for (const record of seedRecords) {
    if (!records.has(recordKey(normalizeRecord(record)))) put(record, { overwrite: true });
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
      const current = records.get(refKey(ref));
      if (!current) throw new Error(`${ref.model_type} not found: ${ref.id ?? ref.resource_id}`);
      return put({ ...current, ...patch, tenant_id: current.tenant_id, model_type: current.model_type, resource_id: current.resource_id }, { overwrite: true });
    },
    get(ref) {
      assertOpen();
      return Object.freeze(clone(records.get(refKey(ref))));
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
      const deleted = records.delete(refKey(ref));
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
