import { createActiveMatterWorktree } from "./worktree-concurrency.js";
import { executeWorktreeMutation } from "./worktree-mutation.js";
import { validateWorktreeStructure } from "./worktree-structure.js";

export class MatterWorktreeTemplateError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "MatterWorktreeTemplateError";
    this.code = code;
  }
}

function snapshotRecords(templateNodes, command) {
  const nodes = templateNodes
    .filter(({ status }) => status === "active")
    .map((templateNode) => {
      const taskId = templateNode.node_type === "task"
        ? `task:${command.worktree_id}:${templateNode.template_node_id}`
        : null;
      return {
        model_type: "MatterWorktreeNode",
        node_id: `node:${command.worktree_id}:${templateNode.template_node_id}`,
        worktree_id: command.worktree_id,
        tenant_id: command.tenant_id,
        matter_id: command.matter_id,
        node_type: templateNode.node_type,
        parent_node_id: templateNode.parent_template_node_id === null
          ? null
          : `node:${command.worktree_id}:${templateNode.parent_template_node_id}`,
        title: templateNode.title,
        sort_order: templateNode.sort_order,
        status: "active",
        task_id: taskId,
        source_template_node_id: templateNode.template_node_id,
      };
    });
  const tasks = nodes
    .filter(({ node_type }) => node_type === "task")
    .map((node) => ({
      model_type: "MatterTask",
      task_id: node.task_id,
      tenant_id: command.tenant_id,
      matter_id: command.matter_id,
      title: node.title,
      status: "todo",
      created_by: command.actor_id,
      source_ref: `worktree-template:${command.template_id}`,
    }));
  return { nodes, tasks };
}

export function applyMatterWorktreeTemplate(repository, command) {
  const template = repository.get({
    tenant_id: command.tenant_id,
    model_type: "MatterWorktreeTemplate",
    id: command.template_id,
  });
  if (!template) {
    throw new MatterWorktreeTemplateError("WORKTREE_TEMPLATE_NOT_FOUND", "Worktree template not found");
  }
  if (template.status !== "approved") {
    throw new MatterWorktreeTemplateError("WORKTREE_TEMPLATE_NOT_APPROVED", "Worktree template is not approved");
  }
  const templateNodes = repository.list({
    tenant_id: command.tenant_id,
    model_type: "MatterWorktreeTemplateNode",
  }).filter(({ template_id }) => template_id === command.template_id);
  const snapshot = snapshotRecords(templateNodes, command);
  validateWorktreeStructure(snapshot.nodes);
  return executeWorktreeMutation(repository, {
    ...command,
    operation: "matter.worktree.template.apply",
    object_type: "MatterWorktree",
    object_id: command.worktree_id,
  }, (transaction) => {
    const worktree = createActiveMatterWorktree(transaction, {
      model_type: "MatterWorktree",
      worktree_id: command.worktree_id,
      tenant_id: command.tenant_id,
      matter_id: command.matter_id,
      status: "active",
      version: 1,
      template_id: template.template_id,
      template_version: template.version,
      created_by: command.actor_id,
      created_at: command.occurred_at,
      updated_by: command.actor_id,
      updated_at: command.occurred_at,
    });
    const tasks = snapshot.tasks.map((task) => transaction.create(task));
    const nodes = snapshot.nodes.map((node) => transaction.create(node));
    return Object.freeze({ worktree, tasks: Object.freeze(tasks), nodes: Object.freeze(nodes) });
  });
}
