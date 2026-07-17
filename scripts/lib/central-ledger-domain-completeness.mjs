import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const DOMAIN_ADAPTER_COMPLETENESS_SCHEMA_VERSION = "law-firm-os.domain-adapter-completeness.v0.1";

export const REQUIRED_DOMAIN_ADAPTERS = Object.freeze([
  Object.freeze({
    domain_id: "master-data",
    tuw_ids: Object.freeze(["RS-DOM-002", "RS-DOM-003", "RS-DOM-004", "RS-DOM-005"]),
    module_path: "packages/master-data/src/central-ledger.js",
    descriptor_export: "MASTER_DATA_DOMAIN_DESCRIPTOR",
    function_exports: Object.freeze([]),
    test_path: "packages/master-data/test/central-ledger.test.js",
  }),
  Object.freeze({
    domain_id: "matter",
    tuw_ids: Object.freeze(["RS-DOM-006", "RS-DOM-007", "RS-DOM-008", "RS-DOM-009", "RS-DOM-010"]),
    module_path: "packages/matter/src/central-ledger.js",
    descriptor_export: "MATTER_DOMAIN_DESCRIPTOR",
    function_exports: Object.freeze([]),
    test_path: "packages/matter/test/central-ledger.test.js",
  }),
  Object.freeze({
    domain_id: "crm",
    tuw_ids: Object.freeze(["RS-DOM-011", "RS-DOM-012", "RS-DOM-014", "RS-DOM-015"]),
    module_path: "packages/crm/src/central-ledger.js",
    descriptor_export: "CRM_DOMAIN_DESCRIPTOR",
    function_exports: Object.freeze([]),
    test_path: "packages/crm/test/central-ledger.test.js",
  }),
  Object.freeze({
    domain_id: "intake",
    tuw_ids: Object.freeze(["RS-DOM-011", "RS-DOM-013", "RS-DOM-014", "RS-DOM-015"]),
    module_path: "packages/intake/src/central-ledger.js",
    descriptor_export: "INTAKE_DOMAIN_DESCRIPTOR",
    function_exports: Object.freeze([]),
    test_path: "packages/crm/test/central-ledger.test.js",
  }),
  Object.freeze({
    domain_id: "hrx",
    tuw_ids: Object.freeze(["RS-DOM-016", "RS-DOM-017", "RS-DOM-018", "RS-DOM-019", "RS-DOM-020", "RS-DOM-021", "RS-DOM-022"]),
    module_path: "packages/hrx/src/postgres-store-v2.js",
    domain_id_export: "HRX_DOMAIN_ID",
    function_exports: Object.freeze([
      "createHrxDomainSnapshot",
      "createPostgresHrxStorePortV2",
      "runHrxPostgresCommand",
    ]),
    test_path: "packages/hrx/test/postgres-store-v2.test.js",
  }),
  Object.freeze({
    domain_id: "finance",
    tuw_ids: Object.freeze(["RS-DOM-023", "RS-DOM-024", "RS-DOM-025", "RS-DOM-026", "RS-DOM-027"]),
    module_path: "packages/billing/src/central-ledger.js",
    descriptor_export: "FINANCE_DOMAIN_DESCRIPTOR",
    function_exports: Object.freeze([
      "createFinanceDomainSnapshot",
      "reconcileFinanceRecords",
      "runFinancePostgresCommand",
    ]),
    test_path: "packages/billing/test/central-ledger.test.js",
  }),
  Object.freeze({
    domain_id: "client-portal",
    tuw_ids: Object.freeze(["RS-DOM-028"]),
    module_path: "packages/client-portal/src/central-ledger.js",
    descriptor_export: "PORTAL_DOMAIN_DESCRIPTOR",
    function_exports: Object.freeze([
      "createPortalDomainSnapshot",
      "reconcilePortalRecords",
      "runPortalPostgresCommand",
    ]),
    runtime_path: "apps/api/src/portal-runtime-context.js",
    runtime_export: "handlePortalPostgresApiRequest",
    test_path: "packages/client-portal/test/central-ledger.test.js",
  }),
  Object.freeze({
    domain_id: "ai-governance",
    tuw_ids: Object.freeze(["RS-DOM-029"]),
    module_path: "packages/ai-governance/src/central-ledger.js",
    descriptor_export: "AI_GOVERNANCE_DOMAIN_DESCRIPTOR",
    function_exports: Object.freeze([
      "createAiGovernanceDomainSnapshot",
      "reconcileAiGovernanceRecords",
      "runAiGovernancePostgresCommand",
    ]),
    runtime_path: "apps/api/src/ai-runtime-context.js",
    runtime_export: "handleAiPostgresApiRequest",
    test_path: "packages/ai-governance/test/central-ledger.test.js",
  }),
]);

