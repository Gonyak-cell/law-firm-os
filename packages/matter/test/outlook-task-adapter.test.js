import assert from "node:assert/strict";
import test from "node:test";
import {
  createMatterRepository,
  createOutlookMatterTask,
  transitionMatterTask,
  updateOutlookMatterTask,
} from "../src/index.js";

const TENANT = "tenant_outlook_task";
const MATTER = "matter_outlook_task";
const ACTOR = "user_outlook_actor";
const ASSIGNEE = "user_outlook_assignee";

function fixture() {
  const repository = createMatterRepository({
    seedRecords: [{
      model_type: "Matter",
      tenant_id: TENANT,
      matter_id: MATTER,
      matter_code: "AMIC/LIT/2026/001",
      client_id: "client_outlook_task",
      matter_name: "Outlook task adapter",
      title: "Outlook task adapter",
      status: "open",
      permission_envelope_id: "perm:outlook-task",
      audit_trace_id: "audit:outlook-task",
      created_by: ACTOR,
      created_at: "2026-08-08T00:00:00.000Z",
    }],
  });
  const peopleAssignmentAuthority = {
    resolveTaskAssignee({ tenant_id, matter_id, user_id }) {
      return tenant_id === TENANT && matter_id === MATTER && user_id === ASSIGNEE
        ? { state: "resolved", user_id }
        : { state: "unresolved", reason: "not_an_active_matter_member" };
    },
  };
  return {
    repository,
    peopleAssignmentAuthority,
    clock: () => "2026-08-08T12:00:00.000Z",
  };
}

test("Outlook task adapter creates once without auto-assigning and replays the receipt", () => {
  const runtime = fixture();
  const input = {
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-create-1",
    source_email_thread_id: "thread:outlook-task-source",
    task: {
      title: "의견서 초안 검토",
      due_at: "2026-08-10T09:00:00.000Z",
      estimated_minutes: 45,
      status: "todo",
    },
  };

  const created = createOutlookMatterTask(input);
  const replay = createOutlookMatterTask(input);

  assert.equal(created.outcome, "task_created");
  assert.equal(created.item.assigned_to_user_id, null);
  assert.equal(created.item.version, 1);
  assert.equal(created.item.source_ref, "DmsEmailThread:thread:outlook-task-source");
  assert.equal(created.timeline_event.source_ref, "DmsEmailThread:thread:outlook-task-source");
  assert.equal(created.audit_event.actor_id, ACTOR);
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(replay.item.activity_id, created.item.activity_id);
  assert.equal(runtime.repository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length, 1);
  assert.equal(runtime.repository.listAudit({ tenant_id: TENANT, object_id: created.item.activity_id }).length, 1);
  assert.equal(runtime.repository.list({ tenant_id: TENANT, model_type: "MatterTimelineEvent", matter_id: MATTER }).length, 1);

  assert.throws(() => createOutlookMatterTask({
    ...input,
    task: { ...input.task, title: "같은 키의 다른 업무" },
  }), (error) => error.status === 409 && error.safe_error_code === "OUTLOOK_TASK_IDEMPOTENCY_CONFLICT");
});

