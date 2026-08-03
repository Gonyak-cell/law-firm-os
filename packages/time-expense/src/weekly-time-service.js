import { appendFinanceAuditEvent } from "../../billing/src/finance-audit.js";
import {
  createQuickTimeEntry,
  createTimeEntry,
  findTimeEntryBillingConsumption,
  updateTimeEntry,
} from "./time-entry-service.js";

export const DEFAULT_TIME_LOCK_GRACE_MINUTES = 15;
export const DEFAULT_TIME_WORKDAYS = Object.freeze([1, 2, 3, 4, 5]);

function requiredString(input, field) {
  const value = input?.[field];
  if (typeof value !== "string" || value.trim() === "") throw new TypeError(`${field} is required`);
  return value.trim();
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  return Object.freeze(value);
}

function freezeArray(value) {
  return freeze([...(value ?? [])]);
}

function validDateOnly(value, field = "date") {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new TypeError(`${field} must be a valid ISO date`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new TypeError(`${field} must be a valid ISO date`);
  }
  return value;
}

function dateFromOnly(value) {
  const [year, month, day] = validDateOnly(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function dateOnly(value) {
  return value.toISOString().slice(0, 10);
}

function addDays(value, amount) {
  const date = dateFromOnly(value);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateOnly(date);
}

function daysBetween(start, end) {
  const result = [];
  let cursor = start;
  while (cursor <= end) {
    result.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return result;
}

function resolveInstant(value, field = "now") {
  const candidate = typeof value === "function" ? value() : value;
  const date = candidate instanceof Date ? new Date(candidate.getTime()) : new Date(candidate ?? Date.now());
  if (!Number.isFinite(date.getTime())) throw new TypeError(`${field} must be a valid instant`);
  return date.toISOString();
}

function resolveClock(input = {}) {
  const clock = input.clock;
  const value = input.now
    ?? (typeof clock === "function" ? clock : clock?.now ?? clock?.current_time)
    ?? input.current_time
    ?? input.at
    ?? input.submitted_at
    ?? input.locked_at;
  return resolveInstant(value, "now");
}

function parseInstant(value, field = "instant") {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError(`${field} must be a valid instant`);
  return date;
}

function startOfIsoWeek(value, timezone) {
  const date = parseInstant(value);
  let year;
  let month;
  let day;
  if (timezone) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date);
    const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
    year = Number(values.year);
    month = Number(values.month);
    day = Number(values.day);
  } else {
    year = date.getUTCFullYear();
    month = date.getUTCMonth() + 1;
    day = date.getUTCDate();
  }
  const localDate = new Date(Date.UTC(year, month - 1, day));
  const weekday = localDate.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  localDate.setUTCDate(localDate.getUTCDate() + offset);
  return dateOnly(localDate);
}

function normalizeWeek(input = {}) {
  const timezone = input.timezone ?? "UTC";
  const now = resolveClock(input);
  const weekObject = input.week && typeof input.week === "object" ? input.week : {};
  const weekStart = validDateOnly(input.week_start ?? input.weekStart ?? weekObject.start ?? weekObject.week_start ?? (typeof input.week === "string" ? input.week : undefined) ?? startOfIsoWeek(now, timezone), "week_start");
  const weekEnd = validDateOnly(input.week_end ?? input.weekEnd ?? weekObject.end ?? weekObject.week_end ?? addDays(weekStart, 6), "week_end");
  if (weekEnd < weekStart) throw new RangeError("week_end must be on or after week_start");
  const allDays = daysBetween(weekStart, weekEnd);
  const requestedWorkdays = input.workdays ?? input.workday_dates ?? input.expected_workdays ?? input.expected_days;
  const defaultWorkdays = allDays.filter((value) => {
    const weekday = dateFromOnly(value).getUTCDay();
    return DEFAULT_TIME_WORKDAYS.includes(weekday === 0 ? 7 : weekday);
  });
  let workdays = defaultWorkdays;
  if (requestedWorkdays !== undefined && requestedWorkdays !== null) {
    const requested = Array.isArray(requestedWorkdays) ? requestedWorkdays : [requestedWorkdays];
    if (requested.every((value) => Number.isInteger(value) || /^\d+$/.test(String(value)))) {
      const weekdaySet = new Set(requested.map(Number).filter((value) => value >= 1 && value <= 7));
      workdays = allDays.filter((value) => weekdaySet.has(dateFromOnly(value).getUTCDay() || 7));
    } else {
      workdays = [...new Set(requested.map((value) => validDateOnly(value, "workday")))].filter((value) => allDays.includes(value)).sort();
    }
  }
  return { timezone, now, week_start: weekStart, week_end: weekEnd, all_days: allDays, workdays };
}

function listTimeEntries(repository, tenant_id) {
  return (repository.list({ tenant_id, model_type: "TimeEntry" }) ?? []).map((entry) => clone(entry));
}

function ownerOf(entry) {
  return entry?.actor_id ?? entry?.timekeeper_actor_id ?? entry?.employee_id ?? entry?.user_id ?? null;
}

function idOf(entry) {
  return entry?.time_entry_id ?? entry?.resource_id ?? entry?.id ?? null;
}

function selectedOwnerIds(input = {}) {
  const values = [input.actor_ids, input.timekeeper_actor_ids, input.owner_actor_ids].flatMap((value) => value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);
  if (input.timekeeper_actor_id) values.push(input.timekeeper_actor_id);
  if (input.owner_actor_id) values.push(input.owner_actor_id);
  if (input.employee_id) values.push(input.employee_id);
  if (input.actor_id && input.actor_is_owner !== false) values.push(input.actor_id);
  return new Set(values.filter((value) => typeof value === "string" && value.trim() !== ""));
}

function selectedEntryIds(input = {}) {
  const values = [input.time_entry_ids, input.entry_ids, input.timeEntryIds].flatMap((value) => value === undefined || value === null ? [] : Array.isArray(value) ? value : [value]);
  return new Set(values.filter(Boolean));
}

function entriesInWeek(allEntries, input, week, { includeAllOwners = false } = {}) {
  const ids = selectedEntryIds(input);
  const ownerIds = selectedOwnerIds(input);
  const explicitWeek = Boolean(input.week_start ?? input.week_end ?? input.week ?? input.weekStart ?? input.weekEnd);
  const matterId = input.matter_id;
  const matterIds = new Set(input.matter_ids ?? []);
  return allEntries.filter((entry) => {
    const workDate = entry.work_date;
    if (typeof workDate !== "string") return false;
    if (ids.size === 0 || explicitWeek) {
      if (workDate < week.week_start || workDate > week.week_end) return false;
    }
    if (ids.size > 0 && !ids.has(idOf(entry))) return false;
    if (matterId && entry.matter_id !== matterId) return false;
    if (matterIds.size > 0 && !matterIds.has(entry.matter_id)) return false;
    if (!includeAllOwners && ownerIds.size > 0 && !ownerIds.has(ownerOf(entry))) return false;
    return true;
  });
}

function durationOf(entry) {
  const value = Number(entry?.duration_minutes ?? 0);
  return Number.isFinite(value) ? value : 0;
}

function summarizeItems(items = []) {
  const byMatter = new Map();
  for (const item of items) {
    const matterId = item.matter_id ?? "unassigned";
    const current = byMatter.get(matterId) ?? { matter_id: matterId, entry_count: 0, total_minutes: 0, billable_minutes: 0 };
    current.entry_count += 1;
    current.total_minutes += durationOf(item);
    if (item.billable === true) current.billable_minutes += durationOf(item);
    byMatter.set(matterId, current);
  }
  return freeze({
    entry_count: items.length,
    total_minutes: items.reduce((sum, item) => sum + durationOf(item), 0),
    billable_minutes: items.filter((item) => item.billable === true).reduce((sum, item) => sum + durationOf(item), 0),
    locked_count: items.filter((item) => item.status === "locked" || item.locked_at).length,
    submitted_count: items.filter((item) => item.status === "submitted" || item.status === "approved" || item.submitted_at).length,
    matters: freezeArray([...byMatter.values()].map((value) => freeze({ ...value }))),
  });
}

function operationResponse({ outcome, items, summary, audit_event, replayed = false, ...rest }) {
  return freeze({
    outcome,
    items: freezeArray(items),
    item: items?.length === 1 ? items[0] : null,
    summary,
    audit_event,
    replayed,
    idempotent_replay: replayed,
    ...rest,
  });
}

function replayResponse(response) {
  return operationResponse({
    ...response,
    items: response?.items ?? (response?.item ? [response.item] : []),
    summary: response?.summary ?? summarizeItems(response?.items ?? []),
    replayed: true,
  });
}

function requireCommandContext(input = {}) {
  requiredString(input, "tenant_id");
  requiredString(input, "actor_id");
  requiredString(input, "idempotency_key");
}

function weekObjectId(week, input) {
  const owner = input.timekeeper_actor_id ?? input.owner_actor_id ?? input.actor_id ?? "all";
  return `${input.tenant_id}:${owner}:${week.week_start}`;
}

function canonicalRequest(value) {
  if (Array.isArray(value)) return value.map(canonicalRequest);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => [key, canonicalRequest(value[key])]),
    );
  }
  return value;
}

