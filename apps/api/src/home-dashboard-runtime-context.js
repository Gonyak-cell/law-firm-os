import { evaluateRouteDecision, trimItemsByPermission } from "./permission-gate.js";

const NEWS_CACHE_MIN_MS = 15 * 60 * 1000;
const NEWS_CACHE_MAX_MS = 30 * 60 * 1000;
const INLINE_APPROVAL_SUBTYPES = Object.freeze(["leave", "certificate", "attendance"]);
const VALID_ACTION_TYPES = Object.freeze(["approval", "task"]);
const VALID_FEED_TABS = Object.freeze(["notice", "news", "newsletter"]);
const VALID_DECISIONS = Object.freeze(["approve", "reject", "complete"]);
const VALID_AGENDA_KINDS = Object.freeze(["hearing", "deadline", "meeting", "external", "absence"]);

export const HOME_DASHBOARD_NEWS_SOURCES = Object.freeze([
  Object.freeze({
    id: "bloter",
    label: "Bloter",
    link_host: "bloter.net",
    urls: Object.freeze(["https://cdn.bloter.net/rss/gns_allArticle.xml"]),
  }),
  Object.freeze({
    id: "lawtimes",
    label: "Lawtimes",
    link_host: "lawtimes.co.kr",
    urls: Object.freeze(["https://cdn.lawtimes.co.kr/rss/gn_rss_allArticle.xml"]),
  }),
  Object.freeze({
    id: "dealsite",
    label: "Dealsite",
    link_host: "dealsite.co.kr",
    urls: Object.freeze([
      "https://dealsite.co.kr/rss/allArticle.xml",
      "https://www.dealsite.co.kr/rss/allArticle.xml",
      "https://news.dealsite.co.kr/rss/allArticle.xml",
    ]),
  }),
  Object.freeze({
    id: "investchosun",
    label: "InvestChosun",
    link_host: "investchosun.com",
    urls: Object.freeze([
      "https://www.investchosun.com/rss",
      "https://www.investchosun.com/rss/allArticle.xml",
      "https://www.investchosun.com/feed",
    ]),
  }),
]);

export const HOME_DASHBOARD_BOUNDED_CONTEXT = Object.freeze({
  bounded_context: "home-dashboard",
  contract_ref: "workbook/sidebar-home-dashboard-execution-plan-2026-07-07.md#6",
  contract_schema_version: "law-firm-os.home-dashboard-contract.v0.1",
  endpoints: Object.freeze([
    "GET /home/action-inbox",
    "POST /home/action-inbox/:id/decision",
    "GET /home/agenda",
    "GET /home/feed",
    "GET /home/audit",
    "GET /home/usage-events",
  ]),
  api_aliases: Object.freeze([
    "GET /api/home/action-inbox",
    "POST /api/home/action-inbox/:id/decision",
    "GET /api/home/agenda",
    "GET /api/home/feed",
    "GET /api/home/audit",
    "GET /api/home/usage-events",
  ]),
  data_source: "home_dashboard_runtime_context",
  owner_decisions: Object.freeze({
    "O-01": "news_sources_bloter_lawtimes_dealsite_investchosun",
    "O-02": "newsletter_vault_tag_collection_default",
    "O-03": "home_company_admin_role_only_default",
    "O-04": "inline_approve_leave_certificate_attendance_only_default",
  }),
  news_connector: Object.freeze({
    rss_first: true,
    source_failure_isolation: true,
    cache_seconds_min: 900,
    cache_seconds_max: 1800,
    full_body_storage_enabled: false,
    link_out_only: true,
    sources: Object.freeze(HOME_DASHBOARD_NEWS_SOURCES.map((source) => source.id)),
  }),
  runtime_write_ready: true,
  production_ready_claim: false,
  fail_closed: true,
});

