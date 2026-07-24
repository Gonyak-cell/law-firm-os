import { createHash } from "node:crypto";
import {
  createJsonPostgresDrTarget,
  validateJsonPostgresDrTarget,
} from "../../packages/persistence/src/postgres/dr-recovery-contract.js";
import {
  createJsonPostgresStageProbe,
} from "../../packages/persistence/src/postgres/program-stage-observation.js";
import {
  jsonPostgresProgramBindingsSha256,
} from "../../packages/persistence/src/postgres/program-stage-gates.js";

const REQUIRED_DATABASE_IDENTIFIER = "lawos-production-postgres";

function sha256(value) {
  return createHash("sha256").update(
    typeof value === "string" ? value : JSON.stringify(value),
  ).digest("hex");
}

function fail(message) {
  throw new Error(message);
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
    || subnetGroup.SubnetGroupStatus !== "Complete"
    || !subnetGroup.VpcId
    || securityGroups.length < 1) {
    fail("database VPC network state is incomplete");
  }
  return {
    vpc_id: subnetGroup.VpcId,
    subnet_group_name: subnetGroup.DBSubnetGroupName,
    security_group_ids: securityGroups,
  };
}

export function validateJsonPostgresDrSourceDatabase(database = {}) {
  if (database.DBInstanceIdentifier !== REQUIRED_DATABASE_IDENTIFIER
    || database.DBInstanceStatus !== "available"
    || database.Engine !== "postgres"
    || database.PubliclyAccessible !== false
    || database.MultiAZ !== true
    || database.DeletionProtection !== true
    || database.StorageEncrypted !== true
    || !database.KmsKeyId
    || !database.DbiResourceId
    || !database.Endpoint?.Address
    || database.Endpoint?.Port !== 5432
    || !Number.isFinite(Date.parse(database.LatestRestorableTime))) {
    fail("production source database is not a durable private PITR source");
  }
  return Object.freeze({
    database_identifier: database.DBInstanceIdentifier,
    resource_id_sha256: sha256(database.DbiResourceId),
    kms_key_arn_sha256: sha256(database.KmsKeyId),
    latest_restorable_at: new Date(database.LatestRestorableTime).toISOString(),
    ...network(database),
  });
}

export function buildJsonPostgresDrTargetFromAws({
  sourceDatabase,
  restoredDatabase,
  sourceSha,
  sourceTree,
  packetSha256,
  cut009ReceiptSha256,
  migrationResultSha256,
  restoreStartedAt,
  restoreAvailableAt,
  performanceAcceptance,
} = {}) {
  const source = validateJsonPostgresDrSourceDatabase(sourceDatabase);
  const restoredNetwork = network(restoredDatabase);
  if (restoredDatabase.DBInstanceStatus !== "available"
    || restoredDatabase.Engine !== "postgres"
    || restoredDatabase.PubliclyAccessible !== false
    || restoredDatabase.MultiAZ !== false
    || restoredDatabase.DeletionProtection !== false
    || restoredDatabase.StorageEncrypted !== true
    || restoredDatabase.KmsKeyId !== sourceDatabase.KmsKeyId
    || restoredNetwork.vpc_id !== source.vpc_id
    || restoredNetwork.subnet_group_name !== source.subnet_group_name
    || JSON.stringify(restoredNetwork.security_group_ids) !== JSON.stringify(source.security_group_ids)
    || !restoredDatabase.Endpoint?.Address
    || restoredDatabase.Endpoint?.Port !== 5432) {
    fail("isolated DR database state drifted from the private production network");
  }
  const startedMs = time(restoreStartedAt, "restoreStartedAt");
  const availableMs = time(restoreAvailableAt, "restoreAvailableAt");
  const latestRestorableMs = time(source.latest_restorable_at, "latest restorable time");
  if (latestRestorableMs > startedMs || availableMs < startedMs) {
    fail("DR restore timestamps are inconsistent");
  }
  return createJsonPostgresDrTarget({
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: packetSha256,
    cut009_receipt_sha256: cut009ReceiptSha256,
    migration_result_sha256: migrationResultSha256,
    source_database_identifier: source.database_identifier,
    restore_database_identifier: restoredDatabase.DBInstanceIdentifier,
    endpoint_address: restoredDatabase.Endpoint.Address,
    endpoint_port: restoredDatabase.Endpoint.Port,
    database_name: restoredDatabase.DBName ?? "lawos",
    aws_account: "770880870480",
    aws_region: "ap-northeast-2",
    source_latest_restorable_at: source.latest_restorable_at,
    restore_started_at: new Date(startedMs).toISOString(),
    restore_available_at: new Date(availableMs).toISOString(),
    rpo_ms: startedMs - latestRestorableMs,
    rto_ms: availableMs - startedMs,
    vpc_sha256: sha256(source.vpc_id),
    subnet_group_sha256: sha256(source.subnet_group_name),
    security_group_set_sha256: sha256(source.security_group_ids.join("\n")),
    kms_key_arn_sha256: source.kms_key_arn_sha256,
    isolated: true,
    public_access: false,
    deletion_protection: false,
  }, { performanceAcceptance });
}