function weekCommandRequest(input, week, extra = {}) {
  const entryIds = [...selectedEntryIds(input)].sort();
  const ownerIds = [...selectedOwnerIds(input)].sort();
  const matterIds = Array.isArray(input.matter_ids) ? [...input.matter_ids].sort() : input.matter_ids;
  return canonicalRequest({
    tenant_id: input.tenant_id,
    week_start: week.week_start,
    week_end: week.week_end,
    timezone: week.timezone,
    workdays: week.workdays,
    time_entry_ids: entryIds,
    actor_ids: ownerIds,
    matter_id: input.matter_id,
    matter_ids: matterIds,
    ...extra,
  });
}

function appendWeekAudit({ repository, tenant_id, actor_id, action, week, input, idempotency_key, itemCount, metadata = {} }) {
  return appendFinanceAuditEvent({
    repository,
    event: {
      tenant_id,
      actor_id,
      action,
      object_type: "TimeEntryWeek",
      object_id: weekObjectId(week, input),
      idempotency_key,
      metadata: { week_start: week.week_start, week_end: week.week_end, item_count: itemCount, ...metadata },
    },
  });
}

function lockState(entry) {
  if (entry?.status === "locked" || entry?.locked_at) return "locked";
  if (entry?.status === "approved") {
    // Records written before weekly locking did not have a locked_at field;
    // preserve those as readable legacy approvals.  A modern approved row
    // with an explicit null lock timestamp is still unlocked and must surface
    // as a WIP error instead of being silently treated as legacy.
    const hasExplicitLockField = Object.prototype.hasOwnProperty.call(entry, "locked_at");
    if ((hasExplicitLockField && entry.locked_at === null) || (entry.submitted_at && !entry.locked_at)) {
      return "open";
    }
    return "legacy_approved";
  }
  return "open";
}

