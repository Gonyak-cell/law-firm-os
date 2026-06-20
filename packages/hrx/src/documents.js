import { HRX_DOCUMENT_SOURCE_STATUSES, assertNoHrxDocumentSourceLeak } from "./documents/source-adapter.js";

const BLOCKED_BODY_FIELDS = Object.freeze(["body", "content", "text", "document_body"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function optionalString(input, field) {
  const value = input?.[field];
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new TypeError(`${field} must be a string`);
  return value.trim();
}

function optionalIso(input, field) {
  const value = optionalString(input, field);
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new TypeError(`${field} must be a valid timestamp`);
  return date.toISOString();
}

function sourceStatus(input) {
  const status = optionalString(input, "source_status") ?? "unverified";
  if (![...HRX_DOCUMENT_SOURCE_STATUSES, "unverified"].includes(status)) throw new TypeError(`Unsupported HR document source status: ${status}`);
  return status;
}

function serializeDocumentMetadata(metadata) {
  const { source_metadata: sourceMetadata, ...rest } = metadata;
  return {
    ...rest,
    source_metadata_json: JSON.stringify(sourceMetadata ?? {}),
  };
}

function deserializeDocumentMetadata(row) {
  if (!row) return undefined;
  const { source_metadata_json: sourceMetadataJson, ...rest } = row;
  return Object.freeze({
    ...rest,
    source_metadata: Object.freeze(JSON.parse(sourceMetadataJson ?? "{}")),
  });
}

export function createHrxDocumentMetadata(input = {}) {
  for (const field of BLOCKED_BODY_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`HR document metadata must not include ${field}`);
  }
  assertNoHrxDocumentSourceLeak(input.source_metadata ?? {}, "source_metadata");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    document_id: requiredString(input, "document_id"),
    employee_id: requiredString(input, "employee_id"),
    document_type: requiredString(input, "document_type"),
    source_ref: requiredString(input, "source_ref"),
    source_provider: optionalString(input, "source_provider"),
    source_status: sourceStatus(input),
    source_verified_at: optionalIso(input, "source_verified_at"),
    source_version_ref: optionalString(input, "source_version_ref"),
    source_metadata: Object.freeze({ ...(input.source_metadata ?? {}) }),
    title: input.title ?? null,
    document_body_included: false,
  });
}

export function createInMemoryHrxDocumentStore(seed = []) {
  const documents = new Map();
  const key = (tenantId, documentId) => `${tenantId}:${documentId}`;

  const store = {
    create(input) {
      const metadata = createHrxDocumentMetadata(input);
      documents.set(key(metadata.tenant_id, metadata.document_id), metadata);
      return Object.freeze({ ...metadata });
    },
    get(ref = {}) {
      const value = documents.get(key(ref.tenant_id, ref.document_id));
      return value ? Object.freeze({ ...value }) : undefined;
    },
    list(query = {}) {
      return Object.freeze(
        [...documents.values()]
          .filter((document) => document.tenant_id === query.tenant_id)
          .filter((document) => !query.employee_id || document.employee_id === query.employee_id)
          .map((document) => Object.freeze({ ...document })),
      );
    },
  };

  for (const document of seed) store.create(document);

  return Object.freeze(store);
}

export function createSqlHrxDocumentStore({ store } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("HRX SQL document store requires store.query");

  return Object.freeze({
    create(input) {
      const metadata = createHrxDocumentMetadata(input);
      const row = serializeDocumentMetadata(metadata);
      return deserializeDocumentMetadata(
        store.query("insert", {
          table: "hrx_documents",
          row: { ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        }),
      );
    },
    get(ref = {}) {
      const value = store.query("selectOne", {
        table: "hrx_documents",
        where: { tenant_id: ref.tenant_id, document_id: ref.document_id },
      });
      return deserializeDocumentMetadata(value);
    },
    list(query = {}) {
      const where = { tenant_id: query.tenant_id };
      if (query.employee_id) where.employee_id = query.employee_id;
      return Object.freeze(
        store
          .query("select", { table: "hrx_documents", where })
          .sort((left, right) => left.document_id.localeCompare(right.document_id))
          .map(deserializeDocumentMetadata),
      );
    },
  });
}