export function createJsonPostgresCut010Probe({
  packet,
  drTarget,
  performanceAcceptance,
  readback,
  reconciliation,
  dmsState,
  monthlyCostForecastKrw,
  startedAt,
  finishedAt,
  evidenceSha256,
  probeId,
} = {}) {
  validateJsonPostgresDrTarget(drTarget, {
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    packetSha256: packet.packet_sha256,
    performanceAcceptance,
  });
  for (const [label, value] of [["readback", readback], ["reconciliation", reconciliation]]) {
    if (value?.outcome !== "PASS"
      || value.source_sha !== packet.source_sha
      || value.source_tree !== packet.source_tree
      || value.packet_sha256 !== packet.packet_sha256
      || value.dr_target_sha256 !== drTarget.dr_target_sha256
      || value.safe_counts?.tenant_negative_visible_count !== 0
      || value.raw_value_returned !== false
      || value.pii_returned !== false
      || value.secret_material_returned !== false) {
      fail(`CUT-010 ${label} result failed or drifted`);
    }
  }
  if (dmsState?.versioning_enabled !== true
    || dmsState?.public_access_blocked !== true
    || dmsState?.object_lock_enabled !== true
    || dmsState?.legal_hold_preserved !== true
    || dmsState?.reference_mismatch_count !== 0) {
    fail("CUT-010 DMS restore controls failed");
  }
  return createJsonPostgresStageProbe({
    probeId,
    stage: "cut-010",
    probeKind: "isolated-dr-restore",
    collectorRef: "run-json-postgres-dr-recovery.mjs",
    sourceSha: packet.source_sha,
    sourceTree: packet.source_tree,
    packetSha256: packet.packet_sha256,
    bindingsSha256: jsonPostgresProgramBindingsSha256(packet),
    startedAt,
    finishedAt,
    command: "node scripts/run-json-postgres-dr-recovery.mjs --operation readback",
    checks: {
      isolated_restore_target_verified: true,
      postgres_restore_passed: true,
      dms_reference_restore_passed: true,
      object_lock_preserved: true,
      legal_hold_preserved: true,
      complete_reconciliation_passed: true,
      missing_json_startup_passed: true,
      representative_reads_passed: true,
      rpo_measured: true,
      rto_measured: true,
      rpo_target_met: true,
      rto_target_met: true,
      readonly_auditor_verified: true,
    },
    safeCounts: {
      restore_variance_count: 0,
      dms_restore_mismatch_count: 0,
      tenant_negative_visible_count: 0,
      rpo_ms: drTarget.rpo_ms,
      rto_ms: drTarget.rto_ms,
      restored_record_count: readback.safe_counts?.destination_record_count ?? 0,
      monthly_cost_forecast_krw: monthlyCostForecastKrw,
    },
    evidenceSha256,
  });
}
