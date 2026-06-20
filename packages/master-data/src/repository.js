import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { createMasterDataRecord } from "./model.js";

export const MASTER_DATA_REPOSITORY_SCHEMA_VERSION = "law-firm-os.master-data-repository.v0.1";

const PRIMARY_ID_FIELDS = Object.freeze({
  Party: "party_id",
  Entity: "entity_id",
  Person: "person_id",
  Organization: "organization_id",
  PartyAlias: "party_alias_id",
  PartyIdentifier: "party_identifier_id",
  ClientGroup: "client_group_id",
  Relationship: "relationship_id",
  ContactPoint: "contact_point_id",
  BillingProfile: "billing_profile_id",
});

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function emptyState() {
  return { schema_version: MASTER_DATA_REPOSITORY_SCHEMA_VERSION, records: [] };
}

function normalizeState(input) {
  const state = { ...emptyState(), ...(input ?? {}) };
  state.records = Array.isArray(state.records) ? state.records : [];
  return state;
}

function primaryIdField(modelType) {
  const field = PRIMARY_ID_FIELDS[modelType];
  if (!field) throw new Error(`Unknown Master Data model type ${modelType}`);
  return field;
}

function primaryIdOf(record) {
  const field = primaryIdField(record.model_type);
  const value = record[field];
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${record.model_type}.${field} is required`);
  }
  return value;
}

function normalizeRecord(input = {}) {
  if (typeof input.model_type !== "string" || input.model_type.trim() === "") {
    throw new TypeError("model_type is required");
  }
  return createMasterDataRecord(input.model_type, input);
}

function sameIdentity(left, right) {
  return left.tenant_id === right.tenant_id && left.model_type === right.model_type && primaryIdOf(left) === primaryIdOf(right);
}

function matchesRef(record, ref = {}) {
  if (record.tenant_id !== ref.tenant_id || record.model_type !== ref.model_type) return false;
  const id = ref.id ?? ref[primaryIdField(record.model_type)];
  return primaryIdOf(record) === id;
}

function matchesQuery(record, query = {}) {
  if (query.tenant_id && record.tenant_id !== query.tenant_id) return false;
  if (query.model_type && record.model_type !== query.model_type) return false;
  return true;
}

export function createMasterDataRepository({ filePath, seedRecords = [] } = {}) {
  let state = normalizeState(filePath && existsSync(filePath) ? JSON.parse(readFileSync(filePath, "utf8")) : undefined);
  let closed = false;

  function ensureOpen() {
    if (closed) throw new Error("Master Data repository is closed");
  }

  function flush() {
    if (!filePath) return;
    mkdirSync(dirname(filePath), { recursive: true });
    const tempPath = `${filePath}.tmp`;
    writeFileSync(tempPath, `${JSON.stringify(state, null, 2)}\n`);
    renameSync(tempPath, filePath);
  }

  function upsert(input) {
    ensureOpen();
    const record = normalizeRecord(input);
    const index = state.records.findIndex((current) => sameIdentity(current, record));
    if (index === -1) state.records.push(record);
    else state.records[index] = record;
    flush();
    return Object.freeze(clone(record));
  }

  function seedIfMissing(input) {
    ensureOpen();
    const record = normalizeRecord(input);
    if (!state.records.some((current) => sameIdentity(current, record))) {
      state.records.push(record);
      flush();
    }
    return Object.freeze(clone(record));
  }

  const repository = {
    kind: "master-data-file-repository",
    capabilities: Object.freeze({
      durable: Boolean(filePath),
      create: true,
      read: true,
      update: true,
      seed: true,
    }),

    create(input) {
      ensureOpen();
      const record = normalizeRecord(input);
      if (state.records.some((current) => sameIdentity(current, record))) {
        throw new Error(`${record.model_type} already exists: ${primaryIdOf(record)}`);
      }
      state.records.push(record);
      flush();
      return Object.freeze(clone(record));
    },

    upsert,

    seed: seedIfMissing,

    get(ref = {}) {
      ensureOpen();
      const record = state.records.find((current) => matchesRef(current, ref));
      return record ? Object.freeze(clone(record)) : undefined;
    },

    list(query = {}) {
      ensureOpen();
      return Object.freeze(
        state.records
          .filter((record) => matchesQuery(record, query))
          .map((record) => Object.freeze(clone(record))),
      );
    },

    update(ref = {}, patch = {}) {
      ensureOpen();
      const index = state.records.findIndex((current) => matchesRef(current, ref));
      if (index === -1) throw new Error(`${ref.model_type} not found: ${ref.id ?? ref[primaryIdField(ref.model_type)]}`);
      const current = state.records[index];
      const next = normalizeRecord({
        ...current,
        ...patch,
        tenant_id: current.tenant_id,
        model_type: current.model_type,
        [primaryIdField(current.model_type)]: primaryIdOf(current),
      });
      state.records[index] = next;
      flush();
      return Object.freeze(clone(next));
    },

    transaction(callback) {
      ensureOpen();
      if (typeof callback !== "function") throw new TypeError("transaction callback is required");
      const original = clone(state);
      try {
        const result = callback(repository);
        flush();
        return result;
      } catch (error) {
        state = normalizeState(original);
        flush();
        throw error;
      }
    },

    snapshot() {
      ensureOpen();
      return clone(state);
    },

    close() {
      if (!closed) flush();
      closed = true;
    },
  };

  for (const record of seedRecords) seedIfMissing(record);

  return Object.freeze(repository);
}

export function seedMasterDataRepository(repository, records = []) {
  if (!repository || typeof repository.upsert !== "function") {
    throw new TypeError("Master Data repository with upsert is required");
  }
  const seed = typeof repository.seed === "function" ? repository.seed.bind(repository) : repository.upsert.bind(repository);
  for (const record of records) seed(record);
  return Object.freeze({ seeded_records: records.length });
}
