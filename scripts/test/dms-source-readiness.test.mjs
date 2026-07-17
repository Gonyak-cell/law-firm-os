import assert from "node:assert/strict";
import test from "node:test";
import {
  DMS_ADVERSARIAL_TEST_IDS,
  DMS_SOURCE_READINESS_SCHEMA_VERSION,
  DMS_SOURCE_VERIFICATION_COMMANDS,
  inspectDmsSourceReadiness,
  validateDmsSourceReadinessReceipt,
} from "../lib/dms-source-readiness.mjs";

const SOURCE_SHA = "a".repeat(40);
const TREE = "b".repeat(40);
const HASH = "c".repeat(64);

function validReceipt() {
  const verificationContracts = DMS_SOURCE_VERIFICATION_COMMANDS.map((row, index) => ({
    receipt_id: row.receipt_id,
    command: row.command,
    exit_code: 0,
    counts: { ...row.expected_counts },
    output_sha256: String(index + 1).repeat(64),
    result_slice: `isolated:${row.receipt_id}:all`,
    db_skipped: 0,
    postgres_started: row.postgres_required,
    started_at: `2026-07-17T0${index}:00:00.000Z`,
    finished_at: `2026-07-17T0${index}:01:00.000Z`,
  }));
  return {
    schema_version: DMS_SOURCE_READINESS_SCHEMA_VERSION,
    verdict: "PASS",
    allowed_claim: "DMS_SOURCE_CHECKPOINT_VERIFIED",
    source_sha: SOURCE_SHA,
    tree: TREE,
    source_worktree_clean_before_evidence: true,
    source_worktree_clean_after_evidence: true,
    started_at: "2026-07-17T00:00:00.000Z",
    finished_at: "2026-07-17T05:00:00.000Z",
    toolchain_sha256: HASH,
    dependency_receipt_sha256: HASH,
    verification_contracts: verificationContracts,
    adversarial_tests: DMS_ADVERSARIAL_TEST_IDS.map((test_id) => ({
      test_id,
      status: "passed",
      command_receipt_id: test_id === "DMS-AUTHORITY-DUAL-WRITE-REJECTED" ? "VC-DMS-CONSUMERS-001" : "VC-DMS-ADVERSARIAL-001",
    })),
    output_hashes: Object.fromEntries(verificationContracts.map((row) => [row.receipt_id, row.output_sha256])),
    run_manifest: {
      source_sha: SOURCE_SHA,
      tree: TREE,
      command_receipt_ids: DMS_SOURCE_VERIFICATION_COMMANDS.map((row) => row.receipt_id),
      sha256: HASH,
    },
    tuws: Object.fromEntries([
      ...["RS-DMS-002", "RS-DMS-003", "RS-DMS-004", "RS-DMS-005", "RS-DMS-006", "RS-DMS-007", "RS-DMS-008", "RS-DMS-009"].map((id) => [id, { implementation_state: "VERIFIED", execution_state: "NOT_APPLICABLE", verified: true }]),
      ...["RS-DMS-001", "RS-DMS-010"].map((id) => [id, { implementation_state: "READY", execution_state: "APPROVAL_REQUIRED", verified: false }]),
    ]),
    security_invariants: Object.fromEntries(DMS_ADVERSARIAL_TEST_IDS.map((id) => [id, true])),
    schema: { rls_table_count: 10, rls_forced_table_count: 10, db_skipped: 0 },
    lineage: {
      source_sha: SOURCE_SHA,
      evidence_parent_sha: SOURCE_SHA,
      evidence_only: true,
      product_diff_count: 0,
      test_diff_count: 0,
      validator_diff_count: 0,
    },
    claims: {
      verified: true,
      source_checkpoint_verified: true,
      provider_decision_approved: false,
      provider_adapter_active: false,
      provider_sandbox_contacted: false,
      provider_staging_verified: false,
      postgres_api_authority_active: false,
      staging_migration_executed: false,
      production_migration_executed: false,
      real_client_data_used: false,
      release_executed: false,
      aws_mutation_executed: false,
      production_ready: false,
      go_live: false,
    },
    external_actions: [],
  };
}

test("DMS v0.2 exact-SHA receipt validates exact commands, counts, adversarial inventory and closed claims", () => {
  const result = validateDmsSourceReadinessReceipt(validReceipt(), { expectedSourceSha: SOURCE_SHA });
  assert.equal(result.verdict, "PASS");
  assert.equal(result.verified_source_tuw_count, 8);
  assert.equal(result.approval_required_tuw_count, 2);
  assert.equal(result.adversarial_test_count, DMS_ADVERSARIAL_TEST_IDS.length);
  assert.equal(result.allowed_claim, "DMS_SOURCE_CHECKPOINT_VERIFIED");
});

test("DMS v0.2 readiness fails closed on old claims, count drift, DB skips, missing attacks, lineage or external overclaim", () => {
  for (const mutate of [
    (receipt) => { receipt.allowed_claim = "DMS_SOURCE_VERIFIED"; },
    (receipt) => { receipt.verification_contracts[0].counts.passed -= 1; },
    (receipt) => { receipt.verification_contracts[0].db_skipped = 1; },
    (receipt) => { receipt.adversarial_tests.pop(); },
    (receipt) => { receipt.lineage.product_diff_count = 1; },
    (receipt) => { receipt.claims.provider_staging_verified = true; },
    (receipt) => { receipt.tuws["RS-DMS-001"].verified = true; },
  ]) {
    const receipt = validReceipt();
    mutate(receipt);
    assert.throws(() => validateDmsSourceReadinessReceipt(receipt));
  }
});

test("source-only inspection reports surface presence and cannot self-upgrade to verification", async () => {
  const result = await inspectDmsSourceReadiness();
  assert.equal(result.verdict, "SURFACE_PRESENT");
  assert.equal(result.allowed_claim, "DMS_SOURCE_SURFACE_PRESENT");
  assert.equal(result.claims.verified, false);
  assert.equal(result.required_path_count, 9);
  assert.equal(result.api_authority_active, false);
  assert.equal(result.file_json_authority_active, true);
  assert.equal(result.provider_approved, false);
});
