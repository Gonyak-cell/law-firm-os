import assert from "node:assert/strict";
import test from "node:test";
import { createRuntimeSurfaceService, createRuntimeSurfaceUiClient } from "../src/index.js";

test("Runtime surface UI client maps data, empty, and export-only states", () => {
  const service = createRuntimeSurfaceService();
  const client = createRuntimeSurfaceUiClient({ service, permission_context_id: "ui-test" });
  assert.equal(client.session().ui_state, "data");
  assert.equal(client.clients().items.length > 0, true);
  const task = client.createTask({ task_id: "task-ui", matter_id: "matter-runtime-spine", title: "UI Task" });
  assert.equal(task.kind, "data");
  const vault = client.vaultExport({ matter_id: "matter-runtime-spine" });
  assert.equal(vault.extra.export_only, true);
  assert.equal(vault.extra.raw_payload_included, false);
});

test("Runtime surface UI client exposes locked future domains", () => {
  const client = createRuntimeSurfaceUiClient({ permission_context_id: "feature-lock-test" });
  const locks = client.featureLocks();
  assert.equal(locks.item.portal.status, "locked_until_later_gate");
  assert.equal(locks.item.m365.allowed_mode, "sandbox_or_export_only");
  assert.equal(locks.item.hr_real_data.allowed_mode, "synthetic_only");
  assert.equal(locks.item.ai.allowed_mode, "review_required_advisory_only");
  assert.equal(locks.item.vault_sync.allowed_mode, "export_only");
  assert.equal(locks.production_ready_claim, false);
});
