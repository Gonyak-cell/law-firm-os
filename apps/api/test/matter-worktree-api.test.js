import assert from "node:assert/strict";
import test from "node:test";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createMatterRuntimeContext, handleMatterApiRequest } from "../src/matter-runtime-context.js";
import { handleMatterWorktreeTemplateList } from "../src/matter-worktree-read-api.js";

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
    { model_type: "Matter", matter_id: matterId, tenant_id: tenantId, client_id: "client_wt_02_01", matter_type_english: "LIT", title: "[QA] 워크트리 조회", status: "open", created_by: "user_wt_02_01", created_at: "2026-07-11T12:00:00.000Z", ...evidence },
    { model_type: "MatterMember", member_id: "member_wt_02_01", matter_id: matterId, tenant_id: tenantId, user_id: "user_wt_02_01", role: "associate", status: "active", ...evidence },
    { model_type: "MatterWorktree", worktree_id: "worktree_wt_02_01", matter_id: matterId, tenant_id: tenantId, status: "active", version: 3, created_by: "user_wt_02_01", created_at: "2026-07-11T12:00:00.000Z", updated_by: "user_wt_02_01", updated_at: "2026-07-11T12:00:00.000Z", ...evidence },
    { model_type: "MatterTask", task_id: "task_linked_wt_02_01", matter_id: matterId, tenant_id: tenantId, title: "연결 업무", status: "done", created_by: "user_wt_02_01", ...evidence },
    { model_type: "MatterTask", task_id: "task_unlinked_wt_02_01", matter_id: matterId, tenant_id: tenantId, title: "미분류 업무", status: "todo", created_by: "user_wt_02_01", ...evidence },
    { model_type: "MatterWorktreeNode", node_id: "node_branch_wt_02_01", worktree_id: "worktree_wt_02_01", matter_id: matterId, tenant_id: tenantId, node_type: "branch", parent_node_id: null, title: "준비", sort_order: 0, status: "active", task_id: null, ...evidence },
    { model_type: "MatterWorktreeNode", node_id: "node_task_wt_02_01", worktree_id: "worktree_wt_02_01", matter_id: matterId, tenant_id: tenantId, node_type: "task", parent_node_id: "node_branch_wt_02_01", title: "연결 업무", sort_order: 0, status: "active", task_id: "task_linked_wt_02_01", ...evidence },
    { model_type: "MatterTask", task_id: "task_other_wt_02_01", matter_id: "matter_other", tenant_id: tenantId, title: "권한 밖 업무", status: "blocked", created_by: "user_other", ...evidence },
    { model_type: "MatterWorktreeTemplate", template_id: "template-approved", tenant_id: tenantId, practice_area: "litigation", name: "송무 준비", status: "approved", version: 2, approval_ref: "approval", approved_by: "jwsuh@amic.kr", approved_at: "2026-07-11T12:00:00.000Z", created_by: "author", created_at: "2026-07-11T12:00:00.000Z", updated_by: "jwsuh@amic.kr", updated_at: "2026-07-11T12:00:00.000Z" },
    { model_type: "MatterWorktreeTemplate", template_id: "template-draft", tenant_id: tenantId, practice_area: "litigation", name: "초안", status: "draft", version: 1, approval_ref: null, approved_by: null, approved_at: null, created_by: "author", created_at: "2026-07-11T12:00:00.000Z", updated_by: "author", updated_at: "2026-07-11T12:00:00.000Z" },
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

test("Worktree template picker lists only approved templates for the Matter practice area", async () => {
  const response = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/templates`, method: "GET", query, context: context(), requestId: "req-template-list", runtime: runtime() });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.items, [{ template_id: "template-approved", name: "송무 준비", version: 2, practice_area: "litigation" }]);
});

test("Worktree template picker hides legacy approved records signed by another approver", () => {
  const base = runtime().repository;
  const repository = {
    get: (ref) => base.get(ref),
    list: (request) => request.model_type === "MatterWorktreeTemplate"
      ? [{ ...fixtures().find(({ template_id }) => template_id === "template-approved"), approved_by: "other@example.com" }]
      : base.list(request),
  };

  const response = handleMatterWorktreeTemplateList({ matterId, query, context: context(), requestId: "req-template-list-invalid-owner", runtime: { repository } });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.items, []);
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
