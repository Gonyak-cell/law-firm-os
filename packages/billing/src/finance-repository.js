import { createHash } from "node:crypto";
import { createDurableJsonStateController } from "../../persistence/src/durable-file.js";

export const FINANCE_PRIMARY_ID_FIELDS = Object.freeze({
  TimeEntry: "time_entry_id",
  RateCard: "rate_card_id",
  FeeArrangement: "fee_arrangement_id",
  Expense: "expense_id",
  Disbursement: "disbursement_id",
  WipItem: "wip_item_id",
  WipSnapshot: "wip_snapshot_id",
  PreBill: "prebill_id",
  BillingAdjustment: "adjustment_id",
  Invoice: "invoice_id",
  InvoiceLine: "invoice_line_id",
  TaxInvoice: "tax_invoice_id",
  InvoiceCorrection: "invoice_correction_id",
  Payment: "payment_id",
  PaymentAllocation: "payment_allocation_id",
  PaymentMatch: "payment_match_id",
  ARBalance: "ar_balance_id",
  ARAgingSnapshot: "ar_aging_snapshot_id",
  JournalEntry: "journal_entry_id",
  AccountingExport: "accounting_export_id",
  TaxExport: "tax_export_id",
  TrustLedgerEntry: "trust_ledger_entry_id",
  TrustBalance: "trust_balance_id",
  SettlementRun: "settlement_run_id",
  WorkingCredit: "working_credit_id",
  BankImportBatch: "bank_import_batch_id",
  BankTransaction: "bank_transaction_id",
  BankTransactionClassification: "bank_transaction_classification_id",
  BankClassificationRule: "bank_classification_rule_id",
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function canonicalJsonValue(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("idempotency request numbers must be finite");
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => canonicalJsonValue(item ?? null));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonicalJsonValue(value[key])]),
    );
  }
  throw new TypeError("idempotency request must contain JSON values");
}

export function canonicalFinanceRequestFingerprint(request = {}) {
  return createHash("sha256").update(JSON.stringify(canonicalJsonValue(request))).digest("hex");
}

export class FinanceIdempotencyConflictError extends Error {
  constructor() {
    super("idempotency key was already used for a different finance request");
    this.name = "FinanceIdempotencyConflictError";
    this.code = "FINANCE_IDEMPOTENCY_CONFLICT";
    this.safe_error_code = "IDEMPOTENCY_CONFLICT";
    this.status = 409;
    this.status_code = 409;
  }
}

function assertTenant(tenantId) {
  if (typeof tenantId !== "string" || tenantId.trim() === "") throw new TypeError("tenant_id is required");
}

function primaryIdOf(record) {
  const field = FINANCE_PRIMARY_ID_FIELDS[record.model_type];
  return field ? record[field] : record.resource_id ?? record.id;
}

function normalizeRecord(input = {}) {
  if (typeof input.model_type !== "string" || input.model_type.trim() === "") {
    throw new TypeError("model_type is required");
  }
  assertTenant(input.tenant_id);
  const resourceId = primaryIdOf(input);
  if (typeof resourceId !== "string" || resourceId.trim() === "") {
    throw new TypeError(`${input.model_type} resource id is required`);
  }
  const now = new Date().toISOString();
  return Object.freeze({
    ...clone(input),
    resource_id: resourceId,
    owner_module: input.owner_module ?? "finance",
    created_at: input.created_at ?? now,
    updated_at: now,
    writes_product_state: true,
    creates_database_rows: input.creates_database_rows ?? true,
    updates_database_rows: input.updates_database_rows ?? false,
    deletes_database_rows: false,
    evaluates_runtime_permission: true,
    writes_audit_event: input.writes_audit_event ?? true,
    dispatches_finance_runtime: true,
    executes_api_handler: input.executes_api_handler ?? false,
    posts_gl_entries: input.posts_gl_entries ?? false,
    g7_runtime_readiness_claim: "runtime_write_ready",
    production_ready_claim: false,
  });
}

function recordKey(record) {
  return `${record.tenant_id}:${record.model_type}:${primaryIdOf(record)}`;
}

function refKey(ref = {}) {
  const field = FINANCE_PRIMARY_ID_FIELDS[ref.model_type];
  const id = ref.id ?? ref.resource_id ?? (field ? ref[field] : undefined);
  return `${ref.tenant_id}:${ref.model_type}:${id}`;
}

