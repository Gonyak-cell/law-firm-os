#!/usr/bin/env node
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  createMatterVaultRuntimeBackup,
  MATTER_VAULT_RUNTIME_BACKUP_MANIFEST_FILE,
} from "./drill-matter-vault-backup-restore.mjs";
import { LAWOS_DURABLE_RUNTIME_HOME } from "../apps/api/src/local-durable-store-paths.js";
import {
  LAWOS_S3_BACKUP_QUEUE_ROOT,
  queueRuntimeStoreBackupUpload,
  resolveRuntimeBackupBucket,
  resolveRuntimeBackupDeviceId,
} from "../packages/persistence/src/s3-backup-queue.js";

const execFileAsync = promisify(execFile);
const DEFAULT_REGION = "ap-northeast-2";
const DEFAULT_PROFILE = "matter-prod-deploy-admin";
const DEFAULT_ACCOUNT_ID = "770880870480";
const DEFAULT_ARTIFACT_DIR = "artifacts/manual-qa";

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function safeSlug(value) {
  return String(value || "unknown").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 96);
}

function normalizeS3Prefix(value) {
  return String(value || "")
    .split("/")
    .map((part) => safeSlug(part))
    .filter(Boolean)
    .join("/");
}

function boolOption(value) {
  return value === true || value === "true" || value === "1" || value === "yes";
}

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }
    options[key] = next;
    index += 1;
  }
  return options;
}

function buildAwsArgs({ profile, region, args }) {
  return ["--profile", profile, "--region", region, ...args];
}

async function runAws({ profile, region, args, allowFailure = false }) {
  try {
    const result = await execFileAsync("aws", buildAwsArgs({ profile, region, args }), {
      maxBuffer: 12 * 1024 * 1024,
    });
    return {
      ok: true,
      stdout: result.stdout.trim(),
      stderr: result.stderr.trim(),
    };
  } catch (error) {
    const result = {
      ok: false,
      stdout: String(error?.stdout || "").trim(),
      stderr: String(error?.stderr || error?.message || "").trim(),
      exit_code: error?.code ?? 1,
    };
    if (allowFailure) return result;
    const message = result.stderr || result.stdout || `aws ${args.join(" ")} failed`;
    throw new Error(message);
  }
}

async function getCallerIdentity({ profile, region }) {
  const result = await runAws({
    profile,
    region,
    args: ["sts", "get-caller-identity", "--output", "json"],
    allowFailure: true,
  });
  if (!result.ok) return { ok: false, error: result.stderr || result.stdout };
  return { ok: true, identity: JSON.parse(result.stdout) };
}

function defaultBucketName(accountId, region) {
  return `lawos-matter-runtime-backups-${accountId}-${region}`;
}

async function ensureS3Bucket({ bucket, profile, region }) {
  const head = await runAws({
    profile,
    region,
    args: ["s3api", "head-bucket", "--bucket", bucket],
    allowFailure: true,
  });
  const created = !head.ok;
  if (created) {
    const createArgs = ["s3api", "create-bucket", "--bucket", bucket];
    if (region !== "us-east-1") {
      createArgs.push("--create-bucket-configuration", JSON.stringify({ LocationConstraint: region }));
    }
    await runAws({ profile, region, args: createArgs });
  }

  await runAws({
    profile,
    region,
    args: [
      "s3api",
      "put-public-access-block",
      "--bucket",
      bucket,
      "--public-access-block-configuration",
      JSON.stringify({
        BlockPublicAcls: true,
        IgnorePublicAcls: true,
        BlockPublicPolicy: true,
        RestrictPublicBuckets: true,
      }),
    ],
  });
  await runAws({
    profile,
    region,
    args: [
      "s3api",
      "put-bucket-versioning",
      "--bucket",
      bucket,
      "--versioning-configuration",
      JSON.stringify({ Status: "Enabled" }),
    ],
  });
  await runAws({
    profile,
    region,
    args: [
      "s3api",
      "put-bucket-encryption",
      "--bucket",
      bucket,
      "--server-side-encryption-configuration",
      JSON.stringify({
        Rules: [
          {
            ApplyServerSideEncryptionByDefault: {
              SSEAlgorithm: "aws:kms",
              KMSMasterKeyID: "alias/aws/s3",
            },
            BucketKeyEnabled: true,
          },
        ],
      }),
    ],
  });
  await runAws({
    profile,
    region,
    args: [
      "s3api",
      "put-bucket-policy",
      "--bucket",
      bucket,
      "--policy",
      JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "DenyRuntimeBackupDeletes",
            Effect: "Deny",
            Principal: "*",
            Action: ["s3:DeleteObject", "s3:DeleteObjectVersion", "s3:DeleteBucket"],
            Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
          },
          {
            Sid: "DenyInsecureTransport",
            Effect: "Deny",
            Principal: "*",
            Action: "s3:*",
            Resource: [`arn:aws:s3:::${bucket}`, `arn:aws:s3:::${bucket}/*`],
            Condition: { Bool: { "aws:SecureTransport": "false" } },
          },
        ],
      }),
    ],
  });
  return { bucket_created: created, versioning: "Enabled", encryption: "aws:kms alias/aws/s3", delete_policy: "deny" };
}

