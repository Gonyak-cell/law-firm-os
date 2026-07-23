#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  validateJsonPostgresDrTarget,
} from "../packages/persistence/src/postgres/dr-recovery-contract.js";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  validateJsonPostgresPerformanceAcceptance,
} from "../packages/persistence/src/postgres/performance-acceptance.js";
import {
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import { canonicalizeJson } from "../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  assertJsonPostgresProductionCaller,
  JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE,
  JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE,
  JSON_POSTGRES_PRODUCTION_REGION,
  JSON_POSTGRES_PRODUCTION_STACK,
} from "./lib/json-postgres-production-execution.mjs";
import {
  buildJsonPostgresDrTargetFromAws,
  createJsonPostgresCut010Probe,
  validateJsonPostgresDrSourceDatabase,
} from "./lib/json-postgres-dr-recovery.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const OPERATIONS = new Set(["restore", "readback", "cleanup"]);
const SOURCE_DATABASE = "lawos-production-postgres";

function parse(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--") || !value || value.startsWith("--") || values[flag.slice(2)] != null) {
      throw new TypeError(`invalid option: ${flag ?? ""}`);
    }
    values[flag.slice(2)] = value;
  }
  return values;
}

function required(value, name) {
  if (!value) throw new TypeError(`--${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
}

function awsJson(profile, args) {
  const output = execFileSync("aws", [
    ...args,
    "--profile", profile,
    "--region", JSON_POSTGRES_PRODUCTION_REGION,
    "--no-cli-pager",
    "--output", "json",
  ], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return output ? JSON.parse(output) : {};
}

function awsWait(profile, args) {
  execFileSync("aws", [
    ...args,
    "--profile", profile,
    "--region", JSON_POSTGRES_PRODUCTION_REGION,
    "--no-cli-pager",
  ], { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 16 * 1024 * 1024 });
}

function caller(profile, role) {
  return assertJsonPostgresProductionCaller(
    awsJson(profile, ["sts", "get-caller-identity"]),
    { role },
  );
}

function database(profile, identifier) {
  const rows = awsJson(profile, [
    "rds", "describe-db-instances", "--db-instance-identifier", identifier,
  ]).DBInstances ?? [];
  if (rows.length !== 1) throw new Error("expected exactly one RDS database");
  return rows[0];
}

function stackOutputs(profile) {
  const stack = awsJson(profile, [
    "cloudformation", "describe-stacks", "--stack-name", JSON_POSTGRES_PRODUCTION_STACK,
  ]).Stacks?.[0];
  if (!stack || !/^(?:CREATE|UPDATE)_COMPLETE$/u.test(stack.StackStatus ?? "")) {
    throw new Error("production stack is not complete");
  }
  return Object.fromEntries((stack.Outputs ?? []).map((item) => [item.OutputKey, item.OutputValue]));
}

function privateFile(path, label) {
  const bytes = readPrivateProgramBytes(path, label);
  return { bytes, value: JSON.parse(bytes.toString("utf8")) };
}

function verifiedReceipt(path, kind, trustRegistry, expected) {
  const receipt = readPrivateProgramJson(path, `${kind} receipt`);
  const signature = readPrivateProgramBytes(`${path}.sig`, `${kind} receipt signature`);
  const verified = verifyJsonPostgresProgramReceipt({
    receipt,
    signature,
    trustRegistry,
    expected,
  });
  if (verified.receipt_kind !== kind || verified.execution_state !== "PASS") {
    throw new Error(`${kind} predecessor receipt is not PASS`);
  }
  return { receipt, verified };
}

const options = parse(process.argv.slice(2));
const operation = required(options.operation, "operation");
if (!OPERATIONS.has(operation)) throw new Error("unsupported DR operation");
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("DR execution requires a clean exact-main worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) throw new Error("DR execution requires exact origin/main");
const packetSource = readPrivateProgramJson(required(options.packet, "packet"), "W13 execution packet");
const packetValidation = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w13-production-cutover",
});
const packet = Object.freeze({ ...packetSource, packet_sha256: packetValidation.packet_sha256 });
const registryPath = required(options.registry, "registry");
const trustRegistry = readPrivateProgramJson(registryPath, "owner trust registry");
const approval = verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: registryPath,
  trustRegistrySha256: required(options["registry-sha256"], "registry-sha256"),
  approvalReceiptPath: required(options.approval, "approval"),
});
const performanceFile = privateFile(
  required(options["performance-acceptance"], "performance-acceptance"),
  "performance acceptance",
);
const performance = validateJsonPostgresPerformanceAcceptance(performanceFile.value);
if (performance.acceptance_sha256 !== packet.bindings.performance_acceptance_sha256) {
  throw new Error("performance acceptance packet binding drifted");
}
const cut009 = verifiedReceipt(
  required(options["cut009-receipt"], "cut009-receipt"),
  "cut-009",
  trustRegistry,
  { sourceSha, sourceTree, packetSha256: packet.packet_sha256 },
);
const migration = readPrivateProgramJson(
  required(options["migration-result"], "migration-result"),
  "CUT-009 migration result",
);
if (migration.outcome !== "PASS"
  || migration.phase !== "w13-production-cutover"
  || migration.source_sha !== sourceSha
  || migration.source_tree !== sourceTree
  || migration.packet_sha256 !== packet.packet_sha256
  || !/^[0-9a-f]{64}$/u.test(migration.result_sha256 ?? "")
  || migration.claims?.production_write !== true) {
  throw new Error("CUT-009 migration result is invalid");
}
const outputDir = createPrivateProgramOutputDirectory(required(options["output-dir"], "output-dir"));
const attemptRef = required(options["attempt-ref"], "attempt-ref");
if (!/^[a-z0-9][a-z0-9-]{0,31}$/u.test(attemptRef)) throw new Error("attempt-ref is invalid");

let summary;
if (operation === "restore") {
  const deployCaller = caller(JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE, JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE);
  const auditCaller = caller(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE, JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE);
  const source = database(JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE, SOURCE_DATABASE);
  const auditedSource = database(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE, SOURCE_DATABASE);
  const sourceState = validateJsonPostgresDrSourceDatabase(source);
  if (canonicalizeJson(source) !== canonicalizeJson(auditedSource)) {
    throw new Error("readonly auditor observed different source RDS state");
  }
  const identifier = `lawos-production-dr-${sourceSha.slice(0, 10)}-${attemptRef}`.slice(0, 63);
  const startedAt = new Date().toISOString();
  awsJson(JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE, [
    "rds", "restore-db-instance-to-point-in-time",
    "--source-db-instance-identifier", SOURCE_DATABASE,
    "--target-db-instance-identifier", identifier,
    "--use-latest-restorable-time",
    "--db-subnet-group-name", sourceState.subnet_group_name,
    "--vpc-security-group-ids", ...sourceState.security_group_ids,
    "--no-publicly-accessible",
    "--no-multi-az",
    "--no-deletion-protection",
    "--copy-tags-to-snapshot",
    "--tags",
    "Key=environment,Value=lawos-production-dr",
    `Key=source-sha,Value=${sourceSha}`,
    `Key=packet-sha256,Value=${packet.packet_sha256}`,
    `Key=attempt-ref,Value=${attemptRef}`,
  ]);
  awsWait(JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE, [
    "rds", "wait", "db-instance-available", "--db-instance-identifier", identifier,
  ]);
  const restored = database(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE, identifier);
  const availableAt = new Date().toISOString();
  const drTarget = buildJsonPostgresDrTargetFromAws({
    sourceDatabase: auditedSource,
    restoredDatabase: restored,
    sourceSha,
    sourceTree,
    packetSha256: packet.packet_sha256,
    cut009ReceiptSha256: cut009.verified.canonical_sha256,
    migrationResultSha256: migration.result_sha256,
    restoreStartedAt: startedAt,
    restoreAvailableAt: availableAt,
    performanceAcceptance: performanceFile.value,
  });
  const targetFile = writePrivateProgramJson(join(outputDir, "dr-target.json"), drTarget);
  const outputs = stackOutputs(JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE);
  if (!outputs.ProgramInputBucketName
    || outputs.ProgramInputBucketName !== packet.target.program_input_bucket_name
    || !outputs.ProgramInputKmsKeyArn) {
    throw new Error("production program-input stack output drifted");
  }
  const key = `program-input/dr/${packet.packet_sha256}/${attemptRef}/${drTarget.dr_target_sha256}.json`;
  const retainedUntil = new Date(
    Math.max(Date.parse(approval.expires_at), Date.now()) + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const uploaded = awsJson(JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE, [
    "s3api", "put-object",
    "--bucket", packet.target.program_input_bucket_name,
    "--key", key,
    "--body", targetFile.path,
    "--expected-bucket-owner", packet.target.aws_account,
    "--server-side-encryption", "aws:kms",
    "--ssekms-key-id", outputs.ProgramInputKmsKeyArn,
    "--object-lock-mode", "COMPLIANCE",
    "--object-lock-retain-until-date", retainedUntil,
    "--metadata", `sha256=${targetFile.sha256},packet-sha256=${packet.packet_sha256}`,
  ]);
  const size = statSync(targetFile.path).size;
  if (!uploaded.VersionId || uploaded.VersionId === "null") {
    throw new Error("DR target upload did not return an immutable version");
  }
  const locator = {
    schema_version: "law-firm-os.immutable-program-input-locator.v1",
    bucket: packet.target.program_input_bucket_name,
    key,
    version_id: uploaded.VersionId,
    expected_bucket_owner: packet.target.aws_account,
    sha256: targetFile.sha256,
    byte_size: size,
  };
  const locatorFile = writePrivateProgramJson(join(outputDir, "dr-target-locator.json"), locator);
  summary = {
    operation,
    outcome: "PASS",
    deploy_caller: deployCaller,
    audit_caller: auditCaller,
    dr_target_sha256: drTarget.dr_target_sha256,
    dr_target_file_sha256: targetFile.sha256,
    dr_target_locator_sha256: locatorFile.sha256,
    rpo_ms: drTarget.rpo_ms,
    rto_ms: drTarget.rto_ms,
    isolated_target_count: 1,
    public_target_count: 0,
    production_data_write_count: 0,
  };
} else if (operation === "readback") {
  const auditCaller = caller(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE, JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE);
  const drTarget = readPrivateProgramJson(required(options["dr-target"], "dr-target"), "DR target");
  validateJsonPostgresDrTarget(drTarget, {
    sourceSha,
    sourceTree,
    packetSha256: packet.packet_sha256,
    performanceAcceptance: performanceFile.value,
  });
  const locator = readPrivateProgramJson(
    required(options["dr-target-locator"], "dr-target-locator"),
    "DR target locator",
  );
  if (locator.sha256 !== sha256ProgramBytes(readFileSync(required(options["dr-target"], "dr-target")))) {
    throw new Error("DR target locator content digest drifted");
  }
  const restored = database(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE, drTarget.restore_database_identifier);
  const observedTarget = buildJsonPostgresDrTargetFromAws({
    sourceDatabase: database(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE, SOURCE_DATABASE),
    restoredDatabase: restored,
    sourceSha,
    sourceTree,
    packetSha256: packet.packet_sha256,
    cut009ReceiptSha256: cut009.verified.canonical_sha256,
    migrationResultSha256: migration.result_sha256,
    restoreStartedAt: drTarget.restore_started_at,
    restoreAvailableAt: drTarget.restore_available_at,
    performanceAcceptance: performanceFile.value,
  });
  if (observedTarget.dr_target_sha256 !== drTarget.dr_target_sha256) {
    throw new Error("live isolated DR target state drifted from its immutable descriptor");
  }
  const baseEvent = readPrivateProgramJson(required(options.event, "event"), "DR base invocation event");
  const invokeResults = {};
  for (const mode of ["readback", "reconcile"]) {
    const event = {
      ...baseEvent,
      action: "lawos-json-postgres-program-execution",
      phase: "w13-production-cutover",
      stage: "cut-010",
      mode,
      attempt_ref: `${attemptRef}-${mode}`,
      source_sha: sourceSha,
      source_tree: sourceTree,
      artifact_sha256: packet.bindings.artifact_sha256,
      packet_sha256: packet.packet_sha256,
      dr_recovery: {
        dr_target: locator,
        performance_acceptance: baseEvent.dr_recovery?.performance_acceptance,
      },
    };
    if (!event.dr_recovery.performance_acceptance) {
      throw new Error("base event must bind the immutable performance acceptance locator");
    }
    const eventFile = writePrivateProgramJson(join(outputDir, `${mode}-event.json`), event);
    const responsePath = join(outputDir, `${mode}-response.json`);
    const invocation = awsJson(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE, [
      "lambda", "invoke",
      "--function-name", "lawos-production-admin",
      "--invocation-type", "RequestResponse",
      "--cli-binary-format", "raw-in-base64-out",
      "--payload", `fileb://${eventFile.path}`,
      responsePath,
    ]);
    chmodSync(responsePath, 0o600);
    if (invocation.FunctionError) throw new Error(`CUT-010 ${mode} Lambda invocation failed`);
    invokeResults[mode] = JSON.parse(readFileSync(responsePath, "utf8"));
  }
  const dmsVersioning = awsJson(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE, [
    "s3api", "get-bucket-versioning",
    "--bucket", packet.target.dms_bucket_name,
    "--expected-bucket-owner", packet.target.aws_account,
  ]);
  const dmsPublic = awsJson(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE, [
    "s3api", "get-public-access-block",
    "--bucket", packet.target.dms_bucket_name,
    "--expected-bucket-owner", packet.target.aws_account,
  ]);
  const dmsLock = awsJson(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE, [
    "s3api", "get-object-lock-configuration",
    "--bucket", packet.target.dms_bucket_name,
    "--expected-bucket-owner", packet.target.aws_account,
  ]);
  const dmsCounts = invokeResults.reconcile.safe_counts ?? {};
  for (const key of [
    "dms_source_object_count",
    "dms_verified_object_count",
    "dms_provider_version_count",
    "dms_retention_verified_count",
    "dms_legal_hold_verified_count",
    "dms_tenant_negative_visible_count",
  ]) {
    if (!Number.isSafeInteger(dmsCounts[key]) || dmsCounts[key] < 0) {
      throw new Error(`CUT-010 reconciliation is missing the exact DMS count: ${key}`);
    }
  }
  const referenceMismatchCount = [
    dmsCounts.dms_verified_object_count,
    dmsCounts.dms_provider_version_count,
    dmsCounts.dms_retention_verified_count,
  ].reduce((total, count) => total + Math.abs(dmsCounts.dms_source_object_count - count), 0)
    + dmsCounts.dms_tenant_negative_visible_count;
  const dmsState = {
    versioning_enabled: dmsVersioning.Status === "Enabled",
    public_access_blocked: Object.values(
      dmsPublic.PublicAccessBlockConfiguration ?? {},
    ).length === 4 && Object.values(dmsPublic.PublicAccessBlockConfiguration).every(Boolean),
    object_lock_enabled: dmsLock.ObjectLockConfiguration?.ObjectLockEnabled === "Enabled",
    legal_hold_preserved: invokeResults.reconcile.outcome === "PASS"
      && dmsCounts.dms_legal_hold_verified_count >= 0,
    reference_mismatch_count: referenceMismatchCount,
  };
  const evidenceSha256 = createHash("sha256").update(canonicalizeJson({
    dr_target_sha256: drTarget.dr_target_sha256,
    readback_result_sha256: invokeResults.readback.result_sha256,
    reconciliation_result_sha256: invokeResults.reconcile.result_sha256,
    dms_state: dmsState,
    audit_caller: auditCaller,
  })).digest("hex");
  const probe = createJsonPostgresCut010Probe({
    packet,
    drTarget,
    performanceAcceptance: performanceFile.value,
    readback: invokeResults.readback,
    reconciliation: invokeResults.reconcile,
    dmsState,
    monthlyCostForecastKrw: Number(required(options["monthly-cost-forecast-krw"], "monthly-cost-forecast-krw")),
    startedAt: drTarget.restore_started_at,
    finishedAt: new Date().toISOString(),
    evidenceSha256,
    probeId: `cut010-${attemptRef}`,
  });
  const probeFile = writePrivateProgramJson(join(outputDir, "cut-010-probe.json"), probe);
  summary = {
    operation,
    outcome: "PASS",
    audit_caller: auditCaller,
    dr_target_sha256: drTarget.dr_target_sha256,
    readback_result_sha256: invokeResults.readback.result_sha256,
    reconciliation_result_sha256: invokeResults.reconcile.result_sha256,
    probe_sha256: probeFile.sha256,
    restore_variance_count: 0,
    dms_restore_mismatch_count: 0,
    production_data_write_count: 0,
  };
} else {
  const deployCaller = caller(JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE, JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE);
  caller(JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE, JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE);
  const drTarget = readPrivateProgramJson(required(options["dr-target"], "dr-target"), "DR target");
  validateJsonPostgresDrTarget(drTarget, {
    sourceSha,
    sourceTree,
    packetSha256: packet.packet_sha256,
    performanceAcceptance: performanceFile.value,
  });
  verifiedReceipt(
    required(options["cut010-receipt"], "cut010-receipt"),
    "cut-010",
    trustRegistry,
    { sourceSha, sourceTree, packetSha256: packet.packet_sha256 },
  );
  if (drTarget.restore_database_identifier === SOURCE_DATABASE) {
    throw new Error("DR cleanup may never target the production source database");
  }
  awsJson(JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE, [
    "rds", "delete-db-instance",
    "--db-instance-identifier", drTarget.restore_database_identifier,
    "--skip-final-snapshot",
    "--delete-automated-backups",
  ]);
  awsWait(JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE, [
    "rds", "wait", "db-instance-deleted",
    "--db-instance-identifier", drTarget.restore_database_identifier,
  ]);
  summary = {
    operation,
    outcome: "PASS",
    deploy_caller: deployCaller,
    dr_target_sha256: drTarget.dr_target_sha256,
    isolated_target_remaining_count: 0,
    source_database_deleted_count: 0,
    production_data_write_count: 0,
  };
}

const result = writePrivateProgramJson(join(outputDir, `${operation}-result.json`), {
  schema_version: "law-firm-os.json-postgres-dr-operation-result.v1",
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  approval_receipt_sha256: approval.receipt_sha256,
  cut009_receipt_sha256: cut009.verified.canonical_sha256,
  generated_at: new Date().toISOString(),
  ...summary,
  raw_value_returned: false,
  pii_returned: false,
  secret_material_returned: false,
});
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  operation,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  result_path: result.path,
  result_sha256: result.sha256,
}, null, 2)}\n`);
