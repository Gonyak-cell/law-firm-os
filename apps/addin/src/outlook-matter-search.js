import { outlookItemContextKey } from "./outlook-item-events.js";

export const MAX_OUTLOOK_MATTER_QUERY_LENGTH = 120;
export const MAX_OUTLOOK_MATTER_SEARCH_DEBOUNCE_MS = 1_000;

const DEFAULT_SEARCH_LIMIT = 12;
const MAX_SEARCH_LIMIT = 20;
const DEFAULT_DEBOUNCE_MS = 250;
const ACTIVE_MATTER_STATUSES = new Set(["open", "opening", "paused"]);
const UUID_ONLY = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/iu;

function safeText(value, maxLength = 512) {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim()
    .slice(0, maxLength);
}

function matterSearchError(code, message) {
  return Object.assign(new Error(message), { safe_error_code: code });
}

function canonicalMatterId(value) {
  return typeof value === "string"
    && value.length > 0
    && value.length <= 512
    && value === value.trim()
    && !/[\u0000-\u001f\u007f]/u.test(value)
    ? value
    : "";
}

function boundedLimit(value) {
  const parsed = Number(value ?? DEFAULT_SEARCH_LIMIT);
  if (!Number.isFinite(parsed)) return DEFAULT_SEARCH_LIMIT;
  return Math.min(MAX_SEARCH_LIMIT, Math.max(1, Math.floor(parsed)));
}

function boundedDelay(value) {
  const parsed = Number(value ?? DEFAULT_DEBOUNCE_MS);
  if (!Number.isFinite(parsed)) return DEFAULT_DEBOUNCE_MS;
  return Math.min(
    MAX_OUTLOOK_MATTER_SEARCH_DEBOUNCE_MS,
    Math.max(0, Math.floor(parsed)),
  );
}

function safeMatterResult(value) {
  if (!value || typeof value !== "object") return null;
  const matterId = canonicalMatterId(value.matter_id);
  const status = safeText(value.status, 32);
  if (!matterId || !ACTIVE_MATTER_STATUSES.has(status)) return null;
  return Object.freeze({
    matter_id: matterId,
    matter_code: safeText(value.matter_code) || null,
    title: safeText(value.title) || matterId,
    client_display_name: safeText(value.client_display_name) || null,
    status,
  });
}

export function createOutlookMatterSearchRequest({
  opened = false,
  query,
  limit,
} = {}) {
  if (opened !== true) return null;
  const normalizedQuery = safeText(query, MAX_OUTLOOK_MATTER_QUERY_LENGTH);
  if (!normalizedQuery || UUID_ONLY.test(normalizedQuery)) return null;
  const bounded = boundedLimit(limit);
  return Object.freeze({
    path: `/api/outlook/matters?q=${encodeURIComponent(normalizedQuery)}&limit=${bounded}`,
    method: "GET",
    query: normalizedQuery,
    limit: bounded,
  });
}

export function sanitizeOutlookMatterSearchResponse(body) {
  const seen = new Set();
  const items = [];
  for (const value of Array.isArray(body?.items) ? body.items : []) {
    const item = safeMatterResult(value);
    if (!item || seen.has(item.matter_id)) continue;
    seen.add(item.matter_id);
    items.push(item);
  }
  const requestId = safeText(body?.request_id);
  return Object.freeze({
    ...(requestId ? { request_id: requestId } : {}),
    items: Object.freeze(items),
  });
}

export function createOutlookMatterSelection({ itemContext, matter } = {}) {
  const itemContextKey = outlookItemContextKey(itemContext);
  const safeMatter = safeMatterResult(matter);
  if (!itemContextKey || !safeMatter) {
    throw matterSearchError(
      "OUTLOOK_MATTER_SELECTION_REQUIRED",
      "현재 메일에서 Matter를 다시 선택해 주세요.",
    );
  }
  return Object.freeze({
    ...safeMatter,
    item_context_key: itemContextKey,
    selected_explicitly: true,
  });
}

export function outlookMatterSelectionForContext({ selection, itemContext } = {}) {
  const itemContextKey = outlookItemContextKey(itemContext);
  return selection?.selected_explicitly === true
    && itemContextKey
    && selection.item_context_key === itemContextKey
    ? selection
    : null;
}

export function createOutlookMatterRevalidationRequest({
  selection,
  itemContext,
} = {}) {
  const current = outlookMatterSelectionForContext({ selection, itemContext });
  const query = current?.matter_code || current?.title || current?.client_display_name;
  const request = createOutlookMatterSearchRequest({
    opened: Boolean(current),
    query,
    limit: MAX_SEARCH_LIMIT,
  });
  if (!request) {
    throw matterSearchError(
      "OUTLOOK_MATTER_SELECTION_STALE",
      "Matter를 다시 선택해 주세요.",
    );
  }
  return request;
}

export function revalidateOutlookMatterSelection({
  selection,
  itemContext,
  searchResponse,
} = {}) {
  const current = outlookMatterSelectionForContext({ selection, itemContext });
  const refreshed = current
    ? sanitizeOutlookMatterSearchResponse(searchResponse).items
      .find((item) => item.matter_id === current.matter_id)
    : null;
  if (!refreshed) {
    throw matterSearchError(
      "OUTLOOK_MATTER_SELECTION_STALE",
      "Matter 권한 또는 상태가 바뀌었습니다. 다시 선택해 주세요.",
    );
  }
  return createOutlookMatterSelection({ itemContext, matter: refreshed });
}

export function createOutlookMatterSearchDebouncer({
  requestJson,
  delayMs,
  setTimer = globalThis.setTimeout,
  clearTimer = globalThis.clearTimeout,
} = {}) {
  if (typeof requestJson !== "function") throw new TypeError("requestJson is required");
  if (typeof setTimer !== "function" || typeof clearTimer !== "function") {
    throw new TypeError("timer functions are required");
  }
  const delay = boundedDelay(delayMs);
  let generation = 0;
  let timerId = null;

  const cancel = () => {
    generation += 1;
    if (timerId !== null) clearTimer(timerId);
    timerId = null;
  };

  const search = ({ onResults, onError, ...input } = {}) => {
    const request = createOutlookMatterSearchRequest(input);
    cancel();
    if (!request) return null;
    const token = generation;
    let scheduledTimerId = null;
    scheduledTimerId = setTimer(async () => {
      try {
        const body = await requestJson(request.path);
        if (token === generation && typeof onResults === "function") {
          onResults(sanitizeOutlookMatterSearchResponse(body));
        }
      } catch (error) {
        if (token === generation && typeof onError === "function") onError(error);
      } finally {
        clearTimer(scheduledTimerId);
        if (timerId === scheduledTimerId) timerId = null;
      }
    }, delay);
    timerId = scheduledTimerId;
    return request;
  };

  return Object.freeze({ search, cancel });
}
