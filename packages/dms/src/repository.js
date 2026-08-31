import { createDurableJsonStateController } from "../../persistence/src/durable-file.js";
import { createDmsCoreRecord } from "./model.js";
import { DMS_RUNTIME_MIGRATIONS } from "./migrations/index.js";
import { assertNoDmsPersistedSecrets, projectDmsPersistedRecord } from "./persistence-guard.js";

export const DMS_PRIMARY_ID_FIELDS = Object.freeze({
  DmsWorkspace: "workspace_id",
  DmsFolder: "folder_id",
  DmsDocument: "document_id",
  DmsDocumentVersion: "version_id",
  DmsFileObject: "file_object_id",
  DmsRendition: "rendition_id",
  DmsExtractedText: "extracted_text_id",
  DmsOcrResult: "ocr_result_id",
  DmsEmailThread: "email_thread_id",
  DmsEmailAttachmentMapping: "mapping_id",
  DmsDocumentRelation: "relation_id",
  DmsLock: "lock_id",
  DmsPrivilegeLabel: "label_id",
  DmsLegalHold: "legal_hold_id",
  DmsRetentionPolicy: "retention_policy_id",
  DmsRedaction: "redaction_id",
  DmsSecureLink: "secure_link_id",
  DmsSearchIndex: "index_id",
  DmsRagEvidence: "ledger_id",
  VaultSearchPreferences: "resource_id",
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function assertTenant(value) {
  if (typeof value !== "string" || value.trim() === "") throw new TypeError("tenant_id is required");
}

export function primaryIdOf(record) {
  const field = DMS_PRIMARY_ID_FIELDS[record.model_type];
  return field ? record[field] : record.resource_id ?? record.id;
}

function normalizeRecord(input = {}) {
  assertNoDmsPersistedSecrets(input);
  if (typeof input.model_type !== "string" || input.model_type.trim() === "") {
    throw new TypeError("model_type is required");
  }
  if (!Object.hasOwn(DMS_PRIMARY_ID_FIELDS, input.model_type)) {
    throw new TypeError(`unsupported DMS model_type: ${input.model_type}`);
  }
  const record = DMS_PRIMARY_ID_FIELDS[input.model_type] && input.model_type.startsWith("Dms") && ![
    "DmsLock",
    "DmsPrivilegeLabel",
    "DmsLegalHold",
    "DmsRetentionPolicy",
    "DmsRedaction",
    "DmsSecureLink",
    "DmsSearchIndex",
    "DmsRagEvidence",
    "DmsEmailAttachmentMapping",
  ].includes(input.model_type)
    ? projectDmsPersistedRecord({ ...input, ...createDmsCoreRecord(input.model_type, input) })
    : projectDmsPersistedRecord(input);
  assertTenant(record.tenant_id);
  const resourceId = primaryIdOf(record);
  if (typeof resourceId !== "string" || resourceId.trim() === "") {
    throw new TypeError(`${record.model_type} resource id is required`);
  }
  const now = new Date().toISOString();
  return Object.freeze(projectDmsPersistedRecord({
    ...record,
    resource_id: resourceId,
    created_at: record.created_at ?? now,
    updated_at: now,
    writes_product_state: true,
    creates_database_rows: record.creates_database_rows ?? true,
  }));
}

function recordKey(record) {
  return `${record.tenant_id}:${record.model_type}:${primaryIdOf(record)}`;
}

function refKey(ref = {}) {
  const modelType = ref.model_type;
  const field = DMS_PRIMARY_ID_FIELDS[modelType];
  const id = ref.id ?? ref.resource_id ?? (field ? ref[field] : undefined);
  return `${ref.tenant_id}:${modelType}:${id}`;
}

function emptyState() {
  return {
    migrations: [...DMS_RUNTIME_MIGRATIONS],
    records: [],
    idempotency: [],
    audit_events: [],
  };
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

export function createDmsRepository({ filePath, seedRecords = [], preserveSeedRecords = false } = {}) {
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

  function assertOpen() {
    if (closed) throw new Error("DMS repository is closed");
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
        assertNoDmsPersistedSecrets(record);
        records.set(recordKey(normalized), clone(projectDmsPersistedRecord({ ...record, resource_id: normalized.resource_id })));
        persist();
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
          .filter((record) => !query.workspace_id || record.workspace_id === query.workspace_id)
          .filter((record) => !query.document_id || record.document_id === query.document_id)
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
      assertNoDmsPersistedSecrets(entry, "idempotency");
      assertTenant(entry.tenant_id);
      if (typeof entry.idempotency_key !== "string" || entry.idempotency_key.trim() === "") {
        throw new TypeError("idempotency_key is required");
      }
      const value = Object.freeze({
        tenant_id: entry.tenant_id,
        idempotency_key: entry.idempotency_key,
        operation: entry.operation ?? "dms_operation",
        request_fingerprint: entry.request_fingerprint ?? null,
        response: clone(entry.response ?? {}),
        created_at: entry.created_at ?? new Date().toISOString(),
      });
      idempotency.set(`${value.tenant_id}:${value.idempotency_key}`, clone(value));
      persist();
      return value;
    },
    claimIdempotency(entry = {}) {
      assertOpen();
      assertNoDmsPersistedSecrets(entry, "idempotency_claim");
      assertTenant(entry.tenant_id);
      const key = typeof entry.key === "string" ? entry.key.trim() : "";
      const requestHash = typeof entry.request_hash === "string"
        ? entry.request_hash.trim()
        : "";
      if (!key) throw new TypeError("idempotency key is required");
      if (!/^[a-f0-9]{64}$/u.test(requestHash)) {
        throw new TypeError("idempotency request_hash must be a SHA-256 hash");
      }
      const storageKey = `${entry.tenant_id}:${key}`;
      const current = idempotency.get(storageKey);
      if (current) {
        if (current.request_fingerprint !== requestHash) {
          throw Object.assign(
            new Error("idempotency key reused with a different request"),
            {
              code: "LAWOS_IDEMPOTENCY_CONFLICT",
              safe_error_code: "IDEMPOTENCY_KEY_REUSED",
              status: 409,
            },
          );
        }
        return Object.freeze({
          replayed: true,
          record: Object.freeze({
            tenant_id: current.tenant_id,
            key: current.idempotency_key,
            request_hash: current.request_fingerprint,
            response: clone(current.response),
            created_at: current.created_at,
          }),
        });
      }
      const value = Object.freeze({
        tenant_id: entry.tenant_id,
        idempotency_key: key,
        operation: `request-hash:${requestHash}`,
        request_fingerprint: requestHash,
        response: clone(entry.response ?? null),
        created_at: entry.created_at ?? new Date().toISOString(),
      });
      idempotency.set(storageKey, clone(value));
      persist();
      return Object.freeze({
        replayed: false,
        record: Object.freeze({
          tenant_id: value.tenant_id,
          key: value.idempotency_key,
          request_hash: value.request_fingerprint,
          response: clone(value.response),
          created_at: value.created_at,
        }),
      });
    },
    getIdempotency(ref = {}) {
      assertOpen();
      return Object.freeze(clone(idempotency.get(`${ref.tenant_id}:${ref.idempotency_key}`)));
    },
    appendAudit(event = {}) {
      assertOpen();
      assertNoDmsPersistedSecrets(event, "audit_event");
      assertTenant(event.tenant_id);
      if (typeof event.event_id !== "string" || event.event_id.trim() === "") throw new TypeError("event_id is required");
      const value = Object.freeze(clone(event));
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
