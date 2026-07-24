import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresPerformanceAcceptance,
} from "../src/postgres/performance-acceptance.js";
import {
  createJsonPostgresRehearsalRestoreTarget,
  validateJsonPostgresRehearsalRestoreTarget,
} from "../src/postgres/rehearsal-restore-contract.js";

const SOURCE = "a".repeat(40);
const TREE = "b".repeat(40);
const PACKET = "c".repeat(64);

function acceptance() {
  return createJsonPostgresPerformanceAcceptance({
    record_count: 1_676,
    tenant_count: 1,
    batch_size: 1_276,
    pool_max: 2,
    statement_timeout_ms: 120_000,
    connection_timeout_ms: 10_000,
    migration_p95_ms: 5_000,
    outbox_lag_p95_ms: 0,
    dms_throughput_min_bytes_per_second: 0,
    rpo_target_ms: 300_000,
    rto_target_ms: 3_600_000,
    rehearsal_result_sha256: "d".repeat(64),
  });
}

function target() {
  return createJsonPostgresRehearsalRestoreTarget({
    source_sha: SOURCE,
    source_tree: TREE,
    packet_sha256: PACKET,
    migration_result_sha256: "e".repeat(64),
    source_database_identifier: "lawos-private-staging-postgres",
    restore_database_identifier:
      `lawos-private-rehearsal-restore-${SOURCE.slice(0, 10)}-attempt1`,
    endpoint_address:
      `lawos-private-rehearsal-restore-${SOURCE.slice(0, 10)}-attempt1`
      + ".abcdefghijkl.ap-northeast-2.rds.amazonaws.com",
    endpoint_port: 5432,
    database_name: "lawos_rehearsal",
    aws_account: "770880870480",
    aws_region: "ap-northeast-2",
    source_latest_restorable_at: "2026-07-24T00:00:00.000Z",
    restore_started_at: "2026-07-24T00:01:00.000Z",
    restore_available_at: "2026-07-24T00:21:00.000Z",
    rpo_ms: 60_000,
    rto_ms: 1_200_000,
    vpc_sha256: "1".repeat(64),
    subnet_group_sha256: "2".repeat(64),
    security_group_set_sha256: "3".repeat(64),
    kms_key_arn_sha256: "4".repeat(64),
    isolated: true,
    public_access: false,
    deletion_protection: false,
  }, { performanceAcceptance: acceptance() });
}

test("W12 restore target binds an isolated private staging PITR copy", () => {
  const value = target();
  assert.equal(validateJsonPostgresRehearsalRestoreTarget(value, {
    sourceSha: SOURCE,
    sourceTree: TREE,
    packetSha256: PACKET,
    performanceAcceptance: acceptance(),
  }).valid, true);
});

test("W12 restore target rejects public, wrong-source and objective drift", () => {
  const value = target();
  for (const candidate of [
    { ...value, public_access: true },
    { ...value, source_database_identifier: "lawos-production-postgres" },
    { ...value, rto_ms: 3_600_001 },
  ]) {
    assert.throws(() =>
      validateJsonPostgresRehearsalRestoreTarget(candidate, {
        performanceAcceptance: acceptance(),
      }));
  }
});
