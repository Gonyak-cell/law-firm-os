import assert from "node:assert/strict";
import test from "node:test";
import { createMatterRepository } from "../src/repository.js";

const taskInput = Object.freeze({
  model_type: "MatterTask",
  task_id: "task_wt_01_09",
  tenant_id: "tenant_wt_01_09",
  matter_id: "matter_wt_01_09",
  title: "워크트리 업무",
  status: "todo",
  created_by: "user_wt_01_09",
});

function auditCollector() {
  const events = [];
  return { events, audit: { append(event) { events.push(event); } } };
}

test("WT-01-09 completes todo directly through MatterTask.status", async () => {
  // Given
  const { completeMatterTask } = await import("../src/task-service.js");
  const repository = createMatterRepository({ seedRecords: [taskInput] });
  const { events, audit } = auditCollector();

  // When
  const completed = completeMatterTask({ repository, task: taskInput, actor_id: "user_wt_01_09", audit });

  // Then
  assert.equal(completed.status, "done");
  assert.equal(completed.version, 2);
  assert.equal(Object.hasOwn(completed, "completed"), false);
  assert.equal(events.length, 1);
  assert.equal(events[0].metadata.to_status, "done");
});

test("WT-01-09 rejects blocked completion without changing MatterTask", async () => {
  // Given
  const { completeMatterTask } = await import("../src/task-service.js");
  const blocked = { ...taskInput, status: "blocked" };
  const repository = createMatterRepository({ seedRecords: [blocked] });

  // When
  const completeBlocked = () => completeMatterTask({ repository, task: blocked, actor_id: "user_wt_01_09" });

  // Then
  assert.throws(completeBlocked, /cannot transition from blocked to done/);
  assert.equal(repository.get({ tenant_id: blocked.tenant_id, model_type: "MatterTask", id: blocked.task_id }).status, "blocked");
});

test("WT-01-09 reopens done to in_progress only with a reason", async () => {
  // Given
  const { reopenMatterTask } = await import("../src/task-service.js");
  const done = { ...taskInput, status: "done" };
  const repository = createMatterRepository({ seedRecords: [done] });

  // When
  const reopenWithoutReason = () => reopenMatterTask({ repository, task: done, actor_id: "user_wt_01_09", reason: "" });

  // Then
  assert.throws(reopenWithoutReason, /reason is required/);
  assert.equal(repository.get({ tenant_id: done.tenant_id, model_type: "MatterTask", id: done.task_id }).status, "done");
});

test("WT-01-09 persists a reasoned reopen to in_progress", async () => {
  // Given
  const { reopenMatterTask } = await import("../src/task-service.js");
  const done = { ...taskInput, status: "done" };
  const repository = createMatterRepository({ seedRecords: [done] });
  const { events, audit } = auditCollector();

  // When
  const reopened = reopenMatterTask({ repository, task: done, actor_id: "user_wt_01_09", reason: "후속 검토 필요", audit });

  // Then
  assert.equal(reopened.status, "in_progress");
  assert.equal(reopened.version, 2);
  assert.equal(events[0].reason, "후속 검토 필요");
});

test("WT-01-09 unblocks blocked tasks only with a reason", async () => {
  // Given
  const { unblockMatterTask } = await import("../src/task-service.js");
  const blocked = { ...taskInput, status: "blocked" };
  const repository = createMatterRepository({ seedRecords: [blocked] });

  // When
  const unblocked = unblockMatterTask({ repository, task: blocked, actor_id: "user_wt_01_09", reason: "의존 자료 수령" });

  // Then
  assert.equal(unblocked.status, "in_progress");
  assert.equal(unblocked.version, 2);
});
