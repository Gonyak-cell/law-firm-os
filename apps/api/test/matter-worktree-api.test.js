import assert from "node:assert/strict";
import test from "node:test";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createMatterRuntimeContext, handleMatterApiRequest } from "../src/matter-runtime-context.js";

const tenantId = "tenant_wt_02_01";
const matterId = "matter_wt_02_01";
const query = { tenant_id: tenantId, permission_ref: "perm_wt_02_01", audit_hint_ref: "audit_wt_02_01" };

function context(userId = "user_wt_02_01") {
  return {
    principal: { user_id: userId, tenant_id: tenantId, role_ids: ["matter_runtime_user"] },
    rules: [{ id: "allow-worktree-read", effect: "allow", action: "matter:worktree:read" }],
    object_acl: [],
  };
}

function fixtures() {
  const evidence = { permission_envelope_id: "perm_wt_02_01", audit_trace_id: "audit_wt_02_01" };
  return [
    { model_type: "Matter", matter_id: matterId, tenant_id: tenantId, client_id: "client_wt_02_01", title: "[QA] 워크트리 조회", status: "open", created_by: "user_wt_02_01", created_at: "2026-07-11T12:00:00.000Z", ...evidence },
    { model_type: "MatterMember", member_id: "member_wt_02_01", matter_id: matterId, tenant_id: tenantId, user_id: "user_wt_02_01", role: "associate", status: "active", ...evidence },
    { model_type: "MatterWorktree", worktree_id: "worktree_wt_02_01", matter_id: matterId, tenant_id: tenantId, status: "active", version: 3, created_by: "user_wt_02_01", created_at: "2026-07-11T12:00:00.000Z", updated_by: "user_wt_02_01", updated_at: "2026-07-11T12:00:00.000Z", ...evidence },
    { model_type: "MatterTask", task_id: "task_linked_wt_02_01", matter_id: matterId, tenant_id: tenantId, title: "연결 업무", status: "done", created_by: "user_wt_02_01", ...evidence },
    { model_type: "MatterTask", task_id: "task_unlinked_wt_02_01", matter_id: matterId, tenant_id: tenantId, title: "미분류 업무", status: "todo", created_by: "user_wt_02_01", ...evidence },
    { model_type: "MatterWorktreeNode", node_id: "node_branch_wt_02_01", worktree_id: "worktree_wt_02_01", matter_id: matterId, tenant_id: tenantId, node_type: "branch", parent_node_id: null, title: "준비", sort_order: 0, status: "active", task_id: null, ...evidence },
    { model_type: "MatterWorktreeNode", node_id: "node_task_wt_02_01", worktree_id: "worktree_wt_02_01", matter_id: matterId, tenant_id: tenantId, node_type: "task", parent_node_id: "node_branch_wt_02_01", title: "연결 업무", sort_order: 0, status: "active", task_id: "task_linked_wt_02_01", ...evidence },
    { model_type: "MatterTask", task_id: "task_other_wt_02_01", matter_id: "matter_other", tenant_id: tenantId, title: "권한 밖 업무", status: "blocked", created_by: "user_other", ...evidence },
  ];
}

function runtime() {
  return createMatterRuntimeContext({ repository: createMatterRepository({ seedRecords: fixtures() }) });
}

test("WT-02-01 returns the virtual root, scoped tree, unclassified tasks, and progress", async () => {
  // Given
  const matterRuntime = runtime();

  // When
  const response = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree`, method: "GET", query, context: context(), requestId: "req-wt-02-01-read", runtime: matterRuntime });

  // Then
  assert.equal(response.status, 200);
  assert.equal(response.headers.etag, '"3"');
  assert.equal(response.body.etag, '"3"');
  assert.equal(response.body.item.root.persisted, false);
  assert.equal(response.body.item.nodes.length, 2);
  assert.deepEqual(response.body.item.unclassified.tasks.map(({ task_id }) => task_id), ["task_unlinked_wt_02_01"]);
  assert.deepEqual(response.body.item.progress, { done: 1, total: 2, percent: 50, blocked: 0, overdue: 0 });
  assert.equal(JSON.stringify(response.body).includes("task_other_wt_02_01"), false);
  assert.equal(response.body.count_leak_prevented, true);
});

test("WT-02-01 hides the Worktree and all counts from a non-member", async () => {
  // Given
  const matterRuntime = runtime();

  // When
  const response = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree`, method: "GET", query, context: context("user_not_member"), requestId: "req-wt-02-01-denied", runtime: matterRuntime });

  // Then
  assert.equal(response.status, 404);
  assert.deepEqual(response.body.items, []);
  assert.equal(response.body.item, undefined);
  assert.equal(response.body.total, undefined);
  assert.equal(response.body.count_leak_prevented, true);
});

test("WT-02-01 rejects a cross-tenant request without disclosing existence", async () => {
  // Given
  const matterRuntime = runtime();
  const otherTenantQuery = { ...query, tenant_id: "tenant_other" };

  // When
  const response = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree`, method: "GET", query: otherTenantQuery, context: context(), requestId: "req-wt-02-01-cross-tenant", runtime: matterRuntime });

  // Then
  assert.equal(response.status, 404);
  assert.deepEqual(response.body.items, []);
  assert.equal(response.body.count_leak_prevented, true);
});
