import assert from "node:assert/strict";
import test from "node:test";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createMatterRuntimeContext, handleMatterApiRequest } from "../src/matter-runtime-context.js";

const tenantId = "tenant_wt_02_05";
const matterId = "matter_wt_02_05";
const at = "2026-07-11T12:00:00.000Z";
const evidence = { permission_envelope_id: "perm_wt_02_05", audit_trace_id: "audit_wt_02_05" };

function runtime(role = "paralegal", status = "todo") {
  return createMatterRuntimeContext({ repository: createMatterRepository({ seedRecords: [
    { model_type: "Matter", matter_id: matterId, tenant_id: tenantId, client_id: "client", title: "[QA] Task API", status: "open", created_by: "user_wt_02_05", created_at: at, ...evidence },
    { model_type: "MatterMember", member_id: "member", matter_id: matterId, tenant_id: tenantId, user_id: "user_wt_02_05", role, status: "active", ...evidence },
    { model_type: "MatterTask", task_id: "task_wt_02_05", matter_id: matterId, tenant_id: tenantId, title: "완료 대상", status, created_by: "user_wt_02_05", assigned_to: "user_wt_02_05", ...evidence },
  ] }) });
}

const context = { principal: { user_id: "user_wt_02_05", tenant_id: tenantId }, rules: [{ id: "allow", effect: "allow", action: "*" }], object_acl: [] };

function body(overrides = {}) {
  return { tenant_id: tenantId, permission_ref: "perm", audit_hint_ref: "audit", actor_id: "user_wt_02_05", idempotency_key: "idem_task_wt_02_05", source_ref: "worktree-checkbox", occurred_at: at, ...overrides };
}

test("WT-02-05 completes an assigned Task once through its dedicated endpoint", async () => {
  const matterRuntime = runtime();
  const pathname = `/api/matters/${matterId}/worktree/tasks/task_wt_02_05/complete`;
  const first = await handleMatterApiRequest({ pathname, method: "POST", body: body(), context, requestId: "complete", runtime: matterRuntime });
  const replay = await handleMatterApiRequest({ pathname, method: "POST", body: body(), context, requestId: "complete-replay", runtime: matterRuntime });
  assert.equal(first.status, 200);
  assert.equal(first.body.item.status, "done");
  assert.equal(replay.body.idempotent_replay, true);
  assert.equal(matterRuntime.repository.listAudit({ tenant_id: tenantId }).length, 1);
});

test("WT-02-05 requires a reason to reopen done Tasks", async () => {
  const matterRuntime = runtime("associate", "done");
  const pathname = `/api/matters/${matterId}/worktree/tasks/task_wt_02_05/reopen`;
  const missing = await handleMatterApiRequest({ pathname, method: "POST", body: body({ reason: "" }), context, requestId: "missing", runtime: matterRuntime });
  const reopened = await handleMatterApiRequest({ pathname, method: "POST", body: body({ idempotency_key: "reopen-2", reason: "후속 검토" }), context, requestId: "reopen", runtime: matterRuntime });
  assert.equal(missing.status, 400);
  assert.equal(reopened.status, 200);
  assert.equal(reopened.body.item.status, "in_progress");
});

test("WT-02-05 unblocks blocked Tasks only through a reasoned endpoint", async () => {
  const matterRuntime = runtime("associate", "blocked");
  const pathname = `/api/matters/${matterId}/worktree/tasks/task_wt_02_05/unblock`;
  const missing = await handleMatterApiRequest({ pathname, method: "POST", body: body({ reason: "" }), context, requestId: "missing-unblock", runtime: matterRuntime });
  const unblocked = await handleMatterApiRequest({ pathname, method: "POST", body: body({ idempotency_key: "unblock-2", reason: "의존 자료 수령" }), context, requestId: "unblock", runtime: matterRuntime });
  assert.equal(missing.status, 400);
  assert.equal(unblocked.status, 200);
  assert.equal(unblocked.body.item.status, "in_progress");
});

test("WT-02-05 hides Task state from a read-only Matter role", async () => {
  const matterRuntime = runtime("billing_reviewer");
  const response = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/tasks/task_wt_02_05/complete`, method: "POST", body: body(), context, requestId: "denied", runtime: matterRuntime });
  assert.equal(response.status, 404);
  assert.deepEqual(response.body.items, []);
  assert.equal(response.body.item, undefined);
  assert.equal(matterRuntime.repository.get({ tenant_id: tenantId, model_type: "MatterTask", id: "task_wt_02_05" }).status, "todo");
});

test("WT-02-05 rejects a cross-Matter Task identifier without disclosure", async () => {
  const matterRuntime = runtime();
  const response = await handleMatterApiRequest({ pathname: `/api/matters/matter_other/worktree/tasks/task_wt_02_05/complete`, method: "POST", body: body(), context, requestId: "cross", runtime: matterRuntime });
  assert.equal(response.status, 404);
  assert.deepEqual(response.body.items, []);
});
