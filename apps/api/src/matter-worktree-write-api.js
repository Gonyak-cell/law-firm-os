import { applyMatterWorktreeTemplate } from "../../../packages/matter/src/worktree-template-snapshot.js";
import { advanceMatterWorktreeVersion, createActiveMatterWorktree } from "../../../packages/matter/src/worktree-concurrency.js";
import { executeWorktreeMutation } from "../../../packages/matter/src/worktree-mutation.js";
import { validateWorktreeStructure } from "../../../packages/matter/src/worktree-structure.js";
import { authorizeMatterWorktreeAccess, WORKTREE_EDIT_ROLES } from "./matter-worktree-authorization.js";

function response(status, requestId, body, input) {
  const headers = Number.isInteger(body.worktree_version) ? { etag: `"${body.worktree_version}"` } : undefined;
  return { status, ...(headers ? { headers } : {}), body: { request_id: requestId, ...body, audit_hint_ref: input?.audit_hint_ref ?? null, count_leak_prevented: true, production_ready_claim: false } };
}

function authorize({ matterId, body, context, requestId, runtime }) {
  if (!body?.tenant_id || !body?.permission_ref || !body?.audit_hint_ref) {
    return response(400, requestId, { outcome: "blocked", items: [], safe_error_codes: ["MATTER_API_VALIDATION_ERROR"] }, body);
  }
  const authorization = authorizeMatterWorktreeAccess({ repository: runtime.repository, context, tenantId: body.tenant_id, matterId, actorId: body.actor_id, roles: WORKTREE_EDIT_ROLES, action: "matter:worktree:write", resourceType: "matter_worktree", resourceId: matterId });
  if (!authorization.allowed) {
    return response(404, requestId, { outcome: "blocked", items: [], safe_error_codes: ["MATTER_NOT_FOUND"], ui_state: "empty" }, body);
  }
  return null;
}

function command(body, matterId, requestId, requestFingerprint = null) {
  return {
    tenant_id: body.tenant_id,
    matter_id: matterId,
    worktree_id: body.worktree_id,
    actor_id: body.actor_id,
    idempotency_key: body.idempotency_key,
    reason: body.reason,
    source_ref: body.source_ref,
    occurred_at: new Date().toISOString(),
    request_id: requestId,
    request_fingerprint: requestFingerprint,
  };
}

function writeError(error, requestId, body) {
  const conflict = ["WORKTREE_ACTIVE_CONFLICT", "WORKTREE_VERSION_CONFLICT", "WORKTREE_IDEMPOTENCY_CONFLICT"].includes(error?.code) || /active MatterWorktree already exists/.test(error?.message ?? "");
  return response(conflict ? 409 : 400, requestId, { outcome: "blocked", items: [], safe_error_codes: [conflict ? "MATTER_WORKTREE_VERSION_CONFLICT" : "MATTER_API_VALIDATION_ERROR"], ui_state: conflict ? "conflict" : "blocked", ...(error?.current_version === null || error?.current_version === undefined ? {} : { current_version: error.current_version }) }, body);
}

export function handleMatterWorktreeCreate({ matterId, body, context, requestId, runtime } = {}) {
  const denied = authorize({ matterId, body, context, requestId, runtime });
  if (denied) return denied;
  try {
    const input = command(body, matterId, requestId, { worktree_id: body.worktree_id });
    const result = executeWorktreeMutation(runtime.repository, { ...input, operation: "matter.worktree.create", object_type: "MatterWorktree", object_id: input.worktree_id }, (transaction) => ({
      item: createActiveMatterWorktree(transaction, { model_type: "MatterWorktree", ...input, status: "active", version: 1, created_by: input.actor_id, created_at: input.occurred_at, updated_by: input.actor_id, updated_at: input.occurred_at }),
    }));
    return response(result.idempotent_replay ? 200 : 201, requestId, { outcome: result.idempotent_replay ? "idempotent_replay" : "created", item: result.item, idempotent_replay: result.idempotent_replay, safe_error_codes: [] }, body);
  } catch (error) {
    return writeError(error, requestId, body);
  }
}

export function handleMatterWorktreeTemplateApply({ matterId, body, context, requestId, runtime } = {}) {
  const denied = authorize({ matterId, body, context, requestId, runtime });
  if (denied) return denied;
  try {
    const result = applyMatterWorktreeTemplate(runtime.repository, { ...command(body, matterId, requestId, { worktree_id: body.worktree_id, template_id: body.template_id }), template_id: body.template_id });
    const item = { worktree: result.worktree, tasks: result.tasks, nodes: result.nodes };
    return response(result.idempotent_replay ? 200 : 201, requestId, { outcome: result.idempotent_replay ? "idempotent_replay" : "created", item, idempotent_replay: result.idempotent_replay, safe_error_codes: [] }, body);
  } catch (error) {
    return writeError(error, requestId, body);
  }
}

function activeWorktree(repository, tenantId, matterId) {
  return repository.list({ tenant_id: tenantId, model_type: "MatterWorktree", matter_id: matterId }).find(({ status }) => status === "active");
}

function taskBelongsToMatter(repository, node, tenantId, matterId) {
  if (node.node_type !== "task") return true;
  return Boolean(repository.get({ tenant_id: tenantId, model_type: "MatterTask", id: node.task_id })?.matter_id === matterId);
}

