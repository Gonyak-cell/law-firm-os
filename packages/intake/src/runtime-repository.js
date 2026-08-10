import { createDurableJsonStateController } from "../../persistence/src/durable-file.js";
import { createIntakeCoreRecord } from "./model.js";

const CORE_MODELS = Object.freeze(["IntakeRequest", "ConflictCheck", "ConflictHit"]);

const PRIMARY_ID_FIELDS = Object.freeze({
  IntakeRequest: "intake_request_id",
  ConflictCheck: "conflict_check_id",
  ConflictHit: "conflict_hit_id",
  ConflictSearch: "conflict_search_id",
  ConflictDecision: "conflict_decision_id",
  Waiver: "waiver_id",
  Engagement: "engagement_id",
  EngagementTemplateDocument: "template_document_id",
  EngagementSignedDocumentUpload: "signed_document_upload_id",
  FeeTerms: "fee_terms_id",
  RiskApproval: "risk_approval_id",
  ClearanceToken: "clearance_token_id",
  ConflictMemo: "conflict_memo_id",
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
  const coreRecord = CORE_MODELS.includes(input.model_type) ? createIntakeCoreRecord(input.model_type, input) : input;
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
    owner_module: "intake",
    created_at: record.created_at ?? now,
    updated_at: record.updated_at ?? now,
    writes_product_state: true,
    creates_database_rows: record.creates_database_rows ?? true,
    updates_database_rows: record.updates_database_rows ?? false,
    deletes_database_rows: false,
    evaluates_runtime_permission: true,
    writes_audit_event: record.writes_audit_event ?? true,
    dispatches_intake_runtime: true,
    executes_api_handler: record.executes_api_handler ?? false,
    creates_matter: false,
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
  return { migrations: ["intake-runtime-001-file-store"], records: [], idempotency: [], audit_events: [] };
}

function normalizeState(input) {
  const parsed = input ?? emptyState();
  return {
    ...emptyState(),
    ...parsed,
    records: parsed.records ?? [],
    idempotency: parsed.idempotency ?? [],
    audit_events: parsed.audit_events ?? [],
  };
}

export function createIntakeRuntimeRepository({
  filePath,
  seedRecords = [],
  preserveSeedRecords = false,
} = {}) {
  let closed = false;
  let transactionDepth = 0;
  const stateController = createDurableJsonStateController({
    filePath,
    defaultValue: emptyState(),
    normalizeValue: normalizeState,
  });
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
    if (closed) throw new Error("Intake runtime repository is closed");
  }

  function currentState() {
    return {
      migrations: state.migrations,
      records: [...records.values()],
      idempotency: [...idempotency.values()],
      audit_events: [...auditEvents.values()],
    };
  }

  function persist({ createBackup = true, force = false } = {}) {
    if (!filePath || (transactionDepth > 0 && !force)) return;
    const nextState = currentState();
    try {
      stateController.commit(nextState, { createBackup });
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

  function put(record, { overwrite = false, createBackup = true } = {}) {
    const normalized = normalizeRecord(record);
    const key = recordKey(normalized);
    if (!overwrite && records.has(key)) throw new Error(`${normalized.model_type} already exists: ${primaryIdOf(normalized)}`);
    records.set(key, clone(normalized));
    persist({ createBackup });
    return Object.freeze(clone(normalized));
  }

  hydrate(state);
  for (const record of seedRecords) {
    const normalized = normalizeRecord(record);
    if (!records.has(recordKey(normalized))) {
      if (preserveSeedRecords) {
        records.set(recordKey(normalized), clone({ ...record, resource_id: normalized.resource_id }));
        persist({ createBackup: false });
      } else {
        put(record, { overwrite: true, createBackup: false });
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
          .filter((record) => !query.intake_request_id || record.intake_request_id === query.intake_request_id)
          .filter((record) => !query.conflict_check_id || record.conflict_check_id === query.conflict_check_id)
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
        operation: entry.operation ?? "intake_operation",
        object_type: entry.object_type ?? null,
        object_id: entry.object_id ?? null,
        actor_id: entry.actor_id ?? null,
        request_fingerprint: entry.request_fingerprint ?? null,
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
