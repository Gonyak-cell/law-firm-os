export const HRX_AI_SOURCE_TYPES = Object.freeze(["policy_document", "hr_document", "case_record"]);

export const HRX_AI_SOURCE_TYPE_SENSITIVITY = Object.freeze({
  policy_document: "document",
  hr_document: "document",
  case_record: "employee",
});

export const HRX_AI_BLOCKED_SOURCE_FIELDS = Object.freeze([
  "body",
  "content",
  "text",
  "document_body",
  "raw_text",
  "payload",
  "embedding_text",
  "prompt",
  "source_id",
  "document_id",
  "case_id",
]);

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

function normalizeStringArray(value, field) {
  if (value === undefined || value === null) return Object.freeze([]);
  if (!Array.isArray(value)) throw new TypeError(`${field} must be an array`);
  return Object.freeze(value.map((item) => {
    if (typeof item !== "string" || item.trim() === "") throw new TypeError(`${field} must contain non-empty strings`);
    return item.trim();
  }));
}

function rejectBlockedFields(input) {
  for (const field of HRX_AI_BLOCKED_SOURCE_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`HRX AI source registry must not include ${field}`);
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sourceMatchesQuery(source, query) {
  if (!query) return true;
  const needles = query.toLowerCase().split(/[^a-z0-9:_-]+/).filter((token) => token.length >= 2);
  if (needles.length === 0) return true;
  const haystack = [source.source_ref, source.title, source.source_type, ...source.tags].filter(Boolean).join(" ").toLowerCase();
  return needles.some((needle) => haystack.includes(needle));
}

export function createHrxAiSourceRecord(input = {}) {
  rejectBlockedFields(input);
  const sourceType = requiredString(input, "source_type");
  if (!HRX_AI_SOURCE_TYPES.includes(sourceType)) {
    throw new TypeError(`source_type must be one of ${HRX_AI_SOURCE_TYPES.join(", ")}`);
  }
  const sourceRef = requiredString(input, "source_ref");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    source_ref: sourceRef,
    source_key: sourceRef,
    source_type: sourceType,
    sensitivity: optionalString(input, "sensitivity") ?? HRX_AI_SOURCE_TYPE_SENSITIVITY[sourceType],
    title: optionalString(input, "title"),
    owner_ref: optionalString(input, "owner_ref"),
    tags: normalizeStringArray(input.tags, "tags"),
    indexed_by: "source_ref",
    raw_payload_present: false,
  });
}

export function createHrxAiSourceRegistry(seed = []) {
  const sources = new Map();
  const key = (tenantId, sourceRef) => `${tenantId}:${sourceRef}`;

  const registry = {
    index(input) {
      const source = createHrxAiSourceRecord(input);
      sources.set(key(source.tenant_id, source.source_ref), clone(source));
      return Object.freeze(clone(source));
    },
    get(ref = {}) {
      const source = sources.get(key(ref.tenant_id, ref.source_ref));
      return source ? Object.freeze(clone(source)) : undefined;
    },
    list(query = {}) {
      const tags = Array.isArray(query.tags) ? query.tags : [];
      return Object.freeze(
        [...sources.values()]
          .filter((source) => !query.tenant_id || source.tenant_id === query.tenant_id)
          .filter((source) => !query.source_type || source.source_type === query.source_type)
          .filter((source) => !query.sensitivity || source.sensitivity === query.sensitivity)
          .filter((source) => tags.every((tag) => source.tags.includes(tag)))
          .map((source) => Object.freeze(clone(source))),
      );
    },
    search(query = {}) {
      const limit = Number.isInteger(query.limit) && query.limit > 0 ? query.limit : 10;
      const sourceTypes = Array.isArray(query.source_types) ? new Set(query.source_types) : null;
      return Object.freeze(
        registry
          .list(query)
          .filter((source) => !sourceTypes || sourceTypes.has(source.source_type))
          .filter((source) => sourceMatchesQuery(source, query.query))
          .slice(0, limit)
          .map((source) => Object.freeze(clone(source))),
      );
    },
  };

  for (const source of seed) registry.index(source);

  return Object.freeze(registry);
}
