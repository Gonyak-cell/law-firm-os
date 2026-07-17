import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  existsSync,
  fchmodSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { hostname, homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";

export const LAWOS_S3_BACKUP_QUEUE_ROOT = join(
  homedir(),
  "Library",
  "Application Support",
  "LawFirmOS",
  "runtime-stores",
  "backup-upload-queue",
);

export const LAWOS_S3_BACKUP_QUEUE_SCHEMA_VERSION = "law-firm-os.runtime-store-s3-upload-queue.v0.2";
export const LAWOS_S3_BACKUP_QUEUE_SCHEMA_VERSION_V0_1 = "law-firm-os.runtime-store-s3-upload-queue.v0.1";
export const LAWOS_S3_BACKUP_RECEIPT_SCHEMA_VERSION = "law-firm-os.runtime-store-s3-upload-receipt.v0.1";
export const LAWOS_S3_BACKUP_ATTEMPT_SCHEMA_VERSION = "law-firm-os.runtime-store-s3-upload-attempt.v0.1";

const KNOWN_STORE_NAMES = new Set([
  "hrx-store.json",
  "master-data-store.json",
  "matter-store.json",
  "dms-store.json",
  "crm-store.json",
  "intake-store.json",
  "crm-master-data-store.json",
  "finance-store.json",
  "analytics-store.json",
  "ai-store.json",
  "portal-store.json",
  "ui-readiness-store.json",
  "enterprise-readiness-store.json",
  "security-audit-events.ndjson",
  "credential-store.json",
  "password-reset-store.json",
]);
const QUEUE_REASONS = new Set(["store_write", "store_delete", "snapshot_retry", "manual_request"]);

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/gu, "-");
}

