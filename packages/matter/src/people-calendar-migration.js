import { MATTER_CALENDAR_EVENT_KINDS } from "./model.js";

function metadataByEvent(rows, tenantId) {
  return new Map(
    (Array.isArray(rows) ? rows : [])
      .filter((row) => row?.tenant_id === tenantId && row?.event_id)
      .map((row) => [row.event_id, row]),
  );
}

export function backfillPeopleCalendarEvents({
  tenant_id,
  events = [],
  source_metadata = [],
} = {}) {
  const metadata = metadataByEvent(source_metadata, tenant_id);
  const providerKeys = new Set();
  const rows = [];
  const reviewRequired = [];
  const conflicts = [];
  let classifiedCount = 0;
  for (const event of Array.isArray(events) ? events : []) {
    if (event?.tenant_id !== tenant_id) throw new TypeError("MatterCalendarEvent migration tenant mismatch");
    const source = metadata.get(event.event_id);
    const proposedKind = MATTER_CALENDAR_EVENT_KINDS.includes(source?.event_kind)
      ? source.event_kind
      : (MATTER_CALENDAR_EVENT_KINDS.includes(event.event_kind) ? event.event_kind : "unknown");
    const provider = source?.provider ?? event.provider ?? null;
    const providerEventId = source?.provider_event_id ?? event.provider_event_id ?? null;
    const providerSeriesId = source?.provider_series_id ?? event.provider_series_id ?? null;
    const providerKey = provider && providerEventId ? `${tenant_id}:${provider}:${providerEventId}` : null;
    if (providerKey && providerKeys.has(providerKey)) {
      const row = Object.freeze({
        ...event,
        event_kind: "unknown",
        provider: null,
        provider_event_id: null,
        provider_series_id: null,
      });
      rows.push(row);
      const conflict = Object.freeze({
        tenant_id,
        event_id: event.event_id,
        reason: "provider_event_id_conflict",
      });
      conflicts.push(conflict);
      reviewRequired.push(Object.freeze({
        ...conflict,
        action_label: "일정 종류 확인 필요",
      }));
      continue;
    }
    if (providerKey) providerKeys.add(providerKey);
    const row = Object.freeze({
      ...event,
      event_kind: proposedKind,
      provider,
      provider_event_id: providerEventId,
      provider_series_id: providerSeriesId,
    });
    rows.push(row);
    if (proposedKind === "unknown") {
      reviewRequired.push(Object.freeze({
        tenant_id,
        event_id: event.event_id,
        reason: "explicit_event_kind_missing",
        action_label: "일정 종류 확인 필요",
      }));
    } else {
      classifiedCount += 1;
    }
  }
  return Object.freeze({
    rows: Object.freeze(rows),
    review_required: Object.freeze(reviewRequired),
    conflicts: Object.freeze(conflicts),
    report: Object.freeze({
      row_count: rows.length,
      classified_count: classifiedCount,
      unknown_count: rows.filter(({ event_kind }) => event_kind === "unknown").length,
      conflict_count: conflicts.length,
      title_inference_count: 0,
      forced_inference_enabled: false,
    }),
  });
}
