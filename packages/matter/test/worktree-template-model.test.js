import assert from "node:assert/strict";
import test from "node:test";

const draftInput = Object.freeze({
  template_id: "template_wt_01_03",
  tenant_id: "tenant_wt_01_03",
  practice_area: "litigation",
  name: "[QA] 송무 기본 구조",
  status: "draft",
  version: 1,
  approval_ref: null,
  approved_by: null,
  approved_at: null,
  created_by: "user_wt_01_03",
  created_at: "2026-07-11T12:00:00.000Z",
  updated_by: "user_wt_01_03",
  updated_at: "2026-07-11T12:00:00.000Z",
});

const nodeInput = Object.freeze({
  template_node_id: "template_node_wt_01_03",
  template_id: draftInput.template_id,
  tenant_id: draftInput.tenant_id,
  node_type: "branch",
  parent_template_node_id: null,
  title: "준비 단계",
  sort_order: 0,
  status: "active",
});

test("WT-01-03 registers immutable Worktree template factories", async () => {
  // Given
  const registry = await import("../src/registry.js");
  const model = await import("../src/model.js");

  // When
  const template = model.createMatterCoreRecord("MatterWorktreeTemplate", draftInput);
  const node = model.createMatterCoreRecord("MatterWorktreeTemplateNode", nodeInput);

  // Then
  assert.equal(registry.listMatterCoreModelTypes().includes("MatterWorktreeTemplate"), true);
  assert.equal(registry.listMatterCoreModelTypes().includes("MatterWorktreeTemplateNode"), true);
  assert.equal(Object.isFrozen(template), true);
  assert.equal(Object.isFrozen(node), true);
  assert.equal(template.approval_ref, null);
  assert.equal(node.parent_template_node_id, null);
});

test("WT-01-03 rejects unsupported template statuses and non-positive versions", async () => {
  // Given
  const { createMatterCoreRecord } = await import("../src/model.js");

  // When
  const createPublished = () => createMatterCoreRecord("MatterWorktreeTemplate", { ...draftInput, status: "published" });
  const createZeroVersion = () => createMatterCoreRecord("MatterWorktreeTemplate", { ...draftInput, version: 0 });

  // Then
  assert.throws(createPublished, /status must be one of draft, approved, archived/);
  assert.throws(createZeroVersion, /version must be a positive integer/);
});

test("WT-01-03 requires complete approval evidence for approved templates", async () => {
  // Given
  const { createMatterCoreRecord } = await import("../src/model.js");

  // When
  const createWithoutEvidence = () => createMatterCoreRecord("MatterWorktreeTemplate", { ...draftInput, status: "approved" });
  const approved = createMatterCoreRecord("MatterWorktreeTemplate", {
    ...draftInput,
    status: "approved",
    approval_ref: "approval_qa_wt_01_03",
    approved_by: "jwsuh@amic.kr",
    approved_at: "2026-07-11T13:00:00.000Z",
  });

  // Then
  assert.throws(createWithoutEvidence, /approved template requires approval_ref, approved_by, approved_at/);
  assert.equal(approved.status, "approved");
});

test("approved Worktree templates reject an approver other than the assigned owner", async () => {
  const { createMatterCoreRecord } = await import("../src/model.js");

  const createWithWrongApprover = () => createMatterCoreRecord("MatterWorktreeTemplate", {
    ...draftInput,
    status: "approved",
    approval_ref: "approval_qa_wt_01_03",
    approved_by: "other@example.com",
    approved_at: "2026-07-11T13:00:00.000Z",
  });

  assert.throws(createWithWrongApprover, /approved_by must match assigned approver jwsuh@amic\.kr/);
});

test("WT-01-03 rejects root template nodes and missing nullable keys", async () => {
  // Given
  const { createMatterCoreRecord } = await import("../src/model.js");

  // When
  const createRoot = () => createMatterCoreRecord("MatterWorktreeTemplateNode", { ...nodeInput, node_type: "root" });
  const createWithoutParentKey = () => {
    const { parent_template_node_id, ...input } = nodeInput;
    return createMatterCoreRecord("MatterWorktreeTemplateNode", input);
  };

  // Then
  assert.throws(createRoot, /node_type must be one of branch, task/);
  assert.throws(createWithoutParentKey, /missing required fields: parent_template_node_id/);
});
