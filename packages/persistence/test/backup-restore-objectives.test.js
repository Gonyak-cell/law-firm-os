import assert from "node:assert/strict";
import test from "node:test";

import { createJsonPostgresPerformanceAcceptance } from "../src/postgres/performance-acceptance.js";
import { calculateJsonPostgresBackupRestoreObjectives } from "../src/postgres/backup-restore-state-contract.js";

function acceptance({ rpo_target_ms = 10_000, rto_target_ms = 20_000 } = {}) {
  return createJsonPostgresPerformanceAcceptance({
    record_count: 100, tenant_count: 1, batch_size: 10, pool_max: 4,
    statement_timeout_ms: 120_000, connection_timeout_ms: 10_000,
    migration_p95_ms: 5_000, outbox_lag_p95_ms: 2_000,
    dms_throughput_min_bytes_per_second: 0, rpo_target_ms, rto_target_ms,
    rehearsal_result_sha256: "d".repeat(64),
  });
}

test("backup/restore objectives ceil durations and pass exact effective boundaries", () => {
  const performance = acceptance({ rpo_target_ms: 11_000, rto_target_ms: 21_000 });
  const result = calculateJsonPostgresBackupRestoreObjectives({
    backupPointAt: "2026-08-13T00:00:00.000Z", startedAt: "2026-08-13T00:00:10.001Z",
    finishedAt: "2026-08-13T00:00:31.001Z", performanceAcceptance: performance,
    approvedRpoSeconds: 20, approvedRtoSeconds: 30, approvedThresholdSha256: performance.acceptance_sha256,
  });
  assert.deepEqual(result, {
    valid: true, rpo_seconds: 11, rto_seconds: 21,
    effective_rpo_limit_seconds: 11, effective_rto_limit_seconds: 21,
    approved_threshold_sha256: performance.acceptance_sha256,
  });
});

test("backup/restore objectives reject +1, owner ceiling, threshold, and time violations", () => {
  const performance = acceptance();
  const base = {
    backupPointAt: "2026-08-13T00:00:00.000Z", startedAt: "2026-08-13T00:00:10.000Z",
    finishedAt: "2026-08-13T00:00:30.000Z", performanceAcceptance: performance,
    approvedRpoSeconds: 10, approvedRtoSeconds: 20, approvedThresholdSha256: performance.acceptance_sha256,
  };
  assert.equal(calculateJsonPostgresBackupRestoreObjectives(base).valid, true);
  assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, startedAt: "2026-08-13T00:00:11.000Z" }), /threshold/u);
  assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, approvedRpoSeconds: 86_401 }), /between/u);
  assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, approvedRtoSeconds: 14_401 }), /between/u);
  assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, approvedThresholdSha256: "e".repeat(64) }), /threshold/u);
  assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, startedAt: "2026-08-12T23:59:59.000Z" }), /order/u);
  assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, finishedAt: "2026-08-13T00:00:09.000Z" }), /order|threshold/u);
  assert.equal(Object.hasOwn(calculateJsonPostgresBackupRestoreObjectives(base), "signature_verified"), false);
});

test("backup/restore objectives reject each timestamp, malformed date, and malformed threshold", () => {
  const performance = acceptance();
  const base = {
    backupPointAt: "2026-08-13T00:00:10.000Z", startedAt: "2026-08-13T00:00:20.000Z",
    finishedAt: "2026-08-13T00:00:30.000Z", performanceAcceptance: performance,
    approvedRpoSeconds: 30, approvedRtoSeconds: 30, approvedThresholdSha256: performance.acceptance_sha256,
  };
  assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, backupPointAt: "2026-08-13T00:00:21.000Z" }), /order/u);
  assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, startedAt: "2026-08-13T00:00:31.000Z" }), /order|threshold/u);
  assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, finishedAt: "2026-08-13T00:00:19.000Z" }), /order/u);
  for (const field of ["backupPointAt", "startedAt", "finishedAt"]) {
    for (const value of ["not-a-utc-time", "2026-02-30T00:00:00.000Z", "2026-08-13T24:00:00.000Z"]) {
      assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, [field]: value }), /timestamp|UTC/u);
    }
  }
  for (const approvedThresholdSha256 of [undefined, "short", "E".repeat(64)]) {
    assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, approvedThresholdSha256 }), /digest|threshold/u);
  }
  assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, performanceAcceptance: undefined }), /performance|acceptance/u);
  assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({ ...base, performanceAcceptance: { ...performance, rpo_target_ms: performance.rpo_target_ms + 1 } }), /digest|invalid/u);
});

test("backup/restore objectives honor a stricter performance target than owner ceiling", () => {
  const performance = acceptance({ rpo_target_ms: 3_999, rto_target_ms: 4_001 });
  const result = calculateJsonPostgresBackupRestoreObjectives({
    backupPointAt: "2026-08-13T00:00:00.000Z", startedAt: "2026-08-13T00:00:03.000Z",
    finishedAt: "2026-08-13T00:00:07.000Z", performanceAcceptance: performance,
    approvedRpoSeconds: 30, approvedRtoSeconds: 30, approvedThresholdSha256: performance.acceptance_sha256,
  });
  assert.equal(result.effective_rpo_limit_seconds, 3);
  assert.equal(result.effective_rto_limit_seconds, 4);
  assert.throws(() => calculateJsonPostgresBackupRestoreObjectives({
    backupPointAt: "2026-08-13T00:00:00.000Z", startedAt: "2026-08-13T00:00:04.000Z",
    finishedAt: "2026-08-13T00:00:08.000Z", performanceAcceptance: performance,
    approvedRpoSeconds: 30, approvedRtoSeconds: 30, approvedThresholdSha256: performance.acceptance_sha256,
  }), /threshold/u);
});
