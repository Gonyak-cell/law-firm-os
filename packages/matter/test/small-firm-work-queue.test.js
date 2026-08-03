import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  archiveMatterTask,
  blockMatterTask,
  createMatterMember,
  createMatterRepository,
  createMatterTask,
  createSmallFirmMatterWorkService,
  MATTER_TASK_SAVED_VIEWS,
  MATTER_TASK_TRANSITIONS,
} from "../src/index.js";

const fixture = JSON.parse(readFileSync(
  new URL("./fixtures/matter-small-firm-foundation.fixture.json", import.meta.url),
  "utf8",
));
const TENANT = fixture.tenant_id;
const AS_OF = fixture.as_of;
const TIME_ZONE = fixture.timezone;
const ACTOR = "person-03";

function matterStatus(status) {
  return {
    active: "open",
    on_hold: "paused",
  }[status] ?? status;
}

function taskStatus(status) {
  return {
    open: "todo",
    waiting: "todo",
    archived: "done",
  }[status] ?? status;
}

function matterRecord(record) {
  return {
    model_type: "Matter",
    tenant_id: TENANT,
    matter_id: record.matter_id,
    client_id: `client:${record.matter_id}`,
    title: record.title,
    matter_code: record.matter_code,
    status: matterStatus(record.status),
    created_by: "fixture",
    created_at: "2026-07-01T00:00:00.000Z",
    permission_envelope_id: `permission:${record.matter_id}`,
    audit_trace_id: `audit:${record.matter_id}`,
  };
}

function taskRecord(record) {
  return {
    model_type: "MatterTask",
    tenant_id: TENANT,
    task_id: record.task_id,
    matter_id: record.matter_id,
    title: record.title,
    status: taskStatus(record.status),
    created_by: "fixture",
    assigned_to: record.owner_id,
    backup_user_id: record.backup_user_id,
    wait_state: record.wait_state,
    blocked_reason: record.blocked_reason,
    due_at: record.due_at,
    completed_at: record.completed_at,
    archived_at: record.archived_at,
    source_ref: record.source_ref,
  };
}

function calendarRecord(record) {
  return {
    model_type: "MatterCalendarEvent",
    tenant_id: TENANT,
    event_id: record.event_id,
    matter_id: record.matter_id,
    title: record.title,
    status: "scheduled",
    starts_at: record.starts_at,
    deadline_type: record.kind,
    source_ref: `fixture:${record.event_id}`,
  };
}

function personReferenceRecord(personId, status = "active") {
  return {
    model_type: "Person",
    resource_id: personId,
    person_id: personId,
    user_id: personId,
    tenant_id: TENANT,
    status,
  };
}

function memberReferenceRecord(userId, status = "active", matterId = "matter-003") {
  return createMatterMember({
    member_id: `member:${userId}`,
    tenant_id: TENANT,
    matter_id: matterId,
    user_id: userId,
    role: "associate",
    status,
  });
}

function fixtureRepository({ tasks = true, events = true } = {}) {
  return createMatterRepository({
    seedRecords: [
      ...fixture.people.map(({ person_id: personId, active }) =>
        personReferenceRecord(personId, active ? "active" : "inactive")),
      ...fixture.matters.map(matterRecord),
      ...(tasks ? fixture.tasks.map(taskRecord) : []),
      ...(events ? fixture.calendar_events.map(calendarRecord) : []),
    ],
  });
}

function withDuplicatedCalendarReads(repository) {
  return {
    ...repository,
    list(query) {
      const records = repository.list(query);
      return query?.model_type === "MatterCalendarEvent"
        ? [...records, ...records]
        : records;
    },
  };
}

function durablePath(label) {
  return join(mkdtempSync(join(tmpdir(), label)), "matter.json");
}

function assertTaskTransitionError(callback, { code, message, ErrorType = Error }) {
  assert.throws(callback, (error) => {
    assert.equal(error.constructor, ErrorType);
    assert.equal(error.message, message);
    assert.equal(error.status, 422);
    assert.equal(error.safe_error_code, code);
    return true;
  });
}

