import { projectMatterWorktree } from "../../../packages/matter/src/worktree-projection.js";
import { authorizeMatterWorktreeAccess, WORKTREE_READ_ROLES } from "./matter-worktree-authorization.js";

function blocked(status, requestId, code, auditHintRef, uiState) {
  return {
    status,
    body: {
      request_id: requestId,
      outcome: "blocked",
      items: [],
      safe_error_codes: [code],
      audit_hint_ref: auditHintRef ?? null,
      ui_state: uiState,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}

export function handleMatterWorktreeRead({ matterId, query = {}, context, requestId, runtime } = {}) {
  if (!query.tenant_id) return blocked(400, requestId, "MATTER_TENANT_REQUIRED", query.audit_hint_ref, "blocked");
  if (!query.permission_ref) return blocked(400, requestId, "MATTER_PERMISSION_REQUIRED", query.audit_hint_ref, "blocked");
  if (!query.audit_hint_ref) return blocked(400, requestId, "MATTER_AUDIT_HINT_REQUIRED", null, "blocked");
  const repository = runtime.repository;
  const authorization = authorizeMatterWorktreeAccess({ repository, context, tenantId: query.tenant_id, matterId, roles: WORKTREE_READ_ROLES, action: "matter:worktree:read", resourceType: "matter_worktree", resourceId: matterId });
  if (!authorization.allowed) {
    return blocked(404, requestId, "MATTER_NOT_FOUND", query.audit_hint_ref, "empty");
  }
  const matter = authorization.matter;
  const worktree = repository
    .list({ tenant_id: query.tenant_id, model_type: "MatterWorktree", matter_id: matterId })
    .find(({ status }) => status === "active");
  if (!worktree) {
    return { status: 200, body: { request_id: requestId, outcome: "passed", item: null, safe_error_codes: [], audit_hint_ref: query.audit_hint_ref, ui_state: "empty", count_leak_prevented: true, production_ready_claim: false } };
  }
  const nodes = repository
    .list({ tenant_id: query.tenant_id, model_type: "MatterWorktreeNode", matter_id: matterId })
    .filter((node) => node.worktree_id === worktree.worktree_id);
  const tasks = repository.list({ tenant_id: query.tenant_id, model_type: "MatterTask", matter_id: matterId });
  const item = projectMatterWorktree({ worktree, matter, nodes, tasks, as_of: query.as_of ?? new Date().toISOString() });
  const etag = `"${worktree.version}"`;
  return {
    status: 200,
    headers: { etag },
    body: {
      request_id: requestId,
      outcome: "passed",
      item,
      etag,
      safe_error_codes: [],
      audit_hint_ref: query.audit_hint_ref,
      ui_state: null,
      count_leak_prevented: true,
      production_ready_claim: false,
    },
  };
}
