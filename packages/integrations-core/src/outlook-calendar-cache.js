const EVENT_FIELDS = Object.freeze([
  "provider_event_id",
  "provider_series_id",
  "ical_uid",
  "title",
  "starts_at",
  "ends_at",
  "is_all_day",
  "is_cancelled",
  "sensitivity",
  "show_as",
  "is_organizer",
  "attendee_type",
  "response_status",
  "occurrence_type",
  "last_modified_at",
]);

function cacheKey({ tenant_id, employee_id, provider_identity_id, date }) {
  for (const [field, value] of Object.entries({ tenant_id, employee_id, provider_identity_id, date })) {
    if (typeof value !== "string" || !value) throw new TypeError(`${field} is required`);
  }
  return `${tenant_id}\u0000${employee_id}\u0000${provider_identity_id}\u0000${date}`;
}

function minimalEvent(event) {
  const result = {};
  for (const field of EVENT_FIELDS) {
    if (Object.hasOwn(event ?? {}, field)) result[field] = event[field];
  }
  return Object.freeze(result);
}

function safeCode(error) {
  return typeof error?.safe_error_code === "string"
    ? error.safe_error_code
    : "OUTLOOK_CALENDAR_SOURCE_UNAVAILABLE";
}

export function createOutlookCalendarCache({
  ttl_ms = 5 * 60 * 1000,
  retention_ms = 24 * 60 * 60 * 1000,
  clock = () => new Date().toISOString(),
} = {}) {
  if (!Number.isInteger(ttl_ms) || ttl_ms < 1) throw new TypeError("ttl_ms must be positive");
  if (!Number.isInteger(retention_ms) || retention_ms < ttl_ms) throw new TypeError("retention_ms must be at least ttl_ms");
  const entries = new Map();

  function nowMs() {
    const value = Date.parse(String(clock()));
    if (!Number.isFinite(value)) throw new TypeError("cache clock must return an ISO timestamp");
    return value;
  }

  function readEntry(input) {
    const key = cacheKey(input);
    const entry = entries.get(key);
    if (!entry) return { state: "miss", key, entry: null };
    const ageMs = nowMs() - Date.parse(entry.fetched_at);
    if (ageMs > retention_ms) {
      entries.delete(key);
      return { state: "miss", key, entry: null };
    }
    return { state: ageMs <= ttl_ms ? "ok" : "stale", key, entry };
  }

  function publicResult(state, entry, extra = {}) {
    return Object.freeze({
      state,
      events: entry ? entry.events : null,
      last_success_at: entry?.fetched_at ?? null,
      stale_after: entry ? new Date(Date.parse(entry.fetched_at) + ttl_ms).toISOString() : null,
      etag: entry?.etag ?? null,
      delta_ref: entry?.delta_ref ?? null,
      ...extra,
    });
  }

  function put(input = {}) {
    const key = cacheKey(input);
    const fetchedAt = String(input.fetched_at ?? clock());
    if (!Number.isFinite(Date.parse(fetchedAt))) throw new TypeError("fetched_at must be an ISO timestamp");
    const entry = Object.freeze({
      tenant_id: input.tenant_id,
      employee_id: input.employee_id,
      provider_identity_id: input.provider_identity_id,
      date: input.date,
      events: Object.freeze((Array.isArray(input.events) ? input.events : []).map(minimalEvent)),
      fetched_at: fetchedAt,
      etag: typeof input.etag === "string" ? input.etag : null,
      delta_ref: typeof input.delta_ref === "string" ? input.delta_ref : null,
    });
    entries.set(key, entry);
    return publicResult("ok", entry);
  }

  return Object.freeze({
    put,
    get(input = {}) {
      const found = readEntry(input);
      return publicResult(found.state, found.entry);
    },

    async readThrough(input = {}) {
      const found = readEntry(input);
      if (found.state === "ok") return publicResult("ok", found.entry, { cache: "hit" });
      if (typeof input.load !== "function") return publicResult(found.state, found.entry, { cache: found.state });
      try {
        const loaded = await input.load({
          etag: found.entry?.etag ?? null,
          delta_ref: found.entry?.delta_ref ?? null,
        });
        return put({
          ...input,
          events: loaded.events,
          fetched_at: loaded.fetched_at ?? clock(),
          etag: loaded.etag,
          delta_ref: loaded.delta_ref,
        });
      } catch (error) {
        return publicResult(found.entry ? "stale" : "blocked", found.entry, {
          safe_error_code: safeCode(error),
          cache: found.entry ? "stale_fallback" : "miss",
        });
      }
    },

    deleteForIdentity({ tenant_id, employee_id, provider_identity_id } = {}) {
      let deleted = 0;
      for (const [key, entry] of entries) {
        if (
          entry.tenant_id === tenant_id
          && entry.employee_id === employee_id
          && entry.provider_identity_id === provider_identity_id
        ) {
          entries.delete(key);
          deleted += 1;
        }
      }
      return Object.freeze({ deleted_count: deleted });
    },

    purgeExpired() {
      let deleted = 0;
      for (const [key, entry] of entries) {
        if (nowMs() - Date.parse(entry.fetched_at) > retention_ms) {
          entries.delete(key);
          deleted += 1;
        }
      }
      return Object.freeze({ deleted_count: deleted });
    },

    snapshot() {
      return Object.freeze([...entries.values()]);
    },
  });
}

export const OUTLOOK_CALENDAR_CACHE_EVENT_FIELDS = EVENT_FIELDS;
