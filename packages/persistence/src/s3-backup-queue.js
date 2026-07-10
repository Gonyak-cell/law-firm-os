import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { hostname, homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const LAWOS_S3_BACKUP_QUEUE_ROOT = join(
  homedir(),
  "Library",
  "Application Support",
  "LawFirmOS",
  "runtime-stores",
  "backup-upload-queue",
);

export const LAWOS_S3_BACKUP_QUEUE_SCHEMA_VERSION = "law-firm-os.runtime-store-s3-upload-queue.v0.1";

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function safeSlug(value) {
  return String(value || "unknown").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 96);
}

export function resolveRuntimeBackupBucket(env = process.env) {
  return String(env.LAWOS_RUNTIME_BACKUP_BUCKET || env.LAWOS_S3_BACKUP_BUCKET || "").trim() || null;
}

export function resolveRuntimeBackupDeviceId(env = process.env) {
  return safeSlug(env.LAWOS_RUNTIME_BACKUP_DEVICE_ID || env.LAWOS_DEVICE_ID || hostname());
}

export function queueRuntimeStoreBackupUpload({
  reasonFilePath,
  env = process.env,
  queueRoot = env.LAWOS_RUNTIME_BACKUP_QUEUE_ROOT || LAWOS_S3_BACKUP_QUEUE_ROOT,
  now = new Date(),
} = {}) {
  const bucket = resolveRuntimeBackupBucket(env);
  if (!bucket) return null;
  const generatedAt = now instanceof Date ? now : new Date(now);
  const storeRoot = env.LAWOS_RUNTIME_BACKUP_STORE_DIR || env.MATTER_DESKTOP_RUNTIME_STORE_DIR || null;
  const queueDir = resolve(queueRoot);
  mkdirSync(queueDir, { recursive: true });
  const event = {
    schema_version: LAWOS_S3_BACKUP_QUEUE_SCHEMA_VERSION,
    event_id: `lawos-s3-backup-${timestampSlug(generatedAt)}-${process.pid}`,
    generated_at: generatedAt.toISOString(),
    reason_file_path: reasonFilePath ? resolve(reasonFilePath) : null,
    inferred_reason_dir: reasonFilePath ? dirname(resolve(reasonFilePath)) : null,
    store_root: storeRoot ? resolve(storeRoot) : null,
    bucket,
    region: env.AWS_REGION || env.LAWOS_AWS_REGION || "ap-northeast-2",
    profile: env.LAWOS_RUNTIME_BACKUP_AWS_PROFILE || env.AWS_PROFILE || "matter-prod-deploy-admin",
    device_id: resolveRuntimeBackupDeviceId(env),
    production_ready_claim: false,
    go_live_claim: false,
  };
  const queuePath = join(queueDir, `${event.event_id}.json`);
  if (!existsSync(queuePath)) writeFileSync(queuePath, `${JSON.stringify(event, null, 2)}\n`, "utf8");
  return queuePath;
}
