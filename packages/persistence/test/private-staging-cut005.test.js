import assert from "node:assert/strict";
import test from "node:test";
import { runPrivateStagingCut005 } from "../src/postgres/private-staging-cut005.js";
import { createMigratedPostgresFixture } from "./helpers/disposable-postgres.js";

test("CUT-005 imports every domain, verifies immediate no-op replay, hashes, versions, and tenant negative", async (t) => {
  const fixture = await createMigratedPostgresFixture(t);
  if (!fixture) return;
  const input = {
    pool: fixture.appPool,
    tenantIds: ["tenant_lawos_staging_a", "tenant_lawos_staging_b"],
    runId: "cut005-exact-head-test",
  };
  const first = await runPrivateStagingCut005(input);
  assert.equal(first.outcome, "PASS");
  assert.equal(first.domain_count, 13);
  assert.equal(first.initial_import_applied_count, 13);
  assert.equal(first.immediate_replay_noop_count, 13);
  assert.equal(first.shadow_equal_count, 13);
  assert.equal(first.shadow_difference_count, 0);
  assert.equal(first.state_version_one_count, 13);
  assert.equal(first.tenant_negative_visible_count, 0);
  assert.equal(first.rejected_row_count, 0);
  assert.match(first.safe_hash_summary_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(first.json_fallback_count, 0);
  assert.equal(first.dual_write_count, 0);

  const repeatedExecution = await runPrivateStagingCut005(input);
  assert.equal(repeatedExecution.initial_import_applied_count, 0);
  assert.equal(repeatedExecution.immediate_replay_noop_count, 13);
  assert.equal(repeatedExecution.safe_hash_summary_sha256, first.safe_hash_summary_sha256);
});

test("CUT-005 rejects wildcard or real-looking tenant scope before database access", async () => {
  await assert.rejects(
    runPrivateStagingCut005({
      pool: { connect: async () => { throw new Error("must not connect"); } },
      tenantIds: ["*", "tenant_lawos_staging_a"],
      runId: "cut005-invalid-scope",
    }),
    /approved synthetic LawOS staging tenants/u,
  );
});
