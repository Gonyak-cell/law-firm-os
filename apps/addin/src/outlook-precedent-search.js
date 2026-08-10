export const OUTLOOK_PRECEDENT_SEARCH_PATH = "/api/outlook/precedents";
export const OUTLOOK_PRECEDENT_READINESS_PATH = "/api/outlook/precedents/readiness";
export const OUTLOOK_PRECEDENT_INDEX_VERSION = "lawos-precedent-fts-v2";

const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const SAFE_REF = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u;
const SAFE_DIGEST = /^[a-f0-9]{64}$/u;
const SAFE_CURSOR = /^[A-Za-z0-9._~-]{1,4096}$/u;
const SAFE_COURT = 200;
const READINESS_FIELDS = new Set([
  "request_id", "outcome", "runtime_ready", "authoritative", "index_version",
  "authority_fingerprint", "safe_error_codes", "production_ready_claim",
]);
const RESPONSE_FIELDS = new Set([
  "request_id", "outcome", "items", "next_cursor", "page_info", "safe_error_codes",
  "count_leak_prevented", "raw_body_included", "storage_pointer_ref_included",
  "index_version", "index_stale", "authoritative", "production_ready_claim",
]);
const ITEM_FIELDS = new Set([
  "source_id", "source_kind", "title", "snippet", "source_matter_id", "document_id",
  "version_id", "citation", "source_reference", "source_url", "search_rank",
  "match_fields", "content_sha256", "index_version", "index_stale", "raw_body_included",
  "storage_pointer_ref_included",
]);

function error(code, message = code) {
  return Object.assign(new Error(message), { safe_error_code: code });
}

function object(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function safeText(value, maxLength, required = true) {
  if (typeof value !== "string") return required ? null : "";
  const text = value.normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]+/gu, " ").replace(/\s+/gu, " ").trim();
  return text && text.length <= maxLength ? text : required ? null : text.slice(0, maxLength);
}

function safeId(value) {
  return typeof value === "string" && value === value.trim() && SAFE_ID.test(value) ? value : null;
}

function safeRef(value) {
  return typeof value === "string" && SAFE_REF.test(value) ? value : null;
}

function cursor(value) {
  return value == null || value === "" ? null
    : typeof value === "string" && SAFE_CURSOR.test(value) ? value : null;
}

function queryText(value) {
  const text = safeText(value, 200);
  return text && text.length >= 2 ? text.toLocaleLowerCase("ko-KR") : null;
}

function internalLink({ matterId, documentId, versionId, digest }) {
  return `?view=vault&matter_id=${encodeURIComponent(matterId)}&document_id=${encodeURIComponent(documentId)}&document_version_id=${encodeURIComponent(versionId)}&document_sha256=${digest}#vault-search-documents`;
}

function httpsLink(value) {
  if (typeof value !== "string" || value.length < 1 || value.length > 2048) return null;
  let parsed;
  try { parsed = new URL(value); } catch { return null; }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.hash) return null;
  const canonical = parsed.toString();
  return canonical === value ? canonical : null;
}

function readinessError(body) {
  const codes = Array.isArray(body?.safe_error_codes) ? body.safe_error_codes : [];
  if (codes.includes("PRECEDENT_INDEX_STALE")
      || body?.index_version != null && body.index_version !== OUTLOOK_PRECEDENT_INDEX_VERSION) {
    throw error("PRECEDENT_INDEX_STALE");
  }
  if (codes.length || body?.runtime_ready !== true || body?.authoritative !== true) {
    throw error("OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE");
  }
  throw error("OUTLOOK_PRECEDENT_READINESS_INVALID");
}

export function parseOutlookPrecedentReadiness(body) {
  const value = object(body);
  if (!value || Object.keys(value).some((key) => !READINESS_FIELDS.has(key))) readinessError(value);
  if (value.outcome !== "passed" || value.runtime_ready !== true || value.authoritative !== true
      || value.safe_error_codes?.length !== 0 || value.production_ready_claim !== false
      || !safeRef(value.request_id) || value.index_version !== OUTLOOK_PRECEDENT_INDEX_VERSION
      || !SAFE_DIGEST.test(value.authority_fingerprint ?? "")) readinessError(value);
  return Object.freeze({
    request_id: value.request_id, outcome: value.outcome, runtime_ready: true,
    authoritative: true, index_version: value.index_version,
    authority_fingerprint: value.authority_fingerprint, safe_error_codes: Object.freeze([]),
    production_ready_claim: false,
  });
}

