#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import {
  programEvidenceRetainUntil,
} from "../apps/api/src/program-evidence-retention.js";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  validateJsonPostgresPerformanceAcceptance,
} from "../packages/persistence/src/postgres/performance-acceptance.js";
import {
  validateJsonPostgresRehearsalCapacityResult,
} from "../packages/persistence/src/postgres/rehearsal-capacity-result.js";
import {
  validateJsonPostgresRehearsalRestoreTarget,
} from "../packages/persistence/src/postgres/rehearsal-restore-contract.js";
import {
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import {
  canonicalizeJson,
} from "../packages/runtime-auth/src/runtime-safety-approval-contract.js";
import {
  JSON_POSTGRES_REHEARSAL_ACCOUNT,
  JSON_POSTGRES_REHEARSAL_FUNCTION,
  JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW,
  JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET,
  JSON_POSTGRES_REHEARSAL_REGION,
  JSON_POSTGRES_REHEARSAL_ROLE,
  JSON_POSTGRES_REHEARSAL_STACK,
  assertJsonPostgresRehearsalBucketState,
  assertJsonPostgresRehearsalEniAuthority,
  assertJsonPostgresRehearsalLambda,
  assertJsonPostgresRehearsalStack,
  createJsonPostgresImmutableInputLocator,
} from "./lib/json-postgres-rehearsal-execution.mjs";
import {
  assertJsonPostgresRehearsalProgramCaller,
  createJsonPostgresRehearsalProgramEvent,
  jsonPostgresRehearsalProfileForMode,
  validateJsonPostgresRehearsalExecutionEvidence,
  validateJsonPostgresRehearsalProgramResponse,
  validateJsonPostgresRehearsalRestoreEvidence,
} from "./lib/json-postgres-rehearsal-program.mjs";
import {
  JSON_POSTGRES_REHEARSAL_SOURCE_DATABASE,
  buildJsonPostgresRehearsalRestoreTargetFromAws,
  createJsonPostgresRehearsalRestoreResult,
  validateJsonPostgresRehearsalSourceDatabase,
} from "./lib/json-postgres-rehearsal-restore.mjs";
import {
  assertPrivateStagingBudget,
} from "./lib/private-staging-aws-execution.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const OPERATIONS = new Set(["restore", "readback", "cleanup"]);
const DEPLOY_PROFILE = "matter-staging-admin";
const AUDIT_PROFILE = "matter-readonly-auditor";
const INSPECTION_PROFILE = jsonPostgresRehearsalProfileForMode(
  "readback",
  { inspection: true },
);
const SHA256 = /^[0-9a-f]{64}$/u;

function parse(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!flag?.startsWith("--")
      || !value
      || value.startsWith("--")
      || values[flag.slice(2)] != null) {
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
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function awsArgs(profile, args, { region = true } = {}) {
  return [
    ...args,
    "--profile", profile,
    ...(region
      ? ["--region", JSON_POSTGRES_REHEARSAL_REGION]
      : []),
    "--no-cli-pager",
    "--output", "json",
  ];
}

function awsJson(profile, args, options = {}) {
  const output = execFileSync("aws", awsArgs(profile, args, options), {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return output ? JSON.parse(output) : {};
}

function awsWait(profile, args) {
  execFileSync("aws", awsArgs(profile, args), {
    cwd: process.cwd(),
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function caller(profile, mode, prepare = false) {
  return assertJsonPostgresRehearsalProgramCaller(
    awsJson(profile, ["sts", "get-caller-identity"]),
    { profile, mode, prepare },
  );
}

function database(profile, identifier) {
  const rows = awsJson(profile, [
    "rds",
    "describe-db-instances",
    "--db-instance-identifier",
    identifier,
  ]).DBInstances ?? [];
  if (rows.length !== 1) {
    throw new Error("W12 restore expected exactly one RDS database");
  }
  return rows[0];
}

function maps(stack) {
  return Object.freeze({
    parameters: Object.fromEntries(
      (stack.Parameters ?? []).map((item) => [
        item.ParameterKey,
        item.ParameterValue,
      ]),
    ),
    outputs: Object.fromEntries(
      (stack.Outputs ?? []).map((item) => [
        item.OutputKey,
        item.OutputValue,
      ]),
    ),
  });
}

function runtimeState(packet, approval) {
  const stack = awsJson(AUDIT_PROFILE, [
    "cloudformation",
    "describe-stacks",
    "--stack-name",
    JSON_POSTGRES_REHEARSAL_STACK,
  ]).Stacks?.[0];
  if (!stack) throw new Error("W12 staging stack is absent");
  const { parameters, outputs } = maps(stack);
  assertJsonPostgresRehearsalStack(stack, {
    packet,
    artifactVersion: parameters.W12ArtifactVersion,
    trustRegistrySha256: approval.registry_sha256,
    approvalId: approval.approval_id,
    eniBootstrapEnabled: false,
  });
  assertJsonPostgresRehearsalLambda(
    awsJson(INSPECTION_PROFILE, [
      "lambda",
      "get-function-configuration",
      "--function-name",
      JSON_POSTGRES_REHEARSAL_FUNCTION,
    ]),
    { packet, expectedVpcId: outputs.VpcId },
  );
  const policyNames = (awsJson(AUDIT_PROFILE, [
    "iam",
    "list-role-policies",
    "--role-name",
    JSON_POSTGRES_REHEARSAL_ROLE,
  ], { region: false }).PolicyNames ?? []).sort();
  const policyDocuments = policyNames.map((policyName) =>
    awsJson(AUDIT_PROFILE, [
      "iam",
      "get-role-policy",
      "--role-name",
      JSON_POSTGRES_REHEARSAL_ROLE,
      "--policy-name",
      policyName,
    ], { region: false }).PolicyDocument);
  const eni = assertJsonPostgresRehearsalEniAuthority({
    policyNames,
    policyDocuments,
  });
  const budget = assertPrivateStagingBudget(awsJson(AUDIT_PROFILE, [
    "budgets",
    "describe-budget",
    "--account-id",
    JSON_POSTGRES_REHEARSAL_ACCOUNT,
    "--budget-name",
    "lawos-private-staging-monthly",
  ], { region: false }).Budget);
  if (!outputs.StagingKmsKeyArn
    || outputs.RehearsalProgramInputBucketName
      !== packet.target.program_input_bucket_name
    || JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW
      > packet.target.monthly_cost_ceiling_krw) {
    throw new Error("W12 restore stack output or cost drifted");
  }
  return Object.freeze({
    kmsKeyArn: outputs.StagingKmsKeyArn,
    eni,
    budget,
  });
}

function bucketState(profile, packet, kmsKeyArn) {
  const bucket = packet.target.dms_bucket_name;
  return assertJsonPostgresRehearsalBucketState({
    bucketName: bucket,
    expectedBucketName: bucket,
    expectedKmsKeyArn: kmsKeyArn,
    versioning: awsJson(profile, [
      "s3api", "get-bucket-versioning",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    ]),
    publicAccess: awsJson(profile, [
      "s3api", "get-public-access-block",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    ]),
    objectLock: awsJson(profile, [
      "s3api", "get-object-lock-configuration",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    ]),
    encryption: awsJson(profile, [
      "s3api", "get-bucket-encryption",
      "--bucket", bucket,
      "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    ]),
  });
}

function putImmutableJson({
  path,
  kind,
  packet,
  kmsKeyArn,
  approval,
} = {}) {
  const bytes = readPrivateProgramBytes(path, `W12 ${kind}`);
  const digest = sha256ProgramBytes(bytes);
  const key =
    `program-input/${packet.packet_sha256}/restore/${kind}/`
    + `${digest}.json`;
  const retainedUntil = programEvidenceRetainUntil({
    approvalExpiresAt: approval.expires_at,
  }).toISOString();
  const result = awsJson(DEPLOY_PROFILE, [
    "s3api",
    "put-object",
    "--bucket", packet.target.program_input_bucket_name,
    "--key", key,
    "--body", path,
    "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    "--content-type", "application/json",
    "--server-side-encryption", "aws:kms",
    "--ssekms-key-id", kmsKeyArn,
    "--checksum-algorithm", "SHA256",
    "--checksum-sha256",
    Buffer.from(digest, "hex").toString("base64"),
    "--object-lock-mode", "COMPLIANCE",
    "--object-lock-retain-until-date", retainedUntil,
    "--metadata",
    `sha256=${digest},source-sha=${packet.source_sha},source-tree=${packet.source_tree},packet-sha256=${packet.packet_sha256},input-kind=${kind}`,
  ]);
  if (!result.VersionId || result.VersionId === "null") {
    throw new Error(`W12 ${kind} upload is not immutable`);
  }
  const head = awsJson(INSPECTION_PROFILE, [
    "s3api",
    "head-object",
    "--bucket", packet.target.program_input_bucket_name,
    "--key", key,
    "--version-id", result.VersionId,
    "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    "--checksum-mode", "ENABLED",
  ]);
  if (head.VersionId !== result.VersionId
    || Number(head.ContentLength) !== bytes.byteLength
    || head.ServerSideEncryption !== "aws:kms"
    || head.SSEKMSKeyId !== kmsKeyArn
    || head.ChecksumSHA256
      !== Buffer.from(digest, "hex").toString("base64")
    || head.ObjectLockMode !== "COMPLIANCE"
    || Date.parse(head.ObjectLockRetainUntilDate)
      < Date.parse(retainedUntil)
    || head.Metadata?.sha256 !== digest
    || head.Metadata?.["packet-sha256"] !== packet.packet_sha256) {
    throw new Error(`W12 immutable ${kind} state drifted`);
  }
  return createJsonPostgresImmutableInputLocator({
    bucket: packet.target.program_input_bucket_name,
    key,
    versionId: result.VersionId,
    expectedBucketOwner: JSON_POSTGRES_REHEARSAL_ACCOUNT,
    sha256: digest,
    byteSize: bytes.byteLength,
  });
}

function downloadEvidence({
  packet,
  attemptRef,
  kind,
  digest,
  outputPath,
  kmsKeyArn,
} = {}) {
  const key =
    `program-execution/${packet.packet_sha256}/${attemptRef}/`
    + `${kind}-${digest}.json`;
  const head = awsJson(INSPECTION_PROFILE, [
    "s3api",
    "head-object",
    "--bucket", JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET,
    "--key", key,
    "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    "--checksum-mode", "ENABLED",
  ]);
  if (!head.VersionId
    || head.VersionId === "null"
    || head.ServerSideEncryption !== "aws:kms"
    || head.SSEKMSKeyId !== kmsKeyArn
    || head.ObjectLockMode !== "COMPLIANCE"
    || Date.parse(head.ObjectLockRetainUntilDate)
      < Date.now() + 364 * 24 * 60 * 60 * 1000) {
    throw new Error(`W12 immutable ${kind} governance drifted`);
  }
  const downloaded = awsJson(INSPECTION_PROFILE, [
    "s3api",
    "get-object",
    "--bucket", JSON_POSTGRES_REHEARSAL_PROGRAM_INPUT_BUCKET,
    "--key", key,
    "--version-id", head.VersionId,
    "--expected-bucket-owner", JSON_POSTGRES_REHEARSAL_ACCOUNT,
    "--checksum-mode", "ENABLED",
    outputPath,
  ]);
  chmodSync(outputPath, 0o600);
  const bytes = readFileSync(outputPath);
  if (downloaded.VersionId !== head.VersionId
    || bytes.byteLength !== Number(head.ContentLength)
    || sha256ProgramBytes(bytes) !== digest) {
    throw new Error(`W12 immutable ${kind} content drifted`);
  }
  return Object.freeze({
    value: JSON.parse(bytes),
    bytes,
    version_id: head.VersionId,
  });
}

function verifyReceipt(path, kind, trustRegistry, packet) {
  const receipt = readPrivateProgramJson(path, `${kind} receipt`);
  const signature = readPrivateProgramBytes(
    `${path}.sig`,
    `${kind} receipt signature`,
  );
  const verified = verifyJsonPostgresProgramReceipt({
    receipt,
    signature,
    trustRegistry,
    expected: {
      sourceSha: packet.source_sha,
      sourceTree: packet.source_tree,
      packetSha256: packet.packet_sha256,
    },
  });
  if (verified.receipt_kind !== kind
    || verified.execution_state !== "PASS") {
    throw new Error(`${kind} receipt is not an exact signed PASS`);
  }
  return verified;
}

const options = parse(process.argv.slice(2));
const operation = required(options.operation, "operation");
if (!OPERATIONS.has(operation)) {
  throw new Error("unsupported W12 restore operation");
}
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("W12 restore requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
const packetSource = readPrivateProgramJson(
  required(options.packet, "packet"),
  "W12 execution packet",
);
const packetValidation = validateJsonPostgresExecutionPacket(
  packetSource,
  { sourceSha, sourceTree, phase: "w12-real-data-rehearsal" },
);
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: packetValidation.packet_sha256,
});
const registryPath = required(options.registry, "registry");
const trustRegistry = readPrivateProgramJson(
  registryPath,
  "W12 owner trust registry",
);
const approval = verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: registryPath,
  trustRegistrySha256: required(
    options["registry-sha256"],
    "registry-sha256",
  ),
  approvalReceiptPath: required(options.approval, "approval"),
});
const performancePath = required(
  options["performance-acceptance"],
  "performance-acceptance",
);
const performanceAcceptance = validateJsonPostgresPerformanceAcceptance(
  readPrivateProgramJson(
    performancePath,
    "W12 performance acceptance",
  ),
);
const performanceValue = readPrivateProgramJson(
  performancePath,
  "W12 performance acceptance",
);
const capacityPath = required(options["capacity-result"], "capacity-result");
const capacityValue = readPrivateProgramJson(
  capacityPath,
  "W12 capacity result",
);
const capacity = validateJsonPostgresRehearsalCapacityResult(
  capacityValue,
  { packet, performanceAcceptance: performanceValue },
);
if (capacity.acceptance_sha256
    !== performanceAcceptance.acceptance_sha256) {
  throw new Error("W12 capacity and performance acceptance drifted");
}
const migration = readPrivateProgramJson(
  required(options["migration-result"], "migration-result"),
  "W12 migration result",
);
if (migration.outcome !== "PASS"
  || migration.phase !== "w12-real-data-rehearsal"
  || !["commit", "resume"].includes(migration.mode)
  || migration.source_sha !== sourceSha
  || migration.source_tree !== sourceTree
  || migration.packet_sha256 !== packet.packet_sha256
  || !SHA256.test(migration.result_sha256 ?? "")
  || migration.claims?.production_write !== false
  || migration.claims?.database_write !== true) {
  throw new Error("W12 migration result is not an exact rehearsal PASS");
}
const attemptRef = required(options["attempt-ref"], "attempt-ref");
if (!/^[a-z0-9][a-z0-9-]{0,31}$/u.test(attemptRef)) {
  throw new Error("W12 restore attempt-ref is invalid");
}
const outputDir = createPrivateProgramOutputDirectory(
  required(options["output-dir"], "output-dir"),
);
const runtime = runtimeState(packet, approval);

let summary;
if (operation === "restore") {
  const deployCaller = caller(DEPLOY_PROFILE, "commit", true);
  const auditCaller = caller(AUDIT_PROFILE, "readback");
  const source = database(AUDIT_PROFILE, JSON_POSTGRES_REHEARSAL_SOURCE_DATABASE);
  const sourceState = validateJsonPostgresRehearsalSourceDatabase(source);
  const deploySource = validateJsonPostgresRehearsalSourceDatabase(
    database(DEPLOY_PROFILE, JSON_POSTGRES_REHEARSAL_SOURCE_DATABASE),
  );
  for (const key of [
    "database_identifier",
    "resource_id_sha256",
    "kms_key_arn_sha256",
    "vpc_id",
    "subnet_group_name",
  ]) {
    if (sourceState[key] !== deploySource[key]) {
      throw new Error("W12 deploy and audit source RDS identity drifted");
    }
  }
  if (canonicalizeJson(sourceState.security_group_ids)
    !== canonicalizeJson(deploySource.security_group_ids)) {
    throw new Error("W12 deploy and audit source RDS network drifted");
  }
  const identifier =
    `lawos-private-rehearsal-restore-${sourceSha.slice(0, 10)}-`
    + attemptRef;
  if (identifier.length > 63) {
    throw new Error("W12 restore identifier exceeds the RDS limit");
  }
  const startedAt = new Date().toISOString();
  awsJson(DEPLOY_PROFILE, [
    "rds",
    "restore-db-instance-to-point-in-time",
    "--source-db-instance-identifier",
    JSON_POSTGRES_REHEARSAL_SOURCE_DATABASE,
    "--target-db-instance-identifier",
    identifier,
    "--restore-time", sourceState.latest_restorable_at,
    "--db-subnet-group-name", sourceState.subnet_group_name,
    "--vpc-security-group-ids", ...sourceState.security_group_ids,
    "--no-publicly-accessible",
    "--no-multi-az",
    "--no-deletion-protection",
    "--copy-tags-to-snapshot",
    "--tags",
    "Key=environment,Value=lawos-staging",
    "Key=program,Value=lawos-private-rehearsal-restore",
    `Key=source-sha,Value=${sourceSha}`,
    `Key=packet-sha256,Value=${packet.packet_sha256}`,
    `Key=attempt-ref,Value=${attemptRef}`,
  ]);
  awsWait(DEPLOY_PROFILE, [
    "rds",
    "wait",
    "db-instance-available",
    "--db-instance-identifier",
    identifier,
  ]);
  const restored = database(AUDIT_PROFILE, identifier);
  const availableAt = new Date().toISOString();
  const target = buildJsonPostgresRehearsalRestoreTargetFromAws({
    sourceDatabase: source,
    restoredDatabase: restored,
    sourceSha,
    sourceTree,
    packetSha256: packet.packet_sha256,
    migrationResultSha256: migration.result_sha256,
    restoreStartedAt: startedAt,
    restoreAvailableAt: availableAt,
    performanceAcceptance: performanceValue,
  });
  const targetFile = writePrivateProgramJson(
    join(outputDir, "restore-target.json"),
    target,
  );
  const restoreLocators = {
    restore_target: putImmutableJson({
      path: targetFile.path,
      kind: "restore-target",
      packet,
      kmsKeyArn: runtime.kmsKeyArn,
      approval,
    }),
    performance_acceptance: putImmutableJson({
      path: performancePath,
      kind: "performance-acceptance",
      packet,
      kmsKeyArn: runtime.kmsKeyArn,
      approval,
    }),
    capacity_result: putImmutableJson({
      path: capacityPath,
      kind: "capacity-result",
      packet,
      kmsKeyArn: runtime.kmsKeyArn,
      approval,
    }),
  };
  const locators = writePrivateProgramJson(
    join(outputDir, "restore-locators.json"),
    restoreLocators,
  );
  summary = {
    operation,
    outcome: "PASS",
    deploy_caller: deployCaller,
    audit_caller: auditCaller,
    restore_target_sha256: target.restore_target_sha256,
    restore_target_file_sha256: targetFile.sha256,
    restore_locator_set_file_sha256: locators.sha256,
    performance_acceptance_sha256:
      performanceAcceptance.acceptance_sha256,
    capacity_result_sha256: capacity.result_sha256,
    rpo_ms: target.rpo_ms,
    rto_ms: target.rto_ms,
    isolated_target_count: 1,
    public_target_count: 0,
    source_database_mutation_count: 0,
    production_write_count: 0,
  };
} else if (operation === "readback") {
  const auditCaller = caller(AUDIT_PROFILE, "readback");
  const targetPath = required(options["restore-target"], "restore-target");
  const target = readPrivateProgramJson(
    targetPath,
    "W12 restore target",
  );
  validateJsonPostgresRehearsalRestoreTarget(target, {
    sourceSha,
    sourceTree,
    packetSha256: packet.packet_sha256,
    performanceAcceptance: performanceValue,
  });
  const restoreLocators = readPrivateProgramJson(
    required(options["restore-locators"], "restore-locators"),
    "W12 restore locators",
  );
  if (restoreLocators.restore_target?.sha256
      !== sha256ProgramBytes(readFileSync(targetPath))
    || restoreLocators.performance_acceptance?.sha256
      !== sha256ProgramBytes(readFileSync(performancePath))
    || restoreLocators.capacity_result?.sha256
      !== sha256ProgramBytes(readFileSync(capacityPath))) {
    throw new Error("W12 restore locator content digest drifted");
  }
  const currentSource = database(
    AUDIT_PROFILE,
    JSON_POSTGRES_REHEARSAL_SOURCE_DATABASE,
  );
  validateJsonPostgresRehearsalSourceDatabase(currentSource);
  const observedTarget = buildJsonPostgresRehearsalRestoreTargetFromAws({
    sourceDatabase: {
      ...currentSource,
      LatestRestorableTime: target.source_latest_restorable_at,
    },
    restoredDatabase: database(
      AUDIT_PROFILE,
      target.restore_database_identifier,
    ),
    sourceSha,
    sourceTree,
    packetSha256: packet.packet_sha256,
    migrationResultSha256: migration.result_sha256,
    restoreStartedAt: target.restore_started_at,
    restoreAvailableAt: target.restore_available_at,
    performanceAcceptance: performanceValue,
  });
  if (observedTarget.restore_target_sha256
      !== target.restore_target_sha256) {
    throw new Error("live W12 restore target drifted");
  }
  const locatorSet = readPrivateProgramJson(
    required(options["locator-set"], "locator-set"),
    "W12 immutable locator set",
  );
  const results = {};
  for (const mode of ["readback", "reconcile"]) {
    const invocationRef = `${attemptRef}-${mode}`;
    const event = createJsonPostgresRehearsalProgramEvent({
      packet,
      locatorSet,
      mode,
      attemptRef: invocationRef,
      negativeTenantId: required(
        options["negative-tenant-id"],
        "negative-tenant-id",
      ),
      rehearsalRestore: restoreLocators,
    });
    const eventFile = writePrivateProgramJson(
      join(outputDir, `${mode}-event.json`),
      event,
    );
    const responsePath = join(outputDir, `${mode}-response.json`);
    const invocation = awsJson(AUDIT_PROFILE, [
      "lambda",
      "invoke",
      "--function-name", JSON_POSTGRES_REHEARSAL_FUNCTION,
      "--invocation-type", "RequestResponse",
      "--cli-binary-format", "raw-in-base64-out",
      "--payload", `fileb://${eventFile.path}`,
      responsePath,
    ]);
    if (!existsSync(responsePath)) {
      throw new Error(`W12 restore ${mode} response is absent`);
    }
    chmodSync(responsePath, 0o600);
    const responseBytes = readFileSync(responsePath);
    if (invocation.FunctionError) {
      throw new Error(
        `W12 restore ${mode} invocation failed (`
        + `${sha256ProgramBytes(responseBytes).slice(0, 16)})`,
      );
    }
    const response = JSON.parse(responseBytes);
    validateJsonPostgresRehearsalProgramResponse(response, {
      packet,
      mode,
      rehearsalRestore: true,
    });
    const execution = downloadEvidence({
      packet,
      attemptRef: invocationRef,
      kind: "execution-result",
      digest: response.execution_evidence_sha256,
      outputPath: join(outputDir, `${mode}-execution-evidence.json`),
      kmsKeyArn: runtime.kmsKeyArn,
    });
    validateJsonPostgresRehearsalExecutionEvidence(execution.value, {
      packet,
      mode,
      response,
    });
    const restoreEvidence = downloadEvidence({
      packet,
      attemptRef: invocationRef,
      kind: `w12-restore-${mode}`,
      digest: response.rehearsal_restore_evidence_sha256,
      outputPath: join(outputDir, `${mode}-restore-evidence.json`),
      kmsKeyArn: runtime.kmsKeyArn,
    });
    validateJsonPostgresRehearsalRestoreEvidence(
      restoreEvidence.value,
      {
        packet,
        mode,
        response,
        restoreTarget: target,
        performanceAcceptance: performanceValue,
      },
    );
    results[mode] = Object.freeze({
      ...response,
      response_file_sha256: sha256ProgramBytes(responseBytes),
      execution_evidence_file_sha256:
        sha256ProgramBytes(execution.bytes),
      restore_evidence_file_sha256:
        sha256ProgramBytes(restoreEvidence.bytes),
    });
  }
  const dmsGovernance = bucketState(
    AUDIT_PROFILE,
    packet,
    runtime.kmsKeyArn,
  );
  const counts = results.reconcile.safe_counts ?? {};
  const sourceObjectCount =
    capacityValue.measured.dms_object_count;
  const requiredDmsCounts = [
    "dms_source_object_count",
    "dms_verified_object_count",
    "dms_provider_version_count",
    "dms_retention_verified_count",
    "dms_legal_hold_verified_count",
    "dms_tenant_negative_visible_count",
  ];
  if (requiredDmsCounts.some((key) =>
    !Number.isSafeInteger(counts[key]) || counts[key] < 0)
    || counts.dms_source_object_count !== sourceObjectCount) {
    throw new Error("W12 restore reconciliation DMS counts drifted");
  }
  const referenceMismatchCount = [
    counts.dms_verified_object_count,
    counts.dms_provider_version_count,
    counts.dms_retention_verified_count,
  ].reduce(
    (total, count) =>
      total + Math.abs(sourceObjectCount - count),
    0,
  ) + counts.dms_tenant_negative_visible_count;
  const dmsState = {
    ...dmsGovernance,
    legal_hold_preserved:
      counts.dms_legal_hold_verified_count === sourceObjectCount,
    reference_mismatch_count: referenceMismatchCount,
    source_object_count: sourceObjectCount,
  };
  const dmsOutput = writePrivateProgramJson(
    join(outputDir, "restore-dms-readback.json"),
    dmsState,
  );
  const restoreResult = createJsonPostgresRehearsalRestoreResult({
    packet,
    restoreTarget: target,
    performanceAcceptance: performanceValue,
    readback: results.readback,
    reconciliation: results.reconcile,
    dmsState,
    monthlyCostForecastKrw:
      JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW,
    startedAt: target.restore_started_at,
    finishedAt: new Date().toISOString(),
  });
  const reconciliationOutput = writePrivateProgramJson(
    join(outputDir, "restore-reconciliation.json"),
    restoreResult,
  );
  const isolatedRestoreOutput = writePrivateProgramJson(
    join(outputDir, "isolated-restore.json"),
    target,
  );
  summary = {
    operation,
    outcome: "PASS",
    audit_caller: auditCaller,
    restore_target_sha256: target.restore_target_sha256,
    readback_result_sha256: results.readback.result_sha256,
    reconciliation_result_sha256:
      results.reconcile.result_sha256,
    restore_result_sha256: restoreResult.result_sha256,
    isolated_restore_artifact_sha256:
      isolatedRestoreOutput.sha256,
    restore_reconciliation_artifact_sha256:
      reconciliationOutput.sha256,
    restore_dms_readback_artifact_sha256:
      dmsOutput.sha256,
    restore_variance_count: 0,
    dms_restore_mismatch_count: 0,
    temporary_eni_allow_count:
      runtime.eni.temporary_eni_allow_count,
    production_write_count: 0,
  };
} else {
  const deployCaller = caller(DEPLOY_PROFILE, "commit", true);
  caller(AUDIT_PROFILE, "readback");
  const target = readPrivateProgramJson(
    required(options["restore-target"], "restore-target"),
    "W12 restore target",
  );
  validateJsonPostgresRehearsalRestoreTarget(target, {
    sourceSha,
    sourceTree,
    packetSha256: packet.packet_sha256,
    performanceAcceptance: performanceValue,
  });
  verifyReceipt(
    required(options["restore-receipt"], "restore-receipt"),
    "w12-restore",
    trustRegistry,
    packet,
  );
  if (target.restore_database_identifier
      === JSON_POSTGRES_REHEARSAL_SOURCE_DATABASE) {
    throw new Error("W12 cleanup may never target the source database");
  }
  awsJson(DEPLOY_PROFILE, [
    "rds",
    "delete-db-instance",
    "--db-instance-identifier",
    target.restore_database_identifier,
    "--skip-final-snapshot",
    "--delete-automated-backups",
  ]);
  awsWait(DEPLOY_PROFILE, [
    "rds",
    "wait",
    "db-instance-deleted",
    "--db-instance-identifier",
    target.restore_database_identifier,
  ]);
  validateJsonPostgresRehearsalSourceDatabase(database(
    AUDIT_PROFILE,
    JSON_POSTGRES_REHEARSAL_SOURCE_DATABASE,
  ));
  summary = {
    operation,
    outcome: "PASS",
    deploy_caller: deployCaller,
    restore_target_sha256: target.restore_target_sha256,
    isolated_target_remaining_count: 0,
    source_database_deleted_count: 0,
    production_write_count: 0,
  };
}

const result = writePrivateProgramJson(
  join(outputDir, `${operation}-result.json`),
  {
    schema_version:
      "law-firm-os.json-postgres-rehearsal-restore-operation.v1",
    source_sha: sourceSha,
    source_tree: sourceTree,
    packet_sha256: packet.packet_sha256,
    approval_receipt_sha256: approval.receipt_sha256,
    generated_at: new Date().toISOString(),
    ...summary,
    monthly_cost_forecast_krw:
      JSON_POSTGRES_REHEARSAL_MONTHLY_FORECAST_KRW,
    raw_value_returned: false,
    pii_returned: false,
    secret_material_returned: false,
  },
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  operation,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  result_path: result.path,
  result_sha256: result.sha256,
}, null, 2)}\n`);
