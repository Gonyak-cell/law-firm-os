import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { lstatSync, rmSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  InternalUnsignedUpdateStagingError,
  createFileSystemInternalUnsignedUpdateStaging,
} from "../src/main/internal-unsigned-update-staging.js";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function candidate(bytes, overrides = {}) {
  return {
    releaseId: "amic-os-internal-0.1.32",
    version: "0.1.32",
    artifactFilename: "AMIC-OS-internal-0.1.32-win-x64.exe",
    artifactSha256: sha256(bytes),
    artifactBytes: bytes.byteLength,
    artifactVersionId: "_s3-version-target-001",
    ...overrides,
  };
}

async function* chunks(...values) {
  for (const value of values) yield value;
}

test("internal-unsigned installer streams to an exclusive app-owned cache and opens only by explicit user action", async () => {
  const basePath = await mkdtemp(path.join(tmpdir(), "amic-os-update-stage-"));
  const opened = [];
  const bytes = Buffer.from("exact-private-internal-installer-bytes");
  const staging = createFileSystemInternalUnsignedUpdateStaging({
    basePath,
    createStageId: () => "11111111-1111-4111-8111-111111111111",
    async openInstaller(nativePath) {
      opened.push(nativePath);
      return "";
    },
  });
  try {
    assert.deepEqual(await staging.initialize(), {
      initialized: true,
      priorCacheRemoved: true,
    });
    const receipt = await staging.stage({
      candidate: candidate(bytes),
      chunks: chunks(bytes.subarray(0, 7), bytes.subarray(7)),
    });
    assert.deepEqual(receipt, {
      state: "staged",
      stageId: "11111111-1111-4111-8111-111111111111",
      releaseId: "amic-os-internal-0.1.32",
      version: "0.1.32",
      artifactSha256: sha256(bytes),
      artifactBytes: bytes.byteLength,
      artifactVersionId: "_s3-version-target-001",
      localPathIncluded: false,
      automaticReplacement: false,
    });
    assert.equal(Object.values(receipt).some((value) => String(value).includes(basePath)), false);

    await assert.rejects(
      staging.open({ stageId: receipt.stageId, confirmed: true, userActivation: false }),
      (error) => error instanceof InternalUnsignedUpdateStagingError
        && error.code === "UPDATE_OPERATOR_CONFIRMATION_REQUIRED",
    );
    const openedReceipt = await staging.open({
      stageId: receipt.stageId,
      confirmed: true,
      userActivation: true,
    });
    assert.equal(openedReceipt.state, "installer_opened");
    assert.equal(openedReceipt.windowsWarningExpected, true);
    assert.equal(openedReceipt.operatorAcceptanceRequired, true);
    assert.equal(openedReceipt.localPathIncluded, false);
    assert.equal(opened.length, 1);
    assert.deepEqual(await readFile(opened[0]), bytes);
    assert.equal(await staging.remove(receipt.stageId), true);
  } finally {
    await rm(basePath, { recursive: true, force: true });
  }
});

test("internal-unsigned staging removes partial or hash-mismatched downloads", async () => {
  const basePath = await mkdtemp(path.join(tmpdir(), "amic-os-update-negative-"));
  const bytes = Buffer.from("expected-installer");
  let sequence = 0;
  const staging = createFileSystemInternalUnsignedUpdateStaging({
    basePath,
    createStageId: () => `11111111-1111-4111-8111-${String(++sequence).padStart(12, "0")}`,
  });
  try {
    await staging.initialize();
    await assert.rejects(
      staging.stage({
        candidate: candidate(bytes),
        chunks: chunks(bytes.subarray(0, bytes.length - 1)),
      }),
      (error) => error.code === "UPDATE_DOWNLOAD_PARTIAL",
    );
    await assert.rejects(
      staging.stage({
        candidate: candidate(bytes),
        chunks: chunks(Buffer.alloc(bytes.length, 0x78)),
      }),
      (error) => error.code === "UPDATE_DOWNLOAD_HASH_MISMATCH",
    );
  } finally {
    await rm(basePath, { recursive: true, force: true });
  }
});

test("internal-unsigned staging rehashes immediately before opening and rejects a changed file", async () => {
  const basePath = await mkdtemp(path.join(tmpdir(), "amic-os-update-rehash-"));
  const stageId = "22222222-2222-4222-8222-222222222222";
  const bytes = Buffer.from("verified-installer");
  let opened = false;
  const staging = createFileSystemInternalUnsignedUpdateStaging({
    basePath,
    createStageId: () => stageId,
    async openInstaller() {
      opened = true;
      return "";
    },
  });
  try {
    await staging.initialize();
    await staging.stage({ candidate: candidate(bytes), chunks: chunks(bytes) });
    const nativePath = path.join(staging.rootPath, stageId, candidate(bytes).artifactFilename);
    await writeFile(nativePath, Buffer.alloc(bytes.length, 0x78));
    await assert.rejects(
      staging.open({ stageId, confirmed: true, userActivation: true }),
      (error) => error.code === "UPDATE_CACHE_FILE_HASH_MISMATCH",
    );
    assert.equal(opened, false);
  } finally {
    await rm(basePath, { recursive: true, force: true });
  }
});

