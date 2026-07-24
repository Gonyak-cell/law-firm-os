import { createHash } from "node:crypto";
import {
  createJsonPostgresRehearsalRestoreTarget,
  validateJsonPostgresRehearsalRestoreTarget,
} from "../../packages/persistence/src/postgres/rehearsal-restore-contract.js";
import {
  canonicalizeJson,
} from "../../packages/runtime-auth/src/runtime-safety-approval-contract.js";

export const JSON_POSTGRES_REHEARSAL_SOURCE_DATABASE =
  "lawos-private-staging-postgres";

function fail(message) {
  throw new Error(message);
}

function sha256(value) {
  return createHash("sha256")
    .update(typeof value === "string"
      ? value
      : canonicalizeJson(value))
    .digest("hex");
}

function time(value, label) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) fail(`${label} is invalid`);
  return parsed;
}

function network(database) {
  const securityGroups = (database.VpcSecurityGroups ?? [])
    .map((item) => item.VpcSecurityGroupId)
    .filter(Boolean)
    .sort();
  const subnetGroup = database.DBSubnetGroup;
  if (!subnetGroup?.DBSubnetGroupName
    || subnetGroup.DBSubnetGroupStatus !== "Complete"
    || !subnetGroup.VpcId
    || securityGroups.length < 1) {
    fail("W12 database VPC network state is incomplete");
  }
  return Object.freeze({
    vpc_id: subnetGroup.VpcId,
    subnet_group_name: subnetGroup.DBSubnetGroupName,
    security_group_ids: Object.freeze(securityGroups),
  });
}

export function validateJsonPostgresRehearsalSourceDatabase(
  database = {},
) {
  if (database.DBInstanceIdentifier
      !== JSON_POSTGRES_REHEARSAL_SOURCE_DATABASE
    || database.DBInstanceStatus !== "available"
    || database.DBName !== "lawos"
    || database.Engine !== "postgres"
    || database.PubliclyAccessible !== false
    || database.MultiAZ !== false
    || database.DeletionProtection !== true
    || database.StorageEncrypted !== true
    || Number(database.BackupRetentionPeriod) < 7
    || !database.KmsKeyId
    || !database.DbiResourceId
    || !database.Endpoint?.Address
    || database.Endpoint?.Port !== 5432
    || !Number.isFinite(Date.parse(database.LatestRestorableTime))) {
    fail("W12 source database is not a durable private PITR source");
  }
  return Object.freeze({
    database_identifier: database.DBInstanceIdentifier,
    resource_id_sha256: sha256(database.DbiResourceId),
    kms_key_arn_sha256: sha256(database.KmsKeyId),
    latest_restorable_at:
      new Date(database.LatestRestorableTime).toISOString(),
    ...network(database),
  });
}

export function buildJsonPostgresRehearsalRestoreTargetFromAws({
  sourceDatabase,
  restoredDatabase,
  sourceSha,
  sourceTree,
  packetSha256,
  migrationResultSha256,
  restoreStartedAt,
  restoreAvailableAt,
  performanceAcceptance,
} = {}) {
  const source =
    validateJsonPostgresRehearsalSourceDatabase(sourceDatabase);
  const restoredNetwork = network(restoredDatabase);
  if (!restoredDatabase.DBInstanceIdentifier?.startsWith(
    `lawos-private-rehearsal-restore-${sourceSha?.slice(0, 10)}-`,
  )
    || restoredDatabase.DBInstanceIdentifier
      === JSON_POSTGRES_REHEARSAL_SOURCE_DATABASE
    || restoredDatabase.DBInstanceStatus !== "available"
    || restoredDatabase.DBName !== "lawos"
    || restoredDatabase.Engine !== "postgres"
    || restoredDatabase.PubliclyAccessible !== false
    || restoredDatabase.MultiAZ !== false
    || restoredDatabase.DeletionProtection !== false
    || restoredDatabase.StorageEncrypted !== true
    || restoredDatabase.KmsKeyId !== sourceDatabase.KmsKeyId
    || restoredNetwork.vpc_id !== source.vpc_id
    || restoredNetwork.subnet_group_name !== source.subnet_group_name
    || canonicalizeJson(restoredNetwork.security_group_ids)
      !== canonicalizeJson(source.security_group_ids)
    || !restoredDatabase.Endpoint?.Address
    || restoredDatabase.Endpoint?.Port !== 5432) {
    fail("W12 restored database drifted from the isolated private network");
  }
  const startedMs = time(restoreStartedAt, "restoreStartedAt");
  const availableMs = time(restoreAvailableAt, "restoreAvailableAt");
  const latestRestorableMs = time(
    source.latest_restorable_at,
    "source latest restorable time",
  );
  if (latestRestorableMs > startedMs || availableMs < startedMs) {
    fail("W12 restore timestamps are inconsistent");
  }
  return createJsonPostgresRehearsalRestoreTarget({
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: packetSha256,
    migration_result_sha256: migrationResultSha256,
    source_database_identifier: source.database_identifier,
    restore_database_identifier:
      restoredDatabase.DBInstanceIdentifier,
    endpoint_address: restoredDatabase.Endpoint.Address,
    endpoint_port: restoredDatabase.Endpoint.Port,
    database_name: "lawos_rehearsal",
    aws_account: "770880870480",
    aws_region: "ap-northeast-2",
    source_latest_restorable_at: source.latest_restorable_at,
    restore_started_at: new Date(startedMs).toISOString(),
    restore_available_at: new Date(availableMs).toISOString(),
    rpo_ms: startedMs - latestRestorableMs,
    rto_ms: availableMs - startedMs,
    vpc_sha256: sha256(source.vpc_id),
    subnet_group_sha256: sha256(source.subnet_group_name),
    security_group_set_sha256:
      sha256(source.security_group_ids.join("\n")),
    kms_key_arn_sha256: source.kms_key_arn_sha256,
    isolated: true,
    public_access: false,
    deletion_protection: false,
  }, { performanceAcceptance });
}