test("[TUW-04] normalizes task, activity, and calendar records with source-scoped deduplication", () => {
  const repository = fixtureRepository();
  repository.create({
    model_type: "MatterActivity",
    resource_id: "activity-001",
    activity_id: "activity-001",
    tenant_id: TENANT,
    matter_id: "matter-003",
    title: "Activity projection",
    status: "todo",
    assigned_to: ACTOR,
    due_at: "2026-07-27T09:00:00.000Z",
  });
  repository.create({
    model_type: "MatterCalendarEvent",
    event_id: "task-001",
    tenant_id: TENANT,
    matter_id: "matter-003",
    title: "Calendar event sharing a task raw ID",
    status: "scheduled",
    starts_at: "2026-07-27T09:00:00.000Z",
  });
  repository.create({
    model_type: "MatterActivity",
    resource_id: "activity-task-projection",
    activity_id: "activity-task-projection",
    task_id: "task-001",
    tenant_id: TENANT,
    matter_id: "matter-003",
    title: "Explicit activity projection of task-001",
    status: "todo",
    due_at: "2026-07-27T09:00:00.000Z",
  });
  repository.create({
    model_type: "MatterCalendarEvent",
    event_id: "calendar-source-task-projection",
    source_task_id: "task-001",
    tenant_id: TENANT,
    matter_id: "matter-003",
    title: "Explicit calendar projection of task-001",
    status: "scheduled",
    starts_at: "2026-07-27T09:00:00.000Z",
  });
  repository.create({
    model_type: "MatterCalendarEvent",
    event_id: "calendar-ledger-task-projection",
    ledger_ref: { model_type: "MatterTask", id: "task-001" },
    tenant_id: TENANT,
    matter_id: "matter-003",
    title: "Explicit ledger projection of task-001",
    status: "scheduled",
    starts_at: "2026-07-27T09:00:00.000Z",
  });
  const service = createSmallFirmMatterWorkService({
    repository: withDuplicatedCalendarReads(repository),
    clock: () => AS_OF,
  });

  const result = service.listOperationalRows({ tenant_id: TENANT });
  const identities = result.items.map(({ source, id }) => `${source}:${id}`);
  const sharedIdRows = result.items.filter(({ id }) => id === "task-001");
  const task = sharedIdRows.find(({ source }) => source === "task");
  const event = result.items.find(({ id }) => id === "event-001");
  const activity = result.items.find(({ id }) => id === "activity-001");

  assert.equal(identities.length, new Set(identities).size);
  assert.deepEqual(sharedIdRows.map(({ source }) => source), ["task", "calendar"]);
  assert.equal(task.source, "task");
  assert.equal(event.source, "calendar");
  assert.equal(activity.source, "activity");
  assert.equal(result.items.some(({ id }) => id === "activity-task-projection"), false);
  assert.equal(result.items.some(({ id }) => id === "calendar-source-task-projection"), false);
  assert.equal(result.items.some(({ id }) => id === "calendar-ledger-task-projection"), false);
  assert.equal(
    result.items.filter(({ source }) => source === "calendar").length,
    repository.list({ tenant_id: TENANT, model_type: "MatterCalendarEvent" }).length - 2,
  );
  assert.equal(
    result.items.filter(({ source }) => source === "activity").length,
    repository.list({ tenant_id: TENANT, model_type: "MatterActivity" }).length - 1,
  );
  for (const field of [
    "id", "matter", "title", "owner_user_id", "backup_user_id",
    "status", "due_at", "source", "source_ref", "ledger_ref",
  ]) {
    assert.equal(Object.hasOwn(task, field), true, field);
    assert.equal(Object.hasOwn(event, field), true, field);
  }
});

test("[TUW-06] extends MatterTask with compatible defaults, round-trips new fields, and rejects invalid status, date, and priority", () => {
  const legacy = createMatterTask({
    task_id: "task-legacy",
    tenant_id: TENANT,
    matter_id: "matter-003",
    title: "Legacy task",
    status: "todo",
    created_by: ACTOR,
    due_at: "2026-07-30",
  });
  assert.deepEqual(
    {
      priority: legacy.priority,
      wait_state: legacy.wait_state,
      blocked_reason: legacy.blocked_reason,
      completed_at: legacy.completed_at,
      archived_at: legacy.archived_at,
      backup_user_id: legacy.backup_user_id,
    },
    {
      priority: "normal",
      wait_state: null,
      blocked_reason: null,
      completed_at: null,
      archived_at: null,
      backup_user_id: null,
    },
  );

  const repository = createMatterRepository();
  const persisted = repository.create(createMatterTask({
    ...legacy,
    task_id: "task-extended",
    priority: "urgent",
    wait_state: "client_reply",
    blocked_reason: "Client evidence pending",
    backup_user_id: "person-07",
    completed_at: "2026-07-30T08:00:00.000Z",
    archived_at: "2026-07-30T09:00:00.000Z",
  }));
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "MatterTask",
    task_id: persisted.task_id,
  }).priority, "urgent");
  assert.throws(() => createMatterTask({ ...legacy, status: "waiting" }), /status must be one of/);
  assert.throws(() => createMatterTask({ ...legacy, priority: "highest" }), /priority must be one of/);
  assert.throws(() => createMatterTask({ ...legacy, due_at: "2026-02-30" }), /ISO timestamp with timezone/);
  assert.throws(
    () => createMatterTask({ ...legacy, due_at: "2026-02-30T09:00:00.000Z" }),
    /ISO timestamp with timezone/,
  );
  assert.throws(() => createMatterTask({ ...legacy, completed_at: "2026-07-30" }), /ISO timestamp with timezone/);
});

