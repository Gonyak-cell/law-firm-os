#!/usr/bin/env node
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { LAWOS_DURABLE_RUNTIME_HOME } from "../apps/api/src/local-durable-store-paths.js";
import {
  LAWOS_S3_BACKUP_QUEUE_ROOT,
  processRuntimeStoreBackupQueue,
  resolveRuntimeBackupBucket,
} from "../packages/persistence/src/s3-backup-queue.js";
import { createMatterVaultRuntimeBackup } from "./drill-matter-vault-backup-restore.mjs";

const execFileAsync = promisify(execFile);
const USAGE = `Usage: node scripts/process-runtime-store-backup-queue.mjs [options]

Default: count pending events without AWS access or queue mutation.
  --execute --approval-ref <ref>  Process the queue and upload snapshots.
  --bucket <name>                 Approved backup bucket for execute mode.
  --queue-root <dir>              Queue root.
  --store-dir <dir>               Runtime store root used for snapshots.
  --help                          Show this help.`;

function parseArgs(argv = process.argv.slice(2)) {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) options[key] = true;
    else {
      options[key] = next;
      index += 1;
    }
  }
  return options;
}

function boolOption(value) {
  return value === true || value === "true" || value === "1" || value === "yes";
}

function pendingCount(queueRoot) {
  const pending = join(resolve(queueRoot), "pending");
  if (!existsSync(pending)) return 0;
  return readdirSync(pending).filter((name) => name.endsWith(".json")).length;
}

async function aws(profile, region, args) {
  return execFileAsync("aws", ["--profile", profile, "--region", region, ...args], { maxBuffer: 12 * 1024 * 1024 });
}

export async function runQueueProcessor(options = {}) {
  const execute = boolOption(options.execute);
  const approvalRef = String(options["approval-ref"] || "").trim();
  const queueRoot = resolve(options["queue-root"] || process.env.LAWOS_RUNTIME_BACKUP_QUEUE_ROOT || LAWOS_S3_BACKUP_QUEUE_ROOT);
  const storeDir = resolve(options["store-dir"] || process.env.LAWOS_RUNTIME_BACKUP_STORE_DIR || LAWOS_DURABLE_RUNTIME_HOME);
  const backupRoot = resolve(options["backup-root"] || join(queueRoot, "snapshots"));
  const bucket = options.bucket || resolveRuntimeBackupBucket(process.env);
  const profile = options.profile || process.env.LAWOS_RUNTIME_BACKUP_AWS_PROFILE || "matter-prod-deploy-admin";
  const region = options.region || process.env.LAWOS_AWS_REGION || "ap-northeast-2";

  if (!execute) {
    return {
      outcome: "dry_run",
      pending_event_count: pendingCount(queueRoot),
      aws_read_executed: false,
      aws_mutation_executed: false,
      production_ready_claim: false,
      go_live_claim: false,
    };
  }
  if (!approvalRef) throw new Error("--execute requires --approval-ref");
  if (!bucket) throw new Error("--execute requires an approved backup bucket");
  await aws(profile, region, ["s3api", "head-bucket", "--bucket", bucket]);

  const result = await processRuntimeStoreBackupQueue({
    queueRoot,
    createSnapshot: async (event) => createMatterVaultRuntimeBackup({
      storeDir,
      backupRoot,
      backupDir: join(backupRoot, event.event_id),
      now: event.generated_at,
      realClientDataUsed: boolOption(options["real-client-data-used"]),
    }),
    uploadSnapshot: async ({ event, snapshot, idempotencyKey }) => {
      const objectKey = `devices/${event.device_id}/queue/${idempotencyKey}`;
      const uploaded = await aws(profile, region, [
        "s3",
        "cp",
        snapshot.backup_dir,
        `s3://${bucket}/${objectKey}`,
        "--recursive",
        "--sse",
        "aws:kms",
      ]);
      return {
        object_key: objectKey,
        etag: createHash("sha256").update(String(uploaded.stdout || objectKey)).digest("hex"),
        version_id: null,
      };
    },
  });
  return {
    outcome: result.failed > 0 ? "processed_with_failures" : "processed",
    approval_ref: approvalRef,
    ...result,
    aws_read_executed: true,
    aws_mutation_executed: result.uploaded > 0,
    production_ready_claim: false,
    go_live_claim: false,
  };
}

const invokedFile = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedFile && invokedFile === fileURLToPath(import.meta.url)) {
  const execution = process.argv.includes("--help")
    ? Promise.resolve(USAGE)
    : runQueueProcessor(parseArgs()).then((receipt) => JSON.stringify(receipt, null, 2));
  execution
    .then((output) => console.log(output))
    .catch((error) => {
      console.error(error?.stack || error?.message || String(error));
      process.exit(1);
    });
}