export const HOME_DASHBOARD_API_ERROR_CODES = Object.freeze({
  tenant_required: "HOME_TENANT_REQUIRED",
  permission_required: "HOME_PERMISSION_REQUIRED",
  audit_hint_required: "HOME_AUDIT_HINT_REQUIRED",
  validation_error: "HOME_API_VALIDATION_ERROR",
  unauthorized_omission: "HOME_UNAUTHORIZED_OMISSION",
  review_required: "HOME_REVIEW_REQUIRED",
  approval_required: "HOME_APPROVAL_REQUIRED",
  not_found: "HOME_NOT_FOUND",
  method_not_allowed: "HOME_METHOD_NOT_ALLOWED",
  action_not_allowed: "HOME_ACTION_NOT_ALLOWED",
  item_not_found: "HOME_ITEM_NOT_FOUND",
  news_source_failed: "HOME_NEWS_SOURCE_FAILED",
  news_all_sources_failed: "HOME_NEWS_ALL_SOURCES_FAILED",
});

export function createDefaultHomeDashboardRuntime({
  now = () => new Date(),
  newsFetch = globalThis.fetch?.bind(globalThis),
  cacheTtlMs = NEWS_CACHE_MIN_MS,
  seed = {},
} = {}) {
  return {
    now,
    newsFetch,
    cacheTtlMs: Math.min(Math.max(cacheTtlMs, NEWS_CACHE_MIN_MS), NEWS_CACHE_MAX_MS),
    actionItems: Array.isArray(seed.actionItems) ? [...seed.actionItems] : [],
    agendaEvents: Array.isArray(seed.agendaEvents) ? [...seed.agendaEvents] : [],
    feedEntries: Array.isArray(seed.feedEntries) ? [...seed.feedEntries] : [],
    decisions: new Map(),
    auditEvents: [],
    usageEvents: [],
    newsCache: new Map(),
  };
}

const DEFAULT_RUNTIME = createDefaultHomeDashboardRuntime();

function dashboardPath(pathname = "") {
  return pathname.replace(/^\/api\/home/, "/home");
}

function errorResponse(status, requestId, codes, extra = {}) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: extra.outcome ?? "blocked",
      items: extra.items ?? [],
      events: extra.events,
      entries: extra.entries,
      counts: extra.counts,
      safe_error_codes: codes,
      audit_hint_ref: extra.audit_hint_ref ?? null,
      ui_state: extra.ui_state ?? "blocked",
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function validateCommon(query, requestId) {
  if (!query.tenant_id) return errorResponse(400, requestId, [HOME_DASHBOARD_API_ERROR_CODES.tenant_required]);
  if (!query.permission_ref) return errorResponse(400, requestId, [HOME_DASHBOARD_API_ERROR_CODES.permission_required]);
  if (!query.audit_hint_ref) return errorResponse(400, requestId, [HOME_DASHBOARD_API_ERROR_CODES.audit_hint_required]);
  return null;
}

function routeGate({ context, query, requestId, action, resourceType, runtime }) {
  const invalid = validateCommon(query, requestId);
  if (invalid) return invalid;
  const decision = evaluateRouteDecision({
    context,
    resource: {
      tenant_id: query.tenant_id,
      resource_type: resourceType,
      resource_id: query.resource_id ?? null,
      matter_id: query.matter_ref ?? null,
    },
    action,
  });
  if (decision.effect === "allow") return null;
  appendAudit(runtime, {
    tenant_id: query.tenant_id,
    actor_id: context?.principal?.user_id ?? null,
    action,
    object_type: resourceType,
    object_id: query.resource_id ?? resourceType,
    outcome: decision.effect ?? "deny",
    audit_hint_ref: query.audit_hint_ref,
    permission_ref: query.permission_ref,
    metadata: { route_blocked: true, decision_reason: decision.reason ?? null },
  });
  if (decision.effect === "review_required" || decision.effect === "approval_required") {
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: decision.effect,
        items: [],
        events: [],
        entries: [],
        counts: zeroCounts(),
        safe_error_codes: [
          decision.effect === "review_required"
            ? HOME_DASHBOARD_API_ERROR_CODES.review_required
            : HOME_DASHBOARD_API_ERROR_CODES.approval_required,
        ],
        audit_hint_ref: query.audit_hint_ref,
        ui_state: "review_required",
        count_leak_prevented: true,
        production_ready_claim: false,
      },
    };
  }
  return errorResponse(403, requestId, [HOME_DASHBOARD_API_ERROR_CODES.unauthorized_omission], {
    audit_hint_ref: query.audit_hint_ref,
    ui_state: "denied",
  });
}

function zeroCounts() {
  return Object.freeze({ approval: 0, task_late: 0, task_today: 0 });
}

