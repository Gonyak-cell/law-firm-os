import { createHash } from "node:crypto";

const BLOCKED_CHUNK_RECORD_FIELDS = Object.freeze(["body", "content", "text", "raw_text", "document_body", "payload"]);

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

function stableHash(value) {
  return createHash("sha256").update(String(value ?? "")).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function rejectStoredPayload(input = {}) {
  for (const field of BLOCKED_CHUNK_RECORD_FIELDS) {
    if (Object.hasOwn(input, field)) throw new TypeError(`HRX AI source chunk record must not include ${field}`);
  }
}

function chunkContent(input = {}) {
  return input.text ?? input.content ?? input.raw_text ?? input.body ?? input.payload ?? input.chunk_hash;
}

export function createHrxAiSourceChunk(input = {}) {
  rejectStoredPayload(input);
  const chunkHash = optionalString(input, "chunk_hash");
  return Object.freeze({
    tenant_id: requiredString(input, "tenant_id"),
    source_ref: requiredString(input, "source_ref"),
    chunk_id: requiredString(input, "chunk_id"),
    source_type: optionalString(input, "source_type") ?? "policy_document",
    chunk_index: Number.isInteger(input.chunk_index) && input.chunk_index >= 0 ? input.chunk_index : 0,
    chunk_hash: chunkHash ?? requiredString(input, "content_hash"),
    metadata: Object.freeze({ ...(input.metadata ?? {}) }),
    indexed_by: Object.freeze(["source_ref", "chunk_id", "chunk_hash"]),
    raw_payload_present: false,
  });
}

export function ingestHrxAiSourceChunks(input = {}) {
  const tenantId = requiredString(input, "tenant_id");
  const sourceRef = requiredString(input, "source_ref");
  const sourceType = optionalString(input, "source_type") ?? "policy_document";
  const chunks = input.chunks;
  if (!Array.isArray(chunks) || chunks.length === 0) throw new TypeError("chunks must be a non-empty array");
  return Object.freeze(
    chunks.map((chunk, index) => {
      const content = chunkContent(chunk);
      if (typeof content !== "string" || content.trim() === "") throw new TypeError("chunk text or chunk_hash is required");
      return createHrxAiSourceChunk({
        tenant_id: tenantId,
        source_ref: sourceRef,
        source_type: sourceType,
        chunk_id: chunk.chunk_id ?? `${sourceRef}#${index + 1}`,
        chunk_index: Number.isInteger(chunk.chunk_index) ? chunk.chunk_index : index,
        chunk_hash: chunk.chunk_hash ?? stableHash(content),
        metadata: chunk.metadata,
      });
    }),
  );
}

export function createInMemoryHrxAiSourceChunkIndex(seed = []) {
  const chunks = new Map();
  const key = (tenantId, sourceRef, chunkId) => `${tenantId}:${sourceRef}:${chunkId}`;

  const index = {
    index(input) {
      const chunk = createHrxAiSourceChunk(input);
      chunks.set(key(chunk.tenant_id, chunk.source_ref, chunk.chunk_id), clone(chunk));
      return Object.freeze(clone(chunk));
    },
    get(ref = {}) {
      const chunk = chunks.get(key(ref.tenant_id, ref.source_ref, ref.chunk_id));
      return chunk ? Object.freeze(clone(chunk)) : undefined;
    },
    list(query = {}) {
      return Object.freeze(
        [...chunks.values()]
          .filter((chunk) => !query.tenant_id || chunk.tenant_id === query.tenant_id)
          .filter((chunk) => !query.source_ref || chunk.source_ref === query.source_ref)
          .filter((chunk) => !query.chunk_hash || chunk.chunk_hash === query.chunk_hash)
          .sort((left, right) => left.chunk_index - right.chunk_index || left.chunk_id.localeCompare(right.chunk_id))
          .map((chunk) => Object.freeze(clone(chunk))),
      );
    },
  };

  for (const chunk of seed) index.index(chunk);

  return Object.freeze(index);
}

function serializeChunk(chunk) {
  const { metadata, indexed_by: indexedBy, ...rest } = chunk;
  return {
    ...rest,
    metadata_json: JSON.stringify(metadata ?? {}),
    indexed_by_json: JSON.stringify(indexedBy ?? []),
    raw_payload_present: chunk.raw_payload_present ? 1 : 0,
  };
}

function deserializeChunk(row) {
  if (!row) return undefined;
  return Object.freeze({
    tenant_id: row.tenant_id,
    source_ref: row.source_ref,
    chunk_id: row.chunk_id,
    source_type: row.source_type,
    chunk_index: Number(row.chunk_index),
    chunk_hash: row.chunk_hash,
    metadata: Object.freeze(JSON.parse(row.metadata_json ?? "{}")),
    indexed_by: Object.freeze(JSON.parse(row.indexed_by_json ?? "[]")),
    raw_payload_present: row.raw_payload_present === true || row.raw_payload_present === 1,
  });
}

export function createSqlHrxAiSourceChunkIndex({ store } = {}) {
  if (!store || typeof store.query !== "function") throw new TypeError("SQL HRX AI source chunk index requires store.query");

  return Object.freeze({
    index(input) {
      const chunk = createHrxAiSourceChunk(input);
      return deserializeChunk(
        store.query("insert", {
          table: "hrx_ai_source_chunks",
          row: { ...serializeChunk(chunk), created_at: new Date().toISOString() },
        }),
      );
    },
    get(ref = {}) {
      return deserializeChunk(
        store.query("selectOne", {
          table: "hrx_ai_source_chunks",
          where: { tenant_id: ref.tenant_id, source_ref: ref.source_ref, chunk_id: ref.chunk_id },
        }),
      );
    },
    list(query = {}) {
      const where = {};
      if (query.tenant_id) where.tenant_id = query.tenant_id;
      if (query.source_ref) where.source_ref = query.source_ref;
      if (query.chunk_hash) where.chunk_hash = query.chunk_hash;
      return Object.freeze(
        store
          .query("select", { table: "hrx_ai_source_chunks", where })
          .sort((left, right) => left.chunk_index - right.chunk_index || left.chunk_id.localeCompare(right.chunk_id))
          .map(deserializeChunk),
      );
    },
  });
}