test("[TUW-07] records completion, blocked reason, and archive timestamps without changing the canonical status matrix", () => {
  const repository = fixtureRepository({ events: false });
  const doneAt = "2026-07-30T01:00:00.000Z";
  const archiveAt = "2026-07-30T02:00:00.000Z";
  const first = repository.get({ tenant_id: TENANT, model_type: "MatterTask", task_id: "task-001" });
  const second = repository.get({ tenant_id: TENANT, model_type: "MatterTask", task_id: "task-002" });
  const third = repository.get({ tenant_id: TENANT, model_type: "MatterTask", task_id: "task-003" });

  const service = createSmallFirmMatterWorkService({ repository, clock: () => doneAt });
  const rejectedBlockSnapshot = repository.snapshot();
  assertTaskTransitionError(
    () => service.transitionTask({
      tenant_id: TENANT,
      task_id: second.task_id,
      to_status: "blocked",
      actor_id: ACTOR,
      idempotency_key: "tuw-07-block-missing-reason",
    }),
    {
      code: "MATTER_TASK_TRANSITION_REASON_REQUIRED",
      message: "reason is required",
      ErrorType: TypeError,
    },
  );
  assert.deepEqual(repository.snapshot(), rejectedBlockSnapshot);

  const completed = service.transitionTask({
    tenant_id: TENANT,
    task_id: first.task_id,
    to_status: "done",
    actor_id: ACTOR,
    reason: "review complete",
    idempotency_key: "tuw-07-complete",
  }).task;
  assert.equal(completed.status, "done");
  assert.equal(completed.completed_at, doneAt);

  const rejectedReopenSnapshot = repository.snapshot();
  assertTaskTransitionError(
    () => service.transitionTask({
      tenant_id: TENANT,
      task_id: first.task_id,
      to_status: "in_progress",
      actor_id: ACTOR,
      idempotency_key: "tuw-07-reopen-missing-reason",
    }),
    {
      code: "MATTER_TASK_TRANSITION_REASON_REQUIRED",
      message: "reason is required",
      ErrorType: TypeError,
    },
  );
  assert.deepEqual(repository.snapshot(), rejectedReopenSnapshot);

  const rejectedTransitionSnapshot = repository.snapshot();
  assertTaskTransitionError(
    () => service.transitionTask({
      tenant_id: TENANT,
      task_id: first.task_id,
      to_status: "done",
      actor_id: ACTOR,
      idempotency_key: "tuw-07-repeat-complete",
    }),
    {
      code: "MATTER_TASK_TRANSITION_INVALID",
      message: "MatterTask cannot transition from done to done",
    },
  );
  assert.deepEqual(repository.snapshot(), rejectedTransitionSnapshot);

  const started = service.transitionTask({
    tenant_id: TENANT,
    task_id: "task-004",
    to_status: "in_progress",
    actor_id: ACTOR,
    idempotency_key: "tuw-07-start-without-reason",
  }).task;
  const completedWithoutReason = service.transitionTask({
    tenant_id: TENANT,
    task_id: "task-004",
    to_status: "done",
    actor_id: ACTOR,
    idempotency_key: "tuw-07-complete-without-reason",
  }).task;
  assert.equal(started.status, "in_progress");
  assert.equal(completedWithoutReason.status, "done");
  assert.deepEqual(
    repository
      .listAudit({ tenant_id: TENANT, object_id: "task-004" })
      .filter(({ action }) => action === "matter.task.transition")
      .map(({ reason }) => reason),
    ["matter_task_started", "matter_task_completed"],
  );

  assertTaskTransitionError(
    () => blockMatterTask({ repository, task: second, actor_id: ACTOR, reason: "" }),
    {
      code: "MATTER_TASK_TRANSITION_REASON_REQUIRED",
      message: "reason is required",
      ErrorType: TypeError,
    },
  );
  const blocked = blockMatterTask({
    repository,
    task: second,
    actor_id: ACTOR,
    reason: "original record pending",
    occurred_at: doneAt,
  });
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.blocked_reason, "original record pending");

  const archived = archiveMatterTask({
    repository,
    task: third,
    actor_id: ACTOR,
    reason: "no longer active",
    occurred_at: archiveAt,
  });
  assert.equal(archived.status, third.status);
  assert.equal(archived.archived_at, archiveAt);
});

test("[TUW-08] quick task creation replays durably with one MatterTask, audit, and timeline record", () => {
  const filePath = durablePath("matter-tuw-08-");
  let repository = createMatterRepository({
    filePath,
    seedRecords: [
      personReferenceRecord(ACTOR),
      matterRecord(fixture.matters[2]),
    ],
  });
  let service = createSmallFirmMatterWorkService({
    repository,
    clock: () => "2026-07-30T03:00:00.000Z",
  });
  const command = {
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "tuw-08-quick-create",
    task: {
      matter_id: "matter-003",
      title: "Quick review task",
      assigned_to: ACTOR,
      due_at: "2026-07-31T09:00:00.000+09:00",
    },
  };
  const first = service.quickCreateTask(command);
  repository.close();

  repository = createMatterRepository({ filePath });
  service = createSmallFirmMatterWorkService({
    repository,
    clock: () => "2026-07-30T04:00:00.000Z",
  });
  const replay = service.quickCreateTask(command);

  assert.equal(first.idempotent_replay, false);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(replay.item.id, first.item.id);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length, 1);
  assert.equal(repository.list({
    tenant_id: TENANT,
    model_type: "MatterTimelineEvent",
  }).filter(({ source_object_id }) => source_object_id === first.item.id).length, 1);
  assert.equal(repository.listAudit({ tenant_id: TENANT, object_id: first.item.id }).length, 1);
  assert.throws(
    () => service.quickCreateTask({
      ...command,
      task: { ...command.task, title: "Changed replay payload" },
    }),
    /Idempotency key was already used/,
  );
});

