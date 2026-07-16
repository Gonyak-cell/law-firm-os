import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

process.env.LAWOS_LOCAL_BACKUP_ROOT = join(tmpdir(), "lawos-worktree-restart-backups");

const tenantId = "tenant_wt_04_06";
const matterId = "matter_wt_04_06";
const taskId = "task_wt_04_06";
const at = "2026-07-11T12:00:00.000Z";
const evidence = { permission_envelope_id: "perm_wt_04_06", audit_trace_id: "audit_wt_04_06" };
const context = { principal: { user_id: "user_wt_04_06", tenant_id: tenantId }, rules: [{ id: "allow", effect: "allow", action: "*" }], object_acl: [] };

function body(idempotencyKey, reason = "") {
  return { tenant_id: tenantId, permission_ref: "perm_wt_04_06", audit_hint_ref: "audit_wt_04_06", actor_id: "user_wt_04_06", idempotency_key: idempotencyKey, source_ref: "packaged-restart-qa", occurred_at: at, ...(reason ? { reason } : {}) };
}

test("WT-04-06 preserves completed and reopened MatterTask state across runtime-store restarts", async () => {
  const [{ createMatterRepository }, { createMatterRuntimeContext, handleMatterApiRequest }] = await Promise.all([
    import("../../../packages/matter/src/repository.js"),
    import("../src/matter-runtime-context.js"),
  ]);
  const filePath = join(mkdtempSync(join(tmpdir(), "matter-worktree-restart-")), "matter-store.json");
  const seedRecords = [
    { model_type: "Matter", matter_id: matterId, tenant_id: tenantId, client_id: "client", title: "[QA] 재시작", status: "open", created_by: "user_wt_04_06", created_at: at, ...evidence },
    { model_type: "MatterMember", member_id: "member", matter_id: matterId, tenant_id: tenantId, user_id: "user_wt_04_06", role: "associate", status: "active", ...evidence },
    { model_type: "MatterWorktree", worktree_id: "worktree_wt_04_06", matter_id: matterId, tenant_id: tenantId, status: "active", version: 1, created_by: "user_wt_04_06", created_at: at, updated_by: "user_wt_04_06", updated_at: at, ...evidence },
    { model_type: "MatterTask", task_id: taskId, matter_id: matterId, tenant_id: tenantId, title: "재시작 상태", status: "todo", assigned_to: "user_wt_04_06", created_by: "user_wt_04_06", ...evidence },
    { model_type: "MatterWorktreeNode", node_id: "node_wt_04_06", worktree_id: "worktree_wt_04_06", matter_id: matterId, tenant_id: tenantId, node_type: "task", parent_node_id: null, title: "재시작 상태", sort_order: 0, status: "active", task_id: taskId, ...evidence },
  ];

  let repository = createMatterRepository({ filePath, seedRecords });
  let runtime = createMatterRuntimeContext({ repository });
  const completed = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/tasks/${taskId}/complete`, method: "POST", body: body("restart-complete"), context, requestId: "restart-complete", runtime });
  assert.equal(completed.status, 200, JSON.stringify(completed.body));
  assert.equal(completed.body.item.status, "done");
  repository.close();

  repository = createMatterRepository({ filePath });
  runtime = createMatterRuntimeContext({ repository });
  const afterCompleteRestart = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree`, method: "GET", query: { tenant_id: tenantId, permission_ref: "perm_wt_04_06", audit_hint_ref: "audit_wt_04_06" }, context, requestId: "after-complete-restart", runtime });
  assert.equal(afterCompleteRestart.body.item.nodes[0].task.status, "done");
  assert.equal(afterCompleteRestart.body.item.progress.done, 1);

  const reopened = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/tasks/${taskId}/reopen`, method: "POST", body: body("restart-reopen", "후속 검토"), context, requestId: "restart-reopen", runtime });
  assert.equal(reopened.body.item.status, "in_progress");
  repository.close();

  repository = createMatterRepository({ filePath });
  runtime = createMatterRuntimeContext({ repository });
  const afterReopenRestart = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree`, method: "GET", query: { tenant_id: tenantId, permission_ref: "perm_wt_04_06", audit_hint_ref: "audit_wt_04_06" }, context, requestId: "after-reopen-restart", runtime });
  assert.equal(afterReopenRestart.body.item.nodes[0].task.status, "in_progress");
  assert.equal(afterReopenRestart.body.item.progress.done, 0);
  assert.equal(repository.listAudit({ tenant_id: tenantId }).length, 2);
  repository.close();
});