function isSubmitted(entry) {
  return entry?.status === "submitted" || entry?.status === "approved" || entry?.submitted_at || entry?.approved_for_wip === true;
}

function graceExpiresAt(entry, graceMinutes = DEFAULT_TIME_LOCK_GRACE_MINUTES) {
  const explicit = entry?.lock_grace_until ?? entry?.grace_expires_at ?? entry?.unlock_grace_until;
  if (explicit) return parseInstant(explicit, "grace expiry");
  const lockedAt = entry?.locked_at ?? entry?.updated_at ?? entry?.created_at;
  if (!lockedAt) return null;
  const date = parseInstant(lockedAt, "locked_at");
  date.setUTCMinutes(date.getUTCMinutes() + graceMinutes);
  return date;
}

function graceMinutesFor(input = {}) {
  const value = Number(input.grace_minutes ?? input.grace_period_minutes ?? input.graceMinutes ?? DEFAULT_TIME_LOCK_GRACE_MINUTES);
  if (!Number.isFinite(value) || value <= 0) throw new TypeError("grace_minutes must be positive");
  return value;
}

function filterSelection(allEntries, input, week) {
  const explicitIds = selectedEntryIds(input);
  return entriesInWeek(allEntries, input, week, { includeAllOwners: explicitIds.size > 0 });
}