test("[TUW-08/TUW-13 HIGH] rejects missing and cross-tenant Matter writes before task, deadline, audit, or idempotency persistence", () => {
  const otherTenant = "tenant-other";
  const crossTenantMatterId = "matter-cross-tenant";
  const repository = createMatterRepository({
    seedRecords: [{
      ...matterRecord(fixture.matters[2]),
      tenant_id: otherTenant,
      matter_id: crossTenantMatterId,
      matter_code: "OTHER-001",
    }],
  });
  const service = createSmallFirmMatterWorkService({ repository, clock: () => AS_OF });
  const cases = [
    {
      label: "quick task for missing Matter",
      idempotencyKey: "tuw-08-missing-matter",
      invoke: () => service.quickCreateTask({
        tenant_id: TENANT,
        actor_id: ACTOR,
        idempotency_key: "tuw-08-missing-matter",
        task: { matter_id: "matter-missing", title: "Must not persist" },
      }),
    },
    {
      label: "quick task for cross-tenant Matter",
      idempotencyKey: "tuw-08-cross-tenant-matter",
      invoke: () => service.quickCreateTask({
        tenant_id: TENANT,
        actor_id: ACTOR,
        idempotency_key: "tuw-08-cross-tenant-matter",
        task: { matter_id: crossTenantMatterId, title: "Must not persist" },
      }),
    },
    {
      label: "deadline for missing Matter",
      idempotencyKey: "tuw-13-missing-matter",
      invoke: () => service.createDeadline({
        tenant_id: TENANT,
        actor_id: ACTOR,
        idempotency_key: "tuw-13-missing-matter",
        deadline: {
          matter_id: "matter-missing",
          title: "Must not persist",
          starts_at: "2026-08-03T16:00:00.000+09:00",
        },
      }),
    },
    {
      label: "deadline for cross-tenant Matter",
      idempotencyKey: "tuw-13-cross-tenant-matter",
      invoke: () => service.createDeadline({
        tenant_id: TENANT,
        actor_id: ACTOR,
        idempotency_key: "tuw-13-cross-tenant-matter",
        deadline: {
          matter_id: crossTenantMatterId,
          title: "Must not persist",
          starts_at: "2026-08-03T16:00:00.000+09:00",
        },
      }),
    },
  ];

  for (const scenario of cases) {
    const before = repository.snapshot();
    assert.throws(scenario.invoke, /Matter not found/, scenario.label);
    assert.deepEqual(repository.snapshot(), before, scenario.label);
    assert.equal(repository.getIdempotency({
      tenant_id: TENANT,
      idempotency_key: scenario.idempotencyKey,
    }), undefined, scenario.label);
  }
});

test("[RF-01 TUW-08/TUW-13] rejects invalid work references atomically and accepts active Person and MatterMember references", () => {
  const repository = createMatterRepository({
    seedRecords: [
      matterRecord(fixture.matters[2]),
      matterRecord(fixture.matters[3]),
      personReferenceRecord("person-active"),
      personReferenceRecord("person-inactive", "inactive"),
      memberReferenceRecord("member-active"),
      memberReferenceRecord("member-inactive", "removed"),
      memberReferenceRecord("member-other-matter", "active", "matter-004"),
    ],
  });
  const service = createSmallFirmMatterWorkService({ repository, clock: () => AS_OF });
  const invalidReferences = [
    { operation: "task", field: "assigned_to", value: "person-unknown" },
    { operation: "task", field: "assigned_to", value: "person-inactive" },
    { operation: "task", field: "assigned_to", value: "member-inactive" },
    { operation: "task", field: "backup_user_id", value: "backup-unknown" },
    { operation: "task", field: "backup_user_id", value: "person-inactive" },
    { operation: "task", field: "backup_user_id", value: "member-inactive" },
    { operation: "task", field: "backup_user_id", value: "member-other-matter" },
    { operation: "deadline", field: "responsible_user_id", value: "person-unknown" },
    { operation: "deadline", field: "responsible_user_id", value: "person-inactive" },
    { operation: "deadline", field: "responsible_user_id", value: "member-inactive" },
    { operation: "deadline", field: "responsible_user_id", value: "member-other-matter" },
  ];

  for (const [index, invalid] of invalidReferences.entries()) {
    const idempotencyKey = `rf01-invalid-work-reference-${index + 1}`;
    const invoke = invalid.operation === "task"
      ? () => service.quickCreateTask({
        tenant_id: TENANT,
        actor_id: ACTOR,
        idempotency_key: idempotencyKey,
        task: {
          matter_id: "matter-003",
          title: "Must not persist",
          assigned_to: invalid.field === "assigned_to" ? invalid.value : "person-active",
          backup_user_id: invalid.field === "backup_user_id" ? invalid.value : null,
        },
      })
      : () => service.createDeadline({
        tenant_id: TENANT,
        actor_id: ACTOR,
        idempotency_key: idempotencyKey,
        deadline: {
          matter_id: "matter-003",
          title: "Must not persist",
          starts_at: "2026-08-03T16:00:00.000+09:00",
          responsible_user_id: invalid.value,
        },
      });
    const before = repository.snapshot();

    assert.throws(
      invoke,
      new RegExp(`${invalid.field} must reference an active tenant Person or same-Matter MatterMember`),
    );
    assert.deepEqual(repository.snapshot(), before, `${invalid.operation}:${invalid.field}:${invalid.value}`);
    assert.equal(repository.getIdempotency({
      tenant_id: TENANT,
      idempotency_key: idempotencyKey,
    }), undefined);
  }

  const task = service.quickCreateTask({
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "rf01-active-task-references",
    task: {
      matter_id: "matter-003",
      title: "Valid referenced task",
      assigned_to: "person-active",
      backup_user_id: "member-active",
    },
  }).task;
  const deadline = service.createDeadline({
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "rf01-active-deadline-reference",
    deadline: {
      matter_id: "matter-003",
      title: "Valid referenced deadline",
      starts_at: "2026-08-03T16:00:00.000+09:00",
      responsible_user_id: "member-active",
    },
  }).deadline;

  assert.equal(task.assigned_to, "person-active");
  assert.equal(task.backup_user_id, "member-active");
  assert.equal(deadline.responsible_user_id, "member-active");
  assert.equal(repository.listAudit({ tenant_id: TENANT }).length, 2);
  assert.equal(repository.snapshot().idempotency.length, 2);
});

