function eligibleEvents({ tenant_id, allowed_matter_ids = [], events = [] }) {
  const allowed = new Set(allowed_matter_ids);
  return (Array.isArray(events) ? events : [])
    .filter((event) => event?.tenant_id === tenant_id)
    .filter((event) => allowed.has(event.matter_id))
    .filter((event) => event.status !== "cancelled");
}

export function selectExplicitPeopleCourtHearings(input = {}) {
  return Object.freeze(
    eligibleEvents(input)
      .filter((event) => event.event_kind === "court_hearing")
      .sort((left, right) => (
        String(left.starts_at).localeCompare(String(right.starts_at))
        || String(left.event_id).localeCompare(String(right.event_id))
      ))
      .map((event) => Object.freeze({ ...event })),
  );
}

function legacyTitleHearings(input = {}) {
  return eligibleEvents(input).filter((event) => (
    /(?:hearing|court|기일)/iu.test(`${event.event_kind ?? ""} ${event.source_ref ?? ""} ${event.title ?? ""}`)
  ));
}

export function comparePeopleCalendarSelectors(input = {}) {
  const legacy = legacyTitleHearings(input);
  const explicit = selectExplicitPeopleCourtHearings(input);
  const explicitIds = new Set(explicit.map(({ event_id }) => event_id));
  return Object.freeze({
    legacy_count: legacy.length,
    explicit_count: explicit.length,
    review_event_ids: Object.freeze(
      legacy.map(({ event_id }) => event_id).filter((eventId) => !explicitIds.has(eventId)).sort(),
    ),
  });
}