export function createJsonPostgresRehearsalRestoreResult({
  packet,
  restoreTarget,
  performanceAcceptance,
  readback,
  reconciliation,
  dmsState,
  monthlyCostForecastKrw,
  startedAt,
  finishedAt,
} = {}) {
  validateJsonPostgresRehearsalRestoreTarget(restoreTarget, {
    sourceSha: packet?.source_sha,
    sourceTree: packet?.source_tree,
    packetSha256: packet?.packet_sha256,
    performanceAcceptance,
  });
  for (const [mode, result] of [
    ["readback", readback],
    ["reconcile", reconciliation],
  ]) {
    if (result?.outcome !== "PASS"
      || result.phase !== "w12-real-data-rehearsal"
      || result.mode !== mode
      || result.source_sha !== packet.source_sha
      || result.source_tree !== packet.source_tree
      || result.packet_sha256 !== packet.packet_sha256
      || result.rehearsal_restore_target_sha256
        !== restoreTarget.restore_target_sha256
      || result.safe_counts?.tenant_negative_visible_count !== 0
      || result.raw_value_returned !== false
      || result.pii_returned !== false
      || result.secret_material_returned !== false) {
      fail(`W12 restore ${mode} result failed or drifted`);
    }
  }
  if (dmsState?.versioning_enabled !== true
    || dmsState.public_access_blocked !== true
    || dmsState.object_lock_enabled !== true
    || dmsState.legal_hold_preserved !== true
    || dmsState.reference_mismatch_count !== 0
    || !Number.isSafeInteger(dmsState.source_object_count)
    || dmsState.source_object_count < 0
    || !Number.isSafeInteger(monthlyCostForecastKrw)
    || monthlyCostForecastKrw < 0
    || monthlyCostForecastKrw
      > packet.target.monthly_cost_ceiling_krw) {
    fail("W12 restore DMS or cost controls failed");
  }
  const started = time(startedAt, "startedAt");
  const finished = time(finishedAt, "finishedAt");
  if (finished < started) fail("W12 restore result timestamps drifted");
  const material = Object.freeze({
    schema_version:
      "law-firm-os.json-postgres-rehearsal-restore-result.v1",
    outcome: "PASS",
    source_sha: packet.source_sha,
    source_tree: packet.source_tree,
    packet_sha256: packet.packet_sha256,
    restore_target_sha256: restoreTarget.restore_target_sha256,
    performance_acceptance_sha256:
      performanceAcceptance.acceptance_sha256,
    migration_result_sha256: restoreTarget.migration_result_sha256,
    readback_result_sha256: readback.result_sha256,
    reconciliation_result_sha256: reconciliation.result_sha256,
    started_at: new Date(started).toISOString(),
    finished_at: new Date(finished).toISOString(),
    checks: Object.freeze({
      isolated_restore_target_verified: true,
      postgres_restore_passed: true,
      dms_reference_restore_passed: true,
      object_lock_preserved: true,
      legal_hold_preserved: true,
      complete_reconciliation_passed: true,
      rpo_measured: true,
      rto_measured: true,
    }),
    safe_counts: Object.freeze({
      restore_variance_count: 0,
      dms_restore_mismatch_count: 0,
      restored_record_count:
        readback.safe_counts?.destination_record_count ?? 0,
      dms_source_object_count: dmsState.source_object_count,
      rpo_ms: restoreTarget.rpo_ms,
      rto_ms: restoreTarget.rto_ms,
      monthly_cost_forecast_krw: monthlyCostForecastKrw,
    }),
    claims: Object.freeze({
      source_database_mutated: false,
      production_contacted: false,
      production_write: false,
      raw_value_returned: false,
      pii_returned: false,
      secret_material_returned: false,
      document_bytes_returned: false,
    }),
  });
  return Object.freeze({
    ...material,
    result_sha256: sha256(material),
  });
}