test("[TUW-09] fixed-clock task queue excludes terminal and archived tasks and orders overdue, today, then future", () => {
  const repository = fixtureRepository({ events: false });
  const service = createSmallFirmMatterWorkService({ repository, clock: () => AS_OF });
  const result = service.listTaskQueue({
    tenant_id: TENANT,
    as_of: AS_OF,
    time_zone: TIME_ZONE,
  });

  assert.deepEqual(result.summary, {
    overdue: fixture.seed_contract.task_lane_counts.overdue,
    due_today: fixture.seed_contract.task_lane_counts.today,
    upcoming: 9,
    undated: 0,
  });
  assert.deepEqual(
    result.items.slice(0, 7).map(({ due_bucket }) => due_bucket),
    ["overdue", "overdue", "overdue", "due_today", "due_today", "due_today", "due_today"],
  );
  assert.equal(result.items.some(({ id }) => ["task-017", "task-023"].includes(id)), false);
});

test("[TUW-09 HIGH/RF-01] orders Z, offset, and date-only due values across the Seoul day boundary with a stable tie-breaker", () => {
  const matter = matterRecord(fixture.matters[2]);
  const repository = createMatterRepository({
    seedRecords: [
      matter,
      ...[
        ["task-boundary-before", "2026-07-29T23:59:59.000+09:00"],
        ["task-tie-b", "2026-07-30T00:00:00.000+09:00"],
        ["task-later", "2026-07-30T01:00:00.000-04:00"],
        ["task-tie-a", "2026-07-30"],
        ["task-z-next", "2026-07-29T15:00:01.000Z"],
      ].map(([taskId, dueAt]) => createMatterTask({
        task_id: taskId,
        tenant_id: TENANT,
        matter_id: matter.matter_id,
        title: taskId,
        status: "todo",
        created_by: ACTOR,
        priority: "normal",
        due_at: dueAt,
      })),
    ],
  });
  const service = createSmallFirmMatterWorkService({ repository, clock: () => AS_OF });

  const result = service.listTaskQueue({
    tenant_id: TENANT,
    as_of: AS_OF,
    time_zone: TIME_ZONE,
  });

  assert.deepEqual(
    result.items.map(({ id }) => id),
    [
      "task-boundary-before",
      "task-tie-a",
      "task-tie-b",
      "task-z-next",
      "task-later",
    ],
  );
  assert.deepEqual(
    result.items.map(({ due_bucket }) => due_bucket),
    ["overdue", "due_today", "due_today", "due_today", "due_today"],
  );
});