test("Outlook task adapter edits task fields with optimistic version and authoritative assignee", () => {
  const runtime = fixture();
  const created = createOutlookMatterTask({
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-create-2",
    task: { title: "증거 목록 검토" },
  });

  const updateInput = {
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    task_id: created.item.activity_id,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-update-2",
    expected_version: 1,
    patch: {
      title: "증거 목록 확정",
      assigned_to_user_id: ASSIGNEE,
      due_at: "2026-08-11T08:30:00.000Z",
      estimated_minutes: 30,
      status: "in_progress",
    },
  };
  const updated = updateOutlookMatterTask(updateInput);

  assert.equal(updated.outcome, "task_updated");
  assert.equal(updated.item.version, 2);
  assert.equal(updated.item.assigned_to_user_id, ASSIGNEE);
  assert.equal(updated.item.due_at, "2026-08-11T08:30:00.000Z");
  assert.equal(updated.item.status, "in_progress");

  const auditCount = runtime.repository.listAudit({ tenant_id: TENANT }).length;
  const timelineCount = runtime.repository.list({
    tenant_id: TENANT,
    model_type: "MatterTimelineEvent",
    matter_id: MATTER,
  }).length;
  const replay = updateOutlookMatterTask(updateInput);
  assert.equal(replay.outcome, "idempotent_replay");
  assert.equal(replay.item.version, 2);
  assert.equal(runtime.repository.listAudit({ tenant_id: TENANT }).length, auditCount);
  assert.equal(runtime.repository.list({
    tenant_id: TENANT,
    model_type: "MatterTimelineEvent",
    matter_id: MATTER,
  }).length, timelineCount);
  assert.throws(() => updateOutlookMatterTask({
    ...updateInput,
    patch: { ...updateInput.patch, title: "같은 키의 다른 수정" },
  }), (error) => error.status === 409 && error.safe_error_code === "OUTLOOK_TASK_IDEMPOTENCY_CONFLICT");
  assert.equal(runtime.repository.listAudit({ tenant_id: TENANT }).length, auditCount);
  assert.equal(runtime.repository.list({
    tenant_id: TENANT,
    model_type: "MatterTimelineEvent",
    matter_id: MATTER,
  }).length, timelineCount);

  assert.throws(() => updateOutlookMatterTask({
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    task_id: created.item.activity_id,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-update-stale",
    expected_version: 1,
    patch: { status: "done" },
  }), (error) => error.status === 409 && error.safe_error_code === "OUTLOOK_TASK_VERSION_CONFLICT");
  assert.equal(runtime.repository.get({
    tenant_id: TENANT,
    model_type: "MatterTask",
    task_id: created.item.activity_id,
  }).status, "in_progress");

  const completedInput = {
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    task_id: created.item.activity_id,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-update-done",
    expected_version: 2,
    patch: { status: "done" },
  };
  const completed = updateOutlookMatterTask(completedInput);
  assert.equal(completed.item.version, 3);
  assert.notEqual(completed.audit_event.event_id, updated.audit_event.event_id);
  assert.notEqual(completed.timeline_event.event_id, updated.timeline_event.event_id);

  const auditEvents = runtime.repository.listAudit({
    tenant_id: TENANT,
    object_id: created.item.activity_id,
  });
  const timelineEvents = runtime.repository.list({
    tenant_id: TENANT,
    model_type: "MatterTimelineEvent",
    matter_id: MATTER,
  });
  assert.deepEqual(auditEvents.map(({ action }) => action), [
    "matter.activity.created",
    "matter.task.transition",
    "matter.activity.patched",
    "matter.task.transition",
    "matter.activity.patched",
  ]);
  assert.deepEqual(timelineEvents.map(({ type }) => type), [
    "matter.activity.task",
    "matter.activity.updated",
    "matter.activity.updated",
  ]);
  assert.equal(new Set(auditEvents.map(({ event_id }) => event_id)).size, auditEvents.length);
  assert.equal(new Set(timelineEvents.map(({ event_id }) => event_id)).size, timelineEvents.length);
  for (const idempotency_key of ["outlook-task-update-2", "outlook-task-update-done"]) {
    assert.ok(runtime.repository.getIdempotency({ tenant_id: TENANT, idempotency_key }));
  }

  const completedReplay = updateOutlookMatterTask(completedInput);
  assert.equal(completedReplay.outcome, "idempotent_replay");
  assert.equal(completedReplay.audit_event.event_id, completed.audit_event.event_id);
  assert.equal(completedReplay.timeline_event.event_id, completed.timeline_event.event_id);
  assert.equal(runtime.repository.listAudit({ tenant_id: TENANT }).length, auditEvents.length);
  assert.equal(runtime.repository.list({
    tenant_id: TENANT,
    model_type: "MatterTimelineEvent",
    matter_id: MATTER,
  }).length, timelineEvents.length);
  assert.throws(() => updateOutlookMatterTask({
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    task_id: created.item.activity_id,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-update-invalid-transition",
    expected_version: 3,
    patch: { status: "cancelled" },
  }), /cannot transition from done to cancelled/u);
  assert.equal(runtime.repository.get({
    tenant_id: TENANT,
    model_type: "MatterTask",
    task_id: created.item.activity_id,
  }).version, 3);
});