function dayKey(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function toIso(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function isClosedDecision(runtime, itemId) {
  for (const decision of runtime.decisions.values()) {
    if (decision.item_id === itemId && ["approve", "reject", "complete"].includes(decision.action)) return true;
  }
  return false;
}

function inlineAllowedActions(item) {
  if (item.type === "task") return Object.freeze(["complete", "open"]);
  if (item.type !== "approval") return Object.freeze(["open"]);
  const subtype = String(item.subtype ?? "");
  if (INLINE_APPROVAL_SUBTYPES.includes(subtype)) return Object.freeze(["approve", "reject", "open"]);
  return Object.freeze(["open"]);
}

function sanitizeActionItem(item) {
  return Object.freeze({
    id: String(item.id),
    type: VALID_ACTION_TYPES.includes(item.type) ? item.type : "task",
    subtype: item.subtype ?? null,
    title: item.title ?? "Untitled action",
    matter_ref: item.matter_ref ?? null,
    requester: item.requester ?? null,
    due_at: toIso(item.due_at),
    risk_tier: item.risk_tier ?? "normal",
    allowed_actions: inlineAllowedActions(item),
    raw_payload_included: false,
    production_ready_claim: false,
  });
}

function countsFor(items, now) {
  const today = dayKey(now());
  let approval = 0;
  let taskLate = 0;
  let taskToday = 0;
  for (const item of items) {
    if (item.type === "approval") approval += 1;
    if (item.type !== "task") continue;
    const due = dayKey(item.due_at);
    if (due && due < today) taskLate += 1;
    if (due === today) taskToday += 1;
  }
  return Object.freeze({ approval, task_late: taskLate, task_today: taskToday });
}

function appendAudit(runtime, event = {}) {
  if (!runtime?.auditEvents) return null;
  const auditEvent = Object.freeze({
    audit_event_id: event.audit_event_id ?? `home_audit_${runtime.auditEvents.length + 1}`,
    tenant_id: event.tenant_id ?? null,
    actor_id: event.actor_id ?? null,
    action: event.action,
    object_type: event.object_type,
    object_id: event.object_id,
    outcome: event.outcome ?? "passed",
    audit_hint_ref: event.audit_hint_ref ?? null,
    permission_ref: event.permission_ref ?? null,
    created_at: toIso(runtime.now()),
    raw_payload_included: false,
    production_ready_claim: false,
    metadata: Object.freeze({
      ...(event.metadata ?? {}),
      body_stored: false,
      full_body_storage_enabled: false,
    }),
  });
  runtime.auditEvents.push(auditEvent);
  return auditEvent;
}

function appendUsage(runtime, event = {}) {
  if (!runtime?.usageEvents) return null;
  const usageEvent = Object.freeze({
    usage_event_id: event.usage_event_id ?? `home_usage_${runtime.usageEvents.length + 1}`,
    tenant_id: event.tenant_id ?? null,
    actor_id: event.actor_id ?? null,
    event_type: event.event_type,
    widget_id: event.widget_id,
    interaction: event.interaction,
    route: event.route,
    audit_hint_ref: event.audit_hint_ref ?? null,
    created_at: toIso(runtime.now()),
    raw_payload_included: false,
    production_ready_claim: false,
  });
  runtime.usageEvents.push(usageEvent);
  return usageEvent;
}

function baseQuery(body = {}, query = {}) {
  return {
    tenant_id: body.tenant_id ?? query.tenant_id,
    permission_ref: body.permission_ref ?? query.permission_ref,
    audit_hint_ref: body.audit_hint_ref ?? query.audit_hint_ref,
  };
}

function filterActionItems({ runtime, context, query }) {
  const type = query.type ?? null;
  const activeItems = runtime.actionItems.filter(
    (item) => item.tenant_id === query.tenant_id && !isClosedDecision(runtime, item.id),
  );
  const { allowed } = trimItemsByPermission({
    context,
    items: activeItems,
    action: "home:action_inbox:read",
    resourceType: "home_action_item",
  });
  return type ? allowed.filter((item) => item.type === type) : allowed;
}

function handleActionInbox({ pathname, method, query, context, requestId, runtime }) {
  if (dashboardPath(pathname) !== "/home/action-inbox") return null;
  if (method !== "GET") {
    return errorResponse(405, requestId, [HOME_DASHBOARD_API_ERROR_CODES.method_not_allowed], {
      audit_hint_ref: query.audit_hint_ref,
    });
  }
  if (query.type && !VALID_ACTION_TYPES.includes(query.type)) {
    return errorResponse(400, requestId, [HOME_DASHBOARD_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
    });
  }
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "home:action_inbox:read",
    resourceType: "home_action_inbox",
    runtime,
  });
  if (gated) return gated;
  const allAllowed = filterActionItems({ runtime, context, query: { ...query, type: null } });
  const filtered = query.type ? allAllowed.filter((item) => item.type === query.type) : allAllowed;
  const auditEvent = appendAudit(runtime, {
    tenant_id: query.tenant_id,
    actor_id: context?.principal?.user_id ?? null,
    action: "home.action_inbox.read",
    object_type: "HomeActionInbox",
    object_id: query.type ?? "all",
    audit_hint_ref: query.audit_hint_ref,
    permission_ref: query.permission_ref,
  });
  appendUsage(runtime, {
    tenant_id: query.tenant_id,
    actor_id: context?.principal?.user_id ?? null,
    event_type: "home.widget.view",
    widget_id: query.type === "task" ? "todo" : "approval",
    interaction: "read",
    route: dashboardPath(pathname),
    audit_hint_ref: query.audit_hint_ref,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: filtered.map(sanitizeActionItem),
      counts: countsFor(allAllowed, runtime.now),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function decisionKey(body, itemId, action) {
  return body.idempotency_key ?? `${body.tenant_id}:${itemId}:${action}`;
}

function handleDecision({ pathname, method, query, body, context, requestId, runtime }) {
  const match = dashboardPath(pathname).match(/^\/home\/action-inbox\/([^/]+)\/decision$/);
  if (!match) return null;
  if (method !== "POST") {
    return errorResponse(405, requestId, [HOME_DASHBOARD_API_ERROR_CODES.method_not_allowed], {
      audit_hint_ref: query.audit_hint_ref ?? body.audit_hint_ref,
    });
  }
  const itemId = decodeURIComponent(match[1]);
  const action = body.action;
  const decisionQuery = { ...baseQuery(body, query), resource_id: itemId };
  if (!VALID_DECISIONS.includes(action)) {
    return errorResponse(400, requestId, [HOME_DASHBOARD_API_ERROR_CODES.validation_error], {
      audit_hint_ref: decisionQuery.audit_hint_ref,
    });
  }
  const gated = routeGate({
    context,
    query: decisionQuery,
    requestId,
    action: "home:action_inbox:decision",
    resourceType: "home_action_item",
    runtime,
  });
  if (gated) return gated;
  const item = runtime.actionItems.find((candidate) => candidate.tenant_id === decisionQuery.tenant_id && candidate.id === itemId);
  if (!item) {
    return errorResponse(404, requestId, [HOME_DASHBOARD_API_ERROR_CODES.item_not_found], {
      audit_hint_ref: decisionQuery.audit_hint_ref,
    });
  }
  const allowedActions = inlineAllowedActions(item);
  if (!allowedActions.includes(action)) {
    return errorResponse(400, requestId, [HOME_DASHBOARD_API_ERROR_CODES.action_not_allowed], {
      audit_hint_ref: decisionQuery.audit_hint_ref,
    });
  }
  const key = decisionKey(body, itemId, action);
  const existing = runtime.decisions.get(key);
  if (existing) {
    appendUsage(runtime, {
      tenant_id: decisionQuery.tenant_id,
      actor_id: context?.principal?.user_id ?? null,
      event_type: "home.widget.action",
      widget_id: item.type === "task" ? "todo" : "approval",
      interaction: "idempotent_replay",
      route: dashboardPath(pathname),
      audit_hint_ref: decisionQuery.audit_hint_ref,
    });
    return {
      status: 200,
      body: {
        request_id: requestId,
        outcome: "idempotent_replay",
        item: sanitizeActionItem(item),
        decision: existing,
        safe_error_codes: [],
        audit_hint_ref: decisionQuery.audit_hint_ref,
        production_ready_claim: false,
      },
    };
  }
  const decision = Object.freeze({
    decision_id: `home_decision_${runtime.decisions.size + 1}`,
    item_id: itemId,
    action,
    reason: body.reason ?? null,
    actor_id: context?.principal?.user_id ?? null,
    created_at: toIso(runtime.now()),
    idempotency_key: key,
    production_ready_claim: false,
  });
  runtime.decisions.set(key, decision);
  const auditEvent = appendAudit(runtime, {
    tenant_id: decisionQuery.tenant_id,
    actor_id: context?.principal?.user_id ?? null,
    action: "home.action_inbox.decision",
    object_type: "HomeActionItem",
    object_id: itemId,
    outcome: "passed",
    audit_hint_ref: decisionQuery.audit_hint_ref,
    permission_ref: decisionQuery.permission_ref,
    metadata: { decision_action: action, idempotency_key: key },
  });
  appendUsage(runtime, {
    tenant_id: decisionQuery.tenant_id,
    actor_id: context?.principal?.user_id ?? null,
    event_type: "home.widget.action",
    widget_id: item.type === "task" ? "todo" : "approval",
    interaction: action,
    route: dashboardPath(pathname),
    audit_hint_ref: decisionQuery.audit_hint_ref,
  });
  return {
    status: 201,
    body: {
      request_id: requestId,
      outcome: "passed",
      item: sanitizeActionItem(item),
      decision,
      audit_event: auditEvent,
      undo_expires_at: toIso(new Date(runtime.now().getTime() + 5_000)),
      safe_error_codes: [],
      audit_hint_ref: decisionQuery.audit_hint_ref,
      production_ready_claim: false,
    },
  };
}

function sanitizeAgendaEvent(event) {
  const kind = VALID_AGENDA_KINDS.includes(event.kind) ? event.kind : "external";
  return Object.freeze({
    id: String(event.id),
    kind,
    title: event.title ?? "Untitled event",
    starts_at: toIso(event.starts_at),
    ends_at: toIso(event.ends_at),
    location: event.location ?? null,
    matter_ref: event.matter_ref ?? null,
    raw_payload_included: false,
    production_ready_claim: false,
  });
}

function handleAgenda({ pathname, method, query, context, requestId, runtime }) {
  if (dashboardPath(pathname) !== "/home/agenda") return null;
  if (method !== "GET") {
    return errorResponse(405, requestId, [HOME_DASHBOARD_API_ERROR_CODES.method_not_allowed], {
      audit_hint_ref: query.audit_hint_ref,
    });
  }
  const from = new Date(query.from ?? "");
  const to = new Date(query.to ?? "");
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return errorResponse(400, requestId, [HOME_DASHBOARD_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
    });
  }
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "home:agenda:read",
    resourceType: "home_agenda",
    runtime,
  });
  if (gated) return gated;
  const rawEvents = runtime.agendaEvents.filter((event) => {
    if (event.tenant_id !== query.tenant_id) return false;
    const startsAt = new Date(event.starts_at);
    return !Number.isNaN(startsAt.getTime()) && startsAt >= from && startsAt <= to;
  });
  const { allowed } = trimItemsByPermission({
    context,
    items: rawEvents,
    action: "home:agenda:read",
    resourceType: "home_agenda_event",
  });
  const auditEvent = appendAudit(runtime, {
    tenant_id: query.tenant_id,
    actor_id: context?.principal?.user_id ?? null,
    action: "home.agenda.read",
    object_type: "HomeAgenda",
    object_id: `${query.from}:${query.to}`,
    audit_hint_ref: query.audit_hint_ref,
    permission_ref: query.permission_ref,
  });
  appendUsage(runtime, {
    tenant_id: query.tenant_id,
    actor_id: context?.principal?.user_id ?? null,
    event_type: "home.widget.view",
    widget_id: "calendar",
    interaction: "read",
    route: dashboardPath(pathname),
    audit_hint_ref: query.audit_hint_ref,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      events: allowed.map(sanitizeAgendaEvent),
      audit_event: auditEvent,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function stripTags(value = "") {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function firstTagValue(itemXml, tagName) {
  const match = itemXml.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  if (!match) return null;
  return stripTags(match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, ""));
}

function parseRssItems(xml, source) {
  const items = [];
  const matches = String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi);
  for (const match of matches) {
    const itemXml = match[1];
    const title = firstTagValue(itemXml, "title");
    const url = firstTagValue(itemXml, "link");
    if (!title || !url) continue;
    const publishedAt = toIso(firstTagValue(itemXml, "pubDate") ?? firstTagValue(itemXml, "published"));
    const preview = stripTags(firstTagValue(itemXml, "description") ?? firstTagValue(itemXml, "summary") ?? "");
    items.push(
      Object.freeze({
        id: `news:${source.id}:${items.length + 1}:${Buffer.from(url).toString("base64url").slice(0, 12)}`,
        source: source.label,
        source_id: source.id,
        title,
        body_preview: preview.slice(0, 180),
        published_at: publishedAt ?? toIso(new Date(0)),
        url,
        full_body_included: false,
        link_out_only: true,
        production_ready_claim: false,
      }),
    );
  }
  return items;
}

async function fetchText(fetcher, url) {
  const response = await fetcher(url, {
    headers: {
      accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.1",
      "user-agent": "law-firm-os-home-dashboard/0.1",
    },
  });
  if (!response?.ok) throw new Error(`rss_status_${response?.status ?? "unknown"}`);
  return response.text();
}

async function loadNewsSource(runtime, source) {
  const nowMs = runtime.now().getTime();
  const cached = runtime.newsCache.get(source.id);
  if (cached && nowMs - cached.cached_at_ms < runtime.cacheTtlMs) {
    return { ...cached, cached: true };
  }
  if (!runtime.newsFetch) {
    const failed = {
      source: source.id,
      status: "failed",
      entries: [],
      error_code: "HOME_NEWS_FETCH_UNAVAILABLE",
      cached_at_ms: nowMs,
    };
    runtime.newsCache.set(source.id, failed);
    return failed;
  }
  let lastError = null;
  for (const url of source.urls) {
    try {
      const xml = await fetchText(runtime.newsFetch, url);
      const entries = parseRssItems(xml, source);
      const loaded = {
        source: source.id,
        status: "ok",
        url,
        entries,
        cached_at_ms: nowMs,
      };
      runtime.newsCache.set(source.id, loaded);
      return loaded;
    } catch (error) {
      lastError = error;
    }
  }
  const failed = {
    source: source.id,
    status: "failed",
    entries: [],
    error_code: lastError?.message ?? "HOME_NEWS_SOURCE_FAILED",
    cached_at_ms: nowMs,
  };
  runtime.newsCache.set(source.id, failed);
  return failed;
}

async function loadNewsEntries(runtime) {
  const results = [];
  for (const source of HOME_DASHBOARD_NEWS_SOURCES) {
    results.push(await loadNewsSource(runtime, source));
  }
  const entries = results.flatMap((result) => result.entries ?? []).sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)));
  const statuses = results.map((result) =>
    Object.freeze({
      source: result.source,
      status: result.status,
      cached: result.cached === true,
      error_code: result.error_code ?? null,
    }),
  );
  return { entries, statuses };
}

