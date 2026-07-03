const RAW_AMOUNT_FIELDS = Object.freeze(["amount", "salary", "base_pay", "bonus_amount", "equity_value", "gross_pay", "net_pay"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createCompensationRecordMetadata(input = {}) {
  for (const field of RAW_AMOUNT_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`Compensation metadata must not include raw ${field}`);
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    compensation_id: requiredString(input, "compensation_id"),
    employee_id: requiredString(input, "employee_id"),
    encrypted_amount_ref: requiredString(input, "encrypted_amount_ref"),
    currency_ref: input.currency_ref ?? null,
    effective_from: requiredString(input, "effective_from"),
    effective_to: input.effective_to ?? null,
    source_ref: requiredString(input, "source_ref"),
    employment_contract_id: requiredString(input, "employment_contract_id"),
    contract_document_ref: requiredString(input, "contract_document_ref"),
    raw_amount_included: false,
  });
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function visibleCompensationRecord(record = {}) {
  return Object.freeze({
    tenant_id: record.tenant_id,
    compensation_id: record.compensation_id,
    employee_id: record.employee_id,
    masked_compensation_ref: record.encrypted_amount_ref,
    currency_ref: record.currency_ref,
    effective_from: record.effective_from,
    effective_to: record.effective_to,
    source_ref: record.source_ref,
    employment_contract_id: record.employment_contract_id,
    contract_document_ref: record.contract_document_ref,
    raw_amount_included: false,
  });
}

export function maskCompensationRecord(record = {}) {
  return visibleCompensationRecord(createCompensationRecordMetadata(record));
}

export function createInMemoryCompensationRecordStore(seed = []) {
  const records = new Map();
  const key = (tenantId, compensationId) => `${tenantId}:${compensationId}`;

  const store = {
    create(input) {
      const record = createCompensationRecordMetadata(input);
      records.set(key(record.tenant_id, record.compensation_id), clone(record));
      return Object.freeze(clone(record));
    },
    get(ref = {}) {
      const record = records.get(key(ref.tenant_id, ref.compensation_id));
      return record ? Object.freeze(clone(record)) : undefined;
    },
    list(query = {}) {
      return Object.freeze(
        [...records.values()]
          .filter((record) => record.tenant_id === query.tenant_id)
          .filter((record) => !query.employee_id || record.employee_id === query.employee_id)
          .sort((left, right) => `${right.effective_from}:${right.compensation_id}`.localeCompare(`${left.effective_from}:${left.compensation_id}`))
          .map((record) => Object.freeze(clone(record))),
      );
    },
    latest(query = {}) {
      return store.list(query)[0];
    },
    visible(query = {}) {
      return Object.freeze(store.list(query).map(maskCompensationRecord));
    },
  };

  for (const record of seed) store.create(record);

  return Object.freeze(store);
}

export function createSqlCompensationRecordStore({ store } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("SQL compensation record store requires store.query");

  function deserialize(row) {
    return row ? createCompensationRecordMetadata(row) : undefined;
  }

  const compensation = {
    create(input) {
      const record = createCompensationRecordMetadata(input);
      return deserialize(
        store.query("insert", {
          table: "hrx_compensation_records",
          row: { ...record, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        }),
      );
    },
    get(ref = {}) {
      return deserialize(
        store.query("selectOne", {
          table: "hrx_compensation_records",
          where: { tenant_id: ref.tenant_id, compensation_id: ref.compensation_id },
        }),
      );
    },
    list(query = {}) {
      const where = { tenant_id: query.tenant_id };
      if (query.employee_id) where.employee_id = query.employee_id;
      return Object.freeze(
        store
          .query("select", { table: "hrx_compensation_records", where })
          .map(deserialize)
          .filter(Boolean)
          .sort((left, right) => `${right.effective_from}:${right.compensation_id}`.localeCompare(`${left.effective_from}:${left.compensation_id}`)),
      );
    },
    latest(query = {}) {
      return compensation.list(query)[0];
    },
    visible(query = {}) {
      return Object.freeze(compensation.list(query).map(maskCompensationRecord));
    },
  };

  return Object.freeze(compensation);
}
