import { sanitizeOutlookOperationReceiptSummary } from "./outlook-operation-receipt-readback.js";
const DEFAULT_MAX_ENTRIES = 24;
const DEFAULT_TTL_MS = 30 * 60 * 1_000;
const MAX_REF_LENGTH = 256;
const SAFE_FILING_MODES = new Set(["manual", "sent"]);
const SAFE_OUTCOMES = new Set(["created", "idempotent_replay", "attachments_saved", "pending", "prepared", "passed", "blocked", "denied", "review_required", "evaluated", "identity_resolved", "message_resolved", "authorization_started"]);
function text(value, maxLength = MAX_REF_LENGTH) {
  if (typeof value !== "string") return "";
  const next = value.normalize("NFKC").trim();
  return next.length > 0 && next.length <= maxLength && !/[\u0000-\u001f\u007f]/u.test(next) ? next : "";
}
function safeRef(value) {
  const next = text(value);
  if (!next || /\s/u.test(next) || next.includes("@") || next.includes("://")) return "";
  return next;
}
function safeOperation(value) {
  const next = text(value, 64).toLowerCase();
  return /^[a-z][a-z0-9_:-]{0,63}$/u.test(next) ? next : "operation";
}
function boundedNumber(value, fallback, minimum) {
  const parsed = Number(value); return Number.isFinite(parsed) && parsed >= minimum ? Math.floor(parsed) : fallback;
}
function timestamp(value, fallbackMs) {
  const parsed = typeof value === "number" ? value : Date.parse(value); return Number.isFinite(parsed) ? parsed : fallbackMs;
}
function fnv1a64(value) {
  let hash = 0xcbf29ce484222325n;
  for (const character of value) {
    hash ^= BigInt(character.codePointAt(0));
    hash = BigInt.asUintN(64, hash * 0x100000001b3n);
  }
  return hash.toString(16).padStart(16, "0");
}
export function createOutlookOperationItemContextRef({
  itemContextKey,
  canonicalGraphMessageId,
} = {}) {
  const context = typeof itemContextKey === "string"
    && itemContextKey.length > 0
    && itemContextKey.length <= 4_096
    && !/[\u0000-\u001d\u007f]/u.test(itemContextKey)
    ? itemContextKey
    : "";
  const canonical = safeRef(canonicalGraphMessageId);
  return context && canonical
    ? `item-context:${fnv1a64(`${context}\u001f${canonical}`)}`
    : "";
}
function firstRef(values) {
  for (const value of values) { const next = safeRef(value); if (next) return next; } return "";
}
function refs(values) {
  const result = [];
  const seen = new Set();
  for (const value of values.flat(Infinity)) {
    const next = safeRef(value);
    if (next && !seen.has(next)) {
      seen.add(next);
      result.push(next);
    }
  }
  return result.sort();
}
function receiptRefs(receipt = {}) {
  const item = receipt?.item ?? {};
  const emailThread = receipt?.email_thread ?? receipt?.emailThread ?? {};
  const document = receipt?.document ?? {};
  const items = Array.isArray(receipt?.items) ? receipt.items : [];
  const documents = Array.isArray(receipt?.documents) ? receipt.documents : [];
  const timeline = Array.isArray(receipt?.matter_timeline?.visible_entries)
    ? receipt.matter_timeline.visible_entries
    : [];
  return {
    requestId: firstRef([receipt.request_id]),
    emailThreadId: firstRef([
      receipt.email_thread_id,
      receipt.source_email_thread_id,
      emailThread.email_thread_id,
      item.email_thread_id,
      item.source_email_thread_id,
    ]),
    documentIds: refs([
      receipt.document_id,
      document.document_id,
      item.document_id,
      ...(Array.isArray(item.filed_document_ids) ? item.filed_document_ids : []),
      ...(Array.isArray(emailThread.filed_document_ids) ? emailThread.filed_document_ids : []),
      ...items.map((entry) => entry?.document_id ?? entry?.document?.document_id),
      ...documents.map((entry) => entry?.document_id),
    ]),
    timelineEventIds: refs([
      receipt.timeline_event_id,
      receipt.timeline_event?.event_id,
      item.timeline_event_id,
      item.timeline_event?.event_id,
      ...items.map((entry) => entry?.timeline_event_id ?? entry?.timeline_event?.event_id),
      ...timeline.map((entry) => entry?.event_id),
    ]),
  };
}
export function sanitizeOutlookOperationReceipt({
  operationSnapshot,
  receipt,
  operation,
  completedAt,
  nowMs = Date.now(),
} = {}) {
  if (!operationSnapshot || typeof operationSnapshot !== "object" || !receipt || typeof receipt !== "object") {
    return null;
  }
  const itemContextRef = createOutlookOperationItemContextRef({
    itemContextKey: operationSnapshot.item_context_key,
    canonicalGraphMessageId: operationSnapshot.item_identity?.canonical_graph_message_id,
  });
  const matterId = safeRef(operationSnapshot.matter_id);
  if (!itemContextRef || !matterId) return null;
  const outcome = SAFE_OUTCOMES.has(receipt.outcome) ? receipt.outcome : "completed";
  const operationName = safeOperation(operation);
  const hasFilingMode = Object.hasOwn(receipt, "filing_mode") || Object.hasOwn(receipt.item ?? {}, "filing_mode") || Object.hasOwn(receipt.email_thread ?? {}, "filing_mode");
  const filingMode = hasFilingMode
    ? text(receipt.filing_mode ?? receipt.item?.filing_mode ?? receipt.email_thread?.filing_mode, 16).toLowerCase()
    : operationName === "file_email" ? "manual" : "";
  if (operationName === "file_email" && !SAFE_FILING_MODES.has(filingMode)) return null;
  const extracted = receiptRefs(receipt);
  const completedAtMs = timestamp(completedAt ?? receipt.completed_at, nowMs);
  const summary = {
    item_context_ref: itemContextRef,
    matter_id: matterId,
    operation: operationName,
    outcome,
    ...(hasFilingMode && filingMode ? { filing_mode: filingMode } : {}),
    ...(extracted.requestId ? { request_id: extracted.requestId } : {}),
    ...(extracted.emailThreadId ? { email_thread_id: extracted.emailThreadId } : {}),
    ...(extracted.documentIds.length ? { document_ids: Object.freeze(extracted.documentIds) } : {}),
    ...(extracted.timelineEventIds.length ? { timeline_event_ids: Object.freeze(extracted.timelineEventIds) } : {}),
    completed_at: new Date(completedAtMs).toISOString(),
  };
  return Object.freeze(summary);
}
function summaryRefs(summary) {
  return new Set([
    summary?.request_id,
    summary?.email_thread_id,
    ...(summary?.document_ids ?? []),
    ...(summary?.timeline_event_ids ?? []),
  ].filter(Boolean));
}
export function collectOutlookOperationReadbackRefs({ timeline = [], documents = [] } = {}) {
  const values = [];
  for (const entry of Array.isArray(timeline) ? timeline : []) {
    values.push(entry?.event_id, entry?.source_ref);
  }
  for (const document of Array.isArray(documents) ? documents : []) {
    values.push(document?.document_id, document?.source_email_thread_id);
  }
  return Object.freeze(refs(values));
}
export function createOutlookOperationReceiptArchive({
  maxEntries = DEFAULT_MAX_ENTRIES,
  ttlMs = DEFAULT_TTL_MS,
  now = () => Date.now(),
  scopeRef = "initial",
} = {}) {
  const limit = Math.max(1, boundedNumber(maxEntries, DEFAULT_MAX_ENTRIES, 1));
  const ttl = Math.max(1, boundedNumber(ttlMs, DEFAULT_TTL_MS, 1));
  const entries = new Map();
  let sequence = 0;
  let scopeHash = fnv1a64(text(scopeRef, 256) || "initial");
  function nowMs() { const value = Number(now()); return Number.isFinite(value) ? value : Date.now(); }
  function prune(referenceMs = nowMs()) {
    for (const [key, entry] of entries) {
      if (referenceMs - entry.cachedAtMs >= ttl) entries.delete(key);
    }
    if (entries.size <= limit) return;
    const oldest = [...entries.entries()]
      .sort((left, right) => (
        left[1].completedAtMs - right[1].completedAtMs
        || left[1].sequence - right[1].sequence
        || left[0].localeCompare(right[0])
      ));
    for (const [key] of oldest.slice(0, entries.size - limit)) entries.delete(key);
  }
  function record(input = {}) {
    const referenceMs = nowMs();
    const summary = sanitizeOutlookOperationReceipt({ ...input, nowMs: referenceMs });
    return recordSummary(summary, referenceMs);
  }
  function recordSummary(summary, referenceMs = nowMs()) {
    const nextSummary = sanitizeOutlookOperationReceiptSummary(summary); if (!nextSummary) return null; summary = nextSummary;
    prune(referenceMs);
    const durableKey = JSON.stringify({
      operation: summary.operation,
      outcome: summary.outcome,
      filing_mode: summary.filing_mode ?? null,
      email_thread_id: summary.email_thread_id ?? null,
      document_ids: summary.document_ids ?? [],
      timeline_event_ids: summary.timeline_event_ids ?? [],
    });
    const key = `${summary.item_context_ref}\u001f${summary.matter_id}\u001f${durableKey}`;
    const existing = entries.get(key);
    if (existing) return existing.summary;
    entries.set(key, Object.freeze({
      summary,
      completedAtMs: timestamp(summary.completed_at, referenceMs),
      cachedAtMs: referenceMs,
      sequence: sequence++,
    }));
    prune(referenceMs);
    return summary;
  }
  function listForContext({ itemContextRef, matterId } = {}) {
    const context = text(itemContextRef, 128);
    const matter = safeRef(matterId);
    if (!context || !matter) return Object.freeze([]);
    const referenceMs = nowMs();
    prune(referenceMs);
    return Object.freeze([...entries.values()]
      .filter((entry) => entry.summary.item_context_ref === context && entry.summary.matter_id === matter)
      .sort((left, right) => (
        right.completedAtMs - left.completedAtMs
        || right.sequence - left.sequence
      ))
      .map((entry) => entry.summary));
  }
  function reconcileReadback({ itemContextRef, matterId, timeline, documents } = {}) {
    const readback = new Set(collectOutlookOperationReadbackRefs({ timeline, documents }));
    if (readback.size === 0) return Object.freeze([]);
    return Object.freeze(listForContext({ itemContextRef, matterId })
      .filter((summary) => [...summaryRefs(summary)].some((value) => readback.has(value))));
  }
  function clear() { entries.clear(); }
  function setScope(nextScope) { const nextScopeHash = fnv1a64(text(nextScope, 256) || "initial"); if (nextScopeHash === scopeHash) return false; entries.clear(); scopeHash = nextScopeHash; return true; }

  return Object.freeze({
    record,
    recordSummary,
    listForContext,
    reconcileReadback,
    clear,
    setScope,
    get size() {
      prune();
      return entries.size;
    },
  });
}
export const OUTLOOK_OPERATION_RECEIPT_ARCHIVE_LIMIT = DEFAULT_MAX_ENTRIES;
export const OUTLOOK_OPERATION_RECEIPT_TTL_MS = DEFAULT_TTL_MS;
