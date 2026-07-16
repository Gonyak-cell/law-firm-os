import assert from "node:assert/strict";
import test from "node:test";

const worktree = Object.freeze({ worktree_id: "worktree_wt_01_08", tenant_id: "tenant_wt_01_08", matter_id: "matter_wt_01_08" });
const matter = Object.freeze({ matter_id: "matter_wt_01_08", tenant_id: "tenant_wt_01_08", title: "[QA] Projection Matter" });
const nodes = Object.freeze([
  Object.freeze({ node_id: "branch", node_type: "branch", parent_node_id: null, sort_order: 0, status: "active", task_id: null }),
  Object.freeze({ node_id: "linked_done", node_type: "task", parent_node_id: "branch", sort_order: 0, status: "active", task_id: "task_done" }),
]);
const tasks = Object.freeze([
  Object.freeze({ task_id: "task_done", tenant_id: "tenant_wt_01_08", matter_id: "matter_wt_01_08", title: "완료 업무", status: "done", due_at: "2026-07-09T09:00:00.000Z" }),
  Object.freeze({ task_id: "task_todo", tenant_id: "tenant_wt_01_08", matter_id: "matter_wt_01_08", title: "기한 초과 업무", status: "todo", due_at: "2026-07-10T09:00:00.000Z" }),
  Object.freeze({ task_id: "task_blocked", tenant_id: "tenant_wt_01_08", matter_id: "matter_wt_01_08", title: "차단 업무", status: "blocked", due_at: "2026-07-15T09:00:00.000Z" }),
  Object.freeze({ task_id: "task_cancelled", tenant_id: "tenant_wt_01_08", matter_id: "matter_wt_01_08", title: "취소 업무", status: "cancelled", due_at: "2026-07-08T09:00:00.000Z" }),
]);

test("WT-01-08 computes progress, blocked, and overdue counts from MatterTask status", async () => {
  // Given
  const { projectMatterWorktree } = await import("../src/worktree-projection.js");

  // When
  const projection = projectMatterWorktree({ worktree, matter, nodes, tasks, as_of: "2026-07-11T12:00:00.000Z" });

  // Then
  assert.deepEqual(projection.progress, { done: 1, total: 3, percent: 33.3, blocked: 1, overdue: 1 });
  assert.equal(Object.hasOwn(worktree, "progress"), false);
});

test("WT-01-08 projects every unlinked Task exactly once under the virtual unclassified branch", async () => {
  // Given
  const { projectMatterWorktree } = await import("../src/worktree-projection.js");

  // When
  const projection = projectMatterWorktree({ worktree, matter, nodes, tasks, as_of: "2026-07-11T12:00:00.000Z" });
  const projectedTaskIds = [
    ...projection.nodes.filter(({ node_type }) => node_type === "task").map(({ task }) => task.task_id),
    ...projection.unclassified.tasks.map(({ task_id }) => task_id),
  ];

  // Then
  assert.deepEqual(projectedTaskIds.toSorted(), tasks.map(({ task_id }) => task_id).toSorted());
  assert.equal(new Set(projectedTaskIds).size, tasks.length);
  assert.equal(projection.unclassified.persisted, false);
  assert.equal(projection.unclassified.title, "미분류 업무");
});

test("WT-01-08 projects a virtual Matter root and computed node depths", async () => {
  // Given
  const { projectMatterWorktree } = await import("../src/worktree-projection.js");

  // When
  const projection = projectMatterWorktree({ worktree, matter, nodes, tasks, as_of: "2026-07-11T12:00:00.000Z" });

  // Then
  assert.deepEqual(projection.root, {
    node_id: "worktree-root:worktree_wt_01_08",
    node_type: "root",
    title: "[QA] Projection Matter",
    depth: 0,
    persisted: false,
  });
  assert.deepEqual(projection.nodes.map(({ node_id, depth }) => ({ node_id, depth })), [
    { node_id: "branch", depth: 1 },
    { node_id: "linked_done", depth: 2 },
  ]);
});

test("WT-01-08 excludes cross-tenant and cross-Matter Tasks without leaking counts", async () => {
  // Given
  const { projectMatterWorktree } = await import("../src/worktree-projection.js");
  const foreignTasks = [
    ...tasks,
    { ...tasks[1], task_id: "task_other_tenant", tenant_id: "tenant_other" },
    { ...tasks[1], task_id: "task_other_matter", matter_id: "matter_other" },
  ];

  // When
  const projection = projectMatterWorktree({ worktree, matter, nodes, tasks: foreignTasks, as_of: "2026-07-11T12:00:00.000Z" });

  // Then
  assert.equal(projection.progress.total, 3);
  assert.equal(projection.unclassified.tasks.length, 3);
  assert.equal(JSON.stringify(projection).includes("task_other"), false);
});

test("WT-01-08 rejects an active task placement whose MatterTask is missing", async () => {
  // Given
  const { projectMatterWorktree } = await import("../src/worktree-projection.js");

  // When
  const projectMissingTask = () => projectMatterWorktree({ worktree, matter, nodes, tasks: tasks.slice(1), as_of: "2026-07-11T12:00:00.000Z" });

  // Then
  assert.throws(projectMissingTask, (error) => error.code === "WORKTREE_TASK_NOT_FOUND");
});
