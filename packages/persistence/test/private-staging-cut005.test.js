import assert from "node:assert/strict";
import test from "node:test";
import { DOMAIN_IDS } from "../src/domain-ledger.js";
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
  assert.equal(first.domain_count, DOMAIN_IDS.length);
  assert.equal(first.initial_import_applied_count, DOMAIN_IDS.length);
  assert.equal(first.immediate_replay_noop_count, DOMAIN_IDS.length);
  assert.equal(first.shadow_equal_count, DOMAIN_IDS.length);
  assert.equal(first.shadow_difference_count, 0);
  assert.equal(first.state_version_one_count, DOMAIN_IDS.length);
  assert.equal(first.tenant_negative_visible_count, 0);
  assert.equal(first.source_record_count, DOMAIN_IDS.length + 8);
  assert.equal(first.accepted_record_count, DOMAIN_IDS.length + 1);
  assert.equal(first.rejected_row_count, 7);
  assert.equal(first.source_record_count, first.accepted_record_count + first.rejected_row_count);
  assert.deepEqual(first.rejected_reason_counts, {
    DUPLICATE_RECORD_ID: 1,
    FORBIDDEN_SECRET_OR_RAW_BYTES: 1,
    INVALID_STATE_VERSION: 1,
    MISSING_REFERENCE_TARGET: 1,
    REQUIRED_FIELD_MISSING: 1,
    TENANT_SCOPE_MISMATCH: 2,
  });
  assert.equal(first.unexpected_rejection_count, 0);
  assert.equal(first.directory_result.source_count, 2);
  assert.equal(first.directory_result.accepted_count, 1);
  assert.equal(first.directory_result.rejected_count, 1);
  assert.equal(first.directory_result.replayed_noop_count, 1);
  assert.equal(first.directory_result.idempotency_count, 1);
  assert.equal(first.directory_result.audit_count, 1);
  assert.equal(first.directory_result.outbox_count, 1);
  assert.equal(first.transactional_rollback.interrupted, true);
  assert.equal(first.transactional_rollback.residual_item_count, 0);
  assert.equal(first.resume_equivalence.resume_equal, true);
  assert.equal(first.resume_equivalence.immediate_replay_noop, true);
  assert.equal(
    first.resume_equivalence.completed_step_count,
    DOMAIN_IDS.length + 1,
  );
  assert.equal(first.domain_results.every((domain) => domain.readback_equal === true), true);
  assert.match(first.safe_hash_summary_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(first.json_fallback_count, 0);
  assert.equal(first.dual_write_count, 0);
  assert.equal(JSON.stringify(first).includes("synthetic-forbidden-field"), false);

  const repeatedExecution = await runPrivateStagingCut005(input);
  assert.equal(repeatedExecution.initial_import_applied_count, 0);
  assert.equal(
    repeatedExecution.immediate_replay_noop_count,
    DOMAIN_IDS.length,
  );
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
