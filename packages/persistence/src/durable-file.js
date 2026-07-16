import { createHash, randomUUID } from "node:crypto";
import {
  chmodSync,
  closeSync,
  constants,
  existsSync,
  fchmodSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { homedir, hostname } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { queueRuntimeStoreBackupUpload } from "./s3-backup-queue.js";

export const LAWOS_LOCAL_BACKUP_ROOT = join(homedir(), "lawos-backups", "data");
export const DEFAULT_LOCAL_GENERATION_LIMIT = 200;
export const LAWOS_DURABLE_STORE_SCHEMA_VERSION = "law-firm-os.durable-store.v0.1";
export const LAWOS_DURABLE_LOCK_SCHEMA_VERSION = "law-firm-os.durable-lock.v0.1";
export const LAWOS_DURABLE_STORE_ENVELOPE_KEY = "__lawos_store";

const DEFAULT_LOCK_WAIT_TIMEOUT_MS = 2_000;
const DEFAULT_LOCK_RETRY_DELAY_MS = 10;
const DEFAULT_STALE_LOCK_MS = 30_000;
const SLEEP_BUFFER = new Int32Array(new SharedArrayBuffer(4));

function codedError(message, code, fields = {}) {
  const error = new Error(message);
  error.code = code;
  Object.assign(error, fields);
  return error;
}

function currentDate(now = new Date()) {
  const value = typeof now === "function" ? now() : now;
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new TypeError("durable writer now must be a valid date");
  return date;
}

function sleepSync(milliseconds) {
  if (milliseconds > 0) Atomics.wait(SLEEP_BUFFER, 0, 0, milliseconds);
}

export function resolveLocalBackupRoot(env = process.env) {
  return env.LAWOS_LOCAL_BACKUP_ROOT || env.MATTER_VAULT_BACKUP_ROOT || LAWOS_LOCAL_BACKUP_ROOT;
}

export function readFileSyncWithStaleRetry(filePath, options = "utf8", { attempts = 3, readFileSyncImpl = readFileSync } = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return readFileSyncImpl(filePath, options);
    } catch (error) {
      lastError = error;
      if (error?.code !== "ESTALE" && error?.errno !== -116) throw error;
    }
  }
  throw lastError;
}

export function ensurePrivateDirectory(dirPath) {
  mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  try {
    chmodSync(dirPath, 0o700);
  } catch (error) {
    if (!new Set(["ENOSYS", "ENOTSUP", "EPERM"]).has(error?.code)) throw error;
  }
  return dirPath;
}

export function fsyncDirectory(dirPath) {
  let fd = null;
  try {
    fd = openSync(dirPath, "r");
    fsyncSync(fd);
    return true;
  } catch (error) {
    if (new Set(["EACCES", "EISDIR", "EINVAL", "ENOSYS", "ENOTSUP", "EPERM"]).has(error?.code)) return false;
    throw error;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

function canonicalizeJson(value, seen = new Set()) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") throw new TypeError("durable JSON does not support bigint values");
  if (typeof value === "undefined" || typeof value === "function" || typeof value === "symbol") return undefined;
  if (typeof value?.toJSON === "function") return canonicalizeJson(value.toJSON(), seen);
  if (seen.has(value)) throw new TypeError("durable JSON does not support cyclic values");
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry) => canonicalizeJson(entry, seen) ?? null);
    }
    const normalized = {};
    for (const key of Object.keys(value).sort()) {
      const entry = canonicalizeJson(value[key], seen);
      if (entry !== undefined) normalized[key] = entry;
    }
    return normalized;
  } finally {
    seen.delete(value);
  }
}

export function stableJsonStringify(value) {
  const normalized = canonicalizeJson(value);
  if (normalized === undefined) throw new TypeError("durable JSON root must be serializable");
  return JSON.stringify(normalized);
}

export function hashDurableValue(value) {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex");
}

