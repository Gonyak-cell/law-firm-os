import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresDrTarget,
  validateJsonPostgresDrTarget,
} from "../src/postgres/dr-recovery-contract.js";
import { createJsonPostgresPerformanceAcceptance } from "../src/postgres/performance-acceptance.js";

const SOURCE = "a".repeat(40);
const TREE = "b".repeat(40);
const PACKET = "c".repeat(64);

function acceptance() {
  return createJsonPostgresPerformanceAcceptance({
    record_count: 287,
    tenant_count: 1,
    batch_size: 50,
    pool_max: 4,
    statement_timeout_ms: 120_000,
    connection_timeout_ms: 10_000,
    migration_p95_ms: 5_000,
    outbox_lag_p95_ms: 2_000,
    dms_throughput_min_bytes_per_second: 1_000_000,
    rpo_target_ms: 300_000,
    rto_target_ms: 3_600_000,
    rehearsal_result_sha256: "d".repeat(64),
  });
}

function target() {
  return createJsonPostgresDrTarget({
    source_sha: SOURCE,
    source_tree: TREE,
    packet_sha256: PACKET,
    cut009_receipt_sha256: "e".repeat(64),
    migration_result_sha256: "f".repeat(64),
    source_database_identifier: "lawos-production-postgres",
    restore_database_identifier: `lawos-production-dr-${SOURCE.slice(0, 10)}-attempt1`,
    endpoint_address: `lawos-production-dr-${SOURCE.slice(0, 10)}-attempt1.abcdefghijkl.ap-northeast-2.rds.amazonaws.com`,
    endpoint_port: 5432,
    database_name: "lawos",
    aws_account: "770880870480",
    aws_region: "ap-northeast-2",
    source_latest_restorable_at: "2026-07-23T00:00:00.000Z",
    restore_started_at: "2026-07-23T00:01:00.000Z",
    restore_available_at: "2026-07-23T00:21:00.000Z",
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

test("DR target binds a private PITR restore to exact source and W12 objectives", () => {
  const value = target();
  assert.equal(validateJsonPostgresDrTarget(value, {
    sourceSha: SOURCE,
    sourceTree: TREE,
    packetSha256: PACKET,
    performanceAcceptance: acceptance(),
  }).valid, true);
});

test("DR target rejects public restore and RTO drift", () => {
  const value = target();
  assert.throws(() => validateJsonPostgresDrTarget({
    ...value,
    public_access: true,
  }, { performanceAcceptance: acceptance() }), /invalid/u);
  assert.throws(() => validateJsonPostgresDrTarget({
    ...value,
    rto_ms: 3_600_001,
  }, { performanceAcceptance: acceptance() }), /invalid/u);
});
