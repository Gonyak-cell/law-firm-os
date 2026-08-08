import { Buffer } from "node:buffer";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 20;

function visibleToActor(entry, actor = {}) {
  if (entry.silent === true || entry.hidden_from_actor === true) return false;
  if (!entry.required_scope) return true;
  return Array.isArray(actor.scopes) && actor.scopes.includes(entry.required_scope);
}

function oneLine(value, maxLength) {
  const text = typeof value === "string" ? value : "";
  return text
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, maxLength)
    .trim();
}

function occurredAt(value) {
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : "";
}

function safeEntry(entry) {
  const event_id = oneLine(entry?.event_id, 256);
  const occurred_at = occurredAt(entry?.occurred_at);
  const title = oneLine(entry?.title, 240);
  if (!event_id || !occurred_at || !title) return null;
  return Object.freeze({
    event_id,
    tenant_id: entry.tenant_id,
    matter_id: entry.matter_id,
    occurred_at,
    type: oneLine(entry.type, 128) || "matter.activity",
    title,
    source_ref: oneLine(entry.source_ref, 2048) || null,
  });
}

function boundedLimit(value) {
  if (value === undefined || value === null || value === "") return DEFAULT_LIMIT;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new TypeError("Matter timeline limit is invalid");
  }
  return Math.min(parsed, MAX_LIMIT);
}

function encodeCursor({ tenant_id, matter_id, entry }) {
  return Buffer.from(JSON.stringify({
    version: 1,
    tenant_id,
    matter_id,
    occurred_at: entry.occurred_at,
    event_id: entry.event_id,
  })).toString("base64url");
}

function decodeCursor(value, { tenant_id, matter_id }) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > 2048 || !/^[A-Za-z0-9_-]+$/u.test(value)) {
    throw new TypeError("Matter timeline cursor is invalid");
  }
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      parsed?.version !== 1
      || parsed.tenant_id !== tenant_id
      || parsed.matter_id !== matter_id
      || !occurredAt(parsed.occurred_at)
      || !oneLine(parsed.event_id, 256)
    ) {
      throw new TypeError("Matter timeline cursor is invalid");
    }
    return Object.freeze({
      occurred_at: occurredAt(parsed.occurred_at),
      event_id: oneLine(parsed.event_id, 256),
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === "Matter timeline cursor is invalid") throw error;
    throw new TypeError("Matter timeline cursor is invalid");
  }
}

function afterCursor(entry, cursor) {
  if (!cursor) return true;
  return entry.occurred_at < cursor.occurred_at
    || (entry.occurred_at === cursor.occurred_at && entry.event_id < cursor.event_id);
}

function descendingText(left, right) {
  if (left === right) return 0;
  return left > right ? -1 : 1;
}

export function buildMatterTimelineReadModel({
  entries = [],
  actor = {},
  tenant_id,
  matter_id,
  limit,
  cursor,
} = {}) {
  const pageLimit = boundedLimit(limit);
  const pageCursor = decodeCursor(cursor, { tenant_id, matter_id });
  const visible_entries = entries
    .filter((entry) => (!tenant_id || entry.tenant_id === tenant_id) && (!matter_id || entry.matter_id === matter_id))
    .filter((entry) => visibleToActor(entry, actor))
    .map(safeEntry)
    .filter(Boolean)
    .sort((left, right) => (
      descendingText(left.occurred_at, right.occurred_at)
      || descendingText(left.event_id, right.event_id)
    ))
    .filter((entry) => afterCursor(entry, pageCursor));
  const hasMore = visible_entries.length > pageLimit;
  const page = visible_entries.slice(0, pageLimit);
  return Object.freeze({
    tenant_id,
    matter_id,
    visible_entries: Object.freeze(page),
    page_info: Object.freeze({
      limit: pageLimit,
      has_more: hasMore,
      next_cursor: hasMore
        ? encodeCursor({ tenant_id, matter_id, entry: page.at(-1) })
        : null,
    }),
    omitted_entry_count: null,
    count_leak_prevented: true,
  });
}
