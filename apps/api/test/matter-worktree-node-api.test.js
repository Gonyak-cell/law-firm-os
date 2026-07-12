import assert from "node:assert/strict";
import test from "node:test";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createMatterRuntimeContext, handleMatterApiRequest } from "../src/matter-runtime-context.js";

const tenantId = "tenant_wt_02_03";
const matterId = "matter_wt_02_03";
const at = "2026-07-11T12:00:00.000Z";
const evidence = { permission_envelope_id: "perm_wt_02_03", audit_trace_id: "audit_wt_02_03" };
const context = { principal: { user_id: "user_wt_02_03", tenant_id: tenantId }, rules: [{ id: "allow", effect: "allow", action: "*" }], object_acl: [] };

function runtime() {
  return createMatterRuntimeContext({ repository: createMatterRepository({ seedRecords: [
    { model_type: "Matter", matter_id: matterId, tenant_id: tenantId, client_id: "client", title: "[QA] 노드 API", status: "open", created_by: "user_wt_02_03", created_at: at, ...evidence },
    { model_type: "MatterMember", member_id: "member", matter_id: matterId, tenant_id: tenantId, user_id: "user_wt_02_03", role: "associate", status: "active", ...evidence },
    { model_type: "MatterWorktree", worktree_id: "worktree_wt_02_03", matter_id: matterId, tenant_id: tenantId, status: "active", version: 1, created_by: "user_wt_02_03", created_at: at, updated_by: "user_wt_02_03", updated_at: at, ...evidence },
    { model_type: "MatterTask", task_id: "task_wt_02_03", matter_id: matterId, tenant_id: tenantId, title: "연결 업무", status: "todo", created_by: "user_wt_02_03", ...evidence },
    { model_type: "MatterTask", task_id: "task_other", matter_id: "matter_other", tenant_id: tenantId, title: "타 사건 업무", status: "todo", created_by: "user_other", ...evidence },
  ] }) });
}

function body(idempotencyKey, node, overrides = {}) {
  return { tenant_id: tenantId, permission_ref: "perm", audit_hint_ref: "audit", actor_id: "user_wt_02_03", idempotency_key: idempotencyKey, reason: "노드 편집", source_ref: "worktree-editor", occurred_at: at, expected_version: 1, node, ...overrides };
}

test("WT-02-03 creates branch and task nodes and increments Worktree versions", async () => {
  const matterRuntime = runtime();
  const branch = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body("node-branch", { node_id: "branch", node_type: "branch", parent_node_id: null, title: "준비", sort_order: 0, status: "active", task_id: null }), context, requestId: "branch", runtime: matterRuntime });
  const task = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body("node-task", { node_id: "task-node", node_type: "task", parent_node_id: "branch", title: "기록 검토", sort_order: 0, status: "active", task_id: "task_wt_02_03" }, { expected_version: 2 }), context, requestId: "task", runtime: matterRuntime });
  assert.equal(branch.status, 201);
  assert.equal(task.status, 201);
  assert.equal(task.body.item.task_id, "task_wt_02_03");
  assert.equal(task.body.worktree_version, 3);
});

test("WT-02-03 patches node title and order without creating a second node", async () => {
  const matterRuntime = runtime();
  await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body("node-create", { node_id: "branch", node_type: "branch", parent_node_id: null, title: "준비", sort_order: 0, status: "active", task_id: null }), context, requestId: "create", runtime: matterRuntime });
  const patched = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes/branch`, method: "PATCH", body: body("node-patch", { title: "검토 준비", sort_order: 2 }, { expected_version: 2 }), context, requestId: "patch", runtime: matterRuntime });
  assert.equal(patched.status, 200);
  assert.equal(patched.body.item.title, "검토 준비");
  assert.equal(patched.body.item.sort_order, 2);
  assert.equal(matterRuntime.repository.list({ tenant_id: tenantId, model_type: "MatterWorktreeNode" }).length, 1);
});

test("WT-02-03 rejects linking a Task from another Matter", async () => {
  const matterRuntime = runtime();
  const response = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body("node-cross", { node_id: "cross", node_type: "task", parent_node_id: null, title: "차단", sort_order: 0, status: "active", task_id: "task_other" }), context, requestId: "cross", runtime: matterRuntime });
  assert.equal(response.status, 400);
  assert.equal(matterRuntime.repository.list({ tenant_id: tenantId, model_type: "MatterWorktreeNode" }).length, 0);
});

test("WT-02-04 rejects moving a branch below its descendant", async () => {
  const matterRuntime = runtime();
  await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body("parent", { node_id: "parent", node_type: "branch", parent_node_id: null, title: "상위", sort_order: 0, status: "active", task_id: null }), context, requestId: "parent", runtime: matterRuntime });
  await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body("child", { node_id: "child", node_type: "branch", parent_node_id: "parent", title: "하위", sort_order: 0, status: "active", task_id: null }, { expected_version: 2 }), context, requestId: "child", runtime: matterRuntime });
  const moved = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes/parent`, method: "PATCH", body: body("cycle", { parent_node_id: "child" }, { expected_version: 3 }), context, requestId: "cycle", runtime: matterRuntime });
  assert.equal(moved.status, 400);
  assert.equal(matterRuntime.repository.get({ tenant_id: tenantId, model_type: "MatterWorktreeNode", id: "parent" }).parent_node_id, null);
});

