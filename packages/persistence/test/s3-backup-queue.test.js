import assert from "node:assert/strict";
import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { hostname, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  LAWOS_S3_BACKUP_QUEUE_SCHEMA_VERSION,
  processRuntimeStoreBackupQueue,
  queueRuntimeStoreBackupUpload,
} from "../src/s3-backup-queue.js";

function fixtureRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "lawos-backup-queue-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function queueEnv(queueRoot) {
  return {
    LAWOS_RUNTIME_BACKUP_BUCKET: "synthetic-private-bucket",
    LAWOS_RUNTIME_BACKUP_QUEUE_ROOT: queueRoot,
    LAWOS_RUNTIME_BACKUP_AWS_PROFILE: "synthetic-no-execution",
    LAWOS_RUNTIME_BACKUP_DEVICE_ID: "operator-machine-private-name",
    LAWOS_RUNTIME_BACKUP_STORE_DIR: dirname(queueRoot),
  };
}

function enqueue(queueRoot, suffix, now = new Date("2026-07-16T10:30:00.000Z")) {
  return queueRuntimeStoreBackupUpload({
    reasonFilePath: join(dirname(queueRoot), `private-user-${suffix}@example.test.json`),
    generation: 7,
    payloadSha256: "a".repeat(64),
    env: queueEnv(queueRoot),
    queueRoot,
    now,
  });
}

function snapshot() {
  return { snapshot_sha256: "b".repeat(64), backup_file_count: 17 };
}

test("backup queue events are private, generation-bound and PII-free", (t) => {
  const root = fixtureRoot(t);
  const queueRoot = join(root, "queue");
  const queuePath = enqueue(queueRoot, "alice");
  const event = JSON.parse(readFileSync(queuePath, "utf8"));
  const serialized = JSON.stringify(event);

  assert.equal(event.schema_version, LAWOS_S3_BACKUP_QUEUE_SCHEMA_VERSION);
  assert.equal(event.store_generation, 7);
  assert.equal(event.store_content_sha256, "a".repeat(64));
  assert.equal(event.store_kind, "unclassified-store");
  assert.match(event.device_id, /^device-[a-f0-9]{24}$/u);
  assert.match(event.store_ref, /^store-[a-f0-9]{24}$/u);
  assert.equal(serialized.includes(root), false);
  assert.equal(serialized.includes("alice"), false);
  assert.equal(serialized.includes("operator-machine-private-name"), false);
  assert.equal(serialized.includes("synthetic-private-bucket"), false);
  assert.equal(statSync(queueRoot).mode & 0o777, 0o700);
  assert.equal(statSync(dirname(queuePath)).mode & 0o777, 0o700);
  assert.equal(statSync(queuePath).mode & 0o777, 0o600);
});

test("processor retries with backoff, writes idempotent receipts and resumes the queue", async (t) => {
  const root = fixtureRoot(t);
  const queueRoot = join(root, "queue");
  const firstPath = enqueue(queueRoot, "first");
  enqueue(queueRoot, "second", new Date("2026-07-16T10:30:00.001Z"));
  const firstEvent = JSON.parse(readFileSync(firstPath, "utf8"));
  const attempts = new Map();
  const uploadSnapshot = async ({ event, idempotencyKey }) => {
    const attempt = (attempts.get(event.event_id) || 0) + 1;
    attempts.set(event.event_id, attempt);
    if (event.event_id === firstEvent.event_id && attempt === 1) {
      throw Object.assign(new Error("transient upload failure with private detail"), { code: "TRANSIENT_UPLOAD" });
    }
    return { object_key: `fake/${idempotencyKey}`, etag: `etag-${attempt}`, version_id: "fake-v1" };
  };

  const first = await processRuntimeStoreBackupQueue({
    queueRoot,
    createSnapshot: async () => snapshot(),
    uploadSnapshot,
    now: () => new Date("2026-07-16T10:30:01.000Z"),
    baseDelayMs: 1_000,
  });
  assert.equal(first.uploaded, 1);
  assert.equal(first.retried, 1);

  const deferred = await processRuntimeStoreBackupQueue({
    queueRoot,
    createSnapshot: async () => snapshot(),
    uploadSnapshot,
    now: () => new Date("2026-07-16T10:30:01.500Z"),
    baseDelayMs: 1_000,
  });
  assert.equal(deferred.deferred, 1);

  const retry = await processRuntimeStoreBackupQueue({
    queueRoot,
    createSnapshot: async () => snapshot(),
    uploadSnapshot,
    now: () => new Date("2026-07-16T10:30:02.000Z"),
    baseDelayMs: 1_000,
  });
  assert.equal(retry.uploaded, 1);
  assert.equal(readdirSync(join(queueRoot, "receipts")).length, 2);

  writeFileSync(firstPath, `${JSON.stringify(firstEvent, null, 2)}\n`, { mode: 0o600 });
  chmodSync(firstPath, 0o600);
  const replay = await processRuntimeStoreBackupQueue({
    queueRoot,
    createSnapshot: async () => snapshot(),
    uploadSnapshot,
  });
  assert.equal(replay.idempotent, 1);
  assert.equal(attempts.get(firstEvent.event_id), 2);
});

