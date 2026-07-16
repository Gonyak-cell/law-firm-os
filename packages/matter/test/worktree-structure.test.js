import assert from "node:assert/strict";
import test from "node:test";

const validNodes = Object.freeze([
  Object.freeze({ node_id: "branch_1", node_type: "branch", parent_node_id: null, sort_order: 0, status: "active" }),
  Object.freeze({ node_id: "branch_2", node_type: "branch", parent_node_id: "branch_1", sort_order: 0, status: "active" }),
  Object.freeze({ node_id: "branch_3", node_type: "branch", parent_node_id: "branch_2", sort_order: 0, status: "active" }),
  Object.freeze({ node_id: "task_4", node_type: "task", parent_node_id: "branch_3", sort_order: 0, status: "active" }),
]);

test("WT-01-05 accepts a valid immutable tree at maximum depth four", async () => {
  // Given
  const { validateWorktreeStructure } = await import("../src/worktree-structure.js");

  // When
  const result = validateWorktreeStructure(validNodes);

  // Then
  assert.deepEqual(result, { valid: true, max_depth: 4, active_node_count: 4 });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(validNodes[3].parent_node_id, "branch_3");
});

test("WT-01-05 rejects an orphan parent", async () => {
  // Given
  const { validateWorktreeStructure } = await import("../src/worktree-structure.js");
  const nodes = [{ ...validNodes[0], parent_node_id: "missing" }];

  // When
  const validate = () => validateWorktreeStructure(nodes);

  // Then
  assert.throws(validate, (error) => error.code === "WORKTREE_ORPHAN_PARENT");
});

test("WT-01-05 rejects descendant moves as cycles", async () => {
  // Given
  const { validateWorktreeNodeMove } = await import("../src/worktree-structure.js");

  // When
  const moveUnderDescendant = () => validateWorktreeNodeMove(validNodes, {
    node_id: "branch_1",
    parent_node_id: "branch_3",
    sort_order: 0,
  });

  // Then
  assert.throws(moveUnderDescendant, (error) => error.code === "WORKTREE_CYCLE");
});

test("WT-01-05 rejects self-parenting as a cycle", async () => {
  // Given
  const { validateWorktreeNodeMove } = await import("../src/worktree-structure.js");

  // When
  const moveUnderSelf = () => validateWorktreeNodeMove(validNodes, {
    node_id: "branch_1",
    parent_node_id: "branch_1",
    sort_order: 0,
  });

  // Then
  assert.throws(moveUnderSelf, (error) => error.code === "WORKTREE_CYCLE");
});

test("WT-01-05 rejects a task node used as a parent", async () => {
  // Given
  const { validateWorktreeStructure } = await import("../src/worktree-structure.js");
  const nodes = [
    ...validNodes,
    { node_id: "child", node_type: "task", parent_node_id: "task_4", sort_order: 0, status: "active" },
  ];

  // When
  const validate = () => validateWorktreeStructure(nodes);

  // Then
  assert.throws(validate, (error) => error.code === "WORKTREE_PARENT_NOT_BRANCH");
});

test("WT-01-05 rejects moves that exceed depth four", async () => {
  // Given
  const { validateWorktreeNodeMove } = await import("../src/worktree-structure.js");
  const nodes = [
    { ...validNodes[0] },
    { ...validNodes[1] },
    { ...validNodes[2] },
    { node_id: "branch_4", node_type: "branch", parent_node_id: "branch_3", sort_order: 0, status: "active" },
    { node_id: "branch_top", node_type: "branch", parent_node_id: null, sort_order: 1, status: "active" },
  ];

  // When
  const moveTooDeep = () => validateWorktreeNodeMove(nodes, {
    node_id: "branch_top",
    parent_node_id: "branch_4",
    sort_order: 0,
  });

  // Then
  assert.throws(moveTooDeep, (error) => error.code === "WORKTREE_DEPTH_EXCEEDED");
});

test("WT-01-05 rejects duplicate and negative sibling sort orders", async () => {
  // Given
  const { validateWorktreeStructure } = await import("../src/worktree-structure.js");
  const duplicate = [
    { node_id: "a", node_type: "branch", parent_node_id: null, sort_order: 0, status: "active" },
    { node_id: "b", node_type: "branch", parent_node_id: null, sort_order: 0, status: "active" },
  ];

  // When
  const validate = () => validateWorktreeStructure(duplicate);

  // Then
  assert.throws(validate, (error) => error.code === "WORKTREE_SORT_ORDER_CONFLICT");
  assert.throws(
    () => validateWorktreeStructure([{ ...duplicate[0], sort_order: -1 }]),
    (error) => error.code === "WORKTREE_SORT_ORDER_INVALID",
  );
});
