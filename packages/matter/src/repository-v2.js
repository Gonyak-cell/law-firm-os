import {
  REPOSITORY_PORT_V2_VERSION,
  RepositoryConflictError,
  RepositoryIdempotencyConflictError,
  normalizeRepositoryPortV2Record,
  requireRepositoryTenantId,
} from "../../persistence/src/repository-port-v2.js";
import { primaryIdFieldOf } from "./repository-record.js";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function timestamp(clock) {
  const value = typeof clock === "function" ? clock() : clock;
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (!Number.isFinite(date.getTime())) throw new TypeError("repository clock must return a valid date");
  return date.toISOString();
}

function recordKey({ tenant_id, record_type, record_id }) {
  return `${tenant_id}:${record_type}:${record_id}`;
}

function matterRef({ tenant_id, record_type, record_id }) {
  return { tenant_id, model_type: record_type, id: record_id };
}

function fromMatterRecord(record) {
  if (!record) return undefined;
  const {
    tenant_id,
    model_type,
    resource_id,
    state_version = 0,
    created_at = null,
    updated_at = null,
    writes_product_state: _writesProductState,
    creates_database_rows: _createsDatabaseRows,
    ...data
  } = record;
  return normalizeRepositoryPortV2Record({
    tenant_id,
    record_type: model_type,
    record_id: resource_id,
    state_version,
    data,
    created_at,
    updated_at,
  });
}

function toMatterRecord(record) {
  const value = {
    ...clone(record.data),
    tenant_id: record.tenant_id,
    model_type: record.record_type,
    resource_id: record.record_id,
    state_version: record.state_version,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
  const primaryIdField = primaryIdFieldOf(record.record_type);
  if (primaryIdField) value[primaryIdField] = record.record_id;
  return value;
}

function assertScopedTenant(scopeTenantId, candidateTenantId) {
  const tenantId = requireRepositoryTenantId(candidateTenantId);
  if (tenantId !== scopeTenantId) {
    throw Object.assign(new Error("transaction tenant scope mismatch"), {
      code: "LAWOS_TENANT_SCOPE_MISMATCH",
      safe_error_code: "TENANT_SCOPE_MISMATCH",
      status: 403,
    });
  }
  return tenantId;
}

function normalizeExpectedVersion(value) {
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new TypeError("expected_version must be a non-negative integer");
  }
  return version;
}

function normalizeIdempotency(input, tenantId, now) {
  assertScopedTenant(tenantId, input?.tenant_id);
  const key = String(input?.key ?? "").trim();
  const requestHash = String(input?.request_hash ?? "").trim();
  if (!key) throw new TypeError("idempotency key is required");
  if (!requestHash) throw new TypeError("idempotency request_hash is required");
  return Object.freeze({
    tenant_id: tenantId,
    key,
    request_hash: requestHash,
    response: clone(input.response ?? null),
    created_at: input.created_at ?? now,
  });
}

function normalizeAudit(input, tenantId, now) {
  assertScopedTenant(tenantId, input?.tenant_id);
  const eventId = String(input?.event_id ?? "").trim();
  const eventType = String(input?.event_type ?? "").trim();
  if (!eventId) throw new TypeError("audit event_id is required");
  if (!eventType) throw new TypeError("audit event_type is required");
  return Object.freeze({
    ...clone(input),
    tenant_id: tenantId,
    event_id: eventId,
    event_type: eventType,
    created_at: input.created_at ?? now,
  });
}

function idempotencyFromMatter(entry) {
  if (!entry) return undefined;
  return Object.freeze({
    tenant_id: entry.tenant_id,
    key: entry.idempotency_key,
    request_hash: entry.request_fingerprint,
    response: clone(entry.response ?? null),
    created_at: entry.created_at,
  });
}