function safeStoreName(filePath) {
  const resolvedPath = resolve(filePath || "store.json");
  const pathDigest = createHash("sha256").update(resolvedPath).digest("hex").slice(0, 16);
  const baseName = basename(resolvedPath).replace(/[^A-Za-z0-9._-]/gu, "_");
  return `${baseName}-${pathDigest}`;
}

function timestampSlug(date = new Date()) {
  return currentDate(date).toISOString().replace(/[:.]/gu, "-");
}

function generationFromRawStore(raw) {
  try {
    const parsed = JSON.parse(String(raw));
    const generation = parsed?.[LAWOS_DURABLE_STORE_ENVELOPE_KEY]?.generation;
    return Number.isSafeInteger(generation) && generation >= 0 ? generation : 0;
  } catch {
    return 0;
  }
}

function pruneGenerations(dirPath, keep = DEFAULT_LOCAL_GENERATION_LIMIT) {
  const boundedKeep = Math.max(0, Number.isSafeInteger(keep) ? keep : DEFAULT_LOCAL_GENERATION_LIMIT);
  const entries = readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => ({
      name: entry.name,
      path: join(dirPath, entry.name),
      mtimeMs: statSync(join(dirPath, entry.name)).mtimeMs,
    }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs || right.name.localeCompare(left.name));
  for (const entry of entries.slice(boundedKeep)) unlinkSync(entry.path);
  if (entries.length > boundedKeep) fsyncDirectory(dirPath);
}

function writeExclusiveFile({ filePath, data, mode = 0o600 }) {
  let fd = null;
  let created = false;
  try {
    fd = openSync(filePath, "wx", mode);
    created = true;
    fchmodSync(fd, mode);
    writeFileSync(fd, data);
    fsyncSync(fd);
  } catch (error) {
    if (created && existsSync(filePath)) unlinkSync(filePath);
    throw error;
  } finally {
    if (fd !== null) closeSync(fd);
  }
  fsyncDirectory(dirname(filePath));
  return filePath;
}

function atomicReplaceFile({ filePath, data, mode = 0o600, faultInjector }) {
  const dirPath = dirname(filePath);
  ensurePrivateDirectory(dirPath);
  faultInjector?.("before_temp_create", { filePath });
  const tempPath = join(dirPath, `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`);
  let fd = null;
  try {
    fd = openSync(tempPath, "wx", mode);
    fchmodSync(fd, mode);
    faultInjector?.("after_temp_create", { filePath, tempPath });
    faultInjector?.("before_temp_write", { filePath, tempPath });
    writeFileSync(fd, data);
    faultInjector?.("after_temp_write", { filePath, tempPath });
    fsyncSync(fd);
    faultInjector?.("after_temp_fsync", { filePath, tempPath });
    closeSync(fd);
    fd = null;
    renameSync(tempPath, filePath);
    faultInjector?.("after_rename", { filePath, tempPath });
    fsyncDirectory(dirPath);
    faultInjector?.("after_directory_fsync", { filePath });
  } finally {
    if (fd !== null) closeSync(fd);
    if (existsSync(tempPath)) unlinkSync(tempPath);
  }
  return filePath;
}

export function appendFileWithFsync({ filePath, data, mode = 0o600, faultInjector } = {}) {
  if (!filePath) throw new TypeError("durable append filePath is required");
  const dirPath = dirname(filePath);
  ensurePrivateDirectory(dirPath);
  faultInjector?.("before_append_open", { filePath });
  let fd = null;
  try {
    fd = openSync(filePath, constants.O_APPEND | constants.O_CREAT | constants.O_WRONLY, mode);
    fchmodSync(fd, mode);
    faultInjector?.("before_append_write", { filePath });
    writeFileSync(fd, data);
    faultInjector?.("after_append_write", { filePath });
    fsyncSync(fd);
    faultInjector?.("after_append_fsync", { filePath });
  } finally {
    if (fd !== null) closeSync(fd);
  }
  fsyncDirectory(dirPath);
  return filePath;
}

