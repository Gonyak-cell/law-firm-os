import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  LAWOS_DURABLE_LOCK_SCHEMA_VERSION,
  LAWOS_DURABLE_STORE_SCHEMA_VERSION,
  acquireExclusiveFileLock,
  readDurableJsonFile,
  readFileSyncWithStaleRetry,
  releaseExclusiveFileLock,
  resolveLocalBackupRoot,
  withStoreWriteLock,
  writeDurableJsonFile,
  writeJsonFileDurably,
} from "../src/durable-file.js";

function fixtureRoot(t, prefix = "lawos-durable-") {
  const root = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

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

test("durable JSON envelope fixes generation, payload hash and writer invariants", (t) => {
  const root = fixtureRoot(t);
  const filePath = join(root, "stores", "matter-store.json");
  const value = { records: [{ matter_id: "matter-001" }], future_field: { retained: true } };
  const receipt = writeDurableJsonFile({
    filePath,
    value,
    expectedGeneration: 0,
    createBackup: false,
    env: {},
    now: new Date("2026-07-16T00:00:00.000Z"),
  });

  assert.equal(receipt.generation, 1);
  const raw = JSON.parse(readFileSync(filePath, "utf8"));
  assert.equal(raw.__lawos_store.schema_version, LAWOS_DURABLE_STORE_SCHEMA_VERSION);
  assert.equal(raw.__lawos_store.generation, 1);
  assert.equal(raw.__lawos_store.previous_generation, 0);
  assert.match(raw.__lawos_store.content_sha256, /^[a-f0-9]{64}$/u);
  assert.equal(raw.__lawos_store.written_at, "2026-07-16T00:00:00.000Z");
  assert.equal(raw.__lawos_store.writer_id, receipt.writer.token);
  assert.equal(raw.__lawos_store.writer.pid, process.pid);
  assert.equal(raw.__lawos_store.writer.host, hostname());
  assert.equal(raw.__lawos_store.writer.token, receipt.writer.token);
  assert.equal(statSync(filePath).mode & 0o777, 0o600);

  const read = readDurableJsonFile({ filePath });
  assert.equal(read.generation, 1);
  assert.equal(read.legacy, false);
  assert.deepEqual(read.value, value);

  raw.records[0].matter_id = "tampered";
  writeFileSync(filePath, `${JSON.stringify(raw)}\n`, { mode: 0o600 });
  assert.throws(() => readDurableJsonFile({ filePath }), { code: "LAWOS_STORE_HASH_MISMATCH" });
});

test("legacy JSON is generation zero and preserves unknown fields", (t) => {
  const root = fixtureRoot(t);
  const filePath = join(root, "legacy-store.json");
  const legacy = {
    records: [{ matter_id: "legacy" }],
    future_top_level: { version: 27, enabled: true },
  };
  writeFileSync(filePath, `${JSON.stringify(legacy)}\n`, { mode: 0o600 });

  const read = readDurableJsonFile({ filePath });
  assert.equal(read.generation, 0);
  assert.equal(read.legacy, true);
  assert.deepEqual(read.value, legacy);

  writeDurableJsonFile({ filePath, value: { ...read.value, migrated: true }, expectedGeneration: 0, createBackup: false, env: {} });
  const migrated = readDurableJsonFile({ filePath });
  assert.equal(migrated.generation, 1);
  assert.deepEqual(migrated.value.future_top_level, legacy.future_top_level);
});

test("generation CAS rejects a stale writer without changing the current file", (t) => {
  const root = fixtureRoot(t);
  const filePath = join(root, "store.json");
  writeDurableJsonFile({ filePath, value: { writer: "first" }, expectedGeneration: 0, createBackup: false, env: {} });

  assert.throws(
    () => writeDurableJsonFile({ filePath, value: { writer: "stale" }, expectedGeneration: 0, createBackup: false, env: {} }),
    (error) => error?.code === "LAWOS_STORE_CONFLICT"
      && error.expected_generation === 0
      && error.current_generation === 1,
  );
  assert.deepEqual(readDurableJsonFile({ filePath }).value, { writer: "first" });
});

test("exclusive lock recovers only an old dead same-host owner", (t) => {
  const root = fixtureRoot(t);
  const resourcePath = join(root, "store.json");
  const lockPath = `${resourcePath}.lock`;
  const live = acquireExclusiveFileLock({ resourcePath, waitTimeoutMs: 10 });
  assert.equal(statSync(lockPath).mode & 0o777, 0o600);
  assert.throws(
    () => acquireExclusiveFileLock({ resourcePath, waitTimeoutMs: 10, retryDelayMs: 1 }),
    { code: "LAWOS_STORE_LOCK_TIMEOUT" },
  );
  releaseExclusiveFileLock(live);

  const old = "2026-07-15T00:00:00.000Z";
  writeFileSync(lockPath, `${JSON.stringify({
    schema_version: LAWOS_DURABLE_LOCK_SCHEMA_VERSION,
    pid: 99999999,
    host: hostname(),
    token: "dead-owner-token",
    acquired_at: old,
  })}\n`, { mode: 0o600 });
  const recovered = acquireExclusiveFileLock({
    resourcePath,
    waitTimeoutMs: 20,
    retryDelayMs: 1,
    staleAfterMs: 0,
    isProcessAlive: () => false,
  });
  assert.notEqual(recovered.token, "dead-owner-token");
  releaseExclusiveFileLock(recovered);

  writeFileSync(lockPath, `${JSON.stringify({
    schema_version: LAWOS_DURABLE_LOCK_SCHEMA_VERSION,
    pid: 99999999,
    host: "remote-host",
    token: "remote-owner-token",
    acquired_at: old,
  })}\n`, { mode: 0o600 });
  assert.throws(
    () => acquireExclusiveFileLock({
      resourcePath,
      waitTimeoutMs: 10,
      retryDelayMs: 1,
      staleAfterMs: 0,
      isProcessAlive: () => false,
    }),
    { code: "LAWOS_STORE_LOCK_TIMEOUT" },
  );

  writeFileSync(lockPath, "{}\n", { mode: 0o600 });
  assert.throws(
    () => acquireExclusiveFileLock({ resourcePath, waitTimeoutMs: 10, retryDelayMs: 1, staleAfterMs: 0 }),
    { code: "LAWOS_STORE_LOCK_TIMEOUT" },
  );

  rmSync(lockPath, { force: true });
  const result = withStoreWriteLock({ resourcePath, waitTimeoutMs: 10 }, (lock) => ({
    token: lock.token,
    lock_exists_during_operation: existsSync(lock.lockPath),
  }));
  assert.match(result.token, /^[a-f0-9-]{36}$/u);
  assert.equal(result.lock_exists_during_operation, true);
  assert.equal(existsSync(lockPath), false);
});
