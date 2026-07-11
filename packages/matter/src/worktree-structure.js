const MAX_WORKTREE_DEPTH = 4;

export class MatterWorktreeStructureError extends Error {
  constructor(code, message, nodeId = null) {
    super(message);
    this.name = "MatterWorktreeStructureError";
    this.code = code;
    this.node_id = nodeId;
  }
}

function fail(code, message, nodeId) {
  throw new MatterWorktreeStructureError(code, message, nodeId);
}

function activeNodeIndex(nodes) {
  const activeNodes = nodes.filter(({ status }) => status === "active");
  const byId = new Map();
  for (const node of activeNodes) {
    if (byId.has(node.node_id)) fail("WORKTREE_DUPLICATE_NODE", `Duplicate active node ${node.node_id}`, node.node_id);
    byId.set(node.node_id, node);
  }
  return { activeNodes, byId };
}

function validateParents(activeNodes, byId) {
  for (const node of activeNodes) {
    if (node.parent_node_id === null) continue;
    const parent = byId.get(node.parent_node_id);
    if (!parent) fail("WORKTREE_ORPHAN_PARENT", `Parent ${node.parent_node_id} not found`, node.node_id);
    if (parent.node_type !== "branch") {
      fail("WORKTREE_PARENT_NOT_BRANCH", `Parent ${parent.node_id} must be a branch`, node.node_id);
    }
  }
}

function validateSortOrders(activeNodes) {
  const siblingOrders = new Set();
  for (const node of activeNodes) {
    if (!Number.isInteger(node.sort_order) || node.sort_order < 0) {
      fail("WORKTREE_SORT_ORDER_INVALID", `Node ${node.node_id} sort_order must be a non-negative integer`, node.node_id);
    }
    const key = `${node.parent_node_id ?? "root"}:${node.sort_order}`;
    if (siblingOrders.has(key)) {
      fail("WORKTREE_SORT_ORDER_CONFLICT", `Sibling sort_order ${node.sort_order} is duplicated`, node.node_id);
    }
    siblingOrders.add(key);
  }
}

function nodeDepth(node, byId, depths, visiting) {
  if (depths.has(node.node_id)) return depths.get(node.node_id);
  if (visiting.has(node.node_id)) fail("WORKTREE_CYCLE", `Cycle includes node ${node.node_id}`, node.node_id);
  visiting.add(node.node_id);
  const depth = node.parent_node_id === null
    ? 1
    : nodeDepth(byId.get(node.parent_node_id), byId, depths, visiting) + 1;
  visiting.delete(node.node_id);
  if (depth > MAX_WORKTREE_DEPTH) {
    fail("WORKTREE_DEPTH_EXCEEDED", `Node ${node.node_id} exceeds depth ${MAX_WORKTREE_DEPTH}`, node.node_id);
  }
  depths.set(node.node_id, depth);
  return depth;
}

function analyzeWorktreeStructure(nodes) {
  const { activeNodes, byId } = activeNodeIndex(nodes);
  validateParents(activeNodes, byId);
  const depths = new Map();
  for (const node of activeNodes) nodeDepth(node, byId, depths, new Set());
  validateSortOrders(activeNodes);
  return { activeNodes, depths };
}

export function validateWorktreeStructure(nodes) {
  const { activeNodes, depths } = analyzeWorktreeStructure(nodes);
  return Object.freeze({
    valid: true,
    max_depth: Math.max(0, ...depths.values()),
    active_node_count: activeNodes.length,
  });
}

export function projectWorktreeNodeDepths(nodes) {
  const { depths } = analyzeWorktreeStructure(nodes);
  return Object.freeze(Object.fromEntries(depths));
}

export function validateWorktreeNodeMove(nodes, move) {
  if (!nodes.some(({ node_id, status }) => node_id === move.node_id && status === "active")) {
    fail("WORKTREE_NODE_NOT_FOUND", `Active node ${move.node_id} not found`, move.node_id);
  }
  const moved = nodes.map((node) => node.node_id === move.node_id
    ? { ...node, parent_node_id: move.parent_node_id, sort_order: move.sort_order }
    : node);
  return validateWorktreeStructure(moved);
}
