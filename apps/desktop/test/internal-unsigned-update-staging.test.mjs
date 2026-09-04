import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
    artifactVersionId: "s3-version-target-001",
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
      artifactVersionId: "s3-version-target-001",
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