test("Outlook task adapter rejects a stale version after a canonical task transition", () => {
  const runtime = fixture();
  const created = createOutlookMatterTask({
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-intervening-create",
    task: { title: "공유 writer 버전 검증" },
  });
  const current = runtime.repository.get({
    tenant_id: TENANT,
    model_type: "MatterTask",
    task_id: created.item.activity_id,
  });
  const transitioned = transitionMatterTask({
    repository: runtime.repository,
    task: current,
    to_status: "in_progress",
    actor_id: ASSIGNEE,
    reason: "intervening_writer",
  });
  assert.equal(transitioned.version, 2);
  assert.throws(() => updateOutlookMatterTask({
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    task_id: created.item.activity_id,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-intervening-stale",
    expected_version: 1,
    patch: { title: "stale overwrite" },
  }), (error) => error.status === 409 && error.safe_error_code === "OUTLOOK_TASK_VERSION_CONFLICT");
  assert.equal(runtime.repository.get({
    tenant_id: TENANT,
    model_type: "MatterTask",
    task_id: created.item.activity_id,
  }).title, "공유 writer 버전 검증");
});

test("Outlook task adapter canonicalizes supported due values and rejects ambiguous dates", () => {
  const runtime = fixture();
  const dateOnly = createOutlookMatterTask({
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-date-only",
    task: { title: "날짜 업무", due_at: "2026-08-12" },
  });
  const dateTime = createOutlookMatterTask({
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-date-time",
    task: { title: "일시 업무", due_at: "2026-08-12T09:30:00+09:00" },
  });
  assert.equal(dateOnly.item.due_at, "2026-08-12");
  assert.equal(dateTime.item.due_at, "2026-08-12T00:30:00.000Z");

  for (const [idempotency_key, due_at] of [
    ["outlook-task-locale-date", "March 4, 2027 09:30"],
    ["outlook-task-impossible-date", "2027-02-30"],
    ["outlook-task-impossible-time", "2027-02-28T25:00:00Z"],
  ]) {
    assert.throws(() => createOutlookMatterTask({
      ...runtime,
      tenant_id: TENANT,
      matter_id: MATTER,
      actor_id: ACTOR,
      idempotency_key,
      task: { title: "잘못된 마감", due_at },
    }), /must be ISO date or date-time/u);
  }

  const cleared = updateOutlookMatterTask({
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    task_id: dateTime.item.activity_id,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-clear-due",
    expected_version: 1,
    patch: { due_at: null },
  });
  assert.equal(cleared.item.due_at, null);
  assert.equal(cleared.item.version, 2);
  assert.throws(() => updateOutlookMatterTask({
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    task_id: dateOnly.item.activity_id,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-invalid-patch-date",
    expected_version: 1,
    patch: { due_at: "tomorrow morning" },
  }), /must be ISO date or date-time/u);
  assert.equal(runtime.repository.get({
    tenant_id: TENANT,
    model_type: "MatterTask",
    task_id: dateOnly.item.activity_id,
  }).due_at, "2026-08-12");
});

test("Outlook task adapter rejects invalid input and rolls back failed assignment", () => {
  const runtime = fixture();
  const base = {
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-invalid",
  };

  assert.throws(() => createOutlookMatterTask({ ...base, task: { title: "두 줄\n업무" } }), /one line/u);
  assert.throws(() => createOutlookMatterTask({ ...base, matter_id: "matter_missing", task: { title: "없는 Matter" } }), (error) => error.status === 404);
  assert.throws(() => createOutlookMatterTask({ ...base, task: { title: "잘못된 시간", estimated_minutes: 0 } }), /positive integer/u);
  assert.throws(() => createOutlookMatterTask({
    ...base,
    task: { title: "외부 담당자", assigned_to_user_id: "user_foreign" },
  }), /not authoritative/u);
  assert.equal(runtime.repository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length, 0);
  assert.equal(runtime.repository.getIdempotency({ tenant_id: TENANT, idempotency_key: base.idempotency_key }), undefined);
});

test("Outlook task adapter rolls back task, audit, and timeline when its receipt cannot persist", () => {
  const runtime = fixture();
  let failingRepository;
  failingRepository = Object.freeze({
    ...runtime.repository,
    transaction(fn) {
      return runtime.repository.transaction(() => fn(failingRepository));
    },
    recordIdempotency() {
      throw new Error("synthetic idempotency persistence failure");
    },
  });

  assert.throws(() => createOutlookMatterTask({
    ...runtime,
    repository: failingRepository,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-rollback",
    task: { title: "원자성 검증 업무" },
  }), /synthetic idempotency persistence failure/u);
  assert.equal(runtime.repository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length, 0);
  assert.equal(runtime.repository.list({ tenant_id: TENANT, model_type: "MatterTimelineEvent" }).length, 0);
  assert.equal(runtime.repository.listAudit({ tenant_id: TENANT }).length, 0);
  assert.equal(runtime.repository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: "outlook-task-rollback",
  }), undefined);
});
