import {
  REPOSITORY_PORT_V2_VERSION,
  RepositoryConflictError,
  RepositoryIdempotencyConflictError,
  assertRepositoryPortV2,
  normalizeRepositoryPortV2Record,
  requireRepositoryTenantId,
} from "../repository-port-v2.js";
import { withPostgresTransaction } from "./transaction.js";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function timestamp(clock) {
  const value = typeof clock === "function" ? clock() : clock;
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (!Number.isFinite(date.getTime())) throw new TypeError("repository clock must return a valid date");
  return date.toISOString();
}

function iso(value) {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}

function rowToRecord(row) {
  if (!row) return undefined;
  return normalizeRepositoryPortV2Record({
    tenant_id: row.tenant_id,
    record_type: row.record_type,
    record_id: row.record_id,
    state_version: Number(row.state_version),
    data: row.data,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  });
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
  if (!Number.isSafeInteger(version) || version < 0) throw new TypeError("expected_version must be a non-negative integer");
  return version;
}

function normalizeText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function createScopedRepositoryPort(client, tenantId, clock) {
  return Object.freeze({
    contract_version: REPOSITORY_PORT_V2_VERSION,
    capabilities: Object.freeze({ authority: "postgres-v2", tenant_scoped: true, async_transactions: true }),

    async read(input = {}) {
      assertScopedTenant(tenantId, input.tenant_id);
      const recordType = normalizeText(input.record_type, "record_type");
      const recordId = normalizeText(input.record_id, "record_id");
      const result = await client.query(
        `SELECT tenant_id, record_type, record_id, state_version, data, created_at, updated_at
           FROM lawos_runtime.records
          WHERE tenant_id = $1 AND record_type = $2 AND record_id = $3`,
        [tenantId, recordType, recordId],
      );
      return clone(rowToRecord(result.rows[0]));
    },

    async write(input = {}) {
      assertScopedTenant(tenantId, input.tenant_id);
      const expectedVersion = normalizeExpectedVersion(input.expected_version);
      const ref = normalizeRepositoryPortV2Record({ ...input, state_version: 0 });
      const now = input.updated_at ?? timestamp(clock);
      const result = expectedVersion === 0
        ? await client.query(
          `INSERT INTO lawos_runtime.records
             (tenant_id, record_type, record_id, state_version, data, created_at, updated_at)
           VALUES ($1, $2, $3, 1, $4::jsonb, $5::timestamptz, $5::timestamptz)
           ON CONFLICT (tenant_id, record_type, record_id) DO NOTHING
           RETURNING tenant_id, record_type, record_id, state_version, data, created_at, updated_at`,
          [tenantId, ref.record_type, ref.record_id, JSON.stringify(input.data ?? {}), now],
        )
        : await client.query(
          `UPDATE lawos_runtime.records
              SET data = $4::jsonb,
                  state_version = state_version + 1,
                  updated_at = $6::timestamptz
            WHERE tenant_id = $1
              AND record_type = $2
              AND record_id = $3
              AND state_version = $5::bigint
          RETURNING tenant_id, record_type, record_id, state_version, data, created_at, updated_at`,
          [tenantId, ref.record_type, ref.record_id, JSON.stringify(input.data ?? {}), expectedVersion, now],
        );
      if (result.rowCount === 0) {
        const current = await client.query(
          `SELECT state_version FROM lawos_runtime.records
            WHERE tenant_id = $1 AND record_type = $2 AND record_id = $3`,
          [tenantId, ref.record_type, ref.record_id],
        );
        throw new RepositoryConflictError("repository version conflict", {
          expected_version: expectedVersion,
          current_version: current.rows[0] ? Number(current.rows[0].state_version) : 0,
        });
      }
      return clone(rowToRecord(result.rows[0]));
    },

    async claimIdempotency(input = {}) {
      assertScopedTenant(tenantId, input.tenant_id);
      const key = normalizeText(input.key, "idempotency key");
      const requestHash = normalizeText(input.request_hash, "idempotency request_hash");
      const createdAt = input.created_at ?? timestamp(clock);
      const inserted = await client.query(
        `INSERT INTO lawos_runtime.idempotency_keys
           (tenant_id, idempotency_key, request_hash, response, created_at)
         VALUES ($1, $2, $3, $4::jsonb, $5::timestamptz)
         ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
         RETURNING tenant_id, idempotency_key, request_hash, response, created_at`,
        [tenantId, key, requestHash, JSON.stringify(input.response ?? null), createdAt],
      );
      const row = inserted.rows[0] ?? (await client.query(
        `SELECT tenant_id, idempotency_key, request_hash, response, created_at
           FROM lawos_runtime.idempotency_keys
          WHERE tenant_id = $1 AND idempotency_key = $2`,
        [tenantId, key],
      )).rows[0];
      if (row.request_hash !== requestHash) throw new RepositoryIdempotencyConflictError();
      return Object.freeze({
        replayed: inserted.rowCount === 0,
        record: Object.freeze({
          tenant_id: row.tenant_id,
          key: row.idempotency_key,
          request_hash: row.request_hash,
          response: clone(row.response),
          created_at: iso(row.created_at),
        }),
      });
    },

    async appendAudit(input = {}) {
      assertScopedTenant(tenantId, input.tenant_id);
      const eventId = normalizeText(input.event_id, "audit event_id");
      const eventType = normalizeText(input.event_type, "audit event_type");
      const result = await client.query(
        `INSERT INTO lawos_runtime.audit_events
           (tenant_id, event_id, event_type, actor_id, object_type, object_id, payload, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)
         RETURNING tenant_id, event_id, event_type, actor_id, object_type, object_id, payload, created_at`,
        [tenantId, eventId, eventType, input.actor_id ?? null, input.object_type ?? null, input.object_id ?? null, JSON.stringify(input.payload ?? {}), input.created_at ?? timestamp(clock)],
      );
      const row = result.rows[0];
      return Object.freeze({ ...clone(row), created_at: iso(row.created_at) });
    },

    async listAudit(input = {}) {
      assertScopedTenant(tenantId, input.tenant_id);
      const values = [tenantId];
      let objectFilter = "";
      if (input.object_id) {
        values.push(input.object_id);
        objectFilter = " AND object_id = $2";
      }
      const result = await client.query(
        `SELECT tenant_id, event_id, event_type, actor_id, object_type, object_id, payload, created_at
           FROM lawos_runtime.audit_events
          WHERE tenant_id = $1${objectFilter}
          ORDER BY created_at, event_id`,
        values,
      );
      return Object.freeze(result.rows.map((row) => Object.freeze({ ...clone(row), created_at: iso(row.created_at) })));
    },

    async enqueueOutbox(input = {}) {
      assertScopedTenant(tenantId, input.tenant_id);
      const eventId = normalizeText(input.event_id, "outbox event_id");
      const topic = normalizeText(input.topic, "outbox topic");
      const result = await client.query(
        `INSERT INTO lawos_runtime.outbox_events
           (tenant_id, event_id, topic, payload, status, created_at)
         VALUES ($1, $2, $3, $4::jsonb, 'pending', $5::timestamptz)
         RETURNING tenant_id, event_id, topic, payload, status, created_at, published_at`,
        [tenantId, eventId, topic, JSON.stringify(input.payload ?? {}), input.created_at ?? timestamp(clock)],
      );
      const row = result.rows[0];
      return Object.freeze({ ...clone(row), created_at: iso(row.created_at), published_at: iso(row.published_at) });
    },

    async transaction() {
      throw new Error("nested RepositoryPortV2 transactions are not supported");
    },
  });
}

