import assert from "node:assert/strict";
import test from "node:test";
import { createMatterRepository } from "../src/repository.js";

const baseInput = Object.freeze({
  model_type: "MatterWorktree",
  worktree_id: "worktree_wt_01_06_a",
  tenant_id: "tenant_wt_01_06",
  matter_id: "matter_wt_01_06",
  status: "active",
  version: 1,
  created_by: "user_wt_01_06",
  created_at: "2026-07-11T12:00:00.000Z",
  updated_by: "user_wt_01_06",
  updated_at: "2026-07-11T12:00:00.000Z",
});

test("WT-01-06 rejects a second active Worktree for the same tenant and Matter", async () => {
  // Given
  const { createActiveMatterWorktree } = await import("../src/worktree-concurrency.js");
  const repository = createMatterRepository();
  createActiveMatterWorktree(repository, baseInput);

  // When
  const createSecond = () => createActiveMatterWorktree(repository, {
    ...baseInput,
    worktree_id: "worktree_wt_01_06_b",
  });

  // Then
  assert.throws(createSecond, (error) => error.code === "WORKTREE_ACTIVE_CONFLICT");
  assert.equal(repository.list({ tenant_id: baseInput.tenant_id, model_type: "MatterWorktree" }).length, 1);
});

test("WT-01-06 permits one active Worktree beside archived history", async () => {
  // Given
  const { createActiveMatterWorktree } = await import("../src/worktree-concurrency.js");
  const repository = createMatterRepository();
  repository.create({ ...baseInput, worktree_id: "worktree_archived", status: "archived" });

  // When
  const active = createActiveMatterWorktree(repository, baseInput);

  // Then
  assert.equal(active.status, "active");
  assert.equal(repository.list({ tenant_id: baseInput.tenant_id, model_type: "MatterWorktree" }).length, 2);
});

test("WT-01-06 enforces active uniqueness at the repository boundary", () => {
  // Given
  const repository = createMatterRepository();
  repository.create(baseInput);

  // When
  const createSecond = () => repository.create({ ...baseInput, worktree_id: "worktree_repository_race" });

  // Then
  assert.throws(createSecond, /active MatterWorktree already exists/);
});

test("WT-01-06 increments version exactly once when expected version matches", async () => {
  // Given
  const { advanceMatterWorktreeVersion } = await import("../src/worktree-concurrency.js");
  const repository = createMatterRepository({ seedRecords: [baseInput] });

  // When
  const updated = advanceMatterWorktreeVersion(repository, {
    tenant_id: baseInput.tenant_id,
    worktree_id: baseInput.worktree_id,
    expected_version: 1,
    updated_by: "user_editor",
    updated_at: "2026-07-11T13:00:00.000Z",
  });

  // Then
  assert.equal(updated.version, 2);
  assert.equal(updated.updated_by, "user_editor");
  assert.equal(Object.isFrozen(updated), true);
});

test("WT-01-06 rejects stale versions without changing stored state", async () => {
  // Given
  const { advanceMatterWorktreeVersion } = await import("../src/worktree-concurrency.js");
  const repository = createMatterRepository({ seedRecords: [baseInput] });

  // When
  const staleWrite = () => advanceMatterWorktreeVersion(repository, {
    tenant_id: baseInput.tenant_id,
    worktree_id: baseInput.worktree_id,
    expected_version: 0,
    updated_by: "user_stale",
    updated_at: "2026-07-11T13:00:00.000Z",
  });

  // Then
  assert.throws(staleWrite, (error) => error.code === "WORKTREE_VERSION_CONFLICT" && error.current_version === 1);
  assert.equal(repository.get({ tenant_id: baseInput.tenant_id, model_type: "MatterWorktree", id: baseInput.worktree_id }).version, 1);
});

test("WT-01-06 scopes active uniqueness by tenant", async () => {
  // Given
  const { createActiveMatterWorktree } = await import("../src/worktree-concurrency.js");
  const repository = createMatterRepository();
  createActiveMatterWorktree(repository, baseInput);

  // When
  const otherTenant = createActiveMatterWorktree(repository, {
    ...baseInput,
    tenant_id: "tenant_wt_01_06_other",
    worktree_id: "worktree_wt_01_06_other",
  });

  // Then
  assert.equal(otherTenant.tenant_id, "tenant_wt_01_06_other");
});
