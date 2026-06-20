import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function loadState(filePath) {
  if (!filePath || !existsSync(filePath)) return { records: [], idempotency: [], audit_events: [] };
  const parsed = JSON.parse(readFileSync(filePath, "utf8"));
  return { records: parsed.records ?? [], idempotency: parsed.idempotency ?? [], audit_events: parsed.audit_events ?? [] };
}

function requireString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createTrustRuntimeStore({ filePath, store_kind = "trust-runtime-store", seedRecords = [] } = {}) {
  const state = loadState(filePath);
  const records = new Map(state.records.map((record) => [`${record.tenant_id}:${record.record_type}:${record.record_id}`, clone(record)]));
  const idempotency = new Map(state.idempotency.map((entry) => [`${entry.tenant_id}:${entry.idempotency_key}`, clone(entry)]));
  const auditEvents = new Map(state.audit_events.map((event) => [`${event.tenant_id}:${event.event_id}`, clone(event)]));

  function persist() {
    if (!filePath) return;
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, `${JSON.stringify({ store_kind, records: [...records.values()], idempotency: [...idempotency.values()], audit_events: [...auditEvents.values()] }, null, 2)}\n`);
  }

  function put(record) {
    requireString(record, "tenant_id");
    requireString(record, "record_type");
    requireString(record, "record_id");
    const now = new Date().toISOString();
    const value = Object.freeze({
      ...clone(record),
      created_at: record.created_at ?? now,
      updated_at: now,
      writes_product_state: true,
      creates_database_rows: record.creates_database_rows ?? true,
      evaluates_runtime_permission: true,
      writes_audit_event: true,
      production_ready_claim: false,
    });
    records.set(`${value.tenant_id}:${value.record_type}:${value.record_id}`, clone(value));
    persist();
    return value;
  }

  for (const record of seedRecords) {
    const key = `${record.tenant_id}:${record.record_type}:${record.record_id}`;
    if (!records.has(key)) put(record);
  }

  return Object.freeze({
    durable: Boolean(filePath),
    put,
    get({ tenant_id, record_type, record_id } = {}) {
      return Object.freeze(clone(records.get(`${tenant_id}:${record_type}:${record_id}`)));
    },
    list({ tenant_id, record_type } = {}) {
      return Object.freeze([...records.values()].filter((record) => !tenant_id || record.tenant_id === tenant_id).filter((record) => !record_type || record.record_type === record_type).map((record) => Object.freeze(clone(record))));
    },
    recordIdempotency(entry = {}) {
      requireString(entry, "tenant_id");
      requireString(entry, "idempotency_key");
      const value = Object.freeze({ ...clone(entry), created_at: entry.created_at ?? new Date().toISOString() });
      idempotency.set(`${value.tenant_id}:${value.idempotency_key}`, clone(value));
      persist();
      return value;
    },
    getIdempotency(ref = {}) {
      return Object.freeze(clone(idempotency.get(`${ref.tenant_id}:${ref.idempotency_key}`)));
    },
    appendAudit(event = {}) {
      requireString(event, "tenant_id");
      requireString(event, "event_id");
      const value = Object.freeze({ ...clone(event), production_ready_claim: false });
      auditEvents.set(`${value.tenant_id}:${value.event_id}`, clone(value));
      persist();
      return value;
    },
    listAudit({ tenant_id } = {}) {
      return Object.freeze([...auditEvents.values()].filter((event) => !tenant_id || event.tenant_id === tenant_id).map((event) => Object.freeze(clone(event))));
    },
  });
}

export function writeTrustRecord({ store, record, actor_id, idempotency_key, action } = {}) {
  requireString({ actor_id }, "actor_id");
  requireString({ idempotency_key }, "idempotency_key");
  const replay = store.getIdempotency({ tenant_id: record.tenant_id, idempotency_key });
  if (replay) return Object.freeze({ ...replay.response, idempotent_replay: true });
  const item = store.put(record);
  const audit_event = store.appendAudit({
    tenant_id: item.tenant_id,
    event_id: `trust:${action}:${item.tenant_id}:${item.record_type}:${item.record_id}:${idempotency_key}`,
    actor_id,
    action,
    object_type: item.record_type,
    object_id: item.record_id,
    occurred_at: new Date().toISOString(),
  });
  const response = Object.freeze({ outcome: "updated", item, audit_event, idempotent_replay: false });
  store.recordIdempotency({ tenant_id: item.tenant_id, idempotency_key, operation: action, response });
  return response;
}
