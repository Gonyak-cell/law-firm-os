import assert from "node:assert/strict";
import test from "node:test";
import {
  createMatterRepository,
  createOutlookMatterTask,
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
  return { repository, peopleAssignmentAuthority };
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

  const updated = updateOutlookMatterTask({
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
  });

  assert.equal(updated.outcome, "task_updated");
  assert.equal(updated.item.version, 2);
  assert.equal(updated.item.assigned_to_user_id, ASSIGNEE);
  assert.equal(updated.item.due_at, "2026-08-11T08:30:00.000Z");
  assert.equal(updated.item.status, "in_progress");

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

  const completed = updateOutlookMatterTask({
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    task_id: created.item.activity_id,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-update-done",
    expected_version: 2,
    patch: { status: "done" },
  });
  assert.equal(completed.item.version, 3);
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