export function createOutlookPrecedentReadinessRequest({ matterId } = {}) {
  const id = safeId(matterId);
  return id ? Object.freeze({ method: "GET", matter_id: id,
    path: `${OUTLOOK_PRECEDENT_READINESS_PATH}?matter_id=${encodeURIComponent(id)}` }) : null;
}

function boundedLimit(value) {
  if (value == null || value === "") return 10;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 1 && number <= 20 ? number : null;
}

export function createOutlookPrecedentSearchRequest({ readiness, query, matterId, cursor: rawCursor, limit } = {}) {
  try { parseOutlookPrecedentReadiness(readiness); } catch { return null; }
  const id = safeId(matterId);
  const text = queryText(query);
  const bounded = boundedLimit(limit);
  const nextCursor = cursor(rawCursor);
  if (!id || !text || bounded == null || (rawCursor != null && rawCursor !== "" && !nextCursor)) return null;
  const parameters = `q=${encodeURIComponent(text)}&matter_id=${encodeURIComponent(id)}&limit=${bounded}`;
  return Object.freeze({ method: "GET", path: `${OUTLOOK_PRECEDENT_SEARCH_PATH}?${parameters}${nextCursor ? `&cursor=${encodeURIComponent(nextCursor)}` : ""}`,
    query: text, matter_id: id, limit: bounded, ...(nextCursor ? { cursor: nextCursor } : {}) });
}

function citation(value) {
  const item = object(value);
  if (!item || Object.keys(item).some((key) => !["court", "case_number", "decision_date"].includes(key))) return null;
  const court = safeText(item.court, SAFE_COURT);
  const caseNumber = safeText(item.case_number, 200);
  const decisionDate = typeof item.decision_date === "string" && /^\d{4}-\d{2}-\d{2}$/u.test(item.decision_date)
    && new Date(`${item.decision_date}T00:00:00.000Z`).toISOString().slice(0, 10) === item.decision_date
    ? item.decision_date : null;
  return court && caseNumber && decisionDate
    ? Object.freeze({ court, case_number: caseNumber, decision_date: decisionDate }) : null;
}

function item(value) {
  const input = object(value);
  if (!input || Object.keys(input).some((key) => !ITEM_FIELDS.has(key))) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  if (input.raw_body_included !== undefined && input.raw_body_included !== false
      || input.storage_pointer_ref_included !== undefined && input.storage_pointer_ref_included !== false) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  if (input.index_stale !== undefined && input.index_stale !== false) throw error("PRECEDENT_INDEX_STALE");
  const sourceId = safeId(input.source_id);
  const kind = input.source_kind;
  const title = safeText(input.title, 300);
  const snippet = safeText(input.snippet, 240);
  const matterId = safeId(input.source_matter_id);
  const documentId = safeId(input.document_id);
  const versionId = safeId(input.version_id);
  const digest = typeof input.content_sha256 === "string" && SAFE_DIGEST.test(input.content_sha256)
    ? input.content_sha256 : null;
  if (!sourceId || !["internal_matter_document", "case_law_document"].includes(kind)
      || !title || !snippet || !matterId || !documentId || !versionId || !digest
      || input.index_version !== OUTLOOK_PRECEDENT_INDEX_VERSION) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  if (input.search_rank !== undefined && !/^-?\d+(?:\.\d+)?$/u.test(String(input.search_rank))) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  if (input.match_fields !== undefined && (!Array.isArray(input.match_fields)
      || input.match_fields.some((field) => !["title", "metadata", "body"].includes(field)))) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  const sourceReference = input.source_reference == null ? null : safeText(input.source_reference, 500);
  if (input.source_reference != null && !sourceReference) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  const expectedInternalLink = internalLink({ matterId, documentId, versionId, digest });
  const sourceUrl = kind === "internal_matter_document" && input.source_url === expectedInternalLink
    ? input.source_url : kind === "case_law_document" ? httpsLink(input.source_url) : null;
  const structuredCitation = kind === "case_law_document" ? citation(input.citation) : null;
  if (kind === "internal_matter_document" && input.citation != null) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  if (!sourceUrl || (kind === "case_law_document" && (!structuredCitation || !sourceReference))) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  return Object.freeze({ source_id: sourceId, source_kind: kind, title, snippet,
    source_matter_id: matterId, document_id: documentId, version_id: versionId,
    citation: structuredCitation, source_reference: sourceReference, source_url: sourceUrl,
    content_sha256: digest, index_version: OUTLOOK_PRECEDENT_INDEX_VERSION });
}