/**
 * Return one deterministic row per person for a Monday-Sunday period. Missing
 * days default to weekdays, while callers can pass explicit `workdays` for
 * court schedules or a local holiday calendar.
 */
export function listWeeklyTimeCompleteness(input = {}) {
  requiredString(input, "tenant_id");
  const week = normalizeWeek(input);
  const entries = entriesInWeek(listTimeEntries(input.repository, input.tenant_id), input, week, { includeAllOwners: true });
  const actorSeeds = [
    ...(input.actor_ids ?? []),
    ...(input.timekeeper_actor_ids ?? []),
    ...(input.people ?? []),
    ...(input.actors ?? []),
  ];
  if (input.actor_id) actorSeeds.push(input.actor_id);
  if (input.timekeeper_actor_id) actorSeeds.push(input.timekeeper_actor_id);
  if (input.owner_actor_id) actorSeeds.push(input.owner_actor_id);
  const actorMeta = new Map();
  for (const seed of actorSeeds) {
    const actorId = typeof seed === "string" ? seed : seed?.actor_id ?? seed?.employee_id ?? seed?.id;
    if (!actorId) continue;
    actorMeta.set(actorId, typeof seed === "string" ? {} : seed);
  }
  const hasExplicitActors = actorSeeds.length > 0;
  if (!hasExplicitActors) {
    for (const entry of entries) {
      const actorId = ownerOf(entry);
      if (actorId && !actorMeta.has(actorId)) actorMeta.set(actorId, {});
    }
  }
  const items = [...actorMeta.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([actorId, meta]) => {
    const owned = entries.filter((entry) => ownerOf(entry) === actorId);
    const enteredDates = [...new Set(owned.map((entry) => entry.work_date).filter(Boolean))].sort();
    const missingDates = week.workdays.filter((date) => !enteredDates.includes(date));
    const minutes = owned.reduce((sum, entry) => sum + durationOf(entry), 0);
    const billableMinutes = owned.filter((entry) => entry.billable === true).reduce((sum, entry) => sum + durationOf(entry), 0);
    return freeze({
      actor_id: actorId,
      employee_id: meta.employee_id ?? actorId,
      display_name: meta.display_name ?? meta.name ?? null,
      week_start: week.week_start,
      week_end: week.week_end,
      entered_dates: freezeArray(enteredDates),
      input_dates: freezeArray(enteredDates),
      missing_dates: freezeArray(missingDates),
      missing_days: freezeArray(missingDates),
      entry_count: owned.length,
      minutes,
      total_minutes: minutes,
      billable_minutes: billableMinutes,
      complete: missingDates.length === 0,
    });
  });
  const summary = freeze({
    week_start: week.week_start,
    week_end: week.week_end,
    workdays: freezeArray(week.workdays),
    actor_count: items.length,
    complete_actor_count: items.filter((item) => item.complete).length,
    incomplete_actor_count: items.filter((item) => !item.complete).length,
    missing_day_count: items.reduce((sum, item) => sum + item.missing_days.length, 0),
    total_minutes: items.reduce((sum, item) => sum + item.total_minutes, 0),
    billable_minutes: items.reduce((sum, item) => sum + item.billable_minutes, 0),
    entry_count: items.reduce((sum, item) => sum + item.entry_count, 0),
  });
  return freeze({
    items: freezeArray(items),
    people: freezeArray(items),
    rows: freezeArray(items),
    summary,
    week_start: week.week_start,
    week_end: week.week_end,
    workdays: freezeArray(week.workdays),
    timezone: week.timezone,
    replayed: false,
  });
}