export function backupExistingStoreGeneration({
  filePath,
  backupRoot,
  env = process.env,
  now = new Date(),
  keep = DEFAULT_LOCAL_GENERATION_LIMIT,
  generation,
  uuidFactory = randomUUID,
} = {}) {
  if (!filePath || !existsSync(filePath)) return null;
  const resolvedBackupRoot = backupRoot || resolveLocalBackupRoot(env);
  ensurePrivateDirectory(resolvedBackupRoot);
  const backupDir = join(resolvedBackupRoot, safeStoreName(filePath));
  ensurePrivateDirectory(backupDir);
  const raw = readFileSync(filePath);
  const resolvedGeneration = Number.isSafeInteger(generation) && generation >= 0
    ? generation
    : generationFromRawStore(raw);
  const generationSlug = String(resolvedGeneration).padStart(12, "0");
  const backupPath = join(
    backupDir,
    `generation-${generationSlug}-${timestampSlug(now)}-${uuidFactory()}.json`,
  );
  writeExclusiveFile({ filePath: backupPath, data: raw });
  pruneGenerations(backupDir, keep);
  return backupPath;
}

function stateRecordCount(state = {}) {
  if (Array.isArray(state?.records)) return state.records.length;
  if (Array.isArray(state?.rows)) return state.rows.length;
  if (state?.tables && typeof state.tables === "object") {
    return Object.values(state.tables).reduce((total, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0);
  }
  return null;
}

export function assertNoUnsafeStoreShrink({ previousState, nextState, allowShrink = process.env.LAWOS_ALLOW_STORE_SHRINK === "1" } = {}) {
  if (allowShrink) return true;
  const previousCount = stateRecordCount(previousState);
  const nextCount = stateRecordCount(nextState);
  if (previousCount == null || nextCount == null || previousCount < 10) return true;
  if (nextCount < Math.floor(previousCount * 0.7)) {
    throw codedError(
      `LAWOS_STORE_SHRINK_BLOCKED: refusing to shrink store records from ${previousCount} to ${nextCount}; set LAWOS_ALLOW_STORE_SHRINK=1 for an intentional destructive write.`,
      "LAWOS_STORE_SHRINK_BLOCKED",
    );
  }
  return true;
}

function validWriterMetadata(writer) {
  return Boolean(
    writer
    && Number.isSafeInteger(writer.pid)
    && writer.pid > 0
    && typeof writer.host === "string"
    && writer.host.length > 0
    && typeof writer.token === "string"
    && writer.token.length > 0
    && typeof writer.written_at === "string"
    && Number.isFinite(Date.parse(writer.written_at)),
  );
}

function payloadFromDocument(document) {
  if (!document || typeof document !== "object" || Array.isArray(document)) {
    return { value: document, generation: 0, metadata: null, legacy: true };
  }
  if (!Object.hasOwn(document, LAWOS_DURABLE_STORE_ENVELOPE_KEY)) {
    return { value: document, generation: 0, metadata: null, legacy: true };
  }
  const metadata = document[LAWOS_DURABLE_STORE_ENVELOPE_KEY];
  const validMetadata = metadata?.schema_version === LAWOS_DURABLE_STORE_SCHEMA_VERSION
    && Number.isSafeInteger(metadata.generation)
    && metadata.generation > 0
    && metadata.previous_generation === metadata.generation - 1
    && typeof metadata.content_sha256 === "string"
    && /^[a-f0-9]{64}$/u.test(metadata.content_sha256)
    && typeof metadata.written_at === "string"
    && Number.isFinite(Date.parse(metadata.written_at))
    && typeof metadata.writer_id === "string"
    && metadata.writer_id.length > 0
    && validWriterMetadata(metadata.writer);
  if (!validMetadata) {
    throw codedError("durable store envelope metadata is invalid", "LAWOS_STORE_ENVELOPE_INVALID");
  }
  const { [LAWOS_DURABLE_STORE_ENVELOPE_KEY]: _metadata, ...value } = document;
  const actualHash = hashDurableValue(value);
  if (metadata.writer_id !== metadata.writer.token || metadata.written_at !== metadata.writer.written_at) {
    throw codedError("durable store writer metadata is inconsistent", "LAWOS_STORE_ENVELOPE_INVALID");
  }
  if (actualHash !== metadata.content_sha256) {
    throw codedError("durable store payload hash does not match its envelope", "LAWOS_STORE_HASH_MISMATCH", {
      expected_sha256: metadata.content_sha256,
      actual_sha256: actualHash,
    });
  }
  return { value, generation: metadata.generation, metadata, legacy: false };
}

export function readDurableJsonFile({ filePath, defaultValue } = {}) {
  if (!filePath) throw new TypeError("durable reader filePath is required");
  if (!existsSync(filePath)) {
    return {
      exists: false,
      value: defaultValue,
      generation: 0,
      metadata: null,
      payloadSha256: defaultValue === undefined ? null : hashDurableValue(defaultValue),
      legacy: false,
    };
  }
  let document;
  try {
    document = JSON.parse(readFileSyncWithStaleRetry(filePath, "utf8"));
  } catch (error) {
    if (error?.code?.startsWith?.("LAWOS_")) throw error;
    throw codedError("durable store JSON could not be parsed", "LAWOS_STORE_PARSE_FAILED", { cause: error });
  }
  const parsed = payloadFromDocument(document);
  return {
    exists: true,
    ...parsed,
    payloadSha256: hashDurableValue(parsed.value),
  };
}

export function isDurableStoreConflict(error) {
  return error?.code === "LAWOS_STORE_CONFLICT";
}

export function createDurableJsonStateController({
  filePath,
  defaultValue,
  normalizeValue = (value) => value,
  readState = readDurableJsonFile,
  writeState = writeDurableJsonFile,
} = {}) {
  if (typeof normalizeValue !== "function") throw new TypeError("durable state normalizeValue must be a function");
  if (typeof readState !== "function") throw new TypeError("durable state readState must be a function");
  if (typeof writeState !== "function") throw new TypeError("durable state writeState must be a function");

  let current = filePath
    ? readState({ filePath, defaultValue })
    : { exists: false, value: defaultValue, generation: 0, metadata: null, legacy: false };
  let value = normalizeValue(current.value === undefined ? defaultValue : current.value);
  let generation = current.generation ?? 0;

  function snapshot() {
    return Object.freeze({
      exists: Boolean(current.exists),
      value,
      generation,
      metadata: current.metadata ?? null,
      legacy: Boolean(current.legacy),
    });
  }

  return Object.freeze({
    get value() {
      return value;
    },
    get generation() {
      return generation;
    },
    snapshot,
    commit(nextValue, options = {}) {
      const normalized = normalizeValue(nextValue);
      if (!filePath) {
        value = normalized;
        current = { exists: false, value, generation, metadata: null, legacy: false };
        return null;
      }
      const receipt = writeState({
        ...options,
        filePath,
        value: normalized,
        previousState: value,
        expectedGeneration: generation,
      });
      generation = Number.isSafeInteger(receipt?.generation) ? receipt.generation : generation + 1;
      value = normalized;
      current = {
        exists: true,
        value,
        generation,
        metadata: receipt?.writer ? { writer: receipt.writer } : null,
        legacy: false,
      };
      return receipt;
    },
    reload() {
      if (!filePath) return snapshot();
      current = readState({ filePath, defaultValue });
      value = normalizeValue(current.value === undefined ? defaultValue : current.value);
      generation = current.generation ?? 0;
      return snapshot();
    },
  });
}

function parseLockOwner(lockPath) {
  try {
    const owner = JSON.parse(readFileSyncWithStaleRetry(lockPath, "utf8"));
    const valid = owner?.schema_version === LAWOS_DURABLE_LOCK_SCHEMA_VERSION
      && Number.isSafeInteger(owner.pid)
      && owner.pid > 0
      && typeof owner.host === "string"
      && owner.host.length > 0
      && typeof owner.token === "string"
      && owner.token.length > 0
      && typeof owner.acquired_at === "string"
      && Number.isFinite(Date.parse(owner.acquired_at));
    return valid ? { valid: true, owner } : { valid: false, owner: null };
  } catch {
    return { valid: false, owner: null };
  }
}

function defaultIsProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    return true;
  }
}

