import assert from "node:assert/strict";
import test from "node:test";
import { createJsonPostgresPerformanceAcceptance } from "../../packages/persistence/src/postgres/performance-acceptance.js";
import {
  buildJsonPostgresDrTargetFromAws,
  createJsonPostgresCut010Probe,
  validateJsonPostgresDrSourceDatabase,
} from "../lib/json-postgres-dr-recovery.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const PACKET_SHA = "c".repeat(64);

function performance() {
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

function database({ restored = false } = {}) {
  return {
    DBInstanceIdentifier: restored
      ? `lawos-production-dr-${SOURCE_SHA.slice(0, 10)}-attempt1`
      : "lawos-production-postgres",
    DBInstanceStatus: "available",
    DBName: "lawos",
    Engine: "postgres",
    PubliclyAccessible: false,
    MultiAZ: !restored,
    DeletionProtection: !restored,
    StorageEncrypted: true,
    KmsKeyId: "arn:aws:kms:ap-northeast-2:770880870480:key/1234",
    DbiResourceId: restored ? "db-RESTORED" : "db-SOURCE",
    LatestRestorableTime: "2026-07-23T00:00:00.000Z",
    Endpoint: {
      Address: restored
        ? `lawos-production-dr-${SOURCE_SHA.slice(0, 10)}-attempt1.abcdefghijkl.ap-northeast-2.rds.amazonaws.com`
        : "lawos-production-postgres.abcdefghijkl.ap-northeast-2.rds.amazonaws.com",
      Port: 5432,
    },
    DBSubnetGroup: {
      DBSubnetGroupName: "lawos-production-db-subnets",
      SubnetGroupStatus: "Complete",
      VpcId: "vpc-1234",
    },
    VpcSecurityGroups: [{ VpcSecurityGroupId: "sg-1234" }],
  };
}

test("DR recovery accepts only private PITR state and produces a complete CUT-010 probe", () => {
  const source = database();
  assert.equal(validateJsonPostgresDrSourceDatabase(source).database_identifier, "lawos-production-postgres");
  const target = buildJsonPostgresDrTargetFromAws({
    sourceDatabase: source,
    restoredDatabase: database({ restored: true }),
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    packetSha256: PACKET_SHA,
    cut009ReceiptSha256: "e".repeat(64),
    migrationResultSha256: "f".repeat(64),
    restoreStartedAt: "2026-07-23T00:01:00.000Z",
    restoreAvailableAt: "2026-07-23T00:21:00.000Z",
    performanceAcceptance: performance(),
  });
  const packet = {
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    bindings: { performance_acceptance_sha256: performance().acceptance_sha256 },
    target: { monthly_cost_ceiling_krw: 300_000 },
  };
  const result = {
    outcome: "PASS",
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    dr_target_sha256: target.dr_target_sha256,
    safe_counts: { tenant_negative_visible_count: 0, destination_record_count: 287 },
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  };
  const probe = createJsonPostgresCut010Probe({
    packet,
    drTarget: target,
    performanceAcceptance: performance(),
    readback: result,
    reconciliation: result,
    dmsState: {
      versioning_enabled: true,
      public_access_blocked: true,
      object_lock_enabled: true,
      legal_hold_preserved: true,
      reference_mismatch_count: 0,
    },
    monthlyCostForecastKrw: 269_100,
    startedAt: "2026-07-23T00:01:00.000Z",
    finishedAt: "2026-07-23T00:22:00.000Z",
    evidenceSha256: "1".repeat(64),
    probeId: "cut010-attempt1",
  });
  assert.equal(probe.outcome, "PASS");
  assert.equal(probe.safe_counts.rto_ms, 1_200_000);
});

test("DR recovery rejects public source or mismatched restored network", () => {
  assert.throws(() => validateJsonPostgresDrSourceDatabase({
    ...database(),
    PubliclyAccessible: true,
  }), /private/u);
  assert.throws(() => buildJsonPostgresDrTargetFromAws({
    sourceDatabase: database(),
    restoredDatabase: {
      ...database({ restored: true }),
      VpcSecurityGroups: [{ VpcSecurityGroupId: "sg-other" }],
    },
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    packetSha256: PACKET_SHA,
    cut009ReceiptSha256: "e".repeat(64),
    migrationResultSha256: "f".repeat(64),
    restoreStartedAt: "2026-07-23T00:01:00.000Z",
    restoreAvailableAt: "2026-07-23T00:21:00.000Z",
    performanceAcceptance: performance(),
  }), /network/u);
  assert.throws(() => validateJsonPostgresDrSourceDatabase({
    ...database(),
    DBSubnetGroup: {
      ...database().DBSubnetGroup,
      SubnetGroupStatus: "Pending",
    },
  }), /network/u);
});
