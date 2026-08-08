import { createHmacEnvelopeAuthority } from "../../persistence/src/hmac-envelope.js";

export const MATTER_TIMELINE_SORT = "occurred_at_desc,event_id_desc";
export const MATTER_TIMELINE_LOCAL_CURSOR_SECRET =
  "lawos-local-matter-timeline-cursor-secret-v1";

function text(value, field) {
  const next = typeof value === "string" ? value.trim() : "";
  if (!next || next.length > 256 || /[\u0000-\u001f\u007f]/u.test(next)) {
    throw new TypeError(`Matter timeline cursor ${field} is invalid`);
  }
  return next;
}

function key(value, field) {
  const occurred_at = new Date(value?.occurred_at).toISOString();
  return Object.freeze({
    occurred_at,
    event_id: text(value?.event_id, `${field}.event_id`),
  });
}

export function createMatterTimelineCursorAuthority({
  secret = MATTER_TIMELINE_LOCAL_CURSOR_SECRET,
} = {}) {
  const envelope = createHmacEnvelopeAuthority({
    secret,
    context: "lawos:matter:timeline-cursor:v1",
    prefix: "lawos_matter_timeline_v1",
  });

  function issue({ tenant_id, matter_id, page_limit, snapshot, position } = {}) {
    if (!Number.isSafeInteger(page_limit) || page_limit < 1 || page_limit > 20) {
      throw new TypeError("Matter timeline cursor page_limit is invalid");
    }
    return envelope.issue({
      version: 1,
      tenant_id: text(tenant_id, "tenant_id"),
      matter_id: text(matter_id, "matter_id"),
      sort: MATTER_TIMELINE_SORT,
      page_limit,
      snapshot: key(snapshot, "snapshot"),
      position: key(position, "position"),
    });
  }

  function verify(token, { tenant_id, matter_id, page_limit } = {}) {
    try {
      const value = envelope.verify(token);
      const parsed = Object.freeze({
        version: value.version,
        tenant_id: text(value.tenant_id, "tenant_id"),
        matter_id: text(value.matter_id, "matter_id"),
        sort: value.sort,
        page_limit: value.page_limit,
        snapshot: key(value.snapshot, "snapshot"),
        position: key(value.position, "position"),
      });
      if (
        parsed.version !== 1
        || parsed.sort !== MATTER_TIMELINE_SORT
        || parsed.tenant_id !== text(tenant_id, "tenant_id")
        || parsed.matter_id !== text(matter_id, "matter_id")
        || parsed.page_limit !== page_limit
      ) {
        throw new TypeError("Matter timeline cursor is invalid");
      }
      return parsed;
    } catch {
      throw new TypeError("Matter timeline cursor is invalid");
    }
  }

  return Object.freeze({ issue, verify, sort: MATTER_TIMELINE_SORT });
}