function inspectLock({ lockPath, host, staleAfterMs, isProcessAlive, now }) {
  const parsed = parseLockOwner(lockPath);
  if (!parsed.valid) return { state: "unknown", owner: null, recoverable: false };
  const { owner } = parsed;
  if (owner.host !== host) return { state: "remote", owner, recoverable: false };
  if (isProcessAlive(owner.pid)) return { state: "live", owner, recoverable: false };
  const ageMs = Math.max(0, currentDate(now).getTime() - Date.parse(owner.acquired_at));
  if (ageMs < staleAfterMs) return { state: "dead_recent", owner, recoverable: false };
  return { state: "dead_same_host_stale", owner, recoverable: true };
}

function createLockFile({ lockPath, owner }) {
  ensurePrivateDirectory(dirname(lockPath));
  writeExclusiveFile({ filePath: lockPath, data: `${JSON.stringify(owner)}\n` });
  return owner;
}

function recoverStaleLock({
  lockPath,
  host,
  staleAfterMs,
  isProcessAlive,
  now,
  tokenFactory,
}) {
  const recoveryPath = `${lockPath}.recovery`;
  const recoveryOwner = {
    schema_version: LAWOS_DURABLE_LOCK_SCHEMA_VERSION,
    pid: process.pid,
    host,
    token: tokenFactory(),
    acquired_at: currentDate(now).toISOString(),
  };
  try {
    createLockFile({ lockPath: recoveryPath, owner: recoveryOwner });
  } catch (error) {
    if (error?.code === "EEXIST") return false;
    throw error;
  }
  let recovered = false;
  try {
    if (!existsSync(lockPath)) return false;
    const inspection = inspectLock({ lockPath, host, staleAfterMs, isProcessAlive, now });
    if (!inspection.recoverable) return false;
    const quarantinePath = `${lockPath}.${inspection.owner.token}.${tokenFactory()}.stale`;
    renameSync(lockPath, quarantinePath);
    fsyncDirectory(dirname(lockPath));
    unlinkSync(quarantinePath);
    fsyncDirectory(dirname(lockPath));
    recovered = true;
  } finally {
    const currentRecovery = parseLockOwner(recoveryPath);
    if (currentRecovery.valid && currentRecovery.owner.token === recoveryOwner.token) {
      unlinkSync(recoveryPath);
      fsyncDirectory(dirname(recoveryPath));
    }
  }
  return recovered;
}

