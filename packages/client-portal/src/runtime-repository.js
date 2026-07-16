import { createDurableJsonStateController } from "../../persistence/src/durable-file.js";

export const PORTAL_PRIMARY_ID_FIELDS = Object.freeze({
  ExternalUser: "external_user_id",
  ExternalAcl: "external_acl_id",
  PortalProjection: "portal_projection_id",
  RfiRequest: "rfi_request_id",
  RfiResponse: "rfi_response_id",
  ClientApproval: "client_approval_id",
  SecureLink: "secure_link_id",
  PortalDashboardProjection: "dashboard_projection_id",
  DataRoom: "data_room_id",
  DataRoomProjection: "data_room_projection_id",
});

export const PORTAL_NON_PERSISTENT_FIELDS = Object.freeze([
  "credential_material",
  "document_bytes",
  "one_time_url",
  "raw_payload",
  "secret_token",
  "source_payload",
  "storage_pointer",
  "storage_pointer_ref",
  "token",
]);

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function safeRecordInput(input) {
  const safe = clone(input);
  for (const field of PORTAL_NON_PERSISTENT_FIELDS) delete safe[field];
  return safe;
}

function primaryIdOf(record) {
  const field = PORTAL_PRIMARY_ID_FIELDS[record.model_type];
  return field ? record[field] : record.resource_id ?? record.id;
}

function assertTenant(tenantId) {
  if (typeof tenantId !== "string" || tenantId.trim() === "") throw new TypeError("tenant_id is required");
}

function normalizeRecord(input = {}) {
  if (typeof input.model_type !== "string" || input.model_type.trim() === "") throw new TypeError("model_type is required");
  assertTenant(input.tenant_id);
  const resourceId = primaryIdOf(input);
  if (typeof resourceId !== "string" || resourceId.trim() === "") throw new TypeError(`${input.model_type} resource id is required`);
  const safeInput = safeRecordInput(input);
  const now = new Date().toISOString();
  return Object.freeze({
    ...safeInput,
    resource_id: resourceId,
    owner_module: input.owner_module ?? "client-portal",
    created_at: input.created_at ?? now,
    updated_at: now,
    writes_product_state: true,
    creates_database_rows: input.creates_database_rows ?? true,
    updates_database_rows: input.updates_database_rows ?? false,
    deletes_database_rows: false,
    evaluates_runtime_permission: true,
    writes_audit_event: input.writes_audit_event ?? true,
    dispatches_client_portal_runtime: true,
    dispatches_data_room_runtime: input.model_type === "DataRoom" || input.model_type === "DataRoomProjection",
    dms_acl_inherited: input.dms_acl_inherited === true,
    external_access_checked: input.external_access_checked ?? true,
    document_bytes_included: false,
    storage_pointer_ref_included: false,
    credential_material_included: false,
    token_material_included: false,
    production_ready_claim: false,
  });
}

function recordKey(record) {
  return `${record.tenant_id}:${record.model_type}:${primaryIdOf(record)}`;
}

function refKey(ref = {}) {
  const field = PORTAL_PRIMARY_ID_FIELDS[ref.model_type];
  const id = ref.id ?? ref.resource_id ?? (field ? ref[field] : undefined);
  return `${ref.tenant_id}:${ref.model_type}:${id}`;
}

function emptyState() {
  return { migrations: ["client-portal-runtime-001-file-store"], records: [], idempotency: [], audit_events: [] };
}

function normalizeState(input) {
  const parsed = input ?? emptyState();
  return { ...emptyState(), ...parsed, records: parsed.records ?? [], idempotency: parsed.idempotency ?? [], audit_events: parsed.audit_events ?? [] };
}

export function createClientPortalRepository({
  filePath,
  seedRecords = [],
  preserveSeedRecords = false,
} = {}) {
  let closed = false;
  let transactionDepth = 0;
  const stateController = createDurableJsonStateController({ filePath, defaultValue: emptyState(), normalizeValue: normalizeState });
  let state = stateController.value;
  const records = new Map();
  const idempotency = new Map();
  const auditEvents = new Map();

  function hydrate(nextState) {
    records.clear();
    idempotency.clear();
    auditEvents.clear();
    for (const record of nextState.records) records.set(recordKey(record), clone(record));
    for (const entry of nextState.idempotency) idempotency.set(`${entry.tenant_id}:${entry.idempotency_key}`, clone(entry));
    for (const event of nextState.audit_events) auditEvents.set(`${event.tenant_id}:${event.event_id}`, clone(event));
  }

  function assertOpen() {
    if (closed) throw new Error("Client portal repository is closed");
  }

  function persist({ force = false } = {}) {
    if (!filePath || (transactionDepth > 0 && !force)) return;
    try {
      stateController.commit({ migrations: state.migrations, records: [...records.values()], idempotency: [...idempotency.values()], audit_events: [...auditEvents.values()] });
      state = stateController.value;
    } catch (error) {
      try {
        state = stateController.reload().value;
        hydrate(state);
        error.durable_store_reloaded = true;
      } catch {}
      throw error;
    }
  }

  function put(record, { overwrite = false } = {}) {
    const normalized = normalizeRecord(record);
    const key = recordKey(normalized);
    if (!overwrite && records.has(key)) throw new Error(`${normalized.model_type} already exists: ${primaryIdOf(normalized)}`);
    records.set(key, clone(normalized));
    persist();
    return Object.freeze(clone(normalized));
  }

  hydrate(state);
  for (const record of seedRecords) {
    const normalized = normalizeRecord(record);
    if (!records.has(recordKey(normalized))) {
      if (preserveSeedRecords) {
        records.set(recordKey(normalized), clone({ ...record, resource_id: normalized.resource_id }));
      } else {
        put(record, { overwrite: true });
      }
    }
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
      return put({ ...current, ...patch, tenant_id: current.tenant_id, model_type: current.model_type, updates_database_rows: true }, { overwrite: true });
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
    recordIdempotency(entry = {}) {
      assertOpen();
      assertTenant(entry.tenant_id);
      if (typeof entry.idempotency_key !== "string" || entry.idempotency_key.trim() === "") throw new TypeError("idempotency_key is required");
      const value = Object.freeze({ tenant_id: entry.tenant_id, idempotency_key: entry.idempotency_key, operation: entry.operation ?? "portal_operation", response: clone(entry.response ?? {}), created_at: entry.created_at ?? new Date().toISOString() });
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
      return Object.freeze([...auditEvents.values()].filter((event) => !query.tenant_id || event.tenant_id === query.tenant_id).map((event) => Object.freeze(clone(event))));
    },
    transaction(fn) {
      assertOpen();
      const entryDepth = transactionDepth;
      const before = {
        records: new Map([...records.entries()].map(([key, value]) => [key, clone(value)])),
        idempotency: new Map([...idempotency.entries()].map(([key, value]) => [key, clone(value)])),
        auditEvents: new Map([...auditEvents.entries()].map(([key, value]) => [key, clone(value)])),
      };
      transactionDepth = entryDepth + 1;
      try {
        const result = fn(repository);
        transactionDepth = entryDepth;
        persist({ force: entryDepth === 0 });
        return result;
      } catch (error) {
        if (!error?.durable_store_reloaded) {
          records.clear();
          idempotency.clear();
          auditEvents.clear();
          for (const [key, value] of before.records) records.set(key, value);
          for (const [key, value] of before.idempotency) idempotency.set(key, value);
          for (const [key, value] of before.auditEvents) auditEvents.set(key, value);
        }
        transactionDepth = entryDepth;
        throw error;
      } finally {
        transactionDepth = entryDepth;
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