test("[TUW-10] exposes four deterministic saved task views with counts equal to their rows", () => {
  const repository = fixtureRepository({ events: false });
  const service = createSmallFirmMatterWorkService({ repository, clock: () => AS_OF });
  const result = service.listTaskSavedViews({
    tenant_id: TENANT,
    actor_id: ACTOR,
    as_of: AS_OF,
    time_zone: TIME_ZONE,
  });

  assert.deepEqual(Object.keys(result.views), MATTER_TASK_SAVED_VIEWS);
  assert.deepEqual(result.counts, {
    my_work: 2,
    overdue: fixture.seed_contract.task_lane_counts.overdue,
    waiting: fixture.seed_contract.task_lane_counts.waiting,
    unassigned: fixture.seed_contract.task_lane_counts.unassigned,
  });
  assert.deepEqual(
    Object.fromEntries(Object.entries(result.views).map(([name, view]) => [
      name,
      view.items.map(({ id }) => id),
    ])),
    {
      my_work: ["task-005", "task-013"],
      overdue: ["task-001", "task-002", "task-003"],
      waiting: ["task-008", "task-009", "task-010", "task-011", "task-012"],
      unassigned: ["task-015", "task-016"],
    },
  );
  for (const [name, view] of Object.entries(result.views)) {
    assert.equal(view.count, view.items.length, name);
    assert.equal(new Set(view.items.map(({ id }) => id)).size, view.count, name);
    const direct = service.listTaskQueue({
      tenant_id: TENANT,
      actor_id: ACTOR,
      as_of: AS_OF,
      time_zone: TIME_ZONE,
      saved_view: name,
    });
    assert.deepEqual(view.items.map(({ id }) => id), direct.items.map(({ id }) => id), name);
  }

  // Priority contract is overdue > waiting > unassigned > my_work. Read each
  // exception lane once, then read actor-scoped my_work for every fixture person
  // to prove the active fixture is one duplicate-free, omission-free union.
  const teamExceptionIds = ["overdue", "waiting", "unassigned"].flatMap((name) =>
    result.views[name].items.map(({ id }) => id));
  const actorMyWorkIds = fixture.people.flatMap(({ person_id }) => service.listTaskQueue({
    tenant_id: TENANT,
    actor_id: person_id,
    as_of: AS_OF,
    time_zone: TIME_ZONE,
    saved_view: "my_work",
  }).items.map(({ id }) => id));
  const allVisibleIds = [...teamExceptionIds, ...actorMyWorkIds];
  const activeFixtureIds = fixture.tasks
    .filter(({ status }) => !["done", "archived"].includes(status))
    .map(({ task_id }) => task_id);

  assert.equal(new Set(allVisibleIds).size, allVisibleIds.length);
  assert.deepEqual([...allVisibleIds].sort(), [...activeFixtureIds].sort());
  assert.equal(allVisibleIds.length, activeFixtureIds.length);
});

test("[TUW-11] task list rows carry owner, matter, next due date, status, and canonical detail identity", () => {
  const repository = fixtureRepository({ events: false });
  const service = createSmallFirmMatterWorkService({ repository, clock: () => AS_OF });
  const row = service.listTaskQueue({
    tenant_id: TENANT,
    as_of: AS_OF,
    time_zone: TIME_ZONE,
  }).items[0];

  assert.equal(row.owner_user_id, "person-03");
  assert.equal(row.matter.code, "K-2026-003");
  assert.equal(row.due_at, "2026-07-27T09:00:00.000Z");
  assert.equal(row.status, "todo");
  assert.deepEqual(row.ledger_ref, { model_type: "MatterTask", id: row.id });
});

test("[TUW-12] board transition keeps one MatterTask ID in board, list, and timeline projections", () => {
  const repository = fixtureRepository({ events: false });
  const service = createSmallFirmMatterWorkService({ repository, clock: () => AS_OF });
  const beforeCount = repository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length;
  const command = {
    tenant_id: TENANT,
    task_id: "task-004",
    to_status: "in_progress",
    actor_id: ACTOR,
    reason: "started from board",
    idempotency_key: "tuw-12-board-move",
  };

  const moved = service.transitionTask(command);
  const replay = service.transitionTask(command);
  const listRow = service.listTaskQueue({
    tenant_id: TENANT,
    as_of: AS_OF,
    time_zone: TIME_ZONE,
  }).items.find(({ id }) => id === command.task_id);
  const boardRow = service.listTaskBoard({
    tenant_id: TENANT,
    as_of: AS_OF,
    time_zone: TIME_ZONE,
  }).items.find(({ id }) => id === command.task_id);
  const timeline = repository.list({
    tenant_id: TENANT,
    model_type: "MatterTimelineEvent",
  }).filter(({ source_object_id }) => source_object_id === command.task_id);

  assert.equal(moved.item.id, command.task_id);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(listRow.id, boardRow.id);
  assert.equal(listRow.status, "in_progress");
  assert.equal(boardRow.status, "in_progress");
  assert.equal(timeline.length, 1);
  assert.equal(timeline[0].safe_summary.task_id, command.task_id);
  assert.equal(repository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length, beforeCount);
});

test("[TUW-12 HIGH] exposes terminal rows on explicit board query while the default task queue stays active-only", () => {
  const repository = fixtureRepository({ events: false });
  repository.create(createMatterTask({
    task_id: "task-cancelled",
    tenant_id: TENANT,
    matter_id: "matter-003",
    title: "Cancelled board row",
    status: "cancelled",
    created_by: ACTOR,
    assigned_to: ACTOR,
    due_at: "2026-07-30T12:00:00.000Z",
  }));
  const service = createSmallFirmMatterWorkService({ repository, clock: () => AS_OF });
  const query = {
    tenant_id: TENANT,
    as_of: AS_OF,
    time_zone: TIME_ZONE,
  };

  const activeQueue = service.listTaskQueue(query);
  const boardQuery = service.listTaskQueue({ ...query, include_terminal: true });
  const board = service.listTaskBoard(query);

  assert.equal(activeQueue.items.some(({ status }) => ["done", "cancelled"].includes(status)), false);
  assert.equal(boardQuery.items.some(({ status }) => status === "done"), true);
  assert.equal(boardQuery.items.some(({ status }) => status === "cancelled"), true);
  assert.deepEqual(
    board.columns.map(({ status }) => status),
    Object.keys(MATTER_TASK_TRANSITIONS),
  );
  assert.equal(board.columns.find(({ status }) => status === "done").count > 0, true);
  assert.equal(board.columns.find(({ status }) => status === "cancelled").count, 1);
  assert.deepEqual(service.task_transitions, MATTER_TASK_TRANSITIONS);
});