export function acquireExclusiveFileLock({
  resourcePath,
  lockPath = resourcePath ? `${resourcePath}.lock` : null,
  waitTimeoutMs = DEFAULT_LOCK_WAIT_TIMEOUT_MS,
  retryDelayMs = DEFAULT_LOCK_RETRY_DELAY_MS,
  staleAfterMs = DEFAULT_STALE_LOCK_MS,
  pid = process.pid,
  host = hostname(),
  tokenFactory = randomUUID,
  now = () => new Date(),
  isProcessAlive = defaultIsProcessAlive,
  sleep = sleepSync,
} = {}) {
  if (!resourcePath || !lockPath) throw new TypeError("exclusive lock resourcePath is required");
  if (!Number.isFinite(waitTimeoutMs) || waitTimeoutMs < 0) throw new TypeError("lock waitTimeoutMs must be non-negative");
  if (!Number.isFinite(retryDelayMs) || retryDelayMs < 0) throw new TypeError("lock retryDelayMs must be non-negative");
  if (!Number.isFinite(staleAfterMs) || staleAfterMs < 0) throw new TypeError("lock staleAfterMs must be non-negative");
  ensurePrivateDirectory(dirname(lockPath));
  const deadline = Date.now() + waitTimeoutMs;
  let lastInspection = { state: "absent", owner: null };
  while (true) {
    const recoveryPath = `${lockPath}.recovery`;
    if (!existsSync(recoveryPath)) {
      const owner = {
        schema_version: LAWOS_DURABLE_LOCK_SCHEMA_VERSION,
        pid,
        host,
        token: tokenFactory(),
        acquired_at: currentDate(now).toISOString(),
      };
      try {
        createLockFile({ lockPath, owner });
        return { resourcePath, lockPath, ...owner };
      } catch (error) {
        if (error?.code !== "EEXIST") throw error;
      }
      lastInspection = inspectLock({ lockPath, host, staleAfterMs, isProcessAlive, now });
      if (lastInspection.recoverable) {
        const recovered = recoverStaleLock({ lockPath, host, staleAfterMs, isProcessAlive, now, tokenFactory });
        if (recovered) continue;
      }
    } else {
      lastInspection = { state: "recovery_in_progress", owner: null };
    }
    if (Date.now() >= deadline) {
      throw codedError("exclusive durable store lock wait timed out", "LAWOS_STORE_LOCK_TIMEOUT", {
        lock_path: lockPath,
        owner_state: lastInspection.state,
      });
    }
    sleep(Math.min(retryDelayMs, Math.max(0, deadline - Date.now())));
  }
}

