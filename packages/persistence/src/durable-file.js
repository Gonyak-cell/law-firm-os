import {
  closeSync,
  existsSync,
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
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";
import { queueRuntimeStoreBackupUpload } from "./s3-backup-queue.js";

export const LAWOS_LOCAL_BACKUP_ROOT = join(homedir(), "lawos-backups", "data");
export const DEFAULT_LOCAL_GENERATION_LIMIT = 200;

function safeStoreName(filePath) {
  return basename(filePath || "store.json").replace(/[^A-Za-z0-9._-]/g, "_");
}

function timestampSlug(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function fsyncFile(filePath) {
  const fd = openSync(filePath, "r");
  try {
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
}

function fsyncDirectory(dirPath) {
  let fd = null;
  try {
    fd = openSync(dirPath, "r");
    fsyncSync(fd);
  } catch {
    return;
  } finally {
    if (fd !== null) closeSync(fd);
  }
}

function pruneGenerations(dirPath, keep = DEFAULT_LOCAL_GENERATION_LIMIT) {
  const entries = readdirSync(dirPath, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => ({ name: entry.name, path: join(dirPath, entry.name), mtimeMs: statSync(join(dirPath, entry.name)).mtimeMs }))
    .sort((left, right) => right.mtimeMs - left.mtimeMs);
  for (const entry of entries.slice(keep)) unlinkSync(entry.path);
}

function stateRecordCount(state = {}) {
  if (Array.isArray(state.records)) return state.records.length;
  if (Array.isArray(state.rows)) return state.rows.length;
  if (state.tables && typeof state.tables === "object") {
    return Object.values(state.tables).reduce((total, rows) => total + (Array.isArray(rows) ? rows.length : 0), 0);
  }
  return null;
}

export function backupExistingStoreGeneration({
  filePath,
  backupRoot = LAWOS_LOCAL_BACKUP_ROOT,
  now = new Date(),
  keep = DEFAULT_LOCAL_GENERATION_LIMIT,
} = {}) {
  if (!filePath || !existsSync(filePath)) return null;
  const backupDir = join(backupRoot, safeStoreName(filePath));
  mkdirSync(backupDir, { recursive: true });
  const backupPath = join(backupDir, `${timestampSlug(now)}.json`);
  writeFileSync(backupPath, readFileSync(filePath));
  fsyncFile(backupPath);
  fsyncDirectory(backupDir);
  pruneGenerations(backupDir, keep);
  return backupPath;
}

export function assertNoUnsafeStoreShrink({ previousState, nextState, allowShrink = process.env.LAWOS_ALLOW_STORE_SHRINK === "1" } = {}) {
  if (allowShrink) return true;
  const previousCount = stateRecordCount(previousState);
  const nextCount = stateRecordCount(nextState);
  if (previousCount == null || nextCount == null || previousCount < 10) return true;
  if (nextCount < Math.floor(previousCount * 0.7)) {
    const error = new Error(
      `LAWOS_STORE_SHRINK_BLOCKED: refusing to shrink store records from ${previousCount} to ${nextCount}; set LAWOS_ALLOW_STORE_SHRINK=1 for an intentional destructive write.`,
    );
    error.code = "LAWOS_STORE_SHRINK_BLOCKED";
    throw error;
  }
  return true;
}

export function writeJsonFileDurably({
  filePath,
  value,
  previousState,
  createBackup = true,
  backupRoot,
  keep = DEFAULT_LOCAL_GENERATION_LIMIT,
  now = new Date(),
} = {}) {
  if (!filePath) return null;
  assertNoUnsafeStoreShrink({ previousState, nextState: value });
  const dirPath = dirname(filePath);
  mkdirSync(dirPath, { recursive: true });
  const backupPath = createBackup ? backupExistingStoreGeneration({ filePath, backupRoot, now, keep }) : null;
  const tempPath = join(dirPath, `.${basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`);
  fsyncFile(tempPath);
  renameSync(tempPath, filePath);
  fsyncDirectory(dirPath);
  queueRuntimeStoreBackupUpload({ reasonFilePath: filePath, now });
  return backupPath;
}
