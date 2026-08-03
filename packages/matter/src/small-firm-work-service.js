import { createHash } from "node:crypto";
import { changeMatterDeadline } from "./calendar-service.js";
import {
  assertMatterIsoTimestamp,
  createMatterCalendarEvent,
  createMatterTask,
} from "./model.js";
import {
  archiveMatterTask,
  assertMatterTaskTransitionReason,
  MATTER_TASK_TRANSITIONS,
  transitionMatterTask,
} from "./task-service.js";
import { executeWorktreeMutation } from "./worktree-mutation.js";

export const MATTER_TASK_SAVED_VIEWS = Object.freeze([
  "my_work",
  "overdue",
  "waiting",
  "unassigned",
]);

// Saved-view priority is exception-first: overdue > waiting > unassigned > my_work.
// A task is assigned to the first matching lane so one task cannot appear in two
// priority views; my_work remains scoped to the requested actor as the fallback.
const TASK_SAVED_VIEW_PRIORITY = Object.freeze([
  "overdue",
  "waiting",
  "unassigned",
  "my_work",
]);

const TASK_STATUS_ORDER = Object.freeze(["todo", "in_progress", "blocked", "done", "cancelled"]);
const SOURCE_ORDER = Object.freeze({ task: 0, activity: 1, calendar: 2 });
const DUE_ORDER = Object.freeze({ overdue: 0, due_today: 1, upcoming: 2, undated: 3 });
const PRIORITY_ORDER = Object.freeze({ urgent: 0, high: 1, normal: 2, low: 3 });
const DEFAULT_TIME_ZONE = "Asia/Seoul";
const NORMAL_TASK_TRANSITION_REASONS = Object.freeze({
  in_progress: "matter_task_started",
  done: "matter_task_completed",
  cancelled: "matter_task_cancelled",
});

function requiredString(value, field) {
  const text = String(value ?? "").trim();
  if (!text) throw new TypeError(`${field} is required`);
  return text;
}

function optionalString(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function timestamp(value, field) {
  const normalized = value instanceof Date ? value.toISOString() : value;
  return assertMatterIsoTimestamp(normalized, field);
}

function assertTimeZone(timeZone) {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(0));
  } catch {
    throw new TypeError("time_zone is invalid");
  }
  return timeZone;
}