export const REQUIRED_DOMAIN_VERIFICATION_COMMANDS = Object.freeze([
  Object.freeze({
    receipt_id: "VC-PG-001",
    command: "node --test packages/persistence/test/postgres-transaction.test.js packages/persistence/test/postgres-repository-contract.test.js",
  }),
  Object.freeze({
    receipt_id: "VC-MD-001",
    command: "node --test packages/master-data/test/*.test.js apps/api/test/master-data-runtime.test.js apps/api/test/master-data-api.test.js",
  }),
  Object.freeze({
    receipt_id: "VC-MAT-001",
    command: "node --test packages/matter/test/*.test.js apps/api/test/matter-worktree-*.test.js apps/api/test/matter-vault-persistence.test.js",
  }),
  Object.freeze({
    receipt_id: "VC-CRM-001",
    command: "node --test packages/crm/test/*.test.js packages/intake/test/*.test.js apps/api/test/crm-intake-api.test.js",
  }),
  Object.freeze({
    receipt_id: "VC-HRX-001",
    command: "node --test packages/hrx/test/*.test.js apps/api/test/hrx/*.test.js",
  }),
  Object.freeze({
    receipt_id: "VC-FIN-001",
    command: "node --test packages/billing/test/*.test.js apps/api/test/finance*.test.js",
  }),
  Object.freeze({
    receipt_id: "VC-PORTAI-001",
    command: "node --test packages/client-portal/test/*.test.js packages/ai-governance/test/*.test.js",
  }),
  Object.freeze({
    receipt_id: "VC-SEC-001.desktop",
    command: "node scripts/validate-matter-desktop-security.mjs",
  }),
  Object.freeze({
    receipt_id: "VC-SEC-001.hrx",
    command: "node scripts/validate-hrx-security-negative-tests.mjs",
  }),
  Object.freeze({
    receipt_id: "VC-DOC-001",
    command: "node scripts/validate-runtime-safety-governance.mjs",
  }),
]);

const SHA_PATTERN = /^[a-f0-9]{40}$/u;

function sameSet(left, right) {
  return JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());
}

function assertFalse(value, name) {
  assert.equal(value, false, `${name} must remain false`);
}

