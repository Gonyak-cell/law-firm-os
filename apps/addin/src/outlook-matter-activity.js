export const OUTLOOK_ACTIVITY_REFRESH_OPERATIONS = Object.freeze({
  email_filing: "email_filing",
  attachment_filing: "attachment_filing",
  filing_correction: "filing_correction",
  task_write: "task_write",
  time_draft_write: "time_draft_write",
  document_write: "document_write",
  signature_write: "signature_write",
});

const REFRESH_OPERATIONS = new Set(Object.values(OUTLOOK_ACTIVITY_REFRESH_OPERATIONS));

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

function oneLine(value, maxLength) {
  return text(value)
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/\s+/gu, " ")
    .slice(0, maxLength)
    .trim();
}

function boundedLimit(value) {
  if (value === undefined) return 8;
  if (!Number.isSafeInteger(value) || value < 1 || value > 20) {
    throw new TypeError("limit must be an integer from 1 to 20");
  }
  return value;
}

function isExactIsoInstant(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function cursorText(value) {
  if (value === undefined || value === null || value === "") return "";
  if (
    typeof value !== "string"
    || value.length > 8_192
    || /[\s\u0000-\u001f\u007f]/u.test(value)
  ) {
    throw new TypeError("Outlook Matter activity cursor is invalid");
  }
  return value;
}

function safeRow(entry) {
  if (entry?.source_ref !== null && entry?.source_ref !== undefined) {
    if (
      typeof entry.source_ref !== "string"
      || !entry.source_ref
      || entry.source_ref.length > 2048
      || /[\u0000-\u001f\u007f]/u.test(entry.source_ref)
    ) {
      throw new TypeError("Outlook Matter activity source_ref is invalid");
    }
  }
  return Object.freeze({
    event_id: oneLine(entry?.event_id, 256),
    occurred_at: oneLine(entry?.occurred_at, 64),
    type: oneLine(entry?.type, 128),
    title: oneLine(entry?.title, 240),
    source_ref: entry?.source_ref ?? null,
  });
}

export async function loadOutlookMatterActivity({
  matterId,
  requestJson,
  limit,
  cursor,
} = {}) {
  const nextMatterId = text(matterId);
  if (!nextMatterId) {
    return {
      status: "idle",
      matter_id: null,
      rows: [],
      page_info: null,
      requested: false,
    };
  }
  if (typeof requestJson !== "function") throw new TypeError("requestJson is required");
  const nextLimit = boundedLimit(limit);
  const nextCursor = cursorText(cursor);
  const params = new URLSearchParams({ limit: String(nextLimit) });
  if (nextCursor) params.set("cursor", nextCursor);
  const body = await requestJson(
    `/api/outlook/matters/${encodeURIComponent(nextMatterId)}/timeline?${params}`,
  );
  if (
    !text(body?.request_id)
    || body?.outcome !== "passed"
    || body?.item?.matter_id !== nextMatterId
  ) {
    throw new TypeError("Outlook Matter activity response is incomplete or mismatched");
  }
  if (!Array.isArray(body.item.visible_entries)) {
    throw new TypeError("Outlook Matter activity entries are incomplete");
  }
  const entries = body.item.visible_entries;
  if (entries.some((entry) => entry?.matter_id !== nextMatterId)) {
    throw new TypeError("Outlook Matter activity row is mismatched");
  }
  const rows = entries
    .map(safeRow);
  if (rows.some((row) => (
    !row.event_id
    || !row.type
    || !row.title
    || !isExactIsoInstant(row.occurred_at)
  ))) {
    throw new TypeError("Outlook Matter activity row is incomplete or mismatched");
  }
  const pageInfo = body?.item?.page_info ?? {};
  if (
    pageInfo.limit !== nextLimit
    || typeof pageInfo.has_more !== "boolean"
    || (pageInfo.has_more && !cursorText(pageInfo.next_cursor))
    || (!pageInfo.has_more && pageInfo.next_cursor !== null)
  ) {
    throw new TypeError("Outlook Matter activity page receipt is incomplete or mismatched");
  }
  return {
    status: rows.length > 0 ? "ready" : "empty",
    matter_id: nextMatterId,
    rows,
    page_info: {
      limit: pageInfo.limit,
      has_more: pageInfo.has_more,
      next_cursor: pageInfo.next_cursor,
    },
    requested: true,
  };
}

export function shouldRefreshOutlookMatterActivity({ operation, succeeded } = {}) {
  return succeeded === true && REFRESH_OPERATIONS.has(operation);
}