export function releaseExclusiveFileLock(lock) {
  if (!lock?.lockPath || !lock?.token) throw new TypeError("valid lock handle is required");
  const current = parseLockOwner(lock.lockPath);
  if (!current.valid || current.owner.token !== lock.token) {
    throw codedError("exclusive durable store lock ownership was lost", "LAWOS_STORE_LOCK_OWNERSHIP_LOST");
  }
  unlinkSync(lock.lockPath);
  fsyncDirectory(dirname(lock.lockPath));
  return true;
}

export function withStoreWriteLock(options, operation) {
  if (typeof operation !== "function") throw new TypeError("store lock operation must be a function");
  const lock = acquireExclusiveFileLock(options);
  try {
    const result = operation(lock);
    if (result && typeof result.then === "function") {
      throw new TypeError("withStoreWriteLock supports synchronous operations only");
    }
    return result;
  } finally {
    releaseExclusiveFileLock(lock);
  }
}

function durableStoreDocument({ value, generation, previousGeneration, lock, writtenAt }) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("durable store value must be a JSON object");
  }
  if (Object.hasOwn(value, LAWOS_DURABLE_STORE_ENVELOPE_KEY)) {
    throw codedError("durable store value uses the reserved envelope key", "LAWOS_STORE_RESERVED_KEY");
  }
  const payloadSha256 = hashDurableValue(value);
  const writer = {
    pid: lock.pid,
    host: lock.host,
    token: lock.token,
    written_at: writtenAt.toISOString(),
  };
  return {
    document: {
      [LAWOS_DURABLE_STORE_ENVELOPE_KEY]: {
        schema_version: LAWOS_DURABLE_STORE_SCHEMA_VERSION,
        generation,
        previous_generation: previousGeneration,
        content_sha256: payloadSha256,
        written_at: writtenAt.toISOString(),
        writer_id: writer.token,
        writer,
      },
      ...value,
    },
    payloadSha256,
    writer,
  };
}