function nodeWriteResult(repository, body, matterId, nodeId, patch) {
  const worktree = activeWorktree(repository, body.tenant_id, matterId);
  if (!worktree) throw new Error("active Worktree not found");
  const nodes = repository.list({ tenant_id: body.tenant_id, model_type: "MatterWorktreeNode", matter_id: matterId }).filter((node) => node.worktree_id === worktree.worktree_id);
  const current = nodeId ? nodes.find((node) => node.node_id === nodeId) : null;
  if (nodeId && !current) throw new Error("Worktree node not found");
  const node = {
    ...(current ?? {}),
    ...patch,
    model_type: "MatterWorktreeNode",
    node_id: nodeId ?? patch.node_id,
    worktree_id: worktree.worktree_id,
    tenant_id: body.tenant_id,
    matter_id: matterId,
  };
  if (!taskBelongsToMatter(repository, node, body.tenant_id, matterId)) throw new Error("MatterTask must belong to the same Matter");
  const candidates = current ? nodes.map((item) => item.node_id === node.node_id ? node : item) : [...nodes, node];
  validateWorktreeStructure(candidates);
  return { worktree, node };
}

function handleNodeWrite({ matterId, nodeId, body, context, requestId, runtime, create }) {
  const denied = authorize({ matterId, body, context, requestId, runtime });
  if (denied) return denied;
  try {
    if (!Number.isInteger(body.expected_version)) throw new TypeError("expected_version is required");
    const prepared = nodeWriteResult(runtime.repository, body, matterId, nodeId, body.node ?? {});
    const operation = create ? "matter.worktree.node.create" : "matter.worktree.node.patch";
    const input = command(body, matterId, requestId, { node: body.node ?? {}, expected_version: body.expected_version ?? null });
    const result = executeWorktreeMutation(runtime.repository, { ...input, operation, object_type: "MatterWorktreeNode", object_id: prepared.node.node_id }, (transaction) => {
      const item = create
        ? transaction.create(prepared.node)
        : transaction.update({ tenant_id: body.tenant_id, model_type: "MatterWorktreeNode", id: prepared.node.node_id }, prepared.node);
      const version = advanceMatterWorktreeVersion(transaction, { tenant_id: body.tenant_id, worktree_id: prepared.worktree.worktree_id, expected_version: body.expected_version, updated_by: body.actor_id, updated_at: input.occurred_at });
      return { item, worktree_version: version.version };
    });
    return response(result.idempotent_replay ? 200 : create ? 201 : 200, requestId, { outcome: result.idempotent_replay ? "idempotent_replay" : create ? "created" : "updated", item: result.item, worktree_version: result.worktree_version, idempotent_replay: result.idempotent_replay, safe_error_codes: [] }, body);
  } catch (error) {
    return writeError(error, requestId, body);
  }
}

export function handleMatterWorktreeNodeCreate(options = {}) {
  return handleNodeWrite({ ...options, create: true });
}

export function handleMatterWorktreeNodePatch(options = {}) {
  return handleNodeWrite({ ...options, create: false });
}

function subtreeIds(nodes, rootId) {
  const selected = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (!selected.has(node.node_id) && selected.has(node.parent_node_id)) {
        selected.add(node.node_id);
        changed = true;
      }
    }
  }
  return [...selected];
}

export function handleMatterWorktreeNodeArchive({ matterId, nodeId, body, context, requestId, runtime } = {}) {
  const denied = authorize({ matterId, body, context, requestId, runtime });
  if (denied) return denied;
  try {
    const worktree = activeWorktree(runtime.repository, body.tenant_id, matterId);
    if (!worktree) throw new Error("active Worktree not found");
    const nodes = runtime.repository.list({ tenant_id: body.tenant_id, model_type: "MatterWorktreeNode", matter_id: matterId }).filter((node) => node.worktree_id === worktree.worktree_id);
    const current = nodes.find((node) => node.node_id === nodeId);
    if (!current || current.status !== "active") throw new Error("Active Worktree node not found");
    const archivedNodeIds = subtreeIds(nodes.filter(({ status }) => status === "active"), nodeId);
    if (archivedNodeIds.length > 1) throw new Error("Active descendants must be archived before their parent");
    const input = command(body, matterId, requestId, { expected_version: body.expected_version ?? null });
    const result = executeWorktreeMutation(runtime.repository, { ...input, operation: "matter.worktree.node.archive", object_type: "MatterWorktreeNode", object_id: nodeId }, (transaction) => {
      transaction.update({ tenant_id: body.tenant_id, model_type: "MatterWorktreeNode", id: nodeId }, { status: "archived" });
      const version = advanceMatterWorktreeVersion(transaction, { tenant_id: body.tenant_id, worktree_id: worktree.worktree_id, expected_version: body.expected_version, updated_by: body.actor_id, updated_at: input.occurred_at });
      return { archived_node_ids: archivedNodeIds, worktree_version: version.version };
    });
    return response(200, requestId, { outcome: result.idempotent_replay ? "idempotent_replay" : "updated", archived_node_ids: result.archived_node_ids, worktree_version: result.worktree_version, idempotent_replay: result.idempotent_replay, safe_error_codes: [] }, body);
  } catch (error) {
    return writeError(error, requestId, body);
  }
}
