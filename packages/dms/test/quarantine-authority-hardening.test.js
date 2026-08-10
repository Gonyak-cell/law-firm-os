import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  utimesSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createFileStorageAdapter } from "../src/storage/file-storage-adapter.js";
import { sha256Hex } from "../src/storage/storage-adapter.js";

const TENANT = "tenant-quarantine-hardening";
const OBJECT = "object-quarantine-hardening";
const SESSION = "session-quarantine-hardening";
const BYTES = Buffer.from("authority read failures must never expose retained bytes");
const DIGEST = sha256Hex(BYTES);

function authorityDenied(read) {
  assert.throws(read, (error) => error?.code === "DMS_QUARANTINE_AUTHORITY_UNAVAILABLE"
    && !error.message.includes(OBJECT)
    && !error.message.includes(BYTES.toString()));
}

function symlinkRejected(create) {
  assert.throws(create, (error) => error?.code === "DMS_STORAGE_SYMLINK_REJECTED");
}

test("DMS authority EACCES is not interpreted as absent and denies every object/stage path", (t) => {
  const root = mkdtempSync(join(tmpdir(), "dms-quarantine-authority-eacces-"));
  const objectRoot = join(root, "objects");
  const authorityRoot = join(root, "authority");
  const storage = createFileStorageAdapter({ adapter_id: "authority-eacces", rootPath: objectRoot, quarantineRootPath: authorityRoot });
  t.after(() => {
    chmodSync(authorityRoot, 0o700);
    rmSync(root, { recursive: true, force: true });
  });
  storage.putObject({ tenant_id: TENANT, object_id: OBJECT, bytes: BYTES, content_type: "application/octet-stream" });
  chmodSync(authorityRoot, 0o000);
  authorityDenied(() => storage.getObject({ tenant_id: TENANT, object_id: OBJECT }));
  authorityDenied(() => storage.statObject({ tenant_id: TENANT, object_id: OBJECT }));
  authorityDenied(() => storage.digestObject({ tenant_id: TENANT, object_id: OBJECT }));
  authorityDenied(() => storage.stageObject({ tenant_id: TENANT, session_id: SESSION, object_id: OBJECT, bytes: BYTES }));
  authorityDenied(() => storage.finalizeObject({ tenant_id: TENANT, session_id: SESSION, object_id: OBJECT }));
  assert.equal(readdirSync(objectRoot).some((name) => name.endsWith(".bin")), true);
  chmodSync(authorityRoot, 0o700);
  assert.equal(storage.getObject({ tenant_id: TENANT, object_id: OBJECT }).sha256, DIGEST);
});

test("DMS quarantine authority binding survives restart and rejects an empty or incomplete replacement", (t) => {
  const root = mkdtempSync(join(tmpdir(), "dms-quarantine-authority-binding-"));
  const objectRoot = join(root, "objects");
  const authorityRoot = join(root, "authority");
  const wrongAuthorityRoot = join(root, "wrong-authority");
  createFileStorageAdapter({ adapter_id: "authority-binding", rootPath: objectRoot, quarantineRootPath: authorityRoot });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  assert.throws(() => createFileStorageAdapter({ adapter_id: "authority-binding", rootPath: objectRoot, quarantineRootPath: wrongAuthorityRoot }), (error) => error?.code === "DMS_QUARANTINE_AUTHORITY_BINDING_MISMATCH");
  unlinkSync(join(authorityRoot, ".object-root-binding.json"));
  assert.throws(() => createFileStorageAdapter({ adapter_id: "authority-binding", rootPath: objectRoot, quarantineRootPath: authorityRoot }), (error) => error?.code === "DMS_QUARANTINE_AUTHORITY_BINDING_MISMATCH");
});