export function createMatterFileRepositoryPortV2({ repository, clock = () => new Date() } = {}) {
  for (const method of ["get", "upsert", "transaction", "snapshot", "getIdempotency", "recordIdempotency", "appendAudit", "listAudit"]) {
    if (typeof repository?.[method] !== "function") throw new TypeError(`Matter repository method is required: ${method}`);
  }

  let transactionTail = Promise.resolve();

  async function executeTransaction(tenantId, callback) {
    const snapshot = repository.snapshot();
    const draftRecords = new Map(snapshot.records.map((record) => {
      const normalized = fromMatterRecord(record);
      return [recordKey(normalized), normalized];
    }));
    const draftIdempotency = new Map(snapshot.idempotency.map((entry) => {
      const normalized = idempotencyFromMatter(entry);
      return [`${normalized.tenant_id}:${normalized.key}`, normalized];
    }));
    const draftAudit = new Map(snapshot.audit_events.map((event) => [`${event.tenant_id}:${event.event_id}`, clone(event)]));
    const recordMutations = new Map();
    const idempotencyMutations = new Map();
    const auditMutations = new Map();

    const transactionPort = Object.freeze({
      contract_version: REPOSITORY_PORT_V2_VERSION,
      capabilities: Object.freeze({ authority: "file-v2", async_transactions: true, tenant_scoped: true }),

      async read(input = {}) {
        assertScopedTenant(tenantId, input.tenant_id);
        const ref = normalizeRepositoryPortV2Record({ ...input, state_version: 0, data: {} });
        return clone(draftRecords.get(recordKey(ref)));
      },

      async write(input = {}) {
        assertScopedTenant(tenantId, input.tenant_id);
        const expectedVersion = normalizeExpectedVersion(input.expected_version);
        const ref = normalizeRepositoryPortV2Record({ ...input, state_version: 0 });
        const key = recordKey(ref);
        const current = draftRecords.get(key);
        const currentVersion = current?.state_version ?? 0;
        if (currentVersion !== expectedVersion) {
          throw new RepositoryConflictError("repository version conflict", {
            expected_version: expectedVersion,
            current_version: currentVersion,
          });
        }
        const now = timestamp(clock);
        const next = normalizeRepositoryPortV2Record({
          ...ref,
          data: input.data,
          state_version: currentVersion + 1,
          created_at: current?.created_at ?? input.created_at ?? now,
          updated_at: input.updated_at ?? now,
        });
        if (!recordMutations.has(key)) recordMutations.set(key, { base_version: currentVersion, record: next });
        else recordMutations.get(key).record = next;
        draftRecords.set(key, next);
        return clone(next);
      },

      async claimIdempotency(input = {}) {
        const normalized = normalizeIdempotency(input, tenantId, timestamp(clock));
        const key = `${tenantId}:${normalized.key}`;
        const existing = draftIdempotency.get(key);
        if (existing) {
          if (existing.request_hash !== normalized.request_hash) {
            throw new RepositoryIdempotencyConflictError();
          }
          return Object.freeze({ replayed: true, record: clone(existing) });
        }
        draftIdempotency.set(key, normalized);
        idempotencyMutations.set(key, normalized);
        return Object.freeze({ replayed: false, record: clone(normalized) });
      },

      async appendAudit(input = {}) {
        const event = normalizeAudit(input, tenantId, timestamp(clock));
        const key = `${tenantId}:${event.event_id}`;
        if (draftAudit.has(key)) {
          throw Object.assign(new Error("audit event already exists"), {
            code: "LAWOS_AUDIT_EVENT_CONFLICT",
            safe_error_code: "AUDIT_EVENT_CONFLICT",
            status: 409,
          });
        }
        draftAudit.set(key, event);
        auditMutations.set(key, event);
        return clone(event);
      },

      async listAudit(input = {}) {
        assertScopedTenant(tenantId, input.tenant_id);
        return Object.freeze(
          [...draftAudit.values()]
            .filter((event) => event.tenant_id === tenantId)
            .filter((event) => !input.object_id || event.object_id === input.object_id)
            .map((event) => Object.freeze(clone(event))),
        );
      },

      async transaction() {
        throw new Error("nested RepositoryPortV2 transactions are not supported");
      },
    });

    const result = await callback(transactionPort);
    repository.transaction((tx) => {
      for (const { base_version: baseVersion, record } of recordMutations.values()) {
        const current = fromMatterRecord(tx.get(matterRef(record)));
        const currentVersion = current?.state_version ?? 0;
        if (currentVersion !== baseVersion) {
          throw new RepositoryConflictError("repository changed before transaction commit", {
            expected_version: baseVersion,
            current_version: currentVersion,
          });
        }
        tx.upsert(toMatterRecord(record));
      }
      for (const entry of idempotencyMutations.values()) {
        const current = idempotencyFromMatter(tx.getIdempotency({
          tenant_id: entry.tenant_id,
          idempotency_key: entry.key,
        }));
        if (current && current.request_hash !== entry.request_hash) {
          throw new RepositoryIdempotencyConflictError();
        }
        if (!current) {
          tx.recordIdempotency({
            tenant_id: entry.tenant_id,
            idempotency_key: entry.key,
            request_fingerprint: entry.request_hash,
            response: entry.response,
            created_at: entry.created_at,
          });
        }
      }
      for (const event of auditMutations.values()) {
        const exists = tx.listAudit({ tenant_id: event.tenant_id }).some((current) => current.event_id === event.event_id);
        if (exists) {
          throw Object.assign(new Error("audit event changed before transaction commit"), {
            code: "LAWOS_AUDIT_EVENT_CONFLICT",
            safe_error_code: "AUDIT_EVENT_CONFLICT",
            status: 409,
          });
        }
        tx.appendAudit(event);
      }
    });
    return result;
  }

  function transaction(input = {}, callback) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    if (typeof callback !== "function") throw new TypeError("transaction callback is required");
    const run = transactionTail.then(() => executeTransaction(tenantId, callback));
    transactionTail = run.then(() => undefined, () => undefined);
    return run;
  }

  return Object.freeze({
    contract_version: REPOSITORY_PORT_V2_VERSION,
    capabilities: Object.freeze({
      authority: "file-v2",
      async_transactions: true,
      tenant_scoped: true,
      production_ready_claim: false,
    }),

    async read(input = {}) {
      const ref = normalizeRepositoryPortV2Record({ ...input, state_version: 0, data: {} });
      await transactionTail;
      return clone(fromMatterRecord(repository.get(matterRef(ref))));
    },

    async write(input = {}) {
      return transaction({ tenant_id: input.tenant_id }, (tx) => tx.write(input));
    },

    transaction,

    async claimIdempotency(input = {}) {
      return transaction({ tenant_id: input.tenant_id }, (tx) => tx.claimIdempotency(input));
    },

    async appendAudit(input = {}) {
      return transaction({ tenant_id: input.tenant_id }, (tx) => tx.appendAudit(input));
    },

    async listAudit(input = {}) {
      const tenantId = requireRepositoryTenantId(input.tenant_id);
      await transactionTail;
      return Object.freeze(repository.listAudit({ tenant_id: tenantId, object_id: input.object_id }).map((event) => Object.freeze(clone(event))));
    },

    async close() {
      await transactionTail;
      repository.close?.();
    },
  });
}
