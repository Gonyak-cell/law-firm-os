import { MATTER_WORKTREE_NODE_TYPES } from "./registry.js";
import { createWorktreeBaseRecord } from "./worktree-model.js";

export const MATTER_WORKTREE_TEMPLATE_APPROVER_ID = "jwsuh@amic.kr";

export function hasMatterWorktreeTemplateApproval(input) {
  return Boolean(input.approval_ref)
    && input.approved_by === MATTER_WORKTREE_TEMPLATE_APPROVER_ID
    && Boolean(input.approved_at);
}

export function createMatterWorktreeTemplate(input) {
  const base = createWorktreeBaseRecord("MatterWorktreeTemplate", input);
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new TypeError("MatterWorktreeTemplate version must be a positive integer");
  }
  if (input.status === "approved" && !hasMatterWorktreeTemplateApproval(input)) {
    throw new TypeError(`MatterWorktreeTemplate approved template requires approval_ref, approved_by, approved_at; approved_by must match assigned approver ${MATTER_WORKTREE_TEMPLATE_APPROVER_ID}`);
  }
  return Object.freeze({
    ...base,
    matter_id: null,
    template_id: input.template_id,
    practice_area: input.practice_area,
    name: input.name,
    status: input.status,
    version: input.version,
    approval_ref: input.approval_ref,
    approved_by: input.approved_by,
    approved_at: input.approved_at,
    created_by: input.created_by,
    created_at: input.created_at,
    updated_by: input.updated_by,
    updated_at: input.updated_at,
  });
}

export function createMatterWorktreeTemplateNode(input) {
  const base = createWorktreeBaseRecord("MatterWorktreeTemplateNode", input);
  if (!MATTER_WORKTREE_NODE_TYPES.includes(input.node_type)) {
    throw new TypeError(`MatterWorktreeTemplateNode node_type must be one of ${MATTER_WORKTREE_NODE_TYPES.join(", ")}`);
  }
  return Object.freeze({
    ...base,
    matter_id: null,
    template_node_id: input.template_node_id,
    template_id: input.template_id,
    node_type: input.node_type,
    parent_template_node_id: input.parent_template_node_id,
    title: input.title,
    sort_order: input.sort_order,
    status: input.status,
  });
}