test("DMS file authority rejects symlink roots, canonical cross-root nesting, and parent-directory redirects", (t) => {
  const root = mkdtempSync(join(tmpdir(), "dms-quarantine-authority-symlink-"));
  const objectRoot = join(root, "objects");
  const authorityRoot = join(root, "authority");
  const external = join(root, "external");
  const objectAlias = join(root, "objects-alias");
  const authorityAlias = join(root, "authority-alias");
  const storage = createFileStorageAdapter({ adapter_id: "authority-symlink", rootPath: objectRoot, quarantineRootPath: authorityRoot });
  mkdirSync(external);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  symlinkSync(objectRoot, objectAlias);
  symlinkRejected(() => createFileStorageAdapter({ adapter_id: "authority-symlink", rootPath: objectAlias, quarantineRootPath: authorityRoot }));
  symlinkSync(authorityRoot, authorityAlias);
  symlinkRejected(() => createFileStorageAdapter({ adapter_id: "authority-symlink", rootPath: objectRoot, quarantineRootPath: authorityAlias }));
  assert.throws(() => createFileStorageAdapter({ adapter_id: "authority-symlink", rootPath: objectRoot, quarantineRootPath: join(objectRoot, "nested-authority") }), (error) => error?.code === "DMS_QUARANTINE_AUTHORITY_NOT_INDEPENDENT");
  assert.throws(() => createFileStorageAdapter({ adapter_id: "authority-symlink", rootPath: join(authorityRoot, "nested-objects"), quarantineRootPath: authorityRoot }), (error) => error?.code === "DMS_QUARANTINE_AUTHORITY_NOT_INDEPENDENT");
  symlinkSync(external, join(objectRoot, ".staging"));
  symlinkRejected(() => storage.stageObject({ tenant_id: TENANT, session_id: SESSION, object_id: OBJECT, bytes: BYTES }));
  assert.deepEqual(readdirSync(external), []);
  rmSync(join(objectRoot, ".staging"), { force: true });
  rmSync(join(authorityRoot, ".quarantine"), { recursive: true, force: true });
  assert.throws(() => storage.getObject({ tenant_id: TENANT, object_id: OBJECT }), (error) => error?.code === "DMS_QUARANTINE_AUTHORITY_UNAVAILABLE");
  symlinkSync(external, join(authorityRoot, ".quarantine"));
  assert.throws(() => storage.recordCommittedObjectQuarantine({ tenant_id: TENANT, object_id: OBJECT, expected_sha256: DIGEST, reason: "DMS_TEST_SYMLINK" }), (error) => error?.code === "DMS_QUARANTINE_AUTHORITY_BINDING_INVALID");
  assert.equal(existsSync(join(external, `${TENANT}.bin`)), false);
});

