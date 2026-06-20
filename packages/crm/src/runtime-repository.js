import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createCrmCoreRecord } from "./model.js";

const PRIMARY_ID_FIELDS = Object.freeze({
  Lead: "lead_id",
  Opportunity: "opportunity_id",
  CRMActivity: "crm_activity_id",
  Proposal: "proposal_id",
  Referral: "referral_id",
  Campaign: "campaign_id",
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function assertTenant(tenantId) {
  if (typeof tenantId !== "string" || tenantId.trim() === "") throw new TypeError("tenant_id is required");
}

function primaryIdOf(record) {
  const field = PRIMARY_ID_FIELDS[record.model_type];
  return field ? record[field] : record.resource_id ?? record.id;
}

function normalizeRecord(input = {}) {
  if (typeof input.model_type !== "string" || input.model_type.trim() === "") {
    throw new TypeError("model_type is required");
  }
  const coreRecord = PRIMARY_ID_FIELDS[input.model_type] ? createCrmCoreRecord(input.model_type, input) : input;
  const record = { ...input, ...coreRecord };
  assertTenant(record.tenant_id);
  const resourceId = primaryIdOf(record);
  if (typeof resourceId !== "string" || resourceId.trim() === "") {
    throw new TypeError(`${record.model_type} resource id is required`);
  }
  const now = new Date().toISOString();
  return Object.freeze({
    ...record,
    resource_id: resourceId,
    created_at: record.created_at ?? now,
    updated_at: now,
    writes_product_state: true,
    creates_database_rows: record.creates_database_rows ?? true,
    updates_database_rows: record.updates_database_rows ?? false,
    deletes_database_rows: false,
    evaluates_runtime_permission: true,
    writes_audit_event: record.writes_audit_event ?? true,
    dispatches_crm_runtime: true,
    executes_api_handler: record.executes_api_handler ?? false,
    g6_runtime_readiness_claim: "runtime_write_ready",
    production_ready_claim: false,
  });
}

function recordKey(record) {
  return `${record.tenant_id}:${record.model_type}:${primaryIdOf(record)}`;
}

function refKey(ref = {}) {
  const field = PRIMARY_ID_FIELDS[ref.model_type];
  const id = ref.id ?? ref.resource_id ?? (field ? ref[field] : undefined);
  return `${ref.tenant_id}:${ref.model_type}:${id}`;
}

function emptyState() {
  return { migrations: ["crm-runtime-001-file-store"], records: [], idempotency: [], audit_events: [] };
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

export function createCrmRuntimeRepository({ filePath, seedRecords = [] } = {}) {
  let closed = false;
  const state = loadState(filePath);
  const records = new Map();
  const idempotency = new Map();
  const auditEvents = new Map();

  function assertOpen() {
    if (closed) throw new Error("CRM runtime repository is closed");
  }

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
    const normalized = normalizeRecord(record);
    if (!records.has(recordKey(normalized))) put(record, { overwrite: true });
  }

  const repository = {
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
      return put({ ...current, ...patch, tenant_id: current.tenant_id, model_type: current.model_type }, { overwrite: true });
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
          .filter((record) => !query.party_id || record.party_id === query.party_id)
          .map((record) => Object.freeze(clone(record))),
      );
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
        operation: entry.operation ?? "crm_operation",
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
      if (typeof event.event_id !== "string" || event.event_id.trim() === "") throw new TypeError("event_id is required");
      const value = Object.freeze({ ...clone(event), production_ready_claim: false });
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
        const result = fn(repository);
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
  };

  return Object.freeze(repository);
}