function validateDomainReceipt(row, required, sourceSha) {
  assert.equal(row.domain_id, required.domain_id, `${required.domain_id} domain_id mismatch`);
  assert.equal(sameSet(row.tuw_ids, required.tuw_ids), true, `${required.domain_id} TUW coverage mismatch`);
  assert.equal(row.source_sha, sourceSha, `${required.domain_id} source SHA mismatch`);
  assert.equal(row.adapter.module_path, required.module_path, `${required.domain_id} adapter path mismatch`);
  assert.equal(row.adapter.test_path, required.test_path, `${required.domain_id} test path mismatch`);
  assert.equal(row.adapter.async_port_verified, true, `${required.domain_id} async port not verified`);
  assert.equal(row.adapter.tenant_scoped, true, `${required.domain_id} tenant scope not verified`);
  assert.equal(row.adapter.audit_preserved, true, `${required.domain_id} audit not preserved`);
  assert.equal(row.adapter.idempotency_preserved, true, `${required.domain_id} idempotency not preserved`);
  assert.equal(row.import_receipt.status, "source_imported", `${required.domain_id} import status mismatch`);
  assert.equal(row.import_receipt.rejected_count, 0, `${required.domain_id} rejected import rows`);
  assert.equal(row.import_receipt.second_import_replayed, true, `${required.domain_id} import replay missing`);
  assert.equal(row.import_receipt.rollback_cutoff, "pre_authority", `${required.domain_id} rollback cutoff mismatch`);
  assert.match(row.import_receipt.source_hash, /^[a-f0-9]{64}$/u, `${required.domain_id} source hash invalid`);
  assert.match(row.import_receipt.snapshot_hash, /^[a-f0-9]{64}$/u, `${required.domain_id} snapshot hash invalid`);
  assert.equal(row.shadow_receipt.status, "equal", `${required.domain_id} shadow status mismatch`);
  assert.equal(row.shadow_receipt.difference_count, 0, `${required.domain_id} shadow difference`);
  assert.equal(row.shadow_receipt.source_count, row.shadow_receipt.target_count, `${required.domain_id} shadow count mismatch`);
  assert.match(row.shadow_receipt.invariant_hash, /^[a-f0-9]{64}$/u, `${required.domain_id} invariant hash invalid`);
  assert.equal(row.rehearsal_receipt.status, "source_ready", `${required.domain_id} rehearsal status mismatch`);
  assert.equal(row.rehearsal_receipt.rollback_cutoff, "pre_authority", `${required.domain_id} rehearsal rollback cutoff mismatch`);
  assertFalse(row.rehearsal_receipt.production_migrated, `${required.domain_id}.production_migrated`);
}

export function validateDomainAdapterCompletenessReceipt(receipt, { expectedSourceSha } = {}) {
  assert.equal(receipt?.schema_version, DOMAIN_ADAPTER_COMPLETENESS_SCHEMA_VERSION, "domain completeness schema mismatch");
  assert.match(receipt.source_sha ?? "", SHA_PATTERN, "source_sha must be a full Git SHA");
  assert.match(receipt.tree ?? "", SHA_PATTERN, "tree must be a full Git object SHA");
  if (expectedSourceSha) assert.equal(receipt.source_sha, expectedSourceSha, "receipt is not bound to the expected source SHA");
  assert.equal(receipt.verdict, "PASS", "domain completeness verdict must PASS");
  assert.equal(receipt.allowed_claim, "DOMAIN_ADAPTERS_SOURCE_VERIFIED", "domain completeness claim mismatch");
  assert.equal(receipt.source_worktree_clean_before_evidence, true, "source worktree was not clean before evidence");
  assert.equal(receipt.domain_count, REQUIRED_DOMAIN_ADAPTERS.length, "domain count mismatch");
  assert.equal(sameSet(receipt.domains.map((row) => row.domain_id), REQUIRED_DOMAIN_ADAPTERS.map((row) => row.domain_id)), true, "domain set mismatch");
  for (const required of REQUIRED_DOMAIN_ADAPTERS) {
    validateDomainReceipt(receipt.domains.find((row) => row.domain_id === required.domain_id), required, receipt.source_sha);
  }
  assert.equal(sameSet(
    receipt.verification_contracts.map((row) => row.receipt_id),
    REQUIRED_DOMAIN_VERIFICATION_COMMANDS.map((row) => row.receipt_id),
  ), true, "verification contract set mismatch");
  for (const required of REQUIRED_DOMAIN_VERIFICATION_COMMANDS) {
    const row = receipt.verification_contracts.find((entry) => entry.receipt_id === required.receipt_id);
    assert.equal(row.command, required.command, `${required.receipt_id} command drifted`);
    assert.equal(row.exit_code, 0, `${required.receipt_id} failed`);
    assert.equal(row.failed, 0, `${required.receipt_id} reported failures`);
    assert.equal(Number.isInteger(row.passed) && row.passed >= 1, true, `${required.receipt_id} lacks a positive pass count`);
  }
  assert.equal(receipt.claims.importer_shadow_rehearsal_complete, true);
  assert.equal(receipt.claims.unclassified_domain_count, 0);
  assertFalse(receipt.claims.postgres_api_authority_active, "postgres_api_authority_active");
  assertFalse(receipt.claims.staging_migration_executed, "staging_migration_executed");
  assertFalse(receipt.claims.production_migration_executed, "production_migration_executed");
  assertFalse(receipt.claims.real_client_data_used, "real_client_data_used");
  assertFalse(receipt.claims.release_executed, "release_executed");
  assertFalse(receipt.claims.aws_mutation_executed, "aws_mutation_executed");
  assertFalse(receipt.claims.production_ready, "production_ready");
  assertFalse(receipt.claims.go_live, "go_live");
  return Object.freeze({
    verdict: "PASS",
    source_sha: receipt.source_sha,
    tree: receipt.tree,
    domain_count: receipt.domains.length,
    verification_contract_count: receipt.verification_contracts.length,
    unclassified_domain_count: 0,
    production_migrated_domain_count: 0,
    allowed_claim: receipt.allowed_claim,
  });
}

