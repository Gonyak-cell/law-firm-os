import assert from "node:assert/strict";
import test from "node:test";

const worktreeInput = Object.freeze({
  worktree_id: "worktree_wt_01_02",
  tenant_id: "tenant_wt_01_02",
  matter_id: "matter_wt_01_02",
  status: "active",
  version: 1,
  created_by: "user_wt_01_02",
  created_at: "2026-07-11T12:00:00.000Z",
  updated_by: "user_wt_01_02",
  updated_at: "2026-07-11T12:00:00.000Z",
});

const branchInput = Object.freeze({
  node_id: "node_wt_01_02_branch",
  worktree_id: worktreeInput.worktree_id,
  tenant_id: worktreeInput.tenant_id,
  matter_id: worktreeInput.matter_id,
  node_type: "branch",
  parent_node_id: null,
  title: "준비 단계",
  sort_order: 0,
  status: "active",
  task_id: null,
});

test("WT-01-02 registers MatterWorktree and MatterWorktreeNode factories", async () => {
  // Given
  const registry = await import("../src/registry.js");
  const model = await import("../src/model.js");

  // When
  const modelTypes = registry.listMatterCoreModelTypes();

  // Then
  assert.equal(modelTypes.includes("MatterWorktree"), true);
  assert.equal(modelTypes.includes("MatterWorktreeNode"), true);
  assert.equal(typeof model.createMatterWorktree, "function");
  assert.equal(typeof model.createMatterWorktreeNode, "function");
});

test("WT-01-02 creates immutable worktree and node records", async () => {
  // Given
  const { createMatterCoreRecord } = await import("../src/model.js");

  // When
  const worktree = createMatterCoreRecord("MatterWorktree", worktreeInput);
  const branch = createMatterCoreRecord("MatterWorktreeNode", branchInput);

  // Then
  assert.equal(Object.isFrozen(worktree), true);
  assert.equal(Object.isFrozen(branch), true);
  assert.equal(worktree.version, 1);
  assert.equal(branch.parent_node_id, null);
  assert.equal(branch.task_id, null);
});

test("WT-01-02 rejects missing required worktree and node fields", async () => {
  // Given
  const { createMatterCoreRecord } = await import("../src/model.js");

  // When
  const createWorktreeWithoutVersion = () => createMatterCoreRecord("MatterWorktree", { ...worktreeInput, version: undefined });
  const createNodeWithoutParentKey = () => {
    const { parent_node_id, ...input } = branchInput;
    return createMatterCoreRecord("MatterWorktreeNode", input);
  };

  // Then
  assert.throws(createWorktreeWithoutVersion, /MatterWorktree missing required fields: version/);
  assert.throws(createNodeWithoutParentKey, /MatterWorktreeNode missing required fields: parent_node_id/);
});

test("WT-01-02 rejects invalid node types and invalid task links", async () => {
  // Given
  const { createMatterCoreRecord } = await import("../src/model.js");

  // When
  const createRoot = () => createMatterCoreRecord("MatterWorktreeNode", { ...branchInput, node_type: "root" });
  const createBranchWithTask = () => createMatterCoreRecord("MatterWorktreeNode", { ...branchInput, task_id: "task_forbidden" });
  const createTaskWithoutLink = () => createMatterCoreRecord("MatterWorktreeNode", { ...branchInput, node_type: "task" });

  // Then
  assert.throws(createRoot, /node_type must be one of branch, task/);
  assert.throws(createBranchWithTask, /branch node task_id must be null/);
  assert.throws(createTaskWithoutLink, /task node requires task_id/);
});

test("WT-01-02 rejects non-positive worktree versions", async () => {
  // Given
  const { createMatterCoreRecord } = await import("../src/model.js");

  // When
  const createZeroVersion = () => createMatterCoreRecord("MatterWorktree", { ...worktreeInput, version: 0 });

  // Then
  assert.throws(createZeroVersion, /version must be a positive integer/);
});
