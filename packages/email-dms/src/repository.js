import { createDurableJsonStateController } from "../../persistence/src/durable-file.js";
import { assertNoDmsPersistedSecrets } from "../../dms/src/persistence-guard.js";
import { normalizeM365Connection } from "./m365-connection-model.js";
import { normalizePeopleOutlookConnection } from "./people-outlook-connection-model.js";
import {
  normalizeInquiryEmailEvidence,
  normalizeInquiryEvidenceFileObject,
} from "./inquiry-evidence-model.js";

export const EMAIL_DMS_PRIMARY_ID_FIELDS = Object.freeze({
  M365Connection: "m365_connection_id",
  PeopleOutlookConnection: "people_outlook_connection_id",
  InquiryEmailEvidence: "inquiry_email_evidence_id",
  InquiryEvidenceFileObject: "inquiry_evidence_file_object_id",
});

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function assertTenant(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError("tenant_id is required");
  }
}

function assertModelType(value) {
  if (!Object.hasOwn(EMAIL_DMS_PRIMARY_ID_FIELDS, value)) {
    throw new TypeError(`unsupported Email DMS model_type: ${value}`);
  }
  return value;
}

export function emailDmsPrimaryIdOf(record = {}) {
  const modelType = assertModelType(record.model_type);
  return record[EMAIL_DMS_PRIMARY_ID_FIELDS[modelType]];
}

function normalizeModel(input = {}) {
  const modelType = assertModelType(input.model_type);
  if (modelType === "M365Connection") {
    return normalizeM365Connection(input);
  }
  if (modelType === "PeopleOutlookConnection") {
    return normalizePeopleOutlookConnection(input);
  }
  if (modelType === "InquiryEmailEvidence") {
    return normalizeInquiryEmailEvidence(input);
  }
  return normalizeInquiryEvidenceFileObject(input);
}

function normalizeRecord(input = {}) {
  assertNoDmsPersistedSecrets(input, "email_dms_record");
  const record = normalizeModel(input);
  assertTenant(record.tenant_id);
  const resourceId = emailDmsPrimaryIdOf(record);
  if (typeof resourceId !== "string" || resourceId.trim() === "") {
    throw new TypeError(`${record.model_type} resource id is required`);
  }
  const now = new Date().toISOString();
  const normalized = Object.freeze({
    ...record,
    resource_id: resourceId,
    owner_module: "email-dms",
    created_at: input.created_at ?? record.created_at ?? now,
    updated_at: input.updated_at ?? record.updated_at ?? now,
    writes_product_state: true,
    creates_database_rows: input.creates_database_rows ?? true,
    updates_database_rows: input.updates_database_rows ?? false,
    deletes_database_rows: false,
    evaluates_runtime_permission: true,
    writes_audit_event: input.writes_audit_event ?? true,
    dispatches_email_dms_runtime: true,
    production_ready_claim: false,
  });
  assertNoDmsPersistedSecrets(normalized, "email_dms_record");
  return normalized;
}

function recordKey(record) {
  return `${record.tenant_id}:${record.model_type}:${emailDmsPrimaryIdOf(record)}`;
}

function refKey(ref = {}) {
  const modelType = assertModelType(ref.model_type);
  const field = EMAIL_DMS_PRIMARY_ID_FIELDS[modelType];
  const id = ref.id ?? ref.resource_id ?? ref[field];
  return `${ref.tenant_id}:${modelType}:${id}`;
}

function emptyState() {
  return {
    migrations: ["email-dms-runtime-001-file-store"],
    records: [],
    idempotency: [],
    audit_events: [],
  };
}

function normalizeState(input) {
  const state = input ?? emptyState();
  return {
    ...emptyState(),
    ...state,
    records: state.records ?? [],
    idempotency: state.idempotency ?? [],
    audit_events: state.audit_events ?? [],
  };
}

