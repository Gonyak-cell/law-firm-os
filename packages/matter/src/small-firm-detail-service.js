import { createHash } from "node:crypto";
import { assertMatterIsoTimestamp } from "./model.js";

const OPEN_TASK_STATUSES = new Set(["open", "todo", "in_progress", "blocked", "waiting", "pending"]);
const CLOSED_EVENT_STATUSES = new Set(["cancelled", "completed", "done", "archived"]);
const OWNER_ROLES = new Set(["owner", "responsible_attorney", "lead_attorney", "partner"]);
const BACKUP_ROLES = new Set(["backup", "backup_attorney", "case_backup"]);
const DEFAULT_TIMEZONE = "Asia/Seoul";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function optionalString(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function requiredRecord(value, field) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${field} is required`);
  }
  return value;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function freezeList(items) {
  return Object.freeze(items.map((item) => Object.freeze(item)));
}

function parseDate(value, field) {
  const iso = value instanceof Date
    ? assertMatterIsoTimestamp(value.toISOString(), field)
    : assertMatterIsoTimestamp(value, field);
  return new Date(iso);
}

function parseDateOrDateKey(value, field) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      throw new TypeError(`${field} must be YYYY-MM-DD or an ISO timestamp with timezone`);
    }
    return date;
  }
  return parseDate(value, field);
}

function resolveNow({ now, clock } = {}) {
  const value = typeof clock === "function" ? clock() : now;
  return value === undefined ? new Date() : parseDate(value, "now");
}

function localDateKey(value, timeZone = DEFAULT_TIMEZONE) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    parseDateOrDateKey(value, "date");
    return value;
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(parseDate(value, "date"));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function rowId(row, fallback = "") {
  return optionalString(
    row?.task_id
      ?? row?.event_id
      ?? row?.activity_id
      ?? row?.message_id
      ?? row?.note_id
      ?? row?.document_id
      ?? row?.entry_id
      ?? row?.wip_id
      ?? row?.invoice_id
      ?? row?.payment_id
      ?? row?.resource_id
      ?? row?.id
      ?? fallback,
  );
}

function inMatterScope(row, tenantId, matterId) {
  return Boolean(
    row
      && row.tenant_id === tenantId
      && row.matter_id === matterId,
  );
}

function requireDurableMutationRepository(repository, operation) {
  const methods = [
    "get",
    "list",
    "create",
    "update",
    "transaction",
    "getIdempotency",
    "recordIdempotency",
    "appendAudit",
  ];
  if (repository?.durable !== true) {
    throw new TypeError(`${operation} requires a durable repository`);
  }
  for (const method of methods) {
    if (typeof repository[method] !== "function") {
      throw new TypeError(`${operation} requires repository.${method}`);
    }
  }
  return repository;
}

function activeTask(task) {
  return OPEN_TASK_STATUSES.has(String(task?.status ?? "todo"));
}

function activeEvent(event) {
  return !CLOSED_EVENT_STATUSES.has(String(event?.status ?? "scheduled"));
}

function ownerIdForMatter(matter, members = []) {
  const direct = optionalString(
    matter?.owner_user_id
      ?? matter?.owner_id
      ?? matter?.responsible_user_id
      ?? matter?.assigned_to
      ?? matter?.responsible_lawyer,
  );
  if (direct) return direct;
  const member = members.find((candidate) =>
    candidate?.matter_id === matter?.matter_id
      && candidate?.status !== "removed"
      && OWNER_ROLES.has(String(candidate?.role ?? "")),
  );
  return optionalString(member?.user_id ?? member?.employee_id ?? member?.person_id);
}

function backupIdForMatter(matter, members = []) {
  const direct = optionalString(matter?.backup_user_id ?? matter?.backup_owner_id);
  if (direct) return direct;
  const member = members.find((candidate) =>
    candidate?.matter_id === matter?.matter_id
      && candidate?.status !== "removed"
      && BACKUP_ROLES.has(String(candidate?.role ?? "")),
  );
  return optionalString(member?.user_id ?? member?.employee_id ?? member?.person_id);
}

function personDto(userId, members = []) {
  if (!userId) return null;
  const member = members.find((candidate) =>
    [candidate?.user_id, candidate?.employee_id, candidate?.member_id, candidate?.person_id].includes(userId),
  );
  return Object.freeze({
    user_id: userId,
    display_name: optionalString(member?.display_name ?? member?.name) ?? userId,
  });
}

function dueAtOf(row) {
  return optionalString(row?.due_at ?? row?.starts_at ?? row?.start_at);
}

function timestampOf(row) {
  return optionalString(
    row?.occurred_at
      ?? row?.updated_at
      ?? row?.completed_at
      ?? row?.created_at
      ?? row?.starts_at
      ?? row?.due_at,
  );
}

function compareNullableIso(left, right, direction = 1) {
  if (!left && !right) return 0;
  if (!left) return 1;
  if (!right) return -1;
  const leftValue = left ? parseDateOrDateKey(left, "timestamp").getTime() : Number.POSITIVE_INFINITY;
  const rightValue = right ? parseDateOrDateKey(right, "timestamp").getTime() : Number.POSITIVE_INFINITY;
  return direction * (leftValue - rightValue);
}

function stableSerialize(value) {
  if (Array.isArray(value)) return `[${value.map(stableSerialize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableSerialize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function requestFingerprint(value) {
  return createHash("sha256").update(stableSerialize(value)).digest("hex");
}

function safeId(value) {
  return requiredString(value, "id").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 120);
}

function idempotencyReplay(repository, tenantId, idempotencyKey, fingerprint) {
  if (!repository?.getIdempotency) return null;
  const existing = repository.getIdempotency({
    tenant_id: tenantId,
    idempotency_key: idempotencyKey,
  });
  if (!existing) return null;
  if (existing.request_fingerprint !== fingerprint) {
    throw Object.assign(new Error("idempotency key was already used for another request"), {
      code: "LAWOS_IDEMPOTENCY_CONFLICT",
      safe_error_code: "IDEMPOTENCY_CONFLICT",
      status: 409,
    });
  }
  return Object.freeze({ ...clone(existing.response), idempotent_replay: true });
}

function scopedRows(rows, tenantId, matterId) {
  return asArray(rows).filter((row) => inMatterScope(row, tenantId, matterId));
}

function explicitGrantedScopes(viewer, grantedScopes) {
  const values = grantedScopes === undefined ? viewer?.scopes : grantedScopes;
  if (!Array.isArray(values)) return new Set();
  return new Set(values
    .filter((scope) => typeof scope === "string")
    .map((scope) => scope.trim())
    .filter(Boolean));
}

function visibleWithScopes(row, scopes) {
  const internalNote = [row?.entry_kind, row?.activity_type, row?.type]
    .some((value) => value === "internal_note" || value === "matter.followup.internal_note");
  if (internalNote && !scopes.has("matter:internal")) return false;
  if (row?.required_scope === undefined || row.required_scope === null || row.required_scope === "") {
    return true;
  }
  return typeof row.required_scope === "string" && scopes.has(row.required_scope);
}

export function selectMatterNextAction({
  tenant_id,
  matter_id,
  tasks = [],
  calendar_events = [],
  events,
  now,
  clock,
  timezone = DEFAULT_TIMEZONE,
} = {}) {
  const tenantId = requiredString(tenant_id, "tenant_id");
  const matterId = requiredString(matter_id, "matter_id");
  const current = resolveNow({ now, clock });
  const today = localDateKey(current, timezone);
  const taskRows = scopedRows(tasks, tenantId, matterId).filter(activeTask);
  const eventRows = scopedRows(events ?? calendar_events, tenantId, matterId).filter(activeEvent);
  const candidates = [];

  for (const task of taskRows) {
    const dueAt = dueAtOf(task);
    const dueDate = dueAt ? localDateKey(dueAt, timezone) : null;
    const priority = dueDate && dueDate < today ? 0 : dueDate === today ? 1 : dueDate ? 2 : 3;
    candidates.push({
      priority,
      action_type: "task",
      timing: priority === 0 ? "overdue" : priority === 1 ? "due_today" : priority === 2 ? "upcoming" : "unscheduled",
      source_id: requiredString(rowId(task), "task_id"),
      matter_id: matterId,
      title: requiredString(task.title, "task.title"),
      due_at: dueAt,
      assigned_to: optionalString(task.assigned_to ?? task.owner_user_id ?? task.owner_id ?? task.owner),
      source_ref: optionalString(task.source_ref),
    });
  }

  for (const event of eventRows) {
    const dueAt = dueAtOf(event);
    if (!dueAt || localDateKey(dueAt, timezone) !== today) continue;
    candidates.push({
      priority: 1,
      action_type: "deadline",
      timing: "due_today",
      source_id: requiredString(rowId(event), "event_id"),
      matter_id: matterId,
      title: requiredString(event.title, "event.title"),
      due_at: dueAt,
      assigned_to: optionalString(event.assigned_to ?? event.owner_user_id ?? event.owner_id ?? event.owner),
      source_ref: optionalString(event.source_ref),
    });
  }

  candidates.sort((left, right) =>
    left.priority - right.priority
      || compareNullableIso(left.due_at, right.due_at)
      || left.source_id.localeCompare(right.source_id),
  );
  if (candidates.length === 0) {
    return Object.freeze({
      action_type: "none",
      timing: "none",
      source_id: null,
      matter_id: matterId,
      title: "다음 행동 없음",
      due_at: null,
      assigned_to: null,
      source_ref: null,
    });
  }
  const [{ priority: _priority, ...selected }] = candidates;
  return Object.freeze(selected);
}

function absenceWindow(absence) {
  const startsAt = optionalString(absence?.starts_at ?? absence?.start_at ?? absence?.date);
  const endsAt = optionalString(absence?.ends_at ?? absence?.end_at ?? absence?.date ?? startsAt);
  if (!startsAt || !endsAt) return null;
  return { starts_at: startsAt, ends_at: endsAt };
}

function absenceUserId(absence) {
  return optionalString(absence?.user_id ?? absence?.employee_id ?? absence?.member_id ?? absence?.person_id);
}

export function buildMatterCoverage({
  matter,
  members = [],
  absences = [],
  calendar_events = [],
  events,
  now,
  clock,
  timezone = DEFAULT_TIMEZONE,
  horizon_days = 7,
} = {}) {
  const currentMatter = requiredRecord(matter, "matter");
  const tenantId = requiredString(currentMatter.tenant_id, "matter.tenant_id");
  const matterId = requiredString(currentMatter.matter_id, "matter.matter_id");
  const current = resolveNow({ now, clock });
  const today = localDateKey(current, timezone);
  const horizonDays = Number(horizon_days);
  if (!Number.isSafeInteger(horizonDays) || horizonDays < 0) {
    throw new TypeError("horizon_days must be a non-negative integer");
  }
  const horizon = new Date(current.getTime() + horizonDays * 86_400_000);
  const horizonDate = localDateKey(horizon, timezone);
  const memberRows = asArray(members).filter((member) =>
    member.tenant_id === tenantId
      && (!member.matter_id || member.matter_id === matterId),
  );
  const ownerId = ownerIdForMatter(currentMatter, memberRows);
  const backupId = backupIdForMatter(currentMatter, memberRows);
  const ownerAbsences = asArray(absences)
    .filter((absence) => absence?.tenant_id === tenantId)
    .filter((absence) => absenceUserId(absence) === ownerId)
    .map(absenceWindow)
    .filter(Boolean);
  const ownerAbsentToday = ownerAbsences.some((absence) => {
    const start = localDateKey(absence.starts_at, timezone);
    const end = localDateKey(absence.ends_at, timezone);
    return start <= today && end >= today;
  });
  const ownerAbsentWithinHorizon = ownerAbsences.some((absence) => {
    const start = localDateKey(absence.starts_at, timezone);
    const end = localDateKey(absence.ends_at, timezone);
    return start <= horizonDate && end >= today;
  });
  const upcomingDeadlines = scopedRows(events ?? calendar_events, tenantId, matterId)
    .filter(activeEvent)
    .map((event) => ({ event, due_at: dueAtOf(event) }))
    .filter(({ due_at: dueAt }) => {
      if (!dueAt) return false;
      const key = localDateKey(dueAt, timezone);
      return key >= today && key <= horizonDate;
    })
    .sort((left, right) =>
      compareNullableIso(left.due_at, right.due_at)
        || requiredString(rowId(left.event), "event_id").localeCompare(requiredString(rowId(right.event), "event_id")),
    );
  const upcoming = upcomingDeadlines[0] ?? null;
  const coverageState = !ownerId
    ? "unassigned"
    : ownerAbsentToday
      ? "owner_absent"
      : backupId
        ? "owner_and_backup"
        : "owner_only";

  return Object.freeze({
    tenant_id: tenantId,
    matter_id: matterId,
    coverage_state: coverageState,
    owner: personDto(ownerId, memberRows),
    backup: personDto(backupId, memberRows),
    owner_absent_today: ownerAbsentToday,
    owner_absent_within_7_days: ownerAbsentWithinHorizon,
    deadline_within_7_days: Boolean(upcoming),
    backup_attention: Boolean(ownerId && ownerAbsentWithinHorizon && upcoming),
    backup_required: Boolean(ownerId && ownerAbsentWithinHorizon && upcoming && !backupId),
    covered_by_backup: Boolean(ownerId && ownerAbsentWithinHorizon && upcoming && backupId),
    next_deadline: upcoming
      ? Object.freeze({
          event_id: rowId(upcoming.event),
          title: requiredString(upcoming.event.title, "event.title"),
          due_at: upcoming.due_at,
        })
      : null,
  });
}

function nextDeadline({ tenantId, matterId, calendarEvents, now }) {
  const currentTime = now.getTime();
  const rows = scopedRows(calendarEvents, tenantId, matterId)
    .filter(activeEvent)
    .map((event) => ({ event, due_at: dueAtOf(event) }))
    .filter(({ due_at: dueAt }) => dueAt && parseDate(dueAt, "event.due_at").getTime() >= currentTime)
    .sort((left, right) =>
      compareNullableIso(left.due_at, right.due_at)
        || requiredString(rowId(left.event), "event_id").localeCompare(requiredString(rowId(right.event), "event_id")),
    );
  if (!rows[0]) return null;
  return Object.freeze({
    event_id: rowId(rows[0].event),
    title: requiredString(rows[0].event.title, "event.title"),
    due_at: rows[0].due_at,
  });
}

export function buildMatterSummary({
  matter,
  tasks = [],
  calendar_events = [],
  events,
  members = [],
  absences = [],
  now,
  clock,
  timezone = DEFAULT_TIMEZONE,
} = {}) {
  const currentMatter = requiredRecord(matter, "matter");
  const tenantId = requiredString(currentMatter.tenant_id, "matter.tenant_id");
  const matterId = requiredString(currentMatter.matter_id, "matter.matter_id");
  const current = resolveNow({ now, clock });
  const calendarEvents = events ?? calendar_events;
  const coverage = buildMatterCoverage({
    matter: currentMatter,
    members,
    absences,
    calendar_events: calendarEvents,
    now: current,
    timezone,
  });
  return Object.freeze({
    tenant_id: tenantId,
    matter_id: matterId,
    matter_code: optionalString(currentMatter.matter_code ?? currentMatter.matter_number),
    title: requiredString(currentMatter.title ?? currentMatter.matter_name, "matter.title"),
    status: optionalString(currentMatter.status),
    owner_user_id: coverage.owner?.user_id ?? null,
    backup_user_id: coverage.backup?.user_id ?? null,
    owner: coverage.owner,
    backup: coverage.backup,
    next_deadline: nextDeadline({ tenantId, matterId, calendarEvents, now: current }),
    next_action: selectMatterNextAction({
      tenant_id: tenantId,
      matter_id: matterId,
      tasks,
      calendar_events: calendarEvents,
      now: current,
      timezone,
    }),
    coverage,
  });
}

function handoffTaskRows(tasks, tenantId, matterId, previousOwnerId, nextOwnerId) {
  return scopedRows(tasks, tenantId, matterId).map((task) => {
    const currentOwnerId = optionalString(task.assigned_to ?? task.owner_user_id ?? task.owner_id ?? task.owner);
    if (!activeTask(task) || currentOwnerId !== previousOwnerId) return Object.freeze(clone(task));
    return Object.freeze({
      ...clone(task),
      assigned_to: nextOwnerId,
      owner_user_id: nextOwnerId,
      owner_id: nextOwnerId,
    });
  });
}

function activeHandoffReference(record) {
  if (!record || record.active === false) return false;
  return record.status === "active" || (record.status == null && record.active === true);
}

function handoffReferenceIds(record) {
  return [
    record?.user_id,
    record?.employee_id,
    record?.person_id,
    record?.member_id,
  ].map(optionalString).filter(Boolean);
}

function assertActiveHandoffAssignees({
  repository,
  tenantId,
  matterId,
  ownerId,
  backupId,
}) {
  const references = [
    ...repository.list({ tenant_id: tenantId, model_type: "Person" }),
    ...repository.list({ tenant_id: tenantId, matter_id: matterId, model_type: "MatterMember" }),
  ].filter(activeHandoffReference);
  const resolves = (referenceId) => references.some((record) =>
    handoffReferenceIds(record).includes(referenceId));
  const invalidReferences = [
    ...(resolves(ownerId) ? [] : [{ role: "owner", reference_id: ownerId }]),
    ...(!backupId || resolves(backupId) ? [] : [{ role: "backup", reference_id: backupId }]),
  ];
  if (invalidReferences.length > 0) {
    throw Object.assign(
      new TypeError("new owner and backup must resolve to active Person or MatterMember records"),
      {
        safe_error_code: "MATTER_HANDOFF_ASSIGNEE_INVALID",
        status: 400,
        invalid_references: freezeList(invalidReferences),
      },
    );
  }
}

export function handoffMatter(options = {}) {
  const repository = requireDurableMutationRepository(options.repository, "handoffMatter");
  const tenantId = requiredString(options.tenant_id ?? options.matter?.tenant_id, "tenant_id");
  const matterId = requiredString(options.matter_id ?? options.matter?.matter_id, "matter_id");
  const currentMatter = repository.get({
    tenant_id: tenantId,
    model_type: "Matter",
    matter_id: matterId,
  });
  if (!currentMatter) throw new Error("Matter not found");
  if (
    currentMatter.tenant_id !== tenantId
    || currentMatter.matter_id !== matterId
    || (
      options.matter
      && (
        options.matter.tenant_id !== tenantId
        || options.matter.matter_id !== matterId
      )
    )
  ) {
    throw Object.assign(new Error("matter is outside the requested tenant or matter scope"), {
      safe_error_code: "MATTER_SCOPE_MISMATCH",
      status: 403,
    });
  }
  const actorId = requiredString(options.actor_id, "actor_id");
  const nextOwnerId = requiredString(
    options.new_owner_user_id ?? options.new_owner_id ?? options.owner_user_id,
    "new_owner_user_id",
  );
  const hasBackup = Object.hasOwn(options, "new_backup_user_id")
    || Object.hasOwn(options, "new_backup_id")
    || Object.hasOwn(options, "backup_user_id");
  const backupValue = Object.hasOwn(options, "new_backup_user_id")
    ? options.new_backup_user_id
    : Object.hasOwn(options, "new_backup_id")
      ? options.new_backup_id
      : options.backup_user_id;
  const nextBackupId = hasBackup
    ? optionalString(backupValue)
    : backupIdForMatter(currentMatter);
  const note = requiredString(options.note ?? options.memo, "note");
  if (note.length > 2_000) throw new TypeError("note must be at most 2000 characters");
  const idempotencyKey = requiredString(options.idempotency_key, "idempotency_key");
  const occurredAt = parseDate(options.occurred_at ?? new Date(), "occurred_at").toISOString();
  assertActiveHandoffAssignees({
    repository,
    tenantId,
    matterId,
    ownerId: nextOwnerId,
    backupId: nextBackupId,
  });
  const fingerprint = requestFingerprint({
    operation: "matter.handoff",
    matter_id: matterId,
    new_owner_user_id: nextOwnerId,
    new_backup_user_id: nextBackupId,
    note,
  });
  const replay = idempotencyReplay(repository, tenantId, idempotencyKey, fingerprint);
  if (replay) return replay;

  const sourceTasks = repository.list({
    tenant_id: tenantId,
    matter_id: matterId,
    model_type: "MatterTask",
  });
  const previousOwnerId = ownerIdForMatter(currentMatter);
  const projectedTasks = handoffTaskRows(sourceTasks, tenantId, matterId, previousOwnerId, nextOwnerId);
  const eventSuffix = safeId(`${matterId}_${fingerprint.slice(0, 16)}`);
  const auditEvent = Object.freeze({
    event_id: `matter_handoff_${eventSuffix}`,
    tenant_id: tenantId,
    actor_id: actorId,
    action: "matter.handoff",
    object_type: "Matter",
    object_id: matterId,
    decision: "allow",
    reason: "matter_owner_handoff",
    occurred_at: occurredAt,
    metadata: Object.freeze({
      previous_owner_user_id: previousOwnerId,
      new_owner_user_id: nextOwnerId,
      new_backup_user_id: nextBackupId,
      incomplete_task_ids: Object.freeze(projectedTasks.filter(activeTask).map((task) => rowId(task))),
      note,
    }),
  });
  const timelineEvent = Object.freeze({
    model_type: "MatterTimelineEvent",
    resource_id: `timeline_${eventSuffix}`,
    event_id: `timeline_${eventSuffix}`,
    tenant_id: tenantId,
    matter_id: matterId,
    occurred_at: occurredAt,
    type: "matter.handoff",
    title: "사건 인수인계",
    source_module: "matter",
    source_object_id: auditEvent.event_id,
    source_ref: auditEvent.event_id,
    safe_summary: Object.freeze({
      previous_owner_user_id: previousOwnerId,
      new_owner_user_id: nextOwnerId,
      new_backup_user_id: nextBackupId,
      incomplete_task_count: projectedTasks.filter(activeTask).length,
    }),
    raw_body_included: false,
  });

  const execute = (store) => {
    const updatedMatter = store.update(
      { tenant_id: tenantId, model_type: "Matter", matter_id: matterId },
      {
        owner_user_id: nextOwnerId,
        owner_id: nextOwnerId,
        responsible_lawyer: nextOwnerId,
        backup_user_id: nextBackupId,
        updated_at: occurredAt,
      },
    );
    const updatedTasks = projectedTasks.map((task) => {
      const original = sourceTasks.find((candidate) => rowId(candidate) === rowId(task));
      if (
        original
        && task.assigned_to !== optionalString(
          original.assigned_to ?? original.owner_user_id ?? original.owner_id ?? original.owner,
        )
      ) {
        return store.update(
          { tenant_id: tenantId, model_type: "MatterTask", task_id: rowId(task) },
          {
            assigned_to: task.assigned_to,
            owner_user_id: task.assigned_to,
            owner_id: task.assigned_to,
            updated_at: occurredAt,
          },
        );
      }
      return task;
    });
    const persistedAudit = store.appendAudit(auditEvent);
    const persistedTimeline = store.create(timelineEvent);
    const response = Object.freeze({
      matter: updatedMatter,
      tasks: freezeList(updatedTasks.map(clone)),
      incomplete_items: freezeList(updatedTasks.filter(activeTask).map(clone)),
      audit_event: persistedAudit,
      timeline_event: persistedTimeline,
      idempotent_replay: false,
    });
    store.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "matter.handoff",
      object_type: "Matter",
      object_id: matterId,
      actor_id: actorId,
      request_fingerprint: fingerprint,
      response,
      created_at: occurredAt,
    });
    return response;
  };

  return repository.transaction((transaction) => execute(transaction));
}

function normalizeTimelineItem(row, sourceType) {
  const sourceId = requiredString(rowId(row), `${sourceType}_id`);
  const type = sourceType === "activity"
    ? String(row.activity_type ?? row.type ?? "activity")
    : sourceType === "timeline"
      ? String(row.type ?? "activity")
      : sourceType;
  return {
    timeline_id: `${sourceType}:${sourceId}`,
    source_type: sourceType,
    source_id: sourceId,
    canonical_source_id: optionalString(row.source_object_id) ?? sourceId,
    tenant_id: row.tenant_id ?? null,
    matter_id: row.matter_id,
    type,
    title: requiredString(row.title ?? row.subject ?? type, `${sourceType}.title`),
    occurred_at: timestampOf(row),
    status: optionalString(row.status),
    source_ref: optionalString(row.source_ref),
    attendees: Object.freeze([...asArray(row.attendee_ids ?? row.attendees)]),
    decisions: Object.freeze([...asArray(row.decisions)]),
    follow_up_task_ids: Object.freeze([...asArray(row.follow_up_task_ids)]),
    ...(row.safe_summary && typeof row.safe_summary === "object" && !Array.isArray(row.safe_summary)
      ? { safe_summary: Object.freeze(clone(row.safe_summary)) }
      : {}),
  };
}

export function buildMatterTimeline({
  tenant_id,
  matter_id,
  entries = [],
  tasks = [],
  calendar_events = [],
  events,
  activities = [],
  notes = [],
  messages = [],
  timeline_events = [],
  viewer,
  granted_scopes,
  type,
  types,
} = {}) {
  const tenantId = requiredString(tenant_id, "tenant_id");
  const matterId = requiredString(matter_id, "matter_id");
  const grantedScopes = explicitGrantedScopes(viewer, granted_scopes);
  const sources = [
    ["task", tasks],
    ["event", events ?? calendar_events],
    ["activity", activities],
    ["note", notes],
    ["message", messages],
    ["timeline", [...asArray(entries), ...asArray(timeline_events)]],
  ];
  const deduplicated = new Map();
  for (const [sourceType, rows] of sources) {
    for (const row of scopedRows(rows, tenantId, matterId).filter((candidate) =>
      visibleWithScopes(candidate, grantedScopes))) {
      const item = normalizeTimelineItem(row, sourceType);
      const key = `${item.type}:${item.canonical_source_id}`;
      const current = deduplicated.get(key);
      if (!current) {
        deduplicated.set(key, item);
        continue;
      }
      const currentTime = current.occurred_at ? parseDate(current.occurred_at, "occurred_at").getTime() : 0;
      const itemTime = item.occurred_at ? parseDate(item.occurred_at, "occurred_at").getTime() : 0;
      if (itemTime > currentTime) {
        deduplicated.set(key, {
          ...current,
          occurred_at: item.occurred_at,
          status: item.status ?? current.status,
          source_ref: item.source_ref ?? current.source_ref,
        });
      }
    }
  }
  const requested = types ?? type;
  const requestedTypes = new Set(
    (requested === undefined ? [] : Array.isArray(requested) ? requested : [requested]).map(String),
  );
  const items = [...deduplicated.values()]
    .filter((item) =>
      requestedTypes.size === 0
        || requestedTypes.has(item.type)
        || requestedTypes.has(item.source_type),
    )
    .sort((left, right) =>
      compareNullableIso(left.occurred_at, right.occurred_at, -1)
        || left.type.localeCompare(right.type)
        || left.source_id.localeCompare(right.source_id),
    )
    .map(({ canonical_source_id: _canonicalSourceId, ...item }) => Object.freeze(item));
  return Object.freeze({
    tenant_id: tenantId,
    matter_id: matterId,
    items: Object.freeze(items),
    count: items.length,
  });
}

function detailItem(row, sourceType) {
  return Object.freeze({
    ...clone(row),
    source_type: sourceType,
    source_id: rowId(row),
  });
}

export function buildMatterDetail({
  matter,
  tasks = [],
  calendar_events = [],
  events,
  activities = [],
  notes = [],
  messages = [],
  timeline_events = [],
  documents = [],
  time_entries = [],
  wip = [],
  invoices = [],
  payments = [],
  members = [],
  absences = [],
  viewer,
  granted_scopes,
  now,
  clock,
  timezone = DEFAULT_TIMEZONE,
} = {}) {
  const currentMatter = requiredRecord(matter, "matter");
  const tenantId = requiredString(currentMatter.tenant_id, "matter.tenant_id");
  const matterId = requiredString(currentMatter.matter_id, "matter.matter_id");
  const grantedScopes = explicitGrantedScopes(viewer, granted_scopes);
  const visibleRows = (rows) => asArray(rows).filter((row) => visibleWithScopes(row, grantedScopes));
  const taskRows = visibleRows(tasks);
  const calendarEvents = visibleRows(events ?? calendar_events);
  const memberRows = visibleRows(members);
  const absenceRows = visibleRows(absences);
  const summary = buildMatterSummary({
    matter: currentMatter,
    tasks: taskRows,
    calendar_events: calendarEvents,
    members: memberRows,
    absences: absenceRows,
    now,
    clock,
    timezone,
  });
  const workItems = [
    ...scopedRows(taskRows, tenantId, matterId).map((row) => detailItem(row, "task")),
    ...scopedRows(calendarEvents, tenantId, matterId).map((row) => detailItem(row, "deadline")),
  ].sort((left, right) =>
    compareNullableIso(dueAtOf(left), dueAtOf(right))
      || String(left.source_id).localeCompare(String(right.source_id)),
  );
  const contactTimeline = buildMatterTimeline({
    tenant_id: tenantId,
    matter_id: matterId,
    activities,
    notes,
    messages,
    timeline_events,
    granted_scopes: [...grantedScopes],
  });
  const documentItems = scopedRows(visibleRows(documents), tenantId, matterId)
    .map((document) => Object.freeze({
      ...clone(document),
      source_type: "document",
      source_id: rowId(document),
      deep_link: optionalString(document.deep_link)
        ?? `/vault?matter_id=${encodeURIComponent(matterId)}&document_id=${encodeURIComponent(requiredString(rowId(document), "document_id"))}`,
    }));
  const billingItems = [
    ...scopedRows(visibleRows(time_entries), tenantId, matterId).map((row) => detailItem(row, "time_entry")),
    ...scopedRows(visibleRows(wip), tenantId, matterId).map((row) => detailItem(row, "wip")),
    ...scopedRows(visibleRows(invoices), tenantId, matterId).map((row) => detailItem(row, "invoice")),
    ...scopedRows(visibleRows(payments), tenantId, matterId).map((row) => detailItem(row, "payment")),
  ];
  const tabData = Object.freeze({
    overview: Object.freeze([summary]),
    work_deadlines: Object.freeze(workItems),
    contact_history: contactTimeline.items,
    documents: Object.freeze(documentItems),
    time_billing: Object.freeze(billingItems),
  });
  const tabs = freezeList([
    { id: "overview", label: "개요", count: tabData.overview.length },
    { id: "work_deadlines", label: "업무·기한", count: tabData.work_deadlines.length },
    { id: "contact_history", label: "연락·기록", count: tabData.contact_history.length },
    { id: "documents", label: "문서", count: tabData.documents.length },
    { id: "time_billing", label: "시간·청구", count: tabData.time_billing.length },
  ]);
  return Object.freeze({
    tenant_id: tenantId,
    matter_id: matterId,
    summary,
    tabs,
    tab_data: tabData,
  });
}

export function recordMatterMeeting(options = {}) {
  const repository = requireDurableMutationRepository(options.repository, "recordMatterMeeting");
  const meetingInput = options.meeting ?? options;
  const tenantId = requiredString(options.tenant_id ?? meetingInput.tenant_id, "tenant_id");
  const matterId = requiredString(options.matter_id ?? meetingInput.matter_id, "matter_id");
  const currentMatter = repository.get({
    tenant_id: tenantId,
    model_type: "Matter",
    matter_id: matterId,
  });
  if (!currentMatter) throw new Error("Matter not found");
  if (
    currentMatter.tenant_id !== tenantId
    || currentMatter.matter_id !== matterId
    || (Object.hasOwn(meetingInput, "tenant_id") && meetingInput.tenant_id !== tenantId)
    || (Object.hasOwn(meetingInput, "matter_id") && meetingInput.matter_id !== matterId)
  ) {
    throw Object.assign(new Error("meeting is outside the requested tenant or matter scope"), {
      safe_error_code: "MATTER_SCOPE_MISMATCH",
      status: 403,
    });
  }
  const actorId = requiredString(options.actor_id ?? meetingInput.created_by, "actor_id");
  const idempotencyKey = requiredString(
    options.idempotency_key ?? meetingInput.idempotency_key,
    "idempotency_key",
  );
  const meetingId = optionalString(meetingInput.meeting_id ?? meetingInput.activity_id)
    ?? `meeting_${safeId(`${matterId}_${idempotencyKey}`)}`;
  const title = requiredString(meetingInput.title, "meeting.title");
  const attendeeIds = [...new Set(asArray(meetingInput.attendee_ids ?? meetingInput.attendees).map((value) =>
    requiredString(
      typeof value === "object" ? value.user_id ?? value.person_id ?? value.id : value,
      "meeting.attendee_id",
    ),
  ))];
  if (attendeeIds.length === 0) throw new TypeError("meeting.attendee_ids must not be empty");
  const decisions = asArray(meetingInput.decisions).map((value) => requiredString(value, "meeting.decision"));
  const followUpTaskIds = [...new Set(asArray(meetingInput.follow_up_task_ids).map((value) =>
    requiredString(value, "meeting.follow_up_task_id"),
  ))];
  const occurredAt = parseDate(
    meetingInput.occurred_at ?? options.occurred_at ?? new Date(),
    "meeting.occurred_at",
  ).toISOString();
  if (decisions.length === 0) {
    throw Object.assign(new TypeError("meeting.decisions must not be empty"), {
      safe_error_code: "MEETING_DECISIONS_REQUIRED",
      status: 400,
    });
  }
  const taskRows = repository.list({
    tenant_id: tenantId,
    matter_id: matterId,
    model_type: "MatterTask",
  });
  const validTaskIds = new Set(scopedRows(taskRows, tenantId, matterId).map(rowId));
  const unresolvedTaskIds = followUpTaskIds.filter((taskId) => !validTaskIds.has(taskId));
  if (unresolvedTaskIds.length > 0) {
    throw Object.assign(new Error("follow-up tasks must resolve to MatterTask records in the same matter"), {
      safe_error_code: "MEETING_FOLLOW_UP_TASK_SCOPE_MISMATCH",
      unresolved_task_ids: Object.freeze(unresolvedTaskIds),
    });
  }
  const fingerprint = requestFingerprint({
    operation: "matter.meeting.record",
    meeting_id: meetingId,
    matter_id: matterId,
    title,
    attendee_ids: attendeeIds,
    decisions,
    follow_up_task_ids: followUpTaskIds,
    occurred_at: occurredAt,
  });
  const replay = idempotencyReplay(repository, tenantId, idempotencyKey, fingerprint);
  if (replay) return replay;

  const safeMeetingId = safeId(`${meetingId}_${fingerprint.slice(0, 16)}`);
  const meeting = Object.freeze({
    model_type: "MatterActivity",
    resource_id: meetingId,
    activity_id: meetingId,
    tenant_id: tenantId,
    matter_id: matterId,
    activity_type: "meeting",
    title,
    status: "done",
    occurred_at: occurredAt,
    created_at: occurredAt,
    created_by: actorId,
    attendee_ids: Object.freeze(attendeeIds),
    decisions: Object.freeze(decisions),
    follow_up_task_ids: Object.freeze(followUpTaskIds),
    capture_mode: "manual_metadata",
    provider_collection_used: false,
    raw_provider_payload_included: false,
  });
  const auditEvent = Object.freeze({
    event_id: `matter_meeting_recorded_${safeMeetingId}`,
    tenant_id: tenantId,
    actor_id: actorId,
    action: "matter.meeting.record",
    object_type: "MatterActivity",
    object_id: meetingId,
    decision: "allow",
    reason: "manual_meeting_recorded",
    occurred_at: occurredAt,
    metadata: Object.freeze({
      attendee_count: attendeeIds.length,
      decision_count: decisions.length,
      follow_up_task_ids: Object.freeze(followUpTaskIds),
      provider_collection_used: false,
    }),
  });
  const timelineEvent = Object.freeze({
    model_type: "MatterTimelineEvent",
    resource_id: `timeline_meeting_${safeMeetingId}`,
    event_id: `timeline_meeting_${safeMeetingId}`,
    tenant_id: tenantId,
    matter_id: matterId,
    occurred_at: occurredAt,
    type: "meeting",
    title,
    source_module: "matter",
    source_object_id: meetingId,
    source_ref: meetingId,
    safe_summary: Object.freeze({
      attendee_count: attendeeIds.length,
      decision_count: decisions.length,
      follow_up_task_ids: Object.freeze(followUpTaskIds),
    }),
    raw_body_included: false,
    raw_provider_payload_included: false,
  });

  const execute = (store) => {
    const persistedMeeting = store.create(meeting);
    const persistedTimeline = store.create(timelineEvent);
    const persistedAudit = store.appendAudit(auditEvent);
    const response = Object.freeze({
      meeting: persistedMeeting,
      timeline_event: persistedTimeline,
      audit_event: persistedAudit,
      idempotent_replay: false,
    });
    store.recordIdempotency({
      tenant_id: tenantId,
      idempotency_key: idempotencyKey,
      operation: "matter.meeting.record",
      object_type: "MatterActivity",
      object_id: meetingId,
      actor_id: actorId,
      request_fingerprint: fingerprint,
      response,
      created_at: occurredAt,
    });
    return response;
  };

  return repository.transaction((transaction) => execute(transaction));
}
