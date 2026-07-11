import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMatterRepository } from "../src/repository.js";

const timestamp = "2026-07-11T12:00:00.000Z";

function mutationCommand(overrides = {}) {
  return {
    tenant_id: "tenant_wt_01_10",
    idempotency_key: "idem_wt_01_10",
    operation: "create",
    actor_id: "user_wt_01_10",
    reason: "워크트리 생성",
    source_ref: "matter-worktree-ui",
    object_type: "MatterWorktree",
    object_id: "worktree_wt_01_10",
    occurred_at: timestamp,
    request_id: "req_wt_01_10",
    ...overrides,
  };
}

function worktreeInput() {
  return {
    model_type: "MatterWorktree",
    worktree_id: "worktree_wt_01_10",
    tenant_id: "tenant_wt_01_10",
    matter_id: "matter_wt_01_10",
    status: "active",
    version: 1,
    created_by: "user_wt_01_10",
    created_at: timestamp,
    updated_by: "user_wt_01_10",
    updated_at: timestamp,
  };
}

test("WT-01-10 replays the same mutation key without a second state or audit write", async () => {
  // Given
  const { executeWorktreeMutation } = await import("../src/worktree-mutation.js");
  const repository = createMatterRepository();
  let mutationCalls = 0;
  const mutate = (transaction) => {
    mutationCalls += 1;
    return { worktree: transaction.create(worktreeInput()) };
  };

  // When
  const first = executeWorktreeMutation(repository, mutationCommand(), mutate);
  const replay = executeWorktreeMutation(repository, mutationCommand(), mutate);

  // Then
  assert.equal(first.idempotent_replay, false);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(mutationCalls, 1);
  assert.equal(repository.list({ tenant_id: "tenant_wt_01_10", model_type: "MatterWorktree" }).length, 1);
  assert.equal(repository.listAudit({ tenant_id: "tenant_wt_01_10" }).length, 1);
});

test("WT-01-10 records actor, reason, source reference, and object identity", async () => {
  // Given
  const { executeWorktreeMutation } = await import("../src/worktree-mutation.js");
  const repository = createMatterRepository();

  // When
  executeWorktreeMutation(repository, mutationCommand(), (transaction) => ({ worktree: transaction.create(worktreeInput()) }));
  const [event] = repository.listAudit({ tenant_id: "tenant_wt_01_10" });

  // Then
  assert.equal(event.actor_id, "user_wt_01_10");
  assert.equal(event.reason, "워크트리 생성");
  assert.equal(event.source_ref, "matter-worktree-ui");
  assert.equal(event.object_type, "MatterWorktree");
  assert.equal(event.object_id, "worktree_wt_01_10");
});

test("WT-01-10 rejects missing mutation evidence before invoking the write", async () => {
  // Given
  const { executeWorktreeMutation } = await import("../src/worktree-mutation.js");
  const repository = createMatterRepository();
  let mutationCalls = 0;

  // When
  const executeWithoutKey = () => executeWorktreeMutation(
    repository,
    mutationCommand({ idempotency_key: "" }),
    () => { mutationCalls += 1; },
  );

  // Then
  assert.throws(executeWithoutKey, /idempotency_key is required/);
  assert.equal(mutationCalls, 0);
});

test("WT-01-10 rolls back partial writes when a mutation fails", async () => {
  // Given
  const { executeWorktreeMutation } = await import("../src/worktree-mutation.js");
  const repository = createMatterRepository();

  // When
  const failingMutation = () => executeWorktreeMutation(repository, mutationCommand(), (transaction) => {
    transaction.create(worktreeInput());
    throw new Error("synthetic mutation failure");
  });

  // Then
  assert.throws(failingMutation, /synthetic mutation failure/);
  assert.equal(repository.list({ tenant_id: "tenant_wt_01_10", model_type: "MatterWorktree" }).length, 0);
  assert.equal(repository.listAudit({ tenant_id: "tenant_wt_01_10" }).length, 0);
  assert.equal(repository.getIdempotency({ tenant_id: "tenant_wt_01_10", idempotency_key: "idem_wt_01_10" }), undefined);
});

test("WT-01-10 makes Worktree task completion idempotent with one audit event", async () => {
  // Given
  const { completeMatterTask } = await import("../src/task-service.js");
  const task = { model_type: "MatterTask", task_id: "task_wt_01_10", tenant_id: "tenant_wt_01_10", matter_id: "matter_wt_01_10", title: "완료 업무", status: "todo", created_by: "user_wt_01_10" };
  const repository = createMatterRepository({ seedRecords: [task] });
  const options = { repository, task, actor_id: "user_wt_01_10", idempotency_key: "idem_task_wt_01_10", source_ref: "worktree-checkbox", occurred_at: timestamp, request_id: "req_task_wt_01_10" };

  // When
  const first = completeMatterTask(options);
  const replay = completeMatterTask(options);

  // Then
  assert.equal(first.status, "done");
  assert.equal(first.idempotent_replay, false);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(repository.listAudit({ tenant_id: "tenant_wt_01_10" }).length, 1);
});

test("Worktree idempotency refuses a key reused for another operation, actor, object, or payload", async () => {
  const { executeWorktreeMutation, MatterWorktreeIdempotencyError } = await import("../src/worktree-mutation.js");
  const repository = createMatterRepository();
  executeWorktreeMutation(repository, mutationCommand({ request_fingerprint: { title: "A" } }), () => ({ item: { id: "matter-a" } }));

  for (const command of [
    mutationCommand({ operation: "patch" }),
    mutationCommand({ actor_id: "user_other" }),
    mutationCommand({ reason: "다른 변경 사유" }),
    mutationCommand({ object_id: "worktree_other" }),
    mutationCommand({ request_fingerprint: { title: "B" } }),
  ]) {
    assert.throws(
      () => executeWorktreeMutation(repository, command, () => ({ item: { id: "should-not-run" } })),
      (error) => error instanceof MatterWorktreeIdempotencyError && error.code === "WORKTREE_IDEMPOTENCY_CONFLICT",
    );
  }
});

test("repository restores transaction depth after a commit persistence failure", () => {
  let failNextWrite = true;
  const writes = [];
  const repository = createMatterRepository({
    filePath: "/virtual/matter.json",
    writeState({ value }) {
      if (failNextWrite) {
        failNextWrite = false;
        throw new Error("synthetic durable write failure");
      }
      writes.push(structuredClone(value));
    },
  });

  assert.throws(() => repository.transaction((transaction) => {
    transaction.create(worktreeInput());
  }), /synthetic durable write failure/);

  repository.transaction((transaction) => {
    transaction.create(worktreeInput());
    transaction.appendAudit({ tenant_id: "tenant_wt_01_10", event_id: "event-after-recovery" });
  });

  assert.equal(writes.length, 1);
  assert.equal(writes[0].records.length, 1);
  assert.equal(writes[0].audit_events.length, 1);
});

test("repository transactions do not expose intermediate durable states", () => {
  const dir = mkdtempSync(join(tmpdir(), "matter-worktree-atomic-"));
  const filePath = join(dir, "matter.json");
  const repository = createMatterRepository({ filePath });

  repository.transaction((transaction) => {
    transaction.create(worktreeInput());
    assert.equal(existsSync(filePath), false);
  });

  const after = JSON.parse(readFileSync(filePath, "utf8"));
  assert.equal(after.records.some(({ model_type }) => model_type === "MatterWorktree"), true);
});