function commandEntries(input, week) {
  const allEntries = listTimeEntries(input.repository, input.tenant_id);
  const entries = filterSelection(allEntries, input, week);
  if (entries.length === 0) throw new Error("time entries are required");
  return entries;
}

export function submitTimeWeek(input = {}) {
  requireCommandContext(input);
  const week = normalizeWeek(input);
  const objectId = weekObjectId(week, input);
  const request = weekCommandRequest(input, week);
  const replay = input.repository.getIdempotency({
    tenant_id: input.tenant_id,
    idempotency_key: input.idempotency_key,
    operation: "time_week_submit",
    actor_id: input.actor_id,
    object_type: "TimeEntryWeek",
    object_id: objectId,
    request,
  });
  if (replay) return replayResponse(replay.response);
  const entries = commandEntries(input, week);
  const submittedAt = resolveClock(input);
  return input.repository.transaction((tx) => {
    const updated = entries.map((entry) => {
      if (lockState(entry) === "locked") {
        return tx.update(
          { tenant_id: input.tenant_id, model_type: "TimeEntry", time_entry_id: idOf(entry) },
          {
            status: "locked",
            approved_for_wip: entry.approved_for_wip === true || entry.status === "approved" || entry.status === "locked",
            updates_database_rows: true,
          },
        );
      }
      return tx.update(
        { tenant_id: input.tenant_id, model_type: "TimeEntry", time_entry_id: idOf(entry) },
        {
          status: "submitted",
          submitted_at: entry.submitted_at ?? submittedAt,
          approved_for_wip: entry.approved_for_wip === true || entry.status === "approved",
          updates_database_rows: true,
        },
      );
    });
    const auditEvent = appendWeekAudit({
      repository: tx,
      tenant_id: input.tenant_id,
      actor_id: input.actor_id,
      action: "time.entry.week.submit",
      week,
      input,
      idempotency_key: input.idempotency_key,
      itemCount: updated.length,
    });
    const response = operationResponse({ outcome: "submitted", items: updated, summary: summarizeItems(updated), audit_event: auditEvent });
    tx.recordIdempotency({
      tenant_id: input.tenant_id,
      idempotency_key: input.idempotency_key,
      operation: "time_week_submit",
      actor_id: input.actor_id,
      object_type: "TimeEntryWeek",
      object_id: objectId,
      request,
      response,
    });
    return response;
  });
}