export function createPostgresRepositoryPortV2({ pool, clock = () => new Date(), transactionOptions = {} } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");

  function transaction(input = {}, callback) {
    const tenantId = requireRepositoryTenantId(input.tenant_id);
    if (typeof callback !== "function") throw new TypeError("transaction callback is required");
    return withPostgresTransaction(pool, { ...transactionOptions, tenant_id: tenantId }, (client) =>
      callback(createScopedRepositoryPort(client, tenantId, clock)));
  }

  return Object.freeze({
    contract_version: REPOSITORY_PORT_V2_VERSION,
    capabilities: Object.freeze({
      authority: "postgres-v2",
      async_transactions: true,
      tenant_scoped: true,
      rls_required: true,
      production_ready_claim: false,
    }),

    async read(input = {}) {
      return transaction({ tenant_id: input.tenant_id }, (tx) => tx.read(input));
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
      return transaction({ tenant_id: input.tenant_id }, (tx) => tx.listAudit(input));
    },

    async close() {
      await pool.end?.();
    },
  });
}

export async function commitPostgresRecordWithAuditOutbox(repository, {
  tenant_id,
  record,
  audit_event,
  outbox_event,
} = {}) {
  assertRepositoryPortV2(repository);
  const tenantId = requireRepositoryTenantId(tenant_id);
  return repository.transaction({ tenant_id: tenantId }, async (tx) => {
    if (typeof tx.enqueueOutbox !== "function") throw new TypeError("PostgreSQL transaction outbox method is required");
    const written = await tx.write({ ...record, tenant_id: tenantId });
    const audit = await tx.appendAudit({ ...audit_event, tenant_id: tenantId });
    const outbox = await tx.enqueueOutbox({ ...outbox_event, tenant_id: tenantId });
    return Object.freeze({ record: written, audit, outbox });
  });
}
