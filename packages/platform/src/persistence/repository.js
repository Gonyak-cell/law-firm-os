function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

export function createMemoryRepository({ name = "repository", seedRecords = [] } = {}) {
  const records = new Map();
  for (const record of seedRecords) records.set(record.resource_id ?? record.id, clone(record));
  return Object.freeze({
    name,
    durable: false,
    create(record = {}) {
      const key = record.resource_id ?? record.id;
      if (!key) throw new TypeError("resource_id is required");
      if (records.has(key)) throw new Error(`${name} record already exists: ${key}`);
      records.set(key, clone(record));
      return Object.freeze(clone(record));
    },
    upsert(record = {}) {
      const key = record.resource_id ?? record.id;
      if (!key) throw new TypeError("resource_id is required");
      records.set(key, clone(record));
      return Object.freeze(clone(record));
    },
    list() {
      return Object.freeze([...records.values()].map((record) => Object.freeze(clone(record))));
    },
    snapshot() {
      return Object.freeze([...records.entries()].map(([key, value]) => Object.freeze([key, clone(value)])));
    },
    restore(snapshot = []) {
      records.clear();
      for (const [key, value] of snapshot) records.set(key, clone(value));
    },
  });
}

export function assertProductionRepository(repository = {}) {
  if (repository.durable !== true) throw new Error("production Matter-Vault R4 requires durable repository");
  if (repository instanceof Map) throw new Error("Map repository is not allowed for Matter-Vault R4 production mode");
  return true;
}
