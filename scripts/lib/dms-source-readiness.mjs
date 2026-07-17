import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DMS_SOURCE_READINESS_SCHEMA_VERSION = "law-firm-os.dms-source-readiness.v0.2";

export const DMS_SOURCE_VERIFICATION_COMMANDS = Object.freeze([
  Object.freeze({
    receipt_id: "VC-DMS-ADVERSARIAL-001",
    command: "node --test packages/dms/test/security-regressions.test.js packages/dms/test/postgres-security-regressions.test.js packages/dms/test/upload-reconciliation.test.js",
    expected_counts: Object.freeze({ passed: 20, failed: 0, skipped: 0, total: 20 }),
    postgres_required: true,
  }),
  Object.freeze({
    receipt_id: "VC-DMS-CONSUMERS-001",
    command: "node --test packages/dms/test/central-ledger.test.js packages/dms/test/runtime-services.test.js apps/api/test/vault-dms-postgres-runtime.test.js packages/hrx/test/payroll-document-service.test.js packages/intake/test/runtime-services.test.js",
    expected_counts: Object.freeze({ passed: 19, failed: 0, skipped: 0, total: 19 }),
    postgres_required: true,
  }),
  Object.freeze({
    receipt_id: "VC-DMS-POSTGRES-001",
    command: "node --test packages/persistence/test/postgres-transaction.test.js packages/persistence/test/postgres-repository-contract.test.js packages/hrx/test/postgres-migrations.test.js",
    expected_counts: Object.freeze({ passed: 12, failed: 0, skipped: 0, total: 12 }),
    postgres_required: true,
  }),
  Object.freeze({
    receipt_id: "VC-DMS-GOVERNANCE-001",
    command: "node scripts/validate-runtime-safety-governance.mjs",
    expected_counts: Object.freeze({ passed: 1, failed: 0, skipped: 0, total: 1 }),
    postgres_required: false,
  }),
]);

export const DMS_ADVERSARIAL_TEST_IDS = Object.freeze([
  "DMS-AUTHORITY-DUAL-WRITE-REJECTED",
  "DMS-CANONICAL-HOLD-CONFUSED-DEPUTY-BLOCKED",
  "DMS-DELETE-INTENT-RACE-BLOCKED",
  "DMS-DIGEST-FORGED-RECEIPT-BLOCKED",
  "DMS-FILE-KILLPOINT-ATOMIC",
  "DMS-PERSISTENCE-SECRET-BINARY-REJECTED",
  "DMS-PROVIDER-FAILURE-NO-PUBLICATION",
  "DMS-RECONCILER-BACKOFF-DEADLETTER",
  "DMS-RECONCILER-SKIP-LOCKED-ONCE",
  "DMS-STAGE-LEASE-CAS",
  "DMS-TENANT-IDENTICAL-IDS-ISOLATED",
]);

const SHA_PATTERN = /^[a-f0-9]{40}$/u;
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const EXTERNAL_FALSE_CLAIMS = Object.freeze([
  "provider_decision_approved",
  "provider_adapter_active",
  "provider_sandbox_contacted",
  "provider_staging_verified",
  "postgres_api_authority_active",
  "staging_migration_executed",
  "production_migration_executed",
  "real_client_data_used",
  "release_executed",
  "aws_mutation_executed",
  "production_ready",
  "go_live",
]);

function sameSet(left, right) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

function validTimestamp(value, field) {
  assert.equal(typeof value, "string", `${field} is required`);
  const parsed = Date.parse(value);
  assert.equal(Number.isFinite(parsed), true, `${field} must be a timestamp`);
  return parsed;
}

function assertExactCounts(actual, expected, label) {
  assert.deepEqual(actual, expected, `${label} exact counts drifted`);
  for (const value of Object.values(actual)) assert.equal(Number.isSafeInteger(value) && value >= 0, true, `${label} counts must be nonnegative integers`);
}

