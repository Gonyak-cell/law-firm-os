import { createEmploymentContract, transitionEmploymentContract } from "./contracts.js";
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

function optionalDate(input, field) {
  const value = optionalString(input, field);
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime())) {
    throw new TypeError(`${field} must be a valid date`);
  }
  return value;
}

function sourceStatus(input) {
  const status = optionalString(input, "source_status") ?? "unverified";
  if (![...HRX_DOCUMENT_SOURCE_STATUSES, "unverified"].includes(status)) throw new TypeError(`Unsupported HR document source status: ${status}`);
  return status;
}

function isEmploymentContractType(input = {}) {
  return input.document_type === "employment_contract";
}

function contractDocumentProjection(input = {}) {
  return createEmploymentContract({
    tenant_id: input.tenant_id,
    contract_id: input.contract_id ?? input.document_id,
    employee_id: input.employee_id,
    profile_id: input.profile_id ?? `profile:${input.employee_id}`,
    state: input.contract_state ?? "draft",
    document_ref: input.document_ref ?? input.source_ref,
    signature_ref: input.signature_ref ?? null,
    renewal_of_contract_id: input.renewal_of_contract_id ?? null,
  });
}

function contractFields(input = {}) {
  if (!isEmploymentContractType(input)) {
    return Object.freeze({
      contract_id: optionalString(input, "contract_id"),
      profile_id: optionalString(input, "profile_id"),
      contract_state: optionalString(input, "contract_state"),
      document_ref: optionalString(input, "document_ref"),
      signature_ref: optionalString(input, "signature_ref"),
      signed_at: optionalIso(input, "signed_at"),
      expires_on: optionalDate(input, "expires_on"),
      expired_at: optionalIso(input, "expired_at"),
      renewal_of_contract_id: optionalString(input, "renewal_of_contract_id"),
    });
  }
  const contract = contractDocumentProjection(input);
  return Object.freeze({
    contract_id: contract.contract_id,
    profile_id: contract.profile_id,
    contract_state: contract.state,
    document_ref: contract.document_ref,
    signature_ref: contract.signature_ref,
    signed_at: optionalIso(input, "signed_at"),
    expires_on: optionalDate(input, "expires_on"),
    expired_at: optionalIso(input, "expired_at"),
    renewal_of_contract_id: contract.renewal_of_contract_id,
  });
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
    ...contractFields(input),
  });
}

export function transitionHrxEmploymentContractDocument(document = {}, change = {}) {
  if (!isEmploymentContractType(document)) throw new TypeError("HR document is not an employment contract");
  const current = contractDocumentProjection(document);
  const signedChange = change.state === "signed" && current.state === "draft"
    ? transitionEmploymentContract(transitionEmploymentContract(current, { state: "approved" }), change)
    : transitionEmploymentContract(current, change);
  return createHrxDocumentMetadata({
    ...document,
    contract_id: signedChange.contract_id,
    profile_id: signedChange.profile_id,
    contract_state: signedChange.state,
    document_ref: signedChange.document_ref,
    signature_ref: signedChange.signature_ref,
    renewal_of_contract_id: signedChange.renewal_of_contract_id,
    signed_at: change.state === "signed" ? change.signed_at : document.signed_at,
    expired_at: change.state === "expired" ? change.expired_at : document.expired_at,
    expires_on: change.expires_on ?? document.expires_on,
  });
}

export function findHrxDocumentsExpiringWithin(documents = [], { as_of, days = 30 } = {}) {
  const asOf = as_of ? new Date(`${as_of}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(asOf.getTime())) throw new TypeError("as_of must be a valid date");
  const horizon = new Date(asOf.getTime() + Number(days) * 24 * 60 * 60 * 1000);
  return Object.freeze(
    documents
      .filter((document) => isEmploymentContractType(document))
      .filter((document) => ["signed", "renewed"].includes(document.contract_state))
      .filter((document) => document.expires_on)
      .filter((document) => {
        const expiresOn = new Date(`${document.expires_on}T00:00:00.000Z`);
        return expiresOn >= asOf && expiresOn <= horizon;
      })
      .map((document) => Object.freeze({ ...document })),
  );
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
    update(ref = {}, patch = {}) {
      const current = store.get(ref);
      if (!current) return undefined;
      const next = createHrxDocumentMetadata({ ...current, ...patch });
      documents.set(key(next.tenant_id, next.document_id), next);
      return Object.freeze({ ...next });
    },
    transitionContract(ref = {}, change = {}) {
      const current = store.get(ref);
      if (!current) return undefined;
      const next = transitionHrxEmploymentContractDocument(current, change);
      documents.set(key(next.tenant_id, next.document_id), next);
      return Object.freeze({ ...next });
    },
    listExpiring(query = {}) {
      return findHrxDocumentsExpiringWithin(store.list(query), query);
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
    update(ref = {}, patch = {}) {
      const current = this.get(ref);
      if (!current) return undefined;
      const next = createHrxDocumentMetadata({ ...current, ...patch });
      return deserializeDocumentMetadata(
        store.query("updateOne", {
          table: "hrx_documents",
          where: { tenant_id: ref.tenant_id, document_id: ref.document_id },
          patch: { ...serializeDocumentMetadata(next), updated_at: new Date().toISOString() },
        }),
      );
    },
    transitionContract(ref = {}, change = {}) {
      const current = this.get(ref);
      if (!current) return undefined;
      const next = transitionHrxEmploymentContractDocument(current, change);
      return deserializeDocumentMetadata(
        store.query("updateOne", {
          table: "hrx_documents",
          where: { tenant_id: ref.tenant_id, document_id: ref.document_id },
          patch: { ...serializeDocumentMetadata(next), updated_at: new Date().toISOString() },
        }),
      );
    },
    listExpiring(query = {}) {
      return findHrxDocumentsExpiringWithin(this.list(query), query);
    },
  });
}