export function lockTimeWeek(input = {}) {
  requireCommandContext(input);
  const week = normalizeWeek(input);
  const graceMinutes = graceMinutesFor(input);
  const objectId = weekObjectId(week, input);
  const request = weekCommandRequest(input, week, { grace_minutes: graceMinutes });
  const replay = input.repository.getIdempotency({
    tenant_id: input.tenant_id,
    idempotency_key: input.idempotency_key,
    operation: "time_week_lock",
    actor_id: input.actor_id,
    object_type: "TimeEntryWeek",
    object_id: objectId,
    request,
  });
  if (replay) return replayResponse(replay.response);
  const entries = commandEntries(input, week);
  const lockedAt = resolveClock(input);
  return input.repository.transaction((tx) => {
    const updated = entries.map((entry) => {
      if (lockState(entry) === "locked") {
        const legacyLockedAt = entry.locked_at ?? lockedAt;
        const legacyGraceUntil = entry.lock_grace_until ?? entry.grace_expires_at ?? (() => {
          const date = new Date(legacyLockedAt);
          date.setUTCMinutes(date.getUTCMinutes() + graceMinutes);
          return date.toISOString();
        })();
        return tx.update(
          { tenant_id: input.tenant_id, model_type: "TimeEntry", time_entry_id: idOf(entry) },
          {
            status: "locked",
            submitted_at: entry.submitted_at ?? lockedAt,
            locked_at: legacyLockedAt,
            lock_grace_until: legacyGraceUntil,
            grace_expires_at: entry.grace_expires_at ?? legacyGraceUntil,
            approved_for_wip: entry.approved_for_wip === true || entry.status === "approved" || entry.status === "locked",
            updates_database_rows: true,
          },
        );
      }
      if (!isSubmitted(entry)) throw new Error("time entry must be submitted before lock");
      const graceUntil = new Date(lockedAt);
      graceUntil.setUTCMinutes(graceUntil.getUTCMinutes() + graceMinutes);
      return tx.update(
        { tenant_id: input.tenant_id, model_type: "TimeEntry", time_entry_id: idOf(entry) },
        {
          status: "locked",
          status_before_lock: entry.status,
          submitted_at: entry.submitted_at ?? lockedAt,
          locked_at: entry.locked_at ?? lockedAt,
          lock_grace_until: entry.lock_grace_until ?? graceUntil.toISOString(),
          grace_expires_at: entry.grace_expires_at ?? graceUntil.toISOString(),
          approved_for_wip: true,
          updates_database_rows: true,
        },
      );
    });
    const auditEvent = appendWeekAudit({
      repository: tx,
      tenant_id: input.tenant_id,
      actor_id: input.actor_id,
      action: "time.entry.week.lock",
      week,
      input,
      idempotency_key: input.idempotency_key,
      itemCount: updated.length,
      metadata: { grace_minutes: graceMinutes },
    });
    const response = operationResponse({
      outcome: "locked",
      items: updated,
      summary: { ...summarizeItems(updated), grace_minutes: graceMinutes, locked_at: lockedAt },
      audit_event: auditEvent,
      grace_minutes: graceMinutes,
      locked_at: lockedAt,
    });
    tx.recordIdempotency({
      tenant_id: input.tenant_id,
      idempotency_key: input.idempotency_key,
      operation: "time_week_lock",
      actor_id: input.actor_id,
      object_type: "TimeEntryWeek",
      object_id: objectId,
      request,
      response,
    });
    return response;
  });
}

export function unlockTimeWeekWithinGrace(input = {}) {
  requireCommandContext(input);
  const reason = input.reason ?? input.unlock_reason;
  requiredString({ reason }, "reason");
  const week = normalizeWeek(input);
  const graceMinutes = graceMinutesFor(input);
  const objectId = weekObjectId(week, input);
  const request = weekCommandRequest(input, week, { grace_minutes: graceMinutes, reason });
  const replay = input.repository.getIdempotency({
    tenant_id: input.tenant_id,
    idempotency_key: input.idempotency_key,
    operation: "time_week_unlock",
    actor_id: input.actor_id,
    object_type: "TimeEntryWeek",
    object_id: objectId,
    request,
  });
  if (replay) return replayResponse(replay.response);
  const entries = commandEntries(input, week);
  const unlockedAt = resolveClock(input);
  const unlockInstant = parseInstant(unlockedAt);
  for (const entry of entries) {
    if (findTimeEntryBillingConsumption({
      repository: input.repository,
      tenant_id: input.tenant_id,
      time_entry_id: idOf(entry),
    })) {
      const error = new Error("time entry consumed by WIP or later billing lineage cannot be unlocked");
      error.code = "TIME_ENTRY_BILLING_LINEAGE_CONFLICT";
      error.status = 409;
      error.status_code = 409;
      throw error;
    }
    if (lockState(entry) !== "locked") throw new Error("time entry is not locked");
    const expiry = graceExpiresAt(entry, graceMinutes);
    if (!expiry || unlockInstant > expiry) throw new Error("time entry lock grace expired");
  }
  return input.repository.transaction((tx) => {
    const updated = entries.map((entry) => {
      const history = Array.isArray(entry.lock_history) ? [...entry.lock_history] : [];
      history.push({ action: "unlock", actor_id: input.actor_id, reason, occurred_at: unlockedAt });
      return tx.update(
        { tenant_id: input.tenant_id, model_type: "TimeEntry", time_entry_id: idOf(entry) },
        {
          status: "submitted",
          status_before_unlock: entry.status,
          locked_at: null,
          lock_grace_until: null,
          grace_expires_at: null,
          unlocked_at: unlockedAt,
          unlock_reason: reason,
          lock_history: history,
          approved_for_wip: false,
          updates_database_rows: true,
        },
      );
    });
    const auditEvent = appendWeekAudit({
      repository: tx,
      tenant_id: input.tenant_id,
      actor_id: input.actor_id,
      action: "time.entry.week.unlock",
      week,
      input,
      idempotency_key: input.idempotency_key,
      itemCount: updated.length,
      metadata: { grace_minutes: graceMinutes, reason },
    });
    const response = operationResponse({
      outcome: "unlocked",
      items: updated,
      summary: { ...summarizeItems(updated), grace_minutes: graceMinutes, unlocked_at: unlockedAt },
      audit_event: auditEvent,
      grace_minutes: graceMinutes,
      unlocked_at: unlockedAt,
    });
    tx.recordIdempotency({
      tenant_id: input.tenant_id,
      idempotency_key: input.idempotency_key,
      operation: "time_week_unlock",
      actor_id: input.actor_id,
      object_type: "TimeEntryWeek",
      object_id: objectId,
      request,
      response,
    });
    return response;
  });
}