export function validateDmsSourceReadinessReceipt(receipt, { expectedSourceSha } = {}) {
  assert.equal(receipt?.schema_version, DMS_SOURCE_READINESS_SCHEMA_VERSION, "DMS source readiness schema mismatch");
  assert.equal(receipt.verdict, "PASS", "DMS source readiness verdict must PASS");
  assert.equal(["DMS_SOURCE_CHECKPOINT_VERIFIED", "SOURCE_MERGE_CANDIDATE"].includes(receipt.allowed_claim), true, "DMS source claim exceeds source-only authority");
  assert.match(receipt.source_sha ?? "", SHA_PATTERN, "source_sha must be a full Git SHA");
  assert.match(receipt.tree ?? "", SHA_PATTERN, "tree must be a full Git object SHA");
  if (expectedSourceSha) assert.equal(receipt.source_sha, expectedSourceSha, "receipt is not bound to expected source SHA");
  assert.equal(receipt.source_worktree_clean_before_evidence, true, "source worktree must be clean before evidence");
  assert.equal(receipt.source_worktree_clean_after_evidence, true, "source worktree must be clean after evidence");
  const startedAt = validTimestamp(receipt.started_at, "started_at");
  const finishedAt = validTimestamp(receipt.finished_at, "finished_at");
  assert.equal(finishedAt > startedAt, true, "evidence timestamps must be strictly increasing");
  assert.match(receipt.toolchain_sha256 ?? "", HASH_PATTERN, "toolchain_sha256 is required");
  assert.match(receipt.dependency_receipt_sha256 ?? "", HASH_PATTERN, "dependency receipt hash is required");

  assert.equal(Array.isArray(receipt.verification_contracts), true, "verification_contracts must be an array");
  assert.deepEqual(receipt.verification_contracts.map((row) => row.receipt_id), DMS_SOURCE_VERIFICATION_COMMANDS.map((row) => row.receipt_id));
  for (const required of DMS_SOURCE_VERIFICATION_COMMANDS) {
    const row = receipt.verification_contracts.find((entry) => entry.receipt_id === required.receipt_id);
    assert.equal(row.command, required.command, `${required.receipt_id} command drifted`);
    assert.equal(row.exit_code, 0, `${required.receipt_id} failed`);
    assertExactCounts(row.counts, required.expected_counts, required.receipt_id);
    assert.match(row.output_sha256 ?? "", HASH_PATTERN, `${required.receipt_id} output hash is required`);
    assert.equal(row.result_slice, `isolated:${required.receipt_id}:all`, `${required.receipt_id} result slice drifted`);
    assert.equal(row.db_skipped, 0, `${required.receipt_id} skipped DB work`);
    assert.equal(row.postgres_started, required.postgres_required, `${required.receipt_id} PostgreSQL start evidence drifted`);
    assert.equal(validTimestamp(row.finished_at, `${required.receipt_id}.finished_at`) > validTimestamp(row.started_at, `${required.receipt_id}.started_at`), true);
  }

  assert.equal(sameSet(receipt.adversarial_tests.map((row) => row.test_id), DMS_ADVERSARIAL_TEST_IDS), true, "adversarial test inventory is incomplete");
  for (const row of receipt.adversarial_tests) {
    assert.equal(row.status, "passed", `${row.test_id} did not pass`);
    assert.equal(DMS_SOURCE_VERIFICATION_COMMANDS.some((command) => command.receipt_id === row.command_receipt_id), true, `${row.test_id} references an unknown command receipt`);
  }
  assert.equal(sameSet(Object.keys(receipt.output_hashes), DMS_SOURCE_VERIFICATION_COMMANDS.map((row) => row.receipt_id)), true, "output hash inventory drifted");
  for (const row of receipt.verification_contracts) assert.equal(receipt.output_hashes[row.receipt_id], row.output_sha256, `${row.receipt_id} output hash binding drifted`);
  assert.deepEqual(receipt.run_manifest.command_receipt_ids, DMS_SOURCE_VERIFICATION_COMMANDS.map((row) => row.receipt_id));
  assert.equal(receipt.run_manifest.source_sha, receipt.source_sha);
  assert.equal(receipt.run_manifest.tree, receipt.tree);
  assert.match(receipt.run_manifest.sha256 ?? "", HASH_PATTERN);

  for (const tuwId of ["RS-DMS-002", "RS-DMS-003", "RS-DMS-004", "RS-DMS-005", "RS-DMS-006", "RS-DMS-007", "RS-DMS-008", "RS-DMS-009"]) {
    assert.deepEqual(receipt.tuws[tuwId], { implementation_state: "VERIFIED", execution_state: "NOT_APPLICABLE", verified: true });
  }
  for (const tuwId of ["RS-DMS-001", "RS-DMS-010"]) {
    assert.deepEqual(receipt.tuws[tuwId], { implementation_state: "READY", execution_state: "APPROVAL_REQUIRED", verified: false });
  }
  for (const invariant of DMS_ADVERSARIAL_TEST_IDS) assert.equal(receipt.security_invariants[invariant], true, `${invariant} is not closed`);
  assert.equal(receipt.schema.rls_table_count, 10);
  assert.equal(receipt.schema.rls_forced_table_count, 10);
  assert.equal(receipt.schema.db_skipped, 0);
  assert.equal(receipt.lineage.source_sha, receipt.source_sha);
  assert.equal(receipt.lineage.evidence_parent_sha, receipt.source_sha);
  assert.equal(receipt.lineage.evidence_only, true);
  assert.equal(receipt.lineage.product_diff_count, 0);
  assert.equal(receipt.lineage.test_diff_count, 0);
  assert.equal(receipt.lineage.validator_diff_count, 0);
  assert.equal(receipt.claims.verified, true);
  assert.equal(receipt.claims.source_checkpoint_verified, true);
  for (const field of EXTERNAL_FALSE_CLAIMS) assert.equal(receipt.claims[field], false, `${field} must remain false`);
  assert.deepEqual(receipt.external_actions, []);
  return Object.freeze({
    verdict: "PASS",
    source_sha: receipt.source_sha,
    tree: receipt.tree,
    verified_source_tuw_count: 8,
    approval_required_tuw_count: 2,
    adversarial_test_count: DMS_ADVERSARIAL_TEST_IDS.length,
    allowed_claim: receipt.allowed_claim,
  });
}

