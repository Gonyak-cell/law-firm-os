import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createMatterRepository,
  createOutlookMatterTask,
  updateOutlookMatterTask,
} from "../src/index.js";

const TENANT = "tenant_outlook_task";
const MATTER = "matter_outlook_task";
const ACTOR = "user_outlook_actor";

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
  return { repository, clock: () => "2026-08-08T12:00:00.000Z" };
}

test("Outlook task idempotency is bound to the signed actor across restart and fails closed for legacy receipts", () => {
  const filePath = join(mkdtempSync(join(tmpdir(), "outlook-task-actor-replay-")), "matter.json");
  const initial = fixture();
  const durableRepository = createMatterRepository({
    filePath,
    seedRecords: initial.repository.list(),
  });
  const createInput = {
    ...initial,
    repository: durableRepository,
    tenant_id: TENANT,
    matter_id: MATTER,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-actor-bound-create",
    task: { title: "행위자 귀속 업무", due_at: "2026-08-12" },
  };

  const created = createOutlookMatterTask(createInput);
  const sameActorReplay = createOutlookMatterTask(createInput);
  assert.equal(sameActorReplay.outcome, "idempotent_replay");
  assert.equal(durableRepository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: createInput.idempotency_key,
  }).actor_id, ACTOR);

  const durableCounts = () => ({
    tasks: durableRepository.list({ tenant_id: TENANT, model_type: "MatterTask" }).length,
    audits: durableRepository.listAudit({ tenant_id: TENANT }).length,
    timeline: durableRepository.list({
      tenant_id: TENANT,
      model_type: "MatterTimelineEvent",
      matter_id: MATTER,
    }).length,
    idempotency: durableRepository.snapshot().idempotency.length,
  });
  const beforeCrossActorCreate = durableCounts();
  assert.throws(() => createOutlookMatterTask({
    ...createInput,
    actor_id: "signed-actor-b",
  }), (error) => (
    error.status === 409
    && error.safe_error_code === "OUTLOOK_TASK_IDEMPOTENCY_CONFLICT"
    && error.message === "Outlook task idempotency entry conflicts with the request"
    && !error.message.includes(ACTOR)
  ));
  assert.deepEqual(durableCounts(), beforeCrossActorCreate);

  const updateInput = {
    ...initial,
    repository: durableRepository,
    tenant_id: TENANT,
    matter_id: MATTER,
    task_id: created.item.activity_id,
    actor_id: ACTOR,
    idempotency_key: "outlook-task-actor-bound-update",
    expected_version: 1,
    patch: { title: "행위자 귀속 업무 확정" },
  };
  const updated = updateOutlookMatterTask(updateInput);
  assert.equal(updateOutlookMatterTask(updateInput).outcome, "idempotent_replay");
  const beforeCrossActorUpdate = durableCounts();
  assert.throws(() => updateOutlookMatterTask({
    ...updateInput,
    actor_id: "signed-actor-b",
  }), (error) => (
    error.status === 409
    && error.safe_error_code === "OUTLOOK_TASK_IDEMPOTENCY_CONFLICT"
    && error.message === "Outlook task idempotency entry conflicts with the request"
    && !error.message.includes(ACTOR)
  ));
  assert.deepEqual(durableCounts(), beforeCrossActorUpdate);
  assert.equal(durableRepository.get({
    tenant_id: TENANT,
    model_type: "MatterTask",
    task_id: created.item.activity_id,
  }).title, updated.item.title);

  durableRepository.close();
  const restartedRepository = createMatterRepository({ filePath });
  const restartedReplay = createOutlookMatterTask({ ...createInput, repository: restartedRepository });
  assert.equal(restartedReplay.outcome, "idempotent_replay");
  assert.equal(restartedReplay.audit_event.actor_id, ACTOR);
  const beforeRestartCrossActor = restartedRepository.snapshot();
  assert.throws(() => createOutlookMatterTask({
    ...createInput,
    repository: restartedRepository,
    actor_id: "signed-actor-b",
  }), (error) => error.status === 409 && error.safe_error_code === "OUTLOOK_TASK_IDEMPOTENCY_CONFLICT");
  assert.deepEqual(restartedRepository.snapshot(), beforeRestartCrossActor);

  const legacyKey = "outlook-task-legacy-no-actor";
  const originalReceipt = restartedRepository.getIdempotency({
    tenant_id: TENANT,
    idempotency_key: createInput.idempotency_key,
  });
  restartedRepository.recordIdempotency({
    ...originalReceipt,
    idempotency_key: legacyKey,
    actor_id: null,
  });
  const beforeLegacyTakeover = restartedRepository.snapshot();
  assert.throws(() => createOutlookMatterTask({
    ...createInput,
    repository: restartedRepository,
    idempotency_key: legacyKey,
  }), (error) => error.status === 409 && error.safe_error_code === "OUTLOOK_TASK_IDEMPOTENCY_CONFLICT");
  assert.deepEqual(restartedRepository.snapshot(), beforeLegacyTakeover);
});
