import {
  MATTER_WORKTREE_NODE_TYPES,
  getMatterCoreModelDefinition,
} from "./registry.js";

function requiredFieldsMissing(modelType, input) {
  const definition = getMatterCoreModelDefinition(modelType);
  const nullable = new Set(definition.nullable_required_fields ?? []);
  return definition.required_fields.filter((field) =>
    input?.[field] === undefined || (!nullable.has(field) && (input?.[field] === null || input?.[field] === "")),
  );
}

export function createWorktreeBaseRecord(modelType, input) {
  const definition = getMatterCoreModelDefinition(modelType);
  const missing = requiredFieldsMissing(modelType, input);
  if (missing.length > 0) throw new Error(`${modelType} missing required fields: ${missing.join(", ")}`);
  if (!definition.lifecycle_statuses.includes(input.status)) {
    throw new Error(`${modelType} status must be one of ${definition.lifecycle_statuses.join(", ")}`);
  }
  return {
    model_type: modelType,
    tenant_id: input.tenant_id,
    matter_id: input.matter_id,
    owner_module: definition.owner_module,
    permission_envelope_id: input.permission_envelope_id ?? null,
    audit_trace_id: input.audit_trace_id ?? null,
    synthetic_only: input.synthetic_only ?? true,
    writes_product_state: false,
    evaluates_runtime_permission: false,
    writes_audit_event: false,
    creates_database_rows: false,
  };
}

export function createMatterWorktree(input) {
  const base = createWorktreeBaseRecord("MatterWorktree", input);
  if (!Number.isInteger(input.version) || input.version < 1) {
    throw new TypeError("MatterWorktree version must be a positive integer");
  }
  return Object.freeze({
    ...base,
    worktree_id: input.worktree_id,
    status: input.status,
    version: input.version,
    template_id: input.template_id ?? null,
    template_version: input.template_version ?? null,
    created_by: input.created_by,
    created_at: input.created_at,
    updated_by: input.updated_by,
    updated_at: input.updated_at,
  });
}

export function createMatterWorktreeNode(input) {
  const base = createWorktreeBaseRecord("MatterWorktreeNode", input);
  if (!MATTER_WORKTREE_NODE_TYPES.includes(input.node_type)) {
    throw new TypeError(`MatterWorktreeNode node_type must be one of ${MATTER_WORKTREE_NODE_TYPES.join(", ")}`);
  }
  if (input.node_type === "branch" && input.task_id !== null) {
    throw new TypeError("MatterWorktreeNode branch node task_id must be null");
  }
  if (input.node_type === "task" && (typeof input.task_id !== "string" || input.task_id.trim() === "")) {
    throw new TypeError("MatterWorktreeNode task node requires task_id");
  }
  return Object.freeze({
    ...base,
    node_id: input.node_id,
    worktree_id: input.worktree_id,
    node_type: input.node_type,
    parent_node_id: input.parent_node_id,
    title: input.title,
    sort_order: input.sort_order,
    status: input.status,
    task_id: input.task_id,
    source_template_node_id: input.source_template_node_id ?? null,
  });
}