export async function inspectDmsSourceReadiness({ root = process.cwd() } = {}) {
  const repositoryRoot = resolve(root);
  const requiredPaths = [
    "packages/persistence/src/postgres/migrations/004_dms_upload_runtime.sql",
    "packages/dms/src/postgres-upload-runtime.js",
    "packages/dms/src/persistence-guard.js",
    "packages/dms/test/upload-reconciliation.test.js",
    "packages/dms/test/security-regressions.test.js",
    "packages/dms/test/postgres-security-regressions.test.js",
    "apps/api/src/vault-dms-postgres-runtime.js",
    "apps/api/test/vault-dms-postgres-runtime.test.js",
    "workbook/lawos-dms-provider-authority-decision-packet-2026-07-16.md",
  ];
  requiredPaths.forEach((relativePath) => assert.equal(existsSync(join(repositoryRoot, relativePath)), true, `${relativePath} is missing`));
  const storage = await import(pathToFileURL(join(repositoryRoot, "packages/dms/src/storage/storage-adapter.js")));
  const local = await import(pathToFileURL(join(repositoryRoot, "packages/dms/src/storage/local-storage-adapter.js")));
  const runtime = await import(pathToFileURL(join(repositoryRoot, "packages/dms/src/postgres-upload-runtime.js")));
  const centralLedger = await import(pathToFileURL(join(repositoryRoot, "packages/dms/src/central-ledger.js")));
  const apiBoundary = await import(pathToFileURL(join(repositoryRoot, "apps/api/src/vault-dms-postgres-runtime.js")));
  const migrationCatalog = await import(pathToFileURL(join(repositoryRoot, "packages/persistence/src/postgres/migration-catalog.js")));
  const adapter = storage.assertStagedStorageAdapter(local.createLocalStorageAdapter());
  assert.equal(adapter.contract_version, "law-firm-os.dms-storage.v3");
  for (const capability of ["staged_uploads", "digest_verification", "orphan_cleanup", "conditional_delete"]) assert.equal(adapter.capabilities[capability], true);
  assert.equal(typeof runtime.createPostgresDmsUploadRuntime, "function");
  assert.equal(centralLedger.DMS_AUTHORITY_TRANSITION_BOUNDARY.mutable_domain_ledger_command_allowed, false);
  assert.equal(centralLedger.DMS_AUTHORITY_TRANSITION_BOUNDARY.dual_write_allowed, false);
  assert.equal(apiBoundary.VAULT_DMS_POSTGRES_RUNTIME_BOUNDARY.api_authority_active, false);
  assert.equal(apiBoundary.VAULT_DMS_POSTGRES_RUNTIME_BOUNDARY.allowed_claim, "DMS_SOURCE_CHECKPOINT_VERIFIED");
  assert.equal(migrationCatalog.listPostgresFoundationMigrations().some((migration) => migration.id === "004_dms_upload_runtime"), true);
  const serverSource = readFileSync(join(repositoryRoot, "apps/api/src/server.js"), "utf8");
  assert.equal(serverSource.includes("vault-dms-postgres-runtime"), false, "source-only DMS PostgreSQL wrapper was activated");
  return Object.freeze({
    verdict: "SURFACE_PRESENT",
    allowed_claim: "DMS_SOURCE_SURFACE_PRESENT",
    claims: Object.freeze({ verified: false }),
    required_path_count: requiredPaths.length,
    storage_contract_version: adapter.contract_version,
    schema_migration_id: "004_dms_upload_runtime",
    api_authority_active: false,
    file_json_authority_active: true,
    provider_approved: false,
    production_ready_claim: false,
  });
}
