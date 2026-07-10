import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { readFileSyncWithStaleRetry, resolveLocalBackupRoot, writeJsonFileDurably } from "../src/durable-file.js";

test("durable writes use the configured runtime backup root outside a writable user home", () => {
  const root = mkdtempSync(join(tmpdir(), "lawos-durable-backup-root-"));
  const storePath = join(root, "stores", "matter-store.json");
  const backupRoot = join(root, "backups");
  const previousState = { records: [{ matter_id: "matter-before" }] };
  const nextState = { records: [{ matter_id: "matter-after" }] };

  mkdirSync(join(root, "stores"), { recursive: true });
  writeFileSync(storePath, `${JSON.stringify(previousState)}\n`);
  const env = { MATTER_VAULT_BACKUP_ROOT: backupRoot };
  const backupPath = writeJsonFileDurably({ filePath: storePath, value: nextState, previousState, env });

  assert.equal(resolveLocalBackupRoot(env), backupRoot);
  assert.equal(backupPath.startsWith(backupRoot), true);
  assert.equal(existsSync(backupPath), true);
  assert.deepEqual(JSON.parse(readFileSync(backupPath, "utf8")), previousState);
  assert.deepEqual(JSON.parse(readFileSync(storePath, "utf8")), nextState);
});

test("durable reads retry an EFS stale file handle", () => {
  let reads = 0;
  const body = readFileSyncWithStaleRetry("/mnt/lawos/matter-store.json", "utf8", {
    readFileSyncImpl() {
      reads += 1;
      if (reads < 3) {
        const error = new Error("stale file handle");
        error.code = "ESTALE";
        error.errno = -116;
        throw error;
      }
      return "ok";
    },
  });

  assert.equal(body, "ok");
  assert.equal(reads, 3);
});
