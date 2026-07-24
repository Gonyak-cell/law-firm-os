#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import {
  JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE,
  JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE,
  JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE,
  JSON_POSTGRES_PRODUCTION_REGION,
  assertJsonPostgresProductionCaller,
} from "./lib/json-postgres-production-execution.mjs";
import {
  createJsonPostgresFirstWriteBoundary,
  createJsonPostgresFirstWriteBoundaryProbe,
  createJsonPostgresSourceFreezeControl,
  createJsonPostgresSourceFreezeProbes,
} from "./lib/json-postgres-production-controls.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  sha256ProgramBytes,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const OPERATIONS = new Set(["source-freeze", "first-write-boundary"]);

function option(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function required(value, name) {
  if (!value) throw new TypeError(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trim();
}

function awsArgs(profile, args) {
  return [
    ...args,
    "--profile", profile,
    "--region", JSON_POSTGRES_PRODUCTION_REGION,
    "--no-cli-pager",
    "--output", "json",
  ];
}

function awsJson(profile, args) {
  const output = execFileSync("aws", awsArgs(profile, args), {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return output ? JSON.parse(output) : {};
}

function awsTryJson(profile, args) {
  const result = spawnSync("aws", awsArgs(profile, args), {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status === 0) {
    return result.stdout.trim() ? JSON.parse(result.stdout) : {};
  }
  if (/(?:Not Found|NoSuchKey|404)/iu.test(result.stderr ?? "")) return null;
  throw new Error(`AWS control read failed (${sha256ProgramBytes(result.stderr ?? "").slice(0, 16)})`);
}

function caller(profile, role) {
  return assertJsonPostgresProductionCaller(
    awsJson(profile, ["sts", "get-caller-identity"]),
    { role },
  );
}

function immutableControlUpload({
  packet,
  profile,
  path,
  markerSha256,
  kind,
}) {
  const bucket = packet.target.program_input_bucket_name;
  const key = `program-controls/${kind}/${packet.packet_sha256}/${markerSha256}.json`;
  const kms = awsJson(profile, [
    "kms", "describe-key",
    "--key-id", packet.target.program_input_kms_key_ref,
  ]).KeyMetadata;
  if (!kms?.Arn || kms.KeyState !== "Enabled") {
    throw new Error("program input KMS key is not enabled");
  }
  let head = awsTryJson(profile, [
    "s3api", "head-object",
    "--bucket", bucket,
    "--key", key,
    "--expected-bucket-owner", packet.target.program_input_expected_bucket_owner,
  ]);
  let uploaded = false;
  if (!head) {
    const retainUntil = new Date(Date.now() + 366 * 24 * 60 * 60 * 1000).toISOString();
    awsJson(profile, [
      "s3api", "put-object",
      "--bucket", bucket,
      "--key", key,
      "--body", path,
      "--content-type", "application/json",
      "--expected-bucket-owner", packet.target.program_input_expected_bucket_owner,
      "--server-side-encryption", "aws:kms",
      "--ssekms-key-id", kms.Arn,
      "--object-lock-mode", "COMPLIANCE",
      "--object-lock-retain-until-date", retainUntil,
      "--metadata",
      `sha256=${sha256ProgramBytes(readFileSync(path))},marker-sha256=${markerSha256},source-sha=${packet.source_sha},source-tree=${packet.source_tree},packet-sha256=${packet.packet_sha256}`,
    ]);
    uploaded = true;
    head = awsJson(profile, [
      "s3api", "head-object",
      "--bucket", bucket,
      "--key", key,
      "--expected-bucket-owner", packet.target.program_input_expected_bucket_owner,
    ]);
  }
  const bytes = readFileSync(path);
  if (head.ContentLength !== bytes.byteLength
    || head.ServerSideEncryption !== "aws:kms"
    || head.SSEKMSKeyId !== kms.Arn
    || head.ObjectLockMode !== "COMPLIANCE"
    || !head.VersionId
    || head.VersionId === "null"
    || head.Metadata?.sha256 !== sha256ProgramBytes(bytes)
    || head.Metadata?.["marker-sha256"] !== markerSha256
    || head.Metadata?.["source-sha"] !== packet.source_sha
    || head.Metadata?.["source-tree"] !== packet.source_tree
    || head.Metadata?.["packet-sha256"] !== packet.packet_sha256) {
    throw new Error("immutable production control object binding drifted");
  }
  return Object.freeze({
    bucket_sha256: sha256ProgramBytes(bucket),
    key_sha256: sha256ProgramBytes(key),
    version_id_sha256: sha256ProgramBytes(head.VersionId),
    kms_key_arn_sha256: sha256ProgramBytes(kms.Arn),
    object_lock_mode: "COMPLIANCE",
    upload_performed: uploaded,
  });
}

const operation = required(option("--operation"), "--operation");
if (!OPERATIONS.has(operation)) throw new Error("unsupported production control operation");
const auditProfile = option("--audit-profile") ?? JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE;
const cutoverProfile = option("--cutover-profile") ?? JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE;
const deployProfile = option("--deploy-profile") ?? JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE;
if (auditProfile !== JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE
  || cutoverProfile !== JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE
  || deployProfile !== JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE) {
  throw new Error("production controls require the exact deploy, audit, and cutover role profiles");
}
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("production controls require a clean exact-main worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("production controls require exact origin/main");
}
const packetSource = readPrivateProgramJson(
  required(option("--packet"), "--packet"),
  "W13 execution packet",
);
const packetValidation = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w13-production-cutover",
});
const packet = Object.freeze({
  ...packetSource,
  packet_sha256: packetValidation.packet_sha256,
});
const registryPath = required(option("--registry"), "--registry");
const registrySha256 = required(option("--registry-sha256"), "--registry-sha256");
const trustRegistry = readPrivateProgramJson(registryPath, "owner trust registry");
verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: registryPath,
  trustRegistrySha256: registrySha256,
  approvalReceiptPath: required(option("--approval"), "--approval"),
});
const operators = {
  deploy: caller(deployProfile, JSON_POSTGRES_PRODUCTION_DEPLOY_PROFILE),
  auditor: caller(auditProfile, JSON_POSTGRES_PRODUCTION_AUDIT_PROFILE),
  cutover: caller(cutoverProfile, JSON_POSTGRES_PRODUCTION_CUTOVER_PROFILE),
};
const outputDir = createPrivateProgramOutputDirectory(
  required(option("--output-dir"), "--output-dir"),
);
const startedAt = required(option("--started-at"), "--started-at");
const finishedAt = required(option("--finished-at"), "--finished-at");
const monthlyCostForecastKrw = Number(
  required(option("--monthly-cost-krw"), "--monthly-cost-krw"),
);

let result;
if (operation === "source-freeze") {
  const configurations = ["lawos-production-api", "lawos-production-admin"].map(
    (functionName) => awsJson(deployProfile, [
      "lambda", "get-function-configuration", "--function-name", functionName,
    ]),
  );
  const control = createJsonPostgresSourceFreezeControl({
    packet,
    confirmation: readPrivateProgramJson(
      required(option("--confirmation"), "--confirmation"),
      "source-freeze confirmation",
    ),
    lambdaConfigurations: configurations,
  });
  const controlFile = writePrivateProgramJson(
    join(outputDir, "source-freeze-control.json"),
    control,
  );
  const immutable = immutableControlUpload({
    packet,
    profile: deployProfile,
    path: controlFile.path,
    markerSha256: control.freeze_marker_sha256,
    kind: "source-freeze",
  });
  const probes = createJsonPostgresSourceFreezeProbes({
    packet,
    immutableBackup: readPrivateProgramJson(
      required(option("--immutable-backup"), "--immutable-backup"),
      "immutable source backup",
    ),
    control,
    finalDryRun: readPrivateProgramJson(
      required(option("--final-dry-run"), "--final-dry-run"),
      "final production dry-run",
    ),
    performanceAcceptance: readPrivateProgramJson(
      required(option("--performance-acceptance"), "--performance-acceptance"),
      "W12 performance acceptance",
    ),
    monthlyCostForecastKrw,
    startedAt,
    finishedAt,
    probeRef: required(option("--probe-ref"), "--probe-ref"),
  });
  const probeFiles = probes.map((probe) => writePrivateProgramJson(
    join(outputDir, `${probe.probe_id}.json`),
    probe,
  ));
  result = {
    control_path: controlFile.path,
    freeze_marker_sha256: control.freeze_marker_sha256,
    immutable_control: immutable,
    probe_paths: probeFiles.map((item) => item.path),
    probe_count: probes.length,
    production_write_count: 0,
  };
} else {
  const sourceFreezeReceiptPath = required(
    option("--source-freeze-receipt"),
    "--source-freeze-receipt",
  );
  const sourceFreezeReceipt = verifyJsonPostgresProgramReceipt({
    receipt: readPrivateProgramJson(
      sourceFreezeReceiptPath,
      "source-freeze receipt",
    ),
    signature: readPrivateProgramBytes(
      `${sourceFreezeReceiptPath}.sig`,
      "source-freeze receipt signature",
    ),
    trustRegistry,
  });
  const boundary = createJsonPostgresFirstWriteBoundary({
    packet,
    sourceFreezeReceipt,
    confirmation: readPrivateProgramJson(
      required(option("--confirmation"), "--confirmation"),
      "first-write confirmation",
    ),
  });
  const boundaryFile = writePrivateProgramJson(
    join(outputDir, "first-write-boundary.json"),
    boundary,
  );
  const immutable = immutableControlUpload({
    packet,
    profile: deployProfile,
    path: boundaryFile.path,
    markerSha256: boundary.boundary_marker_sha256,
    kind: "first-write-boundary",
  });
  const probe = createJsonPostgresFirstWriteBoundaryProbe({
    packet,
    sourceFreezeReceipt,
    boundary,
    monthlyCostForecastKrw,
    startedAt,
    finishedAt,
    probeId: required(option("--probe-id"), "--probe-id"),
  });
  const probeFile = writePrivateProgramJson(
    join(outputDir, `${probe.probe_id}.json`),
    probe,
  );
  result = {
    boundary_path: boundaryFile.path,
    boundary_marker_sha256: boundary.boundary_marker_sha256,
    immutable_control: immutable,
    probe_paths: [probeFile.path],
    probe_count: 1,
    production_write_count: 0,
  };
}

process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  operation,
  source_sha: sourceSha,
  source_tree: sourceTree,
  packet_sha256: packet.packet_sha256,
  operators,
  ...result,
  raw_pii_evidence_count: 0,
  secret_material_recorded: false,
}, null, 2)}\n`);
