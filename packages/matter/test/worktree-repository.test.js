import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createMatterRepository } from "../src/repository.js";

function storePath(prefix) {
  return join(mkdtempSync(join(tmpdir(), prefix)), "matter-store.json");
}

const timestamp = "2026-07-11T12:00:00.000Z";

test("WT-01-04 persists and restores every Worktree model by its canonical ID", () => {
  // Given
  const filePath = storePath("matter-worktree-repository-");
  const repository = createMatterRepository({ filePath });
  const records = [
    {
      model_type: "MatterWorktree",
      worktree_id: "worktree_wt_01_04",
      tenant_id: "tenant_wt_01_04",
      matter_id: "matter_wt_01_04",
      status: "active",
      version: 1,
      created_by: "user_wt_01_04",
      created_at: timestamp,
      updated_by: "user_wt_01_04",
      updated_at: timestamp,
    },
    {
      model_type: "MatterWorktreeNode",
      node_id: "node_wt_01_04",
      worktree_id: "worktree_wt_01_04",
      tenant_id: "tenant_wt_01_04",
      matter_id: "matter_wt_01_04",
      node_type: "branch",
      parent_node_id: null,
      title: "준비 단계",
      sort_order: 0,
      status: "active",
      task_id: null,
    },
    {
      model_type: "MatterWorktreeTemplate",
      template_id: "template_wt_01_04",
      tenant_id: "tenant_wt_01_04",
      practice_area: "litigation",
      name: "[QA] 송무 구조",
      status: "draft",
      version: 1,
      approval_ref: null,
      approved_by: null,
      approved_at: null,
      created_by: "user_wt_01_04",
      created_at: timestamp,
      updated_by: "user_wt_01_04",
      updated_at: timestamp,
    },
    {
      model_type: "MatterWorktreeTemplateNode",
      template_node_id: "template_node_wt_01_04",
      template_id: "template_wt_01_04",
      tenant_id: "tenant_wt_01_04",
      node_type: "branch",
      parent_template_node_id: null,
      title: "준비 단계",
      sort_order: 0,
      status: "active",
    },
  ];

  // When
  for (const record of records) repository.create(record);
  repository.close();
  const reopened = createMatterRepository({ filePath });
  const primaryIds = {
    MatterWorktree: "worktree_id",
    MatterWorktreeNode: "node_id",
    MatterWorktreeTemplate: "template_id",
    MatterWorktreeTemplateNode: "template_node_id",
  };
  const restored = records.map((record) => reopened.get({
    tenant_id: record.tenant_id,
    model_type: record.model_type,
    id: record[primaryIds[record.model_type]],
  }));

  // Then
  assert.deepEqual(restored.map(({ model_type, resource_id }) => ({ model_type, resource_id })), [
    { model_type: "MatterWorktree", resource_id: "worktree_wt_01_04" },
    { model_type: "MatterWorktreeNode", resource_id: "node_wt_01_04" },
    { model_type: "MatterWorktreeTemplate", resource_id: "template_wt_01_04" },
    { model_type: "MatterWorktreeTemplateNode", resource_id: "template_node_wt_01_04" },
  ]);
  assert.equal(restored[0].version, 1);
  assert.equal(restored[1].parent_node_id, null);
  assert.equal(restored[2].status, "draft");
});

test("WT-01-04 upgrades a legacy file-store migration manifest without losing records", () => {
  // Given
  const filePath = storePath("matter-worktree-legacy-");
  writeFileSync(filePath, JSON.stringify({
    migrations: [{ id: "001_matter_core", filename: "001_matter_core.sql" }],
    records: [{ tenant_id: "tenant_legacy", model_type: "LegacyEvidence", resource_id: "legacy_1", marker: "retain" }],
    idempotency: [],
    audit_events: [],
  }));

  // When
  const repository = createMatterRepository({ filePath });
  const legacy = repository.get({ tenant_id: "tenant_legacy", model_type: "LegacyEvidence", resource_id: "legacy_1" });
  const persisted = JSON.parse(readFileSync(filePath, "utf8"));

  // Then
  assert.deepEqual(repository.migrations.map(({ id }) => id), ["001_matter_core", "002_matter_worktree"]);
  assert.deepEqual(persisted.migrations.map(({ id }) => id), ["001_matter_core", "002_matter_worktree"]);
  assert.equal(legacy.marker, "retain");
});
