import { createHash } from "node:crypto";

export const MAX_OUTLOOK_MATTER_SEARCH_LIMIT = 50;
export const MAX_OUTLOOK_MATTER_SEARCH_QUERY_LENGTH = 120;
export const OUTLOOK_ACTIVE_MATTER_STATUSES = Object.freeze([
  "open",
  "opening",
  "paused",
]);

const ACTIVE_STATUSES = new Set(OUTLOOK_ACTIVE_MATTER_STATUSES);
const DEFAULT_LIMIT = 12;
const MAX_CURSOR_LENGTH = 4_096;

function displayText(value) {
  return typeof value === "string"
    ? value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/gu, " ").replace(/\s+/gu, " ").trim()
    : "";
}

function canonicalMatterId(value, { optional = false } = {}) {
  if (value == null || value === "") {
    if (optional) return null;
    throw new TypeError("matter_id is required");
  }
  if (
    typeof value !== "string"
    || value.length > 512
    || value !== value.trim()
    || /[\u0000-\u001f\u007f]/u.test(value)
  ) throw new TypeError("matter_id must be an exact canonical identifier");
  return value;
}

function positiveLimit(value) {
  const limit = Number(value ?? DEFAULT_LIMIT);
  if (!Number.isSafeInteger(limit) || limit < 1) {
    throw new TypeError("matter search limit must be a positive integer");
  }
  return Math.min(limit, MAX_OUTLOOK_MATTER_SEARCH_LIMIT);
}

function searchFingerprint({ query, matter_id: matterId }) {
  return createHash("sha256")
    .update(JSON.stringify([query, matterId]))
    .digest("base64url");
}

function sortKey(matter) {
  return Object.freeze([
    displayText(matter.matter_code).toLowerCase(),
    displayText(matter.title ?? matter.matter_name).toLowerCase(),
    displayText(matter.client_display_name).toLowerCase(),
    canonicalMatterId(matter.matter_id),
  ]);
}

function compareKeys(left, right) {
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] < right[index]) return -1;
    if (left[index] > right[index]) return 1;
  }
  return 0;
}

function encodeCursor({ fingerprint, key }) {
  return Buffer.from(JSON.stringify({ v: 1, fingerprint, key }))
    .toString("base64url");
}

function decodeCursor(value, fingerprint) {
  if (value == null || value === "") return null;
  if (
    typeof value !== "string"
    || value.length > MAX_CURSOR_LENGTH
    || !/^[A-Za-z0-9_-]+$/u.test(value)
  ) throw new TypeError("matter search cursor is invalid");
  let parsed;
  try {
    parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
  } catch {
    throw new TypeError("matter search cursor is invalid");
  }
  if (
    parsed?.v !== 1
    || parsed.fingerprint !== fingerprint
    || !Array.isArray(parsed.key)
    || parsed.key.length !== 4
    || parsed.key.some((entry) => typeof entry !== "string" || entry.length > 512)
  ) throw new TypeError("matter search cursor does not match the query");
  return Object.freeze([...parsed.key]);
}

export function parseOutlookMatterSearchInput({
  query,
  q,
  matter_id: rawMatterId,
  limit,
  cursor,
} = {}) {
  const normalizedQuery = displayText(q ?? query);
  if (normalizedQuery.length > MAX_OUTLOOK_MATTER_SEARCH_QUERY_LENGTH) {
    throw new TypeError("matter search query is too long");
  }
  const matterId = canonicalMatterId(rawMatterId, { optional: true });
  if (normalizedQuery && matterId) {
    throw new TypeError("matter search accepts query or matter_id, not both");
  }
  const input = {
    query: normalizedQuery,
    matter_id: matterId,
    limit: positiveLimit(limit),
    cursor: typeof cursor === "string" && cursor ? cursor : null,
  };
  return Object.freeze({
    ...input,
    fingerprint: searchFingerprint(input),
  });
}

export function filterOutlookMatterCandidates({ items, input } = {}) {
  if (!input || typeof input !== "object") throw new TypeError("matter search input is required");
  const needle = input.query.toLowerCase();
  return Object.freeze((Array.isArray(items) ? items : [])
    .filter((matter) => ACTIVE_STATUSES.has(matter?.status))
    .filter((matter) => (
      input.matter_id
        ? matter.matter_id === input.matter_id
        : !needle || [
          matter.matter_code,
          matter.title,
          matter.matter_name,
          matter.client_display_name,
        ].some((value) => displayText(value).toLowerCase().includes(needle))
    )));
}

export function paginateOutlookMatters({ items, input } = {}) {
  if (!input || typeof input !== "object") throw new TypeError("matter search input is required");
  const cursorKey = decodeCursor(input.cursor, input.fingerprint);
  const sorted = (Array.isArray(items) ? items : [])
    .map((matter) => ({ matter, key: sortKey(matter) }))
    .sort((left, right) => compareKeys(left.key, right.key));
  const remaining = cursorKey
    ? sorted.filter(({ key }) => compareKeys(key, cursorKey) > 0)
    : sorted;
  const page = remaining.slice(0, input.limit);
  const hasMore = remaining.length > page.length;
  const nextCursor = hasMore && page.length > 0
    ? encodeCursor({ fingerprint: input.fingerprint, key: page.at(-1).key })
    : null;
  return Object.freeze({
    items: Object.freeze(page.map(({ matter }) => matter)),
    page_info: Object.freeze({
      limit: input.limit,
      has_more: hasMore,
      next_cursor: nextCursor,
    }),
  });
}

export function filterAndPaginateOutlookMatters({ items, input } = {}) {
  return paginateOutlookMatters({
    items: filterOutlookMatterCandidates({ items, input }),
    input,
  });
}