function readQueueEntries(queueRoot) {
  const root = resolve(queueRoot);
  if (!existsSync(root)) return [];
  return readdirSync(root)
    .filter((name) => name.endsWith(".json"))
    .sort()
    .map((name) => ({ path: join(root, name), value: JSON.parse(readFileSync(join(root, name), "utf8")) }));
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function uploadBackupDir({ backupDir, bucket, prefix, profile, region }) {
  const s3Uri = `s3://${bucket}/${prefix}`;
  await runAws({
    profile,
    region,
    args: ["s3", "cp", backupDir, s3Uri, "--recursive", "--sse", "aws:kms"],
  });
  return {
    bucket,
    prefix,
    manifest_uri: `${s3Uri}/${MATTER_VAULT_RUNTIME_BACKUP_MANIFEST_FILE}`,
  };
}

async function runBackup(options = {}) {
  const generatedAt = new Date();
  const region = options.region || process.env.LAWOS_AWS_REGION || process.env.AWS_REGION || DEFAULT_REGION;
  const profile = options.profile || process.env.LAWOS_RUNTIME_BACKUP_AWS_PROFILE || process.env.AWS_PROFILE || DEFAULT_PROFILE;
  const deviceId = safeSlug(options["device-id"] || process.env.LAWOS_RUNTIME_BACKUP_DEVICE_ID || resolveRuntimeBackupDeviceId(process.env) || hostname());
  const queueRoot = options["queue-root"] || process.env.LAWOS_RUNTIME_BACKUP_QUEUE_ROOT || LAWOS_S3_BACKUP_QUEUE_ROOT;
  const queueEntries = boolOption(options["drain-queue"]) ? readQueueEntries(queueRoot) : [];
  const storeDir = resolve(options["store-dir"] || queueEntries.at(-1)?.value?.store_root || process.env.LAWOS_RUNTIME_BACKUP_STORE_DIR || LAWOS_DURABLE_RUNTIME_HOME);
  const identity = await getCallerIdentity({ profile, region });
  const accountId = identity.ok ? identity.identity.Account : DEFAULT_ACCOUNT_ID;
  const bucket = options.bucket || resolveRuntimeBackupBucket(process.env) || defaultBucketName(accountId, region);
  const receiptPath = resolve(options["receipt-path"] || join(DEFAULT_ARTIFACT_DIR, `durable-data-s3-backup-${timestampSlug(generatedAt)}.json`));
  const prefix = options.prefix
    ? normalizeS3Prefix(options.prefix)
    : ["devices", deviceId, "backups", timestampSlug(generatedAt)].join("/");

  const backup = await createMatterVaultRuntimeBackup({
    storeDir,
    backupRoot: options["backup-root"],
    realClientDataUsed: boolOption(options["real-client-data-used"]),
  });

  let bucketPolicy = null;
  let upload = null;
  let queuePath = null;
  let outcome = "passed";
  let uploadError = null;
  try {
    if (boolOption(options["ensure-bucket"])) {
      bucketPolicy = await ensureS3Bucket({ bucket, profile, region });
    }
    upload = await uploadBackupDir({ backupDir: backup.backup_dir, bucket, prefix, profile, region });
    for (const entry of queueEntries) unlinkSync(entry.path);
  } catch (error) {
    outcome = "queued";
    uploadError = error?.message || String(error);
    queuePath = queueRuntimeStoreBackupUpload({
      reasonFilePath: join(storeDir, "matter-store.json"),
      env: {
        ...process.env,
        LAWOS_RUNTIME_BACKUP_BUCKET: bucket,
        LAWOS_RUNTIME_BACKUP_QUEUE_ROOT: queueRoot,
        LAWOS_RUNTIME_BACKUP_STORE_DIR: storeDir,
        LAWOS_RUNTIME_BACKUP_DEVICE_ID: deviceId,
        LAWOS_RUNTIME_BACKUP_AWS_PROFILE: profile,
        LAWOS_AWS_REGION: region,
      },
      queueRoot,
      now: generatedAt,
    });
  }

  const receipt = {
    schema_version: "law-firm-os.runtime-store-s3-backup.v0.1",
    receipt_type: "durable_runtime_store_s3_backup",
    outcome,
    generated_at: generatedAt.toISOString(),
    store_dir: storeDir,
    local_backup_dir: backup.backup_dir,
    local_backup_manifest_path: backup.manifest_path,
    local_backup_file_count: backup.backup_file_count,
    local_backup_total_bytes: backup.backup_total_bytes,
    local_backup_real_client_data_used: backup.real_client_data_used === true,
    aws_profile: profile,
    aws_region: region,
    aws_account_id: identity.ok ? identity.identity.Account : null,
    aws_identity_verified: identity.ok,
    bucket,
    device_id: deviceId,
    prefix,
    bucket_policy: bucketPolicy,
    upload,
    offline_queue_path: queuePath,
    drained_queue_count: queueEntries.length,
    upload_error: uploadError,
    production_ready_claim: false,
    go_live_claim: false,
    public_release_claim: false,
  };
  writeJson(receiptPath, receipt);
  console.log(JSON.stringify({ ...receipt, receipt_path: receiptPath }, null, 2));
}

runBackup(parseArgs()).catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