export function createEmailDmsRepository({
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

  function assertOpen() {
    if (closed) throw new Error("Email DMS repository is closed");
  }

  function hydrate(nextState) {
    records.clear();
    idempotency.clear();
    auditEvents.clear();
    for (const input of nextState.records) {
      const record = normalizeRecord(input);
      records.set(recordKey(record), clone(record));
    }
    for (const entry of nextState.idempotency) {
      assertNoDmsPersistedSecrets(entry, "email_dms_idempotency");
      idempotency.set(
        `${entry.tenant_id}:${entry.idempotency_key}`,
        clone(entry),
      );
    }
    for (const event of nextState.audit_events) {
      assertNoDmsPersistedSecrets(event, "email_dms_audit");
      auditEvents.set(
        `${event.tenant_id}:${event.event_id}`,
        clone(event),
      );
    }
  }

  function currentState() {
    return {
      migrations: state.migrations,
      records: [...records.values()],
      idempotency: [...idempotency.values()],
      audit_events: [...auditEvents.values()],
    };
  }

  function persist({ force = false } = {}) {
    if (!filePath || (transactionDepth > 0 && !force)) return;
    try {
      stateController.commit(currentState());
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

  function put(input, { overwrite = false } = {}) {
    const record = normalizeRecord(input);
    const key = recordKey(record);
    if (!overwrite && records.has(key)) {
      throw new Error(
        `${record.model_type} already exists: ${emailDmsPrimaryIdOf(record)}`,
      );
    }
    records.set(key, clone(record));
    persist();
    return Object.freeze(clone(record));
  }

  hydrate(state);
  for (const input of seedRecords) {
    const record = normalizeRecord(input);
    if (!records.has(recordKey(record))) {
      records.set(
        recordKey(record),
        clone(
          preserveSeedRecords
            ? { ...input, resource_id: record.resource_id }
            : record,
        ),
      );
    }
  }

  const repository = {
    authority: "email-dms",
    durable: Boolean(filePath),
    migrations: Object.freeze([...state.migrations]),
    create(input) {
      assertOpen();
      return put(input);
    },
    upsert(input) {
      assertOpen();
      return put(input, { overwrite: true });
    },
    update(ref, patch = {}) {
      assertOpen();
      const current = records.get(refKey(ref));
      if (!current) {
        throw new Error(`${ref.model_type} not found`);
      }
      return put({
        ...current,
        ...patch,
        tenant_id: current.tenant_id,
        model_type: current.model_type,
        [EMAIL_DMS_PRIMARY_ID_FIELDS[current.model_type]]:
          emailDmsPrimaryIdOf(current),
        updated_at: new Date().toISOString(),
        updates_database_rows: true,
      }, { overwrite: true });
    },
    get(ref) {
      assertOpen();
      return Object.freeze(clone(records.get(refKey(ref))));
    },
    list(query = {}) {
      assertOpen();
      return Object.freeze([...records.values()]
        .filter((record) => (
          !query.tenant_id || record.tenant_id === query.tenant_id
        ))
        .filter((record) => (
          !query.model_type || record.model_type === query.model_type
        ))
        .filter((record) => (
          !query.lead_id || record.lead_id === query.lead_id
        ))
        .filter((record) => (
          !query.inquiry_email_evidence_id
          || record.inquiry_email_evidence_id
            === query.inquiry_email_evidence_id
        ))
        .map((record) => Object.freeze(clone(record))));
    },
    recordIdempotency(entry = {}) {
      assertOpen();
      assertTenant(entry.tenant_id);
      if (
        typeof entry.idempotency_key !== "string"
        || entry.idempotency_key.trim() === ""
      ) {
        throw new TypeError("idempotency_key is required");
      }
      assertNoDmsPersistedSecrets(entry, "email_dms_idempotency");
      const value = Object.freeze({
        tenant_id: entry.tenant_id,
        idempotency_key: entry.idempotency_key,
        operation: entry.operation ?? "email_dms_operation",
        response: clone(entry.response ?? {}),
        created_at: entry.created_at ?? new Date().toISOString(),
      });
      idempotency.set(
        `${value.tenant_id}:${value.idempotency_key}`,
        clone(value),
      );
      persist();
      return value;
    },
    getIdempotency(ref = {}) {
      assertOpen();
      return Object.freeze(clone(
        idempotency.get(`${ref.tenant_id}:${ref.idempotency_key}`),
      ));
    },
    appendAudit(event = {}) {
      assertOpen();
      assertTenant(event.tenant_id);
      if (
        typeof event.event_id !== "string"
        || event.event_id.trim() === ""
      ) {
        throw new TypeError("event_id is required");
      }
      assertNoDmsPersistedSecrets(event, "email_dms_audit");
      const value = Object.freeze({
        ...clone(event),
        production_ready_claim: false,
      });
      auditEvents.set(
        `${value.tenant_id}:${value.event_id}`,
        clone(value),
      );
      persist();
      return value;
    },
    listAudit(query = {}) {
      assertOpen();
      return Object.freeze([...auditEvents.values()]
        .filter((event) => (
          !query.tenant_id || event.tenant_id === query.tenant_id
        ))
        .filter((event) => (
          !query.object_id || event.object_id === query.object_id
        ))
        .map((event) => Object.freeze(clone(event))));
    },
    transaction(fn) {
      assertOpen();
      if (typeof fn !== "function") {
        throw new TypeError("transaction callback is required");
      }
      const entryDepth = transactionDepth;
      const before = {
        records: new Map(
          [...records].map(([key, value]) => [key, clone(value)]),
        ),
        idempotency: new Map(
          [...idempotency].map(([key, value]) => [key, clone(value)]),
        ),
        auditEvents: new Map(
          [...auditEvents].map(([key, value]) => [key, clone(value)]),
        ),
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
          for (const [key, value] of before.idempotency) {
            idempotency.set(key, value);
          }
          for (const [key, value] of before.auditEvents) {
            auditEvents.set(key, value);
          }
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
        records: Object.freeze(
          [...records.values()].map((record) => Object.freeze(clone(record))),
        ),
        idempotency: Object.freeze(
          [...idempotency.values()].map((entry) => Object.freeze(clone(entry))),
        ),
        audit_events: Object.freeze(
          [...auditEvents.values()].map((event) => Object.freeze(clone(event))),
        ),
      });
    },
    close() {
      if (closed) return;
      persist({ force: true });
      closed = true;
    },
  };

  return Object.freeze(repository);
}
