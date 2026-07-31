import assert from "node:assert/strict";
import test from "node:test";
import { DOMAIN_IDS } from "../../../packages/persistence/src/domain-ledger.js";
import { createMigratedPostgresFixture } from "../../../packages/persistence/test/helpers/disposable-postgres.js";
import {
  runPrivateStagingCut006,
  validatePostgresOnlyRuntimeConfiguration,
} from "../src/private-staging-cut006.js";

const CONFIGURATION = Object.freeze({
  env: Object.freeze({
    LAWOS_RUNTIME_PROFILE: "operational",
    LAWOS_PERSISTENCE_AUTHORITY: "postgres-v2",
    LAWOS_STAFF_AUTHORITY: "internal-password",
  }),
  artifactRuntimeStoreEntryCount: 0,
  artifactRealJsonStoreCount: 0,
  fileCurrentInitializedCount: 0,
  coldStartObserved: true,
});

test("CUT-006 proves identity and every operational domain write is PostgreSQL-only, replay-safe, audited, outboxed, and tenant-isolated", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const input = {
    pool: fixture.appPool,
    tenantIds: ["tenant_lawos_staging_a", "tenant_lawos_staging_b"],
    runId: "cut006-exact-head-test",
    configuration: CONFIGURATION,
  };
  const first = await runPrivateStagingCut006(input);
  assert.equal(first.outcome, "PASS");
  assert.equal(first.domain_count, DOMAIN_IDS.length);
  assert.equal(first.postgres_write_target_count, DOMAIN_IDS.length + 1);
  assert.equal(first.postgres_readback_equal_count, DOMAIN_IDS.length + 1);
  assert.equal(first.identity_result.initial_write_applied, true);
  assert.equal(first.identity_result.immediate_replay_noop, true);
  assert.equal(first.identity_result.audit_count, 1);
  assert.equal(first.identity_result.outbox_count, 1);
  assert.equal(first.identity_result.idempotency_count, 1);
  assert.equal(first.domain_results.every((item) => item.initial_write_applied), true);
  assert.equal(first.domain_results.every((item) => item.immediate_replay_noop), true);
  assert.equal(first.domain_results.every((item) => item.state_version === 1), true);
  assert.equal(first.domain_results.every((item) => item.audit_count === 1 && item.outbox_count === 1), true);
  assert.equal(first.tenant_negative_visible_count, 0);
  for (const key of [
    "json_fallback_count",
    "json_writer_count",
    "dual_write_count",
    "file_current_authority_count",
    "offline_mutation_count",
    "memory_fallback_count",
    "file_adapter_sentinel_invocation_count",
  ]) assert.equal(first[key], 0, key);

  const repeatedExecution = await runPrivateStagingCut006(input);
  assert.equal(repeatedExecution.identity_result.initial_write_applied, false);
  assert.equal(repeatedExecution.domain_results.every((item) => !item.initial_write_applied), true);
  assert.equal(repeatedExecution.domain_results.every((item) => item.state_version === 1), true);
  assert.equal(repeatedExecution.domain_results.every((item) => item.audit_count === 1 && item.outbox_count === 1), true);
});

test("CUT-006 configuration rejects legacy store paths, non-PostgreSQL authority, and missing cold-start proof", () => {
  assert.throws(() => validatePostgresOnlyRuntimeConfiguration({
    ...CONFIGURATION,
    env: { ...CONFIGURATION.env, LAWOS_MATTER_STORE_PATH: "/tmp/legacy.json" },
  }), /store-path/u);
  assert.throws(() => validatePostgresOnlyRuntimeConfiguration({
    ...CONFIGURATION,
    env: { ...CONFIGURATION.env, LAWOS_PERSISTENCE_AUTHORITY: "file-current" },
  }), /postgres-v2/u);
  assert.throws(() => validatePostgresOnlyRuntimeConfiguration({
    ...CONFIGURATION,
    coldStartObserved: false,
  }), /cold-start/u);
});
