import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import {
  PRIVATE_STAGING_CLOSEOUT_ALLOWED_PATHS,
  PRIVATE_STAGING_CLOSEOUT_CHECKPOINT,
  privateStagingScreenshotManifestSha256,
  sha256PrivateStagingCloseout,
  validatePrivateStagingCloseoutArtifactManifest,
  validatePrivateStagingCloseoutRebind,
  validatePrivateStagingCloseoutSourceDelta,
  validatePrivateStagingPriorCheckpointReceipt,
} from "../lib/private-staging-checkpoint-closeout.mjs";

test("closeout delta permits receipt and evidence paths only", () => {
  const changedPaths = [...PRIVATE_STAGING_CLOSEOUT_ALLOWED_PATHS];
  const result = validatePrivateStagingCloseoutSourceDelta({
    baseSourceSha: PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.source_sha,
    baseSourceTree: PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.source_tree,
    currentSourceSha: "c".repeat(40),
    changedPaths,
  });
  assert.equal(result.runtime_dependency_change_count, 0);
  assert.equal(result.changed_path_count, changedPaths.length);
  assert.throws(() => validatePrivateStagingCloseoutSourceDelta({
    baseSourceSha: PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.source_sha,
    baseSourceTree: PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.source_tree,
    currentSourceSha: "c".repeat(40),
    changedPaths: [...changedPaths, "apps/api/src/server.js"],
  }), /escaped/u);
});

test("screenshot manifest is path-bound, private, and covers all five routes", () => {
  const root = mkdtempSync(resolve(tmpdir(), "lawos-closeout-screens-"));
  try {
    mkdirSync(root, { recursive: true, mode: 0o700 });
    const names = ["01-home.png", "02-people.png", "03-matter.png", "04-vault.png", "05-finance.png"];
    const realRoot = realpathSync(root);
    const manifest = names.map((name, index) => {
      const path = resolve(realRoot, name);
      writeFileSync(path, `screen-${index}`, { mode: 0o600 });
      return `${sha256PrivateStagingCloseout(Buffer.from(`screen-${index}`))}  ${path}\n`;
    }).join("");
    assert.equal(privateStagingScreenshotManifestSha256(root), sha256PrivateStagingCloseout(manifest));
    writeFileSync(resolve(root, "06-unapproved.png"), "extra", { mode: 0o600 });
    assert.throws(() => privateStagingScreenshotManifestSha256(root), /inventory/u);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rebind and artifact closeout require exact runtime-invariant bindings", () => {
  const packet = {
    source_sha: "c".repeat(40),
    source_tree: "d".repeat(40),
    artifact_sha256: PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.artifact_sha256,
    packet_sha256: "e".repeat(64),
  };
  const manifest = {
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    artifact_sha256: packet.artifact_sha256,
    artifact_entries_sha256: PRIVATE_STAGING_CLOSEOUT_CHECKPOINT.artifact_entries_sha256,
    artifact_runtime_store_entry_count: 0,
    artifact_real_json_store_count: 0,
  };
  assert.equal(validatePrivateStagingCloseoutArtifactManifest(manifest, packet).runtime_dependency_change_count, 0);
  const summary = {
    verdict: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    artifact_sha256: packet.artifact_sha256,
    packet_sha256: packet.packet_sha256,
    stack_status: "UPDATE_COMPLETE",
    temporary_eni_allow_count: 0,
    source_function_arn_explicit_deny_count: 2,
    exact_lambda_count: 2,
    protected_resource_mutation_count: 0,
    real_data_count: 0,
    production_contacted: false,
  };
  assert.equal(validatePrivateStagingCloseoutRebind(summary, packet).temporary_eni_allow_count, 0);
  assert.throws(() => validatePrivateStagingCloseoutRebind({ ...summary, temporary_eni_allow_count: 1 }, packet), /safety/u);
  assert.throws(() => validatePrivateStagingCloseoutArtifactManifest({ ...manifest, artifact_entries_sha256: "f".repeat(64) }, packet), /runtime dependency/u);
});

test("prior CUT checkpoints retain zero-authority and count invariants", () => {
  const base = {
    receipt_kind: "cut-006",
    execution_state: "PASS",
    exit_code: 0,
    source_sha: "faab729a39b7b8379017ce004cb0ed3137ede994",
    source_tree: "33db6051fa5af7c1e957ec6adc5aac06dd976cc1",
    safe_counts: {
      postgres_write_target_count: 14,
      postgres_readback_equal_count: 14,
      zero_counter_count: 6,
      json_fallback_count: 0,
      json_writer_count: 0,
      dual_write_count: 0,
      file_current_authority_count: 0,
      offline_mutation_count: 0,
      memory_fallback_count: 0,
      tenant_negative_visible_count: 0,
      real_data_count: 0,
    },
    claims: {
      secret_material_returned: false,
      raw_pii_returned: false,
      production_contacted: false,
      real_data_contacted: false,
    },
  };
  assert.equal(validatePrivateStagingPriorCheckpointReceipt(base, "cut-006").receipt_kind, "cut-006");
  assert.throws(() => validatePrivateStagingPriorCheckpointReceipt({
    ...base,
    safe_counts: { ...base.safe_counts, dual_write_count: 1 },
  }, "cut-006"), /must equal zero/u);
});
