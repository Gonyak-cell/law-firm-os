#!/usr/bin/env node
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  MATTER_VAULT_RUNTIME_BACKUP_MANIFEST_FILE,
  restoreMatterVaultRuntimeBackup,
} from "./drill-matter-vault-backup-restore.mjs";
import { LAWOS_DURABLE_RUNTIME_HOME } from "../apps/api/src/local-durable-store-paths.js";
import {
  resolveRuntimeBackupBucket,
  resolveRuntimeBackupDeviceId,
} from "../packages/persistence/src/s3-backup-queue.js";

const execFileAsync = promisify(execFile);
const DEFAULT_REGION = "ap-northeast-2";
const DEFAULT_PROFILE = "matter-prod-deploy-admin";
const DEFAULT_ACCOUNT_ID = "770880870480";
const DEFAULT_ARTIFACT_DIR = "artifacts/manual-qa";
const PROBE_TERMS = ["그래비티랩스", "오윤록", "새빗켐", "DEAL", "Project Tempus"];

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
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

async function runAws({ profile, region, args }) {
  const result = await execFileAsync("aws", buildAwsArgs({ profile, region, args }), {
    maxBuffer: 12 * 1024 * 1024,
  });
  return {
    stdout: result.stdout.trim(),
    stderr: result.stderr.trim(),
  };
}

async function getCallerIdentity({ profile, region }) {
  try {
    const result = await runAws({ profile, region, args: ["sts", "get-caller-identity", "--output", "json"] });
    return { ok: true, identity: JSON.parse(result.stdout) };
  } catch (error) {
    return { ok: false, error: String(error?.stderr || error?.message || error) };
  }
}

function defaultBucketName(accountId, region) {
  return `lawos-matter-runtime-backups-${accountId}-${region}`;
}

async function resolveLatestPrefix({ bucket, deviceId, profile, region }) {
  const list = await runAws({
    profile,
    region,
    args: [
      "s3api",
      "list-objects-v2",
      "--bucket",
      bucket,
      "--prefix",
      `devices/${deviceId}/backups/`,
      "--output",
      "json",
    ],
  });
  const body = JSON.parse(list.stdout || "{}");
  const manifests = (body.Contents || [])
    .map((entry) => entry.Key)
    .filter((key) => key.endsWith(`/${MATTER_VAULT_RUNTIME_BACKUP_MANIFEST_FILE}`))
    .sort();
  if (manifests.length === 0) throw new Error(`No S3 runtime backup manifests found for devices/${deviceId}/backups/`);
  return dirname(manifests.at(-1));
}

function scanProbeTerms(restoreDir) {
  const files = ["master-data-store.json", "matter-store.json", "crm-store.json", "intake-store.json"];
  const text = files
    .map((file) => join(restoreDir, file))
    .filter((filePath) => existsSync(filePath))
    .map((filePath) => readFileSync(filePath, "utf8"))
    .join("\n");
  return Object.fromEntries(PROBE_TERMS.map((term) => [term, text.includes(term)]));
}

function writeJson(filePath, value) {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function runRestore(options = {}) {
  const startedNs = process.hrtime.bigint();
  const generatedAt = new Date();
  const region = options.region || process.env.LAWOS_AWS_REGION || process.env.AWS_REGION || DEFAULT_REGION;
  const profile = options.profile || process.env.LAWOS_RUNTIME_BACKUP_AWS_PROFILE || process.env.AWS_PROFILE || DEFAULT_PROFILE;
  const deviceId = options["device-id"] || process.env.LAWOS_RUNTIME_BACKUP_DEVICE_ID || resolveRuntimeBackupDeviceId(process.env);
  const identity = await getCallerIdentity({ profile, region });
  const accountId = identity.ok ? identity.identity.Account : DEFAULT_ACCOUNT_ID;
  const bucket = options.bucket || resolveRuntimeBackupBucket(process.env) || defaultBucketName(accountId, region);
  const prefix = options.prefix || await resolveLatestPrefix({ bucket, deviceId, profile, region });
  const downloadDir = resolve(options["download-dir"] || join(homedir(), "lawos-backups", "s3-restore-downloads", timestampSlug(generatedAt)));
  const restoreDir = resolve(
    boolOption(options["restore-current"])
      ? LAWOS_DURABLE_RUNTIME_HOME
      : options["restore-dir"] || join(homedir(), "Library", "Application Support", "LawFirmOS", "runtime-stores-restored", timestampSlug(generatedAt)),
  );
  const receiptPath = resolve(options["receipt-path"] || join(DEFAULT_ARTIFACT_DIR, `durable-data-s3-restore-${timestampSlug(generatedAt)}.json`));

  mkdirSync(downloadDir, { recursive: true });
  await runAws({
    profile,
    region,
    args: ["s3", "cp", `s3://${bucket}/${prefix}`, downloadDir, "--recursive"],
  });
  const restore = await restoreMatterVaultRuntimeBackup({ backupDir: downloadDir, restoreDir });
  const totalRehearsalSeconds = Number((Number(process.hrtime.bigint() - startedNs) / 1_000_000_000).toFixed(6));
  const probeTermsFound = scanProbeTerms(restoreDir);
  const receipt = {
    schema_version: "law-firm-os.runtime-store-s3-restore.v0.1",
    receipt_type: "durable_runtime_store_s3_restore",
    outcome: restore.outcome === "passed" ? "passed" : "failed",
    generated_at: generatedAt.toISOString(),
    aws_profile: profile,
    aws_region: region,
    aws_account_id: identity.ok ? identity.identity.Account : null,
    aws_identity_verified: identity.ok,
    bucket,
    prefix,
    download_dir: downloadDir,
    restore_dir: restoreDir,
    restore_current: boolOption(options["restore-current"]),
    restore,
    total_rehearsal_seconds: totalRehearsalSeconds,
    rto_target_seconds: 1800,
    rto_target_met: totalRehearsalSeconds <= 1800,
    probe_terms_found: probeTermsFound,
    all_probe_terms_found: Object.values(probeTermsFound).every(Boolean),
    production_ready_claim: false,
    go_live_claim: false,
    public_release_claim: false,
  };
  writeJson(receiptPath, receipt);
  console.log(JSON.stringify({ ...receipt, receipt_path: receiptPath }, null, 2));
}

runRestore(parseArgs()).catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});