function localDateKey(value, timeZone) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return assertDateKey(value, "date");
  const date = new Date(assertMatterIsoTimestamp(value, "timestamp"));
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date).map(({ type, value: part }) => [type, part]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function assertDateKey(value, field) {
  const text = requiredString(value, field);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new TypeError(`${field} must be YYYY-MM-DD`);
  const parsed = new Date(`${text}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throw new TypeError(`${field} must be YYYY-MM-DD`);
  }
  return text;
}

function addDays(dateKey, count) {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

function mondayFor(dateKey) {
  const day = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  return addDays(dateKey, day === 0 ? -6 : 1 - day);
}

function stableId(prefix, tenantId, idempotencyKey) {
  const digest = createHash("sha256").update(`${tenantId}:${idempotencyKey}`).digest("hex").slice(0, 24);
  return `${prefix}_${digest}`;
}

function sourceType(record) {
  if (record.model_type === "MatterTask") return "task";
  if (record.model_type === "MatterCalendarEvent") return "calendar";
  return "activity";
}

function recordId(record) {
  if (record.model_type === "MatterTask") return record.task_id ?? record.resource_id ?? record.id;
  if (record.model_type === "MatterCalendarEvent") return record.event_id ?? record.resource_id ?? record.id;
  if (record.model_type === "MatterActivity") return record.activity_id ?? record.resource_id ?? record.id;
  return record.resource_id ?? record.id;
}

function explicitTaskLink(record) {
  if (record.model_type === "MatterTask") return optionalString(recordId(record));
  const ledgerTaskId = record.ledger_ref?.model_type === "MatterTask"
    ? record.ledger_ref.id ?? record.ledger_ref.task_id ?? record.ledger_ref.resource_id
    : null;
  return optionalString(
    record.source_task_id
    ?? record.task_id
    ?? record.linked_task_id
    ?? ledgerTaskId,
  );
}

function dueAt(record) {
  return record.due_at ?? record.starts_at ?? null;
}

function matterSummary(matter, matterId) {
  return Object.freeze({
    id: matterId,
    code: matter?.matter_code ?? matter?.matter_number ?? null,
    title: matter?.matter_name ?? matter?.title ?? null,
  });
}

export function toMatterOperationalRow(record, { matter } = {}) {
  if (!record || typeof record !== "object") throw new TypeError("record is required");
  const normalized = record.model_type === "MatterTask" ? createMatterTask(record) : record;
  const id = requiredString(recordId(normalized), "id");
  const matterId = requiredString(normalized.matter_id, "matter_id");
  const due = dueAt(normalized);
  if (due) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(due)) assertDateKey(due, "due_at");
    else assertMatterIsoTimestamp(due, "due_at");
  }
  const source = sourceType(normalized);
  const owner = normalized.assigned_to ?? normalized.owner_user_id ?? normalized.responsible_user_id ?? null;
  return Object.freeze({
    id,
    matter_id: matterId,
    matter: matterSummary(matter, matterId),
    title: requiredString(normalized.title, "title"),
    owner_user_id: owner,
    backup_user_id: normalized.backup_user_id ?? null,
    status: normalized.status ?? "todo",
    due_at: due,
    source,
    source_ref: normalized.source_ref ?? null,
    ledger_ref: Object.freeze({ model_type: normalized.model_type, id }),
    priority: normalized.priority ?? "normal",
    wait_state: normalized.wait_state ?? null,
    blocked_reason: normalized.blocked_reason ?? null,
    completed_at: normalized.completed_at ?? null,
    archived_at: normalized.archived_at ?? null,
  });
}

function operationalProjection(record, options) {
  return Object.freeze({
    row: toMatterOperationalRow(record, options),
    canonical_task_id: explicitTaskLink(record),
  });
}

function appendTimeline(repository, input) {
  return repository.create({
    model_type: "MatterTimelineEvent",
    resource_id: input.event_id,
    event_id: input.event_id,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    occurred_at: input.occurred_at,
    type: input.type,
    title: input.title,
    source_ref: input.source_ref,
    source_module: "matter",
    source_object_id: input.source_object_id,
    safe_summary: Object.freeze(input.safe_summary ?? {}),
    raw_body_included: false,
    raw_provider_payload_included: false,
  });
}

function matterFor(repository, tenantId, matterId) {
  return repository.get({ tenant_id: tenantId, model_type: "Matter", matter_id: matterId });
}

function requireMatter(repository, tenantId, matterId) {
  const matter = matterFor(repository, tenantId, matterId);
  if (!matter) throw new Error("Matter not found");
  return matter;
}

function activeWorkReference(record) {
  if (!record || record.active === false) return false;
  return record.status === "active" || (record.status == null && record.active === true);
}

function workReferenceIds(record) {
  return [
    record?.user_id,
    record?.employee_id,
    record?.person_id,
    record?.member_id,
    record?.resource_id,
  ].map(optionalString).filter(Boolean);
}

function activeWorkReferenceIds(repository, tenantId, matterId) {
  return new Set([
    ...repository.list({ tenant_id: tenantId, model_type: "Person" }),
    ...repository.list({ tenant_id: tenantId, matter_id: matterId, model_type: "MatterMember" }),
  ].filter(activeWorkReference).flatMap(workReferenceIds));
}

function assertActiveWorkReference(references, referenceId, field) {
  if (referenceId && !references.has(referenceId)) {
    throw new TypeError(
      `${field} must reference an active tenant Person or same-Matter MatterMember`,
    );
  }
}

function deduplicateRows(projections) {
  const canonicalTasks = new Set(projections
    .filter(({ row }) => row.source === "task")
    .map(({ row }) => `${row.matter_id}:${row.id}`));
  const byIdentity = new Map();
  for (const projection of projections) {
    const { row, canonical_task_id: canonicalTaskId } = projection;
    const taskIdentity = canonicalTaskId ? `${row.matter_id}:${canonicalTaskId}` : null;
    const identity = taskIdentity && canonicalTasks.has(taskIdentity)
      ? `task:${taskIdentity}`
      : `${row.source}:${row.matter_id}:${row.id}`;
    const current = byIdentity.get(identity);
    if (!current || SOURCE_ORDER[row.source] < SOURCE_ORDER[current.source]) {
      byIdentity.set(identity, row);
    }
  }
  return [...byIdentity.values()];
}

function localDateStartTime(dateKey, timeZone) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const target = Date.UTC(year, month - 1, day);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(instant)).map(({ type, value }) => [type, value]),
    );
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const correction = target - represented;
    if (correction === 0) break;
    instant += correction;
  }
  return instant;
}

function dueTime(row, timeZone) {
  if (!row.due_at) return Number.POSITIVE_INFINITY;
  return /^\d{4}-\d{2}-\d{2}$/.test(row.due_at)
    ? localDateStartTime(row.due_at, timeZone)
    : Date.parse(row.due_at);
}

function compareDueTime(left, right, timeZone) {
  const leftTime = dueTime(left, timeZone);
  const rightTime = dueTime(right, timeZone);
  return leftTime === rightTime ? 0 : leftTime - rightTime;
}

function compareText(left, right) {
  return left === right ? 0 : left < right ? -1 : 1;
}

function sortRows(rows, timeZone = DEFAULT_TIME_ZONE) {
  return rows.sort((left, right) =>
    compareDueTime(left, right, timeZone)
    || compareText(left.id, right.id)
    || SOURCE_ORDER[left.source] - SOURCE_ORDER[right.source]);
}

function activeTask(task) {
  return !task.archived_at && task.status !== "done" && task.status !== "cancelled";
}

function dueBucket(row, today) {
  if (!row.due_at) return "undated";
  const dueDate = row.local_due_date;
  if (dueDate < today) return "overdue";
  return dueDate === today ? "due_today" : "upcoming";
}

function queueSort(left, right, timeZone) {
  return DUE_ORDER[left.due_bucket] - DUE_ORDER[right.due_bucket]
    || compareDueTime(left, right, timeZone)
    || PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority]
    || compareText(left.id, right.id);
}

function isWaiting(row) {
  return Boolean(row.wait_state && !["none", "not_waiting"].includes(row.wait_state));
}

function savedViewLane(row, actorId) {
  for (const lane of TASK_SAVED_VIEW_PRIORITY) {
    if (lane === "overdue" && row.due_bucket === "overdue") return lane;
    if (lane === "waiting" && isWaiting(row)) return lane;
    if (lane === "unassigned" && !row.owner_user_id) return lane;
    if (lane === "my_work" && row.owner_user_id === actorId) return lane;
  }
  return null;
}

function savedViewMatch(row, savedView, actorId) {
  if (!savedView) return true;
  return savedViewLane(row, actorId) === savedView;
}

function mutationCommand({
  tenantId,
  idempotencyKey,
  operation,
  actorId,
  reason,
  sourceRef,
  objectType,
  objectId,
  request,
  occurredAt,
  requestId,
}) {
  return {
    tenant_id: tenantId,
    idempotency_key: requiredString(idempotencyKey, "idempotency_key"),
    operation,
    actor_id: requiredString(actorId, "actor_id"),
    reason: requiredString(reason, "reason"),
    source_ref: requiredString(sourceRef, "source_ref"),
    object_type: objectType,
    object_id: objectId,
    request_fingerprint: request,
    occurred_at: occurredAt,
    request_id: requiredString(requestId, "request_id"),
  };
}

function deadlineHistoryRow(record) {
  return Object.freeze({
    history_id: record.history_id,
    event_id: record.event_id,
    matter_id: record.matter_id,
    change_type: record.change_type,
    previous_starts_at: record.previous_starts_at ?? null,
    new_starts_at: record.new_starts_at,
    previous_ends_at: record.previous_ends_at ?? null,
    new_ends_at: record.new_ends_at ?? null,
    reason: record.reason,
    changed_by: record.changed_by,
    occurred_at: record.occurred_at,
  });
}

export function createSmallFirmMatterWorkService({ repository, clock = () => new Date().toISOString() } = {}) {
  if (!repository) throw new TypeError("repository is required");
  if (typeof clock !== "function") throw new TypeError("clock is required");

  function now(value) {
    return timestamp(value ?? clock(), "occurred_at");
  }

  function listOperationalRows({ tenant_id, matter_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const matterId = optionalString(matter_id);
    const rows = ["MatterTask", "MatterActivity", "MatterCalendarEvent"].flatMap((modelType) =>
      repository
        .list({ tenant_id: tenantId, model_type: modelType, ...(matterId ? { matter_id: matterId } : {}) })
        .filter((record) => record.hidden_from_actor !== true && record.silent !== true)
        .map((record) => operationalProjection(record, {
          matter: matterFor(repository, tenantId, record.matter_id),
        })));
    const items = Object.freeze(sortRows(deduplicateRows(rows)));
    return Object.freeze({ items, count: items.length });
  }

  function quickCreateTask({
    tenant_id,
    idempotency_key,
    actor_id,
    task,
    occurred_at,
    request_id,
    source_ref,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const idempotencyKey = requiredString(idempotency_key, "idempotency_key");
    const actorId = requiredString(actor_id, "actor_id");
    const timestampNow = now(occurred_at);
    const taskId = optionalString(task?.task_id) ?? stableId("task", tenantId, idempotencyKey);
    const matterId = requiredString(task?.matter_id, "matter_id");
    const title = requiredString(task?.title, "title");
    const sourceRef = optionalString(source_ref) ?? "matter_quick_create";
    const requestId = optionalString(request_id) ?? `request:${idempotencyKey}`;
    const input = {
      task_id: taskId,
      tenant_id: tenantId,
      matter_id: matterId,
      title,
      status: "todo",
      created_by: actorId,
      assigned_to: optionalString(task?.assigned_to ?? task?.owner_user_id),
      backup_user_id: optionalString(task?.backup_user_id),
      priority: task?.priority ?? "normal",
      wait_state: task?.wait_state ?? null,
      blocked_reason: null,
      due_at: task?.due_at ?? null,
      completed_at: null,
      archived_at: null,
      created_at: timestampNow,
      updated_at: timestampNow,
      source_ref: sourceRef,
    };
    requireMatter(repository, tenantId, matterId);
    const activeReferences = activeWorkReferenceIds(repository, tenantId, matterId);
    assertActiveWorkReference(activeReferences, input.assigned_to, "assigned_to");
    assertActiveWorkReference(activeReferences, input.backup_user_id, "backup_user_id");
    const command = mutationCommand({
      tenantId,
      idempotencyKey,
      operation: "matter.task.quick_create",
      actorId,
      reason: "matter_task_quick_created",
      sourceRef,
      objectType: "MatterTask",
      objectId: taskId,
      request: {
        task_id: taskId,
        matter_id: matterId,
        title,
        assigned_to: input.assigned_to,
        backup_user_id: input.backup_user_id,
        priority: input.priority,
        wait_state: input.wait_state,
        due_at: input.due_at,
      },
      occurredAt: timestampNow,
      requestId,
    });
    return executeWorktreeMutation(repository, command, (transaction) => {
      const persisted = transaction.create(createMatterTask(input));
      const timeline = appendTimeline(transaction, {
        event_id: `matter.timeline.task.created:${tenantId}:${taskId}`,
        tenant_id: tenantId,
        matter_id: matterId,
        occurred_at: timestampNow,
        type: "matter.task.created",
        title,
        source_ref: taskId,
        source_object_id: taskId,
        safe_summary: { task_id: taskId, status: persisted.status },
      });
      return {
        task: persisted,
        item: toMatterOperationalRow(persisted, { matter: matterFor(transaction, tenantId, matterId) }),
        timeline_event: timeline,
      };
    });
  }

  function transitionTask({
    tenant_id,
    task_id,
    to_status,
    actor_id,
    reason,
    idempotency_key,
    occurred_at,
    request_id,
    source_ref,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const taskId = requiredString(task_id, "task_id");
    const toStatus = requiredString(to_status, "to_status");
    const actorId = requiredString(actor_id, "actor_id");
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterTask", task_id: taskId });
    if (!current) throw new Error("MatterTask not found");
    const suppliedReason = optionalString(reason);
    const reasonRequired = toStatus === "blocked"
      || (toStatus === "in_progress" && ["blocked", "done"].includes(current.status));
    if (reasonRequired) assertMatterTaskTransitionReason(suppliedReason);
    const changeReason = suppliedReason
      ?? NORMAL_TASK_TRANSITION_REASONS[toStatus]
      ?? "matter_task_transitioned";
    const idempotencyKey = requiredString(idempotency_key, "idempotency_key");
    const timestampNow = now(occurred_at);
    const sourceRef = optionalString(source_ref) ?? "matter_task_board";
    const requestId = optionalString(request_id) ?? `request:${idempotencyKey}`;
    const command = mutationCommand({
      tenantId,
      idempotencyKey,
      operation: "matter.task.transition",
      actorId,
      reason: changeReason,
      sourceRef,
      objectType: "MatterTask",
      objectId: taskId,
      request: { to_status: toStatus },
      occurredAt: timestampNow,
      requestId,
    });
    return executeWorktreeMutation(repository, command, (transaction) => {
      const persisted = transitionMatterTask({
        repository: transaction,
        task: current,
        to_status: toStatus,
        actor_id: actorId,
        reason: changeReason,
        occurred_at: timestampNow,
      });
      const timeline = appendTimeline(transaction, {
        event_id: `matter.timeline.task.transition:${stableId("event", tenantId, idempotencyKey)}`,
        tenant_id: tenantId,
        matter_id: persisted.matter_id,
        occurred_at: timestampNow,
        type: "matter.task.transition",
        title: persisted.title,
        source_ref: taskId,
        source_object_id: taskId,
        safe_summary: { task_id: taskId, from_status: current.status, to_status: toStatus },
      });
      return {
        task: persisted,
        item: toMatterOperationalRow(persisted, {
          matter: matterFor(transaction, tenantId, persisted.matter_id),
        }),
        timeline_event: timeline,
      };
    });
  }

  function archiveTask({
    tenant_id,
    task_id,
    actor_id,
    reason,
    idempotency_key,
    occurred_at,
    request_id,
    source_ref,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const taskId = requiredString(task_id, "task_id");
    const actorId = requiredString(actor_id, "actor_id");
    const archiveReason = requiredString(reason, "reason");
    const idempotencyKey = requiredString(idempotency_key, "idempotency_key");
    const timestampNow = now(occurred_at);
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterTask", task_id: taskId });
    if (!current) throw new Error("MatterTask not found");
    const sourceRef = optionalString(source_ref) ?? "matter_task_archive";
    const requestId = optionalString(request_id) ?? `request:${idempotencyKey}`;
    const command = mutationCommand({
      tenantId,
      idempotencyKey,
      operation: "matter.task.archive",
      actorId,
      reason: archiveReason,
      sourceRef,
      objectType: "MatterTask",
      objectId: taskId,
      request: { archived: true },
      occurredAt: timestampNow,
      requestId,
    });
    return executeWorktreeMutation(repository, command, (transaction) => {
      const persisted = archiveMatterTask({
        repository: transaction,
        task: current,
        actor_id: actorId,
        reason: archiveReason,
        occurred_at: timestampNow,
      });
      const timeline = appendTimeline(transaction, {
        event_id: `matter.timeline.task.archived:${stableId("event", tenantId, idempotencyKey)}`,
        tenant_id: tenantId,
        matter_id: persisted.matter_id,
        occurred_at: timestampNow,
        type: "matter.task.archived",
        title: persisted.title,
        source_ref: taskId,
        source_object_id: taskId,
        safe_summary: { task_id: taskId, archived_at: persisted.archived_at },
      });
      return {
        task: persisted,
        item: toMatterOperationalRow(persisted, {
          matter: matterFor(transaction, tenantId, persisted.matter_id),
        }),
        timeline_event: timeline,
      };
    });
  }

  function taskRows({ tenantId, matterId, asOf, timeZone, includeTerminal }) {
    const today = localDateKey(asOf, timeZone);
    return repository
      .list({ tenant_id: tenantId, model_type: "MatterTask", ...(matterId ? { matter_id: matterId } : {}) })
      .map((record) => createMatterTask(record))
      .filter((task) => !task.archived_at && (includeTerminal || activeTask(task)))
      .map((task) => {
        const base = toMatterOperationalRow(task, {
          matter: matterFor(repository, tenantId, task.matter_id),
        });
        const localDueDate = base.due_at ? localDateKey(base.due_at, timeZone) : null;
        return Object.freeze({
          ...base,
          local_due_date: localDueDate,
          due_bucket: dueBucket({ ...base, local_due_date: localDueDate }, today),
        });
      });
  }

  function listTaskQueue({
    tenant_id,
    actor_id,
    as_of,
    time_zone = DEFAULT_TIME_ZONE,
    saved_view,
    matter_id,
    include_terminal = false,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const actorId = optionalString(actor_id);
    const timeZone = assertTimeZone(time_zone);
    const asOf = now(as_of);
    const matterId = optionalString(matter_id);
    const savedView = optionalString(saved_view);
    if (typeof include_terminal !== "boolean") throw new TypeError("include_terminal must be boolean");
    if (savedView && !MATTER_TASK_SAVED_VIEWS.includes(savedView)) throw new TypeError("saved_view is invalid");
    if (savedView === "my_work" && !actorId) throw new TypeError("actor_id is required for my_work");
    const items = Object.freeze(taskRows({
      tenantId,
      matterId,
      asOf,
      timeZone,
      includeTerminal: include_terminal,
    }).filter((row) => savedViewMatch(row, savedView, actorId))
      .sort((left, right) => queueSort(left, right, timeZone)));
    const summary = Object.freeze({
      overdue: items.filter((row) => row.due_bucket === "overdue").length,
      due_today: items.filter((row) => row.due_bucket === "due_today").length,
      upcoming: items.filter((row) => row.due_bucket === "upcoming").length,
      undated: items.filter((row) => row.due_bucket === "undated").length,
    });
    return Object.freeze({
      items,
      count: items.length,
      summary,
      saved_view: savedView,
      as_of: asOf,
      time_zone: timeZone,
      include_terminal,
    });
  }

  function listTaskSavedViews(options = {}) {
    const asOf = options.as_of ?? now();
    const views = Object.fromEntries(MATTER_TASK_SAVED_VIEWS.map((savedView) => {
      const result = listTaskQueue({ ...options, as_of: asOf, saved_view: savedView });
      return [savedView, result];
    }));
    return Object.freeze({
      views: Object.freeze(views),
      counts: Object.freeze(Object.fromEntries(
        Object.entries(views).map(([key, result]) => [key, result.count]),
      )),
    });
  }

  function listTaskBoard({
    tenant_id,
    as_of,
    time_zone = DEFAULT_TIME_ZONE,
    matter_id,
    include_terminal = true,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const timeZone = assertTimeZone(time_zone);
    const asOf = now(as_of);
    const matterId = optionalString(matter_id);
    if (typeof include_terminal !== "boolean") throw new TypeError("include_terminal must be boolean");
    const items = Object.freeze(taskRows({
      tenantId,
      matterId,
      asOf,
      timeZone,
      includeTerminal: include_terminal,
    }).sort((left, right) => queueSort(left, right, timeZone)));
    const columns = Object.freeze(TASK_STATUS_ORDER.map((status) => {
      const columnItems = Object.freeze(items.filter((item) => item.status === status));
      return Object.freeze({ status, items: columnItems, count: columnItems.length });
    }));
    return Object.freeze({
      items,
      count: items.length,
      columns,
      as_of: asOf,
      time_zone: timeZone,
      include_terminal,
    });
  }

  function createDeadline({
    tenant_id,
    idempotency_key,
    actor_id,
    deadline,
    occurred_at,
    request_id,
    source_ref,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const idempotencyKey = requiredString(idempotency_key, "idempotency_key");
    const actorId = requiredString(actor_id, "actor_id");
    const timestampNow = now(occurred_at);
    const eventId = optionalString(deadline?.event_id) ?? stableId("deadline", tenantId, idempotencyKey);
    const matterId = requiredString(deadline?.matter_id, "matter_id");
    const title = requiredString(deadline?.title, "title");
    const startsAt = timestamp(deadline?.starts_at, "starts_at");
    const endsAt = deadline?.ends_at == null ? null : timestamp(deadline.ends_at, "ends_at");
    const legalConsequence = deadline?.legal_consequence ?? "internal";
    const sourceRef = optionalString(source_ref) ?? "matter_deadline_create";
    const requestId = optionalString(request_id) ?? `request:${idempotencyKey}`;
    const input = {
      event_id: eventId,
      tenant_id: tenantId,
      matter_id: matterId,
      title,
      status: "scheduled",
      starts_at: startsAt,
      ends_at: endsAt,
      responsible_user_id: optionalString(deadline?.responsible_user_id ?? deadline?.assigned_to),
      deadline_type: deadline?.deadline_type ?? "internal",
      reminder_rule: deadline?.reminder_rule ?? "none",
      created_at: timestampNow,
      updated_at: timestampNow,
      source_ref: sourceRef,
    };
    requireMatter(repository, tenantId, matterId);
    const activeReferences = activeWorkReferenceIds(repository, tenantId, matterId);
    assertActiveWorkReference(
      activeReferences,
      input.responsible_user_id,
      "responsible_user_id",
    );
    const command = mutationCommand({
      tenantId,
      idempotencyKey,
      operation: "matter.deadline.create",
      actorId,
      reason: "matter_deadline_created",
      sourceRef,
      objectType: "MatterCalendarEvent",
      objectId: eventId,
      request: {
        event_id: eventId,
        matter_id: matterId,
        title,
        starts_at: startsAt,
        ends_at: endsAt,
        responsible_user_id: input.responsible_user_id,
        deadline_type: input.deadline_type,
        reminder_rule: input.reminder_rule,
        criticality: deadline?.criticality ?? "standard",
        legal_consequence: legalConsequence,
      },
      occurredAt: timestampNow,
      requestId,
    });
    return executeWorktreeMutation(repository, command, (transaction) => {
      const persisted = transaction.create({
        ...createMatterCalendarEvent(input),
        criticality: deadline?.criticality ?? "standard",
        legal_consequence: legalConsequence,
        provider_sync_state: "provider_blocked",
        provider_event_id_included: false,
        raw_provider_payload_included: false,
      });
      const history = transaction.create({
        model_type: "MatterDeadlineHistory",
        resource_id: stableId("deadline_history", tenantId, idempotencyKey),
        history_id: stableId("deadline_history", tenantId, idempotencyKey),
        tenant_id: tenantId,
        matter_id: matterId,
        event_id: eventId,
        change_type: "created",
        previous_starts_at: null,
        new_starts_at: startsAt,
        previous_ends_at: null,
        new_ends_at: endsAt,
        reason: "matter_deadline_created",
        changed_by: actorId,
        occurred_at: timestampNow,
      });
      const timeline = appendTimeline(transaction, {
        event_id: `matter.timeline.deadline.created:${tenantId}:${eventId}`,
        tenant_id: tenantId,
        matter_id: matterId,
        occurred_at: timestampNow,
        type: "matter.deadline.created",
        title,
        source_ref: eventId,
        source_object_id: eventId,
        safe_summary: { event_id: eventId, starts_at: startsAt },
      });
      return {
        deadline: persisted,
        item: toMatterOperationalRow(persisted, {
          matter: matterFor(transaction, tenantId, matterId),
        }),
        history_entry: deadlineHistoryRow(history),
        timeline_event: timeline,
      };
    });
  }

  function rescheduleDeadline({
    tenant_id,
    event_id,
    new_starts_at,
    new_ends_at,
    actor_id,
    reason,
    idempotency_key,
    occurred_at,
    request_id,
    source_ref,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const eventId = requiredString(event_id, "event_id");
    const actorId = requiredString(actor_id, "actor_id");
    const changeReason = requiredString(reason, "reason");
    const idempotencyKey = requiredString(idempotency_key, "idempotency_key");
    const timestampNow = now(occurred_at);
    const startsAt = timestamp(new_starts_at, "new_starts_at");
    const current = repository.get({ tenant_id: tenantId, model_type: "MatterCalendarEvent", event_id: eventId });
    if (!current) throw new Error("MatterCalendarEvent not found");
    const endsAt = new_ends_at == null ? current.ends_at ?? null : timestamp(new_ends_at, "new_ends_at");
    if ((current.criticality ?? "standard") === "critical") {
      throw new Error("Critical deadline change requires the existing dual-control confirmation flow");
    }
    const sourceRef = optionalString(source_ref) ?? "matter_deadline_reschedule";
    const requestId = optionalString(request_id) ?? `request:${idempotencyKey}`;
    const command = mutationCommand({
      tenantId,
      idempotencyKey,
      operation: "matter.deadline.reschedule",
      actorId,
      reason: changeReason,
      sourceRef,
      objectType: "MatterCalendarEvent",
      objectId: eventId,
      request: { new_starts_at: startsAt, new_ends_at: endsAt },
      occurredAt: timestampNow,
      requestId,
    });
    return executeWorktreeMutation(repository, command, (transaction) => {
      const changed = changeMatterDeadline({
        repository: transaction,
        event: current,
        new_starts_at: startsAt,
        new_ends_at: endsAt,
        actor_id: actorId,
        reason: changeReason,
      });
      const persisted = transaction.update(
        { tenant_id: tenantId, model_type: "MatterCalendarEvent", event_id: eventId },
        { updated_at: timestampNow },
      );
      const history = transaction.create({
        model_type: "MatterDeadlineHistory",
        resource_id: stableId("deadline_history", tenantId, idempotencyKey),
        history_id: stableId("deadline_history", tenantId, idempotencyKey),
        tenant_id: tenantId,
        matter_id: persisted.matter_id,
        event_id: eventId,
        change_type: "rescheduled",
        previous_starts_at: current.starts_at,
        new_starts_at: changed.starts_at,
        previous_ends_at: current.ends_at ?? null,
        new_ends_at: changed.ends_at ?? null,
        reason: changeReason,
        changed_by: actorId,
        occurred_at: timestampNow,
      });
      const timeline = appendTimeline(transaction, {
        event_id: `matter.timeline.deadline.rescheduled:${stableId("event", tenantId, idempotencyKey)}`,
        tenant_id: tenantId,
        matter_id: persisted.matter_id,
        occurred_at: timestampNow,
        type: "matter.deadline.rescheduled",
        title: persisted.title,
        source_ref: eventId,
        source_object_id: eventId,
        safe_summary: {
          event_id: eventId,
          previous_starts_at: current.starts_at,
          new_starts_at: persisted.starts_at,
        },
      });
      return {
        deadline: persisted,
        item: toMatterOperationalRow(persisted, {
          matter: matterFor(transaction, tenantId, persisted.matter_id),
        }),
        history_entry: deadlineHistoryRow(history),
        timeline_event: timeline,
      };
    });
  }

  function listDeadlineHistory({ tenant_id, event_id, matter_id } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const eventId = optionalString(event_id);
    const matterId = optionalString(matter_id);
    const items = Object.freeze(repository
      .list({ tenant_id: tenantId, model_type: "MatterDeadlineHistory", ...(matterId ? { matter_id: matterId } : {}) })
      .filter((record) => !eventId || record.event_id === eventId)
      .map(deadlineHistoryRow)
      .sort((left, right) => left.occurred_at.localeCompare(right.occurred_at)
        || left.history_id.localeCompare(right.history_id)));
    return Object.freeze({ items, count: items.length });
  }

  function getWeekSchedule({
    tenant_id,
    week_start,
    time_zone = DEFAULT_TIME_ZONE,
    matter_id,
  } = {}) {
    const tenantId = requiredString(tenant_id, "tenant_id");
    const timeZone = assertTimeZone(time_zone);
    const matterId = optionalString(matter_id);
    const currentDate = localDateKey(now(), timeZone);
    const weekStart = week_start ? assertDateKey(week_start, "week_start") : mondayFor(currentDate);
    const weekEnd = addDays(weekStart, 6);
    const taskRowsForWeek = repository
      .list({ tenant_id: tenantId, model_type: "MatterTask", ...(matterId ? { matter_id: matterId } : {}) })
      .map((record) => createMatterTask(record))
      .filter((task) => activeTask(task) && task.due_at)
      .map((task) => operationalProjection(task, {
        matter: matterFor(repository, tenantId, task.matter_id),
      }));
    const eventRowsForWeek = repository
      .list({ tenant_id: tenantId, model_type: "MatterCalendarEvent", ...(matterId ? { matter_id: matterId } : {}) })
      .filter((event) => event.status !== "cancelled")
      .map((event) => operationalProjection(event, {
        matter: matterFor(repository, tenantId, event.matter_id),
      }));
    const items = Object.freeze(sortRows(deduplicateRows([
      ...taskRowsForWeek,
      ...eventRowsForWeek,
    ]).filter((row) => {
      const date = localDateKey(row.due_at, timeZone);
      return date >= weekStart && date <= weekEnd;
    }), timeZone));
    return Object.freeze({
      items,
      count: items.length,
      week_start: weekStart,
      week_end: weekEnd,
      time_zone: timeZone,
    });
  }

  return Object.freeze({
    listOperationalRows,
    quickCreateTask,
    transitionTask,
    archiveTask,
    listTaskQueue,
    listTaskSavedViews,
    listTaskBoard,
    createDeadline,
    rescheduleDeadline,
    listDeadlineHistory,
    getWeekSchedule,
    task_transitions: MATTER_TASK_TRANSITIONS,
  });
}
