import assert from "node:assert/strict";
import test from "node:test";
import { createMatterRepository } from "../src/repository.js";

const timestamp = "2026-07-11T12:00:00.000Z";

function template(status = "approved") {
  const approved = status === "approved";
  return {
    model_type: "MatterWorktreeTemplate",
    template_id: "template_wt_01_07",
    tenant_id: "tenant_wt_01_07",
    practice_area: "litigation",
    name: "[QA] 송무 기본 구조",
    status,
    version: 1,
    approval_ref: approved ? "approval_qa_wt_01_07" : null,
    approved_by: approved ? "user_qa_approver" : null,
    approved_at: approved ? timestamp : null,
    created_by: "user_wt_01_07",
    created_at: timestamp,
    updated_by: "user_wt_01_07",
    updated_at: timestamp,
  };
}

const templateNodes = Object.freeze([
  Object.freeze({
    model_type: "MatterWorktreeTemplateNode",
    template_node_id: "template_branch_wt_01_07",
    template_id: "template_wt_01_07",
    tenant_id: "tenant_wt_01_07",
    node_type: "branch",
    parent_template_node_id: null,
    title: "준비 단계",
    sort_order: 0,
    status: "active",
  }),
  Object.freeze({
    model_type: "MatterWorktreeTemplateNode",
    template_node_id: "template_task_wt_01_07",
    template_id: "template_wt_01_07",
    tenant_id: "tenant_wt_01_07",
    node_type: "task",
    parent_template_node_id: "template_branch_wt_01_07",
    title: "기록 검토",
    sort_order: 0,
    status: "active",
  }),
]);

function command(overrides = {}) {
  return {
    tenant_id: "tenant_wt_01_07",
    matter_id: "matter_wt_01_07",
    worktree_id: "worktree_wt_01_07",
    template_id: "template_wt_01_07",
    actor_id: "user_wt_01_07",
    idempotency_key: "idem_template_wt_01_07",
    reason: "승인된 QA 템플릿 적용",
    source_ref: "matter-worktree-template-dialog",
    occurred_at: timestamp,
    request_id: "req_template_wt_01_07",
    ...overrides,
  };
}

test("WT-01-07 applies an approved template as a pinned Worktree snapshot", async () => {
  // Given
  const { applyMatterWorktreeTemplate } = await import("../src/worktree-template-snapshot.js");
  const repository = createMatterRepository({ seedRecords: [template(), ...templateNodes] });

  // When
  const result = applyMatterWorktreeTemplate(repository, command());

  // Then
  assert.equal(result.worktree.template_id, "template_wt_01_07");
  assert.equal(result.worktree.template_version, 1);
  assert.equal(result.nodes.length, 2);
  assert.equal(result.tasks.length, 1);
  assert.equal(result.nodes[0].source_template_node_id, "template_branch_wt_01_07");
  assert.equal(result.nodes.find(({ node_type }) => node_type === "task").task_id, result.tasks[0].task_id);
  assert.equal(result.tasks[0].status, "todo");
});

test("WT-01-07 keeps an applied snapshot unchanged after template edits", async () => {
  // Given
  const { applyMatterWorktreeTemplate } = await import("../src/worktree-template-snapshot.js");
  const repository = createMatterRepository({ seedRecords: [template(), ...templateNodes] });
  applyMatterWorktreeTemplate(repository, command());

  // When
  repository.upsert({ ...template(), version: 2, name: "[QA] 변경된 템플릿", updated_at: "2026-07-11T13:00:00.000Z" });
  repository.upsert({ ...templateNodes[1], title: "변경된 업무" });
  const worktree = repository.get({ tenant_id: "tenant_wt_01_07", model_type: "MatterWorktree", id: "worktree_wt_01_07" });
  const nodes = repository.list({ tenant_id: "tenant_wt_01_07", model_type: "MatterWorktreeNode", matter_id: "matter_wt_01_07" });

  // Then
  assert.equal(worktree.template_version, 1);
  assert.equal(nodes.find(({ node_type }) => node_type === "task").title, "기록 검토");
});

test("WT-01-07 rejects draft templates without creating Worktree records", async () => {
  // Given
  const { applyMatterWorktreeTemplate } = await import("../src/worktree-template-snapshot.js");
  const repository = createMatterRepository({ seedRecords: [template("draft"), ...templateNodes] });

  // When
  const applyDraft = () => applyMatterWorktreeTemplate(repository, command());

  // Then
  assert.throws(applyDraft, (error) => error.code === "WORKTREE_TEMPLATE_NOT_APPROVED");
  assert.equal(repository.list({ tenant_id: "tenant_wt_01_07", model_type: "MatterWorktree" }).length, 0);
  assert.equal(repository.list({ tenant_id: "tenant_wt_01_07", model_type: "MatterTask" }).length, 0);
});

test("WT-01-07 rejects cross-tenant template application without existence disclosure", async () => {
  // Given
  const { applyMatterWorktreeTemplate } = await import("../src/worktree-template-snapshot.js");
  const repository = createMatterRepository({ seedRecords: [template(), ...templateNodes] });

  // When
  const applyCrossTenant = () => applyMatterWorktreeTemplate(repository, command({ tenant_id: "tenant_other" }));

  // Then
  assert.throws(applyCrossTenant, (error) => error.code === "WORKTREE_TEMPLATE_NOT_FOUND");
});

test("WT-01-10 replays template application without duplicate snapshots", async () => {
  // Given
  const { applyMatterWorktreeTemplate } = await import("../src/worktree-template-snapshot.js");
  const repository = createMatterRepository({ seedRecords: [template(), ...templateNodes] });

  // When
  const first = applyMatterWorktreeTemplate(repository, command());
  const replay = applyMatterWorktreeTemplate(repository, command());

  // Then
  assert.equal(first.idempotent_replay, false);
  assert.equal(replay.idempotent_replay, true);
  assert.equal(repository.list({ tenant_id: "tenant_wt_01_07", model_type: "MatterWorktree" }).length, 1);
  assert.equal(repository.list({ tenant_id: "tenant_wt_01_07", model_type: "MatterWorktreeNode" }).length, 2);
  assert.equal(repository.listAudit({ tenant_id: "tenant_wt_01_07" }).length, 1);
});