test("shutdown defers an opened installer's locked cache and a later launch cleans it", async (t) => {
  for (const code of ["EPERM", "EBUSY"]) {
    await t.test(code, async () => {
      const basePath = await mkdtemp(path.join(tmpdir(), "amic-os-update-locked-"));
      const bytes = Buffer.from("verified-running-installer");
      const staging = createFileSystemInternalUnsignedUpdateStaging({
        basePath,
        rmSyncImpl() { throw Object.assign(new Error("installer is running"), { code }); },
      });
      try {
        await staging.initialize();
        const staged = await staging.stage({ candidate: candidate(bytes), chunks: chunks(bytes) });
        await staging.open({ stageId: staged.stageId, confirmed: true, userActivation: true });
        assert.deepEqual(staging.clearSync(), { cleared: false, deferred: true });
        assert.deepEqual(await readFile(path.join(staging.rootPath, staged.stageId, candidate(bytes).artifactFilename)), bytes);
        const restarted = createFileSystemInternalUnsignedUpdateStaging({ basePath });
        assert.deepEqual(await restarted.initialize(), { initialized: true, priorCacheRemoved: true });
        assert.deepEqual(restarted.clearSync(), { cleared: true });
      } finally {
        await rm(basePath, { recursive: true, force: true });
      }
    });
  }
});

test("shutdown preserves cleanup errors unless an installer was opened and the error is a file lock", async () => {
  const basePath = await mkdtemp(path.join(tmpdir(), "amic-os-update-clear-errors-"));
  let failure = "EPERM";
  let unsafeRoot = false;
  const staging = createFileSystemInternalUnsignedUpdateStaging({
    basePath,
    lstatSyncImpl(nativePath) {
      return unsafeRoot ? { isSymbolicLink: () => true } : lstatSync(nativePath);
    },
    rmSyncImpl(...args) {
      if (failure) throw Object.assign(new Error("cleanup failed"), { code: failure });
      return rmSync(...args);
    },
  });
  try {
    await staging.initialize();
    assert.throws(() => staging.clearSync(), { code: "EPERM" });
    const bytes = Buffer.from("verified-installer");
    const staged = await staging.stage({ candidate: candidate(bytes), chunks: chunks(bytes) });
    await staging.open({ stageId: staged.stageId, confirmed: true, userActivation: true });
    unsafeRoot = true;
    assert.throws(() => staging.clearSync(), { code: "UPDATE_CACHE_ROOT_UNSAFE" });
    unsafeRoot = false;
    failure = "EIO";
    assert.throws(() => staging.clearSync(), { code: "EIO" });
    failure = null;
    assert.deepEqual(staging.clearSync(), { cleared: true });
    await staging.initialize();
    failure = "EPERM";
    assert.throws(() => staging.clearSync(), { code: "EPERM" });
  } finally {
    await rm(basePath, { recursive: true, force: true });
  }
});

test("Windows running executable lock defers shutdown cleanup until the next initialization", {
  skip: process.platform !== "win32",
  timeout: 30000,
}, async () => {
  const basePath = await mkdtemp(path.join(tmpdir(), "amic-os-update-native-lock-"));
  const bytes = await readFile(path.join(process.env.SystemRoot, "System32", "cmd.exe"));
  let child, childExit, readyTimer;
  const staging = createFileSystemInternalUnsignedUpdateStaging({
    basePath,
    async openInstaller(nativePath) {
      child = spawn(nativePath, ["/d", "/q", "/c", "echo AMIC_LOCK_READY & set /p amicFixture="], {
        windowsHide: true, stdio: ["pipe", "pipe", "pipe"],
      });
      childExit = new Promise(resolve => child.once("close", resolve));
      await new Promise((resolve, reject) => {
        let output = "";
        readyTimer = setTimeout(() => reject(new Error("Windows lock fixture did not become ready")), 10000);
        child.once("error", reject);
        child.stdout.on("data", chunk => {
          output += chunk.toString();
          if (output.includes("AMIC_LOCK_READY")) { clearTimeout(readyTimer); resolve(); }
        });
        child.once("close", () => reject(new Error("Windows lock fixture exited before input")));
      });
      return "";
    },
  });
  try {
    await staging.initialize();
    const staged = await staging.stage({ candidate: candidate(bytes), chunks: chunks(bytes) });
    await staging.open({ stageId: staged.stageId, confirmed: true, userActivation: true });
    assert.equal(child.exitCode, null);
    assert.throws(() => rmSync(staging.rootPath, { recursive: true, force: false }),
      error => ["EPERM", "EBUSY"].includes(error.code));
    assert.deepEqual(staging.clearSync(), { cleared: false, deferred: true });
    const stagedPath = path.join(staging.rootPath, staged.stageId, candidate(bytes).artifactFilename);
    assert.deepEqual(await readFile(stagedPath), bytes);
    child.stdin.end("done\r\n");
    assert.equal(await childExit, 0);
    const restarted = createFileSystemInternalUnsignedUpdateStaging({ basePath });
    assert.deepEqual(await restarted.initialize(), { initialized: true, priorCacheRemoved: true });
    await assert.rejects(readFile(stagedPath), { code: "ENOENT" });
    assert.deepEqual(restarted.clearSync(), { cleared: true });
  } finally {
    clearTimeout(readyTimer);
    if (child && child.exitCode === null) { child.kill(); await childExit; }
    await rm(basePath, { recursive: true, force: true });
  }
});