export function sanitizeOutlookPrecedentSearchResponse(body, { matterId } = {}) {
  const value = object(body);
  if (!value || Object.keys(value).some((key) => !RESPONSE_FIELDS.has(key))) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  const currentMatterId = safeId(matterId);
  if (!currentMatterId) throw error("OUTLOOK_PRECEDENT_MATTER_REQUIRED");
  if (value.safe_error_codes?.length) {
    if (value.safe_error_codes.includes("PRECEDENT_INDEX_STALE")) throw error("PRECEDENT_INDEX_STALE");
    throw error("OUTLOOK_PRECEDENT_RUNTIME_UNAVAILABLE");
  }
  if (value.index_stale === true || value.index_version != null && value.index_version !== OUTLOOK_PRECEDENT_INDEX_VERSION) throw error("PRECEDENT_INDEX_STALE");
  if (value.outcome !== "passed" || value.authoritative !== true || value.production_ready_claim !== false
      || value.safe_error_codes?.length !== 0 || value.count_leak_prevented !== true
      || value.raw_body_included !== false || value.storage_pointer_ref_included !== false
      || value.index_stale !== false
      || value.index_version !== OUTLOOK_PRECEDENT_INDEX_VERSION || !safeRef(value.request_id)
      || !Array.isArray(value.items) || value.items.length > 20) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  if (!object(value.page_info) || Object.keys(value.page_info).some((key) => !["returned_count", "has_more"].includes(key))) {
    throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  }
  const seen = new Set();
  const items = value.items.map((entry) => {
    const projected = item(entry);
    if (seen.has(projected.source_id) || projected.source_matter_id === currentMatterId) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
    seen.add(projected.source_id);
    return projected;
  });
  const nextCursor = cursor(value.next_cursor);
  if (value.next_cursor != null && value.next_cursor !== "" && !nextCursor) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  const returnedCount = value.page_info?.returned_count;
  const hasMore = value.page_info?.has_more;
  if (!Number.isSafeInteger(returnedCount) || returnedCount !== items.length
      || typeof hasMore !== "boolean" || hasMore !== Boolean(nextCursor)) throw error("OUTLOOK_PRECEDENT_RESPONSE_INVALID");
  return Object.freeze({ request_id: value.request_id, outcome: "passed", items: Object.freeze(items),
    next_cursor: nextCursor, page_info: Object.freeze({ returned_count: returnedCount, has_more: hasMore }),
    index_version: OUTLOOK_PRECEDENT_INDEX_VERSION, authoritative: true });
}

export function buildOutlookPrecedentDeepLink(value) {
  const input = object(value);
  const id = safeId(input?.document_id);
  const matterId = safeId(input?.source_matter_id);
  const versionId = safeId(input?.version_id);
  const digest = typeof input?.content_sha256 === "string" && SAFE_DIGEST.test(input.content_sha256)
    ? input.content_sha256 : null;
  if (!input || !id || !safeId(input.source_id) || !matterId || !versionId || !digest) {
    throw error("OUTLOOK_PRECEDENT_DEEP_LINK_INVALID");
  }
  const deepLink = internalLink({ matterId, documentId: id, versionId, digest });
  if (input.source_kind === "internal_matter_document") {
    if (input.source_url !== deepLink) throw error("OUTLOOK_PRECEDENT_DEEP_LINK_INVALID");
  } else if (input.source_kind === "case_law_document") {
    if (!httpsLink(input.source_url)) throw error("OUTLOOK_PRECEDENT_DEEP_LINK_INVALID");
  } else throw error("OUTLOOK_PRECEDENT_DEEP_LINK_INVALID");
  return deepLink;
}

export function projectOutlookPrecedentDisplay(value) {
  const normalized = item(value);
  const copyable = {
    source_id: normalized.source_id, source_kind: normalized.source_kind, title: normalized.title,
    snippet: normalized.snippet, source_matter_id: normalized.source_matter_id,
    document_id: normalized.document_id, version_id: normalized.version_id,
    content_sha256: normalized.content_sha256, source_url: normalized.source_url,
    deep_link: buildOutlookPrecedentDeepLink(normalized),
    index_version: normalized.index_version,
    ...(normalized.citation ? { citation: normalized.citation } : {}),
    ...(normalized.source_reference ? { source_reference: normalized.source_reference } : {}),
  };
  return Object.freeze({ one_line: `${normalized.title} · ${normalized.source_matter_id}`,
    copyable: Object.freeze(copyable) });
}
