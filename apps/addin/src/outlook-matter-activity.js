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

function safeRow(entry) {
  return Object.freeze({
    event_id: oneLine(entry?.event_id, 256),
    occurred_at: oneLine(entry?.occurred_at, 64),
    type: oneLine(entry?.type, 128),
    title: oneLine(entry?.title, 240),
    source_ref: oneLine(entry?.source_ref, 2048) || null,
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
  const nextCursor = text(cursor);
  const params = new URLSearchParams({ limit: String(nextLimit) });
  if (nextCursor) params.set("cursor", nextCursor);
  const body = await requestJson(
    `/api/outlook/matters/${encodeURIComponent(nextMatterId)}/timeline?${params}`,
  );
  const rows = (Array.isArray(body?.item?.visible_entries)
    ? body.item.visible_entries
    : [])
    .map(safeRow)
    .filter((row) => row.event_id && row.occurred_at && row.title);
  const pageInfo = body?.item?.page_info ?? {};
  return {
    status: rows.length > 0 ? "ready" : "empty",
    matter_id: nextMatterId,
    rows,
    page_info: {
      limit: Number.isSafeInteger(pageInfo.limit) ? pageInfo.limit : nextLimit,
      has_more: pageInfo.has_more === true,
      next_cursor: text(pageInfo.next_cursor) || null,
    },
    requested: true,
  };
}

export function shouldRefreshOutlookMatterActivity({ operation, succeeded } = {}) {
  return succeeded === true && REFRESH_OPERATIONS.has(operation);
}
