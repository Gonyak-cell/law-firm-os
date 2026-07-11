import assert from "node:assert/strict";
import test from "node:test";
import { createMatterRepository } from "../../../packages/matter/src/repository.js";
import { createMatterRuntimeContext, handleMatterApiRequest } from "../src/matter-runtime-context.js";

const tenantId = "tenant_wt_02_02";
const matterId = "matter_wt_02_02";
const occurredAt = "2026-07-11T12:00:00.000Z";
const evidence = { permission_envelope_id: "perm_wt_02_02", audit_trace_id: "audit_wt_02_02" };
const context = {
  principal: { user_id: "user_wt_02_02", tenant_id: tenantId, role_ids: ["matter_runtime_user"] },
  rules: [{ id: "allow-worktree-write", effect: "allow", action: "*" }],
  object_acl: [],
};

function records({ templateStatus } = {}) {
  const base = [
    { model_type: "Matter", matter_id: matterId, tenant_id: tenantId, client_id: "client_wt_02_02", title: "[QA] 워크트리 생성", status: "open", created_by: "user_wt_02_02", created_at: occurredAt, ...evidence },
    { model_type: "MatterMember", member_id: "member_wt_02_02", matter_id: matterId, tenant_id: tenantId, user_id: "user_wt_02_02", role: "associate", status: "active", ...evidence },
  ];
  if (!templateStatus) return base;
  const approved = templateStatus === "approved";
  return [...base,
    { model_type: "MatterWorktreeTemplate", template_id: "template_wt_02_02", tenant_id: tenantId, practice_area: "litigation", name: "[QA] 송무 템플릿", status: templateStatus, version: 1, approval_ref: approved ? "approval_wt_02_02" : null, approved_by: approved ? "qa_approver" : null, approved_at: approved ? occurredAt : null, created_by: "qa_author", created_at: occurredAt, updated_by: "qa_author", updated_at: occurredAt },
    { model_type: "MatterWorktreeTemplateNode", template_node_id: "template_branch_wt_02_02", template_id: "template_wt_02_02", tenant_id: tenantId, node_type: "branch", parent_template_node_id: null, title: "준비", sort_order: 0, status: "active" },
    { model_type: "MatterWorktreeTemplateNode", template_node_id: "template_task_wt_02_02", template_id: "template_wt_02_02", tenant_id: tenantId, node_type: "task", parent_template_node_id: "template_branch_wt_02_02", title: "기록 검토", sort_order: 0, status: "active" },
  ];
}

function body(overrides = {}) {
  return { tenant_id: tenantId, permission_ref: "perm_wt_02_02", audit_hint_ref: "audit_wt_02_02", actor_id: "user_wt_02_02", idempotency_key: "idem_wt_02_02", reason: "QA 워크트리 생성", source_ref: "matter-worktree-ui", occurred_at: occurredAt, worktree_id: "worktree_wt_02_02", ...overrides };
}

function runtime(seedRecords) {
  return createMatterRuntimeContext({ repository: createMatterRepository({ seedRecords }) });
}

test("WT-02-02 creates one empty active Worktree and rejects a second active one", async () => {
  // Given
  const matterRuntime = runtime(records());

  // When
  const created = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree`, method: "POST", body: body(), context, requestId: "req-create", runtime: matterRuntime });
  const duplicate = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree`, method: "POST", body: body({ worktree_id: "worktree_duplicate", idempotency_key: "idem_duplicate" }), context, requestId: "req-duplicate", runtime: matterRuntime });

  // Then
  assert.equal(created.status, 201);
  assert.equal(created.body.item.status, "active");
  const [audit] = matterRuntime.repository.listAudit({ tenant_id: tenantId });
  assert.equal(audit.request_id, "req-create");
  assert.equal(audit.actor_id, "user_wt_02_02");
  assert.equal(audit.reason, "QA 워크트리 생성");
  assert.equal(audit.source_ref, "matter-worktree-ui");
  assert.equal(duplicate.status, 409);
  assert.equal(matterRuntime.repository.list({ tenant_id: tenantId, model_type: "MatterWorktree" }).length, 1);
});

test("WT-02-02 applies only an approved template and replays without duplicates", async () => {
  // Given
  const matterRuntime = runtime(records({ templateStatus: "approved" }));
  const requestBody = body({ template_id: "template_wt_02_02" });

  // When
  const created = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/template-applications`, method: "POST", body: requestBody, context, requestId: "req-template", runtime: matterRuntime });
  const replay = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/template-applications`, method: "POST", body: requestBody, context, requestId: "req-template-replay", runtime: matterRuntime });

  // Then
  assert.equal(created.status, 201);
  assert.equal(created.body.item.nodes.length, 2);
  assert.equal(created.body.item.tasks.length, 1);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.idempotent_replay, true);
  assert.equal(matterRuntime.repository.list({ tenant_id: tenantId, model_type: "MatterWorktreeNode" }).length, 2);
});

test("WT-02-02 rejects a draft template without partial writes", async () => {
  // Given
  const matterRuntime = runtime(records({ templateStatus: "draft" }));

  // When
  const response = await handleMatterApiRequest({ pathname: `/api/matters/${matterId}/worktree/template-applications`, method: "POST", body: body({ template_id: "template_wt_02_02" }), context, requestId: "req-draft", runtime: matterRuntime });

  // Then
  assert.equal(response.status, 400);
  assert.equal(matterRuntime.repository.list({ tenant_id: tenantId, model_type: "MatterWorktree" }).length, 0);
  assert.equal(matterRuntime.repository.listAudit({ tenant_id: tenantId }).length, 0);
});
