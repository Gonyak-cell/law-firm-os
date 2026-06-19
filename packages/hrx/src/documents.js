const BLOCKED_BODY_FIELDS = Object.freeze(["body", "content", "text", "document_body"]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

export function createHrxDocumentMetadata(input = {}) {
  for (const field of BLOCKED_BODY_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`HR document metadata must not include ${field}`);
  }
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    document_id: requiredString(input, "document_id"),
    employee_id: requiredString(input, "employee_id"),
    document_type: requiredString(input, "document_type"),
    source_ref: requiredString(input, "source_ref"),
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
