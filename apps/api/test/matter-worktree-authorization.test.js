import assert from "node:assert/strict";
import test from "node:test";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createMatterRuntimeContext, handleMatterApiRequest } from "../src/matter-runtime-context.js";

const tenantId = "tenant_wt_02_06";
const matterId = "matter_wt_02_06";
const at = "2026-07-11T12:00:00.000Z";

function runtime({ role = "associate", memberEnvelope = "perm_wt_02_06" } = {}) {
  const matterEvidence = { permission_envelope_id: "perm_wt_02_06", audit_trace_id: "audit_wt_02_06" };
  return createMatterRuntimeContext({ repository: createMatterRepository({ seedRecords: [
    { model_type: "Matter", matter_id: matterId, tenant_id: tenantId, client_id: "client", title: "[QA] 권한", status: "open", created_by: "member_user", created_at: at, ...matterEvidence },
    { model_type: "MatterMember", member_id: "member", matter_id: matterId, tenant_id: tenantId, user_id: "member_user", role, status: "active", permission_envelope_id: memberEnvelope, audit_trace_id: "audit_wt_02_06" },
    { model_type: "MatterWorktree", worktree_id: "worktree", matter_id: matterId, tenant_id: tenantId, status: "active", version: 1, created_by: "member_user", created_at: at, updated_by: "member_user", updated_at: at, ...matterEvidence },
    { model_type: "MatterTask", task_id: "task", matter_id: matterId, tenant_id: tenantId, title: "업무", status: "todo", created_by: "member_user", ...matterEvidence },
  ] }) });
}

function context(tenant = tenantId) {
  return { principal: { user_id: "member_user", tenant_id: tenant }, rules: [{ id: "allow", effect: "allow", action: "*" }], object_acl: [] };
}

function body(overrides = {}) {
  return { tenant_id: tenantId, permission_ref: "perm", audit_hint_ref: "audit", actor_id: "member_user", idempotency_key: "idem-auth", reason: "권한 QA", source_ref: "auth-test", occurred_at: at, ...overrides };
}

test("WT-02-06 rejects forged actors before any Worktree write", async () => {
  const matterRuntime = runtime();
  const response = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body({ actor_id: "forged_user", node: { node_id: "forged", node_type: "branch", parent_node_id: null, title: "차단", sort_order: 0, status: "active", task_id: null } }), context: context(), requestId: "forged", runtime: matterRuntime });
  assert.equal(response.status, 404);
  assert.equal(matterRuntime.repository.list({ tenant_id: tenantId, model_type: "MatterWorktreeNode" }).length, 0);
  assert.equal(matterRuntime.repository.listAudit({ tenant_id: tenantId }).length, 0);
});

test("WT-02-06 requires the active member permission envelope to match the Matter", async () => {
  const matterRuntime = runtime({ memberEnvelope: "perm_other" });
  const response = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree`, method: "GET", query: { tenant_id: tenantId, permission_ref: "perm", audit_hint_ref: "audit" }, context: context(), requestId: "envelope", runtime: matterRuntime });
  assert.equal(response.status, 404);
  assert.deepEqual(response.body.items, []);
  assert.equal(response.body.item, undefined);
});

test("WT-02-06 lets paralegals read and complete but never edit structure", async () => {
  const matterRuntime = runtime({ role: "paralegal" });
  const query = { tenant_id: tenantId, permission_ref: "perm", audit_hint_ref: "audit" };
  const read = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree`, method: "GET", query, context: context(), requestId: "read", runtime: matterRuntime });
  const edit = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body({ node: { node_id: "denied", node_type: "branch", parent_node_id: null, title: "차단", sort_order: 0, status: "active", task_id: null } }), context: context(), requestId: "edit", runtime: matterRuntime });
  const complete = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/tasks/task/complete`, method: "POST", body: body({ idempotency_key: "complete" }), context: context(), requestId: "complete", runtime: matterRuntime });
  assert.equal(read.status, 200);
  assert.equal(edit.status, 404);
  assert.equal(complete.status, 200);
});

test("WT-02-06 returns count-safe 404 for cross-tenant read and write", async () => {
  const matterRuntime = runtime();
  const otherContext = context("tenant_other");
  const read = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree`, method: "GET", query: { tenant_id: tenantId, permission_ref: "perm", audit_hint_ref: "audit" }, context: otherContext, requestId: "read", runtime: matterRuntime });
  const write = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree`, method: "POST", body: body({ worktree_id: "other" }), context: otherContext, requestId: "write", runtime: matterRuntime });
  assert.equal(read.status, 404);
  assert.equal(write.status, 404);
  assert.deepEqual(read.body.items, []);
  assert.deepEqual(write.body.items, []);
});