function emptyState() {
  return { migrations: ["finance-runtime-001-file-store"], records: [], idempotency: [], audit_events: [] };
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

function optionalIdentity(value) {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function idempotencyCandidate(entry = {}) {
  return {
    operation: optionalIdentity(entry.operation) ?? "finance_operation",
    actor_id: optionalIdentity(entry.actor_id),
    object_type: optionalIdentity(entry.object_type),
    object_id: optionalIdentity(entry.object_id),
    request_fingerprint: optionalIdentity(entry.request_fingerprint)
      ?? canonicalFinanceRequestFingerprint(entry.request ?? {}),
  };
}

function assertMatchingIdempotency(existing, expected, fields) {
  if (fields.some((field) => (existing[field] ?? null) !== (expected[field] ?? null))) {
    throw new FinanceIdempotencyConflictError();
  }
}

export function createFinanceRepository({
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
    if (closed) throw new Error("Finance repository is closed");
  }

  function persist({ force = false } = {}) {
    if (!filePath || (transactionDepth > 0 && !force)) return;
    try {
      stateController.commit({
        migrations: state.migrations,
        records: [...records.values()],
        idempotency: [...idempotency.values()],
        audit_events: [...auditEvents.values()],
      });
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
    if (normalized.model_type === "WipItem") {
      const duplicateSource = [...records.values()].find(
        (item) =>
          item.model_type === "WipItem" &&
          item.tenant_id === normalized.tenant_id &&
          item.matter_id === normalized.matter_id &&
          item.source_model_type === normalized.source_model_type &&
          item.source_id === normalized.source_id &&
          recordKey(item) !== key,
      );
      if (duplicateSource) {
        const error = new Error("WIP source item already exists for this matter");
        error.code = "FINANCE_WIP_SOURCE_CONFLICT";
        error.status = 409;
        error.status_code = 409;
        throw error;
      }
    }
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
      const current = records.get(refKey(record));
      if (current?.model_type === "WipSnapshot" && current.immutable_snapshot === true) {
        throw new Error("immutable WIP snapshot cannot be changed");
      }
      return put(record, { overwrite: true });
    },
    update(ref, patch = {}) {
      assertOpen();
      const current = records.get(refKey(ref));
      if (!current) throw new Error(`${ref.model_type} not found: ${ref.id ?? ref.resource_id}`);
      if (current.model_type === "WipSnapshot" && current.immutable_snapshot === true) {
        throw new Error("immutable WIP snapshot cannot be changed");
      }
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
          .filter((record) => !query.matter_id || record.matter_id === query.matter_id)
          .filter((record) => !query.invoice_id || record.invoice_id === query.invoice_id)
          .filter((record) => !query.payment_id || record.payment_id === query.payment_id)
          .filter((record) => !query.bank_import_batch_id || record.bank_import_batch_id === query.bank_import_batch_id)
          .filter((record) => !query.bank_transaction_id || record.bank_transaction_id === query.bank_transaction_id)
          .filter((record) => !query.account_ref || record.account_ref === query.account_ref)
          .map((record) => Object.freeze(clone(record))),
      );
    },
    recordIdempotency(entry = {}) {
      assertOpen();
      assertTenant(entry.tenant_id);
      if (typeof entry.idempotency_key !== "string" || entry.idempotency_key.trim() === "") {
        throw new TypeError("idempotency_key is required");
      }
      const candidate = idempotencyCandidate(entry);
      const key = `${entry.tenant_id}:${entry.idempotency_key}`;
      const existing = idempotency.get(key);
      if (existing) {
        assertMatchingIdempotency(
          existing,
          candidate,
          ["operation", "actor_id", "object_type", "object_id", "request_fingerprint"],
        );
        return Object.freeze(clone(existing));
      }
      const value = Object.freeze({
        tenant_id: entry.tenant_id,
        idempotency_key: entry.idempotency_key,
        ...candidate,
        response: clone(entry.response ?? {}),
        created_at: entry.created_at ?? new Date().toISOString(),
      });
      idempotency.set(key, clone(value));
      persist();
      return value;
    },
    getIdempotency(ref = {}) {
      assertOpen();
      const existing = idempotency.get(`${ref.tenant_id}:${ref.idempotency_key}`);
      if (!existing) return undefined;
      const expected = idempotencyCandidate(ref);
      const fields = [
        ...(Object.hasOwn(ref, "operation") ? ["operation"] : []),
        ...(Object.hasOwn(ref, "actor_id") ? ["actor_id"] : []),
        ...(Object.hasOwn(ref, "object_type") ? ["object_type"] : []),
        ...(Object.hasOwn(ref, "object_id") ? ["object_id"] : []),
        ...(Object.hasOwn(ref, "request") || Object.hasOwn(ref, "request_fingerprint") ? ["request_fingerprint"] : []),
      ];
      assertMatchingIdempotency(existing, expected, fields);
      return Object.freeze(clone(existing));
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