export function writeDurableJsonFile({
  filePath,
  value,
  expectedGeneration,
  createBackup = true,
  backupRoot,
  env = process.env,
  keep = DEFAULT_LOCAL_GENERATION_LIMIT,
  now = new Date(),
  lockWaitTimeoutMs = DEFAULT_LOCK_WAIT_TIMEOUT_MS,
  lockRetryDelayMs = DEFAULT_LOCK_RETRY_DELAY_MS,
  staleLockMs = DEFAULT_STALE_LOCK_MS,
  faultInjector,
} = {}) {
  if (!filePath) throw new TypeError("durable writer filePath is required");
  const writtenAt = currentDate(now);
  const lock = acquireExclusiveFileLock({
    resourcePath: filePath,
    waitTimeoutMs: lockWaitTimeoutMs,
    retryDelayMs: lockRetryDelayMs,
    staleAfterMs: staleLockMs,
    now: writtenAt,
  });
  try {
    const current = readDurableJsonFile({ filePath });
    if (expectedGeneration !== undefined && expectedGeneration !== current.generation) {
      throw codedError("durable store generation conflict", "LAWOS_STORE_CONFLICT", {
        expected_generation: expectedGeneration,
        current_generation: current.generation,
      });
    }
    assertNoUnsafeStoreShrink({ previousState: current.value, nextState: value });
    const backupPath = createBackup && current.exists
      ? backupExistingStoreGeneration({
        filePath,
        backupRoot,
        env,
        now: writtenAt,
        keep,
        generation: current.generation,
      })
      : null;
    const generation = current.generation + 1;
    const prepared = durableStoreDocument({
      value,
      generation,
      previousGeneration: current.generation,
      lock,
      writtenAt,
    });
    atomicReplaceFile({
      filePath,
      data: `${JSON.stringify(prepared.document, null, 2)}\n`,
      faultInjector,
    });
    const queuePath = queueRuntimeStoreBackupUpload({ reasonFilePath: filePath, env, now: writtenAt });
    return {
      filePath,
      generation,
      previousGeneration: current.generation,
      payloadSha256: prepared.payloadSha256,
      writer: prepared.writer,
      backupPath,
      queuePath,
    };
  } finally {
    releaseExclusiveFileLock(lock);
  }
}

export function removeDurableJsonFile({
  filePath,
  expectedGeneration,
  createBackup = true,
  backupRoot,
  env = process.env,
  keep = DEFAULT_LOCAL_GENERATION_LIMIT,
  now = new Date(),
  lockWaitTimeoutMs = DEFAULT_LOCK_WAIT_TIMEOUT_MS,
} = {}) {
  if (!filePath) throw new TypeError("durable remover filePath is required");
  if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 0) {
    throw new TypeError("durable remover expectedGeneration is required");
  }
  const removedAt = currentDate(now);
  const lock = acquireExclusiveFileLock({ resourcePath: filePath, waitTimeoutMs: lockWaitTimeoutMs, now: removedAt });
  try {
    const current = readDurableJsonFile({ filePath });
    if (current.generation !== expectedGeneration) {
      throw codedError("durable store generation conflict", "LAWOS_STORE_CONFLICT", {
        expected_generation: expectedGeneration,
        current_generation: current.generation,
      });
    }
    if (!current.exists) return { filePath, removed: false, generation: current.generation, backupPath: null, queuePath: null };
    const backupPath = createBackup
      ? backupExistingStoreGeneration({ filePath, backupRoot, env, now: removedAt, keep, generation: current.generation })
      : null;
    unlinkSync(filePath);
    fsyncDirectory(dirname(filePath));
    const queuePath = queueRuntimeStoreBackupUpload({ reasonFilePath: filePath, env, now: removedAt });
    return { filePath, removed: true, generation: current.generation, backupPath, queuePath };
  } finally {
    releaseExclusiveFileLock(lock);
  }
}

export function writeJsonFileDurably({
  filePath,
  value,
  previousState,
  createBackup = true,
  backupRoot,
  env = process.env,
  keep = DEFAULT_LOCAL_GENERATION_LIMIT,
  now = new Date(),
} = {}) {
  if (!filePath) return null;
  assertNoUnsafeStoreShrink({ previousState, nextState: value });
  ensurePrivateDirectory(dirname(filePath));
  const backupPath = createBackup
    ? backupExistingStoreGeneration({ filePath, backupRoot, env, now, keep })
    : null;
  atomicReplaceFile({ filePath, data: `${JSON.stringify(value, null, 2)}\n` });
  queueRuntimeStoreBackupUpload({ reasonFilePath: filePath, env, now });
  return backupPath;
}