function sanitizeFeedEntry(entry) {
  return Object.freeze({
    id: String(entry.id),
    source: entry.source ?? "Matter",
    title: entry.title ?? "Untitled feed entry",
    body_preview: stripTags(entry.body_preview ?? entry.summary ?? "").slice(0, 180),
    published_at: toIso(entry.published_at),
    pinned_until: toIso(entry.pinned_until),
    audience: entry.audience ?? null,
    url: entry.url ?? null,
    full_body_included: false,
    link_out_only: entry.url ? true : false,
    raw_payload_included: false,
    production_ready_claim: false,
  });
}

async function handleFeed({ pathname, method, query, context, requestId, runtime }) {
  if (dashboardPath(pathname) !== "/home/feed") return null;
  if (method !== "GET") {
    return errorResponse(405, requestId, [HOME_DASHBOARD_API_ERROR_CODES.method_not_allowed], {
      audit_hint_ref: query.audit_hint_ref,
    });
  }
  const tab = query.tab ?? "notice";
  if (!VALID_FEED_TABS.includes(tab)) {
    return errorResponse(400, requestId, [HOME_DASHBOARD_API_ERROR_CODES.validation_error], {
      audit_hint_ref: query.audit_hint_ref,
    });
  }
  const gated = routeGate({
    context,
    query,
    requestId,
    action: `home:feed:${tab}:read`,
    resourceType: "home_feed",
    runtime,
  });
  if (gated) return gated;
  let entries = [];
  let sourceStatuses = [];
  let safeErrorCodes = [];
  let outcome = "passed";
  if (tab === "news") {
    const news = await loadNewsEntries(runtime);
    entries = news.entries;
    sourceStatuses = news.statuses;
    const failedCount = sourceStatuses.filter((status) => status.status === "failed").length;
    if (failedCount > 0) safeErrorCodes.push(HOME_DASHBOARD_API_ERROR_CODES.news_source_failed);
    if (failedCount === sourceStatuses.length) {
      safeErrorCodes = [HOME_DASHBOARD_API_ERROR_CODES.news_all_sources_failed];
      outcome = "empty";
    } else if (failedCount > 0) {
      outcome = "partial";
    }
  } else {
    const rawEntries = runtime.feedEntries.filter((entry) => entry.tenant_id === query.tenant_id && entry.tab === tab);
    const { allowed } = trimItemsByPermission({
      context,
      items: rawEntries,
      action: `home:feed:${tab}:read`,
      resourceType: "home_feed_entry",
    });
    entries = allowed.map(sanitizeFeedEntry);
  }
  const auditEvent = appendAudit(runtime, {
    tenant_id: query.tenant_id,
    actor_id: context?.principal?.user_id ?? null,
    action: "home.feed.read",
    object_type: "HomeFeed",
    object_id: tab,
    audit_hint_ref: query.audit_hint_ref,
    permission_ref: query.permission_ref,
    metadata: { tab, source_failure_isolation: true },
  });
  appendUsage(runtime, {
    tenant_id: query.tenant_id,
    actor_id: context?.principal?.user_id ?? null,
    event_type: "home.widget.view",
    widget_id: "feed",
    interaction: tab,
    route: dashboardPath(pathname),
    audit_hint_ref: query.audit_hint_ref,
  });
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome,
      entries: entries.map(sanitizeFeedEntry),
      source_statuses: sourceStatuses,
      audit_event: auditEvent,
      safe_error_codes: safeErrorCodes,
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function handleAudit({ pathname, method, query, context, requestId, runtime }) {
  if (dashboardPath(pathname) !== "/home/audit") return null;
  if (method !== "GET") {
    return errorResponse(405, requestId, [HOME_DASHBOARD_API_ERROR_CODES.method_not_allowed], {
      audit_hint_ref: query.audit_hint_ref,
    });
  }
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "home:audit:read",
    resourceType: "home_audit",
    runtime,
  });
  if (gated) return gated;
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: runtime.auditEvents.filter((event) => event.tenant_id === query.tenant_id),
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