function directInvoiceLink(entry) {
  return Boolean(entry.invoice_id || entry.invoice_line_id || entry.invoiced_at || entry.billed_at || entry.billed === true);
}

function invoiceForWip({ entry, wipItems, snapshots, prebills, invoices, invoiceLines }) {
  const id = idOf(entry);
  const related = wipItems.filter((item) => item.source_model_type === "TimeEntry" && item.source_id === id);
  if (related.some((item) => item.invoice_id || item.invoiced_at || ["invoiced", "billed"].includes(item.status))) return true;
  const invoiceIds = new Set(invoiceLines.filter((line) => line.wip_item_id === id || line.source_id === id).map((line) => line.invoice_id).filter(Boolean));
  for (const wip of related) {
    if (wip.status === "void" || wip.status === "rejected") continue;
    for (const snapshot of snapshots) {
      if (snapshot.item_refs?.includes(wip.wip_item_id)) {
        const prebillIds = prebills.filter((prebill) => prebill.wip_snapshot_id === snapshot.wip_snapshot_id).map((prebill) => prebill.prebill_id);
        for (const invoice of invoices) {
          if (prebillIds.includes(invoice.prebill_id) && invoice.status !== "void") invoiceIds.add(invoice.invoice_id);
        }
      }
    }
  }
  return invoiceIds.size > 0;
}

/**
 * Read-only WIP source eligibility for the time domain. Billing owns WIP
 * pricing, money, and writes; this projection only identifies billable,
 * approved, locked, and not-yet-invoiced TimeEntry sources and reports the
 * weekly-lock error state without choosing a RateCard or FeeArrangement.
 */
