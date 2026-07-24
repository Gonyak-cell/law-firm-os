#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import {
  validateJsonPostgresExecutionPacket,
  verifyJsonPostgresExecutionApproval,
} from "../packages/persistence/src/postgres/execution-contract.js";
import {
  verifyJsonPostgresProgramReceipt,
} from "../packages/persistence/src/postgres/program-receipt.js";
import {
  createJsonPostgresSourceBackupPlan,
  createJsonPostgresSourceBackupPutReceipt,
  executeJsonPostgresSourceBackup,
} from "./lib/json-postgres-source-backup.mjs";
import {
  createPrivateProgramOutputDirectory,
  readPrivateProgramBytes,
  readPrivateProgramJson,
  writePrivateProgramJson,
} from "./lib/json-postgres-program-files.mjs";

const OPERATIONS = new Set(["plan", "upload-and-restore"]);
const PROFILE = "matter-prod-deploy-admin";
const ACCOUNT = "770880870480";
const REGION = "ap-northeast-2";

function option(name) {
  const index = process.argv.indexOf(name);
  const value = index === -1 ? null : process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new TypeError(`${name} is required`);
  return value;
}

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }).trim();
}

function awsJson(args) {
  const output = execFileSync("aws", [
    ...args,
    "--profile", PROFILE,
    "--region", REGION,
    "--no-cli-pager",
    "--output", "json",
  ], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
  return output ? JSON.parse(output) : {};
}

async function bodyBytes(body, limit) {
  if (!body) throw new Error("source backup restore body is absent");
  if (typeof body.transformToByteArray === "function") {
    const value = Buffer.from(await body.transformToByteArray());
    if (value.length > limit) throw new Error("source backup restore exceeds its approved size");
    return value;
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of body) {
    const value = Buffer.from(chunk);
    size += value.length;
    if (size > limit) throw new Error("source backup restore exceeds its approved size");
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

const operation = option("--operation");
if (!OPERATIONS.has(operation)) throw new TypeError("--operation is invalid");
if (git("status", "--porcelain=v1", "--untracked-files=all")) {
  throw new Error("source backup requires a clean exact-head worktree");
}
const sourceSha = git("rev-parse", "HEAD");
const sourceTree = git("rev-parse", "HEAD^{tree}");
if (git("rev-parse", "origin/main") !== sourceSha) {
  throw new Error("production source backup requires exact origin/main");
}
const packetSource = readPrivateProgramJson(option("--packet"), "W13 execution packet");
const packetValidation = validateJsonPostgresExecutionPacket(packetSource, {
  sourceSha,
  sourceTree,
  phase: "w13-production-cutover",
});
const registryPath = option("--registry");
const registry = readPrivateProgramJson(registryPath, "owner trust registry");
verifyJsonPostgresExecutionApproval({
  packet: packetSource,
  sourceSha,
  sourceTree,
  trustRegistryPath: registryPath,
  trustRegistrySha256: option("--registry-sha256"),
  approvalReceiptPath: option("--approval"),
});
const packet = Object.freeze({ ...packetSource, packet_sha256: packetValidation.packet_sha256 });
const w12Receipt = readPrivateProgramJson(option("--w12-receipt"), "W12 terminal receipt");
const w12Signature = readPrivateProgramBytes(`${option("--w12-receipt")}.sig`, "W12 terminal signature");
const verifiedW12 = verifyJsonPostgresProgramReceipt({
  receipt: w12Receipt,
  signature: w12Signature,
  trustRegistry: registry,
});
if (verifiedW12.receipt_kind !== "w12-terminal"
  || verifiedW12.execution_state !== "PASS"
  || verifiedW12.canonical_sha256 !== packet.bindings.w12_terminal_receipt_sha256) {
  throw new Error("source backup requires the exact signed W12 terminal receipt");
}
const inventory = readPrivateProgramJson(option("--inventory"), "safe source inventory");
const locatorManifest = readPrivateProgramJson(option("--locator-manifest"), "private source locator manifest");
const transformPlan = readPrivateProgramJson(option("--transform-plan"), "private source transform plan");
const transformResult = readPrivateProgramJson(option("--transform-result"), "source transform result");
const retainUntil = option("--retain-until");
const outputDir = createPrivateProgramOutputDirectory(option("--output-dir"));
const plan = createJsonPostgresSourceBackupPlan({
  packet: packetSource,
  inventory,
  locatorManifest,
  transformPlan,
  transformResult,
  retainUntil,
});
const planOutput = writePrivateProgramJson(
  `${outputDir}/source-backup-plan.json`,
  plan,
);
if (operation === "plan") {
  process.stdout.write(`${JSON.stringify({
    verdict: "PASS_PLAN_ONLY",
    backup_plan_sha256: plan.backup_plan_sha256,
    plan_path: planOutput.path,
    source_count: plan.sources.length,
    aws_mutated: false,
    source_mutated: false,
    production_write: false,
  }, null, 2)}\n`);
  process.exit(0);
}
const identity = awsJson(["sts", "get-caller-identity"]);
if (identity.Account !== ACCOUNT
  || !new RegExp(`^arn:aws:sts::${ACCOUNT}:assumed-role/${PROFILE}/[^/]+$`, "u").test(identity.Arn ?? "")) {
  throw new Error(`source backup requires exact assumed role ${PROFILE}`);
}
const kms = awsJson(["kms", "describe-key", "--key-id", packet.target.program_input_kms_key_ref]);
const kmsKeyArn = kms.KeyMetadata?.Arn;
if (!kmsKeyArn) throw new Error("program-input KMS key did not resolve");
const [versioning, publicAccess, objectLock, encryption] = [
  awsJson(["s3api", "get-bucket-versioning", "--bucket", plan.bucket, "--expected-bucket-owner", ACCOUNT]),
  awsJson(["s3api", "get-public-access-block", "--bucket", plan.bucket, "--expected-bucket-owner", ACCOUNT]),
  awsJson(["s3api", "get-object-lock-configuration", "--bucket", plan.bucket, "--expected-bucket-owner", ACCOUNT]),
  awsJson(["s3api", "get-bucket-encryption", "--bucket", plan.bucket, "--expected-bucket-owner", ACCOUNT]),
];
const blocked = publicAccess.PublicAccessBlockConfiguration ?? {};
const encryptionRule = encryption.ServerSideEncryptionConfiguration
  ?.Rules?.[0]?.ApplyServerSideEncryptionByDefault;
if (versioning.Status !== "Enabled"
  || Object.keys(blocked).length !== 4
  || !Object.values(blocked).every(Boolean)
  || objectLock.ObjectLockConfiguration?.ObjectLockEnabled !== "Enabled"
  || encryptionRule?.SSEAlgorithm !== "aws:kms"
  || encryptionRule?.KMSMasterKeyID !== kmsKeyArn) {
  throw new Error("program-input bucket storage governance drifted");
}
process.env.AWS_PROFILE = PROFILE;
const client = new S3Client({ region: REGION });
const executed = await executeJsonPostgresSourceBackup({
  packet: packetSource,
  inventory,
  locatorManifest,
  transformPlan,
  transformResult,
  retainUntil,
  kmsKeyArn,
  now: Date.now(),
  putObject: async ({ plan: currentPlan, source, bytes }) => {
    const checksum = createHash("sha256").update(bytes).digest("base64");
    const response = await client.send(new PutObjectCommand({
      Bucket: currentPlan.bucket,
      Key: source.object_key,
      Body: bytes,
      ContentLength: source.byte_size,
      ChecksumSHA256: checksum,
      ServerSideEncryption: "aws:kms",
      SSEKMSKeyId: kmsKeyArn,
      ObjectLockMode: "COMPLIANCE",
      ObjectLockRetainUntilDate: new Date(currentPlan.retain_until),
      ExpectedBucketOwner: currentPlan.expected_bucket_owner,
      Metadata: {
        source_ref: source.source_ref,
        source_sha256: source.sha256,
        inventory_sha256: currentPlan.inventory_content_sha256,
      },
    }));
    return createJsonPostgresSourceBackupPutReceipt({
      response,
      plan: currentPlan,
      source,
      kmsKeyArn,
    });
  },
  getObject: async ({ plan: currentPlan, source, stored }) => {
    const response = await client.send(new GetObjectCommand({
      Bucket: currentPlan.bucket,
      Key: source.object_key,
      VersionId: stored.version_id,
      ExpectedBucketOwner: currentPlan.expected_bucket_owner,
      ChecksumMode: "ENABLED",
    }));
    const bytes = await bodyBytes(response.Body, source.byte_size);
    if (response.ChecksumSHA256
      && response.ChecksumSHA256 !== createHash("sha256").update(bytes).digest("base64")) {
      throw new Error("source backup provider checksum drifted");
    }
    return {
      bucket: currentPlan.bucket,
      key: source.object_key,
      version_id: response.VersionId,
      expected_bucket_owner: currentPlan.expected_bucket_owner,
      server_side_encryption: response.ServerSideEncryption,
      kms_key_arn: response.SSEKMSKeyId,
      object_lock_mode: response.ObjectLockMode,
      retain_until: new Date(response.ObjectLockRetainUntilDate).toISOString(),
      content_sha256: createHash("sha256").update(bytes).digest("hex"),
      byte_size: bytes.length,
      bytes,
    };
  },
});
const resultOutput = writePrivateProgramJson(
  `${outputDir}/source-backup-result.json`,
  executed.result,
);
process.stdout.write(`${JSON.stringify({
  verdict: "PASS",
  backup_plan_sha256: executed.plan.backup_plan_sha256,
  result_sha256: executed.result.result_sha256,
  result_path: resultOutput.path,
  result_file_sha256: resultOutput.sha256,
  safe_counts: executed.result.safe_counts,
  source_mutated: false,
  postgres_mutated: false,
  production_write: false,
}, null, 2)}\n`);