function safeSlug(value) {
  return String(value || "unknown").replace(/[^A-Za-z0-9._-]/gu, "_").slice(0, 96);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function pseudonymousRef(prefix, value) {
  return `${prefix}-${sha256(String(value || "unknown")).slice(0, 24)}`;
}

function currentDate(value = new Date()) {
  const raw = typeof value === "function" ? value() : value;
  const date = raw instanceof Date ? raw : new Date(raw);
  if (!Number.isFinite(date.getTime())) throw new TypeError("backup queue now must be a valid date");
  return date;
}

function ensurePrivateDirectory(dirPath) {
  mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  try {
    chmodSync(dirPath, 0o700);
  } catch (error) {
    if (!new Set(["ENOSYS", "ENOTSUP", "EPERM"]).has(error?.code)) throw error;
  }
}

function fsyncDirectory(dirPath) {
  let fd = null;
  try {
    fd = openSync(dirPath, "r");
    fsyncSync(fd);
  } catch (error) {
    if (!new Set(["EACCES", "EISDIR", "EINVAL", "ENOSYS", "ENOTSUP", "EPERM"]).has(error?.code)) throw error;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

export function resolveRuntimeBackupBucket(env = process.env) {
  return String(env.LAWOS_RUNTIME_BACKUP_BUCKET || env.LAWOS_S3_BACKUP_BUCKET || "").trim() || null;
}

export function resolveRuntimeBackupDeviceId(env = process.env) {
  return pseudonymousRef("device", env.LAWOS_RUNTIME_BACKUP_DEVICE_ID || env.LAWOS_DEVICE_ID || hostname());
}

function queueDirectories(queueRoot) {
  const root = resolve(queueRoot);
  return Object.freeze({
    root,
    pending: join(root, "pending"),
    attempts: join(root, "attempts"),
    receipts: join(root, "receipts"),
    deadLetter: join(root, "dead-letter"),
  });
}

function ensureQueueDirectories(queueRoot) {
  const dirs = queueDirectories(queueRoot);
  for (const dirPath of Object.values(dirs)) ensurePrivateDirectory(dirPath);
  return dirs;
}

function writePrivateJson(filePath, value, { exclusive = false } = {}) {
  ensurePrivateDirectory(dirname(filePath));
  const target = exclusive ? filePath : join(dirname(filePath), `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  let fd = null;
  let created = false;
  try {
    fd = openSync(target, "wx", 0o600);
    created = true;
    fchmodSync(fd, 0o600);
    writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    fsyncSync(fd);
    closeSync(fd);
    fd = null;
    if (!exclusive) renameSync(target, filePath);
  } catch (error) {
    if (created && existsSync(target)) unlinkSync(target);
    throw error;
  } finally {
    if (fd !== null) closeSync(fd);
  }
  fsyncDirectory(dirname(filePath));
  return filePath;
}

function readJson(filePath, fallback = null) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function removeFile(filePath) {
  if (!existsSync(filePath)) return false;
  unlinkSync(filePath);
  fsyncDirectory(dirname(filePath));
  return true;
}

function inspectStore(reasonFilePath, generation, payloadSha256) {
  const resolvedPath = resolve(reasonFilePath || "unknown-store");
  const fileName = basename(resolvedPath);
  let resolvedGeneration = Number.isSafeInteger(generation) && generation >= 0 ? generation : null;
  let resolvedHash = /^[a-f0-9]{64}$/u.test(String(payloadSha256 || "")) ? payloadSha256 : null;
  if (existsSync(resolvedPath)) {
    const raw = readFileSync(resolvedPath);
    resolvedHash ??= sha256(raw);
    if (resolvedGeneration === null && fileName.endsWith(".json")) {
      try {
        const parsed = JSON.parse(raw.toString("utf8"));
        const durable = parsed?.__lawos_store;
        if (Number.isSafeInteger(durable?.generation) && durable.generation >= 0) resolvedGeneration = durable.generation;
        if (/^[a-f0-9]{64}$/u.test(String(durable?.content_sha256 || ""))) resolvedHash = durable.content_sha256;
      } catch {}
    }
  }
  return Object.freeze({
    store_ref: pseudonymousRef("store", resolvedPath),
    store_kind: KNOWN_STORE_NAMES.has(fileName) ? fileName : "unclassified-store",
    store_generation: resolvedGeneration,
    store_content_sha256: resolvedHash,
  });
}

export function queueRuntimeStoreBackupUpload({
  reasonFilePath,
  generation,
  payloadSha256,
  reason = "store_write",
  env = process.env,
  queueRoot = env.LAWOS_RUNTIME_BACKUP_QUEUE_ROOT || LAWOS_S3_BACKUP_QUEUE_ROOT,
  now = new Date(),
  uuidFactory = randomUUID,
} = {}) {
  const bucket = resolveRuntimeBackupBucket(env);
  if (!bucket) return null;
  if (!QUEUE_REASONS.has(reason)) throw new TypeError(`unsupported backup queue reason: ${reason}`);
  const generatedAt = currentDate(now);
  const dirs = ensureQueueDirectories(queueRoot);
  const store = inspectStore(reasonFilePath, generation, payloadSha256);
  const event = {
    schema_version: LAWOS_S3_BACKUP_QUEUE_SCHEMA_VERSION,
    event_id: `lawos-s3-backup-${timestampSlug(generatedAt)}-${uuidFactory()}`,
    generated_at: generatedAt.toISOString(),
    status: "pending",
    reason,
    ...store,
    store_root_ref: pseudonymousRef("root", env.LAWOS_RUNTIME_BACKUP_STORE_DIR || env.MATTER_DESKTOP_RUNTIME_STORE_DIR || dirname(resolve(reasonFilePath || "."))),
    bucket_ref: pseudonymousRef("bucket", bucket),
    region: env.AWS_REGION || env.LAWOS_AWS_REGION || "ap-northeast-2",
    profile: safeSlug(env.LAWOS_RUNTIME_BACKUP_AWS_PROFILE || env.AWS_PROFILE || "matter-prod-deploy-admin"),
    device_id: resolveRuntimeBackupDeviceId(env),
    snapshot_requested: true,
    production_ready_claim: false,
    go_live_claim: false,
  };
  const queuePath = join(dirs.pending, `${event.event_id}.json`);
  writePrivateJson(queuePath, event, { exclusive: true });
  return queuePath;
}

function normalizeQueueEvent(value, filePath) {
  if (!value || typeof value !== "object") throw Object.assign(new TypeError("backup queue event must be an object"), { code: "LAWOS_BACKUP_EVENT_INVALID" });
  if (value.schema_version === LAWOS_S3_BACKUP_QUEUE_SCHEMA_VERSION) {
    if (!value.event_id || value.status !== "pending" || !value.device_id || !value.store_ref || !value.profile) {
      throw Object.assign(new TypeError("backup queue event is incomplete"), { code: "LAWOS_BACKUP_EVENT_INVALID" });
    }
    return value;
  }
  if (value.schema_version === LAWOS_S3_BACKUP_QUEUE_SCHEMA_VERSION_V0_1) {
    const store = inspectStore(value.reason_file_path || filePath, null, null);
    return {
      schema_version: LAWOS_S3_BACKUP_QUEUE_SCHEMA_VERSION,
      event_id: value.event_id || `legacy-${sha256(filePath).slice(0, 24)}`,
      generated_at: value.generated_at || new Date(0).toISOString(),
      status: "pending",
      reason: "snapshot_retry",
      ...store,
      store_root_ref: pseudonymousRef("root", value.store_root || dirname(resolve(filePath))),
      bucket_ref: pseudonymousRef("bucket", value.bucket || "legacy-bucket"),
      region: value.region || "ap-northeast-2",
      profile: safeSlug(value.profile || "matter-prod-deploy-admin"),
      device_id: pseudonymousRef("device", value.device_id || "legacy-device"),
      snapshot_requested: true,
      production_ready_claim: false,
      go_live_claim: false,
    };
  }
  throw Object.assign(new TypeError("unsupported backup queue event schema"), { code: "LAWOS_BACKUP_EVENT_SCHEMA_UNSUPPORTED" });
}

function safeFailure(error) {
  const code = safeSlug(error?.code || error?.name || "BACKUP_UPLOAD_FAILED");
  return Object.freeze({ code, detail_sha256: sha256(String(error?.message || error || code)) });
}

function pendingEntries(dirs) {
  const current = existsSync(dirs.pending)
    ? readdirSync(dirs.pending).filter((name) => name.endsWith(".json")).map((name) => join(dirs.pending, name))
    : [];
  const legacy = existsSync(dirs.root)
    ? readdirSync(dirs.root).filter((name) => name.endsWith(".json")).map((name) => join(dirs.root, name))
    : [];
  return [...current, ...legacy].sort();
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

function acquireProcessorLock(dirs, acquiredAt, tokenFactory = randomUUID) {
  const lockPath = join(dirs.root, "processor.lock");
  const owner = {
    pid: process.pid,
    host: hostname(),
    token: tokenFactory(),
    acquired_at: acquiredAt.toISOString(),
  };
  try {
    writePrivateJson(lockPath, owner, { exclusive: true });
    return { lockPath, ...owner };
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const current = readJson(lockPath, null);
    const ageMs = acquiredAt.getTime() - Date.parse(current?.acquired_at || "");
    const recoverable = current?.host === hostname()
      && Number.isSafeInteger(current?.pid)
      && ageMs >= 30_000
      && !isProcessAlive(current.pid);
    if (!recoverable) {
      throw Object.assign(new Error("backup queue processor is already active"), { code: "LAWOS_BACKUP_PROCESSOR_LOCKED" });
    }
    removeFile(lockPath);
    writePrivateJson(lockPath, owner, { exclusive: true });
    return { lockPath, ...owner };
  }
}

function releaseProcessorLock(lock) {
  const current = readJson(lock.lockPath, null);
  if (current?.token !== lock.token) {
    throw Object.assign(new Error("backup queue processor lock ownership was lost"), { code: "LAWOS_BACKUP_PROCESSOR_LOCK_LOST" });
  }
  removeFile(lock.lockPath);
}

export async function processRuntimeStoreBackupQueue({
  queueRoot = process.env.LAWOS_RUNTIME_BACKUP_QUEUE_ROOT || LAWOS_S3_BACKUP_QUEUE_ROOT,
  createSnapshot,
  uploadSnapshot,
  now = () => new Date(),
  maxAttempts = 3,
  baseDelayMs = 1_000,
} = {}) {
  if (typeof createSnapshot !== "function") throw new TypeError("backup queue processor requires createSnapshot");
  if (typeof uploadSnapshot !== "function") throw new TypeError("backup queue processor requires uploadSnapshot");
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1) throw new TypeError("maxAttempts must be a positive integer");
  const dirs = ensureQueueDirectories(queueRoot);
  const result = { processed: 0, uploaded: 0, idempotent: 0, retried: 0, deferred: 0, dead_lettered: 0, failed: 0 };
  const processorLock = acquireProcessorLock(dirs, currentDate(now));

  try {
    for (const eventPath of pendingEntries(dirs)) {
      result.processed += 1;
      let event;
      try {
        event = normalizeQueueEvent(readJson(eventPath), eventPath);
      } catch (error) {
        const deadLetterPath = join(dirs.deadLetter, `invalid-${sha256(eventPath).slice(0, 24)}.json`);
        writePrivateJson(deadLetterPath, {
          schema_version: LAWOS_S3_BACKUP_ATTEMPT_SCHEMA_VERSION,
          status: "dead_letter",
          event_ref: pseudonymousRef("event", eventPath),
          failure: safeFailure(error),
          production_ready_claim: false,
          go_live_claim: false,
        });
        removeFile(eventPath);
        result.dead_lettered += 1;
        result.failed += 1;
        continue;
      }

      const receiptPath = join(dirs.receipts, `${event.event_id}.json`);
      const attemptPath = join(dirs.attempts, `${event.event_id}.json`);
      if (existsSync(receiptPath)) {
        removeFile(eventPath);
        removeFile(attemptPath);
        result.idempotent += 1;
        continue;
      }
      const attemptedAt = currentDate(now);
      const previousAttempt = readJson(attemptPath, { attempt_count: 0, next_attempt_at: null });
      if (previousAttempt.next_attempt_at && Date.parse(previousAttempt.next_attempt_at) > attemptedAt.getTime()) {
        result.deferred += 1;
        continue;
      }
      const attemptCount = Number(previousAttempt.attempt_count || 0) + 1;
      try {
        const snapshot = await createSnapshot(event);
        const upload = await uploadSnapshot({ event, snapshot, idempotencyKey: event.event_id });
        const receipt = {
          schema_version: LAWOS_S3_BACKUP_RECEIPT_SCHEMA_VERSION,
          receipt_id: `receipt-${event.event_id}`,
          event_id: event.event_id,
          idempotency_key: event.event_id,
          uploaded_at: attemptedAt.toISOString(),
          attempt_count: attemptCount,
          device_id: event.device_id,
          store_ref: event.store_ref,
          store_generation: event.store_generation,
          store_content_sha256: event.store_content_sha256,
          snapshot_sha256: snapshot?.snapshot_sha256 || snapshot?.manifest_sha256 || null,
          snapshot_file_count: snapshot?.backup_file_count ?? snapshot?.file_count ?? null,
          upload_ref: pseudonymousRef("upload", upload?.object_key || upload?.upload_id || event.event_id),
          upload_etag: upload?.etag || null,
          upload_version_id: upload?.version_id || null,
          production_ready_claim: false,
          go_live_claim: false,
        };
        writePrivateJson(receiptPath, receipt, { exclusive: true });
        removeFile(eventPath);
        removeFile(attemptPath);
        result.uploaded += 1;
      } catch (error) {
        const failure = safeFailure(error);
        if (attemptCount >= maxAttempts) {
          writePrivateJson(join(dirs.deadLetter, `${event.event_id}.json`), {
            schema_version: LAWOS_S3_BACKUP_ATTEMPT_SCHEMA_VERSION,
            status: "dead_letter",
            event,
            attempt_count: attemptCount,
            failed_at: attemptedAt.toISOString(),
            failure,
            production_ready_claim: false,
            go_live_claim: false,
          });
          removeFile(eventPath);
          removeFile(attemptPath);
          result.dead_lettered += 1;
        } else {
          const delayMs = Math.min(86_400_000, baseDelayMs * (2 ** (attemptCount - 1)));
          writePrivateJson(attemptPath, {
            schema_version: LAWOS_S3_BACKUP_ATTEMPT_SCHEMA_VERSION,
            event_id: event.event_id,
            status: "retry_pending",
            attempt_count: attemptCount,
            failed_at: attemptedAt.toISOString(),
            next_attempt_at: new Date(attemptedAt.getTime() + delayMs).toISOString(),
            failure,
            production_ready_claim: false,
            go_live_claim: false,
          });
          result.retried += 1;
        }
        result.failed += 1;
      }
    }

    return Object.freeze({ ...result, aws_execution_claim: false, production_ready_claim: false, go_live_claim: false });
  } finally {
    releaseProcessorLock(processorLock);
  }
}
