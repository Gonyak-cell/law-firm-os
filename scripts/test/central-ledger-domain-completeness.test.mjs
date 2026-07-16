import assert from "node:assert/strict";
import test from "node:test";
import {
  DOMAIN_ADAPTER_COMPLETENESS_SCHEMA_VERSION,
  REQUIRED_DOMAIN_ADAPTERS,
  REQUIRED_DOMAIN_VERIFICATION_COMMANDS,
  inspectDomainAdapterSources,
  validateDomainAdapterCompletenessReceipt,
} from "../lib/central-ledger-domain-completeness.mjs";

const SOURCE_SHA = "a".repeat(40);
const TREE = "b".repeat(40);
const HASH = "c".repeat(64);

function validReceipt() {
  return {
    schema_version: DOMAIN_ADAPTER_COMPLETENESS_SCHEMA_VERSION,
    verdict: "PASS",
    allowed_claim: "DOMAIN_ADAPTERS_SOURCE_VERIFIED",
    source_sha: SOURCE_SHA,
    tree: TREE,
    source_worktree_clean_before_evidence: true,
    domain_count: REQUIRED_DOMAIN_ADAPTERS.length,
    domains: REQUIRED_DOMAIN_ADAPTERS.map((required) => ({
      domain_id: required.domain_id,
      tuw_ids: [...required.tuw_ids],
      source_sha: SOURCE_SHA,
      adapter: {
        module_path: required.module_path,
        test_path: required.test_path,
        async_port_verified: true,
        tenant_scoped: true,
        audit_preserved: true,
        idempotency_preserved: true,
      },
      import_receipt: {
        status: "source_imported",
        rejected_count: 0,
        second_import_replayed: true,
        rollback_cutoff: "pre_authority",
        source_hash: HASH,
        snapshot_hash: HASH,
      },
      shadow_receipt: {
        status: "equal",
        difference_count: 0,
        source_count: 1,
        target_count: 1,
        invariant_hash: HASH,
      },
      rehearsal_receipt: {
        status: "source_ready",
        rollback_cutoff: "pre_authority",
        production_migrated: false,
      },
    })),
    verification_contracts: REQUIRED_DOMAIN_VERIFICATION_COMMANDS.map((required) => ({
      ...required,
      exit_code: 0,
      passed: 1,
      failed: 0,
    })),
    claims: {
      importer_shadow_rehearsal_complete: true,
      unclassified_domain_count: 0,
      postgres_api_authority_active: false,
      staging_migration_executed: false,
      production_migration_executed: false,
      real_client_data_used: false,
      release_executed: false,
      aws_mutation_executed: false,
      production_ready: false,
      go_live: false,
    },
  };
}

test("domain completeness receipt requires all eight exact-SHA import, shadow, rehearsal and VC records", () => {
  const result = validateDomainAdapterCompletenessReceipt(validReceipt(), { expectedSourceSha: SOURCE_SHA });
  assert.equal(result.verdict, "PASS");
  assert.equal(result.domain_count, 8);
  assert.equal(result.verification_contract_count, 10);
  assert.equal(result.production_migrated_domain_count, 0);
});

test("domain completeness receipt fails closed on a missing domain, shadow difference, or production claim", () => {
  const missing = validReceipt();
  missing.domains.pop();
  assert.throws(() => validateDomainAdapterCompletenessReceipt(missing), /domain set mismatch/);

  const different = validReceipt();
  different.domains[0].shadow_receipt.difference_count = 1;
  assert.throws(() => validateDomainAdapterCompletenessReceipt(different), /shadow difference/);

  const production = validReceipt();
  production.domains[0].rehearsal_receipt.production_migrated = true;
  assert.throws(() => validateDomainAdapterCompletenessReceipt(production), /must remain false/);
});

test("current source exposes every required domain descriptor, async adapter, runtime wrapper and receipt test", async () => {
  const result = await inspectDomainAdapterSources();
  assert.equal(result.verdict, "PASS");
  assert.equal(result.domain_count, 8);
  assert.equal(result.generic_adapter_verified, true);
});