test("DMS authority binding prevents shared-root rebinds and tolerates same-binding concurrent opens", async () => {
  const root = mkdtempSync(join(tmpdir(), "dms-quarantine-authority-concurrency-"));
  try {
    const authorityRoot = join(root, "authority");
    const objectRoot = join(root, "objects");
    const peerRoot = join(root, "peer-objects");
    createFileStorageAdapter({ adapter_id: "authority-concurrency", rootPath: objectRoot, quarantineRootPath: authorityRoot });
    assert.throws(() => createFileStorageAdapter({ adapter_id: "authority-concurrency", rootPath: peerRoot, quarantineRootPath: authorityRoot }), (error) => error?.code === "DMS_QUARANTINE_AUTHORITY_BINDING_MISMATCH");
    const freshObjectRoot = join(root, "fresh-objects");
    const freshAuthorityRoot = join(root, "fresh-authority");
    mkdirSync(freshObjectRoot);
    mkdirSync(freshAuthorityRoot);
    const bindingLockPath = join(freshObjectRoot, ".quarantine-authority-binding.json.lock");
    const crashSource = "import { constants, openSync, closeSync } from 'node:fs'; const fd = openSync(process.argv[1], constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY, 0o600); process.stdout.write('ready\\n'); await new Promise(() => {}); closeSync(fd);";
    const crash = spawn(process.execPath, ["--input-type=module", "-e", crashSource, bindingLockPath], { stdio: ["ignore", "pipe", "ignore"] });
    await new Promise((resolve, reject) => { crash.stdout.once("data", resolve); crash.once("error", reject); });
    assert.equal(crash.kill("SIGKILL"), true);
    await new Promise((resolve) => crash.once("close", resolve));
    const staleAt = new Date(Date.now() - 120_000);
    utimesSync(bindingLockPath, staleAt, staleAt);
    const source = "import { createFileStorageAdapter } from './packages/dms/src/storage/file-storage-adapter.js'; createFileStorageAdapter({ adapter_id: 'authority-process-concurrency', rootPath: process.argv[1], quarantineRootPath: process.argv[2] });";
    const children = Array.from({ length: 8 }, () => new Promise((resolve) => {
      const child = spawn(process.execPath, ["--input-type=module", "-e", source, freshObjectRoot, freshAuthorityRoot], { cwd: process.cwd(), stdio: ["ignore", "ignore", "pipe"] });
      let stderr = "";
      child.stderr.on("data", (chunk) => { stderr += chunk; });
      child.on("close", (code) => resolve({ code, stderr }));
    }));
    const results = await Promise.all(children);
    assert.deepEqual(results.filter(({ code }) => code === 0).length, 8);
    assert.deepEqual(results.filter(({ code }) => code !== 0).map(({ stderr }) => stderr), []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("DMS binding recovery sentinel survives a child crash and converges on restart", async (t) => {
  const root = mkdtempSync(join(tmpdir(), "dms-quarantine-authority-recovery-sentinel-"));
  const objectRoot = join(root, "objects");
  const authorityRoot = join(root, "authority");
  mkdirSync(objectRoot);
  mkdirSync(authorityRoot);
  const bindingPath = join(objectRoot, ".quarantine-authority-binding.json");
  const lockPath = `${bindingPath}.lock`;
  const recoveryPath = `${lockPath}.recovery`;
  const childSource = `
    import { hostname } from "node:os";
    import { writeFileSync } from "node:fs";
    import { acquireExclusiveFileLock } from "./packages/persistence/src/durable-file.js";
    const lockPath = process.argv[1];
    writeFileSync(lockPath, JSON.stringify({ schema_version: "law-firm-os.durable-lock.v0.1", pid: 99999999, host: hostname(), token: "stale-primary", acquired_at: "2026-01-01T00:00:00.000Z" }) + "\\n");
    acquireExclusiveFileLock({ resourcePath: lockPath.slice(0, -5), lockPath, staleAfterMs: 0, waitTimeoutMs: 1000, isProcessAlive: () => false, onRecoveryMarkerCreated() { process.stdout.write("recovery-created\\n"); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 60000); } });
  `;
  const child = spawn(process.execPath, ["--input-type=module", "-e", childSource, lockPath], { cwd: process.cwd(), stdio: ["ignore", "pipe", "ignore"] });
  t.after(() => {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    rmSync(root, { recursive: true, force: true });
  });
  await new Promise((resolve, reject) => {
    child.stdout.once("data", (chunk) => chunk.toString().includes("recovery-created") ? resolve() : reject(new Error("recovery marker was not created")));
    child.once("error", reject);
  });
  assert.equal(existsSync(recoveryPath), true);
  assert.equal(child.kill("SIGKILL"), true);
  await new Promise((resolve) => child.once("close", resolve));
  const staleAt = new Date(Date.now() - 120_000);
  utimesSync(recoveryPath, staleAt, staleAt);
  const storage = createFileStorageAdapter({ adapter_id: "authority-recovery-sentinel", rootPath: objectRoot, quarantineRootPath: authorityRoot });
  assert.equal(storage.validateQuarantineAuthority().durable, true);
  assert.equal(existsSync(recoveryPath), false);
  assert.equal(existsSync(join(objectRoot, ".quarantine-authority-binding.json")), true);
  assert.equal(existsSync(join(authorityRoot, ".object-root-binding.json")), true);
});

test("DMS binding removes a stale malformed recovery sentinel before initialization", (t) => {
  const root = mkdtempSync(join(tmpdir(), "dms-quarantine-authority-malformed-recovery-"));
  const objectRoot = join(root, "objects");
  const authorityRoot = join(root, "authority");
  mkdirSync(objectRoot);
  mkdirSync(authorityRoot);
  const recoveryPath = join(objectRoot, ".quarantine-authority-binding.json.lock.recovery");
  writeFileSync(recoveryPath, "{}\n", { mode: 0o600 });
  const staleAt = new Date(Date.now() - 120_000);
  utimesSync(recoveryPath, staleAt, staleAt);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const storage = createFileStorageAdapter({ adapter_id: "authority-malformed-recovery", rootPath: objectRoot, quarantineRootPath: authorityRoot });
  assert.equal(storage.validateQuarantineAuthority().independent, true);
  assert.equal(existsSync(recoveryPath), false);
});
