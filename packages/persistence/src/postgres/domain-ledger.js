import {
  DOMAIN_LEDGER_CONTRACT_VERSION,
  compareDomainSnapshots,
  createDomainSnapshot,
  domainReceiptId,
  hashDomainValue,
  normalizeDomainRecord,
  requireDomainHash,
  requireDomainId,
} from "../domain-ledger.js";
import { RepositoryConflictError, RepositoryIdempotencyConflictError } from "../repository-port-v2.js";
import { withPostgresTransaction } from "./transaction.js";

const SENSITIVE_KEY_PATTERN = /(password|secret|token|credential|proof|raw[_-]?payload)/iu;

function requiredText(value, name) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${name} is required`);
  return text;
}

function timestamp(clock) {
  const value = typeof clock === "function" ? clock() : clock;
  const date = value instanceof Date ? value : new Date(value ?? Date.now());
  if (!Number.isFinite(date.getTime())) throw new TypeError("domain ledger clock must return a valid date");
  return date.toISOString();
}

function iso(value) {
  if (value instanceof Date) return value.toISOString();
  return value ?? null;
}

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function assertSafeEvidencePayload(value, path = "payload") {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertSafeEvidencePayload(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, item] of Object.entries(value)) {
    if (SENSITIVE_KEY_PATTERN.test(key)) throw new TypeError(`sensitive evidence field is not allowed: ${path}.${key}`);
    assertSafeEvidencePayload(item, `${path}.${key}`);
  }
}

function normalizeExpectedVersion(value) {
  const version = Number(value);
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new TypeError("expected_version must be a non-negative integer");
  }
  return version;
}

function rowToRecord(row, references = []) {
  if (!row) return undefined;
  return normalizeDomainRecord({
    tenant_id: row.tenant_id,
    domain_id: row.domain_id,
    record_type: row.record_type,
    record_id: row.record_id,
    state_version: Number(row.state_version),
    unique_key: row.unique_key,
    payload: row.payload,
    append_only: row.append_only,
    references,
    created_at: iso(row.created_at),
    updated_at: iso(row.updated_at),
  });
}

function rowToReference(row) {
  return Object.freeze({
    tenant_id: row.tenant_id,
    reference_name: row.reference_name,
    target_domain_id: row.target_domain_id,
    target_record_type: row.target_record_type,
    target_record_id: row.target_record_id,
  });
}

function domainImportConflict(message, details = {}) {
  return Object.assign(new Error(message), {
    code: "LAWOS_DOMAIN_IMPORT_CONFLICT",
    safe_error_code: "DOMAIN_IMPORT_CONFLICT",
    status: 409,
    ...details,
  });
}

function createScopedDomainLedger(client, tenantId, domainId, clock) {
  async function listReferences() {
    const result = await client.query(
      `SELECT tenant_id, source_domain_id, source_record_type, source_record_id,
              reference_name, target_domain_id, target_record_type, target_record_id
         FROM lawos_domain.record_references
        WHERE tenant_id = $1 AND source_domain_id = $2
        ORDER BY source_record_type, source_record_id, reference_name,
                 target_domain_id, target_record_type, target_record_id`,
      [tenantId, domainId],
    );
    return result.rows;
  }

  async function read(input = {}) {
    const recordType = requiredText(input.record_type, "record_type");
    const recordId = requiredText(input.record_id, "record_id");
    const result = await client.query(
      `SELECT tenant_id, domain_id, record_type, record_id, state_version,
              unique_key, payload, payload_hash, append_only, created_at, updated_at
         FROM lawos_domain.records
        WHERE tenant_id = $1 AND domain_id = $2 AND record_type = $3 AND record_id = $4`,
      [tenantId, domainId, recordType, recordId],
    );
    if (!result.rows[0]) return undefined;
    const references = (await listReferences())
      .filter((reference) => reference.source_record_type === recordType && reference.source_record_id === recordId)
      .map(rowToReference);
    return clone(rowToRecord(result.rows[0], references));
  }

  async function list(input = {}) {
    const values = [tenantId, domainId];
    let recordFilter = "";
    if (input.record_type) {
      values.push(requiredText(input.record_type, "record_type"));
      recordFilter = " AND record_type = $3";
    }
    const [recordsResult, references] = await Promise.all([
      client.query(
        `SELECT tenant_id, domain_id, record_type, record_id, state_version,
                unique_key, payload, payload_hash, append_only, created_at, updated_at
           FROM lawos_domain.records
          WHERE tenant_id = $1 AND domain_id = $2${recordFilter}
          ORDER BY record_type, record_id`,
        values,
      ),
      listReferences(),
    ]);
    return Object.freeze(recordsResult.rows.map((row) => Object.freeze(rowToRecord(
      row,
      references
        .filter((reference) => reference.source_record_type === row.record_type && reference.source_record_id === row.record_id)
        .map(rowToReference),
    ))));
  }

  async function write(input = {}) {
    const expectedVersion = normalizeExpectedVersion(input.expected_version);
    const record = normalizeDomainRecord(input, { tenant_id: tenantId, domain_id: domainId });
    const now = input.updated_at ?? timestamp(clock);
    const result = expectedVersion === 0
      ? await client.query(
        `INSERT INTO lawos_domain.records
           (tenant_id, domain_id, record_type, record_id, state_version, unique_key,
            payload, payload_hash, append_only, created_at, updated_at)
         VALUES ($1, $2, $3, $4, 1, $5, $6::jsonb, $7, $8, $9::timestamptz, $9::timestamptz)
         ON CONFLICT (tenant_id, domain_id, record_type, record_id) DO NOTHING
         RETURNING tenant_id, domain_id, record_type, record_id, state_version,
                   unique_key, payload, payload_hash, append_only, created_at, updated_at`,
        [
          tenantId,
          domainId,
          record.record_type,
          record.record_id,
          record.unique_key,
          JSON.stringify(record.payload),
          record.payload_hash,
          record.append_only,
          now,
        ],
      )
      : await client.query(
        `UPDATE lawos_domain.records
            SET unique_key = $5,
                payload = $6::jsonb,
                payload_hash = $7,
                append_only = $8,
                state_version = state_version + 1,
                updated_at = $10::timestamptz
          WHERE tenant_id = $1
            AND domain_id = $2
            AND record_type = $3
            AND record_id = $4
            AND state_version = $9::bigint
        RETURNING tenant_id, domain_id, record_type, record_id, state_version,
                  unique_key, payload, payload_hash, append_only, created_at, updated_at`,
        [
          tenantId,
          domainId,
          record.record_type,
          record.record_id,
          record.unique_key,
          JSON.stringify(record.payload),
          record.payload_hash,
          record.append_only,
          expectedVersion,
          now,
        ],
      );
    if (result.rowCount === 0) {
      const current = await client.query(
        `SELECT state_version FROM lawos_domain.records
          WHERE tenant_id = $1 AND domain_id = $2 AND record_type = $3 AND record_id = $4`,
        [tenantId, domainId, record.record_type, record.record_id],
      );
      throw new RepositoryConflictError("domain record version conflict", {
        expected_version: expectedVersion,
        current_version: current.rows[0] ? Number(current.rows[0].state_version) : 0,
      });
    }
    return clone(rowToRecord(result.rows[0], record.references));
  }

  async function addReferences(record) {
    const normalized = normalizeDomainRecord(record, { tenant_id: tenantId, domain_id: domainId });
    for (const reference of normalized.references) {
      await client.query(
        `INSERT INTO lawos_domain.record_references
           (tenant_id, source_domain_id, source_record_type, source_record_id,
            reference_name, target_domain_id, target_record_type, target_record_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING`,
        [
          tenantId,
          domainId,
          normalized.record_type,
          normalized.record_id,
          reference.reference_name,
          reference.target_domain_id,
          reference.target_record_type,
          reference.target_record_id,
        ],
      );
    }
  }

  async function claimIdempotency(input = {}) {
    const key = requiredText(input.key, "idempotency key");
    const requestHash = requireDomainHash(input.request_hash, "idempotency request_hash");
    const inserted = await client.query(
      `INSERT INTO lawos_domain.idempotency_keys
         (tenant_id, domain_id, idempotency_key, request_hash, response, created_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::timestamptz)
       ON CONFLICT (tenant_id, domain_id, idempotency_key) DO NOTHING
       RETURNING tenant_id, domain_id, idempotency_key, request_hash, response, created_at`,
      [tenantId, domainId, key, requestHash, JSON.stringify(input.response ?? null), input.created_at ?? timestamp(clock)],
    );
    const row = inserted.rows[0] ?? (await client.query(
      `SELECT tenant_id, domain_id, idempotency_key, request_hash, response, created_at
         FROM lawos_domain.idempotency_keys
        WHERE tenant_id = $1 AND domain_id = $2 AND idempotency_key = $3`,
      [tenantId, domainId, key],
    )).rows[0];
    if (row.request_hash !== requestHash) throw new RepositoryIdempotencyConflictError();
    return Object.freeze({
      replayed: inserted.rowCount === 0,
      record: Object.freeze({
        tenant_id: row.tenant_id,
        domain_id: row.domain_id,
        key: row.idempotency_key,
        request_hash: row.request_hash,
        response: clone(row.response),
        created_at: iso(row.created_at),
      }),
    });
  }

  async function listIdempotency() {
    const result = await client.query(
      `SELECT tenant_id, domain_id, idempotency_key, request_hash, response, created_at
         FROM lawos_domain.idempotency_keys
        WHERE tenant_id = $1 AND domain_id = $2
        ORDER BY idempotency_key`,
      [tenantId, domainId],
    );
    return Object.freeze(result.rows.map((row) => Object.freeze({
      tenant_id: row.tenant_id,
      domain_id: row.domain_id,
      key: row.idempotency_key,
      request_hash: row.request_hash,
      response: clone(row.response),
      created_at: iso(row.created_at),
    })));
  }

  async function appendAudit(input = {}) {
    const eventId = requiredText(input.event_id, "audit event_id");
    const eventType = requiredText(input.event_type, "audit event_type");
    assertSafeEvidencePayload(input.payload ?? {});
    const result = await client.query(
      `INSERT INTO lawos_domain.audit_events
         (tenant_id, domain_id, event_id, event_type, actor_id, object_type, object_id, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::timestamptz)
       RETURNING tenant_id, domain_id, event_id, event_type, actor_id, object_type, object_id, payload, created_at`,
      [
        tenantId,
        domainId,
        eventId,
        eventType,
        input.actor_id ?? null,
        input.object_type ?? null,
        input.object_id ?? null,
        JSON.stringify(input.payload ?? {}),
        input.created_at ?? timestamp(clock),
      ],
    );
    return Object.freeze({ ...clone(result.rows[0]), created_at: iso(result.rows[0].created_at) });
  }

  async function listAudit(input = {}) {
    const values = [tenantId, domainId];
    let objectFilter = "";
    if (input.object_id) {
      values.push(input.object_id);
      objectFilter = " AND object_id = $3";
    }
    const result = await client.query(
      `SELECT tenant_id, domain_id, event_id, event_type, actor_id, object_type, object_id, payload, created_at
         FROM lawos_domain.audit_events
        WHERE tenant_id = $1 AND domain_id = $2${objectFilter}
        ORDER BY created_at, event_id`,
      values,
    );
    return Object.freeze(result.rows.map((row) => Object.freeze({ ...clone(row), created_at: iso(row.created_at) })));
  }

  async function findImportReceipt(sourceHash) {
    const result = await client.query(
      `SELECT * FROM lawos_domain.import_receipts
        WHERE tenant_id = $1 AND domain_id = $2 AND source_hash = $3`,
      [tenantId, domainId, requireDomainHash(sourceHash, "source_hash")],
    );
    return result.rows[0] ? Object.freeze({ ...clone(result.rows[0]), recorded_at: iso(result.rows[0].recorded_at) }) : undefined;
  }

  async function appendImportReceipt(input) {
    const result = await client.query(
      `INSERT INTO lawos_domain.import_receipts
         (tenant_id, domain_id, receipt_id, source_hash, snapshot_hash, source_count,
          target_count, rejected_count, invariant_hash, rollback_cutoff, status, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pre_authority', 'source_imported', $10::timestamptz)
       RETURNING *`,
      [
        tenantId,
        domainId,
        requiredText(input.receipt_id, "receipt_id"),
        requireDomainHash(input.source_hash, "source_hash"),
        requireDomainHash(input.snapshot_hash, "snapshot_hash"),
        input.source_count,
        input.target_count,
        input.rejected_count,
        requireDomainHash(input.invariant_hash, "invariant_hash"),
        input.recorded_at ?? timestamp(clock),
      ],
    );
    return Object.freeze({ ...clone(result.rows[0]), recorded_at: iso(result.rows[0].recorded_at) });
  }

  async function appendShadowReceipt(input) {
    const values = [
      tenantId,
      domainId,
      requiredText(input.receipt_id, "receipt_id"),
      requireDomainHash(input.source_hash, "source_hash"),
      requireDomainHash(input.target_hash, "target_hash"),
      input.source_count,
      input.target_count,
      input.difference_count,
      requireDomainHash(input.invariant_hash, "invariant_hash"),
      input.difference_count === 0 ? "equal" : "different",
      input.recorded_at ?? timestamp(clock),
    ];
    const inserted = await client.query(
      `INSERT INTO lawos_domain.shadow_receipts
         (tenant_id, domain_id, receipt_id, source_hash, target_hash, source_count,
          target_count, difference_count, invariant_hash, status, recorded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz)
       ON CONFLICT (tenant_id, domain_id, receipt_id) DO NOTHING
       RETURNING *`,
      values,
    );
    const row = inserted.rows[0] ?? (await client.query(
      `SELECT * FROM lawos_domain.shadow_receipts
        WHERE tenant_id = $1 AND domain_id = $2 AND receipt_id = $3`,
      values.slice(0, 3),
    )).rows[0];
    return Object.freeze({ ...clone(row), recorded_at: iso(row.recorded_at) });
  }

  async function appendRehearsalReceipt(input) {
    const result = await client.query(
      `INSERT INTO lawos_domain.rehearsal_receipts
         (tenant_id, domain_id, receipt_id, import_receipt_id, shadow_receipt_id,
          smoke_hash, rollback_cutoff, status, production_migrated, recorded_at)
       SELECT $1, $2, $3, imports.receipt_id, shadows.receipt_id,
              $6, 'pre_authority', 'source_ready', false, $7::timestamptz
         FROM lawos_domain.import_receipts AS imports
         JOIN lawos_domain.shadow_receipts AS shadows
           ON shadows.tenant_id = imports.tenant_id
          AND shadows.domain_id = imports.domain_id
        WHERE imports.tenant_id = $1
          AND imports.domain_id = $2
          AND imports.receipt_id = $4
          AND shadows.receipt_id = $5
          AND shadows.status = 'equal'
       RETURNING *`,
      [
        tenantId,
        domainId,
        requiredText(input.receipt_id, "receipt_id"),
        requiredText(input.import_receipt_id, "import_receipt_id"),
        requiredText(input.shadow_receipt_id, "shadow_receipt_id"),
        requireDomainHash(input.smoke_hash, "smoke_hash"),
        input.recorded_at ?? timestamp(clock),
      ],
    );
    if (result.rowCount !== 1) {
      throw domainImportConflict("source-ready rehearsal requires matching import and equal shadow receipts");
    }
    return Object.freeze({ ...clone(result.rows[0]), recorded_at: iso(result.rows[0].recorded_at) });
  }

  return Object.freeze({
    contract_version: DOMAIN_LEDGER_CONTRACT_VERSION,
    capabilities: Object.freeze({
      authority: "postgres-v2",
      tenant_scoped: true,
      domain_scoped: true,
      async_transactions: true,
      rls_required: true,
      production_ready_claim: false,
    }),
    read,
    list,
    write,
    addReferences,
    claimIdempotency,
    listIdempotency,
    appendAudit,
    listAudit,
    findImportReceipt,
    appendImportReceipt,
    appendShadowReceipt,
    appendRehearsalReceipt,
  });
}

export function createPostgresDomainLedger({ pool, clock = () => new Date(), transactionOptions = {} } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("PostgreSQL pool is required");

  function transaction(input = {}, callback) {
    const tenantId = requiredText(input.tenant_id, "tenant_id");
    const domainId = requireDomainId(input.domain_id);
    if (typeof callback !== "function") throw new TypeError("transaction callback is required");
    return withPostgresTransaction(pool, { ...transactionOptions, tenant_id: tenantId }, (client) =>
      callback(createScopedDomainLedger(client, tenantId, domainId, clock)));
  }

  async function importSnapshot(input = {}) {
    const snapshot = createDomainSnapshot(input);
    return transaction(snapshot, async (tx) => {
      const prior = await tx.findImportReceipt(snapshot.source_hash);
      if (prior) return Object.freeze({ replayed: true, receipt: prior, snapshot });
      for (const record of snapshot.records) {
        const current = await tx.read(record);
        if (current) {
          if (
            current.payload_hash !== record.payload_hash
            || current.unique_key !== record.unique_key
            || current.append_only !== record.append_only
          ) {
            throw domainImportConflict("existing domain record differs from import source", {
              record_type: record.record_type,
            });
          }
          continue;
        }
        await tx.write({ ...record, expected_version: 0 });
      }
      for (const record of snapshot.records) await tx.addReferences(record);
      for (const entry of snapshot.idempotency_entries) {
        await tx.claimIdempotency(entry);
      }
      for (const event of snapshot.audit_events) {
        await tx.appendAudit(event);
      }
      const target = createDomainSnapshot({
        tenant_id: snapshot.tenant_id,
        domain_id: snapshot.domain_id,
        records: await tx.list(),
        idempotency_entries: await tx.listIdempotency(),
        audit_events: await tx.listAudit(),
      });
      const comparison = compareDomainSnapshots(snapshot, target);
      if (!comparison.equal) {
        throw domainImportConflict("domain import target differs from source", {
          difference_count: comparison.difference_count,
          difference_fingerprint: comparison.difference_fingerprint,
        });
      }
      const receipt = await tx.appendImportReceipt({
        receipt_id: domainReceiptId("import", {
          tenant_id: snapshot.tenant_id,
          domain_id: snapshot.domain_id,
          source_hash: snapshot.source_hash,
        }),
        source_hash: snapshot.source_hash,
        snapshot_hash: snapshot.snapshot_hash,
        source_count: snapshot.records.length,
        target_count: target.records.length,
        rejected_count: 0,
        invariant_hash: snapshot.invariant_hash,
      });
      return Object.freeze({ replayed: false, receipt, snapshot });
    });
  }

  async function compareSnapshot(input = {}) {
    const source = createDomainSnapshot(input);
    return transaction(source, async (tx) => {
      const target = createDomainSnapshot({
        tenant_id: source.tenant_id,
        domain_id: source.domain_id,
        records: await tx.list(),
        idempotency_entries: await tx.listIdempotency(),
        audit_events: await tx.listAudit(),
      });
      const comparison = compareDomainSnapshots(source, target);
      const receipt = await tx.appendShadowReceipt({
        receipt_id: domainReceiptId("shadow", {
          tenant_id: source.tenant_id,
          domain_id: source.domain_id,
          source_hash: comparison.source_hash,
          target_hash: comparison.target_hash,
          difference_fingerprint: comparison.difference_fingerprint,
        }),
        ...comparison,
      });
      return Object.freeze({ comparison, receipt });
    });
  }

  async function recordRehearsal({
    tenant_id,
    domain_id,
    import_receipt_id,
    shadow_receipt_id,
    smoke_result,
  } = {}) {
    const smokeHash = hashDomainValue(smoke_result ?? {});
    return transaction({ tenant_id, domain_id }, async (tx) => {
      const receiptId = domainReceiptId("rehearsal", {
        tenant_id,
        domain_id,
        import_receipt_id,
        shadow_receipt_id,
        smoke_hash: smokeHash,
      });
      return tx.appendRehearsalReceipt({
        receipt_id: receiptId,
        import_receipt_id,
        shadow_receipt_id,
        smoke_hash: smokeHash,
      });
    });
  }

  function scoped(input, method) {
    return transaction(input, (tx) => tx[method](input));
  }

  return Object.freeze({
    contract_version: DOMAIN_LEDGER_CONTRACT_VERSION,
    capabilities: Object.freeze({
      authority: "postgres-v2",
      tenant_scoped: true,
      domain_scoped: true,
      async_transactions: true,
      rls_required: true,
      import_receipts: true,
      shadow_receipts: true,
      rehearsal_receipts: true,
      production_ready_claim: false,
    }),
    read: (input) => scoped(input, "read"),
    list: (input) => scoped(input, "list"),
    write: (input) => scoped(input, "write"),
    claimIdempotency: (input) => scoped(input, "claimIdempotency"),
    appendAudit: (input) => scoped(input, "appendAudit"),
    listAudit: (input) => scoped(input, "listAudit"),
    transaction,
    importSnapshot,
    compareSnapshot,
    recordRehearsal,
  });
}
