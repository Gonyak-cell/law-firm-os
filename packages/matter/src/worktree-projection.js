import { projectWorktreeNodeDepths } from "./worktree-structure.js";

export class MatterWorktreeProjectionError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MatterWorktreeProjectionError";
    this.code = code;
  }
}

function taskProgress(tasks, asOf) {
  const included = tasks.filter(({ status }) => status !== "cancelled");
  const done = included.filter(({ status }) => status === "done").length;
  const blocked = included.filter(({ status }) => status === "blocked").length;
  const overdue = included.filter(({ status, due_at }) =>
    status !== "done" && Date.parse(due_at) < asOf,
  ).length;
  return Object.freeze({
    done,
    total: included.length,
    percent: included.length === 0 ? 0 : Math.round((done / included.length) * 1000) / 10,
    blocked,
    overdue,
  });
}

export function projectMatterWorktree({ worktree, matter, nodes, tasks, as_of }) {
  const matterTasks = tasks.filter(({ tenant_id, matter_id }) =>
    tenant_id === worktree.tenant_id && matter_id === worktree.matter_id,
  );
  const taskById = new Map(matterTasks.map((task) => [task.task_id, task]));
  const depths = projectWorktreeNodeDepths(nodes);
  const activeNodes = nodes.filter(({ status }) => status === "active");
  const linkedTaskIds = new Set();
  const projectedNodes = activeNodes.map((node) => {
    if (node.node_type !== "task") return Object.freeze({ ...node, depth: depths[node.node_id] });
    const task = taskById.get(node.task_id);
    if (!task) {
      throw new MatterWorktreeProjectionError(
        "WORKTREE_TASK_NOT_FOUND",
        `MatterTask ${node.task_id} not found for active Worktree node ${node.node_id}`,
      );
    }
    linkedTaskIds.add(task.task_id);
    return Object.freeze({ ...node, depth: depths[node.node_id], task: Object.freeze({ ...task }) });
  });
  const unclassifiedTasks = matterTasks
    .filter(({ task_id }) => !linkedTaskIds.has(task_id))
    .map((task) => Object.freeze({ ...task }));
  return Object.freeze({
    root: Object.freeze({
      node_id: `worktree-root:${worktree.worktree_id}`,
      node_type: "root",
      title: matter.title,
      depth: 0,
      persisted: false,
    }),
    nodes: Object.freeze(projectedNodes),
    unclassified: Object.freeze({
      node_id: `worktree-unclassified:${worktree.worktree_id}`,
      node_type: "virtual_branch",
      title: "미분류 업무",
      depth: 1,
      persisted: false,
      tasks: Object.freeze(unclassifiedTasks),
    }),
    progress: taskProgress(matterTasks, Date.parse(as_of)),
  });
}