test("WT-02-04 rejects archiving a branch with active descendants and retains MatterTask", async () => {
  const matterRuntime = runtime();
  await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body("archive-parent", { node_id: "parent", node_type: "branch", parent_node_id: null, title: "상위", sort_order: 0, status: "active", task_id: null }), context, requestId: "parent", runtime: matterRuntime });
  await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body("archive-task", { node_id: "task-node", node_type: "task", parent_node_id: "parent", title: "업무", sort_order: 0, status: "active", task_id: "task_wt_02_03" }, { expected_version: 2 }), context, requestId: "task", runtime: matterRuntime });
  const archived = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes/parent`, method: "DELETE", body: body("archive-subtree", {}, { expected_version: 3 }), context, requestId: "archive", runtime: matterRuntime });
  assert.equal(archived.status, 400);
  assert.equal(matterRuntime.repository.get({ tenant_id: tenantId, model_type: "MatterWorktreeNode", id: "parent" }).status, "active");
  assert.equal(matterRuntime.repository.get({ tenant_id: tenantId, model_type: "MatterWorktreeNode", id: "task-node" }).status, "active");
  assert.equal(matterRuntime.repository.get({ tenant_id: tenantId, model_type: "MatterTask", id: "task_wt_02_03" }).status, "todo");
});

test("WT-02-04 permits bottom-up archive after every descendant is archived", async () => {
  const matterRuntime = runtime();
  await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body("bottom-up-parent", { node_id: "parent", node_type: "branch", parent_node_id: null, title: "상위", sort_order: 0, status: "active", task_id: null }), context, requestId: "parent", runtime: matterRuntime });
  await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body("bottom-up-child", { node_id: "child", node_type: "branch", parent_node_id: "parent", title: "하위", sort_order: 0, status: "active", task_id: null }, { expected_version: 2 }), context, requestId: "child", runtime: matterRuntime });
  const child = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes/child`, method: "DELETE", body: body("archive-child", {}, { expected_version: 3 }), context, requestId: "archive-child", runtime: matterRuntime });

  const parent = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes/parent`, method: "DELETE", body: body("archive-parent-after-child", {}, { expected_version: 4 }), context, requestId: "archive-parent", runtime: matterRuntime });

  assert.equal(child.status, 200);
  assert.equal(parent.status, 200);
  assert.equal(matterRuntime.repository.get({ tenant_id: tenantId, model_type: "MatterWorktreeNode", id: "parent" }).status, "archived");
});

test("WT-02-07 returns 409 and current version for stale node writes", async () => {
  const matterRuntime = runtime();
  await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes`, method: "POST", body: body("stale-create", { node_id: "branch", node_type: "branch", parent_node_id: null, title: "원본", sort_order: 0, status: "active", task_id: null }), context, requestId: "create", runtime: matterRuntime });
  const stale = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/nodes/branch`, method: "PATCH", body: body("stale-patch", { title: "변조" }, { expected_version: 1 }), context, requestId: "stale", runtime: matterRuntime });
  assert.equal(stale.status, 409);
  assert.equal(stale.body.current_version, 2);
  assert.equal(matterRuntime.repository.get({ tenant_id: tenantId, model_type: "MatterWorktreeNode", id: "branch" }).title, "원본");
});

test("node creation rejects a stale expected Worktree version", async () => {
  const matterRuntime = runtime();
  const response = await handleMatterApiRequest({
    pathname: `/api/matters/${matterId}/worktree/nodes`,
    method: "POST",
    body: body("node-stale-create", { node_id: "stale", node_type: "branch", parent_node_id: null, title: "stale", sort_order: 0, status: "active", task_id: null }, { expected_version: 0 }),
    context,
    requestId: "node-stale-create",
    runtime: matterRuntime,
  });

  assert.equal(response.status, 409);
  assert.equal(response.body.current_version, 1);
  assert.equal(matterRuntime.repository.get({ tenant_id: tenantId, model_type: "MatterWorktreeNode", id: "stale" }), undefined);
});

test("node structural writes require an explicit expected Worktree version", async () => {
  const matterRuntime = runtime();
  const response = await handleMatterApiRequest({
    pathname: `/api/matters/${matterId}/worktree/nodes`,
    method: "POST",
    body: body("node-without-version", { node_id: "no-version", node_type: "branch", parent_node_id: null, title: "버전 없음", sort_order: 0, status: "active", task_id: null }, { expected_version: undefined }),
    context,
    requestId: "node-without-version",
    runtime: matterRuntime,
  });

  assert.equal(response.status, 400);
  assert.equal(matterRuntime.repository.get({ tenant_id: tenantId, model_type: "MatterWorktreeNode", id: "no-version" }), undefined);
});