test("[TUW-13] creates and reloads a timezone-qualified local deadline with one audit and no provider dependency", () => {
  const filePath = durablePath("matter-tuw-13-");
  let repository = createMatterRepository({
    filePath,
    seedRecords: [
      personReferenceRecord(ACTOR),
      matterRecord(fixture.matters[2]),
    ],
  });
  let service = createSmallFirmMatterWorkService({
    repository,
    clock: () => "2026-07-30T05:00:00.000Z",
  });
  const command = {
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "tuw-13-create-deadline",
    deadline: {
      matter_id: "matter-003",
      title: "Court filing deadline",
      starts_at: "2026-08-03T16:00:00.000+09:00",
      responsible_user_id: ACTOR,
      deadline_type: "filing",
      reminder_rule: "P1D",
      legal_consequence: "court_deadline",
    },
  };
  const created = service.createDeadline(command);
  repository.close();

  repository = createMatterRepository({ filePath });
  service = createSmallFirmMatterWorkService({
    repository,
    clock: () => "2026-07-30T06:00:00.000Z",
  });
  const replay = service.createDeadline(command);
  const loaded = repository.get({
    tenant_id: TENANT,
    model_type: "MatterCalendarEvent",
    event_id: created.item.id,
  });

  assert.equal(replay.idempotent_replay, true);
  assert.equal(loaded.starts_at, command.deadline.starts_at);
  assert.equal(loaded.responsible_user_id, ACTOR);
  assert.equal(loaded.legal_consequence, "court_deadline");
  assert.equal(loaded.provider_sync_state, "provider_blocked");
  assert.equal(repository.listAudit({ tenant_id: TENANT, object_id: loaded.event_id }).length, 1);
  const beforeConflict = {
    events: repository.list({ tenant_id: TENANT, model_type: "MatterCalendarEvent" }).length,
    history: repository.list({ tenant_id: TENANT, model_type: "MatterDeadlineHistory" }).length,
    timeline: repository.list({ tenant_id: TENANT, model_type: "MatterTimelineEvent" }).length,
    audits: repository.listAudit({ tenant_id: TENANT, object_id: loaded.event_id }).length,
  };
  assert.throws(
    () => service.createDeadline({
      ...command,
      deadline: { ...command.deadline, legal_consequence: "internal" },
    }),
    /Idempotency key was already used/,
  );
  assert.equal(repository.get({
    tenant_id: TENANT,
    model_type: "MatterCalendarEvent",
    event_id: loaded.event_id,
  }).legal_consequence, "court_deadline");
  assert.deepEqual(
    {
      events: repository.list({ tenant_id: TENANT, model_type: "MatterCalendarEvent" }).length,
      history: repository.list({ tenant_id: TENANT, model_type: "MatterDeadlineHistory" }).length,
      timeline: repository.list({ tenant_id: TENANT, model_type: "MatterTimelineEvent" }).length,
      audits: repository.listAudit({ tenant_id: TENANT, object_id: loaded.event_id }).length,
    },
    beforeConflict,
  );
  assert.throws(
    () => service.createDeadline({
      ...command,
      idempotency_key: "tuw-13-invalid-timezone",
      deadline: { ...command.deadline, starts_at: "2026-08-03T16:00:00" },
    }),
    /ISO timestamp with timezone/,
  );
});

test("[TUW-14] appends one reasoned deadline history entry for an idempotent reschedule", () => {
  const repository = fixtureRepository({ tasks: false, events: false });
  const service = createSmallFirmMatterWorkService({
    repository,
    clock: () => "2026-07-30T05:00:00.000Z",
  });
  const created = service.createDeadline({
    tenant_id: TENANT,
    actor_id: ACTOR,
    idempotency_key: "tuw-14-create",
    deadline: {
      event_id: "deadline-tuw-14",
      matter_id: "matter-003",
      title: "Submission deadline",
      starts_at: "2026-08-03T09:00:00.000+09:00",
    },
  });
  const command = {
    tenant_id: TENANT,
    event_id: created.item.id,
    new_starts_at: "2026-08-04T09:00:00.000+09:00",
    actor_id: ACTOR,
    reason: "Court order changed the date",
    idempotency_key: "tuw-14-reschedule",
  };
  const first = service.rescheduleDeadline(command);
  const replay = service.rescheduleDeadline(command);
  const history = service.listDeadlineHistory({
    tenant_id: TENANT,
    event_id: created.item.id,
  });

  assert.equal(first.idempotent_replay, false);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(history.count, 2);
  assert.deepEqual(
    history.items.map(({ change_type }) => change_type),
    ["created", "rescheduled"],
  );
  assert.equal(history.items[1].previous_starts_at, "2026-08-03T09:00:00.000+09:00");
  assert.equal(history.items[1].new_starts_at, command.new_starts_at);
  assert.equal(history.items[1].reason, command.reason);
  assert.equal(repository.listAudit({ tenant_id: TENANT, object_id: created.item.id }).length, 2);
  assert.throws(
    () => service.rescheduleDeadline({
      ...command,
      new_starts_at: "2026-08-05T09:00:00.000+09:00",
    }),
    /Idempotency key was already used/,
  );
});

