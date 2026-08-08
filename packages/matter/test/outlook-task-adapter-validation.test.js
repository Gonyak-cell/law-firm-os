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

test("Outlook task adapter rejects null status without any durable side effect", () => {
  const runtime = fixture();
  const created = createOutlookMatterTask({
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-null-status-create",
    task: { title: "상태 검증 업무" },
  });
  const ref = {
    tenant_id: TENANT,
    model_type: "MatterTask",
    task_id: created.item.activity_id,
  };
  const before = runtime.repository.get(ref);
  const auditCount = runtime.repository.listAudit({ tenant_id: TENANT }).length;
  const timelineCount = runtime.repository.list({
    tenant_id: TENANT,
    model_type: "MatterTimelineEvent",
    matter_id: MATTER,
  }).length;
  const idempotencyKey = "outlook-task-null-status-update";

  assert.throws(() => updateOutlookMatterTask({
    ...runtime,
    tenant_id: TENANT,
    matter_id: MATTER,
    task_id: created.item.activity_id,
    actor_id: ACTOR,
    idempotency_key: idempotencyKey,
    expected_version: 1,
    patch: { status: null },
  }), /status is invalid/u);
  assert.deepEqual(runtime.repository.get(ref), before);
  assert.equal(runtime.repository.listAudit({ tenant_id: TENANT }).length, auditCount);
  assert.equal(runtime.repository.list({
    tenant_id: TENANT,
    model_type: "MatterTimelineEvent",
    matter_id: MATTER,
  }).length, timelineCount);
  assert.equal(runtime.repository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: idempotencyKey,
  }), undefined);
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
