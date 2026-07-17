import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  readDurableJsonFile,
  acquireExclusiveFileLock,
  releaseExclusiveFileLock,
  writeBinaryFileDurably,
  writeDurableJsonFile,
} from "../src/durable-file.js";
import { appendNdjsonDurably, verifyDurableNdjsonFile } from "../src/durable-append.js";

function fixtureRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "lawos-store-fault-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function injectedFailure(targetPoint, code = "LAWOS_TEST_CRASH") {
  return (point) => {
    if (point !== targetPoint) return;
    const error = new Error(`fault:${point}`);
    error.code = code;
    throw error;
  };
}

async function firstJsonLine(stream) {
  let buffer = "";
  for await (const chunk of stream) {
    buffer += chunk;
    const newline = buffer.indexOf("\n");
    if (newline >= 0) return JSON.parse(buffer.slice(0, newline));
  }
  throw new Error("lock holder exited before emitting readiness");
}

test("kill-before-write, mid-temp and disk-full leave the previous generation valid", (t) => {
  const root = fixtureRoot(t);
  const filePath = join(root, "store.json");
  writeDurableJsonFile({ filePath, value: { version: 1 }, expectedGeneration: 0, createBackup: false, env: {} });

  for (const [point, code] of [
    ["before_temp_create", "LAWOS_TEST_KILL"],
    ["after_temp_fsync", "LAWOS_TEST_MID_TEMP"],
    ["before_temp_write", "ENOSPC"],
  ]) {
    assert.throws(
      () => writeDurableJsonFile({
        filePath,
        value: { version: 2, point },
        expectedGeneration: 1,
        createBackup: false,
        env: {},
        faultInjector: injectedFailure(point, code),
      }),
      (error) => error?.code === code,
    );
    const current = readDurableJsonFile({ filePath });
    assert.equal(current.generation, 1);
    assert.deepEqual(current.value, { version: 1 });
    assert.equal(readdirSync(root).some((name) => name.endsWith(".tmp")), false);
  }
});

test("post-rename crash leaves the new generation parseable and hash-valid", (t) => {
  const root = fixtureRoot(t);
  const filePath = join(root, "store.json");
  writeDurableJsonFile({ filePath, value: { version: 1 }, expectedGeneration: 0, createBackup: false, env: {} });

  assert.throws(
    () => writeDurableJsonFile({
      filePath,
      value: { version: 2 },
      expectedGeneration: 1,
      createBackup: false,
      env: {},
      faultInjector: injectedFailure("after_rename", "LAWOS_TEST_POST_RENAME"),
    }),
    { code: "LAWOS_TEST_POST_RENAME" },
  );
  const current = readDurableJsonFile({ filePath });
  assert.equal(current.generation, 2);
  assert.deepEqual(current.value, { version: 2 });
});

test("a killed same-host lock owner is recovered without weakening remote or unknown-owner checks", async (t) => {
  const root = fixtureRoot(t);
  const resourcePath = join(root, "killed-owner-store.json");
  const fixture = fileURLToPath(new URL("./fixtures/hold-lock.mjs", import.meta.url));
  const child = spawn(process.execPath, [fixture, resourcePath], { stdio: ["ignore", "pipe", "pipe"] });
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  });
  const ready = await firstJsonLine(child.stdout);
  assert.equal(ready.status, "locked");
  assert.equal(ready.pid, child.pid);
  const exited = once(child, "exit");
  assert.equal(child.kill("SIGKILL"), true);
  const [, signal] = await exited;
  assert.equal(signal, "SIGKILL");

  const recovered = acquireExclusiveFileLock({
    resourcePath,
    waitTimeoutMs: 1_000,
    retryDelayMs: 5,
    staleAfterMs: 0,
  });
  assert.notEqual(recovered.token, ready.token);
  releaseExclusiveFileLock(recovered);
});

test("exclusive NDJSON append maintains sequence and hash continuity", (t) => {
  const root = fixtureRoot(t);
  const filePath = join(root, "security-audit-events.ndjson");
  const first = appendNdjsonDurably({ filePath, value: { event_id: "evt-1", action: "login" }, expectedSequence: 0 });
  const second = appendNdjsonDurably({ filePath, value: { event_id: "evt-2", action: "logout" }, expectedSequence: 1 });
  assert.equal(first.sequence, 1);
  assert.equal(second.sequence, 2);
  const verified = verifyDurableNdjsonFile({ filePath });
  assert.equal(verified.sequence, 2);
  assert.equal(verified.entries.length, 2);

  const lines = readFileSync(filePath, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  lines[1].event_id = "tampered";
  writeFileSync(filePath, `${lines.map((line) => JSON.stringify(line)).join("\n")}\n`, { mode: 0o600 });
  assert.throws(() => verifyDurableNdjsonFile({ filePath }), { code: "LAWOS_APPEND_HASH_MISMATCH" });
});

test("durable NDJSON append continues after an unchanged legacy prefix", (t) => {
  const root = fixtureRoot(t);
  const filePath = join(root, "audit", "legacy.ndjson");
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify({ event_id: "legacy-1" })}\n`, { mode: 0o600 });

  const receipt = appendNdjsonDurably({ filePath, value: { event_id: "durable-2" } });
  assert.equal(receipt.sequence, 2);
  const verified = verifyDurableNdjsonFile({ filePath });
  assert.equal(verified.legacyPrefixCount, 1);
  assert.equal(verified.durableEntryCount, 1);
  assert.equal(verified.entries[0].event_id, "legacy-1");
  assert.equal(verified.entries[1].event_id, "durable-2");
});

test("binary writer verifies digest, writes a sidecar and compensates after rename failure", (t) => {
  const root = fixtureRoot(t);
  const filePath = join(root, "objects", "document.bin");
  const sidecarPath = `${filePath}.json`;
  const receipt = writeBinaryFileDurably({
    filePath,
    bytes: Buffer.from("document-v1"),
    sidecar: { filePath: sidecarPath, value: { document_id: "doc-1" } },
  });
  assert.equal(readFileSync(filePath, "utf8"), "document-v1");
  assert.equal(JSON.parse(readFileSync(sidecarPath, "utf8")).content_sha256, receipt.sha256);

  const compensations = [];
  assert.throws(
    () => writeBinaryFileDurably({
      filePath,
      bytes: Buffer.from("document-v2"),
      faultInjector: injectedFailure("after_rename", "LAWOS_TEST_BINARY_POST_RENAME"),
      compensationHook: (context) => compensations.push(context),
    }),
    { code: "LAWOS_TEST_BINARY_POST_RENAME" },
  );
  assert.equal(readFileSync(filePath, "utf8"), "document-v1");
  assert.equal(compensations.length, 1);
  assert.equal(compensations[0].filePath, filePath);
  assert.equal(compensations[0].compensated, true);
  assert.match(compensations[0].sha256, /^[a-f0-9]{64}$/u);
});
