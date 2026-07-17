import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import {
  readDurableJsonFile,
  writeBinaryFileDurably,
  writeDurableJsonFile,
} from "../src/durable-file.js";
import { appendNdjsonDurably } from "../src/durable-append.js";
import { queueRuntimeStoreBackupUpload } from "../src/s3-backup-queue.js";

function mode(filePath) {
  return statSync(filePath).mode & 0o777;
}

test("store, lock-adjacent artifacts, backups, queue events, append logs and bytes use private modes", (t) => {
  const root = mkdtempSync(join(tmpdir(), "lawos-store-modes-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const filePath = join(root, "stores", "matter-store.json");
  const backupRoot = join(root, "backups");
  const now = new Date("2026-07-16T01:02:03.004Z");

  writeDurableJsonFile({ filePath, value: { generation: 1 }, expectedGeneration: 0, backupRoot, env: {}, now });
  const second = writeDurableJsonFile({ filePath, value: { generation: 2 }, expectedGeneration: 1, backupRoot, env: {}, now, keep: 10 });
  const third = writeDurableJsonFile({ filePath, value: { generation: 3 }, expectedGeneration: 2, backupRoot, env: {}, now, keep: 10 });
  assert.notEqual(second.backupPath, third.backupPath);
  assert.match(second.backupPath, /generation-000000000001-.*-[a-f0-9-]{36}\.json$/u);
  assert.match(third.backupPath, /generation-000000000002-.*-[a-f0-9-]{36}\.json$/u);
  assert.equal(mode(dirname(filePath)), 0o700);
  assert.equal(mode(filePath), 0o600);
  assert.equal(mode(dirname(second.backupPath)), 0o700);
  assert.equal(mode(second.backupPath), 0o600);
  assert.equal(mode(third.backupPath), 0o600);

  writeDurableJsonFile({ filePath, value: { generation: 4 }, expectedGeneration: 3, backupRoot, env: {}, now, keep: 1 });
  assert.equal(readdirSync(dirname(second.backupPath)).filter((name) => name.endsWith(".json")).length, 1);
  assert.equal(readDurableJsonFile({ filePath }).generation, 4);

  const appendPath = join(root, "audit", "events.ndjson");
  appendNdjsonDurably({ filePath: appendPath, value: { event_id: "evt-mode" }, expectedSequence: 0 });
  assert.equal(mode(dirname(appendPath)), 0o700);
  assert.equal(mode(appendPath), 0o600);

  const bytePath = join(root, "objects", "object.bin");
  writeBinaryFileDurably({ filePath: bytePath, bytes: Buffer.from("private-object") });
  assert.equal(mode(dirname(bytePath)), 0o700);
  assert.equal(mode(bytePath), 0o600);

  const queueRoot = join(root, "queue");
  const env = {
    LAWOS_RUNTIME_BACKUP_BUCKET: "synthetic-local-bucket",
    LAWOS_RUNTIME_BACKUP_QUEUE_ROOT: queueRoot,
    LAWOS_RUNTIME_BACKUP_AWS_PROFILE: "synthetic-no-execution",
  };
  const firstQueue = queueRuntimeStoreBackupUpload({ reasonFilePath: filePath, env, now });
  const secondQueue = queueRuntimeStoreBackupUpload({ reasonFilePath: filePath, env, now });
  assert.notEqual(firstQueue, secondQueue);
  assert.equal(existsSync(firstQueue), true);
  assert.equal(existsSync(secondQueue), true);
  assert.equal(mode(queueRoot), 0o700);
  assert.equal(mode(firstQueue), 0o600);
  assert.equal(mode(secondQueue), 0o600);
  const event = JSON.parse(readFileSync(firstQueue, "utf8"));
  assert.match(event.event_id, /[a-f0-9-]{36}$/u);
  assert.equal(event.production_ready_claim, false);
  assert.equal(event.go_live_claim, false);
});
