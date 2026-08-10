import { createHash, createHmac } from "node:crypto";
import { stableJsonStringify } from "../../../persistence/src/durable-file.js";
import { normalizePrecedentText } from "../precedent-source.js";

export const PRECEDENT_INDEX_VERSION = "lawos-precedent-fts-v2";
export const PRECEDENT_APPROVAL_AUTHORITY = "vault-approved-precedent-corpus-v1";
export const PRECEDENT_EXTRACTION_AUTHORITY = "dms-immutable-version-extractor-v1";
export const PRECEDENT_PRIVILEGE_AUTHORITY = "dms-privilege-review-v1";
export const MAX_ALLOWED_DOCUMENTS = 2_000;

export function hashValue(value) {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex");
}

export function derivePrecedentAuthorityKeys(secret) {
  const root = Buffer.isBuffer(secret) ? Buffer.from(secret) : Buffer.from(String(secret ?? ""), "utf8");
  if (root.byteLength < 32) throw new TypeError("precedent authority root secret must contain at least 32 bytes");
  const derive = (purpose) => createHmac("sha256", root)
    .update(`amic-os-precedent-key\x1f${purpose}\x1fv1`)
    .digest();
  return Object.freeze({ cursor: derive("cursor"), extraction_receipt: derive("extraction-receipt") });
}

export function requiredText(value, field, maxLength = 500) {
  const text = String(value ?? "").normalize("NFKC").trim();
  if (!text) throw new TypeError(`${field} is required`);
  if (text.length > maxLength) throw new TypeError(`${field} exceeds ${maxLength} characters`);
  return text;
}

export function requiredId(value, field) {
  const text = requiredText(value, field, 128);
  if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(text)) {
    throw new TypeError(`${field} is invalid`);
  }
  return text;
}

export function requiredSha256(value, field = "sha256") {
  const digest = requiredText(value, field, 64).toLowerCase();
  if (!/^[a-f0-9]{64}$/u.test(digest)) throw new TypeError(`${field} must be a lowercase SHA-256 digest`);
  return digest;
}

export function requiredTimestamp(value, field) {
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime())) throw new TypeError(`${field} must be a valid timestamp`);
  return timestamp.toISOString();
}

export function codedError(message, safeErrorCode, status = 409) {
  return Object.assign(new Error(message), {
    code: `LAWOS_${safeErrorCode}`,
    safe_error_code: safeErrorCode,
    status,
  });
}

export function normalizeAllowedDocumentIds(values) {
  if (!Array.isArray(values) || values.length > MAX_ALLOWED_DOCUMENTS) {
    throw new TypeError(`allowed_document_ids must contain at most ${MAX_ALLOWED_DOCUMENTS} entries`);
  }
  return Object.freeze([...new Set(values.map((value) => requiredId(value, "allowed_document_id")))].sort());
}

export function normalizeQuery(value) {
  const query = normalizePrecedentText(value, { maxLength: 200, lowercase: true });
  if (query.length < 2) throw new TypeError("precedent query must contain between 2 and 200 characters");
  return query;
}

export function queryTerms(query) {
  const terms = [...new Set(query.split(/\s+/u).filter(Boolean))];
  if (terms.length < 1 || terms.length > 16) throw new TypeError("precedent query must contain between 1 and 16 terms");
  return Object.freeze(terms);
}

export function normalizeLimit(value = 10) {
  const limit = Number(value);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 20) {
    throw new TypeError("precedent result limit must be between 1 and 20");
  }
  return limit;
}

export function sourceSnapshot(row) {
  return Object.freeze({
    tenant_id: row.tenant_id,
    source_id: row.source_id,
    source_kind: row.source_kind,
    matter_id: row.matter_id,
    document_id: row.document_id,
    version_id: row.version_id,
    content_sha256: row.content_sha256,
    title: row.title,
    court: row.court ?? null,
    case_number: row.case_number ?? null,
    decision_date: row.decision_date ? new Date(row.decision_date).toISOString().slice(0, 10) : null,
    source_url: row.source_url ?? null,
    source_reference: row.source_reference ?? null,
    status: row.status,
    source_revision: Number(row.source_revision),
    approval_id: row.approval_id,
    approval_batch_id: row.approval_batch_id,
    approval_decision_id: row.approval_decision_id,
    approval_authority: row.approval_authority,
    approved_by: row.approved_by,
    approved_at: new Date(row.approved_at).toISOString(),
    registered_at: new Date(row.registered_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  });
}

export function buildVaultDocumentNavigationHref(value = {}) {
  const params = new URLSearchParams({
    view: "vault",
    matter_id: requiredId(value.matter_id, "matter_id"),
    document_id: requiredId(value.document_id, "document_id"),
    document_version_id: requiredId(value.version_id, "version_id"),
    document_sha256: requiredSha256(value.content_sha256, "content_sha256"),
  });
  return `?${params.toString()}#vault-search-documents`;
}

export function safeAuditPayload(value = {}) {
  return Object.freeze({
    ...value,
    raw_body_included: false,
    document_bytes_included: false,
    storage_pointer_ref_included: false,
  });
}
