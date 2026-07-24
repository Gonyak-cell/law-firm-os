import assert from "node:assert/strict";
import test from "node:test";
import {
  createJsonPostgresPerformanceAcceptance,
} from "../../packages/persistence/src/postgres/performance-acceptance.js";
import {
  buildJsonPostgresRehearsalRestoreTargetFromAws,
  createJsonPostgresRehearsalRestoreResult,
  validateJsonPostgresRehearsalSourceDatabase,
} from "../lib/json-postgres-rehearsal-restore.mjs";

const SOURCE_SHA = "a".repeat(40);
const SOURCE_TREE = "b".repeat(40);
const PACKET_SHA = "c".repeat(64);

function performance() {
  return createJsonPostgresPerformanceAcceptance({
    record_count: 287,
    tenant_count: 1,
    batch_size: 287,
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

function database({ restored = false } = {}) {
  return {
    DBInstanceIdentifier: restored
      ? `lawos-private-rehearsal-restore-${SOURCE_SHA.slice(0, 10)}-a1`
      : "lawos-private-staging-postgres",
    DBInstanceStatus: "available",
    DBName: "lawos",
    Engine: "postgres",
    PubliclyAccessible: false,
    MultiAZ: false,
    DeletionProtection: !restored,
    StorageEncrypted: true,
    BackupRetentionPeriod: 7,
    KmsKeyId:
      "arn:aws:kms:ap-northeast-2:770880870480:key/1234",
    DbiResourceId: restored ? "db-RESTORED" : "db-SOURCE",
    LatestRestorableTime: "2026-07-24T00:00:00.000Z",
    Endpoint: {
      Address: restored
        ? `lawos-private-rehearsal-restore-${SOURCE_SHA.slice(0, 10)}-a1.abcdefghijkl.ap-northeast-2.rds.amazonaws.com`
        : "lawos-private-staging-postgres.abcdefghijkl.ap-northeast-2.rds.amazonaws.com",
      Port: 5432,
    },
    DBSubnetGroup: {
      DBSubnetGroupName: "lawos-private-staging-db-subnets",
      SubnetGroupStatus: "Complete",
      VpcId: "vpc-1234",
    },
    VpcSecurityGroups: [{ VpcSecurityGroupId: "sg-1234" }],
  };
}

test("W12 restore accepts only the private staging PITR source and exact isolated network", () => {
  assert.equal(
    validateJsonPostgresRehearsalSourceDatabase(database())
      .database_identifier,
    "lawos-private-staging-postgres",
  );
  const target = buildJsonPostgresRehearsalRestoreTargetFromAws({
    sourceDatabase: database(),
    restoredDatabase: database({ restored: true }),
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    packetSha256: PACKET_SHA,
    migrationResultSha256: "e".repeat(64),
    restoreStartedAt: "2026-07-24T00:01:00.000Z",
    restoreAvailableAt: "2026-07-24T00:21:00.000Z",
    performanceAcceptance: performance(),
  });
  assert.equal(target.rpo_ms, 60_000);
  assert.equal(target.rto_ms, 1_200_000);
  assert.throws(() => buildJsonPostgresRehearsalRestoreTargetFromAws({
    sourceDatabase: database(),
    restoredDatabase: {
      ...database({ restored: true }),
      VpcSecurityGroups: [{ VpcSecurityGroupId: "sg-other" }],
    },
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    packetSha256: PACKET_SHA,
    migrationResultSha256: "e".repeat(64),
    restoreStartedAt: "2026-07-24T00:01:00.000Z",
    restoreAvailableAt: "2026-07-24T00:21:00.000Z",
    performanceAcceptance: performance(),
  }), /network/u);
  assert.throws(() => validateJsonPostgresRehearsalSourceDatabase({
    ...database(),
    DBSubnetGroup: {
      ...database().DBSubnetGroup,
      SubnetGroupStatus: "Pending",
    },
  }), /network/u);
});

test("W12 restore result closes reconciliation and zero-object DMS references without production claims", () => {
  const acceptance = performance();
  const target = buildJsonPostgresRehearsalRestoreTargetFromAws({
    sourceDatabase: database(),
    restoredDatabase: database({ restored: true }),
    sourceSha: SOURCE_SHA,
    sourceTree: SOURCE_TREE,
    packetSha256: PACKET_SHA,
    migrationResultSha256: "e".repeat(64),
    restoreStartedAt: "2026-07-24T00:01:00.000Z",
    restoreAvailableAt: "2026-07-24T00:21:00.000Z",
    performanceAcceptance: acceptance,
  });
  const packet = {
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    target: { monthly_cost_ceiling_krw: 300_000 },
  };
  const response = (mode, digest) => ({
    outcome: "PASS",
    phase: "w12-real-data-rehearsal",
    mode,
    source_sha: SOURCE_SHA,
    source_tree: SOURCE_TREE,
    packet_sha256: PACKET_SHA,
    rehearsal_restore_target_sha256: target.restore_target_sha256,
    result_sha256: digest.repeat(64),
    safe_counts: {
      tenant_negative_visible_count: 0,
      destination_record_count: 1_676,
    },
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  });
  const result = createJsonPostgresRehearsalRestoreResult({
    packet,
    restoreTarget: target,
    performanceAcceptance: acceptance,
    readback: response("readback", "1"),
    reconciliation: response("reconcile", "2"),
    dmsState: {
      versioning_enabled: true,
      public_access_blocked: true,
      object_lock_enabled: true,
      legal_hold_preserved: true,
      reference_mismatch_count: 0,
      source_object_count: 0,
    },
    monthlyCostForecastKrw: 162_630,
    startedAt: "2026-07-24T00:01:00.000Z",
    finishedAt: "2026-07-24T00:22:00.000Z",
  });
  assert.equal(result.outcome, "PASS");
  assert.equal(result.safe_counts.restore_variance_count, 0);
  assert.equal(result.claims.production_write, false);
});
