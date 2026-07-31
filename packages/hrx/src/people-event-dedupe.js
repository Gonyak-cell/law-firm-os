function timestamp(value) {
  const result = Date.parse(value);
  return Number.isFinite(result) ? result : null;
}

function sameTime(left, right) {
  return timestamp(left?.starts_at) !== null
    && timestamp(left?.starts_at) === timestamp(right?.starts_at);
}

function overlaps(left, right) {
  const leftStart = timestamp(left?.starts_at);
  const leftEnd = timestamp(left?.ends_at);
  const rightStart = timestamp(right?.starts_at);
  const rightEnd = timestamp(right?.ends_at);
  return [leftStart, leftEnd, rightStart, rightEnd].every((value) => value !== null)
    && leftStart < rightEnd
    && rightStart < leftEnd;
}

function matchKind(matter, outlook) {
  if (
    matter.provider_event_id
    && outlook.provider_event_id
    && matter.provider_event_id === outlook.provider_event_id
  ) return "provider_event_id";
  if (
    matter.provider_series_id
    && outlook.provider_series_id
    && matter.provider_series_id === outlook.provider_series_id
    && sameTime(matter, outlook)
  ) return "series_occurrence";
  if (
    matter.ical_uid
    && outlook.ical_uid
    && matter.ical_uid === outlook.ical_uid
    && sameTime(matter, outlook)
  ) return "ical_uid";
  return null;
}

function authorityRow(matter, outlook, match) {
  const cancelledMismatch = Boolean(matter.status === "cancelled") !== Boolean(outlook.is_cancelled === true);
  const timeMismatch = !sameTime(matter, outlook);
  const mergeState = cancelledMismatch || timeMismatch ? "conflict" : "merged";
  return Object.freeze({
    event_ref: `people-event:${matter.event_id ?? outlook.provider_event_id}`,
    merge_state: mergeState,
    match_rule: match,
    event_kind: matter.event_kind,
    title: matter.title,
    starts_at: matter.starts_at,
    ends_at: matter.ends_at ?? outlook.ends_at ?? null,
    status: matter.status,
    responsible_attorneys: Object.freeze(Array.isArray(matter.responsible_attorneys) ? matter.responsible_attorneys : []),
    matter_event: Object.freeze({ ...matter }),
    outlook_event: Object.freeze({ ...outlook }),
    authority: Object.freeze({
      event_kind: "matter",
      responsible_attorneys: "matter",
      privacy: "outlook_projection",
    }),
    conflict_reasons: Object.freeze([
      ...(timeMismatch ? ["time_mismatch"] : []),
      ...(cancelledMismatch ? ["cancellation_mismatch"] : []),
    ]),
  });
}

export function mergePeopleMatterOutlookEvents({
  matter_events = [],
  outlook_events = [],
} = {}) {
  const usedOutlook = new Set();
  const items = [];
  for (const matter of matter_events) {
    let matchedIndex = -1;
    let rule = null;
    for (let index = 0; index < outlook_events.length; index += 1) {
      if (usedOutlook.has(index)) continue;
      const candidateRule = matchKind(matter, outlook_events[index]);
      if (candidateRule) {
        matchedIndex = index;
        rule = candidateRule;
        break;
      }
    }
    if (matchedIndex >= 0) {
      usedOutlook.add(matchedIndex);
      items.push(authorityRow(matter, outlook_events[matchedIndex], rule));
      continue;
    }
    const possibleIndex = outlook_events.findIndex((outlook, index) => !usedOutlook.has(index) && overlaps(matter, outlook));
    if (possibleIndex >= 0) {
      usedOutlook.add(possibleIndex);
      items.push(Object.freeze({
        event_ref: `people-event:${matter.event_id}:possible:${outlook_events[possibleIndex].calendar_event_ref ?? possibleIndex}`,
        merge_state: "possible_duplicate",
        match_rule: null,
        matter_event: Object.freeze({ ...matter }),
        outlook_event: Object.freeze({ ...outlook_events[possibleIndex] }),
        automatically_merged: false,
      }));
      continue;
    }
    items.push(Object.freeze({
      event_ref: `people-event:${matter.event_id}`,
      merge_state: "matter_only",
      match_rule: null,
      matter_event: Object.freeze({ ...matter }),
    }));
  }
  for (let index = 0; index < outlook_events.length; index += 1) {
    if (usedOutlook.has(index)) continue;
    const outlook = outlook_events[index];
    items.push(Object.freeze({
      event_ref: `people-event:outlook:${outlook.calendar_event_ref ?? outlook.provider_event_id ?? index}`,
      merge_state: "outlook_only",
      match_rule: null,
      outlook_event: Object.freeze({ ...outlook }),
    }));
  }
  return Object.freeze({
    items: Object.freeze(items),
    string_similarity_auto_merge: false,
    matter_authority_preserved: true,
    permission_filter_required_before_merge: true,
  });
}