test("[TUW-15] merges active task due dates and calendar events once in a sorted weekly projection", () => {
  const repository = fixtureRepository();
  for (const event of [
    {
      event_id: "task-001",
      title: "Calendar row sharing a task raw ID",
      starts_at: "2026-07-27T09:00:00.000Z",
    },
    {
      event_id: "event-offset-later",
      title: "Later instant with smaller local clock text",
      starts_at: "2026-07-31T01:00:00.000-04:00",
    },
    {
      event_id: "event-offset-earlier",
      title: "Earlier instant with larger local clock text",
      starts_at: "2026-07-31T09:00:00.000+09:00",
    },
    {
      event_id: "event-task-projection",
      source_task_id: "task-001",
      title: "Explicit weekly projection of task-001",
      starts_at: "2026-07-27T09:00:00.000Z",
    },
  ]) {
    repository.create({
      model_type: "MatterCalendarEvent",
      tenant_id: TENANT,
      matter_id: "matter-003",
      status: "scheduled",
      ...event,
    });
  }
  const service = createSmallFirmMatterWorkService({
    repository: withDuplicatedCalendarReads(repository),
    clock: () => AS_OF,
  });
  const result = service.getWeekSchedule({
    tenant_id: TENANT,
    week_start: "2026-07-27",
    time_zone: TIME_ZONE,
  });
  const epochs = result.items.map(({ due_at }) => Date.parse(due_at));
  const identities = result.items.map(({ source, id }) => `${source}:${id}`);

  assert.equal(result.week_end, "2026-08-02");
  assert.equal(result.count, 21);
  assert.deepEqual(epochs, [...epochs].sort((left, right) => left - right));
  assert.equal(new Set(identities).size, result.count);
  assert.deepEqual(
    result.items.filter(({ id }) => id === "task-001").map(({ source }) => source),
    ["task", "calendar"],
  );
  assert.equal(result.items.some(({ id }) => id === "event-task-projection"), false);
  assert.deepEqual(
    result.items
      .filter(({ id }) => id.startsWith("event-offset-"))
      .map(({ id }) => id),
    ["event-offset-earlier", "event-offset-later"],
  );
  assert.equal(
    result.items.filter(({ source }) => source === "calendar").length,
    repository.list({ tenant_id: TENANT, model_type: "MatterCalendarEvent" })
      .filter(({ starts_at }) => {
        const localDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: TIME_ZONE,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(starts_at));
        return localDate >= "2026-07-27" && localDate <= "2026-08-02";
      }).length - 1,
  );
  assert.equal(result.items.some(({ source }) => source === "task"), true);
  assert.equal(result.items.some(({ source }) => source === "calendar"), true);
  for (const row of result.items) assert.equal(row.ledger_ref.id, row.id);
});

test("[RF-01 TUW-15] treats a date-only due value as Seoul local midnight for list and weekly ordering", () => {
  const matter = matterRecord(fixture.matters[2]);
  const repository = createMatterRepository({
    seedRecords: [
      matter,
      createMatterTask({
        task_id: "aa-task-date-only",
        tenant_id: TENANT,
        matter_id: matter.matter_id,
        title: "Date-only local deadline",
        status: "todo",
        created_by: ACTOR,
        due_at: "2026-08-02",
      }),
      {
        model_type: "MatterCalendarEvent",
        event_id: "event-boundary-before",
        tenant_id: TENANT,
        matter_id: matter.matter_id,
        title: "One second before local midnight",
        status: "scheduled",
        starts_at: "2026-08-01T14:59:59.000Z",
      },
      {
        model_type: "MatterCalendarEvent",
        event_id: "zz-event-offset-tie",
        tenant_id: TENANT,
        matter_id: matter.matter_id,
        title: "Same instant as the date-only deadline",
        status: "scheduled",
        starts_at: "2026-08-02T00:00:00.000+09:00",
      },
      {
        model_type: "MatterCalendarEvent",
        event_id: "event-next-local-day",
        tenant_id: TENANT,
        matter_id: matter.matter_id,
        title: "UTC date still Sunday but Seoul is Monday",
        status: "scheduled",
        starts_at: "2026-08-02T15:00:00.000Z",
      },
    ],
  });
  const service = createSmallFirmMatterWorkService({ repository, clock: () => AS_OF });
  const expectedOrder = [
    "event-boundary-before",
    "aa-task-date-only",
    "zz-event-offset-tie",
  ];

  const operational = service.listOperationalRows({ tenant_id: TENANT });
  const week = service.getWeekSchedule({
    tenant_id: TENANT,
    week_start: "2026-07-27",
    time_zone: TIME_ZONE,
  });

  assert.deepEqual(
    operational.items
      .filter(({ id }) => expectedOrder.includes(id))
      .map(({ id }) => id),
    expectedOrder,
  );
  assert.deepEqual(week.items.map(({ id }) => id), expectedOrder);
  assert.equal(week.items.some(({ id }) => id === "event-next-local-day"), false);
  assert.equal(week.count, 3);
});