test("a poison event is dead-lettered without blocking a healthy event", async (t) => {
  const root = fixtureRoot(t);
  const queueRoot = join(root, "queue");
  const healthyPath = enqueue(queueRoot, "healthy");
  writeFileSync(join(dirname(healthyPath), "poison.json"), "{not-json", { mode: 0o600 });

  const result = await processRuntimeStoreBackupQueue({
    queueRoot,
    createSnapshot: async () => snapshot(),
    uploadSnapshot: async ({ idempotencyKey }) => ({ object_key: idempotencyKey, etag: "healthy" }),
  });

  assert.equal(result.uploaded, 1);
  assert.equal(result.dead_lettered, 1);
  assert.equal(readdirSync(join(queueRoot, "dead-letter")).length, 1);
  assert.equal(readdirSync(join(queueRoot, "receipts")).length, 1);
});

test("repeated upload failure reaches dead-letter at the exact attempt limit", async (t) => {
  const root = fixtureRoot(t);
  const queueRoot = join(root, "queue");
  enqueue(queueRoot, "dead-letter");
  const uploadSnapshot = async () => {
    throw Object.assign(new Error("poison snapshot"), { code: "POISON_SNAPSHOT" });
  };

  const first = await processRuntimeStoreBackupQueue({
    queueRoot,
    createSnapshot: async () => snapshot(),
    uploadSnapshot,
    maxAttempts: 2,
    baseDelayMs: 1,
    now: () => new Date("2026-07-16T10:30:00.000Z"),
  });
  assert.equal(first.retried, 1);
  const second = await processRuntimeStoreBackupQueue({
    queueRoot,
    createSnapshot: async () => snapshot(),
    uploadSnapshot,
    maxAttempts: 2,
    baseDelayMs: 1,
    now: () => new Date("2026-07-16T10:30:00.001Z"),
  });
  assert.equal(second.dead_lettered, 1);
  assert.equal(readdirSync(join(queueRoot, "pending")).length, 0);
  assert.equal(readdirSync(join(queueRoot, "dead-letter")).length, 1);
});

test("processor lock rejects a live owner and recovers an old dead same-host owner", async (t) => {
  const root = fixtureRoot(t);
  const queueRoot = join(root, "queue");
  enqueue(queueRoot, "processor-lock");
  const lockPath = join(queueRoot, "processor.lock");
  writeFileSync(lockPath, `${JSON.stringify({
    pid: process.pid,
    host: hostname(),
    token: "live-owner",
    acquired_at: "2026-07-16T10:30:00.000Z",
  })}\n`, { mode: 0o600 });
  await assert.rejects(
    processRuntimeStoreBackupQueue({
      queueRoot,
      createSnapshot: async () => snapshot(),
      uploadSnapshot: async () => ({ object_key: "locked" }),
      now: () => new Date("2026-07-16T10:31:00.000Z"),
    }),
    { code: "LAWOS_BACKUP_PROCESSOR_LOCKED" },
  );

  writeFileSync(lockPath, `${JSON.stringify({
    pid: 99_999_999,
    host: hostname(),
    token: "dead-owner",
    acquired_at: "2026-07-16T10:29:00.000Z",
  })}\n`, { mode: 0o600 });
  const recovered = await processRuntimeStoreBackupQueue({
    queueRoot,
    createSnapshot: async () => snapshot(),
    uploadSnapshot: async () => ({ object_key: "recovered", etag: "recovered" }),
    now: () => new Date("2026-07-16T10:31:00.000Z"),
  });
  assert.equal(recovered.uploaded, 1);
});