export function writeBinaryFileDurably({
  filePath,
  bytes,
  expectedSha256,
  sidecar,
  compensationHook,
  lockWaitTimeoutMs = DEFAULT_LOCK_WAIT_TIMEOUT_MS,
  faultInjector,
  readFileSyncImpl = readFileSync,
} = {}) {
  if (!filePath) throw new TypeError("binary writer filePath is required");
  const buffer = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes ?? []);
  const sha256 = createHash("sha256").update(buffer).digest("hex");
  if (expectedSha256 !== undefined && expectedSha256 !== sha256) {
    throw codedError("binary input digest does not match expected digest", "LAWOS_BINARY_INPUT_HASH_MISMATCH", {
      expected_sha256: expectedSha256,
      actual_sha256: sha256,
    });
  }
  let sidecarPath = null;
  if (sidecar) {
    if (!sidecar.filePath || !sidecar.value || typeof sidecar.value !== "object" || Array.isArray(sidecar.value)) {
      throw new TypeError("binary sidecar requires filePath and object value");
    }
    sidecarPath = sidecar.filePath;
  }
  const lock = acquireExclusiveFileLock({ resourcePath: filePath, waitTimeoutMs: lockWaitTimeoutMs });
  const previousBytes = existsSync(filePath) ? readFileSync(filePath) : null;
  const previousSidecar = sidecarPath && existsSync(sidecarPath) ? readFileSync(sidecarPath) : null;
  let renamed = false;
  let sidecarAttempted = false;
  const trackedFaultInjector = (point, context) => {
    if (point === "after_rename") renamed = true;
    faultInjector?.(point, context);
  };
  try {
    atomicReplaceFile({ filePath, data: buffer, faultInjector: trackedFaultInjector });
    renamed = true;
    const readbackSha256 = createHash("sha256").update(readFileSyncImpl(filePath)).digest("hex");
    if (readbackSha256 !== sha256) {
      throw codedError("binary readback digest does not match written bytes", "LAWOS_BINARY_READBACK_HASH_MISMATCH", {
        expected_sha256: sha256,
        actual_sha256: readbackSha256,
      });
    }
    if (sidecar) {
      sidecarAttempted = true;
      atomicReplaceFile({
        filePath: sidecarPath,
        data: `${JSON.stringify({ ...sidecar.value, content_sha256: sha256 }, null, 2)}\n`,
      });
    }
    return { filePath, size: buffer.length, sha256, readbackSha256, sidecarPath };
  } catch (error) {
    let compensationError = null;
    try {
      if (renamed) {
        if (previousBytes === null) {
          if (existsSync(filePath)) unlinkSync(filePath);
          fsyncDirectory(dirname(filePath));
        } else {
          atomicReplaceFile({ filePath, data: previousBytes });
        }
      }
      if (sidecarAttempted && sidecarPath) {
        if (previousSidecar === null) {
          if (existsSync(sidecarPath)) unlinkSync(sidecarPath);
          fsyncDirectory(dirname(sidecarPath));
        } else {
          atomicReplaceFile({ filePath: sidecarPath, data: previousSidecar });
        }
      }
    } catch (compensationFailure) {
      compensationError = compensationFailure;
      error.compensation_failed = true;
      error.compensation_error_code = compensationFailure?.code ?? "LAWOS_BINARY_COMPENSATION_FAILED";
    }
    if (renamed && typeof compensationHook === "function") {
      compensationHook({
        filePath,
        sha256,
        size: buffer.length,
        error,
        compensated: compensationError === null,
        compensation_error_code: compensationError?.code ?? null,
      });
    }
    throw error;
  } finally {
    releaseExclusiveFileLock(lock);
  }
}
