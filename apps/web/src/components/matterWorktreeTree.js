export function buildMatterWorktreeTree(item) {
  if (!item?.root) return null;
  const byParent = new Map();
  for (const node of item.nodes ?? []) {
    const parentId = node.parent_node_id ?? item.root.node_id;
    const siblings = byParent.get(parentId) ?? [];
    siblings.push({ ...node, children: [] });
    byParent.set(parentId, siblings);
  }
  const attach = (node) => ({
    ...node,
    children: (byParent.get(node.node_id) ?? [])
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(attach),
  });
  const unclassifiedTasks = item.unclassified?.tasks ?? [];
  const unclassified = unclassifiedTasks.length === 0 ? [] : [{
    ...item.unclassified,
    children: unclassifiedTasks.map((task, index) => ({
      node_id: `worktree-unclassified-task:${task.task_id}`,
      node_type: "task",
      title: task.title,
      task_id: task.task_id,
      task,
      sort_order: index,
      children: [],
    })),
  }];
  return {
    ...item.root,
    children: [...(byParent.get(item.root.node_id) ?? []).map(attach), ...unclassified],
  };
}

export function flattenMatterWorktree(node, expandedIds, result = [], parentId = null) {
  if (!node) return result;
  result.push({ node, parentId });
  if (expandedIds.has(node.node_id)) {
    for (const child of node.children ?? []) flattenMatterWorktree(child, expandedIds, result, node.node_id);
  }
  return result;
}

export function matterWorktreeExpandableIds(node, result = []) {
  if (!node) return result;
  if ((node.children ?? []).length > 0) result.push(node.node_id);
  for (const child of node.children ?? []) matterWorktreeExpandableIds(child, result);
  return result;
}

export function nextMatterWorktreeSortOrder(siblings = []) {
  return siblings.reduce((highest, node) => Math.max(highest, Number.isInteger(node.sort_order) ? node.sort_order : -1), -1) + 1;
}

export function createLatestWorktreeRequestSequence() {
  let latest = 0;
  return {
    begin() {
      latest += 1;
      return latest;
    },
    isCurrent(requestId) {
      return requestId === latest;
    },
  };
}