export async function inspectDomainAdapterSources({ root = process.cwd() } = {}) {
  const repositoryRoot = resolve(root);
  const genericAdapterPath = join(repositoryRoot, "packages/persistence/src/record-domain-adapter.js");
  assert.equal(existsSync(genericAdapterPath), true, "generic record-domain adapter is missing");
  const genericSource = readFileSync(genericAdapterPath, "utf8");
  for (const token of [
    "runRecordRepositoryDomainCommand",
    "runRecordRepositoryMultiDomainCommand",
    "DOMAIN_BASELINE_CONFLICT",
    "DOMAIN_SHADOW_DIFFERENCE",
  ]) assert.equal(genericSource.includes(token), true, `generic adapter lacks ${token}`);

  const domainIdModule = await import(pathToFileURL(join(repositoryRoot, "packages/persistence/src/domain-ledger.js")));
  assert.equal(
    REQUIRED_DOMAIN_ADAPTERS.every((required) => domainIdModule.DOMAIN_IDS.includes(required.domain_id)),
    true,
    "domain ID registry is incomplete",
  );

  const surfaces = [];
  for (const required of REQUIRED_DOMAIN_ADAPTERS) {
    const modulePath = join(repositoryRoot, required.module_path);
    const testPath = join(repositoryRoot, required.test_path);
    assert.equal(existsSync(modulePath), true, `${required.domain_id} adapter module is missing`);
    assert.equal(existsSync(testPath), true, `${required.domain_id} central-ledger test is missing`);
    const adapter = await import(pathToFileURL(modulePath));
    if (required.descriptor_export) {
      assert.equal(adapter[required.descriptor_export]?.domain_id, required.domain_id, `${required.domain_id} descriptor mismatch`);
    } else {
      assert.equal(adapter[required.domain_id_export], required.domain_id, `${required.domain_id} exported ID mismatch`);
    }
    for (const exportName of required.function_exports) {
      assert.equal(typeof adapter[exportName], "function", `${required.domain_id} lacks ${exportName}`);
    }
    if (required.runtime_path) {
      const runtimePath = join(repositoryRoot, required.runtime_path);
      assert.equal(existsSync(runtimePath), true, `${required.domain_id} runtime module is missing`);
      const runtime = await import(pathToFileURL(runtimePath));
      assert.equal(typeof runtime[required.runtime_export], "function", `${required.domain_id} lacks async PostgreSQL API wrapper`);
    }
    const testSource = readFileSync(testPath, "utf8");
    for (const token of ["importSnapshot", "compareSnapshot", "recordRehearsal", "production_migrated"]) {
      assert.equal(testSource.includes(token), true, `${required.domain_id} test lacks ${token}`);
    }
    surfaces.push(Object.freeze({
      domain_id: required.domain_id,
      module_path: required.module_path,
      test_path: required.test_path,
      runtime_path: required.runtime_path ?? null,
      source_surface_verified: true,
    }));
  }
  return Object.freeze({
    verdict: "PASS",
    domain_count: surfaces.length,
    domains: Object.freeze(surfaces),
    generic_adapter_verified: true,
  });
}