export function listWipCandidateTimeEntries(input = {}) {
  requiredString(input, "tenant_id");
  const week = input.week_start
    || input.week_end
    || input.weekStart
    || input.weekEnd
    || input.week
    || input.now
    || input.clock
    ? normalizeWeek(input)
    : null;
  const records = input.repository.list({ tenant_id: input.tenant_id }) ?? [];
  const entries = records.filter((record) => record.model_type === "TimeEntry");
  const wipItems = records.filter((record) => record.model_type === "WipItem");
  const snapshots = records.filter((record) => record.model_type === "WipSnapshot");
  const prebills = records.filter((record) => record.model_type === "PreBill");
  const invoices = records.filter((record) => record.model_type === "Invoice");
  const invoiceLines = records.filter((record) => record.model_type === "InvoiceLine");
  const asOfDate = input.as_of_date ?? input.as_of ?? input.asOfDate ?? (week ? week.week_end : resolveClock(input).slice(0, 10));
  validDateOnly(asOfDate, "as_of_date");
  const candidates = [];
  for (const entry of entries) {
    if (input.matter_id && entry.matter_id !== input.matter_id) continue;
    if (input.matter_ids && !input.matter_ids.includes(entry.matter_id)) continue;
    if (week && (entry.work_date < week.week_start || entry.work_date > week.week_end)) continue;
    if (entry.billable !== true) continue;
    if (directInvoiceLink(entry)) continue;
    if (invoiceForWip({ entry, wipItems, snapshots, prebills, invoices, invoiceLines })) continue;
    if (!(entry.status === "approved" || entry.status === "locked" || entry.approved_for_wip === true)) continue;
    const errors = [];
    const entryLockState = lockState(entry);
    if (entryLockState === "open") errors.push("weekly_time_not_locked");
    const ageDays = Math.max(0, Math.floor((dateFromOnly(asOfDate).getTime() - dateFromOnly(entry.work_date).getTime()) / 86400000));
    const relatedWip = wipItems.find((item) => item.source_model_type === "TimeEntry" && item.source_id === idOf(entry));
    candidates.push(freeze({
      ...entry,
      item: entry,
      wip_candidate: errors.length === 0,
      locked: entryLockState !== "open",
      lock_state: entryLockState,
      uninvoiced: true,
      age_days: ageDays,
      wip_item_id: relatedWip?.wip_item_id ?? null,
      errors: freezeArray(errors),
      error_codes: freezeArray(errors),
      error_code: errors[0] ?? null,
    }));
  }
  const matterSummary = new Map();
  for (const item of candidates) {
    const current = matterSummary.get(item.matter_id) ?? { matter_id: item.matter_id, candidate_count: 0, entry_count: 0, total_minutes: 0, error_count: 0, max_age_days: 0 };
    current.entry_count += 1;
    current.total_minutes += durationOf(item);
    current.max_age_days = Math.max(current.max_age_days, item.age_days);
    if (item.wip_candidate) current.candidate_count += 1;
    if (item.errors.length > 0) current.error_count += 1;
    matterSummary.set(item.matter_id, current);
  }
  const summary = freeze({
    candidate_count: candidates.filter((item) => item.wip_candidate).length,
    item_count: candidates.length,
    error_count: candidates.filter((item) => item.errors.length > 0).length,
    total_minutes: candidates.reduce((sum, item) => sum + durationOf(item), 0),
    matters: freezeArray([...matterSummary.values()].sort((left, right) => String(left.matter_id).localeCompare(String(right.matter_id))).map((value) => freeze({ ...value }))),
    as_of_date: asOfDate,
    week_start: week?.week_start ?? null,
    week_end: week?.week_end ?? null,
  });
  return freeze({
    items: freezeArray(candidates),
    summary,
    as_of_date: asOfDate,
    replayed: false,
  });
}

export function createSmallFirmTimeService({ repository, ...defaults } = {}) {
  if (!repository) throw new TypeError("repository is required");
  const withDefaults = (input = {}) => ({ ...defaults, ...input, repository });
  return freeze({
    createQuickTimeEntry: (input) => createQuickTimeEntry(withDefaults(input)),
    createTimeEntry: (input) => createTimeEntry(withDefaults(input)),
    updateTimeEntry: (input) => updateTimeEntry(withDefaults(input)),
    listWeeklyTimeCompleteness: (input) => listWeeklyTimeCompleteness(withDefaults(input)),
    submitTimeWeek: (input) => submitTimeWeek(withDefaults(input)),
    lockTimeWeek: (input) => lockTimeWeek(withDefaults(input)),
    unlockTimeWeekWithinGrace: (input) => unlockTimeWeekWithinGrace(withDefaults(input)),
    listWipCandidateTimeEntries: (input) => listWipCandidateTimeEntries(withDefaults(input)),
  });
}