function handleUsageEvents({ pathname, method, query, context, requestId, runtime }) {
  if (dashboardPath(pathname) !== "/home/usage-events") return null;
  if (method !== "GET") {
    return errorResponse(405, requestId, [HOME_DASHBOARD_API_ERROR_CODES.method_not_allowed], {
      audit_hint_ref: query.audit_hint_ref,
    });
  }
  const gated = routeGate({
    context,
    query,
    requestId,
    action: "home:usage_events:read",
    resourceType: "home_usage_event",
    runtime,
  });
  if (gated) return gated;
  return {
    status: 200,
    body: {
      request_id: requestId,
      outcome: "passed",
      items: runtime.usageEvents.filter((event) => event.tenant_id === query.tenant_id),
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export async function handleHomeDashboardApiRequest({
  pathname,
  method,
  query = {},
  body = {},
  context,
  requestId,
  runtime = DEFAULT_RUNTIME,
} = {}) {
  const handlers = [
    handleActionInbox,
    handleDecision,
    handleAgenda,
    handleFeed,
    handleAudit,
    handleUsageEvents,
  ];
  for (const handler of handlers) {
    const result = await handler({ pathname, method, query, body, context, requestId, runtime });
    if (result) return result;
  }
  return errorResponse(404, requestId, [HOME_DASHBOARD_API_ERROR_CODES.not_found], {
    audit_hint_ref: query.audit_hint_ref ?? body.audit_hint_ref,
    ui_state: "error",
  });
}
